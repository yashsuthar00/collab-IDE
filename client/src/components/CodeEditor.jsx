import { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import SpecialCharactersBar from './SpecialCharactersBar';

function CodeEditor({ code, setCode, language, theme, onRunCode }) {
  const editorRef = useRef(null);
  // Always set showCharsBar to true for mobile screens
  const [showCharsBar, setShowCharsBar] = useState(window.innerWidth < 1024);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    
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
  }

  // Handle code change with proper value
  const handleCodeChange = (newCode) => {
    if (newCode !== undefined && newCode !== null) {
      setCode(newCode);
    }
  };

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = window.monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'customDark' : 'light');
      }
    }
  }, [theme]);

  // Force the special characters bar to show on mobile and tablet
  useEffect(() => {
    const checkMobile = () => {
      const isMobileOrTablet = window.innerWidth < 1024;
      setShowCharsBar(isMobileOrTablet);
      console.log("Device width:", window.innerWidth, "Show chars bar:", isMobileOrTablet);
    };
    
    // Initial check
    checkMobile();
    
    // Re-check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle insertion of special characters
  const handleSpecialCharInsert = (before, after = '') => {
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
      }
    };
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className={`flex-grow ${showCharsBar ? 'pb-12' : ''}`}>
        <Editor
          height="100%"
          width="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'customDark' : 'light'}
          options={getEditorOptions()}
          className="editor-container"
        />
        <div className="absolute bottom-14 right-2 text-xs text-gray-400 dark:text-gray-600 md:hidden bg-white dark:bg-gray-800 px-2 py-1 rounded opacity-70 swipe-hint">
          Swipe to see output →
        </div>
      </div>
      
      {/* Always render the special characters bar on mobile with !important styles */}
      {window.innerWidth < 1024 && (
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
