import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../utils/api';

function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    const processOAuthLogin = async () => {
      try {
        // Get token from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        console.log('OAuth callback received. Has token:', !!token);
        
        if (!token) {
          console.error("No token found in OAuth callback");
          setErrorMessage("No authentication token found in the URL. Please try logging in again.");
          setTimeout(() => navigate('/'), 3000);
          return;
        }
        
        // Store token in localStorage for API client to use
        localStorage.setItem('token', token);
        
        try {
          // Use the API client to get user data
          console.log('Fetching user data with token');
          const response = await api.auth.getMe();
          
          if (!response.data || !response.data.user) {
            throw new Error("Invalid response from server");
          }
          
          const userData = response.data.user;
          
          console.log("OAuth user data received:", userData);
          
          // Store auth data in Redux
          dispatch(setCredentials({
            user: userData,
            token
          }));
          
          // Store in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Redirect to home page
          navigate('/');
        } catch (error) {
          console.error("API error in OAuth callback:", error);
          setErrorMessage("Failed to retrieve your account information. Please try again.");
          localStorage.removeItem('token');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error("General OAuth callback error:", error);
        setErrorMessage("Authentication process failed. Please try again.");
        localStorage.removeItem('token');
        setTimeout(() => navigate('/'), 3000);
      }
    };
    
    processOAuthLogin();
  }, [dispatch, navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
          {errorMessage ? 'Authentication Error' : 'Processing Login'}
        </h2>
        
        {errorMessage ? (
          <div className="text-center">
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md">
              {errorMessage}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Redirecting you back...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we authenticate your account...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OAuthCallback;
