import React, { useState, useMemo } from 'react';
import {
  FluidSpecification,
  FLUIDS_LIBRARY,
  FluidCategory,
  FluidFilterCriteria,
  DEFAULT_FLUID_FILTERS,
  filterFluids,
  CorrosivityLevel
} from '../data/fluidsLibrary';
import { UnitSystem } from '../types/coiledTubing';
import { ppgToSg, sgToPpg } from '../utils/engineeringCalculations';
import {
  Search,
  Filter,
  X,
  Droplets,
  Check,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  List,
  AlertTriangle,
  Beaker,
  Thermometer,
  Gauge,
  BookOpen
} from 'lucide-react';
import {
  BhaElastomerType,
  BHA_ELASTOMER_SPECS,
  BHA_ELASTOMERS_LIST,
  getFluidElastomerCompatibility
} from '../data/elastomerCompatibility';
import { ElastomerCompatibilityBadge } from './ElastomerCompatibilityBadge';
import { BhaElastomerGuideModal } from './BhaElastomerGuideModal';

interface FluidLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFluidId: string;
  onSelectFluid: (fluid: FluidSpecification) => void;
  unitSystem: UnitSystem;
}

const CATEGORIES: { id: string; label: string; count: number }[] = [
  { id: 'All', label: 'All Fluids', count: FLUIDS_LIBRARY.length },
  { id: 'Brines & Clear Fluids', label: 'Brines & Clear', count: FLUIDS_LIBRARY.filter(f => f.category === 'Brines & Clear Fluids').length },
  { id: 'Slickwater & FR', label: 'Slickwater & FR', count: FLUIDS_LIBRARY.filter(f => f.category === 'Slickwater & FR').length },
  { id: 'Gels & Cleanout Fluids', label: 'Gels & Cleanout', count: FLUIDS_LIBRARY.filter(f => f.category === 'Gels & Cleanout Fluids').length },
  { id: 'Acids & Stimulation', label: 'Acids & Stimulation', count: FLUIDS_LIBRARY.filter(f => f.category === 'Acids & Stimulation').length },
  { id: 'Muds & Kill Fluids', label: 'Muds & Kill', count: FLUIDS_LIBRARY.filter(f => f.category === 'Muds & Kill Fluids').length },
  { id: 'Energized & Solvents', label: 'Energized / Foam', count: FLUIDS_LIBRARY.filter(f => f.category === 'Energized & Solvents').length },
];

export const FluidLibraryModal: React.FC<FluidLibraryModalProps> = ({
  isOpen,
  onClose,
  selectedFluidId,
  onSelectFluid,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const [filters, setFilters] = useState<FluidFilterCriteria>(DEFAULT_FLUID_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [showElastomerGuide, setShowElastomerGuide] = useState<boolean>(false);

  // Custom density input states in active unit
  const [customDensMinInput, setCustomDensMinInput] = useState<string>('');
  const [customDensMaxInput, setCustomDensMaxInput] = useState<string>('');

  // Custom viscosity input states
  const [customViscMinInput, setCustomViscMinInput] = useState<string>('');
  const [customViscMaxInput, setCustomViscMaxInput] = useState<string>('');

  const filteredFluids = useMemo(() => {
    return filterFluids(FLUIDS_LIBRARY, filters, isMetric);
  }, [filters, isMetric]);

  if (!isOpen) return null;

  const countActiveFilters = (): number => {
    let count = 0;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.category !== 'All') count++;
    if (filters.densityFilter !== 'all') count++;
    if (filters.viscosityFilter !== 'all') count++;
    if (filters.corrosivity !== 'all') count++;
    if (filters.h2sCompatibleOnly) count++;
    if (filters.frictionReducedOnly) count++;
    if (filters.solidsType !== 'all') count++;
    if (filters.elastomerFilter !== 'all') count++;
    return count;
  };

  const activeFilterCount = countActiveFilters();

  const handleResetFilters = () => {
    setFilters(DEFAULT_FLUID_FILTERS);
    setCustomDensMinInput('');
    setCustomDensMaxInput('');
    setCustomViscMinInput('');
    setCustomViscMaxInput('');
  };

  const handleDensityFilterChange = (type: FluidFilterCriteria['densityFilter']) => {
    if (type === 'custom') {
      setFilters({ ...filters, densityFilter: 'custom' });
    } else {
      setFilters({
        ...filters,
        densityFilter: type,
        densityMinPpg: undefined,
        densityMaxPpg: undefined,
      });
      setCustomDensMinInput('');
      setCustomDensMaxInput('');
    }
  };

  const handleCustomDensitySubmit = () => {
    const minVal = parseFloat(customDensMinInput);
    const maxVal = parseFloat(customDensMaxInput);
    const minPpg = isNaN(minVal) ? undefined : (isMetric ? sgToPpg(minVal) : minVal);
    const maxPpg = isNaN(maxVal) ? undefined : (isMetric ? sgToPpg(maxVal) : maxVal);

    setFilters({
      ...filters,
      densityFilter: 'custom',
      densityMinPpg: minPpg,
      densityMaxPpg: maxPpg,
    });
  };

  const handleViscosityFilterChange = (type: FluidFilterCriteria['viscosityFilter']) => {
    if (type === 'custom') {
      setFilters({ ...filters, viscosityFilter: 'custom' });
    } else {
      setFilters({
        ...filters,
        viscosityFilter: type,
        viscosityMinCp: undefined,
        viscosityMaxCp: undefined,
      });
      setCustomViscMinInput('');
      setCustomViscMaxInput('');
    }
  };

  const handleCustomViscositySubmit = () => {
    const minVal = parseFloat(customViscMinInput);
    const maxVal = parseFloat(customViscMaxInput);
    setFilters({
      ...filters,
      viscosityFilter: 'custom',
      viscosityMinCp: isNaN(minVal) ? undefined : minVal,
      viscosityMaxCp: isNaN(maxVal) ? undefined : maxVal,
    });
  };

  const getCorrosivityBadge = (level: CorrosivityLevel) => {
    switch (level) {
      case 'Non-corrosive':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">Non-Corrosive</span>;
      case 'Mild':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950 text-blue-300 border border-blue-800">Mild</span>;
      case 'Moderate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950 text-amber-400 border border-amber-800">Moderate</span>;
      case 'Severe / Acidic':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Acidic</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Coiled Tubing Fluid Selection Library
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {FLUIDS_LIBRARY.length} Standard CT Fluids
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Search and filter fluids by density, viscosity ranges, or specific chemical properties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Table Matrix View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Pills Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 space-y-3">
          {/* Top Search Row */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search by fluid name, chemistry (KCl, HCl, PAM, Formate...), or application (milling, cleanout...)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, searchQuery: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle & Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                  showAdvancedFilters || activeFilterCount > 0
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Sort Selector */}
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FluidFilterCriteria['sortBy'] })}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="density_asc">Sort: Density (Low → High)</option>
                <option value="density_desc">Sort: Density (High → Low)</option>
                <option value="viscosity_asc">Sort: Viscosity (Low → High)</option>
                <option value="viscosity_desc">Sort: Viscosity (High → Low)</option>
                <option value="fr_desc">Sort: Drag Reduction % (FR)</option>
                <option value="name">Sort: Name (A → Z)</option>
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-2 text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilters({ ...filters, category: cat.id })}
                className={`px-3 py-1 rounded-lg shrink-0 font-medium transition-all ${
                  filters.category === cat.id
                    ? 'bg-cyan-500 text-black font-semibold shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.label}
                <span className={`ml-1.5 text-[10px] opacity-75 font-mono ${filters.category === cat.id ? 'text-black' : 'text-slate-400'}`}>
                  ({cat.count})
                </span>
              </button>
            ))}
          </div>

          {/* BHA Elastomer Chemical Compatibility Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="uppercase tracking-wider">BHA Seal Filter:</span>
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
                    onClick={() => setFilters({ ...filters, elastomerFilter: el.id as any })}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      filters.elastomerFilter === el.id
                        ? 'bg-cyan-500 text-black font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {el.label}
                  </button>
                ))}
              </div>

              {filters.elastomerFilter !== 'all' && (
                <label className="flex items-center gap-1.5 ml-1 cursor-pointer select-none text-slate-300 hover:text-white text-[11px] bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  <input
                    type="checkbox"
                    checked={filters.elastomerSafeOnly}
                    onChange={(e) => setFilters({ ...filters, elastomerSafeOnly: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Safe Only (Hide Hazards)</span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowElastomerGuide(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 border border-cyan-800 hover:border-cyan-600 transition-colors shrink-0"
              title="Open BHA Elastomer Seal Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>BHA Seal Guide</span>
            </button>
          </div>

          {/* Advanced Filter Drawer */}
          {showAdvancedFilters && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Density Range Filter */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Density Range {isMetric ? '(SG)' : '(ppg)'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'light', label: isMetric ? '< 1.03' : '< 8.6' },
                      { id: 'medium', label: isMetric ? '1.03-1.26' : '8.6-10.5' },
                      { id: 'heavy', label: isMetric ? '> 1.26' : '> 10.5' },
                      { id: 'custom', label: 'Custom' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleDensityFilterChange(d.id as any)}
                        className={`px-2 py-1 rounded text-[11px] font-mono ${
                          filters.densityFilter === d.id
                            ? 'bg-cyan-500 text-black font-bold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {filters.densityFilter === 'custom' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min"
                        value={customDensMinInput}
                        onChange={(e) => setCustomDensMinInput(e.target.value)}
                        onBlur={handleCustomDensitySubmit}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max"
                        value={customDensMaxInput}
                        onChange={(e) => setCustomDensMaxInput(e.target.value)}
                        onBlur={handleCustomDensitySubmit}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCustomDensitySubmit}
                        className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[10px]"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Viscosity Range Filter */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Viscosity (cp)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'low', label: '< 5 cp' },
                      { id: 'medium', label: '5-30 cp' },
                      { id: 'high', label: '> 30 cp' },
                      { id: 'custom', label: 'Custom' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleViscosityFilterChange(v.id as any)}
                        className={`px-2 py-1 rounded text-[11px] font-mono ${
                          filters.viscosityFilter === v.id
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  {filters.viscosityFilter === 'custom' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        step="1"
                        placeholder="Min"
                        value={customViscMinInput}
                        onChange={(e) => setCustomViscMinInput(e.target.value)}
                        onBlur={handleCustomViscositySubmit}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        step="1"
                        placeholder="Max"
                        value={customViscMaxInput}
                        onChange={(e) => setCustomViscMaxInput(e.target.value)}
                        onBlur={handleCustomViscositySubmit}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCustomViscositySubmit}
                        className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[10px]"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Corrosivity & Solids */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Corrosivity & Solids
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={filters.corrosivity}
                      onChange={(e) => setFilters({ ...filters, corrosivity: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      <option value="all">Corrosivity: All Levels</option>
                      <option value="non_corrosive">Non-corrosive Only</option>
                      <option value="mild_moderate">Mild to Moderate</option>
                      <option value="acidic">Acidic / Severe Only</option>
                    </select>

                    <select
                      value={filters.solidsType}
                      onChange={(e) => setFilters({ ...filters, solidsType: e.target.value as any })}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                    >
                      <option value="all">Solids: All Fluids</option>
                      <option value="clear_only">Clear / Solids-Free</option>
                      <option value="solids_only">Muds & Weighted Solids</option>
                    </select>
                  </div>
                </div>

                {/* 4. Chemical Property Toggles */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Chemical Attributes
                  </span>
                  <div className="space-y-1.5 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={filters.h2sCompatibleOnly}
                        onChange={(e) => setFilters({ ...filters, h2sCompatibleOnly: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        H₂S Sour Service Safe
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={filters.frictionReducedOnly}
                        onChange={(e) => setFilters({ ...filters, frictionReducedOnly: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        Friction Reducer (FR &gt; 0%)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Active Filters Pill Bar */}
              {activeFilterCount > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">Active Filters:</span>

                  {filters.searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Query: "{filters.searchQuery}"
                      <button type="button" onClick={() => setFilters({ ...filters, searchQuery: '' })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.category !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                      {filters.category}
                      <button type="button" onClick={() => setFilters({ ...filters, category: 'All' })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.densityFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      Density: {filters.densityFilter}
                      <button type="button" onClick={() => handleDensityFilterChange('all')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.viscosityFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      Viscosity: {filters.viscosityFilter}
                      <button type="button" onClick={() => handleViscosityFilterChange('all')}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.corrosivity !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                      {filters.corrosivity}
                      <button type="button" onClick={() => setFilters({ ...filters, corrosivity: 'all' })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.h2sCompatibleOnly && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      H₂S Sour Safe
                      <button type="button" onClick={() => setFilters({ ...filters, h2sCompatibleOnly: false })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.frictionReducedOnly && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      FR Active
                      <button type="button" onClick={() => setFilters({ ...filters, frictionReducedOnly: false })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.solidsType !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                      {filters.solidsType === 'clear_only' ? 'Clear Only' : 'Solids/Muds'}
                      <button type="button" onClick={() => setFilters({ ...filters, solidsType: 'all' })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filters.elastomerFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-medium">
                      Seal: {BHA_ELASTOMER_SPECS[filters.elastomerFilter]?.shortName || filters.elastomerFilter}
                      {filters.elastomerSafeOnly && ' (Safe Only)'}
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, elastomerFilter: 'all', elastomerSafeOnly: false })}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count Bar */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-mono">{filteredFluids.length}</strong> of {FLUIDS_LIBRARY.length} fluids
            </span>
            {filteredFluids.length === 0 && (
              <span className="text-rose-400 font-medium">
                (No fluids match current filters. Click "Reset" to clear.)
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            Selected: <span className="text-cyan-400">{FLUIDS_LIBRARY.find(f => f.id === selectedFluidId)?.shortName || selectedFluidId}</span>
          </div>
        </div>

        {/* Fluid Items View */}
        <div className="p-5 overflow-y-auto max-h-[58vh]">
          {filteredFluids.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Beaker className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Fluids Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No coiled tubing fluids matched your search keywords and filter criteria. Try clearing some filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold rounded-lg text-xs"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFluids.map((fluid) => {
                const isCurrent = fluid.id === selectedFluidId;
                const densityVal = isMetric ? fluid.densitySg.toFixed(3) : fluid.densityPpg.toFixed(2);
                const densityUnit = isMetric ? 'SG' : 'ppg';
                const elastomerCompat = getFluidElastomerCompatibility(fluid);
                const selectedElastomerDetail = filters.elastomerFilter !== 'all' ? elastomerCompat[filters.elastomerFilter] : null;

                let cardBorderClasses = 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90';
                if (isCurrent) {
                  cardBorderClasses = 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50';
                } else if (selectedElastomerDetail) {
                  if (selectedElastomerDetail.rating === 'compatible') {
                    cardBorderClasses = 'bg-emerald-950/15 border-emerald-500/70 shadow-sm shadow-emerald-500/10 hover:border-emerald-400';
                  } else if (selectedElastomerDetail.rating === 'caution') {
                    cardBorderClasses = 'bg-amber-950/15 border-amber-500/70 hover:border-amber-400';
                  } else if (selectedElastomerDetail.rating === 'incompatible') {
                    cardBorderClasses = 'bg-rose-950/20 border-rose-800/80 opacity-80 hover:opacity-100 hover:border-rose-700';
                  }
                }

                return (
                  <div
                    key={fluid.id}
                    className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${cardBorderClasses}`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-800">
                          {fluid.category}
                        </span>
                        <div className="flex items-center gap-1">
                          {getCorrosivityBadge(fluid.corrosivity)}
                        </div>
                      </div>

                      {/* Fluid Name */}
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {fluid.name}
                      </h4>
                      <div className="text-[11px] font-mono text-cyan-400 font-semibold mt-0.5">
                        {fluid.chemicalBase}
                      </div>

                      {/* Core Properties Badge Row */}
                      <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Density</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {densityVal} <span className="text-[11px] font-normal text-slate-400">{densityUnit}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ({isMetric ? `${fluid.densityPpg.toFixed(1)} ppg` : `${fluid.densitySg.toFixed(2)} SG`})
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">Viscosity</span>
                          <span className="text-sm font-bold font-mono text-amber-300">
                            {fluid.viscosityCp.toFixed(1)} <span className="text-[11px] font-normal text-slate-400">cp</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            pH: {fluid.phRange}
                          </span>
                        </div>
                      </div>

                      {/* Chemical Compatibility with BHA Seals */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                        {filters.elastomerFilter !== 'all' ? (
                          <ElastomerCompatibilityBadge
                            fluid={fluid}
                            targetElastomer={filters.elastomerFilter}
                            variant="banner"
                            onClickGuide={() => setShowElastomerGuide(true)}
                          />
                        ) : (
                          <ElastomerCompatibilityBadge
                            fluid={fluid}
                            targetElastomer="all"
                            variant="compact"
                            onClickGuide={() => setShowElastomerGuide(true)}
                          />
                        )}
                      </div>

                      {/* Additional Attributes Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {fluid.frictionReductionPercent > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-mono text-emerald-300 font-semibold">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            {fluid.frictionReductionPercent}% Drag Reduction
                          </span>
                        )}

                        {fluid.h2sCompatible && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-[10px] text-blue-300">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            H₂S Safe
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                          {fluid.solidsType}
                        </span>
                      </div>

                      {/* Description & Applications */}
                      <p className="text-[11px] text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                        {fluid.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {fluid.commonApplications.slice(0, 3).map((app, aidx) => (
                          <span
                            key={aidx}
                            className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-800 font-sans"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                      {isCurrent ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-mono">
                          <Check className="w-4 h-4" />
                          <span>Active in Model</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          Max Temp: {fluid.maxTemperatureF}°F
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectFluid(fluid);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-sm'
                        }`}
                      >
                        {isCurrent ? 'Selected' : 'Select Fluid'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table Matrix View */
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Fluid Name & Chemistry</th>
                    <th className="py-2.5 px-2.5">Category</th>
                    <th className="py-2.5 px-2.5 text-right">Density ({isMetric ? 'SG' : 'ppg'})</th>
                    <th className="py-2.5 px-2.5 text-right">Viscosity (cp)</th>
                    <th className="py-2.5 px-2.5">pH</th>
                    <th className="py-2.5 px-2.5">Corrosivity</th>
                    <th className="py-2.5 px-2.5 text-center">Drag Red. (FR)</th>
                    <th className="py-2.5 px-2.5 text-center">BHA Seal Safety</th>
                    <th className="py-2.5 px-2.5 text-center">H₂S Safe</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFluids.map((fluid) => {
                    const isCurrent = fluid.id === selectedFluidId;
                    const densityVal = isMetric ? fluid.densitySg.toFixed(3) : fluid.densityPpg.toFixed(2);

                    return (
                      <tr
                        key={fluid.id}
                        className={`transition-colors hover:bg-slate-900/60 ${
                          isCurrent ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-sans font-bold text-white text-xs">{fluid.name}</div>
                          <div className="text-[11px] text-cyan-400 font-mono">{fluid.chemicalBase}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-300 font-sans text-[11px]">
                          {fluid.category}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-white">
                          {densityVal}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-amber-300">
                          {fluid.viscosityCp.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-300 text-[11px]">
                          {fluid.phRange}
                        </td>
                        <td className="py-2.5 px-2.5">
                          {getCorrosivityBadge(fluid.corrosivity)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {fluid.frictionReductionPercent > 0 ? (
                            <span className="font-semibold text-emerald-400 font-mono">
                              {fluid.frictionReductionPercent}%
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <ElastomerCompatibilityBadge
                            fluid={fluid}
                            targetElastomer={filters.elastomerFilter}
                            variant="table"
                            onClickGuide={() => setShowElastomerGuide(true)}
                          />
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {fluid.h2sCompatible ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-rose-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFluid(fluid);
                              onClose();
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isCurrent
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                            }`}
                          >
                            {isCurrent ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Beaker className="w-4 h-4 text-cyan-400" />
            <span>
              Selecting a fluid dynamically recalculates circulating pressure, frictional Reynolds numbers, and cuttings lifting velocity.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Close Library
          </button>
        </div>
      </div>

      {/* BHA Elastomer Compatibility Engineering Guide Modal */}
      <BhaElastomerGuideModal
        isOpen={showElastomerGuide}
        onClose={() => setShowElastomerGuide(false)}
        selectedElastomer={filters.elastomerFilter}
        onSelectElastomer={(el) => setFilters({ ...filters, elastomerFilter: el })}
      />
    </div>
  );
};
