export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-card card">
        <div className="card-header text-center">
          <h1>🛡️ Sentinel</h1>
          <p className="text-muted">Content Security Dashboard</p>
        </div>
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}