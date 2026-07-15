import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

/**
 * ReportLinker injects a navigation link/banner into the main Cucumber HTML report
 * that points to the cross-browser matrix report.
 *
 * Validates: Requirements 5.3
 */
export class ReportLinker {
  /**
   * Inject a navigation banner linking to the cross-browser matrix report
   * into the main HTML report file.
   *
   * If either file does not exist, logs a debug message and returns without error.
   * When both exist, reads the main report HTML and injects a styled banner
   * with a link to the cross-browser report before the closing </body> tag.
   *
   * @param mainReportPath - Path to the main Cucumber HTML report
   * @param crossBrowserReportPath - Path to the cross-browser matrix report
   */
  static linkCrossBrowserReport(mainReportPath: string, crossBrowserReportPath: string): void {
    // Check if the main report exists
    if (!fs.existsSync(mainReportPath)) {
      Logger.debug(`[ReportLinker] Main report not found at: ${mainReportPath}. Skipping link injection.`);
      return;
    }

    // Check if the cross-browser report exists
    if (!fs.existsSync(crossBrowserReportPath)) {
      Logger.debug(`[ReportLinker] Cross-browser report not found at: ${crossBrowserReportPath}. Skipping link injection.`);
      return;
    }

    try {
      // Calculate relative path from main report to cross-browser report
      const mainReportDir = path.dirname(path.resolve(mainReportPath));
      const absoluteCrossBrowserPath = path.resolve(crossBrowserReportPath);
      const relativePath = path.relative(mainReportDir, absoluteCrossBrowserPath).replace(/\\/g, '/');

      // Read the main report HTML
      let htmlContent = fs.readFileSync(mainReportPath, 'utf-8');

      // Build the banner HTML with inline styles
      const bannerHtml = `
<!-- Cross-Browser Report Link Banner -->
<div id="cross-browser-report-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background-color:#1a73e8;color:#ffffff;padding:12px 20px;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;box-shadow:0 -2px 8px rgba(0,0,0,0.15);">
  <span style="margin-right:8px;font-size:18px;">🔗</span>
  <a href="${relativePath}" style="color:#ffffff;text-decoration:underline;font-weight:600;" target="_blank" rel="noopener noreferrer">View Cross-Browser Matrix Report</a>
</div>
`;

      // Inject the banner before the closing </body> tag
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${bannerHtml}</body>`);
      } else {
        // If no </body> tag found, append at the end
        htmlContent += bannerHtml;
      }

      // Write the modified HTML back
      fs.writeFileSync(mainReportPath, htmlContent, 'utf-8');

      Logger.info(`[ReportLinker] Cross-browser report link injected into: ${mainReportPath}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`[ReportLinker] Failed to inject cross-browser report link: ${errorMsg}`);
    }
  }
}
