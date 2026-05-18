import { type Env, hashPassword, createSessionToken, generateId, json } from './_shared';

interface RegisterBody {
  email: string;
  displayName: string;
  password: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env } = context;

  let body: RegisterBody;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const email = body.email?.trim();
  const displayName = body.displayName?.trim();
  const password = body.password;

  if (!email || !displayName || !password) {
    return json({ ok: false, error: 'Email, display name, and password are required' }, 400);
  }
  if (password.length < 12) {
    return json({ ok: false, error: 'Password must be at least 12 characters' }, 400);
  }

  const emailNormalized = email.toLowerCase();

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email_normalized = ?')
    .bind(emailNormalized)
    .first();

  if (existing) {
    return json({ ok: false, error: 'An account with this email already exists' }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const now = new Date().toISOString();
  const id = generateId();

  await env.DB.prepare(
    `INSERT INTO users (id, email, email_normalized, display_name, roles, status, password_hash, password_salt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, emailNormalized, displayName, '["user"]', 'active', hash, salt, now, now)
    .run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!user) return json({ ok: false, error: 'Account creation failed' }, 500);

  const session = await createSessionToken(env, user as any);
  if (!session) return json({ ok: false, error: 'Session creation failed' }, 500);

  return json({ ok: true, session });
};
