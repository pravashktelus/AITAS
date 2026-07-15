import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';

// =============================================================================
// MOBILE STEP DEFINITIONS
// =============================================================================
// All steps that control mobile emulation, gestures, orientation,
// network throttling, geolocation, and mobile-specific assertions.
//
// TAG:  Add @mobile to your scenario — no other setup needed.
//
// USAGE EXAMPLES:
//   Given I emulate device 'iPhone 14'
//   When I swipe up
//   When I tap 'Page.Element'
//   When I rotate to landscape
//   When I set network condition to '3G'
//   Then the element 'Page.Btn' should have adequate touch target size
// =============================================================================

// ─── Device Emulation ────────────────────────────────────────────────────────

Given(
  /^I emulate (?:the )?(?:device |mobile )?['"](.+)['"]$/,
  async function (this: CustomWorld, deviceName: string) {
    await this.mobileEngine.emulateDevice(deviceName);
  }
);

Given(
  /^I set (?:the )?viewport to (\d+) by (\d+)$/,
  async function (this: CustomWorld, width: string, height: string) {
    await this.mobileEngine.setViewport(parseInt(width), parseInt(height));
  }
);

// ─── Orientation ─────────────────────────────────────────────────────────────

When(
  /^I rotate (?:the )?(?:device )?to landscape$/,
  async function (this: CustomWorld) {
    await this.mobileEngine.rotateLandscape();
  }
);

When(
  /^I rotate (?:the )?(?:device )?to portrait$/,
  async function (this: CustomWorld) {
    await this.mobileEngine.rotatePortrait();
  }
);

// ─── Gestures ────────────────────────────────────────────────────────────────

When(
  /^I swipe (up|down|left|right)(?: by (\d+)(?:px)?)?$/,
  async function (this: CustomWorld, direction: string, distance?: string) {
    const dist = distance ? parseInt(distance) : 300;
    await this.mobileEngine.swipe(direction as 'up' | 'down' | 'left' | 'right', dist);
  }
);

When(
  /^I tap ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    await this.mobileEngine.tap(await locator.evaluate(el => {
      // Build a unique selector for the element
      return el.getAttribute('data-testid')
        ? `[data-testid="${el.getAttribute('data-testid')}"]`
        : el.tagName.toLowerCase();
    }));
  }
);

When(
  /^I long press ['"](.+)['"](?:(?: for (\d+)(?:ms)?)?)?$/,
  async function (this: CustomWorld, elementRef: string, durationMs?: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const selector = await locator.evaluate(el => {
      const testId = el.getAttribute('data-testid');
      return testId ? `[data-testid="${testId}"]` : el.tagName.toLowerCase();
    });
    const duration = durationMs ? parseInt(durationMs) : 1000;
    await this.mobileEngine.longPress(selector, duration);
  }
);

When(
  /^I pinch zoom (in|out)$/,
  async function (this: CustomWorld, direction: string) {
    if (direction === 'in') {
      await this.mobileEngine.pinchZoomIn();
    } else {
      await this.mobileEngine.pinchZoomOut();
    }
  }
);

// ─── Network Throttling ───────────────────────────────────────────────────────

When(
  /^I set (?:the )?network condition to ['"]?(offline|2G|3G|4G|fast)['"]?$/,
  async function (this: CustomWorld, condition: string) {
    await this.mobileEngine.setNetworkCondition(
      condition as 'offline' | '2G' | '3G' | '4G' | 'fast'
    );
  }
);

// ─── Geolocation ──────────────────────────────────────────────────────────────

When(
  /^I set (?:the )?(?:device )?location to ([-\d.]+) latitude and ([-\d.]+) longitude$/,
  async function (this: CustomWorld, lat: string, lon: string) {
    await this.mobileEngine.setGeolocation(parseFloat(lat), parseFloat(lon));
  }
);

// ─── Mobile Assertions ────────────────────────────────────────────────────────

Then(
  /^['"](.+)['"] should be (?:within|inside) the (?:mobile )?viewport$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const selector = await locator.evaluate(el => {
      const testId = el.getAttribute('data-testid');
      return testId ? `[data-testid="${testId}"]` : el.tagName.toLowerCase();
    });
    await this.mobileEngine.assertElementInViewport(selector);
  }
);

Then(
  /^['"](.+)['"] should have (?:an? )?adequate touch target size$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const selector = await locator.evaluate(el => {
      const testId = el.getAttribute('data-testid');
      return testId ? `[data-testid="${testId}"]` : el.tagName.toLowerCase();
    });
    await this.mobileEngine.assertTouchTargetSize(selector);
  }
);

Then(
  /^['"](.+)['"] touch target should be at least (\d+) by (\d+) pixels$/,
  async function (this: CustomWorld, elementRef: string, minW: string, minH: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Cannot measure touch target: ${elementRef}`);
    const w = parseInt(minW), h = parseInt(minH);
    if (box.width < w || box.height < h) {
      throw new Error(
        `Touch target "${elementRef}" is ${Math.round(box.width)}x${Math.round(box.height)}px — ` +
        `expected at least ${w}x${h}px`
      );
    }
    Logger.info(`✓ Touch target size OK: ${Math.round(box.width)}x${Math.round(box.height)}px`);
  }
);

Then(
  /^the current device should be ['"](.+)['"]$/,
  async function (this: CustomWorld, expectedDevice: string) {
    const device = this.mobileEngine.getCurrentDevice();
    if (!device || device.name !== expectedDevice) {
      throw new Error(
        `Expected device "${expectedDevice}" but current device is "${device?.name ?? 'none'}"`
      );
    }
    Logger.info(`✓ Current device is "${expectedDevice}"`);
  }
);

Then(
  /^the page should be responsive at (\d+) by (\d+) viewport$/,
  async function (this: CustomWorld, width: string, height: string) {
    const w = parseInt(width), h = parseInt(height);
    await this.mobileEngine.setViewport(w, h);
    // Wait for layout reflow
    await this.contextManager.getPage().waitForTimeout(500);
    // Check no horizontal scrollbar
    const hasHScroll = await this.contextManager.getPage().evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasHScroll) {
      throw new Error(
        `Page has horizontal overflow at ${w}x${h} viewport — layout is not responsive`
      );
    }
    Logger.info(`✓ Page is responsive at ${w}x${h} viewport (no horizontal overflow)`);
  }
);

// ─── Info / Debug ────────────────────────────────────────────────────────────

When(
  /^I store (?:the )?current viewport as ['"](.+)['"]$/,
  async function (this: CustomWorld, variableName: string) {
    const vp = this.contextManager.getPage().viewportSize();
    const value = vp ? `${vp.width}x${vp.height}` : 'unknown';
    DataStore.set(variableName, value);
    Logger.info(`Viewport stored as "${variableName}": ${value}`);
  }
);
