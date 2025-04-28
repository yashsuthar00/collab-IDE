import { useState } from 'react';
import { Terminal, MessageSquare } from 'lucide-react';

function OutputPanel({ output, input, setInput, loading, error }) {
  const [activeTab, setActiveTab] = useState('output');
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center px-4 py-2 font-medium text-sm ${
              activeTab === 'output'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Terminal className="w-4 h-4 mr-2" />
            Output
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center px-4 py-2 font-medium text-sm ${
              activeTab === 'input'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Input
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto bg-white dark:bg-gray-800">
        {activeTab === 'output' ? (
          <div className="h-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent border-blue-500"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Executing code...</p>
              </div>
            ) : error ? (
              <div className="font-mono text-sm whitespace-pre-wrap p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 h-full overflow-auto">
                <div className="font-semibold text-red-600 dark:text-red-400 mb-2">Error:</div>
                <pre className="whitespace-pre-wrap break-words text-red-500">{error}</pre>
              </div>
            ) : output ? (
              <div className="font-mono text-sm whitespace-pre-wrap p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 h-full overflow-auto">
                {output.error ? (
                  <span className="text-red-500">{output.error}</span>
                ) : (
                  <>
                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-green-600 dark:text-green-400">Exit Status:</span> {output.status || 0}
                      {output.time && (
                        <span className="ml-4 text-gray-500 dark:text-gray-400">
                          Execution time: {output.time}ms
                        </span>
                      )}
                    </div>
                    {output.stdout && (
                      <div className="mb-4">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Output:</div>
                        <pre className="bg-white dark:bg-gray-900 p-3 rounded-md border border-gray-200 dark:border-gray-700">{output.stdout}</pre>
                      </div>
                    )}
                    {output.stderr && (
                      <div>
                        <div className="font-semibold text-red-600 dark:text-red-400 mb-2">Error Output:</div>
                        <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800/30 text-red-500">{output.stderr}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <Terminal className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Run your code to see output here</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter program input here..."
              className="w-full h-full p-4 font-mono text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;
