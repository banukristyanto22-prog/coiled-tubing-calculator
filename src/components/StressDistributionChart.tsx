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
} from 'recharts';
import {
  TrendingUp,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Sliders,
  CheckCircle2,
  Activity,
  Maximize2,
  Minimize2,
  Droplets,
  ArrowUp,
  ArrowDown,
  Layers,
  Anchor,
  Ruler,
} from 'lucide-react';
import { CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import {
  calculateStressDistribution,
  StringStressPoint,
  psiToMpa,
  mpaToPsi,
  psiToBar,
  barToPsi,
  ftToM,
  mToFt,
  ppgToSg,
  sgToPpg,
  lbfToKn,
} from '../utils/engineeringCalculations';

interface StressDistributionChartProps {
  ct: CoiledTubingString;
  forcesInput: WellboreForcesInput;
  unitSystem: UnitSystem;
}

export const StressDistributionChart: React.FC<StressDistributionChartProps> = ({
  ct,
  forcesInput,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';

  // Interactive controls state
  const [operationMode, setOperationMode] = useState<'pickup' | 'slackoff' | 'neutral' | 'all'>('pickup');
  const [internalPressurePsi, setInternalPressurePsi] = useState<number>(2500);
  const [internalDensityPpg, setInternalDensityPpg] = useState<number>(8.4);
  const [showAxial, setShowAxial] = useState<boolean>(true);
  const [showHoop, setShowHoop] = useState<boolean>(true);
  const [showRadial, setShowRadial] = useState<boolean>(true);
  const [showVonMises, setShowVonMises] = useState<boolean>(true);
  const [showLimits, setShowLimits] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Compute stress distribution along string length
  const stressResults = useMemo(() => {
    return calculateStressDistribution(ct, forcesInput, {
      internalSurfacePressurePsi: internalPressurePsi,
      internalFluidDensityPpg: internalDensityPpg,
      steps: 25,
    });
  }, [ct, forcesInput, internalPressurePsi, internalDensityPpg]);

  // Format data for Recharts LineChart
  const chartData = useMemo(() => {
    return stressResults.points.map((pt) => {
      const depthVal = isMetric ? pt.depthM : pt.depthFt;

      // Axial stress according to selected mode
      let activeAxial = pt.axialStressPickupPsi;
      let activeVonMises = pt.vonMisesPickupPsi;
      let activeUtil = pt.utilizationPickupPercent;

      if (operationMode === 'slackoff') {
        activeAxial = pt.axialStressSlackoffPsi;
        activeVonMises = pt.vonMisesSlackoffPsi;
        activeUtil = pt.utilizationSlackoffPercent;
      } else if (operationMode === 'neutral') {
        activeAxial = pt.axialStressNeutralPsi;
        activeVonMises = pt.vonMisesNeutralPsi;
        activeUtil = pt.utilizationNeutralPercent;
      }

      return {
        depth: depthVal,
        depthFt: pt.depthFt,
        depthM: pt.depthM,
        tvdFt: pt.tvdFt,
        tvdM: pt.tvdM,
        // Active selected components
        axialStress: isMetric ? pt.axialStressPickupMpa : activeAxial,
        axialStressPickup: isMetric ? pt.axialStressPickupMpa : pt.axialStressPickupPsi,
        axialStressSlackoff: isMetric ? pt.axialStressSlackoffMpa : pt.axialStressSlackoffPsi,
        axialStressNeutral: isMetric ? pt.axialStressNeutralMpa : pt.axialStressNeutralPsi,
        hoopStress: isMetric ? pt.hoopStressMpa : pt.hoopStressPsi,
        radialStress: isMetric ? pt.radialStressMpa : pt.radialStressPsi,
        vonMises: isMetric ? Number(psiToMpa(activeVonMises).toFixed(1)) : activeVonMises,
        vonMisesPickup: isMetric ? pt.vonMisesPickupMpa : pt.vonMisesPickupPsi,
        vonMisesSlackoff: isMetric ? pt.vonMisesSlackoffMpa : pt.vonMisesSlackoffPsi,
        // Pressures
        pInt: isMetric ? pt.internalPressureBar : pt.internalPressurePsi,
        pExt: isMetric ? pt.externalPressureBar : pt.externalPressurePsi,
        deltaP: isMetric ? pt.differentialPressureBar : pt.differentialPressurePsi,
        // Utilization
        utilization: activeUtil,
        status: pt.statusPickup,
        // Raw data for tooltip
        raw: pt,
      };
    });
  }, [stressResults, isMetric, operationMode]);

  // Limits
  const yieldStrength = isMetric ? stressResults.yieldStrengthMpa : stressResults.yieldStrengthPsi;
  const safeLimit = isMetric ? stressResults.safeYieldLimitMpa : stressResults.safeYieldLimitPsi;

  // Peak stress card values
  const peakVonMises = isMetric ? stressResults.maxVonMisesMpa : stressResults.maxVonMisesPsi;
  const peakHoop = isMetric ? stressResults.maxHoopStressMpa : stressResults.maxHoopStressPsi;
  const peakRadial = isMetric ? stressResults.maxRadialStressMagnitudeMpa : stressResults.maxRadialStressMagnitudePsi;
  const surfaceAxial = isMetric
    ? psiToMpa(stressResults.surfaceAxialPickupPsi).toFixed(1)
    : stressResults.surfaceAxialPickupPsi.toLocaleString();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              String Stress Distribution Profile
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Recharts Triaxial Engine
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Axial (&sigma;<sub>a</sub>), Hoop (&sigma;<sub>h</sub>), Radial (&sigma;<sub>r</sub>) & von Mises (&sigma;<sub>vM</sub>) stresses along string length
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowControls(!showControls)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              showControls
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parameters</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title={isExpanded ? 'Collapse Height' : 'Expand Height'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI Cards: Critical Stress Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Peak von Mises */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Peak Triaxial (&sigma;<sub>vM</sub>)</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {typeof peakVonMises === 'number' ? peakVonMises.toLocaleString() : peakVonMises} {isMetric ? 'MPa' : 'psi'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>At {isMetric ? Math.round(ftToM(stressResults.maxVonMisesDepthFt)) + ' m' : stressResults.maxVonMisesDepthFt.toLocaleString() + ' ft'}</span>
            <span
              className={`font-mono font-bold ${
                stressResults.peakUtilizationPercent > 100
                  ? 'text-rose-400'
                  : stressResults.peakUtilizationPercent > 80
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {stressResults.peakUtilizationPercent}% YS
            </span>
          </div>
        </div>

        {/* Surface Axial Stress */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Surface Axial (&sigma;<sub>a</sub>)</span>
            <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold font-mono text-sky-400">
            {surfaceAxial} {isMetric ? 'MPa' : 'psi'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Max string tension at surface
          </div>
        </div>

        {/* Max Hoop Stress */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Peak Hoop (&sigma;<sub>h</sub>)</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-400">
            {typeof peakHoop === 'number' ? peakHoop.toLocaleString() : peakHoop} {isMetric ? 'MPa' : 'psi'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stressResults.maxHoopStressPsi >= 0 ? 'Tensile (Internal burst)' : 'Compressive (Collapse)'}
          </div>
        </div>

        {/* Max Radial Stress (at TD) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>TD Radial (&sigma;<sub>r</sub>)</span>
            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            -{typeof peakRadial === 'number' ? peakRadial.toLocaleString() : peakRadial} {isMetric ? 'MPa' : 'psi'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Compressive wall fluid contact
          </div>
        </div>
      </div>

      {/* Expandable Parameters Drawer */}
      {showControls && (
        <div className="p-4 bg-slate-950/90 rounded-lg border border-slate-800/90 space-y-3 transition-all text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Stress Simulation Parameters
            </span>
            <span className="text-[11px] text-slate-500">
              Adjust circulating pressures and fluid gradients
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Internal Pump Surface Pressure */}
            <div>
              <label className="text-slate-400 block mb-1">
                Internal Pump Pressure (P<sub>int,surf</sub>) {isMetric ? '(bar)' : '(psi)'}
              </label>
              <input
                type="number"
                step={isMetric ? 10 : 100}
                min="0"
                max={isMetric ? 700 : 10000}
                value={isMetric ? Math.round(psiToBar(internalPressurePsi)) : internalPressurePsi}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setInternalPressurePsi(isMetric ? barToPsi(val) : val);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Surface circulating/injection pressure
              </span>
            </div>

            {/* Internal Fluid Density */}
            <div>
              <label className="text-slate-400 block mb-1">
                Internal Fluid Density {isMetric ? '(SG)' : '(ppg)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                value={isMetric ? Number(ppgToSg(internalDensityPpg).toFixed(2)) : internalDensityPpg}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 8.4;
                  setInternalDensityPpg(isMetric ? sgToPpg(val) : val);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Tubing bore fluid (water = {isMetric ? '1.0 SG' : '8.34 ppg'})
              </span>
            </div>

            {/* Wellbore Annulus Fluid Density (read-only reference synced with forces input) */}
            <div>
              <label className="text-slate-400 block mb-1">
                Annular Fluid Density {isMetric ? '(SG)' : '(ppg)'}
              </label>
              <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 font-mono flex items-center justify-between">
                <span>
                  {isMetric
                    ? Number(ppgToSg(forcesInput.wellboreFluidDensityPpg).toFixed(2)) + ' SG'
                    : forcesInput.wellboreFluidDensityPpg + ' ppg'}
                </span>
                <span className="text-[10px] text-slate-500">(from Wellbore inputs)</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Determines external hydrostatic pressure
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Operational Mode and Component Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Operation Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Operation State:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setOperationMode('pickup')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                operationMode === 'pickup'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
              <span>POOH (Pick-up)</span>
            </button>
            <button
              type="button"
              onClick={() => setOperationMode('slackoff')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                operationMode === 'slackoff'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>RIH (Slack-off)</span>
            </button>
            <button
              type="button"
              onClick={() => setOperationMode('neutral')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                operationMode === 'neutral'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Anchor className="w-3 h-3" />
              <span>Neutral</span>
            </button>
            <button
              type="button"
              onClick={() => setOperationMode('all')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                operationMode === 'all'
                  ? 'bg-indigo-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>All 3 Axial</span>
            </button>
          </div>
        </div>

        {/* Stress Component Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAxial(!showAxial)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showAxial
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            &sigma;<sub>axial</sub>
          </button>

          <button
            type="button"
            onClick={() => setShowHoop(!showHoop)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showHoop
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            &sigma;<sub>hoop</sub>
          </button>

          <button
            type="button"
            onClick={() => setShowRadial(!showRadial)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showRadial
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            &sigma;<sub>radial</sub>
          </button>

          <button
            type="button"
            onClick={() => setShowVonMises(!showVonMises)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showVonMises
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            &sigma;<sub>vonMises</sub>
          </button>

          <button
            type="button"
            onClick={() => setShowLimits(!showLimits)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
              showLimits
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Limits
          </button>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div
        className={`w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-3 select-none transition-all ${
          isExpanded ? 'h-[560px]' : 'h-[420px]'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 35, left: 15, bottom: 25 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

            {/* Depth Axis (X) */}
            <XAxis
              dataKey="depth"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              label={{
                value: `String Length / Measured Depth (${isMetric ? 'm' : 'ft'})`,
                position: 'insideBottom',
                offset: -14,
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />

            {/* Stress Axis (Y) */}
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickFormatter={(val) => {
                if (isMetric) return `${val} MPa`;
                if (Math.abs(val) >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
              label={{
                value: `Stress Component (${isMetric ? 'MPa' : 'psi'})`,
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />

            {/* Zero Stress reference line */}
            <ReferenceLine
              y={0}
              stroke="#475569"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: 'Neutral (0 Stress)',
                fill: '#64748b',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            {/* Material Limits */}
            {showLimits && (
              <>
                {/* 100% Yield Strength Limit */}
                <ReferenceLine
                  y={yieldStrength}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `Yield Strength Sy (${isMetric ? yieldStrength + ' MPa' : Math.round(yieldStrength).toLocaleString() + ' psi'})`,
                    fill: '#ef4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />

                {/* 80% Safe Working Limit */}
                <ReferenceLine
                  y={safeLimit}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: `80% Safe Limit (${isMetric ? safeLimit + ' MPa' : Math.round(safeLimit).toLocaleString() + ' psi'})`,
                    fill: '#f59e0b',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              </>
            )}

            {/* Rich Custom Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as typeof chartData[0];
                if (!data || !data.raw) return null;
                const raw = data.raw;

                return (
                  <div className="bg-slate-900/95 border border-slate-700/90 backdrop-blur-md rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[280px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-white font-mono flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                        Depth: {isMetric ? `${(raw.depthM ?? 0).toLocaleString()} m` : `${(raw.depthFt ?? 0).toLocaleString()} ft`}
                      </span>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                          (data.utilization ?? 0) <= 80
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : (data.utilization ?? 0) <= 100
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {(data.utilization ?? 0) <= 80 ? 'Safe' : (data.utilization ?? 0) <= 100 ? 'Caution' : 'Exceeds Yield'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                      <span>TVD: {isMetric ? `${raw.tvdM ?? 0} m` : `${(raw.tvdFt ?? 0).toLocaleString()} ft`}</span>
                      <span>Diff Pressure (&Delta;P): {isMetric ? `${raw.differentialPressureBar ?? 0} bar` : `${(raw.differentialPressurePsi ?? 0).toLocaleString()} psi`}</span>
                    </div>

                    {/* Stresses List */}
                    <div className="space-y-1.5 font-mono text-[11px] pt-1 border-t border-slate-800">
                      {/* Axial Stress */}
                      <div className="flex items-center justify-between text-sky-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          Axial Stress (&sigma;<sub>a</sub>):
                        </span>
                        <span className="font-bold">
                          {isMetric
                            ? `${operationMode === 'slackoff' ? raw.axialStressSlackoffMpa : raw.axialStressPickupMpa} MPa`
                            : `${(operationMode === 'slackoff' ? raw.axialStressSlackoffPsi : raw.axialStressPickupPsi).toLocaleString()} psi`}
                        </span>
                      </div>

                      {/* Hoop Stress */}
                      <div className="flex items-center justify-between text-purple-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          Hoop Stress (&sigma;<sub>h</sub>):
                        </span>
                        <span className="font-bold">
                          {isMetric ? `${raw.hoopStressMpa} MPa` : `${(raw.hoopStressPsi ?? 0).toLocaleString()} psi`}
                        </span>
                      </div>

                      {/* Radial Stress */}
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Radial Stress (&sigma;<sub>r</sub>):
                        </span>
                        <span className="font-bold">
                          {isMetric ? `${raw.radialStressMpa} MPa` : `${(raw.radialStressPsi ?? 0).toLocaleString()} psi`}
                        </span>
                      </div>

                      {/* von Mises Triaxial */}
                      <div className="flex items-center justify-between text-amber-400 pt-1.5 border-t border-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          von Mises (&sigma;<sub>vM</sub>):
                        </span>
                        <span className="font-bold text-amber-300">
                          {isMetric
                            ? `${operationMode === 'slackoff' ? raw.vonMisesSlackoffMpa : raw.vonMisesPickupMpa} MPa`
                            : `${(operationMode === 'slackoff' ? raw.vonMisesSlackoffPsi : raw.vonMisesPickupPsi).toLocaleString()} psi`}
                        </span>
                      </div>

                      {/* Stress Utilization % */}
                      <div className="flex items-center justify-between text-slate-300 text-[10px] pt-1">
                        <span>Yield Utilization:</span>
                        <span className="font-bold font-mono">
                          {data.utilization}% of {isMetric ? `${yieldStrength} MPa` : `${Math.round(yieldStrength).toLocaleString()} psi`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Lines according to user toggles */}

            {/* 1. Axial Stress Curves */}
            {showAxial && operationMode !== 'all' && (
              <Line
                type="monotone"
                dataKey="axialStress"
                name={operationMode === 'pickup' ? 'Axial Stress (POOH)' : operationMode === 'slackoff' ? 'Axial Stress (RIH)' : 'Axial Stress (Neutral)'}
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#38bdf8' }}
                activeDot={{ r: 5, stroke: '#38bdf8', strokeWidth: 2, fill: '#0f172a' }}
              />
            )}

            {/* If 'all' mode selected, show all 3 axial curves for comparison */}
            {showAxial && operationMode === 'all' && (
              <>
                <Line
                  type="monotone"
                  dataKey="axialStressPickup"
                  name="Axial POOH (Pick-up)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="axialStressNeutral"
                  name="Axial Neutral (Hanging)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="axialStressSlackoff"
                  name="Axial RIH (Slack-off)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}

            {/* 2. Hoop Stress Curve */}
            {showHoop && (
              <Line
                type="monotone"
                dataKey="hoopStress"
                name="Hoop Stress (σ_h)"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#a855f7' }}
                activeDot={{ r: 5, stroke: '#a855f7', strokeWidth: 2, fill: '#0f172a' }}
              />
            )}

            {/* 3. Radial Stress Curve */}
            {showRadial && (
              <Line
                type="monotone"
                dataKey="radialStress"
                name="Radial Stress (σ_r)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#10b981' }}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#0f172a' }}
              />
            )}

            {/* 4. von Mises Triaxial Equivalent Stress */}
            {showVonMises && (
              <Line
                type="monotone"
                dataKey="vonMises"
                name="von Mises (σ_vM)"
                stroke="#f97316"
                strokeWidth={2.5}
                strokeDasharray="5 3"
                dot={{ r: 2.5, fill: '#f97316' }}
                activeDot={{ r: 5, stroke: '#f97316', strokeWidth: 2, fill: '#0f172a' }}
              />
            )}

            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Engineering Mechanics Info Footer */}
      <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Lamé & Triaxial Mechanics Interpretation (API RP 5C7 / API 5ST)</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          &bull; <strong>Axial Stress (&sigma;<sub>a</sub>)</strong> peaks at the surface during POOH due to suspended string weight and wellbore friction, diminishing towards the bottom of the well.
          <br />
          &bull; <strong>Hoop Stress (&sigma;<sub>h</sub>)</strong> is governed by differential pressure between the inner bore and annulus. A positive value indicates burst loading, while a negative value signifies collapse compression.
          <br />
          &bull; <strong>Radial Stress (&sigma;<sub>r</sub>)</strong> represents the compressive hydrostatic and fluid contact load across the wall, scaling with true vertical depth (TVD).
          <br />
          &bull; <strong>von Mises Stress (&sigma;<sub>vM</sub>)</strong> evaluates the combined 3D triaxial state. Safe operations should strictly stay within the 80% Safe Yield Limit.
        </p>
      </div>
    </div>
  );
};
