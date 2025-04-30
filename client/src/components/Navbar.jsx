import { Sun, Moon, Play, Code, Laptop, Save, MenuIcon, X, Users, LogOut, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  onJoinRoom
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  
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

  useEffect(() => {}, [theme]);

  return (
    <nav className="navbar-component border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 px-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400">
            <Code className="w-6 h-6" />
            <span className="hidden sm:inline">Collab IDE</span>
            <span className="sm:hidden">IDE</span>
          </div>
          
          <button 
            className="ml-4 p-1 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleMenu}
          >
            {menuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-3">
          {!isInRoom ? (
            <button
              onClick={handleJoinRoom}
              type="button"
              className="flex items-center px-3 py-1.5 rounded-md text-sm border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Join Room
            </button>
          ) : (
            <>
              <button
                onClick={onOpenUserPanel}
                className="flex items-center px-3 py-1.5 rounded-md text-sm border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                <Users className="w-4 h-4 mr-1" />
                Users ({currentUser?.name})
              </button>
              
              <button
                onClick={onLeaveRoom}
                className="flex items-center px-3 py-1.5 rounded-md text-sm border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave Room
              </button>
            </>
          )}

          <div className="flex items-center">
            <Laptop className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
            <select
              value={language.id}
              onChange={handleLanguageChange}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-40 p-2"
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
            onClick={toggleAutoSave}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-opacity-80 transition-colors`}
            aria-label={autoSave ? "Disable auto-save" : "Enable auto-save"}
            title={autoSave ? "Your code will be saved automatically" : "Your code will not persist after refresh"}
          >
            <Save className={`w-4 h-4 mr-1 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            {autoSave ? 'Auto-save On' : 'Auto-save Off'}
          </button>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === 'dark' ? 
              <Sun className="w-5 h-5 text-yellow-400" /> : 
              <Moon className="w-5 h-5 text-gray-700" />
            }
          </button>

          <button
            onClick={onRunCode}
            disabled={isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors ${
              isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))
                ? 'opacity-70 cursor-not-allowed'
                : ''
            }`}
            title="Run code (Ctrl+Enter)"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
                <span className="text-xs opacity-75 hidden lg:inline ml-1">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>

        <button
          onClick={handleRunClick}
          disabled={isLoading || (isInRoom && !['owner', 'editor', 'runner'].includes(currentUser?.accessLevel))}
          className={`md:hidden px-3 py-1.5 rounded-md flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors ${
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

      <div className={`md:hidden ${menuOpen ? 'block' : 'hidden'} pt-3 pb-2 space-y-3`}>
        <div className="px-2 space-y-2">
          {!isInRoom ? (
            <button
              onClick={handleJoinRoom}
              type="button"
              className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
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
                className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
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
                className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Room
              </button>
            </>
          )}
        </div>
    
        <div className="flex items-center p-2">
          <Laptop className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <select
            value={language.id}
            onChange={handleLanguageChange}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 flex-1 p-2"
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
            className="flex-1 p-2 rounded-md flex justify-center items-center space-x-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
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
            className={`flex-1 p-2 rounded-md flex justify-center items-center space-x-1 border ${
              autoSave 
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Save className={`w-4 h-4 mr-1 ${autoSave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="text-sm">{autoSave ? 'Auto-save On' : 'Auto-save Off'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
