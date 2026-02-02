
export type AssetCategory = 'fund' | 'index' | 'gold' | 'sector' | 'stock' | 'backend';
export type DataSource = 'EastMoney' | 'Tencent' | 'TianTian';

export interface HistoryPoint {
  time: string;
  value: number;
}

export interface Asset {
  id: string;
  category: AssetCategory;
  code: string; // Display code
  apiCode?: string; // External API code (e.g. sh000001)
  name: string;
  currentValue: number;
  yesterdayValue: number; // To calculate change
  history: HistoryPoint[];
  tags: string[];
  type: string; // Internal Sub-type e.g., 'Mixed', 'ETF'
  sector?: string; // Dynamic Sector/Category from Data Source (e.g. "白酒", "半导体", or "混合型")
  time?: string; // Last update time from API
  extraData?: {
    label: string;
    value: string;
    color?: string;
  }; 
  unitNav?: number; // Official Unit Net Asset Value (previous close)
  
  // New fields for list view trend
  sparkline?: number[]; // Array of values for the last 30 days (simplified)
  monthChangePercent?: number; // Calculated change over the sparkline period

  // New market detail fields
  open?: number;
  high?: number;
  low?: number;

  mainForceIn?: number;
  mainForceOut?: number;
  mainForceNet?: number;

  // Key Holdings
  holdings?: { code: string; name: string; percent: string }[];

  // Portfolio Tracking
  shares?: number;        // 持有份额
  costPrice?: number;     // 成本价（买入均价）
}

export interface GeminiAnalysis {
  summary: string;
  riskLevel: string;
  suggestion: string;
}

export interface FundSearchResult {
    code: string;
    name: string;
    type: string;
    category?: string; // 'fund' or 'stock'
    market?: string; // 'sh', 'sz', 'hk', 'us'
    apiCode?: string;
}

export type ChartPeriod = '分时' | '日K' | '周K' | '月K' | '1月' | '3月' | '6月' | '1年';

export interface MarketStatus {
    label: string;
    color: string;
    icon: any; 
    spinning: boolean;
}