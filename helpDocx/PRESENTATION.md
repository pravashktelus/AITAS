# Playwright BDD Framework — Google Slides Presentation

> Copy each slide's content into Google Slides.
> Suggested theme: Dark background (e.g. "Slate" or "Simple Dark") with accent color **#2e7d32** (green).
> Recommended font: **Inter** or **Roboto** for body, **Roboto Mono** for code.

---

## SLIDE 1 — Title Slide

**Title (large, centered):**
```
Playwright BDD Framework
```

**Subtitle:**
```
Production-Grade Test Automation for TeleConnect BuyFlow
```

**Body (small, bottom):**
```
Playwright · Cucumber · TypeScript · AI Self-Healing
App Under Test: simulapp.online
```

**Visual suggestion:** Dark gradient background with a green (#2e7d32) accent bar at the bottom.

---

## SLIDE 2 — What Is This Framework?

**Title:** What Is This Framework?

**Left column — heading:** A 2-Layer BDD Automation Suite

**Left column — body:**
```
Testers write only two things:

  Layer 1 → Feature Files (.feature)
            Plain-English Gherkin

  Layer 2 → Properties Files (.properties)
            Element name → Locator

The framework handles everything else automatically.
```

**Right column — code box (use monospace, dark background):**
```gherkin
# Feature File
When I click 'TeleConnect.BtnNewConnection'
Then the url should contain 'order'

# Properties File
BtnNewConnection=//button[@data-testid='btn-connection']
```

**Speaker notes:** No TypeScript page classes. No boilerplate. Add a new element = add one line to the properties file.

---

## SLIDE 3 — Business Flow Covered

**Title:** End-to-End Broadband Provisioning Journey

**Center diagram (use 5 boxes connected by arrows, left to right):**

```
[1. Customer]          [2. CRM Agent]        [3. Install Team]
Register & Place  →→   Review & Approve  →→  Schedule & Complete
    Order               Order                  Installation
                                                    ↓↓
                                          [5. Customer]    ←←  [4. Activation]
                                         Verify ACTIVATED       Activate
                                            on Dashboard        Broadband
```

**Below diagram:**
```
5 Web Portals  ·  14 API Scenarios  ·  Full Lifecycle in a Single Test Run
```

**Visual suggestion:** Use a horizontal flow diagram with colored boxes (green shades), connecting arrows between portals.

---

## SLIDE 4 — Tech Stack

**Title:** Technology Stack

**Two-column table:**

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| Browser Automation | Playwright 1.60 |
| BDD Runner | Cucumber.js 10 |
| HTTP Client | Axios 1.7 |
| Fake Data | Faker.js 10 |
| AI Self-Healing | OpenAI SDK 4 |
| Logging | Winston 3 |
| Schema Validation | AJV 8 |
| Unit Testing | Vitest 4 + fast-check |
| Reporting | Cucumber HTML + Allure |

**Key callout box (right side):**
```
No playwright.config.ts
No build step needed
ts-node runs TypeScript directly
```

---

## SLIDE 5 — Architecture Overview

**Title:** How It Works — Architecture

**Full-width diagram (stacked layers):**

```
┌──────────────────────────────────────────────────────────┐
│  YOU WRITE                                               │
│  features/web/login.feature    ←  plain Gherkin          │
│  src/pages/properties/Login.properties  ←  locators     │
└─────────────────────┬────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────┐
│  FRAMEWORK CORE  (never change for new tests)            │
│                                                          │
│  ElementResolver → reads .properties → returns locator  │
│  ActionEngine    → calls page.locator().click()          │
│  SelfHealingEngine → AI fallback if locator breaks       │
│  ContextManager  → browser open/close per scenario       │
│  Hooks           → before/after, screenshots, reports    │
└──────────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────┐
│  OUTPUT                                                  │
│  HTML Report · Allure · Screenshots · Videos · Logs      │
└──────────────────────────────────────────────────────────┘
```

---

## SLIDE 6 — Project Structure

**Title:** Project Structure

**Left side — folder tree (monospace, dark box):**
```
BDD_Playwright-main/
├── features/
│   ├── web/          ← Gherkin UI tests
│   └── api/          ← API-only tests
├── src/
│   ├── config/       ← framework.properties
│   ├── core/         ← Engine layer
│   ├── hooks/        ← Lifecycle hooks
│   ├── pages/
│   │   └── properties/  ← Locator maps
│   ├── steps/        ← Step definitions
│   └── utils/        ← Shared utilities
├── testdata/         ← JSON data + store
└── reports/          ← Output (gitignored)
```

**Right side — callout cards:**

🟢 **features/** — Write here (Gherkin only)
🟢 **pages/properties/** — Write here (locators only)
🔵 **core/** — Never modify
🔵 **steps/** — Never modify
⚙️ **config/** — Configure once

---

## SLIDE 7 — Page Object Model (Properties Files)

**Title:** Page Object Model — Zero Code Approach

**Left panel — heading:** Traditional POM vs This Framework

**Left panel — body (two columns):**

| Traditional POM | This Framework |
|---|---|
| TypeScript class per page | One .properties file per page |
| Getters, constructors, imports | Key = Value pairs |
| Refactor on every rename | Change one line |
| 50+ lines per page | 20–30 lines per page |

**Right panel — code example (dark box, monospace):**
```properties
# TeleConnect.properties

BtnNewConnection=//button[@data-testid='btn-connection']
InputName=//input[@data-testid='input-name']
InputEmail=//input[@data-testid='input-email']
SelectGender=//select[@data-testid='select-gender']
BtnNext=//button[@data-testid='btn-next']
OrderSuccess=//div[@data-testid='order-success']
OrderNumber=//p[@data-testid='order-number']
```

**Bottom callout:**
```
Used in feature files as: 'TeleConnect.BtnNewConnection'
Format:  'FileName.ElementKey'
```

---

## SLIDE 8 — Variable System (3 Layers)

**Title:** Variable System — 3 Layers of Data

**Three side-by-side cards:**

**Card 1 — green tint:**
```
{variableName}
In-Scenario Store

Scope: Current scenario only
Store:   I store text of 'X' as 'myVar'
Use:     I enter '{myVar}' into 'Y'

Example: {authToken}, {orderId}
```

**Card 2 — blue tint:**
```
$$variableName
Cross-Scenario Store

Scope: Entire test run
Store:   I get text from 'X' and store as 'Z'
Use:     I enter '$$OrderId' into 'Search'

File: testdata/runtime-store.json
```

**Card 3 — purple tint:**
```
##TokenName
Random Data Generator

Scope: Generated fresh each run
Use:  I enter '##Email' into 'Form.Email'

Tokens: ##FullName  ##Email  ##MobileNum
        ##Address   ##Password  ##UUID
```

**Bottom note:**
```
These three systems work together → combine in the same step
```

---

## SLIDE 9 — Cross-Scenario Data Flow

**Title:** How Data Flows Across 5 Scenarios

**Timeline / flow diagram (left to right):**

```
Feature 1             Feature 2          Feature 3
1_teleconnect    →→   2_telecrm     →→   3_teleinstall
                 
Creates:              Uses:              Uses:
$$OrderId             $$OrderId          $$OrderId
$$Email               Search + Approve   Schedule +
$$Password                               Complete
$$FullName


Feature 4             Feature 5
4_teleactivate   →→   5_televerify

Uses:                 Uses:
$$OrderId             $$Email
Activate              $$Password
Connection            Login + Verify
                      ACTIVATED status
```

**Right callout:**
```
All stored in:
testdata/runtime-store.json

Auto-created by PersistentStore.ts
Auto-read by $$variable syntax
```

---

## SLIDE 10 — AI Self-Healing Engine

**Title:** AI Self-Healing Engine

**Left — how it works (flow):**
```
Step runs
    ↓
Locator search (5 sec timeout)
    ↓ [timeout]
SelfHealingEngine activates
    ↓
Try heuristic fallbacks:
  · text=  ·  role=  ·  aria-label
  · nearby text  ·  DOM structure
    ↓
Call OpenAI GPT (if enabled)
  → Suggests best locator
    ↓
Healed locator executes
    ↓
HTML report attached to test result
```

**Right — callout cards:**

🟢 **Transparent** — test still passes
🟢 **Confidence score** — shown in report
🟢 **Fallback list** — ranked alternatives
🔵 **Heuristic mode** — no API key needed
🔵 **OpenAI mode** — smarter suggestions

**Bottom:**
```
Controlled by: selfHealing.enabled=true in framework.properties
Requires: OPENAI_API_KEY in .env (for AI mode)
```

---

## SLIDE 11 — Root Cause Analysis

**Title:** AI-Powered Root Cause Analysis on Failure

**Left — what happens on failure:**
```
Step FAILS
    ↓
Screenshot captured automatically
    ↓
RootCauseAnalyzer collects:
  · Error message + stack trace
  · Current page URL and title
  · Last actions taken
  · Screenshot (base64)
    ↓
Sends context to OpenAI GPT
    ↓
Returns:
  · Root cause explanation
  · Suggested fixes (ranked)
    ↓
HTML RCA card attached to report
```

**Right — example RCA card (simulated screenshot style):**
```
🔴 Root Cause Analysis

Failure Message:
  TimeoutError: Locator not found after 30s
  //button[@data-testid='btn-next']

Page Context:
  URL:   /order/step-1
  Title: TeleConnect — New Order

Root Cause:
  Element exists but is behind a loading
  overlay. The spinner did not disappear
  before the click was attempted.

Suggested Fixes:
  1. Add wait for spinner to disappear
  2. Use wait for element to be enabled
  3. Increase navigation timeout
```

---

## SLIDE 12 — Reporting

**Title:** Rich Test Reporting — Per-Run Isolation

**Three columns:**

**Column 1 — HTML Report:**
```
📄 Cucumber HTML Report

Command:
npm run report

Location:
reports/html/cucumber-report.html

Contains:
· Scenario pass/fail status
· Step-by-step execution log
· Embedded screenshots
· Self-healing HTML cards
· RCA HTML cards
· Step timing data
· DataStore dump on failure
```

**Column 2 — Allure Report:**
```
📊 Allure Report (Per-Run Isolation)

Commands:
npm run allure:serve     ← open latest run
npm run allure:open      ← generate static HTML
npm run allure:history   ← list all past runs

Location:
reports/allure-results/run-<timestamp>/

Each run → own isolated folder:
├── run-2026-07-09_17-15-10/
├── run-2026-07-09_18-30-22/
└── latest-run.txt

Contains:
· Step duration timings
· Per-scenario breakdown
· Historical trend data
· Screenshots & attachments
· Failure categories

Setup (one-time):
npm install -g allure-commandline
# or: scoop install allure (Windows)
# or: brew install allure (macOS)
```

**Column 3 — Artifacts:**
```
📁 Test Artifacts

📸 Screenshots
  reports/screenshots/
  · Failure screenshots
  · Self-healing images
  · Retained on failure

🎬 Videos
  reports/videos/
  · .webm format
  · retain-on-failure

📋 Logs
  reports/logs/
  · test-run.log
  · errors.log
```

---

## SLIDE 13 — Step Library

**Title:** Built-in Step Library — No Code Required

**Two columns of step categories:**

**Column 1:**
```
🌐 Navigation
  Given I navigate to the application
  When I go back / forward / refresh

🖱️ Interactions
  When I click 'Page.Element'
  When I enter 'value' into 'Page.Element'
  When I select 'Option' from 'Page.Dropdown'
  When I check / uncheck 'Page.Checkbox'
  When I hover over 'Page.Element'
  When I scroll to 'Page.Element'

⌛ Waiting
  When I wait for 'Page.Element' to be visible
  When I wait for the url to contain '/path'
  When I wait 3 seconds
```

**Column 2:**
```
✅ Assertions
  Then 'Page.Element' should be visible
  Then 'Page.Element' should have text 'X'
  Then 'Page.Element' should contain text 'X'
  Then the url should contain 'dashboard'

📦 Data
  When I store text of 'Page.Element' as 'var'
  When I get text from 'Page.X' and store as 'Y'
  When I persist '{var}' as 'savedVar'

🌐 API
  When I send a POST request to '/api/login'
  Then the response status should be 200
  Then the response body field 'token' should exist
  And I store the response body field 'id' as 'userId'
```

---

## SLIDE 14 — Configuration

**Title:** Zero-Friction Configuration

**Large code block (dark background, monospace):**
```properties
# src/config/framework.properties

# Browser & Environment
env=qa
browser=chromium          # chromium | firefox | webkit
headless=false            # true for CI/CD pipelines
app.url=https://simulapp.online/login

# Timeouts (ms)
defaultTimeout=30000
navigationTimeout=60000
slowMo=500                # 0 = full speed, 500 = demo mode

# Artifacts
screenshotOnFail=true
video=retain-on-failure

# AI Self-Healing
selfHealing.enabled=true
selfHealing.useOpenAI=true    # OPENAI_API_KEY in .env

# Test Users
test.user.password=TestUser@123
test.user.emailDomain=teleconnect.local
```

**Bottom callout row:**
```
One file controls everything  ·  Change browser in 1 line  ·  Switch env in 1 line
```

---

## SLIDE 15 — Running Tests

**Title:** Running Tests — Simple Commands

**Four command boxes:**

**Box 1 — Setup:**
```bash
# 1. Install dependencies
npm install

# 2. Install browsers
npx playwright install --with-deps

# 3. Create secrets file
copy .env.example .env
```

**Box 2 — Run:**
```bash
# Run full suite
npm test

# Run by tag
npx cucumber-js --tags "@smoke"
npx cucumber-js --tags "@teleconnect_orderingestion"

# Run single feature
npx cucumber-js features/web/1_teleconnect.feature
```

**Box 3 — Reports:**
```bash
# Generate HTML report
npm run report

# Clean output folders
npm run clean
```

**Box 4 — CI/CD:**
```bash
# Headless CI run
set HEADLESS=true & npm test

# Staging environment
set ENV=staging & npm test
```

---

## SLIDE 16 — Test Coverage Summary

**Title:** Test Coverage at a Glance

**Stats row (large numbers):**

| 7 | 14 | 5 | 3 | 6 | 11 |
|---|---|---|---|---|---|
| Web Feature Files | API Scenarios | End-to-End Portals | Browsers Supported | Mobile Devices | New Tags |

**Table:**

| Feature | Tag | Type | Scope |
|---|---|---|---|
| 1_teleconnect | @teleconnect_orderingestion | Web | Register + 6-step order placement |
| 2_telecrm | @teleconnect_crm | Web | CRM review and approval |
| 3_teleinstall | @teleconnect_install | Web | Schedule + complete installation |
| 4_teleactivate | @teleconnect_activate | Web | Broadband activation |
| 5_televerify | @teleconnect_verify | Web | Customer ACTIVATED status check |
| 6_customersupport | @customersupport_web | Web | Raise support ticket |
| registeruser_api | @register-user-api | API | POST register + assertions |
| order-journey | @order-journey-api | API | 14-scenario full lifecycle |

---

## SLIDE 17 — Onboarding a New Application

**Title:** Add a New App in 4 Steps

**Four numbered cards:**

**Card 1:**
```
1. Set URL
   In src/config/framework.properties:

   app.url=https://mynewapp.com/login
```

**Card 2:**
```
2. Create Properties File
   src/pages/properties/MyApp.properties

   LoginEmail=#email
   LoginButton=//button[@type='submit']
   WelcomeHeading=h1.welcome
```

**Card 3:**
```
3. Write Feature File
   features/web/myapp.feature

   @web @myapp_login
   Feature: MyApp Login
     Scenario: User logs in
       Given I navigate to the application
       When I enter 'user@test.com' into 'MyApp.LoginEmail'
       And I click 'MyApp.LoginButton'
       Then 'MyApp.WelcomeHeading' should be visible
```

**Card 4:**
```
4. Add Tag to cucumber.yml
   tags: "... or @myapp_login"

   Then run:
   npm test
```

**Bottom callout:**
```
Zero TypeScript changes required
```

---

## SLIDE 19 — Mobile Device Emulation

**Title:** Tag-Driven Mobile Device Emulation

**Left panel — The approach (flow diagram):**
```
@device:iPhone14 tag on scenario
         ↓
Before Hook → TagParser extracts device
         ↓
ContextManager resolves device profile
         ↓
MobileEngine applies emulation:
  · Viewport: 390×844
  · User Agent: iPhone UA
  · Touch: enabled
  · DPR: 3
         ↓
Browser context created with emulation
BEFORE first navigation
         ↓
Scenario runs in mobile context
         ↓
Emulation metadata captured in report
```

**Right panel — Supported devices table:**

| Device | Tag | Viewport |
|--------|-----|----------|
| iPhone 14 | `@device:iPhone14` | 390×844 |
| iPhone SE | `@device:iPhoneSE` | 375×667 |
| Pixel 7 | `@device:Pixel7` | 412×915 |
| Galaxy S23 | `@device:SamsungGalaxyS23` | 360×780 |
| iPad Pro | `@device:iPadPro` | 1024×1366 |
| iPad Mini | `@device:iPadMini` | 768×1024 |

**Bottom — configuration callout:**
```properties
mobile.defaultDevice=iPhone 14        # Used for @mobile tag
mobile.defaultOrientation=portrait    # portrait | landscape
mobile.networkCondition=3G            # 2G/3G/4G/fast (Chromium only)
mobile.executionMode = emulation | simulator | device | cloud
mobile.cloudProvider = browserstack | lambdatest | saucelabs
```

**Key callouts:**
- 🏷️ One tag = full emulation (viewport, UA, touch, DPR)
- 📱 `@mobile` tag uses default device from config
- 🌐 Network throttling via CDP (Chromium only, gracefully skipped on others)
- 📊 Emulation metadata auto-captured in test report
- 🔀 One property switches between emulation, simulator, real device, or cloud — no code changes

---

## SLIDE 20 — Accessibility Testing (WCAG Auditing)

**Title:** Automated WCAG Accessibility Auditing

**Left panel — flow diagram:**
```
@accessibility or @a11y tag
         ↓
Before Hook → register navigation listener
         ↓
Every page navigation triggers auto-audit
         ↓
AccessibilityEngine.auditPageWithLevel()
  · Runs WCAG 2.1 audit
  · Filters by level: A / AA / AAA
  · Classifies: critical / serious / moderate / minor
         ↓
Threshold checks:
  · failOnCritical=true → immediate fail
  · maxViolations=0 → fail on any violation
  · 10s timeout → abort and continue
         ↓
HTML report auto-attached to Cucumber output
Cumulative count stored in DataStore
```

**Right panel — configuration + features:**

```properties
accessibility.enabled=true
accessibility.failOnCritical=true
accessibility.wcagLevel=AA           # A | AA | AAA
accessibility.maxViolations=0        # 0 = fail on any
```

**Mobile-specific checks (when @accessibility + @mobile):**
```
✔ Touch target size ≥ 44×44px
✔ Content reflow — no horizontal scrolling
```

**Severity classification table:**

| Severity | Auto-Fail | Example |
|----------|-----------|---------|
| Critical | ✅ Yes | No keyboard access |
| Serious | ❌ | Low color contrast |
| Moderate | ❌ | Missing heading hierarchy |
| Minor | ❌ | Best practice violation |

**Bottom callout:**
```
One tag. Automatic WCAG audit on every navigation.
Compliance built into your pipeline.
```

---

## SLIDE 21 — Cross-Browser Testing

**Title:** Advanced Cross-Browser Testing with Matrix Report

**Left panel — execution flow:**
```
framework.properties:
  browsers=chromium,firefox,webkit
  crossBrowser.parallel=true
         ↓
CrossBrowserRunner entry point
         ↓
CrossBrowserManager orchestrates:
  ┌─ Chromium ──┐
  │  Full suite │
  │  + filters  │ ←── Concurrent
  └─────────────┘     execution
  ┌─ Firefox ───┐
  │  Full suite │
  │  + filters  │
  └─────────────┘
  ┌─ WebKit ────┐
  │  Full suite │
  │  + filters  │
  └─────────────┘
         ↓
Consolidated HTML Matrix Report
reports/cross-browser/cross-browser-report.html
```

**Right panel — browser filter tags:**

| Tag | Effect |
|-----|--------|
| `@chromium-only` | Run only on Chromium |
| `@firefox-only` | Run only on Firefox |
| `@webkit-only` | Run only on WebKit |
| `@skip-chromium` | Skip on Chromium |
| `@skip-firefox` | Skip on Firefox |
| `@skip-webkit` | Skip on WebKit |

**Matrix report preview (simulated):**
```
┌─────────────────┬──────────┬─────────┬────────┐
│ Scenario        │ Chromium │ Firefox │ WebKit │
├─────────────────┼──────────┼─────────┼────────┤
│ Login flow      │ ✅ PASS  │ ✅ PASS │ ✅ PASS│
│ Checkout        │ ✅ PASS  │ ❌ FAIL │ ✅ PASS│  ← browser-specific failure
│ File upload     │ ✅ PASS  │ ✅ PASS │ ⏭ SKIP│
└─────────────────┴──────────┴─────────┴────────┘
Per-browser: Pass rate 95.2% | 88.1% | 92.5%
```

**Bottom — commands:**
```bash
# Run cross-browser suite
npx ts-node src/core/CrossBrowserRunner.ts

# Browser-specific viewport/headless/args per engine
browser.chromium.viewport=1280x720
browser.firefox.headless=true
```

---

## SLIDE 22 — Real Device Testing

**Title:** Real Device Testing — Local & Cloud

**Left panel — providers:**
```
Three Providers:

🔌 Local Appium
   iOS (XCUITest) + Android (UiAutomator2)
   Connect to physical devices via USB
   
☁️ BrowserStack
   Real device cloud farm
   WSS connection via CDP
   
☁️ LambdaTest
   Real device cloud farm
   WSS connection via CDP
```

**Right panel — configuration:**
```properties
# framework.properties
realDevice.enabled=true
realDevice.provider=browserstack
realDevice.platform=ios
realDevice.deviceName=iPhone 15
realDevice.osVersion=17
realDevice.browser=safari
```

```env
# .env (credentials)
BROWSERSTACK_USERNAME=your_user
BROWSERSTACK_ACCESS_KEY=your_key
```

**Bottom — key points:**
```
✅ Real device overrides emulation automatically
✅ All existing steps work unchanged on real devices
✅ Device metadata auto-captured in reports
✅ Session cleanup is automatic
✅ No new npm dependencies required
```

---

## SLIDE 23 — Native App Testing (Appium)

**Title:** Native App Testing — Android & iOS

**Left panel — how it works:**
```
📱 Test native apps (.apk / .ipa)

Tag: @native @android  or  @native @ios

Same 2-layer approach:
  1. Feature file (.feature)
  2. Properties file (.properties)

No new npm dependencies — uses native fetch()
for Appium REST API calls.
```

**Right panel — code example (monospace, dark background):**
```gherkin
@native @android
Scenario: Login on Android app
  Given I launch the app
  When I enter 'user@test.com' into native 'NativeAndroid.InputEmail'
  And I enter 'secret' into native 'NativeAndroid.InputPassword'
  And I tap 'NativeAndroid.BtnLogin'
  Then native 'NativeAndroid.WelcomeHeading' should be visible
```

**Bottom — key points:**
```
✅ Supports gestures: swipe, scroll, long press
✅ Hybrid app support (context switching)
✅ Platform-specific locator strategies (UiAutomator2, iOS Predicate, Class Chain)
✅ Screenshot on failure auto-attached to report
✅ Same ##token and {variable} systems work
```

---

## SLIDE 24 — Summary & Key Benefits

**Title:** Why This Framework

**Two columns:**

**Column 1 — For Testers:**
```
✅ Write in plain English (Gherkin)
✅ No programming knowledge needed
✅ Add elements in one line
✅ Reuse 50+ built-in steps instantly
✅ Random test data auto-generated
✅ Cross-scenario data sharing built-in
✅ Tests self-heal when UI changes
✅ Mobile testing with one tag — @device:iPhone14
✅ Accessibility auditing — automatic on @a11y
```

**Column 2 — For Teams:**
```
✅ Full coverage: Web + API + Native App + E2E
✅ AI explains failures automatically
✅ Videos + screenshots on every failure
✅ Allure + HTML reports out of the box
✅ CI/CD ready (headless mode)
✅ Multi-browser parallel execution + matrix report
✅ No build step — runs directly
✅ WCAG compliance built into pipeline
✅ Cross-browser failures detected automatically
```

**Bottom large callout (green background):**
```
One framework. Any web app. Any native app. No code changes.
Mobile + Native + Accessibility + Cross-Browser — all tag-driven.
```

---

## SLIDE 23 — Thank You / Q&A

**Title (large, centered):**
```
Thank You
```

**Body:**
```
Playwright BDD Framework
TeleConnect BuyFlow Automation

Repository:  BDD_Playwright-main/
App Under Test:  https://simulapp.online
Stack:  Playwright · Cucumber · TypeScript · OpenAI
```

**Bottom row of icons/tags:**
```
📄 Feature Files    🗂️ Properties Files    🤖 AI Self-Healing
🧪 Web + API        📊 Rich Reports        ⚡ Zero Boilerplate
📱 Mobile Emulation 🌐 Cross-Browser       ♿ WCAG Accessibility
```

---

## SLIDE 25 — Cross-Browser Enhancement v1.1

**Title:** Cross-Browser Enhancement v1.1 — Architecture Deep Dive

**Left panel — Single Property Architecture:**
```
┌──────────────────────────────────────────┐
│  framework.properties                     │
│  browsers=chromium,firefox,webkit         │
│  crossBrowser.parallel=true               │
│  crossBrowser.maxParallel=3               │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  CrossBrowserRunner (entry point)         │
│  ├── Reads FrameworkConfig               │
│  ├── Creates RetryManager per browser    │
│  ├── Resolves browser-specific config    │
│  └── Delegates to CrossBrowserManager    │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  CrossBrowserManager                      │
│  ├── Sequential: one-by-one              │
│  └── Parallel: concurrent + isolation    │
│      ┌─────────┐ ┌─────────┐ ┌────────┐ │
│      │Chromium │ │Firefox  │ │WebKit  │ │
│      │ child   │ │ child   │ │ child  │ │
│      │ process │ │ process │ │ process│ │
│      └────┬────┘ └────┬────┘ └───┬────┘ │
│           ↓            ↓          ↓      │
│      Isolated     Isolated    Isolated   │
│      reports/     reports/    reports/    │
└──────────────────────────────────────────┘
```

**Right panel — Key Components:**

| Component | Role |
|-----------|------|
| `RetryManager` | Exponential backoff retry per browser (launch failures) |
| `ArtifactPathResolver` | Browser-namespaced screenshots/videos/logs |
| `ReportLinker` | Injects link banner into main Cucumber HTML report |
| `CrossBrowserReportGenerator` | Matrix report + trend analysis + history |

**Center panel — CLI Summary Output:**
```
═══════════════════════════════════════════
  Cross-Browser Execution Summary
═══════════════════════════════════════════
  Browser     │ Passed │ Failed │ Pass Rate
  ────────────┼────────┼────────┼──────────
  chromium    │    14  │     0  │   100.0%
  firefox     │    12  │     2  │    85.7%
  webkit      │    13  │     0  │   100.0%

  ⚠ Browser-Specific Failures:
    • Checkout flow (firefox only)
═══════════════════════════════════════════
```

**Bottom — npm scripts:**
```bash
npm run test:cross-browser           # Sequential all browsers
npm run test:cross-browser:parallel  # Parallel execution
npm run test:chromium                # Chromium only
npm run test:firefox                 # Firefox only
npm run test:webkit                  # WebKit only
```

**Key points callout:**
```
✅ Single 'browsers' property controls everything
✅ RetryManager with exponential backoff for launch resilience
✅ Per-browser execution timeout with process termination
✅ ArtifactPathResolver prevents cross-browser file overwrites
✅ Matrix HTML report with trend analysis across runs
✅ History persistence in reports/cross-browser/history.json
✅ ReportLinker: one-click navigation from main report
✅ Color-coded CLI summary with browser-specific failure detection
✅ @browsers:chromium,firefox — flexible multi-browser filter tag
```

---

## GOOGLE SLIDES SETUP TIPS

### Theme & Colors
- **Background:** #0f172a (dark navy) or use "Slate" built-in theme
- **Accent color:** #2e7d32 (green) for headings and callouts
- **Code blocks:** #1e293b background, #a5f3a5 text (monospace font)
- **Secondary accent:** #1976d2 (blue) for API/config sections

### Fonts
- **Headings:** Roboto Bold or Inter SemiBold, 32–40pt
- **Body:** Roboto Regular, 16–18pt
- **Code:** Roboto Mono or Fira Code, 13–14pt

### Slide Layout Recommendations
- Slides 1, 22, 23 → Full-bleed dark with centered text
- Slides 5, 9 → Full-width diagram (use Shapes + arrows)
- Slides 7, 8, 12, 13, 15 → Two or three column layout
- Slides 4, 16 → Table layout
- Slides 19, 20, 21 → Two-column: flow diagram + config/features

### Quick Import to Google Slides
1. Go to **slides.google.com** → New presentation
2. Choose **"Slate"** or **"Simple Dark"** theme
3. Use **Insert → Text box** for each slide's content
4. For code blocks: use **Background fill #1e293b**, font **Roboto Mono**
5. For diagrams: use **Insert → Shapes** and draw flow boxes


---

## SLIDE 26 — Mobile & Native App Setup Guide

**Title:** Mobile Testing Setup — Three Levels

**Left panel — Levels diagram:**
```
┌─────────────────────────────────────────────┐
│  Level 1: Playwright Emulation              │
│  ✅ Zero setup                              │
│  npm run test:mobile                        │
│  Tags: @mobile, @device:iPhone14            │
├─────────────────────────────────────────────┤
│  Level 2: Appium + Device/Emulator          │
│  Requires: Java + Android Studio + Appium   │
│  appium driver install uiautomator2         │
│  Tags: @native @android                     │
├─────────────────────────────────────────────┤
│  Level 3: Cloud (BrowserStack/LambdaTest)   │
│  Requires: Credentials in .env only         │
│  realDevice.provider=browserstack           │
│  Same test code — zero changes              │
└─────────────────────────────────────────────┘
```

**Right panel — Setup checklist:**
```
□ Node.js 18+
□ Java JDK 17+
□ ANDROID_HOME environment variable
□ Android Studio + SDK Tools
□ Appium 2.x (npm install -g appium)
□ UiAutomator2 driver installed
□ Device visible (adb devices)
□ Appium server running (port 4723)
```

**Center — configuration switch:**
```properties
# Switch between modes — one property:
realDevice.provider=local          # Appium + USB device
realDevice.provider=browserstack   # Cloud (no device needed)
realDevice.provider=lambdatest     # Cloud alternative

# Or stay on emulation:
mobile.executionMode=emulation     # Playwright built-in
```

**Bottom callout:**
```
Same test scenarios work on ALL levels
No code changes between emulation → device → cloud
Just change framework.properties
```

