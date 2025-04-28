import { Sun, Moon, Play, Code, Laptop } from 'lucide-react';

function Navbar({ language, setLanguage, languageOptions, onRunCode, theme, toggleTheme, isLoading }) {
  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 px-4 shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 text-xl font-bold text-blue-600 dark:text-blue-400">
          <Code className="w-6 h-6" />
          <span>Collab IDE</span>
        </div>

        {/* Language Selector */}
        <div className="flex items-center">
          <Laptop className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <select
            value={language.id}
            onChange={(e) => setLanguage(languageOptions.find(lang => lang.id === e.target.value))}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-40 p-2"
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right section: Theme toggle and Run button */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 
              <Sun className="w-5 h-5 text-yellow-400" /> : 
              <Moon className="w-5 h-5 text-gray-700" />
            }
          </button>

          {/* Run Button */}
          <button
            onClick={onRunCode}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
