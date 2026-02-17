export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityIssue {
  type: string;
  severity: Severity;
  description: string;
  exploitScenario: string;
  fix: string;
  // AI-enhanced fields (optional)
  aiConfidence?: number; // 0-100
  aiExplanation?: string;
  falsePositive?: boolean;
  contextNotes?: string;
}

export interface AuditResult {
  securityScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  issues: SecurityIssue[];
  scanDurationMs: number;
}
