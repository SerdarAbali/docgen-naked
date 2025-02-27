import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Trash2, Upload, Video, ArrowUp, ArrowDown } from 'lucide-react';
import VideoSegmentSelector from '../VideoSegmentSelector';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating real IDs
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface Step {
  id?: string;
  timestamp: string;
  text: string;
  imageUrl: string;
  original_start_time?: number;
}

interface StepEditorProps {
  documentId: string;
  onSave?: (newContent: string) => void; // Optional callback for saving content
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

  // Helper function to format time
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
        
        // First get job_id
        const idResponse = await fetch(`http://10.0.0.59:3001/api/docs/id/${cleanDocId}`);
        if (!idResponse.ok) throw new Error('Failed to get job ID');
        const { jobId: fetchedJobId } = await idResponse.json();
        console.log("[DEBUG] Got job ID:", fetchedJobId);
        setJobId(fetchedJobId);

        // Get document content to extract title
        const docResponse = await fetch(`http://10.0.0.59:3001/api/docs/${fetchedJobId}`);
        if (!docResponse.ok) throw new Error('Failed to load document');
        const docData = await docResponse.json();
        
        // Extract title from frontmatter
        const titleMatch = docData.content.match(/title:\s*([^\n]+)/);
        if (titleMatch) {
          setDocumentTitle(titleMatch[1].trim());
        }

        // Get segments
        const segmentsResponse = await fetch(`http://10.0.0.59:3001/api/docs/${fetchedJobId}/segments`);
        if (!segmentsResponse.ok) throw new Error('Failed to load segments');
        const segments = await segmentsResponse.json();
        console.log("[DEBUG] Loaded segments:", segments);

        // Convert segments to steps, using the actual screenshot_path if available
        const convertedSteps = segments.map(segment => ({
          id: segment.id,
          timestamp: formatTime(Number(segment.original_start_time)),
          text: segment.text,
          imageUrl: segment.screenshot_path || '', // Use the actual screenshot_path from the database
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
      id: uuidv4(), // Use a real UUID for new steps
      timestamp: '0:00',
      text: '',
      imageUrl: '',
      original_start_time: 0
    };

    // Immediately save the new step to the backend
    if (jobId) {
      try {
        const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            segments: [{
              text: newStep.text,
              start_time: newStep.original_start_time,
              end_time: newStep.original_start_time + 10,
              screenshot_path: newStep.imageUrl || null
            }]
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add new step to database');
        }

        console.log("[DEBUG] New step added successfully to database");
      } catch (err) {
        console.error("[DEBUG] Error adding new step:", err);
        setError(err instanceof Error ? err.message : 'Failed to add new step');
        return; // Stop if the backend call fails
      }
    }

    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    if (field === 'timestamp') {
      // Convert timestamp to seconds for original_start_time
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

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status}`);
      }

      const data = await response.json();
      console.log('[StepEditor] Upload response:', data);

      const newSteps = [...steps];
      const currentStep = newSteps[uploadingStepIndex];

      // Ensure the step has a valid UUID (no temporary IDs)
      if (!currentStep.id) {
        currentStep.id = uuidv4(); // Generate a real UUID if missing
      }

      newSteps[uploadingStepIndex] = {
        ...currentStep,
        imageUrl: data.imageUrl
      };
      setSteps(newSteps);
      
      // Update the screenshot_path in the database
      try {
        const segmentId = currentStep.id; // Use the real UUID
        const updateResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/update-segment-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            segmentId: segmentId,
            screenshotPath: data.imageUrl
          }),
        });
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('[StepEditor] Failed to update segment screenshot in DB:', errorText);
          throw new Error(`Failed to update screenshot path in database: ${errorText}`);
        } else {
          console.log('[StepEditor] Successfully updated screenshot path in DB');
          const updateResult = await updateResponse.json();
          if (updateResult.segment && updateResult.segment.id) {
            // Update the step ID if the backend returns a different ID (though it should match)
            newSteps[uploadingStepIndex].id = updateResult.segment.id;
            setSteps(newSteps);
          }
        }
      } catch (dbError) {
        console.error('[StepEditor] Error updating screenshot path in DB:', dbError);
        throw dbError;
      }
      
      setError(null);
    } catch (error) {
      console.error('[StepEditor] Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingStepIndex(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      if (step.imageUrl) {
        markdown += `![Screenshot at ${step.timestamp}](${step.imageUrl})\n\n`;
      }
      markdown += `${step.text}\n`;
    });

    return markdown;
  };

  const handleSave = async () => {
    if (!jobId) return;
    
    setSaveStatus('saving');
    try {
      console.log("[DEBUG] Saving document with steps:", steps);
      
      // Save segments with screenshot paths
      const segmentsForUpdate = steps.map((step, index) => ({
        text: step.text,
        start_time: step.original_start_time,
        end_time: (steps[index + 1]?.original_start_time || step.original_start_time + 10),
        screenshot_path: step.imageUrl || null // Include the image URL if it exists
      }));
      
      console.log("[DEBUG] Updating segments:", segmentsForUpdate);
      
      const segmentsResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segmentsForUpdate }),
      });

      if (!segmentsResponse.ok) {
        throw new Error('Failed to update segments');
      }
      
      console.log("[DEBUG] Segments updated successfully");

      // Then save markdown
      const markdown = generateMarkdown();
      const docResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });

      if (!docResponse.ok) throw new Error('Failed to save document');
      
      console.log("[DEBUG] Document saved successfully");
      
      // Notify parent component (DocEditor) of the saved content
      if (onSave) {
        onSave(markdown);
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("[DEBUG] Save error:", err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save document');
    }
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
    <div className="container margin-vert--lg">
      <div className="row margin-bottom--lg">
        <div className="col col--6">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="input"
            style={{ 
              width: '100%',
              backgroundColor: '#1D1D1D',
              color: '#FFFFFF',
              border: '1px solid #3D3D3D',
              fontSize: '1.5rem',
              padding: '0.5rem'
            }}
            placeholder="Document Title"
          />
        </div>
        <div className="col col--6 text--right">
          <button
            onClick={handleAddStep}
            className="button button--primary margin-right--sm"
            style={{ backgroundColor: '#25c2a0' }}
          >
            <Plus className="margin-right--sm" size={16} />
            Add Step
          </button>
          <button
            onClick={() => setShowVideoSelector(true)}
            className="button button--primary margin-right--sm"
            style={{ backgroundColor: '#25c2a0' }}
          >
            <Video className="margin-right--sm" size={16} />
            Add Step from Video
          </button>
          <button
            onClick={handleSave}
            className="button button--success"
            disabled={saveStatus === 'saving'}
            style={{ backgroundColor: '#00a400' }}
          >
            <Save className="margin-right--sm" size={16} />
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'saved' ? 'Saved!' : 
             saveStatus === 'error' ? 'Error!' : 
             'Save Changes'}
          </button>
        </div>
      </div>

      <div className="markdown">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="card margin-bottom--lg"
            style={{ backgroundColor: '#2D2D2D', border: '1px solid #3D3D3D' }}
          >
            <div className="card__body">
              <div className="row margin-bottom--sm">
                <div className="col col--6">
                  <input
                    type="text"
                    value={step.timestamp}
                    onChange={(e) => handleStepChange(index, 'timestamp', e.target.value)}
                    className="input"
                    style={{ 
                      width: '120px',
                      backgroundColor: '#1D1D1D',
                      color: '#FFFFFF',
                      border: '1px solid #3D3D3D'
                    }}
                    placeholder="0:00"
                  />
                </div>
                <div className="col col--6 text--right">
                  {index > 0 && (
                    <button
                      onClick={() => handleMoveStep(index, 'up')}
                      className="button button--secondary button--sm margin-right--sm"
                      style={{ 
                        backgroundColor: '#25c2a0',
                        color: '#FFFFFF'
                      }}
                      title="Move Up"
                    >
                      <ArrowUp size={16} />
                    </button>
                  )}
                  {index < steps.length - 1 && (
                    <button
                      onClick={() => handleMoveStep(index, 'down')}
                      className="button button--secondary button--sm margin-right--sm"
                      style={{ 
                        backgroundColor: '#25c2a0',
                        color: '#FFFFFF'
                      }}
                      title="Move Down"
                    >
                      <ArrowDown size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveStep(index)}
                    className="button button--danger button--sm"
                    style={{ color: '#FFFFFF' }}
                  >
                    <Trash2 className="margin-right--sm" size={16} />
                    Remove
                  </button>
                </div>
              </div>

              {/* Replace textarea with CKEditor */}
              <div className="margin-bottom--sm">
                <CKEditor
                  editor={ClassicEditor}
                  data={step.text}
                  config={{
                    toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
                    placeholder: 'Enter step description...'
                  }}
                  onChange={(event, editor) => {
                    const data = editor.getData();
                    handleStepChange(index, 'text', data);
                  }}
                />
              </div>

              {step.imageUrl ? (
                <div className="margin-top--sm">
                  <img
                    src={step.imageUrl}
                    alt={`Screenshot at ${step.timestamp}`}
                    style={{ maxWidth: '100%', height: 'auto' }}
                    className="shadow--md"
                    onError={(e) => console.error('Image failed to load:', e)}
                  />
                  <button
                    onClick={() => handleImageUpload(index)}
                    className="button button--secondary margin-top--sm"
                    style={{ borderColor: '#4D4D4D' }}
                  >
                    <Upload className="margin-right--sm" size={16} />
                    Change Screenshot
                  </button>
                </div>
              ) : (
                <div 
                  className="margin-top--sm text--center padding--lg"
                  style={{ 
                    border: '2px dashed #3D3D3D',
                    borderRadius: '8px',
                    backgroundColor: '#1D1D1D'
                  }}
                >
                  <Upload size={48} style={{ color: '#4D4D4D' }} />
                  <p className="margin-top--sm" style={{ color: '#6D6D6D' }}>No image uploaded</p>
                  <button
                    onClick={() => handleImageUpload(index)}
                    className="button button--secondary margin-top--sm"
                    style={{ borderColor: '#4D4D4D' }}
                  >
                    <Upload className="margin-right--sm" size={16} />
                    Upload Screenshot
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
            setSteps([...steps, newStep]); // Add the new step with its id, timestamp, text, imageUrl, and original_start_time
            setShowVideoSelector(false);
          }}
        />
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default StepEditor;