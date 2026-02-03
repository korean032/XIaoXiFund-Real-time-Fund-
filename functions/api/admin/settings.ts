import { createDB, corsHeaders } from '../../lib/db';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

// GET: Fetch Settings (Registration Allowed?)
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { env } = context;
        const db = createDB(env);
        const val = await db.get('config:registration_enabled');
        return new Response(JSON.stringify({ registration_enabled: val === 'true' }), { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

// POST: Update Settings (Requires Admin Auth)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const body = await request.json() as any;
    
    // Validate Admin (Need to send Env User/Pass or Token?)
    // For simplicity with the existing `App.tsx` admin flow, we might send the password or username/password in headers/body.
    // Or we rely on the client knowing the password.
    // Let's implement a check against Env PASSWORD here to be safe, since this is an Admin-only action.
    
    // We'll check `x-admin-password` header or body `adminPassword`
    let adminPass = request.headers.get('x-admin-password');
    if (!adminPass && body.adminPassword) adminPass = body.adminPassword;

    if (adminPass !== env.PASSWORD) {
         return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const db = createDB(env);
    
    if (typeof body.registration_enabled !== 'undefined') {
        const val = String(body.registration_enabled);
        await db.put('config:registration_enabled', val);
        return new Response(JSON.stringify({ success: true, registration_enabled: val === 'true' }), { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    return new Response(JSON.stringify({ error: 'No settings provided' }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};
