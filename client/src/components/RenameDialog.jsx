import React, { useState, useEffect } from 'react';
import { 
  X, 
  File, 
  Folder,
  Edit
} from 'lucide-react';

const RenameDialog = ({ 
  isOpen, 
  onClose, 
  onRename, 
  itemName = '', 
  itemType = 'file'  // 'file' or 'directory'
}) => {
  const [newName, setNewName] = useState(itemName);

  // Reset name when the dialog opens with a new item
  useEffect(() => {
    if (isOpen) {
      setNewName(itemName);
    }
  }, [itemName, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      return;
    }
    
    onRename(newName);
  };
  
  // Get file extension to preserve it for files
  const getFileExtension = (fileName) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  };

  // For files, separate base name and extension
  const getFileName = (fileName) => {
    if (itemType !== 'file') return fileName;
    
    const extension = getFileExtension(fileName);
    if (!extension) return fileName;
    
    return fileName.substring(0, fileName.length - extension.length);
  };

  // Create input change handler that preserves file extension
  const handleInputChange = (e) => {
    if (itemType === 'file') {
      const extension = getFileExtension(itemName);
      const newBaseName = e.target.value;
      
      // If we have an extension, make sure it's preserved
      if (extension) {
        setNewName(newBaseName + extension);
      } else {
        setNewName(newBaseName);
      }
    } else {
      setNewName(e.target.value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {itemType === 'file' ? (
              <File size={18} className="mr-2 text-blue-500" />
            ) : (
              <Folder size={18} className="mr-2 text-blue-500" />
            )}
            <h3 className="text-lg font-semibold">Rename {itemType === 'file' ? 'File' : 'Folder'}</h3>
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
              New Name
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={itemType === 'file' ? getFileName(newName) : newName}
                onChange={handleInputChange}
                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
                autoFocus
              />
              {itemType === 'file' && getFileExtension(itemName) && (
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  {getFileExtension(itemName)}
                </span>
              )}
            </div>
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
              disabled={!newName.trim() || newName === itemName}
              className={`px-4 py-2 text-sm text-white bg-blue-500 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                !newName.trim() || newName === itemName ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameDialog;
