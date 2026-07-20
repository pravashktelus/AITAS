# Requirements: Native Mobile App Testing (Android & iOS)

## Introduction

This spec defines the requirements for native mobile app testing using Appium — validating login, cart, gestures, and menu interactions on the SwagLabs demo app for both Android and iOS platforms.

**Feature files**: `features/native/android_login.feature`, `features/native/ios_login.feature`
**Tags**: `@native`, `@android`, `@ios`

## Requirements

### Requirement 1: Android Login — Positive

**User Story:** As a QA engineer, I want to verify the SwagLabs Android app login works with valid credentials.

#### Acceptance Criteria

1. WHEN `standard_user` / `secret_sauce` is entered and Login is tapped, the cart icon SHALL be visible (indicating successful login to product page).

### Requirement 2: Android Login — Negative

**User Story:** As a QA engineer, I want to verify the SwagLabs Android app shows an error for locked-out users.

#### Acceptance Criteria

1. WHEN `locked_out_user` / `secret_sauce` is entered and Login is tapped, an error message SHALL be visible.

### Requirement 3: Android Add to Cart

**User Story:** As a QA engineer, I want to verify a product can be added to the cart after login.

#### Acceptance Criteria

1. After login, tapping "Add to Cart" and then the cart icon SHALL show the Checkout button.

### Requirement 4: Android Swipe Gesture

**User Story:** As a QA engineer, I want to verify swipe gestures work in the product list.

#### Acceptance Criteria

1. After login, swiping up SHALL scroll the product list without errors.
2. The cart icon SHALL remain visible after swiping.

### Requirement 5: Android Menu & Logout

**User Story:** As a QA engineer, I want to verify the side menu and logout work correctly.

#### Acceptance Criteria

1. After login, tapping Menu and then Logout SHALL return to the login screen.
2. The Login button SHALL be visible after logout.

### Requirement 6: iOS Login — Positive

**User Story:** As a QA engineer, I want to verify the SwagLabs iOS app login works with valid credentials.

#### Acceptance Criteria

1. WHEN `standard_user` / `secret_sauce` is entered and Login is tapped, the cart icon SHALL be visible.

### Requirement 7: iOS Login — Negative

**User Story:** As a QA engineer, I want to verify the SwagLabs iOS app shows an error for locked-out users.

#### Acceptance Criteria

1. WHEN `locked_out_user` / `secret_sauce` is entered and Login is tapped, an error message SHALL be visible.

### Requirement 8: iOS Add to Cart

**User Story:** As a QA engineer, I want to verify a product can be added to the cart on iOS.

#### Acceptance Criteria

1. After login, tapping "Add to Cart" SHALL update the cart (cart icon visible).
