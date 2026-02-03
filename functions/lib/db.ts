/// <reference path="../../types.d.ts" />

export interface IDB {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
}

export const createDB = (env: Env): IDB => {
  const storageType = env.NEXT_PUBLIC_STORAGE_TYPE || 'kv';

  if (storageType === 'upstash') {
    if (!env.UPSTASH_URL || !env.UPSTASH_TOKEN) {
      throw new Error('Upstash credentials missing');
    }
    const baseUrl = env.UPSTASH_URL;
    const token = env.UPSTASH_TOKEN;

    return {
      async get(key: string) {
        const res = await fetch(`${baseUrl}/GET/${key}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        // Upstash REST returns { result: "..." } where result is the string value
        // If we stored a JSON string, we likely need to parse it? 
        // Or if the caller expects the raw string/object?
        // Let's return the raw 'result' and let caller handle parsing if needed, 
        // OR standardise on JSON behavior.
        // For consistency with KV (which stores strings), let's return the result.
        // If result is null, return null.
        return json.result;
      },
      async put(key: string, value: any) {
         // Use SET command. Value should be stringified if it's an object?
         // Redis stores strings.
         const valStr = typeof value === 'string' ? value : JSON.stringify(value);
         const res = await fetch(`${baseUrl}/SET/${key}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: valStr
         });
         if (!res.ok) throw new Error(await res.text());
      },
      async del(key: string) {
         await fetch(`${baseUrl}/DEL/${key}`, {
            headers: { Authorization: `Bearer ${token}` }
         });
      }
    };
  } else {
    // Cloudflare KV
    return {
      async get(key: string) {
        return await env.FUND_DATA.get(key);
      },
      async put(key: string, value: any) {
        const valStr = typeof value === 'string' ? value : JSON.stringify(value);
        await env.FUND_DATA.put(key, valStr);
      },
      async del(key: string) {
        await env.FUND_DATA.delete(key);
      }
    };
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
