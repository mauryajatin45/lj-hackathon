import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import { formatBytes } from '../utils/format.js'
import { 
  PaperClipIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentIcon, 
  MusicalNoteIcon,
  CloudArrowUpIcon
} from 'lucide-react'

export default function FileSubmitDialog({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    file: null,
    type: 'image'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const acceptedTypes = {
    image: '.png,.jpg,.jpeg,.gif,.webp',
    video: '.mp4,.mov,.avi,.webm',
    document: '.pdf,.docx,.doc,.txt',
    audio: '.mp3,.wav,.m4a,.aac'
  }

  const typeIcons = {
    image: PhotoIcon,
    video: VideoCameraIcon,
    document: DocumentIcon,
    audio: MusicalNoteIcon
  }

  const handleFileChange = (file) => {
    if (file) {
      setFormData(prev => ({
        ...prev,
        file
      }))
      setError('')
    }
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    handleFileChange(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleTypeChange = (e) => {
    const type = e.target.value
    setFormData(prev => ({
      ...prev,
      type,
      file: null
    }))
    setError('')
    
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

    const sizeLimits = {
      image: 10 * 1024 * 1024,
      video: 100 * 1024 * 1024,
      document: 25 * 1024 * 1024,
      audio: 50 * 1024 * 1024
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
      const fileInput = document.getElementById('file-input')
      if (fileInput) {
        fileInput.value = ''
      }
      onClose()
    }
  }

  const TypeIcon = typeIcons[formData.type]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit File for Analysis"
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
            form="file-submit-form"
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
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <PaperClipIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">File Analysis</h4>
            <p className="text-sm text-gray-500">Upload an image, video, document, or audio file for analysis</p>
          </div>
        </div>
      </div>

      <form id="file-submit-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
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

        <div>
          <label className="form-label">
            File * ({acceptedTypes[formData.type]})
          </label>
          
          {/* Drag and Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="file-input"
              type="file"
              accept={acceptedTypes[formData.type]}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {formData.file ? (
                  <TypeIcon className="w-6 h-6 text-gray-600" />
                ) : (
                  <CloudArrowUpIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              
              {formData.file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{formData.file.name}</p>
                  <p className="text-sm text-gray-500">{formatBytes(formData.file.size)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, file: null }))
                      const fileInput = document.getElementById('file-input')
                      if (fileInput) fileInput.value = ''
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} files only
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Size Limits */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">File Size Limits</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>• Images: 10MB max</div>
            <div>• Videos: 100MB max</div>
            <div>• Documents: 25MB max</div>
            <div>• Audio: 50MB max</div>
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