import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { 
  Folder, File, FilePlus, FolderPlus, ChevronRight, ChevronDown, 
  Save, X, Search, Trash, Edit, Plus, ExternalLink, Copy, MoreHorizontal,
  AlertTriangle, Share2 // Add Share2 icon import
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import LanguageIcon from './LanguageIcon'; // Import the new component
import RenameDialog from './RenameDialog'; // Import RenameDialog component

// Utility function to sort files and directories
const sortItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  
  return [...items].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    
    // Helper function to extract numeric parts from a string
    const extractNumber = (str) => {
      const numMatch = str.match(/^(\d+)/);
      return numMatch ? parseInt(numMatch[0], 10) : null;
    };
    
    // Check if both names start with numbers
    const numA = extractNumber(nameA);
    const numB = extractNumber(nameB);
    
    // If both start with numbers, sort numerically
    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
      // If the numeric parts are equal, continue to alphabetic sort for the rest
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    }
    
    // If only one starts with a number, put numbers first
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    
    // Otherwise, do a natural alphabetic sort
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const FilesPanel = ({ 
  isOpen, 
  onClose, 
  onFileSelect,
  currentCode,
  currentLanguage,
  onSaveSuccess
}) => {
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [directoriesFiles, setDirectoriesFiles] = useState({}); // Cache files for each directory
  const [currentDirectory, setCurrentDirectory] = useState('root');
  const [expandedDirs, setExpandedDirs] = useState(new Set(['root'])); 
  const [directoryTree, setDirectoryTree] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name'); // 'name' or 'date'
  const [searchResults, setSearchResults] = useState({
    files: [],
    directories: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newDirName, setNewDirName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingDir, setIsCreatingDir] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // Add confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState({
    show: false,
    itemId: '',
    itemName: '',
    itemType: '', // 'file' or 'directory'
    action: null
  });

  // Add rename dialog state
  const [renameDialog, setRenameDialog] = useState({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemType: '' // 'file' or 'directory'
  });
  
  // Add drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragCounter = useRef(0);

  // Add mobile view state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeView, setActiveView] = useState('tree'); // 'tree' or 'content'

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data when the panel is opened
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Ensure root directory is expanded when panel opens
      setExpandedDirs(prev => {
        const newExpanded = new Set(prev);
        newExpanded.add('root');
        return newExpanded;
      });
      
      // If we don't have files for the current directory yet, fetch them
      if (!directoriesFiles[currentDirectory]) {
        fetchDirectoryContents(currentDirectory);
      }
      
      fetchDirectoryTree();
    }
  }, [isOpen, isAuthenticated]);

  // Fetch contents of the current directory - modified to load all files
  const fetchDirectoryContents = async (dirId) => {
    try {
      setIsLoading(true);
      console.log(`Fetching directory contents for: ${dirId}`);
      
      // First get current directory contents
      const response = await api.directories.getDirectories({ 
        parent: dirId,
        includeFiles: 'true' // Make sure this is a string 'true', not boolean true
      });
      
      console.log('Directory contents response:', response);
      console.log('Files with difficulty:', response?.data?.files?.map(file => ({ name: file.name, difficulty: file.difficulty })));
      
      if (response && response.data) {
        // Get directories and files from response and sort them properly
        const unsortedDirectories = Array.isArray(response.data.directories) 
          ? response.data.directories 
          : (response.data.directories || []);
        
        const unsortedFiles = Array.isArray(response.data.files) 
          ? response.data.files 
          : (response.data.files || []);
        
        // Sort directories and files with our utility function
        setDirectories(sortItems(unsortedDirectories));
        
        // Store the files in our directories cache
        const sortedFiles = sortItems(unsortedFiles);
        setFiles(sortedFiles);
        
        // Update the directoriesFiles cache with the files for this directory
        setDirectoriesFiles(prev => ({
          ...prev,
          [dirId]: sortedFiles
        }));
      } else {
        setDirectories([]);
        setFiles([]);
        console.warn('Directory contents response was empty or in unexpected format', response);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching directory contents:', error);
      setIsLoading(false);
      toast.error('Failed to load files. Please try again later.');
      setDirectories([]);
      setFiles([]);
    }
  };

  // Fetch entire directory tree for navigation - ensure it includes all files
  const fetchDirectoryTree = async () => {
    try {
      console.log('Fetching directory tree');
      const response = await api.directories.getDirectoryTree({ 
        includeFiles: true,
        deep: true  // Request deep tree structure if this param is supported by API
      });
      console.log('Directory tree response:', response);
      
      if (response && response.data) {
        // Sort the directory tree data
        const treeData = Array.isArray(response.data) ? response.data : [];
        
        // Sort the directory tree recursively
        const sortTreeRecursively = (items) => {
          if (!Array.isArray(items) || items.length === 0) return [];
          
          // Sort the current level
          const sortedItems = sortItems(items);
          
          // For each item with children, sort its children recursively
          return sortedItems.map(item => {
            if (item.children && Array.isArray(item.children) && item.children.length > 0) {
              return {
                ...item,
                children: sortTreeRecursively(item.children)
              };
            }
            
            // If the item has files, sort those too
            if (item.files && Array.isArray(item.files) && item.files.length > 0) {
              return {
                ...item,
                files: sortItems(item.files)
              };
            }
            
            return item;
          });
        };
        
        const sortedTree = sortTreeRecursively(treeData);
        setDirectoryTree(sortedTree);
        
        // If the tree includes complete file data, store it in our files state as well
        if (Array.isArray(response.data)) {
          const allFiles = [];
          const filesByDirectory = {};
          
          const extractFilesFromTree = (items) => {
            items.forEach(item => {
              if (item.files && Array.isArray(item.files)) {
                allFiles.push(...item.files);
                
                // Group files by directory
                const dirId = item._id || 'root';
                filesByDirectory[dirId] = (filesByDirectory[dirId] || []).concat(item.files);
              }
              if (item.children && Array.isArray(item.children)) {
                extractFilesFromTree(item.children);
              }
            });
          };
          extractFilesFromTree(response.data);
          
          // Update the directoriesFiles cache with files from the tree
          setDirectoriesFiles(prev => {
            const newCache = { ...prev };
            
            // Add files from tree to cache for each directory
            Object.entries(filesByDirectory).forEach(([dirId, dirFiles]) => {
              newCache[dirId] = sortItems(dirFiles);
            });
            
            return newCache;
          });
          
          // Merge with existing files to ensure completeness
          if (allFiles.length > 0) {
            setFiles(prevFiles => {
              const fileMap = new Map();
              // Add existing files to map
              prevFiles.forEach(file => fileMap.set(file._id, file));
              // Add new files or update existing ones
              allFiles.forEach(file => fileMap.set(file._id, file));
              return sortItems(Array.from(fileMap.values()));
            });
          }
        }
      } else {
        setDirectoryTree([]);
        console.warn('Directory tree response was empty or in unexpected format', response);
      }
    } catch (error) {
      console.error('Error fetching directory tree:', error);
      toast.error('Failed to load directory structure.');
      setDirectoryTree([]);
    }
  };

  // Handle directory navigation - modified to auto-expand the directory and switch view on mobile
  const navigateToDirectory = (dirId) => {
    // Automatically expand the directory when navigating to it
    const newExpanded = new Set(expandedDirs);
    newExpanded.add(dirId);
    setExpandedDirs(newExpanded);
    
    // Continue with existing functionality
    setCurrentDirectory(dirId);
    setSelectedFile(null);

    // If we don't have files for this directory yet, fetch them
    if (!directoriesFiles[dirId]) {
      fetchDirectoryContents(dirId);
    }

    // On mobile, switch to content view after navigation
    if (isMobile) {
      setActiveView('content');
    }
  };

  // Handle directory expansion in tree view
  const toggleDirectoryExpanded = (dirId) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId);
    } else {
      newExpanded.add(dirId);
      
      // If we don't have files for this directory yet, fetch them
      if (!directoriesFiles[dirId]) {
        fetchDirectoryContents(dirId);
      }
    }
    setExpandedDirs(newExpanded);
  };

  // Modified to return to tree view after selecting a file on mobile
  const handleFileSelect = async (fileId) => {
    try {
      setIsLoading(true);
      const response = await api.files.getFile(fileId);
      
      console.log('Selected file with difficulty:', response.data?.difficulty);
      
      if (response && response.data) {
        setSelectedFile(response.data);
        
        if (onFileSelect) {
          onFileSelect(response.data);
          
          // Close the files panel automatically after selecting a file
          onClose();
          
          // Also close the mobile navbar if we're on mobile
          if (window.innerWidth < 768) {
            // Dispatch a custom event that App.jsx can listen for
            window.dispatchEvent(new CustomEvent('close-mobile-navbar'));
            
            // Set mobile view to 'code' to show the editor
            window.dispatchEvent(new CustomEvent('switch-mobile-view', { detail: 'code' }));
          }
        }
      } else {
        throw new Error('Invalid file data received');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      
      // Handle unauthorized errors gracefully
      if (error.status === 401 || error.details?.msg === 'Not authorized to view this file') {
        toast.error("You don't have permission to view this file");
      } else {
        toast.error('Failed to load file. Please try again.');
      }
      
      // Clear selected file
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new function to handle sharing
  const handleShareItem = async (e, item, itemType) => {
    e.stopPropagation(); // Prevent file selection or directory navigation
    
    try {
      if (itemType === 'file') {
        // For files, we can directly share
        toast.success(`Share link for ${item.name} copied to clipboard!`);
        // You can add actual sharing functionality here
        // For example, copy a link to clipboard or open a share modal
        
        // Example to copy a shareable link
        const shareUrl = `${window.location.origin}/shared/${item._id}`;
        await navigator.clipboard.writeText(shareUrl);
      } else if (itemType === 'directory') {
        // For directories, we might handle differently
        toast.success(`Sharing for folders coming soon`);
      }
    } catch (error) {
      console.error('Error sharing item:', error);
      toast.error('Failed to share item');
    }
  };

  // Save current code as a new file
  const saveCurrentCode = async () => {
    if (!currentCode || !newFileName) return;
    
    try {
      setIsSaving(true);
      
      const dirId = currentDirectory === 'root' ? null : currentDirectory;
      
      // Get appropriate file extension based on language
      let fileName = newFileName;
      
      // Only append extension if not already present
      if (!fileName.includes('.')) {
        const extension = getFileExtensionForLanguage(currentLanguage);
        fileName = `${fileName}${extension}`;
      }
      
      const payload = {
        name: fileName,
        code: currentCode,
        language: currentLanguage,
        directoryId: dirId,
        difficulty: 'easy' // Default to easy difficulty for new files
      };
      
      console.log('Saving file with payload:', payload);
      const response = await api.files.saveCurrentCode(payload);
      
      console.log('Save file response:', response.data, 'Difficulty:', response.data.file?.difficulty);
      
      if (response && response.data && response.data.success) {
        setIsCreatingFile(false);
        setNewFileName('');
        toast.success('File saved successfully');
        
        // Update the current directory files
        fetchDirectoryContents(currentDirectory);
        
        if (onSaveSuccess && response.data.file) {
          onSaveSuccess(response.data.file);
        }
      } else {
        throw new Error('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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

  // Create a new directory
  const createDirectory = async () => {
    if (!newDirName) return;
    
    try {
      setIsSaving(true);
      
      const parentId = currentDirectory === 'root' ? null : currentDirectory;
      
      await api.directories.createDirectory({
        name: newDirName,
        parentId
      });
      
      setIsCreatingDir(false);
      setNewDirName('');
      toast.success('Directory created');
      
      // Only fetch the current directory contents
      fetchDirectoryContents(currentDirectory);
      fetchDirectoryTree();
    } catch (error) {
      console.error('Error creating directory:', error);
      toast.error('Failed to create directory');
    } finally {
      setIsSaving(false);
    }
  };

  // Show confirmation dialog before deleting a file
  const showDeleteFileConfirmation = (fileId, fileName) => {
    setConfirmationDialog({
      show: true,
      itemId: fileId,
      itemName: fileName,
      itemType: 'file',
      action: 'delete'
    });
  };

  // Show confirmation dialog before deleting a directory
  const showDeleteDirectoryConfirmation = (dirId, dirName) => {
    setConfirmationDialog({
      show: true,
      itemId: dirId,
      itemName: dirName,
      itemType: 'directory',
      action: 'delete'
    });
  };

  // Handle confirmation action
  const handleConfirmAction = async () => {
    const { itemId, itemType, action } = confirmationDialog;
    
    if (action === 'delete') {
      try {
        if (itemType === 'file') {
          await api.files.deleteFile(itemId);
          toast.success('File deleted');
          fetchDirectoryContents(currentDirectory);
          if (selectedFile && selectedFile._id === itemId) {
            setSelectedFile(null);
          }
        } else if (itemType === 'directory') {
          await api.directories.deleteDirectory(itemId, true);
          toast.success('Directory deleted');
          
          // Remove the directory from our cache
          setDirectoriesFiles(prev => {
            const newCache = { ...prev };
            delete newCache[itemId];
            return newCache;
          });
          
          fetchDirectoryContents(currentDirectory);
          fetchDirectoryTree();
          if (currentDirectory === itemId) {
            setCurrentDirectory('root');
          }
        }
      } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        toast.error(`Failed to delete ${itemType}`);
      }
    }
    
    // Close dialog
    setConfirmationDialog({
      show: false,
      itemId: '',
      itemName: '',
      itemType: '',
      action: null
    });
  };

  // Handle cancel action
  const handleCancelAction = () => {
    setConfirmationDialog({
      show: false,
      itemId: '',
      itemName: '',
      itemType: '',
      action: null
    });
  };

  // Delete a file - modified to show confirmation dialog
  const deleteFile = async (fileId, fileName) => {
    showDeleteFileConfirmation(fileId, fileName);
  };

  // Delete a directory - modified to show confirmation dialog
  const deleteDirectory = async (dirId, dirName) => {
    showDeleteDirectoryConfirmation(dirId, dirName);
  };

  // Duplicate a file
  const duplicateFile = async (fileId, fileName) => {
    try {
      await api.files.duplicateFile({
        fileId,
        newName: `${fileName} (copy)`
      });
      toast.success('File duplicated');
      fetchDirectoryContents(currentDirectory);
    } catch (error) {
      console.error('Error duplicating file:', error);
      toast.error('Failed to duplicate file');
    }
  };

  // Show rename dialog for a file
  const showRenameFileDialog = (fileId, fileName, difficulty, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    console.log('Opening rename dialog with difficulty:', difficulty);
    
    setRenameDialog({
      isOpen: true,
      itemId: fileId,
      itemName: fileName,
      itemType: 'file',
      difficulty: difficulty || 'easy' // Ensure a default if difficulty is undefined
    });
  };

  // Show rename dialog for a directory
  const showRenameDirectoryDialog = (dirId, dirName, e) => {
    e.stopPropagation();
    setRenameDialog({
      isOpen: true,
      itemId: dirId,
      itemName: dirName,
      itemType: 'directory'
    });
  };

  // Handle rename completion
  const handleRename = async (newName, difficulty) => {
    const { itemId, itemType } = renameDialog;
    
    console.log('Renaming with difficulty:', difficulty);
    
    try {
      if (itemType === 'file') {
        await api.files.renameFile(itemId, newName, difficulty || 'easy');
        toast.success('File renamed');
        
        // Update the file in our cache
        setDirectoriesFiles(prev => {
          const newCache = { ...prev };
          Object.keys(newCache).forEach(dirId => {
            const dirFiles = newCache[dirId];
            const fileIndex = dirFiles.findIndex(f => f._id === itemId);
            if (fileIndex !== -1) {
              newCache[dirId] = [
                ...dirFiles.slice(0, fileIndex),
                { ...dirFiles[fileIndex], name: newName, difficulty: difficulty || 'easy' },
                ...dirFiles.slice(fileIndex + 1)
              ];
            }
          });
          return newCache;
        });
        
        fetchDirectoryContents(currentDirectory);
        
        // Update selected file name if it's the one being renamed
        if (selectedFile && selectedFile._id === itemId) {
          setSelectedFile({
            ...selectedFile,
            name: newName,
            difficulty: difficulty || 'easy'
          });
        }
      } else if (itemType === 'directory') {
        await api.directories.renameDirectory(itemId, newName);
        toast.success('Folder renamed');
        fetchDirectoryContents(currentDirectory);
        fetchDirectoryTree();
      }
    } catch (error) {
      console.error(`Error renaming ${itemType}:`, error);
      toast.error(`Failed to rename ${itemType}`);
    }
    
    // Close rename dialog
    setRenameDialog({
      isOpen: false,
      itemId: '',
      itemName: '',
      itemType: ''
    });
  };

  // Close rename dialog
  const closeRenameDialog = () => {
    setRenameDialog({
      isOpen: false,
      itemId: '',
      itemName: '',
      itemType: '',
      difficulty: 'easy'
    });
  };

  // Drag and drop handlers
  const handleDragStart = (item, type) => {
    setDraggedItem({ id: item._id, type, name: item.name });
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetId && draggedItem && targetId !== draggedItem.id) {
      setDropTarget(targetId);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e, targetDirId) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDropTarget(null);

    if (!draggedItem || targetDirId === draggedItem.id) {
      setDraggedItem(null);
      return;
    }      try {
        if (draggedItem.type === 'file') {
          await api.files.moveFile(draggedItem.id, targetDirId === 'root' ? null : targetDirId);
          toast.success(`Moved ${draggedItem.name} to ${targetDirId === 'root' ? 'My Files' : 'selected folder'}`);
          
          // Update our directory file cache
          setDirectoriesFiles(prev => {
            const newCache = { ...prev };
            
            // Remove the file from all directories
            Object.keys(newCache).forEach(dirId => {
              newCache[dirId] = newCache[dirId].filter(file => file._id !== draggedItem.id);
            });
            
            return newCache;
          });
          
        } else if (draggedItem.type === 'directory') {
          // Prevent moving a directory inside itself or its children
          if (isSubdirectory(draggedItem.id, targetDirId)) {
            toast.error("Cannot move a folder into itself or its subfolder");
            setDraggedItem(null);
            return;
          }
          
          await api.directories.moveDirectory(draggedItem.id, targetDirId === 'root' ? null : targetDirId);
          toast.success(`Moved ${draggedItem.name} to ${targetDirId === 'root' ? 'My Files' : 'selected folder'}`);
          
          // Remove the directory from our cache
          setDirectoriesFiles(prev => {
            const newCache = { ...prev };
            delete newCache[draggedItem.id];
            return newCache;
          });
        }
        
        // Refresh the view
        fetchDirectoryContents(currentDirectory);
        fetchDirectoryTree();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
    
    setDraggedItem(null);
  };

  // Check if targetDir is a subdirectory of dir (to prevent invalid moves)
  const isSubdirectory = (dirId, targetDirId) => {
    if (targetDirId === 'root') return false;
    if (dirId === targetDirId) return true;
    
    // Find target directory in tree
    const findDirById = (dirs, id) => {
      for (const dir of dirs) {
        if (dir._id === id) return dir;
        if (dir.children && dir.children.length > 0) {
          const found = findDirById(dir.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const targetDir = findDirById(directoryTree, targetDirId);
    if (!targetDir) return false;
    
    // Check if dirId is in targetDir's parent chain
    const isInParentChain = (dir, id) => {
      if (!dir.parent) return false;
      if (dir.parent === id || dir.parent._id === id) return true;
      
      // Find parent directory
      const parentDir = findDirById(directoryTree, 
        typeof dir.parent === 'object' ? dir.parent._id : dir.parent);
      if (!parentDir) return false;
      
      return isInParentChain(parentDir, id);
    };
    
    return isInParentChain(targetDir, dirId);
  };

  // Recursive component to render directory tree with proper indentation for nested content
  const DirectoryTreeItem = ({ item, level = 0 }) => {
    if (item.type !== 'directory') return null;
    
    const isExpanded = expandedDirs.has(item._id);
    
    // Get files from the directoriesFiles cache if available, or fall back to filtering
    const dirId = item._id;
    let directoryFiles = directoriesFiles[dirId] || [];
    
    // If no cached files for this directory, try to find files by filtering
    if (directoryFiles.length === 0) {
      const unsortedDirectoryFiles = item.files && Array.isArray(item.files) 
        ? item.files 
        : files.filter(file => 
            file.directoryId === item._id || 
            file.directory === item._id || 
            file.parent === item._id ||
            // Handle string or object references in the file
            (typeof file.directory === 'object' && file.directory?._id === item._id) ||
            (typeof file.parent === 'object' && file.parent?._id === item._id)
          );
      
      // Apply sort option to these files
      directoryFiles = sortOption === 'date'
        ? sortItemsByOption(unsortedDirectoryFiles)
        : sortItems(unsortedDirectoryFiles);
    } else if (sortOption === 'date') {
      // Apply date sorting to cached files if needed
      directoryFiles = sortItemsByOption(directoryFiles);
    }
    
    // Sort the children directories if they exist
    const sortedChildren = item.children && item.children.length > 0
      ? (sortOption === 'date'
          ? sortItemsByOption(item.children.filter(child => child.type === 'directory'))
          : sortItems(item.children.filter(child => child.type === 'directory')))
      : [];
    
    const hasChildren = (sortedChildren && sortedChildren.length > 0) || directoryFiles.length > 0;
    const isDropTarget = dropTarget === item._id;
    
    return (
      <div className="directory-tree-item">
        <div 
          className={`group flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
            currentDirectory === item._id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''
          } ${isDropTarget ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700' : ''}`}
          style={{ paddingLeft: `${(level * 16) + 8}px` }}
          onClick={() => navigateToDirectory(item._id)}
          draggable
          onDragStart={() => handleDragStart(item, 'directory')}
          onDragOver={(e) => handleDragOver(e, item._id)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item._id)}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleDirectoryExpanded(item._id);
            }} 
            className="mr-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0 w-4"
            >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <div className="flex-shrink-0 w-5 mr-2">
            <Folder size={16} className="text-blue-500 dark:text-blue-400" />
            </div>
            <span className="truncate text-sm font-medium">{item.name}</span>
            <div className={`ml-auto flex items-center flex-shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <button
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
              onClick={(e) => handleShareItem(e, item, 'directory')}
              aria-label="Share directory"
            >
              <Share2 size={14} />
            </button>
            <button
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
              onClick={(e) => showRenameDirectoryDialog(item._id, item.name, e)}
              aria-label="Rename directory"
            >
              <Edit size={14} />
            </button>
            </div>
            </div>
            
            {/* Don't try to expand if there are no children */}
        {isExpanded && (
          <div className="directory-tree-children">
            {/* First show files in this directory */}
            {directoryFiles && directoryFiles.map(file => (
              <div 
                key={file._id}
                className={`group flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
                  selectedFile && selectedFile._id === file._id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                } ${dropTarget === file._id ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700' : ''}`}
                style={{ paddingLeft: `${(level + 1) * 16 + 16}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect(file._id);
                }}
                draggable
                onDragStart={() => handleDragStart(file, 'file')}
                onDragOver={(e) => handleDragOver(e, file._id)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <div className="flex-shrink-0 w-5 mr-2">
                  <LanguageIcon language={file.language} size={16} />
                </div>
                <div className="truncate text-sm">
                  <span>{file.name}</span>
                  {sortOption === 'date' && file.lastModified && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center flex-shrink-0">
                  <button
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    onClick={(e) => handleShareItem(e, file, 'file')}
                    aria-label="Share file"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    onClick={(e) => showRenameFileDialog(file._id, file.name, file.difficulty, e)}
                    aria-label="Rename file"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Then show subdirectories */}
            {sortedChildren && sortedChildren.map(child => (
                <DirectoryTreeItem 
                  key={child._id} 
                  item={child} 
                  level={level + 1} 
                />
              )
            )}
            
            {/* Show empty state message only if there are no contents AND we're expanded */}
            {!hasChildren && (
              <div className="text-xs text-gray-500 dark:text-gray-400 py-1"
                   style={{ paddingLeft: `${(level + 1) * 16 + 16}px` }}>
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render breadcrumb navigation
  const BreadcrumbNav = () => {
    const [path, setPath] = useState([]);
    
    // Build breadcrumb path when current directory changes
    useEffect(() => {
      const buildPath = async () => {
        if (currentDirectory === 'root') {
          setPath([{ _id: 'root', name: 'My Files' }]);
          return;
        }
        
        try {
          const response = await api.directories.getDirectory(currentDirectory);
          
          if (!response || !response.data || !response.data.directory) {
            setPath([{ _id: 'root', name: 'My Files' }]);
            return;
          }
          
          const dir = response.data.directory;
          
          const newPath = [{ _id: 'root', name: 'My Files' }];
          
          if (dir.parent) {
            try {
              const parentResponse = await api.directories.getDirectory(dir.parent._id);
              if (parentResponse && parentResponse.data && parentResponse.data.directory) {
                newPath.push({ 
                  _id: parentResponse.data.directory._id,
                  name: parentResponse.data.directory.name
                });
              }
            } catch (parentError) {
              console.debug('Unable to fetch parent directory:', parentError);
            }
          }
          
          newPath.push({ _id: dir._id, name: dir.name });
          setPath(newPath);
        } catch (error) {
          console.debug('Building path incomplete:', error);
          setPath([{ _id: 'root', name: 'My Files' }]);
        }
      };
      
      buildPath();
    }, []); 
    
    return (
      <div className="flex items-center overflow-x-auto whitespace-nowrap py-2 px-1 scrollbar-hide">
        {path.map((item, index) => (
          <React.Fragment key={item._id}>
            {index > 0 && (
              <ChevronRight size={14} className="mx-1 text-gray-400 dark:text-gray-500" />
            )}
            <button
              className={`text-sm font-medium ${
                currentDirectory === item._id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => navigateToDirectory(item._id)}
            >
              {item.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Handle search functionality
  useEffect(() => {
    // Don't search if query is empty
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults({ files: [], directories: [] });
      return;
    }

    setIsSearching(true);
    
    // Function to perform search across all files and directories
    const performSearch = () => {
      const query = searchQuery.toLowerCase().trim();
      
      // Search in files
      const matchedFiles = files.filter(file => 
        file.name.toLowerCase().includes(query)
      );
      
      // Search in directories
      const matchedDirectories = directories.filter(dir => 
        dir.name.toLowerCase().includes(query)
      );
      
      // Also search in directory tree to include nested directories
      const matchedTreeDirs = [];
      const searchInTree = (items) => {
        if (!Array.isArray(items)) return;
        
        items.forEach(item => {
          // Only add directories that aren't already in the directories list
          if (item.type === 'directory' && 
              item.name.toLowerCase().includes(query) && 
              !directories.some(d => d._id === item._id) &&
              !matchedTreeDirs.some(d => d._id === item._id)) {
            matchedTreeDirs.push(item);
          }
          
          // Recursively search in children
          if (item.children && Array.isArray(item.children)) {
            searchInTree(item.children);
          }
        });
      };
      
      searchInTree(directoryTree);
      
      // Update the search results
      setSearchResults({
        files: matchedFiles,
        directories: [...matchedDirectories, ...matchedTreeDirs]
      });
    };
    
    // Debounce the search to avoid performance issues
    const debounceTimeout = setTimeout(performSearch, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, files, directories, directoryTree]);

  // Function to sort items by the selected option
  const sortItemsByOption = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    
    return [...items].sort((a, b) => {
      if (sortOption === 'date') {
        // Sort by creation date (most recent first)
        const dateA = new Date(a.createdAt || a.lastModified || a.updatedAt || 0);
        const dateB = new Date(b.createdAt || b.lastModified || b.updatedAt || 0);
        return dateB - dateA;
      } else {
        // Default to name sorting using the existing sortItems function
        return sortItems([a, b])[0]._id === a._id ? -1 : 1;
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className={`fixed inset-0 bg-white dark:bg-gray-900 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">My Files</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center">
            <Folder size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Sign in to save files</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create an account to save and manage your code files.
            </p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open-auth-modal'));
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-white dark:bg-gray-900 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col`}>
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">My Files</h2>
        <div className="flex items-center">
          {/* Mobile navigation tabs */}
          {isMobile && (
            <div className="flex mr-4 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
              <button 
                onClick={() => setActiveView('tree')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeView === 'tree' 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Files
              </button>
              <button 
                onClick={() => setActiveView('content')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeView === 'content' 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {currentDirectory === 'root' ? 'Content' : directories.find(d => d._id === currentDirectory)?.name || 'Content'}
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search files and folders..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-shrink-0">
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Creation Date</option>
            </select>
          </div>
        </div>
        
        {/* Show search results count when searching */}
        {isSearching && searchQuery.trim() && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Found {searchResults.files.length + searchResults.directories.length} results for "{searchQuery}"
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
        {/* Sidebar / Tree View */}
        <div className={`
          ${isMobile ? (activeView === 'tree' ? 'block' : 'hidden') : 'block'}
          w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto
        `}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Files & Directories</h3>
              <div className="flex space-x-1">
                <button
                  onClick={() => setIsCreatingFile(true)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Create file"
                >
                  <FilePlus size={16} className="text-blue-600 dark:text-blue-400" />
                </button>
                <button
                  onClick={() => setIsCreatingDir(true)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Create directory"
                >
                  <FolderPlus size={16} className="text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            </div>
            
            {/* File tree structure */}
            <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
              {/* Root directory with toggle */}
              <div 
                className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
                  currentDirectory === 'root' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''
                } ${dropTarget === 'root' ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700' : ''}`}
                onClick={() => navigateToDirectory('root')}
                onDragOver={(e) => handleDragOver(e, 'root')}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'root')}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExpanded = new Set(expandedDirs);
                    if (newExpanded.has('root')) {
                      newExpanded.delete('root');
                    } else {
                      newExpanded.add('root');
                    }
                    setExpandedDirs(newExpanded);
                  }} 
                  className="mr-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={expandedDirs.has('root') ? "Collapse root directory" : "Expand root directory"}
                >
                  {expandedDirs.has('root') ? <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" /> : <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />}
                </button>
                <div className="flex-shrink-0 w-5 mr-2">
                  <Folder size={16} className="text-blue-500 dark:text-blue-400" />
                </div>
                <span className="truncate text-sm font-medium text-gray-900 dark:text-white">My Files</span>
              </div>
              
              {/* Root level files */}
              {expandedDirs.has('root') && (
                <div>
                  {/* Show root level files */}
                  {(sortOption === 'date'
                    ? sortItemsByOption(
                        files.filter(file => (!file.directoryId && !file.directory && !file.parent) || 
                                    (file.directoryId === null || file.directory === null || file.parent === null))
                      )
                    : sortItems(
                        files.filter(file => (!file.directoryId && !file.directory && !file.parent) || 
                                    (file.directoryId === null || file.directory === null || file.parent === null))
                      )
                  ).map(file => (
                      <div 
                        key={file._id}
                        className={`group flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
                          selectedFile && selectedFile._id === file._id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                        } ${dropTarget === file._id ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700' : ''}`}
                        style={{ paddingLeft: '32px' }}
                        onClick={() => handleFileSelect(file._id)}
                        draggable
                        onDragStart={() => handleDragStart(file, 'file')}
                        onDragOver={(e) => handleDragOver(e, file._id)}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                      >
                        <div className="flex-shrink-0 w-5 mr-2">
                          <LanguageIcon language={file.language} size={16} />
                        </div>
                        <div className="truncate text-sm">
                          <span>{file.name}</span>
                          {sortOption === 'date' && file.createdAt && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center flex-shrink-0">
                          <button
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                            onClick={(e) => handleShareItem(e, file, 'file')}
                            aria-label="Share file"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                            onClick={(e) => showRenameFileDialog(file._id, file.name, file.difficulty, e)}
                            aria-label="Rename file"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  }
                  
                  {/* Show non-root directories */}
                  {sortItems(directoryTree.filter(item => item.type === 'directory')).map(item => (
                    <DirectoryTreeItem key={item._id} item={item} level={1} />
                  ))}
                  
                  {/* Show empty state if no files or directories */}
                  {files.filter(file => !file.directoryId && !file.directory && !file.parent).length === 0 && directoryTree.length === 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 py-1 px-2 pl-8">
                      No files or folders
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`
          ${isMobile ? (activeView === 'content' ? 'block' : 'hidden') : 'block'}
          w-full md:w-2/3 lg:w-3/4 flex flex-col overflow-hidden
        `}>
          {/* Breadcrumb and Actions */}
          <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <BreadcrumbNav />
            
            <div className="flex mt-2 md:mt-0">
              <button
                onClick={() => setIsCreatingFile(true)}
                className="flex items-center px-3 py-1.5 mr-2 rounded-md text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                <FilePlus size={16} className="mr-1" />
                <span>New File</span>
              </button>
              <button
                onClick={() => setIsCreatingDir(true)}
                className="flex items-center px-3 py-1.5 rounded-md text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderPlus size={16} className="mr-1" />
                <span>New Folder</span>
              </button>
            </div>
          </div>
          
          {/* Directory Content */}
          <div className="flex-grow overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : isSearching && searchQuery.trim() ? (
              // Show search results
              <>
                {/* Search Results */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                  
                  {/* Directories in search results */}
                  {searchResults.directories.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">Directories</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sortItemsByOption(searchResults.directories).map(dir => (
                          <div 
                            key={dir._id}
                            className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer group"
                            onClick={() => navigateToDirectory(dir._id)}
                          >
                            <div className="flex-shrink-0 w-6 mr-3">
                              <Folder size={20} className="text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <div className="font-medium truncate">{dir.name}</div>
                              {sortOption === 'date' && dir.createdAt && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(dir.createdAt || dir.lastModified || dir.updatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files in search results */}
                  {searchResults.files.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">Files</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sortItemsByOption(searchResults.files).map(file => (
                          <div 
                            key={file._id}
                            className={`relative flex items-center p-3 rounded-md border hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer group 
                              ${selectedFile && selectedFile._id === file._id
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                            onClick={() => handleFileSelect(file._id)}
                          >
                            <div className="flex-shrink-0 w-6 mr-3">
                              <LanguageIcon language={file.language} />
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <div className="font-medium truncate">{file.name}</div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                {file.language} • {new Date(file.createdAt || file.lastModified).toLocaleDateString()}
                                {file.difficulty && (
                                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                    file.difficulty === 'easy' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                      : file.difficulty === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {file.difficulty.charAt(0).toUpperCase() + file.difficulty.slice(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No results message */}
                  {searchResults.directories.length === 0 && searchResults.files.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <Search size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                      <h3 className="text-lg font-medium mb-2">No matches found</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                        Try different keywords or check your spelling
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Regular content when not searching */}
                {/* Directories */}
                {directories.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">Directories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(sortOption === 'date' 
                        ? sortItemsByOption(directories) 
                        : sortItems(directories)
                      ).map(dir => (
                        <div 
                          key={dir._id}
                          className={`flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md border 
                            ${dropTarget === dir._id ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'} 
                            hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer group`}
                          onClick={() => navigateToDirectory(dir._id)}
                          draggable
                          onDragStart={() => handleDragStart(dir, 'directory')}
                          onDragOver={(e) => handleDragOver(e, dir._id)}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dir._id)}
                        >
                            <div className="flex-shrink-0 w-6 mr-3">
                              <Folder size={20} className="text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <div className="font-medium truncate">{dir.name}</div>
                              {sortOption === 'date' && (dir.createdAt || dir.lastModified || dir.updatedAt) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(dir.createdAt || dir.lastModified || dir.updatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          <div className={`flex ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex-shrink-0`}>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareItem(e, dir, 'directory');
                              }}
                              aria-label="Share directory"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                showRenameDirectoryDialog(dir._id, dir.name, e);
                              }}
                              aria-label="Rename directory"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDirectory(dir._id, dir.name);
                              }}
                              aria-label="Delete directory"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {files.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">Files</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(sortOption === 'date' 
                        ? sortItemsByOption(files)
                        : sortItems(files)
                      ).map(file => (
                        <div 
                          key={file._id}
                          className={`relative flex items-center p-3 rounded-md border hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer group 
                            ${dropTarget === file._id ? 'border-blue-300 dark:border-blue-700' : ''} 
                            ${selectedFile && selectedFile._id === file._id
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                          onClick={() => handleFileSelect(file._id)}
                          draggable
                          onDragStart={() => handleDragStart(file, 'file')}
                          onDragOver={(e) => handleDragOver(e, file._id)}
                          onDragEnter={handleDragEnter}
                          onDragLeave={handleDragLeave}
                        >
                          {/* Fixed width container for icon */}
                          <div className="flex-shrink-0 w-6 mr-3">
                            <LanguageIcon language={file.language} />
                          </div>
                          <div className="flex-grow overflow-hidden">
                            <div className="font-medium truncate">{file.name}</div>
                            {/* Display difficulty tag below filename */}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                (file.difficulty || 'easy') === 'easy' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                  : (file.difficulty || 'easy') === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {((file.difficulty || 'easy').charAt(0).toUpperCase() + (file.difficulty || 'easy').slice(1))}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {file.language} • {new Date(file.createdAt || file.lastModified).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className={`flex ${ isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ml-2 flex-shrink-0`}>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareItem(e, file, 'file');
                              }}
                              aria-label="Share file"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                showRenameFileDialog(file._id, file.name, file.difficulty, e);
                              }}
                              aria-label="Rename file"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateFile(file._id, file.name);
                              }}
                              aria-label="Duplicate file"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file._id, file.name);
                              }}
                              aria-label="Delete file"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {directories.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <File size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-medium mb-2">No files yet</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                          Save your code to access it anytime and across devices.
                        </p>
                        <button
                          onClick={() => setIsCreatingFile(true)}
                          className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <FilePlus size={16} className="mr-2" />
                          <span>Create a file</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create File Modal */}
      {isCreatingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Current Code</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">File Name</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="flex-grow border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter file name"
                  autoFocus
                />
                {!newFileName.includes('.') && 
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    {getFileExtensionForLanguage(currentLanguage)}
                  </span>
                }
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The appropriate file extension will be added automatically based on the language.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Location</label>
              <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3">
                <Folder size={16} className="mr-2 text-blue-500 dark:text-blue-400" />
                <span className="truncate">
                  {currentDirectory === 'root' ? 'My Files' : 
                    directories.find(d => d._id === currentDirectory)?.name || 'My Files'}
                </span>
              </div>
              <button
                onClick={() => {
                  // Show directory picker - Add this functionality
                  const directoryPicker = document.createElement('select');
                  directoryPicker.className = 'mt-2 w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md';
                  
                  // Add root option
                  const rootOption = document.createElement('option');
                  rootOption.value = 'root';
                  rootOption.innerText = 'My Files (root)';
                  directoryPicker.appendChild(rootOption);
                  
                  // Add all directories
                  directories.forEach(dir => {
                    const option = document.createElement('option');
                    option.value = dir._id;
                    option.innerText = dir.name;
                    directoryPicker.appendChild(option);
                  });
                  
                  directoryPicker.value = currentDirectory;
                  directoryPicker.addEventListener('change', (e) => {
                    setCurrentDirectory(e.target.value);
                  });
                  
                  // Replace or append to the current container
                  const container = document.querySelector('.directory-picker-container');
                  if (container) {
                    container.appendChild(directoryPicker);
                  }
                }}
                className="w-full text-sm text-blue-600 dark:text-blue-400 mt-1 text-left hover:underline"
              >
                Change location
              </button>
              <div className="directory-picker-container mt-2"></div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsCreatingFile(false);
                  setNewFileName('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentCode}
                disabled={isSaving || !newFileName.trim()}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                  isSaving || !newFileName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Directory Modal */}
      {isCreatingDir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Directory</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Directory Name</label>
              <input
                type="text"
                value={newDirName}
                onChange={e => setNewDirName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter directory name"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Parent Directory</label>
              <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3">
                <Folder size={16} className="mr-2 text-blue-500 dark:text-blue-400" />
                <span className="truncate">
                  {currentDirectory === 'root' ? 'My Files' : 
                    directories.find(d => d._id === currentDirectory)?.name || 'My Files'}
                </span>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsCreatingDir(false);
                  setNewDirName('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createDirectory}
                disabled={isSaving || !newDirName.trim()}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                  isSaving || !newDirName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Creating...' : 'Create Directory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Action
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmationDialog.itemType === 'file' 
                ? `Are you sure you want to delete "${confirmationDialog.itemName}"? This action cannot be undone.`
                : `Are you sure you want to delete "${confirmationDialog.itemName}" and all its contents? This action cannot be undone.`}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelAction}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add RenameDialog Component */}
      <RenameDialog 
        isOpen={renameDialog.isOpen}
        onClose={closeRenameDialog}
        onRename={handleRename}
        itemName={renameDialog.itemName}
        itemType={renameDialog.itemType}
        difficulty={renameDialog.difficulty}
      />
    </div>
  );
};

export default FilesPanel;
