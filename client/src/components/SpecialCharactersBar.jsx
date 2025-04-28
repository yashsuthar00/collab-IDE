import { useState, useEffect } from 'react';

const SpecialCharactersBar = ({ onInsert, language }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Define character sets based on programming language
  const getCharacterSets = () => {
    const common = [
      { label: '{ }', insert: '{$}' },
      { label: '( )', insert: '($)' },
      { label: '[ ]', insert: '[$]' },
      { label: '<>', insert: '<$>' },
      { label: '; ', insert: ';' },
      { label: '=', insert: ' = ' },
      { label: '==', insert: ' == ' },
      { label: '!=', insert: ' != ' },
      { label: '+', insert: ' + ' },
      { label: '-', insert: ' - ' },
      { label: '*', insert: ' * ' },
      { label: '/', insert: ' / ' },
      { label: '%', insert: ' % ' },
      { label: '&&', insert: ' && ' },
      { label: '||', insert: ' || ' },
      { label: '!', insert: '!' },
      { label: '=>', insert: ' => ' },
      { label: '->', insert: ' -> ' },
      { label: '.', insert: '.' },
      { label: ',', insert: ', ' },
      { label: '"" ', insert: '"$"' },
      { label: '\'\' ', insert: '\'$\'' },
      { label: '`` ', insert: '`$`' },
    ];

    // Language-specific characters
    switch (language) {
      case 'python':
        return [
          ...common,
          { label: ': ', insert: ': ' },
          { label: 'def', insert: 'def $():' },
          { label: ':\n\t', insert: ':\n\t' },
          { label: 'if', insert: 'if $:' },
          { label: 'else', insert: 'else:' },
          { label: 'for', insert: 'for $ in :' },
          { label: 'while', insert: 'while $:' },
          { label: 'try:', insert: 'try:\n\t$\nexcept Exception as e:\n\tpass' },
        ];
      case 'java':
      case 'cpp':
      case 'c':
        return [
          ...common,
          { label: '->', insert: '->' },
          { label: '::', insert: '::' },
          { label: '/*', insert: '/*  */' },
          { label: '//', insert: '// ' },
          { label: 'if', insert: 'if ($) {\n\n}' },
          { label: 'for', insert: 'for (int i = 0; i < $; i++) {\n\n}' },
          { label: 'while', insert: 'while ($) {\n\n}' },
        ];
      case 'javascript':
      case 'typescript':
        return [
          ...common,
          { label: '=>', insert: ' => ' },
          { label: '?:', insert: ' ? $ : ' },
          { label: '?.', insert: '?.' },
          { label: '??', insert: ' ?? ' },
          { label: '${', insert: '${$}' },
          { label: '...', insert: '...' },
          { label: 'if', insert: 'if ($) {\n\n}' },
          { label: 'for', insert: 'for (let i = 0; i < $; i++) {\n\n}' },
          { label: '()', insert: '() => {\n\t$\n}' },
        ];
      default:
        return common;
    }
  };

  const characterSets = getCharacterSets();
  
  // Log when the component renders to help debug mobile visibility issues
  useEffect(() => {
    console.log("SpecialCharactersBar rendered", {
      windowWidth: window.innerWidth,
      language,
      expanded,
      characterSetsLength: characterSets.length
    });
  }, [language, expanded]);

  // Handle insertion of special character
  const handleInsert = (insertText, event) => {
    // Prevent default to avoid any unwanted behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (insertText.includes('$')) {
      // If there's a cursor placeholder ($), insert and position cursor there
      const parts = insertText.split('$');
      onInsert(parts[0], parts[1] || '');
    } else {
      // No placeholder, just insert the text
      onInsert(insertText);
    }
  };
  
  // Toggle the expanded view
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Limit the number of visible items based on screen size
  const getVisibleItemCount = () => {
    const width = window.innerWidth;
    if (width < 375) return expanded ? characterSets.length : 5;
    if (width < 640) return expanded ? characterSets.length : 7;
    return expanded ? characterSets.length : 9;
  };
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 w-full overflow-hidden" style={{zIndex: 9999}}>
      <div className="flex items-center p-1">
        <button 
          onClick={toggleExpand}
          className="flex-shrink-0 p-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded mr-1"
        >
          {expanded ? '« Less' : 'More »'}
        </button>
        
        <div className="flex space-x-1 overflow-x-auto hide-scrollbar px-1 pb-1">
          {characterSets.slice(0, getVisibleItemCount()).map((item, index) => (
            <button
              key={index}
              className="special-chars-button flex-shrink-0 min-w-8 px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-blue-50 dark:active:bg-blue-900/30 active:border-blue-300"
              onClick={(e) => handleInsert(item.insert, e)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpecialCharactersBar;
