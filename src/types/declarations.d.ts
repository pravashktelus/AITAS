declare module 'multiple-cucumber-html-reporter' {
  interface ReportOptions {
    jsonDir: string;
    reportPath: string;
    metadata?: {
      browser?: { name: string; version: string };
      device?: string;
      platform?: { name: string; version: string };
    };
    customData?: {
      title: string;
      data: Array<{ label: string; value: string }>;
    };
    displayDuration?: boolean;
    displayReportTime?: boolean;
    openReportInBrowser?: boolean;
    disableLog?: boolean;
    pageTitle?: string;
    reportName?: string;
    theme?: string;
    ignoreBadJsonFile?: boolean;
  }

  const reporter: {
    generate(options: ReportOptions): void;
  };

  export = reporter;
}
