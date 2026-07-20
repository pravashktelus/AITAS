# Skill: Generate Performance / Load Test Cases

## Description
Generate BDD Gherkin feature files for load testing and performance validation from a Jira story or NFR (non-functional requirements).

## When to Use
- User pastes a Jira story involving performance, load, stress testing, response time SLAs
- Story mentions: concurrent users, throughput, latency, response time, scalability, SLA
- NFRs specify: "page must load in under X seconds", "support N concurrent users"

## Instructions

1. **Extract performance criteria** from the story:
   - Number of concurrent virtual users
   - Test duration
   - Response time thresholds (avg, p95, p99)
   - Acceptable error rate
   - Minimum throughput (requests/second)

2. **Generate the feature file**:
   ```gherkin
   @loadtest @performance
   Feature: <Page/Endpoint> - Performance Testing
     As a performance engineer
     I want to verify <target> can handle expected load
     So that users have a responsive experience

     @nfr
     Scenario: <Target> under <N> concurrent users
       When I run a load test with <N> users for <duration> seconds
       Then the average response time should be less than <threshold>ms
       Then the p95 response time should be less than <threshold>ms
       Then the error rate should be less than <percent> percent
       Then the throughput should be at least <N> requests per second
   ```

3. **Default thresholds** (if not specified in story):
   - Average response time: < 3000ms
   - P95 response time: < 5000ms
   - Error rate: < 5%
   - Throughput: ≥ 2 req/s per virtual user

4. **Custom URL load tests** for specific endpoints:
   ```gherkin
   When I run a load test on 'https://api.example.com/endpoint' with 50 users for 60 seconds
   ```

## Available Steps Reference

### Run Load Test
- `When I run a load test with <N> users for <duration> seconds`
- `When I run a load test on '<url>' with <N> users for <duration> seconds`
- `When I run a load test with <N> users for <duration> seconds with <thinkTime>ms think time`

### Assertions
- `Then the average response time should be less than <N>ms`
- `Then the p50 response time should be less than <N>ms`
- `Then the p90 response time should be less than <N>ms`
- `Then the p95 response time should be less than <N>ms`
- `Then the p99 response time should be less than <N>ms`
- `Then the max response time should be less than <N>ms`
- `Then the error rate should be less than <N> percent`
- `Then the throughput should be at least <N> requests per second`
- `Then the total requests should be at least <N>`

### Data Capture
- `Then I store the load test results as '<varName>'`

## Output Files
- `features/performance/<target_name>_loadtest.feature`

## Quality Rules
- Always specify both users AND duration (avoid unbounded tests)
- Include at least: avg response time, p95, error rate, and throughput assertions
- Use realistic think times (1000-3000ms) to simulate real user behavior
- For API load tests, specify the exact endpoint URL
- Separate load tests from stress tests (stress uses higher user counts to find breaking point)
- Document the SLA thresholds in scenario comments for traceability
- Tag with `@nfr` for non-functional requirement traceability
