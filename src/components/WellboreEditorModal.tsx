import React, { useState } from 'react';
import { WellboreProfile, CasingSection, PerforatedInterval } from '../types/wellbore';
import { WELLBORE_PRESETS } from '../data/wellborePresets';
import { UnitSystem } from '../types/coiledTubing';
import { 
  ftToM, 
  mToFt, 
  inToMm, 
  mmToIn, 
  psiToMpa, 
  ppgToSg 
} from '../utils/engineeringCalculations';
import { useToast } from '../context/ToastContext';
import { 
  Compass, 
  Plus, 
  Trash2, 
  Layers, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Activity, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface WellboreEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: WellboreProfile;
  onSaveProfile: (profile: WellboreProfile) => void;
  unitSystem: UnitSystem;
}

export const WellboreEditorModal: React.FC<WellboreEditorModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const { addToast } = useToast();

  const [profile, setProfile] = useState<WellboreProfile>(currentProfile);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentProfile.id || 'deep_gas_vertical');
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'casing' | 'perfs' | 'completion'>('general');

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    const found = WELLBORE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setProfile(JSON.parse(JSON.stringify(found)));
      setSelectedPresetId(presetId);
    }
  };

  const handleUpdateCasing = (id: string, field: keyof CasingSection, value: any) => {
    setProfile((prev) => ({
      ...prev,
      casingSections: prev.casingSections.map((cs) => 
        cs.id === id ? { ...cs, [field]: value } : cs
      ),
    }));
  };

  const handleAddCasing = () => {
    const last = profile.casingSections[profile.casingSections.length - 1];
    const newTop = last ? last.bottomDepthFt : 0;
    const newSection: CasingSection = {
      id: `csg-${Date.now()}`,
      name: 'New Casing Section',
      type: 'production_casing',
      topDepthFt: newTop,
      bottomDepthFt: newTop + 2000,
      outerDiameterIn: 5.5,
      innerDiameterIn: 4.778,
      driftDiameterIn: 4.653,
      weightLbFt: 20.0,
      grade: 'P-110',
      frictionCoefficient: 0.25,
      isCemented: true,
    };
    setProfile((prev) => ({
      ...prev,
      casingSections: [...prev.casingSections, newSection],
      totalDepthMdFt: Math.max(prev.totalDepthMdFt, newSection.bottomDepthFt),
    }));
  };

  const handleDeleteCasing = (id: string) => {
    if (profile.casingSections.length <= 1) {
      addToast({
        title: 'Cannot Delete',
        message: 'A wellbore must have at least one casing section.',
        severity: 'warning',
      });
      return;
    }
    setProfile((prev) => ({
      ...prev,
      casingSections: prev.casingSections.filter((cs) => cs.id !== id),
    }));
  };

  const handleAddPerforation = () => {
    const newPerf: PerforatedInterval = {
      id: `perf-${Date.now()}`,
      formationName: 'Target Payzone',
      topDepthFt: Math.round(profile.totalDepthMdFt * 0.85),
      bottomDepthFt: Math.round(profile.totalDepthMdFt * 0.92),
      shotsPerFoot: 6,
      phaseDeg: 60,
      reservoirPressurePsi: Math.round(profile.bottomholePressurePsi * 0.95),
      inflowFluidType: 'gas',
    };
    setProfile((prev) => ({
      ...prev,
      perforations: [...prev.perforations, newPerf],
    }));
  };

  const handleDeletePerforation = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      perforations: prev.perforations.filter((p) => p.id !== id),
    }));
  };

  const handleSave = () => {
    onSaveProfile(profile);
    addToast({
      title: 'Wellbore Profile Updated',
      message: `Updated wellbore ${profile.wellName} with ${profile.casingSections.length} casing sections to ${Math.round(profile.totalDepthMdFt).toLocaleString()} ft TD.`,
      severity: 'success',
      autoDismissMs: 4500,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/70 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Wellbore Geometry &amp; Configuration Editor
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700 font-semibold">
                  Multi-String Casing Schedule
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure casing strings, liner hangers, perforations, packer setting depth, and wellhead pressures.
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

        {/* Preset Selector Bar */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Load Wellbore Preset:</span>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              {WELLBORE_PRESETS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => handleApplyPreset(wp.id)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    selectedPresetId === wp.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {wp.wellName.split(' ')[0]} ({Math.round(wp.totalDepthMdFt).toLocaleString()} ft)
                </button>
              ))}
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('general')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeSubTab === 'general' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              General &amp; Fluids
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('casing')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeSubTab === 'casing' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Casing Schedule ({profile.casingSections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('completion')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeSubTab === 'completion' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tubing &amp; Packer
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('perfs')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeSubTab === 'perfs' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Perforations ({profile.perforations.length})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* 1. General & Fluids View */}
          {activeSubTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Well Name</label>
                  <input
                    type="text"
                    value={profile.wellName}
                    onChange={(e) => setProfile({ ...profile, wellName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium"
                  />
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Field / Block</label>
                  <input
                    type="text"
                    value={profile.field}
                    onChange={(e) => setProfile({ ...profile, field: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Operator</label>
                  <input
                    type="text"
                    value={profile.operator}
                    onChange={(e) => setProfile({ ...profile, operator: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Wellhead Pressure (WHP)</label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      value={profile.wellheadPressurePsi}
                      onChange={(e) => setProfile({ ...profile, wellheadPressurePsi: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold"
                    />
                    <span className="text-slate-400 text-xs">psi</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Bottom Hole Pressure (BHP)</label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      value={profile.bottomholePressurePsi}
                      onChange={(e) => setProfile({ ...profile, bottomholePressurePsi: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-300 font-bold"
                    />
                    <span className="text-slate-400 text-xs">psi</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Well Fluid Density</label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      step="0.1"
                      value={profile.wellboreFluidDensityPpg}
                      onChange={(e) => setProfile({ ...profile, wellboreFluidDensityPpg: parseFloat(e.target.value) || 8.4 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-bold"
                    />
                    <span className="text-slate-400 text-xs">{isMetric ? 'SG' : 'ppg'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <label className="text-[11px] text-slate-400 font-semibold">Bottom Hole Temp (BHT)</label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      value={profile.bottomholeTemperatureF}
                      onChange={(e) => setProfile({ ...profile, bottomholeTemperatureF: parseFloat(e.target.value) || 150 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-300 font-bold"
                    />
                    <span className="text-slate-400 text-xs">&deg;F</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="text-[11px] text-slate-400 font-semibold">Wellbore Fluid System</label>
                <input
                  type="text"
                  value={profile.wellboreFluidType}
                  onChange={(e) => setProfile({ ...profile, wellboreFluidType: e.target.value })}
                  placeholder="e.g. 2% KCl Brine with Viscosified Friction Reducer Pill"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* 2. Casing Schedule View */}
          {activeSubTab === 'casing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Casing &amp; Liner Schedule (Surface to Total Depth)
                </span>
                <button
                  type="button"
                  onClick={handleAddCasing}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Casing String</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">Section Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Top ({isMetric ? 'm' : 'ft'})</th>
                      <th className="p-2.5">Shoe ({isMetric ? 'm' : 'ft'})</th>
                      <th className="p-2.5">OD (in)</th>
                      <th className="p-2.5">ID (in)</th>
                      <th className="p-2.5">Weight</th>
                      <th className="p-2.5">Grade</th>
                      <th className="p-2.5">Drag &mu;</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {profile.casingSections.map((cs) => (
                      <tr key={cs.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            value={cs.name}
                            onChange={(e) => handleUpdateCasing(cs.id, 'name', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-36"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={cs.type}
                            onChange={(e) => handleUpdateCasing(cs.id, 'type', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 text-xs"
                          >
                            <option value="conductor">Conductor</option>
                            <option value="surface">Surface</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="production_casing">Production</option>
                            <option value="liner">Liner</option>
                            <option value="open_hole">Open Hole</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cs.topDepthFt}
                            onChange={(e) => handleUpdateCasing(cs.id, 'topDepthFt', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-20"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={cs.bottomDepthFt}
                            onChange={(e) => handleUpdateCasing(cs.id, 'bottomDepthFt', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-20"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.125"
                            value={cs.outerDiameterIn}
                            onChange={(e) => handleUpdateCasing(cs.id, 'outerDiameterIn', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-16"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.001"
                            value={cs.innerDiameterIn}
                            onChange={(e) => handleUpdateCasing(cs.id, 'innerDiameterIn', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-18"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.5"
                            value={cs.weightLbFt}
                            onChange={(e) => handleUpdateCasing(cs.id, 'weightLbFt', parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs w-16"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={cs.grade}
                            onChange={(e) => handleUpdateCasing(cs.id, 'grade', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs w-20"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            max="0.6"
                            value={cs.frictionCoefficient}
                            onChange={(e) => handleUpdateCasing(cs.id, 'frictionCoefficient', parseFloat(e.target.value) || 0.24)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-300 text-xs w-16"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteCasing(cs.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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

          {/* 3. Tubing & Packer View */}
          {activeSubTab === 'completion' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wide">
                    Production Tubing String
                  </span>
                  <div className="space-y-2 font-mono">
                    <div>
                      <label className="text-[11px] text-slate-400 font-sans block mb-1">Tubing Outer Diameter</label>
                      <input
                        type="number"
                        step="0.125"
                        value={profile.tubingSections?.[0]?.outerDiameterIn || 3.5}
                        onChange={(e) => {
                          const od = parseFloat(e.target.value) || 3.5;
                          const cur = profile.tubingSections?.[0] || {
                            id: 'tb-1',
                            name: 'Production Tubing',
                            topDepthFt: 0,
                            bottomDepthFt: profile.packerDepthFt,
                            outerDiameterIn: 3.5,
                            innerDiameterIn: 2.992,
                            weightLbFt: 9.3,
                            grade: 'L-80',
                            frictionCoefficient: 0.22,
                          };
                          setProfile({
                            ...profile,
                            tubingSections: [{ ...cur, outerDiameterIn: od }],
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-sans block mb-1">Tubing Inner Diameter (ID)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={profile.tubingSections?.[0]?.innerDiameterIn || 2.992}
                        onChange={(e) => {
                          const id = parseFloat(e.target.value) || 2.992;
                          const cur = profile.tubingSections?.[0] || {
                            id: 'tb-1',
                            name: 'Production Tubing',
                            topDepthFt: 0,
                            bottomDepthFt: profile.packerDepthFt,
                            outerDiameterIn: 3.5,
                            innerDiameterIn: 2.992,
                            weightLbFt: 9.3,
                            grade: 'L-80',
                            frictionCoefficient: 0.22,
                          };
                          setProfile({
                            ...profile,
                            tubingSections: [{ ...cur, innerDiameterIn: id }],
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wide">
                    Downhole Completion Elements
                  </span>
                  <div className="space-y-2 font-mono">
                    <div>
                      <label className="text-[11px] text-slate-400 font-sans block mb-1">
                        Production Packer Setting Depth ({isMetric ? 'm' : 'ft'})
                      </label>
                      <input
                        type="number"
                        value={profile.packerDepthFt}
                        onChange={(e) => setProfile({ ...profile, packerDepthFt: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-sans block mb-1">
                        Subsurface Safety Valve (SSSV) Depth ({isMetric ? 'm' : 'ft'})
                      </label>
                      <input
                        type="number"
                        value={profile.sssvDepthFt || 800}
                        onChange={(e) => setProfile({ ...profile, sssvDepthFt: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Perforations View */}
          {activeSubTab === 'perfs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Perforated Intervals &amp; Inflow Zones
                </span>
                <button
                  type="button"
                  onClick={handleAddPerforation}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Perforated Interval</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">Formation</th>
                      <th className="p-2.5">Top ({isMetric ? 'm' : 'ft'})</th>
                      <th className="p-2.5">Bottom ({isMetric ? 'm' : 'ft'})</th>
                      <th className="p-2.5">Shots/ft</th>
                      <th className="p-2.5">Res Pressure (psi)</th>
                      <th className="p-2.5">Fluid</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {profile.perforations.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-2">
                          <input
                            type="text"
                            value={p.formationName}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].formationName = e.target.value;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-36"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={p.topDepthFt}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].topDepthFt = parseFloat(e.target.value) || 0;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={p.bottomDepthFt}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].bottomDepthFt = parseFloat(e.target.value) || 0;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={p.shotsPerFoot}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].shotsPerFoot = parseInt(e.target.value) || 4;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs w-16"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={p.reservoirPressurePsi}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].reservoirPressurePsi = parseFloat(e.target.value) || 0;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-300 text-xs w-24"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={p.inflowFluidType}
                            onChange={(e) => {
                              const next = [...profile.perforations];
                              next[idx].inflowFluidType = e.target.value as any;
                              setProfile({ ...profile, perforations: next });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs"
                          >
                            <option value="gas">Gas</option>
                            <option value="oil">Oil</option>
                            <option value="water">Water</option>
                            <option value="multiphase">Multiphase</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePerforation(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
            onClick={handleSave}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/40 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply &amp; Update Wellbore</span>
          </button>
        </div>
      </div>
    </div>
  );
};
