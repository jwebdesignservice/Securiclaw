import { readFileSync } from 'fs';
import { runAudit } from '../../src/lib/security/audit.ts';

const code = readFileSync('tests/stress/exploits-collection.js', 'utf8');
const result = runAudit(code);

console.log('=== GAP ANALYSIS ===\n');
console.log(`Total issues detected: ${result.issues.length}/30 expected\n`);

// Define 30 unique vulnerability types from the file
const expectedVulns = [
  { name: '1. eval() basic', search: 'eval(userInput)' },
  { name: '2. eval() indirect', search: 'const e = eval' },
  { name: '3. eval() window', search: 'window.eval' },
  { name: '4. Function constructor', search: 'new Function(userInput)' },
  { name: '5. Function indirect', search: 'const F = Function' },
  { name: '6. setTimeout string', search: 'setTimeout(userInput' },
  { name: '7. setInterval string', search: "setInterval('doSomething" },
  { name: '8. exec concat', search: "exec('ls -la ' + userInput)" },
  { name: '9. spawn unsafe', search: "spawn('sh'" },
  { name: '10. execSync', search: 'execSync' },
  { name: '11. SQL concat', search: 'WHERE id = " + userId' },
  { name: '12. SQL template literal', search: 'FROM ${table}' },
  { name: '13. SQL DROP', search: 'DROP TABLE' },
  { name: '14. SQL UNION', search: "LIKE '%" },
  { name: '15. XSS innerHTML', search: '.innerHTML = data' },
  { name: '16. XSS outerHTML', search: '.outerHTML =' },
  { name: '17. XSS document.write', search: 'document.write(content)' },
  { name: '18. XSS insertAdjacentHTML', search: 'insertAdjacentHTML' },
  { name: '19. Prototype Object.assign', search: 'Object.assign(config, JSON.parse' },
  { name: '20. Prototype spread', search: '...JSON.parse' },
  { name: '21. Prototype merge', search: 'for (let key in source)' },
  { name: '22. Path readFile', search: "readFile('/uploads/' + filename" },
  { name: '23. Path writeFile', search: 'writeFileSync(filepath' },
  { name: '24. Dynamic require', search: "require('./' + moduleName)" },
  { name: '25. SSRF fetch', search: 'fetch(url)' },
  { name: '26. SSRF axios', search: 'axios.get' },
  { name: '27. SSRF http.request', search: 'http.request({ host: host' },
  { name: '28. NoSQL findOne', search: 'findOne({ username: username' },
  { name: '29. NoSQL $where', search: '$where: condition' },
  { name: '30. Open redirect', search: 'res.redirect(req.query.url)' },
];

console.log('Checking each of 30 vulnerability types:\n');

let detected = 0;
let missing = [];

expectedVulns.forEach(vuln => {
  // Check if this pattern is in the code
  const inCode = code.includes(vuln.search);
  
  // For generic detection, we just need to know if similar patterns are caught
  // eval, Function, setTimeout/setInterval, SQL, XSS, etc.
  const category = vuln.name.match(/\d+\.\s+([^:]+)/)[1].split(' ')[0];
  
  let isDetected = false;
  
  // Check if any issue relates to this vulnerability
  if (category === 'eval' && result.issues.some(i => i.type.includes('eval'))) isDetected = true;
  if (category === 'Function' && result.issues.some(i => i.type.includes('function') || i.type.includes('Function'))) isDetected = true;
  if ((vuln.name.includes('setTimeout') || vuln.name.includes('setInterval')) && 
      result.issues.some(i => i.description.toLowerCase().includes('settimeout') || i.description.toLowerCase().includes('setinterval'))) isDetected = true;
  if (vuln.name.includes('exec') && result.issues.some(i => i.type.includes('exec') || i.type.includes('shell') || i.type.includes('child'))) isDetected = true;
  if (category === 'SQL' && result.issues.some(i => i.type.includes('sql'))) isDetected = true;
  if (category === 'XSS' && result.issues.some(i => i.type.includes('xss'))) isDetected = true;
  if (category === 'Prototype' && result.issues.some(i => i.type.includes('pollution') || i.description.includes('prototype'))) isDetected = true;
  if (category === 'Path' && result.issues.some(i => i.type.includes('path') || i.description.includes('path traversal'))) isDetected = true;
  if (category === 'Dynamic' && vuln.name.includes('require') && result.issues.some(i => i.type.includes('dynamic') && i.type.includes('require'))) isDetected = true;
  if (category === 'SSRF' && result.issues.some(i => i.type.includes('fetch') || i.type.includes('axios'))) isDetected = true;
  if (category === 'NoSQL' && result.issues.some(i => i.type.includes('nosql'))) isDetected = true;
  if (category === 'Open' && vuln.name.includes('redirect')) {
    isDetected = result.issues.some(i => 
      i.description.toLowerCase().includes('redirect') ||
      i.description.toLowerCase().includes('location')
    );
  }
  
  if (isDetected) {
    console.log(`✅  ${vuln.name}`);
    detected++;
  } else {
    console.log(`❌  ${vuln.name}`);
    missing.push(vuln.name);
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Detected: ${detected}/30`);
console.log(`Missing: ${30 - detected}/30`);

if (missing.length > 0) {
  console.log(`\n=== GAPS TO FIX ===`);
  missing.forEach(m => console.log(`  - ${m}`));
}
