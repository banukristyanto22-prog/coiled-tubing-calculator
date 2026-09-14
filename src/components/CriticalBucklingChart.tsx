import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  Area,
  ComposedChart
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  TrendingDown,
  Layers,
  ArrowDown,
  ArrowRight,
  Sliders,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import {
  calculateWellboreForces,
  ftToM,
  mToFt,
  lbfToKn,
  knToLbf,
  psiToMpa,
  WellboreForcesResult
} from '../utils/engineeringCalculations';

interface CriticalBucklingChartProps {
  ct: CoiledTubingString;
  forcesInput: WellboreForcesInput;
  unitSystem: UnitSystem;
}

export const CriticalBucklingChart: React.FC<CriticalBucklingChartProps> = ({
  ct,
  forcesInput,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';

  // Chart configuration controls
  const [orientation, setOrientation] = useState<'profile' | 'horizontal'>('profile'); // profile = depth on Y-axis (vertical wellbore style)
  const [viewMode, setViewMode] = useState<'magnitude' | 'fullEnvelope'>('magnitude'); // magnitude = positive buckling capacity vs compressive load
  const [showSinusoidal, setShowSinusoidal] = useState(true);
  const [showHelical, setShowHelical] = useState(true);
  const [showActualLoad, setShowActualLoad] = useState(true);
  const [showSafeBuffer, setShowSafeBuffer] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Compute wellbore forces and buckling limits
  const forcesResult: WellboreForcesResult = useMemo(() => {
    return calculateWellboreForces(ct, forcesInput);
  }, [ct, forcesInput]);

  const { weightProfile, helicalLockupDepthFt, isLockedUp, criticalSinusoidalBucklingLbf, helicalBucklingThresholdLbf } = forcesResult;

  // Conversion helpers
  const depthMult = isMetric ? 0.3048 : 1.0;
  const depthUnit = isMetric ? 'm' : 'ft';
  const forceMult = isMetric ? 0.00444822 : 0.001; // kN or klbf
  const forceUnit = isMetric ? 'kN' : 'klbf';

  // Process data points for Recharts
  const chartData = useMemo(() => {
    return weightProfile.map((p, idx) => {
      const depth = Number((p.depthFt * depthMult).toFixed(1));
      const tvd = p.tvdFt !== undefined ? Number((p.tvdFt * depthMult).toFixed(1)) : depth;
      const inc = p.inclinationDeg !== undefined ? Number(p.inclinationDeg.toFixed(1)) : 0;
      const dls = p.dls !== undefined ? Number(p.dls.toFixed(2)) : 0;

      // Sinusoidal critical load (Dawson-Paslay)
      const sinCritLbf = Math.abs(p.sinusoidalLimitLbf);
      const helCritLbf = Math.abs(p.helicalLimitLbf);

      // Slack-off force: if slackoffLbf is negative, it indicates axial compression
      // In petroleum CT mechanics, compressive force F_comp = -p.slackoffLbf (when < 0)
      const slackoffRawLbf = p.slackoffLbf;
      const compForceLbf = Math.max(0, -slackoffRawLbf);

      // Buckling condition status
      let condition: 'Safe' | 'Sinusoidal' | 'Helical Lockup' = 'Safe';
      if (compForceLbf >= helCritLbf) {
        condition = 'Helical Lockup';
      } else if (compForceLbf >= sinCritLbf) {
        condition = 'Sinusoidal';
      }

      // Buffer threshold: 80% of sinusoidal limit
      const safeBufferLbf = sinCritLbf * 0.8;

      if (viewMode === 'magnitude') {
        return {
          idx,
          depth,
          depthFt: p.depthFt,
          tvd,
          inc,
          dls,
          sinusoidalCrit: Number((sinCritLbf * forceMult).toFixed(2)),
          helicalCrit: Number((helCritLbf * forceMult).toFixed(2)),
          safeBuffer: Number((safeBufferLbf * forceMult).toFixed(2)),
          compressiveForce: Number((compForceLbf * forceMult).toFixed(2)),
          slackoffForce: Number((slackoffRawLbf * forceMult).toFixed(2)),
          neutralForce: Number((p.neutralLbf * forceMult).toFixed(2)),
          pickupForce: Number((p.pickupLbf * forceMult).toFixed(2)),
          condition,
          rawSinusoidalLbf: sinCritLbf,
          rawHelicalLbf: helCritLbf,
          rawCompLbf: compForceLbf,
          isBhaSegment: !!p.isBhaSegment,
          segmentOdIn: p.segmentOdIn,
        };
      } else {
        // Full envelope mode: compression is negative, tension is positive
        return {
          idx,
          depth,
          depthFt: p.depthFt,
          tvd,
          inc,
          dls,
          sinusoidalLimit: Number((p.sinusoidalLimitLbf * forceMult).toFixed(2)),
          helicalLimit: Number((p.helicalLimitLbf * forceMult).toFixed(2)),
          slackoffForce: Number((p.slackoffLbf * forceMult).toFixed(2)),
          neutralForce: Number((p.neutralLbf * forceMult).toFixed(2)),
          pickupForce: Number((p.pickupLbf * forceMult).toFixed(2)),
          condition,
          rawSinusoidalLbf: sinCritLbf,
          rawHelicalLbf: helCritLbf,
          rawCompLbf: compForceLbf,
          isBhaSegment: !!p.isBhaSegment,
          segmentOdIn: p.segmentOdIn,
        };
      }
    });
  }, [weightProfile, depthMult, forceMult, viewMode]);

  // Overall statistics & key metrics
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const minSinCrit = Math.min(...chartData.map((d) => d.rawSinusoidalLbf));
    const maxSinCrit = Math.max(...chartData.map((d) => d.rawSinusoidalLbf));
    const minHelCrit = Math.min(...chartData.map((d) => d.rawHelicalLbf));
    const maxCompForce = Math.max(...chartData.map((d) => d.rawCompLbf));
    
    // Find point of minimum buckling margin
    let minMarginPct = 999;
    let worstDepth = 0;
    chartData.forEach((d) => {
      const margin = ((d.rawSinusoidalLbf - d.rawCompLbf) / (d.rawSinusoidalLbf || 1)) * 100;
      if (margin < minMarginPct) {
        minMarginPct = margin;
        worstDepth = d.depth;
      }
    });

    const hasSinusoidal = chartData.some((d) => d.condition === 'Sinusoidal' || d.condition === 'Helical Lockup');
    const hasHelical = chartData.some((d) => d.condition === 'Helical Lockup') || isLockedUp;

    return {
      minSinCrit,
      maxSinCrit,
      minHelCrit,
      maxCompForce,
      minMarginPct: Math.max(-100, minMarginPct),
      worstDepth,
      hasSinusoidal,
      hasHelical,
      lockupDepth: isLockedUp ? Number((helicalLockupDepthFt * depthMult).toFixed(0)) : null,
    };
  }, [chartData, isLockedUp, helicalLockupDepthFt, depthMult]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono max-w-xs space-y-2 z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-sans">
          <span className="font-bold text-white flex items-center gap-1.5">
            <span>MD: {data.depth} {depthUnit}</span>
          </span>
          <span className="text-[10px] text-slate-400">
            TVD: {data.tvd} {depthUnit} &bull; Inc: {data.inc}&deg;
          </span>
        </div>

        {/* Condition Status Badge */}
        <div className="flex items-center justify-between text-[11px] font-sans">
          <span className="text-slate-400">Status:</span>
          <div className="flex items-center gap-1.5">
            {data.isBhaSegment && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                BHA {data.segmentOdIn ? `${data.segmentOdIn}"` : ''}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                data.condition === 'Helical Lockup'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : data.condition === 'Sinusoidal'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {data.condition === 'Helical Lockup' ? 'Helical / Lockup' : data.condition === 'Sinusoidal' ? 'Sinusoidal Buckled' : 'Unbuckled (Stable)'}
            </span>
          </div>
        </div>

        <div className="space-y-1 pt-1 text-[11px]">
          <div className="flex justify-between items-center text-amber-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>Sinusoidal (F<sub>crit</sub>):</span>
            </span>
            <span className="font-bold">
              {viewMode === 'magnitude' ? data.sinusoidalCrit : data.sinusoidalLimit} {forceUnit}
            </span>
          </div>

          <div className="flex justify-between items-center text-rose-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Helical (F<sub>hel</sub>):</span>
            </span>
            <span className="font-bold">
              {viewMode === 'magnitude' ? data.helicalCrit : data.helicalLimit} {forceUnit}
            </span>
          </div>

          <div className="flex justify-between items-center text-cyan-300 border-t border-slate-800/80 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              <span>Slack-off Axial Load:</span>
            </span>
            <span className="font-bold">
              {data.slackoffForce} {forceUnit}
            </span>
          </div>

          {viewMode === 'magnitude' && (
            <div className="flex justify-between items-center text-slate-300">
              <span>Compressive Load:</span>
              <span className="font-bold text-amber-200">
                {data.compressiveForce} {forceUnit}
              </span>
            </div>
          )}

          {data.dls > 0 && (
            <div className="flex justify-between items-center text-slate-400 text-[10px] pt-0.5">
              <span>Dogleg Severity:</span>
              <span className="text-slate-300">{data.dls}&deg;/100ft</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl shadow-md transition-all flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 p-6 bg-slate-950 overflow-y-auto' : 'p-5'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Critical Buckling Load vs. Depth</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-normal">
                  Dawson-Paslay & Wu Limits
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation of sinusoidal buckling initiation ($F_{'{crit}'}$) and helical lockup threshold ($F_{'{hel}'}$) along trajectory
              </p>
            </div>
          </div>
        </div>

        {/* Action and Display Controls */}
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
              title="Standard wellbore profile with Depth descending on vertical Y-axis"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Wellbore Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                orientation === 'horizontal'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Depth on horizontal X-axis and Loads on vertical Y-axis"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Trend View</span>
            </button>
          </div>

          {/* View Mode: Capacity Magnitude vs Full Tension/Compression Envelope */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('magnitude')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'magnitude'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show positive Buckling Capacities vs Compressive Load"
            >
              Capacities
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fullEnvelope')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'fullEnvelope'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show full signed forces (negative = compression, positive = tension)"
            >
              Force Envelope
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          {/* Min Sinusoidal Threshold */}
          <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Min Sinusoidal (F<sub>crit</sub>)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-bold text-amber-400">
                {(stats.minSinCrit * forceMult).toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{forceUnit}</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              At TD / highest inclination
            </span>
          </div>

          {/* Helical Threshold */}
          <div className="bg-slate-950/70 border border-rose-500/20 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Helical Limit (F<sub>hel</sub>)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-bold text-rose-400">
                {(stats.minHelCrit * forceMult).toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{forceUnit}</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              2.828 &times; F<sub>crit</sub> threshold
            </span>
          </div>

          {/* Max Axial Compression */}
          <div className="bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Peak Slack-off Load
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-bold text-cyan-300">
                {(stats.maxCompForce * forceMult).toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{forceUnit}</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Max compressive force in RIH
            </span>
          </div>

          {/* Lockup Condition Status */}
          <div
            className={`rounded-xl p-3 border ${
              stats.hasHelical
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                : stats.hasSinusoidal
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold block mb-0.5 opacity-80">
              Buckling Status
            </span>
            <div className="flex items-center gap-1.5">
              {stats.hasHelical ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : stats.hasSinusoidal ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span className="font-bold text-xs uppercase tracking-wide">
                {stats.hasHelical ? 'Helical Lockup' : stats.hasSinusoidal ? 'Sinusoidal' : 'Safe / Stable'}
              </span>
            </div>
            <span className="text-[10px] opacity-80 block mt-0.5">
              {stats.lockupDepth
                ? `Lockup predicted at ${stats.lockupDepth} ${depthUnit}`
                : `Margin: ${stats.minMarginPct.toFixed(0)}% to Fcrit`}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Layer Checkboxes & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 bg-slate-950/90 rounded-lg border border-slate-800 text-xs mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-200">
            <input
              type="checkbox"
              checked={showSinusoidal}
              onChange={(e) => setShowSinusoidal(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-400 inline-block border-b-2 border-dashed border-amber-400" />
              <span>Sinusoidal Buckling (F<sub>crit</sub>)</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-rose-400 hover:text-rose-300">
            <input
              type="checkbox"
              checked={showHelical}
              onChange={(e) => setShowHelical(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span>Helical Buckling (F<sub>hel</sub>)</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 hover:text-cyan-200">
            <input
              type="checkbox"
              checked={showActualLoad}
              onChange={(e) => setShowActualLoad(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              <span>{viewMode === 'magnitude' ? 'Compressive Force (Slack-off)' : 'Slack-off Weight Curve'}</span>
            </span>
          </label>

          {viewMode === 'magnitude' && (
            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300">
              <input
                type="checkbox"
                checked={showSafeBuffer}
                onChange={(e) => setShowSafeBuffer(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-500/60 inline-block border-b border-dotted border-emerald-400" />
                <span>80% Working Safety Buffer</span>
              </span>
            </label>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          <span>Formula: </span>
          <span className="text-slate-300">F<sub>crit</sub> = 2&radic;[(EI&middot;w<sub>b</sub>sin&theta;)/r]</span>
        </div>
      </div>

      {/* Main Recharts Graph Container */}
      <div className={`w-full ${isFullscreen ? 'h-[580px]' : 'h-[440px]'} relative`}>
        <ResponsiveContainer width="100%" height="100%">
          {orientation === 'profile' ? (
            /* Vertical Wellbore Profile: X = Load, Y = Depth (reversed, 0 at top) */
            <ComposedChart
              layout="vertical"
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
              
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v}`}
                label={{
                  value: `Force [${forceUnit}]`,
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                type="number"
                dataKey="depth"
                reversed={true} // 0 at surface top, TD at bottom!
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

              {/* Zero Reference Line in Full Envelope mode */}
              {viewMode === 'fullEnvelope' && (
                <ReferenceLine x={0} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Neutral Axis', fill: '#64748b', fontSize: 10 }} />
              )}

              {/* Lockup Depth Reference Line */}
              {isLockedUp && forcesResult.helicalLockupDepthFt && (
                <ReferenceLine
                  y={Number((forcesResult.helicalLockupDepthFt * depthMult).toFixed(0))}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Helical Lockup: ${(forcesResult.helicalLockupDepthFt * depthMult).toFixed(0)} ${depthUnit}`,
                    fill: '#f43f5e',
                    position: 'insideBottomRight',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Safe Buffer Curve (80% of Fcrit) */}
              {viewMode === 'magnitude' && showSafeBuffer && (
                <Line
                  dataKey="safeBuffer"
                  name="80% Fcrit Buffer"
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Sinusoidal Buckling Line */}
              {showSinusoidal && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'sinusoidalCrit' : 'sinusoidalLimit'}
                  name="Sinusoidal Limit (Fcrit)"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Helical Buckling Line */}
              {showHelical && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'helicalCrit' : 'helicalLimit'}
                  name="Helical Threshold (Fhel)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Actual Slack-off Compressive Load Curve */}
              {showActualLoad && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'compressiveForce' : 'slackoffForce'}
                  name={viewMode === 'magnitude' ? 'Compressive Force' : 'Slack-off Load'}
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ r: 2.5, fill: '#22d3ee', stroke: '#0891b2', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#38bdf8' }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          ) : (
            /* Horizontal Trend View: X = Depth, Y = Load */
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                  offset: -10,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `${v} ${forceUnit}`}
                label={{
                  value: `Force [${forceUnit}]`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#94a3b8',
                  fontSize: 12,
                  offset: 10,
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Lockup Depth Reference Line */}
              {isLockedUp && forcesResult.helicalLockupDepthFt && (
                <ReferenceLine
                  x={Number((forcesResult.helicalLockupDepthFt * depthMult).toFixed(0))}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Lockup: ${(forcesResult.helicalLockupDepthFt * depthMult).toFixed(0)} ${depthUnit}`,
                    fill: '#f43f5e',
                    position: 'insideTopLeft',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Safe Buffer Curve */}
              {viewMode === 'magnitude' && showSafeBuffer && (
                <Line
                  dataKey="safeBuffer"
                  name="80% Fcrit Buffer"
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Sinusoidal Buckling Line */}
              {showSinusoidal && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'sinusoidalCrit' : 'sinusoidalLimit'}
                  name="Sinusoidal Limit (Fcrit)"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Helical Buckling Line */}
              {showHelical && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'helicalCrit' : 'helicalLimit'}
                  name="Helical Threshold (Fhel)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Actual Slack-off Compressive Load Curve */}
              {showActualLoad && (
                <Line
                  dataKey={viewMode === 'magnitude' ? 'compressiveForce' : 'slackoffForce'}
                  name={viewMode === 'magnitude' ? 'Compressive Force' : 'Slack-off Load'}
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ r: 2.5, fill: '#22d3ee', stroke: '#0891b2', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#38bdf8' }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Engineering Footnote & Mechanism Explanation */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <span className="font-semibold text-white block mb-1">1. Dawson-Paslay Sinusoidal ($F_{'{crit}'}$)</span>
          <p className="text-[11px] leading-relaxed">
            The coiled tubing snakes along the low side of the wellbore. Contact with casing wall prevents unrestrained deflection. Additional RIH force is still transmitted to the BHA.
          </p>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <span className="font-semibold text-white block mb-1">2. Wu Helical Buckling ($F_{'{hel}'}$)</span>
          <p className="text-[11px] leading-relaxed">
            At $F_{'{hel}'} = 2.828 \times F_{'{crit}'}$, tubing forms a continuous helix against the casing wall. Contact force escalates exponentially with axial load, inducing friction lockup.
          </p>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <span className="font-semibold text-white block mb-1">3. Field Mitigation Practices</span>
          <p className="text-[11px] leading-relaxed">
            If lockup occurs prior to target TD: use fluid friction reducers, run tractor / agitator jars, or pump lighter fluids to increase buoyancy and raise critical buckling load.
          </p>
        </div>
      </div>
    </div>
  );
};
