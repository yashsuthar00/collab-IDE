import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { languageOptions } from './constants/languageOptions';
import axios from 'axios';
import './App.css';

function App() {
  const [code, setCode] = useState('// Start coding here...');
  const [language, setLanguage] = useState(languageOptions[0]);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    return savedTheme;
  });
  const [output, setOutput] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState('default-session');
  
  const apiClient = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 30000,
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const handleRunCode = async () => {
    setError(null);
    try {
      setLoading(true);
      const response = await apiClient.post(
        `/api/sessions/${sessionId}/execute`, 
        { code, language: language.id, input }
      );
      setOutput(response.data);
    } catch (error) {
      console.error('Error executing code:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details?.message || 
                          'An error occurred while executing your code.';
      
      setOutput(null);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load saved code from localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem(`code_${language.id}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      const defaultCode = CodeEditor.getLanguageDefaultCode(language.value);
      setCode(defaultCode);
    }
  }, [language.id]);

  // Save code to localStorage
  useEffect(() => {
    if (code) {
      localStorage.setItem(`code_${language.id}`, code);
    }
  }, [code, language.id]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar 
        language={language}
        setLanguage={setLanguage}
        languageOptions={languageOptions}
        onRunCode={handleRunCode}
        theme={theme}
        toggleTheme={toggleTheme}
        isLoading={loading}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5 h-full border-r border-gray-200 dark:border-gray-700">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language.value}
            theme={theme}
          />
        </div>
        <div className="w-2/5 h-full">
          <OutputPanel 
            output={output} 
            input={input} 
            setInput={setInput} 
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
