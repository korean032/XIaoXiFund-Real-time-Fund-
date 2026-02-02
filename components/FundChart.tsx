import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HistoryPoint } from '../types';

interface FundChartProps {
  data: HistoryPoint[];
  color: string;
  emptyMessage?: string;
}

// --- Constants ---
const GLOW_FILTER_ID = "glow-shadow";

const FundChart: React.FC<FundChartProps> = ({ data, color, emptyMessage }) => {
  
  // Dynamically calculate interval to keep X-axis clean
  const xInterval = useMemo(() => {
     if (!data || data.length === 0) return 'preserveStartEnd';
     const targetLabels = 6;
     if (data.length <= targetLabels) return 0; 
     const stride = Math.ceil(data.length / targetLabels);
     return Math.max(0, stride - 1);
  }, [data]);

  return (
    <div className="h-full w-full relative group">
      {/* Overlay for Not Open / Empty State */}
      {emptyMessage && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl overflow-hidden">
             {/* Blurred backdrop only for the overlay area */}
             <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-sm"></div>
             
             <div className="glass-panel px-6 py-3 rounded-full text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center gap-3 backdrop-blur-md relative z-20 shadow-lg border border-white/20">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                </span>
                {emptyMessage}
             </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 10,
            left: -10,
            bottom: 5, // Improved bottom margin for labels
          }}
        >
          <defs>
            <linearGradient id={`colorGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.5} />
              <stop offset="50%" stopColor={color} stopOpacity={0.1} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            
            {/* Glow Filter for the Line */}
            <filter id={GLOW_FILTER_ID} height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
              <feFlood floodColor={color} floodOpacity="0.4" result="offsetColor" />
              <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
              <feBlend in="SourceGraphic" in2="offsetBlur" mode="normal" />
            </filter>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
          
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            interval={xInterval}
            minTickGap={15} 
          />
          
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
            axisLine={false}
            tickLine={false}
            width={40}
            orientation="right" // Move Y-axis to right for better readability
            tickFormatter={(value) => value.toFixed(3)}
          />
          
          <Tooltip 
            cursor={{ stroke: color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                return (
                    <div className="glass-panel px-4 py-3 rounded-2xl shadow-xl border border-white/30 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-black/70">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-bold">{label}</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: color, color: color }}></span>
                            {Number(payload[0].value).toFixed(4)}
                        </p>
                    </div>
                );
                }
                return null;
            }}
          />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#colorGradient-${color})`} 
            animationDuration={1500}
            animationEasing="ease-in-out"
            filter={`url(#${GLOW_FILTER_ID})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FundChart;