import React, { useState } from 'react';
import { 
  BhaFatigueMonitoringResult, 
  BhaSegmentFatigueDetail, 
  FATIGUE_ENDURANCE_RATIO 
} from '../utils/bhaFatigueCalculations';
import { UnitSystem } from '../types/coiledTubing';
import { psiToMpa, inToMm, ftToM } from '../utils/engineeringCalculations';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Gauge, 
  Activity, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Flame,
  Layers,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

interface BhaFatigueIndicatorProps {
  fatigueResult: BhaFatigueMonitoringResult;
  unitSystem: UnitSystem;
  onSelectSegment?: (segment: BhaSegmentFatigueDetail) => void;
  compact?: boolean;
  onToggleHighDlsSimulation?: () => void;
  isHighDlsActive?: boolean;
}

export const BhaFatigueIndicator: React.FC<BhaFatigueIndicatorProps> = ({
  fatigueResult,
  unitSystem,
  onSelectSegment,
  compact = false,
  onToggleHighDlsSimulation,
  isHighDlsActive = false,
}) => {
  const [showBasisModal, setShowBasisModal] = useState(false);
  const [showSegmentsList, setShowSegmentsList] = useState(false);
  const isMetric = unitSystem === 'metric';

  const {
    currentDepthFt,
    localDlsDegPer100ft,
    maxBendingStressPsi,
    overallEnduranceLimitPsi,
    overallFatigueRatioPercent,
    anyExceedsEnduranceLimit,
    criticalSegment,
    segments,
    status,
    accumulatedFatigueRisk,
  } = fatigueResult;

  // Format stress values
  const stressKsi = (maxBendingStressPsi / 1000).toFixed(1);
  const stressMpa = Math.round(psiToMpa(maxBendingStressPsi));
  const limitKsi = (overallEnduranceLimitPsi / 1000).toFixed(1);
  const limitMpa = Math.round(psiToMpa(overallEnduranceLimitPsi));

  const displayStress = isMetric ? `${stressMpa} MPa` : `${stressKsi} ksi`;
  const displayLimit = isMetric ? `${limitMpa} MPa` : `${limitKsi} ksi`;

  // Status-dependent styling
  const statusTheme = anyExceedsEnduranceLimit
    ? {
        border: 'border-rose-500/50',
        bg: 'bg-rose-950/40',
        glow: 'shadow-rose-900/30 shadow-lg',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-400',
        pulse: 'animate-pulse',
        label: 'EXCEEDS ENDURANCE LIMIT',
        icon: AlertTriangle,
      }
    : overallFatigueRatioPercent >= 75
    ? {
        border: 'border-amber-500/40',
        bg: 'bg-amber-950/30',
        glow: 'shadow-amber-900/20',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-400',
        pulse: '',
        label: 'APPROACHING LIMIT',
        icon: AlertTriangle,
      }
    : {
        border: 'border-emerald-500/30',
        bg: 'bg-slate-900/80',
        glow: '',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        pulse: '',
        label: 'SAFE ENDURANCE REGIME',
        icon: ShieldCheck,
      };

  const StatusIcon = statusTheme.icon;

  if (compact) {
    return (
      <div 
        id="compactFatigueIndicator"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${statusTheme.bg} ${statusTheme.border} ${statusTheme.glow}`}
      >
        <StatusIcon className={`w-4 h-4 ${statusTheme.textColor} ${statusTheme.pulse}`} />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <span>Fatigue Monitor</span>
            {anyExceedsEnduranceLimit && (
              <span className="px-1 py-0.2 text-[8px] bg-rose-600 text-white font-bold rounded animate-pulse">
                ALERT
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`font-bold ${statusTheme.textColor}`}>
              {displayStress}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 text-[11px]">{displayLimit}</span>
            <span className={`text-[10px] font-semibold px-1 rounded ${statusTheme.badgeBg}`}>
              {overallFatigueRatioPercent}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="realtimeBhaFatigueMonitor"
      className={`rounded-xl border transition-all duration-300 ${statusTheme.bg} ${statusTheme.border} ${statusTheme.glow} p-3.5 backdrop-blur-md relative overflow-hidden`}
    >
      {/* Background alert pulse effect if exceeding endurance limit */}
      {anyExceedsEnduranceLimit && (
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600/10 via-rose-500/5 to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${statusTheme.badgeBg}`}>
            <Activity className={`w-4 h-4 ${statusTheme.textColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Real-Time Fatigue Monitoring
              </span>
              <button
                type="button"
                onClick={() => setShowBasisModal(!showBasisModal)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="View Fatigue Calculation & Endurance Limit Basis (API RP 5C7 / ASME)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Live BHA Bending Stress vs Material Endurance Limit (S<sub>e</sub>)
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${statusTheme.badgeBg} ${statusTheme.pulse}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusTheme.label}</span>
          </span>

          {onToggleHighDlsSimulation && (
            <button
              type="button"
              onClick={onToggleHighDlsSimulation}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                isHighDlsActive
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Toggle simulated tight dogleg curve (DLS 4.5°/100ft) to test fatigue threshold"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>{isHighDlsActive ? 'Dogleg Test: ON' : 'Test Curve'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stress vs Endurance Limit Visual Bar */}
      <div className="space-y-1.5 my-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <span>Simulated Bending Stress (σ<sub>b</sub>):</span>
            {criticalSegment && (
              <span className="text-slate-300 font-sans text-[11px] truncate max-w-[140px]">
                ({criticalSegment.segmentName})
              </span>
            )}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${statusTheme.textColor}`}>
              {displayStress}
            </span>
            <span className="text-slate-500 text-[11px]">/ Limit: {displayLimit}</span>
          </div>
        </div>

        {/* Progress Bar with 100% S_e Marker */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          {/* 75% caution zone marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50 z-10" 
            style={{ left: '75%' }} 
            title="75% Elevated Threshold"
          />
          {/* 100% Endurance Limit marker */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white/80 z-20 shadow-sm" 
            style={{ left: '100%' }} 
            title="100% Endurance Limit (S_e)"
          />

          {/* Active Stress Fill Bar */}
          <div
            className={`h-full transition-all duration-300 rounded-full ${statusTheme.barColor} ${statusTheme.pulse}`}
            style={{ width: `${Math.min(100, (overallFatigueRatioPercent / 120) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>0 {isMetric ? 'MPa' : 'ksi'}</span>
          <span className="text-amber-400">75% (Caution)</span>
          <span className="text-white font-bold">100% S<sub>e</sub> Limit</span>
          <span className={`font-bold ${statusTheme.textColor}`}>
            {overallFatigueRatioPercent}% Usage
          </span>
        </div>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">Critical Segment</span>
          <span className="font-semibold text-white truncate block text-[11px]" title={criticalSegment?.segmentName}>
            {criticalSegment?.segmentName || 'None'}
          </span>
          <span className="text-[9px] text-cyan-400 font-mono">
            OD: {isMetric ? `${inToMm(criticalSegment?.outerDiameterIn || 2.875).toFixed(1)} mm` : `${criticalSegment?.outerDiameterIn || 2.875}"`}
          </span>
        </div>

        <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">Current Depth & DLS</span>
          <span className="font-mono font-bold text-white block text-[11px]">
            {isMetric ? `${Math.round(ftToM(currentDepthFt))} m` : `${Math.round(currentDepthFt).toLocaleString()} ft`}
          </span>
          <span className="text-[9px] text-purple-300 font-mono">
            DLS: {localDlsDegPer100ft}&deg;/100ft
          </span>
        </div>

        <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">Endurance Limit (S<sub>e</sub>)</span>
          <span className="font-mono font-bold text-slate-200 block text-[11px]">
            {displayLimit}
          </span>
          <span className="text-[9px] text-slate-400">
            0.40 &times; S<sub>y</sub> (Tool Steel)
          </span>
        </div>

        <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">Fatigue Regimen</span>
          <span className={`font-semibold block text-[11px] ${statusTheme.textColor}`}>
            {accumulatedFatigueRisk}
          </span>
          <span className="text-[9px] text-slate-400">
            {anyExceedsEnduranceLimit ? 'Finite Life (Damage Acc.)' : 'Infinite Life Target'}
          </span>
        </div>
      </div>

      {/* Expandable BHA Segments Fatigue Breakdown Table */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowSegmentsList(!showSegmentsList)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-1 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>BHA Segments Stress Breakdown ({segments.length} tools)</span>
          </span>
          {showSegmentsList ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showSegmentsList && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {segments.map((seg) => {
              const segStressKsi = (seg.totalBendingStressPsi / 1000).toFixed(1);
              const segLimitKsi = (seg.enduranceLimitPsi / 1000).toFixed(1);
              const isOver = seg.exceedsEnduranceLimit;

              return (
                <div
                  key={seg.segmentId}
                  onClick={() => onSelectSegment && onSelectSegment(seg)}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    isOver
                      ? 'bg-rose-950/60 border-rose-500/60 shadow-sm shadow-rose-950'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color || '#38bdf8' }} 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-[11px]">
                          {seg.segmentName}
                        </span>
                        {isOver && (
                          <span className="text-[9px] font-bold px-1 rounded bg-rose-500 text-white animate-pulse">
                            &gt; S<sub>e</sub> EXCEEDED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        OD: {seg.outerDiameterIn}&quot; | Len: {seg.lengthFt} ft | Depth: {seg.depthTopFt}-{seg.depthBottomFt} ft
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className={`font-bold ${isOver ? 'text-rose-400 text-sm' : 'text-slate-200'}`}>
                        {segStressKsi} ksi
                      </span>
                      <span className="text-[10px] text-slate-500">/ {segLimitKsi}</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${isOver ? 'text-rose-300' : 'text-slate-400'}`}>
                      {seg.fatigueRatioPercent}% of limit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Engineering Basis Info Modal */}
      {showBasisModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-white text-base">
                  BHA Fatigue Endurance Limit Mechanics
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBasisModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-cyan-300 block">
                  1. Material Fatigue Endurance Limit (S<sub>e</sub>)
                </span>
                <p>
                  In accordance with <strong>API RP 5C7</strong> and <strong>ASME Section VIII Div 2</strong> fatigue criteria for high-strength low-alloy tool steel (AISI 4140 / 4145H Mod):
                </p>
                <div className="font-mono text-[11px] bg-slate-900 p-2 rounded text-emerald-300">
                  S<sub>e</sub> &approx; 0.40 &times; S<sub>y</sub> = 0.40 &times; 110 ksi = <strong>44.0 ksi (303.4 MPa)</strong>
                </div>
                <p className="text-[11px] text-slate-400">
                  Accounts for surface finish derating (k<sub>a</sub> &approx; 0.92), component size factor (k<sub>b</sub> &approx; 0.95), and 99% reliability (k<sub>c</sub> &approx; 0.91).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-purple-300 block">
                  2. Stiff BHA Tool 3-Point Contact Bending
                </span>
                <p>
                  Unlike flexible coiled tubing, rigid BHA tools (mud motors, drill collars, jars) have high bending stiffness (E&middot;I). When forced through a curved wellbore of radius R, the tool forms a 3-point contact against the casing wall, producing concentrated contact bending moments:
                </p>
                <div className="font-mono text-[11px] bg-slate-900 p-2 rounded text-purple-300">
                  &sigma;<sub>b,total</sub> = [&sigma;<sub>b,geom</sub> + &sigma;<sub>b,contact</sub>] &times; k<sub>axial</sub>
                </div>
              </div>

              <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-500/30 space-y-1">
                <span className="font-semibold text-rose-300 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>3. Operational Warning Trigger</span>
                </span>
                <p>
                  When simulated bending stress &sigma;<sub>b</sub> exceeds S<sub>e</sub> during animation, cyclic plastic slip occurs. The system triggers a real-time warning toast and highlights the BHA segment to alert the engineer to reduce dogleg passage speed or adjust tool spacing.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBasisModal(false)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
