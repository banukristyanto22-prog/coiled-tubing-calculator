import React, { useState } from 'react';
import { FieldFatigueStep, FieldJointData, UnitSystem, CoiledTubingString } from '../../types/coiledTubing';
import { calculateIntervalFatigue } from '../../utils/fatigueFileHandler';
import {
  Edit3,
  Layers,
  GitCommit,
  Sliders,
  Plus,
  Trash2,
  Save,
  X,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Gauge,
  Calculator,
  Wand2
} from 'lucide-react';

interface FatigueManualEditorProps {
  isOpen: boolean;
  onClose: () => void;
  fieldSteps: FieldFatigueStep[];
  fieldJoints: FieldJointData[];
  baseJoints: FieldJointData[];
  onUpdateStep: (idx: number, field: keyof FieldFatigueStep, value: any) => void;
  onAddStep: () => void;
  onDeleteStep: (idx: number) => void;
  onUpdateJoint: (idx: number, field: keyof FieldJointData, value: any) => void;
  onAddJoint: () => void;
  onDeleteJoint: (idx: number) => void;
  onApplyMultiplier: () => void;
  onApplyOffset: (delta: number) => void;
  onFixContiguity: () => void;
  multiplierInput: number;
  setMultiplierInput: (val: number) => void;
  onSaveToLocalStorage: () => void;
  unitSystem: UnitSystem;
  totalLengthFt: number;
  ct?: CoiledTubingString;
  onAutoCalculateAllFatigue?: () => void;
  onAutoCalculateBiasWelds?: (stripLengthFt?: number) => void;
}

export const FatigueManualEditor: React.FC<FatigueManualEditorProps> = ({
  isOpen,
  onClose,
  fieldSteps,
  fieldJoints,
  baseJoints,
  onUpdateStep,
  onAddStep,
  onDeleteStep,
  onUpdateJoint,
  onAddJoint,
  onDeleteJoint,
  onApplyMultiplier,
  onApplyOffset,
  onFixContiguity,
  multiplierInput,
  setMultiplierInput,
  onSaveToLocalStorage,
  unitSystem,
  totalLengthFt,
  ct,
  onAutoCalculateAllFatigue,
  onAutoCalculateBiasWelds,
}) => {
  const isMetric = unitSystem === 'metric';
  const unitLabel = isMetric ? 'm' : 'ft';
  const mult = isMetric ? 0.3048 : 1.0;
  const pressUnit = isMetric ? 'bar' : 'psi';
  const pressMult = isMetric ? 0.0689476 : 1.0;

  const [editorTab, setEditorTab] = useState<'intervals' | 'joints' | 'batch'>('intervals');
  const [showFullOperationalCols, setShowFullOperationalCols] = useState<boolean>(true);
  const [showWeldSpacingOptions, setShowWeldSpacingOptions] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeJointsList = fieldJoints.length > 0 ? fieldJoints : baseJoints;

  const handleCalcSingleStep = (idx: number) => {
    const step = fieldSteps[idx];
    if (!step) return;
    const calc = calculateIntervalFatigue(step, ct);
    onUpdateStep(idx, 'bendingPct', calc.bendingPct);
    onUpdateStep(idx, 'h2sPct', calc.h2sPct);
    onUpdateStep(idx, 'estFatiguePct', calc.estFatiguePct);
  };

  return (
    <div className="p-4 bg-slate-900 border border-emerald-700/60 rounded-xl space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            Field Inspection Manual Editor & Calibration
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
            Live Field Data
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveToLocalStorage}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Browser</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-tabs & View Toggle */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 gap-3">
        <div className="flex text-xs font-medium gap-4">
          <button
            type="button"
            onClick={() => setEditorTab('intervals')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              editorTab === 'intervals'
                ? 'border-emerald-400 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fatigue Intervals ({fieldSteps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('joints')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              editorTab === 'joints'
                ? 'border-fuchsia-400 text-fuchsia-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Bias Welds & Joints ({activeJointsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorTab('batch')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              editorTab === 'batch'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Batch Calibrate & Scale</span>
          </button>
        </div>

        {editorTab === 'intervals' && (
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setShowFullOperationalCols(!showFullOperationalCols)}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border transition-colors ${
                showFullOperationalCols
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>{showFullOperationalCols ? 'Hide Field Operational Columns' : 'Show Field Operational Columns (Fluid, Press, WHP, Rate)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Intervals */}
      {editorTab === 'intervals' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="text-slate-400">
              Adjust depth intervals, operational fluid/pressures, and measured fatigue values:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAutoCalculateAllFatigue}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"
                title="Automatically compute % Bending, % H2S, and Est. Fatigue (%) for all intervals based on cyclic bending strain and operational pressures"
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Calculate Fatigue</span>
              </button>
              <button
                type="button"
                onClick={onAddStep}
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-medium flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add Interval</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-80 rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2 w-8">#</th>
                  <th className="p-2">Start ({unitLabel})</th>
                  <th className="p-2">End ({unitLabel})</th>
                  {showFullOperationalCols && (
                    <>
                      <th className="p-2">Type Fluid</th>
                      <th className="p-2">Circ Press ({pressUnit})</th>
                      <th className="p-2">WHP ({pressUnit})</th>
                      <th className="p-2">Weight (lbs)</th>
                      <th className="p-2">Pump Rate (bpm)</th>
                      <th className="p-2">N2 Rate (scfm)</th>
                    </>
                  )}
                  <th className="p-2">Bending %</th>
                  <th className="p-2">H₂S %</th>
                  <th className="p-2 text-right">Est Fatigue %</th>
                  <th className="p-2">Zone / Notes</th>
                  <th className="p-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {fieldSteps.map((step, idx) => {
                  const sDisp = Math.round(step.startFt * mult);
                  const eDisp = Math.round(step.endFt * mult);
                  const pCircDisp = step.circulatingPressurePsi !== undefined ? Math.round(step.circulatingPressurePsi * pressMult) : '';
                  const pWhpDisp = step.wellheadPressurePsi !== undefined ? Math.round(step.wellheadPressurePsi * pressMult) : '';

                  return (
                    <tr key={step.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={sDisp}
                          onChange={(e) => onUpdateStep(idx, 'startFt', Number(e.target.value) / mult)}
                          className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={eDisp}
                          onChange={(e) => onUpdateStep(idx, 'endFt', Number(e.target.value) / mult)}
                          className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>

                      {showFullOperationalCols && (
                        <>
                          <td className="p-1">
                            <input
                              type="text"
                              value={step.fluidType || ''}
                              placeholder="e.g. Water, 15% HCl"
                              onChange={(e) => onUpdateStep(idx, 'fluidType', e.target.value)}
                              className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-cyan-300 font-sans focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={pCircDisp}
                              placeholder="psi"
                              onChange={(e) => onUpdateStep(idx, 'circulatingPressurePsi', Number(e.target.value) / pressMult)}
                              className="w-18 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-amber-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={pWhpDisp}
                              placeholder="psi"
                              onChange={(e) => onUpdateStep(idx, 'wellheadPressurePsi', Number(e.target.value) / pressMult)}
                              className="w-18 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-orange-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={step.hookloadWeightLbs || ''}
                              placeholder="lbs"
                              onChange={(e) => onUpdateStep(idx, 'hookloadWeightLbs', Number(e.target.value))}
                              className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.1"
                              value={step.pumpRateBpm ?? ''}
                              placeholder="bpm"
                              onChange={(e) => onUpdateStep(idx, 'pumpRateBpm', Number(e.target.value))}
                              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-emerald-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="50"
                              value={step.n2RateScfm ?? ''}
                              placeholder="scfm"
                              onChange={(e) => onUpdateStep(idx, 'n2RateScfm', Number(e.target.value))}
                              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-blue-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                        </>
                      )}

                      <td className="p-1">
                        <input
                          type="number"
                          step="0.1"
                          value={step.bendingPct}
                          onChange={(e) => onUpdateStep(idx, 'bendingPct', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          step="0.1"
                          value={step.h2sPct}
                          onChange={(e) => onUpdateStep(idx, 'h2sPct', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="p-1 text-right">
                        <input
                          type="number"
                          step="0.1"
                          value={step.estFatiguePct}
                          onChange={(e) => onUpdateStep(idx, 'estFatiguePct', parseFloat(e.target.value) || 0)}
                          className={`w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-right font-bold focus:outline-none focus:border-cyan-500 ${
                            step.estFatiguePct > 20 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={step.zoneName || ''}
                          placeholder="Zone description"
                          onChange={(e) => onUpdateStep(idx, 'zoneName', e.target.value)}
                          className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-sans focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCalcSingleStep(idx)}
                            className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                            title="Auto-calculate % Bending, % H2S, and Est. Fatigue for this interval"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStep(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Delete interval"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Joints & Bias Welds */}
      {editorTab === 'joints' && (
        <div className="space-y-3">
          <div className="p-3 bg-fuchsia-950/20 border border-fuchsia-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-fuchsia-300">
              <GitCommit className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <span>
                <strong>Bias Weld Coordinates Automation:</strong> Calculates weld locations from factory strip segments or standard mill strip intervals with API 5ST 1.25 derating.
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {activeJointsList.length} Bias Welds Configured
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <span className="text-slate-400">
              Bias weld joints along string ({activeJointsList.length} defined):
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowWeldSpacingOptions(!showWeldSpacingOptions)}
                  className="px-2.5 py-1 bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-800 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  title="Automatically calculate bias weld coordinates along string length"
                >
                  <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Auto-Calculate Bias Welds</span>
                </button>
                {showWeldSpacingOptions && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-slate-950 border border-fuchsia-700 rounded-xl p-2.5 shadow-2xl space-y-1.5 w-64 text-xs font-mono">
                    <div className="text-[11px] text-fuchsia-300 font-bold px-1">Generate Weld Coordinates:</div>
                    <button
                      type="button"
                      onClick={() => {
                        onAutoCalculateBiasWelds && onAutoCalculateBiasWelds();
                        setShowWeldSpacingOptions(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-fuchsia-950/80 text-slate-200 flex items-center justify-between"
                    >
                      <span>Factory MTR Strip Segments</span>
                      <span className="text-fuchsia-400 text-[10px]">Recommended</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAutoCalculateBiasWelds && onAutoCalculateBiasWelds(2000);
                        setShowWeldSpacingOptions(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-fuchsia-950/80 text-slate-200"
                    >
                      <span>Equidistant: Every 2,000 ft (610 m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAutoCalculateBiasWelds && onAutoCalculateBiasWelds(2500);
                        setShowWeldSpacingOptions(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-fuchsia-950/80 text-slate-200"
                    >
                      <span>Equidistant: Every 2,500 ft (762 m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAutoCalculateBiasWelds && onAutoCalculateBiasWelds(3000);
                        setShowWeldSpacingOptions(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-fuchsia-950/80 text-slate-200"
                    >
                      <span>Equidistant: Every 3,000 ft (914 m)</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onAddJoint}
                className="px-2.5 py-1 bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-800 rounded text-xs font-medium flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add Bias Weld</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2">Weld ID</th>
                  <th className="p-2">Location ({unitLabel})</th>
                  <th className="p-2">Strip #</th>
                  <th className="p-2">Heat #</th>
                  <th className="p-2">Wall Thk ({isMetric ? 'mm' : 'in'})</th>
                  <th className="p-2">Joint Factor</th>
                  <th className="p-2 text-right">Field Joint Fatigue %</th>
                  <th className="p-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {activeJointsList.map((joint, idx) => (
                  <tr key={joint.id || idx} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-2 text-fuchsia-400 font-bold">{joint.id}</td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={Math.round(joint.locationFt * mult)}
                        onChange={(e) => onUpdateJoint(idx, 'locationFt', Number(e.target.value) / mult)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={joint.stripNo}
                        onChange={(e) => onUpdateJoint(idx, 'stripNo', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={joint.heatNumber}
                        onChange={(e) => onUpdateJoint(idx, 'heatNumber', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="0.001"
                        value={isMetric ? (joint.wallThicknessIn * 25.4).toFixed(2) : joint.wallThicknessIn}
                        onChange={(e) =>
                          onUpdateJoint(
                            idx,
                            'wallThicknessIn',
                            isMetric ? Number(e.target.value) / 25.4 : Number(e.target.value)
                          )
                        }
                        className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="0.05"
                        value={joint.jointFactor}
                        onChange={(e) => onUpdateJoint(idx, 'jointFactor', Number(e.target.value))}
                        className="w-18 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={joint.overrideJointFatiguePct !== undefined ? joint.overrideJointFatiguePct : ''}
                        placeholder="Auto"
                        onChange={(e) =>
                          onUpdateJoint(
                            idx,
                            'overrideJointFatiguePct',
                            e.target.value === '' ? undefined : parseFloat(e.target.value)
                          )
                        }
                        className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-right text-fuchsia-300 font-bold"
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteJoint(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Batch Calibration */}
      {editorTab === 'batch' && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <label className="text-xs font-semibold text-white block">Scale All Fatigue by Factor</label>
              <p className="text-[11px] text-slate-400">
                Useful after corrosive jobs, acid pumpings, or high-pressure cycles (e.g. 1.15 = +15% fatigue damage).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="3.0"
                  value={multiplierInput}
                  onChange={(e) => setMultiplierInput(parseFloat(e.target.value) || 1.0)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={onApplyMultiplier}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
                >
                  Apply Multiplier
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <label className="text-xs font-semibold text-white block">Uniform Quick Offset</label>
              <p className="text-[11px] text-slate-400">
                Add or subtract a fixed fatigue percentage across all intervals.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApplyOffset(1.0)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-mono"
                >
                  +1.0%
                </button>
                <button
                  type="button"
                  onClick={() => onApplyOffset(2.0)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-mono"
                >
                  +2.0%
                </button>
                <button
                  type="button"
                  onClick={() => onApplyOffset(-1.0)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-mono"
                >
                  -1.0%
                </button>
                <button
                  type="button"
                  onClick={onFixContiguity}
                  className="px-3 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs font-semibold ml-auto"
                >
                  Normalize Depths (0 to {Math.round(totalLengthFt * mult)} {unitLabel})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
