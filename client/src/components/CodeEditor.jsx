import { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import SpecialCharactersBar from './SpecialCharactersBar';
import { getSocket } from '../utils/api';
import { useRoom } from '../contexts/RoomContext';
import { debounce } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { 
  monacoChangeToOp, applyOps, transformOps, 
  positionToOffset, offsetToPosition 
} from '../utils/ot';

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

function CodeEditor({ code, setCode, language, theme, onRunCode, readOnly = false }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const monaco = useMonaco();
  const cursorsRef = useRef(new Map());
  const decorationsRef = useRef([]);
  const codeRef = useRef(code);
  const currentVersionRef = useRef(0);
  const pendingOpsRef = useRef([]);
  const isApplyingRemoteOpsRef = useRef(false);
  const suppressEventsRef = useRef(false);
  const selectionRef = useRef(null);
  const bufferRef = useRef([]);
  const bufferTimeoutRef = useRef(null);
  
  // Get room context
  const { isInRoom, roomId, currentUser } = useRoom();
  
  const [showCharsBar, setShowCharsBar] = useState(window.innerWidth < 1024);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [remoteUserCursors, setRemoteUserCursors] = useState(new Map());

  // Function to get a consistent color for a user
  const getUserColor = useCallback((userId) => {
    if (!userColorMap.has(userId)) {
      userColorMap.set(userId, getRandomColor());
    }
    return userColorMap.get(userId);
  }, []);
  
  // Debounced function to emit cursor position
  const emitCursorPosition = useCallback(
    debounce((position) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        const socket = getSocket();
        socket.emit('cursor-position', {
          roomId,
          userId: currentUser.id,
          position,
          userName: currentUser.name
        });
      }
    }, 50),
    [isInRoom, roomId, currentUser?.id, currentUser?.name, readOnly]
  );
  
  // Debounced function to emit selection changes
  const emitSelectionChange = useCallback(
    debounce((selection) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        const socket = getSocket();
        socket.emit('selection-change', {
          roomId,
          userId: currentUser.id,
          selection,
          userName: currentUser.name
        });
      }
    }, 50),
    [isInRoom, roomId, currentUser?.id, currentUser?.name, readOnly]
  );

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
  }, [getUserColor]);

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
  }, [getUserColor]);

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
        opacity: 0.8;
        background-color: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 2px;
        white-space: nowrap;
        z-index: 10001;
        pointer-events: none;
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

  // Handle local editing operations with OT - improved approach
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
      clientId: CLIENT_ID
    }));
    
    // Store operations as pending until acknowledged
    pendingOpsRef.current.push({
      operations: opsWithClientId,
      version: currentVersionRef.current
    });
    
    // Add to buffer for batched sending
    bufferRef.current = [...bufferRef.current, ...opsWithClientId];
    
    // Clear any existing timeout
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }
    
    // Schedule sending ops
    bufferTimeoutRef.current = setTimeout(() => {
      sendBufferedOps();
    }, 30); // 30ms buffer period for batching operations
  }, [isInRoom, readOnly, roomId, currentUser?.id]);
  
  // Send buffered operations
  const sendBufferedOps = useCallback(() => {
    if (!isInRoom || bufferRef.current.length === 0) return;
    
    const ops = bufferRef.current.slice();
    bufferRef.current = [];
    
    const socket = getSocket();
    socket.emit('ot-operations', {
      roomId,
      userId: currentUser?.id,
      operations: ops,
      version: currentVersionRef.current,
      clientId: CLIENT_ID
    });
    
    console.log(`Sent ${ops.length} operations to server`, ops);
  }, [isInRoom, roomId, currentUser?.id]);
  
  // Apply remote operations - improved approach
  const applyRemoteOperations = useCallback((operations) => {
    if (!editorRef.current || !operations.length) return;
    
    // Mark that we're applying remote ops to avoid handling our own changes
    isApplyingRemoteOpsRef.current = true;
    suppressEventsRef.current = true;
    
    try {
      // Get current editor state and selections
      const model = editorRef.current.getModel();
      const currentValue = model.getValue();
      const currentSelections = editorRef.current.getSelections();
      const currentPosition = editorRef.current.getPosition();
      
      // Apply operations to get new text
      const newText = applyOps(currentValue, operations);
      
      // Calculate the edits to apply
      const edits = [];
      let oldText = currentValue;
      
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
        }
      }
      
      // If we don't have granular edits, apply everything at once
      if (edits.length === 0 && newText !== currentValue) {
        model.setValue(newText);
      } else {
        // Apply edits
        model.pushEditOperations(
          currentSelections,
          edits,
          () => null
        );
      }
      
      // Update our reference to current content
      codeRef.current = model.getValue();
      
      // Update the outer component's state
      setCode(model.getValue());
      
      // Transform any pending local operations against the received remote ops
      pendingOpsRef.current = pendingOpsRef.current.map(pendingOp => ({
        ...pendingOp,
        operations: transformOps(pendingOp.operations, operations)
      }));
      
      // Restore cursor position and selections, adjusted for the operations
      if (currentPosition && currentSelections) {
        // The editor should restore position for us now
        // but we could add more sophisticated position adjustment here
      }
    } finally {
      // Wait a bit before re-enabling events to let the editor settle
      setTimeout(() => {
        suppressEventsRef.current = false;
        isApplyingRemoteOpsRef.current = false;
      }, 10);
    }
  }, [setCode]);
  
  // Improved socket event handler for OT
  useEffect(() => {
    if (!isInRoom || !editorRef.current) return;
    
    const socket = getSocket();
    
    // Request initial sync with server
    socket.emit('ot-request-sync', { roomId });
    
    // Listen for operation acknowledgments
    const handleOpAck = (data) => {
      if (data.clientId === CLIENT_ID) {
        // Update current version
        currentVersionRef.current = data.version;
        
        // Remove acknowledged operations from pending
        pendingOpsRef.current = pendingOpsRef.current.filter(
          op => op.version !== (data.version - 1)
        );
        
        console.log(`Ack received for version ${data.version}, ${pendingOpsRef.current.length} pending ops remaining`);
      }
    };
    
    // Listen for operations from other clients
    const handleRemoteOps = (data) => {
      if (data.clientId === CLIENT_ID) {
        console.log("Ignoring our own ops echoed back");
        return; // Ignore our own ops echoed back
      }
      
      console.log(`Received remote ops for version ${data.version}, current: ${currentVersionRef.current}`);
      
      // If version is out of sync (too far ahead), request a full sync
      if (data.version > currentVersionRef.current + 1) {
        console.log("Version inconsistency detected, requesting sync");
        socket.emit('ot-request-sync', { roomId });
        return;
      }
      
      // Apply remote operations
      applyRemoteOperations(data.operations);
      
      // Update version
      currentVersionRef.current = data.version;
    };
    
    // Handle full document sync - improved to preserve cursors and selections
    const handleSync = (data) => {
      console.log(`Received full sync for version ${data.version}`);
      
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
        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
          bufferTimeoutRef.current = null;
        }
        
        // Try to restore cursor position and selections
        if (currentPosition && currentSelections) {
          setTimeout(() => {
            try {
              editorRef.current.setPosition(currentPosition);
              editorRef.current.setSelections(currentSelections);
            } catch (e) {
              console.warn("Couldn't restore cursor position after sync", e);
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
    
    // Listen for errors
    const handleOtError = (data) => {
      console.error('OT error:', data.message);
      
      // Request a fresh sync after an error
      socket.emit('ot-request-sync', { roomId });
    };
    
    // Register event handlers
    socket.on('ot-ack', handleOpAck);
    socket.on('ot-operations', handleRemoteOps);
    socket.on('ot-sync', handleSync);
    socket.on('ot-error', handleOtError);
    
    // Clean up on unmount
    return () => {
      socket.off('ot-ack', handleOpAck);
      socket.off('ot-operations', handleRemoteOps);
      socket.off('ot-sync', handleSync);
      socket.off('ot-error', handleOtError);
    };
  }, [isInRoom, roomId, applyRemoteOperations, setCode]);

  // Monitor for code prop changes from outside
  useEffect(() => {
    // If the code prop changes from outside and it's different from our internal state,
    // update our internal state without triggering a change event
    if (code !== codeRef.current && !isApplyingRemoteOpsRef.current) {
      codeRef.current = code;
      
      if (editorRef.current) {
        suppressEventsRef.current = true;
        editorRef.current.setValue(code);
        setTimeout(() => {
          suppressEventsRef.current = false;
        }, 0);
      }
    }
  }, [code]);

  // Editor mount handler
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

    // Track focus state
    editor.onDidFocusEditorText(() => {
      setIsEditorFocused(true);
    });
    
    editor.onDidBlurEditorText(() => {
      setIsEditorFocused(false);
    });

    // Set read-only state
    editor.updateOptions({ readOnly });

    console.log("Editor mounted successfully, OT enabled");
  }, [theme, onRunCode, handleDocumentChange, emitCursorPosition, emitSelectionChange]);

  // Handle code change (simplified since most logic moved to handleDocumentChange)
  const handleCodeChange = useCallback((newCode) => {
    // This is now just a pass-through function since the real logic
    // happens in the model's onDidChangeContent event handler
    if (newCode !== undefined && newCode !== null && !isApplyingRemoteOpsRef.current) {
      setCode(newCode);
    }
  }, [setCode]);

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
      minimap: { enabled: !isMobile },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      padding: { top: 10, bottom: showCharsBar ? 40 : 10 },
      // Mobile-specific options
      lineNumbers: isMobile ? 'off' : 'on',
      folding: !isMobile,
      glyphMargin: !isMobile,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: isMobile ? 4 : 10,
        horizontalScrollbarSize: isMobile ? 4 : 10,
      },
      readOnly,
      domReadOnly: readOnly,
    };
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Redesigned read-only indicator - more subtle and modern */}
      {readOnly && (
        <div className="absolute top-3 right-3 bg-opacity-90 z-10 rounded-md px-2.5 py-1.5 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
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
    fmt.Println("Hello, World!")
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
