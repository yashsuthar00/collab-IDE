export const languageOptions = [
  {
    id: "javascript",
    name: "JavaScript",
    value: "javascript",
    defaultCode: `// Welcome to Collab IDE JavaScript Editor
// Write your code here

function main() {
  console.log("Hello, World!");
}

main();
`
  },
  {
    id: "python",
    name: "Python",
    value: "python",
    defaultCode: `# Welcome to Collab IDE Python Editor
# Write your code here

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`
  },
  {
    id: "java",
    name: "Java",
    value: "java",
    defaultCode: `// Welcome to Collab IDE Java Editor
// Write your code here

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`
  },
  {
    id: "cpp",
    name: "C++",
    value: "cpp",
    defaultCode: `// Welcome to Collab IDE C++ Editor
// Write your code here

#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`
  },
  {
    id: "c",
    name: "C",
    value: "c",
    defaultCode: `// Welcome to Collab IDE C Editor
// Write your code here

#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`
  },
  {
    id: "typescript",
    name: "TypeScript",
    value: "typescript",
    defaultCode: `// Welcome to Collab IDE TypeScript Editor
// Write your code here

function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));
`
  },
  {
    id: "go",
    name: "Go",
    value: "go",
    defaultCode: `// Welcome to Collab IDE Go Editor
// Write your code here

package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`
  },
  {
    id: "rust",
    name: "Rust",
    value: "rust",
    defaultCode: `// Welcome to Collab IDE Rust Editor
// Write your code here

fn main() {
    println!("Hello, World!");
}
`
  },
  {
    id: "ruby",
    name: "Ruby",
    value: "ruby",
    defaultCode: `# Welcome to Collab IDE Ruby Editor
# Write your code here

def main
  puts "Hello, World!"
end

main
`
  },
  {
    id: "php",
    name: "PHP",
    value: "php",
    defaultCode: `<?php
// Welcome to Collab IDE PHP Editor
// Write your code here

function main() {
    echo "Hello, World!\\n";
}

main();
?>
`
  }
];

// Add a helper function to get default code by language ID
export const getDefaultCodeByLanguage = (languageId) => {
  const language = languageOptions.find(lang => lang.id === languageId || lang.value === languageId);
  return language?.defaultCode || '// No default code available for this language';
};
