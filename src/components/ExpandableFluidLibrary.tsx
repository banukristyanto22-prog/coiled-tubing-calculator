import React, { useState, useMemo, useEffect } from 'react';
import { CoiledTubingString, UnitSystem, HydraulicsInput } from '../types/coiledTubing';
import {
  CustomFluidComposition,
  BaseFluidCategory,
  WaterBaseType,
  OilBaseType,
  PolymerType,
  WeightingAgentType,
  WATER_BASE_PROPERTIES,
  OIL_BASE_PROPERTIES,
  calculateFluidCompositionProperties,
  loadCustomFluidsFromStorage,
  saveCustomFluidsToStorage,
  DEFAULT_CUSTOM_COMPOSITIONS,
} from '../types/customFluid';
import { calculateHydraulics, ppgToSg, sgToPpg, gpmToLpm, psiToBar } from '../utils/engineeringCalculations';
import { EngineeringTooltip } from './EngineeringTooltip';
import {
  Beaker,
  ChevronDown,
  ChevronUp,
  Plus,
  Zap,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Search,
  SlidersHorizontal,
  Check,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  AlertTriangle,
  Info,
  Droplets,
  Flame,
  Gauge,
  Activity,
  Layers,
  FlaskConical,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import {
  BhaElastomerType,
  BHA_ELASTOMER_SPECS,
  BHA_ELASTOMERS_LIST,
  getFluidElastomerCompatibility,
  isFluidCompatibleWithElastomer
} from '../data/elastomerCompatibility';
import { ElastomerCompatibilityBadge } from './ElastomerCompatibilityBadge';
import { BhaElastomerGuideModal } from './BhaElastomerGuideModal';

interface ExpandableFluidLibraryProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  currentHydraulics: HydraulicsInput;
  onLoadFluidIntoCalculations: (fluid: CustomFluidComposition) => void;
  activeFluidId: string;
  defaultExpanded?: boolean;
}

export const ExpandableFluidLibrary: React.FC<ExpandableFluidLibraryProps> = ({
  ct,
  unitSystem,
  currentHydraulics,
  onLoadFluidIntoCalculations,
  activeFluidId,
  defaultExpanded = true,
}) => {
  const isMetric = unitSystem === 'metric';

  // State
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [fluids, setFluids] = useState<CustomFluidComposition[]>(() => loadCustomFluidsFromStorage());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedElastomerFilter, setSelectedElastomerFilter] = useState<BhaElastomerType | 'all'>('all');
  const [elastomerSafeOnly, setElastomerSafeOnly] = useState<boolean>(false);
  const [isElastomerGuideOpen, setIsElastomerGuideOpen] = useState<boolean>(false);
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [editingFluidId, setEditingFluidId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for creating/editing a composition
  const [formName, setFormName] = useState<string>('');
  const [formShortName, setFormShortName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<BaseFluidCategory>('water_base');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('Field Engineer');

  // Base Blend
  const [formWaterPct, setFormWaterPct] = useState<number>(100);
  const [formWaterType, setFormWaterType] = useState<WaterBaseType>('fresh_water');
  const [formOilPct, setFormOilPct] = useState<number>(0);
  const [formOilType, setFormOilType] = useState<OilBaseType>('none');

  // Polymer System
  const [formPolymerType, setFormPolymerType] = useState<PolymerType>('none');
  const [formPolymerConc, setFormPolymerConc] = useState<number>(0);
  const [formPolymerUnit, setFormPolymerUnit] = useState<'lb/1000gal' | 'gpt' | 'lb/bbl'>('lb/1000gal');

  // Additives & Solids
  const [formWeightingAgent, setFormWeightingAgent] = useState<WeightingAgentType>('none');
  const [formWeightingAdd, setFormWeightingAdd] = useState<number>(0);
  const [formCorrosionInhibitor, setFormCorrosionInhibitor] = useState<boolean>(true);
  const [formH2sScavenger, setFormH2sScavenger] = useState<boolean>(true);
  const [formSurfactantPct, setFormSurfactantPct] = useState<number>(0.5);

  // Manual override toggle if user has laboratory rheometer numbers
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualDensityPpg, setManualDensityPpg] = useState<number>(8.34);
  const [manualViscosityCp, setManualViscosityCp] = useState<number>(1.0);
  const [manualFrPercent, setManualFrPercent] = useState<number>(0);

  // Synchronize localStorage whenever fluids change
  useEffect(() => {
    saveCustomFluidsToStorage(fluids);
  }, [fluids]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Dynamically compute live properties as user adjusts inputs in composer
  const liveComputedProperties = useMemo(() => {
    return calculateFluidCompositionProperties({
      id: 'temp_calc',
      name: formName || 'Custom Fluid',
      shortName: formShortName || 'Custom',
      category: formCategory,
      description: formDescription,
      author: formAuthor,
      createdAt: '',
      updatedAt: '',
      waterFractionPct: formWaterPct,
      waterBaseType: formWaterType,
      oilFractionPct: formOilPct,
      oilBaseType: formOilType,
      polymerType: formPolymerType,
      polymerConcentration: formPolymerConc,
      polymerUnit: formPolymerUnit,
      weightingAgent: formWeightingAgent,
      weightingConcentrationPpgAdd: formWeightingAdd,
      corrosionInhibitor: formCorrosionInhibitor,
      h2sScavenger: formH2sScavenger,
      surfactantPct: formSurfactantPct,
    });
  }, [
    formName,
    formShortName,
    formCategory,
    formDescription,
    formAuthor,
    formWaterPct,
    formWaterType,
    formOilPct,
    formOilType,
    formPolymerType,
    formPolymerConc,
    formPolymerUnit,
    formWeightingAgent,
    formWeightingAdd,
    formCorrosionInhibitor,
    formH2sScavenger,
    formSurfactantPct,
  ]);

  // Actual values to be used (either computed or manual overrides)
  const effectiveDensityPpg = isManualOverride ? manualDensityPpg : liveComputedProperties.densityPpg;
  const effectiveDensitySg = Number(ppgToSg(effectiveDensityPpg).toFixed(3));
  const effectiveViscosityCp = isManualOverride ? manualViscosityCp : liveComputedProperties.viscosityCp;
  const effectiveFrPercent = isManualOverride ? manualFrPercent : liveComputedProperties.frictionReductionPercent;

  // Live circulation impact prediction for the composer
  const simulatedCirculation = useMemo(() => {
    const tempHydraulics: HydraulicsInput = {
      ...currentHydraulics,
      fluidDensityPpg: effectiveDensityPpg,
      fluidViscosityCp: effectiveViscosityCp,
      frictionReductionPercent: effectiveFrPercent,
    };
    return calculateHydraulics(ct, tempHydraulics);
  }, [ct, currentHydraulics, effectiveDensityPpg, effectiveViscosityCp, effectiveFrPercent]);

  // Handle water/oil balance
  const handleWaterPctChange = (newWater: number) => {
    const w = Math.max(0, Math.min(100, newWater));
    setFormWaterPct(w);
    setFormOilPct(100 - w);
    if (100 - w === 0) {
      setFormOilType('none');
    } else if (formOilType === 'none') {
      setFormOilType('mineral_oil');
    }
  };

  const handleOilPctChange = (newOil: number) => {
    const o = Math.max(0, Math.min(100, newOil));
    setFormOilPct(o);
    setFormWaterPct(100 - o);
    if (o > 0 && formOilType === 'none') {
      setFormOilType('mineral_oil');
    } else if (o === 0) {
      setFormOilType('none');
    }
  };

  // Open Composer in New Mode
  const handleOpenNewComposer = () => {
    setEditingFluidId(null);
    setFormName('');
    setFormShortName('');
    setFormCategory('water_base');
    setFormDescription('');
    setFormAuthor('Field Engineer');
    setFormWaterPct(100);
    setFormWaterType('fresh_water');
    setFormOilPct(0);
    setFormOilType('none');
    setFormPolymerType('none');
    setFormPolymerConc(0);
    setFormPolymerUnit('lb/1000gal');
    setFormWeightingAgent('none');
    setFormWeightingAdd(0);
    setFormCorrosionInhibitor(true);
    setFormH2sScavenger(true);
    setFormSurfactantPct(0.5);
    setIsManualOverride(false);
    setIsComposerOpen(true);
  };

  // Open Composer in Edit Mode
  const handleEditFluid = (fluid: CustomFluidComposition) => {
    setEditingFluidId(fluid.id);
    setFormName(fluid.name);
    setFormShortName(fluid.shortName);
    setFormCategory(fluid.category);
    setFormDescription(fluid.description);
    setFormAuthor(fluid.author || 'Field Engineer');
    setFormWaterPct(fluid.waterFractionPct);
    setFormWaterType(fluid.waterBaseType);
    setFormOilPct(fluid.oilFractionPct);
    setFormOilType(fluid.oilBaseType);
    setFormPolymerType(fluid.polymerType);
    setFormPolymerConc(fluid.polymerConcentration);
    setFormPolymerUnit(fluid.polymerUnit || 'lb/1000gal');
    setFormWeightingAgent(fluid.weightingAgent || 'none');
    setFormWeightingAdd(fluid.weightingConcentrationPpgAdd || 0);
    setFormCorrosionInhibitor(fluid.corrosionInhibitor);
    setFormH2sScavenger(fluid.h2sScavenger);
    setFormSurfactantPct(fluid.surfactantPct || 0);
    setIsManualOverride(false);
    setManualDensityPpg(fluid.densityPpg);
    setManualViscosityCp(fluid.viscosityCp);
    setManualFrPercent(fluid.frictionReductionPercent);
    setIsComposerOpen(true);
  };

  // Duplicate / Clone
  const handleDuplicateFluid = (fluid: CustomFluidComposition) => {
    const clone: CustomFluidComposition = {
      ...fluid,
      id: `custom_${Date.now()}`,
      name: `${fluid.name} (Copy)`,
      shortName: `${fluid.shortName} (Copy)`,
      isPreset: false,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    const next = [clone, ...fluids];
    setFluids(next);
    triggerToast(`Duplicated "${fluid.shortName}".`);
  };

  // Delete
  const handleDeleteFluid = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from your custom fluid library?`)) {
      const next = fluids.filter((f) => f.id !== id);
      setFluids(next);
      triggerToast(`Removed "${name}" from library.`);
    }
  };

  // Save Fluid (either new or edited)
  const handleSaveFluid = (andLoadImmediately: boolean = false) => {
    if (!formName.trim()) {
      alert('Please enter a fluid composition name.');
      return;
    }

    const targetId = editingFluidId || `custom_fluid_${Date.now()}`;
    const nowStr = new Date().toISOString().slice(0, 10);

    const savedComposition: CustomFluidComposition = {
      id: targetId,
      name: formName.trim(),
      shortName: formShortName.trim() || formName.trim().slice(0, 24),
      category: formCategory,
      description: formDescription.trim() || 'Custom formulation specified in Coiled Matrix Hydraulics.',
      author: formAuthor.trim() || 'Field Engineer',
      createdAt: editingFluidId ? (fluids.find((f) => f.id === editingFluidId)?.createdAt || nowStr) : nowStr,
      updatedAt: nowStr,
      isPreset: false,
      waterFractionPct: formWaterPct,
      waterBaseType: formWaterType,
      oilFractionPct: formOilPct,
      oilBaseType: formOilType,
      polymerType: formPolymerType,
      polymerConcentration: formPolymerConc,
      polymerUnit: formPolymerUnit,
      weightingAgent: formWeightingAgent,
      weightingConcentrationPpgAdd: formWeightingAdd,
      corrosionInhibitor: formCorrosionInhibitor,
      h2sScavenger: formH2sScavenger,
      surfactantPct: formSurfactantPct,
      densityPpg: effectiveDensityPpg,
      densitySg: effectiveDensitySg,
      viscosityCp: effectiveViscosityCp,
      frictionReductionPercent: effectiveFrPercent,
      corrosivity: liveComputedProperties.corrosivity,
      h2sCompatible: liveComputedProperties.h2sCompatible,
      solidsType: liveComputedProperties.solidsType,
      maxTemperatureF: liveComputedProperties.maxTemperatureF,
      phRange: liveComputedProperties.phRange,
      chemicalBase: liveComputedProperties.chemicalBase,
      commonApplications: liveComputedProperties.commonApplications,
    };

    let nextFluids: CustomFluidComposition[];
    if (editingFluidId) {
      nextFluids = fluids.map((f) => (f.id === editingFluidId ? savedComposition : f));
    } else {
      nextFluids = [savedComposition, ...fluids];
    }

    setFluids(nextFluids);
    setIsComposerOpen(false);
    setEditingFluidId(null);

    if (andLoadImmediately) {
      onLoadFluidIntoCalculations(savedComposition);
      triggerToast(`Saved and loaded "${savedComposition.shortName}" into circulation calculations!`);
    } else {
      triggerToast(`Saved composition "${savedComposition.shortName}" to library.`);
    }
  };

  // Reset to Factory Presets
  const handleResetToPresets = () => {
    if (confirm('Reset custom fluid properties library to original pre-configured engineering presets? Any custom additions will be restored.')) {
      setFluids(DEFAULT_CUSTOM_COMPOSITIONS);
      saveCustomFluidsToStorage(DEFAULT_CUSTOM_COMPOSITIONS);
      triggerToast('Reset library to default engineering fluid blends.');
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fluids, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `CoiledMatrix_Custom_Fluids_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    triggerToast('Custom fluid compositions exported to JSON.');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFluids(parsed);
          triggerToast(`Successfully imported ${parsed.length} fluid compositions.`);
        } else {
          alert('Invalid fluid compositions JSON format.');
        }
      } catch (err) {
        alert('Failed to parse uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered fluids list
  const filteredFluids = useMemo(() => {
    return fluids.filter((fluid) => {
      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'oil_base' && fluid.category !== 'oil_base') return false;
        if (selectedCategory === 'water_base' && fluid.category !== 'water_base') return false;
        if (selectedCategory === 'polymer_gel' && fluid.category !== 'polymer_gel') return false;
      }

      // BHA Elastomer Compatibility filter
      if (selectedElastomerFilter !== 'all') {
        // If safe-only is enabled, exclude incompatible and caution ratings
        if (elastomerSafeOnly) {
          if (!isFluidCompatibleWithElastomer(fluid, selectedElastomerFilter, true)) {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = fluid.name.toLowerCase().includes(q);
        const matchShort = fluid.shortName.toLowerCase().includes(q);
        const matchChem = fluid.chemicalBase.toLowerCase().includes(q);
        const matchDesc = fluid.description.toLowerCase().includes(q);
        const matchPolymer = fluid.polymerType.toLowerCase().includes(q);
        const matchElastomer = selectedElastomerFilter !== 'all' && (
          BHA_ELASTOMER_SPECS[selectedElastomerFilter]?.name.toLowerCase().includes(q) ||
          BHA_ELASTOMER_SPECS[selectedElastomerFilter]?.shortName.toLowerCase().includes(q)
        );
        if (!matchName && !matchShort && !matchChem && !matchDesc && !matchPolymer && !matchElastomer) {
          return false;
        }
      }

      return true;
    });
  }, [fluids, selectedCategory, searchQuery, selectedElastomerFilter, elastomerSafeOnly]);

  // Currently active custom fluid (if activeFluidId matches any custom)
  const activeCustomFluid = useMemo(() => {
    return fluids.find((f) => f.id === activeFluidId);
  }, [fluids, activeFluidId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs ml-3"
          >
            &times;
          </button>
        </div>
      )}

      {/* Accordion Header / Expandable Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fluid Properties Library &amp; Custom Compositions
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {fluids.length} Saved
              </span>
              {activeCustomFluid && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Active: {activeCustomFluid.shortName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Formulate, save, and load tailored fluid systems (Base Oil, Water/Brine, Polymers, and Friction Reducers) directly into circulation calculations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isComposerOpen && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                handleOpenNewComposer();
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Formulate a new custom fluid composition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Composition</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs border border-slate-700/50"
            title={isExpanded ? 'Collapse Library' : 'Expand Library'}
          >
            <span className="text-[11px] text-slate-300 font-medium px-1">
              {isExpanded ? 'Collapse' : 'Expand Library'}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* COMPOSER FORM (Drawer/Card) */}
          {isComposerOpen && (
            <div className="bg-slate-950 rounded-xl border border-cyan-500/40 p-5 space-y-5 shadow-lg relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {editingFluidId ? 'Edit Custom Fluid Composition' : 'Formulate Custom Fluid Composition'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
              </div>

              {/* 1. Basic Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Fluid Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 80/20 Mineral Base Oil with 20 lb Polymer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Short Tag / ID
                  </label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    placeholder="e.g. 80/20 Min OBM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Operational Description &amp; Chemical Purpose
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Low-toxicity mineral oil emulsion for water-sensitive shale wash..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                    Primary Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as BaseFluidCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="water_base">Water &amp; Brines</option>
                    <option value="oil_base">Base Oil Systems</option>
                    <option value="polymer_gel">Polymer Gels &amp; Sweeps</option>
                    <option value="hybrid_emulsion">Hybrid Emulsions</option>
                  </select>
                </div>
              </div>

              {/* 2. Base Blend: Water vs. Base Oil Fractions */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    Base Liquid Formulation (Water vs. Base Oil Ratio)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ratio: {formWaterPct}% Water / {formOilPct}% Base Oil
                  </span>
                </div>

                {/* Ratio Balance Visual Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-semibold">Water Phase: {formWaterPct}%</span>
                    <span className="text-amber-400 font-semibold">Base Oil Phase: {formOilPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formWaterPct}
                    onChange={(e) => handleWaterPctChange(parseInt(e.target.value) || 0)}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-amber-950/60 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Water Component Type */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <label className="text-[11px] text-cyan-400 font-semibold block mb-1">
                      Water / Brine Type ({formWaterPct}% vol)
                    </label>
                    <select
                      value={formWaterType}
                      onChange={(e) => setFormWaterType(e.target.value as WaterBaseType)}
                      disabled={formWaterPct === 0}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                    >
                      <option value="fresh_water">Fresh Water (8.34 ppg / 1.00 SG, 1.0 cp)</option>
                      <option value="kcl_2_pct">2% KCl Clay Stabilizer (8.45 ppg / 1.01 SG, 1.05 cp)</option>
                      <option value="kcl_4_pct">4% KCl Inhibitive Brine (8.55 ppg / 1.03 SG, 1.10 cp)</option>
                      <option value="sea_water">Filtered Seawater (8.55 ppg / 1.03 SG, 1.15 cp)</option>
                      <option value="nacl_brine">9.5 ppg NaCl Saturated Brine (9.50 ppg / 1.14 SG, 1.35 cp)</option>
                      <option value="cacl2_brine">11.2 ppg Calcium Chloride Brine (11.2 ppg / 1.34 SG, 2.1 cp)</option>
                      <option value="heavy_cabr2">14.2 ppg CaBr2 Clear Brine (14.2 ppg / 1.70 SG, 4.8 cp)</option>
                    </select>
                  </div>

                  {/* Base Oil Component Type */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <label className="text-[11px] text-amber-400 font-semibold block mb-1">
                      Base Oil Type ({formOilPct}% vol)
                    </label>
                    <select
                      value={formOilType}
                      onChange={(e) => setFormOilType(e.target.value as OilBaseType)}
                      disabled={formOilPct === 0}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-none disabled:opacity-40"
                    >
                      <option value="none">None (0% Oil - Aqueous Only)</option>
                      <option value="mineral_oil">Low-Tox Mineral Base Oil (6.95 ppg / 0.83 SG, 4.2 cp)</option>
                      <option value="diesel_no2">Refined Diesel #2 (7.10 ppg / 0.85 SG, 3.0 cp)</option>
                      <option value="synthetic_ester">Synthetic Ester / PAO (6.75 ppg / 0.81 SG, 5.2 cp)</option>
                      <option value="condensate">Light Hydrocarbon Condensate (6.30 ppg / 0.76 SG, 1.2 cp)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Polymer Rheology & Viscosifiers */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Polymer Rheology &amp; Drag Reduction System
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    FR: {effectiveFrPercent}% Drag Reduction
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Polymer / Viscosifier Type
                    </label>
                    <select
                      value={formPolymerType}
                      onChange={(e) => {
                        const pt = e.target.value as PolymerType;
                        setFormPolymerType(pt);
                        if (pt === 'friction_reducer_paa') {
                          setFormPolymerUnit('gpt');
                          setFormPolymerConc(1.5);
                        } else if (pt === 'pac_polymer') {
                          setFormPolymerUnit('lb/bbl');
                          setFormPolymerConc(2.0);
                        } else if (pt !== 'none') {
                          setFormPolymerUnit('lb/1000gal');
                          setFormPolymerConc(25);
                        } else {
                          setFormPolymerConc(0);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="none">None (Neat Base Liquid)</option>
                      <option value="friction_reducer_paa">Anionic Polyacrylamide FR (0.5 - 3.0 gpt)</option>
                      <option value="guar_gum">Linear Guar Gum (20 - 50 lb/1000gal)</option>
                      <option value="hec_cellulose">HEC Hydroxyethyl Cellulose (15 - 45 lb/1000gal)</option>
                      <option value="xanthan_gum">Xanthan Shear-Thinning Biopolymer (10 - 35 lb/1000gal)</option>
                      <option value="pac_polymer">PAC Polyanionic Cellulose (1 - 5 lb/bbl)</option>
                      <option value="crosslinked_borate">Borate Crosslinked Guar (25 - 60 lb/1000gal)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400">Concentration</label>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {formPolymerConc} {formPolymerUnit}
                      </span>
                    </div>
                    <input
                      type="number"
                      step={formPolymerUnit === 'gpt' ? '0.1' : '1'}
                      min="0"
                      max={formPolymerUnit === 'gpt' ? '10' : '100'}
                      value={formPolymerConc}
                      onChange={(e) => setFormPolymerConc(parseFloat(e.target.value) || 0)}
                      disabled={formPolymerType === 'none'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Polymer Unit</label>
                    <select
                      value={formPolymerUnit}
                      onChange={(e) => setFormPolymerUnit(e.target.value as any)}
                      disabled={formPolymerType === 'none'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                    >
                      <option value="lb/1000gal">lb / 1,000 gal</option>
                      <option value="gpt">gpt (gal / 1,000 gal)</option>
                      <option value="lb/bbl">lb / bbl</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Weighting & Chemical Modifiers */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Weighting Solids &amp; Chemical Inhibitors
                </span>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Weighting Solids</label>
                    <select
                      value={formWeightingAgent}
                      onChange={(e) => setFormWeightingAgent(e.target.value as WeightingAgentType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="none">None (Clear Liquid)</option>
                      <option value="calcium_carbonate">Calcium Carbonate (Acid Soluble)</option>
                      <option value="barite">Barite (BaSO4 High Density)</option>
                      <option value="dissolved_salts">Dissolved Formate / Bromide</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Weighting Addition (+ppg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formWeightingAdd}
                      onChange={(e) => setFormWeightingAdd(parseFloat(e.target.value) || 0)}
                      disabled={formWeightingAgent === 'none'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none pb-2">
                      <input
                        type="checkbox"
                        checked={formCorrosionInhibitor}
                        onChange={(e) => setFormCorrosionInhibitor(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Corrosion Inhibitor</span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none pb-2">
                      <input
                        type="checkbox"
                        checked={formH2sScavenger}
                        onChange={(e) => setFormH2sScavenger(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>H₂S Scavenger Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 5. Live Computed Output Gauges & Simulation Preview */}
              <div className="p-4 bg-slate-900 rounded-xl border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Composition Properties &amp; Hydraulics Impact Preview
                    </span>
                  </div>

                  {/* Manual Lab Calibration Toggle */}
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isManualOverride}
                      onChange={(e) => {
                        setIsManualOverride(e.target.checked);
                        if (e.target.checked) {
                          setManualDensityPpg(liveComputedProperties.densityPpg);
                          setManualViscosityCp(liveComputedProperties.viscosityCp);
                          setManualFrPercent(liveComputedProperties.frictionReductionPercent);
                        }
                      }}
                      className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Manual Lab Override (Fann 35)</span>
                  </label>
                </div>

                {/* Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Calculated Density</span>
                    {isManualOverride ? (
                      <input
                        type="number"
                        step="0.05"
                        value={manualDensityPpg}
                        onChange={(e) => setManualDensityPpg(parseFloat(e.target.value) || 8.34)}
                        className="w-full bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 text-cyan-300 font-mono text-sm font-bold"
                      />
                    ) : (
                      <div className="font-mono text-cyan-400 font-bold text-base">
                        {isMetric ? `${effectiveDensitySg.toFixed(2)} SG` : `${effectiveDensityPpg.toFixed(2)} ppg`}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      {isMetric ? `${effectiveDensityPpg.toFixed(2)} ppg` : `${effectiveDensitySg.toFixed(3)} SG`}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Viscosity</span>
                    {isManualOverride ? (
                      <input
                        type="number"
                        step="0.5"
                        value={manualViscosityCp}
                        onChange={(e) => setManualViscosityCp(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 text-amber-300 font-mono text-sm font-bold"
                      />
                    ) : (
                      <div className="font-mono text-amber-400 font-bold text-base">
                        {effectiveViscosityCp.toFixed(1)} cp
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      {(effectiveViscosityCp / 1.0).toFixed(1)}&times; water baseline
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Friction Reduction</span>
                    {isManualOverride ? (
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="75"
                        value={manualFrPercent}
                        onChange={(e) => setManualFrPercent(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 text-emerald-300 font-mono text-sm font-bold"
                      />
                    ) : (
                      <div className="font-mono text-emerald-400 font-bold text-base">
                        {effectiveFrPercent}% FR
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      Toms effect drag reduction
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Predicted Circulating P</span>
                    <div className="font-mono text-purple-400 font-bold text-base">
                      {isMetric
                        ? `${Math.round(simulatedCirculation.totalCirculatingPressureBar)} bar`
                        : `${Math.round(simulatedCirculation.totalCirculatingPressurePsi).toLocaleString()} psi`}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      HHP: {Math.round(simulatedCirculation.hydraulicHorsepowerHhp)} hp @ {currentHydraulics.flowRateGpm} gpm
                    </span>
                  </div>
                </div>

                {/* Live BHA Elastomer Compatibility Preview */}
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Predicted BHA Tool Seal Compatibility</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsElastomerGuideOpen(true)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline decoration-cyan-500/50"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Seal Guide</span>
                    </button>
                  </div>
                  <ElastomerCompatibilityBadge
                    fluid={liveComputedProperties}
                    targetElastomer="all"
                    variant="badge"
                    onClickGuide={() => setIsElastomerGuideOpen(true)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFluid(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Save to Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFluid(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>Save &amp; Load into Calculations</span>
                </button>
              </div>
            </div>
          )}

          {/* FILTER & CONTROLS TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto text-xs">
              {[
                { id: 'All', label: 'All Custom' },
                { id: 'water_base', label: 'Water & Brines' },
                { id: 'oil_base', label: 'Base Oil Systems' },
                { id: 'polymer_gel', label: 'Polymer Gels' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-md transition-colors font-medium whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
              <div className="relative flex-grow sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search custom fluid compositions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Reset to Presets */}
              <button
                type="button"
                onClick={handleResetToPresets}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
                title="Reset library to default engineering templates"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportJson}
                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
                title="Export Custom Compositions to JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Import JSON */}
              <label
                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                title="Import Custom Compositions from JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* BHA Elastomer Chemical Compatibility Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="uppercase tracking-wider">BHA Tool Seal Compatibility:</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                {[
                  { id: 'all', label: 'All Seals' },
                  { id: 'nbr', label: 'NBR' },
                  { id: 'hnbr', label: 'HNBR' },
                  { id: 'fkm', label: 'FKM (Viton)' },
                  { id: 'ffkm', label: 'FFKM' },
                  { id: 'aflas', label: 'Aflas' },
                ].map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedElastomerFilter(el.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      selectedElastomerFilter === el.id
                        ? 'bg-cyan-500 text-black font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {el.label}
                  </button>
                ))}
              </div>

              {selectedElastomerFilter !== 'all' && (
                <label className="flex items-center gap-1.5 ml-1 cursor-pointer select-none text-slate-300 hover:text-white text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    checked={elastomerSafeOnly}
                    onChange={(e) => setElastomerSafeOnly(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Safe Only (Hide Hazards)</span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsElastomerGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 border border-cyan-800 hover:border-cyan-600 transition-colors shrink-0"
              title="Open BHA Elastomer Compatibility Reference Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>BHA Seal Guide</span>
            </button>
          </div>

          {/* GRID OF SAVED CUSTOM FLUIDS */}
          {filteredFluids.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-3">
              <Beaker className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">
                No custom fluid compositions found matching your query.
              </p>
              <button
                type="button"
                onClick={handleOpenNewComposer}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Composition</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFluids.map((fluid) => {
                const isActive = activeFluidId === fluid.id;
                const elastomerCompat = getFluidElastomerCompatibility(fluid);
                const selectedElastomerDetail = selectedElastomerFilter !== 'all' ? elastomerCompat[selectedElastomerFilter] : null;

                let cardClasses = 'bg-slate-950/80 border-slate-800 hover:border-slate-700';
                if (isActive) {
                  cardClasses = 'bg-slate-900/90 border-emerald-500 shadow-md shadow-emerald-950/30';
                } else if (selectedElastomerDetail) {
                  if (selectedElastomerDetail.rating === 'compatible') {
                    cardClasses = 'bg-emerald-950/15 border-emerald-500/70 shadow-sm shadow-emerald-500/10 hover:border-emerald-400';
                  } else if (selectedElastomerDetail.rating === 'caution') {
                    cardClasses = 'bg-amber-950/15 border-amber-500/70 hover:border-amber-400';
                  } else if (selectedElastomerDetail.rating === 'incompatible') {
                    cardClasses = 'bg-rose-950/20 border-rose-800/80 opacity-80 hover:opacity-100 hover:border-rose-700';
                  }
                }

                // Predict circulating pressure for this specific fluid
                const fluidHydraulics: HydraulicsInput = {
                  ...currentHydraulics,
                  fluidDensityPpg: fluid.densityPpg,
                  fluidViscosityCp: fluid.viscosityCp,
                  frictionReductionPercent: fluid.frictionReductionPercent,
                };
                const predCirc = calculateHydraulics(ct, fluidHydraulics);

                return (
                  <div
                    key={fluid.id}
                    className={`rounded-xl border transition-all p-4 flex flex-col justify-between space-y-3 relative ${cardClasses}`}
                  >
                    {/* Active Ribbon */}
                    {isActive && (
                      <div className="absolute -top-2.5 right-4 bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Active in Circulation</span>
                      </div>
                    )}

                    {/* Top Row: Title & Badges */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {fluid.name}
                          </h4>
                          <span className="text-[10px] font-mono text-cyan-400 block">
                            {fluid.chemicalBase}
                          </span>
                        </div>
                        {fluid.isPreset && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-900 text-slate-400 border border-slate-800">
                            Preset
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {fluid.description}
                      </p>

                      {/* Composition Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {fluid.oilFractionPct > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5 text-amber-400" />
                            {fluid.oilFractionPct}% Base Oil
                          </span>
                        )}

                        {fluid.waterFractionPct > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                            <Droplets className="w-2.5 h-2.5 text-cyan-400" />
                            {fluid.waterFractionPct}% Water
                          </span>
                        )}

                        {fluid.polymerType !== 'none' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-emerald-400" />
                            {fluid.polymerConcentration} {fluid.polymerUnit}
                          </span>
                        )}

                        {fluid.h2sCompatible && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                            H₂S Safe
                          </span>
                        )}
                      </div>

                      {/* BHA Elastomer Compatibility Status */}
                      <div className="pt-2 border-t border-slate-800/60">
                        {selectedElastomerFilter !== 'all' ? (
                          <ElastomerCompatibilityBadge
                            fluid={fluid}
                            targetElastomer={selectedElastomerFilter}
                            variant="banner"
                            onClickGuide={() => setIsElastomerGuideOpen(true)}
                          />
                        ) : (
                          <ElastomerCompatibilityBadge
                            fluid={fluid}
                            targetElastomer="all"
                            variant="compact"
                            onClickGuide={() => setIsElastomerGuideOpen(true)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Middle: Rheology & Hydraulics Impact Stat Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Density</span>
                        <span className="font-mono text-cyan-300 font-bold text-xs">
                          {isMetric ? `${fluid.densitySg.toFixed(2)} SG` : `${fluid.densityPpg.toFixed(2)} ppg`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Viscosity</span>
                        <span className="font-mono text-amber-300 font-bold text-xs">
                          {fluid.viscosityCp.toFixed(1)} cp
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Circ Press</span>
                        <span className="font-mono text-purple-300 font-bold text-xs">
                          {isMetric
                            ? `${Math.round(predCirc.totalCirculatingPressureBar)} bar`
                            : `${Math.round(predCirc.totalCirculatingPressurePsi).toLocaleString()} psi`}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                      {/* Secondary Actions (Edit, Duplicate, Delete) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditFluid(fluid)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
                          title="Edit fluid composition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateFluid(fluid)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                          title="Duplicate composition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {!fluid.isPreset && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFluid(fluid.id, fluid.name)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                            title="Delete composition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Primary Action: Load into Calculations */}
                      <button
                        type="button"
                        onClick={() => {
                          onLoadFluidIntoCalculations(fluid);
                          triggerToast(`Loaded "${fluid.shortName}" into circulation calculations!`);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                        title="Apply this custom fluid to the active coiled tubing hydraulics engine"
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Loaded</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-cyan-200" />
                            <span>Load into Calculations</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BHA Elastomer Compatibility Reference Guide Modal */}
      <BhaElastomerGuideModal
        isOpen={isElastomerGuideOpen}
        onClose={() => setIsElastomerGuideOpen(false)}
        selectedElastomer={selectedElastomerFilter}
        onSelectElastomer={(el) => setSelectedElastomerFilter(el)}
      />
    </div>
  );
};
