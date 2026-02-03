import React, { useState } from 'react';
import { Lock, User, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
    onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await res.json();
            
            if (result.success) {
                setSuccess(true);
                // Save auth state
                localStorage.setItem('xiaoxi_admin_token', result.token);
                // Sync Identity
                if (result.username) {
                    localStorage.setItem('xiaoxi_uid', result.username);
                    localStorage.setItem('xiaoxi_sync_id', result.username);
                }
                
                setTimeout(() => {
                    onLoginSuccess();
                }, 800);
            } else {
                setError(result.error || 'Login failed');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Network connection error');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                 <div className="absolute -top-[20%] -right-[20%] w-[70vw] h-[70vw] rounded-full bg-blue-500/10 blur-[100px] animate-blob"></div>
                 <div className="absolute -bottom-[20%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-indigo-500/10 blur-[100px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative w-full max-w-md p-6 animate-fade-in-up">
                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/10 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 mx-auto bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                            <Lock size={32} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2 tracking-tight">Admin Portal</h2>
                        <p className="text-slate-500 dark:text-slate-400">Please authenticate to continue</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <User size={20} />
                                </div>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400/80"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input 
                                    type="password" 
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400/80"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-medium animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading || success}
                            className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all transform shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4 
                                ${success ? 'bg-emerald-500 scale-[1.02]' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98]'}`}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : success ? (
                                <>
                                    <Check size={24} strokeWidth={3} />
                                    Access Granted
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="text-center mt-8">
                    <a href="/" className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        ← Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
