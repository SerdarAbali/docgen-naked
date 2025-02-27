// dont remove this comment. document located at /src/components/DocumentExport/index.tsx

import React, { useState } from 'react';
import { Download, FileText, FileCode, FilePdf } from 'lucide-react';

interface DocumentExportProps {
  documentId: string;
  title: string;
}

const DocumentExport: React.FC<DocumentExportProps> = ({ documentId, title }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (format: 'markdown' | 'html' | 'pdf') => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${documentId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // For PDF, we need to handle the blob response
      if (format === 'pdf') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // For markdown and HTML, we can get the text content
        const content = await response.text();
        const blob = new Blob([content], { 
          type: format === 'markdown' ? 'text/markdown' : 'text/html' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.${format === 'markdown' ? 'md' : 'html'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[var(--ifm-background-surface-color)] rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Export Documentation</h3>
      
      {exportError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {exportError}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          className="button button--secondary flex items-center gap-2"
        >
          <FileText size={16} />
          Markdown
        </button>
        
        <button
          onClick={() => handleExport('html')}
          disabled={isExporting}
          className="button button--secondary flex items-center gap-2"
        >
          <FileCode size={16} />
          HTML
        </button>
        
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="button button--secondary flex items-center gap-2"
        >
          <FilePdf size={16} />
          PDF
        </button>
      </div>
      
      {isExporting && <p className="mt-2 text-gray-500">Exporting document...</p>}
    </div>
  );
};

export default DocumentExport;