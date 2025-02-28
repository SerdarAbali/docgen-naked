import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { 
  Edit, Save, X, Trash2, Plus, Upload, FileText, FileCode, FilePdf, MoreVertical,
  Download, Code, File
} from 'lucide-react';

const API_BASE_URL = 'http://10.0.0.59:3001';

interface Step {
  id: string;
  timestamp: string;
  text: string;
  imageUrl: string | null;
  original_start_time: number;
  order: number;
}

interface Documentation {
  title: string;
  content: string;
  steps: Step[];
}

interface StepItemProps {
  step: Step;
  index: number;
  editMode: boolean;
  isEditing: boolean;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick?: (imageUrl: string, altText: string) => void;
}

const StepItem: React.FC<StepItemProps> = ({ 
  step, index, editMode, isEditing, moveStep, onEdit, onDelete, onImageClick 
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'STEP',
    item: { index },
    canDrag: editMode && !isEditing,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'STEP',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveStep(item.index, index);
        item.index = index;
      }
    },
  });

  const ref = (node: any) => {
    dragRef(node);
    dropRef(node);
  };

  return (
    <div 
      ref={editMode ? ref : null}
      className={`step-item ${isDragging ? 'dragging' : ''}`}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        backgroundColor: 'white',
        position: 'relative'
      }}
    >
      {editMode && !isEditing && (
        <div style={{ 
          position: 'absolute', 
          right: '8px',
          top: '8px',
          display: 'flex',
          gap: '8px'
        }}>
          <button 
            onClick={onEdit} 
            className="button button--secondary button--sm"
            style={{ padding: '4px 8px' }}
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={onDelete} 
            className="button button--danger button--sm"
            style={{ padding: '4px 8px' }}
          >
            <Trash2 size={16} />
          </button>
          <div 
            style={{ 
              cursor: 'grab',
              padding: '4px 8px',
              color: '#888'
            }}
          >
            ⋮⋮
          </div>
        </div>
      )}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '4px 8px', 
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          {step.timestamp}
        </span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: step.text }} />
      {step.imageUrl && (
        <div style={{ marginTop: '16px' }}>
          <img 
            src={step.imageUrl} 
            alt={`Screenshot at ${step.timestamp}`} 
            style={{ 
              maxWidth: '300px',
              maxHeight: '200px',
              borderRadius: '4px',
              cursor: 'pointer',
              objectFit: 'contain',
              border: '1px solid #e0e0e0'
            }}
            onClick={() => onImageClick && onImageClick(step.imageUrl!, `Screenshot at ${step.timestamp}`)}
            onError={(e) => {
              console.error('Image failed to load:', step.imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

const DocumentationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [doc, setDoc] = useState<Documentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!id) throw new Error('No document ID provided');
        
        const response = await fetch(`${API_BASE_URL}/api/docs/${id}`);
        if (!response.ok) throw new Error(`Failed to load document: ${response.statusText}`);
        
        const data = await response.json();
        setDoc(data);
        
        if (data.steps && Array.isArray(data.steps)) {
          setSteps(data.steps.map((step: Step, index: number) => ({
            ...step,
            order: step.order || index
          })));
        }
        
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDocument();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        closeLightbox();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);
  
  const sortedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  const handleEditStep = (step: Step) => {
    setEditingStep({...step});
  };
  
  const handleSaveStep = async () => {
    if (!editingStep || !id) return;
    
    try {
      setSaveLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/steps/${editingStep.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editingStep.text,
          timestamp: editingStep.timestamp,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save step');
      
      setSteps(steps.map(step => 
        step.id === editingStep.id ? editingStep : step
      ));
      
      setEditingStep(null);
      
    } catch (err) {
      console.error('Error saving step:', err);
      setError(err instanceof Error ? err.message : 'Failed to save step');
    } finally {
      setSaveLoading(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingStep(null);
  };
  
  const moveStep = (dragIndex: number, hoverIndex: number) => {
    const dragStep = sortedSteps[dragIndex];
    const newSteps = [...sortedSteps];
    newSteps.splice(dragIndex, 1);
    newSteps.splice(hoverIndex, 0, dragStep);
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index
    }));
    setSteps(updatedSteps);
  };
  
  const saveStepOrder = async () => {
    if (!id) return;
    
    try {
      setSaveLoading(true);
      const orderedSteps = steps.map((step, index) => ({
        id: step.id,
        order: step.order
      }));
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/steps/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: orderedSteps }),
      });
      
      if (!response.ok) throw new Error('Failed to save step order');
      
    } catch (err) {
      console.error('Error saving step order:', err);
      setError(err instanceof Error ? err.message : 'Failed to save step order');
    } finally {
      setSaveLoading(false);
    }
  };
  
  const addNewStep = async () => {
    if (!id) return;
    
    try {
      const newStep: Partial<Step> = {
        timestamp: '0:00',
        text: 'New step',
        imageUrl: null,
        original_start_time: 0,
        order: steps.length
      };
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          segments: [{
            text: newStep.text,
            start_time: newStep.original_start_time,
            end_time: newStep.original_start_time! + 10,
            screenshot_path: null
          }]
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add new step');
      
      const docResponse = await fetch(`${API_BASE_URL}/api/docs/${id}`);
      if (!docResponse.ok) throw new Error('Failed to refresh document');
      
      const data = await docResponse.json();
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps.map((step: Step, index: number) => ({
          ...step,
          order: step.order || index
        })));
      }
      
      const lastStep = data.steps[data.steps.length - 1];
      setEditingStep(lastStep);
      
    } catch (err) {
      console.error('Error adding new step:', err);
      setError(err instanceof Error ? err.message : 'Failed to add new step');
    }
  };
  
  const deleteStep = async (stepId: string) => {
    if (!id || !window.confirm('Are you sure you want to delete this step?')) return;
    
    try {
      setSteps(steps.filter(step => step.id !== stepId));
      
      const remainingSteps = steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({
          text: step.text,
          start_time: step.original_start_time,
          end_time: step.original_start_time + 10,
          screenshot_path: step.imageUrl
        }));
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segments: remainingSteps }),
      });
      
      if (!response.ok) throw new Error('Failed to delete step');
      
    } catch (err) {
      console.error('Error deleting step:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete step');
      window.location.reload();
    }
  };
  
  const handleImageUpload = () => {
    if (!editingStep) return;
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStep || !id || !event.target.files?.length) return;
    
    try {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('screenshot', file);
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/screenshots`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload image');
      
      const data = await response.json();
      
      setEditingStep({
        ...editingStep,
        imageUrl: data.imageUrl
      });
      
      await fetch(`${API_BASE_URL}/api/docs/${id}/update-segment-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: editingStep.id,
          screenshotPath: data.imageUrl
        }),
      });
      
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleExport = async (format: 'markdown' | 'html' | 'pdf') => {
    if (!id) return;
    
    try {
      setExportLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/export?format=${format}`);
      
      if (!response.ok) {
        if (response.status === 501) {
          const data = await response.json();
          alert(data.message || 'This export format is not available yet.');
          return;
        }
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let extension = format === 'markdown' ? 'md' : format;
      a.download = `${doc?.title || 'document'}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleImageClick = (imageUrl: string, alt: string) => {
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${API_BASE_URL}${imageUrl}`;
    setLightboxImage(fullImageUrl);
    setLightboxAlt(alt);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxAlt('');
    document.body.style.overflow = 'auto';
  };
  
  if (isLoading) {
    return (
      <div className="container margin-vert--lg">
        <h1>DocGen Application</h1>
        <h2>Documentation Viewer</h2>
        <p>Loading documentation...</p>
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
            onClick={() => window.location.reload()}
            className="button button--primary margin-top--md"
          >
            Reload Page
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
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2>{doc.title}</h2>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {!editMode ? (
            <>
              <button 
                onClick={() => setEditMode(true)}
                className="button button--primary"
              >
                <Edit size={16} style={{ marginRight: '4px' }} />
                Edit
              </button>
              
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="button button--secondary"
                  disabled={exportLoading}
                >
                  {exportLoading ? 'Exporting...' : 'Export'}
                </button>
                
                {showExportMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '8px 0',
                    zIndex: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    marginTop: '4px'
                  }}>
                    <button
                      onClick={() => handleExport('markdown')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <File size={16} style={{ marginRight: '8px' }} />
                      Markdown
                    </button>
                    <button
                      onClick={() => handleExport('html')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Code size={16} style={{ marginRight: '8px' }} />
                      HTML
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={16} style={{ marginRight: '8px' }} />
                      PDF
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={addNewStep}
                className="button button--primary"
              >
                <Plus size={16} style={{ marginRight: '4px' }} />
                Add Step
              </button>
              
              <button 
                onClick={saveStepOrder}
                className="button button--success"
                disabled={saveLoading || editingStep !== null}
              >
                <Save size={16} style={{ marginRight: '4px' }} />
                {saveLoading ? 'Saving...' : 'Save Order'}
              </button>
              
              <button 
                onClick={() => setEditMode(false)}
                className="button button--secondary"
                disabled={editingStep !== null}
              >
                <X size={16} style={{ marginRight: '4px' }} />
                Exit Edit Mode
              </button>
            </>
          )}
        </div>
      </div>
      
      <div style={{ marginBottom: '32px' }}>
        <h3>Overview</h3>
        <p>This documentation was automatically generated from a video recording with voice narration.</p>
      </div>
      
      <div>
        <h3>Steps</h3>
        
        {editingStep && (
          <div style={{
            border: '2px solid #25c2a0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            backgroundColor: '#f8f8f8'
          }}>
            <h4>Edit Step</h4>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>
                Timestamp:
              </label>
              <input
                type="text"
                value={editingStep.timestamp}
                onChange={(e) => setEditingStep({...editingStep, timestamp: e.target.value})}
                style={{
                  width: '100px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>
                Content:
              </label>
              <CKEditor
                editor={ClassicEditor}
                data={editingStep.text}
                config={{
                  toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
                }}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setEditingStep({...editingStep, text: data});
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                Screenshot:
              </label>
              
              {editingStep.imageUrl ? (
                <div>
                  <img 
                    src={editingStep.imageUrl} 
                    alt={`Screenshot at ${editingStep.timestamp}`}
                    style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '8px', borderRadius: '4px' }}
                  />
                  <button
                    onClick={handleImageUpload}
                    className="button button--secondary"
                  >
                    <Upload size={16} style={{ marginRight: '4px' }} />
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleImageUpload}
                  className="button button--primary"
                >
                  <Upload size={16} style={{ marginRight: '4px' }} />
                  Upload Image
                </button>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={handleCancelEdit}
                className="button button--secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStep}
                className="button button--primary"
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
        
        <DndProvider backend={HTML5Backend}>
          <div className="steps-container">
            {sortedSteps.map((step, index) => (
              <StepItem
                key={step.id}
                step={{
                  ...step,
                  imageUrl: step.imageUrl ? (step.imageUrl.startsWith('http') 
                    ? step.imageUrl 
                    : `${API_BASE_URL}${step.imageUrl}`) : null
                }}
                index={index}
                editMode={editMode}
                isEditing={editingStep?.id === step.id}
                moveStep={moveStep}
                onEdit={() => handleEditStep(step)}
                onDelete={() => deleteStep(step.id)}
                onImageClick={handleImageClick}
              />
            ))}
          </div>
        </DndProvider>
        
        {editMode && sortedSteps.length > 0 && !editingStep && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={saveStepOrder}
              className="button button--primary"
              disabled={saveLoading}
            >
              <Save size={16} style={{ marginRight: '4px' }} />
              {saveLoading ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeLightbox}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <img
              src={lightboxImage}
              alt={lightboxAlt}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div style={{
              color: 'white',
              marginTop: '10px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {lightboxAlt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentationViewer;