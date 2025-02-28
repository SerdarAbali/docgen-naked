// StepEditor.tsx - Fixed Version
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Upload, Video, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import VideoSegmentSelector from '../VideoSegmentSelector';
import { v4 as uuidv4 } from 'uuid';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import ImageAnnotator from '../../components/ImageAnnotator';

interface Step {
  id?: string;
  timestamp: string;
  text: string;
  imageUrl: string;
  original_start_time?: number;
}

interface StepEditorProps {
  documentId: string;
  onSave?: (newContent: string) => void;
}

const StepEditor: React.FC<StepEditorProps> = ({ documentId, onSave }) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [documentTitle, setDocumentTitle] = useState<string>('Documentation');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStepIndex, setUploadingStepIndex] = useState<number | null>(null);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [imageToAnnotate, setImageToAnnotate] = useState<{ url: string; index: number } | null>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadDocument = async () => {
      try {
        console.log("[DEBUG] Loading document ID:", documentId);
        const cleanDocId = documentId.replace(/\/$/, '').trim();
        
        const idResponse = await fetch(`http://10.0.0.59:3001/api/docs/id/${cleanDocId}`);
        if (!idResponse.ok) throw new Error('Failed to get job ID');
        const { jobId: fetchedJobId } = await idResponse.json();
        console.log("[DEBUG] Got job ID:", fetchedJobId);
        setJobId(fetchedJobId);

        const docResponse = await fetch(`http://10.0.0.59:3001/api/docs/${fetchedJobId}`);
        if (!docResponse.ok) throw new Error('Failed to load document');
        const docData = await docResponse.json();
        
        const titleMatch = docData.content.match(/title:\s*([^\n]+)/);
        if (titleMatch) setDocumentTitle(titleMatch[1].trim());

        const segmentsResponse = await fetch(`http://10.0.0.59:3001/api/docs/${fetchedJobId}/segments`);
        if (!segmentsResponse.ok) throw new Error('Failed to load segments');
        const segments = await segmentsResponse.json();
        console.log("[DEBUG] Loaded segments:", segments);

        const convertedSteps = segments.map(segment => ({
          id: segment.id,
          timestamp: formatTime(Number(segment.original_start_time)),
          text: segment.text,
          imageUrl: segment.screenshot_path || '',
          original_start_time: Number(segment.original_start_time)
        }));

        setSteps(convertedSteps);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  const handleAddStep = async () => {
    const newStep: Step = {
      id: uuidv4(),
      timestamp: '0:00',
      text: '',
      imageUrl: '',
      original_start_time: 0
    };

    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps); // Optimistically update UI

    if (jobId) {
      try {
        const segmentsForUpdate = updatedSteps.map(step => ({
          id: step.id, // Include local ID for potential server recognition
          text: step.text,
          start_time: step.original_start_time || 0,
          end_time: (step.original_start_time || 0) + 10,
          screenshot_path: step.imageUrl || null
        }));

        const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: segmentsForUpdate }),
        });

        if (!response.ok) throw new Error('Failed to add new step to database');

        // Refresh steps from server to get updated IDs
        const refreshResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/segments`);
        if (!refreshResponse.ok) throw new Error('Failed to refresh steps');
        const segments = await refreshResponse.json();
        const refreshedSteps = segments.map(segment => ({
          id: segment.id,
          timestamp: formatTime(Number(segment.original_start_time)),
          text: segment.text,
          imageUrl: segment.screenshot_path || '',
          original_start_time: Number(segment.original_start_time)
        }));
        setSteps(refreshedSteps);

        console.log("[DEBUG] New step added and steps refreshed successfully");
      } catch (err) {
        console.error("[DEBUG] Error adding new step:", err);
        setError(err instanceof Error ? err.message : 'Failed to add new step');
        setSteps(steps); // Revert on failure
      }
    }
  };

  const handleRemoveStep = async (index: number) => {
    if (!jobId) return;
    
    try {
      const remainingSteps = steps.filter((_, i) => i !== index);
      setSteps(remainingSteps);
      
      const segmentsForUpdate = remainingSteps.map(step => ({
        id: step.id,
        text: step.text,
        start_time: step.original_start_time || 0,
        end_time: step.original_start_time ? (step.original_start_time + 10) : 10,
        screenshot_path: step.imageUrl || null
      }));
      
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segmentsForUpdate }),
      });
      
      if (!response.ok) throw new Error('Failed to delete step');
    } catch (err) {
      console.error('Error removing step:', err);
      setError(`Failed to remove step: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      try {
        const refreshResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/segments`);
        if (refreshResponse.ok) {
          const segments = await refreshResponse.json();
          const refreshedSteps = segments.map(segment => ({
            id: segment.id,
            timestamp: formatTime(Number(segment.original_start_time)),
            text: segment.text,
            imageUrl: segment.screenshot_path || '',
            original_start_time: Number(segment.original_start_time)
          }));
          setSteps(refreshedSteps);
        }
      } catch (refreshError) {
        console.error("Failed to refresh steps after error:", refreshError);
      }
    }
  };

  const handleStepChange = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    if (field === 'timestamp') {
      const [minutes, seconds] = value.split(':').map(Number);
      newSteps[index].original_start_time = minutes * 60 + seconds;
    }
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < steps.length) {
      const temp = newSteps[index];
      newSteps[index] = newSteps[newIndex];
      newSteps[newIndex] = temp;
      setSteps(newSteps);
    }
  };

  const handleImageUpload = (index: number) => {
    setUploadingStepIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || uploadingStepIndex === null || !jobId) return;

    try {
      const formData = new FormData();
      formData.append('screenshot', file);

      const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/screenshots`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to upload image: ${response.status}`);

      const data = await response.json();
      console.log('[StepEditor] Upload response:', data);

      const newSteps = [...steps];
      const currentStep = newSteps[uploadingStepIndex];
      newSteps[uploadingStepIndex] = { ...currentStep, imageUrl: data.imageUrl };
      setSteps(newSteps);
      
      const segmentId = currentStep.id;
      const updateResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/update-segment-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, screenshotPath: data.imageUrl }),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[StepEditor] Failed to update segment screenshot in DB:', errorText);
        throw new Error(`Failed to update screenshot path in database: ${errorText}`);
      } else {
        console.log('[StepEditor] Successfully updated screenshot path in DB');
      }
      
      setError(null);
    } catch (error) {
      console.error('[StepEditor] Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingStepIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnnotationSave = async (dataUrl: string) => {
    if (!imageToAnnotate || !jobId) return;
    
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `annotation_${Date.now()}.png`, { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('screenshot', file);
      
      const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/screenshots`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error(`Failed to upload annotated image: ${response.status}`);
      
      const data = await response.json();
      console.log('[StepEditor] Annotation upload response:', data);
      
      const newSteps = [...steps];
      const currentStep = newSteps[imageToAnnotate.index];
      newSteps[imageToAnnotate.index] = { ...currentStep, imageUrl: data.imageUrl };
      setSteps(newSteps);
      
      const segmentId = currentStep.id;
      const updateResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/update-segment-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, screenshotPath: data.imageUrl }),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[StepEditor] Failed to update segment screenshot in DB:', errorText);
        throw new Error(`Failed to update screenshot path in database: ${errorText}`);
      } else {
        console.log('[StepEditor] Successfully updated screenshot path in DB');
      }
      
      setError(null);
    } catch (error) {
      console.error('[StepEditor] Error saving annotated image:', error);
      setError(error instanceof Error ? error.message : 'Failed to save annotated image');
    } finally {
      setImageToAnnotate(null);
    }
  };

  const handleAnnotateImage = (index: number) => {
    setImageToAnnotate({ url: steps[index].imageUrl, index });
  };

  const generateMarkdown = () => {
    let markdown = `---
title: ${documentTitle}
sidebar_label: ${documentTitle}
sidebar_position: 1
---

:::info
Generated on ${new Date().toLocaleString()}
:::

## Overview

This documentation was automatically generated from a video recording with voice narration.

## Full Transcript

${steps.map(step => step.text).join(' ')}

## Timestamped Steps
`;

    steps.forEach(step => {
      markdown += `\n### ${step.timestamp}\n`;
      if (step.imageUrl) markdown += `![Screenshot at ${step.timestamp}](${step.imageUrl})\n\n`;
      markdown += `${step.text}\n`;
    });

    return markdown;
  };

  const handleSave = async () => {
    if (!jobId) return;
    
    setSaveStatus('saving');
    try {
      console.log("[DEBUG] Saving document with steps:", steps);
      
      const segmentsForUpdate = steps.map((step, index) => ({
        id: step.id,
        text: step.text,
        start_time: step.original_start_time || 0,
        end_time: (steps[index + 1]?.original_start_time || (step.original_start_time || 0) + 10),
        screenshot_path: step.imageUrl || null
      }));
      
      console.log("[DEBUG] Updating segments:", segmentsForUpdate);
      
      const segmentsResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segmentsForUpdate }),
      });

      if (!segmentsResponse.ok) throw new Error('Failed to update segments');
      
      console.log("[DEBUG] Segments updated successfully");

      const markdown = generateMarkdown();
      const docResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });

      if (!docResponse.ok) throw new Error('Failed to save document');
      
      console.log("[DEBUG] Document saved successfully");
      
      if (onSave) onSave(markdown);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("[DEBUG] Save error:", err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save document');
    }
  };

  if (isLoading) {
    return <div className="text--center margin-vert--lg"><p>Loading...</p></div>;
  }

  if (error) {
    return <div className="alert alert--danger margin-vert--lg"><p>{error}</p></div>;
  }

  return (
    <div className="container margin-vert--lg">
      <div className="row margin-bottom--lg">
        <div className="col col--6">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="input"
            style={{ width: '100%', backgroundColor: '#1D1D1D', color: '#FFFFFF', border: '1px solid #3D3D3D', fontSize: '1.5rem', padding: '0.5rem' }}
            placeholder="Document Title"
          />
        </div>
        <div className="col col--6 text--right">
          <button onClick={handleAddStep} className="button button--primary margin-right--sm" style={{ backgroundColor: '#25c2a0' }}>
            <Plus className="margin-right--sm" size={16} /> Add Step
          </button>
          <button onClick={() => setShowVideoSelector(true)} className="button button--primary margin-right--sm" style={{ backgroundColor: '#25c2a0' }}>
            <Video className="margin-right--sm" size={16} /> Add Step from Video
          </button>
          <button onClick={handleSave} className="button button--success" disabled={saveStatus === 'saving'} style={{ backgroundColor: '#00a400' }}>
            <Save className="margin-right--sm" size={16} />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="markdown">
        {steps.map((step, index) => (
          <div key={index} className="card margin-bottom--lg" style={{ backgroundColor: '#2D2D2D', border: '1px solid #3D3D3D' }}>
            <div className="card__body">
              <div className="row margin-bottom--sm">
                <div className="col col--6">
                  <input
                    type="text"
                    value={step.timestamp}
                    onChange={(e) => handleStepChange(index, 'timestamp', e.target.value)}
                    className="input"
                    style={{ width: '120px', backgroundColor: '#1D1D1D', color: '#FFFFFF', border: '1px solid #3D3D3D' }}
                    placeholder="0:00"
                  />
                </div>
                <div className="col col--6 text--right">
                  {index > 0 && (
                    <button onClick={() => handleMoveStep(index, 'up')} className="button button--secondary button--sm margin-right--sm" style={{ backgroundColor: '#25c2a0', color: '#FFFFFF' }} title="Move Up">
                      <ArrowUp size={16} />
                    </button>
                  )}
                  {index < steps.length - 1 && (
                    <button onClick={() => handleMoveStep(index, 'down')} className="button button--secondary button--sm margin-right--sm" style={{ backgroundColor: '#25c2a0', color: '#FFFFFF' }} title="Move Down">
                      <ArrowDown size={16} />
                    </button>
                  )}
                  <button onClick={() => handleRemoveStep(index)} className="button button--danger button--sm" style={{ color: '#FFFFFF' }}>
                    <Trash2 className="margin-right--sm" size={16} /> Remove
                  </button>
                </div>
              </div>

              <div className="margin-bottom--sm">
                <CKEditor
                  editor={ClassicEditor}
                  data={step.text}
                  config={{ toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo'], placeholder: 'Enter step description...' }}
                  onChange={(event, editor) => handleStepChange(index, 'text', editor.getData())}
                />
              </div>

              {step.imageUrl ? (
                <div className="margin-top--sm">
                  <img
                    src={step.imageUrl}
                    alt={`Screenshot at ${step.timestamp}`}
                    style={{ maxWidth: '100%', height: 'auto' }}
                    className="shadow--md"
                    onError={(e) => console.error('Image failed to load:', step.imageUrl)}
                  />
                  <div className="flex gap-2 margin-top--sm">
                    <button onClick={() => handleImageUpload(index)} className="button button--secondary" style={{ borderColor: '#4D4D4D' }}>
                      <Upload className="margin-right--sm" size={16} /> Change Screenshot
                    </button>
                    <button onClick={() => handleAnnotateImage(index)} className="button button--primary" style={{ backgroundColor: '#25c2a0' }}>
                      <Edit className="margin-right--sm" size={16} /> Annotate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="margin-top--sm text--center padding--lg" style={{ border: '2px dashed #3D3D3D', borderRadius: '8px', backgroundColor: '#1D1D1D' }}>
                  <Upload size={48} style={{ color: '#4D4D4D' }} />
                  <p className="margin-top--sm" style={{ color: '#6D6D6D' }}>No image uploaded</p>
                  <button onClick={() => handleImageUpload(index)} className="button button--secondary margin-top--sm" style={{ borderColor: '#4D4D4D' }}>
                    <Upload className="margin-right--sm" size={16} /> Upload Screenshot
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showVideoSelector && (
        <VideoSegmentSelector
          documentId={documentId}
          onClose={() => setShowVideoSelector(false)}
          onStepCreate={(newStep) => {
            setSteps([...steps, newStep]);
            setShowVideoSelector(false);
          }}
        />
      )}

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      {imageToAnnotate && (
        <ImageAnnotator imageUrl={imageToAnnotate.url} onSave={handleAnnotationSave} onCancel={() => setImageToAnnotate(null)} />
      )}
    </div>
  );
};

export default StepEditor;