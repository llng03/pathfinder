export default function CheckButton({ done, onToggle, title }) {
  return (
    <button
      type="button"
      className={`check${done ? ' done' : ''}`}
      onClick={onToggle}
      aria-pressed={done}
      title={title ?? (done ? 'Als offen markieren' : 'Als erledigt markieren')}
    >
      ✓
    </button>
  )
}
