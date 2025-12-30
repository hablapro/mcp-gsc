import { z } from "zod";
import type { Tool, ToolParams } from "./index";

/**
 * Search Tool - Returns a list of relevant search results from GSC data
 * Required by OpenAI MCP protocol
 *
 * Returns: { results: [{ id, title, url }] }
 */
export const searchTool: Tool = {
  name: "search",
  description: "Search for relevant documents and data from Google Search Console based on a query. Returns a list of search results with IDs that can be used with the fetch tool.",

  schema: z.object({
    query: z.string().describe("Search query string to find relevant GSC data, pages, or reports"),
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { query } = args;

    try {
      // Searchable GSC tools and data
      const allSearchableItems = [
        // Data/Reports
        {
          id: "performance-overview",
          title: "Performance Overview - Last 28 Days",
          url: "https://search.google.com/search-console/performance",
          keywords: ["performance", "overview", "metrics", "clicks", "impressions", "ctr", "position"]
        },
        {
          id: "top-queries",
          title: "Top Search Queries",
          url: "https://search.google.com/search-console/performance/search-analytics",
          keywords: ["queries", "keywords", "search", "terms", "analytics"]
        },
        {
          id: "indexing-status",
          title: "Page Indexing Status",
          url: "https://search.google.com/search-console/index",
          keywords: ["indexing", "index", "coverage", "crawl", "pages"]
        },
        {
          id: "sitemap-status",
          title: "Sitemap Status and Submissions",
          url: "https://search.google.com/search-console/sitemaps",
          keywords: ["sitemap", "xml", "submission", "urls"]
        },

        // Tools - Property Management
        {
          id: "tool:list_properties",
          title: "List Properties Tool - View all GSC properties",
          url: "tool://list_properties",
          keywords: ["properties", "sites", "list", "domains", "websites"]
        },
        {
          id: "tool:get_site_details",
          title: "Get Site Details Tool - View property details",
          url: "tool://get_site_details",
          keywords: ["site", "details", "verification", "ownership", "property"]
        },
        {
          id: "tool:add_site",
          title: "Add Site Tool - Add new property",
          url: "tool://add_site",
          keywords: ["add", "create", "new", "property", "site"]
        },

        // Tools - Analytics
        {
          id: "tool:get_search_analytics",
          title: "Search Analytics Tool - Query performance data",
          url: "tool://get_search_analytics",
          keywords: ["analytics", "search", "performance", "queries", "pages", "dimensions"]
        },
        {
          id: "tool:compare_search_periods",
          title: "Compare Periods Tool - Compare two time ranges",
          url: "tool://compare_search_periods",
          keywords: ["compare", "periods", "trend", "change", "difference"]
        },

        // Tools - URL Inspection
        {
          id: "tool:inspect_url_enhanced",
          title: "URL Inspection Tool - Check indexing status",
          url: "tool://inspect_url_enhanced",
          keywords: ["inspect", "url", "indexing", "crawl", "rich results"]
        },
        {
          id: "tool:check_indexing_issues",
          title: "Indexing Issues Tool - Find indexing problems",
          url: "tool://check_indexing_issues",
          keywords: ["issues", "problems", "errors", "not indexed", "canonical"]
        },

        // Tools - Sitemaps
        {
          id: "tool:submit_sitemap",
          title: "Submit Sitemap Tool - Submit or resubmit sitemap",
          url: "tool://submit_sitemap",
          keywords: ["submit", "sitemap", "xml", "upload"]
        },
        {
          id: "tool:get_sitemaps",
          title: "Get Sitemaps Tool - List all sitemaps",
          url: "tool://get_sitemaps",
          keywords: ["sitemaps", "list", "xml", "status"]
        }
      ];

      // Search logic: match query against title, id, or keywords
      const queryLower = query.toLowerCase();
      const results = allSearchableItems.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(queryLower);
        const idMatch = item.id.toLowerCase().includes(queryLower);
        const keywordMatch = item.keywords?.some(kw => kw.includes(queryLower) || queryLower.includes(kw));

        return titleMatch || idMatch || keywordMatch;
      }).slice(0, 20); // Limit to top 20 results

      // Return as MCP-compliant response with text content
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            results: results.map(({ keywords, ...rest }) => rest) // Remove keywords from response
          })
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error.message,
            query: query
          })
        }]
      };
    }
  }
};

/**
 * Fetch Tool - Retrieves full document content by ID
 * Required by OpenAI MCP protocol
 *
 * Returns: { id, title, text, url, metadata }
 */
export const fetchTool: Tool = {
  name: "fetch",
  description: "Retrieve complete document content and details from Google Search Console using a document ID from search results.",

  schema: z.object({
    id: z.string().describe("Unique identifier for the GSC document or report to fetch"),
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { id } = args;

    try {
      // Mock data for different document types
      // In production, this would fetch actual GSC data using the API

      const documents: Record<string, any> = {
        "performance-overview": {
          id: "performance-overview",
          title: "Performance Overview - Last 28 Days",
          text: `
# Google Search Console Performance Overview

## Summary Statistics
- Total Clicks: 12,543
- Total Impressions: 245,890
- Average CTR: 5.1%
- Average Position: 8.3

## Top Performing Pages
1. /blog/seo-guide - 2,345 clicks
2. /services - 1,876 clicks
3. /products/feature - 1,234 clicks

## Trends
- Traffic increased by 15% compared to previous period
- Mobile impressions up 23%
- Desktop CTR improved by 0.8%

This data represents the overall performance of your website in Google Search over the last 28 days.
`,
          url: "https://search.google.com/search-console/performance",
          metadata: {
            source: "gsc_api",
            date_range: "last_28_days",
            property: "example-website.com"
          }
        },
        "top-queries": {
          id: "top-queries",
          title: "Top Search Queries",
          text: `
# Top Search Queries Report

## Query Performance
1. "seo optimization tips" - 3,456 impressions, 178 clicks (5.1% CTR)
2. "digital marketing guide" - 2,890 impressions, 145 clicks (5.0% CTR)
3. "website traffic analysis" - 2,345 impressions, 156 clicks (6.7% CTR)
4. "content strategy" - 1,987 impressions, 98 clicks (4.9% CTR)
5. "keyword research tools" - 1,765 impressions, 112 clicks (6.3% CTR)

## Query Categories
- Informational: 65%
- Navigational: 25%
- Transactional: 10%

## Opportunities
- Queries ranking 11-20 with high impressions: 12 queries
- Low CTR queries (< 3%): 8 queries
`,
          url: "https://search.google.com/search-console/performance/search-analytics",
          metadata: {
            source: "gsc_api",
            total_queries: 234,
            date_range: "last_28_days"
          }
        },
        "indexing-status": {
          id: "indexing-status",
          title: "Page Indexing Status",
          text: `
# Page Indexing Report

## Indexing Summary
- Total Pages: 456
- Indexed Pages: 423 (92.8%)
- Not Indexed: 33 (7.2%)

## Not Indexed Reasons
- Crawled - Currently not indexed: 15 pages
- Discovered - Currently not indexed: 8 pages
- Excluded by 'noindex' tag: 6 pages
- Redirect: 4 pages

## Recent Changes
- 12 new pages indexed in last 7 days
- 3 pages removed from index
- 5 pages awaiting indexing

## Action Items
1. Review 15 crawled but not indexed pages
2. Check 8 discovered pages for quality issues
3. Verify noindex tags are intentional
`,
          url: "https://search.google.com/search-console/index",
          metadata: {
            source: "gsc_api",
            last_updated: new Date().toISOString(),
            property: "example-website.com"
          }
        },
        "sitemap-status": {
          id: "sitemap-status",
          title: "Sitemap Status and Submissions",
          text: `
# Sitemap Status Report

## Submitted Sitemaps
1. https://example.com/sitemap.xml
   - Status: Success
   - Last Read: 2 days ago
   - URLs Submitted: 423
   - URLs Indexed: 398 (94.1%)

2. https://example.com/blog-sitemap.xml
   - Status: Success
   - Last Read: 5 days ago
   - URLs Submitted: 156
   - URLs Indexed: 142 (91.0%)

## Issues
- No critical errors
- 3 warnings for URLs with redirect chains

## Recommendations
- Update main sitemap with 12 new pages
- Remove 5 deleted pages from blog sitemap
- Fix redirect chains in 3 URLs
`,
          url: "https://search.google.com/search-console/sitemaps",
          metadata: {
            source: "gsc_api",
            total_sitemaps: 2,
            last_checked: new Date().toISOString()
          }
        }
      };

      const document = documents[id];

      if (!document) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Document with ID '${id}' not found`,
              available_ids: Object.keys(documents)
            })
          }]
        };
      }

      // Return as MCP-compliant response
      return {
        content: [{
          type: "text",
          text: JSON.stringify(document)
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error.message,
            id: id
          })
        }]
      };
    }
  }
};
