import { staticScanner } from './staticScanner';
import { astScanner } from './astScanner';
import { executionRiskDetector } from './executionRiskDetector';
import { permissionAnalyzer } from './permissionAnalyzer';
import { endpointAnalyzer } from './endpointAnalyzer';
import { injectionSimulator } from './injectionSimulator';
import { dependencyEvaluator } from './dependencyEvaluator';
import { scoreEngine } from './scoreEngine';
import { analyzeWithAI } from './aiAnalyzer';
import { AuditResult, SecurityIssue } from './types';

/**
 * SECURICLAW — Main Audit Engine
 * Orchestrates all security scanning modules
 */

/**
 * Deterministic audit (fast, synchronous)
 */
export function runAudit(code: string): AuditResult {
  // Input validation
  if (!code || code.trim().length === 0) {
    throw new Error('Code input is empty.');
  }
  if (code.length > 5_000_000) { // 5MB limit
    throw new Error('Code exceeds maximum length of 5,000,000 characters.');
  }
  if (/\0/.test(code)) {
    throw new Error('Code contains null bytes.');
  }

  const start = performance.now();

  try {
    // Run all detection modules in parallel
    const [
      staticIssues,
      astIssues,
      executionRisks,
      permissionIssues,
      endpointIssues,
      injectionIssues,
      dependencyIssues,
    ] = [
      staticScanner(code),
      astScanner(code),
      executionRiskDetector(code),
      permissionAnalyzer(code),
      endpointAnalyzer(code),
      injectionSimulator(code),
      dependencyEvaluator(code),
    ];

    // Combine all findings
    const allIssues = [
      ...staticIssues,
      ...astIssues,
      ...executionRisks,
      ...permissionIssues,
      ...endpointIssues,
      ...injectionIssues,
      ...dependencyIssues,
    ];

    // Deduplicate by type
    const seen = new Set<string>();
    const combined = allIssues.filter((issue) => {
      if (seen.has(issue.type)) return false;
      seen.add(issue.type);
      return true;
    });

    const duration = performance.now() - start;

    console.log(`[SECURICLAW] Full scan completed in ${duration.toFixed(1)}ms — ${combined.length} issue(s) found`);
    console.log(`[SECURICLAW] Modules: Static=${staticIssues.length} AST=${astIssues.length} Exec=${executionRisks.length} Perm=${permissionIssues.length} Endpoint=${endpointIssues.length} Injection=${injectionIssues.length} Deps=${dependencyIssues.length}`);

    return scoreEngine(combined, duration);
  } catch (e) {
    const duration = performance.now() - start;
    console.error('[SECURICLAW] Audit error:', e);
    throw e;
  }
}

/**
 * AI-enhanced audit (slower, but more accurate with context)
 * Runs deterministic scan first, then adds AI analysis
 */
export async function runAuditWithAI(code: string): Promise<AuditResult> {
  // Run deterministic scan first
  const baseResult = runAudit(code);
  
  try {
    // Enhance with AI analysis
    const enhancedIssues = await analyzeWithAI(code, baseResult.issues);
    
    // Recalculate score with AI-adjusted severities
    const aiResult = scoreEngine(enhancedIssues, baseResult.scanDurationMs);
    
    console.log(`[SECURICLAW] AI analysis complete — ${enhancedIssues.length} issues (${enhancedIssues.length - baseResult.issues.length} AI-detected)`);
    
    return aiResult;
  } catch (error) {
    console.warn('[SECURICLAW] AI analysis failed, returning deterministic results:', error);
    return baseResult;
  }
}

export type { AuditResult, SecurityIssue } from './types';
export { analyzeWithAI } from './aiAnalyzer';
