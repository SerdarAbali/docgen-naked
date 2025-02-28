# Documentation: DocGen System

## Overview
DocGen is a Documentation Generation System that processes video content to automatically generate structured documentation. It uses AI/ML for transcription and provides an interface for reviewing and editing the generated content. The system creates step-by-step documentation with screenshots and timestamps, with full support for reordering steps and inline content editing.

## Key Enhancements
- **Integrated Editing Interface**: Unified viewing and editing capabilities into a single interface for seamless documentation management
- **Rich Text Editing**: Added CKEditor integration for advanced formatting of documentation content
- **Image Lightbox**: Interactive image viewer to expand screenshots for better visibility
- **Export Capabilities**: Support for exporting documentation in multiple formats (Markdown, HTML, PDF)
- **Drag-and-Drop Reordering**: Intuitive interface for reorganizing documentation steps

## Folder Structure and Key Files
### Root Directory
```
docgen/
├── client/               # Frontend application
├── server/               # Backend application
└── config/               # Centralized configuration
```

### Client Directory
```
client/
├── public/               # Static assets
│   └── index.html        # Main HTML entry point
├── src/                  # Application source code
│   ├── components/       # Reusable UI components
│   │   ├── VideoUpload/  # Video upload component
│   │   └── SegmentReview/# Segment review component
│   ├── pages/            # Application pages
│   │   └── DocumentationViewer.tsx  # Interactive documentation viewer
│   ├── config.ts         # Centralized frontend configuration
│   ├── App.tsx           # Main application component with routing
│   └── main.tsx          # Application entry point
├── package.json          # Frontend dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite build configuration
```

### Server Directory
```
server/
├── dist/                 # Compiled TypeScript files
├── scripts/              # Python scripts for AI/ML
│   └── transcribe.py     # Whisper transcription script
├── src/                  # Backend source code
│   ├── config.ts         # Server configuration
│   ├── index.ts          # Main server entry point with API routes
│   └── integrations/     # External integrations
│       └── github.ts     # GitHub integration for publishing docs
├── package.json          # Backend dependencies and scripts
├── whisper-env/          # Python virtual environment for Whisper
└── tsconfig.json         # TypeScript configuration
```

## Key Files and Their Purpose

### Client Files:
- **client/src/config.ts**: Centralized configuration for API URLs and application settings
- **client/src/App.tsx**: Main application component with routing
- **client/src/components/VideoUpload/index.tsx**: Video upload interface
- **client/src/components/SegmentReview/index.tsx**: Segment review interface
- **client/src/pages/DocumentationViewer.tsx**: Interactive documentation viewer with inline editing, image lightbox, and step reordering

### Server Files:
- **server/src/config.ts**: Server-side configuration
- **server/src/index.ts**: Main server entry point with API routes
- **server/scripts/transcribe.py**: Whisper transcription script
- **server/src/integrations/github.ts**: GitHub integration for publishing documentation

## Key Features

### Video Processing:
- Upload and process video files
- Extract audio and generate screenshots at key points
- Transcribe audio using Whisper AI
- Segment transcription into logical steps

### Documentation Generation:
- Create structured documentation from video content with timestamps
- Associate screenshots with specific steps
- Generate markdown output suitable for publishing
- Create RESTful API endpoints for accessing documents

### Documentation Management:
- Unified view/edit interface for documentation
- Drag-and-drop reordering of documentation steps
- Rich text editing of step content with CKEditor
- Image lightbox for better screenshot viewing
- Screenshot upload and replacement capability
- Step addition and deletion functionality

### Export Capabilities:
- Export documentation in multiple formats:
  - Markdown for version control systems
  - HTML for web publication
  - PDF for distribution and printing

### User Interface:
- Video upload and processing interface
- Segment review and editing tools
- Interactive documentation viewer with inline editing
- Image lightbox for better screenshot viewing
- Export dropdown for selecting output format

## Database Schema
### Documentation Table
```sql
CREATE TABLE documentation (
  id UUID PRIMARY KEY,
  job_id UUID UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Processing Jobs Table
```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY,
  video_path VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transcription Segments (Steps) Table
```sql
CREATE TABLE transcription_segments (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES processing_jobs(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  original_start_time NUMERIC(10,3) NOT NULL,
  original_end_time NUMERIC(10,3) NOT NULL,
  screenshot_path VARCHAR(255),
  needs_review BOOLEAN DEFAULT true,
  reviewed_at TIMESTAMP,
  "order" INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Document Endpoints
- **GET /api/docs/:jobId** - Retrieves a document with structured steps array
- **PUT /api/docs/:jobId** - Updates a document's content
- **DELETE /api/docs/:jobId** - Deletes a document and related assets

### Export Endpoints
- **GET /api/docs/:jobId/export?format=markdown** - Exports document in Markdown format
- **GET /api/docs/:jobId/export?format=html** - Exports document in HTML format
- **GET /api/docs/:jobId/export?format=pdf** - Exports document in PDF format

### Step Management Endpoints
- **GET /api/docs/:jobId/steps** - Retrieves all steps for a document
- **PUT /api/docs/:docId/steps/:stepId** - Updates a step's content
- **POST /api/docs/:docId/steps/reorder** - Reorders steps based on provided order array
- **POST /api/docs/:docId/finalize-segments** - Updates or creates new steps

### Asset Management Endpoints
- **POST /api/docs/:documentId/screenshots** - Uploads a screenshot for a step
- **POST /api/docs/:jobId/update-segment-screenshot** - Updates a step's screenshot reference

## Configuration
- Centralized configuration approach to avoid hardcoded values
- Support for environment variables to customize deployment

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string
- **HOST**: Server host address (default: 10.0.0.59)
- **PORT**: Server port (default: 3001)
- **WHISPER_MODEL**: Whisper model to use (e.g., 'base')
- **UPLOAD_DIR**: Directory for uploaded files

## Development Workflow

1. Start PostgreSQL database
```
psql -U docuser -d docgen -h localhost -p 5432
```

2. Activate the Python virtual environment for Whisper:
```
source server/whisper-env/bin/activate  # On Linux/macOS
```

3. Run server:
```
cd server && npm run dev
```

4. Run client:
```
cd client && npm run dev
```

5. Access application at http://localhost:3000

## Required Dependencies
### Frontend
- React with TypeScript
- React Router for navigation
- React-DnD for drag-and-drop functionality
- CKEditor for rich text editing
- Lucide React for icons
- Vite for build and development

### Backend
- Node.js with Express
- PostgreSQL for database
- Python with OpenAI Whisper for transcription
- FFmpeg for video processing
- Puppeteer for PDF generation

## Troubleshooting
- Missing dependencies: Run npm install in both client and server directories
- Whisper errors: Ensure Python virtual environment is activated and FFmpeg is installed
- Database connection issues: Verify PostgreSQL is running and connection string is correct
- React-DnD issues: Check browser console for specific error messages
- Image loading issues: Check that API_BASE_URL is correctly configured

## Implemented Enhancements
- ✅ Unified view/edit interface with inline editing
- ✅ Rich text editing with CKEditor
- ✅ Image lightbox for better screenshot viewing
- ✅ Export functionality for multiple formats (Markdown, HTML, PDF)
- ✅ Drag-and-drop reordering
- ✅ Step addition and deletion
- ✅ Image replacement capabilities

## Future Enhancements
- Implement user authentication and access control
- Add collaboration features for team documentation
- Create document templates for different use cases
- Add version history and change tracking
- Support for embedding video segments in documentation
- Implement AI-assisted documentation improvement suggestions
- Add analytics for documentation usage and engagement
