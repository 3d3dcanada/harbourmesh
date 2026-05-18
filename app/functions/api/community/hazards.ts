import { verifySession, getTokenFromRequest, json, type Env } from '../auth/_shared';

interface HazardReport {
  id: string;
  vesselId: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const session = await verifySession(context.env, getTokenFromRequest(context.request));
  if (!session) return json({ error: 'Unauthorized' }, 401);

  let body: { hazards: HazardReport[] };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!Array.isArray(body.hazards) || body.hazards.length === 0) {
    return json({ error: 'hazards array required' }, 400);
  }

  if (body.hazards.length > 50) {
    return json({ error: 'Maximum 50 hazards per batch' }, 400);
  }

  const validSeverities = new Set(['low', 'medium', 'high', 'critical']);
  for (const h of body.hazards) {
    if (!validSeverities.has(h.severity)) {
      return json({ error: `Invalid severity: ${h.severity}` }, 400);
    }
  }

  const now = new Date().toISOString();
  const stmt = context.env.DB.prepare(
    `INSERT INTO community_hazards (id, account_id, vessel_id, latitude, longitude, type, severity, description, recorded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const batch = body.hazards.map((h) =>
    stmt.bind(
      crypto.randomUUID(),
      session.accountId,
      h.vesselId,
      h.latitude,
      h.longitude,
      h.type,
      h.severity,
      h.description,
      h.timestamp,
      now,
    ),
  );

  await context.env.DB.batch(batch);

  return json({ accepted: body.hazards.length, receivedAt: now });
};
