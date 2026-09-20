import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ShieldAlert, Maximize2 } from 'lucide-react';
import { UnitSystem } from '../types/coiledTubing';
import { ftToM, lbfToKn } from '../utils/engineeringCalculations';

interface BucklingMiniProfilePlotProps {
  weightProfile: Array<{
    depthFt: number;
    sinusoidalLimitLbf: number;
    helicalLimitLbf: number;
    slackoffLbf: number;
    inclinationDeg?: number;
  }>;
  unitSystem: UnitSystem;
  height?: number;
  highlightDepthFt?: number | null;
  onSelectDepth?: (depthFt: number) => void;
  onOpenFullChart?: () => void;
}

export const BucklingMiniProfilePlot: React.FC<BucklingMiniProfilePlotProps> = ({
  weightProfile,
  unitSystem,
  height = 135,
  highlightDepthFt = null,
  onSelectDepth,
  onOpenFullChart,
}) => {
  const isMetric = unitSystem === 'metric';
  const depthUnit = isMetric ? 'm' : 'ft';
  const forceUnit = isMetric ? 'kN' : 'klbf';
  const depthMult = isMetric ? 0.3048 : 1.0;
  const forceMult = isMetric ? 0.00444822 : 0.001; // kN or klbf

  if (!weightProfile || weightProfile.length === 0) {
    return null;
  }

  // Sample or map data points to optimize rendering
  const data = weightProfile.map((p) => {
    const depth = Math.round(p.depthFt * depthMult);
    const sinCrit = Number((Math.abs(p.sinusoidalLimitLbf) * forceMult).toFixed(1));
    const helCrit = Number((Math.abs(p.helicalLimitLbf) * forceMult).toFixed(1));
    const compLoad = Number((Math.max(0, -p.slackoffLbf) * forceMult).toFixed(1));

    return {
      depth,
      depthFt: p.depthFt,
      sinCrit,
      helCrit,
      compLoad,
      rawSinLbf: Math.abs(p.sinusoidalLimitLbf),
      rawHelLbf: Math.abs(p.helicalLimitLbf),
      rawCompLbf: Math.max(0, -p.slackoffLbf),
      inc: p.inclinationDeg !== undefined ? Number(p.inclinationDeg.toFixed(1)) : 0,
    };
  });

  const highlightedDepthUser = highlightDepthFt !== null ? Math.round(highlightDepthFt * depthMult) : null;

  return (
    <div className="bg-slate-950/85 rounded-xl border border-amber-500/25 p-2.5 space-y-2 select-none">
      {/* Header bar with labels and expand action */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
            Buckling Limits Along Depth
          </span>
        </div>
        {onOpenFullChart && (
          <button
            type="button"
            onClick={onOpenFullChart}
            className="text-[9px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 transition-colors"
            title="Open comprehensive Recharts buckling evaluation"
          >
            <span>Full Plot</span>
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Main Recharts Sparkline */}
      <div style={{ height: `${height}px` }} className="w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 10, left: -16, bottom: 2 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0] && onSelectDepth) {
                const item = state.activePayload[0].payload;
                onSelectDepth(item.depthFt);
              }
            }}
          >
            <XAxis
              dataKey="depth"
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const isHelical = d.rawCompLbf >= d.rawHelLbf;
                const isSinusoidal = d.rawCompLbf >= d.rawSinLbf;

                return (
                  <div className="bg-slate-950/95 border border-slate-700 rounded-lg p-2 text-[10px] font-mono shadow-xl backdrop-blur-md space-y-1 z-50">
                    <div className="flex items-center justify-between text-white font-sans font-bold border-b border-slate-800 pb-1 gap-2">
                      <span>MD: {d.depth} {depthUnit}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Inc: {d.inc}°</span>
                    </div>
                    <div className="flex justify-between gap-3 text-rose-400">
                      <span>Helical (Fhel):</span>
                      <span className="font-bold">{d.helCrit} {forceUnit}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-amber-300">
                      <span>Sinusoidal (Fcrit):</span>
                      <span className="font-bold">{d.sinCrit} {forceUnit}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-cyan-300">
                      <span>Compressive:</span>
                      <span className="font-bold">{d.compLoad} {forceUnit}</span>
                    </div>
                    <div className="pt-0.5 border-t border-slate-800 text-[9px] font-sans">
                      <span
                        className={`font-semibold ${
                          isHelical
                            ? 'text-rose-400'
                            : isSinusoidal
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isHelical ? '● Helical Lockup Risk' : isSinusoidal ? '● Sinusoidal Buckling' : '● Stable / Safe'}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Current Probe / Marker Depth Reference Line */}
            {highlightedDepthUser !== null && (
              <ReferenceLine
                x={highlightedDepthUser}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            )}

            {/* Helical Limit Line (Wu) */}
            <Line
              type="monotone"
              dataKey="helCrit"
              name="Helical (Fhel)"
              stroke="#f43f5e"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={true}
              animationDuration={350}
              animationEasing="ease-out"
              animationBegin={0}
            />

            {/* Sinusoidal Limit Line (Dawson-Paslay) */}
            <Line
              type="monotone"
              dataKey="sinCrit"
              name="Sinusoidal (Fcrit)"
              stroke="#fbbf24"
              strokeWidth={1.8}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={true}
              animationDuration={350}
              animationEasing="ease-out"
              animationBegin={0}
            />

            {/* Compressive Load Line */}
            <Line
              type="monotone"
              dataKey="compLoad"
              name="Compressive Force"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={350}
              animationEasing="ease-out"
              animationBegin={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Badges */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
        <span className="flex items-center gap-1 text-rose-400">
          <span className="w-2 h-0.5 bg-rose-500 inline-block" />
          <span>Fhel</span>
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-0.5 bg-amber-400 inline-block border-b border-dashed border-amber-400" />
          <span>Fcrit</span>
        </span>
        <span className="flex items-center gap-1 text-cyan-400">
          <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
          <span>Comp Load</span>
        </span>
        <span className="text-slate-500 text-[8.5px]">[{forceUnit} vs {depthUnit}]</span>
      </div>
    </div>
  );
};
