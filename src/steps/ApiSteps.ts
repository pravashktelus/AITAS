import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld } from '../core/CustomWorld';
import { ApiEngine, ApiResponseContext } from '../core/ApiEngine';
import { ResponseValidator } from '../utils/ResponseValidator';
import { DataStore } from '../utils/DataStore';
import { Logger } from '../utils/Logger';
import { PropertiesLoader } from '../utils/PropertiesLoader';

// =============================================================================
// API STEP DEFINITIONS
// =============================================================================
// These step definitions drive HTTP requests using ApiEngine.
//
// STEP SYNTAX GUIDE:
// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE REQUEST:
//   When I send a GET request to '/api/users/2'
//   When I send a POST request to '/api/users' with body:
//     | key      | value     |
//     | name     | John      |
//     | job      | Dev       |
//
// AUTH:
//   Given I set bearer token '{authToken}'
//   Given I set api key 'mykey' in header 'x-api-key'
//
// ASSERTIONS:
//   Then the response status should be 200
//   Then the response body field 'data.first_name' should equal 'Janet'
//   Then the response body field 'data' should be an array
//   Then the response time should be less than 2000ms
//
// CAPTURE:
//   And I store response field 'id' as 'userId'
//   Then I send a PUT request to '/api/users/{userId}'
// =============================================================================

// ─── Allure Request/Response Attachment Helper ────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function attachApiRequestResponse(world: CustomWorld, response: ApiResponseContext): Promise<void> {
  const req = response.request;
  const statusColor = response.status >= 200 && response.status < 300 ? '#2e7d32' : response.status >= 400 ? '#c62828' : '#f57c00';

  const requestBody = req.body ? JSON.stringify(req.body, null, 2) : '(no body)';
  const responseBody = response.body ? JSON.stringify(response.body, null, 2) : '(empty)';

  // Filter out internal/noisy headers for cleaner display
  const requestHeaders = Object.entries(req.headers || {})
    .filter(([key]) => !['common', 'delete', 'get', 'head', 'post', 'put', 'patch'].includes(key))
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n') || '(none)';

  const responseHeaders = Object.entries(response.headers || {})
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n') || '(none)';

  const html = `
<html>
<head>
  <style>
    .api-report { font-family: 'Segoe UI', Arial, sans-serif; max-width: 1000px; margin: 0 auto; }
    .api-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 16px; }
    .api-header { background: linear-gradient(135deg, #1565c0, #1976d2); color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
    .api-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .api-method { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
    .api-status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; color: white; background: ${statusColor}; }
    .api-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 12px 20px; background: #f5f5f5; }
    .api-meta-item { text-align: center; }
    .api-meta-value { font-size: 14px; font-weight: 700; color: #333; }
    .api-meta-label { font-size: 10px; text-transform: uppercase; color: #888; margin-top: 2px; }
    .api-section { padding: 16px 20px; border-top: 1px solid #eee; }
    .api-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; font-weight: 700; margin-bottom: 8px; }
    .api-code { background: #263238; color: #eeffff; padding: 12px 16px; border-radius: 6px; font-family: 'Fira Code', 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto; line-height: 1.5; }
    .api-url { font-family: 'Fira Code', monospace; font-size: 13px; color: #1565c0; word-break: break-all; padding: 8px 12px; background: #e3f2fd; border-radius: 4px; }
    .req-section .api-code { background: #1b2631; }
    .res-section .api-code { background: #1a2332; }
  </style>
</head>
<body>
  <div class="api-report">
    <div class="api-card">
      <div class="api-header">
        <h3>🌐 API Request / Response</h3>
        <span class="api-method">${req.method}</span>
      </div>
      <div class="api-meta">
        <div class="api-meta-item">
          <div class="api-meta-value"><span class="api-status">${response.status} ${response.statusText}</span></div>
          <div class="api-meta-label">Status</div>
        </div>
        <div class="api-meta-item">
          <div class="api-meta-value">${response.responseTime}ms</div>
          <div class="api-meta-label">Response Time</div>
        </div>
        <div class="api-meta-item">
          <div class="api-meta-value">${req.method}</div>
          <div class="api-meta-label">Method</div>
        </div>
      </div>

      <div class="api-section">
        <div class="api-section-title">URL</div>
        <div class="api-url">${escapeHtml(req.url)}</div>
      </div>

      <div class="api-section req-section">
        <div class="api-section-title">Request Headers</div>
        <div class="api-code">${escapeHtml(requestHeaders)}</div>
      </div>

      <div class="api-section req-section">
        <div class="api-section-title">Request Body</div>
        <div class="api-code">${escapeHtml(requestBody)}</div>
      </div>

      <div class="api-section res-section">
        <div class="api-section-title">Response Headers</div>
        <div class="api-code">${escapeHtml(responseHeaders)}</div>
      </div>

      <div class="api-section res-section">
        <div class="api-section-title">Response Body</div>
        <div class="api-code">${escapeHtml(responseBody)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  await world.attach(html, 'text/html');
}

// ─── Request Configuration ────────────────────────────────────────────────────

Given(
  /^I set (?:the )?base (?:url|URL) to ['"](.+)['"]$/,
  async function (this: CustomWorld, baseUrl: string) {
    // Resolve properties like {api.baseUrl}
    const resolvedUrl = baseUrl.replace(/\{([^}]+)\}/g, (_, key) => {
      return PropertiesLoader.get(key) || `{${key}}`;
    });
    this.apiEngine = new ApiEngine(resolvedUrl);
    Logger.info(`API base URL set to: ${resolvedUrl}`);
  }
);

Given(
  /^I set bearer token ['"](.+)['"]$/,
  async function (this: CustomWorld, token: string) {
    const resolvedToken = token.replace(/\{(\w+)\}/g, (_, k) => {
      const val = DataStore.get(k);
      return val !== undefined ? String(val) : process.env[k] || `{${k}}`;
    });
    this.apiEngine.setAuthToken(resolvedToken);
    Logger.info(`Bearer token set: ${resolvedToken.substring(0, 20)}...`);
  }
);

Given(
  /^I set api key ['"](.+)['"](?:(?: in| on) header ['"](.+)['"])?$/,
  async function (this: CustomWorld, key: string, headerName?: string) {
    const resolvedKey = key.replace(/\{(\w+)\}/g, (_, k) => {
      const val = DataStore.get(k);
      return val !== undefined ? String(val) : process.env[k] || `{${k}}`;
    });
    this.apiEngine.setApiKey(resolvedKey, headerName);
  }
);

Given(
  /^I clear (?:the )?auth(?:orization)?$/,
  async function (this: CustomWorld) {
    this.apiEngine.clearAuth();
  }
);

// ─── Simple Requests (no body) ────────────────────────────────────────────────

When(
  /^I send a (GET|DELETE|HEAD) request to ['"](.+)['"]$/,
  async function (this: CustomWorld, method: string, endpoint: string) {
    switch (method.toUpperCase()) {
      case 'GET':
        await this.apiEngine.get(endpoint);
        break;
      case 'DELETE':
        await this.apiEngine.delete(endpoint);
        break;
      default:
        await this.apiEngine.get(endpoint);
    }
    await attachApiRequestResponse(this, this.apiEngine.getLastResponse());
  }
);

When(
  /^I send a GET request to ['"](.+)['"] with query params:$/,
  async function (this: CustomWorld, endpoint: string, dataTable: DataTable) {
    const params = dataTable.rowsHash() as Record<string, string>;
    await this.apiEngine.get(endpoint, { queryParams: params });
    await attachApiRequestResponse(this, this.apiEngine.getLastResponse());
  }
);

// ─── Requests with Body (DataTable) ──────────────────────────────────────────

When(
  /^I send a (POST|PUT|PATCH) request to ['"](.+)['"] with body:$/,
  async function (this: CustomWorld, method: string, endpoint: string, dataTable: DataTable) {
    const body = ApiEngine.tableToObject({ rawTable: dataTable.raw() });

    switch (method.toUpperCase()) {
      case 'POST':
        await this.apiEngine.post(endpoint, { body });
        break;
      case 'PUT':
        await this.apiEngine.put(endpoint, { body });
        break;
      case 'PATCH':
        await this.apiEngine.patch(endpoint, { body });
        break;
    }
    await attachApiRequestResponse(this, this.apiEngine.getLastResponse());
  }
);

// ─── Requests with inline JSON ────────────────────────────────────────────────

When(
  /^I send a (POST|PUT|PATCH) request to ['"](.+)['"] with JSON:$/,
  async function (this: CustomWorld, method: string, endpoint: string, jsonString: string) {
    let body: unknown;
    try {
      body = JSON.parse(jsonString);
    } catch {
      throw new Error(`Invalid JSON provided in step:\n${jsonString}`);
    }

    switch (method.toUpperCase()) {
      case 'POST':
        await this.apiEngine.post(endpoint, { body });
        break;
      case 'PUT':
        await this.apiEngine.put(endpoint, { body });
        break;
      case 'PATCH':
        await this.apiEngine.patch(endpoint, { body });
        break;
    }
    await attachApiRequestResponse(this, this.apiEngine.getLastResponse());
  }
);

// ─── Response Status Assertions ───────────────────────────────────────────────

Then(
  /^the response status (?:code )?should be (\d+)$/,
  async function (this: CustomWorld, statusCode: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertStatus(parseInt(statusCode));
  }
);

Then(
  /^the response status should be in range (\d+) to (\d+)$/,
  async function (this: CustomWorld, min: string, max: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertStatusRange(parseInt(min), parseInt(max));
  }
);

// ─── Response Header Assertions ───────────────────────────────────────────────

Then(
  /^the response header ['"](.+)['"] should (?:be|equal|contain) ['"](.+)['"]$/,
  async function (this: CustomWorld, headerName: string, expectedValue: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertHeader(headerName, expectedValue);
  }
);

Then(
  /^the response should have header ['"](.+)['"]$/,
  async function (this: CustomWorld, headerName: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertHeaderExists(headerName);
  }
);

// ─── Response Body Assertions ─────────────────────────────────────────────────

Then(
  /^the response body field ['"](.+)['"] should (?:be|equal) ['"](.+)['"]$/,
  async function (this: CustomWorld, fieldPath: string, expectedValue: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertField(fieldPath, expectedValue);
  }
);

Then(
  /^the response body field ['"](.+)['"] should contain ['"](.+)['"]$/,
  async function (this: CustomWorld, fieldPath: string, expectedSubstring: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertFieldContains(fieldPath, expectedSubstring);
  }
);

Then(
  /^the response body field ['"](.+)['"] should exist$/,
  async function (this: CustomWorld, fieldPath: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertFieldExists(fieldPath);
  }
);

Then(
  /^the response body field ['"](.+)['"] should not be empty$/,
  async function (this: CustomWorld, fieldPath: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertFieldNotEmpty(fieldPath);
  }
);

Then(
  /^the response body field ['"](.+)['"] should (?:be an array with|have) (\d+) items?$/,
  async function (this: CustomWorld, fieldPath: string, count: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertArrayLength(fieldPath, parseInt(count));
  }
);

Then(
  /^the response body field ['"](.+)['"] should (?:be a non-empty array|not be empty array)$/,
  async function (this: CustomWorld, fieldPath: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertArrayNotEmpty(fieldPath);
  }
);

// ─── Response Time ────────────────────────────────────────────────────────────

Then(
  /^the response time should be less than (\d+)\s?ms$/,
  async function (this: CustomWorld, maxMs: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    validator.assertResponseTimeLessThan(parseInt(maxMs));
  }
);

// ─── Capture / Chain Responses ────────────────────────────────────────────────

Then(
  /^I store (?:the )?response (?:body )?field ['"](.+)['"] as ['"](.+)['"]$/,
  async function (this: CustomWorld, fieldPath: string, variableName: string) {
    const validator = new ResponseValidator(this.apiEngine.getLastResponse());
    const value = validator.getField(fieldPath);
    DataStore.set(variableName, value);
    Logger.info(`Stored response field "${fieldPath}" as variable "${variableName}": ${value}`);
  }
);

Then(
  /^I store (?:the )?response status as ['"](.+)['"]$/,
  async function (this: CustomWorld, variableName: string) {
    const status = this.apiEngine.getLastResponse().status;
    DataStore.set(variableName, status);
    Logger.info(`Stored response status ${status} as variable "${variableName}"`);
  }
);

// ─── Print response for debugging ─────────────────────────────────────────────

Then(
  /^I (?:print|log|debug) (?:the )?response$/,
  async function (this: CustomWorld) {
    const response = this.apiEngine.getLastResponse();
    const output = JSON.stringify(
      { status: response.status, body: response.body },
      null,
      2
    );
    Logger.info(`Response:\n${output}`);
    await this.attach(output, 'text/plain');
  }
);
