import { SecurityIssue, AuditResult, Severity } from './types';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 12, // Balanced: more than 10 but not too harsh
  high: 7,
  medium: 4,
  low: 1,
};

export function scoreEngine(issues: SecurityIssue[], durationMs: number): AuditResult {
  const totalWeight = issues.reduce((sum, issue) => sum + SEVERITY_WEIGHTS[issue.severity], 0);
  
  // If all issues are from injection simulator only (potential false positives), be more lenient
  const allInjectionSim = issues.length > 0 && issues.every(i => i.type.startsWith('injection-sim'));
  const hasCriticalIssues = issues.some(i => i.severity === 'critical');
  const hasRealThreats = issues.some(i => 
    i.severity === 'critical' && !i.type.startsWith('injection-sim')
  );
  
  // Apply lenience ONLY if: all injection-sim AND no critical issues
  // (Don't apply lenience for critical injection-sim findings - those are real threats)
  const lenience = (allInjectionSim && !hasCriticalIssues) ? 0.6 : 1.0;
  const adjustedWeight = Math.round(totalWeight * lenience);
  
  const securityScore = Math.max(0, 100 - adjustedWeight);

  let riskLevel: AuditResult['riskLevel'];
  if (securityScore >= 90) riskLevel = 'Low';
  else if (securityScore >= 70) riskLevel = 'Moderate';
  else if (securityScore >= 40) riskLevel = 'High';
  else riskLevel = 'Critical';

  return { securityScore, riskLevel, issues, scanDurationMs: durationMs };
}
