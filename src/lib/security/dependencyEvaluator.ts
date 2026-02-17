import { SecurityIssue } from './types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Module E — Dependency Risk Evaluator
 * Detects: unknown imports, dynamic remote imports, suspicious hardcoded URLs,
 * unverified external calls
 */

const KNOWN_SAFE_MODULES = new Set([
  // Standard Node.js modules
  'fs', 'path', 'http', 'https', 'crypto', 'util', 'stream', 'events',
  'buffer', 'url', 'querystring', 'assert', 'os', 'zlib',
  
  // Common safe packages
  'express', 'react', 'react-dom', 'vue', 'angular', 'next', 'nuxt',
  'lodash', 'axios', 'moment', 'date-fns', 'joi', 'yup', 'zod',
  'winston', 'pino', 'morgan', 'dotenv', 'bcrypt', 'jsonwebtoken',
  'mongoose', 'sequelize', 'typeorm', 'prisma',
]);

const DANGEROUS_MODULES = new Set([
  'vm', 'child_process', 'cluster', 'worker_threads', 'repl',
  'net', 'dgram', 'dns', 'tls', 'v8', 'process',
]);

const SUSPICIOUS_URL_PATTERNS = [
  /http:\/\/localhost/,
  /http:\/\/127\.0\.0\.1/,
  /http:\/\/0\.0\.0\.0/,
  /\.onion/,  // Tor hidden services
  /\.tk$/,    // Free TLD often used maliciously
  /bit\.ly|tinyurl|goo\.gl/,  // URL shorteners
  /pastebin|hastebin/,  // Code sharing sites
  /ngrok|localtunnel/,  // Tunneling services
];

export function dependencyEvaluator(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const imports: Set<string> = new Set();

  // Pattern-based detection for require() and import
  const requirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;

  while ((match = requirePattern.exec(code)) !== null) {
    const moduleName = match[1];
    imports.add(moduleName);

    // Check for dangerous modules
    if (DANGEROUS_MODULES.has(moduleName)) {
      issues.push({
        type: 'dep-dangerous-module',
        severity: 'critical',
        description: `Dangerous module imported: ${moduleName}`,
        exploitScenario: `${moduleName} enables low-level system access - can execute arbitrary code/commands`,
        fix: `Remove ${moduleName} import or use a safer alternative`,
      });
    }

    // Check for unknown/unverified modules
    if (!KNOWN_SAFE_MODULES.has(moduleName) && !moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      issues.push({
        type: 'dep-unknown-external',
        severity: 'medium',
        description: `Unverified external dependency: ${moduleName}`,
        exploitScenario: 'Unknown packages may contain malicious code or vulnerabilities',
        fix: `Verify ${moduleName} is from a trusted source. Check npm/package registry`,
      });
    }
  }

  // Detect dynamic imports
  if (/require\s*\(\s*\w+\s*\)/.test(code)) {
    issues.push({
      type: 'dep-dynamic-import',
      severity: 'high',
      description: 'Dynamic require() with variable detected',
      exploitScenario: 'Attacker can load arbitrary modules if variable is user-controlled',
      fix: 'Use static imports or whitelist allowed modules',
    });
  }

  if (/import\s*\(\s*\w+\s*\)/.test(code)) {
    issues.push({
      type: 'dep-dynamic-import-es6',
      severity: 'high',
      description: 'Dynamic import() with variable detected',
      exploitScenario: 'Can load untrusted code at runtime',
      fix: 'Use static imports or implement strict module validation',
    });
  }

  // Detect remote imports (CDN/external URLs)
  const remoteImportPattern = /import\s+.*from\s+['"`](https?:\/\/[^'"`]+)['"`]/g;
  while ((match = remoteImportPattern.exec(code)) !== null) {
    const url = match[1];
    issues.push({
      type: 'dep-remote-import',
      severity: 'high',
      description: `Remote module import detected: ${url}`,
      exploitScenario: 'Remote code can be modified by third party - supply chain attack',
      fix: 'Download and bundle dependencies locally. Use SRI for CDN resources',
    });
  }

  // Detect file system operations with sensitive paths
  const sensitivePaths = [
    /\/etc\/passwd/,
    /\/etc\/shadow/,
    /\.ssh\/id_rsa/,
    /\.ssh\/authorized_keys/,
    /\.bash_history/,
    /\.npmrc/,
    /\.gitconfig/,
    /\.aws\/credentials/,
  ];

  const fsOperations = /(readFile|readFileSync|writeFile|writeFileSync|appendFile|unlink|unlinkSync|stat|access)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = fsOperations.exec(code)) !== null) {
    const operation = match[1];
    const filePath = match[2];
    
    for (const sensitivePattern of sensitivePaths) {
      if (sensitivePattern.test(filePath)) {
        issues.push({
          type: 'dep-sensitive-file-access',
          severity: 'critical',
          description: `File system access to sensitive path: ${filePath}`,
          exploitScenario: 'Reading sensitive files can expose credentials, SSH keys, or system secrets',
          fix: 'Do not access sensitive system files. Use proper secret management',
        });
        break;
      }
    }
  }

  // Detect suspicious hardcoded URLs
  const urlPattern = /(https?:\/\/[^\s'"`;]+)/g;
  while ((match = urlPattern.exec(code)) !== null) {
    const url = match[1];

    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url)) {
        issues.push({
          type: 'dep-suspicious-url',
          severity: 'medium',
          description: `Suspicious hardcoded URL: ${url}`,
          exploitScenario: 'May indicate development/debug code or malicious endpoint',
          fix: 'Remove hardcoded URLs. Use environment variables or config files',
        });
        break;
      }
    }

    // Check for credentials in URLs
    if (/:\/\/[^:@]+:[^:@]+@/.test(url)) {
      issues.push({
        type: 'dep-credentials-in-url',
        severity: 'critical',
        description: `Hardcoded credentials in URL: ${url.replace(/:[^:@]+@/, ':***@')}`,
        exploitScenario: 'Exposed credentials can be leaked in logs or version control',
        fix: 'Use environment variables for credentials. Never hardcode secrets',
      });
    }
  }

  // Elevate process.env access to CRITICAL (data exfiltration risk)
  if (/process\.env/.test(code)) {
    // Check if it's being sent externally
    const hasExternalSend = /(fetch|axios|request|https?\.request|XMLHttpRequest)/.test(code);
    if (hasExternalSend) {
      issues.push({
        type: 'dep-env-exfiltration',
        severity: 'critical',
        description: 'Environment variable access combined with external HTTP request',
        exploitScenario: 'May be exfiltrating secrets (API keys, DB passwords) to external server',
        fix: 'Never send process.env data externally. Use proper secret management',
      });
    }
  }

  // AST-based analysis for more complex patterns
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'dynamicImport'],
      errorRecovery: true,
    });

    const traverseFn = (typeof traverse === 'function' ? traverse : (traverse as any).default) as typeof traverse;

    traverseFn(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        // Detect dangerous modules in ES6 imports
        if (DANGEROUS_MODULES.has(source)) {
          issues.push({
            type: 'dep-ast-dangerous-import',
            severity: 'critical',
            description: `Dangerous ES6 import: ${source}`,
            exploitScenario: 'Enables system-level access and code execution',
            fix: `Remove import of ${source}`,
          });
        }

        // Detect relative imports outside project
        if (source.startsWith('../../../')) {
          issues.push({
            type: 'dep-deep-relative-import',
            severity: 'low',
            description: `Deep relative import: ${source}`,
            exploitScenario: 'May indicate accessing files outside intended scope',
            fix: 'Use module aliases or reorganize project structure',
          });
        }
      },

      CallExpression(path) {
        const callee = path.node.callee;

        // Detect eval-like imports
        if (callee.type === 'Identifier' && callee.name === 'require') {
          const arg = path.node.arguments[0];
          
          // Variable require
          if (arg && arg.type !== 'StringLiteral' && arg.type !== 'TemplateLiteral') {
            issues.push({
              type: 'dep-ast-dynamic-require',
              severity: 'high',
              description: 'Dynamic require() detected via AST',
              exploitScenario: 'Can load arbitrary modules based on runtime data',
              fix: 'Use static require() calls with string literals',
            });
          }

          // Template literal require
          if (arg && arg.type === 'TemplateLiteral' && arg.expressions.length > 0) {
            issues.push({
              type: 'dep-ast-template-require',
              severity: 'high',
              description: 'Template literal in require() path',
              exploitScenario: 'Dynamic path construction can load unintended modules',
              fix: 'Use static module paths',
            });
          }
        }

        // Detect importScripts (Web Workers)
        if (callee.type === 'Identifier' && callee.name === 'importScripts') {
          issues.push({
            type: 'dep-import-scripts',
            severity: 'high',
            description: 'Web Worker importScripts() detected',
            exploitScenario: 'Can load external scripts in worker context',
            fix: 'Bundle worker scripts. Validate all imported URLs',
          });
        }
      },

      // Detect npm/yarn/pnpm install in code (unusual)
      ExpressionStatement(path) {
        const expr = path.node.expression;
        if (expr.type === 'CallExpression' && expr.callee.type === 'Identifier') {
          const code = path.toString();
          if (/(npm|yarn|pnpm)\s+install/.test(code)) {
            issues.push({
              type: 'dep-runtime-install',
              severity: 'critical',
              description: 'Runtime package installation detected',
              exploitScenario: 'Can install malicious packages at runtime',
              fix: 'Remove runtime package installation. Pre-install all dependencies',
            });
          }
        }
      },
    });
  } catch (e) {
    // Parsing errors handled separately
  }

  return issues;
}
