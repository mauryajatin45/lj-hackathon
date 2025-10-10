import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

// Inline SVG icons (clean + scalable)
const IconDashboard = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v4h8V3h-8z" fill="currentColor" />
  </svg>
)
const IconHistory = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M13 3a9 9 0 1 1-9 9H1l3.7-3.7L8 12H5a7 7 0 1 0 7-7zm-1 4h2v5h4v2h-6V7z" fill="currentColor" />
  </svg>
)
const IconSettings = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M19.1 12.9c.1-.3.1-.6.1-.9s0-.6-.1-.9l2-1.6c.2-.2.2-.5.1-.7l-1.9-3.3c-.1-.2-.4-.3-.7-.2l-2.4 1c-.5-.4-1-.7-1.6-.9l-.4-2.5c0-.3-.3-.5-.6-.5h-3.8c-.3 0-.5.2-.6.5l-.4 2.5c-.6.2-1.1.5-1.6.9l-2.4-1c-.3-.1-.6 0-.7.2L2.8 7c-.1.2 0 .5.1.7l2 1.6c-.1.3-.1.6-.1.9s0 .6.1.9L2.9 12.7c-.2.2-.2.5-.1.7l1.9 3.3c.1.2.4.3.7.2l2.4-1c.5.4 1 .7 1.6.9l.4 2.5c0 .3.3.5.6.5h3.8c.3 0 .5-.2.6-.5l.4-2.5c.6-.2 1.1-.5 1.6-.9l2.4 1c.3.1.6 0 .7-.2l1.9-3.3c.1-.2.1-.5-.1-.7l-1.9-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
  </svg>
)

const NAV = [
  {
    path: '/app/dashboard',
    label: 'Dashboard',
    Icon: IconDashboard,
    description: 'Overview and analytics'
  },
  {
    path: '/app/history',
    label: 'History',
    Icon: IconHistory,
    description: 'View past submissions'
  },
  {
    path: '/app/settings',
    label: 'Settings',
    Icon: IconSettings,
    description: 'Account preferences'
  }
]

const cx = (...a) => a.filter(Boolean).join(' ')

export default function Sidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sentinel_sidebar_collapsed')) || false } catch { return false }
  })

  useEffect(() => {
    localStorage.setItem('sentinel_sidebar_collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  // Mark active even for nested routes (e.g., /history/123)
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  return (
    <aside className={cx('sidebar', collapsed && 'sidebar--collapsed')} role="navigation" aria-label="Primary">
      {/* Brand */}
      <div className="sidebar-brand enhanced">
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          type="button"
        >
          Sentinel
        </button>
      </div>


      {/* Nav */}
      <nav className="sidebar-nav enhanced">
        {NAV.map(({ path, label, Icon }) => (
          <Link
            key={path}
            to={path}
            className={cx('sidebar-nav-item', 'sidebar-item', isActive(path) && 'active')}
            aria-current={isActive(path) ? 'page' : undefined}
            title={collapsed ? label : undefined}
          >
            <span className="sidebar-item-icon"><Icon /></span>
            <span className="sidebar-item-label">{label}</span>
            {isActive(path) && <span className="sidebar-active-dot" aria-hidden="true" />}
          </Link>
        ))}
      </nav>

      {/* Footer
      <div className="sidebar-footer">
        <a
          className="sidebar-help"
          href="#"
          onClick={(e) => e.preventDefault()}
          title={collapsed ? 'Help & Docs' : undefined}
        >
          <span className="help-dot" aria-hidden="true" />
          <span className="help-label">Help & Docs</span>
        </a>
      </div> */}
    </aside>
  )
}
