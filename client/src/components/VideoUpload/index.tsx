// client/src/components/VideoUpload/index.tsx
import React, { useState, useCallback } from 'react';
import { Upload, Check, X, Film, Clock, Loader } from 'lucide-react';
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

  // Helper function to determine progress bar color
  const getProgressBarColor = () => {
    if (uploadStatus.status === 'error') return 'bg-red-500';
    if (uploadStatus.status === 'success') return 'bg-green-500';
    return 'bg-primary';
  };

  // Helper function for status icon
  const renderStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'uploading':
      case 'processing':
      case 'extracting_audio':
      case 'generating_screenshots':
      case 'transcribing':
        return <Loader className="w-5 h-5 text-primary animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">DocGen</h1>
        <p className="text-gray-600">Upload a video to automatically generate documentation</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div
        className={`
          bg-white rounded-lg border-2 ${isDragging ? 'border-primary border-dashed' : 'border-gray-200'} 
          transition-all duration-300 p-8 mb-6 shadow-card
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-6">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${isDragging ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}
            transition-colors duration-300
          `}>
            <Upload className="w-10 h-10" />
          </div>
          
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documentation Title
            </label>
            <input 
              type="text"
              placeholder="Enter documentation title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>
          
          <div className="text-center">
            {file ? (
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <Film className="w-5 h-5 text-primary" />
                <span className="text-gray-800 font-medium">{file.name}</span>
                <button 
                  onClick={() => setFile(null)} 
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500">Drag your video here or</p>
                <label className="btn-primary inline-flex cursor-pointer">
                  <span>Select Video</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileInput}
                  />
                </label>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500">
            Max file size: 100MB • Supports all video formats
          </p>
        </div>

        {uploadStatus.status !== 'idle' && uploadStatus.status !== 'awaiting_review' && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-2">
              {renderStatusIcon()}
              <span className={`text-sm font-medium ${uploadStatus.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                {uploadStatus.message}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor()} transition-all duration-300 ease-in-out`}
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {file && uploadStatus.status === 'idle' && (
        <button 
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          onClick={uploadFile}
        >
          <Upload className="w-5 h-5" />
          Start Processing
        </button>
      )}

      {uploadStatus.status === 'awaiting_review' && jobId && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Segments</h2>
          <SegmentReview 
            jobId={jobId} 
            onComplete={handleReviewComplete}
          />
        </div>
      )}
    </div>
  );
}