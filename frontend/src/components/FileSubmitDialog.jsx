import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import { formatBytes } from '../utils/format.js'

export default function FileSubmitDialog({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    file: null,
    type: 'image'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const acceptedTypes = {
    image: '.png,.jpg,.jpeg,.gif,.webp',
    video: '.mp4,.mov,.avi,.webm',
    document: '.pdf,.docx,.doc,.txt',
    audio: '.mp3,.wav,.m4a,.aac'
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        file
      }))
      setError('')
    }
  }

  const handleTypeChange = (e) => {
    const type = e.target.value
    setFormData(prev => ({
      ...prev,
      type,
      file: null // Reset file when type changes
    }))
    setError('')
    
    // Reset file input
    const fileInput = document.getElementById('file-input')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const validateFile = (file, type) => {
    const acceptedExtensions = acceptedTypes[type].split(',').map(ext => ext.trim().toLowerCase())
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!acceptedExtensions.includes(fileExtension)) {
      return `Please select a valid ${type} file (${acceptedTypes[type]})`
    }

    // Size limits (in bytes)
    const sizeLimits = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      document: 25 * 1024 * 1024, // 25MB
      audio: 50 * 1024 * 1024 // 50MB
    }

    if (file.size > sizeLimits[type]) {
      return `File size exceeds the limit of ${formatBytes(sizeLimits[type])} for ${type} files`
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.file) {
      setError('Please select a file to analyze.')
      return
    }

    const validationError = validateFile(formData.file, formData.type)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onSubmit(formData.file, formData.type)
      setFormData({
        file: null,
        type: 'image'
      })
      // Reset file input
      const fileInput = document.getElementById('file-input')
      if (fileInput) {
        fileInput.value = ''
      }
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
        file: null,
        type: 'image'
      })
      setError('')
      // Reset file input
      const fileInput = document.getElementById('file-input')
      if (fileInput) {
        fileInput.value = ''
      }
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit File for Analysis"
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
            form="file-submit-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Uploading...' : 'Submit for Analysis'}
          </Button>
        </>
      }
    >
      <p className="text-muted mb-3">
        Upload an image, video, document, or audio. We'll analyze it and notify you.
      </p>

      <form id="file-submit-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="type">
            File Type *
          </label>
          <select 
            id="type"
            name="type"
            value={formData.type}
            onChange={handleTypeChange}
            className="form-select"
            required
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="file-input">
            File * ({acceptedTypes[formData.type]})
          </label>
          <input 
            type="file"
            id="file-input"
            accept={acceptedTypes[formData.type]}
            onChange={handleFileChange}
            className="form-input"
            required
          />
          {formData.file && (
            <div className="mt-2 text-sm text-muted">
              Selected: {formData.file.name} ({formatBytes(formData.file.size)})
            </div>
          )}
        </div>

        <div className="text-sm text-muted">
          <strong>Size limits:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Images: 10MB max</li>
            <li>Videos: 100MB max</li>
            <li>Documents: 25MB max</li>
            <li>Audio: 50MB max</li>
          </ul>
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