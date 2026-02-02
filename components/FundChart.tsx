import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HistoryPoint } from '../types';

interface FundChartProps {
  data: HistoryPoint[];
  color: string;
  emptyMessage?: string;
}

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
             
             <div className="glass-panel px-6 py-3 rounded-full text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center gap-3 backdrop-blur-md relative z-20 shadow-lg">
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
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id={`colorGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Subtle grid lines */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={xInterval}
            minTickGap={10} 
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip 
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                return (
                    <div className="glass-panel px-4 py-3 rounded-xl shadow-xl border-white/40 dark:border-white/10">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">{label}</p>
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }}></span>
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
            animationDuration={800}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FundChart;