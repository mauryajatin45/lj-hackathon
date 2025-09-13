import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/history', label: 'History', icon: '📚' },
  { path: '/settings', label: 'Settings', icon: '⚙️' }
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        🛡️ Sentinel
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span style={{ marginRight: '8px' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}