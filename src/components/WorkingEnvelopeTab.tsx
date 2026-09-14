import React, { useState } from 'react';
import { CoiledTubingString, UnitSystem, WorkingPoint, UsedCondition } from '../types/coiledTubing';
import { 
  calculateTubingLimits, 
  generateWorkingEnvelope, 
  evaluateOperatingPoint,
  getEffectiveTubingString,
  calculateUsedConditionComparison,
  psiToMpa, 
  mpaToPsi, 
  lbfToKn, 
  knToLbf,
  inToMm
} from '../utils/engineeringCalculations';
import { UsedConditionPanel } from './UsedConditionPanel';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Sliders, 
  ArrowDownUp, 
  Activity,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from 'lucide-react';

interface WorkingEnvelopeTabProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  safetyFactor?: number;
  showNominalOverlay?: boolean;
  onChangeSafetyFactor?: (sf: number) => void;
  onToggleNominalOverlay?: () => void;
  onChangeString?: (ct: CoiledTubingString) => void;
}

export const WorkingEnvelopeTab: React.FC<WorkingEnvelopeTabProps> = ({
  ct,
  unitSystem,
  safetyFactor = 0.80,
  showNominalOverlay = true,
  onChangeSafetyFactor,
  onToggleNominalOverlay,
  onChangeString,
}) => {
  const isMetric = unitSystem === 'metric';

  // Live Operating Point state
  const [operatingPoint, setOperatingPoint] = useState<WorkingPoint>({
    differentialPressurePsi: 4500, // Pi - Po
    axialTensionLbf: 22000,
  });

  const [showUsedOverlay, setShowUsedOverlay] = useState<boolean>(true);
  const [showUsedSettings, setShowUsedSettings] = useState<boolean>(false);

  const isUsedActive = Boolean(ct.usedCondition?.enabled);
  const effectiveUsedString = getEffectiveTubingString(ct);

  const limits = calculateTubingLimits(ct, operatingPoint.axialTensionLbf, safetyFactor);
  const usedLimits = calculateTubingLimits(effectiveUsedString, operatingPoint.axialTensionLbf, safetyFactor);

  const envelope = generateWorkingEnvelope(ct, 40, safetyFactor);
  const usedEnvelope = generateWorkingEnvelope(effectiveUsedString, 40, safetyFactor);

  const evalResult = evaluateOperatingPoint(
    ct,
    operatingPoint.differentialPressurePsi,
    operatingPoint.axialTensionLbf,
    safetyFactor
  );

  const usedEvalResult = evaluateOperatingPoint(
    effectiveUsedString,
    operatingPoint.differentialPressurePsi,
    operatingPoint.axialTensionLbf,
    safetyFactor
  );

  const comparison = calculateUsedConditionComparison(ct, operatingPoint.axialTensionLbf, safetyFactor);

  // Chart coordinate mapping
  // X: Diff Pressure from -Collapse to +Burst
  // Y: Axial Load from Max Compression to Max Tension
  const minX = -limits.ovalityDeratedCollapsePsi * 1.15;
  const maxX = limits.yieldBurstPressurePsi * 1.15;
  const minY = -limits.tensileYieldLbf * 0.95;
  const maxY = limits.tensileYieldLbf * 1.15;

  const width = 680;
  const height = 400;
  const padding = 50;

  const scaleX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

  // SVG Paths for 100% Yield Envelope, Derated Safe Envelope & Used String Envelope
  const pathYield = [
    ...envelope.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.diffPressurePsi)} ${scaleY(p.maxTensionLbf)}`),
    ...[...envelope].reverse().map((p) => `L ${scaleX(p.diffPressurePsi)} ${scaleY(p.maxCompressionLbf)}`),
    'Z',
  ].join(' ');

  const pathSafe = [
    ...envelope.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.diffPressurePsi)} ${scaleY(p.safeTensionLbf)}`),
    ...[...envelope].reverse().map((p) => `L ${scaleX(p.diffPressurePsi)} ${scaleY(p.safeCompressionLbf)}`),
    'Z',
  ].join(' ');

  const pathUsed = [
    ...usedEnvelope.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.diffPressurePsi)} ${scaleY(p.safeTensionLbf)}`),
    ...[...usedEnvelope].reverse().map((p) => `L ${scaleX(p.diffPressurePsi)} ${scaleY(p.safeCompressionLbf)}`),
    'Z',
  ].join(' ');

  const currentX = scaleX(operatingPoint.differentialPressurePsi);
  const currentY = scaleY(operatingPoint.axialTensionLbf);

  const sfPercent = Math.round(safetyFactor * 100);

  const handleToggleUsedCondition = () => {
    if (onChangeString) {
      const currentCond = ct.usedCondition || {
        enabled: false,
        wallLossPercent: 10.0,
        diametralGrowthPercent: 1.2,
        actualOvalityPercent: 2.0,
        fatigueLifeUsedPercent: 40.0,
        corrosionPittingGrade: 'light',
        hasWeldInSection: false,
        weldType: 'none',
        weldEfficiencyFactor: 1.0,
        h2sExposure: false,
        notes: 'Standard field working condition',
      };
      onChangeString({
        ...ct,
        usedCondition: {
          ...currentCond,
          enabled: !currentCond.enabled,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Safety Factor Global Overlay Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Safety Factor Multiplier Applied:
              </span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/80">
                {safetyFactor.toFixed(2)} ({sfPercent}%)
              </span>
              {safetyFactor === 0.80 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  API 5ST Default
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              All working envelope limits, allowable burst, collapse, and overpull curves are derated by {sfPercent}%.
            </p>
          </div>
        </div>

        {/* Quick buttons & Overlay Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {onChangeSafetyFactor && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[0.75, 0.80, 0.85, 0.90, 1.00].map((sf) => (
                <button
                  key={sf}
                  type="button"
                  onClick={() => onChangeSafetyFactor(sf)}
                  className={`px-2 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                    Math.abs(safetyFactor - sf) < 0.005
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={`Apply ${sf.toFixed(2)} Safety Factor`}
                >
                  {sf === 1.0 ? '1.0' : sf.toFixed(2)}
                </button>
              ))}
            </div>
          )}

          {onToggleNominalOverlay && (
            <button
              type="button"
              onClick={onToggleNominalOverlay}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
                showNominalOverlay
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle 100% nominal yield boundary dashed line overlay"
            >
              <span className="w-2 h-2 rounded-full border border-dashed border-rose-400 bg-rose-500/30" />
              <span>Nominal Yield: {showNominalOverlay ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Used String Overlay Toggle */}
          {isUsedActive && (
            <button
              type="button"
              onClick={() => setShowUsedOverlay(!showUsedOverlay)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
                showUsedOverlay
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle in-service degraded used string envelope overlay"
            >
              <span className="w-2 h-2 rounded-full border border-dashed border-amber-400 bg-amber-500/30" />
              <span>Used Envelope: {showUsedOverlay ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Situation Condition Quick Bar */}
      <div className={`rounded-xl p-3 sm:p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm transition-all ${
        isUsedActive
          ? comparison.isRetired
            ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
            : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            isUsedActive
              ? comparison.isRetired
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                String Condition Baseline:
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                isUsedActive
                  ? comparison.isRetired
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {isUsedActive
                  ? `USED IN-SERVICE STRING (${comparison.remainingWallPercent.toFixed(1)}% WALL REMAINING)`
                  : 'NOMINAL / FACTORY NEW (100% WALL)'}
              </span>
              {isUsedActive && comparison.isRetired && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-bold">
                  API RP 5C7 RETIREMENT LIMIT EXCEEDED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isUsedActive
                ? `Active field degradation: -${ct.usedCondition?.wallLossPercent.toFixed(1)}% wall loss, +${ct.usedCondition?.diametralGrowthPercent.toFixed(1)}% ballooning, ${ct.usedCondition?.actualOvalityPercent.toFixed(1)}% ovality, ${ct.usedCondition?.fatigueLifeUsedPercent.toFixed(0)}% fatigue.`
                : 'Envelope is plotted against pristine 100% nominal dimensions straight from the mill.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {onChangeString && (
            <button
              type="button"
              onClick={handleToggleUsedCondition}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-sm ${
                isUsedActive
                  ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-950/50'
              }`}
            >
              {isUsedActive ? 'Revert to Nominal (100% Wall)' : 'Apply Used String Condition'}
            </button>
          )}

          {onChangeString && isUsedActive && (
            <button
              type="button"
              onClick={() => setShowUsedSettings(!showUsedSettings)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-800/80 flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showUsedSettings ? 'Hide Condition Settings' : 'Adjust Condition'}</span>
              {showUsedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Used Condition Panel */}
      {isUsedActive && showUsedSettings && onChangeString && (
        <UsedConditionPanel
          ct={ct}
          onChangeCondition={(newCond) => {
            onChangeString({
              ...ct,
              usedCondition: newCond,
            });
          }}
          unitSystem={unitSystem}
        />
      )}

      {/* Top Stat Cards: Burst, Collapse, Tensile Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Yield Burst Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Yield Burst Pressure</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {isMetric
              ? `${Math.round(limits.yieldBurstMpa)} MPa`
              : `${Math.round(limits.yieldBurstPressurePsi).toLocaleString()} psi`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>API 87.5%: <span className="text-slate-300 font-mono">
              {isMetric ? `${Math.round(limits.apiBurstMpa)} MPa` : `${Math.round(limits.apiBurstPressurePsi).toLocaleString()} psi`}
            </span></span>
            {isUsedActive && (
              <span className="text-amber-400 font-mono">
                Used: {isMetric ? `${Math.round(usedLimits.yieldBurstMpa)} MPa` : `${Math.round(usedLimits.yieldBurstPressurePsi).toLocaleString()} psi`}
              </span>
            )}
          </div>
        </div>

        {/* Safe Working Burst (Derated by Safety Factor) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">{sfPercent}% Safe Burst Limit</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {isMetric
              ? `${Math.round(limits.safeBurstMpa)} MPa`
              : `${Math.round(limits.safeBurstPressurePsi).toLocaleString()} psi`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>SF = {safetyFactor.toFixed(2)}</span>
            {isUsedActive && (
              <span className="text-amber-400 font-mono">
                Used: {isMetric ? `${Math.round(usedLimits.safeBurstMpa)} MPa` : `${Math.round(usedLimits.safeBurstPressurePsi).toLocaleString()} psi`}
              </span>
            )}
          </div>
        </div>

        {/* Safe Working Collapse Limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">{sfPercent}% Safe Collapse Limit</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {isMetric
              ? `${Math.round(limits.safeCollapseMpa)} MPa`
              : `${Math.round(limits.safeCollapsePressurePsi).toLocaleString()} psi`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>Nom Collapse: <span className="text-slate-300 font-mono">
              {isMetric ? `${Math.round(limits.collapseMpa)} MPa` : `${Math.round(limits.ovalityDeratedCollapsePsi).toLocaleString()} psi`}
            </span></span>
            {isUsedActive && (
              <span className="text-rose-400 font-mono">
                Used: {isMetric ? `${Math.round(usedLimits.safeCollapseMpa)} MPa` : `${Math.round(usedLimits.safeCollapsePressurePsi).toLocaleString()} psi`}
              </span>
            )}
          </div>
        </div>

        {/* Maximum Safe Tensile Overpull */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">{sfPercent}% Safe Overpull Limit</span>
            <ArrowDownUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {isMetric
              ? `${Math.round(limits.safeOverpullKn)} kN`
              : `${Math.round(limits.safeOverpullLbf).toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>100% Yield: <span className="text-slate-300 font-mono">
              {isMetric ? `${Math.round(limits.tensileYieldKn)} kN` : `${Math.round(limits.tensileYieldLbf).toLocaleString()} lbf`}
            </span></span>
            {isUsedActive && (
              <span className="text-amber-400 font-mono">
                Used: {isMetric ? `${Math.round(usedLimits.safeOverpullKn)} kN` : `${Math.round(usedLimits.safeOverpullLbf).toLocaleString()} lbf`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Working Envelope Chart & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The von Mises Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Triaxial Working Envelope (von Mises Stress)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Axial Tension vs Differential Pressure (&Delta;P = P<sub>i</sub> - P<sub>o</sub>)
                </span>
              </div>
            </div>

            {/* Status Badges: Nominal and In-Service Used */}
            <div className="flex items-center gap-2">
              {isUsedActive && (
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                    usedEvalResult.status === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : usedEvalResult.status === 'caution'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                  }`}
                  title="Evaluation against Used In-Service String with wall loss and ovality"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Used: {usedEvalResult.stressRatioPercent.toFixed(1)}% ({usedEvalResult.status.toUpperCase()})</span>
                </div>
              )}

              <div
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                  evalResult.status === 'safe'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : evalResult.status === 'caution'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                }`}
                title="Evaluation against 100% Nominal String"
              >
                {evalResult.status === 'safe' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>Nominal: {evalResult.stressRatioPercent.toFixed(1)}% ({evalResult.status.toUpperCase()})</span>
              </div>
            </div>
          </div>

          {/* SVG Chart Container */}
          <div className="relative w-full aspect-[16/10] bg-slate-950/70 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
              <defs>
                <linearGradient id="safeEnvelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="usedEnvelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id="yieldEnvelopeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {/* Center Axis (P = 0) */}
              <line
                x1={scaleX(0)}
                y1={padding}
                x2={scaleX(0)}
                y2={height - padding}
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Zero Load Axis (F = 0) */}
              <line
                x1={padding}
                y1={scaleY(0)}
                x2={width - padding}
                y2={scaleY(0)}
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* 100% Minimum Yield Boundary (Conditional Overlay) */}
              {showNominalOverlay && (
                <path
                  d={pathYield}
                  fill="url(#yieldEnvelopeGrad)"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}

              {/* Safe Working Envelope Boundary (Derated by Safety Factor) */}
              <path
                d={pathSafe}
                fill="url(#safeEnvelopeGrad)"
                stroke="#06b6d4"
                strokeWidth="2"
              />

              {/* In-Service Used String Envelope Boundary */}
              {isUsedActive && showUsedOverlay && (
                <path
                  d={pathUsed}
                  fill="url(#usedEnvelopeGrad)"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
              )}

              {/* Axis Labels */}
              <text
                x={width - padding}
                y={scaleY(0) - 8}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                + Burst Diff Pressure &rarr;
              </text>
              <text
                x={padding}
                y={scaleY(0) - 8}
                textAnchor="start"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                &larr; Collapse Diff Pressure
              </text>
              <text
                x={scaleX(0) + 8}
                y={padding + 12}
                textAnchor="start"
                fill="#38bdf8"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                &uarr; Tension (Overpull)
              </text>
              <text
                x={scaleX(0) + 8}
                y={height - padding - 8}
                textAnchor="start"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                &darr; Compression (Snubbing)
              </text>

              {/* Current Operating Point Marker */}
              <g>
                <circle
                  cx={currentX}
                  cy={currentY}
                  r="8"
                  fill={
                    isUsedActive && usedEvalResult.status !== 'safe'
                      ? usedEvalResult.status === 'caution' ? '#f59e0b' : '#ef4444'
                      : evalResult.status === 'safe' ? '#10b981' : evalResult.status === 'caution' ? '#f59e0b' : '#ef4444'
                  }
                  className="animate-ping opacity-40"
                />
                <circle
                  cx={currentX}
                  cy={currentY}
                  r="5"
                  fill={
                    isUsedActive && usedEvalResult.status !== 'safe'
                      ? usedEvalResult.status === 'caution' ? '#f59e0b' : '#ef4444'
                      : evalResult.status === 'safe' ? '#10b981' : evalResult.status === 'caution' ? '#f59e0b' : '#ef4444'
                  }
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={Math.min(width - 90, currentX + 10)}
                  y={Math.max(padding + 20, currentY - 10)}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  OP ({isMetric ? Math.round(psiToMpa(operatingPoint.differentialPressurePsi)) + ' MPa' : Math.round(operatingPoint.differentialPressurePsi) + ' psi'}, {isMetric ? Math.round(lbfToKn(operatingPoint.axialTensionLbf)) + ' kN' : Math.round(operatingPoint.axialTensionLbf) + ' lb'})
                </text>
              </g>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800 gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                <span className="text-cyan-300 font-medium">{sfPercent}% Safe Nominal Envelope</span>
                <span className="font-mono text-[10px] text-slate-400">(SF = {safetyFactor.toFixed(2)})</span>
              </span>

              {isUsedActive && showUsedOverlay && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500 border-t border-dashed inline-block" />
                  <span className="text-amber-300 font-medium">In-Service Used String Envelope</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    ({comparison.remainingWallPercent.toFixed(1)}% Wall, {comparison.effectiveUsedString.ovalityPercent}% Oval)
                  </span>
                </span>
              )}

              {showNominalOverlay && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-rose-500 border-t border-dashed inline-block" />
                  <span className="text-rose-300">100% Nominal Yield Limit</span>
                  <span className="font-mono text-[10px] text-slate-400">(New Pipe)</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>API Spec 5ST / RP 5C7 Envelope</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Operating Point Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Condition Simulator
              </h3>
            </div>

            {/* Differential Pressure Control */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Differential Pressure (&Delta;P)</span>
                <span className="font-mono font-bold text-cyan-400">
                  {isMetric
                    ? `${Math.round(psiToMpa(operatingPoint.differentialPressurePsi))} MPa`
                    : `${Math.round(operatingPoint.differentialPressurePsi).toLocaleString()} psi`}
                </span>
              </div>
              <input
                type="range"
                min={-Math.round(limits.ovalityDeratedCollapsePsi)}
                max={Math.round(limits.yieldBurstPressurePsi)}
                step="50"
                value={operatingPoint.differentialPressurePsi}
                onChange={(e) =>
                  setOperatingPoint({
                    ...operatingPoint,
                    differentialPressurePsi: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Safe Collapse: {isMetric ? Math.round(limits.safeCollapseMpa) + ' MPa' : Math.round(limits.safeCollapsePressurePsi).toLocaleString() + ' psi'}</span>
                <span>Safe Burst: {isMetric ? Math.round(limits.safeBurstMpa) + ' MPa' : Math.round(limits.safeBurstPressurePsi).toLocaleString() + ' psi'}</span>
              </div>
            </div>

            {/* Axial Load (Tension / Snubbing) Control */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Applied Axial Load (Hookload)</span>
                <span className="font-mono font-bold text-purple-400">
                  {isMetric
                    ? `${Math.round(lbfToKn(operatingPoint.axialTensionLbf))} kN`
                    : `${Math.round(operatingPoint.axialTensionLbf).toLocaleString()} lbf`}
                </span>
              </div>
              <input
                type="range"
                min={-Math.round(limits.tensileYieldLbf * 0.4)}
                max={Math.round(limits.tensileYieldLbf * 1.05)}
                step="500"
                value={operatingPoint.axialTensionLbf}
                onChange={(e) =>
                  setOperatingPoint({
                    ...operatingPoint,
                    axialTensionLbf: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Compression / Snub</span>
                <span>Safe Overpull: {isMetric ? Math.round(limits.safeOverpullKn) + ' kN' : Math.round(limits.safeOverpullLbf).toLocaleString() + ' lbf'}</span>
              </div>
            </div>

            {/* Stress Readout Box with Nominal & Used Comparison */}
            <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">von Mises Stress (&sigma;<sub>vM</sub>):</span>
                <span className="font-mono font-bold text-white">
                  {isMetric
                    ? `${Math.round(psiToMpa(evalResult.vonMisesStressPsi))} MPa`
                    : `${Math.round(evalResult.vonMisesStressPsi).toLocaleString()} psi`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nominal Yield Utilization:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {evalResult.stressRatioPercent.toFixed(1)} %
                </span>
              </div>

              {isUsedActive && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-amber-300 font-medium">In-Service Used Stress:</span>
                  <span className={`font-mono font-bold ${
                    usedEvalResult.stressRatioPercent > 100 
                      ? 'text-rose-400' 
                      : usedEvalResult.stressRatioPercent > sfPercent 
                      ? 'text-amber-400' 
                      : 'text-emerald-400'
                  }`}>
                    {usedEvalResult.stressRatioPercent.toFixed(1)} %
                  </span>
                </div>
              )}

              {/* Progress bar with dynamic safety factor threshold */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    (isUsedActive ? usedEvalResult.stressRatioPercent : evalResult.stressRatioPercent) <= sfPercent
                      ? 'bg-emerald-400'
                      : (isUsedActive ? usedEvalResult.stressRatioPercent : evalResult.stressRatioPercent) <= 100
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, isUsedActive ? usedEvalResult.stressRatioPercent : evalResult.stressRatioPercent)}%` }}
                />
              </div>

              {/* In-depth Advisory when operating point exceeds used limit */}
              {isUsedActive && evalResult.status === 'safe' && usedEvalResult.status !== 'safe' ? (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-700/80 text-rose-200 text-[11px] leading-tight space-y-1">
                  <div className="font-bold flex items-center gap-1 text-rose-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>USED STRING OVERLOAD WARNING:</span>
                  </div>
                  <div>
                    Operating point passes for factory-new pipe, but EXCEEDS safe limits for this used string ({usedEvalResult.stressRatioPercent.toFixed(1)}% stress) due to {ct.usedCondition?.wallLossPercent.toFixed(1)}% wall loss and {ct.usedCondition?.actualOvalityPercent.toFixed(1)}% ovality!
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                  {isUsedActive ? usedEvalResult.message : evalResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
              Preset Wellbore Scenarios
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setOperatingPoint({ differentialPressurePsi: 5000, axialTensionLbf: 15000 })}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-left transition-colors"
              >
                Pumping Cleanout
              </button>
              <button
                onClick={() => setOperatingPoint({ differentialPressurePsi: 8000, axialTensionLbf: 32000 })}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-left transition-colors"
              >
                Frac Plug Milling
              </button>
              <button
                onClick={() => setOperatingPoint({ differentialPressurePsi: 0, axialTensionLbf: limits.safeOverpullLbf * 0.9 })}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-left transition-colors"
              >
                Max Safe Overpull
              </button>
              <button
                onClick={() => setOperatingPoint({ differentialPressurePsi: -limits.ovalityDeratedCollapsePsi * 0.8, axialTensionLbf: 5000 })}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-left transition-colors"
              >
                N₂ Well Unloading
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Limits Comparison Table (Nominal vs. Real Condition) */}
      {isUsedActive && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Capacity Derating Breakdown (Nominal vs. In-Service String)
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Remaining Wall: {comparison.remainingWallPercent.toFixed(1)}% &bull; Margin to Retirement: {comparison.apiRetirementMarginPercent.toFixed(1)}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 px-3">Mechanical Parameter</th>
                  <th className="py-2 px-3">Factory New (100% Nom)</th>
                  <th className="py-2 px-3">In-Service (Degraded)</th>
                  <th className="py-2 px-3">Net Capacity Loss (&Delta;)</th>
                  <th className="py-2 px-3">Engineering Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Wall Thickness (t)</td>
                  <td className="py-2.5 px-3">{isMetric ? inToMm(ct.wallThicknessIn).toFixed(2) + ' mm' : ct.wallThicknessIn.toFixed(3) + '"'}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{isMetric ? inToMm(comparison.effectiveUsedString.wallThicknessIn).toFixed(2) + ' mm' : comparison.effectiveUsedString.wallThicknessIn.toFixed(3) + '"'}</td>
                  <td className="py-2.5 px-3 text-rose-400">-{comparison.wallLossIn.toFixed(3)}" (-{ct.usedCondition?.wallLossPercent.toFixed(1)}%)</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">API RP 5C7 &sect;5.2 (80% retirement threshold)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Outer Diameter (OD)</td>
                  <td className="py-2.5 px-3">{isMetric ? inToMm(ct.outerDiameterIn).toFixed(2) + ' mm' : ct.outerDiameterIn.toFixed(3) + '"'}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{isMetric ? inToMm(comparison.effectiveUsedString.outerDiameterIn).toFixed(2) + ' mm' : comparison.effectiveUsedString.outerDiameterIn.toFixed(3) + '"'}</td>
                  <td className="py-2.5 px-3 text-cyan-400">+{comparison.odGrowthIn.toFixed(3)}" (+{ct.usedCondition?.diametralGrowthPercent.toFixed(1)}%)</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">ICoTA Diametral Ballooning Limit (&le;3.5%)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Yield Burst Pressure</td>
                  <td className="py-2.5 px-3">{isMetric ? Math.round(limits.yieldBurstMpa) + ' MPa' : Math.round(limits.yieldBurstPressurePsi).toLocaleString() + ' psi'}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{isMetric ? Math.round(usedLimits.yieldBurstMpa) + ' MPa' : Math.round(usedLimits.yieldBurstPressurePsi).toLocaleString() + ' psi'}</td>
                  <td className="py-2.5 px-3 text-rose-400">-{comparison.burstCapacityLossPercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Barlow / API 5ST (Wall thinning + weld factor)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Safe Collapse Pressure</td>
                  <td className="py-2.5 px-3">{isMetric ? Math.round(limits.safeCollapseMpa) + ' MPa' : Math.round(limits.safeCollapsePressurePsi).toLocaleString() + ' psi'}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{isMetric ? Math.round(usedLimits.safeCollapseMpa) + ' MPa' : Math.round(usedLimits.safeCollapsePressurePsi).toLocaleString() + ' psi'}</td>
                  <td className="py-2.5 px-3 text-rose-400">-{comparison.collapseCapacityLossPercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">API 5C3 / Haller-Lubinski Ovality Derated</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Safe Tensile Overpull</td>
                  <td className="py-2.5 px-3">{isMetric ? Math.round(limits.safeOverpullKn) + ' kN' : Math.round(limits.safeOverpullLbf).toLocaleString() + ' lbf'}</td>
                  <td className="py-2.5 px-3 text-purple-400 font-bold">{isMetric ? Math.round(usedLimits.safeOverpullKn) + ' kN' : Math.round(usedLimits.safeOverpullLbf).toLocaleString() + ' lbf'}</td>
                  <td className="py-2.5 px-3 text-rose-400">-{comparison.tensileCapacityLossPercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Cross-sectional area loss &times; YS &times; SF</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">Nominal Weight in Air</td>
                  <td className="py-2.5 px-3">{isMetric ? comparison.nominalGeom.weightInAirKgM.toFixed(2) + ' kg/m' : comparison.nominalGeom.weightInAirLbFt.toFixed(2) + ' lb/ft'}</td>
                  <td className="py-2.5 px-3 text-white font-bold">{isMetric ? comparison.usedGeom.weightInAirKgM.toFixed(2) + ' kg/m' : comparison.usedGeom.weightInAirLbFt.toFixed(2) + ' lb/ft'}</td>
                  <td className="py-2.5 px-3 text-slate-400">-{comparison.weightReductionPercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans">Reduced buoyancy & hookload demand</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
