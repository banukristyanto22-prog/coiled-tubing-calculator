import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  X,
  ChevronRight
} from 'lucide-react';
import { CalculationSafetyEvaluation } from '../types/coiledTubing';

interface CalculationSafetyBadgeProps {
  evaluation: CalculationSafetyEvaluation;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
  className?: string;
}

export const CalculationSafetyBadge: React.FC<CalculationSafetyBadgeProps> = ({
  evaluation,
  size = 'sm',
  showDetailsOnClick = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isPass = evaluation.status === 'pass';

  // Handle outside click to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Size styling variants
  const sizeStyles = {
    xs: 'px-1.5 py-0.2 text-[9px]',
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      {/* Visual Badge Button */}
      <button
        type="button"
        onClick={(e) => {
          if (showDetailsOnClick) {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }
        }}
        title={
          isPass
            ? `PASS: Within safety bounds (Governing load: ${evaluation.governingCheck} at ${evaluation.maxUtilizationPercent.toFixed(0)}% utilization). Click for safety checks breakdown.`
            : `FAIL: ${evaluation.primaryViolation || 'Limit violation detected'}. Click to view details.`
        }
        className={`rounded font-mono font-bold flex items-center gap-1 transition-all border shadow-sm ${
          showDetailsOnClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'
        } ${sizeStyles[size]} ${
          isPass
            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/20'
            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/50 ring-1 ring-rose-500/25 shadow-rose-950/40'
        }`}
      >
        {isPass ? (
          <CheckCircle2 className={`${iconSizes[size]} text-emerald-400 shrink-0`} />
        ) : (
          <AlertTriangle className={`${iconSizes[size]} text-rose-400 shrink-0`} />
        )}
        <span>{evaluation.label}</span>
        <span
          className={`font-normal opacity-85 text-[85%] ${
            isPass ? 'text-emerald-300' : 'text-rose-200 font-semibold'
          }`}
        >
          {evaluation.maxUtilizationPercent > 0 && `${evaluation.maxUtilizationPercent.toFixed(0)}%`}
        </span>
      </button>

      {/* Interactive Drill-down Safety Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              {isPass ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Safety Evaluation
                  </h4>
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                      isPass
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {evaluation.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  API RP 5C7 & API 5ST Working Envelope (SF = {evaluation.safetyFactor.toFixed(2)})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Summary Banner */}
          <div
            className={`my-2.5 p-2 rounded-lg text-[11px] leading-relaxed border ${
              isPass
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {isPass ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  All mechanical stresses and operational loads remain strictly within certified safety limits.
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Limit Violation Detected:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] pl-1 text-rose-200/90 font-mono">
                  {evaluation.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Safety Checks Breakdown Table */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Safety Check</span>
              <span>Actual vs Limit</span>
            </div>

            {evaluation.safetyChecks.map((chk) => (
              <div
                key={chk.id}
                className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between gap-2 ${
                  chk.passed
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    : 'bg-rose-950/30 border-rose-700/60 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {chk.passed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-semibold block truncate">{chk.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono block">
                      Util: {chk.utilizationPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className={`block font-bold ${chk.passed ? 'text-slate-200' : 'text-rose-400'}`}>
                    {chk.actual}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {chk.limit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Gov: {evaluation.governingCheck}</span>
            <span className={isPass ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Max Util: {evaluation.maxUtilizationPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
