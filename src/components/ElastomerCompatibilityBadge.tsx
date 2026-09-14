import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, X, Check, Info } from 'lucide-react';
import {
  BhaElastomerType,
  BHA_ELASTOMER_SPECS,
  getFluidElastomerCompatibility,
  ElastomerCompatibilityDetail,
} from '../data/elastomerCompatibility';
import { FluidSpecification } from '../data/fluidsLibrary';
import { CustomFluidComposition } from '../types/customFluid';

interface ElastomerCompatibilityBadgeProps {
  fluid: Partial<FluidSpecification> & Partial<CustomFluidComposition> & { id: string; name?: string };
  targetElastomer: BhaElastomerType | 'all';
  variant?: 'badge' | 'banner' | 'compact' | 'table';
  onClickGuide?: () => void;
}

export const ElastomerCompatibilityBadge: React.FC<ElastomerCompatibilityBadgeProps> = ({
  fluid,
  targetElastomer,
  variant = 'badge',
  onClickGuide,
}) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const compat = getFluidElastomerCompatibility(fluid);

  // If specific elastomer is selected
  if (targetElastomer !== 'all') {
    const detail: ElastomerCompatibilityDetail = compat[targetElastomer];
    const spec = BHA_ELASTOMER_SPECS[targetElastomer];

    if (variant === 'banner') {
      let bgClass = 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300';
      let icon = <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      let tagText = 'Safe with ' + spec.shortName;

      if (detail.rating === 'caution') {
        bgClass = 'bg-amber-950/40 border-amber-700/80 text-amber-300';
        icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
        tagText = 'Caution: ' + spec.shortName;
      } else if (detail.rating === 'incompatible') {
        bgClass = 'bg-rose-950/40 border-rose-700/80 text-rose-300';
        icon = <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
        tagText = 'Incompatible with ' + spec.shortName;
      }

      return (
        <div className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${bgClass}`}>
          {icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold tracking-wide">{tagText}</span>
              <span className="text-[10px] opacity-80 font-mono">Max {detail.maxTempF}°F</span>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{detail.reason}</p>
          </div>
        </div>
      );
    }

    if (variant === 'table') {
      if (detail.rating === 'compatible') {
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800"
            title={`${spec.name}: ${detail.reason} (Max ${detail.maxTempF}°F)`}
          >
            <Check className="w-3 h-3" /> Safe
          </span>
        );
      }
      if (detail.rating === 'caution') {
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800"
            title={`${spec.name}: ${detail.reason} (${detail.exposureGuideline})`}
          >
            <AlertTriangle className="w-3 h-3" /> Caution
          </span>
        );
      }
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800"
          title={`${spec.name}: ${detail.reason}`}
        >
          <X className="w-3 h-3" /> Hazard
        </span>
      );
    }

    // Default badge
    if (detail.rating === 'compatible') {
      return (
        <div className="relative inline-block group">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 text-[10px] font-semibold">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Safe with {spec.shortName}</span>
          </span>
          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-52 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-[10px] text-slate-200">
            <div className="font-bold text-emerald-400">{spec.name}</div>
            <div className="text-slate-300 mt-0.5">{detail.reason}</div>
            <div className="text-slate-400 mt-1 font-mono text-[9px]">Max Temp: {detail.maxTempF}°F • {detail.exposureGuideline}</div>
          </div>
        </div>
      );
    }

    if (detail.rating === 'caution') {
      return (
        <div className="relative inline-block group">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/80 text-[10px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Caution: {spec.shortName}</span>
          </span>
          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-56 p-2 bg-slate-900 border border-amber-800/80 rounded-lg shadow-xl text-[10px] text-slate-200">
            <div className="font-bold text-amber-400">{spec.name} (Conditional)</div>
            <div className="text-slate-300 mt-0.5">{detail.reason}</div>
            <div className="text-amber-300 mt-1 font-mono text-[9px]">Guideline: {detail.exposureGuideline}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative inline-block group">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-700/80 text-[10px] font-semibold">
          <X className="w-3 h-3 text-rose-400" />
          <span>Incompatible: {spec.shortName}</span>
        </span>
        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-56 p-2 bg-slate-900 border border-rose-800/80 rounded-lg shadow-xl text-[10px] text-slate-200">
          <div className="font-bold text-rose-400">{spec.name} Hazard</div>
          <div className="text-slate-300 mt-0.5">{detail.reason}</div>
          <div className="text-rose-300 mt-1 font-mono text-[9px]">Risk: Seal blowout or chemical embrittlement</div>
        </div>
      </div>
    );
  }

  // targetElastomer === 'all': show 5-seal summary bar
  const elastomers: BhaElastomerType[] = ['nbr', 'hnbr', 'fkm', 'ffkm', 'aflas'];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] text-slate-400 font-semibold mr-0.5">BHA Seals:</span>
      {elastomers.map((eId) => {
        const item = compat[eId];
        const spec = BHA_ELASTOMER_SPECS[eId];
        let colorClasses = 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:border-emerald-600';
        let dot = 'bg-emerald-400';

        if (item.rating === 'caution') {
          colorClasses = 'bg-amber-950 text-amber-300 border-amber-800 hover:border-amber-600';
          dot = 'bg-amber-400';
        } else if (item.rating === 'incompatible') {
          colorClasses = 'bg-rose-950 text-rose-400 border-rose-800 hover:border-rose-600';
          dot = 'bg-rose-500';
        }

        return (
          <div key={eId} className="relative group">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-medium cursor-help transition-colors ${colorClasses}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {spec.shortName}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-40 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-[10px] text-slate-200 pointer-events-none">
              <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1 mb-1 font-bold">
                <span className="text-white">{spec.name}</span>
                <span
                  className={
                    item.rating === 'compatible'
                      ? 'text-emerald-400'
                      : item.rating === 'caution'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }
                >
                  {item.label}
                </span>
              </div>
              <p className="text-slate-300 text-[9px] leading-tight">{item.reason}</p>
              <div className="text-slate-400 text-[8px] font-mono mt-1">
                Max {item.maxTempF}°F • {item.exposureGuideline}
              </div>
            </div>
          </div>
        );
      })}

      {onClickGuide && (
        <button
          type="button"
          onClick={onClickGuide}
          className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors"
          title="Open BHA Elastomer Compatibility Guide"
        >
          <Info className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
