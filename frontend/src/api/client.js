const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
const MOCK_MODE = import.meta.env.VITE_MOCK === 'true'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// Mock data store for demo
const mockData = {
  users: [
    { email: 'demo@example.com', password: 'password123' },
    { email: 'test@example.com', password: 'test123456' }
  ],
  submissions: [
    {
      id: 'sub_001',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      channel: 'email',
      textPreview: 'Congratulations! You\'ve won $1000. Click here to claim your prize: bit.ly/claim123',
      sender: 'winner@lottery.com',
      subject: 'You\'ve Won!',
      attachments: [],
      report: {
        suspicious: true,
        riskScore: 0.85,
        reasons: ['Contains money offer', 'Shortened URL detected', 'Urgent language'],
        timestamps: []
      }
    },
    {
      id: 'sub_002',
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      channel: 'sms',
      textPreview: 'Your package is ready for delivery. Track here: bit.ly/track123',
      sender: '+1234567890',
      attachments: [],
      report: {
        suspicious: true,
        riskScore: 0.72,
        reasons: ['Shortened URL detected', 'Generic delivery message'],
        timestamps: []
      }
    },
    {
      id: 'sub_003',
      createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      channel: 'image',
      textPreview: null,
      attachments: [{
        type: 'image',
        name: 'suspicious_qr.jpg',
        size: 245760,
        url: 'https://images.pexels.com/photos/8566473/pexels-photo-8566473.jpeg'
      }],
      report: {
        suspicious: true,
        riskScore: 0.68,
        reasons: ['QR code detected', 'Potential phishing attempt'],
        timestamps: []
      }
    },
    {
      id: 'sub_004',
      createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
      channel: 'video',
      textPreview: null,
      attachments: [{
        type: 'video',
        name: 'suspicious_video.mp4',
        size: 15728640,
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
      }],
      report: {
        suspicious: true,
        riskScore: 0.91,
        reasons: ['Deepfake detected', 'Impersonation attempt', 'Audio manipulation'],
        timestamps: [
          { start: 12, end: 19, label: 'Suspicious phrase' },
          { start: 63, end: 75, label: 'Voice manipulation' }
        ]
      }
    },
    {
      id: 'sub_005',
      createdAt: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
      channel: 'document',
      textPreview: null,
      attachments: [{
        type: 'document',
        name: 'invoice.pdf',
        size: 524288,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      }],
      report: {
        suspicious: false,
        riskScore: 0.15,
        reasons: [],
        timestamps: []
      }
    },
    {
      id: 'sub_006',
      createdAt: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      channel: 'audio',
      textPreview: null,
      attachments: [{
        type: 'audio',
        name: 'voice_message.mp3',
        size: 1048576,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      }],
      report: {
        suspicious: true,
        riskScore: 0.78,
        reasons: ['Voice cloning detected', 'Impersonation attempt'],
        timestamps: [
          { start: 5, end: 12, label: 'Cloned voice segment' },
          { start: 28, end: 35, label: 'Suspicious request' }
        ]
      }
    },
    {
      id: 'sub_007',
      createdAt: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
      channel: 'email',
      textPreview: 'Hi there! Just wanted to check in and see how you\'re doing. Hope all is well!',
      sender: 'friend@example.com',
      subject: 'Checking in',
      attachments: [],
      report: {
        suspicious: false,
        riskScore: 0.05,
        reasons: [],
        timestamps: []
      }
    },
    {
      id: 'sub_008',
      createdAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
      channel: 'chat',
      textPreview: 'URGENT: Your account will be suspended unless you verify immediately. Click: verify-account-now.com',
      sender: 'security_team',
      attachments: [],
      report: {
        suspicious: true,
        riskScore: 0.94,
        reasons: ['Urgent language', 'Account threat', 'Suspicious domain', 'Impersonation'],
        timestamps: []
      }
    }
    ,
    {
      id: 'sub_009',
      createdAt: new Date(Date.now() - 32400000).toISOString(), // 9 hours ago
      channel: 'sms',
      textPreview: 'Your bank account has been compromised. Call 555-SCAM immediately to secure your funds.',
      sender: '+1555123456',
      attachments: [],
      report: {
        suspicious: true,
        riskScore: 0.89,
        reasons: ['Bank impersonation', 'Urgent language', 'Suspicious phone number'],
        timestamps: []
      }
    },
    {
      id: 'sub_010',
      createdAt: new Date(Date.now() - 36000000).toISOString(), // 10 hours ago
      channel: 'email',
      textPreview: 'Meeting reminder: Team standup at 2 PM today in conference room B.',
      sender: 'manager@company.com',
      subject: 'Team Meeting Today',
      attachments: [],
      report: {
        suspicious: false,
        riskScore: 0.02,
        reasons: [],
        timestamps: []
      }
    },
    {
      id: 'sub_011',
      createdAt: new Date(Date.now() - 39600000).toISOString(), // 11 hours ago
      channel: 'image',
      textPreview: null,
      attachments: [{
        type: 'image',
        name: 'family_photo.jpg',
        size: 1024000,
        url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg'
      }],
      report: {
        suspicious: false,
        riskScore: 0.08,
        reasons: [],
        timestamps: []
      }
    },
    {
      id: 'sub_012',
      createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      channel: 'video',
      textPreview: null,
      attachments: [{
        type: 'video',
        name: 'fake_news_video.mp4',
        size: 25600000,
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4'
      }],
      report: {
        suspicious: true,
        riskScore: 0.76,
        reasons: ['Misinformation detected', 'Manipulated content', 'False claims'],
        timestamps: [
          { start: 15, end: 28, label: 'False statement' },
          { start: 45, end: 52, label: 'Misleading claim' }
        ]
      }
    },
    {
      id: 'sub_013',
      createdAt: new Date(Date.now() - 46800000).toISOString(), // 13 hours ago
      channel: 'document',
      textPreview: null,
      attachments: [{
        type: 'document',
        name: 'malicious_contract.pdf',
        size: 756000,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      }],
      report: {
        suspicious: true,
        riskScore: 0.83,
        reasons: ['Hidden malicious code', 'Suspicious contract terms', 'Potential fraud'],
        timestamps: []
      }
    },
    {
      id: 'sub_014',
      createdAt: new Date(Date.now() - 50400000).toISOString(), // 14 hours ago
      channel: 'audio',
      textPreview: null,
      attachments: [{
        type: 'audio',
        name: 'conference_call.mp3',
        size: 2048000,
        url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
      }],
      report: {
        suspicious: false,
        riskScore: 0.12,
        reasons: [],
        timestamps: []
      }
    },
    {
      id: 'sub_015',
      createdAt: new Date(Date.now() - 54000000).toISOString(), // 15 hours ago
      channel: 'chat',
      textPreview: 'Hey! Check out this amazing investment opportunity. Guaranteed 500% returns in 30 days!',
      sender: 'crypto_guru',
      attachments: [],
      report: {
        suspicious: true,
        riskScore: 0.92,
        reasons: ['Investment scam', 'Unrealistic promises', 'Get-rich-quick scheme'],
        timestamps: []
      }
    }
  ]
}

export async function apiRequest(endpoint, options = {}) {
  // Always use mock mode now
  return mockApiRequest(endpoint, options)
}

// Enhanced mock API for comprehensive demo
function mockApiRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      try {
        // Mock authentication endpoints
        if (endpoint === '/auth/login' && options.method === 'POST') {
          const { email, password } = JSON.parse(options.body || '{}')
          const user = mockData.users.find(u => u.email === email && u.password === password)
          
          if (user) {
            resolve({
              token: 'mock-jwt-token-' + Date.now(),
              user: { email: user.email }
            })
          } else {
            reject(new ApiError('Invalid email or password', 401))
          }
          return
        }
        
        if (endpoint === '/auth/register' && options.method === 'POST') {
          const { email, password, confirmPassword } = JSON.parse(options.body || '{}')
          
          if (password !== confirmPassword) {
            reject(new ApiError('Passwords do not match', 400))
            return
          }
          
          if (mockData.users.find(u => u.email === email)) {
            reject(new ApiError('Email already exists', 409))
            return
          }
          
          mockData.users.push({ email, password })
          resolve({
            token: 'mock-jwt-token-' + Date.now(),
            user: { email }
          })
          return
        }
        
        // Mock submission endpoints
        if (endpoint === '/submissions/text' && options.method === 'POST') {
          const data = JSON.parse(options.body || '{}')
          const submissionId = 'sub_' + Date.now()
          
          // Add to mock data
          const newSubmission = {
            id: submissionId,
            createdAt: new Date().toISOString(),
            channel: data.channel,
            textPreview: data.content,
            sender: data.sender,
            subject: data.subject,
            attachments: [],
            report: null // Will be filled by SSE simulation
          }
          
          mockData.submissions.unshift(newSubmission)
          
          resolve({ submissionId })
          return
        }
        
        if (endpoint === '/submissions/file' && options.method === 'POST') {
          const submissionId = 'sub_' + Date.now()
          
          // Simulate file upload
          const newSubmission = {
            id: submissionId,
            createdAt: new Date().toISOString(),
            channel: 'image', // Default, would be determined by file type
            textPreview: null,
            attachments: [{
              type: 'image',
              name: 'uploaded_file.jpg',
              size: 1024000,
              url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg'
            }],
            report: null // Will be filled by SSE simulation
          }
          
          mockData.submissions.unshift(newSubmission)
          
          resolve({ submissionId })
          return
        }
        
        if (endpoint.startsWith('/submissions/') && endpoint !== '/submissions' && options.method !== 'POST') {
          // Get single submission
          const id = endpoint.split('/')[2]
          const submission = mockData.submissions.find(s => s.id === id)
          
          if (submission) {
            resolve(submission)
          } else {
            reject(new ApiError('Submission not found', 404))
          }
          return
        }
        
        if (endpoint.startsWith('/submissions') && options.method !== 'POST') {
          // Get submissions list with filtering
          const url = new URL('http://localhost' + endpoint)
          const query = url.searchParams.get('query') || ''
          const channel = url.searchParams.get('channel') || ''
          const risk = url.searchParams.get('risk') || ''
          const from = url.searchParams.get('from') || ''
          const to = url.searchParams.get('to') || ''
          const page = parseInt(url.searchParams.get('page') || '1')
          const limit = parseInt(url.searchParams.get('limit') || '10')
          
          let filtered = [...mockData.submissions]
          
          // Apply filters
          if (query) {
            filtered = filtered.filter(s => 
              s.id.toLowerCase().includes(query.toLowerCase()) ||
              (s.textPreview && s.textPreview.toLowerCase().includes(query.toLowerCase())) ||
              (s.attachments && s.attachments.some(a => a.name.toLowerCase().includes(query.toLowerCase())))
            )
          }
          
          if (channel) {
            filtered = filtered.filter(s => s.channel === channel)
          }
          
          if (risk) {
            filtered = filtered.filter(s => {
              if (!s.report) return false
              const score = s.report.riskScore
              switch (risk) {
                case 'low': return score < 0.3
                case 'medium': return score >= 0.3 && score < 0.7
                case 'high': return score >= 0.7
                default: return true
              }
            })
          }
          
          if (from) {
            filtered = filtered.filter(s => new Date(s.createdAt) >= new Date(from))
          }
          
          if (to) {
            filtered = filtered.filter(s => new Date(s.createdAt) <= new Date(to))
          }
          
          // Pagination
          const total = filtered.length
          const startIndex = (page - 1) * limit
          const items = filtered.slice(startIndex, startIndex + limit)
          
          resolve({
            items,
            total,
            page,
            limit
          })
          return
        }
        
        reject(new ApiError('Endpoint not found', 404))
      } catch (error) {
        reject(new ApiError('Mock API error: ' + error.message, 500))
      }
    }, Math.random() * 800 + 200) // Random delay 200-1000ms
  })
}