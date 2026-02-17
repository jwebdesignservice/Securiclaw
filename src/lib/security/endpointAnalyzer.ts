import { SecurityIssue } from './types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Module C — Endpoint Exposure Scanner
 * Detects: missing auth, no signature verification, missing rate limits,
 * replay attack vulnerability, open CORS, data overexposure
 */

interface EndpointConfig {
  path: string;
  method: string;
  hasAuth: boolean;
  hasRateLimit: boolean;
  hasSignatureValidation: boolean;
  corsPolicy: string;
}

export function endpointAnalyzer(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const endpoints: EndpointConfig[] = [];

  // Pattern-based detection for common endpoint patterns
  const endpointPatterns = [
    {
      pattern: /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      framework: 'Express',
    },
    {
      pattern: /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      framework: 'Express Router',
    },
    {
      pattern: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      framework: 'NestJS/Decorator',
    },
  ];

  for (const { pattern, framework } of endpointPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const method = match[1]?.toUpperCase() || 'GET';
      const path = match[2] || '/';

      // Check if endpoint has auth middleware
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(code.length, match.index + 200);
      const context = code.substring(contextStart, contextEnd);

      const hasAuth = /auth|authenticate|requireAuth|isAuthenticated|checkAuth/i.test(context);
      const hasRateLimit = /rateLimit|throttle|limit/i.test(context);
      const hasSignature = /signature|hmac|verify|signed/i.test(context);

      if (!hasAuth) {
        issues.push({
          type: 'endpoint-no-auth',
          severity: 'critical',
          description: `Unauthenticated endpoint detected: ${method} ${path}`,
          exploitScenario: 'Anyone can access this endpoint without credentials',
          fix: `Add authentication middleware before ${path} handler`,
        });
      }

      if (!hasRateLimit) {
        issues.push({
          type: 'endpoint-no-rate-limit',
          severity: 'high',
          description: `No rate limiting on: ${method} ${path}`,
          exploitScenario: 'Vulnerable to brute force attacks and DoS',
          fix: 'Add rate limiting middleware (e.g., express-rate-limit)',
        });
      }

      if (!hasSignature && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        issues.push({
          type: 'endpoint-no-signature',
          severity: 'high',
          description: `Missing signature validation on: ${method} ${path}`,
          exploitScenario: 'Vulnerable to replay attacks and request tampering',
          fix: 'Implement HMAC signature verification for request integrity',
        });
      }

      endpoints.push({
        path,
        method,
        hasAuth,
        hasRateLimit,
        hasSignatureValidation: hasSignature,
        corsPolicy: 'unknown',
      });
    }
  }

  // CORS policy detection
  if (/cors\s*\(\s*\{?\s*origin\s*:\s*['"`]\*['"`]/.test(code)) {
    issues.push({
      type: 'endpoint-open-cors',
      severity: 'medium',
      description: 'Open CORS policy detected (origin: "*")',
      exploitScenario: 'Any website can make requests to your API',
      fix: 'Restrict CORS to specific trusted domains',
    });
  }

  if (/Access-Control-Allow-Origin['"`]\s*:\s*['"`]\*['"`]/.test(code)) {
    issues.push({
      type: 'endpoint-cors-wildcard',
      severity: 'medium',
      description: 'CORS wildcard in Access-Control-Allow-Origin header',
      exploitScenario: 'Enables cross-site attacks from any origin',
      fix: 'Set specific allowed origins instead of "*"',
    });
  }

  // AST-based analysis
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
      errorRecovery: true,
    });

    const traverseFn = (typeof traverse === 'function' ? traverse : (traverse as any).default) as typeof traverse;

    traverseFn(ast, {
      // Detect webhook handlers without verification
      FunctionDeclaration(path) {
        const funcName = path.node.id?.name || '';
        if (/(webhook|callback|hook)Handler/i.test(funcName)) {
          const bodyStr = path.toString();
          if (!/(verify|signature|hmac|secret)/i.test(bodyStr)) {
            issues.push({
              type: 'endpoint-webhook-no-verify',
              severity: 'critical',
              description: `Webhook handler without signature verification: ${funcName}`,
              exploitScenario: 'Attacker can forge webhook requests',
              fix: 'Verify webhook signatures using provider\'s secret key',
            });
          }
        }
      },

      // Detect data overexposure in responses
      CallExpression(path) {
        if (path.node.callee.type === 'MemberExpression') {
          const obj = path.node.callee.object;
          const prop = path.node.callee.property;

          // res.send() or res.json() with full objects
          if (obj.type === 'Identifier' && (obj.name === 'res' || obj.name === 'response') &&
              prop.type === 'Identifier' && (prop.name === 'send' || prop.name === 'json')) {
            const arg = path.node.arguments[0];

            // Check if sending full user/data objects
            if (arg && arg.type === 'Identifier' && 
                (arg.name === 'user' || arg.name === 'users' || arg.name === 'data' || arg.name === 'result')) {
              issues.push({
                type: 'endpoint-data-overexposure',
                severity: 'medium',
                description: `Potential data overexposure: sending full ${arg.name} object`,
                exploitScenario: 'May leak sensitive fields (passwords, tokens, internal IDs)',
                fix: `Select specific fields to return instead of full ${arg.name} object`,
              });
            }
          }

          // Detect missing input validation
          if (obj.type === 'MemberExpression' && 
              obj.object.type === 'Identifier' && obj.object.name === 'req' &&
              obj.property.type === 'Identifier' && 
              (obj.property.name === 'body' || obj.property.name === 'query' || obj.property.name === 'params')) {
            
            const parent = path.parentPath?.parent;
            if (parent && parent.type !== 'CallExpression') {
              issues.push({
                type: 'endpoint-no-validation',
                severity: 'high',
                description: `No validation on req.${obj.property.name}`,
                exploitScenario: 'Malformed input can cause injection or crashes',
                fix: `Add input validation middleware (e.g., Joi, Yup, Zod)`,
              });
            }
          }
        }
      },
    });
  } catch (e) {
    // Parsing errors handled separately
  }

  return issues;
}
