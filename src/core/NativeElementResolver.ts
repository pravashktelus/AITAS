import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { NativeLocatorStrategy } from './NativeAppEngine';

/**
 * Strategy prefix mapping for native app .properties files.
 *
 * Format in properties file: `ElementKey=prefix:value`
 *
 * Supported prefixes:
 * - `id:` → Android resource-id
 * - `accessibilityId:` → cross-platform accessibility identifier (RECOMMENDED)
 * - `xpath:` → native XML XPath
 * - `class:` → UIKit class (iOS) or Android widget class
 * - `iosPredicate:` → iOS NSPredicate string
 * - `iosClassChain:` → iOS class chain query
 * - `uiautomator:` → Android UiAutomator2 selector
 * - `name:` → element name/label
 * - No prefix (default) → treated as `accessibility id` (most portable)
 */
const STRATEGY_MAP: Record<string, NativeLocatorStrategy> = {
  'id': 'id',
  'accessibilityId': 'accessibility id',
  'xpath': 'xpath',
  'class': 'class name',
  'iosPredicate': '-ios predicate string',
  'iosClassChain': '-ios class chain',
  'uiautomator': '-android uiautomator',
  'name': 'name',
};

/** Result of resolving a native element reference */
export interface NativeLocator {
  strategy: NativeLocatorStrategy;
  value: string;
}

/**
 * NativeElementResolver — Resolves element references from .properties files for native apps.
 *
 * Properties file format:
 * ```
 * ElementKey=strategy:value
 * ```
 *
 * Usage in feature files:
 * ```gherkin
 * When I tap 'NativeAndroid.BtnLogin'
 * ```
 *
 * The resolver reads `NativeAndroid.properties`, finds the key `BtnLogin`,
 * parses the strategy prefix, and returns `{ strategy, value }` for Appium.
 */
export class NativeElementResolver {
  private static cache: Map<string, Record<string, string>> = new Map();

  private static readonly PROPERTIES_DIR = path.resolve(
    __dirname,
    '../pages/properties'
  );

  /**
   * Resolve a 'PageName.ElementKey' reference to a native locator.
   *
   * @param reference - String in format 'PageName.ElementKey' (e.g., 'NativeAndroid.BtnLogin')
   * @returns Object with `strategy` (Appium locator strategy) and `value` (locator value)
   */
  public static resolve(reference: string): NativeLocator {
    const parts = reference.split('.');
    if (parts.length < 2) {
      throw new Error(
        `Invalid native element reference "${reference}". Expected format: PageName.ElementKey`
      );
    }

    const [pageName, ...keyParts] = parts;
    const elementKey = keyParts.join('.');

    const properties = this.loadPage(pageName);

    if (!(elementKey in properties)) {
      throw new Error(
        `Native element key "${elementKey}" not found in ${pageName}.properties.\n` +
        `Available keys: ${Object.keys(properties).join(', ')}`
      );
    }

    const rawLocator = properties[elementKey];
    Logger.debug(`[NativeElementResolver] Resolved "${reference}" → "${rawLocator}"`);
    return this.parseLocator(rawLocator);
  }

  /**
   * Parse a locator string like "id:com.app:id/button" into strategy + value.
   *
   * @param locator - Raw locator string from properties file
   * @returns Object with `strategy` and `value`
   */
  public static parseLocator(locator: string): NativeLocator {
    // Check each known strategy prefix
    for (const [prefix, strategy] of Object.entries(STRATEGY_MAP)) {
      const prefixWithColon = `${prefix}:`;
      if (locator.startsWith(prefixWithColon)) {
        const value = locator.substring(prefixWithColon.length);
        return { strategy, value };
      }
    }

    // No recognized prefix — default to 'accessibility id' (most portable)
    return {
      strategy: 'accessibility id',
      value: locator,
    };
  }

  /**
   * Load and cache a properties file by page name.
   */
  private static loadPage(pageName: string): Record<string, string> {
    if (this.cache.has(pageName)) {
      return this.cache.get(pageName)!;
    }

    const filePath = path.join(this.PROPERTIES_DIR, `${pageName}.properties`);

    if (!fs.existsSync(filePath)) {
      const available = this.listAvailablePages();
      throw new Error(
        `Properties file not found: ${filePath}\n` +
        `Available pages: ${available.join(', ')}`
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const properties = this.parse(content);
    this.cache.set(pageName, properties);
    return properties;
  }

  /**
   * Parse .properties file content into key-value pairs.
   */
  private static parse(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;

      const key = line.substring(0, eqIndex).trim();
      const value = line.substring(eqIndex + 1).trim();

      if (key) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * List all available properties pages in the directory.
   */
  private static listAvailablePages(): string[] {
    if (!fs.existsSync(this.PROPERTIES_DIR)) return [];
    return fs
      .readdirSync(this.PROPERTIES_DIR)
      .filter((f) => f.endsWith('.properties'))
      .map((f) => f.replace('.properties', ''));
  }

  /**
   * Clear the properties cache (useful for tests).
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}
