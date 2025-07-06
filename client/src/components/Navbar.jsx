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

  // Close mobile menu when clicking outside the navbar
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navbar = document.getElementById('navbar');
      if (navbar && !navbar.contains(event.target) && menuOpen) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Also close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setMenuOpen(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [menuOpen]);

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

  return (    <nav id="navbar" className="navbar-component border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-1 px-2 sm:py-1.5 sm:px-3 lg:py-2 lg:px-4 xl:py-2.5 xl:px-5 shadow-sm ">
      <div className="w-full flex items-center justify-between max-w-none min-w-0">
        <div className="flex items-center min-w-0 flex-shrink-0">
          <div className="flex items-center space-x-1 lg:space-x-1.5 xl:space-x-2 text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-blue-600 dark:text-blue-400 min-w-0">
            <Code className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 flex-shrink-0" />
            <span className="hidden sm:inline truncate min-w-0">Collab IDE</span>
            <span className="sm:hidden truncate min-w-0">IDE</span>
          </div>
          
          <button 
            className="ml-2 sm:ml-3 lg:ml-4 p-1 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
            onClick={toggleMenu}
          >
            {menuOpen ? <X size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>        <div className="hidden md:flex md:items-center md:gap-0.5 lg:gap-1 xl:gap-1.5 2xl:gap-2 flex-nowrap min-w-0">
          {/* Friends Menu - Only show when user is authenticated */}
          {isAuthenticated && <FriendsMenu />}

          {/* Auth button in navbar */}
          {!isAuthenticated ? (
            <button
              id="login-button"
              onClick={handleAuthClick}
              className="flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <LogIn className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" />
              <span className="hidden lg:inline">Log in</span>
            </button>
          ) : (
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-0.5 lg:space-x-1 xl:space-x-1 px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors max-w-[80px] lg:max-w-[200px] xl:max-w-[220px] 2xl:max-w-[240px] min-w-0"
              >
                <UserAvatar user={user} size="sm" className="flex-shrink-0" />
                <span className="truncate text-xs lg:text-sm xl:text-sm min-w-0">{user?.username || user?.email}</span>
                <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 flex-shrink-0" />
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
          )}          {!isInRoom ? (
            <button
              id="collaboration-button"
              onClick={handleJoinRoom}
              type="button"
              className="flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <UserPlus className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" />
              <span className="hidden lg:inline">Join Room</span>
            </button>
          ) : (
            <>
              <div id="room-info" className="px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md max-w-[60px] lg:max-w-[80px] xl:max-w-[100px] 2xl:max-w-[120px] flex-shrink-0 min-w-0">
                <div className="text-xs lg:text-sm xl:text-sm text-green-700 dark:text-green-300 truncate">Room: {currentUser?.name}</div>
              </div>
            
              <button
                id="users-panel-button"
                onClick={onOpenUserPanel}
                className="flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Users className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" />
                <span className="hidden lg:inline">Users</span>
              </button>
              
              <button
                id="leave-room-button"
                onClick={onLeaveRoom}
                className="flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <LogOut className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" /> 
                <span className="hidden lg:inline">Leave</span>
              </button>
            </>
          )}          <div id="language-selector" className="flex items-center min-w-0 flex-shrink-0">
            <Laptop className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-gray-500 dark:text-gray-400 mr-0.5 lg:mr-1 xl:mr-2 flex-shrink-0" />
            <select
              value={language.id}
              onChange={handleLanguageChange}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs lg:text-sm xl:text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-16 md:w-20 lg:w-24 xl:w-28 2xl:w-32 p-0.5 lg:p-1 xl:p-1.5 2xl:p-2 min-w-0"
              disabled={isInRoom && !currentUser?.accessLevel === 'owner'}
            >
              {languageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>          <button
            id="auto-save-toggle"
            onClick={toggleAutoSave}
            className={`hidden xl:flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-opacity-80 transition-colors whitespace-nowrap flex-shrink-0`}
            aria-label={autoSave ? "Disable auto-save" : "Enable auto-save"}
            title={autoSave ? "Your code will be saved automatically" : "Your code will not persist after refresh"}
          >
            <Save className={`w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span>Auto-save {autoSave ? 'On' : 'Off'}</span>
          </button>

          <button
            id="auto-save-toggle-icon"
            onClick={toggleAutoSave}
            className={`flex xl:hidden items-center p-0.5 lg:p-1 rounded-md text-xs border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-opacity-80 transition-colors flex-shrink-0`}
            aria-label={autoSave ? "Disable auto-save" : "Enable auto-save"}
            title={autoSave ? "Your code will be saved automatically" : "Your code will not persist after refresh"}
          >
            <Save className={`w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
          </button>          {isAuthenticated && (
            <>
              <SaveFileButton 
                onClick={onSaveFile} 
                currentFile={currentFile} 
                disabled={isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel)}
              />
              
              <button
                onClick={onOpenFilesPanel}
                className="hidden lg:flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <FolderOpen className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" />
                Files
              </button>
              
              <button
                onClick={onOpenFilesPanel}
                className="lg:hidden flex items-center p-0.5 lg:p-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Files"
              >
                <FolderOpen className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
              </button>
              
              <button
                onClick={onOpenRecentFiles}
                className="hidden lg:flex items-center px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs lg:text-sm xl:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <FileText className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 mr-0.5 lg:mr-1 xl:mr-1.5 flex-shrink-0" />
                Recent
              </button>
              
              <button
                onClick={onOpenRecentFiles}
                className="lg:hidden flex items-center p-0.5 lg:p-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Recent Files"
              >
                <FileText className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
              </button>
            </>
          )}          <button
            className="hidden lg:flex items-center gap-0.5 lg:gap-1 xl:gap-1 px-1 py-0.5 lg:px-1.5 lg:py-1 xl:px-2 xl:py-1.5 2xl:px-3 2xl:py-2 text-xs lg:text-sm xl:text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 whitespace-nowrap flex-shrink-0"
            title="Share code"
            onClick={handleShareClick} 
          >
            <Share2 className="h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4 flex-shrink-0" /> 
            <span>Share</span>
          </button>
          
          <button
            className="lg:hidden flex items-center p-0.5 lg:p-1 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex-shrink-0"
            title="Share code"
            onClick={handleShareClick}
          >
            <Share2 className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
          </button>
            <button
            id="theme-toggle"
            onClick={toggleTheme}
            className="p-0.5 lg:p-1 xl:p-1.5 2xl:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === 'dark' ? 
              <Sun className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-yellow-400" /> : 
              <Moon className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5 text-gray-700" />
            }
          </button>

          <button
            id="help-button"
            onClick={onStartTour}
            className="p-0.5 lg:p-1 xl:p-1.5 2xl:p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0"
            aria-label="Show help"
            title="Show interactive tutorial"
          >
            <HelpCircle className="w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
          </button>

          <button
            id="run-button"
            onClick={onRunCode}
            disabled={isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))}
            className={`px-1.5 lg:px-2 xl:px-3 2xl:px-4 py-0.5 lg:py-1 xl:py-1.5 2xl:py-2 rounded-md flex items-center space-x-0.5 lg:space-x-1 xl:space-x-1.5 2xl:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors flex-shrink-0 ${
              isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
            title="Run code (Ctrl+Enter)"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-3 w-3 lg:h-4 lg:w-4 xl:h-4 xl:w-4 border-2 border-white border-t-transparent rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm xl:text-sm whitespace-nowrap">Running</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 lg:w-4 lg:h-4 xl:w-4 xl:h-4 flex-shrink-0" />
                <span className="text-xs lg:text-sm xl:text-sm whitespace-nowrap">Run</span>
                <span className="text-xs lg:text-sm xl:text-sm opacity-75 hidden xl:inline ml-0.5">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>        <div className="md:hidden flex items-center space-x-1 flex-shrink-0">
          {/* Mobile Friends Menu - only show when authenticated */}
          {isAuthenticated && <FriendsMenu isMobile={true} />}
          
          {/* Mobile Share Button */}
          <button
            onClick={handleShareClick}
            className="p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            aria-label="Share code"
          >
            <Share2 className="w-3 h-3 flex-shrink-0" />
          </button>
          
          {/* Mobile Auth Button */}
          {!isAuthenticated ? (
            <button
              onClick={handleAuthClick}
              className="p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              aria-label="Log in"
            >
              <LogIn className="w-3 h-3 flex-shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 overflow-hidden"
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
            className={`px-1.5 py-1 rounded-md flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors flex-shrink-0 ${
              isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
            title="Run code"
          >
            {isLoading ? (
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full flex-shrink-0"></div>
            ) : (
              <Play className="w-3 h-3 flex-shrink-0" />
            )}
          </button>
        </div>
      </div>      <div className={`md:hidden ${menuOpen ? 'block' : 'hidden'} max-h-[calc(100vh-80px)] overflow-y-auto pt-2 pb-2 space-y-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700`}>
        {/* Add this mobile login button */}
        {isAuthenticated && (
          <div className="px-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                Logged in as {user.username || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
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
        )}        <div className="px-3 space-y-2">
          {!isInRoom ? (
            <button
              onClick={handleJoinRoom}
              type="button"
              className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            >
              <UserPlus className="w-4 h-4 mr-2 flex-shrink-0" />
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
                className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              >
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                Users ({currentUser?.name})
              </button>
              
              <button
                onClick={() => {
                  onLeaveRoom();
                  setMenuOpen(false);
                }}
                type="button"
                className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                Leave Room
              </button>
            </>
          )}
        </div>        <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <Laptop className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
          <label className="text-xs text-gray-600 dark:text-gray-400 mr-2 flex-shrink-0">Language:</label>
          <select
            value={language.id}
            onChange={handleLanguageChange}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 flex-1 p-2 min-w-0"
            disabled={isInRoom && !currentUser?.accessLevel === 'owner'}
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div><div className="flex px-3 space-x-2">
          <button
            onClick={toggleTheme}
            className="flex-1 py-2 px-3 rounded-md flex justify-center items-center space-x-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-yellow-400 mr-1 flex-shrink-0" />
                <span className="text-sm">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-gray-700 mr-1 flex-shrink-0" />
                <span className="text-sm">Dark Mode</span>
              </>
            )}
          </button>

          <button
            onClick={toggleAutoSave}
            className={`flex-1 py-2 px-3 rounded-md flex justify-center items-center space-x-1 border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Save className={`w-4 h-4 mr-1 flex-shrink-0 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="text-sm">{autoSave ? 'Auto-save On' : 'Auto-save Off'}</span>
          </button>
        </div>        {isAuthenticated && (
          <div className="flex px-3 space-x-2">
            <button
              onClick={() => {
                onOpenFilesPanel();
                setMenuOpen(false);
              }}
              className="flex-1 py-2 px-3 rounded-md flex justify-center items-center space-x-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FolderOpen className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="text-sm">Files</span>
            </button>
            
            <button
              onClick={() => {
                onOpenRecentFiles();
                setMenuOpen(false);
              }}
              className="flex-1 py-2 px-3 rounded-md flex justify-center items-center space-x-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FileText className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="text-sm">Recent</span>
            </button>
          </div>
        )}        <div className="px-3 pb-2">
          <button
            onClick={() => {
              handleShareClick();
              setMenuOpen(false);
            }}
            className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2 flex-shrink-0" />
            Share Code
          </button>
        </div>

        <div className="flex justify-center px-3">
          <button
            onClick={() => {
              onStartTour();
              setMenuOpen(false);
            }}
            className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          >
            <HelpCircle className="w-4 h-4 mr-2 flex-shrink-0" />
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