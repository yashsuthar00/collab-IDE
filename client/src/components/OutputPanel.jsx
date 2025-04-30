import { Terminal, MessageSquare, LockIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

function OutputPanel({ output, input, setInput, loading, error, activeTab, setActiveTab, readOnly = false }) {
  const textareaRef = useRef(null);

  // Handle textarea resize for better mobile experience
  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (activeTab === 'input' && textareaRef.current) {
      handleTextareaResize();
    }
  }, [input, activeTab]);

  return (
    <div className="output-panel h-full flex flex-col relative">
      {/* Redesigned read-only indicator for output panel */}
      {readOnly && activeTab === 'input' && (
        <div className="absolute top-12 right-3 z-10 rounded-md px-2.5 py-1 flex items-center shadow-sm backdrop-blur-sm bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
          <div className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500 mr-2"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Input locked</span>
        </div>
      )}
      
      <div className="output-panel-tabs border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center px-4 py-2 font-medium text-sm ${
              activeTab === 'output'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            aria-selected={activeTab === 'output'}
            role="tab"
          >
            <Terminal className="w-4 h-4 mr-2" />
            <span>Output</span>
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center px-4 py-2 font-medium text-sm ${
              activeTab === 'input'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            } ${readOnly ? 'relative' : ''}`}
            aria-selected={activeTab === 'input'}
            role="tab"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span>Input</span>
            {readOnly && (
              <LockIcon className="w-3 h-3 ml-1.5 text-amber-500 dark:text-amber-400" />
            )}
          </button>
        </div>
      </div>
      
      <div className="output-panel-content flex-1 p-2 md:p-4 overflow-auto bg-white dark:bg-gray-800">
        {activeTab === 'output' ? (
          <div className="h-full output-panel-output">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-2 border-t-transparent border-blue-500 dark:border-blue-400"></div>
                <p className="mt-3 text-sm md:text-base text-gray-500 dark:text-gray-400">Executing code...</p>
              </div>
            ) : error ? (
              <div className="font-mono text-xs md:text-sm whitespace-pre-wrap p-3 md:p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 h-full overflow-auto">
                <div className="font-semibold text-red-600 dark:text-red-400 mb-2">Error:</div>
                <pre className="whitespace-pre-wrap break-words text-red-500 dark:text-red-400">{error}</pre>
              </div>
            ) : output ? (
              <div className="font-mono text-xs md:text-sm whitespace-pre-wrap p-3 md:p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 h-full overflow-auto text-gray-800 dark:text-gray-200">
                {output.error ? (
                  <span className="text-red-500">{output.error}</span>
                ) : (
                  <>
                    {output.stderr ? (
                      <div className="mb-4">
                        <div className="font-semibold text-red-600 dark:text-red-400 mb-2">Error Output:</div>
                        <pre className="bg-red-50 dark:bg-red-900/20 p-2 md:p-3 rounded-md border border-red-200 dark:border-red-800/30 text-red-500 text-xs md:text-sm">{output.stderr}</pre>
                      </div>
                    ) : null}
                    
                    {output.stdout ? (
                      <div className="mb-4">
                        <pre className="bg-white dark:bg-gray-900 p-2 md:p-3 rounded-md border border-gray-200 dark:border-gray-700 text-xs md:text-sm">{output.stdout}</pre>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                        Program executed successfully with no output.
                      </div>
                    )}
                    
                    {output.time && (
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Executed in {output.time}ms
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <Terminal className="w-8 h-8 md:w-12 md:h-12 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Run your code to see output here</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full output-panel-input relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => !readOnly && setInput(e.target.value)}
              onFocus={handleTextareaResize}
              placeholder={readOnly ? "Input is locked in read-only mode" : "Enter program input here..."}
              className={`w-full h-full p-3 md:p-4 font-mono text-xs md:text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-gray-800 dark:text-gray-200 ${readOnly ? 'cursor-not-allowed bg-gray-50/80 dark:bg-gray-900/50' : ''}`}
              spellCheck="false"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              readOnly={readOnly}
              disabled={readOnly}
            />
            {!readOnly && (
              <div className="mt-2 mb-1 text-xs text-gray-500 dark:text-gray-400 text-center md:hidden">
                Tap Run button to execute code
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;
