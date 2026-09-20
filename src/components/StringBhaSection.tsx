import React, { useState } from 'react';
import { 
  CoiledTubingString, 
  UnitSystem, 
  BhaConfiguration, 
  BhaSegment, 
  BhaToolType 
} from '../types/coiledTubing';
import { 
  BHA_PRESETS, 
  TOOL_TYPE_DEFAULTS, 
  calculateSegmentLinearWeight 
} from '../data/bhaPresets';
import { 
  inToMm, 
  mmToIn, 
  ftToM, 
  mToFt, 
  calculateGeometry 
} from '../utils/engineeringCalculations';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  Anchor, 
  Info,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { EngineeringTooltip } from './EngineeringTooltip';

interface StringBhaSectionProps {
  ct: CoiledTubingString;
  onChangeString: (updated: CoiledTubingString) => void;
  unitSystem: UnitSystem;
  onNavigateToForces?: () => void;
}

const TOOL_ICONS: Record<BhaToolType, string> = {
  motor: '⚡',
  nozzle_bit: '⚙️',
  connector: '🔗',
  valve: '🛡️',
  collar: '⚖️',
  jar: '🔨',
  agitator: '〰️',
  logging: '📡',
  tractor: '🚜',
  custom: '🔧',
};

const TOOL_TYPE_LABELS: Record<BhaToolType, string> = {
  motor: 'PDM Mud Motor',
  nozzle_bit: 'Bit / Mill / Nozzle',
  connector: 'CT Connector',
  valve: 'Check Valve / Sub',
  collar: 'Drill Collar / Sinker',
  jar: 'Hydraulic Jar',
  agitator: 'Oscillator / Agitator',
  logging: 'Logging Sensor',
  tractor: 'Downhole Tractor',
  custom: 'Custom Tool',
};

export const StringBhaSection: React.FC<StringBhaSectionProps> = ({
  ct,
  onChangeString,
  unitSystem,
  onNavigateToForces,
}) => {
  const isMetric = unitSystem === 'metric';

  // Get or initialize active BHA configuration
  const currentBha: BhaConfiguration = ct.bhaConfig || {
    enabled: true,
    name: 'Standard Cleanout & Milling BHA',
    segments: BHA_PRESETS.motor_milling.config.segments,
  };

  const isBhaEnabled = !!currentBha.enabled;
  const segments = currentBha.segments || [];

  // Compute live BHA metrics
  let totalBhaLengthFt = 0;
  let totalBhaAirWeightLbs = 0;
  let maxToolOdIn = ct.outerDiameterIn;

  segments.forEach((seg) => {
    const len = Math.max(0, seg.lengthFt);
    const linWeight = seg.linearWeightLbFt && seg.linearWeightLbFt > 0
      ? seg.linearWeightLbFt
      : calculateSegmentLinearWeight(seg.outerDiameterIn, seg.innerDiameterIn);
    totalBhaLengthFt += len;
    totalBhaAirWeightLbs += len * linWeight;
    if (seg.outerDiameterIn > maxToolOdIn) {
      maxToolOdIn = seg.outerDiameterIn;
    }
  });

  const geom = calculateGeometry(ct);

  // Combined totals
  const totalAssemblyLengthFt = ct.totalLengthFt + (isBhaEnabled ? totalBhaLengthFt : 0);
  const totalAssemblyAirWeightLbs = geom.totalWeightInAirLbs + (isBhaEnabled ? totalBhaAirWeightLbs : 0);

  // Update BHA helper
  const updateBha = (updatedBha: BhaConfiguration) => {
    onChangeString({
      ...ct,
      bhaConfig: updatedBha,
    });
  };

  // Toggle master BHA enable/disable
  const handleToggleEnable = () => {
    updateBha({
      ...currentBha,
      enabled: !isBhaEnabled,
    });
  };

  // Load preset template
  const handleLoadPreset = (presetKey: keyof typeof BHA_PRESETS) => {
    const preset = BHA_PRESETS[presetKey];
    if (preset) {
      updateBha({
        ...preset.config,
        enabled: true,
      });
    }
  };

  // Clear all tools
  const handleClearAll = () => {
    updateBha({
      ...currentBha,
      segments: [],
    });
  };

  // Quick add basic component
  const handleAddQuickComponent = (toolType: BhaToolType) => {
    const defaults = TOOL_TYPE_DEFAULTS[toolType];
    const newId = `bha-${toolType}-${Date.now()}`;
    const od = Math.max(ct.outerDiameterIn, defaults.defaultOd);
    const id = defaults.defaultId;
    const newSegment: BhaSegment = {
      id: newId,
      name: defaults.name,
      type: toolType,
      lengthFt: defaults.defaultLen,
      outerDiameterIn: od,
      innerDiameterIn: id,
      linearWeightLbFt: calculateSegmentLinearWeight(od, id),
      color: defaults.color,
      description: `${defaults.name} (${od}" OD)`,
    };

    // If it's a connector, put it at the top (idx 0), otherwise append at bottom
    const newSegments = toolType === 'connector' 
      ? [newSegment, ...segments]
      : [...segments, newSegment];

    updateBha({
      ...currentBha,
      enabled: true,
      segments: newSegments,
    });
  };

  // Update specific segment
  const handleUpdateSegment = (id: string, updates: Partial<BhaSegment>) => {
    const updatedSegments = segments.map((seg) => {
      if (seg.id !== id) return seg;
      const updated = { ...seg, ...updates };
      // Recalculate linear weight if OD or ID changed and linear weight wasn't explicitly changed
      if (('outerDiameterIn' in updates || 'innerDiameterIn' in updates) && !('linearWeightLbFt' in updates)) {
        updated.linearWeightLbFt = calculateSegmentLinearWeight(
          updated.outerDiameterIn,
          updated.innerDiameterIn
        );
      }
      return updated;
    });

    updateBha({
      ...currentBha,
      segments: updatedSegments,
    });
  };

  // Delete segment
  const handleDeleteSegment = (id: string) => {
    updateBha({
      ...currentBha,
      segments: segments.filter((s) => s.id !== id),
    });
  };

  // Reorder segment
  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= segments.length) return;
    const copy = [...segments];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    updateBha({
      ...currentBha,
      segments: copy,
    });
  };

  // Duplicate segment
  const handleDuplicateSegment = (index: number) => {
    const orig = segments[index];
    const clone: BhaSegment = {
      ...orig,
      id: `${orig.type}-${Date.now()}`,
      name: `${orig.name} (Copy)`,
    };
    const copy = [...segments];
    copy.splice(index + 1, 0, clone);
    updateBha({
      ...currentBha,
      segments: copy,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl shrink-0">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Bottom Hole Assembly (BHA) & Downhole Toolstring
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                isBhaEnabled
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isBhaEnabled ? 'ACTIVE IN FORCE MODEL' : 'MODELING BYPASSED'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {segments.length} {segments.length === 1 ? 'Component' : 'Components'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Define downhole tools (motor, bit, connector, valves, jars) to automatically update total string length, hanging weight, and wellbore force calculations.
            </p>
          </div>
        </div>

        {/* Master Active Switch */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleToggleEnable}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
              isBhaEnabled
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isBhaEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{isBhaEnabled ? 'BHA Enabled' : 'Enable BHA Modeling'}</span>
          </button>
        </div>
      </div>

      {/* Assembly Presets & Quick Add Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
        {/* Preset Templates */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets:</span>
          </span>
          <button
            type="button"
            onClick={() => handleLoadPreset('motor_milling')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded text-[11px] font-medium transition-colors"
          >
            ⚡ Motor + Bit + Connector
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('cleanout')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded text-[11px] font-medium transition-colors"
          >
            🌊 Cleanout Jetting Nozzle
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('heavy_weight')}
            className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded text-[11px] font-medium transition-colors"
          >
            ⚖️ Heavy Collars & Agitator
          </button>
          {segments.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2 py-1 text-slate-400 hover:text-rose-300 text-[11px] transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Quick Add Component Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Tool:</span>
          </span>
          <button
            type="button"
            onClick={() => handleAddQuickComponent('motor')}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Add Positive Displacement Mud Motor"
          >
            + Motor
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickComponent('nozzle_bit')}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Add Drill Bit, Mill, or Jetting Nozzle"
          >
            + Bit / Mill
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickComponent('connector')}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Add Coiled Tubing Connector"
          >
            + Connector
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickComponent('valve')}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Add Check Valve or Circulation Sub"
          >
            + Valve
          </button>
          <button
            type="button"
            onClick={() => handleAddQuickComponent('collar')}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Add Drill Collar or Sinker Bar"
          >
            + Collar
          </button>
        </div>
      </div>

      {/* Assembly Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">Total BHA Length</span>
            <EngineeringTooltip
              parameter="BHA Toolstring Length"
              symbol="L_BHA"
              physicsFormula="L_BHA = Σ L_i"
              physicsExplanation="Combined axial length of all bottom hole assembly components from the CT slip connector down to the bit face."
              operationalImpact="Couples to coiled tubing length to establish total string reach in the wellbore."
              liveContext={`BHA Length: ${isMetric ? `${ftToM(totalBhaLengthFt).toFixed(2)} m` : `${totalBhaLengthFt.toFixed(1)} ft`} (${segments.length} tools)`}
            />
          </div>
          <div className="text-lg font-mono font-bold text-cyan-300">
            {isMetric ? `${ftToM(totalBhaLengthFt).toFixed(2)} m` : `${totalBhaLengthFt.toFixed(1)} ft`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            CT: {isMetric ? `${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m` : `${ct.totalLengthFt.toLocaleString()} ft`}
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">Total BHA Weight (Air)</span>
            <EngineeringTooltip
              parameter="BHA Dry Weight in Air"
              symbol="W_BHA"
              physicsFormula="W_BHA = Σ (w_linear,i · L_i)"
              physicsExplanation="Total dry gravitational weight of the toolstring assembly."
              operationalImpact="Adds directly to surface hookload (pickup tension) and supplies weight-on-bit (WOB) under gravity in inclined sections."
              liveContext={`BHA Weight: ${isMetric ? `${Math.round(totalBhaAirWeightLbs * 0.453592).toLocaleString()} kg` : `${Math.round(totalBhaAirWeightLbs).toLocaleString()} lbs`}`}
            />
          </div>
          <div className="text-lg font-mono font-bold text-amber-300">
            {isMetric 
              ? `${Math.round(totalBhaAirWeightLbs * 0.453592).toLocaleString()} kg` 
              : `${Math.round(totalBhaAirWeightLbs).toLocaleString()} lbs`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg: {isMetric 
              ? `${(totalBhaLengthFt > 0 ? (totalBhaAirWeightLbs * 0.453592) / ftToM(totalBhaLengthFt) : 0).toFixed(1)} kg/m` 
              : `${(totalBhaLengthFt > 0 ? totalBhaAirWeightLbs / totalBhaLengthFt : 0).toFixed(1)} lb/ft`}
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-cyan-500/30 bg-gradient-to-br from-slate-950 to-cyan-950/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-cyan-300">Total Combined Length</span>
            <EngineeringTooltip
              parameter="Total Operational String Length"
              symbol="L_total"
              physicsFormula="L_total = L_CT + L_BHA"
              physicsExplanation="The cumulative length of the coiled tubing spool plus all BHA components attached at the bottom."
              operationalImpact="Used as the maximum wellbore reach depth for tubing force calculations and wellbore clearance."
              liveContext={`Combined Length: ${isMetric ? `${ftToM(totalAssemblyLengthFt).toFixed(1)} m` : `${totalAssemblyLengthFt.toFixed(1)} ft`}`}
            />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {isMetric ? `${ftToM(totalAssemblyLengthFt).toFixed(1)} m` : `${totalAssemblyLengthFt.toLocaleString()} ft`}
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5">
            {isBhaEnabled ? `CT + BHA (+${isMetric ? ftToM(totalBhaLengthFt).toFixed(1) : totalBhaLengthFt.toFixed(1)})` : 'CT Tubing Only'}
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/30 bg-gradient-to-br from-slate-950 to-amber-950/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-amber-300">Total Assembly Weight</span>
            <EngineeringTooltip
              parameter="Total Assembly Weight (Empty / Dry)"
              symbol="W_assembly"
              physicsFormula="W_assembly = W_CT + W_BHA"
              physicsExplanation="Total dry hanging weight of coiled tubing plus toolstring in air."
              operationalImpact="Feeds directly into surface pickup tension and injector load limits."
              liveContext={`Combined Weight: ${isMetric ? `${Math.round(totalAssemblyAirWeightLbs * 0.453592).toLocaleString()} kg` : `${Math.round(totalAssemblyAirWeightLbs).toLocaleString()} lbs`}`}
            />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {isMetric 
              ? `${Math.round(totalAssemblyAirWeightLbs * 0.453592).toLocaleString()} kg` 
              : `${Math.round(totalAssemblyAirWeightLbs).toLocaleString()} lbs`}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            {isBhaEnabled ? `CT + BHA (+${isMetric ? Math.round(totalBhaAirWeightLbs * 0.453592).toLocaleString() : Math.round(totalBhaAirWeightLbs).toLocaleString()})` : 'CT Tubing Only'}
          </div>
        </div>
      </div>

      {/* Visual Toolstring Mini-Schematic */}
      {segments.length > 0 && (
        <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Downhole Toolstring Stack (Top of BHA &rarr; Formation / Bit)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Max Tool OD: {isMetric ? `${inToMm(maxToolOdIn).toFixed(1)} mm` : `${maxToolOdIn.toFixed(3)}"`}
            </span>
          </div>

          {/* Horizontal Stack Bar */}
          <div className="relative w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-[500px]">
              {/* CT Connection Stub */}
              <div className="flex flex-col items-center shrink-0 pr-1 border-r border-slate-700">
                <span className="text-[9px] font-mono text-cyan-400">COILED TUBING</span>
                <span className="text-[10px] font-mono text-slate-300 font-bold">{ct.outerDiameterIn.toFixed(3)}" OD</span>
                <div className="w-8 h-4 bg-cyan-600/40 border border-cyan-400/60 rounded-l my-1" />
                <span className="text-[9px] text-slate-500">Surface</span>
              </div>

              {/* Segments Stack */}
              {segments.map((seg, idx) => {
                const segWeight = seg.lengthFt * (seg.linearWeightLbFt || calculateSegmentLinearWeight(seg.outerDiameterIn, seg.innerDiameterIn));
                return (
                  <div
                    key={seg.id}
                    className="flex-1 flex flex-col items-center min-w-[90px] max-w-[150px] px-1 py-1 rounded bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors group relative"
                  >
                    <div className="flex items-center gap-1 text-[10px] font-semibold truncate w-full justify-center">
                      <span>{TOOL_ICONS[seg.type]}</span>
                      <span className="truncate text-slate-200 group-hover:text-cyan-300">{seg.name}</span>
                    </div>

                    <div 
                      className="w-full h-4 rounded my-1 flex items-center justify-center text-[8px] font-mono font-bold text-white shadow-inner"
                      style={{ backgroundColor: seg.color || '#06b6d4' }}
                    >
                      {isMetric ? `${inToMm(seg.outerDiameterIn).toFixed(0)}mm` : `${seg.outerDiameterIn.toFixed(2)}"`}
                    </div>

                    <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-400">
                      <span>#{idx + 1}</span>
                      <span className="text-cyan-400">{isMetric ? `${ftToM(seg.lengthFt).toFixed(1)}m` : `${seg.lengthFt.toFixed(1)}ft`}</span>
                      <span className="text-amber-400">{isMetric ? `${Math.round(segWeight * 0.453592)}kg` : `${Math.round(segWeight)}lb`}</span>
                    </div>
                  </div>
                );
              })}

              {/* Bit Face / TD Indicator */}
              <div className="flex flex-col items-center shrink-0 pl-1 border-l border-slate-700">
                <span className="text-[9px] font-mono text-emerald-400">WELL TD</span>
                <span className="text-[10px] font-mono text-slate-300 font-bold">BIT FACE</span>
                <div className="w-4 h-4 bg-emerald-600/40 border border-emerald-400/60 rounded-r my-1" />
                <span className="text-[9px] text-slate-500">Target</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Component Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Defined Downhole Components ({segments.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Top #1 couples to CT string; Last component is at hole bottom
          </span>
        </div>

        {segments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-3">
            <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs">No downhole tools configured. Coiled tubing properties are modeled directly down to well TD.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadPreset('motor_milling')}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Load Standard Motor & Bit Assembly
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((seg, idx) => {
              const segLinWeight = seg.linearWeightLbFt && seg.linearWeightLbFt > 0
                ? seg.linearWeightLbFt
                : calculateSegmentLinearWeight(seg.outerDiameterIn, seg.innerDiameterIn);
              const segTotalWeightLbs = seg.lengthFt * segLinWeight;

              return (
                <div
                  key={seg.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 transition-all hover:border-slate-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Index & Type */}
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <select
                        value={seg.type}
                        onChange={(e) => {
                          const newType = e.target.value as BhaToolType;
                          const def = TOOL_TYPE_DEFAULTS[newType];
                          handleUpdateSegment(seg.id, {
                            type: newType,
                            color: def.color,
                            name: def.name,
                          });
                        }}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:border-cyan-500 focus:outline-none"
                      >
                        {Object.entries(TOOL_TYPE_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={seg.name}
                        onChange={(e) => handleUpdateSegment(seg.id, { name: e.target.value })}
                        placeholder="Tool Name"
                        className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Length */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 shrink-0">L:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={isMetric ? Number(ftToM(seg.lengthFt).toFixed(2)) : seg.lengthFt}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.1;
                            handleUpdateSegment(seg.id, {
                              lengthFt: isMetric ? mToFt(val) : val,
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded px-2 py-1.5 focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{isMetric ? 'm' : 'ft'}</span>
                      </div>
                    </div>

                    {/* OD */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 shrink-0">OD:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.5"
                          value={isMetric ? Number(inToMm(seg.outerDiameterIn).toFixed(1)) : seg.outerDiameterIn}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            handleUpdateSegment(seg.id, {
                              outerDiameterIn: isMetric ? mmToIn(val) : val,
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs rounded px-2 py-1.5 focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{isMetric ? 'mm' : 'in'}</span>
                      </div>
                    </div>

                    {/* Weight & Action Buttons */}
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-amber-300">
                          {isMetric ? `${Math.round(segTotalWeightLbs * 0.453592)} kg` : `${Math.round(segTotalWeightLbs)} lbs`}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {isMetric ? `${(segLinWeight * 1.48816).toFixed(1)} kg/m` : `${segLinWeight.toFixed(1)} lb/ft`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveSegment(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Closer to CT (Up)"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSegment(idx, 'down')}
                          disabled={idx === segments.length - 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Closer to Bit (Down)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSegment(idx)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Duplicate Component"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSegment(seg.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                          title="Remove Tool"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-time Force Calculation Impact Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-amber-950/40 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Automatic Force Calculations Integration</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                SYNC ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              The {isMetric ? `${ftToM(totalBhaLengthFt).toFixed(1)} m` : `${totalBhaLengthFt.toFixed(1)} ft`} BHA and {isMetric ? `${Math.round(totalBhaAirWeightLbs * 0.453592).toLocaleString()} kg` : `${Math.round(totalBhaAirWeightLbs).toLocaleString()} lbs`} tool weight are automatically incorporated into wellbore forces, surface hookloads, normal contact drag, and Dawson-Paslay helical buckling calculations.
            </p>
          </div>
        </div>

        {onNavigateToForces && (
          <button
            type="button"
            onClick={onNavigateToForces}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-end sm:self-auto shrink-0 shadow-sm cursor-pointer"
          >
            <span>View in Wellbore Forces Tab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
