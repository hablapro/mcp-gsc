import { z } from "zod";
import type { Tool, ToolParams } from "./index";
import { getAuthenticatedClient } from "../utils/gscHelper";

/**
 * Inspect URL Enhanced Tool
 * Detailed URL inspection for indexing and rich results
 */
export const inspectUrlEnhancedTool: Tool = {
  name: "inspect_url_enhanced",
  description: "Enhanced URL inspection to check indexing status, rich results, crawling details, and canonical URLs in Google.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console (for domain properties use sc-domain:example.com)"),
    page_url: z.string().describe("The specific URL to inspect")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, page_url } = args;

    try {
      const client = await getAuthenticatedClient(params);

      if ('error' in client) {
        return {
          content: [{
            type: "text",
            text: client.error
          }]
        };
      }

      const data = await client.inspectUrl(site_url, page_url);

      if (!data || !data.inspectionResult) {
        return {
          content: [{
            type: "text",
            text: `Unable to inspect URL: ${page_url}`
          }]
        };
      }

      const result = data.inspectionResult;
      const indexStatus = result.indexStatusResult || {};
      const crawledAs = indexStatus.crawledAs || 'UNKNOWN';
      const lastCrawlTime = indexStatus.lastCrawlTime ? new Date(indexStatus.lastCrawlTime).toLocaleString() : 'Never';
      const verdict = indexStatus.verdict || 'UNKNOWN';
      const coverageState = indexStatus.coverageState || 'UNKNOWN';
      const robotsTxtState = indexStatus.robotsTxtState || 'UNKNOWN';
      const indexingState = indexStatus.indexingState || 'UNKNOWN';
      const googleCanonical = indexStatus.googleCanonical || page_url;
      const pageFetchState = indexStatus.pageFetchState || 'UNKNOWN';

      let output = `URL Inspection for ${page_url}:\n`;
      output += `${'-'.repeat(80)}\n`;
      output += `Indexing Status: ${verdict}\n`;
      output += `Coverage: ${coverageState}\n`;
      output += `Last Crawled: ${lastCrawlTime}\n`;
      output += `Page Fetch: ${pageFetchState}\n`;
      output += `Robots.txt: ${robotsTxtState}\n`;
      output += `Indexing State: ${indexingState}\n`;
      output += `Google Canonical: ${googleCanonical}\n`;
      output += `Crawled As: ${crawledAs}\n`;

      // Referring URLs
      if (indexStatus.referringUrls && indexStatus.referringUrls.length > 0) {
        output += `\nReferring URLs:\n`;
        indexStatus.referringUrls.slice(0, 5).forEach((url: string) => {
          output += `- ${url}\n`;
        });
        if (indexStatus.referringUrls.length > 5) {
          output += `... and ${indexStatus.referringUrls.length - 5} more\n`;
        }
      }

      // Rich results
      const richResults = result.richResultsResult;
      if (richResults) {
        output += `\nRich Results: ${richResults.verdict || 'UNKNOWN'}\n`;
        if (richResults.detectedItems && richResults.detectedItems.length > 0) {
          output += `Detected Rich Result Types:\n`;
          richResults.detectedItems.forEach((item: any) => {
            output += `- ${item.richResultType || 'UNKNOWN'}\n`;
          });
        }
      }

      return {
        content: [{
          type: "text",
          text: output
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error inspecting URL: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Batch URL Inspection Tool
 * Inspect multiple URLs at once
 */
export const batchUrlInspectionTool: Tool = {
  name: "batch_url_inspection",
  description: "Inspect multiple URLs in batch (up to 10) to quickly check their indexing status, coverage, and rich results.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    urls: z.string().describe("List of URLs to inspect, one per line (max 10)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, urls } = args;

    try {
      const client = await getAuthenticatedClient(params);

      if ('error' in client) {
        return {
          content: [{
            type: "text",
            text: client.error
          }]
        };
      }

      const urlList = urls.split('\n').filter(u => u.trim()).slice(0, 10);

      let output = `Batch URL Inspection Results for ${site_url}:\n\n`;

      for (const url of urlList) {
        try {
          const data = await client.inspectUrl(site_url, url.trim());

          if (data && data.inspectionResult) {
            const result = data.inspectionResult;
            const indexStatus = result.indexStatusResult || {};
            const verdict = indexStatus.verdict || 'UNKNOWN';
            const coverageState = indexStatus.coverageState || 'UNKNOWN';
            const lastCrawlTime = indexStatus.lastCrawlTime ? new Date(indexStatus.lastCrawlTime).toLocaleDateString() : 'Never';

            let richResultTypes = 'None';
            if (result.richResultsResult && result.richResultsResult.detectedItems) {
              richResultTypes = result.richResultsResult.detectedItems
                .map((item: any) => item.richResultType)
                .join(', ');
            }

            output += `${url}:\n`;
            output += `  Status: ${verdict} - ${coverageState}\n`;
            output += `  Last Crawl: ${lastCrawlTime}\n`;
            output += `  Rich Results: ${richResultTypes}\n\n`;
          } else {
            output += `${url}:\n`;
            output += `  Status: Unable to inspect\n\n`;
          }
        } catch (error: any) {
          output += `${url}:\n`;
          output += `  Error: ${error.message}\n\n`;
        }
      }

      return {
        content: [{
          type: "text",
          text: output
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error performing batch inspection: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Check Indexing Issues Tool
 * Identifies specific indexing problems across multiple URLs
 */
export const checkIndexingIssuesTool: Tool = {
  name: "check_indexing_issues",
  description: "Check for specific indexing issues across multiple URLs including not indexed pages, canonical conflicts, robots blocking, and fetch errors.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    urls: z.string().describe("List of URLs to check, one per line (max 10)")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, urls } = args;

    try {
      const client = await getAuthenticatedClient(params);

      if ('error' in client) {
        return {
          content: [{
            type: "text",
            text: client.error
          }]
        };
      }

      const urlList = urls.split('\n').filter(u => u.trim()).slice(0, 10);
      const totalUrls = urlList.length;

      let indexed = 0;
      let notIndexed = 0;
      let canonicalIssues = 0;
      let robotsBlocked = 0;
      let fetchIssues = 0;

      const notIndexedUrls: string[] = [];
      const canonicalIssueUrls: { url: string; google: string; user: string }[] = [];
      const robotsBlockedUrls: string[] = [];
      const fetchIssueUrls: string[] = [];

      for (const url of urlList) {
        try {
          const data = await client.inspectUrl(site_url, url.trim());

          if (data && data.inspectionResult) {
            const result = data.inspectionResult;
            const indexStatus = result.indexStatusResult || {};

            // Check indexing status
            if (indexStatus.verdict === 'PASS') {
              indexed++;
            } else {
              notIndexed++;
              notIndexedUrls.push(`${url} - ${indexStatus.coverageState || 'Unknown state'}`);
            }

            // Check robots.txt
            if (indexStatus.robotsTxtState === 'BLOCKED') {
              robotsBlocked++;
              robotsBlockedUrls.push(url);
            }

            // Check page fetch
            if (indexStatus.pageFetchState && indexStatus.pageFetchState !== 'SUCCESSFUL') {
              fetchIssues++;
              fetchIssueUrls.push(`${url} - ${indexStatus.pageFetchState}`);
            }

            // Check canonical
            const userCanonical = indexStatus.userCanonical || url;
            const googleCanonical = indexStatus.googleCanonical || url;
            if (userCanonical !== googleCanonical) {
              canonicalIssues++;
              canonicalIssueUrls.push({ url, google: googleCanonical, user: userCanonical });
            }
          }
        } catch (error) {
          // Skip URLs that can't be inspected
        }
      }

      let output = `Indexing Issues Report for ${site_url}:\n`;
      output += `${'-'.repeat(80)}\n`;
      output += `Total URLs checked: ${totalUrls}\n`;
      output += `Indexed: ${indexed}\n`;
      output += `Not indexed: ${notIndexed}\n`;
      output += `Canonical issues: ${canonicalIssues}\n`;
      output += `Robots.txt blocked: ${robotsBlocked}\n`;
      output += `Fetch issues: ${fetchIssues}\n`;
      output += `${'-'.repeat(80)}\n`;

      if (notIndexedUrls.length > 0) {
        output += `\nNot Indexed URLs:\n`;
        notIndexedUrls.forEach(url => {
          output += `- ${url}\n`;
        });
      }

      if (canonicalIssueUrls.length > 0) {
        output += `\nCanonical Issues:\n`;
        canonicalIssueUrls.forEach(item => {
          output += `- ${item.url}\n  Google chose: ${item.google} instead of user-declared: ${item.user}\n`;
        });
      }

      if (robotsBlockedUrls.length > 0) {
        output += `\nRobots.txt Blocked:\n`;
        robotsBlockedUrls.forEach(url => {
          output += `- ${url}\n`;
        });
      }

      if (fetchIssueUrls.length > 0) {
        output += `\nFetch Issues:\n`;
        fetchIssueUrls.forEach(url => {
          output += `- ${url}\n`;
        });
      }

      return {
        content: [{
          type: "text",
          text: output
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error checking indexing issues: ${error.message}`
        }]
      };
    }
  }
};
