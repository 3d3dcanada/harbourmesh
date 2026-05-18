interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as { email?: string; category?: string; message?: string; page?: string };

    if (!body.message || body.message.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Message is required (min 5 chars)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    const userAgent = request.headers.get('User-Agent') ?? '';
    const category = body.category ?? 'bug';
    const message = body.message.trim().slice(0, 5000);
    const email = body.email?.trim().slice(0, 200) ?? '';
    const page = body.page?.slice(0, 200) ?? '';
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO feedback (id, user_email, user_agent, category, message, page, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, email, userAgent, category, message, page, createdAt).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB.prepare(
    'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100'
  ).all();

  return new Response(JSON.stringify({ feedback: result.results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
