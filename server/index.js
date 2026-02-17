import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeIssueWithAI, detectAdditionalVulnerabilities } from './ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const db = new Database('securiclaw.db');
db.pragma('journal_mode = WAL');

// Create scans table
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT UNIQUE NOT NULL,
    code_hash TEXT NOT NULL,
    results JSON NOT NULL,
    engine_version TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    ip_address TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_scan_id ON scans(scan_id);
  CREATE INDEX IF NOT EXISTS idx_created_at ON scans(created_at);
`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rate limiting - 10 scans per IP per 10 minutes
const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many scans. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate unique scan ID
function generateScanId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SC-${timestamp}-${random}`;
}

// Generate code hash
function generateCodeHash(code) {
  return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    scans: db.prepare('SELECT COUNT(*) as count FROM scans').get().count,
  });
});

// Get scan by ID
app.get('/api/scan/:scanId', (req, res) => {
  const { scanId } = req.params;
  
  try {
    const scan = db.prepare('SELECT * FROM scans WHERE scan_id = ?').get(scanId);
    
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    res.json({
      scanId: scan.scan_id,
      codeHash: scan.code_hash,
      results: JSON.parse(scan.results),
      engineVersion: scan.engine_version,
      createdAt: scan.created_at,
    });
  } catch (error) {
    console.error('Error retrieving scan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new scan
app.post('/api/scan', scanLimiter, (req, res) => {
  const { code, results, engineVersion } = req.body;
  
  if (!code || !results || !engineVersion) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const scanId = generateScanId();
    const codeHash = generateCodeHash(code);
    const createdAt = Date.now();
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    db.prepare(`
      INSERT INTO scans (scan_id, code_hash, results, engine_version, created_at, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(scanId, codeHash, JSON.stringify(results), engineVersion, createdAt, ipAddress);
    
    res.status(201).json({
      scanId,
      codeHash,
      shareUrl: `/scan/${scanId}`,
    });
  } catch (error) {
    console.error('Error creating scan:', error);
    res.status(500).json({ error: 'Failed to save scan' });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(DISTINCT DATE(created_at / 1000, 'unixepoch')) as days_active
      FROM scans
    `).get();
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// AI Analysis endpoint
app.post('/api/ai/analyze-issue', async (req, res) => {
  const { code, issue } = req.body;
  
  if (!code || !issue) {
    return res.status(400).json({ error: 'Missing code or issue' });
  }
  
  try {
    const analysis = await analyzeIssueWithAI(code, issue);
    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      error: 'AI analysis failed',
      // Return safe fallback
      confidence: 50,
      falsePositive: false,
      severity: issue.severity,
      explanation: 'AI service unavailable - using deterministic results'
    });
  }
});

// AI Additional Detection endpoint
app.post('/api/ai/detect-additional', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }
  
  try {
    const additionalIssues = await detectAdditionalVulnerabilities(code);
    res.json({ issues: additionalIssues });
  } catch (error) {
    console.error('AI additional detection error:', error);
    res.json({ issues: [] }); // Return empty array on error
  }
});

// Cleanup old scans (older than 30 days)
function cleanupOldScans() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const result = db.prepare('DELETE FROM scans WHERE created_at < ?').run(thirtyDaysAgo);
  console.log(`[Cleanup] Removed ${result.changes} old scans`);
}

// Run cleanup daily
setInterval(cleanupOldScans, 24 * 60 * 60 * 1000);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🦞 Securiclaw API running on port ${PORT}`);
  console.log(`📊 Database: ${db.name}`);
  console.log(`🔒 Rate limit: 10 scans per 10 minutes`);
});

export default app;
