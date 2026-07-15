import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReportLinker } from '../../src/core/ReportLinker';

// Mock the Logger to prevent actual file I/O during tests
vi.mock('../../src/utils/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReportLinker.linkCrossBrowserReport', () => {
  const testDir = path.join(__dirname, '__temp_report_linker_test__');
  const mainReportPath = path.join(testDir, 'main-report.html');
  const crossBrowserReportPath = path.join(testDir, 'cross-browser', 'matrix-report.html');

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, 'cross-browser'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should inject a banner link before </body> when both reports exist', () => {
    const originalHtml = '<html><head><title>Report</title></head><body><h1>Test Report</h1></body></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');
    fs.writeFileSync(crossBrowserReportPath, '<html><body>Matrix</body></html>', 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const modifiedHtml = fs.readFileSync(mainReportPath, 'utf-8');
    expect(modifiedHtml).toContain('cross-browser-report-banner');
    expect(modifiedHtml).toContain('View Cross-Browser Matrix Report');
    expect(modifiedHtml).toContain('cross-browser/matrix-report.html');
    expect(modifiedHtml).toContain('</body>');
  });

  it('should use a relative path from main report to cross-browser report', () => {
    const originalHtml = '<html><body><p>Content</p></body></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');
    fs.writeFileSync(crossBrowserReportPath, '<html><body></body></html>', 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const modifiedHtml = fs.readFileSync(mainReportPath, 'utf-8');
    // The relative path from testDir to testDir/cross-browser/matrix-report.html
    expect(modifiedHtml).toContain('href="cross-browser/matrix-report.html"');
  });

  it('should style the banner with blue background and white text', () => {
    const originalHtml = '<html><body></body></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');
    fs.writeFileSync(crossBrowserReportPath, '<html><body></body></html>', 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const modifiedHtml = fs.readFileSync(mainReportPath, 'utf-8');
    expect(modifiedHtml).toContain('background-color:#1a73e8');
    expect(modifiedHtml).toContain('color:#ffffff');
  });

  it('should include a link icon in the banner', () => {
    const originalHtml = '<html><body></body></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');
    fs.writeFileSync(crossBrowserReportPath, '<html><body></body></html>', 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const modifiedHtml = fs.readFileSync(mainReportPath, 'utf-8');
    expect(modifiedHtml).toContain('🔗');
  });

  it('should not modify the file when main report does not exist', () => {
    fs.writeFileSync(crossBrowserReportPath, '<html><body></body></html>', 'utf-8');

    // Should not throw
    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    expect(fs.existsSync(mainReportPath)).toBe(false);
  });

  it('should not modify the file when cross-browser report does not exist', () => {
    const originalHtml = '<html><body><p>Original</p></body></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const content = fs.readFileSync(mainReportPath, 'utf-8');
    expect(content).toBe(originalHtml);
  });

  it('should append banner at end when no </body> tag exists', () => {
    const originalHtml = '<html><h1>No body tag</h1></html>';
    fs.writeFileSync(mainReportPath, originalHtml, 'utf-8');
    fs.writeFileSync(crossBrowserReportPath, '<html><body></body></html>', 'utf-8');

    ReportLinker.linkCrossBrowserReport(mainReportPath, crossBrowserReportPath);

    const modifiedHtml = fs.readFileSync(mainReportPath, 'utf-8');
    expect(modifiedHtml).toContain('cross-browser-report-banner');
    expect(modifiedHtml).toContain(originalHtml);
  });
});
