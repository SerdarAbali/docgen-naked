"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// DONT FUCKING REMOVE THIS COMMENT this file location is /docgen/server/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const child_process_1 = require("child_process");
const puppeteer = __importStar(require("puppeteer"));
const config_1 = __importDefault(require("./config"));
const https_1 = __importDefault(require("https"));
// Base paths configuration
const UPLOAD_BASE_DIR = path_1.default.join(__dirname, '..', config_1.default.uploadsDir);
const DOCS_DIR = path_1.default.join(__dirname, '..', config_1.default.docsDir);
const STATIC_DIR = path_1.default.join(__dirname, '..', config_1.default.staticDir);
// Configuration for audio processing
const AUDIO_SAMPLE_RATE = 16000; // 16kHz for Whisper
// Ensure required directories exist
async function ensureDirectories(jobId) {
    const dirs = {
        root: path_1.default.join(UPLOAD_BASE_DIR, jobId),
        original: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'original'),
        audio: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'audio'),
        screenshots: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'screenshots'),
    };
    for (const dir of Object.values(dirs)) {
        await promises_1.default.mkdir(dir, { recursive: true });
    }
    return dirs;
}
// Database configuration 
const pool = new pg_1.Pool({
    user: 'docuser',
    host: 'localhost',
    database: 'docgen',
    password: 'irmik',
    port: 5432,
});
// Configure multer for video upload
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const jobId = (0, uuid_1.v4)();
            req.jobId = jobId;
            const dirs = await ensureDirectories(jobId);
            cb(null, dirs.original);
        }
        catch (error) {
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `video${ext}`);
    },
});
// Configure multer for screenshot uploads
const screenshotStorage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const { documentId } = req.params;
            const docResult = await pool.query('SELECT job_id FROM documentation WHERE job_id = $1 OR id = $1', [documentId]);
            if (docResult.rows.length === 0) {
                cb(new Error('Document not found'), '');
                return;
            }
            const { job_id } = docResult.rows[0];
            const screenshotsDir = path_1.default.join(STATIC_DIR, 'img', job_id);
            await promises_1.default.mkdir(screenshotsDir, { recursive: true });
            cb(null, screenshotsDir);
        }
        catch (error) {
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `screenshot_${timestamp}${ext}`);
    }
});
const upload = (0, multer_1.default)({
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
const uploadScreenshot = (0, multer_1.default)({
    storage: screenshotStorage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    }
});
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'https://10.0.0.59:3000',
        'https://app.documentit.io',
        'https://documentit.io',
        'https://www.documentit.io'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
    credentials: true,
    maxAge: 86400
}));
// Add more permissive headers for mobile browsers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});
app.use(express_1.default.json());
app.use('/img', express_1.default.static(path_1.default.join(STATIC_DIR, 'img')));
// Categories endpoints
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        // Check if category already exists
        const existingCategory = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
        if (existingCategory.rows.length > 0) {
            return res.json({ id: existingCategory.rows[0].id, name });
        }
        const id = (0, uuid_1.v4)();
        const result = await pool.query('INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *', [id, name]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});
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
        d.category_id,
        c.name as category_name,
        pj.status
      FROM documentation d
      JOIN processing_jobs pj ON d.job_id = pj.id
      LEFT JOIN categories c ON d.category_id = c.id
      ORDER BY d.created_at DESC
    `);
        const documents = result.rows.map(doc => ({
            id: doc.id,
            job_id: doc.job_id,
            title: doc.title,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            status: doc.status,
            category: doc.category_id ? {
                id: doc.category_id,
                name: doc.category_name
            } : null
        }));
        res.json(documents);
    }
    catch (error) {
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
        const content = await promises_1.default.readFile(docPath, 'utf8');
        const { publishToGitHub } = require('./integrations/github');
        const result = await publishToGitHub({
            repo,
            token,
            path: path || '',
            title: title || `DocGen-${jobId}`,
            content
        });
        res.json(result);
    }
    catch (error) {
        console.error('GitHub publish error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to publish to GitHub' });
    }
});
// FFmpeg processing functions
async function extractAudio(inputPath, outputDir) {
    const outputPath = path_1.default.join(outputDir, 'audio.wav');
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .toFormat('wav')
            .audioFrequency(AUDIO_SAMPLE_RATE)
            .audioChannels(1)
            .on('error', reject)
            .on('end', () => resolve(outputPath))
            .save(outputPath);
    });
}
async function generateScreenshots(inputPath, outputDir, timestamps) {
    const screenshots = [];
    for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const outputPath = path_1.default.join(outputDir, `shot_${i + 1}.jpg`);
        screenshots.push(outputPath);
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
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
async function transcribeAudio(audioPath, jobId) {
    return new Promise((resolve, reject) => {
        const pythonScript = path_1.default.join(__dirname, '..', 'scripts', 'transcribe.py');
        const process = (0, child_process_1.spawn)('python3', [pythonScript, audioPath]);
        let outputData = null;
        process.stdout.on('data', async (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const jsonData = JSON.parse(line);
                    if (jsonData.progress !== undefined) {
                        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['transcribing', `Whisper: ${jsonData.message} (${jsonData.progress}%)`, jobId]);
                    }
                    else if (jsonData.result) {
                        outputData = jsonData.result;
                    }
                }
                catch (e) {
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
            }
            else {
                reject(new Error('No transcription output received'));
            }
        });
    });
}
function formatTimestamp(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
async function completeProcessing(jobId) {
    try {
        console.log('=== Starting final processing ===');
        const jobResult = await pool.query('SELECT file_path FROM processing_jobs WHERE id = $1', [jobId]);
        if (jobResult.rows.length === 0) {
            throw new Error('Job not found');
        }
        const { file_path: filePath } = jobResult.rows[0];
        const segmentResult = await pool.query('SELECT * FROM transcription_segments WHERE job_id = $1 ORDER BY segment_index', [jobId]);
        const segments = segmentResult.rows;
        const dirs = await getJobDirs(jobId);
        if (!dirs) {
            throw new Error('Job directories not found');
        }
        const docDir = path_1.default.join(DOCS_DIR, 'generated', jobId);
        const staticImgDir = path_1.default.join(STATIC_DIR, 'img', jobId);
        await promises_1.default.mkdir(docDir, { recursive: true });
        await promises_1.default.mkdir(staticImgDir, { recursive: true });
        console.log('=== Processing screenshots ===');
        const screenshotResult = await pool.query('SELECT segment_index, screenshot_path FROM transcription_segments WHERE job_id = $1 AND screenshot_path IS NOT NULL', [jobId]);
        const existingScreenshots = new Map();
        screenshotResult.rows.forEach(row => {
            existingScreenshots.set(row.segment_index, row.screenshot_path);
        });
        console.log(`Found ${existingScreenshots.size} existing screenshots`);
        const segmentsNeedingScreenshots = segments.filter(segment => !existingScreenshots.has(segment.segment_index) && segment.original_start_time > 0);
        console.log(`Need to generate ${segmentsNeedingScreenshots.length} new screenshots`);
        const timestamps = segmentsNeedingScreenshots.map(segment => segment.original_start_time === 0 ? 1 : segment.original_start_time + 1);
        let newScreenshotPaths = [];
        if (timestamps.length > 0) {
            newScreenshotPaths = await generateScreenshots(filePath, dirs.screenshots, timestamps);
            console.log(`Generated ${newScreenshotPaths.length} new screenshots`);
        }
        const imageUrls = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (existingScreenshots.has(segment.segment_index)) {
                imageUrls[i] = existingScreenshots.get(segment.segment_index) || '';
                console.log(`Using existing screenshot for segment ${i}: ${imageUrls[i]}`);
                continue;
            }
            const newScreenshotIndex = segmentsNeedingScreenshots.findIndex(s => s.segment_index === segment.segment_index);
            if (newScreenshotIndex >= 0 && newScreenshotIndex < newScreenshotPaths.length) {
                const sourcePath = newScreenshotPaths[newScreenshotIndex];
                const destFile = `shot_${String(i + 1).padStart(3, '0')}.jpg`;
                const destPath = path_1.default.join(staticImgDir, destFile);
                try {
                    try {
                        await promises_1.default.access(sourcePath, promises_1.default.constants.F_OK);
                    }
                    catch (accessError) {
                        console.log(`Screenshot ${sourcePath} doesn't exist, skipping segment ${i}`);
                        imageUrls[i] = '';
                        continue;
                    }
                    await promises_1.default.copyFile(sourcePath, destPath);
                    imageUrls[i] = `/img/${jobId}/${destFile}`;
                    console.log(`Successfully copied screenshot for segment ${i}`);
                    await pool.query('UPDATE transcription_segments SET screenshot_path = $1 WHERE job_id = $2 AND segment_index = $3', [imageUrls[i], jobId, segment.segment_index]);
                }
                catch (error) {
                    console.error(`Error copying screenshot for segment ${i}:`, error);
                    imageUrls[i] = '';
                }
            }
            else {
                imageUrls[i] = '';
            }
        }
        const docResult = await pool.query('SELECT title, category_id FROM documentation WHERE job_id = $1', [jobId]);
        if (docResult.rows.length === 0) {
            throw new Error('Documentation not found');
        }
        const { title, category_id } = docResult.rows[0];
        let categoryName = '';
        if (category_id) {
            const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [category_id]);
            if (categoryResult.rows.length > 0) {
                categoryName = categoryResult.rows[0].name;
            }
        }
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
${categoryName ? `category: ${categoryName}` : ''}
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
            const stepTitle = seg.title ? `### ${seg.title}` : `### ${formatTimestamp(seg.original_start_time)}`;
            return `${stepTitle}

${seg.text}
${imageUrl ? `\n![Screenshot at ${formatTimestamp(seg.original_start_time)}](${imageUrl})` : ''}`;
        }).join('\n\n')}`;
        await promises_1.default.writeFile(path_1.default.join(docDir, 'index.md'), content, 'utf8');
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['completed', 'Processing completed successfully', jobId]);
        console.log(`Processing completed for job: ${jobId}`);
    }
    catch (error) {
        console.error('=== PROCESSING ERROR ===');
        console.error('Error completing processing:', error);
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['failed', error instanceof Error ? error.message : 'Processing failed', jobId]);
        throw error;
    }
}
async function processVideo(jobId, filePath, title, documentId, startTime, endTime, categoryId) {
    try {
        console.log('=== Starting video processing ===');
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['processing', 'Starting video processing...', jobId]);
        const dirs = await getJobDirs(jobId);
        if (!dirs) {
            throw new Error('Job directories not found');
        }
        console.log('=== Starting audio extraction ===');
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['extracting_audio', 'Extracting audio from video...', jobId]);
        console.log('Extracting audio...');
        const audioPath = await extractAudio(filePath, dirs.audio);
        console.log('Audio extracted to:', audioPath);
        console.log('=== Starting transcription process ===');
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['transcribing', 'Starting transcription...', jobId]);
        const transcription = await transcribeAudio(audioPath, jobId);
        console.log('Transcription completed with segments:', transcription.segments.length);
        let filteredSegments = transcription.segments;
        if (startTime !== undefined && endTime !== undefined) {
            console.log('[Segment Mode] Filtering segments between', startTime, 'and', endTime);
            filteredSegments = transcription.segments.filter(segment => segment.start >= startTime && segment.end <= endTime);
            if (filteredSegments.length === 0) {
                console.warn('[Segment Mode] No segments found in the selected range');
            }
        }
        if (documentId) {
            console.log('[Edit Mode] Appending steps to existing document:', documentId);
            for (let i = 0; i < filteredSegments.length; i++) {
                const segment = filteredSegments[i];
                const segmentId = (0, uuid_1.v4)();
                await pool.query(`INSERT INTO transcription_segments 
           (id, job_id, segment_index, text, original_start_time, original_end_time, needs_review) 
           VALUES ($1, $2, $3, $4, $5, $6, true)`, [segmentId, jobId, i, segment.text, segment.start, segment.end]);
            }
            await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['awaiting_review', 'Transcription completed. Waiting for segment review.', jobId]);
            console.log('Edit mode: Segments stored and waiting for review');
            return;
        }
        else {
            const docId = (0, uuid_1.v4)();
            const docPath = `/docs/generated/${jobId}`;
            for (let i = 0; i < filteredSegments.length; i++) {
                const segment = filteredSegments[i];
                const segmentId = (0, uuid_1.v4)();
                await pool.query(`INSERT INTO transcription_segments 
           (id, job_id, segment_index, text, original_start_time, original_end_time, needs_review) 
           VALUES ($1, $2, $3, $4, $5, $6, true)`, [segmentId, jobId, i, segment.text, segment.start, segment.end]);
            }
            await pool.query('INSERT INTO documentation (id, job_id, title, content, category_id) VALUES ($1, $2, $3, $4, $5)', [docId, jobId, title, docPath, categoryId]);
            await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['awaiting_review', 'Transcription completed. Waiting for segment review.', jobId]);
            console.log('Segments stored and waiting for review');
            return;
        }
    }
    catch (error) {
        console.error('=== PROCESSING ERROR ===');
        console.error('Processing error:', error);
        await pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['failed', error instanceof Error ? error.message : 'Processing failed', jobId]);
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

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documentation (
        id UUID PRIMARY KEY,
        job_id UUID REFERENCES processing_jobs(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transcription_segments (
        id UUID PRIMARY KEY,
        job_id UUID REFERENCES processing_jobs(id),
        segment_index INTEGER NOT NULL,
        title VARCHAR(255),
        text TEXT NOT NULL,
        original_start_time NUMERIC(10, 3) NOT NULL,
        original_end_time NUMERIC(10, 3) NOT NULL,
        screenshot_path VARCHAR(255),
        needs_review BOOLEAN DEFAULT true,
        reviewed_at TIMESTAMP,
        "order" INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await promises_1.default.mkdir(UPLOAD_BASE_DIR, { recursive: true });
        await promises_1.default.mkdir(path_1.default.join(DOCS_DIR, 'generated'), { recursive: true });
        await promises_1.default.mkdir(path_1.default.join(STATIC_DIR, 'img'), { recursive: true });
        console.log('Database tables and directories initialized');
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
}
async function getJobDirs(jobId) {
    try {
        const dirs = {
            root: path_1.default.join(UPLOAD_BASE_DIR, jobId),
            original: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'original'),
            audio: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'audio'),
            screenshots: path_1.default.join(UPLOAD_BASE_DIR, jobId, 'screenshots'),
        };
        await promises_1.default.access(dirs.root);
        return dirs;
    }
    catch (error) {
        return null;
    }
}
app.get('/api/docs/id/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cleanId = id.trim().replace(/\/$/, '');
        console.log('[Server] Fetching doc/job info for ID:', cleanId);
        let result = await pool.query('SELECT id, job_id, title FROM documentation WHERE job_id = $1', [cleanId]);
        if (result.rows.length === 0) {
            result = await pool.query('SELECT id, job_id, title FROM documentation WHERE id = $1', [cleanId]);
            if (result.rows.length === 0) {
                console.log('[Server] Doc/job not found for ID:', cleanId);
                res.status(404).json({ error: 'Document or job not found' });
                return;
            }
        }
        const doc = result.rows[0];
        console.log('[Server] Found doc/job:', doc);
        res.json({ docId: doc.id, jobId: doc.job_id, title: doc.title });
    }
    catch (error) {
        console.error('[Server] Error fetching doc/job:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch doc/job' });
    }
});
app.get('/api/docs/:documentId/videos', async (req, res) => {
    try {
        const { documentId } = req.params;
        console.log('[Server] Querying videos for job_id:', documentId);
        const result = await pool.query('SELECT pj.* FROM processing_jobs pj JOIN documentation doc ON pj.id = doc.job_id WHERE doc.job_id = $1', [documentId]);
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
    }
    catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});
app.get('/video/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        console.log('[Server] Streaming video for ID:', videoId);
        const result = await pool.query('SELECT file_path FROM processing_jobs WHERE id = $1', [videoId]);
        if (result.rows.length === 0) {
            console.log('[Server] Video not found for ID:', videoId);
            res.status(404).send('Video not found');
            return;
        }
        const videoPath = result.rows[0].file_path;
        console.log('[Server] Video path:', videoPath);
        try {
            await promises_1.default.access(videoPath, promises_1.default.constants.R_OK);
            console.log('[Server] File access verified for:', videoPath);
        }
        catch (accessError) {
            console.error('[Server] Cannot access video file:', accessError);
            res.status(500).send('Video file inaccessible');
            return;
        }
        const stat = await promises_1.default.stat(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = await promises_1.default.open(videoPath, 'r');
            const stream = file.createReadStream({ start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4'
            });
            stream.pipe(res);
        }
        else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4'
            });
            const file = await promises_1.default.open(videoPath, 'r');
            const stream = file.createReadStream();
            stream.pipe(res);
        }
    }
    catch (error) {
        console.error('[Server] Error streaming video:', error);
        res.status(500).send('Error streaming video');
    }
});
app.post('/api/docs/:jobId/video-screenshot', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { videoId, timestamp } = req.body;
        const videoResult = await pool.query('SELECT file_path FROM processing_jobs WHERE id = $1', [videoId]);
        if (videoResult.rows.length === 0) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }
        const videoPath = videoResult.rows[0].file_path;
        const outputDir = path_1.default.join(STATIC_DIR, 'img', jobId);
        await promises_1.default.mkdir(outputDir, { recursive: true });
        const screenshotFilename = `screenshot_${Date.now()}.jpg`;
        const outputPath = path_1.default.join(outputDir, screenshotFilename);
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
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
    }
    catch (error) {
        console.error('Error generating video screenshot:', error);
        res.status(500).json({ error: 'Failed to generate screenshot' });
    }
});
app.get('/api/docs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const docResult = await pool.query(`SELECT d.title, d.content, d.category_id, c.name as category_name 
       FROM documentation d 
       LEFT JOIN categories c ON d.category_id = c.id 
       WHERE d.job_id = $1`, [jobId]);
        if (docResult.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const docPath = path_1.default.join(DOCS_DIR, 'generated', jobId, 'index.md');
        const content = await promises_1.default.readFile(docPath, 'utf8');
        const segmentsResult = await pool.query(`SELECT id, segment_index, title, text, original_start_time, original_end_time, screenshot_path, "order" 
       FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY COALESCE("order", segment_index)`, [jobId]);
        const steps = segmentsResult.rows.map(segment => ({
            id: segment.id,
            title: segment.title || '',
            timestamp: formatTime(Number(segment.original_start_time)),
            text: segment.text,
            imageUrl: segment.screenshot_path || null,
            order: segment.order || segment.segment_index,
            original_start_time: Number(segment.original_start_time)
        }));
        res.json({
            title: docResult.rows[0].title,
            content: content,
            steps: steps,
            category: docResult.rows[0].category_id ? {
                id: docResult.rows[0].category_id,
                name: docResult.rows[0].category_name
            } : null
        });
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch document' });
    }
});
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
app.put('/api/docs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { content, categoryId } = req.body;
        if (!content) {
            res.status(400).json({ error: 'Content is required' });
            return;
        }
        const docPath = path_1.default.join(DOCS_DIR, 'generated', jobId, 'index.md');
        await promises_1.default.writeFile(docPath, content, 'utf8');
        let query = `UPDATE documentation 
                 SET updated_at = CURRENT_TIMESTAMP`;
        const queryParams = [];
        if (categoryId !== undefined) {
            query += `, category_id = $${queryParams.length + 1}`;
            queryParams.push(categoryId === null ? null : categoryId);
        }
        query += ` WHERE job_id = $${queryParams.length + 1} RETURNING id, title, content, updated_at, category_id`;
        queryParams.push(jobId);
        const result = await pool.query(query, queryParams);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        let categoryInfo = null;
        if (result.rows[0].category_id) {
            const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [result.rows[0].category_id]);
            if (categoryResult.rows.length > 0) {
                categoryInfo = {
                    id: result.rows[0].category_id,
                    name: categoryResult.rows[0].name
                };
            }
        }
        res.json({
            success: true,
            document: {
                ...result.rows[0],
                category: categoryInfo
            }
        });
    }
    catch (error) {
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
        const docResult = await pool.query('SELECT id, job_id FROM documentation WHERE job_id = $1 OR id = $1', [documentId]);
        if (docResult.rows.length === 0) {
            console.log('[Server] Document not found for ID:', documentId);
            return res.status(404).json({ error: 'Document not found' });
        }
        const { job_id } = docResult.rows[0];
        const screenshotsDir = path_1.default.join(STATIC_DIR, 'img', job_id);
        await promises_1.default.mkdir(screenshotsDir, { recursive: true });
        console.log('[Server] Created screenshots directory:', screenshotsDir);
        const imageUrl = `/img/${job_id}/${req.file.filename}`;
        console.log('[Server] Screenshot uploaded to:', imageUrl);
        res.json({
            success: true,
            imageUrl,
            message: 'Screenshot uploaded successfully'
        });
    }
    catch (error) {
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
        const title = req.body.title || path_1.default.basename(req.file.originalname, path_1.default.extname(req.file.originalname));
        console.log('[Server] Processing upload with title:', title, 'jobId:', req.jobId);
        const documentId = req.body.documentId;
        const startTime = req.body.startTime ? parseFloat(req.body.startTime) : undefined;
        const endTime = req.body.endTime ? parseFloat(req.body.endTime) : undefined;
        const categoryId = req.body.categoryId || null;
        await pool.query('INSERT INTO processing_jobs (id, status, file_path, original_filename) VALUES ($1, $2, $3, $4)', [req.jobId, 'pending', req.file.path, req.file.originalname]);
        processVideo(req.jobId, req.file.path, title, documentId, startTime, endTime, categoryId).catch(error => {
            console.error('[Server] Error processing video:', error);
            pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['failed', error.message, req.jobId]);
        });
        console.log('[Server] Upload successful, returning jobId:', req.jobId);
        res.json({ jobId: req.jobId });
    }
    catch (error) {
        console.error('[Server] Upload error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
    }
});
app.get('/api/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await pool.query('SELECT status, error_message, doc.id as documentation_id FROM processing_jobs pj LEFT JOIN documentation doc ON pj.id = doc.job_id WHERE pj.id = $1', [jobId]);
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
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Status check failed' });
    }
});
app.delete('/api/docs/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
        await pool.query('BEGIN');
        const docResult = await pool.query('SELECT id FROM documentation WHERE job_id = $1', [jobId]);
        if (docResult.rows.length === 0) {
            throw new Error('Document not found');
        }
        await pool.query('DELETE FROM documentation WHERE job_id = $1', [jobId]);
        await pool.query('DELETE FROM processing_jobs WHERE id = $1', [jobId]);
        const dirs = {
            root: path_1.default.join(__dirname, '..', config_1.default.uploadsDir, jobId),
            docs: path_1.default.join(__dirname, '..', config_1.default.docsDir, 'generated', jobId),
            img: path_1.default.join(__dirname, '..', config_1.default.staticDir, 'img', jobId)
        };
        await Promise.all([
            promises_1.default.rm(dirs.root, { recursive: true, force: true }).catch(() => { }),
            promises_1.default.rm(dirs.docs, { recursive: true, force: true }).catch(() => { }),
            promises_1.default.rm(dirs.img, { recursive: true, force: true }).catch(() => { })
        ]);
        await pool.query('COMMIT');
        res.json({ success: true, message: 'Document deleted successfully' });
    }
    catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
app.get('/api/docs/:jobId/segments', async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await pool.query(`SELECT id, segment_index, title, text, original_start_time, original_end_time, needs_review, screenshot_path 
       FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY segment_index`, [jobId]);
        res.json(result.rows);
    }
    catch (error) {
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
            await pool.query(`INSERT INTO transcription_segments 
         (id, job_id, segment_index, title, text, original_start_time, original_end_time, screenshot_path, needs_review, "order") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)`, [
                segment.id || (0, uuid_1.v4)(),
                jobId,
                i,
                segment.title || null,
                segment.text,
                segment.start_time,
                segment.end_time,
                segment.screenshot_path || null,
                segment.order || i
            ]);
        }
        await pool.query('COMMIT');
        completeProcessing(jobId).catch(error => {
            console.error('Error in completion process:', error);
            pool.query('UPDATE processing_jobs SET status = $1, error_message = $2 WHERE id = $3', ['failed', error.message, jobId]);
        });
        res.json({ success: true });
    }
    catch (error) {
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
        let segmentResult = await pool.query('SELECT * FROM transcription_segments WHERE id = $1 AND job_id = $2', [segmentId, jobId]);
        let segmentIdToUse = segmentId;
        if (segmentResult.rows.length === 0) {
            console.log('[Server] Segment not found, creating new segment');
            const newSegmentId = (0, uuid_1.v4)();
            await pool.query(`INSERT INTO transcription_segments 
         (id, job_id, segment_index, text, original_start_time, original_end_time, screenshot_path, needs_review) 
         VALUES ($1, $2, (SELECT COALESCE(MAX(segment_index), -1) + 1 FROM transcription_segments WHERE job_id = $3), '', 0, 0, $4, true)`, [newSegmentId, jobId, jobId, screenshotPath]);
            segmentIdToUse = newSegmentId;
        }
        const updateResult = await pool.query('UPDATE transcription_segments SET screenshot_path = $1 WHERE id = $2 AND job_id = $3 RETURNING *', [screenshotPath, segmentIdToUse, jobId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found after update attempt' });
        }
        res.json({
            success: true,
            message: 'Segment screenshot path updated successfully',
            segment: updateResult.rows[0]
        });
    }
    catch (error) {
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
            await pool.query('UPDATE transcription_segments SET "order" = $1 WHERE id = $2 AND job_id = $3', [step.order, step.id, docId]);
        }
        await pool.query('COMMIT');
        res.json({ success: true, message: 'Steps reordered successfully' });
    }
    catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error reordering steps:', error);
        res.status(500).json({ error: 'Failed to reorder steps', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});
app.put('/api/docs/:docId/steps/:stepId', async (req, res) => {
    try {
        const { docId, stepId } = req.params;
        const { title, text } = req.body;
        console.log(`Updating step ${stepId} for doc ${docId}`);
        const result = await pool.query('UPDATE transcription_segments SET title = $1, text = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND job_id = $4 RETURNING *', [title || null, text, stepId, docId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Step not found' });
        }
        res.json({ success: true, step: result.rows[0], message: 'Step updated successfully' });
    }
    catch (error) {
        console.error('Error updating step:', error);
        res.status(500).json({ error: 'Failed to update step', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});
function convertMarkdownToHtml(markdown) {
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
        const { format } = req.query;
        const docResult = await pool.query('SELECT title, content, category_id FROM documentation WHERE job_id = $1', [jobId]);
        if (docResult.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const { title, content, category_id } = docResult.rows[0];
        // Get category name if applicable
        let categoryName = '';
        if (category_id) {
            const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [category_id]);
            if (categoryResult.rows.length > 0) {
                categoryName = categoryResult.rows[0].name;
            }
        }
        const segmentsResult = await pool.query(`SELECT id, title, text, original_start_time, screenshot_path FROM transcription_segments 
       WHERE job_id = $1 
       ORDER BY COALESCE("order", segment_index)`, [jobId]);
        const segments = segmentsResult.rows;
        switch (format) {
            case 'markdown': {
                const formattedDate = new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                let markdown = `---
title: ${title}
${categoryName ? `category: ${categoryName}` : ''}
---

# ${title}

> Generated on ${formattedDate}

## Overview

This documentation was automatically generated from a video recording with voice narration.

## Full Transcript

${segments.map(seg => seg.text).join(' ')} 

## Timestamped Steps

`;
                segments.forEach(seg => {
                    const timestamp = formatTime(Number(seg.original_start_time));
                    const stepTitle = seg.title ? `### ${seg.title}` : `### ${timestamp}`;
                    markdown += `${stepTitle}\n\n`;
                    markdown += `${seg.text}\n\n`;
                    if (seg.screenshot_path) {
                        const fullUrl = `${config_1.default.apiUrl}${seg.screenshot_path}`;
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
        .category { display: inline-block; background-color: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      
      ${categoryName ? `<div class="category">${categoryName}</div>` : ''}
      
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
                    const stepTitle = seg.title ? seg.title : `<span class="timestamp">${timestamp}</span>`;
                    html += `
      <h3>${stepTitle}</h3>
      <p>${seg.text}</p>`;
                    if (seg.screenshot_path) {
                        const fullUrl = `${config_1.default.apiUrl}${seg.screenshot_path}`;
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
        .category { display: inline-block; background-color: #f0f0f0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      
      ${categoryName ? `<div class="category">${categoryName}</div>` : ''}
      
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
                    const stepTitle = seg.title ? seg.title : `<span class="timestamp">${timestamp}</span>`;
                    html += `
      <h3>${stepTitle}</h3>
      <p>${seg.text}</p>`;
                    if (seg.screenshot_path) {
                        const fullUrl = `${config_1.default.apiUrl}${seg.screenshot_path}`;
                        html += `
      <p><img src="${fullUrl}" alt="Screenshot at ${timestamp}"></p>`;
                    }
                });
                html += `
    </body>
    </html>`;
                try {
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                    const page = await browser.newPage();
                    await page.setContent(html);
                    const pdfBuffer = await page.pdf({ format: 'A4' });
                    await browser.close();
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
                    return res.send(pdfBuffer);
                }
                catch (pdfError) {
                    console.error('PDF generation error:', pdfError);
                    // Fallback to HTML if PDF generation fails
                    res.setHeader('Content-Type', 'text/html');
                    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_print.html"`);
                    return res.send(html);
                }
            }
            default:
                return res.status(400).json({ error: 'Invalid export format. Supported formats are: markdown, html, pdf' });
        }
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export document' });
    }
});
// Add a simple health check endpoint for testing
app.get('/api/health', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('API server is healthy - ' + new Date().toISOString());
});
const PORT = Number(process.env.PORT) || 3001;
const startServer = async () => {
    try {
        // Try multiple paths for certificates
        const possibleCertDirs = [
            '/docgen/certs',
            '/home/sedu/docgen/certs',
            path_1.default.join(__dirname, '..', '..', 'certs')
        ];
        let privateKey;
        let certificate;
        let foundPath = '';
        for (const certDir of possibleCertDirs) {
            try {
                // First try the original IP-based filenames for backward compatibility
                let keyPath = path_1.default.join(certDir, '10.0.0.59+2-key.pem');
                let certPath = path_1.default.join(certDir, '10.0.0.59+2.pem');
                // Check if both files exist
                try {
                    await promises_1.default.access(keyPath, promises_1.default.constants.R_OK);
                    await promises_1.default.access(certPath, promises_1.default.constants.R_OK);
                }
                catch (e) {
                    // If not found, try domain-based filenames
                    keyPath = path_1.default.join(certDir, 'server-key.pem');
                    certPath = path_1.default.join(certDir, 'server.pem');
                    await promises_1.default.access(keyPath, promises_1.default.constants.R_OK);
                    await promises_1.default.access(certPath, promises_1.default.constants.R_OK);
                }
                // If we got here, the files exist and are readable
                privateKey = await promises_1.default.readFile(keyPath, 'utf8');
                certificate = await promises_1.default.readFile(certPath, 'utf8');
                foundPath = certDir;
                console.log(`Found certificates in ${certDir}`);
                break;
            }
            catch (e) {
                console.log(`Certificates not found in ${certDir}, trying next location...`);
            }
        }
        if (!privateKey || !certificate) {
            throw new Error('Failed to find certificates in any of the expected locations');
        }
        const credentials = { key: privateKey, cert: certificate };
        https_1.default.createServer(credentials, app).listen(config_1.default.port, config_1.default.host, () => {
            console.log(`HTTPS Server running on https://${config_1.default.host}:${config_1.default.port}`);
            console.log(`Using certificates from: ${foundPath}`);
        });
    }
    catch (error) {
        console.error('Failed to start HTTPS server:', error);
        process.exit(1);
    }
};
// Call this function instead of app.listen
startServer();
