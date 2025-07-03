import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import SpecialCharactersBar from './SpecialCharactersBar';
import { getSocket, shouldThrottleSync, syncCompleted } from '../utils/api';
import { useRoom } from '../contexts/RoomContext';
import { debounce } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { 
  monacoChangeToOp, applyOps, transformOps, 
  offsetToPosition 
} from '../utils/ot';
import { Maximize2, Minimize2, Expand, RefreshCw } from 'lucide-react';

// Helper function to generate random colors for user cursors
const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9C80E', 
    '#FF8C42', '#A4036F', '#048BA8', '#16DB93', '#EFBCD5'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Create a color map to ensure users always get the same color
const userColorMap = new Map();

// Generate a unique client ID for this editor instance
const CLIENT_ID = uuidv4();
// Add a log level setting
const LOG_LEVEL = 'error'; // 'debug', 'info', 'warn', 'error', or 'none'

// Add a custom logger to control verbosity
const logger = {
  debug: (...args) => LOG_LEVEL === 'debug' ? console.debug(...args) : null,
  info: (...args) => ['debug', 'info'].includes(LOG_LEVEL) ? console.info(...args) : null,
  warn: (...args) => ['debug', 'info', 'warn'].includes(LOG_LEVEL) ? console.warn(...args) : null,
  error: (...args) => LOG_LEVEL !== 'none' ? console.error(...args) : null,
};

function CodeEditor({ code, setCode, language, theme, onRunCode, readOnly = false }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const cursorsRef = useRef(new Map());
  const codeRef = useRef(code);
  const currentVersionRef = useRef(0);
  const pendingOpsRef = useRef([]);
  const isApplyingRemoteOpsRef = useRef(false);
  const suppressEventsRef = useRef(false);
  const selectionRef = useRef(null);
  const bufferRef = useRef([]);
  const bufferTimeoutRef = useRef(null);
  const lastSyncTimeRef = useRef(Date.now());
  const batchUpdateTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const isReceivingUpdatesRef = useRef(false);
  const unmountingRef = useRef(false); // Add ref to track component unmounting
  const syncRequestedRef = useRef(false); // Track sync requests
  
  // Get room context
  const { isInRoom, roomId, currentUser } = useRoom();
  
  const [showCharsBar, setShowCharsBar] = useState(window.innerWidth < 1024);
  const [remoteUserCursors, setRemoteUserCursors] = useState(new Map());
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Function to get a consistent color for a user
  const getUserColor = useCallback((userId) => {
    if (!userColorMap.has(userId)) {
      userColorMap.set(userId, getRandomColor());
    }
    return userColorMap.get(userId);
  }, []);
  
  // Add dynamic CSS for user cursors
  const addCursorStyle = useCallback((userId, color, userName) => {
    const styleId = `cursor-style-${userId}`;
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      .remote-cursor-${userId} {
        background-color: ${color};
        width: 2px !important;
        height: 18px !important;
        position: absolute;
        z-index: 10000;
      }
      .remote-cursor-line-${userId} {
        position: relative;
      }
      .remote-cursor-name-${userId}::before {
        content: "${userName}";
        position: absolute;
        right: 100%;
        opacity: 0.95;
        background-color: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 2px;
        white-space: nowrap;
        z-index: 10001;
        pointer-events: none;
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        font-weight: 500;
      }
      .remote-cursor-name-text-${userId} {
        background-color: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 2px;
        white-space: nowrap;
        position: absolute;
        top: -20px;
        z-index: 10001;
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        font-weight: 500;
      }
    `;
  }, []);
  
  // Add dynamic CSS for user selections
  const addSelectionStyle = useCallback((userId, color) => {
    const styleId = `selection-style-${userId}`;
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      .remote-selection-${userId} {
        background-color: ${color}33;
        border: 1px solid ${color};
        border-radius: 2px;
        z-index: 9999;
      }
    `;
  }, []);

  // Debounced function to emit cursor position
  const emitCursorPosition = useCallback((position) => {
    const debouncedEmit = debounce((pos) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        const socket = getSocket();
        socket.emit('cursor-position', {
          roomId,
          userId: currentUser.id,
          position: pos,
          userName: currentUser.name
        });
      }
    }, 50);
    
    debouncedEmit(position);
  }, [isInRoom, roomId, currentUser, readOnly]);
  
  // Debounced function to emit selection changes
  const emitSelectionChange = useCallback((selection) => {
    const debouncedEmit = debounce((sel) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        const socket = getSocket();
        socket.emit('selection-change', {
          roomId,
          userId: currentUser.id,
          selection: sel,
          userName: currentUser.name
        });
      }
    }, 50);
    
    debouncedEmit(selection);
  }, [isInRoom, roomId, currentUser, readOnly]);

  // Send buffered operations - completely rewritten for true batching
  const sendBufferedOps = useCallback(() => {
    if (!isInRoom || !roomId || !currentUser?.id || bufferRef.current.length === 0) return;
    
    logger.debug(`Sending batch of ${bufferRef.current.length} operations`);
    
    const ops = bufferRef.current.slice();
    bufferRef.current = []; // Clear buffer immediately
    
    // Update the last sync timestamp
    lastSyncTimeRef.current = Date.now();
    
    const socket = getSocket();
    if (!socket || !socket.connected) {
      logger.error("Socket not connected, can't send operations");
      // Re-add operations to buffer
      bufferRef.current = [...ops, ...bufferRef.current];
      return;
    }
    
    // Send as a batch
    socket.emit('ot-operations', {
      roomId,
      userId: currentUser?.id,
      operations: ops,
      version: currentVersionRef.current,
      clientId: CLIENT_ID,
      isBatch: true // Flag to indicate this is a batch update
    });
  }, [isInRoom, roomId, currentUser]);

  // Update remote cursor
  const updateRemoteCursor = useCallback((userId, position, userName) => {
    if (!editorRef.current || !monacoRef.current) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    // Get or create user color
    const userColor = getUserColor(userId);
    
    // Remove previous decorations for this user
    const previousDecorations = cursorsRef.current.get(userId)?.decorations || [];
    if (previousDecorations.length > 0) {
      editor.deltaDecorations(previousDecorations, []);
    }
    
    // Create cursor and label decorations
    const cursorDecorations = [
      {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: `remote-cursor-${userId}`,
          hoverMessage: { value: userName || 'User' },
          zIndex: 10
        }
      },
      {
        range: new monaco.Range(
          position.lineNumber,
          1,
          position.lineNumber,
          1
        ),
        options: {
          className: `remote-cursor-line-${userId}`,
          isWholeLine: false,
          marginClassName: `remote-cursor-name-${userId}`,
          after: {
            content: `  ${userName || 'User'} `,
            inlineClassName: `remote-cursor-name-text-${userId}`
          }
        }
      }
    ];
    
    // Add dynamic styles for this user's cursor
    addCursorStyle(userId, userColor, userName);
    
    // Apply decorations
    const newDecorations = editor.deltaDecorations([], cursorDecorations);
    
    // Update cursors map
    cursorsRef.current.set(userId, {
      color: userColor,
      decorations: newDecorations,
      position,
      userName
    });

    // Update state to trigger re-render if needed
    setRemoteUserCursors(new Map(cursorsRef.current));
  }, [getUserColor, addCursorStyle]);

  // Update remote selection
  const updateRemoteSelection = useCallback((userId, selection, userName) => {
    if (!editorRef.current || !monacoRef.current) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    // Get or create user color
    const userColor = getUserColor(userId);
    
    // Remove previous decorations for this user
    const previousDecorations = cursorsRef.current.get(userId)?.decorations || [];
    if (previousDecorations.length > 0) {
      editor.deltaDecorations(previousDecorations, []);
    }
    
    // Create selection decoration
    const selectionDecorations = [
      {
        range: new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        options: {
          className: `remote-selection-${userId}`,
          hoverMessage: { value: userName || 'User' }
        }
      },
      {
        range: new monaco.Range(
          selection.endLineNumber,
          selection.endColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        options: {
          className: `remote-cursor-${userId}`,
          hoverMessage: { value: userName || 'User' },
        }
      },
      {
        range: new monaco.Range(
          selection.endLineNumber,
          1,
          selection.endLineNumber,
          1
        ),
        options: {
          className: `remote-cursor-line-${userId}`,
          marginClassName: `remote-cursor-name-${userId}`,
          after: {
            content: `  ${userName || 'User'} `,
            inlineClassName: `remote-cursor-name-text-${userId}`
          }
        }
      }
    ];
    
    // Add dynamic styles for this user's cursor and selection
    addCursorStyle(userId, userColor, userName);
    addSelectionStyle(userId, userColor);
    
    // Apply decorations
    const newDecorations = editor.deltaDecorations([], selectionDecorations);
    
    // Update cursors map
    cursorsRef.current.set(userId, {
      color: userColor,
      decorations: newDecorations,
      selection,
      userName
    });

    // Update state to trigger re-render if needed
    setRemoteUserCursors(new Map(cursorsRef.current));
  }, [getUserColor, addCursorStyle, addSelectionStyle]);

  // Apply remote operations - improved to handle batched ops and cancelations
  const applyRemoteOperations = useCallback((operations, isBatch = false) => {
    if (!editorRef.current || !operations.length || unmountingRef.current) return;
    
    // If currently typing and not a force update, queue the operations
    if (isTypingRef.current && !isBatch && !isReceivingUpdatesRef.current) {
      logger.debug("User is typing, queueing remote operations for later");
      // Queue the operations to apply later
      // This would require additional logic to store and apply
      return;
    }
    
    // Mark that we're applying remote ops to avoid handling our own changes
    isApplyingRemoteOpsRef.current = true;
    suppressEventsRef.current = true;
    isReceivingUpdatesRef.current = true;
    
    try {
      // Get current editor state and selections
      const model = editorRef.current?.getModel();
      if (!model) {
        logger.warn("Editor model not available");
        return;
      }
      
      // Safety check for model state
      try {
        const currentValue = model.getValue();
        const currentSelections = editorRef.current.getSelections() || [];
        const currentPosition = editorRef.current.getPosition();
        
        // Apply operations to get new text
        const newText = applyOps(currentValue, operations);
        
        // Calculate the edits to apply
        const edits = [];
        let oldText = currentValue;
        
        // For batched operations, apply all changes at once for better performance
        if (isBatch) {
          if (newText !== currentValue) {
            try {
              model.pushEditOperations(
                [],
                [{
                  range: model.getFullModelRange(),
                  text: newText
                }],
                () => null
              );
            } catch (error) {
              logger.error("Error applying batch edit:", error);
              // Fallback to setValue if pushEditOperations fails
              if (!unmountingRef.current) {
                model.setValue(newText);
              }
            }
          }
        } else {
          // For individual operations, apply them granularly
          for (const op of operations) {
            if (op.type === 'insert') {
              edits.push({
                range: {
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: model.getLineCount(),
                  endColumn: model.getLineMaxColumn(model.getLineCount())
                },
                text: newText,
                forceMoveMarkers: true
              });
              break;
            } else if (op.type === 'delete') {
              try {
                // For delete operations, get the line and column of the deletion
                const startPos = offsetToPosition(oldText, op.position);
                const endPos = offsetToPosition(oldText, op.position + op.length);
                
                edits.push({
                  range: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: endPos.lineNumber,
                    endColumn: endPos.column
                  },
                  text: '',
                  forceMoveMarkers: true
                });
                
                // Apply this individual operation to keep oldText in sync
                oldText = applyOps(oldText, [op]);
              } catch (error) {
                logger.error("Error calculating edit position:", error);
              }
            }
          }
          
          // If we have granular edits, apply them
          if (edits.length > 0) {
            try {
              model.pushEditOperations(
                currentSelections,
                edits,
                () => null
              );
            } catch (error) {
              logger.error("Error applying edits:", error);
              // Fallback to direct setValue if edit operations fail
              if (newText !== currentValue && !unmountingRef.current) {
                model.setValue(newText);
              }
            }
          }
        }
        
        // Update our reference to current content
        if (!unmountingRef.current) {
          codeRef.current = model.getValue();
          
          // Update the outer component's state
          setCode(model.getValue());
        }
        
        // Transform any pending local operations against the received remote ops
        pendingOpsRef.current = pendingOpsRef.current.map(pendingOp => ({
          ...pendingOp,
          operations: transformOps(pendingOp.operations, operations)
        }));
        
        // Only try to restore cursor if user isn't typing
        if (currentPosition && currentSelections && !isTypingRef.current && !unmountingRef.current) {
          // The editor should restore position for us now
          // but we could add more sophisticated position adjustment here
          try {
            editorRef.current?.setPosition(currentPosition);
            editorRef.current?.setSelections(currentSelections);
          } catch (error) {
            logger.warn("Could not restore cursor position:", error);
          }
        }
      } catch (error) {
        logger.error("Error in applyRemoteOperations:", error);
      }
    } finally {
      // Wait a bit before re-enabling events to let the editor settle
      if (!unmountingRef.current) {
        setTimeout(() => {
          suppressEventsRef.current = false;
          isApplyingRemoteOpsRef.current = false;
          isReceivingUpdatesRef.current = false;
        }, 10);
      }
    }
  }, [setCode]);

  // Handle local editing operations with OT - improved batching approach
  const handleDocumentChange = useCallback((event) => {
    if (readOnly || isApplyingRemoteOpsRef.current || suppressEventsRef.current) return;
    
    const currentPos = editorRef.current?.getPosition();
    const currentSelection = editorRef.current?.getSelection();
    
    // Save cursor position and selection for restoration after applying operations
    if (currentPos) {
      selectionRef.current = {
        position: currentPos,
        selection: currentSelection
      };
    }
    
    // Generate operations from Monaco change event
    const operations = monacoChangeToOp(event, codeRef.current);
    if (operations.length === 0) return;
    
    // Update the reference to current code content
    codeRef.current = editorRef.current.getValue();
    
    // Add client ID to each operation for conflict resolution
    const opsWithClientId = operations.map(op => ({
      ...op,
      clientId: CLIENT_ID,
      timestamp: Date.now()
    }));
    
    // Add new operations to buffer
    bufferRef.current = [...bufferRef.current, ...opsWithClientId];
    
    // Mark that the user is typing - this is key for preventing interruption
    isTypingRef.current = true;
    
    // Clear any existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing timeout to detect when user stops typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      
      // Send batch update when user stops typing
      if (bufferRef.current.length > 0) {
        sendBufferedOps();
      }
    }, 1000); // 1 second idle time to consider typing stopped
    
    // If this is the first operation in a batch, set a maximum timeout
    // to ensure updates are sent even during continuous typing
    if (bufferRef.current.length === opsWithClientId.length) {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
      }
      
      batchUpdateTimeoutRef.current = setTimeout(() => {
        if (bufferRef.current.length > 0) {
          sendBufferedOps();
        }
        batchUpdateTimeoutRef.current = null;
      }, 2000); // Maximum 2 seconds between sends
    }
    
    // Store operations as pending until acknowledged
    pendingOpsRef.current.push({
      operations: opsWithClientId,
      version: currentVersionRef.current
    });
    
    // CRITICAL: Update local state without sending to server yet
    // This ensures the editor reflects changes immediately for the local user
    setCode(codeRef.current);
    
  }, [setCode, readOnly, sendBufferedOps]);

  // Handle code change (simplified since most logic moved to handleDocumentChange)
  const handleCodeChange = useCallback((newCode) => {
    // This is now just a pass-through function since the real logic
    // happens in the model's onDidChangeContent event handler
    if (newCode !== undefined && newCode !== null && !isApplyingRemoteOpsRef.current) {
      setCode(newCode);
    }
  }, [setCode]);

  // Editor mount handler - enhanced to handle batching and interruptions better
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Set editor options for better appearance
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1a1b26',
      }
    });
    
    if (theme === 'dark') {
      monaco.editor.setTheme('customDark');
    }
    
    // Add keybinding for running code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunCode();
    });
    
    // Initialize code reference
    codeRef.current = editor.getValue();
    
    // Listen for model content changes for OT
    const model = editor.getModel();
    model.onDidChangeContent(handleDocumentChange);
    
    // Add cursor position change listener for collaborative editing
    editor.onDidChangeCursorPosition((e) => {
      if (isInRoom && !readOnly && currentUser?.id && !isApplyingRemoteOpsRef.current) {
        emitCursorPosition(e.position);
      }
    });
    
    // Add selection change listener for collaborative editing
    editor.onDidChangeCursorSelection((e) => {
      if (isInRoom && !readOnly && currentUser?.id && !isApplyingRemoteOpsRef.current) {
        emitSelectionChange(e.selection);
      }
    });

    // Focus editor on mount for desktop, but not for mobile
    if (window.innerWidth >= 768) {
      editor.focus();
    }

    // Track focus state and handle buffer sending on blur
    editor.onDidFocusEditorText(() => {
      // Focus handling if needed in the future
    });
    
    editor.onDidBlurEditorText(() => {
      // When focus is lost, consider typing as stopped and send any pending updates
      isTypingRef.current = false;
      if (bufferRef.current.length > 0) {
        sendBufferedOps();
      }
    });
    
    // Set read-only state
    editor.updateOptions({ readOnly });

    logger.info("Editor mounted successfully, OT enabled");
  }, [theme, onRunCode, handleDocumentChange, emitCursorPosition, emitSelectionChange, sendBufferedOps, isInRoom, readOnly, currentUser]);

  // CRITICAL FIX: Much more efficient socket event handling for OT
  useEffect(() => {
    if (!isInRoom || !editorRef.current) return;
    
    const socket = getSocket();
    
    // Use the throttled sync request to avoid excessive sync requests
    const requestSync = () => {
      if (shouldThrottleSync()) {
        logger.debug('Sync request throttled');
        return;
      }
      
      syncRequestedRef.current = true;
      socket.emit('ot-request-sync', { 
        roomId,
        clientId: CLIENT_ID // Include client ID to help server track sync requests
      });
      logger.info('Requesting sync with server');
    };
    
    // Request initial sync only once
    if (!syncRequestedRef.current) {
      // Wait a moment before requesting sync to let the editor initialize
      setTimeout(() => {
        requestSync();
      }, 1000);
    }
    
    // Listen for operation acknowledgments
    const handleOpAck = (data) => {
      if (data.clientId === CLIENT_ID) {
        // Update current version
        currentVersionRef.current = data.version;
        
        // Remove acknowledged operations from pending
        pendingOpsRef.current = pendingOpsRef.current.filter(
          op => op.version !== (data.version - 1)
        );
        
        logger.debug(`Ack received for version ${data.version}, ${pendingOpsRef.current.length} pending ops remaining`);
      }
    };
    
    // Listen for operations from other clients
    const handleRemoteOps = (data) => {
      if (data.clientId === CLIENT_ID) {
        // Ignore our own ops echoed back
        return;
      }
      
      logger.debug(`Received remote ops for version ${data.version}, current: ${currentVersionRef.current}`);
      
      // If version is out of sync (too far ahead), request a full sync
      if (data.version > currentVersionRef.current + 1) {
        logger.warn(`Version inconsistency detected: remote ${data.version} vs local ${currentVersionRef.current}`);
        // Only request sync if we haven't recently
        requestSync();
        return;
      }
      
      // Apply remote operations and update version
      applyRemoteOperations(data.operations, data.isBatch || false);
      currentVersionRef.current = data.version;
    };
    
    // Handle full document sync - greatly improved to prevent duplicates
    const handleSync = (data) => {
      // Mark sync as completed
      syncCompleted();
      
      // Skip logging for regular sync responses
      if (LOG_LEVEL === 'debug') {
        logger.debug(`Received full sync for version ${data.version}`);
      }
      
      syncRequestedRef.current = false;
      
      // Skip if we're in the middle of typing
      if (isTypingRef.current && !isReceivingUpdatesRef.current) {
        logger.debug("User is typing, deferring sync application");
        return;
      }
      
      // Skip if our version is already higher
      if (data.version < currentVersionRef.current) {
        logger.debug(`Ignoring outdated sync (received ${data.version}, current ${currentVersionRef.current})`);
        return;
      }
      
      // Get current cursor position and selections before sync
      const currentPosition = editorRef.current.getPosition();
      const currentSelections = editorRef.current.getSelections();
      
      // Mark we're applying remote changes
      isApplyingRemoteOpsRef.current = true;
      suppressEventsRef.current = true;
      
      try {
        // Only sync if content is different
        if (data.content !== codeRef.current) {
          // Set editor content
          editorRef.current.setValue(data.content);
          
          // Update our reference
          codeRef.current = data.content;
          
          // Update outer component state
          setCode(data.content);
        }
        
        // Update version
        currentVersionRef.current = data.version;
        
        // Clear pending operations - they're no longer valid after a full sync
        pendingOpsRef.current = [];
        bufferRef.current = [];
        
        // Try to restore cursor position and selections
        if (currentPosition && currentSelections) {
          setTimeout(() => {
            try {
              editorRef.current.setPosition(currentPosition);
              editorRef.current.setSelections(currentSelections);
            } catch (e) {
              logger.warn("Couldn't restore cursor position after sync", e);
            }
          }, 10);
        }
      } finally {
        // Wait a bit before re-enabling events to let the editor settle
        setTimeout(() => {
          suppressEventsRef.current = false;
          isApplyingRemoteOpsRef.current = false;
        }, 10);
      }
    };

    // Register event handlers
    socket.on('ot-ack', handleOpAck);
    socket.on('ot-operations', handleRemoteOps);
    socket.on('ot-sync', handleSync);
    socket.on('ot-error', (data) => {
      logger.error('OT error:', data.message);
      // Don't automatically request sync on errors to avoid loops
    });
    
    // New handler for batched updates from other users
    socket.on('ot-batch-operations', (data) => {
      if (data.clientId === CLIENT_ID) return; // Skip our own batched operations
      
      logger.debug(`Received batched ops for version ${data.version}, current: ${currentVersionRef.current}`);
      
      // Apply as batched operations
      applyRemoteOperations(data.operations, true);
      
      // Update version
      currentVersionRef.current = data.version;
    });
    
    // Register cursor update handlers
    socket.on('cursor-update', (data) => {
      if (data.userId !== currentUser?.id) {
        updateRemoteCursor(data.userId, data.position, data.userName);
      }
    });
    
    socket.on('selection-update', (data) => {
      if (data.userId !== currentUser?.id) {
        updateRemoteSelection(data.userId, data.selection, data.userName);
      }
    });
    
    // Clean up on unmount
    return () => {
      socket.off('ot-ack', handleOpAck);
      socket.off('ot-operations', handleRemoteOps);
      socket.off('ot-sync', handleSync);
      socket.off('ot-error');
      socket.off('ot-batch-operations');
      socket.off('cursor-update');
      socket.off('selection-update');
    };
  }, [isInRoom, roomId, applyRemoteOperations, setCode, currentUser, updateRemoteCursor, updateRemoteSelection]);

  // Monitor for code prop changes from outside
  useEffect(() => {
    // If the code prop changes from outside and it's different from our internal state,
    // update our internal state without triggering a change event
    if (code !== codeRef.current && !isApplyingRemoteOpsRef.current && !unmountingRef.current) {
      codeRef.current = code;
      
      if (editorRef.current && editorRef.current.getModel()) {
        suppressEventsRef.current = true;
        try {
          editorRef.current.setValue(code);
        } catch (e) {
          logger.warn("Error setting editor value:", e);
        }
        setTimeout(() => {
          suppressEventsRef.current = false;
        }, 0);
      }
    }
  }, [code]);

  // Force the special characters bar to show on mobile and tablet
  useEffect(() => {
    const checkMobile = () => {
      const isMobileOrTablet = window.innerWidth < 1024;
      setShowCharsBar(isMobileOrTablet);
    };
    
    // Initial check
    checkMobile();
    
    // Re-check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle insertion of special characters
  const handleSpecialCharInsert = (before, after = '') => {
    // Don't allow insertion in read-only mode
    if (readOnly) return;

    if (editorRef.current) {
      const editor = editorRef.current;
      
      // Focus the editor first to ensure the insertion works properly
      editor.focus();
      
      // Get current selection or cursor position
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const text = selection.isEmpty() ? '' : editor.getModel().getValueInRange(selection);
      
      // Create edit operation
      const op = {
        identifier: id,
        range: selection,
        text: before + text + after,
        forceMoveMarkers: true
      };
      
      editor.executeEdits("specialChars", [op]);
      
      // Position cursor between brackets if needed and no text was selected
      if (after && selection.isEmpty()) {
        const position = selection.getPosition();
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + before.length
        };
        editor.setPosition(newPosition);
      }
      
      // Keep focus on editor after insertion
      window.setTimeout(() => {
        editor.focus();
      }, 50);
    }
  };

  // Adjust options based on screen size
  const getEditorOptions = () => {
    const isMobile = window.innerWidth < 768;
    
    return {
      fontSize: isMobile ? 12 : 14,
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontLigatures: true,
      minimap: { enabled: window.innerWidth > 768 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      padding: { top: 10, bottom: showCharsBar ? 40 : 10 },
      lineNumbers: window.innerWidth > 576 ? 'on' : 'off', // Disable line numbers on very small screens
      folding: !isMobile,
      glyphMargin: !isMobile,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 14,
        alwaysConsumeMouseWheel: false
      },
      overviewRulerLanes: 0, // Disable overview ruler on mobile
      renderLineHighlightOnlyWhenFocus: true, // Better for mobile performance
      renderWhitespace: 'none', // disables all whitespace highlighting
      readOnly,
      domReadOnly: readOnly,
    };
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle browser fullscreen mode
  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsBrowserFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsBrowserFullscreen(false);
    }
  };

  // Handle ESC key to exit all fullscreen modes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        if (isBrowserFullscreen) {
          setIsBrowserFullscreen(false);
        }
      }
    };

    // Listen for fullscreenchange event
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsBrowserFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, isBrowserFullscreen]);

  // Flag unmounting to prevent state updates
  useEffect(() => {
    // Capture current timeout values
    const typingTimeout = typingTimeoutRef.current;
    const bufferTimeout = bufferTimeoutRef.current;
    const batchUpdateTimeout = batchUpdateTimeoutRef.current;
    
    return () => {
      unmountingRef.current = true;
      
      // Clear any pending timeouts using captured values
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
      if (batchUpdateTimeout) {
        clearTimeout(batchUpdateTimeout);
      }
      
      // Remove cursor style elements
      document.querySelectorAll('[id^="cursor-style-"]').forEach(el => el.remove());
      document.querySelectorAll('[id^="selection-style-"]').forEach(el => el.remove());
    };
  }, []);

  // Reset confirmation dialog component within CodeEditor component
  function ResetConfirmationDialog({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;
    
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-200" 
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-200 scale-100 opacity-100"
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
        >
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reset Code Editor</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to reset the code editor? This will completely blank the editor and cannot be undone.
            </p>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              onClick={onConfirm}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle reset code button click
  const handleResetClick = () => {
    if (readOnly || (isInRoom && !['owner', 'editor'].includes(currentUser?.accessLevel))) {
      return; // Don't allow reset in read-only mode or without proper permissions
    }
    setIsResetConfirmOpen(true);
  };
  
  // Function to actually reset the code
  const resetCode = () => {
    if (editorRef.current) {
      // Set editor content to completely blank
      editorRef.current.setValue('');
      
      // Update our references
      codeRef.current = '';
      
      // Update outer component state
      setCode('');
      
      // Close dialog
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className={`h-full flex flex-col relative ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Fullscreen toggle button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 bg-opacity-90 z-20 rounded-md p-1.5 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {/* Browser fullscreen toggle button */}
      <button 
        onClick={toggleBrowserFullscreen}
        className="absolute top-3 right-12 bg-opacity-90 z-20 rounded-md p-1.5 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
        aria-label={isBrowserFullscreen ? "Exit browser fullscreen" : "Enter browser fullscreen"}
      >
        <Expand size={16} />
      </button>
      
      {/* Reset code button */}
      {!readOnly && (
        <button 
          onClick={handleResetClick}
          className="absolute top-3 right-21 bg-opacity-90 z-20 rounded-md p-1.5 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
          aria-label="Reset code editor"
          title="Reset code editor to blank"
          disabled={isInRoom && !['owner', 'editor'].includes(currentUser?.accessLevel)}
          style={{ right: '5.5rem' }}
        >
          <RefreshCw size={16} />
        </button>
      )}

      {/* Redesigned read-only indicator - more subtle and modern */}
      {readOnly && (
        <div className="absolute top-3 right-21 bg-opacity-90 z-10 rounded-md px-2.5 py-1.5 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
          <div className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500 mr-2"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Read-only</span>
        </div>
      )}

      <div className={`flex-grow ${showCharsBar && !readOnly ? 'pb-12' : ''}`}>
        <Editor
          height="100%"
          width="100%"
          language={language}
          value={code}
          onChange={readOnly ? undefined : handleCodeChange}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'customDark' : 'light'}
          options={getEditorOptions()}
          className="editor-container"
          loading={<div className="flex items-center justify-center h-full text-gray-500">Loading editor...</div>}
          beforeMount={() => {}}
          onValidate={() => {}} // Add empty validator to suppress unnecessary warnings
        />
        <div className="absolute bottom-14 right-2 text-xs text-gray-400 dark:text-gray-600 md:hidden bg-white dark:bg-gray-800 px-2 py-1 rounded opacity-70 swipe-hint">
          Swipe to see output →
        </div>
      </div>
      
      {/* Active collaborators indicator */}
      {isInRoom && remoteUserCursors.size > 0 && (
        <div id="collaborator-avatars" className="absolute top-3 left-3 flex space-x-1 z-20">
          {Array.from(remoteUserCursors.entries()).map(([userId, data]) => (
            <div 
              key={userId} 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: data.color }}
              title={data.userName || 'User'}
            >
              {(data.userName || 'U').charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      
      {/* Special characters bar (only show if not read-only) */}
      {showCharsBar && !readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{display: 'block !important'}}>
          <SpecialCharactersBar 
            onInsert={handleSpecialCharInsert} 
            language={language}
          />
        </div>
      )}

      {/* Reset confirmation dialog */}
      <ResetConfirmationDialog 
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetCode}
      />
    </div>
  );
}

// Static method to get language default code
CodeEditor.getLanguageDefaultCode = function(language) {
  const codeExamples = {
    javascript: `// JavaScript Example
function helloWorld() {
  console.log("Hello, World!");
}

helloWorld();`,
    python: `# Python Example
def hello_world():
    print("Hello, World!")

hello_world()`,
    cpp: `// C++ Example
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
    java: `// Java Example
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    c: `// C Example
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
    typescript: `// TypeScript Example
function helloWorld(): void {
  console.log("Hello, World!");
}

helloWorld();`,
    go: `// Go Example
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!");
}`,
    rust: `// Rust Example
fn main() {
    println!("Hello, World!");
}`,
    ruby: `# Ruby Example
puts "Hello, World!"`,
    php: `<?php
// PHP Example
echo "Hello, World!";
?>`
  };

  return codeExamples[language] || '// Start coding here...';
};

export default CodeEditor;
