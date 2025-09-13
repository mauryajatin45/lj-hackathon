// src/app/pages/auth/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import { isValidEmail } from '../../utils/format.js';

export default function Register() {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errors.submit) setErrors((prev) => ({ ...prev, submit: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email address';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters long';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    const result = await register(formData.email, formData.password, formData.confirmPassword);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      // map field error (from Zod) if provided
      if (result.field) {
        setErrors((prev) => ({ ...prev, [result.field]: result.error }));
      } else {
        setErrors((prev) => ({ ...prev, submit: result.error || 'Registration failed. Try again.' }));
      }
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 style={{ 
          fontSize: 'var(--font-size-2xl)', 
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          Create Account
        </h2>
        <p style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: 'var(--font-size-base)',
          margin: 0
        }}>
          Join Sentinel to secure your content
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email" id="email" name="email"
            value={formData.email} onChange={handleChange}
            className="form-input" placeholder="Enter your email address"
            disabled={isLoading}
          />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password" id="password" name="password"
            value={formData.password} onChange={handleChange}
            className="form-input" placeholder="Create a strong password (min. 8 characters)"
            disabled={isLoading}
          />
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            type="password" id="confirmPassword" name="confirmPassword"
            value={formData.confirmPassword} onChange={handleChange}
            className="form-input" placeholder="Confirm your password"
            disabled={isLoading}
          />
          {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
        </div>

        {errors.submit && <div className="form-error mb-4">{errors.submit}</div>}

        <Button 
          type="submit" 
          className="btn-primary btn-lg" 
          style={{ 
            width: '100%', 
            marginTop: 'var(--spacing-lg)',
            fontSize: 'var(--font-size-lg)',
            padding: 'var(--spacing-lg) var(--spacing-xl)'
          }} 
          disabled={isLoading}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ 
              color: 'var(--color-primary)', 
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--color-primary)'}
          >
            Sign in here
          </Link>
        </p>

        {/* Security features highlight */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          marginTop: 'var(--spacing-lg)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--color-success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              🔒
            </div>
            <strong style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
              Secure & Private
            </strong>
          </div>
          <p style={{ 
            color: 'var(--color-text-muted)', 
            fontSize: 'var(--font-size-sm)',
            margin: 0,
            lineHeight: 'var(--line-height-relaxed)'
          }}>
            Your data is encrypted and protected. We never share your information with third parties.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
