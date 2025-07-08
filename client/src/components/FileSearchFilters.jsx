import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  Search, 
  Calendar, 
  Code, 
  Folder, 
  Clock, 
  Eye, 
  EyeOff,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const FileSearchFilters = ({ 
  onFilterChange, 
  initialFilters = {},
  expanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [filters, setFilters] = useState({
    search: '',
    language: [],
    directory: '',
    isPublic: undefined,
    difficulty: [],
    createdAfter: '',
    createdBefore: '',
    modifiedAfter: '',
    modifiedBefore: '',
    sort: 'lastModified-desc',
    ...initialFilters
  });
  
  const [filterOptions, setFilterOptions] = useState({
    languages: [],
    languageCounts: {},
    dateRange: {
      oldest: null,
      newest: null
    },
    directories: {
      withFiles: [],
      rootFilesCount: 0
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Notify parent component when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const fetchFilterOptions = async () => {
    try {
      setIsLoading(true);
      const response = await api.files.getFilterOptions();
      setFilterOptions(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error('Failed to load filter options');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageToggle = (language) => {
    setFilters(prev => {
      const currentLanguages = Array.isArray(prev.language) ? prev.language : [];
      if (currentLanguages.includes(language)) {
        return { ...prev, language: currentLanguages.filter(lang => lang !== language) };
      } else {
        return { ...prev, language: [...currentLanguages, language] };
      }
    });
  };

  const handleDifficultyToggle = (difficulty) => {
    setFilters(prev => {
      const currentDifficulties = Array.isArray(prev.difficulty) ? prev.difficulty : [];
      if (currentDifficulties.includes(difficulty)) {
        return { ...prev, difficulty: currentDifficulties.filter(diff => diff !== difficulty) };
      } else {
        return { ...prev, difficulty: [...currentDifficulties, difficulty] };
      }
    });
  };

  const handleVisibilityFilter = (value) => {
    setFilters(prev => ({ ...prev, isPublic: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      language: [],
      directory: '',
      isPublic: undefined,
      createdAfter: '',
      createdBefore: '',
      modifiedAfter: '',
      modifiedBefore: '',
      sort: 'lastModified-desc'
    });
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  const getAppliedFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.language?.length) count++;
    if (filters.directory) count++;
    if (filters.isPublic !== undefined) count++;
    if (filters.createdAfter) count++;
    if (filters.createdBefore) count++;
    if (filters.modifiedAfter) count++;
    if (filters.modifiedBefore) count++;
    if (filters.sort !== 'lastModified-desc') count++;
    return count;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
      {/* Basic search row - always visible */}
      <div className="flex items-center p-3">
        <div className="flex-grow flex items-center bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
            placeholder="Search files..."
            className="bg-transparent border-none focus:ring-0 flex-grow text-gray-800 dark:text-gray-200"
          />
          {filters.search && (
            <button 
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))} 
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <button 
          onClick={toggleExpand}
          className="ml-2 px-3 py-2 flex items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
        >
          <Filter size={18} className="mr-1" />
          {getAppliedFiltersCount() > 0 && (
            <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-1">
              {getAppliedFiltersCount()}
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <button 
          onClick={fetchFilterOptions} 
          className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          title="Refresh filter options"
        >
          <RefreshCw size={18} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Expanded filters section */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Programming Language Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Code size={16} className="mr-1" /> Programming Languages
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filterOptions.languages.map(language => (
                  <div key={language} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`lang-${language}`}
                      checked={filters.language?.includes(language)}
                      onChange={() => handleLanguageToggle(language)}
                      className="rounded text-blue-500 focus:ring-blue-400"
                    />
                    <label htmlFor={`lang-${language}`} className="ml-2 text-sm">
                      {language}
                      {filterOptions.languageCounts[language] && (
                        <span className="ml-1 text-gray-500 text-xs">
                          ({filterOptions.languageCounts[language]})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
                {filterOptions.languages.length === 0 && (
                  <p className="text-sm text-gray-500">No languages found</p>
                )}
              </div>
            </div>
            
            {/* Directory Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Folder size={16} className="mr-1" /> Directory
              </label>
              <select
                name="directory"
                value={filters.directory}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">All Directories</option>
                <option value="root">Root ({filterOptions.directories.rootFilesCount})</option>
                {/* Would need to fetch directory info for proper labels */}
              </select>
            </div>
            
            {/* Difficulty Level Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Filter size={16} className="mr-1" /> Difficulty Level
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDifficultyToggle('easy')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    filters.difficulty?.includes('easy') 
                      ? 'bg-green-100 text-green-800 border border-green-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-transparent'
                  }`}
                >
                  Easy
                </button>
                <button
                  onClick={() => handleDifficultyToggle('medium')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    filters.difficulty?.includes('medium') 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-transparent'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => handleDifficultyToggle('hard')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    filters.difficulty?.includes('hard') 
                      ? 'bg-red-100 text-red-800 border border-red-500' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-transparent'
                  }`}
                >
                  Hard
                </button>
              </div>
            </div>
            
            {/* Visibility Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Eye size={16} className="mr-1" /> Visibility
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleVisibilityFilter(undefined)}
                  className={`px-3 py-1 rounded text-sm ${
                    filters.isPublic === undefined 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleVisibilityFilter(true)}
                  className={`px-3 py-1 rounded text-sm flex items-center ${
                    filters.isPublic === true 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Eye size={14} className="mr-1" /> Public
                </button>
                <button
                  onClick={() => handleVisibilityFilter(false)}
                  className={`px-3 py-1 rounded text-sm flex items-center ${
                    filters.isPublic === false 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <EyeOff size={14} className="mr-1" /> Private
                </button>
              </div>
            </div>
            
            {/* Created Date Range */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Calendar size={16} className="mr-1" /> Created Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">From:</label>
                  <input
                    type="date"
                    name="createdAfter"
                    value={filters.createdAfter}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">To:</label>
                  <input
                    type="date"
                    name="createdBefore"
                    value={filters.createdBefore}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Modified Date Range */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center">
                <Clock size={16} className="mr-1" /> Modified Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">From:</label>
                  <input
                    type="date"
                    name="modifiedAfter"
                    value={filters.modifiedAfter}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">To:</label>
                  <input
                    type="date"
                    name="modifiedBefore"
                    value={filters.modifiedBefore}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                name="sort"
                value={filters.sort}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="lastModified-desc">Recently Modified</option>
                <option value="lastModified-asc">Oldest Modified</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="created-desc">Recently Created</option>
                <option value="created-asc">Oldest Created</option>
                <option value="language-asc">Language (A-Z)</option>
                <option value="language-desc">Language (Z-A)</option>
              </select>
            </div>
          </div>
          
          {/* Filter actions */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSearchFilters;
