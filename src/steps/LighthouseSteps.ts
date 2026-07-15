import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { LighthouseEngine } from '../core/LighthouseEngine';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';

/**
 * Get or create LighthouseEngine instance.
 * Stored on CustomWorld to reuse across steps in same scenario.
 */
function getLighthouseEngine(world: CustomWorld): LighthouseEngine {
  if (!(world as any).__lighthouseEngine) {
    const port = (world as any).__lighthousePort || 9222;
    (world as any).__lighthouseEngine = new LighthouseEngine(port);
  }
  return (world as any).__lighthouseEngine;
}

// ─── Lighthouse Audit Steps ──────────────────────────────────────────────────

When(
  /^I run a Lighthouse audit$/,
  async function (this: CustomWorld) {
    const engine = getLighthouseEngine(this);
    const page = this.contextManager.getPage();
    const result = await engine.audit(page);

    DataStore.set('lighthouseScores', result.scores);
    DataStore.set('lighthousePassed', result.passed);
    DataStore.set('lighthouseReportPath', result.reportPath);

    // Attach HTML report to Cucumber output if available
    if (result.reportPath) {
      const fs = require('fs');
      if (fs.existsSync(result.reportPath)) {
        const reportContent = fs.readFileSync(result.reportPath, 'utf8');
        await this.attach(reportContent, 'text/html');
      }
    }

    Logger.info(
      `Lighthouse audit: Performance=${result.scores.performance}, ` +
      `Accessibility=${result.scores.accessibility}, ` +
      `Best Practices=${result.scores.bestPractices}, ` +
      `SEO=${result.scores.seo}`
    );
  }
);

When(
  /^I run a Lighthouse accessibility audit$/,
  async function (this: CustomWorld) {
    const engine = getLighthouseEngine(this);
    const page = this.contextManager.getPage();
    const result = await engine.auditAccessibility(page, 0); // 0 = don't fail, just report

    DataStore.set('lighthouseAccessibilityScore', result.score);
    DataStore.set('lighthouseReportPath', result.reportPath);

    if (result.reportPath) {
      const fs = require('fs');
      if (fs.existsSync(result.reportPath)) {
        const reportContent = fs.readFileSync(result.reportPath, 'utf8');
        await this.attach(reportContent, 'text/html');
      }
    }

    Logger.info(`Lighthouse accessibility score: ${result.score}/100`);
  }
);

// ─── Score Assertions ────────────────────────────────────────────────────────

Then(
  /^the Lighthouse accessibility score should be at least (\d+)$/,
  async function (this: CustomWorld, minScore: string) {
    const scores = DataStore.get('lighthouseScores') as any;
    if (!scores) {
      throw new Error('No Lighthouse audit has been run. Add "When I run a Lighthouse audit" first.');
    }
    const min = parseInt(minScore);
    if (scores.accessibility < min) {
      throw new Error(
        `Lighthouse accessibility score ${scores.accessibility} is below threshold ${min}`
      );
    }
    Logger.info(`✓ Lighthouse accessibility: ${scores.accessibility}/100 (threshold: ${min})`);
  }
);

Then(
  /^the Lighthouse performance score should be at least (\d+)$/,
  async function (this: CustomWorld, minScore: string) {
    const scores = DataStore.get('lighthouseScores') as any;
    if (!scores) {
      throw new Error('No Lighthouse audit has been run. Add "When I run a Lighthouse audit" first.');
    }
    const min = parseInt(minScore);
    if (scores.performance < min) {
      throw new Error(
        `Lighthouse performance score ${scores.performance} is below threshold ${min}`
      );
    }
    Logger.info(`✓ Lighthouse performance: ${scores.performance}/100 (threshold: ${min})`);
  }
);

Then(
  /^the Lighthouse SEO score should be at least (\d+)$/,
  async function (this: CustomWorld, minScore: string) {
    const scores = DataStore.get('lighthouseScores') as any;
    if (!scores) {
      throw new Error('No Lighthouse audit has been run. Add "When I run a Lighthouse audit" first.');
    }
    const min = parseInt(minScore);
    if (scores.seo < min) {
      throw new Error(
        `Lighthouse SEO score ${scores.seo} is below threshold ${min}`
      );
    }
    Logger.info(`✓ Lighthouse SEO: ${scores.seo}/100 (threshold: ${min})`);
  }
);

Then(
  /^the Lighthouse best practices score should be at least (\d+)$/,
  async function (this: CustomWorld, minScore: string) {
    const scores = DataStore.get('lighthouseScores') as any;
    if (!scores) {
      throw new Error('No Lighthouse audit has been run. Add "When I run a Lighthouse audit" first.');
    }
    const min = parseInt(minScore);
    if (scores.bestPractices < min) {
      throw new Error(
        `Lighthouse best practices score ${scores.bestPractices} is below threshold ${min}`
      );
    }
    Logger.info(`✓ Lighthouse best practices: ${scores.bestPractices}/100 (threshold: ${min})`);
  }
);

Then(
  /^all Lighthouse scores should be at least (\d+)$/,
  async function (this: CustomWorld, minScore: string) {
    const scores = DataStore.get('lighthouseScores') as any;
    if (!scores) {
      throw new Error('No Lighthouse audit has been run. Add "When I run a Lighthouse audit" first.');
    }
    const min = parseInt(minScore);
    const failures: string[] = [];

    if (scores.performance < min) failures.push(`Performance: ${scores.performance}`);
    if (scores.accessibility < min) failures.push(`Accessibility: ${scores.accessibility}`);
    if (scores.bestPractices < min) failures.push(`Best Practices: ${scores.bestPractices}`);
    if (scores.seo < min) failures.push(`SEO: ${scores.seo}`);

    if (failures.length > 0) {
      throw new Error(
        `Lighthouse scores below threshold (${min}):\n${failures.map(f => `  • ${f}`).join('\n')}`
      );
    }
    Logger.info(`✓ All Lighthouse scores are at least ${min}/100`);
  }
);
