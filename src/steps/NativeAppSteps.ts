import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { NativeElementResolver } from '../core/NativeElementResolver';
import { DataStore } from '../utils/DataStore';
import { RandomDataGenerator } from '../utils/RandomDataGenerator';
import { Logger } from '../utils/Logger';

/**
 * Resolve a value that may contain ##tokens or {variables}.
 */
function resolveValue(value: string): string {
  let resolved = value;

  // Resolve ##RandomTokens (e.g., ##Email, ##FullName)
  if (resolved.includes('##')) {
    resolved = RandomDataGenerator.resolve(resolved);
  }

  // Resolve {variables} from DataStore
  const varPattern = /\{([^}]+)\}/g;
  resolved = resolved.replace(varPattern, (_, key) => {
    return DataStore.get(key) || `{${key}}`;
  });

  return resolved;
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

Given(
  /^I launch the app$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.launchApp();
  }
);

Given(
  /^I close the app$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.closeApp();
  }
);

Given(
  /^I reset the app$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.resetApp();
  }
);

// ─── Interactions ──────────────────────────────────────────────────────────────

When(
  /^I tap native ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    await this.nativeAppEngine.tap(elementId);
  }
);

When(
  /^I tap on text ['"](.+)['"]$/,
  async function (this: CustomWorld, text: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const resolvedText = resolveValue(text);
    // Use XPath to find element by text content
    const xpath = `//*[@text='${resolvedText}' or @label='${resolvedText}' or @name='${resolvedText}']`;
    const elementId = await this.nativeAppEngine.findElement('xpath', xpath);
    await this.nativeAppEngine.tap(elementId);
  }
);

When(
  /^I enter ['"](.+)['"] into native ['"](.+)['"]$/,
  async function (this: CustomWorld, value: string, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const resolvedValue = resolveValue(value);
    const locator = NativeElementResolver.resolve(elementRef);

    // Retry finding element — app may still be loading after relaunch
    const maxWaitMs = 15000;
    const pollInterval = 1500;
    const startTime = Date.now();
    let elementId: string | null = null;
    let lastError: any;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
        break;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (!elementId) {
      throw new Error(`Element "${elementRef}" not found within ${maxWaitMs}ms. Last error: ${lastError?.message || 'unknown'}`);
    }

    await this.nativeAppEngine.clear(elementId);
    await this.nativeAppEngine.sendKeys(elementId, resolvedValue);
  }
);

When(
  /^I clear native ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    await this.nativeAppEngine.clear(elementId);
  }
);

When(
  /^I long press ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    await this.nativeAppEngine.longPress(elementId);
  }
);

// ─── Gestures ──────────────────────────────────────────────────────────────────

When(
  /^I swipe ['"](.+)['"]$/,
  async function (this: CustomWorld, direction: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const validDirections = ['up', 'down', 'left', 'right'];
    if (!validDirections.includes(direction.toLowerCase())) {
      throw new Error(`Invalid swipe direction: "${direction}". Use: ${validDirections.join(', ')}`);
    }
    await this.nativeAppEngine.swipe(direction.toLowerCase() as any);
  }
);

When(
  /^I swipe ['"](.+)['"] on ['"](.+)['"]$/,
  async function (this: CustomWorld, direction: string, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    // Find element first (validates it exists), then swipe on screen
    const locator = NativeElementResolver.resolve(elementRef);
    await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    await this.nativeAppEngine.swipe(direction.toLowerCase() as any);
  }
);

When(
  /^I scroll ['"](.+)['"]$/,
  async function (this: CustomWorld, direction: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const validDirections = ['up', 'down'];
    if (!validDirections.includes(direction.toLowerCase())) {
      throw new Error(`Invalid scroll direction: "${direction}". Use: ${validDirections.join(', ')}`);
    }
    await this.nativeAppEngine.scroll(direction.toLowerCase() as any);
  }
);

When(
  /^I scroll ['"](.+)['"] until ['"](.+)['"] is visible$/,
  async function (this: CustomWorld, direction: string, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const maxScrolls = 10;
    let found = false;

    for (let i = 0; i < maxScrolls; i++) {
      try {
        const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
        const displayed = await this.nativeAppEngine.isDisplayed(elementId);
        if (displayed) {
          found = true;
          break;
        }
      } catch {
        // Element not found yet — continue scrolling
      }
      await this.nativeAppEngine.scroll(direction.toLowerCase() as any);
    }

    if (!found) {
      throw new Error(
        `Element "${elementRef}" not found after scrolling ${direction} ${maxScrolls} times`
      );
    }
  }
);

// ─── Assertions ────────────────────────────────────────────────────────────────

Then(
  /^native ['"](.+)['"] should be visible$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);

    // Retry with polling — native apps can take a few seconds for transitions
    const maxWaitMs = 15000;
    const pollInterval = 1000;
    const startTime = Date.now();
    let lastError: any;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
        const displayed = await this.nativeAppEngine.isDisplayed(elementId);
        if (displayed) return; // success
        lastError = new Error(`Element "${elementRef}" found but not visible`);
      } catch (error) {
        lastError = error;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Expected native element "${elementRef}" to be visible within ${maxWaitMs}ms. Last error: ${lastError?.message || 'unknown'}`);
  }
);

Then(
  /^native ['"](.+)['"] should not be visible$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    try {
      const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
      const displayed = await this.nativeAppEngine.isDisplayed(elementId);
      if (displayed) {
        throw new Error(`Expected native element "${elementRef}" to NOT be visible, but it was`);
      }
    } catch (error: any) {
      // Element not found at all = not visible (pass)
      if (error.message.includes('not found') || error.message.includes('NoSuchElement')) {
        return;
      }
      throw error;
    }
  }
);

Then(
  /^native ['"](.+)['"] should have text ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string, expectedText: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const resolvedExpected = resolveValue(expectedText);
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    const actualText = await this.nativeAppEngine.getText(elementId);

    if (actualText !== resolvedExpected) {
      throw new Error(
        `Expected native element "${elementRef}" to have text "${resolvedExpected}", ` +
        `but got "${actualText}"`
      );
    }
  }
);

Then(
  /^native ['"](.+)['"] should contain text ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string, expectedText: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const resolvedExpected = resolveValue(expectedText);
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    const actualText = await this.nativeAppEngine.getText(elementId);

    if (!actualText.includes(resolvedExpected)) {
      throw new Error(
        `Expected native element "${elementRef}" to contain text "${resolvedExpected}", ` +
        `but got "${actualText}"`
      );
    }
  }
);

Then(
  /^native ['"](.+)['"] should be enabled$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    const enabled = await this.nativeAppEngine.isEnabled(elementId);
    if (!enabled) {
      throw new Error(`Expected native element "${elementRef}" to be enabled, but it was disabled`);
    }
  }
);

Then(
  /^native ['"](.+)['"] should be disabled$/,
  async function (this: CustomWorld, elementRef: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    const enabled = await this.nativeAppEngine.isEnabled(elementId);
    if (enabled) {
      throw new Error(`Expected native element "${elementRef}" to be disabled, but it was enabled`);
    }
  }
);

// ─── Data Capture ──────────────────────────────────────────────────────────────

When(
  /^I store text of native ['"](.+)['"] as ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string, varName: string) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const locator = NativeElementResolver.resolve(elementRef);
    const elementId = await this.nativeAppEngine.findElement(locator.strategy, locator.value);
    const text = await this.nativeAppEngine.getText(elementId);
    DataStore.set(varName, text);
    Logger.info(`[NativeAppSteps] Stored text "${text}" as {${varName}}`);
  }
);

// ─── Navigation ────────────────────────────────────────────────────────────────

When(
  /^I press back$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.pressBack();
  }
);

When(
  /^I hide the keyboard$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.hideKeyboard();
  }
);

When(
  /^I accept the native alert$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.acceptAlert();
  }
);

When(
  /^I dismiss the native alert$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.dismissAlert();
  }
);

// ─── Context Switching (Hybrid Apps) ───────────────────────────────────────────

When(
  /^I switch to webview context$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    const contexts = await this.nativeAppEngine.getContexts();
    const webview = contexts.find((c) => c.startsWith('WEBVIEW'));
    if (!webview) {
      throw new Error(
        `No WEBVIEW context available. Available contexts: ${contexts.join(', ')}`
      );
    }
    await this.nativeAppEngine.switchContext(webview);
  }
);

When(
  /^I switch to native context$/,
  async function (this: CustomWorld) {
    if (!this.nativeAppEngine) {
      throw new Error('NativeAppEngine not initialized. Is this scenario tagged @native?');
    }
    await this.nativeAppEngine.switchContext('NATIVE_APP');
  }
);
