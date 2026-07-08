import { useState } from 'react'
import { CalendarClock, Link2 } from 'lucide-react'
import { formatSchedule, scheduleState, unmetDependencies } from '../lib/availability'

// Kompakte Icon-Badges unter dem Schritt-Titel: Zeitbindung + Abhängigkeiten.
// Desktop: Tooltip per title-Attribut. Mobile: Tap klappt den Text inline
// aus, erneuter Tap schließt ihn wieder.
// ctx = { depsByStep, stepById, now } (siehe lib/availability.js)
export default function StepBadges({ step, ctx }) {
  const [expanded, setExpanded] = useState(null) // 'time' | 'deps' | null

  if (step.is_done) return null
  const state = scheduleState(step, ctx.now)
  const waiting = unmetDependencies(step, ctx)
  if (state === 'none' && waiting.length === 0) return null

  const timeText =
    state === 'missed' ? `verpasst · ${formatSchedule(step)}` : formatSchedule(step)
  const depsText = `wartet auf: ${waiting.map((s) => s.title).join(', ')}`
  const toggle = (key) => setExpanded((e) => (e === key ? null : key))

  return (
    <span className="row-badges">
      {state !== 'none' && (
        <button
          type="button"
          className={`badge-icon${state === 'missed' ? ' missed' : ''}${state === 'due' ? ' due' : ''}`}
          title={timeText}
          aria-expanded={expanded === 'time'}
          onClick={() => toggle('time')}
        >
          <CalendarClock size={13} />
          {expanded === 'time' && <span>{timeText}</span>}
        </button>
      )}
      {waiting.length > 0 && (
        <button
          type="button"
          className="badge-icon"
          title={depsText}
          aria-expanded={expanded === 'deps'}
          onClick={() => toggle('deps')}
        >
          <Link2 size={13} />
          {expanded === 'deps' && <span>{depsText}</span>}
        </button>
      )}
    </span>
  )
}
