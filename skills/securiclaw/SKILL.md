---
name: securiclaw
description: AI-powered code security audit tool. Use when scanning code for vulnerabilities, security issues, XSS, SQL injection, SSRF, NoSQL injection, open redirects, or performing security analysis on JavaScript, TypeScript, Python, or other code files.
---

# SecuriClaw - Code Security Audit

## Overview

SecuriClaw provides comprehensive code security scanning with both pattern-based detection and AI-powered contextual analysis.

## When to Use

- Scanning code for security vulnerabilities
- Checking for XSS, SQL injection, SSRF, command injection
- Auditing JavaScript/TypeScript/Python code
- Reviewing code before deployment
- Identifying security issues in pull requests

## Usage

### Quick Scan

To scan code for vulnerabilities:

1. Paste the code to analyze
2. Request a security scan
3. Review findings with severity ratings

### Supported Vulnerability Types

- **Critical**: Remote code execution, SQL injection, command injection
- **High**: XSS, SSRF, path traversal, insecure deserialization
- **Medium**: Open redirects, information disclosure, weak crypto
- **Low**: Missing security headers, deprecated functions

## Web Interface

Access the SecuriClaw web app at: https://securiclaw.vercel.app

Features:
- Paste code directly for instant scanning
- View detailed vulnerability reports
- Share scan results via unique URLs
- Track scan history

## Integration

SecuriClaw can be used to:
- Audit code snippets on demand
- Review files before committing
- Scan entire project directories
- Generate security reports
