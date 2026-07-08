import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Flame, Moon, Sparkles, Compass, TreePine, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { buildTree, firstOpenLeaf, goalNeedsClarification, pathToStep } from '../lib/tree'
import { formatDate, todayStr } from '../lib/dates'
import { currentStreak, missedTwice } from '../lib/streaks'
import { awardBadge, badgeToastText, recordActivity } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import CheckButton from '../components/CheckButton.jsx'

export default function TodayPage() {
  const showToast = useToast()
  const [loading, setLoading] = useState(true)
  const [sprint, setSprint] = useState(null)
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [steps, setSteps] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [activityDates, setActivityDates] = useState([])

  const today = todayStr()

  async function load() {
    const [
      { data: sprintRows },
      { data: goalRows },
      { data: stepRows },
      { data: habitRows },
      { data: logRows },
      { data: activityRows },
    ] = await Promise.all([
      supabase.from('sprints').select('*').eq('status', 'active').limit(1),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('steps').select('*'),
      supabase.from('habits').select('*').is('archived_at', null).order('created_at'),
      supabase.from('habit_logs').select('*'),
      supabase.from('activity_days').select('activity_date'),
    ])
    const active = sprintRows?.[0] ?? null
    setSprint(active)
    setGoals(goalRows ?? [])
    setSteps(stepRows ?? [])
    setHabits(habitRows ?? [])
    setHabitLogs(logRows ?? [])
    setActivityDates((activityRows ?? []).map((r) => r.activity_date))
    if (active) {
      const { data: taskRows } = await supabase
        .from('sprint_tasks')
        .select('*')
        .eq('sprint_id', active.id)
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

  // Bäume pro Ziel (einmal bauen, mehrfach nutzen)
  const treesByGoal = useMemo(() => {
    const map = new Map()
    for (const goal of goals) {
      map.set(goal.id, buildTree(steps.filter((s) => s.goal_id === goal.id)))
    }
    return map
  }, [goals, steps])

  const focusTasks = tasks.filter((t) => t.is_today_focus && t.focus_date === today)
  const activeGoals = goals.filter((g) => g.status === 'active')
  const clarifyGoals = activeGoals.filter((g) =>
    goalNeedsClarification(treesByGoal.get(g.id)?.roots ?? [])
  )
  const activityStreak = currentStreak(activityDates)

  // "Nächster Schritt": erster offener Blatt-Schritt —
  // bevorzugt aus den Fokusaufgaben, dann aus dem Sprint, sonst aus allen Zielen
  const nextStep = useMemo(() => {
    const fromTasks = (taskList) => {
      for (const task of taskList) {
        const step = stepById.get(task.step_id)
        if (!step) continue
        const tree = treesByGoal.get(step.goal_id)
        const node = tree?.byId.get(step.id)
        if (!node) continue
        const leaf = firstOpenLeaf([node])
        if (leaf) return leaf
      }
      return null
    }
    let leaf = fromTasks(focusTasks) ?? fromTasks(tasks)
    if (!leaf) {
      for (const goal of activeGoals) {
        leaf = firstOpenLeaf(treesByGoal.get(goal.id)?.roots ?? [])
        if (leaf) break
      }
    }
    if (!leaf) return null
    const tree = treesByGoal.get(leaf.goal_id)
    const goal = goals.find((g) => g.id === leaf.goal_id)
    const parents = tree ? pathToStep(tree.byId, leaf.id).slice(0, -1).map((p) => p.title) : []
    return { leaf, goal, parents }
  }, [focusTasks, tasks, activeGoals, treesByGoal, stepById, goals])

  // ---------- Aktionen ----------

  async function toggleStepDone(step) {
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

  async function removeFocus(task) {
    await supabase
      .from('sprint_tasks')
      .update({ is_today_focus: false, focus_date: null })
      .eq('id', task.id)
    await load()
  }

  async function toggleHabitToday(habit) {
    const existing = habitLogs.find(
      (l) => l.habit_id === habit.id && l.log_date === today
    )
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habit.id, log_date: today })
      const logsAfter = [...habitLogs, { habit_id: habit.id, log_date: today }]
      const streak = currentStreak(
        logsAfter.filter((l) => l.habit_id === habit.id).map((l) => l.log_date)
      )
      const newBadges = []
      if (streak >= 14) newBadges.push(await awardBadge('habit_streak_14'))
      newBadges.push(...(await recordActivity()))
      newBadges.filter(Boolean).forEach((k) => showToast(badgeToastText(k)))
    }
    await load()
  }

  // ---------- Rendering ----------

  if (loading) return <div className="spinner-center">Der Wald erwacht …</div>

  const sprintDone = tasks.filter((t) => stepById.get(t.step_id)?.is_done).length
  const missedHabits = habits.filter((h) => {
    const dates = habitLogs.filter((l) => l.habit_id === h.id).map((l) => l.log_date)
    // Hinweis nur, wenn die Gewohnheit alt genug ist, um zwei Tage verpasst zu haben
    return h.created_at.slice(0, 10) <= todayStr(new Date(Date.now() - 2 * 86400000)) &&
      missedTwice(dates)
  })

  return (
    <>
      <header className="page-header">
        <div>
          <h1><Sun size={22} /> Heute</h1>
          <p className="page-sub">{formatDate(today)}</p>
        </div>
        {activityStreak > 0 && (
          <span className="chip focus" title="Tage in Folge aktiv">
            <Flame /> {activityStreak} Tag{activityStreak === 1 ? '' : 'e'}
          </span>
        )}
      </header>

      {/* Sanfter Never-miss-twice-Hinweis (rein In-App) */}
      {missedHabits.length > 0 && (
        <div className="hint gentle">
          <Moon size={18} />
          <span>
            {missedHabits.map((h) => h.title).join(', ')}{' '}
            {missedHabits.length === 1 ? 'wartet' : 'warten'} seit zwei Tagen auf dich.
            Kein Drama — heute ist ein guter Tag, um den Pfad wieder aufzunehmen.
          </span>
        </div>
      )}

      {/* Nächster Schritt — prominent */}
      {nextStep && (
        <div className="card prominent">
          <p className="faint" style={{ marginBottom: '0.35rem' }}>
            <Sparkles size={13} /> Dein nächster Schritt
          </p>
          <div className="tree-row">
            <CheckButton done={false} onToggle={() => toggleStepDone(nextStep.leaf)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{nextStep.leaf.title}</strong>
              <span className="faint" style={{ display: 'block' }}>
                <TreePine size={12} /> {nextStep.goal?.title}
                {nextStep.parents.length > 0 && ` › ${nextStep.parents.join(' › ')}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Braucht Klärung */}
      {clarifyGoals.length > 0 && (
        <div className="hint">
          <Compass size={18} />
          <span>
            <strong>Braucht Klärung:</strong>{' '}
            {clarifyGoals.map((g, i) => (
              <span key={g.id}>
                {i > 0 && ', '}
                <Link to={`/ziele/${g.id}`}>{g.title}</Link>
              </span>
            ))}
            {' — '}Was wäre dort jeweils der nächste konkrete Schritt?
          </span>
        </div>
      )}

      {/* Fokus heute */}
      <h2 style={{ marginTop: '1.5rem' }}>Heute im Fokus</h2>
      {focusTasks.length === 0 ? (
        <div className="empty-state">
          {sprint ? (
            <>
              Noch keine Fokusaufgaben für heute.<br />
              Wähle im <Link to="/sprint">Trail</Link> Aufgaben mit ★ aus.
            </>
          ) : (
            <>
              Kein aktiver Trail.<br />
              <Link to="/sprint">Starte einen Trail</Link>, um Aufgaben für heute zu planen.
            </>
          )}
        </div>
      ) : (
        <div className="card">
          <ul className="list-plain">
            {focusTasks.map((task) => {
              const step = stepById.get(task.step_id)
              if (!step) return null
              return (
                <li className="tree-node" key={task.id}>
                  <div className="tree-row">
                    <CheckButton done={step.is_done} onToggle={() => toggleStepDone(step)} />
                    <span className={`step-title${step.is_done ? ' done-text' : ''}`}>
                      {step.title}
                    </span>
                    <button
                      className="icon-btn"
                      title="Aus der Tagesauswahl entfernen (bleibt im Sprint)"
                      onClick={() => removeFocus(task)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Sprint-Fortschritt */}
      {sprint && (
        <div className="card">
          <div className="card-title-row">
            <h3><Compass size={16} /> Trail-Fortschritt</h3>
            <Link to="/sprint" className="faint">zur Übersicht →</Link>
          </div>
          <ProgressBar done={sprintDone} total={tasks.length} />
        </div>
      )}

      {/* Gewohnheiten heute */}
      {habits.length > 0 && (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>Routinen heute</h2>
          <div className="card">
            <ul className="list-plain">
              {habits.map((habit) => {
                const doneToday = habitLogs.some(
                  (l) => l.habit_id === habit.id && l.log_date === today
                )
                const streak = currentStreak(
                  habitLogs.filter((l) => l.habit_id === habit.id).map((l) => l.log_date)
                )
                return (
                  <li className="tree-node" key={habit.id}>
                    <div className="tree-row">
                      <CheckButton done={doneToday} onToggle={() => toggleHabitToday(habit)} />
                      <span className={`step-title${doneToday ? ' done-text' : ''}`}>
                        {habit.title}
                      </span>
                      {streak > 0 && (
                        <span className="chip" title="Aktuelle Serie"><Flame /> {streak}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
