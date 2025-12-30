import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (params: ToolParams, args: any) => Promise<ToolResult>;
}

export interface ToolParams {
  env: Env;
}

export interface ToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
}

// Import OpenAI MCP required tools
import { searchTool, fetchTool } from "./gscActions";

// Import GSC-specific tools
import { listPropertiesTool, addSiteTool, deleteSiteTool, getSiteDetailsTool } from "./propertyTools";
import {
  getSearchAnalyticsTool,
  getPerformanceOverviewTool,
  getAdvancedSearchAnalyticsTool,
  compareSearchPeriodsTool,
  getSearchByPageQueryTool
} from "./analyticsTools";
import {
  inspectUrlEnhancedTool,
  batchUrlInspectionTool,
  checkIndexingIssuesTool
} from "./inspectionTools";
import {
  getSitemapsTool,
  submitSitemapTool,
  listSitemapsEnhancedTool,
  getSitemapDetailsTool,
  deleteSitemapTool
} from "./sitemapTools";

// Tool registry - includes OpenAI MCP required tools + all GSC tools
export const toolRegistry: Tool[] = [
  // OpenAI MCP required tools (MUST be first for ChatGPT integration)
  searchTool,
  fetchTool,

  // Property Management Tools
  listPropertiesTool,
  addSiteTool,
  deleteSiteTool,
  getSiteDetailsTool,

  // Analytics Tools
  getSearchAnalyticsTool,
  getPerformanceOverviewTool,
  getAdvancedSearchAnalyticsTool,
  compareSearchPeriodsTool,
  getSearchByPageQueryTool,

  // URL Inspection Tools
  inspectUrlEnhancedTool,
  batchUrlInspectionTool,
  checkIndexingIssuesTool,

  // Sitemap Tools
  getSitemapsTool,
  submitSitemapTool,
  listSitemapsEnhancedTool,
  getSitemapDetailsTool,
  deleteSitemapTool,
];
