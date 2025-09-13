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
import { submitText, submitFile } from '../../api/submissions.js'
import { formatDate } from '../../utils/format.js'
import { 
  PlusIcon, 
  DocumentTextIcon, 
  PaperClipIcon,
  SignalIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from 'lucide-react'

export default function Dashboard() {
  const { token } = useAuth()
  const toast = useToastContext()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [sseStatus, setSSEStatus] = useState('disconnected')
  const [liveUpdates, setLiveUpdates] = useState([])
  const [recentReports, setRecentReports] = useState([])

  useEffect(() => {
    let hasShownConnectionToast = false

    if (sseStatus === 'disconnected') {
      sseConnection.connect(token)
    }

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

      setRecentReports(prev => {
        const updated = [{
          id: data.submissionId,
          timestamp: new Date().toISOString(),
          riskScore: data.riskScore,
          suspicious: data.suspicious,
          reasons: data.reasons
        }, ...prev]
        return updated.slice(0, 5)
      })

      toast.success(`Report ready • Risk ${(data.riskScore * 100).toFixed(0)}% (${riskLevel})`)
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
    }
  }, [token, toast])

  const addLiveUpdate = (update) => {
    setLiveUpdates(prev => {
      const updated = [update, ...prev]
      return updated.slice(0, 10)
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Monitor and analyze suspicious content in real-time</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Analyzed</p>
              <p className="text-2xl font-bold text-blue-900">{liveUpdates.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Safe Content</p>
              <p className="text-2xl font-bold text-green-900">
                {recentReports.filter(r => !r.suspicious).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Suspicious</p>
              <p className="text-2xl font-bold text-red-900">
                {recentReports.filter(r => r.suspicious).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <SignalIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Live Status</p>
              <SSEStatusPill status={sseStatus} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Action */}
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <PlusIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Submit for Analysis</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Submit suspicious content for automated security analysis using our advanced AI detection system
          </p>
          
          <Dropdown 
            isOpen={isDropdownOpen}
            onToggle={setIsDropdownOpen}
            trigger={
              <Button size="lg" className="bg-primary-600 hover:bg-primary-700">
                <PlusIcon className="w-5 h-5" />
                Add / Check Something Suspicious
              </Button>
            }
          >
            <button 
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              onClick={() => {
                setTextDialogOpen(true)
                setIsDropdownOpen(false)
              }}
            >
              <DocumentTextIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Submit SMS/Email text</div>
                <div className="text-sm text-gray-500">Analyze text messages and emails</div>
              </div>
            </button>
            <button 
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              onClick={() => {
                setFileDialogOpen(true)
                setIsDropdownOpen(false)
              }}
            >
              <PaperClipIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Submit file</div>
                <div className="text-sm text-gray-500">Upload images, videos, documents, or audio</div>
              </div>
            </button>
          </Dropdown>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Updates */}
        <Card>
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SignalIcon className="w-5 h-5 text-primary-600" />
                Live Updates
              </h3>
              <SSEStatusPill status={sseStatus} />
            </div>
            <p className="text-sm text-gray-500 mt-1">Real-time analysis updates</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {liveUpdates.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent updates</p>
                <p className="text-sm text-gray-400">Submit content to see live analysis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveUpdates.map((update, index) => (
                  <div 
                    key={`${update.submissionId}-${update.timestamp}-${index}`}
                    className={`p-4 rounded-lg border ${
                      update.error 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        #{update.submissionId.slice(-8)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(update.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{update.message}</p>
                    {update.riskScore !== undefined && (
                      <div className="mb-2">
                        <RiskBadge score={update.riskScore} />
                      </div>
                    )}
                    <Link 
                      to="/history" 
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View in History →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Reports */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-primary-600" />
              Recent Reports
            </h3>
            <p className="text-sm text-gray-500 mt-1">Latest analysis results</p>
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-8">
              <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reports yet</p>
              <p className="text-sm text-gray-400">Submit content for analysis to see results here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report, index) => (
                <div 
                  key={`${report.id}-${index}`}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-900">
                      #{report.id.slice(-8)}
                    </span>
                    <RiskBadge score={report.riskScore} />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Suspicious:</span>
                    <span className={`text-sm font-medium ${
                      report.suspicious ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {report.suspicious ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  {report.reasons && report.reasons.length > 0 && (
                    <p className="text-sm text-gray-600 mb-3">
                      {report.reasons[0]}
                      {report.reasons.length > 1 && ` (+${report.reasons.length - 1} more)`}
                    </p>
                  )}
                  
                  <Link 
                    to={`/submissions/${report.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Link 
              to="/history" 
              className="btn btn-secondary"
            >
              <ClockIcon className="w-4 h-4" />
              View Complete History
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