import { Check } from 'lucide-react'

export default function CheckButton({ done, onToggle, title }) {
  return (
    <button
      type="button"
      className={`check${done ? ' done' : ''}`}
      onClick={onToggle}
      aria-pressed={done}
      title={title ?? (done ? 'Als offen markieren' : 'Als erledigt markieren')}
    >
      <Check size={15} strokeWidth={3.2} />
    </button>
  )
}
