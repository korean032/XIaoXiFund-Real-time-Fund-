import { Asset, DataSource, FundSearchResult, HistoryPoint } from "../types";

// --- Types ---
interface FundGZData {
  fundcode: string;
  name: string;
  jzrq: string; // Net Value Date
  dwjz: string; // Net Value (Unit NAV)
  gsz: string;  // Estimated Value
  gszzl: string; // Estimated Growth Rate
  gztime: string; // Estimation Time
}

// Cache for EastMoney static data (Sector/Type)
const eastMoneyMetadataCache = new Map<string, { type: string }>();

// --- Helpers ---

const loadScript = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    
    script.onload = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      resolve();
    };
    script.onerror = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      resolve(); 
    };
    
    document.body.appendChild(script);

    // Safety Timeout (8s)
    setTimeout(() => {
        if (document.body.contains(script)) {
            document.body.removeChild(script);
            resolve(); // Resolve to prevent hanging
        }
    }, 8000);
  });
};



const formatFundTime = (timeStr: string): string => {
    if (!timeStr) return "";
    // Input is usually YYYY-MM-DD HH:mm
    // We append :00 to make it standard
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr + ":00";
    }
    return timeStr;
};

const formatFullDateTime = (date: Date): string => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

const isTradingTime = (asset: Asset): boolean => {
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();

    // US Market
    if (asset.tags.includes('美股') || asset.tags.includes('NASDAQ') || (asset.apiCode && asset.apiCode.startsWith('us'))) {
         const isNight = minutes >= 21 * 60 + 30; 
         const isEarlyMorning = minutes <= 4 * 60; 
         if (day === 0) return false; 
         if (day === 6 && !isEarlyMorning) return false;
        return isNight || isEarlyMorning;
    }

    // CN Market
    if (day === 0 || day === 6) return false;

    if (asset.category === 'gold') return true;

    // A-Share / Fund (Close at 15:00)
    // HK (Close at 16:00)
    
    // Check if it's explicitly HK or US
    const isHK = asset.tags?.includes('港股') || asset.apiCode?.startsWith('hk');
    
    if (minutes >= 570 && minutes <= 690) return true; // 09:30 - 11:30 (Morning)
    
    // Afternoon: A-share/Funds end 15:00 (900), HK ends 16:00 (960)
    const closeTime = isHK ? 960 : 900;
    if (minutes >= 780 && minutes <= closeTime) return true; // 13:00 - Close

    return false;
};

// --- API Implementations ---

// Setup global EastMoney JSONP handler
const eastMoneyPendingRequests = new Map<string, (data: FundGZData) => void>();

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.jsonpgz = (data: FundGZData) => {
        const handler = eastMoneyPendingRequests.get(data.fundcode);
        if (handler) {
            handler(data);
            eastMoneyPendingRequests.delete(data.fundcode);
        }
    };
}

/**
 * Fetch Fund Real-time Valuation
 * Note: Funds only update estimated values (gsz) every minute or so, not every second.
 */
export const fetchFundEastMoney = async (code: string): Promise<{price: number, growth: number, time: string, unitNav?: number} | null> => {
  return new Promise((resolve) => {
    eastMoneyPendingRequests.set(code, (data) => {
      resolve({
        price: parseFloat(data.gsz), // Estimated Value
        growth: parseFloat(data.gszzl),
        time: formatFundTime(data.gztime),
        unitNav: parseFloat(data.dwjz)
      });
    });

    const timestamp = Date.now();
    loadScript(`https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`)
      .then(() => {
          // Cleanup map if callback wasn't triggered
          if (eastMoneyPendingRequests.has(code)) {
              eastMoneyPendingRequests.delete(code);
              resolve(null);
          }
      });
  });
};

// --- Helper for EastMoney Stock History ---
const fetchStockHistoryEastMoney = async (apiCode: string, period: number, count: number): Promise<HistoryPoint[]> => {
    const secid = getEastMoneySecId(apiCode);
    if (!secid) return [];

    return new Promise((resolve) => {
        const callbackName = `kline_cb_${Math.floor(Math.random() * 1000000)}`;
        // fields1=f1,f2... (status)
        // fields2=f51(date),f52(open),f53(close),f54(high),f55(low),f56(vol),f57(turnover),f58(amplitude)
        // klt=101(D),102(W),103(M)
        // fqt=1 (QFQ - Forward Adjusted)
        const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f53&klt=${period}&fqt=1&end=20500101&lmt=${count}&callback=${callbackName}&_=${Date.now()}`;
        
        // @ts-ignore
        window[callbackName] = (data: any) => {
            try {
                const klines = data?.data?.klines;
                if (klines && Array.isArray(klines)) {
                    const points = klines.map((item: string) => {
                        // Format: "2024-02-02,12.34" (Date, Close) - we only requested f51,f53
                        const parts = item.split(',');
                        return { time: parts[0], value: parseFloat(parts[1]) };
                    });
                    resolve(points);
                } else {
                    resolve([]);
                }
            } catch (e) {
                resolve([]);
            }
            // @ts-ignore
            window[callbackName] = () => {};
        };
        
        loadScript(url).catch(() => resolve([]));
        setTimeout(() => resolve([]), 5000);
    });
};

/**
 * Fetch Market Data (Stock/ETF/Index) from EastMoney
 */
export const fetchMarketEastMoney = async (apiCode: string): Promise<{price: number, preClose: number, open: number, high: number, low: number, time: string} | null> => {
    let secid = '';
    
    if (apiCode.includes('.')) {
        secid = apiCode; // e.g. 100.XAU
    } else {
        const code = apiCode.replace(/^(sh|sz)/, '');
        if (apiCode.startsWith('sh')) secid = `1.${code}`;
        else if (apiCode.startsWith('sz')) secid = `0.${code}`;
        else return null;
    }

    return new Promise((resolve) => {
        const callbackName = `em_stock_${Math.floor(Math.random() * 1000000)}`;
        // fields: f43=price, f60=preClose, f46=open, f44=high, f45=low, f86=time
        // Also adding f2 (price), f18 (preClose) just in case
        const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f2,f18,f43,f44,f45,f46,f60,f86&callback=${callbackName}&_=${Date.now()}`;
        
        // @ts-ignore
        window[callbackName] = (data: any) => {
            if (data && data.data) {
                const d = data.data;
                // Prefer f43/f60 but fallback to f2/f18
                let price = d.f43 && d.f43 !== '-' ? parseFloat(d.f43) : 0;
                if (!price && d.f2 && d.f2 !== '-') price = parseFloat(d.f2);
                
                let preClose = d.f60 && d.f60 !== '-' ? parseFloat(d.f60) : 0;
                if (!preClose && d.f18 && d.f18 !== '-') preClose = parseFloat(d.f18);

                const timeTs = d.f86; 
                let timeStr = '';
                if (timeTs) timeStr = formatFullDateTime(new Date(timeTs * 1000));

                resolve({
                    price, high: parseFloat(d.f44||0), low: parseFloat(d.f45||0), open: parseFloat(d.f46||0), preClose, time: timeStr
                });
            } else {
                resolve(null);
            }
            // @ts-ignore
            window[callbackName] = () => {};
        };
        
        loadScript(url).then(() => {
             // @ts-ignore
             if (window[callbackName]) {
                 // @ts-ignore
                 window[callbackName] = () => {};
                 resolve(null);
             }
        });
    });
};



// --- History & Sparkline ---

// Helper to determine EastMoney secid
const getEastMoneySecId = (code: string): string | null => {
    if (code.startsWith('sh') || code.startsWith('1.')) return `1.${code.replace(/^(sh|1\.)/, '')}`;
    if (code.startsWith('sz') || code.startsWith('0.')) return `0.${code.replace(/^(sz|0\.)/, '')}`;
    // Guess based on code format for simple logic if clean code passed
    if (/^6/.test(code)) return `1.${code}`;
    if (/^0|^3/.test(code)) return `0.${code}`;
    if (/^1/.test(code)) return `0.${code}`; // SZ ETFs often start with 159
    if (/^5/.test(code)) return `1.${code}`; // SH ETFs often start with 51
    return null;
};

const fetchIntradayEastMoney = async (apiCode: string): Promise<HistoryPoint[]> => {
    // Convert to secid
    const secid = getEastMoneySecId(apiCode);
    if (!secid) return [];

    return new Promise((resolve) => {
        const callbackName = `trends2_cb_${Math.floor(Math.random() * 1000000)}`;
        const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53&iscr=0&ndays=1&callback=${callbackName}&_=${Date.now()}`;
        
        // @ts-ignore
        window[callbackName] = (data: any) => {
            try {
                if (data && data.data && data.data.trends) {
                    const trends = data.data.trends;
                    const points = trends.map((item: string) => {
                        // Format: "2024-02-02 09:30,12.34,..."
                        const parts = item.split(',');
                        const dateTime = parts[0];
                        const dateParts = dateTime.split(' ');
                        const timeStr = dateParts[1].substring(0, 5); // HH:mm
                        const price = parseFloat(parts[1]); // Current Price
                        return { time: timeStr, value: price };
                    });
                    resolve(points);
                } else {
                    resolve([]);
                }
            } catch (e) {
                resolve([]);
            }
            // @ts-ignore
            window[callbackName] = () => {};
        };
        
        loadScript(url).catch(() => resolve([]));
        setTimeout(() => resolve([]), 3000);
    });
};

export const fetchAssetHistory = async (asset: Asset, period: string): Promise<HistoryPoint[]> => {
    // If asking for Intraday (分时), try to fetch real minute data from EastMoney
    if (period === '分时') {
        const apiCode = asset.apiCode || asset.code;
        
        // Initialize points array
        let points: HistoryPoint[] = [];
        
        // 1. Smart Fallback for OTC Funds
        // Direct EastMoney trends2 API only works for Exchange Traded assets (Stocks, ETFs)
        // It does NOT work for OTC funds (00xxxx) directly unless we map to an ETF/Index
        const isOTC = asset.category === 'fund' && !/^(sh|sz|1\.|0\.)/.test(apiCode);
        const looksLikeIndex = asset.name.includes('ETF') || asset.name.includes('联接') || asset.name.includes('指数') || asset.type?.includes('指数');
        
        if (isOTC && looksLikeIndex) {
            let searchName = asset.name
                .replace(/联接[A-Z]?/g, '') 
                .replace(/[A-Z]$/, '') 
                .replace(/发起式/g, '')
                .trim();
            
            if (searchName.length >= 2) {
                try {
                    const searchResults = await searchFunds(searchName);
                    // Find a matching STOCK/ETF (must be exchange traded: sh/sz)
                    const target = searchResults.find(r => 
                        r.code !== asset.code && 
                        (r.apiCode?.startsWith('sh') || r.apiCode?.startsWith('sz')) && 
                        (r.category === 'stock' || r.type?.includes('ETF') || r.type?.includes('指数'))
                    );

                    if (target) {
                        const etfCode = target.apiCode || target.code;
                        console.log(`[SmartChart] Mapping OTC ${asset.name} (${asset.code}) -> ETF ${target.name} (${etfCode})`);
                        // Use the mapped ETF code to fetch EastMoney trends
                        const etfPoints = await fetchIntradayEastMoney(etfCode);
                        
                        // Validate points quality (must have variation)
                        if (etfPoints.length > 5) {
                             const etfStart = etfPoints[0].value;
                             const fundBase = asset.yesterdayValue > 0 ? asset.yesterdayValue : asset.currentValue;
                             
                             if (fundBase > 0 && etfStart > 0) {
                                 const scale = fundBase / etfStart;
                                 points = etfPoints.map(p => ({
                                     time: p.time,
                                     value: p.value * scale
                                 }));
                             }
                        }
                    }
                } catch(e) {
                    console.warn('[SmartChart] Fallback search failed', e);
                }
            }
        }

        // 2. Direct Fetch (if not OTC or fallback failed, try direct anyway - likely only works for ETFs/Stocks)
        if (points.length === 0) {
             points = await fetchIntradayEastMoney(apiCode);
        }

        // 3. Validation: If we got garbage data (e.g. single point 1.0), discard it
        // OTC funds often return a single point of "1.0" or "0.0" from generic interfaces
        if (points.length < 5 && isOTC) {
            points = [];
        }

        if (points.length > 0) return points;

        // 4. Final Fallback: Straight line
        if (asset.yesterdayValue > 0 || asset.currentValue > 0) {
            const points: HistoryPoint[] = [];
            const start = new Date();
            start.setHours(9, 30, 0, 0);
            const close = new Date();
            close.setHours(15, 0, 0, 0);
            const val = asset.currentValue > 0 ? asset.currentValue : asset.yesterdayValue;
            for (let t = start.getTime(); t <= close.getTime(); t += 30 * 60000) {
                 const d = new Date(t);
                 const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                 points.push({ time: timeStr, value: val });
            }
            return points;
        }
        
        return [];
    }

    // Historical K-Line Logic (EastMoney)
    let emPeriod = 101; // Day
    let count = 320; 
    switch (period) {
        case '日K': emPeriod = 101; count = 120; break;
        case '周K': emPeriod = 102; count = 100; break;
        case '月K': emPeriod = 103; count = 60; break;
        case '1月': emPeriod = 101; count = 22; break; 
        case '3月': emPeriod = 101; count = 65; break;
        case '6月': emPeriod = 101; count = 130; break;
        case '1年': emPeriod = 101; count = 250; break;
    }

    if (asset.category === 'fund') {
         return fetchFundHistoryEastMoney(asset.code, count);
    } 
    
    // For Stocks/Indices/ETFs (EastMoney K-Line)
    const apiCode = asset.apiCode || asset.code;
    return fetchStockHistoryEastMoney(apiCode, emPeriod, count);
};

const fetchFundHistoryEastMoney = (code: string, count: number): Promise<HistoryPoint[]> => {
    return new Promise((resolve) => {
        const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
        loadScript(url).then(() => {
            // @ts-ignore
            const data = window.Data_netWorthTrend;
            if (data && Array.isArray(data)) {
                resolve(data.slice(-count).map((item: any) => {
                    const date = new Date(item.x);
                    const y = date.getFullYear();
                    const m = (date.getMonth()+1).toString().padStart(2, '0');
                    const d = date.getDate().toString().padStart(2, '0');
                    return { time: `${y}-${m}-${d}`, value: item.y };
                }));
            } else { resolve([]); }
        }).catch(() => resolve([]));
    });
};

export const fetchFundHoldings = (code: string): Promise<{ code: string; name: string; percent: string }[]> => {
    return new Promise((resolve) => {
        const timestamp = Date.now();
        const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=${timestamp}`;
        
        // @ts-ignore
        window.apidata = undefined;

        loadScript(url).then(() => {
            // @ts-ignore
            const data = window.apidata;
            
            console.log('Fund Holdings API Response:', data); // Debug log
            
            if (data && data.content) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data.content, 'text/html');
                    const rows = doc.querySelectorAll('tbody tr'); // More specific selector
                    
                    console.log('Found rows:', rows.length); // Debug log
                    
                    const holdings: { code: string; name: string; percent: string }[] = [];
                    const seenCodes = new Set<string>();
                    
                    // Process all rows (no header skip since we're using tbody)
                    for (let i = 0; i < rows.length; i++) {
                        if (holdings.length >= 10) break;

                        const cols = rows[i].querySelectorAll('td');
                        if (cols.length >= 3) {
                            // Typically: 0=序号, 1=股票代码, 2=股票名称, 3+=其他数据包括占比
                            const codeTxt = cols[1]?.textContent?.trim() || '';
                            const nameTxt = cols[2]?.textContent?.trim() || '';
                            
                            if (codeTxt && nameTxt && !seenCodes.has(codeTxt)) {
                                seenCodes.add(codeTxt);
                                
                                // Find percentage - look for % symbol
                                let percentTxt = '';
                                for (let j = 3; j < cols.length; j++) {
                                    const txt = cols[j].textContent?.trim() || '';
                                    if (txt.includes('%')) {
                                        percentTxt = txt.replace('%', '').trim();
                                        break;
                                    }
                                }
                                
                                holdings.push({
                                    code: codeTxt,
                                    name: nameTxt,
                                    percent: percentTxt || '--'
                                });
                            }
                        }
                    }
                    
                    console.log('Parsed holdings:', holdings); // Debug log
                    resolve(holdings);
                } catch (e) {
                    console.error('Error parsing holdings:', e);
                    resolve([]);
                }
            } else {
                console.log('No apidata.content found');
                resolve([]);
            }
        }).catch((e) => {
            console.error('Error loading holdings script:', e);
            resolve([]);
        });
    });
};


export const fetchAssetSparkline = async (asset: Asset): Promise<{sparkline: number[], percent: number} | null> => {
    const history = await fetchAssetHistory(asset, '1月');
    if (!history || history.length < 2) return null;
    const values = history.map(h => h.value);
    const start = values[0];
    const end = values[values.length - 1];
    return { sparkline: values, percent: start !== 0 ? ((end - start) / start) * 100 : 0 };
};

export const searchFunds = (query: string): Promise<FundSearchResult[]> => {
    return new Promise((resolve) => {
        const callbackName = `searchCallback_${Math.floor(Math.random() * 1000000)}`;
        
        // @ts-ignore
        window[callbackName] = (data: any) => {
            let list: any[] = [];
            if (data && data.Datas) list = data.Datas;
            else if (data && data.data) list = data.data; 

            const results: FundSearchResult[] = list.map((item: any) => {
                const categoryType = item.CATEGORYDESC || item.AssetType || "基金"; 
                let myCategory = 'fund';
                let apiCode = item.CODE;

                if (categoryType.includes("股票") || categoryType.includes("A股")) myCategory = 'stock';
                else if (categoryType.includes("指数") && !categoryType.includes("基金")) myCategory = 'index';
                
                if (myCategory === 'stock' || myCategory === 'index') {
                    if (item.MKT === '1' || item.CODE.startsWith('6')) apiCode = `sh${item.CODE}`;
                    else apiCode = `sz${item.CODE}`;
                }

                return {
                    code: item.CODE,
                    name: item.NAME,
                    type: categoryType,
                    category: myCategory,
                    apiCode: apiCode
                };
            });
            resolve(results);
            // @ts-ignore
            window[callbackName] = () => {};
        };
        
        const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(query)}&callback=${callbackName}&_=${Date.now()}`;
        loadScript(url).catch(() => resolve([]));
        setTimeout(() => resolve([]), 5000);
    });
};

// --- Unified Service (Fast Loop) ---

// --- Unified Service (Fast Loop) ---

// Batch fetch market data from EastMoney (replacing Tencent)
// Supports A/H/US stocks and ETFs
export const fetchMarketEmBatch = async (assets: Asset[]): Promise<Map<string, Partial<Asset>>> => {
    const assetMap = new Map<string, Asset[]>(); // apiCode -> Assets
    
    // Group assets by secid
    assets.forEach(a => {
        if (!a.apiCode) return;
        let secid = getEastMoneySecId(a.apiCode);
        
        // Handle US stocks special case for EM: 105.Code for NASDAQ, 106.Code for NYSE, 107.Code for AMEX
        // But for simplicity, our app mostly uses 100.XAU. 
        // For standard US stocks, EastMoney uses 105 (NASDAQ) or 106 (NYSE). 
        // Without complex logic, we might struggle with US stocks batching.
        // Let's stick to A-shares and HK for batching primarily.
        
        if (secid) {
            if (!assetMap.has(secid)) assetMap.set(secid, []);
            assetMap.get(secid)?.push(a);
        }
    });

    const secids = Array.from(assetMap.keys());
    if (secids.length === 0) return new Map();

    const results = new Map<string, Partial<Asset>>();

    // Fetch in batches of ~20 to avoid URL length issues
    const BATCH_SIZE = 20;
    for (let i = 0; i < secids.length; i += BATCH_SIZE) {
        const batch = secids.slice(i, i + BATCH_SIZE);
        const secidsStr = batch.join(',');
        
        const callbackName = `embatch_${Math.floor(Math.random() * 1000000)}`;
        // f12:code, f14:name, f2:price, f3:percent, f4:change, f18:close, f17:open, f15:high, f16:low, f49:time
        // Added f13 (market code) to help with matching
        const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secidsStr}&fields=f12,f13,f14,f2,f3,f4,f18,f17,f15,f16,f49&callback=${callbackName}&_=${Date.now()}`;
        
        await new Promise<void>(resolve => {
            // @ts-ignore
            window[callbackName] = (data: any) => {
                try {
                    if (data && data.data && data.data.diff) {
                         const list = data.data.diff;
                         const items = Array.isArray(list) ? list : Object.values(list);
                         
                         items.forEach((item: any) => {
                             // Robust matching logic
                             // item.f12 is the code (e.g. "000001" or 1)
                             // item.f13 is the market (e.g. 1 or 0)
                             
                             let code = String(item.f12).padStart(6, '0');
                             let market = String(item.f13);
                             
                             // Construct the secid from the response to match our map keys
                             // EM Market Codes: 0=SZ, 1=SH
                             const itemSecId = `${market}.${code}`;
                             
                             // Try direct match first
                             let assets = assetMap.get(itemSecId);
                             
                             // Fallback: iterate batch if strict match fails (handling edge cases)
                             if (!assets) {
                                 batch.forEach(batchedSecId => {
                                     // Check if code matches at least
                                     if (batchedSecId.endsWith(`.${code}`)) {
                                         // If we have market available, check it too
                                         if (batchedSecId.startsWith(`${market}.`)) {
                                             assets = assetMap.get(batchedSecId);
                                         }
                                     }
                                 });
                             }

                             if (assets) {
                                 assets.forEach(asset => {
                                     const price = (item.f2 !== '-' && item.f2 !== null) ? item.f2 : asset.currentValue;
                                     const preClose = (item.f18 !== '-' && item.f18 !== null) ? item.f18 : asset.yesterdayValue;
                                     
                                     // Time handling: f49 is often just int date or 0.
                                     // Let's rely on client time if data is fresh, or formatted time if available.
                                     let timeStr = asset.time;
                                     if (price !== asset.currentValue) {
                                          timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                     }

                                     results.set(asset.id, {
                                         currentValue: price,
                                         yesterdayValue: preClose,
                                         open: (item.f17 !== '-' && item.f17 !== null) ? item.f17 : undefined,
                                         high: (item.f15 !== '-' && item.f15 !== null) ? item.f15 : undefined,
                                         low: (item.f16 !== '-' && item.f16 !== null) ? item.f16 : undefined,
                                         time: timeStr
                                     });
                                 });
                             }
                         });
                    }
                } catch(e) {
                    console.error('EM Batch Parse Error', e);
                }
                resolve();
            };
            loadScript(url).catch(() => resolve());
            setTimeout(() => resolve(), 5000); // Increased timeout to 5s
        });
    }
    
    return results;
};

export const updateAssetsWithRealData = async (
    assets: Asset[], 
    dataSource: DataSource = 'EastMoney',
    updateHistory: boolean = true 
): Promise<Asset[]> => {
    
    // NOTE: dataSource argument is now ignored, we enforce EastMoney
    
    const updates = new Map<string, Partial<Asset>>();
    
    const funds = assets.filter(a => a.category === 'fund');
    // For stocks/indices/gold, we use the new batch fetch
    const marketAssets = assets.filter(a => a.category !== 'fund');

    // 1. Fetch Funds (EastMoney Fund API)
    const fundPromises = funds.map(async (fund) => {
        if (!fund.apiCode) return;
        try {
            const data = await fetchFundEastMoney(fund.apiCode);
            if (data) {
                let yesterdayValue = fund.yesterdayValue;
                // If we have growth, we can back-calculate approximate yesterday value if missing
                if (data.growth !== undefined && data.price) {
                    yesterdayValue = data.price / (1 + data.growth / 100);
                }
                
                updates.set(fund.id, {
                    currentValue: data.price,
                    yesterdayValue: yesterdayValue,
                    unitNav: data.unitNav || fund.unitNav,
                    time: data.time
                });
            }
        } catch (e) {}
    });

    // 2. Fetch Market Assets (Batch EastMoney)
    const marketPromise = (async () => {
         // Attempt Batch Fetch
         const marketUpdates = await fetchMarketEmBatch(marketAssets);
         marketUpdates.forEach((v, k) => updates.set(k, v));
         
         // 3. Fallback: If any asset was NOT updated by batch, try single fetch
         // This is crucial for Indices or specific assets that might fail in batch
         const missingAssets = marketAssets.filter(a => !updates.has(a.id));
         if (missingAssets.length > 0) {
             console.log(`[FinanceService] Fallback fetch for ${missingAssets.length} assets:`, missingAssets.map(a => a.name));
             await Promise.all(missingAssets.map(async (asset) => {
                 if (!asset.apiCode) return;
                 try {
                     const data = await fetchMarketEastMoney(asset.apiCode);
                     if (data) {
                         updates.set(asset.id, {
                             currentValue: data.price,
                             yesterdayValue: data.preClose,
                             open: data.open,
                             high: data.high,
                             low: data.low,
                             time: data.time
                         });
                     } else {
                         // Double Fallback: Try a hardcoded EastMoney Index API for known indices if standard single fetch fails
                         // This is specifically for things like "000001" (ShangZheng)
                         if (asset.category === 'index') {
                             // Attempt to use the 'hq.sinajs.cn' style but from EastMoney mirror or similar? 
                             // Actually, let's just try to be more lenient with the single fetch fields.
                         }
                     }
                 } catch(e) {
                     console.warn(`[FinanceService] Fallback failed for ${asset.name}`, e);
                 }
             }));
         }
    })();

    await Promise.all([...fundPromises, marketPromise]);
    
    // G1/G2 Cross calculation (Gold)
    const g1 = assets.find(a => a.id === 'g1');
    const g1Update = updates.get('g1');
    const g2 = assets.find(a => a.id === 'g2');
    if (g2 && g1) {
        const cp = g1Update?.currentValue || g1.currentValue;
        const pp = g1Update?.yesterdayValue || g1.yesterdayValue;
        if (cp && pp) {
                updates.set(g2.id, { 
                    currentValue: g2.yesterdayValue * (cp/pp), 
                    time: g1Update?.time || g2.time 
                });
        }
    }

    return assets.map(asset => {
        const update = updates.get(asset.id);
        if (!update) return asset;
        let newHistory = asset.history;
        if (updateHistory && update.currentValue && isTradingTime(asset)) {
            const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            newHistory = [...asset.history];
            const last = newHistory[newHistory.length-1];
            if (last && last.time === nowStr) {
                newHistory[newHistory.length-1] = { time: nowStr, value: update.currentValue };
            } else {
                newHistory.push({ time: nowStr, value: update.currentValue });
            }
        }
        return { ...asset, ...update, history: newHistory };
    });
};

// --- Cloudflare KV Sync ---

// --- User Identity ---
const getCurrentUserId = (): string => {
    if (typeof window !== 'undefined') {
        let uid = localStorage.getItem('xiaoxi_uid');
        if (!uid) {
            uid = Math.random().toString(36).substring(2, 10);
            localStorage.setItem('xiaoxi_uid', uid);
        }
        return uid;
    }
    return 'default';
};

export const persistIntradayData = async (assets: Asset[]): Promise<Asset[]> => {
    console.log('[Persistence] Starting full intraday backfill...');
    const updated = await Promise.all(assets.map(async (asset) => {
        // Only fetch for relevant types
        if (asset.category === 'fund' && !/^(sh|sz)/.test(asset.code)) return asset; // Skip OTC funds for now unless mapped
        
        try {
            const points = await fetchAssetHistory(asset, '分时');
            if (points && points.length > 0) {
                return { ...asset, history: points, lastHistoryDate: new Date().toDateString() };
            }
        } catch (e) {
            console.warn(`[Persistence] Failed to backfill ${asset.name}`, e);
        }
        return asset;
    }));
    
    await saveRemoteAssets(updated);
    console.log('[Persistence] Complete.');
    return updated;
};

export const fetchRemoteAssets = async (): Promise<Asset[] | null> => {
    try {
        const uid = getCurrentUserId();
        const response = await fetch(`/api/assets?user=${uid}`);
        if (!response.ok) return null;
        const assets = await response.json();
        if (Array.isArray(assets) && assets.length > 0) {
            return assets;
        }
        return null;
    } catch (e) {
        console.error('Failed to fetch remote assets:', e);
        return null;
    }
};

export const saveRemoteAssets = async (assets: Asset[]): Promise<boolean> => {
    try {
        const uid = getCurrentUserId();
        const response = await fetch(`/api/assets?user=${uid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assets })
        });
        return response.ok;
    } catch (e) {
        console.error('Failed to save remote assets:', e);
        return false;
    }
};