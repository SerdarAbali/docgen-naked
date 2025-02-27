import React, { useState, useEffect } from 'react';
import { Check, X, Play, Merge, Loader } from 'lucide-react';
import './SegmentReview.css';

interface Segment {
  id: string;
  text: string;
  original_start_time: number;
  original_end_time: number;
  screenshot_path?: string;
}

interface SegmentReviewProps {
  jobId: string;
  onComplete: () => void;
}

const SegmentReview: React.FC<SegmentReviewProps> = ({ jobId, onComplete }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState(new Set<number>());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing...');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching segments for job ID:', jobId);
        
        // Fetch segments
        const segResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/segments`);
        if (!segResponse.ok) throw new Error(`Failed to fetch segments: ${segResponse.status}`);
        const segData = await segResponse.json();
        setSegments(segData);
        console.log('Segments loaded:', segData.length);

        // Fetch video URL
        const videoResponse = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/videos`);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
        const videoData = await videoResponse.json();
        setVideoUrl(`http://10.0.0.59:3001/video/${videoData.originalVideo.id}`);
        console.log('Video URL set:', `http://10.0.0.59:3001/video/${videoData.originalVideo.id}`);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMergeSegments = () => {
    const selectedArray = Array.from(selectedSegments).sort((a, b) => a - b);
    if (selectedArray.length < 2) return;

    const firstIndex = selectedArray[0];
    const lastIndex = selectedArray[selectedArray.length - 1];

    const newSegments = segments.filter((_, index) => !selectedSegments.has(index));
    const mergedSegment = {
      id: segments[firstIndex].id,
      text: segments
        .filter((_, index) => selectedSegments.has(index))
        .map(seg => seg.text)
        .join(' '),
      original_start_time: segments[firstIndex].original_start_time,
      original_end_time: segments[lastIndex].original_end_time,
      screenshot_path: segments[firstIndex].screenshot_path
    };

    newSegments.splice(firstIndex, 0, mergedSegment);
    setSegments(newSegments);
    setSelectedSegments(new Set());
  };

  const handleSegmentClick = (index: number) => {
    const newSelected = new Set(selectedSegments);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSegments(newSelected);
  };

  const handlePlaySegment = (segment: Segment) => {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.currentTime = segment.original_start_time;
      videoElement.play();
      setTimeout(() => {
        videoElement.pause();
      }, (segment.original_end_time - segment.original_start_time) * 1000);
    }
  };

  const checkProcessingStatus = async () => {
    try {
      console.log('Checking processing status for job:', jobId);
      const response = await fetch(`http://10.0.0.59:3001/api/status/${jobId}`);
      
      if (!response.ok) {
        console.error('Status check failed:', response.status);
        throw new Error('Failed to check status');
      }
      
      const status = await response.json();
      console.log('Status response:', status);

      if (status.status === 'completed') {
        console.log('Processing completed, redirecting...');
        // Use a slight delay to ensure the backend has fully processed everything
        setTimeout(() => {
          window.location.href = `/documentation/generated/${jobId}`;
        }, 1000);
        return;
      }

      // Update processing message based on status
      setProcessingMessage(status.error || 'Generating documentation...');
      setTimeout(checkProcessingStatus, 1000);
    } catch (error) {
      console.error('Status check error:', error);
      setTimeout(checkProcessingStatus, 2000); // Longer delay on error
    }
  };

  const handleFinalize = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingMessage('Finalizing segments...');
      
      console.log('Finalizing segments for job:', jobId);
      console.log('Sending segments to backend:', segments);

      const response = await fetch(`http://10.0.0.59:3001/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segments: segments.map(seg => ({
            text: seg.text,
            start_time: seg.original_start_time,
            end_time: seg.original_end_time,
            screenshot_path: seg.screenshot_path  // Make sure to include this!
          })),
        }),
        credentials: 'include'  // Include credentials
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to finalize segments:', errorText);
        throw new Error(`Failed to finalize segments: ${response.status}`);
      }
      
      console.log('Segments finalized successfully');
      
      // Start checking processing status
      checkProcessingStatus();
    } catch (err) {
      console.error('Finalize error:', err);
      setError(err instanceof Error ? err.message : 'Failed to finalize segments');
      setIsProcessing(false);
    }
  };

  const previewSegment = (segment: Segment) => {
    const video = document.getElementById('review-video') as HTMLVideoElement;
    if (video) {
      video.currentTime = segment.original_start_time;
      video.play();
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Loader className="animate-spin" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--danger p-4 rounded-lg shadow-md">
        <p>{error}</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="text-center p-4">
        <Loader className="animate-spin" />
        <p>{processingMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg shadow-md p-6 bg-[var(--ifm-background-surface-color)]">
        <h2 className="text-2xl font-bold mb-4">Review Segments</h2>
        <p className="text-[var(--ifm-font-color-base)] opacity-70 mb-6">
          Review and edit the segments before generating documentation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <video 
              id="review-video"
              src={videoUrl} 
              controls 
              className="w-full mb-4 rounded-lg"
            />
            
            <button 
              onClick={handleMergeSegments}
              disabled={selectedSegments.size < 2}
              className="button button--primary flex items-center gap-2"
            >
              <Merge className="w-4 h-4" />
              Merge Selected
            </button>
          </div>

          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div 
                key={index}
                className={`
                  rounded-lg shadow-md p-4 bg-[var(--ifm-background-surface-color)]
                  transition-all duration-200
                  ${selectedSegments.has(index) ? 'ring-2 ring-[var(--ifm-color-primary)]' : 'ring-1 ring-[var(--ifm-color-primary-light)]'}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-mono bg-[var(--ifm-background-color)] px-2 py-1 rounded">
                    {formatTime(segment.original_start_time)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="button button--secondary button--sm"
                      onClick={() => handlePlaySegment(segment)}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      className="button button--secondary button--sm"
                      onClick={() => handleSegmentClick(index)}
                    >
                      {selectedSegments.has(index) ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      className="button button--secondary"
                      onClick={() => previewSegment(segment)}
                    >
                      <Play size={16} /> Preview
                    </button>
                  </div>
                </div>
                <p className="text-[var(--ifm-font-color-base)]">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleFinalize}
            className="button button--primary button--lg flex items-center gap-2"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Finalize and Generate Documentation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentReview;