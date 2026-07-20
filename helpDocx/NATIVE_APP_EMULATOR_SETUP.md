# Native App Testing on Android Emulator — Setup Guide

> Step-by-step guide to run native Android app tests on a local emulator using Appium.

---

## Pre-requisites

| Tool | Version | Purpose |
|------|---------|---------|
| Java JDK | 17+ | Required by Android SDK |
| Android SDK | API 33+ | Emulator & platform tools |
| Appium | 2.x | WebDriver server for mobile |
| UiAutomator2 Driver | Latest | Android automation driver |
| Node.js | 18+ | Already installed for this framework |

---

## Step 1: Install Java JDK

```bash
# Check if Java is installed
java -version

# If not installed, download JDK 17+ from:
# https://adoptium.net/ (recommended) or Oracle JDK
```

**Set environment variable:**
```
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x
Path += %JAVA_HOME%\bin
```

**Verify:**
```bash
java -version
# Output: openjdk version "17.x.x"
```

---

## Step 2: Install Android SDK

### Option A: Full Android Studio (Recommended for beginners)

1. Download from: https://developer.android.com/studio
2. Run installer → select "Custom" install
3. Ensure these are checked:
   - ✅ Android SDK
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ Intel HAXM (hardware acceleration)
4. After install, open SDK Manager and install:
   - Android 13 (API 33) → SDK Platform
   - Google APIs Intel x86_64 Atom System Image

### Option B: Command-Line Tools Only (Minimal ~3GB)

1. Download "Command Line Tools Only" from:
   https://developer.android.com/studio#command-line-tools-only
2. Extract to `C:\Android\cmdline-tools\latest\`
3. Run:
```bash
sdkmanager "platform-tools" "emulator" "platforms;android-33" "system-images;android-33;google_apis;x86_64"
```

### Set Environment Variables

```
ANDROID_HOME = C:\Users\<username>\AppData\Local\Android\Sdk
Path += %ANDROID_HOME%\platform-tools
Path += %ANDROID_HOME%\emulator
Path += %ANDROID_HOME%\cmdline-tools\latest\bin
```

**Verify:**
```bash
adb --version
# Output: Android Debug Bridge version 1.x.x

emulator -list-avds
# Shows available emulators (empty if none created yet)
```

---

## Step 3: Create Android Emulator (AVD)

### Via Android Studio (GUI)
1. Open Android Studio → Tools → Device Manager
2. Click "Create Device"
3. Choose: **Pixel 7** (or any device)
4. System Image: **API 33 (Android 13)** → x86_64
5. Name: `Pixel_7_API_33`
6. Click "Finish"

### Via Command Line
```bash
# List available system images
sdkmanager --list | findstr "system-images"

# Create AVD
avdmanager create avd -n Pixel_7_API_33 -k "system-images;android-33;google_apis;x86_64" -d "pixel_7"
```

---

## Step 4: Start the Emulator

```bash
# Start emulator
emulator -avd Pixel_7_API_33

# Or from Android Studio: Device Manager → ▶ Play button
```

**Verify emulator is running:**
```bash
adb devices
# Output:
# List of devices attached
# emulator-5554   device
```

> Wait until the emulator fully boots (lock screen appears, then unlock).

---

## Step 5: Install the App on Emulator

```bash
# Install SwagLabs demo APK
adb install testdata/appFiles/demo.apk

# Verify installation
adb shell pm list packages | findstr swag
# Output: package:com.swaglabsmobileapp
```

**To uninstall and reinstall:**
```bash
adb uninstall com.swaglabsmobileapp
adb install testdata/appFiles/demo.apk
```

---

## Step 6: Install Appium 2.x

```bash
# Install Appium globally
npm install -g appium

# Install UiAutomator2 driver (Android)
appium driver install uiautomator2

# Verify installation
appium --version
# Output: 2.x.x

appium driver list --installed
# Output:
# - uiautomator2@x.x.x [installed (npm)]
```

---

## Step 7: Start Appium Server

```bash
appium
```

**Expected output:**
```
[Appium] Welcome to Appium v2.x.x
[Appium] Appium REST http interface listener started on http://0.0.0.0:4723
[Appium] Available drivers:
[Appium]   - uiautomator2@x.x.x (automationName 'UiAutomator2')
```

> Keep this terminal open while running tests.

---

## Step 8: Configure framework.properties

The config is already set for local emulator mode:

```properties
nativeApp.enabled=true
nativeApp.appiumServer=http://localhost:4723
nativeApp.platform=android
nativeApp.appPath=./testdata/appFiles/demo.apk
nativeApp.appPackage=com.swaglabsmobileapp
nativeApp.appActivity=com.swaglabsmobileapp.SplashActivity
nativeApp.autoGrantPermissions=true
nativeApp.fullReset=false
nativeApp.noReset=true
```

---

## Step 9: Run the Tests

```bash
# Run all native Android tests
npm run test:native:android

# Run smoke tests only
npm run test:native:smoke

# Run a single scenario
npx cucumber-js -p native --tags "@native and @android and @smoke" --name "Successful login"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `adb devices` shows empty | Emulator not started or ADB not in PATH |
| `ECONNREFUSED` on port 4723 | Appium server not running — start with `appium` |
| `UiAutomator2 not found` | Run `appium driver install uiautomator2` |
| App doesn't launch | Verify APK installed: `adb shell pm list packages \| findstr swag` |
| `JAVA_HOME not set` | Set JAVA_HOME environment variable to JDK path |
| Emulator too slow | Enable Intel HAXM in BIOS (VT-x) and SDK Manager |
| `Session not created` | Check `appPackage` and `appActivity` match installed app |

---

## Quick Checklist Before Running

```
✅ Java installed         → java -version
✅ ANDROID_HOME set       → echo %ANDROID_HOME%
✅ Emulator running       → adb devices (shows emulator-5554)
✅ APK installed          → adb shell pm list packages | findstr swag
✅ Appium running         → appium (listening on 4723)
✅ Config set to local    → nativeApp.appiumServer=http://localhost:4723
✅ appPackage set         → com.swaglabsmobileapp
✅ appActivity set        → com.swaglabsmobileapp.SplashActivity
```

---

## Switching Between Local and Cloud

| Mode | Change in framework.properties |
|------|-------------------------------|
| **Local Emulator** | `nativeApp.appiumServer=http://localhost:4723` |
| **BrowserStack** | `nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub` |
| **LambdaTest** | `nativeApp.appiumServer=https://mobile-hub.lambdatest.com/wd/hub` |

When switching to cloud, also update `nativeApp.appPath` to the cloud URL (`bs://...` or `lt://...`) and clear `appPackage`/`appActivity` (cloud auto-detects them).

---

## Optional: Appium Inspector (For Finding Locators)

To inspect app elements and find locators:

1. Download Appium Inspector: https://github.com/appium/appium-inspector/releases
2. Set Remote Host: `127.0.0.1`, Port: `4723`, Path: `/`
3. Set capabilities:
```json
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:appPackage": "com.swaglabsmobileapp",
  "appium:appActivity": "com.swaglabsmobileapp.SplashActivity",
  "appium:noReset": true
}
```
4. Click "Start Session"
5. Use the element tree to find accessibility IDs, XPaths, resource-ids

---

## Physical Device (Alternative to Emulator)

If you prefer testing on a real phone:

1. Enable **Developer Options** on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging → ON
3. Connect via USB cable
4. Accept the RSA key prompt on your phone
5. Verify: `adb devices` (shows your device serial)
6. Install APK: `adb install testdata/appFiles/demo.apk`
7. Start Appium and run tests — same commands, same config

---

*Last updated: July 2026*


---

## Running Native Tests — All Commands

### NPM Scripts Available

| Command | Description |
|---------|-------------|
| `npm run appium:start` | Start Appium server in background |
| `npm run test:native` | Run all native tests (Android + iOS) |
| `npm run test:native:android` | Run Android native tests (auto-checks APK install) |
| `npm run test:native:ios` | Run iOS native tests |
| `npm run test:native:smoke` | Run native smoke tests only (auto-checks APK install) |
| `npm run test:native:local` | Start Appium + wait + run Android tests (all-in-one) |

### Quick Start (3 Commands)

```bash
# Terminal 1: Start emulator (if not already running)
emulator -avd Pixel_7_API_33

# Terminal 2: Start Appium + Run tests (all-in-one)
cd BDD_Playwright-v3.0
npm run appium:start
npm run test:native:android
```

### Run Specific Scenarios

```bash
# Smoke tests only (recommended for demo — fast and reliable)
npm run test:native:smoke

# Run by scenario name
npx cucumber-js -p native --tags "@native and @android" --name "Successful login"

# Run a specific tag
npx cucumber-js -p native --tags "@native and @android and @gesture"

# Run negative scenarios
npx cucumber-js -p native --tags "@native and @negative"

# Run menu/logout scenario
npx cucumber-js -p native --tags "@native and @menu"
```

### Switch Between Local Emulator and BrowserStack

**To run on local emulator:**
```properties
# framework.properties
nativeApp.appiumServer=http://localhost:4723
nativeApp.appPath=./testdata/appFiles/demo.apk
nativeApp.appPackage=com.swaglabsmobileapp
nativeApp.appActivity=com.swaglabsmobileapp.SplashActivity
```

**To run on BrowserStack cloud:**
```properties
# framework.properties
nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
nativeApp.appPath=bs://a31cede05f9d9bafcd6aae57dec442e8d368eb96
nativeApp.appPackage=
nativeApp.appActivity=
```

### If Appium Crashes Between Runs

```bash
# Restart Appium
npm run appium:start

# Wait 3 seconds, then run
npm run test:native:smoke
```

### View Reports After Execution

```bash
# Generate HTML report
npm run report
start reports\html\index.html

# View Allure report
npm run allure:serve
```

---

*Last updated: July 2026*
