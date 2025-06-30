import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, BookOpen, Code, ArrowLeft, Search, ChevronDown, ChevronUp, Trash } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import LanguageIcon from './LanguageIcon';

const LeetcodeSolutions = () => {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'easy', 'medium', 'hard'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState(null);
  
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSolutions();
    }
  }, [isAuthenticated]);
  
  const fetchSolutions = async () => {
    try {
      setLoading(true);
      const response = await api.leetcode.getSolutions();
      setSolutions(response.data.data);
    } catch (error) {
      console.error('Error fetching LeetCode solutions:', error);
      setError('Failed to load solutions. Please try again.');
      toast.error('Failed to load LeetCode solutions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteSolution = async (id) => {
    try {
      await api.leetcode.deleteSolution(id);
      toast.success('Solution deleted successfully');
      setSolutions(solutions.filter(solution => solution._id !== id));
    } catch (error) {
      console.error('Error deleting solution:', error);
      toast.error('Failed to delete solution');
    }
  };
  
  const handleSelectSolution = async (id) => {
    if (selectedSolution?._id === id) {
      setSelectedSolution(null);
      return;
    }
    
    try {
      const response = await api.leetcode.getSolutionById(id);
      setSelectedSolution(response.data.data);
    } catch (error) {
      console.error('Error fetching solution details:', error);
      toast.error('Failed to load solution details');
    }
  };
  
  // Filter and sort solutions
  const filteredSolutions = solutions
    .filter(solution => {
      // Apply search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return solution.problemTitle.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(solution => {
      // Apply difficulty filter
      if (filter === 'all') return true;
      return solution.difficulty.toLowerCase() === filter;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === 'name') {
        return a.problemTitle.localeCompare(b.problemTitle);
      }
      return 0;
    });
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get difficulty badge color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Please Log In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in to view your LeetCode solutions.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <Link to="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Code className="w-6 h-6 mr-2 text-blue-500" />
                LeetCode Solutions
              </h1>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
              >
                Filters
                {showFilters ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Filters and Search */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by problem title"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Problem Name</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md inline-block">
              {error}
            </div>
          </div>
        ) : filteredSolutions.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Code className="h-12 w-12 text-gray-400 mx-auto" />
            </div>
            {searchQuery || filter !== 'all' ? (
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No matching solutions found
              </h3>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No LeetCode solutions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Your LeetCode solutions will appear here when you save them using the extension.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSolutions.map((solution) => (
              <div 
                key={solution._id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div 
                  className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start cursor-pointer"
                  onClick={() => handleSelectSolution(solution._id)}
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {solution.problemTitle}
                    </h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <LanguageIcon language={solution.language} className="w-5 h-5" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {solution.language}
                      </span>
                      
                      {solution.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(solution.difficulty)}`}>
                          {solution.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {solution.leetcodeUrl && (
                      <a
                        href={solution.leetcodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    
                    <Link
                      to={`/files/view/${solution.fileId?._id || solution.fileId}`}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Code className="w-5 h-5" />
                    </Link>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this solution?')) {
                          handleDeleteSolution(solution._id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {selectedSolution && selectedSolution._id === solution._id && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Problem Description</h4>
                    {solution.problemDescription ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                          {solution.problemDescription}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No problem description available
                      </p>
                    )}
                    
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mt-4 mb-2">Solution</h4>
                    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-200 p-3 rounded-md overflow-x-auto text-sm">
                      <code>{solution.code}</code>
                    </pre>
                    
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      Saved on {formatDate(solution.createdAt)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LeetcodeSolutions;
