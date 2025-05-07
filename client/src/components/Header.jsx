import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { Menu, X, LogOut, Settings, User as UserIcon } from 'lucide-react';
import AuthModal from './AuthModal';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Collab IDE
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="relative ml-3">
                <div>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex rounded-full bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    id="user-menu-button"
                  >
                    <span className="sr-only">Open user menu</span>
                    {user?.avatar ? (
                      <img className="h-8 w-8 rounded-full object-cover" src={user.avatar} alt={user.username} />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>
                </div>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                  >
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}

export default Header;
