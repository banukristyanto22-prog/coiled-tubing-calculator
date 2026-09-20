import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Layers,
  Droplets,
  Scissors,
  RefreshCw,
  Info,
  Wrench,
  Boxes,
  Ruler
} from 'lucide-react';
import { BhaConfiguration, BhaSegment, CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { TOOL_TYPE_DEFAULTS } from '../data/bhaPresets';

interface BhaAssembly3DViewerProps {
  bhaConfig: BhaConfiguration;
  ct: CoiledTubingString;
  casingInnerDiameterIn: number;
  fluidDensityPpg: number;
  unitSystem: UnitSystem;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
  className?: string;
}

export const BhaAssembly3DViewer: React.FC<BhaAssembly3DViewerProps> = ({
  bhaConfig,
  ct,
  casingInnerDiameterIn,
  fluidDensityPpg,
  unitSystem,
  selectedSegmentId,
  onSelectSegment,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction & View Settings
  const [explodedRatio, setExplodedRatio] = useState<number>(0);
  const [isCutaway, setIsCutaway] = useState<boolean>(false);
  const [casingDisplayMode, setCasingDisplayMode] = useState<'transparent' | 'cutaway' | 'wireframe' | 'hidden'>('transparent');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [isFlowActive, setIsFlowActive] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'inspection' | 'truescale'>('inspection');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredSegment, setHoveredSegment] = useState<BhaSegment | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Three.js object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const segmentsGroupRef = useRef<THREE.Group | null>(null);
  const casingGroupRef = useRef<THREE.Group | null>(null);
  const flowParticlesRef = useRef<THREE.Points | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const segmentMeshesMapRef = useRef<Map<string, THREE.Mesh[]>>(new Map());

  const isMetric = unitSystem === 'metric';

  // Diameter scale factor: in inspection mode, outer diameters are scaled 2.5x relative to length for high-detail visibility
  const radialScale = scaleMode === 'inspection' ? 2.5 : 1.0;

  // Unit conversion helper
  const inToMm = useCallback((inches: number) => inches * 25.4, []);
  const ftToM = useCallback((feet: number) => feet * 0.3048, []);

  // Compute total length and max OD for camera framing
  const { totalLengthFt, maxOdIn } = useMemo(() => {
    let len = 0;
    let maxOd = ct.outerDiameterIn;
    for (const s of bhaConfig.segments) {
      len += Math.max(0.1, s.lengthFt);
      if (s.outerDiameterIn > maxOd) maxOd = s.outerDiameterIn;
    }
    return {
      totalLengthFt: Math.max(2, len),
      maxOdIn: Math.max(1.5, maxOd)
    };
  }, [bhaConfig.segments, ct.outerDiameterIn]);

  // Dimension Overlay Settings & Filter
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [dimensionFilter, setDimensionFilter] = useState<'all' | 'components' | 'joints'>('all');

  // Dimension overlay DOM & SVG references for high-performance direct projection
  const compBadgeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const compLineRefs = useRef<Map<string, SVGLineElement>>(new Map());
  const compDotRefs = useRef<Map<string, SVGCircleElement>>(new Map());

  const jointBadgeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const jointLineRefs = useRef<Map<string, SVGLineElement>>(new Map());
  const jointDotRefs = useRef<Map<string, SVGCircleElement>>(new Map());

  const updateDimensionOverlayRef = useRef<() => void>(() => {});

  // Compute 3D Coordinates and Dimension Callouts for Components & Tool Joints
  const { componentDims, jointDims } = useMemo(() => {
    const ftToUnits = 0.8;
    const inToRadiusUnits = (inches: number) => (inches / 2) * (ftToUnits / 12) * radialScale * 3.2;

    const comps: {
      id: string;
      index: number;
      name: string;
      type: string;
      color: string;
      lengthFt: number;
      outerDiameterIn: number;
      innerDiameterIn: number;
      segCenterX: number;
      outerR: number;
      yOffset: number;
    }[] = [];

    const joints: {
      id: string;
      index: number;
      name: string;
      type: string;
      upperOdIn: number;
      lowerOdIn: number;
      boreIdIn: number;
      cumulativeLengthFt: number;
      jointX: number;
      outerR: number;
      yOffset: number;
    }[] = [];

    let currentX = 0;
    let cumLengthFt = 0;

    // Joint 0: Coiled Tubing to Top BHA Component
    if (bhaConfig.segments.length > 0) {
      const firstSeg = bhaConfig.segments[0];
      const topOuterR = Math.max(inToRadiusUnits(ct.outerDiameterIn), inToRadiusUnits(firstSeg.outerDiameterIn));
      joints.push({
        id: 'joint-ct-top',
        index: 0,
        name: 'CT Connector Joint',
        type: 'Slip/Dimple Grapple × Pin',
        upperOdIn: ct.outerDiameterIn,
        lowerOdIn: firstSeg.outerDiameterIn,
        boreIdIn: Math.min(ct.outerDiameterIn - 2 * ct.wallThicknessIn, firstSeg.innerDiameterIn),
        cumulativeLengthFt: 0,
        jointX: 0,
        outerR: topOuterR,
        yOffset: topOuterR + 1.3
      });
    }

    bhaConfig.segments.forEach((seg, idx) => {
      const segLengthUnits = Math.max(0.5, seg.lengthFt * ftToUnits);
      const outerR = inToRadiusUnits(seg.outerDiameterIn);

      const explodedGap = explodedRatio * 1.8 * idx;
      const segStartX = currentX + explodedGap;
      const segCenterX = segStartX + segLengthUnits / 2;
      const segEndX = segStartX + segLengthUnits;

      // Stagger vertical height in 3D for components to avoid overlapping callouts
      const compYOffset = outerR + (idx % 2 === 0 ? 1.4 : 2.5);

      comps.push({
        id: seg.id,
        index: idx + 1,
        name: seg.name,
        type: seg.type,
        color: seg.color || TOOL_TYPE_DEFAULTS[seg.type]?.color || '#0ea5e9',
        lengthFt: seg.lengthFt,
        outerDiameterIn: seg.outerDiameterIn,
        innerDiameterIn: seg.innerDiameterIn,
        segCenterX,
        outerR,
        yOffset: compYOffset
      });

      cumLengthFt += seg.lengthFt;

      // Joint between this segment and next segment
      if (idx < bhaConfig.segments.length - 1) {
        const nextSeg = bhaConfig.segments[idx + 1];
        const nextExplodedGap = explodedRatio * 1.8 * (idx + 1);
        const nextStartX = currentX + segLengthUnits + nextExplodedGap;
        const jointX = (segEndX + nextStartX) / 2;
        const jointOuterR = Math.max(outerR, inToRadiusUnits(nextSeg.outerDiameterIn));
        const jointYOffset = jointOuterR + ((idx + 1) % 2 === 0 ? 1.4 : 2.3);

        joints.push({
          id: `joint-${seg.id}-${nextSeg.id}`,
          index: idx + 1,
          name: `Joint #${idx + 1}`,
          type: 'API Reg / PAC Pin × Box',
          upperOdIn: seg.outerDiameterIn,
          lowerOdIn: nextSeg.outerDiameterIn,
          boreIdIn: Math.min(seg.innerDiameterIn, nextSeg.innerDiameterIn),
          cumulativeLengthFt: cumLengthFt,
          jointX,
          outerR: jointOuterR,
          yOffset: jointYOffset
        });
      } else {
        // Bottom termination (Bit Face / Nozzle Discharge)
        const jointOuterR = outerR;
        const jointYOffset = jointOuterR + 1.4;
        joints.push({
          id: `joint-bottom-bit`,
          index: idx + 1,
          name: 'Bit Face',
          type: 'Jet Nozzle Discharge',
          upperOdIn: seg.outerDiameterIn,
          lowerOdIn: seg.outerDiameterIn,
          boreIdIn: seg.innerDiameterIn,
          cumulativeLengthFt: cumLengthFt,
          jointX: segEndX,
          outerR: jointOuterR,
          yOffset: jointYOffset
        });
      }

      currentX += segLengthUnits;
    });

    return { componentDims: comps, jointDims: joints };
  }, [bhaConfig.segments, ct, explodedRatio, radialScale]);

  // Setup Three.js Scene, Camera, Renderer, Controls
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 2;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // Lighting setup
    // 1. Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // 2. Main Key Light (Directional)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(15, 25, 20);
    scene.add(keyLight);

    // 3. Fill Light (Opposite side)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    fillLight.position.set(-15, -10, -15);
    scene.add(fillLight);

    // 4. Subtle Top Blue/Cyan Downhole Glow
    const downholeGlow = new THREE.DirectionalLight(0x06b6d4, 0.5);
    downholeGlow.position.set(0, 30, 0);
    scene.add(downholeGlow);

    // Ground shadow receiver grid
    const gridHelper = new THREE.GridHelper(60, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // Assembly Groups
    const segmentsGroup = new THREE.Group();
    scene.add(segmentsGroup);
    segmentsGroupRef.current = segmentsGroup;

    const casingGroup = new THREE.Group();
    scene.add(casingGroup);
    casingGroupRef.current = casingGroup;

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newW = entry.contentRect.width;
      const newH = entry.contentRect.height;
      if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = newW / newH;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Clean up
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update Camera Framing when total length or radial scale changes
  const resetCamera = useCallback((viewType: 'isometric' | 'side' | 'top' | 'bit' = 'isometric') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Center target on assembly midpoint
    const midX = (totalLengthFt * 0.5) * 0.8;
    controls.target.set(midX, 0, 0);

    const dist = Math.max(12, totalLengthFt * 1.05);

    if (viewType === 'isometric') {
      camera.position.set(midX + dist * 0.45, dist * 0.35, dist * 0.65);
    } else if (viewType === 'side') {
      camera.position.set(midX, 0.5, dist * 0.85);
    } else if (viewType === 'top') {
      camera.position.set(midX, dist * 0.9, 0.1);
    } else if (viewType === 'bit') {
      const bitTipX = totalLengthFt * 0.8 + 2;
      camera.position.set(bitTipX + 8, 3, 5);
      controls.target.set(bitTipX, 0, 0);
    }

    camera.lookAt(controls.target);
    controls.update();
  }, [totalLengthFt]);

  // Initial camera orientation
  useEffect(() => {
    resetCamera('isometric');
  }, [resetCamera]);

  // Construct 3D Segment Meshes & Casing
  useEffect(() => {
    const scene = sceneRef.current;
    const segmentsGroup = segmentsGroupRef.current;
    const casingGroup = casingGroupRef.current;
    if (!scene || !segmentsGroup || !casingGroup) return;

    // Clear previous segment meshes
    while (segmentsGroup.children.length > 0) {
      const obj = segmentsGroup.children[0];
      segmentsGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    // Clear casing group
    while (casingGroup.children.length > 0) {
      const obj = casingGroup.children[0];
      casingGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    segmentMeshesMapRef.current.clear();

    // Clipping plane for Cutaway Mode (cuts away half the tubular bore to reveal internal ID)
    const clipPlanes: THREE.Plane[] = isCutaway
      ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]
      : [];

    const ftToUnits = 0.8;
    const inToRadiusUnits = (inches: number) => (inches / 2) * (ftToUnits / 12) * radialScale * 3.2;

    const segments = bhaConfig.segments;
    const totalCount = segments.length;
    let currentX = 0;

    // 1. Coiled Tubing Lead-in (Left side of assembly)
    const ctLengthUnits = 4.0;
    const ctRadius = inToRadiusUnits(ct.outerDiameterIn);

    const ctGeo = new THREE.CylinderGeometry(
      ctRadius,
      ctRadius,
      ctLengthUnits,
      32,
      1,
      false,
      0,
      isCutaway ? Math.PI : Math.PI * 2
    );
    ctGeo.rotateZ(Math.PI / 2);
    ctGeo.translate(-ctLengthUnits / 2, 0, 0);

    const ctMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.65,
      roughness: 0.28,
      clippingPlanes: clipPlanes,
      clipShadows: true,
      side: THREE.DoubleSide
    });
    const ctMesh = new THREE.Mesh(ctGeo, ctMat);
    ctMesh.castShadow = true;
    ctMesh.receiveShadow = true;
    segmentsGroup.add(ctMesh);

    // Coiled tubing connector indicator band
    const ctStripeGeo = new THREE.CylinderGeometry(
      ctRadius * 1.02,
      ctRadius * 1.02,
      0.35,
      32,
      1,
      false,
      0,
      isCutaway ? Math.PI : Math.PI * 2
    );
    ctStripeGeo.rotateZ(Math.PI / 2);
    ctStripeGeo.translate(-1.0, 0, 0);
    const ctStripeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      clippingPlanes: clipPlanes,
      side: THREE.DoubleSide
    });
    const ctStripe = new THREE.Mesh(ctStripeGeo, ctStripeMat);
    segmentsGroup.add(ctStripe);

    // 2. Iterate and build each BHA segment
    segments.forEach((seg, index) => {
      const segLengthUnits = Math.max(0.5, seg.lengthFt * ftToUnits);
      const outerR = inToRadiusUnits(seg.outerDiameterIn);
      const innerR = inToRadiusUnits(Math.min(seg.outerDiameterIn - 0.1, Math.max(0, seg.innerDiameterIn)));

      // Calculate exploded offset along X axis
      const explodedGap = explodedRatio * 1.8 * index;
      const segStartX = currentX + explodedGap;
      const segCenterX = segStartX + segLengthUnits / 2;

      const segMeshes: THREE.Mesh[] = [];
      const baseColor = new THREE.Color(seg.color || TOOL_TYPE_DEFAULTS[seg.type]?.color || '#0ea5e9');
      const isSelected = selectedSegmentId === seg.id;

      // Materials
      const mainMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.72,
        roughness: 0.25,
        clippingPlanes: clipPlanes,
        clipShadows: true,
        side: THREE.DoubleSide,
        emissive: isSelected ? baseColor : new THREE.Color(0x000000),
        emissiveIntensity: isSelected ? 0.45 : 0.0
      });

      const collarMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.88,
        roughness: 0.18,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const darkSteelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.9,
        roughness: 0.4,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      // Specialized Materials for Realistic Oilfield Tools
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.95,
        roughness: 0.08,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xeab308,
        metalness: 0.85,
        roughness: 0.22,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const copperMat = new THREE.MeshStandardMaterial({
        color: 0xc2410c,
        metalness: 0.9,
        roughness: 0.28,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const diamondPdcMat = new THREE.MeshStandardMaterial({
        color: 0x020617,
        metalness: 0.95,
        roughness: 0.04,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const carbideMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.88,
        roughness: 0.3,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      const flapperMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.82,
        roughness: 0.26,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide
      });

      // Specific 3D styling based on tool type
      if (seg.type === 'connector') {
        // Coiled Tubing Connector: Tapered slip bowl + dual rows of radial dimple set-screws + makeup box collar
        const slipNeckLen = segLengthUnits * 0.35;
        const bodyLen = segLengthUnits * 0.65;

        // 1. Tapered slip bowl sleeve
        const slipGeo = new THREE.CylinderGeometry(
          outerR,
          outerR * 0.88,
          slipNeckLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        slipGeo.rotateZ(Math.PI / 2);
        slipGeo.translate(segStartX + slipNeckLen / 2, 0, 0);
        const slipMesh = new THREE.Mesh(slipGeo, mainMat);
        slipMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(slipMesh);
        segMeshes.push(slipMesh);

        // 2. Main cylindrical body barrel
        const bodyGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          bodyLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        bodyGeo.rotateZ(Math.PI / 2);
        bodyGeo.translate(segStartX + slipNeckLen + bodyLen / 2, 0, 0);
        const bodyMesh = new THREE.Mesh(bodyGeo, mainMat);
        bodyMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(bodyMesh);
        segMeshes.push(bodyMesh);

        // 3. Radial Dimple Set Screw Pockets (2 axial rows of 6 radial hex set screws)
        const rowOffsets = [slipNeckLen + bodyLen * 0.25, slipNeckLen + bodyLen * 0.65];
        const screwsPerRow = 6;
        rowOffsets.forEach((rx) => {
          for (let s = 0; s < screwsPerRow; s++) {
            const angle = (s * Math.PI * 2) / screwsPerRow;
            if (isCutaway && angle > Math.PI) continue;

            // Counterbored dimple pocket
            const socketGeo = new THREE.CylinderGeometry(outerR * 0.12, outerR * 0.12, outerR * 0.12, 12);
            socketGeo.rotateZ(Math.PI / 2);
            socketGeo.rotateX(angle);
            socketGeo.translate(
              segStartX + rx,
              Math.sin(angle) * (outerR * 0.96),
              Math.cos(angle) * (outerR * 0.96)
            );
            const socketMesh = new THREE.Mesh(socketGeo, darkSteelMat);
            socketMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(socketMesh);
            segMeshes.push(socketMesh);

            // Hex set-screw head
            const screwHeadGeo = new THREE.CylinderGeometry(outerR * 0.07, outerR * 0.07, outerR * 0.13, 6);
            screwHeadGeo.rotateZ(Math.PI / 2);
            screwHeadGeo.rotateX(angle);
            screwHeadGeo.translate(
              segStartX + rx,
              Math.sin(angle) * (outerR * 0.94),
              Math.cos(angle) * (outerR * 0.94)
            );
            const screwHeadMesh = new THREE.Mesh(screwHeadGeo, chromeMat);
            screwHeadMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(screwHeadMesh);
            segMeshes.push(screwHeadMesh);
          }
        });

        // 4. Downstream box connection collar
        const boxCollarLen = segLengthUnits * 0.16;
        const boxGeo = new THREE.CylinderGeometry(
          outerR * 1.04,
          outerR * 1.04,
          boxCollarLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        boxGeo.rotateZ(Math.PI / 2);
        boxGeo.translate(segStartX + segLengthUnits - boxCollarLen / 2, 0, 0);
        const boxMesh = new THREE.Mesh(boxGeo, collarMat);
        boxMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(boxMesh);
        segMeshes.push(boxMesh);
      } else if (seg.type === 'valve') {
        // Dual Flapper Check Valve: Body barrel + center joint collar + internal hinged flapper plates
        const mainGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // Center Cartridge Joint Collar
        const flapperJointGeo = new THREE.CylinderGeometry(
          outerR * 1.05,
          outerR * 1.05,
          segLengthUnits * 0.18,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        flapperJointGeo.rotateZ(Math.PI / 2);
        flapperJointGeo.translate(segCenterX, 0, 0);
        const flapperJointMesh = new THREE.Mesh(flapperJointGeo, collarMat);
        flapperJointMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(flapperJointMesh);
        segMeshes.push(flapperJointMesh);

        // Dual Internal Spring-Loaded Flapper Plates
        const flapperPositions = [segLengthUnits * 0.35, segLengthUnits * 0.72];
        flapperPositions.forEach((fx) => {
          // Hinge pin knuckle
          const hingeGeo = new THREE.CylinderGeometry(innerR * 0.18, innerR * 0.18, innerR * 0.75, 12);
          hingeGeo.translate(segStartX + fx, innerR * 0.65, 0);
          const hingeMesh = new THREE.Mesh(hingeGeo, darkSteelMat);
          hingeMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(hingeMesh);
          segMeshes.push(hingeMesh);

          // Angled flapper disc (45 deg downstream)
          const flapGeo = new THREE.CylinderGeometry(innerR * 0.85, innerR * 0.85, innerR * 0.16, 24);
          flapGeo.rotateZ(Math.PI / 4);
          flapGeo.translate(segStartX + fx + innerR * 0.3, 0, 0);
          const flapMesh = new THREE.Mesh(flapGeo, flapperMat);
          flapMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(flapMesh);
          segMeshes.push(flapMesh);
        });

        // Directional Flow Bands on Outer Body
        [-0.25, 0.25].forEach((offset) => {
          const flowBandGeo = new THREE.TorusGeometry(outerR * 1.01, outerR * 0.025, 8, 32);
          flowBandGeo.rotateY(Math.PI / 2);
          flowBandGeo.translate(segCenterX + offset * segLengthUnits, 0, 0);
          const flowBandMesh = new THREE.Mesh(flowBandGeo, collarMat);
          flowBandMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(flowBandMesh);
          segMeshes.push(flowBandMesh);
        });
      } else if (seg.type === 'jar') {
        // Hydraulic Drilling Jar: Polished chrome sliding mandrel with torque splines + heavy detent cylinder + anvil shoulder
        const outerHousingLen = segLengthUnits * 0.62;
        const mandrelLen = segLengthUnits * 0.38;

        // 1. Telescoping High-Mirror Chrome Sliding Mandrel
        const mandrelGeo = new THREE.CylinderGeometry(
          outerR * 0.82,
          outerR * 0.82,
          mandrelLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mandrelGeo.rotateZ(Math.PI / 2);
        mandrelGeo.translate(segStartX + mandrelLen / 2, 0, 0);
        const mandrelMesh = new THREE.Mesh(mandrelGeo, chromeMat);
        mandrelMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mandrelMesh);
        segMeshes.push(mandrelMesh);

        // 2. Splined Drive Flutes (6 Longitudinal Torque Splines)
        const splineCount = 6;
        for (let sp = 0; sp < splineCount; sp++) {
          const spAngle = (sp * Math.PI * 2) / splineCount;
          if (isCutaway && spAngle > Math.PI) continue;
          const splineGeo = new THREE.BoxGeometry(mandrelLen * 0.85, outerR * 0.08, outerR * 0.08);
          splineGeo.translate(
            segStartX + mandrelLen * 0.45,
            Math.sin(spAngle) * (outerR * 0.83),
            Math.cos(spAngle) * (outerR * 0.83)
          );
          splineGeo.rotateX(spAngle);
          const splineMesh = new THREE.Mesh(splineGeo, darkSteelMat);
          splineMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(splineMesh);
          segMeshes.push(splineMesh);
        }

        // 3. Forged Impact Anvil Stop Shoulder
        const anvilCollarLen = Math.min(0.8, segLengthUnits * 0.1);
        const anvilGeo = new THREE.CylinderGeometry(
          outerR * 1.07,
          outerR * 1.07,
          anvilCollarLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        anvilGeo.rotateZ(Math.PI / 2);
        anvilGeo.translate(segStartX + mandrelLen + anvilCollarLen / 2, 0, 0);
        const anvilMesh = new THREE.Mesh(anvilGeo, darkSteelMat);
        anvilMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(anvilMesh);
        segMeshes.push(anvilMesh);

        // 4. Outer Hydraulic Detent Cylinder Housing
        const housingGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          outerHousingLen - anvilCollarLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        housingGeo.rotateZ(Math.PI / 2);
        housingGeo.translate(segStartX + mandrelLen + anvilCollarLen + (outerHousingLen - anvilCollarLen) / 2, 0, 0);
        const housingMesh = new THREE.Mesh(housingGeo, mainMat);
        housingMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(housingMesh);
        segMeshes.push(housingMesh);
      } else if (seg.type === 'motor') {
        // Positive Displacement Motor (PDM): Helical power section + bent housing with graduation dial + lower bearing drive
        const statorLen = segLengthUnits * 0.55;
        const bentSubLen = segLengthUnits * 0.15;
        const bearingLen = segLengthUnits * 0.3;

        // 1. Stator Power Section
        const statorGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          statorLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        statorGeo.rotateZ(Math.PI / 2);
        statorGeo.translate(segStartX + statorLen / 2, 0, 0);
        const statorMesh = new THREE.Mesh(statorGeo, mainMat);
        statorMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(statorMesh);
        segMeshes.push(statorMesh);

        // Helical Lobes / Spiral Flutes on Stator Body
        const lobeCount = 4;
        for (let lb = 0; lb < lobeCount; lb++) {
          const lbAngle = (lb * Math.PI * 2) / lobeCount;
          if (isCutaway && lbAngle > Math.PI) continue;
          const lobeGeo = new THREE.TorusGeometry(outerR * 0.99, outerR * 0.04, 8, 32);
          lobeGeo.rotateY(Math.PI / 2);
          lobeGeo.rotateX(lbAngle);
          lobeGeo.translate(segStartX + statorLen * (0.25 + lb * 0.18), 0, 0);
          const lobeMesh = new THREE.Mesh(lobeGeo, collarMat);
          lobeMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(lobeMesh);
          segMeshes.push(lobeMesh);
        }

        // 2. Bent Housing Collar with 1.5 deg Angle Indicator Dial
        const bentGeo = new THREE.CylinderGeometry(
          outerR * 1.07,
          outerR * 1.07,
          bentSubLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        bentGeo.rotateZ(Math.PI / 2);
        bentGeo.translate(segStartX + statorLen + bentSubLen / 2, 0, 0);
        const bentMat = new THREE.MeshStandardMaterial({
          color: 0xdb2777,
          metalness: 0.85,
          roughness: 0.2,
          clippingPlanes: clipPlanes,
          side: THREE.DoubleSide
        });
        const bentMesh = new THREE.Mesh(bentGeo, bentMat);
        bentMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(bentMesh);
        segMeshes.push(bentMesh);

        // 3. Lower Bearing Drive Sub with Chrome Rotating Section
        const bearingGeo = new THREE.CylinderGeometry(
          outerR * 0.96,
          outerR * 0.94,
          bearingLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        bearingGeo.rotateZ(Math.PI / 2);
        bearingGeo.translate(segStartX + statorLen + bentSubLen + bearingLen / 2, 0, 0);
        const bearingMesh = new THREE.Mesh(bearingGeo, chromeMat);
        bearingMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(bearingMesh);
        segMeshes.push(bearingMesh);
      } else if (seg.type === 'collar') {
        // Heavy Weight Drill Collars: Thick wall cylinder + elevator handling neck recess + spiral stabilizer ribs
        const mainGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // Elevator Handling Neck / Slip Recess Groove (Classic Necked-down section)
        const recessLen = Math.min(0.8, segLengthUnits * 0.18);
        const recessGeo = new THREE.CylinderGeometry(
          outerR * 0.86,
          outerR * 0.86,
          recessLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        recessGeo.rotateZ(Math.PI / 2);
        recessGeo.translate(segStartX + recessLen / 2 + 0.15, 0, 0);
        const recessMesh = new THREE.Mesh(recessGeo, darkSteelMat);
        recessMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(recessMesh);
        segMeshes.push(recessMesh);

        // Spiral Stabilizer Ribs with Tungsten Carbide Wear Buttons
        const ribCount = 3;
        for (let r = 0; r < ribCount; r++) {
          const rAngle = (r * Math.PI * 2) / ribCount;
          if (isCutaway && rAngle > Math.PI) continue;

          const ribGeo = new THREE.BoxGeometry(segLengthUnits * 0.45, outerR * 0.08, outerR * 0.22);
          ribGeo.translate(
            segCenterX + 0.2,
            Math.sin(rAngle) * (outerR * 1.01),
            Math.cos(rAngle) * (outerR * 1.01)
          );
          ribGeo.rotateX(rAngle);
          const ribMat = new THREE.MeshStandardMaterial({
            color: 0xca8a04,
            metalness: 0.9,
            roughness: 0.25,
            clippingPlanes: clipPlanes,
            side: THREE.DoubleSide
          });
          const ribMesh = new THREE.Mesh(ribGeo, ribMat);
          ribMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(ribMesh);
          segMeshes.push(ribMesh);
        }
      } else if (seg.type === 'agitator') {
        // Fluid Oscillator / Agitator: Valve housing + excitation pulsation disc rings
        const mainGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // Triple Pulsation Housing Rings
        [-0.28, 0, 0.28].forEach((offset) => {
          const oscRingGeo = new THREE.CylinderGeometry(
            outerR * 1.06,
            outerR * 1.06,
            segLengthUnits * 0.14,
            32,
            1,
            false,
            0,
            isCutaway ? Math.PI : Math.PI * 2
          );
          oscRingGeo.rotateZ(Math.PI / 2);
          oscRingGeo.translate(segCenterX + offset * segLengthUnits, 0, 0);
          const oscMat = new THREE.MeshStandardMaterial({
            color: 0xd946ef,
            metalness: 0.85,
            roughness: 0.2,
            clippingPlanes: clipPlanes,
            side: THREE.DoubleSide
          });
          const oscMesh = new THREE.Mesh(oscRingGeo, oscMat);
          oscMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(oscMesh);
          segMeshes.push(oscMesh);
        });
      } else if (seg.type === 'tractor') {
        // Downhole Robotic Tractor: Central motor body + dual expander stations with articulated knurled gripper pads
        const mainGeo = new THREE.CylinderGeometry(
          outerR * 0.85,
          outerR * 0.85,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // 3D Tractor Gripper Stations (Traction contact pads extending toward casing ID)
        const stationCount = 2;
        for (let st = 0; st < stationCount; st++) {
          const stX = segStartX + (st + 1) * (segLengthUnits / (stationCount + 1));
          const padCount = 3;
          for (let p = 0; p < padCount; p++) {
            const pAngle = (p * Math.PI * 2) / padCount;
            if (isCutaway && pAngle > Math.PI) continue;

            // Linkage Arm
            const armGeo = new THREE.BoxGeometry(segLengthUnits * 0.08, outerR * 0.45, outerR * 0.08);
            armGeo.translate(stX, Math.sin(pAngle) * (outerR * 0.95), Math.cos(pAngle) * (outerR * 0.95));
            armGeo.rotateX(pAngle);
            const armMesh = new THREE.Mesh(armGeo, collarMat);
            armMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(armMesh);
            segMeshes.push(armMesh);

            // Serrated Gripper Pad
            const padGeo = new THREE.BoxGeometry(segLengthUnits * 0.22, outerR * 0.18, outerR * 0.28);
            padGeo.translate(stX, Math.sin(pAngle) * (outerR * 1.15), Math.cos(pAngle) * (outerR * 1.15));
            padGeo.rotateX(pAngle);
            const padMat = new THREE.MeshStandardMaterial({
              color: 0xa855f7,
              metalness: 0.92,
              roughness: 0.22,
              clippingPlanes: clipPlanes,
              side: THREE.DoubleSide
            });
            const padMesh = new THREE.Mesh(padGeo, padMat);
            padMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(padMesh);
            segMeshes.push(padMesh);
          }
        }
      } else if (seg.type === 'logging') {
        // CCL & Gamma Ray Logging Sub: Sensor housing with copper induction coils & crystal window
        const mainGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // Dual Telemetry Copper Coil Windings
        [-0.26, 0.26].forEach((offset) => {
          const coilGeo = new THREE.CylinderGeometry(
            outerR * 1.03,
            outerR * 1.03,
            segLengthUnits * 0.16,
            32,
            1,
            false,
            0,
            isCutaway ? Math.PI : Math.PI * 2
          );
          coilGeo.rotateZ(Math.PI / 2);
          coilGeo.translate(segCenterX + offset * segLengthUnits, 0, 0);
          const coilMesh = new THREE.Mesh(coilGeo, copperMat);
          coilMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(coilMesh);
          segMeshes.push(coilMesh);
        });

        // Center Translucent Sensor Crystal Window
        const windowGeo = new THREE.CylinderGeometry(
          outerR * 1.01,
          outerR * 1.01,
          segLengthUnits * 0.1,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        windowGeo.rotateZ(Math.PI / 2);
        windowGeo.translate(segCenterX, 0, 0);
        const windowMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.6,
          roughness: 0.1,
          transparent: true,
          opacity: 0.75,
          clippingPlanes: clipPlanes,
          side: THREE.DoubleSide
        });
        const windowMesh = new THREE.Mesh(windowGeo, windowMat);
        windowMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(windowMesh);
        segMeshes.push(windowMesh);
      } else if (seg.type === 'nozzle_bit') {
        // High-Fidelity PDC Drill Bit / Step Junk Mill:
        // 1. Bit Shank with Wrench Breaker Flats
        // 2. Tapered Bit Crown with 4 Spiral Blades
        // 3. Individual PDC Cutter Teeth (Tungsten Carbide Base + Jet-Black Diamond Face)
        // 4. Brass Jet Nozzles with Hollow Flow Passages
        const shankLen = segLengthUnits * 0.4;
        const crownLen = segLengthUnits * 0.6;

        // 1. Bit Shank (Thread Box)
        const shankGeo = new THREE.CylinderGeometry(
          outerR * 0.95,
          outerR * 0.95,
          shankLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        shankGeo.rotateZ(Math.PI / 2);
        shankGeo.translate(segStartX + shankLen / 2, 0, 0);
        const shankMesh = new THREE.Mesh(shankGeo, collarMat);
        shankMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(shankMesh);
        segMeshes.push(shankMesh);

        // Breaker Wrench Flats (Opposing flat slots on shank)
        const flatGeo = new THREE.BoxGeometry(shankLen * 0.7, outerR * 1.85, outerR * 0.2);
        flatGeo.translate(segStartX + shankLen / 2, 0, 0);
        const flatMesh = new THREE.Mesh(flatGeo, darkSteelMat);
        flatMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(flatMesh);
        segMeshes.push(flatMesh);

        // 2. Tapered Bit Crown Body
        const crownGeo = new THREE.CylinderGeometry(
          outerR * 1.06,
          outerR * 0.62,
          crownLen,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        crownGeo.rotateZ(Math.PI / 2);
        crownGeo.translate(segStartX + shankLen + crownLen / 2, 0, 0);
        const crownMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          metalness: 0.88,
          roughness: 0.3,
          clippingPlanes: clipPlanes,
          side: THREE.DoubleSide
        });
        const crownMesh = new THREE.Mesh(crownGeo, crownMat);
        crownMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(crownMesh);
        segMeshes.push(crownMesh);

        // 3. 4 Spiral Blades radiating around the crown
        const bladeCount = 4;
        for (let b = 0; b < bladeCount; b++) {
          const bAngle = (b * Math.PI * 2) / bladeCount;
          if (isCutaway && bAngle > Math.PI) continue;

          // Blade ridge
          const bladeGeo = new THREE.BoxGeometry(crownLen * 0.88, outerR * 0.16, outerR * 0.28);
          bladeGeo.translate(
            segStartX + shankLen + crownLen * 0.45,
            Math.sin(bAngle) * (outerR * 0.95),
            Math.cos(bAngle) * (outerR * 0.95)
          );
          bladeGeo.rotateX(bAngle);
          const bladeMesh = new THREE.Mesh(bladeGeo, carbideMat);
          bladeMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(bladeMesh);
          segMeshes.push(bladeMesh);

          // Individual PDC Cutters along each blade (3 cutters per blade)
          const cuttersPerBlade = 3;
          for (let c = 0; c < cuttersPerBlade; c++) {
            const cFrac = (c + 1) / (cuttersPerBlade + 1);
            const cX = segStartX + shankLen + crownLen * cFrac;
            const cR = outerR * (1.02 - cFrac * 0.28);

            // Carbide Stud Cylinder
            const studGeo = new THREE.CylinderGeometry(outerR * 0.08, outerR * 0.08, outerR * 0.12, 16);
            studGeo.rotateZ(Math.PI / 2);
            studGeo.rotateX(bAngle);
            studGeo.translate(cX, Math.sin(bAngle) * cR, Math.cos(bAngle) * cR);
            const studMesh = new THREE.Mesh(studGeo, carbideMat);
            studMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(studMesh);
            segMeshes.push(studMesh);

            // Jet-Black Diamond PDC Cutting Face Disc
            const diamondGeo = new THREE.CylinderGeometry(outerR * 0.075, outerR * 0.075, outerR * 0.04, 16);
            diamondGeo.rotateZ(Math.PI / 2);
            diamondGeo.rotateX(bAngle);
            diamondGeo.translate(cX + outerR * 0.05, Math.sin(bAngle) * cR, Math.cos(bAngle) * cR);
            const diamondMesh = new THREE.Mesh(diamondGeo, diamondPdcMat);
            diamondMesh.userData = { segmentId: seg.id };
            segmentsGroup.add(diamondMesh);
            segMeshes.push(diamondMesh);
          }
        }

        // 4. Front Jet Nozzles (Brass Body with Hollow Orifices)
        const tipX = segStartX + segLengthUnits;
        const nozzleCount = 3;
        for (let n = 0; n < nozzleCount; n++) {
          const nAngle = (n * Math.PI * 2) / nozzleCount;
          if (isCutaway && nAngle > Math.PI) continue;

          // Brass Nozzle Body
          const nozGeo = new THREE.CylinderGeometry(outerR * 0.14, outerR * 0.14, 0.28, 16);
          nozGeo.rotateZ(Math.PI / 2);
          nozGeo.translate(
            tipX - 0.04,
            Math.sin(nAngle) * (outerR * 0.32),
            Math.cos(nAngle) * (outerR * 0.32)
          );
          const nozMesh = new THREE.Mesh(nozGeo, brassMat);
          nozMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(nozMesh);
          segMeshes.push(nozMesh);

          // Center Hollow Orifice
          const orificeGeo = new THREE.CylinderGeometry(outerR * 0.07, outerR * 0.07, 0.3, 12);
          orificeGeo.rotateZ(Math.PI / 2);
          orificeGeo.translate(
            tipX - 0.03,
            Math.sin(nAngle) * (outerR * 0.32),
            Math.cos(nAngle) * (outerR * 0.32)
          );
          const orificeMesh = new THREE.Mesh(orificeGeo, darkSteelMat);
          orificeMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(orificeMesh);
          segMeshes.push(orificeMesh);
        }
      } else {
        // Standard / Custom Tubular Sub with Pin/Box Tool Joints
        const mainGeo = new THREE.CylinderGeometry(
          outerR,
          outerR,
          segLengthUnits,
          32,
          1,
          false,
          0,
          isCutaway ? Math.PI : Math.PI * 2
        );
        mainGeo.rotateZ(Math.PI / 2);
        mainGeo.translate(segCenterX, 0, 0);
        const mainMesh = new THREE.Mesh(mainGeo, mainMat);
        mainMesh.userData = { segmentId: seg.id };
        segmentsGroup.add(mainMesh);
        segMeshes.push(mainMesh);

        // Tool joint shoulder collar rings
        const collarLen = Math.min(0.6, segLengthUnits * 0.16);
        [segStartX + collarLen / 2, segStartX + segLengthUnits - collarLen / 2].forEach((cx) => {
          const collarGeo = new THREE.CylinderGeometry(
            outerR * 1.04,
            outerR * 1.04,
            collarLen,
            32,
            1,
            false,
            0,
            isCutaway ? Math.PI : Math.PI * 2
          );
          collarGeo.rotateZ(Math.PI / 2);
          collarGeo.translate(cx, 0, 0);
          const collarMesh = new THREE.Mesh(collarGeo, collarMat);
          collarMesh.userData = { segmentId: seg.id };
          segmentsGroup.add(collarMesh);
          segMeshes.push(collarMesh);
        });
      }

      // If cutaway is active, add internal ID bore liner in dark steel
      if (isCutaway && innerR > 0.05) {
        const idGeo = new THREE.CylinderGeometry(
          innerR,
          innerR,
          segLengthUnits * 0.98,
          24,
          1,
          true,
          0,
          Math.PI
        );
        idGeo.rotateZ(Math.PI / 2);
        idGeo.translate(segCenterX, 0, 0);
        const idMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.7,
          metalness: 0.3,
          side: THREE.BackSide
        });
        const idMesh = new THREE.Mesh(idGeo, idMat);
        segmentsGroup.add(idMesh);
      }

      segmentMeshesMapRef.current.set(seg.id, segMeshes);
      currentX += segLengthUnits;
    });

    // 3. Surrounding Wellbore Casing (Outer Tube)
    if (casingDisplayMode !== 'hidden') {
      const casingTotalLen = (currentX + (totalCount * explodedRatio * 1.8) + ctLengthUnits + 3);
      const csgRadius = inToRadiusUnits(casingInnerDiameterIn);
      const csgStartX = -ctLengthUnits - 1;
      const csgCenterX = csgStartX + casingTotalLen / 2;

      const csgTheta = casingDisplayMode === 'cutaway' || isCutaway ? Math.PI : Math.PI * 2;
      const csgGeo = new THREE.CylinderGeometry(
        csgRadius,
        csgRadius,
        casingTotalLen,
        48,
        1,
        true,
        0,
        csgTheta
      );
      csgGeo.rotateZ(Math.PI / 2);
      csgGeo.translate(csgCenterX, 0, 0);

      let csgMat: THREE.Material;
      if (casingDisplayMode === 'wireframe') {
        csgMat = new THREE.MeshBasicMaterial({
          color: 0x475569,
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });
      } else {
        csgMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.5,
          roughness: 0.4,
          transparent: true,
          opacity: casingDisplayMode === 'cutaway' ? 0.35 : 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      const csgMesh = new THREE.Mesh(csgGeo, csgMat);
      casingGroup.add(csgMesh);

      // Casing Wall Rings / Collar Couplings
      const ringSpacing = 8;
      const ringCount = Math.floor(casingTotalLen / ringSpacing);
      for (let r = 0; r <= ringCount; r++) {
        const ringX = csgStartX + r * ringSpacing;
        const ringGeo = new THREE.TorusGeometry(csgRadius, 0.04, 8, 48, csgTheta);
        ringGeo.rotateY(Math.PI / 2);
        ringGeo.translate(ringX, 0, 0);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x64748b,
          transparent: true,
          opacity: 0.4
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        casingGroup.add(ringMesh);
      }
    }

    // 4. Fluid Flow Particle System
    if (scene) {
      if (flowParticlesRef.current) {
        scene.remove(flowParticlesRef.current);
        flowParticlesRef.current.geometry.dispose();
        (flowParticlesRef.current.material as THREE.Material).dispose();
        flowParticlesRef.current = null;
      }

      if (isFlowActive) {
        const particleCount = 140;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const totalSpan = currentX + (totalCount * explodedRatio * 1.8);

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() * (totalSpan + ctLengthUnits)) - ctLengthUnits;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
          color: 0x38bdf8,
          size: 0.2,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });

        const flowParticles = new THREE.Points(particleGeo, particleMat);
        scene.add(flowParticles);
        flowParticlesRef.current = flowParticles;
      }
    }
  }, [
    bhaConfig.segments,
    ct,
    casingInnerDiameterIn,
    explodedRatio,
    isCutaway,
    casingDisplayMode,
    scaleMode,
    radialScale,
    selectedSegmentId,
    isFlowActive
  ]);

  // Continuous Animation Loop (Turntable + Fluid Flow Particles)
  useEffect(() => {
    let prevTime = performance.now();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const currTime = performance.now();
      const delta = (currTime - prevTime) / 1000;
      prevTime = currTime;

      // Orbit controls damping
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isAutoRotate;
        controlsRef.current.autoRotateSpeed = 2.0;
        controlsRef.current.update();
      }

      // Animate fluid particles traveling from left (CT) to right (bit)
      if (flowParticlesRef.current && isFlowActive) {
        const positions = flowParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const speed = 12.0 * delta;

        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += speed;
          if (positions[i] > totalLengthFt * 0.8 + 2) {
            positions[i] = -4.0;
          }
        }
        flowParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Update 3D Dimension Overlay positions directly on projected DOM/SVG elements
      updateDimensionOverlayRef.current();
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isAutoRotate, isFlowActive, totalLengthFt]);

  // Update dimension overlay projection calculations on each render
  useEffect(() => {
    updateDimensionOverlayRef.current = () => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera || !showDimensions) {
        if (!showDimensions) {
          compBadgeRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
          compLineRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
          compDotRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
          jointBadgeRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
          jointLineRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
          jointDotRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
        }
        return;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;
      const tempVec = new THREE.Vector3();
      const tempSurface = new THREE.Vector3();

      // 1. Update Component Dimension Badges & Leader Lines
      if (dimensionFilter === 'all' || dimensionFilter === 'components') {
        for (const comp of componentDims) {
          const badgeEl = compBadgeRefs.current.get(comp.id);
          const lineEl = compLineRefs.current.get(comp.id);
          const dotEl = compDotRefs.current.get(comp.id);
          if (!badgeEl) continue;

          tempSurface.set(comp.segCenterX, comp.outerR, 0);
          tempSurface.project(camera);

          tempVec.set(comp.segCenterX, comp.yOffset, 0);
          tempVec.project(camera);

          const isVisible = tempVec.z < 1.0 && tempSurface.z < 1.0;
          const surfaceX = (tempSurface.x * 0.5 + 0.5) * w;
          const surfaceY = (-tempSurface.y * 0.5 + 0.5) * h;
          const labelX = (tempVec.x * 0.5 + 0.5) * w;
          const labelY = (-tempVec.y * 0.5 + 0.5) * h;

          const inBounds = labelX >= -120 && labelX <= w + 120 && labelY >= -120 && labelY <= h + 120;

          if (!isVisible || !inBounds) {
            badgeEl.style.display = 'none';
            if (lineEl) lineEl.style.display = 'none';
            if (dotEl) dotEl.style.display = 'none';
            continue;
          }

          badgeEl.style.display = 'block';
          badgeEl.style.transform = `translate3d(${labelX}px, ${labelY}px, 0) translate(-50%, -100%)`;

          if (lineEl) {
            lineEl.style.display = 'block';
            lineEl.setAttribute('x1', `${surfaceX}`);
            lineEl.setAttribute('y1', `${surfaceY}`);
            lineEl.setAttribute('x2', `${labelX}`);
            lineEl.setAttribute('y2', `${labelY}`);
          }
          if (dotEl) {
            dotEl.style.display = 'block';
            dotEl.setAttribute('cx', `${surfaceX}`);
            dotEl.setAttribute('cy', `${surfaceY}`);
          }
        }
      } else {
        compBadgeRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
        compLineRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
        compDotRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
      }

      // 2. Update Tool Joint Dimension Badges & Leader Lines
      if (dimensionFilter === 'all' || dimensionFilter === 'joints') {
        for (const joint of jointDims) {
          const badgeEl = jointBadgeRefs.current.get(joint.id);
          const lineEl = jointLineRefs.current.get(joint.id);
          const dotEl = jointDotRefs.current.get(joint.id);
          if (!badgeEl) continue;

          tempSurface.set(joint.jointX, -joint.outerR, 0);
          tempSurface.project(camera);

          tempVec.set(joint.jointX, -joint.yOffset, 0);
          tempVec.project(camera);

          const isVisible = tempVec.z < 1.0 && tempSurface.z < 1.0;
          const surfaceX = (tempSurface.x * 0.5 + 0.5) * w;
          const surfaceY = (-tempSurface.y * 0.5 + 0.5) * h;
          const labelX = (tempVec.x * 0.5 + 0.5) * w;
          const labelY = (-tempVec.y * 0.5 + 0.5) * h;

          const inBounds = labelX >= -120 && labelX <= w + 120 && labelY >= -120 && labelY <= h + 120;

          if (!isVisible || !inBounds) {
            badgeEl.style.display = 'none';
            if (lineEl) lineEl.style.display = 'none';
            if (dotEl) dotEl.style.display = 'none';
            continue;
          }

          badgeEl.style.display = 'block';
          badgeEl.style.transform = `translate3d(${labelX}px, ${labelY}px, 0) translate(-50%, 0%)`;

          if (lineEl) {
            lineEl.style.display = 'block';
            lineEl.setAttribute('x1', `${surfaceX}`);
            lineEl.setAttribute('y1', `${surfaceY}`);
            lineEl.setAttribute('x2', `${labelX}`);
            lineEl.setAttribute('y2', `${labelY}`);
          }
          if (dotEl) {
            dotEl.style.display = 'block';
            dotEl.setAttribute('cx', `${surfaceX}`);
            dotEl.setAttribute('cy', `${surfaceY}`);
          }
        }
      } else {
        jointBadgeRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
        jointLineRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
        jointDotRefs.current.forEach((el) => { if (el) el.style.display = 'none'; });
      }
    };
  });

  // Mouse Interaction: Raycasting for Hover & Click on Segments
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!canvas || !camera || !scene) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    let foundSegment: BhaSegment | null = null;
    for (const hit of intersects) {
      const segId = hit.object.userData?.segmentId;
      if (segId) {
        const seg = bhaConfig.segments.find((s) => s.id === segId);
        if (seg) {
          foundSegment = seg;
          break;
        }
      }
    }

    setHoveredSegment(foundSegment);
  };

  const handlePointerLeave = () => {
    setHoveredSegment(null);
  };

  const handleClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!canvas || !camera || !scene) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycasterRef.current.intersectObjects(scene.children, true);

    for (const hit of intersects) {
      const segId = hit.object.userData?.segmentId;
      if (segId && onSelectSegment) {
        onSelectSegment(selectedSegmentId === segId ? null : segId);
        return;
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Standoff clearance calculation
  const radialClearanceIn = Math.max(0.01, (casingInnerDiameterIn - maxOdIn) / 2);
  const isTightClearance = radialClearanceIn < 0.25;
  const isInterference = maxOdIn >= casingInnerDiameterIn;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[500px]'
      } ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* 3D Dimension Labels & Tool Joint Overlay */}
      {showDimensions && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* SVG Leader Lines & Surface Anchor Dots */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Component Leader Lines & Surface Dots */}
            {(dimensionFilter === 'all' || dimensionFilter === 'components') &&
              componentDims.map((comp) => (
                <g key={`svg-comp-${comp.id}`}>
                  <line
                    ref={(el) => {
                      if (el) compLineRefs.current.set(comp.id, el);
                      else compLineRefs.current.delete(comp.id);
                    }}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    strokeOpacity="0.75"
                    style={{ display: 'none' }}
                  />
                  <circle
                    ref={(el) => {
                      if (el) compDotRefs.current.set(comp.id, el);
                      else compDotRefs.current.delete(comp.id);
                    }}
                    cx="0"
                    cy="0"
                    r="3.5"
                    fill="#38bdf8"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    style={{ display: 'none' }}
                  />
                </g>
              ))}

            {/* Tool Joint Leader Lines & Surface Dots */}
            {(dimensionFilter === 'all' || dimensionFilter === 'joints') &&
              jointDims.map((joint) => (
                <g key={`svg-joint-${joint.id}`}>
                  <line
                    ref={(el) => {
                      if (el) jointLineRefs.current.set(joint.id, el);
                      else jointLineRefs.current.delete(joint.id);
                    }}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    strokeOpacity="0.75"
                    style={{ display: 'none' }}
                  />
                  <circle
                    ref={(el) => {
                      if (el) jointDotRefs.current.set(joint.id, el);
                      else jointDotRefs.current.delete(joint.id);
                    }}
                    cx="0"
                    cy="0"
                    r="3"
                    fill="#f59e0b"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    style={{ display: 'none' }}
                  />
                </g>
              ))}
          </svg>

          {/* Component Dimension Callout Badges */}
          {(dimensionFilter === 'all' || dimensionFilter === 'components') &&
            componentDims.map((comp) => {
              const isSelected = selectedSegmentId === comp.id;
              return (
                <div
                  key={`badge-comp-${comp.id}`}
                  ref={(el) => {
                    if (el) compBadgeRefs.current.set(comp.id, el);
                    else compBadgeRefs.current.delete(comp.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSegment?.(comp.id);
                  }}
                  onMouseEnter={() => {
                    const seg = bhaConfig.segments.find((s) => s.id === comp.id);
                    if (seg) setHoveredSegment(seg);
                  }}
                  onMouseLeave={() => setHoveredSegment(null)}
                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                  className={`pointer-events-auto cursor-pointer rounded-lg px-2 py-1.5 backdrop-blur-md shadow-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-500/50 scale-105 z-20'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-400 hover:bg-slate-850 z-10'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800">
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      #{comp.index}
                    </span>
                    <span className="font-semibold text-white text-[11px] truncate max-w-[130px]">
                      {comp.name}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 ml-auto"
                      style={{ backgroundColor: comp.color }}
                    />
                  </div>
                  {/* Dimensions Specs Row */}
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-sans uppercase">OD</span>
                      <span className="font-bold text-amber-300">
                        {isMetric ? `${inToMm(comp.outerDiameterIn).toFixed(1)}mm` : `${comp.outerDiameterIn.toFixed(3)}"`}
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-800" />
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-sans uppercase">ID</span>
                      <span className="font-bold text-cyan-300">
                        {isMetric ? `${inToMm(comp.innerDiameterIn).toFixed(1)}mm` : `${comp.innerDiameterIn.toFixed(3)}"`}
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-800" />
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-sans uppercase">LEN</span>
                      <span className="font-bold text-emerald-300">
                        {isMetric ? `${ftToM(comp.lengthFt).toFixed(2)}m` : `${comp.lengthFt.toFixed(2)}ft`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Tool Joint Dimension Callout Badges */}
          {(dimensionFilter === 'all' || dimensionFilter === 'joints') &&
            jointDims.map((joint) => (
              <div
                key={`badge-joint-${joint.id}`}
                ref={(el) => {
                  if (el) jointBadgeRefs.current.set(joint.id, el);
                  else jointBadgeRefs.current.delete(joint.id);
                }}
                style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                className="pointer-events-auto rounded-lg px-2 py-1.5 backdrop-blur-md shadow-xl border bg-slate-900/90 border-amber-500/40 text-[10px] space-y-1 hover:border-amber-400 hover:bg-slate-850 z-10 transition-all duration-150"
              >
                {/* Joint Header */}
                <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-0.5">
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {joint.index === 0 ? 'CT JNT' : joint.index === bhaConfig.segments.length ? 'BIT' : `JNT #${joint.index}`}
                  </span>
                  <span className="text-slate-300 font-medium text-[10px] truncate max-w-[120px]">
                    {joint.type}
                  </span>
                </div>
                {/* Joint Specs */}
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-sans uppercase">OD</span>
                    <span className="font-bold text-amber-300">
                      {joint.upperOdIn === joint.lowerOdIn
                        ? (isMetric ? `${inToMm(joint.upperOdIn).toFixed(1)}mm` : `${joint.upperOdIn.toFixed(3)}"`)
                        : (isMetric
                            ? `${inToMm(joint.upperOdIn).toFixed(1)}→${inToMm(joint.lowerOdIn).toFixed(1)}mm`
                            : `${joint.upperOdIn.toFixed(3)}→${joint.lowerOdIn.toFixed(3)}"`)
                      }
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-800" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-sans uppercase">BORE</span>
                    <span className="font-bold text-cyan-300">
                      {isMetric ? `${inToMm(joint.boreIdIn).toFixed(1)}mm` : `${joint.boreIdIn.toFixed(3)}"`}
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-800" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-sans uppercase">POS</span>
                    <span className="font-bold text-white">
                      {isMetric ? `+${ftToM(joint.cumulativeLengthFt).toFixed(1)}m` : `+${joint.cumulativeLengthFt.toFixed(1)}ft`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Assembly Title & Specs Badge */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-lg text-xs">
          <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">
              {bhaConfig.name || 'BHA Toolstring'}
            </span>
            <span className="text-slate-400 font-mono">
              ({bhaConfig.segments.length} components • {isMetric ? `${ftToM(totalLengthFt).toFixed(1)} m` : `${totalLengthFt.toFixed(1)} ft`})
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Boxes className="w-3 h-3 text-cyan-400" />
            3D Assembly
          </span>
          <button
            type="button"
            onClick={() => setShowDimensions((prev) => !prev)}
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border flex items-center gap-1.5 transition cursor-pointer ${
              showDimensions
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/35'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle overlay dimension labels (OD, ID, length) next to each tool joint and component"
          >
            <Ruler className="w-3 h-3 text-cyan-400" />
            <span>Dims: {showDimensions ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Right: Camera View Angle Buttons & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-lg text-xs">
          <button
            type="button"
            onClick={() => resetCamera('isometric')}
            className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition text-[11px] font-medium"
            title="Isometric 3D View"
          >
            Isometric
          </button>
          <button
            type="button"
            onClick={() => resetCamera('side')}
            className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition text-[11px] font-medium"
            title="Side Elevation View"
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => resetCamera('top')}
            className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition text-[11px] font-medium"
            title="Top-Down View"
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => resetCamera('bit')}
            className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition text-[11px] font-medium"
            title="Face View Looking Up at Bit"
          >
            Bit Face
          </button>
          <div className="h-4 w-px bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => resetCamera('isometric')}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded transition"
            title="Reset Camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D Viewer'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Hover Tooltip Card in 3D View */}
      {hoveredSegment && (
        <div
          style={{
            left: Math.min(window.innerWidth - 300, Math.max(20, mousePos.x + 15)),
            top: Math.max(70, Math.min(380, mousePos.y + 15))
          }}
          className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md p-3 rounded-lg border border-cyan-500/40 shadow-2xl text-xs space-y-1 w-64 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white truncate">{hoveredSegment.name}</span>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hoveredSegment.color || TOOL_TYPE_DEFAULTS[hoveredSegment.type]?.color || '#0ea5e9' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] pt-1">
            <span className="text-slate-400">Type:</span>
            <span className="font-mono text-cyan-300 capitalize">{hoveredSegment.type.replace('_', ' ')}</span>
            <span className="text-slate-400">Length:</span>
            <span className="font-mono text-white">
              {isMetric ? `${ftToM(hoveredSegment.lengthFt).toFixed(2)} m` : `${hoveredSegment.lengthFt.toFixed(2)} ft`}
            </span>
            <span className="text-slate-400">Outer Dia (OD):</span>
            <span className="font-mono text-amber-300">
              {isMetric ? `${inToMm(hoveredSegment.outerDiameterIn).toFixed(1)} mm` : `${hoveredSegment.outerDiameterIn.toFixed(3)}"`}
            </span>
            <span className="text-slate-400">Inner Bore (ID):</span>
            <span className="font-mono text-white">
              {isMetric ? `${inToMm(hoveredSegment.innerDiameterIn).toFixed(1)} mm` : `${hoveredSegment.innerDiameterIn.toFixed(3)}"`}
            </span>
          </div>
          {hoveredSegment.description && (
            <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/80">
              {hoveredSegment.description}
            </div>
          )}
          <div className="text-[9px] text-cyan-400/80 font-mono text-center pt-0.5">
            Click component in 3D to select &amp; edit
          </div>
        </div>
      )}

      {/* Clearance & Warnings Overlay (Top Left below title) */}
      <div className="absolute top-14 left-3 flex flex-col gap-1.5 pointer-events-none text-xs">
        {isInterference ? (
          <div className="pointer-events-auto bg-rose-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-rose-600/70 text-rose-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
            <Info className="w-3.5 h-3.5 text-rose-400" />
            <span>INTERFERENCE: Max OD &ge; Casing ID</span>
          </div>
        ) : isTightClearance ? (
          <div className="pointer-events-auto bg-amber-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-amber-600/70 text-amber-200 text-[11px] flex items-center gap-1.5 shadow-lg">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Tight Clearance: {isMetric ? `${inToMm(radialClearanceIn).toFixed(1)} mm` : `${radialClearanceIn.toFixed(3)}"`}</span>
          </div>
        ) : (
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700/60 text-slate-300 text-[10px] font-mono shadow-sm">
            Annular Clearance: {isMetric ? `${inToMm(radialClearanceIn).toFixed(1)} mm` : `${radialClearanceIn.toFixed(3)}"`}
          </div>
        )}
      </div>

      {/* Bottom Floating Interactive Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Controls: Dimensions, Cutaway, Exploded View, Casing Display */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-2xl text-xs">
          {/* Dimensions Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowDimensions((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition text-[11px] border cursor-pointer ${
              showDimensions
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle overlay dimension labels (OD, ID, length) next to each tool joint and component"
          >
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dimensions</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                showDimensions ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'
              }`}
            />
          </button>

          {/* Dimension Filter (All / Components / Joints) */}
          {showDimensions && (
            <div className="flex items-center bg-slate-800/90 rounded-md p-0.5 border border-slate-700 text-[10px]">
              <button
                type="button"
                onClick={() => setDimensionFilter('all')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  dimensionFilter === 'all'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Display dimensions for both components and tool joints"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDimensionFilter('components')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  dimensionFilter === 'components'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Display component dimensions (OD, ID, Length)"
              >
                Tools
              </button>
              <button
                type="button"
                onClick={() => setDimensionFilter('joints')}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  dimensionFilter === 'joints'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Display tool joint dimensions (Connection OD, ID bore, Station)"
              >
                Joints
              </button>
            </div>
          )}

          {/* Cutaway (180° Half-Section) */}
          <button
            type="button"
            onClick={() => setIsCutaway((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition text-[11px] border ${
              isCutaway
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Cut half the assembly open to see internal bore (ID) and check valves"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Cutaway View</span>
          </button>

          {/* Exploded View Slider */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">Explode:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={explodedRatio}
              onChange={(e) => setExplodedRatio(parseFloat(e.target.value))}
              className="w-20 accent-cyan-400 h-1.5 cursor-pointer bg-slate-700 rounded-lg"
              title="Expand tool joints along axis to inspect pin and box connections"
            />
            <span className="font-mono text-cyan-300 w-7 text-right">
              {Math.round(explodedRatio * 100)}%
            </span>
          </div>

          {/* Casing Tube Display Mode */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/80 rounded-md border border-slate-700 text-[11px]">
            <span className="text-slate-400 text-[10px] px-1">Casing:</span>
            <button
              type="button"
              onClick={() => setCasingDisplayMode('transparent')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                casingDisplayMode === 'transparent' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ghost
            </button>
            <button
              type="button"
              onClick={() => setCasingDisplayMode('wireframe')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                casingDisplayMode === 'wireframe' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wire
            </button>
            <button
              type="button"
              onClick={() => setCasingDisplayMode('cutaway')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                casingDisplayMode === 'cutaway' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Half
            </button>
            <button
              type="button"
              onClick={() => setCasingDisplayMode('hidden')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                casingDisplayMode === 'hidden' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Right Controls: Radial Scale & Flow Animation */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-2xl text-xs">
          {/* Radial Aspect Scale Toggle */}
          <button
            type="button"
            onClick={() => setScaleMode((prev) => (prev === 'inspection' ? 'truescale' : 'inspection'))}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${
              scaleMode === 'inspection'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle between Enhanced Diameter for detailed tool inspection vs True 1:1 Physical Aspect Ratio"
          >
            {scaleMode === 'inspection' ? 'OD Zoom (2.5×)' : '1:1 True Scale'}
          </button>

          {/* Fluid Flow Particles Toggle */}
          <button
            type="button"
            onClick={() => setIsFlowActive((prev) => !prev)}
            className={`p-1.5 rounded-md border transition ${
              isFlowActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title="Toggle Circulating Fluid Flow Particle Stream"
          >
            <Droplets className="w-3.5 h-3.5" />
          </button>

          {/* Turntable Auto-Rotate */}
          <button
            type="button"
            onClick={() => setIsAutoRotate((prev) => !prev)}
            className={`p-1.5 rounded-md border transition ${
              isAutoRotate
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title="Toggle Continuous Turntable Rotation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
