// client/src/components/SegmentReview/index.tsx
import React, { useState, useEffect } from 'react';
import { Check, X, Play, Merge, Loader, Clock, Edit } from 'lucide-react';
import config from '../../config';

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
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching segments for job ID:', jobId);
        
        // Fetch segments
        const segResponse = await fetch(`${config.apiUrl}/api/docs/${jobId}/segments`);
        if (!segResponse.ok) throw new Error(`Failed to fetch segments: ${segResponse.status}`);
        const segData = await segResponse.json();
        setSegments(segData);
        console.log('Segments loaded:', segData.length);

        // Fetch video URL
        const videoResponse = await fetch(`${config.apiUrl}/api/docs/${jobId}/videos`);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
        const videoData = await videoResponse.json();
        setVideoUrl(`${config.apiUrl}/video/${videoData.originalVideo.id}`);
        console.log('Video URL set:', `${config.apiUrl}/video/${videoData.originalVideo.id}`);
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
      const response = await fetch(`${config.apiUrl}/api/status/${jobId}`);
      
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

      const response = await fetch(`${config.apiUrl}/api/docs/${jobId}/finalize-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segments: segments.map(seg => ({
            text: seg.text,
            start_time: seg.original_start_time,
            end_time: seg.original_end_time,
            screenshot_path: seg.screenshot_path
          })),
        }),
        credentials: 'include'
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

  const previewSegment = (segment: Segment, index: number) => {
    setCurrentSegment(index);
    const video = document.getElementById('review-video') as HTMLVideoElement;
    if (video) {
      video.currentTime = segment.original_start_time;
      video.play();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-600 font-medium">Loading segments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex items-center">
          <X className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-700 font-medium">{processingMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100">
      {/* Header Section */}
      <div className="border-b border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800">Review Segments</h2>
        <p className="text-gray-600 mt-1">
          Review and edit the segments before generating documentation.
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Preview Section */}
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-gray-900 shadow-md">
              <video 
                id="review-video"
                src={videoUrl} 
                controls 
                className="w-full h-auto"
              />
            </div>
            
            <button 
              onClick={handleMergeSegments}
              disabled={selectedSegments.size < 2}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md font-medium
                ${selectedSegments.size < 2 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary-dark'}
                transition-colors
              `}
            >
              <Merge className="w-4 h-4" />
              Merge Selected ({selectedSegments.size})
            </button>
          </div>

          {/* Segments List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {segments.map((segment, index) => (
              <div 
                key={index}
                className={`
                  rounded-lg border transition-all duration-200
                  ${selectedSegments.has(index) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 bg-white hover:border-gray-300'}
                  ${currentSegment === index ? 'ring-2 ring-primary ring-opacity-50' : ''}
                  shadow-sm
                `}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                        {formatTime(segment.original_start_time)}
                      </span>
                      
                      {/* Time Duration Badge */}
                      <span className="ml-2 text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {Math.round(segment.original_end_time - segment.original_start_time)}s
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => previewSegment(segment, index)}
                        title="Preview segment"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      
                      <button
                        className={`
                          p-1.5 rounded-md transition-colors
                          ${selectedSegments.has(index) 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-500 hover:text-primary hover:bg-gray-100'}
                        `}
                        onClick={() => handleSegmentClick(index)}
                        title={selectedSegments.has(index) ? "Deselect" : "Select"}
                      >
                        {selectedSegments.has(index) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Edit className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-sm leading-relaxed">{segment.text}</p>
                </div>
              </div>
            ))}
            
            {segments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No segments found</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleFinalize}
            className="btn-primary flex items-center gap-2 py-3 px-6"
            disabled={isProcessing}
          >
            <Check className="w-5 h-5" />
            Finalize and Generate Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentReview;