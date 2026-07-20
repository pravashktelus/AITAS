# Requirements: Validate Registered User (Web UI)

## Introduction

This spec defines the requirements for validating that a user registered via the API can successfully log in through the web UI — bridging API and web test flows via PersistentStore.

**Feature file**: `features/web/validate-registered-user.feature`
**Tags**: `@web`, `@teleconnect_registered-user`, `@smoke`, `@login`

## Requirements

### Requirement 1: Login with API-Registered Credentials

**User Story:** As a registered user (created via API), I want to log in to the web application to validate my account works end-to-end.

#### Acceptance Criteria

1. The login form SHALL accept credentials persisted from the API registration flow (`$$Email_viaAPI`, `$$Password_viaAPI`).
2. The email and password fields SHALL be visible before interaction.
3. WHEN valid credentials are submitted, the system SHALL redirect to the customer area.

### Requirement 2: Home Page Validation

**User Story:** As a logged-in user, I want to see my name and the ability to log out.

#### Acceptance Criteria

1. The welcome heading SHALL display the user's full name (`$$FullName_viaAPI`).
2. A logout button SHALL be visible on the home page.
