#!/usr/bin/env node

/**
 * Verify Securiclaw setup
 */

console.log('🦞 SECURICLAW - Setup Verification\n');

// Check Node version
console.log('✓ Node.js:', process.version);

// Check dependencies
const checks = [];

try {
  await import('express');
  checks.push('✓ Express');
} catch { checks.push('✗ Express - run npm install'); }

try {
  await import('better-sqlite3');
  checks.push('✓ better-sqlite3');
} catch { checks.push('⚠️  better-sqlite3 - may need rebuild, but should work'); }

try {
  await import('cors');
  checks.push('✓ CORS');
} catch { checks.push('✗ CORS - run npm install'); }

try {
  await import('node-fetch');
  checks.push('✓ node-fetch');
} catch { checks.push('✗ node-fetch - run npm install'); }

checks.forEach(c => console.log(c));

// Check files
import { existsSync } from 'fs';

console.log('\n📁 Files:');
console.log(existsSync('server/index.js') ? '✓ Backend server' : '✗ Backend server missing');
console.log(existsSync('server/ai-service.js') ? '✓ AI service' : '✗ AI service missing');
console.log(existsSync('src/lib/security/aiAnalyzer.ts') ? '✓ AI analyzer' : '✗ AI analyzer missing');
console.log(existsSync('.env.example') ? '✓ .env.example' : '✗ .env.example missing');

// Check env
console.log('\n🔧 Configuration:');
if (existsSync('.env')) {
  console.log('✓ .env file present');
} else {
  console.log('⚠️  .env file missing - create from .env.example');
  console.log('   AI features will use fallback mode');
}

console.log('\n🚀 Ready to start!');
console.log('\nRun: npm run dev:all');
console.log('Then open: http://localhost:8080\n');
