import express from 'express';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

const app = express();
// Render dynamically assigns a port, so we use PORT from the environment.
const PORT = process.env.PORT || 10000;

let scraperProcess: ChildProcess | null = null;

/**
 * Starts the Python scraper script as a background process.
 * Captures its output and logs it to the console.
 */
function startScraper() {
  if (scraperProcess && !scraperProcess.killed) {
    console.log('[Service] Scraper is already running.');
    return;
  }

  console.log('[Service] Starting Python scraper script...');
  // Use '-u' for unbuffered output to see logs in real-time.
  scraperProcess = spawn('python', ['-u', 'scraper.py'], {
    // The CWD will be the root of the 'news-scraper' directory.
    cwd: process.cwd(),
  });

  // Log standard output from the scraper
  scraperProcess.stdout?.on('data', (data) => {
    console.log(`[Scraper] ${data.toString().trim()}`);
  });

  // Log errors from the scraper
  scraperProcess.stderr?.on('data', (data) => {
    console.error(`[Scraper ERROR] ${data.toString().trim()}`);
  });

  // Handle process exit
  scraperProcess.on('exit', (code, signal) => {
    console.log(`[Service] Scraper process exited with code ${code} and signal ${signal}.`);
    // Optional: auto-restart the scraper after a delay
    setTimeout(startScraper, 30000); // Restart after 30 seconds
  });

  scraperProcess.on('error', (err) => {
    console.error('[Service] Failed to start scraper process:', err);
  });
}

// Simple health check endpoint to keep the web service alive.
app.get('/', (req, res) => {
  res.status(200).send({
    status: 'ok',
    scraperRunning: scraperProcess !== null && !scraperProcess.killed,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[Service] Web server listening on port ${PORT}.`);
  console.log('[Service] This server exists to keep the Render service alive.');

  // Start the scraper for the first time
  startScraper();
});
