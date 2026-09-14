import React, { useState, useMemo } from 'react';
import { CoiledTubingString, UnitSystem, CalculationHistoryEntry, CalculationTabSource } from '../types/coiledTubing';
import {
  createCalculationHistoryEntry,
  inToMm,
  psiToBar,
  psiToMpa,
  lbfToKn,
} from '../utils/engineeringCalculations';
import { SideBySideComparisonModal } from './SideBySideComparisonModal';
import { HistorySparkline } from './HistorySparkline';
import {
  History,
  X,
  Bookmark,
  Star,
  Trash2,
  RotateCcw,
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Ruler,
  ShieldCheck,
  Droplets,
  Anchor,
  Flame,
  Disc,
  Sliders,
  Sparkles,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';

interface CalculationHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentString: CoiledTubingString;
  unitSystem: UnitSystem;
  activeTab: string;
  onLoadString: (ct: CoiledTubingString, targetTab?: string) => void;
  history: CalculationHistoryEntry[];
  onUpdateHistory: (updated: CalculationHistoryEntry[]) => void;
}

export const CalculationHistorySidebar: React.FC<CalculationHistorySidebarProps> = ({
  isOpen,
  onClose,
  currentString,
  unitSystem,
  activeTab,
  onLoadString,
  history,
  onUpdateHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false);
  const [filterSourceTab, setFilterSourceTab] = useState<string>('all');
  const [selectedIdsForCompare, setSelectedIdsForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparePair, setComparePair] = useState<[CalculationHistoryEntry, CalculationHistoryEntry] | null>(null);
  const [customSnapshotName, setCustomSnapshotName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [justRestoredId, setJustRestoredId] = useState<string | null>(null);

  const isMetric = unitSystem === 'metric';

  // Filter history entries
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filterBookmarkedOnly && !item.isBookmarked) return false;
      if (filterSourceTab !== 'all' && item.sourceTab !== filterSourceTab) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.stringSnapshot.name.toLowerCase().includes(q) ||
        item.stringSnapshot.materialGrade.toLowerCase().includes(q) ||
        item.sourceTab.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    });
  }, [history, filterBookmarkedOnly, filterSourceTab, searchQuery]);

  // Handle manual snapshot creation
  const handleTakeSnapshot = (title?: string) => {
    const source = (
      ['specs', 'envelope', 'hydraulics', 'forces', 'reel', 'fatigue', 'sensitivity'].includes(activeTab)
        ? activeTab
        : 'manual'
    ) as CalculationTabSource;

    const newEntry = createCalculationHistoryEntry(
      currentString,
      source,
      title?.trim() || `${currentString.name} (${currentString.outerDiameterIn}" × ${currentString.wallThicknessIn}")`
    );

    const updated = [newEntry, ...history];
    onUpdateHistory(updated);
    setIsAddingCustom(false);
    setCustomSnapshotName('');
  };

  // Toggle bookmark / star
  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.map((item) =>
      item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
    );
    onUpdateHistory(updated);
  };

  // Delete history entry
  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    onUpdateHistory(updated);
    setSelectedIdsForCompare((prev) => prev.filter((i) => i !== id));
  };

  // Clear all non-bookmarked history
  const handleClearHistory = () => {
    if (window.confirm('Clear all calculation history? (Bookmarked items will be preserved)')) {
      const preserved = history.filter((item) => item.isBookmarked);
      onUpdateHistory(preserved);
      setSelectedIdsForCompare([]);
    }
  };

  // Toggle selection for comparison
  const handleToggleSelectForCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIdsForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        // Keep the latest and replace the second
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // Launch comparison between 2 selected items
  const handleOpenCompareSelected = () => {
    if (selectedIdsForCompare.length !== 2) return;
    const entryA = history.find((h) => h.id === selectedIdsForCompare[0]);
    const entryB = history.find((h) => h.id === selectedIdsForCompare[1]);
    if (entryA && entryB) {
      setComparePair([entryA, entryB]);
      setIsCompareModalOpen(true);
    }
  };

  // Compare single history entry directly with current active string
  const handleCompareWithCurrent = (entry: CalculationHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentEntry = createCalculationHistoryEntry(
      currentString,
      'manual',
      `Active Workspace: ${currentString.name}`
    );
    setComparePair([entry, currentEntry]);
    setIsCompareModalOpen(true);
  };

  // Restore configuration
  const handleRestoreConfiguration = (entry: CalculationHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    onLoadString(entry.stringSnapshot, entry.sourceTab);
    setJustRestoredId(entry.id);
    setTimeout(() => {
      setJustRestoredId(null);
    }, 2000);
  };

  // Load standard pre-populated engineering benchmarks
  const handleLoadDemoBenchmarks = () => {
    const baselineCT90 = createCalculationHistoryEntry(
      currentString,
      'specs',
      'Benchmark A: Certified CT90 2.000" × 0.156"',
      'Baseline certified field string from Mill Test Report #B21035'
    );
    baselineCT90.isBookmarked = true;

    // Create a modified heavy wall variant
    const heavyWallString: CoiledTubingString = {
      ...JSON.parse(JSON.stringify(currentString)),
      name: 'High-Pressure Heavy Wall 2.000" CT100',
      wallThicknessIn: 0.175,
      yieldStrengthPsi: 100000,
      tensileStrengthPsi: 110000,
      materialGrade: 'CT100',
      strips: currentString.strips.map((s) => ({
        ...s,
        wallThicknessIn: 0.175,
        yieldStrengthPsi: 100000,
      })),
    };
    const heavyWallEntry = createCalculationHistoryEntry(
      heavyWallString,
      'envelope',
      'Benchmark B: Heavy Wall 2.000" CT100 × 0.175"',
      'High burst rating designed for 10,000 psi fracturing & high overpull'
    );
    heavyWallEntry.isBookmarked = true;

    // Create a large OD tapered variant
    const taperedString: CoiledTubingString = {
      ...JSON.parse(JSON.stringify(currentString)),
      name: 'Deep Cleanout Tapered 2.375" CT90',
      outerDiameterIn: 2.375,
      wallThicknessIn: 0.190,
      totalLengthFt: 18500,
      yieldStrengthPsi: 90000,
      materialGrade: 'CT90',
      strips: [
        {
          stripNumber: 1,
          lengthFt: 6000,
          wallThicknessIn: 0.204,
          outerDiameterIn: 2.375,
          yieldStrengthPsi: 90000,
          tensileStrengthPsi: 98000,
          weightLbFt: 4.73,
        },
        {
          stripNumber: 2,
          lengthFt: 6500,
          wallThicknessIn: 0.190,
          outerDiameterIn: 2.375,
          yieldStrengthPsi: 90000,
          tensileStrengthPsi: 98000,
          weightLbFt: 4.43,
        },
        {
          stripNumber: 3,
          lengthFt: 6000,
          wallThicknessIn: 0.175,
          outerDiameterIn: 2.375,
          yieldStrengthPsi: 90000,
          tensileStrengthPsi: 98000,
          weightLbFt: 4.11,
        },
      ],
    };
    const taperedEntry = createCalculationHistoryEntry(
      taperedString,
      'forces',
      'Benchmark C: Deep Reach Tapered 2.375" CT90',
      'Extended reach cleanout string with stiff outer diameter to mitigate helical buckling'
    );

    const updated = [heavyWallEntry, taperedEntry, baselineCT90, ...history];
    onUpdateHistory(updated);
  };

  // Helper to render source tab pill
  const renderSourceTabBadge = (source: CalculationTabSource) => {
    switch (source) {
      case 'specs':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 flex items-center gap-1">
            <Ruler className="w-2.5 h-2.5" /> Specs
          </span>
        );
      case 'envelope':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> Envelope
          </span>
        );
      case 'hydraulics':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5" /> Hydra
          </span>
        );
      case 'forces':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800/80 flex items-center gap-1">
            <Anchor className="w-2.5 h-2.5" /> Forces
          </span>
        );
      case 'fatigue':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Fatigue
          </span>
        );
      case 'sensitivity':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80 flex items-center gap-1">
            <Sliders className="w-2.5 h-2.5" /> Sensitivity
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Snapshot
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for smaller viewports */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Slide-over Sidebar Container */}
      <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-slideLeft font-sans">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Calculation History
                </h2>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {history.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Track simulation snapshots & compare side-by-side
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTakeSnapshot()}
              className="p-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
              title="Snapshot active workspace string and calculations"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close history sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Named Snapshot Input Drawer */}
        {isAddingCustom ? (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={customSnapshotName}
              onChange={(e) => setCustomSnapshotName(e.target.value)}
              placeholder="e.g. 15,000 ft Cleanout CT90 @ 4500 psi..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTakeSnapshot(customSnapshotName);
                if (e.key === 'Escape') setIsAddingCustom(false);
              }}
            />
            <button
              type="button"
              onClick={() => handleTakeSnapshot(customSnapshotName)}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCustom(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <span>Active:</span>
              <strong className="text-slate-200 font-medium truncate max-w-[200px]">
                {currentString.name}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>Custom tag</span>
            </button>
          </div>
        )}

        {/* Multi-selection Comparison Bar (shows when items are checked) */}
        {selectedIdsForCompare.length > 0 && (
          <div className="p-2.5 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-b border-cyan-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center">
                {selectedIdsForCompare.length}
              </span>
              <span className="text-xs text-cyan-200 font-medium">
                {selectedIdsForCompare.length === 2
                  ? '2 configurations selected'
                  : 'Select 1 more to compare'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedIdsForCompare.length === 2 ? (
                <button
                  type="button"
                  onClick={handleOpenCompareSelected}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all animate-pulse"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare Side-by-Side</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const entry = history.find((h) => h.id === selectedIdsForCompare[0]);
                    if (entry) {
                      const currentEntry = createCalculationHistoryEntry(
                        currentString,
                        'manual',
                        `Active: ${currentString.name}`
                      );
                      setComparePair([entry, currentEntry]);
                      setIsCompareModalOpen(true);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600/40 hover:bg-cyan-600/60 text-cyan-200 text-xs font-semibold flex items-center gap-1"
                >
                  <span>Compare with Active</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIdsForCompare([])}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/90 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search runs by grade, OD, title..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5">
            <button
              type="button"
              onClick={() => setFilterBookmarkedOnly((p) => !p)}
              className={`px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 shrink-0 ${
                filterBookmarkedOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3 h-3 ${filterBookmarkedOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Starred</span>
            </button>

            {['all', 'specs', 'envelope', 'hydraulics', 'forces', 'fatigue'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterSourceTab(tab)}
                className={`px-2 py-0.5 rounded-full border capitalize transition-all shrink-0 ${
                  filterSourceTab === tab
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Sources' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* History Item Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 my-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                No calculation snapshots found
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
                {searchQuery || filterBookmarkedOnly || filterSourceTab !== 'all'
                  ? 'No results match your active search filters.'
                  : 'Take snapshots of your coiled tubing configurations and simulation runs to compare metrics side-by-side.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTakeSnapshot()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Snapshot Active String</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemoBenchmarks}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Benchmarks</span>
                </button>
              </div>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSelected = selectedIdsForCompare.includes(item.id);
              const isJustRestored = justRestoredId === item.id;
              const { metrics } = item;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all relative ${
                    isJustRestored
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-950/80 hover:bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Top Row: Checkbox, Source, Time, Star, Delete */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectForCompare(item.id, e)}
                        className={`p-0.5 rounded text-slate-400 hover:text-white transition-colors ${
                          isSelected ? 'text-cyan-400' : ''
                        }`}
                        title={isSelected ? 'Deselect comparison' : 'Select for comparison (choose 2)'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

                      {renderSourceTabBadge(item.sourceTab)}

                      <span className="text-[10px] font-mono text-slate-500">
                        {item.displayTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(item.id, e)}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          item.isBookmarked
                            ? 'text-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={item.isBookmarked ? 'Remove bookmark' : 'Bookmark this run'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isBookmarked ? 'fill-amber-400' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEntry(item.id, e)}
                        className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <div className="mb-2">
                    <div className="font-bold text-xs text-white line-clamp-1" title={item.title}>
                      {item.title}
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Key Metrics Chips Matrix */}
                  <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-slate-900/90 rounded-lg border border-slate-800/80 text-[10px] font-mono mb-2.5">
                    <div>
                      <span className="text-slate-500 block text-[9px]">OD &bull; WT</span>
                      <span className="text-slate-200 font-bold">
                        {item.stringSnapshot.outerDiameterIn}&quot; &bull; {item.stringSnapshot.wallThicknessIn}&quot;
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">GRADE</span>
                      <span className="text-cyan-300 font-bold">
                        {item.stringSnapshot.materialGrade}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">API BURST</span>
                      <span className="text-emerald-400 font-bold">
                        {isMetric
                          ? `${psiToMpa(metrics.apiBurstPressurePsi).toFixed(0)} MPa`
                          : `${Math.round(metrics.apiBurstPressurePsi).toLocaleString()} psi`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">COLLAPSE</span>
                      <span className="text-amber-400 font-bold">
                        {isMetric
                          ? `${psiToMpa(metrics.collapsePressurePsi).toFixed(0)} MPa`
                          : `${Math.round(metrics.collapsePressurePsi).toLocaleString()} psi`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">TENSILE</span>
                      <span className="text-purple-400 font-bold">
                        {isMetric
                          ? `${lbfToKn(metrics.tensileYieldLbf).toFixed(0)} kN`
                          : `${Math.round(metrics.tensileYieldLbf / 1000).toLocaleString()} klb`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">AIR WT</span>
                      <span className="text-slate-300">
                        {Math.round(metrics.totalWeightLbs / 1000).toLocaleString()} klb
                      </span>
                    </div>
                  </div>

                  {/* Visual Trend Sparkline Chart (Fatigue or Buckling) */}
                  <HistorySparkline
                    entry={item}
                    unitSystem={unitSystem}
                  />

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleRestoreConfiguration(item, e)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isJustRestored
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-cyan-950/60 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-700/60'
                        }`}
                        title="Restore this configuration back into the active workspace"
                      >
                        {isJustRestored ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>Restored!</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Jump Back</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCompareWithCurrent(item, e)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs flex items-center gap-1 transition-all"
                        title="Compare this snapshot side-by-side with your active workspace string"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                        <span>Compare Active</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.stringSnapshot.totalLengthFt.toLocaleString()}&apos;
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDemoBenchmarks}
              className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
              title="Add sample engineering benchmarks"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Benchmarks</span>
            </button>
            <span className="text-slate-700">&bull;</span>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-slate-400 hover:text-rose-400 transition-colors text-[11px]"
              title="Clear non-bookmarked entries"
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleTakeSnapshot()}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Snapshot</span>
          </button>
        </div>
      </aside>

      {/* Side by Side Comparison Modal */}
      {comparePair && (
        <SideBySideComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => {
            setIsCompareModalOpen(false);
            setComparePair(null);
          }}
          entryA={comparePair[0]}
          entryB={comparePair[1]}
          unitSystem={unitSystem}
          onLoadConfiguration={onLoadString}
        />
      )}
    </>
  );
};
