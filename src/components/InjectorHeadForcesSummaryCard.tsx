import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Sliders,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Settings2,
  RotateCcw,
  Gauge,
  Activity,
  Layers
} from 'lucide-react';
import {
  CoiledTubingString,
  WellboreForcesInput,
  UnitSystem,
} from '../types/coiledTubing';
import { WellboreProfile } from '../types/wellbore';
import {
  WellboreForcesResult,
  calculateWellboreForces,
  calculateTubingLimits,
  lbfToKn,
  psiToBar,
} from '../utils/engineeringCalculations';

interface InjectorHeadForcesSummaryCardProps {
  ct: CoiledTubingString;
  forcesInput: WellboreForcesInput;
  results: WellboreForcesResult;
  unitSystem: UnitSystem;
  wellboreProfile?: WellboreProfile;
  onUpdateForcesInput?: (updated: Partial<WellboreForcesInput>) => void;
}

export const InjectorHeadForcesSummaryCard: React.FC<InjectorHeadForcesSummaryCardProps> = ({
  ct,
  forcesInput,
  results,
  unitSystem,
  wellboreProfile,
  onUpdateForcesInput,
}) => {
  const isMetric = unitSystem === 'metric';

  // Surface equipment effects state
  const [includeStripperFriction, setIncludeStripperFriction] = useState<boolean>(true);
  const [stripperFrictionLbf, setStripperFrictionLbf] = useState<number>(1500); // Typical CT stripper packoff drag: 1000-2500 lbf
  const [includeWellheadPressure, setIncludeWellheadPressure] = useState<boolean>(
    (wellboreProfile?.wellheadPressurePsi ?? 0) > 0
  );
  const [customWellheadPressurePsi, setCustomWellheadPressurePsi] = useState<number>(
    wellboreProfile?.wellheadPressurePsi ?? 0
  );

  // Synchronize when wellbore profile updates from external load scenario preset
  useEffect(() => {
    if (wellboreProfile?.wellheadPressurePsi !== undefined) {
      setCustomWellheadPressurePsi(wellboreProfile.wellheadPressurePsi);
      setIncludeWellheadPressure(wellboreProfile.wellheadPressurePsi > 0);
    }
  }, [wellboreProfile?.wellheadPressurePsi]);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);
  const [isSensitivityExpanded, setIsSensitivityExpanded] = useState<boolean>(true);

  // Cross-sectional outer area of CT string: A = pi/4 * OD^2
  const ctCrossSectionAreaSqIn = (Math.PI / 4) * Math.pow(ct.outerDiameterIn, 2);

  // Surface wellhead pressure (psi)
  const activeWhpPsi = includeWellheadPressure ? Math.max(0, customWellheadPressurePsi) : 0;
  // Wellhead pressure upthrust force (piston effect pushing tubing out of the well): F_piston = P_wh * A_od
  const wellheadUpthrustPistonLbf = activeWhpPsi * ctCrossSectionAreaSqIn;

  // Active stripper packoff drag (lbf)
  const activeStripperDragLbf = includeStripperFriction ? Math.max(0, stripperFrictionLbf) : 0;

  // Tubing structural limits
  const limits = useMemo(() => calculateTubingLimits(ct), [ct]);
  const safeOverpullLimitLbf = limits.safeOverpullLbf; // 80% tensile yield

  // --- Total Pick-Up Weight at Injector Head (POOH) ---
  // When pulling out of hole:
  // - Downhole pick-up tension = W_neutral + F_wellbore_drag
  // - Stripper friction pulls downward against upward moving string (+ activeStripperDragLbf)
  // - Wellhead pressure upthrust pushes string upward (- wellheadUpthrustPistonLbf)
  const injectorPickupWeightLbf =
    results.surfacePickupWeightLbf + activeStripperDragLbf - wellheadUpthrustPistonLbf;

  // --- Total Slack-Off Weight at Injector Head (RIH) ---
  // When running in hole:
  // - Downhole slack-off load = W_neutral - F_wellbore_drag
  // - Stripper friction pushes upward against downward entering string (- activeStripperDragLbf)
  // - Wellhead pressure upthrust pushes string upward (- wellheadUpthrustPistonLbf)
  const injectorSlackoffWeightLbf =
    results.surfaceSlackoffWeightLbf - activeStripperDragLbf - wellheadUpthrustPistonLbf;

  // Snubbing state: If slack-off weight at injector <= 0, upward forces exceed buoyant string weight
  const isSnubbingRequired = injectorSlackoffWeightLbf <= 0;
  const snubbingForceRequiredLbf = isSnubbingRequired ? Math.abs(injectorSlackoffWeightLbf) : 0;

  // Overpull and Yield Margins
  const remainingOverpullMarginLbf = safeOverpullLimitLbf - injectorPickupWeightLbf;
  const overpullCapacityUsedPercent = safeOverpullLimitLbf > 0
    ? (injectorPickupWeightLbf / safeOverpullLimitLbf) * 100
    : 0;

  // Drag ratio
  const dragRatioPercent = results.surfaceNeutralWeightLbf > 0
    ? (results.totalWellboreDragLbf / results.surfaceNeutralWeightLbf) * 100
    : 0;

  // Active casing friction
  const activeCasingMu = forcesInput.frictionCoefficientCasing;

  // Friction Presets
  const frictionPresets = [
    { label: 'Lubricated / OBM', mu: 0.18, desc: 'Oil-based mud or polymer sweep' },
    { label: 'Standard Csg (WBM)', mu: 0.25, desc: 'Fresh water / clean brine' },
    { label: 'Elevated (Dirty Csg)', mu: 0.32, desc: 'Fines, cuttings, or doglegs' },
    { label: 'High (Dry Gas / Open Hole)', mu: 0.40, desc: 'High friction or sand' },
  ];

  // Sensitivity analysis: calculate weights across friction range
  const sensitivityScenarios = useMemo(() => {
    const muList = [0.18, 0.24, 0.30, 0.38, 0.45];
    // Include current if not already present
    if (!muList.some((m) => Math.abs(m - activeCasingMu) < 0.015)) {
      muList.push(activeCasingMu);
      muList.sort((a, b) => a - b);
    }

    return muList.map((mu) => {
      const scenarioForces = calculateWellboreForces(ct, {
        ...forcesInput,
        frictionCoefficientCasing: mu,
      });

      const scPickupLbf =
        scenarioForces.surfacePickupWeightLbf + activeStripperDragLbf - wellheadUpthrustPistonLbf;
      const scSlackoffLbf =
        scenarioForces.surfaceSlackoffWeightLbf - activeStripperDragLbf - wellheadUpthrustPistonLbf;
      const scSnubbing = scSlackoffLbf <= 0;
      const scDragLbf = scenarioForces.totalWellboreDragLbf;
      const scLockup = scenarioForces.isLockedUp;
      const scOverpullSafe = scPickupLbf <= safeOverpullLimitLbf;

      return {
        mu,
        isCurrent: Math.abs(mu - activeCasingMu) < 0.005,
        pickupLbf: scPickupLbf,
        slackoffLbf: scSlackoffLbf,
        dragLbf: scDragLbf,
        isSnubbing: scSnubbing,
        isLockedUp: scLockup,
        isOverpullSafe: scOverpullSafe,
      };
    });
  }, [
    ct,
    forcesInput,
    activeCasingMu,
    activeStripperDragLbf,
    wellheadUpthrustPistonLbf,
    safeOverpullLimitLbf,
  ]);

  const handleUpdateMu = (newMu: number) => {
    if (onUpdateForcesInput) {
      onUpdateForcesInput({ frictionCoefficientCasing: Number(newMu.toFixed(2)) });
    }
  };

  return (
    <div
      id="injector-head-forces-summary-card"
      className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-lg relative overflow-hidden"
    >
      {/* Background Subtle Gradient Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Injector Head Total Weights &amp; Friction Summary
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Load Cell Reading
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Net surface loads sensed at injector chains based on wellbore friction (&mu; = {activeCasingMu.toFixed(2)}), string buoyancy, and surface packoff drag
            </p>
          </div>
        </div>

        {/* Quick Controls & Toggles */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            id="toggle-injector-details-btn"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Surface Stack Adjustments</span>
            {isDetailsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Surface Equipment Fine-Tuning Drawer */}
      {isDetailsExpanded && (
        <div className="my-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Surface Packoff &amp; Wellhead Pressure Configuration</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              OD: {ct.outerDiameterIn.toFixed(3)}&quot; &bull; Area: {ctCrossSectionAreaSqIn.toFixed(3)} in&sup2;
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Stripper Packoff Friction */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={includeStripperFriction}
                    onChange={(e) => setIncludeStripperFriction(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Stripper Element Drag</span>
                </label>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {includeStripperFriction
                    ? isMetric
                      ? `${Math.round(lbfToKn(stripperFrictionLbf))} kN`
                      : `${stripperFrictionLbf.toLocaleString()} lbf`
                    : 'OFF (0)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="250"
                disabled={!includeStripperFriction}
                value={stripperFrictionLbf}
                onChange={(e) => setStripperFrictionLbf(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded disabled:opacity-40"
              />
              <p className="text-[10px] text-slate-500">
                Adds downward drag in POOH, opposes downward pipe entry in RIH.
              </p>
            </div>

            {/* Wellhead Pressure Piston Upthrust */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={includeWellheadPressure}
                    onChange={(e) => setIncludeWellheadPressure(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Wellhead Pressure</span>
                </label>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {includeWellheadPressure
                    ? isMetric
                      ? `${Math.round(psiToBar(customWellheadPressurePsi))} bar`
                      : `${customWellheadPressurePsi.toLocaleString()} psi`
                    : '0 psi'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="15000"
                  step="250"
                  disabled={!includeWellheadPressure}
                  value={customWellheadPressurePsi}
                  onChange={(e) => setCustomWellheadPressurePsi(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Upthrust Piston Force: <span className="text-slate-300 font-mono font-medium">{isMetric ? Math.round(lbfToKn(wellheadUpthrustPistonLbf)) + ' kN' : Math.round(wellheadUpthrustPistonLbf).toLocaleString() + ' lbf'}</span>
              </p>
            </div>

            {/* Active Friction Coefficient Adjuster */}
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Casing Friction Coefficient (&mu;)</span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {activeCasingMu.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMu(Math.max(0.1, activeCasingMu - 0.02))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 font-mono text-xs"
                >
                  -0.02
                </button>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.01"
                  value={activeCasingMu}
                  onChange={(e) => handleUpdateMu(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMu(Math.min(0.6, activeCasingMu + 0.02))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 font-mono text-xs"
                >
                  +0.02
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Directly updates wellbore contact forces and axial drag integration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Key Metric Cards: Total Pick-up vs Slack-off at Injector Head */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Card 1: Total Pick-Up Weight at Injector Head (POOH) */}
        <div
          id="total-pickup-weight-card"
          className="bg-gradient-to-b from-slate-950/90 to-slate-900/90 border border-amber-500/30 rounded-xl p-4 shadow-sm relative"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ArrowUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Total Pick-Up Weight (POOH)
                </span>
                <span className="text-[10px] text-slate-400">
                  Total load on injector chains when pulling out of hole
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Tensile Load
            </span>
          </div>

          {/* Main Number Readout */}
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-3xl font-extrabold font-mono text-amber-300 tracking-tight">
              {isMetric
                ? `${Math.round(lbfToKn(injectorPickupWeightLbf)).toLocaleString()} kN`
                : `${Math.round(injectorPickupWeightLbf).toLocaleString()} lbf`}
            </div>
            <span className="text-xs font-mono text-slate-400">
              ({isMetric
                ? `${Math.round(injectorPickupWeightLbf).toLocaleString()} lbf`
                : `${Math.round(lbfToKn(injectorPickupWeightLbf))} kN`})
            </span>
          </div>

          {/* Detailed Component Breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Buoyed String + BHA Weight:</span>
              <span className="font-mono text-slate-200">
                +{isMetric ? Math.round(lbfToKn(results.surfaceNeutralWeightLbf)) + ' kN' : Math.round(results.surfaceNeutralWeightLbf).toLocaleString() + ' lbf'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <span>Wellbore Friction Drag (&mu; = {activeCasingMu.toFixed(2)}):</span>
              </span>
              <span className="font-mono text-amber-400 font-medium">
                +{isMetric ? Math.round(lbfToKn(results.totalWellboreDragLbf)) + ' kN' : Math.round(results.totalWellboreDragLbf).toLocaleString() + ' lbf'}
              </span>
            </div>
            {includeStripperFriction && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Stripper Element Drag:</span>
                <span className="font-mono text-amber-400/90 font-medium">
                  +{isMetric ? Math.round(lbfToKn(activeStripperDragLbf)) + ' kN' : Math.round(activeStripperDragLbf).toLocaleString() + ' lbf'}
                </span>
              </div>
            )}
            {includeWellheadPressure && wellheadUpthrustPistonLbf > 0 && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Piston Upthrust (WHP Assist):</span>
                <span className="font-mono text-emerald-400 font-medium">
                  -{isMetric ? Math.round(lbfToKn(wellheadUpthrustPistonLbf)) + ' kN' : Math.round(wellheadUpthrustPistonLbf).toLocaleString() + ' lbf'}
                </span>
              </div>
            )}
          </div>

          {/* Safety & Overpull Indicator Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Safe Overpull Limit (80% Yield):</span>
              </span>
              <span className="font-mono text-slate-300 font-semibold">
                {isMetric ? `${Math.round(lbfToKn(safeOverpullLimitLbf))} kN` : `${Math.round(safeOverpullLimitLbf).toLocaleString()} lbf`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overpullCapacityUsedPercent > 100
                    ? 'bg-rose-500'
                    : overpullCapacityUsedPercent > 80
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overpullCapacityUsedPercent))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-400">
              <span>Capacity Used: {overpullCapacityUsedPercent.toFixed(1)}%</span>
              <span
                className={
                  remainingOverpullMarginLbf < 0
                    ? 'text-rose-400 font-bold'
                    : remainingOverpullMarginLbf < 10000
                    ? 'text-amber-400 font-medium'
                    : 'text-emerald-400 font-medium'
                }
              >
                {remainingOverpullMarginLbf >= 0
                  ? `Margin: +${isMetric ? Math.round(lbfToKn(remainingOverpullMarginLbf)) + ' kN' : Math.round(remainingOverpullMarginLbf).toLocaleString() + ' lbf'}`
                  : `OVER LIMIT: -${isMetric ? Math.round(lbfToKn(Math.abs(remainingOverpullMarginLbf))) + ' kN' : Math.round(Math.abs(remainingOverpullMarginLbf)).toLocaleString() + ' lbf'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Slack-Off Weight at Injector Head (RIH) */}
        <div
          id="total-slackoff-weight-card"
          className={`bg-gradient-to-b from-slate-950/90 to-slate-900/90 border rounded-xl p-4 shadow-sm relative ${
            isSnubbingRequired
              ? 'border-purple-500/40'
              : 'border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                  isSnubbingRequired
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Total Slack-Off Weight (RIH)
                </span>
                <span className="text-[10px] text-slate-400">
                  Weight on injector when running into the wellbore
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${
                isSnubbingRequired
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}
            >
              {isSnubbingRequired ? 'SNUBBING MODE' : 'GRAVITY TENSION'}
            </span>
          </div>

          {/* Main Number Readout */}
          <div className="flex items-baseline gap-2 mt-1">
            <div
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                isSnubbingRequired ? 'text-purple-300' : 'text-emerald-300'
              }`}
            >
              {isMetric
                ? `${Math.round(lbfToKn(injectorSlackoffWeightLbf)).toLocaleString()} kN`
                : `${Math.round(injectorSlackoffWeightLbf).toLocaleString()} lbf`}
            </div>
            <span className="text-xs font-mono text-slate-400">
              ({isMetric
                ? `${Math.round(injectorSlackoffWeightLbf).toLocaleString()} lbf`
                : `${Math.round(lbfToKn(injectorSlackoffWeightLbf))} kN`})
            </span>
          </div>

          {/* Detailed Component Breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Buoyed String + BHA Weight:</span>
              <span className="font-mono text-slate-200">
                +{isMetric ? Math.round(lbfToKn(results.surfaceNeutralWeightLbf)) + ' kN' : Math.round(results.surfaceNeutralWeightLbf).toLocaleString() + ' lbf'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <span>Wellbore Friction Drag (&mu; = {activeCasingMu.toFixed(2)}):</span>
              </span>
              <span className="font-mono text-emerald-400 font-medium">
                -{isMetric ? Math.round(lbfToKn(results.totalWellboreDragLbf)) + ' kN' : Math.round(results.totalWellboreDragLbf).toLocaleString() + ' lbf'}
              </span>
            </div>
            {includeStripperFriction && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Stripper Element Drag:</span>
                <span className="font-mono text-emerald-400/90 font-medium">
                  -{isMetric ? Math.round(lbfToKn(activeStripperDragLbf)) + ' kN' : Math.round(activeStripperDragLbf).toLocaleString() + ' lbf'}
                </span>
              </div>
            )}
            {includeWellheadPressure && wellheadUpthrustPistonLbf > 0 && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Piston Upthrust (Opposing Entry):</span>
                <span className="font-mono text-rose-400 font-medium">
                  -{isMetric ? Math.round(lbfToKn(wellheadUpthrustPistonLbf)) + ' kN' : Math.round(wellheadUpthrustPistonLbf).toLocaleString() + ' lbf'}
                </span>
              </div>
            )}
          </div>

          {/* Operational Status Box */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            {isSnubbingRequired ? (
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-lg p-2 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-300 block">
                    Hydraulic Snubbing Thrust Required: {isMetric ? `${Math.round(lbfToKn(snubbingForceRequiredLbf))} kN` : `${Math.round(snubbingForceRequiredLbf).toLocaleString()} lbf`}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Upward drag &amp; pressure exceed string weight. Injector chains must actively push pipe into wellhead.
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-2 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300 block">
                    Positive Hanging Weight &bull; Free Gravity Feed
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Net downhole string weight overcomes friction drag. Injector operates in standard braking tension.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Friction Presets Quick Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quick Friction Presets (&mu;):</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Total wellbore contact normal force: <span className="text-slate-300 font-mono font-medium">{isMetric ? Math.round(lbfToKn(results.totalWellboreDragLbf / (activeCasingMu || 0.01))) + ' kN' : Math.round(results.totalWellboreDragLbf / (activeCasingMu || 0.01)).toLocaleString() + ' lbf'}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {frictionPresets.map((p) => {
            const isSelected = Math.abs(p.mu - activeCasingMu) < 0.01;
            return (
              <button
                key={p.mu}
                type="button"
                onClick={() => handleUpdateMu(p.mu)}
                className={`p-2 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-cyan-600/20 border-cyan-500/60 text-white shadow-sm'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{p.label}</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    &mu;={p.mu.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Friction Sensitivity Table (Collapsible) */}
      <div className="mt-4 pt-3 border-t border-slate-800/90">
        <button
          type="button"
          onClick={() => setIsSensitivityExpanded(!isSensitivityExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white py-1"
        >
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Friction Sensitivity Matrix &bull; Pick-Up &amp; Slack-Off Weights vs. &mu;</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-normal">
            <span>{isSensitivityExpanded ? 'Collapse Matrix' : 'Expand Matrix'}</span>
            {isSensitivityExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isSensitivityExpanded && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                  <th className="py-2 px-3 font-semibold">Friction (&mu;)</th>
                  <th className="py-2 px-3 font-semibold">Wellbore Drag</th>
                  <th className="py-2 px-3 font-semibold text-amber-300">Total Pick-Up (POOH)</th>
                  <th className="py-2 px-3 font-semibold text-emerald-300">Total Slack-Off (RIH)</th>
                  <th className="py-2 px-3 font-semibold">Operating Mode</th>
                  <th className="py-2 px-3 font-semibold">Overpull Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {sensitivityScenarios.map((sc, idx) => {
                  const marginLbf = safeOverpullLimitLbf - sc.pickupLbf;
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleUpdateMu(sc.mu)}
                      className={`cursor-pointer transition-colors ${
                        sc.isCurrent
                          ? 'bg-cyan-950/40 border-l-2 border-cyan-400 text-white font-semibold'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <span className="flex items-center gap-1.5">
                          <span className={sc.isCurrent ? 'text-cyan-300 font-bold' : ''}>
                            {sc.mu.toFixed(2)}
                          </span>
                          {sc.isCurrent && (
                            <span className="text-[9px] font-sans px-1 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                              ACTIVE
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {isMetric
                          ? `${Math.round(lbfToKn(sc.dragLbf))} kN`
                          : `${Math.round(sc.dragLbf).toLocaleString()} lbf`}
                      </td>
                      <td className="py-2 px-3 text-amber-300 font-semibold">
                        {isMetric
                          ? `${Math.round(lbfToKn(sc.pickupLbf))} kN`
                          : `${Math.round(sc.pickupLbf).toLocaleString()} lbf`}
                      </td>
                      <td
                        className={`py-2 px-3 font-semibold ${
                          sc.isSnubbing ? 'text-purple-300' : 'text-emerald-300'
                        }`}
                      >
                        {isMetric
                          ? `${Math.round(lbfToKn(sc.slackoffLbf))} kN`
                          : `${Math.round(sc.slackoffLbf).toLocaleString()} lbf`}
                      </td>
                      <td className="py-2 px-3">
                        {sc.isSnubbing ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Snubbing ({isMetric ? Math.round(lbfToKn(Math.abs(sc.slackoffLbf))) + ' kN' : Math.round(Math.abs(sc.slackoffLbf)).toLocaleString() + ' lbf'})
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Tension ({isMetric ? Math.round(lbfToKn(sc.slackoffLbf)) + ' kN' : Math.round(sc.slackoffLbf).toLocaleString() + ' lbf'})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            marginLbf < 0
                              ? 'text-rose-400 font-bold'
                              : marginLbf < 10000
                              ? 'text-amber-300 font-medium'
                              : 'text-emerald-400'
                          }
                        >
                          {marginLbf >= 0 ? '+' : ''}
                          {isMetric
                            ? `${Math.round(lbfToKn(marginLbf))} kN`
                            : `${Math.round(marginLbf).toLocaleString()} lbf`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
