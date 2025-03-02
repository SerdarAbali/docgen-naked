import React from 'react';

const ApiReference: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">API Reference</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="mb-4">
          documentit provides a RESTful API that allows you to programmatically generate documentation from video content.
          All API requests should be made to the base URL: <code className="bg-gray-100 px-1 py-0.5 rounded">https://api.documentit.io</code>
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 mb-4">
          <p>All requests that modify data require appropriate authentication.</p>
        </div>
      </div>

      {/* Document Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4" id="document-endpoints">Document Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/docs/list</span>
            </h3>
            <p className="mb-2">Returns a list of all documents in the system.</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "job_id": "uuid",
    "title": "Document Title",
    "created_at": "2023-04-15T09:00:00Z",
    "updated_at": "2023-04-15T09:00:00Z",
    "status": "completed",
    "category": {
      "id": "uuid",
      "name": "Category Name"
    }
  },
  ...
]`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/docs/:jobId</span>
            </h3>
            <p className="mb-2">Returns a specific document with all its steps.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "title": "Document Title",
  "content": "Markdown content...",
  "steps": [
    {
      "id": "uuid",
      "title": "Step Title",
      "timestamp": "1:05",
      "text": "Step text content...",
      "imageUrl": "/img/jobId/screenshot.jpg",
      "order": 0,
      "original_start_time": 65
    },
    ...
  ],
  "category": {
    "id": "uuid", 
    "name": "Category Name"
  }
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">PUT</span>
              <span>/api/docs/:jobId</span>
            </h3>
            <p className="mb-2">Updates a document's content and/or category.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "content": "Updated markdown content...",
  "categoryId": "uuid" // Optional, set to null to remove category
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "content": "...",
    "updated_at": "2023-04-15T10:30:00Z",
    "category": {
      "id": "uuid",
      "name": "Category Name"
    }
  }
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-mono mr-2">DELETE</span>
              <span>/api/docs/:jobId</span>
            </h3>
            <p className="mb-2">Deletes a document and all associated resources.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "message": "Document deleted successfully"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Upload Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4" id="upload-endpoints">Upload Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">POST</span>
              <span>/api/upload</span>
            </h3>
            <p className="mb-2">Uploads and processes a video file to generate documentation.</p>
            <h4 className="font-medium mt-4 mb-2">Request</h4>
            <p className="mb-2">This endpoint expects a <code className="font-mono">multipart/form-data</code> request with the following fields:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 mb-4 text-sm">
              <li><code className="font-mono">video</code> - The video file (required)</li>
              <li><code className="font-mono">title</code> - The documentation title (optional)</li>
              <li><code className="font-mono">categoryId</code> - The category UUID (optional)</li>
              <li><code className="font-mono">documentId</code> - For appending to existing document (optional)</li>
              <li><code className="font-mono">startTime</code> - Start time in seconds (optional)</li>
              <li><code className="font-mono">endTime</code> - End time in seconds (optional)</li>
            </ul>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "jobId": "uuid"
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">POST</span>
              <span>/api/docs/:documentId/screenshots</span>
            </h3>
            <p className="mb-2">Uploads a screenshot for a specific document.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">documentId</code> - The UUID of the document</p>
            <h4 className="font-medium mt-4 mb-2">Request</h4>
            <p className="mb-2">This endpoint expects a <code className="font-mono">multipart/form-data</code> request with the following field:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 mb-4 text-sm">
              <li><code className="font-mono">screenshot</code> - The image file (required)</li>
            </ul>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "imageUrl": "/img/{jobId}/screenshot_{timestamp}.jpg",
  "message": "Screenshot uploaded successfully"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Steps & Segments Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4" id="step-endpoints">Steps & Segments Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/docs/:jobId/segments</span>
            </h3>
            <p className="mb-2">Returns all segments (steps) for a document.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "segment_index": 0,
    "title": "Step Title",
    "text": "Step content...",
    "original_start_time": 65.5,
    "original_end_time": 92.3,
    "needs_review": false,
    "screenshot_path": "/img/{jobId}/screenshot.jpg"
  },
  ...
]`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">POST</span>
              <span>/api/docs/:jobId/finalize-segments</span>
            </h3>
            <p className="mb-2">Updates all segments for a document in a single operation.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "segments": [
    {
      "id": "uuid",
      "title": "Step Title",
      "text": "Step content...",
      "start_time": 65.5,
      "end_time": 92.3,
      "screenshot_path": "/img/{jobId}/screenshot.jpg",
      "order": 0
    },
    ...
  ]
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">POST</span>
              <span>/api/docs/:docId/steps/reorder</span>
            </h3>
            <p className="mb-2">Updates the order of steps in a document.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">docId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "steps": [
    {
      "id": "uuid",
      "order": 0
    },
    {
      "id": "uuid",
      "order": 1
    },
    ...
  ]
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "message": "Steps reordered successfully"
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">PUT</span>
              <span>/api/docs/:docId/steps/:stepId</span>
            </h3>
            <p className="mb-2">Updates a single step in a document.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">docId</code> - The UUID of the document's job</p>
            <p className="mb-1"><code className="font-mono">stepId</code> - The UUID of the step</p>
            <h4 className="font-medium mt-4 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "title": "Updated Step Title",
  "text": "Updated step content..."
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "step": {
    "id": "uuid",
    "segment_index": 0,
    "title": "Updated Step Title",
    "text": "Updated step content...",
    "original_start_time": 65.5,
    "original_end_time": 92.3,
    "needs_review": false,
    "screenshot_path": "/img/{jobId}/screenshot.jpg",
    "updated_at": "2023-04-15T15:30:00Z"
  },
  "message": "Step updated successfully"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Category Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4" id="category-endpoints">Category Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/categories</span>
            </h3>
            <p className="mb-2">Returns a list of all categories.</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "name": "Category Name",
    "created_at": "2023-04-15T09:00:00Z"
  },
  ...
]`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-mono mr-2">POST</span>
              <span>/api/categories</span>
            </h3>
            <p className="mb-2">Creates a new category or returns an existing one with the same name.</p>
            <h4 className="font-medium mt-4 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "name": "Category Name"
}`}
            </pre>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "id": "uuid",
  "name": "Category Name",
  "created_at": "2023-04-15T10:30:00Z"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Export Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4" id="export-endpoints">Export Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/docs/:jobId/export</span>
            </h3>
            <p className="mb-2">Exports a document in the specified format.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the document's job</p>
            <h4 className="font-medium mt-4 mb-2">Query Parameters</h4>
            <p className="mb-1"><code className="font-mono">format</code> - Export format: "markdown", "html", or "pdf"</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <p>Returns the document in the requested format as a downloadable file.</p>
          </div>
        </div>
      </div>

      {/* Status Endpoints */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4" id="status-endpoints">Status Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-gray-800">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono mr-2">GET</span>
              <span>/api/status/:jobId</span>
            </h3>
            <p className="mb-2">Checks the status of a processing job.</p>
            <h4 className="font-medium mt-4 mb-2">Parameters</h4>
            <p className="mb-1"><code className="font-mono">jobId</code> - The UUID of the job</p>
            <h4 className="font-medium mt-4 mb-2">Response</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "status": "extracting_audio", // or "transcribing", "awaiting_review", "completed", "failed"
  "error": "Optional error message", 
  "documentationId": "uuid" // Only if the doc has been created
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiReference;