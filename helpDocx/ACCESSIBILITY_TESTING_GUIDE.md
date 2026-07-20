# Accessibility Testing — Complete Learning Guide

> From zero to WCAG expert. Covers What, Why, and How — with real examples from your BDD framework.

---

## Part 1: WHAT is Accessibility Testing?

### Definition

Accessibility testing verifies that a web application is usable by **everyone**, including people with:

- **Visual impairments** — blindness, low vision, color blindness
- **Motor impairments** — unable to use a mouse, limited hand movement
- **Hearing impairments** — deafness, hard of hearing
- **Cognitive impairments** — dyslexia, ADHD, memory issues

### The Standard: WCAG 2.1

**WCAG** = Web Content Accessibility Guidelines (published by W3C)

WCAG is organized into **4 principles** (POUR):

| Principle | Meaning | Example |
|-----------|---------|---------|
| **P**erceivable | Users can see/hear content | Images have alt text, videos have captions |
| **O**perable | Users can interact with UI | Everything works with keyboard, no time limits |
| **U**nderstandable | Content and UI are clear | Labels on forms, consistent navigation |
| **R**obust | Works with assistive technology | Valid HTML, proper ARIA roles |

### Conformance Levels

| Level | Meaning | Required For |
|-------|---------|-------------|
| **A** | Minimum accessibility (MUST fix) | All websites |
| **AA** | Standard compliance (SHOULD fix) | Most regulations (ADA, EU) |
| **AAA** | Highest standard (NICE to have) | Government, healthcare |

**Most companies target Level AA** — it covers the essentials without being unreasonably strict.

### Key WCAG Success Criteria (The Ones That Matter Most)

| # | Criteria | Level | What It Means |
|---|----------|-------|---------------|
| 1.1.1 | Non-text Content | A | All images have alt text |
| 1.3.1 | Info and Relationships | A | Form inputs have labels, headings are structured |
| 1.4.3 | Contrast Minimum | AA | Text has 4.5:1 contrast ratio against background |
| 2.1.1 | Keyboard | A | Everything is operable via keyboard only |
| 2.4.1 | Bypass Blocks | A | Skip navigation link exists |
| 2.4.3 | Focus Order | A | Tab order makes logical sense |
| 2.4.4 | Link Purpose | A | Link text describes where it goes |
| 2.4.6 | Headings and Labels | AA | Page has h1, headings don't skip levels |
| 2.4.7 | Focus Visible | AA | Focused elements have visible outline |
| 2.5.5 | Target Size | AAA | Touch targets are ≥ 44x44px |
| 3.1.1 | Language of Page | A | `<html lang="en">` is set |
| 3.3.1 | Error Identification | A | Form errors described in text |
| 4.1.2 | Name, Role, Value | A | Custom controls have ARIA labels |

---

## Part 2: WHY is Accessibility Testing Important?

### 1. Legal Requirement

| Regulation | Region | Penalty |
|-----------|--------|---------|
| ADA (Americans with Disabilities Act) | USA | Lawsuits, fines up to $75,000 |
| European Accessibility Act | EU | Mandatory by June 2025 |
| Equality Act 2010 | UK | Legal action |
| AODA | Canada (Ontario) | Fines up to $100,000/day |

**Real cases:**
- Domino's Pizza sued for inaccessible website (2019) — lost in Supreme Court
- Target.com settled $6M class-action for blind users (2008)
- Thousands of ADA lawsuits filed per year against web companies

### 2. Business Impact

| Benefit | Detail |
|---------|--------|
| **Market reach** | 1.3 billion people globally have disabilities (16% of population) |
| **SEO boost** | Alt text, headings, semantic HTML improve search rankings |
| **Better UX for everyone** | Captions help in noisy environments, keyboard nav helps power users |
| **Brand reputation** | Shows inclusivity and social responsibility |
| **Reduced support costs** | Clear labels, error messages reduce user confusion |

### 3. Technical Quality

Accessibility testing catches code quality issues:
- Missing form labels → confusion
- Broken tab order → poor usability
- No alt text → images meaningless for SEO bots too
- No heading structure → search engines can't understand page hierarchy

---

## Part 3: HOW to Do Accessibility Testing

### Testing Approaches

| Approach | Tools | Coverage | When |
|----------|-------|----------|------|
| **Automated** | axe-core, Playwright, Your BDD framework | ~30-40% of WCAG | Every build (CI/CD) |
| **Manual** | Screen reader, keyboard-only nav | ~60-70% of WCAG | Per sprint |
| **Assistive Tech** | NVDA, VoiceOver, JAWS | Full user experience | Before release |

**Important:** Automated testing catches about 30-40% of accessibility issues. Manual testing is still essential for things like meaningful alt text quality, logical reading order, and real assistive technology experience.

### Automated Testing with Your Framework

#### Setup

```properties
# framework.properties
accessibility.enabled=true
accessibility.failOnCritical=true
accessibility.wcagLevel=AA
accessibility.maxViolations=0
```

#### Running Tests

```bash
# Run all accessibility scenarios
npm run test:accessibility

# Run with specific tag
npx cucumber-js --profile accessibility
```

#### Writing Accessibility Tests (Gherkin)

```gherkin
@web @accessibility
Feature: Login Page Accessibility

  @a11y @audit
  Scenario: Full WCAG audit on login page
    Given I navigate to the application
    When I run an accessibility audit on 'login-page'
    Then the page should have no critical accessibility violations

  @a11y @keyboard
  Scenario: Keyboard navigation works
    Given I navigate to the application
    When I check keyboard navigation
    Then all interactive elements should be keyboard reachable

  @a11y @structure
  Scenario: Page has proper structure
    Given I navigate to the application
    Then the page should have a language attribute
    And the page should have a single h1 heading
    And the page should have proper heading structure
    And the page should have a main landmark
    And the page should have a skip navigation link

  @a11y @elements
  Scenario: Form elements are accessible
    Given I navigate to the application
    Then 'Login.EmailField' should have an accessible name
    And 'Login.PasswordField' should have an accessible name
    And 'Login.SubmitButton' should have an accessible name
    And 'Login.SubmitButton' should have a visible focus indicator

  @a11y @visual
  Scenario: No visual accessibility issues
    Given I navigate to the application
    When I run an accessibility audit
    Then the page should have no contrast issues
    And all images should have alt text
    And all links should have meaningful text

  @a11y @mobile
  Scenario: Mobile accessibility
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    Then 'Login.SubmitButton' should have an adequate touch target size
    And the page should not have horizontal scrolling
```

---

## Part 4: Complete Step Library Reference

### Audit Steps (Run the checks)

| Step | What It Does |
|------|-------------|
| `When I run an accessibility audit` | Full WCAG audit, generates HTML report |
| `When I run an accessibility audit on 'page-name'` | Same, with custom report name |
| `When I run a level AA accessibility audit` | Audit filtered by WCAG level (A/AA/AAA) |

### Assertion Steps (Verify results)

| Step | What It Checks |
|------|---------------|
| `Then the page should have no accessibility violations` | Zero violations (strict) |
| `Then the page should have no critical accessibility violations` | No critical-severity issues |
| `Then the page should have no serious accessibility violations` | Specific severity check |
| `Then the page should have fewer than 5 accessibility violations` | Threshold-based |
| `Then the page should have no contrast issues` | Color contrast (WCAG 1.4.3) |

### Element-Level Steps

| Step | What It Checks |
|------|---------------|
| `Then 'Page.Element' should be accessible` | Full element audit |
| `Then 'Page.Element' should have an accessible name` | aria-label/text/title exists |
| `Then 'Page.Element' should have aria role "button"` | Correct ARIA role |
| `Then 'Page.Element' should have an adequate touch target size` | ≥ 44x44px |
| `Then 'Page.Element' should have a visible focus indicator` | CSS :focus outline |

### Keyboard & Navigation Steps

| Step | What It Checks |
|------|---------------|
| `When I check keyboard navigation` | Scans all interactive elements |
| `Then all interactive elements should be keyboard reachable` | No tabindex="-1" blockers |
| `Then keyboard unreachable element count should be less than 5` | Threshold |
| `Then the tab order should be logical` | No positive tabindex values |

### Page Structure Steps

| Step | What It Checks |
|------|---------------|
| `Then the page should have a language attribute` | `<html lang="...">` (WCAG 3.1.1) |
| `Then the page should have a single h1 heading` | Exactly one h1 |
| `Then the page should have proper heading structure` | h1→h2→h3 order (no skips) |
| `Then the page should have a main landmark` | `<main>` or `role="main"` |
| `Then the page should have a skip navigation link` | Skip-to-content link |
| `Then all images should have alt text` | Every `<img>` has alt (WCAG 1.1.1) |
| `Then all links should have meaningful text` | No "click here" links |

### Form & Interaction Steps

| Step | What It Checks |
|------|---------------|
| `Then form errors should be identified in text` | aria-describedby on invalid inputs |
| `Then inputs should have autocomplete attributes` | Autocomplete hints (WCAG 1.3.5) |

### Media & Motion Steps

| Step | What It Checks |
|------|---------------|
| `Then videos should have captions` | `<track kind="captions">` exists |
| `Then the page should respect reduced motion` | @media (prefers-reduced-motion) |

### Layout Steps

| Step | What It Checks |
|------|---------------|
| `Then the page should not have horizontal scrolling` | Content reflow (WCAG 1.4.10) |

### Debug / Utility Steps

| Step | What It Does |
|------|-------------|
| `When I get the ARIA snapshot` | Captures accessibility tree |
| `Then the ARIA snapshot should contain 'text'` | Asserts content in a11y tree |
| `Then the accessibility violation count should be stored as 'var'` | Store for later use |

---

## Part 5: Common Accessibility Issues & Fixes

### Issue 1: Images Missing Alt Text

**Problem:**
```html
<img src="logo.png">
```

**Fix:**
```html
<img src="logo.png" alt="TeleConnect company logo">
<!-- OR if decorative: -->
<img src="divider.png" alt="" role="presentation">
```

**Step to catch it:**
```gherkin
Then all images should have alt text
```

---

### Issue 2: Form Inputs Without Labels

**Problem:**
```html
<input type="email" placeholder="Enter email">
```
Placeholder is NOT a label. Screen readers need `<label>` or `aria-label`.

**Fix:**
```html
<label for="email">Email Address</label>
<input type="email" id="email" placeholder="Enter email">
<!-- OR -->
<input type="email" aria-label="Email Address" placeholder="Enter email">
```

**Step to catch it:**
```gherkin
Then 'Login.EmailField' should have an accessible name
```

---

### Issue 3: Low Color Contrast

**Problem:**
Light gray text (#999) on white background (#fff) = contrast ratio 2.8:1

**Fix:**
Dark gray text (#595959) on white background = contrast ratio 7:1

**Rule:** Normal text needs 4.5:1, large text needs 3:1

**Step to catch it:**
```gherkin
Then the page should have no contrast issues
```

---

### Issue 4: No Keyboard Access

**Problem:**
```html
<div onclick="submit()">Submit</div>
```
Div is not focusable — keyboard users can't reach it.

**Fix:**
```html
<button onclick="submit()">Submit</button>
<!-- OR if div is needed: -->
<div role="button" tabindex="0" onclick="submit()" onkeypress="submit()">Submit</div>
```

**Step to catch it:**
```gherkin
When I check keyboard navigation
Then all interactive elements should be keyboard reachable
```

---

### Issue 5: Heading Hierarchy Broken

**Problem:**
```html
<h1>Welcome</h1>
<h3>Orders</h3>  <!-- Skipped h2! -->
<h4>Order #123</h4>
```

**Fix:**
```html
<h1>Welcome</h1>
<h2>Orders</h2>
<h3>Order #123</h3>
```

**Step to catch it:**
```gherkin
Then the page should have proper heading structure
```

---

### Issue 6: No Focus Indicator

**Problem:**
```css
button:focus { outline: none; }  /* Common anti-pattern! */
```

**Fix:**
```css
button:focus {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}
```

**Step to catch it:**
```gherkin
Then 'Login.SubmitButton' should have a visible focus indicator
```

---

### Issue 7: Touch Targets Too Small

**Problem:**
```html
<a href="/terms" style="font-size: 10px; padding: 2px;">Terms</a>
```
This link is tiny — mobile users can't tap it reliably.

**Fix:**
```html
<a href="/terms" style="padding: 12px; min-height: 44px; min-width: 44px;">Terms</a>
```

**Step to catch it:**
```gherkin
Then 'Page.TermsLink' should have an adequate touch target size
```

---

## Part 6: Testing Strategy — What to Test When

### Every Sprint (Automated in CI/CD)

```gherkin
@accessibility @regression
Scenario: Automated accessibility gate
  Given I navigate to the application
  When I run a level AA accessibility audit
  Then the page should have no critical accessibility violations
  And the page should have fewer than 10 accessibility violations
```

### Before Release (Manual + Automated)

| Check | Method | Tool |
|-------|--------|------|
| Full page audit | Automated | Your BDD framework |
| Keyboard-only navigation | Manual | Tab through entire flow |
| Screen reader test | Manual | NVDA (Windows) or VoiceOver (Mac) |
| Color contrast | Automated + Manual | Framework + browser DevTools |
| Mobile touch targets | Automated | Framework with device emulation |
| Zoom to 200% | Manual | Browser zoom — check content reflow |

### Per Page/Component (When new UI is built)

```gherkin
@accessibility
Scenario: New checkout page accessibility
  Given I navigate to '/checkout'
  When I run an accessibility audit on 'checkout'
  Then the page should have no critical accessibility violations
  And the page should have a language attribute
  And the page should have proper heading structure
  And 'Checkout.PayButton' should have an accessible name
  And 'Checkout.PayButton' should have an adequate touch target size
  And 'Checkout.CardInput' should have an accessible name
  When I check keyboard navigation
  Then all interactive elements should be keyboard reachable
```

---

## Part 7: Tools & Resources

### Browser Extensions (Install These!)

| Tool | Purpose | Free? |
|------|---------|-------|
| **axe DevTools** | Auto-audit in browser DevTools | ✅ |
| **WAVE** | Visual overlay showing issues | ✅ |
| **Lighthouse** | Built into Chrome DevTools | ✅ |
| **Color Contrast Analyzer** | Check contrast ratios | ✅ |

### Screen Readers (For Manual Testing)

| Screen Reader | Platform | Cost |
|---------------|----------|------|
| **NVDA** | Windows | Free |
| **VoiceOver** | Mac/iOS | Built-in |
| **JAWS** | Windows | Paid ($1000) |
| **TalkBack** | Android | Built-in |

### Keyboard Testing Basics

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous element |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox, activate button |
| `Arrow keys` | Navigate within dropdowns, radio groups |
| `Escape` | Close modal/dropdown |

### Useful References

| Resource | URL |
|----------|-----|
| WCAG 2.1 Quick Reference | https://www.w3.org/WAI/WCAG21/quickref/ |
| WebAIM Contrast Checker | https://webaim.org/resources/contrastchecker/ |
| A11y Project Checklist | https://www.a11yproject.com/checklist/ |
| MDN ARIA Guide | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA |

---

## Part 8: Quick Reference Card

### Minimum Checklist for Any Page

```
□ Page has <html lang="en">
□ Page has exactly one <h1>
□ Headings go in order (h1 → h2 → h3, no skips)
□ All images have alt text (or alt="" for decorative)
□ All form inputs have <label> or aria-label
□ All buttons have visible text or aria-label
□ Color contrast is ≥ 4.5:1 for text
□ Everything works with keyboard Tab navigation
□ Focus indicator is visible on all interactive elements
□ Links describe where they go (no "click here")
□ Skip navigation link exists
□ Touch targets are ≥ 44x44px on mobile
□ No horizontal scrolling at 320px viewport
□ Form errors are described in text (not just color)
```

### Decision Tree: "Is This Accessible?"

```
Can the user PERCEIVE it?
  → Does the image have alt text?
  → Is text contrast sufficient?
  → Do videos have captions?

Can the user OPERATE it?
  → Can they Tab to it?
  → Can they press Enter/Space to activate?
  → Is the focus indicator visible?
  → Is the touch target big enough?

Can the user UNDERSTAND it?
  → Does the button text make sense?
  → Does the link text describe the destination?
  → Are error messages clear?

Is it ROBUST enough?
  → Does it have proper ARIA roles?
  → Does the HTML validate?
  → Does it work with screen readers?
```

---

## Part 9: Running in Your Framework

### Configuration

```properties
# src/config/framework.properties
accessibility.enabled=true           # Enable auto-audit on @accessibility tag
accessibility.failOnCritical=true    # Fail test on critical violations
accessibility.wcagLevel=AA           # A | AA | AAA
accessibility.maxViolations=0        # 0 = fail on any violation
```

### Commands

```bash
# Run accessibility tests only
npm run test:accessibility

# Run with cross-browser (accessibility on Chrome + Firefox)
browsers=chromium,firefox
npm run test:cross-browser  # with @accessibility tag in cucumber.yml
```

### Report Location

```
reports/accessibility/                    ← Per-page audit HTML reports
reports/html/accessibility-report.html    ← Cucumber scenario results
```

### Tag Usage

```gherkin
@web @accessibility        ← Feature-level: enables auto-audit on navigation
@a11y @audit              ← Scenario: explicit audit step
@a11y @keyboard           ← Scenario: keyboard navigation
@a11y @mobile @combined   ← Scenario: mobile + accessibility
```

---

*Document Version: 1.0 | Framework: BDD Playwright v1.1 | Date: July 2026*
