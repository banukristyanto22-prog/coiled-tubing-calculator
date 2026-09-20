import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot
} from 'recharts';
import {
  TrendingUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Gauge,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { CalculationHistoryEntry, UnitSystem } from '../types/coiledTubing';
import {
  psiToMpa,
  lbfToKn,
  inToMm
} from '../utils/engineeringCalculations';
import { evaluateCalculationSafety } from '../utils/safetyEvaluator';

export type TrendParameterKey = 'burst' | 'collapse' | 'tensile' | 'wall' | 'fatigue';

interface ParameterConfig {
  key: TrendParameterKey;
  label: string;
  shortLabel: string;
  unitImperial: string;
  unitMetric: string;
  color: string;
  gradientId: string;
  extractValue: (entry: CalculationHistoryEntry, isMetric: boolean) => number;
  formatValue: (val: number, isMetric: boolean) => string;
}

const PARAMETER_CONFIGS: Record<TrendParameterKey, ParameterConfig> = {
  burst: {
    key: 'burst',
    label: 'API Burst Pressure',
    shortLabel: 'Burst',
    unitImperial: 'psi',
    unitMetric: 'MPa',
    color: '#06b6d4', // cyan-500
    gradientId: 'burstGrad',
    extractValue: (entry, isMetric) => {
      const psi = entry.metrics.apiBurstPressurePsi || 0;
      return isMetric ? Number(psiToMpa(psi).toFixed(1)) : Math.round(psi);
    },
    formatValue: (val, isMetric) =>
      isMetric ? `${val.toFixed(1)} MPa` : `${Math.round(val).toLocaleString()} psi`,
  },
  collapse: {
    key: 'collapse',
    label: 'Collapse Pressure',
    shortLabel: 'Collapse',
    unitImperial: 'psi',
    unitMetric: 'MPa',
    color: '#f59e0b', // amber-500
    gradientId: 'collapseGrad',
    extractValue: (entry, isMetric) => {
      const psi = entry.metrics.collapsePressurePsi || 0;
      return isMetric ? Number(psiToMpa(psi).toFixed(1)) : Math.round(psi);
    },
    formatValue: (val, isMetric) =>
      isMetric ? `${val.toFixed(1)} MPa` : `${Math.round(val).toLocaleString()} psi`,
  },
  tensile: {
    key: 'tensile',
    label: 'Tensile Yield Strength',
    shortLabel: 'Tensile',
    unitImperial: 'klbf',
    unitMetric: 'kN',
    color: '#a855f7', // purple-500
    gradientId: 'tensileGrad',
    extractValue: (entry, isMetric) => {
      const lbf = entry.metrics.tensileYieldLbf || 0;
      return isMetric
        ? Number(lbfToKn(lbf).toFixed(1))
        : Number((lbf / 1000).toFixed(1));
    },
    formatValue: (val, isMetric) =>
      isMetric ? `${val.toFixed(1)} kN` : `${val.toFixed(1)} klbf`,
  },
  wall: {
    key: 'wall',
    label: 'Wall Thickness',
    shortLabel: 'Wall Thick',
    unitImperial: 'in',
    unitMetric: 'mm',
    color: '#10b981', // emerald-500
    gradientId: 'wallGrad',
    extractValue: (entry, isMetric) => {
      const wt = entry.stringSnapshot.wallThicknessIn || 0;
      return isMetric ? Number(inToMm(wt).toFixed(2)) : Number(wt.toFixed(3));
    },
    formatValue: (val, isMetric) =>
      isMetric ? `${val.toFixed(2)} mm` : `${val.toFixed(3)}"`,
  },
  fatigue: {
    key: 'fatigue',
    label: 'Estimated Fatigue Trips',
    shortLabel: 'Fatigue Life',
    unitImperial: 'trips',
    unitMetric: 'trips',
    color: '#f43f5e', // rose-500
    gradientId: 'fatigueGrad',
    extractValue: (entry) => {
      return entry.metrics.estimatedFatigueLifeTrips || 120;
    },
    formatValue: (val) => `${Math.round(val)} trips`,
  },
};

interface HistoryParameterTrendChartProps {
  entries: CalculationHistoryEntry[];
  unitSystem: UnitSystem;
  onSelectEntry?: (id: string) => void;
  selectedEntryId?: string | null;
}

export const HistoryParameterTrendChart: React.FC<HistoryParameterTrendChartProps> = ({
  entries,
  unitSystem,
  onSelectEntry,
  selectedEntryId,
}) => {
  const isMetric = unitSystem === 'metric';
  const [selectedParam, setSelectedParam] = useState<TrendParameterKey>('burst');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // We sort entries chronologically (oldest to newest) for a sensible chronological trend left-to-right
  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Clone and sort by timestamp ascending
    const chronological = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const config = PARAMETER_CONFIGS[selectedParam];

    return chronological.map((entry, idx) => {
      const val = config.extractValue(entry, isMetric);
      const safety = evaluateCalculationSafety(entry);
      const isPass = safety.status === 'pass';

      return {
        id: entry.id,
        index: idx + 1,
        title: entry.title,
        displayTime: entry.displayTime,
        value: val,
        formattedValue: config.formatValue(val, isMetric),
        unit: isMetric ? config.unitMetric : config.unitImperial,
        grade: entry.stringSnapshot.grade,
        od: entry.stringSnapshot.outerDiameterIn,
        wt: entry.stringSnapshot.wallThicknessIn,
        isPass,
        safetyStatus: safety.label,
        governingCheck: safety.governingCheck,
        primaryViolation: safety.primaryViolation,
        maxUtilization: safety.maxUtilizationPercent,
        isSelected: selectedEntryId === entry.id,
      };
    });
  }, [entries, selectedParam, isMetric, selectedEntryId]);

  const config = PARAMETER_CONFIGS[selectedParam];

  // Calculate statistics (Min, Max, Avg, Trend delta)
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const diff = lastVal - firstVal;
    const pctChange = firstVal !== 0 ? (diff / firstVal) * 100 : 0;

    return {
      min,
      max,
      avg,
      firstVal,
      lastVal,
      diff,
      pctChange,
    };
  }, [chartData]);

  if (entries.length < 2) {
    return null; // Don't show trend chart if fewer than 2 snapshots exist
  }

  // Custom Dot renderer that highlights Pass (emerald) vs Fail (rose) and active selection
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;

    const isPass = payload.isPass;
    const isSelected = payload.isSelected;
    const fillColor = isPass ? '#10b981' : '#f43f5e';
    const strokeColor = isSelected ? '#ffffff' : '#0f172a';

    return (
      <g key={`dot-${payload.id}-${cx}-${cy}`}>
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill="none"
            stroke={config.color}
            strokeWidth={2}
            className="animate-ping opacity-75"
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 5.5 : 4}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1.5}
          className="transition-all hover:scale-125 cursor-pointer"
          onClick={() => onSelectEntry?.(payload.id)}
        />
      </g>
    );
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-inner font-sans mb-3">
      {/* Header with Title, Parameter Selector & Collapse Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${config.color}25`, color: config.color }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
              Parameter Trend
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {entries.length} snapshots comparison
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Param Picker */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
            {(['burst', 'collapse', 'tensile', 'wall'] as TrendParameterKey[]).map((paramKey) => {
              const pConf = PARAMETER_CONFIGS[paramKey];
              const isActive = selectedParam === paramKey;
              return (
                <button
                  key={paramKey}
                  type="button"
                  onClick={() => setSelectedParam(paramKey)}
                  className={`px-1.5 py-0.5 rounded transition-all font-mono ${
                    isActive
                      ? 'bg-slate-800 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={isActive ? { color: pConf.color } : {}}
                  title={`Track ${pConf.label}`}
                >
                  {pConf.shortLabel}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((p) => !p)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand trend chart' : 'Collapse trend chart'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Quick Stat Highlights */}
          {stats && (
            <div className="grid grid-cols-4 gap-1.5 py-1 px-2 bg-slate-900/60 rounded-lg border border-slate-800/60 text-[9px] font-mono mb-2">
              <div>
                <span className="text-slate-500 block">LATEST</span>
                <span className="text-white font-bold">
                  {config.formatValue(stats.lastVal, isMetric)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">MIN</span>
                <span className="text-slate-300">
                  {config.formatValue(stats.min, isMetric)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">MAX</span>
                <span className="text-slate-300">
                  {config.formatValue(stats.max, isMetric)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">SPREAD</span>
                <span
                  className={`font-bold flex items-center gap-0.5 ${
                    stats.diff > 0
                      ? 'text-emerald-400'
                      : stats.diff < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stats.diff > 0 ? (
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  ) : stats.diff < 0 ? (
                    <ArrowDownRight className="w-2.5 h-2.5" />
                  ) : (
                    <Minus className="w-2.5 h-2.5" />
                  )}
                  {Math.abs(stats.pctChange).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Recharts Mini Chart Area */}
          <div className="h-32 w-full pt-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 10, left: -24, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const payload = e.activePayload[0].payload;
                    if (payload && payload.id) {
                      onSelectEntry?.(payload.id);
                    }
                  }
                }}
              >
                <defs>
                  <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />

                <XAxis
                  dataKey="index"
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                  tickFormatter={(idx) => `#${idx}`}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />

                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 10000) return `${(val / 1000).toFixed(0)}k`;
                    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                    return `${val}`;
                  }}
                />

                {stats && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{
                      value: 'AVG',
                      position: 'right',
                      fill: '#64748b',
                      fontSize: 8,
                      fontFamily: 'monospace',
                    }}
                  />
                )}

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    const isPass = data.isPass;

                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-sans max-w-[220px]">
                        <div className="flex items-center justify-between gap-1 mb-1 border-b border-slate-800 pb-1">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">
                            Run #{data.index}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold flex items-center gap-0.5 ${
                              isPass
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isPass ? (
                              <ShieldCheck className="w-2.5 h-2.5" />
                            ) : (
                              <ShieldAlert className="w-2.5 h-2.5" />
                            )}
                            {data.safetyStatus}
                          </span>
                        </div>

                        <div className="font-bold text-white text-[11px] truncate mb-1">
                          {data.title}
                        </div>

                        <div className="flex items-baseline justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-400">{config.shortLabel}:</span>
                          <span className="font-bold" style={{ color: config.color }}>
                            {data.formattedValue}
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-400 font-mono border-t border-slate-800/80 pt-1 flex justify-between">
                          <span>{data.grade}</span>
                          <span>
                            {data.od}&quot; &bull; {data.wt}&quot;
                          </span>
                        </div>

                        {!isPass && data.primaryViolation && (
                          <div className="mt-1 text-[8.5px] text-rose-300 font-mono bg-rose-950/40 p-1 rounded border border-rose-800/40 line-clamp-2">
                            {data.primaryViolation}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  fill={`url(#${config.gradientId})`}
                  dot={renderCustomDot}
                  activeDot={{
                    r: 6,
                    fill: config.color,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend / Hint */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-900">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Pass</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Fail / Limit Exceeded</span>
              </span>
            </div>
            <span className="text-[8.5px] text-slate-400">Click dot to jump to entry</span>
          </div>
        </>
      )}
    </div>
  );
};
