# Quick Setup for Real GSC Data

## ✅ What's Already Done

- KV namespace created and configured
- OAuth flow implemented
- GSC API client ready
- Worker deployed with nodejs_compat

## 🔧 What You Need to Do

### Step 1: Add Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the same project you used for GTM MCP
3. Go to "APIs & Services" > "Credentials"
4. Find your existing OAuth 2.0 Client ID
5. Click "Edit" (pencil icon)
6. Under "Authorized redirect URIs", click "ADD URI"
7. Add: `https://gsc-mcp-cloud.principal-e85.workers.dev/auth-callback`
8. Click "SAVE"

### Step 2: Enable Search Console API

1. Still in Google Cloud Console
2. Go to "APIs & Services" > "Library"
3. Search for "Google Search Console API"
4. Click on it and click "ENABLE" (if not already enabled)

### Step 3: Set Secrets (Same as GTM MCP)

Run these commands in the terminal:

```bash
cd /Users/rpro/Documents/mcp-gsc-main/gsc-mcp-cloud

# Use the SAME Client ID from your GTM MCP
echo 'YOUR_GOOGLE_CLIENT_ID' | npx wrangler secret put GOOGLE_CLIENT_ID

# Use the SAME Client Secret from your GTM MCP
echo 'YOUR_GOOGLE_CLIENT_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### Step 4: Test Authentication

1. Visit: https://gsc-mcp-cloud.principal-e85.workers.dev/auth
2. Sign in with your Google account
3. Grant permissions for Search Console access
4. You should see "✅ Authentication Successful!"

### Step 5: Test with Real Data

```bash
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

You should now see YOUR REAL GSC properties instead of mock data!

## 📋 Current Status

✅ Worker deployed: https://gsc-mcp-cloud.principal-e85.workers.dev
✅ KV namespace created: 4137d0b4fe464049b9220b517256cac4
✅ OAuth routes ready: `/auth` and `/auth-callback`
✅ GSC API client implemented
⏳ Waiting for: Google OAuth secrets to be set

## 🔍 Verification

After completing the setup, you can verify each step:

```bash
# 1. Check secrets are set
npx wrangler secret list

# Should show:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET

# 2. Test health endpoint
curl https://gsc-mcp-cloud.principal-e85.workers.dev/health

# 3. Test auth endpoint (in browser)
open https://gsc-mcp-cloud.principal-e85.workers.dev/auth

# 4. After auth, test list_properties
curl -X POST https://gsc-mcp-cloud.principal-e85.workers.dev/mcp-sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_properties","arguments":{}}}'
```

## 🎯 What You'll Get

Once authenticated, the `list_properties` tool will return YOUR actual Google Search Console properties like:

```
- https://yoursite.com/ (OWNER)
- https://www.yoursite.com/ (FULL)
- sc-domain:yoursite.com (OWNER)
```

Instead of the mock data!

## ⚡ Next: Extend Other Tools

After `list_properties` works with real data, we can extend the other 16 tools following the same pattern to fetch real GSC analytics, sitemaps, and inspection data.
