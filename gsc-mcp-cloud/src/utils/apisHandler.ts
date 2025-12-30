import { Hono } from "hono";
import { cache } from "hono/cache";
import { SSEStdioHandler } from "../sseStdioHandler";
import { GoogleSearchConsoleClient } from "./googleClient";
import { TokenManager } from "./tokenManager";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use("*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
});

// Error handling middleware - centralized error logging and response
app.use("*", async (c, next) => {
  const startTime = Date.now();

  try {
    await next();
  } catch (err) {
    const error = err as Error;
    const duration = Date.now() - startTime;

    // Log error details
    console.error(`[ERROR] ${c.req.method} ${c.req.path} - ${duration}ms`, {
      error: error.message,
      stack: error.stack,
      url: c.req.url,
      timestamp: new Date().toISOString()
    });

    // Return structured error response
    return c.json({
      error: {
        message: error.message || "An unexpected error occurred",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString()
      }
    }, 500);
  }

  // Log successful requests in debug mode
  if (c.env?.DEBUG === "true") {
    const duration = Date.now() - startTime;
    console.log(`[${c.req.method}] ${c.req.path} - ${c.res.status} - ${duration}ms`);
  }
});

// Handle OPTIONS requests
app.options("*", (c) => {
  return c.text("", 204);
});

// Main MCP endpoint with SSE
app.all("/mcp-sse", async (c) => {
  const handler = new SSEStdioHandler(c.env);
  // Clone the request to avoid body consumption issues
  const clonedRequest = c.req.raw.clone();
  return await handler.handleSSE(clonedRequest);
});

// Direct MCP endpoint (same as SSE for compatibility)
app.all("/mcp-direct", async (c) => {
  const handler = new SSEStdioHandler(c.env);
  const clonedRequest = c.req.raw.clone();
  return await handler.handleSSE(clonedRequest);
});

// SSE endpoint (alias)
app.all("/sse", async (c) => {
  const handler = new SSEStdioHandler(c.env);
  const clonedRequest = c.req.raw.clone();
  return await handler.handleSSE(clonedRequest);
});

// OAuth authentication endpoint
app.get("/auth", async (c) => {
  const env = c.env;

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return c.html(`
      <h1>OAuth Not Configured</h1>
      <p>Please configure Google OAuth credentials:</p>
      <ol>
        <li>echo 'your-client-id' | npx wrangler secret put GOOGLE_CLIENT_ID</li>
        <li>echo 'your-client-secret' | npx wrangler secret put GOOGLE_CLIENT_SECRET</li>
      </ol>
    `);
  }

  const client = new GoogleSearchConsoleClient(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const state = Math.random().toString(36).substring(7);
  const tokenManager = new TokenManager(env.OAUTH_KV);
  await tokenManager.storeOAuthState(state, { timestamp: Date.now() });

  const authUrl = client.getAuthUrl(state);
  return c.redirect(authUrl);
});

// OAuth callback endpoint
app.get("/auth-callback", async (c) => {
  const env = c.env;
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.html(`
      <h1>Authentication Failed</h1>
      <p>Error: ${error}</p>
      <a href="/auth">Try again</a>
    `);
  }

  if (!code || !state) {
    return c.html(`
      <h1>Invalid Request</h1>
      <p>Missing authorization code or state</p>
      <a href="/auth">Try again</a>
    `);
  }

  try {
    const tokenManager = new TokenManager(env.OAUTH_KV);
    const stateData = await tokenManager.consumeOAuthState(state);

    if (!stateData) {
      return c.html(`
        <h1>Invalid State</h1>
        <p>State parameter is invalid or expired</p>
        <a href="/auth">Try again</a>
      `);
    }

    const client = new GoogleSearchConsoleClient(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    const tokens = await client.getTokensFromCode(code);
    await tokenManager.storeTokens('default_user', tokens);

    return c.html(`
      <h1>✅ Authentication Successful!</h1>
      <p>You have successfully authenticated with Google Search Console.</p>
      <p>You can now use the MCP tools to access your GSC data.</p>
      <a href="/">Return to home</a>
    `);
  } catch (error: any) {
    return c.html(`
      <h1>Authentication Error</h1>
      <p>Failed to exchange code for tokens: ${error.message}</p>
      <a href="/auth">Try again</a>
    `);
  }
});

// Health check endpoint with caching (5 minute cache)
app.get(
  "/health",
  cache({
    cacheName: "gsc-health-cache",
    cacheControl: "max-age=300"
  }),
  (c) => {
    return c.json({
      status: "healthy",
      service: "gsc-mcp-cloud",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    });
  }
);

// Root endpoint - Landing page
app.get("/", (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Search Console MCP Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        h2 {
            color: #764ba2;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 1.8em;
        }
        p {
            margin-bottom: 15px;
            color: #555;
        }
        .endpoint {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }
        .badge {
            display: inline-block;
            padding: 5px 12px;
            background: #667eea;
            color: white;
            border-radius: 20px;
            font-size: 0.85em;
            margin-right: 10px;
        }
        ul {
            margin-left: 20px;
            margin-bottom: 20px;
        }
        li {
            margin-bottom: 10px;
            color: #555;
        }
        .highlight {
            background: #fff3cd;
            padding: 20px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            border-radius: 4px;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Google Search Console MCP Server</h1>
        <p>Welcome to the Cloud-based Model Context Protocol (MCP) server for Google Search Console data.</p>

        <div class="highlight">
            <strong>🚀 Status:</strong> Server is running and ready to accept connections!
        </div>

        <h2>📡 Available Endpoints</h2>

        <p><span class="badge">MCP</span> <strong>Main SSE Endpoint</strong></p>
        <div class="endpoint">${c.req.url}mcp-sse</div>

        <p><span class="badge">MCP</span> <strong>Direct MCP Endpoint</strong></p>
        <div class="endpoint">${c.req.url}mcp-direct</div>

        <p><span class="badge">MCP</span> <strong>SSE Streaming Endpoint</strong></p>
        <div class="endpoint">${c.req.url}sse/</div>

        <h2>🛠️ Available Tools</h2>
        <ul>
            <li><code>search</code> - Search for relevant GSC documents and reports</li>
            <li><code>fetch</code> - Retrieve complete document content by ID</li>
        </ul>

        <h2>📚 Integration Instructions</h2>
        <p>To use this MCP server with ChatGPT or via API:</p>
        <ul>
            <li>Use the <code>/sse/</code> endpoint for server-sent events streaming</li>
            <li>Configure with <code>require_approval: "never"</code> for API usage</li>
            <li>No authentication required for this demo server</li>
        </ul>

        <h2>🔗 Quick Links</h2>
        <ul>
            <li><a href="/health">Health Check</a></li>
            <li><a href="https://platform.openai.com/docs/mcp" target="_blank">OpenAI MCP Documentation</a></li>
            <li><a href="https://modelcontextprotocol.io/" target="_blank">MCP Protocol Spec</a></li>
        </ul>

        <div class="highlight">
            <strong>⚠️ Note:</strong> This is a demonstration server with mock data.
            In production, connect to the actual Google Search Console API with proper authentication.
        </div>
    </div>
</body>
</html>
  `);
});

export default {
  fetch: app.fetch.bind(app)
};
