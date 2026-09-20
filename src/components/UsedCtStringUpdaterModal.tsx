import React, { useState } from 'react';
import { CoiledTubingString, UnitSystem, UsedCondition, CorrosionPittingGrade, WorkingWeldType } from '../types/coiledTubing';
import { 
  inToMm, 
  mmToIn, 
  ftToM, 
  mToFt, 
  psiToMpa, 
  lbfToKn, 
  calculateUsedConditionComparison 
} from '../utils/engineeringCalculations';
import { useToast } from '../context/ToastContext';
import { 
  Wrench, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Scissors, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  X, 
  Sliders, 
  Flame, 
  Info,
  ChevronRight
} from 'lucide-react';

interface UsedCtStringUpdaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  ct: CoiledTubingString;
  onUpdateString: (updatedString: CoiledTubingString) => void;
  unitSystem: UnitSystem;
}

export const UsedCtStringUpdaterModal: React.FC<UsedCtStringUpdaterModalProps> = ({
  isOpen,
  onClose,
  ct,
  onUpdateString,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const { addToast } = useToast();

  const initialCondition: UsedCondition = ct.usedCondition || {
    enabled: true,
    wallLossPercent: 8.0,
    diametralGrowthPercent: 1.2,
    actualOvalityPercent: 1.8,
    fatigueLifeUsedPercent: 42.0,
    corrosionPittingGrade: 'light',
    hasWeldInSection: false,
    weldType: 'none',
    weldEfficiencyFactor: 1.0,
    h2sExposure: false,
    notes: 'Field inspected after 30 jobs',
  };

  const [condition, setCondition] = useState<UsedCondition>(initialCondition);
  const [cumulativeTrips, setCumulativeTrips] = useState<number>(32);
  const [cumulativeJobs, setCumulativeJobs] = useState<number>(18);
  const [spooledFootageFt, setSpooledFootageFt] = useState<number>(Math.round(ct.totalLengthFt * 28));

  // Wet-End Cut-Off (Cropping) Tool
  const [cutOffLengthFt, setCutOffLengthFt] = useState<number>(0);
  const [cutOffNotes, setCutOffNotes] = useState<string>('Routine 500 ft wet-end crop to remove high-cycle fatigue zone');

  // Compute live derating
  const comparison = calculateUsedConditionComparison(ct, 0, 0.80, { ...condition, enabled: true });

  if (!isOpen) return null;

  const handleApplyUpdate = () => {
    // Calculate new total string length if wet end was cut off
    const croppedLengthFt = Math.max(1000, ct.totalLengthFt - cutOffLengthFt);
    const croppedLengthM = ftToM(croppedLengthFt);

    // Calculate updated wall and OD
    const nominalWallIn = ct.wallThicknessIn;
    const nominalOdIn = ct.outerDiameterIn;

    const deratedWallIn = nominalWallIn * (1 - condition.wallLossPercent / 100);
    const deratedOdIn = nominalOdIn * (1 + condition.diametralGrowthPercent / 100);
    const deratedIdIn = deratedOdIn - 2 * deratedWallIn;

    // Reset fatigue slightly if significant wet end was cropped
    let newFatiguePercent = condition.fatigueLifeUsedPercent;
    if (cutOffLengthFt >= 300) {
      newFatiguePercent = Math.max(10, newFatiguePercent - (cutOffLengthFt / 500) * 12);
    }

    const updatedString: CoiledTubingString = {
      ...ct,
      totalLengthFt: Math.round(croppedLengthFt),
      totalLengthM: Math.round(croppedLengthM),
      usedCondition: {
        ...condition,
        enabled: true,
        fatigueLifeUsedPercent: Math.round(newFatiguePercent * 10) / 10,
        notes: cutOffLengthFt > 0 
          ? `Wet-end cropped by ${cutOffLengthFt} ft. ${condition.notes || ''}`
          : condition.notes,
      },
    };

    onUpdateString(updatedString);

    addToast({
      title: 'Used CT String Updated',
      message: `Updated ${ct.name}: Wall loss ${condition.wallLossPercent.toFixed(1)}%, Ballooning +${condition.diametralGrowthPercent.toFixed(1)}%, Fatigue ${newFatiguePercent.toFixed(0)}%${cutOffLengthFt > 0 ? `, Cropped ${cutOffLengthFt} ft` : ''}.`,
      severity: comparison.isRetired ? 'error' : 'success',
      autoDismissMs: 5000,
    });

    onClose();
  };

  const handleApplyPreset = (type: 'light' | 'moderate' | 'severe' | 'milling' | 'factory') => {
    if (type === 'factory') {
      setCondition({
        enabled: false,
        wallLossPercent: 0,
        diametralGrowthPercent: 0,
        actualOvalityPercent: 0.5,
        fatigueLifeUsedPercent: 0,
        corrosionPittingGrade: 'none',
        hasWeldInSection: false,
        weldType: 'none',
        weldEfficiencyFactor: 1.0,
        h2sExposure: false,
        notes: 'Factory pristine string (0 cycles)',
      });
      setCumulativeTrips(0);
      setCumulativeJobs(0);
      setCutOffLengthFt(0);
      return;
    }

    if (type === 'light') {
      setCondition({
        enabled: true,
        wallLossPercent: 4.0,
        diametralGrowthPercent: 0.6,
        actualOvalityPercent: 1.2,
        fatigueLifeUsedPercent: 25.0,
        corrosionPittingGrade: 'light',
        hasWeldInSection: false,
        weldType: 'none',
        weldEfficiencyFactor: 1.0,
        h2sExposure: false,
        notes: 'Lightly used (12 Nitrogen / Cleanout jobs)',
      });
      setCumulativeTrips(16);
      setCumulativeJobs(12);
      return;
    }

    if (type === 'moderate') {
      setCondition({
        enabled: true,
        wallLossPercent: 9.5,
        diametralGrowthPercent: 1.4,
        actualOvalityPercent: 2.2,
        fatigueLifeUsedPercent: 54.0,
        corrosionPittingGrade: 'moderate',
        hasWeldInSection: true,
        weldType: 'bias',
        weldEfficiencyFactor: 0.90,
        h2sExposure: false,
        notes: 'Active field workhorse string with bias weld',
      });
      setCumulativeTrips(44);
      setCumulativeJobs(28);
      return;
    }

    if (type === 'severe') {
      setCondition({
        enabled: true,
        wallLossPercent: 16.5,
        diametralGrowthPercent: 2.8,
        actualOvalityPercent: 3.8,
        fatigueLifeUsedPercent: 78.0,
        corrosionPittingGrade: 'severe',
        hasWeldInSection: true,
        weldType: 'orbital',
        weldEfficiencyFactor: 0.80,
        h2sExposure: true,
        notes: 'Heavily degraded sour gas acidizing string near retirement',
      });
      setCumulativeTrips(75);
      setCumulativeJobs(48);
      return;
    }

    if (type === 'milling') {
      setCondition({
        enabled: true,
        wallLossPercent: 12.0,
        diametralGrowthPercent: 1.8,
        actualOvalityPercent: 2.8,
        fatigueLifeUsedPercent: 68.0,
        corrosionPittingGrade: 'moderate',
        hasWeldInSection: true,
        weldType: 'bias',
        weldEfficiencyFactor: 0.90,
        h2sExposure: false,
        notes: 'Scale cleanout & milling string with high vibration history',
      });
      setCumulativeTrips(58);
      setCumulativeJobs(35);
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-cyan-950/70 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Update Used Coiled Tubing String
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-cyan-300 border border-blue-700 font-semibold">
                  API RP 5C7 / ICoTA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Apply real-world pipe wear, ballooning growth, fatigue cycles, or wet-end cropping to{' '}
                <strong className="text-white">{ct.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* 1. Quick Presets Bar */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Field Condition Presets:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('factory')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all"
              >
                <div className="font-semibold text-cyan-400">Factory Pristine</div>
                <div className="text-[10px] text-slate-500">0% wear, 0% fatigue</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('light')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all"
              >
                <div className="font-semibold text-emerald-400">Lightly Used</div>
                <div className="text-[10px] text-slate-500">4% wall, 25% fatigue</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('moderate')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all"
              >
                <div className="font-semibold text-amber-400">Mid-Life Active</div>
                <div className="text-[10px] text-slate-500">9.5% wall, 54% fatigue</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('milling')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all"
              >
                <div className="font-semibold text-rose-400">Milling String</div>
                <div className="text-[10px] text-slate-500">12% wall, 68% fatigue</div>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('severe')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-rose-900/50 text-left transition-all"
              >
                <div className="font-semibold text-red-400">Near Retirement</div>
                <div className="text-[10px] text-slate-500">16.5% wall, 78% fatigue</div>
              </button>
            </div>
          </div>

          {/* 2. Measured Physical Degradation Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wall Loss % */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Wall Thickness Loss (%)</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                  condition.wallLossPercent > 18 
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700' 
                    : condition.wallLossPercent > 10 
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-700' 
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                }`}>
                  {condition.wallLossPercent.toFixed(1)}%
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({(ct.wallThicknessIn * (1 - condition.wallLossPercent / 100)).toFixed(4)}")
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={condition.wallLossPercent}
                onChange={(e) => setCondition({ ...condition, wallLossPercent: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (Nominal {ct.wallThicknessIn}")</span>
                <span className="text-amber-500">12.5% (Derate)</span>
                <span className="text-rose-500">20% (API RP 5C7 Discard)</span>
              </div>
            </div>

            {/* Diametral Ballooning % */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Diametral Ballooning Growth (%)</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded text-xs bg-cyan-950 text-cyan-300 border border-cyan-800">
                  +{condition.diametralGrowthPercent.toFixed(2)}%
                  <span className="text-[10px] text-slate-400 ml-1">
                    (+{(ct.outerDiameterIn * condition.diametralGrowthPercent / 100 * 1000).toFixed(1)} thou)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4.0"
                step="0.1"
                value={condition.diametralGrowthPercent}
                onChange={(e) => setCondition({ ...condition, diametralGrowthPercent: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (Nominal {ct.outerDiameterIn}")</span>
                <span>CIRCA Limit: 62.5 thou</span>
                <span className="text-rose-400">4.0% Max</span>
              </div>
            </div>

            {/* Fatigue Life Used % */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Cumulative Fatigue Consumed (%)</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                  condition.fatigueLifeUsedPercent > 80 
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700' 
                    : condition.fatigueLifeUsedPercent > 50 
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-700' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {condition.fatigueLifeUsedPercent.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={condition.fatigueLifeUsedPercent}
                onChange={(e) => setCondition({ ...condition, fatigueLifeUsedPercent: parseFloat(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (New)</span>
                <span className="text-amber-400">50% (Inspect)</span>
                <span className="text-rose-400">80% (Safe Cutoff)</span>
                <span className="text-red-500">100% (Fracture)</span>
              </div>
            </div>

            {/* Ovality % */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Measured Ovality (%)</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded text-xs bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {condition.actualOvalityPercent.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="6.0"
                step="0.2"
                value={condition.actualOvalityPercent}
                onChange={(e) => setCondition({ ...condition, actualOvalityPercent: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% Circular</span>
                <span>API 5C7 Limit: 5.0%</span>
                <span className="text-rose-400">6.0% Severe</span>
              </div>
            </div>
          </div>

          {/* 3. Operational History & Welds */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Cumulative Jobs Run</label>
              <input
                type="number"
                min="0"
                value={cumulativeJobs}
                onChange={(e) => setCumulativeJobs(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Total Trips (In + Out)</label>
              <input
                type="number"
                min="0"
                value={cumulativeTrips}
                onChange={(e) => setCumulativeTrips(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Working Weld Present</label>
              <select
                value={condition.weldType}
                onChange={(e) => {
                  const val = e.target.value as WorkingWeldType;
                  setCondition({
                    ...condition,
                    weldType: val,
                    hasWeldInSection: val !== 'none',
                    weldEfficiencyFactor: val === 'none' ? 1.0 : val === 'bias' ? 0.90 : 0.80,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
              >
                <option value="none">None (Seamless Base Pipe)</option>
                <option value="bias">Bias Weld (90% Efficiency)</option>
                <option value="orbital">Orbital Butt Weld (80% Efficiency)</option>
                <option value="manual">Manual Field Repair (70% Efficiency)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Corrosion Pitting Grade</label>
              <select
                value={condition.corrosionPittingGrade}
                onChange={(e) => setCondition({ ...condition, corrosionPittingGrade: e.target.value as CorrosionPittingGrade })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
              >
                <option value="none">None (Smooth Bore)</option>
                <option value="light">Light (&lt; 0.2 mm pits)</option>
                <option value="moderate">Moderate (0.2 - 0.6 mm pits)</option>
                <option value="severe">Severe (&gt; 0.6 mm deep pits)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="h2sExposure"
                checked={condition.h2sExposure}
                onChange={(e) => setCondition({ ...condition, h2sExposure: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4"
              />
              <label htmlFor="h2sExposure" className="text-xs text-slate-300 font-medium cursor-pointer">
                H2S Sour Service Exposure
              </label>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Inspection Reference</label>
              <input
                type="text"
                value={condition.notes || ''}
                onChange={(e) => setCondition({ ...condition, notes: e.target.value })}
                placeholder="e.g. Yard NDT ultrasonic scan batch #4402"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* 4. Wet-End Cut-Off (Cropping) Tool */}
          <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Wet-End Cut-Off (Cropping Tool)
                </span>
              </div>
              <span className="text-[11px] text-cyan-300 font-mono">
                Current Length: {ct.totalLengthFt.toLocaleString()} ft ({Math.round(ct.totalLengthM).toLocaleString()} m)
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              The wet end of a CT string experiences the highest number of bending cycles through the guide arch.
              Cropping 300 to 1,000 ft removes this high-fatigue section and restores safe operational life.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Cut-Off Length ({isMetric ? 'meters' : 'feet'})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={ct.totalLengthFt - 1000}
                    step={isMetric ? '25' : '100'}
                    value={cutOffLengthFt}
                    onChange={(e) => setCutOffLengthFt(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-cyan-300 font-bold text-xs"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCutOffLengthFt(0)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] hover:bg-slate-700"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutOffLengthFt(500)}
                      className="px-2 py-1 rounded bg-blue-900 text-cyan-300 text-[10px] hover:bg-blue-800"
                    >
                      500 ft
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutOffLengthFt(1000)}
                      className="px-2 py-1 rounded bg-blue-900 text-cyan-300 text-[10px] hover:bg-blue-800"
                    >
                      1,000 ft
                    </button>
                  </div>
                </div>
              </div>

              {cutOffLengthFt > 0 && (
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-emerald-400 flex items-center justify-between">
                    <span>New Total Length:</span>
                    <strong>{(ct.totalLengthFt - cutOffLengthFt).toLocaleString()} ft</strong>
                  </div>
                  <div className="text-cyan-400 flex items-center justify-between">
                    <span>Weight Removed:</span>
                    <strong>~{Math.round(cutOffLengthFt * 3.8).toLocaleString()} lbs</strong>
                  </div>
                  <div className="text-amber-400 flex items-center justify-between">
                    <span>Wet-End Fatigue Reset:</span>
                    <strong>&minus;{Math.min(30, Math.round((cutOffLengthFt / 500) * 12))}% peak relief</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Real-Time Derated Limits Preview */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs uppercase tracking-wide">
                Derated Working Envelope Limits vs Factory Nominal
              </span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                comparison.isRetired 
                  ? 'bg-rose-900 text-rose-200 border border-rose-600' 
                  : comparison.retirementStatus === 'caution'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              }`}>
                STATUS: {comparison.retirementStatus.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Burst Pressure</div>
                <div className="text-sm font-bold text-amber-400">
                  {Math.round(isMetric ? psiToMpa(comparison.usedLimits.yieldBurstPressurePsi) : comparison.usedLimits.yieldBurstPressurePsi).toLocaleString()} {isMetric ? 'MPa' : 'psi'}
                </div>
                <div className="text-[9px] text-slate-500">
                  Nominal: {Math.round(isMetric ? psiToMpa(comparison.nominalLimits.yieldBurstPressurePsi) : comparison.nominalLimits.yieldBurstPressurePsi).toLocaleString()}
                </div>
              </div>

              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Collapse Resistance</div>
                <div className="text-sm font-bold text-rose-400">
                  {Math.round(isMetric ? psiToMpa(comparison.usedLimits.ovalityDeratedCollapsePsi) : comparison.usedLimits.ovalityDeratedCollapsePsi).toLocaleString()} {isMetric ? 'MPa' : 'psi'}
                </div>
                <div className="text-[9px] text-slate-500">
                  Nominal: {Math.round(isMetric ? psiToMpa(comparison.nominalLimits.ovalityDeratedCollapsePsi) : comparison.nominalLimits.ovalityDeratedCollapsePsi).toLocaleString()}
                </div>
              </div>

              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Tensile Yield Load</div>
                <div className="text-sm font-bold text-cyan-400">
                  {Math.round(isMetric ? lbfToKn(comparison.usedLimits.tensileYieldLbf) : comparison.usedLimits.tensileYieldLbf).toLocaleString()} {isMetric ? 'kN' : 'lbf'}
                </div>
                <div className="text-[9px] text-slate-500">
                  Nominal: {Math.round(isMetric ? lbfToKn(comparison.nominalLimits.tensileYieldLbf) : comparison.nominalLimits.tensileYieldLbf).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyUpdate}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/40 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply &amp; Update CT String</span>
          </button>
        </div>
      </div>
    </div>
  );
};
