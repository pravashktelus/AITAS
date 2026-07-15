import { Logger } from '../utils/Logger';

/**
 * Configuration interface for real device testing.
 * Shared between CloudDeviceConnector and RealDeviceEngine.
 */
export interface RealDeviceConfig {
  enabled: boolean;
  provider: 'local' | 'browserstack' | 'lambdatest' | 'saucelabs' | '';
  platform: 'ios' | 'android' | '';
  deviceName: string;
  osVersion: string;
  browser: string;
  appiumServer: string;
}

/**
 * Cloud credentials interface for remote device farms.
 */
export interface CloudCredentials {
  username: string;
  accessKey: string;
}

/**
 * CloudDeviceConnector — Handles connections to BrowserStack and LambdaTest
 * cloud device farms using Playwright's CDP WebSocket connections.
 *
 * No external dependencies — uses environment variables for credentials
 * and constructs WebSocket URLs that Playwright can connect to directly.
 */
export class CloudDeviceConnector {
  /**
   * Connect to BrowserStack using Playwright's CDP connection.
   * Constructs a WSS endpoint URL with capabilities encoded as query parameters.
   *
   * @param config - Real device configuration
   * @returns WebSocket endpoint URL and capabilities object
   */
  public static async connectBrowserStack(
    config: RealDeviceConfig
  ): Promise<{ wsEndpoint: string; capabilities: Record<string, any> }> {
    const credentials = CloudDeviceConnector.getBrowserStackCredentials();
    const capabilities = CloudDeviceConnector.getBrowserStackCapabilities(config);

    const capsJson = JSON.stringify(capabilities);
    const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(capsJson)}`;

    Logger.info(`BrowserStack connection configured for: ${config.deviceName} (${config.platform})`);
    Logger.info(`BrowserStack WebSocket endpoint constructed`);

    return { wsEndpoint, capabilities };
  }

  /**
   * Connect to LambdaTest using Playwright's CDP connection.
   * Constructs a WSS endpoint URL with capabilities encoded as query parameters.
   *
   * @param config - Real device configuration
   * @returns WebSocket endpoint URL and capabilities object
   */
  public static async connectLambdaTest(
    config: RealDeviceConfig
  ): Promise<{ wsEndpoint: string; capabilities: Record<string, any> }> {
    const credentials = CloudDeviceConnector.getLambdaTestCredentials();
    const capabilities = CloudDeviceConnector.getLambdaTestCapabilities(config);

    const capsJson = JSON.stringify(capabilities);
    const wsEndpoint = `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(capsJson)}`;

    Logger.info(`LambdaTest connection configured for: ${config.deviceName} (${config.platform})`);
    Logger.info(`LambdaTest WebSocket endpoint constructed`);

    return { wsEndpoint, capabilities };
  }

  /**
   * Get BrowserStack capabilities object in their expected format.
   * Uses the `bstack:options` namespace for BrowserStack-specific settings.
   *
   * @param config - Real device configuration
   * @returns BrowserStack-formatted capabilities
   */
  public static getBrowserStackCapabilities(
    config: RealDeviceConfig
  ): Record<string, any> {
    const credentials = CloudDeviceConnector.getBrowserStackCredentials();

    return {
      'bstack:options': {
        osVersion: config.osVersion,
        deviceName: config.deviceName,
        realMobile: 'true',
        userName: credentials.username,
        accessKey: credentials.accessKey,
        buildName: 'BDD Playwright - Real Device',
        sessionName: 'Mobile Test Session',
        local: 'false',
        debug: 'true',
        networkLogs: 'true',
      },
      browserName: config.platform === 'ios' ? 'safari' : 'chrome',
    };
  }

  /**
   * Get LambdaTest capabilities object in their expected format.
   * Uses the `LT:Options` namespace for LambdaTest-specific settings.
   *
   * @param config - Real device configuration
   * @returns LambdaTest-formatted capabilities
   */
  public static getLambdaTestCapabilities(
    config: RealDeviceConfig
  ): Record<string, any> {
    const credentials = CloudDeviceConnector.getLambdaTestCredentials();

    return {
      'LT:Options': {
        platformName: config.platform === 'ios' ? 'iOS' : 'Android',
        deviceName: config.deviceName,
        platformVersion: config.osVersion,
        isRealMobile: true,
        user: credentials.username,
        accessKey: credentials.accessKey,
        build: 'BDD Playwright - Real Device',
        name: 'Mobile Test Session',
        network: true,
        console: true,
        video: true,
      },
      browserName: config.platform === 'ios' ? 'Safari' : 'Chrome',
    };
  }

  /**
   * Retrieve BrowserStack credentials from environment variables.
   * Throws if credentials are not configured.
   */
  public static getBrowserStackCredentials(): CloudCredentials {
    const username = process.env.BROWSERSTACK_USERNAME;
    const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'BrowserStack credentials not found. ' +
        'Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in your .env file.'
      );
    }

    return { username, accessKey };
  }

  /**
   * Retrieve LambdaTest credentials from environment variables.
   * Throws if credentials are not configured.
   */
  public static getLambdaTestCredentials(): CloudCredentials {
    const username = process.env.LAMBDATEST_USERNAME;
    const accessKey = process.env.LAMBDATEST_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'LambdaTest credentials not found. ' +
        'Set LAMBDATEST_USERNAME and LAMBDATEST_ACCESS_KEY in your .env file.'
      );
    }

    return { username, accessKey };
  }

  /**
   * Validate that the required cloud credentials are available for the given provider.
   *
   * @param provider - The cloud provider to validate
   * @returns true if credentials are available
   */
  public static hasCredentials(provider: 'browserstack' | 'lambdatest' | 'saucelabs'): boolean {
    try {
      if (provider === 'browserstack') {
        CloudDeviceConnector.getBrowserStackCredentials();
      } else if (provider === 'saucelabs') {
        CloudDeviceConnector.getSauceLabsCredentials();
      } else {
        CloudDeviceConnector.getLambdaTestCredentials();
      }
      return true;
    } catch {
      return false;
    }
  }

  // ─── Sauce Labs Integration ──────────────────────────────────────────────────

  /**
   * Connect to Sauce Labs using their WebSocket CDP endpoint.
   * Constructs a WSS endpoint URL with capabilities encoded as query parameters.
   *
   * @param config - Real device configuration
   * @returns WebSocket endpoint URL and capabilities object
   */
  public static async connectSauceLabs(
    config: RealDeviceConfig
  ): Promise<{ wsEndpoint: string; capabilities: Record<string, any> }> {
    const credentials = CloudDeviceConnector.getSauceLabsCredentials();
    const capabilities = CloudDeviceConnector.getSauceLabsCapabilities(config);

    // Sauce Labs CDP endpoint format
    const region = process.env.SAUCE_REGION || 'us-west-1';
    const capsJson = JSON.stringify(capabilities);
    const wsEndpoint = `wss://cdp.${region}.saucelabs.com/playwright?capabilities=${encodeURIComponent(capsJson)}`;

    Logger.info(`Sauce Labs connection configured for: ${config.deviceName} (${config.platform})`);
    Logger.info(`Sauce Labs region: ${region}`);

    return { wsEndpoint, capabilities };
  }

  /**
   * Get Sauce Labs capabilities object in their expected format.
   * Uses the `sauce:options` namespace for Sauce Labs-specific settings.
   *
   * @param config - Real device configuration
   * @returns Sauce Labs-formatted capabilities
   */
  public static getSauceLabsCapabilities(
    config: RealDeviceConfig
  ): Record<string, any> {
    const credentials = CloudDeviceConnector.getSauceLabsCredentials();

    return {
      'sauce:options': {
        username: credentials.username,
        accessKey: credentials.accessKey,
        deviceName: config.deviceName,
        platformVersion: config.osVersion,
        realDevice: true,
        build: 'BDD Playwright - Real Device',
        name: 'Mobile Test Session',
        appiumVersion: 'latest',
      },
      platformName: config.platform === 'ios' ? 'iOS' : 'Android',
      browserName: config.platform === 'ios' ? 'Safari' : 'Chrome',
    };
  }

  /**
   * Retrieve Sauce Labs credentials from environment variables.
   * Throws if credentials are not configured.
   */
  public static getSauceLabsCredentials(): CloudCredentials {
    const username = process.env.SAUCE_USERNAME;
    const accessKey = process.env.SAUCE_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'Sauce Labs credentials not found. ' +
        'Set SAUCE_USERNAME and SAUCE_ACCESS_KEY in your .env file.'
      );
    }

    return { username, accessKey };
  }
}
