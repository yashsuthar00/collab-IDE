import React, { useState, useEffect } from 'react';
import { 
  X, 
  File, 
  Save, 
  Folder,
  ChevronRight,
  FolderOpen,
  Home,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

// Helper function to get file extension based on language
const getFileExtensionForLanguage = (language) => {
  const extensionMap = {
    'javascript': '.js',
    'typescript': '.ts',
    'jsx': '.jsx',
    'tsx': '.tsx',
    'html': '.html',
    'css': '.css',
    'python': '.py',
    'java': '.java',
    'c': '.c',
    'cpp': '.cpp',
    'c++': '.cpp',
    'csharp': '.cs',
    'c#': '.cs',
    'go': '.go',
    'ruby': '.rb',
    'rust': '.rs',
    'php': '.php',
    'swift': '.swift',
    'kotlin': '.kt',
    'scala': '.scala',
    'markdown': '.md',
    'json': '.json',
    'yaml': '.yml',
    'bash': '.sh',
    'shell': '.sh',
    'sql': '.sql',
  };
  
  // Convert language to lowercase for case-insensitive matching
  const lang = language ? language.toLowerCase() : '';
  
  // Return the mapped extension or a default .txt
  return extensionMap[lang] || '.txt';
};

const FileDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialValues = {}, 
  title = 'Save File', 
  submitLabel = 'Save',
  mode = 'create',  // 'create' or 'edit'
  currentDirectory = null  // Add currentDirectory prop
}) => {
  const [fileData, setFileData] = useState({
    name: '',
    language: 'javascript',
    directoryId: null,
    isPublic: false,
    ...initialValues
  });
  
  const [directories, setDirectories] = useState([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [directoryTreeOpen, setDirectoryTreeOpen] = useState(false);
  const [selectedDirectoryName, setSelectedDirectoryName] = useState('My Files');

  // Update initial directory when dialog opens with currentDirectory prop
  useEffect(() => {
    if (isOpen) {
      // Set initial values including the current directory if provided
      setFileData({
        name: '',
        language: 'javascript',
        directoryId: currentDirectory !== 'root' ? currentDirectory : null,
        isPublic: false,
        ...initialValues
      });
      fetchDirectories();
    }
  }, [isOpen, initialValues, currentDirectory]);

  useEffect(() => {
    // Update selected directory name when directoryId changes
    updateSelectedDirectoryName();
  }, [fileData.directoryId, directories]);

  const updateSelectedDirectoryName = () => {
    if (fileData.directoryId === null) {
      setSelectedDirectoryName('My Files (root)');
      return;
    }
    
    const findDirectoryName = (dirs, id) => {
      for (const dir of dirs) {
        if (dir._id === id) {
          return dir.name;
        }
        if (dir.children && dir.children.length > 0) {
          const found = findDirectoryName(dir.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const name = findDirectoryName(directories, fileData.directoryId);
    if (name) {
      setSelectedDirectoryName(name);
    }
  };

  const fetchDirectories = async () => {
    try {
      setIsDirectoryLoading(true);
      const response = await api.directories.getDirectoryTree();
      setDirectories(response.data);
      setIsDirectoryLoading(false);
    } catch (error) {
      console.error('Error fetching directories:', error);
      toast.error('Failed to load directories');
      setIsDirectoryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for file name to preserve extension
    if (name === 'name') {
      setFileData({
        ...fileData,
        [name]: value
      });
    } else {
      setFileData({
        ...fileData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!fileData.name.trim()) {
      toast.error('File name is required');
      return;
    }
    
    // Add appropriate file extension if not already present
    let fileName = fileData.name;
    if (!fileName.includes('.') && fileData.language) {
      const extension = getFileExtensionForLanguage(fileData.language);
      fileName = `${fileName}${extension}`;
    }
    
    // Update the fileData with the possibly modified name
    const updatedFileData = {
      ...fileData,
      name: fileName
    };
    
    onSave(updatedFileData);
  };

  const handleDirectorySelect = (directoryId) => {
    setFileData({ ...fileData, directoryId });
    setDirectoryTreeOpen(false);
  };

  const renderDirectoryTree = (directories, level = 0) => {
    if (!directories || directories.length === 0) {
      return <div className="pl-4 py-2 text-gray-500 italic">No directories found</div>;
    }

    return (
      <ul className={`space-y-1 ${level > 0 ? 'pl-4' : ''}`}>
        {level === 0 && (
          <li>
            <button
              className={`flex items-center w-full px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                fileData.directoryId === null ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
              }`}
              onClick={() => handleDirectorySelect(null)}
            >
              <Home size={16} className="mr-2" />
              <span>My Files (root)</span>
            </button>
          </li>
        )}
        {directories.map(dir => (
          <li key={dir._id}>
            <button
              className={`flex items-center w-full px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                fileData.directoryId === dir._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
              }`}
              onClick={() => handleDirectorySelect(dir._id)}
            >
              {dir.children && dir.children.length > 0 ? (
                <FolderOpen size={16} className="mr-2" />
              ) : (
                <Folder size={16} className="mr-2" />
              )}
              <span>{dir.name}</span>
            </button>
            {dir.children && dir.children.length > 0 && renderDirectoryTree(dir.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const handleLocationClick = () => {
    setDirectoryTreeOpen(!directoryTreeOpen);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {mode === 'create' ? (
              <File size={18} className="mr-2 text-blue-500" />
            ) : (
              <Save size={18} className="mr-2 text-blue-500" />
            )}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              File Name
            </label>
            <div className="flex items-center">
              <input
                type="text"
                name="name"
                value={fileData.name}
                onChange={handleInputChange}
                placeholder="Enter file name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
                autoFocus
              />
              {!fileData.name.includes('.') && fileData.language && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {getFileExtensionForLanguage(fileData.language)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The appropriate file extension will be added automatically based on the language.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Location
            </label>
            <button
              type="button"
              className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
              onClick={handleLocationClick}
            >
              <div className="flex items-center">
                <Folder size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">{selectedDirectoryName}</span>
              </div>
              {directoryTreeOpen ? <ChevronUp size={16} className="text-gray-500 dark:text-gray-400" /> : <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />}
            </button>
            
            {/* Directory selection tree - always visible initially in create mode */}
            {directoryTreeOpen && (
              <div className="mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-y-auto bg-white dark:bg-gray-700">
                {isDirectoryLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  renderDirectoryTree(directories)
                )}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isPublic"
                checked={fileData.isPublic}
                onChange={handleInputChange}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Make this file public</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileDialog;
