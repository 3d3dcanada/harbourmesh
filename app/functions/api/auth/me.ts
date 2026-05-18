import { type Env, type StoredUser, verifySession, getTokenFromRequest, json } from './_shared';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const token = getTokenFromRequest(context.request);
  const payload = await verifySession(env, token);

  if (!payload) {
    return json({ ok: false, error: 'Not authenticated' }, 401);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.accountId)
    .first() as StoredUser | null;

  if (!user || user.status !== 'active') {
    return json({ ok: false, error: 'Account not found' }, 401);
  }

  return json({
    ok: true,
    account: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles: JSON.parse(user.roles),
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
};
