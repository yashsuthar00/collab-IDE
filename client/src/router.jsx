import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import RoomPage from './pages/RoomPage';
import OAuthCallback from './components/OAuthCallback';
import ErrorPage from './components/ErrorPage';
import { RoomProvider } from './contexts/RoomContext';

// Create router with the correct paths and components
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />
  },
  {
    path: '/room/:slug',
    element: (
      <RoomProvider>
        <RoomPage />
      </RoomProvider>
    ),
    errorElement: <ErrorPage />
  },
  {
    path: '/oauth-callback',
    element: <OAuthCallback />,
  }
]);

export default router;
