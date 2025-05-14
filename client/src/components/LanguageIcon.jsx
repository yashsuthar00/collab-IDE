import React from 'react';
import { FileCode, Terminal, File, FileText, FileJson, Coffee, Hash } from 'lucide-react';

/**
 * Component to display appropriate icon based on file language
 */
const LanguageIcon = ({ language, className, size = 18 }) => {
  const getIconForLanguage = () => {
    if (!language) return File;
    
    const lang = language.toLowerCase();
    
    switch (lang) {
      case 'javascript':
      case 'js':
        return (props) => <FileCode {...props} color="#F0DB4F" />;
      
      case 'typescript':
      case 'ts':
        return (props) => <FileCode {...props} color="#3178C6" />;
        
      case 'jsx':
      case 'tsx':
      case 'react':
        return (props) => <FileCode {...props} color="#61DAFB" />;
        
      case 'html':
        return (props) => <FileCode {...props} color="#E34F26" />;
        
      case 'css':
        return (props) => <FileCode {...props} color="#1572B6" />;
        
      case 'python':
      case 'py':
        return (props) => <FileCode {...props} color="#3776AB" />;
        
      case 'java':
        return (props) => <Coffee {...props} color="#ED8B00" />;
        
      case 'c':
      case 'cpp':
      case 'c++':
        return (props) => <FileText {...props} color="#00599C" />;
        
      case 'csharp':
      case 'c#':
        return (props) => <Hash {...props} color="#512BD4" />;
        
      case 'go':
        return (props) => <FileCode {...props} color="#00ADD8" />;
        
      case 'ruby':
      case 'rb':
        return (props) => <FileCode {...props} color="#CC342D" />;
        
      case 'php':
        return (props) => <FileCode {...props} color="#777BB4" />;
        
      case 'json':
        return FileJson;
        
      case 'shell':
      case 'bash':
      case 'sh':
        return Terminal;
        
      default:
        return File;
    }
  };

  const Icon = getIconForLanguage();
  return <Icon size={size} className={className} />;
};

export default LanguageIcon;
