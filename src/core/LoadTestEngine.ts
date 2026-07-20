import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Logger } from '../utils/Logger';
import { FrameworkConfig } from '../config/FrameworkConfig';
import * as fs from 'fs';
import * as path from 'path';

/**
 * LoadTestEngine — JMeter-style load testing using Playwright.
 * 
 * Simulates concurrent virtual users (VUs) hitting pages simultaneously.
 * Measures: response time, throughput, error rate, percentiles (p50, p90, p95, p99).
 * 
 * Unlike JMeter which uses HTTP-only threads, this engine uses real browser instances
 * which means it tests the FULL page load including JS execution, CSS rendering, etc.
 * 
 * Usage:
 *   const engine = new LoadTestEngine();
 *   await engine.run({ url: 'https://example.com', virtualUsers: 10, duration: 30 });
 */

export interface LoadTestConfig {
  /** Target URL to load test */
  url: string;
  /** Number of concurrent virtual users */
  virtualUsers: number;
  /** Test duration in seconds */
  duration: number;
  /** Ramp-up time in seconds (gradually add users) */
  rampUp?: number;
  /** Think time between requests per user (ms) */
  thinkTime?: number;
  /** Timeout per page load (ms) */
  pageTimeout?: number;
  /** Custom headers to send */
  headers?: Record<string, string>;
}

export interface LoadTestResult {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successCount: number;
  /** Failed requests */
  errorCount: number;
  /** Error rate percentage */
  errorRate: number;
  /** Throughput (requests per second) */
  throughput: number;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** Minimum response time (ms) */
  minResponseTime: number;
  /** Maximum response time (ms) */
  maxResponseTime: number;
  /** 50th percentile (median) response time */
  p50: number;
  /** 90th percentile response time */
  p90: number;
  /** 95th percentile response time */
  p95: number;
  /** 99th percentile response time */
  p99: number;
  /** Test duration (seconds) */
  duration: number;
  /** Virtual users used */
  virtualUsers: number;
  /** Target URL */
  url: string;
  /** Individual request timings */
  timings: RequestTiming[];
  /** HTML report path */
  reportPath: string;
}

export interface RequestTiming {
  userId: number;
  iteration: number;
  responseTime: number;
  status: 'success' | 'error';
  statusCode?: number;
  errorMessage?: string;
  timestamp: number;
}

export class LoadTestEngine {
  private reportDir: string = 'reports/loadtest';

  constructor() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run a load test with the specified configuration.
   */
  public async run(config: LoadTestConfig): Promise<LoadTestResult> {
    const {
      url,
      virtualUsers,
      duration,
      rampUp = 5,
      thinkTime = 1000,
      pageTimeout = 30000,
      headers = {},
    } = config;

    Logger.info(`[LoadTest] Starting: ${virtualUsers} VUs → ${url} for ${duration}s (ramp-up: ${rampUp}s)`);

    const timings: RequestTiming[] = [];
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const isCI = process.env.CI === 'true';

    // Launch browsers — limit concurrent browsers to avoid resource exhaustion
    const maxBrowsersConfig = parseInt(
      FrameworkConfig.getInstance().get('loadtest.maxBrowsers', '10'), 10
    );
    const maxConcurrentBrowsers = Math.min(virtualUsers, maxBrowsersConfig);
    const userPromises: Promise<void>[] = [];

    for (let userId = 0; userId < maxConcurrentBrowsers; userId++) {
      // Stagger user start based on ramp-up time
      const delay = rampUp > 0 ? (userId / maxConcurrentBrowsers) * rampUp * 1000 : 0;

      const userTask = this.runVirtualUser({
        userId,
        url,
        delay,
        endTime,
        thinkTime,
        pageTimeout,
        headers,
        timings,
        headless: true, // Always headless for load testing
      });

      userPromises.push(userTask);
    }

    await Promise.all(userPromises);

    const actualDuration = (Date.now() - startTime) / 1000;

    // Calculate metrics
    const result = this.calculateMetrics(timings, actualDuration, virtualUsers, url);

    // Generate report
    result.reportPath = this.generateReport(result);

    Logger.info(
      `[LoadTest] Complete: ${result.totalRequests} requests, ` +
      `${result.throughput.toFixed(1)} req/s, ` +
      `avg ${result.avgResponseTime.toFixed(0)}ms, ` +
      `p95 ${result.p95.toFixed(0)}ms, ` +
      `${result.errorRate.toFixed(1)}% errors`
    );

    return result;
  }

  /**
   * Simulate a single virtual user making repeated requests.
   */
  private async runVirtualUser(opts: {
    userId: number;
    url: string;
    delay: number;
    endTime: number;
    thinkTime: number;
    pageTimeout: number;
    headers: Record<string, string>;
    timings: RequestTiming[];
    headless: boolean;
  }): Promise<void> {
    // Wait for ramp-up delay
    if (opts.delay > 0) {
      await this.sleep(opts.delay);
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await chromium.launch({
        headless: opts.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });

      context = await browser.newContext({
        extraHTTPHeaders: opts.headers,
        ignoreHTTPSErrors: true,
      });

      let iteration = 0;

      while (Date.now() < opts.endTime) {
        iteration++;
        let page: Page | null = null;

        const timing: RequestTiming = {
          userId: opts.userId,
          iteration,
          responseTime: 0,
          status: 'success',
          timestamp: Date.now(),
        };

        const requestStart = Date.now();

        try {
          page = await context.newPage();
          const response = await page.goto(opts.url, {
            waitUntil: 'domcontentloaded',
            timeout: opts.pageTimeout,
          });

          timing.responseTime = Date.now() - requestStart;
          timing.statusCode = response?.status() || 0;

          if (timing.statusCode >= 400) {
            timing.status = 'error';
            timing.errorMessage = `HTTP ${timing.statusCode}`;
          }
        } catch (error: any) {
          timing.responseTime = Date.now() - requestStart;
          timing.status = 'error';
          timing.errorMessage = error.message?.substring(0, 100) || 'Unknown error';
        } finally {
          if (page) await page.close().catch(() => {});
        }

        opts.timings.push(timing);

        // Think time before next request
        if (Date.now() < opts.endTime && opts.thinkTime > 0) {
          await this.sleep(opts.thinkTime + Math.random() * 500);
        }
      }
    } catch (error: any) {
      Logger.warn(`[LoadTest] VU ${opts.userId} error: ${error.message}`);
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  /**
   * Calculate load test metrics from raw timings.
   */
  private calculateMetrics(
    timings: RequestTiming[],
    duration: number,
    virtualUsers: number,
    url: string
  ): LoadTestResult {
    const responseTimes = timings.map(t => t.responseTime).sort((a, b) => a - b);
    const successCount = timings.filter(t => t.status === 'success').length;
    const errorCount = timings.filter(t => t.status === 'error').length;
    const totalRequests = timings.length;

    return {
      totalRequests,
      successCount,
      errorCount,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      throughput: duration > 0 ? totalRequests / duration : 0,
      avgResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p50: this.percentile(responseTimes, 50),
      p90: this.percentile(responseTimes, 90),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
      duration,
      virtualUsers,
      url,
      timings,
      reportPath: '',
    };
  }

  /**
   * Calculate percentile from sorted array.
   */
  private percentile(sortedArr: number[], pct: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((pct / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  /**
   * Generate HTML load test report (JMeter-style dashboard).
   */
  private generateReport(result: LoadTestResult): string {
    const reportPath = path.join(this.reportDir, `loadtest-${Date.now()}.html`);

    const passColor = result.errorRate < 5 ? '#16a34a' : result.errorRate < 20 ? '#ca8a04' : '#dc2626';
    const perfColor = result.p95 < 3000 ? '#16a34a' : result.p95 < 10000 ? '#ca8a04' : '#dc2626';

    // Build time-series data for chart
    const timeSlots: { time: number; count: number; avgMs: number }[] = [];
    if (result.timings.length > 0) {
      const minTs = Math.min(...result.timings.map(t => t.timestamp));
      const slotSize = 1000; // 1-second buckets
      const slots = new Map<number, { total: number; count: number }>();

      for (const t of result.timings) {
        const slot = Math.floor((t.timestamp - minTs) / slotSize);
        const existing = slots.get(slot) || { total: 0, count: 0 };
        existing.total += t.responseTime;
        existing.count++;
        slots.set(slot, existing);
      }

      for (const [slot, data] of Array.from(slots.entries()).sort((a, b) => a[0] - b[0])) {
        timeSlots.push({ time: slot, count: data.count, avgMs: Math.round(data.total / data.count) });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Load Test Report — ${result.url}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
    .header { background: #1e293b; color: #fff; padding: 28px 40px; }
    .header h1 { font-size: 22px; }
    .header-meta { margin-top: 6px; font-size: 13px; color: #94a3b8; }
    .dashboard { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .card-value { font-size: 28px; font-weight: 700; }
    .card-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .section { background: #fff; border-radius: 10px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.06); margin-bottom: 20px; }
    .section h2 { font-size: 16px; margin-bottom: 16px; color: #334155; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8fafc; padding: 10px 14px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .bar { height: 24px; border-radius: 4px; display: flex; align-items: center; padding: 0 8px; color: #fff; font-size: 11px; font-weight: 600; min-width: 60px; }
    .status-pass { color: #16a34a; font-weight: 700; }
    .status-fail { color: #dc2626; font-weight: 700; }
    .chart-container { height: 200px; display: flex; align-items: flex-end; gap: 2px; padding: 10px 0; }
    .chart-bar { background: #3b82f6; border-radius: 3px 3px 0 0; min-width: 4px; flex: 1; position: relative; }
    .chart-bar:hover { background: #2563eb; }
    .chart-label { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 4px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .cards { grid-template-columns: repeat(2, 1fr); } .summary-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Load Test Report</h1>
    <div class="header-meta">URL: ${result.url} | VUs: ${result.virtualUsers} | Duration: ${result.duration.toFixed(0)}s</div>
  </div>
  <div class="dashboard">
    <div class="cards">
      <div class="card">
        <div class="card-value">${result.totalRequests}</div>
        <div class="card-label">Total Requests</div>
      </div>
      <div class="card">
        <div class="card-value" style="color:${passColor}">${result.errorRate.toFixed(1)}%</div>
        <div class="card-label">Error Rate</div>
      </div>
      <div class="card">
        <div class="card-value">${result.throughput.toFixed(1)}</div>
        <div class="card-label">Requests/sec</div>
      </div>
      <div class="card">
        <div class="card-value" style="color:${perfColor}">${result.avgResponseTime.toFixed(0)}ms</div>
        <div class="card-label">Avg Response Time</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="section">
        <h2>📊 Response Time Percentiles</h2>
        <table>
          <tr><th>Metric</th><th>Value</th><th>Visual</th></tr>
          <tr><td>Min</td><td>${result.minResponseTime.toFixed(0)}ms</td><td><div class="bar" style="width:${Math.max(15, (result.minResponseTime / result.maxResponseTime) * 100)}%;background:#22c55e">${result.minResponseTime.toFixed(0)}ms</div></td></tr>
          <tr><td>P50 (Median)</td><td>${result.p50.toFixed(0)}ms</td><td><div class="bar" style="width:${Math.max(15, (result.p50 / result.maxResponseTime) * 100)}%;background:#3b82f6">${result.p50.toFixed(0)}ms</div></td></tr>
          <tr><td>P90</td><td>${result.p90.toFixed(0)}ms</td><td><div class="bar" style="width:${Math.max(15, (result.p90 / result.maxResponseTime) * 100)}%;background:#f59e0b">${result.p90.toFixed(0)}ms</div></td></tr>
          <tr><td>P95</td><td>${result.p95.toFixed(0)}ms</td><td><div class="bar" style="width:${Math.max(15, (result.p95 / result.maxResponseTime) * 100)}%;background:#f97316">${result.p95.toFixed(0)}ms</div></td></tr>
          <tr><td>P99</td><td>${result.p99.toFixed(0)}ms</td><td><div class="bar" style="width:${Math.max(15, (result.p99 / result.maxResponseTime) * 100)}%;background:#ef4444">${result.p99.toFixed(0)}ms</div></td></tr>
          <tr><td>Max</td><td>${result.maxResponseTime.toFixed(0)}ms</td><td><div class="bar" style="width:100%;background:#dc2626">${result.maxResponseTime.toFixed(0)}ms</div></td></tr>
        </table>
      </div>

      <div class="section">
        <h2>📈 Throughput Over Time (req/s per second)</h2>
        <div class="chart-container">
          ${timeSlots.map(s => {
            const maxCount = Math.max(...timeSlots.map(x => x.count), 1);
            const height = Math.max(5, (s.count / maxCount) * 100);
            return `<div class="chart-bar" style="height:${height}%" title="Second ${s.time}: ${s.count} req, avg ${s.avgMs}ms"></div>`;
          }).join('')}
        </div>
        <div class="chart-label">Time (seconds) →</div>
      </div>
    </div>

    <div class="section">
      <h2>✅ Summary</h2>
      <table>
        <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
        <tr><td>Total Requests</td><td>${result.totalRequests}</td><td>—</td></tr>
        <tr><td>Successful</td><td>${result.successCount}</td><td class="status-pass">✓</td></tr>
        <tr><td>Failed</td><td>${result.errorCount}</td><td class="${result.errorCount > 0 ? 'status-fail' : 'status-pass'}">${result.errorCount > 0 ? '✗' : '✓'}</td></tr>
        <tr><td>Error Rate</td><td>${result.errorRate.toFixed(2)}%</td><td class="${result.errorRate < 5 ? 'status-pass' : 'status-fail'}">${result.errorRate < 5 ? '< 5% ✓' : '≥ 5% ✗'}</td></tr>
        <tr><td>Throughput</td><td>${result.throughput.toFixed(2)} req/s</td><td>—</td></tr>
        <tr><td>Avg Response Time</td><td>${result.avgResponseTime.toFixed(0)}ms</td><td class="${result.avgResponseTime < 5000 ? 'status-pass' : 'status-fail'}">${result.avgResponseTime < 5000 ? '✓' : '✗'}</td></tr>
        <tr><td>P95 Response Time</td><td>${result.p95.toFixed(0)}ms</td><td class="${result.p95 < 10000 ? 'status-pass' : 'status-fail'}">${result.p95 < 10000 ? '✓' : '✗'}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
    Logger.info(`[LoadTest] Report saved: ${reportPath}`);
    return reportPath;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
