/// <reference path="../types.d.ts" />

interface RequestBody {
  assets: any[]; // We store the whole array
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env } = context;
    // Get data from KV
    // Default key is 'user_default' since we don't have auth yet.
    // In a real app, this would use a user ID from session.
    const data = await env.FUND_DATA.get('user_default');
    
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
    const body = await request.json() as RequestBody;
    
    if (!body.assets || !Array.isArray(body.assets)) {
      return new Response(JSON.stringify({ error: 'Invalid assets data' }), { status: 400 });
    }

    // Save to KV
    await env.FUND_DATA.put('user_default', JSON.stringify(body.assets));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
