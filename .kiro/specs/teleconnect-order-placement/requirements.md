# Requirements: TeleConnect Order Placement (Web UI)

## Introduction

This spec defines the requirements for the TeleConnect customer-facing order placement flow — a multi-step web UI wizard that takes a new customer through registration, dashboard access, and a 6-step broadband connection order.

**Feature file**: `features/web/1_teleconnect.feature`
**Tags**: `@web`, `@teleconnect_orderingestion`, `@smoke`, `@e2e`, `@loadtest`

## Requirements

### Requirement 1: User Registration

**User Story:** As a new customer, I want to register an account with my name, email, and password so that I can access the TeleConnect platform.

#### Acceptance Criteria

1. WHEN a user submits the registration form with valid name, email, and password, THEN the system SHALL create an account and redirect to the customer dashboard.
2. WHEN the registration form is submitted without a name, THEN the system SHALL display a validation error on the name field.
3. The URL after successful registration SHALL contain 'customer'.
4. The welcome heading SHALL be visible on the dashboard after registration.

### Requirement 2: Dashboard Verification

**User Story:** As a registered customer, I want to see my order statistics on the dashboard so I know my account status.

#### Acceptance Criteria

1. The dashboard SHALL display Total Orders, In Progress, and Activated statistics.
2. A "New Connection" button SHALL be visible to initiate an order.

### Requirement 3: Order Step 1 — Customer Information

**User Story:** As a customer, I want to enter my personal details so the telecom provider knows who I am.

#### Acceptance Criteria

1. WHEN the form is submitted without required fields, THEN validation errors SHALL appear for: Full name, Email, Phone, Address, ID Type, and ID Number.
2. The form SHALL accept: name, email, DOB, gender, phone, alt phone, address, ID type, and ID number.
3. WHEN all required fields are filled, clicking Next SHALL advance to Step 2.

### Requirement 4: Order Step 2 — Location

**User Story:** As a customer, I want to specify my installation location so the provider can determine serviceability.

#### Acceptance Criteria

1. The step badge SHALL display "Step 2".
2. The form SHALL provide dropdowns for State, City, and Area plus a text field for installation address.
3. WHEN location is selected and Next is clicked, the wizard SHALL advance to Step 3.

### Requirement 5: Order Step 3 — Plan Selection

**User Story:** As a customer, I want to choose a broadband plan that suits my needs.

#### Acceptance Criteria

1. The step badge SHALL display "Step 3".
2. Available plan options SHALL include: Entertainment, WiFi + Phone, WiFi + Entertainment, All-in-One.
3. WHEN a plan is selected and Next is clicked, the wizard SHALL advance to Step 4.

### Requirement 6: Order Step 4 — Offers

**User Story:** As a customer, I want to see any available offers and a price summary before scheduling.

#### Acceptance Criteria

1. The step badge SHALL display "Step 4".
2. A price summary SHALL be visible.
3. The customer SHALL be able to select "No offer" and proceed to Step 5.

### Requirement 7: Order Step 5 — Schedule Installation

**User Story:** As a customer, I want to schedule my installation appointment.

#### Acceptance Criteria

1. The step badge SHALL display "Step 5".
2. The form SHALL accept: preferred date, time slot (Morning/Afternoon/Evening), and special instructions.
3. WHEN scheduling is complete and Next is clicked, the wizard SHALL advance to Step 6.

### Requirement 8: Order Step 6 — Confirm & Submit

**User Story:** As a customer, I want to review and submit my order.

#### Acceptance Criteria

1. The step badge SHALL display "Step 6".
2. A Submit Order button SHALL be available.
3. WHEN the order is submitted, the system SHALL display an Order Success page with: order number and expected date.
4. The order number SHALL be capturable for downstream CRM/Install/Activate flows.

### Requirement 9: Self-Healing Locator Test

**User Story:** As a framework user, I want the self-healing engine to recover when a button's test-id changes at runtime.

#### Acceptance Criteria

1. WHEN JavaScript modifies a button's `data-testid`, the self-healing engine SHALL find the element using alternative locator strategies.
2. The scenario SHALL still pass after the DOM mutation.
