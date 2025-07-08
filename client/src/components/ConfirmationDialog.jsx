import { useState, useEffect, useRef, useCallback } from 'react';

function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef(null);
  
  // Handle escape key press to close the dialog
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleCancel, isOpen]);
  
  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen) {
      // Focus on dialog when opened
      setTimeout(() => {
        const confirmButton = dialogRef.current?.querySelector('button[data-confirm]');
        if (confirmButton) confirmButton.focus();
      }, 50);
    }
  }, [isOpen]);
  
  // Prevent scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const handleCancel = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200); // Match transition duration
  }, [onClose]);
  
  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirm();
      onClose();
      setIsClosing(false);
    }, 200); // Match transition duration
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-200" 
      style={{ opacity: isClosing ? 0 : 1 }}
      onClick={handleCancel}
    >
      <div 
        ref={dialogRef}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
            onClick={handleCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-confirm
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
