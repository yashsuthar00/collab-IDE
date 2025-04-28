import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

function CodeEditor({ code, setCode, language, theme }) {
  const editorRef = useRef(null);
  
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
  }

  useEffect(() => {
    const defaultCode = CodeEditor.getLanguageDefaultCode(language);
    if (code === '// Start coding here...' || !code) {
      setCode(defaultCode);
    }
  }, [language]);

  return (
    <div className="h-full">
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={code}
        onChange={(value) => setCode(value)}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'customDark' : 'light'}
        options={{
          fontSize: 14,
          fontFamily: '"Fira Code", "Consolas", monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 10 }
        }}
        className="editor-container"
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
