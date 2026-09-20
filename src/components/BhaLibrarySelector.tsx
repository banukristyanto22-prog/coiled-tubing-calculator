import React, { useState, useMemo } from 'react';
import { 
  BhaConfiguration, 
  CoiledTubingString, 
  UnitSystem 
} from '../types/coiledTubing';
import { 
  BHA_LIBRARY_ITEMS, 
  BhaLibraryItemMetadata, 
  computeBhaSummaryMetrics 
} from '../data/bhaPresets';
import { 
  ftToM, 
  inToMm, 
  lbfToKn 
} from '../utils/engineeringCalculations';
import { 
  Wrench, 
  Sliders, 
  Layers, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Info, 
  ArrowRight, 
  ShieldCheck, 
  Power, 
  TrendingDown, 
  Scale, 
  Zap, 
  RotateCcw,
  Activity,
  Maximize2
} from 'lucide-react';

interface BhaLibrarySelectorProps {
  bhaConfig?: BhaConfiguration;
  onSelectBha: (config: BhaConfiguration, metadata?: BhaLibraryItemMetadata) => void;
  onToggleBhaEnabled: (enabled: boolean) => void;
  onOpenBhaBuilder?: () => void;
  onOpenDragCalculator?: () => void;
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  casingInnerDiameterIn: number;
  fluidDensityPpg: number;
  wellboreInclinationDeg: number;
}

export const BhaLibrarySelector: React.FC<BhaLibrarySelectorProps> = ({
  bhaConfig,
  onSelectBha,
  onToggleBhaEnabled,
  onOpenBhaBuilder,
  onOpenDragCalculator,
  ct,
  unitSystem,
  casingInnerDiameterIn,
  fluidDensityPpg,
  wellboreInclinationDeg,
}) => {
  const isMetric = unitSystem === 'metric';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [inspectedPresetId, setInspectedPresetId] = useState<string | null>(null);

  // Compute metrics of current active BHA
  const activeMetrics = useMemo(() => {
    if (!bhaConfig || !bhaConfig.enabled || !bhaConfig.segments || bhaConfig.segments.length === 0) {
      return null;
    }
    return computeBhaSummaryMetrics(
      bhaConfig.segments,
      ct,
      fluidDensityPpg,
      casingInnerDiameterIn,
      wellboreInclinationDeg
    );
  }, [bhaConfig, ct, fluidDensityPpg, casingInnerDiameterIn, wellboreInclinationDeg]);

  // Determine active preset ID by checking configuration name match
  const activePresetId = useMemo(() => {
    if (!bhaConfig || !bhaConfig.enabled) return null;
    const match = BHA_LIBRARY_ITEMS.find((item) => item.config.name === bhaConfig.name);
    return match ? match.id : 'custom';
  }, [bhaConfig]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return BHA_LIBRARY_ITEMS;
    return BHA_LIBRARY_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const categories = [
    { id: 'all', label: 'All Assemblies', count: BHA_LIBRARY_ITEMS.length },
    { id: 'cleanout', label: 'Cleanout & Vacuum', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'cleanout').length },
    { id: 'milling', label: 'Milling Motors', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'milling').length },
    { id: 'extended_reach', label: 'Heavy Collars', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'extended_reach').length },
    { id: 'intervention', label: 'Stimulation & Setting', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'intervention').length },
    { id: 'logging', label: 'Logging & Tractor', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'logging').length },
    { id: 'contingency', label: 'Fishing & Jars', count: BHA_LIBRARY_ITEMS.filter(i => i.category === 'contingency').length },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* 1. Header Bar: Title, Active Status, Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                BHA Configuration Library &amp; Toolstring Selector
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                API RP 5C7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select standard industry bottom hole assemblies to automatically simulate toolstring weight, drag forces, and buckling limits.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Enable / Bypass BHA Toggle */}
          <button
            type="button"
            onClick={() => onToggleBhaEnabled(!bhaConfig?.enabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
              bhaConfig?.enabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
            title={bhaConfig?.enabled ? "Click to bypass BHA and simulate bare coiled tubing string" : "Click to activate BHA simulation"}
          >
            <Power className={`w-3.5 h-3.5 ${bhaConfig?.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>{bhaConfig?.enabled ? 'BHA: ACTIVE' : 'BHA: BYPASS (Bare CT)'}</span>
          </button>

          {/* Open 3D Builder */}
          {onOpenBhaBuilder && (
            <button
              type="button"
              onClick={onOpenBhaBuilder}
              className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Open full 3D BHA Assembly &amp; Segment Builder"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Customize 3D</span>
            </button>
          )}

          {/* Open Drag Calculator */}
          {onOpenDragCalculator && (
            <button
              type="button"
              onClick={onOpenDragCalculator}
              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="View downhole axial contact drag calculations"
            >
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Drag Forces</span>
            </button>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
            aria-label={isExpanded ? 'Collapse BHA Library' : 'Expand BHA Library'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Active Assembly Status Strip */}
      {bhaConfig?.enabled && activeMetrics ? (
        <div className="p-3 bg-slate-950/80 rounded-lg border border-cyan-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Applied Toolstring:</span>
                <span className="font-bold text-white font-mono">
                  {bhaConfig.name}
                </span>
                {activePresetId && activePresetId !== 'custom' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Preset
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{bhaConfig.segments.length} components</span>
                <span>•</span>
                <span>Length: <strong className="text-cyan-300 font-mono">{isMetric ? `${activeMetrics.totalLengthM} m` : `${activeMetrics.totalLengthFt} ft`}</strong></span>
                <span>•</span>
                <span>Buoyed Weight: <strong className="text-amber-300 font-mono">{isMetric ? `${(activeMetrics.totalBuoyedWeightKg ?? 0).toLocaleString()} kg` : `${(activeMetrics.totalBuoyedWeightLbs ?? 0).toLocaleString()} lbs`}</strong></span>
                <span>•</span>
                <span>Stiffness: <strong className="text-purple-300 font-mono">{activeMetrics.stiffnessRatioVsCt.toFixed(1)}&times; CT</strong></span>
                <span>•</span>
                <span>Max OD: <strong className="text-slate-200 font-mono">{isMetric ? `${inToMm(activeMetrics.maxOuterDiameterIn).toFixed(1)} mm` : `${activeMetrics.maxOuterDiameterIn.toFixed(3)}"`}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => onToggleBhaEnabled(false)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Simulate Bare CT</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-950/60 rounded-lg border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300">
              <strong className="text-amber-300">Bare Coiled Tubing Active:</strong> Coiled tubing mechanical properties are currently modeled uniformly to TD with no additional BHA weight or stiffness. Choose an industry assembly below to include realistic toolstring mechanics.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleBhaEnabled(true)}
            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded text-xs font-semibold whitespace-nowrap transition-all"
          >
            Activate BHA
          </button>
        </div>
      )}

      {/* 3. Expandable Presets Browser */}
      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id ? 'bg-cyan-700/80 text-cyan-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const isSelected = activePresetId === item.id;
              const isInspecting = inspectedPresetId === item.id;

              // Calculate quick preview metrics for this specific preset
              const presetMetrics = computeBhaSummaryMetrics(
                item.config.segments,
                ct,
                fluidDensityPpg,
                casingInnerDiameterIn,
                wellboreInclinationDeg
              );

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all relative ${
                    isSelected
                      ? 'bg-slate-950 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  {/* Top: Header, Badge, Selection Status */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded font-semibold border mb-1.5 ${item.colorTheme.bg} ${item.colorTheme.border} ${item.colorTheme.text}`}>
                          {item.badge}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {item.name}
                        </h4>
                      </div>

                      {isSelected && (
                        <div className="shrink-0 p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Operational Summary */}
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.operationalApplication}
                    </p>

                    {/* Visual Toolstring Segment Representation */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{item.config.segments.length} tools</span>
                        <span>{isMetric ? `${presetMetrics.totalLengthM} m` : `${presetMetrics.totalLengthFt} ft`}</span>
                      </div>
                      <div className="flex h-2.5 w-full rounded overflow-hidden bg-slate-900 border border-slate-800 gap-0.5 p-0.5">
                        {item.config.segments.map((seg, idx) => (
                          <div
                            key={seg.id || idx}
                            className="h-full rounded-sm transition-all relative group/seg"
                            style={{
                              flexGrow: Math.max(1, Math.round(seg.lengthFt)),
                              backgroundColor: seg.color || '#38bdf8',
                            }}
                            title={`${seg.name} (${seg.lengthFt} ft, ${seg.outerDiameterIn}" OD)`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Key Engineering Specifications */}
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Buoyed Wt:</span>
                        <span className="font-bold text-amber-300">
                          {isMetric
                            ? `${(presetMetrics.totalBuoyedWeightKg ?? 0).toLocaleString()} kg`
                            : `${(presetMetrics.totalBuoyedWeightLbs ?? 0).toLocaleString()} lbs`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Stiffness:</span>
                        <span className="font-bold text-purple-300">
                          {presetMetrics.stiffnessRatioVsCt.toFixed(1)}&times; CT
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Max OD:</span>
                        <span className="font-bold text-slate-200">
                          {isMetric
                            ? `${inToMm(presetMetrics.maxOuterDiameterIn).toFixed(1)} mm`
                            : `${presetMetrics.maxOuterDiameterIn.toFixed(3)}"`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Buckling:</span>
                        <span className="font-bold text-cyan-300">
                          {isMetric
                            ? `${Math.round(lbfToKn(presetMetrics.bhaSinusoidalBucklingLbf))} kN`
                            : `${Math.round(presetMetrics.bhaSinusoidalBucklingLbf).toLocaleString()} lbf`}
                        </span>
                      </div>
                    </div>

                    {/* Mechanical Forces Impact Note */}
                    <div className="p-2 rounded bg-slate-900/50 border border-slate-800/50 text-[10.5px] text-slate-400">
                      <strong className="text-slate-300 block text-[10px] uppercase tracking-wider mb-0.5">Forces Impact:</strong>
                      {item.forcesImpactSummary}
                    </div>

                    {/* Inspected Bill of Tools (Expanded on toggle) */}
                    {isInspecting && (
                      <div className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] space-y-1.5 animate-fadeIn">
                        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>Assembly Bill of Tools:</span>
                          <span className="font-mono text-cyan-400">{item.config.segments.length} elements</span>
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {item.config.segments.map((seg, sIdx) => (
                            <div key={seg.id || sIdx} className="flex items-center justify-between py-0.5 border-b border-slate-800/50">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color || '#38bdf8' }} />
                                <span className="truncate text-slate-300">{seg.name}</span>
                              </div>
                              <span className="font-mono text-slate-400 shrink-0 ml-2">
                                {seg.lengthFt}ft &bull; {seg.outerDiameterIn}&quot;
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedPresetId(isInspecting ? null : item.id)}
                      className="px-2 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 transition-all"
                      title="Inspect full toolstring components list"
                    >
                      {isInspecting ? 'Hide Tools' : 'View Tools'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectBha(item.config, item)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        isSelected
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-200'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:shadow-cyan-900/30'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Active in Run</span>
                        </>
                      ) : (
                        <>
                          <span>Apply to Simulation</span>
                          <ArrowRight className="w-3 h-3 opacity-70" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
