# Requirements: TeleConnect Broadband Activation

## Introduction

This spec defines the requirements for the activation module — the workflow where activation technicians configure network equipment and enable broadband service after physical installation is complete.

**Feature file**: `features/web/4_teleactivate.feature`
**Tags**: `@web`, `@teleconnect_activate`, `@smoke`, `@e2e`

## Requirements

### Requirement 1: Activation Login

**User Story:** As an activation technician, I want to log into the activation portal to activate connections.

#### Acceptance Criteria

1. The Activate quick-login button SHALL be visible on the login page.
2. WHEN the technician logs in, the Activation heading SHALL be visible.

### Requirement 2: Search Order for Activation

**User Story:** As an activation technician, I want to find orders ready for activation by Order ID.

#### Acceptance Criteria

1. A search field SHALL accept the Order ID (`$$OrderId`).
2. WHEN searched, the activation order card SHALL be displayed.

### Requirement 3: Configure Network Equipment

**User Story:** As an activation technician, I want to enter port and OLT device details for the broadband connection.

#### Acceptance Criteria

1. WHEN "Start Activation" is clicked, input fields SHALL appear for Port Number and OLT Device.
2. The technician SHALL enter port and OLT device identifiers.
3. A "Begin Activation" button SHALL initiate the activation process.

### Requirement 4: Complete Activation Verification

**User Story:** As an activation technician, I want to verify that the connection is working before finalizing.

#### Acceptance Criteria

1. An "Activate" button SHALL present the verification checklist.
2. The checklist SHALL include: Port assigned, Signal verified, Bandwidth configured, Ping test passed.
3. WHEN all checks pass and "Activate Connection" is clicked, the order SHALL be marked as Activated.

### Requirement 5: Activation Logout

**User Story:** As an activation technician, I want to log out after completing activations.

#### Acceptance Criteria

1. A logout button SHALL be available.
2. WHEN logout is clicked, the session SHALL end.
