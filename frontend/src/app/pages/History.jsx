import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToastContext } from '../layouts/AppLayout.jsx'
import Card from '../../components/Card.jsx'
import Button from '../../components/Button.jsx'
import Table from '../../components/Table.jsx'
import RiskBadge from '../../components/RiskBadge.jsx'
import TimestampChips from '../../components/TimestampChips.jsx'
import SubmissionDetailsDialog from '../../components/SubmissionDetailsDialog.jsx'
import { getSubmissions } from '../../api/submissions.js'
import { formatDate, truncateText } from '../../utils/format.js'

export default function History() {
  const toast = useToastContext()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    query: '',
    channel: '',
    risk: '',
    from: '',
    to: ''
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null)

  const itemsPerPage = 20

  useEffect(() => {
    loadSubmissions()
  }, [filters, currentPage])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const params = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      }
      
      // Clean up empty values
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key]
        }
      })

      const result = await getSubmissions(params)
      setSubmissions(result.submissions || [])
      setTotalCount(result.pagination?.total || 0)
    } catch (error) {
      console.error('Failed to load submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      channel: '',
      risk: '',
      from: '',
      to: ''
    })
    setCurrentPage(1)
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

  const getRiskStats = () => {
    const stats = {
      total: totalCount,
      high: 0,
      medium: 0,
      low: 0,
      pending: 0
    }

    submissions.forEach(sub => {
      if (!sub.report) {
        stats.pending++
      } else if (sub.report.riskScore >= 0.7) {
        stats.high++
      } else if (sub.report.riskScore >= 0.3) {
        stats.medium++
      } else {
        stats.low++
      }
    })

    return stats
  }

  const stats = getRiskStats()
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => (
        <div className="text-sm">
          <div className="font-weight-500">#{(row.id || row._id || '').slice(-8)}</div>
          <div className="text-muted">{formatDate(row.createdAt)}</div>
        </div>
      )
    },
    {
      key: 'data',
      header: 'Content Submitted',
      render: (row) => (
        <div style={{ maxWidth: '300px' }}>
          {row.textPreview ? (
            <div>
              <div className="text-sm mb-1">
                {truncateText(row.textPreview, 80)}
              </div>
              <div className="text-sm text-muted">
                📱 {row.channel.toUpperCase()}
                {row.sender && ` • From: ${truncateText(row.sender, 20)}`}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm mb-1">
                {row.attachments?.[0]?.name || 'File submission'}
              </div>
              <div className="text-sm text-muted">
                📎 {row.channel.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'attachments',
      header: 'Files',
      render: (row) => {
        if (!row.attachments || row.attachments.length === 0) {
          return <span className="text-muted">—</span>
        }
        
        return (
          <div className="d-flex gap-1 align-items-center">
            <div className="d-flex gap-1">
              {row.attachments.slice(0, 3).map((attachment, index) => (
                <span key={index} style={{ fontSize: '18px' }} title={attachment.name}>
                  {getFileIcon(attachment)}
                </span>
              ))}
              {row.attachments.length > 3 && (
                <span className="text-sm text-muted">+{row.attachments.length - 3}</span>
              )}
            </div>
            {row.attachments[0]?.url && (
              <a 
                href={row.attachments[0].url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm"
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                View
              </a>
            )}
          </div>
        )
      }
    },
    {
      key: 'report',
      header: 'Analysis Report',
      render: (row) => {
        // Show status and lastError if present
        if (row.status && row.status !== 'COMPLETED') {
          return (
            <div className="text-center">
              <div className="text-sm text-muted">
                {row.status === 'QUEUED' && '⏳ Queued for analysis'}
                {row.status === 'UPLOADING' && '⬆️ Uploading...'}
                {row.status === 'ERROR' && (
                  <span style={{ color: 'var(--color-danger)' }}>
                    ❌ Error: {row.lastError || 'Unknown error'}
                  </span>
                )}
              </div>
            </div>
          )
        }

        if (!row.report) {
          return (
            <div className="text-center">
              <div className="text-sm text-muted">🔄 Analyzing...</div>
            </div>
          )
        }
        
        return (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge ${row.report.suspicious ? 'badge-high' : 'badge-success'}`}>
                {row.report.suspicious ? 'SUSPICIOUS' : 'SAFE'}
              </span>
            </div>
            {row.report.reasons && row.report.reasons.length > 0 && (
              <div className="text-sm text-muted">
                {truncateText(row.report.reasons[0], 35)}
                {row.report.reasons.length > 1 && ` (+${row.report.reasons.length - 1} more)`}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'riskScore',
      header: 'Risk Level',
      render: (row) => (
        <div className="text-center">
          <RiskBadge score={row.report?.riskScore} />
        </div>
      )
    },
    {
      key: 'timestamps',
      header: 'Timeline',
      render: (row) => (
        <div style={{ minWidth: '120px' }}>
          <TimestampChips timestamps={row.report?.timestamps} />
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="d-flex gap-1">
          <button
            className="text-sm"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
            onClick={() => {
              setSelectedSubmissionId(row.id || row._id)
              setDialogOpen(true)
            }}
          >
            View
          </button>
          <span className="text-muted">•</span>
          <button
            className="text-sm"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              padding: 0
            }}
            onClick={() => {
              if (row.report) {
                navigator.clipboard.writeText(
                  `Submission #${row._id}\n` +
                  `Risk: ${(row.report.riskScore * 100).toFixed(0)}%\n` +
                  `Suspicious: ${row.report.suspicious ? 'Yes' : 'No'}\n` +
                  `Reasons: ${row.report.reasons?.join(', ') || 'None'}`
                )
                toast.success('Report copied to clipboard')
              }
            }}
          >
            Copy
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Complete History</h1>
        <p className="text-muted">View and manage all submitted content analysis reports from start to end</p>
      </div>

      {/* Statistics Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-weight-600 mb-1">{stats.total}</div>
            <div className="text-sm text-muted">Total Submissions</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-weight-600 mb-1" style={{ color: 'var(--color-danger)' }}>{stats.high}</div>
            <div className="text-sm text-muted">High Risk</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-weight-600 mb-1" style={{ color: 'var(--color-warning)' }}>{stats.medium}</div>
            <div className="text-sm text-muted">Medium Risk</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-weight-600 mb-1" style={{ color: 'var(--color-success)' }}>{stats.low}</div>
            <div className="text-sm text-muted">Low Risk</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-weight-600 mb-1" style={{ color: 'var(--color-text-muted)' }}>{stats.pending}</div>
            <div className="text-sm text-muted">Analyzing</div>
          </div>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="mb-4">
        <div className="card-header">
          <h3>Search & Filter</h3>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div className="form-group mb-0">
            <label className="form-label">Search</label>
            <input 
              type="text"
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              placeholder="Search by text, ID, or sender..."
              className="form-input"
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Channel</label>
            <select 
              value={filters.channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              className="form-select"
            >
              <option value="">All Channels</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Risk Level</label>
            <select 
              value={filters.risk}
              onChange={(e) => handleFilterChange('risk', e.target.value)}
              className="form-select"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low (0-30%)</option>
              <option value="medium">Medium (30-70%)</option>
              <option value="high">High (70-100%)</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Date From</label>
            <input 
              type="date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Date To</label>
            <input 
              type="date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="d-flex align-items-end">
            <Button 
              variant="secondary" 
              onClick={clearFilters}
              disabled={Object.values(filters).every(v => !v)}
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3>
              Submissions History 
              {totalCount > 0 && (
                <span className="text-muted text-sm font-weight-normal">
                  ({totalCount} total, showing {submissions.length})
                </span>
              )}
            </h3>
            {totalPages > 1 && (
              <div className="d-flex align-items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="text-lg mb-2">🔄</div>
            <div>Loading submissions...</div>
          </div>
        ) : (
          <Table 
            columns={columns}
            data={submissions}
            onRowClick={(row) => {
              // Row click handled by individual action buttons
            }}
            emptyMessage="No submissions found. Try adjusting your filters or submit some content for analysis."
          />
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="card-body" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} submissions
              </div>
              <div className="d-flex gap-1">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Submission Details Dialog */}
      <SubmissionDetailsDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedSubmissionId(null)
        }}
        submissionId={selectedSubmissionId}
      />
    </div>
  )
}
