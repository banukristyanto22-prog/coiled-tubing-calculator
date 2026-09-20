import React, { useState } from 'react';
import { 
  BhaConfiguration, 
  BhaSegment, 
  BhaToolType, 
  CoiledTubingString, 
  UnitSystem 
} from '../types/coiledTubing';
import { 
  BHA_PRESETS, 
  TOOL_TYPE_DEFAULTS,
  calculateSegmentLinearWeight, 
  calculateSegmentMomentOfInertia, 
  computeBhaSummaryMetrics 
} from '../data/bhaPresets';
import { 
  inToMm, 
  mmToIn, 
  ftToM, 
  mToFt, 
  lbfToKn 
} from '../utils/engineeringCalculations';
import { 
  Layers, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  AlertTriangle, 
  Sliders, 
  Scale, 
  Wrench, 
  Zap, 
  Maximize2,
  Boxes,
  Eye
} from 'lucide-react';
import { BhaAssembly3DViewer } from './BhaAssembly3DViewer';
import { BhaRealistic2DSchematic } from './BhaRealistic2DSchematic';

interface BhaConfigurationBuilderProps {
  bhaConfig: BhaConfiguration;
  onChange: (config: BhaConfiguration) => void;
  ct: CoiledTubingString;
  casingInnerDiameterIn: number;
  fluidDensityPpg: number;
  wellboreInclinationDeg: number;
  unitSystem: UnitSystem;
}

export const BhaConfigurationBuilder: React.FC<BhaConfigurationBuilderProps> = ({
  bhaConfig,
  onChange,
  ct,
  casingInnerDiameterIn,
  fluidDensityPpg,
  wellboreInclinationDeg,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('custom');
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<'3d' | '2d' | 'both'>('3d');

  const metrics = computeBhaSummaryMetrics(
    bhaConfig.segments,
    ct,
    fluidDensityPpg,
    casingInnerDiameterIn,
    wellboreInclinationDeg
  );

  // Toggle enabled
  const handleToggleEnable = () => {
    onChange({
      ...bhaConfig,
      enabled: !bhaConfig.enabled,
    });
  };

  // Select Preset
  const handleSelectPreset = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const preset = BHA_PRESETS[presetKey];
    if (preset) {
      onChange({
        ...preset.config,
        enabled: true,
      });
    }
  };

  // Add Segment
  const handleAddSegment = (type: BhaToolType = 'custom') => {
    const defaults = TOOL_TYPE_DEFAULTS[type];
    const newSegment: BhaSegment = {
      id: `bha-seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: defaults.name,
      type,
      lengthFt: defaults.defaultLen,
      outerDiameterIn: defaults.defaultOd,
      innerDiameterIn: defaults.defaultId,
      color: defaults.color,
      description: `${defaults.name} downhole component`,
    };

    setSelectedPresetKey('custom');
    onChange({
      ...bhaConfig,
      segments: [...bhaConfig.segments, newSegment],
    });
  };

  // Update Segment
  const handleUpdateSegment = (id: string, updates: Partial<BhaSegment>) => {
    setSelectedPresetKey('custom');
    const updated = bhaConfig.segments.map((s) => (s.id === id ? { ...s, ...updates } : s));
    onChange({
      ...bhaConfig,
      segments: updated,
    });
  };

  // Remove Segment
  const handleRemoveSegment = (id: string) => {
    setSelectedPresetKey('custom');
    onChange({
      ...bhaConfig,
      segments: bhaConfig.segments.filter((s) => s.id !== id),
    });
  };

  // Reorder Segment
  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= bhaConfig.segments.length) return;
    const copy = [...bhaConfig.segments];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setSelectedPresetKey('custom');
    onChange({
      ...bhaConfig,
      segments: copy,
    });
  };

  // Duplicate Segment
  const handleDuplicateSegment = (index: number) => {
    const orig = bhaConfig.segments[index];
    const duplicated: BhaSegment = {
      ...orig,
      id: `bha-seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${orig.name} (Copy)`,
    };
    const copy = [...bhaConfig.segments];
    copy.splice(index + 1, 0, duplicated);
    setSelectedPresetKey('custom');
    onChange({
      ...bhaConfig,
      segments: copy,
    });
  };

  // Clearance check
  const maxBhaOd = metrics.maxOuterDiameterIn;
  const isOdExceedingCasing = maxBhaOd >= casingInnerDiameterIn;
  const isClearanceTight = !isOdExceedingCasing && (casingInnerDiameterIn - maxBhaOd) < 0.25;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Top Header & Enable Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                BHA (Bottom Hole Assembly) Builder
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                bhaConfig.enabled 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {bhaConfig.enabled ? 'ACTIVE IN WELLBORE MODEL' : 'MODELING DISABLED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Add length & outer diameter segments at the end of the string to account for added weight and stiffness
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleToggleEnable}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              bhaConfig.enabled
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{bhaConfig.enabled ? 'Enabled in Forces Engine' : 'Enable BHA Modeling'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Standard Industry BHA Presets:</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Click any preset to prefill realistic tool dimensions
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(BHA_PRESETS).map(([key, preset]) => {
            const isSelected = selectedPresetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-white shadow-sm ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/60 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
                title={preset.description}
              >
                <div className="text-[11px] font-semibold truncate text-cyan-300">{preset.name.split(' (')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.badge}</div>
                <div className="text-[9px] text-slate-500 mt-1 font-mono">{preset.config.segments.length} tools</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time BHA Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Length */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">BHA Length</div>
          <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
            {isMetric ? `${metrics.totalLengthM} m` : `${metrics.totalLengthFt} ft`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {bhaConfig.segments.length} segment{bhaConfig.segments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Air Weight */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Air Weight</div>
          <div className="text-base font-bold font-mono text-white mt-0.5">
            {isMetric ? `${(metrics.totalAirWeightKg ?? 0).toLocaleString()} kg` : `${(metrics.totalAirWeightLbs ?? 0).toLocaleString()} lbs`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Buoyed: {isMetric ? `${(metrics.totalBuoyedWeightKg ?? 0).toLocaleString()} kg` : `${(metrics.totalBuoyedWeightLbs ?? 0).toLocaleString()} lbs`}
          </div>
        </div>

        {/* Max Tool OD */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Max Outer Dia.</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            isOdExceedingCasing ? 'text-rose-400' : isClearanceTight ? 'text-amber-400' : 'text-emerald-300'
          }`}>
            {isMetric ? `${inToMm(metrics.maxOuterDiameterIn).toFixed(1)} mm` : `${metrics.maxOuterDiameterIn.toFixed(3)}"`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg: {isMetric ? `${inToMm(metrics.avgOuterDiameterIn).toFixed(1)} mm` : `${metrics.avgOuterDiameterIn.toFixed(3)}"`}
          </div>
        </div>

        {/* Bending Stiffness (EI) */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Stiffness (EI)</div>
          <div className="text-base font-bold font-mono text-purple-300 mt-0.5">
            {(metrics.effectiveStiffnessEi / 1e6).toFixed(1)}M
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-semibold text-emerald-400">
            +{Math.round((metrics.stiffnessRatioVsCt - 1) * 100)}% vs CT String
          </div>
        </div>

        {/* Stiffness Ratio */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Stiffness Boost</div>
          <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
            {metrics.stiffnessRatioVsCt.toFixed(1)}&times;
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Higher buckling load
          </div>
        </div>

        {/* Radial Clearance inside Casing */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Radial Clearance</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            isOdExceedingCasing ? 'text-rose-400' : isClearanceTight ? 'text-amber-400' : 'text-cyan-300'
          }`}>
            {isMetric ? `${inToMm(metrics.radialClearanceIn).toFixed(1)} mm` : `${metrics.radialClearanceIn.toFixed(3)}"`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Csg ID: {isMetric ? `${inToMm(casingInnerDiameterIn).toFixed(1)} mm` : `${casingInnerDiameterIn.toFixed(3)}"`}
          </div>
        </div>
      </div>

      {/* Casing Interference Warning if OD >= Casing ID */}
      {isOdExceedingCasing && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Geometric Interference Warning:</strong> Max BHA OD ({metrics.maxOuterDiameterIn.toFixed(3)} in) exceeds or equals Casing ID ({casingInnerDiameterIn.toFixed(3)} in). Downhole tool string will not pass through this casing.
          </span>
        </div>
      )}

      {isClearanceTight && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Tight Annular Clearance:</strong> Radial clearance is {metrics.radialClearanceIn.toFixed(3)} in. High risk of swab/surge pressures and mechanical sticking on washouts or scale bridges.
          </span>
        </div>
      )}

      {/* Visual Assembled BHA (3D CAD & 2D Schematic) */}
      <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 text-sm">
              Downhole Assembly Visualization
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              (Coiled Tubing &rarr; Toolstring &rarr; Bit / Nozzle)
            </span>
          </div>

          {/* Visualization Mode Pills: 3D CAD vs 2D Schematic vs Split */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setVisualizationMode('3d')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                visualizationMode === '3d'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive 3D WebGL CAD View with Orbit, Cutaway, and Exploded View"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>3D Assembly</span>
            </button>
            <button
              type="button"
              onClick={() => setVisualizationMode('2d')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                visualizationMode === '2d'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Proportional 2D Cross-Section SVG Schematic"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2D Schematic</span>
            </button>
            <button
              type="button"
              onClick={() => setVisualizationMode('both')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                visualizationMode === 'both'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View both 3D CAD and 2D Schematic simultaneously"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split (3D + 2D)</span>
            </button>
          </div>
        </div>

        {/* 3D WebGL Assembly CAD View */}
        {(visualizationMode === '3d' || visualizationMode === 'both') && (
          <div className="w-full">
            <BhaAssembly3DViewer
              bhaConfig={bhaConfig}
              ct={ct}
              casingInnerDiameterIn={casingInnerDiameterIn}
              fluidDensityPpg={fluidDensityPpg}
              unitSystem={unitSystem}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={(id) => setSelectedSegmentId(id)}
            />
          </div>
        )}

        {/* 2D Scaled Realistic Vector Schematic */}
        {(visualizationMode === '2d' || visualizationMode === 'both') && (
          <div className="space-y-2">
            {visualizationMode === 'both' && (
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 pt-1">
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>2D Realistic Engineering Schematic</span>
              </div>
            )}
            <BhaRealistic2DSchematic
              bhaConfig={bhaConfig}
              ct={ct}
              casingInnerDiameterIn={casingInnerDiameterIn}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={(id) => setSelectedSegmentId(id)}
              hoveredSegmentId={hoveredSegmentId}
              onHoverSegment={(id) => setHoveredSegmentId(id)}
              unitSystem={unitSystem}
            />
          </div>
        )}

        {/* Hovered or Selected Tool Detail Card */}
        {(hoveredSegmentId || selectedSegmentId) && (() => {
          const targetId = hoveredSegmentId || selectedSegmentId;
          const seg = bhaConfig.segments.find((s) => s.id === targetId);
          if (!seg) return null;
          const linW = seg.linearWeightLbFt || calculateSegmentLinearWeight(seg.outerDiameterIn, seg.innerDiameterIn);
          const segTotalW = linW * seg.lengthFt;
          const segI = calculateSegmentMomentOfInertia(seg.outerDiameterIn, seg.innerDiameterIn);
          const segEi = (ct.youngsModulusPsi || 29.5e6) * segI;

          return (
            <div className="p-2.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color || '#0ea5e9' }} />
                <span className="font-semibold text-white">{seg.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({seg.type})</span>
                {selectedSegmentId === seg.id && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                    Selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span>OD: <strong className="text-cyan-300">{seg.outerDiameterIn}&quot;</strong></span>
                <span>ID: <strong className="text-slate-200">{seg.innerDiameterIn}&quot;</strong></span>
                <span>Length: <strong className="text-cyan-300">{seg.lengthFt} ft</strong></span>
                <span>Weight: <strong className="text-amber-300">{Math.round(segTotalW)} lbs</strong></span>
                <span>Stiffness: <strong className="text-purple-300">{(segEi / 1e6).toFixed(1)}M psi&middot;in&sup4;</strong></span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Segment Management Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Toolstring Segments ({bhaConfig.segments.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Ordered from Top (CT connection) to Bottom (Bit/Tip)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddSegment('custom')}
              className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Segment</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Tool Name & Category</th>
                  <th className="py-2.5 px-3 w-28">Length {isMetric ? '(m)' : '(ft)'}</th>
                  <th className="py-2.5 px-3 w-28">Outer Dia. {isMetric ? '(mm)' : '(in)'}</th>
                  <th className="py-2.5 px-3 w-28">Inner Dia. {isMetric ? '(mm)' : '(in)'}</th>
                  <th className="py-2.5 px-3 w-28">Linear Wt {isMetric ? '(kg/m)' : '(lb/ft)'}</th>
                  <th className="py-2.5 px-3 w-28">Total Weight {isMetric ? '(kg)' : '(lbs)'}</th>
                  <th className="py-2.5 px-3 w-28">Stiffness (EI)</th>
                  <th className="py-2.5 px-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {bhaConfig.segments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                      No segments configured. Click &ldquo;Add Segment&rdquo; or choose a preset to begin.
                    </td>
                  </tr>
                ) : (
                  bhaConfig.segments.map((seg, idx) => {
                    const od = seg.outerDiameterIn;
                    const id = seg.innerDiameterIn;
                    const linWeight = seg.linearWeightLbFt || calculateSegmentLinearWeight(od, id);
                    const segWeightLbs = linWeight * seg.lengthFt;
                    const segInertia = calculateSegmentMomentOfInertia(od, id);
                    const segEi = (ct.youngsModulusPsi || 29.5e6) * segInertia;
                    const isOdConflict = od >= casingInnerDiameterIn;

                    return (
                      <tr 
                        key={seg.id}
                        onMouseEnter={() => setHoveredSegmentId(seg.id)}
                        onMouseLeave={() => setHoveredSegmentId(null)}
                        onClick={() => setSelectedSegmentId(selectedSegmentId === seg.id ? null : seg.id)}
                        className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                          selectedSegmentId === seg.id
                            ? 'bg-cyan-950/50 ring-1 ring-cyan-500/60'
                            : hoveredSegmentId === seg.id
                            ? 'bg-cyan-950/30'
                            : ''
                        }`}
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-850 border border-slate-700 text-xs font-bold text-cyan-300">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Name & Type */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={seg.name}
                              onChange={(e) => handleUpdateSegment(seg.id, { name: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-sans text-xs focus:border-cyan-500 focus:outline-none"
                              placeholder="Tool Description"
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={seg.type}
                                onChange={(e) => {
                                  const newType = e.target.value as BhaToolType;
                                  const def = TOOL_TYPE_DEFAULTS[newType];
                                  handleUpdateSegment(seg.id, {
                                    type: newType,
                                    color: def?.color || '#0ea5e9',
                                  });
                                }}
                                className="bg-slate-900 border border-slate-750 text-[10px] text-slate-400 rounded px-1.5 py-0.5 focus:border-cyan-500 focus:outline-none"
                              >
                                <option value="connector">Connector / Slip</option>
                                <option value="valve">Check Valve / Barrier</option>
                                <option value="jar">Hydraulic Jar</option>
                                <option value="motor">Mud Motor / PDM</option>
                                <option value="collar">Drill Collar / Sinker Bar</option>
                                <option value="agitator">Agitator / Oscillator</option>
                                <option value="tractor">Downhole Tractor</option>
                                <option value="logging">Logging / CCL Sub</option>
                                <option value="nozzle_bit">Nozzle / Milling Bit</option>
                                <option value="custom">Custom Tool</option>
                              </select>
                              <span 
                                className="w-2 h-2 rounded-full inline-block" 
                                style={{ backgroundColor: seg.color || '#0ea5e9' }} 
                              />
                            </div>
                          </div>
                        </td>

                        {/* Length */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={isMetric ? Number(ftToM(seg.lengthFt).toFixed(2)) : seg.lengthFt}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value) || 0.1;
                                const parsedFt = isMetric ? mToFt(raw) : raw;
                                handleUpdateSegment(seg.id, { lengthFt: Math.max(0.1, Number(parsedFt.toFixed(2))) });
                              }}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
                            />
                            <span className="text-[10px] text-slate-500">{isMetric ? 'm' : 'ft'}</span>
                          </div>
                        </td>

                        {/* Outer Diameter */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0.5"
                                step="0.125"
                                value={isMetric ? Number(inToMm(seg.outerDiameterIn).toFixed(1)) : seg.outerDiameterIn}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value) || 1.0;
                                  const parsedIn = isMetric ? mmToIn(raw) : raw;
                                  handleUpdateSegment(seg.id, { outerDiameterIn: Math.max(0.5, Number(parsedIn.toFixed(3))) });
                                }}
                                className={`w-20 bg-slate-900 border rounded px-2 py-1 text-xs focus:outline-none font-mono ${
                                  isOdConflict
                                    ? 'border-rose-500 text-rose-300'
                                    : 'border-slate-700 text-white focus:border-cyan-500'
                                }`}
                              />
                              <span className="text-[10px] text-slate-500">{isMetric ? 'mm' : 'in'}</span>
                            </div>
                            {isOdConflict && (
                              <div className="text-[9px] text-rose-400 flex items-center gap-1 font-sans">
                                &gt; Casing ID!
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Inner Diameter */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.125"
                              value={isMetric ? Number(inToMm(seg.innerDiameterIn).toFixed(1)) : seg.innerDiameterIn}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value) || 0;
                                const parsedIn = isMetric ? mmToIn(raw) : raw;
                                const safeIn = Math.min(seg.outerDiameterIn - 0.05, Math.max(0, parsedIn));
                                handleUpdateSegment(seg.id, { innerDiameterIn: Number(safeIn.toFixed(3)) });
                              }}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
                            />
                            <span className="text-[10px] text-slate-500">{isMetric ? 'mm' : 'in'}</span>
                          </div>
                        </td>

                        {/* Linear Weight */}
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px]">
                          {isMetric
                            ? `${(linWeight * 1.48816).toFixed(1)} kg/m`
                            : `${linWeight.toFixed(1)} lb/ft`}
                        </td>

                        {/* Total Segment Weight */}
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300 text-xs">
                          {isMetric
                            ? `${Math.round(segWeightLbs * 0.453592).toLocaleString()} kg`
                            : `${Math.round(segWeightLbs).toLocaleString()} lbs`}
                        </td>

                        {/* Bending Stiffness EI */}
                        <td className="py-2.5 px-3 font-mono text-purple-300 text-xs">
                          {(segEi / 1e6).toFixed(1)}M
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveSegment(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSegment(idx, 'down')}
                              disabled={idx === bhaConfig.segments.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateSegment(idx)}
                              className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                              title="Duplicate Segment"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSegment(seg.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Segment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Add Bar at bottom of table */}
          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px]">Quick Add Tool:</span>
              <button
                type="button"
                onClick={() => handleAddSegment('collar')}
                className="px-2 py-1 bg-slate-850 hover:bg-slate-750 border border-slate-700 rounded text-[10px] text-cyan-300 transition-colors"
              >
                + Drill Collar
              </button>
              <button
                type="button"
                onClick={() => handleAddSegment('motor')}
                className="px-2 py-1 bg-slate-850 hover:bg-slate-750 border border-slate-700 rounded text-[10px] text-cyan-300 transition-colors"
              >
                + Mud Motor
              </button>
              <button
                type="button"
                onClick={() => handleAddSegment('jar')}
                className="px-2 py-1 bg-slate-850 hover:bg-slate-750 border border-slate-700 rounded text-[10px] text-cyan-300 transition-colors"
              >
                + Hydraulic Jar
              </button>
              <button
                type="button"
                onClick={() => handleAddSegment('nozzle_bit')}
                className="px-2 py-1 bg-slate-850 hover:bg-slate-750 border border-slate-700 rounded text-[10px] text-cyan-300 transition-colors"
              >
                + Bit / Nozzle
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('cleanout')}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Cleanout Preset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Physics Guidance Box */}
      <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>How BHA Added Weight & Stiffness Affect Wellbore Forces & Buckling</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-400 leading-relaxed font-sans">
          <div className="bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
            <strong className="text-white block mb-1">1. Tensioner / Sinker Bar Effect</strong>
            In vertical and medium-inclination wellbores, the heavy BHA hangs at the end of the string, providing downward buoyant tension that keeps the lower coiled tubing in tension, directly counteracting compressive buckling.
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
            <strong className="text-white block mb-1">2. 4th Power Stiffness Boost ($EI \propto OD^4$)</strong>
            Because moment of inertia scales with $OD^4$, a 2.875&quot; or 3.125&quot; BHA is 3&times; to 12&times; stiffer than standard 1.75&quot; or 2.0&quot; coiled tubing. The BHA resists severe helical lockup, enabling higher Weight On Bit (WOB) during milling.
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
            <strong className="text-white block mb-1">3. Annular Radial Clearance (r)</strong>
            According to Dawson-Paslay (F_crit &prop; 1/&radic;r), smaller radial clearance between the larger BHA OD and casing inner wall increases the buckling load threshold, maintaining concentric alignment downhole.
          </div>
        </div>
      </div>
    </div>
  );
};
