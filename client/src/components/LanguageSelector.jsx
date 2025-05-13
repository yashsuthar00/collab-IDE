import React, { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

const LanguageSelector = ({ selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { id: 'javascript', name: 'JavaScript', extension: 'js' },
    { id: 'python', name: 'Python', extension: 'py' },
    { id: 'java', name: 'Java', extension: 'java' },
    { id: 'cpp', name: 'C++', extension: 'cpp' },
    { id: 'c', name: 'C', extension: 'c' },
    { id: 'csharp', name: 'C#', extension: 'cs' },
    { id: 'ruby', name: 'Ruby', extension: 'rb' },
    { id: 'php', name: 'PHP', extension: 'php' },
    { id: 'go', name: 'Go', extension: 'go' },
    { id: 'rust', name: 'Rust', extension: 'rs' },
    { id: 'typescript', name: 'TypeScript', extension: 'ts' },
    { id: 'html', name: 'HTML', extension: 'html' },
    { id: 'css', name: 'CSS', extension: 'css' },
    { id: 'bash', name: 'Bash', extension: 'sh' }
  ];

  const selectedLanguage = languages.find(lang => lang.id === selected) || languages[0];

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (languageId) => {
    onSelect(languageId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700"
        onClick={toggleDropdown}
      >
        <span>{selectedLanguage.name}</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {languages.map(language => (
            <button
              key={language.id}
              type="button"
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                selected === language.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
              }`}
              onClick={() => handleSelect(language.id)}
            >
              <span>{language.name}</span>
              {selected === language.id && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
