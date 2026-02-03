/// <reference path="../types.d.ts" />

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  const storageType = env.NEXT_PUBLIC_STORAGE_TYPE || 'kv'; // Default to kv
  const upstashConfigured = !!(env.UPSTASH_URL && env.UPSTASH_TOKEN);
  const kvConfigured = !!env.FUND_DATA; // Check if KV binding exists

  return new Response(JSON.stringify({
    mode: storageType,
    upstash: upstashConfigured,
    kv: kvConfigured
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
