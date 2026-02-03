/// <reference path="../types.d.ts" />

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const { username, password } = await request.json() as { username?: string, password?: string };

    const configuredPass = env.PASSWORD;
    const configuredUser = env.USERNAME;
    
    if (!configuredPass || !configuredUser) {
        return new Response(JSON.stringify({ success: false, error: 'Server credentials not configured' }), { status: 500 });
    }

    if (password === configuredPass && username === configuredUser) {
        return new Response(JSON.stringify({ 
            success: true, 
            token: 'session_valid',
            username: configuredUser 
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid username or password' }), { status: 401 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
