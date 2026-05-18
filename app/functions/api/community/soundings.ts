import { verifySession, getTokenFromRequest, json, type Env } from '../auth/_shared';

interface SoundingRecord {
  id: string;
  vesselId: string;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  accuracy?: number;
  source: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await verifySession(context.env, getTokenFromRequest(context.request));
  if (!session) return json({ error: 'Unauthorized' }, 401);

  let body: { soundings: SoundingRecord[] };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!Array.isArray(body.soundings) || body.soundings.length === 0) {
    return json({ error: 'soundings array required' }, 400);
  }

  if (body.soundings.length > 500) {
    return json({ error: 'Maximum 500 soundings per batch' }, 400);
  }

  const now = new Date().toISOString();
  const stmt = context.env.DB.prepare(
    `INSERT INTO community_soundings (id, account_id, vessel_id, latitude, longitude, depth, accuracy, source, recorded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const batch = body.soundings.map((s) =>
    stmt.bind(
      crypto.randomUUID(),
      session.accountId,
      s.vesselId,
      s.latitude,
      s.longitude,
      s.depth,
      s.accuracy ?? null,
      s.source,
      s.timestamp,
      now,
    ),
  );

  await context.env.DB.batch(batch);

  return json({ accepted: body.soundings.length, receivedAt: now });
};
