/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  SESSION_SIGNING_KEY: string;
  SESSION_SIGNING_KEY_ID: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
