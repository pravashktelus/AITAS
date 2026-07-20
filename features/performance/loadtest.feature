@loadtest
Feature: Load Testing - TeleConnect Application
  Standalone load test scenarios - run only with @loadtest tag explicitly

  @loadtest
  Scenario: Load test login page with 5 concurrent users
    When I run a load test on 'https://simulapp.online/login' with 5 users for 15 seconds
    Then the average response time should be less than 5000 ms
    And the error rate should be less than 10 percent
    And the p95 response time should be less than 10000 ms

  @loadtest
  Scenario: Load test login page with 10 concurrent users
    When I run a load test on 'https://simulapp.online/login' with 10 users for 30 seconds
    Then the average response time should be less than 5000 ms
    And the error rate should be less than 5 percent
    And the throughput should be at least 1 requests per second

  @loadtest
  Scenario: Stress test login page with 20 concurrent users
    When I run a load test on 'https://simulapp.online/login' with 20 users for 60 seconds
    Then the average response time should be less than 8000 ms
    And the error rate should be less than 20 percent
    And the total requests should be at least 20
