import { FrameworkConfig } from '../config/FrameworkConfig';
import { CrossBrowserManager, BrowserRunResult } from './CrossBrowserManager';
import { CrossBrowserReportGenerator } from './CrossBrowserReportGenerator';
import { ReportLinker } from './ReportLinker';
import { Logger } from '../utils/Logger';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { ArtifactPathResolver } from './ArtifactPathResolver';

/**
 * Configuration passed to the runner function for each browser execution.
 * Contains browser-specific settings resolved from FrameworkConfig.
 */
export interface BrowserExecutionConfig {
  /** The browser engine to execute on */
  browser: 'chromium' | 'firefox' | 'webkit';
  /** Viewport dimensions for this browser (browser-specific or global default) */
  viewport: { width: number; height: number };
  /** Whether to run headless for this browser */
  headless: boolean;
  /** Browser-specific launch arguments */
  args: string[];
  /** Whether this is a parallel execution context */
  isParallel: boolean;
}

/**
 * Options for configuring the CrossBrowserRunner behavior.
 */
export interface CrossBrowserRunnerOptions {
  /** Custom output directory for the cross-browser report */
  reportOutputDir?: string;
  /** Custom runner function to execute tests for a specific browser */
  runnerFn?: (config: BrowserExecutionConfig) => Promise<BrowserRunResult>;
  /** Whether to capture screenshots at viewport breakpoints per browser */
  captureBreakpointScreenshots?: boolean;
}

/** Default output path for the consolidated cross-browser report */
const DEFAULT_REPORT_OUTPUT = path.resolve('reports', 'cross-browser', 'cross-browser-report.html');

/**
 * CrossBrowserRunner — Entry point for orchestrating cross-browser test execution.
 *
 * Reads FrameworkConfig to determine which browsers to run against, resolves
 * browser-specific configuration (viewport, headless, args), executes the test
 * suite per browser (sequential or parallel via CrossBrowserManager), and
 * generates a consolidated cross-browser HTML report.
 *
 * Validates: Requirements 5.2, 5.6, 6.1, 6.3, 7.2, 7.4, 9.1, 9.4, 9.5
 */
export class CrossBrowserRunner {
  private config: FrameworkConfig;
  private manager: CrossBrowserManager;
  private reportGenerator: CrossBrowserReportGenerator;
  private options: CrossBrowserRunnerOptions;
  private reportOutputPath: string;

  constructor(options?: CrossBrowserRunnerOptions) {
    this.config = FrameworkConfig.getInstance();
    this.manager = new CrossBrowserManager(this.config);
    this.reportGenerator = new CrossBrowserReportGenerator();
    this.options = options || {};
    this.reportOutputPath = this.options.reportOutputDir
      ? path.resolve(this.options.reportOutputDir, 'cross-browser-report.html')
      : DEFAULT_REPORT_OUTPUT;
  }

  /**
   * Check if cross-browser execution is needed.
   * Returns true only when multiple browsers are configured.
   *
   * Validates: Requirement 5.2
   */
  public shouldRunCrossBrowser(): boolean {
    return this.config.crossBrowser.browsers.length > 1;
  }

  /**
   * Get the list of configured browsers.
   */
  public getBrowsers(): Array<'chromium' | 'firefox' | 'webkit'> {
    return this.config.crossBrowser.browsers;
  }

  /**
   * Resolve browser-specific execution configuration for a given browser engine.
   * Merges global defaults with browser-specific overrides from FrameworkConfig.
   *
   * Validates: Requirements 7.2, 7.4
   */
  public resolveBrowserConfig(browser: 'chromium' | 'firefox' | 'webkit'): BrowserExecutionConfig {
    const globalViewport = { width: 1280, height: 720 };
    const browserViewport = this.config.crossBrowser.browserViewports[browser];
    const viewport = browserViewport || globalViewport;

    const browserHeadless = this.config.crossBrowser.browserHeadless[browser];
    const headless = browserHeadless !== undefined ? browserHeadless : this.config.headless;

    const args = this.config.crossBrowser.browserArgs[browser] || [];

    return {
      browser,
      viewport,
      headless,
      args,
      isParallel: this.config.crossBrowser.parallel,
    };
  }

  /**
   * Execute the test suite across all configured browsers.
   *
   * Flow:
   * 1. If only 1 browser configured, skip cross-browser orchestration (log info)
   * 2. If multiple browsers, delegate to CrossBrowserManager.executeCrossBrowser()
   * 3. The runner function resolves browser-specific config and invokes tests
   * 4. After all runs complete, generate consolidated report
   *
   * Validates: Requirements 5.2, 5.6, 6.1, 6.3, 9.1, 9.4, 9.5
   */
  public async run(): Promise<Map<string, BrowserRunResult>> {
    const browsers = this.getBrowsers();
    const startTime = Date.now();

    Logger.info(`[CrossBrowserRunner] Starting cross-browser execution`);
    Logger.info(
      `[CrossBrowserRunner] Browsers: ${browsers.join(', ')} | Parallel: ${this.config.crossBrowser.parallel}`
    );

    if (!this.shouldRunCrossBrowser()) {
      Logger.info(
        `[CrossBrowserRunner] Single browser configured (${browsers[0]}). No cross-browser orchestration needed.`
      );
      // Execute single browser run and return results
      const singleResult = await this.executeSingleBrowser(browsers[0]);
      const results = new Map<string, BrowserRunResult>();
      results.set(browsers[0], singleResult);
      return results;
    }

    // Execute across multiple browsers via CrossBrowserManager
    const runnerFn = this.options.runnerFn || this.defaultRunnerFn.bind(this);

    const results = await this.manager.executeCrossBrowser(async (browser: string) => {
      const browserName = browser as 'chromium' | 'firefox' | 'webkit';
      const browserConfig = this.resolveBrowserConfig(browserName);

      Logger.info(
        `[CrossBrowserRunner] Executing on ${browserName} ` +
        `(viewport: ${browserConfig.viewport.width}x${browserConfig.viewport.height}, ` +
        `headless: ${browserConfig.headless})`
      );

      return runnerFn(browserConfig);
    });

    // Merge per-browser reports from isolated parallel directories (Requirement 7.3)
    if (this.config.crossBrowser.parallel) {
      this.mergeParallelReports(results);
    }

    // Ensure cross-browser report output directory exists
    ArtifactPathResolver.ensureDir(path.dirname(this.reportOutputPath));

    // Generate consolidated cross-browser report
    this.generateReport(results);

    // Link cross-browser report from the main Cucumber HTML report
    ReportLinker.linkCrossBrowserReport('reports/html/cucumber-report.html', this.reportOutputPath);

    const elapsed = Date.now() - startTime;
    Logger.info(
      `[CrossBrowserRunner] Cross-browser execution completed in ${elapsed}ms. ` +
      `Report: ${this.reportOutputPath}`
    );

    // Print CLI summary table
    this.printCliSummary(results, elapsed);

    return results;
  }

  /**
   * Execute a single browser run (no cross-browser orchestration).
   * Used when only one browser is configured.
   */
  private async executeSingleBrowser(
    browser: 'chromium' | 'firefox' | 'webkit'
  ): Promise<BrowserRunResult> {
    const browserConfig = this.resolveBrowserConfig(browser);
    const runnerFn = this.options.runnerFn || this.defaultRunnerFn.bind(this);
    return runnerFn(browserConfig);
  }

  /**
   * Generate the consolidated cross-browser HTML report.
   * Invokes CrossBrowserReportGenerator.generate() with collected results.
   *
   * Validates: Requirements 9.4, 9.5
   */
  private generateReport(results: Map<string, BrowserRunResult>): void {
    try {
      this.reportGenerator.generate(results, this.reportOutputPath);
      Logger.info(
        `[CrossBrowserRunner] Consolidated report generated at: ${this.reportOutputPath}`
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(
        `[CrossBrowserRunner] Failed to generate cross-browser report: ${errorMsg}`
      );
    }
  }

  /**
   * Default runner function that spawns a child process to execute Cucumber
   * with browser-specific environment variables.
   *
   * The child process receives:
   * - CROSS_BROWSER_TARGET: the browser engine name
   * - CROSS_BROWSER_VIEWPORT: viewport as WIDTHxHEIGHT
   * - CROSS_BROWSER_HEADLESS: "true" or "false"
   * - CROSS_BROWSER_ARGS: comma-separated launch args
   *
   * Applies per-browser execution timeout from FrameworkConfig. If the timeout
   * is reached, the child process is killed and all pending scenarios are
   * recorded as 'not_executed' with a timeout error message.
   *
   * This allows hooks and ContextManager to pick up the active browser config.
   *
   * Validates: Requirements 5.6, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1
   */
  private async defaultRunnerFn(config: BrowserExecutionConfig): Promise<BrowserRunResult> {
    const startTime = Date.now();

    // Read per-browser execution timeout (default 300000ms / 5 minutes)
    const executionTimeout = this.config.crossBrowser.executionTimeouts[config.browser] || 300000;

    // Determine output directory based on parallel mode (Requirement 7.1, 7.2)
    const timestamp = Date.now();
    const isolatedOutputDir = config.isParallel
      ? path.resolve('reports', `${config.browser}-${timestamp}`)
      : undefined;

    // Determine JSON report output path
    const jsonReportDir = isolatedOutputDir
      ? path.join(isolatedOutputDir, 'cucumber-json')
      : path.resolve('reports', 'cucumber-json');
    const jsonReportFilename = `${config.browser}-cucumber-report.json`;
    const jsonReportPath = path.join(jsonReportDir, jsonReportFilename);

    // Ensure output directories exist (both parallel and sequential modes)
    ArtifactPathResolver.ensureDir(jsonReportDir);
    if (isolatedOutputDir) {
      ArtifactPathResolver.ensureDir(isolatedOutputDir);
      Logger.info(
        `[CrossBrowserRunner] Parallel isolation: ${config.browser} output → ${isolatedOutputDir}`
      );
    }

    // Set isolated environment variables per browser child process (Requirement 7.4)
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      CROSS_BROWSER_TARGET: config.browser,
      CROSS_BROWSER_VIEWPORT: `${config.viewport.width}x${config.viewport.height}`,
      CROSS_BROWSER_HEADLESS: String(config.headless),
      CROSS_BROWSER_ARGS: config.args.join(','),
    };

    // When parallel, set isolated output dir env vars to prevent cross-contamination
    if (isolatedOutputDir) {
      env.CROSS_BROWSER_OUTPUT_DIR = isolatedOutputDir;
      env.CROSS_BROWSER_PARALLEL_MODE = 'true';
      // Isolate screenshot/video/log paths per browser process
      env.CROSS_BROWSER_SCREENSHOTS_DIR = path.join(isolatedOutputDir, 'screenshots');
      env.CROSS_BROWSER_VIDEOS_DIR = path.join(isolatedOutputDir, 'videos');
      env.CROSS_BROWSER_LOGS_DIR = path.join(isolatedOutputDir, 'logs');
    }

    if (this.options.captureBreakpointScreenshots) {
      env.CROSS_BROWSER_CAPTURE_SCREENSHOTS = 'true';
    }

    return new Promise<BrowserRunResult>((resolve, reject) => {
      let timedOut = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      // Use relative path for JSON output to avoid issues with spaces/special chars in absolute paths
      const relativeJsonPath = path.relative(process.cwd(), jsonReportPath).replace(/\\/g, '/');

      const cucumberProcess = spawn(
        'npx',
        ['cucumber-js', '--format', `json:"${relativeJsonPath}"`],
        {
          env,
          cwd: process.cwd(),
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      let stdout = '';
      let stderr = '';

      cucumberProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      cucumberProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Set up execution timeout enforcement (Requirement 6.3, 6.4)
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        Logger.warn(
          `[CrossBrowserRunner] Browser ${config.browser} exceeded execution timeout of ${executionTimeout}ms. Terminating process.`
        );

        // Kill the child process tree
        try {
          cucumberProcess.kill();
        } catch (killError: unknown) {
          // Process may have already exited
          Logger.warn(
            `[CrossBrowserRunner] Failed to kill process for ${config.browser}: ${killError instanceof Error ? killError.message : String(killError)}`
          );
        }
      }, executionTimeout);

      cucumberProcess.on('close', (code: number | null) => {
        // Clear the timeout since the process has ended
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        const duration = Date.now() - startTime;

        // If the process was killed due to timeout, resolve with not_executed result
        if (timedOut) {
          const timeoutResult = this.createTimeoutResult(config.browser, duration, executionTimeout, jsonReportPath);
          resolve(timeoutResult);
          return;
        }

        if (code === null) {
          reject(new Error(`Cucumber process for ${config.browser} was killed`));
          return;
        }

        // Parse results from isolated JSON report
        const result = this.parseResultsFromJson(config.browser, jsonReportPath, duration);
        resolve(result);
      });

      cucumberProcess.on('error', (error: Error) => {
        // Clear the timeout on error
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        reject(
          new Error(
            `Failed to launch Cucumber process for ${config.browser}: ${error.message}`
          )
        );
      });
    });
  }

  /**
   * Create a BrowserRunResult representing a timeout termination.
   * All pending scenarios are recorded as 'not_executed' with a timeout error message.
   *
   * Validates: Requirements 6.3, 6.4
   */
  private createTimeoutResult(
    browser: string,
    duration: number,
    timeoutMs: number,
    jsonReportPath?: string
  ): BrowserRunResult {
    const errorMessage = `Browser execution timed out after ${timeoutMs}ms. Process was terminated.`;

    // Attempt to read any partial results from JSON report
    const reportPath = jsonReportPath || path.resolve(
      'reports', 'cucumber-json', `${browser}-cucumber-report.json`
    );

    let partialResult: BrowserRunResult | undefined;
    if (fs.existsSync(reportPath)) {
      try {
        partialResult = this.parseResultsFromJson(browser, reportPath, duration);
      } catch {
        // Ignore parse errors for partial results
      }
    }

    // If we have partial results, mark any remaining scenarios as not_executed
    if (partialResult && partialResult.scenarioResults.length > 0) {
      // Add a timeout indicator scenario to signal the timeout occurred
      partialResult.scenarioResults.push({
        name: '[Timeout] Remaining scenarios not executed',
        featureFile: '',
        status: 'not_executed',
        duration: 0,
        errorMessage,
      });
      partialResult.totalScenarios += 1;
      return partialResult;
    }

    // No partial results — return a result indicating all scenarios timed out
    return {
      browser: browser as 'chromium' | 'firefox' | 'webkit',
      totalScenarios: 1,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      scenarioResults: [
        {
          name: '[Timeout] All scenarios not executed',
          featureFile: '',
          status: 'not_executed',
          duration: 0,
          errorMessage,
        },
      ],
    };
  }

  /**
   * Parse Cucumber JSON report output into a BrowserRunResult.
   * Falls back to an empty result if the JSON file is not available.
   */
  private parseResultsFromJson(
    browser: string,
    jsonPath: string,
    duration: number
  ): BrowserRunResult {
    const result: BrowserRunResult = {
      browser: browser as 'chromium' | 'firefox' | 'webkit',
      totalScenarios: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      scenarioResults: [],
    };

    if (!fs.existsSync(jsonPath)) {
      Logger.warn(
        `[CrossBrowserRunner] JSON report not found for ${browser} at ${jsonPath}. ` +
        `Returning empty result.`
      );
      return result;
    }

    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const features = JSON.parse(jsonContent);

      for (const feature of features) {
        if (!feature.elements) continue;

        for (const element of feature.elements) {
          if (element.type !== 'scenario') continue;

          const scenarioName = element.name || 'Unnamed Scenario';
          const featureFile = feature.uri || '';

          // Determine scenario status from steps
          let scenarioStatus: 'passed' | 'failed' | 'skipped' = 'passed';
          let scenarioDuration = 0;
          let errorMessage: string | undefined;

          if (element.steps) {
            for (const step of element.steps) {
              const stepResult = step.result;
              if (stepResult) {
                scenarioDuration += stepResult.duration || 0;

                if (stepResult.status === 'failed') {
                  scenarioStatus = 'failed';
                  errorMessage = stepResult.error_message || 'Step failed';
                } else if (stepResult.status === 'skipped' && scenarioStatus !== 'failed') {
                  scenarioStatus = 'skipped';
                }
              }
            }
          }

          result.scenarioResults.push({
            name: scenarioName,
            featureFile,
            status: scenarioStatus,
            duration: scenarioDuration,
            errorMessage,
          });

          result.totalScenarios += 1;
          switch (scenarioStatus) {
            case 'passed':
              result.passed += 1;
              break;
            case 'failed':
              result.failed += 1;
              break;
            case 'skipped':
              result.skipped += 1;
              break;
          }
        }
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(
        `[CrossBrowserRunner] Failed to parse JSON report for ${browser}: ${errorMsg}`
      );
    }

    return result;
  }

  /**
   * Print a formatted CLI summary table after cross-browser execution completes.
   * Includes per-browser pass/fail/skip counts, pass rates, browser-specific failures,
   * total execution time, and path to the generated HTML report.
   *
   * Uses ANSI color codes when the terminal supports them (detected via process.stdout.isTTY).
   *
   * Returns true if any failures exist (used for exit code determination).
   *
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  public printCliSummary(results: Map<string, BrowserRunResult>, elapsed: number): boolean {
    const useColors = Boolean(process.stdout.isTTY);

    // ANSI color helpers
    const green = (text: string) => useColors ? `\x1b[32m${text}\x1b[0m` : text;
    const red = (text: string) => useColors ? `\x1b[31m${text}\x1b[0m` : text;
    const yellow = (text: string) => useColors ? `\x1b[33m${text}\x1b[0m` : text;
    const bold = (text: string) => useColors ? `\x1b[1m${text}\x1b[0m` : text;
    const dim = (text: string) => useColors ? `\x1b[2m${text}\x1b[0m` : text;

    // Header
    console.log('');
    console.log(bold('═══════════════════════════════════════════════════════════════════'));
    console.log(bold('  Cross-Browser Execution Summary'));
    console.log(bold('═══════════════════════════════════════════════════════════════════'));
    console.log('');

    // Table header
    const header = '  Browser     │ Total │ Passed │ Failed │ Skipped │ Pass Rate';
    const separator = '  ────────────┼───────┼────────┼────────┼─────────┼──────────';
    console.log(dim(header));
    console.log(dim(separator));

    // Table rows
    let totalFailed = 0;
    let totalPassed = 0;
    let totalSkipped = 0;
    let totalScenarios = 0;

    for (const [browser, result] of results) {
      totalFailed += result.failed;
      totalPassed += result.passed;
      totalSkipped += result.skipped;
      totalScenarios += result.totalScenarios;

      const passRate = result.totalScenarios > 0
        ? ((result.passed / result.totalScenarios) * 100).toFixed(1)
        : '0.0';

      const browserCol = browser.padEnd(10);
      const totalCol = String(result.totalScenarios).padStart(5);
      const passedCol = green(String(result.passed).padStart(6));
      const failedCol = result.failed > 0
        ? red(String(result.failed).padStart(6))
        : String(result.failed).padStart(6);
      const skippedCol = result.skipped > 0
        ? yellow(String(result.skipped).padStart(7))
        : String(result.skipped).padStart(7);
      const rateCol = result.failed > 0
        ? red(`${passRate}%`.padStart(8))
        : green(`${passRate}%`.padStart(8));

      console.log(`  ${browserCol} │${totalCol} │${passedCol} │${failedCol} │${skippedCol} │${rateCol}`);
    }

    console.log('');

    // Browser-specific failures
    const browserSpecificFailures = this.reportGenerator.identifyBrowserSpecificFailures(results);
    if (browserSpecificFailures.length > 0) {
      console.log(red(bold('  ⚠ Browser-Specific Failures Detected:')));
      for (const scenarioName of browserSpecificFailures) {
        console.log(red(`    • ${scenarioName}`));
      }
      console.log('');
    }

    // Total execution time
    const seconds = (elapsed / 1000).toFixed(2);
    console.log(`  ${dim('Total execution time:')} ${bold(seconds + 's')}`);
    console.log(`  ${dim('HTML report:')} ${this.reportOutputPath}`);
    console.log('');

    // Success/failure indicator
    const hasFailures = totalFailed > 0;
    if (hasFailures) {
      console.log(red(bold(`  ✗ ${totalFailed} scenario(s) failed across ${results.size} browser(s)`)));
    } else {
      console.log(green(bold(`  ✓ All ${totalScenarios} scenario(s) passed across ${results.size} browser(s)`)));
    }

    console.log(bold('═══════════════════════════════════════════════════════════════════'));
    console.log('');

    return hasFailures;
  }

  /**
   * Merge per-browser reports from isolated parallel output directories
   * into the consolidated cross-browser report.
   *
   * Reads individual browser JSON reports from their isolated directories
   * (reports/<browser>-<timestamp>/cucumber-json/) and copies them into the
   * shared reports/cucumber-json/ directory for the report generator to consume.
   *
   * Validates: Requirements 7.3, 7.5
   */
  public mergeParallelReports(results: Map<string, BrowserRunResult>): void {
    if (!this.config.crossBrowser.parallel) {
      return;
    }

    const reportsBaseDir = path.resolve('reports');
    const consolidatedJsonDir = path.resolve('reports', 'cucumber-json');
    ArtifactPathResolver.ensureDir(consolidatedJsonDir);

    try {
      // Find all browser-timestamped directories
      const entries = fs.readdirSync(reportsBaseDir, { withFileTypes: true });
      const browserDirs = entries.filter((entry) => {
        if (!entry.isDirectory()) return false;
        // Match pattern: <browser>-<timestamp>
        return /^(chromium|firefox|webkit)-\d+$/.test(entry.name);
      });

      for (const dir of browserDirs) {
        const browserJsonDir = path.join(reportsBaseDir, dir.name, 'cucumber-json');
        if (!fs.existsSync(browserJsonDir)) continue;

        const jsonFiles = fs.readdirSync(browserJsonDir).filter((f) => f.endsWith('.json'));

        for (const jsonFile of jsonFiles) {
          const sourcePath = path.join(browserJsonDir, jsonFile);
          const destPath = path.join(consolidatedJsonDir, jsonFile);

          try {
            const content = fs.readFileSync(sourcePath, 'utf-8');
            fs.writeFileSync(destPath, content, 'utf-8');
            Logger.debug(
              `[CrossBrowserRunner] Merged parallel report: ${sourcePath} → ${destPath}`
            );
          } catch (copyError: unknown) {
            const errMsg = copyError instanceof Error ? copyError.message : String(copyError);
            Logger.warn(
              `[CrossBrowserRunner] Failed to merge report ${sourcePath}: ${errMsg}`
            );
          }
        }
      }

      Logger.info(
        `[CrossBrowserRunner] Merged ${browserDirs.length} parallel browser report(s) into ${consolidatedJsonDir}`
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(
        `[CrossBrowserRunner] Failed to merge parallel reports: ${errorMsg}`
      );
    }
  }

  /**
   * Get the CrossBrowserManager instance for external use (e.g., hooks, tag filtering).
   */
  public getManager(): CrossBrowserManager {
    return this.manager;
  }

  /**
   * Get the report output path.
   */
  public getReportOutputPath(): string {
    return this.reportOutputPath;
  }
}

// ─── Standalone Entry Point ──────────────────────────────────────────────────
// Allow running as: npx ts-node src/core/CrossBrowserRunner.ts
if (require.main === module) {
  const runner = new CrossBrowserRunner();

  if (!runner.shouldRunCrossBrowser()) {
    console.log(
      `[CrossBrowserRunner] Only one browser configured (${runner.getBrowsers()[0]}). ` +
      `Cross-browser execution is not needed. Use standard 'npm test' instead.`
    );
    process.exit(0);
  }

  console.log(`[CrossBrowserRunner] Starting cross-browser test execution...`);
  console.log(`[CrossBrowserRunner] Browsers: ${runner.getBrowsers().join(', ')}`);

  runner
    .run()
    .then((results) => {
      const startTime = Date.now();
      // Calculate total elapsed from results durations
      let maxDuration = 0;
      let totalFailed = 0;
      for (const [, result] of results) {
        maxDuration = Math.max(maxDuration, result.duration);
        totalFailed += result.failed;
      }

      // printCliSummary is already called from run(), use exit code
      process.exit(totalFailed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error(`[CrossBrowserRunner] Fatal error: ${error.message}`);
      process.exit(1);
    });
}
