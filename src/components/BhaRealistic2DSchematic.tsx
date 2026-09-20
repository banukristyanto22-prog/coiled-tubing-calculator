import React, { useState, useRef, useMemo } from 'react';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Scissors,
  Droplets,
  Ruler,
  Info,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { BhaConfiguration, BhaSegment, CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { TOOL_TYPE_DEFAULTS, calculateSegmentLinearWeight, calculateSegmentMomentOfInertia } from '../data/bhaPresets';

interface BhaRealistic2DSchematicProps {
  bhaConfig: BhaConfiguration;
  ct: CoiledTubingString;
  casingInnerDiameterIn: number;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
  hoveredSegmentId?: string | null;
  onHoverSegment?: (segmentId: string | null) => void;
  unitSystem?: UnitSystem;
  className?: string;
}

export const BhaRealistic2DSchematic: React.FC<BhaRealistic2DSchematicProps> = ({
  bhaConfig,
  ct,
  casingInnerDiameterIn,
  selectedSegmentId,
  onSelectSegment,
  hoveredSegmentId,
  onHoverSegment,
  unitSystem = 'imperial',
  className = ''
}) => {
  // View options
  const [viewMode, setViewMode] = useState<'realistic' | 'cutaway'>('realistic');
  const [showCasing, setShowCasing] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showFlowStream, setShowFlowStream] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMetric = unitSystem === 'metric';

  const inToMm = (val: number) => val * 25.4;
  const ftToM = (val: number) => val * 0.3048;

  // Active segment
  const activeSegmentId = hoveredSegmentId || selectedSegmentId;
  const activeSegment = useMemo(() => {
    return bhaConfig.segments.find((s) => s.id === activeSegmentId) || null;
  }, [bhaConfig.segments, activeSegmentId]);

  // Dimensions & scaling math
  const totalBhaLengthFt = useMemo(() => {
    return bhaConfig.segments.reduce((acc, s) => acc + Math.max(0.1, s.lengthFt), 0);
  }, [bhaConfig.segments]);

  const maxBhaOdIn = useMemo(() => {
    return bhaConfig.segments.reduce((max, s) => Math.max(max, s.outerDiameterIn), ct.outerDiameterIn);
  }, [bhaConfig.segments, ct.outerDiameterIn]);

  // SVG Canvas dimensions: Virtual coordinate system
  const canvasWidth = 1000;
  const canvasHeight = 240;
  const centerY = 120;

  // Casing radius in virtual pixels (casing clamped to max height ~190px)
  const maxAllowableCasingHeightPx = 180;
  const pixelsPerInch = Math.min(22, maxAllowableCasingHeightPx / Math.max(1.5, casingInnerDiameterIn));
  const casingRadiusPx = (casingInnerDiameterIn / 2) * pixelsPerInch;

  // Segment layout along X axis
  const ctInletWidthPx = 70;
  const availableBhaWidthPx = canvasWidth - ctInletWidthPx - 60;

  const segmentLayouts = useMemo(() => {
    const totalLen = Math.max(1, totalBhaLengthFt);
    let curX = ctInletWidthPx + 20;

    return bhaConfig.segments.map((seg, idx) => {
      // Proportional width with a minimum readable width of 75px
      const rawWidth = (Math.max(0.1, seg.lengthFt) / totalLen) * availableBhaWidthPx;
      const width = Math.max(75, Math.min(240, rawWidth));
      const radiusPx = (seg.outerDiameterIn / 2) * pixelsPerInch;
      const innerRadiusPx = Math.max(2, (seg.innerDiameterIn / 2) * pixelsPerInch);

      const layout = {
        seg,
        index: idx,
        startX: curX,
        width,
        radiusPx,
        innerRadiusPx,
        heightPx: radiusPx * 2
      };

      curX += width;
      return layout;
    });
  }, [bhaConfig.segments, totalBhaLengthFt, availableBhaWidthPx, ctInletWidthPx, pixelsPerInch]);

  const totalContentWidth = useMemo(() => {
    if (segmentLayouts.length === 0) return ctInletWidthPx + 150;
    const last = segmentLayouts[segmentLayouts.length - 1];
    return last.startX + last.width + 40;
  }, [segmentLayouts, ctInletWidthPx]);

  // Handle zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanX(0);
  };

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Top Header / View Controller Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <span>Realistic 2D BHA Assembly Schematic</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                Oilfield Spec CAD
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              True-to-life architectural cross-section with mechanical joints, PDC cutters, and internal flow paths
            </p>
          </div>
        </div>

        {/* View mode toggle and visual options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode: Realistic Shaded vs Engineering Cutaway */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('realistic')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'realistic'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Photorealistic 3D-shaded mechanical exterior"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Exterior Shaded</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cutaway')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'cutaway'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Internal longitudinal cross-section cutaway"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Internal Cutaway</span>
            </button>
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setShowCasing(!showCasing)}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition-all ${
                showCasing ? 'bg-slate-800 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Casing Wall Reference"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Casing</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDimensions(!showDimensions)}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition-all ${
                showDimensions ? 'bg-slate-800 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Dimension Annotations"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dimensions</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFlowStream(!showFlowStream)}
              className={`p-1 rounded text-[11px] flex items-center gap-1 transition-all ${
                showFlowStream ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Animated Fluid Flow"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flow</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Vector Canvas Container */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-x-auto overflow-y-hidden bg-[#070d18] select-none scrollbar-thin scrollbar-thumb-slate-700 p-2"
        style={{ minHeight: '220px' }}
      >
        {bhaConfig.segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
            <Layers className="w-8 h-8 text-slate-600 mb-2" />
            <p>No BHA tools defined in assembly.</p>
            <p className="text-[11px] text-slate-600">Select a preset or add tools below to see the realistic 2D engineering schematic.</p>
          </div>
        ) : (
          <div 
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              transition: 'transform 0.15s ease-out'
            }}
          >
            <svg
              width={Math.max(canvasWidth, totalContentWidth)}
              height={canvasHeight}
              viewBox={`0 0 ${Math.max(canvasWidth, totalContentWidth)} ${canvasHeight}`}
              className="overflow-visible block"
            >
              <defs>
                {/* Metallic Chrome & Steel Gradients */}
                <linearGradient id="ctSteelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="30%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#082f49" />
                </linearGradient>

                <linearGradient id="chromeMandrelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="25%" stopColor="#f8fafc" />
                  <stop offset="50%" stopColor="#cbd5e1" />
                  <stop offset="75%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>

                <linearGradient id="toolSteelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="30%" stopColor="#64748b" />
                  <stop offset="55%" stopColor="#475569" />
                  <stop offset="85%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <linearGradient id="brassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="35%" stopColor="#fef08a" />
                  <stop offset="70%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>

                <linearGradient id="copperCoilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#9a3412" />
                  <stop offset="30%" stopColor="#fdba74" />
                  <stop offset="60%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </linearGradient>

                <linearGradient id="carbidePdcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#090d16" />
                  <stop offset="40%" stopColor="#1e293b" />
                  <stop offset="70%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                <linearGradient id="flowInternalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.4" />
                </linearGradient>

                {/* Section Hatching Pattern for Cutaway Cross-Section */}
                <pattern id="steelHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="1" strokeOpacity="0.4" />
                </pattern>

                <pattern id="carbideHatch" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.5" />
                </pattern>

                {/* Flow Animation Stroke Dash */}
                <style>{`
                  @keyframes flowMove {
                    0% { stroke-dashoffset: 24; }
                    100% { stroke-dashoffset: 0; }
                  }
                  .animate-flow-stream {
                    animation: flowMove 0.8s linear infinite;
                  }
                  @keyframes jetSpray {
                    0% { opacity: 0.3; transform: scale(0.9); }
                    50% { opacity: 0.9; transform: scale(1.05); }
                    100% { opacity: 0.3; transform: scale(0.9); }
                  }
                `}</style>
              </defs>

              {/* 1. Background Grid & Casing Reference Bounds */}
              {showCasing && (
                <g className="casing-reference-group">
                  {/* Casing upper and lower walls */}
                  <line
                    x1="10"
                    y1={centerY - casingRadiusPx}
                    x2={totalContentWidth}
                    y2={centerY - casingRadiusPx}
                    stroke="#334155"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <line
                    x1="10"
                    y1={centerY + casingRadiusPx}
                    x2={totalContentWidth}
                    y2={centerY + casingRadiusPx}
                    stroke="#334155"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />

                  {/* Casing Steel Wall Hatching */}
                  <rect
                    x="10"
                    y={centerY - casingRadiusPx - 10}
                    width={totalContentWidth - 10}
                    height="10"
                    fill="url(#steelHatch)"
                    opacity="0.3"
                  />
                  <rect
                    x="10"
                    y={centerY + casingRadiusPx}
                    width={totalContentWidth - 10}
                    height="10"
                    fill="url(#steelHatch)"
                    opacity="0.3"
                  />

                  {/* Casing ID Label */}
                  <text
                    x="16"
                    y={centerY - casingRadiusPx - 13}
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    CASING ID: {isMetric ? `${inToMm(casingInnerDiameterIn).toFixed(1)} mm` : `${casingInnerDiameterIn.toFixed(3)}"`}
                  </text>
                </g>
              )}

              {/* Centerline Axis */}
              <line
                x1="5"
                y1={centerY}
                x2={totalContentWidth + 10}
                y2={centerY}
                stroke="#0284c7"
                strokeWidth="1"
                strokeDasharray="14 3 3 3"
                strokeOpacity="0.45"
              />

              {/* 2. Coiled Tubing Entry Pipe (Left) */}
              {(() => {
                const ctRadiusPx = (ct.outerDiameterIn / 2) * pixelsPerInch;
                const ctInnerRadiusPx = ((ct.outerDiameterIn - 2 * ct.wallThicknessIn) / 2) * pixelsPerInch;

                return (
                  <g 
                    className="ct-entry-pipe cursor-pointer"
                    title={`Coiled Tubing: OD ${ct.outerDiameterIn}" x WT ${ct.wallThicknessIn}"`}
                  >
                    {viewMode === 'cutaway' ? (
                      // Cutaway CT Walls & Internal Bore
                      <>
                        {/* Upper Wall */}
                        <rect
                          x="10"
                          y={centerY - ctRadiusPx}
                          width={ctInletWidthPx}
                          height={ctRadiusPx - ctInnerRadiusPx}
                          fill="#0284c7"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <rect
                          x="10"
                          y={centerY - ctRadiusPx}
                          width={ctInletWidthPx}
                          height={ctRadiusPx - ctInnerRadiusPx}
                          fill="url(#steelHatch)"
                        />

                        {/* Lower Wall */}
                        <rect
                          x="10"
                          y={centerY + ctInnerRadiusPx}
                          width={ctInletWidthPx}
                          height={ctRadiusPx - ctInnerRadiusPx}
                          fill="#0284c7"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <rect
                          x="10"
                          y={centerY + ctInnerRadiusPx}
                          width={ctInletWidthPx}
                          height={ctRadiusPx - ctInnerRadiusPx}
                          fill="url(#steelHatch)"
                        />

                        {/* Internal Bore Passage */}
                        <rect
                          x="10"
                          y={centerY - ctInnerRadiusPx}
                          width={ctInletWidthPx}
                          height={ctInnerRadiusPx * 2}
                          fill="url(#flowInternalGrad)"
                        />
                      </>
                    ) : (
                      // Realistic Shaded CT Pipe
                      <rect
                        x="10"
                        y={centerY - ctRadiusPx}
                        width={ctInletWidthPx}
                        height={ctRadiusPx * 2}
                        fill="url(#ctSteelGrad)"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        rx="2"
                      />
                    )}

                    {/* Pipe Label */}
                    <text
                      x={10 + ctInletWidthPx / 2}
                      y={centerY + 3}
                      fill="#ffffff"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      CT {ct.outerDiameterIn}&quot;
                    </text>
                    <text
                      x={10 + ctInletWidthPx / 2}
                      y={centerY - ctRadiusPx - 6}
                      fill="#38bdf8"
                      fontSize="7"
                      fontWeight="semibold"
                      textAnchor="middle"
                    >
                      COILED TUBING
                    </text>
                  </g>
                );
              })()}

              {/* 3. Render Each BHA Tool Segment with True Realistic Geometries */}
              {segmentLayouts.map((layout) => {
                const { seg, index, startX, width, radiusPx, innerRadiusPx, heightPx } = layout;
                const isHovered = activeSegmentId === seg.id;
                const toolColor = seg.color || TOOL_TYPE_DEFAULTS[seg.type]?.color || '#0ea5e9';

                return (
                  <g
                    key={seg.id}
                    id={`bha-tool-${seg.id}`}
                    className="transition-transform duration-150 cursor-pointer"
                    onMouseEnter={() => onHoverSegment?.(seg.id)}
                    onMouseLeave={() => onHoverSegment?.(null)}
                    onClick={() => onSelectSegment?.(selectedSegmentId === seg.id ? null : seg.id)}
                  >
                    {/* Tool Joint Makeup Shoulder Line on the left connection */}
                    <line
                      x1={startX}
                      y1={centerY - radiusPx - 3}
                      x2={startX}
                      y2={centerY + radiusPx + 3}
                      stroke="#475569"
                      strokeWidth="1.5"
                    />

                    {/* RENDER SPECIFIC TOOL VECTOR SHAPE */}
                    {renderToolVectorShape({
                      seg,
                      index,
                      startX,
                      width,
                      radiusPx,
                      innerRadiusPx,
                      heightPx,
                      centerY,
                      isHovered,
                      viewMode,
                      toolColor,
                      casingRadiusPx
                    })}

                    {/* Dimension Callout lines if enabled */}
                    {showDimensions && (
                      <g className="dimension-callouts pointer-events-none opacity-85">
                        {/* Length dimension under tool */}
                        <line
                          x1={startX + 3}
                          y1={centerY + Math.max(radiusPx, 45) + 14}
                          x2={startX + width - 3}
                          y2={centerY + Math.max(radiusPx, 45) + 14}
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                        {/* Extension ticks */}
                        <line
                          x1={startX + 3}
                          y1={centerY + Math.max(radiusPx, 45) + 11}
                          x2={startX + 3}
                          y2={centerY + Math.max(radiusPx, 45) + 17}
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                        <line
                          x1={startX + width - 3}
                          y1={centerY + Math.max(radiusPx, 45) + 11}
                          x2={startX + width - 3}
                          y2={centerY + Math.max(radiusPx, 45) + 17}
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                        <text
                          x={startX + width / 2}
                          y={centerY + Math.max(radiusPx, 45) + 23}
                          fill="#cbd5e1"
                          fontSize="7"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          L: {seg.lengthFt}ft ({isMetric ? `${ftToM(seg.lengthFt).toFixed(2)}m` : `${(seg.lengthFt * 12).toFixed(0)}"`})
                        </text>

                        {/* Outer Diameter Callout above tool */}
                        <text
                          x={startX + width / 2}
                          y={centerY - Math.max(radiusPx, 45) - 12}
                          fill={isHovered ? '#38bdf8' : '#94a3b8'}
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          OD: {seg.outerDiameterIn}&quot; | ID: {seg.innerDiameterIn}&quot;
                        </text>
                      </g>
                    )}

                    {/* Tool Index Badge */}
                    <circle
                      cx={startX + width / 2}
                      cy={centerY - Math.max(radiusPx, 45) - 2}
                      r="6"
                      fill="#0f172a"
                      stroke={isHovered ? '#38bdf8' : toolColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x={startX + width / 2}
                      y={centerY - Math.max(radiusPx, 45) + 1}
                      fill="#ffffff"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}

              {/* 4. Animated Fluid Flow Streamline through the Bore */}
              {showFlowStream && (
                <g className="flow-streamline pointer-events-none">
                  {segmentLayouts.map((layout) => {
                    const { startX, width, innerRadiusPx } = layout;
                    return (
                      <line
                        key={`flow-${layout.seg.id}`}
                        x1={startX}
                        y1={centerY}
                        x2={startX + width}
                        y2={centerY}
                        stroke="#38bdf8"
                        strokeWidth={Math.max(2, innerRadiusPx * 0.8)}
                        strokeDasharray="6 4"
                        strokeOpacity="0.75"
                        strokeLinecap="round"
                        className="animate-flow-stream"
                      />
                    );
                  })}

                  {/* Forward Jet Spray Plume from Bit Face */}
                  {segmentLayouts.length > 0 && (() => {
                    const last = segmentLayouts[segmentLayouts.length - 1];
                    const bitTipX = last.startX + last.width;
                    return (
                      <g transform={`translate(${bitTipX}, ${centerY})`}>
                        {/* High Pressure Jet Cones */}
                        <polygon
                          points="0,-4 32,-16 28,0 32,16 0,4"
                          fill="#38bdf8"
                          fillOpacity="0.4"
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2="35"
                          y2="0"
                          stroke="#67e8f9"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                          className="animate-flow-stream"
                        />
                        <line
                          x1="0"
                          y1="-3"
                          x2="28"
                          y2="-12"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          className="animate-flow-stream"
                        />
                        <line
                          x1="0"
                          y1="3"
                          x2="28"
                          y2="12"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          className="animate-flow-stream"
                        />
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Interactive Tool Spec & Inspection Callout Panel */}
      {activeSegment && (() => {
        const seg = activeSegment;
        const linW = seg.linearWeightLbFt || calculateSegmentLinearWeight(seg.outerDiameterIn, seg.innerDiameterIn);
        const airWeight = linW * seg.lengthFt;
        const segI = calculateSegmentMomentOfInertia(seg.outerDiameterIn, seg.innerDiameterIn);
        const segEi = (ct.youngsModulusPsi || 29.5e6) * segI;
        const toolDefaults = TOOL_TYPE_DEFAULTS[seg.type];

        return (
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div 
                className="w-3.5 h-3.5 rounded-md border shadow-sm flex-shrink-0"
                style={{ 
                  backgroundColor: seg.color || toolDefaults?.color || '#0ea5e9',
                  borderColor: '#ffffff55'
                }} 
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{seg.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-cyan-300 uppercase">
                    {seg.type.replace('_', ' ')}
                  </span>
                  {selectedSegmentId === seg.id && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold">
                      Active Selected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {seg.description || toolDefaults?.description || 'Downhole specialized coiled tubing BHA tool'}
                </p>
              </div>
            </div>

            {/* Engineering Metrics Badges */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500">OD: </span>
                <strong className="text-cyan-300">{seg.outerDiameterIn}&quot;</strong>
                <span className="text-[10px] text-slate-400 ml-1">({inToMm(seg.outerDiameterIn).toFixed(1)}mm)</span>
              </div>
              <div>
                <span className="text-slate-500">ID: </span>
                <strong className="text-slate-200">{seg.innerDiameterIn}&quot;</strong>
                <span className="text-[10px] text-slate-400 ml-1">({inToMm(seg.innerDiameterIn).toFixed(1)}mm)</span>
              </div>
              <div>
                <span className="text-slate-500">Length: </span>
                <strong className="text-cyan-300">{seg.lengthFt} ft</strong>
                <span className="text-[10px] text-slate-400 ml-1">({ftToM(seg.lengthFt).toFixed(2)}m)</span>
              </div>
              <div>
                <span className="text-slate-500">Weight: </span>
                <strong className="text-amber-300">{Math.round(airWeight)} lbs</strong>
              </div>
              <div>
                <span className="text-slate-500">Stiffness EI: </span>
                <strong className="text-purple-300">{(segEi / 1e6).toFixed(2)}M psi&middot;in⁴</strong>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ============================================================================
// HELPER: RENDER REALISTIC DOWNHOLE TOOL VECTOR SHAPES ACCORDING TO TOOL TYPE
// ============================================================================

interface RenderToolProps {
  seg: BhaSegment;
  index: number;
  startX: number;
  width: number;
  radiusPx: number;
  innerRadiusPx: number;
  heightPx: number;
  centerY: number;
  isHovered: boolean;
  viewMode: 'realistic' | 'cutaway';
  toolColor: string;
  casingRadiusPx: number;
}

function renderToolVectorShape({
  seg,
  startX,
  width,
  radiusPx,
  innerRadiusPx,
  centerY,
  isHovered,
  viewMode,
  toolColor,
  casingRadiusPx
}: RenderToolProps) {
  const strokeColor = isHovered ? '#38bdf8' : '#0f172a';
  const strokeWidth = isHovered ? 2.5 : 1.2;

  // --------------------------------------------------------------------------
  // 1. COILED TUBING CONNECTOR (Slip / Dimple / Roll-On)
  // --------------------------------------------------------------------------
  if (seg.type === 'connector') {
    const slipNeckLen = width * 0.35;
    const bodyLen = width * 0.65;
    const topY = centerY - radiusPx;
    const botY = centerY + radiusPx;

    return (
      <g className="tool-connector">
        {/* Main Body */}
        <path
          d={`
            M ${startX} ${centerY - radiusPx * 0.88}
            L ${startX + slipNeckLen} ${topY}
            L ${startX + width} ${topY}
            L ${startX + width} ${botY}
            L ${startX + slipNeckLen} ${botY}
            L ${startX} ${centerY + radiusPx * 0.88}
            Z
          `}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* External Dimple Set Screws (Radial socket pockets) */}
        {[-0.2, 0.05, 0.3].map((offsetFactor, i) => {
          const screwX = startX + width * (0.55 + offsetFactor * 0.35);
          return (
            <g key={`dimple-${i}`}>
              {/* Upper set screw pocket */}
              <rect
                x={screwX - 3}
                y={topY + 1}
                width="6"
                height="5"
                fill="#0f172a"
                stroke="#64748b"
                strokeWidth="1"
                rx="1"
              />
              <circle cx={screwX} cy={topY + 3.5} r="1.5" fill="#f8fafc" />

              {/* Lower set screw pocket */}
              <rect
                x={screwX - 3}
                y={botY - 6}
                width="6"
                height="5"
                fill="#0f172a"
                stroke="#64748b"
                strokeWidth="1"
                rx="1"
              />
              <circle cx={screwX} cy={botY - 3.5} r="1.5" fill="#f8fafc" />
            </g>
          );
        })}

        {/* Makeup Box Collar on right */}
        <rect
          x={startX + width - 12}
          y={topY - 1.5}
          width="12"
          height={radiusPx * 2 + 3}
          fill="url(#chromeMandrelGrad)"
          stroke="#475569"
          strokeWidth="1"
          rx="1"
        />

        {/* Cutaway Internal O-ring seals and CT guide sleeve */}
        {viewMode === 'cutaway' && (
          <g>
            <rect
              x={startX}
              y={centerY - innerRadiusPx}
              width={width}
              height={innerRadiusPx * 2}
              fill="url(#flowInternalGrad)"
            />
            {/* O-Ring Grooves & Rubber Seals */}
            {[0.25, 0.45].map((pos, i) => (
              <g key={`oring-${i}`}>
                <rect x={startX + width * pos} y={centerY - innerRadiusPx - 3} width="3" height="3" fill="#1e293b" />
                <circle cx={startX + width * pos + 1.5} cy={centerY - innerRadiusPx - 1.5} r="1.2" fill="#020617" />
                <rect x={startX + width * pos} y={centerY + innerRadiusPx} width="3" height="3" fill="#1e293b" />
                <circle cx={startX + width * pos + 1.5} cy={centerY + innerRadiusPx + 1.5} r="1.2" fill="#020617" />
              </g>
            ))}
          </g>
        )}

        <text
          x={startX + width / 2}
          y={centerY + 3}
          fill="#f8fafc"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          CONNECTOR
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 2. DUAL FLAPPER CHECK VALVE (DFCV)
  // --------------------------------------------------------------------------
  if (seg.type === 'valve') {
    const topY = centerY - radiusPx;
    const botY = centerY + radiusPx;

    return (
      <g className="tool-flapper-valve">
        {/* Main Valve Body Barrel */}
        <rect
          x={startX}
          y={topY}
          width={width}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="2"
        />

        {/* Center Cartridge Thread Collar */}
        <rect
          x={startX + width * 0.46}
          y={topY - 2}
          width={width * 0.08}
          height={radiusPx * 2 + 4}
          fill="url(#chromeMandrelGrad)"
          stroke="#475569"
          strokeWidth="1"
          rx="1"
        />

        {/* Directional Flow Arrows Etched on Tool Body */}
        <g opacity="0.85">
          <polygon
            points={`
              ${startX + width * 0.2},${centerY - radiusPx * 0.45} 
              ${startX + width * 0.28},${centerY - radiusPx * 0.45} 
              ${startX + width * 0.28},${centerY - radiusPx * 0.6} 
              ${startX + width * 0.35},${centerY - radiusPx * 0.35} 
              ${startX + width * 0.28},${centerY - radiusPx * 0.1} 
              ${startX + width * 0.28},${centerY - radiusPx * 0.25} 
              ${startX + width * 0.2},${centerY - radiusPx * 0.25}
            `}
            fill="#38bdf8"
          />
        </g>

        {/* Internal Dual Flapper Plates (shown prominently in cutaway mode or translucent in realistic) */}
        <g className="internal-flappers">
          {/* Bore cavity */}
          <rect
            x={startX}
            y={centerY - innerRadiusPx}
            width={width}
            height={innerRadiusPx * 2}
            fill="url(#flowInternalGrad)"
          />

          {/* First Flapper Plate (Left Cartridge, Angled Downstream at 45°) */}
          <g transform={`translate(${startX + width * 0.3}, ${centerY})`}>
            {/* Hinge Pin */}
            <circle cx="-2" cy={-innerRadiusPx + 2} r="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />
            {/* Angled Flapper Disc */}
            <line
              x1="-2"
              y1={-innerRadiusPx + 2}
              x2="10"
              y2={innerRadiusPx * 0.4}
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Valve Seat Shoulder */}
            <rect x="-6" y={-innerRadiusPx} width="4" height={innerRadiusPx * 2} fill="#94a3b8" />
          </g>

          {/* Second Flapper Plate (Right Cartridge, Angled Downstream) */}
          <g transform={`translate(${startX + width * 0.7}, ${centerY})`}>
            {/* Hinge Pin */}
            <circle cx="-2" cy={-innerRadiusPx + 2} r="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />
            {/* Angled Flapper Disc */}
            <line
              x1="-2"
              y1={-innerRadiusPx + 2}
              x2="10"
              y2={innerRadiusPx * 0.4}
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Valve Seat Shoulder */}
            <rect x="-6" y={-innerRadiusPx} width="4" height={innerRadiusPx * 2} fill="#94a3b8" />
          </g>
        </g>

        <text
          x={startX + width / 2}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          DUAL FLAPPER
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 3. HYDRAULIC / MECHANICAL DRILLING JAR
  // --------------------------------------------------------------------------
  if (seg.type === 'jar') {
    const strokeGap = Math.max(14, width * 0.28);
    const outerBarrelLen = width - strokeGap;
    const topY = centerY - radiusPx;
    const botY = centerY + radiusPx;

    return (
      <g className="tool-jar">
        {/* Chrome Telescoping Sliding Mandrel (High-Shine Mirror Finish) */}
        <rect
          x={startX}
          y={centerY - radiusPx * 0.78}
          width={width}
          height={radiusPx * 1.56}
          fill="url(#chromeMandrelGrad)"
          stroke="#475569"
          strokeWidth="1.2"
        />

        {/* Splined Drive Flutes (Torque Transmission Splines) */}
        {[-0.4, -0.15, 0.15, 0.4].map((offset, i) => (
          <line
            key={`spline-${i}`}
            x1={startX + 4}
            y1={centerY + radiusPx * 0.78 * offset}
            x2={startX + strokeGap - 3}
            y2={centerY + radiusPx * 0.78 * offset}
            stroke="#64748b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ))}

        {/* Outer Heavy Hydraulic Detent Cylinder Housing */}
        <rect
          x={startX + strokeGap}
          y={topY}
          width={outerBarrelLen}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="1.5"
        />

        {/* Anvil / Hammer Impact Shoulder Collar */}
        <rect
          x={startX + strokeGap}
          y={topY - 2}
          width="8"
          height={radiusPx * 2 + 4}
          fill="#1e293b"
          stroke="#94a3b8"
          strokeWidth="1"
          rx="1"
        />

        {/* Stroke Travel Indicator Scale Tick Marks */}
        <g transform={`translate(${startX + 4}, ${centerY - radiusPx * 0.78 - 6})`}>
          <line x1="0" y1="0" x2={strokeGap - 8} y2="0" stroke="#38bdf8" strokeWidth="1" />
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line
              key={`tick-${i}`}
              x1={(strokeGap - 8) * frac}
              y1="-3"
              x2={(strokeGap - 8) * frac}
              y2="2"
              stroke="#38bdf8"
              strokeWidth="0.8"
            />
          ))}
          <text x={(strokeGap - 8) / 2} y="-5" fill="#38bdf8" fontSize="5.5" textAnchor="middle" fontFamily="monospace">
            STROKE: 12&quot;
          </text>
        </g>

        {/* Cutaway Internal Hydraulic Piston and Metering Delay Orifice */}
        {viewMode === 'cutaway' && (
          <g>
            <rect
              x={startX + strokeGap + 12}
              y={centerY - innerRadiusPx * 1.3}
              width={outerBarrelLen * 0.45}
              height={innerRadiusPx * 2.6}
              fill="#0284c7"
              opacity="0.35"
            />
            {/* Piston Seal Rings */}
            <rect
              x={startX + strokeGap + 20}
              y={centerY - innerRadiusPx * 1.3}
              width="6"
              height={innerRadiusPx * 2.6}
              fill="#f59e0b"
            />
          </g>
        )}

        <text
          x={startX + strokeGap + outerBarrelLen / 2}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          HYDR. JAR
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 4. DOWNHOLE MUD MOTOR (PDM - Positive Displacement Motor)
  // --------------------------------------------------------------------------
  if (seg.type === 'motor') {
    const statorLen = width * 0.55;
    const bentSubLen = width * 0.16;
    const bearingLen = width * 0.29;
    const topY = centerY - radiusPx;
    const botY = centerY + radiusPx;

    return (
      <g className="tool-pdm-motor">
        {/* 1. Stator Power Section with Spiral Lobes */}
        <rect
          x={startX}
          y={topY}
          width={statorLen}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Stator Spiral Contour Waves */}
        <path
          d={`
            M ${startX} ${centerY - radiusPx * 0.5}
            Q ${startX + statorLen * 0.25} ${centerY - radiusPx * 0.9} ${startX + statorLen * 0.5} ${centerY - radiusPx * 0.5}
            Q ${startX + statorLen * 0.75} ${centerY - radiusPx * 0.1} ${startX + statorLen} ${centerY - radiusPx * 0.5}
            M ${startX} ${centerY + radiusPx * 0.5}
            Q ${startX + statorLen * 0.25} ${centerY + radiusPx * 0.1} ${startX + statorLen * 0.5} ${centerY + radiusPx * 0.5}
            Q ${startX + statorLen * 0.75} ${centerY + radiusPx * 0.9} ${startX + statorLen} ${centerY + radiusPx * 0.5}
          `}
          stroke="#ec4899"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.75"
        />

        {/* 2. Bent Housing Collar (Adjustable 1.5° Bend Elbow Joint) */}
        <g transform={`translate(${startX + statorLen}, 0)`}>
          <rect
            x="0"
            y={topY - 2}
            width={bentSubLen}
            height={radiusPx * 2 + 4}
            fill="#db2777"
            stroke="#9d174d"
            strokeWidth="1.2"
            rx="2"
          />
          {/* Degree Adjustment Scale Ticks */}
          {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
            <line
              key={`deg-${i}`}
              x1={bentSubLen * f}
              y1={topY + 1}
              x2={bentSubLen * f}
              y2={topY + 6}
              stroke="#fdf2f8"
              strokeWidth="1"
            />
          ))}
          <text
            x={bentSubLen / 2}
            y={centerY + 3}
            fill="#ffffff"
            fontSize="6"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            1.5&deg; BEND
          </text>
        </g>

        {/* 3. Lower Bearing & Rotating Drive Sub */}
        <g transform={`translate(${startX + statorLen + bentSubLen}, 0)`}>
          <rect
            x="0"
            y={centerY - radiusPx * 0.94}
            width={bearingLen}
            height={radiusPx * 1.88}
            fill="url(#chromeMandrelGrad)"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            rx="1"
          />
          {/* Drive shaft seal pack & bit box shoulder */}
          <rect
            x={bearingLen - 10}
            y={topY}
            width="10"
            height={radiusPx * 2}
            fill="#475569"
            stroke="#334155"
            strokeWidth="1"
          />
        </g>

        <text
          x={startX + statorLen * 0.5}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          MUD MOTOR (PDM)
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 5. DRILL COLLAR / HEAVY WEIGHT TUBULAR
  // --------------------------------------------------------------------------
  if (seg.type === 'collar') {
    const topY = centerY - radiusPx;
    const recessLen = Math.min(22, width * 0.22);

    return (
      <g className="tool-drill-collar">
        {/* Main Thick-Wall Cylinder Body */}
        <rect
          x={startX}
          y={topY}
          width={width}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="1"
        />

        {/* Elevator Handling Neck / Slip Recess (Classic Necked-Down Groove) */}
        <rect
          x={startX + 14}
          y={centerY - radiusPx * 0.82}
          width={recessLen}
          height={radiusPx * 1.64}
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1"
          rx="1"
        />
        <text
          x={startX + 14 + recessLen / 2}
          y={centerY - radiusPx * 0.82 - 3}
          fill="#64748b"
          fontSize="5.5"
          textAnchor="middle"
        >
          SLIP RECESS
        </text>

        {/* Spiral Stabilizer Ribs / Wear Hardbanding Bands */}
        {[-0.2, 0.1, 0.4].map((offset, i) => {
          const ribX = startX + width * (0.6 + offset * 0.5);
          return (
            <g key={`rib-${i}`}>
              <line
                x1={ribX - 6}
                y1={topY}
                x2={ribX + 6}
                y2={centerY + radiusPx}
                stroke="#eab308"
                strokeWidth="3.5"
                strokeOpacity="0.8"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Cutaway internal thick-wall ID */}
        {viewMode === 'cutaway' && (
          <rect
            x={startX}
            y={centerY - innerRadiusPx}
            width={width}
            height={innerRadiusPx * 2}
            fill="url(#flowInternalGrad)"
          />
        )}

        <text
          x={startX + width * 0.65}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          DRILL COLLAR
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 6. DOWNHOLE TRACTOR (Robotic Traction Gripper System)
  // --------------------------------------------------------------------------
  if (seg.type === 'tractor') {
    const topY = centerY - radiusPx * 0.85;
    const botY = centerY + radiusPx * 0.85;

    return (
      <g className="tool-tractor">
        {/* Central Chassis Body */}
        <rect
          x={startX}
          y={topY}
          width={width}
          height={radiusPx * 1.7}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="2"
        />

        {/* Articulated Motorized Traction Gripper Arms extending to Casing Wall */}
        {[0.3, 0.7].map((frac, idx) => {
          const armX = startX + width * frac;
          return (
            <g key={`arm-${idx}`}>
              {/* Upper Expander Arm */}
              <line
                x1={armX - 8}
                y1={centerY - radiusPx * 0.8}
                x2={armX}
                y2={centerY - casingRadiusPx + 4}
                stroke="#c084fc"
                strokeWidth="2.5"
              />
              <line
                x1={armX + 8}
                y1={centerY - radiusPx * 0.8}
                x2={armX}
                y2={centerY - casingRadiusPx + 4}
                stroke="#c084fc"
                strokeWidth="2.5"
              />
              {/* Upper Serrated Gripper Pad touching Casing Wall */}
              <rect
                x={armX - 10}
                y={centerY - casingRadiusPx + 1}
                width="20"
                height="6"
                fill="#a855f7"
                stroke="#f3e8ff"
                strokeWidth="1"
                rx="1"
              />
              {/* Knurled contact teeth */}
              {[-6, -2, 2, 6].map((tx, t) => (
                <line
                  key={`ut-${t}`}
                  x1={armX + tx}
                  y1={centerY - casingRadiusPx + 1}
                  x2={armX + tx}
                  y2={centerY - casingRadiusPx + 3}
                  stroke="#020617"
                  strokeWidth="1.2"
                />
              ))}

              {/* Lower Expander Arm */}
              <line
                x1={armX - 8}
                y1={centerY + radiusPx * 0.8}
                x2={armX}
                y2={centerY + casingRadiusPx - 4}
                stroke="#c084fc"
                strokeWidth="2.5"
              />
              <line
                x1={armX + 8}
                y1={centerY + radiusPx * 0.8}
                x2={armX}
                y2={centerY + casingRadiusPx - 4}
                stroke="#c084fc"
                strokeWidth="2.5"
              />
              {/* Lower Serrated Gripper Pad */}
              <rect
                x={armX - 10}
                y={centerY + casingRadiusPx - 7}
                width="20"
                height="6"
                fill="#a855f7"
                stroke="#f3e8ff"
                strokeWidth="1"
                rx="1"
              />
              {[-6, -2, 2, 6].map((tx, t) => (
                <line
                  key={`lt-${t}`}
                  x1={armX + tx}
                  y1={centerY + casingRadiusPx - 3}
                  x2={armX + tx}
                  y2={centerY + casingRadiusPx - 1}
                  stroke="#020617"
                  strokeWidth="1.2"
                />
              ))}
            </g>
          );
        })}

        <text
          x={startX + width / 2}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          ROBOTIC TRACTOR
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 7. FLUID OSCILLATOR / AGITATOR (Pulsation Tool)
  // --------------------------------------------------------------------------
  if (seg.type === 'agitator') {
    const topY = centerY - radiusPx;

    return (
      <g className="tool-agitator">
        <rect
          x={startX}
          y={topY}
          width={width}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="1"
        />

        {/* Pulsation Valve Chamber Rings */}
        {[0.3, 0.5, 0.7].map((frac, idx) => (
          <g key={`pulse-${idx}`}>
            <rect
              x={startX + width * frac - 5}
              y={topY - 2}
              width="10"
              height={radiusPx * 2 + 4}
              fill="#d946ef"
              stroke="#86198f"
              strokeWidth="1"
              rx="1.5"
            />
          </g>
        ))}

        {/* Cutaway Internal Venturi Orifice & Belleville Spring Dampener */}
        {viewMode === 'cutaway' && (
          <g>
            <rect
              x={startX}
              y={centerY - innerRadiusPx}
              width={width}
              height={innerRadiusPx * 2}
              fill="url(#flowInternalGrad)"
            />
            {/* Venturi nozzle restriction */}
            <polygon
              points={`
                ${startX + width * 0.4},${centerY - innerRadiusPx}
                ${startX + width * 0.5},${centerY - innerRadiusPx * 0.4}
                ${startX + width * 0.6},${centerY - innerRadiusPx}
              `}
              fill="#ec4899"
            />
            <polygon
              points={`
                ${startX + width * 0.4},${centerY + innerRadiusPx}
                ${startX + width * 0.5},${centerY + innerRadiusPx * 0.4}
                ${startX + width * 0.6},${centerY + innerRadiusPx}
              `}
              fill="#ec4899"
            />
          </g>
        )}

        <text
          x={startX + width / 2}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          PULSE AGITATOR
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 8. LOGGING / MEMORY SUB (CCL & Gamma Ray Tool)
  // --------------------------------------------------------------------------
  if (seg.type === 'logging') {
    const topY = centerY - radiusPx;

    return (
      <g className="tool-logging">
        <rect
          x={startX}
          y={topY}
          width={width}
          height={radiusPx * 2}
          fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          rx="1"
        />

        {/* Dual Telemetry Copper Induction Coils */}
        {[0.25, 0.75].map((frac, idx) => {
          const coilX = startX + width * frac - 10;
          return (
            <g key={`coil-${idx}`}>
              <rect
                x={coilX}
                y={topY - 1.5}
                width="20"
                height={radiusPx * 2 + 3}
                fill="url(#copperCoilGrad)"
                stroke="#7c2d12"
                strokeWidth="1"
                rx="1"
              />
              {/* Copper winding grooves */}
              {[-6, -2, 2, 6].map((wx, w) => (
                <line
                  key={`cw-${w}`}
                  x1={coilX + 10 + wx}
                  y1={topY - 1}
                  x2={coilX + 10 + wx}
                  y2={topY + radiusPx * 2 + 2}
                  stroke="#431407"
                  strokeWidth="0.8"
                />
              ))}
            </g>
          );
        })}

        {/* Center Detector Crystal Window */}
        <rect
          x={startX + width * 0.5 - 6}
          y={topY + 3}
          width="12"
          height={radiusPx * 2 - 6}
          fill="#0284c7"
          stroke="#38bdf8"
          strokeWidth="1"
          opacity="0.8"
          rx="1"
        />

        <text
          x={startX + width / 2}
          y={centerY + 3}
          fill="#ffffff"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          CCL / GAMMA
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 9. PDC DRILL BIT / JUNK MILL / JETTING NOZZLE (nozzle_bit)
  // --------------------------------------------------------------------------
  if (seg.type === 'nozzle_bit') {
    const shankLen = width * 0.4;
    const crownLen = width * 0.6;
    const shankTopY = centerY - radiusPx * 0.95;
    const crownTipX = startX + width;

    return (
      <g className="tool-pdc-bit">
        {/* Bit Shank with Wrench Flats */}
        <rect
          x={startX}
          y={shankTopY}
          width={shankLen}
          height={radiusPx * 1.9}
          fill="url(#toolSteelGrad)"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        {/* Breaker Wrench Flat Recess */}
        <rect
          x={startX + 6}
          y={shankTopY + 2}
          width={shankLen - 12}
          height={radiusPx * 1.9 - 4}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="0.8"
          rx="1"
        />
        <text
          x={startX + shankLen / 2}
          y={centerY - radiusPx * 0.95 - 4}
          fill="#64748b"
          fontSize="5.5"
          textAnchor="middle"
        >
          BREAKER FLATS
        </text>

        {/* Tapered Stepped PDC Crown / Mill Head */}
        <path
          d={`
            M ${startX + shankLen} ${centerY - radiusPx}
            L ${crownTipX - 8} ${centerY - radiusPx * 1.05}
            L ${crownTipX} ${centerY - radiusPx * 0.65}
            L ${crownTipX} ${centerY + radiusPx * 0.65}
            L ${crownTipX - 8} ${centerY + radiusPx * 1.05}
            L ${startX + shankLen} ${centerY + radiusPx}
            Z
          `}
          fill="url(#steelHatch)"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Hardfacing Matrix / Junk Slot Watercourses */}
        <path
          d={`
            M ${startX + shankLen + 4} ${centerY - radiusPx * 0.8}
            Q ${crownTipX - 10} ${centerY - radiusPx * 0.3} ${crownTipX - 2} ${centerY - radiusPx * 0.1}
            M ${startX + shankLen + 4} ${centerY + radiusPx * 0.8}
            Q ${crownTipX - 10} ${centerY + radiusPx * 0.3} ${crownTipX - 2} ${centerY + radiusPx * 0.1}
          `}
          stroke="#10b981"
          strokeWidth="2.5"
          fill="none"
        />

        {/* INDIVIDUAL ROUND PDC CUTTER TEETH (Diamond Facers) */}
        {/* Top Blade Cutters */}
        {[0.2, 0.45, 0.7, 0.92].map((frac, cIdx) => {
          const cutterX = startX + shankLen + (crownLen - 8) * frac;
          const cutterY = centerY - radiusPx * (0.98 - frac * 0.35);
          return (
            <g key={`top-pdc-${cIdx}`}>
              {/* Tungsten carbide stud cylinder base */}
              <circle cx={cutterX} cy={cutterY} r="3.2" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
              {/* Jet black polycrystalline diamond compact (PDC) face */}
              <circle cx={cutterX + 0.8} cy={cutterY} r="2.2" fill="#020617" />
            </g>
          );
        })}

        {/* Bottom Blade Cutters */}
        {[0.2, 0.45, 0.7, 0.92].map((frac, cIdx) => {
          const cutterX = startX + shankLen + (crownLen - 8) * frac;
          const cutterY = centerY + radiusPx * (0.98 - frac * 0.35);
          return (
            <g key={`bot-pdc-${cIdx}`}>
              <circle cx={cutterX} cy={cutterY} r="3.2" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
              <circle cx={cutterX + 0.8} cy={cutterY} r="2.2" fill="#020617" />
            </g>
          );
        })}

        {/* Jet Nozzles (Brass Body Orifices on Bit Face) */}
        {[-0.35, 0, 0.35].map((offset, nIdx) => (
          <g key={`noz-${nIdx}`}>
            <rect
              x={crownTipX - 4}
              y={centerY + radiusPx * 0.65 * offset - 2.5}
              width="4"
              height="5"
              fill="url(#brassGrad)"
              stroke="#854d0e"
              strokeWidth="0.8"
            />
            {/* Dark nozzle discharge orifice */}
            <circle cx={crownTipX - 1} cy={centerY + radiusPx * 0.65 * offset} r="1.5" fill="#020617" />
          </g>
        ))}

        <text
          x={startX + shankLen + crownLen * 0.45}
          y={centerY + 3}
          fill="#10b981"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
        >
          PDC BIT
        </text>
      </g>
    );
  }

  // --------------------------------------------------------------------------
  // 10. STANDARD TUBULAR SUB / CUSTOM TOOL
  // --------------------------------------------------------------------------
  const topY = centerY - radiusPx;
  const botY = centerY + radiusPx;

  return (
    <g className="tool-standard-sub">
      <rect
        x={startX}
        y={topY}
        width={width}
        height={radiusPx * 2}
        fill={viewMode === 'cutaway' ? 'url(#steelHatch)' : 'url(#toolSteelGrad)'}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rx="2"
      />

      {/* Makeup Thread Shoulder Rings */}
      <rect
        x={startX + 2}
        y={topY - 1.5}
        width="10"
        height={radiusPx * 2 + 3}
        fill="url(#chromeMandrelGrad)"
        stroke="#475569"
        strokeWidth="1"
        rx="1"
      />
      <rect
        x={startX + width - 12}
        y={topY - 1.5}
        width="10"
        height={radiusPx * 2 + 3}
        fill="url(#chromeMandrelGrad)"
        stroke="#475569"
        strokeWidth="1"
        rx="1"
      />

      {/* Cutaway Internal Flow Passage */}
      {viewMode === 'cutaway' && (
        <rect
          x={startX}
          y={centerY - innerRadiusPx}
          width={width}
          height={innerRadiusPx * 2}
          fill="url(#flowInternalGrad)"
        />
      )}

      <text
        x={startX + width / 2}
        y={centerY + 3}
        fill="#ffffff"
        fontSize="7.5"
        fontWeight="bold"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {seg.name.toUpperCase()}
      </text>
    </g>
  );
}
