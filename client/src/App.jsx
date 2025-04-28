import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { languageOptions } from './constants/languageOptions';
import api from './utils/api'; // Import the api utility instead of axios
import './App.css';

function App() {
  // Get the saved language from localStorage or use the default
  const [language, setLanguage] = useState(() => {
    const savedLanguageId = localStorage.getItem('selectedLanguage');
    // Find the language in options or default to first language
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
  const [sessionId] = useState('default-session');
  const [activeTab, setActiveTab] = useState('output');
  const [autoSave, setAutoSave] = useState(() => {
    return localStorage.getItem('autoSave') === 'true';
  });

  // Add state for mobile/tablet view to track which panel is visible
  const [mobileView, setMobileView] = useState('code'); // 'code' or 'output'

  // Add a way to detect mobile devices
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Toggle between code and output panels on mobile
  const toggleMobileView = () => {
    setMobileView(prev => prev === 'code' ? 'output' : 'code');
  };

  // Update mobile view based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Reset to default view when returning to desktop layout
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
  
  // Save language selection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedLanguage', language.id);
  }, [language]);

  // Toggle auto-save functionality
  const toggleAutoSave = () => {
    const newAutoSave = !autoSave;
    setAutoSave(newAutoSave);
    localStorage.setItem('autoSave', newAutoSave.toString());
    
    // If turning on auto-save, immediately save the current code
    if (newAutoSave && code) {
      localStorage.setItem(`code_${language.id}`, code);
      console.log(`Code saved for ${language.id}: ${code.substring(0, 30)}...`);
    } else if (!newAutoSave) {
      // If turning off auto-save, we don't remove code until language changes
      console.log('Auto-save disabled');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Apply theme to HTML element for global CSS variables and tailwind dark mode
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.body.dataset.theme = newTheme;
    
    // Set theme in local storage
    localStorage.setItem('theme', newTheme);
    
    // Apply theme color meta tag for mobile devices
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#1a1b26' : '#ffffff');
    }
    
    // Force a reflow to ensure all elements update
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 5);
  };

  // Ensure theme is properly applied on initial load
  useEffect(() => {
    // Apply dark mode class based on current theme state
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.dataset.theme = theme;
    
    // Update theme color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1b26' : '#ffffff');
    }
  }, [theme]);

  const handleLanguageChange = (newLanguage) => {
    // If auto-save is enabled, save the current code before switching
    if (autoSave && code) {
      localStorage.setItem(`code_${language.id}`, code);
    }
    
    setLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage.id);
    
    // Get the code for the new language after changing
    const savedCode = autoSave ? localStorage.getItem(`code_${newLanguage.id}`) : null;
    if (savedCode) {
      setCode(savedCode);
    } else {
      const defaultCode = CodeEditor.getLanguageDefaultCode(newLanguage.value);
      setCode(defaultCode);
    }
  };

  const handleRunCode = async () => {
    // Don't run if already running
    if (loading) return;
    
    // On mobile, switch to output view after running code
    if (window.innerWidth < 768 && mobileView === 'code') {
      setMobileView('output');
    }
    
    // Automatically switch to output tab if currently on input tab
    if (activeTab === 'input') {
      setActiveTab('output');
    }
    
    setError(null);
    try {
      setLoading(true);
      // Use the api utility for making the request
      const response = await api.execute.runCode(sessionId, { 
        code, 
        language: language.id, 
        input 
      });
      setOutput(response.data);
    } catch (error) {
      console.error('Error executing code:', error);
      
      // Error is now standardized by our API utility
      const errorMessage = error.message || 
                          error.details?.message || 
                          'An error occurred while executing your code.';
      
      setOutput(null);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard shortcuts (Ctrl+Enter to run code)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl+Enter (or Cmd+Enter on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, language.id, input, loading]);

  // Initial load of code from localStorage or default
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

  // Save code to localStorage when it changes and autoSave is enabled
  useEffect(() => {
    const saveCode = () => {
      if (autoSave && code && language) {
        localStorage.setItem(`code_${language.id}`, code);
        console.log(`Auto-saving code for ${language.id}`);
      }
    };
    
    // Use a debounced save to avoid excessive writes
    const timeoutId = setTimeout(saveCode, 500);
    return () => clearTimeout(timeoutId);
  }, [code, language.id, autoSave]);

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
      />
      
      {/* Mobile panel toggle buttons (visible only on small screens) */}
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
        {/* Code Editor - Full width on desktop, conditionally visible on mobile */}
        <div 
          className={`md:w-3/5 w-full h-full border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            mobileView === 'output' ? 'hidden md:block' : 'block'
          } ${isMobile ? 'pb-12' : ''}`}
        >
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language.value}
            theme={theme}
            onRunCode={handleRunCode}
          />
        </div>
        
        {/* Output Panel - 40% width on desktop, conditionally visible on mobile */}
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
