import { NavLink } from 'react-router-dom'
import { Sun, TreePine, Compass, Lightbulb, Repeat, Sparkles } from 'lucide-react'
import foxIcon from '../assets/foxIcon.png'

const NAV_ITEMS = [
  { to: '/', label: 'Heute', icon: Sun, end: true },
  { to: '/ziele', label: 'Ziele', icon: TreePine },
  { to: '/sprint', label: 'Sprint', icon: Compass },
  { to: '/ideen', label: 'Ideen', icon: Lightbulb },
  { to: '/gewohnheiten', label: 'Routinen', icon: Repeat },
  { to: '/erfolge', label: 'Erfolge', icon: Sparkles },
]

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="nav-brand">
          <img src={foxIcon} alt="Pathfinder Fuchs" />
          <div>
            <strong>Pathfinder</strong>
            <span>Your little guide through the big woods</span>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <span className="nav-icon" aria-hidden>
              <item.icon size={20} strokeWidth={1.8} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main">{children}</main>
    </div>
  )
}
