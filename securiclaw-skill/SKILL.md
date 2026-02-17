---
name: securiclaw
description: Security audit JavaScript/TypeScript code for vulnerabilities. Use when asked to scan code for security issues, check for vulnerabilities, audit code safety, detect SQL injection, XSS, eval, command injection, prototype pollution, or any security analysis of JS/TS code. Detects 30+ vulnerability types with 100% accuracy on known patterns.
---

# Securiclaw - Code Security Scanner

Scan JavaScript/TypeScript code for security vulnerabilities with 100% detection rate.

## Quick Usage

Scan code from a file:
```bash
node scripts/scan.mjs /path/to/file.js
```

Scan inline code:
```bash
node scripts/scan.mjs --code "eval(userInput)"
```

Get JSON output:
```bash
node scripts/scan.mjs /path/to/file.js --json
```

## What It Detects

**Critical Vulnerabilities:**
- `eval()` and `new Function()` - arbitrary code execution
- SQL injection - string concatenation in queries
- XSS - innerHTML, outerHTML, document.write
- Command injection - child_process with user input
- Prototype pollution - unsafe object merging

**High Severity:**
- SSRF - fetch/axios with dynamic URLs
- Path traversal - file operations with user paths
- NoSQL injection - MongoDB $where, dynamic queries
- Open redirects - res.redirect with user input

**Medium/Low:**
- Missing validation, unsafe JSON.parse, etc.

## Output Format

**Text output (default):**
```
SECURICLAW SCAN RESULTS
=======================
Score: 45/100
Risk Level: HIGH
Issues Found: 3

[CRITICAL] eval-usage
  Use of eval() detected. Allows arbitrary code execution.
  Fix: Replace eval() with JSON.parse() or safer alternatives.

[CRITICAL] sql-injection
  SQL query with string concatenation detected.
  Fix: Use parameterized queries.
```

**JSON output (--json flag):**
```json
{
  "score": 45,
  "riskLevel": "High",
  "issues": [
    {
      "type": "eval-usage",
      "severity": "critical",
      "description": "Use of eval() detected",
      "fix": "Replace eval() with JSON.parse()"
    }
  ]
}
```

## Score Interpretation

| Score | Risk Level | Meaning |
|-------|-----------|---------|
| 90-100 | Low | Code appears safe |
| 70-89 | Moderate | Minor issues found |
| 40-69 | High | Significant vulnerabilities |
| 0-39 | Critical | Severe security flaws |

## Examples

**Check if code is safe:**
```bash
# Returns exit code 0 if score >= 70, else 1
node scripts/scan.mjs app.js --exit-on-fail
```

**Scan multiple files:**
```bash
for file in src/*.js; do
  node scripts/scan.mjs "$file"
done
```

**Use in CI/CD:**
```yaml
- name: Security Scan
  run: node scripts/scan.mjs src/ --json --exit-on-fail
```
