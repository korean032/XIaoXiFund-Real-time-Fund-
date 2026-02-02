import React from 'react';
import { Asset } from '../types';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface FundCardProps {
  fund: Asset;
  onClick: (fund: Asset) => void;
  isActive: boolean;
}

const FundCard: React.FC<FundCardProps> = ({ fund, onClick, isActive }) => {
  const change = fund.currentValue - fund.yesterdayValue;
  const percentChange = (change / fund.yesterdayValue) * 100;
  const isUp = change >= 0;
  
  // Modern Financial Colors
  const textTrend = isUp ? 'text-[#e11d48]' : 'text-[#10b981]'; // Rose-600 vs Emerald-500
  const bgTrend = isUp ? 'bg-[#fff1f2]' : 'bg-[#ecfdf5]';
  
  return (
    <div 
      onClick={() => onClick(fund)}
      className={`
        group relative p-4 cursor-pointer transition-all duration-300 border-b border-slate-100 last:border-0
        ${isActive ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'}
      `}
    >
      {/* Active Indicator Line */}
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />}

      <div className="flex justify-between items-center gap-4">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold truncate text-[15px] ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
              {fund.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
             <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{fund.code}</span>
             <span>{fund.type}</span>
          </div>
        </div>

        {/* Right Stats */}
        <div className="text-right">
          <div className={`text-[17px] font-bold font-mono leading-tight ${textTrend}`}>
            {fund.currentValue.toFixed(4)}
          </div>
          <div className={`inline-flex items-center justify-end gap-1 text-xs font-bold mt-1 px-1.5 py-0.5 rounded ${bgTrend} ${textTrend}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
            {Math.abs(percentChange).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundCard;