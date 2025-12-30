import { z } from "zod";
import type { Tool, ToolParams } from "./index";
import {
  getAuthenticatedClient,
  calculatePercentageChange,
  formatChange,
  formatDate,
  getDateRange,
  getExpectedCTR
} from "../utils/gscHelper";

/**
 * Tool 1: Find High-Potential Keywords
 * Identifies keywords ranking 11-40 (striking distance) and high impression/low CTR opportunities
 */
export const findHighPotentialKeywordsTool: Tool = {
  name: "find_high_potential_keywords",
  description: "Find keywords with high potential for quick SEO wins: keywords ranking 11-40 (striking distance to page 1) and keywords with high impressions but low CTR (title/description optimization opportunities).",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console"),
    days: z.number()
      .min(1).max(540)
      .default(28)
      .describe("Number of days to analyze (default: 28)"),
    min_impressions: z.number()
      .min(1)
      .default(100)
      .describe("Minimum impressions threshold (default: 100)"),
    ctr_threshold: z.number()
      .min(0).max(100)
      .default(2)
      .describe("CTR percentage below which is considered low (default: 2%)"),
    position_range_start: z.number()
      .min(1)
      .default(11)
      .describe("Start of striking distance position range (default: 11)"),
    position_range_end: z.number()
      .min(1)
      .default(40)
      .describe("End of striking distance position range (default: 40)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, days, min_impressions, ctr_threshold, position_range_start, position_range_end } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const { startDate, endDate } = getDateRange(days);

      // Query search analytics with query dimension
      const data = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 5000
      });

      if (!data.rows || data.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No search data available for ${site_url} in the last ${days} days.`
          }]
        };
      }

      // Filter striking distance keywords (position 11-40, high impressions)
      const strikingDistance = data.rows
        .filter((row: any) =>
          row.position >= position_range_start &&
          row.position <= position_range_end &&
          row.impressions >= min_impressions
        )
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 20);

      // Filter CTR opportunity keywords (high impressions, low CTR)
      const ctrOpportunities = data.rows
        .filter((row: any) => {
          const expectedCTR = getExpectedCTR(row.position);
          const actualCTR = row.ctr || 0;
          return row.impressions >= min_impressions &&
                 actualCTR < (ctr_threshold / 100) &&
                 actualCTR < expectedCTR * 0.5; // CTR is less than 50% of expected
        })
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 20);

      // Build output
      let output = `High-Potential Keywords Report for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `Analysis Period: Last ${days} days (${startDate} to ${endDate})\n\n`;

      // Striking Distance Section
      output += `STRIKING DISTANCE KEYWORDS (Position ${position_range_start}-${position_range_end})\n`;
      output += `These keywords are close to page 1 - small ranking improvements could yield big traffic gains.\n`;
      output += `${'-'.repeat(60)}\n`;

      if (strikingDistance.length > 0) {
        output += `Keyword | Position | Impressions | Clicks | CTR | Potential\n`;
        output += `${'-'.repeat(60)}\n`;

        strikingDistance.forEach((row: any) => {
          const keyword = row.keys[0].substring(0, 35);
          const position = row.position.toFixed(1);
          const impressions = row.impressions;
          const clicks = row.clicks;
          const ctr = (row.ctr * 100).toFixed(2) + '%';
          const potential = row.position <= 15 ? 'HIGH' : row.position <= 25 ? 'MEDIUM' : 'LOW';
          output += `${keyword} | ${position} | ${impressions} | ${clicks} | ${ctr} | ${potential}\n`;
        });

        output += `\nStriking Distance Recommendations:\n`;
        strikingDistance.slice(0, 3).forEach((row: any, i: number) => {
          output += `${i + 1}. "${row.keys[0]}" (pos ${row.position.toFixed(1)}) - Add internal links, improve content depth\n`;
        });
      } else {
        output += `No keywords found in striking distance with ${min_impressions}+ impressions.\n`;
      }

      output += `\n`;

      // CTR Opportunity Section
      output += `CTR OPPORTUNITY KEYWORDS (High Impressions, Low CTR)\n`;
      output += `These keywords get seen but not clicked - improve titles/meta descriptions.\n`;
      output += `${'-'.repeat(60)}\n`;

      if (ctrOpportunities.length > 0) {
        output += `Keyword | Position | Impressions | CTR | Expected CTR | Gap\n`;
        output += `${'-'.repeat(60)}\n`;

        ctrOpportunities.forEach((row: any) => {
          const keyword = row.keys[0].substring(0, 30);
          const position = row.position.toFixed(1);
          const impressions = row.impressions;
          const actualCTR = (row.ctr * 100).toFixed(2) + '%';
          const expectedCTR = (getExpectedCTR(row.position) * 100).toFixed(1) + '%';
          const gap = '-' + ((getExpectedCTR(row.position) - row.ctr) * 100).toFixed(1) + 'pp';
          output += `${keyword} | ${position} | ${impressions} | ${actualCTR} | ${expectedCTR} | ${gap}\n`;
        });

        output += `\nCTR Improvement Recommendations:\n`;
        ctrOpportunities.slice(0, 3).forEach((row: any, i: number) => {
          output += `${i + 1}. "${row.keys[0]}" - CTR ${((getExpectedCTR(row.position) - row.ctr) / getExpectedCTR(row.position) * 100).toFixed(0)}% below expected. Review title tag and meta description.\n`;
        });
      } else {
        output += `No significant CTR opportunities found.\n`;
      }

      // Summary
      output += `\nQUICK WINS SUMMARY\n`;
      output += `${'-'.repeat(60)}\n`;
      const totalStrikingImpressions = strikingDistance.reduce((sum: number, r: any) => sum + r.impressions, 0);
      const totalCTRImpressions = ctrOpportunities.reduce((sum: number, r: any) => sum + r.impressions, 0);
      output += `- ${strikingDistance.length} keywords in striking distance with ${totalStrikingImpressions.toLocaleString()} combined impressions\n`;
      output += `- ${ctrOpportunities.length} keywords with CTR significantly below position average\n`;

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error finding high-potential keywords: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 2: Check Page Experience
 * Analyzes mobile usability and crawl status (note: CWV not available via API)
 */
export const checkPageExperienceTool: Tool = {
  name: "check_page_experience",
  description: "Check page experience signals including mobile usability, crawl status, and indexing state. Note: Core Web Vitals (LCP, CLS, INP) are NOT available via GSC API - use PageSpeed Insights for CWV data.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    urls: z.string({
      required_error: "URLs are required"
    }).min(1).describe("List of URLs to check, one per line (max 10)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, urls } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const urlList = urls.split(/[\n,]/).map(u => u.trim()).filter(u => u).slice(0, 10);

      let output = `Page Experience Report for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `Note: Core Web Vitals (LCP, CLS, INP) are NOT available via GSC API.\n`;
      output += `Use PageSpeed Insights for CWV data: https://pagespeed.web.dev/\n\n`;

      let mobilePass = 0;
      let mobileFail = 0;
      let fetchIssues = 0;
      let robotsBlocked = 0;

      for (const url of urlList) {
        try {
          const result = await client.inspectUrl(site_url, url);
          const inspection = result.inspectionResult;

          output += `URL: ${url}\n`;
          output += `${'-'.repeat(60)}\n`;

          // Mobile usability
          const mobileUsability = inspection?.mobileUsabilityResult?.verdict || 'UNKNOWN';
          if (mobileUsability === 'PASS') {
            mobilePass++;
            output += `Mobile Usability: PASS\n`;
          } else if (mobileUsability === 'FAIL') {
            mobileFail++;
            output += `Mobile Usability: FAIL\n`;
            const issues = inspection?.mobileUsabilityResult?.issues || [];
            if (issues.length > 0) {
              output += `Issues Found:\n`;
              issues.forEach((issue: any) => {
                output += `  - ${issue.issueType || issue.message || 'Unknown issue'}\n`;
              });
            }
          } else {
            output += `Mobile Usability: ${mobileUsability}\n`;
          }

          // Indexing info
          const indexStatus = inspection?.indexStatusResult;
          if (indexStatus) {
            output += `Crawled As: ${indexStatus.crawledAs || 'UNKNOWN'}\n`;
            output += `Last Crawl: ${indexStatus.lastCrawlTime || 'Never'}\n`;
            output += `Page Fetch: ${indexStatus.pageFetchState || 'UNKNOWN'}\n`;
            output += `Robots.txt: ${indexStatus.robotsTxtState || 'UNKNOWN'}\n`;
            output += `Indexing State: ${indexStatus.indexingState || 'UNKNOWN'}\n`;

            if (indexStatus.pageFetchState && indexStatus.pageFetchState !== 'SUCCESSFUL') {
              fetchIssues++;
            }
            if (indexStatus.robotsTxtState === 'BLOCKED') {
              robotsBlocked++;
            }
          }

          output += `\n`;
        } catch (urlError: any) {
          output += `URL: ${url}\n`;
          output += `Error: ${urlError.message}\n\n`;
        }
      }

      // Summary
      output += `SUMMARY\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `URLs Checked: ${urlList.length}\n`;
      output += `Mobile Usability Pass: ${mobilePass} (${((mobilePass / urlList.length) * 100).toFixed(0)}%)\n`;
      output += `Mobile Usability Fail: ${mobileFail} (${((mobileFail / urlList.length) * 100).toFixed(0)}%)\n`;
      output += `Fetch Issues: ${fetchIssues}\n`;
      output += `Robots Blocked: ${robotsBlocked}\n`;

      if (mobileFail > 0 || fetchIssues > 0) {
        output += `\nRECOMMENDATIONS\n`;
        output += `${'-'.repeat(60)}\n`;
        if (mobileFail > 0) {
          output += `1. Fix mobile usability issues on ${mobileFail} page(s)\n`;
        }
        if (fetchIssues > 0) {
          output += `2. Investigate fetch issues on ${fetchIssues} page(s)\n`;
        }
        output += `3. For Core Web Vitals data, use PageSpeed Insights\n`;
      }

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error checking page experience: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 3: Get Coverage Report
 * Comprehensive indexing and coverage analysis
 */
export const getCoverageReportTool: Tool = {
  name: "get_coverage_report",
  description: "Generate a comprehensive indexing and coverage report by analyzing multiple URLs, aggregating statistics, and identifying patterns in indexing issues.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    urls: z.string({
      required_error: "URLs are required"
    }).min(1).describe("List of URLs to analyze, one per line (max 25)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, urls } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const urlList = urls.split(/[\n,]/).map(u => u.trim()).filter(u => u).slice(0, 25);

      const issues: { [key: string]: string[] } = {
        'Indexed': [],
        'Crawled - not indexed': [],
        'Discovered - not indexed': [],
        'Blocked by robots.txt': [],
        'Redirect': [],
        'Not found (404)': [],
        'Server error (5xx)': [],
        'Other': []
      };

      let output = `Comprehensive Coverage Report for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `URLs Analyzed: ${urlList.length}\n`;
      output += `Analysis Date: ${new Date().toISOString().split('T')[0]}\n\n`;

      for (const url of urlList) {
        try {
          const result = await client.inspectUrl(site_url, url);
          const indexStatus = result.inspectionResult?.indexStatusResult;

          if (!indexStatus) {
            issues['Other'].push(url);
            continue;
          }

          const verdict = indexStatus.verdict || 'UNKNOWN';
          const coverageState = indexStatus.coverageState || 'UNKNOWN';
          const pageFetchState = indexStatus.pageFetchState || 'UNKNOWN';
          const robotsTxtState = indexStatus.robotsTxtState || 'ALLOWED';

          if (verdict === 'PASS' || coverageState === 'Submitted and indexed') {
            issues['Indexed'].push(url);
          } else if (robotsTxtState === 'BLOCKED') {
            issues['Blocked by robots.txt'].push(url);
          } else if (pageFetchState === 'NOT_FOUND') {
            issues['Not found (404)'].push(url);
          } else if (pageFetchState === 'SERVER_ERROR') {
            issues['Server error (5xx)'].push(url);
          } else if (pageFetchState === 'REDIRECT') {
            issues['Redirect'].push(url);
          } else if (coverageState?.includes('Crawled')) {
            issues['Crawled - not indexed'].push(url);
          } else if (coverageState?.includes('Discovered')) {
            issues['Discovered - not indexed'].push(url);
          } else {
            issues['Other'].push(url);
          }
        } catch (urlError: any) {
          issues['Other'].push(url);
        }
      }

      // Coverage Summary
      const indexed = issues['Indexed'].length;
      const notIndexed = urlList.length - indexed;

      output += `COVERAGE SUMMARY\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Indexed: ${indexed} (${((indexed / urlList.length) * 100).toFixed(0)}%)\n`;
      output += `Not Indexed: ${notIndexed} (${((notIndexed / urlList.length) * 100).toFixed(0)}%)\n\n`;

      // Issue Breakdown
      output += `ISSUE BREAKDOWN\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Issue Type | Count | % | Priority\n`;
      output += `${'-'.repeat(60)}\n`;

      const priorityMap: { [key: string]: string } = {
        'Crawled - not indexed': 'HIGH',
        'Discovered - not indexed': 'MEDIUM',
        'Not found (404)': 'HIGH',
        'Server error (5xx)': 'CRITICAL',
        'Blocked by robots.txt': 'CHECK',
        'Redirect': 'LOW',
        'Other': 'CHECK'
      };

      for (const [issueType, urlsAffected] of Object.entries(issues)) {
        if (issueType !== 'Indexed' && urlsAffected.length > 0) {
          const count = urlsAffected.length;
          const pct = ((count / urlList.length) * 100).toFixed(0);
          const priority = priorityMap[issueType] || 'CHECK';
          output += `${issueType} | ${count} | ${pct}% | ${priority}\n`;
        }
      }

      // Detailed Issues
      output += `\nDETAILED ISSUES\n`;
      output += `${'-'.repeat(60)}\n`;

      for (const [issueType, urlsAffected] of Object.entries(issues)) {
        if (issueType !== 'Indexed' && urlsAffected.length > 0) {
          output += `\n${issueType.toUpperCase()} (${urlsAffected.length} URLs):\n`;
          urlsAffected.slice(0, 10).forEach(url => {
            output += `  - ${url}\n`;
          });
          if (urlsAffected.length > 10) {
            output += `  ... and ${urlsAffected.length - 10} more\n`;
          }
        }
      }

      // Action Items
      output += `\nACTION ITEMS\n`;
      output += `${'-'.repeat(60)}\n`;
      let actionNum = 1;

      if (issues['Server error (5xx)'].length > 0) {
        output += `${actionNum++}. [CRITICAL] Fix server errors on ${issues['Server error (5xx)'].length} page(s)\n`;
      }
      if (issues['Crawled - not indexed'].length > 0) {
        output += `${actionNum++}. [HIGH] Review ${issues['Crawled - not indexed'].length} crawled-but-not-indexed pages for quality\n`;
      }
      if (issues['Not found (404)'].length > 0) {
        output += `${actionNum++}. [HIGH] Fix or redirect ${issues['Not found (404)'].length} 404 pages\n`;
      }
      if (issues['Discovered - not indexed'].length > 0) {
        output += `${actionNum++}. [MEDIUM] Add internal links to ${issues['Discovered - not indexed'].length} discovered-but-not-indexed pages\n`;
      }
      if (issues['Blocked by robots.txt'].length > 0) {
        output += `${actionNum++}. [CHECK] Verify robots.txt blocks on ${issues['Blocked by robots.txt'].length} pages are intentional\n`;
      }

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error generating coverage report: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 4: Analyze Backlinks (Limited)
 * Page authority analysis - note: external backlinks NOT available via API
 */
export const analyzeBacklinksTool: Tool = {
  name: "analyze_backlinks",
  description: "Analyze page authority and internal linking patterns based on search visibility. IMPORTANT: External backlink data is NOT available via GSC API - use GSC Web UI or third-party tools (Ahrefs, SEMrush) for external link data.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    days: z.number()
      .min(1).max(540)
      .default(28)
      .describe("Number of days to analyze (default: 28)"),
    min_impressions: z.number()
      .min(0)
      .default(10)
      .describe("Minimum impressions for low-visibility detection (default: 10)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, days, min_impressions } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const { startDate, endDate } = getDateRange(days);

      // Query pages with their metrics
      const pageData = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 1000
      });

      // Query page + query to find hub pages
      const pageQueryData = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['page', 'query'],
        rowLimit: 5000
      });

      let output = `Link & Page Authority Analysis for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `IMPORTANT: External backlink data is NOT available via GSC API.\n`;
      output += `For external links, use GSC Web UI or third-party tools.\n`;
      output += `\nThis report analyzes internal page authority based on search visibility.\n`;
      output += `Analysis Period: Last ${days} days\n\n`;

      if (!pageData.rows || pageData.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: output + `No page data available for ${site_url}.`
          }]
        };
      }

      // Calculate authority score (based on clicks, impressions, position)
      const pagesWithAuthority = pageData.rows.map((row: any) => {
        const clicks = row.clicks || 0;
        const impressions = row.impressions || 0;
        const position = row.position || 100;
        // Simple authority score: weighted combination
        const authorityScore = Math.round(
          (clicks * 2) +
          (impressions * 0.1) +
          ((100 - Math.min(position, 100)) * 0.5)
        );
        return {
          page: row.keys[0],
          clicks,
          impressions,
          position,
          authorityScore
        };
      }).sort((a: any, b: any) => b.authorityScore - a.authorityScore);

      // Count queries per page (hub pages)
      const queriesPerPage: { [key: string]: number } = {};
      if (pageQueryData.rows) {
        pageQueryData.rows.forEach((row: any) => {
          const page = row.keys[0];
          queriesPerPage[page] = (queriesPerPage[page] || 0) + 1;
        });
      }

      // Top authority pages
      output += `TOP AUTHORITY PAGES (by search visibility)\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Page | Clicks | Impressions | Queries | Score\n`;
      output += `${'-'.repeat(60)}\n`;

      pagesWithAuthority.slice(0, 15).forEach((page: any) => {
        const pagePath = page.page.replace(site_url, '').substring(0, 40) || '/';
        const queries = queriesPerPage[page.page] || 0;
        output += `${pagePath} | ${page.clicks} | ${page.impressions} | ${queries} | ${page.authorityScore}\n`;
      });

      // Hub pages (many queries)
      output += `\nHUB PAGES (rank for many queries)\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Good candidates for internal link sources:\n`;

      const hubPages = Object.entries(queriesPerPage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      hubPages.forEach(([page, queryCount], i) => {
        const pagePath = page.replace(site_url, '').substring(0, 50) || '/';
        output += `${i + 1}. ${pagePath} - Ranks for ${queryCount} queries\n`;
      });

      // Low visibility pages
      const lowVisibility = pagesWithAuthority.filter((p: any) => p.impressions < min_impressions && p.impressions > 0);

      output += `\nLOW VISIBILITY PAGES (potential orphans)\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `These pages have few impressions - may need more internal links:\n`;

      lowVisibility.slice(0, 10).forEach((page: any, i: number) => {
        const pagePath = page.page.replace(site_url, '').substring(0, 50) || '/';
        output += `${i + 1}. ${pagePath} - ${page.impressions} impressions, ${page.clicks} clicks\n`;
      });

      // Recommendations
      output += `\nINTERNAL LINKING RECOMMENDATIONS\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `1. Add links FROM hub pages TO low-visibility pages\n`;
      output += `2. Create topic clusters around top authority pages\n`;
      output += `3. Review orphan pages for proper internal linking\n`;

      output += `\nFOR EXTERNAL BACKLINK DATA\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `- GSC Web UI: Search Console > Links\n`;
      output += `- Ahrefs: https://ahrefs.com/\n`;
      output += `- SEMrush: https://www.semrush.com/\n`;
      output += `- Moz: https://moz.com/link-explorer\n`;

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing backlinks: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 5: Spot Content Opportunities
 * Find rising/declining queries and content refresh candidates
 */
export const spotContentOpportunitiesTool: Tool = {
  name: "spot_content_opportunities",
  description: "Compare recent period vs previous period to find rising queries (emerging opportunities), declining pages (content refresh candidates), and new/lost queries.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    recent_days: z.number()
      .min(7).max(90)
      .default(14)
      .describe("Recent period in days (default: 14)"),
    comparison_days: z.number()
      .min(7).max(90)
      .default(14)
      .describe("Comparison period length - immediately before recent (default: 14)"),
    min_impressions: z.number()
      .min(1)
      .default(50)
      .describe("Minimum impressions to include (default: 50)"),
    growth_threshold: z.number()
      .min(1)
      .default(20)
      .describe("Percentage growth to flag as 'rising' (default: 20%)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, recent_days, comparison_days, min_impressions, growth_threshold } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      // Calculate date ranges
      const recentEnd = new Date();
      const recentStart = new Date();
      recentStart.setDate(recentStart.getDate() - recent_days);

      const compEnd = new Date(recentStart);
      compEnd.setDate(compEnd.getDate() - 1);
      const compStart = new Date(compEnd);
      compStart.setDate(compStart.getDate() - comparison_days);

      // Query recent period (queries)
      const recentQueries = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(recentStart),
        endDate: formatDate(recentEnd),
        dimensions: ['query'],
        rowLimit: 2000
      });

      // Query comparison period (queries)
      const compQueries = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(compStart),
        endDate: formatDate(compEnd),
        dimensions: ['query'],
        rowLimit: 2000
      });

      // Query recent period (pages)
      const recentPages = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(recentStart),
        endDate: formatDate(recentEnd),
        dimensions: ['page'],
        rowLimit: 1000
      });

      // Query comparison period (pages)
      const compPages = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(compStart),
        endDate: formatDate(compEnd),
        dimensions: ['page'],
        rowLimit: 1000
      });

      // Build maps for comparison
      const recentQueryMap = new Map();
      const compQueryMap = new Map();
      const recentPageMap = new Map();
      const compPageMap = new Map();

      (recentQueries.rows || []).forEach((row: any) => {
        recentQueryMap.set(row.keys[0], row);
      });
      (compQueries.rows || []).forEach((row: any) => {
        compQueryMap.set(row.keys[0], row);
      });
      (recentPages.rows || []).forEach((row: any) => {
        recentPageMap.set(row.keys[0], row);
      });
      (compPages.rows || []).forEach((row: any) => {
        compPageMap.set(row.keys[0], row);
      });

      let output = `Content Opportunities Report for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `Recent Period: ${formatDate(recentStart)} to ${formatDate(recentEnd)}\n`;
      output += `Comparison Period: ${formatDate(compStart)} to ${formatDate(compEnd)}\n\n`;

      // Rising queries
      const risingQueries: any[] = [];
      const decliningQueries: any[] = [];
      const newQueries: any[] = [];
      const lostQueries: any[] = [];

      recentQueryMap.forEach((recent, query) => {
        const comp = compQueryMap.get(query);
        if (recent.impressions >= min_impressions) {
          if (!comp) {
            newQueries.push({ query, ...recent });
          } else {
            const growth = calculatePercentageChange(comp.clicks, recent.clicks);
            if (growth >= growth_threshold) {
              risingQueries.push({ query, recent, comp, growth });
            } else if (growth <= -growth_threshold) {
              decliningQueries.push({ query, recent, comp, growth });
            }
          }
        }
      });

      compQueryMap.forEach((comp, query) => {
        if (!recentQueryMap.has(query) && comp.impressions >= min_impressions) {
          lostQueries.push({ query, ...comp });
        }
      });

      // Sort
      risingQueries.sort((a, b) => b.growth - a.growth);
      decliningQueries.sort((a, b) => a.growth - b.growth);
      newQueries.sort((a, b) => b.clicks - a.clicks);

      // Emerging Topics
      output += `EMERGING TOPICS (Rising Queries)\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `These queries are growing fast - create or expand content!\n\n`;

      if (risingQueries.length > 0) {
        output += `Query | Recent Clicks | Growth | Impressions\n`;
        output += `${'-'.repeat(60)}\n`;
        risingQueries.slice(0, 15).forEach((item: any) => {
          const query = item.query.substring(0, 35);
          output += `${query} | ${item.recent.clicks} | ${formatChange(item.growth)}% | ${item.recent.impressions}\n`;
        });
      } else {
        output += `No significantly rising queries found.\n`;
      }

      // New Queries
      output += `\nNEW QUERIES (First appearance)\n`;
      output += `${'-'.repeat(60)}\n`;

      if (newQueries.length > 0) {
        output += `Query | Clicks | Impressions | Position\n`;
        output += `${'-'.repeat(60)}\n`;
        newQueries.slice(0, 10).forEach((item: any) => {
          const query = item.query.substring(0, 35);
          output += `${query} | ${item.clicks} | ${item.impressions} | ${item.position?.toFixed(1) || 'N/A'}\n`;
        });
      } else {
        output += `No new queries found.\n`;
      }

      // Declining Topics
      output += `\nDECLINING TOPICS (Refresh Needed)\n`;
      output += `${'-'.repeat(60)}\n`;

      if (decliningQueries.length > 0) {
        output += `Query | Recent Clicks | Decline | Action\n`;
        output += `${'-'.repeat(60)}\n`;
        decliningQueries.slice(0, 15).forEach((item: any) => {
          const query = item.query.substring(0, 30);
          const action = item.growth < -50 ? 'URGENT' : 'Review';
          output += `${query} | ${item.recent.clicks} | ${formatChange(item.growth)}% | ${action}\n`;
        });
      } else {
        output += `No significantly declining queries found.\n`;
      }

      // Declining Pages
      output += `\nPAGES NEEDING REFRESH\n`;
      output += `${'-'.repeat(60)}\n`;

      const decliningPages: any[] = [];
      recentPageMap.forEach((recent, page) => {
        const comp = compPageMap.get(page);
        if (comp && recent.clicks >= 5) {
          const decline = calculatePercentageChange(comp.clicks, recent.clicks);
          if (decline <= -growth_threshold) {
            decliningPages.push({ page, recent, comp, decline });
          }
        }
      });
      decliningPages.sort((a, b) => a.decline - b.decline);

      if (decliningPages.length > 0) {
        decliningPages.slice(0, 10).forEach((item: any) => {
          const pagePath = item.page.replace(site_url, '').substring(0, 45) || '/';
          output += `${pagePath}\n  Clicks: ${item.comp.clicks} -> ${item.recent.clicks} (${formatChange(item.decline)}%)\n`;
        });
      } else {
        output += `No significantly declining pages found.\n`;
      }

      // Recommendations
      output += `\nCONTENT RECOMMENDATIONS\n`;
      output += `${'-'.repeat(60)}\n`;
      let recNum = 1;
      if (risingQueries.length > 0) {
        output += `${recNum++}. [HIGH] Create/expand content for "${risingQueries[0].query}"\n`;
      }
      if (decliningPages.length > 0) {
        output += `${recNum++}. [HIGH] Refresh content on declining pages\n`;
      }
      if (newQueries.length > 0) {
        output += `${recNum++}. [MEDIUM] Optimize for new queries appearing\n`;
      }
      if (lostQueries.length > 0) {
        output += `${recNum++}. [LOW] Investigate ${lostQueries.length} lost queries\n`;
      }

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error spotting content opportunities: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 6: Analyze Regional & Device Performance
 * Country and device breakdown with gap analysis
 */
export const analyzeRegionalDevicePerformanceTool: Tool = {
  name: "analyze_regional_device_performance",
  description: "Analyze search performance breakdown by country and device type. Identify mobile vs desktop gaps, top-performing regions, and opportunities for geo-targeted optimization.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    days: z.number()
      .min(1).max(540)
      .default(28)
      .describe("Number of days to analyze (default: 28)"),
    top_countries: z.number()
      .min(1).max(50)
      .default(10)
      .describe("Number of top countries to show (default: 10)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, days, top_countries } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const { startDate, endDate } = getDateRange(days);

      // Query by device
      const deviceData = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['device'],
        rowLimit: 100
      });

      // Query by country
      const countryData = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 250
      });

      // Query by country + device for cross-analysis
      const countryDeviceData = await client.querySearchAnalytics(site_url, {
        startDate,
        endDate,
        dimensions: ['country', 'device'],
        rowLimit: 500
      });

      let output = `Regional & Device Performance Report for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `Analysis Period: Last ${days} days (${startDate} to ${endDate})\n\n`;

      // Device Breakdown
      output += `DEVICE BREAKDOWN\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Device | Clicks | Impressions | CTR | Avg Position\n`;
      output += `${'-'.repeat(60)}\n`;

      const devices: { [key: string]: any } = {};
      let totalClicks = 0;
      let totalImpressions = 0;

      (deviceData.rows || []).forEach((row: any) => {
        const device = row.keys[0];
        devices[device] = row;
        totalClicks += row.clicks || 0;
        totalImpressions += row.impressions || 0;

        output += `${device} | ${row.clicks} | ${row.impressions} | ${(row.ctr * 100).toFixed(2)}% | ${row.position?.toFixed(1) || 'N/A'}\n`;
      });

      // Mobile vs Desktop Gap Analysis
      if (devices['MOBILE'] && devices['DESKTOP']) {
        const mobile = devices['MOBILE'];
        const desktop = devices['DESKTOP'];

        output += `\nMobile vs Desktop Gap Analysis:\n`;
        const mobileShare = ((mobile.impressions / totalImpressions) * 100).toFixed(0);
        const mobileClickShare = ((mobile.clicks / totalClicks) * 100).toFixed(0);
        output += `- Mobile gets ${mobileShare}% of impressions and ${mobileClickShare}% of clicks\n`;

        const ctrGap = (mobile.ctr - desktop.ctr) * 100;
        output += `- Mobile CTR is ${formatChange(ctrGap, 2)}pp vs Desktop\n`;

        const posGap = desktop.position - mobile.position;
        output += `- Desktop position is ${formatChange(posGap, 1)} vs Mobile\n`;

        if (mobile.ctr < desktop.ctr * 0.8) {
          output += `- [ALERT] Mobile CTR significantly lower than desktop\n`;
        }
      }

      // Country Breakdown
      output += `\nTOP COUNTRIES BY TRAFFIC\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Country | Clicks | Impressions | CTR | Position | Opportunity\n`;
      output += `${'-'.repeat(60)}\n`;

      const countries = (countryData.rows || [])
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, top_countries);

      const avgCTR = totalClicks / totalImpressions;

      countries.forEach((row: any) => {
        const country = row.keys[0];
        let opportunity = '';

        if (row.ctr < avgCTR * 0.5) {
          opportunity = 'CTR LOW';
        } else if (row.position > 15) {
          opportunity = 'Position HIGH';
        } else if (row.impressions > 10000 && row.ctr < avgCTR * 0.7) {
          opportunity = 'CTR OPPORTUNITY';
        }

        output += `${country} | ${row.clicks} | ${row.impressions} | ${(row.ctr * 100).toFixed(2)}% | ${row.position?.toFixed(1)} | ${opportunity}\n`;
      });

      // Country + Device Insights
      output += `\nCOUNTRY + DEVICE INSIGHTS\n`;
      output += `${'-'.repeat(60)}\n`;

      // Group by country
      const countryDeviceMap: { [key: string]: { [key: string]: any } } = {};
      (countryDeviceData.rows || []).forEach((row: any) => {
        const country = row.keys[0];
        const device = row.keys[1];
        if (!countryDeviceMap[country]) {
          countryDeviceMap[country] = {};
        }
        countryDeviceMap[country][device] = row;
      });

      // Find countries with mobile gaps
      const topCountryCodes = countries.slice(0, 5).map((c: any) => c.keys[0]);

      topCountryCodes.forEach((country: string) => {
        const deviceBreakdown = countryDeviceMap[country];
        if (deviceBreakdown && deviceBreakdown['MOBILE'] && deviceBreakdown['DESKTOP']) {
          const mobile = deviceBreakdown['MOBILE'];
          const desktop = deviceBreakdown['DESKTOP'];

          if (mobile.ctr < desktop.ctr * 0.7) {
            output += `${country}:\n`;
            output += `  Desktop: CTR ${(desktop.ctr * 100).toFixed(2)}%, Position ${desktop.position?.toFixed(1)}\n`;
            output += `  Mobile: CTR ${(mobile.ctr * 100).toFixed(2)}%, Position ${mobile.position?.toFixed(1)}\n`;
            output += `  [GAP: Mobile underperforming]\n\n`;
          }
        }
      });

      // Recommendations
      output += `RECOMMENDATIONS\n`;
      output += `${'-'.repeat(60)}\n`;
      let recNum = 1;

      if (devices['MOBILE'] && devices['DESKTOP'] && devices['MOBILE'].ctr < devices['DESKTOP'].ctr * 0.8) {
        output += `${recNum++}. [HIGH] Investigate mobile performance issues globally\n`;
      }

      const lowCTRCountries = countries.filter((c: any) => c.ctr < avgCTR * 0.5 && c.impressions > 1000);
      if (lowCTRCountries.length > 0) {
        output += `${recNum++}. [MEDIUM] Improve CTR in ${lowCTRCountries.map((c: any) => c.keys[0]).join(', ')}\n`;
      }

      const highPosCountries = countries.filter((c: any) => c.position > 15 && c.impressions > 5000);
      if (highPosCountries.length > 0) {
        output += `${recNum++}. [MEDIUM] Target content optimization for ${highPosCountries.map((c: any) => c.keys[0]).join(', ')}\n`;
      }

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing regional/device performance: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Tool 7: Analyze Algorithm Impact
 * Before/after comparison for algorithm updates
 */
export const analyzeAlgorithmImpactTool: Tool = {
  name: "analyze_algorithm_impact",
  description: "Compare search performance before and after a specific date (algorithm update, site change, etc.) to identify affected pages and queries. Helps diagnose whether changes are due to algorithm updates or site issues.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    }).min(1).describe("The URL of the site in Search Console"),
    event_date: z.string({
      required_error: "Event date is required"
    }).regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .describe("The date of the event/update (YYYY-MM-DD)"),
    days_before: z.number()
      .min(7).max(90)
      .default(14)
      .describe("Days to analyze before the event (default: 14)"),
    days_after: z.number()
      .min(7).max(90)
      .default(14)
      .describe("Days to analyze after the event (default: 14)"),
    min_impressions: z.number()
      .min(1)
      .default(50)
      .describe("Minimum impressions to include (default: 50)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, event_date, days_before, days_after, min_impressions } = args;

    try {
      const client = await getAuthenticatedClient(params);
      if ('error' in client) {
        return { content: [{ type: "text", text: client.error }] };
      }

      const eventDateObj = new Date(event_date);

      // Before period
      const beforeEnd = new Date(eventDateObj);
      beforeEnd.setDate(beforeEnd.getDate() - 1);
      const beforeStart = new Date(beforeEnd);
      beforeStart.setDate(beforeStart.getDate() - days_before);

      // After period
      const afterStart = new Date(eventDateObj);
      const afterEnd = new Date(afterStart);
      afterEnd.setDate(afterEnd.getDate() + days_after);

      // Query before/after for queries
      const beforeQueries = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(beforeStart),
        endDate: formatDate(beforeEnd),
        dimensions: ['query'],
        rowLimit: 2000
      });

      const afterQueries = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(afterStart),
        endDate: formatDate(afterEnd),
        dimensions: ['query'],
        rowLimit: 2000
      });

      // Query before/after for pages
      const beforePages = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(beforeStart),
        endDate: formatDate(beforeEnd),
        dimensions: ['page'],
        rowLimit: 1000
      });

      const afterPages = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(afterStart),
        endDate: formatDate(afterEnd),
        dimensions: ['page'],
        rowLimit: 1000
      });

      // Query totals
      const beforeTotals = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(beforeStart),
        endDate: formatDate(beforeEnd),
        dimensions: []
      });

      const afterTotals = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(afterStart),
        endDate: formatDate(afterEnd),
        dimensions: []
      });

      let output = `Algorithm/Update Impact Analysis for ${site_url}\n`;
      output += `${'='.repeat(60)}\n`;
      output += `Event Date: ${event_date}\n`;
      output += `Before Period: ${formatDate(beforeStart)} to ${formatDate(beforeEnd)}\n`;
      output += `After Period: ${formatDate(afterStart)} to ${formatDate(afterEnd)}\n\n`;

      // Overall Impact
      output += `OVERALL IMPACT\n`;
      output += `${'-'.repeat(60)}\n`;
      output += `Metric | Before | After | Change\n`;
      output += `${'-'.repeat(60)}\n`;

      const before = beforeTotals.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      const after = afterTotals.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

      const clicksChange = calculatePercentageChange(before.clicks, after.clicks);
      const impressionsChange = calculatePercentageChange(before.impressions, after.impressions);
      const ctrChange = (after.ctr - before.ctr) * 100;
      const positionChange = before.position - after.position;

      output += `Total Clicks | ${before.clicks} | ${after.clicks} | ${formatChange(clicksChange)}%\n`;
      output += `Total Impressions | ${before.impressions} | ${after.impressions} | ${formatChange(impressionsChange)}%\n`;
      output += `Average CTR | ${(before.ctr * 100).toFixed(2)}% | ${(after.ctr * 100).toFixed(2)}% | ${formatChange(ctrChange, 2)}pp\n`;
      output += `Average Position | ${before.position?.toFixed(1)} | ${after.position?.toFixed(1)} | ${formatChange(positionChange, 1)}\n`;

      // Impact Assessment
      let impactLevel = 'NEUTRAL';
      if (clicksChange < -30) impactLevel = 'SEVERE NEGATIVE';
      else if (clicksChange < -15) impactLevel = 'MODERATE NEGATIVE';
      else if (clicksChange < -5) impactLevel = 'MINOR NEGATIVE';
      else if (clicksChange > 30) impactLevel = 'STRONG POSITIVE';
      else if (clicksChange > 15) impactLevel = 'MODERATE POSITIVE';
      else if (clicksChange > 5) impactLevel = 'MINOR POSITIVE';

      output += `\nImpact Assessment: ${impactLevel}\n`;

      // Build maps
      const beforeQueryMap = new Map();
      const afterQueryMap = new Map();
      const beforePageMap = new Map();
      const afterPageMap = new Map();

      (beforeQueries.rows || []).forEach((row: any) => beforeQueryMap.set(row.keys[0], row));
      (afterQueries.rows || []).forEach((row: any) => afterQueryMap.set(row.keys[0], row));
      (beforePages.rows || []).forEach((row: any) => beforePageMap.set(row.keys[0], row));
      (afterPages.rows || []).forEach((row: any) => afterPageMap.set(row.keys[0], row));

      // Find losers and winners (queries)
      const queryChanges: any[] = [];
      afterQueryMap.forEach((afterRow, query) => {
        const beforeRow = beforeQueryMap.get(query);
        if (beforeRow && beforeRow.impressions >= min_impressions) {
          const change = calculatePercentageChange(beforeRow.clicks, afterRow.clicks);
          const posChange = beforeRow.position - afterRow.position;
          queryChanges.push({ query, before: beforeRow, after: afterRow, change, posChange });
        }
      });

      const queryLosers = queryChanges.filter(q => q.change < -20).sort((a, b) => a.change - b.change);
      const queryWinners = queryChanges.filter(q => q.change > 20).sort((a, b) => b.change - a.change);

      // Query Losers
      output += `\nMOST AFFECTED QUERIES (Losers)\n`;
      output += `${'-'.repeat(60)}\n`;

      if (queryLosers.length > 0) {
        output += `Query | Before | After | Change | Pos Change\n`;
        output += `${'-'.repeat(60)}\n`;
        queryLosers.slice(0, 15).forEach((item: any) => {
          const query = item.query.substring(0, 30);
          output += `${query} | ${item.before.clicks} | ${item.after.clicks} | ${formatChange(item.change)}% | ${formatChange(item.posChange, 1)}\n`;
        });
      } else {
        output += `No significant query losses found.\n`;
      }

      // Find losers (pages)
      const pageChanges: any[] = [];
      afterPageMap.forEach((afterRow, page) => {
        const beforeRow = beforePageMap.get(page);
        if (beforeRow && beforeRow.impressions >= min_impressions) {
          const change = calculatePercentageChange(beforeRow.clicks, afterRow.clicks);
          pageChanges.push({ page, before: beforeRow, after: afterRow, change });
        }
      });

      const pageLosers = pageChanges.filter(p => p.change < -20).sort((a, b) => a.change - b.change);
      const pageWinners = pageChanges.filter(p => p.change > 20).sort((a, b) => b.change - a.change);

      // Page Losers
      output += `\nMOST AFFECTED PAGES (Losers)\n`;
      output += `${'-'.repeat(60)}\n`;

      if (pageLosers.length > 0) {
        pageLosers.slice(0, 10).forEach((item: any) => {
          const pagePath = item.page.replace(site_url, '').substring(0, 45) || '/';
          output += `${pagePath}\n  Clicks: ${item.before.clicks} -> ${item.after.clicks} (${formatChange(item.change)}%)\n`;
        });
      } else {
        output += `No significant page losses found.\n`;
      }

      // Winners
      output += `\nWINNERS (Improved after event)\n`;
      output += `${'-'.repeat(60)}\n`;

      if (queryWinners.length > 0 || pageWinners.length > 0) {
        output += `Queries:\n`;
        queryWinners.slice(0, 5).forEach((item: any) => {
          output += `  "${item.query.substring(0, 35)}" ${formatChange(item.change)}%\n`;
        });
        output += `Pages:\n`;
        pageWinners.slice(0, 5).forEach((item: any) => {
          const pagePath = item.page.replace(site_url, '').substring(0, 40) || '/';
          output += `  ${pagePath} ${formatChange(item.change)}%\n`;
        });
      } else {
        output += `No significant winners found.\n`;
      }

      // Recovery Recommendations
      output += `\nRECOVERY RECOMMENDATIONS\n`;
      output += `${'-'.repeat(60)}\n`;
      let recNum = 1;

      if (impactLevel.includes('NEGATIVE')) {
        if (pageLosers.length > 0) {
          output += `${recNum++}. [URGENT] Review and update content on affected pages\n`;
        }
        if (queryLosers.length > 0) {
          output += `${recNum++}. [HIGH] Analyze lost queries for content gaps\n`;
        }
        output += `${recNum++}. [HIGH] Check E-E-A-T signals on affected pages\n`;
        output += `${recNum++}. [MEDIUM] Review internal linking to affected pages\n`;
      }

      output += `${recNum++}. Monitor for 2 more weeks to confirm trend\n`;
      output += `${recNum++}. Check Google Search Status Dashboard for announced updates\n`;

      return { content: [{ type: "text", text: output }] };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing algorithm impact: ${error.message}`
        }]
      };
    }
  }
};
