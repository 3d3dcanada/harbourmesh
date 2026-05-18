import { type Env, type StoredUser, hashPassword, createSessionToken, json } from './_shared';

interface LoginBody {
  email: string;
  password: string;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; firstAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const clientIP = context.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(clientIP)) {
    return json({ ok: false, error: 'Too many login attempts. Try again later.' }, 429);
  }

  let body: LoginBody;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return json({ ok: false, error: 'Email and password are required' }, 400);
  }

  const emailNormalized = email.toLowerCase();

  const user = await env.DB.prepare('SELECT * FROM users WHERE email_normalized = ?')
    .bind(emailNormalized)
    .first() as StoredUser | null;

  if (!user || user.status !== 'active' || !user.password_hash || !user.password_salt) {
    return json({ ok: false, error: 'Invalid email or password' }, 401);
  }

  const { hash } = await hashPassword(password, user.password_salt);

  if (hash.length !== user.password_hash.length) {
    return json({ ok: false, error: 'Invalid email or password' }, 401);
  }

  let mismatch = 0;
  for (let i = 0; i < hash.length; i++) {
    mismatch |= hash.charCodeAt(i) ^ user.password_hash.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return json({ ok: false, error: 'Invalid email or password' }, 401);
  }

  const session = await createSessionToken(env, user);
  if (!session) return json({ ok: false, error: 'Session creation failed' }, 500);

  return json({ ok: true, session });
};
