import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  ClockIcon, 
  CogIcon, 
  ChevronLeftIcon,
  ShieldCheckIcon
} from 'lucide-react'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: HomeIcon,
    description: 'Overview and analytics'
  },
  { 
    name: 'History', 
    href: '/history', 
    icon: ClockIcon,
    description: 'View past submissions'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: CogIcon,
    description: 'Account preferences'
  }
]

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('sentinel_sidebar_collapsed')) || false 
    } catch { 
      return false 
    }
  })

  useEffect(() => {
    localStorage.setItem('sentinel_sidebar_collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } flex flex-col h-screen sticky top-0`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sentinel</h1>
              <p className="text-xs text-gray-500">Security Dashboard</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeftIcon className={`w-4 h-4 text-gray-500 transition-transform ${
            collapsed ? 'rotate-180' : ''
          }`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${
                active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              }`} />
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {active && !collapsed && (
                <div className="w-2 h-2 bg-primary-600 rounded-full ml-auto" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className={`text-xs text-gray-500 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'v1.0' : 'Version 1.0.0'}
        </div>
      </div>
    </div>
  )
}