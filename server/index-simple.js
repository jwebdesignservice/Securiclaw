/**
 * Simplified Securiclaw Backend (No Database)
 * For testing AI integration without SQLite build issues
 */

import express from 'express';
import cors from 'cors';
import { analyzeIssueWithAI, detectAdditionalVulnerabilities } from './ai-service.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    ai: !!process.env.OPENCLAW_API_KEY || !!process.env.ANTHROPIC_API_KEY,
  });
});

// AI Analysis endpoints
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
      confidence: 50,
      falsePositive: false,
      severity: issue.severity,
      explanation: 'AI service unavailable - using deterministic results'
    });
  }
});

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
    res.json({ issues: [] });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🦞 Securiclaw API (Simplified) running on port ${PORT}`);
  console.log(`🤖 AI: ${process.env.OPENCLAW_API_KEY || process.env.ANTHROPIC_API_KEY ? 'ENABLED' : 'DISABLED (set OPENCLAW_API_KEY or ANTHROPIC_API_KEY)'}`);
});
