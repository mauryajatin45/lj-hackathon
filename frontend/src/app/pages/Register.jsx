import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import { isValidEmail } from '../../utils/format.js';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  CheckCircleIcon,
  ShieldCheckIcon
} from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      if (result.field) {
        setErrors((prev) => ({ ...prev, [result.field]: result.error }));
      } else {
        setErrors((prev) => ({ ...prev, submit: result.error || 'Registration failed. Try again.' }));
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-600">Join Sentinel to secure your content</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>
          {errors.email && <div className="form-error">{errors.email}</div>}
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input pl-10 pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Create a strong password (min. 8 characters)"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && <div className="form-error">{errors.password}</div>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`form-input pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600">{errors.submit}</div>
          </div>
        )}

        <Button 
          type="submit" 
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Sign in here
          </Link>
        </p>

        {/* Security features */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheckIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Secure & Private</span>
          </div>
          <p className="text-sm text-green-700">
            Your data is encrypted and protected. We never share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}