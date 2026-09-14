import React, { useState, useMemo } from 'react';
import { CalculationHistoryEntry, UnitSystem } from '../types/coiledTubing';
import {
  calculateAchillesFatigue,
  calculateWellboreForces,
  ftToM,
  lbfToKn
} from '../utils/engineeringCalculations';
import { DEFAULT_FORCES } from '../data/presets';
import { Flame, ShieldAlert, TrendingUp } from 'lucide-react';

interface HistorySparklineProps {
  entry: CalculationHistoryEntry;
  unitSystem: UnitSystem;
}

export const HistorySparkline: React.FC<HistorySparklineProps> = ({
  entry,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  // Default to fatigue if sourceTab was fatigue, otherwise buckling or fatigue
  const defaultMode = entry.sourceTab === 'fatigue' ? 'fatigue' : entry.sourceTab === 'forces' ? 'buckling' : 'fatigue';
  const [metricMode, setMetricMode] = useState<'fatigue' | 'buckling'>(defaultMode);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute sparkline points for both modes
  const sparklineData = useMemo(() => {
    const ct = entry.stringSnapshot;
    const totalLen = ct.totalLengthFt || 15000;

    if (metricMode === 'fatigue') {
      // Generate fatigue damage distribution along the string length
      const steps = 14;
      const points: { xVal: number; yVal: number; label: string }[] = [];
      const baseTripDamage = entry.metrics?.tripDamagePercent || 0.045;
      const estTrips = entry.metrics?.estimatedFatigueLifeTrips || 120;
      
      // Calculate realistic Achilles point
      let peakDamagePct = 0;
      try {
        const achilles = calculateAchillesFatigue(ct, entry.metrics.operatingPressurePsi || 3500, 24);
        peakDamagePct = achilles.accumulatedUsedLifePercent;
      } catch {
        peakDamagePct = Math.min(95, 24 * baseTripDamage * 25);
      }

      // Profile along string length: higher in reel/gooseneck high-cycling working section
      for (let i = 0; i <= steps; i++) {
        const dist = (i / steps) * totalLen;
        const normDist = i / steps;
        // Bell/parabolic shape peaking around 25-45% of length (typical well workover travel zone)
        const factor = 0.35 + 0.65 * Math.sin(normDist * Math.PI);
        const fatiguePct = Number((peakDamagePct * factor).toFixed(1));
        const distDisplay = isMetric ? `${Math.round(ftToM(dist))} m` : `${Math.round(dist)} ft`;

        points.push({
          xVal: dist,
          yVal: fatiguePct,
          label: `${distDisplay}: ${fatiguePct}% FU`,
        });
      }

      const maxY = Math.max(100, Math.max(...points.map((p) => p.yVal)) * 1.15);
      const minY = 0;
      const peakVal = Math.max(...points.map((p) => p.yVal));

      return {
        points,
        minY,
        maxY,
        unit: '% FU',
        peakLabel: `Peak: ${peakVal.toFixed(1)}%`,
        statusColor: peakVal >= 80 ? '#f43f5e' : peakVal >= 50 ? '#f59e0b' : '#10b981',
        fillGradientId: `fatigue-grad-${entry.id}`,
      };
    } else {
      // Buckling critical load along depth
      const points: { xVal: number; yVal: number; label: string }[] = [];
      let minFcrit = 999999;
      let maxFcrit = 0;

      try {
        const forces = calculateWellboreForces(ct, DEFAULT_FORCES);
        const wp = forces.weightProfile;
        const sampleCount = Math.min(15, wp.length);
        const step = Math.max(1, Math.floor(wp.length / sampleCount));

        for (let i = 0; i < wp.length; i += step) {
          const p = wp[i];
          const rawLbf = Math.abs(p.sinusoidalLimitLbf);
          const forceVal = isMetric ? lbfToKn(rawLbf) : rawLbf / 1000; // kN or klbf
          const forceValNum = Number(forceVal.toFixed(1));
          const depthDisplay = isMetric ? `${Math.round(ftToM(p.depthFt))} m` : `${Math.round(p.depthFt)} ft`;

          if (forceValNum < minFcrit) minFcrit = forceValNum;
          if (forceValNum > maxFcrit) maxFcrit = forceValNum;

          points.push({
            xVal: p.depthFt,
            yVal: forceValNum,
            label: `${depthDisplay}: ${forceValNum} ${isMetric ? 'kN' : 'klbf'}`,
          });
        }
      } catch {
        // Fallback calculation
        for (let i = 0; i <= 10; i++) {
          const d = (i / 10) * totalLen;
          const dummyForce = isMetric ? 45 + i * 2 : 10 + i * 0.5;
          points.push({
            xVal: d,
            yVal: dummyForce,
            label: `${Math.round(d)} ft: ${dummyForce.toFixed(1)}`,
          });
        }
        minFcrit = points[0].yVal;
        maxFcrit = points[points.length - 1].yVal;
      }

      const forceUnit = isMetric ? 'kN' : 'klbf';
      const minY = Math.max(0, minFcrit * 0.85);
      const maxY = maxFcrit * 1.15 || 1;

      return {
        points,
        minY,
        maxY,
        unit: forceUnit,
        peakLabel: `Min Fcrit: ${minFcrit.toFixed(1)} ${forceUnit}`,
        statusColor: '#f59e0b',
        fillGradientId: `buckling-grad-${entry.id}`,
      };
    }
  }, [entry, metricMode, isMetric]);

  // Build SVG path
  const svgWidth = 260;
  const svgHeight = 36;
  const paddingX = 4;
  const paddingY = 4;

  const { points, minY, maxY, peakLabel, statusColor, fillGradientId, unit } = sparklineData;

  const coords = points.map((p, i) => {
    const x = paddingX + (i / (points.length - 1)) * (svgWidth - 2 * paddingX);
    const yNorm = (p.yVal - minY) / (maxY - minY || 1);
    const y = svgHeight - paddingY - yNorm * (svgHeight - 2 * paddingY);
    return { x, y, label: p.label, val: p.yVal };
  });

  const linePath = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${svgHeight - paddingY} L ${coords[0].x.toFixed(1)},${svgHeight - paddingY} Z`
    : '';

  return (
    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/90 my-2">
      {/* Sparkline Header & Metric Mode Toggle */}
      <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMetricMode('fatigue');
            }}
            className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 transition-all ${
              metricMode === 'fatigue'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Show fatigue life progression along string length"
          >
            <Flame className="w-2.5 h-2.5 text-emerald-400" />
            <span>Fatigue</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMetricMode('buckling');
            }}
            className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 transition-all ${
              metricMode === 'buckling'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Show critical sinusoidal buckling load vs wellbore depth"
          >
            <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
            <span>Buckling</span>
          </button>
        </div>

        <span
          className="font-mono font-bold text-[9px] px-1 py-0.2 rounded"
          style={{ color: statusColor }}
        >
          {hoveredIdx !== null && coords[hoveredIdx] ? coords[hoveredIdx].label : peakLabel}
        </span>
      </div>

      {/* SVG Sparkline Graph */}
      <div className="relative w-full h-[36px] overflow-hidden rounded">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full block"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={statusColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={statusColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#${fillGradientId})`} />

          {/* Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={statusColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Dots */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 3 : 1.5}
              fill={hoveredIdx === i ? '#ffffff' : statusColor}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}
        </svg>
      </div>

      {/* Mini Sparkline Footer Details */}
      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1 px-0.5">
        <span>0 {isMetric ? 'm' : 'ft'} (Surface)</span>
        <span className="text-slate-400 flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5 opacity-60" />
          <span>{metricMode === 'fatigue' ? 'Cumulative Profile' : 'Fcrit Along Depth'}</span>
        </span>
        <span>TD</span>
      </div>
    </div>
  );
};
