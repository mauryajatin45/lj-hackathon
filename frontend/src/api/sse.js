const SSE_URL = import.meta.env.VITE_SSE_URL || 'http://localhost:4000/api/sse'
const MOCK_MODE = false

export class SSEConnection {
  constructor() {
    this.eventSource = null
    this.listeners = {}
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.mockInterval = null
    this.mockEventQueue = []
    this.isConnected = false
    this.isConnecting = false
  }

  connect(token) {
    // Prevent duplicate connections
    if (this.isConnected || this.isConnecting) {
      console.log('SSE connection already active, skipping duplicate connection')
      return
    }

    if (this.eventSource) {
      this.disconnect()
    }

    this.isConnecting = true
    this.startRealConnection(token)
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    
    if (this.mockInterval) {
      clearInterval(this.mockInterval)
      this.mockInterval = null
    }
    
    this.isConnected = false
    this.isConnecting = false
    this.emit('connection', { status: 'disconnected' })
  }

  handleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    this.emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts })

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect(token)
    }, delay)
  }

  startMockConnection() {
    console.log('Starting mock SSE connection')
    this.isConnected = true
    this.isConnecting = false
    this.emit('connection', { status: 'connected' })

    // Simulate realistic analysis flow for new submissions
    this.mockInterval = setInterval(() => {
      this.generateMockEvents()
    }, 10000) // Check every 10 seconds to reduce load
  }

  startRealConnection(token) {
    console.log('Starting real SSE connection')
    const url = `${SSE_URL}?token=${encodeURIComponent(token)}`
    this.eventSource = new EventSource(url)

    this.eventSource.onopen = () => {
      console.log('SSE connection opened')
      this.isConnected = true
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.emit('connection', { status: 'connected' })
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit(event.type, data)
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      this.isConnected = false
      this.emit('connection', { status: 'error' })
      this.handleReconnect(token)
    }
  }

  generateMockEvents() {
    // Only generate events 30% of the time to reduce load
    if (Math.random() > 0.3) {
      return
    }

    const eventTypes = [
      'submission_created',
      'analysis_started', 
      'analysis_update',
      'report_ready'
    ]

    // Generate random events for demo
    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const submissionId = 'mock-' + Date.now()

    switch (randomEvent) {
      case 'submission_created':
        this.emit('submission_created', {
          submissionId,
          createdAt: new Date().toISOString()
        })
        
        // Queue follow-up events
        setTimeout(() => {
          this.emit('analysis_started', { submissionId })
        }, 2000)
        
        setTimeout(() => {
          this.emit('analysis_update', { 
            submissionId, 
            progress: 'Analyzing content patterns...',
            note: 'Checking for suspicious indicators'
          })
        }, 5000)
        
        setTimeout(() => {
          const riskScore = Math.random()
          const suspicious = riskScore > 0.5
          const reasons = suspicious ? [
            'Suspicious URL detected',
            'Urgent language patterns',
            'Potential phishing attempt'
          ].slice(0, Math.floor(Math.random() * 3) + 1) : []
          
          const timestamps = Math.random() > 0.7 ? [
            { start: Math.floor(Math.random() * 30), end: Math.floor(Math.random() * 30) + 30, label: 'Suspicious segment' },
            { start: Math.floor(Math.random() * 60) + 60, end: Math.floor(Math.random() * 30) + 90, label: 'Risk indicator' }
          ] : []

          this.emit('report_ready', {
            submissionId,
            riskScore,
            suspicious,
            reasons,
            timestamps
          })
        }, 8000)
        break

      case 'analysis_started':
        this.emit('analysis_started', { submissionId })
        break

      case 'analysis_update':
        const updates = [
          'Scanning for malicious patterns...',
          'Analyzing text sentiment...',
          'Checking URL reputation...',
          'Processing media content...',
          'Running deepfake detection...',
          'Validating sender authenticity...'
        ]
        
        this.emit('analysis_update', {
          submissionId,
          progress: updates[Math.floor(Math.random() * updates.length)],
          note: 'Analysis in progress'
        })
        break

      case 'report_ready':
        const riskScore = Math.random()
        const suspicious = riskScore > 0.4
        const reasonsList = [
          'Contains money offer',
          'Shortened URL detected', 
          'Urgent language patterns',
          'Suspicious domain',
          'Potential phishing',
          'Voice manipulation detected',
          'Deepfake indicators',
          'Account threat language',
          'Generic delivery message',
          'QR code detected'
        ]
        
        const reasons = suspicious ? 
          reasonsList.slice(0, Math.floor(Math.random() * 4) + 1) : []
        
        const timestamps = Math.random() > 0.6 ? [
          { 
            start: Math.floor(Math.random() * 30), 
            end: Math.floor(Math.random() * 20) + 30, 
            label: 'Suspicious phrase' 
          },
          { 
            start: Math.floor(Math.random() * 40) + 60, 
            end: Math.floor(Math.random() * 15) + 100, 
            label: 'Risk indicator' 
          }
        ] : []

        this.emit('report_ready', {
          submissionId,
          riskScore,
          suspicious,
          reasons,
          timestamps
        })
        break
    }
  }

  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = []
    }
    this.listeners[eventType].push(callback)
  }

  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback)
    }
  }

  emit(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in SSE event listener:', error)
        }
      })
    }
  }
}

// Singleton instance
export const sseConnection = new SSEConnection()

export function connectReportsStream(token) {
  sseConnection.connect(token)
  return sseConnection
}