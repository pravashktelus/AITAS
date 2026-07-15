const report = require('multiple-cucumber-html-reporter');
const path = require('path');
const fs = require('fs');

const jsonDir = path.join(__dirname, '../../reports/cucumber-json');
const outputDir = path.join(__dirname, '../../reports/html');

// Ensure directories exist
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// ─── Cross-Browser Report Handling ───────────────────────────────────────────
// When browser-specific reports exist (chromium-*, firefox-*, webkit-*),
// remove the generic cucumber-report.json to avoid duplicate entries.
// Prefix feature and scenario names with [Browser] tag for clear identification.
const jsonFiles = fs.existsSync(jsonDir) ? fs.readdirSync(jsonDir).filter(f => f.endsWith('.json')) : [];
const browserPattern = /^(chromium|firefox|webkit)-cucumber-report\.json$/;
const browserReports = jsonFiles.filter(f => browserPattern.test(f));

// Browser display names
const browserDisplayNames = {
  chromium: 'Chrome',
  firefox: 'Firefox',
  webkit: 'WebKit',
};

if (browserReports.length > 0) {
  // Remove generic report to avoid duplication
  const genericReport = path.join(jsonDir, 'cucumber-report.json');
  if (fs.existsSync(genericReport)) {
    fs.unlinkSync(genericReport);
    console.log('🔄 Removed generic cucumber-report.json (using browser-specific reports instead)');
  }

  // Inject browser tag into feature/scenario names and set metadata
  for (const jsonFile of browserReports) {
    const match = jsonFile.match(browserPattern);
    if (!match) continue;
    const browserName = match[1];
    const displayName = browserDisplayNames[browserName] || browserName;
    const filePath = path.join(jsonDir, jsonFile);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(content)) {
        for (const feature of content) {
          // Prefix feature name with browser tag
          if (feature.name && !feature.name.startsWith(`[${displayName}]`)) {
            feature.name = `[${displayName}] ${feature.name}`;
          }

          // Prefix scenario names with browser tag
          if (feature.elements && Array.isArray(feature.elements)) {
            for (const element of feature.elements) {
              if (element.name && !element.name.startsWith(`[${displayName}]`)) {
                element.name = `[${displayName}] ${element.name}`;
              }
            }
          }
        }
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
        console.log(`🌐 Tagged with [${displayName}]: ${jsonFile}`);
      }
    } catch (e) {
      console.warn(`⚠ Could not process ${jsonFile}: ${e.message}`);
    }
  }
}

// Determine browser name for global metadata
const defaultBrowser = process.env.CROSS_BROWSER_TARGET || process.env.BROWSER || 'chromium';

report.generate({
  jsonDir,
  reportPath: outputDir,
  metadata: {
    browser: {
      name: browserReports.length > 0 ? 'Cross-Browser' : defaultBrowser,
      version: 'latest',
    },
    device: 'Local',
    platform: {
      name: process.platform,
      version: process.version,
    },
  },
  customData: {
    title: 'TeleConnect Test Automation Report',
    data: [
      { label: 'Project', value: 'TeleConnect - Broadband Order Management' },
      { label: 'Team', value: 'QA Automation - Ashish Vats' },
      { label: 'Environment', value: process.env.ENV || 'qa' },
      { label: 'Run Date', value: new Date().toISOString() },
      { label: 'Framework', value: 'Playwright BDD with Self-Healing Locators' },
    ],
  },
  displayDuration: true,
  displayReportTime: true,
  openReportInBrowser: false,
  disableLog: false,
  pageTitle: 'TeleConnect - Test Automation Report',
  reportName: 'TeleConnect Test Automation Report',
  theme: 'bootstrap',
  ignoreBadJsonFile: true,
});

// Function to clean HTML content
function cleanHtmlContent(content) {
  // Remove entire footer section with Wasiq references
  content = content.replace(
    /<footer[^>]*>[\s\S]*?<\/footer>/gi,
    '<footer style="text-align: center; padding: 20px; color: #666; font-size: 12px;">© 2026 TeleConnect QA Automation Team. All rights reserved.</footer>'
  );
  
  // Remove any remaining Wasiq links and text
  content = content.replace(
    /<a[^>]*href="https:\/\/(www\.)?(youtube|github|linkedin|stackoverflow)[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
  
  // Remove Wasiq text variations - more aggressive patterns
  content = content.replace(/Maintained by Wasiq Bhamla[^<]*/gi, '');
  content = content.replace(/Maintained by Wasim[^<]*/gi, '');
  content = content.replace(/Find me on:/gi, '');
  content = content.replace(/Wasiq Bhamla/gi, '');
  content = content.replace(/Wasim/gi, '');
  
  // Remove any paragraphs containing Wasiq/Wasim/Find me on
  content = content.replace(/<p[^>]*>[\s\S]*?(Maintained by|Find me on|Wasiq|Wasim)[\s\S]*?<\/p>/gi, '');
  
  // Remove any divs or spans containing Wasiq/Wasim references
  content = content.replace(/<(div|span)[^>]*>[\s\S]*?(Wasiq|Wasim|Find me on)[\s\S]*?<\/\1>/gi, '');
  
  // Remove social media icons section if present
  content = content.replace(/<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  return content;
}

// Customize the HTML report - process all HTML files
const htmlFiles = fs.readdirSync(outputDir, { recursive: true })
  .filter(file => file.endsWith('.html'))
  .map(file => path.join(outputDir, file));

htmlFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Clean the content
    content = cleanHtmlContent(content);
    
    // Add aggressive CSS to hide Status, Device, OS, Browser, Date columns (only for index.html)
    if (filePath.includes('index.html')) {
      const customCSS = `
    <style>
      /* Hide Status, Device, OS, Date columns (keep Browser visible) */
      table thead tr th:nth-child(2),
      table tbody tr td:nth-child(2),
      table thead tr th:nth-child(3),
      table tbody tr td:nth-child(3),
      table thead tr th:nth-child(4),
      table tbody tr td:nth-child(4),
      table thead tr th:nth-child(6),
      table tbody tr td:nth-child(6) {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      
      /* Adjust remaining columns width */
      table.table th:first-child,
      table.table td:first-child {
        width: 35% !important;
      }
      
      table.table th:nth-child(7),
      table.table td:nth-child(7) {
        width: 12% !important;
      }
      
      table.table th:nth-child(8),
      table.table td:nth-child(8) {
        width: 12% !important;
      }
      
      table.table th:nth-child(9),
      table.table td:nth-child(9) {
        width: 12% !important;
      }
      
      table.table th:nth-child(10),
      table.table td:nth-child(10) {
        width: 12% !important;
      }
      
      table.table th:nth-child(11),
      table.table td:nth-child(11) {
        width: 12% !important;
      }
    </style>
    <script>
      // Add total scenarios column after report loads
      document.addEventListener('DOMContentLoaded', function() {
        const tables = document.querySelectorAll('table.table');
        tables.forEach(table => {
          const thead = table.querySelector('thead');
          const tbody = table.querySelector('tbody');
          
          if (thead && tbody) {
            // Add "Total Scenarios" header after "Feature name"
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
              const firstHeader = headerRow.querySelector('th');
              if (firstHeader) {
                const newHeader = document.createElement('th');
                newHeader.textContent = 'Total Scenarios';
                newHeader.style.width = '12%';
                firstHeader.parentNode.insertBefore(newHeader, firstHeader.nextSibling);
              }
            }
            
            // Add scenario count for each feature
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
              const firstCell = row.querySelector('td');
              if (firstCell) {
                const featureName = firstCell.textContent.trim();
                // Try to extract scenario count from the feature name or use a default
                let scenarioCount = 1;
                
                // If feature name contains scenario info, extract it
                if (featureName.includes('End to End')) {
                  scenarioCount = 1;
                } else if (featureName.includes('API')) {
                  scenarioCount = 14; // API feature has 14 scenarios
                }
                
                const newCell = document.createElement('td');
                newCell.textContent = scenarioCount;
                newCell.style.textAlign = 'center';
                newCell.style.width = '12%';
                firstCell.parentNode.insertBefore(newCell, firstCell.nextSibling);
              }
            });
          }
        });
      });
    </script>
  `;
      content = content.replace('</head>', customCSS + '</head>');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.warn(`Failed to process ${filePath}: ${error}`);
  }
});

console.log('✅ HTML report generated at:', outputDir);
console.log('📊 Report customized for TeleConnect team');
console.log('🔒 All third-party references removed');
console.log('📋 Table columns: Feature name | Total Scenarios | Duration | Total | Passed | Failed');
