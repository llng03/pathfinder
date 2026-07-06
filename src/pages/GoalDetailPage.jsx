import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import {
  buildTree,
  countSteps,
  goalNeedsClarification,
  pathToStep,
  stepNeedsClarification,
} from '../lib/tree'
import { formatDate, todayStr } from '../lib/dates'
import { recordActivity, badgeToastText } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import CheckButton from '../components/CheckButton.jsx'

export default function GoalDetailPage() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const [goal, setGoal] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)

  // UI-Zustand
  const [focusStepId, setFocusStepId] = useState(null) // Drill-Down in einen Ast
  const [collapsed, setCollapsed] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [addTargetId, setAddTargetId] = useState(undefined) // undefined = kein Formular, null = Root
  const [addText, setAddText] = useState('')

  async function load() {
    const [{ data: goalRow }, { data: stepRows }] = await Promise.all([
      supabase.from('goals').select('*').eq('id', goalId).single(),
      supabase.from('steps').select('*').eq('goal_id', goalId),
    ])
    setGoal(goalRow ?? null)
    setSteps(stepRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    setFocusStepId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId])

  const { roots, byId } = useMemo(() => buildTree(steps), [steps])
  const focusNode = focusStepId ? byId.get(focusStepId) : null
  const visibleNodes = focusNode ? focusNode.children : roots
  const breadcrumbPath = focusNode ? pathToStep(byId, focusNode.id) : []
  const { total, done } = useMemo(() => countSteps(roots), [roots])
  const needsClarification =
    goal?.status === 'active' && goalNeedsClarification(roots)

  // ---------- Mutationen ----------

  async function toggleDone(node) {
    const nowDone = !node.is_done
    await supabase
      .from('steps')
      .update({ is_done: nowDone, done_at: nowDone ? new Date().toISOString() : null })
      .eq('id', node.id)
    await load()
    if (nowDone) {
      const newBadges = await recordActivity()
      newBadges.forEach((k) => showToast(badgeToastText(k)))
    }
  }

  async function addStep(e) {
    e.preventDefault()
    if (!addText.trim()) return
    const siblings = addTargetId ? (byId.get(addTargetId)?.children ?? []) : roots
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sort_order), -1)
    const { error } = await supabase.from('steps').insert({
      goal_id: goalId,
      parent_step_id: addTargetId ?? null,
      title: addText.trim(),
      sort_order: maxOrder + 1,
      origin: 'manual',
    })
    if (error) {
      showToast('Schritt konnte nicht angelegt werden')
      return
    }
    setAddText('')
    // Formular offen lassen, damit mehrere Schritte nacheinander erfasst werden können
    await load()
    if (addTargetId) {
      setCollapsed((c) => {
        const next = new Set(c)
        next.delete(addTargetId)
        return next
      })
    }
  }

  async function saveEdit(node) {
    if (!editText.trim() || editText.trim() === node.title) {
      setEditingId(null)
      return
    }
    await supabase.from('steps').update({ title: editText.trim() }).eq('id', node.id)
    setEditingId(null)
    await load()
  }

  async function deleteStep(node) {
    const childCount = countSteps(node.children).total
    const msg = childCount
      ? `„${node.title}" und ${childCount} Unterschritt(e) löschen?`
      : `„${node.title}" löschen?`
    if (!confirm(msg)) return
    await supabase.from('steps').delete().eq('id', node.id)
    if (focusStepId === node.id) setFocusStepId(node.parent_step_id ?? null)
    await load()
  }

  async function moveStep(node, siblings, direction) {
    const index = siblings.findIndex((s) => s.id === node.id)
    const swapWith = siblings[index + direction]
    if (!swapWith) return
    await Promise.all([
      supabase.from('steps').update({ sort_order: swapWith.sort_order }).eq('id', node.id),
      supabase.from('steps').update({ sort_order: node.sort_order }).eq('id', swapWith.id),
    ])
    await load()
  }

  async function setGoalStatus(status) {
    await supabase
      .from('goals')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', goalId)
    await load()
    if (status === 'completed') showToast('🏔️ Ziel abgeschlossen — stark!')
  }

  async function deleteGoal() {
    if (!confirm(`Ziel „${goal.title}" mitsamt allen Schritten löschen?`)) return
    await supabase.from('goals').delete().eq('id', goalId)
    navigate('/ziele')
  }

  // ---------- Baum-Rendering ----------

  function renderNode(node, siblings) {
    const isCollapsed = collapsed.has(node.id)
    const clarify = stepNeedsClarification(node)

    return (
      <li className="tree-node" key={node.id}>
        <div className="tree-row">
          {node.children.length > 0 ? (
            <button
              type="button"
              className="twisty"
              onClick={() =>
                setCollapsed((c) => {
                  const next = new Set(c)
                  if (next.has(node.id)) next.delete(node.id)
                  else next.add(node.id)
                  return next
                })
              }
              aria-label={isCollapsed ? 'Ausklappen' : 'Einklappen'}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="twisty" />
          )}

          <CheckButton done={node.is_done} onToggle={() => toggleDone(node)} />

          {editingId === node.id ? (
            <form
              className="inline-form"
              style={{ flex: 1 }}
              onSubmit={(e) => {
                e.preventDefault()
                saveEdit(node)
              }}
            >
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onBlur={() => saveEdit(node)}
              />
            </form>
          ) : (
            <span
              className={`step-title${node.is_done ? ' done-text' : ''}`}
              onClick={() => node.children.length > 0 && setFocusStepId(node.id)}
              style={{ cursor: node.children.length > 0 ? 'pointer' : 'default' }}
              title={node.children.length > 0 ? 'In diesen Ast hineinzoomen' : undefined}
            >
              {node.title}
            </span>
          )}

          {clarify && <span className="chip clarify">⚠ Klärung</span>}

          <span className="row-actions">
            <button className="icon-btn" title="Unterschritt hinzufügen"
              onClick={() => { setAddTargetId(node.id); setAddText('') }}>
              ＋
            </button>
            <button className="icon-btn" title="Umbenennen"
              onClick={() => { setEditingId(node.id); setEditText(node.title) }}>
              ✎
            </button>
            <button className="icon-btn" title="Nach oben"
              onClick={() => moveStep(node, siblings, -1)}>
              ↑
            </button>
            <button className="icon-btn" title="Nach unten"
              onClick={() => moveStep(node, siblings, 1)}>
              ↓
            </button>
            <button className="icon-btn" title="Löschen" onClick={() => deleteStep(node)}>
              🗑
            </button>
          </span>
        </div>

        {addTargetId === node.id && (
          <form className="inline-form" style={{ margin: '0.4rem 0 0.4rem 2.6rem' }} onSubmit={addStep}>
            <input
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="Neuer Unterschritt …"
              autoFocus
            />
            <button type="submit" className="btn-primary btn-sm">OK</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAddTargetId(undefined)}>
              ✕
            </button>
          </form>
        )}

        {!isCollapsed && node.children.length > 0 && (
          <ul className="list-plain tree-children">
            {node.children.map((child) => renderNode(child, node.children))}
          </ul>
        )}
      </li>
    )
  }

  if (loading) return <div className="spinner-center">Lade Ziel …</div>
  if (!goal) {
    return (
      <div className="empty-state">
        Ziel nicht gefunden. <Link to="/ziele">Zurück zur Übersicht</Link>
      </div>
    )
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/ziele">🌲 Ziele</Link>
        <span>/</span>
        <button onClick={() => setFocusStepId(null)}>{goal.title}</button>
        {breadcrumbPath.map((node) => (
          <span key={node.id} style={{ display: 'contents' }}>
            <span>/</span>
            <button onClick={() => setFocusStepId(node.id)}>{node.title}</button>
          </span>
        ))}
      </div>

      {!focusNode ? (
        <header className="card prominent">
          <div className="card-title-row">
            <h1>{goal.title}</h1>
            {goal.status === 'completed' && <span className="chip focus">🏔️ Abgeschlossen</span>}
          </div>
          {goal.description && <p className="muted">{goal.description}</p>}
          {goal.target_date && (
            <p className="faint">
              🗓 Zieldatum: {formatDate(goal.target_date)}
              {goal.target_date < todayStr() && goal.status === 'active' && ' — liegt in der Vergangenheit'}
            </p>
          )}
          <div style={{ marginTop: '0.6rem' }}>
            <ProgressBar done={done} total={total} />
          </div>
        </header>
      ) : (
        <header className="card">
          <div className="tree-row">
            <CheckButton done={focusNode.is_done} onToggle={() => toggleDone(focusNode)} />
            <h2 style={{ margin: 0, flex: 1 }} className={focusNode.is_done ? 'done-text' : ''}>
              {focusNode.title}
            </h2>
            {stepNeedsClarification(focusNode) && (
              <span className="chip clarify">⚠ Braucht Klärung</span>
            )}
          </div>
        </header>
      )}

      {needsClarification && !focusNode && (
        <div className="hint">
          <span>🧭</span>
          <span>
            Hier fehlt gerade eine konkrete nächste Handlung.{' '}
            <strong>Was ist der nächste kleine Schritt?</strong> Füge ihn unten hinzu —
            er darf ruhig winzig sein.
          </span>
        </div>
      )}

      <ul className="list-plain">
        {visibleNodes.map((node) => renderNode(node, visibleNodes))}
      </ul>

      {visibleNodes.length === 0 && (
        <p className="muted" style={{ margin: '0.5rem 0 1rem' }}>
          {focusNode ? 'Dieser Schritt hat noch keine Unterschritte.' : 'Noch keine Schritte.'}
        </p>
      )}

      <form className="inline-form" onSubmit={addStep}
        onFocus={() => setAddTargetId(focusNode ? focusNode.id : null)}>
        <input
          value={addTargetId === (focusNode ? focusNode.id : null) ? addText : ''}
          onChange={(e) => {
            setAddTargetId(focusNode ? focusNode.id : null)
            setAddText(e.target.value)
          }}
          placeholder={focusNode ? 'Neuen Unterschritt hinzufügen …' : 'Neuen Schritt hinzufügen …'}
        />
        <button type="submit" className="btn-primary">＋</button>
      </form>

      {!focusNode && (
        <div className="section-gap" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {goal.status === 'active' ? (
            <button className="btn-ghost" onClick={() => setGoalStatus('completed')}>
              🏔️ Ziel abschließen
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setGoalStatus('active')}>
              ↩ Wieder aktivieren
            </button>
          )}
          <button className="btn-danger" onClick={deleteGoal}>Ziel löschen</button>
        </div>
      )}
    </>
  )
}
