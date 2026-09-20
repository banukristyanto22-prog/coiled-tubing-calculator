import React, { useState, useRef, useEffect } from 'react';
import { CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { PRESET_STRINGS } from '../data/presets';
import { CoilMatrixLogo } from './CoilMatrixLogo';
import { 
  Gauge, 
  FileCheck2, 
  Printer, 
  Settings2, 
  Sparkles,
  ChevronDown,
  FileSpreadsheet,
  Calculator,
  RotateCcw,
  History,
  ShieldCheck,
  Check,
  X,
  Sliders,
  Monitor
} from 'lucide-react';
import { downloadCoiledTubingCSV } from '../utils/csvExport';
import { calculateTubingLimits } from '../utils/engineeringCalculations';

interface HeaderProps {
  currentString: CoiledTubingString;
  onSelectString: (ct: CoiledTubingString) => void;
  unitSystem: UnitSystem;
  onToggleUnitSystem: () => void;
  onOpenMtrModal: () => void;
  onOpenConverter: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  onResetDefaults: () => void;
  onPrint: () => void;
  onOpenDesktopExeModal?: () => void;
  safetyFactor: number;
  onSafetyFactorChange: (sf: number) => void;
  showNominalOverlay: boolean;
  onToggleNominalOverlay: () => void;
}

const SAFETY_FACTOR_PRESETS = [
  { value: 1.00, label: 'Nominal Yield', desc: '100% (No Derating)' },
  { value: 0.90, label: '90% Working Limit', desc: 'Extended Operations' },
  { value: 0.85, label: '85% Standard', desc: 'General Workover' },
  { value: 0.80, label: '80% API Spec 5ST', desc: 'Recommended Default' },
  { value: 0.75, label: '75% Sour / Severe', desc: 'H2S / High Temp' },
  { value: 0.67, label: '67% High Risk', desc: 'Depleted Reservoir' },
];

export const Header: React.FC<HeaderProps> = ({
  currentString,
  onSelectString,
  unitSystem,
  onToggleUnitSystem,
  onOpenMtrModal,
  onOpenConverter,
  onOpenHistory,
  historyCount,
  onResetDefaults,
  onPrint,
  onOpenDesktopExeModal,
  safetyFactor,
  onSafetyFactorChange,
  showNominalOverlay,
  onToggleNominalOverlay,
}) => {
  const [isSafetyMenuOpen, setIsSafetyMenuOpen] = useState(false);
  const safetyMenuRef = useRef<HTMLDivElement>(null);
  const [customInput, setCustomInput] = useState(safetyFactor.toString());

  useEffect(() => {
    setCustomInput(safetyFactor.toString());
  }, [safetyFactor]);

  // Click outside and escape listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (safetyMenuRef.current && !safetyMenuRef.current.contains(e.target as Node)) {
        setIsSafetyMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSafetyMenuOpen(false);
    };
    if (isSafetyMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSafetyMenuOpen]);

  const previewLimits = calculateTubingLimits(currentString, 0, safetyFactor);
  const isMetric = unitSystem === 'metric';
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <CoilMatrixLogo size="md" />
            <span className="hidden xl:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-medium self-center">
              v4.8 ENG
            </span>
          </div>

          {/* Mobile unit switch */}
          <div className="md:hidden">
            <button
              onClick={onToggleUnitSystem}
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
            >
              {unitSystem === 'imperial' ? 'US Field (in/psi)' : 'Metric (mm/MPa)'}
            </button>
          </div>
        </div>

        {/* Right: Controls & Presets */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {/* Preset Selector */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={currentString.name}
              onChange={(e) => {
                const found = PRESET_STRINGS.find((p) => p.name === e.target.value);
                if (found) onSelectString(found);
              }}
              className="w-full sm:w-80 appearance-none bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
            >
              {PRESET_STRINGS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* MTR Certificate button (Prominent if Shinda CT90) */}
          <button
            onClick={onOpenMtrModal}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all ${
              currentString.certificateRef
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="View Mill Test Report and inspection data"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Certified MTR</span>
            <span className="sm:hidden">MTR</span>
            {currentString.certificateRef && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Unit Toggle Button */}
          <button
            onClick={onToggleUnitSystem}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
            title="Switch between Imperial (US Field) and Metric (SI) Units"
          >
            <span className="text-slate-400 text-[10px]">UNITS:</span>
            <span className={unitSystem === 'imperial' ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
              FIELD
            </span>
            <span className="text-slate-600">/</span>
            <span className={unitSystem === 'metric' ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
              METRIC
            </span>
          </button>

          {/* Global Safety Factor Overlay Setting Dropdown */}
          <div className="relative" ref={safetyMenuRef}>
            <button
              type="button"
              onClick={() => setIsSafetyMenuOpen(!isSafetyMenuOpen)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all shadow-sm ${
                isSafetyMenuOpen
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-cyan-950/50'
                  : safetyFactor < 1.0
                  ? 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Global Safety Factor: Applies a derating multiplier (e.g. 0.80, 0.90) to all working envelope limit calculations"
            >
              <ShieldCheck className={`w-4 h-4 ${safetyFactor < 1.0 ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="text-slate-400 text-[10px] hidden sm:inline">SAFETY FACTOR:</span>
              <span className="font-mono font-bold text-cyan-400">{safetyFactor.toFixed(2)}</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hidden md:inline">
                {Math.round(safetyFactor * 100)}%
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSafetyMenuOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isSafetyMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-4 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Working Envelope Safety Factor
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Global Derating Multiplier on Working Limits
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSafetyMenuOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Applies a global safety multiplier (<span className="font-mono text-cyan-400 font-semibold">SF</span>) to derate allowable burst, collapse, tensile overpull, and the triaxial von Mises envelope boundaries.
                </p>

                {/* Quick Presets Grid */}
                <div className="space-y-1.5 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Standard Industry Presets:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAFETY_FACTOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          onSafetyFactorChange(preset.value);
                        }}
                        className={`p-2 rounded-lg text-left border transition-all flex flex-col justify-between ${
                          Math.abs(safetyFactor - preset.value) < 0.005
                            ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm'
                            : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-cyan-400">
                            {preset.value.toFixed(2)} ({Math.round(preset.value * 100)}%)
                          </span>
                          {Math.abs(safetyFactor - preset.value) < 0.005 && (
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider & Custom Value */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Fine Multiplier Adjustment:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.40"
                        max="1.00"
                        step="0.01"
                        value={customInput}
                        onChange={(e) => {
                          setCustomInput(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0.4 && val <= 1.0) {
                            onSafetyFactorChange(Math.round(val * 100) / 100);
                          }
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-cyan-400 text-right focus:outline-none focus:border-cyan-500"
                      />
                      <span className="font-mono text-[11px] text-slate-400">
                        ({Math.round(safetyFactor * 100)}%)
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0.50"
                    max="1.00"
                    step="0.01"
                    value={safetyFactor}
                    onChange={(e) => onSafetyFactorChange(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.50 (50%)</span>
                    <span>0.75 (Sour)</span>
                    <span className="text-cyan-400 font-bold">0.80 (API 5ST)</span>
                    <span>0.90 (90%)</span>
                    <span>1.00 (100% Yield)</span>
                  </div>
                </div>

                {/* Chart Overlay Toggle */}
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 mb-3 flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-medium text-slate-200">100% Nominal Yield Overlay</span>
                    <span className="text-[10px] text-slate-400">Show dashed nominal boundary on envelope chart</span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleNominalOverlay}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showNominalOverlay ? 'bg-cyan-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showNominalOverlay ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Derated Limits Preview for Active String */}
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1.5 font-mono mb-3">
                  <div className="flex justify-between text-slate-400 text-[10px] font-sans pb-1 border-b border-slate-800">
                    <span>{currentString.name} Limits at SF ({safetyFactor.toFixed(2)}):</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-sans">Safe Burst:</span>
                    <span className="font-bold text-emerald-400">
                      {isMetric ? `${Math.round(previewLimits.safeBurstMpa)} MPa` : `${Math.round(previewLimits.safeBurstPressurePsi).toLocaleString()} psi`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-sans">Safe Overpull:</span>
                    <span className="font-bold text-purple-400">
                      {isMetric ? `${Math.round(previewLimits.safeOverpullKn)} kN` : `${Math.round(previewLimits.safeOverpullLbf).toLocaleString()} lbf`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400 font-sans">Safe Collapse:</span>
                    <span className="font-bold text-amber-400">
                      {isMetric ? `${Math.round(previewLimits.safeCollapseMpa)} MPa` : `${Math.round(previewLimits.safeCollapsePressurePsi).toLocaleString()} psi`}
                    </span>
                  </div>
                </div>

                {/* Reset button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-500">API Spec 5ST default: 0.80</span>
                  <button
                    type="button"
                    onClick={() => onSafetyFactorChange(0.80)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2"
                  >
                    Reset to 0.80 (Default)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Calculation History Sidebar Button */}
          <button
            onClick={onOpenHistory}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-1.5 transition-colors shadow-sm relative"
            title="Open Simulation & Calculation History Panel"
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* Standalone Unit Converter Utility Sidebar */}
          <button
            onClick={onOpenConverter}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/50 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open standalone oilfield unit conversion utility (psi to bar, ft to m, lbs/ft to kg/m)"
          >
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Unit Converter</span>
            <span className="sm:hidden">Convert</span>
          </button>

          {/* Reset to Factory Defaults Button */}
          <button
            onClick={onResetDefaults}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reset all inputs and restore factory default tubing specification"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="hidden xl:inline">Reset Defaults</span>
            <span className="xl:hidden hidden sm:inline">Reset</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => downloadCoiledTubingCSV(currentString, unitSystem)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Export full engineering calculations and parameters to a CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          {/* Desktop .EXE Package / Export Button */}
          {onOpenDesktopExeModal && (
            <button
              onClick={onOpenDesktopExeModal}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 border border-cyan-700/60 hover:border-cyan-400 flex items-center gap-1.5 shadow-sm transition-all"
              title="Package and build standalone offline Windows .EXE desktop application"
            >
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Desktop (.exe)</span>
              <span className="sm:hidden">.exe</span>
            </button>
          )}

          {/* Print / Export Job Sheet */}
          <button
            onClick={onPrint}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-sm shadow-cyan-900 transition-colors"
            title="Print or Export Complete Job Calculation Summary Sheet"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Job Sheet</span>
          </button>
        </div>
      </div>
    </header>
  );
};
