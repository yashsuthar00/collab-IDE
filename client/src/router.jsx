import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import OAuthCallback from './components/OAuthCallback';
import ErrorPage from './components/ErrorPage';

// Create router with the correct paths and components
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: '/room/:roomId',
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: '/oauth-callback',
    element: <OAuthCallback />,
  }
]);

export default router;
