import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

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
    difficulty: 'easy',
    ...initialValues
  });
  
  const [directories, setDirectories] = useState([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [directoryTreeOpen, setDirectoryTreeOpen] = useState(false);
  const [selectedDirectoryName, setSelectedDirectoryName] = useState('My Files');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated } = useSelector(state => state.auth);

  // Update initial directory when dialog opens with currentDirectory prop
  useEffect(() => {
    if (isOpen) {
      // Set initial values including the current directory if provided
      setFileData({
        name: '',
        language: 'javascript',
        directoryId: currentDirectory !== 'root' ? currentDirectory : null,
        isPublic: false,
        difficulty: 'easy',
        ...initialValues
      });
      
      // Reset errors when dialog opens
      setErrors({});
      
      // Only fetch directories if user is authenticated
      if (isAuthenticated) {
        fetchDirectories();
      }
    }
  }, [isOpen, initialValues, currentDirectory, isAuthenticated]);

  useEffect(() => {
    // Update selected directory name when directoryId changes
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

    updateSelectedDirectoryName();
  }, [fileData.directoryId, directories]);

  const fetchDirectories = async () => {
    try {
      setIsDirectoryLoading(true);
      const response = await api.directories.getDirectoryTree();
      if (response && response.data) {
        setDirectories(response.data);
      } else {
        // Handle empty response
        setDirectories([]);
      }
    } catch (error) {
      console.error('Error fetching directories:', error);
      toast.error('Failed to load directories');
    } finally {
      setIsDirectoryLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!fileData.name.trim()) {
      newErrors.name = 'File name is required';
    } else if (fileData.name.trim().length < 1) {
      newErrors.name = 'File name is too short';
    } else if (fileData.name.includes('/') || fileData.name.includes('\\')) {
      newErrors.name = 'File name cannot contain / or \\';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Add appropriate file extension if not already present
      let fileName = fileData.name;
      if (!fileName.includes('.') && fileData.language) {
        const extension = getFileExtensionForLanguage(fileData.language);
        fileName = `${fileName}${extension}`;
      }
      
      // Update the fileData with the possibly modified name
      const updatedFileData = {
        ...fileData,
        name: fileName,
        difficulty: fileData.difficulty || 'easy' // Ensure difficulty is set
      };
      
      console.log('Submitting file with data:', updatedFileData);
      
      await onSave(updatedFileData);
      
      // Close dialog on success (the onSave function should handle the success toast)
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error(error.message || 'Failed to save file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectorySelect = (directoryId) => {
    setFileData({ ...fileData, directoryId });
    setDirectoryTreeOpen(false);
  };

  const renderDirectoryTree = (directoryArray, level = 0) => {
    if (!directoryArray || !Array.isArray(directoryArray) || directoryArray.length === 0) {
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
              type="button"
            >
              <Home size={16} className="mr-2" />
              <span>My Files (root)</span>
            </button>
          </li>
        )}
        {directoryArray.filter(dir => dir.type === 'directory').map(dir => (
          <li key={dir._id}>
            <button
              className={`flex items-center w-full px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                fileData.directoryId === dir._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
              }`}
              onClick={() => handleDirectorySelect(dir._id)}
              type="button"
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
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="file-name">
              File Name
            </label>
            <div className="flex items-center">
              <input
                type="text"
                id="file-name"
                name="name"
                value={fileData.name}
                onChange={handleInputChange}
                placeholder="Enter file name"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 ${
                  errors.name 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                autoFocus
              />
              {!fileData.name.includes('.') && fileData.language && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {getFileExtensionForLanguage(fileData.language)}
                </span>
              )}
            </div>
            {errors.name && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} className="mr-1" />
                {errors.name}
              </div>
            )}
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
            <label className="block text-sm font-medium mb-2">
              Difficulty Level
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setFileData({...fileData, difficulty: 'easy'})}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  fileData.difficulty === 'easy' 
                    ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => setFileData({...fileData, difficulty: 'medium'})}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  fileData.difficulty === 'medium' 
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setFileData({...fileData, difficulty: 'hard'})}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  fileData.difficulty === 'hard' 
                    ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Hard
              </button>
            </div>
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Public files can be shared with others
            </p>
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
              disabled={isSubmitting || !fileData.name.trim()}
              className={`px-4 py-2 text-sm text-white bg-blue-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSubmitting || !fileData.name.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileDialog;
