import { useEffect, useRef, useState } from 'react'
import { EllipsisVertical } from 'lucide-react'

// Overflow-Menü für Zeilen-Aktionen: ein einzelner ⋮-Button statt vieler
// Icons nebeneinander. actions: [{ icon, label, onClick, danger }]
export default function RowMenu({ actions, label = 'Aktionen' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className="row-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <EllipsisVertical size={16} />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {actions.map(({ icon: Icon, label: text, onClick, danger }) => (
            <button
              key={text}
              type="button"
              role="menuitem"
              className={danger ? 'danger' : undefined}
              onClick={() => {
                setOpen(false)
                onClick()
              }}
            >
              <Icon size={14} /> {text}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
