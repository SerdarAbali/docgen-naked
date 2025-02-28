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
import { renderToString } from 'react-dom/server';
import * as puppeteer from 'puppeteer';

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

app.post('/api/docs/:jobId/publish/github', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { repo, token, path, title } = req.body;
    
    if (!repo || !token) {
      return res.status(400).json({ error: 'Repository and token are required' });
    }
    
    const docPath = path.join(DOCS_DIR, 'generated', jobId, 'index.md');
    const content = await fs.readFile(docPath, 'utf8');
    
    const { publishToGitHub } = require('./integrations/github');
    const result = await publishToGitHub({
      repo,
      token,
      path: path || '',
      title: title || `DocGen-${jobId}`,
      content
    });
    
    res.json(result);
  } catch (error) {
    console.error('GitHub publish error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to publish to GitHub' });
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
  const screenshots = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const outputPath = path.join(outputDir, `shot_${i + 1}.jpg`);
    screenshots.push(outputPath);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestamp)
        .outputOptions('-vframes 1')
        .output(outputPath)
        .on('end', resolve)
        .on('error', (err) => {
          console.error(`Error generating screenshot at ${timestamp}:`, err);
          reject(err);
        })
        .run();
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return screenshots;
}

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
    
    const jobResult = await pool.query(
      'SELECT file_path FROM processing_jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }
    
    const { file_path: filePath } = jobResult.rows[0];
    
    const segmentResult = await pool.query(
      'SELECT * FROM transcription_segments WHERE job_id = $1 ORDER BY segment_index',
      [jobId]
    );
    
    const segments = segmentResult.rows;
    
    const dirs = await getJobDirs(jobId);
    if (!dirs) {
      throw new Error('Job directories not found');
    }

    const docDir = path.join(DOCS_DIR, 'generated', jobId);
    const staticImgDir = path.join(STATIC_DIR, 'img', jobId);
    
    await fs.mkdir(docDir, { recursive: true });
    await fs.mkdir(staticImgDir, { recursive: true });
    
    console.log('=== Processing screenshots ===');
    
    const screenshotResult = await pool.query(
      'SELECT segment_index, screenshot_path FROM transcription_segments WHERE job_id = $1 AND screenshot_path IS NOT NULL',
      [jobId]
    );
    
    const existingScreenshots = new Map();
    screenshotResult.rows.forEach(row => {
      existingScreenshots.set(row.segment_index, row.screenshot_path);
    });

    console.log(`Found ${existingScreenshots.size} existing screenshots`);
    
    const segmentsNeedingScreenshots = segments.filter(segment => 
      !existingScreenshots.has(segment.segment_index) && segment.original_start_time > 0
    );
    
    console.log(`Need to generate ${segmentsNeedingScreenshots.length} new screenshots`);
    
    const timestamps = segmentsNeedingScreenshots.map(segment => 
      segment.original_start_time === 0 ? 1 : segment.original_start_time + 1
    );
    
    let newScreenshotPaths: string[] = [];
    if (timestamps.length > 0) {
      newScreenshotPaths = await generateScreenshots(filePath, dirs.screenshots, timestamps);
      console.log(`Generated ${newScreenshotPaths.length} new screenshots`);
    }
    
    const imageUrls: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (existingScreenshots.has(segment.segment_index)) {
        imageUrls[i] = existingScreenshots.get(segment.segment_index) || '';
        console.log(`Using existing screenshot for segment ${i}: ${imageUrls[i]}`);
        continue;
      }
      
      const newScreenshotIndex = segmentsNeedingScreenshots.findIndex(s => 
        s.segment_index === segment.segment_index
      );
      
      if (newScreenshotIndex >= 0 && newScreenshotIndex < newScreenshotPaths.length) {
        const sourcePath = newScreenshotPaths[newScreenshotIndex];
        const destFile = `shot_${String(i + 1).padStart(3, '0')}.jpg`;
        const destPath = path.join(staticImgDir, destFile);
        
        try {
          try {
            await fs.access(sourcePath, fs.constants.F_OK);
          } catch (accessError) {
            console.log(`Screenshot ${sourcePath} doesn't exist, skipping segment ${i}`);
            imageUrls[i] = '';
            continue;
          }
          
          await fs.copyFile(sourcePath, destPath);
          imageUrls[i] = `/img/${jobId}/${destFile}`;
          console.log(`Successfully copied screenshot for segment ${i}`);
          
          await pool.query(
            'UPDATE transcription_segments SET screenshot_path = $1 WHERE job_id = $2 AND segment_index = $3',
            [imageUrls[i], jobId, segment.segment_index]
          );
        } catch (error) {
          console.error(`Error copying screenshot for segment ${i}:`, error);
          imageUrls[i] = '';
        }
      } else {
        imageUrls[i] = '';
      }
    }

    const docResult = await pool.query(
      'SELECT title FROM documentation WHERE job_id = $1',
      [jobId]
    );
    
    if (docResult.rows.length === 0) {
      throw new Error('Documentation not found');
    }
    
    const { title } = docResult.rows[0];
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
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
    
    await fs.writeFile(path.join(docDir, 'index.md'), content, 'utf8');
    
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

    console.log('=== Starting audio extraction ===');
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['extracting_audio', 'Extracting audio from video...', jobId]
    );
    console.log('Extracting audio...');
    const audioPath = await extractAudio(filePath, dirs.audio);
    console.log('Audio extracted to:', audioPath);

    console.log('=== Starting transcription process ===');
    await pool.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
      ['transcribing', 'Starting transcription...', jobId]
    );
    
    const transcription = await transcribeAudio(audioPath, jobId);
    console.log('Transcription completed with segments:', transcription.segments.length);

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
      
      await pool.query(
        'UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['awaiting_review', 'Transcription completed. Waiting for segment review.', jobId]
      );
      
      console.log('Edit mode: Segments stored and waiting for review');
      return;
    } else {
      const docId = uuidv4();
      const docPath = `/docs/generated/${jobId}`;

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

      await pool.query(
        'INSERT INTO documentation (id, job_id, title, content) VALUES ($1, $2, $3, $4)',
        [docId, jobId, title, docPath]
      );

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

app.get('/api/docs/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().replace(/\/$/, '');
    console.log('[Server] Fetching doc/job info for ID:', cleanId);

    let result = await pool.query(
      'SELECT id, job_id, title FROM documentation WHERE job_id = $1',
      [cleanId]
    );
    if (result.rows.length === 0) {
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

    try {
      await fs.access(videoPath, fs.constants.R_OK);
      console.log('[Server] File access verified for:', videoPath);
    } catch (accessError) {
      console.error('[Server] Cannot access video file:', accessError);
      res.status(500).send('Video file inaccessible');
      return;
    }

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

app.post('/api/docs/:jobId/video-screenshot', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { videoId, timestamp } = req.body;

    const videoResult = await pool.query(
      'SELECT file_path FROM processing_jobs WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const videoPath = videoResult.rows[0].file_path;
    
    const outputDir = path.join(STATIC_DIR, 'img', jobId);
    await fs.mkdir(outputDir, { recursive: true });

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

app.get('/api/docs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const docResult = await pool.query(
      'SELECT title, content FROM documentation WHERE job_id = $1',
      [jobId]
    );

    if (docResult.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const docPath = path.join(DOCS_DIR, 'generated', jobId, 'index.md');
    const content = await fs.readFile(docPath, 'utf8');

    const segmentsResult = await pool.query(
      `SELECT id, segment_index, text, original_start_time, original_end_time, screenshot_path, "order" 
       FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY COALESCE("order", segment_index)`,
      [jobId]
    );

    const steps = segmentsResult.rows.map(segment => ({
      id: segment.id,
      timestamp: formatTime(Number(segment.original_start_time)),
      text: segment.text,
      imageUrl: segment.screenshot_path || null,
      order: segment.order || segment.segment_index
    }));

    res.json({
      title: docResult.rows[0].title,
      content: content,
      steps: steps
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch document' });
  }
});

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

app.put('/api/docs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const docPath = path.join(DOCS_DIR, 'generated', jobId, 'index.md');
    await fs.writeFile(docPath, content, 'utf8');

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

app.post('/api/docs/:documentId/screenshots', uploadScreenshot.single('screenshot'), async (req, res) => {
  console.log('[Server] Screenshot upload request for documentId:', req.params.documentId);
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const { documentId } = req.params;

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

app.post('/api/upload', upload.single('video'), async (req, res) => {
  console.log('[Server] Upload request received:', req.file?.originalname);
  try {
    if (!req.file || !req.jobId) {
      throw new Error('No file uploaded or job ID not generated');
    }

    const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
    console.log('[Server] Processing upload with title:', title, 'jobId:', req.jobId);

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

app.delete('/api/docs/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    await pool.query('BEGIN');

    const docResult = await pool.query(
      'SELECT id FROM documentation WHERE job_id = $1',
      [jobId]
    );

    if (docResult.rows.length === 0) {
      throw new Error('Document not found');
    }

    await pool.query(
      'DELETE FROM documentation WHERE job_id = $1',
      [jobId]
    );

    await pool.query(
      'DELETE FROM processing_jobs WHERE id = $1',
      [jobId]
    );

    const dirs = {
      root: path.join(__dirname, '..', 'uploads', jobId),
      docs: path.join(__dirname, '..', '..', 'docs', 'generated', jobId),
      img: path.join(__dirname, '..', '..', 'static', 'img', jobId)
    };

    await Promise.all([
      fs.rm(dirs.root, { recursive: true, force: true }).catch(() => {}),
      fs.rm(dirs.docs, { recursive: true, force: true }).catch(() => {}),
      fs.rm(dirs.img, { recursive: true, force: true }).catch(() => {})
    ]);

    await pool.query('COMMIT');

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

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

app.post('/api/docs/:jobId/finalize-segments', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { segments } = req.body;
    
    await pool.query('BEGIN');
    
    await pool.query('DELETE FROM transcription_segments WHERE job_id = $1', [jobId]);
    
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

app.post('/api/docs/:jobId/update-segment-screenshot', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { segmentId, screenshotPath } = req.body;
    
    if (!segmentId || !screenshotPath) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('[Server] Updating screenshot for segmentId:', segmentId, 'with path:', screenshotPath);

    let segmentResult = await pool.query(
      'SELECT * FROM transcription_segments WHERE id = $1 AND job_id = $2',
      [segmentId, jobId]
    );

    let segmentIdToUse = segmentId;

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

app.post('/api/docs/:docId/steps/reorder', async (req, res) => {
  try {
    const { docId } = req.params;
    const { steps } = req.body;
    
    console.log('Received reorder request for doc:', docId);
    console.log('Steps order:', steps);
    
    await pool.query('BEGIN');
    
    for (const step of steps) {
      await pool.query(
        'UPDATE transcription_segments SET "order" = $1 WHERE id = $2 AND job_id = $3',
        [step.order, step.id, docId]
      );
    }
    
    await pool.query('COMMIT');
    
    res.json({ success: true, message: 'Steps reordered successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error reordering steps:', error);
    res.status(500).json({ error: 'Failed to reorder steps', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.put('/api/docs/:docId/steps/:stepId', async (req, res) => {
  try {
    const { docId, stepId } = req.params;
    const { text } = req.body;
    
    console.log(`Updating step ${stepId} for doc ${docId}`);
    
    const result = await pool.query(
      'UPDATE transcription_segments SET text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND job_id = $3 RETURNING *',
      [text, stepId, docId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    res.json({ success: true, step: result.rows[0], message: 'Step updated successfully' });
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Failed to update step', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

function convertMarkdownToHtml(markdown: string): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    img { max-width: 100%; }
    code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    pre { background-color: #f5f5f5; padding: 16px; border-radius: 3px; overflow-x: auto; }
  </style>
  <title>Exported Documentation</title>
</head>
<body>`;

  const titleMatch = markdown.match(/title:\s*([^\n]+)/);
  if (titleMatch) {
    html += `<h1>${titleMatch[1]}</h1>`;
  }

  const contentWithoutFrontmatter = markdown.replace(/---[\s\S]*?---/, '');
  
  html += contentWithoutFrontmatter
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1">')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    .replace(/```(.*?)```/gims, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/gm, '<code>$1</code>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');

  html += `</body></html>`;
  return html;
}

app.get('/api/docs/:jobId/export', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format } = req.query as { format?: string };
    
    const docResult = await pool.query(
      'SELECT title, content FROM documentation WHERE job_id = $1',
      [jobId]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const { title, content } = docResult.rows[0];
    
    const segmentsResult = await pool.query(
      `SELECT id, text, original_start_time, screenshot_path FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY COALESCE("order", segment_index)`,
      [jobId]
    );
    
    const segments = segmentsResult.rows;
    
    switch (format) {
      case 'markdown': {
        const formattedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        let markdown = `# ${title}\n\n`;
        markdown += `> Generated on ${formattedDate}\n\n`;
        
        markdown += `## Overview\n\n`;
        markdown += `This documentation was automatically generated from a video recording with voice narration.\n\n`;
        
        markdown += `## Full Transcript\n\n`;
        markdown += segments.map(seg => seg.text).join(' ') + '\n\n';
        
        markdown += `## Timestamped Steps\n\n`;
        
        segments.forEach(seg => {
          const timestamp = formatTime(Number(seg.original_start_time));
          markdown += `### ${timestamp}\n\n`;
          markdown += `${seg.text}\n\n`;
          
          if (seg.screenshot_path) {
            const fullUrl = `http://10.0.0.59:3001${seg.screenshot_path}`;
            markdown += `![Screenshot at ${timestamp}](${fullUrl})\n\n`;
          }
        });
        
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.md"`);
        return res.send(markdown);
      }
      
      case 'html': {
        const formattedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    img { max-width: 100%; }
    .timestamp { background-color: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .note { background-color: #f8f8f8; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <div class="note">
    <p>Generated on ${formattedDate}</p>
  </div>
  
  <h2>Overview</h2>
  <p>This documentation was automatically generated from a video recording with voice narration.</p>
  
  <h2>Full Transcript</h2>
  <p>${segments.map(seg => seg.text).join(' ')}</p>
  
  <h2>Timestamped Steps</h2>`;
        
        segments.forEach(seg => {
          const timestamp = formatTime(Number(seg.original_start_time));
          html += `
  <h3><span class="timestamp">${timestamp}</span></h3>
  <p>${seg.text}</p>`;
          
          if (seg.screenshot_path) {
            const fullUrl = `http://10.0.0.59:3001${seg.screenshot_path}`;
            html += `
  <p><img src="${fullUrl}" alt="Screenshot at ${timestamp}"></p>`;
          }
        });
        
        html += `
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.html"`);
        return res.send(html);
      }
      
      case 'pdf': {
        const formattedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 20px; }
    img { max-width: 100%; }
    .timestamp { background-color: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .note { background-color: #f8f8f8; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <div class="note">
    <p>Generated on ${formattedDate}</p>
  </div>
  
  <h2>Overview</h2>
  <p>This documentation was automatically generated from a video recording with voice narration.</p>
  
  <h2>Full Transcript</h2>
  <p>${segments.map(seg => seg.text).join(' ')}</p>
  
  <h2>Timestamped Steps</h2>`;
        
        segments.forEach(seg => {
          const timestamp = formatTime(Number(seg.original_start_time));
          html += `
  <h3><span class="timestamp">${timestamp}</span></h3>
  <p>${seg.text}</p>`;
          
          if (seg.screenshot_path) {
            const fullUrl = `http://10.0.0.59:3001${seg.screenshot_path}`;
            html += `
  <p><img src="${fullUrl}" alt="Screenshot at ${timestamp}"></p>`;
          }
        });
        
        html += `
</body>
</html>`;

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
        return res.send(pdfBuffer);
      }
      
      default:
        return res.status(400).json({ error: 'Invalid export format. Supported formats are: markdown, html, pdf' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export document' });
  }
});

const PORT = Number(process.env.PORT) || 3001;

initDatabase().then(() => {
  app.listen(PORT, '10.0.0.59', () => {
    console.log(`Server running on port ${PORT}`);
  });
});