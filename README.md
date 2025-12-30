# Google Search Console MCP Server

[![Tests](https://github.com/hablapro/mcp-gsc/actions/workflows/test.yml/badge.svg)](https://github.com/hablapro/mcp-gsc/actions/workflows/test.yml)
[![Deploy](https://github.com/hablapro/mcp-gsc/actions/workflows/deploy.yml/badge.svg)](https://github.com/hablapro/mcp-gsc/actions/workflows/deploy.yml)

A Model Context Protocol (MCP) server that connects AI assistants (ChatGPT, Claude, custom agents) with Google Search Console data. Analyze your SEO data through natural language conversations - ask questions, get insights, and take action without navigating dashboards.

**Production Endpoint:** `https://gsc-mcp-cloud.principal-e85.workers.dev`

---

## What Is This?

This MCP server acts as a bridge between AI assistants and the Google Search Console API. Instead of manually navigating GSC dashboards, you can ask questions like:

- "What are my top-performing keywords this month?"
- "Find pages that are losing traffic"
- "Check if my new blog post is indexed"
- "What keywords am I ranking 11-20 for that I could push to page 1?"
- "Compare my performance before and after the last algorithm update"

The AI assistant uses this MCP server to fetch real data from your GSC account and provide actionable insights.

---

## Who Is This For?

| Audience | Use Case |
|----------|----------|
| **SEO Professionals** | Automate reporting, identify optimization opportunities, monitor algorithm impacts |
| **Content Marketers** | Find content gaps, track article performance, identify refresh candidates |
| **Web Developers** | Check indexing status, debug crawl issues, validate sitemaps |
| **Agency Teams** | Manage multiple client properties, generate insights at scale |
| **AI/Automation Enthusiasts** | Build custom SEO workflows powered by LLMs |

---

## Problems It Solves

1. **Time-Consuming Manual Analysis** - Ask natural language questions instead of clicking through dashboards
2. **Missed Optimization Opportunities** - AI identifies striking distance keywords and CTR opportunities automatically
3. **Reactive SEO** - Get proactive alerts about declining pages before they drop off page 1
4. **Complex Data Interpretation** - AI translates raw data into actionable recommendations
5. **Multi-Property Management** - Query across all your GSC properties in one conversation
6. **Algorithm Impact Analysis** - Quickly compare before/after performance around updates

---

## Available Tools (26 Total)

### OpenAI MCP Integration (2 tools)

| Tool | Description |
|------|-------------|
| `search` | Search for relevant documents and data from GSC based on a query |
| `fetch` | Retrieve complete document content using a document ID |

### Property Management (4 tools)

| Tool | Description |
|------|-------------|
| `list_properties` | List all Search Console properties with permission levels |
| `add_site` | Add a new site to Search Console (URL or domain property) |
| `delete_site` | Remove a site from Search Console |
| `get_site_details` | Get verification status and ownership details |

### Search Analytics (5 tools)

| Tool | Description |
|------|-------------|
| `get_search_analytics` | Get search data with customizable dimensions (query, page, country, device) |
| `get_performance_overview` | Comprehensive performance summary with totals and daily trends |
| `get_advanced_search_analytics` | Advanced queries with sorting, filtering, multiple search types (Web, Image, Video, News, Discover) |
| `compare_search_periods` | Compare two time periods to identify trends and changes |
| `get_search_by_page_query` | Get queries driving traffic to a specific page |

### URL Inspection (3 tools)

| Tool | Description |
|------|-------------|
| `inspect_url_enhanced` | Check indexing status, rich results, crawling details, canonical URLs |
| `batch_url_inspection` | Inspect up to 10 URLs at once |
| `check_indexing_issues` | Find not-indexed pages, canonical conflicts, robots blocking, fetch errors |

### Sitemap Management (5 tools)

| Tool | Description |
|------|-------------|
| `get_sitemaps` | List all sitemaps with status and URL counts |
| `submit_sitemap` | Submit or resubmit a sitemap for processing |
| `list_sitemaps_enhanced` | Detailed sitemap list with submission dates, content types, warnings |
| `get_sitemap_details` | Deep dive into a specific sitemap's status and errors |
| `delete_sitemap` | Remove a sitemap from processing |

### SEO Analysis Tools (7 tools)

Specialized tools for actionable SEO insights:

| Tool | Description | Key Insights |
|------|-------------|--------------|
| `find_high_potential_keywords` | Find quick-win keyword opportunities | Keywords ranking 11-40 (striking distance), high impressions with low CTR |
| `check_page_experience` | Analyze page experience signals | Mobile usability, crawl status, indexing state |
| `get_coverage_report` | Comprehensive indexing analysis | Coverage summary, issue breakdown, action items |
| `analyze_backlinks` | Page authority and internal linking* | Top authority pages, hub pages, orphan pages |
| `spot_content_opportunities` | Find rising/declining content | Emerging topics, declining pages, refresh candidates |
| `analyze_regional_device_performance` | Country and device breakdown | Mobile vs desktop gaps, geo performance |
| `analyze_algorithm_impact` | Before/after comparison | Winners, losers, affected queries, recovery recommendations |

*Note: External backlink data is NOT available via GSC API. Use Ahrefs/SEMrush for external links.

---

## API Limitations

| Limitation | Details |
|------------|---------|
| **Data Lookback** | Maximum 540 days (16 months) |
| **Rows Per Query** | Maximum 25,000 rows |
| **URL Inspections** | 2,000 per day per property |
| **No External Backlinks** | Only available in GSC Web UI |
| **No Core Web Vitals** | Use PageSpeed Insights API or CrUX |
| **Data Delay** | GSC data is typically 2-3 days behind |

---

## Architecture

```
+-----------------+     +------------------+     +-----------------+
|   AI Assistant  |---->|   MCP Server     |---->|  Google Search  |
|  (ChatGPT, etc) |<----|  (Cloudflare)    |<----|  Console API    |
+-----------------+     +------------------+     +-----------------+
                               |
                               v
                        +--------------+
                        |   KV Store   |
                        | (OAuth tokens)|
                        +--------------+
```

**Stack:**
- **Runtime:** Cloudflare Workers (TypeScript) or local Python (FastMCP)
- **Framework:** Hono (web), Zod (validation)
- **Protocol:** MCP over SSE
- **Auth:** Google OAuth 2.0

---

## Deployment Options

### Option 1: Cloudflare Workers (Recommended for ChatGPT)

**Endpoint:** `https://gsc-mcp-cloud.principal-e85.workers.dev`

| Endpoint | Purpose |
|----------|---------|
| `/health` | Health check |
| `/auth` | Start Google OAuth flow |
| `/oauth/callback` | OAuth callback handler |
| `/mcp-sse` | MCP Server-Sent Events endpoint |

#### Setup

```bash
cd gsc-mcp-cloud
npm install

# Set OAuth credentials
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# Deploy
npm run deploy

# Visit /auth to authenticate with Google
```

### Option 2: Local Python Server (For Claude Desktop)

#### OAuth Authentication (Recommended)

```json
{
  "mcpServers": {
    "gscServer": {
      "command": "/path/to/mcp-gsc/.venv/bin/python",
      "args": ["/path/to/mcp-gsc/gsc_server.py"],
      "env": {
        "GSC_OAUTH_CLIENT_SECRETS_FILE": "/path/to/client_secrets.json"
      }
    }
  }
}
```

#### Service Account Authentication

```json
{
  "mcpServers": {
    "gscServer": {
      "command": "/path/to/mcp-gsc/.venv/bin/python",
      "args": ["/path/to/mcp-gsc/gsc_server.py"],
      "env": {
        "GSC_CREDENTIALS_PATH": "/path/to/service_account_credentials.json",
        "GSC_SKIP_OAUTH": "true"
      }
    }
  }
}
```

---

## Example Prompts

| Goal | Prompt |
|------|--------|
| Find quick wins | "Find keywords I'm ranking 11-20 for with high impressions" |
| Content audit | "Show me pages losing traffic over the last 30 days" |
| Algorithm check | "Compare my performance 2 weeks before and after November 15th" |
| Indexing audit | "Check if my top 10 blog posts are indexed" |
| Mobile optimization | "Compare my mobile vs desktop performance by country" |
| CTR opportunities | "Find queries with high impressions but CTR below 2%" |

---

## Changelog

### v1.3.0 - December 30, 2025, 07:05 UTC
**CI/CD & Testing**
- Added Vitest testing framework with 53 unit tests
- Test coverage: 80%+ for SEO analysis tools
- Added GitHub Actions workflow for automated testing on push/PR
- Added GitHub Actions workflow for automated Cloudflare Workers deployment
- Deployment triggers on changes to `gsc-mcp-cloud/` directory
- Added CI status badges to README

### v1.2.1 - December 30, 2025, 05:50 UTC
**URL Parsing Fix**
- Fixed `check_page_experience` and `get_coverage_report` to accept both comma-separated and newline-separated URL lists
- Improved usability for AI assistants passing multiple URLs
- Deployed to production

### v1.2.0 - December 30, 2025, 04:30 UTC
**SEO Analysis Tools**
- Added 7 new specialized SEO analysis tools:
  - `find_high_potential_keywords` - Striking distance and CTR opportunities
  - `check_page_experience` - Mobile usability and crawl status
  - `get_coverage_report` - Comprehensive indexing analysis
  - `analyze_backlinks` - Page authority based on search visibility
  - `spot_content_opportunities` - Rising/declining query detection
  - `analyze_regional_device_performance` - Country and device breakdown
  - `analyze_algorithm_impact` - Before/after comparison for updates
- Added helper functions: `calculatePercentageChange`, `formatChange`, `formatDate`, `getDateRange`, `getExpectedCTR`
- Total tools increased from 19 to 26
- Tested with real GSC data from production properties

### v1.1.0 - December 29, 2025, 22:00 UTC
**Infrastructure Improvements**
- Added FastMCP configuration for Python server
- Implemented Hono error handling middleware with structured JSON responses
- Added cache middleware for health endpoint (5 minute TTL)
- Fixed SSE body consumption error (request cloning fix)
- Improved Zod validation with custom error messages
- Set up Google OAuth 2.0 authentication flow with KV token storage
- Initial deployment to Cloudflare Workers

### v1.0.0 - December 29, 2025, 18:00 UTC
**Initial Release**
- Core MCP server implementation
- 19 tools across 5 categories:
  - 2 OpenAI MCP integration tools
  - 4 Property management tools
  - 5 Search analytics tools
  - 3 URL inspection tools
  - 5 Sitemap management tools
- Python server with FastMCP support
- TypeScript server for Cloudflare Workers

---

## Local Development

```bash
# TypeScript (Cloudflare Workers)
cd gsc-mcp-cloud
npm install
npm run dev

# Python (FastMCP)
cd mcp-gsc
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python gsc_server.py
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

**Repository:** [https://github.com/hablapro/mcp-gsc](https://github.com/hablapro/mcp-gsc)

---

## License

MIT License - See [LICENSE](LICENSE) file for details.
