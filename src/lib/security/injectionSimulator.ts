import { SecurityIssue } from './types';

/**
 * Module D — Injection & Input Mutation Engine
 * Simulates: malformed payload injection, oversized JSON, nested structure injection,
 * escalation via unexpected fields, command-like string injection
 * NOTE: Simulation only. No actual execution.
 */

interface SimulatedPayload {
  name: string;
  type: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
}

const MALICIOUS_PAYLOADS: SimulatedPayload[] = [
  { name: 'SQL Injection', type: 'sql-injection', risk: 'critical' },
  { name: 'XSS Script Tag', type: 'xss-script', risk: 'critical' },
  { name: 'Command Injection', type: 'command-injection', risk: 'critical' },
  { name: 'Path Traversal', type: 'path-traversal', risk: 'high' },
  { name: 'Prototype Pollution', type: 'prototype-pollution', risk: 'high' },
  { name: 'NoSQL Injection', type: 'nosql-injection', risk: 'high' },
  { name: 'LDAP Injection', type: 'ldap-injection', risk: 'medium' },
  { name: 'XXE Attack', type: 'xxe', risk: 'high' },
];

export function injectionSimulator(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Common safe patterns that should not be flagged (reduce false positives)
  const safePatterns = [
    /export\s+(default\s+)?\{?[^}]*\}?;?\s*$/m, // export statements
    /return\s+items\.reduce\(/,  // Array reduce
    /const\s+regex\s*=\s*\/[^/]+\//, // Regex literals
    /throw\s+new\s+Error\(/,  // Error throwing
  ];

  // If code contains ONLY safe patterns and no dangerous ones, reduce sensitivity
  const hasDangerousPattern = /(eval|exec|spawn|innerHTML|process\.env|require\(|import\()/i.test(code);
  const hasOnlySafePatterns = !hasDangerousPattern && safePatterns.some(p => p.test(code));

  // Check for SQL query patterns without parameterization
  if (/(query|execute|exec|db\.run)\s*\(\s*['"`].*\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-sql',
      severity: 'critical',
      description: 'SQL query with string concatenation detected',
      exploitScenario: 'SQL injection vulnerability - simulated payload: \'; DROP TABLE users; --',
      fix: 'Use parameterized queries or prepared statements',
    });
  }

  // Check for HTML injection vulnerability
  if (/\.?(innerHTML|outerHTML|insertAdjacentHTML)\s*=/.test(code) && /(\$\{|\+|concat)/.test(code)) {
    issues.push({
      type: 'injection-sim-xss',
      severity: 'critical',
      description: 'Dynamic HTML insertion with concatenation',
      exploitScenario: 'XSS attack - simulated payload: <script>alert(document.cookie)</script>',
      fix: 'Use textContent or sanitize HTML with DOMPurify',
    });
  }

  // Check for command injection patterns
  if (/(exec|spawn|system)\s*\(\s*['"`].*\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-command',
      severity: 'critical',
      description: 'Shell command with string concatenation',
      exploitScenario: 'Command injection - simulated payload: ; rm -rf / #',
      fix: 'Avoid shell commands or use array arguments instead of string concatenation',
    });
  }

  // Check for path traversal vulnerability
  if (/(readFile|writeFile|unlink|stat)\s*\(\s*.*\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-path-traversal',
      severity: 'high',
      description: 'File operation with concatenated path',
      exploitScenario: 'Path traversal - simulated payload: ../../../../etc/passwd',
      fix: 'Validate and sanitize file paths. Use path.join() and path.resolve()',
    });
  }

  // Simulate nested structure injection
  if (/JSON\.parse\s*\(/.test(code)) {
    // Check for both try/catch AND validation
    const hasTryCatch = /try\s*\{[\s\S]{0,200}JSON\.parse/.test(code);
    const hasValidation = /schema\.validate|zod\.parse|validator|validate/i.test(code);
    
    if (!hasTryCatch && !hasValidation) {
      issues.push({
        type: 'injection-sim-json-bomb',
        severity: 'high',
        description: 'JSON.parse without validation or try/catch',
        exploitScenario: 'JSON bomb attack - deeply nested objects cause DoS: {"a":{"a":{"a":{...}}}}',
        fix: 'Wrap JSON.parse in try/catch and validate structure depth',
      });
    }
    
    // Additional check: JSON.parse of user input without any safety
    if (/JSON\.parse\s*\(\s*(req\.|request\.|userInput|user|data|payload|body)/.test(code)) {
      if (!hasValidation) {
        issues.push({
          type: 'injection-sim-parse-user-input',
          severity: 'critical',
          description: 'JSON.parse directly on user input without validation',
          exploitScenario: 'Attacker can send malicious JSON to exploit prototype pollution or cause DoS',
          fix: 'Always validate user input before JSON.parse. Use schema validation library',
        });
      }
    }
  }

  // Simulate prototype pollution
  if (/(Object\.assign|\.\.\.|\$\.extend)\s*\(\s*[^,]+,\s*\w+\)/.test(code)) {
    const hasSafeGuard = /__proto__|constructor|prototype/.test(code);
    if (!hasSafeGuard) {
      issues.push({
        type: 'injection-sim-prototype-pollution',
        severity: 'high',
        description: 'Object merge without prototype pollution protection',
        exploitScenario: 'Prototype pollution - simulated payload: {"__proto__":{"isAdmin":true}}',
        fix: 'Filter out __proto__, constructor, and prototype keys before merging',
      });
    }
  }

  // Detect for...in loop without prototype guards (CRITICAL for pollution)
  const forInMatches = code.matchAll(/for\s*\(\s*(?:let|const|var)?\s*\w+\s+in\s+\w+\s*\)/g);
  for (const match of forInMatches) {
    const matchIndex = match.index || 0;
    // Check the actual for...in block content, not the whole file
    const blockStart = matchIndex;
    const blockEnd = Math.min(code.length, matchIndex + 300);
    const forInBlock = code.substring(blockStart, blockEnd);
    
    const hasPrototypeGuard = /hasOwnProperty|Object\.hasOwn|Object\.keys|Object\.getOwnPropertyNames/.test(forInBlock);
    
    if (!hasPrototypeGuard) {
      issues.push({
        type: 'injection-sim-forin-pollution',
        severity: 'critical',
        description: 'for...in loop without hasOwnProperty check - prototype pollution risk',
        exploitScenario: 'Attacker can inject __proto__ properties that get copied to all objects',
        fix: 'Add if (obj.hasOwnProperty(key)) check inside for...in loop, or use Object.keys() instead',
      });
    }
  }

  // Detect recursive merge functions (common pollution pattern)
  if (/function\s+\w*\s*\([^)]*target[^)]*source[^)]*\)[\s\S]{0,300}for\s*\([^)]+in\s+source\)/i.test(code)) {
    // Look specifically within the merge function for hasOwnProperty check
    const mergeFunctionMatch = code.match(/function\s+\w*\s*\([^)]*target[^)]*source[^)]*\)[\s\S]{0,400}/i);
    const hasPrototypeCheck = mergeFunctionMatch && /hasOwnProperty|Object\.hasOwn/.test(mergeFunctionMatch[0]);
    
    if (!hasPrototypeCheck) {
      issues.push({
        type: 'injection-sim-recursive-merge',
        severity: 'critical',
        description: 'Recursive merge function without prototype pollution guards',
        exploitScenario: 'Classic prototype pollution vector - merging user input recursively without checks',
        fix: 'Add checks to reject __proto__, constructor, and prototype keys: if (key === "__proto__") continue;',
      });
    }
  }

  // Simulate NoSQL injection
  if (/(find|findOne|update|delete)\s*\(\s*\{[^}]*\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-nosql',
      severity: 'high',
      description: 'NoSQL query with string interpolation',
      exploitScenario: 'NoSQL injection - simulated payload: {"$ne": null} bypasses auth',
      fix: 'Sanitize user input before building NoSQL queries',
    });
  }

  // Check for eval-like patterns that could execute injected code
  if (/(setTimeout|setInterval)\s*\(\s*['"`].*\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-code-eval',
      severity: 'critical',
      description: 'setTimeout/setInterval with string argument',
      exploitScenario: 'Code injection - string will be evaluated as JavaScript',
      fix: 'Use function arguments instead of string code',
    });
  }

  // Simulate LDAP injection
  if (/ldap.*search|ldap.*filter/.test(code) && /\$\{|.*\+/.test(code)) {
    issues.push({
      type: 'injection-sim-ldap',
      severity: 'medium',
      description: 'LDAP query with string concatenation',
      exploitScenario: 'LDAP injection - simulated payload: *)(uid=*)) can bypass authentication',
      fix: 'Escape LDAP special characters in user input',
    });
  }

  // Simulate oversized payload attack
  if (!/length\s*>\s*\d+|maxLength|limit/.test(code) && /(req\.body|req\.query|req\.params)/.test(code)) {
    issues.push({
      type: 'injection-sim-oversized-payload',
      severity: 'medium',
      description: 'No size validation on request input',
      exploitScenario: 'Oversized payload DoS - attacker sends massive JSON to exhaust memory',
      fix: 'Add payload size limits (e.g., express.json({ limit: "1mb" }))',
    });
  }

  // Simulate regex DoS (ReDoS)
  const suspiciousRegexPatterns = [
    /new RegExp\s*\(\s*\w+/,  // Dynamic regex from variable
    /\/\([^)]*\)\+[^/]*\//,   // Nested quantifiers
    /\/\([^)]*\)\*[^/]*\//,   // Nested quantifiers
  ];

  for (const pattern of suspiciousRegexPatterns) {
    if (pattern.test(code)) {
      issues.push({
        type: 'injection-sim-redos',
        severity: 'medium',
        description: 'Potentially vulnerable regex pattern (ReDoS risk)',
        exploitScenario: 'Regex DoS - simulated payload with repeated patterns causes exponential backtracking',
        fix: 'Review regex complexity. Avoid nested quantifiers or use safe-regex library',
      });
      break; // Only report once
    }
  }

  // Simulate XXE attack
  if (/(xml2js|xml-parser|xmldom)/.test(code)) {
    const hasSafeConfig = /noent:\s*false|loadExternalDtd:\s*false/.test(code);
    if (!hasSafeConfig) {
      issues.push({
        type: 'injection-sim-xxe',
        severity: 'high',
        description: 'XML parser without entity expansion protection',
        exploitScenario: 'XXE attack - simulated payload can read local files via external entities',
        fix: 'Disable external entity processing in XML parser configuration',
      });
    }
  }

  return issues;
}
