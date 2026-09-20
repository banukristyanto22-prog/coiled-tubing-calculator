import React, { useState, useMemo, useEffect } from 'react';
import { CoiledTubingString, UnitSystem, CalculationHistoryEntry } from '../types/coiledTubing';
import { createCalculationHistoryEntry } from '../utils/engineeringCalculations';
import { evaluateCalculationSafety } from '../utils/safetyEvaluator';
import { downloadCoiledTubingCSV, downloadCalculationHistoryCSV } from '../utils/csvExport';
import { downloadBatchJobSheetPdf } from '../utils/batchJobSheetPdf';
import { JobSheetContent } from './JobSheetContent';
import { BatchExecutiveSummarySheet } from './BatchExecutiveSummarySheet';
import { CalculationSafetyBadge } from './CalculationSafetyBadge';
import {
  Printer,
  X,
  FileSpreadsheet,
  FileDown,
  Star,
  Layers,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';

interface PrintJobSheetProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  isOpen: boolean;
  onClose: () => void;
  history?: CalculationHistoryEntry[];
  initialMode?: 'single' | 'batch';
  onToggleBookmark?: (id: string) => void;
  onBookmarkAll?: () => void;
}

export const PrintJobSheet: React.FC<PrintJobSheetProps> = ({
  ct,
  unitSystem,
  isOpen,
  onClose,
  history = [],
  initialMode = 'single',
  onToggleBookmark,
  onBookmarkAll,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>(initialMode);
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Filter bookmarked entries from history
  const bookmarkedEntries = useMemo(() => {
    return history.filter((item) => item.isBookmarked);
  }, [history]);

  // Selected entry IDs for batch print
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  // Whenever modal opens or bookmarkedEntries change, sync mode and selection
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'batch' && bookmarkedEntries.length > 0) {
        setMode('batch');
      } else if (initialMode === 'single') {
        setMode('single');
      }
      // Default to selecting all currently bookmarked items
      setSelectedEntryIds(bookmarkedEntries.map((b) => b.id));
    }
  }, [isOpen, initialMode, bookmarkedEntries.length]);

  // List of effective entries included in batch print
  const effectiveBatchEntries = useMemo(() => {
    return bookmarkedEntries.filter((item) => selectedEntryIds.includes(item.id));
  }, [bookmarkedEntries, selectedEntryIds]);

  // Pass / Violation counts for bookmarked entries
  const bookmarkStats = useMemo(() => {
    let pass = 0;
    let fail = 0;
    bookmarkedEntries.forEach((e) => {
      const evalRes = evaluateCalculationSafety(e);
      if (evalRes.status === 'pass') pass++;
      else fail++;
    });
    return { pass, fail };
  }, [bookmarkedEntries]);

  if (!isOpen) return null;

  const totalSheets =
    mode === 'batch'
      ? (includeSummary ? 1 : 0) + effectiveBatchEntries.length
      : 1;

  // Toggle selection for a specific entry
  const handleToggleEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all bookmarked entries
  const handleSelectAll = () => {
    setSelectedEntryIds(bookmarkedEntries.map((b) => b.id));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedEntryIds([]);
  };

  // Select only compliant/safe runs
  const handleSelectOnlySafe = () => {
    const safeIds = bookmarkedEntries
      .filter((e) => evaluateCalculationSafety(e).status === 'pass')
      .map((e) => e.id);
    setSelectedEntryIds(safeIds);
  };

  // Select only limit violations
  const handleSelectOnlyViolations = () => {
    const violIds = bookmarkedEntries
      .filter((e) => evaluateCalculationSafety(e).status !== 'pass')
      .map((e) => e.id);
    setSelectedEntryIds(violIds);
  };

  // Native browser print dialog ("Save as PDF" / Printer)
  const handlePrintAction = () => {
    window.print();
  };

  // Direct vector PDF download via jsPDF
  const handleDownloadDirectPdf = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        if (mode === 'batch') {
          if (effectiveBatchEntries.length === 0) return;
          downloadBatchJobSheetPdf(
            effectiveBatchEntries,
            unitSystem,
            `CoilMatrix_Batch_JobSheets_${new Date().toISOString().split('T')[0]}.pdf`,
            { includeSummarySheet: includeSummary }
          );
        } else {
          // Single string mode: convert active string into history entry format
          const singleEntry = createCalculationHistoryEntry(
            ct,
            'specs',
            ct.name
          );
          downloadBatchJobSheetPdf(
            [singleEntry],
            unitSystem,
            `CoilMatrix_JobSheet_${ct.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            { includeSummarySheet: false }
          );
        }
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 50);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (mode === 'batch') {
      if (effectiveBatchEntries.length === 0) return;
      downloadCalculationHistoryCSV(effectiveBatchEntries, unitSystem);
    } else {
      downloadCoiledTubingCSV(ct, unitSystem);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto print-modal-backdrop">
      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 max-h-[96vh] flex flex-col font-sans border border-slate-700/50 print-modal-card">
        {/* ============================================================ */}
        {/* TOP CONTROL BAR (Screen Only, hidden during printing)       */}
        {/* ============================================================ */}
        <div className="px-5 py-3 bg-slate-950 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print select-none">
          {/* Left: Mode Switcher Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'single'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="View single active string job sheet"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Active String</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('batch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mode === 'batch'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Batch print all bookmarked calculations into a single PDF"
              >
                <Star className={`w-3.5 h-3.5 ${mode === 'batch' ? 'fill-white' : 'text-amber-400'}`} />
                <span>Batch Bookmarks</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    mode === 'batch'
                      ? 'bg-amber-800 text-amber-100'
                      : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  {bookmarkedEntries.length}
                </span>
              </button>
            </div>

            {mode === 'batch' && (
              <button
                type="button"
                onClick={() => setIsCustomizeOpen((p) => !p)}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  isCustomizeOpen
                    ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
                title="Customize included bookmarked calculations and cover options"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select & Filter ({effectiveBatchEntries.length}/{bookmarkedEntries.length})</span>
                {isCustomizeOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}
          </div>

          {/* Right: Export & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={mode === 'batch' && effectiveBatchEntries.length === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download results as a formatted CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Direct Multi-Page PDF Download (jsPDF) */}
            <button
              type="button"
              onClick={handleDownloadDirectPdf}
              disabled={isGeneratingPdf || (mode === 'batch' && effectiveBatchEntries.length === 0)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Generate and download vector PDF directly (bypasses print preview)"
            >
              <FileDown className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Native Browser Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrintAction}
              disabled={mode === 'batch' && effectiveBatchEntries.length === 0}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open browser print dialog to print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BATCH SELECTION & CUSTOMIZATION DRAWER (Screen Only)        */}
        {/* ============================================================ */}
        {mode === 'batch' && (
          <div className="no-print bg-slate-900 border-b border-slate-800 text-slate-200">
            {/* Batch Status Bar */}
            <div className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Batch Scope:</span>
                  <strong className="text-white font-mono">{effectiveBatchEntries.length}</strong> of{' '}
                  <span className="text-slate-400">{bookmarkedEntries.length} Bookmarks</span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  Total Document Size:{' '}
                  <strong className="text-cyan-300 font-mono">{totalSheets} Sheets</strong>
                </span>
              </div>

              {/* Cover / Index Sheet Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
                />
                <span>Include Executive Cover & Summary Matrix (Page 1)</span>
              </label>
            </div>

            {/* Expandable Customization Panel */}
            {isCustomizeOpen && (
              <div className="p-4 space-y-3 bg-slate-900/95 max-h-60 overflow-y-auto">
                {/* Filter & Quick Selection Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Quick Select:</span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <CheckSquare className="w-3 h-3 text-cyan-400" />
                      All ({bookmarkedEntries.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectOnlySafe}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Compliant ({bookmarkStats.pass})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectOnlyViolations}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Violations ({bookmarkStats.fail})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <Square className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Bookmarked Calculation Cards List */}
                {bookmarkedEntries.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No bookmarked calculations found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bookmarkedEntries.map((entry) => {
                      const isSelected = selectedEntryIds.includes(entry.id);
                      const safety = evaluateCalculationSafety(entry);
                      const ctSnap = entry.stringSnapshot;
                      const gradeStr = ctSnap.grade || (ctSnap as any).materialGrade || 'CT90';

                      return (
                        <div
                          key={entry.id}
                          onClick={() => handleToggleEntry(entry.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm'
                              : 'bg-slate-950/40 border-slate-800 opacity-65 hover:opacity-100 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container onClick
                              className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-white truncate" title={entry.title}>
                                {entry.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                                <span>{gradeStr}</span>
                                <span>&bull;</span>
                                <span>{ctSnap.outerDiameterIn}" &times; {ctSnap.wallThicknessIn}"</span>
                                <span>&bull;</span>
                                <span>{entry.displayTime}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <CalculationSafetyBadge evaluation={safety} size="xs" />
                            {onToggleBookmark && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleBookmark(entry.id);
                                }}
                                className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
                                title="Remove bookmark"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty State Banner if 0 Bookmarks */}
            {bookmarkedEntries.length === 0 && (
              <div className="p-4 text-center bg-slate-950 border-b border-slate-800 text-xs">
                <div className="inline-flex items-center gap-2 text-amber-300 font-bold mb-1">
                  <Info className="w-4 h-4" />
                  <span>No Calculations Bookmarked Yet</span>
                </div>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mb-3">
                  Star/bookmark simulation runs and string configurations in the Calculation History sidebar to
                  include them in your batch PDF export.
                </p>
                <div className="flex items-center justify-center gap-2">
                  {onBookmarkAll && history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onBookmarkAll();
                        setSelectedEntryIds(history.map((h) => h.id));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Bookmark All ({history.length}) Current History Snapshots</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMode('single')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                  >
                    Switch to Active String Job Sheet
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PRINTABLE REPORT DOCUMENT (Rendered in preview & print)     */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto bg-white">
          {mode === 'single' ? (
            /* Single String Job Sheet */
            <JobSheetContent
              ct={ct}
              unitSystem={unitSystem}
              title={ct.name}
              sheetNumber={1}
              totalSheets={1}
            />
          ) : (
            /* Batch Bookmarked Calculations */
            <div className="divide-y-4 divide-slate-300">
              {effectiveBatchEntries.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-700">No bookmarked calculations selected for batch export.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select at least one calculation from the menu above to render and print.
                  </p>
                </div>
              ) : (
                <>
                  {/* Sheet 1: Executive Batch Summary (if enabled) */}
                  {includeSummary && (
                    <div className="print-break-after">
                      <BatchExecutiveSummarySheet
                        entries={effectiveBatchEntries}
                        unitSystem={unitSystem}
                        totalSheets={totalSheets}
                      />
                    </div>
                  )}

                  {/* Sheets 2..N+1: Individual Calculation Job Sheets */}
                  {effectiveBatchEntries.map((entry, idx) => {
                    const sheetNum = (includeSummary ? 1 : 0) + idx + 1;
                    const isLast = idx === effectiveBatchEntries.length - 1;
                    const safety = evaluateCalculationSafety(entry);

                    return (
                      <div
                        key={entry.id}
                        className={!isLast ? 'print-break-after' : ''}
                      >
                        <JobSheetContent
                          ct={entry.stringSnapshot}
                          unitSystem={unitSystem}
                          title={entry.title}
                          reportNo={
                            entry.stringSnapshot.certificateRef?.reportNo ||
                            `RUN-CT-${(idx + 1).toString().padStart(2, '0')}`
                          }
                          dateStr={entry.displayTime.split(' ')[0]}
                          sheetNumber={sheetNum}
                          totalSheets={totalSheets}
                          safetyEvaluation={safety}
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
