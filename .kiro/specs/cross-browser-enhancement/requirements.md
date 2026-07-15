# Requirements Document

## Introduction

This document defines the requirements for enhancing cross-browser testing capabilities in the BDD Playwright framework (v1.1). The framework currently supports basic cross-browser execution across Chromium, Firefox, and WebKit with sequential/parallel orchestration, browser filter tags, and a consolidated HTML report. This enhancement expands those capabilities with browser-specific retry logic, improved configuration validation, cross-browser visual comparison, enhanced tag filtering with Gherkin Examples integration, and richer reporting with trend analysis.

## Glossary

- **Cross_Browser_Manager**: The orchestration component that coordinates test execution across multiple browser engines and collects results.
- **Cross_Browser_Runner**: The entry point that resolves browser-specific configuration, delegates to Cross_Browser_Manager, and triggers report generation.
- **Cross_Browser_Report_Generator**: The component that produces a consolidated HTML report showing scenario results in a matrix view across all browsers.
- **Tag_Parser**: The utility responsible for extracting and validating browser filter tags from Gherkin scenario annotations.
- **Framework_Config**: The centralized configuration module that loads settings from `framework.properties` and environment variables.
- **Context_Manager**: The component responsible for launching Playwright browser instances, creating contexts, and managing page lifecycle.
- **Browser_Engine**: One of the three supported Playwright browser engines: Chromium, Firefox, or WebKit.
- **Browser_Filter_Tag**: A Gherkin tag annotation that controls which browsers a scenario executes on (e.g., `@chromium-only`, `@skip-firefox`).
- **Browser_Specific_Failure**: A scenario that passes on one or more browsers but fails on at least one other browser.
- **Cross_Browser_Matrix**: A tabular view showing pass/fail/skip status for every scenario across every configured browser.
- **Retry_Strategy**: A per-browser configuration for automatically re-executing failed scenarios before marking them as failed.
- **Visual_Baseline**: A reference screenshot captured on a specific browser used for pixel-level comparison in subsequent runs.

## Requirements

### Requirement 1: Browser-Specific Retry Configuration

**User Story:** As a test engineer, I want to configure per-browser retry counts, so that I can account for browsers with known flakiness without over-retrying stable browsers.

#### Acceptance Criteria

1. WHEN a `browser.<engine>.retryCount` property is defined in `framework.properties`, THE Framework_Config SHALL parse the value and apply it as the retry count for that specific Browser_Engine.
2. WHEN no `browser.<engine>.retryCount` property is defined for a Browser_Engine, THE Framework_Config SHALL fall back to the global `retryCount` property.
3. WHEN a scenario fails on a specific Browser_Engine, THE Cross_Browser_Manager SHALL re-execute the scenario up to the configured retry count for that browser before recording the final result.
4. WHEN a scenario passes on a retry attempt, THE Cross_Browser_Manager SHALL record the scenario status as "passed" and include the retry count in the result metadata.
5. WHEN a scenario exhausts all retry attempts and still fails, THE Cross_Browser_Manager SHALL record the scenario status as "failed" and include all attempt error messages.
6. THE Framework_Config SHALL validate that `browser.<engine>.retryCount` values are integers in the range [0, 5].
7. IF a `browser.<engine>.retryCount` value is outside the range [0, 5], THEN THE Framework_Config SHALL clamp the value to the nearest boundary and log a warning.

### Requirement 2: Cross-Browser Configuration Validation

**User Story:** As a test engineer, I want the framework to validate my cross-browser configuration at startup, so that I get early feedback on misconfigurations before tests execute.

#### Acceptance Criteria

1. WHEN the Framework_Config loads cross-browser settings, THE Framework_Config SHALL validate that at least one valid Browser_Engine is configured in the `browsers` property.
2. IF the `browsers` property contains only invalid engine names, THEN THE Framework_Config SHALL throw a descriptive error listing valid options (chromium, firefox, webkit).
3. WHEN `crossBrowser.parallel` is set to `true` and `crossBrowser.maxParallel` exceeds the number of configured browsers, THE Framework_Config SHALL clamp `maxParallel` to the browser count and log an informational message.
4. WHEN browser-specific viewport values are configured, THE Framework_Config SHALL validate that both width and height are integers within [320, 3840].
5. IF a browser-specific viewport value has an invalid format, THEN THE Framework_Config SHALL log a warning and fall back to the global default viewport (1280x720).
6. WHEN `crossBrowser.parallel` is set to `true`, THE Framework_Config SHALL verify that no two browsers share the same output report path to prevent file corruption.

### Requirement 3: Enhanced Browser Filter Tags

**User Story:** As a test engineer, I want to use advanced tag expressions to control cross-browser execution, so that I can target specific browser combinations without writing duplicate scenarios.

#### Acceptance Criteria

1. WHEN a scenario has a `@browsers:chromium,firefox` tag, THE Tag_Parser SHALL parse the tag as a list of browsers the scenario should run on.
2. WHEN a scenario has a `@browsers:` tag, THE Cross_Browser_Manager SHALL execute the scenario only on the browsers listed in the tag value.
3. THE Tag_Parser SHALL support both the legacy format (`@chromium-only`, `@skip-webkit`) and the new format (`@browsers:chromium,firefox`) simultaneously.
4. IF a scenario has both legacy browser filter tags and a `@browsers:` tag, THEN THE Tag_Parser SHALL return a validation error indicating conflicting tag formats.
5. WHEN a `@browsers:` tag contains an invalid browser name, THE Tag_Parser SHALL ignore the invalid entry and log a warning with the unrecognized name.
6. IF a `@browsers:` tag results in an empty browser list after filtering invalid entries, THEN THE Tag_Parser SHALL return a validation error indicating no valid browsers are specified.

### Requirement 4: Cross-Browser Visual Comparison

**User Story:** As a test engineer, I want to capture and compare screenshots across browsers, so that I can detect visual rendering differences between browser engines.

#### Acceptance Criteria

1. WHEN a scenario is tagged with `@visual-compare`, THE Cross_Browser_Runner SHALL capture a full-page screenshot after each scenario step that triggers navigation or layout changes.
2. WHEN cross-browser execution completes for a `@visual-compare` scenario, THE Cross_Browser_Report_Generator SHALL produce a side-by-side visual diff section in the report.
3. THE Cross_Browser_Report_Generator SHALL calculate a pixel-difference percentage between each browser pair for every captured screenshot.
4. WHEN the pixel-difference percentage exceeds the configured `crossBrowser.visualThreshold` value, THE Cross_Browser_Report_Generator SHALL flag the comparison as a visual discrepancy.
5. THE Framework_Config SHALL support a `crossBrowser.visualThreshold` property with a default value of 5 (representing 5% pixel difference).
6. WHEN no Visual_Baseline exists for a scenario, THE Cross_Browser_Runner SHALL create the baseline from the first browser in the configured list.
7. THE Cross_Browser_Runner SHALL store visual baselines in the `test-baselines/cross-browser/` directory, organized by scenario name and browser engine.

### Requirement 5: Cross-Browser Trend Reporting

**User Story:** As a test engineer, I want to see cross-browser test result trends over time, so that I can identify recurring browser-specific failures and track stability improvements.

#### Acceptance Criteria

1. WHEN a cross-browser execution completes, THE Cross_Browser_Report_Generator SHALL persist a summary JSON file in `reports/cross-browser/history/` with a timestamped filename.
2. THE summary JSON file SHALL include browser names, per-browser pass/fail/skip counts, total duration, and a list of Browser_Specific_Failures.
3. WHEN generating the consolidated HTML report, THE Cross_Browser_Report_Generator SHALL read the last 10 historical summary files and render a trend chart section.
4. THE trend chart section SHALL display pass rate per browser over the last 10 runs as a line graph.
5. WHEN a scenario appears in Browser_Specific_Failures for 3 or more consecutive runs, THE Cross_Browser_Report_Generator SHALL flag the scenario as a "persistent browser-specific issue" in the report.
6. IF the `reports/cross-browser/history/` directory does not exist, THEN THE Cross_Browser_Report_Generator SHALL create the directory and proceed without historical data.

### Requirement 6: Browser Execution Timeout Configuration

**User Story:** As a test engineer, I want to set per-browser execution timeouts, so that a hung browser does not block the entire cross-browser suite indefinitely.

#### Acceptance Criteria

1. WHEN a `browser.<engine>.executionTimeout` property is defined in `framework.properties`, THE Framework_Config SHALL parse the value as the maximum execution time in milliseconds for that Browser_Engine.
2. WHEN no `browser.<engine>.executionTimeout` is defined, THE Framework_Config SHALL fall back to a default execution timeout of 300000 milliseconds (5 minutes).
3. WHEN a browser execution exceeds the configured timeout, THE Cross_Browser_Manager SHALL terminate the browser process and record all pending scenarios as "not_executed" with a timeout error message.
4. WHEN a browser execution is terminated due to timeout, THE Cross_Browser_Manager SHALL log a warning and continue executing the remaining configured browsers.
5. THE Framework_Config SHALL validate that `browser.<engine>.executionTimeout` values are integers in the range [30000, 1800000] (30 seconds to 30 minutes).
6. IF a `browser.<engine>.executionTimeout` value is outside the valid range, THEN THE Framework_Config SHALL clamp the value to the nearest boundary and log a warning.

### Requirement 7: Cross-Browser Parallel Isolation

**User Story:** As a test engineer, I want parallel browser executions to be fully isolated from each other, so that shared state does not cause false positives or flaky failures.

#### Acceptance Criteria

1. WHEN `crossBrowser.parallel` is `true`, THE Cross_Browser_Manager SHALL ensure each browser execution uses a separate output directory for reports, screenshots, and videos.
2. THE Cross_Browser_Manager SHALL name parallel output directories using the pattern `reports/<browser>-<timestamp>/`.
3. WHEN parallel execution completes, THE Cross_Browser_Runner SHALL merge per-browser reports into the consolidated cross-browser report.
4. WHEN `crossBrowser.parallel` is `true`, THE Cross_Browser_Manager SHALL ensure each browser process uses isolated environment variables to prevent cross-contamination.
5. IF a browser process crashes during parallel execution, THEN THE Cross_Browser_Manager SHALL isolate the failure to that browser and allow other browser executions to complete.

### Requirement 8: Cross-Browser Execution Summary in CLI

**User Story:** As a test engineer, I want a clear summary printed to the console after cross-browser execution, so that I can quickly assess results without opening the HTML report.

#### Acceptance Criteria

1. WHEN cross-browser execution completes, THE Cross_Browser_Runner SHALL print a formatted summary table to the console showing per-browser pass/fail/skip counts and pass rates.
2. THE console summary SHALL include the total execution time and the path to the generated HTML report.
3. WHEN Browser_Specific_Failures are detected, THE Cross_Browser_Runner SHALL list the affected scenario names in the console summary.
4. THE console summary SHALL use color-coded output (green for passed, red for failed, yellow for skipped) when the terminal supports ANSI colors.
5. WHEN all scenarios pass across all browsers, THE Cross_Browser_Runner SHALL print a success indicator.
6. WHEN any scenario fails, THE Cross_Browser_Runner SHALL exit with a non-zero exit code.

