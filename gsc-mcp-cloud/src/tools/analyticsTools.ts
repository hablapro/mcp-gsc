import { z } from "zod";
import type { Tool, ToolParams } from "./index";
import { getAuthenticatedClient, formatSearchAnalyticsRow } from "../utils/gscHelper";

/**
 * Get Search Analytics Tool
 * Basic search analytics with dimensions
 */
export const getSearchAnalyticsTool: Tool = {
  name: "get_search_analytics",
  description: "Get search analytics data for a specific property with customizable dimensions and time range.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required",
      invalid_type_error: "Site URL must be a string"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console"),
    days: z.number({
      invalid_type_error: "Days must be a number"
    })
    .min(1, { message: "Days must be at least 1" })
    .max(540, { message: "Days cannot exceed 540 (GSC API limit)" })
    .default(28)
    .describe("Number of days to look back (default: 28)"),
    dimensions: z.string()
    .regex(/^(query|page|device|country|date)(,(query|page|device|country|date))*$/, {
      message: "Dimensions must be comma-separated values from: query, page, device, country, date"
    })
    .default("query")
    .describe("Dimensions to group by (query, page, device, country, date) - comma-separated")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, days, dimensions } = args;

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

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Query GSC API
      const dimensionList = dimensions.split(',').map(d => d.trim());
      const data = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: dimensionList,
        rowLimit: 100
      });

      if (!data.rows || data.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No data available for ${site_url} in the last ${days} days.`
          }]
        };
      }

      // Format results
      let output = `Search analytics for ${site_url} (last ${days} days):\n\n`;
      output += `${'-'.repeat(80)}\n\n`;
      output += `${dimensionList.join(' | ')} | Clicks | Impressions | CTR | Position\n`;
      output += `${'-'.repeat(80)}\n`;

      data.rows.slice(0, 20).forEach((row: any) => {
        output += formatSearchAnalyticsRow(row) + '\n';
      });

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
          text: `Error fetching analytics: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Get Performance Overview Tool
 * High-level performance metrics with daily trend
 */
export const getPerformanceOverviewTool: Tool = {
  name: "get_performance_overview",
  description: "Get a comprehensive performance overview including totals and daily trends for a property.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required",
      invalid_type_error: "Site URL must be a string"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console"),
    days: z.number({
      invalid_type_error: "Days must be a number"
    })
    .min(1, { message: "Days must be at least 1" })
    .max(540, { message: "Days cannot exceed 540 (GSC API limit)" })
    .default(28)
    .describe("Number of days to look back")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, days } = args;

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

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Get totals
      const totalsData = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: []
      });

      // Get daily breakdown
      const dailyData = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['date']
      });

      let output = `Performance Overview for ${site_url} (last ${days} days):\n`;
      output += `${'-'.repeat(80)}\n`;

      if (totalsData.rows && totalsData.rows.length > 0) {
        const totals = totalsData.rows[0];
        output += `Total Clicks: ${totals.clicks || 0}\n`;
        output += `Total Impressions: ${totals.impressions || 0}\n`;
        output += `Average CTR: ${totals.ctr ? (totals.ctr * 100).toFixed(2) : 0}%\n`;
        output += `Average Position: ${totals.position ? totals.position.toFixed(1) : 'N/A'}\n\n`;
      }

      output += `Daily Trend:\n`;
      output += `Date | Clicks | Impressions | CTR | Position\n`;
      output += `${'-'.repeat(80)}\n`;

      if (dailyData.rows && dailyData.rows.length > 0) {
        dailyData.rows.slice(-7).forEach((row: any) => {
          const date = row.keys ? row.keys[0] : 'N/A';
          const clicks = row.clicks || 0;
          const impressions = row.impressions || 0;
          const ctr = row.ctr ? (row.ctr * 100).toFixed(2) + '%' : '0.00%';
          const position = row.position ? row.position.toFixed(1) : 'N/A';
          output += `${date} | ${clicks} | ${impressions} | ${ctr} | ${position}\n`;
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
          text: `Error fetching performance overview: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Get Advanced Search Analytics Tool
 * Advanced analytics with filtering, sorting, and pagination
 */
export const getAdvancedSearchAnalyticsTool: Tool = {
  name: "get_advanced_search_analytics",
  description: "Get advanced search analytics with sorting, filtering, pagination, and multiple search types (WEB, IMAGE, VIDEO, NEWS, DISCOVER).",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    start_date: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().optional().describe("End date in YYYY-MM-DD format"),
    dimensions: z.string().default("query").describe("Dimensions to group by (comma-separated)"),
    search_type: z.enum(["WEB", "IMAGE", "VIDEO", "NEWS", "DISCOVER"]).default("WEB").describe("Type of search results"),
    row_limit: z.number().default(100).describe("Maximum rows to return (max 25000)"),
    start_row: z.number().default(0).describe("Starting row for pagination"),
    sort_by: z.enum(["clicks", "impressions", "ctr", "position"]).default("clicks").describe("Metric to sort by"),
    sort_direction: z.enum(["ascending", "descending"]).default("descending").describe("Sort direction"),
    filter_dimension: z.string().optional().describe("Dimension to filter on"),
    filter_operator: z.enum(["contains", "equals", "notContains", "notEquals"]).default("contains").describe("Filter operator"),
    filter_expression: z.string().optional().describe("Filter expression value")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const {
      site_url,
      start_date,
      end_date,
      dimensions,
      search_type,
      row_limit,
      start_row,
      sort_by,
      sort_direction,
      filter_dimension,
      filter_operator,
      filter_expression
    } = args;

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

      // Calculate date range
      const endDate = end_date ? new Date(end_date) : new Date();
      const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Build request body
      const dimensionList = dimensions.split(',').map(d => d.trim());
      const requestBody: any = {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: dimensionList,
        type: search_type,
        rowLimit: Math.min(row_limit, 25000),
        startRow: start_row
      };

      // Add dimension filters if provided
      if (filter_dimension && filter_expression) {
        requestBody.dimensionFilterGroups = [{
          filters: [{
            dimension: filter_dimension,
            operator: filter_operator,
            expression: filter_expression
          }]
        }];
      }

      // Query GSC API
      const data = await client.querySearchAnalytics(site_url, requestBody);

      if (!data.rows || data.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No data available for ${site_url} in the specified date range.`
          }]
        };
      }

      // Sort results
      const sortedRows = [...data.rows].sort((a: any, b: any) => {
        const aVal = a[sort_by] || 0;
        const bVal = b[sort_by] || 0;
        return sort_direction === 'ascending' ? aVal - bVal : bVal - aVal;
      });

      // Format results
      let output = `Search analytics for ${site_url}:\n`;
      output += `Date range: ${formatDate(startDate)} to ${formatDate(endDate)}\n`;
      output += `Search type: ${search_type}\n`;
      output += `Showing rows ${start_row + 1} to ${start_row + sortedRows.length} (sorted by ${sort_by} ${sort_direction})\n\n`;
      output += `${'-'.repeat(80)}\n\n`;
      output += `${dimensionList.join(' | ')} | Clicks | Impressions | CTR | Position\n`;
      output += `${'-'.repeat(80)}\n`;

      sortedRows.forEach((row: any) => {
        output += formatSearchAnalyticsRow(row) + '\n';
      });

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
          text: `Error fetching advanced analytics: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Compare Search Periods Tool
 * Compares performance between two time periods
 */
export const compareSearchPeriodsTool: Tool = {
  name: "compare_search_periods",
  description: "Compare search analytics data between two time periods to identify trends and changes.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console"),
    period1_start: z.string({
      required_error: "Period 1 start date is required"
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Period 1 start date must be in YYYY-MM-DD format" })
    .describe("Start date for period 1 (YYYY-MM-DD)"),
    period1_end: z.string({
      required_error: "Period 1 end date is required"
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Period 1 end date must be in YYYY-MM-DD format" })
    .describe("End date for period 1 (YYYY-MM-DD)"),
    period2_start: z.string({
      required_error: "Period 2 start date is required"
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Period 2 start date must be in YYYY-MM-DD format" })
    .describe("Start date for period 2 (YYYY-MM-DD)"),
    period2_end: z.string({
      required_error: "Period 2 end date is required"
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Period 2 end date must be in YYYY-MM-DD format" })
    .describe("End date for period 2 (YYYY-MM-DD)"),
    dimensions: z.string()
    .default("query")
    .describe("Dimensions to group by"),
    limit: z.number({
      invalid_type_error: "Limit must be a number"
    })
    .min(1, { message: "Limit must be at least 1" })
    .max(1000, { message: "Limit cannot exceed 1000" })
    .default(10)
    .describe("Number of top results to compare")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, period1_start, period1_end, period2_start, period2_end, dimensions, limit } = args;

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

      const dimensionList = dimensions.split(',').map(d => d.trim());

      // Query period 1
      const period1Data = await client.querySearchAnalytics(site_url, {
        startDate: period1_start,
        endDate: period1_end,
        dimensions: dimensionList,
        rowLimit: 1000
      });

      // Query period 2
      const period2Data = await client.querySearchAnalytics(site_url, {
        startDate: period2_start,
        endDate: period2_end,
        dimensions: dimensionList,
        rowLimit: 1000
      });

      if ((!period1Data.rows || period1Data.rows.length === 0) && (!period2Data.rows || period2Data.rows.length === 0)) {
        return {
          content: [{
            type: "text",
            text: `No data available for ${site_url} in either period.`
          }]
        };
      }

      // Create maps for comparison
      const period1Map = new Map();
      const period2Map = new Map();

      if (period1Data.rows) {
        period1Data.rows.forEach((row: any) => {
          const key = row.keys ? row.keys.join('|') : 'unknown';
          period1Map.set(key, row);
        });
      }

      if (period2Data.rows) {
        period2Data.rows.forEach((row: any) => {
          const key = row.keys ? row.keys.join('|') : 'unknown';
          period2Map.set(key, row);
        });
      }

      // Calculate changes
      const allKeys = new Set([...period1Map.keys(), ...period2Map.keys()]);
      const comparisons: any[] = [];

      allKeys.forEach(key => {
        const p1 = period1Map.get(key) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        const p2 = period2Map.get(key) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

        comparisons.push({
          keys: key.split('|'),
          p1Clicks: p1.clicks || 0,
          p2Clicks: p2.clicks || 0,
          clickChange: (p2.clicks || 0) - (p1.clicks || 0),
          percentChange: p1.clicks ? (((p2.clicks || 0) - p1.clicks) / p1.clicks * 100) : 0,
          p1Position: p1.position || 0,
          p2Position: p2.position || 0,
          positionChange: (p1.position || 0) - (p2.position || 0)
        });
      });

      // Sort by click change and take top results
      comparisons.sort((a, b) => Math.abs(b.clickChange) - Math.abs(a.clickChange));
      const topResults = comparisons.slice(0, limit);

      let output = `Search analytics comparison for ${site_url}:\n`;
      output += `Period 1: ${period1_start} to ${period1_end}\n`;
      output += `Period 2: ${period2_start} to ${period2_end}\n`;
      output += `Dimension(s): ${dimensions}\n`;
      output += `Top ${limit} results by change in clicks:\n\n`;
      output += `${'-'.repeat(100)}\n\n`;
      output += `${dimensionList.join(' | ')} | P1 Clicks | P2 Clicks | Change | % | P1 Pos | P2 Pos | Pos Δ\n`;
      output += `${'-'.repeat(100)}\n`;

      topResults.forEach(comp => {
        const changeSign = comp.clickChange >= 0 ? '+' : '';
        const percentSign = comp.percentChange >= 0 ? '+' : '';
        const posChangeSign = comp.positionChange >= 0 ? '+' : '';

        output += `${comp.keys.join(' | ')} | ${comp.p1Clicks} | ${comp.p2Clicks} | ${changeSign}${comp.clickChange} | ${percentSign}${comp.percentChange.toFixed(1)}% | ${comp.p1Position.toFixed(1)} | ${comp.p2Position.toFixed(1)} | ${posChangeSign}${comp.positionChange.toFixed(1)}\n`;
      });

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
          text: `Error comparing periods: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Get Search By Page Query Tool
 * Gets queries for a specific page
 */
export const getSearchByPageQueryTool: Tool = {
  name: "get_search_by_page_query",
  description: "Get search analytics data for a specific page, broken down by the queries that led users to that page.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console"),
    page_url: z.string({
      required_error: "Page URL is required"
    })
    .min(1, { message: "Page URL cannot be empty" })
    .url({ message: "Page URL must be a valid URL" })
    .describe("The specific page URL to analyze"),
    days: z.number({
      invalid_type_error: "Days must be a number"
    })
    .min(1, { message: "Days must be at least 1" })
    .max(540, { message: "Days cannot exceed 540 (GSC API limit)" })
    .default(28)
    .describe("Number of days to look back")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, page_url, days } = args;

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

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Query GSC API with page filter
      const data = await client.querySearchAnalytics(site_url, {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            operator: 'equals',
            expression: page_url
          }]
        }],
        rowLimit: 100
      });

      if (!data.rows || data.rows.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No data available for page ${page_url} in the last ${days} days.`
          }]
        };
      }

      // Calculate totals
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalCtr = 0;

      data.rows.forEach((row: any) => {
        totalClicks += row.clicks || 0;
        totalImpressions += row.impressions || 0;
        totalCtr += row.ctr || 0;
      });

      const avgCtr = data.rows.length > 0 ? (totalCtr / data.rows.length) : 0;

      // Format results
      let output = `Search queries for page ${page_url} (last ${days} days):\n\n`;
      output += `${'-'.repeat(80)}\n\n`;
      output += `Query | Clicks | Impressions | CTR | Position\n`;
      output += `${'-'.repeat(80)}\n`;

      data.rows.forEach((row: any) => {
        output += formatSearchAnalyticsRow(row) + '\n';
      });

      output += `${'-'.repeat(80)}\n`;
      output += `TOTAL | ${totalClicks} | ${totalImpressions} | ${(avgCtr * 100).toFixed(2)}% | -`;

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
          text: `Error fetching page queries: ${error.message}`
        }]
      };
    }
  }
};
