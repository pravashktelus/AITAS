# Workflow Rules

## Development Mode

- **All development work MUST use Specs mode** (structured requirements → design → tasks workflow)
- Never jump straight into implementation without going through the spec process
- Use Vibe mode only for questions, explanations, quick lookups, or exploratory discussions

## Clarification Policy

- **Always ask follow-up questions** if anything in the user's request is unclear, ambiguous, or incomplete
- Do NOT assume or guess when information is missing — ask first, build second
- Specifically ask about:
  - Missing acceptance criteria or edge cases
  - Unclear user roles or personas
  - Ambiguous UI element names or page flows
  - Missing API contract details (endpoints, payloads, status codes)
  - Performance thresholds not specified
  - Platform/browser scope not defined
  - Priority/severity of the test (smoke, regression, e2e)
  - Dependencies on other stories or existing flows

## Spec Workflow Enforcement

When the user provides a Jira story or asks to build/implement something:

1. **Requirements phase** — clarify all ambiguities, confirm acceptance criteria
2. **Design phase** — propose the test structure, tags, file locations
3. **Tasks phase** — break into implementation tasks (feature file, locators, steps)
4. **Implementation** — execute tasks one by one with verification

Never skip phases. If the user says "just do it" — still confirm critical assumptions before proceeding.
