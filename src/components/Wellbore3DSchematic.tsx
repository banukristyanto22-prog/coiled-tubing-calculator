import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CoiledTubingString, UnitSystem, WellboreForcesInput } from '../types/coiledTubing';
import { 
  ftToM, 
  lbfToKn, 
  WellboreForcesResult,
  interpolateSurveyAtDepth,
  calculateMinimumCurvature
} from '../utils/engineeringCalculations';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Disc, 
  Sliders, 
  Layers, 
  Gauge, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Compass,
  Eye,
  Target,
  MapPin,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface Wellbore3DSchematicProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  forcesInput: WellboreForcesInput;
  results: WellboreForcesResult;
}

export const Wellbore3DSchematic: React.FC<Wellbore3DSchematicProps> = ({
  ct,
  unitSystem,
  forcesInput,
  results,
}) => {
  const isMetric = unitSystem === 'metric';
  const maxDepth = forcesInput.measuredDepthFt;
  const inclination = forcesInput.wellboreInclinationDeg;

  // Operation state: 'RIH' (Running in hole), 'POOH' (Pull out of hole), 'STANDBY' (Hold)
  const [opMode, setOpMode] = useState<'RIH' | 'POOH' | 'STANDBY'>('RIH');
  const [currentDepthFt, setCurrentDepthFt] = useState<number>(Math.round(maxDepth * 0.65));
  const [speedFtPerMin, setSpeedFtPerMin] = useState<number>(60);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [showFluidJet, setShowFluidJet] = useState<boolean>(true);

  // Clickable Depth Marker State for pinpoint force inspection
  const [markerDepthFt, setMarkerDepthFt] = useState<number | null>(Math.round(maxDepth * 0.5));
  const [isMarkerProbeOpen, setIsMarkerProbeOpen] = useState<boolean>(true);
  const [hoverDepthFt, setHoverDepthFt] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Smooth transition animation state for BHA icon when toggling between RIH and POOH
  const [bhaModePulse, setBhaModePulse] = useState<{ mode: 'RIH' | 'POOH'; id: number } | null>(null);
  const smoothVelRef = useRef<number>(0);
  const lastOpModeRef = useRef<'RIH' | 'POOH' | 'STANDBY'>('RIH');

  useEffect(() => {
    if (opMode === 'RIH' || opMode === 'POOH') {
      if (lastOpModeRef.current !== opMode) {
        setBhaModePulse({ mode: opMode, id: Date.now() });
        const clearPulse = setTimeout(() => setBhaModePulse(null), 1800);
        lastOpModeRef.current = opMode;
        return () => clearTimeout(clearPulse);
      }
    }
    lastOpModeRef.current = opMode;
  }, [opMode]);

  // Animation loop
  const lastTimeRef = useRef<number>(performance.now());
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      const deltaSec = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      // Kinematic velocity smoothing for realistic momentum and smooth mode switching
      const targetDir = opMode === 'RIH' ? 1 : opMode === 'POOH' ? -1 : 0;
      const targetVel = targetDir * (speedFtPerMin / 60) * (maxDepth / 60);
      const easeRate = 4.5;
      const currentVel = smoothVelRef.current;
      const newVel = currentVel + (targetVel - currentVel) * Math.min(1, deltaSec * easeRate);
      smoothVelRef.current = newVel;

      if (Math.abs(newVel) > 0.01) {
        setCurrentDepthFt((prev) => {
          const next = prev + newVel * deltaSec;
          if (next >= maxDepth && opMode === 'RIH') {
            setOpMode('STANDBY');
            return maxDepth;
          }
          if (next <= 0 && opMode === 'POOH') {
            setOpMode('STANDBY');
            return 0;
          }
          return Math.max(0, Math.min(maxDepth, next));
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [opMode, speedFtPerMin, maxDepth]);

  // Current Depth ratio [0, 1]
  const depthFraction = Math.max(0, Math.min(1, currentDepthFt / maxDepth));

  // Trajectory Profile Modeling
  const hasCustomSurvey = forcesInput.geometryMode === 'custom_survey' && !!forcesInput.surveyStations && forcesInput.surveyStations.length >= 2;
  const surveyStations = React.useMemo(() => {
    if (hasCustomSurvey && forcesInput.surveyStations) {
      return calculateMinimumCurvature(forcesInput.surveyStations);
    }
    return [];
  }, [hasCustomSurvey, forcesInput.surveyStations]);

  const maxSurveyTvd = React.useMemo(() => {
    if (surveyStations.length > 0) {
      return Math.max(1, surveyStations[surveyStations.length - 1].trueVerticalDepthFt);
    }
    return Math.max(1, maxDepth);
  }, [surveyStations, maxDepth]);

  const maxSurveyDisp = React.useMemo(() => {
    if (surveyStations.length > 0) {
      return Math.max(1, surveyStations[surveyStations.length - 1].horizontalDisplacementFt ?? 1);
    }
    return Math.max(1, maxDepth * 0.7);
  }, [surveyStations, maxDepth]);

  // Vertical KOP at 35% MD; Curve from 35% to 65% MD; Tangent/Lateral from 65% to 100% MD
  const kopFraction = 0.35;
  const eocFraction = 0.65;
  const radAngle = (inclination * Math.PI) / 180;

  // Function to calculate (x, y, z) 3D coordinate along well path given fractional MD
  // In well coordinates: Y is Depth down (TVD), X is Horizontal displacement, Z is Lateral out-of-plane
  const getWellCoords = (frac: number) => {
    if (hasCustomSurvey && surveyStations.length >= 2) {
      const currentMd = frac * maxDepth;
      const interp = interpolateSurveyAtDepth(surveyStations, currentMd);
      const tvdFrac = interp.trueVerticalDepthFt / maxSurveyTvd;
      const dispFrac = (interp.horizontalDisplacementFt ?? 0) / maxSurveyDisp;
      return { tvdFrac, dispFrac };
    }

    let tvdFrac = 0;
    let dispFrac = 0;

    if (frac <= kopFraction) {
      // Pure vertical
      tvdFrac = frac;
      dispFrac = 0;
    } else if (frac <= eocFraction) {
      // Build section (circular arc or sine ramp)
      const curveProgress = (frac - kopFraction) / (eocFraction - kopFraction);
      const currentInc = radAngle * Math.sin((curveProgress * Math.PI) / 2);
      tvdFrac = kopFraction + (frac - kopFraction) * Math.cos(currentInc / 2);
      dispFrac = (frac - kopFraction) * Math.sin(currentInc / 2);
    } else {
      // Tangent / Lateral section
      const curveLength = eocFraction - kopFraction;
      const tvdAtEoc = kopFraction + curveLength * Math.cos(radAngle / 2);
      const dispAtEoc = curveLength * Math.sin(radAngle / 2);
      const tangentProgress = frac - eocFraction;
      tvdFrac = tvdAtEoc + tangentProgress * Math.cos(radAngle);
      dispFrac = dispAtEoc + tangentProgress * Math.sin(radAngle);
    }

    return { tvdFrac, dispFrac };
  };

  // SVG Display Projection
  // Surface rig & wellhead at Top-Left, well curves down-right
  const svgWidth = 840;
  const svgHeight = 520;
  
  // Surface Rig anchor point
  const wellheadX = 210;
  const wellheadY = 110;
  const rigFloorY = 105;
  const injectorY = 55;
  const reelX = 75;
  const reelY = 88;

  // Trajectory canvas area
  const wellCanvasWidth = svgWidth - wellheadX - 60;
  const wellCanvasHeight = svgHeight - wellheadY - 60;

  // 3D Isometric projection parameters
  const isoTilt = viewMode === '3D' ? 0.32 : 0; // horizontal shear
  const isoZCompression = viewMode === '3D' ? 0.88 : 1.0;

  const projectPoint = (dispFrac: number, tvdFrac: number) => {
    const rawX = wellheadX + dispFrac * wellCanvasWidth;
    const rawY = wellheadY + tvdFrac * wellCanvasHeight * isoZCompression;
    // Apply 3D perspective slant
    const screenX = rawX + (tvdFrac * 40 * isoTilt);
    const screenY = rawY;
    return { x: screenX, y: screenY };
  };

  // Generate casing path points
  const pathResolution = 60;
  const trajectoryPoints: Array<{ x: number; y: number; frac: number }> = [];
  for (let i = 0; i <= pathResolution; i++) {
    const frac = i / pathResolution;
    const { tvdFrac, dispFrac } = getWellCoords(frac);
    const pt = projectPoint(dispFrac, tvdFrac);
    trajectoryPoints.push({ ...pt, frac });
  }

  // Create SVG path string for wellbore centerline
  const casingPathD = trajectoryPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Coiled Tubing current tip location
  const currentCoords = getWellCoords(depthFraction);
  const tipPoint = projectPoint(currentCoords.dispFrac, currentCoords.tvdFrac);

  // Filter trajectory points up to current depth for CT String path
  const ctPoints = trajectoryPoints.filter((p) => p.frac <= depthFraction);
  const ctPathD = [
    // Start from injector
    `M ${wellheadX} ${injectorY}`,
    `L ${wellheadX} ${wellheadY}`,
    // Follow wellbore trajectory up to current depth
    ...ctPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${tipPoint.x.toFixed(1)} ${tipPoint.y.toFixed(1)}`,
  ].join(' ');

  // Calculate live hookload interpolated at current depth
  // When RIH: Slack-off load; When POOH: Pick-up load; When STANDBY: Neutral load
  const profileIndex = Math.min(
    results.weightProfile.length - 1,
    Math.floor(depthFraction * (results.weightProfile.length - 1))
  );
  const activeProfile = results.weightProfile[profileIndex] || {
    slackoffLbf: results.surfaceSlackoffWeightLbf,
    neutralLbf: results.surfaceNeutralWeightLbf,
    pickupLbf: results.surfacePickupWeightLbf,
  };

  const liveHookloadLbf =
    opMode === 'RIH'
      ? activeProfile.slackoffLbf
      : opMode === 'POOH'
      ? activeProfile.pickupLbf
      : activeProfile.neutralLbf;

  // TVD in feet
  const currentTvdFt = Math.round(currentCoords.tvdFrac * maxDepth * (Math.cos(radAngle * 0.4) || 1));

  // Determine well section
  const sectionLabel =
    depthFraction <= kopFraction
      ? 'Vertical Casing Section (0° - 5°)'
      : depthFraction <= eocFraction
      ? `Build / Curve Section (DLS to ${inclination}°)`
      : `Lateral / Horizontal Drain (${inclination}°)`;

  // Reel rotation angle based on depth
  const reelRotationDeg = (currentDepthFt / 10) % 360;

  // Helper to calculate exact 3D forces, buckling status, and geometry at any specified depth
  const get3DForcesAtDepth = (depthFt: number, coords?: { dispFrac: number; tvdFrac: number } | null) => {
    const profilePoints = results.weightProfile;
    if (!profilePoints || profilePoints.length === 0) return null;

    const frac = Math.max(0, Math.min(1, depthFt / maxDepth));
    const targetIdx = frac * (profilePoints.length - 1);
    const lowIdx = Math.floor(targetIdx);
    const highIdx = Math.min(profilePoints.length - 1, Math.ceil(targetIdx));
    const ratio = targetIdx - lowIdx;

    const low = profilePoints[lowIdx];
    const high = profilePoints[highIdx];

    const pickupLbf = low.pickupLbf + ratio * (high.pickupLbf - low.pickupLbf);
    const slackoffLbf = low.slackoffLbf + ratio * (high.slackoffLbf - low.slackoffLbf);
    const neutralLbf = low.neutralLbf + ratio * (high.neutralLbf - low.neutralLbf);
    const criticalBucklingLbf = low.criticalBucklingLbf + ratio * (high.criticalBucklingLbf - low.criticalBucklingLbf);

    const isHelical = slackoffLbf < 0 && Math.abs(slackoffLbf) > criticalBucklingLbf;
    const isSinusoidal = slackoffLbf < 0 && Math.abs(slackoffLbf) > criticalBucklingLbf * 0.707;

    const bucklingStatus = isHelical
      ? 'Helical Buckling (Lockup)'
      : isSinusoidal
      ? 'Sinusoidal Snaking'
      : 'Stable Elastic (Safe)';

    const statusColor: 'rose' | 'amber' | 'emerald' = isHelical ? 'rose' : isSinusoidal ? 'amber' : 'emerald';

    let localIncDeg = inclination;
    let localTvdFt = Math.round(coords ? coords.tvdFrac * maxDepth : depthFt);

    if (hasCustomSurvey && forcesInput.surveyStations) {
      const interp = interpolateSurveyAtDepth(forcesInput.surveyStations, depthFt);
      localIncDeg = interp.inclinationDeg;
      localTvdFt = Math.round(interp.trueVerticalDepthFt);
    }

    return {
      depthFt,
      pickupLbf,
      slackoffLbf,
      neutralLbf,
      criticalBucklingLbf,
      bucklingStatus,
      statusColor,
      localIncDeg,
      localTvdFt,
    };
  };

  // Marker coordinates along wellbore
  const markerFraction = markerDepthFt !== null ? Math.max(0, Math.min(1, markerDepthFt / maxDepth)) : null;
  const markerCoords = markerFraction !== null ? getWellCoords(markerFraction) : null;
  const markerPoint = markerCoords ? projectPoint(markerCoords.dispFrac, markerCoords.tvdFrac) : null;

  // Hover coordinates along wellbore
  const hoverFraction = hoverDepthFt !== null ? Math.max(0, Math.min(1, hoverDepthFt / maxDepth)) : null;
  const hoverCoords = hoverFraction !== null ? getWellCoords(hoverFraction) : null;
  const hoverPoint = hoverCoords ? projectPoint(hoverCoords.dispFrac, hoverCoords.tvdFrac) : null;

  // Exact calculated forces at marked depth
  const markerForces = useMemo(() => {
    if (markerDepthFt === null) return null;
    return get3DForcesAtDepth(markerDepthFt, markerCoords);
  }, [markerDepthFt, results, maxDepth, inclination, hasCustomSurvey, forcesInput.surveyStations, markerCoords]);

  // Exact calculated forces at hovered cursor depth
  const hoverForces = useMemo(() => {
    if (hoverDepthFt === null) return null;
    return get3DForcesAtDepth(hoverDepthFt, hoverCoords);
  }, [hoverDepthFt, results, maxDepth, inclination, hasCustomSurvey, forcesInput.surveyStations, hoverCoords]);

  // Mouse move handler on SVG canvas to track hover depth and telemetry
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const moveX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const moveY = ((e.clientY - rect.top) / rect.height) * svgHeight;

    let closestDist = Infinity;
    let closestDepth = 0;

    trajectoryPoints.forEach((p) => {
      const dist = Math.hypot(p.x - moveX, p.y - moveY);
      if (dist < closestDist) {
        closestDist = dist;
        closestDepth = p.frac * maxDepth;
      }
    });

    if (closestDist < 140) {
      setHoverDepthFt(Math.round(closestDepth));
    } else if (moveY >= wellheadY && moveY <= svgHeight - 20) {
      const frac = Math.max(0, Math.min(1, (moveY - wellheadY) / (svgHeight - wellheadY - 40)));
      setHoverDepthFt(Math.round(frac * maxDepth));
    } else {
      setHoverDepthFt(null);
    }
  };

  // Click handler on SVG canvas to place or move depth marker pin
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * svgHeight;

    let closestDist = Infinity;
    let closestDepth = 0;

    trajectoryPoints.forEach((p) => {
      const dist = Math.hypot(p.x - clickX, p.y - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closestDepth = p.frac * maxDepth;
      }
    });

    if (closestDist < 120) {
      setMarkerDepthFt(Math.round(closestDepth));
      setIsMarkerProbeOpen(true);
    } else if (clickY >= wellheadY) {
      const frac = Math.max(0, Math.min(1, (clickY - wellheadY) / (svgHeight - wellheadY - 40)));
      setMarkerDepthFt(Math.round(frac * maxDepth));
      setIsMarkerProbeOpen(true);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header & Interactive Mode Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-inner">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                3D Wellbore Operation Simulation
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  opMode === 'RIH'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : opMode === 'POOH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}
              >
                {opMode === 'RIH' && '▶ RIH (Running In)'}
                {opMode === 'POOH' && '◀ POOH (Pulling Out)'}
                {opMode === 'STANDBY' && '⏸ Standby / Static'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live kinematic string tracking through 3D casing trajectory &bull; Reel unspooling & hookload dynamics
            </p>
          </div>
        </div>

        {/* View mode toggle & 3D tilt */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('3D')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === '3D'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>3D Isometric</span>
            </button>
            <button
              onClick={() => setViewMode('2D')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                viewMode === '2D'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2D Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Simulation Canvas Area */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900 border-b border-slate-800 overflow-hidden select-none">
        {/* Background Grid & 3D Horizon */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* 3D Depth Isometric Shading Floor */}
        <div 
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cyan-950/10 to-transparent pointer-events-none" 
        />

        {/* SVG Well Schematic & CT String */}
        <svg
          ref={svgRef}
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoverDepthFt(null)}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full cursor-crosshair"
          style={{ transform: viewMode === '3D' ? 'perspective(900px) rotateX(8deg)' : 'none' }}
        >
          <defs>
            {/* 3D Metallic CT Gradient */}
            <linearGradient id="ctMetallic3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="35%" stopColor="#67e8f9" />
              <stop offset="60%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            {/* Casing 3D Wall Gradient */}
            <linearGradient id="casingWall3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Fluid jet wash gradient */}
            <linearGradient id="fluidJet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </linearGradient>

            {/* Perforation glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ============================================================ */}
          {/* SURFACE SPREAD: Reel, Gooseneck, Injector & Wellhead Stack */}
          {/* ============================================================ */}

          {/* Ground / Rig Floor Line */}
          <line
            x1={30}
            y1={rigFloorY}
            x2={svgWidth - 30}
            y2={rigFloorY}
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={35}
            y={rigFloorY - 6}
            fill="#64748b"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            RIG FLOOR / GROUND LEVEL (0 ft)
          </text>

          {/* CT Reel Skid & Flange (Rotates with animation) */}
          <g transform={`translate(${reelX}, ${reelY})`}>
            {/* Reel Stand / Skid Base */}
            <polygon points="-36,18 36,18 24,-12 -24,-12" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            
            {/* Outer Reel Flange Drum */}
            <circle cx="0" cy="0" r="32" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
            {/* Coiled Tubing Spooled Layers */}
            <circle cx="0" cy="0" r="22" fill="#0369a1" opacity="0.65" />
            <circle cx="0" cy="0" r="14" fill="#082f49" />
            
            {/* Rotating Spool Spokes */}
            <g transform={`rotate(${reelRotationDeg})`}>
              <line x1="-28" y1="0" x2="28" y2="0" stroke="#7dd3fc" strokeWidth="2" />
              <line x1="0" y1="-28" x2="0" y2="28" stroke="#7dd3fc" strokeWidth="2" />
              <circle cx="0" cy="0" r="5" fill="#f8fafc" />
            </g>
            <text x="0" y="44" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">
              CT REEL ({ct.outsideDiameterIn}&quot;)
            </text>
          </g>

          {/* Tubing Cathead Span from Reel to Gooseneck */}
          <path
            d={`M ${reelX} ${reelY - 26} C ${reelX + 40} ${reelY - 65}, ${wellheadX - 60} ${injectorY - 30}, ${wellheadX - 8} ${injectorY - 24}`}
            fill="none"
            stroke="url(#ctMetallic3D)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Guide Arch / Gooseneck curved frame */}
          <path
            d={`M ${wellheadX - 30} ${injectorY - 6} C ${wellheadX - 25} ${injectorY - 35}, ${wellheadX + 5} ${injectorY - 35}, ${wellheadX} ${injectorY}`}
            fill="none"
            stroke="#64748b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text x={wellheadX - 35} y={injectorY - 38} fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
            GOOSENECK (72&quot; R)
          </text>

          {/* Injector Head & Chain Drive */}
          <g transform={`translate(${wellheadX}, ${injectorY})`}>
            {/* Injector Box Frame */}
            <rect
              x="-16"
              y="0"
              width="32"
              height="34"
              rx="3"
              fill="#1e293b"
              stroke="#06b6d4"
              strokeWidth="1.5"
            />
            {/* Animated drive chain rollers */}
            <circle cx="-7" cy="10" r="4" fill="#0891b2" />
            <circle cx="7" cy="10" r="4" fill="#0891b2" />
            <circle cx="-7" cy="24" r="4" fill="#0891b2" />
            <circle cx="7" cy="24" r="4" fill="#0891b2" />
            {/* Gripper blocks */}
            <rect x="-3" y="6" width="6" height="22" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
            <text x="24" y="20" fill="#22d3ee" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
              INJECTOR HEAD
            </text>
          </g>

          {/* Stripper & BOP & Wellhead Tree Flange Stack */}
          <g transform={`translate(${wellheadX}, ${injectorY + 34})`}>
            {/* Stripper Pack-off */}
            <rect x="-10" y="0" width="20" height="8" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
            {/* Lubricator / Riser */}
            <rect x="-6" y="8" width="12" height="6" fill="#1e293b" />
            {/* BOP Stack (Blowout Preventer) */}
            <rect x="-14" y="14" width="28" height="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="20" y="23" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono">
              QUAD BOP
            </text>
            {/* Master Valve & Wellhead Flange */}
            <rect x="-18" y="26" width="36" height="6" fill="#334155" stroke="#475569" strokeWidth="1" />
          </g>

          {/* ============================================================ */}
          {/* SUBSURFACE: Wellbore Casing, Geological Layers & Perforations */}
          {/* ============================================================ */}

          {/* Formation Strata Background Layers */}
          <rect x={wellheadX - 100} y={wellheadY + 10} width={svgWidth - wellheadX + 90} height="90" fill="#0f172a" opacity="0.4" />
          <rect x={wellheadX - 100} y={wellheadY + 110} width={svgWidth - wellheadX + 90} height="110" fill="#172554" opacity="0.15" />
          <rect x={wellheadX - 100} y={wellheadY + 230} width={svgWidth - wellheadX + 90} height="130" fill="#1e1b4b" opacity="0.25" />

          {/* Geological Formations Annotation */}
          <g opacity="0.5" fontFamily="JetBrains Mono" fontSize="8" fill="#64748b">
            <text x={svgWidth - 140} y={wellheadY + 50}>Upper Shale Cap</text>
            <text x={svgWidth - 140} y={wellheadY + 160}>Sandstone Interval</text>
            <text x={svgWidth - 140} y={wellheadY + 280}>Hydrocarbon Payzone</text>
          </g>

          {/* Outer Casing Cement Annulus (Thicker outer hollow) */}
          <path
            d={casingPathD}
            fill="none"
            stroke="#1e293b"
            strokeWidth="28"
            strokeLinecap="square"
            strokeLinejoin="round"
          />

          {/* Production Casing Tube (Inner metallic cylinder) */}
          <path
            d={casingPathD}
            fill="none"
            stroke="url(#casingWall3D)"
            strokeWidth="18"
            strokeLinecap="square"
            strokeLinejoin="round"
          />
          {/* Casing Bore Inside (Dark hole) */}
          <path
            d={casingPathD}
            fill="none"
            stroke="#020617"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Perforated Completion Interval (Target Payzone at Well Bottom) */}
          {trajectoryPoints.slice(-15).map((pt, idx) => (
            <g key={idx}>
              {/* Radial perforation shots left and right */}
              <circle cx={pt.x - 14} cy={pt.y} r="2" fill="#fbbf24" filter="url(#glow)" />
              <circle cx={pt.x + 14} cy={pt.y} r="2" fill="#fbbf24" filter="url(#glow)" />
              <line x1={pt.x - 14} y1={pt.y} x2={pt.x - 8} y2={pt.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="1 1" />
              <line x1={pt.x + 8} y1={pt.y} x2={pt.x + 14} y2={pt.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="1 1" />
            </g>
          ))}

          {/* Payzone Marker Tag */}
          {trajectoryPoints.length > 0 && (
            <g transform={`translate(${trajectoryPoints[trajectoryPoints.length - 1].x - 80}, ${trajectoryPoints[trajectoryPoints.length - 1].y + 24})`}>
              <rect x="0" y="0" width="160" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
              <text x="80" y="12" fill="#fbbf24" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="bold">
                PRODUCING PERFORATIONS
              </text>
            </g>
          )}

          {/* Trajectory Milestone Depth Markers */}
          {/* Surface */}
          <g transform={`translate(${wellheadX + 25}, ${wellheadY + 15})`}>
            <text fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">
              SURFACE CASING (13-3/8&quot;)
            </text>
          </g>

          {/* KOP Marker */}
          {inclination > 5 && (
            <g transform={`translate(${projectPoint(0, kopFraction).x + 22}, ${projectPoint(0, kopFraction).y})`}>
              <line x1="-15" y1="0" x2="-2" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
              <text fill="#f59e0b" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                KOP: {Math.round(maxDepth * kopFraction).toLocaleString()} ft
              </text>
              <text y="10" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Kick-off Point
              </text>
            </g>
          )}

          {/* EOC / Landing Marker */}
          {inclination > 5 && (
            <g transform={`translate(${projectPoint(getWellCoords(eocFraction).dispFrac, getWellCoords(eocFraction).tvdFrac).x + 16}, ${projectPoint(getWellCoords(eocFraction).dispFrac, getWellCoords(eocFraction).tvdFrac).y - 8})`}>
              <line x1="-12" y1="8" x2="-2" y2="8" stroke="#38bdf8" strokeWidth="1.5" />
              <text fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                EOC: {Math.round(maxDepth * eocFraction).toLocaleString()} ft
              </text>
              <text y="10" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Landing at {inclination}° Inc
              </text>
            </g>
          )}

          {/* Total Depth TD Marker */}
          {trajectoryPoints.length > 0 && (
            <g transform={`translate(${trajectoryPoints[trajectoryPoints.length - 1].x + 16}, ${trajectoryPoints[trajectoryPoints.length - 1].y})`}>
              <text fill="#10b981" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                TD: {maxDepth.toLocaleString()} ft
              </text>
              <text y="10" fill="#6ee7b7" fontSize="8" fontFamily="JetBrains Mono">
                {isMetric ? `(${Math.round(ftToM(maxDepth))} m)` : 'Total Measured Depth'}
              </text>
            </g>
          )}

          {/* ============================================================ */}
          {/* ACTIVE COILED TUBING STRING (Animated Penetration & BHA) */}
          {/* ============================================================ */}
          {/* Coiled tubing string along trajectory */}
          <path
            d={ctPathD}
            fill="none"
            stroke="url(#ctMetallic3D)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner specular shine on CT string */}
          <path
            d={ctPathD}
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="1.2"
            strokeOpacity="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Hole Assembly (BHA) Tip & Jet Nozzle */}
          {depthFraction > 0.005 && (
            <g
              id="bha3dTip"
              transform={`translate(${tipPoint.x}, ${tipPoint.y})`}
              style={{ transition: 'transform 0.12s cubic-bezier(0.25, 0.8, 0.45, 1)' }}
            >
              {/* Mode Transition Shockwave Beacon */}
              {bhaModePulse && (
                <g className="pointer-events-none">
                  <circle
                    cx="0"
                    cy="0"
                    r="24"
                    fill="none"
                    stroke={bhaModePulse.mode === 'RIH' ? '#22c55e' : '#f59e0b'}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-ping opacity-80"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="15"
                    fill={bhaModePulse.mode === 'RIH' ? '#22c55e' : '#f59e0b'}
                    fillOpacity="0.25"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* BHA Tool Outer Body */}
              <circle
                cx="0"
                cy="0"
                r="6"
                fill={opMode === 'RIH' ? '#10b981' : opMode === 'POOH' ? '#f59e0b' : '#38bdf8'}
                stroke="#fff"
                strokeWidth="1.5"
                style={{ transition: 'fill 0.4s ease' }}
              />

              {/* Directional motion arrow on BHA tip that flips on toggle */}
              <g
                transform={`rotate(${opMode === 'POOH' ? 180 : 0})`}
                style={{ transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <path d="M 0 3 L -2 -1 L 2 -1 Z" fill="#ffffff" />
              </g>
              
              {/* Fluid jet wash spray while RIH */}
              {showFluidJet && opMode === 'RIH' && (
                <g opacity="0.85">
                  <polygon
                    points="0,-2 28,-7 28,7 0,2"
                    fill="url(#fluidJet)"
                    transform={`rotate(${inclination > 10 && depthFraction > kopFraction ? (inclination * (depthFraction - kopFraction) / (1 - kopFraction)) : 90})`}
                  />
                  <circle cx="16" cy="0" r="1.5" fill="#e0f2fe" />
                  <circle cx="24" cy="-2" r="1" fill="#bae6fd" />
                  <circle cx="22" cy="3" r="1.2" fill="#7dd3fc" />
                </g>
              )}

              {/* Dynamic Mode Badge Callout */}
              <g transform="translate(12, -10)">
                <rect
                  x="0"
                  y="0"
                  width="72"
                  height="18"
                  rx="4"
                  fill="#020617"
                  stroke={opMode === 'RIH' ? '#10b981' : opMode === 'POOH' ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="1.2"
                  style={{ transition: 'stroke 0.4s ease' }}
                />
                <text
                  x="36"
                  y="12"
                  textAnchor="middle"
                  fill={opMode === 'RIH' ? '#86efac' : opMode === 'POOH' ? '#fde68a' : '#7dd3fc'}
                  className="font-mono text-[9px] font-bold"
                >
                  {opMode === 'RIH' ? 'RIH ▾' : opMode === 'POOH' ? 'POOH ▴' : 'STANDBY'}
                </text>
              </g>

              {/* Tooltip Depth Beacon */}
              <circle
                cx="0"
                cy="0"
                r="10"
                fill="none"
                stroke={opMode === 'RIH' ? '#34d399' : opMode === 'POOH' ? '#fbbf24' : '#22d3ee'}
                strokeWidth="1"
                strokeDasharray="2 2"
                className="animate-ping"
              />
            </g>
          )}

          {/* Dynamic Cursor Hover Reticle and Telemetry Badge */}
          {hoverPoint && hoverForces && hoverDepthFt !== markerDepthFt && (
            <g
              transform={`translate(${hoverPoint.x}, ${hoverPoint.y})`}
              className="pointer-events-none select-none"
            >
              {/* Pulsing Target Ring */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="none"
                stroke={
                  hoverForces.statusColor === 'emerald'
                    ? '#34d399'
                    : hoverForces.statusColor === 'amber'
                    ? '#fbbf24'
                    : '#fb7185'
                }
                strokeWidth="1.5"
                strokeDasharray="3 2"
                className="animate-pulse"
              />
              {/* Target Reticle Core */}
              <circle
                cx="0"
                cy="0"
                r="5"
                fill={
                  hoverForces.statusColor === 'emerald'
                    ? '#059669'
                    : hoverForces.statusColor === 'amber'
                    ? '#d97706'
                    : '#e11d48'
                }
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <line x1="-15" y1="0" x2="-7" y2="0" stroke="#f8fafc" strokeWidth="1.5" />
              <line x1="7" y1="0" x2="15" y2="0" stroke="#f8fafc" strokeWidth="1.5" />
              <line x1="0" y1="-15" x2="0" y2="-7" stroke="#f8fafc" strokeWidth="1.5" />
              <line x1="0" y1="7" x2="0" y2="15" stroke="#f8fafc" strokeWidth="1.5" />

              {/* Floating Dynamic Hover Telemetry Card */}
              <g transform="translate(18, -48)">
                <rect
                  x="0"
                  y="0"
                  width="180"
                  height="70"
                  rx="7"
                  fill="#020617"
                  fillOpacity="0.96"
                  stroke={
                    hoverForces.statusColor === 'emerald'
                      ? '#059669'
                      : hoverForces.statusColor === 'amber'
                      ? '#d97706'
                      : '#e11d48'
                  }
                  strokeWidth="1.6"
                />
                {/* Header tag */}
                <rect
                  x="0"
                  y="0"
                  width="180"
                  height="18"
                  rx="7"
                  fill={
                    hoverForces.statusColor === 'emerald'
                      ? '#064e3b'
                      : hoverForces.statusColor === 'amber'
                      ? '#78350f'
                      : '#881337'
                  }
                  fillOpacity="0.8"
                />
                <text x="7" y="13" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                  CURSOR: {Math.round(isMetric ? ftToM(hoverForces.depthFt) : hoverForces.depthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                </text>
                <text x="172" y="13" textAnchor="end" fill="#cbd5e1" fontSize="8" fontFamily="JetBrains Mono">
                  {hoverForces.localIncDeg.toFixed(0)}° Inc
                </text>

                {/* Tension & Buckling metrics */}
                <text x="7" y="32" fill="#f59e0b" fontSize="8.5" fontFamily="JetBrains Mono" fontWeight="bold">
                  POOH: {isMetric ? `${Math.round(lbfToKn(hoverForces.pickupLbf))} kN` : `${Math.round(hoverForces.pickupLbf).toLocaleString()} lbf`}
                </text>
                <text x="7" y="46" fill={hoverForces.slackoffLbf < 0 ? '#c084fc' : '#34d399'} fontSize="8.5" fontFamily="JetBrains Mono" fontWeight="bold">
                  RIH: {isMetric ? `${Math.round(lbfToKn(hoverForces.slackoffLbf))} kN` : `${Math.round(hoverForces.slackoffLbf).toLocaleString()} lbf`}
                </text>
                <text
                  x="7"
                  y="60"
                  fill={
                    hoverForces.statusColor === 'emerald'
                      ? '#6ee7b7'
                      : hoverForces.statusColor === 'amber'
                      ? '#fde68a'
                      : '#fca5a5'
                  }
                  fontSize="8"
                  fontFamily="system-ui"
                  fontWeight="bold"
                >
                  Status: {hoverForces.bucklingStatus}
                </text>
              </g>
            </g>
          )}

          {/* Clickable Depth Location Force Marker Pin on Wellbore Path */}
          {markerPoint && markerForces && (
            <g
              transform={`translate(${markerPoint.x}, ${markerPoint.y})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsMarkerProbeOpen(true);
              }}
            >
              {/* Outer pulsing beacon ring */}
              <circle cx="0" cy="0" r="14" fill="none" stroke="#22d3ee" strokeWidth="1.5" className="animate-ping opacity-75" />
              {/* Center reticle */}
              <circle cx="0" cy="0" r="7" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
              <line x1="-11" y1="0" x2="11" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="0" y1="-11" x2="0" y2="11" stroke="#38bdf8" strokeWidth="1.5" />

              {/* Floating Mini Forces Badge on canvas */}
              <g transform="translate(14, -28)">
                <rect x="0" y="0" width="138" height="46" rx="6" fill="#020617" fillOpacity="0.95" stroke="#0891b2" strokeWidth="1.5" />
                <text x="6" y="13" fill="#38bdf8" fontSize="8.5" fontWeight="bold" fontFamily="JetBrains Mono">
                  MD: {Math.round(isMetric ? ftToM(markerForces.depthFt) : markerForces.depthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                </text>
                <text x="6" y="26" fill="#f59e0b" fontSize="8" fontFamily="JetBrains Mono">
                  POOH: {isMetric ? `${Math.round(lbfToKn(markerForces.pickupLbf))} kN` : `${Math.round(markerForces.pickupLbf).toLocaleString()} lbf`}
                </text>
                <text x="6" y="38" fill={markerForces.slackoffLbf < 0 ? '#c084fc' : '#34d399'} fontSize="8" fontFamily="JetBrains Mono">
                  RIH: {isMetric ? `${Math.round(lbfToKn(markerForces.slackoffLbf))} kN` : `${Math.round(markerForces.slackoffLbf).toLocaleString()} lbf`}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Live HUD Overlay: Operating Telemetry */}
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-3 text-xs shadow-xl pointer-events-none max-w-xs">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white tracking-wide uppercase text-[11px]">
              Live String Telemetry
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Measured Depth (MD):</span>
              <span className="text-cyan-300 font-bold">
                {isMetric ? `${Math.round(ftToM(currentDepthFt)).toLocaleString()} m` : `${Math.round(currentDepthFt).toLocaleString()} ft`}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-400">True Vertical (TVD):</span>
              <span className="text-slate-200">
                {isMetric ? `${Math.round(ftToM(currentTvdFt)).toLocaleString()} m` : `${currentTvdFt.toLocaleString()} ft`}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Instant Hookload:</span>
              <span
                className={`font-bold ${
                  opMode === 'RIH'
                    ? 'text-emerald-400'
                    : opMode === 'POOH'
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                {isMetric
                  ? `${Math.round(lbfToKn(liveHookloadLbf))} kN`
                  : `${Math.round(liveHookloadLbf).toLocaleString()} lbf`}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Travel Speed:</span>
              <span className="text-slate-300">
                {opMode === 'STANDBY' ? '0 ft/min' : `${speedFtPerMin} ft/min`}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
              <span>{sectionLabel}</span>
            </div>
          </div>
        </div>

        {/* Live Warning Badge if Lockup or High Compression */}
        {results.isLockedUp && depthFraction >= 0.7 && (
          <div className="absolute top-3 right-3 bg-rose-950/90 border border-rose-500/80 rounded-lg p-2.5 text-xs text-rose-200 shadow-xl flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-[11px] uppercase">Lockup Risk Detected</div>
              <div className="text-[10px] text-rose-300">Compressive drag exceeds helical limit</div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls Bar: RIH / POOH / Standby & Depth Scrubber */}
      <div className="p-4 sm:p-5 bg-slate-900/95 space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Operation Mode Selector Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* RIH Button */}
            <button
              onClick={() => {
                if (currentDepthFt >= maxDepth - 50) {
                  setCurrentDepthFt(0);
                }
                setOpMode('RIH');
              }}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                opMode === 'RIH'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-emerald-500/50 hover:text-emerald-400'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 text-emerald-300" />
              <span>RIH (Run In)</span>
            </button>

            {/* Standby Button */}
            <button
              onClick={() => setOpMode('STANDBY')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                opMode === 'STANDBY'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-950/60'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400'
              }`}
            >
              <Pause className="w-4 h-4 text-cyan-300" />
              <span>Standby (Hold)</span>
            </button>

            {/* POOH Button */}
            <button
              onClick={() => {
                if (currentDepthFt <= 100) {
                  setCurrentDepthFt(maxDepth * 0.75);
                }
                setOpMode('POOH');
              }}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                opMode === 'POOH'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-950/60 ring-1 ring-amber-400/50'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-400'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 text-amber-300" />
              <span>POOH (Pull Out)</span>
            </button>
          </div>

          {/* Animation Speed Slider & Observation Mode Control */}
          <div
            id="simulation-speed-slider-3d-container"
            className="flex items-center gap-2.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] shadow-sm w-full lg:w-auto justify-between"
          >
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed:</span>
            </div>

            {/* Continuous Range Slider */}
            <div className="flex items-center gap-2">
              <input
                id="sim-speed-slider-3d"
                type="range"
                min="10"
                max="300"
                step="5"
                value={speedFtPerMin}
                onChange={(e) => setSpeedFtPerMin(Number(e.target.value))}
                className="w-20 sm:w-28 md:w-36 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all"
                title={`Adjust animation speed: ${speedFtPerMin} ft/min (${Math.round(ftToM(speedFtPerMin))} m/min)`}
              />

              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 min-w-[56px] text-right">
                  {speedFtPerMin}
                  <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                    {isMetric ? 'ft/m' : 'ft/m'}
                  </span>
                </span>

                {/* Observation Mode Badge */}
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border hidden sm:inline-block ${
                    speedFtPerMin <= 30
                      ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                      : speedFtPerMin <= 90
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                      : speedFtPerMin <= 180
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}
                  title={
                    speedFtPerMin <= 30
                      ? 'Slow-Motion: High precision for observing curve transitions and casing shoes'
                      : speedFtPerMin <= 90
                      ? 'Inspection Rate: Steady string ingress'
                      : speedFtPerMin <= 180
                      ? 'Standard Operational Running Speed'
                      : 'Rapid Transit Rate'
                  }
                >
                  {speedFtPerMin <= 30
                    ? 'Slow-Mo'
                    : speedFtPerMin <= 90
                    ? 'Inspect'
                    : speedFtPerMin <= 180
                    ? 'Standard'
                    : 'Fast'}
                </span>
              </div>
            </div>

            {/* Quick Snap Presets */}
            <div className="hidden xl:flex items-center gap-1 border-l border-slate-800 pl-2">
              {[
                { label: 'Crawl', spd: 20 },
                { label: '60', spd: 60 },
                { label: '120', spd: 120 },
                { label: '240', spd: 240 },
              ].map((p) => (
                <button
                  key={p.spd}
                  type="button"
                  onClick={() => setSpeedFtPerMin(p.spd)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-medium transition-colors ${
                    speedFtPerMin === p.spd
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Reset to Surface */}
            <button
              onClick={() => {
                setCurrentDepthFt(0);
                setOpMode('STANDBY');
              }}
              title="Reset to Surface (0 ft)"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Depth Scrubber Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Manual Depth Scrubber:
            </span>
            <span className="font-bold text-cyan-400">
              {isMetric
                ? `${Math.round(ftToM(currentDepthFt))} / ${Math.round(ftToM(maxDepth))} m`
                : `${Math.round(currentDepthFt).toLocaleString()} / ${maxDepth.toLocaleString()} ft`}{' '}
              ({Math.round(depthFraction * 100)}%)
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={maxDepth}
            step="50"
            value={currentDepthFt}
            onChange={(e) => {
              setCurrentDepthFt(parseFloat(e.target.value) || 0);
              setOpMode('STANDBY');
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg border border-slate-800"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0 ft (Surface)</span>
            <span>{Math.round(maxDepth * kopFraction).toLocaleString()} ft (KOP)</span>
            <span>{Math.round(maxDepth * eocFraction).toLocaleString()} ft (EOC)</span>
            <span>{maxDepth.toLocaleString()} ft (TD)</span>
          </div>
        </div>

        {/* Depth Location Forces Probe Panel (Clickable Depth Marker Telemetry) */}
        <div className="p-3.5 bg-slate-950 border border-cyan-800/60 rounded-xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-950 border border-cyan-700/50 rounded-lg text-cyan-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Clickable Depth Marker &bull; Calculated Forces Probe
                </span>
                <p className="text-[10px] text-slate-400">
                  Click anywhere on the wellbore canvas to place marker, or drag slider below
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {markerDepthFt !== null && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                  {Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt).toLocaleString()} {isMetric ? 'm' : 'ft'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsMarkerProbeOpen(!isMarkerProbeOpen)}
                className="text-slate-400 hover:text-white p-1 rounded bg-slate-900 border border-slate-800"
                title={isMarkerProbeOpen ? 'Collapse probe' : 'Expand probe'}
              >
                {isMarkerProbeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isMarkerProbeOpen && (
            <div className="space-y-3 pt-1">
              {/* Probe Depth Input & Slider */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Marker Depth:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max={maxDepth}
                      step="50"
                      value={markerDepthFt !== null ? Math.round(isMetric ? ftToM(markerDepthFt) : markerDepthFt) : ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) {
                          setMarkerDepthFt(isMetric ? val / 0.3048 : val);
                        }
                      }}
                      placeholder="Depth..."
                      className="w-24 px-2 py-1 text-right font-mono text-xs bg-slate-900 border border-slate-700 rounded text-cyan-200 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs font-mono text-slate-400">{isMetric ? 'm' : 'ft'}</span>
                  </div>
                </div>

                {/* Probe Range Slider */}
                <input
                  type="range"
                  min="0"
                  max={maxDepth}
                  step="25"
                  value={markerDepthFt ?? 0}
                  onChange={(e) => setMarkerDepthFt(Number(e.target.value))}
                  className="flex-1 w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg hover:bg-slate-700"
                />

                {/* Quick Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMarkerDepthFt(Math.round(currentDepthFt))}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded text-[10px] font-medium transition-colors"
                    title="Move marker to current CT tip depth"
                  >
                    Sync to CT Tip
                  </button>
                  {markerDepthFt !== null && (
                    <button
                      type="button"
                      onClick={() => setMarkerDepthFt(null)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-900 transition-colors"
                      title="Clear depth marker"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Exact Calculated Forces Telemetry Grid at Marker Depth */}
              {markerForces ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* Pick-Up Force Card */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/30">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      POOH Tension (Pick-up)
                    </span>
                    <div className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                      {isMetric
                        ? `${Math.round(lbfToKn(markerForces.pickupLbf))} kN`
                        : `${Math.round(markerForces.pickupLbf).toLocaleString()} lbf`}
                    </div>
                    <span className="text-[9px] text-slate-500">Includes cumulative upward drag</span>
                  </div>

                  {/* Slack-Off Force Card */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-emerald-500/30">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      RIH Load (Slack-off)
                    </span>
                    <div className={`text-sm font-mono font-bold mt-0.5 ${markerForces.slackoffLbf < 0 ? 'text-purple-300' : 'text-emerald-300'}`}>
                      {isMetric
                        ? `${Math.round(lbfToKn(markerForces.slackoffLbf))} kN`
                        : `${Math.round(markerForces.slackoffLbf).toLocaleString()} lbf`}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {markerForces.slackoffLbf < 0 ? 'Compressive injector snubber' : 'Tension on injector'}
                    </span>
                  </div>

                  {/* Neutral Load Card */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-cyan-500/30">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Neutral Weight
                    </span>
                    <div className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
                      {isMetric
                        ? `${Math.round(lbfToKn(markerForces.neutralLbf))} kN`
                        : `${Math.round(markerForces.neutralLbf).toLocaleString()} lbf`}
                    </div>
                    <span className="text-[9px] text-slate-500">Static string buoyancy weight</span>
                  </div>

                  {/* Dawson-Paslay Buckling Card */}
                  <div className={`bg-slate-900/90 p-2.5 rounded-lg border ${
                    markerForces.statusColor === 'rose'
                      ? 'border-rose-500/40'
                      : markerForces.statusColor === 'amber'
                      ? 'border-amber-500/40'
                      : 'border-emerald-500/30'
                  }`}>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Buckling &amp; Dawson Limit
                    </span>
                    <div className={`text-xs font-mono font-bold mt-0.5 truncate ${
                      markerForces.statusColor === 'rose'
                        ? 'text-rose-400'
                        : markerForces.statusColor === 'amber'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {markerForces.bucklingStatus}
                    </div>
                    <span className="text-[9px] text-slate-500 block truncate">
                      F_hel: {isMetric ? `${Math.round(lbfToKn(markerForces.criticalBucklingLbf))} kN` : `${Math.round(markerForces.criticalBucklingLbf).toLocaleString()} lbf`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 rounded-lg text-center text-xs text-slate-400 font-mono">
                  No marker placed. Click anywhere on the wellbore trajectory to place a depth marker.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
