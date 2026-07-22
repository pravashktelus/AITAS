#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

interface CucumberStep {
  keyword?: string;
  name?: string;
  result?: {
    status?: string;
    duration?: number;
    error_message?: string;
  };
  embeddings?: Array<{
    data: string;
    mime_type: string;
    name?: string;
  }>;
}

interface CucumberScenario {
  name: string;
  description?: string;
  steps: CucumberStep[];
  tags?: Array<{ name: string }>;
}

interface CucumberFeature {
  name: string;
  elements?: CucumberScenario[];
}

interface AllureLabel {
  name: string;
  value: string;
}

interface AllureAttachment {
  name: string;
  source: string;
  type: string;
}

interface AllureStep {
  name: string;
  status: string;
  stage: string;
  start: number;
  stop: number;
  attachments: AllureAttachment[];
  statusDetails: { message?: string };
}

interface AllureResult {
  uuid: string;
  historyId: string;
  fullName: string;
  labels: AllureLabel[];
  links: unknown[];
  name: string;
  status: string;
  stage: string;
  steps: AllureStep[];
  attachments: unknown[];
  parameters: unknown[];
  start: number;
  stop: number;
  description: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a timestamp string for folder naming: YYYY-MM-DD_HH-mm-ss
 */
function getRunTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function getScenarioStatus(scenario: CucumberScenario): string {
  if (!scenario.steps || scenario.steps.length === 0) {
    return 'skipped';
  }

  const allStatuses = scenario.steps.map((s) => s.result?.status);

  if (allStatuses.includes('failed')) return 'failed';
  if (allStatuses.includes('undefined')) return 'skipped';
  if (allStatuses.includes('pending')) return 'skipped';
  if (allStatuses.every((s) => s === 'passed')) return 'passed';

  return 'unknown';
}

function calculateDuration(scenario: CucumberScenario): number {
  if (!scenario.steps) return 0;

  const totalNanos = scenario.steps.reduce((sum, step) => {
    return sum + (step.result?.duration || 0);
  }, 0);

  return Math.round(totalNanos / 1000000);
}

function generateAllureResults(): void {
  const cucumberJsonDir = 'reports/cucumber-json';
  const allureBaseDir = 'reports/allure-results';

  // ─── Find all cucumber JSON report files ───────────────────────────────────
  let cucumberReportFiles: string[] = [];
  if (fs.existsSync(cucumberJsonDir)) {
    cucumberReportFiles = fs
      .readdirSync(cucumberJsonDir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
      .map((f) => path.join(cucumberJsonDir, f));
  }

  if (cucumberReportFiles.length === 0) {
    console.log('No cucumber JSON reports found in reports/cucumber-json/. Run tests first.');
    return;
  }

  // ─── Only use reports modified within the last 30 minutes ──────────────────
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentFiles = cucumberReportFiles.filter((f) => {
    const stat = fs.statSync(f);
    return stat.mtimeMs >= thirtyMinAgo;
  });

  // If no recent files, fall back to the single most recently modified file
  const filesToProcess =
    recentFiles.length > 0
      ? recentFiles
      : [cucumberReportFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]];

  // ─── Clean old allure run folders (keep only last 10) ──────────────────────
  if (fs.existsSync(allureBaseDir)) {
    const existingRuns = fs
      .readdirSync(allureBaseDir)
      .filter((f) => f.startsWith('run-'))
      .sort()
      .reverse();

    // Keep the latest 10 runs, delete older ones
    if (existingRuns.length > 10) {
      existingRuns.slice(10).forEach((oldRun) => {
        const oldRunPath = path.join(allureBaseDir, oldRun);
        try {
          fs.rmSync(oldRunPath, { recursive: true, force: true });
        } catch (e) {
          /* ignore */
        }
      });
    }
  }

  // ─── Create timestamped run folder ─────────────────────────────────────────
  const runTimestamp = getRunTimestamp();
  const runDir = path.join(allureBaseDir, `run-${runTimestamp}`);

  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }

  // Write a pointer file so allure commands know the latest run
  const latestPointerPath = path.join(allureBaseDir, 'latest-run.txt');
  fs.writeFileSync(latestPointerPath, runDir);

  try {
    // ─── Load and merge all cucumber JSON reports ──────────────────────────────
    let cucumberData: CucumberFeature[] = [];
    filesToProcess.forEach((filePath) => {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data)) {
          cucumberData = cucumberData.concat(data);
        }
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(`  Skipping invalid JSON: ${filePath} (${error.message})`);
      }
    });

    if (cucumberData.length === 0) {
      console.log('No valid cucumber data found in JSON reports.');
      return;
    }

    console.log(
      `  Reading ${filesToProcess.length} report file(s): ${filesToProcess.map((f) => path.basename(f)).join(', ')}`
    );

    // Load step timing files from the base allure dir (written during test execution by Hooks.ts)
    const stepTimingsMap = new Map<string, unknown>();
    const timingFiles = fs
      .readdirSync(allureBaseDir)
      .filter((f) => f.startsWith('step-timings-') && f.endsWith('.json'));

    timingFiles.forEach((file) => {
      try {
        const timingData = JSON.parse(fs.readFileSync(path.join(allureBaseDir, file), 'utf8'));
        stepTimingsMap.set(file, timingData);
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(`Failed to read timing file ${file}: ${error.message}`);
      }
    });

    let totalResults = 0;

    cucumberData.forEach((feature) => {
      if (!feature.elements) return;

      feature.elements.forEach((scenario) => {
        const resultId = generateUUID();
        const scenarioStatus = getScenarioStatus(scenario);

        const scenarioStart = Date.now() - calculateDuration(scenario);
        const scenarioStop = Date.now();

        const allureResult: AllureResult = {
          uuid: resultId,
          historyId: generateUUID(),
          fullName: `${feature.name}: ${scenario.name}`,
          labels: [
            { name: 'suite', value: feature.name },
            { name: 'subSuite', value: scenario.name },
            { name: 'feature', value: feature.name },
            { name: 'story', value: scenario.name },
            { name: 'thread', value: '1' },
            { name: 'host', value: 'localhost' },
            { name: 'language', value: 'javascript' },
            { name: 'framework', value: 'cucumber-js' },
            ...(scenario.tags || []).map((t) => ({ name: 'tag', value: t.name })),
          ],
          links: [],
          name: scenario.name,
          status: scenarioStatus,
          stage: 'finished',
          steps: scenario.steps.map((step, idx) => {
            const stepAttachments: AllureAttachment[] = [];
            const cucumberStatus = step.result?.status || 'skipped';
            let stepStatus = cucumberStatus;
            if (cucumberStatus === 'undefined') stepStatus = 'broken';
            if (cucumberStatus === 'pending') stepStatus = 'skipped';
            if (cucumberStatus === 'ambiguous') stepStatus = 'broken';

            const stepDuration = step.result?.duration || 0;
            const stepStart = Date.now() - (scenario.steps.length - idx) * 1000;
            const stepStop = stepStart + Math.round(stepDuration / 1000000);

            // Add exception message only if step failed
            if (stepStatus === 'failed' && step.result?.error_message) {
              const attachmentId = generateUUID();
              stepAttachments.push({
                name: 'Exception',
                source: `${attachmentId}-exception.txt`,
                type: 'text/plain',
              });

              // Write exception file into the run directory
              const exceptionPath = path.join(runDir, `${attachmentId}-exception.txt`);
              fs.writeFileSync(exceptionPath, step.result.error_message);
            }

            // Add embeddings (screenshots, logs, text/html RCA reports, etc.)
            if (step.embeddings && Array.isArray(step.embeddings)) {
              step.embeddings.forEach((embedding) => {
                if (embedding.data && embedding.mime_type) {
                  const attachmentId = generateUUID();
                  const mediaType = embedding.mime_type;
                  let ext = '.txt';

                  if (mediaType.includes('png')) {
                    ext = '.png';
                  } else if (mediaType.includes('image/jpeg')) {
                    ext = '.jpg';
                  } else if (mediaType.includes('text/html')) {
                    ext = '.html';
                  } else if (mediaType.includes('text/plain')) {
                    ext = '.txt';
                  }

                  stepAttachments.push({
                    name: embedding.name || `Attachment ${attachmentId.substring(0, 8)}`,
                    source: `${attachmentId}-attachment${ext}`,
                    type: mediaType,
                  });

                  // Write attachment file into the run directory
                  const attachmentPath = path.join(runDir, `${attachmentId}-attachment${ext}`);
                  fs.writeFileSync(attachmentPath, Buffer.from(embedding.data, 'base64'));
                }
              });
            }

            return {
              name: `${step.keyword || ''}${step.name || ''}`.trim(),
              status: stepStatus,
              stage: 'finished',
              start: stepStart,
              stop: stepStop,
              attachments: stepAttachments,
              statusDetails:
                stepStatus === 'failed'
                  ? { message: step.result?.error_message?.split('\n')[0] || '' }
                  : {},
            };
          }),
          attachments: [],
          parameters: [],
          start: scenarioStart,
          stop: scenarioStop,
          description: scenario.description || '',
        };

        // Write result file into the timestamped run directory
        const resultPath = path.join(runDir, `${resultId}-result.json`);
        fs.writeFileSync(resultPath, JSON.stringify(allureResult, null, 2));

        totalResults++;
      });
    });

    // Clean up step timing files after processing
    timingFiles.forEach((file) => {
      try {
        fs.unlinkSync(path.join(allureBaseDir, file));
      } catch (e: unknown) {
        const error = e as Error;
        console.warn(`Failed to delete timing file ${file}: ${error.message}`);
      }
    });

    // ─── Copy history from previous allure-report (for trend charts) ─────────
    const previousReportHistoryDir = path.join('reports', 'allure-report', 'history');
    const runHistoryDir = path.join(runDir, 'history');
    if (fs.existsSync(previousReportHistoryDir)) {
      if (!fs.existsSync(runHistoryDir)) {
        fs.mkdirSync(runHistoryDir, { recursive: true });
      }
      const historyFiles = fs.readdirSync(previousReportHistoryDir);
      historyFiles.forEach((file) => {
        try {
          fs.copyFileSync(
            path.join(previousReportHistoryDir, file),
            path.join(runHistoryDir, file)
          );
        } catch (e) {
          // Ignore copy errors for history
        }
      });
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║           ALLURE RESULTS GENERATED                        ║`);
    console.log(`╠═══════════════════════════════════════════════════════════╣`);
    console.log(`║  Run:       ${runTimestamp}                       ║`);
    console.log(`║  Tests:     ${String(totalResults).padEnd(44)}║`);
    console.log(`║  Location:  ${runDir.padEnd(44)}║`);
    console.log(`╠═══════════════════════════════════════════════════════════╣`);
    console.log(`║  To view:   npm run allure:open                          ║`);
    console.log(`║  To serve:  npm run allure:serve                         ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error generating Allure results:', err.message);
    process.exit(1);
  }
}

generateAllureResults();
