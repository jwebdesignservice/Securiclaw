// Quick Stress Test Runner (Node.js)
const fs = require('fs');
const path = require('path');

// Since we're in Node, we need to use the compiled output or run via tsx
// For now, let's just test the samples manually

console.log('🧪 SECURICLAW QUICK STRESS TEST\n');
console.log('='.repeat(60));

// Read all test files
const samplesDir = path.join(__dirname, '../samples');
const stressDir = path.join(__dirname);

console.log('\n📁 Test Files Found:\n');

const maliciousFiles = fs.readdirSync(samplesDir).filter(f => f.startsWith('malicious'));
const safeFiles = fs.readdirSync(samplesDir).filter(f => f.startsWith('safe'));

console.log('  Malicious Samples:');
maliciousFiles.forEach(f => console.log(`    - ${f}`));

console.log('\n  Safe Samples:');
safeFiles.forEach(f => console.log(`    - ${f}`));

console.log('\n  Stress Tests:');
const stressFiles = fs.readdirSync(stressDir).filter(f => f.endsWith('.js') && f !== 'quick-test.js');
stressFiles.forEach(f => console.log(`    - ${f}`));

console.log('\n' + '='.repeat(60));
console.log('\n📋 Manual Testing Instructions:\n');
console.log('  1. Open http://localhost:8080 in your browser');
console.log('  2. Test each file by copying its content into the editor');
console.log('  3. Click "RUN AUDIT" and verify results\n');

console.log('  Expected Results:\n');
console.log('  ✅ Malicious files: Score < 50, Multiple CRITICAL/HIGH issues');
console.log('  ✅ Safe files: Score > 70, Few or zero issues');
console.log('  ✅ Exploits collection: Score < 20, 20+ vulnerabilities\n');

console.log('='.repeat(60));
console.log('\n🎯 Key Vulnerabilities to Verify Detection:\n');

const keyVulns = [
  '  1. eval() usage',
  '  2. new Function()',
  '  3. child_process.exec()',
  '  4. SQL injection (string concat)',
  '  5. XSS (innerHTML)',
  '  6. Prototype pollution',
  '  7. Path traversal',
  '  8. SSRF (fetch with user URL)',
  '  9. NoSQL injection',
  ' 10. XXE attacks',
  ' 11. Command injection',
  ' 12. Hardcoded credentials',
  ' 13. Open CORS',
  ' 14. Missing authentication',
  ' 15. Dynamic imports',
];

keyVulns.forEach(v => console.log(v));

console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Coverage Summary:\n');

console.log(`  Total Malicious Samples: ${maliciousFiles.length}`);
console.log(`  Total Safe Samples: ${safeFiles.length}`);
console.log(`  Total Stress Tests: ${stressFiles.length + 1}`); // +1 for exploits-collection
console.log(`\n  Total Test Cases: ${maliciousFiles.length + safeFiles.length + stressFiles.length + 1}\n`);

console.log('='.repeat(60));
console.log('\n✅ Test files are ready!');
console.log('📂 Location: tests/samples/ and tests/stress/\n');
