import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  unlinkSync: vi.fn(),
}));

import * as fs from 'fs';
import { CrossBrowserReportGenerator, BrowserRunResult } from '../../src/core/CrossBrowserReportGenerator';

describe('CrossBrowserReportGenerator.persistHistorySummary', () => {
  let generator: CrossBrowserReportGenerator;

  beforeEach(() => {
    generator = new CrossBrowserReportGenerator();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createResults(): Map<string, BrowserRunResult> {
    const results = new Map<string, BrowserRunResult>();
    results.set('chromium', {
      browser: 'chromium',
      totalScenarios: 10,
      passed: 8,
      failed: 1,
      skipped: 1,
      duration: 5000,
      scenarioResults: [],
    });
    results.set('firefox', {
      browser: 'firefox',
      totalScenarios: 10,
      passed: 7,
      failed: 2,
      skipped: 1,
      duration: 6000,
      scenarioResults: [],
    });
    return results;
  }

  it('should create the history directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    generator.persistHistorySummary(createResults(), []);

    const expectedDir = path.resolve('reports', 'cross-browser', 'history');
    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
  });

  it('should not create the history directory if it already exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    generator.persistHistorySummary(createResults(), []);

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should write a JSON file with timestamped filename', () => {
    generator.persistHistorySummary(createResults(), []);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const filePath = callArgs[0] as string;

    // File should be in history directory with summary- prefix
    expect(filePath).toContain(path.join('reports', 'cross-browser', 'history'));
    expect(path.basename(filePath)).toMatch(/^summary-.*\.json$/);
  });

  it('should replace colons in the timestamp for filesystem compatibility', () => {
    generator.persistHistorySummary(createResults(), []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const filePath = callArgs[0] as string;
    const filename = path.basename(filePath);

    // Should not contain colons (they are replaced with dashes)
    expect(filename).not.toContain(':');
  });

  it('should include browser names in the JSON output', () => {
    generator.persistHistorySummary(createResults(), []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.browsers).toEqual(['chromium', 'firefox']);
  });

  it('should include per-browser pass/fail/skip counts', () => {
    generator.persistHistorySummary(createResults(), []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.results.chromium).toEqual({ total: 10, passed: 8, failed: 1, skipped: 1 });
    expect(json.results.firefox).toEqual({ total: 10, passed: 7, failed: 2, skipped: 1 });
  });

  it('should include total duration summed across all browsers', () => {
    generator.persistHistorySummary(createResults(), []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.totalDuration).toBe(11000); // 5000 + 6000
  });

  it('should include browser-specific failures list', () => {
    const failures = ['Login scenario', 'Checkout scenario'];
    generator.persistHistorySummary(createResults(), failures);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.browserSpecificFailures).toEqual(['Login scenario', 'Checkout scenario']);
  });

  it('should include a timestamp field in ISO format', () => {
    generator.persistHistorySummary(createResults(), []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.timestamp).toBeDefined();
    // Validate ISO string format
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
  });

  it('should handle empty results gracefully', () => {
    const emptyResults = new Map<string, BrowserRunResult>();

    generator.persistHistorySummary(emptyResults, []);

    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    const json = JSON.parse(callArgs[1] as string);

    expect(json.browsers).toEqual([]);
    expect(json.results).toEqual({});
    expect(json.totalDuration).toBe(0);
    expect(json.browserSpecificFailures).toEqual([]);
  });

  it('should not throw when writeFileSync fails', () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('Disk full');
    });

    // Should not throw
    expect(() => {
      generator.persistHistorySummary(createResults(), []);
    }).not.toThrow();
  });
});
