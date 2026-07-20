# Requirements: TeleConnect API Order Journey

## Introduction

This spec defines the requirements for the TeleConnect API-level order lifecycle testing — validating each REST endpoint independently across the full broadband order flow: auth, master data, order creation, CRM review, installation, and activation.

**Feature file**: `features/api/teleconnect-order-journey.feature`
**Tags**: `@api`, `@teleconnect`, `@order-journey-api`

## Requirements

### Requirement 1: Authentication APIs

**User Story:** As a telecom system, I want to validate user registration and login endpoints.

#### Acceptance Criteria

1. POST `/api/auth/register` with valid data SHALL return status 200–409 (201 on first register, 409 on duplicate).
2. POST `/api/auth/login` with valid credentials SHALL return status 200 with a user object and auth token.
3. POST `/api/auth/login` with wrong password SHALL return status 401.
4. POST `/api/auth/register` with duplicate email SHALL return status 400–409.

### Requirement 2: Master Data APIs

**User Story:** As a telecom system, I want to validate plan and service area lookup endpoints.

#### Acceptance Criteria

1. GET `/api/plans` SHALL return status 200 with a non-empty `plans` array.
2. GET `/api/service-areas` SHALL return status 200 with `serviceAreas` field.

### Requirement 3: Order Creation

**User Story:** As a telecom system, I want to validate the order creation endpoint with authenticated requests.

#### Acceptance Criteria

1. WHEN authenticated, GET `/api/plans` SHALL return plan data with a plan ID that can be stored.
2. WHEN authenticated, GET `/api/service-areas` SHALL return service area data.
3. Orders SHALL be createable using the fetched plan ID and service area.

### Requirement 4: CRM Flow APIs

**User Story:** As a telecom system, I want to validate CRM endpoints for order review and approval.

#### Acceptance Criteria

1. CRM login (crm@telecom.com / crm123) SHALL return status 200 with a token.
2. GET `/api/orders` with CRM token SHALL return status 200.

### Requirement 5: Installation Flow APIs

**User Story:** As a telecom system, I want to validate installation endpoints.

#### Acceptance Criteria

1. Installation login (install@telecom.com / install123) SHALL return status 200 with a token.
2. GET `/api/orders` with installation token SHALL return status 200.

### Requirement 6: Activation Flow APIs

**User Story:** As a telecom system, I want to validate activation endpoints.

#### Acceptance Criteria

1. Activation login (activation@telecom.com / activation123) SHALL return status 200 with a token.
2. GET `/api/orders` with activation token SHALL return status 200.

### Requirement 7: Authorization Guard

**User Story:** As a telecom system, I want to ensure unauthenticated access is rejected.

#### Acceptance Criteria

1. GET `/api/orders` without a bearer token SHALL return status 401.
