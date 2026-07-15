@web @accessibility @a11y
Feature: Accessibility Compliance — WCAG 2.1
  As a QA engineer
  I want to verify the application meets WCAG 2.1 accessibility standards
  So that users with disabilities can use the application effectively

  # ─── Full Page Audit ──────────────────────────────────────────────────────

  @smoke @a11y @audit
  Scenario: Login page — Full WCAG + Lighthouse combined audit
    Given I navigate to the application
    When I run an accessibility audit on 'login-page'
    Then the page should have no critical accessibility violations
    When I run a Lighthouse audit
    Then the Lighthouse accessibility score should be at least 50

  @a11y @audit @lighthouse
  Scenario: Login page — Lighthouse scores check
    Given I navigate to the application
    When I run a Lighthouse audit
    Then the Lighthouse accessibility score should be at least 50
    And the Lighthouse best practices score should be at least 50

  # ─── Images & Alt Text ───────────────────────────────────────────────────

  @a11y @images
  Scenario: All images on the login page have alt text
    Given I navigate to the application
    Then all images should have alt attributes

  # ─── Heading Structure ────────────────────────────────────────────────────

  @a11y @structure
  Scenario: Login page has correct heading hierarchy
    Given I navigate to the application
    Then the page should have proper heading structure

  # ─── Landmark Regions ────────────────────────────────────────────────────

  @a11y @landmarks
  Scenario: Application pages have required landmark regions
    Given I navigate to the application
    Then the page should have a main landmark

  # ─── Element-Level Accessibility ─────────────────────────────────────────

  @a11y @elements
  Scenario: Login form inputs have accessible labels
    Given I navigate to the application
    Then the element 'TeleConnect.LoginEmail' should have an accessible name
    And the element 'TeleConnect.LoginPassword' should have an accessible name
    And the element 'TeleConnect.LoginSubmit' should have an accessible name

  @a11y @elements
  Scenario: Login submit button is accessible
    Given I navigate to the application
    Then the element 'TeleConnect.LoginSubmit' should be accessible

  # ─── Focus Indicators ────────────────────────────────────────────────────

  @a11y @focus
  Scenario: Login email field has a visible focus indicator
    Given I navigate to the application
    Then the element 'TeleConnect.LoginEmail' should have a visible focus indicator

  @a11y @focus
  Scenario: Login submit button has a visible focus indicator
    Given I navigate to the application
    Then the element 'TeleConnect.LoginSubmit' should have a visible focus indicator

  # ─── Keyboard Navigation ─────────────────────────────────────────────────

  @a11y @keyboard
  Scenario: All interactive elements on login page are keyboard reachable
    Given I navigate to the application
    When I check keyboard navigation
    Then all interactive elements should be keyboard reachable

  @a11y @keyboard
  Scenario: Keyboard unreachable elements are within acceptable limit
    Given I navigate to the application
    When I check keyboard navigation
    Then keyboard unreachable element count should be less than 5

  # ─── ARIA Snapshot ───────────────────────────────────────────────────────

  @a11y @aria
  Scenario: ARIA snapshot can be captured and reviewed
    Given I navigate to the application
    When I get the ARIA snapshot
    Then the ARIA snapshot should contain 'WebArea'

  # ─── Mobile + Accessibility Combined ─────────────────────────────────────

  @a11y @mobile @combined
  Scenario: Login page is accessible on mobile viewport
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    When I run an accessibility audit on 'login-mobile'
    Then the page should have no critical accessibility violations
    And 'TeleConnect.LoginSubmit' should have an adequate touch target size
