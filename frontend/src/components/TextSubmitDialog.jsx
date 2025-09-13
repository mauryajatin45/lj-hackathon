import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Analysis'}
          </Button>
        </>
      }
    >
      <p className="text-muted mb-3">
        Paste the SMS/Email content. We'll check for scam indicators.
      </p>

      <form id="text-submit-form" onSubmit={handleSubmit}>
        <div className="form-group">
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

        <div className="form-group">
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
        </div>

        {formData.channel === 'email' && (
          <div className="form-group">
            <label className="form-label" htmlFor="subject">
              Subject
            </label>
            <input 
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Email subject line"
              className="form-input"
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="sender">
            Sender
          </label>
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
            className="form-input"
          />
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}