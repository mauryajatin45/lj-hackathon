import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import RiskBadge from './RiskBadge.jsx'
import TimestampChips from './TimestampChips.jsx'
import { getSubmission } from '../api/submissions.js'
import { formatDate, formatBytes, truncateText } from '../utils/format.js'

export default function SubmissionDetailsDialog({ isOpen, onClose, submissionId }) {
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && submissionId) {
      loadSubmission()
    }
  }, [isOpen, submissionId])

  const loadSubmission = async () => {
    if (!submissionId) return

    setLoading(true)
    setError('')

    try {
      const data = await getSubmission(submissionId)
      setSubmission(data)
    } catch (err) {
      setError(err.message || 'Failed to load submission details')
      console.error('Failed to load submission:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSubmission(null)
    setError('')
    onClose()
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

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="text-lg mb-2">🔄</div>
          <div>Loading submission details...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="text-lg mb-2" style={{ color: 'var(--color-danger)' }}>❌</div>
          <div>{error}</div>
        </div>
      )
    }

    if (!submission) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>No submission data available</div>
        </div>
      )
    }

    return (
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Header Info */}
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-2">
            <h4 className="mb-0">Submission #{(submission.id || submission._id || '').slice(-8)}</h4>
            <span className={`badge ${submission.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
              {submission.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="text-sm text-muted">
            Created: {formatDate(submission.createdAt)}
          </div>
        </div>

        {/* Basic Info */}
        <div className="mb-4">
          <div className="row">
            <div className="col-md-6">
              <div className="form-group mb-3">
                <label className="form-label">Channel</label>
                <div className="text-sm">{submission.channel?.toUpperCase()}</div>
              </div>
            </div>
            {submission.sender && (
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Sender</label>
                  <div className="text-sm">{submission.sender}</div>
                </div>
              </div>
            )}
          </div>

          {submission.subject && (
            <div className="form-group mb-3">
              <label className="form-label">Subject</label>
              <div className="text-sm">{submission.subject}</div>
            </div>
          )}
        </div>

        {/* Content */}
        {submission.contentText && (
          <div className="form-group mb-4">
            <label className="form-label">Content</label>
            <div className="text-sm" style={{
              backgroundColor: 'var(--color-background-secondary)',
              padding: '1rem',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {submission.contentText}
            </div>
          </div>
        )}

        {/* Attachments */}
        {submission.attachments && submission.attachments.length > 0 && (
          <div className="form-group mb-4">
            <label className="form-label">Attachments</label>
            <div className="d-flex flex-wrap gap-2">
              {submission.attachments.map((attachment, index) => (
                <div key={index} className="d-flex align-items-center gap-2 p-2 border rounded"
                     style={{ backgroundColor: 'var(--color-background-secondary)' }}>
                  <span style={{ fontSize: '18px' }}>{getFileIcon(attachment)}</span>
                  <div>
                    <div className="text-sm font-weight-500">{attachment.originalName || 'Unnamed file'}</div>
                    <div className="text-xs text-muted">
                      {formatBytes(attachment.size)} • {attachment.type}
                    </div>
                  </div>
                  {attachment.url && (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm"
                      style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Report */}
        {submission.report && (
          <div className="form-group mb-4">
            <label className="form-label">Analysis Report</label>
            <div className="p-3 border rounded" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className={`badge ${submission.report.suspicious ? 'badge-high' : 'badge-success'}`}>
                  {submission.report.suspicious ? 'SUSPICIOUS' : 'SAFE'}
                </span>
                <RiskBadge score={submission.report.riskScore} />
              </div>

              {submission.report.reasons && submission.report.reasons.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-weight-500 mb-1">Reasons:</div>
                  <ul className="text-sm">
                    {submission.report.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {submission.report.timestamps && (
                <div>
                  <div className="text-sm font-weight-500 mb-1">Timeline:</div>
                  <TimestampChips timestamps={submission.report.timestamps} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Info */}
        {submission.lastError && (
          <div className="form-group mb-4">
            <label className="form-label">Last Error</label>
            <div className="text-sm text-danger">{submission.lastError}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submission Details"
      size="large"
      footer={
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      }
    >
      {renderContent()}
    </Modal>
  )
}
