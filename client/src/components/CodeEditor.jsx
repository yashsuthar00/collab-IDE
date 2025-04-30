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

  // Handle local editing operations with OT
  const handleDocumentChange = useCallback((event) => {
    if (readOnly || isApplyingRemoteOpsRef.current) return;
    
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
    
    // Send operations to server
    if (isInRoom && socket) {
      const socket = getSocket();
      socket.emit('ot-operations', {
        roomId,
        userId: currentUser?.id,
        operations: opsWithClientId,
        version: currentVersionRef.current,
        clientId: CLIENT_ID
      });
    }
  }, [isInRoom, readOnly, roomId, currentUser?.id]);
  
  // Apply remote operations
  const applyRemoteOperations = useCallback((operations) => {
    if (!editorRef.current) return;
    
    // Mark that we're applying remote ops to avoid handling our own changes
    isApplyingRemoteOpsRef.current = true;
    
    try {
      // Get current editor state
      const model = editorRef.current.getModel();
      const currentValue = model.getValue();
      
      // Apply operations to get new text
      const newText = applyOps(currentValue, operations);
      
      // Update editor with new text
      model.pushEditOperations(
        editorRef.current.getSelections(),
        [
          {
            range: model.getFullModelRange(),
            text: newText,
          }
        ],
        () => null
      );
      
      // Update our reference to current content
      codeRef.current = newText;
      
      // Update the outer component's state
      setCode(newText);
      
    } finally {
      // Unmark applying remote ops
      isApplyingRemoteOpsRef.current = false;
    }
  }, [setCode]);
  
  // Handle socket events for OT
  useEffect(() => {
    if (!isInRoom || !editorRef.current) return;
    
    const socket = getSocket();
    
    // Request initial sync with server
    socket.emit('ot-request-sync', { roomId });
    
    // Listen for operation acknowledgments
    const handleOpAck = ({ version, clientId }) => {
      if (clientId === CLIENT_ID) {
        // Update current version
        currentVersionRef.current = version;
        
        // Remove acknowledged operations from pending
        pendingOpsRef.current = pendingOpsRef.current.filter(
          op => op.version !== version - 1
        );
      }
    };
    
    // Listen for operations from other clients
    const handleRemoteOps = ({ operations, userId, version, clientId }) => {
      if (clientId === CLIENT_ID) return; // Ignore our own ops echoed back
      
      // If we receive a higher version than expected, request a full sync
      if (version > currentVersionRef.current + 1) {
        socket.emit('ot-request-sync', { roomId });
        return;
      }
      
      // Apply remote operations
      applyRemoteOperations(operations);
      
      // Update version
      currentVersionRef.current = version;
      
      // Transform any pending local operations against the received remote ops
      if (pendingOpsRef.current.length > 0) {
        pendingOpsRef.current = pendingOpsRef.current.map(pendingOp => ({
          ...pendingOp,
          operations: transformOps(pendingOp.operations, operations)
        }));
      }
    };
    
    // Handle full document sync
    const handleSync = ({ content, version }) => {
      // Only sync if content is different
      if (content !== codeRef.current) {
        // Mark we're applying remote changes
        isApplyingRemoteOpsRef.current = true;
        
        try {
          // Set editor content
          editorRef.current.setValue(content);
          
          // Update our reference
          codeRef.current = content;
          
          // Update outer component state
          setCode(content);
        } finally {
          isApplyingRemoteOpsRef.current = false;
        }
      }
      
      // Update version
      currentVersionRef.current = version;
      
      // Clear pending operations - they're no longer valid after a full sync
      pendingOpsRef.current = [];
    };
    
    // Listen for errors
    const handleOtError = ({ message }) => {
      console.error('OT error:', message);
      
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
    
    // Initialize code reference
    codeRef.current = editor.getValue();
    
    // Listen for model content changes for OT
    const model = editor.getModel();
    model.onDidChangeContent(handleDocumentChange);
    
    // Add cursor position change listener for collaborative editing
    editor.onDidChangeCursorPosition((e) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        emitCursorPosition(e.position);
      }
    });
    
    // Add selection change listener for collaborative editing
    editor.onDidChangeCursorSelection((e) => {
      if (isInRoom && !readOnly && currentUser?.id) {
        emitSelectionChange(e.selection);
      }
    });

    console.log("Editor mounted successfully, OT enabled");
  }, [theme, onRunCode, handleDocumentChange]);

  // Handle code change with OT
  const handleCodeChange = useCallback((newCode) => {
    // Let OT mechanism handle the actual changes
    if (newCode !== undefined && newCode !== null) {
      // Only update external state when not applying remote ops
      if (!isApplyingRemoteOpsRef.current) {
        setCode(newCode);
      }
    }
  }, [setCode]);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'customDark' : 'light');
    }
  }, [theme]);

  // Update readOnly state when it changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

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
        <div className="absolute top-3 left-3 flex space-x-1 z-20">
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
