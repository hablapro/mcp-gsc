import type { TokenData } from './googleClient';

export class TokenManager {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Store tokens for a user
   */
  async storeTokens(userId: string, tokens: TokenData): Promise<void> {
    const key = `gsc_token_${userId}`;
    await this.kv.put(key, JSON.stringify(tokens), {
      expirationTtl: 60 * 60 * 24 * 30 // 30 days
    });
  }

  /**
   * Retrieve tokens for a user
   */
  async getTokens(userId: string): Promise<TokenData | null> {
    const key = `gsc_token_${userId}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as TokenData;
  }

  /**
   * Delete tokens for a user
   */
  async deleteTokens(userId: string): Promise<void> {
    const key = `gsc_token_${userId}`;
    await this.kv.delete(key);
  }

  /**
   * Store OAuth state
   */
  async storeOAuthState(state: string, data: any): Promise<void> {
    const key = `oauth_state_${state}`;
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: 600 // 10 minutes
    });
  }

  /**
   * Get and delete OAuth state
   */
  async consumeOAuthState(state: string): Promise<any | null> {
    const key = `oauth_state_${state}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    await this.kv.delete(key);
    return JSON.parse(data);
  }
}
