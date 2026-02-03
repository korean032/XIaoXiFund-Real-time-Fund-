
import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetCategory, ChartPeriod, DataSource, HistoryPoint, MarketStatus, FundSearchResult } from './types';
import AssetCard from './components/AssetCard';
import FundChart from './components/FundChart';
import { AdminDashboard } from './components/AdminDashboard';
import { fetchAssetHistory, fetchAssetSparkline, searchFunds, updateAssetsWithRealData, fetchFundHoldings, fetchRemoteAssets, saveRemoteAssets } from './services/financeService';
import { recognizePortfolioImage } from './services/imageRecognition';
import LoginPage from './components/LoginPage';
import { 
  LineChart, Plus, Search, RefreshCw, X, Loader2, ChevronLeft, ArrowUpRight, 
  TrendingUp, Activity, Globe, Coins, Layers, Clock, Moon, Sun, Settings, Check, 
  Banknote, BarChart3, Zap, Menu, Filter, PieChart, ChevronRight, Server, Cloud, Download, LogIn
} from 'lucide-react';

// --- Mock Data Generators ---
const generateMockHistory = (baseValue: number): HistoryPoint[] => {
  const points: HistoryPoint[] = [];
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60000); 
    points.push({
      time: time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      value: baseValue 
    });
  }
  return points;
};

// --- Initial Data Sets ---
const INITIAL_ASSETS: Asset[] = [];

const DATA_SOURCES: { id: DataSource; label: string }[] = [
    { id: 'EastMoney', label: '东方财富' },
];

const REFRESH_OPTIONS: { value: number; label: string }[] = [
    { value: 5000, label: '5秒 (极速)' },
    { value: 10000, label: '10秒' },
    { value: 30000, label: '30秒' },
    { value: 60000, label: '1分钟' },
    { value: 300000, label: '5分钟' },
    { value: 0, label: '手动刷新' },
];

const CHART_PERIODS = ['分时', '日K', '周K', '月K', '1月', '3月', '6月', '1年'];

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('fund');
  const [dataSource, setDataSource] = useState<DataSource>('EastMoney');
  
  // Default Refresh Interval: 5000ms (5s)
  // Using 'refreshInterval_v2' to force reset existing users to 5s
  const [refreshInterval, setRefreshInterval] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('refreshInterval_v2');
        return saved ? parseInt(saved, 10) : 5000;
    }
    return 5000;
  });

  // Manual Trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
      localStorage.setItem('refreshInterval_v2', refreshInterval.toString());
  }, [refreshInterval]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' || 
               (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('userAssets_v2');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {}
    }
    return INITIAL_ASSETS;
  });

  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChartPeriod, setActiveChartPeriod] = useState<ChartPeriod>('分时');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataPersistenceMsg, setDataPersistenceMsg] = useState('');
  
  // Portfolio editing state
  const [isEditPortfolioOpen, setIsEditPortfolioOpen] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState<'modify' | 'add'>('add'); // 'modify' | 'add'
  const [portfolioInputMode, setPortfolioInputMode] = useState<'amount' | 'shares'>('amount'); // 默认金额模式
  const [editingShares, setEditingShares] = useState('');
  const [editingAmount, setEditingAmount] = useState(''); // 总投入金额
  const [editingCostPrice, setEditingCostPrice] = useState('');
  const [editingFeeRate, setEditingFeeRate] = useState('0'); // 费率 %

  // Global Logs
  const [logs, setLogs] = useState<{time: string, type: 'info'|'warn'|'error', msg: string}[]>([]);

  const addLog = (type: 'info'|'warn'|'error', msg: string) => {
      setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          type,
          msg
      }, ...prev].slice(0, 100)); // Keep last 100 logs
  };
  const [isRecognizing, setIsRecognizing] = useState(false); // AI识别中
  const [recognitionError, setRecognitionError] = useState('');

  // --- User Auth State ---
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
      const uid = localStorage.getItem('xiaoxi_uid');
      const role = localStorage.getItem('xiaoxi_role');
      if (uid) {
          setCurrentUser(uid);
          setUserRole(role || 'user');
      }
      setIsAuthChecking(false);
  }, []);

  const handleLoginSuccess = async (username: string, role: string) => {
      localStorage.setItem('xiaoxi_uid', username);
      localStorage.setItem('xiaoxi_role', role);
      setCurrentUser(username);
      setUserRole(role);
      
      addLog('info', `Welcome back, ${username}`);
      
      setTimeout(async () => {
          const remote = await fetchRemoteAssets();
          if (remote) {
              setAssets(remote);
              addLog('info', 'Portfolio synced');
          } else {
              if (assets.length > 0) setAssets([]); 
          }
      }, 100);
  };

  const handleLogout = () => {
      localStorage.removeItem('xiaoxi_uid');
      localStorage.removeItem('xiaoxi_role');
      setCurrentUser(null);
      setUserRole('user');
      setAssets(INITIAL_ASSETS);
  };

  // derived admin state for UI
  const isAdmin = userRole === 'admin';

  const assetsRef = useRef(assets);
  useEffect(() => {
      assetsRef.current = assets;
  }, [assets]);
  
  useEffect(() => {
      localStorage.setItem('userAssets_v2', JSON.stringify(assets));
      // Debounce save to cloud
      // Show saving state immediately if dirty?
      if (assets !== INITIAL_ASSETS && assets.length > 0) {
          setIsSaving(true);
          setDataPersistenceMsg('Saving...');
      }

      const timer = setTimeout(() => {
          if (assets.length > 0 && assets !== INITIAL_ASSETS) {
              saveRemoteAssets(assets).then(ok => {
                  if (ok) {
                      console.log('Assets synced to cloud');
                      setDataPersistenceMsg('已同步');
                      addLog('info', 'Assets automatically synced to KV cloud storage');
                      setTimeout(() => setDataPersistenceMsg(''), 2000);
                  } else {
                      setDataPersistenceMsg('同步失败');
                      addLog('error', 'Failed to sync assets to cloud');
                  }
                  setIsSaving(false);
              });
          } else {
              setIsSaving(false);
          }
      }, 2000);
      return () => clearTimeout(timer);
  }, [assets]);

  // Initial Sync from Cloud
  useEffect(() => {
      fetchRemoteAssets().then(remoteAssets => {
          if (remoteAssets && remoteAssets.length > 0) {
              setAssets(remoteAssets);
              console.log('Restored assets from cloud (overwriting local cache)');
              addLog('info', 'Assets synced from cloud storage');
          }
      });
  }, []);

  const filteredAssets = assets.filter(a => a.category === activeCategory);
  
  useEffect(() => {
    if (filteredAssets.length > 0) {
        if (!filteredAssets.find(a => a.id === selectedAssetId)) {
            setSelectedAssetId(filteredAssets[0].id);
        }
    }
  }, [activeCategory, assets]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId) || filteredAssets[0] || assets[0];

  const getMarketStatus = (asset: Asset | undefined) => {
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    
    const closedStyle = 'text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 dark:text-slate-400';
    const tradingStyle = 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30';
    const waitingStyle = 'text-amber-600 bg-amber-50/50 dark:text-amber-400 dark:bg-amber-900/30';

    if (!asset) return { label: '未选择', color: closedStyle, icon: <Moon size={14} />, spinning: false };

    if (day === 0 || day === 6) return { label: '已休市', color: closedStyle, icon: <Moon size={14} />, spinning: false };

    if (asset.tags.includes('美股') || asset.tags.includes('NASDAQ') || (asset.apiCode && asset.apiCode.startsWith('us'))) {
         const isNight = minutes >= 21 * 60 + 30;
         const isEarlyMorning = minutes <= 4 * 60;
         if (isNight || isEarlyMorning) {
             return { label: '美股交易中', color: tradingStyle, icon: <RefreshCw size={14} className="animate-spin-slow" />, spinning: true };
         }
         return { label: '美股休市', color: closedStyle, icon: <Moon size={14} />, spinning: false };
    }

    if (asset.category === 'fund' || asset.category === 'index' || asset.category === 'sector' || asset.category === 'stock') {
        // Special case for HK stocks
        const isHK = asset.tags?.includes('港股') || asset.apiCode?.startsWith('hk');
        const closeTime = isHK ? 960 : 900;

        if (minutes >= 570 && minutes <= 690) return { label: '实时交易中', color: tradingStyle, icon: <RefreshCw size={14} className="animate-spin-slow" />, spinning: true };
        if (minutes >= 780 && minutes <= closeTime) return { label: '实时交易中', color: tradingStyle, icon: <RefreshCw size={14} className="animate-spin-slow" />, spinning: true };
        if (minutes > 690 && minutes < 780) return { label: '午间休市', color: waitingStyle, icon: <Clock size={14} />, spinning: false };
        if (minutes < 570) return { label: '盘前等待', color: closedStyle, icon: <Sun size={14} />, spinning: false };
        return { label: '已收盘', color: closedStyle, icon: <Moon size={14} />, spinning: false };
    }
    
    if (asset.category === 'gold') {
        return { label: '行情的波动', color: waitingStyle, icon: <Activity size={14} />, spinning: true }; 
    }

    return { label: '已休市', color: closedStyle, icon: <Moon size={14} />, spinning: false };
  };

  const marketStatus = getMarketStatus(selectedAsset);
  
  let chartOverlayMessage = undefined;
  if (activeChartPeriod === '分时' && (marketStatus.label === '盘前等待' || marketStatus.label === '已休市')) {
      chartOverlayMessage = "未开盘";
  }
  if (isLoadingHistory) {
      chartOverlayMessage = "加载历史数据中...";
  }

  // Fetch Fund Holdings when selected
  useEffect(() => {
      if (selectedAsset && selectedAsset.category === 'fund' && (!selectedAsset.holdings || selectedAsset.holdings.length === 0)) {
          fetchFundHoldings(selectedAsset.code).then(holdings => {
              if (holdings && holdings.length > 0) {
                  setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, holdings } : a));
              }
          });
      }
  }, [selectedAsset?.id]);

  // History Fetch
  useEffect(() => {
    const loadIntialData = async () => {
          if (!selectedAsset) return;
          setIsLoadingHistory(true);
          // Always fetch history, even for intraday (分时) to get the base curve
          const history = await fetchAssetHistory(selectedAsset, activeChartPeriod);
          
          if (history && history.length > 0) {
              setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, history: history } : a));
          } else if (activeChartPeriod === '分时') {
              // Intraday fallback logic
              const today = new Date().toISOString().split('T')[0];
              const hasValidLocalHistory = selectedAsset.history && 
                                         selectedAsset.history.length > 0 && 
                                         selectedAsset.lastHistoryDate === today;

              if (hasValidLocalHistory) {
                  // Keep existing local history (do nothing), just stop loading
                  console.log(`[History] Keeping local accumulated history for ${selectedAsset.name}`);
              } else if (selectedAsset.currentValue > 0) {
                  // Only if NO local history, create a single point fallback
                  const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                  setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, history: [{ time: nowStr, value: selectedAsset.currentValue }] } : a));
              }
          }
          setIsLoadingHistory(false);
      };
      loadIntialData();
  }, [activeChartPeriod, selectedAssetId]);

  // Real-time Loop & Refresh Logic
  useEffect(() => {
    let timerId: number;
    let isMounted = true;
    
    const loop = async () => {
        setIsRefreshing(true); // Visual indicator start
        const shouldUpdateHistory = activeChartPeriod === '分时';
        const currentAssets = assetsRef.current;
        
        // No explicit race/timeout wrapper here, rely on individual service timeouts (8s)
        try {
            // Log the start of sync to show activity in Admin Dashboard
            if (activeCategory !== 'backend') { // Optional: Don't log if we are looking at the log itself? No, user wants to see it IN the log.
                 // Reducing spam: only log if interval > 5s OR every nth time? 
                 // User specifically asked for it, let's just log it.
                 // Actually, "Syncing asset prices..." matches the user's reference image.
            }
            // addLog('info', 'Syncing asset prices...'); // Moving this inside setAssets or just here? 
            // If we log here, it might trigger render before data? 
            // Better to log "Scanning..." 
            
            const freshAssets = await updateAssetsWithRealData(currentAssets, dataSource, shouldUpdateHistory);
            
            if (isMounted) {
                // Log only if we got data (implicitly success if we are here)
                addLog('info', `Syncing asset prices... (${freshAssets.length} assets)`);

                setAssets(prevAssets => {
                    const updates = freshAssets.filter(f => prevAssets.some(p => p.id === f.id && p.currentValue !== f.currentValue));
                    if (updates.length > 0) {
                        addLog('info', `Updated real-time data for ${updates.length} assets`);
                    }
                    return prevAssets.map(prevAsset => {
                        const freshAsset = freshAssets.find(f => f.id === prevAsset.id);
                        if (!freshAsset) return prevAsset;
                        return {
                            ...prevAsset,
                            ...freshAsset, // Spread all new properties
                            // Keep sparkline if not updated
                            sparkline: freshAsset.sparkline || prevAsset.sparkline,
                            monthChangePercent: freshAsset.monthChangePercent ?? prevAsset.monthChangePercent,
                            // Update lastHistoryDate if we updated history (meaning it's intraday)
                            lastHistoryDate: shouldUpdateHistory ? new Date().toISOString().split('T')[0] : (freshAsset.lastHistoryDate || prevAsset.lastHistoryDate)
                        };
                    });
                });
                
                setIsRefreshing(false); // Visual indicator end

                if (refreshInterval > 0) {
                    timerId = window.setTimeout(loop, refreshInterval);
                }
            }
        } catch (err: any) {
            console.error(err);
            addLog('error', `Update error: ${err.message}`);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Run immediately when mounted or when dependencies (like trigger) change
    loop();

    return () => {
        isMounted = false;
        clearTimeout(timerId);
    };
  }, [dataSource, refreshInterval, activeChartPeriod, refreshTrigger]); // refreshTrigger forces re-run

  const handleManualRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
  };

  // Sparkline
  useEffect(() => {
     const fetchSparklines = async () => {
         const targets = assets.filter(a => !a.sparkline && (a.category === 'fund' || a.category === 'index' || a.category === 'stock'));
         for (const t of targets) {
             const res = await fetchAssetSparkline(t);
             if (res) {
                 setAssets(prev => prev.map(p => p.id === t.id ? { ...p, sparkline: res.sparkline, monthChangePercent: res.percent } : p));
             }
         }
     }
     if (assets.length > 0) fetchSparklines();
  }, [assets.length]);

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      const res = await searchFunds(searchQuery);
      setSearchResults(res);
      setIsSearching(false);
  };

  const addAsset = async (item: FundSearchResult) => {
      if (assets.some(a => a.code === item.code)) return;
      setIsAdding(true);
      
      // Determine correct category from search result
      let category: AssetCategory = 'fund';
      if (item.category === 'stock') category = 'stock';
      else if (item.category === 'index') category = 'index';
      
      const newAsset: Asset = {
          id: item.code,
          category: category,
          code: item.code,
          apiCode: item.apiCode || item.code,
          name: item.name,
          type: item.type,
          currentValue: 0,
          yesterdayValue: 0,
          history: [],
          tags: [],
          time: '--'
      };

      // Force an immediate single update for this new asset
      const [initialized] = await updateAssetsWithRealData([newAsset], dataSource, false);
      
      // Force switch to intraday view for new asset
      setActiveChartPeriod('分时');

      // Always try to fetch intraday (分时) data first for best UX
      let history = await fetchAssetHistory(initialized, '分时');
      
      // If intraday fails, try current active period
      if (!history || history.length === 0) {
          history = await fetchAssetHistory(initialized, activeChartPeriod);
      }
      
      // If still no data, try daily
      if (!history || history.length === 0) {
          history = await fetchAssetHistory(initialized, '日K');
      }
      
      // Store the fetched history
      if (history && history.length > 0) {
          initialized.history = history;
      } else {
          // Last resort: create a single point fallback
          const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          if (initialized.currentValue > 0) {
              initialized.history = [{ time: nowStr, value: initialized.currentValue }];
          }
      }
      
      setAssets(prev => [...prev, initialized]);
      setIsAdding(false);
      setIsAddModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setActiveCategory(category); // Auto switch tab to see new asset
      setSelectedAssetId(item.code);
  };

  const removeAsset = (id: string) => {
      setAssets(prev => prev.filter(a => a.id !== id));
      if (selectedAssetId === id) setSelectedAssetId('');
  };

  const openEditPortfolio = () => {
      if (selectedAsset?.shares && selectedAsset?.costPrice) {
          // 有现有数据，显示份额模式
          setPortfolioTab('modify');
          setPortfolioInputMode('shares');
          setEditingShares(selectedAsset.shares.toString());
          setEditingCostPrice(selectedAsset.costPrice.toString());
          setEditingAmount((selectedAsset.shares * selectedAsset.costPrice).toFixed(2));
      } else {
          // 新添加，默认加仓模式
          setPortfolioTab('add');
          setPortfolioInputMode('amount');
          setEditingShares('');
          setEditingCostPrice(selectedAsset?.currentValue.toString() || '');
          setEditingAmount('');
      }
      setIsEditPortfolioOpen(true);
  };

  const savePortfolio = () => {
      if (!selectedAsset) return;

      if (portfolioTab === 'modify') {
          // Direct Modification (Override)
          let shares: number;
          const costPrice = parseFloat(editingCostPrice);
          
          if (portfolioInputMode === 'amount') {
              // 金额模式：份额 = 总金额 / 成本价
              const amount = parseFloat(editingAmount);
              if (!amount || !costPrice) return;
              shares = amount / costPrice;
          } else {
              // 份额模式
              shares = parseFloat(editingShares);
              if (!shares || !costPrice) return;
          }
          
          setAssets(prev => prev.map(a => 
              a.id === selectedAsset.id 
                  ? { ...a, shares: shares || undefined, costPrice: costPrice || undefined }
                  : a
          ));
      } else {
          // Add Position Mode (Weighted Average)
          const buyAmount = parseFloat(editingAmount);
          const buyPrice = parseFloat(editingCostPrice);
          const feeRate = parseFloat(editingFeeRate) / 100;

          if (!buyAmount || !buyPrice) return;

          const currentShares = selectedAsset.shares || 0;
          const currentCost = selectedAsset.costPrice || 0;
          const currentTotalCost = currentShares * currentCost; 

          // Add Position Logic
          const newShares = (buyAmount * (1 - feeRate)) / buyPrice;
          const finalTotalShares = currentShares + newShares;
          const finalTotalCost = currentTotalCost + buyAmount; 

          const finalAvgCost = finalTotalCost / finalTotalShares;

          setAssets(prev => prev.map(a => 
              a.id === selectedAsset.id 
                  ? { ...a, shares: finalTotalShares, costPrice: finalAvgCost }
                  : a
          ));
          
          addLog('info', `Added position for ${selectedAsset.name}`);
      }

      setIsEditPortfolioOpen(false);
  };

  // Stale Data Cleanup Effect
  useEffect(() => {
     // Check for stale intraday history on load
     const today = new Date().toISOString().split('T')[0];
     let hasChanges = false;
     
     const cleanAssets = assets.map(a => {
         // If asset has history, and it's intraday-like (check dates or explicit flag?)
         // We rely on lastHistoryDate. If missing, we assume it might be old if it's not today.
         if (a.lastHistoryDate && a.lastHistoryDate !== today) {
             console.log(`Cleaning stale history for ${a.name}`);
             addLog('info', `Cleared stale intraday history for ${a.name}`);
             hasChanges = true;
             return { ...a, history: [], lastHistoryDate: today };
         }
         return a;
     });

     if (hasChanges) {
         setAssets(cleanAssets);
     }
  }, [assets.length]); // Run once when assets loaded/changed length, or ideally just on mount/hydrate
  // However, putting 'assets' in dependency might cause loop if we modify assets.
  // Best to run this when assets are *first loaded* from storage.
  // Implementation Note: logic placed in the initialization or simple effect with care.
  // Let's rely on the fact that if we change it, it updates 'assets', loop triggers again, but condition fails.


  const resetAssets = () => {
      setAssets(INITIAL_ASSETS);
      // Clear specific localstorage to ensure clean state on reload if needed, 
      // but state update handles immediate UI.
      localStorage.setItem('userAssets_v2', JSON.stringify(INITIAL_ASSETS));
  };

  // Handle image upload and recognition
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsRecognizing(true);
      setRecognitionError('');

      try {
          const result = await recognizePortfolioImage(file);
          
          // Auto-fill the form
          if (result.amount) {
              setEditingAmount(result.amount.toString());
              setPortfolioInputMode('amount');
          }
          if (result.costPrice) {
              setEditingCostPrice(result.costPrice.toString());
          }
          if (result.shares && !result.amount) {
              setEditingShares(result.shares.toString());
              setPortfolioInputMode('shares');
          }

      } catch (error) {
          setRecognitionError(error instanceof Error ? error.message : '识别失败');
      } finally {
          setIsRecognizing(false);
      }
  };

  // Calculate total portfolio value
  const portfolioStats = React.useMemo(() => {
      let totalValue = 0;
      let totalCost = 0;
      
      assets.forEach(asset => {
          if (asset.shares && asset.costPrice) {
              totalValue += asset.shares * asset.currentValue;
              totalCost += asset.shares * asset.costPrice;
          }
      });
      
      const profit = totalValue - totalCost;
      const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
      
      return { totalValue, totalCost, profit, profitPercent };
  }, [assets]);

  const categories: { id: AssetCategory; label: string; icon: any }[] = [
    { id: 'fund', label: '基金', icon: Layers },
    { id: 'backend', label: '后台', icon: Server },
  ];

    // --- User Auth State ---




  if (!currentUser) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative h-screen flex flex-col font-sans overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-500">
      
      {/* Liquid Background */}
      <div className="liquid-bg">
        <div className="liquid-shape shape-1"></div>
        <div className="liquid-shape shape-2"></div>
        <div className="liquid-shape shape-3"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-30 flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                <LineChart size={20} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent drop-shadow-sm">
                小熙实时基金
            </h1>
        </div>

        {/* Portfolio Summary */}
        {portfolioStats.totalCost > 0 && (
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-2xl glass-card">
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">总市值</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">¥{portfolioStats.totalValue.toFixed(2)}</div>
                </div>
                <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">总盈亏</div>
                    <div className={`text-sm font-bold ${portfolioStats.profit >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {portfolioStats.profit >= 0 ? '+' : ''}¥{portfolioStats.profit.toFixed(2)}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">收益率</div>
                    <div className={`text-sm font-bold ${portfolioStats.profitPercent >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {portfolioStats.profitPercent >= 0 ? '+' : ''}{portfolioStats.profitPercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1 glass-card p-1 rounded-xl">
                <button onClick={() => setIsDarkMode(false)} className={`p-1.5 rounded-lg transition-all ${!isDarkMode ? 'bg-white/80 text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Sun size={16} /></button>
                <button onClick={() => setIsDarkMode(true)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700/80 text-indigo-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Moon size={16} /></button>
            </div>
            
            {/* Manual Refresh Button */}
            {dataPersistenceMsg && (
                 <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] text-slate-500 font-medium animate-fade-in">
                    {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Cloud size={10} />}
                    {dataPersistenceMsg}
                 </div>
            )}

            <button onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2.5 glass-button rounded-full text-slate-600 dark:text-slate-300 relative group"
                title="立即刷新"
            >
                <RefreshCw size={18} className={`transition-all ${isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : "group-hover:rotate-180"}`} />
            </button>

            {isAdmin && (
                <button onClick={() => setActiveCategory('backend')} className="p-2.5 glass-button rounded-full text-slate-600 dark:text-slate-300 relative group" title="管理后台">
                    <Server size={18} />
                </button>
            )}

            <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 glass-button rounded-full text-slate-600 dark:text-slate-300"><Settings size={18} /></button>
            <button onClick={handleLogout} className="p-2.5 glass-button rounded-full text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-colors" title="退出登录"><LogIn className="rotate-180" size={18} /></button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600/90 hover:bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/20"><Plus size={18} /><span className="hidden sm:inline">添加资产</span></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative pt-16">
        <aside className={`absolute inset-y-0 left-0 z-20 w-full sm:w-[360px] glass-panel border-r-0 sm:border-r border-white/40 dark:border-white/5 flex flex-col transform transition-transform duration-300 sm:relative sm:translate-x-0 ${showMobileDetail ? '-translate-x-full' : 'translate-x-0'} ${assets.length === 0 ? 'hidden' : ''}`}>
            <div className="p-3 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md border-b border-white/30 dark:border-white/5 text-xs text-center text-slate-500 dark:text-slate-400 flex justify-between items-center font-medium">
                <span className="bg-white/30 dark:bg-white/5 px-2 py-1 rounded-lg">{DATA_SOURCES.find(d => d.id === dataSource)?.label}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> {refreshInterval > 0 ? `${refreshInterval/1000}s` : 'Manual'}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                {filteredAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} isActive={asset.id === selectedAssetId} onClick={(a) => { setSelectedAssetId(a.id); setShowMobileDetail(true); }} />
                ))}
            </div>
        </aside>

        {/* Right Side Vertical Navigation */}
        {assets.length > 0 && (
            <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col gap-3">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`group flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl transition-all duration-300 ${activeCategory === cat.id ? 'text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-800/80 shadow-xl scale-110' : 'text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 hover:bg-white/70 dark:hover:bg-slate-800/70 backdrop-blur-xl'} backdrop-blur-xl border border-white/40 dark:border-white/10`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${activeCategory === cat.id ? 'bg-blue-500/10' : 'bg-transparent group-hover:bg-white/30'}`}>
                            <cat.icon size={24} className={activeCategory === cat.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                        </div>
                        <span className="text-[10px] font-bold tracking-wide">{cat.label}</span>
                    </button>
                ))}
            </div>
        )}

        <section className={`flex-1 flex flex-col h-full overflow-y-auto scrollbar-thin relative z-10 transition-opacity duration-300 p-4 sm:p-6 lg:p-10 ${showMobileDetail || assets.length === 0 || activeCategory === 'backend' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto'}`}>
            {activeCategory === 'backend' ? (
                 <AdminDashboard 
                    assets={assets} 
                    onDeleteAsset={removeAsset}
                    onAddAsset={() => setIsAddModalOpen(true)}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    refreshInterval={refreshInterval}
                    setRefreshInterval={setRefreshInterval}

                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    onResetAssets={resetAssets}
                    logs={logs}
                    onAddLog={addLog}
                 />
            ) : assets.length === 0 ? (
                // --- Welcome / Empty State ---
                <div className="flex flex-col items-center justify-center h-full sm:min-h-[600px] animate-fade-in text-center p-6">
                    <div className="relative w-32 h-32 mb-8 group">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse-slow group-hover:bg-blue-500/30 transition-all"></div>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/40 to-transparent dark:from-white/10 rounded-b-full backdrop-blur-sm"></div>
                        <div className="relative w-full h-full glass-card rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-white/40 transform group-hover:scale-105 transition-transform duration-500">
                             <Plus size={48} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">
                        开启您的财富追踪
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg mb-10 leading-relaxed">
                        您的投资组合当前为空。添加第一个基金或股票，实时监控净值涨跌与持仓收益。
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Plus size={24} strokeWidth={3} />
                            添加资产
                        </button>
                    </div>

                    <div className="mt-16 sm:mt-24 grid grid-cols-3 gap-8 sm:gap-16 opacity-60">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><Activity size={24} /></div>
                            <span className="text-xs font-bold text-slate-500">实时估值</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100/50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><PieChart size={24} /></div>
                            <span className="text-xs font-bold text-slate-500">持仓分析</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-100/50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600"><Zap size={24} /></div>
                            <span className="text-xs font-bold text-slate-500">毫秒级刷新</span>
                        </div>
                    </div>
                </div>
            ) : activeCategory === 'backend' ? (
                 <AdminDashboard 
                    assets={assets} 
                    onDeleteAsset={removeAsset}
                    onAddAsset={() => setIsAddModalOpen(true)}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    refreshInterval={refreshInterval}
                    setRefreshInterval={setRefreshInterval}

                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    onResetAssets={resetAssets}
                    logs={logs}
                    onAddLog={addLog}
                 />
            ) : selectedAsset ? (
                <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
                    <div className="sm:hidden flex items-center gap-3 mb-4">
                        <button onClick={() => setShowMobileDetail(false)} className="glass-button p-2 rounded-full"><ChevronLeft size={24} /></button>
                        <h2 className="font-bold text-lg">{selectedAsset.name}</h2>
                    </div>

                    <div className="glass-card rounded-[2rem] p-6 sm:p-10 relative overflow-hidden group">
                        {/* Shine Effect */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-400/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-colors duration-700"></div>

                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedAsset.name}</h1>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/40 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-white/20 backdrop-blur-sm shadow-sm">{selectedAsset.code}</span>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm backdrop-blur-sm ${marketStatus.color}`}>
                                        {marketStatus.icon} {marketStatus.spinning ? <span className="animate-pulse">{marketStatus.label}</span> : marketStatus.label}
                                    </div>
                                </div>
                                
                                <div className="flex items-baseline gap-6">
                                    <span className={`text-5xl sm:text-7xl font-bold font-sans tracking-tight drop-shadow-sm ${selectedAsset.currentValue - selectedAsset.yesterdayValue >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {selectedAsset.currentValue.toFixed(4)}
                                    </span>
                                    <div className={`flex flex-col items-start font-bold ${selectedAsset.currentValue - selectedAsset.yesterdayValue >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        <div className="text-lg flex items-center gap-1">
                                            {(selectedAsset.currentValue - selectedAsset.yesterdayValue) >= 0 ? <TrendingUp size={18} /> : <TrendingUp size={18} className="rotate-180" />}
                                            {(selectedAsset.currentValue - selectedAsset.yesterdayValue).toFixed(4)}
                                        </div>
                                        <div className="text-base opacity-80">
                                            {(selectedAsset.currentValue - selectedAsset.yesterdayValue) >= 0 ? '+' : ''}
                                            {((selectedAsset.currentValue - selectedAsset.yesterdayValue) / selectedAsset.yesterdayValue * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="glass-panel p-1.5 rounded-2xl flex gap-1 self-start sm:self-end shadow-inner bg-black/5 dark:bg-white/5 border-none">
                                {CHART_PERIODS.map(p => (
                                    <button key={p} onClick={() => setActiveChartPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${activeChartPeriod === p ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                        {activeChartPeriod === p && <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-blue-500/50 blur-[2px]"></span>}
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Add Portfolio Tracking Prompt - Prominent Position */}
                        {!selectedAsset.shares && !selectedAsset.costPrice && (
                            <div className="mt-6 glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-dashed border-blue-400 dark:border-blue-600 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:scale-[1.02] transition-transform cursor-pointer" onClick={openEditPortfolio}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                                        <PieChart size={28} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-1">添加持仓追踪</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">记录持有份额和成本价，实时查看盈亏情况</p>
                                    </div>
                                </div>
                                <button onClick={openEditPortfolio} className="glass-button px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30">
                                    <PieChart size={20} />
                                    立即添加
                                </button>
                            </div>
                        )}

                        <div className="mt-8 h-[360px] w-full">
                           <FundChart data={selectedAsset.history} color={selectedAsset.currentValue >= selectedAsset.yesterdayValue ? '#e11d48' : '#10b981'} emptyMessage={chartOverlayMessage} />
                        </div>
                    </div>

                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                         {(selectedAsset.category === 'fund' ? [
                             { label: '估值时间', value: selectedAsset.time?.substring(0, 16) || '--', icon: Clock },
                             { label: '单位净值', value: selectedAsset.unitNav?.toFixed(4) || '--', icon: Coins },
                             { label: '估值净值', value: selectedAsset.currentValue?.toFixed(4) || '--', icon: Activity },
                             { 
                                 label: '涨跌幅', 
                                 value: ((selectedAsset.currentValue - selectedAsset.yesterdayValue) / selectedAsset.yesterdayValue * 100).toFixed(2) + '%', 
                                 icon: TrendingUp,
                                 isChange: true,
                                 changeValue: (selectedAsset.currentValue - selectedAsset.yesterdayValue)
                             }
                         ] : [
                             { label: '今开', value: selectedAsset.open?.toFixed(4) || '--', icon: Zap },
                             { label: '昨收', value: selectedAsset.yesterdayValue?.toFixed(4) || '--', icon: Clock },
                             { label: '最高', value: selectedAsset.high?.toFixed(4) || '--', icon: ArrowUpRight },
                             { label: '最低', value: selectedAsset.low?.toFixed(4) || '--', icon: ArrowUpRight },
                         ]).map((stat, i) => (
                             <div key={i} className="glass-card p-5 rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                     <stat.icon size={14} className="opacity-70" /> {stat.label}
                                 </div>
                                 <div className={`text-2xl font-bold font-mono ${
                                     // @ts-ignore
                                     stat.isChange 
                                        // @ts-ignore
                                        ? (stat.changeValue >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')
                                        : 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                 } transition-colors`}>
                                     {stat.value}
                                 </div>
                             </div>
                         ))}
                    </div>



                    {/* Portfolio Profit/Loss Section */}
                    {selectedAsset.shares && selectedAsset.costPrice && (
                        <div className="glass-card p-6 sm:p-8 rounded-[2rem] space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                        <Banknote size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">持仓盈亏</h3>
                                </div>
                                <button onClick={openEditPortfolio} className="glass-button px-4 py-2 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                                    编辑持仓
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: '持有份额', value: selectedAsset.shares.toFixed(2), icon: PieChart },
                                    { label: '成本价', value: '¥' + selectedAsset.costPrice.toFixed(4), icon: Coins },
                                    { label: '当前市值', value: '¥' + (selectedAsset.shares * selectedAsset.currentValue).toFixed(2), icon: Banknote },
                                    { label: '持仓成本', value: '¥' + (selectedAsset.shares * selectedAsset.costPrice).toFixed(2), icon: Banknote },
                                ].map((stat, i) => (
                                    <div key={i} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                            <stat.icon size={14} className="opacity-70" /> {stat.label}
                                        </div>
                                        <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
                                            {stat.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className={`glass-card p-6 rounded-2xl flex flex-col items-center justify-center ${selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200/50 dark:border-rose-800/20' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/20'}`}>
                                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">盈亏金额</div>
                                    <div className={`text-4xl font-bold ${selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? '+' : ''}¥{(selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice)).toFixed(2)}
                                    </div>
                                </div>
                                <div className={`glass-card p-6 rounded-2xl flex flex-col items-center justify-center ${selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200/50 dark:border-rose-800/20' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/20'}`}>
                                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">盈亏比例</div>
                                    <div className={`text-4xl font-bold ${selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {selectedAsset.shares * (selectedAsset.currentValue - selectedAsset.costPrice) >= 0 ? '+' : ''}{((selectedAsset.currentValue - selectedAsset.costPrice) / selectedAsset.costPrice * 100).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Disclaimer / Announcement */}
                    <div className="mt-12 pt-8 border-t border-slate-200/50 dark:border-white/10 text-center space-y-2 pb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                             Disclaimer
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">数据源：实时估值与重仓直连东方财富，仅供个人学习及参考使用。</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">数据可能存在延迟，不作为任何投资建议 注：估算数据与真实结算数据会有1%左右误差</p>
                    </div>

                    {/* Fund Holdings Section */}
                    {selectedAsset.category === 'fund' && selectedAsset.holdings && selectedAsset.holdings.length > 0 && (
                        <div className="glass-card p-6 sm:p-8 rounded-[2rem] space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                                    <PieChart size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">前十持仓</h3>
                                <span className="text-xs text-slate-500 dark:text-slate-400">({selectedAsset.holdings.length}个)</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {selectedAsset.holdings.slice(0, 10).map((holding, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 flex flex-col items-center text-center hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{holding.name !== '--' ? holding.name : holding.code}</div>
                                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">{holding.code}</div>
                                        {holding.percent !== '--' && (
                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                                {holding.percent}%
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 pb-40">
                         <button onClick={() => removeAsset(selectedAsset.id)} className="glass-button text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 px-6 py-3 rounded-2xl transition-all font-bold flex items-center gap-2 group border-rose-200/50 dark:border-rose-800/20">
                             <X size={18} className="group-hover:rotate-90 transition-transform" /> 删除此资产
                         </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-24 h-24 bg-white/20 dark:bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md mb-6 animate-blob">
                        <Activity size={48} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-lg font-medium">Select an asset to view details</p>
                </div>
            )}
        </section>

        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
                <div className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/60">
                    <div className="p-5 border-b border-white/20 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">添加新资产</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 bg-white/40 dark:bg-slate-900/40">
                        <form onSubmit={handleSearch} className="relative mb-6">
                            <input type="text" placeholder="输入代码 / 名称 / 拼音" className="w-full glass-input rounded-2xl py-4 pl-12 pr-4 font-medium text-lg placeholder:text-slate-400/80 transition-all shadow-inner" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                            <Search className="absolute left-4 top-4.5 text-slate-500" size={20} />
                            {isSearching && <Loader2 className="absolute right-4 top-4.5 text-blue-500 animate-spin" size={20} />}
                        </form>
                        <div className="h-[320px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {searchResults.map((res, idx) => (
                                <button key={idx} disabled={isAdding} onClick={() => addAsset(res)} className="w-full text-left p-4 glass-card rounded-2xl hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all flex justify-between items-center group mb-2 border-0 hover:shadow-md hover:-translate-y-0.5 transform">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{res.name}</div>
                                        <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                            <span className="font-mono bg-slate-200/50 dark:bg-slate-600/50 px-1.5 py-0.5 rounded border border-slate-300/30">{res.code}</span>
                                            <span>{res.type}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                        <Plus size={20} />
                                    </div>
                                </button>
                            ))}
                            {!isSearching && searchQuery && searchResults.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                    <Search size={32} className="mb-2 opacity-30" />
                                    <span className="text-sm">未找到相关资产</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Portfolio Editing Modal */}
        {isEditPortfolioOpen && selectedAsset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in">
                <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/60">
                    <div className="p-5 border-b border-white/20 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">编辑持仓 - {selectedAsset.name}</h3>
                        <button onClick={() => setIsEditPortfolioOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 bg-white/40 dark:bg-slate-900/40 space-y-4">
                        {/* Image Upload for AI Recognition */}
                        <div className="glass-card p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/50">
                            <label className="flex flex-col items-center gap-3 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={isRecognizing}
                                />
                                <div className="flex items-center gap-3 w-full">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                                        {isRecognizing ? (
                                            <Loader2 className="animate-spin text-purple-600 dark:text-purple-400" size={24} />
                                        ) : (
                                            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-bold text-sm text-slate-800 dark:text-white">
                                            {isRecognizing ? 'AI识别中...' : '📸 上传持仓截图'}
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {isRecognizing ? '正在分析图片内容' : '自动识别金额和成本价'}
                                        </div>
                                    </div>
                                </div>
                            </label>
                            {recognitionError && (
                                <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                                    {recognitionError}
                                </div>
                            )}
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-2">
                             <button onClick={() => setPortfolioTab('add')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${portfolioTab === 'add' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                 加仓 / 买入
                             </button>
                             <button onClick={() => setPortfolioTab('modify')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${portfolioTab === 'modify' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                 修改 / 重置
                             </button>
                        </div>
                        
                        {portfolioTab === 'modify' && (
                            /* Modify Mode - Only show Image Upload here or both? Let's hide it for now to save space */
                            <div className="glass-card p-3 mb-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                 <div className="text-xs text-center text-slate-400">修改持仓数据将覆盖当前成本和份额</div>
                            </div>
                        )}

                        {/* Input Mode Toggle */}
                        <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-xl">
                            <button
                                onClick={() => setPortfolioInputMode('amount')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${portfolioInputMode === 'amount' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                💰 金额模式（推荐）
                            </button>
                            <button
                                onClick={() => setPortfolioInputMode('shares')}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${portfolioInputMode === 'shares' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                📊 份额模式
                            </button>
                        </div>

                        {portfolioInputMode === 'amount' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                        {portfolioTab === 'add' ? '买入金额（元）' : '总投入金额（元）'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-slate-400">¥</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full glass-input rounded-2xl py-3 pl-8 pr-4 font-mono font-bold text-lg placeholder:text-slate-400/80 transition-all shadow-inner"
                                            value={editingAmount}
                                            onChange={e => setEditingAmount(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">系统将自动扣除手续费后计算份额</p>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                            {portfolioTab === 'add' ? '买入净值' : '持仓成本价'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder={`当前: ${selectedAsset.currentValue}`}
                                            className="w-full glass-input rounded-2xl py-3 px-4 font-mono font-bold text-lg placeholder:text-slate-400/80 transition-all shadow-inner"
                                            value={editingCostPrice}
                                            onChange={e => setEditingCostPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">申购费率(%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.15"
                                                className="w-full glass-input rounded-2xl py-3 px-3 font-mono font-bold text-lg placeholder:text-slate-400/80 transition-all shadow-inner text-center"
                                                value={editingFeeRate}
                                                onChange={e => setEditingFeeRate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {editingAmount && editingCostPrice && parseFloat(editingAmount) > 0 && parseFloat(editingCostPrice) > 0 && (
                                    <div className="glass-card p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 animate-fade-in-up space-y-2">
                                        <div className="flex justify-between items-center pb-2 border-b border-blue-100 dark:border-blue-800/30">
                                            <div className="text-xs text-slate-500">计算明细</div>
                                            <div className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded">自动计算</div>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>预估手续费:</span>
                                            <span className="font-mono">¥{(parseFloat(editingAmount) * (parseFloat(editingFeeRate || '0') / 100)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>净申购金额:</span>
                                            <span className="font-mono">¥{(parseFloat(editingAmount) * (1 - parseFloat(editingFeeRate || '0') / 100)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-1">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {portfolioTab === 'add' ? '预估增加份额:' : '最终持有份额:'}
                                            </span>
                                            <div className="text-2xl font-bold text-slate-800 dark:text-white font-mono tracking-tight leading-none">
                                                {((parseFloat(editingAmount) * (1 - parseFloat(editingFeeRate || '0') / 100)) / parseFloat(editingCostPrice)).toFixed(2)} 
                                                <span className="text-sm text-slate-400 ml-1 font-normal">份</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">持有份额</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full glass-input rounded-2xl py-3 px-4 font-mono font-bold text-lg placeholder:text-slate-400/80 transition-all shadow-inner"
                                        value={editingShares}
                                        onChange={e => setEditingShares(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">持仓成本价（元）</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        placeholder={`当前净值: ${selectedAsset.currentValue}`}
                                        className="w-full glass-input rounded-2xl py-3 px-4 font-mono font-bold text-lg placeholder:text-slate-400/80 transition-all shadow-inner"
                                        value={editingCostPrice}
                                        onChange={e => setEditingCostPrice(e.target.value)}
                                    />
                                </div>
                                {editingShares && editingCostPrice && parseFloat(editingShares) > 0 && parseFloat(editingCostPrice) > 0 && (
                                    <div className="glass-card p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-700/50 animate-fade-in-up">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-xs text-slate-500">计算结果 (总投入)</div>
                                            <div className="text-xs text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded">自动计算</div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-white font-mono tracking-tight">
                                            <span className="text-lg mr-0.5">¥</span>
                                            {(parseFloat(editingShares) * parseFloat(editingCostPrice)).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        
                        <div className="flex gap-3 pt-6">
                            <button
                                onClick={() => setIsEditPortfolioOpen(false)}
                                className="flex-1 glass-button py-3.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5 transition-all text-sm"
                            >
                                取消
                            </button>
                            <button
                                onClick={savePortfolio}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                                保存并更新
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showSettings && (
            <div className="absolute top-20 right-6 z-40 w-72 glass-panel rounded-3xl shadow-2xl p-2 animate-in slide-in-from-top-4 border border-white/50 backdrop-blur-3xl">
                 <div className="p-4">
                     <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">数据源</div>
                     <div className="space-y-1">{DATA_SOURCES.map(ds => (<button key={ds.id} onClick={() => setDataSource(ds.id)} className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${dataSource === ds.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}>{ds.label}{dataSource === ds.id && <Check size={16} />}</button>))}</div>
                 </div>
                 <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent my-1"></div>
                 <div className="p-4">
                     <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">刷新频率</div>
                     <div className="space-y-1">{REFRESH_OPTIONS.map(opt => (<button key={opt.value} onClick={() => setRefreshInterval(opt.value)} className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${refreshInterval === opt.value ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}>{opt.label}{refreshInterval === opt.value && <Check size={16} />}</button>))}</div>
                 </div>
            </div>
        )}
      </main>

      {/* Admin Dashboard Overlay */}
      {showAdmin && (
          <div className="fixed inset-0 z-[100] bg-slate-100/90 dark:bg-black/90 backdrop-blur-xl transition-all animate-in slide-in-from-bottom-10 duration-500">
              <div className="absolute top-4 right-6 z-50">
                  <button 
                      onClick={() => setShowAdmin(false)}
                      className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-slate-800 dark:text-white transition-all shadow-lg border border-white/20"
                  >
                      <X size={24} />
                  </button>
              </div>
              <div className="h-full p-4 sm:p-8">
                  <AdminDashboard 
                      assets={assets}
                      onDeleteAsset={removeAsset}
                      onAddAsset={() => { setShowAdmin(false); setIsAddModalOpen(true); }}
                      dataSource={dataSource}
                      setDataSource={setDataSource}
                      refreshInterval={refreshInterval}
                      setRefreshInterval={setRefreshInterval}
                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                      onResetAssets={resetAssets}
                      logs={logs}
                      onAddLog={addLog}
                      onEditAsset={(asset) => { 
                          setSelectedAssetId(asset.id); // Also select it in the main view
                          setShowAdmin(false); 
                          openEditPortfolio(); // Try to use the existing helper, but need to ensure it uses the *passed* asset or updates selectedAsset first?
                          // Actually openEditPortfolio uses 'selectedAsset' state.
                          // So we simply set selectedAssetId, wait for effect? No, effects might be async/slow.
                          // Better: Just set the state and open.
                          // But we need to make sure 'selectedAsset' derived from 'selectedAssetId' is ready if we rely on it.
                          // However, 'selectedAsset' is `assets.find(a => a.id === selectedAssetId)`.
                          // So setting ID is enough for the next render.
                          // BUT openEditPortfolio reads selectedAsset immediately? 
                          // Let's modify openEditPortfolio to accept an asset optionally? 
                          // Or just manually do what openEditPortfolio does here inline.
                          
                          // Inline logic:
                          if (asset.shares && asset.costPrice) {
                              setPortfolioInputMode('shares');
                              setEditingShares(asset.shares.toString());
                              setEditingCostPrice(asset.costPrice.toString());
                              setEditingAmount((asset.shares * asset.costPrice).toFixed(2));
                          } else {
                              setPortfolioInputMode('amount');
                              setEditingShares('');
                              setEditingCostPrice('');
                              setEditingAmount('');
                          }
                          setIsEditPortfolioOpen(true);
                      }}
                  />
              </div>
          </div>
      )}
      
    </div>
  );
};

export default App;