# Workflow Rules

## Development Mode

- **Complex feature development** (new engines, multi-file refactors, architectural changes) SHOULD use Specs mode
- **Test script generation** from Jira stories or test cases → use **Fast-Track mode** (see below)
- Use Vibe mode for questions, explanations, quick lookups, or exploratory discussions

## Fast-Track Mode (Jira Stories & Test Cases)

When the user provides a Jira story, test case, or asks to generate test scripts:

1. **If the story/test case has clear acceptance criteria** → generate directly without asking clarification questions
2. **If critical information is missing** (e.g., no page/flow mentioned, no expected behavior) → ask at most 2-3 focused questions, then generate
3. **Output immediately**: feature file + locators + any new steps needed
4. **Do NOT force the 4-phase spec process** for test script generation
5. **Do NOT ask about**: priority tags (default to `@smoke @regression`), browser scope (default to web), file naming (follow conventions automatically)

### Mandatory: Live DOM Inspection via Playwright MCP

When generating feature files and/or properties (locator) files:

1. **ALWAYS use Playwright MCP** to browse the live application and inspect actual element selectors
2. **NEVER guess locators** — navigate to the relevant page, inspect the DOM, and extract real `data-testid`, `role`, `placeholder`, `aria-label` attributes
3. **Flow**: Login to app → navigate to the target page/flow → snapshot the DOM → extract locators → then write the feature + properties files
4. **App URL**: https://simulapp.online/ (Login: admin@gmail.com / admin1234)
5. **If Playwright MCP is unavailable**, explicitly tell the user that locators need verification and mark them with `# TODO: verify locator` comments

### What counts as "clear enough to generate directly":
- Jira story with acceptance criteria listed
- Test case with steps and expected results
- User describes a flow with enough detail to identify page elements
- User pastes UI screenshots or mockups with labeled fields

### What requires clarification:
- No acceptance criteria AND no steps described
- Ambiguous which application section the test is for
- Contradictory requirements

## Full Spec Mode (Complex Development)

For new framework features, engine additions, or architectural changes:

1. **Requirements phase** — clarify ambiguities, confirm scope
2. **Design phase** — propose structure, interfaces, integration points
3. **Tasks phase** — break into implementation tasks
4. **Implementation** — execute with verification

## Clarification Policy

- For test generation: ask ONLY if genuinely blocked (missing which page/app section, contradictory AC)
- For complex development: ask about edge cases, interfaces, and dependencies
- Never ask about things that have sensible defaults (tags, file locations, naming)
