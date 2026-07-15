import { Logger } from '../utils/Logger';

/**
 * AppiumConnector — Handles local Appium server connections for real device testing.
 * Uses native HTTP fetch to communicate with the Appium REST API.
 * No external dependencies required beyond Node.js built-ins.
 *
 * Supports:
 * - iOS Safari via XCUITest automation
 * - Android Chrome via UiAutomator2 automation
 */
export class AppiumConnector {
  private appiumUrl: string;
  private sessionId: string | null = null;

  constructor(appiumUrl: string = 'http://localhost:4723') {
    // Normalize URL — remove trailing slash
    this.appiumUrl = appiumUrl.replace(/\/+$/, '');
  }

  /**
   * Create a new Appium session for mobile browser testing.
   * Sends a POST to /session with the W3C capabilities format.
   *
   * @param capabilities - W3C capabilities object
   * @returns The session ID from Appium
   */
  public async createSession(capabilities: Record<string, any>): Promise<string> {
    const url = `${this.appiumUrl}/session`;
    const body = JSON.stringify({
      capabilities: {
        alwaysMatch: capabilities,
        firstMatch: [{}],
      },
    });

    Logger.info(`Creating Appium session at ${url}`);
    Logger.info(`Capabilities: ${JSON.stringify(capabilities, null, 2)}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Appium session creation failed (HTTP ${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      const sessionId = data.value?.sessionId || data.sessionId;

      if (!sessionId) {
        throw new Error(
          `Appium response did not contain sessionId: ${JSON.stringify(data)}`
        );
      }

      this.sessionId = sessionId;
      Logger.info(`Appium session created: ${sessionId}`);
      return sessionId;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to Appium server at ${this.appiumUrl}. ` +
          `Is the Appium server running? Start it with: appium`
        );
      }
      throw error;
    }
  }

  /**
   * Get the CDP (Chrome DevTools Protocol) endpoint for the active session.
   * For Android Chrome, Appium exposes a debugger URL that Playwright can connect to.
   * For iOS Safari, returns the WebKit inspector URL.
   *
   * @returns The CDP/debugger WebSocket URL
   */
  public async getCdpEndpoint(): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active Appium session. Call createSession() first.');
    }

    // For Android Chrome, query the Chrome debugger URL via Appium
    const url = `${this.appiumUrl}/session/${this.sessionId}/chromium/send_command`;

    try {
      // Try to get Chrome debugger address from Appium session details
      const sessionUrl = `${this.appiumUrl}/session/${this.sessionId}`;
      const response = await fetch(sessionUrl, { method: 'GET' });

      if (response.ok) {
        const data = await response.json();
        const caps = data.value || data;

        // For Android Chrome, the CDP URL is typically on the device's Chrome debugger port
        if (caps.chromedriverServiceUrl || caps['appium:chromedriverServiceUrl']) {
          const chromeDriverUrl = caps.chromedriverServiceUrl || caps['appium:chromedriverServiceUrl'];
          Logger.info(`ChromeDriver service URL: ${chromeDriverUrl}`);
          // The CDP endpoint is the device debugger forwarded through ADB
          return `ws://127.0.0.1:9222/devtools/browser`;
        }

        // For iOS Safari, return the WebKit inspector endpoint
        if (caps.platformName?.toLowerCase() === 'ios') {
          Logger.info('iOS Safari session — using Safari remote inspector');
          return `ws://127.0.0.1:27753/devtools/page/1`;
        }
      }

      // Fallback: construct a default CDP URL
      Logger.warn('Could not determine CDP endpoint from session. Using default.');
      return `ws://127.0.0.1:9222/devtools/browser`;
    } catch (error: any) {
      Logger.warn(`Error getting CDP endpoint: ${error.message}. Using default.`);
      return `ws://127.0.0.1:9222/devtools/browser`;
    }
  }

  /**
   * Build iOS Safari capabilities for XCUITest automation.
   *
   * @param deviceName - The iOS device name (e.g., "iPhone 15")
   * @param osVersion - The iOS version (e.g., "17")
   * @returns W3C capabilities object
   */
  public static buildIOSCapabilities(
    deviceName: string,
    osVersion: string
  ): Record<string, any> {
    return {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': deviceName,
      'appium:platformVersion': osVersion,
      browserName: 'Safari',
      'appium:noReset': true,
    };
  }

  /**
   * Build Android Chrome capabilities for UiAutomator2 automation.
   *
   * @param deviceName - The Android device name (e.g., "Samsung Galaxy S24")
   * @param osVersion - The Android version (e.g., "14")
   * @returns W3C capabilities object
   */
  public static buildAndroidCapabilities(
    deviceName: string,
    osVersion: string
  ): Record<string, any> {
    return {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': deviceName,
      'appium:platformVersion': osVersion,
      browserName: 'Chrome',
      'appium:chromeOptions': { w3c: true },
      'appium:noReset': true,
    };
  }

  /**
   * Delete the active Appium session and clean up resources.
   */
  public async deleteSession(): Promise<void> {
    if (!this.sessionId) {
      Logger.warn('No active Appium session to delete.');
      return;
    }

    const url = `${this.appiumUrl}/session/${this.sessionId}`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        Logger.info(`Appium session deleted: ${this.sessionId}`);
      } else {
        Logger.warn(`Failed to delete Appium session (HTTP ${response.status})`);
      }
    } catch (error: any) {
      Logger.warn(`Error deleting Appium session: ${error.message}`);
    } finally {
      this.sessionId = null;
    }
  }

  /**
   * Check if the Appium server is running and accessible.
   *
   * @returns true if the Appium server responds to /status
   */
  public async isServerRunning(): Promise<boolean> {
    const url = `${this.appiumUrl}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the current session ID (or null if no session is active).
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }
}
