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
  HelpCircle
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
  const [activeWellPreset, setActiveWellPreset] = useState<'MRJN-764' | 'DEEP-GAS' | 'EXTENDED-REACH'>('MRJN-764');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');

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
  const maxDepthM = activeWellPreset === 'DEEP-GAS' ? 4500 : activeWellPreset === 'EXTENDED-REACH' ? 3500 : 2500;
  const maxWeightLbf = 40000;

  // Generate Predicted Curves (Expected POH, Expected RIH, OPLIM POH, Friction Lock)
  const predictedCurve = useMemo(() => {
    const pointsCount = 120;
    const stepM = maxDepthM / pointsCount;
    const curve: {
      depthM: number;
      depthFt: number;
      expectedPohLbf: number;
      expectedRihLbf: number;
      oplimPohLbf: number;
      oplimRihLbf: number;
      frictionLockRihLbf: number;
    }[] = [];

    // Tensile yield of string
    const tensileYieldLbf = ct.yieldStrengthPsi * geom.crossSectionalAreaSqIn;
    const safeOverpullCapLbf = tensileYieldLbf * 0.8;

    for (let i = 0; i <= pointsCount; i++) {
      const dM = i * stepM;
      const dFt = mToFt(dM);

      // Wellbore deviation profile based on preset
      let avgIncDeg = 15;
      if (activeWellPreset === 'MRJN-764') {
        // Deviated S-well: kicks off at 500m, reaches 48 deg by 1800m
        avgIncDeg = dM < 500 ? 2 : Math.min(52, 2 + ((dM - 500) / 1300) * 48);
      } else if (activeWellPreset === 'EXTENDED-REACH') {
        avgIncDeg = dM < 800 ? 5 : Math.min(88, 5 + ((dM - 800) / 1200) * 83);
      } else {
        avgIncDeg = dM < 1200 ? 4 : Math.min(35, 4 + ((dM - 1200) / 2000) * 31);
      }

      const incRad = (avgIncDeg * Math.PI) / 180;
      const cosInc = Math.cos(incRad);
      const sinInc = Math.sin(incRad);

      // True Vertical Depth component and Normal force
      const normalContactForceLbf = (wBuoyedLbM * sinInc * dM) + (dM > 1000 ? 800 : 200); // include small dogleg normal load
      const cumulativeDragLbf = config.frictionCasing * normalContactForceLbf;

      // Axial string weight in wellbore
      const axialWeightLbf = wBuoyedLbM * cosInc * dM;

      // Surface POH = Axial Weight + Drag + Stripper Friction - Piston Upthrust + Weight Offset
      const rawPoh = axialWeightLbf + cumulativeDragLbf + stripperFrictionLbf - pistonUpthrustLbf + config.weightOffsetLbf;
      // Surface RIH = Axial Weight - Drag - Stripper Friction - Piston Upthrust + Weight Offset
      const rawRih = axialWeightLbf - cumulativeDragLbf - stripperFrictionLbf - pistonUpthrustLbf + config.weightOffsetLbf;

      // OPLIM POH = Safe yield limit minus residual tension
      const oplimPoh = Math.min(38000, safeOverpullCapLbf * 0.75 + (dM / maxDepthM) * 6000);
      // Friction lock threshold (when compression exceeds helical buckling limit)
      const frictionLock = Math.max(0, 18000 - (dM / maxDepthM) * 16000);

      curve.push({
        depthM: dM,
        depthFt: dFt,
        expectedPohLbf: Math.max(0, rawPoh),
        expectedRihLbf: rawRih,
        oplimPohLbf: oplimPoh,
        oplimRihLbf: 32000,
        frictionLockRihLbf: frictionLock,
      });
    }

    return curve;
  }, [ct, geom, wBuoyedLbM, config, maxDepthM, activeWellPreset]);

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
          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Well Matching:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveWellPreset('MRJN-764');
                  setConfig((c) => ({ ...c, wellName: 'MRJN-764', frictionCasing: 0.24 }));
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
                  setConfig((c) => ({ ...c, wellName: 'DEEP-GAS-01', frictionCasing: 0.28 }));
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
                  setConfig((c) => ({ ...c, wellName: 'ER-WELL-09', frictionCasing: 0.32 }));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeWellPreset === 'EXTENDED-REACH'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extended Reach (Lockup)
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
      </div>

      {/* 3. Primary SVG TFA Chart Canvas (Matching the exact look of Cerberus / CTES Orion) */}
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
