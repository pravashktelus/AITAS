# Understanding the Lighthouse Report

## What is Lighthouse?

Google Lighthouse is an open-source automated tool that audits web pages for quality. In our framework, it runs via **Chrome DevTools Protocol (CDP)** using the `playwright-lighthouse` package. It provides scoring across 4 major categories and uses **axe-core** (industry-standard accessibility engine) under the hood for accessibility checks.

> **Note:** Lighthouse only works with Chromium browser (requires CDP remote-debugging-port).

---

## Report Location

```
reports/lighthouse/lighthouse-<timestamp>.html   ← Visual HTML report (open in browser)
reports/lighthouse/lighthouse-<timestamp>.json   ← Raw JSON data
```

---

## The 4 Score Categories (0-100 scale)

Each category is scored from 0 to 100. The score color coding is:

| Score Range | Color  | Meaning |
|-------------|--------|---------|
| 90-100      | 🟢 Green  | Good — meets standards |
| 50-89       | 🟠 Orange | Needs improvement |
| 0-49        | 🔴 Red    | Poor — requires attention |

---

### 1. Performance (Score: 82 in our latest run)

Measures how fast the page loads and becomes interactive.

**Key Metrics:**

| Metric | What It Measures | Our Score | Our Value | Good Threshold |
|--------|-----------------|-----------|-----------|----------------|
| First Contentful Paint (FCP) | Time until first text/image appears | 98 | 1.3s | < 1.8s |
| Largest Contentful Paint (LCP) | Time until largest element renders | 67 | 3.4s | < 2.5s |
| Speed Index | How quickly page content is visually populated | 100 | 1.5s | < 3.4s |
| Total Blocking Time (TBT) | Sum of time main thread was blocked | 69 | 390ms | < 200ms |
| Cumulative Layout Shift (CLS) | Visual stability — how much layout shifts | 100 | 0 | < 0.1 |

**How to explain in demo:**
> "Our login page scores 82 in Performance. FCP is excellent at 1.3s, but LCP needs optimization at 3.4s — this means the largest visual element (likely the login form) takes too long to render. TBT at 390ms suggests some JavaScript is blocking the main thread."

---

### 2. Accessibility (Score: 98 in our latest run)

Measures WCAG compliance using **axe-core 4.12.1** — the same engine used by major accessibility testing tools. Checks 80+ rules covering WCAG 2.1 Level A and AA.

**What passed (19 checks):**

| Check | What It Validates |
|-------|-------------------|
| ARIA attributes match roles | Correct ARIA usage |
| Buttons have accessible name | Screen readers can identify buttons |
| Color contrast ratio | Text is readable (4.5:1 for normal, 3:1 for large) |
| Heading order | h1 → h2 → h3 (no skipping) |
| HTML has lang attribute | Screen readers know the language |
| Form elements have labels | Input fields are associated with labels |
| No user-scalable=no | Users can zoom |
| No tabindex > 0 | Natural tab order preserved |
| Touch targets have sufficient size | Mobile-friendly tap areas (≥ 44x44px) |

**What failed (1 check):**

| Check | Issue | Impact |
|-------|-------|--------|
| Document has no main landmark | The page is missing `<main>` element | Moderate — screen reader users can't jump to main content |

**How to explain in demo:**
> "Accessibility scores 98/100 — nearly perfect. The only issue is a missing `<main>` landmark, which helps screen reader users skip navigation and jump directly to content. This is a simple HTML fix: wrap the page content in a `<main>` tag."

---

### 3. Best Practices (Score: 100 in our latest run)

Measures modern web development best practices:

- ✅ Uses HTTPS
- ✅ No deprecated APIs
- ✅ No browser errors in console
- ✅ Correct image aspect ratios
- ✅ No vulnerable JavaScript libraries
- ✅ CSP (Content Security Policy) compliance

**How to explain in demo:**
> "Perfect 100 on Best Practices — the application follows all modern web standards, uses HTTPS, has no deprecated APIs, and no security vulnerabilities in its dependencies."

---

### 4. SEO (Score: 100 in our latest run)

Measures search engine optimization readiness:

- ✅ Has `<title>` element
- ✅ Has meta description
- ✅ HTTP status code is successful
- ✅ Links have descriptive text
- ✅ Page isn't blocked from indexing
- ✅ Document has valid `hreflang`

**How to explain in demo:**
> "SEO scores 100 — the page has proper title, meta descriptions, and is fully crawlable by search engines."

---

## How It Integrates in Our Framework

### Trigger Mechanism

Lighthouse runs **automatically** when:
1. Scenario has `@accessibility` or `@a11y` tag
2. `lighthouse.enabled=true` in `framework.properties`
3. Browser is Chromium

It runs **once at the end of each scenario** in the `After` hook.

### Dual Engine Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    @accessibility Scenario                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │  AccessibilityEngine  │     │     Lighthouse Engine         │  │
│  │  (Custom / AXTree)    │     │     (axe-core + CDP)          │  │
│  ├──────────────────────┤     ├──────────────────────────────┤  │
│  │ • Runs on EVERY page  │     │ • Runs ONCE at scenario end   │  │
│  │   navigation           │     │ • Full HTML report generated  │  │
│  │ • AXTree-based checks │     │ • 80+ axe-core rules          │  │
│  │ • WCAG level filtering│     │ • Performance metrics         │  │
│  │ • Custom rules         │     │ • SEO & Best Practices       │  │
│  │ • Inline violations    │     │ • Threshold-based pass/fail  │  │
│  └──────────────────────┘     └──────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Thresholds (Auto-Fail)

The framework uses these default thresholds (configurable):

| Category | Threshold | Behavior |
|----------|-----------|----------|
| Accessibility | 90 | Fails if score < 90 |
| Performance | 50 | Fails if score < 50 |
| Best Practices | 50 | Fails if score < 50 |
| SEO | 50 | Fails if score < 50 |

### Report Attachment

After the audit:
1. **HTML Report** is attached directly to the Cucumber/Allure test report
2. **Score Summary** is attached as plain text:
```
═══════════════════════════════════════════════════════════════════
            LIGHTHOUSE AUDIT SCORES
═══════════════════════════════════════════════════════════════════

Accessibility:   98/100
Performance:     82/100
Best Practices:  100/100
SEO:             100/100

═══════════════════════════════════════════════════════════════════
```

---

## How to Open the HTML Report

1. Navigate to `reports/lighthouse/`
2. Open the `.html` file in a browser
3. The report is interactive — click on any metric to see details, opportunities, and diagnostics

---

## Configuration

In `src/config/framework.properties`:

```properties
# Enable/disable Lighthouse
lighthouse.enabled=true

# CDP port (must match Chromium launch args)
lighthouse.port=9222
```

---

## Key Differences: Lighthouse vs Our Custom AccessibilityEngine

| Aspect | Custom AccessibilityEngine | Lighthouse |
|--------|---------------------------|------------|
| Engine | Playwright AXTree snapshot | axe-core 4.12.1 |
| When it runs | Every page navigation | Once at scenario end |
| Rules | 10 custom checks | 80+ axe-core rules |
| Scope | Accessibility only | Performance + A11y + BP + SEO |
| WCAG Level filtering | Yes (A/AA/AAA) | No (runs all) |
| Output | Inline violations in report | Full interactive HTML report |
| Fail behavior | failOnCritical / maxViolations | Threshold-based |

**Why run both?**
- Custom engine catches issues **during** the test flow (every page)
- Lighthouse provides **comprehensive scoring** and an interactive report at the end
- Together they give maximum coverage with different perspectives

---

## Demo Talking Points

1. **"We run two accessibility engines in parallel"** — our custom AXTree engine catches issues in real-time during navigation, while Lighthouse gives a comprehensive final score with axe-core.

2. **"The report covers 4 dimensions"** — not just accessibility, but also performance, best practices, and SEO — giving a holistic quality picture.

3. **"It's fully automated and tag-driven"** — just add `@accessibility` to any scenario and both engines run automatically. No manual setup.

4. **"Threshold-based pass/fail"** — if accessibility drops below 90, the test fails. This enforces quality gates in CI/CD.

5. **"The HTML report is interactive"** — stakeholders can click into any metric, see detailed diagnostics, and get fix recommendations directly from Google's engine.
