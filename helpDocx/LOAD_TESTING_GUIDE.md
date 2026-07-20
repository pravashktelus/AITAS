# Load Testing Guide - BDD Playwright Framework

## Overview

This framework includes a built-in **JMeter-style load testing engine** that uses real Playwright browser instances to simulate concurrent users hitting your application. Unlike traditional HTTP-only load tools (JMeter, k6), this tests the **full browser experience** including JavaScript execution, CSS rendering, and DOM interactions.

---

## Library & Technology

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Browser Engine | **Playwright (Chromium)** | Launches real headless browsers as virtual users |
| Concurrency | **Node.js Promises** | Runs multiple browser instances in parallel |
| Metrics | **Custom calculation** | Percentiles, throughput, error rate |
| Reporting | **HTML Dashboard** | JMeter-style visual report with charts |
| Integration | **Cucumber BDD** | Tag-based triggering via `@loadtest` |

**No external load testing library is required.** The engine is built entirely on top of Playwright — the same browser automation library used for functional tests.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LoadTestEngine                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ VU 1     │  │ VU 2     │  │ VU 3     │  ...         │
│  │ (Browser)│  │ (Browser)│  │ (Browser)│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       ▼              ▼              ▼                    │
│  ┌──────────────────────────────────────┐               │
│  │         Target URL (app)             │               │
│  │   https://simulapp.online/login      │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Collects: response time, status code, errors            │
│  Calculates: avg, p50, p90, p95, p99, throughput        │
│  Generates: HTML report + text summary                   │
└─────────────────────────────────────────────────────────┘
```

### Execution Flow

1. **Ramp-up Phase**: Virtual users are added gradually over the ramp-up period
2. **Steady State**: All VUs continuously request the target URL
3. **Think Time**: Each VU waits (configurable) between requests to simulate real user behavior
4. **Data Collection**: Every request records response time, status, and timestamp
5. **Report Generation**: After duration expires, calculates metrics and generates HTML report

### What Each Virtual User Does

```
VU starts → Launch Chromium browser (headless)
    │
    ▼
Loop until duration expires:
    │
    ├── Open new page tab
    ├── Navigate to URL (page.goto)
    ├── Record response time
    ├── Record HTTP status code
    ├── Close page tab
    ├── Wait (think time + random jitter)
    └── Repeat
    │
    ▼
Close browser
```

---

## Configuration

All settings are in `src/config/framework.properties`:

```properties
# ─── Load Testing Configuration ───────────────────────────────────────────────
loadtest.enabled=true          # Enable/disable auto load testing via @loadtest tag
loadtest.virtualUsers=5        # Number of concurrent browser instances
loadtest.duration=15           # Test duration in seconds
loadtest.rampUp=3              # Time to gradually add all users (seconds)
loadtest.thinkTime=1000        # Pause between requests per user (milliseconds)
loadtest.pageTimeout=30000     # Max wait time for page to load (milliseconds)
loadtest.maxBrowsers=10        # Hard cap on simultaneous browsers
```

### Configuration Explained

| Property | Default | What it means |
|----------|---------|---------------|
| `virtualUsers` | 5 | Like JMeter "Thread Count" — how many parallel browsers |
| `duration` | 15 | Like JMeter "Duration" — how long the test runs |
| `rampUp` | 3 | Like JMeter "Ramp-up Period" — time to start all users |
| `thinkTime` | 1000 | Like JMeter "Timer" — pause between requests |
| `pageTimeout` | 30000 | Max time to wait for a page response |
| `maxBrowsers` | 10 | Safety cap to prevent crashing your machine |

### Recommended Settings by Test Type

| Test Type | VUs | Duration | Think Time |
|-----------|-----|----------|------------|
| Smoke (quick check) | 3 | 10s | 1000ms |
| Standard load | 5 | 30s | 1000ms |
| Stress test | 10 | 60s | 500ms |
| Pipeline (CI) | 5 | 15s | 1000ms |

---

## How to Use

### Method 1: Tag-Based Auto-Run (Recommended)

Add `@loadtest` tag to any scenario. The load test runs **automatically** in the After hook after the scenario passes:

```gherkin
@web @teleconnect_orderingestion @loadtest
Feature: TeleConnect - Order Placement

  @smoke @e2e @loadtest
  Scenario: Register and place order
    Given I navigate to the application
    When I click 'TeleConnect.SwitchToRegister'
    ...
```

The load test runs on the **current page URL** at the end of the scenario. No extra steps needed in the feature file.

### Method 2: Explicit Steps in Feature File

Use step definitions for full control:

```gherkin
@loadtest
Scenario: Load test the login page
  When I run a load test on 'https://simulapp.online/login' with 5 users for 15 seconds
  Then the average response time should be less than 5000 ms
  And the error rate should be less than 5 percent
  And the p95 response time should be less than 10000 ms
  And the throughput should be at least 1 requests per second
```

### Method 3: Standalone Profile

```cmd
npx cucumber-js --profile loadtest
```

Runs only the `features/performance/loadtest.feature` scenarios.

---

## Available Step Definitions

### Trigger Steps

| Step | Description |
|------|-------------|
| `When I run a load test with {n} users for {n} seconds` | Uses app.url from config |
| `When I run a load test on '{url}' with {n} users for {n} seconds` | Custom URL |
| `When I run a load test with {n} users for {n} seconds with {n}ms think time` | Custom think time |

### Assertion Steps

| Step | Description |
|------|-------------|
| `Then the average response time should be less than {n} ms` | Avg threshold |
| `Then the p50 response time should be less than {n} ms` | Median threshold |
| `Then the p90 response time should be less than {n} ms` | 90th percentile |
| `Then the p95 response time should be less than {n} ms` | 95th percentile |
| `Then the p99 response time should be less than {n} ms` | 99th percentile |
| `Then the max response time should be less than {n} ms` | Max threshold |
| `Then the error rate should be less than {n} percent` | Error threshold |
| `Then the throughput should be at least {n} requests per second` | Min throughput |
| `Then the total requests should be at least {n}` | Min request count |

---

## Metrics Explained

| Metric | What it measures | JMeter Equivalent |
|--------|-----------------|-------------------|
| **Total Requests** | Number of page loads attempted | Sample Count |
| **Error Rate** | % of requests that failed (timeout or HTTP 4xx/5xx) | Error % |
| **Throughput** | Requests completed per second | Throughput |
| **Avg Response Time** | Mean time to load a page (ms) | Average |
| **P50 (Median)** | 50% of requests completed within this time | Median |
| **P90** | 90% of requests completed within this time | 90th pct |
| **P95** | 95% of requests completed within this time | 95th pct |
| **P99** | 99% of requests completed within this time | 99th pct |
| **Min/Max** | Fastest and slowest individual requests | Min/Max |

---

## Report Output

The load test generates an HTML dashboard at `reports/loadtest/`:

### Report Sections:
1. **Summary Cards** — Total requests, error rate, throughput, avg response time
2. **Response Time Percentiles** — Table with visual bars showing distribution
3. **Throughput Over Time** — Bar chart showing requests/second over the test duration
4. **Summary Table** — Pass/fail status per metric

### Report attached to Cucumber:
- HTML report embedded in Cucumber output (viewable in Allure/HTML report)
- Text summary with all metrics

---

## Comparison: This vs JMeter

| Feature | This Framework | JMeter |
|---------|---------------|--------|
| Protocol | Full browser (JS + CSS + rendering) | HTTP only |
| Setup | Zero — built into test framework | Separate tool, JMX config |
| Language | TypeScript (same as tests) | Java/XML |
| BDD Integration | Native (tag-based) | Requires plugins |
| CI/CD | Same pipeline as tests | Separate pipeline |
| Realism | Very high (real browser) | Medium (no rendering) |
| Max VUs | ~10 (browser-heavy) | 1000+ (lightweight threads) |
| Best for | UI load testing, realistic user simulation | High-volume API/HTTP load |

### When to use which:
- **Use this framework's load test** when you want to verify page load performance under realistic browser conditions (5-10 concurrent users)
- **Use JMeter/k6** when you need 100+ concurrent connections or pure HTTP throughput testing

---

## Running in CI Pipeline

The load test works in GitHub Actions automatically. In the pipeline:

1. Manual trigger → Tags field: `@loadtest`
2. Or add `@loadtest` tag to scenarios that should include load testing

The CI config forces headless mode and limits to `maxBrowsers` setting.

---

## Troubleshooting

### "browserContext.newPage: Target page, context or browser has been closed"

**Cause:** Too many browsers for available RAM.
**Fix:** Reduce `loadtest.virtualUsers` or `loadtest.maxBrowsers` in framework.properties.

### High P90/P95 but low P50

**Normal behavior.** The first request per VU is always slow (browser cold start). Subsequent requests are fast. The median (P50) reflects steady-state performance.

### 100% error rate

**Cause:** Target URL is unreachable or server is down.
**Fix:** Verify the URL loads in your browser first.

### Tests take too long

**Fix:** Reduce `loadtest.duration` or `loadtest.virtualUsers`. For quick checks, use 3 VUs for 10 seconds.

---

## Files

| File | Purpose |
|------|---------|
| `src/core/LoadTestEngine.ts` | Main engine — launches browsers, collects metrics, generates report |
| `src/steps/LoadTestSteps.ts` | BDD step definitions |
| `src/core/TagParser.ts` | `hasLoadTestTag()` — detects @loadtest/@performance tags |
| `src/hooks/Hooks.ts` | After hook auto-runs load test when tag present |
| `src/config/framework.properties` | Configuration values |
| `features/performance/loadtest.feature` | Standalone load test scenarios |
| `reports/loadtest/` | Generated HTML reports |

---

*Document Version: 1.0 | Last Updated: July 2026 | Framework: BDD Playwright v5.0*
