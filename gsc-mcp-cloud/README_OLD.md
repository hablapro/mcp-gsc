# Google Search Console Cloud MCP Server

A cloud-based Model Context Protocol (MCP) server for Google Search Console data, built following the [OpenAI MCP documentation](https://platform.openai.com/docs/mcp) and deployed on Cloudflare Workers.

## Architecture

This server follows the OpenAI MCP specification and implements the two required tools:
- **`search`** - Returns a list of relevant search results from GSC data
- **`fetch`** - Retrieves complete document content by ID

Built with:
- **Cloudflare Workers** - Edge deployment for global access
- **Hono** - Fast, lightweight web framework
- **TypeScript** - Type-safe development
- **Zod** - Schema validation
- **Server-Sent Events (SSE)** - Real-time streaming protocol

## Project Structure

```
gsc-mcp-cloud/
├── src/
│   ├── index.ts              # Cloudflare Worker entry point
│   ├── sseStdioHandler.ts    # MCP protocol SSE handler
│   │
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   └── gscActions.ts     # Search & fetch tools
│   │
│   ├── utils/
│   │   └── apisHandler.ts    # API routes
│   │
│   └── types/
│       └── env.d.ts          # TypeScript environment types
│
├── wrangler.toml             # Cloudflare configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd gsc-mcp-cloud
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Local Development

Run the server locally:

```bash
npm run dev
```

The server will be available at `http://localhost:8787`

Test the endpoints:
- Main page: `http://localhost:8787/`
- Health check: `http://localhost:8787/health`
- MCP SSE: `http://localhost:8787/sse/`

### Deployment

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Deploy to Cloudflare Workers:**
   ```bash
   npm run deploy
   ```

3. **Your server will be live at:**
   ```
   https://gsc-mcp-cloud.<your-subdomain>.workers.dev
   ```

## Usage

### With ChatGPT

1. Go to [ChatGPT Settings](https://chatgpt.com/#settings)
2. Navigate to **Connectors** tab
3. Add a new MCP server with your deployed URL ending in `/sse/`
4. Use in Deep Research or Connectors

### With OpenAI API

Use the Responses API with your MCP server:

```bash
curl https://api.openai.com/v1/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
  "model": "o4-mini-deep-research",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Search for GSC performance data"
        }
      ]
    }
  ],
  "tools": [
    {
      "type": "mcp",
      "server_label": "gsc",
      "server_url": "https://your-worker.workers.dev/sse/",
      "allowed_tools": ["search", "fetch"],
      "require_approval": "never"
    }
  ]
}'
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page with documentation |
| `/health` | GET | Health check endpoint |
| `/mcp-sse` | GET/POST | Main MCP SSE endpoint |
| `/mcp-direct` | GET/POST | Direct MCP endpoint |
| `/sse/` | GET/POST | SSE streaming endpoint (for ChatGPT) |

## Tools Documentation

### `search` Tool

Search for relevant documents and data from Google Search Console.

**Input:**
```json
{
  "query": "performance overview"
}
```

**Output:**
```json
{
  "results": [
    {
      "id": "performance-overview",
      "title": "Performance Overview - Last 28 Days",
      "url": "https://search.google.com/search-console/performance"
    }
  ]
}
```

### `fetch` Tool

Retrieve complete document content by ID from search results.

**Input:**
```json
{
  "id": "performance-overview"
}
```

**Output:**
```json
{
  "id": "performance-overview",
  "title": "Performance Overview - Last 28 Days",
  "text": "# Google Search Console Performance Overview\\n\\n## Summary Statistics...",
  "url": "https://search.google.com/search-console/performance",
  "metadata": {
    "source": "gsc_api",
    "date_range": "last_28_days"
  }
}
```

## Configuration

### No Authentication Required

This demo server doesn't require authentication. In production:

1. Add Google OAuth credentials
2. Implement token management
3. Add KV namespace for token storage
4. Follow the [GTM MCP architecture guide](/path/to/MCP-ARCHITECTURE.md)

### Environment Variables

Currently no secrets needed. For production:

```toml
# wrangler.toml
[vars]
GOOGLE_REDIRECT_URI = "https://your-worker.workers.dev/auth-callback"
DEBUG = "false"

# Set via CLI:
# wrangler secret put GOOGLE_CLIENT_ID
# wrangler secret put GOOGLE_CLIENT_SECRET
```

## Development

### Adding New Tools

1. Create tool definition in `src/tools/gscActions.ts`
2. Add to tool registry in `src/tools/index.ts`
3. Test locally with `npm run dev`
4. Deploy with `npm run deploy`

### OpenAI MCP Requirements

For ChatGPT and Deep Research integration, your tools must:
- Implement `search` returning `{ results: [{id, title, url}] }`
- Implement `fetch` returning `{ id, title, text, url, metadata }`
- Return content as JSON-encoded text in MCP content array format

## Troubleshooting

### Server Not Starting Locally

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Deployment Issues

```bash
# Check Wrangler authentication
npx wrangler whoami

# View deployment logs
npm run tail
```

### CORS Errors

The server includes CORS headers for all origins. If you encounter issues:
- Check the browser console for specific errors
- Ensure you're using the `/sse/` endpoint for streaming

## Resources

- [OpenAI MCP Documentation](https://platform.openai.com/docs/mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [GTM MCP Architecture Guide](../gtm-mcp-server-n8n/MCP-ARCHITECTURE.md)

## Current Status

✅ **Implemented:**
- Basic MCP protocol with SSE streaming
- `search` and `fetch` tools with mock data
- Cloudflare Workers deployment setup
- OpenAI MCP-compliant tool responses

🚧 **TODO for Production:**
- Add Google Search Console API integration
- Implement OAuth authentication flow
- Add token management and auto-refresh
- Connect to real GSC data sources
- Add more GSC-specific tools (indexing, sitemaps, etc.)
- Implement error handling and rate limiting

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

Built following the [OpenAI MCP specification](https://platform.openai.com/docs/mcp) and [Google MCP Server architecture patterns](../gtm-mcp-server-n8n/MCP-ARCHITECTURE.md).
