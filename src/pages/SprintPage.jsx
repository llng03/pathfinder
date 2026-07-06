import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { buildTree, pathToStep } from '../lib/tree'
import { addDays, daysUntil, formatDate, todayStr } from '../lib/dates'
import { awardBadge, badgeToastText, recordActivity } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import CheckButton from '../components/CheckButton.jsx'

export default function SprintPage() {
  const showToast = useToast()
  const [loading, setLoading] = useState(true)
  const [activeSprint, setActiveSprint] = useState(null)
  const [lastSprint, setLastSprint] = useState(null)
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [steps, setSteps] = useState([])

  // Planungs-UI
  const [planning, setPlanning] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [justFinished, setJustFinished] = useState(null)

  async function load() {
    const [{ data: sprintRows }, { data: goalRows }, { data: stepRows }] = await Promise.all([
      supabase.from('sprints').select('*').order('start_date', { ascending: false }),
      supabase.from('goals').select('*'),
      supabase.from('steps').select('*'),
    ])
    const active = (sprintRows ?? []).find((s) => s.status === 'active') ?? null
    setActiveSprint(active)
    setLastSprint((sprintRows ?? []).find((s) => s.status === 'completed') ?? null)
    setGoals(goalRows ?? [])
    setSteps(stepRows ?? [])
    if (active) {
      const { data: taskRows } = await supabase
        .from('sprint_tasks')
        .select('*')
        .eq('sprint_id', active.id)
        .order('created_at')
      setTasks(taskRows ?? [])
    } else {
      setTasks([])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stepById = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps])
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals])

  // Baum pro aktivem Ziel für die Planung
  const goalTrees = useMemo(() => {
    return goals
      .filter((g) => g.status === 'active')
      .map((g) => ({
        goal: g,
        ...buildTree(steps.filter((s) => s.goal_id === g.id)),
      }))
  }, [goals, steps])

  function taskPath(task) {
    const step = stepById.get(task.step_id)
    if (!step) return null
    const goal = goalById.get(step.goal_id)
    const { byId } = buildTree(steps.filter((s) => s.goal_id === step.goal_id))
    const path = pathToStep(byId, step.id)
    const parents = path.slice(0, -1).map((p) => p.title)
    return {
      step,
      goalTitle: goal?.title ?? '—',
      parentPath: parents.join(' › '),
    }
  }

  // ---------- Aktiver Sprint ----------

  async function toggleTaskDone(task) {
    const step = stepById.get(task.step_id)
    if (!step) return
    const nowDone = !step.is_done
    await supabase
      .from('steps')
      .update({ is_done: nowDone, done_at: nowDone ? new Date().toISOString() : null })
      .eq('id', step.id)
    await load()
    if (nowDone) {
      const newBadges = await recordActivity()
      newBadges.forEach((k) => showToast(badgeToastText(k)))
    }
  }

  async function toggleFocus(task) {
    const today = todayStr()
    const isFocusedToday = task.is_today_focus && task.focus_date === today
    await supabase
      .from('sprint_tasks')
      .update(
        isFocusedToday
          ? { is_today_focus: false, focus_date: null }
          : { is_today_focus: true, focus_date: today }
      )
      .eq('id', task.id)
    await load()
  }

  async function finishSprint() {
    const total = tasks.length
    const doneCount = tasks.filter((t) => stepById.get(t.step_id)?.is_done).length
    if (!confirm(`Sprint beenden? ${doneCount} von ${total} Aufgaben sind erledigt.`)) return

    await supabase
      .from('sprints')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_tasks: total,
        done_tasks: doneCount,
      })
      .eq('id', activeSprint.id)

    const newBadges = []
    newBadges.push(await awardBadge('first_sprint_completed'))
    if (total > 0 && doneCount === total) newBadges.push(await awardBadge('perfect_sprint'))
    newBadges.push(...(await recordActivity()))
    newBadges.filter(Boolean).forEach((k) => showToast(badgeToastText(k)))

    setJustFinished({ total, done: doneCount })
    await load()
  }

  // ---------- Planung ----------

  function toggleSelected(stepId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  // Nur offene Schritte sind planbar; erledigte Äste werden ausgeblendet
  function renderPickerNode(node) {
    if (node.is_done) return null
    return (
      <li className="tree-node" key={node.id}>
        <div className="tree-row">
          <button
            type="button"
            className={`check${selected.has(node.id) ? ' done' : ''}`}
            onClick={() => toggleSelected(node.id)}
            aria-pressed={selected.has(node.id)}
            title="Für diesen Sprint einplanen"
          >
            ✓
          </button>
          <span className="step-title">{node.title}</span>
        </div>
        {node.children.length > 0 && (
          <ul className="list-plain tree-children">
            {node.children.map(renderPickerNode)}
          </ul>
        )}
      </li>
    )
  }

  async function startSprint() {
    if (selected.size === 0) {
      showToast('Wähle mindestens einen Schritt aus')
      return
    }
    const start = todayStr()
    const end = addDays(start, 13) // fester 2-Wochen-Zeitraum
    const { data: sprint, error } = await supabase
      .from('sprints')
      .insert({ start_date: start, end_date: end })
      .select()
      .single()
    if (error) {
      showToast('Sprint konnte nicht gestartet werden')
      return
    }
    const rows = [...selected].map((stepId) => ({
      sprint_id: sprint.id,
      step_id: stepId,
    }))
    await supabase.from('sprint_tasks').insert(rows)
    setSelected(new Set())
    setPlanning(false)
    setJustFinished(null)
    await recordActivity()
    await load()
    showToast('🧭 Sprint gestartet — gute Reise!')
  }

  // ---------- Rendering ----------

  if (loading) return <div className="spinner-center">Lade Sprint …</div>

  if (activeSprint) {
    const doneCount = tasks.filter((t) => stepById.get(t.step_id)?.is_done).length
    const remaining = daysUntil(activeSprint.end_date)
    const today = todayStr()

    // Aufgaben nach Ziel gruppieren
    const groups = new Map()
    for (const task of tasks) {
      const info = taskPath(task)
      if (!info) continue
      if (!groups.has(info.goalTitle)) groups.set(info.goalTitle, [])
      groups.get(info.goalTitle).push({ task, info })
    }

    return (
      <>
        <header className="page-header">
          <div>
            <h1>🧭 Aktueller Sprint</h1>
            <p className="page-sub">
              {formatDate(activeSprint.start_date)} – {formatDate(activeSprint.end_date)}
              {' · '}
              {remaining >= 0
                ? `noch ${remaining} Tag${remaining === 1 ? '' : 'e'}`
                : `seit ${-remaining} Tag${remaining === -1 ? '' : 'en'} überfällig`}
            </p>
          </div>
          <button className="btn-ghost" onClick={finishSprint}>Sprint beenden</button>
        </header>

        {remaining < 0 && (
          <div className="hint">
            <span>🕯️</span>
            <span>Der Sprint-Zeitraum ist vorbei. Zeit für die Zusammenfassung — beende den Sprint, um den nächsten zu starten.</span>
          </div>
        )}

        <div className="card prominent">
          <ProgressBar done={doneCount} total={tasks.length} />
        </div>

        {[...groups.entries()].map(([goalTitle, entries]) => (
          <div className="card" key={goalTitle}>
            <h3>🌲 {goalTitle}</h3>
            <ul className="list-plain">
              {entries.map(({ task, info }) => {
                const focusedToday = task.is_today_focus && task.focus_date === today
                return (
                  <li className="tree-node" key={task.id}>
                    <div className="tree-row">
                      <CheckButton
                        done={info.step.is_done}
                        onToggle={() => toggleTaskDone(task)}
                      />
                      <span className={`step-title${info.step.is_done ? ' done-text' : ''}`}>
                        {info.step.title}
                        {info.parentPath && (
                          <span className="faint" style={{ display: 'block' }}>
                            {info.parentPath}
                          </span>
                        )}
                      </span>
                      <button
                        className="icon-btn"
                        title={focusedToday ? 'Aus dem Heute-Fokus entfernen' : 'Heute in den Fokus nehmen'}
                        onClick={() => toggleFocus(task)}
                        style={focusedToday ? { color: 'var(--light-300)', textShadow: '0 0 10px var(--glow)' } : undefined}
                      >
                        {focusedToday ? '★' : '☆'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="empty-state">Dieser Sprint hat keine Aufgaben.</div>
        )}

        <p className="faint">
          ★ = heute im Fokus — erscheint auf der <Link to="/">Heute-Ansicht</Link>.
        </p>
      </>
    )
  }

  // Kein aktiver Sprint
  return (
    <>
      <header className="page-header">
        <div>
          <h1>🧭 Sprint</h1>
          <p className="page-sub">Kein aktiver Sprint</p>
        </div>
        {!planning && (
          <button className="btn-primary" onClick={() => setPlanning(true)}>
            Neuen Sprint starten
          </button>
        )}
      </header>

      {justFinished && (
        <div className="card prominent">
          <h2>🏕️ Sprint abgeschlossen!</h2>
          <p className="muted">
            {justFinished.done} von {justFinished.total} Aufgaben erledigt
            {justFinished.total > 0 &&
              ` — Erfolgsquote ${Math.round((justFinished.done / justFinished.total) * 100)}%`}
          </p>
          <ProgressBar done={justFinished.done} total={justFinished.total} showLabel={false} />
        </div>
      )}

      {!planning && lastSprint && !justFinished && (
        <div className="card">
          <h3>Letzter Sprint</h3>
          <p className="muted">
            {formatDate(lastSprint.start_date)} – {formatDate(lastSprint.end_date)}:{' '}
            {lastSprint.done_tasks ?? 0} von {lastSprint.total_tasks ?? 0} erledigt
            {(lastSprint.total_tasks ?? 0) > 0 &&
              ` (${Math.round((lastSprint.done_tasks / lastSprint.total_tasks) * 100)}%)`}
          </p>
        </div>
      )}

      {planning && (
        <>
          <div className="card prominent">
            <h3>Sprint planen</h3>
            <p className="muted">
              Zeitraum: {formatDate(todayStr())} – {formatDate(addDays(todayStr(), 13))} (2 Wochen)
            </p>
            <p className="muted">
              Wähle Schritte aus deinen Zielen — auf jeder beliebigen Ebene, vom großen
              Teilschritt bis zum kleinsten Unterschritt.
            </p>
          </div>

          {goalTrees.map(({ goal, roots }) => {
            const pickable = roots.some((r) => !r.is_done)
            return (
              <div className="card" key={goal.id}>
                <h3>🌲 {goal.title}</h3>
                {pickable ? (
                  <ul className="list-plain">{roots.map(renderPickerNode)}</ul>
                ) : (
                  <p className="faint">
                    Keine offenen Schritte — <Link to={`/ziele/${goal.id}`}>Schritte anlegen</Link>
                  </p>
                )}
              </div>
            )
          })}

          {goalTrees.length === 0 && (
            <div className="empty-state">
              Du hast noch keine aktiven Ziele. <Link to="/ziele">Lege zuerst ein Ziel an.</Link>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-ghost" onClick={() => { setPlanning(false); setSelected(new Set()) }}>
              Abbrechen
            </button>
            <button className="btn-primary" onClick={startSprint} disabled={selected.size === 0}>
              Sprint starten ({selected.size} Aufgabe{selected.size === 1 ? '' : 'n'})
            </button>
          </div>
        </>
      )}
    </>
  )
}
