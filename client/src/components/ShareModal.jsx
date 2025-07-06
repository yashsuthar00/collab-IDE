import React, { useState, useEffect, useRef } from 'react';
import { X, Link, Mail, Copy, Check, Share2, ExternalLink, Clipboard, AlertCircle, Info, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const ShareModal = ({ isOpen, onClose, code, language }) => {
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState('link');
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showFullCode, setShowFullCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [shareLinkError, setShareLinkError] = useState('');
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 640);

  // Track screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setLinkCopied(false);
      setCodeCopied(false);
      setEmail('');
      setMessage('');
      setShowFullCode(false);
      setActiveTab('link');
      setShareLinkError('');
      // Don't reset shareableLink to allow users to copy it after closing and reopening
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Create a shareable link by calling the API
  const createShareableLink = async () => {
    try {
      setIsLoading(true);
      setShareLinkError('');
      
      // Ensure code is a string
      const codeStr = typeof code === 'string' ? code : String(code || '');
      
      // Use the api client instance to make the request
      const response = await api.shared.createSharedCode({
        code: codeStr,
        language: language?.id || 'text',
        expiresIn: 604800 // 7 days in seconds
      });
      
      // Check for successful response
      if (response && response.data && response.data.success) {
        setShareableLink(response.data.data.shareUrl);
        toast.success('Share link generated successfully!');
      } else {
        throw new Error('Failed to create link - unexpected response');
      }
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      setShareLinkError('Failed to create shareable link. Please try again.');
      toast.error('Failed to create shareable link');
    } finally {
      setIsLoading(false);
    }
  };

  // Modern approach using the Clipboard API
  const handleCopyLink = async () => {
    try {
      // Create a link if one doesn't exist yet
      if (!shareableLink && !isLoading && !shareLinkError) {
        await createShareableLink();
      }
      
      if (shareableLink) {
        await navigator.clipboard.writeText(shareableLink);
        setLinkCopied(true);
        toast.success('Link copied to clipboard!');
        
        // Reset the copied state after 3 seconds
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link to clipboard');
    }
  };

  // Modern approach using the Clipboard API for code
  const handleCopyCode = async () => {
    try {
      const codeStr = typeof code === 'string' ? code : String(code || '');
      await navigator.clipboard.writeText(codeStr || '// No code to share');
      setCodeCopied(true);
      toast.success('Code copied to clipboard!');
      
      // Reset the copied state after 3 seconds
      setTimeout(() => setCodeCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      toast.error('Failed to copy code to clipboard');
    }
  };

  const handleEmailShare = async (e) => {
    e.preventDefault();
    // Email validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create a link if one doesn't exist yet
      if (!shareableLink) {
        await createShareableLink();
      }
      
      if (shareableLink) {
        // Send email using the API endpoint
        const response = await api.email.sendCodeShareEmail({
          email,
          message,
          code: typeof code === 'string' ? code : String(code || ''),
          language: language?.id || 'text',
          shareLink: shareableLink
        });
        
        if (response.data.success) {
          toast.success(`Email sent to ${email}`);
          setEmail('');
          setMessage('');
        } else {
          throw new Error(response.data.message || 'Failed to send email');
        }
      }
    } catch (error) {
      console.error('Email share error:', error);
      toast.error(error.message || 'Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get a short preview of the code (first few lines)
  const getCodePreview = () => {
    // Ensure code is a string
    const codeStr = typeof code === 'string' ? code : String(code || '');
    if (!codeStr) return "No code to share";
    
    const lines = codeStr.split('\n');
    const previewLines = lines.slice(0, 5);
    return previewLines.join('\n') + (lines.length > 5 ? '\n...' : '');
  };

  // Get code length info
  const getCodeInfo = () => {
    // Ensure code is a string
    const codeStr = typeof code === 'string' ? code : String(code || '');
    if (!codeStr) return "Empty";
    
    const lines = codeStr.split('\n').length;
    const chars = codeStr.length;
    
    return `${lines} line${lines !== 1 ? 's' : ''}, ${chars} character${chars !== 1 ? 's' : ''}`;
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xs sm:max-w-md lg:max-w-lg mx-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
              Share Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>        {/* Tabs - simplified for mobile */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {['link', 'email', 'code'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-3 sm:py-3 text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === tab 
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <div className="flex items-center justify-center px-1 sm:px-2">
                {tab === 'link' && <Link className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />}
                {tab === 'email' && <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />}
                {tab === 'code' && <Clipboard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />}
                {!isSmallScreen ? (
                  <span className="text-sm">
                    {tab === 'link' ? 'Share Link' : tab === 'email' ? 'Email' : 'Copy Code'}
                  </span>
                ) : (
                  <span className="truncate text-xs">
                    {tab === 'link' ? 'Link' : tab === 'email' ? 'Email' : 'Code'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
          <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {activeTab === 'link' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="mb-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Share your {language?.name || ''} code with others by creating a link:
                </p>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center mt-2 space-y-2 sm:space-y-0">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink || 'Click "Generate Link" to create a shareable link'}
                    onClick={(e) => shareableLink && e.target.select()}
                    className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md sm:rounded-l-md sm:rounded-r-none bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    onClick={shareableLink ? handleCopyLink : createShareableLink}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white px-3 sm:px-4 py-2 rounded-md sm:rounded-l-none sm:rounded-r-md flex items-center justify-center transition-colors text-xs sm:text-sm"
                  >
                    {isLoading ? (
                      <Loader className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : shareableLink ? (
                      linkCopied ? (
                        <>
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          {!isSmallScreen ? <span>Copied!</span> : <span>✓</span>}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span>Copy</span>
                        </>
                      )
                    ) : (
                      <>
                        <Link className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {!isSmallScreen ? <span>Generate Link</span> : <span>Generate</span>}
                      </>
                    )}
                  </button>
                </div>                {shareLinkError && (
                  <div className="mt-2 p-2 text-red-500 text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    {shareLinkError}
                  </div>
                )}

                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex">
                    <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0 mt-0.5" />
                    <p>
                      Anyone with this link will be able to view your code. The link will expire after 7 days.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-2">
                {!showFullCode && <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code Preview:</p>}
                {!showFullCode &&
                <div className="bg-gray-100 dark:bg-gray-900 p-2 sm:p-3 rounded-md font-mono text-xs border border-gray-200 dark:border-gray-700 overflow-hidden whitespace-pre-wrap max-h-24 sm:max-h-32">
                  {getCodePreview()}
                </div> }
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getCodeInfo()}
                  </span>
                  {code && typeof code === 'string' && code.split('\n').length > 5 && (
                    <button 
                      onClick={() => setShowFullCode(!showFullCode)}
                      className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {showFullCode ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
                
                {showFullCode && (
                  <div className="bg-gray-100 dark:bg-gray-900 p-2 sm:p-3 mt-2 rounded-md font-mono text-xs border border-gray-200 dark:border-gray-700 overflow-auto max-h-40 sm:max-h-60 whitespace-pre">
                    {code}
                  </div>
                )}
              </div>
            </div>
          )}          {activeTab === 'email' && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Share your code with others via email:
              </p>
              
              <form onSubmit={handleEmailShare} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="3"
                    placeholder="Add a personal message"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  ></textarea>
                </div>
                
                <div className="flex items-start space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    The recipient will receive your code as both an attachment and in the email body.
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-xs sm:text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Send Email'
                  )}
                </button>
              </form>
            </div>
          )}          {activeTab === 'code' && (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
                Copy your {language?.name || ''} code directly to share elsewhere:
              </p>
              
              <div className="relative">
                <textarea
                  value={typeof code === 'string' ? code : String(code || '')}
                  readOnly
                  onClick={(e) => e.target.select()}
                  rows="8"
                  className="w-full font-mono text-xs p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none resize-none"
                ></textarea>
                
                <div className="absolute top-2 right-2">
                  <button
                    onClick={handleCopyCode}
                    className={`p-1.5 sm:p-2 rounded-md flex items-center ${
                      codeCopied 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="Copy code"
                  >
                    {codeCopied ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm space-y-1 sm:space-y-0">
                <span className="text-gray-500 dark:text-gray-400">
                  {getCodeInfo()}
                </span>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Language: {language?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block items-center">
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline-block align-text-bottom" />
            Sharing from Collab IDE
          </div>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
