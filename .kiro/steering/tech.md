# Tech Stack & Build System

## Language & Runtime

- **TypeScript** (strict mode, ES2020 target, CommonJS modules)
- **Node.js** runtime
- **ts-node/register** for direct TS execution (no pre-compile step)

## Core Frameworks

| Purpose | Library | Version |
|---------|---------|---------|
| Browser automation | Playwright | ^1.60.0 |
| BDD framework | @cucumber/cucumber | ^10.3.2 |
| HTTP client (API tests) | Axios | ^1.7.2 |
| Unit tests (framework internals) | Vitest | ^4.1.6 |
| Property-based testing | fast-check | ^4.8.0 |

## Key Libraries

- **OpenAI** (^4.52.0) — self-healing suggestions and root cause analysis
- **Winston** (^3.13.0) — structured logging
- **Faker.js** (^10.4.0) — random test data generation
- **Sharp** (^0.33.0) — image processing for visual testing
- **AJV** (^8.16.0) — JSON schema validation
- **Lighthouse** (^13.4.0) — performance/accessibility audits
- **dotenv** (^16.4.5) — environment variable management
- **BrowserStack Node SDK** (^1.63.2) — cloud device integration

## Reporting

- **multiple-cucumber-html-reporter** (^3.7.0) — HTML reports
- **Allure** (allure-commandline ^2.43.0) — rich interactive reports

## Common Commands

```bash
# Run all tests (default cucumber profile)
npm test

# Run by test type
npm run test:mobile          # Mobile emulation tests
npm run test:accessibility   # WCAG accessibility tests
npm run test:native:android  # Native Android app tests
npm run test:native:ios      # Native iOS app tests

# Cross-browser
npm run test:cross-browser           # Sequential cross-browser
npm run test:cross-browser:parallel  # Parallel cross-browser
npm run test:chromium                # Chromium only
npm run test:firefox                 # Firefox only
npm run test:webkit                  # WebKit only

# Reports
npm run report              # Generate Cucumber HTML report
npm run allure:generate     # Generate Allure report
npm run allure:open         # Open Allure report in browser
npm run allure:serve        # Serve Allure report (live)

# Cleanup
npm run clean               # Remove reports/ and test-results/
```

## Configuration Files

| File | Purpose |
|------|---------|
| `cucumber.yml` | Cucumber profiles (default, cross-browser, accessibility, mobile, native, api, loadtest) |
| `src/config/framework.properties` | All non-secret framework settings (Java properties format) |
| `.env` | Secrets only (API keys, cloud credentials) — not committed |
| `tsconfig.json` | TypeScript compiler options with path aliases |
| `.allurerc.json` | Allure report configuration |

## TypeScript Path Aliases

```
@core/*   → src/core/*
@steps/*  → src/steps/*
@utils/*  → src/utils/*
@config/* → src/config/*
@pages/*  → src/pages/*
```

## Environment & Timeouts

Default timeout: 30s, Navigation: 60s, API: 15s, Cucumber default timeout: 120s (for BrowserStack provisioning).
