export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-card card">
        <div className="card-header text-center">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-primary)',
              fontSize: '24px'
            }}>
              🛡️
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Sentinel
              </h1>
            </div>
          </div>
          <p style={{ 
            color: 'var(--color-text-muted)', 
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-medium)',
            margin: 0
          }}>
            Content Security Dashboard
          </p>
        </div>
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}