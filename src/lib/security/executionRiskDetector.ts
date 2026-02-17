import { SecurityIssue } from './types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Module A — Static Execution Risk Detector
 * Detects: eval, dynamic function construction, shell execution, 
 * unbounded recursion, hidden execution branches
 */

export function executionRiskDetector(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Static pattern detection
  if (/eval\s*\(/g.test(code)) {
    issues.push({
      type: 'exec-risk-eval',
      severity: 'critical',
      description: 'Unsafe eval() usage detected - arbitrary code execution risk',
      exploitScenario: 'Attacker can inject and execute malicious JavaScript code through user input',
      fix: 'Remove eval(). Use JSON.parse() for data or safe alternatives like Function constructors with validated input',
    });
  }

  if (/new\s+Function\s*\(/g.test(code)) {
    issues.push({
      type: 'exec-risk-dynamic-function',
      severity: 'critical',
      description: 'Dynamic function construction via new Function()',
      exploitScenario: 'Similar to eval - allows runtime code generation from strings, bypassing CSP',
      fix: 'Use predefined functions or a safe interpreter/sandbox environment',
    });
  }

  if (/(exec|spawn|execSync|spawnSync)\s*\(/g.test(code)) {
    issues.push({
      type: 'exec-risk-shell-execution',
      severity: 'high',
      description: 'Shell execution pattern detected (exec/spawn)',
      exploitScenario: 'Command injection vulnerability - attacker can execute arbitrary OS commands',
      fix: 'Avoid shell commands. Use purpose-built libraries with strict input validation',
    });
  }

  // AST-based detection for deeper analysis
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    const traverseFn = (typeof traverse === 'function' ? traverse : (traverse as any).default) as typeof traverse;

    // Track recursion patterns
    const functionCalls = new Map<string, number>();

    traverseFn(ast, {
      CallExpression(path) {
        // Detect indirect invocation patterns
        if (path.node.callee.type === 'MemberExpression') {
          const obj = path.node.callee.object;
          if (obj.type === 'Identifier' && (obj.name === 'window' || obj.name === 'global')) {
            issues.push({
              type: 'exec-risk-indirect-invocation',
              severity: 'high',
              description: `Indirect code invocation via ${obj.name} object`,
              exploitScenario: 'Can be used to obfuscate malicious code execution',
              fix: 'Avoid dynamic property access on global objects',
            });
          }
        }

        // Track potential recursion
        if (path.node.callee.type === 'Identifier') {
          const funcName = path.node.callee.name;
          functionCalls.set(funcName, (functionCalls.get(funcName) || 0) + 1);
        }
      },

      ImportDeclaration(path) {
        const source = path.node.source.value;
        // Detect unsafe imports
        if (['vm', 'child_process', 'cluster'].includes(source)) {
          issues.push({
            type: 'exec-risk-unsafe-import',
            severity: 'critical',
            description: `Dangerous module imported: ${source}`,
            exploitScenario: `${source} module enables arbitrary code/command execution`,
            fix: 'Remove import. Use safer alternatives or sandbox environment',
          });
        }
      },

      FunctionDeclaration(path) {
        // Detect unbounded recursion
        const funcName = path.node.id?.name;
        if (funcName && functionCalls.get(funcName)) {
          const bodyStr = JSON.stringify(path.node.body);
          if (!bodyStr.includes('if') && !bodyStr.includes('while') && !bodyStr.includes('for')) {
            issues.push({
              type: 'exec-risk-unbounded-recursion',
              severity: 'high',
              description: `Function "${funcName}" may have unbounded recursion`,
              exploitScenario: 'Stack overflow DoS attack - crashes the application',
              fix: 'Add base case or iteration limit to prevent infinite recursion',
            });
          }
        }
      },

      WithStatement(path) {
        issues.push({
          type: 'exec-risk-with-statement',
          severity: 'medium',
          description: 'with statement detected - creates ambiguous scope',
          exploitScenario: 'Can be used to hide malicious code execution',
          fix: 'Remove with statement - use explicit property access',
        });
      },
    });
  } catch (e) {
    // Parsing errors are handled separately
  }

  return issues;
}
