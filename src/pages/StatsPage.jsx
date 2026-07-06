import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BADGES } from '../lib/badges'
import { currentStreak } from '../lib/streaks'
import { formatDate } from '../lib/dates'

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [earnedBadges, setEarnedBadges] = useState([])
  const [sprints, setSprints] = useState([])
  const [activityDates, setActivityDates] = useState([])
  const [doneStepsCount, setDoneStepsCount] = useState(0)

  async function load() {
    const [
      { data: badgeRows },
      { data: sprintRows },
      { data: activityRows },
      { count: doneCount },
    ] = await Promise.all([
      supabase.from('badges').select('*'),
      supabase.from('sprints').select('*').eq('status', 'completed'),
      supabase.from('activity_days').select('activity_date'),
      supabase.from('steps').select('*', { count: 'exact', head: true }).eq('is_done', true),
    ])
    setEarnedBadges(badgeRows ?? [])
    setSprints(sprintRows ?? [])
    setActivityDates((activityRows ?? []).map((r) => r.activity_date))
    setDoneStepsCount(doneCount ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) return <div className="spinner-center">Lade Erfolge …</div>

  const earnedByKey = new Map(earnedBadges.map((b) => [b.badge_key, b]))
  const streak = currentStreak(activityDates)
  const totalPlanned = sprints.reduce((sum, s) => sum + (s.total_tasks ?? 0), 0)
  const totalDone = sprints.reduce((sum, s) => sum + (s.done_tasks ?? 0), 0)
  const successRate = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : null

  return (
    <>
      <header className="page-header">
        <div>
          <h1>✨ Erfolge</h1>
          <p className="page-sub">Das Licht, das du schon entzündet hast</p>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">🔥 {streak}</div>
          <div className="stat-label">Tage-Streak (aktiv)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sprints.length}</div>
          <div className="stat-label">Abgeschlossene Sprints</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{successRate !== null ? `${successRate}%` : '—'}</div>
          <div className="stat-label">Erfolgsquote gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{doneStepsCount}</div>
          <div className="stat-label">Erledigte Schritte</div>
        </div>
      </div>

      <h2>Abzeichen</h2>
      <div className="badge-grid">
        {Object.entries(BADGES).map(([key, badge]) => {
          const earned = earnedByKey.get(key)
          return (
            <div className={`badge-card ${earned ? 'earned' : 'locked'}`} key={key}>
              <span className="badge-icon">{badge.icon}</span>
              <strong>{badge.title}</strong>
              <p className="faint">{badge.description}</p>
              {earned && (
                <p className="faint">verdient am {formatDate(earned.earned_at.slice(0, 10))}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="section-gap" style={{ textAlign: 'center' }}>
        <button className="btn-ghost btn-sm" onClick={signOut}>Abmelden</button>
      </div>
    </>
  )
}
