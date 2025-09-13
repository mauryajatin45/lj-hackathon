import { useAuth } from '../context/AuthContext.jsx'
import Dropdown from './Dropdown.jsx'

export default function TopBar() {
  const { user, logout } = useAuth()

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>Sentinel</h1>
      </div>
      
      <div className="topbar-user">
        <Dropdown
          trigger={
            <button className="btn btn-secondary">
              {user?.email} ▾
            </button>
          }
        >
          <div className="dropdown-item" style={{ padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}>
            {user?.email}
          </div>
          <button 
            className="dropdown-item"
            onClick={logout}
          >
            Sign out
          </button>
        </Dropdown>
      </div>
    </div>
  )
}