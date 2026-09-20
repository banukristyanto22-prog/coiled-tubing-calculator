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
  ReferenceLine
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Download,
  Gauge,
  HelpCircle,
  Layers,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
  Info,
  Sparkles
} from 'lucide-react';
import {
  BhaSegmentDragDetail,
  CoiledTubingString,
  DragCalculationOptions,
  DragForceCalculationResult,
  UnitSystem,
  WellboreForcesInput
} from '../types/coiledTubing';
import { calculateAxialDragForce } from '../utils/dragCalculations';
import { ftToM, inToMm, lbfToKn, ppgToSg } from '../utils/engineeringCalculations';

interface BhaDragForceCalculatorProps {
  ct: CoiledTubingString;
  forcesInput: WellboreForcesInput;
  unitSystem: UnitSystem;
  onOpenBhaBuilder?: () => void;
}

export const BhaDragForceCalculator: React.FC<BhaDragForceCalculatorProps> = ({
  ct,
  forcesInput,
  unitSystem,
  onOpenBhaBuilder
}) => {
  const isMetric = unitSystem === 'metric';

  // Interactive scenario options
  const [selectedDirection, setSelectedDirection] = useState<'rih' | 'pooh' | 'both'>('both');
  const [frictionOverride, setFrictionOverride] = useState<number>(forcesInput.frictionCoefficientCasing);
  const [fluidDensityOverride, setFluidDensityOverride] = useState<number>(forcesInput.wellboreFluidDensityPpg);
  
  // Active BHA operational tools
  const hasAgitatorInConfig = forcesInput.bhaConfig?.segments?.some((s) => s.type === 'agitator') ?? false;
  const hasTractorInConfig = forcesInput.bhaConfig?.segments?.some((s) => s.type === 'tractor') ?? false;
  const hasNozzleInConfig = forcesInput.bhaConfig?.segments?.some((s) => s.type === 'nozzle_bit') ?? false;

  const [agitatorEnabled, setAgitatorEnabled] = useState<boolean>(hasAgitatorInConfig);
  const [agitatorReductionPct, setAgitatorReductionPct] = useState<number>(35);
  
  const [tractorEnabled, setTractorEnabled] = useState<boolean>(hasTractorInConfig);
  const [tractorPullLbf, setTractorPullLbf] = useState<number>(3000);
  
  const [jettingEnabled, setJettingEnabled] = useState<boolean>(hasNozzleInConfig);
  const [flowRateGpm, setFlowRateGpm] = useState<number>(45);

  const [appliedWobLbf, setAppliedWobLbf] = useState<number>(0);

  // Visualization view mode
  const [activeTab, setActiveTab] = useState<'profile' | 'segments' | 'buckling' | 'comparison'>('profile');
  const [expandedControls, setExpandedControls] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Calculate comprehensive drag results
  const dragResult: DragForceCalculationResult = useMemo(() => {
    const options: DragCalculationOptions = {
      frictionCoefficient: frictionOverride,
      wellboreFluidDensityPpg: fluidDensityOverride,
      agitatorActive: agitatorEnabled,
      agitatorDragReductionPct: agitatorReductionPct,
      tractorActive: tractorEnabled,
      tractorTractivePullLbf: tractorPullLbf,
      jettingThrustActive: jettingEnabled,
      flowRateGpm: flowRateGpm,
      appliedWobLbf: appliedWobLbf,
    };

    return calculateAxialDragForce(ct, forcesInput, options);
  }, [
    ct,
    forcesInput,
    frictionOverride,
    fluidDensityOverride,
    agitatorEnabled,
    agitatorReductionPct,
    tractorEnabled,
    tractorPullLbf,
    jettingEnabled,
    flowRateGpm,
    appliedWobLbf
  ]);

  // Copy report summary to clipboard
  const handleCopySummary = () => {
    const text = `
=== WELLBORE AXIAL DRAG REPORT ===
Target Depth: ${isMetric ? `${Math.round(ftToM(dragResult.totalDepthFt))} m` : `${dragResult.totalDepthFt} ft`}
Trajectory: ${dragResult.trajectoryType === 'custom_survey' ? 'Multi-Station 3D Survey' : 'Constant Angle'} (Max Inc: ${dragResult.maxInclinationDeg}°, Max DLS: ${dragResult.maxDoglegSeverity}°/100ft)
Casing Friction (μ): ${frictionOverride.toFixed(2)} | Fluid Density: ${fluidDensityOverride} ppg

TOTAL AXIAL DRAG:
- RIH (Slack-off Drag): ${isMetric ? `${dragResult.totalDragRihKn} kN` : `${dragResult.totalDragRihLbf.toLocaleString()} lbf`}
- POOH (Pick-up Drag): ${isMetric ? `${dragResult.totalDragPoohKn} kN` : `${dragResult.totalDragPoohLbf.toLocaleString()} lbf`}

BHA CONTRIBUTION:
- BHA Drag: ${isMetric ? `${lbfToKn(dragResult.bhaDragRihLbf).toFixed(1)} kN` : `${dragResult.bhaDragRihLbf.toLocaleString()} lbf`} (${dragResult.bhaDragSharePercent}% of total)
- CT String Drag: ${isMetric ? `${lbfToKn(dragResult.ctDragRihLbf).toFixed(1)} kN` : `${dragResult.ctDragRihLbf.toLocaleString()} lbf`} (${dragResult.ctDragSharePercent}% of total)
- BHA Length: ${isMetric ? `${(dragResult.bhaLengthFt * 0.3048).toFixed(1)} m` : `${dragResult.bhaLengthFt} ft`}
- BHA Drag Intensity: ${dragResult.bhaAvgDragPerFootLbf} lbf/ft vs CT ${dragResult.ctAvgDragPerFootLbf} lbf/ft (${dragResult.bhaDragIntensityRatio}x)

SURFACE HOOKLOAD IMPACT:
- Neutral Hanging Weight: ${dragResult.surfaceStaticHangingWeightLbf.toLocaleString()} lbf
- Surface Slack-off Hookload: ${dragResult.surfaceSlackoffHookloadLbf.toLocaleString()} lbf
- Surface Pick-up Hookload: ${dragResult.surfacePickupHookloadLbf.toLocaleString()} lbf
- Lockup Status: ${dragResult.isLockedUp ? `LOCKED UP at ${dragResult.effectiveLockupDepthFt} ft` : 'SAFE (No Helical Lockup)'}
`.trim();

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Overview Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Wellbore Axial Drag Calculator</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    BHA Geometry &amp; Trajectory Integration
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Calculates normal contact loads, friction drag, and hookload envelopes from surface to BHA bit face.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {onOpenBhaBuilder && (
              <button
                type="button"
                onClick={onOpenBhaBuilder}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                <span>Configure BHA ({forcesInput.bhaConfig?.segments.length ?? 0} Tools)</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Copy formatted drag report to clipboard"
            >
              {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy Summary Report'}</span>
            </button>
          </div>
        </div>

        {/* Trajectory & BHA Quick Context Ribbon */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trajectory:</span>
              <strong className="text-slate-200 font-mono">
                {dragResult.trajectoryType === 'custom_survey' ? '3D Survey Curve' : 'Constant Angle'}
              </strong>
            </span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">
              Max Inclination: <strong className="text-slate-200 font-mono">{dragResult.maxInclinationDeg}&deg;</strong>
            </span>
            {dragResult.maxDoglegSeverity > 0 && (
              <>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-400">
                  Max DLS: <strong className="text-amber-300 font-mono">{dragResult.maxDoglegSeverity}&deg;/100ft</strong>
                </span>
              </>
            )}
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">
              Total Depth: <strong className="text-cyan-300 font-mono">
                {isMetric ? `${Math.round(ftToM(dragResult.totalDepthFt))} m` : `${dragResult.totalDepthFt.toLocaleString()} ft`}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
              forcesInput.bhaConfig?.enabled && dragResult.bhaLengthFt > 0
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {forcesInput.bhaConfig?.enabled && dragResult.bhaLengthFt > 0
                ? `BHA Active (${isMetric ? `${(dragResult.bhaLengthFt * 0.3048).toFixed(1)}m` : `${dragResult.bhaLengthFt}ft`})`
                : 'Bare CT String (No BHA)'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Total Axial Drag Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Drag RIH */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">RIH Axial Drag (Slack-off)</span>
            <ArrowDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {isMetric ? `${dragResult.totalDragRihKn} kN` : `${dragResult.totalDragRihLbf.toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Friction opposing downward push</span>
            {dragResult.dragIncreaseDueToBhaLbf > 0 && (
              <span className="text-amber-400 font-mono font-medium">
                +{isMetric ? Math.round(lbfToKn(dragResult.dragIncreaseDueToBhaLbf)) + ' kN' : dragResult.dragIncreaseDueToBhaLbf.toLocaleString() + ' lbf BHA'}
              </span>
            )}
          </div>
        </div>

        {/* Total Drag POOH */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">POOH Axial Drag (Pick-up)</span>
            <ArrowUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {isMetric ? `${dragResult.totalDragPoohKn} kN` : `${dragResult.totalDragPoohLbf.toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Friction opposing upward retrieval
          </div>
        </div>

        {/* BHA Drag Share & Intensity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">BHA Drag Contribution</span>
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {dragResult.bhaDragSharePercent}%
            </div>
            <div className="text-xs text-slate-400 font-mono">
              ({isMetric ? `${lbfToKn(dragResult.bhaDragRihLbf).toFixed(1)} kN` : `${dragResult.bhaDragRihLbf.toLocaleString()} lbf`})
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Intensity vs CT:</span>
            <span className="text-purple-300 font-mono font-semibold">
              {dragResult.bhaDragIntensityRatio}&times; ({dragResult.bhaAvgDragPerFootLbf} lbf/ft)
            </span>
          </div>
        </div>

        {/* Lockup & Safe Reach Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Lockup &amp; Feed Status</span>
            {dragResult.isLockedUp ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className={`text-2xl font-bold font-mono ${
            dragResult.isLockedUp ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {dragResult.isLockedUp ? 'HELICAL LOCKUP' : 'FEED SAFE'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {dragResult.isLockedUp ? (
              <span className="text-rose-300 font-mono">
                Lockup occurs at ~{dragResult.effectiveLockupDepthFt} ft
              </span>
            ) : (
              <span className="text-slate-400 font-mono">
                Max allowable WOB: {dragResult.maxAllowableWobBeforeLockupLbf.toLocaleString()} lbf
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Interactive Scenario & Sensitivity Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpandedControls(!expandedControls)}
            className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider hover:text-white transition-colors"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Interactive Drag Sensitivity &amp; Tool Assist Controls</span>
            {expandedControls ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
            Real-time sensitivity modeling
          </span>
        </div>

        {expandedControls && (
          <div className="pt-2 border-t border-slate-800 space-y-4">
            {/* Primary Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Friction Coefficient Slider */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Casing Friction (μ):</span>
                  <span className="font-mono font-bold text-cyan-300">{frictionOverride.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.45"
                  step="0.01"
                  value={frictionOverride}
                  onChange={(e) => setFrictionOverride(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.10 (Lube)</span>
                  <span>0.24 (Std)</span>
                  <span>0.45 (Dry/Scale)</span>
                </div>
              </div>

              {/* Fluid Density Slider */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Wellbore Fluid Density:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {isMetric ? `${ppgToSg(fluidDensityOverride).toFixed(2)} SG` : `${fluidDensityOverride} ppg`}
                  </span>
                </div>
                <input
                  type="range"
                  min="7.0"
                  max="16.0"
                  step="0.1"
                  value={fluidDensityOverride}
                  onChange={(e) => setFluidDensityOverride(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>7.0 (Gas/Light)</span>
                  <span>8.4 (Water)</span>
                  <span>16.0 (Heavy Mud)</span>
                </div>
              </div>

              {/* Applied WOB Slider */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Applied WOB at TD:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {isMetric ? `${Math.round(lbfToKn(appliedWobLbf))} kN` : `${appliedWobLbf.toLocaleString()} lbf`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8000"
                  step="250"
                  value={appliedWobLbf}
                  onChange={(e) => setAppliedWobLbf(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 (Free Hanging)</span>
                  <span>4,000</span>
                  <span>8,000 lbf</span>
                </div>
              </div>
            </div>

            {/* Specialized Active BHA Tool Assisting Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Fluid Oscillator / Agitator */}
              <div className={`p-3 rounded-lg border transition-all ${
                agitatorEnabled
                  ? 'bg-purple-950/30 border-purple-500/40 ring-1 ring-purple-500/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className={`w-3.5 h-3.5 ${agitatorEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-200">Axial Agitator Pulse</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agitatorEnabled}
                      onChange={(e) => setAgitatorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Friction Reduction:</span>
                    <span className="font-mono font-bold text-purple-300">{agitatorReductionPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    disabled={!agitatorEnabled}
                    value={agitatorReductionPct}
                    onChange={(e) => setAgitatorReductionPct(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 h-1 bg-slate-800 rounded cursor-pointer disabled:opacity-40"
                  />
                  <div className="text-[10px] text-slate-400">
                    Saves ~{dragResult.totalAgitatorReductionLbf.toLocaleString()} lbf axial drag
                  </div>
                </div>
              </div>

              {/* Downhole Well Tractor */}
              <div className={`p-3 rounded-lg border transition-all ${
                tractorEnabled
                  ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-3.5 h-3.5 ${tractorEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-200">Downhole Tractor</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tractorEnabled}
                      onChange={(e) => setTractorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Tractive Pull:</span>
                    <span className="font-mono font-bold text-indigo-300">{tractorPullLbf.toLocaleString()} lbf</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="6000"
                    step="500"
                    disabled={!tractorEnabled}
                    value={tractorPullLbf}
                    onChange={(e) => setTractorPullLbf(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer disabled:opacity-40"
                  />
                  <div className="text-[10px] text-slate-400">
                    Pulls string forward to overcome drag
                  </div>
                </div>
              </div>

              {/* Jetting Nozzle Thrust */}
              <div className={`p-3 rounded-lg border transition-all ${
                jettingEnabled
                  ? 'bg-cyan-950/30 border-cyan-500/40 ring-1 ring-cyan-500/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Gauge className={`w-3.5 h-3.5 ${jettingEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-200">Jetting Nozzle Thrust</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jettingEnabled}
                      onChange={(e) => setJettingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Flow Rate:</span>
                    <span className="font-mono font-bold text-cyan-300">{flowRateGpm} GPM</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    disabled={!jettingEnabled}
                    value={flowRateGpm}
                    onChange={(e) => setFlowRateGpm(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer disabled:opacity-40"
                  />
                  <div className="text-[10px] text-slate-400">
                    Forward hydraulic reaction thrust: +{dragResult.totalJettingThrustLbf} lbf
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Views Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Cumulative Drag vs Depth</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('segments')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                activeTab === 'segments'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>BHA Segment Breakdown ({dragResult.bhaSegmentsDetail.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('buckling')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                activeTab === 'buckling'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Axial Load &amp; Buckling Limits</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                activeTab === 'comparison'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>BHA vs Bare CT Baseline</span>
            </button>
          </div>

          {/* Quick Stats in Header */}
          <div className="text-xs text-slate-400 font-mono hidden md:flex items-center gap-4">
            <span>CT: <strong className="text-slate-200">{dragResult.ctDragSharePercent}%</strong></span>
            <span>BHA: <strong className="text-cyan-300">{dragResult.bhaDragSharePercent}%</strong></span>
            <span>Ratio: <strong className="text-purple-300">{dragResult.bhaDragIntensityRatio}&times;</strong></span>
          </div>
        </div>

        {/* TAB 1: Cumulative Drag vs Depth Profile Chart */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">
                  Axial Friction Drag Profile from Surface to Total Depth
                </span>
                <span className="text-slate-500 ml-2">
                  (Notice the slope change at {isMetric ? `${Math.round(ftToM(dragResult.totalDepthFt - dragResult.bhaLengthFt))}m` : `${Math.round(dragResult.totalDepthFt - dragResult.bhaLengthFt)}ft`} where the BHA begins)
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
                  RIH Drag (Slack-off)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
                  POOH Drag (Pick-up)
                </span>
              </div>
            </div>

            <div className="h-80 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dragResult.trajectoryProfile}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="depthFt"
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickFormatter={(val) => isMetric ? `${Math.round(ftToM(val))}m` : `${val}ft`}
                    label={{
                      value: isMetric ? 'Measured Depth (m)' : 'Measured Depth (ft)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#94a3b8',
                      fontSize: 11
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickFormatter={(val) => isMetric ? `${Math.round(lbfToKn(val))}kN` : `${val.toLocaleString()} lbf`}
                    label={{
                      value: isMetric ? 'Cumulative Drag (kN)' : 'Cumulative Drag (lbf)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                      fill: '#94a3b8',
                      fontSize: 11
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f8fafc',
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any, name: any) => [
                      isMetric ? `${Math.round(lbfToKn(Number(val)))} kN` : `${Number(val).toLocaleString()} lbf`,
                      name === 'cumulativeDragRihLbf' ? 'RIH Drag' : 'POOH Drag'
                    ]}
                    labelFormatter={(label) => {
                      const pt = dragResult.trajectoryProfile.find((p) => p.depthFt === Number(label));
                      return `MD: ${isMetric ? `${Math.round(ftToM(Number(label)))} m` : `${label} ft`} | Inc: ${pt?.inclinationDeg ?? 0}° ${pt?.isBha ? `[BHA: ${pt.segmentName}]` : '[Coiled Tubing]'}`;
                    }}
                  />
                  
                  {/* BHA Top Marker Line */}
                  {dragResult.bhaLengthFt > 0 && (
                    <ReferenceLine
                      x={Math.max(0, dragResult.totalDepthFt - dragResult.bhaLengthFt)}
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{
                        value: 'BHA TOP',
                        fill: '#38bdf8',
                        fontSize: 10,
                        position: 'top'
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="cumulativeDragRihLbf"
                    name="RIH Drag"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeDragPoohLbf"
                    name="POOH Drag"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory Callout */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white">Understanding Trajectory Drag Behavior:</span>
                <p className="text-slate-400">
                  Axial drag accumulates progressively along the wellbore as normal contact forces build up. In the horizontal lateral and build sections, high inclination (&gt;75&deg;) and doglegs multiply wall contact. When the string reaches the bottom, the heavier, stiffer BHA creates a steep spike in drag intensity ({dragResult.bhaAvgDragPerFootLbf} lbf/ft vs {dragResult.ctAvgDragPerFootLbf} lbf/ft on CT).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BHA Segment Breakdown Table */}
        {activeTab === 'segments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Segment-by-Segment Drag &amp; Contact Load Distribution
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Calculated at actual tool depths in wellbore
              </span>
            </div>

            {dragResult.bhaSegmentsDetail.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-2">
                <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No BHA segments active. Coiled tubing properties are modeled uniformly to TD.</p>
                {onOpenBhaBuilder && (
                  <button
                    type="button"
                    onClick={onOpenBhaBuilder}
                    className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Open BHA Configuration Builder &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                      <th className="p-2.5">Tool Component</th>
                      <th className="p-2.5">Depth Interval</th>
                      <th className="p-2.5">OD / ID</th>
                      <th className="p-2.5">Weight (Buoyed)</th>
                      <th className="p-2.5">Local Angle / DLS</th>
                      <th className="p-2.5">Normal Force</th>
                      <th className="p-2.5">Axial Drag</th>
                      <th className="p-2.5">Drag/ft</th>
                      <th className="p-2.5 text-right">% BHA Drag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dragResult.bhaSegmentsDetail.map((seg, idx) => (
                      <tr key={seg.segmentId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2 font-sans font-medium text-white">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: seg.color || '#0ea5e9' }}
                            />
                            <span>{seg.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({seg.type})</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {isMetric
                            ? `${Math.round(ftToM(seg.startDepthFt))} - ${Math.round(ftToM(seg.endDepthFt))} m`
                            : `${seg.startDepthFt} - ${seg.endDepthFt} ft`}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {seg.outerDiameterIn}&quot; / {seg.innerDiameterIn}&quot;
                        </td>
                        <td className="p-2.5 text-amber-300">
                          {isMetric
                            ? `${Math.round(seg.buoyedWeightLbs * 0.453592)} kg`
                            : `${seg.buoyedWeightLbs.toLocaleString()} lbs`}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <span>{seg.avgInclinationDeg}&deg;</span>
                          {seg.avgDoglegSeverityDegPer100ft > 0 && (
                            <span className="text-purple-300 text-[10px] ml-1">
                              ({seg.avgDoglegSeverityDegPer100ft}&deg;/100ft)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-200 font-bold">
                          {isMetric ? `${Math.round(lbfToKn(seg.totalNormalForceLbf))} kN` : `${seg.totalNormalForceLbf.toLocaleString()} lbf`}
                        </td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          {isMetric ? `${Math.round(lbfToKn(seg.axialDragRihLbf))} kN` : `${seg.axialDragRihLbf.toLocaleString()} lbf`}
                        </td>
                        <td className="p-2.5 text-purple-300">
                          {seg.dragPerFootLbf} lbf/ft
                        </td>
                        <td className="p-2.5 text-right font-bold text-cyan-300">
                          <div className="flex items-center justify-end gap-2">
                            <span>{seg.percentOfBhaDrag}%</span>
                            <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="bg-cyan-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, seg.percentOfBhaDrag)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950 font-mono text-xs font-bold border-t border-slate-800 text-slate-200">
                    <tr>
                      <td className="p-2.5 font-sans">BHA Assembly Total</td>
                      <td className="p-2.5">
                        {isMetric ? `${(dragResult.bhaLengthFt * 0.3048).toFixed(1)} m` : `${dragResult.bhaLengthFt} ft`}
                      </td>
                      <td className="p-2.5 text-slate-400">-</td>
                      <td className="p-2.5 text-amber-300">-</td>
                      <td className="p-2.5 text-slate-400">-</td>
                      <td className="p-2.5 text-slate-200">-</td>
                      <td className="p-2.5 text-emerald-400">
                        {isMetric ? `${lbfToKn(dragResult.bhaDragRihLbf).toFixed(1)} kN` : `${dragResult.bhaDragRihLbf.toLocaleString()} lbf`}
                      </td>
                      <td className="p-2.5 text-purple-300">
                        {dragResult.bhaAvgDragPerFootLbf} lbf/ft
                      </td>
                      <td className="p-2.5 text-right text-cyan-300">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Axial Load & Buckling Envelope */}
        {activeTab === 'buckling' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">
                  Axial Load Profile vs Critical Buckling Limits (RIH &amp; POOH)
                </span>
                <span className="text-slate-500 ml-2">
                  (Negative = Compression, Positive = Tension)
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
                  RIH Load
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-0.5 bg-rose-400 inline-block border-b border-dashed"></span>
                  Helical Buckling Limit
                </span>
              </div>
            </div>

            <div className="h-80 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dragResult.trajectoryProfile}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="depthFt"
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickFormatter={(val) => isMetric ? `${Math.round(ftToM(val))}m` : `${val}ft`}
                    label={{
                      value: isMetric ? 'Measured Depth (m)' : 'Measured Depth (ft)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#94a3b8',
                      fontSize: 11
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    fontFamily="monospace"
                    tickFormatter={(val) => isMetric ? `${Math.round(lbfToKn(val))}kN` : `${val.toLocaleString()}`}
                    label={{
                      value: isMetric ? 'Axial Load (kN)' : 'Axial Load (lbf)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                      fill: '#94a3b8',
                      fontSize: 11
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f8fafc',
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any, name: any) => [
                      isMetric ? `${Math.round(lbfToKn(Number(val)))} kN` : `${Number(val).toLocaleString()} lbf`,
                      name
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                  
                  {/* RIH Axial Force */}
                  <Line
                    type="monotone"
                    dataKey="axialForceRihLbf"
                    name="RIH Axial Force"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  {/* Neutral Axial Force */}
                  <Line
                    type="monotone"
                    dataKey="axialForceNeutralLbf"
                    name="Neutral Hanging Force"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  {/* POOH Axial Force */}
                  <Line
                    type="monotone"
                    dataKey="axialForcePoohLbf"
                    name="POOH Axial Force"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  {/* Helical Limit (negative compression limit) */}
                  <Line
                    type="monotone"
                    dataKey={(p) => -p.helicalBucklingLbf}
                    name="Helical Buckling Boundary"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400">Surface Slack-off Weight (Injector Load):</span>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {isMetric ? `${dragResult.surfaceSlackoffHookloadKn} kN` : `${dragResult.surfaceSlackoffHookloadLbf.toLocaleString()} lbf`}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Net hanging weight minus cumulative wellbore drag
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400">Surface Pick-up Weight (Overpull):</span>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {isMetric ? `${dragResult.surfacePickupHookloadKn} kN` : `${dragResult.surfacePickupHookloadLbf.toLocaleString()} lbf`}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Net hanging weight plus cumulative wellbore drag
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BHA vs Bare CT Baseline Comparison */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Direct comparison between the fully configured BHA toolstring versus a uniform bare coiled tubing string without BHA.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bare CT Card */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Bare Coiled Tubing Baseline (No BHA)
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Baseline
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Total Axial Drag:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {isMetric ? `${Math.round(lbfToKn(dragResult.bareCtTotalDragLbf))} kN` : `${dragResult.bareCtTotalDragLbf.toLocaleString()} lbf`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Average Drag per Foot:</span>
                    <span className="font-mono text-slate-300">
                      {dragResult.ctAvgDragPerFootLbf} lbf/ft
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">String Outer Diameter:</span>
                    <span className="font-mono text-slate-300">
                      {ct.outerDiameterIn}&quot; uniform
                    </span>
                  </div>
                </div>
              </div>

              {/* Assembled BHA Card */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-cyan-500/30 space-y-3 ring-1 ring-cyan-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    <span>With Configured BHA Toolstring</span>
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Total Axial Drag:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {isMetric ? `${dragResult.totalDragRihKn} kN` : `${dragResult.totalDragRihLbf.toLocaleString()} lbf`}
                      <span className="text-amber-400 text-[10px] ml-1.5 font-normal">
                        (+{dragResult.dragIncreasePercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">BHA Average Drag per Foot:</span>
                    <span className="font-mono text-purple-300 font-bold">
                      {dragResult.bhaAvgDragPerFootLbf} lbf/ft ({dragResult.bhaDragIntensityRatio}&times; higher)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Net Drag Added by BHA:</span>
                    <span className="font-mono text-amber-300 font-bold">
                      +{isMetric ? `${Math.round(lbfToKn(dragResult.dragIncreaseDueToBhaLbf))} kN` : `${dragResult.dragIncreaseDueToBhaLbf.toLocaleString()} lbf`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Commentary */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Automated Engineering Diagnostic Insights:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>
                  The BHA accounts for <strong className="text-cyan-300">{dragResult.bhaDragSharePercent}%</strong> of total wellbore drag while representing only <strong className="text-slate-200">{((dragResult.bhaLengthFt / Math.max(1, dragResult.totalDepthFt)) * 100).toFixed(1)}%</strong> of total string length.
                </li>
                <li>
                  BHA drag intensity is <strong className="text-purple-300">{dragResult.bhaDragIntensityRatio}&times;</strong> higher than the coiled tubing body due to larger component outer diameters and concentrated steel mass in high inclination sections.
                </li>
                {agitatorEnabled && (
                  <li className="text-purple-300">
                    Active axial fluid oscillator reduces friction by {agitatorReductionPct}%, saving ~{dragResult.totalAgitatorReductionLbf.toLocaleString()} lbf in axial drag and postponing lockup.
                  </li>
                )}
                {tractorEnabled && (
                  <li className="text-indigo-300">
                    Downhole tractor contributes +{tractorPullLbf.toLocaleString()} lbf of tractive pull directly assisting string feeding in the horizontal lateral.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
