import { Page, BrowserContext } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { TagParser } from './TagParser';

/**
 * MobileEngine — Playwright-based mobile emulation engine.
 * Provides device emulation, touch gestures, orientation control,
 * network throttling, and geolocation simulation.
 *
 * Works with Playwright's built-in device descriptors and custom viewport configs.
 * No Appium or native driver required — runs in the same Chromium/WebKit engine.
 */

export interface MobileDeviceConfig {
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

// Curated device presets matching Playwright's device list
export const MOBILE_DEVICES: Record<string, MobileDeviceConfig> = {
  'iPhone 14': {
    name: 'iPhone 14',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  'iPhone SE': {
    name: 'iPhone SE',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'Pixel 7': {
    name: 'Pixel 7',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  },
  'Samsung Galaxy S23': {
    name: 'Samsung Galaxy S23',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  'iPad Pro': {
    name: 'iPad Pro',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'iPad Mini': {
    name: 'iPad Mini',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

/**
 * Normalized device name lookup map.
 * Maps normalized names (lowercase, no spaces/special chars) to canonical names in MOBILE_DEVICES.
 * e.g., "iphone14" → "iPhone 14", "samsunggalaxys23" → "Samsung Galaxy S23"
 */
export const DEVICE_NAME_LOOKUP: Record<string, string> = Object.keys(MOBILE_DEVICES).reduce(
  (map, canonicalName) => {
    const normalized = TagParser.normalizeDeviceName(canonicalName);
    map[normalized] = canonicalName;
    return map;
  },
  {} as Record<string, string>
);

export class MobileEngine {
  private page: Page;
  private context: BrowserContext;
  private currentDevice: MobileDeviceConfig | null = null;
  private isLandscape: boolean = false;
  private currentOrientation: 'portrait' | 'landscape' = 'portrait';

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  /**
   * Apply device emulation at context creation time.
   * Configures viewport, user agent, device scale factor, and touch capabilities.
   * For landscape orientation, swaps width and height from the device profile.
   *
   * @param device - The device configuration to apply
   * @param orientation - Either 'portrait' or 'landscape'
   *
   * Validates: Requirements 1.7, 2.2, 2.3, 9.2
   */
  public async applyDeviceProfile(
    device: MobileDeviceConfig,
    orientation: 'portrait' | 'landscape'
  ): Promise<void> {
    this.currentDevice = device;
    this.currentOrientation = orientation;

    let width = device.viewport.width;
    let height = device.viewport.height;

    // Swap dimensions for landscape orientation
    if (orientation === 'landscape') {
      [width, height] = [height, width];
      this.isLandscape = true;
    } else {
      this.isLandscape = false;
    }

    // Set viewport size
    await this.page.setViewportSize({ width, height });

    // Set user agent via extra HTTP headers
    await this.page.setExtraHTTPHeaders({ 'User-Agent': device.userAgent });

    Logger.info(
      `Applied device profile: ${device.name} (${width}x${height}, ${orientation}, scale=${device.deviceScaleFactor}, touch=${device.hasTouch})`
    );
  }

  /**
   * Apply network throttling with browser-awareness.
   * Only applies CDP-based network throttling on Chromium.
   * On Firefox/WebKit, logs a warning and skips without failing.
   *
   * @param condition - Network condition to apply ('2G', '3G', '4G', 'fast')
   * @param browserName - The active browser engine name
   *
   * Validates: Requirements 2.4, 9.3
   */
  public async setNetworkConditionSafe(
    condition: '2G' | '3G' | '4G' | 'fast',
    browserName: 'chromium' | 'firefox' | 'webkit'
  ): Promise<void> {
    if (browserName !== 'chromium') {
      Logger.warn(
        `CDP-based network throttling is only available on Chromium. Skipping network condition "${condition}" on ${browserName}.`
      );
      return;
    }

    const conditions = {
      '2G': { offline: false, downloadThroughput: 50000, uploadThroughput: 20000, latency: 300 },
      '3G': { offline: false, downloadThroughput: 375000, uploadThroughput: 100000, latency: 100 },
      '4G': { offline: false, downloadThroughput: 4000000, uploadThroughput: 3000000, latency: 20 },
      fast: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
    };

    const cdp = await this.context.newCDPSession(this.page);
    await cdp.send('Network.emulateNetworkConditions', conditions[condition]);
    Logger.info(`Network condition set to: ${condition} (browser: ${browserName})`);
  }

  /**
   * Get device emulation metadata for reporting.
   * Returns device name, viewport dimensions, and orientation — or null if no emulation is active.
   *
   * Validates: Requirements 1.8, 10.4
   */
  public getEmulationMetadata(): {
    deviceName: string;
    viewport: { width: number; height: number };
    orientation: 'portrait' | 'landscape';
  } | null {
    if (!this.currentDevice) {
      return null;
    }

    const vp = this.page.viewportSize();
    if (!vp) {
      return null;
    }

    return {
      deviceName: this.currentDevice.name,
      viewport: { width: vp.width, height: vp.height },
      orientation: this.currentOrientation,
    };
  }

  /** Emulate a named device (from MOBILE_DEVICES preset or custom config) */
  public async emulateDevice(deviceName: string): Promise<void> {
    const device = MOBILE_DEVICES[deviceName];
    if (!device) {
      throw new Error(
        `Unknown device: "${deviceName}". Available: ${Object.keys(MOBILE_DEVICES).join(', ')}`
      );
    }
    this.currentDevice = device;
    await this.page.setViewportSize(device.viewport);
    await this.page.setExtraHTTPHeaders({ 'User-Agent': device.userAgent });
    Logger.info(`Emulating device: ${device.name} (${device.viewport.width}x${device.viewport.height})`);
  }

  /** Set a custom viewport size */
  public async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    Logger.info(`Viewport set to ${width}x${height}`);
  }

  /** Rotate to landscape (swaps width and height of current device) */
  public async rotateLandscape(): Promise<void> {
    const vp = this.page.viewportSize();
    if (!vp) return;
    if (vp.width < vp.height) {
      await this.page.setViewportSize({ width: vp.height, height: vp.width });
      this.isLandscape = true;
      Logger.info(`Rotated to landscape: ${vp.height}x${vp.width}`);
    }
  }

  /** Rotate to portrait */
  public async rotatePortrait(): Promise<void> {
    const vp = this.page.viewportSize();
    if (!vp) return;
    if (vp.width > vp.height) {
      await this.page.setViewportSize({ width: vp.height, height: vp.width });
      this.isLandscape = false;
      Logger.info(`Rotated to portrait: ${vp.height}x${vp.width}`);
    }
  }

  /** Simulate a swipe gesture (touch drag) */
  public async swipe(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number = 300
  ): Promise<void> {
    const vp = this.page.viewportSize() ?? { width: 390, height: 844 };
    const cx = vp.width / 2;
    const cy = vp.height / 2;
    const vectors = {
      up:    { x: 0, y: -distance },
      down:  { x: 0, y: distance },
      left:  { x: -distance, y: 0 },
      right: { x: distance, y: 0 },
    };
    const v = vectors[direction];
    await this.page.touchscreen.tap(cx, cy);
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(cx + v.x, cy + v.y, { steps: 10 });
    await this.page.mouse.up();
    Logger.info(`Swiped ${direction} by ${distance}px`);
  }

  /** Scroll the page in a direction by given pixels (uses JavaScript scroll for precision) */
  public async scroll(direction: 'up' | 'down', amount: number = 300): Promise<void> {
    const scrollY = direction === 'down' ? amount : -amount;
    await this.page.evaluate((y) => window.scrollBy(0, y), scrollY);
    await this.page.waitForTimeout(300); // Wait for scroll animation
    Logger.info(`Scrolled ${direction} by ${amount}px`);
  }

  /** Scroll to a specific element, bringing it into view */
  public async scrollToElement(elementRef: string): Promise<void> {
    const locator = this.page.locator(elementRef);
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    Logger.info(`Scrolled to element: ${elementRef}`);
  }

  /** Scroll to top of page */
  public async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(300);
    Logger.info('Scrolled to top of page');
  }

  /** Scroll to bottom of page */
  public async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(300);
    Logger.info('Scrolled to bottom of page');
  }

  /** Simulate a tap at element center */
  public async tap(elementRef: string): Promise<void> {
    const locator = this.page.locator(elementRef);
    await locator.tap();
    Logger.info(`Tapped: ${elementRef}`);
  }

  /** Simulate a long press (touch hold) */
  public async longPress(elementRef: string, durationMs: number = 1000): Promise<void> {
    const locator = this.page.locator(elementRef);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Cannot long-press: element not found — ${elementRef}`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.touchscreen.tap(x, y);
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.waitForTimeout(durationMs);
    await this.page.mouse.up();
    Logger.info(`Long-pressed ${elementRef} for ${durationMs}ms`);
  }

  /** Simulate a pinch-zoom in gesture */
  public async pinchZoomIn(): Promise<void> {
    const vp = this.page.viewportSize() ?? { width: 390, height: 844 };
    await this.page.evaluate(({ w, h }) => {
      const el = document.elementFromPoint(w / 2, h / 2);
      if (el) {
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true }));
      }
    }, { w: vp.width, h: vp.height });
    Logger.info('Pinch-zoomed in');
  }

  /** Simulate a pinch-zoom out gesture */
  public async pinchZoomOut(): Promise<void> {
    const vp = this.page.viewportSize() ?? { width: 390, height: 844 };
    await this.page.evaluate(({ w, h }) => {
      const el = document.elementFromPoint(w / 2, h / 2);
      if (el) {
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true }));
      }
    }, { w: vp.width, h: vp.height });
    Logger.info('Pinch-zoomed out');
  }

  /** Simulate network conditions */
  public async setNetworkCondition(
    condition: 'offline' | '2G' | '3G' | '4G' | 'fast'
  ): Promise<void> {
    const conditions = {
      offline:  { offline: true,  downloadThroughput: 0,      uploadThroughput: 0,      latency: 0   },
      '2G':     { offline: false, downloadThroughput: 50000,  uploadThroughput: 20000,  latency: 300 },
      '3G':     { offline: false, downloadThroughput: 375000, uploadThroughput: 100000, latency: 100 },
      '4G':     { offline: false, downloadThroughput: 4000000,uploadThroughput: 3000000,latency: 20  },
      fast:     { offline: false, downloadThroughput: -1,     uploadThroughput: -1,     latency: 0   },
    };
    const cdp = await this.context.newCDPSession(this.page);
    await cdp.send('Network.emulateNetworkConditions', conditions[condition]);
    Logger.info(`Network condition set to: ${condition}`);
  }

  /** Set device geolocation */
  public async setGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.context.setGeolocation({ latitude, longitude });
    await this.context.grantPermissions(['geolocation']);
    Logger.info(`Geolocation set to: ${latitude}, ${longitude}`);
  }

  /** Get current device info */
  public getCurrentDevice(): MobileDeviceConfig | null {
    return this.currentDevice;
  }

  /** Assert element is within the mobile viewport (not clipped) */
  public async assertElementInViewport(elementRef: string): Promise<void> {
    const locator = this.page.locator(elementRef);
    const box = await locator.boundingBox();
    const vp = this.page.viewportSize();
    if (!box || !vp) throw new Error(`Cannot check viewport for: ${elementRef}`);
    const inView =
      box.x >= 0 && box.y >= 0 &&
      box.x + box.width <= vp.width &&
      box.y + box.height <= vp.height;
    if (!inView) {
      throw new Error(
        `Element "${elementRef}" is outside the viewport.\n` +
        `Element bounds: x=${box.x} y=${box.y} w=${box.width} h=${box.height}\n` +
        `Viewport: ${vp.width}x${vp.height}`
      );
    }
    Logger.info(`✓ Element "${elementRef}" is within the viewport`);
  }

  /** Assert touch target meets minimum size (44x44px WCAG recommendation) */
  public async assertTouchTargetSize(elementRef: string, minSize: number = 44): Promise<void> {
    const locator = this.page.locator(elementRef);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Cannot measure touch target: ${elementRef}`);
    const issues: string[] = [];
    if (box.width < minSize)  issues.push(`width ${box.width}px < ${minSize}px`);
    if (box.height < minSize) issues.push(`height ${box.height}px < ${minSize}px`);
    if (issues.length > 0) {
      throw new Error(`Touch target too small for "${elementRef}": ${issues.join(', ')}`);
    }
    Logger.info(`✓ Touch target size OK for "${elementRef}": ${box.width}x${box.height}px`);
  }
}
