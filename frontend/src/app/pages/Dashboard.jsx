import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToastContext } from '../layouts/AppLayout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import Dropdown from '../../components/Dropdown.jsx'
import TextSubmitDialog from '../../components/TextSubmitDialog.jsx'
import FileSubmitDialog from '../../components/FileSubmitDialog.jsx'
import SSEStatusPill from '../../components/SSEStatusPill.jsx'
import RiskBadge from '../../components/RiskBadge.jsx'
import { sseConnection } from '../../api/sse.js'
import { submitText, submitFile, getSubmissions } from '../../api/submissions.js'
import { formatDate } from '../../utils/format.js'

export default function Dashboard() {
  const { token } = useAuth()
  const toast = useToastContext()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [sseStatus, setSSEStatus] = useState('disconnected')
  const [liveUpdates, setLiveUpdates] = useState([])
  const [recentReports, setRecentReports] = useState([])

  const loadRecentReports = async () => {
    try {
      const result = await getSubmissions({ limit: 5 })
      const reports = result.submissions
        .filter(s => s.report)
        .map(s => ({
          id: s._id,
          timestamp: s.createdAt,
          riskScore: s.report.riskScore,
          suspicious: s.report.suspicious,
          reasons: s.report.reasons
        }))
      setRecentReports(reports)
    } catch (error) {
      console.error('Failed to load recent reports:', error)
    }
  }

  useEffect(() => {
    loadRecentReports()
    let hasShownConnectionToast = false

    // Connect to SSE only if not already connected
    if (sseStatus === 'disconnected') {
      sseConnection.connect(token)
    }

    // Listen for connection status
    const handleConnection = (data) => {
      setSSEStatus(data.status)
      if (data.status === 'connected' && !hasShownConnectionToast) {
        hasShownConnectionToast = true
        toast.success('Live updates connected')
      } else if (data.status === 'error') {
        hasShownConnectionToast = false
        toast.error('Live updates disconnected')
      }
    }

    sseConnection.on('connection', handleConnection)

    // Listen for submission events
    sseConnection.on('submission_created', (data) => {
      addLiveUpdate({
        type: 'submission_created',
        submissionId: data.submissionId,
        timestamp: data.createdAt,
        message: 'New submission received'
      })
    })

    sseConnection.on('analysis_started', (data) => {
      addLiveUpdate({
        type: 'analysis_started',
        submissionId: data.submissionId,
        timestamp: new Date().toISOString(),
        message: 'Analysis started'
      })
    })

    sseConnection.on('analysis_update', (data) => {
      addLiveUpdate({
        type: 'analysis_update',
        submissionId: data.submissionId,
        timestamp: new Date().toISOString(),
        message: `Analysis progress: ${data.progress || 'Processing...'}`,
        note: data.note
      })
    })

    sseConnection.on('report_ready', (data) => {
      const riskLevel = data.riskScore < 0.3 ? 'Low' : data.riskScore < 0.7 ? 'Medium' : 'High'
      
      addLiveUpdate({
        type: 'report_ready',
        submissionId: data.submissionId,
        timestamp: new Date().toISOString(),
        message: `Report ready • Risk ${(data.riskScore * 100).toFixed(0)}% (${riskLevel})`,
        riskScore: data.riskScore,
        suspicious: data.suspicious,
        reasons: data.reasons,
        timestamps: data.timestamps
      })

      // Add to recent reports
      setRecentReports(prev => {
        const updated = [{
          id: data.submissionId,
          timestamp: new Date().toISOString(),
          riskScore: data.riskScore,
          suspicious: data.suspicious,
          reasons: data.reasons
        }, ...prev]
        return updated.slice(0, 5) // Keep only latest 5
      })

      if (data.suspicious) {
        toast.warning(`Suspicious content detected! Risk ${(data.riskScore * 100).toFixed(0)}% (${riskLevel})`)
      } else {
        toast.success(`Report ready • Risk ${(data.riskScore * 100).toFixed(0)}% (${riskLevel})`)
      }
    })

    sseConnection.on('error', (data) => {
      addLiveUpdate({
        type: 'error',
        submissionId: data.submissionId,
        timestamp: new Date().toISOString(),
        message: `Analysis error: ${data.message}`,
        error: true
      })
      toast.error(`Analysis error: ${data.message}`)
    })

    return () => {
      sseConnection.off('connection', handleConnection)
      // Don't disconnect here as other components might be using the connection
    }
  }, [token, toast])

  const addLiveUpdate = (update) => {
    setLiveUpdates(prev => {
      const updated = [update, ...prev]
      return updated.slice(0, 10) // Keep only latest 10 updates
    })
  }

  const handleTextSubmit = async (data) => {
    try {
      const result = await submitText(data)
      toast.success('Text submitted successfully. We\'ll update this in real time.')
      setIsDropdownOpen(false)
      return result
    } catch (error) {
      throw error
    }
  }

  const handleFileSubmit = async (file, type) => {
    try {
      const result = await submitFile(file, type)
      toast.success('File uploaded successfully. We\'ll analyze it and notify you.')
      setIsDropdownOpen(false)
      return result
    } catch (error) {
      throw error
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: 'var(--spacing-lg)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        marginBottom: 'var(--spacing-xl)',
      }}>
        {/* Primary Action */}
        <Card title="Submit for Analysis" style={{ gridColumn: '1 / -1', height:'50vh' }}>
          <div className="text-center">
            <p className="text-muted mb-4">
              Submit suspicious content for automated security analysis
            </p>
            
            <Dropdown 
              isOpen={isDropdownOpen}
              onToggle={setIsDropdownOpen}
              trigger={
                <Button size="lg" className="btn-primary">
                  📤 Add / Check Something Suspicious
                </Button>
              }
            >
              <button 
                className="dropdown-item"
                onClick={() => {
                  setTextDialogOpen(true)
                  setIsDropdownOpen(false)
                }}
              >
                📱 Submit SMS/Email text
              </button>
              <button 
                className="dropdown-item"
                onClick={() => {
                  setFileDialogOpen(true)
                  setIsDropdownOpen(false)
                }}
              >
                📎 Submit image, video, document, or audio
              </button>
            </Dropdown>
          </div>
        </Card>

        {/* Live Updates */}
        <Card title="Live Updates">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="text-muted">Real-time analysis updates</span>
            <SSEStatusPill status={sseStatus} />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {liveUpdates.length === 0 ? (
              <p className="text-muted text-center">
                No recent updates. Submit content to see live analysis.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {liveUpdates.map((update, index) => (
                  <div 
                    key={`${update.submissionId}-${update.timestamp}-${index}`}
                    style={{ 
                      padding: 'var(--spacing-sm)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: 'var(--radius)',
                      backgroundColor: update.error ? 'rgba(220, 38, 38, 0.05)' : 'var(--color-surface)'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div className="text-sm">
                        <strong>#{update.submissionId.slice(-8)}</strong>
                      </div>
                      <div className="text-sm text-muted">
                        {formatDate(update.timestamp)}
                      </div>
                    </div>
                    <div className="text-sm">
                      {update.message}
                      {update.riskScore !== undefined && (
                        <div className="mt-1">
                          <RiskBadge score={update.riskScore} />
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <Link 
                        to="/history" 
                        className="text-sm"
                        style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                      >
                        View in History →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Reports */}
        <Card title="Recent Reports">
          {recentReports.length === 0 ? (
            <p className="text-muted text-center">
              No reports yet. Submit content for analysis to see results here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '400px', overflowY: 'auto' }}>
              {recentReports.map((report, index) => (
                <div 
                  key={`${report.id}-${index}`}
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="text-sm">
                      <strong>#{report.id.slice(-8)}</strong>
                    </div>
                    <RiskBadge score={report.riskScore} />
                  </div>
                  <div className="text-sm mb-1">
                    <strong>Suspicious:</strong> {report.suspicious ? 'Yes' : 'No'}
                  </div>
                  {report.reasons && report.reasons.length > 0 && (
                    <div className="text-sm text-muted">
                      {report.reasons[0]}{report.reasons.length > 1 && ` (+${report.reasons.length - 1} more)`}
                    </div>
                  )}
                  <div className="mt-2">
                    <Link 
                      to={`/submissions/${report.id}`}
                      className="text-sm"
                      style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-3 text-center">
            <Link 
              to="/history" 
              className="btn btn-secondary btn-sm"
            >
              📚 View Complete History ({recentReports.length > 0 ? 'All Submissions' : 'Get Started'})
            </Link>
          </div>
        </Card>
      </div>

      {/* Dialogs */}
      <TextSubmitDialog 
        isOpen={textDialogOpen}
        onClose={() => setTextDialogOpen(false)}
        onSubmit={handleTextSubmit}
      />
      
      <FileSubmitDialog 
        isOpen={fileDialogOpen}
        onClose={() => setFileDialogOpen(false)}
        onSubmit={handleFileSubmit}
      />
    </div>
  )
}