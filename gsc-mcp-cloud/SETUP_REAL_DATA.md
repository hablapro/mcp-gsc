# Setup Guide: Connect to Real Google Search Console Data

This guide will help you configure your MCP server to use real Google Search Console API data instead of mock data.

## Prerequisites

- Google Cloud Project with Search Console API enabled
- OAuth 2.0 credentials (Client ID & Secret)
- Cloudflare account with Workers enabled

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Search Console API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Search Console API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: `GSC MCP Server`
   - Authorized redirect URIs:
     ```
     https://gsc-mcp-cloud.principal-e85.workers.dev/auth-callback
     ```
   - Click "Create"
   - **Save your Client ID and Client Secret**

## Step 2: Create Cloudflare KV Namespace

```bash
# Create KV namespace for production
npx wrangler kv:namespace create OAUTH_KV

# Create KV namespace for preview/dev
npx wrangler kv:namespace create OAUTH_KV --preview
```

You'll get output like:
```
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "abc123..."
preview_id = "xyz789..."
```

## Step 3: Update wrangler.toml

Replace the placeholder KV IDs in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "YOUR_ACTUAL_KV_ID_HERE"          # From step 2
preview_id = "YOUR_PREVIEW_KV_ID_HERE" # From step 2
```

## Step 4: Set Secrets

```bash
# Set Google OAuth Client ID
echo 'your-actual-client-id' | npx wrangler secret put GOOGLE_CLIENT_ID

# Set Google OAuth Client Secret
echo 'your-actual-client-secret' | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## Step 5: Deploy

```bash
npx wrangler deploy
```

## Step 6: Authenticate

1. Visit your deployed worker URL: `https://gsc-mcp-cloud.principal-e85.workers.dev/auth`
2. Sign in with your Google account
3. Grant permissions to access Search Console data
4. You'll be redirected back with a success message

## Step 7: Test with Real Data

Now your tools will use real GSC data:

```bash
# Test list_properties with real data
curl -X POST https://gsc-mcp-cloud.principal-e85.workers.dev/mcp-sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"list_properties",
      "arguments":{}
    }
  }'
```

## Troubleshooting

### "Authentication not configured"
- Make sure you've set the secrets (Step 4)
- Verify KV namespace is created and configured (Step 2-3)
- Redeploy after configuration changes

### "Not authenticated"
- Visit `/auth` to authenticate
- Make sure your Google account has access to Search Console properties

### "OAuth2 Error"
- Verify redirect URI matches exactly in Google Cloud Console
- Check that Search Console API is enabled
- Ensure Client ID and Secret are correct

### Token Refresh Issues
- Tokens are automatically refreshed when expired
- If issues persist, re-authenticate via `/auth`

## Security Notes

1. **Secrets**: Never commit `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` to git
2. **KV Storage**: Tokens are stored securely in Cloudflare KV with 30-day expiration
3. **HTTPS Only**: All OAuth flows require HTTPS (enforced by Cloudflare Workers)
4. **State Parameter**: OAuth flow includes state validation to prevent CSRF attacks

## Next Steps

Once authenticated, all 21 tools will use real Google Search Console data:

- ✅ `list_properties` - Real GSC properties
- ✅ `get_search_analytics` - Real performance data
- ✅ `inspect_url_enhanced` - Real indexing status
- ✅ `get_sitemaps` - Real sitemap data
- ✅ And 17 more tools...

## Rate Limits

Google Search Console API has rate limits:
- 1,200 queries per minute
- 100,000 queries per day

The MCP server does not implement rate limiting, so monitor your usage.

## Support

For issues:
1. Check Cloudflare Workers logs: `npx wrangler tail`
2. Verify Google Cloud Console API quotas
3. Test OAuth flow manually via `/auth`
