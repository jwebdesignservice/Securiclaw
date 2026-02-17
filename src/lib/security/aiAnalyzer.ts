import { SecurityIssue } from './types';

interface AIAnalysisResult {
  confidence: number; // 0-100
  explanation: string;
  severity: SecurityIssue['severity'];
  falsePositive: boolean;
  contextNotes?: string;
}

/**
 * AI-powered contextual analysis of security findings.
 * Reviews deterministic findings and adds human-like reasoning.
 */
export async function analyzeWithAI(
  code: string,
  issues: SecurityIssue[]
): Promise<SecurityIssue[]> {
  // If no OpenCLAW session available, return issues unchanged
  if (!isAIAvailable()) {
    return issues;
  }

  const enhancedIssues: SecurityIssue[] = [];

  for (const issue of issues) {
    try {
      const analysis = await analyzeIssue(code, issue);
      
      enhancedIssues.push({
        ...issue,
        severity: analysis.severity, // AI can adjust severity
        aiConfidence: analysis.confidence,
        aiExplanation: analysis.explanation,
        falsePositive: analysis.falsePositive,
        contextNotes: analysis.contextNotes,
      });
    } catch (error) {
      console.warn('[SECURICLAW] AI analysis failed for issue:', issue.type, error);
      // Keep original issue if AI fails
      enhancedIssues.push(issue);
    }
  }

  // AI can also detect additional issues missed by rules
  const additionalIssues = await detectAdditionalIssues(code);
  enhancedIssues.push(...additionalIssues);

  return enhancedIssues;
}

async function analyzeIssue(
  code: string,
  issue: SecurityIssue
): Promise<AIAnalysisResult> {
  try {
    // Call backend AI service directly with code and issue
    const response = await fetch('/api/ai/analyze-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, issue }),
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }
    
    const analysis = await response.json();
    
    return {
      confidence: analysis.confidence || 50,
      falsePositive: analysis.falsePositive || false,
      severity: analysis.severity || issue.severity,
      explanation: analysis.explanation || 'No AI explanation available',
      contextNotes: analysis.contextNotes,
    };
  } catch (error) {
    console.warn('[SECURICLAW] AI analysis failed:', error);
    // Return safe fallback
    return {
      confidence: 50,
      falsePositive: false,
      severity: issue.severity,
      explanation: 'AI service unavailable - using deterministic results',
    };
  }
}

async function detectAdditionalIssues(code: string): Promise<SecurityIssue[]> {
  try {
    const response = await fetch('/api/ai/detect-additional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.warn('[SECURICLAW] Additional AI detection failed:', error);
    return [];
  }
}

function buildAnalysisPrompt(issue: SecurityIssue, snippet: string): string {
  return `Security Finding Analysis:

**Issue Type:** ${issue.type}
**Current Severity:** ${issue.severity}
**Description:** ${issue.description}

**Code Snippet:**
\`\`\`javascript
${snippet}
\`\`\`

Analyze this finding:

1. **Confidence (0-100):** How confident are you this is a real vulnerability?
2. **False Positive:** Is this likely a false positive? (true/false)
3. **Severity Adjustment:** Should severity be adjusted? (critical/high/medium/low)
4. **Explanation:** Why is this dangerous (or safe) in this context?
5. **Context Notes:** Any additional context that matters?

Respond in JSON:
{
  "confidence": 85,
  "falsePositive": false,
  "severity": "critical",
  "explanation": "This is dangerous because...",
  "contextNotes": "Additional context..."
}`;
}

function extractRelevantSnippet(code: string, issue: SecurityIssue): string {
  // Try to find the problematic code pattern
  const lines = code.split('\n');
  
  // Simple heuristic: find lines containing key terms from the issue
  const keywords = extractKeywords(issue);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (keywords.some(kw => line.includes(kw))) {
      // Return context: 2 lines before and after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      return lines.slice(start, end).join('\n');
    }
  }
  
  // Fallback: first 10 lines
  return lines.slice(0, 10).join('\n');
}

function extractKeywords(issue: SecurityIssue): string[] {
  const keywords: string[] = [];
  
  if (issue.type.includes('eval')) keywords.push('eval');
  if (issue.type.includes('function')) keywords.push('Function');
  if (issue.type.includes('sql')) keywords.push('query', 'SELECT', 'INSERT');
  if (issue.type.includes('xss')) keywords.push('innerHTML', 'outerHTML', 'document.write');
  if (issue.type.includes('exec')) keywords.push('exec', 'spawn');
  if (issue.type.includes('fetch')) keywords.push('fetch', 'axios');
  if (issue.type.includes('timeout')) keywords.push('setTimeout', 'setInterval');
  
  return keywords;
}

async function callAI(prompt: string): Promise<string> {
  // Call backend AI service
  try {
    const response = await fetch('/api/ai/analyze-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    console.warn('[SECURICLAW] AI service unavailable:', error);
    // Fallback to mock
    return JSON.stringify({
      confidence: 50,
      falsePositive: false,
      severity: 'medium',
      explanation: 'AI service unavailable - using deterministic results only',
    });
  }
}

function parseAIResponse(response: string): AIAnalysisResult {
  try {
    const parsed = JSON.parse(response);
    return {
      confidence: parsed.confidence || 50,
      falsePositive: parsed.falsePositive || false,
      severity: parsed.severity || 'medium',
      explanation: parsed.explanation || 'No AI explanation available',
      contextNotes: parsed.contextNotes,
    };
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      confidence: 50,
      falsePositive: false,
      severity: 'medium',
      explanation: 'AI response parsing failed - using deterministic severity',
    };
  }
}

function parseAdditionalIssues(response: string): SecurityIssue[] {
  try {
    const parsed = JSON.parse(response);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map((item: any) => ({
      type: item.type || 'ai-detected',
      severity: item.severity || 'medium',
      description: item.description || 'AI-detected issue',
      exploitScenario: item.exploitScenario || 'Unknown exploit scenario',
      fix: item.fix || 'Review and remediate',
      aiConfidence: item.confidence || 50,
    }));
  } catch (error) {
    return [];
  }
}

function isAIAvailable(): boolean {
  // Check if OpenCLAW AI is available
  return typeof globalThis !== 'undefined' && !!(globalThis as any).__OPENCLAW__;
}

// Export type extensions
declare module './types' {
  interface SecurityIssue {
    aiConfidence?: number;
    aiExplanation?: string;
    falsePositive?: boolean;
    contextNotes?: string;
  }
}
