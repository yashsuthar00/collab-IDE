import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import UserPanel from './components/UserPanel';
import RoomJoinModal from './components/RoomJoinModal';
import { languageOptions } from './constants/languageOptions';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import api, { getSocket, initializeSocket } from './utils/api';
import './App.css';

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
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    document.body.dataset.theme = savedTheme;
    return savedTheme;
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
  const [socket, setSocket] = useState(null);

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

  useEffect(() => {
    if (isInRoom && roomId) {
      const socketInstance = getSocket();
      setSocket(socketInstance);
      
      setSessionId(roomId);
      
      socketInstance.on('code-update', (data) => {
        if (data.roomId === roomId) {
          setCode(data.code);
        }
      });
      
      socketInstance.on('output-update', (data) => {
        if (data.roomId === roomId) {
          setOutput(data.output);
          setInput(data.input);
          setActiveTab('output');
        }
      });
      
      socketInstance.on('language-change', (data) => {
        if (data.roomId === roomId) {
          const newLanguage = languageOptions.find(lang => lang.id === data.languageId);
          if (newLanguage) {
            setLanguage(newLanguage);
          }
        }
      });
      
      return () => {
        socketInstance.off('code-update');
        socketInstance.off('output-update');
        socketInstance.off('language-change');
      };
    } else {
      setSessionId('default-session');
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

  const handleCodeChange = (newCode) => {
    if (newCode !== undefined && newCode !== null) {
      setCode(newCode);
      
      if (isInRoom && socket && checkPermission('EDIT_CODE')) {
        socket.emit('code-change', {
          roomId,
          userId: currentUser.id,
          code: newCode
        });
      }
    }
  };

  const handleRunCode = async () => {
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
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, language.id, input, loading, isInRoom, currentUser?.accessLevel]);

  useEffect(() => {
    let codeToUse;
    
    if (autoSave) {
      const savedCode = localStorage.getItem(`code_${language.id}`);
      if (savedCode) {
        codeToUse = savedCode;
        console.log(`Loading saved code for ${language.id}`);
      } else {
        codeToUse = CodeEditor.getLanguageDefaultCode(language.value);
        console.log(`No saved code found for ${language.id}, using default`);
      }
    } else {
      codeToUse = CodeEditor.getLanguageDefaultCode(language.value);
      console.log(`Auto-save disabled, using default code for ${language.id}`);
    }
    
    setCode(codeToUse);
  }, []);

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
  }, [code, language?.id, autoSave, isInRoom]);

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
        onJoinRoom={() => setIsRoomModalOpen(true)}
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
          className={`md:w-3/5 w-full h-full border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            mobileView === 'output' ? 'hidden md:block' : 'block'
          } ${isMobile ? 'pb-12' : ''}`}
        >
          <CodeEditor
            code={code}
            setCode={handleCodeChange}
            language={language.value}
            theme={theme}
            onRunCode={handleRunCode}
            readOnly={isInRoom && !checkPermission('EDIT_CODE')}
          />
        </div>
        
        <div 
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
        onClose={() => setIsRoomModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <RoomProvider>
      <CollaborativeApp />
    </RoomProvider>
  );
}

export default App;
