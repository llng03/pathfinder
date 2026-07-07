import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TreePine, Mountain, TriangleAlert, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { buildTree, countSteps, goalNeedsClarification } from '../lib/tree'
import { formatDate } from '../lib/dates'
import { recordActivity, awardBadge, badgeToastText } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'

export default function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', target_date: '' })
  const showToast = useToast()

  async function load() {
    const [{ data: goalRows }, { data: stepRows }] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('steps').select('*'),
    ])
    setGoals(goalRows ?? [])
    setSteps(stepRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addGoal(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const { error } = await supabase.from('goals').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      target_date: form.target_date || null,
    })
    if (error) {
      showToast('Speichern fehlgeschlagen')
      return
    }
    setForm({ title: '', description: '', target_date: '' })
    setShowForm(false)
    await load()
    const badge = await awardBadge('first_goal')
    if (badge) showToast(badgeToastText(badge))
    const newBadges = await recordActivity()
    newBadges.forEach((k) => showToast(badgeToastText(k)))
  }

  function goalCard(goal) {
    const goalSteps = steps.filter((s) => s.goal_id === goal.id)
    const { roots } = buildTree(goalSteps)
    const { total, done } = countSteps(roots)
    const needsClarification =
      goal.status === 'active' && goalNeedsClarification(roots)

    return (
      <Link to={`/ziele/${goal.id}`} key={goal.id} style={{ color: 'inherit' }}>
        <div className={`card${needsClarification ? ' clarify' : ''}`}>
          <div className="card-title-row">
            <h3>
              {goal.status === 'completed' && <Mountain size={16} />}
              {goal.title}
            </h3>
            {needsClarification && (
              <span className="chip clarify"><TriangleAlert /> Braucht Klärung</span>
            )}
          </div>
          {goal.description && <p className="muted">{goal.description}</p>}
          {goal.target_date && (
            <p className="faint"><CalendarDays size={13} /> Zieldatum: {formatDate(goal.target_date)}</p>
          )}
          <div style={{ marginTop: '0.6rem' }}>
            <ProgressBar done={done} total={total} />
          </div>
        </div>
      </Link>
    )
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status !== 'active')

  if (loading) return <div className="spinner-center">Lade Ziele …</div>

  return (
    <>
      <header className="page-header">
        <div>
          <h1><TreePine size={22} /> Ziele</h1>
          <p className="page-sub">Deine Pfade durch den Wald</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          + Neues Ziel
        </button>
      </header>

      {showForm && (
        <form className="card prominent" onSubmit={addGoal}>
          <div className="form-row">
            <label htmlFor="goal-title">Titel</label>
            <input
              id="goal-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-row">
            <label htmlFor="goal-desc">Beschreibung (optional)</label>
            <textarea
              id="goal-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="form-row">
            <label htmlFor="goal-date">Zieldatum (optional)</label>
            <input
              id="goal-date"
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary">Ziel anlegen</button>
          </div>
        </form>
      )}

      {activeGoals.length === 0 && !showForm && (
        <div className="empty-state">
          Noch keine aktiven Ziele.<br />
          Lege eines an — oder befördere eine Idee aus dem <Link to="/ideen">Ideenpool</Link>.
        </div>
      )}

      {activeGoals.map(goalCard)}

      {completedGoals.length > 0 && (
        <div className="section-gap">
          <button className="btn-ghost btn-sm" onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? '▾' : '▸'} Abgeschlossen & archiviert ({completedGoals.length})
          </button>
          {showCompleted && completedGoals.map(goalCard)}
        </div>
      )}
    </>
  )
}
