import React, { useState } from 'react';
import { 
  CoiledTubingString, 
  UnitSystem, 
  UsedCondition, 
  CorrosionPittingGrade, 
  WorkingWeldType,
  PublishedUsedDataset
} from '../types/coiledTubing';
import { 
  calculateUsedConditionComparison,
  inToMm,
  psiToMpa,
  lbfToKn
} from '../utils/engineeringCalculations';
import { 
  USED_CONDITION_PRESETS, 
  PUBLISHED_USED_DATASETS, 
  JPSE_ORTHOGONAL_DEFECT_TESTS, 
  JPSE_RANGE_ANALYSIS 
} from '../data/presets';
import { EngineeringTooltip } from './EngineeringTooltip';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Gauge, 
  ArrowDownUp, 
  Scale, 
  Flame, 
  Sparkles, 
  Info,
  Layers,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
  ExternalLink,
  Beaker,
  Zap,
  Check,
  Tag
} from 'lucide-react';

interface UsedConditionPanelProps {
  ct: CoiledTubingString;
  onChangeCondition: (condition: UsedCondition) => void;
  unitSystem: UnitSystem;
  compact?: boolean;
}

export const UsedConditionPanel: React.FC<UsedConditionPanelProps> = ({
  ct,
  onChangeCondition,
  unitSystem,
  compact = false,
}) => {
  const isMetric = unitSystem === 'metric';
  const [showPublishedDb, setShowPublishedDb] = useState(false);
  const [activePresetCategory, setActivePresetCategory] = useState<'all' | 'field' | 'standards' | 'severe'>('all');
  const [selectedPublishedId, setSelectedPublishedId] = useState<string | null>('fuling-shale-qt900-field');
  const [showOrthogonalMatrix, setShowOrthogonalMatrix] = useState(false);

  // Current active condition or default
  const condition: UsedCondition = ct.usedCondition || {
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

  const comparison = calculateUsedConditionComparison(ct, 0, 0.80, condition);

  const handleUpdate = <K extends keyof UsedCondition>(field: K, value: UsedCondition[K]) => {
    onChangeCondition({
      ...condition,
      [field]: value,
    });
  };

  const handleApplyPreset = (presetId: string) => {
    const found = USED_CONDITION_PRESETS.find((p) => p.id === presetId);
    if (found) {
      onChangeCondition({
        ...found.condition,
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Panel Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            condition.enabled
              ? comparison.isRetired
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                In-Service Pipe Condition (Real Field Situation)
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                condition.enabled
                  ? comparison.isRetired
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {condition.enabled 
                  ? `USED STRING (${comparison.remainingWallPercent.toFixed(1)}% WALL)` 
                  : 'NOMINAL / FACTORY NEW'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              API RP 5C7 in-service degradation: wall thinning, diametral ballooning, ovality, fatigue & weld derating.
            </p>
          </div>
        </div>

        {/* Master State Toggle Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleUpdate('enabled', !condition.enabled)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-2 transition-all shadow-sm ${
              condition.enabled
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-amber-950/50'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${condition.enabled ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
            <span>{condition.enabled ? 'Used Condition: ACTIVE' : 'Activate Used Condition'}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons & Category Selector */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Field Situation Presets:
            </span>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActivePresetCategory('all')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  activePresetCategory === 'all'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({USED_CONDITION_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePresetCategory('field')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  activePresetCategory === 'field'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Field Cases
              </button>
              <button
                type="button"
                onClick={() => setActivePresetCategory('standards')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  activePresetCategory === 'standards'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standards (API / CIRCA)
              </button>
              <button
                type="button"
                onClick={() => setActivePresetCategory('severe')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  activePresetCategory === 'severe'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Severe / Sour
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPublishedDb(!showPublishedDb)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 hover:border-cyan-500 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showPublishedDb ? 'Hide Published Case Studies' : 'Browse Published Field Datasets (JPSE / CIRCA)'}</span>
              {showPublishedDb ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {condition.enabled && (
              <button
                type="button"
                onClick={() => handleApplyPreset('nominal')}
                className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset 100% Nominal
              </button>
            )}
          </div>
        </div>

        {/* Filtered Preset Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {USED_CONDITION_PRESETS.filter((preset) => {
            if (activePresetCategory === 'field') {
              return ['fuling-shale-qt900-case', 'vaca-muerta-plug-milling-case', 'overdisplaced-frac-cleanout-case'].includes(preset.id);
            }
            if (activePresetCategory === 'standards') {
              return ['nominal', 'standard-used', 'circa-ballooning-limit-case', 'circa-severe-ballooning-case', 'retirement-limit'].includes(preset.id);
            }
            if (activePresetCategory === 'severe') {
              return ['corroded-pitted', 'heavy-workover', 'high-ovality'].includes(preset.id);
            }
            return true;
          }).map((preset) => {
            const isSelected =
              condition.enabled === preset.condition.enabled &&
              Math.abs(condition.wallLossPercent - preset.condition.wallLossPercent) < 0.1 &&
              Math.abs(condition.fatigueLifeUsedPercent - preset.condition.fatigueLifeUsedPercent) < 0.1;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-950/70 text-amber-200 border-amber-500 shadow-sm shadow-amber-950/50'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold leading-tight line-clamp-1">
                    {preset.name}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-1">
                    {preset.badge}
                  </div>
                </div>
                {preset.condition.defectDepthMm && (
                  <div className="text-[9px] font-mono text-amber-400 mt-1 bg-amber-950/60 px-1 py-0.5 rounded border border-amber-800/50 inline-block">
                    Pit: {preset.condition.defectDepthMm}mm
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Published Real Field & Experimental Defect Database */}
      {showPublishedDb && (
        <div className="bg-slate-950 border border-cyan-800/60 rounded-xl p-4 space-y-4 shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Published Real Field & Experimental Used CT Datasets (JPSE / CIRCA Standards)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              {PUBLISHED_USED_DATASETS.length} Validated Datasets Available
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {PUBLISHED_USED_DATASETS.map((ds) => {
              const isSelected = selectedPublishedId === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => setSelectedPublishedId(ds.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        ds.category === 'field_case'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : ds.category === 'experimental_defect'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}>
                        {ds.category === 'field_case' ? 'Real Field Case' : ds.category === 'experimental_defect' ? 'Orthogonal Lab Test' : 'Software Standard'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{ds.nominalString.grade}</span>
                    </div>

                    <h5 className="text-xs font-bold text-white leading-snug">
                      {ds.title}
                    </h5>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {ds.fieldLocation} &bull; {ds.operationalEnvironment.fluidOrSlurry}
                    </p>

                    {/* Defect Summary Pill */}
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Wall Loss:</span>
                        <span className="text-amber-400 font-bold">-{ds.defectSummary.wallLossPct}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Ovality / Ballooning:</span>
                        <span className="text-cyan-400 font-bold">{ds.defectSummary.ovalityPct}% / +{ds.defectSummary.ballooningPct}%</span>
                      </div>
                      {ds.defectSummary.pitDepthMm && (
                        <div className="flex justify-between text-slate-400">
                          <span>Pit Depth (c₀):</span>
                          <span className="text-rose-400 font-bold">{ds.defectSummary.pitDepthMm} mm</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Fatigue Consumed:</span>
                        <span className="text-purple-400 font-bold">{ds.defectSummary.fatigueUsedPct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-sans italic truncate max-w-[170px]">
                      {ds.sourceCitation}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeCondition({
                          ...ds.condition,
                          notes: `Imported from: ${ds.title} (${ds.sourceCitation})`,
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                    >
                      <Check className="w-3 h-3" />
                      Apply Condition
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Dataset Detail Inspection Panel */}
          {(() => {
            const activeDataset = PUBLISHED_USED_DATASETS.find((d) => d.id === selectedPublishedId);
            if (!activeDataset) return null;
            return (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-bold text-white">
                        {activeDataset.title} &bull; Detailed Technical Validation
                      </h5>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Citation: {activeDataset.sourceCitation}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onChangeCondition({
                        ...activeDataset.condition,
                        notes: `Imported from: ${activeDataset.title} (${activeDataset.sourceCitation})`,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Load Into Active String
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Nominal Pipe</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">
                      {activeDataset.nominalString.odIn.toFixed(3)}" OD &bull; {activeDataset.nominalString.wtIn.toFixed(3)}" Wall
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      {activeDataset.nominalString.grade} &bull; {activeDataset.nominalString.totalLengthFt.toLocaleString()} ft
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Wellbore Environment</span>
                    <span className="font-bold text-white text-xs mt-0.5 block truncate">
                      {activeDataset.fieldLocation}
                    </span>
                    <span className="text-[10px] text-amber-400">
                      {activeDataset.operationalEnvironment.internalPressurePsi ? `P_int: ${activeDataset.operationalEnvironment.internalPressurePsi} psi` : 'Circulating test'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Defect Geometry</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">
                      {activeDataset.defectSummary.pitDepthMm
                        ? `Depth: ${activeDataset.defectSummary.pitDepthMm} mm (${activeDataset.defectSummary.pitAngleDeg || 0}°)`
                        : `Wall Loss: ${activeDataset.defectSummary.wallLossPct}%`}
                    </span>
                    <span className="text-[10px] text-rose-400">
                      Ballooning: +{activeDataset.defectSummary.ballooningPct}% &bull; Ovality: {activeDataset.defectSummary.ovalityPct}%
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Measured Outcomes</span>
                    <span className="font-bold text-emerald-400 text-xs mt-0.5 block">
                      {activeDataset.measuredOutcome.tripsRemainingLimit
                        ? `${activeDataset.measuredOutcome.tripsRemainingLimit} Trips Safe Margin`
                        : activeDataset.measuredOutcome.remainingCycles
                        ? `${activeDataset.measuredOutcome.remainingCycles} Cycles Left`
                        : 'Field Calibrated'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block" title={activeDataset.measuredOutcome.failureMode}>
                      {activeDataset.measuredOutcome.failureMode}
                    </span>
                  </div>
                </div>

                {/* Optional: Show JPSE Orthogonal Matrix if this is the experimental defect test */}
                {(activeDataset.id === 'fuling_case_qt900' || activeDataset.id === 'jpse_pit_defect_05mm') && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                        <Beaker className="w-3.5 h-3.5 text-purple-400" />
                        JPSE Orthogonal Defect Test Matrix L₁₆(4⁴) Experimental Data:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOrthogonalMatrix(!showOrthogonalMatrix)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                      >
                        {showOrthogonalMatrix ? 'Hide Test Table' : 'Show All 16 Test Specimens'}
                      </button>
                    </div>

                    {showOrthogonalMatrix && (
                      <div className="overflow-x-auto max-h-52 overflow-y-auto">
                        <table className="w-full text-[10px] font-mono text-left">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2">Sample</th>
                              <th className="py-1.5 px-2">Pit Depth c₀ (mm)</th>
                              <th className="py-1.5 px-2">Angle α (°)</th>
                              <th className="py-1.5 px-2">Length a (mm)</th>
                              <th className="py-1.5 px-2">Width b (mm)</th>
                              <th className="py-1.5 px-2 text-right">Bends to Leakage N</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {JPSE_ORTHOGONAL_DEFECT_TESTS.map((test) => (
                              <tr key={test.sampleId} className="hover:bg-slate-800/40">
                                <td className="py-1 px-2 font-bold text-cyan-400">#{test.sampleId}</td>
                                <td className="py-1 px-2 text-white">{test.pitDepthMm} mm</td>
                                <td className="py-1 px-2 text-slate-300">{test.axialAngleDeg}°</td>
                                <td className="py-1 px-2 text-slate-300">{test.pitLengthMm} mm</td>
                                <td className="py-1 px-2 text-slate-300">{test.pitWidthMm} mm</td>
                                <td className="py-1 px-2 text-right font-bold text-amber-400">{test.cyclicBendsN} cycles</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1.5">
                      Range Analysis Result: <strong>Factor A (Pit Depth c₀, R=120.25)</strong> governs fatigue life reduction, followed by Factor D (Width, R=49.50), Factor B (Angle, R=44.25), and Factor C (Length, R=28.50).
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Active Defect Geometry Inspection Banner if Defect Depth is present */}
      {condition.defectDepthMm && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-md">
              <Beaker className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-300 block">
                Active Measured Pit Defect: {condition.defectDepthMm} mm Depth ({condition.defectAngleDeg ?? 0}° Orientation)
              </span>
              <span className="text-[10px] text-slate-400">
                Dimensions: {condition.defectLengthMm ?? 10} mm (a) &times; {condition.defectWidthMm ?? 5} mm (b) &bull; Tested at 35 MPa (5,076 psi)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700 shrink-0">
            JPSE 198 Correlated
          </span>
        </div>
      )}

      {/* API RP 5C7 Retirement Advisory Alert */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
        comparison.isRetired
          ? 'bg-rose-950/50 border-rose-700 text-rose-200'
          : comparison.retirementStatus === 'caution'
          ? 'bg-amber-950/40 border-amber-700/80 text-amber-200'
          : 'bg-slate-950/70 border-slate-800 text-slate-300'
      }`}>
        <div className="mt-0.5 shrink-0">
          {comparison.isRetired ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
          ) : comparison.retirementStatus === 'caution' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              API RP 5C7 String Retirement Status:
            </span>
            <span className="font-mono font-semibold">
              Remaining Wall: {comparison.remainingWallPercent.toFixed(1)}% (Limit: 80.0%)
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {comparison.statusMessage}
          </p>
        </div>
      </div>

      {/* Interactive Parameter Sliders & Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
        {/* Wall Loss % */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Wall Loss / Thinning</span>
              <EngineeringTooltip
                parameter="In-Service Wall Loss"
                symbol="Δt / t_loss"
                physicsFormula="t_used = t_nom · (1 - %Loss/100),  P_burst ∝ t_used"
                physicsExplanation="Progressive wall thinning caused by mechanical casing rub friction, downhole sand/slurry erosion during abrasive jetting, and acid corrosion. Directly shrinks load-bearing cross-sectional area and burst resistance."
                operationalImpact="API RP 5C7 standard strictly mandates pipe retirement at 20% wall loss (80% remaining wall). Exceeding this limit dramatically elevates risk of catastrophic burst during high-pressure pumping or collapse under external hydrostatic head."
                liveContext={`Remaining Wall: ${comparison.remainingWallPercent.toFixed(1)}% • Effective Wall: ${comparison.effectiveUsedString.wallThicknessIn.toFixed(3)}" (${comparison.wallLossIn.toFixed(3)}" loss) • Margin to Retirement: ${comparison.apiRetirementMarginPercent.toFixed(1)}%`}
                industryStandard="API RP 5C7 §5.2 / ICoTA Standard 1-96"
              />
            </div>
            <span className="font-mono font-bold text-amber-400">
              {condition.wallLossPercent.toFixed(1)}% Loss ({comparison.remainingWallPercent.toFixed(1)}% Remaining)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.5"
            value={condition.wallLossPercent}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleUpdate('wallLossPercent', val);
              if (!condition.enabled) handleUpdate('enabled', true);
            }}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0% (New)</span>
            <span className="text-rose-400 font-semibold">20% (API Retirement)</span>
            <span>25%</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
            <span>Effective Wall (t):</span>
            <span className="text-slate-200 font-semibold">
              {isMetric
                ? `${inToMm(comparison.effectiveUsedString.wallThicknessIn).toFixed(2)} mm`
                : `${comparison.effectiveUsedString.wallThicknessIn.toFixed(3)}" (-${comparison.wallLossIn.toFixed(3)}")`}
            </span>
          </div>
        </div>

        {/* Diametral Growth / Ballooning */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Diametral Ballooning (+ΔOD)</span>
              <EngineeringTooltip
                parameter="Diametral Ballooning Growth"
                symbol="+ΔOD"
                physicsFormula="ε_hoop = ΔOD / OD_nom,  OD_eff = OD_nom · (1 + %Growth/100)"
                physicsExplanation="Accumulated permanent circumferential plastic hoop strain caused by repeated pressure cycles while the tubing flexes over reel drum and guide arch radii. Expands the tube's outer envelope."
                operationalImpact="Excessive ballooning restricts passage through BOP stripper brass bushings, causes accelerated wear on injector gripper blocks, and tightens annular clearance in slim casing. ICoTA recommends retirement if OD growth exceeds 3.5%."
                liveContext={`Growth: +${comparison.odGrowthIn.toFixed(3)}" (+${condition.diametralGrowthPercent.toFixed(1)}%) • Effective OD: ${comparison.effectiveUsedString.outerDiameterIn.toFixed(3)}" • ${condition.diametralGrowthPercent >= 3.5 ? 'EXCEEDS 3.5% ICoTA LIMIT' : 'Within acceptable ICoTA limits'}`}
                industryStandard="ICoTA Recommended Practices for CT Inspection"
              />
            </div>
            <span className="font-mono font-bold text-cyan-400">
              +{condition.diametralGrowthPercent.toFixed(1)}% (+{comparison.odGrowthIn.toFixed(3)}")
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3.5"
            step="0.1"
            value={condition.diametralGrowthPercent}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleUpdate('diametralGrowthPercent', val);
              if (!condition.enabled) handleUpdate('enabled', true);
            }}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0%</span>
            <span>1.5%</span>
            <span>3.5%</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
            <span>Effective OD:</span>
            <span className="text-slate-200 font-semibold">
              {isMetric
                ? `${inToMm(comparison.effectiveUsedString.outerDiameterIn).toFixed(2)} mm`
                : `${comparison.effectiveUsedString.outerDiameterIn.toFixed(3)}" (Nom: ${ct.outerDiameterIn.toFixed(3)}")`}
            </span>
          </div>
        </div>

        {/* Actual In-Service Ovality */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">In-Service Ovality</span>
              <EngineeringTooltip
                parameter="In-Service Ovality Out-of-Round"
                symbol="Ovality %"
                physicsFormula="P_c(ovality) = P_c(nom) · [1 - 0.035 · Ovality%]"
                physicsExplanation="Cross-sectional eccentricity where OD_max deviates from OD_min due to cyclic bending over curved surfaces under internal pressure and injector skate gripper clamping loads."
                operationalImpact="Ovality drastically reduces resistance to external collapse under Haller-Lubinski / Timoshenko buckling theory. Each 1% ovality causes ~3.5% loss in external pressure rating. Also degrades stripper rubber pack-off seal longevity."
                liveContext={`Ovality: ${condition.actualOvalityPercent.toFixed(1)}% • Collapse Capacity Derating: -${(condition.actualOvalityPercent * 3.5).toFixed(1)}% • ${condition.actualOvalityPercent > 3.0 ? 'High ovality: Caution in high-hydrostatic wells' : 'Standard in-service level'}`}
                industryStandard="API Spec 5C3 / API RP 5C7 §5.4"
              />
            </div>
            <span className="font-mono font-bold text-purple-400">
              {condition.actualOvalityPercent.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={condition.actualOvalityPercent}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleUpdate('actualOvalityPercent', val);
              if (!condition.enabled) handleUpdate('enabled', true);
            }}
            className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0.5% (Nominal)</span>
            <span>2.5%</span>
            <span>5.0% (Severe)</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between font-mono">
            <span>Collapse Derating:</span>
            <span className="text-amber-400 font-semibold">
              -{(condition.actualOvalityPercent * 3.5).toFixed(1)}% Collapse
            </span>
          </div>
        </div>

        {/* Accumulated Fatigue Life Consumed */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Accumulated Fatigue Life Used</span>
              <EngineeringTooltip
                parameter="Cumulative Plastic Fatigue"
                symbol="Fatigue % (Miner's Rule)"
                physicsFormula="D = ∑ (n_i / N_fi) ≤ 1.0 (Coffin-Manson / Palmgren-Miner)"
                physicsExplanation="Low-cycle plastic fatigue damage accumulated as the pipe bends and straightens 4 times per trip (reel to arch, arch to vertical well, and back). Internal pressure amplifies cyclic strain amplitude, dramatically accelerating crack nucleation."
                operationalImpact="Strings reaching 75-80% fatigue life require substantial working pressure and overpull derating to safeguard against catastrophic in-hole parting. Strings should be retired or trimmed before reaching 100%."
                liveContext={`Consumed: ${condition.fatigueLifeUsedPercent.toFixed(0)}% • Remaining Life: ${(100 - condition.fatigueLifeUsedPercent).toFixed(0)}% • Status: ${condition.fatigueLifeUsedPercent > 80 ? 'CRITICAL - Retirement recommended' : condition.fatigueLifeUsedPercent > 50 ? 'Moderate in-service accumulation' : 'Safe operating window'}`}
                industryStandard="API RP 5C7 §6 / ICoTA Fatigue Guidelines"
              />
            </div>
            <span className={`font-mono font-bold ${
              condition.fatigueLifeUsedPercent > 75 
                ? 'text-rose-400' 
                : condition.fatigueLifeUsedPercent > 50 
                ? 'text-amber-400' 
                : 'text-emerald-400'
            }`}>
              {condition.fatigueLifeUsedPercent.toFixed(0)}% Used
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={condition.fatigueLifeUsedPercent}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleUpdate('fatigueLifeUsedPercent', val);
              if (!condition.enabled) handleUpdate('enabled', true);
            }}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                condition.fatigueLifeUsedPercent > 75 
                  ? 'bg-rose-500' 
                  : condition.fatigueLifeUsedPercent > 50 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, condition.fatigueLifeUsedPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Remaining Life: {(100 - condition.fatigueLifeUsedPercent).toFixed(0)}%</span>
            <span>Retirement: 80%</span>
          </div>
        </div>

        {/* Corrosion & Pitting Grade */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Corrosion & Surface Pitting</span>
              <EngineeringTooltip
                parameter="Corrosion Pitting Severity"
                symbol="K_t / Pitting Index"
                physicsFormula="σ_peak = K_t · σ_nom,  K_t ≈ 1 + 2 · √(depth / radius)"
                physicsExplanation="Localized galvanic pits, hydrochloric/hydrofluoric acid etching, or bacterial micro-pitting act as geometric notch stress concentrators. They multiply local tensile stress and accelerate fatigue crack initiation."
                operationalImpact="Even shallow pitting creates severe stress risers that derate pipe burst resistance and cut cyclic fatigue life by 40-70%. Requires derating factor: Light (0.96), Moderate (0.90), Severe (0.82)."
                liveContext={`Active Grade: ${condition.corrosionPittingGrade.toUpperCase()} • Derating Factor: ${condition.corrosionPittingGrade === 'none' ? '1.00' : condition.corrosionPittingGrade === 'light' ? '0.96' : condition.corrosionPittingGrade === 'moderate' ? '0.90' : '0.82'} • Recheck inspection logs`}
                industryStandard="NACE MR0175 / ASTM G46 / API 5ST"
              />
            </div>
            <span className="font-mono text-xs text-amber-400 uppercase font-semibold">
              {condition.corrosionPittingGrade}
            </span>
          </div>
          <select
            value={condition.corrosionPittingGrade}
            onChange={(e) => {
              handleUpdate('corrosionPittingGrade', e.target.value as CorrosionPittingGrade);
              if (!condition.enabled) handleUpdate('enabled', true);
            }}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
          >
            <option value="none">None / Pristine (1.00 Factor)</option>
            <option value="light">Light Atmospheric / Minor Etching (0.96 Factor)</option>
            <option value="moderate">Moderate Pitting / Acid Contact (0.90 Factor)</option>
            <option value="severe">Severe Pitting / Crevice Corrosion (0.82 Factor)</option>
          </select>
          <div className="text-[10px] text-slate-500 leading-tight">
            Stress concentration factor derates allowable yield stress under cyclic bending.
          </div>
        </div>

        {/* Working Section Weld & Sour Service */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Weld & Sour Service</span>
              <EngineeringTooltip
                parameter="Welds & Sour Environment"
                symbol="E_weld & H2S"
                physicsFormula="P_allow = E_weld · P_yield · F_H2S"
                physicsExplanation="Bias and orbital welds introduce a heat-affected zone (HAZ) with altered grain structure and residual weld stress. Sour H₂S environments induce atomic hydrogen diffusion, causing sulfide stress cracking (SSC) in high-strength steels."
                operationalImpact="Bias welds maintain 90% efficiency (E=0.90) due to 45° shear distribution; orbital butt welds have 80% (E=0.80); manual repairs have 60% (E=0.60). H₂S exposure requires an additional 10% derating (F_H2S=0.90)."
                liveContext={`Weld Type: ${condition.weldType} (E = ${condition.weldEfficiencyFactor.toFixed(2)}) • Sour Exposure: ${condition.h2sExposure ? 'Active (-10% derating)' : 'Inactive'}`}
                industryStandard="API Spec 5ST §8 / NACE MR0175"
              />
            </div>
            {condition.h2sExposure && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                H₂S SOUR
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Weld in Active String</label>
              <select
                value={condition.hasWeldInSection ? condition.weldType : 'none'}
                onChange={(e) => {
                  const val = e.target.value as WorkingWeldType;
                  if (val === 'none') {
                    handleUpdate('hasWeldInSection', false);
                    handleUpdate('weldType', 'none');
                    handleUpdate('weldEfficiencyFactor', 1.0);
                  } else {
                    handleUpdate('hasWeldInSection', true);
                    handleUpdate('weldType', val);
                    handleUpdate('weldEfficiencyFactor', val === 'bias' ? 0.90 : val === 'orbital' ? 0.80 : 0.60);
                    if (!condition.enabled) handleUpdate('enabled', true);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="none">Seamless / None (1.00)</option>
                <option value="bias">Bias Weld (0.90)</option>
                <option value="orbital">Orbital Weld (0.80)</option>
                <option value="manual">Manual Butt Weld (0.60)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={condition.h2sExposure}
                  onChange={(e) => {
                    handleUpdate('h2sExposure', e.target.checked);
                    if (e.target.checked && !condition.enabled) handleUpdate('enabled', true);
                  }}
                  className="accent-rose-500 rounded"
                />
                <span className="text-[11px] text-slate-300">H₂S Sour (NACE)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Delta Cards (Nominal vs. Real Condition) */}
      <div className="pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
          Mechanical Capacity Impact (Nominal As-Manufactured vs. In-Service String):
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Wall Thickness Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Wall Thickness</span>
              <span className="text-[10px] font-mono text-amber-400">
                -{condition.wallLossPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-amber-300">
              {isMetric
                ? `${inToMm(comparison.effectiveUsedString.wallThicknessIn).toFixed(2)} mm`
                : `${comparison.effectiveUsedString.wallThicknessIn.toFixed(3)}"`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${inToMm(ct.wallThicknessIn).toFixed(2)} mm` : `${ct.wallThicknessIn.toFixed(3)}"`}
            </div>
          </div>

          {/* Outer Diameter Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Outer Diameter</span>
              <span className="text-[10px] font-mono text-cyan-400">
                +{condition.diametralGrowthPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-cyan-300">
              {isMetric
                ? `${inToMm(comparison.effectiveUsedString.outerDiameterIn).toFixed(2)} mm`
                : `${comparison.effectiveUsedString.outerDiameterIn.toFixed(3)}"`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${inToMm(ct.outerDiameterIn).toFixed(2)} mm` : `${ct.outerDiameterIn.toFixed(3)}"`}
            </div>
          </div>

          {/* Weight in Air Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Weight in Air</span>
              <span className="text-[10px] font-mono text-slate-400">
                -{comparison.weightReductionPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {isMetric
                ? `${comparison.usedGeom.weightInAirKgM.toFixed(2)} kg/m`
                : `${comparison.usedGeom.weightInAirLbFt.toFixed(2)} lb/ft`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${comparison.nominalGeom.weightInAirKgM.toFixed(2)} kg/m` : `${comparison.nominalGeom.weightInAirLbFt.toFixed(2)} lb/ft`}
            </div>
          </div>

          {/* Yield Burst Pressure Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Yield Burst</span>
              <span className="text-[10px] font-mono text-rose-400">
                -{comparison.burstCapacityLossPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {isMetric
                ? `${Math.round(comparison.usedLimits.yieldBurstMpa)} MPa`
                : `${Math.round(comparison.usedLimits.yieldBurstPressurePsi).toLocaleString()} psi`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${Math.round(comparison.nominalLimits.yieldBurstMpa)} MPa` : `${Math.round(comparison.nominalLimits.yieldBurstPressurePsi).toLocaleString()} psi`}
            </div>
          </div>

          {/* Collapse Pressure Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Collapse Limit</span>
              <span className="text-[10px] font-mono text-rose-400">
                -{comparison.collapseCapacityLossPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-amber-400">
              {isMetric
                ? `${Math.round(comparison.usedLimits.safeCollapseMpa)} MPa`
                : `${Math.round(comparison.usedLimits.safeCollapsePressurePsi).toLocaleString()} psi`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${Math.round(comparison.nominalLimits.safeCollapseMpa)} MPa` : `${Math.round(comparison.nominalLimits.safeCollapsePressurePsi).toLocaleString()} psi`}
            </div>
          </div>

          {/* Tensile Yield / Safe Overpull Delta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">Safe Overpull</span>
              <span className="text-[10px] font-mono text-rose-400">
                -{comparison.tensileCapacityLossPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold font-mono text-purple-400">
              {isMetric
                ? `${Math.round(comparison.usedLimits.safeOverpullKn)} kN`
                : `${Math.round(comparison.usedLimits.safeOverpullLbf).toLocaleString()} lbf`}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Nominal: {isMetric ? `${Math.round(comparison.nominalLimits.safeOverpullKn)} kN` : `${Math.round(comparison.nominalLimits.safeOverpullLbf).toLocaleString()} lbf`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
