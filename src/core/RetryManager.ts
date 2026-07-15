import { BrowserRunResult } from './CrossBrowserManager';
import { Logger } from '../utils/Logger';

/**
 * Configuration for browser-specific retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retries after the initial attempt. Total attempts = maxRetries + 1. */
  maxRetries: number;
  /** Base delay in milliseconds between retries. Exponential backoff: retryDelay * 2^(attempt-1). */
  retryDelay: number;
  /** When true, only retry if the error indicates a browser launch failure. */
  retryOnlyOnLaunchFailure: boolean;
}

/**
 * RetryManager — Wraps individual browser executions with configurable retry logic.
 * Retries failed browser runs up to N times with exponential backoff before
 * marking a browser as failed.
 *
 * Validates: Requirements 1.3, 1.4, 1.5
 */
export class RetryManager {
  private readonly config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Execute a browser run with retry logic.
   * Retries up to maxRetries times if the runner throws.
   * Uses exponential backoff: retryDelay * 2^(attempt-1) ms pause before each retry.
   *
   * @param browser - The browser engine name (e.g., 'chromium', 'firefox', 'webkit')
   * @param runner - The function that executes the test suite on the given browser
   * @returns The successful BrowserRunResult
   * @throws The last error encountered after exhausting all retry attempts
   */
  async executeWithRetry(
    browser: string,
    runner: (browser: string) => Promise<BrowserRunResult>
  ): Promise<BrowserRunResult> {
    const totalAttempts = this.config.maxRetries + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const result = await runner(browser);
        if (attempt > 1) {
          Logger.info(
            `[RetryManager] Browser "${browser}" succeeded on attempt ${attempt}/${totalAttempts}`
          );
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If retryOnlyOnLaunchFailure is set and error is not a launch failure, throw immediately
        if (this.config.retryOnlyOnLaunchFailure && !this.isLaunchError(lastError)) {
          Logger.warn(
            `[RetryManager] Browser "${browser}" failed on attempt ${attempt}/${totalAttempts} ` +
            `with non-launch error, not retrying: ${lastError.message}`
          );
          throw lastError;
        }

        // Log the retry attempt
        if (attempt < totalAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          Logger.warn(
            `[RetryManager] Browser "${browser}" failed on attempt ${attempt}/${totalAttempts}. ` +
            `Reason: ${lastError.message}. Retrying in ${delay}ms...`
          );
          await this.delay(delay);
        } else {
          Logger.error(
            `[RetryManager] Browser "${browser}" failed on final attempt ${attempt}/${totalAttempts}. ` +
            `Reason: ${lastError.message}. No more retries.`
          );
        }
      }
    }

    // All attempts exhausted — throw the last error
    throw lastError!;
  }

  /**
   * Calculate exponential backoff delay: retryDelay * 2^(attempt-1)
   * attempt=1 means first retry, so delay = retryDelay * 2^0 = retryDelay
   */
  private calculateBackoffDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Determine if an error is a browser launch failure.
   * Launch errors typically contain keywords indicating the browser process couldn't start.
   */
  private isLaunchError(error: Error): boolean {
    const launchErrorPatterns = [
      'launch',
      'browser.*not.*found',
      'failed to launch',
      'could not start',
      'executable.*not.*exist',
      'ENOENT',
      'spawn',
      'timed out.*launching',
    ];
    const message = error.message.toLowerCase();
    return launchErrorPatterns.some((pattern) => new RegExp(pattern, 'i').test(message));
  }

  /**
   * Pause execution for the specified number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
