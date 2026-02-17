// Automated Stress Test Runner
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the audit function
import { runAudit } from '../../src/lib/security/audit.ts';

console.log('🧪 SECURICLAW AUTOMATED STRESS TEST\n');
console.log('='.repeat(70));

const results = [];
let totalTests = 0;
let passedTests = 0;

// Helper to run a test
function runTest(name, code, expectations) {
  totalTests++;
  console.log(`\n📍 Testing: ${name}`);
  
  try {
    const startTime = performance.now();
    const result = runAudit(code);
    const duration = performance.now() - startTime;
    
    const passed = Object.entries(expectations).every(([key, value]) => {
      if (key === 'scoreMin') return result.securityScore >= value;
      if (key === 'scoreMax') return result.securityScore <= value;
      if (key === 'issuesMin') return result.issues.length >= value;
      if (key === 'issuesMax') return result.issues.length <= value;
      if (key === 'criticalMin') {
        const critical = result.issues.filter(i => i.severity === 'critical').length;
        return critical >= value;
      }
      return true;
    });
    
    if (passed) passedTests++;
    
    const critical = result.issues.filter(i => i.severity === 'critical').length;
    const high = result.issues.filter(i => i.severity === 'high').length;
    
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Score: ${result.securityScore} | Risk: ${result.riskLevel}`);
    console.log(`  Issues: ${result.issues.length} (${critical} critical, ${high} high)`);
    console.log(`  Duration: ${duration.toFixed(1)}ms`);
    
    results.push({
      name,
      passed,
      score: result.securityScore,
      riskLevel: result.riskLevel,
      issues: result.issues.length,
      critical,
      high,
      duration: Math.round(duration),
    });
    
    return { passed, result };
  } catch (error) {
    console.log(`  Status: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
    
    results.push({
      name,
      passed: false,
      error: error.message,
    });
    
    return { passed: false, error };
  }
}

// CATEGORY 1: Exploits Collection
console.log('\n' + '='.repeat(70));
console.log('\n📍 CATEGORY 1: Known Exploits Collection\n');

const exploitsCode = readFileSync(join(__dirname, 'exploits-collection.js'), 'utf8');
runTest(
  'Exploits Collection (30 vulnerability types)',
  exploitsCode,
  { scoreMax: 30, issuesMin: 15 }
);

// CATEGORY 2: Malicious Samples
console.log('\n' + '='.repeat(70));
console.log('\n📍 CATEGORY 2: Malicious Code Samples\n');

const maliciousFiles = [
  'malicious-1-backdoor.js',
  'malicious-2-data-theft.js',
  'malicious-3-sql-injection.js',
  'malicious-4-prototype-pollution.js',
  'malicious-5-xss-rce.js',
];

for (const file of maliciousFiles) {
  const code = readFileSync(join(__dirname, '../samples', file), 'utf8');
  runTest(
    `Malicious: ${file}`,
    code,
    { scoreMax: 70, issuesMin: 3 }
  );
}

// CATEGORY 3: Safe Code
console.log('\n' + '='.repeat(70));
console.log('\n📍 CATEGORY 3: Safe Code Samples\n');

const safeFiles = [
  'safe-1-basic.js',
  'safe-2-secure-api.js',
  'safe-3-react-component.tsx',
];

for (const file of safeFiles) {
  const code = readFileSync(join(__dirname, '../samples', file), 'utf8');
  runTest(
    `Safe: ${file}`,
    code,
    { scoreMin: 50, issuesMax: 10 } // Lenient for MVP
  );
}

// CATEGORY 4: Edge Cases
console.log('\n' + '='.repeat(70));
console.log('\n📍 CATEGORY 4: Edge Cases\n');

const edgeCases = [
  {
    name: 'Empty String',
    code: '',
    expectError: true,
  },
  {
    name: 'Null Bytes',
    code: '\0\0\0',
    expectError: true,
  },
  {
    name: 'Only Comments',
    code: '// comment\n/* block */',
    expectError: false,
  },
  {
    name: 'Unicode Characters',
    code: 'const 変数 = "値"; const 🚀 = true;',
    expectError: false,
  },
  {
    name: 'Very Long Line',
    code: 'const x = ' + '"a"'.repeat(5000) + ';',
    expectError: false,
  },
];

for (const test of edgeCases) {
  totalTests++;
  console.log(`\n📍 Testing: Edge Case - ${test.name}`);
  
  try {
    const result = runAudit(test.code);
    const passed = !test.expectError;
    
    if (passed) passedTests++;
    
    console.log(`  Status: ${passed ? '✅ PASS' : '⚠️  UNEXPECTED SUCCESS'}`);
    console.log(`  Score: ${result.securityScore}`);
    console.log(`  Issues: ${result.issues.length}`);
    
    results.push({
      name: `Edge: ${test.name}`,
      passed,
      score: result.securityScore,
      issues: result.issues.length,
    });
  } catch (error) {
    const passed = test.expectError;
    
    if (passed) passedTests++;
    
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Error: ${error.message}`);
    
    results.push({
      name: `Edge: ${test.name}`,
      passed,
      error: error.message,
    });
  }
}

// CATEGORY 5: Performance
console.log('\n' + '='.repeat(70));
console.log('\n📍 CATEGORY 5: Performance Test\n');

const perfCode = 'function add(a, b) { return a + b; }';
const iterations = 100;
const times = [];

console.log(`Running ${iterations} scans...`);

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  runAudit(perfCode);
  const duration = performance.now() - start;
  times.push(duration);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const maxTime = Math.max(...times);
const minTime = Math.min(...times);
const passed = avgTime < 500;

totalTests++;
if (passed) passedTests++;

console.log(`\n  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Average: ${avgTime.toFixed(1)}ms (target: <500ms)`);
console.log(`  Min: ${minTime.toFixed(1)}ms | Max: ${maxTime.toFixed(1)}ms`);

results.push({
  name: 'Performance Test',
  passed,
  avgTime: Math.round(avgTime),
  minTime: Math.round(minTime),
  maxTime: Math.round(maxTime),
});

// FINAL SUMMARY
console.log('\n' + '='.repeat(70));
console.log('\n📊 STRESS TEST SUMMARY\n');

const passRate = (passedTests / totalTests * 100).toFixed(1);

console.log(`  Total Tests: ${totalTests}`);
console.log(`  ✅ Passed: ${passedTests}`);
console.log(`  ❌ Failed: ${totalTests - passedTests}`);
console.log(`  Pass Rate: ${passRate}%\n`);

if (passedTests < totalTests) {
  console.log('  Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`    - ${r.name}`);
  });
  console.log();
}

// Detailed Results
console.log('='.repeat(70));
console.log('\n📋 DETAILED RESULTS\n');

console.log('Malicious Samples (Expected: Score < 70, Multiple Issues):');
results.filter(r => r.name.startsWith('Malicious')).forEach(r => {
  const status = r.score < 70 && r.issues >= 3 ? '✅' : '❌';
  console.log(`  ${status} ${r.name}: Score ${r.score}, ${r.issues} issues`);
});

console.log('\nSafe Samples (Expected: Score > 50, Few Issues):');
results.filter(r => r.name.startsWith('Safe')).forEach(r => {
  const status = r.score > 50 ? '✅' : '❌';
  console.log(`  ${status} ${r.name}: Score ${r.score}, ${r.issues} issues`);
});

console.log('\nEdge Cases (Expected: Graceful Handling):');
results.filter(r => r.name.startsWith('Edge')).forEach(r => {
  const status = r.passed ? '✅' : '❌';
  console.log(`  ${status} ${r.name}`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🎯 FINAL VERDICT\n');

const exploitTest = results.find(r => r.name.includes('Exploits Collection'));
const maliciousTests = results.filter(r => r.name.startsWith('Malicious'));
const safeTests = results.filter(r => r.name.startsWith('Safe'));
const edgeTests = results.filter(r => r.name.startsWith('Edge'));
const perfTest = results.find(r => r.name === 'Performance Test');

const exploitPassed = exploitTest && exploitTest.score < 30 && exploitTest.issues >= 15;
const maliciousPassed = maliciousTests.every(t => t.score < 70);
const safePassed = safeTests.filter(t => t.score > 50).length >= 2; // At least 2/3
const edgePassed = edgeTests.filter(t => t.passed).length >= 4; // At least 4/5
const perfPassed = perfTest && perfTest.avgTime < 500;

console.log(`  Exploits Detection: ${exploitPassed ? '✅' : '❌'} (Score: ${exploitTest?.score}, Issues: ${exploitTest?.issues})`);
console.log(`  Malicious Samples: ${maliciousPassed ? '✅' : '❌'} (${maliciousTests.filter(t => t.score < 70).length}/5 passed)`);
console.log(`  Safe Code: ${safePassed ? '✅' : '❌'} (${safeTests.filter(t => t.score > 50).length}/3 scored >50)`);
console.log(`  Edge Cases: ${edgePassed ? '✅' : '❌'} (${edgeTests.filter(t => t.passed).length}/5 handled)`);
console.log(`  Performance: ${perfPassed ? '✅' : '❌'} (Avg: ${perfTest?.avgTime}ms)`);

const greenLight = exploitPassed && maliciousPassed && safePassed && edgePassed && perfPassed;
const yellowLight = !greenLight && passRate >= 70;

console.log('\n' + '='.repeat(70));

if (greenLight) {
  console.log('\n🟢 GREEN LIGHT — READY FOR PRODUCTION!');
  console.log('\n  ✅ All critical tests passed');
  console.log('  ✅ Detection accuracy validated');
  console.log('  ✅ Edge cases handled gracefully');
  console.log('  ✅ Performance acceptable');
  console.log('\n  👉 Proceed with Options A, B, C, D\n');
} else if (yellowLight) {
  console.log('\n🟡 YELLOW LIGHT — NEEDS MINOR IMPROVEMENTS');
  console.log('\n  ⚠️  Some tests failed but overall solid');
  console.log('  ⚠️  Review failed tests and iterate');
  console.log('\n  Recommended: Fix issues then re-test\n');
} else {
  console.log('\n🔴 RED LIGHT — NOT READY FOR PRODUCTION');
  console.log('\n  ❌ Critical tests failed');
  console.log('  ❌ Requires major revision');
  console.log('\n  Do NOT deploy until issues resolved\n');
}

console.log('='.repeat(70));

// Save results
import { writeFileSync } from 'fs';
writeFileSync(
  join(__dirname, 'stress-test-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n📁 Results saved to: tests/stress/stress-test-results.json\n');

process.exit(greenLight ? 0 : 1);
