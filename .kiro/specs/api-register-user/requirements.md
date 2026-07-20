# Requirements: TeleConnect Register User API

## Introduction

This spec defines the requirements for the API-level user registration — creating a customer account via the REST API and persisting credentials for downstream UI validation.

**Feature file**: `features/api/registeruser_api.feature`
**Tags**: `@api`, `@teleconnect`, `@register-user-api`

## Requirements

### Requirement 1: Register New Customer via API

**User Story:** As a telecom user, I want to register my details via the API so that my account is created for subsequent UI testing.

#### Acceptance Criteria

1. POST `/api/auth/register` with name, email, password, and phone SHALL return status 200–409.
2. The API base URL SHALL be resolved from `{api.baseUrl}` in framework.properties.
3. After registration, the credentials (FullName, Email, Password) SHALL be persisted via PersistentStore for cross-scenario use (`$$FullName_viaAPI`, `$$Email_viaAPI`, `$$Password_viaAPI`).
