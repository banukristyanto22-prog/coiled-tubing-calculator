import React, { useState, useMemo } from 'react';
import { TfaDataPoint, UnitSystem, CoiledTubingString } from '../types/coiledTubing';
import { ftToM, mToFt, lbfToKn, knToLbf } from '../utils/engineeringCalculations';
import { TfaPredictedPoint, TfaFitStatistics, enrichActualPoint } from '../utils/tfaCalculations';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

interface TfaActualDataTableProps {
  actualLog: TfaDataPoint[];
  predictedCurve: TfaPredictedPoint[];
  fitStats: TfaFitStatistics;
  unitSystem: UnitSystem;
  ct: CoiledTubingString;
  currentCasingMu: number;
  onAddPoint: (point: TfaDataPoint) => void;
  onDeletePoint: (index: number) => void;
  onClearAll: () => void;
  onLoadPreset: (presetId: string) => void;
  onApplyCalibratedMu: (calibratedMu: number) => void;
  onOpenImportModal: () => void;
  onSelectPoint?: (point: TfaDataPoint) => void;
}

export const TfaActualDataTable: React.FC<TfaActualDataTableProps> = ({
  actualLog,
  predictedCurve,
  fitStats,
  unitSystem,
  ct,
  currentCasingMu,
  onAddPoint,
  onDeletePoint,
  onClearAll,
  onLoadPreset,
  onApplyCalibratedMu,
  onOpenImportModal,
  onSelectPoint,
}) => {
  const isMetric = unitSystem === 'metric';

  // Quick Add Point State
  const [newDepth, setNewDepth] = useState<string>('2400');
  const [newWeight, setNewWeight] = useState<string>('19200');
  const [newOperation, setNewOperation] = useState<'RIH' | 'POH' | 'WIPER' | 'TAG_BOTTOM' | 'STATIC'>('RIH');
  const [newSpeed, setNewSpeed] = useState<string>('15');
  const [newNotes, setNewNotes] = useState<string>('');

  // Filter & Search
  const [selectedOpFilter, setSelectedOpFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Enriched points with live calculations
  const enrichedPoints = useMemo(() => {
    return actualLog.map((pt) => enrichActualPoint(pt, predictedCurve));
  }, [actualLog, predictedCurve]);

  // Filtered Points
  const filteredPoints = useMemo(() => {
    return enrichedPoints.filter((pt) => {
      const matchesOp = selectedOpFilter === 'ALL' || pt.operation === selectedOpFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        pt.depthM.toString().includes(term) ||
        (pt.notes && pt.notes.toLowerCase().includes(term)) ||
        (pt.operation && pt.operation.toLowerCase().includes(term));
      return matchesOp && matchesSearch;
    });
  }, [enrichedPoints, selectedOpFilter, searchTerm]);

  // Form submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dVal = parseFloat(newDepth);
    const wVal = parseFloat(newWeight);
    if (isNaN(dVal) || isNaN(wVal)) return;

    const depthM = isMetric ? dVal : ftToM(dVal);
    const weightLbf = isMetric ? knToLbf(wVal) : wVal;

    const newPt: TfaDataPoint = {
      id: `pt-${Date.now()}`,
      depthM,
      depthFt: mToFt(depthM),
      expectedPohLbf: 0,
      expectedRihLbf: 0,
      eWeightLbf: weightLbf,
      operation: newOperation,
      speedMPerMin: parseFloat(newSpeed) || 0,
      notes: newNotes.trim() || undefined,
    };

    onAddPoint(newPt);
    setNewNotes('');
  };

  // CSV Export
  const handleExportCsv = () => {
    if (enrichedPoints.length === 0) return;
    const headers = [
      `Depth_${isMetric ? 'm' : 'ft'}`,
      `Actual_Weight_${isMetric ? 'kN' : 'lbf'}`,
      `Expected_RIH_${isMetric ? 'kN' : 'lbf'}`,
      `Expected_POH_${isMetric ? 'kN' : 'lbf'}`,
      `Delta_${isMetric ? 'kN' : 'lbf'}`,
      'Apparent_Mu',
      'Operation',
      `Speed_${isMetric ? 'm_min' : 'ft_min'}`,
      'Notes',
    ];

    const rows = enrichedPoints.map((p) => {
      const d = isMetric ? p.depthM.toFixed(1) : p.depthFt.toFixed(1);
      const actW = isMetric ? lbfToKn(p.eWeightLbf || 0).toFixed(1) : (p.eWeightLbf || 0).toFixed(0);
      const rihW = isMetric ? lbfToKn(p.expectedRihLbf).toFixed(1) : p.expectedRihLbf.toFixed(0);
      const pohW = isMetric ? lbfToKn(p.expectedPohLbf).toFixed(1) : p.expectedPohLbf.toFixed(0);
      const delta = isMetric ? lbfToKn(p.deltaLbf || 0).toFixed(1) : (p.deltaLbf || 0).toFixed(0);
      const mu = p.backCalculatedFriction ? p.backCalculatedFriction.toFixed(3) : '-';
      const op = p.operation || 'RIH';
      const spd = p.speedMPerMin ? (isMetric ? p.speedMPerMin.toFixed(1) : (p.speedMPerMin * 3.28084).toFixed(1)) : '0';
      const n = (p.notes || '').replace(/"/g, '""');
      return `"${d}","${actW}","${rihW}","${pohW}","${delta}","${mu}","${op}","${spd}","${n}"`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TFA_Actual_Log_${ct.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Calculation & Diagnostics Highlights Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm text-white">
              TFA Actual vs Predicted Calculation Engine
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
              {actualLog.length} Data Points Logged
            </span>
          </div>

          {/* One-Click Calibrate Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApplyCalibratedMu(fitStats.calibratedFriction)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Apply calculated optimal friction factor to casing curve"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                Auto-Calibrate Casing &mu; &rarr; {fitStats.calibratedFriction.toFixed(2)}
              </span>
            </button>
          </div>
        </div>

        {/* Statistical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Mean Absolute Error (MAE)</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              {isMetric ? Math.round(lbfToKn(fitStats.maeLbf)) + ' kN' : Math.round(fitStats.maeLbf).toLocaleString() + ' lbf'}
            </span>
            <span className="text-[10px] text-slate-500 block">Avg point deviation</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Root Mean Sq Error (RMSE)</span>
            <span className="text-base font-bold font-mono text-amber-300">
              {isMetric ? Math.round(lbfToKn(fitStats.rmseLbf)) + ' kN' : Math.round(fitStats.rmseLbf).toLocaleString() + ' lbf'}
            </span>
            <span className="text-[10px] text-slate-500 block">Variance sensitivity</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Goodness of Fit (R&sup2;)</span>
            <span className="text-base font-bold font-mono text-emerald-300">
              {(fitStats.rSquared * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block">Correlation coefficient</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Back-Calc Apparent &mu;</span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {fitStats.avgApparentFriction.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 block">Active model: &mu;={currentCasingMu.toFixed(2)}</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Peak Deviation Point</span>
            <span className="text-base font-bold font-mono text-rose-300">
              &Delta; {isMetric ? Math.round(lbfToKn(fitStats.maxDeltaLbf)) + ' kN' : Math.round(fitStats.maxDeltaLbf).toLocaleString() + ' lbf'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              @ {Math.round(isMetric ? fitStats.maxDeltaDepthM : mToFt(fitStats.maxDeltaDepthM)).toLocaleString()} {isMetric ? 'm' : 'ft'}
            </span>
          </div>
        </div>

        {/* Real-time Summary Line */}
        <div className="mt-3 p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/50 flex items-start gap-2 text-xs text-blue-200">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300">Engineering Interpretation: </span>
            <span>{fitStats.diagnosticSummary}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Add Point Form & Presets Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-400" />
            Add Actual Hookload Point (E-Weight)
          </span>

          {/* Field Run Presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">Load Preset Run:</span>
            <button
              type="button"
              onClick={() => onLoadPreset('standard')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
              title="Standard Field Run with Periodic Wiper Checks"
            >
              MRJN-764 Run
            </button>
            <button
              type="button"
              onClick={() => onLoadPreset('high-drag')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
              title="High Drag / Solids Bedding Run"
            >
              High Drag
            </button>
            <button
              type="button"
              onClick={() => onLoadPreset('cleanout')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
              title="Scale Cleanout / Obstruction Tag Run"
            >
              Milling Run
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddSubmit} className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
          {/* Depth */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">
              Depth ({isMetric ? 'm' : 'ft'}) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={newDepth}
              onChange={(e) => setNewDepth(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Measured Weight (E-Weight) */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">
              Measured E-Weight ({isMetric ? 'kN' : 'lbf'}) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="e.g. 14200"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Operation Mode */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Operation</label>
            <select
              value={newOperation}
              onChange={(e) => setNewOperation(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white focus:border-cyan-400 focus:outline-none text-xs"
            >
              <option value="RIH">RIH (Run In Hole)</option>
              <option value="POH">POH (Pull Out Hole)</option>
              <option value="WIPER">Wiper / Reciprocation</option>
              <option value="TAG_BOTTOM">Tag Bottom / Obstruction</option>
              <option value="STATIC">Static / Tare Neutral</option>
            </select>
          </div>

          {/* Running Speed */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">
              Speed ({isMetric ? 'm/min' : 'ft/min'})
            </label>
            <input
              type="number"
              step="any"
              value={newSpeed}
              onChange={(e) => setNewSpeed(e.target.value)}
              placeholder="15"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Notes / Remark */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Notes / Tag</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Pick-up check"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Add Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log Point</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Actual Data Table with Calculations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Controls Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Operation Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filter:
            </span>
            {['ALL', 'RIH', 'POH', 'WIPER', 'TAG_BOTTOM'].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setSelectedOpFilter(op)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  selectedOpFilter === op
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search depth or notes..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 w-44 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Table Actions: Import, Export CSV, Clear All */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors"
              title="Bulk import from CSV or text log"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={enrichedPoints.length === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors disabled:opacity-40"
              title="Export actual points and calculated values to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={actualLog.length === 0}
              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-rose-800/60 transition-colors disabled:opacity-40"
              title="Clear all actual logged points"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[420px] scrollbar-thin scrollbar-thumb-slate-700">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Depth ({isMetric ? 'm' : 'ft'})</th>
                <th className="py-2.5 px-3">Actual E-Weight</th>
                <th className="py-2.5 px-3">Target Pred.</th>
                <th className="py-2.5 px-3">&Delta; Load</th>
                <th className="py-2.5 px-3">Apparent &mu;</th>
                <th className="py-2.5 px-3">Overpull Margin</th>
                <th className="py-2.5 px-3">Operation</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No actual data points found matching criteria. Click "MRJN-764 Run" or add points manually.
                  </td>
                </tr>
              ) : (
                filteredPoints.map((pt, idx) => {
                  const dDisplay = Math.round(isMetric ? pt.depthM : pt.depthFt);
                  const actWDisplay = Math.round(isMetric ? lbfToKn(pt.eWeightLbf || 0) : (pt.eWeightLbf || 0));
                  const predTargetW = pt.operation === 'POH' ? pt.expectedPohLbf : pt.expectedRihLbf;
                  const predWDisplay = Math.round(isMetric ? lbfToKn(predTargetW) : predTargetW);
                  const deltaAbs = Math.abs(pt.deltaLbf || 0);
                  const deltaDisplay = (pt.deltaLbf && pt.deltaLbf > 0 ? '+' : '') + Math.round(isMetric ? lbfToKn(pt.deltaLbf || 0) : (pt.deltaLbf || 0));
                  const marginDisplay = Math.round(isMetric ? lbfToKn(pt.safetyMarginLbf || 0) : (pt.safetyMarginLbf || 0));

                  // Severity color for load delta
                  let deltaBadgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
                  if (deltaAbs > 2000) {
                    deltaBadgeColor = 'text-rose-400 bg-rose-950/50 border-rose-800/50';
                  } else if (deltaAbs > 800) {
                    deltaBadgeColor = 'text-amber-400 bg-amber-950/40 border-amber-800/40';
                  }

                  // Operation tag styling
                  let opBadge = 'bg-blue-950 text-blue-300 border-blue-800';
                  if (pt.operation === 'POH') opBadge = 'bg-rose-950 text-rose-300 border-rose-800';
                  else if (pt.operation === 'WIPER') opBadge = 'bg-amber-950 text-amber-300 border-amber-800';
                  else if (pt.operation === 'TAG_BOTTOM') opBadge = 'bg-purple-950 text-purple-300 border-purple-800';
                  else if (pt.operation === 'STATIC') opBadge = 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <tr
                      key={pt.id || `pt-${idx}`}
                      onClick={() => onSelectPoint && onSelectPoint(pt)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-white">
                        {dDisplay.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-300">
                        {actWDisplay.toLocaleString()} {isMetric ? 'kN' : 'lbf'}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {predWDisplay.toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${deltaBadgeColor}`}>
                          {deltaDisplay}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-300">
                          {pt.backCalculatedFriction ? pt.backCalculatedFriction.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={pt.safetyMarginLbf && pt.safetyMarginLbf < 8000 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {marginDisplay.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${opBadge}`}>
                          {pt.operation || 'RIH'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {pt.speedMPerMin ? (isMetric ? pt.speedMPerMin : Math.round(pt.speedMPerMin * 3.28084)) : '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[150px]">
                        {pt.notes || '-'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePoint(idx);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
