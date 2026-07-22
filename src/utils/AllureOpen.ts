#!/usr/bin/env ts-node

/**
 * AllureOpen.ts — Generate Allure results and open/serve the report.
 *
 * Usage:
 *   npx ts-node src/utils/AllureOpen.ts serve    ← temp server (auto-opens browser)
 *   npx ts-node src/utils/AllureOpen.ts open     ← generate static HTML + open
 *   npx ts-node src/utils/AllureOpen.ts generate ← just generate results (no open)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const mode: string = process.argv[2] || 'serve';
const latestPointer: string = path.join('reports', 'allure-results', 'latest-run.txt');

// Step 1: Generate results
console.log('\n📊 Generating Allure results...\n');
try {
  execSync('npx ts-node src/utils/GenerateAllureResults.ts', { stdio: 'inherit' });
} catch (e: unknown) {
  const error = e as Error;
  console.error('Failed to generate Allure results:', error.message);
  process.exit(1);
}

if (mode === 'generate') {
  process.exit(0);
}

// Step 2: Read the latest run directory
if (!fs.existsSync(latestPointer)) {
  console.error('No latest-run.txt found. Did GenerateAllureResults run correctly?');
  process.exit(1);
}

const latestRunDir: string = fs.readFileSync(latestPointer, 'utf8').trim();
// Normalize path separators for the command
const normalizedPath: string = latestRunDir.replace(/\\/g, '/');

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
} catch (e: unknown) {
  // If allure command fails, provide helpful guidance
  console.error('\n❌ Allure command failed.\n');
  console.error('Possible causes:');
  console.error('  1. Allure CLI not installed. Run: npm install -g allure-commandline');
  console.error('  2. Or install locally: npm install --save-dev allure-commandline');
  console.error('  3. Java not available (required by Allure CLI)');
  console.error(`\n  You can manually run: npx allure serve "${normalizedPath}"`);
  process.exit(1);
}
