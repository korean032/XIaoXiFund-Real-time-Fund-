import { createDB, corsHeaders } from '../../lib/db';

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const db = createDB(env);
    
    // 1. Check if Registration is Allowed
    const configStr = await db.get('config:registration_enabled');
    const isRegistrationEnabled = configStr === 'true';

    // Super Admin can always register? No, maybe just stick to the setting.
    if (!isRegistrationEnabled) {
        return new Response(JSON.stringify({ error: 'Registration is currently disabled' }), { status: 403, headers: corsHeaders });
    }

    const { username, password } = await request.json() as any;

    if (!username || !password || username.length < 3) {
        return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 400, headers: corsHeaders });
    }

    const normalizedUsername = username.toLowerCase();

    // 2. Check if user exists
    // We store user meta in `users:{username}`
    const existingUser = await db.get(`users:${normalizedUsername}`);
    if (existingUser) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 409, headers: corsHeaders });
    }

    // 3. Create User
    // Simple logic: Store password (should be hashed in real app, strictly speaking, 
    // but for this scope we'll store as is or simple-hash if widely supported libs available. 
    // Given the constraints and environment, let's just store it. 
    // NOTE: In production, ALWAYS hash passwords. 
    // We will assume "Security Note: Password Hashing" from plan is followed if feasible, 
    // but without importing heavy crypto libs, we'll store plaintext for this specific constrained demo request or simple base64/md5 via WebCrypto if easy.)
    // Let's use Web Crypto API for SHA-256 for basic decency.
    
    // Helper to hash
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const newUser = {
        username: normalizedUsername, // Store normalized
        display_name: username, // Optional: store original casing for display
        passwordHash,
        createdAt: new Date().toISOString(),
        role: 'user'
    };

    await db.put(`users:${normalizedUsername}`, newUser);

    return new Response(JSON.stringify({ success: true, username }), {
       headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};
