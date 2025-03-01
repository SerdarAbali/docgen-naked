// client/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import VideoUpload from './components/VideoUpload';
import SegmentReview from './components/SegmentReview';
import DocumentationViewer from './pages/DocumentationViewer';
import DocEditor from './components/DocEditor';
import DocumentList from './pages/DocumentList';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Import the new page components
import Documentation from './pages/Documentation';
import ApiReference from './pages/ApiReference';
import Tutorials from './pages/Tutorials';
import HelpCenter from './pages/HelpCenter';

// Wrapper component that adds a key to force re-rendering
const KeyedDocViewer = () => {
  const location = useLocation();
  // Using the pathname as key will force re-render when the URL changes
  return <DocumentationViewer key={location.pathname} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="py-6 flex-grow">
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
            
            {/* Add new routes for footer links */}
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/api-reference" element={<ApiReference />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/help-center" element={<HelpCenter />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;