import { google } from 'googleapis';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export class GoogleSearchConsoleClient {
  private oauth2Client: any;
  private searchconsole: any;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.searchconsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ],
      state: state || 'default',
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
  }

  /**
   * Set credentials from stored tokens
   */
  setCredentials(tokens: TokenData): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<TokenData> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || '',
      expiry_date: credentials.expiry_date
    };
  }

  /**
   * Check if token needs refresh
   */
  isTokenExpired(expiryDate: number): boolean {
    return Date.now() >= expiryDate - 300000; // 5 min buffer
  }

  /**
   * List all Search Console sites
   */
  async listSites(): Promise<any> {
    try {
      const response = await this.searchconsole.sites.list();
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list sites: ${error.message}`);
    }
  }

  /**
   * Get site details
   */
  async getSite(siteUrl: string): Promise<any> {
    try {
      const response = await this.searchconsole.sites.get({
        siteUrl: siteUrl
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get site: ${error.message}`);
    }
  }

  /**
   * Add a site
   */
  async addSite(siteUrl: string): Promise<any> {
    try {
      const response = await this.searchconsole.sites.add({
        siteUrl: siteUrl
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to add site: ${error.message}`);
    }
  }

  /**
   * Delete a site
   */
  async deleteSite(siteUrl: string): Promise<any> {
    try {
      await this.searchconsole.sites.delete({
        siteUrl: siteUrl
      });
      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to delete site: ${error.message}`);
    }
  }

  /**
   * Query search analytics
   */
  async querySearchAnalytics(siteUrl: string, requestBody: any): Promise<any> {
    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: requestBody
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to query analytics: ${error.message}`);
    }
  }

  /**
   * Inspect URL
   */
  async inspectUrl(siteUrl: string, inspectionUrl: string): Promise<any> {
    try {
      const response = await this.searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: inspectionUrl,
          siteUrl: siteUrl
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to inspect URL: ${error.message}`);
    }
  }

  /**
   * List sitemaps
   */
  async listSitemaps(siteUrl: string): Promise<any> {
    try {
      const response = await this.searchconsole.sitemaps.list({
        siteUrl: siteUrl
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list sitemaps: ${error.message}`);
    }
  }

  /**
   * Get sitemap details
   */
  async getSitemap(siteUrl: string, feedpath: string): Promise<any> {
    try {
      const response = await this.searchconsole.sitemaps.get({
        siteUrl: siteUrl,
        feedpath: feedpath
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get sitemap: ${error.message}`);
    }
  }

  /**
   * Submit a sitemap
   */
  async submitSitemap(siteUrl: string, feedpath: string): Promise<any> {
    try {
      await this.searchconsole.sitemaps.submit({
        siteUrl: siteUrl,
        feedpath: feedpath
      });
      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to submit sitemap: ${error.message}`);
    }
  }

  /**
   * Delete a sitemap
   */
  async deleteSitemap(siteUrl: string, feedpath: string): Promise<any> {
    try {
      await this.searchconsole.sitemaps.delete({
        siteUrl: siteUrl,
        feedpath: feedpath
      });
      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to delete sitemap: ${error.message}`);
    }
  }
}
