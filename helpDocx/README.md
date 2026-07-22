# Playwright BDD Framework — Complete Guide

> A production-grade, zero-code-change BDD automation framework for Web UI and REST API testing.  
> Built with Playwright · Cucumber · TypeScript · AI Self-Healing · Allure Reporting

---

## Table of Contents

1. [What This Framework Is](#1-what-this-framework-is)
2. [How It Works — Big Picture](#2-how-it-works--big-picture)
3. [Quick Start](#3-quick-start)
4. [Onboarding a New Application — Step by Step](#4-onboarding-a-new-application--step-by-step)
5. [Configuration Deep Dive](#5-configuration-deep-dive)
6. [Page Object Model — Properties Files](#6-page-object-model--properties-files)
7. [Writing Feature Files](#7-writing-feature-files)
8. [Variable System — Three Layers](#8-variable-system--three-layers)
9. [Complete Step Reference](#9-complete-step-reference)
10. [How a Test Run Flows — End to End](#10-how-a-test-run-flows--end-to-end)
11. [Component Internals](#11-component-internals)
12. [AI Self-Healing Engine](#12-ai-self-healing-engine)
13. [Reporting](#13-reporting)
14. [Running Tests](#14-running-tests)
15. [Project Structure](#15-project-structure)
16. [Troubleshooting](#16-troubleshooting)
17. [Mobile Device Emulation](#17-mobile-device-emulation)
18. [Accessibility Testing (WCAG Auditing)](#18-accessibility-testing-wcag-auditing)
19. [Cross-Browser Testing](#19-cross-browser-testing)
20. [Enhanced Tags Reference](#20-enhanced-tags-reference)
21. [Real Device Testing](#21-real-device-testing)
22. [Native App Testing](#22-native-app-testing)

---

## 1. What This Framework Is

This is a **2-layer BDD framework** where you only ever write two things to automate any application:

```
Layer 1 → Feature File (.feature)       ← You write the test in plain English
Layer 2 → Properties File (.properties) ← You map element names to locators
           ↓
           Framework does everything else automatically
```

No TypeScript. No page classes. No boilerplate. Just Gherkin and locators.

### What you get out of the box

| Capability | Detail |
|-----------|--------|
| **Web UI Automation** | Playwright-powered — Chrome, Firefox, Safari |
| **REST API Testing** | Axios-based HTTP client with Cucumber steps |
| **AI Self-Healing** | Broken locators are auto-fixed at runtime using OpenAI |
| **Root Cause Analysis** | On failure, AI analyzes what went wrong and suggests fixes |
| **Random Data Generation** | `##Email`, `##FullName`, `##Address` etc. via Faker.js |
| **Cross-Scenario Data** | Share variables between features using `$$variable` |
| **Rich Reporting** | HTML, JSON, Allure reports with screenshots, videos, healing logs |
| **Screenshot on Failure** | Automatic full-page screenshot attached to report |
| **Video Recording** | Retained on failure by default |
| **Mobile Device Emulation** | Tag-driven: `@device:iPhone14`, `@mobile` — viewport, UA, touch |
| **Accessibility Auditing** | Automatic WCAG 2.1 audits on `@accessibility` tag — A/AA/AAA |
| **Cross-Browser Testing** | Multi-browser execution with consolidated matrix report |

---

## 2. How It Works — Big Picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOU WRITE                                       │
│                                                                         │
│   features/web/login.feature          src/pages/properties/Login.properties  │
│   ─────────────────────────           ─────────────────────────────────      │
│   When I click 'Login.Submit'   ───►  Submit=#login-button                   │
│   Then 'Login.Error' should           Error=[data-test='error']               │
│        be visible               ───►                                          │
└───────────────────────┬─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRAMEWORK HANDLES                                  │
│                                                                         │
│  ElementResolver   →  reads Login.properties, returns "#login-button"  │
│  ActionEngine      →  page.locator('#login-button').click()             │
│  SelfHealingEngine →  if locator fails, finds element another way       │
│  ContextManager    →  manages browser open/close per scenario           │
│  Hooks             →  screenshots, reports, cleanup                     │
│  Reporting         →  HTML + Allure + inline healing reports            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow When `npm test` Is Run

```
npm test
   │
   ├─ Cucumber loads cucumber.yml
   │     requireModule: ts-node/register  (TypeScript support)
   │     require: CustomWorld, Hooks, all Steps
   │     paths: features/**/*.feature
   │     tags: (filter by tag)
   │
   ├─ For each Scenario:
   │     BeforeAll  → create report directories
   │     Before     → launch browser, init ActionEngine
   │     BeforeStep → log step, start timer
   │     [Step runs]
   │     AfterStep  → attach self-healing report if any, screenshot on fail
   │     After      → close browser, clear stores, save step timings
   │     AfterAll   → log suite complete
   │
   └─ Reports written to reports/
```

---

## 3. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps

# 3. Create your .env (needed even if you skip OpenAI)
copy .env.example .env

# 4. Run the tests
npm test

# 5. View the report
# Open: reports/html/cucumber-report.html
```

> **Important:** Always run commands from the folder that contains `package.json`:
> ```
> BDD_Playwright-main\
>   BDD_Playwright-main\     ← Run from HERE
>     package.json
>     cucumber.yml
> ```

---

## 4. Onboarding a New Application — Step by Step

Say you have a new app: **`https://myapp.com`** with a Login page and a Dashboard.  
Here is exactly what you do — nothing more.

---

### Step 1 — Set the App URL in `framework.properties`

Open `src/config/framework.properties` and update:

```properties
app.url=https://myapp.com/login
```

That's the URL Cucumber navigates to when a scenario says `Given I navigate to the application`.

**Why this file and not somewhere else?**  
`FrameworkConfig.ts` reads this file as a singleton at startup. Every component — `ContextManager`, `ActionEngine`, `Hooks` — gets settings from here. One place controls everything.

---

### Step 2 — Set the Browser and Run Mode

Still in `framework.properties`:

```properties
browser=chromium        # chromium | firefox | webkit
headless=false          # false = visible browser (good for dev), true = CI/pipeline
slowMo=0                # 0 = full speed | 500 = 500ms pause between actions (good for demos)
```

**When to use each setting:**

| Situation | Settings |
|-----------|---------|
| Writing tests locally | `headless=false`, `slowMo=500` |
| Debugging a failure | `headless=false`, `slowMo=1000` |
| Running in CI/CD | `headless=true`, `slowMo=0` |
| Running a demo | `headless=false`, `slowMo=500` |

---

### Step 3 — Create a Properties File for Your Page

Create `src/pages/properties/MyApp.properties`

```properties
# Login Page
LoginEmail=#email
LoginPassword=#password
LoginButton=//button[@type='submit']
ErrorMessage=[data-test='error-msg']

# Dashboard
WelcomeHeading=//h1[@data-testid='welcome']
LogoutButton=text=Logout
```

**Naming rules:**
- File name = the prefix you use in feature files (`MyApp.LoginEmail`)
- One file per logical page or module
- Supports XPath, CSS, `text=`, `placeholder=`, `role=`, `data-testid=`

**Locator format examples:**

| What you see in the browser DevTools | What to write in .properties |
|--------------------------------------|------------------------------|
| `<input id="email">` | `LoginEmail=#email` |
| `<button data-testid="submit">` | `Submit=//button[@data-testid='submit']` |
| `<button>Sign In</button>` | `SignIn=text=Sign In` |
| `<input placeholder="Enter name">` | `NameField=placeholder=Enter name` |
| XPath needed | `Header=//h1[@class='page-title']` |

---

### Step 4 — Write the Feature File

Create `features/web/login.feature`:

```gherkin
@web @myapp_login
Feature: MyApp Login

  @smoke
  Scenario: User logs in successfully
    Given I navigate to the application
    When I enter 'john@test.com' into 'MyApp.LoginEmail'
    And I enter 'secret123' into 'MyApp.LoginPassword'
    And I click 'MyApp.LoginButton'
    Then 'MyApp.WelcomeHeading' should be visible
```

That's it. No TypeScript changes. The framework picks up any new `.feature` file and any new `.properties` file automatically.

---

### Step 5 — Add the Tag to `cucumber.yml`

Open `cucumber.yml` and add your tag to the `tags:` line:

```yaml
tags: "@teleconnect_orderingestion or ... or @myapp_login"
```

Or run it directly without changing `cucumber.yml`:

```bash
npx cucumber-js --tags "@myapp_login"
```

---

### Step 6 — Run and See Results

```bash
npm test
# or
npx cucumber-js --tags "@myapp_login"
```

Open `reports/html/cucumber-report.html` to see results, screenshots, and timing.

---

## 5. Configuration Deep Dive

### `src/config/framework.properties` — Every Setting Explained

This is the **single source of truth** for all non-secret configuration. The `FrameworkConfig` singleton loads it once at startup and distributes settings to every component.

```properties
# ─── ENVIRONMENT ──────────────────────────────────────────────────────────
env=qa
```
> Sets the active environment name. Must match a key in `environments.json` (`qa`, `staging`, `prod`).  
> Used by: `ContextManager` to pick `baseUrl` and `apiBaseUrl`.

```properties
browser=chromium
```
> Which browser engine to use. Options: `chromium` (Chrome/Edge), `firefox`, `webkit` (Safari).  
> Used by: `ContextManager.launch()`.

```properties
headless=false
```
> `false` = visible browser window. `true` = no window (for CI pipelines).  
> Used by: `ContextManager.launch()`.

```properties
app.url=https://simulapp.online/login
```
> The URL that `Given I navigate to the application` goes to.  
> **This is the main setting to change when onboarding a new app.**  
> Used by: `WebSteps.ts` → `ActionEngine.navigateTo()`.

```properties
api.baseUrl=https://simulapp.online
```
> Base URL for API tests. Used when a feature file says `Given I set the base url to '{api.baseUrl}'`.  
> Used by: `PropertiesLoader.get('api.baseUrl')` → `ApiEngine`.

```properties
app.maximizeBrowser=false
```
> `true` = resize viewport to 1920×1080 on every navigation.  
> Useful for apps that hide elements at smaller screen sizes.

```properties
# ─── TIMEOUTS (milliseconds) ──────────────────────────────────────────────
defaultTimeout=30000
```
> How long Playwright waits for any element to appear before failing.  
> Used by: `context.setDefaultTimeout()` in `ContextManager`.

```properties
navigationTimeout=60000
```
> How long to wait for a page to load after a navigation action.  
> Used by: `context.setDefaultNavigationTimeout()`.

```properties
apiTimeout=15000
```
> Maximum wait for an HTTP response in API tests.  
> Used by: `ApiEngine` via axios `timeout`.

```properties
slowMo=500
```
> Adds a millisecond delay after every Playwright action.  
> `0` = full speed. `500` = half-second pause (good for watching a run).  
> Used by: `ContextManager` → `browserEngine.launch({ slowMo })`.

```properties
# ─── RETRY ────────────────────────────────────────────────────────────────
retryCount=2
```
> How many times to retry a failed test step before marking it failed.  
> Used by: `FrameworkConfig` (available for custom retry logic).

```properties
# ─── SCREENSHOTS & VIDEO ──────────────────────────────────────────────────
screenshotOnFail=true
```
> Automatically captures a full-page screenshot when a scenario fails.  
> Saved to `reports/screenshots/` and attached to the test report.

```properties
video=retain-on-failure
```
> Controls Playwright video recording.  
> `on` = always record. `off` = never. `retain-on-failure` = delete on pass, keep on fail.  
> Videos saved to `reports/videos/`.

```properties
# ─── SELF-HEALING ─────────────────────────────────────────────────────────
selfHealing.enabled=true
```
> Master switch for the AI self-healing engine.  
> `true` = when a locator times out, the framework tries to find the element another way.  
> `false` = locator failures throw immediately.

```properties
selfHealing.locatorTimeout=5000
```
> How long (ms) to wait for a locator before triggering self-healing.  
> The normal `defaultTimeout` still applies after healing succeeds.

```properties
selfHealing.maxCandidates=10
```
> Maximum number of DOM elements to consider as healing candidates.

```properties
selfHealing.useOpenAI=true
```
> Whether to call OpenAI GPT for intelligent healing suggestions.  
> Requires `OPENAI_API_KEY` in `.env`.  
> Set to `false` to use heuristic-only mode (no API key needed).

```properties
selfHealing.attachReport=true
```
> Attaches the self-healing HTML report to the Cucumber/Allure result for each healed step.

```properties
# ─── TEST USER ────────────────────────────────────────────────────────────
test.user.password=TestUser@123
test.user.emailDomain=teleconnect.local
```
> Default credentials used by `TestUserManager` when dynamically creating test users.

---

### `.env` — Secrets Only

```
OPENAI_API_KEY=sk-your-key-here
```

Create from the template:
```bash
copy .env.example .env
```

This file is git-ignored. Never commit it. Only put secrets here — everything else goes in `framework.properties`.

---

### `src/config/environments.json` — Per-Environment URLs

```json
{
  "qa": {
    "baseUrl": "https://myapp-qa.com",
    "apiBaseUrl": "https://api-qa.myapp.com",
    "timeout": 30000,
    "navigationTimeout": 60000,
    "apiTimeout": 15000,
    "retryCount": 2
  },
  "staging": {
    "baseUrl": "https://myapp-staging.com",
    "apiBaseUrl": "https://api-staging.myapp.com",
    "timeout": 30000,
    "navigationTimeout": 60000,
    "apiTimeout": 15000,
    "retryCount": 2
  }
}
```

Switch environment by changing `env=qa` to `env=staging` in `framework.properties`,  
or by setting the `ENV` environment variable before running:

```bash
# Windows CMD
set ENV=staging & npm test

# PowerShell
$env:ENV="staging"; npm test
```

> **Note:** `app.url` in `framework.properties` takes precedence over `baseUrl` here for web navigation.  
> `baseUrl` in `environments.json` is used by `ContextManager` as the Playwright context base.

---

## 6. Page Object Model — Properties Files

### Why properties files instead of TypeScript classes?

Traditional POM requires a TypeScript class per page, getters, constructors, and imports everywhere. Here, adding a new element is **one line**:

```properties
# Before — nothing
# After  — one line added:
MyNewButton=//button[@data-testid='my-btn']
```

And it's immediately usable in any feature file as `'PageName.MyNewButton'`.

### File Location

```
src/pages/properties/
├── Login.properties
├── Home.properties
├── MyApp.properties       ← create one per page/module
└── ...
```

### File Format

```properties
# Comments start with #
# Blank lines are ignored

# Format: ElementName=locator
LoginEmail=//input[@data-testid='login-email']
LoginPassword=#password
LoginSubmit=//button[@data-testid='login-submit']
ErrorBanner=.error-message
WelcomeText=text=Welcome back
```

### Usage in Feature Files

```gherkin
When I enter 'user@test.com' into 'Login.LoginEmail'
And I click 'Login.LoginSubmit'
Then 'Login.ErrorBanner' should be visible
```

Format: `'FileName.ElementName'`  
The framework splits on the first `.`, loads `Login.properties`, and looks up `LoginEmail`.

### Supported Locator Types

| Format | Example | Playwright Method Used |
|--------|---------|----------------------|
| XPath | `//button[@data-testid='submit']` | `page.locator(xpath)` |
| XPath indexed | `(//button[@class='btn'])[1]` | `page.locator(xpath)` |
| CSS class | `.btn-primary` | `page.locator(css)` |
| CSS id | `#submit-btn` | `page.locator(css)` |
| CSS attribute | `[data-testid='submit']` | `page.locator(css)` |
| Text | `text=Sign In` | `page.locator(text=)` |
| Placeholder | `placeholder=Enter email` | `page.getByPlaceholder()` |
| ARIA Role | `role=button[name='Submit']` | `page.getByRole()` |
| Test ID | `data-testid=submit-btn` | `page.getByTestId()` |
| Chained | `.nav >> .logo` | chained `.locator()` calls |

### How to Find Locators

1. Open the app in Chrome
2. Right-click the element → Inspect
3. In DevTools, look for:
   - `data-testid` or `data-test` attributes → **use XPath or data-testid= format** (most stable)
   - Unique `id` → use `#id`
   - Unique text content → use `text=My Button`
   - CSS class (only if unique) → use `.class-name`

### Chained Locators (for elements inside other elements)

```properties
# Click the "Edit" button inside a specific table row
TableEditBtn=.order-row >> button.edit-btn
```

---

## 7. Writing Feature Files

### File Location

```
features/
├── web/         ← UI tests (tag with @web)
│   └── login.feature
└── api/         ← API-only tests (tag with @api)
    └── users.feature
```

### Required Tags

Every feature/scenario must have the right layer tag so the framework knows whether to launch a browser:

```gherkin
@web   ← launches browser
@api   ← no browser (API-only)
```

If a scenario has only `@api` and not `@web`, the `Before` hook skips the browser launch entirely.

### Feature File Structure

```gherkin
@web @myapp_login                          ← feature-level tags
Feature: Login Page

  @smoke @e2e                              ← scenario-level tags
  Scenario: Successful login
    Given I navigate to the application   ← uses app.url from framework.properties
    When I enter '##Email' into 'Login.EmailField'   ← ##Email = random fake email
    And I enter 'Test@1234' into 'Login.Password'
    And I click 'Login.SubmitButton'
    Then 'Dashboard.WelcomeHeading' should be visible
    And I get text from 'Dashboard.WelcomeHeading' and store as 'WelcomeMsg'
```

### Available Tags

| Tag | Meaning |
|-----|---------|
| `@web` | Has browser steps — browser is launched |
| `@api` | API-only — no browser |
| `@smoke` | Include in smoke test suite |
| `@e2e` | End-to-end scenario |
| `@regression` | Full regression suite |
| `@negative` | Tests error/invalid paths |
| `@negative-testing` | Alias for `@negative` — marks error/validation/invalid-path scenarios |
| `@ignore` | Skip this scenario |
| `@slow` | Logs a warning; consider extended timeout |
| `@visual` | Enables visual testing report attachment |
| `@device:DeviceName` | Emulate specific mobile device (e.g., `@device:iPhone14`) |
| `@mobile` | Use default mobile device from configuration |
| `@accessibility` | Enable automatic WCAG accessibility auditing |
| `@a11y` | Alias for `@accessibility` |
| `@chromium-only` | Run only on Chromium browser |
| `@firefox-only` | Run only on Firefox browser |
| `@webkit-only` | Run only on WebKit browser |
| `@skip-chromium` | Skip on Chromium |
| `@skip-firefox` | Skip on Firefox |
| `@skip-webkit` | Skip on WebKit |
| Any custom tag | Use your own tags and filter by them |

### Background Block (shared setup across scenarios)

```gherkin
Feature: Order API

  Background:
    Given I set the base url to '{api.baseUrl}'
    And I set bearer token '{authToken}'

  Scenario: Get orders
    When I send a GET request to '/api/orders'
    Then the response status should be 200
```

### Scenario Outline (data-driven)

```gherkin
Scenario Outline: Login with multiple users
  Given I navigate to the application
  When I enter '<email>' into 'Login.Email'
  And I enter '<password>' into 'Login.Password'
  And I click 'Login.Submit'
  Then '<result>' should be visible

  Examples:
    | email            | password    | result             |
    | admin@test.com   | Admin@123   | Dashboard.Heading  |
    | wrong@test.com   | wrongpass   | Login.ErrorMessage |
```

---

## 8. Variable System — Three Layers

The framework has three variable systems that work together. Understanding which to use is key.

### Layer 1 — In-Scenario Variables `{variableName}`

**What:** An in-memory key-value store (`DataStore.ts`). Lives only for the duration of one scenario. Cleared automatically in the `After` hook.

**When to use:** Capturing a value in one step and using it later in the **same scenario**.

**Save a value:**
```gherkin
When I store text of 'Dashboard.OrderNumber' as 'myOrderId'
When I store attribute 'value' of 'Form.EmailField' as 'enteredEmail'
```

**Use the value:**
```gherkin
And I enter '{myOrderId}' into 'Search.Input'
Then variable 'enteredEmail' should equal 'john@test.com'
```

**Also works in API steps:**
```gherkin
And I store the response body field 'token' as 'authToken'
And I set bearer token '{authToken}'
When I send a GET request to '/api/users/{userId}'
```

---

### Layer 2 — Cross-Scenario Variables `$$variableName`

**What:** A JSON file store (`PersistentStore.ts`). Written to `testdata/runtime-store.json`. Survives across scenarios and feature files for the entire test run.

**When to use:** When Scenario A produces data that Scenario B (or Feature 2) needs.

**Save a value:**
```gherkin
# This saves the text AND persists it to runtime-store.json
When I get text from 'Order.OrderNumber' and store as 'OrderId'

# Or persist an existing {variable}
When I persist '{Email}' as 'Email'
```

**Use the value (in any later scenario or feature file):**
```gherkin
When I enter '$$OrderId' into 'CRM.SearchInput'
And I enter '$$Email' into 'Login.EmailField'
```

**The JSON file (`testdata/runtime-store.json`):**
```json
{
  "OrderId": "TC-20260623-001",
  "Email": "james@test.com",
  "Password": "TestUser@123"
}
```

> **Important:** If you run scenarios individually (not as a full suite), this file may have stale values from a previous run. Always run the full suite in order, or clear the file first.

---

### Layer 3 — Random Data `##FieldName`

**What:** Generates realistic fake data at runtime via Faker.js (`RandomDataGenerator.ts`). Every `##Token` generates a new value each run.

**When to use:** Registration forms, input fields where you need unique data each run.

**Usage:**
```gherkin
When I enter '##FullName' into 'Register.NameField'
And I enter '##Email' into 'Register.EmailField'
And I enter '##MobileNum' into 'Register.PhoneField'
And I enter '##Address' into 'Register.AddressField'
```

**All supported tokens:**

| Token | Example Output |
|-------|---------------|
| `##FirstName` | James |
| `##LastName` | Thompson |
| `##FullName` | James Thompson |
| `##Email` | james.thompson@example.com |
| `##MobileNum` | 9845123210 |
| `##PhoneNum` | 0221234567 |
| `##Address` | 42 Maple Street |
| `##City` | Mumbai |
| `##State` | Karnataka |
| `##ZipCode` | 560001 |
| `##Country` | India |
| `##Company` | TechSolutions Inc |
| `##JobTitle` | Senior Engineer |
| `##Username` | james_t_42 |
| `##Password` | xK9#mPq2Lw1! |
| `##DOB` | 1988-06-15 |
| `##UUID` | 550e8400-e29b-41d4-a716 |
| `##Amount` | 1234.56 |

---

### Resolution Order

When a value like `##Email` or `{token}` or `$$OrderId` is encountered, `ActionEngine.resolveValue()` processes them in this order:

```
Input value
    │
    ├─ 1. RandomDataGenerator.resolve()   → replaces ##FieldName
    │
    ├─ 2. PersistentStore.resolve()       → replaces $$VarName
    │
    └─ 3. DataStore lookup                → replaces {VarName}
```

You can even combine them:
```gherkin
When I enter '##Email' into 'Login.Email'
Then I store attribute 'value' of 'Login.Email' as 'GeneratedEmail'
And I persist '{GeneratedEmail}' as 'LoginEmail'
# Now $$LoginEmail holds the generated email for later scenarios
```

---

## 9. Complete Step Reference

### Navigation

```gherkin
Given I navigate to the application                        # uses app.url from framework.properties
Given I navigate to 'https://example.com'                  # explicit URL
Given I am on 'https://example.com'                        # alias
When I go back
When I go forward
When I refresh the page
```

### Clicking

```gherkin
When I click 'Page.Element'
When I double click 'Page.Element'
When I right click 'Page.Element'
```

### Typing / Input

```gherkin
When I enter 'value' into 'Page.Element'            # clears then fills (fast)
When I type 'value' into 'Page.Element'             # clears then types char by char (50ms delay)
When I clear 'Page.Element'
When I press 'Enter'                                # global keyboard press
When I press 'Tab' on 'Page.Element'                # key on specific element
```

### Dropdowns

```gherkin
When I select 'Option Label' from 'Page.Select'             # standard <select>
When I select 'Option' from dropdown 'Page.Combobox'        # custom combobox
```

### Checkboxes & Interactions

```gherkin
When I check 'Page.Checkbox'
When I uncheck 'Page.Checkbox'
When I hover over 'Page.Element'
When I scroll to 'Page.Element'
When I scroll to the top of the page
When I scroll to the bottom of the page
```

### Drag & Drop / File Upload

```gherkin
When I drag 'Page.Source' to 'Page.Target'
When I upload file 'path/to/file.pdf' to 'Page.FileInput'
When I upload ID document 'aadhaar.pdf'                     # uploads from resources/ folder
```

### Waiting

```gherkin
When I wait for 'Page.Element' to be visible
When I wait for 'Page.Element' to be hidden
When I wait for 'Page.Element' to be attached
When I wait for 'Page.Element' to be detached
When I wait 3 seconds                                       # explicit wait (use sparingly)
When I wait for the url to contain '/dashboard'
```

### Assertions

```gherkin
Then 'Page.Element' should be visible
Then 'Page.Element' should be hidden
Then 'Page.Element' should have text 'Expected Text'
Then 'Page.Element' should contain text 'partial text'
Then 'Page.Element' should have value 'input value'
Then 'Page.Element' should be enabled
Then 'Page.Element' should be disabled
Then 'Page.Element' should be checked
Then 'Page.Element' should have 5 items
Then 'Page.Element' should have attribute 'href' with value '/home'
Then the page title should be 'My Page Title'
Then the url should contain 'dashboard'
```

### Data Capture

```gherkin
When I store text of 'Page.Element' as 'myVar'
When I store attribute 'data-id' of 'Page.Element' as 'myVar'
When I get text from 'Page.Element' and store as 'myVar'     # also persists as $$myVar
When I persist '{myVar}' as 'savedVar'                       # saves {myVar} value as $$savedVar
```

### Variable Management

```gherkin
Given I set variable 'username' to 'john_doe'
Then variable 'username' should equal 'john_doe'
Then variable 'token' should exist
When I dump the data store                           # prints all {variables} to report
```

### Test Data Loading

```gherkin
Given I load test data 'users'                       # loads testdata/users.json into DataStore
Given I load test data 'users' as 'userData'         # loads as single keyed object
```

### Screenshots & Dialogs

```gherkin
When I take a screenshot
When I take a screenshot named 'my-screenshot'
When I accept the alert
When I dismiss the dialog
```

### Bulk Operations (DataTable)

```gherkin
When I fill the form:
  | Login.EmailField    | user@test.com |
  | Login.PasswordField | Test@123      |

When I click the following elements:
  | Nav.MenuButton  |
  | Nav.LogoutLink  |
```

---

### API Steps

#### Setup
```gherkin
Given I set the base url to 'https://api.example.com'
Given I set the base url to '{api.baseUrl}'              # reads from framework.properties
Given I set bearer token 'my-token'
Given I set bearer token '{authToken}'                   # from DataStore
Given I set api key 'my-key' in header 'x-api-key'
Given I clear authorization
```

#### Requests
```gherkin
When I send a GET request to '/api/users'
When I send a DELETE request to '/api/users/1'

When I send a GET request to '/api/users' with query params:
  | page     | 2 |
  | per_page | 5 |

When I send a POST request to '/api/login' with body:
  | key      | value      |
  | email    | u@test.com |
  | password | pass123    |

When I send a PUT request to '/api/users/1' with body:
  | key | value |
  | job | Lead  |

When I send a POST request to '/api/data' with JSON:
  """
  {"name": "John", "nested": {"key": "value"}}
  """
```

#### Assertions
```gherkin
Then the response status should be 200
Then the response status should be in range 200 to 299
Then the response header 'content-type' should contain 'application/json'
Then the response should have header 'authorization'
Then the response body field 'data.first_name' should equal 'Janet'
Then the response body field 'message' should contain 'created'
Then the response body field 'token' should exist
Then the response body field 'email' should not be empty
Then the response body field 'results' should be a non-empty array
Then the response body field 'data' should be an array with 6 items
Then the response time should be less than 2000ms
```

#### Capture & Chain
```gherkin
And I store the response body field 'token' as 'authToken'
And I store the response body field 'data.0.id' as 'firstUserId'
And I store the response status as 'statusCode'
Then I print the response                                # logs response to report
```

---

## 10. How a Test Run Flows — End to End

This section traces exactly what happens from `npm test` to a report, step by step.

### Phase 1 — Startup

```
npm test
  └─ runs: cucumber-js (from cucumber.yml)
       │
       ├─ ts-node/register loaded       → TypeScript compilation on-the-fly
       ├─ CustomWorld.ts loaded         → Cucumber World class registered
       ├─ Hooks.ts loaded               → Before/After/BeforeStep/AfterStep registered
       └─ src/steps/**/*.ts loaded      → All step definitions registered
```

### Phase 2 — Feature Discovery

```
Cucumber scans: features/**/*.feature
  └─ Applies tag filter from cucumber.yml
       └─ Picks matching scenarios
```

### Phase 3 — BeforeAll Hook

```
BeforeAll runs once:
  └─ Creates report directories:
       reports/
       reports/html/
       reports/cucumber-json/
       reports/allure-results/
       reports/screenshots/
       reports/videos/
       reports/logs/
       reports/failure-analysis/
```

### Phase 4 — For Each Scenario

#### 4a. Before Hook

```
Before hook:
  ├─ Sets this.scenarioName and this.scenarioTags
  │
  ├─ If scenario has @api only (no @web):
  │     └─ Skips browser launch
  │
  └─ If scenario has @web:
       ├─ ContextManager.launch()
       │     ├─ Reads framework.properties (browser, headless, slowMo)
       │     ├─ Reads environments.json (baseUrl, timeout)
       │     ├─ Launches browser (chromium/firefox/webkit)
       │     ├─ Creates BrowserContext
       │     │     viewport: 1280x720
       │     │     ignoreHTTPSErrors: true
       │     │     recordVideo: reports/videos/ (if enabled)
       │     └─ Opens new Page
       │
       └─ CustomWorld.initActionEngine()
             ├─ Creates ActionEngine(page)
             ├─ Creates SelfHealingEngine(page)    (if selfHealing.enabled=true)
             ├─ Creates VisualTestingEngine(page)
             └─ Creates RootCauseAnalyzer(page)
```

#### 4b. BeforeStep Hook (runs before EVERY step)

```
BeforeStep:
  ├─ Logs step text
  ├─ Records action for RootCauseAnalyzer history
  ├─ Starts step timer
  └─ Clears _stepHealingResults (fresh healing log per step)
```

#### 4c. Step Execution

```
Example: When I click 'TeleConnect.BtnNext'
  │
  ├─ WebSteps.ts matches regex: /^I click ['"](.+)['"]$/
  │
  └─ Calls: this.actionEngine.click('TeleConnect.BtnNext')
       │
       └─ ActionEngine.click()
            │
            ├─ getLocatorWithHealing('TeleConnect.BtnNext', 'click')
            │     │
            │     ├─ getLocator('TeleConnect.BtnNext')
            │     │     └─ ElementResolver.resolve('TeleConnect.BtnNext')
            │     │           ├─ Splits on '.' → pageName='TeleConnect', key='BtnNext'
            │     │           ├─ Checks cache (Map) for 'TeleConnect'
            │     │           ├─ If not cached: reads TeleConnect.properties
            │     │           │     BtnNext=//button[@data-testid='btn-next']
            │     │           └─ Returns: '//button[@data-testid='btn-next']'
            │     │
            │     ├─ buildLocator('//button[@data-testid='btn-next']')
            │     │     └─ Detects XPath (starts with //) → page.locator(xpath)
            │     │
            │     ├─ locator.waitFor({ state: 'visible', timeout: 5000 })
            │     │
            │     │   [SUCCESS PATH]
            │     │   └─ returns locator
            │     │
            │     │   [FAILURE PATH — locator timed out]
            │     │   └─ SelfHealingEngine.findElementWithHealing(...)
            │     │         ├─ Scans DOM for candidates (text, aria, role, placeholder)
            │     │         ├─ Calls OpenAI GPT if selfHealing.useOpenAI=true
            │     │         ├─ Scores candidates by confidence
            │     │         ├─ Returns best match
            │     │         └─ _stepHealingResults.push(healingResult)
            │
            ├─ locator.scrollIntoViewIfNeeded()
            └─ locator.click()
```

#### 4d. AfterStep Hook

```
AfterStep:
  ├─ Records step end time
  │
  ├─ If _stepHealingResults not empty:
  │     └─ Generates self-healing HTML report
  │           (shows original vs healed locator, confidence %, strategy)
  │           └─ Attaches to test report
  │
  └─ If step FAILED:
       ├─ Sets this.testFailed = true
       ├─ Captures full-page screenshot → reports/screenshots/
       ├─ Attaches screenshot to test report
       └─ If RootCauseAnalyzer available:
             ├─ Collects: scenario name, error message, page URL, page title, last actions
             ├─ Calls OpenAI GPT with full context
             └─ Generates RCA HTML report (failure + context + AI analysis + suggested fixes)
                   └─ Attaches to test report
```

#### 4e. After Hook

```
After hook:
  ├─ If scenario FAILED:
  │     ├─ Takes final failure screenshot
  │     └─ Dumps DataStore to report ({variable} state at time of failure)
  │
  ├─ Logs self-healing cache statistics
  │
  ├─ If @visual tag: attaches Visual Testing report
  │
  ├─ Attaches error logs from reports/logs/
  │
  ├─ ContextManager.close(failed)
  │     ├─ Closes Page
  │     ├─ Closes BrowserContext (keeps video if retain-on-failure and test failed)
  │     └─ Closes Browser
  │
  ├─ DataStore.clear()          → wipes {variables}
  ├─ ElementResolver.clearCache() → forces fresh .properties read next scenario
  ├─ SelfHealingEngine.clearCache()
  ├─ RootCauseAnalyzer.clearHistory()
  └─ Writes step timings JSON → reports/allure-results/
```

### Phase 5 — Reports Written

```
Cucumber writes:
  ├─ reports/cucumber-json/cucumber-report.json  (raw data)
  └─ reports/html/cucumber-report.html           (instant HTML view)

After running: npm run report
  └─ GenerateReport.js runs multiple-cucumber-html-reporter
       └─ Richer HTML at reports/html/index.html
```

---

## 11. Component Internals

### `ContextManager.ts` — Browser Lifecycle

Owns the Playwright `Browser`, `BrowserContext`, and `Page`. One instance per scenario.

**`launch()`** — Called in the `Before` hook for `@web` scenarios:
- Reads `browser`, `headless`, `slowMo` from `FrameworkConfig`
- Reads `baseUrl`, `timeout`, `navigationTimeout` from `environments.json`
- Launches the browser with `--no-sandbox`
- Creates a context with: viewport 1280×720, `ignoreHTTPSErrors: true`, video recording config
- Opens a new Page

**`close(testFailed)`** — Called in the `After` hook:
- Takes failure screenshot if `screenshotOnFail=true` and test failed
- Closes page → context → browser
- If `video=retain-on-failure` and test passed, video is discarded on context close

---

### `ElementResolver.ts` — Locator Lookup

Parses `Page.Element` references and maps them to raw locator strings.

- Maintains an in-memory cache (`Map<pageName, Record<key, locator>>`)
- First call per page reads the `.properties` file; subsequent calls use cache
- Cache cleared in `After` hook so each scenario gets a fresh read
- Throws descriptive errors if file or key is not found, listing all available options

---

### `ActionEngine.ts` — All Browser Actions

The only class that calls Playwright directly for UI interactions.

- All actions go through `getLocatorWithHealing()` — never direct `page.locator()`
- `resolveValue()` runs before every `enter`/`type`/`select` — handles `##`, `$$`, `{}`
- `highlightElement()` draws a green outline after successful assertions (visual confirmation)
- `selectOption()` tries label match first, falls back to value match
- `selectComboboxOption()` handles both native `<select>` and custom div-based dropdowns
- `uploadFile()` detects whether target is `<input type="file">` or a custom upload button

---

### `ApiEngine.ts` — HTTP Client

Wraps Axios with BDD-aware features.

- Initialized with a base URL (from `environments.json` or overridden in feature)
- Axios interceptors log every request and response
- Error responses (4xx, 5xx) are **not thrown** — they're resolved so assertions handle them
- `resolveObject()` replaces `{variables}` in request bodies at runtime
- `storeResponse()` saves last response to `DataStore.__lastApiResponse` and `this.lastResponse`
- `tableToObject()` converts Cucumber DataTable rows into JSON request body

---

### `DataStore.ts` — In-Scenario Memory

A static `Map<string, unknown>` scoped to one scenario.

- `set(key, value)` / `get(key)` / `has(key)` / `delete(key)`
- `getOrThrow(key)` — throws with helpful message listing available keys
- `dump()` — returns all entries as a plain object (used for report attachment on failure)
- `clear()` — called in `After` hook to reset between scenarios

---

### `PersistentStore.ts` — Cross-Scenario File Store

Reads/writes `testdata/runtime-store.json`.

- `save(key, value)` — writes to file and updates in-memory cache
- `get(key)` — reads from cache (or file on first access)
- `resolve(value)` — replaces all `$$varName` patterns in a string
- Thread-safe for sequential runs (single process)
- File path: `testdata/runtime-store.json` relative to `process.cwd()`

---

### `RandomDataGenerator.ts` — Fake Data

Wraps `@faker-js/faker`. Maps `##FieldName` tokens to Faker methods.

- `resolve(value)` — replaces all `##FieldName` patterns in a string
- Each call generates a new value (not cached per scenario)
- Supports 20 field types: names, emails, phones, addresses, finance, etc.

---

## 12. AI Self-Healing Engine

### The Problem It Solves

When a UI element changes its `id`, `class`, or `data-testid`, the locator in `.properties` breaks. Normally that's a test failure + manual fix. Self-healing finds the element at runtime without you touching any file.

### How It Works

```
Locator fails to find element within selfHealing.locatorTimeout (5000ms)
  │
  ├─ Heuristic strategies run (always):
  │     ├─ Text content matching
  │     ├─ ARIA label / aria-describedby matching
  │     ├─ Placeholder attribute matching
  │     ├─ Role-based matching (button, input, etc.)
  │     └─ Proximity to neighboring known elements
  │
  └─ If selfHealing.useOpenAI=true:
       ├─ Sends to OpenAI GPT:
       │     - Original locator that failed
       │     - Page HTML snapshot (relevant section)
       │     - Action being attempted (click/enter/assert)
       └─ GPT suggests best locator candidate
  │
  All candidates scored by confidence (0–100%)
  Best candidate selected
  │
  ├─ Element highlighted with green glow
  ├─ Screenshot captured (shows healed element)
  └─ HealingResult stored in _stepHealingResults
```

### What You See in the Report

After a healed step, a card is attached to the scenario in the HTML report:

```
┌─────────────────────────────────────────────────────┐
│  🩹 Self-Healing Activated         [text-match]      │
├─────────────────────────────────────────────────────┤
│  FAILED:  //button[@data-testid='btn-connection']   │
│  HEALED:  //button[contains(text(),'New Connection')]│
├─────────────────────────────────────────────────────┤
│  Confidence: 92%   Strategy: text   Fallbacks: 4    │
└─────────────────────────────────────────────────────┘
```

### Self-Healing Demo in This Project

Feature 1 intentionally breaks a locator via JavaScript injection to demonstrate healing:

```gherkin
# Step 1: Inject JS that changes button's data-testid
When I execute script to change button text
# This changes: data-testid="btn-new-connection" → data-testid="btn-apply-connection"

# Step 2: Try to click using old locator (BtnNewConnection uses btn-connection in properties)
And I click 'TeleConnect.BtnNewConnection'
# Self-healing fires → finds button by text content → heals
```

### Configuring Self-Healing

```properties
# Disable entirely (locator failures throw immediately):
selfHealing.enabled=false

# Use heuristics only, no OpenAI:
selfHealing.useOpenAI=false

# Increase patience before healing triggers:
selfHealing.locatorTimeout=8000

# Attach healing report to test result:
selfHealing.attachReport=true
```

---

## 13. Reporting

### Reports Generated Automatically

| Report | Path | Generated When |
|--------|------|----------------|
| Cucumber HTML | `reports/html/cucumber-report.html` | Every run |
| Cucumber JSON | `reports/cucumber-json/cucumber-report.json` | Every run |
| Allure Results | `reports/allure-results/run-<timestamp>/` | Per run (isolated) |
| Screenshots | `reports/screenshots/` | On failure (or `@visual`) |
| Videos | `reports/videos/` | On failure (retain-on-failure) |
| Logs | `reports/logs/test-run.log` | Every run |
| Step Timings | `reports/allure-results/step-timings-*.json` | Every scenario |

### Inline Report Attachments

Each scenario in the HTML/Allure report can contain:

| Attachment | Trigger | Content |
|-----------|---------|---------|
| Screenshot | Step failure | Full-page PNG |
| Final screenshot | Scenario failure | Full-page PNG at end of scenario |
| Self-healing report | Any healed locator | HTML: original vs healed locator, confidence, strategy |
| Root Cause Analysis | Scenario failure | HTML: AI-generated failure reason + suggested fixes |
| DataStore dump | Scenario failure | JSON: all `{variable}` values at time of failure |
| Visual testing report | `@visual` tag | HTML: summary of visual checks |
| Error logs | Scenario failure | Latest log file content |
| Step timing JSON | Every scenario | Per-step duration data for Allure |

### Generating the Rich HTML Report (Cucumber Multi-Report)

```bash
npm run report
```

Opens `reports/html/index.html` — a dashboard with pass/fail counts, pie charts, scenario list, step details.

---

### Allure Report Setup & Usage

Allure provides a professional test report with timeline, trend charts, category analysis, and detailed step attachments.

#### Pre-requisites — Install Allure CLI

```bash
# Option 1: via npm (recommended — no Java needed)
npm install -g allure-commandline

# Option 2: via Scoop (Windows)
scoop install allure

# Option 3: via Homebrew (macOS)
brew install allure

# Verify installation
allure --version
```

> **Note:** The npm `allure-commandline` package bundles Java internally, so you don't need a separate JDK install.

#### How Allure Reports Work in This Framework

Each test run generates results into a **timestamped subfolder** — no run overwrites another:

```
reports/allure-results/
├── run-2026-07-09_17-15-10/    ← Run 1 (isolated)
│   ├── <uuid>-result.json
│   ├── <uuid>-attachment.png
│   └── history/
├── run-2026-07-09_18-30-22/    ← Run 2 (isolated)
│   ├── <uuid>-result.json
│   └── ...
├── latest-run.txt              ← Points to most recent run
```

#### Allure Commands

| Command | What It Does |
|---------|-------------|
| `npm run allure:generate` | Convert cucumber JSON → Allure results (timestamped folder) |
| `npm run allure:serve` | Generate + open temporary Allure server (latest run only) |
| `npm run allure:open` | Generate + create static HTML report + open in browser |
| `npm run allure:history` | List all previous test runs with timestamps |

#### Typical Workflow

```bash
# 1. Run your tests
npm test
# or: npx cucumber-js -p native --tags "@native and @android"

# 2. Generate Allure results & open the report
npm run allure:serve

# Or generate a static HTML report:
npm run allure:open
```

#### View Previous Runs

```bash
# List all past runs
npm run allure:history

# Serve a specific past run manually
npx allure serve reports/allure-results/run-2026-07-09_17-15-10
```

#### Allure Report Features

- **Dashboard** — pass/fail donut chart, duration stats, environment info
- **Suites** — grouped by Feature → Scenario
- **Timeline** — visualize test execution order and duration
- **Categories** — failure types automatically categorized
- **Trends** — pass/fail trends across multiple runs (via history)
- **Attachments** — screenshots, HTML reports (self-healing, RCA), error logs
- **Tags** — filter by Cucumber tags (`@smoke`, `@native`, etc.)

### Clearing Reports Before a New Run

```bash
npm run clean
# Deletes: reports/ and test-results/
```

---

## 14. Running Tests

### The Correct Directory

Always run from the folder that contains `package.json`:

```
BDD_Playwright-v2.1\     ← cd to HERE first
  package.json
  cucumber.yml
```

```powershell
cd "C:\Users\...\BDD_PlaywrightCore\BDD_Playwright-v2.1"
npm test
```

### NPM Scripts — Complete Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm test` | `cucumber-js` | Run all tests (per cucumber.yml tag filter) |
| `npm run test:native` | `cucumber-js -p native` | Run all native mobile app tests (BrowserStack) |
| `npm run test:native:android` | `native --tags @android` | Run Android native tests only |
| `npm run test:native:ios` | `native --tags @ios` | Run iOS native tests only |
| `npm run test:native:smoke` | `native --tags @smoke` | Run native smoke tests (Android + iOS) |
| `npm run test:accessibility` | `cucumber-js -p accessibility` | Run accessibility audit tests |
| `npm run test:mobile` | `cucumber-js -p mobile` | Run mobile emulation tests |
| `npm run test:cross-browser` | `ts-node CrossBrowserRunner.ts` | Run cross-browser sequential |
| `npm run test:cross-browser:parallel` | Cross-browser parallel mode | Run all browsers simultaneously |
| `npm run test:chromium` | Chromium only | Run tests on Chromium |
| `npm run test:firefox` | Firefox only | Run tests on Firefox |
| `npm run test:webkit` | WebKit only | Run tests on WebKit/Safari |
| `npm run report` | `GenerateReport.js` | Generate Cucumber HTML report |
| `npm run allure:generate` | `GenerateAllureResults.js` | Generate Allure results (timestamped) |
| `npm run allure:serve` | Generate + allure serve | Open Allure report in browser |
| `npm run allure:open` | Generate + allure open | Create static HTML + open |
| `npm run allure:history` | List runs | Show all past Allure runs |
| `npm run clean` | Delete reports/ | Clear all reports and results |

### Run by Tag

```bash
npx cucumber-js --tags "@smoke"
npx cucumber-js --tags "@myapp_login"
npx cucumber-js --tags "@web and @regression"
npx cucumber-js --tags "@api and @smoke"
npx cucumber-js --tags "not @ignore"
npx cucumber-js --tags "@smoke or @e2e"
```

### Run a Single Feature File

```bash
npx cucumber-js features/web/1_teleconnect.feature
npx cucumber-js features/api/teleconnect-order-journey.feature
```

### Change Browser at Runtime

```bash
# Windows PowerShell
$env:BROWSER="firefox"; npm test
$env:BROWSER="webkit"; npm test

# Windows CMD
set BROWSER=firefox & npm test
```

Or change `browser=firefox` in `framework.properties`.

### Run Headless (CI Mode)

```bash
# PowerShell
$env:HEADLESS="true"; npm test
```

Or set `headless=true` in `framework.properties`.

### Dry Run (validate steps without executing)

```bash
npx cucumber-js --dry-run
```

This checks that every step in every feature file has a matching step definition. Zero failures = ready to run.

### Parallel Execution

> **Warning:** The 5 web scenarios in this project must run sequentially because they share `$$OrderId` via PersistentStore. Do not increase `parallel` beyond `1` for the default tag suite.

For independent scenarios without data dependencies, you can increase parallel:
```yaml
# cucumber.yml
parallel: 4
```

### Updating the Default Tag Filter

Edit `cucumber.yml`:

```yaml
tags: "@smoke"                               # run only smoke
tags: "@regression and not @ignore"          # full regression minus skipped
tags: "@myapp_login or @myapp_checkout"      # specific features
```

---

## 15. Project Structure

```
BDD_Playwright-main/
│
├── features/                          ← ALL TESTS LIVE HERE
│   ├── api/
│   │   ├── registeruser_api.feature   # API: register user, persist credentials
│   │   └── teleconnect-order-journey.feature  # API: 14 endpoint scenarios
│   └── web/
│       ├── 1_teleconnect.feature      # Customer: register + 6-step order placement
│       ├── 2_telecrm.feature          # CRM: review & approve order
│       ├── 3_teleinstall.feature      # Install team: schedule + complete installation
│       ├── 4_teleactivate.feature     # Activation team: activate broadband
│       ├── 5_televerify.feature       # Customer: verify ACTIVATED status
│       ├── 6_customersupport.feature  # Customer: raise support ticket
│       └── validate-registered-user.feature  # Hybrid: API register → UI login
│
├── src/
│   ├── config/
│   │   ├── framework.properties       # ★ MAIN CONFIG — browser, URL, timeouts, self-healing
│   │   ├── environments.json          # Per-environment baseUrl / timeouts
│   │   └── FrameworkConfig.ts         # Singleton that reads framework.properties
│   │
│   ├── core/
│   │   ├── ActionEngine.ts            # ★ All Playwright UI actions
│   │   ├── ApiEngine.ts               # ★ All HTTP API calls (Axios wrapper)
│   │   ├── ContextManager.ts          # Browser/context/page lifecycle
│   │   ├── CustomWorld.ts             # Cucumber World — shared state per scenario
│   │   ├── ElementResolver.ts         # 'Page.Element' → locator string
│   │   ├── HealingResult.ts           # Data class for self-healing outcome
│   │   ├── RootCauseAnalyzer.ts       # AI failure analysis on step failure
│   │   ├── SelfHealingEngine.ts       # AI + heuristic broken locator recovery
│   │   └── VisualTestingEngine.ts     # Screenshots + anomaly detection
│   │
│   ├── hooks/
│   │   └── Hooks.ts                   # ★ Before/After/BeforeStep/AfterStep hooks
│   │
│   ├── pages/
│   │   └── properties/                # ★ PAGE OBJECT MODEL — one file per page
│   │       ├── TeleConnect.properties
│   │       ├── TeleCRM.properties
│   │       ├── TeleInstall.properties
│   │       ├── TeleActivate.properties
│   │       ├── TeleVerify.properties
│   │       ├── CustomerSupport.properties
│   │       └── ...
│   │
│   ├── steps/
│   │   ├── WebSteps.ts                # ★ Web BDD step definitions
│   │   ├── ApiSteps.ts                # ★ API BDD step definitions
│   │   ├── CommonSteps.ts             # Shared: variables, data, logging
│   │   └── AdvancedSteps.ts           # Self-healing, visual, RCA steps
│   │
│   └── utils/
│       ├── DataStore.ts               # In-scenario {variable} store
│       ├── PersistentStore.ts         # Cross-scenario $$variable store
│       ├── RandomDataGenerator.ts     # ##FieldName fake data generator
│       ├── ResponseValidator.ts       # API assertion helpers
│       ├── Logger.ts                  # Winston structured logger
│       ├── TestDataLoader.ts          # Load JSON from testdata/
│       ├── TestUserManager.ts         # Test user credential manager
│       ├── PropertiesLoader.ts        # Generic .properties file reader
│       ├── OpenAIClient.ts            # OpenAI API wrapper
│       ├── GenerateReport.js          # HTML report generator
│       └── GenerateAllureResults.js   # Allure results generator
│
├── testdata/
│   ├── runtime-store.json             # ★ Auto-managed $$variable persistence
│   ├── users.json                     # Static test user credentials
│   ├── api.json                       # Static API test payloads
│   └── payloads/                      # Per-endpoint JSON request templates
│       ├── login.json
│       ├── register.json
│       ├── create-order.json
│       ├── schedule-installation.json
│       ├── activate-connection.json
│       └── update-order-status.json
│
├── tests/                             # Vitest unit tests (for framework internals)
│   ├── selfHealing.bugCondition.spec.ts
│   └── selfHealing.preservation.spec.ts
│
├── reports/                           # Auto-generated (git-ignored)
│   ├── html/
│   ├── cucumber-json/
│   ├── allure-results/
│   ├── screenshots/
│   ├── videos/
│   └── logs/
│
├── .env                               # ★ Secrets (OPENAI_API_KEY) — git-ignored
├── .env.example                       # Template for .env
├── cucumber.yml                       # ★ Cucumber config (tags, paths, format)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

> Files marked with ★ are the ones you interact with most as a test author.

---

## 16. Troubleshooting

### `npm ERR! ENOENT: no such file or directory, open 'package.json'`

You're in the wrong directory. Navigate to the inner folder:
```bash
cd "BDD_Playwright-main\BDD_Playwright-main"
npm test
```

---

### `Element not found: "Page.Element" — locator timed out`

1. Check the element name in `.properties` matches exactly what you typed in the feature file
2. Open the app in browser, inspect the element, verify the locator is correct
3. Enable self-healing: `selfHealing.enabled=true` in `framework.properties`
4. Increase timeout: `defaultTimeout=60000`

---

### `Properties file not found: ...MyPage.properties`

You used `'MyPage.Element'` in a feature file but haven't created `src/pages/properties/MyPage.properties` yet. Create the file.

---

### `Element key "BtnXyz" not found in MyPage.properties`

You referenced `'MyPage.BtnXyz'` but the key in `MyPage.properties` is different (maybe `BtnXYZ` or `ButtonXyz`). Check casing — keys are case-sensitive.

---

### `Environment "qa" not found in environments.json`

The `env=qa` setting in `framework.properties` doesn't match any key in `environments.json`. Add `"qa": { ... }` to the JSON or fix the `env` value.

---

### `$$OrderId` is empty or wrong in CRM scenario

The PersistentStore file has stale or missing data. Either:
- Feature 1 hasn't run yet in this session → run the full suite
- The file has old data → delete `testdata/runtime-store.json` and run from Feature 1

---

### `OpenAI API key is invalid` or healing not working

1. Check `OPENAI_API_KEY` is set in `.env`
2. Set `selfHealing.useOpenAI=false` to fall back to heuristic-only mode — tests will still run

---

### Browser opens but closes immediately

Check `defaultTimeout` — it may be too short for a slow app. Increase:
```properties
defaultTimeout=60000
navigationTimeout=120000
```

---

### Tests run too slowly

- Set `slowMo=0` in `framework.properties`
- Set `headless=true`
- Reduce `selfHealing.locatorTimeout=2000` if self-healing is triggering unnecessarily

---

### `Cannot use 'progress-bar' formatter ... not a TTY`

This is a warning, not an error. It means you're piping output (e.g. in CI). The formatter automatically switches to `progress`. Tests run fine.

---

*For further questions, refer to the source files in `src/core/` — each component is well-commented.*


---

## 17. Mobile Device Emulation

### Overview

The framework supports **tag-driven mobile device emulation** — simply tag a scenario with a device name, and the framework automatically launches the browser with that device's emulation profile (viewport, user agent, device scale factor, touch support, orientation).

No step definition changes. No code edits. Just a tag.

### How It Works

```
@device:iPhone14 tag on scenario
        ↓
Before Hook → TagParser extracts device name
        ↓
ContextManager → resolves "iPhone14" → "iPhone 14" device profile
        ↓
MobileEngine.applyDeviceProfile()
  · viewport: 390×844
  · user agent: iPhone UA string
  · deviceScaleFactor: 3
  · hasTouch: true
        ↓
Browser context created with emulation BEFORE first navigation
        ↓
Scenario runs in mobile emulated context
        ↓
After Hook → captures emulation metadata in report
```

### Supported Devices

| Device | Tag | Viewport (portrait) |
|--------|-----|-------------------|
| iPhone 14 | `@device:iPhone14` | 390×844 |
| iPhone SE | `@device:iPhoneSE` | 375×667 |
| Pixel 7 | `@device:Pixel7` | 412×915 |
| Samsung Galaxy S23 | `@device:SamsungGalaxyS23` | 360×780 |
| iPad Pro | `@device:iPadPro` | 1024×1366 |
| iPad Mini | `@device:iPadMini` | 768×1024 |

### Tags

| Tag | Behavior |
|-----|----------|
| `@device:DeviceName` | Emulate the specified device (case-insensitive, spaces removed) |
| `@mobile` | Use the default device from `framework.properties` (`mobile.defaultDevice`) |

### Configuration in `framework.properties`

```properties
# ─── Mobile Configuration ─────────────────────────────────────────────────
mobile.defaultDevice=iPhone 14
mobile.defaultOrientation=portrait        # portrait | landscape
mobile.networkCondition=                  # 2G | 3G | 4G | fast | (empty = no throttling)
```

| Property | Default | Description |
|----------|---------|-------------|
| `mobile.defaultDevice` | `iPhone 14` | Device profile used for `@mobile` tag |
| `mobile.defaultOrientation` | `portrait` | Orientation (landscape swaps width/height) |
| `mobile.networkCondition` | _(empty)_ | Network throttling (Chromium only) |

### Network Throttling

When `mobile.networkCondition` is set to `2G`, `3G`, `4G`, or `fast`, the MobileEngine applies network throttling via CDP. This is **Chromium-only** — on Firefox and WebKit, the throttling is gracefully skipped with a warning log (scenario continues without failure).

### Execution Modes

The `mobile.executionMode` property controls HOW mobile scenarios execute:

| Mode | What Happens | Setup Required |
|------|-------------|----------------|
| `emulation` (default) | Playwright emulates device in desktop browser | None — works out of the box |
| `simulator` | Runs on local iOS Simulator or Android Emulator via Appium | Appium + Xcode/Android SDK |
| `device` | Runs on real physical device via USB + Appium | Appium + device connected via USB |
| `cloud` | Runs on cloud device farm (BrowserStack/LambdaTest/Sauce Labs) | Cloud credentials in .env |

**Quick configuration examples:**

```properties
# Default — emulation (no setup needed)
mobile.executionMode=emulation

# iOS Simulator
mobile.executionMode=simulator
mobile.defaultDevice=iPhone 15

# Real Android device via USB
mobile.executionMode=device
mobile.defaultDevice=Samsung Galaxy S24
realDevice.platform=android

# BrowserStack cloud
mobile.executionMode=cloud
mobile.cloudProvider=browserstack
mobile.defaultDevice=iPhone 15

# Sauce Labs cloud
mobile.executionMode=cloud
mobile.cloudProvider=saucelabs
mobile.defaultDevice=Pixel 8
```

### Example Feature File

```gherkin
@web @mobile_tests
Feature: Mobile Responsive Testing

  @device:iPhone14
  Scenario: Verify mobile menu on iPhone 14
    Given I navigate to the application
    Then 'Mobile.HamburgerMenu' should be visible
    When I click 'Mobile.HamburgerMenu'
    Then 'Mobile.NavDrawer' should be visible

  @mobile
  Scenario: Use default device from configuration
    Given I navigate to the application
    Then 'Mobile.HamburgerMenu' should be visible

  @device:iPadPro
  Scenario: Verify tablet layout on iPad Pro
    Given I navigate to the application
    Then 'Desktop.SideNavigation' should be visible
```

### Error Handling

| Condition | Behavior |
|-----------|----------|
| Unknown device name in `@device:*` tag | Error thrown listing all available devices |
| Multiple `@device:*` tags on one scenario | Error: "Only one @device tag permitted per scenario" |
| `@mobile` without `mobile.defaultDevice` set | Error: "mobile.defaultDevice property is required" |

### Emulation Metadata in Reports

When a mobile scenario completes, the framework captures device metadata in the test report:
- Device name
- Viewport dimensions (width × height)
- Orientation (portrait/landscape)

---

## 18. Accessibility Testing (WCAG Auditing)

### Overview

The framework provides **automated WCAG 2.1 accessibility auditing** triggered by tags. When a scenario is tagged with `@accessibility` or `@a11y`, the AccessibilityEngine automatically audits the page after every navigation action — no manual audit steps required.

### How It Works

```
@accessibility tag on scenario
        ↓
Before Hook → AccessibilityEngine.registerNavigationListener()
        ↓
Every page navigation triggers auto-audit
        ↓
AccessibilityEngine.auditPageWithLevel(wcagLevel)
  · Runs WCAG 2.1 audit on current page
  · Filters by configured level (A, AA, AAA)
  · Classifies violations: critical, serious, moderate, minor
        ↓
Violations checked against thresholds:
  · failOnCritical=true → immediate failure on critical
  · maxViolations=0 → fail if any violations found
        ↓
HTML accessibility report attached to Cucumber output
Cumulative count stored in DataStore (a11yViolationCount)
```

### Tags

| Tag | Behavior |
|-----|----------|
| `@accessibility` | Enable automatic WCAG accessibility auditing |
| `@a11y` | Alias for `@accessibility` |

### Configuration in `framework.properties`

```properties
# ─── Accessibility Configuration ──────────────────────────────────────────
accessibility.enabled=true
accessibility.failOnCritical=true
accessibility.wcagLevel=AA                # A | AA | AAA
accessibility.maxViolations=0             # 0 = fail on any violation
```

| Property | Default | Description |
|----------|---------|-------------|
| `accessibility.enabled` | `true` | Master switch for auto accessibility audits |
| `accessibility.failOnCritical` | `true` | Fail scenario immediately on critical violation |
| `accessibility.wcagLevel` | `AA` | WCAG compliance level to check against |
| `accessibility.maxViolations` | `0` | Threshold — fail if violations exceed this count |

### WCAG Levels

| Level | What's Checked |
|-------|---------------|
| `A` | Level A rules only (minimum conformance) |
| `AA` | Level A + Level AA rules (recommended) |
| `AAA` | Level A + AA + AAA rules (strictest) |

### Severity Classification

Violations are classified into four severity levels:

| Severity | Meaning | Example |
|----------|---------|---------|
| **Critical** | Prevents access entirely | Missing alt text on key images, no keyboard access |
| **Serious** | Significant barrier | Insufficient color contrast, missing form labels |
| **Moderate** | Some difficulty | Missing heading hierarchy, redundant links |
| **Minor** | Minor inconvenience | Best practice violations |

### Behavior

- **`failOnCritical=true`**: Scenario fails immediately upon detecting any critical violation
- **`failOnCritical=false`**: Violations logged as warnings, report attached, scenario continues
- **`maxViolations` threshold**: Scenario fails if cumulative violation count exceeds this value
- **10-second timeout**: If audit exceeds 10 seconds, it is aborted and scenario continues (no failure)
- **`accessibility.enabled=false`**: Auto audits are skipped, but manual audit steps still work

### Mobile-Specific Accessibility Checks

When a scenario is tagged with **both** `@accessibility` and `@mobile` (or `@device:*`), additional mobile-specific WCAG checks are performed:

| Check | Rule | Threshold |
|-------|------|-----------|
| Touch target size | All interactive elements must be tappable | ≥ 44×44 CSS pixels |
| Content reflow | No horizontal scrolling at mobile width | scrollWidth ≤ viewportWidth |

### Example Feature File

```gherkin
@web @accessibility_tests
Feature: WCAG Accessibility Compliance

  @accessibility
  Scenario: Verify login page accessibility
    Given I navigate to the application
    # Auto-audit runs after navigation
    Then 'Login.EmailField' should be visible
    # No manual audit step needed — it's automatic

  @a11y @device:iPhone14
  Scenario: Mobile accessibility — touch targets
    Given I navigate to the application
    # Auto-audit includes mobile-specific checks:
    #   - Touch target size ≥ 44x44px
    #   - No horizontal scrolling

  @accessibility
  Scenario: Verify dashboard accessibility at AAA level
    Given I navigate to the application
    When I enter 'user@test.com' into 'Login.EmailField'
    And I enter 'password' into 'Login.PasswordField'
    And I click 'Login.SubmitButton'
    # Auto-audit on every navigation, report attached
```

### Accessibility Report

After each audit, an HTML accessibility report is auto-attached to the Cucumber output containing:
- Total violations by severity
- WCAG level tested
- Viewport dimensions and device profile (if mobile)
- Individual violation details with element references
- Remediation suggestions

The cumulative violation count is tracked in DataStore as `{a11yViolationCount}` for use in assertion steps.

---

## 19. Cross-Browser Testing

### Overview

The framework supports **advanced cross-browser testing** controlled by a single `browsers` property in `framework.properties`. The `CrossBrowserRunner` orchestrates execution across Chromium, Firefox, and WebKit with per-browser `RetryManager` instances, execution timeouts, and output isolation. Results are consolidated into a matrix HTML report with trend analysis.

### How It Works

```
framework.properties: browsers=chromium,firefox,webkit
        ↓
CrossBrowserRunner entry point (npm run test:cross-browser)
        ↓
RetryManager wraps each browser execution (exponential backoff)
        ↓
CrossBrowserManager orchestrates execution:
  · Sequential: run suite on chromium → firefox → webkit (in order)
  · Parallel: run all browsers concurrently (crossBrowser.parallel=true)
        ↓
Per-browser child process:
  · CROSS_BROWSER_TARGET env var set → Hooks detect browser context
  · ArtifactPathResolver namespaces screenshots/videos/logs per browser
  · Browser-specific config applied (viewport, headless, args)
  · Browser filter tags evaluated (@chromium-only, @skip-firefox, @browsers:chromium,firefox)
  · Per-browser execution timeout enforced (kills process if exceeded)
  · Isolated report output directory in parallel mode
        ↓
Results collected per browser
        ↓
CrossBrowserReportGenerator produces:
  · Cross-browser matrix HTML report with trend analysis
  · History persistence (reports/cross-browser/history.json)
  · Persistent issue detection across runs
  · Output: reports/cross-browser/cross-browser-report.html
        ↓
ReportLinker injects banner into main Cucumber HTML report
        ↓
CLI summary table with color-coded output printed to terminal
```

### Configuration in `framework.properties`

```properties
# ─── Cross-Browser Configuration ─────────────────────────────────────────
# Single property controls everything — comma-separated browser engines
browsers=chromium,firefox,webkit
crossBrowser.parallel=true                 # true = run browsers concurrently
crossBrowser.maxParallel=3                 # max concurrent browser instances (1-10)

# ─── Browser-Specific Overrides ───────────────────────────────────────────
browser.chromium.viewport=1280x720
browser.chromium.headless=false
browser.chromium.args=--no-sandbox,--disable-setuid-sandbox

browser.firefox.viewport=1280x720
browser.firefox.headless=false
browser.firefox.args=

browser.webkit.viewport=1280x720
browser.webkit.headless=false
browser.webkit.args=
```

| Property | Default | Description |
|----------|---------|-------------|
| `browsers` | `chromium` | Comma-separated list of browser engines. Controls all cross-browser behavior. |
| `crossBrowser.parallel` | `false` | Run browsers in parallel with output isolation |
| `crossBrowser.maxParallel` | `3` | Max concurrent browser instances (clamped 1–10) |
| `browser.<name>.viewport` | `1280x720` | Browser-specific viewport (`WIDTHxHEIGHT`) |
| `browser.<name>.headless` | `false` | Browser-specific headless mode |
| `browser.<name>.args` | _(empty)_ | Browser-specific launch arguments |

### Browser Filter Tags

Control which scenarios run on which browsers:

| Tag | Effect |
|-----|--------|
| `@chromium-only` | Run only on Chromium |
| `@firefox-only` | Run only on Firefox |
| `@webkit-only` | Run only on WebKit |
| `@skip-chromium` | Skip on Chromium, run on others |
| `@skip-firefox` | Skip on Firefox, run on others |
| `@skip-webkit` | Skip on WebKit, run on others |
| `@browsers:chromium,firefox` | Run only on the listed browsers (flexible multi-browser filter) |
| _(no browser tag)_ | Run on all configured browsers |

### NPM Scripts

```bash
# Run cross-browser suite (all browsers in framework.properties)
npm run test:cross-browser

# Run cross-browser with parallel execution
npm run test:cross-browser:parallel

# Run on a single specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Consolidated Cross-Browser Report

After a multi-browser run, a consolidated HTML matrix report is generated at:

```
reports/cross-browser/cross-browser-report.html
```

The report contains:
- **Matrix view**: Scenarios as rows, browsers as columns (passed/failed/skipped per cell)
- **Browser-specific failures**: Highlighted rows where a scenario passes on one browser but fails on another
- **Per-browser statistics**: Total, passed, failed, skipped, pass rate (%)
- **Trend analysis section**: Historical pass rates over time with sparkline charts
- **Persistent issue detection**: Scenarios that fail repeatedly across runs
- **Drill-down links**: Links to individual browser Cucumber reports
- **Report linking**: A fixed banner is injected into the main Cucumber HTML report linking to the matrix report
- **Run metadata**: Timestamp (ISO 8601) and browser list

### CLI Summary Table

After cross-browser execution completes, a color-coded summary table is printed to the terminal:

```
═══════════════════════════════════════════════════════════════════
  Cross-Browser Execution Summary
═══════════════════════════════════════════════════════════════════

  Browser     │ Total │ Passed │ Failed │ Skipped │ Pass Rate
  ────────────┼───────┼────────┼────────┼─────────┼──────────
  chromium    │   14  │    14  │     0  │       0 │   100.0%  (green)
  firefox     │   14  │    12  │     2  │       0 │    85.7%  (red)
  webkit      │   13  │    13  │     0  │       1 │   100.0%  (green)

  ⚠ Browser-Specific Failures Detected:
    • Checkout flow (fails on Firefox only)

  Total execution time: 45.23s
  HTML report: reports/cross-browser/cross-browser-report.html

  ✗ 2 scenario(s) failed across 3 browser(s)
═══════════════════════════════════════════════════════════════════
```

### Example Feature File

```gherkin
@web @cross_browser_tests
Feature: Cross-Browser Compatibility

  Scenario: Login works on all browsers
    Given I navigate to the application
    When I enter 'user@test.com' into 'Login.EmailField'
    And I click 'Login.SubmitButton'
    Then 'Dashboard.WelcomeHeading' should be visible

  @chromium-only
  Scenario: Chrome-specific extension test
    Given I navigate to the application
    # This only runs on Chromium

  @skip-webkit
  Scenario: Feature not supported on Safari
    Given I navigate to the application
    # Runs on Chromium and Firefox, skipped on WebKit

  @browsers:chromium,firefox
  Scenario: Multi-browser filter example
    Given I navigate to the application
    # Runs only on Chromium and Firefox
```

### Error Handling

| Condition | Behavior |
|-----------|----------|
| Browser binary not installed | RetryManager retries with exponential backoff, then marks "skipped" |
| All browsers fail to launch | Test run terminated with error report |
| Invalid browser name in `browsers` list | Invalid entry skipped with warning, valid entries continue |
| Conflicting filter tags (e.g., `@chromium-only` + `@firefox-only`) | Scenario rejected with error, skipped on all browsers |
| Per-browser execution timeout exceeded | Child process killed, scenarios recorded as "not_executed" with timeout message |
| `browsers` empty after filtering | Falls back to single `browser` property |
| `crossBrowser.maxParallel` out of range | Clamped to [1, 10] |

### Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `CrossBrowserRunner` | `src/core/CrossBrowserRunner.ts` | Entry point: orchestrates execution, CLI summary, report linking |
| `CrossBrowserManager` | `src/core/CrossBrowserManager.ts` | Multi-browser execution (sequential/parallel) |
| `RetryManager` | `src/core/RetryManager.ts` | Per-browser retry with exponential backoff |
| `ArtifactPathResolver` | `src/core/ArtifactPathResolver.ts` | Browser-namespaced screenshots/videos/logs |
| `CrossBrowserReportGenerator` | `src/core/CrossBrowserReportGenerator.ts` | Matrix HTML report with trend analysis |
| `ReportLinker` | `src/core/ReportLinker.ts` | Injects cross-browser link banner into main report |
| `TagParser` | `src/core/TagParser.ts` | Parse browser filter tags (@chromium-only, @skip-*, @browsers:*) |

---

## 20. Enhanced Tags Reference

### Complete Tag Table

| Tag | Category | Effect |
|-----|----------|--------|
| `@web` | Layer | Launch browser |
| `@api` | Layer | No browser (API-only) |
| `@smoke` | Suite | Smoke test filter |
| `@e2e` | Suite | End-to-end filter |
| `@regression` | Suite | Regression filter |
| `@negative` | Suite | Error/invalid path tests |
| `@negative-testing` | Suite | Alias for `@negative` — error/validation/invalid-path scenarios |
| `@ignore` | Control | Skip scenario |
| `@visual` | Feature | Enable visual testing |
| `@device:iPhone14` | Mobile | Emulate iPhone 14 |
| `@device:iPhoneSE` | Mobile | Emulate iPhone SE |
| `@device:Pixel7` | Mobile | Emulate Pixel 7 |
| `@device:SamsungGalaxyS23` | Mobile | Emulate Samsung Galaxy S23 |
| `@device:iPadPro` | Mobile | Emulate iPad Pro |
| `@device:iPadMini` | Mobile | Emulate iPad Mini |
| `@mobile` | Mobile | Use default device from config |
| `@accessibility` | Accessibility | Enable auto WCAG auditing |
| `@a11y` | Accessibility | Alias for @accessibility |
| `@chromium-only` | Cross-Browser | Run only on Chromium |
| `@firefox-only` | Cross-Browser | Run only on Firefox |
| `@webkit-only` | Cross-Browser | Run only on WebKit |
| `@skip-chromium` | Cross-Browser | Skip on Chromium |
| `@skip-firefox` | Cross-Browser | Skip on Firefox |
| `@skip-webkit` | Cross-Browser | Skip on WebKit |

### Tag Combinations

Tags can be combined to activate multiple capabilities:

```gherkin
# Mobile + Accessibility — triggers mobile-specific a11y checks
@device:iPhone14 @accessibility
Scenario: Mobile accessibility audit on iPhone

# Mobile + Cross-Browser — runs mobile emulation on each browser
@mobile @skip-webkit
Scenario: Mobile test on Chromium and Firefox only

# All three combined
@device:Pixel7 @a11y @skip-webkit
Scenario: Full mobile accessibility on Chromium and Firefox
```


---

## 21. Real Device Testing

The framework supports testing on real physical devices via local Appium or cloud device farms (BrowserStack, LambdaTest). When enabled, real device testing takes precedence over emulation mode.

### Prerequisites

#### Local Appium (iOS)
- macOS with Xcode installed
- iOS Simulator or a physical iOS device connected via USB
- Appium installed: `npm install -g appium`
- XCUITest driver: `appium driver install xcuitest`
- WebDriverAgent configured for your device

#### Local Appium (Android)
- Android SDK installed with `ANDROID_HOME` set
- ADB accessible in PATH
- Physical device connected via USB with USB debugging enabled (or emulator running)
- Appium installed: `npm install -g appium`
- UiAutomator2 driver: `appium driver install uiautomator2`

#### Cloud (BrowserStack / LambdaTest)
- An active account with the respective provider
- Credentials stored in `.env` file

### Configuration

#### framework.properties

```properties
# ─── Real Device Testing ──────────────────────────────────────────────────────
realDevice.enabled=true
realDevice.provider=browserstack        # local | browserstack | lambdatest
realDevice.platform=ios                 # ios | android
realDevice.deviceName=iPhone 15         # Must match provider's device catalog
realDevice.osVersion=17                 # OS version
realDevice.browser=safari               # safari (iOS) | chrome (Android)
realDevice.appiumServer=http://localhost:4723   # local mode only
```

#### .env (credentials for cloud providers)

```env
# BrowserStack
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key

# LambdaTest
LAMBDATEST_USERNAME=your_username
LAMBDATEST_ACCESS_KEY=your_access_key
```

### Provider-Specific Setup

#### Local Appium

1. Start Appium server: `appium`
2. Connect your device (or start simulator/emulator)
3. Configure `framework.properties`:
   ```properties
   realDevice.enabled=true
   realDevice.provider=local
   realDevice.platform=android
   realDevice.deviceName=Pixel 8
   realDevice.osVersion=14
   realDevice.browser=chrome
   ```
4. Run tests normally: `npm test`

#### BrowserStack

1. Set credentials in `.env`
2. Configure `framework.properties`:
   ```properties
   realDevice.enabled=true
   realDevice.provider=browserstack
   realDevice.platform=ios
   realDevice.deviceName=iPhone 15
   realDevice.osVersion=17
   realDevice.browser=safari
   ```
3. Run tests: `npm test`

#### LambdaTest

1. Set credentials in `.env`
2. Configure `framework.properties`:
   ```properties
   realDevice.enabled=true
   realDevice.provider=lambdatest
   realDevice.platform=android
   realDevice.deviceName=Samsung Galaxy S24
   realDevice.osVersion=14
   realDevice.browser=chrome
   ```
3. Run tests: `npm test`

### Supported Devices (Examples)

| Provider | Platform | Device | OS Version |
|----------|----------|--------|-----------|
| BrowserStack | iOS | iPhone 15, iPhone 14, iPhone SE | 17, 16 |
| BrowserStack | Android | Samsung Galaxy S24, Pixel 8, OnePlus 12 | 14, 13 |
| LambdaTest | iOS | iPhone 15 Pro, iPhone 14, iPad Pro | 17, 16 |
| LambdaTest | Android | Samsung Galaxy S24, Pixel 8, Galaxy A54 | 14, 13 |
| Local | iOS | Any device connected to Mac | Any |
| Local | Android | Any device connected via ADB | Any |

### How It Works

1. When `realDevice.enabled=true`, the Before hook skips normal browser launch
2. The `RealDeviceEngine` connects to the device via the configured provider
3. A WebSocket endpoint is obtained (CDP for Chromium, WebKit inspector for Safari)
4. Playwright connects to the remote browser via `connectOverCDP()`
5. All existing step definitions work unchanged on the real device
6. After the scenario, the device session is cleaned up automatically

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Cucumber Hooks (Before)                                  │
│  ├── realDevice.enabled = true?                           │
│  │   └── RealDeviceEngine                                │
│  │       ├── Local? → AppiumConnector → Appium Server    │
│  │       ├── BrowserStack? → CloudDeviceConnector → WSS  │
│  │       └── LambdaTest? → CloudDeviceConnector → WSS    │
│  │                                                        │
│  │   Playwright.connectOverCDP(wsEndpoint)                │
│  │       → Remote Browser on Real Device                  │
│  │                                                        │
│  └── realDevice.enabled = false?                          │
│      └── Normal launch flow (emulation or standard)       │
└──────────────────────────────────────────────────────────┘
```

### Notes

- Real device mode is **mutually exclusive** with emulation mode — real device always takes precedence
- When `realDevice.enabled=false` (default), the framework works exactly as before
- All real device modules use dynamic `import()` to avoid failures when Appium dependencies aren't installed
- Device metadata is automatically attached to test reports
- Cloud sessions are billed by the provider per minute of usage


---

## 22. Native App Testing

The framework supports testing native Android (.apk) and iOS (.ipa/.app) applications using Appium. This goes beyond mobile web browser testing — you can interact with native UI elements, perform gestures, and validate native app behavior using the same BDD approach.

### Prerequisites

- **Appium Server** (v2.x recommended): `npm install -g appium`
- **Android**: Android SDK, ADB, UiAutomator2 driver (`appium driver install uiautomator2`)
- **iOS**: Xcode, XCUITest driver (`appium driver install xcuitest`), Mac required
- **Appium Inspector** (optional): For finding element locators — https://inspector.appiumpro.com

### Configuration

Add native app settings in `src/config/framework.properties`:

```properties
# ─── Native App Testing ───────────────────────────────────────────────────────
nativeApp.enabled=false
nativeApp.appiumServer=http://localhost:4723
nativeApp.platform=android              # android | ios
nativeApp.appPath=/path/to/app.apk      # .apk (Android) or .ipa/.app (iOS)
nativeApp.appPackage=com.myapp          # Android only
nativeApp.appActivity=.MainActivity     # Android only
nativeApp.bundleId=com.myapp.ios        # iOS only
nativeApp.autoGrantPermissions=true     # Android only
nativeApp.fullReset=false
nativeApp.noReset=true
```

### How It Works

1. Tag scenarios with `@native` (and optionally `@android` or `@ios`)
2. The Before hook detects `@native` and skips browser launch entirely
3. A `NativeAppEngine` session is created via Appium's WebDriver REST API
4. Step definitions use `NativeElementResolver` to resolve locators from `.properties` files
5. After the scenario, the Appium session is cleaned up automatically

### Locator Strategies

#### Android Locators

| Prefix | Appium Strategy | Example | Best For |
|--------|----------------|---------|----------|
| `id:` | `id` | `id:com.app:id/btn_login` | Resource IDs (most common) |
| `accessibilityId:` | `accessibility id` | `accessibilityId:Login Button` | content-description (cross-platform) |
| `uiautomator:` | `-android uiautomator` | `uiautomator:new UiSelector().text("Sign In")` | Complex queries |
| `xpath:` | `xpath` | `xpath://android.widget.Button[@text='OK']` | Fallback |
| `class:` | `class name` | `class:android.widget.EditText` | By widget type |
| (no prefix) | `accessibility id` | `Login Button` | Default (most portable) |

#### iOS Locators

| Prefix | Appium Strategy | Example | Best For |
|--------|----------------|---------|----------|
| `accessibilityId:` | `accessibility id` | `accessibilityId:login_button` | accessibilityIdentifier (RECOMMENDED) |
| `iosPredicate:` | `-ios predicate string` | `iosPredicate:label == "Sign In"` | NSPredicate queries |
| `iosClassChain:` | `-ios class chain` | `iosClassChain:**/XCUIElementTypeButton[1]` | Structured hierarchy |
| `xpath:` | `xpath` | `xpath://XCUIElementTypeButton[@name='OK']` | Fallback (slower) |
| `class:` | `class name` | `class:XCUIElementTypeTextField` | By UIKit type |
| `name:` | `name` | `name:Submit` | Accessibility label |
| (no prefix) | `accessibility id` | `login_button` | Default (most portable) |

### Properties File Format

Create platform-specific properties files in `src/pages/properties/`:

**NativeAndroid.properties:**
```properties
InputEmail=id:com.myapp:id/input_email
InputPassword=id:com.myapp:id/input_password
BtnLogin=accessibilityId:Login Button
BtnLoginByText=uiautomator:new UiSelector().text("Sign In")
```

**NativeIOS.properties:**
```properties
InputEmail=accessibilityId:email_input
InputPassword=accessibilityId:password_input
BtnLogin=accessibilityId:login_button
BtnByLabel=iosPredicate:label == "Sign In" AND type == "XCUIElementTypeButton"
```

### Writing Feature Files

```gherkin
@native @android
Feature: Native Android Login

  Background:
    Given I launch the app

  Scenario: Successful login
    When I enter 'user@test.com' into native 'NativeAndroid.InputEmail'
    And I enter 'password123' into native 'NativeAndroid.InputPassword'
    And I tap 'NativeAndroid.BtnLogin'
    Then native 'NativeAndroid.WelcomeHeading' should be visible
```

### Available Step Definitions

#### App Lifecycle
```gherkin
Given I launch the app
Given I close the app
Given I reset the app
```

#### Interactions
```gherkin
When I tap 'Page.Element'
When I tap on text 'Sign In'
When I enter 'value' into native 'Page.Element'
When I clear native 'Page.Element'
When I long press 'Page.Element'
```

#### Gestures
```gherkin
When I swipe 'up'
When I swipe 'left' on 'Page.Element'
When I scroll 'down'
When I scroll 'down' until 'Page.Element' is visible
```

#### Assertions
```gherkin
Then native 'Page.Element' should be visible
Then native 'Page.Element' should not be visible
Then native 'Page.Element' should have text 'expected'
Then native 'Page.Element' should contain text 'partial'
Then native 'Page.Element' should be enabled
Then native 'Page.Element' should be disabled
```

#### Data Capture
```gherkin
When I store text of native 'Page.Element' as 'myVariable'
```

#### Navigation & Utilities
```gherkin
When I press back                    # Android only
When I hide the keyboard
When I accept the native alert
When I dismiss the native alert
```

#### Context Switching (Hybrid Apps)
```gherkin
When I switch to webview context     # For hybrid apps with WebView
When I switch to native context      # Switch back to native
```

### Running Native App Tests

#### NPM Scripts (recommended)

```bash
# Run ALL native tests (Android + iOS on BrowserStack)
npm run test:native

# Run only Android native tests
npm run test:native:android

# Run only iOS native tests
npm run test:native:ios

# Run native smoke tests only
npm run test:native:smoke
```

#### Direct CLI (with tag filters)

```bash
# All native tests
npx cucumber-js -p native

# Android smoke tests
npx cucumber-js -p native --tags "@native and @android and @smoke"

# Specific scenario by name
npx cucumber-js -p native --tags "@native and @android" --name "Successful login"

# Specific feature file
npx cucumber-js -p native features/native/android_login.feature

# Negative test scenarios
npx cucumber-js -p native --tags "@native and @negative"

# Checkout flow
npx cucumber-js -p native --tags "@native and @checkout"
```

#### BrowserStack Cloud Setup

To run native app tests on **BrowserStack** (no local device/emulator needed):

**1. Set credentials in `.env`:**
```
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

**2. Upload your app to BrowserStack:**
```bash
# Upload Android APK
curl.exe -u "username:key" -X POST "https://api-cloud.browserstack.com/app-automate/upload" -F "file=@path/to/app.apk"

# Upload iOS IPA
curl.exe -u "username:key" -X POST "https://api-cloud.browserstack.com/app-automate/upload" -F "file=@path/to/app.ipa"

# Response: {"app_url":"bs://a31cede05f9d9bafcd6aae57dec442e8d368eb96"}
```

**3. Configure `framework.properties`:**
```properties
nativeApp.enabled=true
nativeApp.appiumServer=https://hub-cloud.browserstack.com/wd/hub
nativeApp.platform=android
nativeApp.appPath=bs://a31cede05f9d9bafcd6aae57dec442e8d368eb96
```

**4. Run:**
```bash
npm run test:native:android
```

> **Note:** On Windows PowerShell, use `curl.exe` (not `curl` which aliases to `Invoke-WebRequest`).

#### Local Appium Setup (without BrowserStack)

```bash
# Start Appium server first
appium

# Then run tests pointing to local server
# In framework.properties:
#   nativeApp.appiumServer=http://localhost:4723
#   nativeApp.appPath=/path/to/local/app.apk

npm run test:native:android
```

#### LambdaTest Cloud Setup

To run native app tests on **LambdaTest**:

**1. Set credentials in `.env`:**
```
LAMBDATEST_USERNAME=your_lambdatest_username
LAMBDATEST_ACCESS_KEY=your_lambdatest_access_key
```

**2. Upload your app to LambdaTest:**
```bash
# Upload Android APK
curl.exe -u "username:key" -X POST "https://manual-api.lambdatest.com/app/upload/realDevice" -F "appFile=@path/to/app.apk" -F "name=demo-app"

# Upload iOS IPA
curl.exe -u "username:key" -X POST "https://manual-api.lambdatest.com/app/upload/realDevice" -F "appFile=@path/to/app.ipa" -F "name=demo-app"

# Response: {"app_url":"lt://APP10160XXXXXXX","app_id":"APP10160XXXXXXX",...}
```

**3. Set app URLs in `.env`:**
```
LAMBDATEST_ANDROID_APP_URL=lt://APP10160XXXXXXX
LAMBDATEST_IOS_APP_URL=lt://APP10160XXXXXXX
```

**4. Switch to LambdaTest in `framework.properties`:**
```properties
nativeApp.appiumServer=https://mobile-hub.lambdatest.com/wd/hub
```

**5. Run:**
```bash
npm run test:native:android
npm run test:native:ios
```

#### Switching Between Cloud Providers

Just change `nativeApp.appiumServer` in `framework.properties`:

| Provider | Appium Server URL |
|----------|-------------------|
| Local Appium | `http://localhost:4723` |
| BrowserStack | `https://hub-cloud.browserstack.com/wd/hub` |
| LambdaTest | `https://mobile-hub.lambdatest.com/wd/hub` |

The framework auto-detects the provider from the URL and applies the correct capability format and credentials from `.env`.

### Hybrid App Support

For apps that contain WebView components, you can switch between native and web contexts:

```gherkin
@native @android @hybrid
Scenario: Interact with WebView in hybrid app
  Given I launch the app
  When I tap 'NativeAndroid.BtnOpenWebView'
  And I switch to webview context
  # Now you can use web-like assertions if needed
  And I switch to native context
  Then native 'NativeAndroid.NativeElement' should be visible
```

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Cucumber Hooks (Before)                                          │
│  ├── @native tag detected?                                        │
│  │   └── NativeAppEngine                                         │
│  │       ├── createSession() → Appium Server (HTTP REST)          │
│  │       ├── Platform capabilities (Android/iOS)                  │
│  │       └── No browser launched — pure native interaction        │
│  │                                                                │
│  NativeAppSteps                                                   │
│  ├── NativeElementResolver.resolve('Page.Key')                    │
│  │   └── Reads .properties file → { strategy, value }            │
│  ├── NativeAppEngine.findElement(strategy, value)                 │
│  │   └── POST /session/{id}/element                              │
│  └── NativeAppEngine.tap/sendKeys/getText/etc.                    │
│      └── Appium WebDriver REST API (native fetch)                │
└──────────────────────────────────────────────────────────────────┘
```

### Finding Locators (Tips)

**Android:**
- Use **Appium Inspector** connected to your device/emulator
- Run `adb shell uiautomator dump /dev/tty` for the view hierarchy XML
- Use Android Studio Layout Inspector
- Prefer `resource-id` (most stable) → `content-description` → `xpath`

**iOS:**
- Use **Appium Inspector** connected to your simulator/device
- Use Xcode **Accessibility Inspector**
- Use `po print(app.debugDescription)` in Xcode LLDB console
- Prefer `accessibilityIdentifier` → `NSPredicate` → `class chain` → `xpath`

### Notes

- Native app testing is **mutually exclusive** with web browser testing within a single scenario
- The `@native` tag skips all browser-related hooks and engines
- No new npm dependencies are introduced — uses native `fetch()` for all Appium REST calls
- The same `##token` and `{variable}` systems work in native app steps
- Screenshots on failure are automatically captured and attached to reports

---

## 23. Cross-Browser Enhancement (v1.1)

This section documents the **v1.1 cross-browser enhancement** that significantly upgraded the framework's multi-browser capabilities with retry resilience, execution timeouts, artifact isolation, trend reporting, and improved developer experience.

### What Changed from v1.0

| Aspect | v1.0 | v1.1 |
|--------|------|------|
| Configuration | Separate `browser` and `browsers` properties | Single `browsers` property controls everything |
| Retry handling | None — failures immediate | `RetryManager` with configurable exponential backoff per browser |
| Execution timeouts | Global timeout only | Per-browser execution timeout with process termination |
| Parallel isolation | Shared report directories | Separate report/screenshot/video/log directories per browser |
| Reporting | Basic matrix table | Full matrix report with trend analysis, persistent issue detection, history |
| Report linking | Manual navigation | `ReportLinker` auto-injects banner into main Cucumber report |
| CLI output | Plain text pass/fail | Color-coded summary table with browser-specific failure detection |
| Artifact paths | Flat structure (overwrites) | `ArtifactPathResolver` namespaces by browser |
| npm scripts | Single entry point | 6 dedicated scripts for cross-browser workflows |
| Filter tags | `@chromium-only`, `@skip-*` | Added `@browsers:chromium,firefox` flexible multi-browser filter |

### Single `browsers` Property

The `browsers` property in `framework.properties` is the single source of truth for all cross-browser behavior:

```properties
# Run on all three engines:
browsers=chromium,firefox,webkit

# Run on Chromium and Firefox only:
browsers=chromium,firefox

# Single browser (no cross-browser orchestration):
browsers=chromium
```

When only one browser is listed, `CrossBrowserRunner` skips orchestration entirely and runs the suite normally. When multiple browsers are listed, full cross-browser execution activates.

### RetryManager — Per-Browser Resilience

Each browser execution is wrapped in a `RetryManager` instance with exponential backoff:

```
Attempt 1: execute on firefox
  → failure (e.g., browser launch error)
Delay: retryDelay × 2^0 = 1000ms
Attempt 2: execute on firefox
  → failure
Delay: retryDelay × 2^1 = 2000ms
Attempt 3: execute on firefox
  → success ✓
```

**Configuration:**
- `retryCount` in `framework.properties` controls max retries (default: 2)
- Only launch failures trigger retry by default (`retryOnlyOnLaunchFailure: true`)
- Exponential backoff prevents thundering herd in parallel mode

### Per-Browser Execution Timeouts

Each browser's test suite has an enforced execution timeout (default: 5 minutes). If exceeded:

1. Child process is killed (`SIGTERM`)
2. All pending scenarios are recorded as `not_executed` with a timeout error message
3. Results are still included in the matrix report (marked as timeout)
4. Other browsers continue unaffected

### Parallel Execution with Output Isolation

When `crossBrowser.parallel=true`, each browser runs in its own child process with completely isolated output:

```
reports/
├── chromium-1719849600000/      ← Isolated output for Chromium
│   ├── cucumber-json/
│   ├── screenshots/
│   ├── videos/
│   └── logs/
├── firefox-1719849600000/       ← Isolated output for Firefox
│   ├── cucumber-json/
│   ├── screenshots/
│   ├── videos/
│   └── logs/
└── cross-browser/
    └── cross-browser-report.html  ← Consolidated matrix report
```

Environment variables per child process:
- `CROSS_BROWSER_TARGET` — the browser engine name
- `CROSS_BROWSER_VIEWPORT` — viewport as `WIDTHxHEIGHT`
- `CROSS_BROWSER_HEADLESS` — `"true"` or `"false"`
- `CROSS_BROWSER_ARGS` — comma-separated launch args
- `CROSS_BROWSER_OUTPUT_DIR` — isolated output directory (parallel mode)
- `CROSS_BROWSER_PARALLEL_MODE` — `"true"` when running in parallel

After all browsers complete, `mergeParallelReports()` consolidates JSON results for the matrix report generator.

### ArtifactPathResolver — Browser-Namespaced Artifacts

`ArtifactPathResolver` ensures screenshots, videos, and logs don't overwrite each other across browsers:

```typescript
// Normal mode (single browser):
ArtifactPathResolver.resolve('screenshots', 'login-failure.png')
// → 'reports/screenshots/login-failure.png'

// Cross-browser mode (CROSS_BROWSER_TARGET=firefox):
ArtifactPathResolver.resolve('screenshots', 'login-failure.png')
// → 'reports/screenshots/firefox/login-failure.png'
```

The resolver automatically detects cross-browser mode via `CROSS_BROWSER_TARGET` environment variable and creates the namespaced directory structure.

### Browser Filter Tag: `@browsers:chromium,firefox`

In addition to the existing `@chromium-only` and `@skip-*` tags, v1.1 adds a flexible multi-browser filter:

```gherkin
@browsers:chromium,firefox
Scenario: Runs only on Chromium and Firefox
  Given I navigate to the application
  # This scenario is skipped on WebKit
```

This is more concise than combining multiple `@skip-*` tags when you want to target specific browsers.

### Cross-Browser Matrix Report with Trend Analysis

The enhanced report at `reports/cross-browser/cross-browser-report.html` includes:

**Matrix View:**
- Scenarios as rows, browsers as columns
- Color-coded cells: green (pass), red (fail), yellow (skip), grey (not executed/timeout)
- Browser-specific failures highlighted with visual indicator

**Trend Analysis Section:**
- Historical pass rates per browser over recent runs
- Sparkline charts showing rate trends
- Comparison across time windows

**Persistent Issue Detection:**
- Scenarios failing consistently across multiple runs are flagged
- Helps distinguish flaky tests from genuine regressions

**History Persistence:**
- Run summaries written to `reports/cross-browser/history.json`
- Tracks pass/fail/skip counts per browser per run
- Browser-specific failure lists persisted for trend detection

### Report Linking

`ReportLinker` automatically injects a fixed-position banner at the bottom of the main Cucumber HTML report (`reports/html/cucumber-report.html`) with a link to the cross-browser matrix report. This makes it easy to navigate from the standard report to the cross-browser view without remembering the file path.

### NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run test:cross-browser` | `npx ts-node src/core/CrossBrowserRunner.ts` | Run full cross-browser suite (sequential by default) |
| `npm run test:cross-browser:parallel` | Sets `CROSS_BROWSER_PARALLEL=true` then runs CrossBrowserRunner | Run browsers concurrently |
| `npm run test:chromium` | Sets `CROSS_BROWSER_TARGET=chromium` with cross-browser profile | Run on Chromium only |
| `npm run test:firefox` | Sets `CROSS_BROWSER_TARGET=firefox` with cross-browser profile | Run on Firefox only |
| `npm run test:webkit` | Sets `CROSS_BROWSER_TARGET=webkit` with cross-browser profile | Run on WebKit only |

### API Testing Design

The framework includes a complete **API testing layer** built on Axios with BDD-aware features. API tests run without launching a browser (faster execution) and follow the same Gherkin step pattern as web tests.

#### How the ApiEngine Works

`ApiEngine` wraps Axios with BDD-specific enhancements:
- **Request interceptors**: Auto-inject bearer tokens, apply variable substitution in URLs and bodies
- **Response interceptors**: Auto-capture response time, log request/response details
- **Variable substitution**: URLs and bodies support `{variable}` and `$$variable` syntax
- **Auto-capture**: Response fields can be stored for subsequent requests

#### Gherkin Steps for API Requests

```gherkin
# Setup
Given I set the base url to '{api.baseUrl}'
Given I set bearer token '{authToken}'

# Requests with DataTable body
When I send a POST request to '/api/auth/login' with body:
  | key      | value          |
  | email    | user@test.com  |
  | password | secret         |

# Requests with inline JSON body
When I send a POST request to '/api/orders' with JSON:
  """
  {"planId": "{planId}", "serviceAreaId": "{areaId}"}
  """

# Simple requests
When I send a GET request to '/api/plans'
When I send a DELETE request to '/api/users/{userId}'
When I send a PUT request to '/api/orders/{orderId}' with body:
  | key    | value     |
  | status | approved  |
When I send a PATCH request to '/api/users/{userId}' with body:
  | key  | value       |
  | name | Updated Name |
```

#### Assertion Steps

```gherkin
Then the response status should be 200
Then the response status should be in range 200 to 299
Then the response header 'content-type' should contain 'application/json'
Then the response body field 'data.first_name' should equal 'Janet'
Then the response body field 'plans' should be a non-empty array
Then the response body field 'data' should be an array with 6 items
Then the response body field 'token' should exist
Then the response body field 'email' should not be empty
Then the response time should be less than 2000ms
```

#### Variable Chaining

Store response fields and use them in subsequent requests:

```gherkin
# Login and capture token
When I send a POST request to '/api/auth/login' with body:
  | key      | value         |
  | email    | user@test.com |
  | password | secret        |
And I store the response body field 'token' as 'authToken'

# Use token in next request
Given I set bearer token '{authToken}'
When I send a GET request to '/api/orders'
And I store the response body field 'orders.0.id' as 'orderId'

# Use orderId in next request
When I send a GET request to '/api/orders/{orderId}'
```

#### TeleConnect API Coverage (14 Scenarios)

The `teleconnect-order-journey.feature` covers the full lifecycle via API:

| # | Scenario | Endpoint | Key Validation |
|---|----------|----------|----------------|
| 01 | Register customer | POST /api/auth/register | Status 200–409 |
| 02 | Customer login | POST /api/auth/login | Token captured |
| 03 | Wrong password | POST /api/auth/login | Status 401 |
| 04 | Duplicate email | POST /api/auth/register | Status 400–409 |
| 05 | Get plans | GET /api/plans | Non-empty array |
| 06 | Get service areas | GET /api/service-areas | Array exists |
| 07 | Create order | POST /api/orders | Full auth + data flow |
| 08 | CRM Review | GET /api/orders (as CRM) | Status 200 |
| 09 | CRM Approve | POST /api/orders (as CRM) | Status 200 |
| 10 | Schedule install | POST (as installer) | Status 200 |
| 11 | Complete install | POST (as installer) | Status 200 |
| 12 | Start activation | POST (as activation) | Status 200 |
| 13 | Activate connection | POST (as activation) | Status 200 |
| 14 | Unauthenticated access | GET /api/orders (no token) | Status 401 |

#### Key Design Points

- **No browser launched** for `@api-only` scenarios — the Before hook skips browser creation
- **Bearer token management** built into steps — set once, auto-applied to all subsequent requests
- **API base URL** from `framework.properties` (`api.baseUrl`) or set dynamically via step
- **Variable chaining** enables multi-step workflows without hardcoded values
- **Response time assertion** validates performance SLAs within Gherkin
- **Dot-notation path** access for nested JSON fields (`data.user.name`, `plans.0.id`)


---

## 24. Mobile & Native App Testing — Pre-requisites & Setup

This section covers everything needed to run mobile tests at all three levels: Playwright Emulation (no setup needed), Physical Device via Appium, and Cloud Device Farms.

---

### Level 1: Playwright Emulation (Zero Setup)

No additional setup required. Uses Playwright's built-in device emulation.

```bash
# Just run
npm run test:mobile
```

Tags: `@mobile`, `@device:iPhone14`, `@device:Pixel7`

---

### Level 2: Android Emulator + Appium

#### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Java JDK | 17+ | Required by Android SDK |
| Android Studio | Latest | SDK Manager + Emulator |
| Node.js | 18+ | Appium runtime |
| Appium | 2.x | Mobile automation server |
| UiAutomator2 driver | Latest | Android automation |

#### Step 1 — Install Java JDK

Download from https://adoptium.net/ (Temurin JDK 17+)

Verify:
```bash
java -version
```

#### Step 2 — Install Android Studio & SDK

1. Download from https://developer.android.com/studio
2. Install and open Android Studio
3. Go to **Tools → SDK Manager → SDK Tools** tab
4. Check and install:
   - ✅ Android SDK Platform-Tools
   - ✅ Android SDK Build-Tools
   - ✅ Android Emulator
   - ✅ Intel HAXM (hardware acceleration)

#### Step 3 — Set Environment Variables (Windows)

Add these system environment variables:

```
ANDROID_HOME = C:\Users\<your-user>\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x
```

Add to **PATH**:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
%JAVA_HOME%\bin
```

#### Step 4 — Create Android Emulator

1. Open Android Studio → **Tools → Device Manager**
2. Click **Create Virtual Device**
3. Select hardware: **Pixel 7** (or any device)
4. Download system image: **API 34 (Android 14)**
5. Click **Finish**
6. Start the emulator from Device Manager

#### Step 5 — Install Appium & Driver

```bash
# Install Appium globally
npm install -g appium

# Install UiAutomator2 driver for Android
appium driver install uiautomator2

# Install XCUITest driver for iOS (Mac only)
appium driver install xcuitest
```

#### Step 6 — Verify Setup

```bash
# Check Java
java -version

# Check Android SDK
adb --version

# Check device/emulator is visible
adb devices

# Start Appium server
appium

# Check installed drivers
appium driver list --installed
```

Expected output for `adb devices`:
```
List of devices attached
emulator-5554   device
```

#### Step 7 — Configure framework.properties

For **native app testing** (testing an .apk):
```properties
nativeApp.enabled=true
nativeApp.appiumServer=http://localhost:4723
nativeApp.platform=android
nativeApp.appPath=C:/path/to/your-app.apk
nativeApp.appPackage=com.yourapp.package
nativeApp.appActivity=com.yourapp.MainActivity
nativeApp.autoGrantPermissions=true
nativeApp.noReset=true
```

For **mobile web testing** (Chrome on device/emulator):
```properties
realDevice.enabled=true
realDevice.provider=local
realDevice.platform=android
realDevice.deviceName=Pixel 7
realDevice.osVersion=14
realDevice.browser=chrome
realDevice.appiumServer=http://localhost:4723
```

#### Step 8 — Run Tests

```bash
# Start Appium in one terminal
appium

# Run native app tests in another terminal
npx cucumber-js --tags "@native"

# Run mobile web tests
npm run test:mobile
```

---

### Level 2b: Physical Android Device

#### Step 1 — Enable Developer Options

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times rapidly
3. You'll see "You are now a developer!"

#### Step 2 — Enable USB Debugging

1. Go to **Settings → Developer Options**
2. Enable **USB Debugging**
3. Connect device via USB cable
4. Tap **Allow** on the authorization prompt

#### Step 3 — Verify Connection

```bash
adb devices
# Should show:
# List of devices attached
# ABCDEF123456   device
```

#### Step 4 — Same Appium Setup

Follow Steps 5-8 from the Emulator section above. The `realDevice.deviceName` should match your physical device name.

---

### Level 3: Cloud Device Farms (BrowserStack / LambdaTest)

No Appium server, Android Studio, or physical device needed. Tests run on real devices in the cloud.

#### Step 1 — Get Credentials

**BrowserStack:** https://www.browserstack.com/accounts/settings → Username & Access Key

**LambdaTest:** https://accounts.lambdatest.com/detail/profile → Username & Access Key

#### Step 2 — Add to .env

```env
# BrowserStack
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key

# LambdaTest
LAMBDATEST_USERNAME=your_username
LAMBDATEST_ACCESS_KEY=your_access_key

# Sauce Labs (optional)
SAUCE_USERNAME=your_username
SAUCE_ACCESS_KEY=your_access_key
```

#### Step 3 — Configure framework.properties

```properties
realDevice.enabled=true
realDevice.provider=browserstack          # or: lambdatest, saucelabs
realDevice.platform=ios                   # or: android
realDevice.deviceName=iPhone 15           # exact device name from provider
realDevice.osVersion=17                   # OS version
realDevice.browser=safari                 # safari (iOS) or chrome (Android)
```

#### Step 4 — Run (No Appium server needed)

```bash
npm test
# Tests automatically connect to BrowserStack/LambdaTest cloud
```

---

### Verification Checklist

Run through this before first mobile test:

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | Node.js installed | `node --version` | v18+ |
| 2 | Java installed | `java -version` | 17+ |
| 3 | ANDROID_HOME set | `echo %ANDROID_HOME%` | SDK path |
| 4 | ADB accessible | `adb --version` | Version info |
| 5 | Device visible | `adb devices` | Device listed |
| 6 | Appium installed | `appium --version` | 2.x |
| 7 | Driver installed | `appium driver list --installed` | uiautomator2 |
| 8 | Appium starts | `appium` | Server running on 4723 |

---

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `adb` not found | Add `%ANDROID_HOME%\platform-tools` to PATH |
| `ANDROID_HOME` not set | Set env var to SDK location |
| Emulator won't start | Enable Intel HAXM in BIOS (Virtualization) |
| `appium driver install` fails | Run as admin: `npm install -g appium` |
| Device shows "unauthorized" | Tap Allow on the USB debugging prompt |
| `ECONNREFUSED` on port 4723 | Start Appium server first: `appium` |
| Chrome not opening on device | Install Chrome on the device/emulator |

---

### npm Scripts Summary

| Script | Purpose | Requires |
|--------|---------|----------|
| `npm run test:mobile` | Playwright emulation (no setup) | Nothing |
| `npx cucumber-js --tags "@native"` | Native app via Appium | Appium + device |
| `npm test` with `realDevice.enabled=true` | Web on real device | Appium or cloud creds |
| `npm test` with `realDevice.provider=browserstack` | Cloud device | .env credentials only |

