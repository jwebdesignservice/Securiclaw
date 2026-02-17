/**
 * AI Service - OpenCLAW Integration
 * Provides AI-powered security analysis via OpenCLAW
 */

import fetch from 'node-fetch';

// OpenCLAW configuration
const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://localhost:3000/api';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || '';

/**
 * Analyze a security issue with AI
 */
export async function analyzeIssueWithAI(code, issue) {
  const prompt = buildAnalysisPrompt(issue, extractSnippet(code, issue));
  
  try {
    const response = await callOpenClawAI(prompt);
    return parseAIResponse(response);
  } catch (error) {
    console.error('[AI] Analysis failed:', error);
    // Return safe fallback
    return {
      confidence: 50,
      falsePositive: false,
      severity: issue.severity,
      explanation: 'AI analysis unavailable - using deterministic results',
    };
  }
}

/**
 * Detect additional vulnerabilities with AI
 */
export async function detectAdditionalVulnerabilities(code) {
  const prompt = buildDetectionPrompt(code);
  
  try {
    const response = await callOpenClawAI(prompt);
    return parseAdditionalIssues(response);
  } catch (error) {
    console.error('[AI] Additional detection failed:', error);
    return [];
  }
}

/**
 * Call OpenCLAW AI API
 */
async function callOpenClawAI(prompt) {
  // Method 1: OpenCLAW REST API (if available)
  if (OPENCLAW_API_URL && OPENCLAW_API_KEY) {
    const response = await fetch(`${OPENCLAW_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify({
        message: prompt,
        model: 'claude-sonnet-4',
        temperature: 0.3, // Low temperature for consistent analysis
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenCLAW API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content || data.message || '';
  }
  
  // Method 2: Direct Anthropic API fallback
  // (Only if OpenCLAW not available and you have direct API key)
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  }
  
  throw new Error('No AI service configured. Set OPENCLAW_API_URL or ANTHROPIC_API_KEY environment variable.');
}

function buildAnalysisPrompt(issue, snippet) {
  return `Security Finding Analysis:

**Issue Type:** ${issue.type}
**Current Severity:** ${issue.severity}
**Description:** ${issue.description}

**Code Snippet:**
\`\`\`javascript
${snippet}
\`\`\`

Analyze this finding and respond ONLY with JSON (no markdown, no explanation):

{
  "confidence": 0-100,
  "falsePositive": true/false,
  "severity": "critical"|"high"|"medium"|"low",
  "explanation": "Why this is dangerous or safe in this context",
  "contextNotes": "Additional relevant context (optional)"
}

Consider:
- Is there validation or sanitization present?
- Are framework protections (DOMPurify, parameterized queries) used?
- Is the severity appropriate for this context?
- Is this a false positive?`;
}

function buildDetectionPrompt(code) {
  const truncated = code.length > 5000 ? code.substring(0, 5000) + '\n...[truncated]' : code;
  
  return `Analyze this code for security vulnerabilities that pattern-based scanners might miss:

\`\`\`javascript
${truncated}
\`\`\`

Look for:
- Business logic flaws (auth bypass, race conditions)
- Subtle injection vectors
- Timing attacks
- Information disclosure
- Context-dependent vulnerabilities

Respond ONLY with JSON array (no markdown):

[
  {
    "type": "ai-business-logic",
    "severity": "critical"|"high"|"medium"|"low",
    "description": "Brief description",
    "exploitScenario": "How attacker exploits this",
    "fix": "How to fix it",
    "confidence": 0-100
  }
]

If no additional issues found, return: []`;
}

function extractSnippet(code, issue) {
  const lines = code.split('\n');
  
  // Find lines containing keywords from the issue
  const keywords = extractKeywords(issue);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (keywords.some(kw => line.includes(kw))) {
      // Return context: 2 lines before and 3 after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 4);
      return lines.slice(start, end).join('\n');
    }
  }
  
  // Fallback: first 10 lines
  return lines.slice(0, 10).join('\n');
}

function extractKeywords(issue) {
  const keywords = [];
  
  if (issue.type.includes('eval')) keywords.push('eval');
  if (issue.type.includes('function')) keywords.push('Function');
  if (issue.type.includes('sql')) keywords.push('query', 'SELECT', 'INSERT');
  if (issue.type.includes('xss')) keywords.push('innerHTML', 'outerHTML', 'document.write');
  if (issue.type.includes('exec')) keywords.push('exec', 'spawn');
  if (issue.type.includes('fetch')) keywords.push('fetch', 'axios');
  if (issue.type.includes('timeout')) keywords.push('setTimeout', 'setInterval');
  
  return keywords;
}

function parseAIResponse(response) {
  try {
    // Remove markdown code blocks if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      confidence: parsed.confidence || 50,
      falsePositive: parsed.falsePositive || false,
      severity: parsed.severity || 'medium',
      explanation: parsed.explanation || 'No explanation provided',
      contextNotes: parsed.contextNotes,
    };
  } catch (error) {
    console.error('[AI] Response parsing failed:', error);
    console.error('[AI] Response was:', response);
    return {
      confidence: 50,
      falsePositive: false,
      severity: 'medium',
      explanation: 'AI response parsing failed',
    };
  }
}

function parseAdditionalIssues(response) {
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map(item => ({
      type: item.type || 'ai-detected',
      severity: item.severity || 'medium',
      description: item.description || 'AI-detected issue',
      exploitScenario: item.exploitScenario || 'Unknown exploit scenario',
      fix: item.fix || 'Review and remediate',
      aiConfidence: item.confidence || 50,
    }));
  } catch (error) {
    console.error('[AI] Additional issues parsing failed:', error);
    return [];
  }
}
