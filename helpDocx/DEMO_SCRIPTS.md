# Live Demo Scripts — Client Presentation

> Run these commands one by one during the demo. Each section is a standalone demo area.
> **Important:** Run all commands from the `BDD_Playwright-v3.0` folder.

---

## Pre-Demo Setup (Do Before the Call)

```bash
# Make sure you're in the right directory
cd "C:\Users\kumar\Downloads\wetransfer_bdd_playwright-main-zip_2026-07-01_1726\BDD_PlaywrightCore\BDD_Playwright-v3.0"

# Set slowMo to 500ms so client can see actions (already set in framework.properties)
# slowMo=500

# Make sure headless=false (already set)
# headless=false

# Clear old reports
npm run clean
```

---

## DEMO 1: Web UI — E2E Order Journey (TeleConnect)

**What to show:** Full end-to-end web UI journey — Registration, Login, Order Placement, CRM Review

**Script to say:**
> "This is our E2E order journey test. Watch how the browser opens, registers a user with random data, places an order through 6 steps, and validates the success. All written in plain English — no code."

**Command:**
```bash
npm test
```

**What happens:**
- Browser opens (visible, slowMo=500ms)
- Registers new user with random ##Email, ##FullName
- Logs in
- Navigates through 6-step order form
- Captures order number
- Validates CRM view
- HTML report generated

**After execution — show the report:**
```bash
npm run report
start reports\html\index.html
```

**Duration:** ~3-4 minutes

---

## DEMO 2: API Testing — Full CRUD Lifecycle (JSONPlaceholder)

**What to show:** Complete REST API CRUD operations — Create, Read, Update, Patch, Delete in one scenario

**Script to say:**
> "Now API testing — same framework, same BDD syntax. This scenario creates a resource, reads it, updates it with PUT, patches it with PATCH, then deletes it. Full lifecycle in one flow. No Postman, no separate tool."

**Command:**
```bash
npx cucumber-js -p api --tags "@crud-lifecycle"
```

**What happens:**
- No browser opens (API-only, skips browser)
- POST /posts → 201 Created
- GET /posts/1 → 200 OK
- PUT /posts/1 → 200 (full update)
- PATCH /posts/1 → 200 (partial update)
- DELETE /posts/1 → 200
- All 19 steps pass in ~3 seconds

**For more impressive output — run all 18 API scenarios:**
```bash
npx cucumber-js -p api --tags "@jsonplaceholder"
```

**Expected output:** `18 scenarios (18 passed), 106 steps (106 passed)`

**Duration:** ~30 seconds

---

## DEMO 3: Accessibility Testing — WCAG 2.1 Audit + Lighthouse

**What to show:** Automatic WCAG compliance checking with HTML report generation

**Script to say:**
> "Accessibility testing is built-in. Just add the @accessibility tag — the framework auto-audits every page for WCAG 2.1 compliance. No extra tools, no manual testing. It generates a visual HTML report with severity breakdown."

**Command (combined audit — your engine + Lighthouse):**
```bash
npx cucumber-js -p accessibility --tags "@smoke and @audit"
```

**What happens:**
- Browser opens, navigates to login page
- AccessibilityEngine runs 10 WCAG checks automatically
- Lighthouse runs (accessibility score 98/100, performance, SEO)
- HTML report attached with donut chart + violations table

**Show the accessibility HTML report:**
```bash
start reports\accessibility\*.html
```

**For full accessibility suite (all scenarios):**
```bash
npx cucumber-js -p accessibility
```

**Duration:** ~40 seconds

---

## DEMO 4: Mobile Device Emulation

**What to show:** Same web tests running on mobile viewport (iPhone 14) with touch emulation

**Script to say:**
> "Mobile testing — one tag. @device:iPhone14 launches the browser emulating the exact iPhone 14 profile: 390x844 viewport, touch enabled, mobile user agent. Same test, mobile experience."

**Command:**
```bash
npx cucumber-js -p accessibility --tags "@mobile and @combined"
```

**What happens:**
- Browser opens with iPhone 14 viewport (390x844, narrow)
- Navigates to login page
- Runs accessibility audit in mobile context
- Checks touch target sizes (≥44x44px)
- Device emulation metadata attached to report

**Duration:** ~30 seconds

---

## DEMO 5: Native App Testing on BrowserStack (Optional — if cloud is available)

**What to show:** Native Android app test on real Samsung device in the cloud

**Script to say:**
> "Native mobile app testing — the SwagLabs demo app running on a real Samsung Galaxy S23 on BrowserStack. Same BDD syntax, same properties-file locators. Login, verify products page."

**Before running — switch config to BrowserStack:**
```bash
# In framework.properties, change:
# nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
# nativeApp.appPath=bs://a31cede05f9d9bafcd6aae57dec442e8d368eb96
# nativeApp.appPackage=
# nativeApp.appActivity=
```

**Command:**
```bash
npm run test:native:android
```

**What happens:**
- No local browser — connects to BrowserStack cloud
- Creates session on Samsung Galaxy S23 (Android 13)
- Installs SwagLabs APK
- Types username/password
- Taps login button
- Verifies cart icon appears
- Session deleted, device info attached to report

**Duration:** ~50 seconds

---

## DEMO 6: Show the Report (After All Demos)

**Script to say:**
> "Every test automatically generates a rich HTML report — no configuration needed. Screenshots on failure, self-healing cards, device metadata, accessibility violations — all inline."

**Commands:**
```bash
# Generate Cucumber HTML report
npm run report
start reports\html\index.html

# Generate Allure report (if allure installed)
npm run allure:serve
```

---

## Quick Reference — All Demo Commands

| # | Area | Command | Duration |
|---|------|---------|----------|
| 1 | Web UI E2E | `npm test` | 3-4 min |
| 2 | API CRUD | `npx cucumber-js -p api --tags "@crud-lifecycle"` | 30 sec |
| 3 | Accessibility | `npx cucumber-js -p accessibility --tags "@smoke and @audit"` | 40 sec |
| 4 | Mobile | `npx cucumber-js -p accessibility --tags "@mobile and @combined"` | 30 sec |
| 5 | Native App | `npm run test:native:android` | 50 sec |
| 6 | Report | `npm run report && start reports\html\index.html` | 5 sec |

---

## Talking Points During Demo

### While Web UI runs:
- "Notice — all test data is auto-generated. ##Email creates a unique email every run."
- "The locators are in a simple text file — LoginEmail=#login-email. One line."
- "If any locator breaks, self-healing kicks in automatically."

### While API runs:
- "Same framework, same syntax. No Postman, no RestAssured."
- "19 steps in 3 seconds — Create, Read, Update, Patch, Delete."
- "Variable chaining — the created ID is used in subsequent requests."

### While Accessibility runs:
- "One tag — @accessibility — and the audit runs automatically."
- "No axe-core setup, no Lighthouse CLI, no manual audit."
- "Scores: Accessibility 98/100, Performance 80+, SEO 100."

### While Mobile runs:
- "One tag — @device:iPhone14 — instant mobile emulation."
- "Touch targets checked to be ≥44x44px (WCAG 2.5.5)."
- "Same test, same locators — just a different viewport."

### While Native App runs:
- "Real Samsung Galaxy S23 on BrowserStack — not an emulator."
- "Same BDD approach — properties files for locators, Gherkin for steps."
- "Supports Android + iOS, BrowserStack + LambdaTest + local Appium."

---

## If Something Fails During Demo

| Situation | What to say |
|-----------|-------------|
| Web test fails on locator | "This is where self-healing activates — let's look at the healing report." |
| API returns different status | "The public API may have rate limits — let me run a different scenario." |
| BrowserStack takes long | "Cloud device provisioning takes 30-40s — that's normal for real devices." |
| Accessibility shows violations | "These are real violations in the app — the framework found them. That's the value." |

---

## Backup Commands (If Primary Fails)

```bash
# If npm test hangs (tags conflict), run specific scenario:
npx cucumber-js -p api --tags "@jsonplaceholder and @smoke"

# If BrowserStack is slow, show local native on emulator:
npm run test:native:android

# If accessibility audit has issues, run keyboard check only:
npx cucumber-js -p accessibility --tags "@keyboard"

# Quick smoke of everything working:
npx cucumber-js -p api --tags "@crud-lifecycle"
```
