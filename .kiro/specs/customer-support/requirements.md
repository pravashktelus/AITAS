# Requirements: Customer Support Ticket Creation

## Introduction

This spec defines the requirements for the customer support feature — where a registered customer with an existing order can raise a support ticket for technical issues directly from the orders page.

**Feature file**: `features/web/6_customersupport.feature`
**Tags**: `@web`, `@customersupport_web`, `@smoke`, `@e2e`

## Requirements

### Requirement 1: Customer Login for Support

**User Story:** As a registered customer, I want to log into the platform to access support features.

#### Acceptance Criteria

1. The login form SHALL accept persisted credentials (`$$Email`, `$$Password`).
2. WHEN valid credentials are submitted, the system SHALL redirect to the customer area.

### Requirement 2: Navigate to Orders & View Details

**User Story:** As a customer, I want to navigate to my orders list and view details of a specific order.

#### Acceptance Criteria

1. A navigation link to Orders SHALL be available.
2. The orders page URL SHALL contain 'orders'.
3. An "Orders" heading SHALL be visible.
4. A "View Details" button SHALL be available for each order.

### Requirement 3: Create Support Ticket

**User Story:** As a customer, I want to create a support ticket for a technical issue with my broadband connection.

#### Acceptance Criteria

1. A "Support" button SHALL be available on the order details page.
2. WHEN Support is clicked, a dialog SHALL appear with heading and form fields.
3. The form SHALL include: Issue type dropdown, Issue title, and Description.
4. Issue type options SHALL include "Technical Issue".
5. WHEN the ticket form is submitted, a success toast SHALL appear.

### Requirement 4: Verify Ticket Status

**User Story:** As a customer, I want to see my created ticket with an "OPEN" status.

#### Acceptance Criteria

1. After creation, the ticket status SHALL display "OPEN".
2. The ticket status SHALL be visually indicated with red color.
3. WHEN the ticket card is expanded, the Ticket ID SHALL be visible and capturable for reporting.
