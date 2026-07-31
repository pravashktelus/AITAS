import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { LoadTestEngine, LoadTestConfig, LoadTestResult } from '../core/LoadTestEngine';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';
import { FrameworkConfig } from '../config/FrameworkConfig';

// =============================================================================
// LOAD TEST STEP DEFINITIONS (JMeter-style)
// =============================================================================
// Steps for running load/performance tests with concurrent virtual users.
//
// TAG: Add @loadtest to your scenario.
//
// USAGE EXAMPLES:
//   When I run a load test with 10 users for 30 seconds
//   When I run a load test on 'https://example.com' with 20 users for 60 seconds
//   Then the average response time should be less than 3000 ms
//   Then the error rate should be less than 5 percent
//   Then the throughput should be at least 2 requests per second
//   Then the p95 response time should be less than 5000 ms
// =============================================================================

/**
 * Get or create LoadTestEngine instance.
 */
function getLoadTestEngine(world: CustomWorld): LoadTestEngine {
  if (!(world as any).__loadTestEngine) {
    (world as any).__loadTestEngine = new LoadTestEngine();
  }
  return (world as any).__loadTestEngine;
}

// ─── Run Load Test ───────────────────────────────────────────────────────────

When(
  /^I run a load test with (\d+) users? for (\d+) seconds?$/,
  async function (this: CustomWorld, users: string, duration: string) {
    const engine = getLoadTestEngine(this);
    const config = FrameworkConfig.getInstance();
    const url = config.get('app.url', 'https://telecom-app-171032253690.northamerica-northeast1.run.app/login');

    const result = await engine.run({
      url,
      virtualUsers: parseInt(users),
      duration: parseInt(duration),
      rampUp: Math.min(parseInt(duration) / 3, 10),
      thinkTime: 1000,
    });

    DataStore.set('loadTestResult', result);

    // Attach report to Cucumber output
    if (result.reportPath) {
      const fs = require('fs');
      if (fs.existsSync(result.reportPath)) {
        const reportContent = fs.readFileSync(result.reportPath, 'utf8');
        await this.attach(reportContent, 'text/html');
      }
    }

    // Attach summary text
    const summary = `
═══════════════════════════════════════════════════════════════
              LOAD TEST RESULTS
═══════════════════════════════════════════════════════════════
URL:               ${result.url}
Virtual Users:     ${result.virtualUsers}
Duration:          ${result.duration.toFixed(1)}s
Total Requests:    ${result.totalRequests}
Success:           ${result.successCount}
Errors:            ${result.errorCount} (${result.errorRate.toFixed(1)}%)
Throughput:        ${result.throughput.toFixed(2)} req/s
Avg Response:      ${result.avgResponseTime.toFixed(0)}ms
P50 (Median):      ${result.p50.toFixed(0)}ms
P90:               ${result.p90.toFixed(0)}ms
P95:               ${result.p95.toFixed(0)}ms
P99:               ${result.p99.toFixed(0)}ms
Min:               ${result.minResponseTime.toFixed(0)}ms
Max:               ${result.maxResponseTime.toFixed(0)}ms
═══════════════════════════════════════════════════════════════
`;
    await this.attach(summary, 'text/plain');
    Logger.info(summary);
  }
);

When(
  /^I run a load test on ['"](.+)['"] with (\d+) users? for (\d+) seconds?$/,
  async function (this: CustomWorld, url: string, users: string, duration: string) {
    const engine = getLoadTestEngine(this);

    // Resolve {property.key} placeholders from framework.properties
    const frameworkConfig = FrameworkConfig.getInstance();
    const resolvedUrl = url.replace(/\{([^}]+)\}/g, (_, key) => {
      return frameworkConfig.get(key, `{${key}}`);
    });

    const result = await engine.run({
      url: resolvedUrl,
      virtualUsers: parseInt(users),
      duration: parseInt(duration),
      rampUp: Math.min(parseInt(duration) / 3, 10),
      thinkTime: 1000,
    });

    DataStore.set('loadTestResult', result);

    if (result.reportPath) {
      const fs = require('fs');
      if (fs.existsSync(result.reportPath)) {
        const reportContent = fs.readFileSync(result.reportPath, 'utf8');
        await this.attach(reportContent, 'text/html');
      }
    }

    const summary = `Load Test: ${result.totalRequests} requests, ${result.throughput.toFixed(1)} req/s, avg ${result.avgResponseTime.toFixed(0)}ms, ${result.errorRate.toFixed(1)}% errors`;
    await this.attach(summary, 'text/plain');
    Logger.info(summary);
  }
);

When(
  /^I run a load test with (\d+) users? for (\d+) seconds? with (\d+)(?:ms| milliseconds?) think time$/,
  async function (this: CustomWorld, users: string, duration: string, thinkTime: string) {
    const engine = getLoadTestEngine(this);
    const config = FrameworkConfig.getInstance();
    const url = config.get('app.url', 'https://telecom-app-171032253690.northamerica-northeast1.run.app/login');

    const result = await engine.run({
      url,
      virtualUsers: parseInt(users),
      duration: parseInt(duration),
      rampUp: Math.min(parseInt(duration) / 3, 10),
      thinkTime: parseInt(thinkTime),
    });

    DataStore.set('loadTestResult', result);

    if (result.reportPath) {
      const fs = require('fs');
      if (fs.existsSync(result.reportPath)) {
        await this.attach(fs.readFileSync(result.reportPath, 'utf8'), 'text/html');
      }
    }
  }
);

// ─── Assertions ──────────────────────────────────────────────────────────────

Then(
  /^the average response time should be less than (\d+) ?ms$/,
  async function (this: CustomWorld, maxMs: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run. Use "When I run a load test..." first.');
    const max = parseInt(maxMs);
    if (result.avgResponseTime >= max) {
      throw new Error(
        `Average response time ${result.avgResponseTime.toFixed(0)}ms exceeds threshold of ${max}ms`
      );
    }
    Logger.info(`✓ Average response time ${result.avgResponseTime.toFixed(0)}ms < ${max}ms`);
  }
);

Then(
  /^the p(\d+) response time should be less than (\d+) ?ms$/,
  async function (this: CustomWorld, percentile: string, maxMs: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    const max = parseInt(maxMs);
    const pKey = `p${percentile}` as keyof LoadTestResult;
    const value = result[pKey] as number;
    if (value === undefined) throw new Error(`Unknown percentile: p${percentile}. Use p50, p90, p95, or p99.`);
    if (value >= max) {
      throw new Error(`P${percentile} response time ${value.toFixed(0)}ms exceeds threshold of ${max}ms`);
    }
    Logger.info(`✓ P${percentile} response time ${value.toFixed(0)}ms < ${max}ms`);
  }
);

Then(
  /^the error rate should be less than (\d+(?:\.\d+)?) ?percent$/,
  async function (this: CustomWorld, maxRate: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    const max = parseFloat(maxRate);
    if (result.errorRate >= max) {
      throw new Error(
        `Error rate ${result.errorRate.toFixed(2)}% exceeds threshold of ${max}%`
      );
    }
    Logger.info(`✓ Error rate ${result.errorRate.toFixed(2)}% < ${max}%`);
  }
);

Then(
  /^the throughput should be at least (\d+(?:\.\d+)?) requests? per second$/,
  async function (this: CustomWorld, minThroughput: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    const min = parseFloat(minThroughput);
    if (result.throughput < min) {
      throw new Error(
        `Throughput ${result.throughput.toFixed(2)} req/s is below minimum ${min} req/s`
      );
    }
    Logger.info(`✓ Throughput ${result.throughput.toFixed(2)} req/s ≥ ${min} req/s`);
  }
);

Then(
  /^the total requests should be at least (\d+)$/,
  async function (this: CustomWorld, minRequests: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    const min = parseInt(minRequests);
    if (result.totalRequests < min) {
      throw new Error(`Total requests ${result.totalRequests} is below minimum ${min}`);
    }
    Logger.info(`✓ Total requests ${result.totalRequests} ≥ ${min}`);
  }
);

Then(
  /^the max response time should be less than (\d+) ?ms$/,
  async function (this: CustomWorld, maxMs: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    const max = parseInt(maxMs);
    if (result.maxResponseTime >= max) {
      throw new Error(`Max response time ${result.maxResponseTime.toFixed(0)}ms exceeds ${max}ms`);
    }
    Logger.info(`✓ Max response time ${result.maxResponseTime.toFixed(0)}ms < ${max}ms`);
  }
);

Then(
  /^I store the load test results as ['"](.+)['"]$/,
  async function (this: CustomWorld, varName: string) {
    const result = DataStore.get('loadTestResult') as LoadTestResult;
    if (!result) throw new Error('No load test has been run.');
    DataStore.set(varName, result);
    Logger.info(`Load test results stored as "${varName}"`);
  }
);
