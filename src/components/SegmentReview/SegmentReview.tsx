import React from 'react';

const SegmentReview: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-navy mb-6">Review Your Documentation</h2>
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-navy mb-4">Segments</h3>
          <p className="text-gray-600">
            Review and edit the automatically generated segments for accuracy and clarity.
          </p>
          {/* Segment list and editing UI goes here */}
        </div>
      </div>
    </div>
  );
};

export default SegmentReview; 