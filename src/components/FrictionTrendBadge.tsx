import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export interface FrictionTrendInfo {
  status: 'low' | 'typical' | 'high';
  label: string;
  shortLabel: string;
  description: string;
  badgeColorClass: string;
  textColorClass: string;
  borderColorClass: string;
  bgColorClass: string;
  arrowDirection: 'down' | 'typical' | 'up';
}

/**
 * Evaluates whether a friction factor (mu) is considered low, typical, or high
 * for standard oil & gas well profiles (nominal cased-hole with water-based mud baseline: 0.22 - 0.26).
 */
export function getFrictionTrend(mu: number): FrictionTrendInfo {
  if (mu < 0.22) {
    return {
      status: 'low',
      label: 'Low Friction',
      shortLabel: 'Low',
      description: 'Below typical well profile baseline (~0.24). Characterized by synthetic/oil-based muds or friction reducers; decreases drag and delays helical buckling lockup.',
      badgeColorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      textColorClass: 'text-emerald-400',
      borderColorClass: 'border-emerald-500/40',
      bgColorClass: 'bg-emerald-950/80',
      arrowDirection: 'down',
    };
  }
  if (mu > 0.26) {
    const isSevere = mu >= 0.35;
    return {
      status: 'high',
      label: isSevere ? 'Severe High Friction' : 'High Friction',
      shortLabel: 'High',
      description: 'Above typical well profile baseline (~0.24). Indicative of unlined open-hole, heavy drill solids, sand/scale, or high-dogleg tortuosity; accelerates buckling and increases lockup risk.',
      badgeColorClass: isSevere 
        ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
        : 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      textColorClass: isSevere ? 'text-rose-400' : 'text-amber-400',
      borderColorClass: isSevere ? 'border-rose-500/40' : 'border-amber-500/40',
      bgColorClass: isSevere ? 'bg-rose-950/80' : 'bg-amber-950/80',
      arrowDirection: 'up',
    };
  }
  return {
    status: 'typical',
    label: 'Typical Friction',
    shortLabel: 'Typical',
    description: 'Within nominal baseline range (0.22 - 0.26) for standard cased wellbores with water-based fluids.',
    badgeColorClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    textColorClass: 'text-cyan-400',
    borderColorClass: 'border-cyan-500/40',
    bgColorClass: 'bg-cyan-950/80',
    arrowDirection: 'typical',
  };
}

export interface FrictionTrendBadgeProps {
  frictionValue: number;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const FrictionTrendBadge: React.FC<FrictionTrendBadgeProps> = ({
  frictionValue,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const trend = getFrictionTrend(frictionValue);

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const textSizes = {
    xs: 'text-[9px] px-1 py-0.2',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border transition-colors ${trend.badgeColorClass} ${textSizes[size]} ${className}`}
      title={`${trend.label} (μ = ${frictionValue.toFixed(2)}): ${trend.description}`}
      id={`friction-trend-badge-${frictionValue.toFixed(2).replace('.', '_')}`}
    >
      {trend.arrowDirection === 'down' && (
        <ArrowDown className={`${iconSizes[size]} ${trend.textColorClass} stroke-[2.5]`} />
      )}
      {trend.arrowDirection === 'up' && (
        <ArrowUp className={`${iconSizes[size]} ${trend.textColorClass} stroke-[2.5]`} />
      )}
      {trend.arrowDirection === 'typical' && (
        <Minus className={`${iconSizes[size]} ${trend.textColorClass} stroke-[2.5]`} />
      )}
      {showLabel && <span>{trend.shortLabel}</span>}
    </span>
  );
};
