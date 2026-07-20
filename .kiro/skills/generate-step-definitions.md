# Skill: Generate New Step Definitions

## Description
Create new Cucumber step definitions when a Jira story requires behavior not covered by existing steps.

## When to Use
- A generated feature file needs steps that don't exist in the current step definition files
- User asks to add a new reusable step for a specific interaction pattern
- An acceptance criterion requires custom logic beyond basic click/enter/assert

## Instructions

1. **Check existing steps first** — search through:
   - `src/steps/WebSteps.ts` — web UI actions and assertions
   - `src/steps/ApiSteps.ts` — HTTP request/response
   - `src/steps/CommonSteps.ts` — shared utilities (data, logging)
   - `src/steps/MobileSteps.ts` — device emulation, gestures
   - `src/steps/AccessibilitySteps.ts` — WCAG audits
   - `src/steps/NativeAppSteps.ts` — Appium interactions
   - `src/steps/LoadTestSteps.ts` — performance testing

2. **Only create new steps if** no existing step covers the behavior (even partially)

3. **Follow the existing pattern**:
   ```typescript
   import { Given, When, Then } from '@cucumber/cucumber';
   import { CustomWorld } from '../core/CustomWorld';
   import { Logger } from '../utils/Logger';

   When(
     /^I <regex pattern>$/,
     async function (this: CustomWorld, param1: string) {
       // Implementation using this.actionEngine, this.apiEngine, etc.
       Logger.info(`Step completed: ${param1}`);
     }
   );
   ```

4. **Step definition rules**:
   - Use regex matchers (not Cucumber expressions) for consistency
   - Always type `this: CustomWorld` as the function context
   - Use `async function` (not arrow functions — Cucumber needs `this` binding)
   - Access engines via `this.actionEngine`, `this.apiEngine`, `this.mobileEngine`, etc.
   - Log with `Logger.info/warn/error` (never `console.log`)
   - Throw descriptive `Error` messages for assertion failures
   - Use single quotes in regex for element/value capture groups: `['"](.+)['"]`

5. **Place in the correct file**:
   | Step Type | File |
   |-----------|------|
   | Web UI interaction/assertion | `WebSteps.ts` |
   | API request/response | `ApiSteps.ts` |
   | Data management, logging | `CommonSteps.ts` |
   | Mobile/device-specific | `MobileSteps.ts` |
   | Accessibility checks | `AccessibilitySteps.ts` |
   | Native app interactions | `NativeAppSteps.ts` |
   | Performance/load | `LoadTestSteps.ts` |

## Output Files
- `src/steps/<appropriate>Steps.ts` (appended to existing file)

## Quality Rules
- NEVER duplicate existing step regex patterns
- Keep step definitions thin — delegate logic to engine classes
- Use TypeScript strict types for all parameters
- Regex patterns must be unambiguous (no overlap with existing steps)
- New steps must work with the self-healing engine (use `this.actionEngine.getLocator()`)
- Include JSDoc comment explaining the step's purpose
- Error messages must be actionable ("Expected X but got Y" pattern)
- Imports must use project path aliases: `@core/`, `@utils/`, `@config/`
