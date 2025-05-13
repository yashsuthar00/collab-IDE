import React from 'react';
import { 
  FileCode, 
  FileJson, 
  FileText, 
  FileSpreadsheet, 
  FileTerminal,
  Hash, 
  Coffee, 
  FileSymlink, 
  File,
  Binary,
  FileType
} from 'lucide-react';

/**
 * Component for displaying a language-specific icon
 * @param {Object} props Component props
 * @param {string} props.language Programming language identifier
 * @param {string} props.className Additional CSS classes
 * @param {number} props.size Icon size (default: 20)
 * @returns {JSX.Element} Icon component
 */
const LanguageIcon = ({ language, className = "", size = 20 }) => {
  // Convert language to lowercase for case-insensitive matching
  const lang = language?.toLowerCase();

  // Map of language identifiers to their respective icons and colors
  const getIconConfig = () => {
    const config = {
      // JavaScript family
      javascript: { icon: FileCode, color: "text-yellow-500 dark:text-yellow-400" },
      js: { icon: FileCode, color: "text-yellow-500 dark:text-yellow-400" },
      node: { icon: FileCode, color: "text-green-600 dark:text-green-400" },

      // TypeScript
      typescript: { icon: FileCode, color: "text-blue-500 dark:text-blue-400" },
      ts: { icon: FileCode, color: "text-blue-500 dark:text-blue-400" },
      
      // Python
      python: { icon: FileCode, color: "text-green-500 dark:text-green-400" },
      py: { icon: FileCode, color: "text-green-500 dark:text-green-400" },
      
      // Java
      java: { icon: Coffee, color: "text-brown-500 dark:text-amber-700" },
      
      // C family
      c: { icon: FileCode, color: "text-blue-500 dark:text-blue-400" },
      cpp: { icon: FileCode, color: "text-blue-600 dark:text-blue-500" },
      'c++': { icon: FileCode, color: "text-blue-600 dark:text-blue-500" },
      
      // C#
      csharp: { icon: Hash, color: "text-purple-500 dark:text-purple-400" },
      'c#': { icon: Hash, color: "text-purple-500 dark:text-purple-400" },
      
      // Web technologies
      php: { icon: FileCode, color: "text-indigo-500 dark:text-indigo-400" },
      html: { icon: FileCode, color: "text-orange-500 dark:text-orange-400" },
      css: { icon: FileCode, color: "text-blue-500 dark:text-blue-400" },
      scss: { icon: FileCode, color: "text-pink-500 dark:text-pink-400" },
      
      // Other languages
      ruby: { icon: FileCode, color: "text-red-500 dark:text-red-400" },
      go: { icon: FileCode, color: "text-cyan-500 dark:text-cyan-400" },
      rust: { icon: FileCode, color: "text-orange-500 dark:text-orange-400" },
      kotlin: { icon: FileCode, color: "text-purple-500 dark:text-purple-400" },
      swift: { icon: FileCode, color: "text-orange-500 dark:text-orange-400" },
      
      // Data formats
      json: { icon: FileJson, color: "text-yellow-500 dark:text-yellow-400" },
      xml: { icon: FileCode, color: "text-orange-300 dark:text-orange-400" },
      yaml: { icon: FileCode, color: "text-cyan-500 dark:text-cyan-400" },
      yml: { icon: FileCode, color: "text-cyan-500 dark:text-cyan-400" },
      
      // Markup and text
      markdown: { icon: FileText, color: "text-blue-500 dark:text-blue-400" },
      md: { icon: FileText, color: "text-blue-500 dark:text-blue-400" },
      txt: { icon: FileText, color: "text-gray-500 dark:text-gray-400" },
      plaintext: { icon: FileText, color: "text-gray-500 dark:text-gray-400" },
      
      // Data processing
      sql: { icon: FileSpreadsheet, color: "text-green-500 dark:text-green-400" },
      csv: { icon: FileSpreadsheet, color: "text-green-300 dark:text-green-500" },
      
      // Shell scripts
      shell: { icon: FileTerminal, color: "text-gray-500 dark:text-gray-400" },
      bash: { icon: FileTerminal, color: "text-gray-500 dark:text-gray-400" },
      zsh: { icon: FileTerminal, color: "text-gray-500 dark:text-gray-400" },
      powershell: { icon: FileTerminal, color: "text-blue-500 dark:text-blue-400" },
      
      // Binary and executable formats
      binary: { icon: Binary, color: "text-gray-600 dark:text-gray-400" },
      exe: { icon: Binary, color: "text-gray-600 dark:text-gray-400" },
      
      // Font formats
      font: { icon: FileType, color: "text-indigo-400 dark:text-indigo-300" },
    };
    
    return config[lang] || { icon: File, color: "text-gray-500 dark:text-gray-400" };
  };

  const { icon: IconComponent, color } = getIconConfig();

  return (
    <IconComponent className={`${color} flex-shrink-0 ${className}`} size={size} />
  );
};

export default LanguageIcon;
