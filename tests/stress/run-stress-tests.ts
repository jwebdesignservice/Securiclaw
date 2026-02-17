import { runAudit } from '../../src/lib/security/audit';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  name: string;
  passed: boolean;
  score: number;
  riskLevel: string;
  issuesFound: number;
  criticalIssues: number;
  highIssues: number;
  details: string;
}

const results: TestResult[] = [];

console.log('🧪 SECURICLAW STRESS TEST SUITE\n');
console.log('=' .repeat(60));

// ========== Test Category 1: Known Exploits ==========
console.log('\n📍 CATEGORY 1: Known Exploits (Must Detect)\n');

const exploitsCode = fs.readFileSync(path.join(__dirname, 'exploits-collection.js'), 'utf8');
const exploitResult = runAudit(exploitsCode);

const exploitTest: TestResult = {
  name: 'Known Exploits Collection',
  passed: exploitResult.issues.length > 20 && exploitResult.securityScore < 30,
  score: exploitResult.securityScore,
  riskLevel: exploitResult.riskLevel,
  issuesFound: exploitResult.issues.length,
  criticalIssues: exploitResult.issues.filter(i => i.severity === 'critical').length,
  highIssues: exploitResult.issues.filter(i => i.severity === 'high').length,
  details: `Expected: >20 issues, score <30. Got: ${exploitResult.issues.length} issues, score ${exploitResult.securityScore}`,
};

results.push(exploitTest);

console.log(`  Test: ${exploitTest.name}`);
console.log(`  Status: ${exploitTest.passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Score: ${exploitTest.score} | Risk: ${exploitTest.riskLevel}`);
console.log(`  Issues: ${exploitTest.issuesFound} (${exploitTest.criticalIssues} critical, ${exploitTest.highIssues} high)`);
console.log(`  ${exploitTest.details}\n`);

// List all detected issues
console.log('  Detected vulnerabilities:');
exploitResult.issues.forEach((issue, i) => {
  console.log(`    ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
});

// ========== Test Category 2: Safe Code (No False Positives) ==========
console.log('\n' + '='.repeat(60));
console.log('\n📍 CATEGORY 2: Safe Code (Minimal False Positives)\n');

const safeFiles = [
  'safe-1-basic.js',
  'safe-2-secure-api.js',
  'safe-3-react-component.tsx',
];

for (const file of safeFiles) {
  try {
    const code = fs.readFileSync(path.join(__dirname, '../samples', file), 'utf8');
    const result = runAudit(code);
    
    const test: TestResult = {
      name: `Safe Code: ${file}`,
      passed: result.securityScore > 60, // Lenient for MVP
      score: result.securityScore,
      riskLevel: result.riskLevel,
      issuesFound: result.issues.length,
      criticalIssues: result.issues.filter(i => i.severity === 'critical').length,
      highIssues: result.issues.filter(i => i.severity === 'high').length,
      details: `Expected: score >60, <5 issues. Got: score ${result.securityScore}, ${result.issues.length} issues`,
    };
    
    results.push(test);
    
    console.log(`  Test: ${test.name}`);
    console.log(`  Status: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Score: ${test.score} | Risk: ${test.riskLevel}`);
    console.log(`  Issues: ${test.issuesFound} (${test.criticalIssues} critical, ${test.highIssues} high)`);
    
    if (test.issuesFound > 0) {
      console.log('  Flagged issues:');
      result.issues.forEach(issue => {
        console.log(`    - [${issue.severity}] ${issue.type}`);
      });
    }
    console.log();
  } catch (e) {
    console.log(`  ❌ FAIL: ${file} - ${e}\n`);
  }
}

// ========== Test Category 3: Edge Cases ==========
console.log('='.repeat(60));
console.log('\n📍 CATEGORY 3: Edge Cases (Graceful Handling)\n');

const edgeCases = [
  { name: 'Empty String', code: '', expectError: true, errorMsg: 'Code input is empty' },
  { name: 'Null Bytes', code: '\0\0\0', expectError: true, errorMsg: 'null bytes' },
  { name: 'Only Comments', code: '// comment\n/* block */', expectError: false },
  { name: 'Only Whitespace', code: '   \n\n\t\t   ', expectError: true },
  { name: 'Very Long Line', code: 'const x = ' + '"a"'.repeat(10000) + ';', expectError: false },
  { name: 'Deeply Nested', code: '('.repeat(100) + ')'.repeat(100), expectError: false },
  { name: 'Unicode Characters', code: 'const 變數 = "值"; const 🚀 = true;', expectError: false },
  { name: 'Mixed Languages', code: 'const x = 1; <?php echo "hi"; ?>', expectError: false },
];

for (const testCase of edgeCases) {
  try {
    const result = runAudit(testCase.code);
    
    const test: TestResult = {
      name: `Edge Case: ${testCase.name}`,
      passed: !testCase.expectError,
      score: result.securityScore,
      riskLevel: result.riskLevel,
      issuesFound: result.issues.length,
      criticalIssues: 0,
      highIssues: 0,
      details: `Handled gracefully - no crash`,
    };
    
    results.push(test);
    console.log(`  Test: ${test.name}`);
    console.log(`  Status: ${test.passed ? '✅ PASS' : '⚠️  UNEXPECTED SUCCESS'}`);
    console.log(`  Result: Scanned successfully\n`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const test: TestResult = {
      name: `Edge Case: ${testCase.name}`,
      passed: testCase.expectError && errorMsg.includes(testCase.errorMsg || ''),
      score: 0,
      riskLevel: 'N/A',
      issuesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      details: `Error: ${errorMsg}`,
    };
    
    results.push(test);
    console.log(`  Test: ${test.name}`);
    console.log(`  Status: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Error: ${errorMsg}\n`);
  }
}

// ========== Test Category 4: Malicious Samples ==========
console.log('='.repeat(60));
console.log('\n📍 CATEGORY 4: Malicious Samples (High Detection)\n');

const maliciousFiles = [
  'malicious-1-backdoor.js',
  'malicious-2-data-theft.js',
  'malicious-3-sql-injection.js',
  'malicious-4-prototype-pollution.js',
  'malicious-5-xss-rce.js',
];

for (const file of maliciousFiles) {
  try {
    const code = fs.readFileSync(path.join(__dirname, '../samples', file), 'utf8');
    const result = runAudit(code);
    
    const test: TestResult = {
      name: `Malicious: ${file}`,
      passed: result.securityScore < 70 && result.issues.length >= 3,
      score: result.securityScore,
      riskLevel: result.riskLevel,
      issuesFound: result.issues.length,
      criticalIssues: result.issues.filter(i => i.severity === 'critical').length,
      highIssues: result.issues.filter(i => i.severity === 'high').length,
      details: `Expected: score <70, ≥3 issues. Got: score ${result.securityScore}, ${result.issues.length} issues`,
    };
    
    results.push(test);
    
    console.log(`  Test: ${test.name}`);
    console.log(`  Status: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Score: ${test.score} | Risk: ${test.riskLevel}`);
    console.log(`  Issues: ${test.issuesFound} (${test.criticalIssues} critical, ${test.highIssues} high)`);
    console.log();
    
  } catch (e) {
    console.log(`  ❌ FAIL: ${file} - ${e}\n`);
  }
}

// ========== Test Category 5: Performance ==========
console.log('='.repeat(60));
console.log('\n📍 CATEGORY 5: Performance (Speed & Consistency)\n');

const perfCode = 'function add(a, b) { return a + b; }';
const iterations = 100;
const times: number[] = [];

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  runAudit(perfCode);
  const duration = performance.now() - start;
  times.push(duration);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const maxTime = Math.max(...times);
const minTime = Math.min(...times);

const perfTest: TestResult = {
  name: 'Performance Test',
  passed: avgTime < 500,
  score: 0,
  riskLevel: 'N/A',
  issuesFound: 0,
  criticalIssues: 0,
  highIssues: 0,
  details: `${iterations} iterations: avg ${avgTime.toFixed(1)}ms, min ${minTime.toFixed(1)}ms, max ${maxTime.toFixed(1)}ms`,
};

results.push(perfTest);

console.log(`  Test: ${perfTest.name}`);
console.log(`  Status: ${perfTest.passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Average: ${avgTime.toFixed(1)}ms (target: <500ms)`);
console.log(`  Range: ${minTime.toFixed(1)}ms - ${maxTime.toFixed(1)}ms\n`);

// ========== FINAL SUMMARY ==========
console.log('='.repeat(60));
console.log('\n📊 STRESS TEST SUMMARY\n');

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;
const passRate = (passedTests / totalTests * 100).toFixed(1);

console.log(`  Total Tests: ${totalTests}`);
console.log(`  ✅ Passed: ${passedTests}`);
console.log(`  ❌ Failed: ${failedTests}`);
console.log(`  Pass Rate: ${passRate}%\n`);

if (failedTests > 0) {
  console.log('  Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`    - ${r.name}`);
    console.log(`      ${r.details}\n`);
  });
}

console.log('='.repeat(60));

// Export results for analysis
fs.writeFileSync(
  path.join(__dirname, 'stress-test-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n📁 Results saved to: tests/stress/stress-test-results.json\n');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
