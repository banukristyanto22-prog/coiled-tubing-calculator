import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Sparkles, BookOpen, Activity } from 'lucide-react';

export interface EngineeringTooltipProps {
  parameter: string;
  symbol?: string;
  physicsFormula?: string;
  physicsExplanation: string;
  operationalImpact: string;
  liveContext?: string | React.ReactNode;
  industryStandard?: string;
  className?: string;
}

export const EngineeringTooltip: React.FC<EngineeringTooltipProps> = ({
  parameter,
  symbol,
  physicsFormula,
  physicsExplanation,
  operationalImpact,
  liveContext,
  industryStandard,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(340, window.innerWidth - 32);
    const estimatedHeight = 260;

    // Check space below vs above
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top,
      left,
      placeAbove,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close when clicking outside or scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`inline-flex items-center align-middle ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (isOpen) handleClose();
          else handleOpen();
        }}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        aria-label={`Physics explanation for ${parameter}`}
        className="p-0.5 rounded text-slate-400 hover:text-cyan-400 focus:text-cyan-400 hover:bg-cyan-500/10 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={handleClose}
          style={{
            position: 'fixed',
            top: coords.placeAbove ? 'auto' : `${coords.top}px`,
            bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
            left: `${coords.left}px`,
            width: `${Math.min(340, window.innerWidth - 32)}px`,
            zIndex: 9999,
          }}
          className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-950/50 p-4 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="font-bold text-slate-100 text-xs">
                {parameter} {symbol && <span className="text-cyan-400 font-mono">({symbol})</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Formula Callout */}
          {physicsFormula && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-md p-2 font-mono text-[11px] text-cyan-300 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">Formula:</span>
              <span className="font-semibold">{physicsFormula}</span>
            </div>
          )}

          {/* Physics Explanation */}
          <div className="text-slate-300 leading-relaxed text-[11px]">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
              Physical Principle:
            </span>
            {physicsExplanation}
          </div>

          {/* Operational Impact */}
          <div className="text-slate-300 leading-relaxed text-[11px] bg-slate-950/40 border border-slate-800/60 rounded p-2">
            <span className="text-amber-400/90 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
              Operational Field Impact:
            </span>
            {operationalImpact}
          </div>

          {/* Context-Aware Dynamic Value Banner */}
          {liveContext && (
            <div className="p-2 rounded-md bg-cyan-950/30 border border-cyan-500/20 text-[11px] flex items-start gap-1.5 text-cyan-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Current Evaluation:
                </span>
                <span className="font-mono text-slate-200">{liveContext}</span>
              </div>
            </div>
          )}

          {/* Industry Standard Reference */}
          {industryStandard && (
            <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-500" />
                Ref: {industryStandard}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
