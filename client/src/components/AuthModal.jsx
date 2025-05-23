import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/authSlice';
import { X, Mail, Lock, User, ArrowRight, Loader, Github, Chrome } from 'lucide-react';

function AuthModal({ isOpen, onClose }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.auth);

  useEffect(() => {
    if (error) {
      // Map server error messages to form fields
      if (error.includes('Email is already registered')) {
        setValidationErrors(prevErrors => ({
          ...prevErrors,
          email: 'This email is already registered'
        }));
      } else if (error.includes('Username is already taken')) {
        setValidationErrors(prevErrors => ({
          ...prevErrors,
          username: 'This username is already taken'
        }));
      }
    }
  }, [error, validationErrors]);

  const switchView = () => {
    setIsLoginView(!isLoginView);
    setFormData({ ...formData, email: '', password: '', username: '', confirmPassword: '' });
    setValidationErrors({});
    if (error) dispatch(clearError());
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLoginView) {
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear validation error when user types
    if (validationErrors[e.target.name]) {
      setValidationErrors({
        ...validationErrors,
        [e.target.name]: null,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Clear any previous server errors
    if (error) dispatch(clearError());
    
    if (isLoginView) {
      dispatch(login({ 
        email: formData.email, 
        password: formData.password 
      }))
        .unwrap()
        .then(() => onClose())
        .catch(() => {}); // Error is handled by the redux slice
    } else {
      dispatch(register({ 
        email: formData.email, 
        password: formData.password,
        username: formData.username,
      }))
        .unwrap()
        .then(() => onClose())
        .catch(() => {}); // Error is handled by the redux slice
    }
  };

  // Handle OAuth login with direct URLs
  const handleOAuthLogin = (provider) => {
    // Use direct URLs based on environment
    const baseURL = import.meta.env.PROD
      ? 'https://collab-ide-ep5q.onrender.com' // Direct production API URL
      : 'http://localhost:5000';               // Direct local API URL
    
    // Log the redirect happening
    console.log(`OAuth redirect to: ${baseURL}/api/auth/${provider}`);
    
    try {
      // Save authentication state before redirecting
      localStorage.setItem('auth_in_progress', 'true');
      localStorage.setItem('auth_provider', provider);
      localStorage.setItem('auth_timestamp', Date.now());
      
      // Redirect to the backend's OAuth initiation route
      window.location.href = `${baseURL}/api/auth/${provider}`;
    } catch (error) {
      console.error('OAuth redirect error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-md overflow-hidden relative transition-transform">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {isLoginView ? 'Welcome back!' : 'Create an account'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isLoginView 
              ? 'Log in to access your account and continue your coding journey.' 
              : 'Join Collab IDE to start coding, collaborating and creating together.'}
          </p>
          
          {error && !error.includes('Email is already registered') && !error.includes('Username is already taken') && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Social login buttons */}
          <div className="flex flex-col gap-3 mb-4 mt-4">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
            >
              <Chrome size={20} /> Continue with Google
            </button>
            
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
            >
              <Github size={20} /> Continue with GitHub
            </button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {!isLoginView && (
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.username ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="johndoe"
                  />
                </div>
                {validationErrors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.username}</p>
                )}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="your@email.com"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.password ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="••••••••"
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.password}</p>
              )}
            </div>
            
            {!isLoginView && (
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border ${validationErrors.confirmPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="••••••••"
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin mr-2" />
                  {isLoginView ? 'Logging in...' : 'Signing up...'}
                </>
              ) : (
                <>
                  {isLoginView ? 'Log in' : 'Create account'}
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 text-center text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
          </span>{' '}
          <button 
            onClick={switchView} 
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            {isLoginView ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
