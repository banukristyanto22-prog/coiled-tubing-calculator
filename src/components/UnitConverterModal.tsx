import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  RotateCcw, 
  Gauge, 
  Ruler, 
  Scale, 
  Anchor, 
  Droplets, 
  FlaskConical, 
  Calculator,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  psiToBar,
  barToPsi,
  psiToMpa,
  mpaToPsi,
  ftToM,
  mToFt,
  inToMm,
  mmToIn,
  lbPerFtToKgPerM,
  kgPerMToLbPerFt,
  lbfToKn,
  knToLbf,
  ppgToSg,
  sgToPpg,
  gpmToLpm,
  lpmToGpm,
  bblToM3,
  m3ToBbl
} from '../utils/engineeringCalculations';

interface UnitConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConverterCategory = 'all' | 'pressure' | 'length' | 'linear_weight' | 'force' | 'density' | 'flow_volume';

export const UnitConverterModal: React.FC<UnitConverterModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ConverterCategory>('pressure');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dedicated state for interactive converters
  // 1. Pressure
  const [pressurePsi, setPressurePsi] = useState<string>('5000');
  // 2. Length & Depth
  const [lengthFt, setLengthFt] = useState<string>('10000');
  const [lengthIn, setLengthIn] = useState<string>('0.134');
  // 3. Linear Weight
  const [linearWeightLbsFt, setLinearWeightLbsFt] = useState<string>('2.261');
  // 4. Force / Tension / Overpull
  const [forceLbf, setForceLbf] = useState<string>('45000');
  // 5. Fluid Density / Mud Weight
  const [densityPpg, setDensityPpg] = useState<string>('8.33');
  // 6. Flow Rate
  const [flowGpm, setFlowGpm] = useState<string>('60');
  // 7. Volume
  const [volumeBbl, setVolumeBbl] = useState<string>('25');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Numerical parsers
  const numPressurePsi = parseFloat(pressurePsi) || 0;
  const numLengthFt = parseFloat(lengthFt) || 0;
  const numLengthIn = parseFloat(lengthIn) || 0;
  const numLinearWeightLbsFt = parseFloat(linearWeightLbsFt) || 0;
  const numForceLbf = parseFloat(forceLbf) || 0;
  const numDensityPpg = parseFloat(densityPpg) || 0;
  const numFlowGpm = parseFloat(flowGpm) || 0;
  const numVolumeBbl = parseFloat(volumeBbl) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dark overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Oilfield Unit Converter
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Engineering Tools
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Bidirectional conversion utility for petroleum & coiled tubing operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close converter (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Navigation Bar */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar">
          {[
            { id: 'all', label: 'All Units', icon: Layers },
            { id: 'pressure', label: 'Pressure (psi/bar)', icon: Gauge },
            { id: 'length', label: 'Length & Wall (ft/m)', icon: Ruler },
            { id: 'linear_weight', label: 'Weight (lbs/ft)', icon: Scale },
            { id: 'force', label: 'Tension (lbf/kN)', icon: Anchor },
            { id: 'density', label: 'Mud (ppg/sg)', icon: FlaskConical },
            { id: 'flow_volume', label: 'Flow & BBL', icon: Droplets },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as ConverterCategory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Converter Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">

          {/* SECTION 1: PRESSURE (PSI, BAR, MPA, KPA) */}
          {(activeCategory === 'all' || activeCategory === 'pressure') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Gauge className="w-4 h-4" />
                  <span>Pressure Conversions</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Quick Presets:</span>
                  {[3000, 5000, 7500, 10000].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPressurePsi(p.toString())}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-cyan-900/50 hover:text-cyan-300 text-slate-300 border border-slate-800 font-mono transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Source Input: PSI */}
              <div>
                <label className="text-xs font-medium text-slate-300 flex justify-between mb-1.5">
                  <span>Input Pressure in psi:</span>
                  <span className="font-mono text-cyan-400 text-[11px]">US Oilfield Field Units</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={pressurePsi}
                    onChange={(e) => setPressurePsi(e.target.value)}
                    placeholder="Enter psi..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 pr-16"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                    psi
                  </span>
                </div>
              </div>

              {/* Live Output Equivalents Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Bar */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Bar (bar)</span>
                    <button
                      onClick={() => copyToClipboard(psiToBar(numPressurePsi).toFixed(2), 'pres_bar')}
                      className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                      title="Copy value"
                    >
                      {copiedKey === 'pres_bar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-white">
                    {psiToBar(numPressurePsi).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">bar</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    1 psi = 0.0689476 bar
                  </div>
                </div>

                {/* MPa */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Megapascal (MPa)</span>
                    <button
                      onClick={() => copyToClipboard(psiToMpa(numPressurePsi).toFixed(2), 'pres_mpa')}
                      className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                      title="Copy value"
                    >
                      {copiedKey === 'pres_mpa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-cyan-300">
                    {psiToMpa(numPressurePsi).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">MPa</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    1 psi = 0.00689476 MPa
                  </div>
                </div>

                {/* kPa */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Kilopascal (kPa)</span>
                    <button
                      onClick={() => copyToClipboard((numPressurePsi * 6.89476).toFixed(1), 'pres_kpa')}
                      className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                      title="Copy value"
                    >
                      {copiedKey === 'pres_kpa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-white">
                    {(numPressurePsi * 6.89476).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-slate-400">kPa</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    1 psi = 6.89476 kPa
                  </div>
                </div>

                {/* Standard Atmospheres (atm) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Atmosphere (atm)</span>
                    <button
                      onClick={() => copyToClipboard((numPressurePsi / 14.6959).toFixed(2), 'pres_atm')}
                      className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                      title="Copy value"
                    >
                      {copiedKey === 'pres_atm' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-white">
                    {(numPressurePsi / 14.6959).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">atm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    1 atm = 14.6959 psi
                  </div>
                </div>
              </div>

              {/* Quick Reverse Converter for Bar -> PSI */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Need reverse (bar &rarr; psi)?</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentBar = psiToBar(numPressurePsi);
                    setPressurePsi(Math.round(barToPsi(Math.round(currentBar))).toString());
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Swap to Bar</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: LENGTH, DEPTH & TUBING DIAMETERS (FT/M, IN/MM) */}
          {(activeCategory === 'all' || activeCategory === 'length') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Ruler className="w-4 h-4" />
                  <span>Length, Well Depth & Dimensions</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Presets:</span>
                  {[5000, 10000, 15000, 20000].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLengthFt(f.toString())}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-emerald-900/50 hover:text-emerald-300 text-slate-300 border border-slate-800 font-mono transition-colors"
                    >
                      {f >= 1000 ? `${f / 1000}k` : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth: Feet to Meters */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Well Depth / String Length:</span>
                  <span className="font-mono text-emerald-400 text-[11px]">Feet &harr; Meters</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      value={lengthFt}
                      onChange={(e) => setLengthFt(e.target.value)}
                      placeholder="Feet..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                      ft
                    </span>
                  </div>

                  <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Meters (m)</div>
                      <div className="text-sm font-mono font-bold text-emerald-300">
                        {ftToM(numLengthFt).toLocaleString(undefined, { maximumFractionDigits: 2 })} m
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ftToM(numLengthFt).toFixed(2), 'len_m')}
                      className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                      title="Copy meters"
                    >
                      {copiedKey === 'len_m' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span>1 ft = 0.3048 m</span>
                  <button
                    onClick={() => setLengthFt(Math.round(mToFt(numLengthFt)).toString())}
                    className="text-emerald-400 hover:underline"
                  >
                    Set as input in meters
                  </button>
                </div>
              </div>

              {/* Tubing Wall & Diameters: Inches to Millimeters */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Tubing OD / Wall Thickness:
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span>Common Walls:</span>
                    {['0.109', '0.125', '0.134', '0.156', '0.175', '0.204'].map((w) => (
                      <button
                        key={w}
                        onClick={() => setLengthIn(w)}
                        className="px-1 py-0.5 rounded bg-slate-900 hover:text-emerald-300 text-slate-400 border border-slate-800 transition-colors"
                      >
                        {w}"
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      value={lengthIn}
                      onChange={(e) => setLengthIn(e.target.value)}
                      placeholder="Inches..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                      in
                    </span>
                  </div>

                  <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Millimeters (mm)</div>
                      <div className="text-sm font-mono font-bold text-emerald-300">
                        {inToMm(numLengthIn).toLocaleString(undefined, { maximumFractionDigits: 3 })} mm
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(inToMm(numLengthIn).toFixed(3), 'len_mm')}
                      className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                      title="Copy millimeters"
                    >
                      {copiedKey === 'len_mm' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  1 in = 25.4 mm (exact) &bull; e.g. 1.75" OD = 44.45 mm
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: LINEAR WEIGHT (LBS/FT TO KG/M) */}
          {(activeCategory === 'all' || activeCategory === 'linear_weight') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>Linear Weight (Coiled Tubing Mass)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Common:</span>
                  {['1.50', '2.261', '3.15', '4.20'].map((w) => (
                    <button
                      key={w}
                      onClick={() => setLinearWeightLbsFt(w)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-amber-900/50 hover:text-amber-300 text-slate-300 border border-slate-800 font-mono transition-colors"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Tubing Weight per Unit Length:</span>
                  <span className="font-mono text-amber-400 text-[11px]">API 5ST Linear Weight</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={linearWeightLbsFt}
                      onChange={(e) => setLinearWeightLbsFt(e.target.value)}
                      placeholder="lbs/ft..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 pr-16"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                      lbs/ft
                    </span>
                  </div>

                  <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Kilograms per Meter</div>
                      <div className="text-sm font-mono font-bold text-amber-300">
                        {lbPerFtToKgPerM(numLinearWeightLbsFt).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg/m
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(lbPerFtToKgPerM(numLinearWeightLbsFt).toFixed(3), 'weight_kgm')}
                      className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                      title="Copy kg/m"
                    >
                      {copiedKey === 'weight_kgm' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Total string weight calculation helper */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Estimated 10,000 ft String Mass:
                  </div>
                  <div className="font-mono text-right">
                    <strong className="text-white">
                      {Math.round(numLinearWeightLbsFt * 10000).toLocaleString()} lbs
                    </strong>
                    <span className="text-slate-500 mx-1.5">|</span>
                    <strong className="text-amber-300">
                      {Math.round(lbPerFtToKgPerM(numLinearWeightLbsFt) * 3048).toLocaleString()} kg
                    </strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span>1 lb/ft = 1.48816 kg/m</span>
                  <button
                    onClick={() => {
                      const kgm = lbPerFtToKgPerM(numLinearWeightLbsFt);
                      setLinearWeightLbsFt(kgPerMToLbPerFt(kgm).toFixed(3));
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    Recalculate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FORCE & HOOKLOAD (LBF, KN, DAN, KIPS) */}
          {(activeCategory === 'all' || activeCategory === 'force') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Anchor className="w-4 h-4" />
                  <span>Hookload, Tensile Force & Overpull</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Presets:</span>
                  {[20000, 45000, 70000, 100000].map((f) => (
                    <button
                      key={f}
                      onClick={() => setForceLbf(f.toString())}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-cyan-900/50 hover:text-cyan-300 text-slate-300 border border-slate-800 font-mono transition-colors"
                    >
                      {f / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 flex justify-between mb-1.5">
                  <span>Hookload / Pull Force in lbf:</span>
                  <span className="font-mono text-cyan-400 text-[11px]">Weight Indicator Load</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={forceLbf}
                    onChange={(e) => setForceLbf(e.target.value)}
                    placeholder="Enter lbf..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 pr-16"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                    lbf
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Kilonewtons (kN) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Kilonewton (kN)</span>
                    <button
                      onClick={() => copyToClipboard(lbfToKn(numForceLbf).toFixed(2), 'force_kn')}
                      className="text-slate-500 hover:text-cyan-400"
                    >
                      {copiedKey === 'force_kn' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-cyan-300">
                    {lbfToKn(numForceLbf).toLocaleString(undefined, { maximumFractionDigits: 2 })} kN
                  </div>
                </div>

                {/* Dekanewtons (daN) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Dekanewton (daN)</span>
                    <button
                      onClick={() => copyToClipboard((lbfToKn(numForceLbf) * 100).toFixed(0), 'force_dan')}
                      className="text-slate-500 hover:text-cyan-400"
                    >
                      {copiedKey === 'force_dan' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {Math.round(lbfToKn(numForceLbf) * 100).toLocaleString()} daN
                  </div>
                </div>

                {/* Kips / klbf */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Kips (klbf)</span>
                    <button
                      onClick={() => copyToClipboard((numForceLbf / 1000).toFixed(2), 'force_kips')}
                      className="text-slate-500 hover:text-cyan-400"
                    >
                      {copiedKey === 'force_kips' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {(numForceLbf / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kips
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                1 lbf = 0.00444822 kN &bull; 1 kN = 224.809 lbf = 100 daN
              </div>
            </div>
          )}

          {/* SECTION 5: FLUID DENSITY & PRESSURE GRADIENT (PPG, SG, KG/M3, PSI/FT) */}
          {(activeCategory === 'all' || activeCategory === 'density') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                  <FlaskConical className="w-4 h-4" />
                  <span>Fluid Density & Hydrostatic Gradient</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Presets:</span>
                  {[
                    { label: 'Freshwater (8.33)', val: '8.33' },
                    { label: 'Brine (9.2)', val: '9.2' },
                    { label: 'Heavy (11.5)', val: '11.5' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      onClick={() => setDensityPpg(d.val)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-purple-900/50 hover:text-purple-300 text-slate-300 border border-slate-800 font-mono transition-colors text-[10px]"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 flex justify-between mb-1.5">
                  <span>Fluid Density (Mud Weight):</span>
                  <span className="font-mono text-purple-400 text-[11px]">Pounds per Gallon</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={densityPpg}
                    onChange={(e) => setDensityPpg(e.target.value)}
                    placeholder="ppg..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500 pr-16"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                    ppg
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Specific Gravity (SG) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Specific Gravity</span>
                    <button
                      onClick={() => copyToClipboard(ppgToSg(numDensityPpg).toFixed(3), 'den_sg')}
                      className="text-slate-500 hover:text-purple-400"
                    >
                      {copiedKey === 'den_sg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-purple-300">
                    {ppgToSg(numDensityPpg).toFixed(3)} SG
                  </div>
                </div>

                {/* kg/m³ */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">SI Density</span>
                    <button
                      onClick={() => copyToClipboard((numDensityPpg * 119.826).toFixed(1), 'den_kgm3')}
                      className="text-slate-500 hover:text-purple-400"
                    >
                      {copiedKey === 'den_kgm3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {Math.round(numDensityPpg * 119.826).toLocaleString()} kg/m³
                  </div>
                </div>

                {/* Hydrostatic Gradient (psi/ft) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Gradient</span>
                    <button
                      onClick={() => copyToClipboard((numDensityPpg * 0.052).toFixed(4), 'den_grad')}
                      className="text-slate-500 hover:text-purple-400"
                    >
                      {copiedKey === 'den_grad' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {(numDensityPpg * 0.052).toFixed(4)} psi/ft
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Pressure Gradient (psi/ft) = Density (ppg) &times; 0.052
              </div>
            </div>
          )}

          {/* SECTION 6: FLOW RATE & VOLUME (GPM, LPM, BPM, BBL, M3, GAL) */}
          {(activeCategory === 'all' || activeCategory === 'flow_volume') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Droplets className="w-4 h-4" />
                  <span>Circulation Flow Rate & Wellbore Volumes</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Presets:</span>
                  {[30, 60, 100, 150].map((q) => (
                    <button
                      key={q}
                      onClick={() => setFlowGpm(q.toString())}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-cyan-900/50 hover:text-cyan-300 text-slate-300 border border-slate-800 font-mono transition-colors"
                    >
                      {q} GPM
                    </button>
                  ))}
                </div>
              </div>

              {/* Flow Rate */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Pump Flow Rate:</span>
                  <span className="font-mono text-cyan-400 text-[11px]">US Gallons per Minute</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="relative col-span-1">
                    <input
                      type="number"
                      value={flowGpm}
                      onChange={(e) => setFlowGpm(e.target.value)}
                      placeholder="GPM..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                      GPM
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Liters / min</div>
                      <div className="text-sm font-mono font-bold text-cyan-300">
                        {gpmToLpm(numFlowGpm).toLocaleString(undefined, { maximumFractionDigits: 1 })} L/m
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Barrels / min</div>
                      <div className="text-sm font-mono font-bold text-white">
                        {(numFlowGpm / 42).toFixed(2)} bpm
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volume Conversion */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Fluid Volume:</span>
                  <span className="font-mono text-cyan-400 text-[11px]">Barrels (bbl)</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="relative col-span-1">
                    <input
                      type="number"
                      value={volumeBbl}
                      onChange={(e) => setVolumeBbl(e.target.value)}
                      placeholder="bbl..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none font-mono">
                      bbl
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Cubic Meters</div>
                      <div className="text-sm font-mono font-bold text-cyan-300">
                        {bblToM3(numVolumeBbl).toFixed(2)} m³
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">US Gallons</div>
                      <div className="text-sm font-mono font-bold text-white">
                        {Math.round(numVolumeBbl * 42).toLocaleString()} gal
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                1 bbl = 42 US gallons = 0.158987 m³ = 158.987 Liters
              </div>
            </div>
          )}

        </div>

        {/* Footer Summary / Quick Reference Table */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exact API Spec 5ST & ISO 13628 Factors</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold transition-colors"
          >
            Close Utility
          </button>
        </div>
      </div>
    </div>
  );
};
