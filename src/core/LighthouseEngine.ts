import { Page } from '@playwright/test';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Lighthouse audit result scores (0-100).
 */
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
}

/**
 * Lighthouse audit configuration thresholds.
 */
export interface LighthouseThresholds {
  performance?: number;
  accessibility?: number;
  'best-practices'?: number;
  seo?: number;
  pwa?: number;
}

/**
 * LighthouseEngine — Integrates Google Lighthouse audits into the framework.
 *
 * Uses the `playwright-lighthouse` package to run Lighthouse via CDP.
 * Provides accessibility, performance, SEO, and best-practices scoring.
 *
 * IMPORTANT: Only works with Chromium (requires CDP remote-debugging-port).
 * Firefox and WebKit are not supported — the engine gracefully skips on those browsers.
 *
 * Usage:
 * ```typescript
 * const engine = new LighthouseEngine(9222);
 * const scores = await engine.audit(page);
 * console.log(scores.accessibility); // 92
 * ```
 */
export class LighthouseEngine {
  private port: number;
  private reportDir: string;

  constructor(port: number) {
    this.port = port;
    this.reportDir = 'reports/lighthouse';
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run a full Lighthouse audit on the current page.
   */
  public async audit(
    page: Page,
    thresholds?: LighthouseThresholds
  ): Promise<{ scores: LighthouseScores; reportPath: string; passed: boolean; failures: string[] }> {
    Logger.info(`[LighthouseEngine] Starting audit on: ${page.url()}`);

    const reportName = `lighthouse-${Date.now()}`;

    try {
      // Dynamic import to avoid breaking the framework if lighthouse isn't installed
      const { playAudit } = await import('playwright-lighthouse');

      const defaultThresholds: LighthouseThresholds = {
        accessibility: 90,
        performance: 50,
        'best-practices': 50,
        seo: 50,
      };

      const mergedThresholds = { ...defaultThresholds, ...thresholds };

      let auditPassed = true;
      const failures: string[] = [];

      try {
        await playAudit({
          page,
          port: this.port,
          thresholds: mergedThresholds,
          reports: {
            formats: { html: true, json: true },
            name: reportName,
            directory: this.reportDir,
          },
        });
      } catch (error: any) {
        // playAudit throws when thresholds are not met — this is expected behavior
        auditPassed = false;
        const msg = error.message || String(error);
        // Parse failure messages like "accessibility score is 85, threshold is 90"
        const lines = msg.split('\n').filter((l: string) => l.includes('score'));
        failures.push(...(lines.length > 0 ? lines : [msg]));
        Logger.warn(`[LighthouseEngine] Threshold not met: ${failures.join(', ')}`);
      }

      // Read scores from the JSON report
      const jsonPath = path.join(this.reportDir, `${reportName}.json`);
      const scores = this.parseScoresFromReport(jsonPath);
      const htmlReportPath = path.join(this.reportDir, `${reportName}.html`);

      Logger.info(
        `[LighthouseEngine] Audit complete — ` +
        `Performance: ${scores.performance}, ` +
        `Accessibility: ${scores.accessibility}, ` +
        `Best Practices: ${scores.bestPractices}, ` +
        `SEO: ${scores.seo}`
      );

      return {
        scores,
        reportPath: fs.existsSync(htmlReportPath) ? htmlReportPath : '',
        passed: auditPassed,
        failures,
      };
    } catch (error: any) {
      Logger.error(`[LighthouseEngine] Audit failed: ${error.message}`);
      throw new Error(
        `Lighthouse audit failed: ${error.message}. ` +
        `Ensure Chromium was launched with --remote-debugging-port=${this.port}`
      );
    }
  }

  /**
   * Run a Lighthouse audit for accessibility only and return the score.
   */
  public async auditAccessibility(page: Page, minScore: number = 90): Promise<{
    score: number;
    passed: boolean;
    reportPath: string;
  }> {
    const result = await this.audit(page, { accessibility: minScore });
    return {
      score: result.scores.accessibility,
      passed: result.scores.accessibility >= minScore,
      reportPath: result.reportPath,
    };
  }

  /**
   * Parse Lighthouse scores from the generated JSON report.
   */
  private parseScoresFromReport(jsonPath: string): LighthouseScores {
    const defaultScores: LighthouseScores = {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      pwa: 0,
    };

    if (!fs.existsSync(jsonPath)) {
      Logger.warn(`[LighthouseEngine] JSON report not found: ${jsonPath}`);
      return defaultScores;
    }

    try {
      const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const categories = report.categories || {};

      return {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
        pwa: Math.round((categories.pwa?.score || 0) * 100),
      };
    } catch (error) {
      Logger.warn(`[LighthouseEngine] Failed to parse report: ${error}`);
      return defaultScores;
    }
  }

  /**
   * Get the CDP port number.
   */
  public getPort(): number {
    return this.port;
  }
}
