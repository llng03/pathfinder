import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  TreePine,
  Mountain,
  TriangleAlert,
  CalendarDays,
  CalendarClock,
  Link2,
  Compass,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import {
  buildTree,
  countSteps,
  goalNeedsClarification,
  pathToStep,
  stepNeedsClarification,
} from '../lib/tree'
import {
  buildDepsByStep,
  formatSchedule,
  scheduleState,
  unmetDependencies,
  wouldCreateCycle,
} from '../lib/availability'
import { formatDate, todayStr } from '../lib/dates'
import { recordActivity, badgeToastText, checkStepCompletionBadges } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import CheckButton from '../components/CheckButton.jsx'

export default function GoalDetailPage() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()

  const [goal, setGoal] = useState(null)
  const [steps, setSteps] = useState([])
  // Ziel-übergreifend, für Abhängigkeiten aus anderen Zielen
  const [allSteps, setAllSteps] = useState([])
  const [allGoals, setAllGoals] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)

  // UI-Zustand
  const [focusStepId, setFocusStepId] = useState(null) // Drill-Down in einen Ast
  const [collapsed, setCollapsed] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [addTargetId, setAddTargetId] = useState(undefined) // undefined = kein Formular, null = Root
  const [addText, setAddText] = useState('')
  const [detailsId, setDetailsId] = useState(null) // Panel: Zeit & Abhängigkeiten
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [leadMinutes, setLeadMinutes] = useState(120)
  const [depQuery, setDepQuery] = useState('')

  async function load() {
    const [{ data: goalRow }, { data: stepRows }, { data: goalRows }, { data: depRows }] =
      await Promise.all([
        supabase.from('goals').select('*').eq('id', goalId).single(),
        supabase.from('steps').select('*'),
        supabase.from('goals').select('id, title'),
        supabase.from('step_dependencies').select('*'),
      ])
    setGoal(goalRow ?? null)
    setAllSteps(stepRows ?? [])
    setSteps((stepRows ?? []).filter((s) => s.goal_id === goalId))
    setAllGoals(goalRows ?? [])
    setDependencies(depRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    setFocusStepId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId])

  const { roots, byId } = useMemo(() => buildTree(steps), [steps])
  const allStepById = useMemo(() => new Map(allSteps.map((s) => [s.id, s])), [allSteps])
  const goalTitleById = useMemo(() => new Map(allGoals.map((g) => [g.id, g.title])), [allGoals])
  const depsByStep = useMemo(() => buildDepsByStep(dependencies), [dependencies])
  const availabilityCtx = useMemo(
    () => ({ depsByStep, stepById: allStepById, now: new Date() }),
    [depsByStep, allStepById]
  )
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
      const newBadges = [
        ...(await recordActivity()),
        ...(await checkStepCompletionBadges()),
      ]
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

  // ---------- Zeitbindung & Abhängigkeiten ----------

  function openDetails(node) {
    if (detailsId === node.id) {
      setDetailsId(null)
      return
    }
    setDetailsId(node.id)
    setSchedDate(node.scheduled_date ?? '')
    setSchedTime(node.scheduled_time?.slice(0, 5) ?? '')
    setLeadMinutes(node.lead_time_minutes ?? 120)
    setDepQuery('')
  }

  async function saveSchedule(e, node) {
    e.preventDefault()
    if (schedTime && !schedDate) {
      showToast('Bitte auch ein Datum wählen')
      return
    }
    const { error } = await supabase
      .from('steps')
      .update({
        scheduled_date: schedDate || null,
        scheduled_time: schedDate && schedTime ? schedTime : null,
        lead_time_minutes: leadMinutes === '' ? 120 : Number(leadMinutes),
      })
      .eq('id', node.id)
    if (error) {
      showToast('Zeitbindung konnte nicht gespeichert werden')
      return
    }
    await load()
  }

  async function clearSchedule(node) {
    await supabase
      .from('steps')
      .update({ scheduled_date: null, scheduled_time: null })
      .eq('id', node.id)
    setSchedDate('')
    setSchedTime('')
    await load()
  }

  async function addDependency(node, target) {
    if (wouldCreateCycle(node.id, target.id, depsByStep)) {
      showToast(
        `Nicht möglich: „${target.title}" hängt selbst (direkt oder indirekt) von „${node.title}" ab — das ergäbe einen Kreis.`
      )
      return
    }
    const { error } = await supabase
      .from('step_dependencies')
      .insert({ step_id: node.id, depends_on_step_id: target.id })
    if (error) {
      showToast('Abhängigkeit konnte nicht angelegt werden')
      return
    }
    setDepQuery('')
    await load()
  }

  async function removeDependency(node, dependsOnId) {
    await supabase
      .from('step_dependencies')
      .delete()
      .eq('step_id', node.id)
      .eq('depends_on_step_id', dependsOnId)
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
    if (status === 'completed') showToast('Ziel abgeschlossen — stark!')
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
    // Zeit-/Abhängigkeits-Hinweise: rein informativ, kein Blocker fürs Abhaken
    const schedState = node.is_done ? 'none' : scheduleState(node, availabilityCtx.now)
    const waiting = node.is_done ? [] : unmetDependencies(node, availabilityCtx)
    const depIds = depsByStep.get(node.id) ?? []

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
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
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

          {clarify && <span className="chip clarify"><TriangleAlert /> Klärung</span>}

          {node.scheduled_date && !node.is_done && (
            <span
              className={`chip${schedState === 'missed' ? ' missed' : ''}`}
              title={
                schedState === 'missed'
                  ? 'Termin verstrichen — kein Blocker, nur ein Hinweis'
                  : 'Wird nur im Vorlauffenster als nächster Schritt vorgeschlagen'
              }
            >
              <CalendarClock />
              {schedState === 'missed' && 'verpasst · '}
              {formatSchedule(node)}
            </span>
          )}

          {waiting.length > 0 && (
            <span
              className="chip wait"
              title={`Wartet auf: ${waiting.map((w) => w.title).join(', ')}`}
            >
              <Link2 /> wartet auf{' '}
              {waiting.length === 1 ? waiting[0].title : `${waiting.length} Schritte`}
            </span>
          )}

          <span className="row-actions">
            <button className="icon-btn" title="Unterschritt hinzufügen"
              onClick={() => { setAddTargetId(node.id); setAddText('') }}>
              <Plus size={15} />
            </button>
            <button className="icon-btn" title="Umbenennen"
              onClick={() => { setEditingId(node.id); setEditText(node.title) }}>
              <Pencil size={14} />
            </button>
            <button className="icon-btn" title="Termin & Abhängigkeiten"
              onClick={() => openDetails(node)}>
              <CalendarClock size={14} />
            </button>
            <button className="icon-btn" title="Nach oben"
              onClick={() => moveStep(node, siblings, -1)}>
              <ArrowUp size={14} />
            </button>
            <button className="icon-btn" title="Nach unten"
              onClick={() => moveStep(node, siblings, 1)}>
              <ArrowDown size={14} />
            </button>
            <button className="icon-btn" title="Löschen" onClick={() => deleteStep(node)}>
              <Trash2 size={14} />
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
              <X size={14} />
            </button>
          </form>
        )}

        {detailsId === node.id && (
          <div className="step-details">
            <p className="faint"><CalendarClock size={13} /> Zeitbindung</p>
            <form className="details-grid" onSubmit={(e) => saveSchedule(e, node)}>
              <label>
                Datum
                <input type="date" value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)} />
              </label>
              <label>
                Uhrzeit
                <input type="time" value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)} />
              </label>
              <label>
                Vorlauf (Min.)
                <input type="number" min="0" step="5" value={leadMinutes}
                  onChange={(e) => setLeadMinutes(e.target.value)} />
              </label>
              <button type="submit" className="btn-primary btn-sm">Speichern</button>
              {node.scheduled_date && (
                <button type="button" className="btn-ghost btn-sm"
                  onClick={() => clearSchedule(node)}>
                  Zeit entfernen
                </button>
              )}
            </form>

            <p className="faint">
              <Link2 size={13} /> Voraussetzungen — müssen vorher erledigt sein
            </p>
            {depIds.length > 0 && (
              <div className="dep-chips">
                {depIds.map((depId) => {
                  const dep = allStepById.get(depId)
                  if (!dep) return null
                  const foreignGoal =
                    dep.goal_id !== goalId ? goalTitleById.get(dep.goal_id) : null
                  return (
                    <span key={depId} className="chip">
                      <span className={dep.is_done ? 'done-text' : ''}>{dep.title}</span>
                      {foreignGoal && <span className="faint">· {foreignGoal}</span>}
                      <button className="icon-btn" style={{ padding: '0 2px' }}
                        title="Abhängigkeit entfernen"
                        onClick={() => removeDependency(node, depId)}>
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              value={depQuery}
              onChange={(e) => setDepQuery(e.target.value)}
              placeholder="Schritt suchen — auch aus anderen Zielen …"
            />
            {depQuery.trim() && (
              <ul className="dep-results">
                {allSteps
                  .filter(
                    (s) =>
                      s.id !== node.id &&
                      !depIds.includes(s.id) &&
                      s.title.toLowerCase().includes(depQuery.trim().toLowerCase())
                  )
                  .slice(0, 8)
                  .map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => addDependency(node, s)}>
                        {s.title}
                        <span className="faint"> · {goalTitleById.get(s.goal_id)}</span>
                        {s.is_done && <span className="faint"> · erledigt</span>}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
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
        <Link to="/ziele"><TreePine size={14} /> Ziele</Link>
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
            {goal.status === 'completed' && (
              <span className="chip focus"><Mountain /> Abgeschlossen</span>
            )}
          </div>
          {goal.description && <p className="muted">{goal.description}</p>}
          {goal.target_date && (
            <p className="faint">
              <CalendarDays size={13} /> Zieldatum: {formatDate(goal.target_date)}
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
              <span className="chip clarify"><TriangleAlert /> Braucht Klärung</span>
            )}
          </div>
        </header>
      )}

      {needsClarification && !focusNode && (
        <div className="hint">
          <Compass size={18} />
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
        <button type="submit" className="btn-primary"><Plus size={16} /></button>
      </form>

      {!focusNode && (
        <div className="section-gap" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {goal.status === 'active' ? (
            <button className="btn-ghost" onClick={() => setGoalStatus('completed')}>
              <Mountain size={15} /> Ziel abschließen
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setGoalStatus('active')}>
              <Undo2 size={15} /> Wieder aktivieren
            </button>
          )}
          <button className="btn-danger" onClick={deleteGoal}>Ziel löschen</button>
        </div>
      )}
    </>
  )
}
