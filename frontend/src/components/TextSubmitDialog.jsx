import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import { DocumentTextIcon, UserIcon, AtSymbolIcon } from 'lucide-react'

export default function TextSubmitDialog({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    channel: 'email',
    content: '',
    sender: '',
    subject: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.content.trim()) {
      setError('Please enter the content to analyze.')
      return
    }

    if (formData.content.trim().length < 5) {
      setError('Content must be at least 5 characters long.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onSubmit(formData)
      setFormData({
        channel: 'email',
        content: '',
        sender: '',
        subject: ''
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        channel: 'email',
        content: '',
        sender: '',
        subject: ''
      })
      setError('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit SMS/Email Text"
      size="lg"
      footer={
        <>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="text-submit-form"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit for Analysis
          </Button>
        </>
      }
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Text Content Analysis</h4>
            <p className="text-sm text-gray-500">Paste the SMS/Email content to check for scam indicators</p>
          </div>
        </div>
      </div>

      <form id="text-submit-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="form-label" htmlFor="channel">
            Channel *
          </label>
          <select 
            id="channel"
            name="channel"
            value={formData.channel}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="chat">Chat</option>
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor="content">
            Content *
          </label>
          <textarea 
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Paste the suspicious text here..."
            className="form-textarea"
            rows={6}
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            {formData.content.length}/2000 characters
          </p>
        </div>

        {formData.channel === 'email' && (
          <div>
            <label className="form-label" htmlFor="subject">
              Subject
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AtSymbolIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Email subject line"
                className="form-input pl-10"
              />
            </div>
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="sender">
            Sender
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text"
              id="sender"
              name="sender"
              value={formData.sender}
              onChange={handleChange}
              placeholder={
                formData.channel === 'email' ? 'sender@example.com' :
                formData.channel === 'sms' ? '+1234567890' :
                'Username or display name'
              }
              className="form-input pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}
      </form>
    </Modal>
  )
}