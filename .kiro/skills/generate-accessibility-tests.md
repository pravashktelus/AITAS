# Skill: Generate Accessibility Test Cases

## Description
Generate BDD Gherkin feature files for WCAG accessibility compliance testing from a Jira story or accessibility audit requirements.

## When to Use
- User pastes a Jira story mentioning accessibility, WCAG, a11y, screen reader, keyboard navigation
- Story mentions: compliance, ADA, Section 508, contrast, alt text, ARIA, focus management
- QA requirements include accessibility verification for a page or feature

## Instructions

1. **Determine WCAG level**: A, AA (default), or AAA based on story requirements

2. **Generate the feature file**:
   ```gherkin
   @accessibility @web @a11y
   Feature: <Page/Feature> - Accessibility Compliance
     As a user with disabilities
     I want the <feature> to be accessible
     So that I can use it with assistive technology

     @wcag @regression
     Scenario: <Page> WCAG AA compliance audit
       Given I navigate to the application
       # Navigate to the page under test...
       When I run an accessibility audit
       Then the page should have no critical accessibility violations
       ...
   ```

3. **Include structural checks**:
   - Heading hierarchy (single h1, no skipped levels)
   - Landmark regions (main, nav, header, footer)
   - Image alt text
   - Form labels and error descriptions
   - Skip navigation link

4. **Include interaction checks**:
   - Keyboard navigation (all interactive elements reachable)
   - Focus indicators visible
   - Tab order logical
   - No keyboard traps

5. **Include visual checks**:
   - Color contrast (WCAG 1.4.3)
   - Touch target size (WCAG 2.5.5 — 44x44px minimum)
   - No horizontal scroll at 320px width (WCAG 1.4.10 Reflow)
   - Reduced motion support (WCAG 2.3.3)

## Available Steps Reference

### Full Page Audit
- `When I run an accessibility audit`
- `When I run a WCAG AA accessibility audit`
- `When I run a level A|AA|AAA accessibility audit`

### Violation Assertions
- `Then the page should have no critical accessibility violations`
- `Then the page should have no accessibility violations`
- `Then the page should have no serious|moderate|minor accessibility violations`
- `Then the page should have fewer than <N> accessibility violations`

### Element-Level
- `Then '<Page.Element>' should be accessible`
- `Then '<Page.Element>' should have an accessible name`
- `Then '<Page.Element>' should have aria role '<role>'`
- `Then '<Page.Element>' should have a focus indicator`
- `Then '<Page.Element>' should have an adequate touch target size`

### Structure
- `Then the page should have a single h1 heading`
- `Then the page should have proper heading structure`
- `Then the page should have a main|navigation|header|footer landmark`
- `Then all images should have alt text`
- `Then all links should have meaningful text`
- `Then the page should have a skip navigation link`

### Keyboard
- `When I check keyboard navigation`
- `Then all interactive elements should be keyboard reachable`
- `Then the tab order should be logical`

### Visual / Responsive
- `Then the page should have no color contrast issues`
- `Then the page should not have horizontal scrolling`
- `Then the page should respect reduced motion`
- `Then the page should have a language attribute`

### Forms
- `Then form errors should be identified in text`
- `Then all form inputs should have autocomplete attributes`

### Media
- `Then all videos should have captions`

### ARIA Snapshot
- `When I get the ARIA snapshot`
- `Then the ARIA snapshot should contain '<text>'`

## Output Files
- `features/web/<page_name>_accessibility.feature`

## Quality Rules
- Always run a full audit BEFORE asserting specific violations
- Test keyboard navigation as a separate concern from axe-core audits
- Include both automated (axe-core) and structural (heading, landmark) checks
- Note: Automated tools catch ~30-40% of WCAG issues — flag that manual testing with screen readers is also needed
- Group assertions logically: audit → structure → keyboard → visual → forms
- Use WCAG AA as default level unless story specifies otherwise
