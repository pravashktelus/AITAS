import { Logger } from '../utils/Logger';
import * as dotenv from 'dotenv';

// Ensure .env is loaded for cloud credentials
// Use override:true so .env file values take precedence over system env vars
dotenv.config({ override: true });

/**
 * Locator strategies supported by Appium for native app elements.
 */
export type NativeLocatorStrategy =
  | 'accessibility id'        // iOS: accessibilityIdentifier, Android: content-description
  | 'id'                      // Android: resource-id (e.g., com.app:id/button)
  | 'xpath'                   // XPath on the native XML tree
  | 'class name'              // UIKit class (iOS) or Android widget class
  | '-ios predicate string'   // iOS NSPredicate
  | '-ios class chain'        // iOS class chain
  | '-android uiautomator'    // Android UiAutomator2 selector
  | 'name'                    // Element name/label
  ;

/**
 * NativeAppEngine — Drives native app interactions via Appium WebDriver protocol.
 * Communicates with the Appium server using HTTP REST calls (native fetch, no external dependencies).
 *
 * Supports:
 * - Android apps (.apk) via UiAutomator2
 * - iOS apps (.ipa/.app) via XCUITest
 * - Hybrid apps (context switching between native and webview)
 *
 * Usage:
 * ```typescript
 * const engine = new NativeAppEngine('http://localhost:4723', 'android');
 * await engine.createSession(capabilities);
 * const elementId = await engine.findElement('accessibility id', 'Login Button');
 * await engine.tap(elementId);
 * await engine.deleteSession();
 * ```
 */
export class NativeAppEngine {
  private appiumUrl: string;
  private sessionId: string | null = null;
  private platform: 'ios' | 'android';

  constructor(appiumUrl: string, platform: 'ios' | 'android') {
    this.appiumUrl = appiumUrl.replace(/\/+$/, '');
    this.platform = platform;
  }

  // ─── Session Management ──────────────────────────────────────────────────────

  /**
   * Create a new Appium session for native app testing.
   * Sends W3C capabilities to the Appium server.
   */
  public async createSession(capabilities: Record<string, any>): Promise<void> {
    const url = `${this.appiumUrl}/session`;

    // BrowserStack uses W3C capabilities format with bstack:options
    // Local Appium also uses W3C format
    const isBrowserStack = this.appiumUrl.includes('browserstack.com');
    const isLambdaTest = this.appiumUrl.includes('lambdatest.com');

    const body = JSON.stringify({
      capabilities: {
        alwaysMatch: capabilities,
        firstMatch: [{}],
      },
    });

    Logger.info(`[NativeAppEngine] Creating session at ${url}`);
    Logger.info(`[NativeAppEngine] Platform: ${this.platform}`);
    Logger.info(`[NativeAppEngine] Format: W3C capabilities`);
    Logger.info(`[NativeAppEngine] Capabilities: ${JSON.stringify(capabilities, null, 2)}`);

    try {
      // Build headers — add Basic Auth for cloud providers (BrowserStack, LambdaTest)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (isBrowserStack) {
        const user = process.env.BROWSERSTACK_USERNAME || '';
        const key = process.env.BROWSERSTACK_ACCESS_KEY || '';
        headers['Authorization'] = `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`;
      } else if (isLambdaTest) {
        const user = process.env.LAMBDATEST_USERNAME || '';
        const key = process.env.LAMBDATEST_ACCESS_KEY || '';
        headers['Authorization'] = `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`;
      }

      Logger.info(`[NativeAppEngine] Auth header present: ${!!headers['Authorization']}`);
      Logger.info(`[NativeAppEngine] Request body (first 500 chars): ${body.substring(0, 500)}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
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
      Logger.info(`[NativeAppEngine] Session created: ${sessionId}`);
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
   * Delete the active Appium session and clean up.
   */
  public async deleteSession(): Promise<void> {
    if (!this.sessionId) {
      Logger.warn('[NativeAppEngine] No active session to delete.');
      return;
    }

    const url = `${this.appiumUrl}/session/${this.sessionId}`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        Logger.info(`[NativeAppEngine] Session deleted: ${this.sessionId}`);
      } else {
        Logger.warn(`[NativeAppEngine] Failed to delete session (HTTP ${response.status})`);
      }
    } catch (error: any) {
      Logger.warn(`[NativeAppEngine] Error deleting session: ${error.message}`);
    } finally {
      this.sessionId = null;
    }
  }

  /**
   * Get the current session ID (or null if no session is active).
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  // ─── Element Finding ─────────────────────────────────────────────────────────

  /**
   * Find a single element using the given locator strategy.
   * @returns The element ID (W3C element reference)
   */
  public async findElement(strategy: NativeLocatorStrategy, value: string): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/element`;
    const body = JSON.stringify({ using: strategy, value });

    const response = await this.request('POST', url, body);
    const data = await response.json();

    const element = data.value;
    if (!element) {
      throw new Error(
        `Element not found with strategy "${strategy}" and value "${value}"`
      );
    }

    // W3C element ID is in ELEMENT key or the first value of the object
    const elementId = element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf'] || Object.values(element)[0];

    if (!elementId) {
      throw new Error(`Could not extract element ID from response: ${JSON.stringify(data)}`);
    }

    Logger.debug(`[NativeAppEngine] Found element: ${strategy}="${value}" → ${elementId}`);
    return elementId as string;
  }

  /**
   * Find multiple elements using the given locator strategy.
   * @returns Array of element IDs
   */
  public async findElements(strategy: NativeLocatorStrategy, value: string): Promise<string[]> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/elements`;
    const body = JSON.stringify({ using: strategy, value });

    const response = await this.request('POST', url, body);
    const data = await response.json();

    const elements = data.value || [];
    return elements.map((el: any) => {
      return el.ELEMENT || el['element-6066-11e4-a52e-4f735466cecf'] || Object.values(el)[0];
    }) as string[];
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Tap (click) on an element.
   */
  public async tap(elementId: string): Promise<void> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/click`;
    await this.request('POST', url, JSON.stringify({}));
    Logger.info(`[NativeAppEngine] Tapped element: ${elementId}`);
  }

  /**
   * Send keys (type text) into an element.
   */
  public async sendKeys(elementId: string, text: string): Promise<void> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/value`;
    await this.request('POST', url, JSON.stringify({ text }));
    Logger.info(`[NativeAppEngine] Sent keys to element: ${elementId}`);
  }

  /**
   * Clear the text content of an element.
   */
  public async clear(elementId: string): Promise<void> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/clear`;
    await this.request('POST', url, JSON.stringify({}));
    Logger.info(`[NativeAppEngine] Cleared element: ${elementId}`);
  }

  /**
   * Get the visible text of an element.
   */
  public async getText(elementId: string): Promise<string> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/text`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || '';
  }

  /**
   * Get an attribute value of an element.
   */
  public async getAttribute(elementId: string, attribute: string): Promise<string> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/attribute/${attribute}`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || '';
  }

  /**
   * Check if an element is displayed (visible on screen).
   */
  public async isDisplayed(elementId: string): Promise<boolean> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/displayed`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value === true;
  }

  /**
   * Check if an element is enabled (interactable).
   */
  public async isEnabled(elementId: string): Promise<boolean> {
    this.ensureSession();
    const url = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/enabled`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value === true;
  }

  // ─── Gestures ────────────────────────────────────────────────────────────────

  /**
   * Perform a swipe gesture on the screen.
   * Uses W3C Actions API for cross-platform compatibility.
   */
  public async swipe(direction: 'up' | 'down' | 'left' | 'right', distance: number = 500): Promise<void> {
    this.ensureSession();

    // Calculate start and end coordinates based on direction
    // Assumes a typical mobile screen center as starting point
    const centerX = 500;
    const centerY = 800;

    let startX = centerX, startY = centerY, endX = centerX, endY = centerY;

    switch (direction) {
      case 'up':
        startY = centerY + distance / 2;
        endY = centerY - distance / 2;
        break;
      case 'down':
        startY = centerY - distance / 2;
        endY = centerY + distance / 2;
        break;
      case 'left':
        startX = centerX + distance / 2;
        endX = centerX - distance / 2;
        break;
      case 'right':
        startX = centerX - distance / 2;
        endX = centerX + distance / 2;
        break;
    }

    const actions = [{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(startX), y: Math.round(startY) },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerMove', duration: 600, x: Math.round(endX), y: Math.round(endY) },
        { type: 'pointerUp', button: 0 },
      ],
    }];

    const url = `${this.appiumUrl}/session/${this.sessionId}/actions`;
    await this.request('POST', url, JSON.stringify({ actions }));
    Logger.info(`[NativeAppEngine] Swiped ${direction} (distance: ${distance})`);
  }

  /**
   * Perform a long press on an element.
   */
  public async longPress(elementId: string, durationMs: number = 2000): Promise<void> {
    this.ensureSession();

    // Get element location for the long press action
    const locUrl = `${this.appiumUrl}/session/${this.sessionId}/element/${elementId}/rect`;
    const locResponse = await this.request('GET', locUrl);
    const rect = (await locResponse.json()).value;

    const x = Math.round(rect.x + rect.width / 2);
    const y = Math.round(rect.y + rect.height / 2);

    const actions = [{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: durationMs },
        { type: 'pointerUp', button: 0 },
      ],
    }];

    const url = `${this.appiumUrl}/session/${this.sessionId}/actions`;
    await this.request('POST', url, JSON.stringify({ actions }));
    Logger.info(`[NativeAppEngine] Long pressed element: ${elementId} (${durationMs}ms)`);
  }

  /**
   * Scroll the screen in the given direction.
   */
  public async scroll(direction: 'up' | 'down', amount: number = 300): Promise<void> {
    // Scroll is essentially a swipe in the opposite visual direction
    const swipeDirection = direction === 'up' ? 'up' : 'down';
    await this.swipe(swipeDirection, amount);
    Logger.info(`[NativeAppEngine] Scrolled ${direction} (amount: ${amount})`);
  }

  // ─── App Management ──────────────────────────────────────────────────────────

  /**
   * Launch (activate) the app under test.
   * On cloud providers (BrowserStack, LambdaTest), the app is already launched
   * when the session is created with 'appium:app' capability — this is a no-op.
   * On local Appium with appium:app capability, app auto-launches too — no-op.
   */
  public async launchApp(): Promise<void> {
    this.ensureSession();

    // Cloud providers AND local Appium with appium:app capability auto-launch the app
    // The app is already running when session starts — no need to activate again
    Logger.info('[NativeAppEngine] App already launched by session creation (appium:app capability)');
  }

  /**
   * Close (terminate) the app under test.
   */
  public async closeApp(): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/app/terminate`;
    try {
      await this.request('POST', url, JSON.stringify({}));
    } catch {
      const execUrl = `${this.appiumUrl}/session/${this.sessionId}/execute`;
      await this.request('POST', execUrl, JSON.stringify({
        script: 'mobile: terminateApp',
        args: [{}],
      }));
    }
    Logger.info('[NativeAppEngine] App closed');
  }

  /**
   * Reset the app (clear data and restart).
   */
  public async resetApp(): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/app/reset`;
    try {
      await this.request('POST', url, JSON.stringify({}));
    } catch {
      // For Appium 2.x, terminate + activate is the reset pattern
      await this.closeApp();
      await this.launchApp();
    }
    Logger.info('[NativeAppEngine] App reset');
  }

  /**
   * Get the current app state (e.g., running in foreground, background, not running).
   */
  public async getAppState(): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/app/state`;
    try {
      const response = await this.request('POST', url, JSON.stringify({}));
      const data = await response.json();
      const state = data.value;

      // Appium returns numeric states: 0=not installed, 1=not running, 3=background, 4=foreground
      const stateMap: Record<number, string> = {
        0: 'not_installed',
        1: 'not_running',
        2: 'running_background_suspended',
        3: 'running_background',
        4: 'running_foreground',
      };

      return stateMap[state] || `unknown (${state})`;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Install an app on the device.
   */
  public async installApp(appPath: string): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/app/install`;
    await this.request('POST', url, JSON.stringify({ appPath }));
    Logger.info(`[NativeAppEngine] App installed from: ${appPath}`);
  }

  // ─── Context Switching (Hybrid Apps) ─────────────────────────────────────────

  /**
   * Get all available contexts (NATIVE_APP, WEBVIEW_*, etc.).
   */
  public async getContexts(): Promise<string[]> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/contexts`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || [];
  }

  /**
   * Switch to a specific context (e.g., 'NATIVE_APP' or 'WEBVIEW_com.myapp').
   */
  public async switchContext(contextName: string): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/context`;
    await this.request('POST', url, JSON.stringify({ name: contextName }));
    Logger.info(`[NativeAppEngine] Switched to context: ${contextName}`);
  }

  /**
   * Get the current context name.
   */
  public async getCurrentContext(): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/context`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || 'NATIVE_APP';
  }

  // ─── Screenshots ────────────────────────────────────────────────────────────

  /**
   * Take a screenshot of the current screen.
   * @returns Base64-encoded PNG screenshot
   */
  public async takeScreenshot(): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/screenshot`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || '';
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  /**
   * Get the native page source (XML hierarchy).
   */
  public async getPageSource(): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/source`;
    const response = await this.request('GET', url);
    const data = await response.json();
    return data.value || '';
  }

  /**
   * Hide the on-screen keyboard.
   */
  public async hideKeyboard(): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/device/hide_keyboard`;
    try {
      await this.request('POST', url, JSON.stringify({}));
      Logger.info('[NativeAppEngine] Keyboard hidden');
    } catch {
      Logger.warn('[NativeAppEngine] Could not hide keyboard (may already be hidden)');
    }
  }

  /**
   * Press the hardware back button (Android only).
   */
  public async pressBack(): Promise<void> {
    this.ensureSession();

    if (this.platform !== 'android') {
      Logger.warn('[NativeAppEngine] pressBack() is Android-only. Ignoring on iOS.');
      return;
    }

    const url = `${this.appiumUrl}/session/${this.sessionId}/back`;
    await this.request('POST', url, JSON.stringify({}));
    Logger.info('[NativeAppEngine] Pressed back button');
  }

  /**
   * Accept (tap OK/Allow) the currently visible native alert/dialog.
   */
  public async acceptAlert(): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/alert/accept`;
    await this.request('POST', url, JSON.stringify({}));
    Logger.info('[NativeAppEngine] Alert accepted');
  }

  /**
   * Dismiss (tap Cancel/Deny) the currently visible native alert/dialog.
   */
  public async dismissAlert(): Promise<void> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/alert/dismiss`;
    await this.request('POST', url, JSON.stringify({}));
    Logger.info('[NativeAppEngine] Alert dismissed');
  }

  // ─── Video Recording ─────────────────────────────────────────────────────────

  /**
   * Start video recording on the device.
   * Uses Appium's mobile:startRecordingScreen command.
   * @param options - Optional: timeLimit (max seconds, default 180), videoQuality (low/medium/high)
   */
  public async startVideoRecording(options?: { timeLimit?: number; videoQuality?: 'low' | 'medium' | 'high' }): Promise<void> {
    this.ensureSession();

    const params: Record<string, any> = {};

    if (this.platform === 'android') {
      params.options = {
        timeLimit: options?.timeLimit || 180,
        videoSize: options?.videoQuality === 'low' ? '540x960' : '720x1280',
        bitRate: options?.videoQuality === 'low' ? 1000000 : 4000000,
        forceRestart: true,
      };
    } else {
      // iOS
      params.options = {
        timeLimit: options?.timeLimit || 180,
        videoQuality: options?.videoQuality || 'medium',
        forceRestart: true,
      };
    }

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/start_recording_screen`;
    await this.request('POST', url, JSON.stringify(params));
    Logger.info(`[NativeAppEngine] Video recording started (platform: ${this.platform}, timeLimit: ${params.options.timeLimit}s)`);
  }

  /**
   * Stop video recording and return base64-encoded video data.
   * @returns Base64-encoded video string (MP4 for Android, MPEG for iOS)
   */
  public async stopVideoRecording(): Promise<string> {
    this.ensureSession();

    const url = `${this.appiumUrl}/session/${this.sessionId}/appium/stop_recording_screen`;
    const response = await this.request('POST', url, JSON.stringify({}));
    const data = await response.json() as any;
    const videoBase64 = data.value || '';

    Logger.info(`[NativeAppEngine] Video recording stopped (size: ${Math.round(videoBase64.length / 1024)}KB base64)`);
    return videoBase64;
  }

  /**
   * Stop video recording and save to file.
   * @param outputPath - Path to save the video file
   * @returns The saved file path
   */
  public async stopAndSaveVideo(outputPath: string): Promise<string> {
    const videoBase64 = await this.stopVideoRecording();

    if (!videoBase64) {
      Logger.warn('[NativeAppEngine] No video data received');
      return '';
    }

    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, Buffer.from(videoBase64, 'base64'));
    Logger.info(`[NativeAppEngine] Video saved: ${outputPath}`);
    return outputPath;
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  /**
   * Ensure an active session exists before making API calls.
   */
  private ensureSession(): void {
    if (!this.sessionId) {
      throw new Error(
        '[NativeAppEngine] No active session. Call createSession() first.'
      );
    }
  }

  /**
   * Make an HTTP request to the Appium server.
   */
  private async request(method: string, url: string, body?: string): Promise<Response> {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body && method !== 'GET') {
      options.body = body;
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.value?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(
        `[NativeAppEngine] Request failed (${method} ${url}): HTTP ${response.status} — ${errorMessage}`
      );
    }

    return response;
  }
}
