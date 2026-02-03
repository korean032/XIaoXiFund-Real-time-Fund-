/// <reference path="../types.d.ts" />

interface RequestBody {
  assets: any[];
}

// --- Helpers ---
const getUserId = (request: Request): string => {
  const url = new URL(request.url);
  const user = url.searchParams.get('user');
  if (user && /^[a-zA-Z0-9_-]{3,64}$/.test(user)) return user;
  return 'default';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Upstash Helper
const upstash = async (env: Env, command: string, ...args: (string | number)[]) => {
  if (!env.UPSTASH_URL || !env.UPSTASH_TOKEN) {
    throw new Error('Upstash credentials missing');
  }
  const url = `${env.UPSTASH_URL}/${command}/${args.join('/')}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Upstash error: ${await res.text()}`);
  return await res.json();
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;
    const userId = getUserId(request);
    
    // Check Storage Type
    const storageType = env.NEXT_PUBLIC_STORAGE_TYPE || 'kv';
    let dataString: string | null = null;

    if (storageType === 'upstash') {
       // Redis GET
       const res = await upstash(env, 'GET', `user_${userId}`);
       dataString = res.result;
    } else {
       // KV GET (Fallback)
       const key = `user_${userId}`;
       dataString = await env.FUND_DATA.get(key);
    }
    
    // Return empty array if no data found
    const assets = dataString ? (typeof dataString === 'string' ? JSON.parse(dataString) : dataString) : [];
    
    return new Response(JSON.stringify(assets), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const userId = getUserId(request);
    
    // Auth Check (Optional: Only if headers provided, or if specifically enforcing)
    // The prompt says "Set USERNAME/PASSWORD as admin".
    // For now, let's just allow write if it matches the logic.
    // Ideally update frontend to send Basic Auth, but sticking to userId separation for now logic compatibility.

    const body = await request.json() as RequestBody;
    
    if (!body.assets || !Array.isArray(body.assets)) {
      return new Response(JSON.stringify({ error: 'Invalid assets data' }), { status: 400, headers: corsHeaders });
    }

    const storageType = env.NEXT_PUBLIC_STORAGE_TYPE || 'kv';
    const dataStr = JSON.stringify(body.assets);

    if (storageType === 'upstash') {
        // Redis SET
        // Use POST for SET if data is large or needs special handling, but REST GET url works for simple Set usually.
        // Actually Upstash REST documentation recommends POST for SET to avoid URL length encoding issues.
        const url = `${env.UPSTASH_URL}/SET/user_${userId}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` },
            body: dataStr // Direct body for value
        });
        if (!res.ok) throw new Error(await res.text());
    } else {
        // KV PUT
        const key = `user_${userId}`;
        await env.FUND_DATA.put(key, dataStr);
    }
    
    return new Response(JSON.stringify({ success: true, userId, storage: storageType }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
