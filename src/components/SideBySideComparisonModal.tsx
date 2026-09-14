import React from 'react';
import { CoiledTubingString, UnitSystem, CalculationHistoryEntry } from '../types/coiledTubing';
import {
  calculateGeometry,
  calculateTubingLimits,
  calculateAchillesFatigue,
  inToMm,
  ftToM,
  psiToBar,
  psiToMpa,
  lbfToKn,
  lbPerFtToKgPerM,
  bblToM3,
} from '../utils/engineeringCalculations';
import {
  ArrowLeftRight,
  Check,
  Download,
  ExternalLink,
  Flame,
  Layers,
  Ruler,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  RotateCcw,
} from 'lucide-react';

interface SideBySideComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryA: CalculationHistoryEntry;
  entryB: CalculationHistoryEntry;
  unitSystem: UnitSystem;
  onLoadConfiguration: (ct: CoiledTubingString, sourceTab?: string) => void;
}

export const SideBySideComparisonModal: React.FC<SideBySideComparisonModalProps> = ({
  isOpen,
  onClose,
  entryA,
  entryB,
  unitSystem,
  onLoadConfiguration,
}) => {
  if (!isOpen) return null;

  const isMetric = unitSystem === 'metric';

  const ctA = entryA.stringSnapshot;
  const ctB = entryB.stringSnapshot;

  const geomA = calculateGeometry(ctA);
  const geomB = calculateGeometry(ctB);

  const limitsA = calculateTubingLimits(ctA);
  const limitsB = calculateTubingLimits(ctB);

  // Helper to render delta badge
  const renderDelta = (
    valA: number,
    valB: number,
    formatFn: (v: number) => string,
    higherIsBetter: boolean = true
  ) => {
    const diff = valB - valA;
    if (Math.abs(diff) < 0.0001) {
      return <span className="text-slate-500 font-mono text-[11px]">&mdash;</span>;
    }

    const pct = valA !== 0 ? (diff / Math.abs(valA)) * 100 : 0;
    const isPositive = diff > 0;
    const isAdvantage = higherIsBetter ? isPositive : !isPositive;

    return (
      <div className="flex flex-col items-end">
        <span
          className={`font-mono text-xs font-bold flex items-center gap-0.5 ${
            isAdvantage ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatFn(diff)}
          {isPositive ? (
            <TrendingUp className="w-3 h-3 inline ml-0.5" />
          ) : (
            <TrendingDown className="w-3 h-3 inline ml-0.5" />
          )}
        </span>
        <span
          className={`text-[10px] font-mono ${
            isAdvantage ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          ({isPositive ? '+' : ''}
          {pct.toFixed(1)}%)
        </span>
      </div>
    );
  };

  const handleExportComparison = () => {
    const headers = ['Parameter', `Config A: ${entryA.title}`, `Config B: ${entryB.title}`, 'Delta (B - A)'];
    const rows = [
      ['Outer Diameter', `${ctA.outerDiameterIn} in`, `${ctB.outerDiameterIn} in`, `${(ctB.outerDiameterIn - ctA.outerDiameterIn).toFixed(3)} in`],
      ['Wall Thickness', `${ctA.wallThicknessIn} in`, `${ctB.wallThicknessIn} in`, `${(ctB.wallThicknessIn - ctA.wallThicknessIn).toFixed(3)} in`],
      ['Inner Diameter', `${geomA.innerDiameterIn.toFixed(3)} in`, `${geomB.innerDiameterIn.toFixed(3)} in`, `${(geomB.innerDiameterIn - geomA.innerDiameterIn).toFixed(3)} in`],
      ['Yield Strength', `${ctA.yieldStrengthPsi.toLocaleString()} psi`, `${ctB.yieldStrengthPsi.toLocaleString()} psi`, `${(ctB.yieldStrengthPsi - ctA.yieldStrengthPsi).toLocaleString()} psi`],
      ['Total Length', `${ctA.totalLengthFt.toLocaleString()} ft`, `${ctB.totalLengthFt.toLocaleString()} ft`, `${(ctB.totalLengthFt - ctA.totalLengthFt).toLocaleString()} ft`],
      ['Total Weight in Air', `${Math.round(geomA.totalWeightInAirLbs).toLocaleString()} lbs`, `${Math.round(geomB.totalWeightInAirLbs).toLocaleString()} lbs`, `${Math.round(geomB.totalWeightInAirLbs - geomA.totalWeightInAirLbs).toLocaleString()} lbs`],
      ['Capacity', `${geomA.totalCapacityBbl.toFixed(1)} bbl`, `${geomB.totalCapacityBbl.toFixed(1)} bbl`, `${(geomB.totalCapacityBbl - geomA.totalCapacityBbl).toFixed(1)} bbl`],
      ['D/t Ratio', geomA.dtRatio.toFixed(2), geomB.dtRatio.toFixed(2), (geomB.dtRatio - geomA.dtRatio).toFixed(2)],
      ['API Burst Pressure (87.5%)', `${Math.round(limitsA.apiBurstPressurePsi).toLocaleString()} psi`, `${Math.round(limitsB.apiBurstPressurePsi).toLocaleString()} psi`, `${Math.round(limitsB.apiBurstPressurePsi - limitsA.apiBurstPressurePsi).toLocaleString()} psi`],
      ['Collapse Pressure (Derated)', `${Math.round(limitsA.ovalityDeratedCollapsePsi).toLocaleString()} psi`, `${Math.round(limitsB.ovalityDeratedCollapsePsi).toLocaleString()} psi`, `${Math.round(limitsB.ovalityDeratedCollapsePsi - limitsA.ovalityDeratedCollapsePsi).toLocaleString()} psi`],
      ['Tensile Yield Limit', `${Math.round(limitsA.tensileYieldLbf).toLocaleString()} lbf`, `${Math.round(limitsB.tensileYieldLbf).toLocaleString()} lbf`, `${Math.round(limitsB.tensileYieldLbf - limitsA.tensileYieldLbf).toLocaleString()} lbf`],
      ['Safe 80% Overpull Limit', `${Math.round(limitsA.safeOverpullLbf).toLocaleString()} lbf`, `${Math.round(limitsB.safeOverpullLbf).toLocaleString()} lbf`, `${Math.round(limitsB.safeOverpullLbf - limitsA.safeOverpullLbf).toLocaleString()} lbf`],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CT_Comparison_${entryA.id}_vs_${entryB.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Simulation Side-by-Side Comparison
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Dual Config Analysis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed variance analysis between historical simulation runs & string configurations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportComparison}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Export comparison table as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Column Headers */}
        <div className="grid grid-cols-12 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
          <div className="col-span-4 sm:col-span-5 p-3 sm:p-4 text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>Engineering Parameter</span>
          </div>

          {/* Config A Header */}
          <div className="col-span-3 sm:col-span-3 p-3 sm:p-4 border-l border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between gap-1">
              <span className="text-cyan-400 font-mono text-[11px] uppercase tracking-wider block">
                Config A
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{entryA.displayTime}</span>
            </div>
            <div className="font-bold text-white text-xs sm:text-sm truncate" title={entryA.title}>
              {entryA.title}
            </div>
            <button
              type="button"
              onClick={() => {
                onLoadConfiguration(ctA, entryA.sourceTab);
                onClose();
              }}
              className="mt-2 w-full py-1 px-2 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Load Config A</span>
            </button>
          </div>

          {/* Config B Header */}
          <div className="col-span-3 sm:col-span-3 p-3 sm:p-4 border-l border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between gap-1">
              <span className="text-amber-400 font-mono text-[11px] uppercase tracking-wider block">
                Config B
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{entryB.displayTime}</span>
            </div>
            <div className="font-bold text-white text-xs sm:text-sm truncate" title={entryB.title}>
              {entryB.title}
            </div>
            <button
              type="button"
              onClick={() => {
                onLoadConfiguration(ctB, entryB.sourceTab);
                onClose();
              }}
              className="mt-2 w-full py-1 px-2 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Load Config B</span>
            </button>
          </div>

          {/* Delta Header */}
          <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 border-l border-slate-800 text-right text-slate-400 uppercase tracking-wider font-mono text-[10px]">
            Variance &Delta;
          </div>
        </div>

        {/* Scrollable Comparison Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 text-xs">
          {/* Section 1: Tubing Geometry */}
          <div className="bg-slate-950/40 px-4 py-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tubing String Geometry & Dimensions</span>
          </div>

          {/* Outer Diameter */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Outer Diameter (OD)
              <span className="text-[10px] text-slate-500 block">Nominal pipe external diameter</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(ctA.outerDiameterIn).toFixed(2)} mm` : `${ctA.outerDiameterIn.toFixed(3)} in`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(ctB.outerDiameterIn).toFixed(2)} mm` : `${ctB.outerDiameterIn.toFixed(3)} in`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                ctA.outerDiameterIn,
                ctB.outerDiameterIn,
                (d) => `${d > 0 ? '+' : ''}${d.toFixed(3)}"`
              )}
            </div>
          </div>

          {/* Wall Thickness */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Wall Thickness (t)
              <span className="text-[10px] text-slate-500 block">Average nominal wall dimension</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(ctA.wallThicknessIn).toFixed(2)} mm` : `${ctA.wallThicknessIn.toFixed(3)} in`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(ctB.wallThicknessIn).toFixed(2)} mm` : `${ctB.wallThicknessIn.toFixed(3)} in`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                ctA.wallThicknessIn,
                ctB.wallThicknessIn,
                (d) => `${d > 0 ? '+' : ''}${d.toFixed(3)}"`
              )}
            </div>
          </div>

          {/* Inner Diameter */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Inner Diameter (ID)
              <span className="text-[10px] text-slate-500 block">Flow bore diameter (OD - 2t)</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(geomA.innerDiameterIn).toFixed(2)} mm` : `${geomA.innerDiameterIn.toFixed(3)} in`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${inToMm(geomB.innerDiameterIn).toFixed(2)} mm` : `${geomB.innerDiameterIn.toFixed(3)} in`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                geomA.innerDiameterIn,
                geomB.innerDiameterIn,
                (d) => `${d > 0 ? '+' : ''}${d.toFixed(3)}"`
              )}
            </div>
          </div>

          {/* D/t Ratio */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Diameter-to-Thickness Ratio (D/t)
              <span className="text-[10px] text-slate-500 block">Structural slenderness / collapse factor</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {geomA.dtRatio.toFixed(2)}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {geomB.dtRatio.toFixed(2)}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                geomA.dtRatio,
                geomB.dtRatio,
                (d) => `${d > 0 ? '+' : ''}${d.toFixed(2)}`,
                false
              )}
            </div>
          </div>

          {/* Total Length */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Total String Length
              <span className="text-[10px] text-slate-500 block">Measured continuous spool length</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${ftToM(ctA.totalLengthFt).toLocaleString(undefined, { maximumFractionDigits: 0 })} m` : `${ctA.totalLengthFt.toLocaleString()} ft`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${ftToM(ctB.totalLengthFt).toLocaleString(undefined, { maximumFractionDigits: 0 })} m` : `${ctB.totalLengthFt.toLocaleString()} ft`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                ctA.totalLengthFt,
                ctB.totalLengthFt,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)}'`
              )}
            </div>
          </div>

          {/* Total String Weight in Air */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Total Weight in Air
              <span className="text-[10px] text-slate-500 block">Dry string mass on reel / suspended</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric
                ? `${Math.round(geomA.totalWeightInAirKg).toLocaleString()} kg`
                : `${Math.round(geomA.totalWeightInAirLbs).toLocaleString()} lbs`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric
                ? `${Math.round(geomB.totalWeightInAirKg).toLocaleString()} kg`
                : `${Math.round(geomB.totalWeightInAirLbs).toLocaleString()} lbs`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                geomA.totalWeightInAirLbs,
                geomB.totalWeightInAirLbs,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} lb`,
                false
              )}
            </div>
          </div>

          {/* Internal Capacity */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Internal Fluid Capacity
              <span className="text-[10px] text-slate-500 block">Total volume to fill string</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${geomA.totalCapacityM3.toFixed(1)} m³` : `${geomA.totalCapacityBbl.toFixed(1)} bbl`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${geomB.totalCapacityM3.toFixed(1)} m³` : `${geomB.totalCapacityBbl.toFixed(1)} bbl`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                geomA.totalCapacityBbl,
                geomB.totalCapacityBbl,
                (d) => `${d > 0 ? '+' : ''}${d.toFixed(1)} bbl`
              )}
            </div>
          </div>

          {/* Section 2: Mechanical & Pressure Limits */}
          <div className="bg-slate-950/40 px-4 py-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>API Spec 5ST Mechanical & Pressure Limits</span>
          </div>

          {/* Specified Minimum Yield Strength */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Yield Strength (SMYS)
              <span className="text-[10px] text-slate-500 block">Material grade (e.g. CT80, CT90, CT100)</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${psiToMpa(ctA.yieldStrengthPsi).toFixed(0)} MPa` : `${ctA.yieldStrengthPsi.toLocaleString()} psi`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${psiToMpa(ctB.yieldStrengthPsi).toFixed(0)} MPa` : `${ctB.yieldStrengthPsi.toLocaleString()} psi`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                ctA.yieldStrengthPsi,
                ctB.yieldStrengthPsi,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} psi`
              )}
            </div>
          </div>

          {/* API Burst Pressure (87.5%) */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              API Burst Pressure (87.5%)
              <span className="text-[10px] text-slate-500 block">Certified API 5ST nominal wall rating</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-emerald-400 font-bold">
              {isMetric ? `${limitsA.apiBurstMpa.toFixed(0)} MPa` : `${Math.round(limitsA.apiBurstPressurePsi).toLocaleString()} psi`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-emerald-400 font-bold">
              {isMetric ? `${limitsB.apiBurstMpa.toFixed(0)} MPa` : `${Math.round(limitsB.apiBurstPressurePsi).toLocaleString()} psi`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                limitsA.apiBurstPressurePsi,
                limitsB.apiBurstPressurePsi,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} psi`
              )}
            </div>
          </div>

          {/* Collapse Resistance (with ovality derating) */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Collapse Pressure (Derated)
              <span className="text-[10px] text-slate-500 block">API 5C3 collapse with ovality derating</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-amber-400 font-bold">
              {isMetric ? `${limitsA.collapseMpa.toFixed(0)} MPa` : `${Math.round(limitsA.ovalityDeratedCollapsePsi).toLocaleString()} psi`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-amber-400 font-bold">
              {isMetric ? `${limitsB.collapseMpa.toFixed(0)} MPa` : `${Math.round(limitsB.ovalityDeratedCollapsePsi).toLocaleString()} psi`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                limitsA.ovalityDeratedCollapsePsi,
                limitsB.ovalityDeratedCollapsePsi,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} psi`
              )}
            </div>
          </div>

          {/* Tensile Yield Limit */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Tensile Yield Limit ($F_y$)
              <span className="text-[10px] text-slate-500 block">Pure axial yield load limit ($A_m \cdot S_y$)</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-cyan-400 font-bold">
              {isMetric ? `${limitsA.tensileYieldKn.toFixed(0)} kN` : `${Math.round(limitsA.tensileYieldLbf).toLocaleString()} lbf`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-cyan-400 font-bold">
              {isMetric ? `${limitsB.tensileYieldKn.toFixed(0)} kN` : `${Math.round(limitsB.tensileYieldLbf).toLocaleString()} lbf`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                limitsA.tensileYieldLbf,
                limitsB.tensileYieldLbf,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} lb`
              )}
            </div>
          </div>

          {/* Safe 80% Overpull Margin */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Safe 80% Overpull Limit
              <span className="text-[10px] text-slate-500 block">Operational allowable surface pull ($0.8 F_y$)</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${limitsA.safeOverpullKn.toFixed(0)} kN` : `${Math.round(limitsA.safeOverpullLbf).toLocaleString()} lbf`}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {isMetric ? `${limitsB.safeOverpullKn.toFixed(0)} kN` : `${Math.round(limitsB.safeOverpullLbf).toLocaleString()} lbf`}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {renderDelta(
                limitsA.safeOverpullLbf,
                limitsB.safeOverpullLbf,
                (d) => `${d > 0 ? '+' : ''}${Math.round(d)} lb`
              )}
            </div>
          </div>

          {/* Section 3: Fatigue & Working Envelope Modeling */}
          <div className="bg-slate-950/40 px-4 py-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Achilles 4.0 Fatigue Modeling (at 3,500 psi standard)</span>
          </div>

          {/* Estimated Trips to Failure */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Estimated Trips to Fracture ($N_f$)
              <span className="text-[10px] text-slate-500 block">Low-cycle plastic fatigue life</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-purple-400 font-bold">
              {entryA.metrics.estimatedFatigueLifeTrips ? `${entryA.metrics.estimatedFatigueLifeTrips} trips` : 'N/A'}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-purple-400 font-bold">
              {entryB.metrics.estimatedFatigueLifeTrips ? `${entryB.metrics.estimatedFatigueLifeTrips} trips` : 'N/A'}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {entryA.metrics.estimatedFatigueLifeTrips && entryB.metrics.estimatedFatigueLifeTrips ? (
                renderDelta(
                  entryA.metrics.estimatedFatigueLifeTrips,
                  entryB.metrics.estimatedFatigueLifeTrips,
                  (d) => `${d > 0 ? '+' : ''}${Math.round(d)}`
                )
              ) : (
                <span className="text-slate-500 font-mono text-[11px]">&mdash;</span>
              )}
            </div>
          </div>

          {/* Trip Damage Rate % */}
          <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 hover:bg-slate-800/30 items-center">
            <div className="col-span-4 sm:col-span-5 text-slate-300 font-medium">
              Fatigue Consumed per Trip (&Delta;FU)
              <span className="text-[10px] text-slate-500 block">Reel & guide arch bending reversals (6 events)</span>
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {entryA.metrics.tripDamagePercent ? `${entryA.metrics.tripDamagePercent.toFixed(2)}%` : 'N/A'}
            </div>
            <div className="col-span-3 sm:col-span-3 border-l border-slate-800/60 px-3 font-mono text-slate-200">
              {entryB.metrics.tripDamagePercent ? `${entryB.metrics.tripDamagePercent.toFixed(2)}%` : 'N/A'}
            </div>
            <div className="col-span-2 sm:col-span-1 border-l border-slate-800/60 px-2 text-right">
              {entryA.metrics.tripDamagePercent && entryB.metrics.tripDamagePercent ? (
                renderDelta(
                  entryA.metrics.tripDamagePercent,
                  entryB.metrics.tripDamagePercent,
                  (d) => `${d > 0 ? '+' : ''}${d.toFixed(2)}%`,
                  false
                )
              ) : (
                <span className="text-slate-500 font-mono text-[11px]">&mdash;</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with quick summary & load actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span className="text-emerald-400 font-bold">Green values</span> signify structural or capacity advantages.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onLoadConfiguration(ctA, entryA.sourceTab);
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Load Config A</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadConfiguration(ctB, entryB.sourceTab);
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Load Config B</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
