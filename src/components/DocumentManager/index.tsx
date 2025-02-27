//dont remove this commet ever! this file locations is docgen/src/components/DocumentManager
import React, { useState, useEffect } from 'react';
import { Trash2, Search, RefreshCw } from 'lucide-react';

interface Document {
  id: string;
  job_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: string;
}

const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching documents from http://10.0.0.59:3001/api/docs/list');
      const response = await fetch('http://10.0.0.59:3001/api/docs/list');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load documents: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setDocuments(data);
      console.log('Documents loaded successfully:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      console.error('Error loading documents:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

const handleDelete = async (jobId: string) => {
  if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
    return;
  }

  try {
    setIsLoading(true);
    setError(null);
    console.log(`Attempting to delete document with job_id: ${jobId}`);
    const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 500) {
        throw new Error('Cannot delete document: It is still referenced in another table (e.g., transcription_segments). Please remove or update related records first.');
      }
      throw new Error(`Failed to delete document: ${response.status} - ${errorText}`);
    }

    // Refresh document list after successful deletion
    await loadDocuments();
    console.log(`Document with job_id ${jobId} deleted successfully`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
    setError(errorMessage);
    console.error('Error deleting document:', errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6 custom-document-manager">
      <div className="text-center mt-32">
        <h1 className="text-2xl font-bold text-[var(--ifm-font-color-base)] mb-6">Document Manager</h1>
      </div>

      <div className="bg-[var(--ifm-background-surface-color)] rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="mb-24 border-b border-[var(--ifm-color-primary-light)]">
          <p className="text-sm text-[var(--ifm-font-color-base)] mb-4">
            Manage your generated documentation, view status, and delete as needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ifm-color-primary)]" size={20} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-box pl-10 pr-4 py-2 w-full rounded-lg focus:ring-[var(--ifm-color-primary)] focus:border-transparent shadow-sm"
              />
            </div>
            <button
              onClick={() => loadDocuments()}
              className="button button--primary flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:bg-[var(--ifm-color-primary-dark)] transition-colors duration-200 w-full sm:w-auto"
            >
              <RefreshCw size={20} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-[var(--ifm-font-color-base)]">
            <p>Loading documents...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md mb-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[var(--ifm-background-color)] border-b border-[var(--ifm-color-primary-light)]">
              <tr>
                <th className="text-left p-4 text-[var(--ifm-font-color-base)] font-semibold">Title</th>
                <th className="text-left p-4 text-[var(--ifm-font-color-base)] font-semibold">Created</th>
                <th className="text-left p-4 text-[var(--ifm-font-color-base)] font-semibold">Last Updated</th>
                <th className="text-left p-4 text-[var(--ifm-font-color-base)] font-semibold">Status</th>
                <th className="text-right p-4 text-[var(--ifm-font-color-base)] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-[var(--ifm-background-color)] transition-colors duration-200">
                  <td className="p-4">
                    <a 
                      href={`/documentation/generated/${doc.job_id}`}
                      className="text-[var(--ifm-color-primary)] hover:underline font-medium"
                    >
                      {doc.title}
                    </a>
                  </td>
                  <td className="p-4 text-[var(--ifm-font-color-base)]">{formatDate(doc.created_at)}</td>
                  <td className="p-4 text-[var(--ifm-font-color-base)]">{formatDate(doc.updated_at)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                      doc.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.job_id)}
                      className="button button--danger button--sm flex items-center gap-1 px-2 py-1 rounded-lg shadow-md hover:bg-red-600 transition-colors duration-200"
                      title="Delete document"
                      disabled={isLoading} // Disable button while loading to prevent multiple clicks
                    >
                      <Trash2 size={16} />
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDocuments.length === 0 && !isLoading && !error && (
            <p className="text-center py-4 text-[var(--ifm-font-color-base)]">
              No documents found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;