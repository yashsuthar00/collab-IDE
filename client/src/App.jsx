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
  const [editorWidth, setEditorWidth] = useState(60); // Default editor width percentage
  const [isDragging, setIsDragging] = useState(false);
  const [showDividerHint, setShowDividerHint] = useState(() => {
    // Only show hint if user hasn't seen it before
    return localStorage.getItem('dividerHintSeen') !== 'true';
  });

  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Add this state
  const [socket, setSocket] = useState(null);

  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [isRecentFilesOpen, setIsRecentFilesOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false); // Add this state


  const [isPanelsSwapped, setIsPanelsSwapped] = useState(() => {
    // Load user preference from localStorage
    return localStorage.getItem('panelsSwapped') === 'true';
  });

  // State to track which hint to show
  const [showSwapHint, setShowSwapHint] = useState(false);

  // Auto-hide the divider hint after a few seconds
  useEffect(() => {
    if (showDividerHint) {
      const timer = setTimeout(() => {
        setShowDividerHint(false);
        // Mark hint as seen in localStorage
        localStorage.setItem('dividerHintSeen', 'true');
      }, 3000); // Hide after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showDividerHint]);

  // Show swap hint after drag hint disappears
  useEffect(() => {
    if (!showDividerHint && !localStorage.getItem('swapHintSeen')) {
      // Show the swap hint only after the drag hint is gone
      const timer = setTimeout(() => {
        setShowSwapHint(true);
      }, 3000); // Short delay after drag hint disappears
      
      return () => clearTimeout(timer);
    }
  }, [showDividerHint]);

  // Auto-hide the swap hint after a few seconds
  useEffect(() => {
    if (showSwapHint) {
      const timer = setTimeout(() => {
        setShowSwapHint(false);
        // Mark hint as seen in localStorage
        localStorage.setItem('swapHintSeen', 'true');
      }, 5000); // Hide after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showSwapHint]);

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

  // Add handlers for draggable divider
  const handleDragStart = (e) => {
    // Prevent default to avoid text selection during drag
    e.preventDefault();
    
    // Get clientX from mouse or touch event
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    // Cache the initial positions for smoother dragging
    const container = document.querySelector('.flex.flex-1.overflow-hidden');
    if (container) {
      const rect = container.getBoundingClientRect();
      
      // Store initial values globally for performance
      window._dragData = {
        containerLeft: rect.left,
        containerWidth: rect.width,
        startX: clientX
      };
    }
    
    // Disable transitions during drag for better performance
    const codeEditor = document.getElementById('code-editor');
    const outputPanel = document.getElementById('output-panel');
    if (codeEditor) codeEditor.style.transition = 'none';
    if (outputPanel) outputPanel.style.transition = 'none';
    
    // Apply styles directly for instant feedback
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('dragging');
    
    // Add active class to the divider
    const divider = e.currentTarget;
    divider.classList.add('bg-blue-400', 'dark:bg-blue-600');
    
    // Hide divider hint immediately if showing
    if (showDividerHint) {
      setShowDividerHint(false);
      // Mark hint as seen in localStorage
      localStorage.setItem('dividerHintSeen', 'true');
    }
    
    // Set state after visual updates
    setIsDragging(true);
    
    // Pre-select elements for faster access during drag
    window._dragElements = {
      codeEditor,
      outputPanel,
      divider
    };
  };

  const handleDrag = useCallback((e) => {
    if (!isDragging || isMobile || !window._dragData || !window._dragElements) return;
    
    // Get clientX from mouse or touch event
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    // Use stored references for faster access
    const { containerLeft, containerWidth } = window._dragData;
    const { codeEditor, outputPanel } = window._dragElements;
    
    // Calculate the position percentage (0-100) based on mouse position
    const positionPercent = ((clientX - containerLeft) / containerWidth) * 100;
    
    // Calculate the width percentages
    let codeEditorWidth, outputPanelWidth;
    
    if (isPanelsSwapped) {
      // When panels are swapped:
      // - Left side (first panel) is output panel
      // - Right side (second panel) is code editor
      // - Dragging right should make the output panel (left) wider
      outputPanelWidth = Math.min(Math.max(positionPercent, 20), 80);
      codeEditorWidth = 100 - outputPanelWidth;
    } else {
      // Normal layout:
      // - Left side (first panel) is code editor
      // - Right side (second panel) is output panel
      // - Dragging right should make the code editor (left) wider
      codeEditorWidth = Math.min(Math.max(positionPercent, 20), 80);
      outputPanelWidth = 100 - codeEditorWidth;
    }
    
    // Apply width directly to DOM for instant feedback
    if (codeEditor && outputPanel) {
      codeEditor.style.width = `${codeEditorWidth}%`;
      outputPanel.style.width = `${outputPanelWidth}%`;
    }
    
    // Store the width value for the codeEditor to apply to React state when dragging ends
    // (this aligns with our state variable name "editorWidth")
    window._dragData.lastWidth = codeEditorWidth;
    
  }, [isDragging, isMobile, isPanelsSwapped]);

  const handleDragEnd = () => {
    // Update React state once at the end for better performance
    if (window._dragData && window._dragData.lastWidth) {
      setEditorWidth(window._dragData.lastWidth);
    }
    
    // Restore transitions after drag
    if (window._dragElements) {
      const { codeEditor, outputPanel } = window._dragElements;
      
      // Use setTimeout to ensure the transition doesn't interfere with the final position
      setTimeout(() => {
        if (codeEditor) codeEditor.style.transition = '';
        if (outputPanel) outputPanel.style.transition = '';
      }, 50);
    }
    
    // Clean up
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
    
    // Remove active class from divider
    if (window._dragElements && window._dragElements.divider) {
      window._dragElements.divider.classList.remove('bg-blue-400', 'dark:bg-blue-600');
    }
    
    // Clean up global references
    window._dragData = null;
    window._dragElements = null;
    
    setIsDragging(false);
  };

  // Add event listeners for drag operation
  useEffect(() => {
    // Only attach listeners when dragging
    if (isDragging) {
      // Mouse events
      const handleMouseDrag = (e) => {
        e.preventDefault(); // Prevent text selection
        handleDrag(e);
      };
      
      // Touch events handler with the right clientX
      const handleTouchDrag = (e) => {
        e.preventDefault(); // Prevent scrolling
        // Create a synthetic event with clientX from the touch
        const touchEvent = {
          ...e,
          type: 'touchmove',
          clientX: e.touches[0].clientX
        };
        handleDrag(touchEvent);
      };
      
      // Use passive: false to allow preventDefault() for touch events
      window.addEventListener('mousemove', handleMouseDrag, { passive: false });
      window.addEventListener('mouseup', handleDragEnd);
      
      // Additional touch support for mobile/tablet
      window.addEventListener('touchmove', handleTouchDrag, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
      
      return () => {
        // Clean up all listeners
        window.removeEventListener('mousemove', handleMouseDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleTouchDrag);
        window.removeEventListener('touchend', handleDragEnd);
        window.removeEventListener('touchcancel', handleDragEnd);
      };
    }
    
    // Clean up function for when component unmounts or isDragging changes to false
    return () => {};
  }, [isDragging, handleDrag]);
  
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

  // Function to swap the panels (code editor and output panel)
  const swapPanels = useCallback(() => {
    const newSwappedState = !isPanelsSwapped;
    setIsPanelsSwapped(newSwappedState);
    
    // Store preference in localStorage
    localStorage.setItem('panelsSwapped', newSwappedState.toString());
  }, [isPanelsSwapped]);




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
        {!isPanelsSwapped ? (
          // Default layout: Code Editor on the left, Output Panel on the right
          <>
            <div 
              id="code-editor"
              style={{ 
                width: isMobile ? '100%' : `${editorWidth}%`,
                transition: 'width 0.15s ease',
                willChange: isDragging ? 'width' : 'auto'
              }}
              className={`w-full h-full border-r border-gray-200 dark:border-gray-700 ${
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
                  isFilesPanelOpen={isFilesPanelOpen}
                />
              </ErrorBoundary>
            </div>
            
            {/* Draggable divider */}
            {!isMobile && (
              <div
                className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-600 cursor-col-resize flex-shrink-0 relative group transition-colors duration-150 draggable-divider"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onDoubleClick={swapPanels}
                title={isPanelsSwapped ? "Drag to resize panels | Double-click to restore" : "Drag to resize panels | Double-click to swap"}
                aria-label="Drag to resize panels | Double-click to swap panels"
                style={{ 
                  touchAction: 'none', /* Prevent scrolling during touch drag */
                  willChange: 'background-color',
                  zIndex: 30 /* Ensure divider is above other elements */
                }}
              >
                {/* Hover active area (invisible, wider for easier targeting) */}
                <div className="absolute inset-0 w-6 -translate-x-1/2 group-hover:bg-blue-300/20 dark:group-hover:bg-blue-700/20"></div>
                
                {/* Elegant drag handle design */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center h-16 pointer-events-none">
                  <div className="w-1 h-8 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors duration-150 relative">
                    {/* Pulse animation ring for the handle when hint is showing */}
                    {(showDividerHint || showSwapHint) && (
                      <div className="absolute -inset-2 rounded-full animate-ping bg-blue-500/40 dark:bg-blue-400/40"></div>
                    )}
                  </div>
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50 tooltip-hint">
                  {isPanelsSwapped ? "Double-click to restore panels" : "Double-click to swap panels"}
                </div>
                
                {/* Subtle animated hint that shows briefly */}
                {showDividerHint && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-blue-500/90 text-white text-xs font-medium rounded-r py-1 px-2 shadow-md z-50 whitespace-nowrap pointer-events-none flex items-center space-x-1 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Drag</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                
                {/* Second hint for panel swapping */}
                {showSwapHint && !showDividerHint && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-green-500/90 text-white text-xs font-medium rounded-r py-1 px-2 shadow-md z-50 whitespace-nowrap pointer-events-none flex items-center space-x-1 backdrop-blur-sm">
                    <span>Double-click to swap</span>
                  </div>
                )}
              </div>
            )}
            
            <div 
              id="output-panel"
              style={{ 
                width: isMobile ? '100%' : `${100 - editorWidth}%`,
                transition: 'width 0.15s ease',
                willChange: isDragging ? 'width' : 'auto'
              }}
              className={`w-full h-full ${
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
          </>
        ) : (
          // Swapped layout: Output Panel on the left, Code Editor on the right
          <>
            <div 
              id="output-panel"
              style={{ 
                width: isMobile ? '100%' : `${100 - editorWidth}%`,
                transition: 'width 0.15s ease',
                willChange: isDragging ? 'width' : 'auto'
              }}
              className={`w-full h-full border-r border-gray-200 dark:border-gray-700 ${
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
            
            {/* Draggable divider (when swapped) */}
            {!isMobile && (
              <div
                className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-600 cursor-col-resize flex-shrink-0 relative group transition-colors duration-150 draggable-divider"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onDoubleClick={swapPanels}
                title={isPanelsSwapped ? "Drag to resize panels | Double-click to restore" : "Drag to resize panels | Double-click to swap"}
                aria-label="Drag to resize panels | Double-click to swap panels"
                style={{ 
                  touchAction: 'none', /* Prevent scrolling during touch drag */
                  willChange: 'background-color',
                  zIndex: 30 /* Ensure divider is above other elements */
                }}
              >
                {/* Hover active area (invisible, wider for easier targeting) */}
                <div className="absolute inset-0 w-6 -translate-x-1/2 group-hover:bg-blue-300/20 dark:group-hover:bg-blue-700/20"></div>
                
                {/* Elegant drag handle design */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center h-16 pointer-events-none">
                  <div className="w-1 h-8 rounded-full bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors duration-150 relative">
                    {/* Pulse animation ring for the handle when hint is showing */}
                    {(showDividerHint || showSwapHint) && (
                      <div className="absolute -inset-2 rounded-full animate-ping bg-blue-500/40 dark:bg-blue-400/40"></div>
                    )}
                  </div>
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50 tooltip-hint">
                  {isPanelsSwapped ? "Double-click to restore panels" : "Double-click to swap panels"}
                </div>
                
                {/* Subtle animated hint that shows briefly */}
                {showDividerHint && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-blue-500/90 text-white text-xs font-medium rounded-r py-1 px-2 shadow-md z-50 whitespace-nowrap pointer-events-none flex items-center space-x-1 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Drag</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                
                {/* Second hint for panel swapping */}
                {showSwapHint && !showDividerHint && (
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-green-500/90 text-white text-xs font-medium rounded-r py-1 px-2 shadow-md z-50 whitespace-nowrap pointer-events-none flex items-center space-x-1 backdrop-blur-sm">
                    <span>Double-click to swap</span>
                  </div>
                )}
              </div>
            )}
            
            <div 
              id="code-editor"
              style={{ 
                width: isMobile ? '100%' : `${editorWidth}%`,
                transition: 'width 0.15s ease',
                willChange: isDragging ? 'width' : 'auto'
              }}
              className={`w-full h-full ${
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
                  isFilesPanelOpen={isFilesPanelOpen}
                />
              </ErrorBoundary>
            </div>
          </>
        )}
        
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
