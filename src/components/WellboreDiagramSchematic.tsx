import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import { WellboreProfile, CasingSection, PerforatedInterval } from '../types/wellbore';
import { 
  ftToM, 
  mToFt, 
  inToMm, 
  mmToIn, 
  psiToMpa, 
  lbfToKn,
  calculateWellboreForces,
  WellboreForcesResult
} from '../utils/engineeringCalculations';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Compass, 
  Eye, 
  Maximize2, 
  Info, 
  Settings2, 
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Palette,
  Trash2,
  Plus,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Activity,
  Anchor,
  HelpCircle,
  Gauge,
  Target,
  Crosshair,
  MapPin,
  Zap,
  Flame,
  ShieldAlert,
  Lock,
  Shield
} from 'lucide-react';
import ctIngressRigImage from '../assets/images/ct_ingress_rig_stack_1789789575355.jpg';
import { useToast } from '../context/ToastContext';
import { 
  calculateBhaFatigueStress, 
  BhaFatigueMonitoringResult, 
  BhaSegmentFatigueDetail 
} from '../utils/bhaFatigueCalculations';
import { BhaFatigueIndicator } from './BhaFatigueIndicator';
import { BucklingMiniProfilePlot } from './BucklingMiniProfilePlot';
import { BHA_PRESETS } from '../data/bhaPresets';

export type CtSimulationColor = 'royal_blue' | 'electric_blue' | 'navy_blue' | 'sky_blue' | 'cyan_blue';

export const CT_COLOR_THEMES: Record<
  CtSimulationColor, 
  {
    name: string;
    label: string;
    light: string;
    main: string;
    dark: string;
    glow: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  royal_blue: {
    name: 'Royal Blue',
    label: 'Classic Metallic Blue (Industrial CT)',
    light: '#60a5fa',
    main: '#2563eb',
    dark: '#1e40af',
    glow: 'rgba(37, 99, 235, 0.45)',
    border: '#1d4ed8',
    badgeBg: 'bg-blue-950',
    badgeText: 'text-blue-300',
  },
  electric_blue: {
    name: 'Electric Blue',
    label: 'Electric Blue (High Visibility)',
    light: '#38bdf8',
    main: '#0284c7',
    dark: '#0369a1',
    glow: 'rgba(2, 132, 199, 0.5)',
    border: '#0284c7',
    badgeBg: 'bg-sky-950',
    badgeText: 'text-sky-300',
  },
  navy_blue: {
    name: 'Deep Navy',
    label: 'Deep Navy / Indigo Blue',
    light: '#93c5fd',
    main: '#1d4ed8',
    dark: '#1e3a8a',
    glow: 'rgba(30, 58, 138, 0.5)',
    border: '#1e3a8a',
    badgeBg: 'bg-indigo-950',
    badgeText: 'text-indigo-300',
  },
  sky_blue: {
    name: 'Sky Blue',
    label: 'Bright Sky Blue Metallic',
    light: '#bae6fd',
    main: '#0ea5e9',
    dark: '#0369a1',
    glow: 'rgba(14, 165, 233, 0.5)',
    border: '#0284c7',
    badgeBg: 'bg-blue-900',
    badgeText: 'text-blue-200',
  },
  cyan_blue: {
    name: 'Cyan Blue',
    label: 'Marine Cyan Blue',
    light: '#67e8f9',
    main: '#06b6d4',
    dark: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.5)',
    border: '#0891b2',
    badgeBg: 'bg-cyan-950',
    badgeText: 'text-cyan-300',
  },
};

interface WellboreDiagramSchematicProps {
  ct: CoiledTubingString;
  wellboreProfile: WellboreProfile;
  unitSystem: UnitSystem;
  forcesInput: WellboreForcesInput;
  forcesResult?: WellboreForcesResult;
  onOpenWellboreEditor: () => void;
  onOpenUsedStringUpdater: () => void;
  onUpdateWellboreProfile?: (updated: WellboreProfile) => void;
  onOpenBucklingPlot?: () => void;
}

export const WellboreDiagramSchematic: React.FC<WellboreDiagramSchematicProps> = ({
  ct,
  wellboreProfile: initialWellboreProfile,
  unitSystem,
  forcesInput,
  forcesResult,
  onOpenWellboreEditor,
  onOpenUsedStringUpdater,
  onUpdateWellboreProfile,
  onOpenBucklingPlot,
}) => {
  const isMetric = unitSystem === 'metric';

  // Internal wellbore profile copy allowing direct interactive deletions
  const [profile, setProfile] = useState<WellboreProfile>(initialWellboreProfile);

  // Synchronize when external profile changes
  useEffect(() => {
    setProfile(initialWellboreProfile);
  }, [initialWellboreProfile]);

  const maxDepthFt = Math.max(forcesInput.measuredDepthFt, profile.totalDepthMdFt || 12000);

  // Dynamic CT position & motion simulation
  const [currentDepthFt, setCurrentDepthFt] = useState<number>(Math.round(maxDepthFt * 0.45));
  const [targetDepthFt, setTargetDepthFt] = useState<number>(forcesInput.measuredDepthFt || 10000);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [opMode, setOpMode] = useState<'RIH' | 'POOH' | 'STANDBY'>('RIH');
  const [simSpeedFtPerMin, setSimSpeedFtPerMin] = useState<number>(120);
  const [simTimeSec, setSimTimeSec] = useState<number>(2);

  // Synchronize targetDepthFt if forcesInput changes
  useEffect(() => {
    if (forcesInput.measuredDepthFt && forcesInput.measuredDepthFt > 0) {
      setTargetDepthFt(forcesInput.measuredDepthFt);
    }
  }, [forcesInput.measuredDepthFt]);

  // Linear motion displacement offset for dynamic continuous string texture
  const [stringMotionOffsetPx, setStringMotionOffsetPx] = useState<number>(0);

  // Clickable Depth Location Force Marker
  const [markerDepthFt, setMarkerDepthFt] = useState<number | null>(Math.round(maxDepthFt * 0.45));
  const [hoverDepthFt, setHoverDepthFt] = useState<number | null>(null);
  const [hoverCursorPos, setHoverCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDynamicCursorEnabled, setIsDynamicCursorEnabled] = useState<boolean>(true);
  const [isMarkerInspectorOpen, setIsMarkerInspectorOpen] = useState<boolean>(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Rotation angles for Reel and Injector Sprockets
  const [reelAngleDeg, setReelAngleDeg] = useState<number>(45);
  const [sprocketAngleDeg, setSprocketAngleDeg] = useState<number>(0);
  const [chainOffsetPx, setChainOffsetPx] = useState<number>(0);

  // UI Toggles
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showFluids, setShowFluids] = useState<boolean>(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [ctColorKey, setCtColorKey] = useState<CtSimulationColor>('royal_blue');
  const [showDataManager, setShowDataManager] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Smooth transition animation state for BHA icon when toggling between RIH and POOH
  const [bhaModePulse, setBhaModePulse] = useState<{ mode: 'RIH' | 'POOH'; id: number } | null>(null);
  const [bhaInertiaY, setBhaInertiaY] = useState<number>(0);
  const smoothVelRef = useRef<number>(0);
  const lastOpModeRef = useRef<'RIH' | 'POOH' | 'STANDBY'>('RIH');

  // Trigger smooth transition animation whenever toggling between RIH and POOH
  useEffect(() => {
    if (opMode === 'RIH' || opMode === 'POOH') {
      if (lastOpModeRef.current !== opMode) {
        setBhaModePulse({ mode: opMode, id: Date.now() });
        // Inertial spring impulse on BHA toolstring during direction change
        setBhaInertiaY(opMode === 'RIH' ? 4 : -4);
        const timer = setTimeout(() => setBhaInertiaY(0), 380);
        const clearPulse = setTimeout(() => setBhaModePulse(null), 1800);
        lastOpModeRef.current = opMode;
        return () => {
          clearTimeout(timer);
          clearTimeout(clearPulse);
        };
      }
    }
    lastOpModeRef.current = opMode;
  }, [opMode]);

  // New Casing Form Modal
  const [showAddCasingModal, setShowAddCasingModal] = useState<boolean>(false);
  const [newCsg, setNewCsg] = useState<{
    name: string;
    type: CasingSection['type'];
    topDepthFt: number;
    bottomDepthFt: number;
    outerDiameterIn: number;
    innerDiameterIn: number;
    weightLbFt: number;
    grade: string;
  }>({
    name: 'Production Liner 5.0"',
    type: 'liner',
    topDepthFt: 8500,
    bottomDepthFt: 12500,
    outerDiameterIn: 5.0,
    innerDiameterIn: 4.276,
    weightLbFt: 18.0,
    grade: 'P-110',
  });

  const activeCtTheme = CT_COLOR_THEMES[ctColorKey];

  // Animation frame loop for continuous rotation of reel, injector and pipe movement
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const animate = (time: number) => {
      const deltaSec = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      if (isSimulating) {
        // Increment simulation time counter
        setSimTimeSec((prev) => +(prev + deltaSec).toFixed(1));

        // Visual speed scaling: enables responsive, buttery smooth transit across the wellbore
        // (traversing wellbore takes ~20s at 120 ft/min instead of 27 minutes)
        const visualTraverseScale = maxDepthFt / 45;
        const targetSpeedFtPerSec = (simSpeedFtPerMin / 60) * visualTraverseScale;

        let targetVelocity = 0;
        if (opMode === 'RIH') {
          targetVelocity = targetSpeedFtPerSec;
        } else if (opMode === 'POOH') {
          targetVelocity = -targetSpeedFtPerSec;
        } else {
          targetVelocity = 0;
        }

        // Smooth critically-damped exponential easing on velocity:
        // When toggling between RIH and POOH, velocity eases smoothly from +v through 0 to -v,
        // eliminating abrupt snaps and creating realistic mechanical momentum!
        const easeRate = 4.5; // ~0.45s smooth transition duration
        const currentVel = smoothVelRef.current;
        const newVel = currentVel + (targetVelocity - currentVel) * Math.min(1, deltaSec * easeRate);
        smoothVelRef.current = newVel;

        const depthDelta = newVel * deltaSec;
        const rotDelta = depthDelta * 0.08;
        const motionPxDelta = depthDelta * 0.45;

        // Reel, sprockets, gripper chain, and dynamic tubing seam all follow the smoothed velocity
        if (Math.abs(newVel) > 0.01) {
          setReelAngleDeg((prev) => (prev + rotDelta * 30 + 360) % 360);
          setSprocketAngleDeg((prev) => (prev + rotDelta * 90 + 360) % 360);
          setChainOffsetPx((prev) => (prev + (rotDelta > 0 ? 0.8 : -0.8) * Math.abs(rotDelta) * 20 + 18) % 18);
          setStringMotionOffsetPx((prev) => (prev - motionPxDelta * 10) % 2000);

          setCurrentDepthFt((prev) => {
            const next = prev + depthDelta;
            if (next >= targetDepthFt && opMode === 'RIH') {
              setOpMode('STANDBY');
              setToastMessage(`🎯 Target depth of ${Math.round(targetDepthFt).toLocaleString()} ft reached! Injector brakes engaged in STANDBY.`);
              return targetDepthFt;
            }
            if (next <= 0 && opMode === 'POOH') {
              setOpMode('STANDBY');
              setToastMessage('Coiled tubing string pulled to surface RKB (0.0 ft). In STANDBY.');
              return 0;
            }
            return Math.max(0, Math.min(maxDepthFt, next));
          });
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSimulating, opMode, simSpeedFtPerMin, maxDepthFt, targetDepthFt]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Data Deletion Handlers
  const handleDeleteCasing = (id: string) => {
    if (profile.casingSections.length <= 1) {
      setToastMessage('Cannot delete the last remaining casing section (Well requires at least 1 bore).');
      return;
    }
    const targetCasing = profile.casingSections.find((c) => c.id === id);
    const updatedSections = profile.casingSections.filter((c) => c.id !== id);
    const updatedProfile = {
      ...profile,
      casingSections: updatedSections,
      totalDepthMdFt: Math.max(...updatedSections.map((c) => c.bottomDepthFt), 5000),
    };
    setProfile(updatedProfile);
    if (onUpdateWellboreProfile) onUpdateWellboreProfile(updatedProfile);
    setToastMessage(`Deleted casing string: ${targetCasing?.name || id}`);
    setDeleteConfirmId(null);
  };

  const handleDeletePerforation = (id: string) => {
    const targetPerf = profile.perforations.find((p) => p.id === id);
    const updatedPerfs = profile.perforations.filter((p) => p.id !== id);
    const updatedProfile = {
      ...profile,
      perforations: updatedPerfs,
    };
    setProfile(updatedProfile);
    if (onUpdateWellboreProfile) onUpdateWellboreProfile(updatedProfile);
    setToastMessage(`Deleted perforation interval: ${targetPerf?.formationName || id}`);
  };

  const handleResetToDefaults = () => {
    setProfile(initialWellboreProfile);
    if (onUpdateWellboreProfile) onUpdateWellboreProfile(initialWellboreProfile);
    setToastMessage('Reset wellbore architecture to default preset specifications.');
  };

  const handleAddCasingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSection: CasingSection = {
      id: `csg-${Date.now()}`,
      name: newCsg.name,
      type: newCsg.type,
      topDepthFt: Number(newCsg.topDepthFt),
      bottomDepthFt: Number(newCsg.bottomDepthFt),
      outerDiameterIn: Number(newCsg.outerDiameterIn),
      innerDiameterIn: Number(newCsg.innerDiameterIn),
      weightLbFt: Number(newCsg.weightLbFt),
      grade: newCsg.grade,
      frictionCoefficient: 0.24,
      isCemented: true,
    };
    const updatedSections = [...profile.casingSections, newSection].sort((a, b) => a.topDepthFt - b.topDepthFt);
    const updatedProfile = {
      ...profile,
      casingSections: updatedSections,
      totalDepthMdFt: Math.max(profile.totalDepthMdFt, newSection.bottomDepthFt),
    };
    setProfile(updatedProfile);
    if (onUpdateWellboreProfile) onUpdateWellboreProfile(updatedProfile);
    setShowAddCasingModal(false);
    setToastMessage(`Added new casing section: ${newSection.name}`);
  };

  // SVG Geometry Mappings
  const svgWidth = 880;
  const svgHeight = 1120;
  const groundRkbY = 415; // Surface wellhead elevation line
  const wellBottomY = 1070;
  const usableWellHeight = wellBottomY - groundRkbY;
  const wellCenterX = 720; // Aligned with vertical injector, stripper, BOP centerline

  // Depth to Y mapping in the subsurface
  const depthToY = (depthFt: number) => {
    const ratio = Math.max(0, Math.min(1, depthFt / maxDepthFt));
    return groundRkbY + ratio * usableWellHeight;
  };

  const yToDepth = (y: number) => {
    const ratio = Math.max(0, Math.min(1, (y - groundRkbY) / usableWellHeight));
    return Math.round(ratio * maxDepthFt);
  };

  // Click & hover handlers for depth marker placement on the wellbore
  const handleWellboreClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleY = svgHeight / rect.height;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickY >= groundRkbY && clickY <= wellBottomY) {
      const clickedDepth = yToDepth(clickY);
      setMarkerDepthFt(clickedDepth);
      setIsMarkerInspectorOpen(true);
    }
  };

  const handleWellboreMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    const moveX = (e.clientX - rect.left) * scaleX;
    const moveY = (e.clientY - rect.top) * scaleY;

    if (moveY >= groundRkbY && moveY <= wellBottomY) {
      setHoverDepthFt(yToDepth(moveY));
      setHoverCursorPos({ x: moveX, y: moveY });
    } else {
      setHoverDepthFt(null);
      setHoverCursorPos(null);
    }
  };

  const ctTipY = depthToY(currentDepthFt);
  const bhaLengthPx = 48;
  const bhaTopY = Math.max(groundRkbY, ctTipY - bhaLengthPx + bhaInertiaY);

  // Sorted casing strings
  const casingStrings = [...profile.casingSections].sort((a, b) => a.topDepthFt - b.topDepthFt);

  // Active casing at CT tip
  const activeCasingAtCt = casingStrings.find(
    (c) => currentDepthFt >= c.topDepthFt && currentDepthFt <= c.bottomDepthFt
  ) || casingStrings[casingStrings.length - 1];

  const casingIdIn = activeCasingAtCt?.innerDiameterIn || 4.778;
  const radialClearanceIn = (casingIdIn - ct.outerDiameterIn) / 2;

  // Real-time Reel RPM: v = w * r => w = v / r
  const reelRadiusFt = 4.2;
  const reelRpm = (isSimulating && opMode !== 'STANDBY') ? (simSpeedFtPerMin / (2 * Math.PI * reelRadiusFt)) : 0;

  // Estimated Surface Hookload (simplified for animation HUD)
  const ctAirWeightLbFt = ct.nominalWeightLbFt || 3.5;
  const hookloadLbf = Math.round(
    currentDepthFt * ctAirWeightLbFt * 0.85 + (opMode === 'POOH' ? 3800 : opMode === 'RIH' ? -2200 : 0)
  );

  // Helper to calculate exact forces, stresses, and buckling limits at any specified depth
  const calculateForcesAtDepth = (depthFt: number) => {
    const activeResults = forcesResult || calculateWellboreForces(ct, forcesInput);
    const profilePoints = activeResults.weightProfile;
    if (!profilePoints || profilePoints.length === 0) return null;

    const depth = Math.max(0, Math.min(maxDepthFt, depthFt));

    // Find bounding points in weightProfile
    let p0 = profilePoints[0];
    let p1 = profilePoints[profilePoints.length - 1];

    if (depth <= profilePoints[0].depthFt) {
      p0 = profilePoints[0];
      p1 = profilePoints[0];
    } else if (depth >= profilePoints[profilePoints.length - 1].depthFt) {
      p0 = profilePoints[profilePoints.length - 1];
      p1 = profilePoints[profilePoints.length - 1];
    } else {
      for (let i = 0; i < profilePoints.length - 1; i++) {
        if (profilePoints[i].depthFt <= depth && profilePoints[i + 1].depthFt >= depth) {
          p0 = profilePoints[i];
          p1 = profilePoints[i + 1];
          break;
        }
      }
    }

    const t = p1.depthFt === p0.depthFt ? 0 : (depth - p0.depthFt) / (p1.depthFt - p0.depthFt);
    const interp = (v0: number, v1: number) => v0 + t * (v1 - v0);

    const slackoffLbf = interp(p0.slackoffLbf, p1.slackoffLbf);
    const neutralLbf = interp(p0.neutralLbf, p1.neutralLbf);
    const pickupLbf = interp(p0.pickupLbf, p1.pickupLbf);
    const sinusoidalLimitLbf = interp(p0.sinusoidalLimitLbf, p1.sinusoidalLimitLbf);
    const helicalLimitLbf = interp(p0.helicalLimitLbf, p1.helicalLimitLbf);
    const inclinationDeg = interp(p0.inclinationDeg ?? 0, p1.inclinationDeg ?? 0);
    const tvdFt = interp(p0.tvdFt ?? depth, p1.tvdFt ?? depth);
    const dls = interp(p0.dls ?? 0, p1.dls ?? 0);
    const dragLbf = Math.abs(pickupLbf - neutralLbf);

    // Active casing at target depth
    const activeCsg = casingStrings.find(
      (c) => depth >= c.topDepthFt && depth <= c.bottomDepthFt
    ) || casingStrings[casingStrings.length - 1];

    const casingInnerDiamIn = activeCsg?.innerDiameterIn || 4.778;
    const radialGapIn = (casingInnerDiamIn - ct.outerDiameterIn) / 2;

    // Tubing wall cross-sectional area & axial stress
    const wallAreaSqIn = (Math.PI / 4) * (Math.pow(ct.outerDiameterIn, 2) - Math.pow(ct.innerDiameterIn, 2));
    const axialTensionStressPsi = wallAreaSqIn > 0 ? Math.max(0, pickupLbf) / wallAreaSqIn : 0;
    const yieldStrengthPsi = ct.yieldStrengthPsi || 80000;
    const yieldUtilizationPercent = yieldStrengthPsi > 0 ? (axialTensionStressPsi / yieldStrengthPsi) * 100 : 0;

    // Buckling Evaluation
    const absSinLimit = Math.abs(sinusoidalLimitLbf);
    const absHelLimit = Math.abs(helicalLimitLbf);
    const isCompressive = slackoffLbf < 0;
    const compMag = Math.abs(Math.min(0, slackoffLbf));

    let bucklingStatus: 'Tension (Safe)' | 'Pre-Buckling Compression' | 'Sinusoidal Buckling' | 'Helical Buckling (Lockup Alert)';
    let statusColor: 'emerald' | 'cyan' | 'amber' | 'rose';

    if (!isCompressive) {
      bucklingStatus = 'Tension (Safe)';
      statusColor = 'emerald';
    } else if (compMag < absSinLimit) {
      bucklingStatus = 'Pre-Buckling Compression';
      statusColor = 'cyan';
    } else if (compMag < absHelLimit) {
      bucklingStatus = 'Sinusoidal Buckling';
      statusColor = 'amber';
    } else {
      bucklingStatus = 'Helical Buckling (Lockup Alert)';
      statusColor = 'rose';
    }

    return {
      depthFt: depth,
      tvdFt,
      inclinationDeg,
      dls,
      slackoffLbf,
      neutralLbf,
      pickupLbf,
      dragLbf,
      sinusoidalLimitLbf: -absSinLimit,
      helicalLimitLbf: -absHelLimit,
      absSinLimit,
      absHelLimit,
      bucklingStatus,
      statusColor,
      activeCsg,
      casingInnerDiamIn,
      radialGapIn,
      axialTensionStressPsi,
      yieldUtilizationPercent,
      isCompressive,
      compMag,
    };
  };

  // Calculated Forces at the Exact Clicked/Selected Depth Marker Location
  const markerForces = useMemo(() => {
    if (markerDepthFt === null) return null;
    return calculateForcesAtDepth(markerDepthFt);
  }, [markerDepthFt, forcesResult, ct, forcesInput, maxDepthFt, casingStrings]);

  // Dynamic Calculated Forces at the Exact Hovered Depth Cursor Location
  const hoverForces = useMemo(() => {
    if (hoverDepthFt === null || !isDynamicCursorEnabled) return null;
    return calculateForcesAtDepth(hoverDepthFt);
  }, [hoverDepthFt, isDynamicCursorEnabled, forcesResult, ct, forcesInput, maxDepthFt, casingStrings]);

  // Toast dispatch hook
  const { addToast } = useToast();
  const [testHighDls, setTestHighDls] = useState<boolean>(false);

  // Active BHA toolstring segments
  const effectiveBhaSegments = useMemo(() => {
    if (forcesInput.bhaConfig?.enabled && forcesInput.bhaConfig.segments && forcesInput.bhaConfig.segments.length > 0) {
      return forcesInput.bhaConfig.segments;
    }
    if (ct.bhaConfig?.enabled && ct.bhaConfig.segments && ct.bhaConfig.segments.length > 0) {
      return ct.bhaConfig.segments;
    }
    return BHA_PRESETS.cleanout?.config?.segments || [];
  }, [forcesInput.bhaConfig, ct.bhaConfig]);

  // Real-time BHA Fatigue Monitoring Engine
  const fatigueResult: BhaFatigueMonitoringResult = useMemo(() => {
    return calculateBhaFatigueStress({
      bhaSegments: effectiveBhaSegments,
      currentDepthFt,
      ct,
      stations: forcesInput.surveyStations,
      slackoffLbf: markerForces?.slackoffLbf ?? (opMode === 'RIH' ? -1800 : opMode === 'POOH' ? 2500 : 0),
      dlsMultiplier: testHighDls ? 3.0 : 1.0,
      simulatedDlsOverride: testHighDls ? 4.8 : undefined,
    });
  }, [effectiveBhaSegments, currentDepthFt, ct, forcesInput.surveyStations, markerForces, opMode, testHighDls]);

  // Real-time fatigue warning toast dispatcher during animation
  const lastFatigueToastTimeRef = useRef<number>(0);
  const lastFatigueCritSegRef = useRef<string | null>(null);

  useEffect(() => {
    if (fatigueResult.anyExceedsEnduranceLimit && fatigueResult.criticalSegment) {
      const now = Date.now();
      const crit = fatigueResult.criticalSegment;
      // Trigger warning toast if new alert or after 9-second cooldown while remaining in over-stress zone
      if (now - lastFatigueToastTimeRef.current > 9000 || lastFatigueCritSegRef.current !== crit.segmentId) {
        lastFatigueToastTimeRef.current = now;
        lastFatigueCritSegRef.current = crit.segmentId;

        const stressKsi = (crit.totalBendingStressPsi / 1000).toFixed(1);
        const stressMpa = Math.round(psiToMpa(crit.totalBendingStressPsi));
        const limitKsi = (crit.enduranceLimitPsi / 1000).toFixed(1);
        const limitMpa = Math.round(psiToMpa(crit.enduranceLimitPsi));
        const curDepth = Math.round(isMetric ? ftToM(currentDepthFt) : currentDepthFt);
        const unitDepth = isMetric ? 'm' : 'ft';

        addToast({
          title: `⚠️ Fatigue Endurance Limit Exceeded: ${crit.segmentName}`,
          message: `Simulated bending stress (${stressKsi} ksi / ${stressMpa} MPa) has exceeded the material endurance limit (${limitKsi} ksi / ${limitMpa} MPa) at depth ${curDepth.toLocaleString()} ${unitDepth} (DLS ${crit.dlsDegPer100ft}°/100ft). Tool stiffness and borehole curvature risk rapid cyclic fatigue cracking.`,
          severity: 'warning',
          parameterName: 'BHA Bending Stress (σ_b)',
          enteredValue: `${stressKsi} ksi`,
          safeRange: `< ${limitKsi} ksi (Fatigue Endurance Limit S_e)`,
          engineeringStandard: 'API RP 5C7 / ASME Fatigue Criteria (S_e ≈ 0.40·S_y)',
          autoDismissMs: 7500,
        });
      }
    } else if (!fatigueResult.anyExceedsEnduranceLimit) {
      lastFatigueCritSegRef.current = null;
    }
  }, [
    fatigueResult.anyExceedsEnduranceLimit,
    fatigueResult.criticalSegment,
    currentDepthFt,
    addToast,
    isMetric,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shadow-inner">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base tracking-tight">
                Wellbore Architecture &amp; CT Ingress Diagram
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                {profile.wellName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Live Animated Stack
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive metallic rig stack: rotating reel, dual-chain injector, stripper &amp; quad BOP with subsurface casing architecture.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Reference Image Viewer Toggle */}
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="View 3D Technical Rig Illustration"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>3D Rig Reference</span>
          </button>

          {/* Manage & Delete Data Drawer Button */}
          <button
            type="button"
            onClick={() => setShowDataManager(!showDataManager)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showDataManager 
                ? 'bg-rose-950 text-rose-300 border-rose-700 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Open architecture data manager to delete or add casing and perfs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Manage &amp; Delete Data ({profile.casingSections.length} Csg)</span>
            {showDataManager ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onOpenWellboreEditor}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Full Well Editor</span>
          </button>
        </div>
      </div>

      {/* 1.1 Notification Toast */}
      {toastMessage && (
        <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded bg-emerald-900/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Collapsible Data Manager & Deletion Drawer */}
      {showDataManager && (
        <div className="p-4 bg-slate-950/95 border-b border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Wellbore Architecture Data Manager (Delete, Add &amp; Clean)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCasingModal(true)}
                className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>Add Casing String</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                title="Reset all casings back to preset defaults"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Casing Strings Table with Direct Trash Buttons */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Casing String</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Top Depth</th>
                  <th className="py-2 px-3">Shoe Depth</th>
                  <th className="py-2 px-3">Outer Dia.</th>
                  <th className="py-2 px-3">Inner Dia.</th>
                  <th className="py-2 px-3">Weight</th>
                  <th className="py-2 px-3">Grade</th>
                  <th className="py-2 px-3 text-center">Action / Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {profile.casingSections.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>{cs.name}</span>
                    </td>
                    <td className="py-2 px-3 uppercase text-slate-400 font-sans">{cs.type.replace('_', ' ')}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {Math.round(isMetric ? ftToM(cs.topDepthFt) : cs.topDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                    </td>
                    <td className="py-2 px-3 text-emerald-300 font-semibold">
                      {Math.round(isMetric ? ftToM(cs.bottomDepthFt) : cs.bottomDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{cs.outerDiameterIn.toFixed(3)}"</td>
                    <td className="py-2 px-3 text-cyan-300 font-bold">{cs.innerDiameterIn.toFixed(3)}"</td>
                    <td className="py-2 px-3 text-slate-400">{cs.weightLbFt} lb/ft</td>
                    <td className="py-2 px-3 text-slate-300">{cs.grade}</td>
                    <td className="py-2 px-3 text-center">
                      {deleteConfirmId === cs.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteCasing(cs.id)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(cs.id)}
                          className="p-1.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/60 transition-colors inline-flex items-center gap-1"
                          title={`Delete ${cs.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Perforations List with Delete */}
          {profile.perforations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Perforated Intervals ({profile.perforations.length} Active Zones)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {profile.perforations.map((perf) => (
                  <div key={perf.id} className="p-2.5 bg-slate-900 rounded-lg border border-amber-900/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-amber-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>{perf.formationName}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {Math.round(isMetric ? ftToM(perf.topDepthFt) : perf.topDepthFt).toLocaleString()} - {Math.round(isMetric ? ftToM(perf.bottomDepthFt) : perf.bottomDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'} ({perf.shotsPerFoot} SPF, {perf.inflowFluidType.toUpperCase()})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePerforation(perf.id)}
                      className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                      title="Delete perforation interval"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Operational Simulation Ribbon & Playback Controls */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Depth Scrubber */}
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <span className="font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5 text-blue-400" />
            <span>CT Depth:</span>
          </span>
          <input
            type="range"
            min="0"
            max={maxDepthFt}
            value={currentDepthFt}
            onChange={(e) => {
              setIsSimulating(false);
              setCurrentDepthFt(parseFloat(e.target.value));
            }}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="font-mono font-bold text-cyan-300 shrink-0 w-28 text-right bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 shadow-inner">
            {Math.round(isMetric ? ftToM(currentDepthFt) : currentDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
          </span>
        </div>

        {/* Simulation Play/Pause, 3 Operation Modes, & Target Depth Control */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isSimulating
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Pause' : 'Start'}</span>
          </button>

          {/* Operation Modes: RIH, POOH, STANDBY */}
          <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                // If at bottom, give room to run in hole
                if (currentDepthFt >= targetDepthFt - 50) {
                  if (targetDepthFt >= maxDepthFt - 100) {
                    setCurrentDepthFt(0);
                  } else {
                    setTargetDepthFt(Math.min(maxDepthFt, currentDepthFt + 3000));
                  }
                }
                setOpMode('RIH');
                setIsSimulating(true);
              }}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
                opMode === 'RIH'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                  : 'text-emerald-400 hover:bg-emerald-950/60'
              }`}
              title="Run In Hole (RIH) - Continuous ingress towards target depth"
            >
              <ArrowDownCircle className={`w-3.5 h-3.5 ${opMode === 'RIH' && isSimulating ? 'animate-bounce' : ''}`} />
              <span>RIH</span>
            </button>

            <button
              type="button"
              onClick={() => {
                // If at surface, set room downhole to smoothly pull out of hole
                if (currentDepthFt <= 100) {
                  setCurrentDepthFt(Math.min(maxDepthFt * 0.75, targetDepthFt > 500 ? targetDepthFt : 5000));
                }
                setOpMode('POOH');
                setIsSimulating(true);
              }}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
                opMode === 'POOH'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/50'
                  : 'text-amber-400 hover:bg-amber-950/60'
              }`}
              title="Pull Out Of Hole (POOH) - Egress back to surface RKB"
            >
              <ArrowUpCircle className={`w-3.5 h-3.5 ${opMode === 'POOH' && isSimulating ? 'animate-bounce' : ''}`} />
              <span>POOH</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpMode('STANDBY');
              }}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
                opMode === 'STANDBY'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-cyan-400 hover:bg-cyan-950/60'
              }`}
              title="Standby / Stationary - Injector brakes locked, holding string depth"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>STANDBY</span>
            </button>
          </div>

          {/* Target Depth Selector & Quick Presets */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-semibold text-[11px]">Target:</span>
            <input
              type="number"
              min="0"
              max={maxDepthFt}
              step="500"
              value={Math.round(isMetric ? ftToM(targetDepthFt) : targetDepthFt)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setTargetDepthFt(isMetric ? mToFt(val) : val);
              }}
              className="w-16 sm:w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono font-bold text-center text-[11px] focus:outline-none focus:border-cyan-500"
              title="Set simulation Target Depth"
            />
            <span className="text-slate-500 font-mono text-[10px]">{isMetric ? 'm' : 'ft'}</span>
            <div className="hidden sm:flex items-center gap-1 ml-0.5">
              <button
                type="button"
                onClick={() => setTargetDepthFt(5000)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  targetDepthFt === 5000 ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                5k
              </button>
              <button
                type="button"
                onClick={() => setTargetDepthFt(8000)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  targetDepthFt === 8000 ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                8k
              </button>
              <button
                type="button"
                onClick={() => setTargetDepthFt(10000)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  targetDepthFt === 10000 ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                10k
              </button>
              <button
                type="button"
                onClick={() => setTargetDepthFt(maxDepthFt)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  targetDepthFt === maxDepthFt ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Set Target to Total Depth (TD)"
              >
                TD
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSimulating(false);
              setOpMode('STANDBY');
              setCurrentDepthFt(0);
              setSimTimeSec(0);
              setToastMessage('Reset coiled tubing to surface wellhead (0.0 ft).');
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Reset CT String to Surface RKB"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Animation Speed Slider & Observation Mode Control */}
          <div
            id="simulation-speed-slider-container"
            className="flex items-center gap-2.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed:</span>
            </div>

            {/* Continuous Range Slider */}
            <div className="flex items-center gap-2">
              <input
                id="sim-speed-slider"
                type="range"
                min="10"
                max="300"
                step="5"
                value={simSpeedFtPerMin}
                onChange={(e) => setSimSpeedFtPerMin(Number(e.target.value))}
                className="w-20 sm:w-28 md:w-36 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all"
                title={`Adjust animation speed: ${simSpeedFtPerMin} ft/min (${Math.round(ftToM(simSpeedFtPerMin))} m/min)`}
              />
              
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 min-w-[56px] text-right">
                  {simSpeedFtPerMin}
                  <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                    {isMetric ? 'ft/m' : 'ft/m'}
                  </span>
                </span>
                
                {/* Observation Mode Badge */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border hidden md:inline-block ${
                    simSpeedFtPerMin <= 30
                      ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                      : simSpeedFtPerMin <= 90
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                      : simSpeedFtPerMin <= 180
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}
                  title={
                    simSpeedFtPerMin <= 30
                      ? 'Slow-Motion: High precision for observing stripper seal, BOP rams, and casing transitions'
                      : simSpeedFtPerMin <= 90
                      ? 'Inspection Rate: Steady string ingress and tubing payout'
                      : simSpeedFtPerMin <= 180
                      ? 'Standard Operational Running Speed'
                      : 'Rapid Transit Rate'
                  }
                >
                  {simSpeedFtPerMin <= 30
                    ? 'Slow-Mo'
                    : simSpeedFtPerMin <= 90
                    ? 'Inspect'
                    : simSpeedFtPerMin <= 180
                    ? 'Standard'
                    : 'Fast'}
                </span>
              </div>
            </div>

            {/* Quick Snap Presets */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-2">
              {[
                { label: 'Crawl', spd: 20, desc: 'Ultra slow-motion (20 ft/min) for fine observation' },
                { label: '60', spd: 60, desc: 'Careful ingress (60 ft/min)' },
                { label: '120', spd: 120, desc: 'Standard speed (120 ft/min)' },
                { label: '240', spd: 240, desc: 'Rapid transit (240 ft/min)' },
              ].map((p) => (
                <button
                  key={p.spd}
                  type="button"
                  onClick={() => setSimSpeedFtPerMin(p.spd)}
                  title={p.desc}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-medium transition-colors ${
                    simSpeedFtPerMin === p.spd
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coiled Tubing Metallic Color Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              CT Theme:
            </span>
            <div className="flex items-center gap-1">
              {(['royal_blue', 'electric_blue', 'navy_blue', 'sky_blue', 'cyan_blue'] as CtSimulationColor[]).map((key) => {
                const theme = CT_COLOR_THEMES[key];
                const isSelected = ctColorKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCtColorKey(key)}
                    title={`Set CT to ${theme.label}`}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      isSelected 
                        ? 'ring-2 ring-white scale-125 shadow-sm' 
                        : 'opacity-65 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: theme.main }}
                  />
                );
              })}
            </div>
          </div>

          {/* Dynamic Cursor Tool Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setIsDynamicCursorEnabled(!isDynamicCursorEnabled)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-all ${
                isDynamicCursorEnabled
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Toggle real-time depth, tension & buckling inspection cursor"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isDynamicCursorEnabled ? 'text-cyan-200 animate-pulse' : 'text-slate-500'}`} />
              <span>Dynamic Cursor: {isDynamicCursorEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Depth Force Marker Jumper */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                if (markerDepthFt === null) {
                  setMarkerDepthFt(Math.round(currentDepthFt));
                  setIsMarkerInspectorOpen(true);
                } else {
                  setIsMarkerInspectorOpen(!isMarkerInspectorOpen);
                }
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
                markerDepthFt !== null
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Click or toggle depth location force marker"
            >
              <Target className="w-3.5 h-3.5 text-cyan-300" />
              <span>
                {markerDepthFt !== null 
                  ? `Marker: ${Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt).toLocaleString()} ${isMetric ? 'm' : 'ft'}`
                  : 'Place Depth Marker'}
              </span>
            </button>
            {markerDepthFt !== null && (
              <button
                type="button"
                onClick={() => setMarkerDepthFt(null)}
                className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                title="Clear depth marker"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Diagram Canvas & Subsurface Geometry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-slate-950 items-start">
        {/* Left & Center Canvas (3 Columns) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
          {/* Authentic Top-Left Simulation Overlay HUD (Matches user's reference photo) */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none select-none">
            <div className="text-sm sm:text-base font-bold font-sans tracking-wide text-blue-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-blue-800/60 shadow-lg backdrop-blur-sm">
              Simulation Time: <span className="font-mono text-white">{Math.round(simTimeSec)}</span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border shadow-sm ${
                opMode === 'RIH'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70'
                  : opMode === 'POOH'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-600/70'
                  : 'bg-cyan-950/90 text-cyan-300 border-cyan-600/70'
              }`}>
                {opMode === 'RIH' ? 'RIH: Injecting In Hole' : opMode === 'POOH' ? 'POOH: Pulling Out Of Hole' : 'STANDBY: Holding Target Depth'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-300 border border-slate-700">
                Speed: {opMode === 'STANDBY' ? '0 ft/min (Held)' : `${simSpeedFtPerMin} ft/min`}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-300 border border-slate-700">
                Reel: {reelRpm.toFixed(1)} RPM
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 text-blue-300 border border-blue-800">
                Target: {Math.round(isMetric ? ftToM(targetDepthFt) : targetDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
              </span>
            </div>

            {/* Dynamic Cursor Live Telemetry Bar */}
            {hoverForces ? (
              <div className="flex items-center flex-wrap gap-2 mt-0.5 text-[10.5px] font-mono px-3 py-1.5 rounded-xl bg-slate-950/95 text-cyan-200 border border-cyan-500/80 shadow-2xl backdrop-blur-md animate-in fade-in duration-100">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    CURSOR: {Math.round(isMetric ? ftToM(hoverForces.depthFt) : hoverForces.depthFt).toLocaleString()} {isMetric ? 'm' : 'ft'} MD
                  </span>
                  <span className="text-slate-400 font-normal text-[9.5px]">
                    ({Math.round(isMetric ? ftToM(hoverForces.tvdFt) : hoverForces.tvdFt).toLocaleString()} TVD, {hoverForces.inclinationDeg.toFixed(1)}°)
                  </span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px]">Tension:</span>
                  <span className="text-amber-300 font-bold">
                    POOH {isMetric ? `${Math.round(lbfToKn(hoverForces.pickupLbf))} kN` : `${Math.round(hoverForces.pickupLbf).toLocaleString()} lbf`}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className={hoverForces.slackoffLbf < 0 ? 'text-purple-300 font-bold' : 'text-emerald-300 font-bold'}>
                    RIH {isMetric ? `${Math.round(lbfToKn(hoverForces.slackoffLbf))} kN` : `${Math.round(hoverForces.slackoffLbf).toLocaleString()} lbf`}
                  </span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[10px]">Buckling:</span>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-sans font-bold uppercase tracking-wider border shadow-xs ${
                    hoverForces.statusColor === 'emerald'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80'
                      : hoverForces.statusColor === 'cyan'
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/80'
                      : hoverForces.statusColor === 'amber'
                      ? 'bg-amber-950/90 text-amber-300 border-amber-600/80'
                      : 'bg-rose-950/90 text-rose-300 border-rose-600/80 animate-pulse'
                  }`}>
                    {hoverForces.bucklingStatus}
                  </span>
                </div>
                {hoverForces.activeCsg && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400 text-[9.5px] truncate max-w-[150px]">
                      {hoverForces.activeCsg.name}
                    </span>
                  </>
                )}
              </div>
            ) : markerForces ? (
              <div className="flex items-center flex-wrap gap-2 mt-0.5 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-950/90 text-cyan-200 border border-cyan-700/60 shadow-md">
                <Target className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>
                  Marker: <strong>{Math.round(isMetric ? ftToM(markerForces.depthFt) : markerForces.depthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}</strong>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-amber-300">
                  POOH: {isMetric ? `${Math.round(lbfToKn(markerForces.pickupLbf))} kN` : `${Math.round(markerForces.pickupLbf).toLocaleString()} lbf`}
                </span>
                <span className="text-slate-500">|</span>
                <span className={markerForces.slackoffLbf < 0 ? 'text-purple-300' : 'text-emerald-300'}>
                  RIH: {isMetric ? `${Math.round(lbfToKn(markerForces.slackoffLbf))} kN` : `${Math.round(markerForces.slackoffLbf).toLocaleString()} lbf`}
                </span>
                <span className="text-slate-500">|</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold uppercase ${
                  markerForces.statusColor === 'emerald'
                    ? 'text-emerald-400'
                    : markerForces.statusColor === 'cyan'
                    ? 'text-cyan-400'
                    : markerForces.statusColor === 'amber'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  {markerForces.bucklingStatus}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] font-mono px-2.5 py-1 rounded-lg bg-slate-950/70 text-slate-400 border border-slate-800">
                <Crosshair className="w-3 h-3 text-cyan-400/80" />
                <span>Hover over wellbore schematic to inspect exact depth, tension & buckling telemetry</span>
              </div>
            )}
          </div>

          {/* Interactive SVG Schematic */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className={`w-full max-w-[840px] h-auto select-none ${isDynamicCursorEnabled ? 'cursor-crosshair' : 'cursor-pointer'}`}
            style={{ maxHeight: '920px' }}
            onClick={handleWellboreClick}
            onMouseMove={handleWellboreMouseMove}
            onMouseLeave={() => {
              setHoverDepthFt(null);
              setHoverCursorPos(null);
            }}
          >
            <defs>
              {/* Metallic Blue Gradients for Reel, Injector, Stripper, BOP */}
              <linearGradient id="metallicBlueMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="35%" stopColor="#2563eb" />
                <stop offset="70%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>

              <linearGradient id="metallicBlueCylinder" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="25%" stopColor="#3b82f6" />
                <stop offset="60%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="metallicBlueDark" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="hydraulicRamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#bfdbfe" />
                <stop offset="40%" stopColor="#3b82f6" />
                <stop offset="80%" stopColor="#1e40af" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>

              <linearGradient id="sprocketSteel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>

              {/* CT Pipe Metallic Gradient */}
              <linearGradient id="ctGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={activeCtTheme.light} />
                <stop offset="35%" stopColor={activeCtTheme.main} />
                <stop offset="70%" stopColor={activeCtTheme.dark} />
                <stop offset="100%" stopColor={activeCtTheme.main} />
              </linearGradient>

              {/* Subsurface Casing Steel Gradient */}
              <linearGradient id="casingSteel" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="45%" stopColor="#94a3b8" />
                <stop offset="75%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Cement Pattern */}
              <pattern id="cementHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.35" />
              </pattern>

              {/* Glow filter for active directional arrow */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Fatigue Alert Pulsing Glow Filter */}
              <filter id="fatiguePulseGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComponentTransfer in="blur" result="glow">
                  <feFuncR type="linear" slope="2" />
                  <feFuncG type="linear" slope="0.5" />
                  <feFuncB type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Hazard Stripes Pattern for Over-Stressed BHA Segments */}
              <pattern id="fatigueHazardStripes" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <rect width="5" height="10" fill="#9f1239" />
                <rect x="5" width="5" height="10" fill="#e11d48" />
              </pattern>
            </defs>

            {/* Depth Scale Ruler on Far Left (Subsurface) */}
            <g id="depthRuler" className="font-mono text-[10px] fill-slate-500">
              <line x1="80" y1={groundRkbY} x2="80" y2={wellBottomY} stroke="#334155" strokeWidth="1.5" />
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
                const depthVal = Math.round(frac * maxDepthFt);
                const yPos = groundRkbY + frac * usableWellHeight;
                return (
                  <g key={idx}>
                    <line x1="72" y1={yPos} x2="88" y2={yPos} stroke="#64748b" strokeWidth="1.5" />
                    <text x="65" y={yPos + 3} textAnchor="end">
                      {Math.round(isMetric ? ftToM(depthVal) : depthVal).toLocaleString()} {isMetric ? 'm' : 'ft'}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Ground Elevation Reference Line */}
            <g id="groundLine">
              <line x1="85" y1={groundRkbY} x2={wellCenterX + 120} y2={groundRkbY} stroke="#475569" strokeWidth="2" strokeDasharray="5 5" />
              <text x="95" y={groundRkbY - 8} fill="#64748b" className="font-mono text-[10px] font-semibold">
                SURFACE RKB / WELLHEAD FLANGE (0.0 ft)
              </text>
            </g>

            {/* ========================================================= */}
            {/* PART 1: SURFACE RIG STACK (Reel, Injector, Stripper, BOP) */}
            {/* ========================================================= */}

            {/* 1.1 CT Reel Assembly (Left Side: Center X=150, Y=265, Radius=85) */}
            <g id="reelAssembly" className="cursor-pointer" onClick={() => setSelectedElement('CT Reel')}>
              {/* Skid Base Frame */}
              <rect x="40" y="340" width="220" height="24" rx="4" fill="url(#metallicBlueDark)" stroke="#1d4ed8" strokeWidth="2" />
              <line x1="60" y1="352" x2="240" y2="352" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.5" />
              <circle cx="55" cy="352" r="3.5" fill="#93c5fd" />
              <circle cx="245" cy="352" r="3.5" fill="#93c5fd" />

              {/* A-Frame Upright Legs */}
              <polygon points="120,340 142,265 158,265 180,340" fill="url(#metallicBlueMain)" stroke="#1e40af" strokeWidth="2" />
              <rect x="135" y="255" width="30" height="20" rx="3" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />

              {/* Outer Reel Frame Guard Rails */}
              <path
                d="M 50 340 L 50 240 Q 50 160 150 160 Q 250 160 250 240 L 250 340"
                fill="none"
                stroke="#2563eb"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Outer Flange Rim */}
              <circle cx="150" cy="265" r="85" fill="none" stroke="url(#metallicBlueCylinder)" strokeWidth="6" />
              <circle cx="150" cy="265" r="80" fill="#0f172a" fillOpacity="0.4" stroke="#1d4ed8" strokeWidth="1.5" />

              {/* Rotating Reel Drum Spokes & Spooled Tubing Wraps */}
              <g id="rotatingDrum" transform={`rotate(${reelAngleDeg} 150 265)`}>
                {/* Spooled Coiled Tubing Wraps (Concentric layered appearance) */}
                <circle cx="150" cy="265" r="72" fill="none" stroke="url(#metallicBlueMain)" strokeWidth="3" />
                <circle cx="150" cy="265" r="64" fill="none" stroke="url(#metallicBlueCylinder)" strokeWidth="3.5" />
                <circle cx="150" cy="265" r="56" fill="none" stroke="url(#metallicBlueMain)" strokeWidth="3.5" />
                <circle cx="150" cy="265" r="48" fill="none" stroke="url(#metallicBlueCylinder)" strokeWidth="3.5" />

                {/* Inner Drum Core */}
                <circle cx="150" cy="265" r="40" fill="url(#metallicBlueDark)" stroke="#2563eb" strokeWidth="2" />

                {/* 8 Radial Spokes */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const x1 = 150 + 16 * Math.cos(rad);
                  const y1 = 265 + 16 * Math.sin(rad);
                  const x2 = 150 + 82 * Math.cos(rad);
                  const y2 = 265 + 82 * Math.sin(rad);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="url(#metallicBlueMain)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Center Swivel & Hub */}
                <circle cx="150" cy="265" r="16" fill="url(#hydraulicRamGrad)" stroke="#bfdbfe" strokeWidth="2" />
                <circle cx="150" cy="265" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" />
              </g>

              {/* Levelwind Guide Arm (Pivoting from base to tangent takeoff point) */}
              <g id="levelwindArm">
                <line x1="160" y1="330" x2="228" y2="192" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
                <line x1="160" y1="330" x2="228" y2="192" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                {/* Levelwind Guide Roller Head */}
                <rect x="216" y="178" width="22" height="24" rx="3" fill="url(#hydraulicRamGrad)" stroke="#1e40af" strokeWidth="2" />
                <circle cx="227" cy="190" r="4" fill="#0f172a" stroke="#93c5fd" strokeWidth="1.5" />
              </g>

              {/* Reel Label */}
              <text x="150" y="380" textAnchor="middle" fill="#93c5fd" className="font-sans font-bold text-[11px]">
                CT REEL (MOTOR DRIVE)
              </text>
            </g>

            {/* 1.2 Coiled Tubing Ingress Trajectory Span Guide (Reel Levelwind -> Gooseneck Entry) */}
            <g id="tubingSpanGuide" opacity="0.3">
              <line
                x1="228"
                y1="190"
                x2="650"
                y2="45"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
            </g>

            {/* 1.3 Guide Arch / Gooseneck (Bends CT 90-degrees down to vertical at X=720) */}
            <g id="guideArchGooseneck" className="cursor-pointer" onClick={() => setSelectedElement('Guide Arch (Gooseneck)')}>
              {/* Curved Outer Tubular Arch */}
              <path
                d="M 650 45 Q 720 45 720 115"
                fill="none"
                stroke="url(#metallicBlueMain)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Curved Inner Truss Arch */}
              <path
                d="M 660 62 Q 710 62 710 115"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="3.5"
              />
              {/* Radial Stiffening Gussets / Rollers */}
              <line x1="662" y1="46" x2="668" y2="62" stroke="#60a5fa" strokeWidth="2" />
              <line x1="682" y1="52" x2="685" y2="70" stroke="#60a5fa" strokeWidth="2" />
              <line x1="702" y1="65" x2="698" y2="84" stroke="#60a5fa" strokeWidth="2" />
              <line x1="718" y1="88" x2="708" y2="98" stroke="#60a5fa" strokeWidth="2" />

              {/* Arch Mounting Bracket onto Injector Top */}
              <rect x="670" y="112" width="100" height="6" rx="2" fill="url(#metallicBlueDark)" stroke="#3b82f6" strokeWidth="1.5" />
            </g>

            {/* 1.4 Injector Head (X=660 to 780, Y=118 to 258, Centerline X=720) */}
            <g id="injectorHead" className="cursor-pointer" onClick={() => setSelectedElement('Injector Head')}>
              {/* Injector Outer Structural Frame */}
              <rect x="660" y="118" width="120" height="140" rx="5" fill="#0f172a" stroke="#1d4ed8" strokeWidth="2.5" />

              {/* Vertical Guide Pillars */}
              <rect x="664" y="122" width="6" height="132" rx="2" fill="#1e293b" />
              <rect x="770" y="122" width="6" height="132" rx="2" fill="#1e293b" />

              {/* LEFT DRIVE CHAIN ASSEMBLY */}
              <g id="leftChain">
                {/* Left Top Sprocket (Center: 685, 145, Radius: 14) */}
                <circle cx="685" cy="145" r="14" fill="url(#sprocketSteel)" stroke="#93c5fd" strokeWidth="1.5" />
                <g transform={`rotate(${opMode === 'RIH' ? -sprocketAngleDeg : sprocketAngleDeg} 685 145)`}>
                  <circle cx="685" cy="145" r="6" fill="#0f172a" />
                  <line x1="673" y1="145" x2="697" y2="145" stroke="#bfdbfe" strokeWidth="2" />
                  <line x1="685" y1="133" x2="685" y2="157" stroke="#bfdbfe" strokeWidth="2" />
                </g>

                {/* Left Bottom Sprocket (Center: 685, 230, Radius: 14) */}
                <circle cx="685" cy="230" r="14" fill="url(#sprocketSteel)" stroke="#93c5fd" strokeWidth="1.5" />
                <g transform={`rotate(${opMode === 'RIH' ? -sprocketAngleDeg : sprocketAngleDeg} 685 230)`}>
                  <circle cx="685" cy="230" r="6" fill="#0f172a" />
                  <line x1="673" y1="230" x2="697" y2="230" stroke="#bfdbfe" strokeWidth="2" />
                  <line x1="685" y1="218" x2="685" y2="242" stroke="#bfdbfe" strokeWidth="2" />
                </g>

                {/* Left Outer Chain Track */}
                <line x1="671" y1="145" x2="671" y2="230" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
                {/* Left Inner Gripper Track */}
                <line x1="699" y1="145" x2="699" y2="230" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />

                {/* Left Animated Gripper Blocks */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const baseBlockY = 152 + i * 16 + (opMode === 'RIH' ? chainOffsetPx : -chainOffsetPx);
                  return (
                    <rect
                      key={`l-blk-${i}`}
                      x="701"
                      y={baseBlockY}
                      width="9"
                      height="10"
                      rx="1.5"
                      fill="url(#hydraulicRamGrad)"
                      stroke="#1e3a8a"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>

              {/* RIGHT DRIVE CHAIN ASSEMBLY */}
              <g id="rightChain">
                {/* Right Top Sprocket (Center: 755, 145, Radius: 14) */}
                <circle cx="755" cy="145" r="14" fill="url(#sprocketSteel)" stroke="#93c5fd" strokeWidth="1.5" />
                <g transform={`rotate(${opMode === 'RIH' ? sprocketAngleDeg : -sprocketAngleDeg} 755 145)`}>
                  <circle cx="755" cy="145" r="6" fill="#0f172a" />
                  <line x1="743" y1="145" x2="767" y2="145" stroke="#bfdbfe" strokeWidth="2" />
                  <line x1="755" y1="133" x2="755" y2="157" stroke="#bfdbfe" strokeWidth="2" />
                </g>

                {/* Right Bottom Sprocket (Center: 755, 230, Radius: 14) */}
                <circle cx="755" cy="230" r="14" fill="url(#sprocketSteel)" stroke="#93c5fd" strokeWidth="1.5" />
                <g transform={`rotate(${opMode === 'RIH' ? sprocketAngleDeg : -sprocketAngleDeg} 755 230)`}>
                  <circle cx="755" cy="230" r="6" fill="#0f172a" />
                  <line x1="743" y1="230" x2="767" y2="230" stroke="#bfdbfe" strokeWidth="2" />
                  <line x1="755" y1="218" x2="755" y2="242" stroke="#bfdbfe" strokeWidth="2" />
                </g>

                {/* Right Outer Chain Track */}
                <line x1="769" y1="145" x2="769" y2="230" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" />
                {/* Right Inner Gripper Track */}
                <line x1="741" y1="145" x2="741" y2="230" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />

                {/* Right Animated Gripper Blocks */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const baseBlockY = 152 + i * 16 + (opMode === 'RIH' ? chainOffsetPx : -chainOffsetPx);
                  return (
                    <rect
                      key={`r-blk-${i}`}
                      x="730"
                      y={baseBlockY}
                      width="9"
                      height="10"
                      rx="1.5"
                      fill="url(#hydraulicRamGrad)"
                      stroke="#1e3a8a"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>

              {/* Dynamic Directional Indicator in Injector Center (RIH = Green down, POOH = Amber up, STANDBY = Brake Lock) */}
              <g id="directionIndicator" transform={`translate(${wellCenterX}, 188)`}>
                {opMode === 'RIH' ? (
                  <path
                    d="M 0 14 L -6 2 L -2 2 L -2 -14 L 2 -14 L 2 2 L 6 2 Z"
                    fill="#22c55e"
                    stroke="#14532d"
                    strokeWidth="1.5"
                    filter="url(#neonGlow)"
                    className={isSimulating ? "animate-pulse" : ""}
                  />
                ) : opMode === 'POOH' ? (
                  <path
                    d="M 0 -14 L -6 -2 L -2 -2 L -2 14 L 2 14 L 2 -2 L 6 -2 Z"
                    fill="#f59e0b"
                    stroke="#78350f"
                    strokeWidth="1.5"
                    filter="url(#neonGlow)"
                    className={isSimulating ? "animate-pulse" : ""}
                  />
                ) : (
                  <g className="filter drop-shadow">
                    <rect x="-8" y="-7" width="16" height="14" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                    <path d="M -5 -7 A 5 5 0 0 1 5 -7" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                  </g>
                )}
              </g>

              {/* Injector Base Support Plate */}
              <rect x="660" y="254" width="120" height="6" rx="2" fill="url(#metallicBlueDark)" stroke="#1d4ed8" strokeWidth="1.5" />
            </g>

            {/* 1.5 Stripper Assembly / Stuffing Box (Y=260 to 295, Centerline X=720) */}
            <g id="stripperAssembly" className="cursor-pointer" onClick={() => setSelectedElement('Stripper Packoff')}>
              {/* Upper Flange */}
              <rect x="702" y="260" width="36" height="8" rx="2" fill="url(#metallicBlueDark)" stroke="#3b82f6" strokeWidth="1.5" />
              {/* Main Packoff Housing Cylinder */}
              <rect x="705" y="268" width="30" height="22" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1d4ed8" strokeWidth="2" />
              {/* Center Packoff Bushing */}
              <line x1="710" y1="279" x2="730" y2="279" stroke="#93c5fd" strokeWidth="1.5" />
              {/* Lower Flange */}
              <rect x="698" y="290" width="44" height="6" rx="2" fill="url(#metallicBlueDark)" stroke="#1d4ed8" strokeWidth="1.5" />
            </g>

            {/* 1.6 Quad BOP Stack (4 Ram Tiers: Blind, Shear, Slip, Pipe - Y=298 to 395) */}
            <g id="quadBopStack" className="cursor-pointer" onClick={() => setSelectedElement('Quad BOP Stack')}>
              {/* Central Vertical Riser Bore */}
              <rect x="711" y="296" width="18" height="98" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />

              {/* Tier 1: Blind Rams (Y=306) */}
              <g id="blindRams">
                {/* Left Cylinder */}
                <rect x="636" y="300" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="636" cy="307" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="628" y1="302" x2="628" y2="312" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
                {/* Right Cylinder */}
                <rect x="729" y="300" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="804" cy="307" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="812" y1="302" x2="812" y2="312" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Tier 2: Shear Rams (Y=328) */}
              <g id="shearRams">
                {/* Left Cylinder */}
                <rect x="636" y="322" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="636" cy="329" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="628" y1="324" x2="628" y2="334" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
                {/* Right Cylinder */}
                <rect x="729" y="322" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="804" cy="329" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="812" y1="324" x2="812" y2="334" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Tier 3: Slip Rams (Y=350) */}
              <g id="slipRams">
                {/* Left Cylinder */}
                <rect x="636" y="344" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="636" cy="351" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="628" y1="346" x2="628" y2="356" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
                {/* Right Cylinder */}
                <rect x="729" y="344" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="804" cy="351" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="812" y1="346" x2="812" y2="356" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Tier 4: Pipe Rams (Y=372) */}
              <g id="pipeRams">
                {/* Left Cylinder */}
                <rect x="636" y="366" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="636" cy="373" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="628" y1="368" x2="628" y2="378" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
                {/* Right Cylinder */}
                <rect x="729" y="366" width="75" height="14" rx="3" fill="url(#metallicBlueCylinder)" stroke="#1e40af" strokeWidth="1.5" />
                <circle cx="804" cy="373" r="4.5" fill="url(#hydraulicRamGrad)" stroke="#172554" strokeWidth="1" />
                <line x1="812" y1="368" x2="812" y2="378" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Bottom Wellhead Flange Spool */}
              <path
                d="M 685 394 L 755 394 L 765 414 L 675 414 Z"
                fill="url(#metallicBlueCylinder)"
                stroke="#1d4ed8"
                strokeWidth="2"
              />
            </g>

            {/* Labels for Surface Stack Components */}
            <g id="stackCallouts" className="font-sans text-[10px] font-semibold fill-slate-300">
              <text x="790" y="185" textAnchor="start" fill="#38bdf8">INJECTOR</text>
              <text x="755" y="280" textAnchor="start" fill="#93c5fd">STRIPPER</text>
              <text x="825" y="311" textAnchor="start" fill="#94a3b8">1. BLIND RAM</text>
              <text x="825" y="333" textAnchor="start" fill="#94a3b8">2. SHEAR RAM</text>
              <text x="825" y="355" textAnchor="start" fill="#94a3b8">3. SLIP RAM</text>
              <text x="825" y="377" textAnchor="start" fill="#94a3b8">4. PIPE RAM</text>
            </g>

            {/* ========================================================= */}
            {/* PART 2: SUBSURFACE WELLBORE ARCHITECTURE & CASING STRINGS  */}
            {/* ========================================================= */}
            <g id="subsurfaceCasingSchedule">
              {casingStrings.map((cs) => {
                const topY = depthToY(cs.topDepthFt);
                const botY = depthToY(cs.bottomDepthFt);
                const height = Math.max(12, botY - topY);

                // Diameter visual scaling: 20" -> 190px, 13-3/8" -> 150px, 9-5/8" -> 115px, 7" -> 85px, 5" -> 60px
                const widthPx = Math.max(50, Math.min(220, cs.outerDiameterIn * 9.5));
                const leftX = wellCenterX - widthPx / 2;

                return (
                  <g
                    key={cs.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedElement(cs.name)}
                  >
                    {/* Cement Sheath */}
                    {cs.isCemented && (
                      <rect
                        x={leftX - 12}
                        y={topY}
                        width={widthPx + 24}
                        height={height}
                        fill="url(#cementHatch)"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                    )}

                    {/* Casing Steel Walls (Left & Right) */}
                    <rect
                      x={leftX}
                      y={topY}
                      width={widthPx}
                      height={height}
                      fill="url(#casingSteel)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />

                    {/* Inner Wellbore Fluid Column */}
                    {showFluids && (
                      <rect
                        x={leftX + 6}
                        y={topY}
                        width={widthPx - 12}
                        height={height}
                        fill="#0284c7"
                        fillOpacity="0.18"
                      />
                    )}

                    {/* Casing Shoe Tag */}
                    <polygon
                      points={`${leftX - 5},${botY} ${leftX + 6},${botY + 10} ${leftX + 6},${botY}`}
                      fill="#94a3b8"
                    />
                    <polygon
                      points={`${leftX + widthPx + 5},${botY} ${leftX + widthPx - 6},${botY + 10} ${leftX + widthPx - 6},${botY}`}
                      fill="#94a3b8"
                    />

                    {/* Interactive Delete Button directly in diagram when labels are on */}
                    {showAnnotations && (
                      <g transform={`translate(${leftX - 16}, ${Math.min(wellBottomY - 15, topY + 20)})`}>
                        <text
                          x="-6"
                          y="0"
                          textAnchor="end"
                          fill="#cbd5e1"
                          className="font-sans font-bold text-[9px]"
                        >
                          {cs.name} ({cs.outerDiameterIn.toFixed(2)}" × {cs.innerDiameterIn.toFixed(2)}")
                        </text>
                        <text
                          x="-6"
                          y="10"
                          textAnchor="end"
                          fill="#94a3b8"
                          className="font-mono text-[8px]"
                        >
                          Shoe: {Math.round(isMetric ? ftToM(cs.bottomDepthFt) : cs.bottomDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Completion Production Packer */}
              {profile.packerDepthFt && (
                <g id="productionPacker" transform={`translate(${wellCenterX}, ${depthToY(profile.packerDepthFt)})`}>
                  <rect x="-38" y="-8" width="76" height="16" rx="2" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="-30" y1="0" x2="30" y2="0" stroke="#fef3c7" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="44" y="4" fill="#fbbf24" className="font-mono font-bold text-[9px]">
                    PACKER ({Math.round(isMetric ? ftToM(profile.packerDepthFt) : profile.packerDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'})
                  </text>
                </g>
              )}

              {/* Perforated Intervals (Shooting into formation with gas/oil inflow arrows) */}
              {profile.perforations.map((perf) => {
                const perfTopY = depthToY(perf.topDepthFt);
                const perfBotY = depthToY(perf.bottomDepthFt);
                const perfHeight = Math.max(16, perfBotY - perfTopY);
                return (
                  <g key={perf.id} id={`perf-${perf.id}`} className="cursor-pointer">
                    {/* Perforation Jet Tunnels Left & Right */}
                    <rect x={wellCenterX - 55} y={perfTopY} width="110" height={perfHeight} fill="#f59e0b" fillOpacity="0.2" stroke="#d97706" strokeDasharray="3 3" />
                    {/* Individual perforation shots */}
                    {[-40, -32, -24, 24, 32, 40].map((dx, pIdx) => (
                      <circle
                        key={pIdx}
                        cx={wellCenterX + dx}
                        cy={perfTopY + (pIdx % 3 + 1) * (perfHeight / 4)}
                        r="3.5"
                        fill="#ef4444"
                        stroke="#fef08a"
                        strokeWidth="1"
                        className="animate-ping"
                      />
                    ))}
                    {/* Inflow Label */}
                    <text x={wellCenterX + 62} y={perfTopY + perfHeight / 2 + 3} fill="#fbbf24" className="font-sans font-bold text-[9px]">
                      {perf.formationName} ({perf.inflowFluidType.toUpperCase()})
                    </text>
                  </g>
                );
              })}
            </g>

            {/* ========================================================= */}
            {/* PART 3: MOVING COILED TUBING STRING & BHA TOOLSTRING      */}
            {/* ========================================================= */}
            <g id="movingCoiledTubingStringAssembly">
              {/* Target Depth Guideline in Subsurface Wellbore */}
              {targetDepthFt > 0 && depthToY(targetDepthFt) >= groundRkbY && depthToY(targetDepthFt) <= wellBottomY && (
                <g id="targetDepthGuideline" opacity="0.9">
                  <line
                    x1={wellCenterX - 85}
                    y1={depthToY(targetDepthFt)}
                    x2={wellCenterX + 85}
                    y2={depthToY(targetDepthFt)}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <rect
                    x={wellCenterX + 90}
                    y={depthToY(targetDepthFt) - 9}
                    width="118"
                    height="18"
                    rx="4"
                    fill="#0c4a6e"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <text
                    x={wellCenterX + 96}
                    y={depthToY(targetDepthFt) + 4}
                    fill="#bae6fd"
                    className="font-mono text-[9px] font-bold"
                  >
                    🎯 TARGET: {Math.round(isMetric ? ftToM(targetDepthFt) : targetDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                  </text>
                </g>
              )}

              {/* Realistic Continuous Coiled Tubing String: Reel -> Gooseneck -> Injector -> Stripper -> BOP -> Well -> BHA */}
              {(() => {
                const stringEndY = Math.max(groundRkbY, bhaTopY);
                const ctPathD = `M 228 190 L 650 45 Q 720 45 720 115 L 720 ${stringEndY}`;

                return (
                  <g id="continuousCtString">
                    {/* Shadow / Outer Glow for Optical Depth */}
                    <path
                      d={ctPathD}
                      fill="none"
                      stroke="#020617"
                      strokeWidth="9"
                      strokeOpacity="0.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Main Metallic Coiled Tubing String Body */}
                    <path
                      d={ctPathD}
                      fill="none"
                      stroke="url(#ctGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* High-Gloss Steel Core Reflection */}
                    <path
                      d={ctPathD}
                      fill="none"
                      stroke="#bfdbfe"
                      strokeWidth="1.6"
                      strokeOpacity="0.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Dynamic Moving Tubing Surface Seam Texture (Visualizes Continuous RIH / POOH Travel) */}
                    <path
                      d={ctPathD}
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="2.2"
                      strokeDasharray="6 14"
                      strokeDashoffset={stringMotionOffsetPx}
                      strokeOpacity={opMode === 'STANDBY' ? 0.35 : 0.95}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Directional Velocity Chevrons Along Ingress Span (From Reel to Gooseneck) */}
                    {opMode !== 'STANDBY' && isSimulating && (
                      <g id="stringVelocityMarkers" opacity="0.9">
                        {[0.25, 0.5, 0.75].map((ratio, idx) => {
                          const px = 228 + (650 - 228) * ratio;
                          const py = 190 + (45 - 190) * ratio;
                          const angle = Math.atan2(45 - 190, 650 - 228) * (180 / Math.PI);
                          return (
                            <g
                              key={`span-arrow-${idx}`}
                              transform={`translate(${px}, ${py}) rotate(${opMode === 'RIH' ? angle : angle + 180})`}
                            >
                              <path
                                d="M -5 -4 L 3 0 L -5 4"
                                fill="none"
                                stroke={opMode === 'RIH' ? '#4ade80' : '#fbbf24'}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Surface Ingress Telemetry Tag at RKB Wellhead Entry (Y=groundRkbY) */}
                    <g id="rkbEntryTag" transform={`translate(${wellCenterX - 100}, ${groundRkbY - 8})`}>
                      <rect
                        x="0"
                        y="0"
                        width="92"
                        height="18"
                        rx="4"
                        fill="#020617"
                        stroke={opMode === 'RIH' ? '#16a34a' : opMode === 'POOH' ? '#d97706' : '#0284c7'}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="9"
                        cy="9"
                        r="3.5"
                        fill={opMode === 'RIH' ? '#22c55e' : opMode === 'POOH' ? '#f59e0b' : '#38bdf8'}
                        className={opMode !== 'STANDBY' && isSimulating ? 'animate-ping' : ''}
                      />
                      <circle
                        cx="9"
                        cy="9"
                        r="3.5"
                        fill={opMode === 'RIH' ? '#22c55e' : opMode === 'POOH' ? '#f59e0b' : '#38bdf8'}
                      />
                      <text
                        x="18"
                        y="12.5"
                        fill={opMode === 'RIH' ? '#86efac' : opMode === 'POOH' ? '#fde68a' : '#7dd3fc'}
                        className="font-mono text-[9px] font-bold"
                      >
                        {opMode}: {Math.round(isMetric ? ftToM(currentDepthFt) : currentDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* BHA (Bottom Hole Assembly) Toolstring with Individual Segments, Dynamic Directional Guide & Fatigue Highlighting */}
              {currentDepthFt >= 0 && (
                <g
                  id="bhaToolstring"
                  transform={`translate(${wellCenterX}, ${bhaTopY})`}
                  style={{ transition: 'transform 0.14s cubic-bezier(0.25, 0.8, 0.45, 1)' }}
                >
                  {/* Mode Switch Transition Shockwave Beacon (Fires when toggling RIH/POOH) */}
                  {bhaModePulse && (
                    <g id="bhaTransitionWave" className="pointer-events-none">
                      <circle
                        cx="0"
                        cy={bhaModePulse.mode === 'RIH' ? 46 : 0}
                        r="34"
                        fill="none"
                        stroke={bhaModePulse.mode === 'RIH' ? '#22c55e' : '#f59e0b'}
                        strokeWidth="2.5"
                        strokeDasharray="4 3"
                        className="animate-ping opacity-75"
                      />
                      <circle
                        cx="0"
                        cy={bhaModePulse.mode === 'RIH' ? 46 : 0}
                        r="20"
                        fill={bhaModePulse.mode === 'RIH' ? '#22c55e' : '#f59e0b'}
                        fillOpacity="0.22"
                        className="animate-pulse"
                      />
                    </g>
                  )}

                  {/* Pulsing warning beacon wave when fatigue limit exceeded */}
                  {fatigueResult.anyExceedsEnduranceLimit && (
                    <g className="animate-pulse">
                      <circle cx="0" cy="24" r="28" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
                      <circle cx="0" cy="24" r="38" fill="#f43f5e" fillOpacity="0.12" />
                    </g>
                  )}

                  {/* Dynamic Directional Kinetic Chevron on BHA (Smoothly flips 180° when toggling RIH / POOH) */}
                  <g
                    transform={`translate(-17, 22) rotate(${opMode === 'POOH' ? 180 : 0})`}
                    style={{ transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  >
                    <rect
                      x="-6"
                      y="-12"
                      width="12"
                      height="24"
                      rx="3.5"
                      fill="#020617"
                      stroke={opMode === 'RIH' ? '#16a34a' : opMode === 'POOH' ? '#d97706' : '#0284c7'}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 0 7 L -4 0 L -1.5 0 L -1.5 -7 L 1.5 -7 L 1.5 0 L 4 0 Z"
                      fill={opMode === 'RIH' ? '#22c55e' : opMode === 'POOH' ? '#f59e0b' : '#38bdf8'}
                      className={isSimulating && opMode !== 'STANDBY' ? 'animate-pulse' : ''}
                    />
                  </g>

                  {/* Render individual BHA toolstring segments with engineering highlights */}
                  {(() => {
                    const segs = fatigueResult.segments;
                    const totalLenFt = Math.max(1, segs.reduce((acc, s) => acc + (s.lengthFt || 5), 0));
                    const totalSvgHeight = 44;
                    let curY = 0;

                    return (
                      <g id="bhaSegmentsGroup">
                        {segs.map((seg, idx) => {
                          const segH = Math.max(7, (seg.lengthFt / totalLenFt) * totalSvgHeight);
                          const isExceeded = seg.exceedsEnduranceLimit;
                          const isElevated = !isExceeded && seg.fatigueRatioPercent >= 75;
                          const isLast = idx === segs.length - 1;
                          const segW = Math.min(14, Math.max(8, ((seg.outerDiameterIn || 2.875) / 2.875) * 11));
                          const yPos = curY;
                          curY += segH;

                          return (
                            <g key={seg.segmentId || idx} id={`bhaSegment-${seg.segmentId}`} className="transition-all duration-300">
                              {/* Over-stressed highlight halo */}
                              {isExceeded && (
                                <rect
                                  x={-segW / 2 - 4}
                                  y={yPos - 2}
                                  width={segW + 8}
                                  height={segH + 4}
                                  rx="4"
                                  fill="#f43f5e"
                                  fillOpacity="0.25"
                                  stroke="#f43f5e"
                                  strokeWidth="1.5"
                                  className="animate-pulse"
                                  filter="url(#fatiguePulseGlow)"
                                />
                              )}

                              {/* Main Tool Body */}
                              <rect
                                x={-segW / 2}
                                y={yPos}
                                width={segW}
                                height={segH}
                                rx={idx === 0 ? 2 : 1}
                                fill={isExceeded ? 'url(#fatigueHazardStripes)' : (seg.color || 'url(#hydraulicRamGrad)')}
                                stroke={isExceeded ? '#fb7185' : isElevated ? '#fbbf24' : '#93c5fd'}
                                strokeWidth={isExceeded ? '2' : '1'}
                              />

                              {/* Sub joint divider */}
                              {!isLast && (
                                <line
                                  x1={-segW / 2}
                                  y1={yPos + segH}
                                  x2={segW / 2}
                                  y2={yPos + segH}
                                  stroke={isExceeded ? '#ffe4e6' : '#0f172a'}
                                  strokeWidth="1.5"
                                />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}

                  {/* Jetting Bit / Nozzle at BHA Tip */}
                  <polygon
                    points="-6,44 6,44 0,50"
                    fill={fatigueResult.anyExceedsEnduranceLimit ? '#f43f5e' : opMode === 'RIH' ? '#22c55e' : '#f59e0b'}
                    stroke="#78350f"
                    strokeWidth="1"
                    style={{ transition: 'fill 0.4s ease' }}
                  />

                  {/* Jetting Circulation Fluid Plume (Visually responds to RIH/POOH modes) */}
                  {isSimulating && (
                    <g style={{ transition: 'opacity 0.4s ease', opacity: opMode === 'RIH' ? 0.9 : 0.3 }}>
                      <polygon
                        points="-4,51 4,51 8,64 -8,64"
                        fill={fatigueResult.anyExceedsEnduranceLimit ? '#fb7185' : opMode === 'RIH' ? '#38bdf8' : '#e0f2fe'}
                        fillOpacity={opMode === 'RIH' ? 0.65 : 0.25}
                        className="animate-pulse"
                      />
                      {opMode === 'RIH' && (
                        <>
                          <circle cx="0" cy="58" r="2" fill="#bae6fd" className="animate-ping" />
                          <circle cx="-3.5" cy="62" r="1.4" fill="#e0f2fe" />
                          <circle cx="3.5" cy="62" r="1.4" fill="#e0f2fe" />
                        </>
                      )}
                    </g>
                  )}

                  {/* Dynamic BHA Callout Badge with Operational Directional Tag */}
                  <g transform="translate(18, 14)">
                    {fatigueResult.anyExceedsEnduranceLimit && fatigueResult.criticalSegment ? (
                      <g id="fatigueAlarmBadge" className="animate-pulse">
                        <rect x="0" y="-14" width="220" height="42" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="2" filter="url(#fatiguePulseGlow)" />
                        {/* Pointer triangle back to tool */}
                        <polygon points="-6,7 0,3 0,11" fill="#f43f5e" />
                        <text x="8" y="2" fill="#ffe4e6" className="font-mono font-bold text-[10px]">
                          ⚠️ FATIGUE LIMIT EXCEEDED
                        </text>
                        <text x="8" y="14" fill="#fda4af" className="font-sans text-[9px] font-semibold">
                          {fatigueResult.criticalSegment.segmentName}
                        </text>
                        <text x="8" y="24" fill="#fecdd3" className="font-mono text-[8.5px]">
                          σ_b: {(fatigueResult.maxBendingStressPsi / 1000).toFixed(1)} ksi &gt; S_e: {(fatigueResult.overallEnduranceLimitPsi / 1000).toFixed(1)} ksi ({fatigueResult.overallFatigueRatioPercent}%)
                        </text>
                      </g>
                    ) : (
                      <g className="transition-all duration-300">
                        <rect
                          x="0"
                          y="-13"
                          width="186"
                          height="27"
                          rx="6"
                          fill="#020617"
                          stroke={opMode === 'RIH' ? '#16a34a' : opMode === 'POOH' ? '#d97706' : '#0284c7'}
                          strokeWidth="1.5"
                          className="filter drop-shadow-md"
                          style={{ transition: 'stroke 0.4s ease' }}
                        />
                        {/* Direction badge in callout */}
                        <rect
                          x="4"
                          y="-9"
                          width="48"
                          height="19"
                          rx="4"
                          fill={opMode === 'RIH' ? '#14532d' : opMode === 'POOH' ? '#78350f' : '#0c4a6e'}
                          fillOpacity="0.85"
                        />
                        <text
                          x="28"
                          y="4.5"
                          textAnchor="middle"
                          fill={opMode === 'RIH' ? '#86efac' : opMode === 'POOH' ? '#fde68a' : '#7dd3fc'}
                          className="font-mono text-[9px] font-bold"
                        >
                          {opMode === 'RIH' ? 'RIH ▾' : opMode === 'POOH' ? 'POOH ▴' : 'HOLD ■'}
                        </text>
                        <text x="58" y="5" fill="#f8fafc" className="font-mono font-bold text-[10px]">
                          {Math.round(isMetric ? ftToM(currentDepthFt) : currentDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              )}

              {/* Dynamic Cursor / Tool: Real-time Depth, Tension, and Buckling Inspector */}
              {hoverDepthFt !== null && isDynamicCursorEnabled && (
                <g id="dynamicCursorTool" className="pointer-events-none select-none transition-opacity duration-75">
                  {/* Full-width Depth Alignment Guide Line Across Wellbore */}
                  <line
                    x1="65"
                    y1={depthToY(hoverDepthFt)}
                    x2={wellCenterX + 165}
                    y2={depthToY(hoverDepthFt)}
                    stroke={
                      hoverForces
                        ? hoverForces.statusColor === 'emerald'
                          ? '#10b981'
                          : hoverForces.statusColor === 'cyan'
                          ? '#06b6d4'
                          : hoverForces.statusColor === 'amber'
                          ? '#f59e0b'
                          : '#f43f5e'
                        : '#38bdf8'
                    }
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                    strokeOpacity="0.9"
                  />

                  {/* Dynamic Glowing Crosshair Reticle on Wellbore Centerline */}
                  <g transform={`translate(${wellCenterX}, ${depthToY(hoverDepthFt)})`}>
                    {/* Outer Dashed Pulse Ring */}
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="none"
                      stroke={
                        hoverForces
                          ? hoverForces.statusColor === 'emerald'
                            ? '#34d399'
                            : hoverForces.statusColor === 'cyan'
                            ? '#22d3ee'
                            : hoverForces.statusColor === 'amber'
                            ? '#fbbf24'
                            : '#fb7185'
                          : '#38bdf8'
                      }
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      strokeOpacity="0.85"
                    />
                    {/* Inner Target Core */}
                    <circle
                      cx="0"
                      cy="0"
                      r="4"
                      fill={
                        hoverForces
                          ? hoverForces.statusColor === 'emerald'
                            ? '#10b981'
                            : hoverForces.statusColor === 'cyan'
                            ? '#06b6d4'
                            : hoverForces.statusColor === 'amber'
                            ? '#f59e0b'
                            : '#e11d48'
                          : '#0284c7'
                      }
                    />
                    {/* Crosshair Tick Marks */}
                    <line x1="-19" y1="0" x2="-6" y2="0" stroke="#f8fafc" strokeWidth="1.5" strokeOpacity="0.9" />
                    <line x1="6" y1="0" x2="19" y2="0" stroke="#f8fafc" strokeWidth="1.5" strokeOpacity="0.9" />
                    <line x1="0" y1="-19" x2="0" y2="-6" stroke="#f8fafc" strokeWidth="1.5" strokeOpacity="0.9" />
                    <line x1="0" y1="6" x2="0" y2="19" stroke="#f8fafc" strokeWidth="1.5" strokeOpacity="0.9" />
                  </g>

                  {/* Precision Depth Badge on Left Scale Ruler */}
                  <g transform={`translate(68, ${depthToY(hoverDepthFt) - 12})`}>
                    <rect
                      width="142"
                      height="24"
                      rx="5"
                      fill="#020617"
                      fillOpacity="0.96"
                      stroke={
                        hoverForces
                          ? hoverForces.statusColor === 'emerald'
                            ? '#059669'
                            : hoverForces.statusColor === 'cyan'
                            ? '#0891b2'
                            : hoverForces.statusColor === 'amber'
                            ? '#d97706'
                            : '#e11d48'
                          : '#0284c7'
                      }
                      strokeWidth="1.5"
                    />
                    <text
                      x="8"
                      y="16"
                      fill="#ffffff"
                      className="font-mono text-[10px] font-bold"
                    >
                      🎯 {Math.round(isMetric ? ftToM(hoverDepthFt) : hoverDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                    </text>
                    <text
                      x="134"
                      y="16"
                      textAnchor="end"
                      fill={
                        hoverForces
                          ? hoverForces.statusColor === 'emerald'
                            ? '#6ee7b7'
                            : hoverForces.statusColor === 'cyan'
                            ? '#67e8f9'
                            : hoverForces.statusColor === 'amber'
                            ? '#fcd34d'
                            : '#fda4af'
                          : '#38bdf8'
                      }
                      className="font-sans text-[8.5px] font-bold uppercase tracking-wider"
                    >
                      LIVE
                    </text>
                  </g>

                  {/* Dynamic Floating Telemetry HUD Card alongside Wellbore */}
                  {hoverForces ? (
                    <g
                      transform={`translate(${wellCenterX - 290}, ${Math.max(
                        groundRkbY + 12,
                        Math.min(wellBottomY - 150, depthToY(hoverDepthFt) - 72)
                      )})`}
                      className="shadow-2xl filter drop-shadow-2xl"
                    >
                      {/* Background container */}
                      <rect
                        width="265"
                        height="144"
                        rx="9"
                        fill="#020617"
                        fillOpacity="0.97"
                        stroke={
                          hoverForces.statusColor === 'emerald'
                            ? '#059669'
                            : hoverForces.statusColor === 'cyan'
                            ? '#0891b2'
                            : hoverForces.statusColor === 'amber'
                            ? '#d97706'
                            : '#e11d48'
                        }
                        strokeWidth="1.8"
                      />

                      {/* Header bar background */}
                      <rect
                        x="0"
                        y="0"
                        width="265"
                        height="28"
                        rx="9"
                        fill={
                          hoverForces.statusColor === 'emerald'
                            ? '#064e3b'
                            : hoverForces.statusColor === 'cyan'
                            ? '#164e63'
                            : hoverForces.statusColor === 'amber'
                            ? '#78350f'
                            : '#881337'
                        }
                        fillOpacity="0.8"
                      />

                      {/* Header Row: Target Icon, Depth and Inclination */}
                      <text x="10" y="18" fill="#f8fafc" className="font-sans font-bold text-[10.5px] tracking-wide">
                        DYNAMIC CURSOR TELEMETRY
                      </text>
                      <text x="255" y="18" textAnchor="end" fill="#cbd5e1" className="font-mono text-[9px] font-semibold">
                        {hoverForces.inclinationDeg.toFixed(1)}° Inc &bull; TVD {Math.round(isMetric ? ftToM(hoverForces.tvdFt) : hoverForces.tvdFt)} {isMetric ? 'm' : 'ft'}
                      </text>

                      {/* Divider line under header */}
                      <line x1="0" y1="28" x2="265" y2="28" stroke="#334155" strokeWidth="0.8" />

                      {/* Row 1: Exact Measured Depth & Casing Section */}
                      <text x="10" y="44" fill="#94a3b8" className="font-sans text-[9px] uppercase tracking-wider">
                        Exact Depth:
                      </text>
                      <text x="75" y="44" fill="#38bdf8" className="font-mono text-[10.5px] font-bold">
                        {Math.round(isMetric ? ftToM(hoverDepthFt) : hoverDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'} MD
                      </text>
                      {hoverForces.activeCsg && (
                        <text x="255" y="44" textAnchor="end" fill="#94a3b8" className="font-mono text-[8.5px]">
                          {hoverForces.activeCsg.name}
                        </text>
                      )}

                      {/* Row 2: Tension Dynamics (POOH Pick-Up vs RIH Slack-Off) */}
                      <g transform="translate(10, 51)">
                        <rect x="0" y="0" width="118" height="34" rx="5" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                        <text x="6" y="12" fill="#94a3b8" className="font-sans text-[8.5px] font-semibold uppercase">
                          Pick-Up (POOH)
                        </text>
                        <text x="6" y="27" fill="#f59e0b" className="font-mono text-[11px] font-bold">
                          {isMetric ? `${Math.round(lbfToKn(hoverForces.pickupLbf))} kN` : `${Math.round(hoverForces.pickupLbf).toLocaleString()} lbf`}
                        </text>

                        <rect x="126" y="0" width="118" height="34" rx="5" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                        <text x="132" y="12" fill="#94a3b8" className="font-sans text-[8.5px] font-semibold uppercase">
                          Slack-Off (RIH)
                        </text>
                        <text
                          x="132"
                          y="27"
                          fill={hoverForces.slackoffLbf < 0 ? '#c084fc' : '#34d399'}
                          className="font-mono text-[11px] font-bold"
                        >
                          {isMetric ? `${Math.round(lbfToKn(hoverForces.slackoffLbf))} kN` : `${Math.round(hoverForces.slackoffLbf).toLocaleString()} lbf`}
                        </text>
                      </g>

                      {/* Row 3: Buckling State Pill */}
                      <g transform="translate(10, 92)">
                        <rect
                          x="0"
                          y="0"
                          width="244"
                          height="24"
                          rx="4"
                          fill={
                            hoverForces.statusColor === 'emerald'
                              ? '#064e3b'
                              : hoverForces.statusColor === 'cyan'
                              ? '#083344'
                              : hoverForces.statusColor === 'amber'
                              ? '#451a03'
                              : '#4c0519'
                          }
                          stroke={
                            hoverForces.statusColor === 'emerald'
                              ? '#059669'
                              : hoverForces.statusColor === 'cyan'
                              ? '#0891b2'
                              : hoverForces.statusColor === 'amber'
                              ? '#d97706'
                              : '#e11d48'
                          }
                          strokeWidth="1"
                        />
                        <circle
                          cx="10"
                          cy="12"
                          r="4"
                          fill={
                            hoverForces.statusColor === 'emerald'
                              ? '#34d399'
                              : hoverForces.statusColor === 'cyan'
                              ? '#22d3ee'
                              : hoverForces.statusColor === 'amber'
                              ? '#fbbf24'
                              : '#fb7185'
                          }
                        />
                        <text
                          x="20"
                          y="16"
                          fill={
                            hoverForces.statusColor === 'emerald'
                              ? '#a7f3d0'
                              : hoverForces.statusColor === 'cyan'
                              ? '#a5f3fc'
                              : hoverForces.statusColor === 'amber'
                              ? '#fde68a'
                              : '#fecdd3'
                          }
                          className="font-sans text-[9.5px] font-bold uppercase tracking-wider"
                        >
                          {hoverForces.bucklingStatus}
                        </text>
                        <text
                          x="236"
                          y="16"
                          textAnchor="end"
                          fill="#cbd5e1"
                          className="font-mono text-[8.5px]"
                        >
                          {hoverForces.isCompressive
                            ? `F_sin: -${isMetric ? Math.round(lbfToKn(hoverForces.absSinLimit)) + ' kN' : Math.round(hoverForces.absSinLimit).toLocaleString() + ' lb'}`
                            : `Drag: ±${isMetric ? Math.round(lbfToKn(hoverForces.dragLbf)) + ' kN' : Math.round(hoverForces.dragLbf).toLocaleString() + ' lb'}`}
                        </text>
                      </g>

                      {/* Footer Helper Text */}
                      <text x="132" y="132" textAnchor="middle" fill="#64748b" className="font-sans text-[8px] italic">
                        Click anywhere to pin persistent inspection marker at this depth
                      </text>
                    </g>
                  ) : (
                    <g transform={`translate(70, ${depthToY(hoverDepthFt) - 10})`}>
                      <rect width="125" height="20" rx="4" fill="#0f172a" fillOpacity="0.95" stroke="#0284c7" strokeWidth="1" />
                      <text x="8" y="14" fill="#7dd3fc" className="font-mono text-[10px] font-semibold">
                        Click: {Math.round(isMetric ? ftToM(hoverDepthFt) : hoverDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Clickable Depth Location Force Marker */}
              {markerDepthFt !== null && (
                <g id="depthLocationMarker" className="select-none">
                  {/* Horizontal Indicator Line across wellbore */}
                  <line
                    x1="65"
                    y1={depthToY(markerDepthFt)}
                    x2={wellCenterX + 160}
                    y2={depthToY(markerDepthFt)}
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />

                  {/* Center Crosshair Target at Wellbore Centerline */}
                  <g
                    transform={`translate(${wellCenterX}, ${depthToY(markerDepthFt)})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMarkerInspectorOpen(!isMarkerInspectorOpen);
                    }}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r="12"
                      fill="#083344"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      className="group-hover:scale-125 transition-transform"
                    />
                    <circle cx="0" cy="0" r="4" fill="#67e8f9" />
                    <line x1="-18" y1="0" x2="18" y2="0" stroke="#22d3ee" strokeWidth="1.5" />
                    <line x1="0" y1="-18" x2="0" y2="18" stroke="#22d3ee" strokeWidth="1.5" />
                  </g>

                  {/* Interactive Depth Pin / Flag Badge on left ruler */}
                  <g
                    transform={`translate(68, ${depthToY(markerDepthFt) - 13})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMarkerInspectorOpen(!isMarkerInspectorOpen);
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      width="145"
                      height="26"
                      rx="6"
                      fill="#083344"
                      stroke="#22d3ee"
                      strokeWidth="1.8"
                      className="filter drop-shadow-md group-hover:fill-cyan-950 transition-colors"
                    />
                    <text
                      x="8"
                      y="17"
                      fill="#ecfeff"
                      className="font-mono text-[10px] font-bold"
                    >
                      🎯 {Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                    </text>
                    <text
                      x="138"
                      y="17"
                      textAnchor="end"
                      fill="#38bdf8"
                      className="font-sans text-[8.5px] font-bold uppercase tracking-wider"
                    >
                      FORCES
                    </text>
                  </g>

                  {/* Floating On-Canvas Mini Forces HUD Card */}
                  {markerForces && (
                    <g
                      transform={`translate(${wellCenterX - 235}, ${Math.max(groundRkbY + 10, Math.min(wellBottomY - 75, depthToY(markerDepthFt) - 35))})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMarkerInspectorOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        width="170"
                        height="68"
                        rx="8"
                        fill="#020617"
                        fillOpacity="0.94"
                        stroke="#0891b2"
                        strokeWidth="1.5"
                        className="shadow-2xl backdrop-blur-md"
                      />
                      <text x="8" y="16" fill="#94a3b8" className="font-sans font-bold text-[9px] uppercase tracking-wider">
                        Forces at {Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt)} {isMetric ? 'm' : 'ft'}:
                      </text>
                      <text x="8" y="32" fill="#f8fafc" className="font-mono text-[10px] font-bold">
                        POOH: <tspan fill="#f59e0b">{isMetric ? `${Math.round(lbfToKn(markerForces.pickupLbf))} kN` : `${Math.round(markerForces.pickupLbf).toLocaleString()} lbf`}</tspan>
                      </text>
                      <text x="8" y="47" fill="#f8fafc" className="font-mono text-[10px] font-bold">
                        RIH: <tspan fill={markerForces.slackoffLbf < 0 ? '#c084fc' : '#34d399'}>{isMetric ? `${Math.round(lbfToKn(markerForces.slackoffLbf))} kN` : `${Math.round(markerForces.slackoffLbf).toLocaleString()} lbf`}</tspan>
                      </text>
                      <text x="8" y="60" fill={markerForces.statusColor === 'emerald' ? '#34d399' : markerForces.statusColor === 'cyan' ? '#38bdf8' : markerForces.statusColor === 'amber' ? '#fbbf24' : '#f87171'} className="font-sans font-bold text-[8.5px]">
                        ● {markerForces.bucklingStatus}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Right 1 Column: Real-time Operational Telemetry & Casing Clearances */}
        <div className="space-y-4">
          {/* Real-time BHA Fatigue Endurance Monitor */}
          <BhaFatigueIndicator
            fatigueResult={fatigueResult}
            unitSystem={unitSystem}
            isHighDlsActive={testHighDls}
            onToggleHighDlsSimulation={() => setTestHighDls(!testHighDls)}
          />

          {/* Depth Location Forces Probe Card (Interactive Inspector) */}
          <div className="p-4 bg-slate-900 border-2 border-cyan-700/70 rounded-xl space-y-3 shadow-lg relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Depth Forces Probe</span>
              </span>
              <div className="flex items-center gap-1.5">
                {markerDepthFt !== null && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                    {Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsMarkerInspectorOpen(!isMarkerInspectorOpen)}
                  className="text-slate-400 hover:text-white p-0.5 rounded"
                  title={isMarkerInspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
                >
                  {isMarkerInspectorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Depth Slider & Fine-Tuner Controls */}
            <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Probe Location:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max={maxDepthFt}
                    step="50"
                    value={markerDepthFt !== null ? Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt) : ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        setMarkerDepthFt(isMetric ? mToFt(val) : val);
                      }
                    }}
                    placeholder="Depth..."
                    className="w-20 px-1.5 py-0.5 text-right font-mono text-xs bg-slate-900 border border-slate-700 rounded text-cyan-200 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[11px] font-mono text-slate-400">{isMetric ? 'm' : 'ft'}</span>
                </div>
              </div>

              {/* Continuous Slider for Precise Depth Querying */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={maxDepthFt}
                  step="25"
                  value={markerDepthFt ?? Math.round(maxDepthFt * 0.45)}
                  onChange={(e) => setMarkerDepthFt(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>0</span>
                  <span>Click diagram or drag</span>
                  <span>{Math.round(isMetric ? ftToM(maxDepthFt) : maxDepthFt)}</span>
                </div>
              </div>

              {/* Quick Jump Snap Targets */}
              <div className="flex items-center flex-wrap gap-1 pt-1 border-t border-slate-800/80">
                <span className="text-[9px] text-slate-400 font-medium">Snap:</span>
                {[
                  { label: 'Surface', depth: 0 },
                  { label: 'CT Tip', depth: currentDepthFt },
                  { label: 'Mid-Well', depth: Math.round(maxDepthFt * 0.5) },
                  { label: 'TD', depth: maxDepthFt },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setMarkerDepthFt(s.depth)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-750 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Forces Inspection Output */}
            {isMarkerInspectorOpen && markerForces && (
              <div className="space-y-2.5 pt-1 text-xs">
                {/* Primary POOH vs RIH Force Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2 rounded-lg border border-amber-900/50">
                    <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wider flex items-center gap-1">
                      <ArrowUpCircle className="w-3 h-3 text-amber-400" />
                      Pick-Up (POOH)
                    </div>
                    <div className="font-mono text-sm font-bold text-amber-300 mt-0.5">
                      {isMetric ? `${Math.round(lbfToKn(markerForces.pickupLbf))} kN` : `${Math.round(markerForces.pickupLbf).toLocaleString()} lbf`}
                    </div>
                    <div className="text-[9px] text-slate-400">Total tension at depth</div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-lg border border-emerald-900/50">
                    <div className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
                      <ArrowDownCircle className="w-3 h-3 text-emerald-400" />
                      Slack-Off (RIH)
                    </div>
                    <div className={`font-mono text-sm font-bold mt-0.5 ${markerForces.slackoffLbf < 0 ? 'text-purple-300' : 'text-emerald-300'}`}>
                      {isMetric ? `${Math.round(lbfToKn(markerForces.slackoffLbf))} kN` : `${Math.round(markerForces.slackoffLbf).toLocaleString()} lbf`}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {markerForces.slackoffLbf < 0 ? 'Compression load' : 'Net tension load'}
                    </div>
                  </div>
                </div>

                {/* Secondary Force Decomposition */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Neutral Buoyant Wt:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {isMetric ? `${Math.round(lbfToKn(markerForces.neutralLbf))} kN` : `${Math.round(markerForces.neutralLbf).toLocaleString()} lbf`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Frictional Drag Load:</span>
                    <span className="font-mono font-semibold text-blue-300">
                      ±{isMetric ? `${Math.round(lbfToKn(markerForces.dragLbf))} kN` : `${Math.round(markerForces.dragLbf).toLocaleString()} lbf`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sinusoidal Limit:</span>
                    <span className="font-mono text-amber-400">
                      -{isMetric ? `${Math.round(lbfToKn(markerForces.absSinLimit))} kN` : `${Math.round(markerForces.absSinLimit).toLocaleString()} lbf`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Helical Limit:</span>
                    <span className="font-mono text-rose-400">
                      -{isMetric ? `${Math.round(lbfToKn(markerForces.absHelLimit))} kN` : `${Math.round(markerForces.absHelLimit).toLocaleString()} lbf`}
                    </span>
                  </div>
                </div>

                {/* Buckling Status & Structural Stress Badge */}
                <div className={`p-2 rounded-lg border flex items-center justify-between ${
                  markerForces.statusColor === 'emerald'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : markerForces.statusColor === 'cyan'
                    ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                    : markerForces.statusColor === 'amber'
                    ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider leading-tight">Buckling State</div>
                      <div className="text-[11px] font-medium">{markerForces.bucklingStatus}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="font-bold">{markerForces.yieldUtilizationPercent.toFixed(1)}%</span>
                    <div className="text-[9px] opacity-75">Yield Use</div>
                  </div>
                </div>

                {/* Casing Clearance at Marker Location */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Active Section:</span>
                    <span className="font-mono font-medium text-cyan-300">{markerForces.activeCsg?.name || 'Open Hole'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Radial Annular Gap:</span>
                    <span className="font-mono font-medium text-white">
                      {isMetric ? `${inToMm(markerForces.radialGapIn).toFixed(1)} mm` : `${markerForces.radialGapIn.toFixed(3)}"`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Well Inclination:</span>
                    <span className="font-mono font-medium text-slate-200">
                      {markerForces.inclinationDeg.toFixed(1)}°
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recharts Buckling Limits Plot Along Depth */}
          {forcesResult && forcesResult.weightProfile && (
            <BucklingMiniProfilePlot
              weightProfile={forcesResult.weightProfile}
              unitSystem={unitSystem}
              height={125}
              highlightDepthFt={markerDepthFt ?? hoverDepthFt ?? currentDepthFt}
              onSelectDepth={(depthFt) => {
                setMarkerDepthFt(depthFt);
                setIsMarkerInspectorOpen(true);
              }}
              onOpenFullChart={onOpenBucklingPlot}
            />
          )}

          {/* Active Status Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Real-Time Ingress Telemetry</span>
              </span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                isSimulating 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isSimulating ? 'RUNNING' : 'HOLDING'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Depth:</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {Math.round(isMetric ? ftToM(currentDepthFt) : currentDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Direction Mode:</span>
                <span className={`font-mono font-bold ${opMode === 'RIH' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {opMode === 'RIH' ? 'Run In Hole (RIH)' : 'Pull Out Of Hole (POOH)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ingress Speed:</span>
                <span className="font-mono font-bold text-white">
                  {isMetric ? `${Math.round(ftToM(simSpeedFtPerMin))} m/min` : `${simSpeedFtPerMin} ft/min`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CT Reel Rotation:</span>
                <span className="font-mono font-bold text-blue-300">
                  {reelRpm.toFixed(1)} RPM
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Est. Surface Weight:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {isMetric ? `${Math.round(lbfToKn(hookloadLbf))} kN` : `${hookloadLbf.toLocaleString()} lbf`}
                </span>
              </div>
            </div>
          </div>

          {/* Active Casing & Clearance Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Bore Clearance</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {activeCasingAtCt?.name || 'Casing'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Casing ID:</span>
                <span className="font-mono font-bold text-white">
                  {isMetric ? `${inToMm(casingIdIn).toFixed(1)} mm` : `${casingIdIn.toFixed(3)}"`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Coiled Tubing OD:</span>
                <span className="font-mono font-bold text-blue-300">
                  {isMetric ? `${inToMm(ct.outerDiameterIn).toFixed(1)} mm` : `${ct.outerDiameterIn.toFixed(3)}"`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Radial Annular Gap:</span>
                <span className={`font-mono font-bold ${radialClearanceIn < 0.5 ? 'text-amber-400' : 'text-emerald-300'}`}>
                  {isMetric ? `${inToMm(radialClearanceIn).toFixed(1)} mm` : `${radialClearanceIn.toFixed(3)}"`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Data Management Helper */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Data Deletion &amp; Customization</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              You can delete any casing string or perforation interval using the <strong className="text-rose-300">Manage &amp; Delete Data</strong> button in the top toolbar. Deleting an interval immediately recalculates the wellbore boundaries and updates the live schematic.
            </p>
            <button
              type="button"
              onClick={() => setShowDataManager(!showDataManager)}
              className="w-full py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{showDataManager ? 'Hide Data Manager' : 'Open Data Manager to Delete'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. 3D Technical Rig Illustration Modal (Asset Preview) */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Coiled Tubing Surface Ingress Equipment Reference</h3>
                  <p className="text-xs text-slate-400">High-detail technical illustration of Reel, Gooseneck, Injector Head, Stripper, and Quad BOP Stack</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={ctIngressRigImage}
                alt="Coiled Tubing Surface Ingress Rig Stack"
                className="w-full h-auto max-h-[580px] object-contain rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="font-bold text-sky-400">CT Reel &amp; Levelwind</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Spool basket with hydraulic brake &amp; angle guide</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="font-bold text-sky-400">Gooseneck Arch</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Truss-supported 90° pipe bend arch</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="font-bold text-sky-400">Dual-Chain Injector</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Hydraulic motor drive with gripper blocks</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="font-bold text-sky-400">Quad BOP Stack</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Blind, shear, slip, and pipe rams (10K psi)</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Casing String Modal */}
      {showAddCasingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add New Casing Section</h3>
              <button
                type="button"
                onClick={() => setShowAddCasingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCasingSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Casing Name</label>
                  <input
                    type="text"
                    required
                    value={newCsg.name}
                    onChange={(e) => setNewCsg({ ...newCsg, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Casing Type</label>
                  <select
                    value={newCsg.type}
                    onChange={(e) => setNewCsg({ ...newCsg, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="intermediate">Intermediate Casing</option>
                    <option value="production_casing">Production Casing</option>
                    <option value="liner">Production Liner</option>
                    <option value="tubing">Completion Tubing</option>
                    <option value="open_hole">Open Hole</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Top Depth ({isMetric ? 'm' : 'ft'})</label>
                  <input
                    type="number"
                    required
                    value={newCsg.topDepthFt}
                    onChange={(e) => setNewCsg({ ...newCsg, topDepthFt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Shoe Depth ({isMetric ? 'm' : 'ft'})</label>
                  <input
                    type="number"
                    required
                    value={newCsg.bottomDepthFt}
                    onChange={(e) => setNewCsg({ ...newCsg, bottomDepthFt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Outer Diameter (in)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newCsg.outerDiameterIn}
                    onChange={(e) => setNewCsg({ ...newCsg, outerDiameterIn: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Inner Diameter (in)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newCsg.innerDiameterIn}
                    onChange={(e) => setNewCsg({ ...newCsg, innerDiameterIn: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Weight (lb/ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCsg.weightLbFt}
                    onChange={(e) => setNewCsg({ ...newCsg, weightLbFt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Steel Grade</label>
                  <input
                    type="text"
                    value={newCsg.grade}
                    onChange={(e) => setNewCsg({ ...newCsg, grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCasingModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Add Casing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
