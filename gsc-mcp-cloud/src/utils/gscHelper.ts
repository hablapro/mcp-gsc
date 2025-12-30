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

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0;
  return ((after - before) / before) * 100;
}

/**
 * Format a number with sign prefix
 */
export function formatChange(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for analysis
 */
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * Calculate expected CTR based on position (rough estimates)
 */
export function getExpectedCTR(position: number): number {
  if (position <= 1) return 0.30;
  if (position <= 2) return 0.15;
  if (position <= 3) return 0.10;
  if (position <= 4) return 0.07;
  if (position <= 5) return 0.05;
  if (position <= 6) return 0.04;
  if (position <= 7) return 0.03;
  if (position <= 8) return 0.025;
  if (position <= 9) return 0.02;
  if (position <= 10) return 0.015;
  if (position <= 20) return 0.01;
  return 0.005;
}
