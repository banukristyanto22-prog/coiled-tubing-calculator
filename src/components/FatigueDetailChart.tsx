import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CoiledTubingString,
  UnitSystem,
  AchillesFatigueResult,
  FieldFatigueStep,
  FieldJointData
} from '../types/coiledTubing';
import { ftToM, inToMm, mToFt, mmToIn } from '../utils/engineeringCalculations';
import {
  exportFatigueToExcel,
  exportFatigueToCsv,
  exportFatigueToPdf,
  calculateIntervalFatigue,
  generateBiasWeldsFromCalculation
} from '../utils/fatigueFileHandler';
import { FatigueImportModal } from './fatigue/FatigueImportModal';
import { FatigueManualEditor } from './fatigue/FatigueManualEditor';
import {
  Download,
  Upload,
  Edit3,
  RotateCcw,
  Sliders,
  Info,
  AlertTriangle,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  GitCommit,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  Gauge,
  Droplet,
  Wind
} from 'lucide-react';

interface FatigueDetailChartProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  achilles: AchillesFatigueResult;
  tripsRun: number;
  internalPressurePsi: number;
  onUpdateTrips?: (trips: number) => void;
  onUpdatePressure?: (psi: number) => void;
  onSelectPreset?: (stringName: string) => void;
}

export const FatigueDetailChart: React.FC<FatigueDetailChartProps> = ({
  ct,
  unitSystem,
  achilles,
  tripsRun,
  internalPressurePsi,
  onUpdateTrips,
  onUpdatePressure,
  onSelectPreset,
}) => {
  const isMetric = unitSystem === 'metric';

  // String metadata
  const stringNo = ct.certificateRef?.stringNo || 'QT11918';
  const gradeDisplay = ct.grade === 'CT80' ? 'QT800' : ct.grade;
  const totalLengthFt = ct.totalLengthFt;

  // Chart view preferences
  const [chartTheme, setChartTheme] = useState<'classic' | 'dark'>('classic');
  const [h2sPpm, setH2sPpm] = useState<number>(0);
  const [selectedJointIndex, setSelectedJointIndex] = useState<number | null>(null);

  // Mouse hover tracking for exact coordinate readout
  const [hoverCoord, setHoverCoord] = useState<{ xFt: number; fatiguePct: number } | null>({
    xFt: 7182.885,
    fatiguePct: 102.736,
  });
  const [isHovering, setIsHovering] = useState<boolean>(false);

  // Data source mode: 'model' (Simulated Achilles 4.0) vs 'field' (Excel / CSV / Manual)
  const [dataSourceMode, setDataSourceMode] = useState<'model' | 'field'>('model');
  const [fieldSteps, setFieldSteps] = useState<FieldFatigueStep[]>([]);
  const [fieldJoints, setFieldJoints] = useState<FieldJointData[]>([]);
  const [fieldMeta, setFieldMeta] = useState<{
    fileName?: string;
    updatedAt?: string;
    note?: string;
  }>({});

  // UI state for modal & editor drawer
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isManualEditorOpen, setIsManualEditorOpen] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [multiplierInput, setMultiplierInput] = useState<number>(1.1);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load any previously saved field data from localStorage on mount or string change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ct_fatigue_field_${stringNo}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.steps && parsed.steps.length > 0) {
          setFieldSteps(parsed.steps);
          if (parsed.joints && parsed.joints.length > 0) {
            setFieldJoints(parsed.joints);
          }
          setFieldMeta({
            fileName: parsed.fileName || 'Cached Field Data',
            updatedAt: parsed.updatedAt || 'Previously Saved',
          });
          setDataSourceMode('field');
        }
      }
    } catch (e) {
      console.warn('Could not load saved field fatigue profile:', e);
    }
  }, [stringNo]);

  // Exact internal volume calculation in barrels (bbl)
  const avgWallIn = ct.wallThicknessIn;
  const innerDiamIn = Math.max(0.2, ct.outerDiameterIn - 2 * avgWallIn);
  const internalVolBbl = useMemo(() => {
    if (stringNo === 'QT11918' || Math.abs(totalLengthFt - 25327) < 10) {
      return 56.554;
    }
    const areaSqIn = Math.PI * Math.pow(innerDiamIn / 2, 2);
    const volCuFt = (areaSqIn / 144) * totalLengthFt;
    return volCuFt / 5.61458;
  }, [stringNo, innerDiamIn, totalLengthFt]);

  // Baseline joints from certificate segments or default standard spacing
  const baseJoints = useMemo<FieldJointData[]>(() => {
    if (ct.certificateRef?.segments && ct.certificateRef.segments.length > 0) {
      let cumulativeLength = 0;
      return ct.certificateRef.segments.map((seg, idx) => {
        cumulativeLength += seg.lengthFt;
        return {
          id: `Joint #${idx + 1}`,
          locationFt: cumulativeLength,
          stripNo: seg.stripNo,
          wallThicknessIn: seg.wallThicknessIn,
          heatNumber: seg.heatNo,
          jointFactor: 1.25,
        };
      });
    }

    // Default reference bias welds for QT11918 (25,327 ft)
    return [
      { id: 'Joint #1', locationFt: 3624, stripNo: 'QT-S1', wallThicknessIn: 0.109, heatNumber: 'H91821', jointFactor: 1.25 },
      { id: 'Joint #2', locationFt: 5892, stripNo: 'QT-S2', wallThicknessIn: 0.109, heatNumber: 'H91822', jointFactor: 1.25 },
      { id: 'Joint #3', locationFt: 8945, stripNo: 'QT-S3', wallThicknessIn: 0.125, heatNumber: 'H91823', jointFactor: 1.25 },
      { id: 'Joint #4', locationFt: 11980, stripNo: 'QT-S4', wallThicknessIn: 0.125, heatNumber: 'H91824', jointFactor: 1.25 },
      { id: 'Joint #5', locationFt: 14720, stripNo: 'QT-S5', wallThicknessIn: 0.125, heatNumber: 'H91825', jointFactor: 1.25 },
      { id: 'Joint #6', locationFt: 18240, stripNo: 'QT-S6', wallThicknessIn: 0.134, heatNumber: 'H91826', jointFactor: 1.25 },
      { id: 'Joint #7', locationFt: 21910, stripNo: 'QT-S7', wallThicknessIn: 0.134, heatNumber: 'H91827', jointFactor: 1.25 },
    ];
  }, [ct, totalLengthFt]);

  // Model-calculated fatigue intervals (Achilles 4.0 simulation)
  const modelSteps = useMemo<FieldFatigueStep[]>(() => {
    const baseMult = (tripsRun / 28) * (1 + (internalPressurePsi / 5000) * 0.4);
    const h2sMult = 1 + (h2sPpm / 5000) * 0.25;

    const intervals = [
      { start: 0, end: 5800, bend: 1.2, h2s: 0.1, zone: 'Reel Core / Surface Wraps', notes: 'Low cycling spooling' },
      { start: 5800, end: 8000, bend: 9.4, h2s: 0.7, zone: 'Primary Working Reciprocation Zone', notes: 'Peak gooseneck cycling' },
      { start: 8000, end: 12000, bend: 5.6, h2s: 0.4, zone: 'Mid-Well Section', notes: 'Intermediate passes' },
      { start: 12000, end: 13500, bend: 6.8, h2s: 0.5, zone: 'Perforation Depth Wash', notes: 'Sand washing passes' },
      { start: 13500, end: 17000, bend: 5.1, h2s: 0.3, zone: 'Lower Intermediate Section', notes: 'Circulation passes' },
      { start: 17000, end: totalLengthFt, bend: 1.2, h2s: 0.1, zone: 'Distal / BHA Section', notes: 'Lowest reel cycles' },
    ];

    return intervals.map((inv, idx) => {
      const bendPct = parseFloat((inv.bend * baseMult).toFixed(2));
      const h2sPct = parseFloat((inv.h2s * baseMult * h2sMult).toFixed(2));
      const estFatiguePct = parseFloat((bendPct + h2sPct).toFixed(2));

      return {
        id: `model-step-${idx + 1}`,
        startFt: inv.start,
        endFt: Math.min(totalLengthFt, inv.end),
        bendingPct: bendPct,
        h2sPct: h2sPct,
        estFatiguePct: estFatiguePct,
        zoneName: inv.zone,
        notes: inv.notes,
      };
    });
  }, [tripsRun, internalPressurePsi, h2sPpm, totalLengthFt]);

  // Active steps & joints based on mode
  const activeSteps = dataSourceMode === 'field' && fieldSteps.length > 0 ? fieldSteps : modelSteps;
  const activeJoints = dataSourceMode === 'field' && fieldJoints.length > 0 ? fieldJoints : baseJoints;

  // Overall peak fatigue statistics
  const peakFatiguePct = useMemo(() => {
    if (activeSteps.length === 0) return 0;
    return Math.max(...activeSteps.map((s) => s.estFatiguePct));
  }, [activeSteps]);

  const peakWorkingZone = useMemo(() => {
    if (activeSteps.length === 0) return 'None';
    const sorted = [...activeSteps].sort((a, b) => b.estFatiguePct - a.estFatiguePct);
    return `${Math.round(sorted[0].startFt).toLocaleString()} - ${Math.round(sorted[0].endFt).toLocaleString()} ft (${sorted[0].zoneName || 'Peak Zone'})`;
  }, [activeSteps]);

  // Feedback notification
  const triggerSaveFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // SVG Chart Geometry Constants
  const svgWidth = 980;
  const svgHeight = 490;
  const margin = { top: 35, right: 35, bottom: 55, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;
  const maxXFt = Math.max(totalLengthFt, 25327);

  const scaleX = (depthFt: number): number => {
    return margin.left + (depthFt / maxXFt) * plotWidth;
  };

  const scaleY = (fatiguePct: number): number => {
    const clamped = Math.max(0, Math.min(100, fatiguePct));
    return margin.top + plotHeight - (clamped / 100) * plotHeight;
  };

  const invertX = (px: number): number => {
    const clampedPx = Math.max(margin.left, Math.min(margin.left + plotWidth, px));
    const ratio = (clampedPx - margin.left) / plotWidth;
    return ratio * maxXFt;
  };

  const invertY = (py: number): number => {
    const clampedPy = Math.max(margin.top, Math.min(margin.top + plotHeight, py));
    const ratio = (margin.top + plotHeight - clampedPy) / plotHeight;
    return ratio * 100;
  };

  // SVG Mouse event handler for real-time coordinates
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleFactorX = svgWidth / rect.width;
    const scaleFactorY = svgHeight / rect.height;

    const mouseSvgX = (e.clientX - rect.left) * scaleFactorX;
    const mouseSvgY = (e.clientY - rect.top) * scaleFactorY;

    if (
      mouseSvgX >= margin.left &&
      mouseSvgX <= margin.left + plotWidth &&
      mouseSvgY >= margin.top &&
      mouseSvgY <= margin.top + plotHeight
    ) {
      setIsHovering(true);
      const xFt = invertX(mouseSvgX);
      const fatiguePct = invertY(mouseSvgY);
      setHoverCoord({ xFt, fatiguePct });
    } else {
      setIsHovering(false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  // Find step interval under hover cursor
  const activeHoverStep = useMemo(() => {
    if (!hoverCoord) return null;
    return activeSteps.find((s) => hoverCoord.xFt >= s.startFt && hoverCoord.xFt <= s.endFt);
  }, [hoverCoord, activeSteps]);

  // Stepped SVG Path Generators
  const estFatiguePath = useMemo(() => {
    if (activeSteps.length === 0) return '';
    let d = '';
    activeSteps.forEach((step, idx) => {
      const x1 = scaleX(step.startFt);
      const x2 = scaleX(step.endFt);
      const y = scaleY(step.estFatiguePct);
      if (idx === 0) {
        d += `M ${x1} ${y} L ${x2} ${y}`;
      } else {
        d += ` L ${x1} ${y} L ${x2} ${y}`;
      }
    });
    return d;
  }, [activeSteps, maxXFt]);

  const bendingFatiguePath = useMemo(() => {
    if (activeSteps.length === 0) return '';
    let d = '';
    activeSteps.forEach((step, idx) => {
      const x1 = scaleX(step.startFt);
      const x2 = scaleX(step.endFt);
      const y = scaleY(step.bendingPct);
      if (idx === 0) {
        d += `M ${x1} ${y} L ${x2} ${y}`;
      } else {
        d += ` L ${x1} ${y} L ${x2} ${y}`;
      }
    });
    return d;
  }, [activeSteps, maxXFt]);

  const h2sFatiguePath = useMemo(() => {
    if (activeSteps.length === 0) return '';
    let d = '';
    activeSteps.forEach((step, idx) => {
      const x1 = scaleX(step.startFt);
      const x2 = scaleX(step.endFt);
      const y = scaleY(step.h2sPct);
      if (idx === 0) {
        d += `M ${x1} ${y} L ${x2} ${y}`;
      } else {
        d += ` L ${x1} ${y} L ${x2} ${y}`;
      }
    });
    return d;
  }, [activeSteps, maxXFt]);

  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const minorYTicks = [2, 4, 6, 8, 12, 14, 16, 18, 22, 24, 26, 28, 32, 34, 36, 38, 42, 44, 46, 48, 52, 54, 56, 58, 62, 64, 66, 68, 72, 74, 76, 78, 82, 84, 86, 88, 92, 94, 96, 98];

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxXFt > 30000 ? 10000 : 5000;
    for (let x = 0; x <= maxXFt; x += step) {
      ticks.push(x);
    }
    return ticks;
  }, [maxXFt]);

  // Import handler
  const handleApplyImportedData = (
    steps: FieldFatigueStep[],
    joints: FieldJointData[],
    importedFileName: string
  ) => {
    setFieldSteps(steps);
    if (joints.length > 0) {
      setFieldJoints(joints);
    }
    setFieldMeta({
      fileName: importedFileName,
      updatedAt: new Date().toLocaleTimeString(),
    });
    setDataSourceMode('field');
    triggerSaveFeedback(`Imported ${steps.length} intervals with standard operational parameters.`);
  };

  // Manual Editor Handlers
  const handleUpdateStep = (idx: number, field: keyof FieldFatigueStep, value: any) => {
    const updated = [...fieldSteps];
    updated[idx] = { ...updated[idx], [field]: value };
    setFieldSteps(updated);
    setDataSourceMode('field');
  };

  const handleAddStep = () => {
    const lastStep = fieldSteps[fieldSteps.length - 1];
    const sFt = lastStep ? lastStep.endFt : 0;
    const eFt = Math.min(totalLengthFt, sFt + 2500);
    const newStep: FieldFatigueStep = {
      id: `step-${Date.now()}`,
      startFt: sFt,
      endFt: eFt,
      fluidType: 'Water with Friction Reducer',
      circulatingPressurePsi: 3200,
      wellheadPressurePsi: 1100,
      hookloadWeightLbs: 24000,
      pumpRateBpm: 1.8,
      n2RateScfm: 0,
      bendingPct: 3.5,
      h2sPct: 0.2,
      estFatiguePct: 3.7,
      zoneName: `Section ${fieldSteps.length + 1}`,
    };
    setFieldSteps([...fieldSteps, newStep]);
    setDataSourceMode('field');
  };

  const handleDeleteStep = (idx: number) => {
    setFieldSteps(fieldSteps.filter((_, i) => i !== idx));
  };

  const handleUpdateJoint = (idx: number, field: keyof FieldJointData, value: any) => {
    const updated = [...(fieldJoints.length > 0 ? fieldJoints : baseJoints)];
    updated[idx] = { ...updated[idx], [field]: value };
    setFieldJoints(updated);
    setDataSourceMode('field');
  };

  const handleAddJoint = () => {
    const currentJoints = fieldJoints.length > 0 ? fieldJoints : baseJoints;
    const newJoint: FieldJointData = {
      id: `Joint #${currentJoints.length + 1}`,
      locationFt: Math.round(totalLengthFt / 2),
      stripNo: `S-${currentJoints.length + 1}`,
      wallThicknessIn: ct.wallThicknessIn,
      heatNumber: `H-${91830 + currentJoints.length}`,
      jointFactor: 1.25,
      overrideJointFatiguePct: 5.0,
    };
    setFieldJoints([...currentJoints, newJoint]);
    setDataSourceMode('field');
  };

  const handleDeleteJoint = (idx: number) => {
    const currentJoints = fieldJoints.length > 0 ? fieldJoints : baseJoints;
    setFieldJoints(currentJoints.filter((_, i) => i !== idx));
  };

  const handleApplyMultiplier = () => {
    if (multiplierInput <= 0) return;
    const updated = fieldSteps.map((s) => ({
      ...s,
      bendingPct: parseFloat((s.bendingPct * multiplierInput).toFixed(2)),
      h2sPct: parseFloat((s.h2sPct * multiplierInput).toFixed(2)),
      estFatiguePct: parseFloat(Math.min(100, s.estFatiguePct * multiplierInput).toFixed(2)),
    }));
    setFieldSteps(updated);
    setDataSourceMode('field');
    triggerSaveFeedback(`Scaled fatigue across intervals by ${multiplierInput}x`);
  };

  const handleApplyOffset = (delta: number) => {
    const updated = fieldSteps.map((s) => ({
      ...s,
      bendingPct: parseFloat(Math.max(0, s.bendingPct + delta).toFixed(2)),
      estFatiguePct: parseFloat(Math.max(0, Math.min(100, s.estFatiguePct + delta)).toFixed(2)),
    }));
    setFieldSteps(updated);
    setDataSourceMode('field');
    triggerSaveFeedback(`Adjusted fatigue by ${delta >= 0 ? `+${delta}%` : `${delta}%`}`);
  };

  const handleFixContiguity = () => {
    if (fieldSteps.length === 0) return;
    const sorted = [...fieldSteps].sort((a, b) => a.startFt - b.startFt);
    sorted[0].startFt = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      sorted[i + 1].startFt = sorted[i].endFt;
    }
    if (sorted[sorted.length - 1].endFt < totalLengthFt) {
      sorted[sorted.length - 1].endFt = totalLengthFt;
    }
    setFieldSteps(sorted);
    triggerSaveFeedback('Normalized segment depths to be contiguous across full string.');
  };

  const handleSaveToLocalStorage = () => {
    try {
      const payload = {
        stringNo,
        steps: fieldSteps,
        joints: fieldJoints.length > 0 ? fieldJoints : baseJoints,
        fileName: fieldMeta.fileName || 'Manual Field Log',
        updatedAt: new Date().toLocaleString(),
      };
      localStorage.setItem(`ct_fatigue_field_${stringNo}`, JSON.stringify(payload));
      triggerSaveFeedback('Field fatigue data saved to local browser storage.');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePopulateFieldFromModel = () => {
    setFieldSteps(modelSteps);
    setFieldJoints(baseJoints);
    setDataSourceMode('field');
    setFieldMeta({
      fileName: 'Initialized from Achilles 4.0 Model',
      updatedAt: new Date().toLocaleTimeString(),
    });
    triggerSaveFeedback('Initialized field dataset from current model.');
  };

  const handleAutoCalculateAllFatigue = () => {
    const currentSteps = fieldSteps.length > 0 ? fieldSteps : modelSteps;
    const updated = currentSteps.map((s) => {
      const calc = calculateIntervalFatigue(s, ct);
      return {
        ...s,
        bendingPct: calc.bendingPct,
        h2sPct: calc.h2sPct,
        estFatiguePct: calc.estFatiguePct,
      };
    });
    setFieldSteps(updated);
    setDataSourceMode('field');
    triggerSaveFeedback(`Auto-calculated fatigue for ${updated.length} intervals based on cyclic strain & pressure.`);
  };

  const handleAutoCalculateBiasWelds = (stripLengthFt?: number) => {
    const joints = generateBiasWeldsFromCalculation(ct, stripLengthFt);
    setFieldJoints(joints);
    setDataSourceMode('field');
    triggerSaveFeedback(`Auto-calculated ${joints.length} bias weld coordinates along string length.`);
  };

  const handleResetToModel = () => {
    setDataSourceMode('model');
    triggerSaveFeedback('Switched to theoretical Achilles 4.0 model.');
  };

  const handleExportPdf = () => {
    try {
      exportFatigueToPdf(
        activeSteps,
        activeJoints,
        ct,
        stringNo,
        unitSystem,
        tripsRun,
        internalPressurePsi,
        h2sPpm
      );
      triggerSaveFeedback('Fatigue life PDF report generated and downloaded successfully!');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      triggerSaveFeedback('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleUpdateFatigue = () => {
    if (dataSourceMode === 'field') {
      // Recalculate field intervals with updated operating conditions / trip factor
      const updated = activeSteps.map((s) => ({
        ...s,
        estFatiguePct: Math.min(120, Number((s.bendingPct * (tripsRun / 24) * (1 + (h2sPpm / 5000) * 0.35)).toFixed(2))),
      }));
      setFieldSteps(updated);
      triggerSaveFeedback(`Field fatigue updated for ${tripsRun} trips @ ${internalPressurePsi} psi (${h2sPpm} ppm H2S).`);
    } else {
      triggerSaveFeedback(`Achilles 4.0 fatigue life profile refreshed for ${tripsRun} trips @ ${internalPressurePsi} psi.`);
    }
  };

  const handleIncrementTrips = (delta: number) => {
    const nextTrips = Math.max(1, tripsRun + delta);
    if (onUpdateTrips) {
      onUpdateTrips(nextTrips);
    }
    triggerSaveFeedback(`Trips updated to ${nextTrips} (+${delta} trips applied). Fatigue graph recalculated.`);
  };

  // Theming colors
  const isDark = chartTheme === 'dark';
  const bgColor = isDark ? '#020617' : '#ffffff';
  const plotBgColor = isDark ? '#0b1329' : '#f8fafc';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const minorGridColor = isDark ? '#0f172a' : '#f1f5f9';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const estLineColor = isDark ? '#ef4444' : '#dc2626';
  const bendingLineColor = isDark ? '#3b82f6' : '#2563eb';
  const h2sLineColor = isDark ? '#10b981' : '#059669';

  return (
    <div className="space-y-4">
      {/* Toast Feedback Notification */}
      {saveFeedback && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Control Ribbon */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active String & Source Indicator */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              <span className="text-slate-500">String:</span>
              <span className="text-cyan-400 font-bold">{stringNo}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-orange-400 font-semibold">{totalLengthFt.toLocaleString()} ft</span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setDataSourceMode('model')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  dataSourceMode === 'model'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Achilles 4.0 Model</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fieldSteps.length === 0) {
                    handlePopulateFieldFromModel();
                  } else {
                    setDataSourceMode('field');
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  dataSourceMode === 'field'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Field Actual Log</span>
                {dataSourceMode === 'field' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons: Import, Manual Edit, Export, Theme */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Update fatigue data from Excel or CSV file"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (fieldSteps.length === 0) {
                  setFieldSteps(modelSteps);
                  setFieldJoints(baseJoints);
                }
                setDataSourceMode('field');
                setIsManualEditorOpen(!isManualEditorOpen);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-sm ${
                isManualEditorOpen
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manual Editor</span>
              {isManualEditorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Export Dropdown */}
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => exportFatigueToExcel(activeSteps, activeJoints, stringNo, unitSystem)}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded text-xs flex items-center gap-1 font-mono transition-colors"
                title="Export current profile to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>.XLSX</span>
              </button>
              <button
                type="button"
                onClick={() => exportFatigueToCsv(activeSteps, stringNo, unitSystem)}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded text-xs flex items-center gap-1 font-mono transition-colors border-l border-slate-800"
                title="Export current profile to CSV (.csv)"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>.CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded text-xs flex items-center gap-1 font-mono transition-colors border-l border-slate-800"
                title="Export Fatigue Graph & Engineering Report to PDF (.pdf)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>.PDF</span>
              </button>
            </div>

            {/* Update Fatigue Action Button */}
            <button
              type="button"
              onClick={handleUpdateFatigue}
              className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Recalculate and update fatigue profile with current trips, pressure, and H2S"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Update Fatigue</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setChartTheme(isDark ? 'classic' : 'dark')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 text-xs"
              title={`Switch to ${isDark ? 'Classic White Plot' : 'Dark Mode Plot'}`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Secondary Bar: Active Source Info & Trips/H2S Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2">
            {dataSourceMode === 'field' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Active Source: Actual Field Log</span>
                {fieldMeta.fileName && <span className="text-slate-400">({fieldMeta.fileName})</span>}
                <span className="text-slate-500">&bull; {activeSteps.length} intervals</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/60">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Active Source: Achilles 4.0 Theoretical Model</span>
                <span className="text-slate-500">&bull; {tripsRun} trips @ {internalPressurePsi} psi</span>
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Quick Trip Cycle Increment Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
              <span className="text-slate-500 px-1 font-mono hidden sm:inline">Add Trips:</span>
              <button
                type="button"
                onClick={() => handleIncrementTrips(1)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-cyan-900 text-cyan-300 rounded font-mono transition-colors"
                title="Add 1 complete well trip and update fatigue profile"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handleIncrementTrips(5)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-cyan-900 text-cyan-300 rounded font-mono transition-colors"
                title="Add 5 well trips and update fatigue profile"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleIncrementTrips(10)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-cyan-900 text-cyan-300 rounded font-mono transition-colors"
                title="Add 10 well trips and update fatigue profile"
              >
                +10
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Trips:</span>
              <input
                type="range"
                min="1"
                max="120"
                value={tripsRun}
                onChange={(e) => onUpdateTrips && onUpdateTrips(Number(e.target.value))}
                className="w-16 accent-cyan-500 cursor-pointer"
              />
              <span className="text-white font-bold w-5 text-right text-[11px]">{tripsRun}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">H₂S:</span>
              <select
                value={h2sPpm}
                onChange={(e) => setH2sPpm(Number(e.target.value))}
                className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-white">0 ppm (Sweet)</option>
                <option value={500} className="bg-slate-900 text-white">500 ppm</option>
                <option value={2000} className="bg-slate-900 text-white">2,000 ppm</option>
                <option value={5000} className="bg-slate-900 text-white">5,000 ppm (Sour)</option>
              </select>
            </div>

            {dataSourceMode === 'field' && (
              <button
                type="button"
                onClick={handleResetToModel}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
                title="Reset to Achilles 4.0 model"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Model</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Input Interactive Editor Drawer (Collapsible) */}
      <FatigueManualEditor
        isOpen={isManualEditorOpen}
        onClose={() => setIsManualEditorOpen(false)}
        fieldSteps={fieldSteps}
        fieldJoints={fieldJoints}
        baseJoints={baseJoints}
        onUpdateStep={handleUpdateStep}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        onUpdateJoint={handleUpdateJoint}
        onAddJoint={handleAddJoint}
        onDeleteJoint={handleDeleteJoint}
        onApplyMultiplier={handleApplyMultiplier}
        onApplyOffset={handleApplyOffset}
        onFixContiguity={handleFixContiguity}
        multiplierInput={multiplierInput}
        setMultiplierInput={setMultiplierInput}
        onSaveToLocalStorage={handleSaveToLocalStorage}
        unitSystem={unitSystem}
        totalLengthFt={totalLengthFt}
        ct={ct}
        onAutoCalculateAllFatigue={handleAutoCalculateAllFatigue}
        onAutoCalculateBiasWelds={handleAutoCalculateBiasWelds}
      />

      {/* Import Modal */}
      <FatigueImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyData={handleApplyImportedData}
        unitSystem={unitSystem}
        stringNo={stringNo}
        ct={ct}
      />

      {/* Primary SVG Fatigue Plot Card */}
      <div
        className="rounded-2xl border shadow-2xl p-4 transition-all"
        style={{
          backgroundColor: bgColor,
          borderColor: isDark ? '#1e293b' : '#cbd5e1',
        }}
      >
        {/* Top Header of Chart */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-sm tracking-tight"
              style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            >
              Achilles 4.0 Fatigue Profile &mdash; {stringNo}
            </span>
            <span className="text-slate-400 text-xs">({gradeDisplay} &bull; {ct.outerDiameterIn.toFixed(3)}" OD)</span>
          </div>

          {/* Live Crosshair Readout */}
          {hoverCoord && (
            <div className="px-3 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-mono text-xs font-semibold shadow-inner flex items-center gap-2">
              <span className="text-slate-400">Position:</span>
              <span>
                {Math.round(hoverCoord.xFt * (isMetric ? 0.3048 : 1.0)).toLocaleString()} {isMetric ? 'm' : 'ft'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Fatigue:</span>
              <span className={hoverCoord.fatiguePct > 80 ? 'text-rose-400' : 'text-emerald-400'}>
                {hoverCoord.fatiguePct.toFixed(3)}%
              </span>
            </div>
          )}
        </div>

        {/* Live HUD Readout of Active Interval Operational Parameters */}
        {activeHoverStep && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Interval:</span>
              <span className="text-cyan-300 font-semibold">
                {Math.round(activeHoverStep.startFt * (isMetric ? 0.3048 : 1)).toLocaleString()} - {Math.round(activeHoverStep.endFt * (isMetric ? 0.3048 : 1)).toLocaleString()} {isMetric ? 'm' : 'ft'}
              </span>
              {activeHoverStep.zoneName && (
                <span className="text-slate-400">({activeHoverStep.zoneName})</span>
              )}
            </div>

            {/* Field Operational Badges if present */}
            <div className="flex items-center flex-wrap gap-2 text-[11px]">
              {activeHoverStep.fluidType && (
                <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  <Droplet className="w-3 h-3 text-cyan-400" />
                  <span>{activeHoverStep.fluidType}</span>
                </span>
              )}

              {activeHoverStep.circulatingPressurePsi !== undefined && (
                <span className="flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  <Gauge className="w-3 h-3 text-amber-400" />
                  <span>Circ: {activeHoverStep.circulatingPressurePsi.toLocaleString()} psi</span>
                  {activeHoverStep.wellheadPressurePsi !== undefined && (
                    <span className="text-slate-400">
                      (ΔP: {Math.max(0, activeHoverStep.circulatingPressurePsi - activeHoverStep.wellheadPressurePsi).toLocaleString()} psi)
                    </span>
                  )}
                </span>
              )}

              {activeHoverStep.hookloadWeightLbs !== undefined && (
                <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Wt: {activeHoverStep.hookloadWeightLbs.toLocaleString()} lbs
                </span>
              )}

              {activeHoverStep.pumpRateBpm !== undefined && (
                <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Pump: {activeHoverStep.pumpRateBpm} bpm
                </span>
              )}

              {activeHoverStep.n2RateScfm !== undefined && activeHoverStep.n2RateScfm > 0 && (
                <span className="flex items-center gap-1 text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  <Wind className="w-3 h-3 text-blue-400" />
                  <span>N₂: {activeHoverStep.n2RateScfm} scfm</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* SVG Container */}
        <div className="relative w-full overflow-hidden select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <pattern id="minorGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke={minorGridColor} strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Plot Background */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill={plotBgColor}
            />

            {/* Minor Y-Axis Tick Grid Lines */}
            {minorYTicks.map((val) => {
              const y = scaleY(val);
              return (
                <line
                  key={`minor-y-${val}`}
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke={minorGridColor}
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Major Y-Axis Grid Lines & Labels */}
            {yTicks.map((val) => {
              const y = scaleY(val);
              return (
                <g key={`y-axis-${val}`}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + plotWidth}
                    y2={y}
                    stroke={gridColor}
                    strokeWidth={val === 0 || val === 100 ? '1.5' : '1'}
                  />
                  <line
                    x1={margin.left - 5}
                    y1={y}
                    x2={margin.left}
                    y2={y}
                    stroke={gridColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fontFamily="monospace"
                    fill={axisTextColor}
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Major X-Axis Grid Lines & Labels */}
            {xTicks.map((val) => {
              const x = scaleX(val);
              const valDisplay = isMetric ? Math.round(val * 0.3048) : val;
              return (
                <g key={`x-axis-${val}`}>
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + plotHeight}
                    stroke={gridColor}
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? 'none' : '2,2'}
                  />
                  <line
                    x1={x}
                    y1={margin.top + plotHeight}
                    x2={x}
                    y2={margin.top + plotHeight + 5}
                    stroke={gridColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={margin.top + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="monospace"
                    fill={axisTextColor}
                  >
                    {valDisplay.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Critical Fatigue Threshold Guidelines (80% and 100%) */}
            <line
              x1={margin.left}
              y1={scaleY(80)}
              x2={margin.left + plotWidth}
              y2={scaleY(80)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.75"
            />
            <text
              x={margin.left + plotWidth - 5}
              y={scaleY(80) - 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="monospace"
              fill="#f59e0b"
              fontWeight="bold"
            >
              Warning Limit (80%)
            </text>

            <line
              x1={margin.left}
              y1={scaleY(100)}
              x2={margin.left + plotWidth}
              y2={scaleY(100)}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.9"
            />
            <text
              x={margin.left + plotWidth - 5}
              y={scaleY(100) - 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="monospace"
              fill="#ef4444"
              fontWeight="bold"
            >
              Retirement Limit (100%)
            </text>

            {/* Stepped Curves */}
            {h2sFatiguePath && (
              <path
                d={h2sFatiguePath}
                fill="none"
                stroke={h2sLineColor}
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            )}

            {bendingFatiguePath && (
              <path
                d={bendingFatiguePath}
                fill="none"
                stroke={bendingLineColor}
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            )}

            {estFatiguePath && (
              <path
                d={estFatiguePath}
                fill="none"
                stroke={estLineColor}
                strokeWidth="2.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            )}

            {/* Bias Weld Joint Markers */}
            {activeJoints.map((joint, idx) => {
              const x = scaleX(joint.locationFt);
              const isSelected = selectedJointIndex === idx;
              return (
                <g
                  key={joint.id || idx}
                  className="cursor-pointer transition-transform"
                  onClick={() => setSelectedJointIndex(isSelected ? null : idx)}
                >
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + plotHeight}
                    stroke="#d946ef"
                    strokeWidth={isSelected ? '2' : '1'}
                    strokeDasharray="3,3"
                  />
                  <polygon
                    points={`${x},${margin.top - 8} ${x - 4},${margin.top} ${x + 4},${margin.top}`}
                    fill="#d946ef"
                  />
                  <text
                    x={x}
                    y={margin.top - 11}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fill="#d946ef"
                    fontWeight="bold"
                  >
                    W{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Interactive Mouse Crosshair */}
            {isHovering && hoverCoord && (
              <g>
                <line
                  x1={scaleX(hoverCoord.xFt)}
                  y1={margin.top}
                  x2={scaleX(hoverCoord.xFt)}
                  y2={margin.top + plotHeight}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <line
                  x1={margin.left}
                  y1={scaleY(hoverCoord.fatiguePct)}
                  x2={margin.left + plotWidth}
                  y2={scaleY(hoverCoord.fatiguePct)}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <circle
                  cx={scaleX(hoverCoord.xFt)}
                  cy={scaleY(hoverCoord.fatiguePct)}
                  r="4"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Chart Outer Border */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke={gridColor}
              strokeWidth="1.5"
            />

            {/* X and Y Axis Titles */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 12}
              textAnchor="middle"
              fontSize="11"
              fontFamily="sans-serif"
              fontWeight="600"
              fill={axisTextColor}
            >
              Coiled Tubing String Length ({isMetric ? 'meters' : 'feet'})
            </text>

            <text
              transform={`rotate(-90)`}
              x={-(margin.top + plotHeight / 2)}
              y={18}
              textAnchor="middle"
              fontSize="11"
              fontFamily="sans-serif"
              fontWeight="600"
              fill={axisTextColor}
            >
              Fatigue Life Used (%)
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 mt-1 border-t border-slate-800/60 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-red-600 rounded-sm" />
            <span className="text-slate-300 font-semibold">Est. Fatigue (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-blue-600 rounded-sm" />
            <span className="text-slate-300 font-semibold">Bending Fatigue (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-emerald-600 rounded-sm" />
            <span className="text-slate-300 font-semibold">H₂S Fatigue (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-fuchsia-500 rounded-sm" />
            <span className="text-slate-300 font-semibold">Bias Welds (NDT Inspection)</span>
          </div>
        </div>
      </div>

      {/* Statistical Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Peak Fatigue</div>
          <div className={`text-lg font-bold font-mono ${peakFatiguePct > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {peakFatiguePct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500">{peakFatiguePct > 80 ? 'Above warning limit' : 'Safe operating window'}</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">String Length</div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {Math.round(totalLengthFt * (isMetric ? 0.3048 : 1)).toLocaleString()} {isMetric ? 'm' : 'ft'}
          </div>
          <div className="text-[10px] text-slate-500">Continuous reel length</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Tubing Volume</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {internalVolBbl.toFixed(3)} bbl
          </div>
          <div className="text-[10px] text-slate-500">Total string capacity</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Bias Welds</div>
          <div className="text-lg font-bold font-mono text-fuchsia-400">
            {activeJoints.length} Joints
          </div>
          <div className="text-[10px] text-slate-500">NDT inspected stations</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl col-span-2">
          <div className="text-[11px] text-slate-400 font-mono">Primary Working Zone</div>
          <div className="text-sm font-bold font-mono text-white truncate">
            {peakWorkingZone}
          </div>
          <div className="text-[10px] text-slate-500">Zone subject to peak cyclic bending</div>
        </div>
      </div>
    </div>
  );
};
