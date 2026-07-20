# How Kiro-Based Development Works

> This document explains how our team uses **Kiro** (AI-powered IDE) to generate test cases from Jira stories. This is not magic or guesswork — it's a structured, repeatable process backed by project-specific configuration files that teach Kiro exactly how our framework works.

---

## What is Kiro?

Kiro is an AI-powered development environment (built by AWS) that works like a pair programmer. It reads your codebase, understands your patterns, and generates code that follows your team's conventions — because we explicitly taught it those conventions through configuration files.

**Key point:** Kiro doesn't hallucinate random code. It generates output based on:
1. Our project's steering files (rules and patterns)
2. Our existing step definitions (the actual code)
3. Our skills files (task-specific instructions)
4. Our properties files (existing element locators)

---

## Why It's Not Bluffing — The Evidence

### 1. It reads our actual source code

When you paste a Jira story, Kiro reads:
- `src/steps/WebSteps.ts` — every available web step (click, enter, assert, etc.)
- `src/steps/ApiSteps.ts` — every available API step (GET, POST, assertions)
- `src/pages/properties/*.properties` — every existing element locator
- `features/**/*.feature` — every existing test scenario for patterns

It ONLY generates steps that actually exist in our codebase. If a step doesn't exist, it flags it as "⚠️ New step required" and proposes the implementation.

### 2. It follows rules we wrote

We configured these files that Kiro reads on every interaction:

| File | What it teaches Kiro |
|------|---------------------|
| `.kiro/steering/tech.md` | Our tech stack (TypeScript, Playwright, Cucumber), commands, timeouts |
| `.kiro/steering/structure.md` | Where files go, naming patterns, architecture rules |
| `.kiro/steering/product.md` | What app we're testing (TeleConnect @ simulapp.online) |
| `.kiro/steering/workflow.md` | Always use Specs mode, always ask clarifying questions |
| `.kiro/steering/jira-to-testcase.md` | Complete pipeline for Jira → test case generation |

### 3. It uses skills with explicit instructions

Skills are task-specific guides in `.kiro/skills/`:

| Skill | What it does |
|-------|-------------|
| `jira-story-analysis.md` | Parses story → classifies test type → routes to correct generator |
| `generate-web-tests.md` | Produces web UI Gherkin scenarios |
| `generate-api-tests.md` | Produces REST API test scenarios |
| `generate-mobile-tests.md` | Produces mobile/responsive scenarios |
| `generate-native-app-tests.md` | Produces Appium native app scenarios |
| `generate-accessibility-tests.md` | Produces WCAG compliance scenarios |
| `generate-performance-tests.md` | Produces load test scenarios |
| `generate-locators.md` | Creates `.properties` files with naming conventions |
| `generate-step-definitions.md` | Creates new steps only when existing ones don't suffice |

---

## How the Process Works (Step by Step)

```
┌─────────────────────────────────────────────────────────────┐
│  YOU paste a Jira story into Kiro chat                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: REQUIREMENTS                                      │
│  • Kiro reads the story                                     │
│  • Asks follow-up questions if anything is unclear          │
│  • Confirms acceptance criteria with you                    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: DESIGN                                            │
│  • Classifies test type (web, API, mobile, etc.)            │
│  • Proposes tags, file names, scenario structure            │
│  • You review and approve                                   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: TASKS                                             │
│  • Breaks work into: feature file, locators, steps          │
│  • Lists exactly what will be created/modified              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: IMPLEMENTATION                                    │
│  • Generates feature file using EXISTING step vocabulary    │
│  • Creates locators in .properties format                   │
│  • Adds new step definitions ONLY if needed                 │
│  • Verifies with TypeScript compiler                        │
└─────────────────────────────────────────────────────────────┘
```

---

## What Makes It Reliable

### ✅ It uses only steps that exist in our code

Every `When I click '...'`, `Then '...' should be visible` etc. maps to a real regex pattern in `src/steps/WebSteps.ts`. Kiro doesn't invent step syntax.

### ✅ It follows our naming conventions

- Element references: `'PageName.ElementKey'` (PascalCase)
- Data tokens: `##FieldName` for random, `{var}` for stored, `$$var` for persistent
- Tags: `@web`, `@api`, `@mobile`, `@accessibility`, `@loadtest`

### ✅ It asks before assuming

The workflow steering enforces: "Always ask follow-up questions if anything is unclear." Kiro won't guess your intent.

### ✅ It generates runnable code

Output goes to the correct directories (`features/web/`, `src/pages/properties/`) and follows our TypeScript strict mode requirements. You can run the generated tests immediately with `npm test`.

### ✅ It's auditable

Every generated file is a standard `.feature`, `.properties`, or `.ts` file — reviewable in any code review tool. There's no black box.

---

## Example: What Kiro Actually Generates

**Input** (Jira story pasted):
> User should be able to reset password via email

**Output** (after clarification):

1. `features/web/password_reset.feature` — Gherkin scenario with negative + positive flows
2. `src/pages/properties/PasswordReset.properties` — element locators like:
   ```
   InputEmail=//input[@data-testid='reset-email']
   BtnSendLink=//button[@data-testid='btn-send-reset']
   SuccessMessage=//div[@data-testid='reset-success']
   ```
3. No new step definitions needed (all steps already exist in `WebSteps.ts`)

---

## How to Verify It's Working Correctly

1. **Check the feature file** — every step should match a pattern in `src/steps/*.ts`
2. **Run TypeScript check** — `npx tsc --noEmit` should pass
3. **Run the test** — `npm test -- --tags "@your-tag"` should execute (even if assertions fail because the app doesn't have the feature yet, the framework resolves correctly)
4. **Check locators** — every `Page.Element` reference in the feature should have a matching key in the `.properties` file

---

## FAQ

**Q: Can Kiro generate tests for ANY Jira story?**
A: Yes, as long as it's within our framework's capabilities (web UI, API, mobile, native, accessibility, performance). If the story requires something our framework can't do, Kiro will flag it.

**Q: Does it replace manual test design?**
A: No. It accelerates the mechanical part (writing Gherkin, creating locators). You still review, adjust selectors to match real UI, and decide test strategy.

**Q: What if the generated locator is wrong?**
A: Locators are generated as `data-testid` based suggestions. You need to verify them against the actual application DOM. The self-healing engine will also adapt at runtime if locators break.

**Q: Does everyone need Kiro installed?**
A: Only the person generating tests needs Kiro. The output files are standard code that anyone can read, review, and run.

**Q: Where are the "rules" stored?**
A: All in `.kiro/steering/` (always-loaded rules) and `.kiro/skills/` (task-specific guides). These are version-controlled markdown files — transparent and editable by anyone.

---

## File Locations (for reference)

```
.kiro/
├── steering/              ← Rules loaded every session
│   ├── tech.md            ← Tech stack & commands
│   ├── structure.md       ← Project layout & patterns
│   ├── product.md         ← App-under-test info
│   ├── workflow.md        ← Specs mode & clarification policy
│   └── jira-to-testcase.md  ← Generation pipeline (manual)
├── skills/                ← Task-specific generation guides
│   ├── jira-story-analysis.md
│   ├── generate-web-tests.md
│   ├── generate-api-tests.md
│   ├── generate-mobile-tests.md
│   ├── generate-native-app-tests.md
│   ├── generate-accessibility-tests.md
│   ├── generate-performance-tests.md
│   ├── generate-locators.md
│   └── generate-step-definitions.md
├── hooks/                 ← Automated triggers
├── settings/              ← MCP server configs
└── specs/                 ← Spec documents for features
```

---

*This document is part of the BDD Playwright Framework v5.0 project. Last updated: July 2026.*
