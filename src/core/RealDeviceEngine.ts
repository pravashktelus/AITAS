import { Logger } from '../utils/Logger';
import { RealDeviceConfig, CloudDeviceConnector } from './CloudDeviceConnector';
import { AppiumConnector } from './AppiumConnector';

/**
 * RealDeviceEngine — Main engine for real device testing.
 * Supports local Appium devices (iOS + Android) and cloud device farms
 * (BrowserStack + LambdaTest).
 *
 * This engine connects to real devices and returns a WebSocket endpoint
 * that Playwright can use via `browser.connect()` or `browser.connectOverCDP()`.
 *
 * Usage:
 * ```typescript
 * const engine = new RealDeviceEngine(config);
 * const wsEndpoint = await engine.connect();
 * const browser = await chromium.connectOverCDP(wsEndpoint);
 * ```
 */
export class RealDeviceEngine {
  private config: RealDeviceConfig;
  private appiumConnector: AppiumConnector | null = null;
  private wsEndpoint: string | null = null;
  private connected: boolean = false;

  constructor(config: RealDeviceConfig) {
    this.config = config;
  }

  /**
   * Connect to a real device and return the WebSocket endpoint for Playwright.
   * Routes to the appropriate connector based on the provider configuration.
   *
   * @returns WebSocket endpoint URL for Playwright to connect to
   */
  public async connect(): Promise<string> {
    Logger.info(`Connecting to real device: ${this.config.deviceName} via ${this.config.provider}`);

    let wsEndpoint: string;

    switch (this.config.provider) {
      case 'local':
        wsEndpoint = await this.connectLocal();
        break;
      case 'browserstack':
        wsEndpoint = await this.connectBrowserStack();
        break;
      case 'lambdatest':
        wsEndpoint = await this.connectLambdaTest();
        break;
      case 'saucelabs':
        wsEndpoint = await this.connectSauceLabs();
        break;
      default:
        throw new Error(
          `Unknown real device provider: "${this.config.provider}". ` +
          `Valid providers: local, browserstack, lambdatest, saucelabs`
        );
    }

    this.wsEndpoint = wsEndpoint;
    this.connected = true;
    Logger.info(`Real device connected successfully. Endpoint available.`);
    return wsEndpoint;
  }

  /**
   * Get the WebDriver/Appium capabilities for the current configuration.
   *
   * @returns Capabilities object appropriate for the configured provider
   */
  public getCapabilities(): Record<string, any> {
    switch (this.config.provider) {
      case 'local':
        return this.config.platform === 'ios'
          ? AppiumConnector.buildIOSCapabilities(this.config.deviceName, this.config.osVersion)
          : AppiumConnector.buildAndroidCapabilities(this.config.deviceName, this.config.osVersion);
      case 'browserstack':
        return CloudDeviceConnector.getBrowserStackCapabilities(this.config);
      case 'lambdatest':
        return CloudDeviceConnector.getLambdaTestCapabilities(this.config);
      case 'saucelabs':
        return CloudDeviceConnector.getSauceLabsCapabilities(this.config);
      default:
        return {};
    }
  }

  /**
   * Check if the target device is available for testing.
   * - Local: checks if Appium server is running
   * - Cloud: checks if credentials are configured
   *
   * @returns true if the device can be connected to
   */
  public async isDeviceAvailable(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'local':
          const appium = new AppiumConnector(this.config.appiumServer);
          const running = await appium.isServerRunning();
          if (!running) {
            Logger.warn(
              `Appium server not running at ${this.config.appiumServer}. ` +
              `Start it with: appium`
            );
          }
          return running;

        case 'browserstack':
          return CloudDeviceConnector.hasCredentials('browserstack');

        case 'lambdatest':
          return CloudDeviceConnector.hasCredentials('lambdatest');

        case 'saucelabs':
          return CloudDeviceConnector.hasCredentials('saucelabs');

        default:
          Logger.warn(`Unknown provider: ${this.config.provider}`);
          return false;
      }
    } catch (error: any) {
      Logger.error(`Device availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Disconnect and clean up the real device session.
   * For local Appium, this deletes the WebDriver session.
   * For cloud providers, the session is terminated server-side.
   */
  public async disconnect(): Promise<void> {
    Logger.info('Disconnecting real device session...');

    try {
      if (this.config.provider === 'local' && this.appiumConnector) {
        await this.appiumConnector.deleteSession();
        this.appiumConnector = null;
      }

      // Cloud sessions are managed by the provider — closing the browser
      // connection from Playwright's side terminates the session.
      this.wsEndpoint = null;
      this.connected = false;
      Logger.info('Real device session disconnected.');
    } catch (error: any) {
      Logger.warn(`Error during disconnect: ${error.message}`);
      this.connected = false;
    }
  }

  /**
   * Get device information for reporting purposes.
   *
   * @returns Object with platform, device name, OS version, browser, and provider
   */
  public getDeviceInfo(): {
    platform: string;
    deviceName: string;
    osVersion: string;
    browser: string;
    provider: string;
  } {
    return {
      platform: this.config.platform,
      deviceName: this.config.deviceName,
      osVersion: this.config.osVersion,
      browser: this.config.browser,
      provider: this.config.provider,
    };
  }

  /**
   * Check if the engine is currently connected to a device.
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the current WebSocket endpoint (or null if not connected).
   */
  public getWsEndpoint(): string | null {
    return this.wsEndpoint;
  }

  // ─── Private Methods ─────────────────────────────────────────────────────────

  /**
   * Connect to a local Appium server and get the CDP endpoint.
   */
  private async connectLocal(): Promise<string> {
    const appiumUrl = this.config.appiumServer || 'http://localhost:4723';
    this.appiumConnector = new AppiumConnector(appiumUrl);

    // Build platform-specific capabilities
    const capabilities = this.config.platform === 'ios'
      ? AppiumConnector.buildIOSCapabilities(this.config.deviceName, this.config.osVersion)
      : AppiumConnector.buildAndroidCapabilities(this.config.deviceName, this.config.osVersion);

    // Create the Appium session
    await this.appiumConnector.createSession(capabilities);

    // Get the CDP endpoint for Playwright connection
    const cdpEndpoint = await this.appiumConnector.getCdpEndpoint();
    Logger.info(`Local Appium CDP endpoint: ${cdpEndpoint}`);
    return cdpEndpoint;
  }

  /**
   * Connect to BrowserStack cloud device farm.
   */
  private async connectBrowserStack(): Promise<string> {
    const { wsEndpoint, capabilities } = await CloudDeviceConnector.connectBrowserStack(this.config);
    Logger.info(`BrowserStack capabilities: ${JSON.stringify(capabilities, null, 2)}`);
    return wsEndpoint;
  }

  /**
   * Connect to LambdaTest cloud device farm.
   */
  private async connectLambdaTest(): Promise<string> {
    const { wsEndpoint, capabilities } = await CloudDeviceConnector.connectLambdaTest(this.config);
    Logger.info(`LambdaTest capabilities: ${JSON.stringify(capabilities, null, 2)}`);
    return wsEndpoint;
  }

  /**
   * Connect to Sauce Labs cloud device farm.
   */
  private async connectSauceLabs(): Promise<string> {
    const { wsEndpoint, capabilities } = await CloudDeviceConnector.connectSauceLabs(this.config);
    Logger.info(`Sauce Labs capabilities: ${JSON.stringify(capabilities, null, 2)}`);
    return wsEndpoint;
  }
}
