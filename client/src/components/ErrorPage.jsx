import { useRouteError, Link } from 'react-router-dom';

function ErrorPage() {
  const error = useRouteError();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Error: {error?.statusText || error?.message || 'Unknown error'}
        </p>
        <Link 
          to="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Go back to home
        </Link>
      </div>
    </div>
  );
}

export default ErrorPage;
