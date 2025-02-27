//docgen/src/components/VideoUpload/index.tsx
import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import SegmentReview from '../SegmentReview';

interface UploadStatus {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'extracting_audio' | 'generating_screenshots' | 
          'transcribing' | 'awaiting_review' | 'completed' | 'error' | 'success';
  message?: string;
}

export default function VideoUpload(): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    progress: 0,
    status: 'idle'
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setUploadStatus({ progress: 0, status: 'idle' });
    
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please upload a video file');
      setFile(null);
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size should be less than 100MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const checkStatus = async (currentJobId: string) => {
    try {
      console.log('Checking status for:', currentJobId);
      const statusResponse = await fetch(
        `http://10.0.0.59:3001/api/status/${currentJobId}`
      );
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      const status = await statusResponse.json();
      console.log('Status response:', status);
      
      switch(status.status) {
        case 'extracting_audio':
          setUploadStatus({
            progress: 33,
            status: 'extracting_audio',
            message: status.error || 'Extracting audio from video...'
          });
          setTimeout(() => checkStatus(currentJobId), 2000);
          break;
        
        case 'generating_screenshots':
          setUploadStatus({
            progress: 66,
            status: 'generating_screenshots',
            message: status.error || 'Generating screenshots...'
          });
          setTimeout(() => checkStatus(currentJobId), 2000);
          break;

        case 'transcribing':
          const match = status.error?.match(/Whisper:.*?\((\d+)%\)/);
          const whisperProgress = match ? parseInt(match[1]) : 0;
          setUploadStatus({
            progress: 70 + (whisperProgress * 0.3),
            status: 'transcribing',
            message: status.error || 'Transcribing audio...'
          });
          setTimeout(() => checkStatus(currentJobId), 2000);
          break;

        case 'awaiting_review':
          setUploadStatus({
            progress: 90,
            status: 'awaiting_review',
            message: 'Please review the segments before continuing'
          });
          break;
        
        case 'completed':
          console.log('Documentation completed, preparing redirect...');
          setUploadStatus({
            progress: 100,
            status: 'success',
            message: 'Processing completed! Preparing documentation...'
          });

          // Add a check for document availability before redirect
          const checkDocumentAndRedirect = async () => {
            try {
              const docResponse = await fetch(`http://10.0.0.59:3001/api/docs/${currentJobId}`);
              if (docResponse.ok) {
                window.location.href = `/documentation/generated/${currentJobId}`;
              } else {
                console.log('Document not ready yet, retrying...');
                setTimeout(checkDocumentAndRedirect, 500);
              }
            } catch (error) {
              console.error('Error checking document:', error);
              setTimeout(checkDocumentAndRedirect, 500);
            }
          };

          // Start checking after initial delay
          setTimeout(checkDocumentAndRedirect, 1000);
          break;
        
        case 'failed':
          setUploadStatus({
            progress: 0,
            status: 'error',
            message: status.error || 'Processing failed'
          });
          break;
        
        default:
          setUploadStatus({
            progress: 25,
            status: 'processing',
            message: status.error || 'Processing video...'
          });
          setTimeout(() => checkStatus(currentJobId), 2000);
          break;
      }
    } catch (error) {
      console.error('Status check error:', error);
      setUploadStatus({
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Status check failed'
      });
    }
  };

  const uploadFile = useCallback(async () => {
    if (!file) return;

    try {
      setUploadStatus({ progress: 0, status: 'uploading' });
      
      const formData = new FormData();
      formData.append('video', file);
      
      const documentTitle = title.trim() || file.name.replace(/\.[^/.]+$/, '');
      formData.append('title', documentTitle);

      console.log('Starting upload...');
      const response = await fetch('http://10.0.0.59:3001/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Upload response:', data);
      setJobId(data.jobId);

      setUploadStatus({
        progress: 25,
        status: 'processing',
        message: 'Processing video...'
      });

      checkStatus(data.jobId);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }, [file, title]);

  const handleReviewComplete = () => {
    if (jobId) {
      setUploadStatus({
        progress: 95,
        status: 'processing',
        message: 'Finalizing documentation...'
      });
      checkStatus(jobId);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="alert alert--danger p-4 rounded-lg shadow-md">
          <p>{error}</p>
        </div>
      )}
      
      <div
        className={`
          rounded-lg shadow-md p-6 bg-[var(--ifm-background-surface-color)]
          transition-all duration-300
          ${isDragging ? 'ring-2 ring-[var(--ifm-color-primary)] bg-[var(--ifm-background-color)]' : 'ring-1 ring-[var(--ifm-color-primary-light)]'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-10 w-10 text-[var(--ifm-color-primary)]" />
          <div className="w-full max-w-md">
            <input 
              type="text"
              placeholder="Enter documentation title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-box w-full"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--ifm-font-color-base)]">
              {file ? file.name : 'Drop your video here or'}
            </p>
            {!file && (
              <label className="mt-2 inline-flex cursor-pointer items-center">
                <span className="button button--primary text-sm px-4 py-2">
                  Select File
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleFileInput}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-[var(--ifm-font-color-base)] opacity-70">
            Max file size: 100MB • Supports all video formats
          </p>
        </div>

        {uploadStatus.status !== 'idle' && uploadStatus.status !== 'awaiting_review' && (
          <div className="mt-6">
            <div className="h-2 w-full bg-[var(--ifm-background-color)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--ifm-color-primary)] transition-all duration-300 ease-in-out"
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-center">
              <span className={uploadStatus.status === 'error' ? 'text-red-500' : 'text-[var(--ifm-font-color-base)]'}>
                {uploadStatus.message}
              </span>
            </div>
          </div>
        )}
      </div>

      {file && uploadStatus.status === 'idle' && (
        <button 
          className="button button--primary button--lg w-full shadow-md hover:bg-[var(--ifm-color-primary-dark)] transition-colors duration-200"
          onClick={uploadFile}
        >
          Start Processing
        </button>
      )}

      {uploadStatus.status === 'awaiting_review' && jobId && (
        <SegmentReview 
          jobId={jobId} 
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}