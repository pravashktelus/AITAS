# BDD Playwright Framework v3.0 — Technical Specification

> Comprehensive BDD automation framework for Web UI, API, Accessibility, Mobile Emulation,
> Native App (Appium/BrowserStack/LambdaTest), Cross-Browser, Self-Healing, and Visual Testing.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Configuration System](#4-configuration-system)
5. [Core Engines](#5-core-engines)
6. [Hooks Lifecycle](#6-hooks-lifecycle)
7. [Web UI Testing](#7-web-ui-testing)
8. [API Testing](#8-api-testing)
9. [Mobile Emulation](#9-mobile-emulation)
10. [Native App Testing](#10-native-app-testing)
11. [Accessibility Testing](#11-accessibility-testing)
12. [Cross-Browser Testing](#12-cross-browser-testing)
13. [Self-Healing Engine](#13-self-healing-engine)
14. [Visual Testing](#14-visual-testing)
15. [Reporting System](#15-reporting-system)
16. [Running Tests](#16-running-tests)
17. [Extending the Framework](#17-extending-the-framework)
18. [Appendix: Configuration Reference](#18-appendix-configuration-reference)

---

## 1. Architecture Overview

### 1.1 Design Philosophy

The framework employs a **2-layer BDD architecture** that eliminates the need for test authors to write TypeScript:

```
Layer 1: Feature Files (.feature)     — Gherkin scenarios written in plain English
Layer 2: Properties Files (.properties) — Page element locators as key=value pairs
```

Test authors define WHAT to test (feature files) and WHERE elements are (properties files). The framework handles HOW through pre-built step definitions and engine classes.

### 1.2 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     Feature Files (Gherkin)                       │
│         features/**/*.feature — @web @api @native @mobile        │
├─────────────────────────────────────────────────────────────────┤
│                   Properties Files (Locators)                     │
│         src/pages/properties/*.properties — PageName.Key          │
├─────────────────────────────────────────────────────────────────┤
│                Step Definitions (Pre-built)                       │
│     WebSteps · ApiSteps · MobileSteps · NativeAppSteps · etc.    │
├─────────────────────────────────────────────────────────────────┤
│                    Core Engines                                   │
│  ActionEngine · ApiEngine · MobileEngine · NativeAppEngine       │
│  SelfHealingEngine · AccessibilityEngine · VisualTestingEngine   │
├─────────────────────────────────────────────────────────────────┤
│                  Infrastructure                                   │
│  ContextManager · FrameworkConfig · DataStore · Logger · Hooks    │
├─────────────────────────────────────────────────────────────────┤
│               Playwright / Appium / Cloud Providers               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Cucumber World (CustomWorld)

The `CustomWorld` class serves as the central dependency container injected into every step definition:

```typescript
export class CustomWorld extends World {
  public contextManager: ContextManager;      // Browser/Context/Page lifecycle
  public actionEngine!: ActionEngine;          // UI interactions with self-healing
  public selfHealingEngine!: SelfHealingEngine; // Broken locator recovery
  public visualTestingEngine!: VisualTestingEngine; // Screenshot regression
  public rootCauseAnalyzer!: RootCauseAnalyzer;    // AI failure analysis
  public mobileEngine!: MobileEngine;          // Device emulation & gestures
  public accessibilityEngine!: AccessibilityEngine; // WCAG audits
  public apiEngine: ApiEngine;                 // HTTP client for API tests
  public nativeAppEngine: NativeAppEngine | null; // Appium REST client
  public testUserManager: TestUserManager;     // Dynamic test user creation
  public scenarioTags: string[];               // Active scenario tags
  public stepTimings: Map<string, { startTime: number; endTime: number }>;
}
```

### 1.4 Tag-Driven Behavior

Scenario tags determine which engines are activated and how the test environment is configured:

| Tag | Behavior |
|-----|----------|
| `@web` | Standard browser launch with Playwright |
| `@api` | Skip browser launch; use ApiEngine only |
| `@native` | Skip browser; create Appium session for native app |
| `@mobile` | Launch browser with device emulation (default device from config) |
| `@device:iPhone14` | Launch browser emulating specific device |
| `@accessibility` / `@a11y` | Enable auto-audit on navigation events |
| `@visual` | Enable visual regression screenshot capture |
| `@android` / `@ios` | Platform selection for native app testing |
| `@chromium-only` | Run only on Chromium in cross-browser mode |
| `@firefox-only` | Run only on Firefox in cross-browser mode |
| `@webkit-only` | Run only on WebKit in cross-browser mode |
| `@skip-firefox` | Skip on Firefox in cross-browser mode |
| `@browsers:chromium,firefox` | Run on specified browsers only |

---

## 2. Technology Stack

### 2.1 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@cucumber/cucumber` | ^10.3.2 | BDD test runner with Gherkin parser |
| `playwright` | ^1.60.0 | Browser automation engine |
| `@playwright/test` | ^1.60.0 | Playwright test assertions and utilities |
| `axios` | ^1.7.2 | HTTP client for API testing |
| `openai` | ^4.52.0 | GPT integration for self-healing suggestions |
| `sharp` | ^0.33.0 | Image processing for visual testing |
| `winston` | ^3.13.0 | Structured logging |
| `@faker-js/faker` | ^10.4.0 | Random test data generation |
| `dotenv` | ^16.4.5 | Environment variable management |
| `ts-node` | ^10.9.2 | TypeScript execution without compilation |
| `typescript` | ^5.4.5 | TypeScript language support |
| `multiple-cucumber-html-reporter` | ^3.7.0 | Cucumber HTML dashboard reports |
| `ajv` | ^8.16.0 | JSON Schema validation for API responses |
| `@apidevtools/json-schema-ref-parser` | ^11.7.3 | JSON Schema $ref resolution |

### 2.2 Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `allure-commandline` | ^2.43.0 | Allure report generation and serving |
| `vitest` | ^4.1.6 | Unit testing for framework internals |
| `fast-check` | ^4.8.0 | Property-based testing for framework logic |
| `@types/node` | ^20.12.12 | Node.js type definitions |

### 2.3 Runtime Requirements

- **Node.js**: 18+ (required for native `fetch` used in NativeAppEngine)
- **TypeScript**: 5.4+ (strict mode enabled)
- **OS**: Windows, macOS, Linux
- **Browsers**: Chromium, Firefox, WebKit (installed via `npx playwright install`)

---

## 3. Project Structure

```
BDD_Playwright-v3.0/
├── .env                            # Secrets only (API keys, cloud credentials)
├── .env.example                    # Template for .env setup
├── .allurerc.json                  # Allure reporter configuration
├── cucumber.yml                    # Cucumber profiles (default, cross-browser, accessibility, mobile, native)
├── package.json                    # Dependencies and npm scripts
├── tsconfig.json                   # TypeScript compiler options
├── SPEC_FRAMEWORK.md              # This specification document
│
├── features/                       # Gherkin feature files
│   ├── web/                        # Web UI scenarios
│   │   ├── teleconnect.feature     # TeleConnect order ingestion
│   │   ├── telecrm.feature         # CRM workflows
│   │   ├── teleinstall.feature     # Installation scenarios
│   │   └── teleactivate.feature    # Activation scenarios
│   ├── api/                        # API testing scenarios
│   ├── mobile/                     # Mobile emulation scenarios
│   ├── native/                     # Native app scenarios (Android/iOS)
│   └── accessibility/              # WCAG audit scenarios
│
├── src/
│   ├── config/
│   │   ├── FrameworkConfig.ts      # Singleton config parser (framework.properties + .env)
│   │   ├── framework.properties    # All non-secret settings (timeouts, browsers, features)
│   │   └── environments.json       # Per-environment base URLs and settings
│   │
│   ├── core/
│   │   ├── ActionEngine.ts         # UI action engine with self-healing integration
│   │   ├── AccessibilityEngine.ts  # WCAG 2.1 audit engine (10 categories)
│   │   ├── ApiEngine.ts            # Axios HTTP client for API testing
│   │   ├── ArtifactPathResolver.ts # Browser-namespaced output path resolver
│   │   ├── ContextManager.ts       # Browser/Context/Page lifecycle management
│   │   ├── CrossBrowserManager.ts  # Multi-browser orchestration & tag filtering
│   │   ├── CrossBrowserReportGenerator.ts # HTML matrix report generator
│   │   ├── CrossBrowserRunner.ts   # Entry point for cross-browser runs
│   │   ├── CloudDeviceConnector.ts # BrowserStack/LambdaTest/SauceLabs WSS connections
│   │   ├── CustomWorld.ts          # Cucumber World with all engine references
│   │   ├── ElementResolver.ts      # PageName.Key → locator string resolver
│   │   ├── HealingResult.ts        # Self-healing type definitions
│   │   ├── MobileEngine.ts         # Device emulation, gestures, network throttling
│   │   ├── NativeAppEngine.ts      # Appium WebDriver REST client
│   │   ├── NativeElementResolver.ts # Native element strategy:value parser
│   │   ├── RealDeviceEngine.ts     # Real device connection (local/cloud)
│   │   ├── ReportLinker.ts         # Links cross-browser report to main report
│   │   ├── RetryManager.ts         # Per-browser retry with exponential backoff
│   │   ├── RootCauseAnalyzer.ts    # AI-powered failure analysis
│   │   ├── SelfHealingEngine.ts    # Broken locator auto-recovery engine
│   │   ├── TagParser.ts            # Scenario tag parser (device, mobile, a11y, browser)
│   │   └── VisualTestingEngine.ts  # Screenshot comparison & anomaly detection
│   │
│   ├── hooks/
│   │   └── Hooks.ts                # BeforeAll/Before/BeforeStep/AfterStep/After/AfterAll
│   │
│   ├── pages/properties/
│   │   ├── TeleConnect.properties  # Web app locators (order ingestion, navigation)
│   │   ├── Login.properties        # Login page locators (username, password, submit)
│   │   ├── NativeAndroid.properties # Android native app locators (SwagLabs demo)
│   │   └── NativeIOS.properties    # iOS native app locators (SwagLabs demo)
│   │
│   ├── steps/
│   │   ├── WebSteps.ts             # Web UI steps (click, enter, assert, navigate)
│   │   ├── ApiSteps.ts             # API steps (GET/POST/PUT/DELETE + assertions)
│   │   ├── CommonSteps.ts          # Shared steps (data, variables, logging)
│   │   ├── MobileSteps.ts          # Mobile emulation steps (swipe, tap, rotate)
│   │   ├── NativeAppSteps.ts       # Native app steps (Appium interactions)
│   │   ├── AccessibilitySteps.ts   # WCAG audit steps (28+ step definitions)
│   │   └── AdvancedSteps.ts        # Self-healing, visual testing, RCA steps
│   │
│   └── utils/
│       ├── DataStore.ts            # In-scenario key-value store ({var} syntax)
│       ├── PersistentStore.ts      # Cross-scenario JSON file store ($$var syntax)
│       ├── RandomDataGenerator.ts  # ##FieldName random data (Faker.js powered)
│       ├── Logger.ts               # Winston structured logger with levels
│       ├── OpenAIClient.ts         # OpenAI GPT integration for healing/RCA
│       ├── PropertiesLoader.ts     # framework.properties file reader
│       ├── ResponseValidator.ts    # API response assertion helper
│       ├── TestDataLoader.ts       # JSON test data loader
│       ├── TestUserManager.ts      # Dynamic test user creation
│       ├── GenerateReport.js       # Cucumber HTML report generator
│       ├── GenerateAllureResults.js # Allure results generator (timestamped)
│       └── AllureOpen.js           # Allure serve/open helper
│
├── reports/                        # Generated test reports (gitignored)
│   ├── html/                       # Cucumber HTML reports
│   ├── cucumber-json/              # Raw Cucumber JSON output
│   ├── allure-results/             # Allure results (timestamped per-run)
│   │   └── run-YYYY-MM-DD_HH-mm-ss/
│   ├── screenshots/                # Failure & healing screenshots
│   ├── videos/                     # Test execution recordings
│   ├── logs/                       # Winston log files
│   ├── failure-analysis/           # RCA reports
│   ├── accessibility/              # WCAG audit HTML reports
│   ├── mobile/                     # Mobile-specific artifacts
│   └── cross-browser/              # Cross-browser consolidated reports
│       └── history/                # Historical cross-browser run data
│
└── test-data/                      # External test data files (JSON)
```

---

## 4. Configuration System

### 4.1 FrameworkConfig Singleton

`FrameworkConfig` is the single source of truth for all framework settings. It implements the Singleton pattern and loads configuration at startup:

```typescript
// Access from anywhere in the codebase
const config = FrameworkConfig.getInstance();
console.log(config.browser);           // 'chromium'
console.log(config.selfHealing.enabled); // true
console.log(config.mobile.defaultDevice); // 'iPhone 14'
```

**Loading Order:**
1. `dotenv.config({ override: true })` — loads `.env` from project root
2. `dotenv.config({ path: 'features/.env', override: true })` — loads feature-level `.env`
3. `framework.properties` — parsed line-by-line (key=value format)
4. Environment variables — checked via `process.env[KEY.replace('.', '_').toUpperCase()]`

**Resolution Priority:** Environment Variable > .env file > framework.properties > default value

### 4.2 Configuration Interfaces

#### MobileConfig

```typescript
interface MobileConfig {
  defaultDevice: string;                          // "iPhone 14"
  defaultOrientation: 'portrait' | 'landscape';   // "portrait"
  networkCondition: '2G' | '3G' | '4G' | 'fast' | ''; // ""
  executionMode: 'emulation' | 'simulator' | 'device' | 'cloud'; // "emulation"
  cloudProvider: 'browserstack' | 'lambdatest' | 'saucelabs' | ''; // ""
}
```

#### AccessibilityConfig

```typescript
interface AccessibilityConfig {
  enabled: boolean;          // true — enable auto-audit
  failOnCritical: boolean;   // true — fail scenario on critical violations
  wcagLevel: 'A' | 'AA' | 'AAA'; // "AA" — conformance target
  maxViolations: number;     // 0 — max allowed violations (0 = fail on any)
}
```

#### CrossBrowserConfig

```typescript
interface CrossBrowserConfig {
  browsers: Array<'chromium' | 'firefox' | 'webkit'>; // ["chromium", "firefox"]
  parallel: boolean;             // true — run browsers in parallel
  maxParallel: number;           // 3 — max concurrent instances [1-10]
  browserArgs: Record<string, string[]>;    // per-browser launch args
  browserViewports: Record<string, { width: number; height: number }>; // per-browser viewport
  browserHeadless: Record<string, boolean>; // per-browser headless override
  retryCounts: Record<string, number>;      // per-browser retry [0-5]
  executionTimeouts: Record<string, number>; // per-browser timeout [30000-1800000]
  visualThreshold: number;       // 5 — pixel-difference threshold (%)
}
```

#### RealDeviceConfig

```typescript
interface RealDeviceConfig {
  enabled: boolean;              // false — enable real device testing
  provider: 'local' | 'browserstack' | 'lambdatest' | 'saucelabs' | '';
  platform: 'ios' | 'android' | '';
  deviceName: string;            // "Samsung Galaxy S24"
  osVersion: string;             // "14"
  browser: string;               // "chrome"
  appiumServer: string;          // "http://localhost:4723"
}
```

#### NativeAppConfig

```typescript
interface NativeAppConfig {
  enabled: boolean;              // false — enable native app testing
  appiumServer: string;          // "http://localhost:4723"
  platform: 'android' | 'ios' | '';
  appPath: string;               // "bs://..." or local file path
  appPackage: string;            // Android package name
  appActivity: string;           // Android main activity
  bundleId: string;              // iOS bundle identifier
  autoGrantPermissions: boolean; // true — auto-grant Android permissions
  fullReset: boolean;            // false — reinstall app between scenarios
  noReset: boolean;              // true — keep app state between scenarios
}
```

### 4.3 framework.properties Reference

```properties
# ─── Environment ──────────────────────────────────────────────────────────────
env=qa                          # Active environment (qa, staging, prod)
headless=false                  # Run browsers in headless mode
app.url=https://app.example.com # Default application URL
app.maximizeBrowser=false       # Maximize browser window on launch

# ─── API Configuration ────────────────────────────────────────────────────────
api.baseUrl=https://api.example.com  # Base URL for API requests

# ─── Timeouts (ms) ────────────────────────────────────────────────────────────
defaultTimeout=30000            # Default element wait timeout
navigationTimeout=60000         # Page navigation timeout
apiTimeout=15000                # API request timeout
slowMo=500                      # Delay between Playwright actions (ms)

# ─── Retry & Recovery ─────────────────────────────────────────────────────────
retryCount=2                    # Number of retries on failure

# ─── Screenshots & Video ──────────────────────────────────────────────────────
screenshotOnFail=true           # Capture screenshot on failure
video=retain-on-failure         # Video recording (on|off|retain-on-failure)

# ─── Self-Healing ─────────────────────────────────────────────────────────────
selfHealing.enabled=true        # Toggle self-healing on/off
selfHealing.locatorTimeout=5000 # Initial locator timeout before healing
selfHealing.maxCandidates=10    # Max fallback candidates to try
selfHealing.useOpenAI=true      # Use OpenAI for healing suggestions
selfHealing.attachReport=true   # Attach healing HTML report per step

# ─── Test User Credentials ────────────────────────────────────────────────────
test.user.password=TestUser@123
test.user.name=Test User
test.user.emailDomain=teleconnect.local

# ─── Mobile Configuration ─────────────────────────────────────────────────────
mobile.defaultDevice=iPhone 14
mobile.defaultOrientation=portrait
mobile.networkCondition=        # 2G|3G|4G|fast| (empty = no throttling)
mobile.executionMode=emulation  # emulation|simulator|device|cloud
mobile.cloudProvider=           # browserstack|lambdatest|saucelabs

# ─── Accessibility Configuration ──────────────────────────────────────────────
accessibility.enabled=true
accessibility.failOnCritical=true
accessibility.wcagLevel=AA      # A|AA|AAA
accessibility.maxViolations=0   # 0 = fail on any violation

# ─── Cross-Browser Configuration ─────────────────────────────────────────────
browsers=chromium,firefox       # Comma-separated browser list
crossBrowser.parallel=true      # Run browsers in parallel
crossBrowser.maxParallel=3      # Max concurrent browsers [1-10]

# ─── Browser-Specific Overrides ───────────────────────────────────────────────
browser.chromium.args=--no-sandbox,--disable-setuid-sandbox
browser.chromium.viewport=1280x720
browser.chromium.headless=false
browser.firefox.args=
browser.firefox.viewport=1280x720
browser.firefox.headless=false
browser.webkit.args=
browser.webkit.viewport=1280x720
browser.webkit.headless=false

# ─── Real Device Testing ──────────────────────────────────────────────────────
realDevice.enabled=false
realDevice.provider=browserstack
realDevice.platform=android
realDevice.deviceName=Samsung Galaxy S24
realDevice.osVersion=14
realDevice.browser=chrome
realDevice.appiumServer=http://localhost:4723

# ─── Native App Testing ───────────────────────────────────────────────────────
nativeApp.enabled=false
nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
nativeApp.platform=android
nativeApp.appPath=bs://a31cede05f9d9bafcd6aae57dec442e8d368eb96
nativeApp.appPackage=
nativeApp.appActivity=
nativeApp.bundleId=
nativeApp.autoGrantPermissions=true
nativeApp.fullReset=false
nativeApp.noReset=true
```

### 4.4 .env File (Secrets Only)

```env
# Secrets & tokens — never committed to source control
OPENAI_API_KEY=sk-...

# Cloud testing credentials
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
BROWSERSTACK_ANDROID_APP_URL=bs://...
BROWSERSTACK_IOS_APP_URL=bs://...

LAMBDATEST_USERNAME=your_username
LAMBDATEST_ACCESS_KEY=your_access_key
LAMBDATEST_ANDROID_APP_URL=lt://...
LAMBDATEST_IOS_APP_URL=lt://...

SAUCE_USERNAME=your_username
SAUCE_ACCESS_KEY=your_access_key
```

---

## 5. Core Engines

### 5.1 ActionEngine

**Purpose:** Central UI interaction engine. Every web UI action flows through ActionEngine, which integrates self-healing, value resolution, and element highlighting.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `click(elementRef)` | Click with self-healing + scroll into view |
| `doubleClick(elementRef)` | Double-click with self-healing |
| `rightClick(elementRef)` | Right-click (context menu) |
| `enter(value, elementRef)` | Clear + fill with value resolution |
| `clearAndType(value, elementRef)` | Clear + keystroke typing (delay: 50ms) |
| `pressKey(key, elementRef?)` | Keyboard key press |
| `selectOption(value, elementRef)` | Dropdown selection (label or value) |
| `selectComboboxOption(text, ref)` | Custom combobox selection (selectOption → click fallback) |
| `check(elementRef)` / `uncheck(elementRef)` | Checkbox toggling |
| `hover(elementRef)` | Mouse hover |
| `scrollTo(elementRef)` | Scroll element into view |
| `uploadFile(path, elementRef)` | File upload (standard input or file chooser dialog) |
| `dragAndDrop(source, target)` | Drag and drop between elements |
| `navigateTo(url)` | Page navigation with viewport maximization |
| `goBack()` / `goForward()` / `refreshPage()` | Navigation actions |
| `waitForElement(ref, state, timeout)` | Wait for element state |
| `waitForNavigation(url?)` | Wait for URL change |
| `assertVisible(ref)` | Assert element is visible |
| `assertText(ref, expected)` | Assert element text matches |
| `assertContainsText(ref, expected)` | Assert element contains text |
| `assertValue(ref, expected)` | Assert input value |
| `assertEnabled(ref)` / `assertDisabled(ref)` | Assert enabled/disabled state |
| `assertChecked(ref)` | Assert checkbox is checked |
| `assertCount(ref, count)` | Assert element count |
| `assertPageTitle(title)` | Assert page title |
| `assertPageUrl(url)` | Assert page URL (regex) |
| `assertAttribute(ref, attr, value)` | Assert element attribute |
| `getText(ref)` / `getAttribute(ref, attr)` | Get element text/attribute |
| `storeText(ref, varName)` | Store element text in DataStore |
| `storeAttribute(ref, attr, varName)` | Store attribute in DataStore |
| `takeScreenshot(name?)` | Manual screenshot capture |
| `executeScript(script, ...args)` | Execute JavaScript on page |

**Value Resolution Pipeline:**

Every value passed to ActionEngine goes through a 3-stage resolution:

```
Input: "Hello ##FirstName, your ID is $$orderId and ref is {refNumber}"
          │                      │                       │
          ▼                      ▼                       ▼
Stage 1: ##RandomData      Stage 2: $$PersistentStore  Stage 3: {DataStore}
(Faker.js generation)     (JSON file lookup)          (In-memory lookup)
          │                      │                       │
          ▼                      ▼                       ▼
Output: "Hello John, your ID is ORD-12345 and ref is REF-789"
```

**Locator Resolution:**

```typescript
// Dot-notation references (PageName.Key) are resolved via ElementResolver
"Login.UsernameInput" → ElementResolver.resolve() → "input#username"

// Raw locators are used directly
"//button[@type='submit']" → XPath locator
"text=Submit" → Text locator
"placeholder=Enter email" → Playwright getByPlaceholder
"role=button[name='Login']" → Playwright getByRole
"data-testid=login-btn" → Playwright getByTestId
"#submit-btn" → CSS selector

// Chained locators (>> separator)
".form-container >> input[name='email']" → Nested locator chain
```

**Self-Healing Integration:**

```
1. Resolve locator from elementRef
2. Wait for visibility (selfHealing.locatorTimeout = 5000ms)
3. If visible → return locator (no healing needed)
4. If timeout → trigger SelfHealingEngine.findElementWithHealing()
5. If healed → log success, push to _stepHealingResults, highlight element
6. If healing fails → throw descriptive error
```

### 5.2 ContextManager

**Purpose:** Manages Playwright browser/context/page lifecycle with multiple launch strategies.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `launch()` | Standard browser launch (uses FrameworkConfig.browser) |
| `launchWithDeviceEmulation(tags, config)` | Launch with mobile device emulation |
| `launchForBrowser(browser, config)` | Cross-browser launch with specific engine |
| `setExternalBrowser(browser, context, page)` | Inject externally-connected browser (real devices) |
| `getPage()` | Get the active Playwright Page |
| `getContext()` | Get the active BrowserContext |
| `close()` | Close browser and clean up |

**Launch Decision Tree:**

```
Before Hook
    │
    ├─ @native tag? ────────────────────→ Skip browser, create Appium session
    │
    ├─ @api only (no @web)? ────────────→ Skip browser, use ApiEngine only
    │
    ├─ CROSS_BROWSER_TARGET env set? ───→ launchForBrowser(target)
    │
    ├─ realDevice.enabled = true? ──────→ Connect CDP to real device
    │
    ├─ @device:* or @mobile tag? ───────→ launchWithDeviceEmulation(tags)
    │
    └─ Otherwise ───────────────────────→ launch() (standard browser)
```

### 5.3 SelfHealingEngine

**Purpose:** Automatically recovers from broken locators by trying alternative strategies in priority order.

**Healing Flow:**

```
findElementWithHealing(originalReference, action)
    │
    ├─ Check locatorCache (previously healed?) ──→ Use cached locator
    │
    ├─ Try original resolved locator ────────────→ Success (no healing)
    │
    ├─ Extract XPath alternatives from DOM ──────→ Try each XPath
    │
    ├─ Extract focused DOM (relevant elements) ──→ Used for candidate generation
    │
    ├─ Get OpenAI suggestions (if enabled) ──────→ AI-generated locator candidates
    │
    ├─ Generate prioritized candidates from DOM ─→ Sorted by confidence
    │
    ├─ Try all candidates in priority order ─────→ First visible = healed
    │
    └─ All candidates failed ────────────────────→ Return FAILED result
```

**Candidate Priority (Confidence Scores):**

| Strategy | Confidence | Rationale |
|----------|-----------|-----------|
| `data-testid` | 97% | Stable, developer-maintained test identifier |
| `id` | 90% | Usually stable (filters UUID/timestamp IDs) |
| `role + name` | 88% | Semantic, tied to accessible purpose |
| `role` (alone) | 85% | Semantic but less specific |
| `aria-label` | 80% | Accessibility attribute, usually stable |
| `placeholder` | 75% | Moderately stable for form fields |
| `text` content | 70% | Visible text, can change with i18n |
| `css` class | 55% | Least stable (CSS-in-JS generates random classes) |

**Unstable Locator Filters:**

- UUIDs: `/[0-9a-f]{8}-[0-9a-f]{4}/` → Filtered out
- Timestamps: `/^\d{10,}$/` → Filtered out
- CSS-in-JS classes: `/^(css|sc|emotion|styled)-[a-z0-9]+$/` → Filtered out
- Deep selectors: More than 4 `>` levels → Filtered out
- Long selectors: >150 characters → Filtered out

**Caching:** Healed locators are cached in-memory (`Map<string, string>`) for the duration of the scenario. Cache is cleared between scenarios.

**OpenAI Integration:** When `selfHealing.useOpenAI=true` and `OPENAI_API_KEY` is set, the engine sends the original locator + focused DOM context to GPT for additional locator suggestions.

### 5.4 NativeAppEngine

**Purpose:** Drives native Android/iOS app interactions via Appium WebDriver REST protocol using Node.js native `fetch` (no external WebDriver client dependency).

**Key Methods:**

| Method | Description |
|--------|-------------|
| `createSession(capabilities)` | Create Appium session with W3C capabilities |
| `deleteSession()` | End session and clean up |
| `findElement(strategy, value)` | Find element by locator strategy |
| `findElements(strategy, value)` | Find multiple elements |
| `tap(elementId)` | Tap (click) an element |
| `sendKeys(elementId, text)` | Type text into element |
| `clear(elementId)` | Clear element text |
| `getText(elementId)` | Get visible text |
| `getAttribute(elementId, attr)` | Get element attribute |
| `isDisplayed(elementId)` | Check visibility |
| `isEnabled(elementId)` | Check if interactable |
| `swipe(direction, distance)` | W3C Actions swipe gesture |
| `longPress(elementId, duration)` | Touch-and-hold gesture |
| `scroll(direction, amount)` | Scroll the screen |
| `launchApp()` | Activate app (no-op on cloud providers) |
| `closeApp()` | Terminate app |
| `resetApp()` | Clear data and restart |
| `getContexts()` | List available contexts (hybrid apps) |
| `switchContext(name)` | Switch NATIVE_APP ↔ WEBVIEW_* |
| `getCurrentContext()` | Get current context name |
| `takeScreenshot()` | Capture screen (base64 PNG) |
| `getPageSource()` | Get native XML hierarchy |
| `hideKeyboard()` | Dismiss on-screen keyboard |
| `pressBack()` | Android hardware back button |
| `acceptAlert()` / `dismissAlert()` | Handle native dialogs |

**Cloud Provider Detection:**

```typescript
// Automatic detection based on Appium server URL:
if (appiumUrl.includes('browserstack.com')) {
  // → Inject bstack:options with BROWSERSTACK_USERNAME / ACCESS_KEY
  // → Use platform-specific app URLs (BROWSERSTACK_ANDROID_APP_URL / BROWSERSTACK_IOS_APP_URL)
  // → Add Basic Auth header
}

if (appiumUrl.includes('lambdatest.com')) {
  // → Inject lt:options with LAMBDATEST_USERNAME / ACCESS_KEY
  // → Use platform-specific app URLs (LAMBDATEST_ANDROID_APP_URL / LAMBDATEST_IOS_APP_URL)
  // → Add Basic Auth header
  // → Set isRealMobile=true, build name, w3c=true
}
```

**W3C Capabilities Format:**

```json
{
  "capabilities": {
    "alwaysMatch": {
      "platformName": "android",
      "appium:platformVersion": "13.0",
      "appium:deviceName": "Samsung Galaxy S23",
      "appium:app": "bs://a31cede05f9d...",
      "bstack:options": {
        "userName": "...",
        "accessKey": "..."
      }
    },
    "firstMatch": [{}]
  }
}
```

### 5.5 AccessibilityEngine

**Purpose:** WCAG 2.1 accessibility audit engine using Playwright's built-in accessibility tree (no axe-core runtime dependency).

**Audit Categories (10 checks):**

| # | Category | Rule Name | WCAG Criteria | Severity |
|---|----------|-----------|---------------|----------|
| 1 | Image Alt Text | `image-alt` | 1.1.1 Non-text Content (A) | Critical |
| 2 | Form Labels | `label` | 1.3.1 Info and Relationships (A) | Critical |
| 3 | Button/Link Names | `button-name` | 4.1.2 Name, Role, Value (A) | Critical |
| 4 | Heading Hierarchy | `heading-order` | 1.3.1 Info and Relationships (A) | Moderate |
| 5 | Landmarks | `landmark-main` | 1.3.6 Identify Purpose (AAA) | Moderate |
| 6 | Skip Navigation | `skip-link` | 2.4.1 Bypass Blocks (A) | Moderate |
| 7 | ARIA Roles | `aria-valid-attr-value` | 4.1.2 Name, Role, Value (A) | Serious |
| 8 | Color Contrast | `color-contrast` | 1.4.3 Contrast (AA) | Serious |
| 9 | Focusable Elements | `tabindex` | 2.1.1 Keyboard (A) | Moderate |
| 10 | Touch Targets | `touch-target` | 2.5.5 Target Size (AAA) | Moderate |

**WCAG Level Filtering (cumulative):**

```
Level A:   image-alt, label, button-name, aria-valid-attr-value, skip-link, tabindex
Level AA:  Level A + color-contrast, heading-order, page-has-heading-one
Level AAA: Level A + AA + touch-target, landmark-main, landmark-navigation
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `registerNavigationListener(page, config)` | Auto-audit on page load events |
| `auditPageWithLevel(pageName, wcagLevel)` | Full WCAG audit with level filtering |
| `auditPage(pageName)` | Full audit (all rules) |
| `auditElement(elementRef)` | Audit single element |
| `auditMobileAccessibility(viewportWidth)` | Mobile-specific checks (≤767px only) |
| `checkAllTouchTargets(minSize)` | Scan all interactive elements for 44x44px |
| `checkContentReflow(viewportWidth)` | Verify no horizontal scrolling |
| `checkKeyboardNavigation()` | Tab-reachability audit |
| `checkFocusIndicator(elementRef)` | Verify visible focus indicator |
| `getAriaSnapshot()` | Full ARIA tree snapshot |

**Navigation Auto-Audit:**
- Registered when `@accessibility` or `@a11y` tag is present AND `accessibility.enabled=true`
- Triggers on page `load` event
- **URL deduplication**: Skips re-audit if URL hasn't changed since last audit
- 10-second timeout per audit (continues without failing on timeout)
- Tracks cumulative violation count across all page audits in scenario

**Failure Conditions:**
- `failOnCritical=true` + critical violation found → throws `AccessibilityFailureError`
- Cumulative violations > `maxViolations` threshold → throws `AccessibilityFailureError`

**HTML Report:** Generated per page with donut chart showing severity distribution, severity cards (critical/serious/moderate/minor counts), violations table with WCAG criteria and suggestions, and a passed checks section.

### 5.6 MobileEngine

**Purpose:** Playwright-based mobile device emulation with touch gestures, orientation control, network throttling, and geolocation simulation.

**Device Presets:**

| Device | Viewport | Scale | User Agent |
|--------|----------|-------|------------|
| iPhone 14 | 390×844 | 3x | iOS 16 Safari Mobile |
| iPhone SE | 375×667 | 2x | iOS 15 Safari Mobile |
| Pixel 7 | 412×915 | 2.625x | Android 13 Chrome |
| Samsung Galaxy S23 | 360×780 | 3x | Android 13 Chrome |
| iPad Pro | 1024×1366 | 2x | iPadOS 16 Safari |
| iPad Mini | 768×1024 | 2x | iPadOS 16 Safari |

**Key Methods:**

| Method | Description |
|--------|-------------|
| `applyDeviceProfile(device, orientation)` | Set viewport + UA + scale |
| `emulateDevice(deviceName)` | Quick device emulation |
| `setViewport(width, height)` | Custom viewport |
| `rotateLandscape()` / `rotatePortrait()` | Orientation changes |
| `swipe(direction, distance)` | Touch drag gesture |
| `tap(elementRef)` | Touch tap |
| `longPress(elementRef, duration)` | Touch hold |
| `pinchZoomIn()` / `pinchZoomOut()` | Pinch gestures |
| `setNetworkCondition(condition)` | CDP network throttling |
| `setNetworkConditionSafe(condition, browser)` | Browser-aware throttling |
| `setGeolocation(lat, lng)` | GPS simulation |
| `assertElementInViewport(ref)` | Verify element visible in viewport |
| `assertTouchTargetSize(ref, minSize)` | Verify ≥44×44px |
| `getEmulationMetadata()` | Get device info for reporting |

**Network Throttling Profiles:**

| Condition | Download | Upload | Latency |
|-----------|----------|--------|---------|
| 2G | 50 KB/s | 20 KB/s | 300ms |
| 3G | 375 KB/s | 100 KB/s | 100ms |
| 4G | 4 MB/s | 3 MB/s | 20ms |
| fast | Unlimited | Unlimited | 0ms |
| offline | 0 | 0 | 0ms |

> **Note:** CDP-based network throttling is Chromium-only. On Firefox/WebKit, `setNetworkConditionSafe()` logs a warning and skips gracefully without failing the test.

### 5.7 ApiEngine

**Purpose:** Axios-based HTTP client for API testing with variable substitution, response storage, and interceptors.

**Key Features:**
- Full HTTP method support: GET, POST, PUT, PATCH, DELETE
- Variable substitution in URLs and request bodies (`{varName}` syntax)
- Automatic response storage in DataStore for assertion chains
- DataTable-driven request body construction
- Custom header injection per request
- Request/response interceptor support for logging
- Configurable timeout from `apiTimeout` setting

### 5.8 CrossBrowserRunner

**Purpose:** Orchestrates test execution across multiple browser engines, spawning child processes with browser-specific environment variables.

**Execution Flow:**

```
CrossBrowserRunner.run()
    │
    ├─ Single browser? → Execute normally (no orchestration)
    │
    └─ Multiple browsers? → CrossBrowserManager.executeCrossBrowser()
         │
         ├─ Sequential mode: Run browsers one-by-one
         │
         └─ Parallel mode: Spawn up to maxParallel concurrent processes
              │
              ├─ Each process receives env vars:
              │   - CROSS_BROWSER_TARGET=chromium|firefox|webkit
              │   - CROSS_BROWSER_VIEWPORT=1280x720
              │   - CROSS_BROWSER_HEADLESS=true|false
              │   - CROSS_BROWSER_ARGS=--no-sandbox,...
              │
              ├─ Per-browser execution timeout enforcement
              │   (kills process on timeout, records as 'not_executed')
              │
              ├─ JSON report parsing from each child process
              │
              ├─ Merge parallel reports into consolidated directory
              │
              └─ Generate HTML matrix report + CLI summary table
```

**Per-Browser Configuration:**
- Viewport, headless, args, retryCount, executionTimeout all configurable per-browser
- RetryManager applies exponential backoff on per-browser failures
- ArtifactPathResolver creates browser-namespaced output directories

---

## 6. Hooks Lifecycle

### 6.1 Hook Execution Order

```
BeforeAll (once per suite)
│   └─ Create report directories (reports/html, screenshots, videos, etc.)
│   └─ Create browser-specific artifact dirs if CROSS_BROWSER_TARGET is set
│   └─ Log "Test Suite Started"
│
├── For each Scenario:
│   │
│   Before (per scenario)
│   │   └─ Store scenarioName, scenarioTags
│   │   └─ Decision tree (see below)
│   │
│   ├── For each Step:
│   │   │
│   │   BeforeStep
│   │   │   └─ Log step text
│   │   │   └─ Record action in RootCauseAnalyzer
│   │   │   └─ Capture step start time
│   │   │   └─ Clear step healing results
│   │   │
│   │   [Step Execution]
│   │   │
│   │   AfterStep
│   │       └─ Capture step end time
│   │       └─ If healing results exist → attach HTML report card
│   │       └─ If step FAILED:
│   │           └─ Set testFailed = true
│   │           └─ Capture failure screenshot
│   │           └─ Run RootCauseAnalyzer
│   │           └─ Attach RCA HTML report
│   │
│   After (per scenario)
│       └─ If FAILED: attach final screenshot + DataStore dump
│       └─ Clean up real device (disconnect)
│       └─ Clean up native app (screenshot on failure + deleteSession)
│       └─ Attach device emulation metadata HTML
│       └─ Attach step timings
│       └─ Log pass/fail result
│
AfterAll (once per suite)
    └─ Log "Test Suite Completed"
```

### 6.2 Before Hook Decision Tree

```typescript
// Priority order in Before hook:
if (tags.includes('@native')) {
  // → Create NativeAppEngine with Appium session
  // → Detect platform from @android/@ios tags or config
  // → Auto-detect cloud provider (BrowserStack/LambdaTest) from appiumServer URL
  // → Inject cloud credentials and capabilities
  // → RETURN (skip browser launch)
}

if (isApiOnly) {  // @api without @web
  // → RETURN (skip browser launch, ApiEngine ready from constructor)
}

// Validate cross-browser filter tags (reject conflicts like @chromium-only + @firefox-only)
// Check if scenario should run on current browser (skip if not)

if (process.env.CROSS_BROWSER_TARGET) {
  // → launchForBrowser(target) with browser-specific config
  // → initActionEngine()
}
else if (frameworkConfig.realDevice.enabled) {
  // → Connect to real device via RealDeviceEngine
  // → Get WebSocket endpoint
  // → Connect Playwright via connectOverCDP()
  // → setExternalBrowser(browser, context, page)
  // → initActionEngine()
}
else if (hasMobileTags) {  // @device:* or @mobile
  // → launchWithDeviceEmulation(tags, config)
  // → Apply network condition if configured
  // → initActionEngine()
}
else {
  // → Standard launch()
  // → initActionEngine()
}

// After browser is ready:
if (hasAccessibilityTag && accessibility.enabled) {
  // → Register navigation listener for auto-audit
}
```

### 6.3 AfterStep Attachments

On self-healing activation, the AfterStep hook attaches a styled HTML card showing:
- Original failed locator (struck through in red)
- Healed locator (highlighted in green)
- Confidence percentage
- Strategy type (data-testid, id, role, text, etc.)
- Number of fallback locators available
- Top 5 fallback locators with their types and confidence scores

On step failure, the AfterStep hook:
1. Captures a full-page screenshot via ArtifactPathResolver
2. Attaches screenshot to report as `image/png`
3. Builds `TestFailureContext` with scenario name, error, page URL, title, last actions
4. Invokes `RootCauseAnalyzer.analyzeFailure()` for AI-powered analysis
5. Attaches RCA HTML report with failure message, page context, analysis, and suggested fixes

### 6.4 After Hook Cleanup

```
After hook cleanup order:
1. Real device: disconnect() + attach metadata report
2. Native app: screenshot on failure + deleteSession()
3. Device emulation: attach metadata HTML (device name, viewport, orientation)
4. Step timings: available for performance analysis
5. DataStore dump: attached on failure for debugging
```

---

## 7. Web UI Testing

### 7.1 The 2-Layer Approach

**Layer 1 — Feature File:**

```gherkin
@web @teleconnect_orderingestion
Feature: TeleConnect Order Ingestion

  Scenario: Submit a new broadband order
    Given I navigate to the application
    When I enter "##Email" into "Login.EmailInput"
    And I enter "{password}" into "Login.PasswordInput"
    And I click "Login.SubmitButton"
    Then I should see "TeleConnect.WelcomeMessage"
```

**Layer 2 — Properties File (Login.properties):**

```properties
# Login page element locators
EmailInput=input[name="email"]
PasswordInput=input[name="password"]
SubmitButton=role=button[name='Sign In']
ForgotPasswordLink=text=Forgot password?
RememberMeCheckbox=#remember-me
ErrorMessage=.error-toast
```

### 7.2 Locator Strategies

The framework supports all Playwright locator strategies via prefix conventions:

| Prefix | Playwright API | Example |
|--------|---------------|---------|
| `//` or `(//)` | `page.locator(xpath)` | `//button[@type='submit']` |
| `text=` | `page.locator('text=...')` | `text=Sign In` |
| `placeholder=` | `page.getByPlaceholder(...)` | `placeholder=Enter email` |
| `role=` | `page.getByRole(...)` | `role=button[name='Login']` |
| `data-testid=` | `page.getByTestId(...)` | `data-testid=submit-btn` |
| `#`, `.`, `[` | `page.locator(css)` | `#login-form .btn-primary` |
| `>>` (chained) | Nested `.locator()` calls | `.form >> input[name='email']` |

### 7.3 Element Resolution

```
"Login.SubmitButton"
     │
     ├─ Split on first "." → Page="Login", Key="SubmitButton"
     │
     ├─ Load Login.properties (cached after first load)
     │
     ├─ Lookup key → "role=button[name='Sign In']"
     │
     └─ Build Playwright locator:
         page.getByRole('button', { name: 'Sign In' })
```

### 7.4 Value Resolution

Three special value prefixes are resolved before use:

| Syntax | Source | Example | Resolves To |
|--------|--------|---------|-------------|
| `##FieldName` | RandomDataGenerator (Faker.js) | `##Email` | `john.doe42@example.com` |
| `$$variableName` | PersistentStore (JSON file) | `$$orderId` | `ORD-2024-001` |
| `{variableName}` | DataStore (in-memory) | `{userEmail}` | Value stored earlier in scenario |

**RandomDataGenerator (## prefix) — Supported Fields:**

| Field | Generator | Example Output |
|-------|-----------|---------------|
| `##Email` | faker.internet.email() | `test_user_1719849000@example.com` |
| `##FirstName` | faker.person.firstName() | `John` |
| `##LastName` | faker.person.lastName() | `Smith` |
| `##FullName` | faker.person.fullName() | `John Smith` |
| `##Phone` | faker.phone.number() | `+1-555-0123` |
| `##Address` | faker.location.streetAddress() | `123 Main St` |
| `##City` | faker.location.city() | `Springfield` |
| `##ZipCode` | faker.location.zipCode() | `62701` |
| `##Company` | faker.company.name() | `Acme Corp` |
| `##UUID` | faker.string.uuid() | `550e8400-e29b-41d4-a716-446655440000` |
| `##Number` | faker.number.int() | `42` |
| `##Date` | faker.date.recent() | `2024-06-15` |
| `##Password` | faker.internet.password() | `xK9$mN2pQ` |

### 7.5 Self-Healing in Web UI

Every UI action in WebSteps flows through `getLocatorWithHealing()`:

```gherkin
When I click "Login.SubmitButton"
```

Internally:
1. Resolve `Login.SubmitButton` → `role=button[name='Sign In']`
2. Build Playwright locator: `page.getByRole('button', { name: 'Sign In' })`
3. Wait for visible (5000ms timeout)
4. **If visible** → click and continue
5. **If timeout** → trigger self-healing:
   - Try cached healed locator
   - Extract XPath alternatives from DOM
   - Get OpenAI suggestions
   - Generate prioritized candidates
   - Try each until one works
   - Cache the working locator
   - Highlight with green border + capture screenshot
   - Attach healing report HTML card
6. **If all fail** → throw error with detailed failure context

---

## 8. API Testing

### 8.1 ApiEngine

The `ApiEngine` wraps Axios with framework-specific features:

```gherkin
@api
Feature: User Registration API

  Scenario: Register a new user
    Given I set the base URL to "https://simulapp.online"
    And I set header "Content-Type" to "application/json"
    When I send a POST request to "/api/users" with body:
      | email    | ##Email        |
      | password | TestUser@123   |
      | name     | ##FullName     |
    Then the response status should be 201
    And the response body should contain "id"
    And I store response field "id" as "userId"

  Scenario: Retrieve the created user
    When I send a GET request to "/api/users/{userId}"
    Then the response status should be 200
    And the response field "email" should not be empty
```

### 8.2 ResponseValidator

Assertion helper for API response validation:

| Assertion | Description |
|-----------|-------------|
| Status code | Exact match or range (2xx, 4xx) |
| Response time | Must be below threshold (ms) |
| Header presence | Header exists with expected value |
| Body field | JSON path extraction and comparison |
| Body contains | String/regex match in response body |
| Array length | Array field has expected length |
| JSON Schema | Validate response against JSON Schema (ajv) |
| Field not empty | Assert field exists and is non-empty |

### 8.3 Variable Substitution in API Tests

```gherkin
# Store a value from response
And I store response field "token" as "authToken"

# Use stored value in subsequent requests
Given I set header "Authorization" to "Bearer {authToken}"
When I send a GET request to "/api/orders/{orderId}/details"
```

### 8.4 DataTable Request Bodies

```gherkin
When I send a POST request to "/api/orders" with body:
  | customerId  | {userId}              |
  | product     | Broadband 100Mbps     |
  | address     | ##Address             |
  | startDate   | ##Date                |
```

The DataTable is converted to a JSON object with value resolution applied to each cell.

---

## 9. Mobile Emulation

### 9.1 Tag-Driven Device Emulation

```gherkin
@mobile @device:iPhone14
Scenario: Mobile navigation
  Given I navigate to the application
  Then I should see the mobile menu icon

@mobile @device:Pixel7 @landscape
Scenario: Landscape tablet layout
  Given I navigate to the application
  Then the sidebar should be visible
```

### 9.2 Device Resolution

```
@device:iPhone14
    │
    ├─ TagParser.parseDeviceTag() extracts "iPhone14"
    │
    ├─ TagParser.normalizeDeviceName() → "iphone14"
    │
    ├─ DEVICE_NAME_LOOKUP["iphone14"] → "iPhone 14"
    │
    ├─ MOBILE_DEVICES["iPhone 14"] → full config object
    │
    └─ ContextManager.launchWithDeviceEmulation() applies:
        - viewport: 390×844
        - userAgent: iOS 16 Safari Mobile
        - deviceScaleFactor: 3
        - isMobile: true
        - hasTouch: true
```

### 9.3 Network Throttling

```gherkin
@mobile @device:iPhone14
Scenario: Test on slow 3G network
  Given I set network condition to "3G"
  When I navigate to the application
  Then the page should load within 10 seconds
```

**Implementation:** Uses Chrome DevTools Protocol (CDP) sessions:

```typescript
const cdp = await context.newCDPSession(page);
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: 375000,  // 375 KB/s
  uploadThroughput: 100000,    // 100 KB/s
  latency: 100                 // 100ms
});
```

**Browser Compatibility:**
- ✅ Chromium: Full CDP support
- ⚠️ Firefox: Gracefully skipped with warning log
- ⚠️ WebKit: Gracefully skipped with warning log

### 9.4 Gesture Support

```gherkin
When I swipe "up" by 300 pixels
When I swipe "left" by 200 pixels
When I tap "MobileMenu.HamburgerIcon"
When I long-press "Item.ProductCard" for 2000 milliseconds
When I pinch zoom in
When I rotate to landscape
When I rotate to portrait
```

### 9.5 Geolocation Simulation

```gherkin
Given I set geolocation to latitude 40.7128 and longitude -74.0060
When I navigate to the store locator page
Then I should see nearby stores
```

### 9.6 Mobile Emulation Metadata

After each mobile scenario, an HTML card is attached to the report showing:
- Device name (e.g., "iPhone 14")
- Viewport dimensions (e.g., 390×844)
- Orientation (portrait/landscape)

---

## 10. Native App Testing

### 10.1 Architecture

Native app testing uses the Appium WebDriver REST protocol via HTTP requests. The framework communicates directly with Appium servers using Node.js native `fetch` — no WebDriver client library required.

```
Feature File → NativeAppSteps → NativeAppEngine → HTTP REST → Appium Server → Device/Emulator
                                      │
                     NativeElementResolver (PageName.Key → strategy:value)
```

### 10.2 Properties File Format

**NativeAndroid.properties:**

```properties
# SwagLabs Android App Locators
# Format: ElementKey=strategy:value
# Default strategy (no prefix) = accessibility id

BtnLogin=accessibilityId:test-LOGIN
InputUsername=accessibilityId:test-Username
InputPassword=accessibilityId:test-Password
LblProductTitle=xpath://android.widget.TextView[@content-desc="test-Item title"]
BtnAddToCart=accessibilityId:test-ADD TO CART
BtnCart=accessibilityId:test-Cart
BtnCheckout=accessibilityId:test-CHECKOUT
BtnMenu=accessibilityId:test-Menu
BtnLogout=accessibilityId:test-LOGOUT
```

**NativeIOS.properties:**

```properties
# SwagLabs iOS App Locators
BtnLogin=accessibilityId:test-LOGIN
InputUsername=accessibilityId:test-Username
InputPassword=accessibilityId:test-Password
LblProductTitle=iosPredicate:label == "Sauce Labs Backpack"
BtnAddToCart=accessibilityId:test-ADD TO CART
NavCart=accessibilityId:test-Cart
```

### 10.3 Locator Strategy Prefixes

| Prefix | Appium Strategy | Platform | Example |
|--------|----------------|----------|---------|
| `accessibilityId:` | `accessibility id` | Both | `accessibilityId:test-LOGIN` |
| `id:` | `id` | Android | `id:com.app:id/btnLogin` |
| `xpath:` | `xpath` | Both | `xpath://android.widget.TextView[@text='Login']` |
| `class:` | `class name` | Both | `class:android.widget.Button` |
| `iosPredicate:` | `-ios predicate string` | iOS | `iosPredicate:label == "Login"` |
| `iosClassChain:` | `-ios class chain` | iOS | `iosClassChain:**/XCUIElementTypeButton[`label == "Login"`]` |
| `uiautomator:` | `-android uiautomator` | Android | `uiautomator:new UiSelector().text("Login")` |
| `name:` | `name` | Both | `name:Login Button` |
| (no prefix) | `accessibility id` | Both | `test-LOGIN` (most portable) |

### 10.4 Feature File Example

```gherkin
@native @android
Feature: SwagLabs Android Login

  Scenario: Successful login
    When I enter "standard_user" into native element "NativeAndroid.InputUsername"
    And I enter "secret_sauce" into native element "NativeAndroid.InputPassword"
    And I tap native element "NativeAndroid.BtnLogin"
    Then native element "NativeAndroid.LblProductTitle" should be displayed

  Scenario: Add item to cart
    When I enter "standard_user" into native element "NativeAndroid.InputUsername"
    And I enter "secret_sauce" into native element "NativeAndroid.InputPassword"
    And I tap native element "NativeAndroid.BtnLogin"
    And I tap native element "NativeAndroid.BtnAddToCart"
    And I tap native element "NativeAndroid.BtnCart"
    Then native element "NativeAndroid.BtnCheckout" should be displayed
```

### 10.5 Cloud Provider Integration

#### BrowserStack

Automatically detected when `nativeApp.appiumServer` contains `browserstack.com`:

```properties
nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
```

**Auto-injected capabilities:**
```json
{
  "platformName": "android",
  "appium:platformVersion": "13.0",
  "appium:deviceName": "Samsung Galaxy S23",
  "appium:app": "bs://a31cede05f9d...",
  "bstack:options": {
    "userName": "${BROWSERSTACK_USERNAME}",
    "accessKey": "${BROWSERSTACK_ACCESS_KEY}"
  }
}
```

**Platform-specific app URLs:**
- Android: Uses `BROWSERSTACK_ANDROID_APP_URL` env var (fallback to `nativeApp.appPath`)
- iOS: Uses `BROWSERSTACK_IOS_APP_URL` env var (fallback to `nativeApp.appPath`)

#### LambdaTest

Automatically detected when `nativeApp.appiumServer` contains `lambdatest.com`:

```properties
nativeApp.appiumServer=https://mobile-hub.lambdatest.com/wd/hub
```

**Auto-injected capabilities:**
```json
{
  "platformName": "android",
  "appium:platformVersion": "13",
  "appium:deviceName": "Galaxy S23",
  "appium:app": "lt://APP1234...",
  "appium:isRealMobile": true,
  "lt:options": {
    "username": "${LAMBDATEST_USERNAME}",
    "accessKey": "${LAMBDATEST_ACCESS_KEY}",
    "build": "Native App Test - 2024-06-15",
    "name": "Scenario Name",
    "platformName": "Android",
    "w3c": true
  }
}
```

### 10.6 App Lifecycle

| Operation | Local Appium | BrowserStack | LambdaTest |
|-----------|-------------|--------------|------------|
| `launchApp()` | `mobile:activateApp` command | **No-op** (auto-launched) | **No-op** (auto-launched) |
| `closeApp()` | `mobile:terminateApp` | Terminates app | Terminates app |
| `resetApp()` | terminate + activate | terminate + activate | terminate + activate |
| `installApp(path)` | Install from local path | N/A (uploaded via API) | N/A (uploaded via API) |

### 10.7 Hybrid App Context Switching

For apps with embedded WebViews:

```gherkin
# Get available contexts
When I get available native contexts
# Output: ["NATIVE_APP", "WEBVIEW_com.myapp"]

# Switch to WebView for web interactions
When I switch to context "WEBVIEW_com.myapp"
Then I can use standard web locators

# Switch back to native
When I switch to context "NATIVE_APP"
Then I use native element locators
```

### 10.8 Gestures

```gherkin
When I swipe "up" on the native screen
When I swipe "left" with distance 500
When I long-press native element "NativeAndroid.ProductCard" for 2000ms
When I scroll "down" by 300
When I press the back button
When I hide the keyboard
```

---

## 11. Accessibility Testing

### 11.1 Overview

The AccessibilityEngine provides WCAG 2.1 compliance testing without external runtime dependencies (no axe-core). It uses Playwright's DOM access to perform 10 audit categories and generates rich HTML reports.

### 11.2 Feature File Examples

```gherkin
@accessibility @web
Feature: WCAG 2.1 Compliance

  Scenario: Audit login page for WCAG AA compliance
    Given I navigate to the application
    When I run accessibility audit with level "AA"
    Then there should be no critical accessibility violations
    And the total accessibility violations should be less than 5

  Scenario: Check keyboard navigation
    Given I navigate to the application
    When I check keyboard navigation
    Then all interactive elements should be keyboard-reachable

  Scenario: Verify touch targets on mobile
    Given I set viewport to 375 by 667
    When I run mobile accessibility audit
    Then all touch targets should be at least 44x44 pixels

  Scenario: Check focus indicators
    Given I navigate to the application
    When I check focus indicator on "Login.SubmitButton"
    Then the focus indicator should be visible
```

### 11.3 Auto-Audit on Navigation

When `@accessibility` or `@a11y` tag is present:

1. Before hook registers a `page.on('load')` listener
2. Every navigation triggers `auditPageWithLevel(pageName, wcagLevel)`
3. URL deduplication prevents re-auditing the same page
4. Results accumulate in `cumulativeViolationCount`
5. Threshold checks run after each audit:
   - `failOnCritical=true` + critical found → immediate failure
   - cumulative > `maxViolations` → failure

### 11.4 WCAG Level Rules

**Level A (basic):**
- `image-alt` — Images must have alt text
- `label` — Form inputs must have associated labels
- `button-name` — Buttons/links must have accessible names
- `aria-valid-attr-value` — ARIA roles must be valid
- `skip-link` — Skip navigation link present
- `tabindex` — Focusable elements reachable via keyboard

**Level AA (enhanced, includes Level A):**
- `color-contrast` — Sufficient color contrast ratios
- `heading-order` — Sequential heading hierarchy (h1→h2→h3)
- `page-has-heading-one` — Page has exactly one h1

**Level AAA (highest, includes A + AA):**
- `touch-target` — Interactive elements ≥ 44×44px
- `landmark-main` — Page has `<main>` landmark
- `landmark-navigation` — Page has `<nav>` landmark

### 11.5 HTML Report Structure

Each accessibility audit generates an HTML file with:

```
┌─────────────────────────────────────────────────┐
│  Accessibility Audit Report — Page Title         │
│  URL: https://...  |  WCAG Level: AA            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐                               │
│  │  Donut Chart │  Critical: 2                  │
│  │   (visual)   │  Serious:  1                  │
│  │              │  Moderate: 3                  │
│  └──────────────┘  Minor:    0                  │
│                     Total:   6                   │
│                                                  │
├─────────────────────────────────────────────────┤
│  Violations Table                                │
│  ┌──────┬──────────┬────────────┬─────────────┐ │
│  │ Rule │ Severity │ Element    │ WCAG Criteria│ │
│  ├──────┼──────────┼────────────┼─────────────┤ │
│  │ ...  │ ...      │ ...        │ ...         │ │
│  └──────┴──────────┴────────────┴─────────────┘ │
│                                                  │
├─────────────────────────────────────────────────┤
│  Passed Checks ✓                                 │
│  • image-alt: All images have alt text ✓         │
│  • button-name: All buttons have names ✓         │
│  • ...                                           │
└─────────────────────────────────────────────────┘
```

### 11.6 Mobile Accessibility

`auditMobileAccessibility(viewportWidth)` runs two mobile-specific checks:

1. **Touch Target Size** — Scans all `button, a, input, select, textarea` elements for ≥ 44×44px minimum
2. **Content Reflow** — Checks `document.documentElement.scrollWidth` does not exceed viewport width

Only runs when `viewportWidth ≤ 767px` (mobile viewport guard).

### 11.7 Step Definitions (28+)

| Step Pattern | Action |
|-------------|--------|
| `I run accessibility audit` | Full audit at configured level |
| `I run accessibility audit with level {level}` | Audit at specific level |
| `I audit element {ref} for accessibility` | Single element audit |
| `there should be no critical violations` | Assert zero critical violations |
| `total violations should be less than {n}` | Threshold assertion |
| `I check keyboard navigation` | Tab-reachability check |
| `all elements should be keyboard-reachable` | Assert zero unreachable |
| `I check focus indicator on {ref}` | Focus visibility check |
| `the focus indicator should be visible` | Assert focus is visible |
| `I run mobile accessibility audit` | Touch targets + reflow |
| `all touch targets should be at least {n}x{n}px` | Size assertion |
| `I check content reflow at {width}px` | Horizontal scroll check |
| `I get ARIA snapshot` | Dump accessibility tree |
| `the accessibility report should be generated` | Assert file exists |
| ... | (28+ total step definitions) |

---

## 12. Cross-Browser Testing

### 12.1 Configuration

```properties
# framework.properties
browsers=chromium,firefox,webkit    # Browsers to test against
crossBrowser.parallel=true          # Run in parallel
crossBrowser.maxParallel=3          # Max concurrent (clamped to [1,10])

# Per-browser overrides
browser.chromium.viewport=1280x720
browser.chromium.headless=false
browser.chromium.args=--no-sandbox,--disable-setuid-sandbox
browser.chromium.retryCount=2
browser.chromium.executionTimeout=300000

browser.firefox.viewport=1280x720
browser.firefox.headless=false
browser.firefox.args=
browser.firefox.retryCount=2
browser.firefox.executionTimeout=300000

browser.webkit.viewport=1280x720
browser.webkit.headless=false
browser.webkit.args=
browser.webkit.retryCount=2
browser.webkit.executionTimeout=300000
```

### 12.2 Execution Modes

**Sequential Mode** (`crossBrowser.parallel=false`):
```
chromium → (complete) → firefox → (complete) → webkit → (complete)
```

**Parallel Mode** (`crossBrowser.parallel=true`):
```
┌─────────────────────────────────────────────────┐
│ maxParallel=3                                    │
│                                                  │
│  Process 1: chromium ═══════════════════►        │
│  Process 2: firefox  ═══════════════════════►    │
│  Process 3: webkit   ══════════════════►         │
│                                                  │
│  [Merge reports] → [Generate HTML matrix]        │
└─────────────────────────────────────────────────┘
```

### 12.3 Child Process Environment

Each browser spawns a separate `npx cucumber-js` process with:

```bash
CROSS_BROWSER_TARGET=chromium           # Browser engine
CROSS_BROWSER_VIEWPORT=1280x720         # Viewport dimensions
CROSS_BROWSER_HEADLESS=false            # Headless mode
CROSS_BROWSER_ARGS=--no-sandbox,...     # Launch arguments
CROSS_BROWSER_OUTPUT_DIR=reports/chromium-1719849000/  # Isolated output (parallel)
CROSS_BROWSER_PARALLEL_MODE=true        # Parallel flag
CROSS_BROWSER_SCREENSHOTS_DIR=...       # Browser-specific screenshots
CROSS_BROWSER_VIDEOS_DIR=...            # Browser-specific videos
CROSS_BROWSER_LOGS_DIR=...              # Browser-specific logs
```

### 12.4 Tag-Based Filtering

```gherkin
@chromium-only
Scenario: Test Chromium-specific WebGPU feature
  # Runs only on Chromium, skipped on Firefox/WebKit

@firefox-only
Scenario: Test Firefox-specific PDF viewer
  # Runs only on Firefox

@skip-webkit
Scenario: Test using CDP (not available in WebKit)
  # Runs on Chromium and Firefox, skipped on WebKit

@browsers:chromium,firefox
Scenario: Test that works on Chromium and Firefox
  # Explicit browser list

@skip-firefox
Scenario: Known Firefox rendering issue
  # Skipped on Firefox only
```

**Conflict Detection:** The framework rejects conflicting tags (e.g., `@chromium-only` + `@firefox-only`) and throws an error in the Before hook.

### 12.5 Timeout Enforcement

Each browser has a configurable execution timeout (default: 300,000ms / 5 minutes):

```
browser.chromium.executionTimeout=300000   # 5 minutes
browser.firefox.executionTimeout=600000    # 10 minutes (Firefox is slower)
browser.webkit.executionTimeout=300000     # 5 minutes
```

- Valid range: [30,000ms — 1,800,000ms]
- On timeout: child process is killed, pending scenarios recorded as `not_executed`
- Partial results from completed scenarios are preserved

### 12.6 RetryManager

Per-browser exponential backoff retry:

```
Attempt 1: Execute normally
Attempt 2: Wait 1s, retry
Attempt 3: Wait 2s, retry
Attempt 4: Wait 4s, retry (max for retryCount=3)
```

- `browser.chromium.retryCount=2` → up to 2 retries (3 total attempts)
- Valid range: [0, 5]
- Falls back to global `retryCount` if not specified per-browser

### 12.7 ArtifactPathResolver

Creates browser-namespaced output directories to prevent cross-contamination:

```
reports/
├── cross-browser/
│   ├── chromium/
│   │   ├── screenshots/
│   │   ├── videos/
│   │   └── logs/
│   ├── firefox/
│   │   ├── screenshots/
│   │   ├── videos/
│   │   └── logs/
│   └── webkit/
│       ├── screenshots/
│       ├── videos/
│       └── logs/
```

### 12.8 CLI Summary Output

After all browsers complete:

```
═══════════════════════════════════════════════════════════════════
  Cross-Browser Execution Summary
═══════════════════════════════════════════════════════════════════

  Browser     │ Total │ Passed │ Failed │ Skipped │ Pass Rate
  ────────────┼───────┼────────┼────────┼─────────┼──────────
  chromium    │    12 │     12 │      0 │       0 │   100.0%
  firefox     │    12 │     11 │      1 │       0 │    91.7%
  webkit      │    10 │     10 │      0 │       2 │   100.0%

  ⚠ Browser-Specific Failures Detected:
    • Submit order form (firefox only)

  Total execution time: 45.23s
  HTML report: reports/cross-browser/cross-browser-report.html

  ✗ 1 scenario(s) failed across 3 browser(s)
═══════════════════════════════════════════════════════════════════
```

### 12.9 Consolidated HTML Report

A matrix-style HTML report is generated at `reports/cross-browser/cross-browser-report.html`:

- Browser compatibility matrix (scenario × browser grid)
- Pass/fail/skip status per cell
- Browser-specific failures highlighted
- Execution timing per browser
- Error details for failed scenarios
- Links to individual browser artifacts

---

## 13. Self-Healing Engine

### 13.1 Overview

The Self-Healing Engine automatically recovers from broken element locators without requiring test maintenance. When a locator fails to find an element within the configured timeout, the engine systematically tries alternative strategies to locate the same element.

### 13.2 Healing Pipeline (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check Cache                                              │
│   └─ locatorCache.has(reference)?                                │
│      └─ YES → Try cached locator                                 │
│         └─ isVisible? → Return (cache hit)                       │
│         └─ Not visible → Cache stale, continue                   │
│      └─ NO → Continue to Step 2                                  │
├─────────────────────────────────────────────────────────────────┤
│ Step 2: Try Original Locator                                     │
│   └─ _resolveReference(ref) → resolve PageName.Key if needed     │
│   └─ _buildLocator(resolved) → Playwright Locator                │
│   └─ isElementAccessible(locator)?                               │
│      └─ YES → Return success (no healing needed)                 │
│      └─ NO → Continue to Step 3                                  │
├─────────────────────────────────────────────────────────────────┤
│ Step 3: Extract XPath Alternatives                               │
│   └─ _extractAndCacheXPaths(reference, locator)                  │
│   └─ page.evaluate() extracts from DOM:                          │
│      • //*[@id='...']                                            │
│      • //*[@data-testid='...']                                   │
│      • //*[@aria-label='...']                                    │
│      • //tag[contains(@class, '...')]                            │
│      • //tag[contains(text(), '...')]                            │
│      • //tag[@name='...']                                        │
│      • //tag[@placeholder='...']                                 │
│      • //tag[position]                                           │
│   └─ Try each XPath → first visible = healed (confidence: 90%)  │
├─────────────────────────────────────────────────────────────────┤
│ Step 4: Extract Focused DOM                                      │
│   └─ _extractFocusedDOM() → relevant elements with attributes    │
│   └─ Extracts: data-testid, id, role, aria-label, placeholder   │
│   └─ Limited to 2000 chars for performance                       │
├─────────────────────────────────────────────────────────────────┤
│ Step 5: OpenAI Suggestions (if enabled)                          │
│   └─ _getOpenAISuggestionsWithCleanedDOM()                       │
│   └─ Sends to GPT: original locator + reference + cleaned DOM    │
│   └─ GPT returns alternative selectors                           │
│   └─ Parsed into LocatorCandidate[] (confidence: 92-70%)         │
├─────────────────────────────────────────────────────────────────┤
│ Step 6: Generate Prioritized Candidates                          │
│   └─ _generatePrioritizedLocators(resolvedLocator, focusedDOM)   │
│   └─ Parse DOM for: data-testid (97%), id (90%), role+name (88%)│
│      role (85%), label (80%), placeholder (75%), text (70%),     │
│      css class (55%)                                             │
│   └─ Filter: unstable IDs, CSS-in-JS classes, deep selectors    │
│   └─ Deduplicate and sort by confidence descending               │
├─────────────────────────────────────────────────────────────────┤
│ Step 7: Try All Candidates                                       │
│   └─ Merge: [OpenAI suggestions] + [prioritized candidates]     │
│   └─ For each candidate:                                         │
│      └─ _buildLocator(candidate.rawSelector)                     │
│      └─ isElementAccessible(locator)?                            │
│         └─ YES:                                                  │
│            • Cache: locatorCache.set(reference, selector)         │
│            • Highlight: green border + boxShadow                 │
│            • Wait 500ms for visual rendering                     │
│            • Screenshot: capture full page                       │
│            • Attach: screenshot to report                        │
│            • Remove highlight                                    │
│            • Return SUCCESS with healingResult                   │
│         └─ NO: try next candidate                                │
├─────────────────────────────────────────────────────────────────┤
│ Step 8: All Failed                                               │
│   └─ Return FAILED result with tried candidates list             │
│   └─ Error message includes original locator + candidate count   │
└─────────────────────────────────────────────────────────────────┘
```

### 13.3 HealingResult Type

```typescript
interface HealingResult {
  referenceName: string;          // Original reference (e.g., "Login.SubmitButton")
  originalLocator: string;        // Resolved locator that failed
  healingStatus: 'SUCCESS' | 'FAILED';
  confidence: number;             // 0-100% confidence in healed locator
  reason: string;                 // Human-readable explanation
  bestLocator: LocatorCandidate | null;  // The working locator
  fallbackLocators: LocatorCandidate[];  // Other viable alternatives
  matchedElementDetails: MatchedElementDetails | null; // Element info
}

interface LocatorCandidate {
  type: 'data-testid' | 'id' | 'role' | 'label' | 'placeholder' | 'text' | 'css' | 'xpath';
  locator: string;     // Playwright API call (e.g., "page.getByTestId('login')")
  rawSelector: string; // Raw selector string
  confidence: number;  // 0-100%
}

interface MatchedElementDetails {
  tag: string;           // HTML tag name
  text: string;          // Visible text content
  role: string;          // ARIA role
  id: string;            // Element ID
  dataTestId: string;    // data-testid value
  ariaLabel: string;     // aria-label value
  placeholder: string;   // placeholder value
  className: string;     // CSS class names
  attributesUsed: string[]; // Which attributes were available
}
```

### 13.4 HTML Report Card (Per Step)

When self-healing activates, the AfterStep hook attaches a styled HTML card:

```
┌─────────────────────────────────────────────┐
│ 🩹 Self-Healing Activated    [data-testid]  │
├─────────────────────────────────────────────┤
│                                             │
│ Failed:  ̶i̶n̶p̶u̶t̶#̶o̶l̶d̶-̶i̶d̶-̶1̶2̶3̶              │
│ Healed:  data-testid=username-input         │
│                                             │
│  ┌──────────┬────────────┬──────────────┐   │
│  │   97%    │ data-testid │     3        │   │
│  │Confidence│  Strategy   │  Fallbacks   │   │
│  └──────────┴────────────┴──────────────┘   │
│                                             │
│ Fallback Locators:                          │
│  [id] #username-field (90%)                 │
│  [role] role=textbox[name='Username'] (88%) │
│  [placeholder] placeholder=Username (75%)   │
│  [text] text=Enter username (70%)           │
│  [css] .input-username (55%)                │
└─────────────────────────────────────────────┘
```

### 13.5 Configuration

```properties
selfHealing.enabled=true         # Master toggle (false = immediate throw on failure)
selfHealing.locatorTimeout=5000  # Time to wait before triggering healing (ms)
selfHealing.maxCandidates=10     # Max candidates to try per healing attempt
selfHealing.useOpenAI=true       # Enable GPT suggestions (needs OPENAI_API_KEY)
selfHealing.attachReport=true    # Attach HTML card to Cucumber/Allure report
```

---

## 14. Visual Testing

### 14.1 VisualTestingEngine

The VisualTestingEngine provides screenshot-based visual regression testing using the `sharp` image processing library.

**Capabilities:**
- Full-page screenshot capture
- Element-level screenshot capture
- Pixel-by-pixel comparison against baselines
- Configurable difference threshold (`crossBrowser.visualThreshold`, default 5%)
- Anomaly detection for unexpected visual changes
- Screenshot storage in browser-namespaced directories (cross-browser mode)

### 14.2 Usage in Feature Files

```gherkin
@visual @web
Feature: Visual Regression

  Scenario: Homepage visual consistency
    Given I navigate to the application
    When I capture visual baseline "homepage"
    Then the page should match the visual baseline "homepage"

  Scenario: Login form appearance
    Given I navigate to the application
    When I capture screenshot of "Login.FormContainer"
    Then element "Login.FormContainer" should match baseline with 3% tolerance
```

### 14.3 Integration with Self-Healing

When self-healing activates, the VisualTestingEngine:
1. Highlights the healed element with a green border/shadow
2. Captures a full-page screenshot showing the highlighted element
3. Attaches the screenshot to the test report

This provides visual confirmation that the correct element was located after healing.

### 14.4 Cross-Browser Visual Comparison

In cross-browser mode, screenshots are stored per-browser:
```
reports/cross-browser/
├── chromium/screenshots/homepage.png
├── firefox/screenshots/homepage.png
└── webkit/screenshots/homepage.png
```

The `visualThreshold` setting determines acceptable pixel difference between browser renders.

---

## 15. Reporting System

### 15.1 Report Types

| Report | Format | Location | Generated By |
|--------|--------|----------|-------------|
| Cucumber HTML | HTML Dashboard | `reports/html/cucumber-report.html` | `multiple-cucumber-html-reporter` |
| Cucumber JSON | Raw JSON | `reports/cucumber-json/*.json` | Cucumber.js formatter |
| Allure Results | XML + JSON | `reports/allure-results/run-YYYY-MM-DD_HH-mm-ss/` | `allure-commandline` |
| Accessibility | HTML | `reports/accessibility/{page}-{timestamp}.html` | AccessibilityEngine |
| Cross-Browser | HTML Matrix | `reports/cross-browser/cross-browser-report.html` | CrossBrowserReportGenerator |
| Self-Healing | Inline HTML | Attached to steps | AfterStep hook |
| Root Cause Analysis | Inline HTML | Attached to failed steps | RootCauseAnalyzer |
| Device Metadata | Inline HTML | Attached to scenarios | After hook |
| Screenshots | PNG | `reports/screenshots/` | On failure / healing |
| Videos | WebM | `reports/videos/` | Playwright recorder |
| Logs | Text | `reports/logs/` | Winston logger |

### 15.2 Cucumber HTML Report

Generated via `npm run report` using `multiple-cucumber-html-reporter`:

- Dashboard with pass/fail pie charts
- Feature-level summary with scenario counts
- Step-by-step execution detail
- Embedded screenshots (failure + healing)
- Embedded HTML attachments (accessibility, RCA, self-healing cards)
- Metadata: browser, platform, environment
- Duration tracking per step and scenario

### 15.3 Allure Reports

**Per-Run Isolation:** Each test run creates a timestamped folder:
```
reports/allure-results/
├── run-2024-06-15_10-30-45/
│   ├── *.json
│   └── *.xml
├── run-2024-06-15_11-45-22/
│   ├── *.json
│   └── *.xml
└── ...
```

No old data carries over between runs. Historical data is preserved for trend analysis.

**npm Scripts:**

| Command | Action |
|---------|--------|
| `npm run allure:generate` | Generate HTML report from latest results |
| `npm run allure:open` | Open generated report in browser |
| `npm run allure:serve` | Serve report on temp HTTP server |
| `npm run allure:history` | List all historical runs with timestamps |

### 15.4 Inline Report Attachments

Each attachment type uses a specific MIME type for correct rendering:

| Attachment | MIME Type | Content |
|-----------|-----------|---------|
| Screenshots | `image/png` | Base64-encoded PNG buffer |
| Self-Healing Card | `text/html` | Styled HTML with locator details |
| RCA Report | `text/html` | Styled HTML with analysis + suggestions |
| Accessibility Report | `text/html` | Donut chart + violations table |
| Device Metadata | `text/html` | Device name, viewport, orientation card |
| DataStore Dump | `text/plain` | JSON key-value pairs (on failure) |
| Step Timings | `text/plain` | Duration per step |
| Error Logs | `text/plain` | Winston log output |

### 15.5 Report Generation Pipeline

```
Test Execution
    │
    ├─ Cucumber JSON output → reports/cucumber-json/
    │
    ├─ npm run report
    │   └─ Clean reports/html/
    │   └─ GenerateReport.js reads JSON
    │   └─ Produces reports/html/cucumber-report.html
    │
    ├─ Allure results → reports/allure-results/run-{timestamp}/
    │   └─ GenerateAllureResults.js creates timestamped folder
    │   └─ npm run allure:generate → HTML report
    │
    └─ Cross-browser report (if applicable)
        └─ CrossBrowserReportGenerator.generate()
        └─ reports/cross-browser/cross-browser-report.html
        └─ ReportLinker adds link from main Cucumber report
```

---

## 16. Running Tests

### 16.1 npm Scripts Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run default profile (tags from cucumber.yml) |
| `npm run test:accessibility` | Run accessibility-tagged scenarios |
| `npm run test:mobile` | Run mobile-tagged scenarios |
| `npm run test:native` | Run all native app scenarios |
| `npm run test:native:android` | Run native Android scenarios only |
| `npm run test:native:ios` | Run native iOS scenarios only |
| `npm run test:native:smoke` | Run native smoke test scenarios |
| `npm run test:cross-browser` | Sequential cross-browser execution |
| `npm run test:cross-browser:parallel` | Parallel cross-browser execution |
| `npm run test:chromium` | Run on Chromium only (cross-browser profile) |
| `npm run test:firefox` | Run on Firefox only (cross-browser profile) |
| `npm run test:webkit` | Run on WebKit only (cross-browser profile) |
| `npm run report` | Generate Cucumber HTML report |
| `npm run allure:generate` | Generate Allure HTML report |
| `npm run allure:open` | Open Allure report in browser |
| `npm run allure:serve` | Serve Allure report on temp server |
| `npm run allure:history` | List all Allure run timestamps |
| `npm run clean` | Delete reports/ and test-results/ directories |

### 16.2 Cucumber Profiles

Defined in `cucumber.yml`:

| Profile | Tags | Report Output |
|---------|------|---------------|
| `default` | Configurable in cucumber.yml | `reports/cucumber-json/cucumber-report.json` |
| `cross-browser` | None (filtered by env var) | `reports/cucumber-json/${CROSS_BROWSER_TARGET}-cucumber-report.json` |
| `accessibility` | `@accessibility or @a11y` | `reports/cucumber-json/accessibility-report.json` |
| `mobile` | `@mobile` | `reports/cucumber-json/mobile-report.json` |
| `native` | `@native` | `reports/cucumber-json/native-report.json` |

### 16.3 CLI Examples

```bash
# Run specific tags
npx cucumber-js --tags "@teleconnect_orderingestion"

# Run multiple tag groups
npx cucumber-js --tags "@web and @smoke"

# Exclude tags
npx cucumber-js --tags "not @wip and not @skip"

# Run with specific profile
npx cucumber-js --profile native --tags "@native and @android"

# Run with parallel workers (independent scenarios)
npx cucumber-js --parallel 4

# Dry run (validate step definitions exist)
npx cucumber-js --dry-run

# Run single feature file
npx cucumber-js features/web/teleconnect.feature

# Run with custom format
npx cucumber-js --format progress-bar --format json:output.json
```

### 16.4 Environment Variable Overrides

Any framework.properties value can be overridden via environment variable:

```bash
# Override browser
set BROWSER=firefox && npm test

# Override headless mode
set HEADLESS=true && npm test

# Override timeout
set DEFAULTTIMEOUT=60000 && npm test

# Override self-healing
set SELFHEALING_ENABLED=false && npm test

# Cross-browser target (set by CrossBrowserRunner)
set CROSS_BROWSER_TARGET=webkit && npx cucumber-js --profile cross-browser
```

The env var name is derived from the property key: `key.name` → `KEY_NAME` (dots become underscores, uppercase).

### 16.5 Default Timeout

The global Cucumber timeout is set to **120,000ms (2 minutes)** in the Hooks file:

```typescript
setDefaultTimeout(120_000);
// Rationale: BrowserStack native sessions can take 30-40s to provision
```

Individual engine timeouts are configured separately:
- `defaultTimeout=30000` — Element wait timeout
- `navigationTimeout=60000` — Page navigation timeout  
- `apiTimeout=15000` — API request timeout
- `selfHealing.locatorTimeout=5000` — Time before healing triggers

---

## 17. Extending the Framework

### 17.1 Adding a New Page (Web)

1. **Create the properties file** at `src/pages/properties/MyNewPage.properties`:

```properties
# MyNewPage.properties — Element locators for the new page
PageTitle=h1.page-title
SearchInput=placeholder=Search products
SearchButton=role=button[name='Search']
ResultsList=data-testid=search-results
FirstResult=.results-list > li:first-child
NoResultsMessage=text=No results found
FilterDropdown=#category-filter
ApplyFilterButton=//button[contains(text(), 'Apply')]
```

2. **Use in feature files** immediately (no code changes needed):

```gherkin
@web
Scenario: Search for a product
  Given I navigate to "https://example.com/search"
  When I enter "Widget" into "MyNewPage.SearchInput"
  And I click "MyNewPage.SearchButton"
  Then I should see "MyNewPage.ResultsList"
  And "MyNewPage.FirstResult" should contain text "Widget"
```

**That's it.** No TypeScript, no step definitions, no Page Object classes. The 2-layer approach means new pages are test-ready immediately.

### 17.2 Adding New Step Definitions

1. **Create or extend a step file** in `src/steps/`:

```typescript
// src/steps/MyCustomSteps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { Logger } from '../utils/Logger';

When('I perform a custom action on {string}', async function(this: CustomWorld, elementRef: string) {
  Logger.info(`Custom action on: ${elementRef}`);
  const locator = await this.actionEngine.getLocatorWithHealing(elementRef, 'customAction');
  // Custom interaction logic here
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await this.getPage().waitForTimeout(500);
});

Then('the custom metric should be {string}', async function(this: CustomWorld, expected: string) {
  // Custom assertion logic
  const actual = await this.getPage().evaluate(() => {
    return (window as any).__customMetric;
  });
  if (actual !== expected) {
    throw new Error(`Expected metric "${expected}", got "${actual}"`);
  }
});
```

2. **Register in cucumber.yml** — Already included via `src/steps/**/*.ts` glob pattern.

### 17.3 Adding a New Cloud Provider

1. **Extend NativeAppEngine** detection in `src/hooks/Hooks.ts`:

```typescript
// In the Before hook, after BrowserStack and LambdaTest detection:
if (appiumServer.includes('saucelabs.com')) {
  const sauceUser = process.env.SAUCE_USERNAME;
  const sauceKey = process.env.SAUCE_ACCESS_KEY;
  if (!sauceUser || !sauceKey) {
    throw new Error('Sauce Labs credentials not found. Set SAUCE_USERNAME and SAUCE_ACCESS_KEY in .env');
  }

  delete capabilities['appium:app'];
  delete capabilities['appium:automationName'];

  let appUrl = nativeConfig.appPath;
  if (platform === 'ios' && process.env.SAUCE_IOS_APP_URL) {
    appUrl = process.env.SAUCE_IOS_APP_URL;
  } else if (platform === 'android' && process.env.SAUCE_ANDROID_APP_URL) {
    appUrl = process.env.SAUCE_ANDROID_APP_URL;
  }

  capabilities['platformName'] = platform === 'ios' ? 'iOS' : 'Android';
  capabilities['appium:platformVersion'] = platform === 'ios' ? '17' : '14';
  capabilities['appium:deviceName'] = platform === 'ios' ? 'iPhone 15' : 'Google Pixel 8';
  capabilities['appium:app'] = appUrl;
  capabilities['sauce:options'] = {
    username: sauceUser,
    accessKey: sauceKey,
    build: `Native App - ${new Date().toISOString().split('T')[0]}`,
    name: this.scenarioName,
  };
}
```

2. **Add credentials to .env**:

```env
SAUCE_USERNAME=your_username
SAUCE_ACCESS_KEY=your_access_key
SAUCE_ANDROID_APP_URL=storage:filename=app.apk
SAUCE_IOS_APP_URL=storage:filename=app.ipa
```

3. **Update NativeAppEngine.launchApp()** to handle the new provider:

```typescript
if (this.appiumUrl.includes('saucelabs.com')) {
  Logger.info('[NativeAppEngine] App already launched by Sauce Labs');
  return;
}
```

### 17.4 Adding New Device Presets

1. **Add to MOBILE_DEVICES** in `src/core/MobileEngine.ts`:

```typescript
export const MOBILE_DEVICES: Record<string, MobileDeviceConfig> = {
  // ... existing devices ...

  'Galaxy Z Fold 5': {
    name: 'Galaxy Z Fold 5',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36...',
    viewport: { width: 904, height: 1224 },  // Unfolded inner display
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
  },

  'Galaxy Z Fold 5 Cover': {
    name: 'Galaxy Z Fold 5 Cover',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36...',
    viewport: { width: 375, height: 832 },  // Cover (outer) display
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
};
```

The `DEVICE_NAME_LOOKUP` map is auto-generated from `MOBILE_DEVICES` keys, so tag parsing (`@device:GalaxyZFold5`) works automatically after adding the preset.

### 17.5 Adding New Accessibility Rules

1. **Add the check method** in `AccessibilityEngine.ts`:

```typescript
private async checkNewRule(v: AccessibilityViolation[], p: string[]): Promise<void> {
  // Implementation: scan DOM for the new rule
  const elements = await this.page.locator('[aria-expanded]').all();
  let violations = 0;
  for (const el of elements) {
    // Check logic here...
    if (/* violation condition */) {
      v.push({
        rule: 'new-rule-name',
        severity: 'moderate',
        element: '...',
        description: 'Description of the violation',
        wcagCriteria: 'WCAG 2.1 — X.Y.Z Criteria Name',
        suggestion: 'How to fix it',
      });
      violations++;
    }
  }
  if (violations === 0) p.push('new-rule-name: All checks passed ✓');
}
```

2. **Add to the audit runner** in `runFilteredAudit()`:

```typescript
await Promise.all([
  // ... existing checks ...
  this.checkNewRule(violations, passed),
]);
```

3. **Add to WCAG level rules** if the rule maps to a specific WCAG level:

```typescript
const WCAG_LEVEL_RULES: Record<'A' | 'AA' | 'AAA', string[]> = {
  A: ['image-alt', 'label', ..., 'new-rule-name'],
  AA: [...],
  AAA: [...],
};
```

### 17.6 Adding New Random Data Generators

Extend `RandomDataGenerator` in `src/utils/RandomDataGenerator.ts`:

```typescript
// Add new ## prefixes:
case '##CreditCard':
  return faker.finance.creditCardNumber();
case '##IBAN':
  return faker.finance.iban();
case '##IPv4':
  return faker.internet.ipv4();
case '##Color':
  return faker.color.human();
case '##ProductName':
  return faker.commerce.productName();
```

Usage in feature files:
```gherkin
When I enter "##CreditCard" into "Payment.CardNumber"
And I enter "##IBAN" into "Payment.BankAccount"
```

---

## 18. Appendix: Configuration Reference

### 18.1 Complete framework.properties Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `env` | string | `qa` | Active environment name |
| `headless` | boolean | `false` | Run browser in headless mode |
| `app.url` | string | — | Default application URL |
| `app.maximizeBrowser` | boolean | `false` | Maximize browser on launch |
| `api.baseUrl` | string | — | Base URL for API requests |
| `defaultTimeout` | number (ms) | `30000` | Element wait timeout |
| `navigationTimeout` | number (ms) | `60000` | Page navigation timeout |
| `apiTimeout` | number (ms) | `15000` | API request timeout |
| `slowMo` | number (ms) | `0` | Delay between Playwright actions |
| `retryCount` | number | `2` | Global retry count |
| `screenshotOnFail` | boolean | `true` | Capture screenshot on failure |
| `video` | enum | `retain-on-failure` | Video recording mode |
| `selfHealing.enabled` | boolean | `true` | Enable self-healing |
| `selfHealing.locatorTimeout` | number (ms) | `5000` | Timeout before healing |
| `selfHealing.maxCandidates` | number | `10` | Max fallback candidates |
| `selfHealing.useOpenAI` | boolean | `true` | Use GPT for suggestions |
| `selfHealing.attachReport` | boolean | `true` | Attach healing HTML |
| `test.user.password` | string | `TestUser@123` | Test user password |
| `test.user.name` | string | `Test User` | Test user display name |
| `test.user.emailDomain` | string | `teleconnect.local` | Email domain for test accounts |
| `mobile.defaultDevice` | string | `iPhone 14` | Default device preset |
| `mobile.defaultOrientation` | enum | `portrait` | Default orientation |
| `mobile.networkCondition` | enum | — | Network throttling preset |
| `mobile.executionMode` | enum | `emulation` | Execution mode |
| `mobile.cloudProvider` | enum | — | Cloud provider |
| `accessibility.enabled` | boolean | `true` | Enable accessibility engine |
| `accessibility.failOnCritical` | boolean | `true` | Fail on critical violations |
| `accessibility.wcagLevel` | enum | `AA` | WCAG conformance level |
| `accessibility.maxViolations` | number | `0` | Max allowed violations |
| `browsers` | csv | `chromium` | Browser list for cross-browser |
| `crossBrowser.parallel` | boolean | `false` | Parallel cross-browser |
| `crossBrowser.maxParallel` | number | `3` | Max concurrent browsers |
| `crossBrowser.visualThreshold` | number | `5` | Visual diff threshold (%) |
| `browser.{name}.args` | csv | — | Per-browser launch args |
| `browser.{name}.viewport` | WxH | `1280x720` | Per-browser viewport |
| `browser.{name}.headless` | boolean | (global) | Per-browser headless |
| `browser.{name}.retryCount` | number | (global) | Per-browser retry [0-5] |
| `browser.{name}.executionTimeout` | number (ms) | `300000` | Per-browser timeout |
| `realDevice.enabled` | boolean | `false` | Enable real device testing |
| `realDevice.provider` | enum | — | Device provider |
| `realDevice.platform` | enum | — | Target platform |
| `realDevice.deviceName` | string | — | Device name |
| `realDevice.osVersion` | string | — | OS version |
| `realDevice.browser` | string | — | Mobile browser |
| `realDevice.appiumServer` | URL | `http://localhost:4723` | Appium server URL |
| `nativeApp.enabled` | boolean | `false` | Enable native app testing |
| `nativeApp.appiumServer` | URL | `http://localhost:4723` | Appium server URL |
| `nativeApp.platform` | enum | — | Target platform |
| `nativeApp.appPath` | string | — | App binary path/URL |
| `nativeApp.appPackage` | string | — | Android package name |
| `nativeApp.appActivity` | string | — | Android main activity |
| `nativeApp.bundleId` | string | — | iOS bundle identifier |
| `nativeApp.autoGrantPermissions` | boolean | `true` | Android auto-permissions |
| `nativeApp.fullReset` | boolean | `false` | Reinstall between scenarios |
| `nativeApp.noReset` | boolean | `true` | Keep app state |

### 18.2 Environment Variables (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For self-healing AI | OpenAI GPT API key |
| `BROWSERSTACK_USERNAME` | For BrowserStack | BrowserStack username |
| `BROWSERSTACK_ACCESS_KEY` | For BrowserStack | BrowserStack access key |
| `BROWSERSTACK_ANDROID_APP_URL` | For BS Android | Android app URL (bs://...) |
| `BROWSERSTACK_IOS_APP_URL` | For BS iOS | iOS app URL (bs://...) |
| `LAMBDATEST_USERNAME` | For LambdaTest | LambdaTest username |
| `LAMBDATEST_ACCESS_KEY` | For LambdaTest | LambdaTest access key |
| `LAMBDATEST_ANDROID_APP_URL` | For LT Android | Android app URL (lt://...) |
| `LAMBDATEST_IOS_APP_URL` | For LT iOS | iOS app URL (lt://...) |
| `SAUCE_USERNAME` | For Sauce Labs | Sauce Labs username |
| `SAUCE_ACCESS_KEY` | For Sauce Labs | Sauce Labs access key |

### 18.3 Cucumber Profile Parameters

Each profile in `cucumber.yml` configures:

```yaml
profile_name:
  requireModule:            # ts-node/register for TypeScript
  require:                  # Step definition + hook file paths
  paths:                    # Feature file glob patterns
  tags:                     # Tag filter expression
  format:                   # Output formatters (progress-bar, json, html)
  formatOptions:            # Formatter config (snippetInterface: async-await)
  parallel:                 # Worker count for parallel scenarios
```

### 18.4 Data Flow Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ .env         │────▶│ FrameworkConfig   │◀────│ framework.props  │
│ (secrets)    │     │ (Singleton)       │     │ (settings)       │
└──────────────┘     └────────┬─────────┘     └─────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
     ┌────────────┐  ┌───────────────┐  ┌────────────────┐
     │ CustomWorld │  │ Hooks.ts      │  │ Core Engines   │
     │ (per-scenario)│ (lifecycle)    │  │ (per-scenario) │
     └──────┬─────┘  └───────┬───────┘  └───────┬────────┘
            │                 │                   │
            ▼                 ▼                   ▼
     ┌────────────┐  ┌───────────────┐  ┌────────────────┐
     │ Steps      │  │ Report Gen    │  │ Browser/Appium │
     │ (actions)  │  │ (artifacts)   │  │ (execution)    │
     └────────────┘  └───────────────┘  └────────────────┘
```

### 18.5 Supported Tag Combinations

| Tags | Result |
|------|--------|
| `@web` | Standard web browser test |
| `@api` | API-only test (no browser) |
| `@web @api` | Web test with API calls |
| `@mobile` | Default device emulation |
| `@mobile @device:Pixel7` | Specific device emulation |
| `@mobile @device:iPhone14 @landscape` | Device + landscape |
| `@native @android` | Android native app test |
| `@native @ios` | iOS native app test |
| `@accessibility @web` | Web test with auto-audit |
| `@visual @web` | Web test with visual regression |
| `@web @chromium-only` | Web test on Chromium only |
| `@web @skip-webkit` | Web test on all except WebKit |
| `@web @browsers:chromium,firefox` | Web test on specific browsers |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2024-06 | Full rewrite: Self-healing, AI RCA, Native App, Cross-Browser, Accessibility |
| 2.1 | 2024-04 | Mobile emulation, device presets, network throttling |
| 1.1 | 2024-02 | Initial BDD + Playwright framework with web and API testing |

---

*End of Technical Specification*
