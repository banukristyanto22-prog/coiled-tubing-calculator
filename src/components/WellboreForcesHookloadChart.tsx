import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Anchor,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Minus,
  TrendingDown,
  AlertTriangle,
  Layers,
  Sliders,
} from 'lucide-react';
import { FrictionTrendBadge } from './FrictionTrendBadge';
import { CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import {
  WellboreForcesResult,
  ftToM,
  lbfToKn,
} from '../utils/engineeringCalculations';

interface WellboreForcesHookloadChartProps {
  ct: CoiledTubingString;
  forcesInput: WellboreForcesInput;
  results: WellboreForcesResult;
  unitSystem: UnitSystem;
  onChangeFrictionCoefficient?: (frictionCoefficient: number) => void;
}

export const WellboreForcesHookloadChart: React.FC<WellboreForcesHookloadChartProps> = ({
  ct,
  forcesInput,
  results,
  unitSystem,
  onChangeFrictionCoefficient,
}) => {
  const isMetric = unitSystem === 'metric';
  const depthUnit = isMetric ? 'm' : 'ft';
  const forceUnit = isMetric ? 'kN' : 'klbf';
  const depthMult = isMetric ? 0.3048 : 1.0;
  const forceMult = isMetric ? 0.00444822 : 0.001; // kN or klbf

  const [orientation, setOrientation] = useState<'profile' | 'horizontal'>('profile');
  const [showBucklingLimits, setShowBucklingLimits] = useState<boolean>(true);
  const [showHookloads, setShowHookloads] = useState<boolean>(true);

  const { weightProfile, helicalLockupDepthFt, isLockedUp } = results;

  // Process data for Recharts
  const chartData = useMemo(() => {
    return weightProfile.map((p, idx) => {
      const depth = Number((p.depthFt * depthMult).toFixed(1));
      const tvd = p.tvdFt !== undefined ? Number((p.tvdFt * depthMult).toFixed(1)) : depth;
      const inc = p.inclinationDeg !== undefined ? Number(p.inclinationDeg.toFixed(1)) : 0;

      // Positive limits & forces
      const sinCritLbf = Math.abs(p.sinusoidalLimitLbf);
      const helCritLbf = Math.abs(p.helicalLimitLbf);

      // Signed forces: positive = tension, negative = compression/slackoff
      const slackoff = Number((p.slackoffLbf * forceMult).toFixed(2));
      const neutral = Number((p.neutralLbf * forceMult).toFixed(2));
      const pickup = Number((p.pickupLbf * forceMult).toFixed(2));

      // Compressive buckling limits plotted in force domain
      // In signed force domain, compression is negative: -sinCrit and -helCrit
      const sinLimitSigned = Number((-sinCritLbf * forceMult).toFixed(2));
      const helLimitSigned = Number((-helCritLbf * forceMult).toFixed(2));

      // In magnitude domain:
      const sinCritMag = Number((sinCritLbf * forceMult).toFixed(2));
      const helCritMag = Number((helCritLbf * forceMult).toFixed(2));
      const compForceMag = Number((Math.max(0, -p.slackoffLbf) * forceMult).toFixed(2));

      return {
        idx,
        depth,
        depthFt: p.depthFt,
        tvd,
        inc,
        // Signed loads (hookload style)
        slackoff,
        neutral,
        pickup,
        sinLimitSigned,
        helLimitSigned,
        // Magnitude style
        sinCritMag,
        helCritMag,
        compForceMag,
        rawSinLbf: sinCritLbf,
        rawHelLbf: helCritLbf,
        rawSlackoffLbf: p.slackoffLbf,
        isBhaSegment: !!p.isBhaSegment,
      };
    });
  }, [weightProfile, depthMult, forceMult]);

  const lockupUserDepth = isLockedUp && helicalLockupDepthFt ? Number((helicalLockupDepthFt * depthMult).toFixed(0)) : null;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const compLbf = Math.max(0, -d.rawSlackoffLbf);
    const isHelical = compLbf >= d.rawHelLbf;
    const isSinusoidal = compLbf >= d.rawSinLbf;

    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 z-50 max-w-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-sans">
          <span className="font-bold text-white">
            MD: {d.depth} {depthUnit}
          </span>
          <span className="text-[10px] text-slate-400">
            TVD: {d.tvd} {depthUnit} &bull; Inc: {d.inc}&deg;
          </span>
        </div>

        {/* Buckling Status Indicator */}
        <div className="flex items-center justify-between text-[11px] font-sans">
          <span className="text-slate-400">Buckling Status:</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isHelical
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : isSinusoidal
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            {isHelical ? 'Helical Lockup' : isSinusoidal ? 'Sinusoidal' : 'Safe / Stable'}
          </span>
        </div>

        {/* Force Values */}
        <div className="space-y-1 pt-1 text-[11px]">
          <div className="flex justify-between items-center text-amber-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-400 inline-block border-b border-dashed border-amber-400" />
              <span>Sinusoidal Limit (Fcrit):</span>
            </span>
            <span className="font-bold">
              {d.sinLimitSigned} {forceUnit}
            </span>
          </div>

          <div className="flex justify-between items-center text-rose-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-rose-500 inline-block" />
              <span>Helical Limit (Fhel):</span>
            </span>
            <span className="font-bold">
              {d.helLimitSigned} {forceUnit}
            </span>
          </div>

          <div className="border-t border-slate-800 pt-1 space-y-1">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Slack-off (RIH):</span>
              </span>
              <span className="font-bold">
                {d.slackoff} {forceUnit}
              </span>
            </div>

            <div className="flex justify-between items-center text-cyan-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Neutral Weight:</span>
              </span>
              <span className="font-bold">
                {d.neutral} {forceUnit}
              </span>
            </div>

            <div className="flex justify-between items-center text-amber-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Pick-up (POOH):</span>
              </span>
              <span className="font-bold">
                {d.pickup} {forceUnit}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Wellbore Forces &amp; Buckling Limits Profile</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-normal">
                Recharts Visualizer
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Hookload curves with Dawson-Paslay sinusoidal &amp; Wu helical buckling envelopes along depth
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Orientation Toggle */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('profile')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                orientation === 'profile'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Depth descending on vertical Y-axis (wellbore profile)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Profile View</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                orientation === 'horizontal'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Depth on horizontal X-axis"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Trend View</span>
            </button>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-2 text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-200">
              <input
                type="checkbox"
                checked={showBucklingLimits}
                onChange={(e) => setShowBucklingLimits(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>Buckling Limits</span>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300">
              <input
                type="checkbox"
                checked={showHookloads}
                onChange={(e) => setShowHookloads(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>Hookloads</span>
            </label>
          </div>
        </div>
      </div>

      {/* Dynamic Pipe-to-Wellbore Friction Factor Slider Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">Friction (&mu;):</span>
          <span className="font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/50">
            {forcesInput.frictionCoefficientCasing.toFixed(2)}
          </span>
          <FrictionTrendBadge frictionValue={forcesInput.frictionCoefficientCasing} size="xs" />
          <span className="text-[10px] text-slate-500 hidden xl:inline">
            (Shift in RIH slack-off into buckling limits)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm">
          <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 whitespace-nowrap" title="Low friction range (< 0.22)">
            <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" /> 0.10
          </span>
          <input
            type="range"
            min="0.10"
            max="0.40"
            step="0.01"
            value={forcesInput.frictionCoefficientCasing}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && onChangeFrictionCoefficient) {
                onChangeFrictionCoefficient(Number(val.toFixed(2)));
              }
            }}
            disabled={!onChangeFrictionCoefficient}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 focus:outline-none disabled:opacity-50"
            aria-label="Adjust pipe-to-wellbore friction factor"
          />
          <span className="flex items-center gap-0.5 text-[10px] font-mono text-rose-400 whitespace-nowrap" title="High friction range (> 0.26)">
            0.40 <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[0.12, 0.20, 0.24, 0.30, 0.40].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeFrictionCoefficient && onChangeFrictionCoefficient(preset)}
              disabled={!onChangeFrictionCoefficient}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors border ${
                Math.abs(forcesInput.frictionCoefficientCasing - preset) < 0.008
                  ? 'bg-cyan-600 text-white font-bold border-cyan-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {preset.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Chart Area */}
      <div className="relative w-full h-[460px] bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 select-none">
        <ResponsiveContainer width="100%" height="100%">
          {orientation === 'profile' ? (
            /* Vertical Wellbore Profile: X = Forces/Loads, Y = Depth (0 at surface, TD at bottom) */
            <ComposedChart
              layout="vertical"
              data={chartData}
              margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />

              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v}`}
                label={{
                  value: `Axial Load / Limit [${forceUnit}] (Negative = Compression, Positive = Tension)`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />

              <YAxis
                type="number"
                dataKey="depth"
                reversed={true}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v} ${depthUnit}`}
                domain={['dataMin', 'dataMax']}
                label={{
                  value: `Measured Depth [${depthUnit}]`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#94a3b8',
                  fontSize: 12,
                  offset: 10,
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Zero Reference Line (Neutral boundary) */}
              <ReferenceLine x={0} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Zero Axial Load', fill: '#64748b', fontSize: 10 }} />

              {/* Helical Lockup Reference Line */}
              {lockupUserDepth !== null && (
                <ReferenceLine
                  y={lockupUserDepth}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Lockup: ${lockupUserDepth} ${depthUnit}`,
                    fill: '#f43f5e',
                    position: 'insideBottomRight',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Sinusoidal Buckling Limit Line */}
              {showBucklingLimits && (
                <Line
                  dataKey="sinLimitSigned"
                  name="Sinusoidal Limit (Fcrit)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={350}
                  animationEasing="ease-out"
                  animationBegin={0}
                />
              )}

              {/* Helical Buckling Limit Line */}
              {showBucklingLimits && (
                <Line
                  dataKey="helLimitSigned"
                  name="Helical Limit (Fhel)"
                  stroke="#f43f5e"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={350}
                  animationEasing="ease-out"
                  animationBegin={0}
                />
              )}

              {/* Hookload Curves */}
              {showHookloads && (
                <>
                  {/* Slack-off / RIH */}
                  <Line
                    dataKey="slackoff"
                    name="Slack-off (RIH)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />

                  {/* Neutral */}
                  <Line
                    dataKey="neutral"
                    name="Neutral String Wt"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />

                  {/* Pick-up / POOH */}
                  <Line
                    dataKey="pickup"
                    name="Pick-up (POOH)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />
                </>
              )}
            </ComposedChart>
          ) : (
            /* Horizontal Trend View: X = Depth, Y = Forces/Loads */
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />

              <XAxis
                dataKey="depth"
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v}`}
                domain={['dataMin', 'dataMax']}
                label={{
                  value: `Measured Depth [${depthUnit}]`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />

              <YAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v} ${forceUnit}`}
                label={{
                  value: `Axial Load / Limit [${forceUnit}]`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#94a3b8',
                  fontSize: 12,
                  offset: 10,
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Zero Reference Line */}
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Zero Axial Load', fill: '#64748b', fontSize: 10 }} />

              {/* Lockup Reference Line */}
              {lockupUserDepth !== null && (
                <ReferenceLine
                  x={lockupUserDepth}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Lockup: ${lockupUserDepth} ${depthUnit}`,
                    fill: '#f43f5e',
                    position: 'insideTopLeft',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Sinusoidal Buckling Limit Line */}
              {showBucklingLimits && (
                <Line
                  dataKey="sinLimitSigned"
                  name="Sinusoidal Limit (Fcrit)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={350}
                  animationEasing="ease-out"
                  animationBegin={0}
                />
              )}

              {/* Helical Buckling Limit Line */}
              {showBucklingLimits && (
                <Line
                  dataKey="helLimitSigned"
                  name="Helical Limit (Fhel)"
                  stroke="#f43f5e"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={350}
                  animationEasing="ease-out"
                  animationBegin={0}
                />
              )}

              {/* Hookload Curves */}
              {showHookloads && (
                <>
                  <Line
                    dataKey="slackoff"
                    name="Slack-off (RIH)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />
                  <Line
                    dataKey="neutral"
                    name="Neutral String Wt"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />
                  <Line
                    dataKey="pickup"
                    name="Pick-up (POOH)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={350}
                    animationEasing="ease-out"
                    animationBegin={0}
                  />
                </>
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> RIH Slack-off
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Neutral Weight
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> POOH Pick-up
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-mono">
            <span className="w-3 h-0.5 bg-amber-400 inline-block border-b border-dashed border-amber-400" /> Fcrit (Sinusoidal Limit)
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-mono">
            <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Fhel (Helical Limit)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 text-[11px]">
            Surface Friction Drag: <strong className="text-white font-mono">{isMetric ? Math.round(lbfToKn(results.totalWellboreDragLbf)) + ' kN' : Math.round(results.totalWellboreDragLbf).toLocaleString() + ' lbf'}</strong> at TD
          </span>
        </div>
      </div>
    </div>
  );
};
