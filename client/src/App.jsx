import React, { useState, useEffect, useMemo, Component, useCallback } from 'react';
import { Provider } from 'react-redux'; 
import { store } from './store';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
import { toast } from 'react-hot-toast'; // Add this import
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import RoomJoinModal from './components/RoomJoinModal';
import AuthModal from './components/AuthModal';
import OAuthCallback from './components/OAuthCallback';
import FilesPanel from './components/FilesPanel';
import RecentFiles from './components/RecentFiles';
import UserPanel from './components/UserPanel'; // Add this import
import FileDialog from './components/FileDialog'; // Add this import
import SharedCodeViewer from './components/SharedCodeViewer'; // Import the new component
import LeetcodeSolutions from './components/LeetcodeSolutions'; // Import the new component
import { languageOptions } from './constants/languageOptions';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { FriendsProvider } from './contexts/FriendsContext'; // Import FriendsProvider
import api, { getConnectedSocket } from './utils/api';
import { Analytics } from "@vercel/analytics/react"
import { 
  createMainTour, 
  createCollaborationTour, 
  createInputPanelTour,
  hasTourBeenSeen
} from './utils/tours';
import './App.css';

// ErrorBoundary component to catch errors in CodeEditor
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Reset error state when children change
    if (prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return typeof this.props.fallback === 'function' 
        ? this.props.fallback() 
        : this.props.fallback;
    }

    return this.props.children;
  }
}

function CollaborativeApp() {
  const { 
    isInRoom, 
    currentUser, 
    checkPermission, 
    leaveRoom,
    roomId
  } = useRoom();
  
  const [language, setLanguage] = useState(() => {
    const savedLanguageId = localStorage.getItem('selectedLanguage');
    return savedLanguageId 
      ? languageOptions.find(lang => lang.id === savedLanguageId) || languageOptions[0]
      : languageOptions[0];
  });
  
  const [code, setCode] = useState('');
  const [theme, setTheme] = useState(() => {
    // First check localStorage for saved preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // Use saved preference
      return savedTheme;
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      // Save this preference
      localStorage.setItem('theme', initialTheme);
      return initialTheme;
    }
  });
  const [output, setOutput] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('default-session');
  const [activeTab, setActiveTab] = useState('output');
  const [autoSave, setAutoSave] = useState(() => {
    return localStorage.getItem('autoSave') === 'true';
  });

  const [mobileView, setMobileView] = useState('code');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Add this state
  const [socket, setSocket] = useState(null);

  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [isRecentFilesOpen, setIsRecentFilesOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false); // Add this state

  const toggleMobileView = () => {
    setMobileView(prev => prev === 'code' ? 'output' : 'code');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileView('code');
      }
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  useEffect(() => {
    localStorage.setItem('selectedLanguage', language.id);
  }, [language]);

  const toggleAutoSave = () => {
    const newAutoSave = !autoSave;
    setAutoSave(newAutoSave);
    localStorage.setItem('autoSave', newAutoSave.toString());
    
    if (newAutoSave && code) {
      localStorage.setItem(`code_${language.id}`, code);
      console.log(`Code saved for ${language.id}: ${code.substring(0, 30)}...`);
    } else if (!newAutoSave) {
      console.log('Auto-save disabled');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#1a1b26' : '#ffffff');
    }
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 5);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.dataset.theme = theme;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1b26' : '#ffffff');
    }
  }, [theme]);

  // Also listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only update if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', e.matches);
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
      }
    };
    
    // Add event listener for theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (isInRoom && roomId) {
      const initSocket = async () => {
        try {
          const socketInstance = await getConnectedSocket();
          setSocket(socketInstance);
          
          setSessionId(roomId);
          
          // Setup socket event listeners
          const codeUpdateHandler = (data) => {
            if (data.roomId === roomId) {
              setCode(data.code);
            }
          };
          
          const outputUpdateHandler = (data) => {
            if (data.roomId === roomId) {
              setOutput(data.output);
              setInput(data.input);
              setActiveTab('output');
            }
          };
          
          const languageChangeHandler = (data) => {
            if (data.roomId === roomId) {
              const newLanguage = languageOptions.find(lang => lang.id === data.languageId);
              if (newLanguage) {
                setLanguage(newLanguage);
              }
            }
          };
          
          // Register event handlers
          socketInstance.on('code-update', codeUpdateHandler);
          socketInstance.on('output-update', outputUpdateHandler);
          socketInstance.on('language-change', languageChangeHandler);
          
          // Return cleanup function
          return () => {
            socketInstance.off('code-update', codeUpdateHandler);
            socketInstance.off('output-update', outputUpdateHandler);
            socketInstance.off('language-change', languageChangeHandler);
          };
        } catch (error) {
          console.error('Failed to initialize socket:', error);
          return () => {};
        }
      };
      
      // Initialize socket and store the cleanup function
      const cleanup = initSocket();
      return () => cleanup.then(cleanupFn => cleanupFn());
    } else {
      setSessionId('default-session');
      return () => {};
    }
  }, [isInRoom, roomId]);

  useEffect(() => {
    const handleRoomCodeReceived = (event) => {
      if (event.detail && event.detail.code) {
        setCode(event.detail.code);
        console.log("Received initial code from room");
      }
    };
    
    window.addEventListener('room-code-received', handleRoomCodeReceived);
    return () => {
      window.removeEventListener('room-code-received', handleRoomCodeReceived);
    };
  }, []);

  // Add an effect to show a toast notification when joining a room via invitation
  useEffect(() => {
    const handleInvitationAccepted = (event) => {
      if (event.detail) {
        toast.success(`Joined room successfully!`, {
          position: "top-right",
          duration: 3000
        });
      }
    };
    
    window.addEventListener('room-invitation-accepted', handleInvitationAccepted);
    return () => {
      window.removeEventListener('room-invitation-accepted', handleInvitationAccepted);
    };
  }, []);

  const handleLanguageChange = (newLanguage) => {
    if (isInRoom && !checkPermission('CHANGE_LANGUAGE')) {
      return;
    }
    
    if (autoSave && code) {
      localStorage.setItem(`code_${language.id}`, code);
    }
    
    setLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage.id);
    
    const savedCode = autoSave ? localStorage.getItem(`code_${newLanguage.id}`) : null;
    if (savedCode) {
      setCode(savedCode);
    } else {
      const defaultCode = CodeEditor.getLanguageDefaultCode(newLanguage.value);
      setCode(defaultCode);
    }

    if (isInRoom && socket) {
      socket.emit('language-change', {
        roomId,
        userId: currentUser.id,
        languageId: newLanguage.id
      });
    }
  };

  const handleCodeChange = async (newCode) => {
    if (newCode !== undefined && newCode !== null) {
      setCode(newCode);
      
      if (isInRoom && checkPermission('EDIT_CODE')) {
        try {
          const socketInstance = await getConnectedSocket();
          socketInstance.emit('code-change', {
            roomId,
            userId: currentUser.id,
            code: newCode
          });
        } catch (error) {
          console.error('Failed to send code change:', error);
        }
      }
    }
  };

  const handleRunCode = useCallback(async () => {
    if (loading) return;
    
    if (isInRoom && !checkPermission('RUN_CODE')) {
      setError("You don't have permission to run code");
      return;
    }
    
    if (window.innerWidth < 768 && mobileView === 'code') {
      setMobileView('output');
    }
    
    if (activeTab === 'input') {
      setActiveTab('output');
    }
    
    setError(null);
    try {
      setLoading(true);
      const response = await api.execute.runCode(sessionId, { 
        code, 
        language: language.id, 
        input 
      });
      setOutput(response.data);

      if (isInRoom && socket) {
        socket.emit('output-update', {
          roomId,
          userId: currentUser.id,
          output: response.data,
          input
        });
      }
    } catch (error) {
      console.error('Error executing code:', error);
      const errorMessage = error.message || 
                          error.details?.message || 
                          'An error occurred while executing your code.';
      setOutput(null);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, isInRoom, checkPermission, mobileView, activeTab, sessionId, code, language.id, input, socket, roomId, currentUser]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, language.id, input, loading, isInRoom, currentUser?.accessLevel, handleRunCode]);

  useEffect(() => {
    let codeToUse;
    
    if (autoSave) {
      const savedCode = localStorage.getItem(`code_${language.id}`);
      if (savedCode) {
        codeToUse = savedCode;
        console.log(`Loading saved code for ${language.id}`);
      } else {
        // Use a safer way to get default code
        codeToUse = language.defaultCode || '';
        console.log(`No saved code found for ${language.id}, using default`);
      }
    } else {
      // Use a safer way to get default code
      codeToUse = language.defaultCode || '';
      console.log(`Auto-save disabled, using default code for ${language.id}`);
    }
    
    setCode(codeToUse);
  }, [autoSave, language.id, language.defaultCode]);

  useEffect(() => {
    if (!isInRoom) {
      const saveCode = () => {
        if (autoSave && code && language) {
          localStorage.setItem(`code_${language.id}`, code);
          console.log(`Auto-saving code for ${language.id}`);
        }
      };
      
      const timeoutId = setTimeout(saveCode, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [code, language, autoSave, isInRoom]);

  // Tour state management - improved approach
  const [currentTour, setCurrentTour] = useState(null);
  const [roomJoined, setRoomJoined] = useState(false);

  // Initialize tours with proper checks
  useEffect(() => {
    // Check if this is first visit for main tour
    if (!hasTourBeenSeen('main')) {
      // First time visitor - wait a bit before showing tour
      const timer = setTimeout(() => {
        const tour = createMainTour();
        setCurrentTour(tour);
        tour.drive();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Show collaboration tour when joining a room for the first time
  useEffect(() => {
    // Track when user joins a room to show the tour
    if (isInRoom && !roomJoined) {
      setRoomJoined(true);
      
      // Check if user has seen the collab tour before
      if (!hasTourBeenSeen('collab')) {
        // Small delay to ensure room components are fully rendered
        const timer = setTimeout(() => {
          // Open the user panel first before starting the tour
          setIsUserPanelOpen(true);
          
          // Then start the tour after a short delay to ensure panel is visible
          setTimeout(() => {
            const tour = createCollaborationTour();
            setCurrentTour(tour);
            tour.drive();
            console.log("Starting collaboration tour from isInRoom effect");
          }, 300);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    } else if (!isInRoom) {
      // Reset room joined state when leaving a room
      setRoomJoined(false);
    }
  }, [isInRoom, roomJoined]);

  // Listen for room-joined events from socket to show tour immediately
  useEffect(() => {
    const handleRoomJoined = (event) => {
      const freshJoin = event.detail?.freshJoin;
      console.log("Room joined event detected:", event.detail);
      
      // Only show the tour if this is a fresh join (not a refresh/reconnect)
      if (freshJoin && !hasTourBeenSeen('collab')) {
        // Cancel any existing tours
        if (currentTour) {
          currentTour.destroy();
        }
        
        const timer = setTimeout(() => {
          // Open the user panel first
          setIsUserPanelOpen(true);
          
          // Then start the tour after panel is open
          setTimeout(() => {
            const tour = createCollaborationTour();
            setCurrentTour(tour);
            tour.drive();
            console.log("Starting collaboration tour from event");
          }, 300);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    };
    
    window.addEventListener('room-joined-event', handleRoomJoined);
    return () => {
      window.removeEventListener('room-joined-event', handleRoomJoined);
    };
  }, [currentTour]);

  // Show input panel tour when switching to input tab for the first time
  useEffect(() => {
    if (activeTab === 'input' && !hasTourBeenSeen('input')) {
      const timer = setTimeout(() => {
        const tour = createInputPanelTour();
        setCurrentTour(tour);
        tour.drive();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Clean up any active tour when component unmounts
  useEffect(() => {
    return () => {
      if (currentTour) {
        currentTour.destroy();
      }
    };
  }, [currentTour]);

  // Handle tour start
  const handleStartTour = () => {
    // Destroy any existing tour
    if (currentTour) {
      currentTour.destroy();
    }
    
    // Determine appropriate tour based on context
    let tour;
    try {
      if (isInRoom) {
        tour = createCollaborationTour();
      } else if (activeTab === 'input') {
        tour = createInputPanelTour();
      } else {
        tour = createMainTour();
      }
      
      // Validate that we have a tour object
      if (!tour) {
        console.error('Failed to create tour');
        return;
      }
      
      // Add global click handler to close tour when clicking outside
      const handleGlobalClick = (event) => {
        // Check if click is on the overlay (outside the popover)
        if (event.target.classList.contains('driver-overlay')) {
          tour.destroy();
          document.removeEventListener('click', handleGlobalClick);
        }
      };
      
      // Add event listener after a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', handleGlobalClick);
      }, 500);
      
      // Store cleanup function directly on the tour object instead of modifying options
      tour._cleanupClickHandler = () => {
        document.removeEventListener('click', handleGlobalClick);
      };
      
      // Add our own cleanup handler that will run when the tour is destroyed
      const originalDestroy = tour.destroy;
      tour.destroy = function() {
        // Call the original destroy method
        originalDestroy.apply(this, arguments);
        
        // Run our cleanup
        if (typeof tour._cleanupClickHandler === 'function') {
          tour._cleanupClickHandler();
        }
      };
      
      // Store the tour in state
      setCurrentTour(tour);
      
      // Start the tour
      tour.drive();
    } catch (error) {
      console.error('Error starting tour:', error);
      toast.error('Failed to start the tutorial');
    }
  };

  // Handle mobile view switching from tour events
  useEffect(() => {
    const handleViewSwitch = (e) => {
      if (e.detail === 'code' || e.detail === 'output') {
        setMobileView(e.detail);
      }
    };
    
    // Add event listener to handle closing mobile navbar when a file is selected
    const handleCloseMobileNavbar = () => {
      // Toggle mobile navbar menu (assuming this is what we need to close)
      const navbarToggle = document.querySelector('.navbar-component button[aria-label="Toggle menu"]');
      if (navbarToggle && window.innerWidth < 768) {
        try {
          // If there's a React handler, we need to find it and call it
          // This is a backup approach; using custom events is better
          const menuOpen = document.querySelector('.navbar-component .md\\:hidden.flex, .navbar-component .md\\:hidden.block');
          
          if (menuOpen) {
            // Simulate a click on the navbar toggle button
            navbarToggle.click();
          }
        } catch (error) {
          console.debug('Error toggling mobile nav:', error);
        }
      }
    };
    
    window.addEventListener('switch-mobile-view', handleViewSwitch);
    window.addEventListener('close-mobile-navbar', handleCloseMobileNavbar);
    
    return () => {
      window.removeEventListener('switch-mobile-view', handleViewSwitch);
      window.removeEventListener('close-mobile-navbar', handleCloseMobileNavbar);
    };
  }, []);

  // Handle room modal open/close with tracking
  const handleOpenRoomModal = () => {
    // Flag that this is a manual room action (for error logging purposes)
    window.lastRoomAction = 'manual';
    setIsRoomModalOpen(true);
  };
  
  const handleCloseRoomModal = () => {
    setIsRoomModalOpen(false);
  };

  const handleFileSelect = (file) => {
    try {
      if (!file || !file.code) {
        toast.error('The selected file appears to be invalid');
        return;
      }
      
      setCode(file.code);
      const selectedLanguage = languageOptions.find(lang => lang.id === file.language);
      if (selectedLanguage) {
        setLanguage(selectedLanguage);
      } else {
        console.warn(`Language ${file.language} not found in options, using current language`);
      }
      
      setCurrentFile(file);
      // If on mobile, switch to code view
      if (window.innerWidth < 768) {
        setMobileView('code');
      }
    } catch (error) {
      console.error('Error handling file selection:', error);
      toast.error('Failed to load selected file');
    }
  };

  const handleSaveFile = () => {
    if (currentFile) {
      // If we have a current file, update it
      handleUpdateFile();
    } else {
      // Open file dialog directly instead of files panel
      setIsFileDialogOpen(true);
    }
  };

  const handleUpdateFile = async () => {
    if (!currentFile) return;
    
    try {
      const response = await api.files.updateFile(currentFile._id, {
        code,
        language: language.id
      });
      
      // Check response before assuming success
      if (response && response.data) {
        setCurrentFile(response.data);
        toast.success('File updated successfully');
      } else {
        throw new Error('Failed to update file - unexpected response');
      }
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error(error.message || 'Failed to update file');
    }
  };

  const handleSaveFileFromDialog = async (fileData) => {
    try {
      const response = await api.files.saveCurrentCode({
        name: fileData.name,
        code,
        language: language.id,
        directoryId: fileData.directoryId,
        isPublic: fileData.isPublic
      });
      
      if (response && response.data && response.data.success) {
        setCurrentFile(response.data.file);
        toast.success('File saved successfully');
      } else {
        throw new Error('Failed to save file - unexpected response');
      }
      
      setIsFileDialogOpen(false);
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error(error.message || 'Failed to save file');
    }
  };

  const handleSaveSuccess = (savedFile) => {
    setCurrentFile(savedFile);
    toast.success('Code saved successfully');
  };

  const editorKey = useMemo(() => 
    isInRoom ? `editor-room-${roomId}` : `editor-local-${language.id}`, 
    [isInRoom, roomId, language.id]
  );


  return (
    <div className={`h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${theme === 'dark' ? 'dark-mode' : 'light-mode'}`}>
      <Navbar 
        language={language}
        setLanguage={handleLanguageChange}
        languageOptions={languageOptions}
        onRunCode={handleRunCode}
        theme={theme}
        toggleTheme={toggleTheme}
        autoSave={autoSave}
        toggleAutoSave={toggleAutoSave}
        isLoading={loading}
        mobileView={mobileView}
        toggleMobileView={toggleMobileView}
        isInRoom={isInRoom}
        currentUser={currentUser}
        onOpenUserPanel={() => setIsUserPanelOpen(true)}
        onLeaveRoom={leaveRoom}
        onJoinRoom={handleOpenRoomModal}
        onStartTour={handleStartTour}
        onOpenAuthModal={() => setIsAuthModalOpen(true)} // Add this prop
        currentFile={currentFile}
        onSaveFile={handleSaveFile}
        onOpenFilesPanel={() => setIsFilesPanelOpen(true)}
        onOpenRecentFiles={() => setIsRecentFilesOpen(true)}
        code={code} 
      />
      
      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setMobileView('code')}
          className={`flex-1 py-2 text-center text-sm font-medium ${
            mobileView === 'code'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Code Editor
        </button>
        <button
          onClick={() => setMobileView('output')}
          className={`flex-1 py-2 text-center text-sm font-medium ${
            mobileView === 'output'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Output / Input
        </button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div 
          id="code-editor"
          className={`md:w-3/5 w-full h-full border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            mobileView === 'output' ? 'hidden md:block' : 'block'
          } ${isMobile ? 'pb-12' : ''}`}
        >
          <ErrorBoundary fallback={<div className="p-4 text-red-500">Error loading editor. Please refresh the page.</div>}>
            <CodeEditor
              key={editorKey} // Add a key to recreate component when room changes
              code={code}
              setCode={handleCodeChange}
              language={language.value}
              theme={theme}
              onRunCode={handleRunCode}
              readOnly={isInRoom && !checkPermission('EDIT_CODE')}
            />
          </ErrorBoundary>
        </div>
        
        <div 
          id="output-panel"
          className={`md:w-2/5 w-full h-full transition-all duration-300 ${
            mobileView === 'code' ? 'hidden md:block' : 'block'
          } ${isMobile ? 'pb-12' : ''}`}
        >
          <OutputPanel 
            output={output} 
            input={input} 
            setInput={setInput} 
            loading={loading}
            error={error}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            readOnly={isInRoom && !checkPermission('RUN_CODE')}
          />
        </div>
        
        {isInRoom && (
          <UserPanel 
            isOpen={isUserPanelOpen} 
            onClose={() => setIsUserPanelOpen(false)} 
          />
        )}
      </div>
      
      <RoomJoinModal 
        isOpen={isRoomModalOpen} 
        onClose={handleCloseRoomModal}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <FilesPanel
        isOpen={isFilesPanelOpen}
        onClose={() => setIsFilesPanelOpen(false)}
        onFileSelect={handleFileSelect}
        currentCode={code}
        currentLanguage={language.id}
        onSaveSuccess={handleSaveSuccess}
      />
      
      {isRecentFilesOpen && (
        <RecentFiles 
          onFileSelect={handleFileSelect}
          onClose={() => setIsRecentFilesOpen(false)}
        />
      )}

      <FileDialog
        isOpen={isFileDialogOpen}
        onClose={() => setIsFileDialogOpen(false)}
        onSave={handleSaveFileFromDialog}
        initialValues={{ 
          language: language.id, // Still pass the language in initialValues
          name: `${language.name.toLowerCase()}_code`
        }}
        title="Save Code As"
        submitLabel="Save"
        mode="create"
        currentDirectory={null}
      />
    </div>
  );
}

// Main app component that handles routing
function AppContent() {
  return (
    <Routes>
      <Route path="/shared/:slug" element={<SharedCodeViewer />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/leetcode" element={<LeetcodeSolutions />} /> {/* Add this line */}
      <Route path="/*" element={<CollaborativeApp />} />
    </Routes>
  );
}

function App() {
  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = (event) => {
      toast.error(event.detail.message || "Your session has expired. Please log in again.", {
        duration: 5000,
        position: 'top-right'
      });
    };
    
    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  return (
    <Provider store={store}>
      <FriendsProvider>
        <RoomProvider>
          <AppContent />
        </RoomProvider>
      </FriendsProvider>
      <Analytics />
    </Provider>
  );
}

export default App;
