import { SecurityIssue } from './types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Module B — Permission Scope Analyzer
 * Detects: wildcard permissions, cross-agent unrestricted access,
 * elevated execution context, implicit trust assumptions
 */

interface PermissionNode {
  scope: string;
  crossAgent: boolean;
  elevated: boolean;
  restricted: boolean;
}

export function permissionAnalyzer(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const permissions: PermissionNode[] = [];

  // Pattern-based detection for common permission keywords
  const permissionPatterns = [
    { pattern: /permissions?\s*:\s*['"]\*['"]/, type: 'wildcard-permission' },
    { pattern: /scope\s*:\s*['"]\*['"]/, type: 'wildcard-scope' },
    { pattern: /allowAll\s*:\s*true/, type: 'allow-all' },
    { pattern: /unrestricted\s*:\s*true/, type: 'unrestricted-access' },
  ];

  for (const { pattern, type } of permissionPatterns) {
    if (pattern.test(code)) {
      issues.push({
        type: `perm-${type}`,
        severity: 'critical',
        description: `Wildcard permission detected: ${type.replace(/-/g, ' ')}`,
        exploitScenario: 'Grants unrestricted access - attacker can perform any action',
        fix: 'Use specific, minimal permissions. Apply principle of least privilege',
      });
    }
  }

  // AST-based analysis for structured permission objects
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    const traverseFn = (typeof traverse === 'function' ? traverse : (traverse as any).default) as typeof traverse;

    traverseFn(ast, {
      ObjectExpression(path) {
        const obj = path.node;
        let hasPermissionKey = false;
        let hasScopeKey = false;
        let scopeValue: string | null = null;
        let crossAgent = false;
        let elevated = false;

        obj.properties.forEach((prop: any) => {
          if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
            const keyName = prop.key.name;

            if (keyName === 'permissions' || keyName === 'scope') {
              hasPermissionKey = true;
              hasScopeKey = true;

              // Check for wildcard
              if (prop.value.type === 'StringLiteral' && prop.value.value === '*') {
                issues.push({
                  type: 'perm-ast-wildcard',
                  severity: 'critical',
                  description: 'Wildcard permission scope detected in config object',
                  exploitScenario: 'Grants unrestricted access to all resources',
                  fix: 'Replace "*" with specific permission scopes',
                });
                scopeValue = '*';
              } else if (prop.value.type === 'StringLiteral') {
                scopeValue = prop.value.value;
              }
            }

            if (keyName === 'crossAgent' && prop.value.type === 'BooleanLiteral' && prop.value.value) {
              crossAgent = true;
            }

            if ((keyName === 'elevated' || keyName === 'admin' || keyName === 'superuser') && 
                prop.value.type === 'BooleanLiteral' && prop.value.value) {
              elevated = true;
            }

            if (keyName === 'restricted' && prop.value.type === 'BooleanLiteral' && !prop.value.value) {
              issues.push({
                type: 'perm-ast-unrestricted',
                severity: 'high',
                description: 'Permission marked as unrestricted',
                exploitScenario: 'Bypasses access controls',
                fix: 'Set restricted: true to enforce access controls',
              });
            }
          }
        });

        // Analyze permission combinations
        if (crossAgent && !hasPermissionKey) {
          issues.push({
            type: 'perm-cross-agent-unrestricted',
            severity: 'high',
            description: 'Cross-agent access without permission scope',
            exploitScenario: 'Allows unrestricted inter-agent communication',
            fix: 'Add explicit permission scope for cross-agent calls',
          });
        }

        if (elevated) {
          issues.push({
            type: 'perm-elevated-context',
            severity: 'high',
            description: 'Elevated execution context detected',
            exploitScenario: 'Code runs with elevated privileges - privilege escalation risk',
            fix: 'Remove elevated permissions unless absolutely required. Audit carefully',
          });
        }

        if (hasScopeKey && scopeValue) {
          permissions.push({
            scope: scopeValue,
            crossAgent,
            elevated,
            restricted: true, // default
          });
        }
      },

      // Detect implicit trust patterns
      CallExpression(path) {
        if (path.node.callee.type === 'MemberExpression') {
          const obj = path.node.callee.object;
          const prop = path.node.callee.property;

          // Detect dangerous auth bypasses
          if (obj.type === 'Identifier' && obj.name === 'auth' && 
              prop.type === 'Identifier' && (prop.name === 'bypass' || prop.name === 'skip')) {
            issues.push({
              type: 'perm-auth-bypass',
              severity: 'critical',
              description: 'Authentication bypass detected',
              exploitScenario: 'Allows unauthenticated access to protected resources',
              fix: 'Remove auth bypass. Implement proper authentication checks',
            });
          }

          // Detect implicit admin checks
          if (obj.type === 'Identifier' && obj.name === 'user' &&
              prop.type === 'Identifier' && prop.name === 'isAdmin') {
            const parent = path.parent;
            if (parent.type !== 'IfStatement' && parent.type !== 'ConditionalExpression') {
              issues.push({
                type: 'perm-implicit-trust',
                severity: 'medium',
                description: 'Admin check without conditional validation',
                exploitScenario: 'Implicit trust in user.isAdmin without verification',
                fix: 'Always validate admin status in conditional statements',
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
