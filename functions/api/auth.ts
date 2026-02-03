/// <reference path="../types.d.ts" />

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { password } = await request.json() as { password?: string };

    // Valid if password matches env.PASSWORD, or if no password set (dev mode - careful!)
    // For security, if PASSWORD is not set, we might default to allow or deny. 
    // Let's assume 'admin' as default if not set for safety in this demo, or just deny.
    // Making it flexible: if env.PASSWORD is set, check it. If not, maybe use a default or open.
    // Better: If not set, deny or require setup.
    
    const configuredPass = env.PASSWORD;
    
    if (!configuredPass) {
        return new Response(JSON.stringify({ success: false, error: 'Server password not configured' }), { status: 500 });
    }

    if (password === configuredPass) {
        return new Response(JSON.stringify({ 
            success: true, 
            token: 'session_valid',
            username: env.USERNAME || 'admin' // Return configured username for sync
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), { status: 401 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
