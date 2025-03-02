// client/src/pages/DocumentationViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import {
  Edit, Save, X, Trash2, Plus, Upload, FileText, File, MoreVertical,
  Download, XCircle, Folder
} from 'lucide-react';
import ImageAnnotator from '../components/ImageAnnotator';
import CategorySelector from '../components/CategorySelector';
import FlowchartTab from '../components/FlowchartTab';
import { v4 as uuidv4 } from 'uuid';
import config from "../config";
import 'reactflow/dist/style.css';

const API_BASE_URL = config.apiUrl;

interface Step {
  id: string;
  title?: string;
  timestamp: string;
  text: string;
  imageUrl: string | null;
  original_start_time: number | null;
  order: number;
  reviewed_at?: string | null;
  created_at?: string;
}

interface Documentation {
  title: string;
  content: string;
  steps: Step[];
  category?: {
    id: string;
    name: string;
  } | null;
}

interface StepItemProps {
  step: Step;
  index: number;
  editMode: boolean;
  isEditing: boolean;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick: (imageUrl: string, altText: string) => void;
  onSave: (updatedStep: Step) => void;
  onCancel: () => void;
  onAnnotate: (imageUrl: string) => void;
  onUploadImage: () => void;
}

// StepItem component with in-place editing
const StepItem: React.FC<StepItemProps> = ({
  step, index, editMode, isEditing, moveStep, onEdit, onDelete, onImageClick, onSave, onCancel, onAnnotate, onUploadImage
}) => {
  const stepRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isEditing && stepRef.current) {
      stepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isEditing]);

  const [{ isDragging }, dragRef] = useDrag({
    type: 'STEP',
    item: { index },
    canDrag: editMode && !isEditing,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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

  const [localStepText, setLocalStepText] = useState(step.text);
  const [localStepTitle, setLocalStepTitle] = useState(step.title || '');
  
  useEffect(() => {
    setLocalStepText(step.text);
    setLocalStepTitle(step.title || '');
  }, [step.text, step.title, isEditing]);

  return (
    <div
      ref={(node) => {
        if (editMode) ref(node);
        // @ts-ignore
        stepRef.current = node;
      }}
      className={`
        bg-white border rounded-lg mb-4 transition-all duration-200 shadow-sm
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isEditing ? 'border-primary ring-2 ring-primary ring-opacity-25' : editMode ? 'border-gray-300' : 'border-gray-200'}
      `}
    >
      <div className="p-4 relative">
        {editMode && !isEditing && (
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button 
              onClick={onEdit} 
              className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
              title="Edit step"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={onDelete} 
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors"
              title="Delete step"
            >
              <Trash2 size={16} />
            </button>
            {editMode && (
              <div className="p-1.5 text-gray-400 cursor-grab">
                <MoreVertical size={16} />
              </div>
            )}
          </div>
        )}
        
        {isEditing ? (
          <div className="space-y-4 mt-4">
            <div className="mb-2 flex items-center">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-primary/10 text-primary">
                Step {index + 1}
              </span>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Step Title (optional)
              </label>
              <input
                type="text"
                value={localStepTitle}
                onChange={(e) => setLocalStepTitle(e.target.value)}
                placeholder="Enter step title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <CKEditor
              editor={ClassicEditor}
              data={localStepText}
              config={{ 
                toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
              }}
              onChange={(event, editor) => {
                const data = editor.getData();
                setLocalStepText(data);
              }}
            />
            
            <div>
              {step.imageUrl ? (
                <div className="space-y-3 mt-4">
                  <img
                    src={step.imageUrl}
                    alt={`Screenshot at ${step.timestamp}`}
                    className="max-w-full max-h-[300px] rounded-md border border-gray-200"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={onUploadImage} 
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Change Screenshot
                    </button>
                    <button
                      onClick={() => {
                        if (!step.imageUrl) return;
                        const fullImageUrl = step.imageUrl.startsWith('http') 
                          ? step.imageUrl 
                          : `${API_BASE_URL}${step.imageUrl}`;
                        onAnnotate(fullImageUrl);
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Annotate
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={onUploadImage}
                  className="btn-secondary flex items-center gap-2 mt-3"
                >
                  <Upload size={16} />
                  Upload Screenshot
                </button>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={onCancel} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => onSave({ ...step, text: localStepText, title: localStepTitle || undefined })} 
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row md:gap-6">
              <div className="md:w-1/2">
                <div className="mb-2 flex items-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-primary/10 text-primary">
                    Step {index + 1}
                  </span>
                  {step.title && (
                    <span className="ml-2 font-medium text-gray-700">{step.title}</span>
                  )}
                </div>
                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: step.text }} />
              </div>
              <div className={`mt-4 md:mt-0 md:w-1/2 ${!step.imageUrl ? 'hidden' : ''}`}>
                {step.imageUrl && (
                  <img
                    src={step.imageUrl}
                    alt={`Screenshot at ${step.timestamp}`}
                    className="w-full rounded-md border border-gray-200 hover:border-primary transition-colors cursor-pointer max-h-64 object-contain"
                    onClick={() => onImageClick(step.imageUrl!, `Screenshot at ${step.timestamp}`)}
                    onError={(e) => {
                      console.error('Image failed to load:', step.imageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// DocumentationViewer component
const DocumentationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const editModeFromUrl = queryParams.get('edit') === 'true';
  
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
  const [imageToAnnotate, setImageToAnnotate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'document' | 'flowchart'>('document');
  
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewText, setOverviewText] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editModeFromUrl) {
      setEditMode(true);
    }
  }, [editModeFromUrl]);

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
        setDocumentTitle(data.title || 'Untitled Document');
        setCategoryId(data.category?.id || null);
        
        setOverviewText('This documentation was automatically generated from a video recording with voice narration.');
        
        if (data.steps && Array.isArray(data.steps)) {
          setSteps(data.steps.map((step: Step, index: number) => ({
            ...step,
            order: step.order || index,
            original_start_time: step.original_start_time || 0
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
      if (e.key === 'Escape' && (lightboxImage || imageToAnnotate)) {
        if (lightboxImage) closeLightbox();
        if (imageToAnnotate) setImageToAnnotate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, imageToAnnotate]);

  const sortedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleEditStep = (step: Step) => {
    setEditingStep({ ...step });
  };

  const handleSaveStep = async () => {
    if (!editingStep || !id) return;
    try {
      setSaveLoading(true);
      const updatedSegments = steps.map(step => ({
        id: step.id,
        title: step.id === editingStep.id ? editingStep.title || null : step.title || null,
        text: step.id === editingStep.id ? editingStep.text || '' : step.text || '',
        start_time: (step.original_start_time || 0).toString() || '0',
        end_time: ((step.original_start_time || 0) + 10).toString(),
        screenshot_path: step.id === editingStep.id ? (editingStep.imageUrl || null) : (step.imageUrl || null),
        job_id: id,
        needs_review: true,
        reviewed_at: step.reviewed_at || null,
        order: step.order,
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const requestBody = { segments: updatedSegments };
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Failed to save step: ${responseText}`);
      }
      
      setSteps(steps.map(step => 
        step.id === editingStep.id 
          ? { ...step, text: editingStep.text, imageUrl: editingStep.imageUrl, title: editingStep.title } 
          : step
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

  const saveStepOrder = async (stepsToSave: Step[] = sortedSteps) => {
    if (!id) return;
    
    try {
      setSaveLoading(true);
      const orderedSteps = stepsToSave.map((step) => ({
        id: step.id,
        order: step.order
      }));
      
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/steps/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        order: steps.length,
        reviewed_at: null,
        created_at: new Date().toISOString()
      };
      const allSegments = [
        ...steps.map(step => ({
          text: step.text || '',
          title: step.title || null,
          start_time: (step.original_start_time || 0).toString(),
          end_time: ((step.original_start_time || 0) + 10).toString(),
          screenshot_path: step.imageUrl || null,
          id: step.id,
          job_id: id,
          needs_review: true,
          reviewed_at: step.reviewed_at || null,
          order: step.order,
          created_at: step.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        {
          text: newStep.text,
          title: newStep.title || null,
          start_time: (newStep.original_start_time || 0).toString(),
          end_time: ((newStep.original_start_time || 0) + 10).toString(),
          screenshot_path: newStep.imageUrl || null,
          id: uuidv4(),
          job_id: id,
          needs_review: true,
          reviewed_at: null,
          order: newStep.order || steps.length,
          created_at: newStep.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      const requestBody = { segments: allSegments };
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error('Failed to add new step');
      const docResponse = await fetch(`${API_BASE_URL}/api/docs/${id}`);
      if (!docResponse.ok) throw new Error('Failed to refresh document');
      const data = await docResponse.json();
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps.map((step: Step, index: number) => ({
          ...step,
          order: step.order || index,
          original_start_time: step.original_start_time || 0
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
      const remainingSteps = steps.filter(step => step.id !== stepId);
      setSteps(remainingSteps);
      const segmentsForUpdate = remainingSteps.map(step => ({
        text: step.text || '',
        title: step.title || null,
        start_time: (step.original_start_time || 0).toString(),
        end_time: ((step.original_start_time || 0) + 10).toString(),
        screenshot_path: step.imageUrl || null,
        id: step.id,
        job_id: id,
        needs_review: true,
        reviewed_at: step.reviewed_at || null,
        order: step.order,
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const requestBody = { segments: segmentsForUpdate };
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete step: ${errorText}`);
      }
      const docResponse = await fetch(`${API_BASE_URL}/api/docs/${id}`);
      if (!docResponse.ok) throw new Error('Failed to refresh document');
      const data = await docResponse.json();
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps.map((step: Step, index: number) => ({
          ...step,
          order: step.order || index,
          original_start_time: step.original_start_time || 0
        })));
      }
    } catch (err) {
      console.error('Error deleting step:', err);
      setError(`Failed to delete step: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
      if (!response.ok) throw new Error(`Failed to upload image: ${response.status}`);
      const data = await response.json();
      const updatedStep = { ...editingStep, imageUrl: data.imageUrl };
      setEditingStep(updatedStep);
      const updatedSegments = steps.map(step => ({
        id: step.id,
        title: step.id === editingStep.id ? updatedStep.title || null : step.title || null,
        text: step.id === editingStep.id ? updatedStep.text || '' : step.text || '',
        start_time: (step.original_start_time || 0).toString(),
        end_time: ((step.original_start_time || 0) + 10).toString(),
        screenshot_path: step.id === editingStep.id ? updatedStep.imageUrl : (step.imageUrl || null),
        job_id: id,
        needs_review: true,
        reviewed_at: step.reviewed_at || null,
        order: step.order,
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const requestBody = { segments: updatedSegments };
      const saveResponse = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to save image: ${errorText}`);
      }
      setSteps(steps.map(step => step.id === editingStep.id ? { ...step, imageUrl: data.imageUrl } : step));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnnotationSave = async (dataUrl: string) => {
    if (!id || !editingStep) return;
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("screenshot", blob, `annotation_${Date.now()}.png`);
      const responseUpload = await fetch(`${API_BASE_URL}/api/docs/${id}/screenshots`, {
        method: "POST",
        body: formData,
      });
      if (!responseUpload.ok) {
        throw new Error("Failed to upload annotated image");
      }
      const data = await responseUpload.json();
      const updatedStep = {
        ...editingStep,
        imageUrl: data.imageUrl,
      };
      const updatedSegments = steps.map((step) => ({
        id: step.id,
        title: step.id === editingStep.id ? updatedStep.title || null : step.title || null,
        text: step.id === editingStep.id ? updatedStep.text || "" : step.text || "",
        start_time: (step.original_start_time || 0).toString(),
        end_time: ((step.original_start_time || 0) + 10).toString(),
        screenshot_path: step.id === editingStep.id ? updatedStep.imageUrl : step.imageUrl || null,
        job_id: id,
        needs_review: true,
        reviewed_at: step.reviewed_at || null,
        order: step.order,
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const requestBody = { segments: updatedSegments };
      const saveResponse = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to save annotated image: ${errorText}`);
      }
      const newSteps = steps.map((step) => (step.id === editingStep.id ? updatedStep : step));
      setSteps(newSteps);
      setEditingStep({
        ...updatedStep,
        imageUrl: data.imageUrl.startsWith('http') ? data.imageUrl : `${API_BASE_URL}${data.imageUrl}`
      });
      setImageToAnnotate(null);
      setError(null);
    } catch (err) {
      console.error("Error saving annotated image:", err);
      setError(err instanceof Error ? err.message : "Failed to save annotated image");
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
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    setLightboxImage(fullImageUrl);
    setLightboxAlt(alt);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxAlt('');
    document.body.style.overflow = 'auto';
  };

  const exitEditMode = () => {
    setImageToAnnotate(null);
    setEditMode(false);
  };

  const handleCategoryChange = async (newCategoryId: string | null) => {
    if (!id) return;
    try {
      setSaveLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: doc?.content || '',
          categoryId: newCategoryId
        }),
      });
      if (!response.ok) throw new Error('Failed to update category');
      const result = await response.json();
      if (doc) {
        setDoc({
          ...doc,
          category: result.document.category
        });
      }
      setCategoryId(newCategoryId);
      setSaveLoading(false);
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
      setSaveLoading(false);
    }
  };

  const handleSaveOverview = async () => {
    if (!id || !doc) return;
    try {
      setSaveLoading(true);
      let updatedContent = doc.content;
      const titleRegex = /(title:\s*)[^\n]+/;
      updatedContent = updatedContent.replace(titleRegex, `$1${documentTitle}`);
      const overviewRegex = /(## Overview\s+)([^#]+)/;
      updatedContent = updatedContent.replace(overviewRegex, `$1${overviewText}\n\n`);
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: updatedContent,
          title: documentTitle 
        }),
      });
      if (!response.ok) throw new Error('Failed to save overview');
      setDoc({
        ...doc,
        title: documentTitle,
        content: updatedContent
      });
      setEditingOverview(false);
    } catch (err) {
      console.error('Error saving overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to save overview');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddStepFromFlowchart = async (text: string) => {
    try {
      setIsLoading(true);
      const newStepId = uuidv4();
      const newStep: Step = {
        id: newStepId,
        timestamp: '0:00',
        text: text,
        imageUrl: null,
        order: steps.length,
        original_start_time: 0
      };

      const newSteps = [...steps, newStep];
      setSteps(newSteps);
      
      const updatedSegments = newSteps.map(step => ({
        id: step.id,
        text: step.text || '',
        title: step.title || null,
        start_time: (step.original_start_time || 0).toString() || '0',
        end_time: ((step.original_start_time || 0) + 10).toString(),
        screenshot_path: step.imageUrl || null,
        job_id: id!,
        needs_review: true,
        reviewed_at: step.reviewed_at || null,
        order: step.order,
        created_at: step.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const requestBody = { segments: updatedSegments };
      const response = await fetch(`${API_BASE_URL}/api/docs/${id}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save new step: ${response.statusText}`);
      }

      const refreshResponse = await fetch(`${API_BASE_URL}/api/docs/${id}/segments`);
      if (!refreshResponse.ok) throw new Error('Failed to refresh segments');
      const refreshedSegments = await refreshResponse.json();
      const refreshedSteps = refreshedSegments.map((segment: any) => ({
        id: segment.id,
        timestamp: segment.start_time ? `${Math.floor(segment.start_time / 60)}:${(segment.start_time % 60).toString().padStart(2, '0')}` : '0:00',
        text: segment.text,
        imageUrl: segment.screenshot_path || null,
        order: segment.order || segment.segment_index,
        original_start_time: Number(segment.original_start_time)
      }));
      setSteps(refreshedSteps);
      
      setError(null);
    } catch (err) {
      console.error('Error adding step from flowchart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add step from flowchart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStepsFromFlowchart = (updatedSteps: Step[]) => {
    setSteps(updatedSteps);
    saveStepOrder(updatedSteps);
  };

  const renderOverviewSection = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Overview</h3>
        {editMode && !editingOverview && (
          <button
            onClick={() => setEditingOverview(true)}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
            title="Edit overview"
          >
            <Edit size={16} />
          </button>
        )}
      </div>
      
      {editMode && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <CategorySelector 
            selectedCategoryId={categoryId}
            onChange={handleCategoryChange}
            className="w-full max-w-xs"
          />
        </div>
      )}
      
      {editingOverview ? (
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter document title"
            />
          </div>
          
          <CKEditor
            editor={ClassicEditor}
            data={overviewText}
            config={{ 
              toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
            }}
            onChange={(event, editor) => {
              const data = editor.getData();
              setOverviewText(data);
            }}
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setEditingOverview(false)} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveOverview} 
              className="btn-primary flex items-center gap-2" 
              disabled={saveLoading}
            >
              {saveLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {doc?.category && (
            <div className="mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <Folder size={12} className="mr-1" />
                {doc.category.name}
              </span>
            </div>
          )}
          <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: overviewText }} />
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="text-gray-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md transition-colors inline-flex items-center"
          >
            <div className="mr-1">Reload Page</div>
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
          <p className="text-yellow-700">No documentation found for this ID.</p>
        </div>
      </div>
    );
  }

  const documentId = doc?.title || '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <h2 className="text-xl font-medium text-gray-700">{documentTitle}</h2>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <>
                <button 
                  onClick={() => setEditMode(true)} 
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)} 
                    className="btn-secondary flex items-center gap-2" 
                    disabled={exportLoading}
                  >
                    <Download size={16} />
                    {exportLoading ? 'Exporting...' : 'Export'}
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-md border border-gray-200 z-10 py-1 min-w-[160px]">
                      <button 
                        onClick={() => handleExport('markdown')} 
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText size={16} className="mr-2" />
                        Markdown
                      </button>
                      <button 
                        onClick={() => handleExport('html')} 
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <File size={16} className="mr-2" />
                        HTML
                      </button>
                      <button 
                        onClick={() => handleExport('pdf')} 
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <File size={16} className="mr-2" />
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
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Step
                </button>
                <button
                  onClick={() => saveStepOrder()}
                  className="btn-secondary flex items-center gap-2"
                  disabled={saveLoading || editingStep !== null}
                >
                  <Save size={16} />
                  {saveLoading ? 'Saving...' : 'Save Order'}
                </button>
                <button
                  onClick={exitEditMode}
                  className="btn-secondary flex items-center gap-2"
                  disabled={editingStep !== null}
                >
                  <X size={16} />
                  Exit Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('document')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'document'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Document
          </button>
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'flowchart'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Flowchart
          </button>
        </nav>
      </div>

      {/* Conditional rendering based on active tab */}
      {activeTab === 'document' ? (
        <>
          {renderOverviewSection()}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Steps</h3>
            
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-1">
                {sortedSteps.map((step, index) => (
                  <StepItem
                    key={step.id}
                    step={{ ...step, imageUrl: step.imageUrl ? (step.imageUrl.startsWith('http') ? step.imageUrl : `${API_BASE_URL}${step.imageUrl}`) : null }}
                    index={index}
                    editMode={editMode}
                    isEditing={editingStep?.id === step.id}
                    moveStep={moveStep}
                    onEdit={() => handleEditStep(step)}
                    onDelete={() => deleteStep(step.id)}
                    onImageClick={handleImageClick}
                    onSave={(updatedStep) => {
                      setEditingStep(updatedStep);
                      handleSaveStep();
                    }}
                    onCancel={handleCancelEdit}
                    onAnnotate={setImageToAnnotate}
                    onUploadImage={handleImageUpload}
                  />
                ))}
                
                {sortedSteps.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No steps found in this document.</p>
                    {editMode && (
                      <button 
                        onClick={addNewStep}
                        className="mt-4 btn-primary inline-flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add First Step
                      </button>
                    )}
                  </div>
                )}
              </div>
            </DndProvider>

            {editMode && sortedSteps.length > 0 && !editingStep && (
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => saveStepOrder()} 
                  className="btn-primary flex items-center gap-2" 
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Order
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <FlowchartTab 
          documentId={documentId || ''}
          jobId={id || ''}
          steps={steps}
          onAddStep={handleAddStepFromFlowchart}
          onUpdateSteps={handleUpdateStepsFromFlowchart}
        />
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <button 
              onClick={closeLightbox}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={lightboxImage} 
              alt={lightboxAlt} 
              className="max-w-full max-h-[85vh] mx-auto object-contain rounded-md"
            />
            <div className="text-white text-center mt-4">{lightboxAlt}</div>
          </div>
        </div>
      )}

      {imageToAnnotate && (
        <ImageAnnotator 
          imageUrl={imageToAnnotate} 
          onSave={handleAnnotationSave} 
          onCancel={() => setImageToAnnotate(null)} 
        />
      )}

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
    </div>
  );
};

export default DocumentationViewer;