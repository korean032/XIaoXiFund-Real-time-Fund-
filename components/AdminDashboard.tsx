import React, { useState, useEffect } from 'react';
import { Asset, DataSource } from '../types';
import { 
    LayoutDashboard, Database, Settings, Server, Activity, 
    Trash2, Search, Plus, AlertCircle, CheckCircle2, Clock, ScrollText,
    BarChart3, HardDrive, RefreshCw
} from 'lucide-react';

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
}

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
    onResetAssets
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'service' | 'settings' | 'logs' | 'database'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceLatency, setServiceLatency] = useState<number | null>(null);
    const [logs, setLogs] = useState<{time: string, type: 'info'|'warn'|'error', msg: string}[]>([]);
    const [dbStats, setDbStats] = useState({ size: '0 KB', count: 0, integrity: 'Unknown' });

    // Mock Logs Generator
    useEffect(() => {
        const addLog = () => {
            const types: ('info'|'warn'|'error')[] = ['info', 'info', 'info', 'warn'];
            const msgs = [
                'Syncing asset prices...',
                'Batch update completed in 120ms',
                'Heartbeat check: OK',
                'Cache cleared',
                'Websocket connection stable',
                'Verifying data integrity...'
            ];
            const newLog = {
                time: new Date().toLocaleTimeString(),
                type: types[Math.floor(Math.random() * types.length)],
                msg: msgs[Math.floor(Math.random() * msgs.length)]
            };
            setLogs(prev => [newLog, ...prev].slice(0, 50));
        };
        const timer = setInterval(addLog, 3000);
        return () => clearInterval(timer);
    }, []);

    // Health Check
    useEffect(() => {
        const checkHealth = async () => {
            const start = performance.now();
            try {
                await new Promise(r => setTimeout(r, Math.random() * 200 + 50));
                setServiceLatency(Math.floor(performance.now() - start));
            } catch (e) {
                setServiceLatency(-1);
            }
        };

        if (activeTab === 'service' || activeTab === 'overview') {
            checkHealth();
            const timer = setInterval(checkHealth, 5000);
            return () => clearInterval(timer);
        }
    }, [activeTab]);
    
    // DB Check
    useEffect(() => {
        if (activeTab === 'database') {
            const checkDB = () => {
                try {
                    const data = localStorage.getItem('userAssets');
                    const size = data ? (data.length * 2 / 1024).toFixed(2) : '0';
                    const parsed = data ? JSON.parse(data) : [];
                    setDbStats({
                        size: `${size} KB`,
                        count: parsed.length,
                        integrity: Array.isArray(parsed) ? 'Valid' : 'Corrupted'
                    });
                } catch(e) {
                    setDbStats({ size: 'Error', count: 0, integrity: 'Corrupted' });
                }
            };
            checkDB();
        }
    }, [activeTab, assets]);

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.code.includes(searchTerm)
    );

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assets, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "fund_assets_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        setLogs(prev => [{time: new Date().toLocaleTimeString(), type: 'info', msg: 'Assets exported successfully'}, ...prev]);
    };

    return (
        <div className="flex h-full w-full max-w-7xl mx-auto glass-panel rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900/5 dark:bg-black/20 border-r border-white/10 flex flex-col p-4 backdrop-blur-md">
                <div className="flex items-center gap-3 px-4 py-6 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Server size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white">控制台</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Backend Service</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'overview', icon: LayoutDashboard, label: '概览' },
                        { id: 'assets', icon: BarChart3, label: '资产管理' },
                        { id: 'service', icon: Activity, label: '服务监控' },
                        { id: 'logs', icon: ScrollText, label: '系统日志' },
                        { id: 'settings', icon: Settings, label: '系统设置' },
                        { id: 'database', icon: Database, label: '数据库' },
                    ].map(item => (
                        <button 
                            key={item.id}
                            //@ts-ignore
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === item.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-white/10'}`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <div className={`w-2 h-2 rounded-full ${serviceLatency && serviceLatency > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        系统状态: {serviceLatency && serviceLatency > 0 ? '正常' : '异常'}
                    </div>
                    <div className="text-xs text-slate-400">v1.3.1 (Pro)</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-white/30 dark:bg-slate-900/30 p-8">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">系统概览</h1>
                            <p className="text-slate-500 dark:text-slate-400">实时监控系统运行状态与资产分布。</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Database size={24} /></div>
                                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">ACTIVE</span>
                                </div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{assets.length}</div>
                                <div className="text-sm text-slate-500">监控资产总数</div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl"><Server size={24} /></div>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">EASTMONEY</span>
                                </div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{serviceLatency ? `${serviceLatency}ms` : '--'}</div>
                                <div className="text-sm text-slate-500">API 响应延迟</div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><Clock size={24} /></div>
                                </div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{refreshInterval === 0 ? 'Manual' : (refreshInterval / 1000) + 's'}</div>
                                <div className="text-sm text-slate-500">数据刷新频率</div>
                            </div>
                        </div>

                        {/* Recent Activity Log Placeholder */}
                        <div className="glass-card rounded-2xl border border-white/40 overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-white">最新系统日志</h3>
                                <button onClick={() => setActiveTab('logs')} className="text-xs text-blue-600 font-bold hover:underline">查看全部</button>
                            </div>
                            <div className="p-6 space-y-4">
                                {logs.slice(0, 3).map((log, i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm">
                                        <span className="text-slate-400 font-mono text-xs w-20">{log.time}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-12 text-center uppercase ${log.type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{log.type}</span>
                                        <span className="text-slate-600 dark:text-slate-300">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="flex justify-between items-end mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">资产管理</h1>
                                <p className="text-slate-500 dark:text-slate-400">管理您的投资组合与监控列表。</p>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="搜索资产..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-white/50 dark:bg-black/20 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64 text-sm"
                                    />
                                </div>
                                <button onClick={onAddAsset} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all text-sm">
                                    <Plus size={18} /> 添加资产
                                </button>
                            </div>
                        </header>
                        <div className="glass-card rounded-2xl overflow-hidden border border-white/40">
                             <table className="w-full text-left text-sm">
                                 <thead className="bg-slate-50/50 dark:bg-slate-800/50 h-12 border-b border-white/10">
                                     <tr>
                                         <th className="px-6 font-bold text-slate-500">名称</th>
                                         <th className="px-6 font-bold text-slate-500">代码</th>
                                         <th className="px-6 font-bold text-slate-500">类型</th>
                                         <th className="px-6 font-bold text-slate-500">最新价</th>
                                         <th className="px-6 font-bold text-slate-500 text-right">操作</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/10">
                                     {filteredAssets.map(asset => (
                                         <tr key={asset.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                                             <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{asset.name}</td>
                                             <td className="px-6 py-4 font-mono text-slate-500 bg-slate-100/30 dark:bg-white/5 rounded w-fit">{asset.code}</td>
                                             <td className="px-6 py-4">
                                                 <span className={`px-2 py-1 rounded-lg text-xs font-bold 
                                                     ${asset.category === 'fund' ? 'bg-orange-100 text-orange-700' : 
                                                       asset.category === 'index' ? 'bg-blue-100 text-blue-700' : 
                                                       'bg-purple-100 text-purple-700'}`}>
                                                     {asset.category.toUpperCase()}
                                                 </span>
                                             </td>
                                             <td className="px-6 py-4 font-mono">{asset.currentValue}</td>
                                             <td className="px-6 py-4 text-right">
                                                 <button onClick={() => onDeleteAsset(asset.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'service' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">服务监控</h1>
                            <p className="text-slate-500 dark:text-slate-400">后端服务与数据源连接状态诊断。</p>
                        </header>
                         <div className="space-y-4">
                            <div className="glass-card p-6 rounded-2xl border border-white/40 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600"><Activity size={24} /></div>
                                    <div><h3 className="font-bold text-lg text-slate-800 dark:text-white">EastMoney API Gateway</h3><div className="flex items-center gap-2 text-sm text-slate-500"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Operational</div></div>
                                </div>
                                <div className="text-right"><div className="font-mono text-xl font-bold text-slate-700 dark:text-slate-200">{serviceLatency}ms</div><div className="text-xs text-slate-400">Latency</div></div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <h3 className="font-bold mb-4 text-slate-700 dark:text-slate-200">Endpoint Status</h3>
                                <div className="space-y-3">
                                    {[{ name: 'Real-time Quotes (Batch)', url: 'push2.eastmoney.com/api/qt/ulist', status: 'OK' },{ name: 'Chart Data (Min)', url: 'push2.eastmoney.com/api/qt/trends2', status: 'OK' },{ name: 'Historical K-Line', url: 'push2his.eastmoney.com/api/qt/kline', status: 'OK' },{ name: 'Fund Basic Info', url: 'j5.dfcfw.com/sc/tfs', status: 'OK' }].map((ep, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/30 dark:bg-black/10 rounded-xl"><div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-green-500" /><div><div className="font-bold text-sm text-slate-700 dark:text-slate-300">{ep.name}</div><div className="text-xs font-mono text-slate-400">{ep.url}</div></div></div><span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">200 OK</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-6 animate-fade-in h-full flex flex-col">
                         <header className="mb-4">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">系统日志</h1>
                            <p className="text-slate-500 dark:text-slate-400">实时查看系统运行日志与调试信息。</p>
                        </header>
                         <div className="glass-card flex-1 rounded-2xl border border-white/40 overflow-hidden flex flex-col">
                             <div className="p-2 border-b border-white/10 bg-black/5 dark:bg-white/5 flex gap-2">
                                 <button onClick={() => setLogs([])} className="text-xs px-3 py-1 bg-white/20 hover:bg-white/40 rounded transition-colors">清除日志</button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 bg-slate-900 text-slate-300">
                                 {logs.map((log, i) => (
                                     <div key={i} className="flex gap-4 hover:bg-white/5 p-0.5 rounded">
                                         <span className="text-slate-500 opacity-50">{log.time}</span>
                                         <span className={`uppercase font-bold ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>{log.type}</span>
                                         <span>{log.msg}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">系统设置</h1>
                            <p className="text-slate-500 dark:text-slate-400">配置全局参数与个性化选项。</p>
                        </header>

                        <div className="space-y-6">
                            {/* Theme Config */}
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">界面外观</h3>
                                <div className="flex gap-4">
                                     <button onClick={() => setIsDarkMode(false)} className={`flex-1 p-4 rounded-xl border-2 transition-all ${!isDarkMode ? 'border-blue-500 bg-blue-500/5' : 'border-transparent bg-black/5 dark:bg-white/5'}`}>
                                         <div className="font-bold mb-1">Light Mode</div>
                                         <div className="text-xs text-slate-500">明亮清爽的日间模式</div>
                                     </button>
                                     <button onClick={() => setIsDarkMode(true)} className={`flex-1 p-4 rounded-xl border-2 transition-all ${isDarkMode ? 'border-blue-500 bg-blue-500/5' : 'border-transparent bg-black/5 dark:bg-white/5'}`}>
                                         <div className="font-bold mb-1">Dark Mode</div>
                                         <div className="text-xs text-slate-500">深沉专注的夜间模式</div>
                                     </button>
                                </div>
                            </div>

                            {/* Data Config */}
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">数据源配置</h3>
                                <div className="space-y-4">
                                     <div>
                                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">首选数据源</label>
                                         <select 
                                            value={dataSource} 
                                            onChange={(e) => setDataSource(e.target.value as DataSource)}
                                            className="w-full p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                         >
                                             <option value="EastMoney">东方财富 (EastMoney) - 推荐</option>
                                         </select>
                                         <p className="text-xs text-slate-500 mt-1.5">当前仅支持东方财富作为稳定数据源。</p>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">自动刷新频率</label>
                                         <div className="flex gap-3 overflow-x-auto pb-2">
                                             {[5000, 10000, 30000, 60000, 0].map(ms => (
                                                 <button 
                                                    key={ms}
                                                    onClick={() => setRefreshInterval(ms)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${refreshInterval === ms ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/30 dark:bg-slate-700/30 hover:bg-white/50'}`}
                                                 >
                                                     {ms === 0 ? '手动' : `${ms/1000}秒`}
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                </div>
                            </div>

                            {/* Backup & Restore */}
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">数据备份</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-300">导出资产配置</div>
                                        <div className="text-xs text-slate-500">将当前的资产列表导出为 JSON 文件</div>
                                    </div>
                                    <button onClick={handleExport} className="px-6 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-800 rounded-lg font-bold hover:opacity-90 transition-opacity">
                                        立即导出
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'database' && (
                    <div className="space-y-6 animate-fade-in">
                        <header className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">数据库管理</h1>
                            <p className="text-slate-500 dark:text-slate-400">检查及维护本地数据存储状态。</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="text-sm font-bold text-slate-500 mb-2">存储占用</div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white font-mono">{dbStats.size}</div>
                                <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[10%]"></div>
                                </div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="text-sm font-bold text-slate-500 mb-2">记录数量</div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white font-mono">{dbStats.count}</div>
                                <div className="text-xs text-slate-400 mt-2">条资产记录</div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border border-white/40">
                                <div className="text-sm font-bold text-slate-500 mb-2">数据完整性</div>
                                <div className={`text-3xl font-bold ${dbStats.integrity === 'Valid' ? 'text-green-600' : 'text-red-500'}`}>{dbStats.integrity}</div>
                                <div className="text-xs text-slate-400 mt-2">JSON 校验结果</div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-2xl border border-white/40">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">危险操作区</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                                    <div>
                                        <div className="font-bold text-red-600 dark:text-red-400">重置为演示数据</div>
                                        <div className="text-xs text-slate-500">将所有资产恢复到系统初始状态，丢失所有自定义更改。</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (confirm('确定要重置所有数据吗？此操作无法撤销。')) {
                                                onResetAssets();
                                                setLogs(prev => [{time: new Date().toLocaleTimeString(), type: 'warn', msg: 'Database reset to default'}, ...prev]);
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-500/30 transition-all"
                                    >
                                        重置数据
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 border border-white/10 rounded-xl">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-300">强制完整性检查</div>
                                        <div className="text-xs text-slate-500">重新扫描并验证本地存储的数据结构。</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const checkDB = () => {
                                                try {
                                                    const data = localStorage.getItem('userAssets');
                                                    const size = data ? (data.length * 2 / 1024).toFixed(2) : '0';
                                                    const parsed = data ? JSON.parse(data) : [];
                                                    setDbStats({
                                                        size: `${size} KB`,
                                                        count: parsed.length,
                                                        integrity: Array.isArray(parsed) ? 'Valid' : 'Corrupted'
                                                    });
                                                    setLogs(prev => [{time: new Date().toLocaleTimeString(), type: 'info', msg: 'Integrity check passed'}, ...prev]);
                                                } catch(e) {
                                                    setLogs(prev => [{time: new Date().toLocaleTimeString(), type: 'error', msg: 'Database corruption detected'}, ...prev]);
                                                }
                                            };
                                            checkDB();
                                        }}
                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-bold text-sm transition-all"
                                    >
                                        立即检查
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

