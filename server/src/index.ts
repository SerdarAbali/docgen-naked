// DONT FUCKING REMOVE THIS COMMENT this file location is /docgen/server/src/index.ts
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';

// Base paths configuration
const UPLOAD_BASE_DIR = path.join(__dirname, '..', 'uploads');
const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
const STATIC_DIR = path.join(__dirname, '..', '..', 'static');

// Configuration for audio processing
const AUDIO_SAMPLE_RATE = 16000; // 16kHz for Whisper

// Directory structure for each job
interface JobDirs {
  root: string;
  original: string;
  audio: string;
  screenshots: string;
}

// Ensure required directories exist
async function ensureDirectories(jobId: string): Promise<JobDirs> {
  const dirs: JobDirs = {
    root: path.join(UPLOAD_BASE_DIR, jobId),
    original: path.join(UPLOAD_BASE_DIR, jobId, 'original'),
    audio: path.join(UPLOAD_BASE_DIR, jobId, 'audio'),
    screenshots: path.join(UPLOAD_BASE_DIR, jobId, 'screenshots'),
  };

  for (const dir of Object.values(dirs)) {
    await fs.mkdir(dir, { recursive: true });
  }

  return dirs;
}

// Database configuration 
const pool = new Pool({
  user: 'docuser',
  host: 'localhost',
  database: 'docgen',
  password: 'irmik',
  port: 5432,
});

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const jobId = uuidv4();
      req.jobId = jobId;
      const dirs = await ensureDirectories(jobId);
      cb(null, dirs.original);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `video${ext}`);
  },
});

// Configure multer for screenshot uploads
const screenshotStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { documentId } = req.params;
      // Get job_id from documentId
      const docResult = await pool.query(
        'SELECT job_id FROM documentation WHERE job_id = $1 OR id = $1',
        [documentId]
      );
      if (docResult.rows.length === 0) {
        cb(new Error('Document not found'), '');
        return;
      }
      const { job_id } = docResult.rows[0];
      const screenshotsDir = path.join(STATIC_DIR, 'img', job_id);
      await fs.mkdir(screenshotsDir, { recursive: true });
      cb(null, screenshotsDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `screenshot_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const uploadScreenshot = multer({
  storage: screenshotStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Express type extension
declare global {
  namespace Express {
    interface Request {
      jobId?: string;
    }
  }
}

const app = express();

// Middleware
app.use(cors({
  origin: 'http://10.0.0.59:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  credentials: true,
  maxAge: 86400
}));
app.use(express.json());
app.use('/img', express.static(path.join(__dirname, '../../static/img')));

// LIST ENDPOINT FIRST - before any parameterized routes
app.get('/api/docs/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.job_id,
        d.title,
        d.created_at,
        d.updated_at,
        pj.status
      FROM documentation d
      JOIN processing_jobs pj ON d.job_id = pj.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// FFmpeg processing functions
async function extractAudio(inputPath: string, outputDir: string): Promise<string> {
  const outputPath = path.join(outputDir, 'audio.wav');
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioFrequency(AUDIO_SAMPLE_RATE)
      .audioChannels(1)
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

async function generateScreenshots(inputPath: string, outputDir: string, timestamps: number[]): Promise<string[]> {
  const screenshots: string[] = [];
  
  // Process screenshots sequentially to ensure frame accuracy
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const outputPath = path.join(outputDir, `shot_${i + 1}.jpg`);
    screenshots.push(outputPath);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestamp)  // Use seekInput for precise seeking
        .outputOptions('-vframes 1')  // Capture exactly one frame
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          console.error(`Error generating screenshot at ${timestamp}:`, err);
          reject(err);
        })
        .run();
    });

    // Add a small delay between screenshots to ensure system resources are available
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return screenshots;
}

// Type for Whisper transcription result
interface WhisperResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

async function transcribeAudio(audioPath: string, jobId: string): Promise<WhisperResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'scripts', 'transcribe.py');
    const process = spawn('python3', [pythonScript, audioPath]);
    
    let outputData: WhisperResult | null = null;

    process.stdout.on('data', async (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const jsonData = JSON.parse(line);
          
          if (jsonData.progress !== undefined) {
            await pool.query(
              'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
              ['transcribing', `Whisper: ${jsonData.message} (${jsonData.progress}%)`, jobId]
            );
          } else if (jsonData.result) {
            outputData = jsonData.result as WhisperResult;
          }
        } catch (e) {
          console.error('Error parsing Whisper output:', e);
        }
      }
    });

    process.stderr.on('data', (data) => {
      console.error('Whisper error:', data.toString());
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Transcription failed'));
        return;
      }

      if (outputData) {
        resolve(outputData);
      } else {
        reject(new Error('No transcription output received'));
      }
    });
  });
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function completeProcessing(jobId: string) {
  try {
    console.log('=== Starting final processing ===');
    
    // Get job info
    const jobResult = await pool.query(
      'SELECT file_path FROM processing_jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }
    
    const { file_path: filePath } = jobResult.rows[0];
    
    // Get segments
    const segmentResult = await pool.query(
      'SELECT * FROM transcription_segments WHERE job_id = $1 ORDER BY segment_index',
      [jobId]
    );
    
    const segments = segmentResult.rows;
    
    // Prepare directories
    const dirs = await getJobDirs(jobId);
    if (!dirs) {
      throw new Error('Job directories not found');
    }

    const docDir = path.join(DOCS_DIR, 'generated', jobId);
    const staticImgDir = path.join(STATIC_DIR, 'img', jobId);
    
    await fs.mkdir(docDir, { recursive: true });
    await fs.mkdir(staticImgDir, { recursive: true });
    
    // Generate screenshots only for segments that don't have screenshots yet and have a valid timestamp
    console.log('=== Processing screenshots ===');
    
    // First check for existing screenshots in the DB
    const screenshotResult = await pool.query(
      'SELECT segment_index, screenshot_path FROM transcription_segments WHERE job_id = $1 AND screenshot_path IS NOT NULL',
      [jobId]
    );
    
    // Map of segment index to screenshot URL
    const existingScreenshots = new Map();
    screenshotResult.rows.forEach(row => {
      existingScreenshots.set(row.segment_index, row.screenshot_path);
    });
    
    console.log(`Found ${existingScreenshots.size} existing screenshots`);
    
    // Generate timestamps for segments without screenshots and with valid timestamps
    const segmentsNeedingScreenshots = segments.filter(segment => 
      !existingScreenshots.has(segment.segment_index) && segment.original_start_time > 0
    );
    
    console.log(`Need to generate ${segmentsNeedingScreenshots.length} new screenshots`);
    
    const timestamps = segmentsNeedingScreenshots.map(segment => 
      segment.original_start_time === 0 ? 1 : segment.original_start_time + 1
    );
    
    // Generate new screenshots only if needed
    let newScreenshotPaths: string[] = [];
    if (timestamps.length > 0) {
      newScreenshotPaths = await generateScreenshots(filePath, dirs.screenshots, timestamps);
      console.log(`Generated ${newScreenshotPaths.length} new screenshots`);
    }
    
    // Build the complete image URL map for all segments
    const imageUrls: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Check if we already have a screenshot for this segment
      if (existingScreenshots.has(segment.segment_index)) {
        imageUrls[i] = existingScreenshots.get(segment.segment_index) || '';
        console.log(`Using existing screenshot for segment ${i}: ${imageUrls[i]}`);
        continue;
      }
      
      // Otherwise, use a newly generated screenshot if needed
      const newScreenshotIndex = segmentsNeedingScreenshots.findIndex(s => 
        s.segment_index === segment.segment_index
      );
      
      if (newScreenshotIndex >= 0 && newScreenshotIndex < newScreenshotPaths.length) {
        const sourcePath = newScreenshotPaths[newScreenshotIndex];
        const destFile = `shot_${String(i + 1).padStart(3, '0')}.jpg`;
        const destPath = path.join(staticImgDir, destFile);
        
        try {
          // Check if the source file exists before trying to copy
          try {
            await fs.access(sourcePath, fs.constants.F_OK);
          } catch (accessError) {
            console.log(`Screenshot ${sourcePath} doesn't exist, skipping segment ${i}`);
            imageUrls[i] = ''; // No image for this segment
            continue; // Skip to the next iteration
          }
          
          await fs.copyFile(sourcePath, destPath);
          imageUrls[i] = `/img/${jobId}/${destFile}`;
          console.log(`Successfully copied screenshot for segment ${i}`);
          
          // Update the database with the screenshot path
          await pool.query(
            'UPDATE transcription_segments SET screenshot_path = $1 WHERE job_id = $2 AND segment_index = $3',
            [imageUrls[i], jobId, segment.segment_index]
          );
        } catch (error) {
          console.error(`Error copying screenshot for segment ${i}:`, error);
          imageUrls[i] = ''; // No image for this segment
        }
      } else {
        imageUrls[i] = ''; // No image for this segment
      }
    }

    // Get document info
    const docResult = await pool.query(
      'SELECT title FROM documentation WHERE job_id = $1',
      [jobId]
    );
    
    if (docResult.rows.length === 0) {
      throw new Error('Documentation not found');
    }
    
    const { title } = docResult.rows[0];
    
    // Format creation date
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Generate markdown content
    const content = `---
title: ${title}
sidebar_label: ${title}
sidebar_position: 1
---

# ${title}

:::info
Generated on ${formattedDate}
:::

## Overview

This documentation was automatically generated from a video recording with voice narration.

## Full Transcript

${segments.map(s => s.text).join(' ')}

## Timestamped Steps

${segments.map((seg, index) => {
  const imageUrl = imageUrls[index];
  return `### ${formatTimestamp(seg.original_start_time)}

${seg.text}
${imageUrl ? `\n![Screenshot at ${formatTimestamp(seg.original_start_time)}](${imageUrl})` : ''}`;
}).join('\n\n')}`;
    
    // Write markdown file
    await fs.writeFile(path.join(docDir, 'index.md'), content, 'utf8');
    
    // Update status to completed
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['completed', 'Processing completed successfully', jobId]
    );
    
    console.log(`Processing completed for job: ${jobId}`);
    
  } catch (error) {
    console.error('=== PROCESSING ERROR ===');
    console.error('Error completing processing:', error);
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error instanceof Error ? error.message : 'Processing failed', jobId]
    );
    throw error;
  }
}

async function processVideo(jobId: string, filePath: string, title: string, documentId?: string, startTime?: number, endTime?: number) {
  try {
    console.log('=== Starting video processing ===');
    
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['processing', 'Starting video processing...', jobId]
    );

    const dirs = await getJobDirs(jobId);
    if (!dirs) {
      throw new Error('Job directories not found');
    }

    // First extract audio
    console.log('=== Starting audio extraction ===');
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['extracting_audio', 'Extracting audio from video...', jobId]
    );
    console.log('Extracting audio...');
    const audioPath = await extractAudio(filePath, dirs.audio);
    console.log('Audio extracted to:', audioPath);

    // Then do transcription
    console.log('=== Starting transcription process ===');
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['transcribing', 'Starting transcription...', jobId]
    );
    
    const transcription = await transcribeAudio(audioPath, jobId);
    console.log('Transcription completed with segments:', transcription.segments.length);

    // Filter segments if needed
    let filteredSegments = transcription.segments;
    if (startTime !== undefined && endTime !== undefined) {
      console.log('[Segment Mode] Filtering segments between', startTime, 'and', endTime);
      filteredSegments = transcription.segments.filter(segment => 
        segment.start >= startTime && segment.end <= endTime
      );
      if (filteredSegments.length === 0) {
        console.warn('[Segment Mode] No segments found in the selected range');
      }
    }

    if (documentId) {
      // Append to existing documentation (edit mode)
      console.log('[Edit Mode] Appending steps to existing document:', documentId);
      for (let i = 0; i < filteredSegments.length; i++) {
        const segment = filteredSegments[i];
        const segmentId = uuidv4();

        await pool.query(
          `INSERT INTO transcription_segments 
           (id, job_id, segment_index, text, original_start_time, original_end_time, needs_review) 
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [segmentId, jobId, i, segment.text, segment.start, segment.end]
        );
      }
      
      // Update status to awaiting review
      await pool.query(
        'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['awaiting_review', 'Transcription completed. Waiting for segment review.', jobId]
      );
      
      console.log('Edit mode: Segments stored and waiting for review');
      return;
    } else {
      // Create new documentation (initial upload)
      const docId = uuidv4();
      const docPath = `/docs/generated/${jobId}`;

      // Store segments in database for review
      for (let i = 0; i < filteredSegments.length; i++) {
        const segment = filteredSegments[i];
        const segmentId = uuidv4();

        await pool.query(
          `INSERT INTO transcription_segments 
           (id, job_id, segment_index, text, original_start_time, original_end_time, needs_review) 
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [segmentId, jobId, i, segment.text, segment.start, segment.end]
        );
      }

      // Create initial documentation entry
      await pool.query(
        'INSERT INTO documentation (id, job_id, title, content) VALUES ($1, $2, $3, $4)',
        [docId, jobId, title, docPath]
      );

      // Update status to awaiting review
      await pool.query(
        'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['awaiting_review', 'Transcription completed. Waiting for segment review.', jobId]
      );

      console.log('Segments stored and waiting for review');
      return;
    }
  } catch (error) {
    console.error('=== PROCESSING ERROR ===');
    console.error('Processing error:', error);
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error instanceof Error ? error.message : 'Processing failed', jobId]
    );
    throw error;
  }
}

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processing_jobs (
        id UUID PRIMARY KEY,
        status VARCHAR(50) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS documentation (
        id UUID PRIMARY KEY,
        job_id UUID REFERENCES processing_jobs(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transcription_segments (
        id UUID PRIMARY KEY,
        job_id UUID REFERENCES processing_jobs(id),
        segment_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        original_start_time NUMERIC(10, 3) NOT NULL,
        original_end_time NUMERIC(10, 3) NOT NULL,
        screenshot_path VARCHAR(255),
        needs_review BOOLEAN DEFAULT true,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
    await fs.mkdir(path.join(DOCS_DIR, 'generated'), { recursive: true });
    await fs.mkdir(path.join(STATIC_DIR, 'img'), { recursive: true });
    
    console.log('Database tables and directories initialized');
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
}

// Utility function to get job directories
async function getJobDirs(jobId: string): Promise<JobDirs | null> {
  try {
    const dirs = {
      root: path.join(UPLOAD_BASE_DIR, jobId),
      original: path.join(UPLOAD_BASE_DIR, jobId, 'original'),
      audio: path.join(UPLOAD_BASE_DIR, jobId, 'audio'),
      screenshots: path.join(UPLOAD_BASE_DIR, jobId, 'screenshots'),
    };
    
    await fs.access(dirs.root);
    return dirs;
  } catch (error) {
    return null;
  }
}

// Get doc/job info (handles both doc_id and job_id)
app.get('/api/docs/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().replace(/\/$/, '');
    console.log('[Server] Fetching doc/job info for ID:', cleanId);

    // Try as job_id first (matches your flow)
    let result = await pool.query(
      'SELECT id, job_id, title FROM documentation WHERE job_id = $1',
      [cleanId]
    );
    if (result.rows.length === 0) {
      // If not found as job_id, try as doc_id
      result = await pool.query(
        'SELECT id, job_id, title FROM documentation WHERE id = $1',
        [cleanId]
      );
      if (result.rows.length === 0) {
        console.log('[Server] Doc/job not found for ID:', cleanId);
        res.status(404).json({ error: 'Document or job not found' });
        return;
      }
    }
    const doc = result.rows[0];
    console.log('[Server] Found doc/job:', doc);
    res.json({ docId: doc.id, jobId: doc.job_id, title: doc.title });
  } catch (error) {
    console.error('[Server] Error fetching doc/job:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch doc/job' });
  }
});

// Get available videos for a document
app.get('/api/docs/:documentId/videos', async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log('[Server] Querying videos for job_id:', documentId);
    const result = await pool.query(
      'SELECT pj.* FROM processing_jobs pj JOIN documentation doc ON pj.id = doc.job_id WHERE doc.job_id = $1',
      [documentId]
    );
    if (result.rows.length === 0) {
      console.log('[Server] No video found for job_id:', documentId);
      res.status(404).json({ error: 'No videos found for this document' });
      return;
    }
    const job = result.rows[0];
    console.log('[Server] Video info:', {
      id: job.id,
      filename: job.original_filename,
      path: job.file_path
    });
    res.json({
      originalVideo: {
        id: job.id,
        filename: job.original_filename,
        path: job.file_path
      }
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Video streaming endpoint
app.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log('[Server] Streaming video for ID:', videoId);
    const result = await pool.query(
      'SELECT file_path FROM processing_jobs WHERE id = $1',
      [videoId]
    );
    if (result.rows.length === 0) {
      console.log('[Server] Video not found for ID:', videoId);
      res.status(404).send('Video not found');
      return;
    }
    const videoPath = result.rows[0].file_path;
    console.log('[Server] Video path:', videoPath);

    // Verify file exists and is readable
    try {
      await fs.access(videoPath, fs.constants.R_OK);
      console.log('[Server] File access verified for:', videoPath);
    } catch (accessError) {
      console.error('[Server] Cannot access video file:', accessError);
      res.status(500).send('Video file inaccessible');
      return;
    }

    // Stream the video
    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = await fs.open(videoPath, 'r');
      const stream = file.createReadStream({ start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });

      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });

      const file = await fs.open(videoPath, 'r');
      const stream = file.createReadStream();
      stream.pipe(res);
    }
  } catch (error) {
    console.error('[Server] Error streaming video:', error);
    res.status(500).send('Error streaming video');
  }
});

// Generate screenshot from video at timestamp
app.post('/api/docs/:jobId/video-screenshot', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { videoId, timestamp } = req.body;

    // Get video path
    const videoResult = await pool.query(
      'SELECT file_path FROM processing_jobs WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const videoPath = videoResult.rows[0].file_path;
    
    // Create output directory
    const outputDir = path.join(STATIC_DIR, 'img', jobId);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate screenshot
    const screenshotFilename = `screenshot_${Date.now()}.jpg`;
    const outputPath = path.join(outputDir, screenshotFilename);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .outputOptions('-vframes 1')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Return image URL
    const imageUrl = `/img/${jobId}/${screenshotFilename}`;
    res.json({
      success: true,
      imageUrl,
      message: 'Screenshot generated successfully'
    });

  } catch (error) {
    console.error('Error generating video screenshot:', error);
    res.status(500).json({ error: 'Failed to generate screenshot' });
  }
});

// Get document content by job_id
app.get('/api/docs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const result = await pool.query(
      'SELECT title, content FROM documentation WHERE job_id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Read the actual markdown file
    const docPath = path.join(DOCS_DIR, 'generated', jobId, 'index.md');
    const content = await fs.readFile(docPath, 'utf8');

    res.json({
      title: result.rows[0].title,
      content: content
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch document' });
  }
});

// Update document content
app.put('/api/docs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // Write the new content to the markdown file
    const docPath = path.join(DOCS_DIR, 'generated', jobId, 'index.md');
    await fs.writeFile(docPath, content, 'utf8');

    // Update the database timestamp
    const result = await pool.query(
      `UPDATE documentation 
       SET updated_at = CURRENT_TIMESTAMP 
       WHERE job_id = $1 
       RETURNING id, title, content, updated_at`,
      [jobId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ success: true, document: result.rows[0] });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update document' });
  }
});

// Upload screenshot for a document
app.post('/api/docs/:documentId/screenshots', uploadScreenshot.single('screenshot'), async (req, res) => {
  console.log('[Server] Screenshot upload request for documentId:', req.params.documentId);
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const { documentId } = req.params;

    // First get doc/job mapping
    const docResult = await pool.query(
      'SELECT id, job_id FROM documentation WHERE job_id = $1 OR id = $1',
      [documentId]
    );
    
    if (docResult.rows.length === 0) {
      console.log('[Server] Document not found for ID:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }

    const { job_id } = docResult.rows[0];
    const screenshotsDir = path.join(STATIC_DIR, 'img', job_id);
    await fs.mkdir(screenshotsDir, { recursive: true });
    console.log('[Server] Created screenshots directory:', screenshotsDir);

    // Generate the URL for the screenshot
    const imageUrl = `/img/${job_id}/${req.file.filename}`;
    console.log('[Server] Screenshot uploaded to:', imageUrl);

    res.json({
      success: true,
      imageUrl,
      message: 'Screenshot uploaded successfully'
    });
  } catch (error) {
    console.error('[Server] Screenshot upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload screenshot'
    });
  }
});

// Video upload endpoint
app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('[Server] Upload request received:', req.file?.originalname);
  try {
    if (!req.file || !req.jobId) {
      throw new Error('No file uploaded or job ID not generated');
    }

    const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
    console.log('[Server] Processing upload with title:', title, 'jobId:', req.jobId);

    // Check if this is an edit (documentId, startTime, endTime provided)
    const documentId = req.body.documentId;
    const startTime = req.body.startTime ? parseFloat(req.body.startTime) : undefined;
    const endTime = req.body.endTime ? parseFloat(req.body.endTime) : undefined;

    await pool.query(
      'INSERT INTO processing_jobs (id, status, file_path, original_filename) VALUES ($1, $2, $3, $4)',
      [req.jobId, 'pending', req.file.path, req.file.originalname]
    );

    processVideo(req.jobId, req.file.path, title, documentId, startTime, endTime).catch(error => {
      console.error('[Server] Error processing video:', error);
      pool.query(
        'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, req.jobId]
      );
    });

    console.log('[Server] Upload successful, returning jobId:', req.jobId);
    res.json({ jobId: req.jobId });
  } catch (error) {
    console.error('[Server] Upload error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
  }
});

// Get processing status
app.get('/api/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const result = await pool.query(
      'SELECT status, error_message, doc.id as documentation_id FROM processing_jobs pj LEFT JOIN documentation doc ON pj.id = doc.job_id WHERE pj.id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const job = result.rows[0];
    res.json({
      status: job.status,
      error: job.error_message,
      documentationId: job.documentation_id
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Status check failed' });
  }
});

// Delete document
app.delete('/api/docs/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Get document info
    const docResult = await pool.query(
      'SELECT id FROM documentation WHERE job_id = $1',
      [jobId]
    );

    if (docResult.rows.length === 0) {
      throw new Error('Document not found');
    }

    // Delete document content
    await pool.query(
      'DELETE FROM documentation WHERE job_id = $1',
      [jobId]
    );

    // Delete processing job
    await pool.query(
      'DELETE FROM processing_jobs WHERE id = $1',
      [jobId]
    );

    // Delete files
    const dirs = {
      root: path.join(__dirname, '..', 'uploads', jobId),
      docs: path.join(__dirname, '..', '..', 'docs', 'generated', jobId),
      img: path.join(__dirname, '..', '..', 'static', 'img', jobId)
    };

    // Remove directories and their contents
    await Promise.all([
      fs.rm(dirs.root, { recursive: true, force: true }).catch(() => {}),
      fs.rm(dirs.docs, { recursive: true, force: true }).catch(() => {}),
      fs.rm(dirs.img, { recursive: true, force: true }).catch(() => {})
    ]);

    // Commit transaction
    await pool.query('COMMIT');

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Add this near your other endpoints
app.get('/api/docs/:jobId/segments', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const result = await pool.query(
      `SELECT id, segment_index, text, original_start_time, original_end_time, needs_review, screenshot_path 
       FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY segment_index`,
      [jobId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// Update the finalize-segments endpoint to handle screenshot_path
app.post('/api/docs/:jobId/finalize-segments', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { segments } = req.body;
    
    await pool.query('BEGIN');
    
    // Delete existing segments
    await pool.query('DELETE FROM transcription_segments WHERE job_id = $1', [jobId]);
    
    // Insert updated segments with screenshots if provided
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      await pool.query(
        `INSERT INTO transcription_segments 
         (id, job_id, segment_index, text, original_start_time, original_end_time, screenshot_path, needs_review) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
        [uuidv4(), jobId, i, segment.text, segment.start_time, segment.end_time, segment.screenshot_path || null]
      );
    }
    
    await pool.query('COMMIT');
    
    // Start the completion process
    completeProcessing(jobId).catch(error => {
      console.error('Error in completion process:', error);
      pool.query(
        'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, jobId]
      );
    });
    
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error finalizing segments:', error);
    res.status(500).json({ error: 'Failed to finalize segments' });
  }
});

// Update screenshot path for a segment, handling temporary IDs
app.post('/api/docs/:jobId/update-segment-screenshot', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { segmentId, screenshotPath } = req.body;
    
    if (!segmentId || !screenshotPath) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('[Server] Updating screenshot for segmentId:', segmentId, 'with path:', screenshotPath);

    // Check if the segment exists with the given ID
    let segmentResult = await pool.query(
      'SELECT * FROM transcription_segments WHERE id = $1 AND job_id = $2',
      [segmentId, jobId]
    );

    let segmentIdToUse = segmentId;

    // If the segment doesn't exist, create a new segment with the screenshot
    if (segmentResult.rows.length === 0) {
      console.log('[Server] Segment not found, creating new segment');
      const newSegmentId = uuidv4();
      await pool.query(
        `INSERT INTO transcription_segments 
         (id, job_id, segment_index, text, original_start_time, original_end_time, screenshot_path, needs_review) 
         VALUES ($1, $2, (SELECT COALESCE(MAX(segment_index), -1) + 1 FROM transcription_segments WHERE job_id = $3), '', 0, 0, $4, true)`,
        [newSegmentId, jobId, jobId, screenshotPath]
      );
      segmentIdToUse = newSegmentId;
    }

    // Update the screenshot path for the segment (using the real or newly created ID)
    const updateResult = await pool.query(
      'UPDATE transcription_segments SET screenshot_path = $1 WHERE id = $2 AND job_id = $3 RETURNING *',
      [screenshotPath, segmentIdToUse, jobId]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found after update attempt' });
    }
    
    res.json({ 
      success: true, 
      message: 'Segment screenshot path updated successfully',
      segment: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating segment screenshot:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update segment screenshot' 
    });
  }
});
// Start server
const PORT = Number(process.env.PORT) || 3001;

initDatabase().then(() => {
  app.listen(PORT, '10.0.0.59', () => {
    console.log(`Server running on port ${PORT}`);
  });
});