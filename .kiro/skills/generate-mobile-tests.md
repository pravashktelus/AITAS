# Skill: Generate Mobile Test Cases

## Description
Generate BDD Gherkin feature files for mobile-specific scenarios — device emulation, gestures, responsive testing, and orientation changes.

## When to Use
- User pastes a Jira story mentioning mobile, responsive, device-specific behavior
- Story mentions: iPhone, Android, tablet, mobile viewport, touch, swipe, gesture, responsive design
- Requirements include testing on specific device sizes or orientations

## Instructions

1. **Determine test type**:
   - **Device emulation** (Playwright) → tag `@mobile @web`
   - **Native app** (Appium) → tag `@native` (use the native-tests skill instead)

2. **Generate the feature file**:
   ```gherkin
   @mobile @web @<domain-tag>
   Feature: <Title> - Mobile Experience
     As a mobile user
     I want to <action>
     So that <value on mobile>

     @regression
     Scenario: <Flow> on mobile device
       Given I emulate device 'iPhone 14'
       Given I navigate to the application
       ...
   ```

3. **Common device names** (Playwright built-in):
   - `iPhone 14`, `iPhone 14 Pro Max`, `iPhone SE`
   - `Pixel 7`, `Galaxy S9+`
   - `iPad Pro 11`, `iPad Mini`

4. **Mobile-specific assertions**:
   - Touch target size (minimum 44x44px for WCAG 2.5.5)
   - Element within viewport (no horizontal overflow)
   - Responsive layout at various breakpoints

## Available Steps Reference

### Device & Viewport
- `Given I emulate device '<deviceName>'`
- `Given I set viewport to <width> by <height>`

### Orientation
- `When I rotate to landscape`
- `When I rotate to portrait`

### Gestures
- `When I swipe up|down|left|right`
- `When I swipe up by <N>px`
- `When I tap '<Page.Element>'`
- `When I long press '<Page.Element>'`
- `When I pinch zoom in|out`

### Network & Location
- `When I set network condition to 'offline|2G|3G|4G|fast'`
- `When I set location to <lat> latitude and <lon> longitude`

### Mobile Assertions
- `Then '<Page.Element>' should be within the viewport`
- `Then '<Page.Element>' should have adequate touch target size`
- `Then '<Page.Element>' touch target should be at least <W> by <H> pixels`
- `Then the page should be responsive at <W> by <H> viewport`
- `Then the current device should be '<deviceName>'`

## Output Files
- `features/web/<story_name>_mobile.feature`
- `src/pages/properties/<PageName>.properties` (if new locators needed)

## Quality Rules
- Always specify device emulation at the start of the scenario
- Test at least 2 breakpoints: mobile (375px) and tablet (768px)
- Verify touch targets are at least 44x44px for interactive elements
- Test both portrait and landscape where relevant
- Include network throttling for performance-sensitive mobile flows
- Check that no horizontal scrolling occurs on mobile viewports
