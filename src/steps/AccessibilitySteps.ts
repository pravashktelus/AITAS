import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';

// =============================================================================
// ACCESSIBILITY STEP DEFINITIONS  (WCAG 2.1 / ARIA)
// =============================================================================
// Steps for running accessibility audits, checking ARIA roles,
// keyboard navigation, focus indicators, color contrast, and more.
//
// TAG:  Add @accessibility or @a11y to your scenario.
//
// USAGE EXAMPLES:
//   When I run an accessibility audit
//   Then the page should have no critical accessibility violations
//   Then the page should have no accessibility violations
//   When I check keyboard navigation
//   Then all interactive elements should be keyboard reachable
//   Then the element 'Login.SubmitButton' should have a focus indicator
//   When I get the ARIA snapshot
// =============================================================================

// ─── Full Page Audit ──────────────────────────────────────────────────────────

When(
  /^I run an accessibility audit(?: on ['"](.+)['"])?$/,
  async function (this: CustomWorld, pageName?: string) {
    const name = pageName || this.scenarioName.replace(/\s+/g, '-').substring(0, 40);
    const report = await this.accessibilityEngine.auditPage(name);
    DataStore.set('a11yReport', report);
    DataStore.set('a11yViolations', report.violations);
    DataStore.set('a11yViolationCount', report.totalViolations);

    // Attach HTML report to cucumber output
    await this.attach(report.htmlReport, 'text/html');

    Logger.info(
      `Accessibility audit: ${report.totalViolations} total violations ` +
      `(${report.critical} critical, ${report.serious} serious, ` +
      `${report.moderate} moderate, ${report.minor} minor)`
    );
  }
);

// ─── Violation Threshold Assertions ──────────────────────────────────────────

Then(
  /^the page should have no (?:critical )?accessibility violations$/,
  async function (this: CustomWorld) {
    const report = DataStore.get('a11yReport') as any;
    if (!report) {
      throw new Error('No accessibility audit has been run. Add "When I run an accessibility audit" before this step.');
    }
    if (report.critical > 0) {
      const criticals = report.violations
        .filter((v: any) => v.severity === 'critical')
        .map((v: any) => `  • [${v.rule}] ${v.element}: ${v.description}`)
        .join('\n');
      throw new Error(
        `${report.critical} critical accessibility violation(s) found:\n${criticals}`
      );
    }
    Logger.info('✓ No critical accessibility violations');
  }
);

Then(
  /^the page should have no accessibility violations$/,
  async function (this: CustomWorld) {
    const report = DataStore.get('a11yReport') as any;
    if (!report) {
      throw new Error('No accessibility audit has been run. Add "When I run an accessibility audit" before this step.');
    }
    if (report.totalViolations > 0) {
      const list = report.violations
        .map((v: any) => `  • [${v.severity}][${v.rule}] ${v.element}: ${v.description}`)
        .join('\n');
      throw new Error(
        `${report.totalViolations} accessibility violation(s) found:\n${list}`
      );
    }
    Logger.info('✓ No accessibility violations');
  }
);

Then(
  /^the page should have fewer than (\d+) accessibility violations$/,
  async function (this: CustomWorld, maxCount: string) {
    const report = DataStore.get('a11yReport') as any;
    if (!report) throw new Error('No accessibility audit has been run.');
    const max = parseInt(maxCount);
    if (report.totalViolations >= max) {
      throw new Error(
        `Expected fewer than ${max} violations but found ${report.totalViolations}`
      );
    }
    Logger.info(`✓ Accessibility violations (${report.totalViolations}) are within threshold (< ${max})`);
  }
);

Then(
  /^the accessibility violation count should be stored as ['"](.+)['"]$/,
  async function (this: CustomWorld, variableName: string) {
    const count = DataStore.get('a11yViolationCount') ?? 0;
    DataStore.set(variableName, count);
    Logger.info(`Stored violation count (${count}) as "${variableName}"`);
  }
);

// ─── Element-Level Accessibility ─────────────────────────────────────────────

Then(
  /^(?:the )?(?:element )?['"](.+)['"] should be accessible$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const selector = await locator.evaluate(el => {
      const id = el.id;
      const testId = el.getAttribute('data-testid');
      return testId ? `[data-testid="${testId}"]` : id ? `#${id}` : el.tagName.toLowerCase();
    });
    const violations = await this.accessibilityEngine.auditElement(selector);
    if (violations.length > 0) {
      const list = violations.map(v => `  • [${v.rule}] ${v.description}`).join('\n');
      throw new Error(`Accessibility issues found on "${elementRef}":\n${list}`);
    }
    Logger.info(`✓ Element "${elementRef}" is accessible`);
  }
);

Then(
  /^(?:the )?(?:element )?['"](.+)['"] should have (?:an? )?(?:accessible )?(?:name|label)$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const ariaLabel      = await locator.getAttribute('aria-label');
    const ariaLabelledBy = await locator.getAttribute('aria-labelledby');
    const innerText      = (await locator.innerText().catch(() => '')).trim();
    const title          = await locator.getAttribute('title');

    if (!ariaLabel && !ariaLabelledBy && !innerText && !title) {
      throw new Error(
        `Element "${elementRef}" has no accessible name. ` +
        `Add aria-label, aria-labelledby, visible text, or title attribute.`
      );
    }
    const name = ariaLabel || ariaLabelledBy || innerText || title;
    Logger.info(`✓ Element "${elementRef}" has accessible name: "${name}"`);
  }
);

Then(
  /^(?:the )?(?:element )?['"](.+)['"] should have aria role ['"](.+)['"]$/,
  async function (this: CustomWorld, elementRef: string, expectedRole: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const role = await locator.getAttribute('role');
    const tagName = await locator.evaluate(el => el.tagName.toLowerCase());

    // Check implicit roles too
    const implicitRoles: Record<string, string> = {
      button: 'button', a: 'link', input: 'textbox',
      nav: 'navigation', main: 'main', header: 'banner',
      footer: 'contentinfo', form: 'form',
    };
    const effectiveRole = role || implicitRoles[tagName] || 'none';

    if (effectiveRole !== expectedRole) {
      throw new Error(
        `Element "${elementRef}" has role "${effectiveRole}" but expected "${expectedRole}"`
      );
    }
    Logger.info(`✓ Element "${elementRef}" has expected role "${expectedRole}"`);
  }
);

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

When(
  /^I check keyboard navigation$/,
  async function (this: CustomWorld) {
    const result = await this.accessibilityEngine.checkKeyboardNavigation();
    DataStore.set('keyboardNav', result);
    Logger.info(
      `Keyboard navigation: ${result.reachable} reachable, ` +
      `${result.unreachable.length} unreachable elements`
    );
  }
);

Then(
  /^all interactive elements should be keyboard (?:reachable|accessible)$/,
  async function (this: CustomWorld) {
    const result = DataStore.get('keyboardNav') as any;
    if (!result) throw new Error('Run "When I check keyboard navigation" first.');
    if (result.unreachable.length > 0) {
      throw new Error(
        `${result.unreachable.length} interactive element(s) are not keyboard-reachable:\n` +
        result.unreachable.map((el: string) => `  • ${el}`).join('\n')
      );
    }
    Logger.info(`✓ All ${result.reachable} interactive elements are keyboard-reachable`);
  }
);

Then(
  /^keyboard unreachable element count should be (?:less than|under) (\d+)$/,
  async function (this: CustomWorld, maxCount: string) {
    const result = DataStore.get('keyboardNav') as any;
    if (!result) throw new Error('Run "When I check keyboard navigation" first.');
    const max = parseInt(maxCount);
    if (result.unreachable.length >= max) {
      throw new Error(
        `Found ${result.unreachable.length} keyboard-unreachable elements (limit: ${max}):\n` +
        result.unreachable.map((el: string) => `  • ${el}`).join('\n')
      );
    }
    Logger.info(`✓ Keyboard-unreachable elements (${result.unreachable.length}) within limit (< ${max})`);
  }
);

// ─── Focus Indicator ─────────────────────────────────────────────────────────

Then(
  /^(?:the )?(?:element )?['"](.+)['"] should have a(?:n? visible)? focus indicator$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const selector = await locator.evaluate(el => {
      const testId = el.getAttribute('data-testid');
      return testId ? `[data-testid="${testId}"]` : el.tagName.toLowerCase();
    });
    const hasFocusIndicator = await this.accessibilityEngine.checkFocusIndicator(selector);
    if (!hasFocusIndicator) {
      throw new Error(
        `Element "${elementRef}" has no visible focus indicator. ` +
        `Add CSS :focus outline or box-shadow styles. (WCAG 2.4.7)`
      );
    }
    Logger.info(`✓ Focus indicator visible for "${elementRef}"`);
  }
);

// ─── Heading & Structure ──────────────────────────────────────────────────────

Then(
  /^the page should have (?:a )?(?:single )?(?:main )?h1 heading$/,
  async function (this: CustomWorld) {
    const h1Count = await this.contextManager.getPage().locator('h1').count();
    if (h1Count === 0) throw new Error('Page has no h1 heading (WCAG 2.4.6)');
    if (h1Count > 1) throw new Error(`Page has ${h1Count} h1 headings — use only one per page (WCAG 2.4.6)`);
    Logger.info('✓ Page has exactly one h1 heading');
  }
);

Then(
  /^the page should have proper heading structure$/,
  async function (this: CustomWorld) {
    const headings = await this.contextManager.getPage().locator('h1, h2, h3, h4, h5, h6').all();
    const levels: number[] = [];
    for (const h of headings) {
      const tag = await h.evaluate(el => el.tagName.toLowerCase());
      levels.push(parseInt(tag.replace('h', '')));
    }
    const violations: string[] = [];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        violations.push(`h${levels[i - 1]} → h${levels[i]} (skipped level)`);
      }
    }
    if (violations.length > 0) {
      throw new Error(`Heading hierarchy violations:\n${violations.map(v => `  • ${v}`).join('\n')}`);
    }
    Logger.info(`✓ Heading hierarchy is correct (${levels.length} headings, ${levels.join(' → ')})`);
  }
);

Then(
  /^the page should have (?:a )?(?:main|navigation|header|footer) landmark$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const checks = [
      { selector: 'main, [role="main"]',                label: '<main>',   wcag: '2.4.1' },
      { selector: 'nav, [role="navigation"]',           label: '<nav>',    wcag: '2.4.1' },
      { selector: 'header, [role="banner"]',            label: '<header>', wcag: 'Best Practice' },
      { selector: 'footer, [role="contentinfo"]',       label: '<footer>', wcag: 'Best Practice' },
    ];
    const missing: string[] = [];
    for (const check of checks) {
      const count = await page.locator(check.selector).count();
      if (count === 0) missing.push(`${check.label} (WCAG ${check.wcag})`);
    }
    if (missing.length > 0) {
      Logger.warn(`Missing landmark regions: ${missing.join(', ')}`);
    } else {
      Logger.info('✓ All landmark regions present');
    }
  }
);

// ─── Image Alt Text ───────────────────────────────────────────────────────────

Then(
  /^all images should have alt (?:text|attributes)$/,
  async function (this: CustomWorld) {
    const images = await this.contextManager.getPage().locator('img').all();
    const missing: string[] = [];
    for (const img of images) {
      const alt  = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const isHidden = await img.isHidden();
      if (!isHidden && alt === null && role !== 'presentation' && role !== 'none') {
        const src = (await img.getAttribute('src') || 'unknown').substring(0, 50);
        missing.push(src);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `${missing.length} image(s) missing alt text (WCAG 1.1.1):\n` +
        missing.map(s => `  • ${s}`).join('\n')
      );
    }
    Logger.info(`✓ All ${images.length} images have alt text`);
  }
);

// ─── ARIA Snapshot ────────────────────────────────────────────────────────────

When(
  /^I get the (?:ARIA|accessibility) snapshot$/,
  async function (this: CustomWorld) {
    const snapshot = await this.accessibilityEngine.getAriaSnapshot();
    DataStore.set('ariaSnapshot', snapshot);
    await this.attach(snapshot, 'text/plain');
    Logger.info('ARIA snapshot captured and attached to report');
  }
);

Then(
  /^the ARIA snapshot should contain ['"](.+)['"]$/,
  async function (this: CustomWorld, expectedText: string) {
    const snapshot = DataStore.get('ariaSnapshot') as string;
    if (!snapshot) throw new Error('No ARIA snapshot found. Run "When I get the ARIA snapshot" first.');
    if (!snapshot.includes(expectedText)) {
      throw new Error(`ARIA snapshot does not contain "${expectedText}"`);
    }
    Logger.info(`✓ ARIA snapshot contains "${expectedText}"`);
  }
);


// ─── Touch Target Size ────────────────────────────────────────────────────────

Then(
  /^['"](.+)['"] should have an adequate touch target size$/,
  async function (this: CustomWorld, elementRef: string) {
    const locator = this.actionEngine.getLocator(elementRef);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Cannot measure touch target: element "${elementRef}" not found or hidden`);
    const minSize = 44;
    const issues: string[] = [];
    if (box.width < minSize) issues.push(`width ${Math.round(box.width)}px < ${minSize}px`);
    if (box.height < minSize) issues.push(`height ${Math.round(box.height)}px < ${minSize}px`);
    if (issues.length > 0) {
      throw new Error(
        `Touch target too small for "${elementRef}": ${issues.join(', ')} (WCAG 2.5.5 requires ≥ ${minSize}x${minSize}px)`
      );
    }
    Logger.info(`✓ Touch target size OK for "${elementRef}": ${Math.round(box.width)}x${Math.round(box.height)}px`);
  }
);

// ─── Color Contrast ───────────────────────────────────────────────────────────

Then(
  /^the page should have no (?:color )?contrast (?:issues|violations)$/,
  async function (this: CustomWorld) {
    const report = DataStore.get('a11yReport') as any;
    if (!report) throw new Error('No accessibility audit has been run. Add "When I run an accessibility audit" before this step.');
    const contrastViolations = report.violations.filter((v: any) => v.rule === 'color-contrast');
    if (contrastViolations.length > 0) {
      throw new Error(
        `${contrastViolations.length} color contrast issue(s) found (WCAG 1.4.3):\n` +
        contrastViolations.map((v: any) => `  • ${v.element}: ${v.description}`).join('\n')
      );
    }
    Logger.info('✓ No color contrast issues detected');
  }
);

// ─── Language Attribute ───────────────────────────────────────────────────────

Then(
  /^the page should have a(?:n html)? language attribute$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const lang = await page.locator('html').getAttribute('lang');
    if (!lang || lang.trim() === '') {
      throw new Error(
        'Page <html> element has no lang attribute (WCAG 3.1.1). ' +
        'Add lang="en" (or appropriate language code) to the <html> tag.'
      );
    }
    Logger.info(`✓ Page has language attribute: lang="${lang}"`);
  }
);

// ─── Link Purpose / Meaningful Link Text ──────────────────────────────────────

Then(
  /^all links should have (?:meaningful|descriptive) text$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const links = await page.locator('a[href]').all();
    const genericTexts = ['click here', 'here', 'read more', 'more', 'link', 'learn more'];
    const issues: string[] = [];

    for (const link of links) {
      const isHidden = await link.isHidden();
      if (isHidden) continue;

      const text = (await link.innerText().catch(() => '')).trim().toLowerCase();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      const effectiveText = text || ariaLabel || title || '';

      if (!effectiveText) {
        const href = (await link.getAttribute('href') || '').substring(0, 50);
        issues.push(`Empty link text: <a href="${href}">`);
      } else if (genericTexts.includes(effectiveText)) {
        issues.push(`Generic link text: "${effectiveText}"`);
      }
    }

    if (issues.length > 0) {
      throw new Error(
        `${issues.length} link(s) with unclear purpose (WCAG 2.4.4):\n` +
        issues.slice(0, 10).map(i => `  • ${i}`).join('\n')
      );
    }
    Logger.info(`✓ All ${links.length} links have meaningful text`);
  }
);

// ─── Skip Navigation Link ─────────────────────────────────────────────────────

Then(
  /^the page should have a skip (?:navigation|nav|to content) link$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const skipLink = await page.locator(
      'a[href="#main"], a[href="#content"], a[href="#main-content"], [class*="skip"], a:has-text("Skip")'
    ).count();
    if (skipLink === 0) {
      throw new Error(
        'No skip navigation link found (WCAG 2.4.1). ' +
        'Add a "Skip to main content" link as the first focusable element.'
      );
    }
    Logger.info('✓ Skip navigation link present');
  }
);

// ─── Tab Order Logic ──────────────────────────────────────────────────────────

Then(
  /^the tab order should be logical$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    // Check for positive tabindex values which break natural DOM order
    const positiveTabindex = await page.locator('[tabindex]').all();
    const badTabindex: string[] = [];
    for (const el of positiveTabindex) {
      const value = await el.getAttribute('tabindex');
      if (value && parseInt(value) > 0) {
        const tag = await el.evaluate(e => e.tagName.toLowerCase());
        const id = await el.getAttribute('id');
        badTabindex.push(`${tag}${id ? '#' + id : ''} (tabindex="${value}")`);
      }
    }
    if (badTabindex.length > 0) {
      throw new Error(
        `${badTabindex.length} element(s) use positive tabindex which disrupts natural tab order (WCAG 2.4.3):\n` +
        badTabindex.map(el => `  • ${el}`).join('\n') +
        '\nUse tabindex="0" for focusable elements and tabindex="-1" for programmatic focus only.'
      );
    }
    Logger.info('✓ Tab order is logical (no positive tabindex values found)');
  }
);

// ─── Form Error Identification ────────────────────────────────────────────────

Then(
  /^form errors should be (?:identified|described) in text$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    // Look for inputs with aria-invalid or inputs in error state
    const invalidInputs = await page.locator('[aria-invalid="true"], .error input, .invalid input, input.error, input.invalid, input:invalid').all();
    const issues: string[] = [];

    for (const input of invalidInputs) {
      const isHidden = await input.isHidden();
      if (isHidden) continue;

      const ariaDescribedBy = await input.getAttribute('aria-describedby');
      const ariaErrorMessage = await input.getAttribute('aria-errormessage');
      const id = await input.getAttribute('id');

      // Check if there's an associated error message
      if (!ariaDescribedBy && !ariaErrorMessage) {
        const name = await input.getAttribute('name') || await input.getAttribute('aria-label') || id || 'unknown';
        issues.push(`Input "${name}" is in error state but has no aria-describedby or aria-errormessage`);
      }
    }

    if (issues.length > 0) {
      throw new Error(
        `${issues.length} form input(s) have errors without text description (WCAG 3.3.1):\n` +
        issues.map(i => `  • ${i}`).join('\n')
      );
    }
    Logger.info(`✓ All form errors are properly identified in text`);
  }
);

// ─── Video/Audio Captions ─────────────────────────────────────────────────────

Then(
  /^(?:all )?(?:videos?|media) should have (?:captions|subtitles)$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const videos = await page.locator('video').all();
    const issues: string[] = [];

    for (const video of videos) {
      const trackCount = await video.locator('track[kind="captions"], track[kind="subtitles"]').count();
      if (trackCount === 0) {
        const src = (await video.getAttribute('src') || await video.locator('source').first().getAttribute('src') || 'unknown').substring(0, 50);
        issues.push(`<video src="${src}"> has no <track kind="captions"> element`);
      }
    }

    if (issues.length > 0) {
      throw new Error(
        `${issues.length} video(s) missing captions (WCAG 1.2.2):\n` +
        issues.map(i => `  • ${i}`).join('\n')
      );
    }
    Logger.info(`✓ All ${videos.length} video(s) have captions`);
  }
);

// ─── Animation / Reduced Motion ───────────────────────────────────────────────

Then(
  /^the page should respect (?:reduced motion|prefers-reduced-motion)$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    // Check if any element has animation/transition without prefers-reduced-motion media query
    const hasReducedMotionQuery = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSMediaRule && rule.conditionText?.includes('prefers-reduced-motion')) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheet — skip
        }
      }
      return false;
    });

    const animatedElements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      let count = 0;
      for (const el of all) {
        const style = window.getComputedStyle(el);
        if (style.animationName !== 'none' || (style.transitionDuration !== '0s' && style.transitionProperty !== 'none')) {
          count++;
        }
      }
      return count;
    });

    if (animatedElements > 0 && !hasReducedMotionQuery) {
      Logger.warn(
        `Page has ${animatedElements} animated element(s) but no @media (prefers-reduced-motion) query detected. ` +
        `Consider adding reduced-motion styles (WCAG 2.3.3).`
      );
    } else if (animatedElements > 0 && hasReducedMotionQuery) {
      Logger.info(`✓ Page has animations and respects prefers-reduced-motion`);
    } else {
      Logger.info('✓ No significant animations detected on page');
    }
  }
);

// ─── Severity-Specific Violation Assertions ───────────────────────────────────

Then(
  /^the page should have no (serious|moderate|minor) accessibility violations$/,
  async function (this: CustomWorld, severity: string) {
    const report = DataStore.get('a11yReport') as any;
    if (!report) throw new Error('No accessibility audit has been run.');
    const count = report[severity] || 0;
    if (count > 0) {
      const violations = report.violations
        .filter((v: any) => v.severity === severity)
        .map((v: any) => `  • [${v.rule}] ${v.element}: ${v.description}`)
        .join('\n');
      throw new Error(`${count} ${severity} accessibility violation(s) found:\n${violations}`);
    }
    Logger.info(`✓ No ${severity} accessibility violations`);
  }
);

// ─── WCAG Level-Specific Audit ────────────────────────────────────────────────

When(
  /^I run a(?:n)? (?:WCAG )?(?:level )?(A|AA|AAA) accessibility audit(?: on ['"](.+)['"])?$/,
  async function (this: CustomWorld, level: string, pageName?: string) {
    const name = pageName || this.scenarioName.replace(/\s+/g, '-').substring(0, 40);
    const wcagLevel = level as 'A' | 'AA' | 'AAA';
    const report = await this.accessibilityEngine.auditPageWithLevel(name, wcagLevel);
    DataStore.set('a11yReport', report);
    DataStore.set('a11yViolations', report.violations);
    DataStore.set('a11yViolationCount', report.totalViolations);
    await this.attach(report.htmlReport, 'text/html');
    Logger.info(
      `WCAG ${level} audit: ${report.totalViolations} violations ` +
      `(${report.critical} critical, ${report.serious} serious, ${report.moderate} moderate, ${report.minor} minor)`
    );
  }
);

// ─── Viewport Responsive Check ────────────────────────────────────────────────

Then(
  /^the page should not have horizontal scroll(?:bar|ing)?$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const viewport = page.viewportSize();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    if (viewport && scrollWidth > viewport.width) {
      throw new Error(
        `Page has horizontal scrolling: scrollWidth (${scrollWidth}px) > viewport width (${viewport.width}px). ` +
        `Content should reflow within viewport (WCAG 1.4.10 Reflow).`
      );
    }
    Logger.info('✓ No horizontal scrolling detected');
  }
);

// ─── Auto-Complete Attribute ──────────────────────────────────────────────────

Then(
  /^(?:all )?(?:form )?inputs should have autocomplete attributes$/,
  async function (this: CustomWorld) {
    const page = this.contextManager.getPage();
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="tel"], input[type="password"], input[type="url"]').all();
    const missing: string[] = [];

    for (const input of inputs) {
      const isHidden = await input.isHidden();
      if (isHidden) continue;

      const autocomplete = await input.getAttribute('autocomplete');
      if (!autocomplete || autocomplete === 'off') {
        const name = await input.getAttribute('name') || await input.getAttribute('id') || await input.getAttribute('aria-label') || 'unknown';
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      Logger.warn(
        `${missing.length} input(s) missing autocomplete attribute (WCAG 1.3.5):\n` +
        missing.slice(0, 10).map(n => `  • ${n}`).join('\n')
      );
    } else {
      Logger.info(`✓ All inputs have autocomplete attributes`);
    }
  }
);
