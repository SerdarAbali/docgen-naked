import React, { useState, useEffect, useRef } from 'react';
import { Video, Upload, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating real IDs

interface VideoInfo {
  id: string;
  filename: string;
  path: string;
}

interface Step {
  id: string;
  timestamp: string;
  text: string;
  imageUrl: string;
  original_start_time: number;
}

interface VideoSegmentSelectorProps {
  documentId: string;
  onClose: () => void;
  onStepCreate: (step: Step) => void;
}

const VideoSegmentSelector: React.FC<VideoSegmentSelectorProps> = ({
  documentId,
  onClose,
  onStepCreate,
}) => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [segmentEnd, setSegmentEnd] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobId, setJobId] = useState<string | null>(null); // Store jobId for backend calls

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load original video and job_id on component mount
  useEffect(() => {
    loadOriginalVideoAndJobId();
  }, []);

  // Reset segments when video changes
  useEffect(() => {
    if (videoRef.current) {
      setSegmentStart(null);
      setSegmentEnd(null);
      videoRef.current.load();
    }
  }, [videoInfo]);

  const loadOriginalVideoAndJobId = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const cleanDocId = documentId.replace(/\/$/, '').trim();
      const jobResponse = await fetch(`http://10.0.0.59:3001/api/docs/id/${cleanDocId}`);
      if (!jobResponse.ok) throw new Error('Failed to fetch job ID');
      const { jobId: fetchedJobId } = await jobResponse.json();
      console.log('[VideoSelector] Fetched job ID for doc_id:', documentId, '->', fetchedJobId);
      setJobId(fetchedJobId);

      const videoResponse = await fetch(`http://10.0.0.59:3001/api/docs/${fetchedJobId}/videos`);
      if (!videoResponse.ok) throw new Error('Failed to load video info');
      const videoData = await videoResponse.json();
      setVideoInfo(videoData.originalVideo);
    } catch (err) {
      console.error('[VideoSelector] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadNewVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', file.name);
      formData.append('documentId', documentId);

      const response = await fetch('http://10.0.0.59:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      setVideoInfo({
        id: data.jobId,
        filename: file.name,
        path: `/video/${data.jobId}`,
      });
    } catch (err) {
      console.error('[Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateStep = async () => {
    if (!videoInfo || segmentStart === null || segmentEnd === null || !jobId) {
      setError('Please select a video segment and ensure video is loaded');
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate a real UUID for the new step
      const newStepId = uuidv4();
      const newStepOriginalStartTime = segmentStart; // Use segmentStart as original_start_time

      // Generate screenshot using video-screenshot endpoint
      const screenshotResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/video-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoInfo.id,
          timestamp: segmentStart
        }),
      });

      if (!screenshotResponse.ok) {
        const errorText = await screenshotResponse.text();
        throw new Error(`Failed to generate screenshot: ${screenshotResponse.status} - ${errorText}`);
      }

      const screenshotData = await screenshotResponse.json();
      const imageUrl = screenshotData.imageUrl;

      // Save the new step to the backend immediately
      const segmentsResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segments: [{
            id: newStepId,
            text: `Video segment from ${formatTimestamp(segmentStart)} to ${formatTimestamp(segmentEnd)}`,
            start_time: newStepOriginalStartTime,
            end_time: segmentEnd,
            screenshot_path: imageUrl || null
          }]
        }),
      });

      if (!segmentsResponse.ok) {
        const errorText = await segmentsResponse.text();
        throw new Error(`Failed to update segments: ${errorText}`);
      }

      console.log("[VideoSelector] New step saved successfully to database");

      // Pass the new step to the parent (StepEditor)
      const newStep: Step = {
        id: newStepId,
        timestamp: formatTimestamp(segmentStart),
        text: `Video segment from ${formatTimestamp(segmentStart)} to ${formatTimestamp(segmentEnd)}`,
        imageUrl: imageUrl,
        original_start_time: newStepOriginalStartTime
      };
      
      onStepCreate(newStep);
      onClose();
    } catch (err) {
      console.error('[VideoSelector] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create step');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[var(--ifm-background-color)] rounded-lg p-6 max-w-4xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Step from Video</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            className="button button--secondary flex items-center justify-center gap-2"
            onClick={loadOriginalVideoAndJobId}
          >
            <Video size={24} />
            Use Original Video
          </button>
          <button
            className="button button--secondary flex items-center justify-center gap-2"
            onClick={triggerFileInput}
          >
            <Upload size={24} />
            Upload New Video
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="video/*"
            onChange={handleUploadNewVideo}
          />
        </div>

        {isLoading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {videoInfo && (
          <div className="mb-6">
            <video
              ref={videoRef}
              src={`http://10.0.0.59:3001/video/${videoInfo.id}`}
              controls
              style={{ width: '100%', maxHeight: '60vh' }}
            />
            <p className="mt-2">Playing: {videoInfo.filename}</p>
            <div className="mt-4 flex gap-4">
              <button
                className="button button--secondary"
                onClick={() => {
                  if (videoRef.current) {
                    setSegmentStart(videoRef.current.currentTime);
                    console.log('[Video] Set start time:', videoRef.current.currentTime);
                  }
                }}
                disabled={!videoRef.current}
              >
                {segmentStart !== null ? `Start (${formatTimestamp(segmentStart)})` : 'Start'}
              </button>
              <button
                className="button button--secondary"
                onClick={() => {
                  if (videoRef.current) {
                    setSegmentEnd(videoRef.current.currentTime);
                    console.log('[Video] Set end time:', videoRef.current.currentTime);
                  }
                }}
                disabled={!videoRef.current}
              >
                {segmentEnd !== null ? `End (${formatTimestamp(segmentEnd)})` : 'End'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          <button onClick={onClose} className="button button--secondary">
            Cancel
          </button>
          <button
            className="button button--primary"
            disabled={!videoInfo || segmentStart === null || segmentEnd === null}
            onClick={handleCreateStep}
          >
            Create Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoSegmentSelector;