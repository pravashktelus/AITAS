# Requirements: TeleConnect Order Verification

## Introduction

This spec defines the requirements for the customer-facing verification flow — where a customer logs back into the portal and confirms their broadband order status is "Activated" after the full lifecycle (order → CRM → install → activate) completes.

**Feature file**: `features/web/5_televerify.feature`
**Tags**: `@web`, `@teleconnect_verify`, `@smoke`, `@e2e`

## Requirements

### Requirement 1: Customer Login with Persisted Credentials

**User Story:** As a registered customer, I want to log in with my previously registered credentials to check my order status.

#### Acceptance Criteria

1. The login page SHALL accept email and password from persistent store (`$$Email`, `$$Password`).
2. WHEN valid credentials are submitted, the customer dashboard SHALL load.

### Requirement 2: Order Status Verification

**User Story:** As a customer, I want to see that my broadband order status shows "ACTIVATED" after the full provisioning lifecycle.

#### Acceptance Criteria

1. The dashboard SHALL display an order list with at least one order card.
2. The order status badge SHALL contain the text "ACTIVATED".
3. The order card SHALL be visible with the correct status.

### Requirement 3: Customer Logout

**User Story:** As a customer, I want to log out securely after checking my order status.

#### Acceptance Criteria

1. A logout button SHALL be available.
2. WHEN logout is clicked, the session SHALL end.
