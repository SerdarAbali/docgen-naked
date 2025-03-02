import React, { useState } from 'react';
import { Globe, Github, BookOpen } from 'lucide-react';
import config from '../../config';

interface DocPublishProps {
  documentId: string;
  title: string;
}

const DocPublish: React.FC<DocPublishProps> = ({ documentId, title }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [gitHubRepo, setGitHubRepo] = useState('');
  const [gitHubToken, setGitHubToken] = useState('');
  const [gitHubPath, setGitHubPath] = useState('docs/');

  const handleGitHubPublish = async () => {
    if (!gitHubRepo || !gitHubToken) {
      setPublishError('GitHub repository and personal access token are required');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    
    try {
      const response = await fetch(`${config.apiUrl}/api/docs/${documentId}/publish/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: gitHubRepo,
          token: gitHubToken,
          path: gitHubPath,
          title: title
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish to GitHub');
      }
      
      const data = await response.json();
      setPublishSuccess(`Successfully published to GitHub: ${data.url}`);
    } catch (error) {
      console.error('GitHub publish error:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish to GitHub');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-[var(--ifm-background-surface-color)] rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Publish Documentation</h3>
      
      {publishError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {publishError}
        </div>
      )}
      
      {publishSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
          {publishSuccess}
        </div>
      )}
      
      <div className="border-b border-gray-200 py-4 mb-4">
        <h4 className="flex items-center gap-2 font-medium mb-3">
          <Github size={20} />
          Publish to GitHub
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              GitHub Repository (owner/repo)
            </label>
            <input
              type="text"
              value={gitHubRepo}
              onChange={(e) => setGitHubRepo(e.target.value)}
              placeholder="e.g., username/docs-repo"
              className="input-box w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Personal Access Token
            </label>
            <input
              type="password"
              value={gitHubToken}
              onChange={(e) => setGitHubToken(e.target.value)}
              placeholder="ghp_..."
              className="input-box w-full"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Directory Path (inside repository)
          </label>
          <input
            type="text"
            value={gitHubPath}
            onChange={(e) => setGitHubPath(e.target.value)}
            placeholder="docs/"
            className="input-box w-full"
          />
        </div>
        
        <button
          onClick={handleGitHubPublish}
          disabled={isPublishing}
          className="button button--primary flex items-center gap-2"
        >
          <Github size={16} />
          {isPublishing ? 'Publishing...' : 'Publish to GitHub'}
        </button>
      </div>
      
      {/* Add more publishing options here (GitBook, etc.) */}
    </div>
  );
};

export default DocPublish;