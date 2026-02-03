import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Loader2, AlertCircle, LogIn, UserPlus } from 'lucide-react';

interface LoginPageProps {
    onLoginSuccess: (username: string, role: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [canRegister, setCanRegister] = useState(false);
    const [checkingSettings, setCheckingSettings] = useState(true);

    // Check if registration is enabled
    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                setCanRegister(!!data.registration_enabled);
            })
            .catch(() => console.error('Failed to check config'))
            .finally(() => setCheckingSettings(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                // Determine role
                const role = data.role || 'user';
                // If registering, maybe we auto-login or ask to login?
                // The API implementation of register returns { success: true, username }. 
                // Let's assume we can treat it as distinct steps or auto-login.
                // Standard flow: Register -> "Success, please login" OR Auto-login.
                // Our simple API just created it. Let's auto-switch to Login or just invoke success if we trust it.
                // Better UX: If register success, automatically log them in or call success.
                // However, our Register API didn't return a token/role explicitly (check register.ts).
                // It returned { success: true, username }.
                // Our Login API returns { token, role, username }.
                
                if (mode === 'register') {
                    // Quick Auto Login after register (or just prompt)
                    setMode('login');
                    setError('Registration successful! Please sign in.');
                    setPassword(''); // clear password for safety forcing retype or just convenience
                    setIsLoading(false);
                } else {
                    // Login Success
                    onLoginSuccess(data.username, role);
                }
            } else {
                setError(data.error || 'Authentication failed');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Network error');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[100px] animate-blob"></div>
                 <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative w-full max-w-md p-6 animate-fade-in-up">
                <div className="glass-panel p-8 rounded-[2rem] shadow-2xl border border-white/60 dark:border-white/10">
                    
                    {/* Header Logo */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 text-white">
                            <LogIn size={32} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage your funds in real-time</p>
                    </div>

                    {/* Tabs */}
                    {canRegister && (
                        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl mb-6 relative">
                            <button 
                                onClick={() => { setMode('login'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${mode === 'login' ? 'text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
                            >
                                <LogIn size={16} /> Login
                            </button>
                            <button 
                                onClick={() => { setMode('register'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${mode === 'register' ? 'text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
                            >
                                <UserPlus size={16} /> Register
                            </button>
                            
                            {/* Sliding Background */}
                            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700/80 rounded-lg shadow transition-all duration-300 ${mode === 'login' ? 'left-1.5' : 'left-[calc(50%+1.5px)]'}`}></div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value.toLowerCase())}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-shake">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {!canRegister && !checkingSettings && mode === 'login' && (
                    <p className="text-center text-xs text-slate-400 mt-6">
                        Registration is currently disabled by administrator.
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
