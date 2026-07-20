# Requirements: Load Testing

## Introduction

This spec defines the requirements for load/stress testing — simulating concurrent virtual users hitting the TeleConnect login page to validate performance under load.

**Feature file**: `features/performance/loadtest.feature`
**Tags**: `@loadtest`

## Requirements

### Requirement 1: Load Test with 5 Concurrent Users

**User Story:** As a QA engineer, I want to verify the login page handles 5 concurrent users within acceptable performance thresholds.

#### Acceptance Criteria

1. A load test SHALL run on `https://simulapp.online/login` with 5 virtual users for 15 seconds.
2. The average response time SHALL be less than 5000ms.
3. The error rate SHALL be less than 10%.
4. The P95 response time SHALL be less than 10000ms.

### Requirement 2: Load Test with 10 Concurrent Users

**User Story:** As a QA engineer, I want to verify the login page handles 10 concurrent users with good throughput.

#### Acceptance Criteria

1. A load test SHALL run with 10 virtual users for 30 seconds.
2. The average response time SHALL be less than 5000ms.
3. The error rate SHALL be less than 5%.
4. The throughput SHALL be at least 1 request per second.

### Requirement 3: Stress Test with 20 Concurrent Users

**User Story:** As a QA engineer, I want to stress test the login page with 20 concurrent users to find breaking points.

#### Acceptance Criteria

1. A stress test SHALL run with 20 virtual users for 60 seconds.
2. The average response time SHALL be less than 8000ms.
3. The error rate SHALL be less than 20%.
4. The total requests SHALL be at least 20.
