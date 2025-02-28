// client/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import VideoUpload from './components/VideoUpload';
import SegmentReview from './components/SegmentReview';
import DocumentationViewer from './pages/DocumentationViewer';
import DocEditor from './components/DocEditor';
import DocumentList from './pages/DocumentList';
import Navbar from './components/Navbar'; // Fixed path - no /index

// Wrapper component that adds a key to force re-rendering
const KeyedDocViewer = () => {
  const location = useLocation();
  // Using the pathname as key will force re-render when the URL changes
  return <DocumentationViewer key={location.pathname} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="py-6">
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
            <Route 
              path="/edit/:id" 
              element={<DocEditor documentId={window.location.pathname.split('/edit/').pop() || ''} />} 
            />
            <Route path="/documents" element={<DocumentList />} />
            <Route path="/documentation/generated/:id" element={<KeyedDocViewer />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;