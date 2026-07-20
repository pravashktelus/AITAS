# Skill: Generate API Test Cases

## Description
Generate BDD Gherkin feature files for REST API scenarios from a Jira story, Swagger/OpenAPI spec, or requirements description.

## When to Use
- User pastes a Jira story involving API endpoints, request/response validation, CRUD operations
- User provides an OpenAPI/Swagger spec to test
- Story mentions: API, endpoint, REST, request, response, status code, payload, authentication

## Instructions

1. **Analyze** the API requirements to identify:
   - HTTP methods (GET, POST, PUT, PATCH, DELETE)
   - Endpoint paths with parameters
   - Request body structure
   - Expected response status codes
   - Response body field validations
   - Authentication requirements (Bearer token, API key)
   - Error responses (4xx, 5xx)

2. **Generate the feature file** following this structure:
   ```gherkin
   @api @<domain-tag>
   Feature: <API Resource Name> - <Action>
     As a <consumer role>
     I want to <API action>
     So that <business value>

     @smoke
     Scenario: <HTTP Method> <resource> - <case description>
       Given I set base url to '<baseUrl>'
       Given I set bearer token '{authToken}'
       When I send a <METHOD> request to '<endpoint>' with body:
         | key | value |
       Then the response status should be <code>
       Then the response body field '<path>' should equal '<value>'
   ```

3. **Structure test scenarios** per CRUD operation:
   - **Create (POST)** — positive with valid body + negative with missing/invalid fields
   - **Read (GET)** — single resource + list/collection + not found (404)
   - **Update (PUT/PATCH)** — positive + partial update + non-existent resource
   - **Delete (DELETE)** — positive + already deleted (404/410)

4. **Chain API calls** using variable capture:
   ```gherkin
   When I send a POST request to '/users' with body:
     | name | ##FullName |
     | email | ##Email |
   Then the response status should be 201
   And I store response field 'id' as 'userId'
   # Now use {userId} in subsequent requests
   When I send a GET request to '/users/{userId}'
   ```

5. **Validate response time** for performance-sensitive APIs:
   ```gherkin
   Then the response time should be less than 2000ms
   ```

## Available Steps Reference

### Setup
- `Given I set base url to '<url>'`
- `Given I set bearer token '<token>'`
- `Given I set api key '<key>' in header '<headerName>'`
- `Given I clear auth`

### Requests
- `When I send a GET request to '<endpoint>'`
- `When I send a GET request to '<endpoint>' with query params:`
- `When I send a POST|PUT|PATCH request to '<endpoint>' with body:`
- `When I send a POST|PUT|PATCH request to '<endpoint>' with JSON:`
- `When I send a DELETE request to '<endpoint>'`

### Response Assertions
- `Then the response status should be <code>`
- `Then the response status should be in range <min> to <max>`
- `Then the response header '<name>' should be '<value>'`
- `Then the response body field '<path>' should equal '<value>'`
- `Then the response body field '<path>' should contain '<value>'`
- `Then the response body field '<path>' should exist`
- `Then the response body field '<path>' should not be empty`
- `Then the response body field '<path>' should have <N> items`
- `Then the response body field '<path>' should be a non-empty array`
- `Then the response time should be less than <N>ms`

### Data Capture
- `Then I store response field '<path>' as '<varName>'`
- `Then I store response status as '<varName>'`

## Output Files
- `features/api/<resource_name>_api.feature`

## Quality Rules
- Always set base URL explicitly at the start of each scenario
- Test both success (2xx) and error (4xx/5xx) status codes
- Validate response body structure, not just status codes
- Use `##FieldName` for generated request data
- Chain related API calls using stored variables `{varName}`
- Include response time assertions for critical endpoints
- Group CRUD operations in a logical sequence: Create → Read → Update → Delete
