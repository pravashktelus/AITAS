import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { FrameworkConfig } from '../config/FrameworkConfig';
import { TagParser } from './TagParser';
import { MOBILE_DEVICES, DEVICE_NAME_LOOKUP, MobileDeviceConfig } from './MobileEngine';

const frameworkConfig = FrameworkConfig.getInstance();

const config = {
  env: frameworkConfig.env,
  browser: frameworkConfig.browser,
  headless: frameworkConfig.headless,
  screenshotOnFail: frameworkConfig.screenshotOnFail,
  video: frameworkConfig.video,
  baseUrl: frameworkConfig.get('app.url', 'https://telecom-app-171032253690.northamerica-northeast1.run.app/login'),
  timeout: frameworkConfig.defaultTimeout,
  navigationTimeout: frameworkConfig.navigationTimeout,
};

/**
 * Manages Playwright Browser, BrowserContext, and Page lifecycle.
 */
export class ContextManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private activeBrowserName: 'chromium' | 'firefox' | 'webkit' = 'chromium';

  public async launch(): Promise<void> {
    Logger.info(`Launching ${config.browser} browser (headless: ${config.headless})`);

    const browserMap = { chromium, firefox, webkit };
    const browserEngine = browserMap[config.browser as keyof typeof browserMap];
    if (!browserEngine) {
      throw new Error(`Unsupported browser: "${config.browser}". Use chromium, firefox, or webkit.`);
    }

    // Build launch args — include remote debugging port for Lighthouse (Chromium only)
    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    const lighthouseEnabled = frameworkConfig.get('lighthouse.enabled', 'false') === 'true';
    const lighthousePort = parseInt(frameworkConfig.get('lighthouse.port', '9222'), 10);

    if (lighthouseEnabled && config.browser === 'chromium') {
      launchArgs.push(`--remote-debugging-port=${lighthousePort}`);
      Logger.info(`Lighthouse mode: CDP port ${lighthousePort} enabled`);
    }

    this.browser = await browserEngine.launch({
      headless: config.headless,
      slowMo: parseInt(frameworkConfig.get('slowMo', '0'), 10),
      args: launchArgs,
    });

    if (!this.browser) {
      throw new Error('Failed to launch browser');
    }

    this.activeBrowserName = config.browser as 'chromium' | 'firefox' | 'webkit';

    this.context = await this.browser.newContext({
      baseURL: config.baseUrl,
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      recordVideo:
        config.video !== 'off'
          ? {
              dir: 'reports/videos',
              size: { width: 1280, height: 720 },
            }
          : undefined,
    });

    this.context.setDefaultTimeout(config.timeout);
    this.context.setDefaultNavigationTimeout(config.navigationTimeout);

    this.page = await this.context.newPage();
    Logger.info('Browser context and page created successfully');
  }

  /**
   * Launch browser with device emulation based on scenario tags.
   * Parses @device:* or @mobile tags, resolves device profile, and applies emulation
   * at context creation time before any page navigation occurs.
   *
   * @param tags - Array of scenario tags
   * @param fwConfig - FrameworkConfig instance
   *
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.6
   */
  public async launchWithDeviceEmulation(tags: string[], fwConfig: FrameworkConfig): Promise<void> {
    const device = this.resolveDeviceFromTags(tags, fwConfig);

    // Determine orientation from config
    const orientation = fwConfig.mobile.defaultOrientation;

    // Compute viewport with orientation swap if landscape
    let viewport = { ...device.viewport };
    if (orientation === 'landscape') {
      viewport = { width: device.viewport.height, height: device.viewport.width };
    }

    Logger.info(
      `Launching browser with device emulation: ${device.name} (${viewport.width}x${viewport.height}, ${orientation})`
    );

    const browserMap = { chromium, firefox, webkit };
    const browserName = fwConfig.browser as keyof typeof browserMap;
    const browserEngine = browserMap[browserName];
    if (!browserEngine) {
      throw new Error(`Unsupported browser: "${fwConfig.browser}". Use chromium, firefox, or webkit.`);
    }

    this.browser = await browserEngine.launch({
      headless: fwConfig.headless,
      slowMo: parseInt(fwConfig.get('slowMo', '0'), 10),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    if (!this.browser) {
      throw new Error('Failed to launch browser');
    }

    this.activeBrowserName = browserName;

    this.context = await this.browser.newContext({
      viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      ignoreHTTPSErrors: true,
      recordVideo:
        config.video !== 'off'
          ? {
              dir: 'reports/videos',
              size: viewport,
            }
          : undefined,
    });

    this.context.setDefaultTimeout(fwConfig.defaultTimeout);
    this.context.setDefaultNavigationTimeout(fwConfig.navigationTimeout);

    this.page = await this.context.newPage();
    Logger.info(`Device emulation context created: ${device.name} (${orientation})`);
  }

  /**
   * Resolve device profile from scenario tags.
   * Uses TagParser to extract device name from @device:* tag, or falls back to
   * mobile.defaultDevice config for @mobile tag.
   *
   * @param tags - Array of scenario tags
   * @param fwConfig - FrameworkConfig instance
   * @returns The resolved MobileDeviceConfig
   * @throws Error if device is unknown, not configured, or multiple device tags present
   *
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.6
   */
  private resolveDeviceFromTags(tags: string[], fwConfig: FrameworkConfig): MobileDeviceConfig {
    // parseDeviceTag throws if multiple @device:* tags (Requirement 1.5)
    const deviceTagValue = TagParser.parseDeviceTag(tags);

    let deviceName: string;

    if (deviceTagValue) {
      // @device:DeviceName tag found — use it directly
      deviceName = deviceTagValue;
    } else if (TagParser.hasMobileTag(tags)) {
      // @mobile tag without @device:* — use config default
      const defaultDevice = fwConfig.mobile.defaultDevice;
      if (!defaultDevice) {
        throw new Error(
          'mobile.defaultDevice property is required for @mobile-tagged scenarios. ' +
          'Please configure it in framework.properties.'
        );
      }
      deviceName = defaultDevice;
    } else {
      // No mobile/device tags — this should not be called without them
      throw new Error(
        'No @device:* or @mobile tag found. launchWithDeviceEmulation requires mobile tags.'
      );
    }

    // Normalize the device name and look up in registry
    const normalizedName = TagParser.normalizeDeviceName(deviceName);
    const canonicalName = DEVICE_NAME_LOOKUP[normalizedName];

    if (!canonicalName) {
      const availableDevices = Object.keys(MOBILE_DEVICES).join(', ');
      throw new Error(
        `Unknown device: "${deviceName}". Available devices: ${availableDevices}`
      );
    }

    const deviceConfig = MOBILE_DEVICES[canonicalName];
    if (!deviceConfig) {
      const availableDevices = Object.keys(MOBILE_DEVICES).join(', ');
      throw new Error(
        `Unknown device: "${deviceName}". Available devices: ${availableDevices}`
      );
    }

    return deviceConfig;
  }

  /**
   * Launch a specific browser engine with browser-specific configuration overrides.
   * Uses per-browser viewport, headless, and args settings from CrossBrowserConfig.
   *
   * @param browserName - The browser engine to launch ('chromium' | 'firefox' | 'webkit')
   * @param fwConfig - FrameworkConfig instance
   *
   * Validates: Requirements 5.5, 5.6, 7.2, 7.4
   */
  public async launchForBrowser(
    browserName: 'chromium' | 'firefox' | 'webkit',
    fwConfig: FrameworkConfig
  ): Promise<void> {
    Logger.info(`Launching ${browserName} browser with browser-specific configuration`);

    const browserMap = { chromium, firefox, webkit };
    const browserEngine = browserMap[browserName];
    if (!browserEngine) {
      throw new Error(`Unsupported browser: "${browserName}". Use chromium, firefox, or webkit.`);
    }

    // Resolve browser-specific viewport, or fall back to global default (1280x720)
    const viewport = fwConfig.crossBrowser.browserViewports[browserName] ?? { width: 1280, height: 720 };

    // Resolve browser-specific headless setting, or fall back to global headless
    const headless = fwConfig.crossBrowser.browserHeadless[browserName] ?? fwConfig.headless;

    // Resolve browser-specific args, or fall back to default args
    const args = fwConfig.crossBrowser.browserArgs[browserName]?.length > 0
      ? fwConfig.crossBrowser.browserArgs[browserName]
      : ['--no-sandbox', '--disable-setuid-sandbox'];

    this.browser = await browserEngine.launch({
      headless,
      slowMo: parseInt(fwConfig.get('slowMo', '0'), 10),
      args,
    });

    if (!this.browser) {
      throw new Error(`Failed to launch ${browserName} browser`);
    }

    this.activeBrowserName = browserName;

    this.context = await this.browser.newContext({
      viewport,
      ignoreHTTPSErrors: true,
      recordVideo:
        config.video !== 'off'
          ? {
              dir: 'reports/videos',
              size: viewport,
            }
          : undefined,
    });

    this.context.setDefaultTimeout(fwConfig.defaultTimeout);
    this.context.setDefaultNavigationTimeout(fwConfig.navigationTimeout);

    this.page = await this.context.newPage();
    Logger.info(
      `${browserName} browser launched: viewport ${viewport.width}x${viewport.height}, headless=${headless}`
    );
  }

  /**
   * Get the active browser engine name.
   *
   * @returns The current browser engine name ('chromium' | 'firefox' | 'webkit')
   *
   * Validates: Requirements 5.5, 5.6
   */
  public getActiveBrowser(): 'chromium' | 'firefox' | 'webkit' {
    return this.activeBrowserName;
  }

  public async close(testFailed: boolean = false): Promise<void> {
    if (config.screenshotOnFail && testFailed && this.page) {
      try {
        const screenshotDir = 'reports/screenshots';
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const filename = `failure-${Date.now()}.png`;
        await this.page.screenshot({
          path: path.join(screenshotDir, filename),
          fullPage: true,
        });
        Logger.info(`Failure screenshot saved: ${filename}`);
      } catch (err) {
        Logger.warn(`Could not take failure screenshot: ${err}`);
      }
    }

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.context) {
      if (config.video === 'retain-on-failure' && !testFailed) {
        await this.context.close().catch(() => {});
      } else {
        await this.context.close().catch(() => {});
      }
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    Logger.info('Browser closed');
  }

  public getPage(): Page {
    if (!this.page) {
      throw new Error(
        'Page is not initialized. Ensure the browser was launched in the Before hook.'
      );
    }
    return this.page;
  }

  public getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('BrowserContext is not initialized.');
    }
    return this.context;
  }

  public getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser is not initialized.');
    }
    return this.browser;
  }

  /**
   * Set an externally-managed browser, context, and page.
   * Used by real device testing to inject a remote browser connection
   * without going through the normal launch flow.
   */
  public setExternalBrowser(browser: Browser, context: BrowserContext, page: Page): void {
    this.browser = browser;
    this.context = context;
    this.page = page;
    Logger.info('External browser/context/page injected into ContextManager');
  }

  public async clearCookies(): Promise<void> {
    await this.getContext().clearCookies();
    Logger.info('Cookies cleared');
  }

  public async clearStorage(): Promise<void> {
    await this.getPage().evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    Logger.info('Local & session storage cleared');
  }

  public async saveStorageState(filePath: string): Promise<void> {
    await this.getContext().storageState({ path: filePath });
    Logger.info(`Storage state saved to: ${filePath}`);
  }

  public async loadStorageState(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      Logger.warn(`Storage state file not found: ${filePath}`);
      return;
    }
    Logger.info(`Storage state will be loaded from: ${filePath}`);
  }
}
