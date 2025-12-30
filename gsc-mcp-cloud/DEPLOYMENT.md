# Deployment Guide - GSC MCP Cloud Server

Complete guide to deploying the Google Search Console MCP server to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/sign-up
   - Free tier is sufficient for testing

2. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   # or
   npm install wrangler --save-dev
   ```

3. **Node.js** (v18 or newer)
   - Download from https://nodejs.org/

## Quick Start

### 1. Install Dependencies

```bash
cd gsc-mcp-cloud
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authorize Wrangler.

### 3. Test Locally

```bash
npm run dev
```

Server runs at `http://localhost:8787`

**Test endpoints:**
```bash
# Health check
curl http://localhost:8787/health

# Tools list
curl http://localhost:8787/mcp-sse

# Search tool
curl -X POST http://localhost:8787/mcp-sse \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "query": "performance"
      }
    }
  }'
```

### 4. Deploy to Production

```bash
npm run deploy
```

Your server will be deployed to:
```
https://gsc-mcp-cloud.<your-subdomain>.workers.dev
```

## Configuration

### Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add custom domain

Update `wrangler.toml`:
```toml
name = "gsc-mcp-cloud"
main = "src/index.ts"
compatibility_date = "2024-10-08"

routes = [
  { pattern = "mcp.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### Environment Variables

For production with authentication:

```bash
# Set secrets via Wrangler CLI
echo "your-client-id" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "your-client-secret" | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Update `wrangler.toml`:
```toml
[vars]
GOOGLE_REDIRECT_URI = "https://your-worker.workers.dev/auth-callback"
DEBUG = "false"
```

## Connecting to ChatGPT

### 1. Get Your Deployment URL

After deployment, your URL will be:
```
https://gsc-mcp-cloud.<subdomain>.workers.dev/sse/
```

⚠️ **Important:** The URL must end with `/sse/` for ChatGPT

### 2. Add to ChatGPT

1. Open [ChatGPT Settings](https://chatgpt.com/#settings)
2. Go to **Connectors** tab
3. Click **Add Connector**
4. Enter your server URL: `https://your-worker.workers.dev/sse/`
5. Save

### 3. Test in ChatGPT

Try these prompts:
- "Search for GSC performance data"
- "Fetch the performance-overview document"
- "Find information about indexing status"

## Using with OpenAI API

### Deep Research via API

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
            "text": "Analyze GSC performance trends"
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

### Responses API Configuration

```json
{
  "tools": [
    {
      "type": "mcp",
      "server_label": "gsc-data",
      "server_url": "https://gsc-mcp-cloud.workers.dev/sse/",
      "allowed_tools": ["search", "fetch"],
      "require_approval": "never"
    }
  ]
}
```

## Monitoring

### View Logs

Real-time logs:
```bash
npm run tail
```

Or in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click "Logs" tab

### Metrics

View in Cloudflare Dashboard:
- Requests per second
- Error rate
- CPU time
- Memory usage

## Troubleshooting

### Deploy Fails

**Issue:** `Authentication error`
```bash
npx wrangler logout
npx wrangler login
npm run deploy
```

**Issue:** `Module not found`
```bash
rm -rf node_modules
npm install
npm run deploy
```

### Server Returns 500 Error

Check logs:
```bash
npm run tail
```

Common issues:
- Missing dependencies in `package.json`
- TypeScript compilation errors
- Invalid tool definitions

### ChatGPT Can't Connect

1. Verify URL ends with `/sse/`
2. Test endpoint directly:
   ```bash
   curl https://your-worker.workers.dev/sse/
   ```
3. Check CORS headers are present
4. Ensure server is deployed (not just running locally)

### Tools Not Working

Test individual tools:
```bash
curl -X POST https://your-worker.workers.dev/mcp-sse \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Should return list of available tools.

## Production Checklist

Before going to production:

- [ ] Replace mock data with real GSC API calls
- [ ] Add authentication (OAuth 2.0)
- [ ] Implement token refresh logic
- [ ] Add error handling and retries
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Add caching for frequently accessed data
- [ ] Set up custom domain
- [ ] Review and update CORS policy
- [ ] Add request logging
- [ ] Implement data validation
- [ ] Test with real GSC properties

## Security Considerations

1. **No Secrets in Code**
   - Use Wrangler secrets for sensitive data
   - Never commit `.dev.vars` file

2. **CORS Policy**
   - Current: Allows all origins (`*`)
   - Production: Restrict to specific domains

3. **Rate Limiting**
   - Add rate limiting for public endpoints
   - Use Cloudflare's built-in rate limiting

4. **Input Validation**
   - Already using Zod schemas
   - Add additional sanitization if needed

## Cost Estimation

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- Sufficient for testing and small-scale use

**Paid Plan ($5/month):**
- 10 million requests/month
- More CPU time
- Better for production use

## Next Steps

1. **Add Real GSC Integration:**
   - Follow [GTM MCP Architecture Guide](../gtm-mcp-server-n8n/MCP-ARCHITECTURE.md)
   - Implement OAuth flow
   - Add token management

2. **Expand Tools:**
   - Add indexing inspection tools
   - Add sitemap management
   - Add search analytics tools

3. **Improve Error Handling:**
   - Better error messages
   - Retry logic
   - Fallback data

4. **Add Caching:**
   - Use Workers KV for caching
   - Cache GSC API responses
   - Reduce API calls

## Support

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **OpenAI MCP Docs:** https://platform.openai.com/docs/mcp
- **MCP Protocol Spec:** https://modelcontextprotocol.io/

---

**Ready to deploy?** Run `npm run deploy` and share your MCP server URL!
