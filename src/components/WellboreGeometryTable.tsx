import React, { useState, useMemo } from 'react';
import { WellboreSurveyStation, UnitSystem } from '../types/coiledTubing';
import { 
  calculateMinimumCurvature, 
  ftToM, 
  mToFt 
} from '../utils/engineeringCalculations';
import { SURVEY_PRESET_COLLECTION } from '../data/presets';
import { 
  Compass, 
  Plus, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Sliders, 
  TrendingUp, 
  Layers,
  ArrowRight,
  Info,
  Maximize2,
  Sparkles
} from 'lucide-react';

interface WellboreGeometryTableProps {
  stations: WellboreSurveyStation[];
  onChange: (updatedStations: WellboreSurveyStation[]) => void;
  unitSystem: UnitSystem;
  currentDepthFt?: number;
}

export const WellboreGeometryTable: React.FC<WellboreGeometryTableProps> = ({
  stations,
  onChange,
  unitSystem,
  currentDepthFt,
}) => {
  const isMetric = unitSystem === 'metric';
  const [autoCalcTvd, setAutoCalcTvd] = useState<boolean>(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [activePresetKey, setActivePresetKey] = useState<string>('deep_slanted');
  const [viewTab, setViewTab] = useState<'profile' | 'dls'>('profile');

  // Compute calculated trajectory stations (TVD, DLS, Horizontal Displacement)
  const computedStations = useMemo(() => {
    if (autoCalcTvd) {
      return calculateMinimumCurvature(stations);
    }
    return stations;
  }, [stations, autoCalcTvd]);

  // Trajectory Summary KPIs
  const summary = useMemo(() => {
    if (!computedStations || computedStations.length === 0) {
      return { totalMd: 0, totalTvd: 0, maxInc: 0, maxDls: 0, totalVs: 0 };
    }
    const last = computedStations[computedStations.length - 1];
    const totalMd = last.measuredDepthFt;
    const totalTvd = last.trueVerticalDepthFt;
    const totalVs = last.horizontalDisplacementFt ?? 0;
    const maxInc = Math.max(...computedStations.map((s) => s.inclinationDeg));
    const maxDls = Math.max(...computedStations.map((s) => s.doglegSeverityDegPer100ft ?? 0));
    return { totalMd, totalTvd, maxInc, maxDls, totalVs };
  }, [computedStations]);

  // Update a single station field
  const handleUpdateStation = (index: number, updates: Partial<WellboreSurveyStation>) => {
    const updated = computedStations.map((st, i) => {
      if (i !== index) return st;
      const next = { ...st, ...updates };
      // Station 0 is locked at Surface 0 MD
      if (i === 0) {
        next.measuredDepthFt = 0;
        next.trueVerticalDepthFt = 0;
      }
      return next;
    });

    if (autoCalcTvd) {
      const recalculated = calculateMinimumCurvature(updated);
      onChange(recalculated);
    } else {
      onChange(updated);
    }
  };

  // Add station below
  const handleAddStationBelow = (index: number) => {
    const prev = computedStations[index];
    const nextSt = computedStations[index + 1];
    
    // Default new MD: either midpoint or prev + 1000 ft
    const newMd = nextSt 
      ? Math.round((prev.measuredDepthFt + nextSt.measuredDepthFt) / 2)
      : prev.measuredDepthFt + 1000;
    const newInc = nextSt ? Math.round((prev.inclinationDeg + nextSt.inclinationDeg) / 2) : prev.inclinationDeg;

    const newStation: WellboreSurveyStation = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      measuredDepthFt: newMd,
      trueVerticalDepthFt: prev.trueVerticalDepthFt + 800,
      inclinationDeg: newInc,
      horizontalDisplacementFt: (prev.horizontalDisplacementFt ?? 0) + 400,
      description: `Station @ ${newMd} ft`,
    };

    const newStationsList = [
      ...computedStations.slice(0, index + 1),
      newStation,
      ...computedStations.slice(index + 1),
    ];

    const recalculated = autoCalcTvd ? calculateMinimumCurvature(newStationsList) : newStationsList;
    onChange(recalculated);
    setSelectedStationId(newStation.id);
  };

  // Add station at the end
  const handleAddStationAtEnd = () => {
    const last = computedStations[computedStations.length - 1];
    const newMd = last ? last.measuredDepthFt + 1500 : 1000;
    const newStation: WellboreSurveyStation = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      measuredDepthFt: newMd,
      trueVerticalDepthFt: (last?.trueVerticalDepthFt ?? 0) + 1000,
      inclinationDeg: last ? last.inclinationDeg : 45,
      description: `Extended TD @ ${newMd} ft`,
    };

    const newStationsList = [...computedStations, newStation];
    const recalculated = autoCalcTvd ? calculateMinimumCurvature(newStationsList) : newStationsList;
    onChange(recalculated);
    setSelectedStationId(newStation.id);
  };

  // Duplicate station
  const handleDuplicateStation = (index: number) => {
    const target = computedStations[index];
    const newStation: WellboreSurveyStation = {
      ...target,
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      measuredDepthFt: target.measuredDepthFt + 500,
      description: `${target.description || 'Station'} (Copy)`,
    };

    const newStationsList = [
      ...computedStations.slice(0, index + 1),
      newStation,
      ...computedStations.slice(index + 1),
    ];

    const recalculated = autoCalcTvd ? calculateMinimumCurvature(newStationsList) : newStationsList;
    onChange(recalculated);
  };

  // Remove station
  const handleRemoveStation = (index: number) => {
    if (index === 0) return; // Cannot delete surface
    if (computedStations.length <= 2) return; // Keep at least 2 stations

    const newStationsList = computedStations.filter((_, i) => i !== index);
    const recalculated = autoCalcTvd ? calculateMinimumCurvature(newStationsList) : newStationsList;
    onChange(recalculated);
    if (selectedStationId === computedStations[index]?.id) {
      setSelectedStationId(null);
    }
  };

  // Apply preset
  const handleApplyPreset = (presetKey: string) => {
    const preset = SURVEY_PRESET_COLLECTION[presetKey];
    if (!preset) return;
    setActivePresetKey(presetKey);
    const calculated = calculateMinimumCurvature(preset.stations);
    onChange(calculated);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const header = 'Station,MD_ft,TVD_ft,Inclination_deg,DLS_deg_per_100ft,Displacement_ft,Description\n';
    const rows = computedStations
      .map(
        (s, idx) =>
          `${idx + 1},${s.measuredDepthFt},${s.trueVerticalDepthFt},${s.inclinationDeg},${s.doglegSeverityDegPer100ft ?? 0},${s.horizontalDisplacementFt ?? 0},"${s.description || ''}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wellbore_survey_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from CSV text
  const handleImportCsvSubmit = () => {
    try {
      const lines = csvInput.trim().split('\n');
      if (lines.length < 2) return;

      const parsedStations: WellboreSurveyStation[] = [];
      const dataLines = lines.slice(1);

      dataLines.forEach((line, index) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 4) {
          // Format: Station, MD, TVD, Inc, [DLS, Disp, Desc]
          const md = parseFloat(parts[1]);
          const tvd = parseFloat(parts[2]);
          const inc = parseFloat(parts[3]);
          const desc = parts[6] || parts[4] || `Station ${index + 1}`;

          if (!isNaN(md) && !isNaN(inc)) {
            parsedStations.push({
              id: `imported-${index}-${Date.now()}`,
              measuredDepthFt: Math.max(0, md),
              trueVerticalDepthFt: !isNaN(tvd) ? tvd : 0,
              inclinationDeg: Math.max(0, Math.min(180, inc)),
              description: desc,
            });
          }
        }
      });

      if (parsedStations.length >= 2) {
        // Ensure first station is at 0
        parsedStations[0].measuredDepthFt = 0;
        parsedStations[0].trueVerticalDepthFt = 0;
        const recalculated = autoCalcTvd ? calculateMinimumCurvature(parsedStations) : parsedStations;
        onChange(recalculated);
        setShowImportModal(false);
        setCsvInput('');
      }
    } catch {
      // Invalid format handling
    }
  };

  // SVG Visual Dimensions
  const svgWidth = 720;
  const svgHeight = 340;
  const padLeft = 70;
  const padRight = 40;
  const padTop = 35;
  const padBottom = 45;

  const maxPlotTvd = Math.max(1000, summary.totalTvd * 1.12);
  const maxPlotVs = Math.max(1000, summary.totalVs * 1.15);

  const scaleVsX = (vs: number) => padLeft + (vs / maxPlotVs) * (svgWidth - padLeft - padRight);
  const scaleTvdY = (tvd: number) => padTop + (tvd / maxPlotTvd) * (svgHeight - padTop - padBottom);

  // SVG Trajectory Path
  const trajectoryPath = useMemo(() => {
    if (computedStations.length < 2) return '';
    return computedStations
      .map((st, i) => {
        const x = scaleVsX(st.horizontalDisplacementFt ?? 0);
        const y = scaleTvdY(st.trueVerticalDepthFt);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [computedStations, maxPlotTvd, maxPlotVs]);

  // Color helper for inclination
  const getIncColor = (inc: number) => {
    if (inc < 15) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (inc < 45) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    if (inc < 75) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (inc <= 92) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  };

  const getDlsColor = (dls: number) => {
    if (dls <= 2.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (dls <= 5.0) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-5 p-5">
      {/* Top Header & Preset Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Custom Wellbore Geometry & Trajectory
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                Real-Time Forces Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Define directional survey stations (MD, TVD, Inclination). Forces, drag, and buckling recalculate live.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Minimum Curvature Auto-Calc Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoCalcTvd;
              setAutoCalcTvd(next);
              if (next) {
                onChange(calculateMinimumCurvature(stations));
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              autoCalcTvd
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically compute TVD, DLS and Horizontal Departure using Minimum Curvature formula"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Calc TVD (Min Curvature)</span>
            <span className={`w-2 h-2 rounded-full ${autoCalcTvd ? 'bg-cyan-400' : 'bg-slate-600'}`} />
          </button>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-all"
            title="Import survey points from CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-all"
            title="Export survey stations to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Add Station */}
          <button
            type="button"
            onClick={handleAddStationAtEnd}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Station</span>
          </button>
        </div>
      </div>

      {/* Trajectory Preset Quick Selectors */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Sliders className="w-3 h-3 text-slate-500" />
          Trajectory Presets:
        </span>
        {Object.entries(SURVEY_PRESET_COLLECTION).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleApplyPreset(key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
              activePresetKey === key
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total MD */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Total Measured Depth</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
            {isMetric
              ? `${Math.round(ftToM(summary.totalMd)).toLocaleString()} m`
              : `${Math.round(summary.totalMd).toLocaleString()} ft`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">String end / Well TD</div>
        </div>

        {/* Total TVD */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">True Vertical Depth (TVD)</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {isMetric
              ? `${Math.round(ftToM(summary.totalTvd)).toLocaleString()} m`
              : `${Math.round(summary.totalTvd).toLocaleString()} ft`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Hydrostatic vertical depth</div>
        </div>

        {/* Max Inclination */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Max Inclination (&theta;)</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {summary.maxInc.toFixed(1)}&deg;
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary.maxInc < 15 ? 'Vertical Well' : summary.maxInc >= 85 ? 'Horizontal Well' : 'Deviated Well'}
          </div>
        </div>

        {/* Max DLS */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Max Dogleg Severity</div>
          <div className={`text-lg font-bold font-mono mt-0.5 ${summary.maxDls > 5 ? 'text-rose-400' : summary.maxDls > 2.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {summary.maxDls.toFixed(2)}&deg;/{isMetric ? '30m' : '100ft'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {summary.maxDls > 5 ? 'Severe Curvature' : summary.maxDls > 2.5 ? 'Moderate Build' : 'Gentle / Smooth'}
          </div>
        </div>

        {/* Total Departure (VS) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 font-medium">Horizontal Departure (Reach)</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {isMetric
              ? `${Math.round(ftToM(summary.totalVs)).toLocaleString()} m`
              : `${Math.round(summary.totalVs).toLocaleString()} ft`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Reach from surface wellhead</div>
        </div>
      </div>

      {/* Visual Trajectory Cross-Section Plot (Vertical Section & DLS) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Wellbore Vertical Section Profile (TVD vs Departure)
            </span>
            <span className="text-[11px] text-slate-500">
              Interactive geometry path with station nodes
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span className="text-slate-400 text-[11px]">Well Path</span>
            </div>
            {currentDepthFt !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                <span className="text-slate-400 text-[11px]">
                  CT Bit ({isMetric ? `${Math.round(ftToM(currentDepthFt))} m` : `${Math.round(currentDepthFt)} ft`})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="relative w-full overflow-x-auto bg-slate-950/90 rounded-lg border border-slate-800/80">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[340px] select-none"
          >
            <defs>
              {/* Trajectory gradient based on build progress */}
              <linearGradient id="wellboreTrajectoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="40%" stopColor="#06b6d4" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              {/* Grid pattern */}
              <pattern id="gridPattern" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect
              x={padLeft}
              y={padTop}
              width={svgWidth - padLeft - padRight}
              height={svgHeight - padTop - padBottom}
              fill="url(#gridPattern)"
              opacity="0.6"
            />

            {/* Depth (TVD) Axis Lines and Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const tvdVal = frac * maxPlotTvd;
              const y = scaleTvdY(tvdVal);
              const label = isMetric
                ? `${Math.round(ftToM(tvdVal))}m`
                : `${Math.round(tvdVal)}ft`;
              return (
                <g key={`tvd-axis-${frac}`}>
                  <line
                    x1={padLeft - 6}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray={frac === 0 ? undefined : '3 3'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Departure (VS) Axis Lines and Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const vsVal = frac * maxPlotVs;
              const x = scaleVsX(vsVal);
              const label = isMetric
                ? `${Math.round(ftToM(vsVal))}m`
                : `${Math.round(vsVal)}ft`;
              return (
                <g key={`vs-axis-${frac}`}>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={svgHeight - padBottom + 6}
                    stroke="#334155"
                    strokeDasharray={frac === 0 ? undefined : '3 3'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={x}
                    y={svgHeight - padBottom + 18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Axis Title Labels */}
            <text
              x={padLeft - 45}
              y={svgHeight / 2}
              transform={`rotate(-90, ${padLeft - 45}, ${svgHeight / 2})`}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
            >
              TVD {isMetric ? '(m)' : '(ft)'} &darr;
            </text>

            <text
              x={padLeft + (svgWidth - padLeft - padRight) / 2}
              y={svgHeight - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="bold"
            >
              Horizontal Departure / Reach {isMetric ? '(m)' : '(ft)'} &rarr;
            </text>

            {/* Casing Bore Outline (outer glow) */}
            <path
              d={trajectoryPath}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="10"
              strokeOpacity="0.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Trajectory Main Path */}
            <path
              d={trajectoryPath}
              fill="none"
              stroke="url(#wellboreTrajectoryGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Station Nodes */}
            {computedStations.map((st, idx) => {
              const x = scaleVsX(st.horizontalDisplacementFt ?? 0);
              const y = scaleTvdY(st.trueVerticalDepthFt);
              const isSelected = selectedStationId === st.id;
              const isHovered = hoveredStationId === st.id;

              return (
                <g
                  key={st.id}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelectedStationId(st.id)}
                  onMouseEnter={() => setHoveredStationId(st.id)}
                  onMouseLeave={() => setHoveredStationId(null)}
                >
                  {/* Outer ring on active / hover */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="#06b6d4"
                      fillOpacity="0.25"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      className="animate-pulse"
                    />
                  )}

                  {/* Core marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : 4.5}
                    fill={idx === 0 ? '#38bdf8' : idx === computedStations.length - 1 ? '#10b981' : isSelected ? '#f59e0b' : '#0f172a'}
                    stroke={isSelected ? '#f59e0b' : '#38bdf8'}
                    strokeWidth="2"
                  />

                  {/* Station Label Badge */}
                  <text
                    x={x + 8}
                    y={y - 8}
                    fill={isSelected ? '#fde68a' : '#cbd5e1'}
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    #{idx + 1} {st.inclinationDeg}&deg;
                  </text>
                </g>
              );
            })}

            {/* Rig / Surface Wellhead icon at top left */}
            <g transform={`translate(${scaleVsX(0)}, ${scaleTvdY(0)})`}>
              <polygon points="-8,-4 8,-4 0,-18" fill="#38bdf8" />
              <rect x="-3" y="-4" width="6" height="4" fill="#0284c7" />
              <text x="12" y="-6" fill="#38bdf8" fontSize="9" fontWeight="bold">
                Surface RKB
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Interactive Survey Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Survey Stations Table ({computedStations.length} Stations)
            </span>
            <span className="text-[11px] text-slate-400">
              Edit any MD or Inclination cell to immediately update forces
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[11px]">Station 1 locked at Surface 0</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-bold min-w-[140px]">Zone / Tag</th>
                <th className="py-2.5 px-3 font-bold min-w-[110px]">
                  MD {isMetric ? '(m)' : '(ft)'}
                </th>
                <th className="py-2.5 px-3 font-bold min-w-[110px]">
                  TVD {isMetric ? '(m)' : '(ft)'}
                </th>
                <th className="py-2.5 px-3 font-bold min-w-[130px]">
                  Inclination (&theta;)
                </th>
                <th className="py-2.5 px-3 font-bold min-w-[110px]">
                  DLS {isMetric ? '(&deg;/30m)' : '(&deg;/100ft)'}
                </th>
                <th className="py-2.5 px-3 font-bold min-w-[110px]">
                  Departure {isMetric ? '(m)' : '(ft)'}
                </th>
                <th className="py-2.5 px-3 font-bold text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {computedStations.map((st, index) => {
                const isSelected = selectedStationId === st.id;
                const isHovered = hoveredStationId === st.id;
                const isSurface = index === 0;

                return (
                  <tr
                    key={st.id}
                    onClick={() => setSelectedStationId(st.id)}
                    onMouseEnter={() => setHoveredStationId(st.id)}
                    onMouseLeave={() => setHoveredStationId(null)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-2 border-l-cyan-400'
                        : isHovered
                        ? 'bg-slate-900/50'
                        : 'hover:bg-slate-900/30'
                    }`}
                  >
                    {/* Station Number */}
                    <td className="py-2 px-3 text-center text-slate-400 text-xs font-semibold">
                      {index + 1}
                    </td>

                    {/* Zone / Tag Description */}
                    <td className="py-2 px-3 font-sans">
                      <input
                        type="text"
                        value={st.description || ''}
                        placeholder={`Station ${index + 1}`}
                        onChange={(e) => handleUpdateStation(index, { description: e.target.value })}
                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-cyan-500 focus:bg-slate-900/80 rounded px-1.5 py-1 text-slate-200 text-xs focus:outline-none"
                      />
                    </td>

                    {/* Measured Depth (MD) */}
                    <td className="py-2 px-3">
                      {isSurface ? (
                        <span className="text-slate-400 font-semibold px-2 py-1 block">0</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={
                              isMetric
                                ? Math.round(ftToM(st.measuredDepthFt))
                                : st.measuredDepthFt
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const ftVal = isMetric ? mToFt(val) : val;
                              handleUpdateStation(index, { measuredDepthFt: Math.max(0, ftVal) });
                            }}
                            className="w-24 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded px-2 py-1 text-cyan-300 font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}
                    </td>

                    {/* True Vertical Depth (TVD) */}
                    <td className="py-2 px-3">
                      {autoCalcTvd ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded border border-slate-800 text-slate-300">
                          <span>
                            {isMetric
                              ? Math.round(ftToM(st.trueVerticalDepthFt)).toLocaleString()
                              : Math.round(st.trueVerticalDepthFt).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-cyan-400/80 font-sans uppercase">auto</span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="100"
                          disabled={isSurface}
                          value={
                            isMetric
                              ? Math.round(ftToM(st.trueVerticalDepthFt))
                              : st.trueVerticalDepthFt
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const ftVal = isMetric ? mToFt(val) : val;
                            handleUpdateStation(index, { trueVerticalDepthFt: Math.max(0, ftVal) });
                          }}
                          className="w-24 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Inclination (Deg) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="180"
                          step="1"
                          value={st.inclinationDeg}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateStation(index, {
                              inclinationDeg: Math.max(0, Math.min(180, val)),
                            });
                          }}
                          className="w-16 bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded px-2 py-1 text-amber-300 font-mono text-xs focus:outline-none"
                        />
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getIncColor(
                            st.inclinationDeg
                          )}`}
                        >
                          {st.inclinationDeg}&deg;
                        </span>
                      </div>
                    </td>

                    {/* Dogleg Severity (DLS) */}
                    <td className="py-2 px-3">
                      {isSurface ? (
                        <span className="text-slate-500 text-xs px-2">-</span>
                      ) : (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getDlsColor(
                            st.doglegSeverityDegPer100ft ?? 0
                          )}`}
                        >
                          {(st.doglegSeverityDegPer100ft ?? 0).toFixed(2)}&deg;
                        </span>
                      )}
                    </td>

                    {/* Horizontal Displacement (VS) */}
                    <td className="py-2 px-3 text-slate-300 text-xs">
                      {isMetric
                        ? `${Math.round(ftToM(st.horizontalDisplacementFt ?? 0)).toLocaleString()}`
                        : `${Math.round(st.horizontalDisplacementFt ?? 0).toLocaleString()}`}
                    </td>

                    {/* Row Action Buttons */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Insert Station Below */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStationBelow(index);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Insert station below"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateStation(index);
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                          title="Duplicate station"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete (disabled for surface station) */}
                        <button
                          type="button"
                          disabled={isSurface || computedStations.length <= 2}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStation(index);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isSurface || computedStations.length <= 2
                              ? 'text-slate-600 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                          }`}
                          title={isSurface ? 'Surface station cannot be deleted' : 'Delete station'}
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Import Directional Survey CSV
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste comma-separated survey rows. Expected columns:
              <br />
              <code className="text-cyan-300 font-mono text-[11px] block mt-1 bg-slate-950 p-2 rounded border border-slate-800">
                Station#, MD (ft), TVD (ft), Inclination (deg), DLS, Displacement, Description
              </code>
            </p>

            <textarea
              rows={8}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={`1, 0, 0, 0, 0, 0, Surface\n2, 3500, 3500, 0, 0, 0, KOP\n3, 6500, 6200, 45, 1.5, 1100, Build Mid\n4, 9000, 7800, 65, 0.8, 3100, EOC\n5, 14500, 10100, 65, 0, 8000, TD`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsvSubmit}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
              >
                Apply Survey Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
