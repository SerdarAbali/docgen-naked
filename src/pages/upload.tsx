import React from 'react';
import Layout from '@theme/Layout';
import VideoUpload from '../components/VideoUpload';

export default function Upload(): JSX.Element {
  return (
    <Layout
      title="Create Documentation"
      description="Upload videos to generate documentation"
      wrapperClassName="bg-gray-50 min-h-screen"
    >
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-navy mb-6">Create Documentation</h1>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-navy mb-4">Upload Video</h3>
              <p className="text-gray-600 mb-6">
                Upload a screen recording with voice narration to automatically generate professional documentation.
              </p>
              <VideoUpload />
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
