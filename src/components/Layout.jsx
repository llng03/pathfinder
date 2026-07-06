import { NavLink } from 'react-router-dom'
import foxIcon from '../assets/foxIcon.png'

const NAV_ITEMS = [
  { to: '/', label: 'Heute', icon: '☀️', end: true },
  { to: '/ziele', label: 'Ziele', icon: '🌲' },
  { to: '/sprint', label: 'Sprint', icon: '🧭' },
  { to: '/ideen', label: 'Ideen', icon: '💡' },
  { to: '/gewohnheiten', label: 'Routinen', icon: '🔁' },
  { to: '/erfolge', label: 'Erfolge', icon: '✨' },
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
            <span className="nav-icon" aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main">{children}</main>
    </div>
  )
}
