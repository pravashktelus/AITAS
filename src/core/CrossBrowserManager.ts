import { FrameworkConfig } from '../config/FrameworkConfig';
import { TagParser } from './TagParser';
import { Logger } from '../utils/Logger';
import { RetryManager, RetryConfig } from './RetryManager';

/**
 * Result of executing the test suite on a single browser engine.
 */
export interface BrowserRunResult {
  browser: 'chromium' | 'firefox' | 'webkit';
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  scenarioResults: ScenarioResult[];
  /** Optional metadata for retry information */
  metadata?: {
    /** Number of retry attempts before success (0 means passed on first attempt) */
    retryAttempts?: number;
    /** Error messages from all failed attempts when retries are exhausted */
    attemptErrors?: string[];
  };
}

/**
 * Result of a single scenario execution on a specific browser.
 */
export interface ScenarioResult {
  name: string;
  featureFile: string;
  status: 'passed' | 'failed' | 'skipped' | 'not_executed';
  duration: number;
  errorMessage?: string;
  filterReason?: string;
}

/**
 * CrossBrowserManager — Orchestrates test execution across multiple browser engines
 * with optional parallel execution, browser filtering via tags, and result collection.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.7, 6.1, 6.2, 6.3, 6.5, 6.6, 8.1–8.7
 */
export class CrossBrowserManager {
  private config: FrameworkConfig;
  private results: Map<string, BrowserRunResult>;

  constructor(config: FrameworkConfig) {
    this.config = config;
    this.results = new Map();
  }

  /**
   * Get the list of configured browser engines from FrameworkConfig.
   *
   * Validates: Requirement 5.1
   */
  public getBrowsers(): Array<'chromium' | 'firefox' | 'webkit'> {
    return this.config.crossBrowser.browsers;
  }

  /**
   * Determine whether a scenario should run on a given browser based on filter tags.
   *
   * Resolution logic:
   * - If @browsers: tag is present with valid=true and non-empty list, only run on listed browsers
   * - If @X-only tags are present and do NOT include the target browser → skip
   * - If @X-only tags include the target browser → run
   * - If @skip-X includes the target browser → skip
   * - If no browser filter tags → run
   *
   * Validates: Requirements 3.2, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  public shouldRunOnBrowser(
    scenarioTags: string[],
    browser: 'chromium' | 'firefox' | 'webkit'
  ): { run: boolean; reason?: string } {
    // Check new @browsers: tag format first — it takes precedence when present alone
    const browserListResult = TagParser.parseBrowserListTag(scenarioTags);
    if (browserListResult.valid && browserListResult.browsers.length > 0) {
      if (browserListResult.browsers.includes(browser)) {
        return { run: true };
      }
      return {
        run: false,
        reason: `filtered by @browsers: tag (allowed: ${browserListResult.browsers.join(', ')})`,
      };
    }

    // Fall back to legacy tag format
    const { onlyBrowsers, skipBrowsers } = TagParser.parseBrowserFilterTags(scenarioTags);

    // If @X-only tags are present, only run on those browsers
    if (onlyBrowsers.length > 0) {
      if (onlyBrowsers.includes(browser)) {
        return { run: true };
      }
      return { run: false, reason: `filtered by @${onlyBrowsers[0]}-only tag` };
    }

    // If @skip-X includes the target browser, skip it
    if (skipBrowsers.includes(browser)) {
      return { run: false, reason: `excluded by @skip-${browser} tag` };
    }

    // No browser filter tags — run on all browsers
    return { run: true };
  }

  /**
   * Validate browser filter tags for conflicts.
   *
   * Invalid combinations:
   * - Multiple different @X-only tags (e.g., @chromium-only + @firefox-only)
   * - @X-only combined with @skip-X for the same browser
   * - Conflicting legacy format (@X-only, @skip-X) combined with new @browsers: format
   * - @browsers: tag with no valid browser names
   *
   * Validates: Requirements 3.4, 8.6
   */
  public validateBrowserTags(tags: string[]): { valid: boolean; error?: string } {
    // Check new @browsers: tag format first
    const browserListResult = TagParser.parseBrowserListTag(tags);
    if (!browserListResult.valid) {
      return {
        valid: false,
        error: browserListResult.error!,
      };
    }

    // If @browsers: tag is present and valid, no further legacy validation needed
    // (parseBrowserListTag already detects conflict with legacy tags)
    if (browserListResult.browsers.length > 0) {
      return { valid: true };
    }

    // Validate legacy tag format
    const { onlyBrowsers, skipBrowsers } = TagParser.parseBrowserFilterTags(tags);

    // Check for multiple different @X-only tags
    if (onlyBrowsers.length > 1) {
      return {
        valid: false,
        error: `Conflicting browser filter tags: multiple @*-only tags found (${onlyBrowsers.map(b => `@${b}-only`).join(', ')}). Only one @*-only tag is permitted per scenario.`,
      };
    }

    // Check for @X-only combined with @skip-X for the same browser
    if (onlyBrowsers.length === 1) {
      const onlyBrowser = onlyBrowsers[0];
      if (skipBrowsers.includes(onlyBrowser)) {
        return {
          valid: false,
          error: `Conflicting browser filter tags: @${onlyBrowser}-only combined with @skip-${onlyBrowser}. Cannot include and exclude the same browser.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Record a scenario result for a specific browser.
   * Initializes the BrowserRunResult entry if it does not exist.
   *
   * Validates: Requirements 5.2, 8.7
   */
  public recordResult(browser: string, result: ScenarioResult): void {
    if (!this.results.has(browser)) {
      this.results.set(browser, {
        browser: browser as 'chromium' | 'firefox' | 'webkit',
        totalScenarios: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        scenarioResults: [],
      });
    }

    const browserResult = this.results.get(browser)!;
    browserResult.scenarioResults.push(result);
    browserResult.totalScenarios += 1;
    browserResult.duration += result.duration;

    switch (result.status) {
      case 'passed':
        browserResult.passed += 1;
        break;
      case 'failed':
        browserResult.failed += 1;
        break;
      case 'skipped':
        browserResult.skipped += 1;
        break;
      case 'not_executed':
        // not_executed does not increment pass/fail/skipped
        break;
    }
  }

  /**
   * Return all collected results keyed by browser name.
   */
  public getResults(): Map<string, BrowserRunResult> {
    return this.results;
  }

  /**
   * Execute test suite across all configured browsers.
   *
   * - If `crossBrowser.parallel` is false: runs sequentially in order
   * - If `crossBrowser.parallel` is true: runs concurrently, limited by `maxParallel`
   * - Wraps each browser runner call with RetryManager.executeWithRetry()
   * - Records retry count in result metadata when scenario passes on retry
   * - Includes all attempt error messages when scenario exhausts retries
   * - Catches errors from individual browser runs (marks as skipped, logs error)
   * - If ALL browsers fail, throws an error
   *
   * Validates: Requirements 1.3, 1.4, 1.5, 5.2, 5.7, 6.1, 6.5, 6.6
   */
  public async executeCrossBrowser(
    runner: (browser: string) => Promise<BrowserRunResult>
  ): Promise<Map<string, BrowserRunResult>> {
    const browsers = this.getBrowsers();
    const failedBrowsers: string[] = [];

    if (this.config.crossBrowser.parallel) {
      await this.executeParallel(browsers, runner, failedBrowsers);
    } else {
      await this.executeSequential(browsers, runner, failedBrowsers);
    }

    // If ALL browsers failed, throw an error
    if (failedBrowsers.length === browsers.length) {
      const errorMsg = `All configured browsers failed to execute: ${failedBrowsers.join(', ')}. No test results available.`;
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    return this.results;
  }

  /**
   * Create a RetryManager configured for a specific browser.
   * Uses per-browser retry count from FrameworkConfig.crossBrowser.retryCounts,
   * falling back to the global retryCount.
   */
  private createRetryManager(browser: string): RetryManager {
    const maxRetries = this.config.crossBrowser.retryCounts[browser] ?? this.config.retryCount;
    const retryDelay = 2000; // Default retry delay as per design spec

    const retryConfig: RetryConfig = {
      maxRetries,
      retryDelay,
      retryOnlyOnLaunchFailure: false,
    };

    return new RetryManager(retryConfig);
  }

  /**
   * Execute browsers sequentially in the order listed.
   * Each browser execution is wrapped with RetryManager for retry logic.
   *
   * Validates: Requirements 1.3, 1.4, 1.5
   */
  private async executeSequential(
    browsers: Array<'chromium' | 'firefox' | 'webkit'>,
    runner: (browser: string) => Promise<BrowserRunResult>,
    failedBrowsers: string[]
  ): Promise<void> {
    for (const browser of browsers) {
      const retryManager = this.createRetryManager(browser);
      const attemptErrors: string[] = [];

      try {
        Logger.info(`[CrossBrowserManager] Starting sequential run on ${browser}`);

        // Wrap the runner with retry logic, collecting errors from each attempt
        const result = await retryManager.executeWithRetry(browser, async (b) => {
          try {
            return await runner(b);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            attemptErrors.push(errorMessage);
            throw error;
          }
        });

        // Record retry count in metadata if scenario passed on retry
        if (attemptErrors.length > 0) {
          result.metadata = {
            ...result.metadata,
            retryAttempts: attemptErrors.length,
          };
        }

        this.results.set(browser, result);
        Logger.info(
          `[CrossBrowserManager] Completed ${browser}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped` +
          (attemptErrors.length > 0 ? ` (succeeded after ${attemptErrors.length} retry attempt(s))` : '')
        );
      } catch (error: unknown) {
        failedBrowsers.push(browser);
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(
          `[CrossBrowserManager] Browser ${browser} failed after exhausting all retries: ${errorMessage}`
        );

        // Include all attempt error messages in the failed result
        const skippedResult = this.createSkippedResult(browser, errorMessage);
        skippedResult.metadata = {
          retryAttempts: attemptErrors.length,
          attemptErrors,
        };
        this.results.set(browser, skippedResult);
      }
    }
  }

  /**
   * Execute browsers in parallel, respecting maxParallel concurrency limit.
   * Each browser execution is wrapped with RetryManager for retry logic.
   *
   * Validates: Requirements 1.3, 1.4, 1.5
   */
  private async executeParallel(
    browsers: Array<'chromium' | 'firefox' | 'webkit'>,
    runner: (browser: string) => Promise<BrowserRunResult>,
    failedBrowsers: string[]
  ): Promise<void> {
    const maxParallel = this.config.crossBrowser.maxParallel;

    Logger.info(
      `[CrossBrowserManager] Starting parallel run on ${browsers.length} browsers (maxParallel: ${maxParallel})`
    );

    // Process browsers in batches of maxParallel
    for (let i = 0; i < browsers.length; i += maxParallel) {
      const batch = browsers.slice(i, i + maxParallel);
      const batchResults = await Promise.allSettled(
        batch.map(async (browser) => {
          const retryManager = this.createRetryManager(browser);
          const attemptErrors: string[] = [];

          Logger.info(`[CrossBrowserManager] Launching parallel run on ${browser}`);

          // Wrap the runner with retry logic, collecting errors from each attempt
          const result = await retryManager.executeWithRetry(browser, async (b) => {
            try {
              return await runner(b);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              attemptErrors.push(errorMessage);
              throw error;
            }
          });

          // Record retry count in metadata if scenario passed on retry
          if (attemptErrors.length > 0) {
            result.metadata = {
              ...result.metadata,
              retryAttempts: attemptErrors.length,
            };
          }

          return { browser, result, attemptErrors };
        })
      );

      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          const { browser, result, attemptErrors } = settledResult.value;
          this.results.set(browser, result);
          Logger.info(
            `[CrossBrowserManager] Completed ${browser}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped` +
            (attemptErrors.length > 0 ? ` (succeeded after ${attemptErrors.length} retry attempt(s))` : '')
          );
        } else {
          // Extract the browser name from the rejected promise
          const batchIndex = batchResults.indexOf(settledResult);
          const browser = batch[batchIndex];
          failedBrowsers.push(browser);
          const errorMessage =
            settledResult.reason instanceof Error
              ? settledResult.reason.message
              : String(settledResult.reason);

          // Collect attempt errors from the rejection context
          // The RetryManager throws the last error after exhausting retries
          const attemptErrors = settledResult.reason?.attemptErrors || [errorMessage];

          Logger.error(
            `[CrossBrowserManager] Browser ${browser} failed after exhausting all retries: ${errorMessage}`
          );

          const skippedResult = this.createSkippedResult(browser, errorMessage);
          skippedResult.metadata = {
            retryAttempts: Array.isArray(attemptErrors) ? attemptErrors.length : 0,
            attemptErrors: Array.isArray(attemptErrors) ? attemptErrors : [errorMessage],
          };
          this.results.set(browser, skippedResult);
        }
      }
    }
  }

  /**
   * Create a BrowserRunResult with all scenarios marked as skipped
   * due to browser launch failure.
   */
  private createSkippedResult(browser: string, errorMessage: string): BrowserRunResult {
    return {
      browser: browser as 'chromium' | 'firefox' | 'webkit',
      totalScenarios: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      scenarioResults: [],
    };
  }
}
