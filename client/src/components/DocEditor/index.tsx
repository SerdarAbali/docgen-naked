import React, { useState, useEffect } from 'react';
import StepEditor from './StepEditor';
import config from '../../config';

interface DocEditorProps {
  documentId: string; // Pass doc_id (e.g., '4adbb045-2a2b-4b62-a976-ae5520289b04')
}

const DocEditor: React.FC<DocEditorProps> = ({ documentId }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [content, setContent] = useState<string>('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch job_id and document content
  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch job_id
        const idResponse = await fetch(`${config.apiUrl}/api/docs/id/${documentId.replace(/\/$/, '').trim()}`);
        if (!idResponse.ok) throw new Error(`Failed to fetch job ID: ${idResponse.statusText}`);
        const { jobId: fetchedJobId } = await idResponse.json();
        console.log('[DocEditor] Fetched job ID for doc_id:', documentId, '->', fetchedJobId);
        setJobId(fetchedJobId);

        // Fetch full document content for Markdown
        const docResponse = await fetch(`${config.apiUrl}/api/docs/${fetchedJobId}`);
        if (!docResponse.ok) throw new Error(`Failed to load document: ${docResponse.statusText}`);
        const docData = await docResponse.json();
        setContent(docData.content || ''); // Set the Markdown content from the backend
      } catch (err) {
        console.error('[DocEditor] Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // Handle updates to content from StepEditor (e.g., after saving)
  const handleContentUpdate = (newContent: string) => {
    setContent(newContent);
  };

  if (isLoading) {
    return (
      <div className="text--center margin-vert--lg">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--danger margin-vert--lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="margin-bottom--lg">
        <div className="tabs-container">
          <ul className="tabs" role="tablist">
            <li
              className={`tabs__item ${activeTab === 'visual' ? 'tabs__item--active' : ''}`}
              role="tab"
              onClick={() => setActiveTab('visual')}
            >
              Visual Editor
            </li>
            <li
              className={`tabs__item ${activeTab === 'markdown' ? 'tabs__item--active' : ''}`}
              role="tab"
              onClick={() => setActiveTab('markdown')}
            >
              Markdown
            </li>
          </ul>
        </div>
      </div>

      <div className="margin-top--md">
        {activeTab === 'visual' ? (
          <StepEditor 
            documentId={documentId} 
            onSave={(newContent: string) => handleContentUpdate(newContent)} // Optional callback for content updates
          />
        ) : (
          <div className="theme-doc-markdown markdown">
            <BrowserOnly>
              {() => {
                const MDXContent = require('@theme/MDXContent').default;
                return <MDXContent>{content}</MDXContent>;
              }}
            </BrowserOnly>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocEditor;