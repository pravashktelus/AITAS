# Product Overview

BDD Playwright Framework (v2.1.0) — a comprehensive test automation framework for the **TeleConnect** telecom application (hosted at `telecom-app-171032253690.northamerica-northeast1.run.app`).

## What It Tests

- **Web UI**: Customer registration, multi-step order placement, CRM, installation, activation, and verification flows
- **REST APIs**: Full CRUD lifecycle testing (JSONPlaceholder demo + TeleConnect APIs)
- **Mobile**: Device emulation via Playwright and real device testing via Appium (BrowserStack, LambdaTest)
- **Native Apps**: Android/iOS apps via Appium (local and cloud)
- **Performance**: Load/stress testing with configurable virtual users
- **Accessibility**: WCAG A/AA/AAA compliance audits via axe-core and Lighthouse
- **Cross-Browser**: Chromium, Firefox, WebKit with parallel execution

## Key Differentiators

- **Self-Healing Locators**: AI-powered (OpenAI) locator recovery when selectors break at runtime
- **Root Cause Analysis**: AI-assisted failure diagnosis automatically attached to reports
- **Properties-Based Page Objects**: Locators stored in `.properties` files, decoupled from code
- **Rich Reporting**: Allure + Cucumber HTML reports with inline HTML cards for healing, API requests, and RCA
