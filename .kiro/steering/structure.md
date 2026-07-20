# Project Structure

```
BDD_Playwright-v5.0/
├── features/                        # Gherkin feature files (BDD specs)
│   ├── web/                         # Web UI test scenarios
│   ├── api/                         # REST API test scenarios
│   ├── native/                      # Native mobile app scenarios
│   └── performance/                 # Load/stress test scenarios
├── src/
│   ├── config/                      # Framework configuration
│   │   ├── FrameworkConfig.ts       # Singleton config loader (parses framework.properties)
│   │   ├── framework.properties     # Key-value settings (browser, timeouts, features)
│   │   └── environments.json        # Environment-specific overrides
│   ├── core/                        # Core engine classes
│   │   ├── ActionEngine.ts          # Browser actions with self-healing support
│   │   ├── ApiEngine.ts             # HTTP request engine (Axios wrapper)
│   │   ├── CustomWorld.ts           # Cucumber World — DI container for all engines
│   │   ├── ContextManager.ts        # Browser/context/page lifecycle
│   │   ├── ElementResolver.ts       # PageName.ElementKey → locator string resolver
│   │   ├── SelfHealingEngine.ts     # AI-powered locator recovery
│   │   ├── CrossBrowserRunner.ts    # Multi-browser orchestration
│   │   ├── MobileEngine.ts          # Device emulation & touch support
│   │   ├── NativeAppEngine.ts       # Appium native app driver
│   │   ├── AccessibilityEngine.ts   # WCAG compliance audits
│   │   ├── LoadTestEngine.ts        # Virtual-user performance testing
│   │   ├── VisualTestingEngine.ts   # Screenshot comparison & anomaly detection
│   │   └── RootCauseAnalyzer.ts     # AI-powered failure diagnosis
│   ├── hooks/
│   │   └── Hooks.ts                 # Before/After/BeforeStep/AfterStep lifecycle hooks
│   ├── pages/properties/            # Element locator files (Page Object Model)
│   │   ├── TeleConnect.properties   # TeleConnect app locators
│   │   └── <PageName>.properties    # One file per page/app section
│   ├── steps/                       # Cucumber step definitions
│   │   ├── WebSteps.ts              # Web UI actions and assertions
│   │   ├── ApiSteps.ts              # API request/response steps
│   │   ├── CommonSteps.ts           # Shared steps (data loading, variables)
│   │   ├── MobileSteps.ts           # Mobile-specific steps
│   │   ├── NativeAppSteps.ts        # Native app interactions
│   │   ├── AccessibilitySteps.ts    # Accessibility audit steps
│   │   └── LoadTestSteps.ts         # Performance test steps
│   └── utils/                       # Shared utilities
│       ├── DataStore.ts             # In-memory key-value store (per-scenario)
│       ├── PersistentStore.ts       # Cross-scenario data persistence ($$var)
│       ├── RandomDataGenerator.ts   # Faker.js wrapper (##FieldName syntax)
│       ├── Logger.ts                # Winston structured logger
│       ├── TestDataLoader.ts        # JSON test data file loader
│       ├── ResponseValidator.ts     # API response assertion helpers
│       └── OpenAIClient.ts          # OpenAI integration utility
├── testdata/                        # Test data (APKs, JSON fixtures)
├── test-baselines/                  # Visual regression baseline images
├── tests/                           # Vitest unit tests (framework internals)
├── reports/                         # Generated reports (git-ignored)
├── resources/                       # Static resources (upload files, etc.)
├── cucumber.yml                     # Cucumber profiles
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies & scripts
└── .env                             # Secrets (not committed)
```

## Key Architectural Patterns

### Element Resolution (Page Object Model)

Locators are stored in `.properties` files under `src/pages/properties/`:

```properties
# TeleConnect.properties
LoginEmail=//input[@data-testid='login-email']
BtnNext=//button[@data-testid='btn-next']
```

Referenced in features as `'PageName.ElementKey'`:
```gherkin
When I click 'TeleConnect.BtnNext'
When I enter '##Email' into 'TeleConnect.LoginEmail'
```

### Tag-Driven Behavior

Tags control which engines activate during scenario execution:
- `@web` — launches browser
- `@api` — API-only (no browser)
- `@mobile` — device emulation
- `@native` — Appium native app session
- `@accessibility` / `@a11y` — WCAG audit
- `@loadtest` / `@performance` — auto-runs load test
- `@visual` — visual regression testing
- `@self-healing` — self-healing logging

### Data Flow

- `##FieldName` → `RandomDataGenerator` (Faker.js)
- `{variableName}` → `DataStore` (in-memory, cleared per scenario)
- `$$variableName` → `PersistentStore` (JSON file, cross-scenario)

### CustomWorld (DI Container)

`CustomWorld` is the Cucumber World class. Every step definition receives `this: CustomWorld` which provides access to all engines: `actionEngine`, `apiEngine`, `selfHealingEngine`, `mobileEngine`, `accessibilityEngine`, `nativeAppEngine`, etc.
