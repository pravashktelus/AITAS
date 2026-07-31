import { Page, Locator } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { OpenAIClient } from '../utils/OpenAIClient';
import { ElementResolver } from './ElementResolver';
import { HealingResult, LocatorCandidate, MatchedElementDetails } from './HealingResult';

// Automatically attempts to fix broken element locators using priority-based fallback strategies and optional OpenAI assistance.
export class SelfHealingEngine {
  private page: Page;
  private locatorCache: Map<string, string> = new Map();
  private healingDetails: Map<string, HealingResult> = new Map();
  private xpathCache: Map<string, string[]> = new Map();
  private attachCallback: ((buffer: Buffer, mimeType: string) => Promise<void>) | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  public setAttachCallback(callback: (buffer: Buffer, mimeType: string) => Promise<void>): void {
    this.attachCallback = callback;
  }

  async findElementWithHealing(
    originalReference: string,
    action: string
  ): Promise<{ element: Locator | null; healingResult: HealingResult }> {
    Logger.debug(`SelfHealing: Finding element with reference: ${originalReference}`);

    const resolvedLocator = this._resolveReference(originalReference);

    if (this.locatorCache.has(originalReference)) {
      const cachedSelector = this.locatorCache.get(originalReference)!;
      const cachedElement = this._buildLocator(cachedSelector);
      try {
        if (await cachedElement.isVisible()) {
          return {
            element: cachedElement,
            healingResult: this._buildSuccessResult(
              originalReference,
              resolvedLocator,
              cachedSelector,
              'Cache hit: previously healed locator still works.'
            ),
          };
        }
      } catch {
        // Cache entry is stale, continue to healing
      }
    }

    const element = this._buildLocator(resolvedLocator);
    if (await this.isElementAccessible(element)) {
      return {
        element,
        healingResult: this._buildSuccessResult(
          originalReference,
          resolvedLocator,
          resolvedLocator,
          'Original resolved locator succeeded on first attempt.'
        ),
      };
    }

    Logger.warn(
      `Original locator failed: ${resolvedLocator} (from ref: ${originalReference}). Attempting self-healing...`
    );

    const xpathAlternatives = await this._extractAndCacheXPaths(originalReference, resolvedLocator);
    
    if (xpathAlternatives && xpathAlternatives.length > 0) {
      for (const xpath of xpathAlternatives) {
        try {
          const xpathElement = this._buildLocator(xpath);
          if (await this.isElementAccessible(xpathElement)) {
            Logger.info(`✓ Found element using generated XPath: ${xpath}`);
            
            return {
              element: xpathElement,
              healingResult: {
                referenceName: originalReference,
                originalLocator: resolvedLocator,
                healingStatus: 'SUCCESS',
                confidence: 90,
                reason: `Original locator "${resolvedLocator}" failed. Succeeded with generated XPath strategy.`,
                bestLocator: {
                  type: 'xpath',
                  locator: xpath,
                  rawSelector: xpath,
                  confidence: 90,
                },
                fallbackLocators: xpathAlternatives.slice(1).map(x => ({
                  type: 'xpath',
                  locator: x,
                  rawSelector: x,
                  confidence: 80,
                })),
                matchedElementDetails: null,
              },
            };
          }
        } catch {
          // This XPath didn't work, try next
        }
      }
    }

    const focusedDOM = await this._extractFocusedDOM(resolvedLocator);

    // ─── Fuzzy data-testid matching (high confidence, no API call) ────────────
    // If the original locator references a data-testid, find DOM elements with similar testids
    const testIdMatch = resolvedLocator.match(/data-testid=['"]([^'"]+)['"]/);
    if (testIdMatch) {
      const brokenTestId = testIdMatch[1];
      const fuzzyMatches = await this.page.evaluate((broken: string) => {
        const allWithTestId = Array.from(document.querySelectorAll('[data-testid]'));
        const matches: { testId: string; tag: string; text: string; score: number }[] = [];

        // Split broken testid into parts for word-level matching
        const brokenParts = broken.split(/[-_]/).filter(p => p.length > 0);

        for (const el of allWithTestId) {
          const tid = el.getAttribute('data-testid') || '';
          if (tid === broken) continue; // Skip exact match (it would have worked)

          let score = 0;

          // Strategy 1: broken is substring of actual (e.g. 'stat-total' in 'stat-total-orders')
          if (tid.includes(broken)) {
            score = 90;
          }
          // Strategy 2: actual is substring of broken
          else if (broken.includes(tid)) {
            score = 85;
          }
          // Strategy 3: word-level matching — count how many parts of broken appear in actual
          else {
            const tidParts = tid.split(/[-_]/).filter(p => p.length > 0);
            let matchedParts = 0;
            for (const part of brokenParts) {
              if (tidParts.some(tp => tp.includes(part) || part.includes(tp))) {
                matchedParts++;
              }
            }
            // Need at least 50% of broken parts to match AND share same tag type hints
            if (matchedParts > 0 && matchedParts >= brokenParts.length * 0.5) {
              score = 70 + (matchedParts / brokenParts.length) * 20;
            }
          }

          if (score > 0) {
            matches.push({
              testId: tid,
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().substring(0, 50),
              score,
            });
          }
        }

        // Sort by score descending
        return matches.sort((a, b) => b.score - a.score);
      }, brokenTestId);

      if (fuzzyMatches.length > 0) {
        // Extract expected tag from original locator if possible (e.g. //div → 'div')
        const expectedTagMatch = resolvedLocator.match(/^\/\/(\w+)/);
        const expectedTag = expectedTagMatch ? expectedTagMatch[1].toLowerCase() : '';

        for (const match of fuzzyMatches) {
          // Filter: only match same element tag type if we know it
          if (expectedTag && match.tag !== expectedTag) continue;

          const candidateSelector = `//${match.tag}[@data-testid='${match.testId}']`;
          try {
            const candidateElement = this._buildLocator(candidateSelector);
            if (await this.isElementAccessible(candidateElement)) {
              Logger.info(`✓ Fuzzy data-testid match! '${brokenTestId}' → '${match.testId}'`);

              this.locatorCache.set(originalReference, candidateSelector);
              const matchedDetails = await this._extractElementDetails(candidateElement);

              const healingResult: HealingResult = {
                referenceName: originalReference,
                originalLocator: resolvedLocator,
                healingStatus: 'SUCCESS',
                confidence: 95,
                reason: `Original locator "${resolvedLocator}" failed. Healed via fuzzy data-testid match: '${brokenTestId}' → '${match.testId}'.`,
                bestLocator: {
                  type: 'data-testid',
                  locator: `page.getByTestId('${match.testId}')`,
                  rawSelector: candidateSelector,
                  confidence: 95,
                },
                fallbackLocators: [],
                matchedElementDetails: matchedDetails,
              };

              this.healingDetails.set(originalReference, healingResult);

              // Highlight healed element
              try {
                await candidateElement.evaluate((el) => {
                  (el as HTMLElement).style.border = '4px solid #00FF00';
                  (el as HTMLElement).style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.9), inset 0 0 10px rgba(0, 255, 0, 0.3)';
                  (el as HTMLElement).style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
                  (el as HTMLElement).style.outline = '3px dashed #00CC00';
                });

                await this.page.evaluate((info: { broken: string; healed: string }) => {
                  const legend = document.createElement('div');
                  legend.id = '__self_healing_legend__';
                  legend.innerHTML = `
                    <div style="position:fixed;top:10px;right:10px;z-index:99999;background:#1a1a2e;color:white;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                      <div style="margin-bottom:6px;font-weight:bold;font-size:13px;">🔧 Self-Healing Report</div>
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="display:inline-block;width:14px;height:14px;background:#FF0000;border-radius:2px;"></span>
                        <span>Failed: data-testid='${info.broken}'</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span style="display:inline-block;width:14px;height:14px;background:#00FF00;border-radius:2px;"></span>
                        <span>Healed: data-testid='${info.healed}'</span>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(legend);
                }, { broken: brokenTestId, healed: match.testId });

                await this.page.waitForTimeout(500);
                const screenshotBuffer = await this.page.screenshot({ fullPage: false });

                if (this.attachCallback) {
                  await this.attachCallback(screenshotBuffer, 'image/png');
                }

                // Cleanup
                await candidateElement.evaluate((el) => {
                  (el as HTMLElement).style.border = '';
                  (el as HTMLElement).style.boxShadow = '';
                  (el as HTMLElement).style.backgroundColor = '';
                  (el as HTMLElement).style.outline = '';
                });
                await this.page.evaluate(() => {
                  const legend = document.getElementById('__self_healing_legend__');
                  if (legend) legend.remove();
                });
              } catch (highlightError) {
                Logger.warn(`Failed to highlight fuzzy-matched element: ${highlightError}`);
              }

              return { element: candidateElement, healingResult };
            }
          } catch {
            // This fuzzy match didn't work, try next
          }
        }
      }
    }

    const openAISuggestions = await this._getOpenAISuggestionsWithCleanedDOM(
      originalReference,
      resolvedLocator,
      focusedDOM
    );

    const prioritizedCandidates = this._generatePrioritizedLocators(resolvedLocator, focusedDOM);

    const allCandidates = [...this._openAISuggestionsToCandidate(openAISuggestions), ...prioritizedCandidates];

    for (const candidate of allCandidates) {
      try {
        const candidateElement = this._buildLocator(candidate.rawSelector);
        if (await this.isElementAccessible(candidateElement)) {
          Logger.info(
            `✓ Self-healed! New locator: ${candidate.rawSelector} (type: ${candidate.type}) for action: ${action}`
          );

          this.locatorCache.set(originalReference, candidate.rawSelector);

          const matchedDetails = await this._extractElementDetails(candidateElement);

          const remainingCandidates = allCandidates.filter((c) => c !== candidate).slice(0, 5);

          const healingResult: HealingResult = {
            referenceName: originalReference,
            originalLocator: resolvedLocator,
            healingStatus: 'SUCCESS',
            confidence: candidate.confidence,
            reason: `Original locator "${resolvedLocator}" failed. Healed using ${candidate.type} strategy.`,
            bestLocator: candidate,
            fallbackLocators: remainingCandidates,
            matchedElementDetails: matchedDetails,
          };

          this.healingDetails.set(originalReference, healingResult);

          // Highlight the healed element and capture screenshot
          try {
            const selector = candidate.rawSelector;

            // Use Playwright's built-in locator to highlight — works with all selector types
            await candidateElement.evaluate((el) => {
              (el as HTMLElement).style.border = '4px solid #00FF00';
              (el as HTMLElement).style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.9), inset 0 0 10px rgba(0, 255, 0, 0.3)';
              (el as HTMLElement).style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
              (el as HTMLElement).style.outline = '3px dashed #00CC00';
            });

            // Also highlight the FAILED locator area with red if possible (original element might have moved)
            try {
              const originalElement = this._buildLocator(resolvedLocator);
              if (await originalElement.count() > 0) {
                await originalElement.first().evaluate((el) => {
                  (el as HTMLElement).style.border = '4px solid #FF0000';
                  (el as HTMLElement).style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.9)';
                  (el as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
                  (el as HTMLElement).style.outline = '3px dashed #CC0000';
                });
              }
            } catch {
              // Original element no longer exists — expected, just skip
            }

            // Add a floating label indicating healed vs failed
            await this.page.evaluate((healedSelector: string) => {
              // Add legend overlay
              const legend = document.createElement('div');
              legend.id = '__self_healing_legend__';
              legend.innerHTML = `
                <div style="position:fixed;top:10px;right:10px;z-index:99999;background:#1a1a2e;color:white;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                  <div style="margin-bottom:6px;font-weight:bold;font-size:13px;">🔧 Self-Healing Report</div>
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span style="display:inline-block;width:14px;height:14px;background:#FF0000;border-radius:2px;"></span>
                    <span>Failed locator (original)</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="display:inline-block;width:14px;height:14px;background:#00FF00;border-radius:2px;"></span>
                    <span>Healed locator: ${healedSelector.substring(0, 50)}</span>
                  </div>
                </div>
              `;
              document.body.appendChild(legend);
            }, selector);

            // Wait for highlighting to be visible and rendered
            await this.page.waitForTimeout(500);

            // Capture screenshot with highlighted elements
            const screenshotBuffer = await this.page.screenshot({ fullPage: false });
            Logger.info(`Screenshot captured with highlighted elements for: ${originalReference}`);

            // Attach to report if callback is available
            if (this.attachCallback) {
              await this.attachCallback(screenshotBuffer, 'image/png');
              Logger.info(`Highlighted screenshot attached to report for: ${originalReference}`);
            }

            // Clean up — remove highlights and legend
            await candidateElement.evaluate((el) => {
              (el as HTMLElement).style.border = '';
              (el as HTMLElement).style.boxShadow = '';
              (el as HTMLElement).style.backgroundColor = '';
              (el as HTMLElement).style.outline = '';
            });
            await this.page.evaluate(() => {
              const legend = document.getElementById('__self_healing_legend__');
              if (legend) legend.remove();
            });
          } catch (error) {
            Logger.warn(`Failed to capture highlighted screenshot: ${error}`);
          }

          return {
            element: candidateElement,
            healingResult,
          };
        }
      } catch {
        // Candidate failed, try next
      }
    }

    Logger.error(
      `Self-healing failed for locator: ${resolvedLocator} (ref: ${originalReference}). No alternative found.`
    );

    return {
      element: null,
      healingResult: {
        referenceName: originalReference,
        originalLocator: resolvedLocator,
        healingStatus: 'FAILED',
        confidence: 0,
        reason: `Could not find alternative locator for "${resolvedLocator}". Tried ${allCandidates.length} candidates.`,
        bestLocator: null,
        fallbackLocators: allCandidates.slice(0, 5),
        matchedElementDetails: null,
      },
    };
  }

  async isElementAccessible(element: Locator): Promise<boolean> {
    try {
      const count = await element.count();
      if (count === 0) return false;

      return await element.first().isVisible().catch(() => false);
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.locatorCache.clear();
    this.healingDetails.clear();
    this.xpathCache.clear();
    Logger.debug('Self-healing cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.locatorCache.size,
      entries: Array.from(this.locatorCache.keys()),
    };
  }

  getDetailedHealingStats(): Array<{
    reference: string;
    originalLocator: string;
    healedLocator: string;
    type: string;
    confidence: number;
    reason: string;
    elementTag?: string;
    elementText?: string;
  }> {
    const results: Array<{
      reference: string;
      originalLocator: string;
      healedLocator: string;
      type: string;
      confidence: number;
      reason: string;
      elementTag?: string;
      elementText?: string;
    }> = [];

    for (const [reference, healingResult] of this.healingDetails.entries()) {
      if (healingResult.healingStatus === 'SUCCESS' && healingResult.bestLocator) {
        results.push({
          reference,
          originalLocator: healingResult.originalLocator,
          healedLocator: healingResult.bestLocator.rawSelector,
          type: healingResult.bestLocator.type,
          confidence: healingResult.bestLocator.confidence,
          reason: healingResult.reason,
          elementTag: healingResult.matchedElementDetails?.tag,
          elementText: healingResult.matchedElementDetails?.text,
        });
      }
    }

    return results;
  }

  private async _extractAndCacheXPaths(reference: string, locator: string): Promise<string[]> {
    try {
      const xpaths = await this.page.evaluate(
        (selector: string) => {
          let element: HTMLElement | null = null;

          try {
            element = document.querySelector(selector) as HTMLElement;
          } catch {
            const xpathResult = document.evaluate(
              selector,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            element = xpathResult.singleNodeValue as HTMLElement;
          }

          if (!element) {
            return null;
          }

          const paths = new Set<string>();

          if (element.id) {
            paths.add(`//*[@id='${element.id}']`);
          }

          const testId = element.getAttribute('data-testid');
          if (testId) {
            paths.add(`//*[@data-testid='${testId}']`);
          }

          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel) {
            paths.add(`//*[@aria-label='${ariaLabel}']`);
          }

          const className = element.className;
          if (className && typeof className === 'string' && className.trim()) {
            const classes = className.trim().split(/\s+/);
            if (classes.length > 0) {
              const classCondition = classes
                .map(c => `contains(@class, '${c}')`)
                .join(' and ');
              paths.add(`//${element.tagName.toLowerCase()}[${classCondition}]`);
            }
          }

          const text = (element.textContent || '').trim();
          if (text && text.length < 100 && text.length > 0) {
            paths.add(
              `//${element.tagName.toLowerCase()}[contains(text(), '${text.substring(0, 50)}')]`
            );
          }

          const name = element.getAttribute('name');
          if (name) {
            paths.add(`//${element.tagName.toLowerCase()}[@name='${name}']`);
          }

          const placeholder = element.getAttribute('placeholder');
          if (placeholder) {
            paths.add(
              `//${element.tagName.toLowerCase()}[@placeholder='${placeholder}']`
            );
          }

          const parent = element.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (el) => el.tagName === element.tagName
            );
            const index = siblings.indexOf(element) + 1;
            if (siblings.length > 1) {
              paths.add(
                `//${element.tagName.toLowerCase()}[${index}]`
              );
            }
          }

          return Array.from(paths);
        },
        locator
      );

      if (xpaths) {
        this.xpathCache.set(reference, xpaths);
        Logger.debug(`Extracted ${xpaths.length} XPath alternatives for reference: ${reference}`);
        return xpaths;
      }

      return [];
    } catch (error) {
      Logger.debug(`Failed to extract XPaths for reference ${reference}: ${error}`);
      return [];
    }
  }

  private async _getOpenAISuggestionsWithCleanedDOM(
    reference: string,
    originalLocator: string,
    cleanedDOM: string
  ): Promise<string[]> {
    try {
      const suggestion = await OpenAIClient.suggestSelfHeal(
        originalLocator,
        `Reference: ${reference}\nHTML:\n${cleanedDOM.substring(0, 1500)}`,
        'Element not found'
      );

      if (!suggestion) {
        return [];
      }

      const suggestions = suggestion
        .split('\n')
        .map((line: string) => {
          const cleaned = line
            .replace(/^[-*•\d.]\s*/, '')
            .replace(/^(CSS|XPath|Selector):\s*/i, '')
            .replace(/^`|`$/g, '')
            .trim();
          return cleaned;
        })
        .filter((s: string) => s && s.length > 3 && !s.startsWith('//') === false || s.startsWith('data-testid') || s.startsWith('[') || s.startsWith('#') || s.startsWith('text=') || s.startsWith('role=') || s.startsWith('//'));

      Logger.debug(`LLM suggested ${suggestions.length} locators for ${reference}`);
      return suggestions;
    } catch (error) {
      Logger.warn(`Failed to get LLM suggestions: ${error}`);
      return [];
    }
  }

  _resolveReference(reference: string): string {
    const isDotReference = /^[A-Z][A-Za-z0-9]+\.[A-Za-z0-9.]+$/.test(reference);
    if (isDotReference) {
      try {
        return ElementResolver.resolve(reference);
      } catch (error) {
        Logger.warn(`Failed to resolve reference "${reference}": ${error}`);
        return reference;
      }
    }
    return reference;
  }

  _buildLocator(rawLocator: string): Locator {
    if (rawLocator.startsWith('//') || rawLocator.startsWith('(//')) {
      return this.page.locator(rawLocator);
    }

    if (rawLocator.startsWith('text=')) {
      return this.page.locator(rawLocator);
    }

    if (rawLocator.startsWith('placeholder=')) {
      return this.page.getByPlaceholder(rawLocator.replace('placeholder=', ''));
    }

    if (rawLocator.startsWith('role=')) {
      const roleMatch = rawLocator.match(/^role=([a-z]+)(?:\[name='(.+?)'\])?/i);
      if (roleMatch) {
        const role = roleMatch[1] as any;
        const name = roleMatch[2];
        return name
          ? this.page.getByRole(role, { name })
          : this.page.getByRole(role);
      }
    }

    if (rawLocator.startsWith('data-testid=')) {
      return this.page.getByTestId(rawLocator.replace('data-testid=', ''));
    }

    return this.page.locator(rawLocator);
  }

  async _extractFocusedDOM(_resolvedLocator: string): Promise<string> {
    try {
      const result = await this.page.evaluate(() => {
        const body = document.body;
        if (!body) return '';

        const allElements = Array.from(body.querySelectorAll('*'));
        const relevant: string[] = [];

        for (const el of allElements) {
          const attrs: string[] = [];
          const testId = el.getAttribute('data-testid');
          const id = el.id;
          const role = el.getAttribute('role');
          const ariaLabel = el.getAttribute('aria-label');
          const placeholder = el.getAttribute('placeholder');

          if (testId) attrs.push(`data-testid="${testId}"`);
          if (id) attrs.push(`id="${id}"`);
          if (role) attrs.push(`role="${role}"`);
          if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);
          if (placeholder) attrs.push(`placeholder="${placeholder}"`);

          if (attrs.length > 0) {
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || '').trim().substring(0, 50);
            const className = el.className && typeof el.className === 'string'
              ? ` class="${el.className}"`
              : '';
            relevant.push(`<${tag}${className} ${attrs.join(' ')}>${text}</${tag}>`);
          }

          if (relevant.join('\n').length > 2000) break;
        }

        return relevant.join('\n').substring(0, 2000);
      });

      return result || '';
    } catch (error) {
      Logger.warn(`Failed to extract focused DOM: ${error}`);
      return '';
    }
  }

  _generatePrioritizedLocators(resolvedLocator: string, focusedDOM: string): LocatorCandidate[] {
    const candidates: LocatorCandidate[] = [];

    if (!focusedDOM) return candidates;

    const expectedTag = resolvedLocator.match(/^\/\/(\w+)/)?.[1] || '';

    const testIdMatches = focusedDOM.matchAll(/<(\w+)[^>]*data-testid="([^"]+)"[^>]*>([^<]*)/g);
    for (const match of testIdMatches) {
      const tag = match[1];
      const testId = match[2];
      if (expectedTag && tag !== expectedTag) continue;
      candidates.push({
        type: 'data-testid',
        locator: `page.getByTestId('${testId}')`,
        rawSelector: `data-testid=${testId}`,
        confidence: 97,
      });
    }

    const idMatches = focusedDOM.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g);
    for (const match of idMatches) {
      const idTag = match[1];
      const idVal = match[2];
      if (expectedTag && idTag !== expectedTag) continue;
      if (!this._isUnstableId(idVal)) {
        candidates.push({
          type: 'id',
          locator: `page.locator('#${idVal}')`,
          rawSelector: `#${idVal}`,
          confidence: 90,
        });
      }
    }

    const roleMatches = focusedDOM.matchAll(/role="([^"]+)"/g);
    for (const match of roleMatches) {
      const role = match[1];
      const nameMatch = focusedDOM.match(
        new RegExp(`role="${role}"[^>]*aria-label="([^"]+)"`)
      );
      if (nameMatch) {
        candidates.push({
          type: 'role',
          locator: `page.getByRole('${role}', { name: '${nameMatch[1]}' })`,
          rawSelector: `role=${role}[name='${nameMatch[1]}']`,
          confidence: 85,
        });
      } else {
        candidates.push({
          type: 'role',
          locator: `page.getByRole('${role}')`,
          rawSelector: `role=${role}`,
          confidence: 80,
        });
      }
    }

    const ariaLabelMatches = focusedDOM.matchAll(/aria-label="([^"]+)"/g);
    for (const match of ariaLabelMatches) {
      const label = match[1];
      candidates.push({
        type: 'label',
        locator: `page.getByLabel('${label}')`,
        rawSelector: `[aria-label="${label}"]`,
        confidence: 80,
      });
    }

    const placeholderMatches = focusedDOM.matchAll(/placeholder="([^"]+)"/g);
    for (const match of placeholderMatches) {
      const placeholder = match[1];
      candidates.push({
        type: 'placeholder',
        locator: `page.getByPlaceholder('${placeholder}')`,
        rawSelector: `placeholder=${placeholder}`,
        confidence: 75,
      });
    }

    const textMatches = focusedDOM.matchAll(/>([^<]{3,50})</g);
    const seenTexts = new Set<string>();
    for (const match of textMatches) {
      const text = match[1].trim();
      if (text && text.length >= 3 && text.length <= 50 && !seenTexts.has(text)) {
        seenTexts.add(text);
        candidates.push({
          type: 'text',
          locator: `page.locator('text=${text}')`,
          rawSelector: `text=${text}`,
          confidence: 70,
        });
      }
    }

    const classMatches = focusedDOM.matchAll(/class="([^"]+)"/g);
    const seenClasses = new Set<string>();
    for (const match of classMatches) {
      const classes = match[1].split(/\s+/);
      for (const cls of classes) {
        if (cls && !this._isUnstableClass(cls) && !seenClasses.has(cls)) {
          seenClasses.add(cls);
          const selector = `.${cls}`;
          if (!this._isUnstableSelector(selector)) {
            candidates.push({
              type: 'css',
              locator: `page.locator('.${cls}')`,
              rawSelector: selector,
              confidence: 55,
            });
          }
        }
      }
    }

    if (expectedTag === 'button') {
      const buttonTextMatches = focusedDOM.matchAll(/<button[^>]*>([^<]{2,50})<\/button>/g);
      for (const match of buttonTextMatches) {
        const text = match[1].trim();
        if (text) {
          candidates.push({
            type: 'role',
            locator: `page.getByRole('button', { name: '${text}' })`,
            rawSelector: `role=button[name='${text}']`,
            confidence: 88,
          });
        }
      }
    }

    const seen = new Set<string>();
    const deduped = candidates.filter((c) => {
      if (seen.has(c.rawSelector)) return false;
      seen.add(c.rawSelector);
      return true;
    });

    return deduped.sort((a, b) => b.confidence - a.confidence);
  }

  _isUnstableId(id: string): boolean {
    if (/[0-9a-f]{8}-[0-9a-f]{4}/i.test(id)) return true;
    if (/^\d{10,}$/.test(id)) return true;
    if (/^[a-f0-9]{8,}$/i.test(id) && !/[a-z]{3,}/i.test(id)) return true;
    return false;
  }

  _isUnstableClass(className: string): boolean {
    if (/^(css|sc|emotion|styled)-[a-z0-9]+$/i.test(className)) return true;
    if (/^[a-z]+-[a-z0-9]{5,}$/i.test(className)) return true;
    return false;
  }

  _isUnstableSelector(selector: string): boolean {
    if (/nth-(child|of-type)/i.test(selector)) return true;
    if ((selector.match(/>/g) || []).length > 4) return true;
    if (selector.length > 150) return true;
    return false;
  }

  async _extractElementDetails(element: Locator): Promise<MatchedElementDetails> {
    try {
      const details = await element.first().evaluate((el) => {
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().substring(0, 100),
          role: el.getAttribute('role') || '',
          id: el.id || '',
          dataTestId: el.getAttribute('data-testid') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          placeholder: el.getAttribute('placeholder') || '',
          className: el.className && typeof el.className === 'string' ? el.className : '',
        };
      });

      const attributesUsed: string[] = [];
      if (details.dataTestId) attributesUsed.push('data-testid');
      if (details.id) attributesUsed.push('id');
      if (details.role) attributesUsed.push('role');
      if (details.ariaLabel) attributesUsed.push('aria-label');
      if (details.placeholder) attributesUsed.push('placeholder');
      if (details.text) attributesUsed.push('text');
      if (details.className) attributesUsed.push('class');

      return { ...details, attributesUsed };
    } catch {
      return {
        tag: '',
        text: '',
        role: '',
        id: '',
        dataTestId: '',
        ariaLabel: '',
        placeholder: '',
        className: '',
        attributesUsed: [],
      };
    }
  }

  private _openAISuggestionsToCandidate(suggestions: string[]): LocatorCandidate[] {
    return suggestions.map((s, index) => {
      let type: LocatorCandidate['type'] = 'css';
      if (s.startsWith('//') || s.startsWith('(//')) type = 'xpath';
      else if (s.startsWith('text=')) type = 'text';
      else if (s.startsWith('[data-testid')) type = 'data-testid';
      else if (s.startsWith('#')) type = 'id';
      else if (s.startsWith('role=')) type = 'role';
      else if (s.startsWith('placeholder=')) type = 'placeholder';

      return {
        type,
        locator: `page.locator('${s}')`,
        rawSelector: s,
        confidence: Math.max(92 - index * 5, 70),
      };
    });
  }

  private async _getPageState(): Promise<string> {
    try {
      const title = await this.page.title();
      const url = this.page.url();
      return `Page: ${title}, URL: ${url}`;
    } catch {
      return 'Unable to determine page state';
    }
  }

  private _buildSuccessResult(
    referenceName: string,
    originalLocator: string,
    usedSelector: string,
    reason: string
  ): HealingResult {
    return {
      referenceName,
      originalLocator,
      healingStatus: 'SUCCESS',
      confidence: 100,
      reason,
      bestLocator: {
        type: 'css',
        locator: `page.locator('${usedSelector}')`,
        rawSelector: usedSelector,
        confidence: 100,
      },
      fallbackLocators: [],
      matchedElementDetails: null,
    };
  }
}
