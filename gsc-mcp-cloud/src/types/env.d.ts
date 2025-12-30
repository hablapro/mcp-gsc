interface Env {
  // KV Namespace
  OAUTH_KV: KVNamespace;

  // Secrets
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // Variables
  GOOGLE_REDIRECT_URI: string;
  DEBUG: string;
}
