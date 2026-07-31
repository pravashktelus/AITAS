import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep,
  Status,
  ITestCaseHookParameter,
  ITestStepHookParameter,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';
import { ElementResolver } from '../core/ElementResolver';
import { TestFailureContext } from '../core/RootCauseAnalyzer';
import { TagParser } from '../core/TagParser';
import { CrossBrowserManager } from '../core/CrossBrowserManager';
import { NativeAppEngine } from '../core/NativeAppEngine';
import { FrameworkConfig } from '../config/FrameworkConfig';
import { ArtifactPathResolver } from '../core/ArtifactPathResolver';
import * as fs from 'fs';
import * as path from 'path';

setDefaultTimeout(120_000); // 2 minutes — BrowserStack native sessions can take 30-40s to provision

BeforeAll(async function () {
  const dirs = [
    'reports',
    'reports/html',
    'reports/cucumber-json',
    'reports/allure-results',
    'reports/screenshots',
    'reports/videos',
    'reports/logs',
    'reports/failure-analysis',
    'reports/accessibility',
    'reports/mobile',
    'reports/cross-browser',
    'reports/cross-browser/history',
  ];
  dirs.forEach((dir) => {
    const absDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
  });

  const crossBrowserTarget = process.env.CROSS_BROWSER_TARGET;
  if (crossBrowserTarget) {
    // Use ArtifactPathResolver to create browser-specific artifact directories
    // resolve() automatically detects CROSS_BROWSER_TARGET and creates browser-namespaced dirs
    ['screenshots', 'videos', 'logs'].forEach((artifactType) => {
      ArtifactPathResolver.resolve(artifactType, 'placeholder');
    });
  }

  Logger.info('=== Test Suite Started ===');
});

AfterAll(async function () {
  Logger.info('=== Test Suite Completed ===');
});

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  this.scenarioName = scenario.pickle.name;
  this.scenarioTags = scenario.pickle.tags.map((t) => t.name);

  Logger.scenario(this.scenarioName);
  Logger.info(`Tags: ${this.scenarioTags.join(', ') || 'none'}`);

  const frameworkConfig = FrameworkConfig.getInstance();

  const isApiOnly =
    this.scenarioTags.includes('@api') && !this.scenarioTags.includes('@web');

  const isNativeApp = this.scenarioTags.includes('@native');

  if (isNativeApp) {
    // ─── Native App Testing ──────────────────────────────────────────────────
    // Skip browser launch entirely — use NativeAppEngine via Appium
    const nativeConfig = frameworkConfig.nativeApp;

    const platform = this.scenarioTags.includes('@ios') ? 'ios'
      : this.scenarioTags.includes('@android') ? 'android'
      : (nativeConfig.platform || 'android') as 'ios' | 'android';

    const appiumServer = nativeConfig.appiumServer || 'http://localhost:4723';
    const nativeEngine = new NativeAppEngine(appiumServer, platform);

    // Build capabilities based on platform
    const capabilities: Record<string, any> = {
      platformName: platform === 'ios' ? 'iOS' : 'Android',
      'appium:automationName': platform === 'ios' ? 'XCUITest' : 'UiAutomator2',
      'appium:noReset': nativeConfig.noReset,
      'appium:fullReset': nativeConfig.fullReset,
      'appium:forceAppLaunch': true,
    };

    if (nativeConfig.appPath) {
      capabilities['appium:app'] = nativeConfig.appPath;
    }

    if (platform === 'android') {
      if (nativeConfig.appPackage) {
        capabilities['appium:appPackage'] = nativeConfig.appPackage;
      }
      if (nativeConfig.appActivity) {
        capabilities['appium:appActivity'] = nativeConfig.appActivity;
      }
      if (nativeConfig.autoGrantPermissions) {
        capabilities['appium:autoGrantPermissions'] = true;
      }
    } else {
      if (nativeConfig.bundleId) {
        capabilities['appium:bundleId'] = nativeConfig.bundleId;
      }
    }

    // ─── BrowserStack Cloud Native App Support ───────────────────────────────
    // When appiumServer contains browserstack.com, inject BrowserStack credentials
    if (appiumServer.includes('browserstack.com')) {
      const bsUsername = process.env.BROWSERSTACK_USERNAME;
      const bsAccessKey = process.env.BROWSERSTACK_ACCESS_KEY;
      if (!bsUsername || !bsAccessKey) {
        throw new Error(
          'BrowserStack credentials not found for native app testing. ' +
          'Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in .env'
        );
      }
      // BrowserStack W3C format: appium:app, appium:deviceName, appium:platformVersion + bstack:options
      delete capabilities['appium:app'];
      delete capabilities['appium:automationName'];
      delete capabilities['appium:noReset'];
      delete capabilities['appium:fullReset'];
      delete capabilities['appium:autoGrantPermissions'];

      // Determine the correct app URL based on platform
      // Use BROWSERSTACK_IOS_APP_URL env var for iOS, otherwise fallback to nativeApp.appPath
      let appUrl = nativeConfig.appPath;
      if (platform === 'ios' && process.env.BROWSERSTACK_IOS_APP_URL) {
        appUrl = process.env.BROWSERSTACK_IOS_APP_URL;
      } else if (platform === 'android' && process.env.BROWSERSTACK_ANDROID_APP_URL) {
        appUrl = process.env.BROWSERSTACK_ANDROID_APP_URL;
      }

      // Rebuild in BrowserStack's exact expected format
      capabilities['platformName'] = platform === 'ios' ? 'ios' : 'android';
      capabilities['appium:platformVersion'] = platform === 'ios' ? '17.0' : '13.0';
      capabilities['appium:deviceName'] = platform === 'ios' ? 'iPhone 15' : 'Samsung Galaxy S23';
      capabilities['appium:app'] = appUrl;
      capabilities['bstack:options'] = {
        userName: bsUsername,
        accessKey: bsAccessKey,
      };

      Logger.info(`BrowserStack native app: ${platform} on ${capabilities['appium:deviceName']}, app: ${appUrl}`);
    }

    // ─── LambdaTest Cloud Native App Support ─────────────────────────────────
    // When appiumServer contains lambdatest.com, inject LambdaTest credentials
    if (appiumServer.includes('lambdatest.com')) {
      const ltUsername = process.env.LAMBDATEST_USERNAME;
      const ltAccessKey = process.env.LAMBDATEST_ACCESS_KEY;
      if (!ltUsername || !ltAccessKey) {
        throw new Error(
          'LambdaTest credentials not found for native app testing. ' +
          'Set LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY in .env'
        );
      }

      // Clear local Appium capabilities
      delete capabilities['appium:app'];
      delete capabilities['appium:automationName'];
      delete capabilities['appium:noReset'];
      delete capabilities['appium:fullReset'];
      delete capabilities['appium:autoGrantPermissions'];

      // Determine the correct app URL based on platform
      let appUrl = nativeConfig.appPath;
      if (platform === 'ios' && process.env.LAMBDATEST_IOS_APP_URL) {
        appUrl = process.env.LAMBDATEST_IOS_APP_URL;
      } else if (platform === 'android' && process.env.LAMBDATEST_ANDROID_APP_URL) {
        appUrl = process.env.LAMBDATEST_ANDROID_APP_URL;
      }

      // LambdaTest W3C capabilities format
      capabilities['platformName'] = platform === 'ios' ? 'ios' : 'android';
      capabilities['appium:platformVersion'] = platform === 'ios' ? '17' : '13';
      capabilities['appium:deviceName'] = platform === 'ios' ? 'iPhone 15' : 'Galaxy S23';
      capabilities['appium:app'] = appUrl;
      capabilities['appium:isRealMobile'] = true;
      capabilities['lt:options'] = {
        username: ltUsername,
        accessKey: ltAccessKey,
        build: `Native App Test - ${new Date().toISOString().split('T')[0]}`,
        name: this.scenarioName || 'Native Test',
        platformName: platform === 'ios' ? 'iOS' : 'Android',
        w3c: true,
      };

      Logger.info(`LambdaTest native app: ${platform} on ${capabilities['appium:deviceName']}, app: ${appUrl}`);
    }

    // ─── Pre-flight Check: Verify APK/IPA file exists (local Appium only) ───
    const isCloudProvider = appiumServer.includes('browserstack.com') || appiumServer.includes('lambdatest.com');

    if (!isCloudProvider && nativeConfig.appPath) {
      const appFilePath = path.resolve(process.cwd(), nativeConfig.appPath);
      if (!fs.existsSync(appFilePath)) {
        throw new Error(
          `[Native Pre-flight] App file not found: "${appFilePath}"\n` +
          `Configured path: "${nativeConfig.appPath}" (from framework.properties → nativeApp.appPath)\n` +
          `Please ensure the .apk (Android) or .ipa/.app (iOS) file exists at this location.\n` +
          `Download the SwagLabs demo app from: https://github.com/nickycorea/nickycorea.github.io/blob/main/Android-MyDemoAppRN.1.3.0.build-244.apk`
        );
      }
      Logger.info(`[Native Pre-flight] App file verified: ${appFilePath}`);
    }

    await nativeEngine.createSession(capabilities);
    this.nativeAppEngine = nativeEngine;

    // Start video recording for native app tests
    try {
      await nativeEngine.startVideoRecording({ timeLimit: 180, videoQuality: 'medium' });
      Logger.info('Native app video recording started');
    } catch (videoError) {
      Logger.warn(`Could not start native video recording: ${videoError}`);
    }

    Logger.info(`Native app session created: platform=${platform}, server=${appiumServer}`);
    Logger.info('Native app scenario — skipping browser launch');
    return;
  }

  if (!isApiOnly) {
    // ─── Cross-Browser Tag Validation ─────────────────────────────────────────
    // Reject conflicting browser filter tags (e.g., @chromium-only + @firefox-only)
    const crossBrowserManager = new CrossBrowserManager(frameworkConfig);
    const tagValidation = crossBrowserManager.validateBrowserTags(this.scenarioTags);
    if (!tagValidation.valid) {
      throw new Error(tagValidation.error!);
    }

    // ─── Cross-Browser Filter Check ──────────────────────────────────────────
    // Skip scenario if it should not run on the current browser
    const currentBrowser = frameworkConfig.browser as 'chromium' | 'firefox' | 'webkit';
    const browserFilter = crossBrowserManager.shouldRunOnBrowser(this.scenarioTags, currentBrowser);
    if (!browserFilter.run) {
      Logger.info(`Scenario skipped on ${currentBrowser}: ${browserFilter.reason}`);
      return 'skipped' as any;
    }

    // ─── Cross-Browser Target Detection ──────────────────────────────────────
    // When CROSS_BROWSER_TARGET env var is set (by CrossBrowserRunner child process),
    // use launchForBrowser() instead of standard launch logic
    const crossBrowserTarget = process.env.CROSS_BROWSER_TARGET as 'chromium' | 'firefox' | 'webkit' | undefined;

    if (crossBrowserTarget) {
      const validBrowsers: string[] = ['chromium', 'firefox', 'webkit'];
      if (!validBrowsers.includes(crossBrowserTarget)) {
        throw new Error(
          `Invalid CROSS_BROWSER_TARGET value: "${crossBrowserTarget}". ` +
          `Must be one of: ${validBrowsers.join(', ')}`
        );
      }

      await this.contextManager.launchForBrowser(crossBrowserTarget, frameworkConfig);
      this.initActionEngine();
      Logger.info(`Cross-browser mode: launched ${crossBrowserTarget}`);
    } else {
    // ─── Real Device Testing ─────────────────────────────────────────────────
    // Real device takes precedence over emulation when enabled
    if (frameworkConfig.realDevice.enabled) {
      const { RealDeviceEngine } = await import('../core/RealDeviceEngine');
      const realDeviceEngine = new RealDeviceEngine(frameworkConfig.realDevice as any);

      const available = await realDeviceEngine.isDeviceAvailable();
      if (!available) {
        throw new Error(
          `Real device not available: ${frameworkConfig.realDevice.deviceName} ` +
          `(${frameworkConfig.realDevice.provider})`
        );
      }

      const wsEndpoint = await realDeviceEngine.connect();

      // Connect Playwright to the remote/local device browser
      const { chromium, webkit } = await import('@playwright/test');
      const browserEngine = frameworkConfig.realDevice.platform === 'ios' ? webkit : chromium;
      const browser = await browserEngine.connectOverCDP(wsEndpoint);
      const contexts = browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();

      // Inject the connected browser/context/page into ContextManager
      this.contextManager.setExternalBrowser(browser, context, page);
      this.initActionEngine();

      // Store engine reference for cleanup in After hook
      (this as any).__realDeviceEngine = realDeviceEngine;

      const deviceInfo = realDeviceEngine.getDeviceInfo();
      Logger.info(
        `Connected to real device: ${deviceInfo.deviceName} ` +
        `(${deviceInfo.platform} ${deviceInfo.osVersion}, ${deviceInfo.browser}, ${deviceInfo.provider})`
      );
    } else {
    // ─── Tag-Driven Mobile Device Emulation ──────────────────────────────────
    const hasMobileTags =
      TagParser.parseDeviceTag(this.scenarioTags) !== null ||
      TagParser.hasMobileTag(this.scenarioTags);

    if (hasMobileTags) {
      // Launch with device emulation instead of regular launch
      await this.contextManager.launchWithDeviceEmulation(this.scenarioTags, frameworkConfig);

      // Apply network condition after emulation if configured
      this.initActionEngine();
      if (frameworkConfig.mobile.networkCondition) {
        await this.mobileEngine.setNetworkConditionSafe(
          frameworkConfig.mobile.networkCondition,
          frameworkConfig.browser as 'chromium' | 'firefox' | 'webkit'
        );
      }
    } else {
      // Standard browser launch (no mobile emulation)
      await this.contextManager.launch();
      this.initActionEngine();

      // Store lighthouse port for LighthouseSteps to access
      const lhPort = parseInt(frameworkConfig.get('lighthouse.port', '9222'), 10);
      (this as any).__lighthousePort = lhPort;
    }
    } // end of realDevice.enabled else block
    } // end of crossBrowserTarget else block

    // ─── Accessibility Auto-Audit Registration ───────────────────────────────
    // Wire accessibility navigation listener when @accessibility/@a11y tag present
    // AND accessibility.enabled is true in config
    if (TagParser.hasAccessibilityTag(this.scenarioTags) && frameworkConfig.accessibility.enabled) {
      const page = this.contextManager.getPage();
      this.accessibilityEngine.registerNavigationListener(page, frameworkConfig.accessibility);
      Logger.info('Accessibility auto-audit registered for navigation events');
    }

    Logger.info('Browser ready for scenario');
  } else {
    Logger.info('API-only scenario — skipping browser launch');
  }
});

BeforeStep(async function (this: CustomWorld, step: ITestStepHookParameter) {
  const text = step.pickleStep.text;
  Logger.step(text);
  this.recordAction(`Step: ${text}`);

  // Capture step start time for duration tracking
  this.stepTimings.set(text, { startTime: Date.now(), endTime: 0 });

  if (this.actionEngine) {
    this.actionEngine.clearStepHealingResults();
  }
});

AfterStep(async function (this: CustomWorld, step: ITestStepHookParameter) {
  const text = step.pickleStep.text;
  // Capture step end time for duration tracking
  const stepTiming = this.stepTimings.get(text);
  if (stepTiming) {
    stepTiming.endTime = Date.now();
  }

  if (this.actionEngine) {
    const healingResults = this.actionEngine.getStepHealingResults();
    if (healingResults.length > 0) {
      const healingHtml = `
<html>
<head>
  <style>
    .healing-container { font-family: 'Segoe UI', Arial, sans-serif; }
    .healing-container body { background: #f8f9fa; margin: 0; padding: 16px; }
    .healing-card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 16px; overflow: hidden; }
    .healing-header { background: linear-gradient(135deg, #2e7d32, #43a047); color: white; padding: 14px 20px; display: flex; align-items: center; gap: 10px; }
    .healing-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .healing-badge { background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px; font-size: 11px; }
    .healing-body { padding: 16px 20px; }
    .locator-row { display: flex; align-items: center; margin: 10px 0; gap: 12px; }
    .locator-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #666; min-width: 90px; }
    .locator-old { background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 6px 12px; font-family: 'Fira Code', monospace; font-size: 13px; color: #c62828; text-decoration: line-through; flex: 1; }
    .locator-new { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 4px; padding: 6px 12px; font-family: 'Fira Code', monospace; font-size: 13px; color: #2e7d32; font-weight: 600; flex: 1; }
    .arrow { font-size: 20px; color: #43a047; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #eee; }
    .meta-item { text-align: center; }
    .meta-value { font-size: 18px; font-weight: 700; color: #1b5e20; }
    .meta-label { font-size: 10px; text-transform: uppercase; color: #888; margin-top: 2px; }
    .fallbacks { margin-top: 14px; padding-top: 14px; border-top: 1px solid #eee; }
    .fallbacks h4 { margin: 0 0 8px; font-size: 12px; color: #666; text-transform: uppercase; }
    .fallback-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
    .fallback-type { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .fallback-selector { font-family: 'Fira Code', monospace; color: #555; }
    .fallback-confidence { color: #888; font-size: 11px; }
  </style>
</head>
<body>
  <div class="healing-container">
${healingResults.map((hr, idx) => `
  <div class="healing-card">
    <div class="healing-header">
      <span>🩹</span>
      <h3>Self-Healing Activated</h3>
      <span class="healing-badge">${hr.bestLocator?.type || 'unknown'}</span>
    </div>
    <div class="healing-body">
      <div class="locator-row">
        <span class="locator-label">Failed:</span>
        <code class="locator-old">${hr.originalLocator}</code>
      </div>
      <div class="locator-row">
        <span class="locator-label">Healed:</span>
        <code class="locator-new">${hr.bestLocator?.rawSelector || 'N/A'}</code>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-value">${hr.confidence}%</div>
          <div class="meta-label">Confidence</div>
        </div>
        <div class="meta-item">
          <div class="meta-value">${hr.bestLocator?.type || '-'}</div>
          <div class="meta-label">Strategy</div>
        </div>
        <div class="meta-item">
          <div class="meta-value">${hr.fallbackLocators.length}</div>
          <div class="meta-label">Fallbacks</div>
        </div>
      </div>
      ${hr.fallbackLocators.length > 0 ? `
      <div class="fallbacks">
        <h4>Fallback Locators</h4>
        ${hr.fallbackLocators.slice(0, 5).map(fb => `
        <div class="fallback-item">
          <span class="fallback-type">${fb.type}</span>
          <span class="fallback-selector">${fb.rawSelector}</span>
          <span class="fallback-confidence">(${fb.confidence}%)</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>
`).join('')}
  </div>
</body>
</html>`;

      await this.attach(healingHtml, 'text/html');
    }
  }

  if (step.result.status === Status.FAILED) {
    this.testFailed = true;
    Logger.error(`Step failed: ${step.pickleStep.text}`);

    if (this.contextManager && this.visualTestingEngine) {
      try {
        // Use ArtifactPathResolver to store failure screenshots in browser-specific directories
        const screenshotFilename = `failure_${Date.now()}.png`;
        const resolvedScreenshotPath = ArtifactPathResolver.resolve('screenshots', screenshotFilename);
        const page = this.contextManager.getPage();
        await page.screenshot({ path: resolvedScreenshotPath, fullPage: true });
        const screenshotBuffer = fs.readFileSync(resolvedScreenshotPath);
        
        await this.attach(screenshotBuffer, 'image/png');
        Logger.info(`Screenshot attached to report on step failure: ${resolvedScreenshotPath}`);

        if (this.rootCauseAnalyzer) {
          const failureContext: TestFailureContext = {
            scenarioName: this.scenarioName,
            failureMessage: step.result?.message || 'Unknown error',
            errorStack: step.result?.message,
            lastActions: step.pickleStep.text ? [step.pickleStep.text] : [],
            pageUrl: await this.contextManager.getPage().url(),
            pageTitle: await this.contextManager.getPage().title(),
            screenshot: screenshotBuffer.toString('base64'),
          };

          Logger.info('Initiating root cause analysis for failure...');
          const { analysis, suggestions, report } = await this.rootCauseAnalyzer.analyzeFailure(
            failureContext
          );

          Logger.info(`Failure analysis report: ${report}`);

          const rcaHtml = `
<html>
<head>
  <style>
    .rca-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .rca-container * { margin: 0; padding: 0; box-sizing: border-box; }
    .rca-card { background: #16213e; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 900px; margin: 0 auto; }
    .rca-header { background: linear-gradient(135deg, #e53935, #b71c1c); padding: 20px 24px; display: flex; align-items: center; gap: 12px; }
    .rca-header h2 { color: white; font-size: 18px; font-weight: 600; margin: 0; }
    .rca-header .icon { font-size: 24px; }
    .rca-body { padding: 24px; }
    .rca-section { margin-bottom: 20px; }
    .rca-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #90a4ae; font-weight: 700; margin-bottom: 8px; }
    .rca-failure-box { background: #2d1b1b; border: 1px solid #5c2020; border-radius: 8px; padding: 14px 16px; font-family: 'Fira Code', monospace; font-size: 12px; color: #ef9a9a; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
    .rca-context-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rca-context-item { background: #1a2744; border-radius: 8px; padding: 12px 14px; }
    .rca-context-label { font-size: 10px; text-transform: uppercase; color: #78909c; margin-bottom: 4px; }
    .rca-context-value { font-size: 13px; color: #b0bec5; word-break: break-all; }
    .rca-analysis-box { background: #1a2744; border-radius: 8px; padding: 16px; font-size: 13px; color: #cfd8dc; line-height: 1.7; }
    .rca-analysis-box p { margin-bottom: 10px; }
    .rca-analysis-box ul, .rca-analysis-box ol { margin: 8px 0 8px 20px; }
    .rca-analysis-box li { margin-bottom: 6px; }
    .rca-analysis-box strong, .rca-analysis-box b { color: #fff; }
    .rca-suggestions-list { list-style: none; padding: 0; }
    .rca-suggestion { background: #1a2744; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 10px; }
    .rca-suggestion-num { background: #ff6f00; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .rca-suggestion-text { font-size: 13px; color: #b0bec5; }
    .rca-footer { padding: 14px 24px; background: #0f1a2e; text-align: center; font-size: 11px; color: #546e7a; }
  </style>
</head>
<body>
  <div class="rca-container">
    <div class="rca-card">
    <div class="rca-header">
      <span class="icon">🔴</span>
      <h2>Root Cause Analysis</h2>
    </div>
    <div class="rca-body">
      <div class="rca-section">
        <div class="rca-section-title">Failure Message</div>
        <div class="rca-failure-box">${(step.result?.message || 'Unknown error').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
      <div class="rca-section">
        <div class="rca-section-title">Page Context</div>
        <div class="rca-context-grid">
          <div class="rca-context-item">
            <div class="rca-context-label">URL</div>
            <div class="rca-context-value">${failureContext.pageUrl}</div>
          </div>
          <div class="rca-context-item">
            <div class="rca-context-label">Title</div>
            <div class="rca-context-value">${failureContext.pageTitle}</div>
          </div>
        </div>
      </div>
      <div class="rca-section">
        <div class="rca-section-title">Root Cause Analysis</div>
        <div class="rca-analysis-box">${analysis.split(/Suggested Fix/i)[0].trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/^### (.+)$/gm, '<p><strong>$1</strong></p>').replace(/^## (.+)$/gm, '<p><strong>$1</strong></p>').replace(/^# (.+)$/gm, '<p><strong>$1</strong></p>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code style="background:#263238;padding:2px 5px;border-radius:3px;font-size:12px;">$1</code>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
      </div>
      <div class="rca-section">
        <div class="rca-section-title">Suggested Fixes</div>
        <ol class="rca-suggestions-list">
          ${suggestions.slice(0, 3).map((s, i) => `<div class="rca-suggestion"><span class="rca-suggestion-num">${i + 1}</span><span class="rca-suggestion-text">${s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>')}</span></div>`).join('\n')}
        </ol>
      </div>
    </div>
    <div class="rca-footer">Analysis generated by AI-powered RootCauseAnalyzer</div>
    </div>
  </div>
</body>
</html>
`;
          await this.attach(rcaHtml, 'text/html');
        }
      } catch (error) {
        Logger.warn(`Failed to capture screenshot or analyze failure: ${error}`);
      }
    }
  }
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const status = scenario.result?.status;
  const failed = status === Status.FAILED;

  if (failed) {
    Logger.testFailed(this.scenarioName, scenario.result?.message);
    
    if (this.contextManager && this.visualTestingEngine) {
      try {
        // Use ArtifactPathResolver for browser-specific screenshot storage
        const screenshotFilename = `final_failure_${Date.now()}.png`;
        const resolvedScreenshotPath = ArtifactPathResolver.resolve('screenshots', screenshotFilename);
        const page = this.contextManager.getPage();
        await page.screenshot({ path: resolvedScreenshotPath, fullPage: true });
        const screenshotBuffer = fs.readFileSync(resolvedScreenshotPath);
        await this.attach(screenshotBuffer, 'image/png');
        Logger.info(`Final screenshot attached to report on scenario failure: ${resolvedScreenshotPath}`);
      } catch (error) {
        Logger.warn(`Failed to capture final screenshot: ${error}`);
      }
    }
  } else {
    Logger.testPassed(this.scenarioName);
  }

  if (failed) {
    const dump = JSON.stringify(DataStore.dump(), null, 2);
    await this.attach(`DataStore State:\n${dump}`, 'text/plain');
  }

  // ─── Real Device Cleanup ───────────────────────────────────────────────────
  if ((this as any).__realDeviceEngine) {
    try {
      const realDeviceEngine = (this as any).__realDeviceEngine;
      const deviceInfo = realDeviceEngine.getDeviceInfo();
      await realDeviceEngine.disconnect();
      Logger.info(`Real device disconnected: ${deviceInfo.deviceName} (${deviceInfo.provider})`);

      // Attach real device metadata to report
      const realDeviceReport = `
═══════════════════════════════════════════════════════════════════
            REAL DEVICE TEST METADATA
═══════════════════════════════════════════════════════════════════

Provider:      ${deviceInfo.provider}
Platform:      ${deviceInfo.platform}
Device:        ${deviceInfo.deviceName}
OS Version:    ${deviceInfo.osVersion}
Browser:       ${deviceInfo.browser}

═══════════════════════════════════════════════════════════════════
`;
      await this.attach(realDeviceReport, 'text/plain');
    } catch (error) {
      Logger.warn(`Error during real device cleanup: ${error}`);
    }
  }

  // ─── Native App Cleanup ────────────────────────────────────────────────────
  if (this.nativeAppEngine) {
    try {
      // Capture screenshot on native app failure
      if (failed) {
        try {
          const screenshot = await this.nativeAppEngine.takeScreenshot();
          if (screenshot) {
            const screenshotBuffer = Buffer.from(screenshot, 'base64');
            await this.attach(screenshotBuffer, 'image/png');
            Logger.info('Native app failure screenshot attached to report');
          }
        } catch (screenshotError) {
          Logger.warn(`Failed to capture native app screenshot: ${screenshotError}`);
        }
      }

      // Stop video recording and save/attach
      try {
        const videoPath = path.resolve(process.cwd(), 'reports', 'videos', `native-${Date.now()}.mp4`);
        const savedPath = await this.nativeAppEngine.stopAndSaveVideo(videoPath);
        if (savedPath) {
          Logger.info(`Native app video saved: ${savedPath}`);
          // Attach video as report link
          await this.attach(`Native app video recording saved: ${savedPath}`, 'text/plain');
        }
      } catch (videoError) {
        Logger.warn(`Could not save native video recording: ${videoError}`);
      }

      await this.nativeAppEngine.deleteSession();
      this.nativeAppEngine = null;
      Logger.info('Native app session cleaned up');

      // Attach native app device metadata to report
      const nativeConfig = FrameworkConfig.getInstance().nativeApp;
      const appiumServer = nativeConfig.appiumServer || '';
      let provider = 'Local Appium';
      if (appiumServer.includes('browserstack.com')) provider = 'BrowserStack';
      else if (appiumServer.includes('lambdatest.com')) provider = 'LambdaTest';

      const nativePlatform = this.scenarioTags.includes('@ios') ? 'iOS' : 'Android';
      const deviceName = nativePlatform === 'iOS' ? 'iPhone 15' : 'Samsung Galaxy S23';
      const platformVersion = nativePlatform === 'iOS' ? '17.0' : '13.0';
      const appUrl = nativeConfig.appPath || 'N/A';

      const nativeDeviceReport = `
═══════════════════════════════════════════════════════════════════
            NATIVE APP TEST — DEVICE METADATA
═══════════════════════════════════════════════════════════════════

Provider:         ${provider}
Platform:         ${nativePlatform}
Device:           ${deviceName}
OS Version:       ${platformVersion}
App URL:          ${appUrl}
Appium Server:    ${appiumServer}
Status:           ${failed ? '❌ FAILED' : '✅ PASSED'}

═══════════════════════════════════════════════════════════════════
`;
      await this.attach(nativeDeviceReport, 'text/plain');

      // Also attach as styled HTML for rich report display
      const nativeDeviceHtml = `
<html>
<head>
  <style>
    .native-meta { font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .native-meta-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .native-meta-header { background: linear-gradient(135deg, #7c3aed, #9333ea); color: white; padding: 14px 20px; display: flex; align-items: center; gap: 10px; }
    .native-meta-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .native-meta-body { padding: 16px 20px; }
    .native-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .native-meta-item { padding: 12px; background: #f3e8ff; border-radius: 6px; }
    .native-meta-label { font-size: 10px; text-transform: uppercase; color: #6b21a8; font-weight: 700; margin-bottom: 4px; }
    .native-meta-value { font-size: 14px; font-weight: 600; color: #1e293b; }
    .native-meta-full { grid-column: span 2; padding: 10px 12px; background: #faf5ff; border-radius: 6px; font-family: monospace; font-size: 12px; color: #6b21a8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="native-meta">
    <div class="native-meta-card">
      <div class="native-meta-header">
        <span>📱</span>
        <h3>Native App Test — ${provider}</h3>
      </div>
      <div class="native-meta-body">
        <div class="native-meta-grid">
          <div class="native-meta-item">
            <div class="native-meta-label">Platform</div>
            <div class="native-meta-value">${nativePlatform}</div>
          </div>
          <div class="native-meta-item">
            <div class="native-meta-label">Device</div>
            <div class="native-meta-value">${deviceName}</div>
          </div>
          <div class="native-meta-item">
            <div class="native-meta-label">OS Version</div>
            <div class="native-meta-value">${platformVersion}</div>
          </div>
          <div class="native-meta-item">
            <div class="native-meta-label">Provider</div>
            <div class="native-meta-value">${provider}</div>
          </div>
          <div class="native-meta-full">
            <div class="native-meta-label">App</div>
            ${appUrl}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
      await this.attach(nativeDeviceHtml, 'text/html');
    } catch (error) {
      Logger.warn(`Error during native app cleanup: ${error}`);
      this.nativeAppEngine = null;
    }
  }

  // ─── Device Emulation Metadata (Requirement 1.8) ───────────────────────────
  if (this.mobileEngine) {
    const emulationMetadata = this.mobileEngine.getEmulationMetadata();
    if (emulationMetadata) {
      const metadataReport = `
═══════════════════════════════════════════════════════════════════
            DEVICE EMULATION METADATA
═══════════════════════════════════════════════════════════════════

Device Name:   ${emulationMetadata.deviceName}
Viewport:      ${emulationMetadata.viewport.width}x${emulationMetadata.viewport.height}
Orientation:   ${emulationMetadata.orientation}

═══════════════════════════════════════════════════════════════════
`;
      await this.attach(metadataReport, 'text/plain');

      const metadataHtml = `
<html>
<head>
  <style>
    .device-meta { font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .device-meta-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .device-meta-header { background: linear-gradient(135deg, #1565c0, #1976d2); color: white; padding: 14px 20px; display: flex; align-items: center; gap: 10px; }
    .device-meta-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .device-meta-body { padding: 16px 20px; }
    .device-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .device-meta-item { text-align: center; padding: 12px; background: #e3f2fd; border-radius: 6px; }
    .device-meta-value { font-size: 16px; font-weight: 700; color: #1565c0; }
    .device-meta-label { font-size: 11px; text-transform: uppercase; color: #666; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="device-meta">
    <div class="device-meta-card">
      <div class="device-meta-header">
        <span>📱</span>
        <h3>Device Emulation Active</h3>
      </div>
      <div class="device-meta-body">
        <div class="device-meta-grid">
          <div class="device-meta-item">
            <div class="device-meta-value">${emulationMetadata.deviceName}</div>
            <div class="device-meta-label">Device</div>
          </div>
          <div class="device-meta-item">
            <div class="device-meta-value">${emulationMetadata.viewport.width}x${emulationMetadata.viewport.height}</div>
            <div class="device-meta-label">Viewport</div>
          </div>
          <div class="device-meta-item">
            <div class="device-meta-value">${emulationMetadata.orientation}</div>
            <div class="device-meta-label">Orientation</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
      await this.attach(metadataHtml, 'text/html');
      Logger.info(`Device emulation metadata attached: ${emulationMetadata.deviceName} (${emulationMetadata.viewport.width}x${emulationMetadata.viewport.height}, ${emulationMetadata.orientation})`);
    }
  }

  // ─── Accessibility Report Attachment (Requirement 3.2) ─────────────────────
  if (TagParser.hasAccessibilityTag(this.scenarioTags) && this.accessibilityEngine) {
    try {
      const reportDir = 'reports/accessibility';
      if (fs.existsSync(reportDir)) {
        const reportFiles = fs.readdirSync(reportDir)
          .filter(f => f.endsWith('.html'))
          .sort()
          .reverse()
          .slice(0, 1);

        if (reportFiles.length > 0) {
          const reportPath = `${reportDir}/${reportFiles[0]}`;
          const reportContent = fs.readFileSync(reportPath, 'utf8');
          await this.attach(reportContent, 'text/html');
          Logger.info('Accessibility HTML report attached to Cucumber output');
        }
      }

      // Attach cumulative violation summary
      const violationCount = this.accessibilityEngine.getCumulativeViolationCount();
      if (violationCount > 0) {
        const a11ySummary = `Accessibility Violations Found: ${violationCount}`;
        await this.attach(a11ySummary, 'text/plain');
      }
    } catch (error) {
      Logger.warn(`Could not attach accessibility report: ${error}`);
    }

    // ─── Lighthouse Auto-Audit (runs alongside AccessibilityEngine) ──────────────
    // Both engines now run together when @accessibility tag is present:
    //   - AccessibilityEngine: custom AXTree-based WCAG checks (runs on every navigation)
    //   - Lighthouse: axe-core + performance/SEO/best-practices scoring (runs once after scenario)
    // Lighthouse requires: lighthouse.enabled=true, Chromium browser, @accessibility/@a11y tag
    const lhFrameworkConfig = FrameworkConfig.getInstance();
    const lhEnabled = lhFrameworkConfig.get('lighthouse.enabled', 'false') === 'true';
    const lhPort = (this as any).__lighthousePort || parseInt(lhFrameworkConfig.get('lighthouse.port', '9222'), 10);
    const hasA11yTag = TagParser.hasAccessibilityTag(this.scenarioTags);

    if (lhEnabled && hasA11yTag && this.contextManager && lhFrameworkConfig.browser === 'chromium') {
      try {
        const { LighthouseEngine } = await import('../core/LighthouseEngine');
        const lighthouseEngine = new LighthouseEngine(lhPort);
        const page = this.contextManager.getPage();
        const result = await lighthouseEngine.audit(page);

        // Attach Lighthouse HTML report to Cucumber output
        if (result.reportPath && fs.existsSync(result.reportPath)) {
          const lhReport = fs.readFileSync(result.reportPath, 'utf8');
          await this.attach(lhReport, 'text/html');
        }

        // Attach scores summary
        const scoresSummary = `
═══════════════════════════════════════════════════════════════════
            LIGHTHOUSE AUDIT SCORES
═══════════════════════════════════════════════════════════════════

Accessibility:   ${result.scores.accessibility}/100
Performance:     ${result.scores.performance}/100
Best Practices:  ${result.scores.bestPractices}/100
SEO:             ${result.scores.seo}/100

═══════════════════════════════════════════════════════════════════
`;
        await this.attach(scoresSummary, 'text/plain');
        Logger.info(`[Lighthouse] Auto-audit complete: A11y=${result.scores.accessibility}, Perf=${result.scores.performance}, BP=${result.scores.bestPractices}, SEO=${result.scores.seo}`);
      } catch (lhError) {
        Logger.warn(`[Lighthouse] Auto-audit skipped: ${lhError instanceof Error ? lhError.message : String(lhError)}`);
      }
    }
  }

  // ─── Load Test Auto-Execution (silent, like accessibility) ─────────────────
  // When @loadtest or @performance tag is present, automatically run a load test
  // on the current page URL after the scenario completes (non-blocking)
  if (TagParser.hasLoadTestTag(this.scenarioTags) && this.contextManager && !failed) {
    const ltConfig = FrameworkConfig.getInstance();
    const ltEnabled = ltConfig.get('loadtest.enabled', 'true') === 'true';

    if (ltEnabled) {
      try {
        const { LoadTestEngine } = await import('../core/LoadTestEngine');
        const loadEngine = new LoadTestEngine();
        const page = this.contextManager.getPage();
        const currentUrl = page.url();

        if (currentUrl && currentUrl !== 'about:blank') {
          const virtualUsers = parseInt(ltConfig.get('loadtest.virtualUsers', '5'), 10);
          const duration = parseInt(ltConfig.get('loadtest.duration', '15'), 10);
          const rampUp = parseInt(ltConfig.get('loadtest.rampUp', '3'), 10);
          const thinkTime = parseInt(ltConfig.get('loadtest.thinkTime', '1000'), 10);
          const pageTimeout = parseInt(ltConfig.get('loadtest.pageTimeout', '30000'), 10);

          Logger.info(`[LoadTest] Auto-running: ${virtualUsers} VUs → ${currentUrl} for ${duration}s`);
          const result = await loadEngine.run({
            url: currentUrl,
            virtualUsers,
            duration,
            rampUp,
            thinkTime,
            pageTimeout,
          });

          // Attach load test report to Cucumber output
          if (result.reportPath && fs.existsSync(result.reportPath)) {
            const reportContent = fs.readFileSync(result.reportPath, 'utf8');
            await this.attach(reportContent, 'text/html');
          }

          const summary = `
═══════════════════════════════════════════════════════════════════
              LOAD TEST RESULTS (Auto)
═══════════════════════════════════════════════════════════════════
URL:               ${result.url}
Virtual Users:     ${result.virtualUsers}
Duration:          ${result.duration.toFixed(1)}s
Total Requests:    ${result.totalRequests}
Throughput:        ${result.throughput.toFixed(2)} req/s
Avg Response:      ${result.avgResponseTime.toFixed(0)}ms
P95:               ${result.p95.toFixed(0)}ms
Error Rate:        ${result.errorRate.toFixed(1)}%
═══════════════════════════════════════════════════════════════════
`;
          await this.attach(summary, 'text/plain');
          Logger.info(`[LoadTest] Complete: ${result.throughput.toFixed(1)} req/s, avg ${result.avgResponseTime.toFixed(0)}ms`);
        }
      } catch (loadError) {
        Logger.warn(`[LoadTest] Auto-load-test skipped: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
      }
    }
  }

  if (this.selfHealingEngine) {
    const stats = this.selfHealingEngine.getCacheStats();
    if (stats && stats.size > 0 && stats.entries) {
      Logger.info(
        `Self-healing cache statistics: ${stats.size} entries cached`
      );
      
      const detailedStats = this.selfHealingEngine.getDetailedHealingStats();
      
      const shReport = `
═══════════════════════════════════════════════════════════════════════════════
                    SELF-HEALING ENGINE DETAILED REPORT
═══════════════════════════════════════════════════════════════════════════════

Total Locators Healed: ${stats.size}

${detailedStats.map((healing, idx) => `
${idx + 1}. ELEMENT REFERENCE: ${healing.reference}
   ┌─────────────────────────────────────────────────────────────────────
   │ Original (Broken) Locator:  ${healing.originalLocator}
   │ Healed (New) Locator:       ${healing.healedLocator}
   │ Locator Type:               ${healing.type}
   │ Confidence Score:           ${healing.confidence}%
   │ Description:                ${healing.reason}
   ${healing.elementTag ? `│ Element Tag:                <${healing.elementTag}>` : ''}
   ${healing.elementText ? `│ Element Text:               "${healing.elementText}"` : ''}
   └─────────────────────────────────────────────────────────────────────
`).join('')}

Status: ✓ Self-healing successfully recovered ${stats.size} broken locator(s)

═══════════════════════════════════════════════════════════════════════════════
`;
      await this.attach(shReport, 'text/plain');

      const shHtml = `
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background-color: #f5f5f5; 
      color: #333;
    }
    .container { 
      max-width: 1200px; 
      margin: 20px auto; 
      background: white; 
      padding: 20px; 
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header { 
      background-color: #2e7d32; 
      color: white; 
      padding: 20px; 
      border-radius: 5px; 
      margin-bottom: 20px;
    }
    .header h2 { margin: 0; }
    .stats { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
      margin: 20px 0;
    }
    .stat-box { 
      background: #e8f5e9; 
      padding: 15px; 
      border-radius: 5px; 
      border-left: 4px solid #2e7d32; 
      text-align: center;
    }
    .stat-number { 
      font-size: 32px; 
      font-weight: bold; 
      color: #2e7d32; 
    }
    .stat-label { 
      color: #666; 
      font-size: 13px; 
      margin-top: 5px;
    }
    .healing-item {
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin: 15px 0;
      border-left: 5px solid #2e7d32;
    }
    .healing-item h4 {
      color: #2e7d32;
      margin: 0 0 10px 0;
    }
    .locator-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 10px 0;
    }
    .locator-box {
      padding: 10px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
    }
    .old-locator {
      background: #ffebee;
      border: 1px solid #ef5350;
      color: #c62828;
    }
    .new-locator {
      background: #e8f5e9;
      border: 1px solid #66bb6a;
      color: #2e7d32;
    }
    .label {
      font-size: 11px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .meta-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
      font-size: 13px;
    }
    .meta-item {
      padding: 8px;
      background: white;
      border-radius: 3px;
    }
    .meta-label {
      font-weight: bold;
      color: #2e7d32;
    }
    .confidence-bar {
      height: 20px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
      margin: 5px 0;
    }
    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, #66bb6a 0%, #2e7d32 100%);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
    .description {
      background: white;
      padding: 10px;
      border-radius: 3px;
      border-left: 3px solid #2196F3;
      font-size: 13px;
      margin-top: 10px;
      font-style: italic;
      color: #555;
    }
    .summary {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      text-align: center;
      color: #2e7d32;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✓ Self-Healing Engine Report</h2>
    </div>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-number">${stats.size || 0}</div>
        <div class="stat-label">Elements Healed</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">100%</div>
        <div class="stat-label">Recovery Rate</div>
      </div>
    </div>
    
    <h3>Healed Locators Details:</h3>
    ${detailedStats.map((healing, idx) => `
    <div class="healing-item">
      <h4>${idx + 1}. ${healing.reference}</h4>
      
      <div class="locator-pair">
        <div>
          <div class="label">❌ Original (Broken) Locator</div>
          <div class="locator-box old-locator">${healing.originalLocator}</div>
        </div>
        <div>
          <div class="label">✓ Healed (New) Locator</div>
          <div class="locator-box new-locator">${healing.healedLocator}</div>
        </div>
      </div>
      
      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Healing Strategy:</span> ${healing.type}
        </div>
        <div class="meta-item">
          <span class="meta-label">Confidence:</span> ${healing.confidence}%
        </div>
      </div>
      
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${healing.confidence}%">${healing.confidence}%</div>
      </div>
      
      <div class="description">
        <strong>Why:</strong> ${healing.reason}
      </div>
      
      ${healing.elementTag ? `
      <div class="meta-info" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
        <div class="meta-item">
          <span class="meta-label">Element Tag:</span> &lt;${healing.elementTag}&gt;
        </div>
        ${healing.elementText ? `<div class="meta-item"><span class="meta-label">Text Content:</span> "${healing.elementText}"</div>` : ''}
      </div>
      ` : ''}
    </div>
    `).join('')}
    
    <div class="summary">
      <strong>✓ Self-healing successfully recovered ${stats.size} broken locator${stats.size !== 1 ? 's' : ''}!</strong>
    </div>
  </div>
</body>
</html>
`;
      await this.attach(shHtml, 'text/html');
    }
  }

  if (this.visualTestingEngine && this.scenarioTags && this.scenarioTags.includes('@visual')) {
    const screenshotsLocation = ArtifactPathResolver.getCurrentBrowser()
      ? `reports/screenshots/${ArtifactPathResolver.getCurrentBrowser()}/`
      : 'reports/screenshots/';
    const visualReport = `
═══════════════════════════════════════════════════════════════════
            VISUAL TESTING REPORT
═══════════════════════════════════════════════════════════════════

Scenario: ${this.scenarioName || 'Unknown'}
Status: ${status === Status.PASSED ? '✓ PASSED' : '✗ FAILED'}

Screenshots captured and stored in: ${screenshotsLocation}

Visual Testing Performed:
  ✓ Full page screenshot capture
  ✓ Anomaly detection
  ✓ Visual regression testing

═══════════════════════════════════════════════════════════════════
`;
    await this.attach(visualReport, 'text/plain');

    const visualHtml = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 1000px; margin: 20px auto; background: white; padding: 20px; border-radius: 5px; }
    .header { background-color: #1976d2; color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
    .status { padding: 10px; border-radius: 3px; margin: 10px 0; }
    .passed { background: #e8f5e9; color: #2e7d32; }
    .failed { background: #ffebee; color: #d32f2f; }
    .checks { list-style: none; padding: 0; }
    .check-item { padding: 10px; margin: 5px 0; background: #e3f2fd; border-left: 4px solid #1976d2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📸 Visual Testing Report</h2>
    </div>
    
    <div class="status ${status === Status.PASSED ? 'passed' : 'failed'}">
      Status: ${status === Status.PASSED ? '✓ PASSED' : '✗ FAILED'}
    </div>
    
    <h3>Visual Tests Performed:</h3>
    <ul class="checks">
      <li class="check-item">✓ Full page screenshot capture</li>
      <li class="check-item">✓ AI-powered anomaly detection</li>
      <li class="check-item">✓ Visual regression testing</li>
      <li class="check-item">✓ Element comparison</li>
    </ul>
    
    <p><strong>Screenshots Location:</strong> ${screenshotsLocation}</p>
  </div>
</body>
</html>
`;
    await this.attach(visualHtml, 'text/html');
  }

  if (failed) {
    try {
      const logsDir = 'reports/logs';
      if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.log'))
          .sort()
          .reverse()
          .slice(0, 1);

        if (logFiles.length > 0) {
          const logPath = `${logsDir}/${logFiles[0]}`;
          const logContent = fs.readFileSync(logPath, 'utf8');
          await this.attach(`Error Logs (${logFiles[0]}):\n${logContent}`, 'text/plain');
          Logger.info('Error logs attached to report');
        }
      }
    } catch (error) {
      Logger.warn(`Could not attach error logs: ${error}`);
    }
  }

  if (this.contextManager) {
    await this.contextManager.close(failed).catch(() => {});
  }

  DataStore.clear();
  ElementResolver.clearCache();
  if (this.selfHealingEngine) {
    this.selfHealingEngine.clearCache();
  }
  if (this.rootCauseAnalyzer) {
    this.rootCauseAnalyzer.clearHistory();
  }

  // Save step timings for Allure report duration tracking
  if (this.stepTimings.size > 0) {
    try {
      const timingsObj: { [key: string]: { startTime: number; endTime: number; duration: number } } = {};
      this.stepTimings.forEach((timing, stepName) => {
        timingsObj[stepName] = {
          startTime: timing.startTime,
          endTime: timing.endTime,
          duration: timing.endTime - timing.startTime
        };
      });

      // Sanitize scenario name for use in file path (remove special chars that are invalid on Windows)
      const safeName = scenario.pickle.name
        .replace(/[^a-zA-Z0-9\-_]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
      const allureResultsDir = path.resolve(process.cwd(), 'reports', 'allure-results');
      if (!fs.existsSync(allureResultsDir)) {
        fs.mkdirSync(allureResultsDir, { recursive: true });
      }
      const scenarioTimingsFile = path.join(allureResultsDir, `step-timings-${safeName}-${Date.now()}.json`);
      fs.writeFileSync(scenarioTimingsFile, JSON.stringify(timingsObj, null, 2));
    } catch (timingError) {
      Logger.warn(`Could not save step timings: ${timingError}`);
    }
  }
});

Before({ tags: '@ignore' }, async function (this: CustomWorld) {
  return 'skipped' as any;
});

Before({ tags: '@slow' }, async function (this: CustomWorld) {
  Logger.warn('Running a @slow scenario — timeout extended');
});

Before({ tags: '@visual' }, async function (this: CustomWorld) {
  Logger.info('Visual testing enabled for this scenario');
});

Before({ tags: '@self-healing' }, async function (this: CustomWorld) {
  Logger.info('Self-healing enabled for this scenario');
});
