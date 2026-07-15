/**
 * TagParser — Utility class for parsing BDD scenario tags.
 *
 * Handles extraction and validation of:
 * - Device emulation tags (@device:DeviceName)
 * - Mobile tag (@mobile)
 * - Accessibility tags (@accessibility, @a11y)
 * - Browser filter tags (@chromium-only, @firefox-only, @webkit-only, @skip-chromium, @skip-firefox, @skip-webkit)
 *
 * All methods are static — no instance needed.
 */

/** Valid browser engines for filter tags */
const VALID_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
type BrowserName = (typeof VALID_BROWSERS)[number];

/** Regex to match @device:DeviceName tags (case-insensitive) */
const DEVICE_TAG_PATTERN = /^@device:(.+)$/i;

/** Regex to match @X-only tags */
const ONLY_TAG_PATTERN = /^@(chromium|firefox|webkit)-only$/i;

/** Regex to match @skip-X tags */
const SKIP_TAG_PATTERN = /^@skip-(chromium|firefox|webkit)$/i;

/** Regex to match @browsers:chromium,firefox,webkit tag (case-insensitive) */
const BROWSERS_TAG_PATTERN = /^@browsers:(.+)$/i;

export class TagParser {
  /**
   * Extract device name from @device:* tag.
   * Returns the normalized device name string, or null if no device tag is present.
   * Throws an error if multiple @device:* tags are found.
   *
   * @param tags - Array of scenario tags (e.g., ['@device:iPhone14', '@smoke'])
   * @returns The raw device name value from the tag (after the colon), or null
   * @throws Error if multiple @device:* tags are present
   *
   * Validates: Requirements 1.1, 1.5
   */
  public static parseDeviceTag(tags: string[]): string | null {
    const deviceTags = tags.filter((tag) => DEVICE_TAG_PATTERN.test(tag));

    if (deviceTags.length > 1) {
      throw new Error('Only one @device tag permitted per scenario');
    }

    if (deviceTags.length === 0) {
      return null;
    }

    const match = deviceTags[0].match(DEVICE_TAG_PATTERN);
    if (!match) {
      return null;
    }

    return match[1];
  }

  /**
   * Check for @mobile tag presence.
   *
   * @param tags - Array of scenario tags
   * @returns true if @mobile tag is present (case-insensitive)
   *
   * Validates: Requirement 1.2
   */
  public static hasMobileTag(tags: string[]): boolean {
    return tags.some((tag) => tag.toLowerCase() === '@mobile');
  }

  /**
   * Check for @accessibility or @a11y tag presence.
   *
   * @param tags - Array of scenario tags
   * @returns true if @accessibility or @a11y tag is present (case-insensitive)
   *
   * Validates: Requirement 3.1
   */
  public static hasAccessibilityTag(tags: string[]): boolean {
    return tags.some((tag) => {
      const lower = tag.toLowerCase();
      return lower === '@accessibility' || lower === '@a11y';
    });
  }

  /**
   * Extract browser filter tags (@X-only and @skip-X).
   * Returns lists of browsers that are "only" targets and browsers to skip.
   *
   * @param tags - Array of scenario tags
   * @returns Object with onlyBrowsers and skipBrowsers arrays
   *
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */
  public static parseBrowserFilterTags(tags: string[]): {
    onlyBrowsers: string[];
    skipBrowsers: string[];
  } {
    const onlyBrowsers: string[] = [];
    const skipBrowsers: string[] = [];

    for (const tag of tags) {
      const onlyMatch = tag.match(ONLY_TAG_PATTERN);
      if (onlyMatch) {
        const browser = onlyMatch[1].toLowerCase();
        if (!onlyBrowsers.includes(browser)) {
          onlyBrowsers.push(browser);
        }
        continue;
      }

      const skipMatch = tag.match(SKIP_TAG_PATTERN);
      if (skipMatch) {
        const browser = skipMatch[1].toLowerCase();
        if (!skipBrowsers.includes(browser)) {
          skipBrowsers.push(browser);
        }
      }
    }

    return { onlyBrowsers, skipBrowsers };
  }

  /**
   * Parse `@browsers:` tag to extract a list of targeted browsers.
   * Supports the new format `@browsers:chromium,firefox` alongside legacy tags.
   *
   * - Extracts browser names from the comma-separated value
   * - Validates each browser name against VALID_BROWSERS
   * - Logs a warning for any invalid/unrecognized browser names
   * - Returns a validation error if both legacy (@X-only, @skip-X) and new (@browsers:) formats are present
   * - Returns a validation error if the resulting browser list is empty after filtering invalid entries
   *
   * @param tags - Array of scenario tags
   * @returns Object with browsers array, valid flag, and optional error message
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  public static parseBrowserListTag(tags: string[]): {
    browsers: string[];
    valid: boolean;
    error?: string;
  } {
    // Find @browsers: tags
    const browsersTags = tags.filter((tag) => BROWSERS_TAG_PATTERN.test(tag));

    // No @browsers: tag present — return empty with valid=true (no-op)
    if (browsersTags.length === 0) {
      return { browsers: [], valid: true };
    }

    // Check for conflict with legacy format tags
    const { onlyBrowsers, skipBrowsers } = TagParser.parseBrowserFilterTags(tags);
    if (onlyBrowsers.length > 0 || skipBrowsers.length > 0) {
      const legacyTags = [
        ...onlyBrowsers.map((b) => `@${b}-only`),
        ...skipBrowsers.map((b) => `@skip-${b}`),
      ];
      return {
        browsers: [],
        valid: false,
        error: `Conflicting browser tag formats: cannot combine legacy tags (${legacyTags.join(', ')}) with @browsers: tag. Use one format per scenario.`,
      };
    }

    // Use the first @browsers: tag found (ignore duplicates)
    const match = browsersTags[0].match(BROWSERS_TAG_PATTERN);
    if (!match) {
      return { browsers: [], valid: true };
    }

    const rawValue = match[1];
    const entries = rawValue.split(',').map((entry) => entry.trim().toLowerCase());

    const validBrowsers: string[] = [];
    const invalidEntries: string[] = [];

    for (const entry of entries) {
      if (entry === '') {
        continue;
      }
      if ((VALID_BROWSERS as readonly string[]).includes(entry)) {
        if (!validBrowsers.includes(entry)) {
          validBrowsers.push(entry);
        }
      } else {
        invalidEntries.push(entry);
        console.warn(
          `[TagParser] Warning: Unrecognized browser name "${entry}" in @browsers: tag. Valid browsers are: ${VALID_BROWSERS.join(', ')}`
        );
      }
    }

    // If all entries were invalid, return validation error
    if (validBrowsers.length === 0) {
      return {
        browsers: [],
        valid: false,
        error: `@browsers: tag contains no valid browser names. Valid browsers are: ${VALID_BROWSERS.join(', ')}`,
      };
    }

    return { browsers: validBrowsers, valid: true };
  }

  /**
   * Normalize a device name for matching against the device registry.
   * Removes spaces, special characters, and converts to lowercase.
   *
   * Examples:
   *   "iPhone 14" → "iphone14"
   *   "Samsung Galaxy S23" → "samsunggalaxys23"
   *   "iPad Pro" → "ipadpro"
   *
   * @param name - The device name to normalize
   * @returns The normalized device name string
   *
   * Validates: Requirement 1.1
   */
  public static normalizeDeviceName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
}
