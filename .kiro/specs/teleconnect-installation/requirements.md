# Requirements: TeleConnect Installation Process

## Introduction

This spec defines the requirements for the installation module — the workflow where installation technicians schedule and complete broadband hardware installations for approved orders.

**Feature file**: `features/web/3_teleinstall.feature`
**Tags**: `@web`, `@teleconnect_install`, `@smoke`, `@e2e`

## Requirements

### Requirement 1: Installation Login

**User Story:** As an installation technician, I want to log into the installation portal to view my assigned work.

#### Acceptance Criteria

1. The Install quick-login button SHALL be visible on the login page.
2. WHEN the technician logs in, the Install home page SHALL load.

### Requirement 2: Schedule Installation

**User Story:** As an installation technician, I want to schedule an installation date and time for an approved order.

#### Acceptance Criteria

1. The Install home page SHALL provide a search field for Order ID.
2. WHEN the Order ID (`$$OrderId`) is searched, the order card SHALL be visible.
3. The technician SHALL be able to: click Schedule, enter a date, select a time slot (Morning/Afternoon/Evening), and enter a technician name.
4. WHEN scheduling is confirmed, the order status SHALL update to "Scheduled".

### Requirement 3: Complete Installation

**User Story:** As an installation technician, I want to mark an installation as complete after verifying all checklist items.

#### Acceptance Criteria

1. A "Complete" button SHALL appear for scheduled orders.
2. The completion checklist SHALL include: Cable connection, Router setup, Speed test, Customer sign-off.
3. WHEN all checklist items are checked and completion is confirmed, the order SHALL move to the activation stage.

### Requirement 4: Installation Logout

**User Story:** As an installation technician, I want to log out after completing my tasks.

#### Acceptance Criteria

1. A logout button SHALL be available.
2. WHEN logout is clicked, the session SHALL end.
