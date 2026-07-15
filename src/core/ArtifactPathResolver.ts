import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../utils/Logger';

/**
 * ArtifactPathResolver — Generates browser-namespaced file paths for screenshots,
 * videos, and other artifacts to prevent overwrites during cross-browser execution.
 *
 * When CROSS_BROWSER_TARGET env var is set (indicating a cross-browser child process),
 * inserts the browser name as a subdirectory in the artifact path. When not set,
 * uses a flat path structure (normal mode).
 *
 * Normal mode path:        reports/{type}/{filename}
 * Cross-browser mode path: reports/{type}/{browser}/{filename}
 *
 * Validates: Requirements 7.1, 7.2
 */
export class ArtifactPathResolver {
  /** Base directory for all artifacts */
  private static readonly BASE_DIR = 'reports';

  /**
   * Resolve an artifact path with browser namespace.
   * When CROSS_BROWSER_TARGET is set, inserts the browser name into the path.
   * Ensures the parent directory exists before returning.
   *
   * @param artifactType - The artifact category (e.g., 'screenshots', 'videos', 'logs')
   * @param filename - The artifact filename (e.g., 'login-failure.png')
   * @returns The resolved filesystem path
   *
   * @example
   * // Normal mode (CROSS_BROWSER_TARGET not set):
   * ArtifactPathResolver.resolve('screenshots', 'login-failure.png')
   * // → 'reports/screenshots/login-failure.png'
   *
   * @example
   * // Cross-browser mode (CROSS_BROWSER_TARGET=chromium):
   * ArtifactPathResolver.resolve('screenshots', 'login-failure.png')
   * // → 'reports/screenshots/chromium/login-failure.png'
   */
  static resolve(artifactType: string, filename: string): string {
    const browser = ArtifactPathResolver.getCurrentBrowser();
    let resolvedPath: string;

    if (browser) {
      resolvedPath = path.join(ArtifactPathResolver.BASE_DIR, artifactType, browser, filename);
    } else {
      resolvedPath = path.join(ArtifactPathResolver.BASE_DIR, artifactType, filename);
    }

    // Ensure the parent directory exists
    const parentDir = path.dirname(resolvedPath);
    ArtifactPathResolver.ensureDir(parentDir);

    return resolvedPath;
  }

  /**
   * Get the current browser context from the CROSS_BROWSER_TARGET env var.
   * Returns undefined when not running in cross-browser mode.
   */
  static getCurrentBrowser(): string | undefined {
    return process.env.CROSS_BROWSER_TARGET || undefined;
  }

  /**
   * Ensure the specified directory exists, creating it recursively if missing.
   *
   * @param dirPath - The directory path to create
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.debug(`[ArtifactPathResolver] Created directory: ${dirPath}`);
    }
  }
}
