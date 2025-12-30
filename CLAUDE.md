# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP-GSC is a Model Context Protocol (MCP) server that connects Google Search Console with AI assistants (Claude, ChatGPT). It enables SEO analysis through natural language conversations, providing access to search analytics, URL inspection, sitemap management, and property management.

## Architecture

The project has two main components:

### 1. Python MCP Server (`gsc_server.py`)
- Main entry point for Claude Desktop integration
- Uses FastMCP framework with stdio transport
- Authenticates via OAuth (personal account) or Service Account credentials
- Defines 26 MCP tools for GSC operations
- Credential resolution order: `GSC_CREDENTIALS_PATH` env var → `service_account_credentials.json` in script dir → current dir

### 2. Cloudflare Workers Server (`gsc-mcp-cloud/`)
- TypeScript-based cloud deployment for ChatGPT/OpenAI integration
- Uses Hono framework for HTTP handling
- Implements MCP over SSE (Server-Sent Events)
- OAuth tokens stored in Cloudflare KV (`OAUTH_KV` binding)
- Tools organized in `src/tools/`: propertyTools, analyticsTools, inspectionTools, sitemapTools, seoAnalysisTools, gscActions

## Commands

### Python Server (Local/Claude Desktop)
```bash
# Install dependencies
uv venv .venv && source .venv/bin/activate
uv pip install -r requirements.txt

# Run server using FastMCP config (recommended)
fastmcp run                    # Uses fastmcp.json
fastmcp run dev.fastmcp.json   # Uses dev config with DEBUG logging

# Run server directly (for testing)
python gsc_server.py
```

### Cloudflare Workers (Cloud/ChatGPT)
```bash
cd gsc-mcp-cloud

# Install dependencies
npm install

# Local development
npm run dev          # Runs at http://localhost:8787

# Deploy to Cloudflare
npm run deploy

# View production logs
npm run tail

# Set secrets
echo "client-id" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "client-secret" | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## Key Environment Variables

### Python Server
- `GSC_CREDENTIALS_PATH`: Path to service account JSON
- `GSC_OAUTH_CLIENT_SECRETS_FILE`: Path to OAuth client secrets
- `GSC_SKIP_OAUTH`: Set to "true" to use only service account auth

### Cloudflare Workers
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth credentials (set via wrangler secret)
- `GOOGLE_REDIRECT_URI`: OAuth callback URL
- `DEBUG`: Enable debug logging

## Tool Categories (26 Total)

1. **OpenAI MCP Integration** (2): search, fetch
2. **Property Management** (4): list_properties, add_site, delete_site, get_site_details
3. **Search Analytics** (5): get_search_analytics, get_performance_overview, get_advanced_search_analytics, compare_search_periods, get_search_by_page_query
4. **URL Inspection** (3): inspect_url_enhanced, batch_url_inspection, check_indexing_issues
5. **Sitemap Management** (5): get_sitemaps, submit_sitemap, delete_sitemap, list_sitemaps_enhanced, get_sitemap_details
6. **SEO Analysis** (7): find_high_potential_keywords, check_page_experience, get_coverage_report, analyze_backlinks, spot_content_opportunities, analyze_regional_device_performance, analyze_algorithm_impact

### SEO Analysis Tools Details

| Tool | Purpose |
|------|---------|
| `find_high_potential_keywords` | Keywords ranking 11-40 (striking distance) + low CTR opportunities |
| `check_page_experience` | Mobile usability, crawl status, indexing state (note: no CWV via API) |
| `get_coverage_report` | Comprehensive indexing analysis with issue breakdown |
| `analyze_backlinks` | Page authority based on search visibility (no external links via API) |
| `spot_content_opportunities` | Rising/declining queries, content refresh candidates |
| `analyze_regional_device_performance` | Country/device breakdown, mobile gaps |
| `analyze_algorithm_impact` | Before/after comparison for algorithm updates |

## API Endpoints (Cloud Server)

- `/mcp-sse`, `/mcp-direct`, `/sse/`: MCP protocol endpoints
- `/auth`: Initiates OAuth flow
- `/auth-callback`: OAuth callback handler
- `/health`: Health check

## Site URL Formats

GSC requires exact URL matches:
- URL prefix: `https://example.com` or `https://www.example.com`
- Domain property: `sc-domain:example.com`

## Configuration Files

### Python Server (`fastmcp.json`)
Declarative configuration for FastMCP server:
- `fastmcp.json`: Production config (INFO logging)
- `dev.fastmcp.json`: Development config (DEBUG logging)

### Cloudflare Workers (`wrangler.toml`)
- KV namespace binding for OAuth token storage
- Environment variables and secrets configuration

## Middleware (Cloud Server)

The Cloudflare Workers server includes:
- **CORS Middleware**: Allows cross-origin requests
- **Error Handling Middleware**: Centralized error logging with structured JSON responses
- **Cache Middleware**: Caches health check responses (5 min TTL)
- **Request Logging**: Debug mode logs all requests with timing

## Input Validation

Tool schemas use Zod with descriptive error messages:
- Required field validation with custom messages
- URL format validation for site_url parameters
- Date format validation (YYYY-MM-DD) for period parameters
- Numeric range validation (e.g., days: 1-540 for GSC API limits)
- Dimension validation (query, page, device, country, date)

## GSC API Limitations

Important constraints when working with GSC API:
- **Max lookback**: 540 days (16 months)
- **Max rows per query**: 25,000
- **URL inspections**: 2,000 per day per property
- **No external backlinks**: Only available in GSC Web UI
- **No Core Web Vitals**: Use PageSpeed Insights API or CrUX
- **Data delay**: Typically 2-3 days behind real-time

## Helper Functions (`src/utils/gscHelper.ts`)

Utility functions for SEO analysis:
- `getAuthenticatedClient()`: Returns authenticated GSC client or error
- `calculatePercentageChange(before, after)`: Calculate % change between values
- `formatChange(value, decimals)`: Format number with +/- sign
- `formatDate(date)`: Format as YYYY-MM-DD
- `getDateRange(days)`: Get start/end date for analysis period
- `getExpectedCTR(position)`: Expected CTR based on SERP position (1-20+)
