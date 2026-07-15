#!/usr/bin/env node

/**
 * AllureOpen.js — Generate Allure results and open/serve the report.
 * 
 * Usage:
 *   node src/utils/AllureOpen.js serve    ← temp server (auto-opens browser)
 *   node src/utils/AllureOpen.js open     ← generate static HTML + open
 *   node src/utils/AllureOpen.js generate ← just generate results (no open)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'serve';
const latestPointer = path.join('reports', 'allure-results', 'latest-run.txt');

// Step 1: Generate results
console.log('\n📊 Generating Allure results...\n');
try {
  execSync('node src/utils/GenerateAllureResults.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to generate Allure results:', e.message);
  process.exit(1);
}

if (mode === 'generate') {
  process.exit(0);
}

// Step 2: Read the latest run directory
if (!fs.existsSync(latestPointer)) {
  console.error('No latest-run.txt found. Did GenerateAllureResults.js run correctly?');
  process.exit(1);
}

const latestRunDir = fs.readFileSync(latestPointer, 'utf8').trim();
// Normalize path separators for the command
const normalizedPath = latestRunDir.replace(/\\/g, '/');

console.log(`\n📂 Latest run: ${normalizedPath}`);

if (!fs.existsSync(latestRunDir)) {
  console.error(`Run directory not found: ${latestRunDir}`);
  process.exit(1);
}

// Step 3: Execute allure command
try {
  if (mode === 'serve') {
    console.log('\n🚀 Starting Allure server...\n');
    execSync(`npx allure serve "${normalizedPath}"`, { stdio: 'inherit' });
  } else if (mode === 'open') {
    const reportDir = 'reports/allure-report';
    console.log(`\n🔨 Generating static report to: ${reportDir}\n`);
    execSync(`npx allure generate "${normalizedPath}" --clean -o "${reportDir}"`, { stdio: 'inherit' });
    console.log('\n🌐 Opening report...\n');
    execSync(`npx allure open "${reportDir}"`, { stdio: 'inherit' });
  }
} catch (e) {
  // If allure command fails, provide helpful guidance
  console.error('\n❌ Allure command failed.\n');
  console.error('Possible causes:');
  console.error('  1. Allure CLI not installed. Run: npm install -g allure-commandline');
  console.error('  2. Or install locally: npm install --save-dev allure-commandline');
  console.error('  3. Java not available (required by Allure CLI)');
  console.error(`\n  You can manually run: npx allure serve "${normalizedPath}"`);
  process.exit(1);
}
