import { Sun, Moon, Play, Code, Laptop, Save, MenuIcon, X, Users, LogOut, UserPlus, HelpCircle, LogIn, ChevronDown, FolderOpen, FileText, Share2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import UserAvatar from './UserAvatar';
import FriendsMenu from './FriendsMenu'; 
import SaveFileButton from './SaveFileButton';
import ShareModal from './ShareModal'; 

function Navbar({ 
  language, 
  setLanguage, 
  languageOptions, 
  onRunCode, 
  theme, 
  toggleTheme, 
  autoSave, 
  toggleAutoSave, 
  isLoading,
  mobileView,
  toggleMobileView,
  isInRoom,
  currentUser,
  onOpenUserPanel,
  onLeaveRoom,
  onJoinRoom,
  onStartTour,
  onOpenAuthModal,
  currentFile,
  onSaveFile,
  onOpenFilesPanel,
  onOpenRecentFiles,
  code // Add code prop
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // Add state for share modal
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Add state for logout loading
  const userMenuRef = useRef(null);
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  const handleLanguageChange = (e) => {
    const selectedLanguage = languageOptions.find(lang => lang.id === e.target.value);
    if (selectedLanguage) { 
      setLanguage(selectedLanguage);
      setMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleRunClick = () => {
    onRunCode();
    if (window.innerWidth < 768 && mobileView === 'code') {
      toggleMobileView();
    }
    setMenuOpen(false);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onJoinRoom();
  };

  const handleLogout = () => {
    setIsLoggingOut(true); // Set loading state to true before dispatching logout
    dispatch(logout())
      .finally(() => {
        setIsLoggingOut(false); // Reset loading state when logout completes (success or error)
        setMenuOpen(false);
        setUserMenuOpen(false);
      });
  };

  const handleAuthClick = () => {
    setMenuOpen(false);
    onOpenAuthModal();
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
    setMenuOpen(false); // Close mobile menu if open
  };

  useEffect(() => {}, [theme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add an effect to listen for the close-mobile-navbar event
  useEffect(() => {
    const handleCloseMobileMenu = () => {
      if (menuOpen) {
        setMenuOpen(false);
      }
    };

    // Listen for the custom event
    window.addEventListener('close-mobile-navbar', handleCloseMobileMenu);
    
    // Listen for file selection events that should close the menu
    window.addEventListener('file-selected', handleCloseMobileMenu);

    return () => {
      window.removeEventListener('close-mobile-navbar', handleCloseMobileMenu);
      window.removeEventListener('file-selected', handleCloseMobileMenu);
    };
  }, [menuOpen]);

  // Export a method that can be called from outside to close the menu
  useEffect(() => {
    // Expose the menu close function globally so it can be called from other components
    window.closeNavbarMobileMenu = () => {
      if (menuOpen) {
        setMenuOpen(false);
      }
    };

    return () => {
      window.closeNavbarMobileMenu = undefined;
    };
  }, [menuOpen]);

  return (
    <nav id="navbar" className="navbar-component border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-2 px-3 sm:py-3 sm:px-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400">
            <Code className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">Collab IDE</span>
            <span className="sm:hidden">IDE</span>
          </div>
          
          <button 
            className="ml-2 sm:ml-4 p-1 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleMenu}
          >
            {menuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>

        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 lg:gap-3">
          {/* Friends Menu - Only show when user is authenticated */}
          {isAuthenticated && <FriendsMenu />}

          {/* Auth button in navbar */}
          {!isAuthenticated ? (
            <button
              id="login-button"
              onClick={handleAuthClick}
              className="flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogIn className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" />
              Log in
            </button>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-1 px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <UserAvatar user={user} size="sm" className="mr-1" />
                <span className="truncate max-w-[80px] lg:max-w-[100px]">{user?.username || user?.email}</span>
                <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 ml-1" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isLoggingOut ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-2" />
                          Log out
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isInRoom ? (
            <button
              id="collaboration-button"
              onClick={handleJoinRoom}
              type="button"
              className="flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <UserPlus className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
              Join Room
            </button>
          ) : (
            <>
              <div id="room-info" className="px-2 py-1 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                <div className="text-xs text-green-700 dark:text-green-300">Room: {currentUser?.name}</div>
              </div>
            
              <button
                id="users-panel-button"
                onClick={onOpenUserPanel}
                className="flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                <Users className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Users
              </button>
              
              <button
                id="leave-room-button"
                onClick={onLeaveRoom}
                className="flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <LogOut className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Leave
              </button>
            </>
          )}

          <div id="language-selector" className="flex items-center">
            <Laptop className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500 dark:text-gray-400 mr-1 lg:mr-2" />
            <select
              value={language.id}
              onChange={handleLanguageChange}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-32 lg:w-40 p-1.5 lg:p-2"
              disabled={isInRoom && !currentUser?.accessLevel === 'owner'}
            >
              {languageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <button
            id="auto-save-toggle"
            onClick={toggleAutoSave}
            className={`hidden lg:flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-opacity-80 transition-colors`}
            aria-label={autoSave ? "Disable auto-save" : "Enable auto-save"}
            title={autoSave ? "Your code will be saved automatically" : "Your code will not persist after refresh"}
          >
            <Save className={`w-3 h-3 lg:w-4 lg:h-4 mr-1 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span>Auto-save {autoSave ? 'On' : 'Off'}</span>
          </button>

          <button
            id="auto-save-toggle-icon"
            onClick={toggleAutoSave}
            className={`flex lg:hidden items-center p-1.5 rounded-md text-xs sm:text-sm border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-opacity-80 transition-colors`}
            aria-label={autoSave ? "Disable auto-save" : "Enable auto-save"}
            title={autoSave ? "Your code will be saved automatically" : "Your code will not persist after refresh"}
          >
            <Save className={`w-4 h-4 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
          </button>

          {isAuthenticated && (
            <>
              <SaveFileButton 
                onClick={onSaveFile} 
                currentFile={currentFile} 
                disabled={isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel)}
              />
              
              <button
                onClick={onOpenFilesPanel}
                className="hidden sm:flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FolderOpen className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" />
                Files
              </button>
              
              <button
                onClick={onOpenFilesPanel}
                className="sm:hidden flex items-center p-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              
              <button
                onClick={onOpenRecentFiles}
                className="hidden sm:flex items-center px-2 py-1.5 lg:px-3 rounded-md text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-1.5" />
                Recent
              </button>
              
              <button
                onClick={onOpenRecentFiles}
                className="sm:hidden flex items-center p-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 lg:px-3 text-xs sm:text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            title="Share code"
            onClick={handleShareClick} 
          >
            <Share2 className="h-3 w-3 lg:h-4 lg:w-4" /> 
            <span className="hidden md:block">Share</span>
          </button>
          
          <button
            className="sm:hidden flex items-center p-1.5 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            title="Share code"
            onClick={handleShareClick}
          >
            <Share2 className="h-4 w-4" />
          </button>
          
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            className="p-1.5 lg:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === 'dark' ? 
              <Sun className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" /> : 
              <Moon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
            }
          </button>

          <button
            id="help-button"
            onClick={onStartTour}
            className="p-1.5 lg:p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            aria-label="Show help"
            title="Show interactive tutorial"
          >
            <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>

          <button
            id="run-button"
            onClick={onRunCode}
            disabled={isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-md flex items-center space-x-1 lg:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors ${
              isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
            title="Run code (Ctrl+Enter)"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-3 w-3 lg:h-4 lg:w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span className="text-xs lg:text-sm">Running</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="text-xs lg:text-sm">Run</span>
                <span className="text-xs opacity-75 hidden xl:inline ml-1">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>

        <div className="md:hidden flex items-center space-x-1">
          {/* Mobile Friends Menu - only show when authenticated */}
          {isAuthenticated && <FriendsMenu isMobile={true} />}
          
          {/* Mobile Share Button */}
          <button
            onClick={handleShareClick}
            className="p-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            aria-label="Share code"
          >
            <Share2 className="w-4 h-4" />
          </button>
          
          {/* Mobile Auth Button */}
          {!isAuthenticated ? (
            <button
              onClick={handleAuthClick}
              className="p-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              aria-label="Log in"
            >
              <LogIn className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 overflow-hidden"
            >
              <UserAvatar user={user} size="sm" />
            </button>
          )}

          {isAuthenticated && (
            <SaveFileButton 
              onClick={onSaveFile} 
              currentFile={currentFile}
              isMobile={true}
              disabled={isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel)}
            />
          )}

          <button
            onClick={handleRunClick}
            disabled={isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))}
            className={`px-2 py-1.5 rounded-md flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors ${
              isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
            title="Run code"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className={`md:hidden ${menuOpen ? 'block' : 'hidden'} max-h-[70vh] overflow-y-auto pt-2 pb-2 space-y-2`}>
        {/* Add this mobile login button */}
        {isAuthenticated && (
          <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Logged in as {user.username || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            >
              {isLoggingOut ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </>
              )}
            </button>
          </div>
        )}

        <div className="px-2 space-y-2">
          {!isInRoom ? (
            <button
              onClick={handleJoinRoom}
              type="button"
              className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Join Room
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onOpenUserPanel();
                  setMenuOpen(false);
                }}
                type="button"
                className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              >
                <Users className="w-4 h-4 mr-2" />
                Users ({currentUser?.name})
              </button>
              
              <button
                onClick={() => {
                  onLeaveRoom();
                  setMenuOpen(false);
                }}
                type="button"
                className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Room
              </button>
            </>
          )}
        </div>
    
        <div className="flex items-center p-2">
          <Laptop className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
          <select
            value={language.id}
            onChange={handleLanguageChange}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 flex-1 p-1.5"
            disabled={isInRoom && !currentUser?.accessLevel === 'owner'}
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex px-2 space-x-2">
          <button
            onClick={toggleTheme}
            className="flex-1 py-1.5 px-3 rounded-md flex justify-center items-center space-x-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="text-sm">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-gray-700 mr-1" />
                <span className="text-sm">Dark Mode</span>
              </>
            )}
          </button>

          <button
            onClick={toggleAutoSave}
            className={`flex-1 py-1.5 px-3 rounded-md flex justify-center items-center space-x-1 border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Save className={`w-4 h-4 mr-1 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="text-sm">{autoSave ? 'Auto-save On' : 'Auto-save Off'}</span>
          </button>
        </div>

        {isAuthenticated && (
          <div className="flex px-2 space-x-2">
            <button
              onClick={() => {
                onOpenFilesPanel();
                setMenuOpen(false);
              }}
              className="flex-1 py-1.5 px-3 rounded-md flex justify-center items-center space-x-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              <span className="text-sm">Files</span>
            </button>
            
            <button
              onClick={() => {
                onOpenRecentFiles();
                setMenuOpen(false);
              }}
              className="flex-1 py-1.5 px-3 rounded-md flex justify-center items-center space-x-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FileText className="w-4 h-4 mr-1" />
              <span className="text-sm">Recent</span>
            </button>
          </div>
        )}

        <div className="px-2 pb-2">
          <button
            onClick={() => {
              handleShareClick();
              setMenuOpen(false);
            }}
            className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Code
          </button>
        </div>

        <div className="flex justify-center px-2">
          <button
            onClick={() => {
              onStartTour();
              setMenuOpen(false);
            }}
            className="w-full flex items-center justify-center py-1.5 px-3 rounded-md border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Show Tutorial
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)}
        code={code} // Use lowercase "code" prop from App.jsx, not the imported "Code" icon
        language={language}
      />
    </nav>
  );
}

export default Navbar;