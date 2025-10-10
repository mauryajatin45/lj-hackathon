import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import { isValidEmail } from '../../utils/format.js';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { login, loading } = useAuth();
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
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/app/dashboard', { replace: true });
    } else {
      if (result.field) {
        setErrors((prev) => ({ ...prev, [result.field]: result.error }));
      } else {
        setErrors((prev) => ({ ...prev, submit: result.error || 'Login failed. Please try again.' }));
      }
    }
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
          Welcome Back
        </h2>
        <p style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: 'var(--font-size-base)',
          margin: 0
        }}>
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email" id="email" name="email"
            value={formData.email} onChange={handleChange}
            className="form-input" placeholder="Enter your email address"
            disabled={loading}
          />
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password" id="password" name="password"
            value={formData.password} onChange={handleChange}
            className="form-input" placeholder="Enter your password"
            disabled={loading}
          />
          {errors.password && <div className="form-error">{errors.password}</div>}
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
          disabled={loading}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Signing In...
            </div>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
          Don't have an account?{' '}
          <Link 
            to="/register" 
            style={{ 
              color: 'var(--color-primary)', 
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--color-primary)'}
          >
            Create one here
          </Link>
        </p>

        {/* Demo credentials card */}
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
              background: 'var(--color-warning-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              ⚡
            </div>
            <strong style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
              Demo Credentials
            </strong>
          </div>
          <p style={{ 
            color: 'var(--color-text-muted)', 
            fontSize: 'var(--font-size-sm)',
            margin: 0,
            fontFamily: 'var(--font-family-mono)'
          }}>
            Email: admin@gmail.com<br />
            Password: admin123
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
