# Implementation Plan: Cross-Browser Enhancement

## Overview

This plan implements the cross-browser enhancement features for the BDD Playwright v1.1 framework. The work covers: Hooks integration for `CROSS_BROWSER_TARGET` detection, RetryManager for per-browser retries, ArtifactPathResolver for parallel artifact isolation, PersistentStore file locking, Cucumber profiles and npm scripts, report linking, and CLI summary output. Each task builds incrementally on previous steps, wiring everything together at the end.

## Tasks

- [x] 1. Create RetryManager and ArtifactPathResolver core modules
  - [x] 1.1 Create `src/core/RetryManager.ts` with retry logic
    - Implement `RetryConfig` interface with `maxRetries`, `retryDelay`, and `retryOnlyOnLaunchFailure` fields
    - Implement `RetryManager` class with `executeWithRetry(browser, runner)` method
    - Include exponential backoff delay between retries
    - Log each retry attempt with browser name, attempt number, and error reason
    - Return successful `BrowserRunResult` or throw last error after exhausting all retries
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.2 Create `src/core/ArtifactPathResolver.ts` for browser-namespaced paths
    - Implement static `resolve(artifactType, filename)` method that inserts browser name as subdirectory when `CROSS_BROWSER_TARGET` is set
    - Implement static `getCurrentBrowser()` that reads `CROSS_BROWSER_TARGET` env var
    - Implement static `ensureDir(dirPath)` that creates directory recursively if missing
    - Normal mode path: `reports/{type}/{filename}`
    - Cross-browser mode path: `reports/{type}/{browser}/{filename}`
    - _Requirements: 7.1, 7.2_

  - [ ]* 1.3 Write property tests for RetryManager
    - **Property 5: Retry Bound** — For any maxRetries N, runner is called at most N+1 times; success returns BrowserRunResult; all failures throw last error
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [ ]* 1.4 Write property tests for ArtifactPathResolver
    - **Property 4: Artifact Path Isolation** — For any two distinct browsers, resolve(type, file) produces different paths; for same browser, same inputs produce same output
    - **Validates: Requirements 7.1, 7.2**

- [x] 2. Enhance FrameworkConfig with retry and timeout validation
  - [x] 2.1 Add per-browser retry count parsing to `FrameworkConfig.ts`
    - Parse `browser.<engine>.retryCount` properties for each valid browser
    - Fall back to global `retryCount` when per-browser value is not defined
    - Validate values are integers in range [0, 5]; clamp to nearest boundary and log warning if outside range
    - Add `retryCount` field to the `CrossBrowserConfig` interface as `Record<string, number>`
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

  - [x] 2.2 Add per-browser execution timeout parsing to `FrameworkConfig.ts`
    - Parse `browser.<engine>.executionTimeout` properties for each valid browser
    - Fall back to default 300000ms (5 minutes) when per-browser value is not defined
    - Validate values are integers in range [30000, 1800000]; clamp to nearest boundary and log warning if outside range
    - Add `executionTimeouts` field to the `CrossBrowserConfig` interface as `Record<string, number>`
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [x] 2.3 Add startup configuration validation to `FrameworkConfig.ts`
    - Validate at least one valid browser engine is configured in `browsers` property; throw descriptive error if only invalid names
    - When `crossBrowser.parallel=true` and `maxParallel` exceeds browser count, clamp to browser count and log info
    - Validate browser viewport values have width and height as integers in [320, 3840]; log warning and fall back to 1280x720 on invalid format
    - When `crossBrowser.parallel=true`, verify no two browsers share the same output report path
    - Add `crossBrowser.visualThreshold` property parsing with default value of 5
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.5_

  - [ ]* 2.4 Write unit tests for FrameworkConfig cross-browser validation
    - Test per-browser retry count parsing, fallback, and clamping
    - Test per-browser timeout parsing, fallback, and clamping
    - Test startup validation error messages for invalid configurations
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.5, 6.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance TagParser with `@browsers:` tag support
  - [x] 4.1 Add `@browsers:chromium,firefox` tag parsing to `TagParser.ts`
    - Add regex pattern for `@browsers:` tag format
    - Implement `parseBrowserListTag(tags)` method that extracts browser list from `@browsers:` tag
    - Support both legacy format (`@chromium-only`, `@skip-webkit`) and new format (`@browsers:chromium,firefox`) simultaneously
    - Return validation error if both legacy and new format tags are present on same scenario
    - Ignore invalid browser names in `@browsers:` tag and log warning with unrecognized name
    - Return validation error if `@browsers:` tag results in empty browser list after filtering invalid entries
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Update `CrossBrowserManager.shouldRunOnBrowser()` to support `@browsers:` tag
    - Integrate new `parseBrowserListTag` result into run-decision logic
    - When `@browsers:` tag is present, only execute scenario on listed browsers
    - Update `validateBrowserTags()` to detect conflicting legacy + new tag formats
    - _Requirements: 3.2, 3.4_

  - [ ]* 4.3 Write property tests for TagParser browser filtering
    - **Property 2: Tag-Based Scenario Filtering** — For any scenario tags and any browser, if `shouldRunOnBrowser` returns `{run: false}`, then scenario is skipped with a logged reason; legacy-only tags and `@browsers:` tags never coexist without error
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

  - [ ]* 4.4 Write unit tests for TagParser `@browsers:` tag edge cases
    - Test valid multi-browser tag: `@browsers:chromium,firefox`
    - Test single browser tag: `@browsers:webkit`
    - Test invalid entry: `@browsers:edge,chromium` → ignores `edge`, runs on `chromium`
    - Test empty after filter: `@browsers:edge,opera` → validation error
    - Test conflict: `@chromium-only` + `@browsers:chromium,firefox` → validation error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Implement Hooks integration for CROSS_BROWSER_TARGET detection
  - [x] 5.1 Modify `src/hooks/Hooks.ts` Before hook to detect cross-browser mode
    - At the start of the non-API, non-mobile, non-native branch, check for `CROSS_BROWSER_TARGET` env var
    - If set, validate value is one of `['chromium', 'firefox', 'webkit']`; throw descriptive error if invalid
    - Call `contextManager.launchForBrowser(crossBrowserTarget, frameworkConfig)` instead of standard `launch()`
    - Call `initActionEngine()` after browser launch
    - Log cross-browser mode activation with browser name
    - Skip standard launch logic when cross-browser target is detected
    - _Requirements: 1.3, 7.4_

  - [x] 5.2 Update BeforeAll hook to create cross-browser report directories
    - Add `reports/cross-browser/` and `reports/cross-browser/history/` to directory creation list
    - Add per-browser artifact directories when `CROSS_BROWSER_TARGET` is set
    - _Requirements: 5.6, 7.1_

  - [ ]* 5.3 Write unit tests for Hooks cross-browser detection logic
    - Test that CROSS_BROWSER_TARGET env var triggers `launchForBrowser` path
    - Test that invalid CROSS_BROWSER_TARGET throws descriptive error
    - Test that missing CROSS_BROWSER_TARGET falls through to standard launch logic
    - _Requirements: 1.3, 7.4_

- [x] 6. Implement PersistentStore file locking for parallel safety
  - [x] 6.1 Add file locking methods to `src/utils/PersistentStore.ts`
    - Implement `acquireLock(lockPath, timeout)` using `fs.writeFileSync` with `wx` flag for atomic creation
    - Implement `releaseLock(lockPath)` that deletes the lock file in a finally block
    - Implement `safeWrite(key, value)` that acquires lock → writes → releases lock
    - Use exponential backoff retry (100ms, 200ms, 400ms, 800ms, 1000ms) for lock acquisition
    - Max 5 lock acquisition attempts before throwing
    - Fall back to browser-specific store file (`runtime-store-{browser}.json`) if lock contention exceeds threshold
    - _Requirements: 7.4_

  - [ ]* 6.2 Write property tests for PersistentStore file locking
    - **Property 3: PersistentStore Mutex** — For any simulated parallel writes, no data corruption occurs; lock is always released even on write failure
    - **Validates: Requirements 7.4**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate RetryManager into CrossBrowserManager execution flow
  - [x] 8.1 Wire RetryManager into `CrossBrowserManager.executeCrossBrowser()`
    - Read per-browser retry counts from `FrameworkConfig.crossBrowser` retry config
    - Instantiate `RetryManager` with browser-specific `maxRetries` (falling back to global)
    - Wrap each browser runner call with `retryManager.executeWithRetry()`
    - Record retry count in result metadata when scenario passes on retry
    - Include all attempt error messages when scenario exhausts retries
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 8.2 Add execution timeout enforcement to `CrossBrowserManager`
    - When spawning child processes per browser, apply `browser.<engine>.executionTimeout` as a process timeout
    - If timeout is reached, terminate the browser process via `process.kill()`
    - Record all pending scenarios as `not_executed` with timeout error message
    - Log warning and continue executing remaining browsers
    - _Requirements: 6.3, 6.4_

  - [ ]* 8.3 Write unit tests for retry integration and timeout enforcement
    - Test that retry wraps each browser execution
    - Test that timeout kills process and records not_executed status
    - Test that other browsers continue after one times out
    - _Requirements: 1.3, 1.4, 1.5, 6.3, 6.4_

- [x] 9. Implement cross-browser trend reporting and history persistence
  - [x] 9.1 Add history persistence to `CrossBrowserReportGenerator`
    - After generating the HTML report, persist a summary JSON file in `reports/cross-browser/history/` with timestamped filename (`summary-{ISO-timestamp}.json`)
    - JSON includes: browser names, per-browser pass/fail/skip counts, total duration, and list of browser-specific failures
    - Create `reports/cross-browser/history/` directory if it does not exist
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 9.2 Add trend chart section to the consolidated HTML report
    - Read last 10 historical summary files from `reports/cross-browser/history/`
    - Render a trend chart section showing pass rate per browser over last 10 runs as a line graph (inline SVG or Chart.js CDN)
    - Flag scenarios appearing in browser-specific failures for 3+ consecutive runs as "persistent browser-specific issue"
    - Handle case where history directory doesn't exist or has fewer than 10 files gracefully
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 9.3 Write unit tests for trend reporting
    - Test history JSON file generation with correct structure
    - Test trend chart rendering with 0, 1, 5, and 10 historical files
    - Test persistent issue detection for 3+ consecutive failures
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10. Implement parallel isolation and CLI summary output
  - [x] 10.1 Enhance `CrossBrowserManager` parallel execution with output isolation
    - When `crossBrowser.parallel=true`, ensure each browser execution uses separate output directory: `reports/<browser>-<timestamp>/`
    - Set isolated environment variables per browser child process to prevent cross-contamination
    - If a browser process crashes during parallel execution, isolate failure to that browser and allow others to complete
    - After parallel execution, merge per-browser reports into the consolidated cross-browser report
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 Add CLI summary output to `CrossBrowserRunner`
    - After cross-browser execution completes, print formatted summary table to console with per-browser pass/fail/skip counts and pass rates
    - Include total execution time and path to generated HTML report
    - List affected scenario names when browser-specific failures are detected
    - Use color-coded output (green/red/yellow) when terminal supports ANSI colors (detect via `process.stdout.isTTY`)
    - Print success indicator when all scenarios pass across all browsers
    - Exit with non-zero exit code when any scenario fails
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 10.3 Write unit tests for CLI summary and parallel isolation
    - Test summary table formatting with various result combinations
    - Test color-coded output detection
    - Test exit code logic (0 on all pass, 1 on any fail)
    - Test parallel output directory naming pattern
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11. Add Cucumber profiles, npm scripts, and report linking
  - [x] 11.1 Create `cucumber.yml` with cross-browser profile
    - Define `cross-browser` profile with `ts-node/register`, proper require paths, feature paths, and JSON format output using `CROSS_BROWSER_TARGET` env var in filename
    - Set `parallel: 1` in the profile (parallelism is managed at browser level, not scenario level)
    - _Requirements: 7.4_

  - [x] 11.2 Add cross-browser npm scripts to `package.json`
    - Add `test:cross-browser`: runs `ts-node src/core/CrossBrowserRunner.ts`
    - Add `test:cross-browser:parallel`: sets `CROSS_BROWSER_PARALLEL=true` and runs CrossBrowserRunner
    - Add `test:chromium`, `test:firefox`, `test:webkit`: individual browser scripts using `CROSS_BROWSER_TARGET` env var with `--profile cross-browser`
    - _Requirements: 8.6_

  - [x] 11.3 Implement report linking in `src/core/ReportLinker.ts`
    - Create `ReportLinker` class with static `linkCrossBrowserReport(mainReportPath, crossBrowserReportPath)` method
    - After main report generation, inject a navigation link/banner to the cross-browser matrix report if the file exists
    - Integrate into `CrossBrowserRunner` post-report generation step
    - _Requirements: 5.3_

  - [ ]* 11.4 Write integration test for npm scripts and profile
    - Verify `cucumber.yml` parses without error
    - Verify npm script definitions are valid JSON
    - Verify report linker injects link when cross-browser report exists
    - _Requirements: 5.3, 7.4, 8.6_

- [x] 12. Wire everything together and validate end-to-end flow
  - [x] 12.1 Update `CrossBrowserRunner.run()` to use all new components
    - Integrate `RetryManager` in the runner flow
    - Use `ArtifactPathResolver` for screenshot/video paths in cross-browser mode
    - Call `ReportLinker` after report generation
    - Persist history summary after report generation
    - Print CLI summary table after execution completes
    - Set process exit code based on overall results
    - _Requirements: 1.3, 1.4, 5.1, 7.1, 7.2, 8.1, 8.6_

  - [x] 12.2 Update `src/hooks/Hooks.ts` to use ArtifactPathResolver for screenshots and videos
    - Replace hardcoded `reports/screenshots/` and `reports/videos/` paths with `ArtifactPathResolver.resolve()` calls
    - Ensure failure screenshots are stored in browser-specific subdirectories during cross-browser execution
    - _Requirements: 7.1, 7.2_

  - [ ]* 12.3 Write end-to-end integration tests for the complete cross-browser flow
    - **Property 1: Cross-Browser Target Routing** — If CROSS_BROWSER_TARGET is set, launchForBrowser is invoked (not launch())
    - **Property 6: Report Generation Guarantee** — If at least one browser completes, report is generated
    - **Property 7: Report Linkage** — If cross-browser report exists, it is linked from main report
    - **Validates: Requirements 1.3, 5.1, 5.3, 7.1, 7.2, 7.4, 8.6**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript throughout (matching existing codebase)
- Dependencies: No new runtime dependencies needed; `cross-env` is optional for npm scripts (platform-specific syntax can be used instead)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.2", "2.3"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.4", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "5.1", "5.2", "6.1"] },
    { "id": 3, "tasks": ["5.3", "6.2", "8.1", "8.2"] },
    { "id": 4, "tasks": ["8.3", "9.1", "10.1", "10.2"] },
    { "id": 5, "tasks": ["9.2", "9.3", "10.3", "11.1", "11.2", "11.3"] },
    { "id": 6, "tasks": ["11.4", "12.1", "12.2"] },
    { "id": 7, "tasks": ["12.3"] }
  ]
}
```
