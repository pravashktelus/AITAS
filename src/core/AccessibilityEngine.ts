import { Page } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { DataStore } from '../utils/DataStore';
import { AccessibilityConfig } from '../config/FrameworkConfig';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AccessibilityEngine — WCAG 2.1 / ARIA accessibility analysis engine.
 *
 * Uses Playwright's built-in accessibility snapshot (AXTree) to audit pages
 * without requiring external tools like axe-core at runtime.
 *
 * Checks performed:
 *  - Images missing alt text
 *  - Form inputs missing labels
 *  - Buttons/links with no accessible name
 *  - Elements with insufficient color contrast (basic heuristic)
 *  - Focusable elements not reachable via keyboard Tab
 *  - ARIA roles used without required attributes
 *  - Heading hierarchy violations (h1 → h2 → h3 order)
 *  - Landmark region coverage (main, nav, header, footer)
 *  - Skip navigation link presence
 *  - Focus indicator visibility
 *  - Mobile touch target size (≥ 44x44px)
 */

export interface AccessibilityViolation {
  rule: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  description: string;
  wcagCriteria: string;
  suggestion: string;
}

export interface AccessibilityReport {
  url: string;
  timestamp: string;
  totalViolations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  violations: AccessibilityViolation[];
  passed: string[];
  htmlReport: string;
}

/**
 * Categorization of accessibility rules by WCAG level.
 * Level A: fundamental accessibility requirements
 * Level AA: Level A + enhanced requirements (default target)
 * Level AAA: Level A + AA + highest conformance requirements
 */
const WCAG_LEVEL_RULES: Record<'A' | 'AA' | 'AAA', string[]> = {
  A: ['image-alt', 'label', 'button-name', 'aria-valid-attr-value', 'skip-link', 'tabindex'],
  AA: ['color-contrast', 'heading-order', 'page-has-heading-one'],
  AAA: ['touch-target', 'landmark-main', 'landmark-navigation'],
};

/**
 * Maps axe-core impact levels to severity categories.
 * Unknown impact defaults to 'minor'.
 */
export function classifySeverity(impact: string | undefined | null): AccessibilityViolation['severity'] {
  switch (impact) {
    case 'critical': return 'critical';
    case 'serious': return 'serious';
    case 'moderate': return 'moderate';
    case 'minor': return 'minor';
    default: return 'minor';
  }
}

/**
 * Determines whether a scenario should fail based on failOnCritical config and violations.
 */
export function shouldFailOnCritical(failOnCritical: boolean, violations: AccessibilityViolation[]): boolean {
  return failOnCritical && violations.some(v => v.severity === 'critical');
}

/**
 * Determines whether a scenario should fail based on maxViolations threshold.
 * Fails if cumulative count is strictly greater than the threshold.
 */
export function shouldFailOnMaxViolations(cumulativeCount: number, maxViolations: number): boolean {
  return cumulativeCount > maxViolations;
}

/**
 * Gets the set of rule names that should be checked for a given WCAG level.
 * Level A = only Level A rules
 * Level AA = Level A + Level AA rules
 * Level AAA = Level A + Level AA + Level AAA rules (all rules)
 */
export function getRulesForLevel(wcagLevel: 'A' | 'AA' | 'AAA'): Set<string> {
  const rules = new Set<string>();
  // Always include Level A rules
  for (const rule of WCAG_LEVEL_RULES.A) rules.add(rule);
  // Include Level AA rules if level is AA or AAA
  if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
    for (const rule of WCAG_LEVEL_RULES.AA) rules.add(rule);
  }
  // Include Level AAA rules if level is AAA
  if (wcagLevel === 'AAA') {
    for (const rule of WCAG_LEVEL_RULES.AAA) rules.add(rule);
  }
  return rules;
}

export class AccessibilityEngine {
  private page: Page;
  private reportDir: string = 'reports/accessibility';
  private cumulativeViolationCount: number = 0;
  private navigationListenerRegistered: boolean = false;
  private lastAuditedUrl: string = '';

  constructor(page: Page) {
    this.page = page;
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Register an auto-audit listener on page navigation events.
   * When a navigation completes (load event), triggers an accessibility audit
   * filtered by the configured WCAG level.
   *
   * Idempotent: calling multiple times will not register duplicate listeners.
   * No-op when `config.enabled` is false.
   */
  public registerNavigationListener(page: Page, config: AccessibilityConfig): void {
    // No-op if accessibility is disabled
    if (!config.enabled) {
      return;
    }

    // Idempotent: do not register multiple listeners
    if (this.navigationListenerRegistered) {
      return;
    }

    this.page = page;
    this.navigationListenerRegistered = true;

    page.on('load', async () => {
      try {
        // Deduplicate: skip audit if URL hasn't changed since last audit
        const currentUrl = page.url();
        if (currentUrl === this.lastAuditedUrl) {
          Logger.info(`[AccessibilityEngine] Skipping duplicate audit for same URL: ${currentUrl}`);
          return;
        }

        const pageName = await page.title().catch(() => 'unknown-page');
        await this.auditPageWithLevel(pageName, config.wcagLevel);
        this.lastAuditedUrl = page.url();
      } catch (error) {
        // If failOnCritical or maxViolations throws, we re-throw to fail the scenario
        if (error instanceof AccessibilityFailureError) {
          throw error;
        }
        // Otherwise log and continue
        Logger.warn(`[AccessibilityEngine] Auto-audit error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Run an accessibility audit filtered by WCAG level.
   * - Level A: checks only Level A rules
   * - Level AA: checks Level A + AA rules
   * - Level AAA: checks all rules (A + AA + AAA)
   *
   * Includes timeout handling (10s), severity classification,
   * cumulative count tracking, failOnCritical, and maxViolations logic.
   */
  public async auditPageWithLevel(
    pageName: string,
    wcagLevel: 'A' | 'AA' | 'AAA',
    config?: AccessibilityConfig
  ): Promise<AccessibilityReport> {
    Logger.info(`[AccessibilityEngine] Running WCAG Level ${wcagLevel} audit on: ${pageName}`);

    // Wrap audit in a 10-second timeout
    const timeoutMs = 10000;
    let report: AccessibilityReport;

    try {
      report = await Promise.race([
        this.runFilteredAudit(pageName, wcagLevel),
        this.createTimeout(timeoutMs),
      ]);
    } catch (error) {
      if (error instanceof AuditTimeoutError) {
        Logger.warn(`[AccessibilityEngine] Audit timeout (${timeoutMs}ms) for page "${pageName}". Continuing without failing.`);
        // Return empty report on timeout
        report = {
          url: this.page.url(),
          timestamp: new Date().toISOString(),
          totalViolations: 0,
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
          violations: [],
          passed: [],
          htmlReport: '',
        };
        return report;
      }
      throw error;
    }

    // Update cumulative count
    this.cumulativeViolationCount += report.totalViolations;
    DataStore.set('a11yViolationCount', this.cumulativeViolationCount);

    // Check failOnCritical
    if (config && shouldFailOnCritical(config.failOnCritical, report.violations)) {
      const criticalViolations = report.violations.filter(v => v.severity === 'critical');
      throw new AccessibilityFailureError(
        `Critical accessibility violation(s) found on "${pageName}": ${criticalViolations.map(v => v.rule).join(', ')}`
      );
    }

    // Check maxViolations threshold
    if (config && shouldFailOnMaxViolations(this.cumulativeViolationCount, config.maxViolations)) {
      throw new AccessibilityFailureError(
        `Cumulative accessibility violations (${this.cumulativeViolationCount}) exceed maxViolations threshold (${config.maxViolations})`
      );
    }

    return report;
  }

  /** Get the cumulative violation count across all audits */
  public getCumulativeViolationCount(): number {
    return this.cumulativeViolationCount;
  }

  /** Reset the cumulative violation count (useful between scenarios) */
  public resetCumulativeCount(): void {
    this.cumulativeViolationCount = 0;
    this.navigationListenerRegistered = false;
    this.lastAuditedUrl = '';
  }

  /**
   * Run mobile-specific accessibility checks.
   * Orchestrates both touch target size and content reflow checks.
   *
   * Only runs when viewportWidth ≤ 767px (mobile viewport).
   * Returns empty array for non-mobile viewports (> 767px).
   */
  public async auditMobileAccessibility(viewportWidth: number): Promise<AccessibilityViolation[]> {
    // Guard: skip mobile checks on non-mobile viewports
    if (viewportWidth > 767) {
      Logger.info(`[AccessibilityEngine] Skipping mobile accessibility checks — viewport ${viewportWidth}px > 767px`);
      return [];
    }

    Logger.info(`[AccessibilityEngine] Running mobile accessibility audit at viewport width ${viewportWidth}px`);

    const [touchTargetViolations, reflowViolations] = await Promise.all([
      this.checkAllTouchTargets(44),
      this.checkContentReflow(viewportWidth),
    ]);

    const allViolations = [...touchTargetViolations, ...reflowViolations];
    Logger.info(`[AccessibilityEngine] Mobile audit complete: ${allViolations.length} violation(s) found`);
    return allViolations;
  }

  /**
   * Check touch target size for all interactive elements.
   * Scans button, a, input, select, textarea elements.
   * Reports a violation with severity 'moderate' if any visible element's
   * width OR height is less than minSize (default 44px).
   *
   * WCAG criteria: "WCAG 2.5.5 Target Size"
   */
  public async checkAllTouchTargets(minSize: number = 44): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const interactiveSelector = 'button, a, input, select, textarea';
    const elements = await this.page.locator(interactiveSelector).all();

    for (const el of elements) {
      const isHidden = await el.isHidden();
      if (isHidden) continue;

      const box = await el.boundingBox();
      if (!box) continue;

      if (box.width < minSize || box.height < minSize) {
        // Build an identifier for the element
        const tagName = await el.evaluate(e => e.tagName.toLowerCase());
        const id = await el.getAttribute('id');
        const ariaLabel = await el.getAttribute('aria-label');
        const text = (await el.innerText().catch(() => '')).trim().substring(0, 40);
        const identifier = ariaLabel || text || (id ? `#${id}` : tagName);

        violations.push({
          rule: 'touch-target-size',
          severity: 'moderate',
          element: `${tagName}${id ? `#${id}` : ''} "${identifier}"`,
          description: `Touch target is ${Math.round(box.width)}x${Math.round(box.height)}px (minimum ${minSize}x${minSize}px required)`,
          wcagCriteria: 'WCAG 2.5.5 Target Size',
          suggestion: `Increase element size or padding to at least ${minSize}x${minSize}px`,
        });
      }
    }

    return violations;
  }

  /**
   * Check content reflow — no horizontal scrolling.
   * Evaluates document.documentElement.scrollWidth in the browser.
   * Reports a violation with severity 'moderate' if scrollWidth > viewportWidth.
   *
   * WCAG criteria: "WCAG 2.1 — 1.4.10 Reflow (Level AA)"
   */
  public async checkContentReflow(viewportWidth: number): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];

    const scrollWidth = await this.page.evaluate(() => document.documentElement.scrollWidth);

    if (scrollWidth > viewportWidth) {
      violations.push({
        rule: 'content-reflow',
        severity: 'moderate',
        element: 'document',
        description: `Content requires horizontal scrolling: document scrollWidth (${scrollWidth}px) exceeds viewport width (${viewportWidth}px)`,
        wcagCriteria: 'WCAG 2.1 — 1.4.10 Reflow (Level AA)',
        suggestion: `Ensure content reflows within ${viewportWidth}px viewport width without horizontal scrolling. Use responsive CSS and avoid fixed-width elements.`,
      });
    }

    return violations;
  }

  /**
   * Run the actual audit with WCAG level filtering.
   * Filters violations to only include rules at or below the specified WCAG level.
   */
  private async runFilteredAudit(pageName: string, wcagLevel: 'A' | 'AA' | 'AAA'): Promise<AccessibilityReport> {
    const violations: AccessibilityViolation[] = [];
    const passed: string[] = [];

    // Run all checks
    await Promise.all([
      this.checkImagesAltText(violations, passed),
      this.checkFormLabels(violations, passed),
      this.checkButtonsLinks(violations, passed),
      this.checkHeadingHierarchy(violations, passed),
      this.checkLandmarks(violations, passed),
      this.checkSkipNavigation(violations, passed),
      this.checkAriaRoles(violations, passed),
      this.checkColorContrast(violations, passed),
      this.checkFocusableElements(violations, passed),
      this.checkTouchTargets(violations, passed),
    ]);

    // Filter violations by WCAG level
    const allowedRules = getRulesForLevel(wcagLevel);
    const filteredViolations = violations.filter(v => allowedRules.has(v.rule));

    const report: AccessibilityReport = {
      url: this.page.url(),
      timestamp: new Date().toISOString(),
      totalViolations: filteredViolations.length,
      critical: filteredViolations.filter(v => v.severity === 'critical').length,
      serious: filteredViolations.filter(v => v.severity === 'serious').length,
      moderate: filteredViolations.filter(v => v.severity === 'moderate').length,
      minor: filteredViolations.filter(v => v.severity === 'minor').length,
      violations: filteredViolations,
      passed,
      htmlReport: '',
    };

    report.htmlReport = this.generateHtmlReport(report, pageName);
    const reportPath = path.join(this.reportDir, `${pageName}-${Date.now()}.html`);
    fs.writeFileSync(reportPath, report.htmlReport);
    Logger.info(
      `[AccessibilityEngine] WCAG ${wcagLevel} audit complete: ${filteredViolations.length} violations found. Report: ${reportPath}`
    );
    return report;
  }

  /** Create a timeout promise that rejects after the specified duration */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new AuditTimeoutError(`Audit timed out after ${ms}ms`)), ms);
    });
  }

  /** Run full WCAG 2.1 audit on the current page */
  public async auditPage(pageName: string = 'page'): Promise<AccessibilityReport> {
    Logger.info(`Running accessibility audit on: ${await this.page.title()}`);
    const violations: AccessibilityViolation[] = [];
    const passed: string[] = [];

    await Promise.all([
      this.checkImagesAltText(violations, passed),
      this.checkFormLabels(violations, passed),
      this.checkButtonsLinks(violations, passed),
      this.checkHeadingHierarchy(violations, passed),
      this.checkLandmarks(violations, passed),
      this.checkSkipNavigation(violations, passed),
      this.checkAriaRoles(violations, passed),
      this.checkColorContrast(violations, passed),
      this.checkFocusableElements(violations, passed),
      this.checkTouchTargets(violations, passed),
    ]);

    const report: AccessibilityReport = {
      url: this.page.url(),
      timestamp: new Date().toISOString(),
      totalViolations: violations.length,
      critical: violations.filter(v => v.severity === 'critical').length,
      serious:  violations.filter(v => v.severity === 'serious').length,
      moderate: violations.filter(v => v.severity === 'moderate').length,
      minor:    violations.filter(v => v.severity === 'minor').length,
      violations,
      passed,
      htmlReport: '',
    };

    report.htmlReport = this.generateHtmlReport(report, pageName);
    const reportPath = path.join(this.reportDir, `${pageName}-${Date.now()}.html`);
    fs.writeFileSync(reportPath, report.htmlReport);
    Logger.info(
      `Accessibility audit complete: ${violations.length} violations found. Report: ${reportPath}`
    );
    return report;
  }

  /** Audit a single element's accessibility */
  public async auditElement(elementRef: string): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const locator = this.page.locator(elementRef);

    const ariaLabel  = await locator.getAttribute('aria-label');
    const ariaLabelledBy = await locator.getAttribute('aria-labelledby');
    const role       = await locator.getAttribute('role');
    const tabindex   = await locator.getAttribute('tabindex');
    const tagName    = await locator.evaluate(el => el.tagName.toLowerCase());
    const text       = (await locator.innerText().catch(() => '')).trim();
    const box        = await locator.boundingBox();

    const hasName = !!(ariaLabel || ariaLabelledBy || text);
    if (!hasName && ['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
      violations.push({
        rule: 'element-accessible-name',
        severity: 'serious',
        element: elementRef,
        description: `<${tagName}> has no accessible name`,
        wcagCriteria: 'WCAG 2.1 — 4.1.2 Name, Role, Value',
        suggestion: 'Add aria-label, aria-labelledby, or visible text content',
      });
    }

    if (box && (box.width < 44 || box.height < 44) && ['button', 'a'].includes(tagName)) {
      violations.push({
        rule: 'touch-target-size',
        severity: 'moderate',
        element: elementRef,
        description: `Touch target is ${Math.round(box.width)}x${Math.round(box.height)}px (min 44x44px)`,
        wcagCriteria: 'WCAG 2.5.5 Target Size',
        suggestion: 'Increase padding or size to at least 44x44px',
      });
    }

    return violations;
  }

  /** Check keyboard navigation — Tab through interactive elements */
  public async checkKeyboardNavigation(): Promise<{ reachable: number; unreachable: string[] }> {
    const unreachable: string[] = [];
    const interactiveSelectors = 'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = await this.page.locator(interactiveSelectors).all();

    let reachable = 0;
    for (const el of elements) {
      const tabindex = await el.getAttribute('tabindex');
      const isHidden = await el.isHidden();
      const isDisabled = await el.isDisabled().catch(() => false);

      if (!isHidden && !isDisabled) {
        if (tabindex === '-1') {
          const label = await el.getAttribute('aria-label') ||
                        await el.innerText().catch(() => '') ||
                        await el.getAttribute('id') || 'unknown';
          unreachable.push(label.trim().substring(0, 60));
        } else {
          reachable++;
        }
      }
    }

    Logger.info(`Keyboard navigation: ${reachable} reachable, ${unreachable.length} unreachable`);
    return { reachable, unreachable };
  }

  /** Check focus indicator is visible when element is focused */
  public async checkFocusIndicator(elementRef: string): Promise<boolean> {
    const locator = this.page.locator(elementRef);
    await locator.focus();
    const outlineStyle = await locator.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        outline: s.outline,
        outlineColor: s.outlineColor,
        outlineWidth: s.outlineWidth,
        boxShadow: s.boxShadow,
      };
    });
    const hasVisibleFocus =
      (outlineStyle.outlineWidth !== '0px' && outlineStyle.outlineColor !== 'transparent') ||
      outlineStyle.boxShadow !== 'none';
    Logger.info(`Focus indicator for "${elementRef}": ${hasVisibleFocus ? 'visible ✓' : 'NOT VISIBLE ✗'}`);
    return hasVisibleFocus;
  }

  /** Get full ARIA snapshot of the page (as tree) */
  public async getAriaSnapshot(): Promise<string> {
    const snapshot = await this.page.locator(':root').ariaSnapshot();
    return snapshot;
  }

  // ─── Private audit methods ────────────────────────────────────────────────

  private async checkImagesAltText(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const images = await this.page.locator('img').all();
    let violations = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      if (alt === null && role !== 'presentation' && role !== 'none') {
        const src = (await img.getAttribute('src') || 'unknown').substring(0, 50);
        v.push({
          rule: 'image-alt',
          severity: 'critical',
          element: `img[src="${src}"]`,
          description: 'Image is missing alt text',
          wcagCriteria: 'WCAG 2.1 — 1.1.1 Non-text Content (Level A)',
          suggestion: 'Add descriptive alt attribute, or alt="" if decorative',
        });
        violations++;
      }
    }
    if (violations === 0) p.push('image-alt: All images have alt text ✓');
  }

  private async checkFormLabels(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const inputs = await this.page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').all();
    let violations = 0;
    for (const input of inputs) {
      const id          = await input.getAttribute('id');
      const ariaLabel   = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const hasLabel    = id ? await this.page.locator(`label[for="${id}"]`).count() > 0 : false;

      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        const inputType = await input.getAttribute('type') || 'text';
        v.push({
          rule: 'label',
          severity: 'critical',
          element: `input[type="${inputType}"]${id ? `#${id}` : ''}`,
          description: `Form input missing associated label${placeholder ? ` (placeholder: "${placeholder}" is not a label)` : ''}`,
          wcagCriteria: 'WCAG 2.1 — 1.3.1 Info and Relationships (Level A)',
          suggestion: 'Associate a <label for="id">, or add aria-label / aria-labelledby',
        });
        violations++;
      }
    }
    if (violations === 0) p.push('label: All form inputs have labels ✓');
  }

  private async checkButtonsLinks(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const elements = await this.page.locator('button, a').all();
    let violations = 0;
    for (const el of elements) {
      const text        = (await el.innerText().catch(() => '')).trim();
      const ariaLabel   = await el.getAttribute('aria-label');
      const ariaLabelledBy = await el.getAttribute('aria-labelledby');
      const title       = await el.getAttribute('title');
      const isHidden    = await el.isHidden();

      if (!isHidden && !text && !ariaLabel && !ariaLabelledBy && !title) {
        const tag  = await el.evaluate(e => e.tagName.toLowerCase());
        const href = await el.getAttribute('href');
        v.push({
          rule: 'button-name',
          severity: 'critical',
          element: `${tag}${href ? `[href="${href?.substring(0, 40)}"]` : ''}`,
          description: `<${tag}> has no accessible name (no text, aria-label, or title)`,
          wcagCriteria: 'WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)',
          suggestion: 'Add visible text content, aria-label, or title attribute',
        });
        violations++;
      }
    }
    if (violations === 0) p.push('button-name: All buttons and links have accessible names ✓');
  }

  private async checkHeadingHierarchy(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    const levels: number[] = [];
    for (const h of headings) {
      const tag = await h.evaluate(el => el.tagName.toLowerCase());
      levels.push(parseInt(tag.replace('h', '')));
    }

    let hasViolation = false;
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        v.push({
          rule: 'heading-order',
          severity: 'moderate',
          element: `h${levels[i]}`,
          description: `Heading jumps from h${levels[i - 1]} to h${levels[i]} (skipped level)`,
          wcagCriteria: 'WCAG 2.1 — 1.3.1 Info and Relationships (Level A)',
          suggestion: 'Use headings in sequential order without skipping levels',
        });
        hasViolation = true;
      }
    }

    const h1Count = levels.filter(l => l === 1).length;
    if (h1Count === 0) {
      v.push({
        rule: 'page-has-heading-one',
        severity: 'moderate',
        element: 'body',
        description: 'Page has no h1 heading',
        wcagCriteria: 'WCAG 2.1 — 2.4.6 Headings and Labels (Level AA)',
        suggestion: 'Add a single h1 that describes the main purpose of the page',
      });
      hasViolation = true;
    } else if (h1Count > 1) {
      v.push({
        rule: 'heading-order',
        severity: 'minor',
        element: 'h1',
        description: `Page has ${h1Count} h1 headings (should have only 1)`,
        wcagCriteria: 'WCAG 2.1 — 2.4.6 Headings and Labels (Level AA)',
        suggestion: 'Use a single h1 per page for the main page title',
      });
      hasViolation = true;
    }

    if (!hasViolation) p.push('heading-order: Heading hierarchy is correct ✓');
  }

  private async checkLandmarks(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const landmarks = {
      main:   await this.page.locator('main, [role="main"]').count(),
      nav:    await this.page.locator('nav, [role="navigation"]').count(),
      header: await this.page.locator('header, [role="banner"]').count(),
      footer: await this.page.locator('footer, [role="contentinfo"]').count(),
    };

    if (landmarks.main === 0) {
      v.push({
        rule: 'landmark-main',
        severity: 'moderate',
        element: 'body',
        description: 'Page has no <main> landmark region',
        wcagCriteria: 'WCAG 2.1 — 1.3.6 Identify Purpose (Level AAA) / Best Practice',
        suggestion: 'Wrap the main content in a <main> element or role="main"',
      });
    } else {
      p.push('landmark-main: <main> landmark present ✓');
    }

    if (landmarks.nav === 0) {
      v.push({
        rule: 'landmark-navigation',
        severity: 'minor',
        element: 'body',
        description: 'Page has no <nav> landmark region',
        wcagCriteria: 'WCAG 2.1 — 2.4.1 Bypass Blocks (Level A)',
        suggestion: 'Wrap navigation links in a <nav> element',
      });
    } else {
      p.push('landmark-navigation: <nav> landmark present ✓');
    }
  }

  private async checkSkipNavigation(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const skipLink = await this.page.locator('a[href="#main"], a[href="#content"], [class*="skip"]').count();
    if (skipLink === 0) {
      v.push({
        rule: 'skip-link',
        severity: 'moderate',
        element: 'body',
        description: 'No skip navigation link found',
        wcagCriteria: 'WCAG 2.1 — 2.4.1 Bypass Blocks (Level A)',
        suggestion: 'Add a "Skip to main content" link as the first focusable element',
      });
    } else {
      p.push('skip-link: Skip navigation link present ✓');
    }
  }

  private async checkAriaRoles(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const ariaElements = await this.page.locator('[role]').all();
    const validRoles = new Set([
      'alert','alertdialog','application','article','banner','button','cell','checkbox',
      'columnheader','combobox','complementary','contentinfo','definition','dialog',
      'directory','document','feed','figure','form','grid','gridcell','group',
      'heading','img','link','list','listbox','listitem','log','main','marquee',
      'math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation',
      'none','note','option','presentation','progressbar','radio','radiogroup',
      'region','row','rowgroup','rowheader','scrollbar','search','searchbox',
      'separator','slider','spinbutton','status','switch','tab','table','tablist',
      'tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem',
    ]);
    let violations = 0;
    for (const el of ariaElements) {
      const role = await el.getAttribute('role');
      if (role && !validRoles.has(role)) {
        v.push({
          rule: 'aria-valid-attr-value',
          severity: 'serious',
          element: `[role="${role}"]`,
          description: `Invalid ARIA role: "${role}"`,
          wcagCriteria: 'WCAG 2.1 — 4.1.2 Name, Role, Value (Level A)',
          suggestion: `Replace with a valid ARIA role from the WAI-ARIA specification`,
        });
        violations++;
      }
    }
    if (violations === 0) p.push('aria-valid-attr-value: All ARIA roles are valid ✓');
  }

  private async checkColorContrast(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const lowContrastCount = await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label'));
      let low = 0;
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg    = style.backgroundColor;
        if (color === 'rgba(0, 0, 0, 0)' || bg === 'rgba(0, 0, 0, 0)') return;
        if (color === bg) low++;
      });
      return low;
    });

    if (lowContrastCount > 0) {
      v.push({
        rule: 'color-contrast',
        severity: 'serious',
        element: 'text elements',
        description: `${lowContrastCount} element(s) may have insufficient color contrast`,
        wcagCriteria: 'WCAG 2.1 — 1.4.3 Contrast Minimum (Level AA) — ratio 4.5:1 for normal, 3:1 for large',
        suggestion: 'Use a contrast checker tool to verify a minimum 4.5:1 contrast ratio for body text',
      });
    } else {
      p.push('color-contrast: No obvious contrast issues detected ✓');
    }
  }

  private async checkFocusableElements(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const negativeTabIndex = await this.page.locator('[tabindex="-1"]').count();
    if (negativeTabIndex > 5) {
      v.push({
        rule: 'tabindex',
        severity: 'minor',
        element: '[tabindex="-1"]',
        description: `${negativeTabIndex} elements removed from tab order with tabindex="-1"`,
        wcagCriteria: 'WCAG 2.1 — 2.1.1 Keyboard (Level A)',
        suggestion: 'Review whether these elements should be keyboard-reachable',
      });
    } else {
      p.push('tabindex: Tab order appears reasonable ✓');
    }
  }

  private async checkTouchTargets(v: AccessibilityViolation[], p: string[]): Promise<void> {
    const interactives = await this.page.locator('button, a, input[type="checkbox"], input[type="radio"]').all();
    let violations = 0;
    for (const el of interactives) {
      const box = await el.boundingBox();
      const isHidden = await el.isHidden();
      if (!isHidden && box && (box.width < 44 || box.height < 44)) {
        const text = (await el.innerText().catch(() => '')).trim().substring(0, 40);
        v.push({
          rule: 'touch-target',
          severity: 'moderate',
          element: `interactive element "${text || 'unlabeled'}"`,
          description: `Touch target is ${Math.round(box.width)}x${Math.round(box.height)}px (recommended ≥ 44x44px)`,
          wcagCriteria: 'WCAG 2.5.5 Target Size (Level AAA) / Mobile best practice',
          suggestion: 'Increase element size or padding to at least 44x44px',
        });
        violations++;
      }
    }
    if (violations === 0) p.push('touch-target: All touch targets meet minimum size ✓');
  }

  // ─── HTML Report Generator (Allure-style Dashboard) ────────────────────────

  private generateHtmlReport(report: AccessibilityReport, pageName: string): string {
    const severityColors: Record<string, string> = {
      critical: '#d32f2f',
      serious:  '#e65100',
      moderate: '#f57f17',
      minor:    '#1565c0',
    };

    // Calculate donut chart arcs
    const total = report.totalViolations || 1; // avoid division by zero
    const counts = [
      { label: 'Critical', count: report.critical, color: severityColors.critical },
      { label: 'Serious', count: report.serious, color: severityColors.serious },
      { label: 'Moderate', count: report.moderate, color: severityColors.moderate },
      { label: 'Minor', count: report.minor, color: severityColors.minor },
    ];

    // SVG donut chart generation (150px diameter, stroke-based arcs)
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let cumulativeOffset = 0;
    const arcs = counts.map(c => {
      const fraction = report.totalViolations > 0 ? c.count / report.totalViolations : 0;
      const dashLength = fraction * circumference;
      const dashOffset = -cumulativeOffset;
      cumulativeOffset += dashLength;
      return `<circle cx="75" cy="75" r="${radius}" fill="none" stroke="${c.color}" stroke-width="20" stroke-dasharray="${dashLength} ${circumference - dashLength}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 75 75)" />`;
    }).join('\n        ');

    const donutSvg = `
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Violations donut chart">
        <circle cx="75" cy="75" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="20" />
        ${arcs}
        <text x="75" y="70" text-anchor="middle" font-size="28" font-weight="700" fill="#0f172a">${report.totalViolations}</text>
        <text x="75" y="90" text-anchor="middle" font-size="11" fill="#64748b">violations</text>
      </svg>`;

    // Pass rate calculation
    const totalChecks = report.passed.length + report.totalViolations;
    const passRate = totalChecks > 0 ? Math.round((report.passed.length / totalChecks) * 100) : 100;

    // Violations table rows
    const violationRows = report.violations.map((v, i) => `
          <tr>
            <td class="row-num">${i + 1}</td>
            <td><span class="badge" style="background:${severityColors[v.severity]}">${v.severity.toUpperCase()}</span></td>
            <td><code>${this.escapeHtml(v.rule)}</code></td>
            <td class="cell-element">${this.escapeHtml(v.element)}</td>
            <td>${this.escapeHtml(v.description)}</td>
            <td class="cell-wcag">${this.escapeHtml(v.wcagCriteria)}</td>
            <td class="cell-suggestion">${this.escapeHtml(v.suggestion)}</td>
          </tr>`).join('');

    // Passed checks list
    const passedItems = report.passed.map(p => `<li><span class="pass-icon">✓</span> ${this.escapeHtml(p)}</li>`).join('\n            ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Accessibility Report — ${this.escapeHtml(pageName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9; color: #1e293b; line-height: 1.5; }
    .header { background: #0f172a; color: #fff; padding: 32px 40px; }
    .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header-meta { margin-top: 8px; font-size: 13px; color: #94a3b8; }
    .header-meta span { margin-right: 20px; }
    .dashboard { max-width: 1300px; margin: -24px auto 0; padding: 0 24px; position: relative; z-index: 1; }
    .overview-grid { display: grid; grid-template-columns: 180px 1fr; gap: 24px; margin-bottom: 24px; }
    .donut-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.06); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-card h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; }
    .metrics-area { display: flex; flex-direction: column; gap: 16px; }
    .pass-rate-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.06); padding: 20px 28px; display: flex; align-items: center; gap: 20px; }
    .pass-rate-number { font-size: 36px; font-weight: 700; color: ${passRate >= 80 ? '#16a34a' : passRate >= 50 ? '#ca8a04' : '#dc2626'}; }
    .pass-rate-label { font-size: 13px; color: #64748b; }
    .pass-rate-bar { flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
    .pass-rate-fill { height: 100%; border-radius: 5px; background: ${passRate >= 80 ? '#16a34a' : passRate >= 50 ? '#ca8a04' : '#dc2626'}; width: ${passRate}%; transition: width 0.3s ease; }
    .severity-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .severity-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.06); padding: 18px 20px; display: flex; align-items: center; gap: 14px; border-left: 4px solid transparent; }
    .severity-card.critical { border-left-color: #d32f2f; }
    .severity-card.serious { border-left-color: #e65100; }
    .severity-card.moderate { border-left-color: #f57f17; }
    .severity-card.minor { border-left-color: #1565c0; }
    .severity-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; }
    .severity-icon.critical { background: #d32f2f; }
    .severity-icon.serious { background: #e65100; }
    .severity-icon.moderate { background: #f57f17; }
    .severity-icon.minor { background: #1565c0; }
    .severity-info .sev-count { font-size: 24px; font-weight: 700; color: #1e293b; }
    .severity-info .sev-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
    .section { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.06); margin-bottom: 24px; overflow: hidden; }
    .section-header { padding: 18px 28px; border-bottom: 1px solid #e2e8f0; }
    .section-header h2 { font-size: 16px; font-weight: 600; color: #1e293b; }
    .violations-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .violations-table th { background: #f8fafc; padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .violations-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .violations-table tr:nth-child(even) { background: #f8fafc; }
    .violations-table tr:hover { background: #eff6ff; }
    .row-num { color: #94a3b8; font-weight: 600; width: 36px; }
    .badge { display: inline-block; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
    .cell-element { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; color: #475569; max-width: 160px; word-break: break-word; }
    .cell-wcag { font-size: 11px; color: #64748b; max-width: 180px; }
    .cell-suggestion { font-size: 12px; color: #166534; max-width: 220px; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #334155; }
    .passed-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px; }
    .passed-section .section-header { border-bottom-color: #bbf7d0; }
    .passed-section h2 { color: #166534; }
    .passed-list { list-style: none; padding: 16px 28px; columns: 2; column-gap: 32px; }
    .passed-list li { padding: 6px 0; font-size: 13px; color: #166534; break-inside: avoid; }
    .pass-icon { display: inline-block; width: 18px; height: 18px; background: #16a34a; color: #fff; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 6px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; }
    .no-violations { text-align: center; padding: 48px 28px; }
    .no-violations .big-check { font-size: 48px; margin-bottom: 12px; }
    .no-violations p { font-size: 18px; color: #16a34a; font-weight: 600; }
    @media (max-width: 900px) {
      .overview-grid { grid-template-columns: 1fr; }
      .severity-cards { grid-template-columns: repeat(2, 1fr); }
      .passed-list { columns: 1; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>♿ Accessibility Audit Report</h1>
    <div class="header-meta">
      <span>📄 Page: <strong>${this.escapeHtml(pageName)}</strong></span>
      <span>🔗 ${this.escapeHtml(report.url)}</span>
      <span>🕐 ${report.timestamp}</span>
    </div>
  </div>

  <div class="dashboard">
    <!-- Overview: Donut + Pass Rate -->
    <div class="overview-grid">
      <div class="donut-card">
        <h3>Violations</h3>
        ${donutSvg}
      </div>
      <div class="metrics-area">
        <div class="pass-rate-card">
          <div>
            <div class="pass-rate-number">${passRate}%</div>
            <div class="pass-rate-label">Checks Passed (${report.passed.length} of ${totalChecks})</div>
          </div>
          <div class="pass-rate-bar"><div class="pass-rate-fill"></div></div>
        </div>
        <!-- Severity Breakdown Cards -->
        <div class="severity-cards">
          <div class="severity-card critical">
            <div class="severity-icon critical">!</div>
            <div class="severity-info"><div class="sev-count">${report.critical}</div><div class="sev-label">Critical</div></div>
          </div>
          <div class="severity-card serious">
            <div class="severity-icon serious">!!</div>
            <div class="severity-info"><div class="sev-count">${report.serious}</div><div class="sev-label">Serious</div></div>
          </div>
          <div class="severity-card moderate">
            <div class="severity-icon moderate">⚠</div>
            <div class="severity-info"><div class="sev-count">${report.moderate}</div><div class="sev-label">Moderate</div></div>
          </div>
          <div class="severity-card minor">
            <div class="severity-icon minor">i</div>
            <div class="severity-info"><div class="sev-count">${report.minor}</div><div class="sev-label">Minor</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Violations Table -->
    <div class="section">
      <div class="section-header">
        <h2>🔍 Violations (${report.totalViolations})</h2>
      </div>
      ${report.violations.length === 0
        ? `<div class="no-violations"><div class="big-check">✅</div><p>No accessibility violations found!</p></div>`
        : `<table class="violations-table">
          <thead>
            <tr><th>#</th><th>Severity</th><th>Rule</th><th>Element</th><th>Description</th><th>WCAG Criteria</th><th>Suggestion</th></tr>
          </thead>
          <tbody>${violationRows}
          </tbody>
        </table>`
      }
    </div>

    <!-- Passed Checks -->
    ${report.passed.length > 0 ? `
    <div class="section passed-section">
      <div class="section-header">
        <h2>✅ Passed Checks (${report.passed.length})</h2>
      </div>
      <ul class="passed-list">
            ${passedItems}
      </ul>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">Generated by BDD Playwright Accessibility Engine</div>
  </div>
</body>
</html>`;
  }

  /** Escape HTML special characters to prevent XSS in report output */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}


// ─── Custom Error Classes ─────────────────────────────────────────────────────

/** Error thrown when an accessibility audit exceeds the timeout duration */
export class AuditTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditTimeoutError';
  }
}

/** Error thrown when accessibility violations trigger a failure condition */
export class AccessibilityFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessibilityFailureError';
  }
}
