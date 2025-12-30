# Google Search Console MCP Cloud Server

A cloud-based Model Context Protocol (MCP) server that provides seamless access to Google Search Console data through AI assistants like ChatGPT and Claude.

---

## 📖 Table of Contents

- [What is MCP?](#what-is-mcp)
- [What Does This Server Do?](#what-does-this-server-do)
- [When Was This Created?](#when-was-this-created)
- [Features](#features)
- [How to Use](#how-to-use)
- [Available Tools](#available-tools)
- [Architecture](#architecture)
- [API Reference](#api-reference)

---

## 🤔 What is MCP?

**Model Context Protocol (MCP)** is an open protocol created by Anthropic that enables AI assistants to securely connect to external data sources and tools. Think of it as a standardized way for AI models to interact with your data and services.

### Key Concepts:

- **Protocol**: A standardized communication format between AI models and external services
- **Tools**: Functions that AI assistants can call to perform actions (like querying GSC data)
- **Resources**: Data sources that can be accessed (like your GSC properties)
- **Server**: A service that exposes tools and resources via the MCP protocol

### Why MCP Matters:

Before MCP, each AI assistant needed custom integrations for every service. With MCP:
- ✅ One server works with multiple AI assistants (ChatGPT, Claude, etc.)
- ✅ Standardized authentication and security
- ✅ Real-time data access without manual exports
- ✅ AI can take actions on your behalf (with your permission)

**Learn more:** [MCP Documentation](https://modelcontextprotocol.io/) | [Anthropic's MCP Announcement](https://www.anthropic.com/news/model-context-protocol)

---

## 🎯 What Does This Server Do?

This MCP server connects AI assistants to your **Google Search Console** account, allowing them to:

### Data Access:
- 📊 **Fetch Analytics** - Get clicks, impressions, CTR, and position data
- 🔍 **Search Queries** - Analyze which queries drive traffic to your site
- 📄 **URL Inspection** - Check indexing status and rich results
- 🗺️ **Sitemap Management** - View, submit, and manage sitemaps
- 🏠 **Property Management** - List and manage GSC properties

### AI Capabilities:
With this server connected, AI assistants can:
- Answer questions: *"How is my site performing this week?"*
- Provide insights: *"Which pages have indexing issues?"*
- Compare periods: *"Compare traffic between September and October"*
- Take actions: *"Submit my new sitemap"*
- Generate reports: *"Create a summary of my top 10 queries"*

### Real-World Use Cases:
1. **Quick Analysis**: "Show me my top 5 pages by clicks this month"
2. **Issue Detection**: "Check if these 10 URLs are indexed properly"
3. **Performance Monitoring**: "Has my average position improved?"
4. **Competitive Research**: "What queries am I ranking for in position 5-10?"
5. **Automated Reporting**: "Generate a weekly performance summary"

---

## 📅 When Was This Created?

- **Original Python Version**: Based on the Python GSC MCP server (October 2025)
- **Cloud Version Created**: October 8, 2025
- **MCP Protocol**: Announced by Anthropic in 2024
- **OpenAI MCP Support**: Added support for ChatGPT integration in 2024

### Version History:
- **v1.0.0** (Oct 8, 2025) - Initial cloud deployment with all 21 tools
  - Ported 19 GSC tools from Python to TypeScript
  - Added OpenAI MCP compliance (search & fetch tools)
  - Deployed to Cloudflare Workers global edge network
  - Implemented OAuth authentication with token management

---

## ✨ Features

### 🌐 Cloud-Native Architecture
- **Global Edge Deployment**: Runs on Cloudflare Workers in 300+ cities worldwide
- **Zero Server Management**: Fully serverless, no infrastructure to maintain
- **Auto-Scaling**: Handles any load automatically
- **99.99% Uptime**: Cloudflare Workers SLA guarantee

### 🔐 Enterprise Security
- **OAuth 2.0 Authentication**: Secure Google account integration
- **Token Management**: Automatic refresh, encrypted storage in KV
- **HTTPS Only**: All communication encrypted
- **CSRF Protection**: State validation in OAuth flow

### 🚀 Performance
- **Edge Computing**: < 50ms response time globally
- **Startup Time**: 182ms worker initialization
- **Efficient Caching**: Token storage with 30-day expiration
- **Optimized Payload**: 836 KB gzipped worker

### 🛠️ Developer Experience
- **TypeScript**: Full type safety
- **Zod Schemas**: Runtime validation
- **Error Handling**: Comprehensive error messages
- **Extensible**: Easy to add new tools

### 🤖 AI Integration
- **OpenAI Compatible**: Works with ChatGPT and Deep Research
- **Anthropic Compatible**: Works with Claude
- **SSE Streaming**: Real-time responses
- **Intelligent Search**: AI can discover available tools

---

## 🚀 How to Use

### Prerequisites

1. **Google Account** with Search Console access
2. **Google Cloud Project** with Search Console API enabled
3. **OAuth Credentials** (Client ID & Secret)
4. **Cloudflare Account** (free tier sufficient)

### Quick Start

#### 1. Clone & Install

\`\`\`bash
git clone <your-repo>
cd gsc-mcp-cloud
npm install
\`\`\`

#### 2. Configure OAuth

Follow the detailed setup in [QUICK_SETUP.md](./QUICK_SETUP.md):

1. Create OAuth credentials in Google Cloud Console
2. Add redirect URI: \`https://gsc-mcp-cloud.principal-e85.workers.dev/auth-callback\`
3. Enable Google Search Console API

#### 3. Set Secrets

\`\`\`bash
# Set Google OAuth credentials
echo 'YOUR_CLIENT_ID' | npx wrangler secret put GOOGLE_CLIENT_ID
echo 'YOUR_CLIENT_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET
\`\`\`

#### 4. Deploy

\`\`\`bash
npx wrangler deploy
\`\`\`

#### 5. Authenticate

Visit: \`https://gsc-mcp-cloud.principal-e85.workers.dev/auth\`

#### 6. Connect to AI Assistant

**For ChatGPT:**
1. Go to [ChatGPT Settings](https://chatgpt.com/#settings)
2. Navigate to **Connectors** tab
3. Click **Add Connector**
4. Paste: \`https://gsc-mcp-cloud.principal-e85.workers.dev/sse/\`
5. Save

**For Claude (via API):**
\`\`\`bash
curl https://api.anthropic.com/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "tools": [{
      "type": "mcp",
      "server_url": "https://gsc-mcp-cloud.principal-e85.workers.dev/sse/"
    }],
    "messages": [{
      "role": "user",
      "content": "List my Google Search Console properties"
    }]
  }'
\`\`\`

---

## 🛠️ Available Tools (21 Total)

### Property Management (4 tools)
- \`list_properties\` - List all GSC properties with permissions
- \`get_site_details\` - Get detailed property information
- \`add_site\` - Add new site to Search Console
- \`delete_site\` - Remove site from Search Console

### Analytics (5 tools)
- \`get_search_analytics\` - Query performance with custom dimensions
- \`get_performance_overview\` - Overall metrics with daily trends
- \`get_advanced_search_analytics\` - Advanced filtering and sorting
- \`compare_search_periods\` - Compare two time periods
- \`get_search_by_page_query\` - Queries for specific pages

### URL Inspection (3 tools)
- \`inspect_url_enhanced\` - Detailed URL inspection
- \`batch_url_inspection\` - Inspect multiple URLs (up to 10)
- \`check_indexing_issues\` - Find indexing problems

### Sitemaps (5 tools)
- \`get_sitemaps\` - List all sitemaps
- \`submit_sitemap\` - Submit or resubmit sitemap
- \`list_sitemaps_enhanced\` - Enhanced sitemap details
- \`get_sitemap_details\` - Specific sitemap information
- \`delete_sitemap\` - Remove sitemap from GSC

### OpenAI MCP Required (2 tools)
- \`search\` - Search for GSC documents and tools
- \`fetch\` - Retrieve complete document content

### MCP Discovery (2 tools)
- \`initialize\` - Initialize MCP connection
- \`tools/list\` - List all available tools

**See [ALL_TOOLS.md](./ALL_TOOLS.md) for complete documentation.**

---

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────┐
│         AI Assistant (ChatGPT/Claude)       │
└─────────────────┬───────────────────────────┘
                  │ MCP Protocol (SSE)
                  ▼
┌─────────────────────────────────────────────┐
│      Cloudflare Workers (Edge Network)      │
│  ┌──────────────────────────────────────┐   │
│  │  Hono Web Framework                  │   │
│  │  ├─ SSE Handler                      │   │
│  │  ├─ OAuth Routes                     │   │
│  │  └─ Tool Registry (21 tools)        │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Token Manager (Cloudflare KV)      │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ OAuth 2.0 + API Calls
                  ▼
┌─────────────────────────────────────────────┐
│      Google Search Console API              │
└─────────────────────────────────────────────┘
\`\`\`

---

## 📡 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/\` | GET | Landing page |
| \`/health\` | GET | Health check |
| \`/auth\` | GET | Initiate OAuth flow |
| \`/auth-callback\` | GET | OAuth callback |
| \`/mcp-sse\` | POST | Main MCP endpoint |
| \`/sse/\` | POST | SSE endpoint for ChatGPT |

### Example: Test Tools List

\`\`\`bash
curl -X POST https://gsc-mcp-cloud.principal-e85.workers.dev/mcp-sse \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
\`\`\`

### Example: Execute Tool

\`\`\`bash
curl -X POST https://gsc-mcp-cloud.principal-e85.workers.dev/mcp-sse \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"list_properties",
      "arguments":{}
    }
  }'
\`\`\`

---

## 📊 Monitoring & Debugging

### View Logs

\`\`\`bash
# Live tail
npx wrangler tail

# Filter by status
npx wrangler tail --status error
\`\`\`

### Check Secrets

\`\`\`bash
npx wrangler secret list
\`\`\`

---

## 🐛 Troubleshooting

### "Authentication not configured"
- Verify secrets: \`npx wrangler secret list\`
- Check KV namespace in \`wrangler.toml\`

### "Not authenticated"
- Visit \`/auth\` to authenticate
- Check OAuth redirect URI in Google Cloud Console

### "OAuth2 Error: redirect_uri_mismatch"
- Add redirect URI: \`https://gsc-mcp-cloud.principal-e85.workers.dev/auth-callback\`
- Wait 30 seconds for propagation

---

## 📚 Additional Documentation

- [QUICK_SETUP.md](./QUICK_SETUP.md) - Step-by-step setup
- [SETUP_REAL_DATA.md](./SETUP_REAL_DATA.md) - OAuth configuration
- [ALL_TOOLS.md](./ALL_TOOLS.md) - Complete tool reference
- [DEPLOYED_FINAL.md](./DEPLOYED_FINAL.md) - Deployment summary

---

## 🙏 Acknowledgments

- **Anthropic** - Model Context Protocol
- **OpenAI** - MCP support in ChatGPT
- **Google** - Search Console API
- **Cloudflare** - Workers platform

---

**Built with ❤️ using TypeScript, Cloudflare Workers, and the Model Context Protocol**

**Version:** 1.0.0 | **Status:** ✅ Production Ready | **Last Updated:** October 8, 2025
