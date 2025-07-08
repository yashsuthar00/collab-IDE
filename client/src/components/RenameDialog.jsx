import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';

const RenameDialog = ({ isOpen, onClose, onRename, itemName, itemType, difficulty }) => {
  const [newName, setNewName] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  
  useEffect(() => {
    if (isOpen) {
      setNewName(itemName || '');
      setSelectedDifficulty(difficulty || 'easy');
      console.log('RenameDialog opened with difficulty:', difficulty);
      console.log('Button should be disabled:', (!itemName.trim() || itemName.trim() === itemName) && (difficulty || 'easy') === difficulty);
    }
  }, [isOpen, itemName, difficulty]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newName && newName.trim() !== '') {
      console.log('Submitting rename with name:', newName, 'difficulty:', selectedDifficulty);
      onRename(newName.trim(), selectedDifficulty);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Edit className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="text-lg font-medium">
              Rename {itemType === 'file' ? 'File' : 'Folder'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              New Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>
          
          {itemType === 'file' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Difficulty Level
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('easy')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedDifficulty === 'easy' 
                      ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Easy
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('medium')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedDifficulty === 'medium' 
                      ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('hard')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedDifficulty === 'hard' 
                      ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Hard
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!newName.trim() || newName.trim() === itemName) && selectedDifficulty === difficulty}
              className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                ${((!newName.trim() || newName.trim() === itemName) && selectedDifficulty === difficulty) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
