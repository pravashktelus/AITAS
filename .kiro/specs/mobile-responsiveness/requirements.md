# Requirements: Mobile Responsiveness & Device Emulation

## Introduction

This spec defines the requirements for mobile responsiveness testing — verifying the TeleConnect application renders correctly across mobile devices, orientations, network conditions, and viewport sizes using Playwright device emulation.

**Feature file**: `features/web/7_mobile.feature`
**Tags**: `@web`, `@mobile`, `@smoke`

## Requirements

### Requirement 1: Device Emulation — Rendering

**User Story:** As a QA engineer, I want to verify the application loads and renders correctly on emulated mobile devices.

#### Acceptance Criteria

1. WHEN emulating iPhone 14, the login page SHALL load with email, password, and submit fields visible.
2. WHEN emulating Pixel 7, the login page SHALL load with email and submit fields visible.
3. The URL SHALL contain 'login' on the login page.

### Requirement 2: Viewport & Touch Target Compliance

**User Story:** As a QA engineer, I want to confirm form elements fit within the mobile viewport and meet touch target size requirements.

#### Acceptance Criteria

1. Login form elements (email, password, submit) SHALL be within the mobile viewport on iPhone 14.
2. The login submit button SHALL have an adequate touch target size (minimum 44x44px per WCAG 2.5.5).

### Requirement 3: Orientation Handling

**User Story:** As a QA engineer, I want to verify the app adapts to landscape and portrait orientations.

#### Acceptance Criteria

1. WHEN the device is rotated to landscape on iPhone 14, the login email field SHALL remain visible.
2. The page SHALL be responsive at the landscape viewport (844x390).
3. WHEN rotated back to portrait, the login email field SHALL remain visible.

### Requirement 4: Network Condition Testing

**User Story:** As a QA engineer, I want to verify the application loads under throttled network conditions.

#### Acceptance Criteria

1. WHEN 3G network condition is applied, the application SHALL still load (login email visible).
2. WHEN 4G network condition is applied, the application SHALL still load.

### Requirement 5: Responsive Layout Across Viewports

**User Story:** As a QA engineer, I want to verify the page is responsive across standard device viewports.

#### Acceptance Criteria

1. The page SHALL be responsive at the following viewports: 375x667 (iPhone SE), 390x844 (iPhone 14), 412x915 (Pixel 7), 768x1024 (iPad Mini), 1280x720 (Desktop).

### Requirement 6: Touch Gestures

**User Story:** As a QA engineer, I want to verify swipe gestures work on mobile emulation.

#### Acceptance Criteria

1. WHEN emulating iPhone 14, swipe up and swipe down gestures SHALL execute without error.
