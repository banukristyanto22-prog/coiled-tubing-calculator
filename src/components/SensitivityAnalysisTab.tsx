import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CoiledTubingString, 
  UnitSystem, 
  WellboreForcesInput, 
  HydraulicsInput,
  SensitivityYieldPoint
} from '../types/coiledTubing';
import {
  calculateWellboreForces,
  calculateHydraulics,
  calculateTubingLimits,
  calculateGeometry,
  evaluateOperatingPoint,
  ftToM,
  mToFt,
  psiToBar,
  barToPsi,
  psiToMpa,
  lbfToKn,
  knToLbf,
  gpmToLpm,
  lpmToGpm,
  ppgToSg,
  sgToPpg,
  inToMm
} from '../utils/engineeringCalculations';
import { 
  Sliders, 
  Download, 
  Layers, 
  Gauge, 
  Ruler, 
  Droplets, 
  Anchor, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Sparkles, 
  Info, 
  TrendingUp,
  Grid3X3,
  Check,
  Zap,
  RotateCcw,
  BookmarkCheck,
  ArrowRight,
  Tag
} from 'lucide-react';
import { Sensitivity2DMatrix } from './Sensitivity2DMatrix';
import { SensitivityChartsSection } from './SensitivityChartsSection';
import {
  getApiGradeSuggestion,
  normalizeGradeKey,
  API_GRADE_SPECIFICATIONS,
  ApiGradeSpecification
} from '../utils/apiGradeSuggestions';

interface SensitivityAnalysisTabProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
}

type SensitivityMode = 'depth' | 'flow' | 'pressure' | 'density' | 'yield';

export const SensitivityAnalysisTab: React.FC<SensitivityAnalysisTabProps> = ({
  ct,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const [analysisType, setAnalysisType] = useState<'2d_matrix' | '1d_sweep'>('1d_sweep');
  const [mode, setActiveMode] = useState<SensitivityMode>('depth');

  // Sweep Range States
  // 1. Depth sweep (ft) - Starting from 0 (surface level)
  const [depthStart, setDepthStart] = useState<number>(0);
  const [depthEnd, setDepthEnd] = useState<number>(18000);
  const [depthStep, setDepthStep] = useState<number>(2000);
  const [wellInclination, setWellInclination] = useState<number>(45);
  const [frictionCoeff, setFrictionCoeff] = useState<number>(0.25);
  const [casingId, setCasingId] = useState<number>(6.0);
  const [wellFluidDensity, setWellFluidDensity] = useState<number>(8.6);

  // 2. Flow rate sweep (GPM)
  const [flowStart, setFlowStart] = useState<number>(20);
  const [flowEnd, setFlowEnd] = useState<number>(140);
  const [flowStep, setFlowStep] = useState<number>(15);
  const [baseDepthForFlow, setBaseDepthForFlow] = useState<number>(10000);
  const [nozzleDia, setNozzleDia] = useState<number>(0.1875);
  const [nozzleCount, setNozzleCount] = useState<number>(4);
  const [flowFluidViscosity, setFlowFluidViscosity] = useState<number>(1.2);

  // 3. Internal pressure sweep (psi)
  const [pressureStart, setPressureStart] = useState<number>(0);
  const [pressureEnd, setPressureEnd] = useState<number>(8000);
  const [pressureStep, setPressureStep] = useState<number>(1000);
  const [axialTensionRatio, setAxialTensionRatio] = useState<number>(25); // % of yield

  // 4. Fluid density sweep (ppg)
  const [densityStart, setDensityStart] = useState<number>(8.33);
  const [densityEnd, setDensityEnd] = useState<number>(14.0);
  const [densityStep, setDensityStep] = useState<number>(0.5);
  const [baseDepthForDensity, setBaseDepthForDensity] = useState<number>(10000);

  // 5. Yield Strength sweep (psi) & API Spec 5ST Auto-Suggestions
  const initialGradeKey = normalizeGradeKey(ct.grade, ct.yieldStrengthPsi);
  const initialSuggestion = getApiGradeSuggestion(initialGradeKey, ct.yieldStrengthPsi);

  const [yieldStart, setYieldStart] = useState<number>(initialSuggestion.recommendedSweep.startPsi);
  const [yieldEnd, setYieldEnd] = useState<number>(initialSuggestion.recommendedSweep.endPsi);
  const [yieldStep, setYieldStep] = useState<number>(initialSuggestion.recommendedSweep.stepPsi);
  const [yieldSafetyFactor, setYieldSafetyFactor] = useState<number>(0.80);
  const [workingPressureForYield, setWorkingPressureForYield] = useState<number>(3000);

  // Auto-suggest state & preferences
  const [autoAdaptYieldToGrade, setAutoAdaptYieldToGrade] = useState<boolean>(true);
  const [selectedGradeTarget, setSelectedGradeTarget] = useState<string>(initialGradeKey);
  const [showGradeSpecDetails, setShowGradeSpecDetails] = useState<boolean>(false);
  const [lastAutoAppliedFeedback, setLastAutoAppliedFeedback] = useState<string | null>(null);

  // Active string's canonical API specification
  const currentStringGradeSpec = useMemo(
    () => getApiGradeSuggestion(ct.grade, ct.yieldStrengthPsi),
    [ct.grade, ct.yieldStrengthPsi]
  );

  // Target specification currently focused (defaults to active string, or custom grade)
  const activeGradeSpec = useMemo(
    () => getApiGradeSuggestion(selectedGradeTarget, ct.yieldStrengthPsi),
    [selectedGradeTarget, ct.yieldStrengthPsi]
  );

  // Synchronize or auto-suggest API yield range when string material grade changes
  useEffect(() => {
    const stringGradeKey = normalizeGradeKey(ct.grade, ct.yieldStrengthPsi);
    setSelectedGradeTarget(stringGradeKey);

    if (autoAdaptYieldToGrade) {
      const suggestion = getApiGradeSuggestion(stringGradeKey, ct.yieldStrengthPsi);
      setYieldStart(suggestion.recommendedSweep.startPsi);
      setYieldEnd(suggestion.recommendedSweep.endPsi);
      setYieldStep(suggestion.recommendedSweep.stepPsi);
      setLastAutoAppliedFeedback(`Auto-suggested API ${suggestion.canonicalGrade} standard range: ${suggestion.recommendedSweep.label}`);
      const timer = setTimeout(() => setLastAutoAppliedFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [ct.grade, ct.yieldStrengthPsi, autoAdaptYieldToGrade]);

  // Method to apply a suggested range
  const handleApplyRange = useCallback((startPsi: number, endPsi: number, stepPsi: number, label?: string) => {
    setYieldStart(startPsi);
    setYieldEnd(endPsi);
    setYieldStep(stepPsi);
    if (label) {
      setLastAutoAppliedFeedback(`Applied ${label}`);
      const timer = setTimeout(() => setLastAutoAppliedFeedback(null), 3500);
    }
  }, []);

  // Check if current sweep matches recommended
  const isMatchingActiveRecommended = useMemo(() => {
    return (
      yieldStart === activeGradeSpec.recommendedSweep.startPsi &&
      yieldEnd === activeGradeSpec.recommendedSweep.endPsi &&
      yieldStep === activeGradeSpec.recommendedSweep.stepPsi
    );
  }, [yieldStart, yieldEnd, yieldStep, activeGradeSpec]);

  // Active hover point for interactive chart inspection
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Static tubing structural limits
  const baseLimits = useMemo(() => calculateTubingLimits(ct), [ct]);

  // Helper to generate step series
  const generateRange = (start: number, end: number, step: number, maxPoints = 50): number[] => {
    const s = Math.max(0.001, Math.abs(step));
    const minVal = Math.min(start, end);
    const maxVal = Math.max(start, end);
    const points: number[] = [];
    for (let val = minVal; val <= maxVal + s * 0.01 && points.length < maxPoints; val += s) {
      points.push(Math.round(val * 1000) / 1000);
    }
    if (points.length === 0) points.push(minVal);
    return points;
  };

  // --- BATCH CALCULATIONS ---

  // 1. Depth Sweep Data
  const depthBatchData = useMemo(() => {
    const depths = generateRange(depthStart, depthEnd, depthStep);
    return depths.map((d) => {
      const forcesInput: WellboreForcesInput = {
        measuredDepthFt: d,
        trueVerticalDepthFt: d * Math.cos((wellInclination * Math.PI) / 180),
        wellboreInclinationDeg: wellInclination,
        casingInnerDiameterIn: casingId,
        wellboreFluidDensityPpg: wellFluidDensity,
        frictionCoefficientCasing: frictionCoeff,
        frictionCoefficientOpenHole: frictionCoeff * 1.2,
        surfaceOverpullLimitLbf: baseLimits.safeTensileYieldLbf * 0.8,
        appliedInjectorSnubbingLbf: 0,
        appliedInjectorTensionLbf: 0,
      };
      const forces = calculateWellboreForces(ct, forcesInput);
      const safeTensile = baseLimits.safeTensileYieldLbf;
      const pickup = forces.surfacePickupWeightLbf;
      const overpullAvailable = Math.max(0, safeTensile - pickup);
      const isBuckled = -forces.surfaceSlackoffWeightLbf > forces.criticalSinusoidalBucklingLbf;
      const isHelical = -forces.surfaceSlackoffWeightLbf > forces.helicalBucklingThresholdLbf;

      return {
        depthFt: d,
        depthM: ftToM(d),
        slackoffLbf: forces.surfaceSlackoffWeightLbf,
        slackoffKn: lbfToKn(forces.surfaceSlackoffWeightLbf),
        neutralLbf: forces.surfaceNeutralWeightLbf,
        neutralKn: lbfToKn(forces.surfaceNeutralWeightLbf),
        pickupLbf: forces.surfacePickupWeightLbf,
        pickupKn: lbfToKn(forces.surfacePickupWeightLbf),
        dragLbf: forces.totalWellboreDragLbf,
        dragKn: lbfToKn(forces.totalWellboreDragLbf),
        sinusoidalLimitLbf: forces.criticalSinusoidalBucklingLbf,
        sinusoidalLimitKn: lbfToKn(forces.criticalSinusoidalBucklingLbf),
        helicalLimitLbf: forces.helicalBucklingThresholdLbf,
        helicalLimitKn: lbfToKn(forces.helicalBucklingThresholdLbf),
        overpullAvailableLbf: overpullAvailable,
        overpullAvailableKn: lbfToKn(overpullAvailable),
        isLockedUp: forces.isLockedUp || isHelical,
        isBuckled,
        status: forces.isLockedUp || isHelical ? 'helical' : isBuckled ? 'sinusoidal' : 'safe',
      };
    });
  }, [depthStart, depthEnd, depthStep, wellInclination, frictionCoeff, casingId, wellFluidDensity, ct, baseLimits]);

  // 2. Flow Rate Sweep Data
  const flowBatchData = useMemo(() => {
    const flows = generateRange(flowStart, flowEnd, flowStep);
    return flows.map((q) => {
      const hydInput: HydraulicsInput = {
        flowRateGpm: q,
        fluidType: 'fresh_water',
        fluidDensityPpg: wellFluidDensity,
        fluidViscosityCp: flowFluidViscosity,
        nozzleDiameterIn: nozzleDia,
        nozzleCount: nozzleCount,
        nozzleCd: 0.95,
        casingInnerDiameterIn: casingId,
        wellboreDepthFt: baseDepthForFlow,
        pumpSurfacePressurePsi: 0,
      };
      const res = calculateHydraulics(ct, hydInput);
      const isPressureCritical = res.totalCirculatingPressurePsi > baseLimits.safeBurstPressurePsi;
      const isPressureCaution = res.totalCirculatingPressurePsi > baseLimits.safeBurstPressurePsi * 0.85;

      return {
        flowGpm: q,
        flowLpm: gpmToLpm(q),
        standpipePsi: res.totalCirculatingPressurePsi,
        standpipeBar: res.totalCirculatingPressureBar,
        tubingDropPsi: res.pressureDropTubingPsi,
        tubingDropBar: res.pressureDropTubingBar,
        nozzleDropPsi: res.nozzlePressureDropPsi,
        nozzleDropBar: res.nozzlePressureDropBar,
        annularDropPsi: res.annularPressureDropPsi,
        annularDropBar: psiToBar(res.annularPressureDropPsi),
        velocityFtSec: res.velocityFtSec,
        velocityMSec: res.velocityMSec,
        reynolds: res.reynoldsNumber,
        hhp: res.hydraulicHorsepowerHhp,
        transportEfficiency: res.cuttingsTransportEfficiencyPercent,
        status: isPressureCritical ? 'critical' : isPressureCaution ? 'caution' : 'safe',
      };
    });
  }, [flowStart, flowEnd, flowStep, wellFluidDensity, flowFluidViscosity, nozzleDia, nozzleCount, casingId, baseDepthForFlow, ct, baseLimits]);

  // 3. Pressure Sweep Data
  const pressureBatchData = useMemo(() => {
    const pressures = generateRange(pressureStart, pressureEnd, pressureStep);
    return pressures.map((p) => {
      const axialTension = (axialTensionRatio / 100) * baseLimits.tensileYieldLbf;
      const vmResult = evaluateOperatingPoint(ct, p, axialTension);
      // Derated tensile limit under internal pressure
      const hoopStress = (p * (ct.outerDiameterIn - 2 * ct.wallThicknessIn)) / (2 * ct.wallThicknessIn);
      const yieldStress = ct.yieldStrengthPsi;
      const deratedAxialStress = Math.sqrt(Math.max(0, Math.pow(yieldStress, 2) - 0.75 * Math.pow(hoopStress, 2)));
      const deratedTensileLbf = deratedAxialStress * (baseLimits.tensileYieldLbf / ct.yieldStrengthPsi);
      const safeOverpullLbf = Math.max(0, deratedTensileLbf * 0.8 - axialTension);

      return {
        pressurePsi: p,
        pressureBar: psiToBar(p),
        vonMisesStressPsi: vmResult.vonMisesStressPsi,
        vonMisesStressMpa: psiToBar(vmResult.vonMisesStressPsi) / 10,
        stressRatioPercent: vmResult.stressRatioPercent,
        deratedTensileLbf,
        deratedTensileKn: lbfToKn(deratedTensileLbf),
        safeOverpullLbf,
        safeOverpullKn: lbfToKn(safeOverpullLbf),
        status: vmResult.status,
      };
    });
  }, [pressureStart, pressureEnd, pressureStep, axialTensionRatio, ct, baseLimits]);

  // 4. Fluid Density Sweep Data
  const densityBatchData = useMemo(() => {
    const densities = generateRange(densityStart, densityEnd, densityStep);
    const d = baseDepthForDensity;
    return densities.map((rho) => {
      const forcesInput: WellboreForcesInput = {
        measuredDepthFt: d,
        trueVerticalDepthFt: d * Math.cos((wellInclination * Math.PI) / 180),
        wellboreInclinationDeg: wellInclination,
        casingInnerDiameterIn: casingId,
        wellboreFluidDensityPpg: rho,
        frictionCoefficientCasing: frictionCoeff,
        frictionCoefficientOpenHole: frictionCoeff * 1.2,
        surfaceOverpullLimitLbf: baseLimits.safeTensileYieldLbf * 0.8,
        appliedInjectorSnubbingLbf: 0,
        appliedInjectorTensionLbf: 0,
      };
      const forces = calculateWellboreForces(ct, forcesInput);
      const hydrostaticBhpPsi = rho * 0.052 * forcesInput.trueVerticalDepthFt;

      return {
        densityPpg: rho,
        densitySg: ppgToSg(rho),
        buoyancyFactor: forces.buoyancyFactor,
        buoyedWeightLbFt: forces.buoyedWeightLbFt,
        hydrostaticBhpPsi,
        hydrostaticBhpBar: psiToBar(hydrostaticBhpPsi),
        slackoffLbf: forces.surfaceSlackoffWeightLbf,
        slackoffKn: lbfToKn(forces.surfaceSlackoffWeightLbf),
        pickupLbf: forces.surfacePickupWeightLbf,
        pickupKn: lbfToKn(forces.surfacePickupWeightLbf),
        neutralLbf: forces.surfaceNeutralWeightLbf,
        neutralKn: lbfToKn(forces.surfaceNeutralWeightLbf),
        dragLbf: forces.totalWellboreDragLbf,
        dragKn: lbfToKn(forces.totalWellboreDragLbf),
      };
    });
  }, [densityStart, densityEnd, densityStep, baseDepthForDensity, wellInclination, casingId, frictionCoeff, ct, baseLimits]);

  // 5. Yield Strength Working Envelope Batch Data
  const yieldBatchData: SensitivityYieldPoint[] = useMemo(() => {
    const yields = generateRange(yieldStart, yieldEnd, yieldStep);
    const baseGeom = calculateGeometry(ct);
    const baseArea = baseGeom.metalAreaSqIn;
    const baseOd = ct.outerDiameterIn;
    const baseWt = ct.wallThicknessIn;

    return yields.map((ys) => {
      const testCt: CoiledTubingString = {
        ...ct,
        yieldStrengthPsi: ys,
        specifiedMinYieldPsi: ys,
      };
      const limits = calculateTubingLimits(testCt, 0, yieldSafetyFactor);
      const nominalLimits = calculateTubingLimits(testCt, 0, 1.0);

      // Biaxial tension at working pressure
      const pi = workingPressureForYield;
      const sigmaTheta = (pi * (baseOd - baseWt)) / (2 * baseWt);
      const disc = 4 * Math.pow(ys, 2) - 3 * Math.pow(sigmaTheta, 2);
      let biaxialTensionLbf = 0;
      if (disc >= 0) {
        const sigmaA = (sigmaTheta + Math.sqrt(disc)) / 2;
        biaxialTensionLbf = Math.max(0, sigmaA * baseArea * yieldSafetyFactor);
      }

      const ksi = Math.round(ys / 1000);
      const gradeEquivalent = `CT${ksi}`;

      const baseTensile = baseLimits.safeOverpullLbf;
      const baseBurst = baseLimits.safeBurstPressurePsi;
      const baseCollapse = baseLimits.safeCollapsePressurePsi;

      const tensileGainPercent = baseTensile > 0 ? ((limits.safeOverpullLbf - baseTensile) / baseTensile) * 100 : 0;
      const burstGainPercent = baseBurst > 0 ? ((limits.safeBurstPressurePsi - baseBurst) / baseBurst) * 100 : 0;
      const collapseGainPercent = baseCollapse > 0 ? ((limits.safeCollapsePressurePsi - baseCollapse) / baseCollapse) * 100 : 0;

      const envelopeAreaIndex = (limits.safeBurstPressurePsi / 1000) * (limits.safeOverpullLbf / 1000);

      return {
        yieldStrengthPsi: ys,
        yieldStrengthMpa: psiToMpa(ys),
        yieldKsi: ksi,
        gradeEquivalent,
        safeTensileLbf: limits.safeOverpullLbf,
        safeTensileKn: limits.safeOverpullKn,
        nominalTensileLbf: nominalLimits.tensileYieldLbf,
        nominalTensileKn: nominalLimits.tensileYieldKn,
        safeBurstPsi: limits.safeBurstPressurePsi,
        safeBurstBar: psiToBar(limits.safeBurstPressurePsi),
        nominalBurstPsi: limits.yieldBurstPressurePsi,
        nominalBurstBar: psiToBar(limits.yieldBurstPressurePsi),
        apiBurstPsi: limits.apiBurstPressurePsi,
        apiBurstBar: psiToBar(limits.apiBurstPressurePsi),
        safeCollapsePsi: limits.safeCollapsePressurePsi,
        safeCollapseBar: psiToBar(limits.safeCollapsePressurePsi),
        nominalCollapsePsi: limits.nominalCollapsePressurePsi,
        nominalCollapseBar: psiToBar(limits.nominalCollapsePressurePsi),
        biaxialTensionAtWorkingPressureLbf: biaxialTensionLbf,
        biaxialTensionAtWorkingPressureKn: lbfToKn(biaxialTensionLbf),
        tensileGainPercent,
        burstGainPercent,
        collapseGainPercent,
        envelopeAreaIndex,
      };
    });
  }, [ct, yieldStart, yieldEnd, yieldStep, yieldSafetyFactor, workingPressureForYield, baseLimits]);

  // Export Sensitivity Results to CSV
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    const timestamp = new Date().toISOString().slice(0, 10);

    if (mode === 'depth') {
      csvContent += `COILED MATRIX - BATCH DEPTH SENSITIVITY ANALYSIS\r\n`;
      csvContent += `String: ${ct.name}, Inclination: ${wellInclination} deg, Friction: ${frictionCoeff}, Casing ID: ${casingId} in\r\n`;
      csvContent += `Date: ${timestamp}\r\n\r\n`;
      csvContent += isMetric
        ? 'Depth (m),Depth (ft),Slack-Off RIH (kN),Neutral (kN),Pick-Up POOH (kN),Total Drag (kN),Sinusoidal Limit (kN),Helical Limit (kN),Safe Overpull (kN),Buckling Status\r\n'
        : 'Depth (ft),Slack-Off RIH (lbf),Neutral (lbf),Pick-Up POOH (lbf),Total Drag (lbf),Sinusoidal Limit (lbf),Helical Limit (lbf),Safe Overpull (lbf),Buckling Status\r\n';

      depthBatchData.forEach((row) => {
        if (isMetric) {
          csvContent += `${row.depthM.toFixed(1)},${row.depthFt},${row.slackoffKn.toFixed(1)},${row.neutralKn.toFixed(1)},${row.pickupKn.toFixed(1)},${row.dragKn.toFixed(1)},${row.sinusoidalLimitKn.toFixed(1)},${row.helicalLimitKn.toFixed(1)},${row.overpullAvailableKn.toFixed(1)},${row.status.toUpperCase()}\r\n`;
        } else {
          csvContent += `${row.depthFt},${Math.round(row.slackoffLbf)},${Math.round(row.neutralLbf)},${Math.round(row.pickupLbf)},${Math.round(row.dragLbf)},${Math.round(row.sinusoidalLimitLbf)},${Math.round(row.helicalLimitLbf)},${Math.round(row.overpullAvailableLbf)},${row.status.toUpperCase()}\r\n`;
        }
      });
    } else if (mode === 'flow') {
      csvContent += `COILED MATRIX - BATCH FLOW RATE SENSITIVITY ANALYSIS\r\n`;
      csvContent += `String: ${ct.name}, Depth: ${baseDepthForFlow} ft, Fluid Density: ${wellFluidDensity} ppg, Viscosity: ${flowFluidViscosity} cP\r\n`;
      csvContent += `Date: ${timestamp}\r\n\r\n`;
      csvContent += isMetric
        ? 'Flow Rate (L/min),Flow Rate (GPM),Standpipe Pressure (bar),Tubing DeltaP (bar),Nozzle DeltaP (bar),Annular DeltaP (bar),Fluid Velocity (m/s),Reynolds Number,Hydraulic HP,Hole Cleaning (%)\r\n'
        : 'Flow Rate (GPM),Standpipe Pressure (psi),Tubing DeltaP (psi),Nozzle DeltaP (psi),Annular DeltaP (psi),Fluid Velocity (ft/s),Reynolds Number,Hydraulic HP,Hole Cleaning (%)\r\n';

      flowBatchData.forEach((row) => {
        if (isMetric) {
          csvContent += `${row.flowLpm.toFixed(1)},${row.flowGpm},${row.standpipeBar.toFixed(1)},${row.tubingDropBar.toFixed(1)},${row.nozzleDropBar.toFixed(1)},${row.annularDropBar.toFixed(2)},${row.velocityMSec.toFixed(2)},${Math.round(row.reynolds)},${row.hhp.toFixed(1)},${row.transportEfficiency.toFixed(1)}%\r\n`;
        } else {
          csvContent += `${row.flowGpm},${Math.round(row.standpipePsi)},${Math.round(row.tubingDropPsi)},${Math.round(row.nozzleDropPsi)},${Math.round(row.annularDropPsi)},${row.velocityFtSec.toFixed(2)},${Math.round(row.reynolds)},${row.hhp.toFixed(1)},${row.transportEfficiency.toFixed(1)}%\r\n`;
        }
      });
    } else if (mode === 'pressure') {
      csvContent += `COILED MATRIX - BATCH PRESSURE & STRESS SENSITIVITY ANALYSIS\r\n`;
      csvContent += `String: ${ct.name}, Axial Tension Ratio: ${axialTensionRatio}%\r\n`;
      csvContent += `Date: ${timestamp}\r\n\r\n`;
      csvContent += isMetric
        ? 'Internal Pressure (bar),Internal Pressure (psi),von Mises Stress (MPa),Stress Ratio (%),Derated Tensile (kN),Safe Overpull (kN),Status\r\n'
        : 'Internal Pressure (psi),von Mises Stress (psi),Stress Ratio (%),Derated Tensile (lbf),Safe Overpull (lbf),Status\r\n';

      pressureBatchData.forEach((row) => {
        if (isMetric) {
          csvContent += `${row.pressureBar.toFixed(1)},${row.pressurePsi},${row.vonMisesStressMpa.toFixed(1)},${row.stressRatioPercent.toFixed(1)}%,${row.deratedTensileKn.toFixed(1)},${row.safeOverpullKn.toFixed(1)},${row.status.toUpperCase()}\r\n`;
        } else {
          csvContent += `${row.pressurePsi},${Math.round(row.vonMisesStressPsi)},${row.stressRatioPercent.toFixed(1)}%,${Math.round(row.deratedTensileLbf)},${Math.round(row.safeOverpullLbf)},${row.status.toUpperCase()}\r\n`;
        }
      });
    } else if (mode === 'density') {
      csvContent += `COILED MATRIX - BATCH FLUID DENSITY SENSITIVITY ANALYSIS\r\n`;
      csvContent += `String: ${ct.name}, Depth: ${baseDepthForDensity} ft\r\n`;
      csvContent += `Date: ${timestamp}\r\n\r\n`;
      csvContent += isMetric
        ? 'Fluid Density (SG),Fluid Density (ppg),Buoyancy Factor,Buoyed Wt (kg/m),Bottomhole Hydrostatic (bar),Slack-Off (kN),Neutral (kN),Pick-Up (kN)\r\n'
        : 'Fluid Density (ppg),Buoyancy Factor,Buoyed Wt (lb/ft),Bottomhole Hydrostatic (psi),Slack-Off (lbf),Neutral (lbf),Pick-Up (lbf)\r\n';

      densityBatchData.forEach((row) => {
        if (isMetric) {
          csvContent += `${row.densitySg.toFixed(2)},${row.densityPpg},${row.buoyancyFactor.toFixed(3)},${(row.buoyedWeightLbFt * 1.48816).toFixed(2)},${row.hydrostaticBhpBar.toFixed(1)},${row.slackoffKn.toFixed(1)},${row.neutralKn.toFixed(1)},${row.pickupKn.toFixed(1)}\r\n`;
        } else {
          csvContent += `${row.densityPpg},${row.buoyancyFactor.toFixed(3)},${row.buoyedWeightLbFt.toFixed(2)},${Math.round(row.hydrostaticBhpPsi)},${Math.round(row.slackoffLbf)},${Math.round(row.neutralLbf)},${Math.round(row.pickupLbf)}\r\n`;
        }
      });
    } else if (mode === 'yield') {
      csvContent += `COILED MATRIX - BATCH YIELD STRENGTH & WORKING ENVELOPE SENSITIVITY ANALYSIS\r\n`;
      csvContent += `String: ${ct.name}, Base Grade: ${ct.grade} (${Math.round(ct.yieldStrengthPsi / 1000)} ksi), SF: ${yieldSafetyFactor}, Working Pressure: ${workingPressureForYield} psi\r\n`;
      csvContent += `Date: ${timestamp}\r\n\r\n`;
      csvContent += isMetric
        ? 'Yield Strength (MPa),Yield Strength (ksi),Grade Equivalent,Safe Tensile (kN),Nominal Tensile (kN),Safe Burst (bar),API Burst (bar),Safe Collapse (bar),Biaxial Tension @ P_work (kN),Envelope Area Index,Tensile Gain (%)\r\n'
        : 'Yield Strength (psi),Yield Strength (ksi),Grade Equivalent,Safe Tensile (lbf),Nominal Tensile (lbf),Safe Burst (psi),API Burst (psi),Safe Collapse (psi),Biaxial Tension @ P_work (lbf),Envelope Area Index,Tensile Gain (%)\r\n';

      yieldBatchData.forEach((row) => {
        if (isMetric) {
          csvContent += `${Math.round(row.yieldStrengthMpa)},${row.yieldKsi},${row.gradeEquivalent},${row.safeTensileKn.toFixed(1)},${row.nominalTensileKn.toFixed(1)},${row.safeBurstBar.toFixed(1)},${row.apiBurstBar.toFixed(1)},${row.safeCollapseBar.toFixed(1)},${row.biaxialTensionAtWorkingPressureKn.toFixed(1)},${row.envelopeAreaIndex.toFixed(1)},${row.tensileGainPercent.toFixed(1)}%\r\n`;
        } else {
          csvContent += `${row.yieldStrengthPsi},${row.yieldKsi},${row.gradeEquivalent},${Math.round(row.safeTensileLbf)},${Math.round(row.nominalTensileLbf)},${Math.round(row.safeBurstPsi)},${Math.round(row.apiBurstPsi)},${Math.round(row.safeCollapsePsi)},${Math.round(row.biaxialTensionAtWorkingPressureLbf)},${row.envelopeAreaIndex.toFixed(1)},${row.tensileGainPercent.toFixed(1)}%\r\n`;
        }
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sensitivity_${mode}_${ct.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card with View Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              {analysisType === '2d_matrix' ? <Grid3X3 className="w-6 h-6" /> : <Sliders className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Sensitivity Analysis Suite
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                  {analysisType === '2d_matrix' ? '2D Dual-Variable Matrix' : '1D Single-Variable Sweep'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {analysisType === '2d_matrix' 
                  ? 'Simultaneously sweep two variables to generate a 2D matrix of forces, hydraulics, and operational envelopes' 
                  : 'Simulate operating envelopes, surface hookloads, buckling thresholds, and circulation pressure drops along single variable sweeps'}
              </p>
            </div>
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setAnalysisType('2d_matrix')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analysisType === '2d_matrix'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>2D Matrix Sweep</span>
              </button>
              <button
                onClick={() => setAnalysisType('1d_sweep')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analysisType === '1d_sweep'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>1D Single Sweep</span>
              </button>
            </div>

            {analysisType === '1d_sweep' && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-all shadow-sm"
                title="Export current batch sensitivity table to CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* 1D Mode Selector Tabs (only shown in 1D mode) */}
        {analysisType === '1d_sweep' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-800">
            {[
              { id: 'depth', label: 'Well Depth (MD)', desc: 'Hookloads, Drag & Buckling', icon: Ruler },
              { id: 'flow', label: 'Flow Rate (Circulation)', desc: 'Standpipe, Friction & TFA', icon: Droplets },
              { id: 'pressure', label: 'Internal Pressure', desc: 'Stress Ratio & Overpull', icon: Gauge },
              { id: 'density', label: 'Fluid Density (ppg)', desc: 'Buoyancy & Hydrostatics', icon: Anchor },
              { id: 'yield', label: 'Yield Strength (Grade)', desc: 'Working Envelope Limits', icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMode(item.id as SensitivityMode);
                    setHoveredIndex(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {item.label}
                    </span>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2D MATRIX VIEW */}
      {analysisType === '2d_matrix' && (
        <Sensitivity2DMatrix ct={ct} unitSystem={unitSystem} />
      )}

      {/* 1D SINGLE-VARIABLE SWEEP CONTENT */}
      {analysisType === '1d_sweep' && (
        <>

      {/* Sweep Range & Parameter Definition Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Range Definition & Operational Presets
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Active String: <strong className="text-cyan-300">{ct.name}</strong> ({ct.outerDiameterIn}" x {ct.wallThicknessIn}" {ct.grade})
          </span>
        </div>

        {/* 1. DEPTH SWEEP CONTROLS */}
        {mode === 'depth' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Start Depth {isMetric ? '(m)' : '(ft)'}
                  </label>
                  {depthStart > 0 && (
                    <button
                      type="button"
                      onClick={() => setDepthStart(0)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                      title="Reset start depth to 0 (Surface / Wellhead)"
                    >
                      Set to 0 (Surface)
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={isMetric ? Math.round(ftToM(depthStart)) : depthStart}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setDepthStart(0);
                      return;
                    }
                    const v = parseFloat(raw);
                    const parsed = isNaN(v) ? 0 : Math.max(0, v);
                    setDepthStart(isMetric ? Math.round(mToFt(parsed)) : parsed);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  End Depth {isMetric ? '(m)' : '(ft)'}
                </label>
                <input
                  type="number"
                  min="100"
                  step="1000"
                  value={isMetric ? Math.round(ftToM(depthEnd)) : depthEnd}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = parseFloat(raw);
                    const parsed = isNaN(v) ? 15000 : Math.max(100, v);
                    setDepthEnd(isMetric ? Math.round(mToFt(parsed)) : parsed);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Step Increment {isMetric ? '(m)' : '(ft)'}
                </label>
                <input
                  type="number"
                  min="50"
                  step="500"
                  value={isMetric ? Math.round(ftToM(depthStep)) : depthStep}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = parseFloat(raw);
                    const parsed = isNaN(v) ? 1000 : Math.max(50, v);
                    setDepthStep(isMetric ? Math.round(mToFt(parsed)) : parsed);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Presets & Boundary Factors */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Well Inclination (&theta;)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={wellInclination}
                  onChange={(e) => setWellInclination(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Casing Friction (&mu;)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.5"
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value) || 0.25)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Casing ID (in)</label>
                <input
                  type="number"
                  step="0.25"
                  value={casingId}
                  onChange={(e) => setCasingId(parseFloat(e.target.value) || 6.0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-end gap-1.5">
                {[
                  { label: 'Surface (0-10k)', s: 0, e: 10000, step: 1000 },
                  { label: 'Full Well (0-18k)', s: 0, e: 18000, step: 2000 },
                  { label: 'Deep (5k-20k)', s: 5000, e: 20000, step: 2500 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setDepthStart(preset.s);
                      setDepthEnd(preset.e);
                      setDepthStep(preset.step);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                      depthStart === preset.s && depthEnd === preset.e
                        ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. FLOW RATE SWEEP CONTROLS */}
        {mode === 'flow' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Start Flow {isMetric ? '(L/min)' : '(GPM)'}
                </label>
                <input
                  type="number"
                  step="10"
                  value={isMetric ? Math.round(gpmToLpm(flowStart)) : flowStart}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 10;
                    setFlowStart(isMetric ? Math.round(lpmToGpm(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  End Flow {isMetric ? '(L/min)' : '(GPM)'}
                </label>
                <input
                  type="number"
                  step="10"
                  value={isMetric ? Math.round(gpmToLpm(flowEnd)) : flowEnd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 120;
                    setFlowEnd(isMetric ? Math.round(lpmToGpm(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Step Increment {isMetric ? '(L/min)' : '(GPM)'}
                </label>
                <input
                  type="number"
                  step="5"
                  value={isMetric ? Math.round(gpmToLpm(flowStep)) : flowStep}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 10;
                    setFlowStep(isMetric ? Math.round(lpmToGpm(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Depth Evaluated ({isMetric ? 'm' : 'ft'})</label>
                <input
                  type="number"
                  step="1000"
                  value={isMetric ? Math.round(ftToM(baseDepthForFlow)) : baseDepthForFlow}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 10000;
                    setBaseDepthForFlow(isMetric ? Math.round(mToFt(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nozzle Size &amp; Count</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.015"
                    value={nozzleDia}
                    onChange={(e) => setNozzleDia(parseFloat(e.target.value) || 0.1875)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    placeholder='Dia "'
                  />
                  <input
                    type="number"
                    value={nozzleCount}
                    onChange={(e) => setNozzleCount(parseInt(e.target.value) || 4)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    placeholder="Count"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fluid Viscosity (cP)</label>
                <input
                  type="number"
                  step="0.5"
                  value={flowFluidViscosity}
                  onChange={(e) => setFlowFluidViscosity(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-end gap-1.5">
                {[
                  { label: 'Standard (20-120)', s: 20, e: 120, step: 10 },
                  { label: 'High (40-160)', s: 40, e: 160, step: 15 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setFlowStart(preset.s);
                      setFlowEnd(preset.e);
                      setFlowStep(preset.step);
                    }}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. INTERNAL PRESSURE SWEEP CONTROLS */}
        {mode === 'pressure' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Start Pressure {isMetric ? '(bar)' : '(psi)'}
                </label>
                <input
                  type="number"
                  step="500"
                  value={isMetric ? Math.round(psiToBar(pressureStart)) : pressureStart}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setPressureStart(isMetric ? Math.round(barToPsi(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  End Pressure {isMetric ? '(bar)' : '(psi)'}
                </label>
                <input
                  type="number"
                  step="1000"
                  value={isMetric ? Math.round(psiToBar(pressureEnd)) : pressureEnd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 8000;
                    setPressureEnd(isMetric ? Math.round(barToPsi(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Step Increment {isMetric ? '(bar)' : '(psi)'}
                </label>
                <input
                  type="number"
                  step="500"
                  value={isMetric ? Math.round(psiToBar(pressureStep)) : pressureStep}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 1000;
                    setPressureStep(isMetric ? Math.round(barToPsi(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Simulated Axial Load (% of Tensile Yield): {axialTensionRatio}% ({Math.round((axialTensionRatio / 100) * (isMetric ? lbfToKn(baseLimits.tensileYieldLbf) : baseLimits.tensileYieldLbf)).toLocaleString()} {isMetric ? 'kN' : 'lbf'})
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={axialTensionRatio}
                  onChange={(e) => setAxialTensionRatio(parseInt(e.target.value) || 0)}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div className="flex items-end gap-2">
                {[
                  { label: '0 - 8,000 psi', s: 0, e: 8000, step: 1000 },
                  { label: '0 - 12,000 psi (HPHT)', s: 0, e: 12000, step: 1500 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setPressureStart(preset.s);
                      setPressureEnd(preset.e);
                      setPressureStep(preset.step);
                    }}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. FLUID DENSITY SWEEP CONTROLS */}
        {mode === 'density' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Start Density {isMetric ? '(SG)' : '(ppg)'}
                </label>
                <input
                  type="number"
                  step="0.2"
                  value={isMetric ? parseFloat(ppgToSg(densityStart).toFixed(2)) : densityStart}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 8.33;
                    setDensityStart(isMetric ? sgToPpg(v) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  End Density {isMetric ? '(SG)' : '(ppg)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={isMetric ? parseFloat(ppgToSg(densityEnd).toFixed(2)) : densityEnd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 14.0;
                    setDensityEnd(isMetric ? sgToPpg(v) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Step Increment {isMetric ? '(SG)' : '(ppg)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={isMetric ? 0.06 : densityStep}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0.5;
                    setDensityStep(isMetric ? sgToPpg(v) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Well Depth Evaluated ({isMetric ? 'm' : 'ft'})</label>
                <input
                  type="number"
                  step="1000"
                  value={isMetric ? Math.round(ftToM(baseDepthForDensity)) : baseDepthForDensity}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 10000;
                    setBaseDepthForDensity(isMetric ? Math.round(mToFt(v)) : v);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-end gap-2">
                {[
                  { label: 'Brines (8.3 - 11.5 ppg)', s: 8.33, e: 11.5, step: 0.5 },
                  { label: 'Heavy Mud (9.0 - 15.0 ppg)', s: 9.0, e: 15.0, step: 0.75 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setDensityStart(preset.s);
                      setDensityEnd(preset.e);
                      setDensityStep(preset.step);
                    }}
                    className="flex-1 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. YIELD STRENGTH RANGE PANEL & API SPEC 5ST AUTO-SUGGESTIONS */}
        {mode === 'yield' && (() => {
          const currentStartKsi = Math.round(yieldStart / 1000);
          const currentEndKsi = Math.round(yieldEnd / 1000);
          const currentStepKsi = Math.max(1, Math.round(yieldStep / 1000));
          const activeStringNominalKsi = Math.round(ct.yieldStrengthPsi / 1000);
          const isStringYieldEncompassed = ct.yieldStrengthPsi >= yieldStart && ct.yieldStrengthPsi <= yieldEnd;
          const pointsCount = Math.max(1, Math.round(Math.abs(yieldEnd - yieldStart) / (yieldStep || 10000)) + 1);
          const lowerSteps = Math.max(0, Math.floor((ct.yieldStrengthPsi - yieldStart) / (yieldStep || 10000)));
          const upperSteps = Math.max(0, Math.floor((yieldEnd - ct.yieldStrengthPsi) / (yieldStep || 10000)));

          return (
            <div className="space-y-4">
              {/* API Spec 5ST Material Grade Auto-Suggestion Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Top Bar: Grade Badges & Auto-Sync Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center flex-wrap gap-2">
                    <span 
                      className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
                      style={{ 
                        backgroundColor: `${activeGradeSpec.color}20`,
                        color: activeGradeSpec.color,
                        borderColor: `${activeGradeSpec.color}40`,
                        borderWidth: 1
                      }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      API Spec 5ST: {activeGradeSpec.canonicalGrade}
                    </span>

                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-500">&bull;</span>
                      Active String: <strong className="text-cyan-300 font-semibold">{ct.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({ct.grade} &bull; {activeStringNominalKsi} ksi / {Math.round(psiToMpa(ct.yieldStrengthPsi))} MPa SMYS)
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Auto-Adapt Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !autoAdaptYieldToGrade;
                        setAutoAdaptYieldToGrade(next);
                        if (next) {
                          const suggestion = getApiGradeSuggestion(ct.grade, ct.yieldStrengthPsi);
                          handleApplyRange(
                            suggestion.recommendedSweep.startPsi,
                            suggestion.recommendedSweep.endPsi,
                            suggestion.recommendedSweep.stepPsi,
                            `Auto-sync: API standard for ${suggestion.canonicalGrade}`
                          );
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                        autoAdaptYieldToGrade
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300'
                      }`}
                      title="Automatically syncs sensitivity sweep ranges whenever the coiled tubing string or material grade changes"
                    >
                      <Zap className={`w-3.5 h-3.5 ${autoAdaptYieldToGrade ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
                      <span>Auto-Adapt to Grade: <strong>{autoAdaptYieldToGrade ? 'ON' : 'OFF'}</strong></span>
                    </button>

                    {/* Primary Apply Button */}
                    {isMatchingActiveRecommended ? (
                      <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Suggested Range Active ({activeGradeSpec.recommendedSweep.label})</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyRange(
                          activeGradeSpec.recommendedSweep.startPsi,
                          activeGradeSpec.recommendedSweep.endPsi,
                          activeGradeSpec.recommendedSweep.stepPsi,
                          `API suggested range for ${activeGradeSpec.canonicalGrade} (${activeGradeSpec.recommendedSweep.label})`
                        )}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Apply Suggested {activeGradeSpec.recommendedSweep.label}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto-suggested Feedback Toast */}
                {lastAutoAppliedFeedback && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      {lastAutoAppliedFeedback}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLastAutoAppliedFeedback(null)}
                      className="text-slate-400 hover:text-white text-xs ml-3"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Main Recommendation Text & Technical Rationale */}
                <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Recommended Sweep for {activeGradeSpec.displayName}:
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-xs font-bold border border-emerald-800/60">
                          {activeGradeSpec.recommendedSweep.label}
                        </span>
                        <span className="text-slate-400 font-mono text-xs">
                          ({isMetric 
                            ? `${Math.round(psiToMpa(activeGradeSpec.recommendedSweep.startPsi))} – ${Math.round(psiToMpa(activeGradeSpec.recommendedSweep.endPsi))} MPa` 
                            : `${activeGradeSpec.recommendedSweep.startKsi} – ${activeGradeSpec.recommendedSweep.endKsi} ksi`}, &Delta;{activeGradeSpec.recommendedSweep.stepKsi} ksi)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {activeGradeSpec.recommendedSweep.rationale}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGradeSpecDetails(!showGradeSpecDetails)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0 self-start sm:self-center"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{showGradeSpecDetails ? 'Hide API 5ST Spec' : 'API 5ST Spec Info'}</span>
                      {showGradeSpecDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Technical Specifications Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                    <span className="text-slate-400">API Spec 5ST Limits:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      SMYS: <strong className="text-white">{activeGradeSpec.smysKsi} ksi</strong> ({activeGradeSpec.smysMpa} MPa)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      Max Allowable Yield: <strong className="text-white">{activeGradeSpec.maxYieldKsi} ksi</strong> ({Math.round(psiToMpa(activeGradeSpec.maxYieldPsi))} MPa)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      Min Tensile: <strong className="text-white">{activeGradeSpec.minTensileKsi} ksi</strong> ({Math.round(psiToMpa(activeGradeSpec.minTensilePsi))} MPa)
                    </span>
                  </div>

                  {/* Expandable Grade Technical Details */}
                  {showGradeSpecDetails && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1.5 bg-slate-900/60 p-3 rounded-lg">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        {activeGradeSpec.displayName} Metallurgical & Operational Profile
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {activeGradeSpec.description}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Yield Strength Margin Ratio</span>
                          <span className="text-slate-200 font-mono font-bold">
                            {(activeGradeSpec.maxYieldKsi / activeGradeSpec.smysKsi).toFixed(2)}x ({(activeGradeSpec.maxYieldKsi - activeGradeSpec.smysKsi)} ksi mill tolerance window)
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Tensile to Yield Ratio</span>
                          <span className="text-slate-200 font-mono font-bold">
                            {(activeGradeSpec.minTensileKsi / activeGradeSpec.smysKsi).toFixed(2)}x min tensile safety ceiling
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* API Sweep Presets tailored to Selected Grade */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                      API Presets for {activeGradeSpec.canonicalGrade}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click to load pre-configured standard sweep
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeGradeSpec.sweepPresets.map((preset) => {
                      const isActive = yieldStart === preset.startPsi && yieldEnd === preset.endPsi && yieldStep === preset.stepPsi;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyRange(preset.startPsi, preset.endPsi, preset.stepPsi, `${preset.label} preset`)}
                          className={`p-2 rounded-lg text-left transition-all border ${
                            isActive
                              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-xs ring-1 ring-cyan-500/40'
                              : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold font-mono truncate">
                              {preset.shortLabel}
                            </span>
                            {preset.isPrimary && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-medium">
                                ★ Suggested
                              </span>
                            )}
                            {isActive && !preset.isPrimary && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compare With Other API Spec 5ST Standard Grades */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1">Switch Reference Grade:</span>
                    {(['CT70', 'CT80', 'CT90', 'CT100', 'CT110', 'CT120'] as const).map((gradeCode) => {
                      const isStringGrade = normalizeGradeKey(ct.grade, ct.yieldStrengthPsi) === gradeCode;
                      const isSelectedTarget = selectedGradeTarget === gradeCode;
                      const gradeSpec = API_GRADE_SPECIFICATIONS[gradeCode];
                      return (
                        <button
                          key={gradeCode}
                          type="button"
                          onClick={() => {
                            setSelectedGradeTarget(gradeCode);
                            if (autoAdaptYieldToGrade) {
                              handleApplyRange(
                                gradeSpec.recommendedSweep.startPsi,
                                gradeSpec.recommendedSweep.endPsi,
                                gradeSpec.recommendedSweep.stepPsi,
                                `API standard for ${gradeCode} (${gradeSpec.recommendedSweep.label})`
                              );
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors flex items-center gap-1.5 border ${
                            isSelectedTarget
                              ? 'bg-slate-800 text-white border-cyan-500 font-bold shadow-xs'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{gradeCode}</span>
                          {isStringGrade && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Active string baseline" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedGradeTarget !== normalizeGradeKey(ct.grade, ct.yieldStrengthPsi) && (
                    <button
                      type="button"
                      onClick={() => {
                        const stringGrade = normalizeGradeKey(ct.grade, ct.yieldStrengthPsi);
                        setSelectedGradeTarget(stringGrade);
                        const spec = getApiGradeSuggestion(stringGrade, ct.yieldStrengthPsi);
                        handleApplyRange(spec.recommendedSweep.startPsi, spec.recommendedSweep.endPsi, spec.recommendedSweep.stepPsi);
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to Active String ({normalizeGradeKey(ct.grade, ct.yieldStrengthPsi)})
                    </button>
                  )}
                </div>
              </div>

              {/* Sweep Configuration Numeric Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Start Yield Strength ({isMetric ? 'MPa' : 'ksi / psi'})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={isMetric ? 50 : 5000}
                      value={isMetric ? Math.round(psiToMpa(yieldStart)) : yieldStart}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 70000;
                        setYieldStart(isMetric ? Math.round(v / 0.00689476) : v);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      {Math.round(yieldStart / 1000)} ksi
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    End Yield Strength ({isMetric ? 'MPa' : 'ksi / psi'})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={isMetric ? 50 : 5000}
                      value={isMetric ? Math.round(psiToMpa(yieldEnd)) : yieldEnd}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 130000;
                        setYieldEnd(isMetric ? Math.round(v / 0.00689476) : v);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      {Math.round(yieldEnd / 1000)} ksi
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Step Increment ({isMetric ? 'MPa' : 'ksi / psi'})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={isMetric ? 20 : 2500}
                      value={isMetric ? Math.round(psiToMpa(yieldStep)) : yieldStep}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 10000;
                        setYieldStep(isMetric ? Math.round(v / 0.00689476) : v);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                      &Delta;{Math.round(yieldStep / 1000)} ksi
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Parameters: Safety Factor & Working Pressure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Safety Factor Derating</label>
                  <select
                    value={yieldSafetyFactor}
                    onChange={(e) => setYieldSafetyFactor(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                  >
                    <option value={0.80}>0.80 (Standard 80% Safe Working Limit)</option>
                    <option value={0.85}>0.85 (85% Conservative Limit)</option>
                    <option value={0.90}>0.90 (90% Extended Limit)</option>
                    <option value={1.00}>1.00 (100% Nominal Yield)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Coexisting Internal Pressure ({isMetric ? 'bar' : 'psi'})</label>
                  <input
                    type="number"
                    step="500"
                    value={isMetric ? Math.round(psiToBar(workingPressureForYield)) : workingPressureForYield}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 3000;
                      setWorkingPressureForYield(isMetric ? Math.round(barToPsi(v)) : v);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                    placeholder="e.g. 3000 psi"
                  />
                </div>
              </div>

              {/* Sweep Status & Alignment Verification Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-300 font-semibold">
                    Configured Sweep: {currentStartKsi} &ndash; {currentEndKsi} ksi
                    <span className="text-slate-500 font-normal ml-1.5">
                      ({pointsCount} evaluation points &bull; {isMetric ? `${Math.round(psiToMpa(yieldStart))}–${Math.round(psiToMpa(yieldEnd))} MPa` : `${yieldStart.toLocaleString()}–${yieldEnd.toLocaleString()} psi`})
                    </span>
                  </span>
                </div>

                {isStringYieldEncompassed ? (
                  <div className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Encompasses active string {ct.grade} ({activeStringNominalKsi} ksi) &bull; {lowerSteps} lower & {upperSteps} higher steps
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Active string {ct.grade} ({activeStringNominalKsi} ksi) is outside this sweep
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyRange(
                        activeGradeSpec.recommendedSweep.startPsi,
                        activeGradeSpec.recommendedSweep.endPsi,
                        activeGradeSpec.recommendedSweep.stepPsi,
                        `Re-aligned to ${activeGradeSpec.canonicalGrade}`
                      )}
                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors"
                    >
                      Align to {activeGradeSpec.canonicalGrade}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Dynamic KPI Highlights & Operational Boundaries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {mode === 'depth' && (() => {
          const firstBuckle = depthBatchData.find((d) => d.status !== 'safe');
          const maxPickup = Math.max(...depthBatchData.map((d) => d.pickupLbf));
          const maxDrag = Math.max(...depthBatchData.map((d) => d.dragLbf));
          const minOverpull = Math.min(...depthBatchData.map((d) => d.overpullAvailableLbf));
          return (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">First Buckling Depth</span>
                <span className={`text-base font-bold font-mono mt-1 block ${firstBuckle ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {firstBuckle ? (isMetric ? `${Math.round(firstBuckle.depthM)} m` : `${firstBuckle.depthFt.toLocaleString()} ft`) : 'None in Range'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {firstBuckle ? `F_crit exceeded (${firstBuckle.status})` : 'Stable across full trajectory'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max POOH Tension</span>
                <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(maxPickup))} kN` : `${Math.round(maxPickup).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  At maximum TD reach
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max Wellbore Drag</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(maxDrag))} kN` : `${Math.round(maxDrag).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  &mu; = {frictionCoeff.toFixed(2)} normal friction
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Min Safe Overpull</span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(minOverpull))} kN` : `${Math.round(minOverpull).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Available pull reserve at surface
                </span>
              </div>
            </>
          );
        })()}

        {mode === 'flow' && (() => {
          const maxFlow = flowBatchData[flowBatchData.length - 1];
          const exceedPt = flowBatchData.find((d) => d.status === 'critical');
          const maxVel = Math.max(...flowBatchData.map((d) => d.velocityFtSec));
          const maxStandpipe = Math.max(...flowBatchData.map((d) => d.standpipePsi));
          return (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pressure Threshold</span>
                <span className={`text-base font-bold font-mono mt-1 block ${exceedPt ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {exceedPt ? `${isMetric ? Math.round(exceedPt.flowLpm) : exceedPt.flowGpm} ${isMetric ? 'L/m' : 'GPM'}` : 'Under 80% Limit'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {exceedPt ? 'Exceeds 80% burst envelope' : 'Safe across full sweep range'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Peak Standpipe Pressure</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
                  {isMetric ? `${Math.round(psiToBar(maxStandpipe))} bar` : `${Math.round(maxStandpipe).toLocaleString()} psi`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  At maximum flow rate
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max Internal Velocity</span>
                <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
                  {isMetric ? `${(maxVel * 0.3048).toFixed(1)} m/s` : `${maxVel.toFixed(1)} ft/s`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Inside {ct.outerDiameterIn}" OD coiled tubing
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Peak Hydraulic Power</span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                  {maxFlow ? `${maxFlow.hhp.toFixed(1)} HHP` : '--'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  (P &times; Q) / 1714 pump power
                </span>
              </div>
            </>
          );
        })()}

        {mode === 'pressure' && (() => {
          const maxP = Math.max(...pressureBatchData.map((d) => d.pressurePsi));
          const maxStressRatio = Math.max(...pressureBatchData.map((d) => d.stressRatioPercent));
          const minOverpull = Math.min(...pressureBatchData.map((d) => d.safeOverpullLbf));
          const minTensile = Math.min(...pressureBatchData.map((d) => d.deratedTensileLbf));
          return (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max Stress Ratio</span>
                <span className={`text-base font-bold font-mono mt-1 block ${maxStressRatio > 80 ? 'text-rose-400' : maxStressRatio > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {maxStressRatio.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  von Mises triaxial yield ratio
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Derated Tensile Limit</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(minTensile))} kN` : `${Math.round(minTensile).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Reduced by hoop stress
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Min Safe Overpull</span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(minOverpull))} kN` : `${Math.round(minOverpull).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Safe allowable extra pull
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Safe Burst Rating (80%)</span>
                <span className="text-base font-bold font-mono text-purple-300 mt-1 block">
                  {isMetric ? `${Math.round(baseLimits.safeBurstPressureBar)} bar` : `${Math.round(baseLimits.safeBurstPressurePsi).toLocaleString()} psi`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  API Spec 5ST working limit
                </span>
              </div>
            </>
          );
        })()}

        {mode === 'density' && (() => {
          const maxBhp = Math.max(...densityBatchData.map((d) => d.hydrostaticBhpPsi));
          const minBf = Math.min(...densityBatchData.map((d) => d.buoyancyFactor));
          const maxPickup = Math.max(...densityBatchData.map((d) => d.pickupLbf));
          const minSlackoff = Math.min(...densityBatchData.map((d) => d.slackoffLbf));
          return (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Peak Hydrostatic BHP</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
                  {isMetric ? `${Math.round(psiToBar(maxBhp))} bar` : `${Math.round(maxBhp).toLocaleString()} psi`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Bottomhole pressure at max density
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Buoyancy Factor (BF)</span>
                <span className="text-base font-bold font-mono text-purple-300 mt-1 block">
                  {minBf.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {Math.round((1 - minBf) * 100)}% weight reduced by fluid
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max POOH Pull</span>
                <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(maxPickup))} kN` : `${Math.round(maxPickup).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Includes wellbore friction drag
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Slack-Off Hookload</span>
                <span className={`text-base font-bold font-mono mt-1 block ${minSlackoff < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isMetric ? `${Math.round(lbfToKn(minSlackoff))} kN` : `${Math.round(minSlackoff).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {minSlackoff < 0 ? 'Compression / snubbing needed' : 'Positive hanging weight'}
                </span>
              </div>
            </>
          );
        })()}

        {mode === 'yield' && (() => {
          const maxTensile = Math.max(...yieldBatchData.map((d) => d.safeTensileLbf));
          const maxBurst = Math.max(...yieldBatchData.map((d) => d.safeBurstPsi));
          const maxCollapse = Math.max(...yieldBatchData.map((d) => d.safeCollapsePsi));
          const maxTensileGain = Math.max(...yieldBatchData.map((d) => d.tensileGainPercent));
          const currentKsi = Math.round(ct.yieldStrengthPsi / 1000);
          return (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Current String Baseline</span>
                <span className="text-base font-bold font-mono text-cyan-400 mt-1 block">
                  {ct.grade} ({currentKsi} ksi)
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Safe Tensile: {isMetric ? `${Math.round(baseLimits.safeOverpullKn)} kN` : `${Math.round(baseLimits.safeOverpullLbf).toLocaleString()} lbf`}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max Safe Tensile Limit</span>
                <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
                  {isMetric ? `${Math.round(lbfToKn(maxTensile))} kN` : `${Math.round(maxTensile).toLocaleString()} lbf`}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                  +{maxTensileGain.toFixed(1)}% vs current string
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Max Safe Burst Envelope</span>
                <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
                  {isMetric ? `${Math.round(psiToBar(maxBurst))} bar` : `${Math.round(maxBurst).toLocaleString()} psi`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  At highest evaluated YS ({Math.round(yieldEnd / 1000)} ksi)
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Safe Collapse Resistance</span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                  {isMetric ? `${Math.round(psiToBar(maxCollapse))} bar` : `${Math.round(maxCollapse).toLocaleString()} psi`}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Ovality derated per Haller-Lubinski
                </span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Graphical Trend Curve Panel (Interactive Recharts Visualization) */}
      <SensitivityChartsSection
        mode={mode}
        ct={ct}
        unitSystem={unitSystem}
        depthBatchData={depthBatchData}
        flowBatchData={flowBatchData}
        pressureBatchData={pressureBatchData}
        densityBatchData={densityBatchData}
        yieldBatchData={yieldBatchData}
        baseLimits={baseLimits}
      />

      {/* Engineering Summary Batch Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Batch Calculation Results Table
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {mode === 'depth' && `${depthBatchData.length} depth points evaluated`}
            {mode === 'flow' && `${flowBatchData.length} flow rate points evaluated`}
            {mode === 'pressure' && `${pressureBatchData.length} pressure points evaluated`}
            {mode === 'density' && `${densityBatchData.length} fluid density points evaluated`}
            {mode === 'yield' && `${yieldBatchData.length} material yield points evaluated`}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {/* DEPTH SWEEP TABLE */}
          {mode === 'depth' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4">Depth ({isMetric ? 'm' : 'ft'})</th>
                  <th className="py-3 px-3 text-right">Slack-Off RIH ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Neutral ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Pick-Up POOH ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Drag ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Buckling Limit F<sub>crit</sub> ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Safe Overpull ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-4 text-center">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {depthBatchData.map((row) => (
                  <tr key={row.depthFt} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      {isMetric ? `${row.depthM.toLocaleString(undefined, { maximumFractionDigits: 1 })} m` : `${row.depthFt.toLocaleString()} ft`}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${row.slackoffLbf < 0 ? 'text-amber-400 font-bold' : 'text-emerald-300'}`}>
                      {isMetric ? row.slackoffKn.toFixed(1) : Math.round(row.slackoffLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-300">
                      {isMetric ? row.neutralKn.toFixed(1) : Math.round(row.neutralLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">
                      {isMetric ? row.pickupKn.toFixed(1) : Math.round(row.pickupLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {isMetric ? row.dragKn.toFixed(1) : Math.round(row.dragLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-300">
                      {isMetric ? row.sinusoidalLimitKn.toFixed(1) : Math.round(row.sinusoidalLimitLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {isMetric ? row.overpullAvailableKn.toFixed(1) : Math.round(row.overpullAvailableLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {row.status === 'safe' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> SAFE
                        </span>
                      ) : row.status === 'sinusoidal' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> SINUSOIDAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <ShieldAlert className="w-3 h-3" /> HELICAL LOCKUP
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* FLOW RATE SWEEP TABLE */}
          {mode === 'flow' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4">Rate ({isMetric ? 'L/min' : 'GPM'})</th>
                  <th className="py-3 px-3 text-right">Standpipe Pressure ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">CT Friction &Delta;P ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Nozzle &Delta;P ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Velocity ({isMetric ? 'm/s' : 'ft/s'})</th>
                  <th className="py-3 px-3 text-right">Reynolds (Re)</th>
                  <th className="py-3 px-3 text-right">Hydraulic HP</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {flowBatchData.map((row) => (
                  <tr key={row.flowGpm} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      {isMetric ? `${row.flowLpm.toFixed(1)} L/m` : `${row.flowGpm} GPM`}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${row.status === 'critical' ? 'text-rose-400' : row.status === 'caution' ? 'text-amber-400' : 'text-cyan-300'}`}>
                      {isMetric ? row.standpipeBar.toFixed(1) : Math.round(row.standpipePsi).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-300">
                      {isMetric ? row.tubingDropBar.toFixed(1) : Math.round(row.tubingDropPsi).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300">
                      {isMetric ? row.nozzleDropBar.toFixed(1) : Math.round(row.nozzleDropPsi).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {isMetric ? row.velocityMSec.toFixed(2) : row.velocityFtSec.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {Math.round(row.reynolds).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {row.hhp.toFixed(1)} HHP
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {row.status === 'safe' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> SAFE
                        </span>
                      ) : row.status === 'caution' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> &gt;85% LIMIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <ShieldAlert className="w-3 h-3" /> EXCEEDS LIMIT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* INTERNAL PRESSURE SWEEP TABLE */}
          {mode === 'pressure' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4">Pressure ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">von Mises Stress ({isMetric ? 'MPa' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Envelope Ratio (%)</th>
                  <th className="py-3 px-3 text-right">Derated Tensile Yield ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Safe Overpull Margin ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-4 text-center">Triaxial Envelope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {pressureBatchData.map((row) => (
                  <tr key={row.pressurePsi} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      {isMetric ? `${row.pressureBar.toFixed(1)} bar` : `${row.pressurePsi.toLocaleString()} psi`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">
                      {isMetric ? row.vonMisesStressMpa.toFixed(1) : Math.round(row.vonMisesStressPsi).toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${row.stressRatioPercent > 80 ? 'text-rose-400' : row.stressRatioPercent > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {row.stressRatioPercent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {isMetric ? row.deratedTensileKn.toFixed(1) : Math.round(row.deratedTensileLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {isMetric ? row.safeOverpullKn.toFixed(1) : Math.round(row.safeOverpullLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {row.status === 'safe' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> SAFE ENVELOPE
                        </span>
                      ) : row.status === 'caution' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> ELEVATED STRESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <ShieldAlert className="w-3 h-3" /> EXCEEDS 80% LIMIT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* FLUID DENSITY SWEEP TABLE */}
          {mode === 'density' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4">Density ({isMetric ? 'SG' : 'ppg'})</th>
                  <th className="py-3 px-3 text-right">Buoyancy Factor (BF)</th>
                  <th className="py-3 px-3 text-right">Buoyed Wt ({isMetric ? 'kg/m' : 'lb/ft'})</th>
                  <th className="py-3 px-3 text-right">Bottomhole Hydrostatic ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Slack-Off RIH ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Pick-Up POOH ({isMetric ? 'kN' : 'lbf'})</th>
                  <th className="py-3 px-3 text-right">Drag ({isMetric ? 'kN' : 'lbf'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {densityBatchData.map((row) => (
                  <tr key={row.densityPpg} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      {isMetric ? `${row.densitySg.toFixed(2)} SG` : `${row.densityPpg.toFixed(2)} ppg`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-300">
                      {row.buoyancyFactor.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {isMetric ? (row.buoyedWeightLbFt * 1.48816).toFixed(2) : row.buoyedWeightLbFt.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">
                      {isMetric ? row.hydrostaticBhpBar.toFixed(1) : Math.round(row.hydrostaticBhpPsi).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {isMetric ? row.slackoffKn.toFixed(1) : Math.round(row.slackoffLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                      {isMetric ? row.pickupKn.toFixed(1) : Math.round(row.pickupLbf).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {isMetric ? row.dragKn.toFixed(1) : Math.round(row.dragLbf).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* YIELD STRENGTH & WORKING ENVELOPE SWEEP TABLE */}
          {mode === 'yield' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4">Yield Strength ({isMetric ? 'MPa' : 'ksi / psi'})</th>
                  <th className="py-3 px-3">Grade Designation</th>
                  <th className="py-3 px-3 text-right">Safe Tensile ({isMetric ? 'kN' : 'klbf'})</th>
                  <th className="py-3 px-3 text-right">100% Tensile ({isMetric ? 'kN' : 'klbf'})</th>
                  <th className="py-3 px-3 text-right">Safe Burst ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Safe Collapse ({isMetric ? 'bar' : 'psi'})</th>
                  <th className="py-3 px-3 text-right">Biaxial @ P_work ({isMetric ? 'kN' : 'klbf'})</th>
                  <th className="py-3 px-3 text-right">Capacity Gain</th>
                  <th className="py-3 px-4 text-center">Engineering Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {yieldBatchData.map((row) => {
                  const isCurrent = Math.abs(row.yieldStrengthPsi - ct.yieldStrengthPsi) < 2000;
                  return (
                    <tr key={row.yieldStrengthPsi} className={`hover:bg-slate-800/40 transition-colors ${isCurrent ? 'bg-cyan-950/30' : ''}`}>
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        {isMetric ? `${Math.round(row.yieldStrengthMpa)} MPa` : `${Math.round(row.yieldStrengthPsi).toLocaleString()} psi`}
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {row.gradeEquivalent} ({row.yieldKsi} ksi)
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                        {isMetric ? row.safeTensileKn.toFixed(1) : (row.safeTensileLbf / 1000).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-200">
                        {isMetric ? row.nominalTensileKn.toFixed(1) : (row.nominalTensileLbf / 1000).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-cyan-400">
                        {isMetric ? row.safeBurstBar.toFixed(1) : Math.round(row.safeBurstPsi).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">
                        {isMetric ? row.safeCollapseBar.toFixed(1) : Math.round(row.safeCollapsePsi).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-pink-300">
                        {isMetric ? row.biaxialTensionAtWorkingPressureKn.toFixed(1) : (row.biaxialTensionAtWorkingPressureLbf / 1000).toFixed(1)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${row.tensileGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.tensileGainPercent >= 0 ? `+${row.tensileGainPercent.toFixed(1)}%` : `${row.tensileGainPercent.toFixed(1)}%`}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          row.yieldKsi >= 110
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : row.yieldKsi >= 90
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {row.yieldKsi >= 110 ? 'Ultra-High Strength' : row.yieldKsi >= 90 ? 'High Strength' : 'Standard CT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
