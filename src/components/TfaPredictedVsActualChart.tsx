import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CoiledTubingString,
  UnitSystem,
  WellboreForcesInput,
  TfaDataPoint,
  TfaChartConfig
} from '../types/coiledTubing';
import {
  ftToM,
  mToFt,
  lbfToKn,
  knToLbf,
  calculateGeometry
} from '../utils/engineeringCalculations';
import {
  TfaPredictedPoint,
  TfaFitStatistics,
  calculateTfaFitStatistics,
  getTfaFieldRunPresets,
  enrichActualPoint,
  getNextWellId,
  generateNewWellRunLog,
  calculateTfaPredictedCurve
} from '../utils/tfaCalculations';
import { TfaActualDataTable } from './TfaActualDataTable';
import { TfaEngineeringAdvisorChat } from './TfaEngineeringAdvisorChat';
import {
  Activity,
  Upload,
  Download,
  RotateCcw,
  Play,
  Pause,
  Sun,
  Moon,
  Crosshair,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sparkles,
  Layers,
  MessageSquare,
  Plus,
  PlusCircle,
  ArrowRight,
  Building2,
  MapPin,
  Compass,
  Check,
  CornerDownRight,
  X
} from 'lucide-react';

interface TfaPredictedVsActualChartProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  forcesInput?: WellboreForcesInput;
  defaultWellName?: string;
}

export const TfaPredictedVsActualChart: React.FC<TfaPredictedVsActualChartProps> = ({
  ct,
  unitSystem,
  forcesInput,
  defaultWellName = 'MRJN-764',
}) => {
  const isMetric = unitSystem === 'metric';

  // Config & Offsets matching the physical console in the photo
  const [config, setConfig] = useState<TfaChartConfig>({
    wellName: defaultWellName,
    weightOffsetLbf: -140, // From photo: "Weight Offset (lbf): -140"
    reelDepthOffsetM: 0.0,  // From photo: "Reel Depth Offset (m): 0.00"
    injDepthOffsetFt: 0.0,  // From photo: "Inj Depth Offset (ft): 0.00"
    frictionCasing: forcesInput?.frictionCoefficientCasing ?? 0.24,
    frictionOpenHole: 0.32,
    whpPsi: 450,
    fluidDensityPpg: forcesInput?.wellboreFluidDensityPpg ?? 8.4,
  });

  const [theme, setTheme] = useState<'classic' | 'dark'>('classic');
  const [activeWellPreset, setActiveWellPreset] = useState<'MRJN-764' | 'DEEP-GAS' | 'EXTENDED-REACH' | 'CUSTOM'>('MRJN-764');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showNewWellModal, setShowNewWellModal] = useState<boolean>(false);
  const [nextWellToast, setNextWellToast] = useState<string | null>(null);
  const [importText, setImportText] = useState<string>('');

  // Auto-calculated Next Well suggestion ID
  const nextWellSuggestion = useMemo(() => {
    return getNextWellId(config.wellName);
  }, [config.wellName]);

  // Form state for New Well / Next Well configuration modal
  const [newWellForm, setNewWellForm] = useState({
    wellName: getNextWellId(defaultWellName),
    operator: 'Saudi Aramco',
    wellPad: 'Pad Alpha-01',
    wellTrajectory: 'deviated' as 'vertical' | 'deviated' | 'horizontal' | 'deep_gas',
    targetDepthM: 2500,
    kickoffDepthM: 500,
    maxInclinationDeg: 48,
    whpPsi: 450,
    fluidDensityPpg: 8.4,
    frictionCasing: 0.24,
    weightOffsetLbf: -140,
    initLogMode: 'sample' as 'sample' | 'blank' | 'offset',
  });

  // Mouse coordinate tracking on SVG
  const [hoverPos, setHoverPos] = useState<{ depthM: number; weightLbf: number } | null>({
    depthM: 850,
    weightLbf: 20250,
  });
  const [isHovering, setIsHovering] = useState<boolean>(false);

  // Live real-time playback simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackDepthM, setPlaybackDepthM] = useState<number>(2350);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Mechanical properties of string
  const geom = useMemo(() => calculateGeometry(ct), [ct]);
  const wAirLbFt = geom.weightInAirLbFt;
  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.6, 1 - config.fluidDensityPpg / steelPpg);
  const wBuoyedLbFt = wAirLbFt * buoyancyFactor;
  const wBuoyedLbM = wBuoyedLbFt * 3.28084; // buoyed weight per meter

  // Piston force from wellhead pressure across CT outer diameter: F_up = WHP * pi/4 * OD^2
  const odIn = ct.outerDiameterIn;
  const areaOdSqIn = (Math.PI / 4) * odIn * odIn;
  const pistonUpthrustLbf = config.whpPsi * areaOdSqIn;
  // Stripper friction (typically 600 - 1500 lbf depending on WHP and packoff)
  const stripperFrictionLbf = 800 + config.whpPsi * 0.15;

  // Max Depth and Max Load for chart bounds
  const effectiveMaxDepthM = useMemo(() => {
    if (config.targetDepthM && config.targetDepthM > 0) {
      return config.targetDepthM;
    }
    return activeWellPreset === 'DEEP-GAS' ? 4500 : activeWellPreset === 'EXTENDED-REACH' ? 3500 : 2500;
  }, [config.targetDepthM, activeWellPreset]);

  const maxDepthM = effectiveMaxDepthM;
  const maxWeightLbf = 40000;

  // Generate Predicted Curves (Expected POH, Expected RIH, OPLIM POH, Friction Lock)
  const predictedCurve = useMemo(() => {
    return calculateTfaPredictedCurve(ct, config, effectiveMaxDepthM, 120, activeWellPreset);
  }, [ct, config, effectiveMaxDepthM, activeWellPreset]);

  // Realistic E-Weight (Actual Measured Weight) log points matching the photo
  // Photo features:
  // - Starts at ~0 at surface
  // - Slopes up along Expected RIH with realistic transducer noise
  // - Intermediate reciprocating spikes where the string was pulled up to check pick-up weight:
  //   At ~400m, ~700m, ~1000m, ~1300m, ~1600m, ~1800m
  // - Multiple dense reciprocating spikes at ~2000m - 2300m (washing/milling passes)
  const defaultEWeightLog = useMemo<TfaDataPoint[]>(() => {
    const log: TfaDataPoint[] = [];
    const stepM = 8; // high resolution 8m recording intervals
    const totalSteps = Math.floor(2350 / stepM);

    // Pick-up check locations (meters)
    const checkPoints = [420, 710, 1020, 1380, 1650, 1820];

    // Milling / reciprocation cluster near bottom (2000m - 2300m)
    const clusterStartM = 1980;

    let noiseSeed = 42;
    const pseudoRandom = () => {
      noiseSeed = (noiseSeed * 9301 + 49297) % 233280;
      return noiseSeed / 233280;
    };

    for (let i = 0; i <= totalSteps; i++) {
      const dM = i * stepM;
      const dFt = mToFt(dM);

      // Find nearest predicted values
      const ratio = Math.min(1, dM / maxDepthM);
      const idx = Math.min(predictedCurve.length - 1, Math.floor(ratio * (predictedCurve.length - 1)));
      const pred = predictedCurve[idx];

      const noise = (pseudoRandom() - 0.5) * 650; // sensor ripple +/- 325 lbf
      let actualWeight = pred.expectedRihLbf + noise;
      let op: TfaDataPoint['operation'] = 'RIH';

      // Check if this step is near a pick-up check
      const nearCheck = checkPoints.some((cp) => Math.abs(dM - cp) < 12);
      if (nearCheck) {
        // Spike up to Expected POH or slightly above
        actualWeight = pred.expectedPohLbf + (pseudoRandom() * 800);
        op = 'WIPER';
      }

      // In the bottom cluster (2000 - 2300m), dense reciprocation between RIH and POH
      if (dM >= clusterStartM) {
        const cycle = Math.sin((dM - clusterStartM) * 0.18);
        if (cycle > 0.3) {
          // Pulling up
          actualWeight = pred.expectedPohLbf + (cycle * 1800) + noise;
          op = 'POH';
        } else if (cycle < -0.3) {
          // Slacking off
          actualWeight = pred.expectedRihLbf - 400 + noise;
          op = 'RIH';
        } else {
          actualWeight = (pred.expectedPohLbf + pred.expectedRihLbf) / 2 + noise;
          op = 'WIPER';
        }
      }

      log.push({
        depthM: dM,
        depthFt: dFt,
        expectedPohLbf: pred.expectedPohLbf,
        expectedRihLbf: pred.expectedRihLbf,
        oplimPohLbf: pred.oplimPohLbf,
        eWeightLbf: actualWeight,
        operation: op,
      });
    }

    return log;
  }, [predictedCurve, maxDepthM]);

  const [actualLog, setActualLog] = useState<TfaDataPoint[]>(defaultEWeightLog);
  const [activeTfaSubView, setActiveTfaSubView] = useState<'chart' | 'data' | 'chat' | 'split'>('chart');
  const [selectedPoint, setSelectedPoint] = useState<TfaDataPoint | null>(null);

  // Fit statistics calculated across actual points vs predicted model
  const fitStats = useMemo<TfaFitStatistics>(() => {
    return calculateTfaFitStatistics(actualLog, predictedCurve, config.frictionCasing);
  }, [actualLog, predictedCurve, config.frictionCasing]);

  const handleAddPoint = (point: TfaDataPoint) => {
    setActualLog((prev) => {
      const updated = [...prev, point].sort((a, b) => a.depthM - b.depthM);
      return updated;
    });
    if (point.depthM > playbackDepthM) {
      setPlaybackDepthM(point.depthM);
    }
  };

  const handleDeletePoint = (index: number) => {
    setActualLog((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setActualLog([]);
  };

  const handleLoadPreset = (presetId: string) => {
    const presets = getTfaFieldRunPresets(activeWellPreset);
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setActualLog(found.points);
      if (found.points.length > 0) {
        setPlaybackDepthM(found.points[found.points.length - 1].depthM);
      }
    }
  };

  const handleApplyCalibratedMu = (calibratedMu: number) => {
    setConfig((prev) => ({
      ...prev,
      frictionCasing: calibratedMu,
    }));
  };

  // One-click quick advance to next well (e.g. MRJN-764 -> MRJN-765)
  const handleQuickNextWell = () => {
    const nextName = getNextWellId(config.wellName);
    const updatedConfig: TfaChartConfig = {
      ...config,
      wellName: nextName,
    };
    setConfig(updatedConfig);
    setActiveWellPreset('CUSTOM');

    // Generate fresh initial run log for the next well
    const newLog = generateNewWellRunLog(effectiveMaxDepthM, 'sample');
    setActualLog(newLog);
    setPlaybackDepthM(effectiveMaxDepthM);

    setNextWellToast(`Switched to Next Well: ${nextName}. Real-time calculation & matching initialized.`);
    setTimeout(() => setNextWellToast(null), 4000);
  };

  // Open New Well configuration modal prefilled with current settings & next well ID
  const handleOpenNewWellModal = () => {
    setNewWellForm({
      wellName: getNextWellId(config.wellName),
      operator: config.operator || 'Saudi Aramco',
      wellPad: config.wellPad || 'Pad Alpha-01',
      wellTrajectory: (config.wellTrajectory || 'deviated') as 'vertical' | 'deviated' | 'horizontal' | 'deep_gas',
      targetDepthM: config.targetDepthM || (isMetric ? 2500 : Math.round(ftToM(8200))),
      kickoffDepthM: config.kickoffDepthM || 500,
      maxInclinationDeg: config.maxInclinationDeg || 48,
      whpPsi: config.whpPsi || 450,
      fluidDensityPpg: config.fluidDensityPpg || 8.4,
      frictionCasing: config.frictionCasing || 0.24,
      weightOffsetLbf: config.weightOffsetLbf || -140,
      initLogMode: 'sample',
    });
    setShowNewWellModal(true);
  };

  // Apply new well form inputs
  const handleApplyNewWell = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetM = newWellForm.targetDepthM > 0 ? newWellForm.targetDepthM : 2500;

    const updatedConfig: TfaChartConfig = {
      ...config,
      wellName: newWellForm.wellName.trim() || getNextWellId(config.wellName),
      operator: newWellForm.operator.trim(),
      wellPad: newWellForm.wellPad.trim(),
      wellTrajectory: newWellForm.wellTrajectory,
      targetDepthM: targetM,
      kickoffDepthM: newWellForm.kickoffDepthM,
      maxInclinationDeg: newWellForm.maxInclinationDeg,
      whpPsi: newWellForm.whpPsi,
      fluidDensityPpg: newWellForm.fluidDensityPpg,
      frictionCasing: newWellForm.frictionCasing,
      weightOffsetLbf: newWellForm.weightOffsetLbf,
    };

    setConfig(updatedConfig);
    setActiveWellPreset('CUSTOM');

    const newLog = generateNewWellRunLog(targetM, newWellForm.initLogMode);
    setActualLog(newLog);
    setPlaybackDepthM(targetM);
    setShowNewWellModal(false);

    setNextWellToast(`Created and loaded well "${updatedConfig.wellName}" (${updatedConfig.wellTrajectory.toUpperCase()} • ${Math.round(isMetric ? targetM : mToFt(targetM)).toLocaleString()} ${isMetric ? 'm' : 'ft'}).`);
    setTimeout(() => setNextWellToast(null), 4500);
  };

  // Playback timer effect
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackDepthM((prev) => {
          if (prev >= 2350) return 0;
          return prev + 15;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Visible subset of actual log based on playback depth
  const visibleLog = useMemo(() => {
    return actualLog.filter((p) => p.depthM <= playbackDepthM);
  }, [actualLog, playbackDepthM]);

  // SVG Chart Geometry Constants
  const svgWidth = 980;
  const svgHeight = 490;
  const margin = { top: 35, right: 75, bottom: 50, left: 75 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Scale Functions
  // X-axis: Injector Depth (0 to maxDepthM)
  const scaleX = (dM: number): number => {
    return margin.left + (dM / maxDepthM) * plotWidth;
  };

  // Y-axis: Hookload Weight (0 to maxWeightLbf)
  const scaleY = (weightLbf: number): number => {
    const clamped = Math.max(0, Math.min(maxWeightLbf, weightLbf));
    return margin.top + plotHeight - (clamped / maxWeightLbf) * plotHeight;
  };

  const invertX = (px: number): number => {
    const clampedPx = Math.max(margin.left, Math.min(margin.left + plotWidth, px));
    return ((clampedPx - margin.left) / plotWidth) * maxDepthM;
  };

  const invertY = (py: number): number => {
    const clampedPy = Math.max(margin.top, Math.min(margin.top + plotHeight, py));
    const ratio = (margin.top + plotHeight - clampedPy) / plotHeight;
    return ratio * maxWeightLbf;
  };

  // SVG Path for Expected POH (Red line)
  const expectedPohPath = useMemo(() => {
    if (predictedCurve.length === 0) return '';
    return predictedCurve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.depthM)} ${scaleY(p.expectedPohLbf)}`)
      .join(' ');
  }, [predictedCurve, maxDepthM]);

  // SVG Path for Expected RIH (Blue line)
  const expectedRihPath = useMemo(() => {
    if (predictedCurve.length === 0) return '';
    return predictedCurve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.depthM)} ${scaleY(p.expectedRihLbf)}`)
      .join(' ');
  }, [predictedCurve, maxDepthM]);

  // SVG Path for OPLIM POH (Overpull limit top curve)
  const oplimPohPath = useMemo(() => {
    if (predictedCurve.length === 0) return '';
    return predictedCurve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.depthM)} ${scaleY(p.oplimPohLbf)}`)
      .join(' ');
  }, [predictedCurve, maxDepthM]);

  // SVG Path for Friction Lock RIH (Lower limit curve)
  const frictionLockPath = useMemo(() => {
    if (predictedCurve.length === 0) return '';
    return predictedCurve
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.depthM)} ${scaleY(p.frictionLockRihLbf)}`)
      .join(' ');
  }, [predictedCurve, maxDepthM]);

  // SVG Path for E-WEIGHT (Black jagged line with reciprocation spikes)
  const eWeightPath = useMemo(() => {
    if (visibleLog.length === 0) return '';
    return visibleLog
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.depthM)} ${scaleY(p.eWeightLbf || 0)}`)
      .join(' ');
  }, [visibleLog, maxDepthM]);

  // SVG Mouse event handler for crosshair
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
      const depthM = invertX(mouseSvgX);
      const weightLbf = invertY(mouseSvgY);
      setHoverPos({ depthM, weightLbf });
    } else {
      setIsHovering(false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  // Interpolate predicted at hover depth
  const hoverStats = useMemo(() => {
    if (!hoverPos) return null;
    const dM = hoverPos.depthM;
    const ratio = Math.min(1, Math.max(0, dM / maxDepthM));
    const idx = Math.min(predictedCurve.length - 1, Math.floor(ratio * (predictedCurve.length - 1)));
    const pred = predictedCurve[idx];

    // Find closest logged actual point
    const closestActual = actualLog.reduce((prev, curr) => {
      return Math.abs(curr.depthM - dM) < Math.abs(prev.depthM - dM) ? curr : prev;
    }, actualLog[0]);

    const dragDeltaLbf = pred.expectedPohLbf - pred.expectedRihLbf;
    const matchResidualLbf = closestActual ? Math.abs((closestActual.eWeightLbf || 0) - pred.expectedRihLbf) : 0;

    return {
      depthM: dM,
      depthFt: mToFt(dM),
      cursorWeightLbf: hoverPos.weightLbf,
      actualEWeightLbf: closestActual?.eWeightLbf ?? hoverPos.weightLbf,
      expectedPohLbf: pred.expectedPohLbf,
      expectedRihLbf: pred.expectedRihLbf,
      dragDeltaLbf,
      matchResidualLbf,
    };
  }, [hoverPos, predictedCurve, actualLog, maxDepthM]);

  // Axis Ticks
  const xTicksM = useMemo(() => {
    const step = maxDepthM > 3000 ? 1000 : 500;
    const ticks: number[] = [];
    for (let x = 0; x <= maxDepthM; x += step) {
      ticks.push(x);
    }
    return ticks;
  }, [maxDepthM]);

  const yTicksLbf = [0, 10000, 20000, 30000, 40000];

  // CSV / Log Paste Import Handler
  const handleApplyPastedLog = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n');
    const newLog: TfaDataPoint[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[,\t\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        const d = parseFloat(parts[0]);
        const w = parseFloat(parts[1]);
        if (!isNaN(d) && !isNaN(w)) {
          const depthM = isMetric ? d : ftToM(d);
          const weightLbf = isMetric ? knToLbf(w) : w;
          newLog.push({
            depthM,
            depthFt: mToFt(depthM),
            expectedPohLbf: 0,
            expectedRihLbf: 0,
            eWeightLbf: weightLbf,
            operation: 'RIH',
          });
        }
      }
    });

    if (newLog.length > 0) {
      newLog.sort((a, b) => a.depthM - b.depthM);
      setActualLog(newLog);
      setPlaybackDepthM(newLog[newLog.length - 1].depthM);
      setShowImportModal(false);
      setImportText('');
    }
  };

  // Theming colors
  const isDark = theme === 'dark';
  const canvasBg = isDark ? '#020617' : '#ffffff';
  const plotBg = isDark ? '#0b1329' : '#ffffff';
  const gridLineColor = isDark ? '#1e293b' : '#d1d5db';
  const axisLabelColor = isDark ? '#94a3b8' : '#374151';
  const eWeightColor = isDark ? '#f8fafc' : '#000000';
  const crosshairColor = isDark ? '#38bdf8' : '#1e3a8a';

  return (
    <div className="space-y-3 font-sans">
      {/* Next Well / New Well Feedback Notification */}
      {nextWellToast && (
        <div className="bg-emerald-950/90 border border-emerald-600/70 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{nextWellToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setNextWellToast(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded bg-emerald-900/60 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Authentic Top Ribbon matching the user's photo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {/* Real-time Hardware Indicators & Offsets Header */}
        <div className="bg-blue-950/90 border-b border-blue-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
          {/* Offsets (Weight Offset, Reel Depth, Inj Depth) */}
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-1.5 bg-blue-900/60 px-2.5 py-1 rounded border border-blue-700/60">
              <span className="text-blue-300 font-semibold">Weight Offset (lbf):</span>
              <input
                type="number"
                value={config.weightOffsetLbf}
                onChange={(e) => setConfig({ ...config, weightOffsetLbf: parseFloat(e.target.value) || 0 })}
                className="w-16 bg-blue-950 text-white font-bold px-1.5 py-0.5 rounded text-center border border-blue-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setConfig({ ...config, weightOffsetLbf: 0 })}
                className="text-[10px] text-blue-300 hover:text-white underline ml-1"
                title="Tare / zero weight indicator"
              >
                Zero
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-blue-900/40 px-2 py-1 rounded border border-blue-800/50">
              <span className="text-slate-300">Reel Depth Offset (m):</span>
              <input
                type="number"
                step="0.1"
                value={config.reelDepthOffsetM}
                onChange={(e) => setConfig({ ...config, reelDepthOffsetM: parseFloat(e.target.value) || 0 })}
                className="w-14 bg-blue-950 text-white px-1 py-0.5 rounded text-center border border-blue-700 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-blue-900/40 px-2 py-1 rounded border border-blue-800/50">
              <span className="text-slate-300">Inj Depth Offset (ft):</span>
              <input
                type="number"
                step="0.1"
                value={config.injDepthOffsetFt}
                onChange={(e) => setConfig({ ...config, injDepthOffsetFt: parseFloat(e.target.value) || 0 })}
                className="w-14 bg-blue-950 text-white px-1 py-0.5 rounded text-center border border-blue-700 text-xs"
              />
            </div>
          </div>

          {/* CT Acquisition Console LED Status Bar (F2 - F9, Comm Status) */}
          <div className="flex items-center gap-2 text-[11px] text-blue-200">
            <div className="flex items-center gap-1 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">DAS LIVE</span>
            </div>
            <span className="text-blue-400 font-mono hidden sm:inline">F2 F3 F4 F5 F6 F7 F8 F9</span>
            <span className="bg-blue-900/70 px-1.5 py-0.5 rounded text-[10px] text-cyan-300 border border-blue-700">
              NUM
            </span>
            <span className="text-slate-400 text-[10px]">C: 401GB</span>
          </div>
        </div>

        {/* 2. Operational Control Ribbon & Matching Sliders */}
        <div className="p-3 bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Preset & New/Next Well Selector */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-400 font-medium">Well Matching:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveWellPreset('MRJN-764');
                  setConfig((c) => ({ ...c, wellName: 'MRJN-764', frictionCasing: 0.24, targetDepthM: undefined, wellTrajectory: undefined }));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeWellPreset === 'MRJN-764'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MRJN-764 (Photo Match)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWellPreset('DEEP-GAS');
                  setConfig((c) => ({ ...c, wellName: 'DEEP-GAS-01', frictionCasing: 0.28, targetDepthM: undefined, wellTrajectory: undefined }));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeWellPreset === 'DEEP-GAS'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Deep Gas 4,500m
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWellPreset('EXTENDED-REACH');
                  setConfig((c) => ({ ...c, wellName: 'ER-WELL-09', frictionCasing: 0.32, targetDepthM: undefined, wellTrajectory: undefined }));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeWellPreset === 'EXTENDED-REACH'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extended Reach (Lockup)
              </button>
              {activeWellPreset === 'CUSTOM' && (
                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-200" />
                  <span>{config.wellName} (Custom)</span>
                </span>
              )}
            </div>

            {/* Next Well and New Well Quick Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleQuickNextWell}
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title={`Advance immediately to next sequential well ID (${nextWellSuggestion})`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next Well ({nextWellSuggestion})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewWellModal}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Configure custom new or next well trajectory, depths, and pad parameters"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>New Well Setup</span>
              </button>
            </div>
          </div>

          {/* Friction Calibration Slider */}
          <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
            <span className="text-slate-400 text-xs">Casing &mu;:</span>
            <input
              type="range"
              min="0.10"
              max="0.45"
              step="0.01"
              value={config.frictionCasing}
              onChange={(e) => setConfig({ ...config, frictionCasing: parseFloat(e.target.value) })}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="text-cyan-400 font-bold w-10 text-right">{config.frictionCasing.toFixed(2)}</span>
          </div>

          {/* Action Buttons: Playback, Import, Reset, Theme */}
          <div className="flex items-center gap-2">
            {/* Playback Simulation */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-sm ${
                isPlaying
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? 'Pause Run' : 'Simulate Run'}</span>
            </button>

            {/* Import Actual Data */}
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Import actual field DAS logger weight data"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Actual E-Weight</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'classic' : 'dark')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
              title={`Switch to ${isDark ? 'Classic White Canvas (Photo Style)' : 'Dark Canvas'}`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Active Well Configuration & Target Parameters Bar */}
        <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300">
          <div className="flex items-center flex-wrap gap-2.5 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Well: {config.wellName}</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Operator: <strong className="text-slate-200">{config.operator || 'Saudi Aramco'}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Pad: <strong className="text-slate-200">{config.wellPad || 'Pad A'}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Trajectory: <span className="uppercase text-amber-300 font-mono font-semibold">{config.wellTrajectory || 'DEVIATED'}</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Target MD: <strong className="text-emerald-300 font-mono">{Math.round(isMetric ? effectiveMaxDepthM : mToFt(effectiveMaxDepthM)).toLocaleString()} {isMetric ? 'm' : 'ft'}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              WHP: <strong className="text-rose-300 font-mono">{config.whpPsi} psi</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Mud: <strong className="text-cyan-300 font-mono">{config.fluidDensityPpg} ppg</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenNewWellModal}
            className="text-[11px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-medium underline underline-offset-2 ml-auto"
          >
            <span>Update Trajectory &amp; Depths</span>
            <CornerDownRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2.1 View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTfaSubView('chart')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTfaSubView === 'chart'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-200" />
            <span>TFA Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTfaSubView('data')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTfaSubView === 'data'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-200" />
            <span>Actual Input Data &amp; Calculation</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-cyan-300 font-mono">
              {actualLog.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTfaSubView('chat')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTfaSubView === 'chat'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-200" />
            <span>TFA Chat &amp; Advisor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTfaSubView('split')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTfaSubView === 'split'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-200" />
            <span>Split View</span>
          </button>
        </div>

        {/* Real-time Calculation Statistics Preview Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              MAE: <strong className="text-cyan-300">{isMetric ? Math.round(lbfToKn(fitStats.maeLbf)) + ' kN' : Math.round(fitStats.maeLbf).toLocaleString() + ' lbf'}</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              R&sup2;: <strong className="text-emerald-300">{(fitStats.rSquared * 100).toFixed(0)}%</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Optimal &mu;: <strong className="text-amber-300">{fitStats.calibratedFriction.toFixed(2)}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleApplyCalibratedMu(fitStats.calibratedFriction)}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            title="Auto-calibrate casing friction factor to match actual measured E-Weight data"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Calibrate &mu;</span>
          </button>
        </div>
      </div>

      {/* 2.2 View Mode: Actual Input Data & Calculations */}
      {activeTfaSubView === 'data' && (
        <TfaActualDataTable
          actualLog={actualLog}
          predictedCurve={predictedCurve}
          fitStats={fitStats}
          unitSystem={unitSystem}
          ct={ct}
          currentCasingMu={config.frictionCasing}
          onAddPoint={handleAddPoint}
          onDeletePoint={handleDeletePoint}
          onClearAll={handleClearAll}
          onLoadPreset={handleLoadPreset}
          onApplyCalibratedMu={handleApplyCalibratedMu}
          onOpenImportModal={() => setShowImportModal(true)}
          onSelectPoint={(p) => {
            setSelectedPoint(p);
            setHoverPos({ depthM: p.depthM, weightLbf: p.eWeightLbf || 0 });
            setActiveTfaSubView('chart');
          }}
        />
      )}

      {/* 2.3 View Mode: TFA Engineering Advisor Chat */}
      {activeTfaSubView === 'chat' && (
        <TfaEngineeringAdvisorChat
          ct={ct}
          config={config}
          actualLog={actualLog}
          predictedCurve={predictedCurve}
          fitStats={fitStats}
          unitSystem={unitSystem}
          onApplyCalibratedMu={handleApplyCalibratedMu}
        />
      )}

      {/* 3. Primary SVG TFA Chart Canvas (Rendered when active view is 'chart' or 'split') */}
      {(activeTfaSubView === 'chart' || activeTfaSubView === 'split') && (
      <>
      <div
        className="rounded-2xl border shadow-2xl p-4 transition-all"
        style={{
          backgroundColor: canvasBg,
          borderColor: isDark ? '#1e293b' : '#cbd5e1',
        }}
      >
        {/* Main Title Bar of Chart */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-base tracking-tight font-sans"
              style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            >
              {config.wellName}_Real Time Matching Predicted vs Actual
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (OD {ct.outerDiameterIn.toFixed(3)}" &bull; {ct.grade} &bull; {ct.totalLengthFt.toLocaleString()} ft)
            </span>
          </div>

          {/* Live Crosshair Readout Box */}
          {hoverStats && (
            <div className="px-3 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-mono text-xs font-semibold shadow-inner flex items-center gap-3">
              <span className="text-slate-400">Depth:</span>
              <span className="text-white">
                {Math.round(isMetric ? hoverStats.depthM : hoverStats.depthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">E-Weight:</span>
              <span className="text-cyan-300 font-bold">
                {Math.round(hoverStats.actualEWeightLbf).toLocaleString()} lbf
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">POH:</span>
              <span className="text-rose-400">
                {Math.round(hoverStats.expectedPohLbf).toLocaleString()}
              </span>
              <span className="text-slate-400">RIH:</span>
              <span className="text-blue-400">
                {Math.round(hoverStats.expectedRihLbf).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* The SVG Visualization Area */}
        <div className="relative w-full overflow-hidden select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Plot Background */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill={plotBg}
            />

            {/* Horizontal Gridlines & Y-Axis Labels (Left & Right) */}
            {yTicksLbf.map((val) => {
              const y = scaleY(val);
              return (
                <g key={`y-grid-${val}`}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + plotWidth}
                    y2={y}
                    stroke={gridLineColor}
                    strokeWidth={val === 0 ? '1.5' : '1'}
                    strokeDasharray={val === 0 ? 'none' : '3,3'}
                  />
                  {/* Left Y-axis ticks & labels */}
                  <text
                    x={margin.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontFamily="monospace"
                    fill={axisLabelColor}
                  >
                    {val}
                  </text>
                  {/* Right Y-axis ticks & labels */}
                  <text
                    x={margin.left + plotWidth + 8}
                    y={y + 4}
                    textAnchor="start"
                    fontSize="11"
                    fontFamily="monospace"
                    fill={axisLabelColor}
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Vertical Gridlines & X-Axis Labels (Depth in Meters or Feet) */}
            {xTicksM.map((val) => {
              const x = scaleX(val);
              const valDisplay = isMetric ? val : Math.round(mToFt(val));
              return (
                <g key={`x-grid-${val}`}>
                  <line
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + plotHeight}
                    stroke={gridLineColor}
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? 'none' : '3,3'}
                  />
                  <line
                    x1={x}
                    y1={margin.top + plotHeight}
                    x2={x}
                    y2={margin.top + plotHeight + 5}
                    stroke={axisLabelColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={margin.top + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="monospace"
                    fill={axisLabelColor}
                  >
                    {valDisplay}
                  </text>
                </g>
              );
            })}

            {/* Curves */}

            {/* 1. Friction Lock RIH / Helical Buckling (Green) */}
            {frictionLockPath && (
              <path
                d={frictionLockPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.8"
              />
            )}

            {/* 2. OPLIM POH (Overpull Limit - Dark Red/Black) */}
            {oplimPohPath && (
              <path
                d={oplimPohPath}
                fill="none"
                stroke="#991b1b"
                strokeWidth="1.5"
                strokeDasharray="5,3"
              />
            )}

            {/* 3. Expected RIH (Blue curve) */}
            {expectedRihPath && (
              <path
                d={expectedRihPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {/* 4. Expected POH (Red curve) */}
            {expectedPohPath && (
              <path
                d={expectedPohPath}
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {/* 5. Actual E-WEIGHT (Black jagged line with reciprocation spikes) */}
            {eWeightPath && (
              <path
                d={eWeightPath}
                fill="none"
                stroke={eWeightColor}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Point Markers */}
            {visibleLog.map((pt, i) => {
              if (pt.eWeightLbf === undefined) return null;
              const isKey = pt.operation !== 'RIH' || i % 4 === 0 || i === visibleLog.length - 1;
              if (!isKey) return null;

              const cx = scaleX(pt.depthM);
              const cy = scaleY(pt.eWeightLbf);
              const isSelected = selectedPoint && Math.abs(selectedPoint.depthM - pt.depthM) < 2;

              let dotFill = '#0284c7'; // blue for RIH
              if (pt.operation === 'POH') dotFill = '#dc2626'; // red
              else if (pt.operation === 'WIPER') dotFill = '#f59e0b'; // amber
              else if (pt.operation === 'TAG_BOTTOM') dotFill = '#a855f7'; // purple
              else if (pt.operation === 'STATIC') dotFill = '#94a3b8';

              return (
                <g key={pt.id || `pt-dot-${i}`} className="cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 3}
                    fill={dotFill}
                    stroke={isDark ? '#ffffff' : '#000000'}
                    strokeWidth={isSelected ? 2 : 0.8}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoint(pt);
                      setHoverPos({ depthM: pt.depthM, weightLbf: pt.eWeightLbf! });
                    }}
                  >
                    <title>{`Depth: ${Math.round(isMetric ? pt.depthM : pt.depthFt)} ${isMetric ? 'm' : 'ft'} | E-Weight: ${Math.round(pt.eWeightLbf)} lbf | Op: ${pt.operation || 'RIH'}`}</title>
                  </circle>
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                  )}
                </g>
              );
            })}

            {/* Interactive Crosshair (+) as shown in the photo near (1000m, 20000lbf) */}
            {isHovering && hoverPos && (
              <g>
                {/* Thin dashed crosshair lines */}
                <line
                  x1={scaleX(hoverPos.depthM)}
                  y1={margin.top}
                  x2={scaleX(hoverPos.depthM)}
                  y2={margin.top + plotHeight}
                  stroke={crosshairColor}
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                />
                <line
                  x1={margin.left}
                  y1={scaleY(hoverPos.weightLbf)}
                  x2={margin.left + plotWidth}
                  y2={scaleY(hoverPos.weightLbf)}
                  stroke={crosshairColor}
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                />
                {/* Crosshair + symbol */}
                <line
                  x1={scaleX(hoverPos.depthM) - 8}
                  y1={scaleY(hoverPos.weightLbf)}
                  x2={scaleX(hoverPos.depthM) + 8}
                  y2={scaleY(hoverPos.weightLbf)}
                  stroke={crosshairColor}
                  strokeWidth="1.8"
                />
                <line
                  x1={scaleX(hoverPos.depthM)}
                  y1={scaleY(hoverPos.weightLbf) - 8}
                  x2={scaleX(hoverPos.depthM)}
                  y2={scaleY(hoverPos.weightLbf) + 8}
                  stroke={crosshairColor}
                  strokeWidth="1.8"
                />
              </g>
            )}

            {/* Chart Outer Border Box */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke={axisLabelColor}
              strokeWidth="1.5"
            />

            {/* X-Axis Title (Bottom) */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 12}
              textAnchor="middle"
              fontSize="12"
              fontFamily="sans-serif"
              fontWeight="600"
              fill={axisLabelColor}
            >
              INJ DEPTH {isMetric ? 'Meter (m)' : 'Feet (ft)'}
            </text>

            {/* Left Y-Axis Titles (Expected POH, OPLIM POH, E-WEIGHT) */}
            <g transform={`translate(22, ${margin.top + plotHeight / 2}) rotate(-90)`}>
              <text
                x="0"
                y="-30"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="700"
                fill="#dc2626"
              >
                Expected POH (lbf)
              </text>
              <text
                x="0"
                y="-15"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="600"
                fill="#7f1d1d"
              >
                OPLIM POH (lbf)
              </text>
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="700"
                fill={eWeightColor}
              >
                E-WEIGHT (lbf)
              </text>
            </g>

            {/* Right Y-Axis Titles (Expected RIH, Friction Lock RIH, OPLIM RIH) */}
            <g transform={`translate(${svgWidth - 15}, ${margin.top + plotHeight / 2}) rotate(90)`}>
              <text
                x="0"
                y="-35"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="700"
                fill="#2563eb"
              >
                Expected RIH (lbf)
              </text>
              <text
                x="0"
                y="-20"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="600"
                fill="#10b981"
              >
                Friction Lock RIH (lbf)
              </text>
              <text
                x="0"
                y="-5"
                textAnchor="middle"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="600"
                fill={axisLabelColor}
              >
                OPLIM RIH (lbf)
              </text>
            </g>
          </svg>
        </div>

        {/* 4. Legend Matching Orion / Cerberus Specs */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-red-600 rounded-sm" />
            <span className="text-red-700 dark:text-red-400 font-bold">Expected POH (lbf)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-blue-600 rounded-sm" />
            <span className="text-blue-700 dark:text-blue-400 font-bold">Expected RIH (lbf)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 bg-black dark:bg-white rounded-sm" />
            <span className="text-slate-900 dark:text-slate-100 font-bold">E-WEIGHT (Actual Load)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-red-900 border-t border-dashed border-red-800" />
            <span className="text-slate-600 dark:text-slate-400">OPLIM POH (Yield Cap)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-emerald-600 border-t border-dashed border-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400">Friction Lock (RIH Limit)</span>
          </div>
        </div>
      </div>

      {/* 5. Diagnostic Summary Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Current Weight Offset</div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {config.weightOffsetLbf} lbf
          </div>
          <div className="text-[10px] text-slate-500">Tare zero adjustment</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Friction Matching (&mu;)</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {config.frictionCasing.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Casing drag calibration</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Stripper & Piston Force</div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {Math.round(pistonUpthrustLbf)} lbf
          </div>
          <div className="text-[10px] text-slate-500">WHP {config.whpPsi} psi thrust</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-mono">Max Logged Depth</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {Math.round(isMetric ? playbackDepthM : mToFt(playbackDepthM)).toLocaleString()} {isMetric ? 'm' : 'ft'}
          </div>
          <div className="text-[10px] text-slate-500">Injector acquisition depth</div>
        </div>
      </div>
      </>
      )}

      {/* When in Split View, show TfaActualDataTable underneath the chart */}
      {activeTfaSubView === 'split' && (
        <div className="mt-4">
          <TfaActualDataTable
            actualLog={actualLog}
            predictedCurve={predictedCurve}
            fitStats={fitStats}
            unitSystem={unitSystem}
            ct={ct}
            currentCasingMu={config.frictionCasing}
            onAddPoint={handleAddPoint}
            onDeletePoint={handleDeletePoint}
            onClearAll={handleClearAll}
            onLoadPreset={handleLoadPreset}
            onApplyCalibratedMu={handleApplyCalibratedMu}
            onOpenImportModal={() => setShowImportModal(true)}
            onSelectPoint={(p) => {
              setSelectedPoint(p);
              setHoverPos({ depthM: p.depthM, weightLbf: p.eWeightLbf || 0 });
            }}
          />
        </div>
      )}

      {/* 5. New / Next Well Setup & Trajectory Configuration Modal */}
      {showNewWellModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">TFA New / Next Well Configuration</h3>
                  <p className="text-xs text-slate-400">
                    Input well trajectory, target depth, pad, and simulation model parameters
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewWellModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyNewWell} className="space-y-4">
              {/* Row 1: Well Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Well Name / ID *</span>
                    <button
                      type="button"
                      onClick={() => setNewWellForm((f) => ({ ...f, wellName: getNextWellId(f.wellName) }))}
                      className="text-[10px] text-cyan-400 hover:text-cyan-200 font-mono underline"
                      title="Auto-increment trailing number"
                    >
                      +Auto Next
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={newWellForm.wellName}
                    onChange={(e) => setNewWellForm({ ...newWellForm, wellName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. MRJN-765"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-300">Operator / Client</label>
                  <input
                    type="text"
                    value={newWellForm.operator}
                    onChange={(e) => setNewWellForm({ ...newWellForm, operator: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Saudi Aramco"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-300">Well Pad / Cluster</label>
                  <input
                    type="text"
                    value={newWellForm.wellPad}
                    onChange={(e) => setNewWellForm({ ...newWellForm, wellPad: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Pad Alpha-02"
                  />
                </div>
              </div>

              {/* Row 2: Well Trajectory Profile */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wellbore Trajectory Profile</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'deviated', name: 'Deviated S-Curve', desc: 'Kickoff 500m, max 48-52°' },
                    { id: 'vertical', name: 'Vertical Well', desc: 'Low inclination (< 3°)' },
                    { id: 'horizontal', name: 'Horizontal / ERD', desc: 'Build to 88°+ lateral' },
                    { id: 'deep_gas', name: 'Deep Gas HPHT', desc: 'Deep 4,500m+, high WHP' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewWellForm({ ...newWellForm, wellTrajectory: t.id as any })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        newWellForm.wellTrajectory === t.id
                          ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Well Depths & Geometries */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Target Depth MD ({isMetric ? 'm' : 'ft'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="10000"
                    step="10"
                    value={isMetric ? newWellForm.targetDepthM : Math.round(mToFt(newWellForm.targetDepthM))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 2500;
                      setNewWellForm({
                        ...newWellForm,
                        targetDepthM: isMetric ? val : ftToM(val),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    ~{Math.round(isMetric ? mToFt(newWellForm.targetDepthM) : newWellForm.targetDepthM).toLocaleString()} {isMetric ? 'ft' : 'm'} equivalent
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Kickoff Depth KOP ({isMetric ? 'm' : 'ft'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="8000"
                    step="10"
                    value={isMetric ? newWellForm.kickoffDepthM : Math.round(mToFt(newWellForm.kickoffDepthM))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 500;
                      setNewWellForm({
                        ...newWellForm,
                        kickoffDepthM: isMetric ? val : ftToM(val),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Max Inclination (&deg;)</label>
                  <input
                    type="number"
                    min="0"
                    max="95"
                    step="1"
                    value={newWellForm.maxInclinationDeg}
                    onChange={(e) => setNewWellForm({ ...newWellForm, maxInclinationDeg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Pressure, Fluid, and Friction */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Wellhead WHP (psi)</label>
                  <input
                    type="number"
                    min="0"
                    max="15000"
                    step="50"
                    value={newWellForm.whpPsi}
                    onChange={(e) => setNewWellForm({ ...newWellForm, whpPsi: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Fluid Density (ppg)</label>
                  <input
                    type="number"
                    min="6.0"
                    max="18.0"
                    step="0.1"
                    value={newWellForm.fluidDensityPpg}
                    onChange={(e) => setNewWellForm({ ...newWellForm, fluidDensityPpg: parseFloat(e.target.value) || 8.4 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Casing Friction (&mu;)</label>
                  <input
                    type="number"
                    min="0.10"
                    max="0.50"
                    step="0.01"
                    value={newWellForm.frictionCasing}
                    onChange={(e) => setNewWellForm({ ...newWellForm, frictionCasing: parseFloat(e.target.value) || 0.24 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Weight Tare Offset (lbf)</label>
                  <input
                    type="number"
                    step="10"
                    value={newWellForm.weightOffsetLbf}
                    onChange={(e) => setNewWellForm({ ...newWellForm, weightOffsetLbf: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Initial Run Log Generation Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Initial Run Log Data Option</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewWellForm({ ...newWellForm, initLogMode: 'sample' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWellForm.initLogMode === 'sample'
                        ? 'bg-cyan-950/80 border-cyan-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-medium text-white">Synthetic Sample Run</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Realistic pick-up checks &amp; bottom tag</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewWellForm({ ...newWellForm, initLogMode: 'blank' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWellForm.initLogMode === 'blank'
                        ? 'bg-cyan-950/80 border-cyan-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-medium text-white">Blank Log (Tare Zero)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Ready for live field acquisition / paste</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewWellForm({ ...newWellForm, initLogMode: 'offset' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newWellForm.initLogMode === 'offset'
                        ? 'bg-cyan-950/80 border-cyan-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-medium text-white">High Drag Offset (+1.2k lbf)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Calibrate against tight hole friction</div>
                  </button>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleQuickNextWell}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Advance: Next Well ({nextWellSuggestion})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewWellModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Create &amp; Load Well</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Paste / Import Actual E-Weight Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Import Field E-Weight Sensor Data</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>Paste tab or comma-separated log lines with columns:</p>
              <p className="font-mono text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800">
                Depth({isMetric ? 'm' : 'ft'}) &nbsp; E_Weight(lbf)<br />
                0 &nbsp; -140<br />
                250 &nbsp; 2800<br />
                500 &nbsp; 5900<br />
                1000 &nbsp; 12400
              </p>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste Depth and E-Weight columns here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPastedLog}
                disabled={!importText.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Apply Actual Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
