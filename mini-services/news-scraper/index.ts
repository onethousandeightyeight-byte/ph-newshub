/**
 * PH-NewsHub News Scraper Service - Main Entry Point
 * 
 * This is a Bun service that manages the Python scraper process.
 * The actual scraping logic is implemented in Python (scraper.py).
 * 
 * Port: 3001
 */

import express from 'express';
import { spawn, ChildProcess } from 'child_process';

const app = express();
const PORT = 3001;

let pythonProcess: ChildProcess | null = null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ph-newshub-scraper',
    pythonRunning: pythonProcess !== null && !pythonProcess.killed,
    timestamp: new Date().toISOString()
  });
});

// Start scraper endpoint
app.post('/start', (req, res) => {
  if (pythonProcess && !pythonProcess.killed) {
    return res.json({ status: 'running', message: 'Scraper already running' });
  }

  try {
    pythonProcess = spawn('python3', ['scraper.py'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python scraper:', error);
      pythonProcess = null;
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`Python scraper exited with code ${code}, signal ${signal}`);
      pythonProcess = null;
    });

    res.json({
      status: 'started',
      message: 'Scraper started successfully'
    });
  } catch (error) {
    console.error('Error starting scraper:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start scraper'
    });
  }
});

// Stop scraper endpoint
app.post('/stop', (req, res) => {
  if (!pythonProcess || pythonProcess.killed) {
    return res.json({ status: 'stopped', message: 'Scraper not running' });
  }

  try {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;

    res.json({
      status: 'stopped',
      message: 'Scraper stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping scraper:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop scraper'
    });
  }
});

// Trigger manual scrape endpoint
app.post('/scrape', async (req, res) => {
  try {
    // For now, return a success message
    // In production, this would trigger a single scrape cycle
    res.json({
      status: 'triggered',
      message: 'Manual scrape triggered'
    });
  } catch (error) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger scrape'
    });
  }
});

// Get scraper status endpoint
app.get('/status', (req, res) => {
  res.json({
    pythonRunning: pythonProcess !== null && !pythonProcess.killed,
    timestamp: new Date().toISOString()
  });
});

// Auto-start scraper endpoint
app.post('/_internal/start', (req, res) => {
  if (pythonProcess && !pythonProcess.killed) {
    return res.json({ status: 'running' });
  }

  try {
    pythonProcess = spawn('python3', ['scraper.py'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python scraper:', error);
      pythonProcess = null;
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`Python scraper exited with code ${code}, signal ${signal}`);
      pythonProcess = null;
    });

    console.log('Python scraper started');
    res.json({ status: 'started' });
  } catch (error) {
    console.error('Error starting scraper:', error);
    res.status(500).json({ status: 'error' });
  }
});

// Auto-start scraper
function autoStartScraper() {
  console.log('Auto-starting Python scraper...');
  
  // Trigger auto-start after a short delay
  setTimeout(() => {
    fetch(`http://127.0.0.1:${PORT}/_internal/start`, {
      method: 'POST'
    }).catch(err => {
      console.error('Failed to trigger auto-start:', err);
    });
  }, 2000);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PH-NewsHub Scraper Service running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  autoStartScraper();
});
