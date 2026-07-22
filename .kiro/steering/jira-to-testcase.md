---
inclusion: auto
---

# Jira Story & Test Case → Test Script Generation Guide

This document defines **how Kiro generates BDD test cases** from a Jira story pasted into the chat. It covers the full pipeline: context sources, rules, output structure, and conventions.

---

## 1. How to Trigger

Paste a Jira story (title, description, acceptance criteria) into the Kiro chat. Kiro will:

1. Analyze the story's intent (web UI, API, mobile, native, accessibility, performance)
2. Determine which tags/engines apply
3. Generate Gherkin scenarios using the project's existing step vocabulary
4. Produce any new `.properties` locators needed
5. Flag any acceptance criteria that require new step definitions

---

## 2. Context Sources (Where Kiro Gets Its Rules)

| Source | Location | What It Provides |
|--------|----------|------------------|
| Tech steering | `.kiro/steering/tech.md` | Language, frameworks, commands, timeouts |
| Structure steering | `.kiro/steering/structure.md` | File locations, patterns, architecture |
| Product steering | `.kiro/steering/product.md` | App-under-test info (TeleConnect @ simulapp.online) |
| Existing features | `features/**/*.feature` | Naming patterns, tag usage, step phrasing |
| Step definitions | `src/steps/*.ts` | Available step vocabulary (regex patterns) |
| Properties files | `src/pages/properties/*.properties` | Existing element locators |
| Framework config | `src/config/framework.properties` | App URL, browser, timeout settings |
| Cucumber profiles | `cucumber.yml` | Available profiles and their tag filters |

---

## 3. Generation Rules

### 3.1 Feature File Structure

```gherkin
@<type-tag> @<domain-tag>
Feature: <Short descriptive title from Jira story>
  As a <role from story>
  I want to <action from story>
  So that <business value from story>

  @<priority-tags>
  Scenario: <Descriptive scenario name>
    Given ...
    When ...
    Then ...
```

### 3.2 Tag Assignment Rules

| Story Type | Primary Tag | Additional Tags |
|------------|-------------|-----------------|
| Web UI flow | `@web` | `@smoke`, `@e2e`, `@regression` |
| REST API | `@api` | `@smoke`, `@regression` |
| Mobile emulation | `@mobile` | `@web` |
| Native app (Android/iOS) | `@native` | `@android` or `@ios` |
| Accessibility | `@accessibility` | `@web`, `@a11y` |
| Performance/Load | `@loadtest` | `@performance` |
| Visual testing | `@visual` | `@web` |

### 3.3 Element Reference Format

Always use `'PageName.ElementKey'` format:
```gherkin
When I click 'PageName.ButtonSubmit'
When I enter '##Email' into 'PageName.InputEmail'
```

- **PageName** = application section (e.g., `TeleConnect`, `CRM`, `Billing`)
- **ElementKey** = PascalCase identifier describing the element

### 3.4 Data Conventions

| Syntax | Usage | Example |
|--------|-------|---------|
| `##FieldName` | Random data (Faker.js) | `##FullName`, `##Email`, `##MobileNum` |
| `{variableName}` | In-scenario stored value | `{OrderId}`, `{Email}` |
| `$$variableName` | Cross-scenario persistent value | `$$OrderId` |
| Static value | Hardcoded test data | `'2026-06-15'`, `'Delhi'` |

**Available ##Fields:** `##FirstName`, `##LastName`, `##FullName`, `##Email`, `##MobileNum`, `##PhoneNum`, `##Address`, `##City`, `##State`, `##ZipCode`, `##Country`, `##Company`, `##JobTitle`, `##Username`, `##Password`

### 3.5 Scenario Design Principles

1. **Negative first, then positive** — validate error states before the happy path
2. **One scenario per user journey** — keep related steps together with section comments
3. **Use section headers** — `# ═══ SECTION NAME ═══` for readability
4. **Store values for later assertions** — use `I store attribute` or `I get text from`
5. **Assert after every state change** — verify URL, visibility, text after actions

---

## 4. Available Step Vocabulary

### 4.1 Web UI Steps (WebSteps.ts)

**Navigation:**
```gherkin
Given I navigate to the application
Given I navigate to '<url>'
When I go back
When I go forward
When I refresh the page
```

**Actions:**
```gherkin
When I click '<Page.Element>'
When I double click '<Page.Element>'
When I right click '<Page.Element>'
When I enter '<value>' into '<Page.Element>'
When I type '<value>' into '<Page.Element>'
When I clear '<Page.Element>'
When I press '<key>' on '<Page.Element>'
When I select '<option>' from '<Page.Element>'
When I check '<Page.Element>'
When I uncheck '<Page.Element>'
When I upload file '<path>' to '<Page.Element>'
When I drag '<source>' to '<target>'
When I hover '<Page.Element>'
When I scroll to '<Page.Element>'
When I scroll to top of page
When I scroll to bottom of page
```

**Waits:**
```gherkin
When I wait for '<Page.Element>' to be visible|hidden|attached|detached
When I wait <N> seconds
When I wait for url to contain '<fragment>'
```

**Data capture:**
```gherkin
When I store text of '<Page.Element>' as '<varName>'
When I store attribute '<attr>' of '<Page.Element>' as '<varName>'
When I get text from '<Page.Element>' and store as '<varName>'
When I persist '{varName}' as '<persistentKey>'
```

**Assertions:**
```gherkin
Then '<Page.Element>' should be visible
Then '<Page.Element>' should not be visible
Then '<Page.Element>' should have text '<expected>'
Then '<Page.Element>' should contain text '<expected>'
Then '<Page.Element>' should have value '<expected>'
Then '<Page.Element>' should be enabled
Then '<Page.Element>' should be disabled
Then '<Page.Element>' should be checked
Then '<Page.Element>' should have <N> items
Then the page title should be '<title>'
Then the url should contain '<fragment>'
Then '<Page.Element>' should have attribute '<attr>' with value '<val>'
```

### 4.2 API Steps (ApiSteps.ts)

**Setup:**
```gherkin
Given I set base url to '<url>'
Given I set bearer token '<token>'
Given I set api key '<key>' in header '<headerName>'
Given I clear auth
```

**Requests:**
```gherkin
When I send a GET request to '<endpoint>'
When I send a DELETE request to '<endpoint>'
When I send a GET request to '<endpoint>' with query params:
  | key | value |
When I send a POST|PUT|PATCH request to '<endpoint>' with body:
  | key   | value |
When I send a POST|PUT|PATCH request to '<endpoint>' with JSON:
  """
  { "key": "value" }
  """
```

**Response assertions:**
```gherkin
Then the response status should be <code>
Then the response status should be in range <min> to <max>
Then the response header '<name>' should be '<value>'
Then the response should have header '<name>'
Then the response body field '<path>' should equal '<value>'
Then the response body field '<path>' should contain '<value>'
Then the response body field '<path>' should exist
Then the response body field '<path>' should not be empty
Then the response body field '<path>' should have <N> items
Then the response body field '<path>' should be a non-empty array
Then the response time should be less than <N>ms
Then I store response field '<path>' as '<varName>'
Then I store response status as '<varName>'
```

### 4.3 Common Steps (CommonSteps.ts)

```gherkin
Given I load test data '<datasetName>'
Given I load test data '<datasetName>' as '<key>'
Given I set variable '<name>' to '<value>'
Then variable '<name>' should equal '<value>'
Then variable '<name>' should exist
When I log '<message with {vars}>'
When I dump the data store
```

---

## 5. Output Deliverables

When Kiro processes a Jira story, it delivers:

| # | Artifact | Location |
|---|----------|----------|
| 1 | **Feature file** | `features/<type>/<name>.feature` |
| 2 | **New locators** (if needed) | `src/pages/properties/<PageName>.properties` |
| 3 | **New step definitions** (if needed) | `src/steps/<relevant>Steps.ts` |
| 4 | **Test data fixtures** (if needed) | `testdata/<name>.json` |

### Output Naming Conventions

- Feature files: lowercase with underscores → `user_registration.feature`
- Properties files: PascalCase page name → `Billing.properties`
- Prefix feature file names with sequence number if part of a flow → `2_order_tracking.feature`

---

## 6. Decision Matrix

Use this to decide what to generate based on story content:

| Acceptance Criteria Contains... | Generate |
|--------------------------------|----------|
| "User can see / form / button / page" | Web scenario with `@web` tag |
| "API endpoint / request / response" | API scenario with `@api` tag |
| "Works on mobile / responsive" | Mobile scenario with `@mobile` tag |
| "Accessible / screen reader / WCAG" | Accessibility scenario with `@accessibility` |
| "Performance / response time / load" | Load test scenario with `@loadtest` |
| "Android / iOS app" | Native scenario with `@native` |
| "Visual regression / looks correct" | Visual scenario with `@visual` |
| Negative validation mentioned | Negative cases BEFORE positive flow |
| Multiple user roles | Separate `Scenario Outline` with role Examples |

---

## 7. Example: Jira Story → Generated Output

### Input (Jira Story)

> **JIRA-1234: User Login with OTP**
>
> As a registered user, I want to log in using OTP verification so that my account is secure.
>
> **Acceptance Criteria:**
> 1. User enters registered email and clicks "Send OTP"
> 2. Error shown if email field is empty
> 3. Error shown if email is not registered
> 4. OTP input field appears after valid email
> 5. User enters OTP and is redirected to dashboard
> 6. Error shown for invalid OTP

### Output

**Feature file** → `features/web/user_login_otp.feature`

```gherkin
@web @login @authentication
Feature: User Login with OTP Verification
  As a registered user
  I want to log in using OTP verification
  So that my account is secure

  @smoke @e2e
  Scenario: Login with OTP - negative and positive flow
    Given I navigate to the application

    # ═══ NEGATIVE - Empty Email ═══
    When I click 'Login.BtnSendOTP'
    Then 'Login.ErrorEmail' should have text 'Email is required'

    # ═══ NEGATIVE - Unregistered Email ═══
    When I enter 'unknown@test.com' into 'Login.InputEmail'
    And I click 'Login.BtnSendOTP'
    Then 'Login.ErrorEmail' should have text 'Email is not registered'

    # ═══ POSITIVE - Valid Email → OTP Sent ═══
    When I enter '$$Email' into 'Login.InputEmail'
    And I click 'Login.BtnSendOTP'
    Then 'Login.InputOTP' should be visible

    # ═══ NEGATIVE - Invalid OTP ═══
    When I enter '000000' into 'Login.InputOTP'
    And I click 'Login.BtnVerifyOTP'
    Then 'Login.ErrorOTP' should have text 'Invalid OTP'

    # ═══ POSITIVE - Valid OTP → Dashboard ═══
    When I enter '123456' into 'Login.InputOTP'
    And I click 'Login.BtnVerifyOTP'
    Then the url should contain 'dashboard'
    And 'Dashboard.WelcomeMessage' should be visible
```

**New locators** → `src/pages/properties/Login.properties`

```properties
InputEmail=//input[@data-testid='login-email']
BtnSendOTP=//button[@data-testid='btn-send-otp']
InputOTP=//input[@data-testid='otp-input']
BtnVerifyOTP=//button[@data-testid='btn-verify-otp']
ErrorEmail=//span[@data-testid='error-email']
ErrorOTP=//span[@data-testid='error-otp']
```

---

## 8. Quality Checklist (Applied Automatically)

Before delivering generated test cases, Kiro verifies:

- [ ] All element references use `'PageName.ElementKey'` format
- [ ] Tags match the story type and test purpose
- [ ] Negative cases come before positive flows
- [ ] Random data uses `##FieldName` (not hardcoded emails/names)
- [ ] Stored values use `{varName}` / `$$varName` correctly
- [ ] Each assertion matches an acceptance criterion
- [ ] Feature file has a proper Feature description (As a / I want / So that)
- [ ] No duplicate steps exist in the step definitions
- [ ] New locators have `data-testid` based selectors (preferred) or unique XPaths
- [ ] Scenario is runnable with existing infrastructure (no missing engines)

---

## 9. When New Step Definitions Are Needed

If the Jira story requires behavior not covered by existing steps, Kiro will:

1. Clearly flag the gap: "⚠️ New step required"
2. Propose the step definition with TypeScript implementation
3. Place it in the appropriate `src/steps/*.ts` file
4. Follow the existing pattern: regex matcher + `this: CustomWorld` + engine call

---

## 10. Test Case → Test Script Generation (Non-Jira)

When the user provides a **written test case** (not a Jira story) — e.g., from a test management tool, spreadsheet, or plain text — apply the same generation rules with these adaptations:

### Input Format Recognition

Kiro recognizes test cases in these formats:
- **Structured**: TC ID, Title, Preconditions, Steps, Expected Results
- **Tabular**: Step # | Action | Expected Result
- **Bullet list**: Numbered steps with expected outcomes
- **Plain text**: Described flow with implicit validations

### Mapping Rules

| Test Case Element | Maps To |
|-------------------|---------|
| TC ID / Title | `@TCID` tag + Scenario name |
| Preconditions | `Given` steps (navigation, login, setup) |
| Action steps | `When` steps |
| Expected results | `Then` assertions |
| Test data mentioned | `##FieldName` or hardcoded values as appropriate |

### Example: Test Case → Feature File

**Input (Test Case):**
> TC002 - Verify error message for invalid email format
> Precondition: User is on registration page
> Steps:
> 1. Enter "invalidemail" in email field
> 2. Click Submit
> Expected: Error message "Please enter a valid email address" is displayed

**Output:**
```gherkin
@web @teleconnect_orderingestion
Feature: TC002 - Verify error message for invalid email format

  @smoke @regression @TC002
  Scenario: TC002 - Error message displayed for invalid email format
    Given I navigate to the application
    # ... login/navigation to registration page ...

    When I enter 'invalidemail' into 'TeleConnect.InputEmail'
    And I click 'TeleConnect.BtnSubmit'
    Then 'TeleConnect.ErrorEmail' should contain text 'Please enter a valid email address'
```

### Speed Priority

For test case generation:
- **Do NOT ask clarification** if the test case has clear steps and expected results
- **Do NOT run the spec workflow** — generate directly
- **Reuse existing locators** from `src/pages/properties/` when elements already exist
- **Only create new locators** when the element is genuinely new
- **Default tags**: `@web @smoke @regression @<TCID>`

---

## 11. How to Use This Guide

This guide is **auto-included** in all conversations. Simply:
1. Paste your Jira story OR test case text
2. Kiro generates the complete output following all rules above — no activation needed

For best results, include:
- Clear acceptance criteria or step-by-step actions
- Expected results/assertions
- Which page or app section the test covers
