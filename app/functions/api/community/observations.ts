import { verifySession, getTokenFromRequest, json, type Env } from '../auth/_shared';

interface ObservationRecord {
  id: string;
  vesselId: string;
  latitude: number;
  longitude: number;
  type: string;
  value: string;
  timestamp: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await verifySession(context.env, getTokenFromRequest(context.request));
  if (!session) return json({ error: 'Unauthorized' }, 401);

  let body: { observations: ObservationRecord[] };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!Array.isArray(body.observations) || body.observations.length === 0) {
    return json({ error: 'observations array required' }, 400);
  }

  if (body.observations.length > 200) {
    return json({ error: 'Maximum 200 observations per batch' }, 400);
  }

  const now = new Date().toISOString();
  const stmt = context.env.DB.prepare(
    `INSERT INTO community_observations (id, account_id, vessel_id, latitude, longitude, type, value, recorded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const batch = body.observations.map((o) =>
    stmt.bind(
      crypto.randomUUID(),
      session.accountId,
      o.vesselId,
      o.latitude,
      o.longitude,
      o.type,
      o.value,
      o.timestamp,
      now,
    ),
  );

  await context.env.DB.batch(batch);

  return json({ accepted: body.observations.length, receivedAt: now });
};
