import { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import SpecialCharactersBar from './SpecialCharactersBar';
import { getSocket } from '../utils/api';
import { useRoom } from '../contexts/RoomContext';
import { debounce } from '../utils/helpers';

// Helper function to generate random colors for user cursors
const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9C80E', 
    '#FF8C42', '#A4036F', '#048BA8', '#16DB93', '#EFBCD5'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

function CodeEditor({ code, setCode, language, theme, onRunCode, readOnly = false }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const monaco = useMonaco();
  const cursorsRef = useRef(new Map());
  const decorationsRef = useRef([]);
  const userColorRef = useRef(getRandomColor());
  
  // Get room context
  const { isInRoom, roomId, currentUser } = useRoom();
  
  const [showCharsBar, setShowCharsBar] = useState(window.innerWidth < 1024);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  
  // Store all remote user cursors
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  
  // Effect to handle socket events for collaborative editing
  useEffect(() => {
    if (!isInRoom || !editorRef.current) return;
    
    const socket = getSocket();
    
    // Listen for code updates from other users
    socket.on('code-update', (data) => {
      if (data.roomId === roomId && data.userId !== currentUser.id) {
        // Store current cursor position
        const currentPosition = editorRef.current.getPosition();
        
        // Apply the remote code change
        editorRef.current.getModel().setValue(data.code);
        
        // Restore cursor position
        if (currentPosition) {
          editorRef.current.setPosition(currentPosition);
        }
      }
    });
    
    // Listen for cursor position updates from other users
    socket.on('cursor-update', (data) => {
      if (data.roomId === roomId && data.userId !== currentUser.id && data.position) {
        updateRemoteCursor(data.userId, data.position, data.userName);
      }
    });
    
    // Listen for selection updates from other users
    socket.on('selection-update', (data) => {
      if (data.roomId === roomId && data.userId !== currentUser.id && data.selection) {
        updateRemoteSelection(data.userId, data.selection, data.userName);
      }
    });
    
    return () => {
      socket.off('code-update');
      socket.off('cursor-update');
      socket.off('selection-update');
    };
  }, [isInRoom, roomId, currentUser?.id, editorRef.current]);
  
  // Function to update remote user cursor
  const updateRemoteCursor = (userId, position, userName) => {
    if (!editorRef.current || !monacoRef.current) return;
    
    // Get or create user color
    if (!cursorsRef.current.has(userId)) {
      cursorsRef.current.set(userId, {
        color: getRandomColor(),
        decorations: []
      });
    }
    
    const userCursor = cursorsRef.current.get(userId);
    
    // Remove previous decorations
    if (userCursor.decorations.length) {
      editorRef.current.deltaDecorations(userCursor.decorations, []);
    }
    
    // Create cursor and label decorations
    const cursorDecorations = [
      {
        range: new monacoRef.current.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: `remote-cursor-${userId}`,
          hoverMessage: { value: userName || 'User' },
          beforeContentClassName: 'remote-cursor-before',
          afterContentClassName: 'remote-cursor-after',
          zIndex: 10000
        }
      },
      {
        range: new monacoRef.current.Range(
          position.lineNumber,
          1,
          position.lineNumber,
          1
        ),
        options: {
          beforeContentClassName: 'remote-cursor-name',
          before: {
            content: userName || 'User',
            inlineClassName: `remote-cursor-name-text-${userId}`
          }
        }
      }
    ];
    
    // Add dynamic CSS for this user's cursor
    addCursorStyle(userId, userCursor.color);
    
    // Apply decorations
    userCursor.decorations = editorRef.current.deltaDecorations([], cursorDecorations);
    
    // Update cursors map
    cursorsRef.current.set(userId, userCursor);
  };
  
  // Function to update remote user selection
  const updateRemoteSelection = (userId, selection, userName) => {
    if (!editorRef.current || !monacoRef.current) return;
    
    // Get or create user color
    if (!cursorsRef.current.has(userId)) {
      cursorsRef.current.set(userId, {
        color: getRandomColor(),
        decorations: []
      });
    }
    
    const userCursor = cursorsRef.current.get(userId);
    
    // Remove previous decorations
    if (userCursor.decorations.length) {
      editorRef.current.deltaDecorations(userCursor.decorations, []);
    }
    
    // Create selection decoration
    const selectionDecorations = [
      {
        range: new monacoRef.current.Range(
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
        range: new monacoRef.current.Range(
          selection.endLineNumber,
          1,
          selection.endLineNumber,
          1
        ),
        options: {
          beforeContentClassName: 'remote-cursor-name',
          before: {
            content: userName || 'User',
            inlineClassName: `remote-cursor-name-text-${userId}`
          }
        }
      }
    ];
    
    // Add dynamic CSS for this user's selection
    addSelectionStyle(userId, userCursor.color);
    
    // Apply decorations
    userCursor.decorations = editorRef.current.deltaDecorations([], selectionDecorations);
    
    // Update cursors map
    cursorsRef.current.set(userId, userCursor);
  };
  
  // Add dynamic CSS for user cursors
  const addCursorStyle = (userId, color) => {
    const styleId = `cursor-style-${userId}`;
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      .remote-cursor-${userId} {
        position: relative;
      }
      .remote-cursor-before {
        position: absolute;
        border-left: 2px solid ${color};
        height: 18px;
        width: 0;
        z-index: 10000;
      }
      .remote-cursor-name-text-${userId} {
        background-color: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 2px;
        white-space: nowrap;
        position: absolute;
        margin-top: -22px;
        z-index: 10001;
      }
    `;
  };
  
  // Add dynamic CSS for user selections
  const addSelectionStyle = (userId, color) => {
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
        border-radius: 2px;
      }
      .remote-cursor-name-text-${userId} {
        background-color: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 2px;
        white-space: nowrap;
        position: absolute;
        margin-top: -22px;
        z-index: 10001;
      }
    `;
  };
  
  // Debounced function to emit cursor position
  const emitCursorPosition = useCallback(
    debounce((position) => {
      if (isInRoom && !readOnly) {
        const socket = getSocket();
        socket.emit('cursor-position', {
          roomId,
          userId: currentUser.id,
          position,
          userName: currentUser.name
        });
      }
    }, 50),
    [isInRoom, roomId, currentUser?.id, readOnly]
  );
  
  // Debounced function to emit selection changes
  const emitSelectionChange = useCallback(
    debounce((selection) => {
      if (isInRoom && !readOnly) {
        const socket = getSocket();
        socket.emit('selection-change', {
          roomId,
          userId: currentUser.id,
          selection,
          userName: currentUser.name
        });
      }
    }, 50),
    [isInRoom, roomId, currentUser?.id, readOnly]
  );

  function handleEditorDidMount(editor, monaco) {
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
    
    // Focus editor on mount for desktop, but not for mobile (avoids keyboard popping up)
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
    
    // Add cursor position change listener for collaborative editing
    editor.onDidChangeCursorPosition((e) => {
      if (isInRoom && !readOnly) {
        emitCursorPosition(e.position);
      }
    });
    
    // Add selection change listener for collaborative editing
    editor.onDidChangeCursorSelection((e) => {
      if (isInRoom && !readOnly) {
        emitSelectionChange(e.selection);
      }
    });
  }

  // Handle code change with proper value and collaboration
  const handleCodeChange = (newCode) => {
    if (newCode !== undefined && newCode !== null) {
      setCode(newCode);
      
      if (isInRoom && !readOnly && editorRef.current) {
        const socket = getSocket();
        socket.emit('code-change', {
          roomId,
          userId: currentUser.id,
          code: newCode
        });
      }
    }
  };

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
