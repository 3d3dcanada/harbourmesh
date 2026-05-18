export interface Env {
  DB: D1Database;
  SESSION_SIGNING_KEY: string;
  SESSION_SIGNING_KEY_ID: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export type AccountRole = 'user' | 'operator' | 'admin';

export interface StoredUser {
  id: string;
  email: string;
  email_normalized: string;
  display_name: string;
  roles: string;
  status: string;
  password_hash: string | null;
  password_salt: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicAccount {
  id: string;
  email: string;
  displayName: string;
  roles: AccountRole[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPayload {
  schemaVersion: 'harbourmesh.account-session.v1';
  accountId: string;
  email: string;
  roles: AccountRole[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
}

const SESSION_PREFIX = 'hm_user_session_v1';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function toPublicAccount(user: StoredUser): PublicAccount {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    roles: JSON.parse(user.roles) as AccountRole[],
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function hexEncode(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string | null {
  try {
    const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
    const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  // 10K iterations fits within Workers free-plan 10ms CPU limit
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );

  return { hash: hexEncode(derived), salt: hexEncode(salt.buffer) };
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(env: Env, user: StoredUser): Promise<{
  accessToken: string;
  tokenType: 'Bearer';
  account: PublicAccount;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
} | null> {
  if (!env.SESSION_SIGNING_KEY || user.status !== 'active') return null;

  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const keyId = env.SESSION_SIGNING_KEY_ID || 'harbourmesh-auth-v1';

  const payload: SessionPayload = {
    schemaVersion: 'harbourmesh.account-session.v1',
    accountId: user.id,
    email: user.email_normalized,
    roles: JSON.parse(user.roles) as AccountRole[],
    issuedAt,
    expiresAt,
    keyId,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${SESSION_PREFIX}.${encoded}`;
  const signature = await hmacSign(unsigned, env.SESSION_SIGNING_KEY);

  return {
    accessToken: `${unsigned}.${signature}`,
    tokenType: 'Bearer',
    account: toPublicAccount(user),
    issuedAt,
    expiresAt,
    keyId,
  };
}

export async function verifySession(env: Env, token: string | undefined): Promise<SessionPayload | null> {
  if (!env.SESSION_SIGNING_KEY || !token?.startsWith(`${SESSION_PREFIX}.`)) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [prefix, encoded, signature] = parts;
  if (prefix !== SESSION_PREFIX || !encoded || !signature) return null;

  const unsigned = `${prefix}.${encoded}`;
  const valid = await hmacVerify(unsigned, signature, env.SESSION_SIGNING_KEY);
  if (!valid) return null;

  const decoded = base64UrlDecode(encoded);
  if (!decoded) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (payload.schemaVersion !== 'harbourmesh.account-session.v1') return null;
  if (Date.parse(payload.expiresAt) <= Date.now()) return null;
  return payload;
}

export function getTokenFromRequest(request: Request): string | undefined {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const session = request.headers.get('X-HarbourMesh-Account-Session');
  if (session) return session;
  return undefined;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `acct_${hexEncode(bytes.buffer)}`;
}
