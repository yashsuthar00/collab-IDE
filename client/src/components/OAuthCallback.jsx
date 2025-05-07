import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../utils/api'; // Import API client

function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  useEffect(() => {
    const processOAuthLogin = async () => {
      try {
        // Get token from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        console.log('OAuth callback received. Has token:', !!token);
        
        if (!token) {
          console.error("No token found in OAuth callback");
          navigate('/login?error=missing_token');
          return;
        }
        
        // Store token in localStorage for API client to use
        localStorage.setItem('token', token);
        
        try {
          // Use the API client to get user data
          console.log('Fetching user data with token');
          const response = await api.auth.getMe();
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
          localStorage.removeItem('token');
          navigate('/login?error=api_error');
        }
      } catch (error) {
        console.error("General OAuth callback error:", error);
        localStorage.removeItem('token');
        navigate('/login?error=unknown');
      }
    };
    
    processOAuthLogin();
  }, [dispatch, navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Processing Login</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}

export default OAuthCallback;
