import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../../components/Button.jsx'
import { isValidEmail } from '../../utils/format.js'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setErrors({ submit: result.error })
    }
    
    setIsLoading(false)
  }

  return (
    <div>
      <h2 className="text-center mb-4">Sign In</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <div className="form-error">{errors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && (
            <div className="form-error">{errors.password}</div>
          )}
        </div>

        {errors.submit && (
          <div className="form-error mb-3">
            {errors.submit}
          </div>
        )}

        <Button 
          type="submit" 
          className="btn-lg"
          style={{ width: '100%' }}
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <div className="text-center mt-4">
        <p className="text-muted">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Create one here
          </Link>
        </p>
        
        <div className="mt-3 text-sm text-muted">
          <strong>Demo:</strong> Use email "demo@example.com" and password "password123"
        </div>
      </div>
    </div>
  )
}