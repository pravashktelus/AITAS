#!/usr/bin/env node
/**
 * EnsureAppInstalled.js — Checks if the APK is installed on the emulator.
 * If not installed, installs it automatically before running tests.
 *
 * Usage: node src/utils/EnsureAppInstalled.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_PACKAGE = 'com.swaglabsmobileapp';
const APK_PATH = path.resolve('testdata/appFiles/demo.apk');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) {
    return '';
  }
}

console.log('\n📱 Checking device and app status...\n');

// 1. Check if any device/emulator is connected
const devices = run('adb devices');
const deviceLines = devices.split('\n').filter(l => l.includes('\tdevice'));

if (deviceLines.length === 0) {
  console.error('❌ No device/emulator connected. Start an emulator first:');
  console.error('   emulator -avd <AVD_NAME>');
  process.exit(1);
}

console.log(`✅ Device connected: ${deviceLines[0].split('\t')[0]}`);

// 2. Check if app is already installed
const packages = run(`adb shell pm list packages ${APP_PACKAGE}`);
const isInstalled = packages.includes(APP_PACKAGE);

if (isInstalled) {
  console.log(`✅ App already installed: ${APP_PACKAGE}`);
} else {
  console.log(`⏳ App not installed. Installing APK...`);

  if (!fs.existsSync(APK_PATH)) {
    console.error(`❌ APK file not found: ${APK_PATH}`);
    console.error('   Place demo.apk in testdata/appFiles/');
    process.exit(1);
  }

  const result = run(`adb install -r "${APK_PATH}"`);
  if (result.includes('Success')) {
    console.log(`✅ APK installed successfully: ${APP_PACKAGE}`);
  } else {
    console.error(`❌ APK installation failed: ${result}`);
    process.exit(1);
  }
}

// 3. Check if Appium is running
try {
  const http = require('http');
  const req = http.get('http://localhost:4723/status', { timeout: 3000 }, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Appium server running on port 4723');
      console.log('\n🚀 Ready to run native tests!\n');
      process.exit(0);
    }
  });
  req.on('error', () => {
    console.error('❌ Appium server not running on port 4723');
    console.error('   Start Appium: npm run appium:start');
    process.exit(1);
  });
  req.on('timeout', () => {
    console.error('❌ Appium server not responding');
    process.exit(1);
  });
} catch (e) {
  console.error('❌ Could not check Appium status');
  process.exit(1);
}
