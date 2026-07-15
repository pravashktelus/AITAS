@web @mobile
Feature: Mobile Responsiveness & Device Emulation
  As a QA engineer
  I want to verify the application works correctly on mobile devices
  So that mobile users have a seamless experience

  # ─── iPhone 14 ───────────────────────────────────────────────────────────────

  @smoke @mobile @iphone
  Scenario: Application loads and renders correctly on iPhone 14
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    Then the url should contain 'login'
    And 'TeleConnect.LoginEmail' should be visible
    And 'TeleConnect.LoginPassword' should be visible
    And 'TeleConnect.LoginSubmit' should be visible

  @mobile @iphone
  Scenario: Login form elements are within viewport on iPhone 14
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    Then 'TeleConnect.LoginEmail' should be within the mobile viewport
    And 'TeleConnect.LoginPassword' should be within the mobile viewport
    And 'TeleConnect.LoginSubmit' should be within the mobile viewport

  @mobile @iphone @touch
  Scenario: Login submit button meets touch target size requirements
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    Then 'TeleConnect.LoginSubmit' should have an adequate touch target size

  # ─── Android (Pixel 7) ────────────────────────────────────────────────────

  @smoke @mobile @android
  Scenario: Application loads correctly on Pixel 7
    Given I emulate device 'Pixel 7'
    And I navigate to the application
    Then 'TeleConnect.LoginEmail' should be visible
    And 'TeleConnect.LoginSubmit' should be visible

  # ─── Orientation Tests ────────────────────────────────────────────────────

  @mobile @orientation
  Scenario: Application handles landscape orientation on iPhone 14
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    When I rotate the device to landscape
    Then 'TeleConnect.LoginEmail' should be visible
    And the page should be responsive at 844 by 390 viewport
    When I rotate the device to portrait
    Then 'TeleConnect.LoginEmail' should be visible

  # ─── Network Conditions ───────────────────────────────────────────────────

  @mobile @network
  Scenario: Application loads on 3G network conditions
    Given I emulate device 'iPhone 14'
    When I set network condition to '3G'
    And I navigate to the application
    Then 'TeleConnect.LoginEmail' should be visible

  @mobile @network
  Scenario: Application handles 4G network conditions
    Given I emulate device 'Pixel 7'
    When I set network condition to '4G'
    And I navigate to the application
    Then 'TeleConnect.LoginEmail' should be visible

  # ─── Responsive Layout ────────────────────────────────────────────────────

  @mobile @responsive
  Scenario Outline: Page is responsive across multiple viewport sizes
    Given I navigate to the application
    Then the page should be responsive at <width> by <height> viewport

    Examples:
      | width | height | label          |
      | 375   | 667    | iPhone SE      |
      | 390   | 844    | iPhone 14      |
      | 412   | 915    | Pixel 7        |
      | 768   | 1024   | iPad Mini      |
      | 1280  | 720    | Desktop        |

  # ─── Swipe Gestures ───────────────────────────────────────────────────────

  @mobile @gestures
  Scenario: User can swipe to scroll content on mobile
    Given I emulate device 'iPhone 14'
    And I navigate to the application
    When I swipe up
    When I swipe down
