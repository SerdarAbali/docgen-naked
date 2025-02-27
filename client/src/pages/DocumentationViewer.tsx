// client/src/pages/DocumentationViewer.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface Step {
  id: string;
  timestamp: string;
  text: string;
  imageUrl: string | null;
  order: number;
}

interface Documentation {
  title: string;
  content: string;
  steps?: Step[];
}

// StepItem component for drag and drop
const StepItem = ({ 
  step, 
  index, 
  moveStep, 
  isSelected, 
  onClick 
}: { 
  step: Step; 
  index: number; 
  moveStep: (dragIndex: number, hoverIndex: number) => void; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const ref = React.useRef<HTMLLIElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'STEP',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'STEP',
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Time to actually perform the action
      moveStep(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <li
      ref={ref}
      className={`step-item ${isSelected ? 'step-active' : ''}`}
      onClick={onClick}
      style={{
        padding: '10px',
        marginBottom: '5px',
        cursor: 'pointer',
        borderRadius: '4px',
        backgroundColor: isSelected ? '#e6f7ff' : '#f5f5f5',
        borderLeft: isSelected ? '3px solid #1890ff' : 'none',
        opacity: isDragging ? 0.5 : 1,
        transition: 'background-color 0.2s, opacity 0.2s',
        listStyleType: 'none'
      }}
    >
      <span 
        style={{ 
          cursor: 'grab', 
          marginRight: '8px',
          display: 'inline-block' 
        }}
      >
        ↕️
      </span>
      
      <span style={{ fontWeight: 'bold' }}>{step.timestamp}</span> - {step.text.substring(0, 30)}
      {step.text.length > 30 ? '...' : ''}
    </li>
  );
};

const DocumentationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');

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
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation (Status: ${response.status})`);
        }
        
        const responseText = await response.text();
        
        if (responseText.length < 100) {
          if (retryCount < 5) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => setIsLoading(true), 2000);
            return;
          }
        }
        
        try {
          const data = JSON.parse(responseText);
          console.log('Documentation data:', {
            title: data.title,
            contentLength: data.content?.length || 0,
            stepsCount: data.steps?.length || 0
          });
          
          setDoc(data);
          
          // If steps array is available, set the first step as selected
          if (data.steps && data.steps.length > 0) {
            setSelectedStepId(data.steps[0].id);
          }
          
          // Keep generating HTML for backward compatibility
          let content = data.content || '';
          content = content.replace(/!\[(.*?)\]\((\/.*?)\)/g, (match, alt, src) => {
            return `![${alt}](http://10.0.0.59:3001${src})`;
          });
          
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

  // Basic Markdown to HTML converter - keep for backward compatibility
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

  // Move step in the list
  const moveStep = (dragIndex: number, hoverIndex: number) => {
    if (!doc?.steps) return;
    
    const dragItem = doc.steps[dragIndex];
    if (!dragItem) return;
    
    const newSteps = [...doc.steps];
    newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, dragItem);
    
    setDoc({...doc, steps: newSteps});
  };

  // Save the new order to the server
  const saveOrder = async () => {
    if (!doc?.steps || !id) return;
    
    try {
      console.log('Saving new step order');
      
      const stepsOrder = doc.steps.map((step, index) => ({
        id: step.id,
        order: index + 1
      }));
      
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${id}/steps/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ steps: stepsOrder })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save order');
      }
      
      console.log('Order saved successfully');
    } catch (error) {
      console.error('Error saving step order:', error);
      alert('Failed to save the new step order. Please try again.');
    }
  };

  // Save edited step text
  const saveStepEdit = async () => {
    if (!selectedStepId || !doc?.steps || !id) return;
    
    try {
      console.log(`Saving edit for step ${selectedStepId}`);
      
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${id}/steps/${selectedStepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingText })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      // Update local state with edited content
      setDoc({
        ...doc,
        steps: doc.steps.map(step => 
          step.id === selectedStepId ? {...step, text: editingText} : step
        )
      });
      
      setIsEditing(false);
      console.log("Edit saved successfully");
    } catch (error) {
      console.error('Error updating step:', error);
      alert("Failed to save edit. See console for details.");
    }
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
      
      {/* New structured view using the steps array */}
      {doc.steps && doc.steps.length > 0 ? (
        <DndProvider backend={HTML5Backend}>
          <div className="row">
            {/* Steps navigation sidebar */}
            <div className="col col--3">
              <div className="padding-right--md">
                <h3>Steps</h3>
                <ul 
                  className="steps-list"
                  style={{ listStyleType: 'none', padding: 0, margin: 0 }}
                >
                  {doc.steps.map((step, index) => (
                    <StepItem
                      key={step.id}
                      step={step}
                      index={index}
                      moveStep={moveStep}
                      isSelected={selectedStepId === step.id}
                      onClick={() => setSelectedStepId(step.id)}
                    />
                  ))}
                </ul>
                
                <button 
                  className="button button--primary button--block margin-top--md"
                  onClick={saveOrder}
                >
                  Save Order
                </button>
              </div>
            </div>
            
            {/* Selected step content */}
            <div className="col col--9">
              {selectedStepId && doc.steps.find(step => step.id === selectedStepId) && (
                <div className="step-content">
                  <h3>
                    <span className="timestamp" style={{
                      fontFamily: 'monospace',
                      backgroundColor: '#f5f5f5',
                      padding: '3px 6px',
                      borderRadius: '4px'
                    }}>
                      {doc.steps.find(step => step.id === selectedStepId)?.timestamp}
                    </span>
                    
                    <button 
                      className="button button--secondary"
                      style={{ marginLeft: '10px' }}
                      onClick={() => {
                        const step = doc.steps.find(s => s.id === selectedStepId);
                        if (step) {
                          setEditingText(step.text);
                          setIsEditing(true);
                        }
                      }}
                    >
                      Edit
                    </button>
                  </h3>
                  
                  {isEditing ? (
                    <div className="edit-container">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="edit-textarea"
                        rows={5}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          marginBottom: '10px',
                          borderRadius: '4px',
                          border: '1px solid #d9d9d9'
                        }}
                      />
                      
                      <div className="edit-actions">
                        <button 
                          className="button button--secondary" 
                          onClick={() => setIsEditing(false)}
                          style={{ marginRight: '10px' }}
                        >
                          Cancel
                        </button>
                        
                        <button 
                          className="button button--primary" 
                          onClick={saveStepEdit}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="step-text" style={{
                      fontSize: '1.1rem',
                      lineHeight: '1.6',
                      marginBottom: '1.5rem'
                    }}>
                      {doc.steps.find(step => step.id === selectedStepId)?.text}
                    </p>
                  )}
                  
                  {doc.steps.find(step => step.id === selectedStepId)?.imageUrl && (
                    <div className="step-image" style={{ margin: '1rem 0' }}>
                      <img 
                        src={`http://10.0.0.59:3001${doc.steps.find(step => step.id === selectedStepId)?.imageUrl}`} 
                        alt={`Screenshot at ${doc.steps.find(step => step.id === selectedStepId)?.timestamp}`}
                        style={{ 
                          maxWidth: '100%', 
                          height: 'auto', 
                          borderRadius: '4px', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="step-navigation" style={{ 
                    marginTop: '20px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <button 
                      className="button button--secondary" 
                      disabled={doc.steps.findIndex(step => step.id === selectedStepId) === 0}
                      onClick={() => {
                        const currentIndex = doc.steps.findIndex(step => step.id === selectedStepId);
                        if (currentIndex > 0) {
                          setSelectedStepId(doc.steps[currentIndex - 1].id);
                        }
                      }}
                    >
                      Previous Step
                    </button>
                    
                    <button 
                      className="button button--primary" 
                      disabled={doc.steps.findIndex(step => step.id === selectedStepId) === doc.steps.length - 1}
                      onClick={() => {
                        const currentIndex = doc.steps.findIndex(step => step.id === selectedStepId);
                        if (currentIndex < doc.steps.length - 1) {
                          setSelectedStepId(doc.steps[currentIndex + 1].id);
                        }
                      }}
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DndProvider>
      ) : (
        // Fallback to the old HTML content if steps array is not available
        <div 
          className="documentation-content"
          style={{ maxWidth: '100%' }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )}
    </div>
  );
};

export default DocumentationViewer;