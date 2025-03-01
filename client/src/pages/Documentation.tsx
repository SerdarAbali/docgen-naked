import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Code, HelpCircle, ArrowRight } from 'lucide-react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">documentit Documentation</h1>
        <p className="text-lg text-gray-600">
          Complete guide to using documentit for automatic documentation generation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Getting Started</h2>
          <p className="text-gray-600 mb-4">
            documentit helps you automatically generate documentation from video content using AI-powered transcription.
            Learn how to create your first document.
          </p>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Upload a Video</h3>
                <p className="text-sm text-gray-600">
                  Upload any video file (up to 100MB) to start the documentation process.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Review Segments</h3>
                <p className="text-sm text-gray-600">
                  AI transcribes your video and segments it into logical steps.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Edit and Export</h3>
                <p className="text-sm text-gray-600">
                  Edit steps, add screenshots, organize content, and export in various formats.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Features</h2>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">AI-Powered Transcription</h3>
                <p className="text-sm text-gray-600">
                  Automatically transcribe voice narration from videos using Whisper AI.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Step Organization</h3>
                <p className="text-sm text-gray-600">
                  Add titles, reorder steps with drag-and-drop, and organize content.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Categories & Organization</h3>
                <p className="text-sm text-gray-600">
                  Organize documentation with categories and searchable library.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary/10 p-1 rounded mr-3 mt-0.5">
                <FileText size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Image Annotation</h3>
                <p className="text-sm text-gray-600">
                  Add screenshots and annotate them with shapes, text, and highlights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Documentation Topics</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Video Processing</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Supported video formats</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Video size limitations</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Audio extraction process</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Transcription accuracy</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Content Management</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Organizing documentation</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Using categories</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Step editing and reordering</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Managing screenshots</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Exporting & Publishing</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Export to Markdown</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Export to HTML</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Export to PDF</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">GitHub integration</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Advanced Features</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Image annotation</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Rich text editing</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">Batch operations</span>
              </li>
              <li className="flex items-center">
                <ArrowRight size={14} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-gray-600">API integration</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Related Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/api-reference" 
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <Code className="text-primary mr-3" size={20} />
            <span className="font-medium text-gray-800">API Reference</span>
          </Link>
          <Link 
            to="/tutorials" 
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <BookOpen className="text-primary mr-3" size={20} />
            <span className="font-medium text-gray-800">Tutorials</span>
          </Link>
          <Link 
            to="/help-center" 
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <HelpCircle className="text-primary mr-3" size={20} />
            <span className="font-medium text-gray-800">Help Center</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Documentation;