import { GoogleSearchConsoleClient } from './googleClient';
import { TokenManager } from './tokenManager';
import type { ToolParams } from '../tools/index';

export async function getAuthenticatedClient(params: ToolParams): Promise<GoogleSearchConsoleClient | { error: string }> {
  const { env } = params;

  // Check if OAuth is configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.OAUTH_KV) {
    return { error: '⚠️ Authentication not configured. Please set up OAuth credentials.' };
  }

  const tokenManager = new TokenManager(env.OAUTH_KV);
  const tokens = await tokenManager.getTokens('default_user');

  if (!tokens) {
    return { error: '⚠️ Not authenticated. Please visit /auth to authenticate with Google.\n\nAuthentication URL: https://gsc-mcp-cloud.principal-e85.workers.dev/auth' };
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

  return client;
}

export function formatSearchAnalyticsRow(row: any): string {
  const keys = row.keys || [];
  const clicks = row.clicks || 0;
  const impressions = row.impressions || 0;
  const ctr = row.ctr ? (row.ctr * 100).toFixed(2) + '%' : '0.00%';
  const position = row.position ? row.position.toFixed(1) : 'N/A';

  return `${keys.join(' | ')} | ${clicks} | ${impressions} | ${ctr} | ${position}`;
}
