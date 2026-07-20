# Requirements: API CRUD Testing (JSONPlaceholder)

## Introduction

This spec defines the requirements for the REST API CRUD testing feature — verifying full create, read, update, delete lifecycle operations against the JSONPlaceholder public API. This demonstrates the framework's API testing capabilities.

**Feature file**: `features/api/crud_reqres_api.feature`
**Tags**: `@api`, `@jsonplaceholder`, `@crud`

## Requirements

### Requirement 1: Create (POST)

**User Story:** As an automation engineer, I want to verify POST requests create resources correctly.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/posts` with title, body, and userId, THEN the response status SHALL be 201.
2. The response SHALL echo back the submitted title and body fields.
3. The response SHALL include an auto-generated `id` field.
4. Response time SHALL be less than 5000ms.
5. Random data via `##Company` and `##Address` syntax SHALL be resolved and submitted.

### Requirement 2: Read (GET)

**User Story:** As an automation engineer, I want to verify GET requests retrieve resources correctly.

#### Acceptance Criteria

1. GET `/posts` SHALL return status 200 with an array of posts.
2. GET `/posts/1` SHALL return status 200 with the correct `id` and `userId`.
3. GET `/posts/1/comments` SHALL return comments with the correct `postId`.
4. GET `/posts/99999` (non-existent) SHALL return status 404.
5. Response time for single post GET SHALL be less than 5000ms.

### Requirement 3: Update (PUT & PATCH)

**User Story:** As an automation engineer, I want to verify PUT and PATCH requests update resources correctly.

#### Acceptance Criteria

1. PUT `/posts/1` with full body SHALL return status 200 with updated fields.
2. PATCH `/posts/1` with partial body SHALL return status 200 with only the patched field updated.

### Requirement 4: Delete

**User Story:** As an automation engineer, I want to verify DELETE requests remove resources correctly.

#### Acceptance Criteria

1. DELETE `/posts/1` SHALL return status 200.

### Requirement 5: E2E CRUD Lifecycle

**User Story:** As an automation engineer, I want to verify the complete CRUD lifecycle in a single scenario.

#### Acceptance Criteria

1. A single scenario SHALL execute: Create → Read → Update (PUT) → Update (PATCH) → Delete in sequence.
2. The created resource ID SHALL be stored and used in subsequent steps.
3. Each step SHALL validate the correct status code and field values.

### Requirement 6: Users Endpoints

**User Story:** As an automation engineer, I want to validate user-related API endpoints.

#### Acceptance Criteria

1. GET `/users` SHALL return a list with name, email, and address fields.
2. GET `/users/1` SHALL return the specific user with expected data.
3. GET `/users/1/posts` SHALL return posts belonging to user 1.

### Requirement 7: Todos & Albums Endpoints

**User Story:** As an automation engineer, I want to validate todo and album endpoints.

#### Acceptance Criteria

1. GET `/todos` SHALL return items with title and completed fields.
2. GET `/albums` SHALL return items with title and userId.
3. GET `/albums/1/photos` SHALL return photos with url and thumbnailUrl.

### Requirement 8: Response Time Performance

**User Story:** As an automation engineer, I want to assert API response times are within acceptable limits.

#### Acceptance Criteria

1. GET `/posts/1` response time SHALL be less than 2000ms.
