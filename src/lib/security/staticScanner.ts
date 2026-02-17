import { SecurityIssue } from './types';

interface Pattern {
  regex: RegExp;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  exploitScenario: string;
  fix: string;
}

const patterns: Pattern[] = [
  {
    regex: /eval\s*\(/g,
    type: 'eval-usage',
    severity: 'critical',
    description: 'Use of eval() detected. Allows arbitrary code execution.',
    exploitScenario: 'An attacker could inject malicious code via user input passed to eval(), gaining full control of the execution context.',
    fix: 'Replace eval() with JSON.parse() for data, or use Function constructors with strict input validation.',
  },
  {
    regex: /new\s+Function\s*\(/g,
    type: 'new-function',
    severity: 'critical',
    description: 'new Function() constructor detected. Similar risk to eval().',
    exploitScenario: 'Dynamically constructed functions can execute injected payloads, bypassing CSP in some configurations.',
    fix: 'Avoid dynamic function creation. Use predefined functions or a safe interpreter.',
  },
  {
    regex: /child_process/g,
    type: 'child-process',
    severity: 'critical',
    description: 'Reference to child_process module detected. Enables OS command execution.',
    exploitScenario: 'Attacker could execute arbitrary shell commands on the server, leading to full system compromise.',
    fix: 'Avoid child_process. Use purpose-built libraries with input sanitization if shell access is absolutely required.',
  },
  {
    regex: /process\.env/g,
    type: 'process-env',
    severity: 'critical', // Elevated from 'high' to 'critical'
    description: 'Access to process.env detected - potential secret exfiltration.',
    exploitScenario: 'Environment variables contain sensitive secrets (API keys, DB passwords). If sent externally, all secrets are compromised.',
    fix: 'Never access process.env in user-facing code. Use proper secret management and never log or transmit env vars.',
  },
  {
    regex: /require\s*\(\s*['"]fs['"]\s*\)/g,
    type: 'fs-access',
    severity: 'high',
    description: 'File system access via require("fs") detected.',
    exploitScenario: 'Attacker could read sensitive files (/etc/passwd, .env) or write malicious files to the server.',
    fix: 'Restrict file operations to a sandboxed directory. Validate all file paths against a whitelist.',
  },
  {
    regex: /require\s*\(\s*['"]net['"]\s*\)/g,
    type: 'net-access',
    severity: 'high',
    description: 'Network module require("net") detected. Enables raw socket connections.',
    exploitScenario: 'Attacker could open reverse shells, exfiltrate data, or pivot to internal network services.',
    fix: 'Use higher-level HTTP libraries instead. Restrict network access with firewall rules.',
  },
  {
    regex: /fetch\s*\(/g,
    type: 'fetch-usage',
    severity: 'medium',
    description: 'fetch() call detected. Verify URL source is trusted.',
    exploitScenario: 'SSRF attacks if URL is user-controlled; data exfiltration to attacker-controlled endpoints.',
    fix: 'Validate and whitelist URLs. Never pass unsanitized user input as fetch target.',
  },
  {
    regex: /axios\s*[.(]/g,
    type: 'axios-usage',
    severity: 'medium',
    description: 'axios HTTP client usage detected. Verify URL source is trusted.',
    exploitScenario: 'Similar SSRF and data exfiltration risks as fetch if URLs are dynamically constructed.',
    fix: 'Use a URL whitelist. Validate all request targets before sending.',
  },
  {
    regex: /\.innerHTML\s*=/g,
    type: 'xss-innerhtml',
    severity: 'critical',
    description: 'innerHTML assignment detected - XSS vulnerability if content is user-controlled.',
    exploitScenario: 'Attacker injects <script> tags or event handlers (onerror, onclick) to execute arbitrary JavaScript in victim browsers.',
    fix: 'Use textContent for plain text, or DOMPurify/sanitize-html to clean user input before rendering.',
  },
  {
    regex: /\.outerHTML\s*=/g,
    type: 'xss-outerhtml',
    severity: 'critical',
    description: 'outerHTML assignment detected - XSS vulnerability if content is user-controlled.',
    exploitScenario: 'Similar to innerHTML but replaces entire element. Attackers can inject malicious HTML/scripts.',
    fix: 'Avoid outerHTML with user data. Use safe DOM manipulation methods or sanitize input.',
  },
  {
    regex: /document\.write\s*\(/g,
    type: 'xss-document-write',
    severity: 'critical',
    description: 'document.write() detected - dangerous XSS vector and blocks page rendering.',
    exploitScenario: 'Attacker injects scripts that execute immediately. Also causes performance issues.',
    fix: 'Never use document.write(). Use modern DOM APIs (appendChild, textContent) instead.',
  },
  {
    regex: /insertAdjacentHTML\s*\(/g,
    type: 'xss-insert-adjacent',
    severity: 'critical',
    description: 'insertAdjacentHTML() detected - XSS vulnerability if content is user-controlled.',
    exploitScenario: 'Attacker injects HTML/scripts at arbitrary positions in the DOM.',
    fix: 'Use insertAdjacentText() for plain text, or sanitize HTML with DOMPurify before inserting.',
  },
  {
    regex: /setTimeout\s*\(\s*['"`]/g,
    type: 'settimeout-string',
    severity: 'critical',
    description: 'setTimeout() with string literal detected - code injection risk.',
    exploitScenario: 'String-based setTimeout is equivalent to eval() - arbitrary code execution.',
    fix: 'Always pass a function to setTimeout, never a string. Use () => yourFunction() syntax.',
  },
  {
    regex: /setInterval\s*\(\s*['"`]/g,
    type: 'setinterval-string',
    severity: 'critical',
    description: 'setInterval() with string literal detected - code injection risk.',
    exploitScenario: 'String-based setInterval is eval() in disguise. User input can execute arbitrary code.',
    fix: 'Always pass a function to setInterval, never a string. Use () => yourFunction() syntax.',
  },
  {
    regex: /http\.request\s*\(/g,
    type: 'http-request',
    severity: 'high',
    description: 'http.request() detected - SSRF risk if URL/host is user-controlled.',
    exploitScenario: 'Attacker could make requests to internal services, cloud metadata endpoints (AWS 169.254.169.254), or exfiltrate data.',
    fix: 'Validate and whitelist all request destinations. Never pass user input directly to host/path.',
  },
  {
    regex: /https\.request\s*\(/g,
    type: 'https-request',
    severity: 'high',
    description: 'https.request() detected - SSRF risk if URL/host is user-controlled.',
    exploitScenario: 'Same SSRF risks as http.request. Can target internal HTTPS services.',
    fix: 'Validate and whitelist all request destinations. Implement strict URL validation.',
  },
  {
    regex: /\$where\s*:/g,
    type: 'nosql-where',
    severity: 'critical',
    description: 'MongoDB $where operator detected - NoSQL injection and arbitrary code execution risk.',
    exploitScenario: '$where allows JavaScript execution in MongoDB. Attacker can inject malicious code or extract entire database.',
    fix: 'Never use $where. Use standard query operators ($eq, $gt, etc.) which are safe and faster.',
  },
  {
    regex: /\.(find|findOne)\s*\(\s*\{[^}]*:\s*[a-zA-Z_]\w*[^}]*\}\s*\)/g,
    type: 'nosql-query',
    severity: 'high',
    description: 'NoSQL query with variable detected - potential NoSQL injection.',
    exploitScenario: 'If user input contains operators like {$gt: ""}, attacker can bypass authentication or extract data.',
    fix: 'Validate input types. Use parameterized queries or sanitize objects to remove $ operators.',
  },
  {
    regex: /res\.redirect\s*\(/g,
    type: 'open-redirect',
    severity: 'high',
    description: 'res.redirect() detected - open redirect vulnerability if URL is user-controlled.',
    exploitScenario: 'Attacker crafts phishing links (yoursite.com/redirect?url=evil.com) that redirect users to malicious sites.',
    fix: 'Validate redirect URLs against a whitelist. Never redirect to user-supplied URLs directly.',
  },
  {
    regex: /setHeader\s*\(\s*['"`]Location['"`]/g,
    type: 'location-header',
    severity: 'high',
    description: 'Location header manipulation detected - open redirect risk.',
    exploitScenario: 'Manually setting Location header with user input enables phishing attacks.',
    fix: 'Validate redirect destinations. Use relative paths or whitelist allowed domains.',
  },
  {
    regex: /(fetch|axios|request|https?\.request).*['"`](https?:\/\/[^'"`,]+)(evil|attacker|malicious|bad|hack|exploit)[^'"`,]*['"`]/gi,
    type: 'ssrf-malicious-domain',
    severity: 'critical',
    description: 'HTTP request to suspicious domain detected (contains "evil", "attacker", etc.)',
    exploitScenario: 'Data exfiltration to attacker-controlled server - may be stealing secrets or user data.',
    fix: 'Remove requests to suspicious domains. This appears to be malicious code.',
  },
];

export function staticScanner(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    const matches = code.match(pattern.regex);
    if (matches) {
      issues.push({
        type: pattern.type,
        severity: pattern.severity,
        description: pattern.description,
        exploitScenario: pattern.exploitScenario,
        fix: pattern.fix,
      });
    }
  }

  return issues;
}
