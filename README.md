# BDD Playwright Framework

> Production-grade BDD test automation framework for Web, API, Mobile, and Native App testing.

[![BDD Playwright CI](https://github.com/pravashktelus/AITAS/actions/workflows/playwright-bdd.yml/badge.svg)](https://github.com/pravashktelus/AITAS/actions/workflows/playwright-bdd.yml)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Browser Automation | Playwright ^1.60 |
| BDD Framework | Cucumber ^10.3 |
| Language | TypeScript (strict, ES2020) |
| API Testing | Axios |
| AI Self-Healing | OpenAI GPT |
| Reporting | Allure + Cucumber HTML |
| Mobile | Playwright Device Emulation + Appium |

## Key Features

- **Zero-code test authoring** — write Gherkin + properties files, no TypeScript needed
- **AI Self-Healing Locators** — broken locators auto-recover at runtime via OpenAI
- **Root Cause Analysis** — AI-powered failure diagnosis attached to reports
- **Cross-Browser** — Chromium, Firefox, WebKit (parallel execution)
- **Mobile Emulation** — tag-driven device emulation (`@device:iPhone14`)
- **Native App Testing** — Android/iOS via Appium (local + BrowserStack + LambdaTest)
- **REST API Testing** — full CRUD lifecycle with chaining and assertions
- **Accessibility Auditing** — WCAG A/AA/AAA compliance via axe-core + Lighthouse
- **Performance Testing** — load testing with configurable virtual users
- **Rich Reporting** — Allure with trend history, deployed to GitHub Pages

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Create environment file
copy .env.example .env

# Run tests
npm test

# View report
npm run report
```

## Project Structure

```
├── features/               # Gherkin feature files
│   ├── web/               # Web UI scenarios
│   ├── api/               # REST API scenarios
│   ├── native/            # Native mobile app scenarios
│   └── performance/       # Load test scenarios
├── src/
│   ├── config/            # Framework configuration
│   ├── core/              # Engine classes (Action, API, Mobile, etc.)
│   ├── hooks/             # Cucumber lifecycle hooks
│   ├── pages/properties/  # Element locators (Page Object Model)
│   ├── steps/             # Step definitions
│   └── utils/             # Shared utilities
├── testdata/              # Test data files
├── reports/               # Generated reports (git-ignored)
├── cucumber.yml           # Cucumber profiles
└── .github/workflows/     # CI/CD pipeline
```

## How It Works

```
Feature File (.feature)     →  Plain English test steps
Properties File (.properties) →  Element locators
         ↓
Framework automatically handles browser, actions, healing, reporting
```

```gherkin
# features/web/login.feature
@web @smoke
Scenario: User logs in successfully
  Given I navigate to the application
  When I enter '##Email' into 'Login.EmailField'
  And I enter 'password123' into 'Login.PasswordField'
  And I click 'Login.SubmitButton'
  Then 'Dashboard.WelcomeHeading' should be visible
```

```properties
# src/pages/properties/Login.properties
EmailField=//input[@data-testid='login-email']
PasswordField=//input[@data-testid='login-password']
SubmitButton=//button[@data-testid='login-submit']
```

## Run Commands

```bash
npm test                         # Default profile
npm run test:mobile              # Mobile emulation
npm run test:accessibility       # WCAG audits
npm run test:cross-browser       # Multi-browser
npm run test:native:android      # Native Android app

npm run report                   # Generate HTML report
npm run allure:generate          # Generate Allure report
npm run allure:open              # Open Allure in browser
```

## Variable System

| Syntax | Scope | Example |
|--------|-------|---------|
| `##Token` | Random data (Faker.js) | `##Email`, `##FullName`, `##MobileNum` |
| `{variable}` | Within scenario | `{authToken}`, `{orderId}` |
| `$$variable` | Cross-scenario (persisted) | `$$Email`, `$$OrderId` |

## CI/CD

GitHub Actions pipeline runs on every push:
1. Build & compile check
2. Run BDD tests on headless Chromium
3. Generate and deploy Allure report to GitHub Pages

## Configuration

| File | Purpose |
|------|---------|
| `src/config/framework.properties` | All framework settings (browser, timeouts, features) |
| `.env` | Secrets only (API keys, cloud credentials) |
| `cucumber.yml` | Test profiles and tag filters |

## Documentation

See [`helpDocx/README.md`](helpDocx/README.md) for the complete framework guide including:
- Onboarding a new application
- Full step reference (50+ reusable steps)
- Configuration deep dive
- Self-healing engine internals
- Accessibility, mobile, and cross-browser testing guides
