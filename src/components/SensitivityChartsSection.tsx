import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  Gauge,
  Droplets,
  Ruler,
  Anchor,
} from 'lucide-react';
import { CoiledTubingString } from '../types/coiledTubing';

interface DepthPoint {
  depthFt: number;
  depthM: number;
  slackoffLbf: number;
  slackoffKn: number;
  neutralLbf: number;
  neutralKn: number;
  pickupLbf: number;
  pickupKn: number;
  dragLbf: number;
  dragKn: number;
  sinusoidalLimitLbf: number;
  sinusoidalLimitKn: number;
  helicalLimitLbf: number;
  helicalLimitKn: number;
  overpullAvailableLbf: number;
  overpullAvailableKn: number;
  isLockedUp: boolean;
  isBuckled: boolean;
  status: 'safe' | 'sinusoidal' | 'helical';
}

interface FlowPoint {
  flowGpm: number;
  flowLpm: number;
  standpipePsi: number;
  standpipeBar: number;
  tubingDropPsi: number;
  tubingDropBar: number;
  nozzleDropPsi: number;
  nozzleDropBar: number;
  annularDropPsi: number;
  annularDropBar: number;
  velocityFtSec: number;
  velocityMSec: number;
  reynolds: number;
  hhp: number;
  transportEfficiency: number;
  isPressureCritical: boolean;
  isPressureCaution: boolean;
  status: 'safe' | 'caution' | 'critical';
}

interface PressurePoint {
  pressurePsi: number;
  pressureBar: number;
  vonMisesStressPsi: number;
  vonMisesStressMpa: number;
  stressRatioPercent: number;
  deratedTensileLbf: number;
  deratedTensileKn: number;
  safeOverpullLbf: number;
  safeOverpullKn: number;
  status: 'safe' | 'caution' | 'critical' | 'violation';
}

interface DensityPoint {
  densityPpg: number;
  densitySg: number;
  buoyancyFactor: number;
  buoyedWeightLbFt: number;
  hydrostaticBhpPsi: number;
  hydrostaticBhpBar: number;
  slackoffLbf: number;
  slackoffKn: number;
  pickupLbf: number;
  pickupKn: number;
  neutralLbf: number;
  neutralKn: number;
  dragLbf: number;
  dragKn: number;
}

interface SensitivityChartsSectionProps {
  mode: 'depth' | 'flow' | 'pressure' | 'density';
  ct: CoiledTubingString;
  unitSystem: 'imperial' | 'metric';
  depthBatchData: DepthPoint[];
  flowBatchData: FlowPoint[];
  pressureBatchData: PressurePoint[];
  densityBatchData: DensityPoint[];
  baseLimits: {
    tensileYieldLbf: number;
    tensileYieldKn: number;
    safeTensileYieldLbf: number;
    safeTensileYieldKn: number;
    burstPressurePsi: number;
    burstPressureBar: number;
    safeBurstPressurePsi: number;
    safeBurstPressureBar: number;
    collapsePressurePsi: number;
    collapsePressureBar: number;
  };
}

export const SensitivityChartsSection: React.FC<SensitivityChartsSectionProps> = ({
  mode,
  ct,
  unitSystem,
  depthBatchData,
  flowBatchData,
  pressureBatchData,
  densityBatchData,
  baseLimits,
}) => {
  const isMetric = unitSystem === 'metric';

  // Sub-view toggles per mode
  const [depthSubView, setDepthSubView] = useState<'all' | 'envelope' | 'drag_overpull'>('all');
  const [flowSubView, setFlowSubView] = useState<'pressures' | 'power_velocity'>('pressures');
  const [pressureSubView, setPressureSubView] = useState<'stress' | 'capacity'>('stress');
  const [densitySubView, setDensitySubView] = useState<'forces_bhp' | 'buoyancy'>('forces_bhp');

  // Full height / expanded chart toggle
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Curve Visibility toggles
  const [visibleCurves, setVisibleCurves] = useState<Record<string, boolean>>({
    // Depth curves
    pickup: true,
    neutral: true,
    slackoff: true,
    sinusoidal: true,
    helical: true,
    drag: true,
    overpull: true,
    // Flow curves
    standpipe: true,
    tubingDrop: true,
    nozzleDrop: true,
    annularDrop: true,
    hhp: true,
    velocity: true,
    // Pressure curves
    stressRatio: true,
    deratedTensile: true,
    safeOverpull: true,
    // Density curves
    hydroBhp: true,
    buoyancyFactor: true,
    densityPickup: true,
    densitySlackoff: true,
    densityNeutral: true,
  });

  const toggleCurve = (key: string) => {
    setVisibleCurves((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Prepared Data for Depth Mode (Forces vs. Depth)
  const depthChartData = useMemo(() => {
    return depthBatchData.map((d) => {
      const xVal = isMetric ? Math.round(d.depthM) : d.depthFt;
      return {
        ...d,
        xVal,
        pickup: isMetric ? Number(d.pickupKn.toFixed(1)) : Math.round(d.pickupLbf),
        neutral: isMetric ? Number(d.neutralKn.toFixed(1)) : Math.round(d.neutralLbf),
        slackoff: isMetric ? Number(d.slackoffKn.toFixed(1)) : Math.round(d.slackoffLbf),
        sinusoidalLimit: isMetric ? Number(d.sinusoidalLimitKn.toFixed(1)) : Math.round(d.sinusoidalLimitLbf),
        helicalLimit: isMetric ? Number(d.helicalLimitKn.toFixed(1)) : Math.round(d.helicalLimitLbf),
        drag: isMetric ? Number(d.dragKn.toFixed(1)) : Math.round(d.dragLbf),
        overpull: isMetric ? Number(d.overpullAvailableKn.toFixed(1)) : Math.round(d.overpullAvailableLbf),
        // For visual buckling envelope (negative compression value)
        compressiveLoad: isMetric ? Number((-d.slackoffKn).toFixed(1)) : Math.round(-d.slackoffLbf),
      };
    });
  }, [depthBatchData, isMetric]);

  // 2. Prepared Data for Flow Mode (Pressures vs. Flow Rate)
  const flowChartData = useMemo(() => {
    return flowBatchData.map((d) => {
      const xVal = isMetric ? Number(d.flowLpm.toFixed(1)) : d.flowGpm;
      return {
        ...d,
        xVal,
        standpipe: isMetric ? Number(d.standpipeBar.toFixed(1)) : Math.round(d.standpipePsi),
        tubingDrop: isMetric ? Number(d.tubingDropBar.toFixed(1)) : Math.round(d.tubingDropPsi),
        nozzleDrop: isMetric ? Number(d.nozzleDropBar.toFixed(1)) : Math.round(d.nozzleDropPsi),
        annularDrop: isMetric ? Number(d.annularDropBar.toFixed(2)) : Math.round(d.annularDropPsi),
        hhp: Number(d.hhp.toFixed(1)),
        velocity: isMetric ? Number(d.velocityMSec.toFixed(2)) : Number(d.velocityFtSec.toFixed(2)),
      };
    });
  }, [flowBatchData, isMetric]);

  // 3. Prepared Data for Pressure Mode (Stress Ratio & Capacity vs. Internal Pressure)
  const pressureChartData = useMemo(() => {
    return pressureBatchData.map((d) => {
      const xVal = isMetric ? Number(d.pressureBar.toFixed(1)) : d.pressurePsi;
      return {
        ...d,
        xVal,
        stressRatio: Number(d.stressRatioPercent.toFixed(1)),
        deratedTensile: isMetric ? Number(d.deratedTensileKn.toFixed(1)) : Math.round(d.deratedTensileLbf),
        safeOverpull: isMetric ? Number(d.safeOverpullKn.toFixed(1)) : Math.round(d.safeOverpullLbf),
      };
    });
  }, [pressureBatchData, isMetric]);

  // 4. Prepared Data for Density Mode (Hydrostatics & Loads vs. Fluid Density)
  const densityChartData = useMemo(() => {
    return densityBatchData.map((d) => {
      const xVal = isMetric ? Number(d.densitySg.toFixed(2)) : d.densityPpg;
      return {
        ...d,
        xVal,
        hydroBhp: isMetric ? Number(d.hydrostaticBhpBar.toFixed(1)) : Math.round(d.hydrostaticBhpPsi),
        buoyancyFactorPct: Number((d.buoyancyFactor * 100).toFixed(1)),
        buoyancyFactor: Number(d.buoyancyFactor.toFixed(3)),
        pickup: isMetric ? Number(d.pickupKn.toFixed(1)) : Math.round(d.pickupLbf),
        neutral: isMetric ? Number(d.neutralKn.toFixed(1)) : Math.round(d.neutralLbf),
        slackoff: isMetric ? Number(d.slackoffKn.toFixed(1)) : Math.round(d.slackoffLbf),
        drag: isMetric ? Number(d.dragKn.toFixed(1)) : Math.round(d.dragLbf),
      };
    });
  }, [densityBatchData, isMetric]);

  // Safe reference line constants
  const safeTensileLimit = isMetric ? baseLimits.safeTensileYieldKn * 0.8 : baseLimits.safeTensileYieldLbf * 0.8;
  const safeBurstLimit = isMetric ? baseLimits.safeBurstPressureBar : baseLimits.safeBurstPressurePsi;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header bar with controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {mode === 'depth' && 'Force vs. Depth Profile (Recharts)'}
                {mode === 'flow' && 'Circulation Hydraulics vs. Flow Rate (Recharts)'}
                {mode === 'pressure' && 'von Mises Stress & Yield vs. Pressure (Recharts)'}
                {mode === 'density' && 'Surface Loads & Hydrostatic BHP vs. Density (Recharts)'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                Vector Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'depth' && 'Interactive plot of pick-up (POOH), slack-off (RIH), Dawson-Paslay buckling, and overpull envelope'}
              {mode === 'flow' && 'Interactive plot of standpipe pressure, tubing and nozzle jet pressure drops with burst rating'}
              {mode === 'pressure' && 'Interactive plot of biaxial von Mises stress utilization and derated tensile margin (API 5ST)'}
              {mode === 'density' && 'Interactive plot of buoyant string weight and bottomhole hydrostatic pressure progression'}
            </p>
          </div>
        </div>

        {/* Sub-view switcher & Expand button */}
        <div className="flex items-center gap-2">
          {/* Depth Sub-view Selector */}
          {mode === 'depth' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDepthSubView('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Forces & Limits
              </button>
              <button
                onClick={() => setDepthSubView('envelope')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'envelope'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hookload Envelope
              </button>
              <button
                onClick={() => setDepthSubView('drag_overpull')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'drag_overpull'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Drag & Overpull
              </button>
            </div>
          )}

          {/* Flow Sub-view Selector */}
          {mode === 'flow' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFlowSubView('pressures')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  flowSubView === 'pressures'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Circulation Pressures
              </button>
              <button
                onClick={() => setFlowSubView('power_velocity')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  flowSubView === 'power_velocity'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                HHP & Velocity
              </button>
            </div>
          )}

          {/* Pressure Sub-view Selector */}
          {mode === 'pressure' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setPressureSubView('stress')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  pressureSubView === 'stress'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Stress Ratio (%)
              </button>
              <button
                onClick={() => setPressureSubView('capacity')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  pressureSubView === 'capacity'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tensile Capacity
              </button>
            </div>
          )}

          {/* Density Sub-view Selector */}
          {mode === 'density' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDensitySubView('forces_bhp')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  densitySubView === 'forces_bhp'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Loads & Hydrostatics
              </button>
              <button
                onClick={() => setDensitySubView('buoyancy')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  densitySubView === 'buoyancy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Buoyancy Factor
              </button>
            </div>
          )}

          {/* Expand / Minimize Height */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isExpanded ? 'Standard view' : 'Enlarge chart'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Legend & Visibility Toggles */}
      <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Filter Curves:
        </span>

        {mode === 'depth' && (
          <>
            <button
              onClick={() => toggleCurve('pickup')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.pickup
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Pick-Up (POOH)
            </button>

            <button
              onClick={() => toggleCurve('neutral')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.neutral
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Neutral Weight
            </button>

            <button
              onClick={() => toggleCurve('slackoff')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.slackoff
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Slack-Off (RIH)
            </button>

            <button
              onClick={() => toggleCurve('sinusoidal')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.sinusoidal
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-rose-400" />
              Sinusoidal Limit (F_crit)
            </button>

            <button
              onClick={() => toggleCurve('helical')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.helical
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-purple-400" />
              Helical Limit (F_hel)
            </button>

            <button
              onClick={() => toggleCurve('drag')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.drag
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Total Wellbore Drag
            </button>

            <button
              onClick={() => toggleCurve('overpull')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.overpull
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              Safe Overpull
            </button>
          </>
        )}

        {mode === 'flow' && (
          <>
            <button
              onClick={() => toggleCurve('standpipe')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.standpipe
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Standpipe Pressure
            </button>

            <button
              onClick={() => toggleCurve('tubingDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.tubingDrop
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Tubing Friction &Delta;P
            </button>

            <button
              onClick={() => toggleCurve('nozzleDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.nozzleDrop
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Nozzle Jet &Delta;P
            </button>

            <button
              onClick={() => toggleCurve('annularDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.annularDrop
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Annular &Delta;P
            </button>

            {flowSubView === 'power_velocity' && (
              <>
                <button
                  onClick={() => toggleCurve('hhp')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                    visibleCurves.hhp
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  Hydraulic HP (HHP)
                </button>
                <button
                  onClick={() => toggleCurve('velocity')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                    visibleCurves.velocity
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Fluid Velocity
                </button>
              </>
            )}
          </>
        )}

        {mode === 'pressure' && (
          <>
            <button
              onClick={() => toggleCurve('stressRatio')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.stressRatio
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              von Mises Stress Ratio (%)
            </button>

            <button
              onClick={() => toggleCurve('deratedTensile')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.deratedTensile
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Derated Tensile Yield
            </button>

            <button
              onClick={() => toggleCurve('safeOverpull')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.safeOverpull
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Safe Overpull Margin
            </button>
          </>
        )}

        {mode === 'density' && (
          <>
            <button
              onClick={() => toggleCurve('hydroBhp')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.hydroBhp
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Hydrostatic BHP
            </button>

            <button
              onClick={() => toggleCurve('densityPickup')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.densityPickup
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              POOH Pick-Up Load
            </button>

            <button
              onClick={() => toggleCurve('densitySlackoff')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.densitySlackoff
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              RIH Slack-Off Weight
            </button>

            <button
              onClick={() => toggleCurve('buoyancyFactor')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.buoyancyFactor
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Buoyancy Factor (BF)
            </button>
          </>
        )}
      </div>

      {/* Main Recharts Container */}
      <div
        className={`w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-4 transition-all ${
          isExpanded ? 'h-[580px]' : 'h-[420px]'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. DEPTH MODE: FORCE VS DEPTH CHART */}
          {mode === 'depth' ? (
            <ComposedChart data={depthChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <defs>
                <linearGradient id="slackoffFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pickupFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Measured Depth (${isMetric ? 'm' : 'ft'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Axial Load & Capacity (${isMetric ? 'kN' : 'lbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* Zero load reference line (Snubbing/Compression Boundary) */}
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} label={{ value: 'Neutral (0 Load)', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />

              {/* 80% Tensile Yield Limit */}
              <ReferenceLine
                y={safeTensileLimit}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `80% Tensile Limit (${isMetric ? Math.round(safeTensileLimit) + ' kN' : Math.round(safeTensileLimit).toLocaleString() + ' lbf'})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof depthChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                          Depth: {isMetric ? `${data.xVal.toLocaleString()} m` : `${data.xVal.toLocaleString()} ft`}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'sinusoidal'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status === 'safe' ? 'Safe String' : data.status === 'sinusoidal' ? 'Sinusoidal Buckling' : 'Helical Lockup'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" /> Pick-Up (POOH):
                          </span>
                          <span className="font-bold">{data.pickup.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Neutral Weight:
                          </span>
                          <span>{data.neutral.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Slack-Off (RIH):
                          </span>
                          <span className="font-bold">{data.slackoff.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-slate-800/80">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> Sinusoidal F_crit:
                          </span>
                          <span>{data.sinusoidalLimit.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-purple-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400" /> Helical F_hel:
                          </span>
                          <span>{data.helicalLimit.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-sky-300 pt-1 border-t border-slate-800/80">
                          <span>Total Drag:</span>
                          <span>{data.drag.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-teal-300">
                          <span>Safe Overpull:</span>
                          <span className="font-semibold text-teal-400">{data.overpull.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Curves */}
              {visibleCurves.pickup && (
                <Line
                  type="monotone"
                  dataKey="pickup"
                  name="Pick-Up Hookload"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#f59e0b' }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.neutral && (
                <Line
                  type="monotone"
                  dataKey="neutral"
                  name="Neutral Weight"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {visibleCurves.slackoff && (
                <Line
                  type="monotone"
                  dataKey="slackoff"
                  name="Slack-Off Hookload"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.sinusoidal && (
                <Line
                  type="monotone"
                  dataKey="sinusoidalLimit"
                  name="Sinusoidal Buckling (F_crit)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              {visibleCurves.helical && (
                <Line
                  type="monotone"
                  dataKey="helicalLimit"
                  name="Helical Buckling (F_hel)"
                  stroke="#c084fc"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}

              {visibleCurves.drag && (depthSubView === 'all' || depthSubView === 'drag_overpull') && (
                <Line
                  type="monotone"
                  dataKey="drag"
                  name="Wellbore Drag"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}

              {visibleCurves.overpull && (depthSubView === 'all' || depthSubView === 'drag_overpull') && (
                <Line
                  type="monotone"
                  dataKey="overpull"
                  name="Available Overpull"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : mode === 'flow' ? (
            /* 2. FLOW RATE MODE: HYDRAULICS & PRESSURES CHART */
            <ComposedChart data={flowChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Circulation Flow Rate (${isMetric ? 'L/min' : 'GPM'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} bar` : `${Math.round(val)} psi`)}
                label={{
                  value: `Hydraulic Pressure (${isMetric ? 'bar' : 'psi'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* 80% Safe Working Burst Limit Reference Line */}
              <ReferenceLine
                y={safeBurstLimit}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `80% Safe Burst Limit (${isMetric ? Math.round(safeBurstLimit) + ' bar' : Math.round(safeBurstLimit) + ' psi'})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof flowChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                          Flow: {data.xVal} {isMetric ? 'L/min' : 'GPM'}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'caution'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status === 'safe' ? 'Within Limits' : data.status === 'caution' ? 'Near Rating' : 'Exceeds Burst'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span className="font-semibold">Standpipe Pressure:</span>
                          <span className="font-bold">{data.standpipe.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-400">
                          <span>Tubing Friction &Delta;P:</span>
                          <span>{data.tubingDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Nozzle Jet &Delta;P:</span>
                          <span>{data.nozzleDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Annular &Delta;P:</span>
                          <span>{data.annularDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-300 pt-1 border-t border-slate-800">
                          <span>Hydraulic Horsepower:</span>
                          <span className="font-bold text-indigo-400">{data.hhp} HHP</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Fluid Velocity:</span>
                          <span>{data.velocity} {isMetric ? 'm/s' : 'ft/s'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.standpipe && (
                <Line
                  type="monotone"
                  dataKey="standpipe"
                  name="Standpipe Pressure"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.tubingDrop && (
                <Line
                  type="monotone"
                  dataKey="tubingDrop"
                  name="Tubing Friction Loss"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.nozzleDrop && (
                <Line
                  type="monotone"
                  dataKey="nozzleDrop"
                  name="Nozzle Jet Loss"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {visibleCurves.annularDrop && (
                <Line
                  type="monotone"
                  dataKey="annularDrop"
                  name="Annular Friction Loss"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : mode === 'pressure' ? (
            /* 3. INTERNAL PRESSURE MODE: VON MISES STRESS & CAPACITY */
            <ComposedChart data={pressureChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Internal Differential Pressure (${isMetric ? 'bar' : 'psi'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* Left Y Axis for Stress Ratio % */}
              <YAxis
                yAxisId="left"
                stroke="#06b6d4"
                domain={[0, 110]}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val}%`}
                label={{
                  value: 'von Mises Stress Ratio (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#06b6d4',
                  fontSize: 12,
                }}
              />

              {/* Right Y Axis for Tensile Forces */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Tensile Capacity (${isMetric ? 'kN' : 'lbf'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              {/* 80% Safe Working Limit Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={80}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: '80% API Spec 5ST Safe Limit', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
              />

              {/* 100% Structural Yield Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={100}
                stroke="#ef4444"
                strokeWidth={1.5}
                label={{ value: '100% Full Yield Failure', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof pressureChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          Pressure: {data.xVal} {isMetric ? 'bar' : 'psi'}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'caution'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span>von Mises Stress Ratio:</span>
                          <span className="font-bold">{data.stressRatio}%</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Derated Tensile Yield:</span>
                          <span className="font-bold">{data.deratedTensile.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Available Safe Overpull:</span>
                          <span className="font-bold">{data.safeOverpull.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.stressRatio && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="stressRatio"
                  name="Stress Ratio (%)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.deratedTensile && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="deratedTensile"
                  name="Derated Tensile Yield"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.safeOverpull && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="safeOverpull"
                  name="Safe Overpull Reserve"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : (
            /* 4. DENSITY MODE: HYDROSTATICS & HOOKLOADS CHART */
            <ComposedChart data={densityChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Wellbore Fluid Density (${isMetric ? 'SG' : 'ppg'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="loads"
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Surface Load (${isMetric ? 'kN' : 'lbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="bhp"
                orientation="right"
                stroke="#06b6d4"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} bar` : `${Math.round(val)} psi`)}
                label={{
                  value: `Hydrostatic BHP (${isMetric ? 'bar' : 'psi'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  fill: '#06b6d4',
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof densityChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                          Density: {data.xVal} {isMetric ? 'SG' : 'ppg'}
                        </span>
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                          BF: {data.buoyancyFactor}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span>Hydrostatic BHP:</span>
                          <span className="font-bold">{data.hydroBhp.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Pick-Up (POOH):</span>
                          <span>{data.pickup.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Slack-Off (RIH):</span>
                          <span>{data.slackoff.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-400">
                          <span>Buoyancy Reduction:</span>
                          <span>{(100 - data.buoyancyFactorPct).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.hydroBhp && (
                <Line
                  yAxisId="bhp"
                  type="monotone"
                  dataKey="hydroBhp"
                  name="Hydrostatic BHP"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                />
              )}

              {visibleCurves.densityPickup && (
                <Line
                  yAxisId="loads"
                  type="monotone"
                  dataKey="pickup"
                  name="POOH Hookload"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.densitySlackoff && (
                <Line
                  yAxisId="loads"
                  type="monotone"
                  dataKey="slackoff"
                  name="RIH Slack-Off"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Technical Engineering Notes */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {mode === 'depth' && 'Solid amber line indicates POOH pick-up pull; green line indicates slack-off RIH. Red dashed line indicates Dawson-Paslay F_crit.'}
            {mode === 'flow' && 'Total standpipe pressure comprises tubing friction loss, jet nozzle pressure drop, and annular returns based on Churchill friction.'}
            {mode === 'pressure' && 'Calculated according to API Spec 5ST biaxial stress envelope. Tensile limit derates non-linearly with internal pressure.'}
            {mode === 'density' && 'Higher mud density reduces effective string weight via Archimedes buoyancy factor (BF = 1 - rho_fluid / rho_steel).'}
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
          Powered by Recharts v2 &bull; Real-time vector model
        </div>
      </div>
    </div>
  );
};
