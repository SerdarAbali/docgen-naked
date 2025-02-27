import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Documentation {
  title: string;
  content: string;
  created_at?: string;
  sections?: { title: string; content: string }[];
}

const DocumentationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const fetchDocumentation = async () => {
      try {
        console.log(`Fetching documentation for ID: ${id} (Attempt ${retryCount + 1})`);
        if (!id) throw new Error('No ID provided');
        
        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`http://10.0.0.59:3001/api/docs/${id}?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation (Status: ${response.status})`);
        }
        
        const responseText = await response.text();
        console.log('Response received, length:', responseText.length);
        
        if (responseText.length < 100) {
          console.warn('Response seems too short, might be incomplete.');
          
          // If we're still in the retry phase, schedule another attempt
          if (retryCount < 5) {
            console.log(`Will retry in 2 seconds (attempt ${retryCount + 1}/5)...`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => setIsLoading(true), 2000);
            return;
          }
        }
        
        try {
          const data = JSON.parse(responseText);
          console.log('Documentation data:', {
            title: data.title,
            contentLength: data.content?.length || 0
          });
          
          setDoc(data);
          
          // Convert markdown to HTML (basic conversion)
          let content = data.content || '';
          
          // Fix image paths
          content = content.replace(/!\[(.*?)\]\((\/.*?)\)/g, (match, alt, src) => {
            return `![${alt}](http://10.0.0.59:3001${src})`;
          });
          
          // Basic markdown to HTML conversion
          const html = convertMarkdownToHtml(content);
          setHtmlContent(html);
          
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Failed to parse documentation data');
        }
      } catch (err) {
        console.error('Error fetching documentation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documentation');
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoading) {
      fetchDocumentation();
    }
  }, [id, isLoading, retryCount]);

  // Basic Markdown to HTML converter
  const convertMarkdownToHtml = (markdown: string): string => {
    // Handle headers
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Handle images
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%;" />')
      // Handle bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Handle italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Handle paragraphs
      .replace(/\n\n/gim, '</p><p>')
      // Handle line breaks
      .replace(/\n/gim, '<br>');
      
    // Wrap in paragraphs
    html = '<p>' + html + '</p>';
    
    // Handle info blocks
    html = html.replace(/<p>:::(.*?)\n(.*?)\n:::<\/p>/gims, '<div class="info-block"><strong>$1</strong><p>$2</p></div>');
    
    return html;
  };

  if (isLoading) {
    return (
      <div className="container margin-vert--lg">
        <h1>DocGen Application</h1>
        <h2>Documentation Viewer</h2>
        <p>Loading documentation... (Attempt {retryCount + 1}/6)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container margin-vert--lg">
        <h1>DocGen Application</h1>
        <h2>Documentation Viewer</h2>
        <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffeeee' }}>
          <p>Error: {error}</p>
          <button 
            onClick={() => { setError(null); setIsLoading(true); setRetryCount(0); }}
            className="button button--primary margin-top--md"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container margin-vert--lg">
        <h1>DocGen Application</h1>
        <h2>Documentation Viewer</h2>
        <p>No documentation found for this ID.</p>
      </div>
    );
  }

  return (
    <div className="container margin-vert--lg">
      <h1>DocGen Application</h1>
      <h2>{doc.title}</h2>
      
      <div 
        className="documentation-content"
        style={{ maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      {/* Fallback - Show raw markdown if you prefer */}
      {/*
      <div className="prose max-w-full">
        <pre style={{ whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
          {doc.content}
        </pre>
      </div>
      */}
    </div>
  );
};

export default DocumentationViewer;