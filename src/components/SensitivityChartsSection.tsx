import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  Gauge,
  Droplets,
  Ruler,
  Anchor,
  Shield,
  Zap,
  GitCompare,
  Check,
  BookOpen,
  Database,
  Beaker,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { 
  CoiledTubingString, 
  SensitivityYieldPoint, 
  MultiStringComparisonSeries, 
  MultiStringYieldPoint,
  UsedCondition,
  PublishedUsedDataset
} from '../types/coiledTubing';
import { 
  calculateGeometry, 
  calculateTubingLimits, 
  psiToBar, 
  lbfToKn, 
  psiToMpa,
  getEffectiveTubingString,
  inToMm
} from '../utils/engineeringCalculations';
import { 
  USED_CONDITION_PRESETS, 
  PUBLISHED_USED_DATASETS 
} from '../data/presets';

interface DepthPoint {
  depthFt: number;
  depthM: number;
  slackoffLbf: number;
  slackoffKn: number;
  neutralLbf: number;
  neutralKn: number;
  pickupLbf: number;
  pickupKn: number;
  dragLbf: number;
  dragKn: number;
  sinusoidalLimitLbf: number;
  sinusoidalLimitKn: number;
  helicalLimitLbf: number;
  helicalLimitKn: number;
  overpullAvailableLbf: number;
  overpullAvailableKn: number;
  isLockedUp: boolean;
  isBuckled: boolean;
  status: 'safe' | 'sinusoidal' | 'helical';
}

interface FlowPoint {
  flowGpm: number;
  flowLpm: number;
  standpipePsi: number;
  standpipeBar: number;
  tubingDropPsi: number;
  tubingDropBar: number;
  nozzleDropPsi: number;
  nozzleDropBar: number;
  annularDropPsi: number;
  annularDropBar: number;
  velocityFtSec: number;
  velocityMSec: number;
  reynolds: number;
  hhp: number;
  transportEfficiency: number;
  isPressureCritical: boolean;
  isPressureCaution: boolean;
  status: 'safe' | 'caution' | 'critical';
}

interface PressurePoint {
  pressurePsi: number;
  pressureBar: number;
  vonMisesStressPsi: number;
  vonMisesStressMpa: number;
  stressRatioPercent: number;
  deratedTensileLbf: number;
  deratedTensileKn: number;
  safeOverpullLbf: number;
  safeOverpullKn: number;
  status: 'safe' | 'caution' | 'critical' | 'violation';
}

interface DensityPoint {
  densityPpg: number;
  densitySg: number;
  buoyancyFactor: number;
  buoyedWeightLbFt: number;
  hydrostaticBhpPsi: number;
  hydrostaticBhpBar: number;
  slackoffLbf: number;
  slackoffKn: number;
  pickupLbf: number;
  pickupKn: number;
  neutralLbf: number;
  neutralKn: number;
  dragLbf: number;
  dragKn: number;
}

interface SensitivityChartsSectionProps {
  mode: 'depth' | 'flow' | 'pressure' | 'density' | 'yield';
  ct: CoiledTubingString;
  unitSystem: 'imperial' | 'metric';
  depthBatchData: DepthPoint[];
  flowBatchData: FlowPoint[];
  pressureBatchData: PressurePoint[];
  densityBatchData: DensityPoint[];
  yieldBatchData?: SensitivityYieldPoint[];
  baseLimits: {
    tensileYieldLbf: number;
    tensileYieldKn: number;
    safeTensileYieldLbf: number;
    safeTensileYieldKn: number;
    burstPressurePsi: number;
    burstPressureBar: number;
    safeBurstPressurePsi: number;
    safeBurstPressureBar: number;
    collapsePressurePsi: number;
    collapsePressureBar: number;
  };
  isComparisonMode?: boolean;
  onToggleComparisonMode?: (enabled: boolean) => void;
  comparisonStrings?: MultiStringComparisonSeries[];
  multiStringYieldData?: MultiStringYieldPoint[];
  comparisonMetric?: 'safeTensile' | 'safeBurst' | 'safeCollapse' | 'biaxialTensile' | 'envelopeAreaIndex';
  onComparisonMetricChange?: (metric: 'safeTensile' | 'safeBurst' | 'safeCollapse' | 'biaxialTensile' | 'envelopeAreaIndex') => void;
  selectedStringIds?: string[];
  onToggleStringId?: (id: string) => void;
}

interface MultiStringComparisonTooltipProps {
  data: any;
  strings: MultiStringComparisonSeries[];
  metric: 'safeTensile' | 'safeBurst' | 'safeCollapse' | 'biaxialTensile' | 'envelopeAreaIndex';
  isMetric: boolean;
  activeCt: CoiledTubingString;
  isUsedDataActive?: boolean;
  activeUsedPresetName?: string;
  activeUsedCondition?: UsedCondition;
}

const MultiStringComparisonTooltip: React.FC<MultiStringComparisonTooltipProps> = ({
  data,
  strings,
  metric,
  isMetric,
  activeCt,
  isUsedDataActive = false,
  activeUsedPresetName,
  activeUsedCondition,
}) => {
  if (!data) return null;

  const metricLabel =
    metric === 'safeTensile'
      ? 'Safe Tensile Yield Limit'
      : metric === 'safeBurst'
      ? 'Safe Burst Pressure Envelope'
      : metric === 'safeCollapse'
      ? 'Safe Collapse Resistance'
      : metric === 'biaxialTensile'
      ? 'Biaxial Working Tension @ P_w'
      : 'Envelope Area Index';

  const unit =
    metric === 'safeTensile' || metric === 'biaxialTensile'
      ? isMetric
        ? 'kN'
        : 'klbf'
      : metric === 'safeBurst' || metric === 'safeCollapse'
      ? isMetric
        ? 'bar'
        : 'psi'
      : '';

  // Get active string's value for delta baseline comparison
  const activeVal = Number(data[`${metric}_active`] ?? 0);

  // Sort strings by value descending for leaderboard presentation
  const sortedStrings = [...strings].sort((a, b) => {
    const valA = Number(data[`${metric}_${a.id}`] ?? 0);
    const valB = Number(data[`${metric}_${b.id}`] ?? 0);
    return valB - valA;
  });

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[340px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            YS: {data.xVal} {isMetric ? 'MPa' : 'ksi'} ({data.gradeEquivalent})
          </span>
          <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
            {metricLabel} (Multi-String Comparison)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isUsedDataActive && (
            <span className="text-[9px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
              USED STATE
            </span>
          )}
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            SF = 0.80
          </span>
        </div>
      </div>

      {isUsedDataActive && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded px-2.5 py-1.5 text-[10px] font-mono text-amber-300 flex items-center justify-between">
          <span className="font-semibold truncate max-w-[200px]">In-Service: {activeUsedPresetName || 'Degraded State'}</span>
          <span className="shrink-0">
            -{activeUsedCondition?.wallLossPercent?.toFixed(1) ?? 12}% Wall &bull; {activeUsedCondition?.actualOvalityPercent?.toFixed(1) ?? 1.8}% Oval
          </span>
        </div>
      )}

      <div className="space-y-1.5 font-mono text-[11px] max-h-64 overflow-y-auto pr-1">
        {sortedStrings.map((s, idx) => {
          const val = Number(data[`${metric}_${s.id}`] ?? 0);
          const nomVal = Number(data[`nom_${metric}_${s.id}`] ?? val);
          const lossPct = Number(data[`loss_${metric}_${s.id}`] ?? 0);
          const deltaPct = activeVal > 0 ? ((val - activeVal) / activeVal) * 100 : 0;
          const isRetired = (activeUsedCondition?.wallLossPercent ?? 0) >= 20 || (activeUsedCondition?.fatigueLifeUsedPercent ?? 0) >= 80;

          return (
            <div
              key={s.id}
              className={`p-1.5 rounded border transition-colors ${
                s.isActiveString
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-900 shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white text-[11px]">{s.shortName}</span>
                      {s.isActiveString && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          ACTIVE BASE
                        </span>
                      )}
                      {isUsedDataActive && isRetired && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                          API RETIRED
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-sans">
                      {s.outerDiameterIn.toFixed(3)}" x {s.wallThicknessIn.toFixed(3)}" &bull; A = {s.metalAreaSqIn.toFixed(3)} in²
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-white text-xs block">
                    {val.toLocaleString()} {unit}
                  </span>
                  {isUsedDataActive && lossPct > 0 && (
                    <span className="text-[9px] font-bold text-rose-400 block">
                      -{lossPct}% loss (Nom: {nomVal.toLocaleString()})
                    </span>
                  )}
                  {!s.isActiveString && (
                    <span
                      className={`text-[9px] font-bold block ${
                        deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {deltaPct >= 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`} vs Base
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SensitivityChartsSection: React.FC<SensitivityChartsSectionProps> = ({
  mode,
  ct,
  unitSystem,
  depthBatchData,
  flowBatchData,
  pressureBatchData,
  densityBatchData,
  yieldBatchData = [],
  baseLimits,
  isComparisonMode = false,
  onToggleComparisonMode,
  comparisonStrings = [],
  multiStringYieldData = [],
  comparisonMetric = 'safeTensile',
  onComparisonMetricChange,
  selectedStringIds = [],
  onToggleStringId,
}) => {
  const isMetric = unitSystem === 'metric';

  // Sub-view toggles per mode
  const [depthSubView, setDepthSubView] = useState<'all' | 'envelope' | 'drag_overpull'>('all');
  const [flowSubView, setFlowSubView] = useState<'pressures' | 'power_velocity'>('pressures');
  const [pressureSubView, setPressureSubView] = useState<'stress' | 'capacity'>('stress');
  const [densitySubView, setDensitySubView] = useState<'forces_bhp' | 'buoyancy'>('forces_bhp');
  const [yieldSubView, setYieldSubView] = useState<'envelope_limits' | 'envelope_family' | 'tension_limits' | 'pressure_limits' | 'multi_string'>('envelope_limits');

  // Default rich set of comparison strings if none provided
  const defaultComparisonStrings: MultiStringComparisonSeries[] = useMemo(() => {
    const baseGeom = calculateGeometry(ct);
    return [
      {
        id: 'active',
        name: ct.name,
        shortName: `${ct.outerDiameterIn.toFixed(3)}" ${ct.grade} (Active)`,
        grade: ct.grade,
        color: '#06b6d4',
        outerDiameterIn: ct.outerDiameterIn,
        wallThicknessIn: ct.wallThicknessIn,
        metalAreaSqIn: baseGeom.metalAreaSqIn,
        nominalYieldPsi: ct.yieldStrengthPsi,
        isActiveString: true,
      },
      {
        id: 'ct_1750_ct90',
        name: '1.750" x 0.134" CT90 Light Cleanout',
        shortName: '1.75" CT90',
        grade: 'CT90',
        color: '#3b82f6',
        outerDiameterIn: 1.750,
        wallThicknessIn: 0.134,
        metalAreaSqIn: Math.PI * (1.750 - 0.134) * 0.134,
        nominalYieldPsi: 90000,
      },
      {
        id: 'ct_2000_ct100',
        name: '2.000" x 0.156" CT100 Standard Workover',
        shortName: '2.00" CT100',
        grade: 'CT100',
        color: '#10b981',
        outerDiameterIn: 2.000,
        wallThicknessIn: 0.156,
        metalAreaSqIn: Math.PI * (2.000 - 0.156) * 0.156,
        nominalYieldPsi: 100000,
      },
      {
        id: 'ct_2375_ct110',
        name: '2.375" x 0.175" CT110 Deep Lateral',
        shortName: '2.375" CT110',
        grade: 'CT110',
        color: '#f59e0b',
        outerDiameterIn: 2.375,
        wallThicknessIn: 0.175,
        metalAreaSqIn: Math.PI * (2.375 - 0.175) * 0.175,
        nominalYieldPsi: 110000,
      },
      {
        id: 'ct_2625_ct110',
        name: '2.625" x 0.190" CT110 Heavy Milling',
        shortName: '2.625" CT110',
        grade: 'CT110',
        color: '#ec4899',
        outerDiameterIn: 2.625,
        wallThicknessIn: 0.190,
        metalAreaSqIn: Math.PI * (2.625 - 0.190) * 0.190,
        nominalYieldPsi: 110000,
      },
      {
        id: 'ct_2875_ct120',
        name: '2.875" x 0.204" CT120 High-Pressure Frac',
        shortName: '2.875" CT120',
        grade: 'CT120',
        color: '#a855f7',
        outerDiameterIn: 2.875,
        wallThicknessIn: 0.204,
        metalAreaSqIn: Math.PI * (2.875 - 0.204) * 0.204,
        nominalYieldPsi: 120000,
      },
      {
        id: 'fuling_qt900',
        name: 'Fuling Shale QT900 In-Service (JPSE 198)',
        shortName: 'Fuling QT900 [Used]',
        grade: 'QT900',
        color: '#ef4444',
        outerDiameterIn: 2.000,
        wallThicknessIn: 0.173,
        metalAreaSqIn: Math.PI * (2.000 - 0.173) * 0.173,
        nominalYieldPsi: 90000,
      },
      {
        id: 'vaca_muerta_110',
        name: 'Vaca Muerta 2.375" Milling String (Aitken)',
        shortName: 'Vaca Muerta CT110 [Used]',
        grade: 'CT110',
        color: '#14b8a6',
        outerDiameterIn: 2.375,
        wallThicknessIn: 0.188,
        metalAreaSqIn: Math.PI * (2.375 - 0.188) * 0.188,
        nominalYieldPsi: 110000,
      },
    ];
  }, [ct]);

  const allComparisonStrings = useMemo(() => {
    return comparisonStrings && comparisonStrings.length > 0 ? comparisonStrings : defaultComparisonStrings;
  }, [comparisonStrings, defaultComparisonStrings]);

  const [internalSelectedStringIds, setInternalSelectedStringIds] = useState<string[]>([
    'active',
    'ct_2000_ct100',
    'ct_2375_ct110',
    'fuling_qt900',
  ]);
  const effectiveSelectedIds = selectedStringIds && selectedStringIds.length > 0 ? selectedStringIds : internalSelectedStringIds;

  const handleToggleString = (id: string) => {
    if (onToggleStringId) {
      onToggleStringId(id);
    } else {
      setInternalSelectedStringIds((prev) =>
        prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
      );
    }
  };

  const [internalMetric, setInternalMetric] = useState<
    'safeTensile' | 'safeBurst' | 'safeCollapse' | 'biaxialTensile' | 'envelopeAreaIndex'
  >('safeTensile');
  const effectiveMetric = comparisonMetric || internalMetric;
  const handleMetricChange = (
    m: 'safeTensile' | 'safeBurst' | 'safeCollapse' | 'biaxialTensile' | 'envelopeAreaIndex'
  ) => {
    if (onComparisonMetricChange) {
      onComparisonMetricChange(m);
    } else {
      setInternalMetric(m);
    }
  };

  const activeComparisonStrings = useMemo(() => {
    return allComparisonStrings.filter((s) => effectiveSelectedIds.includes(s.id));
  }, [allComparisonStrings, effectiveSelectedIds]);

  // Used Data Integration State for Multi-String Comparison
  const [isUsedDataActive, setIsUsedDataActive] = useState<boolean>(ct.usedCondition?.enabled ?? false);
  const [selectedUsedPresetId, setSelectedUsedPresetId] = useState<string>('fuling-shale-qt900-case');
  const [showNominalOverlay, setShowNominalOverlay] = useState<boolean>(true);
  const [showPublishedModal, setShowPublishedModal] = useState<boolean>(false);

  const activeUsedCondition: UsedCondition = useMemo(() => {
    const foundPreset = USED_CONDITION_PRESETS.find((p) => p.id === selectedUsedPresetId);
    if (foundPreset) return foundPreset.condition;
    return (
      ct.usedCondition || {
        enabled: true,
        wallLossPercent: 12.0,
        diametralGrowthPercent: 1.2,
        actualOvalityPercent: 1.8,
        fatigueLifeUsedPercent: 45.0,
        corrosionPittingGrade: 'moderate',
        workingWeldType: 'none',
        weldEfficiencyFactor: 1.0,
        defectDepthMm: 1.0,
        defectAngleDeg: 0,
      }
    );
  }, [selectedUsedPresetId, ct.usedCondition]);

  const activeUsedPresetName = useMemo(() => {
    const p = USED_CONDITION_PRESETS.find((preset) => preset.id === selectedUsedPresetId);
    return p ? p.name : 'Custom In-Service Used';
  }, [selectedUsedPresetId]);

  // Dynamically compute multi-string yield data incorporating both Nominal and Used states
  const computedMultiStringYieldData = useMemo(() => {
    const yieldStrengthsPsi =
      yieldBatchData && yieldBatchData.length > 0
        ? yieldBatchData.map((d) => d.yieldStrengthPsi)
        : [70000, 80000, 90000, 100000, 110000, 120000, 130000, 140000];

    // Derating factors for Used condition
    const corrosionFactor =
      activeUsedCondition.corrosionPittingGrade === 'severe'
        ? 0.82
        : activeUsedCondition.corrosionPittingGrade === 'moderate'
        ? 0.90
        : activeUsedCondition.corrosionPittingGrade === 'light'
        ? 0.96
        : 1.0;
    const weldFactor = activeUsedCondition.weldEfficiencyFactor ?? 1.0;
    const pitDerating = activeUsedCondition.defectDepthMm
      ? Math.max(0.70, 1 - (activeUsedCondition.defectDepthMm / 3.5) * 0.18)
      : 1.0;

    return yieldStrengthsPsi.map((ys) => {
      const xVal = isMetric ? Math.round(psiToMpa(ys)) : Math.round(ys / 1000);
      const gradeEquivalent = `CT${Math.round(ys / 1000)}`;

      const row: any = {
        yieldStrengthPsi: ys,
        yieldStrengthMpa: psiToMpa(ys),
        xVal,
        gradeEquivalent,
      };

      allComparisonStrings.forEach((s) => {
        // 1. Nominal Factory New Limits (SF = 0.80)
        const nomTensileLbf = s.metalAreaSqIn * ys * 0.80;
        const nomBurstPsi = ((2 * ys * s.wallThicknessIn) / s.outerDiameterIn) * 0.80;
        const nomDt = s.outerDiameterIn / s.wallThicknessIn;
        const nomCollapsePsi =
          2 * ys * ((nomDt - 1) / Math.pow(nomDt, 2)) * (1 - 0.035 * 0.5) * 0.80;
        const nomPw = 5000;
        const nomBiaxialLbf =
          nomTensileLbf *
          Math.sqrt(Math.max(0, 1 - Math.pow(nomPw / Math.max(nomBurstPsi / 0.8, 1), 2)));
        const nomAreaIndex = Number(
          ((nomBurstPsi / 1000) * (nomTensileLbf / 1000) * 0.001).toFixed(2)
        );

        // 2. Used / In-Service Derated Limits
        const usedWtIn = Math.max(
          0.02,
          s.wallThicknessIn * (1 - (activeUsedCondition.wallLossPercent || 0) / 100)
        );
        const usedOdIn =
          s.outerDiameterIn * (1 + (activeUsedCondition.diametralGrowthPercent || 0) / 100);
        const usedAreaSqIn = Math.PI * (usedOdIn - usedWtIn) * usedWtIn;
        const usedEffectiveYield = ys * corrosionFactor * weldFactor * pitDerating;

        const usedTensileLbf = usedAreaSqIn * usedEffectiveYield * 0.80;
        const usedBurstPsi = ((2 * usedEffectiveYield * usedWtIn) / usedOdIn) * 0.80;
        const usedDt = usedOdIn / usedWtIn;
        const ovalityDerating = Math.max(
          0.40,
          1 - 0.035 * (activeUsedCondition.actualOvalityPercent || 0)
        );
        const usedCollapsePsi =
          2 * usedEffectiveYield * ((usedDt - 1) / Math.pow(usedDt, 2)) * ovalityDerating * 0.80;
        const usedBiaxialLbf =
          usedTensileLbf *
          Math.sqrt(Math.max(0, 1 - Math.pow(nomPw / Math.max(usedBurstPsi / 0.8, 1), 2)));
        const usedAreaIndex = Number(
          ((usedBurstPsi / 1000) * (usedTensileLbf / 1000) * 0.001).toFixed(2)
        );

        // Store Nominal keys for ghost baseline overlay
        row[`nom_safeTensile_${s.id}`] = isMetric
          ? Number(lbfToKn(nomTensileLbf).toFixed(1))
          : Number((nomTensileLbf / 1000).toFixed(1));
        row[`nom_safeBurst_${s.id}`] = isMetric
          ? Math.round(psiToBar(nomBurstPsi))
          : Math.round(nomBurstPsi);
        row[`nom_safeCollapse_${s.id}`] = isMetric
          ? Math.round(psiToBar(nomCollapsePsi))
          : Math.round(nomCollapsePsi);
        row[`nom_biaxialTensile_${s.id}`] = isMetric
          ? Number(lbfToKn(nomBiaxialLbf).toFixed(1))
          : Number((nomBiaxialLbf / 1000).toFixed(1));
        row[`nom_envelopeAreaIndex_${s.id}`] = nomAreaIndex;

        // Store active keys (switches between nominal and used based on isUsedDataActive)
        const activeTensile = isUsedDataActive ? usedTensileLbf : nomTensileLbf;
        const activeBurst = isUsedDataActive ? usedBurstPsi : nomBurstPsi;
        const activeCollapse = isUsedDataActive ? usedCollapsePsi : nomCollapsePsi;
        const activeBiaxial = isUsedDataActive ? usedBiaxialLbf : nomBiaxialLbf;
        const activeAreaIndex = isUsedDataActive ? usedAreaIndex : nomAreaIndex;

        row[`safeTensile_${s.id}`] = isMetric
          ? Number(lbfToKn(activeTensile).toFixed(1))
          : Number((activeTensile / 1000).toFixed(1));
        row[`safeBurst_${s.id}`] = isMetric
          ? Math.round(psiToBar(activeBurst))
          : Math.round(activeBurst);
        row[`safeCollapse_${s.id}`] = isMetric
          ? Math.round(psiToBar(activeCollapse))
          : Math.round(activeCollapse);
        row[`biaxialTensile_${s.id}`] = isMetric
          ? Number(lbfToKn(activeBiaxial).toFixed(1))
          : Number((activeBiaxial / 1000).toFixed(1));
        row[`envelopeAreaIndex_${s.id}`] = activeAreaIndex;

        // Wear degradation percentages
        row[`loss_safeTensile_${s.id}`] =
          nomTensileLbf > 0
            ? Number((((nomTensileLbf - usedTensileLbf) / nomTensileLbf) * 100).toFixed(1))
            : 0;
        row[`loss_safeBurst_${s.id}`] =
          nomBurstPsi > 0
            ? Number((((nomBurstPsi - usedBurstPsi) / nomBurstPsi) * 100).toFixed(1))
            : 0;
        row[`loss_safeCollapse_${s.id}`] =
          nomCollapsePsi > 0
            ? Number((((nomCollapsePsi - usedCollapsePsi) / nomCollapsePsi) * 100).toFixed(1))
            : 0;
        row[`loss_biaxialTensile_${s.id}`] =
          nomBiaxialLbf > 0
            ? Number((((nomBiaxialLbf - usedBiaxialLbf) / nomBiaxialLbf) * 100).toFixed(1))
            : 0;
      });

      return row;
    });
  }, [
    yieldBatchData,
    isUsedDataActive,
    allComparisonStrings,
    activeUsedCondition,
    isMetric,
  ]);

  // Full height / expanded chart toggle
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Curve Visibility toggles
  const [visibleCurves, setVisibleCurves] = useState<Record<string, boolean>>({
    // Depth curves
    pickup: true,
    neutral: true,
    slackoff: true,
    sinusoidal: true,
    helical: true,
    drag: true,
    overpull: true,
    // Flow curves
    standpipe: true,
    tubingDrop: true,
    nozzleDrop: true,
    annularDrop: true,
    hhp: true,
    velocity: true,
    // Pressure curves
    stressRatio: true,
    deratedTensile: true,
    safeOverpull: true,
    // Density curves
    hydroBhp: true,
    buoyancyFactor: true,
    densityPickup: true,
    densitySlackoff: true,
    densityNeutral: true,
    // Yield Strength Working Envelope curves
    yieldSafeTensile: true,
    yieldNominalTensile: true,
    yieldBiaxialTensile: true,
    yieldSafeBurst: true,
    yieldApiBurst: false,
    yieldSafeCollapse: true,
    yieldNominalCollapse: false,
  });

  const toggleCurve = (key: string) => {
    setVisibleCurves((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Prepared Data for Depth Mode (Forces vs. Depth)
  const depthChartData = useMemo(() => {
    return depthBatchData.map((d) => {
      const xVal = isMetric ? Math.round(d.depthM) : d.depthFt;
      return {
        ...d,
        xVal,
        pickup: isMetric ? Number(d.pickupKn.toFixed(1)) : Math.round(d.pickupLbf),
        neutral: isMetric ? Number(d.neutralKn.toFixed(1)) : Math.round(d.neutralLbf),
        slackoff: isMetric ? Number(d.slackoffKn.toFixed(1)) : Math.round(d.slackoffLbf),
        sinusoidalLimit: isMetric ? Number(d.sinusoidalLimitKn.toFixed(1)) : Math.round(d.sinusoidalLimitLbf),
        helicalLimit: isMetric ? Number(d.helicalLimitKn.toFixed(1)) : Math.round(d.helicalLimitLbf),
        drag: isMetric ? Number(d.dragKn.toFixed(1)) : Math.round(d.dragLbf),
        overpull: isMetric ? Number(d.overpullAvailableKn.toFixed(1)) : Math.round(d.overpullAvailableLbf),
        // For visual buckling envelope (negative compression value)
        compressiveLoad: isMetric ? Number((-d.slackoffKn).toFixed(1)) : Math.round(-d.slackoffLbf),
      };
    });
  }, [depthBatchData, isMetric]);

  // 2. Prepared Data for Flow Mode (Pressures vs. Flow Rate)
  const flowChartData = useMemo(() => {
    return flowBatchData.map((d) => {
      const xVal = isMetric ? Number(d.flowLpm.toFixed(1)) : d.flowGpm;
      return {
        ...d,
        xVal,
        standpipe: isMetric ? Number(d.standpipeBar.toFixed(1)) : Math.round(d.standpipePsi),
        tubingDrop: isMetric ? Number(d.tubingDropBar.toFixed(1)) : Math.round(d.tubingDropPsi),
        nozzleDrop: isMetric ? Number(d.nozzleDropBar.toFixed(1)) : Math.round(d.nozzleDropPsi),
        annularDrop: isMetric ? Number(d.annularDropBar.toFixed(2)) : Math.round(d.annularDropPsi),
        hhp: Number(d.hhp.toFixed(1)),
        velocity: isMetric ? Number(d.velocityMSec.toFixed(2)) : Number(d.velocityFtSec.toFixed(2)),
      };
    });
  }, [flowBatchData, isMetric]);

  // 3. Prepared Data for Pressure Mode (Stress Ratio & Capacity vs. Internal Pressure)
  const pressureChartData = useMemo(() => {
    return pressureBatchData.map((d) => {
      const xVal = isMetric ? Number(d.pressureBar.toFixed(1)) : d.pressurePsi;
      return {
        ...d,
        xVal,
        stressRatio: Number(d.stressRatioPercent.toFixed(1)),
        deratedTensile: isMetric ? Number(d.deratedTensileKn.toFixed(1)) : Math.round(d.deratedTensileLbf),
        safeOverpull: isMetric ? Number(d.safeOverpullKn.toFixed(1)) : Math.round(d.safeOverpullLbf),
      };
    });
  }, [pressureBatchData, isMetric]);

  // 4. Prepared Data for Density Mode (Hydrostatics & Loads vs. Fluid Density)
  const densityChartData = useMemo(() => {
    return densityBatchData.map((d) => {
      const xVal = isMetric ? Number(d.densitySg.toFixed(2)) : d.densityPpg;
      return {
        ...d,
        xVal,
        hydroBhp: isMetric ? Number(d.hydrostaticBhpBar.toFixed(1)) : Math.round(d.hydrostaticBhpPsi),
        buoyancyFactorPct: Number((d.buoyancyFactor * 100).toFixed(1)),
        buoyancyFactor: Number(d.buoyancyFactor.toFixed(3)),
        pickup: isMetric ? Number(d.pickupKn.toFixed(1)) : Math.round(d.pickupLbf),
        neutral: isMetric ? Number(d.neutralKn.toFixed(1)) : Math.round(d.neutralLbf),
        slackoff: isMetric ? Number(d.slackoffKn.toFixed(1)) : Math.round(d.slackoffLbf),
        drag: isMetric ? Number(d.dragKn.toFixed(1)) : Math.round(d.dragLbf),
      };
    });
  }, [densityBatchData, isMetric]);

  // 5. Prepared Data for Yield Strength Mode (Working Envelope Limits vs. Material Grade)
  const yieldChartData = useMemo(() => {
    return (yieldBatchData || []).map((d) => {
      const xVal = isMetric ? Math.round(d.yieldStrengthMpa) : d.yieldKsi;
      return {
        ...d,
        xVal,
        safeTensile: isMetric ? Number(d.safeTensileKn.toFixed(1)) : Number((d.safeTensileLbf / 1000).toFixed(1)), // klbf or kN
        nominalTensile: isMetric ? Number(d.nominalTensileKn.toFixed(1)) : Number((d.nominalTensileLbf / 1000).toFixed(1)),
        biaxialTensile: isMetric ? Number(d.biaxialTensionAtWorkingPressureKn.toFixed(1)) : Number((d.biaxialTensionAtWorkingPressureLbf / 1000).toFixed(1)),
        safeBurst: isMetric ? Number(d.safeBurstBar.toFixed(1)) : Math.round(d.safeBurstPsi),
        nominalBurst: isMetric ? Number(d.nominalBurstBar.toFixed(1)) : Math.round(d.nominalBurstPsi),
        apiBurst: isMetric ? Number(d.apiBurstBar.toFixed(1)) : Math.round(d.apiBurstPsi),
        safeCollapse: isMetric ? Number(d.safeCollapseBar.toFixed(1)) : Math.round(d.safeCollapsePsi),
        nominalCollapse: isMetric ? Number(d.nominalCollapseBar.toFixed(1)) : Math.round(d.nominalCollapsePsi),
        envelopeAreaIndex: Number(d.envelopeAreaIndex.toFixed(1)),
      };
    });
  }, [yieldBatchData, isMetric]);

  // 6. 2D Working Envelope Family data for standard CT grades
  const envelopeFamilyData = useMemo(() => {
    const testGrades = [70000, 80000, 90000, 100000, 110000, 120000];
    const numPoints = 40;
    const maxCollapse = calculateTubingLimits({ ...ct, yieldStrengthPsi: 120000 }, 0, 0.80).ovalityDeratedCollapsePsi;
    const maxBurst = calculateTubingLimits({ ...ct, yieldStrengthPsi: 120000 }, 0, 0.80).yieldBurstPressurePsi;

    const pressureSteps: number[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const p = -maxCollapse + (i / numPoints) * (maxBurst + maxCollapse);
      pressureSteps.push(Math.round(p));
    }

    const baseGeom = calculateGeometry(ct);
    const area = baseGeom.metalAreaSqIn;
    const od = ct.outerDiameterIn;
    const wt = ct.wallThicknessIn;

    return pressureSteps.map((p) => {
      const row: Record<string, number | null> = {
        diffPressure: isMetric ? Number(psiToBar(p).toFixed(1)) : p,
      };

      testGrades.forEach((ys) => {
        const gradeKey = `ct${Math.round(ys / 1000)}`;
        const limits = calculateTubingLimits({ ...ct, yieldStrengthPsi: ys }, 0, 0.80);
        const gradeCollapse = limits.ovalityDeratedCollapsePsi;
        const gradeBurst = limits.yieldBurstPressurePsi;

        if (p < -gradeCollapse || p > gradeBurst) {
          row[`${gradeKey}_safeTension`] = null;
        } else {
          const sigmaTheta = (p * (od - wt)) / (2 * wt);
          const disc = 4 * Math.pow(ys, 2) - 3 * Math.pow(sigmaTheta, 2);
          if (disc >= 0) {
            const sqrtD = Math.sqrt(disc);
            const s1 = (sigmaTheta + sqrtD) / 2;
            const maxT = Math.max(0, s1 * area * 0.80);
            row[`${gradeKey}_safeTension`] = isMetric ? Number(lbfToKn(maxT).toFixed(1)) : Number((maxT / 1000).toFixed(1));
          } else {
            row[`${gradeKey}_safeTension`] = null;
          }
        }
      });

      return row;
    });
  }, [ct, isMetric]);

  // Safe reference line constants
  const safeTensileLimit = isMetric ? baseLimits.safeTensileYieldKn * 0.8 : baseLimits.safeTensileYieldLbf * 0.8;
  const safeBurstLimit = isMetric ? baseLimits.safeBurstPressureBar : baseLimits.safeBurstPressurePsi;
  const currentKsi = Math.round(ct.yieldStrengthPsi / 1000);
  const currentYieldXVal = isMetric ? Math.round(ct.yieldStrengthPsi * 0.00689476) : currentKsi;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header bar with controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {mode === 'depth' && 'Force vs. Depth Profile (Recharts)'}
                {mode === 'flow' && 'Circulation Hydraulics vs. Flow Rate (Recharts)'}
                {mode === 'pressure' && 'von Mises Stress & Yield vs. Pressure (Recharts)'}
                {mode === 'density' && 'Surface Loads & Hydrostatic BHP vs. Density (Recharts)'}
                {mode === 'yield' && 'Working Envelope Limits vs. Yield Strength (Recharts)'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                Vector Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'depth' && 'Interactive plot of pick-up (POOH), slack-off (RIH), Dawson-Paslay buckling, and overpull envelope'}
              {mode === 'flow' && 'Interactive plot of standpipe pressure, tubing and nozzle jet pressure drops with burst rating'}
              {mode === 'pressure' && 'Interactive plot of biaxial von Mises stress utilization and derated tensile margin (API 5ST)'}
              {mode === 'density' && 'Interactive plot of buoyant string weight and bottomhole hydrostatic pressure progression'}
              {mode === 'yield' && 'Interactive trend of tensile yield, burst pressure, and collapse resistance envelope boundaries across CT material grades'}
            </p>
          </div>
        </div>

        {/* Sub-view switcher & Expand button */}
        <div className="flex items-center gap-2">
          {/* Depth Sub-view Selector */}
          {mode === 'depth' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDepthSubView('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Forces & Limits
              </button>
              <button
                onClick={() => setDepthSubView('envelope')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'envelope'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hookload Envelope
              </button>
              <button
                onClick={() => setDepthSubView('drag_overpull')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  depthSubView === 'drag_overpull'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Drag & Overpull
              </button>
            </div>
          )}

          {/* Flow Sub-view Selector */}
          {mode === 'flow' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFlowSubView('pressures')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  flowSubView === 'pressures'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Circulation Pressures
              </button>
              <button
                onClick={() => setFlowSubView('power_velocity')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  flowSubView === 'power_velocity'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                HHP & Velocity
              </button>
            </div>
          )}

          {/* Pressure Sub-view Selector */}
          {mode === 'pressure' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setPressureSubView('stress')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  pressureSubView === 'stress'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Stress Ratio (%)
              </button>
              <button
                onClick={() => setPressureSubView('capacity')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  pressureSubView === 'capacity'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tensile Capacity
              </button>
            </div>
          )}

          {/* Density Sub-view Selector */}
          {mode === 'density' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDensitySubView('forces_bhp')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  densitySubView === 'forces_bhp'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Loads & Hydrostatics
              </button>
              <button
                onClick={() => setDensitySubView('buoyancy')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  densitySubView === 'buoyancy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Buoyancy Factor
              </button>
            </div>
          )}

          {/* Yield Strength Sub-view Selector */}
          {mode === 'yield' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-0.5">
              <button
                onClick={() => {
                  setYieldSubView('envelope_limits');
                  onToggleComparisonMode?.(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  (yieldSubView === 'envelope_limits' && !isComparisonMode)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Envelope Limits
              </button>
              <button
                onClick={() => {
                  setYieldSubView('envelope_family');
                  onToggleComparisonMode?.(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  (yieldSubView === 'envelope_family' && !isComparisonMode)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2D Envelope Family
              </button>
              <button
                onClick={() => {
                  setYieldSubView('tension_limits');
                  onToggleComparisonMode?.(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  (yieldSubView === 'tension_limits' && !isComparisonMode)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tensile Focus
              </button>
              <button
                onClick={() => {
                  setYieldSubView('pressure_limits');
                  onToggleComparisonMode?.(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  (yieldSubView === 'pressure_limits' && !isComparisonMode)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pressure Limits
              </button>
              <button
                onClick={() => {
                  setYieldSubView('multi_string');
                  onToggleComparisonMode?.(true);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  (yieldSubView === 'multi_string' || isComparisonMode)
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Compare Strings ({activeComparisonStrings.length})
              </button>
            </div>
          )}

          {/* Expand / Minimize Height */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isExpanded ? 'Standard view' : 'Enlarge chart'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Legend & Visibility Toggles */}
      <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Filter Curves:
        </span>

        {mode === 'depth' && (
          <>
            <button
              onClick={() => toggleCurve('pickup')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.pickup
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Pick-Up (POOH)
            </button>

            <button
              onClick={() => toggleCurve('neutral')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.neutral
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Neutral Weight
            </button>

            <button
              onClick={() => toggleCurve('slackoff')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.slackoff
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Slack-Off (RIH)
            </button>

            <button
              onClick={() => toggleCurve('sinusoidal')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.sinusoidal
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-rose-400" />
              Sinusoidal Limit (F_crit)
            </button>

            <button
              onClick={() => toggleCurve('helical')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.helical
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-purple-400" />
              Helical Limit (F_hel)
            </button>

            <button
              onClick={() => toggleCurve('drag')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.drag
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Total Wellbore Drag
            </button>

            <button
              onClick={() => toggleCurve('overpull')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.overpull
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              Safe Overpull
            </button>
          </>
        )}

        {mode === 'flow' && (
          <>
            <button
              onClick={() => toggleCurve('standpipe')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.standpipe
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Standpipe Pressure
            </button>

            <button
              onClick={() => toggleCurve('tubingDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.tubingDrop
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Tubing Friction &Delta;P
            </button>

            <button
              onClick={() => toggleCurve('nozzleDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.nozzleDrop
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Nozzle Jet &Delta;P
            </button>

            <button
              onClick={() => toggleCurve('annularDrop')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.annularDrop
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Annular &Delta;P
            </button>

            {flowSubView === 'power_velocity' && (
              <>
                <button
                  onClick={() => toggleCurve('hhp')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                    visibleCurves.hhp
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  Hydraulic HP (HHP)
                </button>
                <button
                  onClick={() => toggleCurve('velocity')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                    visibleCurves.velocity
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Fluid Velocity
                </button>
              </>
            )}
          </>
        )}

        {mode === 'pressure' && (
          <>
            <button
              onClick={() => toggleCurve('stressRatio')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.stressRatio
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              von Mises Stress Ratio (%)
            </button>

            <button
              onClick={() => toggleCurve('deratedTensile')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.deratedTensile
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Derated Tensile Yield
            </button>

            <button
              onClick={() => toggleCurve('safeOverpull')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.safeOverpull
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Safe Overpull Margin
            </button>
          </>
        )}

        {mode === 'density' && (
          <>
            <button
              onClick={() => toggleCurve('hydroBhp')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.hydroBhp
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Hydrostatic BHP
            </button>

            <button
              onClick={() => toggleCurve('densityPickup')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.densityPickup
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              POOH Pick-Up Load
            </button>

            <button
              onClick={() => toggleCurve('densitySlackoff')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.densitySlackoff
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              RIH Slack-Off Weight
            </button>

            <button
              onClick={() => toggleCurve('buoyancyFactor')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                visibleCurves.buoyancyFactor
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Buoyancy Factor (BF)
            </button>
          </>
        )}

        {mode === 'yield' && (
          yieldSubView === 'multi_string' || isComparisonMode ? (
            <div className="w-full space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Metric:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => handleMetricChange('safeTensile')}
                      className={`px-2 py-0.8 rounded text-[11px] font-mono border transition-all ${
                        effectiveMetric === 'safeTensile'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Tensile Yield ({isMetric ? 'kN' : 'klbf'})
                    </button>
                    <button
                      onClick={() => handleMetricChange('safeBurst')}
                      className={`px-2 py-0.8 rounded text-[11px] font-mono border transition-all ${
                        effectiveMetric === 'safeBurst'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Safe Burst ({isMetric ? 'bar' : 'psi'})
                    </button>
                    <button
                      onClick={() => handleMetricChange('safeCollapse')}
                      className={`px-2 py-0.8 rounded text-[11px] font-mono border transition-all ${
                        effectiveMetric === 'safeCollapse'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Safe Collapse ({isMetric ? 'bar' : 'psi'})
                    </button>
                    <button
                      onClick={() => handleMetricChange('biaxialTensile')}
                      className={`px-2 py-0.8 rounded text-[11px] font-mono border transition-all ${
                        effectiveMetric === 'biaxialTensile'
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Biaxial @ P_w
                    </button>
                    <button
                      onClick={() => handleMetricChange('envelopeAreaIndex')}
                      className={`px-2 py-0.8 rounded text-[11px] font-mono border transition-all ${
                        effectiveMetric === 'envelopeAreaIndex'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Area Index
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPublishedModal(true)}
                    className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Benchmark Datasets (JPSE / CIRCA)</span>
                  </button>
                </div>
              </div>

              {/* String Selection Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Strings:</span>
                {allComparisonStrings.map((s) => {
                  const isSelected = effectiveSelectedIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleToggleString(s.id)}
                      className={`px-2 py-0.8 rounded-md flex items-center gap-1.5 text-[11px] font-mono border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white font-medium shadow-sm'
                          : 'bg-slate-950/80 text-slate-500 border-slate-850 opacity-50 line-through'
                      }`}
                      style={{
                        borderColor: isSelected ? s.color : '#334155',
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{s.shortName}</span>
                      {s.isActiveString && (
                        <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/80 px-1 rounded">
                          BASE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* In-Service Used Data Integration Bar */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Master Used Data Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsUsedDataActive(!isUsedDataActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border flex items-center gap-2 transition-all shadow-sm ${
                      isUsedDataActive
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-950/50'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isUsedDataActive ? 'Used Data Mode: ACTIVE' : 'Enable Used Data Mode'}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isUsedDataActive ? 'bg-white animate-ping' : 'bg-slate-500'
                      }`}
                    />
                  </button>

                  {isUsedDataActive && (
                    <>
                      {/* Scenario Selector Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-amber-400">Condition:</span>
                        <select
                          value={selectedUsedPresetId}
                          onChange={(e) => setSelectedUsedPresetId(e.target.value)}
                          className="bg-slate-900 border border-amber-500/50 text-amber-200 text-xs rounded-md px-2.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-sm"
                        >
                          <optgroup label="Published Field Datasets">
                            <option value="fuling-shale-qt900-case">Fuling Shale QT900 In-Service (1.0mm Pit, 12% Wall Loss)</option>
                            <option value="vaca-muerta-plug-milling-case">Vaca Muerta Milling (14% Wall Loss, +1.8% OD)</option>
                            <option value="overdisplaced-frac-cleanout-case">U.S. Frac Cleanout (8.5% Wall Loss, 1.2% Ovality)</option>
                          </optgroup>
                          <optgroup label="Rig Standards & Retirement Limits">
                            <option value="circa-ballooning-limit-case">CIRCA 62.5 thou Stripper Clearance Limit</option>
                            <option value="circa-severe-ballooning-case">CIRCA 100 thou Max Ballooning Limit</option>
                            <option value="retirement-limit">API RP 5C7 80% Wall Retirement Limit (20% Loss)</option>
                            <option value="standard-used">Standard Field Used (10% Wall Loss, 40% Fatigue)</option>
                          </optgroup>
                          <optgroup label="Severe Environments">
                            <option value="corroded-pitted">Severe Pitted & Corroded (H2S Sour Service)</option>
                            <option value="heavy-workover">Heavy Milling Abrasive Wear (18% Loss)</option>
                            <option value="high-ovality">High Ovality Out-of-Round (4.5% Ovality)</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Nominal Ghost Curve Overlay Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowNominalOverlay(!showNominalOverlay)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all ${
                          showNominalOverlay
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-600 font-semibold shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                        title="Overlay dashed nominal curves to visually inspect capacity degradation"
                      >
                        {showNominalOverlay ? '✓ Nominal Overlay (Dashed)' : '+ Compare vs Nominal'}
                      </button>
                    </>
                  )}
                </div>

                {/* Status Badges */}
                {isUsedDataActive && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                    <span className="bg-amber-950/70 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded">
                      Wall Loss: -{activeUsedCondition.wallLossPercent?.toFixed(1) ?? 12}%
                    </span>
                    <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded">
                      OD Growth: +{activeUsedCondition.diametralGrowthPercent?.toFixed(1) ?? 1.2}%
                    </span>
                    <span className="bg-purple-950/70 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded">
                      Ovality: {activeUsedCondition.actualOvalityPercent?.toFixed(1) ?? 1.8}%
                    </span>
                    {activeUsedCondition.defectDepthMm && (
                      <span className="bg-rose-950/70 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded font-bold">
                        Pit: {activeUsedCondition.defectDepthMm}mm (JPSE 198)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => toggleCurve('yieldSafeTensile')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldSafeTensile
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Safe Tensile Limit ({isMetric ? 'kN' : 'klbf'})
              </button>

              <button
                onClick={() => toggleCurve('yieldNominalTensile')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldNominalTensile
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300/60" />
                Nominal Tensile (100% YS)
              </button>

              <button
                onClick={() => toggleCurve('yieldBiaxialTensile')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldBiaxialTensile
                    ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                Biaxial Tension @ P_work
              </button>

              <button
                onClick={() => toggleCurve('yieldSafeBurst')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldSafeBurst
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Safe Burst Limit ({isMetric ? 'bar' : 'psi'})
              </button>

              <button
                onClick={() => toggleCurve('yieldApiBurst')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldApiBurst
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                API 5ST Burst (87.5%)
              </button>

              <button
                onClick={() => toggleCurve('yieldSafeCollapse')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldSafeCollapse
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Safe Collapse Limit
              </button>

              <button
                onClick={() => toggleCurve('yieldNominalCollapse')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-[11px] border transition-all ${
                  visibleCurves.yieldNominalCollapse
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60 line-through'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300/60" />
                Nominal Collapse (API 5C3)
              </button>
            </>
          )
        )}
      </div>

      {/* Main Recharts Container */}
      <div
        className={`w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-4 transition-all ${
          isExpanded ? 'h-[580px]' : 'h-[420px]'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. DEPTH MODE: FORCE VS DEPTH CHART */}
          {mode === 'depth' ? (
            <ComposedChart data={depthChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <defs>
                <linearGradient id="slackoffFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pickupFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Measured Depth (${isMetric ? 'm' : 'ft'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Axial Load & Capacity (${isMetric ? 'kN' : 'lbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* Zero load reference line (Snubbing/Compression Boundary) */}
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} label={{ value: 'Neutral (0 Load)', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />

              {/* 80% Tensile Yield Limit */}
              <ReferenceLine
                y={safeTensileLimit}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `80% Tensile Limit (${isMetric ? Math.round(safeTensileLimit) + ' kN' : Math.round(safeTensileLimit).toLocaleString() + ' lbf'})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof depthChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                          Depth: {isMetric ? `${data.xVal.toLocaleString()} m` : `${data.xVal.toLocaleString()} ft`}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'sinusoidal'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status === 'safe' ? 'Safe String' : data.status === 'sinusoidal' ? 'Sinusoidal Buckling' : 'Helical Lockup'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" /> Pick-Up (POOH):
                          </span>
                          <span className="font-bold">{data.pickup.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Neutral Weight:
                          </span>
                          <span>{data.neutral.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Slack-Off (RIH):
                          </span>
                          <span className="font-bold">{data.slackoff.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-slate-800/80">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> Sinusoidal F_crit:
                          </span>
                          <span>{data.sinusoidalLimit.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-purple-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400" /> Helical F_hel:
                          </span>
                          <span>{data.helicalLimit.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-sky-300 pt-1 border-t border-slate-800/80">
                          <span>Total Drag:</span>
                          <span>{data.drag.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>

                        <div className="flex items-center justify-between text-teal-300">
                          <span>Safe Overpull:</span>
                          <span className="font-semibold text-teal-400">{data.overpull.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Curves */}
              {visibleCurves.pickup && (
                <Line
                  type="monotone"
                  dataKey="pickup"
                  name="Pick-Up Hookload"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#f59e0b' }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.neutral && (
                <Line
                  type="monotone"
                  dataKey="neutral"
                  name="Neutral Weight"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {visibleCurves.slackoff && (
                <Line
                  type="monotone"
                  dataKey="slackoff"
                  name="Slack-Off Hookload"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.sinusoidal && (
                <Line
                  type="monotone"
                  dataKey="sinusoidalLimit"
                  name="Sinusoidal Buckling (F_crit)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              {visibleCurves.helical && (
                <Line
                  type="monotone"
                  dataKey="helicalLimit"
                  name="Helical Buckling (F_hel)"
                  stroke="#c084fc"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}

              {visibleCurves.drag && (depthSubView === 'all' || depthSubView === 'drag_overpull') && (
                <Line
                  type="monotone"
                  dataKey="drag"
                  name="Wellbore Drag"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}

              {visibleCurves.overpull && (depthSubView === 'all' || depthSubView === 'drag_overpull') && (
                <Line
                  type="monotone"
                  dataKey="overpull"
                  name="Available Overpull"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : mode === 'flow' ? (
            /* 2. FLOW RATE MODE: HYDRAULICS & PRESSURES CHART */
            <ComposedChart data={flowChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Circulation Flow Rate (${isMetric ? 'L/min' : 'GPM'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} bar` : `${Math.round(val)} psi`)}
                label={{
                  value: `Hydraulic Pressure (${isMetric ? 'bar' : 'psi'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* 80% Safe Working Burst Limit Reference Line */}
              <ReferenceLine
                y={safeBurstLimit}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{
                  value: `80% Safe Burst Limit (${isMetric ? Math.round(safeBurstLimit) + ' bar' : Math.round(safeBurstLimit) + ' psi'})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof flowChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                          Flow: {data.xVal} {isMetric ? 'L/min' : 'GPM'}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'caution'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status === 'safe' ? 'Within Limits' : data.status === 'caution' ? 'Near Rating' : 'Exceeds Burst'}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span className="font-semibold">Standpipe Pressure:</span>
                          <span className="font-bold">{data.standpipe.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-400">
                          <span>Tubing Friction &Delta;P:</span>
                          <span>{data.tubingDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Nozzle Jet &Delta;P:</span>
                          <span>{data.nozzleDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Annular &Delta;P:</span>
                          <span>{data.annularDrop.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-300 pt-1 border-t border-slate-800">
                          <span>Hydraulic Horsepower:</span>
                          <span className="font-bold text-indigo-400">{data.hhp} HHP</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Fluid Velocity:</span>
                          <span>{data.velocity} {isMetric ? 'm/s' : 'ft/s'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.standpipe && (
                <Line
                  type="monotone"
                  dataKey="standpipe"
                  name="Standpipe Pressure"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.tubingDrop && (
                <Line
                  type="monotone"
                  dataKey="tubingDrop"
                  name="Tubing Friction Loss"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.nozzleDrop && (
                <Line
                  type="monotone"
                  dataKey="nozzleDrop"
                  name="Nozzle Jet Loss"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {visibleCurves.annularDrop && (
                <Line
                  type="monotone"
                  dataKey="annularDrop"
                  name="Annular Friction Loss"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : mode === 'pressure' ? (
            /* 3. INTERNAL PRESSURE MODE: VON MISES STRESS & CAPACITY */
            <ComposedChart data={pressureChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Internal Differential Pressure (${isMetric ? 'bar' : 'psi'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* Left Y Axis for Stress Ratio % */}
              <YAxis
                yAxisId="left"
                stroke="#06b6d4"
                domain={[0, 110]}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val}%`}
                label={{
                  value: 'von Mises Stress Ratio (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#06b6d4',
                  fontSize: 12,
                }}
              />

              {/* Right Y Axis for Tensile Forces */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Tensile Capacity (${isMetric ? 'kN' : 'lbf'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              {/* 80% Safe Working Limit Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={80}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: '80% API Spec 5ST Safe Limit', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
              />

              {/* 100% Structural Yield Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={100}
                stroke="#ef4444"
                strokeWidth={1.5}
                label={{ value: '100% Full Yield Failure', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof pressureChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          Pressure: {data.xVal} {isMetric ? 'bar' : 'psi'}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                            data.status === 'safe'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : data.status === 'caution'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {data.status}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span>von Mises Stress Ratio:</span>
                          <span className="font-bold">{data.stressRatio}%</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Derated Tensile Yield:</span>
                          <span className="font-bold">{data.deratedTensile.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Available Safe Overpull:</span>
                          <span className="font-bold">{data.safeOverpull.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.stressRatio && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="stressRatio"
                  name="Stress Ratio (%)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.deratedTensile && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="deratedTensile"
                  name="Derated Tensile Yield"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.safeOverpull && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="safeOverpull"
                  name="Safe Overpull Reserve"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : mode === 'density' ? (
            /* 4. DENSITY MODE: HYDROSTATICS & HOOKLOADS CHART */
            <ComposedChart data={densityChartData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Wellbore Fluid Density (${isMetric ? 'SG' : 'ppg'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="loads"
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${Math.round(val / 1000)}k`)}
                label={{
                  value: `Surface Load (${isMetric ? 'kN' : 'lbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="bhp"
                orientation="right"
                stroke="#06b6d4"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} bar` : `${Math.round(val)} psi`)}
                label={{
                  value: `Hydrostatic BHP (${isMetric ? 'bar' : 'psi'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  fill: '#06b6d4',
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof densityChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                          Density: {data.xVal} {isMetric ? 'SG' : 'ppg'}
                        </span>
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                          BF: {data.buoyancyFactor}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span>Hydrostatic BHP:</span>
                          <span className="font-bold">{data.hydroBhp.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Pick-Up (POOH):</span>
                          <span>{data.pickup.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Slack-Off (RIH):</span>
                          <span>{data.slackoff.toLocaleString()} {isMetric ? 'kN' : 'lbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-400">
                          <span>Buoyancy Reduction:</span>
                          <span>{(100 - data.buoyancyFactorPct).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {visibleCurves.hydroBhp && (
                <Line
                  yAxisId="bhp"
                  type="monotone"
                  dataKey="hydroBhp"
                  name="Hydrostatic BHP"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#06b6d4' }}
                />
              )}

              {visibleCurves.densityPickup && (
                <Line
                  yAxisId="loads"
                  type="monotone"
                  dataKey="pickup"
                  name="POOH Hookload"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.densitySlackoff && (
                <Line
                  yAxisId="loads"
                  type="monotone"
                  dataKey="slackoff"
                  name="RIH Slack-Off"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          ) : yieldSubView === 'envelope_family' ? (
            /* 5A. YIELD MODE: 2D WORKING ENVELOPE FAMILY EXPANSION */
            <ComposedChart data={envelopeFamilyData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="diffPressure"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Differential Pressure [Collapse (-) to Burst (+)] (${isMetric ? 'bar' : 'psi'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${val}k`)}
                label={{
                  value: `Safe Working Tension Capacity (${isMetric ? 'kN' : 'klbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[260px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          Diff Pressure: {data.diffPressure} {isMetric ? 'bar' : 'psi'}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                          SF = 0.80
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="text-slate-400 text-[10px] font-sans pb-0.5">Allowable Working Tension by CT Grade:</div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            CT70 (70 ksi):
                          </span>
                          <span className="font-bold">{data.ct70_safeTension !== null ? `${data.ct70_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            CT80 (80 ksi):
                          </span>
                          <span className="font-bold">{data.ct80_safeTension !== null ? `${data.ct80_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                        <div className="flex items-center justify-between text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            CT90 (90 ksi):
                          </span>
                          <span className="font-bold">{data.ct90_safeTension !== null ? `${data.ct90_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            CT100 (100 ksi):
                          </span>
                          <span className="font-bold">{data.ct100_safeTension !== null ? `${data.ct100_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            CT110 (110 ksi):
                          </span>
                          <span className="font-bold">{data.ct110_safeTension !== null ? `${data.ct110_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                        <div className="flex items-center justify-between text-purple-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            CT120 (120 ksi):
                          </span>
                          <span className="font-bold">{data.ct120_safeTension !== null ? `${data.ct120_safeTension} ${isMetric ? 'kN' : 'klbf'}` : 'Exceeded'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

              <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" label={{ value: 'P_diff = 0', fill: '#64748b', fontSize: 10 }} />

              <Line type="monotone" dataKey="ct70_safeTension" name="CT70 (70 ksi)" stroke="#94a3b8" strokeWidth={1.5} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="ct80_safeTension" name="CT80 (80 ksi)" stroke="#60a5fa" strokeWidth={1.8} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="ct90_safeTension" name="CT90 (90 ksi)" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="ct100_safeTension" name="CT100 (100 ksi)" stroke="#34d399" strokeWidth={2.2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="ct110_safeTension" name="CT110 (110 ksi)" stroke="#fbbf24" strokeWidth={2.5} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="ct120_safeTension" name="CT120 (120 ksi)" stroke="#c084fc" strokeWidth={2.8} dot={false} connectNulls={false} />
            </ComposedChart>
          ) : (yieldSubView === 'multi_string' || isComparisonMode) ? (
            /* 5B. YIELD MODE: SIMULTANEOUS MULTI-STRING COMPARISON TREND CHART */
            <ComposedChart data={computedMultiStringYieldData} margin={{ top: 15, right: 30, left: 15, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Material Yield Strength (${isMetric ? 'MPa' : 'ksi'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              <YAxis
                stroke={
                  effectiveMetric === 'safeTensile' || effectiveMetric === 'biaxialTensile'
                    ? '#f59e0b'
                    : effectiveMetric === 'safeBurst'
                    ? '#06b6d4'
                    : effectiveMetric === 'safeCollapse'
                    ? '#10b981'
                    : '#a855f7'
                }
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  if (effectiveMetric === 'safeTensile' || effectiveMetric === 'biaxialTensile') {
                    return isMetric ? `${val} kN` : `${val}k`;
                  }
                  if (effectiveMetric === 'safeBurst' || effectiveMetric === 'safeCollapse') {
                    return isMetric ? `${val} bar` : `${Math.round(val / 1000)}k`;
                  }
                  return `${val}`;
                }}
                label={{
                  value:
                    effectiveMetric === 'safeTensile'
                      ? `Safe Tensile Yield Limit (${isMetric ? 'kN' : 'klbf'})`
                      : effectiveMetric === 'safeBurst'
                      ? `Safe Burst Pressure Envelope (${isMetric ? 'bar' : 'psi'})`
                      : effectiveMetric === 'safeCollapse'
                      ? `Safe Collapse Resistance (${isMetric ? 'bar' : 'psi'})`
                      : effectiveMetric === 'biaxialTensile'
                      ? `Biaxial Working Tension @ P_w (${isMetric ? 'kN' : 'klbf'})`
                      : `Envelope Area Index (Capacity Product)`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill:
                    effectiveMetric === 'safeTensile' || effectiveMetric === 'biaxialTensile'
                      ? '#f59e0b'
                      : effectiveMetric === 'safeBurst'
                      ? '#06b6d4'
                      : effectiveMetric === 'safeCollapse'
                      ? '#10b981'
                      : '#a855f7',
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <MultiStringComparisonTooltip
                      data={data}
                      strings={activeComparisonStrings}
                      metric={effectiveMetric}
                      isMetric={isMetric}
                      activeCt={ct}
                      isUsedDataActive={isUsedDataActive}
                      activeUsedPresetName={activeUsedPresetName}
                      activeUsedCondition={activeUsedCondition}
                    />
                  );
                }}
              />

              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

              {/* Reference line for active CT's current yield strength */}
              <ReferenceLine
                x={currentYieldXVal}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `Active String Nominal: ${ct.grade} (${currentKsi} ksi)`,
                  position: 'top',
                  fill: '#38bdf8',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              />

              {/* Reference lines for each selected string's nominal grade */}
              {activeComparisonStrings.map((str) => {
                const xVal = isMetric ? Math.round(psiToMpa(str.nominalYieldPsi)) : Math.round(str.nominalYieldPsi / 1000);
                return (
                  <ReferenceLine
                    key={`nom_ref_${str.id}`}
                    x={xVal}
                    stroke={str.color}
                    strokeDasharray="2 2"
                    strokeOpacity={0.6}
                  />
                );
              })}

              {/* Optional Ghost Curves for Nominal Factory-New Baseline when Used Data is Active */}
              {isUsedDataActive && showNominalOverlay && activeComparisonStrings.map((str) => (
                <Line
                  key={`nom_line_${str.id}`}
                  type="monotone"
                  dataKey={`nom_${effectiveMetric}_${str.id}`}
                  name={`${str.shortName} (Nominal)`}
                  stroke={str.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}

              {/* Active Operating Curves for Each Selected String (Used or Nominal) */}
              {activeComparisonStrings.map((str) => {
                return (
                  <Line
                    key={str.id}
                    type="monotone"
                    dataKey={`${effectiveMetric}_${str.id}`}
                    name={isUsedDataActive ? `${str.shortName} [Used]` : str.shortName}
                    stroke={str.color}
                    strokeWidth={str.isActiveString ? 3.5 : 2.2}
                    dot={{ r: 3, fill: str.color }}
                    activeDot={{ r: 6, fill: str.color, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                );
              })}
            </ComposedChart>
          ) : (
            /* 5C. YIELD MODE: WORKING ENVELOPE LIMITS DUAL-AXIS TREND CHART */
            <ComposedChart data={yieldChartData} margin={{ top: 15, right: 35, left: 15, bottom: 25 }}>
              <defs>
                <linearGradient id="safeTensileFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="safeBurstFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="xVal"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                label={{
                  value: `Yield Strength (${isMetric ? 'MPa' : 'ksi'})`,
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />

              {/* Left Y-Axis: Tensile Force Limits */}
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} kN` : `${val}k`)}
                label={{
                  value: `Safe Tensile Envelope Limit (${isMetric ? 'kN' : 'klbf'})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#f59e0b',
                  fontSize: 12,
                }}
              />

              {/* Right Y-Axis: Pressure Limits (Burst & Collapse) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#06b6d4"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(val) => (isMetric ? `${val} bar` : `${Math.round(val / 1000)}k psi`)}
                label={{
                  value: `Pressure Envelope Limits (${isMetric ? 'bar' : 'psi'})`,
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  fill: '#06b6d4',
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as typeof yieldChartData[0];
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-2 min-w-[280px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white font-mono flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          YS: {data.xVal} {isMetric ? 'MPa' : 'ksi'} ({data.gradeEquivalent})
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                          Area Idx: {data.envelopeAreaIndex}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-amber-400">
                          <span>Safe Tensile Limit (SF=0.8):</span>
                          <span className="font-bold">{data.safeTensile.toLocaleString()} {isMetric ? 'kN' : 'klbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-200">
                          <span>100% Nominal Tensile Yield:</span>
                          <span>{data.nominalTensile.toLocaleString()} {isMetric ? 'kN' : 'klbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-pink-400">
                          <span>Biaxial Tension @ P_work:</span>
                          <span>{data.biaxialTensile.toLocaleString()} {isMetric ? 'kN' : 'klbf'}</span>
                        </div>
                        <div className="flex items-center justify-between text-cyan-400">
                          <span>Safe Burst Pressure (SF=0.8):</span>
                          <span className="font-bold">{data.safeBurst.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sky-300">
                          <span>API Spec 5ST Burst (87.5%):</span>
                          <span>{data.apiBurst.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Safe Collapse Resistance:</span>
                          <span className="font-bold">{data.safeCollapse.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-200">
                          <span>Nominal Collapse (API 5C3):</span>
                          <span>{data.nominalCollapse.toLocaleString()} {isMetric ? 'bar' : 'psi'}</span>
                        </div>

                        <div className="border-t border-slate-800 pt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Gain vs Current CT ({ct.grade}):</span>
                          <span className={data.tensileGainPercent >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {data.tensileGainPercent >= 0 ? `+${data.tensileGainPercent.toFixed(1)}%` : `${data.tensileGainPercent.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

              {/* Reference line for current string YS */}
              <ReferenceLine
                x={currentYieldXVal}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `Current String (${ct.grade}: ${currentKsi} ksi)`,
                  position: 'top',
                  fill: '#38bdf8',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              />

              {/* Reference line for current safe tensile limit */}
              <ReferenceLine
                yAxisId="left"
                y={isMetric ? Number(baseLimits.safeOverpullKn.toFixed(1)) : Number((baseLimits.safeOverpullLbf / 1000).toFixed(1))}
                stroke="#f59e0b"
                strokeDasharray="2 2"
                strokeOpacity={0.6}
              />

              {/* Reference line for current safe burst pressure */}
              <ReferenceLine
                yAxisId="right"
                y={isMetric ? Number(psiToBar(baseLimits.safeBurstPressurePsi).toFixed(1)) : Math.round(baseLimits.safeBurstPressurePsi)}
                stroke="#06b6d4"
                strokeDasharray="2 2"
                strokeOpacity={0.6}
              />

              {visibleCurves.yieldSafeTensile && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="safeTensile"
                  name="Safe Tensile Limit"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#safeTensileFill)"
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {visibleCurves.yieldNominalTensile && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="nominalTensile"
                  name="100% Nominal Tensile"
                  stroke="#fbbf24"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {visibleCurves.yieldBiaxialTensile && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="biaxialTensile"
                  name="Biaxial Tension @ P_work"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {visibleCurves.yieldSafeBurst && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="safeBurst"
                  name="Safe Burst Limit"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              )}

              {visibleCurves.yieldApiBurst && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="apiBurst"
                  name="API 5ST Burst (87.5%)"
                  stroke="#38bdf8"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}

              {visibleCurves.yieldSafeCollapse && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="safeCollapse"
                  name="Safe Collapse Limit"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#10b981' }}
                />
              )}

              {visibleCurves.yieldNominalCollapse && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="nominalCollapse"
                  name="Nominal Collapse"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Technical Engineering Notes */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {mode === 'depth' && 'Solid amber line indicates POOH pick-up pull; green line indicates slack-off RIH. Red dashed line indicates Dawson-Paslay F_crit.'}
            {mode === 'flow' && 'Total standpipe pressure comprises tubing friction loss, jet nozzle pressure drop, and annular returns based on Churchill friction.'}
            {mode === 'pressure' && 'Calculated according to API Spec 5ST biaxial stress envelope. Tensile limit derates non-linearly with internal pressure.'}
            {mode === 'density' && 'Higher mud density reduces effective string weight via Archimedes buoyancy factor (BF = 1 - rho_fluid / rho_steel).'}
            {mode === 'yield' && (isUsedDataActive
              ? 'Multi-string comparison includes in-service used degradation (wall thinning, ballooning, pitting defect, ovality). Dashed lines show nominal new baselines.'
              : 'Calculates working envelope boundary expansion per API Spec 5ST & von Mises criterion. Higher yield strength linearly scales tensile and burst limits; collapse derates per API 5C3 D/t plastic/yield regime.')}
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
          Powered by Recharts v2 &bull; Real-time vector model
        </div>
      </div>

      {/* Published Used Datasets Modal */}
      {showPublishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Published In-Service Used Datasets & Standards</h3>
                  <p className="text-xs text-slate-400">Peer-reviewed literature (JPSE, SPE, CIRCA) with empirical defect geometries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5">
              {PUBLISHED_USED_DATASETS.map((ds) => {
                const isSelected = selectedUsedPresetId === ds.id;
                return (
                  <div
                    key={ds.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{ds.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {ds.category.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {ds.sourceCitation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{ds.fieldLocation} &bull; {ds.operationalEnvironment.fluidOrSlurry}</p>
                        <p className="text-[11px] text-amber-300/90 font-mono italic">
                          Key Finding: {ds.measuredOutcome.criticalFindings}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsedPresetId(ds.id);
                          setIsUsedDataActive(true);
                          setShowPublishedModal(false);
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{isSelected ? 'Currently Applied' : 'Apply to Comparison'}</span>
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">WALL LOSS</span>
                        <span className="font-bold text-amber-300">-{ds.condition.wallLossPercent}%</span>
                      </div>
                      <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">OD GROWTH</span>
                        <span className="font-bold text-cyan-300">+{ds.condition.diametralGrowthPercent}%</span>
                      </div>
                      <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">OVALITY</span>
                        <span className="font-bold text-purple-300">{ds.condition.actualOvalityPercent}%</span>
                      </div>
                      <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">DEFECT GEOMETRY</span>
                        <span className="font-bold text-rose-300">
                          {ds.condition.defectDepthMm ? `${ds.condition.defectDepthMm}mm Pit` : 'General Wear'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>All datasets conform to API RP 5C7 & JPSE experimental testing protocol.</span>
              <button
                type="button"
                onClick={() => setShowPublishedModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
