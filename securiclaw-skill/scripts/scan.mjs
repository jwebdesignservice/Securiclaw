#!/usr/bin/env node
/**
 * Securiclaw CLI Scanner
 * Scan JavaScript/TypeScript code for security vulnerabilities
 * 
 * Usage:
 *   node scan.mjs <file.js>           - Scan a file
 *   node scan.mjs --code "eval(x)"    - Scan inline code
 *   node scan.mjs <file> --json       - Output as JSON
 *   node scan.mjs <file> --exit-on-fail  - Exit 1 if score < 70
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, extname } from 'path';

// ============================================
// SECURITY SCANNER (Self-contained)
// ============================================

const SEVERITY_WEIGHTS = { critical: 12, high: 7, medium: 4, low: 1 };

// Static patterns
const PATTERNS = [
  { regex: /eval\s*\(/g, type: 'eval-usage', severity: 'critical', description: 'Use of eval() detected. Allows arbitrary code execution.', fix: 'Replace eval() with JSON.parse() for data, or use Function constructors with strict input validation.' },
  { regex: /new\s+Function\s*\(/g, type: 'new-function', severity: 'critical', description: 'new Function() constructor detected. Similar risk to eval().', fix: 'Avoid dynamic function creation. Use predefined functions or a safe interpreter.' },
  { regex: /child_process/g, type: 'child-process', severity: 'critical', description: 'Reference to child_process module detected. Enables OS command execution.', fix: 'Avoid child_process. Use purpose-built libraries with input sanitization if shell access is absolutely required.' },
  { regex: /process\.env/g, type: 'process-env', severity: 'critical', description: 'Access to process.env detected - potential secret exfiltration.', fix: 'Never access process.env in user-facing code. Use proper secret management.' },
  { regex: /\.innerHTML\s*=/g, type: 'xss-innerhtml', severity: 'critical', description: 'innerHTML assignment detected - XSS vulnerability if content is user-controlled.', fix: 'Use textContent for plain text, or DOMPurify/sanitize-html to clean user input.' },
  { regex: /\.outerHTML\s*=/g, type: 'xss-outerhtml', severity: 'critical', description: 'outerHTML assignment detected - XSS vulnerability.', fix: 'Avoid outerHTML with user data. Use safe DOM manipulation methods.' },
  { regex: /document\.write\s*\(/g, type: 'xss-document-write', severity: 'critical', description: 'document.write() detected - dangerous XSS vector.', fix: 'Never use document.write(). Use modern DOM APIs instead.' },
  { regex: /insertAdjacentHTML\s*\(/g, type: 'xss-insert-adjacent', severity: 'critical', description: 'insertAdjacentHTML() detected - XSS vulnerability.', fix: 'Use insertAdjacentText() for plain text, or sanitize HTML with DOMPurify.' },
  { regex: /setTimeout\s*\(\s*['"`]/g, type: 'settimeout-string', severity: 'critical', description: 'setTimeout() with string literal detected - code injection risk.', fix: 'Always pass a function to setTimeout, never a string.' },
  { regex: /setInterval\s*\(\s*['"`]/g, type: 'setinterval-string', severity: 'critical', description: 'setInterval() with string literal detected - code injection risk.', fix: 'Always pass a function to setInterval, never a string.' },
  { regex: /\$where\s*:/g, type: 'nosql-where', severity: 'critical', description: 'MongoDB $where operator detected - NoSQL injection and code execution risk.', fix: 'Never use $where. Use standard query operators ($eq, $gt, etc.).' },
  { regex: /res\.redirect\s*\(/g, type: 'open-redirect', severity: 'high', description: 'res.redirect() detected - open redirect vulnerability if URL is user-controlled.', fix: 'Validate redirect URLs against a whitelist.' },
  { regex: /http\.request\s*\(/g, type: 'http-request', severity: 'high', description: 'http.request() detected - SSRF risk if URL/host is user-controlled.', fix: 'Validate and whitelist all request destinations.' },
  { regex: /fetch\s*\(/g, type: 'fetch-usage', severity: 'medium', description: 'fetch() call detected. Verify URL source is trusted.', fix: 'Validate and whitelist URLs. Never pass unsanitized user input as fetch target.' },
  { regex: /axios\s*[.(]/g, type: 'axios-usage', severity: 'medium', description: 'axios HTTP client usage detected. Verify URL source is trusted.', fix: 'Use a URL whitelist. Validate all request targets before sending.' },
  { regex: /require\s*\(\s*['"]fs['"]\s*\)/g, type: 'fs-access', severity: 'high', description: 'File system access via require("fs") detected.', fix: 'Restrict file operations to a sandboxed directory. Validate all file paths.' },
];

// Injection patterns
const INJECTION_PATTERNS = [
  { regex: /(['"`])\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+.{0,50}\1\s*\+/gi, type: 'injection-sim-sql', severity: 'critical', description: 'SQL query with string concatenation detected', fix: 'Use parameterized queries or prepared statements.' },
  { regex: /(innerHTML|outerHTML)\s*=\s*[^;]*\+/g, type: 'injection-sim-xss', severity: 'critical', description: 'Dynamic HTML insertion with concatenation', fix: 'Use textContent for text or sanitize with DOMPurify.' },
  { regex: /(exec|spawn|execSync|spawnSync)\s*\([^)]*\+/g, type: 'injection-sim-command', severity: 'critical', description: 'Shell command with string concatenation', fix: 'Avoid shell commands with user input. Use arrays for arguments.' },
  { regex: /(readFile|writeFile|readdir|unlink)\s*\([^)]*\+/g, type: 'injection-sim-path-traversal', severity: 'high', description: 'File operation with concatenated path', fix: 'Use path.join() and validate paths against a base directory.' },
  { regex: /JSON\.parse\s*\(\s*[a-zA-Z_$][\w$]*\s*\)/g, type: 'injection-sim-json-parse', severity: 'high', description: 'JSON.parse without validation or try/catch', fix: 'Wrap JSON.parse in try/catch and validate input structure.' },
  { regex: /for\s*\(\s*(let|var|const)?\s*\w+\s+in\s+/g, type: 'injection-sim-forin', severity: 'critical', description: 'for...in loop without hasOwnProperty check - prototype pollution risk', fix: 'Use Object.hasOwnProperty() or Object.keys() instead.' },
];

function staticScanner(code) {
  const issues = [];
  const seen = new Set();
  
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(code) && !seen.has(pattern.type)) {
      seen.add(pattern.type);
      issues.push({
        type: pattern.type,
        severity: pattern.severity,
        description: pattern.description,
        fix: pattern.fix,
      });
    }
    pattern.regex.lastIndex = 0;
  }
  
  return issues;
}

function injectionScanner(code) {
  const issues = [];
  const seen = new Set();
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(code) && !seen.has(pattern.type)) {
      seen.add(pattern.type);
      issues.push({
        type: pattern.type,
        severity: pattern.severity,
        description: pattern.description,
        fix: pattern.fix,
      });
    }
    pattern.regex.lastIndex = 0;
  }
  
  return issues;
}

function runAudit(code) {
  if (!code || code.trim().length === 0) {
    return { securityScore: 100, riskLevel: 'Low', issues: [], scanDurationMs: 0 };
  }
  
  const start = performance.now();
  
  const staticIssues = staticScanner(code);
  const injectionIssues = injectionScanner(code);
  
  // Combine and deduplicate
  const allIssues = [...staticIssues, ...injectionIssues];
  const seen = new Set();
  const issues = allIssues.filter(issue => {
    if (seen.has(issue.type)) return false;
    seen.add(issue.type);
    return true;
  });
  
  // Calculate score
  const totalWeight = issues.reduce((sum, issue) => sum + SEVERITY_WEIGHTS[issue.severity], 0);
  const securityScore = Math.max(0, 100 - totalWeight);
  
  let riskLevel;
  if (securityScore >= 90) riskLevel = 'Low';
  else if (securityScore >= 70) riskLevel = 'Moderate';
  else if (securityScore >= 40) riskLevel = 'High';
  else riskLevel = 'Critical';
  
  return {
    securityScore,
    riskLevel,
    issues,
    scanDurationMs: performance.now() - start,
  };
}

// ============================================
// CLI
// ============================================

function printUsage() {
  console.log(`
Securiclaw - Code Security Scanner
==================================

Usage:
  node scan.mjs <file.js>              Scan a file
  node scan.mjs <directory>            Scan all JS/TS files in directory
  node scan.mjs --code "eval(x)"       Scan inline code
  
Options:
  --json              Output as JSON
  --exit-on-fail      Exit with code 1 if score < 70
  --help              Show this help

Examples:
  node scan.mjs app.js
  node scan.mjs src/ --json
  node scan.mjs --code "db.query('SELECT * FROM users WHERE id=' + id)"
`);
}

function formatTextOutput(result, filename = 'inline') {
  const severityColors = {
    critical: '\x1b[31m',
    high: '\x1b[33m',
    medium: '\x1b[34m',
    low: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  
  let output = `
SECURICLAW SCAN RESULTS
=======================
File: ${filename}
Score: ${result.securityScore}/100
Risk Level: ${result.riskLevel}
Issues Found: ${result.issues.length}
Scan Time: ${result.scanDurationMs.toFixed(1)}ms
`;

  if (result.issues.length === 0) {
    output += `\n✅ No security issues detected!\n`;
  } else {
    output += `\n`;
    for (const issue of result.issues) {
      const color = severityColors[issue.severity] || '';
      output += `${color}[${issue.severity.toUpperCase()}]${reset} ${issue.type}\n`;
      output += `  ${issue.description}\n`;
      output += `  Fix: ${issue.fix}\n\n`;
    }
  }
  
  return output;
}

function scanFile(filepath) {
  if (!existsSync(filepath)) {
    console.error(`Error: File not found: ${filepath}`);
    process.exit(1);
  }
  
  const code = readFileSync(filepath, 'utf8');
  return runAudit(code);
}

function scanDirectory(dirpath) {
  const results = [];
  const files = readdirSync(dirpath, { recursive: true });
  
  for (const file of files) {
    const filepath = join(dirpath, file);
    const ext = extname(filepath).toLowerCase();
    
    if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      try {
        const stat = statSync(filepath);
        if (stat.isFile()) {
          const result = scanFile(filepath);
          results.push({ file: filepath, ...result });
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }
  
  return results;
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  printUsage();
  process.exit(0);
}

const jsonOutput = args.includes('--json');
const exitOnFail = args.includes('--exit-on-fail');
const codeIndex = args.indexOf('--code');

let result;
let filename = 'inline';

if (codeIndex !== -1 && args[codeIndex + 1]) {
  // Inline code
  const code = args[codeIndex + 1];
  result = runAudit(code);
} else {
  // File or directory
  const target = args.find(arg => !arg.startsWith('--'));
  
  if (!target) {
    console.error('Error: No file or code provided');
    printUsage();
    process.exit(1);
  }
  
  filename = target;
  
  if (existsSync(target) && statSync(target).isDirectory()) {
    // Directory scan
    const results = scanDirectory(target);
    
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        console.log(formatTextOutput(r, r.file));
      }
    }
    
    const minScore = Math.min(...results.map(r => r.securityScore));
    if (exitOnFail && minScore < 70) {
      process.exit(1);
    }
    process.exit(0);
  }
  
  result = scanFile(target);
}

// Output
if (jsonOutput) {
  console.log(JSON.stringify({
    file: filename,
    score: result.securityScore,
    riskLevel: result.riskLevel,
    scanTimeMs: result.scanDurationMs,
    issues: result.issues,
  }, null, 2));
} else {
  console.log(formatTextOutput(result, filename));
}

// Exit code
if (exitOnFail && result.securityScore < 70) {
  process.exit(1);
}
