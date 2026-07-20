# Skill: Generate Native App Test Cases

## Description
Generate BDD Gherkin feature files for native Android/iOS app testing via Appium (local or BrowserStack/LambdaTest cloud).

## When to Use
- User pastes a Jira story for native mobile app testing (Android APK, iOS IPA)
- Story mentions: native app, Appium, Android, iOS, app gestures, app lifecycle, hybrid app
- Requirements involve testing on real devices or cloud device farms

## Instructions

1. **Determine platform**:
   - Android → tag `@native @android`
   - iOS → tag `@native @ios`
   - Both → separate scenarios per platform

2. **Generate the feature file**:
   ```gherkin
   @native @android
   Feature: <App Section> - Native App Testing
     As a mobile app user
     I want to <action in app>
     So that <value>

     @smoke
     Scenario: <Flow description>
       Given I launch the app
       When I tap native 'AppPage.Element'
       ...
       Then native 'AppPage.ResultElement' should be visible
   ```

3. **Element locators for native apps** use the same `.properties` pattern:
   ```properties
   # NativeLogin.properties
   InputUsername=accessibility_id:username_field
   InputPassword=accessibility_id:password_field
   BtnLogin=accessibility_id:login_button
   LabelWelcome=xpath://*[@text='Welcome']
   ```

   **Locator strategies**: `accessibility_id:`, `xpath:`, `id:`, `class:`

4. **Handle hybrid apps** with context switching:
   ```gherkin
   When I switch to webview context
   # ...web interactions...
   When I switch to native context
   ```

## Available Steps Reference

### App Lifecycle
- `Given I launch the app`
- `Given I close the app`
- `Given I reset the app`

### Interactions
- `When I tap native '<Page.Element>'`
- `When I tap on text '<text>'`
- `When I enter '<value>' into native '<Page.Element>'`
- `When I clear native '<Page.Element>'`
- `When I long press '<Page.Element>'`

### Gestures
- `When I swipe '<direction>'`
- `When I swipe '<direction>' on '<Page.Element>'`
- `When I scroll '<direction>'`
- `When I scroll '<direction>' until '<Page.Element>' is visible`

### Navigation
- `When I press back`
- `When I hide the keyboard`
- `When I accept the native alert`
- `When I dismiss the native alert`

### Context Switching (Hybrid)
- `When I switch to webview context`
- `When I switch to native context`

### Assertions
- `Then native '<Page.Element>' should be visible`
- `Then native '<Page.Element>' should not be visible`
- `Then native '<Page.Element>' should have text '<expected>'`
- `Then native '<Page.Element>' should contain text '<expected>'`
- `Then native '<Page.Element>' should be enabled`
- `Then native '<Page.Element>' should be disabled`

### Data Capture
- `When I store text of native '<Page.Element>' as '<varName>'`

## Output Files
- `features/native/<app_name>_<platform>.feature`
- `src/pages/properties/<NativePageName>.properties`

## Quality Rules
- Always start with `Given I launch the app`
- Use `accessibility_id:` strategy as first preference (cross-platform)
- Include retry-friendly waits (native elements have built-in 15s polling)
- Handle keyboard dismissal before scrolling or navigating
- Test both orientations if the app supports landscape
- For hybrid apps, explicitly switch contexts and back
- Store element text for verification in subsequent steps
