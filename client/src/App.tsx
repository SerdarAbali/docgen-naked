// In client/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import VideoUpload from './components/VideoUpload';
import SegmentReview from './components/SegmentReview';
import DocumentationViewer from './pages/DocumentationViewer';
import DocEditor from './components/DocEditor'; // Add this import

// Wrapper component that adds a key to force re-rendering
const KeyedDocViewer = () => {
  const location = useLocation();
  // Using the pathname as key will force re-render when the URL changes
  return <DocumentationViewer key={location.pathname} />;
};

const App: React.FC = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VideoUpload />} />
          <Route 
            path="/review/:jobId" 
            element={
              <SegmentReview 
                jobId={window.location.pathname.split('/').pop() || ''}
                onComplete={() => {
                  console.log('Segment review completed');
                }}
              />
            } 
          />
          {/* Add the missing edit route */}
          <Route 
            path="/edit/:id" 
            element={<DocEditor documentId={window.location.pathname.split('/edit/').pop() || ''} />} 
          />
          {/* Using our wrapped component with automatic key */}
          <Route path="/documentation/generated/:id" element={<KeyedDocViewer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;