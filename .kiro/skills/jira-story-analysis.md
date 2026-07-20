# Skill: Jira Story Analysis & Test Case Orchestration

## Description
Analyze a pasted Jira story and orchestrate the complete test case generation pipeline — deciding what types of tests to generate, which skills to apply, and producing all necessary artifacts.

## When to Use
- User pastes any Jira story, user story, or acceptance criteria into chat
- User asks "generate tests for this story" or "create test cases from this"
- User provides a requirements document and wants automated test coverage

## Instructions

### Step 1: Parse the Jira Story

Extract these elements from the pasted content:
- **Story ID** (e.g., JIRA-1234, TC-567)
- **Title** — becomes the Feature name
- **Role** (As a...) — becomes the Feature's actor
- **Action** (I want to...) — becomes the Feature's goal
- **Value** (So that...) — becomes the Feature's business justification
- **Acceptance Criteria** — each becomes one or more scenario steps
- **Priority** — determines tag priority (@smoke, @regression, @e2e)
- **Labels/Components** — help determine test type (web, api, mobile)

### Step 2: Classify Test Types Needed

| Signal in Story | Test Type | Tag | Skill to Apply |
|----------------|-----------|-----|----------------|
| UI elements, pages, forms | Web UI | `@web` | generate-web-tests |
| API endpoints, payloads | API | `@api` | generate-api-tests |
| Mobile, responsive | Mobile | `@mobile` | generate-mobile-tests |
| Native app, APK, IPA | Native | `@native` | generate-native-app-tests |
| WCAG, accessibility | A11y | `@accessibility` | generate-accessibility-tests |
| Performance, load, SLA | Perf | `@loadtest` | generate-performance-tests |
| Cross-browser | XBrowser | `@cross-browser` | generate-web-tests (with profile) |

### Step 3: Generate Artifacts

For each identified test type, produce:

1. **Feature file** in the correct `features/<type>/` directory
2. **Locators** in `src/pages/properties/` (apply generate-locators skill)
3. **New steps** if needed (apply generate-step-definitions skill)
4. **Test data** in `testdata/` if complex fixtures are required

### Step 4: Cross-Cutting Concerns

Always check if the story implies:
- **Data dependencies** — does it need data from a previous scenario? Use `$$varName`
- **Multi-step flows** — should this be one long scenario or separate scenarios?
- **Shared setup** — can a `Background:` section reduce duplication?
- **Scenario Outline** — are there multiple data variations to test?

### Step 5: Deliver Summary

After generation, provide:
```
✅ Generated artifacts:
  • features/web/<name>.feature (N scenarios, M steps)
  • src/pages/properties/<Page>.properties (K locators)
  • [Optional] src/steps/<Type>Steps.ts (J new steps)

🏷️ Tags: @web @smoke @e2e
▶️ Run: npm test -- --tags "@<tag>"

⚠️ Notes:
  • [Any gaps or assumptions made]
  • [Any steps that require manual verification]
```

## Decision: Single vs Multiple Scenarios

| Pattern | Use Single Scenario | Use Multiple Scenarios |
|---------|--------------------|-----------------------|
| Linear flow (A→B→C) | ✅ | |
| Independent validations | | ✅ |
| Same flow, different data | | ✅ (Scenario Outline) |
| Negative + Positive of same form | ✅ (negative first) | |
| Different user roles | | ✅ |
| Pre-condition needed from another flow | ✅ (with $$persistent data) | |

## Quality Gates

Before finalizing output:
1. Every acceptance criterion maps to at least one assertion step
2. No orphaned criteria (unaddressed by any scenario)
3. Tags are consistent with `cucumber.yml` profiles
4. Feature file is syntactically valid Gherkin
5. All referenced `Page.Element` keys are either existing or newly generated
6. Run command is provided for immediate execution
