import React, { useState } from 'react';
import { BhaConfiguration, CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import { DEFAULT_FORCES } from '../data/presets';
import { 
  calculateWellboreForces, 
  lbfToKn, 
  knToLbf, 
  ftToM, 
  mToFt, 
  ppgToSg, 
  sgToPpg, 
  inToMm, 
  mmToIn 
} from '../utils/engineeringCalculations';
import { Wellbore3DSchematic } from './Wellbore3DSchematic';
import { StressDistributionChart } from './StressDistributionChart';
import { WellboreGeometryTable } from './WellboreGeometryTable';
import { WellboreSurveyStation } from '../types/coiledTubing';
import { DEFAULT_SURVEY_STATIONS, SURVEY_PRESET_COLLECTION } from '../data/presets';
import { 
  BHA_PRESETS, 
  BHA_LIBRARY_ITEMS, 
  BhaLibraryItemMetadata, 
  computeBhaSummaryMetrics 
} from '../data/bhaPresets';
import { TfaPredictedVsActualChart } from './TfaPredictedVsActualChart';
import { CriticalBucklingChart } from './CriticalBucklingChart';
import { BucklingMiniProfilePlot } from './BucklingMiniProfilePlot';
import { WellboreForcesHookloadChart } from './WellboreForcesHookloadChart';
import { FrictionTrendBadge } from './FrictionTrendBadge';
import { BhaConfigurationBuilder } from './BhaConfigurationBuilder';
import { BhaDragForceCalculator } from './BhaDragForceCalculator';
import { BhaLibrarySelector } from './BhaLibrarySelector';
import { WellboreDiagramSchematic } from './WellboreDiagramSchematic';
import { WellboreEditorModal } from './WellboreEditorModal';
import { UsedCtStringUpdaterModal } from './UsedCtStringUpdaterModal';
import { InjectorHeadForcesSummaryCard } from './InjectorHeadForcesSummaryCard';
import { WELLBORE_PRESETS } from '../data/wellborePresets';
import { WellboreProfile } from '../types/wellbore';
import { WellboreLoadScenarioSelector } from './WellboreLoadScenarioSelector';
import { 
  LoadScenarioId, 
  WellboreLoadScenario, 
  WELLBORE_LOAD_SCENARIOS 
} from '../data/wellboreLoadScenarios';
import { useToast } from '../context/ToastContext';
import { 
  Anchor, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowDown, 
  ArrowUp, 
  Compass, 
  ShieldAlert,
  Sliders,
  Activity,
  Layers,
  TrendingUp,
  TrendingDown,
  Table,
  FileSpreadsheet,
  Maximize2,
  Wrench
} from 'lucide-react';

interface WellboreForcesTabProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  onUpdateString?: (updated: CoiledTubingString) => void;
}

export const WellboreForcesTab: React.FC<WellboreForcesTabProps> = ({
  ct,
  unitSystem,
  onUpdateString,
}) => {
  const isMetric = unitSystem === 'metric';
  const { addToast } = useToast();
  const [activeScenarioId, setActiveScenarioId] = useState<LoadScenarioId | 'custom'>('normal_run');
  const [forcesInput, setForcesInput] = useState<WellboreForcesInput>(
    WELLBORE_LOAD_SCENARIOS.normal_run.forcesInput
  );
  const [displayMode, setDisplayMode] = useState<'schematic' | 'bha' | 'buckling' | 'tfa' | 'geometry' | '3d' | 'chart' | 'stress' | 'dual' | 'drag'>('schematic');
  const [dualSecondaryView, setDualSecondaryView] = useState<'3d' | 'hookload' | 'geometry' | 'buckling' | 'bha' | 'drag'>('3d');

  // Wellbore & Used CT Modal States
  const [wellboreProfile, setWellboreProfile] = useState<WellboreProfile>(() => {
    const base = WELLBORE_PRESETS[0];
    const initialScenario = WELLBORE_LOAD_SCENARIOS.normal_run;
    return {
      ...base,
      totalDepthMdFt: initialScenario.forcesInput.measuredDepthFt,
      totalDepthTvdFt: initialScenario.forcesInput.trueVerticalDepthFt,
      wellboreFluidDensityPpg: initialScenario.forcesInput.wellboreFluidDensityPpg,
      wellheadPressurePsi: initialScenario.surfaceEquipment?.wellheadPressurePsi ?? base.wellheadPressurePsi,
    };
  });
  const [isWellboreEditorOpen, setIsWellboreEditorOpen] = useState<boolean>(false);
  const [isUsedStringUpdaterOpen, setIsUsedStringUpdaterOpen] = useState<boolean>(false);

  const results = calculateWellboreForces(ct, forcesInput);

  // Handle Load Scenario preset selection
  const handleSelectScenario = (scenario: WellboreLoadScenario) => {
    setActiveScenarioId(scenario.id);
    setForcesInput(scenario.forcesInput);

    // Synchronize wellbore profile geometry and surface equipment
    setWellboreProfile((prev) => ({
      ...prev,
      totalDepthMdFt: scenario.forcesInput.measuredDepthFt,
      totalDepthTvdFt: scenario.forcesInput.trueVerticalDepthFt,
      wellboreFluidDensityPpg: scenario.forcesInput.wellboreFluidDensityPpg,
      wellheadPressurePsi: scenario.surfaceEquipment?.wellheadPressurePsi ?? prev.wellheadPressurePsi,
      ...(scenario.wellboreProfileOverrides || {}),
    }));

    // Trigger engineering notification toast
    const depthStr = isMetric
      ? `${Math.round(ftToM(scenario.forcesInput.measuredDepthFt)).toLocaleString()} m MD`
      : `${scenario.forcesInput.measuredDepthFt.toLocaleString()} ft MD`;
    const overpullStr = isMetric
      ? `${Math.round(lbfToKn(scenario.forcesInput.surfaceOverpullLimitLbf)).toLocaleString()} kN`
      : `${scenario.forcesInput.surfaceOverpullLimitLbf.toLocaleString()} lbf`;
    const snubbingStr = isMetric
      ? `${Math.round(lbfToKn(scenario.forcesInput.appliedInjectorSnubbingLbf)).toLocaleString()} kN`
      : `${scenario.forcesInput.appliedInjectorSnubbingLbf.toLocaleString()} lbf`;

    addToast({
      title: `Scenario Loaded: ${scenario.name}`,
      message: `Populated variables: Target ${depthStr}, Friction μ = ${scenario.forcesInput.frictionCoefficientCasing.toFixed(2)}, Overpull Limit = ${overpullStr}, Snubbing = ${snubbingStr}. Expected: ${scenario.expectedOutcomes.hookloadSummary}`,
      severity: scenario.category === 'critical_limit' ? 'warning' : 'info',
      parameterName: 'Load Scenario Preset',
      enteredValue: scenario.name,
      engineeringStandard: 'API RP 5C7 / ASME Section VIII',
      autoDismissMs: 5500,
    });
  };

  // Reset to Baseline Normal Run
  const handleResetToBaseline = () => {
    handleSelectScenario(WELLBORE_LOAD_SCENARIOS.normal_run);
  };

  // Synchronize when wellbore profile is saved
  const handleSaveWellboreProfile = (profile: WellboreProfile) => {
    setActiveScenarioId('custom');
    setWellboreProfile(profile);
    const prodCasing = profile.casingSections.find((c) => c.type === 'production_casing') || profile.casingSections[profile.casingSections.length - 1];
    setForcesInput((prev) => ({
      ...prev,
      measuredDepthFt: profile.totalDepthMdFt,
      trueVerticalDepthFt: profile.totalDepthTvdFt,
      wellboreFluidDensityPpg: profile.wellboreFluidDensityPpg,
      casingInnerDiameterIn: prodCasing ? prodCasing.innerDiameterIn : prev.casingInnerDiameterIn,
    }));
  };

  // Handle survey stations updates in real-time
  const handleSurveyStationsChange = (updatedStations: WellboreSurveyStation[]) => {
    if (!updatedStations || updatedStations.length === 0) return;
    setActiveScenarioId('custom');
    const last = updatedStations[updatedStations.length - 1];
    const maxInc = Math.max(...updatedStations.map((s) => s.inclinationDeg));
    setForcesInput((prev) => ({
      ...prev,
      geometryMode: 'custom_survey',
      surveyStations: updatedStations,
      measuredDepthFt: last.measuredDepthFt,
      trueVerticalDepthFt: last.trueVerticalDepthFt,
      wellboreInclinationDeg: maxInc,
    }));
  };

  // Handle BHA Library preset selection
  const handleSelectBha = (config: BhaConfiguration, metadata?: BhaLibraryItemMetadata) => {
    setActiveScenarioId('custom');
    const updatedConfig: BhaConfiguration = {
      ...config,
      enabled: true,
    };

    setForcesInput((prev) => ({
      ...prev,
      bhaConfig: updatedConfig,
    }));

    if (onUpdateString) {
      onUpdateString({
        ...ct,
        bhaConfig: updatedConfig,
      });
    }

    const metrics = computeBhaSummaryMetrics(
      updatedConfig.segments,
      ct,
      forcesInput.wellboreFluidDensityPpg,
      forcesInput.casingInnerDiameterIn,
      forcesInput.wellboreInclinationDeg
    );

    const lenStr = isMetric ? `${metrics.totalLengthM} m` : `${metrics.totalLengthFt} ft`;
    const wtStr = isMetric
      ? `${(metrics.totalBuoyedWeightKg ?? 0).toLocaleString()} kg`
      : `${(metrics.totalBuoyedWeightLbs ?? 0).toLocaleString()} lbs`;

    addToast({
      title: `BHA Applied: ${config.name}`,
      message: `Toolstring loaded with ${config.segments.length} components (${lenStr}, ${wtStr} buoyed weight, ${metrics.stiffnessRatioVsCt.toFixed(1)}× CT stiffness). Wellbore forces, contact drag, and buckling limits updated.`,
      severity: 'info',
      parameterName: 'BHA Configuration',
      enteredValue: config.name,
      engineeringStandard: 'API RP 5C7 / API SPEC 16ST',
      autoDismissMs: 5000,
    });
  };

  // Handle toggling BHA enabled / bare CT bypass
  const handleToggleBhaEnabled = (enabled: boolean) => {
    setActiveScenarioId('custom');
    const currentConfig = forcesInput.bhaConfig || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig;
    const updated: BhaConfiguration = {
      ...(currentConfig || { name: 'Standard BHA', segments: [] }),
      enabled,
    };

    setForcesInput((prev) => ({
      ...prev,
      bhaConfig: updated,
    }));

    if (onUpdateString) {
      onUpdateString({
        ...ct,
        bhaConfig: updated,
      });
    }

    addToast({
      title: enabled ? 'BHA Toolstring Simulation Active' : 'BHA Bypassed (Bare CT)',
      message: enabled
        ? `BHA toolstring weight, stiffness, and contact drag forces now active in wellbore calculations.`
        : `Simulating bare coiled tubing to TD. Toolstring weight and stiffness removed.`,
      severity: enabled ? 'info' : 'warning',
      autoDismissMs: 4000,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards: Surface Hookload Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RIH (Slack-off Weight) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">RIH (Slack-off Weight)</span>
            <ArrowDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {isMetric
              ? `${Math.round(lbfToKn(results.surfaceSlackoffWeightLbf))} kN`
              : `${Math.round(results.surfaceSlackoffWeightLbf).toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Weight on injector when running in hole
          </div>
        </div>

        {/* Static Neutral Hanging Weight */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Neutral Hanging Weight</span>
            <Anchor className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {isMetric
              ? `${Math.round(lbfToKn(results.surfaceNeutralWeightLbf))} kN`
              : `${Math.round(results.surfaceNeutralWeightLbf).toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Buoyancy Factor: <span className="text-slate-300 font-mono font-medium">{results.buoyancyFactor.toFixed(3)}</span>
          </div>
        </div>

        {/* POOH (Pick-up Weight) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">POOH (Pick-up Weight)</span>
            <ArrowUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {isMetric
              ? `${Math.round(lbfToKn(results.surfacePickupWeightLbf))} kN`
              : `${Math.round(results.surfacePickupWeightLbf).toLocaleString()} lbf`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Drag: <span className="text-slate-300 font-mono font-medium">{isMetric ? Math.round(lbfToKn(results.totalWellboreDragLbf)) + ' kN' : Math.round(results.totalWellboreDragLbf).toLocaleString() + ' lbf'}</span>
          </div>
        </div>

        {/* Helical Buckling & Lockup Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Buckling & Lockup</span>
            {results.isLockedUp ? (
              <AlertOctagon className="w-4 h-4 text-rose-500 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              results.isLockedUp ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {results.isLockedUp ? 'LOCKUP RISK' : 'NO LOCKUP'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            F<sub>helical</sub>: {isMetric ? Math.round(lbfToKn(results.helicalBucklingThresholdLbf)) + ' kN' : Math.round(results.helicalBucklingThresholdLbf).toLocaleString() + ' lbf'}
          </div>
        </div>
      </div>

      {/* Wellbore Load Scenario Presets Selector */}
      <WellboreLoadScenarioSelector
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onResetToBaseline={handleResetToBaseline}
        unitSystem={unitSystem}
      />

      {/* BHA Library Selector & Toolstring Presets */}
      <BhaLibrarySelector
        bhaConfig={forcesInput.bhaConfig}
        onSelectBha={handleSelectBha}
        onToggleBhaEnabled={handleToggleBhaEnabled}
        onOpenBhaBuilder={() => setDisplayMode('bha')}
        onOpenDragCalculator={() => setDisplayMode('drag')}
        ct={ct}
        unitSystem={unitSystem}
        casingInnerDiameterIn={forcesInput.casingInnerDiameterIn}
        fluidDensityPpg={forcesInput.wellboreFluidDensityPpg}
        wellboreInclinationDeg={forcesInput.wellboreInclinationDeg}
      />

      {/* Injector Head Pick-up and Slack-off Weights Summary Card */}
      <InjectorHeadForcesSummaryCard
        ct={ct}
        forcesInput={forcesInput}
        results={results}
        unitSystem={unitSystem}
        wellboreProfile={wellboreProfile}
        onUpdateForcesInput={(updated) => {
          setActiveScenarioId('custom');
          setForcesInput((prev) => ({
            ...prev,
            ...updated,
          }));
        }}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Trajectory & Friction Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Well Trajectory & Friction
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Quick Load Scenario Switcher in Sidebar */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Load Scenario:</span>
                </span>
                {activeScenarioId !== 'custom' ? (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${WELLBORE_LOAD_SCENARIOS[activeScenarioId].badgeColor.bg} ${WELLBORE_LOAD_SCENARIOS[activeScenarioId].badgeColor.text} ${WELLBORE_LOAD_SCENARIOS[activeScenarioId].badgeColor.border}`}>
                    {WELLBORE_LOAD_SCENARIOS[activeScenarioId].name}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Custom Tweaks
                  </span>
                )}
              </div>

              <select
                aria-label="Select wellbore load scenario preset"
                value={activeScenarioId}
                onChange={(e) => {
                  const val = e.target.value as LoadScenarioId;
                  if (WELLBORE_LOAD_SCENARIOS[val]) {
                    handleSelectScenario(WELLBORE_LOAD_SCENARIOS[val]);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-cyan-500 focus:outline-none"
              >
                {Object.values(WELLBORE_LOAD_SCENARIOS).map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} — {sc.category === 'critical_limit' ? '🚨 Critical Limit' : sc.category === 'contingency' ? '⚠️ Warning' : '✅ Standard'}
                  </option>
                ))}
                {activeScenarioId === 'custom' && (
                  <option value="custom" disabled>
                    -- Custom User Variables --
                  </option>
                )}
              </select>
            </div>

            {/* Trajectory Profile Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trajectory Definition:
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {forcesInput.geometryMode === 'custom_survey' ? 'Multi-Station Survey' : 'Single Angle'}
                </span>
              </div>
              <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScenarioId('custom');
                    setForcesInput({
                      ...forcesInput,
                      geometryMode: 'custom_survey',
                      surveyStations: forcesInput.surveyStations || DEFAULT_SURVEY_STATIONS,
                    });
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                    forcesInput.geometryMode === 'custom_survey'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Survey Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveScenarioId('custom');
                    setForcesInput({
                      ...forcesInput,
                      geometryMode: 'constant',
                    });
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                    forcesInput.geometryMode === 'constant'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Constant Inclination
                </button>
              </div>
            </div>

            {/* Custom Survey Active Summary or Constant Mode Sliders */}
            {forcesInput.geometryMode === 'custom_survey' ? (
              <div className="p-3 bg-slate-950/70 rounded-xl border border-cyan-500/20 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Survey Profile</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {(forcesInput.surveyStations || DEFAULT_SURVEY_STATIONS).length} Stations
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px] font-sans">Total MD:</span>
                    <span className="text-cyan-300 font-bold">
                      {isMetric
                        ? `${Math.round(ftToM(forcesInput.measuredDepthFt)).toLocaleString()} m`
                        : `${Math.round(forcesInput.measuredDepthFt).toLocaleString()} ft`}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px] font-sans">True Vertical:</span>
                    <span className="text-white font-bold">
                      {isMetric
                        ? `${Math.round(ftToM(forcesInput.trueVerticalDepthFt || forcesInput.measuredDepthFt * 0.75)).toLocaleString()} m`
                        : `${Math.round(forcesInput.trueVerticalDepthFt || forcesInput.measuredDepthFt * 0.75).toLocaleString()} ft`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisplayMode('geometry')}
                  className="w-full py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Open Interactive Survey Tool</span>
                </button>

                {/* Quick Presets in sidebar */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                    Quick Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(SURVEY_PRESET_COLLECTION).slice(0, 4).map(([key, p]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSurveyStationsChange(p.stations)}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-[11px] text-slate-300 text-left truncate transition-colors"
                        title={p.description}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Measured Depth */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">
                      Measured Depth (MD) {isMetric ? '(m)' : '(ft)'}
                    </label>
                    {forcesInput.measuredDepthFt > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveScenarioId('custom');
                          setForcesInput({ ...forcesInput, measuredDepthFt: 0, trueVerticalDepthFt: 0 });
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                        title="Set to surface depth 0"
                      >
                        Surface (0)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={isMetric ? Math.round(ftToM(forcesInput.measuredDepthFt)) : forcesInput.measuredDepthFt}
                    onChange={(e) => {
                      setActiveScenarioId('custom');
                      const raw = e.target.value;
                      const val = raw === '' ? 0 : parseFloat(raw);
                      const parsed = isNaN(val) ? 0 : Math.max(0, val);
                      setForcesInput({
                        ...forcesInput,
                        measuredDepthFt: isMetric ? mToFt(parsed) : parsed,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Wellbore Inclination Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">Wellbore Inclination (&theta;)</label>
                    <span className="font-mono font-bold text-amber-400">
                      {forcesInput.wellboreInclinationDeg}&deg; ({forcesInput.wellboreInclinationDeg === 0 ? 'Vertical' : forcesInput.wellboreInclinationDeg >= 85 ? 'Horizontal' : 'Deviated'})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="92"
                    step="1"
                    value={forcesInput.wellboreInclinationDeg}
                    onChange={(e) => {
                      setActiveScenarioId('custom');
                      setForcesInput({
                        ...forcesInput,
                        wellboreInclinationDeg: parseInt(e.target.value) || 0,
                      });
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0&deg; (Vertical)</span>
                    <span>45&deg; (S-curve)</span>
                    <span>90&deg; (Horizontal)</span>
                  </div>
                </div>
              </>
            )}

            {/* Dynamic Pipe-to-Wellbore Friction Factor Slider */}
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pipe-to-Wellbore Friction (&mu;)</span>
                </label>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-cyan-400 text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 shadow-inner">
                    {forcesInput.frictionCoefficientCasing.toFixed(2)}
                  </span>
                  <FrictionTrendBadge frictionValue={forcesInput.frictionCoefficientCasing} size="xs" />
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min="0.10"
                  max="0.40"
                  step="0.01"
                  value={forcesInput.frictionCoefficientCasing}
                  onChange={(e) => {
                    setActiveScenarioId('custom');
                    const newMu = parseFloat(e.target.value) || 0.24;
                    setForcesInput({
                      ...forcesInput,
                      frictionCoefficientCasing: Number(newMu.toFixed(2)),
                    });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  aria-label="Pipe-to-wellbore friction factor"
                />
                <div className="flex justify-between text-[10px] font-mono items-center">
                  <span className="flex items-center gap-0.5 text-emerald-400" title="Low friction: Below typical well profile baseline (~0.24)">
                    <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>0.10 Low</span>
                  </span>
                  <span className="text-slate-400" title="Nominal typical cased wellbore baseline (0.22 - 0.26)">
                    0.24 Typical
                  </span>
                  <span className="flex items-center gap-0.5 text-rose-400" title="High friction: Above typical well profile baseline (~0.24)">
                    <span>High 0.40</span>
                    <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-1 flex flex-wrap gap-1">
                {[
                  { val: 0.12, label: '0.12 OBM' },
                  { val: 0.20, label: '0.20 Brine' },
                  { val: 0.24, label: '0.24 WBM' },
                  { val: 0.30, label: '0.30 Drag' },
                  { val: 0.40, label: '0.40 OH' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      setActiveScenarioId('custom');
                      setForcesInput({
                        ...forcesInput,
                        frictionCoefficientCasing: p.val,
                      });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                      Math.abs(forcesInput.frictionCoefficientCasing - p.val) < 0.008
                        ? 'bg-cyan-600 text-white font-bold border-cyan-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wellbore Fluid Density */}
            <div>
              <label className="text-slate-400 block mb-1">
                Wellbore Fluid Density {isMetric ? '(SG)' : '(ppg)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={isMetric ? Number(ppgToSg(forcesInput.wellboreFluidDensityPpg).toFixed(2)) : forcesInput.wellboreFluidDensityPpg}
                onChange={(e) => {
                  setActiveScenarioId('custom');
                  const val = parseFloat(e.target.value) || 8.34;
                  setForcesInput({
                    ...forcesInput,
                    wellboreFluidDensityPpg: isMetric ? sgToPpg(val) : val,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Buckling Details Box */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Dawson-Paslay & Wu Buckling
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sinusoidal Buckling (F<sub>crit</sub>):</span>
                <span className="font-mono font-bold text-amber-300">
                  {isMetric
                    ? `${Math.round(lbfToKn(results.criticalSinusoidalBucklingLbf))} kN`
                    : `${Math.round(results.criticalSinusoidalBucklingLbf).toLocaleString()} lbf`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Helical Buckling (F<sub>hel</sub>):</span>
                <span className="font-mono font-bold text-rose-400">
                  {isMetric
                    ? `${Math.round(lbfToKn(results.helicalBucklingThresholdLbf))} kN`
                    : `${Math.round(results.helicalBucklingThresholdLbf).toLocaleString()} lbf`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Buoyed Weight / Length:</span>
                <span className="font-mono font-bold text-slate-200">
                  {isMetric
                    ? `${(results.buoyedWeightLbFt * 1.48816).toFixed(2)} kg/m`
                    : `${results.buoyedWeightLbFt.toFixed(2)} lb/ft`}
                </span>
              </div>

              {/* Recharts Mini Buckling Limits Plot Along Depth */}
              <div className="pt-2">
                <BucklingMiniProfilePlot
                  weightProfile={results.weightProfile}
                  unitSystem={unitSystem}
                  height={115}
                  onOpenFullChart={() => setDisplayMode('buckling')}
                />
              </div>

              <button
                type="button"
                onClick={() => setDisplayMode('buckling')}
                className="w-full mt-2 py-1.5 px-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Full Buckling Graph &rarr;</span>
              </button>
            </div>

            {/* BHA (Bottom Hole Assembly) Summary Card */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-cyan-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BHA Toolstring</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleBhaEnabled(!forcesInput.bhaConfig?.enabled)}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border transition-all ${
                    forcesInput.bhaConfig?.enabled
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Click to toggle BHA active/bypass"
                >
                  {forcesInput.bhaConfig?.enabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Quick Select BHA Preset */}
              <div className="pt-0.5">
                <label className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
                  Preset Selection:
                </label>
                <select
                  aria-label="Select BHA toolstring preset"
                  value={
                    !forcesInput.bhaConfig?.enabled
                      ? 'bypass'
                      : BHA_LIBRARY_ITEMS.find((item) => item.config.name === forcesInput.bhaConfig?.name)?.id || 'custom'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'bypass') {
                      handleToggleBhaEnabled(false);
                    } else {
                      const item = BHA_LIBRARY_ITEMS.find((i) => i.id === val);
                      if (item) {
                        handleSelectBha(item.config, item);
                      }
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value="bypass">-- Bypass BHA (Bare CT) --</option>
                  {BHA_LIBRARY_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.shortName} ({item.typicalToolCount} tools, {item.config.segments.reduce((acc, s) => acc + s.lengthFt, 0).toFixed(0)}ft)
                    </option>
                  ))}
                  {forcesInput.bhaConfig?.enabled && !BHA_LIBRARY_ITEMS.some((i) => i.config.name === forcesInput.bhaConfig?.name) && (
                    <option value="custom">-- Custom Toolstring --</option>
                  )}
                </select>
              </div>

              {results.bhaMetrics ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total BHA Length:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {isMetric ? `${results.bhaMetrics.totalLengthM} m` : `${results.bhaMetrics.totalLengthFt} ft`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Buoyed BHA Weight:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {isMetric
                        ? `${(results.bhaMetrics.totalBuoyedWeightKg ?? 0).toLocaleString()} kg`
                        : `${(results.bhaMetrics.totalBuoyedWeightLbs ?? 0).toLocaleString()} lbs`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Outer Dia.:</span>
                    <span className="font-mono font-bold text-white">
                      {isMetric
                        ? `${inToMm(results.bhaMetrics.maxOuterDiameterIn).toFixed(1)} mm`
                        : `${results.bhaMetrics.maxOuterDiameterIn.toFixed(3)}"`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stiffness vs CT:</span>
                    <span className="font-mono font-bold text-purple-300">
                      {results.bhaMetrics.stiffnessRatioVsCt.toFixed(1)}&times; ({results.bhaMetrics.stiffnessRatioVsCt > 1 ? `+${Math.round((results.bhaMetrics.stiffnessRatioVsCt - 1) * 100)}%` : 'baseline'})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  No BHA segments active. Coiled tubing properties used uniformly to TD.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode('bha')}
                  className="py-1.5 px-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BHA Toolstring</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('drag')}
                  className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Axial Drag</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: 3D Wellbore Simulation & Hookload vs Depth */}
        <div className="lg:col-span-2 space-y-6">
          {/* View Mode Toggle Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Visualizer Mode:
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Interactive wellbore schematic, drag forces, buckling curves &amp; BHA
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsWellboreEditorOpen(true)}
                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Edit Wellbore & Casing Schedule"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Update Wellbore</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUsedStringUpdaterOpen(true)}
                className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Update Used String Condition (Fatigue, Wall Loss, Ballooning)"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Update Used CT</span>
              </button>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setDisplayMode('schematic')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'schematic'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-200" />
                <span>Architecture &amp; Ingress Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('drag')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'drag'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-emerald-300" />
                <span>Drag Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('bha')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'bha'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-cyan-200" />
                <span>BHA 3D</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('buckling')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'buckling'
                    ? 'bg-amber-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span>Buckling Limits Plot</span>
                <span className="text-[9px] font-mono px-1 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50">Recharts</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('tfa')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'tfa'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-200" />
                <span>TFA Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('geometry')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'geometry'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-200" />
                <span>Custom Geometry</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('3d')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === '3d'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-200" />
                <span>3D Wellbore & Ops</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('chart')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'chart'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Anchor className="w-3.5 h-3.5 text-cyan-200" />
                <span>Hookload &amp; Limits</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('stress')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'stress'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-200" />
                <span>Stress Distribution</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('dual')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 font-medium transition-all ${
                  displayMode === 'dual'
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-200" />
                <span>Dual View</span>
              </button>
            </div>
          </div>

          {/* Dual View Sub-Selector */}
          {displayMode === 'dual' && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Upper Panel View:</span>
              <div className="flex bg-slate-950 p-0.5 rounded-md border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('drag')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === 'drag'
                      ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Axial Drag
                </button>
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('bha')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === 'bha'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BHA Assembly 3D
                </button>
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('buckling')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === 'buckling'
                      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Buckling Graph
                </button>
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('geometry')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === 'geometry'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Survey Tool
                </button>
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('3d')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === '3d'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3D Wellbore
                </button>
                <button
                  type="button"
                  onClick={() => setDualSecondaryView('hookload')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    dualSecondaryView === 'hookload'
                      ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hookload Profile
                </button>
              </div>
            </div>
          )}

          {/* Wellbore Schematic Diagram (Full Wellbore, Casing & CT Simulation) */}
          {displayMode === 'schematic' && (
            <WellboreDiagramSchematic
              ct={ct}
              wellboreProfile={wellboreProfile}
              unitSystem={unitSystem}
              forcesInput={forcesInput}
              forcesResult={results}
              onOpenWellboreEditor={() => setIsWellboreEditorOpen(true)}
              onOpenUsedStringUpdater={() => setIsUsedStringUpdaterOpen(true)}
              onUpdateWellboreProfile={handleSaveWellboreProfile}
              onOpenBucklingPlot={() => setDisplayMode('buckling')}
            />
          )}

          {/* Axial Drag Force Calculator */}
          {(displayMode === 'drag' || (displayMode === 'dual' && dualSecondaryView === 'drag')) && (
            <BhaDragForceCalculator
              ct={ct}
              forcesInput={forcesInput}
              unitSystem={unitSystem}
              onOpenBhaBuilder={() => setDisplayMode('bha')}
            />
          )}

          {/* BHA (Bottom Hole Assembly) Builder */}
          {(displayMode === 'bha' || (displayMode === 'dual' && dualSecondaryView === 'bha')) && (
            <BhaConfigurationBuilder
              bhaConfig={forcesInput.bhaConfig || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig}
              onChange={(newBhaConfig) => {
                setForcesInput((prev) => ({
                  ...prev,
                  bhaConfig: newBhaConfig,
                }));
              }}
              ct={ct}
              casingInnerDiameterIn={forcesInput.casingInnerDiameterIn}
              fluidDensityPpg={forcesInput.wellboreFluidDensityPpg}
              wellboreInclinationDeg={forcesInput.wellboreInclinationDeg}
              unitSystem={unitSystem}
            />
          )}

          {/* Critical Buckling Load vs Depth Graph (Recharts) */}
          {(displayMode === 'buckling' || (displayMode === 'dual' && dualSecondaryView === 'buckling')) && (
            <CriticalBucklingChart
              ct={ct}
              forcesInput={forcesInput}
              unitSystem={unitSystem}
              onChangeFrictionCoefficient={(newMu) => {
                setActiveScenarioId('custom');
                setForcesInput((prev) => ({
                  ...prev,
                  frictionCoefficientCasing: newMu,
                }));
              }}
            />
          )}

          {/* TFA Chart (Tubing Force Analysis) - Real-Time Matching Predicted vs Actual */}
          {displayMode === 'tfa' && (
            <TfaPredictedVsActualChart
              ct={ct}
              unitSystem={unitSystem}
              forcesInput={forcesInput}
              defaultWellName="MRJN-764"
            />
          )}

          {/* Custom Survey Geometry Table & Cross-Section Profile */}
          {(displayMode === 'geometry' || (displayMode === 'dual' && dualSecondaryView === 'geometry')) && (
            <WellboreGeometryTable
              stations={forcesInput.surveyStations || DEFAULT_SURVEY_STATIONS}
              onChange={handleSurveyStationsChange}
              unitSystem={unitSystem}
              currentDepthFt={forcesInput.measuredDepthFt}
            />
          )}

          {/* 3D Wellbore Simulation */}
          {(displayMode === '3d' || (displayMode === 'dual' && dualSecondaryView === '3d')) && (
            <Wellbore3DSchematic
              ct={ct}
              unitSystem={unitSystem}
              forcesInput={forcesInput}
              results={results}
            />
          )}

          {/* Hookload vs Depth & Buckling Limits Recharts Plot */}
          {(displayMode === 'chart' || (displayMode === 'dual' && dualSecondaryView === 'hookload')) && (
            <WellboreForcesHookloadChart
              ct={ct}
              forcesInput={forcesInput}
              results={results}
              unitSystem={unitSystem}
              onChangeFrictionCoefficient={(newMu) => {
                setActiveScenarioId('custom');
                setForcesInput((prev) => ({
                  ...prev,
                  frictionCoefficientCasing: newMu,
                }));
              }}
            />
          )}

          {/* Stress Distribution Line Chart (Recharts) - Visible in 'stress' or 'dual' modes */}
          {(displayMode === 'stress' || displayMode === 'dual') && (
            <StressDistributionChart
              ct={ct}
              forcesInput={forcesInput}
              unitSystem={unitSystem}
            />
          )}
        </div>
      </div>

      {/* Wellbore & Casing Schedule Editor Modal */}
      <WellboreEditorModal
        isOpen={isWellboreEditorOpen}
        onClose={() => setIsWellboreEditorOpen(false)}
        currentProfile={wellboreProfile}
        onSaveProfile={handleSaveWellboreProfile}
        unitSystem={unitSystem}
      />

      {/* Used CT String Condition & Wear Updater Modal */}
      <UsedCtStringUpdaterModal
        isOpen={isUsedStringUpdaterOpen}
        onClose={() => setIsUsedStringUpdaterOpen(false)}
        ct={ct}
        onUpdateString={onUpdateString}
        unitSystem={unitSystem}
      />
    </div>
  );
};
