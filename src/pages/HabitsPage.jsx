import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { addDays, todayStr, weekdayShort } from '../lib/dates'
import { currentStreak, missedTwice } from '../lib/streaks'
import { awardBadge, badgeToastText, recordActivity } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import CheckButton from '../components/CheckButton.jsx'

const HEATMAP_WEEKS = 16

// Kalender-Heatmap: Spalten = Wochen (Mo–So), letzte 16 Wochen
function Heatmap({ dates }) {
  const today = todayStr()
  const set = new Set(dates)

  // Montag der aktuellen Woche finden, dann 16 Wochen zurück
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const currentMonday = addDays(today, -mondayOffset)
  const start = addDays(currentMonday, -(HEATMAP_WEEKS - 1) * 7)

  const cells = []
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const date = addDays(start, i)
    cells.push(
      <div
        key={date}
        className={[
          'heat-cell',
          set.has(date) ? 'done' : '',
          date === today ? 'today' : '',
          date > today ? 'future' : '',
        ].filter(Boolean).join(' ')}
        title={`${weekdayShort(date)} ${date}${set.has(date) ? ' ✓' : ''}`}
      />
    )
  }
  return <div className="heatmap">{cells}</div>
}

export default function HabitsPage() {
  const showToast = useToast()
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const today = todayStr()

  async function load() {
    const [{ data: habitRows }, { data: logRows }] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('*'),
    ])
    setHabits(habitRows ?? [])
    setLogs(logRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addHabit(e) {
    e.preventDefault()
    if (!title.trim()) return
    const { error } = await supabase.from('habits').insert({ title: title.trim() })
    if (error) {
      showToast('Speichern fehlgeschlagen')
      return
    }
    setTitle('')
    await load()
    const badge = await awardBadge('first_habit')
    if (badge) showToast(badgeToastText(badge))
    await recordActivity()
  }

  async function toggleToday(habit) {
    const existing = logs.find((l) => l.habit_id === habit.id && l.log_date === today)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habit.id, log_date: today })
      const datesAfter = [
        ...logs.filter((l) => l.habit_id === habit.id).map((l) => l.log_date),
        today,
      ]
      const streak = currentStreak(datesAfter)
      const newBadges = []
      if (streak >= 14) newBadges.push(await awardBadge('habit_streak_14'))
      newBadges.push(...(await recordActivity()))
      newBadges.filter(Boolean).forEach((k) => showToast(badgeToastText(k)))
    }
    await load()
  }

  async function setArchived(habit, archived) {
    await supabase
      .from('habits')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', habit.id)
    await load()
  }

  async function deleteHabit(habit) {
    if (!confirm(`„${habit.title}" mitsamt Verlauf löschen?`)) return
    await supabase.from('habits').delete().eq('id', habit.id)
    await load()
  }

  if (loading) return <div className="spinner-center">Lade Gewohnheiten …</div>

  const activeHabits = habits.filter((h) => !h.archived_at)
  const archivedHabits = habits.filter((h) => h.archived_at)

  return (
    <>
      <header className="page-header">
        <div>
          <h1>🔁 Routinen</h1>
          <p className="page-sub">Kleine Pfade, täglich gegangen</p>
        </div>
      </header>

      <form className="card inline-form" onSubmit={addHabit} style={{ display: 'flex' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Gewohnheit (z. B. Gym, Lesen …)"
          required
        />
        <button type="submit" className="btn-primary">＋</button>
      </form>

      {activeHabits.length === 0 && (
        <div className="empty-state">
          Noch keine Gewohnheiten.<br />
          Starte mit einer kleinen, täglichen Routine.
        </div>
      )}

      {activeHabits.map((habit) => {
        const habitDates = logs.filter((l) => l.habit_id === habit.id).map((l) => l.log_date)
        const doneToday = habitDates.includes(today)
        const streak = currentStreak(habitDates)
        const oldEnough =
          habit.created_at.slice(0, 10) <= todayStr(new Date(Date.now() - 2 * 86400000))
        const showMissedHint = oldEnough && missedTwice(habitDates)

        return (
          <div className="card" key={habit.id}>
            <div className="card-title-row">
              <div className="tree-row" style={{ flex: 1 }}>
                <CheckButton
                  done={doneToday}
                  onToggle={() => toggleToday(habit)}
                  title={doneToday ? 'Heute-Haken entfernen' : 'Heute erledigt!'}
                />
                <h3 style={{ margin: 0 }}>{habit.title}</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {streak > 0 && <span className="chip focus">🔥 {streak} Tage</span>}
                <button className="icon-btn" title="Archivieren" onClick={() => setArchived(habit, true)}>
                  📦
                </button>
              </div>
            </div>

            {showMissedHint && (
              <p className="muted" style={{ margin: '0.5rem 0' }}>
                🌙 Zwei Tage Pause — halb so wild. Heute zählt.
              </p>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              <Heatmap dates={habitDates} />
              <p className="faint" style={{ marginTop: '0.3rem' }}>
                Letzte {HEATMAP_WEEKS} Wochen
              </p>
            </div>
          </div>
        )
      })}

      {archivedHabits.length > 0 && (
        <div className="section-gap">
          <button className="btn-ghost btn-sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? '▾' : '▸'} Archiviert ({archivedHabits.length})
          </button>
          {showArchived &&
            archivedHabits.map((habit) => (
              <div className="card" key={habit.id} style={{ opacity: 0.65 }}>
                <div className="card-title-row">
                  <span>📦 {habit.title}</span>
                  <span style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" title="Reaktivieren" onClick={() => setArchived(habit, false)}>
                      ↩
                    </button>
                    <button className="icon-btn" title="Löschen" onClick={() => deleteHabit(habit)}>
                      🗑
                    </button>
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  )
}
