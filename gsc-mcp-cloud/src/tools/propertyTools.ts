import { z } from "zod";
import type { Tool, ToolParams } from "./index";
import { GoogleSearchConsoleClient } from "../utils/googleClient";
import { TokenManager } from "../utils/tokenManager";
import { getAuthenticatedClient } from "../utils/gscHelper";

/**
 * List Properties Tool
 * Lists all GSC properties available to the user
 */
export const listPropertiesTool: Tool = {
  name: "list_properties",
  description: "Retrieves and returns the user's Search Console properties with their permission levels.",

  schema: z.object({}),

  async execute(params: ToolParams, args: z.infer<typeof this.schema>) {
    const { env } = params;

    try {
      // Check if authentication is configured
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.OAUTH_KV) {
        return {
          content: [{
            type: "text",
            text: "⚠️ Authentication not configured. Please set up OAuth:\n\n1. Create KV namespace: npx wrangler kv:namespace create OAUTH_KV\n2. Set secrets:\n   echo 'your-client-id' | npx wrangler secret put GOOGLE_CLIENT_ID\n   echo 'your-client-secret' | npx wrangler secret put GOOGLE_CLIENT_SECRET\n3. Update wrangler.toml with KV namespace ID\n\nUsing mock data instead:\n- https://example.com/ (OWNER)\n- https://www.example.com/ (FULL)\n- sc-domain:example.com (OWNER)"
          }]
        };
      }

      const tokenManager = new TokenManager(env.OAUTH_KV);
      const tokens = await tokenManager.getTokens('default_user');

      if (!tokens) {
        return {
          content: [{
            type: "text",
            text: "⚠️ Not authenticated. Please visit /auth to authenticate with Google.\n\nAuthentication URL: https://gsc-mcp-cloud.principal-e85.workers.dev/auth"
          }]
        };
      }

      const client = new GoogleSearchConsoleClient(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      // Check if token needs refresh
      if (client.isTokenExpired(tokens.expiry_date)) {
        client.setCredentials(tokens);
        const newTokens = await client.refreshAccessToken();
        await tokenManager.storeTokens('default_user', newTokens);
        client.setCredentials(newTokens);
      } else {
        client.setCredentials(tokens);
      }

      // Fetch real data from GSC API
      const data = await client.listSites();

      if (!data.siteEntry || data.siteEntry.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No properties found in your Google Search Console account."
          }]
        };
      }

      const lines = data.siteEntry.map((site: any) =>
        `- ${site.siteUrl} (${site.permissionLevel})`
      );

      return {
        content: [{
          type: "text",
          text: lines.join("\n")
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error fetching properties: ${error.message}\n\nPlease ensure:\n1. OAuth is configured correctly\n2. You've authenticated via /auth\n3. Your tokens haven't expired`
        }]
      };
    }
  }
};

/**
 * Add Site Tool
 * Adds a new site to Search Console properties
 */
export const addSiteTool: Tool = {
  name: "add_site",
  description: "Add a site to your Search Console properties. Site URL must be in exact format (e.g., https://example.com or sc-domain:example.com).",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required",
      invalid_type_error: "Site URL must be a string"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://") || url.startsWith("sc-domain:"),
      { message: "Site URL must start with http://, https://, or sc-domain: (e.g., https://example.com or sc-domain:example.com)" }
    )
    .describe("The URL of the site to add (must be exact match)")
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

      await client.addSite(site_url);

      return {
        content: [{
          type: "text",
          text: `Site ${site_url} has been added to Search Console.\nPermission level: OWNER\n\nNote: You may need to verify ownership of the site before you can access its data.`
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error adding site: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Delete Site Tool
 * Removes a site from Search Console properties
 */
export const deleteSiteTool: Tool = {
  name: "delete_site",
  description: "Remove a site from your Search Console properties.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required",
      invalid_type_error: "Site URL must be a string"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site to remove (must be exact match)")
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

      await client.deleteSite(site_url);

      return {
        content: [{
          type: "text",
          text: `Site ${site_url} has been removed from Search Console.\n\nNote: This only removes the site from your Search Console properties. It does not affect the actual website.`
        }]
      };

    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error deleting site: ${error.message}`
        }]
      };
    }
  }
};

/**
 * Get Site Details Tool
 * Gets detailed information about a specific property
 */
export const getSiteDetailsTool: Tool = {
  name: "get_site_details",
  description: "Get detailed information about a specific Search Console property including verification status and ownership.",

  schema: z.object({
    site_url: z.string({
      required_error: "Site URL is required",
      invalid_type_error: "Site URL must be a string"
    })
    .min(1, { message: "Site URL cannot be empty" })
    .describe("The URL of the site in Search Console")
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

      const data = await client.getSite(site_url);

      if (!data) {
        return {
          content: [{
            type: "text",
            text: `Site not found: ${site_url}`
          }]
        };
      }

      let output = `Site details for ${site_url}:\n`;
      output += `${'-'.repeat(50)}\n`;
      output += `Permission level: ${data.permissionLevel || 'UNKNOWN'}\n`;

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
          text: `Error fetching site details: ${error.message}`
        }]
      };
    }
  }
};
