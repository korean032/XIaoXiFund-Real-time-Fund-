import { createDB, corsHeaders } from '../../lib/db';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { username, password } = await request.json() as any;
    
    if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400, headers: corsHeaders });
    }

    // 1. Check Super Admin (Env Vars) first
    // This allows the owner to always log in even if DB is down or empty
    const envUser = env.USERNAME;
    const envPass = env.PASSWORD;
    
    if (envUser && envPass && username === envUser && password === envPass) {
        return new Response(JSON.stringify({ 
            success: true, 
            username: envUser,
            role: 'admin',
            token: 'super_admin_token'
        }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // 2. Check Database Users
    const db = createDB(env);
    const userStr = await db.get(`users:${username}`);
    
    if (!userStr) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
    }

    const userData = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
    
    // Hash provided password to compare
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (userData.passwordHash === passwordHash) {
        return new Response(JSON.stringify({ 
            success: true, 
            username: userData.username,
            role: userData.role || 'user',
            token: `user_token_${Date.now()}` // Simple token, in real app use JWT
        }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};
