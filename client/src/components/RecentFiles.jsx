import React, { useState, useEffect } from 'react';
import { 
  File, Clock, X
} from 'lucide-react';
import api from '../utils/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import LanguageIcon from './LanguageIcon'; // Import the new component

const RecentFiles = ({ onFileSelect, onClose }) => {
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentFiles();
    }
  }, [isAuthenticated]);
  
  const fetchRecentFiles = async () => {
    try {
      setIsLoading(true);
      const response = await api.files.getRecentFiles(5);
      if (response && response.data) {
        setRecentFiles(Array.isArray(response.data) ? response.data : []);
      } else {
        setRecentFiles([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      setIsLoading(false);
      setRecentFiles([]);
    }
  };

  const handleFileSelect = async (fileId) => {
    try {
      const response = await api.files.getFile(fileId);
      if (response && response.data) {
        onFileSelect(response.data);
        onClose();
        
        // Close the mobile navbar if we're on mobile
        if (window.innerWidth < 768) {
          // Dispatch events to close navbar and switch to code view
          window.dispatchEvent(new CustomEvent('close-mobile-navbar'));
          window.dispatchEvent(new CustomEvent('switch-mobile-view', { detail: 'code' }));
        }
      } else {
        toast.error('Could not load file data');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    }
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Clock size={18} className="mr-2 text-blue-500 dark:text-blue-400" />
            <h3 className="text-lg font-semibold">Recent Files</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {recentFiles.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentFiles.map(file => (
                    <li key={file._id}>
                      <button
                        className="w-full flex items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                        onClick={() => handleFileSelect(file._id)}
                      >
                        <LanguageIcon language={file.language} className="mr-3" />
                        <div className="flex-grow text-left">
                          <p className="font-medium">{file.name}</p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            {file.language} • {new Date(file.lastModified).toLocaleString()}
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
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <File size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No recent files found. Save your code to see it here!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecentFiles;
