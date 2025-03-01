// client/src/pages/DocumentList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Clock, CheckCircle, XCircle, FileText, Search, Trash, Folder, Calendar, ArrowUpDown } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Document {
  id: string;
  job_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: string;
  category: Category | null;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'title' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('http://10.0.0.59:3001/api/docs/list');
        if (!response.ok) throw new Error(`Failed to fetch documents: ${response.statusText}`);
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleDelete = async (jobId: string) => {
    try {
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error(`Failed to delete document: ${response.statusText}`);
      
      // Remove the deleted document from the list
      setDocuments(documents.filter(doc => doc.job_id !== jobId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };
  
  const handleBulkDelete = async () => {
    try {
      setError(null);
      const deletePromises = selectedDocs.map(jobId => 
        fetch(`http://10.0.0.59:3001/api/docs/${jobId}`, {
          method: 'DELETE',
        })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failedDeletes = results.filter(result => result.status === 'rejected').length;
      
      if (failedDeletes > 0) {
        setError(`Failed to delete ${failedDeletes} document(s)`);
      }
      
      // Remove all deleted documents from the list
      setDocuments(documents.filter(doc => !selectedDocs.includes(doc.job_id)));
      setSelectedDocs([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error('Error bulk deleting documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete documents');
    }
  };
  
  const toggleDocSelection = (jobId: string) => {
    if (selectedDocs.includes(jobId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== jobId));
    } else {
      setSelectedDocs([...selectedDocs, jobId]);
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredAndSortedDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredAndSortedDocuments.map(doc => doc.job_id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique categories from documents
  const categories = Array.from(
    new Set(
      documents
        .filter(doc => doc.category)
        .map(doc => JSON.stringify({ id: doc.category?.id, name: doc.category?.name }))
    )
  ).map(cat => JSON.parse(cat));

  // Filter documents based on search term and category filter
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === null || 
                          (categoryFilter === 'uncategorized' && !doc.category) ||
                          (doc.category && doc.category.id === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Sort documents
  const filteredAndSortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortField === 'title') {
      return sortDirection === 'asc' 
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    } else {
      return sortDirection === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const toggleSort = (field: 'title' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'awaiting_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Review Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            {status.replace('_', ' ')}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800">DocGen</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Document Library</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-lg font-medium text-gray-700 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Your Documents
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {selectedDocs.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete Selected ({selectedDocs.length})
              </button>
            )}
            
            <div className="relative w-full sm:w-auto">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Category filters */}
        {categories.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2 min-w-max">
              <span className="text-sm font-medium text-gray-700">Categories:</span>
              
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-3 py-1 text-sm rounded-full ${
                  categoryFilter === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              
              <button
                onClick={() => setCategoryFilter('uncategorized')}
                className={`px-3 py-1 text-sm rounded-full ${
                  categoryFilter === 'uncategorized'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Uncategorized
              </button>
              
              {categories.map((category: any) => (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                    categoryFilter === category.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Folder size={14} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {filteredAndSortedDocuments.length > 0 ? (
          <>
            {/* Table view (for larger screens) */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedDocs.length === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('title')}
                      >
                        <div className="flex items-center">
                          Title
                          <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Date Created
                          <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-2 py-4 text-center whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={selectedDocs.includes(doc.job_id)}
                            onChange={() => toggleDocSelection(doc.job_id)}
                            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              <Link 
                                to={`/documentation/generated/${doc.job_id}`}
                                className="hover:text-primary transition-colors"
                              >
                                {doc.title}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.category ? (
                            <span className="inline-flex items-center bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-800">
                              <Folder size={12} className="mr-1" />
                              {doc.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(doc.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Link 
                              to={`/documentation/generated/${doc.job_id}?edit=true`}
                              className="text-gray-500 hover:text-primary rounded-md p-1 transition-colors"
                              title="Edit document"
                            >
                              <Edit className="w-5 h-5" />
                            </Link>
                            <button 
                              onClick={() => setShowDeleteConfirm(doc.job_id)}
                              className="text-gray-500 hover:text-red-500 rounded-md p-1 transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card view (for mobile) */}
            <div className="md:hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={selectedDocs.length === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary mr-2"
                  />
                  <span className="text-xs text-gray-500 font-medium">Select All</span>
                </label>
                <button 
                  onClick={() => toggleSort('title')}
                  className="text-xs text-gray-500 font-medium flex items-center"
                >
                  Sort: {sortField === 'title' ? 'Title' : 'Date'} 
                  <ArrowUpDown size={12} className="ml-1" />
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {filteredAndSortedDocuments.map(doc => (
                  <li key={doc.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedDocs.includes(doc.job_id)}
                        onChange={() => toggleDocSelection(doc.job_id)}
                        className="h-4 w-4 mt-1 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <Link 
                            to={`/documentation/generated/${doc.job_id}`} 
                            className="text-base font-medium text-gray-900 hover:text-primary transition-colors break-words line-clamp-2"
                          >
                            {doc.title}
                          </Link>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {doc.category ? (
                            <span className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium text-gray-800">
                              <Folder size={10} className="mr-1" />
                              {doc.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs px-2 py-0.5 rounded-full border border-gray-200">Uncategorized</span>
                          )}
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {formatDate(doc.created_at)}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link
                            to={`/documentation/generated/${doc.job_id}?edit=true`}
                            className="flex-1 text-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
                          >
                            <Edit size={14} className="inline-block mr-1" />
                            Edit
                          </Link>
                          <button
                            onClick={() => setShowDeleteConfirm(doc.job_id)}
                            className="flex-1 text-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-md transition-colors"
                          >
                            <Trash2 size={14} className="inline-block mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || categoryFilter ? 'Try a different search term or category' : 'Upload a video to create your first document'}
            </p>
            <button 
              onClick={() => navigate('/')}
              className="btn-primary inline-flex items-center"
            >
              Upload Video
            </button>
          </div>
        )}
      </div>

      {/* Single Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Document</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(null)} 
                className="btn-secondary order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)} 
                className="btn-danger order-1 sm:order-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Delete confirmation dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Multiple Documents</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => setShowBulkDeleteConfirm(false)} 
                className="btn-secondary order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete} 
                className="btn-danger order-1 sm:order-2"
              >
                Delete {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;