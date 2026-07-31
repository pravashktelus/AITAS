# 🎬 Demo Script — Playwright AI-Powered Test Automation Platform

> Follow this script in exact slide order. Each section maps 1:1 with the presentation slides.

---

## 🧹 Pre-Demo Setup (5 min before presentation)

```bash
npm run clean
npm install
npx tsc --noEmit
```

Set `slowMo=500` in `src/config/framework.properties` so audience can see browser actions.

---

## SLIDE 1 — Title Slide

**Say:** "Today I'll walk you through our Playwright AI-Powered Test Automation Platform — less coding, faster development, automatically adapts to application changes, covers AI Assited Quick development,Web,API,Mobile(Native & Hybrid Both) and Accessibilty as well as  with rich reporting."

*No commands — move to next slide.*

---

## SLIDE 2 — Agenda (Table of Contents)

**Say:** "Here's what we'll cover today — starting with the problem statement, then our solution, architecture, features, a comparison with traditional frameworks, value proposition, and finally a live technical demo."

*No commands — move to next slide.*

---

## SLIDE 3 — Problem Statements

**Say:** "These are the 15 challenges we identified in current testing infrastructure:"

Walk through key pain points:
1. Manual testers have limited test coverage
2. Writing test cases is time-consuming
3. Flaky tests and stability issues
4. UI/UX & Accessibility validations are difficult
5. CI/CD integration challenges
6. Test data management is complex
7. In-house infrastructure is expensive
8. Test maintenance impacts ROI
9. Complex framework architecture — long learning curve
10. Reporting and metrics limitations
11. Performance testing integration issues
12. Measuring ROI of automation is hard

**Say:** "Our framework addresses every single one of these. Let me show you how."

*No commands — move to next slide.*

---

## SLIDE 4 — Playwright: A Solution Provider with Unified Capabilities

**Say:** "Playwright is a unified solution that consolidates all testing needs — web, mobile, multi-browser, CI/CD — into one powerful open-source platform."

Walk through the 8 capability cards:

1. **Cross Browser Testing** — "Chrome, Firefox, Safari & Edge — single codebase"
2. **Parallel Testing** — "Execute multiple suites concurrently, reduce hours to minutes"
3. **API Testing** — "Full REST & GraphQL support alongside UI actions"
4. **Synchronization (Auto-wait)** — "No artificial sleeps — waits for elements to be actionable"
5. **Mobile Emulation** — "Simulate exact viewports, agents, touch gestures"
6. **Network Interception** — "Intercept and mock APIs, simulate slow networks"
7. **Native AI Support** — "Generates test plans for GUI and converts them into executable scripts automatically. Adapts to UI changes without manual intervention"
8. **Accessibility Testing WCAG 2.1** — "Audit against all conformance levels (A, AA, AAA), detect keyboard navigation gaps"

*No commands — move to next slide.*

---

## SLIDE 5 — Framework Architecture

**Say:** "This is our Quality Engineering Test Automation Framework Architecture — AiQ."

Walk through the 4 layers:

**Pre-Scripting (Left):**
- "BDD — plain English test scripts"
- "Property files — element locators decoupled from code"
- "Reusable libraries"

**Framework Engine (Center):**
- "Automation tech stack: TypeScript, Playwright, Git, CI/CD"
- "AI-enabled quality framework — powered by Kiro, Claude, CoPilot"
- "Playwright MCP, NPM, OpenAI integration"

**Cloud Execution Environment:**
- "Mobile Lab — real & virtual devices"
- "Playwright/Cypress/Selenium Grid"
- "Windows, Linux & Mac machines"
- "Visual Regression Testing"
- "Accessibility Testing"
- "Test Management System"

**Test Reporting & Analytics (Right):**
- "HTML5 reports, Allure interactive reports"

*No commands — move to next slide.*

---

## SLIDE 6 — Framework Features (14 Key Capabilities)

**Say:** "Here are our 14 production-grade capabilities across BDD, AI, Reporting, and CI/CD."

Walk through each:

| # | Feature | One-liner |
|---|---------|-----------|
| 1 | 2-Layer BDD Architecture | Natural Language + Web Elements — simpler codebase, faster onboarding |
| 2 | Unified Web UI + API Testing | Cross-scenario data sharing — one framework for E2E flows |
| 3 | Cross-Browser Execution | Simultaneous testing slashes run times |
| 4 | Generic Step Definitions | Reusable methods — reduces new code, easy for teams immediately |
| 5 | Dynamic Test Data | Auto-generates random data inline using `##FieldName` |
| 6 | Rich Reporting | Allure + HTML + screenshots — step-level detail |
| 7 | CI/CD Ready | Headless, Docker, Parallel — works in any pipeline |
| 8 | Self-Healing Engine (AI) | Tests auto-recover from DOM changes using smart semantic context |
| 9 | Root Cause Analysis (AI) | Instant diagnosis + visual regressions |
| 10 | Intelligent Gen AI | Paste user stories → dynamically generate complete test files |
| 11 | Playwright MCP (AI) | Extracts real locators from live applications — zero manual hunting |
| 12 | Spec-Driven Dev (AI) | Requirements → Design → Tasks — structured process from idea to code |
| 13 | Steering Rules & Hooks (AI) | Quality gates on every change — team standards enforced automatically |
| 14 | E2E Orchestration (AI) | Multi-stage flows wired in minutes — safe git operations with secret protection |

*No commands — move to next slide.*

---

## SLIDE 7 — Traditional VS Playwright (Comparison Table)

**Say:** "Let's compare traditional frameworks vs our Playwright framework side by side."

Key differentiators to emphasize:

| Feature | Traditional | Playwright |
|---------|-------------|------------|
| Cross Browser | Limited / Tool dependent | Built-in (Chrome, Edge, Firefox, Safari) |
| Unified UI & API | Separate tools required | Single framework for UI, API & more |
| Locator Intelligence | Not available | Smart locator intelligence + self-healing |
| Test Flakiness | Manual handling | Auto-retry & self-healing |
| Low Code / No Code | Coding heavy | Low-code / No-code option available |
| Team Onboarding | Time required | Faster onboarding |
| AI Integration | Plugin / add-on required | Seamless AI integration |

**Say:** "Playwright is faster, smarter, and future-ready automation for end-to-end testing."

*No commands — move to next slide.*

---

## SLIDE 8 — Capabilities Map & Financial Impact (Value Proposition)

**Say:** "By combining AI, low-code automation, and self-healing capabilities, the framework delivers up to ~60% overall effort savings."

Present the table:

| Activity | AI-Driven Improvement | Effort Reduction |
|----------|----------------------|-----------------|
| Automation Scripting | 2-Step Process — Only Feature & Property files required | ~50% |
| Test Data Generation | Auto data generation at page level | ~60% |
| Faster Onboarding | Non-technical users productive within 1 week | ~70% |
| Maintenance | Lower effort with self-healing | ~30% |

**Say:** "This is not theoretical — I'll demonstrate each of these capabilities live right now."

*No commands — move to next slide.*

---

## SLIDE 9-10 — LIVE TECHNICAL DEMO

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DEMO COLUMN 1: Playwright & Kiro Features
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Demo 1.1 — Framework Walkthrough & 2-Steps Automation

**Say:** "Let me show you the 2-step automation. You only need two files to create a test."

**ACTION:** Open these two files side by side in IDE:
```
File 1: features/web/1_teleconnect.feature
File 2: src/pages/properties/TeleConnect.properties
```

**Say:** "The feature file is pure natural language — `When I click 'TeleConnect.BtnNext'`. The property file maps that to the actual locator — `BtnNext=//button[@data-testid='btn-next']`. That's it. No Java classes, no page object code, no step definition writing for each scenario."

**Highlight these patterns:**
- `##FullName` → "This generates random data automatically — no test data prep needed"
- `{Email}` → "Variables stored within a scenario"
- `$$OrderId` → "Data persisted across scenarios — this order ID flows through all 5 tests"

#### Demo 1.2 — BDD Natural Language

**Say:** "Even non-technical team members can read and write these tests. The generic steps work for any element on any page."

**Show step examples from the feature file:**
```gherkin
When I click 'TeleConnect.BtnNext'
And I enter '##Email' into 'TeleConnect.LoginEmail'
Then 'TeleConnect.OrderSuccess' should be visible
And I get text from 'TeleConnect.OrderNumber' and store as 'OrderId'
```

#### Demo 1.3 — Kiro: Vibe Mode vs Spec-Driven Development

**ACTION:** Show Kiro IDE with chat open.

**Say:** "Kiro has two modes — Vibe mode for quick Q&A and exploratory coding. Spec mode for structured development: Requirements → Design → Tasks → Implementation."

**Show:** `.kiro/steering/` folder → "These are team standards that are enforced automatically on every change."

#### Demo 1.4 — MCP Server Integration

**Say:** "Playwright MCP extracts real locators from live applications — zero manual hunting."

**ACTION:** In Kiro chat, demonstrate navigating to the app and extracting locators.

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DEMO COLUMN 2: E2E Order Execution
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Demo 2.1 — Scenario Pipeline (Full Functional Flow)

**Say:** "Now let me run our 5-scenario E2E pipeline. This simulates the complete telecom order lifecycle — from customer registration to post-activation verification."

**COMMAND — Run full pipeline:**
```bash
npx cucumber-js --tags "@teleconnect_orderingestion or @teleconnect_crm or @teleconnect_install or @teleconnect_activate or @teleconnect_verify or @teleconnect_login"
```

**While it runs, explain each scenario:**

**Scenario 1 — Automated Order Ingestion:**
"New customer registers, fills 6-step order form — personal info, location, plan, offers, installation schedule, confirmation."

**Scenario 2 — CRM Validation Workflows:**
"Order flows to CRM system. Agent searches by Order ID, reviews, approves — verifies customer ID, address, plan eligibility."

**Scenario 3 — Installation Process Initiation:**
"Install team picks up the approved order, schedules installation, completes checklist — cable routing, router setup, speed test, customer sign-off."

**Scenario 4 — Network & Service Activation:**
"Activation team configures port number, OLT device, runs bandwidth test, ping test, activates the connection."

**Scenario 5 — Post Activation User Re-Verification:**
"Customer logs back in and sees order status as 'ACTIVATED' on their dashboard."

**Say:** "Notice how `$$OrderId` from Scenario 1 flows through all 5 scenarios automatically — no manual data passing."

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DEMO COLUMN 3: API and UI Flow Automation
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Demo 3.1 — Complete CRUD Lifecycle

**Say:** "Let me show our API testing — a full CRUD lifecycle in a single scenario."

**COMMAND:**
```bash
npx cucumber-js --tags "@crud-lifecycle"
```

**Say while running:** "This executes POST (create) → GET (read) → PUT (full update) → PATCH (partial update) → DELETE — all in one flow with response validation and timing assertions."

#### Demo 3.2 — Register via API + Validate on UI (Cross-Layer)

**Say:** "Now the real power — API and UI working together. We register a user via REST API, then validate that user can login through the browser."

**COMMAND:**
```bash
npx cucumber-js --tags "@register-user-api or @teleconnect_registered-user"
```

**Say:** "Data flows from API to UI via persistent store — `$$Email_viaAPI` and `$$Password_viaAPI` are set in the API test and consumed by the UI test."

#### Demo 3.3 — Allure & HTML Report Generation

**Say:** "Let me generate the reports — screenshots at each step, embedded logs, step-level timing, and videos of execution."

**COMMANDS:**
```bash
npm run report
npm run allure:serve
```

**Show in the report:**
- Screenshots captured at each step
- Step-level timing details
- Test logs embedded
- API request/response bodies visible
- Self-healing cards (if triggered)
- Pass/fail visual evidence

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DEMO COLUMN 4: Mobile Testing
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Demo 4.1 — Login on Mobile (Touch & Keyboard)

**Say:** "Verify login form works correctly on mobile with touch interactions and on-screen keyboard."

**COMMAND:**
```bash
npx cucumber-js --tags "@mobile and @iphone and @smoke"
```

**Say:** "This emulates iPhone 14 — exact viewport, user agent, touch events, device pixel ratio. No physical device needed."

#### Demo 4.2 — Touch Target Size Validation

**COMMAND:**
```bash
npx cucumber-js --tags "@mobile and @touch"
```

**Say:** "Validates all touch targets meet the 48x48px minimum — WCAG 2.1 requirement for mobile accessibility."

#### Demo 4.3 — Swipe Gesture (Carousel Navigation)

**Say:** "Validate swipe left/right gestures on mobile."

**COMMAND:**
```bash
npx cucumber-js --tags "@mobile and @gestures"
```

#### Demo 4.4 — Cross-Platform iOS vs Android Parity

**Say:** "Run the same test on both iOS (iPhone 14) and Android (Pixel 7) to verify feature parity."

**COMMAND:**
```bash
npx cucumber-js --tags "@mobile and @smoke"
```

**Say:** "Both iPhone 14 and Pixel 7 scenarios run — same test logic, different device profiles."

#### Demo 4.5 — Full Mobile Suite

**COMMAND (run all mobile tests together):**
```bash
npm run test:mobile
```

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### DEMO COLUMN 5: Accessibility Testing
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Demo 5.1 — WCAG 2.1 Full Page Audit

**Say:** "Run a complete WCAG 2.1 AA audit on the login page and report all violations with severity."

**COMMAND:**
```bash
npx cucumber-js --tags "@a11y and @audit and @smoke"
```

**Say:** "This runs both axe-core and Lighthouse — reports accessibility score, violations, and remediation steps."

#### Demo 5.2 — Focus Trap (Modal & Dialog)

**Say:** "Ensure focus is trapped inside modal dialogs so keyboard users cannot navigate behind the overlay."

**COMMAND:**
```bash
npx cucumber-js --tags "@a11y and @focus"
```

**Say:** "Tests visible focus indicators on all interactive elements — critical for keyboard-only users."

#### Demo 5.3 — Keyboard Navigation

**Say:** "Verify all interactive elements are reachable via keyboard — no mouse required."

**COMMAND:**
```bash
npx cucumber-js --tags "@a11y and @keyboard"
```

#### Demo 5.4 — Image Alt Text & Decorative Images

**Say:** "Verify all meaningful images have descriptive alt text and decorative images use empty alt='' to be skipped by screen readers."

**COMMAND:**
```bash
npx cucumber-js --tags "@a11y and @images"
```

#### Demo 5.5 — Full Accessibility Suite

**COMMAND (run all accessibility tests together):**
```bash
npm run test:accessibility
```

**Say:** "This covers: WCAG audit, Lighthouse scoring, heading structure, landmarks, labels, focus indicators, keyboard navigation, ARIA snapshots, and mobile+accessibility combined."

---

## WRAP UP — After Demo

**Say:** "As you saw — the 2-step automation (Feature + Property file), AI self-healing, cross-browser, mobile, API, and accessibility all work from a single unified framework. Non-technical users can be productive within 1 week, and we reduce overall automation effort by ~60%."

---

## SLIDE 10 — Thank You / Q&A

**Say:** "Thank you. I'm happy to take questions — on implementation, technical details, or next steps."

---

## 📋 Commands Quick Reference (Cheat Sheet)

```bash
# ─── Pre-Demo ───────────────────────────────────────
npm run clean
npx tsc --noEmit

# ─── E2E Order Pipeline (6 scenarios + Login Negative) ──
npx cucumber-js --tags "@teleconnect_orderingestion or @teleconnect_crm or @teleconnect_install or @teleconnect_activate or @teleconnect_verify or @teleconnect_login"

# ─── Login Negative Validation only ─────────────────────
npx cucumber-js --tags "@teleconnect_login"

# ─── API CRUD Lifecycle ─────────────────────────────
npx cucumber-js --tags "@crud-lifecycle"

# ─── API Register + UI Login ────────────────────────
npx cucumber-js --tags "@register-user-api or @teleconnect_registered-user"

# ─── Reports ────────────────────────────────────────
npm run report
npm run allure:serve

# ─── Mobile (all) ───────────────────────────────────
npm run test:mobile

# ─── Mobile (individual) ────────────────────────────
npx cucumber-js --tags "@mobile and @iphone and @smoke"
npx cucumber-js --tags "@mobile and @touch"
npx cucumber-js --tags "@mobile and @gestures"
npx cucumber-js --tags "@mobile and @smoke"

# ─── Accessibility (all) ────────────────────────────
npm run test:accessibility

# ─── Accessibility (individual) ─────────────────────
npx cucumber-js --tags "@a11y and @audit and @smoke"
npx cucumber-js --tags "@a11y and @focus"
npx cucumber-js --tags "@a11y and @keyboard"
npx cucumber-js --tags "@a11y and @images"

# ─── Cross-Browser ──────────────────────────────────
npm run test:cross-browser:parallel
```

---

## 🚨 If Something Goes Wrong

| Problem | Quick Fix |
|---------|-----------|
| Reports folder missing | Run `npm run clean` then re-run test (auto-creates dirs) |
| Tests running too fast | Set `slowMo=500` in `src/config/framework.properties` |
| Tests running too slow | Set `slowMo=0` in `src/config/framework.properties` |
| Allure won't open | Use `npm run allure:serve` instead of `allure:open` |
| Self-healing not firing | Check `selfHealing.enabled=true` in framework.properties |
| Appium/Android issues | Run `npm run android:setup` first |
