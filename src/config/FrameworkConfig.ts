import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env — override:true ensures .env file values take precedence over
// any pre-existing system/user environment variables (e.g., stale BrowserStack creds)
dotenv.config({ override: true });
dotenv.config({ path: path.resolve(__dirname, '../../features/.env'), override: true });

/**
 * Mobile device emulation configuration.
 * Parsed from `mobile.*` properties in framework.properties.
 */
export interface MobileConfig {
  /** Default device profile name (e.g., "iPhone 14") */
  defaultDevice: string;
  /** Default orientation for mobile scenarios */
  defaultOrientation: 'portrait' | 'landscape';
  /** Network throttling condition, empty string means no throttling */
  networkCondition: '2G' | '3G' | '4G' | 'fast' | '';
  /**
   * Execution mode — determines HOW mobile tests run:
   * - 'emulation' (default): Playwright device emulation in desktop browser
   * - 'simulator': Local iOS Simulator or Android Emulator via Appium
   * - 'device': Real physical device connected via USB + Appium
   * - 'cloud': Cloud device farm (BrowserStack, LambdaTest, Sauce Labs)
   */
  executionMode: 'emulation' | 'simulator' | 'device' | 'cloud';
  /**
   * Cloud provider — only used when executionMode='cloud'
   * - 'browserstack' | 'lambdatest' | 'saucelabs'
   */
  cloudProvider: 'browserstack' | 'lambdatest' | 'saucelabs' | '';
}

/**
 * Accessibility audit configuration.
 * Parsed from `accessibility.*` properties in framework.properties.
 */
export interface AccessibilityConfig {
  /** Whether automatic accessibility audits are enabled */
  enabled: boolean;
  /** Whether to fail scenarios on critical WCAG violations */
  failOnCritical: boolean;
  /** WCAG conformance level to audit against */
  wcagLevel: 'A' | 'AA' | 'AAA';
  /** Maximum allowed violations before failing (0 = fail on any) */
  maxViolations: number;
}

/**
 * Real device testing configuration.
 * Parsed from `realDevice.*` properties in framework.properties.
 */
export interface RealDeviceConfig {
  /** Whether real device testing is enabled (overrides emulation when true) */
  enabled: boolean;
  /** Provider: local (Appium), browserstack, lambdatest, or saucelabs */
  provider: 'local' | 'browserstack' | 'lambdatest' | 'saucelabs' | '';
  /** Target platform: ios or android */
  platform: 'ios' | 'android' | '';
  /** Device name (e.g., "iPhone 15", "Samsung Galaxy S24") */
  deviceName: string;
  /** OS version (e.g., "17", "14") */
  osVersion: string;
  /** Browser: safari (iOS) or chrome (Android) */
  browser: string;
  /** Appium server URL (local mode only) */
  appiumServer: string;
}

/**
 * Native app testing configuration.
 * Parsed from `nativeApp.*` properties in framework.properties.
 */
export interface NativeAppConfig {
  /** Whether native app testing is enabled */
  enabled: boolean;
  /** Appium server URL */
  appiumServer: string;
  /** Target platform: android or ios */
  platform: 'android' | 'ios' | '';
  /** Path to the app binary (.apk for Android, .ipa/.app for iOS) */
  appPath: string;
  /** Android app package name */
  appPackage: string;
  /** Android main activity */
  appActivity: string;
  /** iOS bundle identifier */
  bundleId: string;
  /** Auto-grant permissions on Android */
  autoGrantPermissions: boolean;
  /** Full reset between scenarios (reinstall app) */
  fullReset: boolean;
  /** No reset between scenarios (keep app state) */
  noReset: boolean;
}

/**
 * Cross-browser execution configuration.
 * Parsed from `browsers`, `crossBrowser.*`, and `browser.*` properties.
 */
export interface CrossBrowserConfig {
  /** List of browser engines to execute tests against */
  browsers: Array<'chromium' | 'firefox' | 'webkit'>;
  /** Whether to run browsers in parallel */
  parallel: boolean;
  /** Maximum concurrent browser instances (clamped to [1, 10]) */
  maxParallel: number;
  /** Per-browser launch arguments (e.g., { chromium: ['--no-sandbox'] }) */
  browserArgs: Record<string, string[]>;
  /** Per-browser viewport overrides */
  browserViewports: Record<string, { width: number; height: number }>;
  /** Per-browser headless overrides */
  browserHeadless: Record<string, boolean>;
  /** Per-browser retry counts (clamped to [0, 5], falls back to global retryCount) */
  retryCounts: Record<string, number>;
  /** Per-browser execution timeouts in ms (clamped to [30000, 1800000], default 300000) */
  executionTimeouts: Record<string, number>;
  /** Visual comparison pixel-difference threshold (percentage, default 5) */
  visualThreshold: number;
}

/** Valid browser engine names */
const VALID_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
type ValidBrowser = typeof VALID_BROWSERS[number];

// Loads framework configuration from src/config/framework.properties.
export class FrameworkConfig {
  private static instance: FrameworkConfig;
  private properties: Record<string, string> = {};

  public readonly env: string;
  public readonly browser: 'chromium' | 'firefox' | 'webkit';
  public readonly headless: boolean;
  public readonly defaultTimeout: number;
  public readonly navigationTimeout: number;
  public readonly apiTimeout: number;
  public readonly retryCount: number;
  public readonly screenshotOnFail: boolean;
  public readonly video: 'on' | 'off' | 'retain-on-failure';

  public readonly selfHealing: {
    enabled: boolean;
    locatorTimeout: number;
    maxCandidates: number;
    useOpenAI: boolean;
    attachReport: boolean;
  };

  public readonly testUser: {
    password: string;
    name: string;
    emailDomain: string;
  };

  public readonly mobile: MobileConfig;
  public readonly accessibility: AccessibilityConfig;
  public readonly crossBrowser: CrossBrowserConfig;
  public readonly realDevice: RealDeviceConfig;
  public readonly nativeApp: NativeAppConfig;

  private constructor() {
    this.loadProperties();

    this.env = this.get('env', 'qa');
    this.crossBrowser = this.parseCrossBrowserConfig();
    // Derive single browser from the first entry in browsers list (single source of truth)
    this.browser = this.crossBrowser.browsers[0] || 'chromium';
    this.headless = this.getBool('headless', false);
    this.defaultTimeout = this.getNumber('defaultTimeout', 30000);
    this.navigationTimeout = this.getNumber('navigationTimeout', 60000);
    this.apiTimeout = this.getNumber('apiTimeout', 15000);
    this.retryCount = this.getNumber('retryCount', 2);
    this.screenshotOnFail = this.getBool('screenshotOnFail', true);
    this.video = this.get('video', 'retain-on-failure') as any;

    this.selfHealing = {
      enabled: this.getBool('selfHealing.enabled', true),
      locatorTimeout: this.getNumber('selfHealing.locatorTimeout', 5000),
      maxCandidates: this.getNumber('selfHealing.maxCandidates', 10),
      useOpenAI: this.getBool('selfHealing.useOpenAI', true),
      attachReport: this.getBool('selfHealing.attachReport', true),
    };

    this.testUser = {
      password: this.get('test.user.password', 'TestUser@123'),
      name: this.get('test.user.name', 'Test User'),
      emailDomain: this.get('test.user.emailDomain', 'teleconnect.local'),
    };

    this.mobile = this.parseMobileConfig();
    this.accessibility = this.parseAccessibilityConfig();
    this.realDevice = this.parseRealDeviceConfig();
    this.nativeApp = this.parseNativeAppConfig();
  }

  public static getInstance(): FrameworkConfig {
    if (!this.instance) {
      this.instance = new FrameworkConfig();
    }
    return this.instance;
  }

  public static reload(): FrameworkConfig {
    this.instance = new FrameworkConfig();
    return this.instance;
  }

  private loadProperties(): void {
    const filePath = path.resolve(__dirname, 'framework.properties');
    if (!fs.existsSync(filePath)) {
      console.warn(`[FrameworkConfig] Properties file not found: ${filePath}. Using defaults.`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;

      const key = line.substring(0, eqIndex).trim();
      const value = line.substring(eqIndex + 1).trim();
      if (key) {
        this.properties[key] = value;
      }
    }
  }

  public get(key: string, defaultValue: string): string {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    return process.env[envKey] || this.properties[key] || defaultValue;
  }

  private getBool(key: string, defaultValue: boolean): boolean {
    const value = this.get(key, String(defaultValue));
    return value === 'true' || value === '1' || value === 'yes';
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = this.get(key, String(defaultValue));
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // ─── Mobile Configuration Parsing ─────────────────────────────────────────

  private parseMobileConfig(): MobileConfig {
    const defaultDevice = this.get('mobile.defaultDevice', 'iPhone 14');

    const orientationRaw = this.get('mobile.defaultOrientation', 'portrait');
    const defaultOrientation: 'portrait' | 'landscape' =
      orientationRaw === 'landscape' ? 'landscape' : 'portrait';

    const networkRaw = this.get('mobile.networkCondition', '');
    const validNetworkConditions = ['2G', '3G', '4G', 'fast', ''];
    const networkCondition: MobileConfig['networkCondition'] =
      validNetworkConditions.includes(networkRaw)
        ? (networkRaw as MobileConfig['networkCondition'])
        : '';

    // Parse execution mode: emulation (default), simulator, device, cloud
    const executionModeRaw = this.get('mobile.executionMode', 'emulation');
    const validModes = ['emulation', 'simulator', 'device', 'cloud'];
    const executionMode: MobileConfig['executionMode'] =
      validModes.includes(executionModeRaw)
        ? (executionModeRaw as MobileConfig['executionMode'])
        : 'emulation';

    // Parse cloud provider: browserstack, lambdatest, saucelabs (only when mode=cloud)
    const cloudProviderRaw = this.get('mobile.cloudProvider', '');
    const validCloudProviders = ['browserstack', 'lambdatest', 'saucelabs', ''];
    const cloudProvider: MobileConfig['cloudProvider'] =
      validCloudProviders.includes(cloudProviderRaw)
        ? (cloudProviderRaw as MobileConfig['cloudProvider'])
        : '';

    return { defaultDevice, defaultOrientation, networkCondition, executionMode, cloudProvider };
  }

  // ─── Accessibility Configuration Parsing ───────────────────────────────────

  private parseAccessibilityConfig(): AccessibilityConfig {
    const enabled = this.getBool('accessibility.enabled', true);
    const failOnCritical = this.getBool('accessibility.failOnCritical', true);

    const wcagRaw = this.get('accessibility.wcagLevel', 'AA');
    const validWcagLevels = ['A', 'AA', 'AAA'];
    const wcagLevel: AccessibilityConfig['wcagLevel'] =
      validWcagLevels.includes(wcagRaw)
        ? (wcagRaw as AccessibilityConfig['wcagLevel'])
        : 'AA';

    const maxViolationsRaw = this.get('accessibility.maxViolations', '0');
    const maxViolationsParsed = parseInt(maxViolationsRaw, 10);
    const maxViolations = isNaN(maxViolationsParsed) ? 0 : maxViolationsParsed;

    return { enabled, failOnCritical, wcagLevel, maxViolations };
  }

  // ─── Cross-Browser Configuration Parsing ───────────────────────────────────

  private parseCrossBrowserConfig(): CrossBrowserConfig {
    const browsers = this.parseBrowserList();
    const parallel = this.getBool('crossBrowser.parallel', false);
    const maxParallel = this.clampMaxParallel(
      this.getNumber('crossBrowser.maxParallel', 3)
    );
    const browserArgs = this.parseBrowserArgs();
    const browserViewports = this.parseBrowserViewports();
    const browserHeadless = this.parseBrowserHeadless();
    const retryCounts = this.parseBrowserRetryCounts();
    const executionTimeouts = this.parseBrowserExecutionTimeouts();
    const visualThreshold = this.parseVisualThreshold();

    const config: CrossBrowserConfig = {
      browsers, parallel, maxParallel, browserArgs, browserViewports,
      browserHeadless, retryCounts, executionTimeouts, visualThreshold,
    };

    this.validateCrossBrowserConfig(config);

    return config;
  }

  /**
   * Parse `crossBrowser.visualThreshold` property.
   * Represents the pixel-difference percentage threshold for visual comparison.
   * Defaults to 5 (5%).
   */
  private parseVisualThreshold(): number {
    const rawValue = this.get('crossBrowser.visualThreshold', '5');
    const parsed = parseFloat(rawValue);
    if (isNaN(parsed) || parsed < 0) {
      return 5;
    }
    return parsed;
  }

  /**
   * Validate cross-browser configuration at startup.
   * - Throws if browsers list is empty (only invalid names configured)
   * - Clamps maxParallel to browser count when parallel=true
   * - Validates viewport values (falls back to 1280x720 on invalid format)
   * - Ensures unique report paths when parallel=true
   */
  private validateCrossBrowserConfig(config: CrossBrowserConfig): void {
    // 1. Validate at least one valid browser engine is configured
    if (config.browsers.length === 0) {
      throw new Error(
        `[FrameworkConfig] No valid browser engines configured. ` +
        `The "browsers" property must contain at least one of: ${VALID_BROWSERS.join(', ')}. ` +
        `Current value only contains invalid entries.`
      );
    }

    // 2. When parallel=true and maxParallel exceeds browser count, clamp and log info
    if (config.parallel && config.maxParallel > config.browsers.length) {
      console.info(
        `[FrameworkConfig] crossBrowser.maxParallel (${config.maxParallel}) exceeds configured browser count (${config.browsers.length}). ` +
        `Clamping maxParallel to ${config.browsers.length}.`
      );
      (config as any).maxParallel = config.browsers.length;
    }

    // 3. Validate browser viewport values — log warning and fall back to 1280x720 on invalid format
    const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
    for (const browser of config.browsers) {
      const key = `browser.${browser}.viewport`;
      const rawValue = this.properties[key];
      if (rawValue !== undefined && rawValue !== '') {
        const parsed = FrameworkConfig.parseViewportString(rawValue);
        if (!parsed) {
          console.warn(
            `[FrameworkConfig] Invalid viewport format for ${browser}: "${rawValue}". ` +
            `Expected format "WIDTHxHEIGHT" with integers in [320, 3840]. ` +
            `Falling back to default viewport (1280x720).`
          );
          config.browserViewports[browser] = DEFAULT_VIEWPORT;
        }
      }
    }

    // 4. When parallel=true, verify no two browsers share the same output report path
    if (config.parallel) {
      const reportPaths: Record<string, string> = {};
      for (const browser of config.browsers) {
        const reportPath = this.get(`browser.${browser}.reportPath`, `reports/cucumber-json/${browser}-cucumber-report.json`);
        const existingBrowser = Object.entries(reportPaths).find(([, p]) => p === reportPath);
        if (existingBrowser) {
          console.warn(
            `[FrameworkConfig] Browsers "${existingBrowser[0]}" and "${browser}" share the same output report path: "${reportPath}". ` +
            `This may cause file corruption during parallel execution. ` +
            `Consider configuring unique browser.${browser}.reportPath values.`
          );
        }
        reportPaths[browser] = reportPath;
      }
    }
  }

  /**
   * Parse the `browsers` property into a validated list of browser engine names.
   * Falls back to the single `browser` property if `browsers` is not defined.
   * Filters out invalid browser names and limits to 3 entries.
   * Returns empty array if `browsers` is explicitly set with only invalid names
   * (validation will throw a descriptive error).
   */
  private parseBrowserList(): Array<ValidBrowser> {
    const browsersRaw = this.properties['browsers'];

    if (!browsersRaw) {
      // No browsers property defined — default to chromium
      return ['chromium'];
    }

    const entries = browsersRaw.split(',').map((b) => b.trim());
    const validEntries: ValidBrowser[] = [];

    for (const entry of entries) {
      if (VALID_BROWSERS.includes(entry as ValidBrowser)) {
        validEntries.push(entry as ValidBrowser);
      }
      // Invalid entries are silently filtered (validation logs the error)
    }

    // If all entries were invalid, return empty array so validation can throw
    if (validEntries.length === 0) {
      return [];
    }

    // Limit to 3 entries maximum
    return validEntries.slice(0, 3);
  }

  /**
   * Clamp maxParallel to the range [1, 10].
   */
  private clampMaxParallel(value: number): number {
    return Math.max(1, Math.min(10, value));
  }

  /**
   * Parse browser-specific launch arguments from dot notation properties.
   * Format: `browser.chromium.args=--no-sandbox,--disable-setuid-sandbox`
   */
  private parseBrowserArgs(): Record<string, string[]> {
    const args: Record<string, string[]> = {};

    for (const browser of VALID_BROWSERS) {
      const key = `browser.${browser}.args`;
      const value = this.properties[key];
      if (value && value.trim()) {
        args[browser] = value
          .split(',')
          .map((arg) => arg.trim())
          .filter((arg) => arg.length > 0)
          .slice(0, 20); // Limit to 20 args per browser
      } else {
        args[browser] = [];
      }
    }

    return args;
  }

  /**
   * Parse browser-specific viewport configurations.
   * Format: `browser.chromium.viewport=1280x720`
   * Validates WIDTHxHEIGHT format with values in [320, 3840].
   * Returns null for invalid entries (falls back to global default).
   */
  private parseBrowserViewports(): Record<string, { width: number; height: number }> {
    const viewports: Record<string, { width: number; height: number }> = {};

    for (const browser of VALID_BROWSERS) {
      const key = `browser.${browser}.viewport`;
      const value = this.properties[key];
      if (value) {
        const parsed = FrameworkConfig.parseViewportString(value);
        if (parsed) {
          viewports[browser] = parsed;
        }
        // Invalid viewport format: skip (log warning at runtime)
      }
    }

    return viewports;
  }

  /**
   * Parse a viewport string in `WIDTHxHEIGHT` format.
   * Returns `{ width, height }` if valid, or `null` if format is invalid
   * or values are out of the [320, 3840] range.
   */
  public static parseViewportString(
    value: string
  ): { width: number; height: number } | null {
    if (!value || typeof value !== 'string') return null;

    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return null;

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (isNaN(width) || isNaN(height)) return null;
    if (width < 320 || width > 3840) return null;
    if (height < 320 || height > 3840) return null;

    return { width, height };
  }

  /**
   * Parse browser-specific headless configuration.
   * Format: `browser.chromium.headless=true`
   */
  private parseBrowserHeadless(): Record<string, boolean> {
    const headless: Record<string, boolean> = {};

    for (const browser of VALID_BROWSERS) {
      const key = `browser.${browser}.headless`;
      const value = this.properties[key];
      if (value !== undefined && value !== '') {
        headless[browser] = value === 'true' || value === '1' || value === 'yes';
      }
    }

    return headless;
  }

  /**
   * Parse per-browser retry counts from `browser.<engine>.retryCount` properties.
   * Falls back to the global `retryCount` when a per-browser value is not defined.
   * Validates values are integers in range [0, 5]; clamps to nearest boundary
   * and logs a warning if the value is outside the valid range.
   */
  private parseBrowserRetryCounts(): Record<string, number> {
    const retryCounts: Record<string, number> = {};

    for (const browser of VALID_BROWSERS) {
      const key = `browser.${browser}.retryCount`;
      const rawValue = this.properties[key];

      if (rawValue === undefined || rawValue === '') {
        // Fall back to global retryCount
        retryCounts[browser] = this.retryCount;
      } else {
        const parsed = parseInt(rawValue, 10);

        if (isNaN(parsed)) {
          // Non-integer value: fall back to global retryCount
          console.warn(
            `[FrameworkConfig] Invalid browser.${browser}.retryCount value "${rawValue}" (not an integer). Falling back to global retryCount (${this.retryCount}).`
          );
          retryCounts[browser] = this.retryCount;
        } else if (parsed < 0) {
          console.warn(
            `[FrameworkConfig] browser.${browser}.retryCount value ${parsed} is below minimum (0). Clamping to 0.`
          );
          retryCounts[browser] = 0;
        } else if (parsed > 5) {
          console.warn(
            `[FrameworkConfig] browser.${browser}.retryCount value ${parsed} exceeds maximum (5). Clamping to 5.`
          );
          retryCounts[browser] = 5;
        } else {
          retryCounts[browser] = parsed;
        }
      }
    }

    return retryCounts;
  }

  /**
   * Parse per-browser execution timeouts from `browser.<engine>.executionTimeout` properties.
   * Falls back to the default 300000ms (5 minutes) when a per-browser value is not defined.
   * Validates values are integers in range [30000, 1800000]; clamps to nearest boundary
   * and logs a warning if the value is outside the valid range.
   */
  private parseBrowserExecutionTimeouts(): Record<string, number> {
    const DEFAULT_EXECUTION_TIMEOUT = 300000;
    const MIN_EXECUTION_TIMEOUT = 30000;
    const MAX_EXECUTION_TIMEOUT = 1800000;
    const executionTimeouts: Record<string, number> = {};

    for (const browser of VALID_BROWSERS) {
      const key = `browser.${browser}.executionTimeout`;
      const rawValue = this.properties[key];

      if (rawValue === undefined || rawValue === '') {
        // Fall back to default timeout
        executionTimeouts[browser] = DEFAULT_EXECUTION_TIMEOUT;
      } else {
        const parsed = parseInt(rawValue, 10);

        if (isNaN(parsed)) {
          // Non-integer value: fall back to default
          console.warn(
            `[FrameworkConfig] Invalid browser.${browser}.executionTimeout value "${rawValue}" (not an integer). Falling back to default (${DEFAULT_EXECUTION_TIMEOUT}ms).`
          );
          executionTimeouts[browser] = DEFAULT_EXECUTION_TIMEOUT;
        } else if (parsed < MIN_EXECUTION_TIMEOUT) {
          console.warn(
            `[FrameworkConfig] browser.${browser}.executionTimeout value ${parsed} is below minimum (${MIN_EXECUTION_TIMEOUT}ms). Clamping to ${MIN_EXECUTION_TIMEOUT}ms.`
          );
          executionTimeouts[browser] = MIN_EXECUTION_TIMEOUT;
        } else if (parsed > MAX_EXECUTION_TIMEOUT) {
          console.warn(
            `[FrameworkConfig] browser.${browser}.executionTimeout value ${parsed} exceeds maximum (${MAX_EXECUTION_TIMEOUT}ms). Clamping to ${MAX_EXECUTION_TIMEOUT}ms.`
          );
          executionTimeouts[browser] = MAX_EXECUTION_TIMEOUT;
        } else {
          executionTimeouts[browser] = parsed;
        }
      }
    }

    return executionTimeouts;
  }

  // ─── Real Device Configuration Parsing ─────────────────────────────────────

  private parseRealDeviceConfig(): RealDeviceConfig {
    const enabled = this.getBool('realDevice.enabled', false);

    const providerRaw = this.get('realDevice.provider', '');
    const validProviders = ['local', 'browserstack', 'lambdatest', 'saucelabs', ''];
    const provider: RealDeviceConfig['provider'] =
      validProviders.includes(providerRaw)
        ? (providerRaw as RealDeviceConfig['provider'])
        : '';

    const platformRaw = this.get('realDevice.platform', '');
    const validPlatforms = ['ios', 'android', ''];
    const platform: RealDeviceConfig['platform'] =
      validPlatforms.includes(platformRaw)
        ? (platformRaw as RealDeviceConfig['platform'])
        : '';

    const deviceName = this.get('realDevice.deviceName', '');
    const osVersion = this.get('realDevice.osVersion', '');
    const browser = this.get('realDevice.browser', '');
    const appiumServer = this.get('realDevice.appiumServer', 'http://localhost:4723');

    return { enabled, provider, platform, deviceName, osVersion, browser, appiumServer };
  }

  // ─── Native App Configuration Parsing ──────────────────────────────────────

  private parseNativeAppConfig(): NativeAppConfig {
    const enabled = this.getBool('nativeApp.enabled', false);
    const appiumServer = this.get('nativeApp.appiumServer', 'http://localhost:4723');

    const platformRaw = this.get('nativeApp.platform', '');
    const validPlatforms = ['android', 'ios', ''];
    const platform: NativeAppConfig['platform'] =
      validPlatforms.includes(platformRaw)
        ? (platformRaw as NativeAppConfig['platform'])
        : '';

    const appPath = this.get('nativeApp.appPath', '');
    const appPackage = this.get('nativeApp.appPackage', '');
    const appActivity = this.get('nativeApp.appActivity', '');
    const bundleId = this.get('nativeApp.bundleId', '');
    const autoGrantPermissions = this.getBool('nativeApp.autoGrantPermissions', true);
    const fullReset = this.getBool('nativeApp.fullReset', false);
    const noReset = this.getBool('nativeApp.noReset', true);

    return {
      enabled, appiumServer, platform, appPath, appPackage,
      appActivity, bundleId, autoGrantPermissions, fullReset, noReset,
    };
  }
}
