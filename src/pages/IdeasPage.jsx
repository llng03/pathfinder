import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Sprout, Leaf, Undo2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { recordActivity, awardBadge, badgeToastText } from '../lib/gamification'
import { useToast } from '../context/ToastContext.jsx'

export default function IdeasPage() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [reflectionDrafts, setReflectionDrafts] = useState({})
  const showToast = useToast()
  const navigate = useNavigate()

  async function load() {
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })
    setIdeas(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addIdea(e) {
    e.preventDefault()
    if (!title.trim()) return
    const { error } = await supabase
      .from('ideas')
      .insert({ title: title.trim(), note: note.trim() || null })
    if (error) {
      showToast('Speichern fehlgeschlagen')
      return
    }
    setTitle('')
    setNote('')
    await load()
    const newBadges = await recordActivity()
    newBadges.forEach((k) => showToast(badgeToastText(k)))
  }

  async function saveReflection(idea) {
    const draft = reflectionDrafts[idea.id]
    if (draft === undefined || draft === (idea.reflection ?? '')) return
    await supabase
      .from('ideas')
      .update({ reflection: draft.trim() || null })
      .eq('id', idea.id)
    await load()
  }

  async function convertToGoal(idea) {
    // Idee "befördern": Ziel anlegen und Idee als konvertiert markieren
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({ title: idea.title, description: idea.note, idea_id: idea.id })
      .select()
      .single()
    if (error) {
      showToast('Konnte kein Ziel anlegen')
      return
    }
    await supabase.from('ideas').update({ status: 'converted' }).eq('id', idea.id)
    const badge = await awardBadge('first_goal')
    if (badge) showToast(badgeToastText(badge))
    await recordActivity()
    navigate(`/ziele/${goal.id}`)
  }

  async function discardIdea(idea) {
    await supabase.from('ideas').update({ status: 'discarded' }).eq('id', idea.id)
    await load()
  }

  async function reopenIdea(idea) {
    await supabase.from('ideas').update({ status: 'open' }).eq('id', idea.id)
    await load()
  }

  async function deleteIdea(idea) {
    if (!confirm(`Idee „${idea.title}" endgültig löschen?`)) return
    await supabase.from('ideas').delete().eq('id', idea.id)
    await load()
  }

  const openIdeas = ideas.filter((i) => i.status === 'open')
  const archivedIdeas = ideas.filter((i) => i.status !== 'open')

  if (loading) return <div className="spinner-center">Lade Ideenpool …</div>

  return (
    <>
      <header className="page-header">
        <div>
          <h1><Lightbulb size={22} /> Ideenpool</h1>
          <p className="page-sub">Parkplatz für alles, was (noch) kein Ziel ist</p>
        </div>
      </header>

      <form className="card" onSubmit={addIdea}>
        <div className="form-row">
          <label htmlFor="idea-title">Neue Idee</label>
          <input
            id="idea-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was geht dir durch den Kopf?"
            required
          />
        </div>
        <div className="form-row">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optionale Notiz …"
            rows={2}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Idee festhalten</button>
        </div>
      </form>

      {openIdeas.length === 0 && (
        <div className="empty-state">
          Dein Ideenpool ist leer.<br />
          Halte spontane Einfälle hier fest — ganz unverbindlich.
        </div>
      )}

      {openIdeas.map((idea) => (
        <div className="card" key={idea.id}>
          <div className="card-title-row">
            <h3>{idea.title}</h3>
            <span className="faint">{idea.created_at.slice(0, 10)}</span>
          </div>
          {idea.note && <p className="muted">{idea.note}</p>}
          <div className="form-row" style={{ marginTop: '0.6rem' }}>
            <label htmlFor={`refl-${idea.id}`}>Warum jetzt (nicht)? — Relevanz / Zeitaufwand</label>
            <textarea
              id={`refl-${idea.id}`}
              rows={2}
              value={reflectionDrafts[idea.id] ?? idea.reflection ?? ''}
              onChange={(e) =>
                setReflectionDrafts((d) => ({ ...d, [idea.id]: e.target.value }))
              }
              onBlur={() => saveReflection(idea)}
              placeholder="Kurze Reflexion …"
            />
          </div>
          <div className="form-actions">
            <button className="btn-danger btn-sm" onClick={() => discardIdea(idea)}>
              Verwerfen
            </button>
            <button className="btn-primary btn-sm" onClick={() => convertToGoal(idea)}>
              <Sprout size={14} /> Zu Ziel machen
            </button>
          </div>
        </div>
      ))}

      {archivedIdeas.length > 0 && (
        <div className="section-gap">
          <button className="btn-ghost btn-sm" onClick={() => setShowArchive(!showArchive)}>
            {showArchive ? '▾' : '▸'} Verworfen & umgesetzt ({archivedIdeas.length})
          </button>
          {showArchive &&
            archivedIdeas.map((idea) => (
              <div className="card" key={idea.id} style={{ opacity: 0.65 }}>
                <div className="card-title-row">
                  <span>
                    {idea.status === 'converted'
                      ? <Sprout size={14} />
                      : <Leaf size={14} />}{' '}
                    {idea.title}
                  </span>
                  <span style={{ display: 'flex', gap: '4px' }}>
                    {idea.status === 'discarded' && (
                      <button className="icon-btn" title="Wieder aufnehmen" onClick={() => reopenIdea(idea)}>
                        <Undo2 size={15} />
                      </button>
                    )}
                    <button className="icon-btn" title="Löschen" onClick={() => deleteIdea(idea)}>
                      <Trash2 size={15} />
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
