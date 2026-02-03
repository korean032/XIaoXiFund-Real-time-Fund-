/// <reference path="../types.d.ts" />

interface RequestBody {
  assets: any[]; // We store the whole array
}

// --- Helpers ---
const getUserId = (request: Request): string => {
  const url = new URL(request.url);
  const user = url.searchParams.get('user');
  if (user && /^[a-zA-Z0-9_-]{3,64}$/.test(user)) return user;
  return 'default'; // Fallback
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;
    const userId = getUserId(request);
    const key = `user_${userId}`;
    
    // Get data from KV
    const data = await env.FUND_DATA.get(key);
    
    // Return empty array if no data found
    const assets = data ? JSON.parse(data) : [];
    
    return new Response(JSON.stringify(assets), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const userId = getUserId(request);
    const key = `user_${userId}`;

    const body = await request.json() as RequestBody;
    
    if (!body.assets || !Array.isArray(body.assets)) {
      return new Response(JSON.stringify({ error: 'Invalid assets data' }), { status: 400 });
    }

    // Save to KV
    await env.FUND_DATA.put(key, JSON.stringify(body.assets));
    
    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
