# Skill: Generate Web UI Test Cases

## Description
Generate BDD Gherkin feature files for web UI scenarios from a Jira story or requirements description.

## When to Use
- User pastes a Jira story involving web forms, pages, buttons, navigation, or browser interactions
- User asks to create web test cases for a user journey
- Story mentions: login, registration, dashboard, form submission, file upload, multi-step wizard

## Instructions

1. **Analyze** the Jira story acceptance criteria to identify:
   - Happy path flows
   - Negative/validation cases (empty fields, invalid input, boundary values)
   - State changes (URL, visibility, text content)

2. **Determine page name** from the application section being tested:
   - Use existing page names from `src/pages/properties/` if the page already exists
   - Create a new PascalCase page name if it's a new section (e.g., `Billing`, `Profile`, `Settings`)

3. **Generate the feature file** following this structure:
   ```gherkin
   @web @<domain-tag>
   Feature: <Title from Jira>
     As a <role>
     I want to <action>
     So that <value>

     @smoke @e2e
     Scenario: <Descriptive name>
       Given I navigate to the application
       # ═══ NEGATIVE CASES ═══
       ...
       # ═══ POSITIVE FLOW ═══
       ...
   ```

4. **Generate element locators** in `.properties` format:
   - Prefer `data-testid` based selectors: `//button[@data-testid='btn-submit']`
   - Fallback to unique XPath/CSS if no test IDs exist
   - Use PascalCase element keys: `BtnSubmit`, `InputEmail`, `ErrorMessage`

5. **Use data conventions**:
   - `##FieldName` for random test data (names, emails, phones)
   - `{varName}` for values captured during the scenario
   - `$$varName` for cross-scenario persistent values
   - Static values only for fixed selections (dates, dropdown options)

## Available Steps Reference

### Navigation
- `Given I navigate to the application`
- `Given I navigate to '<url>'`

### Actions
- `When I click '<Page.Element>'`
- `When I enter '<value>' into '<Page.Element>'`
- `When I select '<option>' from '<Page.Element>'`
- `When I check '<Page.Element>'` / `When I uncheck '<Page.Element>'`
- `When I upload file '<path>' to '<Page.Element>'`
- `When I hover '<Page.Element>'`
- `When I scroll to '<Page.Element>'`

### Data Capture
- `When I store attribute '<attr>' of '<Page.Element>' as '<varName>'`
- `When I get text from '<Page.Element>' and store as '<varName>'`
- `When I persist '{varName}' as '<key>'`

### Assertions
- `Then '<Page.Element>' should be visible`
- `Then '<Page.Element>' should have text '<expected>'`
- `Then '<Page.Element>' should contain text '<expected>'`
- `Then the url should contain '<fragment>'`
- `Then '<Page.Element>' should be enabled` / `should be disabled`

## Output Files
- `features/web/<story_name>.feature`
- `src/pages/properties/<PageName>.properties` (new or appended)

## Quality Rules
- Negative cases MUST come before positive flows
- Every form submission must verify error messages for empty/invalid input
- Every navigation must assert URL change
- Every state-changing action must have a visibility/text assertion
- Use `##FieldName` for user-generated data, never hardcode names/emails
