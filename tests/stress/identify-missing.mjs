import { readFileSync } from 'fs';
import { runAudit } from '../../src/lib/security/audit.ts';

const code = readFileSync('tests/stress/exploits-collection.js', 'utf8');
const result = runAudit(code);

console.log('Score:', result.securityScore);
console.log('Total Issues:', result.issues.length);
console.log('\nDetected Issues:');

const issuesByType = {};
result.issues.forEach(issue => {
  if (!issuesByType[issue.type]) {
    issuesByType[issue.type] = [];
  }
  issuesByType[issue.type].push(issue);
});

Object.entries(issuesByType).forEach(([type, issues]) => {
  console.log(`\n${type} (${issues.length}):`);
  issues.forEach((i, idx) => {
    console.log(`  ${idx + 1}. [${i.severity.toUpperCase()}] ${i.description.substring(0, 80)}`);
  });
});

console.log('\n\n=== ANALYSIS: Looking for gaps ===\n');

// Check each exploit type
const exploitTests = [
  { name: 'eval()', patterns: ['eval(', 'eval.call', 'window.eval'] },
  { name: 'Function constructor', patterns: ['new Function(', 'Function('] },
  { name: 'setTimeout string', patterns: ['setTimeout(', 'setInterval('] },
  { name: 'child_process.exec', patterns: ['exec(', 'execSync(', 'spawn('] },
  { name: 'SQL injection', patterns: ['db.query(', 'mysql.query(', 'connection.execute('] },
  { name: 'XSS innerHTML', patterns: ['innerHTML', 'outerHTML', 'document.write', 'insertAdjacentHTML'] },
  { name: 'Prototype pollution', patterns: ['Object.assign', 'JSON.parse', 'for (let key in'] },
  { name: 'Path traversal', patterns: ['fs.readFile', 'fs.writeFile', "require('./'"] },
  { name: 'SSRF', patterns: ['fetch(', 'axios.get', 'http.request'] },
  { name: 'NoSQL injection', patterns: ['findOne', '$where'] },
  { name: 'XXE', patterns: ['xml2js', 'parseString'] },
  { name: 'Open redirect', patterns: ['res.redirect', "setHeader('Location'"] },
];

exploitTests.forEach(test => {
  const found = test.patterns.some(pattern => 
    result.issues.some(i => 
      i.description.toLowerCase().includes(pattern.toLowerCase()) ||
      i.type.toLowerCase().includes(test.name.toLowerCase())
    )
  );
  
  if (!found) {
    console.log(`⚠️  MISSING: ${test.name}`);
  } else {
    console.log(`✅  Detected: ${test.name}`);
  }
});
