import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Copy, Clock, Eye, Check, Calendar, Code as CodeIcon } from 'lucide-react';
import api from '../utils/api';
import CodeEditor from './CodeEditor';
import { toast } from 'react-hot-toast';
import { languageOptions } from '../constants/languageOptions';

const SharedCodeViewer = () => {
  const { slug } = useParams();
  const [sharedCode, setSharedCode] = useState(null);
  const [language, setLanguage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const fetchSharedCode = async () => {
      try {
        setLoading(true);
        const response = await api.shared.getSharedCode(slug);
        
        if (response && response.data && response.data.success) {
          setSharedCode(response.data.data);
          
          // Find the language object from languageOptions
          const lang = languageOptions.find(l => l.id === response.data.data.language);
          setLanguage(lang || { id: 'text', name: 'Plain Text', value: 'plaintext' });
        } else {
          setError('Failed to load shared code');
        }
      } catch (error) {
        console.error('Error fetching shared code:', error);
        setError(error.response?.data?.message || 'This shared code may have expired or does not exist');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchSharedCode();
    }
  }, [slug]);

  // Handle copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sharedCode.code);
      setCodeCopied(true);
      toast.success('Code copied to clipboard!');
      
      // Reset the copied state after 3 seconds
      setTimeout(() => setCodeCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      toast.error('Failed to copy code to clipboard');
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Handle download code
  const handleDownloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([sharedCode.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    
    // Create filename based on language
    const extension = language?.id ? `.${language.id}` : '.txt';
    element.download = `shared-code-${slug}${extension}`;
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-lg">Loading shared code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 px-6 shadow-sm">
          <div className="container mx-auto flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400">
              <CodeIcon className="w-6 h-6" />
              <span>Collab IDE</span>
            </Link>
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-red-500">Shared code not found</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
            <div className="mt-6">
              <Link 
                to="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-medium text-white hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${theme === 'dark' ? 'dark-mode' : 'light-mode'}`}>
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 px-6 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400">
              <CodeIcon className="w-6 h-6" />
              <span>Collab IDE</span>
            </Link>
            
            <div className="ml-6 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium">
              Shared Code
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to="/"
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Editor
            </Link>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto py-4 px-2 sm:px-6 flex-1 overflow-hidden">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="mb-3 sm:mb-0">
              <h1 className="text-lg sm:text-xl font-semibold flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {language?.name || 'Unknown'}
                </span>
                <span>Shared Code</span>
              </h1>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-3">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="truncate">Created: {formatDate(sharedCode.createdAt)}</span>
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="truncate">Expires: {formatDate(sharedCode.expiresAt)}</span>
                </span>
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  Views: {sharedCode.viewCount}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center text-sm font-medium"
              >
                {codeCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadCode}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              code={sharedCode.code}
              setCode={() => {}} // Read-only
              language={language?.value || 'plaintext'}
              theme={theme}
              readOnly={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedCodeViewer;
