import React, { useState, useEffect, useMemo } from 'react';
import { Asset, DataSource } from '../types';
import { 
    LayoutDashboard, Database, Settings, Server, Activity, 
    Trash2, Search, Plus, AlertCircle, CheckCircle2, Clock, ScrollText,
    BarChart3, HardDrive, RefreshCw, X, ChevronRight, Zap, Target,
    PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, MoreHorizontal, Edit2
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

interface AdminDashboardProps {
    assets: Asset[];
    onDeleteAsset: (id: string) => void;
    onAddAsset: () => void;
    dataSource: DataSource;
    setDataSource: (ds: DataSource) => void;
    refreshInterval: number;
    setRefreshInterval: (ms: number) => void;
    isDarkMode: boolean;
    setIsDarkMode: (dark: boolean) => void;
    onResetAssets: () => void;
    logs: {time: string, type: 'info'|'warn'|'error', msg: string}[];
    onAddLog: (type: 'info'|'warn'|'error', msg: string) => void;
    onEditAsset: (asset: Asset) => void;
}

// --- Sub-Components ---

const StatCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
    <div className="relative overflow-hidden glass-card p-6 rounded-3xl border border-white/20 group hover:scale-[1.02] transition-all duration-300">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${color} opacity-10 group-hover:scale-150 transition-transform duration-500`} />
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100 backdrop-blur-md`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtext}</div>
            <div className="text-xs text-slate-400 mt-1">{title}</div>
        </div>
    </div>
);

const IconButton = ({ onClick, icon: Icon, className = "", danger = false }: any) => (
    <button 
        onClick={onClick}
        className={`p-2 rounded-xl transition-all duration-200 ${
            danger 
            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-500' 
            : 'text-slate-400 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200'
        } ${className}`}
    >
        <Icon size={18} />
    </button>
);

// --- Main Component ---

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    assets, 
    onDeleteAsset, 
    onAddAsset,
    dataSource,
    setDataSource,
    refreshInterval,
    setRefreshInterval,
    isDarkMode,
    setIsDarkMode,
    onResetAssets,
    logs,
    onAddLog,
    onEditAsset
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'service' | 'settings'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
    const [serviceLatency, setServiceLatency] = useState<number | null>(null);

    // Analytics Data
    const categoryData = useMemo(() => {
        const counts = { fund: 0, index: 0, stock: 0 };
        assets.forEach(a => {
            if (a.category in counts) counts[a.category as keyof typeof counts]++;
        });
        return [
            { name: '基金', value: counts.fund, color: '#3b82f6' },
            { name: '指数', value: counts.index, color: '#8b5cf6' },
            { name: '股票', value: counts.stock, color: '#f59e0b' }
        ].filter(d => d.value > 0);
    }, [assets]);

    // Batch Operations
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedAssets(new Set(assets.map(a => a.id)));
        } else {
            setSelectedAssets(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedAssets);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedAssets(newSet);
    };

    const handleBatchDelete = () => {
        if (confirm(`确定要删除选中的 ${selectedAssets.size} 个资产吗？`)) {
            selectedAssets.forEach(id => onDeleteAsset(id));
            setSelectedAssets(new Set());
            onAddLog?.('warn', `Batch deleted ${selectedAssets.size} assets`);
        }
    };

    const [storageInfo, setStorageInfo] = useState<{mode: string, upstash: boolean, kv: boolean} | null>(null);

    useEffect(() => {
        const checkHealth = async () => {
            const start = performance.now();
            try {
                // Check Status
                const statusRes = await fetch('/api/status');
                if (statusRes.ok) {
                    const data = await statusRes.json();
                    setStorageInfo(data);
                }

                // Simulate checking API latency
                // await new Promise(r => setTimeout(r, Math.random() * 50 + 20)); 
                const latency = Math.floor(performance.now() - start);
                setServiceLatency(latency);
                if (Math.random() > 0.98) onAddLog?.('info', `Health check passed: ${latency}ms`);
            } catch (e) {
                setServiceLatency(-1);
                onAddLog?.('error', 'Health check failed');
            }
        };
        checkHealth(); // Initial check
        const timer = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Registration Settings
    const [regEnabled, setRegEnabled] = useState(false);
    const [isTogglingReg, setIsTogglingReg] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings').then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to fetch settings');
        }).then((data: any) => {
            setRegEnabled(data.registration_enabled);
        }).catch(err => {
            console.error(err);
        });
    }, []);

    const toggleRegistration = async () => {
        setIsTogglingReg(true);
        try {
            const newVal = !regEnabled;
            const token = localStorage.getItem('xiaoxi_token');
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ registration_enabled: newVal })
            });
            if (res.ok) {
                setRegEnabled(newVal);
                onAddLog?.('info', `Registration ${newVal ? 'enabled' : 'disabled'}`);
            } else {
                onAddLog?.('error', 'Failed to update settings');
            }
        } catch (error) {
            onAddLog?.('error', 'Network error updating settings');
        } finally {
            setIsTogglingReg(false);
        }
    };

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.code.includes(searchTerm)
    );

    return (
        <div className="flex h-full w-full max-w-[90vw] mx-auto glass-panel rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-2xl transition-all duration-500">
            {/* Sidebar Navigation */}
            <div className="w-20 lg:w-72 bg-white/10 dark:bg-black/10 border-r border-white/10 flex flex-col p-4 backdrop-blur-md transition-all duration-300">
                <div className="flex items-center gap-4 px-2 py-6 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <LayoutDashboard size={24} />
                    </div>
                    <div className="hidden lg:block overflow-hidden">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white whitespace-nowrap">Admin One</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">v2.0 Liquid Glass</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'overview', icon: PieChartIcon, label: '仪表盘' },
                        { id: 'assets', icon: Database, label: '资产管理' },
                        { id: 'service', icon: Server, label: '系统状态' },
                        { id: 'settings', icon: Settings, label: '设置' },
                    ].map(item => (
                        <button 
                            key={item.id}
                            //@ts-ignore
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                                activeTab === item.id 
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white/10 dark:hover:bg-white/5'
                            }`}
                        >
                            <item.icon size={22} className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="hidden lg:block">{item.label}</span>
                            {activeTab === item.id && <div className="ml-auto hidden lg:block w-1.5 h-1.5 rounded-full bg-white/50" />}
                        </button>
                    ))}
                </nav>

                <div className="p-4 rounded-2xl bg-slate-900/5 dark:bg-white/5 mt-auto hidden lg:block">
                     <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${serviceLatency && serviceLatency > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold text-slate-500">API Status</span>
                     </div>
                     <div className="text-xs font-mono text-slate-400 truncate">
                        Latency: {serviceLatency}ms
                     </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-black/50 p-6 lg:p-10">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-10 animate-fade-in">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">
                            {activeTab === 'overview' && '仪表盘'}
                            {activeTab === 'assets' && '资产管理'}
                            {activeTab === 'service' && '系统状态'}
                            {activeTab === 'settings' && '设置'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">欢迎回来，今日市场行情波动较大。</p>
                    </div>
                </header>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard 
                                title="总监控资产" 
                                value={assets.length} 
                                subtext="个活跃资产" 
                                icon={Target} 
                                color="bg-blue-500" 
                            />
                            <StatCard 
                                title="系统响应" 
                                value={`${serviceLatency || '--'}ms`} 
                                subtext="API 低延迟" 
                                icon={Zap} 
                                color="bg-amber-500" 
                            />
                            <StatCard 
                                title="存储引擎" 
                                value={storageInfo?.mode === 'upstash' ? 'Upstash Redis' : 'Cloudflare KV'} 
                                subtext={storageInfo?.mode === 'upstash' ? '高性能数据库' : '边缘存储'} 
                                icon={Database} 
                                color={storageInfo?.mode === 'upstash' ? 'bg-emerald-500' : 'bg-orange-500'} 
                            />
                            <StatCard 
                                title="最后更新" 
                                value={new Date().getHours() + ':' + String(new Date().getMinutes()).padStart(2, '0')} 
                                subtext="刚刚" 
                                icon={Clock} 
                                color="bg-purple-500" 
                            />
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Asset Distribution */}
                            <div className="lg:col-span-2 glass-card p-8 rounded-3xl border border-white/20">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">资产分布分析</h3>
                                <div className="h-64 w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)' }} 
                                            />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Logs (Mini) */}
                            <div className="glass-card p-6 rounded-3xl border border-white/20 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800 dark:text-white">实时日志</h3>
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/10 to-transparent z-10"/>
                                    <div className="overflow-y-auto h-full space-y-3 pr-2 scrollbar-thin">
                                        {logs.slice(0, 10).map((log, i) => (
                                            <div key={i} className="flex gap-3 text-xs">
                                                <span className="font-mono text-slate-400 opacity-70 w-12">{log.time.split(':')[2]}s</span>
                                                <span className={`font-bold ${
                                                    log.type === 'error' ? 'text-red-500' : 
                                                    log.type === 'warn' ? 'text-amber-500' : 
                                                    'text-blue-500'
                                                }`}>{log.type.toUpperCase()}</span>
                                                <span className="text-slate-600 dark:text-slate-300 truncate">{log.msg}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/10 to-transparent pointer-events-none"/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ASSETS TAB */}
                {activeTab === 'assets' && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Toolbar */}
                        <div className="flex flex-wrap gap-4 justify-between items-center bg-white/5 dark:bg-black/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="搜索资产名称或代码..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedAssets.size > 0 && (
                                    <button 
                                        onClick={handleBatchDelete}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all text-sm"
                                    >
                                        <Trash2 size={16} /> 删除 ({selectedAssets.size})
                                    </button>
                                )}
                                <button 
                                    onClick={onAddAsset} 
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all text-sm transform hover:scale-105"
                                >
                                    <Plus size={18} /> 添加资产
                                </button>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="glass-card rounded-3xl border border-white/20 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/50 dark:bg-white/5 h-12 border-b border-white/10">
                                        <tr>
                                            <th className="px-6 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-6 font-bold text-slate-500">名称/代码</th>
                                            <th className="px-6 font-bold text-slate-500">类型</th>
                                            <th className="px-6 font-bold text-slate-500">价格</th>
                                            <th className="px-6 font-bold text-slate-500">持仓/市值</th>
                                            <th className="px-6 font-bold text-slate-500">持有收益</th>
                                            <th className="px-6 font-bold text-slate-500 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {filteredAssets.map(asset => {
                                            const hasPosition = asset.shares && asset.shares > 0 && asset.costPrice;
                                            const profit = hasPosition ? (asset.currentValue - asset.costPrice!) * asset.shares! : 0;
                                            const profitRate = hasPosition ? (profit / (asset.costPrice! * asset.shares!)) * 100 : 0;
                                            const marketValue = hasPosition ? asset.currentValue * asset.shares! : 0;
                                            const isProfit = profit >= 0;

                                            return (
                                                <tr key={asset.id} className={`hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors group ${selectedAssets.has(asset.id) ? 'bg-blue-50/30' : ''}`}>
                                                    <td className="px-6 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedAssets.has(asset.id)}
                                                            onChange={(e) => handleSelectOne(asset.id, e.target.checked)}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                                asset.category === 'fund' ? 'bg-orange-100 text-orange-600' : 
                                                                asset.category === 'index' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                                {asset.name[0]}
                                                            </div>
                                                            <div>
                                                                <div>{asset.name}</div>
                                                                <div className="font-mono text-xs text-slate-400 font-normal">{asset.code}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            asset.category === 'fund' ? 'bg-orange-500/10 text-orange-600' : 
                                                            asset.category === 'index' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                                                        }`}>
                                                            {asset.category.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                                                        {asset.currentValue.toFixed(4)}
                                                        <div className="text-xs text-slate-400 font-normal">{asset.lastUpdate?.split(' ')[1] || '--:--'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {hasPosition ? (
                                                            <div className="text-xs space-y-0.5">
                                                                <div className="flex justify-between w-32"><span className="text-slate-400">持仓:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{asset.shares?.toFixed(2)}</span></div>
                                                                <div className="flex justify-between w-32"><span className="text-slate-400">市值:</span> <span className="font-mono text-slate-900 dark:text-white font-bold">{marketValue.toFixed(2)}</span></div>
                                                                <div className="flex justify-between w-32 bg-slate-50 dark:bg-white/5 rounded px-1"><span className="text-slate-400 scale-90 origin-left">成本:</span> <span className="font-mono text-slate-500 scale-90 origin-right">{asset.costPrice?.toFixed(4)}</span></div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {hasPosition ? (
                                                            <div>
                                                                <div className={`font-bold font-mono ${isProfit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                    {isProfit ? '+' : ''}{profit.toFixed(2)}
                                                                </div>
                                                                <div className={`text-xs ${isProfit ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {isProfit ? '+' : ''}{profitRate.toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <IconButton icon={Edit2} onClick={() => onEditAsset(asset)} className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10" />
                                                            <IconButton icon={Trash2} danger onClick={() => onDeleteAsset(asset.id)} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {filteredAssets.length === 0 && (
                                <div className="p-10 text-center text-slate-400">
                                    <div className="mb-2"><Search size={40} className="mx-auto opacity-20" /></div>
                                    <p>未找到匹配的资产</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SERVICE TAB */}
                {activeTab === 'service' && (
                    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                         {/* System Health Cards */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard 
                                title="API Latency" 
                                value={`${serviceLatency || '--'}ms`} 
                                subtext="EastMoney API" 
                                icon={Activity} 
                                color={serviceLatency && serviceLatency > 200 ? "bg-amber-500" : "bg-emerald-500"} 
                            />
                            <StatCard 
                                title="Memory Usage" 
                                value="~14MB" 
                                subtext="Estimated" 
                                icon={HardDrive} 
                                color="bg-blue-500" 
                            />
                            <StatCard 
                                title="Uptime" 
                                value="99.9%" 
                                subtext="Since Last Deploy" 
                                icon={Zap} 
                                color="bg-purple-500" 
                            />
                         </div>

                         {/* Full Log Stream */}
                         <div className="flex-1 glass-card rounded-3xl border border-white/20 flex flex-col overflow-hidden min-h-[400px]">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <ScrollText size={20} className="text-slate-400"/>
                                    System Event Log
                                </h3>
                                <div className="text-xs text-slate-500 font-mono">
                                    Total: {logs.length} events
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs scrollbar-thin bg-black/5 dark:bg-black/20">
                                {logs.length === 0 && (
                                    <div className="text-center text-slate-400 py-10">No system logs recorded yet</div>
                                )}
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-4 p-2 hover:bg-white/5 rounded-lg border-b border-white/5 last:border-0 transition-colors">
                                        <div className="text-slate-500 w-24 shrink-0">{log.time}</div>
                                        <div className={`w-12 font-bold uppercase shrink-0 ${
                                            log.type === 'error' ? 'text-red-500' : 
                                            log.type === 'warn' ? 'text-amber-500' : 
                                            'text-emerald-500'
                                        }`}>
                                            [{log.type}]
                                        </div>
                                        <div className="text-slate-700 dark:text-slate-300 break-all">{log.msg}</div>
                                    </div>
                                ))}
                                <div className="h-4" /> {/* Spacer */}
                            </div>
                         </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Settings size={20} className="text-blue-500"/> 通用设置
                            </h3>
                            <div className="glass-card p-2 rounded-2xl border border-white/20">
                                <div className="p-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between border-b border-white/5">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">深色模式</div>
                                        <div className="text-xs text-slate-500">切换系统界面主题风格</div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className={`w-12 h-7 rounded-full transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${isDarkMode ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                                <div className="p-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">自动刷新</div>
                                        <div className="text-xs text-slate-500">数据自动同步频率 (当前: {refreshInterval === 0 ? 'Off' : refreshInterval/1000 + 's'})</div>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-black/20 rounded-lg p-1">
                                        {[0, 10000, 30000].map(ms => (
                                            <button 
                                                key={ms}
                                                onClick={() => setRefreshInterval(ms)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                    refreshInterval === ms 
                                                    ? 'bg-white shadow text-blue-600' 
                                                    : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {ms === 0 ? 'Off' : `${ms/1000}s`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Server size={20} className="text-blue-500"/> 系统访问
                            </h3>
                            <div className="glass-card p-2 rounded-2xl border border-white/20">
                                <div className="p-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200">开放注册</div>
                                        <div className="text-xs text-slate-500">允许新用户自行注册账号</div>
                                    </div>
                                    <button 
                                        onClick={toggleRegistration}
                                        disabled={isTogglingReg}
                                        className={`w-12 h-7 rounded-full transition-colors relative ${regEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${regEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Database size={20} className="text-red-500"/> 危险区域
                            </h3>
                            <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-red-600">重置所有数据</div>
                                        <div className="text-xs text-red-600/60 max-w-xs mt-1">
                                            这将清除所有本地存储的资产数据和设置，恢复到初始状态。此操作不可逆。
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { if(confirm('确定要重置吗？')) onResetAssets(); }}
                                        className="px-6 py-2 bg-white text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm shadow-sm transition-colors border border-red-100"
                                    >
                                        确认重置
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};
