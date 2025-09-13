import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToastContext } from '../layouts/AppLayout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import RiskBadge from '../../components/RiskBadge.jsx'
import TimestampChips from '../../components/TimestampChips.jsx'
import { getSubmission } from '../../api/submissions.js'
import { formatDate, formatBytes } from '../../utils/format.js'

export default function SubmissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubmission()
  }, [id])

  const loadSubmission = async () => {
    try {
      setLoading(true)
      const result = await getSubmission(id)
      setSubmission(result)
    } catch (error) {
      console.error('Failed to load submission:', error)
      toast.error('Failed to load submission details')
      navigate('/history')
    } finally {
      setLoading(false)
    }
  }

  const copyReport = () => {
    if (!submission?.report) return
    
    const report = submission.report
    const text = `Submission Analysis Report
ID: ${submission.id}
Date: ${formatDate(submission.createdAt)}
Channel: ${submission.channel.toUpperCase()}
Risk Score: ${(report.riskScore * 100).toFixed(0)}%
Suspicious: ${report.suspicious ? 'Yes' : 'No'}
Reasons: ${report.reasons?.join(', ') || 'None'}
${report.timestamps?.length ? `Timestamps: ${report.timestamps.map(t => `${t.start}s-${t.end}s`).join(', ')}` : ''}`
    
    navigator.clipboard.writeText(text)
    toast.success('Report copied to clipboard')
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Loading submission details...
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="text-center">
        <h2>Submission Not Found</h2>
        <p className="text-muted mb-3">
          The submission you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/history')}>
          ← Back to History
        </Button>
      </div>
    )
  }

  const getFileIcon = (attachment) => {
    const icons = {
      image: '🖼️',
      video: '🎥',
      document: '📄',
      audio: '🎵'
    }
    return icons[attachment.type] || '📎'
  }

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/history')}>
            ← Back
          </Button>
          <div>
            <h1 className="page-title">Submission Details</h1>
            <p className="text-muted">#{submission.id}</p>
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: 'var(--spacing-lg)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
      }}>
        {/* Summary */}
        <Card title="Summary" style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--spacing-lg)'
          }}>
            <div>
              <div className="text-sm text-muted mb-1">Submitted</div>
              <div>{formatDate(submission.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Channel</div>
              <div>{submission.channel.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Risk Assessment</div>
              <div>
                {submission.report ? (
                  <RiskBadge score={submission.report.riskScore} />
                ) : (
                  <span className="text-muted">Analyzing...</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted mb-1">Suspicious</div>
              <div>
                {submission.report ? (
                  <span className={`badge ${submission.report.suspicious ? 'badge-high' : 'badge-success'}`}>
                    {submission.report.suspicious ? 'YES' : 'NO'}
                  </span>
                ) : (
                  <span className="text-muted">Analyzing...</span>
                )}
              </div>
            </div>
          </div>
          
          {submission.report && (
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={copyReport}>
                📋 Copy Report
              </Button>
            </div>
          )}
        </Card>

        {/* Content */}
        {submission.textPreview && (
          <Card title="Text Content" style={{ gridColumn: '1 / -1' }}>
            <div style={{ 
              background: 'var(--color-surface)',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}>
              {submission.textPreview}
            </div>
            
            {/* Metadata */}
            {(submission.sender || submission.subject) && (
              <div className="mt-3" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius)'
              }}>
                {submission.sender && (
                  <div>
                    <div className="text-sm text-muted">Sender</div>
                    <div className="text-sm">{submission.sender}</div>
                  </div>
                )}
                {submission.subject && (
                  <div>
                    <div className="text-sm text-muted">Subject</div>
                    <div className="text-sm">{submission.subject}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Attachments */}
        {submission.attachments && submission.attachments.length > 0 && (
          <Card title="Files">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {submission.attachments.map((attachment, index) => (
                <div 
                  key={index}
                  style={{ 
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-surface)'
                  }}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <span style={{ fontSize: '24px' }}>{getFileIcon(attachment)}</span>
                    <div style={{ flex: 1 }}>
                      <div className="font-weight-500">{attachment.name}</div>
                      <div className="text-sm text-muted">
                        {attachment.type.toUpperCase()}
                        {attachment.size && ` • ${formatBytes(attachment.size)}`}
                      </div>
                    </div>
                  </div>
                  
                  {attachment.url && (
                    <div>
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        🔗 View File
                      </a>
                    </div>
                  )}

                  {/* Simple media preview for images */}
                  {attachment.type === 'image' && attachment.url && (
                    <div className="mt-3">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          borderRadius: 'var(--radius)',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Analysis Results */}
        {submission.report && (
          <>
            {/* Risk Factors */}
            {submission.report.reasons && submission.report.reasons.length > 0 && (
              <Card title="Risk Factors">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {submission.report.reasons.map((reason, index) => (
                    <div 
                      key={index}
                      style={{ 
                        padding: 'var(--spacing-sm)',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--color-danger)'
                      }}
                    >
                      ⚠️ {reason}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Timestamps */}
            {submission.report.timestamps && submission.report.timestamps.length > 0 && (
              <Card title="Timeline Markers">
                <div className="mb-2">
                  <div className="text-sm text-muted mb-3">
                    Suspicious content detected at these timestamps:
                  </div>
                  <TimestampChips timestamps={submission.report.timestamps} />
                </div>
                
                <div className="text-sm text-muted mt-3">
                  <strong>Note:</strong> Timestamps indicate segments in audio/video content where potentially suspicious material was detected.
                </div>
              </Card>
            )}
          </>
        )}

        {/* No Analysis Yet */}
        {!submission.report && (
          <Card title="Analysis Status" style={{ gridColumn: '1 / -1' }}>
            <div className="text-center">
              <div className="text-lg mb-2">🔄</div>
              <p className="text-muted">
                Analysis is in progress. Results will appear here when ready.
              </p>
              <div className="text-sm text-muted">
                This usually takes a few seconds to a few minutes depending on content type and size.
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}