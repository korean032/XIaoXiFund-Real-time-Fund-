import React, { useEffect, useState, useRef } from 'react';
import { Asset } from '../types';
import { ArrowUp, ArrowDown, Clock, Tag, Banknote } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
  isActive: boolean;
}

const Sparkline = ({ data, isUp }: { data: number[], isUp: boolean }) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    
    // Smooth polyline
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2; // Padding 2px
        return `${x},${y}`;
    }).join(' ');

    const color = isUp ? '#f43f5e' : '#10b981';

    return (
        <svg width={width} height={height} className="overflow-visible opacity-80">
            <polyline 
                points={points} 
                fill="none" 
                stroke={color} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
            {/* End dot */}
            <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * (height - 4) - 2} r="2" fill={color} />
        </svg>
    );
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, isActive }) => {
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevValueRef = useRef(asset.currentValue);

  // Flash Effect Hook
  useEffect(() => {
    if (asset.currentValue !== prevValueRef.current) {
        if (asset.currentValue > prevValueRef.current) {
            setFlashColor('bg-rose-500/20 dark:bg-rose-500/30');
        } else if (asset.currentValue < prevValueRef.current) {
            setFlashColor('bg-emerald-500/20 dark:bg-emerald-500/30');
        }
        
        const timer = setTimeout(() => {
            setFlashColor(null);
        }, 600); // Flash duration

        prevValueRef.current = asset.currentValue;
        return () => clearTimeout(timer);
    }
  }, [asset.currentValue]);

  const change = asset.currentValue - asset.yesterdayValue;
  const percentChange = (change / asset.yesterdayValue) * 100;
  const isUp = change >= 0;
  
  // Refined Financial Colors (Slightly more vibrant for glass)
  const textTrend = isUp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'; 
  const bgTrend = isUp ? 'bg-rose-500/10 dark:bg-rose-500/20' : 'bg-emerald-500/10 dark:bg-emerald-500/20';
  
  // Sector Display
  const sectorDisplay = asset.sector || asset.type;

  return (
    <div 
      onClick={() => onClick(asset)}
      className={`
        glass-card relative p-4 cursor-pointer mb-3 rounded-2xl
        transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
        ${isActive ? 'glass-card-active' : ''}
        ${flashColor ? flashColor : ''}
      `}
    >
      {/* Active Glow Indicator */}
      {isActive && <div className="absolute left-1 top-3 bottom-3 w-1 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full" />}

      <div className="flex justify-between items-center gap-2 pl-2">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className={`font-bold truncate text-[15px] ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
              {asset.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
             {asset.category !== 'gold' && (
                <span className="text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md border border-white/40 dark:border-white/10">{asset.code}</span>
             )}
             
             {/* Related Sector / Type */}
             <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-white/40 dark:border-white/10 ${asset.category === 'gold' ? 'text-amber-700 dark:text-amber-300 bg-amber-100/40 dark:bg-amber-900/30' : 'text-blue-700 dark:text-blue-300 bg-blue-100/40 dark:bg-blue-900/30'}`}>
                {sectorDisplay}
             </span>

             {/* Extra Data (Main Force Money) */}
             {asset.extraData && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-white/40 dark:border-white/10 bg-white/50 dark:bg-slate-700/50 ${asset.extraData.color || 'text-slate-600 dark:text-slate-400'}`}>
                    <Banknote size={10} className="opacity-70" />
                    <span className="opacity-70 text-[10px]">{asset.extraData.label}</span>
                    <span className="font-bold">{asset.extraData.value}</span>
                </span>
             )}
          </div>
        </div>

        {/* Center: Sparkline (Hidden on very small screens, shown if data exists) */}
        {asset.sparkline && (
            <div className="hidden sm:flex flex-col items-end justify-center mr-2">
                 <Sparkline data={asset.sparkline} isUp={(asset.monthChangePercent || 0) >= 0} />
                 {typeof asset.monthChangePercent === 'number' && (
                    <span className={`text-[10px] font-bold mt-0.5 ${(asset.monthChangePercent || 0) >= 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        1月: {(asset.monthChangePercent > 0 ? '+' : '')}{asset.monthChangePercent.toFixed(1)}%
                    </span>
                 )}
            </div>
        )}

        {/* Right Stats */}
        <div className="text-right flex flex-col items-end min-w-[80px]">
          <div className={`text-[17px] font-bold font-mono leading-tight transition-colors duration-200 ${textTrend}`}>
            {asset.currentValue.toFixed(asset.category === 'index' ? 2 : 4)}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1.5">
             <div className={`inline-flex items-center justify-end gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${bgTrend} ${textTrend} border border-white/50 dark:border-white/10 shadow-sm`}>
                {isUp ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
                {Math.abs(percentChange).toFixed(2)}%
            </div>
          </div>
          
          {/* Portfolio P/L (New Section) */}
          {asset.shares && asset.shares > 0 && asset.costPrice && (
            <div className="mt-2 flex flex-col items-end animate-fade-in">
                {(() => {
                    const marketValue = asset.currentValue * asset.shares;
                    const totalCost = asset.costPrice * asset.shares;
                    const profit = marketValue - totalCost;
                    const profitRate = totalCost > 0 ? (profit / totalCost) * 100 : 0;
                    const isProfit = profit >= 0;
                    
                    return (
                        <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100 dark:border-white/5 pt-1.5 w-full">
                            <div className="flex justify-between items-center w-full text-[10px] text-slate-400">
                                <span>市值</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{marketValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center w-full text-[10px]">
                                <span className="text-slate-400">持有收益</span>
                                <div className="text-right">
                                    <span className={`font-bold ${isProfit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {isProfit ? '+' : ''}{profit.toFixed(2)}
                                    </span>
                                    <span className={`ml-1 opacity-80 ${isProfit ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        ({isProfit ? '+' : ''}{profitRate.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetCard;