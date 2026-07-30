# Demo Script — Accessibility, Mobile & Test Case to Script Generation

---

## 1. Accessibility Testing (Tag: `@accessibility` or `@a11y`)

### How to Run
```bash
# Change tag in cucumber.yml to:
tags: "@accessibility or @a11y"

# Then run:
npm test
```

### What We're Checking (Dual Engine Approach)

**Engine 1: Custom AccessibilityEngine (AXTree-based) — Runs on EVERY page navigation**

| # | Check | WCAG Criteria | What It Validates |
|---|-------|---------------|-------------------|
| 1 | Image Alt Text | 1.1.1 Non-text Content (Level A) | Every `<img>` has alt attribute (or role="presentation" for decorative) |
| 2 | Form Labels | 1.3.1 Info and Relationships (Level A) | All inputs have associated `<label>`, aria-label, or aria-labelledby |
| 3 | Button/Link Names | 4.1.2 Name, Role, Value (Level A) | Buttons and links have accessible names (text, aria-label, title) |
| 4 | Heading Hierarchy | 1.3.1 / 2.4.6 (Level A/AA) | Headings go h1→h2→h3 without skipping; single h1 per page |
| 5 | Landmark Regions | 2.4.1 Bypass Blocks (Level A) | Page has `<main>`, `<nav>`, `<header>`, `<footer>` landmarks |
| 6 | Skip Navigation | 2.4.1 Bypass Blocks (Level A) | "Skip to main content" link present as first focusable element |
| 7 | ARIA Roles | 4.1.2 Name, Role, Value (Level A) | All role attributes are valid WAI-ARIA roles |
| 8 | Color Contrast | 1.4.3 Contrast Minimum (Level AA) | Text has sufficient contrast ratio (4.5:1 normal, 3:1 large) |
| 9 | Keyboard Focusable | 2.1.1 Keyboard (Level A) | Interactive elements reachable via Tab (no tabindex="-1") |
| 10 | Touch Target Size | 2.5.5 Target Size (Level AAA) | Buttons/links are ≥ 44x44px for mobile |

**Engine 2: Google Lighthouse (axe-core 4.12.1) — Runs ONCE at scenario end**

| Category | What It Scores | Our Threshold |
|----------|---------------|---------------|
| Accessibility | 80+ axe-core rules, ARIA, color contrast, labels | ≥ 90 to pass |
| Performance | FCP, LCP, Speed Index, TBT, CLS | ≥ 50 to pass |
| Best Practices | HTTPS, deprecated APIs, console errors, security | ≥ 50 to pass |
| SEO | Title, meta, crawlability, links | ≥ 50 to pass |

### WCAG Level Filtering (Configurable)

```properties
# In framework.properties:
accessibility.wcagLevel=AA    # Options: A, AA, AAA
```

| Level | Rules Checked |
|-------|--------------|
| A | image-alt, label, button-name, aria-valid-attr, skip-link, tabindex |
| AA | Level A + color-contrast, heading-order, page-has-heading-one |
| AAA | Level A + AA + touch-target, landmark-main, landmark-navigation |

### Scenarios Being Tested (feature: `8_accessibility.feature`)

| Scenario | What It Validates |
|----------|-------------------|
| Login page — Full WCAG + Lighthouse combined audit | Runs both engines, checks no critical violations + Lighthouse ≥ 50 |
| Login page — Lighthouse scores check | Lighthouse accessibility ≥ 50, best practices ≥ 50 |
| All images have alt text | Every image has alt attribute |
| Login page has correct heading hierarchy | h1→h2→h3 order maintained |
| Application pages have required landmark regions | `<main>` landmark present |
| Login form inputs have accessible labels | Email, Password, Submit have aria-label/label |
| Login submit button is accessible | Button has accessible name + touch target |
| Login email field has visible focus indicator | Outline/box-shadow visible on focus |
| Login submit button has visible focus indicator | Focus ring visible |
| All interactive elements are keyboard reachable | Tab reaches all buttons, links, inputs |
| Keyboard unreachable elements < 5 | Acceptable threshold |
| ARIA snapshot contains 'WebArea' | Page has valid ARIA tree |
| Login page is accessible on mobile viewport | Mobile + accessibility combined check |

### Key Demo Talking Point
> "Just add `@accessibility` tag to any scenario — both engines run automatically. The custom engine checks every page during navigation (real-time), while Lighthouse gives a comprehensive 4-category score at the end. No extra code needed."

---

## 2. Mobile Testing

### 2A. Mobile Emulation (Tag: `@mobile`) — Playwright Device Emulation

**How to Run:**
```bash
# Change tag in cucumber.yml to:
tags: "@mobile"

# Then run:
npm run test:mobile
```

**What's Being Tested (feature: `7_mobile.feature`):**

| Scenario | Device | What It Validates |
|----------|--------|-------------------|
| Application loads on iPhone 14 | iPhone 14 (390x844) | All login elements visible on mobile viewport |
| Login form within viewport on iPhone 14 | iPhone 14 | Elements don't overflow screen |
| Touch target size requirements | iPhone 14 | Submit button ≥ 44x44px |
| Application loads on Pixel 7 | Pixel 7 (412x915) | Android viewport rendering |
| Landscape orientation handling | iPhone 14 (844x390) | Rotation maintains UI integrity |
| Application loads on 3G network | iPhone 14 + 3G | App works on slow networks |
| Application handles 4G network | Pixel 7 + 4G | App works on 4G |
| Responsive across viewports | 5 sizes (375-1280px) | Layout doesn't break |
| Swipe gestures on mobile | iPhone 14 | Touch scroll works |

**Emulated Devices Available:**
- iPhone 14, iPhone SE, iPhone 14 Pro Max
- Pixel 7, Samsung Galaxy S23
- iPad Mini, iPad Pro

**Network Conditions Simulated:**
- 3G (750 Kbps down / 250 Kbps up / 100ms latency)
- 4G (4 Mbps down / 3 Mbps up / 20ms latency)
- Slow 3G, Offline

### Key Demo Talking Point
> "Mobile emulation uses Playwright's built-in device profiles — correct viewport, user-agent, touch support, and DPR. We also simulate real network conditions (3G/4G) to test performance on slow connections. All tag-driven, no configuration needed."

---

### 2B. Native App Testing (Tag: `@native`) — Appium Integration

**How to Run:**
```bash
# Local Appium:
npm run test:native:android
npm run test:native:ios

# BrowserStack Cloud:
# Set in framework.properties:
#   nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
# Set in .env:
#   BROWSERSTACK_USERNAME=xxx
#   BROWSERSTACK_ACCESS_KEY=xxx
#   BROWSERSTACK_ANDROID_APP_URL=bs://xxxxx
```

**Demo APK: SwagLabs Mobile App**
- **Package:** `com.swaglabsmobileapp`
- **Activity:** `com.swaglabsmobileapp.SplashActivity`
- **APK Location:** `testdata/appFiles/demo.apk`
- **Test Credentials:** `standard_user` / `secret_sauce`
- **Locked User (negative):** `locked_out_user` / `secret_sauce`

**Android Scenarios (feature: `native/android_login.feature`):**

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Successful login | Enter username → Enter password → Tap Login | Cart icon visible (home screen) |
| 2 | Invalid credentials | Enter locked_out_user → Tap Login | Error message visible |
| 3 | Add product to cart | Login → Tap "Add to Cart" → Tap Cart icon | Checkout button visible |
| 4 | Swipe through products | Login → Swipe up on product list | Products scroll, cart icon still visible |

**iOS Scenarios (feature: `native/ios_login.feature`):**

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Successful login | Enter username → Enter password → Tap Login | Cart icon visible |
| 2 | Invalid credentials | Enter locked_out_user → Tap Login | Error message visible |
| 3 | Add product to cart | Login → Tap "Add to Cart" | Cart icon shows item |

**Execution Modes (configurable in `framework.properties`):**

| Mode | Where | Configuration |
|------|-------|---------------|
| Local Appium | `http://localhost:4723` | Requires Appium server + emulator/device |
| BrowserStack | `https://hub-cloud.browserstack.com/wd/hub` | Cloud — Samsung Galaxy S23 (Android 13) / iPhone 15 (iOS 17) |
| LambdaTest | `https://mobile-hub.lambdatest.com/wd/hub` | Cloud — Galaxy S23 / iPhone 15 |

### Key Demo Talking Point
> "We're testing the SwagLabs demo APK — login, add to cart, and gesture flows. Same Gherkin step syntax, same framework — just `@native` tag switches from Playwright browser to Appium native app driver. Works on local emulator, BrowserStack, or LambdaTest cloud without code changes — just config."

---

## 3. Test Cases to Scripts Generation (AI-Powered)

### How It Works

1. **Input:** Provide test cases in CSV format (or paste as table)
2. **Kiro generates:** Feature file (`.feature`) + Element locators (`.properties`)
3. **Optionally:** Kiro browses the app via Playwright MCP to discover actual `data-testid` attributes

### Demo Flow

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│  Test Cases (CSV) │ ──→ │  Kiro + Playwright │ ──→ │  Feature + Locators   │
│  from Jira/Excel  │     │  MCP (browses app) │     │  ready to execute     │
└──────────────────┘     └───────────────────┘     └──────────────────────┘
```

### Demo Prompt (Copy-Paste for Live Demo)

```
Generate BDD test scripts from the below test cases. Create feature file at features/web/6_customersupport.feature and add required locators to src/pages/properties/TeleConnect.properties. Follow the same step patterns and conventions used in #features/web/1_teleconnect.feature and #src/pages/properties/TeleConnect.properties. Use Playwright MCP to browse https://simulapp.online/ (login: admin@gmail.com / admin1234) and inspect actual element selectors (data-testid, role, placeholder attributes) for accurate locators. Flow: Login → My Orders → View Details → Support button → Create Support Ticket dialog.

Test Cases:
S.No,Test Case Description,Test Steps,Test Data,Expected Result
TC001,Verify user can navigate to Support Ticket form from Order Details,"1. Login 2. My Orders 3. View Details 4. Click Support button","URL: https://simulapp.online/ UserID: admin@gmail.com Password: admin1234","Create Support Ticket dialog opens with Issue Type, Title, Description fields"
TC002,Verify Issue Type dropdown options,"1. Login 2. Open support dialog 3. Click Issue Type dropdown","Same as TC001","Options: Technical Issue, Billing Issue, Service Quality, Other"
TC003,Verify successful ticket submission (Technical Issue),"1. Login 2. Open support dialog 3. Select Technical Issue 4. Enter title 5. Enter description 6. Submit","Issue Type: Technical Issue Title: Internet not working Desc: Broadband down since morning","Ticket created - shows TECHNICAL type, OPEN status"
TC004,Verify form cannot be submitted empty,"1. Login 2. Open support dialog 3. Click Create Ticket without filling","No data","Validation errors appear for all mandatory fields"
```

### What Kiro Does During Generation

1. **Reads existing conventions** from `1_teleconnect.feature` and `TeleConnect.properties`
2. **Browses the application** using Playwright MCP to discover real element selectors
3. **Generates feature file** with proper tags, Background, and step patterns
4. **Adds locators** with actual `data-testid`, `role`, `placeholder` attributes
5. **Output is immediately executable** — just change the tag in `cucumber.yml` and run

### Key Demo Talking Point
> "We take test cases from any format — Jira, Excel, CSV — paste them with a single prompt, and Kiro generates executable BDD scripts. It actually browses the live application to find real element selectors, so the scripts work out of the box. From test case to running test in under 2 minutes."

---

## Quick Reference — Tags & Commands

| Feature | Tag | Command |
|---------|-----|---------|
| Accessibility | `@accessibility` or `@a11y` | `npm run test:accessibility` |
| Mobile Emulation | `@mobile` | `npm run test:mobile` |
| Native Android | `@native` + `@nativeandroid` | `npm run test:native:android` |
| Native iOS | `@native` + `@ios` | `npm run test:native:ios` |
| Cross-Browser | (configured in properties) | `npm run test:cross-browser` |
| Load Testing | `@loadtest` | (auto-runs with tag) |

---

## Demo Execution Order (Suggested)

1. **Test Cases → Scripts** (2 min) — Show AI generating from CSV
2. **Run the generated test** (30 sec) — Show it passes
3. **Accessibility** (1 min) — Run `@a11y`, show dual engine + Lighthouse HTML report
4. **Mobile Emulation** (1 min) — Run `@mobile`, show device emulation + responsiveness
5. **Native App** (1 min) — Run `@native`, show SwagLabs APK on emulator/cloud
