import { z } from "zod";
import type { Tool, ToolParams } from "./index";
import { getAuthenticatedClient } from "../utils/gscHelper";

/**
 * Get Sitemaps Tool
 * Lists all sitemaps for a property
 */
export const getSitemapsTool: Tool = {
  name: "get_sitemaps",
  description: "List all sitemaps for a specific Search Console property with their status, URL counts, and error information.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url } = args;

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

      const data = await client.listSitemaps(site_url);

      if (!data.sitemap || data.sitemap.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No sitemaps found for ${site_url}.`
          }]
        };
      }

      let output = `Sitemaps for ${site_url}:\n`;
      output += `${'-'.repeat(80)}\n`;
      output += `Path | Last Downloaded | Status | Indexed URLs | Errors\n`;
      output += `${'-'.repeat(80)}\n`;

      data.sitemap.forEach((sitemap: any) => {
        const path = sitemap.path || 'N/A';
        const lastDownloaded = sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded).toLocaleString() : 'Never';
        const isPending = sitemap.isPending ? 'Pending' : 'Processed';
        const errors = sitemap.errors || 0;
        const warnings = sitemap.warnings || 0;
        const status = errors > 0 ? 'Has errors' : warnings > 0 ? 'Has warnings' : 'Valid';

        // Get content stats if available
        let indexedUrls = 'N/A';
        if (sitemap.contents && sitemap.contents.length > 0) {
          const webContent = sitemap.contents.find((c: any) => c.type === 'WEB');
          if (webContent) {
            indexedUrls = webContent.indexed?.toString() || '0';
          }
        }

        output += `${path} | ${lastDownloaded} | ${status} | ${indexedUrls} | ${errors}\n`;
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
          text: `Error fetching sitemaps: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Submit Sitemap Tool
 * Submits a new sitemap or resubmits an existing one
 */
export const submitSitemapTool: Tool = {
  name: "submit_sitemap",
  description: "Submit a new sitemap or resubmit an existing one to Google for processing and indexing.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    sitemap_url: z.string().describe("The full URL of the sitemap to submit")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, sitemap_url } = args;

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

      await client.submitSitemap(site_url, sitemap_url);

      const output = `Successfully submitted sitemap: ${sitemap_url}\n`;
      const timestamp = new Date().toLocaleString();
      const result = `Submission time: ${timestamp}\n`;
      const statusMsg = `Status: Pending processing\n\n`;
      const note = `Note: Google may take some time to process the sitemap. Check back later for full details.`;

      return {
        content: [{
          type: "text",
          text: output + result + statusMsg + note
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error submitting sitemap: ${error.message}`
        }]
      };
    }
  }
};

/**
 * List Sitemaps Enhanced Tool
 * Enhanced sitemap listing with detailed information
 */
export const listSitemapsEnhancedTool: Tool = {
  name: "list_sitemaps_enhanced",
  description: "List all sitemaps with enhanced details including submission dates, processing status, content types, and warnings.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    sitemap_index: z.string().optional().describe("Optional sitemap index URL to list child sitemaps")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, sitemap_index } = args;

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

      const data = await client.listSitemaps(site_url);

      if (!data.sitemap || data.sitemap.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No sitemaps found for ${site_url}.`
          }]
        };
      }

      const source = sitemap_index ? `child sitemaps from index: ${sitemap_index}` : "all submitted sitemaps";

      let output = `Sitemaps for ${site_url} (${source}):\n`;
      output += `${'-'.repeat(100)}\n`;
      output += `Path | Last Submitted | Last Downloaded | Type | URLs | Errors | Warnings\n`;
      output += `${'-'.repeat(100)}\n`;

      let pendingCount = 0;

      data.sitemap.forEach((sitemap: any) => {
        const path = sitemap.path || 'N/A';
        const lastSubmitted = sitemap.lastSubmitted ? new Date(sitemap.lastSubmitted).toLocaleString() : 'N/A';
        const lastDownloaded = sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded).toLocaleString() : 'Never';
        const type = sitemap.isSitemapsIndex ? 'Index' : 'Sitemap';
        const errors = sitemap.errors || 0;
        const warnings = sitemap.warnings || 0;

        if (sitemap.isPending) {
          pendingCount++;
        }

        // Get URL count if available
        let urlCount = 'N/A';
        if (sitemap.contents && sitemap.contents.length > 0) {
          const webContent = sitemap.contents.find((c: any) => c.type === 'WEB');
          if (webContent) {
            urlCount = webContent.indexed?.toString() || '0';
          }
        }

        output += `${path} | ${lastSubmitted} | ${lastDownloaded} | ${type} | ${urlCount} | ${errors} | ${warnings}\n`;
      });

      if (pendingCount > 0) {
        output += `\nNote: ${pendingCount} sitemap(s) are still pending processing by Google.`;
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
          text: `Error fetching enhanced sitemap list: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Get Sitemap Details Tool
 * Gets detailed information about a specific sitemap
 */
export const getSitemapDetailsTool: Tool = {
  name: "get_sitemap_details",
  description: "Get detailed information about a specific sitemap including processing status, content breakdown, and any errors or warnings.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    sitemap_url: z.string().describe("The full URL of the sitemap to inspect")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, sitemap_url } = args;

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

      const data = await client.getSitemap(site_url, sitemap_url);

      if (!data) {
        return {
          content: [{
            type: "text",
            text: `Sitemap not found: ${sitemap_url}`
          }]
        };
      }

      let output = `Sitemap Details for ${sitemap_url}:\n`;
      output += `${'-'.repeat(80)}\n`;
      output += `Type: ${data.isSitemapsIndex ? 'Sitemap Index' : 'Sitemap'}\n`;
      output += `Status: ${data.isPending ? 'Pending processing' : 'Processed'}\n`;
      output += `Last Submitted: ${data.lastSubmitted ? new Date(data.lastSubmitted).toLocaleString() : 'N/A'}\n`;
      output += `Last Downloaded: ${data.lastDownloaded ? new Date(data.lastDownloaded).toLocaleString() : 'Never'}\n`;
      output += `Errors: ${data.errors || 0}\n`;
      output += `Warnings: ${data.warnings || 0}\n`;

      if (data.contents && data.contents.length > 0) {
        output += `\nContent Breakdown:\n`;
        data.contents.forEach((content: any) => {
          const type = content.type || 'UNKNOWN';
          const submitted = content.submitted || 0;
          const indexed = content.indexed || 0;
          output += `- ${type}: ${submitted} submitted, ${indexed} indexed\n`;
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
          text: `Error fetching sitemap details: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Delete Sitemap Tool
 * Deletes (unsubmits) a sitemap from GSC
 */
export const deleteSitemapTool: Tool = {
  name: "delete_sitemap",
  description: "Delete (unsubmit) a sitemap from Google Search Console. This removes the sitemap from processing but doesn't affect already indexed pages.",

  schema: z.object({
    site_url: z.string().describe("The URL of the site in Search Console"),
    sitemap_url: z.string().describe("The full URL of the sitemap to delete")
  }),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { site_url, sitemap_url } = args;

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

      await client.deleteSitemap(site_url, sitemap_url);

      return {
        content: [{
          type: "text",
          text: `Successfully deleted sitemap: ${sitemap_url}\n\nThe sitemap has been removed from ${site_url}.`
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error deleting sitemap: ${error.message}`
        }]
      };
    }
  }
};
