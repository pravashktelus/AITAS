import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

/**
 * Represents the result of a single scenario execution.
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
 * Represents the aggregated result of running the test suite on a single browser.
 */
export interface BrowserRunResult {
  browser: 'chromium' | 'firefox' | 'webkit';
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  scenarioResults: ScenarioResult[];
}

/**
 * Per-browser summary statistics for the cross-browser report.
 */
export interface BrowserSummary {
  browser: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: string;
}

/**
 * A single row in the cross-browser matrix view.
 */
export interface MatrixRow {
  scenarioName: string;
  featureFile: string;
  results: Record<string, 'passed' | 'failed' | 'skipped' | 'not_executed'>;
  hasBrowserSpecificFailure: boolean;
}

/**
 * The full cross-browser report data model.
 */
export interface CrossBrowserReport {
  runTimestamp: string;
  browsers: string[];
  matrix: MatrixRow[];
  summaries: BrowserSummary[];
}

/**
 * Represents a single historical summary entry loaded from the history directory.
 */
export interface HistoricalSummary {
  timestamp: string;
  browsers: string[];
  results: Record<string, { total: number; passed: number; failed: number; skipped: number }>;
  totalDuration: number;
  browserSpecificFailures: string[];
}

/**
 * Represents a persistent browser-specific issue detected across multiple consecutive runs.
 */
export interface PersistentIssue {
  scenarioName: string;
  consecutiveRuns: number;
}

/**
 * Generates a consolidated HTML report showing test results across all browser engines
 * in a matrix view, with per-browser statistics and browser-specific failure detection.
 */
export class CrossBrowserReportGenerator {
  /**
   * Generate a consolidated HTML cross-browser report.
   * @param results Map of browser name to BrowserRunResult
   * @param outputPath Path where the HTML report should be written
   */
  public generate(results: Map<string, BrowserRunResult>, outputPath: string): void {
    const startTime = Date.now();

    const browsers = Array.from(results.keys());
    const matrix = this.buildMatrix(results, browsers);
    const summaries = browsers.map((browser) => this.calculateSummary(results.get(browser)!));
    const browserSpecificFailures = this.identifyBrowserSpecificFailures(results);
    const runTimestamp = new Date().toISOString();

    const report: CrossBrowserReport = {
      runTimestamp,
      browsers,
      matrix,
      summaries,
    };

    const html = this.renderHtml(report, browserSpecificFailures);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html, 'utf-8');

    const elapsed = Date.now() - startTime;
    Logger.info(`Cross-browser report generated at ${outputPath} in ${elapsed}ms`);

    // Persist history summary for trend reporting
    this.persistHistorySummary(results, browserSpecificFailures);
  }

  /**
   * Persist a summary JSON file to reports/cross-browser/history/ for trend reporting.
   * The file is timestamped to allow historical comparison across runs.
   * @param results Map of browser name to BrowserRunResult
   * @param browserSpecificFailures Array of scenario names with browser-specific failures
   */
  public persistHistorySummary(results: Map<string, BrowserRunResult>, browserSpecificFailures: string[]): void {
    const historyDir = path.resolve('reports', 'cross-browser', 'history');

    // Create history directory if it does not exist
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const browsers = Array.from(results.keys());
    const resultsObj: Record<string, { total: number; passed: number; failed: number; skipped: number }> = {};
    let totalDuration = 0;

    for (const [browser, browserResult] of results) {
      resultsObj[browser] = {
        total: browserResult.totalScenarios,
        passed: browserResult.passed,
        failed: browserResult.failed,
        skipped: browserResult.skipped,
      };
      totalDuration += browserResult.duration;
    }

    const timestamp = new Date().toISOString();
    const summary = {
      timestamp,
      browsers,
      results: resultsObj,
      totalDuration,
      browserSpecificFailures,
    };

    // Use ISO timestamp in filename, replacing colons with dashes for filesystem compatibility
    const safeTimestamp = timestamp.replace(/:/g, '-');
    const filename = `summary-${safeTimestamp}.json`;
    const filePath = path.join(historyDir, filename);

    try {
      fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
      Logger.info(`Cross-browser history summary persisted at ${filePath}`);
    } catch (error) {
      Logger.warn(`Failed to persist cross-browser history summary: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate per-browser summary statistics.
   * @param result The browser run result to summarize
   * @returns BrowserSummary with total, passed, failed, skipped, and passRate
   */
  public calculateSummary(result: BrowserRunResult): BrowserSummary {
    const total = result.totalScenarios;
    const passed = result.passed;
    const failed = result.failed;
    const skipped = result.skipped;
    const passRate = total > 0 ? `${(passed / total * 100).toFixed(1)}%` : '0.0%';

    return {
      browser: result.browser,
      total,
      passed,
      failed,
      skipped,
      passRate,
    };
  }

  /**
   * Identify scenarios that have browser-specific failures: at least one 'passed'
   * and at least one 'failed' across different browsers.
   * @param results Map of browser name to BrowserRunResult
   * @returns Array of scenario names with browser-specific failures
   */
  public identifyBrowserSpecificFailures(results: Map<string, BrowserRunResult>): string[] {
    const scenarioStatuses = new Map<string, Set<string>>();

    for (const [, browserResult] of results) {
      for (const scenario of browserResult.scenarioResults) {
        if (!scenarioStatuses.has(scenario.name)) {
          scenarioStatuses.set(scenario.name, new Set());
        }
        scenarioStatuses.get(scenario.name)!.add(scenario.status);
      }
    }

    const browserSpecificFailures: string[] = [];
    for (const [scenarioName, statuses] of scenarioStatuses) {
      if (statuses.has('passed') && statuses.has('failed')) {
        browserSpecificFailures.push(scenarioName);
      }
    }

    return browserSpecificFailures;
  }

  /**
   * Read historical summary data from reports/cross-browser/history/ directory.
   * Returns the last 10 summary files sorted by timestamp (most recent last).
   * Handles gracefully if directory doesn't exist or has fewer than 10 files.
   */
  public readHistoricalData(): HistoricalSummary[] {
    const historyDir = path.resolve('reports', 'cross-browser', 'history');

    if (!fs.existsSync(historyDir)) {
      Logger.info('History directory does not exist. No historical data available for trends.');
      return [];
    }

    let files: string[];
    try {
      files = fs.readdirSync(historyDir)
        .filter((f) => f.startsWith('summary-') && f.endsWith('.json'))
        .sort(); // Lexicographic sort works because ISO timestamps sort correctly
    } catch (error) {
      Logger.warn(`Failed to read history directory: ${(error as Error).message}`);
      return [];
    }

    // Take the last 10 files (most recent)
    const recentFiles = files.slice(-10);

    const summaries: HistoricalSummary[] = [];
    for (const file of recentFiles) {
      const filePath = path.join(historyDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content) as HistoricalSummary;
        summaries.push(parsed);
      } catch (error) {
        Logger.warn(`Failed to parse historical summary file ${file}: ${(error as Error).message}`);
      }
    }

    return summaries;
  }

  /**
   * Detect scenarios that appear in browser-specific failures for 3 or more consecutive runs.
   * These are flagged as "persistent browser-specific issues".
   * @param historicalData Array of historical summaries (ordered chronologically)
   * @returns Array of PersistentIssue objects
   */
  public detectPersistentIssues(historicalData: HistoricalSummary[]): PersistentIssue[] {
    if (historicalData.length < 3) {
      return [];
    }

    // Track consecutive failure counts for each scenario
    const consecutiveCounts = new Map<string, number>();
    const maxConsecutive = new Map<string, number>();

    for (const summary of historicalData) {
      const currentFailures = new Set(summary.browserSpecificFailures || []);

      // For each scenario we're tracking, check if it's in this run's failures
      for (const [scenario, count] of consecutiveCounts) {
        if (currentFailures.has(scenario)) {
          consecutiveCounts.set(scenario, count + 1);
        } else {
          // Reset streak
          const currentMax = maxConsecutive.get(scenario) || 0;
          if (count > currentMax) {
            maxConsecutive.set(scenario, count);
          }
          consecutiveCounts.delete(scenario);
        }
      }

      // Add new scenarios from current failures that aren't being tracked
      for (const scenario of currentFailures) {
        if (!consecutiveCounts.has(scenario)) {
          consecutiveCounts.set(scenario, 1);
        }
      }
    }

    // Finalize: check remaining tracked scenarios
    for (const [scenario, count] of consecutiveCounts) {
      const currentMax = maxConsecutive.get(scenario) || 0;
      if (count > currentMax) {
        maxConsecutive.set(scenario, count);
      }
    }

    // Combine current streaks and historical max to find persistent issues
    const persistentIssues: PersistentIssue[] = [];
    const allScenarios = new Set([...consecutiveCounts.keys(), ...maxConsecutive.keys()]);

    for (const scenario of allScenarios) {
      // Use the current streak if still active, otherwise the max historical streak
      const currentStreak = consecutiveCounts.get(scenario) || 0;
      const historicalMax = maxConsecutive.get(scenario) || 0;
      const maxRuns = Math.max(currentStreak, historicalMax);

      if (maxRuns >= 3) {
        persistentIssues.push({
          scenarioName: scenario,
          consecutiveRuns: maxRuns,
        });
      }
    }

    // Sort by consecutive runs descending
    persistentIssues.sort((a, b) => b.consecutiveRuns - a.consecutiveRuns);

    return persistentIssues;
  }

  /**
   * Render the trend chart section as inline SVG showing pass rate per browser over last N runs.
   * Returns empty string if fewer than 2 historical data points are available.
   * @param historicalData Array of historical summaries (ordered chronologically)
   * @returns HTML string with the trend section
   */
  public renderTrendSection(historicalData: HistoricalSummary[]): string {
    if (historicalData.length < 2) {
      return `
    <div class="section">
      <h2>Trend Analysis</h2>
      <p class="no-data-message">Not enough historical data for trends. At least 2 runs are required.</p>
    </div>`;
    }

    // Collect all unique browsers across the historical data
    const allBrowsers = new Set<string>();
    for (const summary of historicalData) {
      for (const browser of summary.browsers) {
        allBrowsers.add(browser);
      }
    }
    const browsers = Array.from(allBrowsers).sort();

    // Calculate pass rates per browser per run
    const passRates: Record<string, number[]> = {};
    for (const browser of browsers) {
      passRates[browser] = [];
      for (const summary of historicalData) {
        const result = summary.results[browser];
        if (result && result.total > 0) {
          passRates[browser].push((result.passed / result.total) * 100);
        } else {
          passRates[browser].push(-1); // No data marker
        }
      }
    }

    // SVG dimensions
    const svgWidth = 700;
    const svgHeight = 300;
    const padding = { top: 30, right: 120, bottom: 50, left: 60 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const numPoints = historicalData.length;
    const xStep = numPoints > 1 ? chartWidth / (numPoints - 1) : 0;

    // Browser colors
    const browserColors: Record<string, string> = {
      chromium: '#4285F4',
      firefox: '#FF7139',
      webkit: '#9B59B6',
    };

    // Build SVG lines for each browser
    let svgLines = '';
    let svgDots = '';
    let legendItems = '';

    browsers.forEach((browser, browserIndex) => {
      const color = browserColors[browser] || `hsl(${browserIndex * 120}, 60%, 50%)`;
      const rates = passRates[browser];

      // Build polyline points (skip -1 data points)
      const points: string[] = [];
      for (let i = 0; i < rates.length; i++) {
        if (rates[i] >= 0) {
          const x = padding.left + i * xStep;
          const y = padding.top + chartHeight - (rates[i] / 100) * chartHeight;
          points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
      }

      if (points.length > 1) {
        svgLines += `      <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      }

      // Draw dots at each data point
      for (let i = 0; i < rates.length; i++) {
        if (rates[i] >= 0) {
          const x = padding.left + i * xStep;
          const y = padding.top + chartHeight - (rates[i] / 100) * chartHeight;
          svgDots += `      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="white" stroke-width="1.5"/>\n`;
        }
      }

      // Legend item
      const legendY = padding.top + browserIndex * 22;
      legendItems += `      <rect x="${svgWidth - padding.right + 15}" y="${legendY}" width="12" height="12" rx="2" fill="${color}"/>\n`;
      legendItems += `      <text x="${svgWidth - padding.right + 32}" y="${legendY + 10}" font-size="12" fill="#333">${this.escapeHtml(browser)}</text>\n`;
    });

    // Build Y-axis labels (0%, 25%, 50%, 75%, 100%)
    let yAxisLabels = '';
    for (let pct = 0; pct <= 100; pct += 25) {
      const y = padding.top + chartHeight - (pct / 100) * chartHeight;
      yAxisLabels += `      <text x="${padding.left - 10}" y="${y + 4}" font-size="11" fill="#666" text-anchor="end">${pct}%</text>\n`;
      yAxisLabels += `      <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e0e0e0" stroke-width="0.5" stroke-dasharray="4,4"/>\n`;
    }

    // Build X-axis labels (run numbers or dates)
    let xAxisLabels = '';
    for (let i = 0; i < numPoints; i++) {
      const x = padding.left + i * xStep;
      const label = historicalData[i].timestamp
        ? new Date(historicalData[i].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `Run ${i + 1}`;
      xAxisLabels += `      <text x="${x.toFixed(1)}" y="${svgHeight - 10}" font-size="10" fill="#666" text-anchor="middle">${this.escapeHtml(label)}</text>\n`;
    }

    const svg = `    <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="max-width: ${svgWidth}px;">
      <!-- Grid lines and Y-axis labels -->
${yAxisLabels}
      <!-- X-axis labels -->
${xAxisLabels}
      <!-- Axis lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#ccc" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#ccc" stroke-width="1"/>
      <!-- Data lines -->
${svgLines}
      <!-- Data points -->
${svgDots}
      <!-- Legend -->
${legendItems}
    </svg>`;

    // Detect persistent issues
    const persistentIssues = this.detectPersistentIssues(historicalData);
    let persistentIssuesHtml = '';

    if (persistentIssues.length > 0) {
      const issueRows = persistentIssues.map((issue) => `
            <tr>
              <td>⚠️ ${this.escapeHtml(issue.scenarioName)}</td>
              <td><strong>${issue.consecutiveRuns}</strong> consecutive runs</td>
            </tr>`).join('\n');

      persistentIssuesHtml = `
      <div class="persistent-issues-warning">
        <h3>⚠ Persistent Browser-Specific Issues</h3>
        <p>The following scenarios have appeared in browser-specific failures for 3 or more consecutive runs:</p>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Consecutive Failures</th>
            </tr>
          </thead>
          <tbody>
${issueRows}
          </tbody>
        </table>
      </div>`;
    }

    return `
    <div class="section">
      <h2>Trend Analysis</h2>
      <p class="summary-count">Pass rate per browser over the last ${historicalData.length} run(s)</p>
${svg}
${persistentIssuesHtml}
    </div>`;
  }

  /**
   * Build the matrix of scenario results across all browsers.
   */
  private buildMatrix(results: Map<string, BrowserRunResult>, browsers: string[]): MatrixRow[] {
    // Collect all unique scenarios (preserving order of first appearance)
    const scenarioMap = new Map<string, { featureFile: string }>();

    for (const [, browserResult] of results) {
      for (const scenario of browserResult.scenarioResults) {
        if (!scenarioMap.has(scenario.name)) {
          scenarioMap.set(scenario.name, { featureFile: scenario.featureFile });
        }
      }
    }

    // Build rows
    const matrix: MatrixRow[] = [];
    for (const [scenarioName, meta] of scenarioMap) {
      const resultsByBrowser: Record<string, 'passed' | 'failed' | 'skipped' | 'not_executed'> = {};

      for (const browser of browsers) {
        const browserResult = results.get(browser);
        if (!browserResult) {
          resultsByBrowser[browser] = 'not_executed';
          continue;
        }

        const scenarioResult = browserResult.scenarioResults.find((s) => s.name === scenarioName);
        resultsByBrowser[browser] = scenarioResult ? scenarioResult.status : 'not_executed';
      }

      // A row has a browser-specific failure if at least one browser passed and one failed
      const statuses = Object.values(resultsByBrowser);
      const hasBrowserSpecificFailure = statuses.includes('passed') && statuses.includes('failed');

      matrix.push({
        scenarioName,
        featureFile: meta.featureFile,
        results: resultsByBrowser,
        hasBrowserSpecificFailure,
      });
    }

    return matrix;
  }

  /**
   * Render the full HTML report content.
   */
  private renderHtml(report: CrossBrowserReport, browserSpecificFailures: string[]): string {
    const { runTimestamp, browsers, matrix, summaries } = report;

    // Read historical data and render trend section
    const historicalData = this.readHistoricalData();
    const trendSection = this.renderTrendSection(historicalData);

    const summaryRows = summaries.map((s) => `
          <tr>
            <td><strong>${this.escapeHtml(s.browser)}</strong></td>
            <td>${s.total}</td>
            <td class="status-passed">${s.passed}</td>
            <td class="status-failed">${s.failed}</td>
            <td class="status-skipped">${s.skipped}</td>
            <td><strong>${s.passRate}</strong></td>
            <td>${this.renderBrowserReportLink(s.browser)}</td>
          </tr>`).join('\n');

    const matrixHeaderCells = browsers.map((b) => `<th>${this.escapeHtml(b)}</th>`).join('');

    const matrixRows = matrix.map((row) => {
      const rowClass = row.hasBrowserSpecificFailure ? ' class="browser-specific-failure"' : '';
      const cells = browsers.map((b) => {
        const status = row.results[b] || 'not_executed';
        return `<td class="status-${status}">${status}</td>`;
      }).join('');

      const failureIndicator = row.hasBrowserSpecificFailure
        ? ' <span class="failure-badge">⚠ Browser-specific</span>'
        : '';

      return `          <tr${rowClass}>
            <td>${this.escapeHtml(row.scenarioName)}${failureIndicator}</td>
            <td class="feature-file">${this.escapeHtml(row.featureFile)}</td>
            ${cells}
          </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cross-Browser Test Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f5f5f5; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: #1a237e; color: white; padding: 24px 32px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .header .meta span { margin-right: 24px; }
    .section { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #1a237e; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #e8eaf6; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #c5cae9; }
    td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background: #f5f5f5; }
    .status-passed { color: #2e7d32; font-weight: 500; }
    .status-failed { color: #c62828; font-weight: 500; }
    .status-skipped { color: #f57f17; font-weight: 500; }
    .status-not_executed { color: #757575; font-style: italic; }
    .browser-specific-failure { background-color: #fff3e0 !important; }
    .browser-specific-failure:hover { background-color: #ffe0b2 !important; }
    .failure-badge { display: inline-block; background: #ff9800; color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-left: 8px; vertical-align: middle; }
    .feature-file { color: #666; font-size: 12px; }
    .link-disabled { color: #999; text-decoration: none; cursor: not-allowed; font-style: italic; }
    a { color: #1565c0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .summary-count { font-size: 14px; margin-bottom: 8px; color: #555; }
    .no-data-message { font-size: 14px; color: #666; font-style: italic; padding: 16px 0; }
    .persistent-issues-warning { margin-top: 20px; padding: 16px; background: #fff3e0; border: 1px solid #ffcc02; border-radius: 6px; }
    .persistent-issues-warning h3 { font-size: 15px; color: #e65100; margin-bottom: 8px; }
    .persistent-issues-warning p { font-size: 13px; color: #555; margin-bottom: 12px; }
    .persistent-issues-warning table { width: 100%; }
    .persistent-issues-warning th { background: #ffe0b2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cross-Browser Test Report</h1>
      <div class="meta">
        <span>🕐 Run: ${this.escapeHtml(runTimestamp)}</span>
        <span>🌐 Browsers: ${browsers.map((b) => this.escapeHtml(b)).join(', ')}</span>
      </div>
    </div>

    <div class="section">
      <h2>Per-Browser Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Browser</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Pass Rate</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
${summaryRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Scenario Matrix</h2>
      <p class="summary-count">${matrix.length} scenarios across ${browsers.length} browser(s). ${browserSpecificFailures.length} browser-specific failure(s) detected.</p>
      <table>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Feature File</th>
            ${matrixHeaderCells}
          </tr>
        </thead>
        <tbody>
${matrixRows}
        </tbody>
      </table>
    </div>

${trendSection}
  </div>
</body>
</html>`;
  }

  /**
   * Render a link to the individual browser Cucumber report.
   * If the report file doesn't exist, render a disabled/grayed-out link.
   */
  private renderBrowserReportLink(browser: string): string {
    const relativePath = `../html/${browser}-cucumber-report.html`;
    const absolutePath = path.resolve('reports', 'html', `${browser}-cucumber-report.html`);

    if (fs.existsSync(absolutePath)) {
      return `<a href="${relativePath}">View ${this.escapeHtml(browser)} report</a>`;
    }

    return `<span class="link-disabled">Report unavailable</span>`;
  }

  /**
   * Escape HTML special characters to prevent XSS in report output.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
