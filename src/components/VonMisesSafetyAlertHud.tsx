import React, { useState, useEffect } from 'react';
import { 
  DetailedOperatingPointEvaluation, 
  playSafetyAlertSound 
} from '../utils/vonMisesSafetyEngine';
import { WorkingPoint, UnitSystem } from '../types/coiledTubing';
import { psiToMpa, lbfToKn } from '../utils/engineeringCalculations';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Gauge, 
  ArrowDownUp,
  Zap
} from 'lucide-react';

interface VonMisesSafetyAlertHudProps {
  evaluation: DetailedOperatingPointEvaluation;
  unitSystem: UnitSystem;
  safetyFactor: number;
  isUsedActive: boolean;
  onApplyOperatingPoint: (point: WorkingPoint) => void;
}

export const VonMisesSafetyAlertHud: React.FC<VonMisesSafetyAlertHudProps> = ({
  evaluation,
  unitSystem,
  safetyFactor,
  isUsedActive,
  onApplyOperatingPoint,
}) => {
  const isMetric = unitSystem === 'metric';
  const [audioAlertEnabled, setAudioAlertEnabled] = useState<boolean>(false);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<boolean>(false);

  // Trigger audio alert on yield violation or envelope breach if sound is enabled
  useEffect(() => {
    if (!audioAlertEnabled) return;
    if (evaluation.severity === 'yield_violation') {
      playSafetyAlertSound('yield_violation');
    } else if (evaluation.severity === 'envelope_exceeded') {
      playSafetyAlertSound('envelope_exceeded');
    }
  }, [evaluation.severity, audioAlertEnabled]);

  const {
    severity,
    isYieldViolated,
    isEnvelopeExceeded,
    activeStress,
    dominantDriver,
    driverDescription,
    driverRecommendation,
    mitigation,
    headline,
    detailedMessage,
  } = evaluation;

  const sfPercent = Math.round(safetyFactor * 100);

  // Visual Theme Configuration based on real-time severity
  let containerBg = 'bg-slate-900/90 border-slate-800';
  let badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
  let badgeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  let badgeLabel = 'SAFE OPERATING ENVELOPE';
  let accentColor = 'text-emerald-400';

  if (isYieldViolated) {
    containerBg = 'bg-gradient-to-r from-rose-950/90 via-slate-950 to-rose-950/90 border-rose-500/80 shadow-lg shadow-rose-950/40';
    badgeBg = 'bg-rose-950 text-rose-200 border-rose-500 animate-pulse';
    badgeIcon = <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
    badgeLabel = 'CRITICAL: VON MISES YIELD LIMIT EXCEEDED';
    accentColor = 'text-rose-400';
  } else if (isEnvelopeExceeded) {
    containerBg = 'bg-gradient-to-r from-amber-950/80 via-slate-950 to-amber-950/80 border-amber-500/80 shadow-md shadow-amber-950/30';
    badgeBg = 'bg-amber-950 text-amber-200 border-amber-500';
    badgeIcon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    badgeLabel = `${sfPercent}% SAFE ENVELOPE BREACHED`;
    accentColor = 'text-amber-400';
  } else if (severity === 'caution') {
    containerBg = 'bg-slate-900/90 border-amber-700/60';
    badgeBg = 'bg-amber-950/60 text-amber-300 border-amber-600/50';
    badgeIcon = <Activity className="w-4 h-4 text-amber-400 shrink-0" />;
    badgeLabel = 'APPROACHING SAFE ENVELOPE BOUNDARY';
    accentColor = 'text-amber-300';
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 relative overflow-hidden ${containerBg}`}>
      {/* Background Warning Atmosphere for Yield Violation */}
      {isYieldViolated && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border shadow-xs ${badgeBg}`}>
            {badgeIcon}
            <span>{badgeLabel}</span>
          </div>

          <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <span>&bull;</span>
            <span className="text-slate-400">Condition:</span>
            <span className={`font-semibold ${isUsedActive ? 'text-amber-300' : 'text-cyan-300'}`}>
              {isUsedActive ? 'In-Service Used String (Degraded)' : '100% Nominal Mill Spec'}
            </span>
          </div>
        </div>

        {/* Action Controls & Sound Toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioAlertEnabled;
              setAudioAlertEnabled(next);
              if (next && (isYieldViolated || isEnvelopeExceeded)) {
                playSafetyAlertSound(isYieldViolated ? 'yield_violation' : 'envelope_exceeded');
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              audioAlertEnabled 
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600 hover:bg-cyan-900/80' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={audioAlertEnabled ? 'Audible warning alarms enabled' : 'Audible alarms muted'}
          >
            {audioAlertEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Audio Alert: <strong>ON</strong></span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Audio Alert: <strong>MUTED</strong></span>
              </>
            )}
          </button>

          {/* Expand Diagnostics Toggle */}
          <button
            type="button"
            onClick={() => setExpandedDiagnostics(!expandedDiagnostics)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
          >
            <span>{expandedDiagnostics ? 'Less Detail' : 'Stress Breakdown'}</span>
            {expandedDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Alert Banner Body */}
      <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800/80 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white tracking-wide">
                {headline}
              </h4>
              {isYieldViolated && (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[11px] font-mono font-bold border border-rose-700/80">
                  +{activeStress.yieldRatioPercent.toFixed(1)}% SMYS (+{isMetric ? `${Math.round(psiToMpa(activeStress.excessOverYieldPsi))} MPa` : `${Math.round(activeStress.excessOverYieldPsi).toLocaleString()} psi`} OVER YIELD)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {detailedMessage}
            </p>
          </div>

          {/* Quick 1-Click Remediation Action (when exceeded) */}
          {(isYieldViolated || isEnvelopeExceeded) && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onApplyOperatingPoint(mitigation.radialSafePoint)}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Clamp operating point to the 80% safe envelope boundary along the radial load path"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Auto-Correct to {sfPercent}% Safe Limit</span>
              </button>
            </div>
          )}
        </div>

        {/* Real-time Stress KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          {/* von Mises Stress */}
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">von Mises Stress (&sigma;<sub>vM</sub>)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-base font-mono font-bold ${accentColor}`}>
                {isMetric 
                  ? `${Math.round(psiToMpa(activeStress.vonMisesStressPsi))} MPa` 
                  : `${Math.round(activeStress.vonMisesStressPsi).toLocaleString()} psi`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeStress.yieldRatioPercent.toFixed(1)}% of SMYS
            </span>
          </div>

          {/* Allowable Material SMYS */}
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">100% Material Yield (SMYS)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-mono font-bold text-white">
                {isMetric 
                  ? `${Math.round(psiToMpa(activeStress.yieldStrengthPsi))} MPa` 
                  : `${Math.round(activeStress.yieldStrengthPsi).toLocaleString()} psi`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Safe Limit ({sfPercent}%): {isMetric ? `${Math.round(psiToMpa(activeStress.safeLimitPsi))} MPa` : `${Math.round(activeStress.safeLimitPsi).toLocaleString()} psi`}
            </span>
          </div>

          {/* Stress Reserve / Excess Margin */}
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
              {isYieldViolated ? 'Yield Excess (&Delta;&sigma;)' : 'Safety Margin (&Delta;&sigma;)'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-base font-mono font-bold ${isYieldViolated ? 'text-rose-400' : isEnvelopeExceeded ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isYieldViolated ? '+' : ''}
                {isMetric
                  ? `${Math.round(psiToMpa(isYieldViolated ? activeStress.excessOverYieldPsi : activeStress.marginToSafePsi))} MPa`
                  : `${Math.round(isYieldViolated ? activeStress.excessOverYieldPsi : activeStress.marginToSafePsi).toLocaleString()} psi`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {isYieldViolated ? 'Permanent set risk' : isEnvelopeExceeded ? 'In reserve zone' : 'Safe reserve buffer'}
            </span>
          </div>

          {/* Effective Safety Factor */}
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Effective Safety Factor</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-base font-mono font-bold ${activeStress.effectiveSafetyFactor < 1.0 ? 'text-rose-400' : activeStress.effectiveSafetyFactor < (1 / safetyFactor) ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activeStress.effectiveSafetyFactor.toFixed(2)}x
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Target minimum: {(1 / safetyFactor).toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Operational Driver Analysis & Remediation Bar */}
        {(isYieldViolated || isEnvelopeExceeded || severity === 'caution') && (
          <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-semibold">Failure Mode Diagnosis:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] font-medium border border-slate-700">
                  {driverDescription}
                </span>
              </div>

              {/* Mitigation Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {mitigation.canMitigateViaPressure && mitigation.safeDifferentialPressurePsi !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (mitigation.safeDifferentialPressurePsi !== null) {
                        onApplyOperatingPoint({
                          differentialPressurePsi: Math.round(mitigation.safeDifferentialPressurePsi),
                          axialTensionLbf: Math.round(activeStress.axialStressPsi * activeStress.metalAreaSqIn),
                        });
                      }
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-mono font-medium transition-colors"
                    title={`Relieve pressure to ${Math.round(mitigation.safeDifferentialPressurePsi)} psi while keeping tension constant`}
                  >
                    Adjust Pressure &rarr; {isMetric ? `${Math.round(psiToMpa(mitigation.safeDifferentialPressurePsi))} MPa` : `${Math.round(mitigation.safeDifferentialPressurePsi).toLocaleString()} psi`}
                  </button>
                )}

                {mitigation.canMitigateViaTension && mitigation.safeAxialTensionLbf !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (mitigation.safeAxialTensionLbf !== null) {
                        onApplyOperatingPoint({
                          differentialPressurePsi: Math.round((activeStress.hoopStressPsi * 2 * activeStress.metalAreaSqIn) / (activeStress.metalAreaSqIn)), // preserve pressure
                          axialTensionLbf: Math.round(mitigation.safeAxialTensionLbf),
                        });
                      }
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-[11px] font-mono font-medium transition-colors"
                    title={`Reduce hookload to ${Math.round(mitigation.safeAxialTensionLbf)} lbf while keeping pressure constant`}
                  >
                    Slacken Hookload &rarr; {isMetric ? `${Math.round(lbfToKn(mitigation.safeAxialTensionLbf))} kN` : `${Math.round(mitigation.safeAxialTensionLbf).toLocaleString()} lbf`}
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300 font-medium">Recommended Action: </strong>
              {driverRecommendation}
            </p>
          </div>
        )}

        {/* Detailed Expandable Stress Diagnostics */}
        {expandedDiagnostics && (
          <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs animate-fadeIn">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Full Triaxial Stress Tensor Breakdown (API Spec 5ST Formulation)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              {/* Axial Component */}
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold uppercase text-[10px]">Axial Stress (&sigma;<sub>a</sub>)</span>
                  <ArrowDownUp className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {isMetric ? `${Math.round(psiToMpa(activeStress.axialStressPsi))} MPa` : `${Math.round(activeStress.axialStressPsi).toLocaleString()} psi`}
                </div>
                <div className="text-[10px] text-slate-400">
                  Formula: F<sub>a</sub> / A<sub>m</sub> ({((activeStress.axialStressPsi / activeStress.yieldStrengthPsi) * 100).toFixed(1)}% of yield)
                </div>
              </div>

              {/* Hoop Component */}
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold uppercase text-[10px]">Hoop Stress (&sigma;<sub>&theta;</sub>)</span>
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {isMetric ? `${Math.round(psiToMpa(activeStress.hoopStressPsi))} MPa` : `${Math.round(activeStress.hoopStressPsi).toLocaleString()} psi`}
                </div>
                <div className="text-[10px] text-slate-400">
                  Formula: &Delta;P(OD-t) / 2t ({((activeStress.hoopStressPsi / activeStress.yieldStrengthPsi) * 100).toFixed(1)}% of yield)
                </div>
              </div>

              {/* von Mises Resultant */}
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold uppercase text-[10px]">von Mises (&sigma;<sub>vM</sub>)</span>
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {isMetric ? `${Math.round(psiToMpa(activeStress.vonMisesStressPsi))} MPa` : `${Math.round(activeStress.vonMisesStressPsi).toLocaleString()} psi`}
                </div>
                <div className="text-[10px] text-slate-400">
                  &radic;(&sigma;<sub>a</sub>&sup2; - &sigma;<sub>a</sub>&sigma;<sub>&theta;</sub> + &sigma;<sub>&theta;</sub>&sup2;) &bull; {activeStress.yieldRatioPercent.toFixed(1)}% SMYS
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/80">
              The API Spec 5ST working envelope plots this equivalent stress against the specified minimum yield strength (SMYS) derated by your safety factor ({sfPercent}%). When the combination of differential pressure (&Delta;P) and axial load (F<sub>a</sub>) produces a von Mises stress exceeding {isMetric ? Math.round(psiToMpa(activeStress.safeLimitPsi)) + ' MPa' : Math.round(activeStress.safeLimitPsi).toLocaleString() + ' psi'}, the operating point crosses outside the safe working zone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
