import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToastContext } from '../layouts/AppLayout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'

export default function Settings() {
  const { user, logout } = useAuth()
  const toast = useToastContext()
  const [settings, setSettings] = useState({
    liveUpdates: true,
    theme: 'light'
  })

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Mock saving settings
    toast.success('Settings saved')
  }

  const handleSignOut = () => {
    logout()
    toast.success('Signed out successfully')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="text-muted">Manage your account and application preferences</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: 'var(--spacing-lg)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
      }}>
        {/* Profile */}
        <Card title="Profile">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email"
              value={user?.email || ''}
              disabled
              className="form-input"
              style={{ backgroundColor: 'var(--color-surface)' }}
            />
            <div className="text-sm text-muted mt-1">
              Your email address cannot be changed
            </div>
          </div>
        </Card>

        {/* Real-time Updates */}
        <Card title="Real-time Updates">
          <div className="form-group">
            <label className="d-flex align-items-center gap-2">
              <input 
                type="checkbox"
                checked={settings.liveUpdates}
                onChange={(e) => handleSettingChange('liveUpdates', e.target.checked)}
              />
              <span>Enable live updates (SSE)</span>
            </label>
            <div className="text-sm text-muted mt-1">
              Receive real-time notifications when analysis reports are ready
            </div>
          </div>
        </Card>

        {/* Theme */}
        <Card title="Appearance">
          <div className="form-group">
            <label className="form-label">Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              className="form-select"
            >
              <option value="light">Light</option>
              <option value="dark">Dark (Coming Soon)</option>
            </select>
            <div className="text-sm text-muted mt-1">
              Dark theme will be available in a future update
            </div>
          </div>
        </Card>

        {/* System Info */}
        <Card title="System Information">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Database:</span>
              <span>MongoDB</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">File Storage:</span>
              <span>AWS S3</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Real-time Updates:</span>
              <span>Server-Sent Events</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Version:</span>
              <span>1.0.0</span>
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card title="Account">
          <div className="text-center">
            <p className="text-muted mb-3">
              Need to sign out of your account?
            </p>
            <Button 
              variant="danger"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}