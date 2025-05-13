import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

const SaveFileButton = ({ 
  onClick, 
  currentFile = null,
  isMobile = false,
  disabled = false 
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { isAuthenticated } = useSelector(state => state.auth);
  
  const handleClick = () => {
    if (!isAuthenticated) {
      // Trigger auth modal to open
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      toast.error('Please sign in to save your code');
      return;
    }
    
    onClick();
    
    // Show success animation
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center ${isMobile ? 'p-2' : 'px-3 py-1.5'} rounded-md ${
        currentFile 
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40' 
          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={currentFile ? `Update "${currentFile.name}"` : "Save code as new file"}
    >
      {saveSuccess ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          <span className={isMobile ? 'hidden' : ''}>Saved</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-1" />
          <span className={isMobile ? 'hidden' : ''}>{currentFile ? 'Update' : 'Save As'}</span>
        </>
      )}
    </button>
  );
};

export default SaveFileButton;
