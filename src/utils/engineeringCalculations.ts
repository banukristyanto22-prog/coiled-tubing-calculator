import { 
  CoiledTubingString, 
  HydraulicsInput, 
  WellboreForcesInput,
  WellboreSurveyStation,
  AchillesMaterialGrade,
  LcfMaterialParameters,
  AchillesBendingEvent,
  AchillesFatigueResult,
  CalculationTabSource,
  CalculationMetricsSummary,
  CalculationHistoryEntry,
  UsedCondition,
  BhaSummaryMetrics
} from '../types/coiledTubing';
import { ACHILLES_LCF_MATERIALS } from '../data/presets';
import { computeBhaSummaryMetrics } from '../data/bhaPresets';

// Constants
export const STEEL_DENSITY_LB_CUFT = 489.54; // lb/ft³
export const STEEL_DENSITY_LB_CUIN = 0.2833; // lb/in³
export const STEEL_DENSITY_KG_M3 = 7850; // kg/m³
export const YOUNGS_MODULUS_PSI = 30000000; // 30 x 10⁶ psi

// Unit Conversion Helpers
export const inToMm = (val: number): number => val * 25.4;
export const mmToIn = (val: number): number => val / 25.4;
export const ftToM = (val: number): number => val * 0.3048;
export const mToFt = (val: number): number => val / 0.3048;
export const psiToMpa = (val: number): number => val * 0.00689476;
export const mpaToPsi = (val: number): number => val / 0.00689476;
export const psiToBar = (val: number): number => val * 0.0689476;
export const barToPsi = (val: number): number => val / 0.0689476;
export const lbfToKn = (val: number): number => val * 0.00444822;
export const knToLbf = (val: number): number => val / 0.00444822;
export const lbPerFtToKgPerM = (val: number): number => val * 1.48816;
export const kgPerMToLbPerFt = (val: number): number => val / 1.48816;
export const gpmToLpm = (val: number): number => val * 3.78541;
export const lpmToGpm = (val: number): number => val / 3.78541;
export const ppgToSg = (val: number): number => val * 0.119826;
export const sgToPpg = (val: number): number => val / 0.119826;
export const bblToM3 = (val: number): number => val * 0.158987;
export const m3ToBbl = (val: number): number => val / 0.158987;

// --- GEOMETRY CALCULATIONS ---
export interface StringGeometry {
  innerDiameterIn: number;
  innerDiameterMm: number;
  metalAreaSqIn: number;
  metalAreaSqMm: number;
  internalAreaSqIn: number;
  weightInAirLbFt: number;
  weightInAirKgM: number;
  totalWeightInAirLbs: number;
  totalWeightInAirKg: number;
  capacityBbl1000Ft: number;
  capacityBblFt: number;
  capacityGalFt: number;
  capacityLpm: number;
  totalCapacityBbl: number;
  totalCapacityM3: number;
  displacementBbl1000Ft: number;
  totalDisplacementBbl: number;
  momentOfInertiaIn4: number;
  polarMomentOfInertiaIn4: number;
  dtRatio: number;
}

export function calculateGeometry(ct: CoiledTubingString): StringGeometry {
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const id = Math.max(0.01, od - 2 * wt);

  const metalAreaSqIn = (Math.PI / 4) * (od * od - id * id);
  const internalAreaSqIn = (Math.PI / 4) * (id * id);
  
  // Standard API 5ST formula for weight in air: 10.69 * (OD - t) * t (lb/ft)
  const weightInAirLbFt = 10.69 * (od - wt) * wt;
  const totalWeightInAirLbs = weightInAirLbFt * ct.totalLengthFt;

  // Capacity in bbl/ft: ID² / 1029.4
  const capacityBblFt = (id * id) / 1029.4;
  const capacityBbl1000Ft = capacityBblFt * 1000;
  const capacityGalFt = (id * id) / 24.51;
  const totalCapacityBbl = capacityBblFt * ct.totalLengthFt;

  // Displacement in bbl/ft: OD² / 1029.4
  const displacementBblFt = (od * od) / 1029.4;
  const displacementBbl1000Ft = displacementBblFt * 1000;
  const totalDisplacementBbl = displacementBblFt * ct.totalLengthFt;

  // Moment of Inertia I = π/64 * (OD⁴ - ID⁴)
  const momentOfInertiaIn4 = (Math.PI / 64) * (Math.pow(od, 4) - Math.pow(id, 4));
  const polarMomentOfInertiaIn4 = 2 * momentOfInertiaIn4;

  const dtRatio = od / wt;

  return {
    innerDiameterIn: id,
    innerDiameterMm: inToMm(id),
    metalAreaSqIn,
    metalAreaSqMm: metalAreaSqIn * 645.16,
    internalAreaSqIn,
    weightInAirLbFt,
    weightInAirKgM: lbPerFtToKgPerM(weightInAirLbFt),
    totalWeightInAirLbs,
    totalWeightInAirKg: totalWeightInAirLbs * 0.453592,
    capacityBbl1000Ft,
    capacityBblFt,
    capacityGalFt,
    capacityLpm: capacityGalFt * 3.78541 / 0.3048,
    totalCapacityBbl,
    totalCapacityM3: bblToM3(totalCapacityBbl),
    displacementBbl1000Ft,
    totalDisplacementBbl,
    momentOfInertiaIn4,
    polarMomentOfInertiaIn4,
    dtRatio,
  };
}

// --- TUBING LIMITS CALCULATIONS (API Spec 5ST & von Mises) ---
export interface TubingLimits {
  yieldBurstPressurePsi: number;
  apiBurstPressurePsi: number; // 87.5% derating per API 5ST
  safeBurstPressurePsi: number; // Derated by safety factor (e.g., 0.80, 0.90)
  nominalCollapsePressurePsi: number;
  ovalityDeratedCollapsePsi: number;
  safeCollapsePressurePsi: number; // Derated by safety factor
  tensileYieldLbf: number;
  safeOverpullLbf: number; // Derated by safety factor
  maximumTensionAtSurfaceLbf: number;
  yieldBurstMpa: number;
  apiBurstMpa: number;
  safeBurstMpa: number;
  collapseMpa: number;
  safeCollapseMpa: number;
  tensileYieldKn: number;
  safeOverpullKn: number;
  safetyFactor: number;
}

export function calculateTubingLimits(
  ct: CoiledTubingString,
  axialTensionLbf: number = 0,
  safetyFactor: number = 0.80
): TubingLimits {
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const ys = ct.yieldStrengthPsi;
  const geom = calculateGeometry(ct);

  // 1. Burst Pressure (API 5ST: P = 2 * YS * t / OD)
  const yieldBurstPressurePsi = (2 * ys * wt) / od;
  const apiBurstPressurePsi = 0.875 * yieldBurstPressurePsi; // API 87.5% nominal wall factor
  const safeBurstPressurePsi = safetyFactor * yieldBurstPressurePsi; // Global safety factor derated working envelope limit

  // 2. Collapse Pressure (API 5C3 formula for D/t categories)
  const dt = geom.dtRatio;
  let nominalCollapsePressurePsi = 0;

  // D/t thresholds for collapse (Yield, Plastic, Transition, Elastic)
  if (dt <= 14) {
    // Yield strength collapse
    nominalCollapsePressurePsi = 2 * ys * ((dt - 1) / (dt * dt));
  } else if (dt <= 25) {
    // Plastic collapse
    const A = 2.8762 + 0.10679e-4 * ys;
    const B = 0.026233 + 0.50609e-6 * ys;
    const C = -465.36 + 0.03076 * ys;
    const pCollapse = ys * (A / dt - B) - C;
    nominalCollapsePressurePsi = Math.max(1000, pCollapse);
  } else {
    // Elastic / Transition collapse
    nominalCollapsePressurePsi = (46.95e6) / (dt * Math.pow(dt - 1, 2));
  }

  // Ovality derating (Haller-Lubinski: P_c_derated ≈ P_c * (1 - 0.03 * ovality%))
  const ovality = ct.ovalityPercent || 0;
  const ovalityFactor = Math.max(0.5, 1 - 0.035 * ovality);
  let ovalityDeratedCollapsePsi = nominalCollapsePressurePsi * ovalityFactor;

  // Axial tension reduces collapse resistance (von Mises ellipse interaction)
  const axialStress = axialTensionLbf / geom.metalAreaSqIn;
  if (axialStress > 0) {
    const stressRatio = Math.min(0.99, axialStress / ys);
    const tensionReduction = Math.sqrt(1 - 0.75 * Math.pow(stressRatio, 2)) - 0.5 * stressRatio;
    ovalityDeratedCollapsePsi *= Math.max(0.2, tensionReduction);
  }

  const safeCollapsePressurePsi = safetyFactor * ovalityDeratedCollapsePsi;

  // 3. Tensile Yield
  const tensileYieldLbf = geom.metalAreaSqIn * ys;
  const safeOverpullLbf = safetyFactor * tensileYieldLbf;
  const maximumTensionAtSurfaceLbf = safeOverpullLbf;

  return {
    yieldBurstPressurePsi,
    apiBurstPressurePsi,
    safeBurstPressurePsi,
    nominalCollapsePressurePsi,
    ovalityDeratedCollapsePsi,
    safeCollapsePressurePsi,
    tensileYieldLbf,
    safeOverpullLbf,
    maximumTensionAtSurfaceLbf,
    yieldBurstMpa: psiToMpa(yieldBurstPressurePsi),
    apiBurstMpa: psiToMpa(apiBurstPressurePsi),
    safeBurstMpa: psiToMpa(safeBurstPressurePsi),
    collapseMpa: psiToMpa(ovalityDeratedCollapsePsi),
    safeCollapseMpa: psiToMpa(safeCollapsePressurePsi),
    tensileYieldKn: lbfToKn(tensileYieldLbf),
    safeOverpullKn: lbfToKn(safeOverpullLbf),
    safetyFactor,
  };
}

// Export calculateCapacities as alias to calculateTubingLimits for backward compatibility
export const calculateCapacities = calculateTubingLimits;

// Generate von Mises Working Envelope Points
export interface EnvelopePoint {
  diffPressurePsi: number; // X-axis (collapse is negative, burst is positive)
  maxTensionLbf: number; // Y-axis top (100% Nominal Yield)
  maxCompressionLbf: number; // Y-axis bottom (100% Nominal Yield)
  safeTensionLbf: number; // Y-axis top (Derated by Safety Factor)
  safeCompressionLbf: number; // Y-axis bottom (Derated by Safety Factor)
}

export function generateWorkingEnvelope(
  ct: CoiledTubingString, 
  numPoints: number = 40,
  safetyFactor: number = 0.80
): EnvelopePoint[] {
  const limits = calculateTubingLimits(ct, 0, safetyFactor);
  const geom = calculateGeometry(ct);
  const ys = ct.yieldStrengthPsi;
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const area = geom.metalAreaSqIn;

  // Diff pressure range: from -collapse to +burst
  const maxCollapse = limits.ovalityDeratedCollapsePsi;
  const maxBurst = limits.yieldBurstPressurePsi;

  const points: EnvelopePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints; // 0 to 1
    const p = -maxCollapse + ratio * (maxBurst + maxCollapse);

    // Mean hoop stress: sigma_theta = p * (OD - t) / (2 * t)
    const sigmaTheta = (p * (od - wt)) / (2 * wt);

    // von Mises 2D plane stress:
    // sigma_a^2 - sigma_a * sigma_theta + sigma_theta^2 = YS^2
    // sigma_a^2 - (sigma_theta) * sigma_a + (sigma_theta^2 - YS^2) = 0
    const discriminant = Math.pow(sigmaTheta, 2) - 4 * 1 * (Math.pow(sigmaTheta, 2) - Math.pow(ys, 2));

    let maxTensionLbf = 0;
    let maxCompressionLbf = 0;

    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      const sigmaA1 = (sigmaTheta + sqrtDisc) / 2;
      const sigmaA2 = (sigmaTheta - sqrtDisc) / 2;

      const tensionStress = Math.max(sigmaA1, sigmaA2);
      const compStress = Math.min(sigmaA1, sigmaA2);

      maxTensionLbf = Math.max(0, tensionStress * area);
      maxCompressionLbf = Math.min(0, compStress * area);
    }

    // Safe Envelope scaled by Safety Factor (e.g. 0.80 = 80%, 0.90 = 90%)
    const safeTensionLbf = maxTensionLbf * safetyFactor;
    const safeCompressionLbf = maxCompressionLbf * safetyFactor;

    points.push({
      diffPressurePsi: p,
      maxTensionLbf,
      maxCompressionLbf,
      safeTensionLbf,
      safeCompressionLbf,
    });
  }

  return points;
}

// Check if an operating point is inside the envelope
export function evaluateOperatingPoint(
  ct: CoiledTubingString,
  diffPressurePsi: number,
  axialTensionLbf: number,
  safetyFactor: number = 0.80
): {
  status: 'safe' | 'caution' | 'critical' | 'violation';
  vonMisesStressPsi: number;
  stressRatioPercent: number;
  message: string;
} {
  const geom = calculateGeometry(ct);
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const ys = ct.yieldStrengthPsi;

  const sigmaA = axialTensionLbf / geom.metalAreaSqIn;
  const sigmaTheta = (diffPressurePsi * (od - wt)) / (2 * wt);

  // von Mises equivalent stress
  const vm = Math.sqrt(Math.pow(sigmaA, 2) - sigmaA * sigmaTheta + Math.pow(sigmaTheta, 2));
  const ratio = (vm / ys) * 100;
  const sfPercent = safetyFactor * 100;

  if (ratio > 100) {
    return {
      status: 'violation',
      vonMisesStressPsi: vm,
      stressRatioPercent: ratio,
      message: 'EXCEEDS YIELD! High probability of permanent plastic deformation or pipe failure.',
    };
  } else if (ratio > sfPercent) {
    return {
      status: 'critical',
      vonMisesStressPsi: vm,
      stressRatioPercent: ratio,
      message: `CRITICAL: Exceeds ${sfPercent.toFixed(0)}% Safe Operating Envelope (SF = ${safetyFactor.toFixed(2)}). Operating beyond safety limit.`,
    };
  } else if (ratio > sfPercent * 0.85) {
    return {
      status: 'caution',
      vonMisesStressPsi: vm,
      stressRatioPercent: ratio,
      message: `CAUTION: Approaching ${sfPercent.toFixed(0)}% safe envelope boundary (SF = ${safetyFactor.toFixed(2)}). Monitor pressure & tension.`,
    };
  }
  return {
    status: 'safe',
    vonMisesStressPsi: vm,
    stressRatioPercent: ratio,
    message: `SAFE: Within ${sfPercent.toFixed(0)}% Safe Operating Envelope (SF = ${safetyFactor.toFixed(2)}).`,
  };
}

// --- USED / REAL SITUATION CONDITION ENGINEERING CALCULATIONS (API RP 5C7 & ICoTA) ---

export function getEffectiveTubingString(
  ct: CoiledTubingString,
  conditionOverride?: UsedCondition
): CoiledTubingString {
  const cond = conditionOverride || ct.usedCondition;
  if (!cond || !cond.enabled) {
    return ct;
  }

  // 1. Wall thinning: t_used = t_nom * (1 - wallLoss% / 100)
  const wallLossFraction = Math.max(0, Math.min(0.50, cond.wallLossPercent / 100));
  const effectiveWall = Math.max(0.02, ct.wallThicknessIn * (1 - wallLossFraction));

  // 2. Diametral growth / ballooning: OD_used = OD_nom * (1 + growth% / 100)
  const growthFraction = Math.max(-0.05, Math.min(0.20, cond.diametralGrowthPercent / 100));
  const effectiveOD = ct.outerDiameterIn * (1 + growthFraction);

  // 3. In-service ovality
  const effectiveOvality = Math.max(0.5, cond.actualOvalityPercent);

  // 4. Corrosion / pitting derating
  let corrosionFactor = 1.0;
  if (cond.corrosionPittingGrade === 'light') corrosionFactor = 0.96;
  else if (cond.corrosionPittingGrade === 'moderate') corrosionFactor = 0.90;
  else if (cond.corrosionPittingGrade === 'severe') corrosionFactor = 0.82;

  // 5. Working section weld factor
  let weldFactor = 1.0;
  if (cond.hasWeldInSection) {
    if (cond.weldType === 'bias') weldFactor = cond.weldEfficiencyFactor || 0.90;
    else if (cond.weldType === 'orbital') weldFactor = 0.80;
    else if (cond.weldType === 'manual') weldFactor = 0.60;
  }

  // 6. Sour service H2S derating (NACE MR0175)
  const h2sFactor = cond.h2sExposure ? 0.90 : 1.0;

  const combinedDerate = corrosionFactor * weldFactor * h2sFactor;
  const effectiveYieldPsi = Math.round(ct.yieldStrengthPsi * combinedDerate);
  const effectiveTensilePsi = Math.round(ct.tensileStrengthPsi * combinedDerate);

  return {
    ...ct,
    outerDiameterIn: Number(effectiveOD.toFixed(4)),
    wallThicknessIn: Number(effectiveWall.toFixed(4)),
    ovalityPercent: Number(effectiveOvality.toFixed(2)),
    yieldStrengthPsi: effectiveYieldPsi,
    specifiedMinYieldPsi: effectiveYieldPsi,
    tensileStrengthPsi: effectiveTensilePsi,
    name: `${ct.name} [Used: ${(100 - cond.wallLossPercent).toFixed(0)}% Wall]`,
  };
}

export interface UsedConditionComparisonResult {
  nominalLimits: TubingLimits;
  usedLimits: TubingLimits;
  nominalGeom: StringGeometry;
  usedGeom: StringGeometry;
  effectiveUsedString: CoiledTubingString;
  remainingWallPercent: number;
  wallLossIn: number;
  odGrowthIn: number;
  burstCapacityLossPercent: number;
  collapseCapacityLossPercent: number;
  tensileCapacityLossPercent: number;
  weightReductionPercent: number;
  internalCapacityGainPercent: number;
  apiRetirementThresholdPercent: number; // 80% remaining wall per API RP 5C7
  apiRetirementMarginPercent: number; // remainingWallPercent - 80
  isRetired: boolean; // remainingWallPercent < 80%
  retirementStatus: 'compliant' | 'caution' | 'critical_retirement';
  statusMessage: string;
}

export function calculateUsedConditionComparison(
  ct: CoiledTubingString,
  axialTensionLbf: number = 0,
  safetyFactor: number = 0.80,
  conditionOverride?: UsedCondition
): UsedConditionComparisonResult {
  const cond = conditionOverride || ct.usedCondition || {
    enabled: true,
    wallLossPercent: 10,
    diametralGrowthPercent: 1.2,
    actualOvalityPercent: 2.0,
    fatigueLifeUsedPercent: 40,
    corrosionPittingGrade: 'light',
    hasWeldInSection: false,
    weldType: 'none',
    weldEfficiencyFactor: 1.0,
    h2sExposure: false,
  };

  const nominalLimits = calculateTubingLimits(ct, axialTensionLbf, safetyFactor);
  const nominalGeom = calculateGeometry(ct);

  const effectiveUsedString = getEffectiveTubingString(ct, cond);
  const usedLimits = calculateTubingLimits(effectiveUsedString, axialTensionLbf, safetyFactor);
  const usedGeom = calculateGeometry(effectiveUsedString);

  const remainingWallPercent = Math.max(0, 100 - cond.wallLossPercent);
  const wallLossIn = ct.wallThicknessIn - effectiveUsedString.wallThicknessIn;
  const odGrowthIn = effectiveUsedString.outerDiameterIn - ct.outerDiameterIn;

  const burstCapacityLossPercent = Math.max(
    0,
    ((nominalLimits.yieldBurstPressurePsi - usedLimits.yieldBurstPressurePsi) / nominalLimits.yieldBurstPressurePsi) * 100
  );
  const collapseCapacityLossPercent = Math.max(
    0,
    ((nominalLimits.ovalityDeratedCollapsePsi - usedLimits.ovalityDeratedCollapsePsi) / nominalLimits.ovalityDeratedCollapsePsi) * 100
  );
  const tensileCapacityLossPercent = Math.max(
    0,
    ((nominalLimits.tensileYieldLbf - usedLimits.tensileYieldLbf) / nominalLimits.tensileYieldLbf) * 100
  );
  const weightReductionPercent = Math.max(
    0,
    ((nominalGeom.weightInAirLbFt - usedGeom.weightInAirLbFt) / nominalGeom.weightInAirLbFt) * 100
  );
  const internalCapacityGainPercent = (
    ((usedGeom.totalCapacityBbl - nominalGeom.totalCapacityBbl) / nominalGeom.totalCapacityBbl) * 100
  );

  const apiRetirementThresholdPercent = 80;
  const apiRetirementMarginPercent = remainingWallPercent - 80;
  const isRetired = remainingWallPercent < 80;

  let retirementStatus: 'compliant' | 'caution' | 'critical_retirement' = 'compliant';
  let statusMessage = `Compliant with API RP 5C7: ${apiRetirementMarginPercent.toFixed(1)}% remaining wall margin before mandatory string retirement.`;

  if (isRetired) {
    retirementStatus = 'critical_retirement';
    statusMessage = `MANDATORY RETIREMENT PER API RP 5C7: Wall thinning exceeds 20% limit (${remainingWallPercent.toFixed(1)}% remaining wall). String must be retired from service!`;
  } else if (apiRetirementMarginPercent <= 5) {
    retirementStatus = 'caution';
    statusMessage = `CAUTION: String is approaching API RP 5C7 retirement limit (${apiRetirementMarginPercent.toFixed(1)}% wall margin remaining). Plan string replacement or cut-back.`;
  }

  return {
    nominalLimits,
    usedLimits,
    nominalGeom,
    usedGeom,
    effectiveUsedString,
    remainingWallPercent,
    wallLossIn,
    odGrowthIn,
    burstCapacityLossPercent,
    collapseCapacityLossPercent,
    tensileCapacityLossPercent,
    weightReductionPercent,
    internalCapacityGainPercent,
    apiRetirementThresholdPercent,
    apiRetirementMarginPercent,
    isRetired,
    retirementStatus,
    statusMessage,
  };
}

export function generateUsedWorkingEnvelope(
  ct: CoiledTubingString,
  numPoints: number = 40,
  safetyFactor: number = 0.80,
  conditionOverride?: UsedCondition
): EnvelopePoint[] {
  const usedString = getEffectiveTubingString(ct, conditionOverride);
  return generateWorkingEnvelope(usedString, numPoints, safetyFactor);
}

// --- HYDRAULICS CALCULATIONS (Churchill + Ito Reel Curvature) ---
export interface HydraulicsResults {
  velocityFtSec: number;
  velocityMSec: number;
  reynoldsNumber: number;
  flowRegime: 'Laminar' | 'Transition' | 'Turbulent';
  frictionFactorStraight: number;
  itoReelCurvatureMultiplier: number;
  frictionFactorCurvedReel: number;
  pressureDropTubingPsi: number;
  pressureDropTubingBar: number;
  nozzlePressureDropPsi: number;
  nozzlePressureDropBar: number;
  annularVelocityFtMin: number;
  annularVelocityMMin: number;
  annularPressureDropPsi: number;
  totalCirculatingPressurePsi: number;
  totalCirculatingPressureBar: number;
  hydraulicHorsepowerHhp: number;
  cuttingsTransportEfficiencyPercent: number;
}

export function calculateHydraulics(
  ct: CoiledTubingString,
  inputs: HydraulicsInput
): HydraulicsResults {
  const geom = calculateGeometry(ct);
  const id = geom.innerDiameterIn;
  const q = inputs.flowRateGpm;
  const rho = inputs.fluidDensityPpg; // ppg
  const mu = Math.max(0.5, inputs.fluidViscosityCp); // cp

  // 1. Fluid Velocity inside CT: v (ft/s) = Q (gpm) / (2.448 * ID²)
  const velocityFtSec = q / (2.448 * id * id);
  const velocityMSec = velocityFtSec * 0.3048;

  // 2. Reynolds Number: Re = 928 * rho * v * ID / mu
  const reynoldsNumber = (928 * rho * velocityFtSec * id) / mu;

  let flowRegime: 'Laminar' | 'Transition' | 'Turbulent' = 'Turbulent';
  if (reynoldsNumber < 2100) {
    flowRegime = 'Laminar';
  } else if (reynoldsNumber < 4000) {
    flowRegime = 'Transition';
  }

  // 3. Straight pipe friction factor (Churchill equation - robust across all regimes)
  const epsilon = 0.0006; // Roughness of commercial coiled tubing (in)
  const relRoughness = epsilon / id;

  const A = Math.pow(
    -2.457 * Math.log(Math.pow(7 / reynoldsNumber, 0.9) + 0.27 * relRoughness),
    16
  );
  const B = Math.pow(37530 / reynoldsNumber, 16);
  const fStraight = 8 * Math.pow(
    Math.pow(8 / reynoldsNumber, 12) + 1 / Math.pow(A + B, 1.5),
    1 / 12
  );

  // 4. Reel Curvature Friction Multiplier (Ito formula & Dean number)
  // Coiled tubing on reel radius R_reel ~ Core OD / 2
  const rTubing = id / 2;
  const rReel = (ct.reelCoreDiameterIn || 72) / 2;
  const deanNumber = reynoldsNumber * Math.sqrt(rTubing / (2 * rReel));

  let itoMultiplier = 1.0;
  if (deanNumber > 30) {
    // Ito empirical multiplier for coiled tubing reel
    itoMultiplier = Math.min(1.45, 1.0 + 0.075 * Math.pow(reynoldsNumber, 0.25) * Math.sqrt(rTubing / rReel));
  }
  const fCurved = fStraight * itoMultiplier;

  // Drag reduction modifier (e.g. Slickwater with polyacrylamide FR)
  const frPct = inputs.frictionReductionPercent || 0;
  const frMultiplier = frPct > 0 ? Math.max(0.25, 1.0 - (frPct / 100)) : 1.0;
  const fStraightEffective = fStraight * frMultiplier;
  const fCurvedEffective = fCurved * frMultiplier;

  // Split tubing length: ~35% on reel, ~65% deployed in wellbore
  const lengthReel = ct.totalLengthFt * 0.35;
  const lengthStraight = ct.totalLengthFt * 0.65;

  // Pressure gradient formula: dP/dL = (f * rho * v²) / (25.8 * ID)  [psi/ft]
  const dP_dL_straight = (fStraightEffective * rho * velocityFtSec * velocityFtSec) / (25.8 * id);
  const dP_dL_curved = (fCurvedEffective * rho * velocityFtSec * velocityFtSec) / (25.8 * id);

  const pressureDropTubingPsi = dP_dL_curved * lengthReel + dP_dL_straight * lengthStraight;

  // 5. Nozzle Pressure Drop
  // Total Flow Area TFA = N * (π/4) * d_nozzle²
  const nozzleCount = Math.max(1, inputs.nozzleCount);
  const dNozzle = Math.max(0.05, inputs.nozzleDiameterIn);
  const tfa = nozzleCount * (Math.PI / 4) * Math.pow(dNozzle, 2);
  const cd = inputs.nozzleCd || 0.95;

  // Delta P nozzle = (1.58 * rho * Q²) / (Cd² * (TFA * 4 / π)²) -> standard oilfield orifice formula:
  // dP = (8.311e-5 * rho * Q²) / (Cd² * TFA²)
  const nozzlePressureDropPsi = (8.311e-5 * rho * Math.pow(q, 2)) / (Math.pow(cd, 2) * Math.pow(tfa, 2));

  // 6. Annular Velocity & Annular Pressure Drop
  const csgId = Math.max(id + 0.5, inputs.casingInnerDiameterIn);
  const avFtMin = (24.51 * q) / (Math.pow(csgId, 2) - Math.pow(ct.outerDiameterIn, 2));
  const avMMin = avFtMin * 0.3048;

  // Cuttings transport efficiency (typical CT hole cleaning: >120 ft/min is good)
  const cuttingsTransportEfficiencyPercent = Math.min(100, Math.max(10, (avFtMin / 150) * 100));

  // Annular friction drop (approximate)
  const dHydraulic = csgId - ct.outerDiameterIn;
  const vAnnularFtSec = avFtMin / 60;
  const reAnnular = (928 * rho * vAnnularFtSec * dHydraulic) / mu;
  const fAnnular = 0.0791 / Math.pow(Math.max(1000, reAnnular), 0.25);
  const annularPressureDropPsi = ((fAnnular * rho * Math.pow(vAnnularFtSec, 2)) / (25.8 * dHydraulic)) * inputs.wellboreDepthFt;

  const totalCirculatingPressurePsi = pressureDropTubingPsi + nozzlePressureDropPsi + annularPressureDropPsi;

  // Hydraulic Horsepower: HHP = (P * Q) / 1714
  const hydraulicHorsepowerHhp = (totalCirculatingPressurePsi * q) / 1714;

  return {
    velocityFtSec,
    velocityMSec,
    reynoldsNumber,
    flowRegime,
    frictionFactorStraight: fStraight,
    itoReelCurvatureMultiplier: itoMultiplier,
    frictionFactorCurvedReel: fCurved,
    pressureDropTubingPsi,
    pressureDropTubingBar: psiToBar(pressureDropTubingPsi),
    nozzlePressureDropPsi,
    nozzlePressureDropBar: psiToBar(nozzlePressureDropPsi),
    annularVelocityFtMin: avFtMin,
    annularVelocityMMin: avMMin,
    annularPressureDropPsi,
    totalCirculatingPressurePsi,
    totalCirculatingPressureBar: psiToBar(totalCirculatingPressurePsi),
    hydraulicHorsepowerHhp,
    cuttingsTransportEfficiencyPercent,
  };
}

// --- WELLBORE FORCES, DRAG & BUCKLING (Dawson-Paslay, Wu-Juvkam-Wold) ---
export interface WellboreForcesResult {
  buoyancyFactor: number;
  buoyedWeightLbFt: number;
  staticHangingWeightLbf: number;
  criticalSinusoidalBucklingLbf: number;
  helicalBucklingThresholdLbf: number;
  helicalLockupDepthFt: number;
  isLockedUp: boolean;
  surfaceSlackoffWeightLbf: number; // RIH
  surfacePickupWeightLbf: number; // POOH
  surfaceNeutralWeightLbf: number;
  totalWellboreDragLbf: number;
  bhaMetrics?: BhaSummaryMetrics;
  weightProfile: {
    depthFt: number;
    slackoffLbf: number;
    neutralLbf: number;
    pickupLbf: number;
    sinusoidalLimitLbf: number;
    helicalLimitLbf: number;
    inclinationDeg?: number;
    tvdFt?: number;
    dls?: number;
    isBhaSegment?: boolean;
    segmentOdIn?: number;
  }[];
  trajectorySummary?: {
    totalMdFt: number;
    maxTvdFt: number;
    maxIncDeg: number;
    maxDlsDegPer100ft: number;
    totalHorizontalDisplacementFt: number;
    stationsCount: number;
  };
}

/**
 * Minimum Curvature Method for Wellbore Survey Calculations
 * Computes interval Dogleg Severity (DLS, deg/100ft), Delta TVD, Delta VS,
 * and updates cumulative TVD and Horizontal Displacement along the trajectory.
 */
export function calculateMinimumCurvature(
  stations: WellboreSurveyStation[]
): WellboreSurveyStation[] {
  if (!stations || stations.length === 0) return [];

  // Sort stations by MD
  const sorted = [...stations].sort((a, b) => a.measuredDepthFt - b.measuredDepthFt);

  const calculated: WellboreSurveyStation[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];

    if (i === 0) {
      calculated.push({
        ...curr,
        measuredDepthFt: 0,
        trueVerticalDepthFt: 0,
        inclinationDeg: Math.max(0, Math.min(180, curr.inclinationDeg || 0)),
        doglegSeverityDegPer100ft: 0,
        horizontalDisplacementFt: 0,
        description: curr.description || 'Surface / Wellhead',
      });
      continue;
    }

    const prev = calculated[i - 1];
    const deltaMd = Math.max(0, curr.measuredDepthFt - prev.measuredDepthFt);

    if (deltaMd === 0) {
      calculated.push({
        ...curr,
        trueVerticalDepthFt: prev.trueVerticalDepthFt,
        doglegSeverityDegPer100ft: 0,
        horizontalDisplacementFt: prev.horizontalDisplacementFt,
      });
      continue;
    }

    const inc1Rad = (prev.inclinationDeg * Math.PI) / 180;
    const inc2Rad = (curr.inclinationDeg * Math.PI) / 180;
    const azi1Rad = ((prev.azimuthDeg ?? 0) * Math.PI) / 180;
    const azi2Rad = ((curr.azimuthDeg ?? 0) * Math.PI) / 180;

    // Dogleg angle beta:
    // cos(beta) = cos(inc2 - inc1) - sin(inc1)*sin(inc2)*(1 - cos(azi2 - azi1))
    const cosBeta = Math.cos(inc2Rad - inc1Rad) - Math.sin(inc1Rad) * Math.sin(inc2Rad) * (1 - Math.cos(azi2Rad - azi1Rad));
    const clampedCosBeta = Math.max(-1, Math.min(1, cosBeta));
    const betaRad = Math.acos(clampedCosBeta);

    // Ratio Factor F:
    let ratioFactor = 1;
    if (betaRad > 1e-5) {
      ratioFactor = (2 / betaRad) * Math.tan(betaRad / 2);
    }

    // Dogleg severity in deg / 100 ft:
    const dls = (betaRad * (180 / Math.PI) / deltaMd) * 100;

    // Delta TVD and Delta Horizontal Displacement (VS)
    const deltaTvd = (deltaMd / 2) * (Math.cos(inc1Rad) + Math.cos(inc2Rad)) * ratioFactor;
    const deltaVs = (deltaMd / 2) * (Math.sin(inc1Rad) + Math.sin(inc2Rad)) * ratioFactor;

    const tvd = (prev.trueVerticalDepthFt ?? 0) + deltaTvd;
    const vs = (prev.horizontalDisplacementFt ?? 0) + deltaVs;

    calculated.push({
      ...curr,
      trueVerticalDepthFt: Number(tvd.toFixed(1)),
      doglegSeverityDegPer100ft: Number(dls.toFixed(2)),
      horizontalDisplacementFt: Number(vs.toFixed(1)),
    });
  }

  return calculated;
}

/**
 * Interpolates wellbore inclination, TVD, VS, and DLS at any given MD along the survey.
 */
export function interpolateSurveyAtDepth(
  stations: WellboreSurveyStation[],
  depthFt: number
): {
  inclinationDeg: number;
  trueVerticalDepthFt: number;
  horizontalDisplacementFt: number;
  doglegSeverityDegPer100ft: number;
} {
  if (!stations || stations.length === 0) {
    return { inclinationDeg: 0, trueVerticalDepthFt: depthFt, horizontalDisplacementFt: 0, doglegSeverityDegPer100ft: 0 };
  }

  if (depthFt <= stations[0].measuredDepthFt) {
    const s0 = stations[0];
    return {
      inclinationDeg: s0.inclinationDeg,
      trueVerticalDepthFt: s0.trueVerticalDepthFt,
      horizontalDisplacementFt: s0.horizontalDisplacementFt ?? 0,
      doglegSeverityDegPer100ft: 0,
    };
  }

  const last = stations[stations.length - 1];
  if (depthFt >= last.measuredDepthFt) {
    const extraMd = depthFt - last.measuredDepthFt;
    const incRad = (last.inclinationDeg * Math.PI) / 180;
    return {
      inclinationDeg: last.inclinationDeg,
      trueVerticalDepthFt: last.trueVerticalDepthFt + extraMd * Math.cos(incRad),
      horizontalDisplacementFt: (last.horizontalDisplacementFt ?? 0) + extraMd * Math.sin(incRad),
      doglegSeverityDegPer100ft: 0,
    };
  }

  for (let i = 0; i < stations.length - 1; i++) {
    const s1 = stations[i];
    const s2 = stations[i + 1];
    if (depthFt >= s1.measuredDepthFt && depthFt <= s2.measuredDepthFt) {
      const span = s2.measuredDepthFt - s1.measuredDepthFt;
      const frac = span > 0 ? (depthFt - s1.measuredDepthFt) / span : 0;
      const inc = s1.inclinationDeg + frac * (s2.inclinationDeg - s1.inclinationDeg);
      const tvd = s1.trueVerticalDepthFt + frac * (s2.trueVerticalDepthFt - s1.trueVerticalDepthFt);
      const vs = (s1.horizontalDisplacementFt ?? 0) + frac * ((s2.horizontalDisplacementFt ?? 0) - (s1.horizontalDisplacementFt ?? 0));
      return {
        inclinationDeg: inc,
        trueVerticalDepthFt: tvd,
        horizontalDisplacementFt: vs,
        doglegSeverityDegPer100ft: s2.doglegSeverityDegPer100ft ?? 0,
      };
    }
  }

  return {
    inclinationDeg: last.inclinationDeg,
    trueVerticalDepthFt: last.trueVerticalDepthFt,
    horizontalDisplacementFt: last.horizontalDisplacementFt ?? 0,
    doglegSeverityDegPer100ft: 0,
  };
}

export function calculateWellboreForces(
  ct: CoiledTubingString,
  inputs: WellboreForcesInput
): WellboreForcesResult {
  const geom = calculateGeometry(ct);
  const wAir = geom.weightInAirLbFt;
  const e = ct.youngsModulusPsi || YOUNGS_MODULUS_PSI;
  const iInertia = geom.momentOfInertiaIn4;
  const csgId = Math.max(ct.outerDiameterIn + 0.25, inputs.casingInnerDiameterIn);
  const radialClearanceIn = (csgId - ct.outerDiameterIn) / 2;

  // 1. Buoyancy factor: BF = 1 - (rho_fluid / rho_steel)
  // Steel density in ppg = 489.54 / 7.4805 * 8.3454 ... steel is ~65.45 ppg (7.85 SG)
  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.6, 1 - inputs.wellboreFluidDensityPpg / steelPpg);
  const buoyedWeightLbFt = wAir * buoyancyFactor;
  const wbLbIn = buoyedWeightLbFt / 12;

  // Lubinski vertical beam-column buckling load: F_vert = 2.05 * (E * I * w_b^2)^(1/3)
  const verticalBucklingLbf = 2.05 * Math.pow(e * iInertia * Math.pow(wbLbIn, 2), 1 / 3);

  const mu = inputs.frictionCoefficientCasing;

  // BHA (Bottom Hole Assembly) configuration metrics
  const hasBha = !!inputs.bhaConfig?.enabled && !!inputs.bhaConfig.segments && inputs.bhaConfig.segments.length > 0;
  const bhaMetrics = hasBha
    ? computeBhaSummaryMetrics(
        inputs.bhaConfig!.segments,
        ct,
        inputs.wellboreFluidDensityPpg,
        csgId,
        inputs.wellboreInclinationDeg,
        mu
      )
    : undefined;

  const bhaLengthFt = (hasBha && bhaMetrics) ? bhaMetrics.totalLengthFt : 0;
  const bhaBuoyedWeightLbs = (hasBha && bhaMetrics) ? bhaMetrics.totalBuoyedWeightLbs : 0;
  const bhaAvgBuoyedLbFt = bhaLengthFt > 0 ? bhaBuoyedWeightLbs / bhaLengthFt : 0;
  const bhaAvgWbLbIn = bhaAvgBuoyedLbFt / 12;
  const bhaEffectiveEi = (hasBha && bhaMetrics) ? bhaMetrics.effectiveStiffnessEi : e * iInertia;
  const bhaAvgOd = (hasBha && bhaMetrics) ? bhaMetrics.avgOuterDiameterIn : ct.outerDiameterIn;
  const bhaRadialClearanceIn = (hasBha && bhaMetrics) ? bhaMetrics.radialClearanceIn : radialClearanceIn;

  // Check if custom survey mode is active
  const isCustomSurvey = inputs.geometryMode === 'custom_survey' && !!inputs.surveyStations && inputs.surveyStations.length >= 2;

  if (isCustomSurvey && inputs.surveyStations) {
    const stations = calculateMinimumCurvature(inputs.surveyStations);
    const totalMd = stations[stations.length - 1].measuredDepthFt;
    const maxTvd = Math.max(...stations.map((s) => s.trueVerticalDepthFt));
    const maxInc = Math.max(...stations.map((s) => s.inclinationDeg));
    const maxDls = Math.max(...stations.map((s) => s.doglegSeverityDegPer100ft ?? 0));
    const totalVs = stations[stations.length - 1].horizontalDisplacementFt ?? 0;

    // Piecewise integration for weight and drag from surface to depth
    const stepCount = 30;
    const depths: number[] = [0];
    for (let i = 1; i <= stepCount; i++) {
      depths.push((i / stepCount) * totalMd);
    }
    // Include exact survey station depths
    for (const st of stations) {
      if (st.measuredDepthFt > 0 && st.measuredDepthFt < totalMd) {
        depths.push(st.measuredDepthFt);
      }
    }
    // Include BHA transition boundary if active
    if (hasBha && bhaLengthFt > 0 && totalMd > bhaLengthFt) {
      depths.push(totalMd - bhaLengthFt);
    }

    depths.sort((a, b) => a - b);
    const uniqueDepths: number[] = [];
    for (const d of depths) {
      if (uniqueDepths.length === 0 || Math.abs(d - uniqueDepths[uniqueDepths.length - 1]) > 5) {
        uniqueDepths.push(d);
      }
    }

    const weightProfile: WellboreForcesResult['weightProfile'] = [];
    let lockupDepthFt = 99999;
    let isLockedUp = false;

    for (const currentMd of uniqueDepths) {
      const { inclinationDeg: localInc, trueVerticalDepthFt: localTvd, doglegSeverityDegPer100ft: localDls } = interpolateSurveyAtDepth(stations, currentMd);

      const incRadLocal = (localInc * Math.PI) / 180;
      const sinIncLocal = Math.sin(incRadLocal);

      // CT Dawson-Paslay critical buckling at local inclination
      const localCritBuckling = localInc < 5
        ? verticalBucklingLbf
        : Math.max(verticalBucklingLbf, 2 * Math.sqrt((e * iInertia * wbLbIn * Math.max(0.01, sinIncLocal)) / radialClearanceIn));
      const localHelicalLimit = 2.828 * localCritBuckling;

      // BHA Dawson-Paslay critical buckling at local inclination (higher stiffness & weight)
      const localBhaCritBuckling = localInc < 5
        ? 2.05 * Math.pow(bhaEffectiveEi * Math.pow(bhaAvgWbLbIn, 2), 1 / 3)
        : Math.max(
            2.05 * Math.pow(bhaEffectiveEi * Math.pow(bhaAvgWbLbIn, 2), 1 / 3),
            2 * Math.sqrt((bhaEffectiveEi * bhaAvgWbLbIn * Math.max(0.01, sinIncLocal)) / bhaRadialClearanceIn)
          );
      const localBhaHelicalLimit = 2.828 * localBhaCritBuckling;

      // Check if this depth point is in the BHA zone at the bottom of the string
      const isPointInBha = hasBha && bhaLengthFt > 0 && currentMd >= Math.max(0, totalMd - bhaLengthFt);

      // Integrate normal contact force and axial weight from surface (0) down to currentMd
      const subSegments = Math.max(10, Math.ceil(currentMd / 200));
      const dz = currentMd / subSegments;
      let cumNormal = 0;
      let cumAxial = 0;

      // The BHA sits at the bottom of the string [currentMd - bhaLengthFt, currentMd]
      const bhaStartDepthForThisMd = Math.max(0, currentMd - bhaLengthFt);

      for (let k = 0; k < subSegments; k++) {
        const zMid = (k + 0.5) * dz;
        const { inclinationDeg: incK, doglegSeverityDegPer100ft: dlsK } = interpolateSurveyAtDepth(stations, zMid);
        const incRadK = (incK * Math.PI) / 180;
        const sinK = Math.sin(incRadK);
        const cosK = Math.cos(incRadK);

        const isMidInBha = hasBha && zMid >= bhaStartDepthForThisMd;
        const localWeightLbFt = isMidInBha ? bhaAvgBuoyedLbFt : buoyedWeightLbFt;

        // Gravity normal force:
        const normGrav = localWeightLbFt * sinK * dz;
        // Curvature capstan contribution (tension through dogleg):
        const dlsRadPerFt = (dlsK * (Math.PI / 180)) / 100;
        const normDls = localWeightLbFt * (currentMd - zMid) * dlsRadPerFt * dz;

        cumNormal += normGrav + normDls;
        cumAxial += localWeightLbFt * cosK * dz;
      }

      const totalDrag = mu * cumNormal;
      const neutralLbf = cumAxial;
      const pickupLbf = neutralLbf + totalDrag;
      const slackoffLbf = neutralLbf - totalDrag;

      // Check for helical lockup during slack-off against active element threshold:
      const activeHelicalThreshold = isPointInBha ? localBhaHelicalLimit : localHelicalLimit;
      if (slackoffLbf < -activeHelicalThreshold && !isLockedUp) {
        isLockedUp = true;
        lockupDepthFt = currentMd;
      }

      weightProfile.push({
        depthFt: currentMd,
        slackoffLbf,
        neutralLbf,
        pickupLbf,
        sinusoidalLimitLbf: isPointInBha ? -localBhaCritBuckling : -localCritBuckling,
        helicalLimitLbf: isPointInBha ? -localBhaHelicalLimit : -localHelicalLimit,
        inclinationDeg: localInc,
        tvdFt: localTvd,
        dls: localDls,
        isBhaSegment: isPointInBha,
        segmentOdIn: isPointInBha ? bhaAvgOd : ct.outerDiameterIn,
      });
    }

    const lastPoint = weightProfile[weightProfile.length - 1];
    const surfaceNeutralWeightLbf = lastPoint ? lastPoint.neutralLbf : 0;
    const surfaceSlackoffWeightLbf = lastPoint ? lastPoint.slackoffLbf : 0;
    const surfacePickupWeightLbf = lastPoint ? lastPoint.pickupLbf : 0;
    const totalWellboreDragLbf = lastPoint ? (lastPoint.pickupLbf - lastPoint.neutralLbf) : 0;

    const minSinusoidal = Math.min(...weightProfile.map((p) => Math.abs(p.sinusoidalLimitLbf)));
    const minHelical = Math.min(...weightProfile.map((p) => Math.abs(p.helicalLimitLbf)));

    return {
      buoyancyFactor,
      buoyedWeightLbFt,
      staticHangingWeightLbf: surfaceNeutralWeightLbf,
      criticalSinusoidalBucklingLbf: minSinusoidal,
      helicalBucklingThresholdLbf: minHelical,
      helicalLockupDepthFt: Math.min(30000, lockupDepthFt),
      isLockedUp,
      surfaceSlackoffWeightLbf,
      surfacePickupWeightLbf,
      surfaceNeutralWeightLbf,
      totalWellboreDragLbf,
      bhaMetrics,
      weightProfile,
      trajectorySummary: {
        totalMdFt: totalMd,
        maxTvdFt: maxTvd,
        maxIncDeg: maxInc,
        maxDlsDegPer100ft: maxDls,
        totalHorizontalDisplacementFt: totalVs,
        stationsCount: stations.length,
      },
    };
  }

  // Constant inclination mode fallback
  const incRad = (inputs.wellboreInclinationDeg * Math.PI) / 180;
  const sinInc = Math.max(0.01, Math.sin(incRad));
  const cosInc = Math.cos(incRad);

  // Dawson-Paslay Critical Sinusoidal Buckling Load for CT:
  const criticalSinusoidalBucklingLbf = inputs.wellboreInclinationDeg < 5
    ? verticalBucklingLbf
    : Math.max(verticalBucklingLbf, 2 * Math.sqrt((e * iInertia * wbLbIn * sinInc) / radialClearanceIn));
  const helicalBucklingThresholdLbf = 2.828 * criticalSinusoidalBucklingLbf;

  // BHA Buckling Limits
  const bhaSinusoidalBucklingLbf = inputs.wellboreInclinationDeg < 5
    ? 2.05 * Math.pow(bhaEffectiveEi * Math.pow(bhaAvgWbLbIn, 2), 1 / 3)
    : Math.max(
        2.05 * Math.pow(bhaEffectiveEi * Math.pow(bhaAvgWbLbIn, 2), 1 / 3),
        2 * Math.sqrt((bhaEffectiveEi * bhaAvgWbLbIn * sinInc) / bhaRadialClearanceIn)
      );
  const bhaHelicalBucklingLbf = 2.828 * bhaSinusoidalBucklingLbf;

  const depth = inputs.measuredDepthFt;
  const ctLen = Math.max(0, depth - bhaLengthFt);
  const actualBhaLen = Math.min(depth, bhaLengthFt);

  // Normal contact force per foot:
  const normalForceTotal = (buoyedWeightLbFt * ctLen + bhaAvgBuoyedLbFt * actualBhaLen) * sinInc;
  const dragForceTotal = mu * normalForceTotal;

  const staticHangingWeightLbf = (buoyedWeightLbFt * ctLen + bhaAvgBuoyedLbFt * actualBhaLen) * cosInc;
  const surfaceNeutralWeightLbf = staticHangingWeightLbf;
  const surfaceSlackoffWeightLbf = Math.max(-50000, surfaceNeutralWeightLbf - dragForceTotal);
  const surfacePickupWeightLbf = surfaceNeutralWeightLbf + dragForceTotal;

  let lockupDepthFt = 99999;
  let isLockedUp = false;
  if (inputs.wellboreInclinationDeg > 50) {
    // Net drag per foot on CT: mu * buoyedWeightLbFt * sinInc - buoyedWeightLbFt * cosInc
    const ctDragUnit = (mu * sinInc - cosInc) * buoyedWeightLbFt;
    const bhaNetPull = bhaAvgBuoyedLbFt * actualBhaLen * (cosInc - mu * sinInc);
    if (ctDragUnit > 0) {
      lockupDepthFt = (helicalBucklingThresholdLbf + bhaNetPull) / ctDragUnit + actualBhaLen;
    }
    if (depth >= lockupDepthFt) {
      isLockedUp = true;
    }
  }

  // Generate depth profile (from surface to total MD)
  const weightProfile: WellboreForcesResult['weightProfile'] = [];
  const steps = 20;
  const depthSamples: number[] = [];
  for (let s = 0; s <= steps; s++) {
    depthSamples.push((s / steps) * depth);
  }
  if (hasBha && bhaLengthFt > 0 && depth > bhaLengthFt) {
    depthSamples.push(depth - bhaLengthFt);
  }
  depthSamples.sort((a, b) => a - b);

  for (const d of depthSamples) {
    const isPointInBha = hasBha && bhaLengthFt > 0 && d >= Math.max(0, depth - bhaLengthFt);
    const dCt = Math.min(d, ctLen);
    const dBha = Math.max(0, d - ctLen);
    const norm = (buoyedWeightLbFt * dCt + bhaAvgBuoyedLbFt * dBha) * sinInc;
    const drag = mu * norm;
    const neut = (buoyedWeightLbFt * dCt + bhaAvgBuoyedLbFt * dBha) * cosInc;

    weightProfile.push({
      depthFt: d,
      slackoffLbf: neut - drag,
      neutralLbf: neut,
      pickupLbf: neut + drag,
      sinusoidalLimitLbf: isPointInBha ? -bhaSinusoidalBucklingLbf : -criticalSinusoidalBucklingLbf,
      helicalLimitLbf: isPointInBha ? -bhaHelicalBucklingLbf : -helicalBucklingThresholdLbf,
      inclinationDeg: inputs.wellboreInclinationDeg,
      tvdFt: d * cosInc,
      dls: 0,
      isBhaSegment: isPointInBha,
      segmentOdIn: isPointInBha ? bhaAvgOd : ct.outerDiameterIn,
    });
  }

  return {
    buoyancyFactor,
    buoyedWeightLbFt,
    staticHangingWeightLbf,
    criticalSinusoidalBucklingLbf,
    helicalBucklingThresholdLbf,
    helicalLockupDepthFt: Math.min(30000, lockupDepthFt),
    isLockedUp,
    surfaceSlackoffWeightLbf,
    surfacePickupWeightLbf,
    surfaceNeutralWeightLbf,
    totalWellboreDragLbf: dragForceTotal,
    bhaMetrics,
    weightProfile,
  };
}

// --- REEL CAPACITY & SPOOLING GEOMETRY ---
export interface ReelSpoolingResult {
  wrapsPerLayer: number;
  totalLayers: number;
  maxCapacityFt: number;
  maxCapacityM: number;
  currentSpoolWeightLbs: number;
  currentSpoolWeightKg: number;
  totalReelWeightGrossLbs: number;
  layerDetails: {
    layerNumber: number;
    layerDiameterIn: number;
    lengthThisLayerFt: number;
    cumulativeLengthFt: number;
  }[];
  spoolFillPercentage: number;
}

export function calculateReelCapacity(
  ct: CoiledTubingString,
  reelEmptyTareLbs: number = 8500
): ReelSpoolingResult {
  const od = ct.outerDiameterIn;
  const coreDia = ct.reelCoreDiameterIn || 72;
  const flangeDia = ct.reelFlangeDiameterIn || 128;
  const width = ct.reelWidthIn || 68;

  // Wraps per layer = floor(Width / OD)
  const wrapsPerLayer = Math.max(1, Math.floor(width / od));

  // Layer radial step: nested hexagonal packing factor ≈ 0.866 * OD
  const radialDepthAvailable = (flangeDia - coreDia) / 2;
  const totalLayers = Math.max(1, Math.floor(radialDepthAvailable / (od * 0.866)));

  let cumulativeLengthFt = 0;
  const layerDetails = [];

  for (let layer = 1; layer <= totalLayers; layer++) {
    // Mean diameter of this layer
    const layerDia = coreDia + (2 * layer - 1) * od * 0.866;
    // Length per wrap = π * layerDia
    const wrapLengthIn = Math.PI * layerDia;
    const layerLengthFt = (wrapLengthIn * wrapsPerLayer) / 12;
    cumulativeLengthFt += layerLengthFt;

    layerDetails.push({
      layerNumber: layer,
      layerDiameterIn: layerDia,
      lengthThisLayerFt: layerLengthFt,
      cumulativeLengthFt,
    });
  }

  const geom = calculateGeometry(ct);
  const currentSpoolWeightLbs = geom.weightInAirLbFt * ct.totalLengthFt;
  const fluidWeightLbs = geom.totalCapacityBbl * 42 * 8.34; // filled with water
  const totalReelWeightGrossLbs = reelEmptyTareLbs + currentSpoolWeightLbs + fluidWeightLbs;

  const spoolFillPercentage = Math.min(100, (ct.totalLengthFt / cumulativeLengthFt) * 100);

  return {
    wrapsPerLayer,
    totalLayers,
    maxCapacityFt: cumulativeLengthFt,
    maxCapacityM: ftToM(cumulativeLengthFt),
    currentSpoolWeightLbs,
    currentSpoolWeightKg: currentSpoolWeightLbs * 0.453592,
    totalReelWeightGrossLbs,
    layerDetails,
    spoolFillPercentage,
  };
}

// --- ACHILLES 4.0 & 3.0 CT FATIGUE LIFE PREDICTION ALGORITHM ---
// Based on Steven M. Tipton, Ph.D., P.E. (The University of Tulsa / CTES, L.P.)
// Ref: "Achilles 4.0 CT Fatigue Life Prediction Algorithm" (2003) & "The Achilles Fatigue Model" (1999)

export function mapGradeToAchilles(grade: string): AchillesMaterialGrade {
  switch (grade) {
    case 'CT70':
      return 'QT-700';
    case 'CT80':
      return 'QT-800';
    case 'CT90':
      return 'HS-90';
    case 'CT100':
      return 'QT-1000';
    case 'CT110':
      return 'HS-110';
    default:
      return 'QT-900';
  }
}

// Solve Manson-Coffin strain-life equation: eps_a = (sigma_f'/E')*(2N)^b + eps_f'*(2N)^c for 2N
export function solveMansonCoffinCycles(
  effectiveStrainAmp: number,
  sigmaFPrimeKsi: number,
  eKsi: number,
  b: number,
  epsilonFPrime: number,
  c: number
): number {
  if (effectiveStrainAmp <= 0) return 1e7;

  // Let x = ln(2N)
  // f(x) = (sigma_f' / E') * exp(b * x) + eps_f' * exp(c * x) - eps_a = 0
  // f'(x) = b * (sigma_f' / E') * exp(b * x) + c * eps_f' * exp(c * x)
  let x = Math.log(Math.max(1e-6, effectiveStrainAmp / Math.max(1e-4, epsilonFPrime))) / c;
  x = Math.max(0, Math.min(20, x));

  for (let iter = 0; iter < 15; iter++) {
    const term1 = (sigmaFPrimeKsi / eKsi) * Math.exp(b * x);
    const term2 = epsilonFPrime * Math.exp(c * x);
    const fVal = term1 + term2 - effectiveStrainAmp;
    const fPrime = b * term1 + c * term2;

    if (Math.abs(fPrime) < 1e-12) break;
    const dx = fVal / fPrime;
    x -= dx;
    if (Math.abs(dx) < 1e-6) break;
  }

  const cycles2N = Math.exp(x);
  return Math.max(2, cycles2N);
}

// Full Achilles 4.0 Fatigue Calculation
export function calculateAchillesFatigue(
  ct: CoiledTubingString,
  currentInternalPressurePsi: number,
  tripsRunSoFar: number = 24,
  overrideGrade?: AchillesMaterialGrade,
  failureCriterion: 'initiation' | 'fracture' = 'fracture'
): AchillesFatigueResult {
  const selectedGrade = overrideGrade || mapGradeToAchilles(ct.grade);
  const matParams = ACHILLES_LCF_MATERIALS[selectedGrade] || ACHILLES_LCF_MATERIALS['QT-900'];

  const d = ct.outerDiameterIn;
  const t = ct.wallThicknessIn;
  const reelRadiusIn = (ct.reelCoreDiameterIn || 72) / 2;
  const gooseneckRadiusIn = ct.gooseneckRadiusIn || 72;

  // EQ 3 & EQ 4: Bending strain and hoop stress
  // Delta eps_x = (D - t) / (2 * R)
  const deltaEpsXReel = (d - t) / (2 * reelRadiusIn);
  const deltaEpsXGooseneck = (d - t) / (2 * gooseneckRadiusIn);

  // sigma_h = P * (D/t - 2) / 2
  const hoopStressPsi = Math.max(0, (currentInternalPressurePsi * (d / t - 2)) / 2);
  const syPsi = matParams.syNomKsi * 1000;
  const hoopStressRatio = hoopStressPsi / syPsi;

  // Active Manson-Coffin parameters based on failure criterion
  const lcfParams = failureCriterion === 'fracture' ? matParams.fracture : matParams.initiation;
  const tf = matParams.tf;

  // 6 standard bending events per trip (Figure 2, Achilles Tech Note)
  const eventTemplates = [
    {
      id: 1,
      name: 'RIH Reel Unspool',
      stage: 'RIH' as const,
      description: 'Bent to straight coming off the reel drum',
      radiusIn: reelRadiusIn,
      deltaEpsX: deltaEpsXReel,
    },
    {
      id: 2,
      name: 'RIH Gooseneck Entry',
      stage: 'RIH' as const,
      description: 'Straight to bent entering the injector guide arch',
      radiusIn: gooseneckRadiusIn,
      deltaEpsX: deltaEpsXGooseneck,
    },
    {
      id: 3,
      name: 'RIH Injector Entry',
      stage: 'RIH' as const,
      description: 'Bent to straight through injector chains into well',
      radiusIn: gooseneckRadiusIn,
      deltaEpsX: deltaEpsXGooseneck,
    },
    {
      id: 4,
      name: 'POOH Injector Exit',
      stage: 'POOH' as const,
      description: 'Straight to bent exiting injector into guide arch',
      radiusIn: gooseneckRadiusIn,
      deltaEpsX: deltaEpsXGooseneck,
    },
    {
      id: 5,
      name: 'POOH Gooseneck Exit',
      stage: 'POOH' as const,
      description: 'Bent to straight leaving guide arch towards reel',
      radiusIn: gooseneckRadiusIn,
      deltaEpsX: deltaEpsXGooseneck,
    },
    {
      id: 6,
      name: 'POOH Reel Spool',
      stage: 'POOH' as const,
      description: 'Straight to bent respooling onto reel drum',
      radiusIn: reelRadiusIn,
      deltaEpsX: deltaEpsXReel,
    },
  ];

  let totalTripDamagePercent = 0;

  const events: AchillesBendingEvent[] = eventTemplates.map((ev) => {
    // Effective strain amplitude:
    // eps_a = (Delta eps_x / 2) with pressure interaction & Tubing Factor (TF)
    const baseStrainAmp = ev.deltaEpsX / 2;
    // Pressure exponent interaction: multiaxial stress amplifies effective plastic strain
    const pressureMultiplier = 1 + 0.95 * Math.pow(hoopStressRatio, 1.35) * Math.sqrt(ev.deltaEpsX * 100);
    // TF empirical shift from Table 1
    const tfEffect = Math.pow(tf, 0.35);
    const epsAEff = baseStrainAmp * pressureMultiplier * tfEffect;

    // Solve Manson-Coffin for 2N cycles to failure for this event
    const cycles2N = solveMansonCoffinCycles(
      epsAEff,
      lcfParams.sigmaFPrimeKsi,
      matParams.eKsi,
      lcfParams.b,
      lcfParams.epsilonFPrime,
      lcfParams.c
    );

    // Damage per event Fi = 1 / (2N) * 100%
    const eventDamagePercent = (1 / cycles2N) * 100;
    totalTripDamagePercent += eventDamagePercent;

    return {
      id: ev.id,
      name: ev.name,
      stage: ev.stage,
      description: ev.description,
      bendingRadiusIn: ev.radiusIn,
      deltaEpsilonXPercent: ev.deltaEpsX * 100,
      effectiveStrainAmpPercent: epsAEff * 100,
      cyclesToFailure2N: Math.round(cycles2N),
      eventDamagePercent,
    };
  });

  const estimatedTotalTripCycles = Math.max(1, Math.round(100 / totalTripDamagePercent));
  const accumulatedUsedLifePercent = Math.min(100, Number((tripsRunSoFar * totalTripDamagePercent).toFixed(1)));
  const remainingTrips = Math.max(0, Math.round(estimatedTotalTripCycles - tripsRunSoFar));

  // Extrapolation Factors (PEFR and PEFP, Page 6 & Table 2)
  const bases = matParams.pefBases;
  const maxDeltaEpsX = Math.max(deltaEpsXReel, deltaEpsXGooseneck);

  let pefrPercent = 0;
  if (maxDeltaEpsX > bases.deltaEpsXMax) {
    pefrPercent = ((maxDeltaEpsX - bases.deltaEpsXMax) / (bases.deltaEpsXMax - bases.deltaEpsXMin)) * 100;
  } else if (maxDeltaEpsX < bases.deltaEpsXMin) {
    pefrPercent = ((bases.deltaEpsXMin - maxDeltaEpsX) / (bases.deltaEpsXMax - bases.deltaEpsXMin)) * 100;
  }

  let pefpPercent = 0;
  const sH = hoopStressRatio;
  if (maxDeltaEpsX > bases.deltaEpsXMax) {
    if (sH > bases.sigmaHSyMax) {
      pefpPercent = ((sH - bases.sigmaHSyMax) / bases.sigmaHSyMax) * 100;
    }
  } else if (maxDeltaEpsX < bases.deltaEpsXMin) {
    if (sH > bases.sigmaHSyMin) {
      pefpPercent = ((sH - bases.sigmaHSyMin) / bases.sigmaHSyMin) * 100;
    }
  } else {
    // Interpolated threshold (sigma_h/Sy)*
    const sHStar = bases.sigmaHSyMin + ((bases.sigmaHSyMax - bases.sigmaHSyMin) / (bases.deltaEpsXMax - bases.deltaEpsXMin)) * (maxDeltaEpsX - bases.deltaEpsXMin);
    if (sH > sHStar) {
      pefpPercent = ((sH - sHStar) / sHStar) * 100;
    }
  }

  const isExtrapolated = pefrPercent > 0.1 || pefpPercent > 0.1;

  // Diametral Growth (Ballooning) & Wall Thinning:
  // Tipton Achilles Model EQ 8: Delta eps_h / Delta N = 5.072277 * [ (sigma_h / sigma_yld) * sqrt(Delta eps_x) ]^2.686058
  const baseGrowthTerm = (hoopStressPsi / syPsi) * Math.sqrt(maxDeltaEpsX);
  const hoopGrowthRatePerCycle = baseGrowthTerm > 0 ? 5.072277 * Math.pow(baseGrowthTerm, 2.686058) : 0;
  // 1 trip = 3 full cycles of alternating tension/compression
  const hoopStrainRatePerTrip = hoopGrowthRatePerCycle * 3;
  const accumulatedHoopStrain = tripsRunSoFar * hoopStrainRatePerTrip;

  // Tipton EQ 10 & 11: Grown diameter D' and thinned wall t'
  // Isovolumetric plastic condition: radial strain eps_r ≈ eps_h
  const ballooningGrowthEstimatedIn = d * accumulatedHoopStrain;
  const grownDiameterIn = d + ballooningGrowthEstimatedIn;
  const thinnedWallIn = Math.max(0.01, t * (1 - accumulatedHoopStrain / 2));
  const wallThinningPercent = ((t - thinnedWallIn) / t) * 100;

  // Welds derating factors (1995 Weld JIP, CTES Achilles Model Page 13):
  // Bias weld: 0.92 derating
  // Orbital butt weld: 0.77 derating
  // Manual butt weld: 0.58 derating
  const biasWeldLifeTrips = Math.round(estimatedTotalTripCycles * 0.92);
  const orbitalButtWeldLifeTrips = Math.round(estimatedTotalTripCycles * 0.77);
  const manualButtWeldLifeTrips = Math.round(estimatedTotalTripCycles * 0.58);

  return {
    selectedGrade,
    materialParams: matParams,
    failureCriterion,
    internalPressurePsi: currentInternalPressurePsi,
    tripsRun: tripsRunSoFar,
    reelRadiusIn,
    gooseneckRadiusIn,
    deltaEpsXReelPercent: deltaEpsXReel * 100,
    deltaEpsXGooseneckPercent: deltaEpsXGooseneck * 100,
    hoopStressPsi,
    hoopStressRatio,
    events,
    tripDamagePercent: totalTripDamagePercent,
    estimatedTotalTripCycles,
    accumulatedUsedLifePercent,
    remainingTrips,
    pefrPercent: Number(pefrPercent.toFixed(1)),
    pefpPercent: Number(pefpPercent.toFixed(1)),
    isExtrapolated,
    hoopStrainRatePerTrip,
    accumulatedHoopStrainPercent: accumulatedHoopStrain * 100,
    grownDiameterIn,
    ballooningGrowthEstimatedIn,
    thinnedWallIn,
    wallThinningPercent,
    biasWeldLifeTrips,
    orbitalButtWeldLifeTrips,
    manualButtWeldLifeTrips,
  };
}

// Backward-compatible wrapper
export interface FatigueResult {
  bendingStrainReelPercent: number;
  bendingStrainGooseneckPercent: number;
  effectivePlasticStrainPercent: number;
  pressureDeratingFactor: number;
  estimatedTotalTripCycles: number;
  accumulatedUsedLifePercent: number;
  remainingTrips: number;
  ballooningGrowthEstimatedIn: number;
}

export function calculateFatigue(
  ct: CoiledTubingString,
  currentInternalPressurePsi: number,
  tripsRunSoFar: number = 24
): FatigueResult {
  const achilles = calculateAchillesFatigue(ct, currentInternalPressurePsi, tripsRunSoFar);
  const maxStrain = Math.max(achilles.deltaEpsXReelPercent, achilles.deltaEpsXGooseneckPercent);

  return {
    bendingStrainReelPercent: achilles.deltaEpsXReelPercent,
    bendingStrainGooseneckPercent: achilles.deltaEpsXGooseneckPercent,
    effectivePlasticStrainPercent: maxStrain,
    pressureDeratingFactor: 1 / Math.max(1, 1 + achilles.hoopStressRatio * 1.5),
    estimatedTotalTripCycles: achilles.estimatedTotalTripCycles,
    accumulatedUsedLifePercent: achilles.accumulatedUsedLifePercent,
    remainingTrips: achilles.remainingTrips,
    ballooningGrowthEstimatedIn: achilles.ballooningGrowthEstimatedIn,
  };
}

// --- STRING STRESS DISTRIBUTION (Axial, Radial, Hoop & Triaxial von Mises) ---
export interface StringStressPoint {
  depthFt: number;
  depthM: number;
  tvdFt: number;
  tvdM: number;
  internalPressurePsi: number;
  internalPressureBar: number;
  externalPressurePsi: number;
  externalPressureBar: number;
  differentialPressurePsi: number;
  differentialPressureBar: number;
  // Axial Force (lbf)
  axialForcePickupLbf: number;
  axialForceSlackoffLbf: number;
  axialForceNeutralLbf: number;
  // Stresses in psi
  axialStressPickupPsi: number;
  axialStressSlackoffPsi: number;
  axialStressNeutralPsi: number;
  hoopStressPsi: number;
  radialStressPsi: number;
  vonMisesPickupPsi: number;
  vonMisesSlackoffPsi: number;
  vonMisesNeutralPsi: number;
  // Stresses in MPa
  axialStressPickupMpa: number;
  axialStressSlackoffMpa: number;
  axialStressNeutralMpa: number;
  hoopStressMpa: number;
  radialStressMpa: number;
  vonMisesPickupMpa: number;
  vonMisesSlackoffMpa: number;
  vonMisesNeutralMpa: number;
  // Utilization ratios (% of Yield Strength)
  utilizationPickupPercent: number;
  utilizationSlackoffPercent: number;
  utilizationNeutralPercent: number;
  statusPickup: 'safe' | 'caution' | 'critical' | 'violation';
}

export interface StressDistributionInput {
  internalSurfacePressurePsi?: number;
  internalFluidDensityPpg?: number;
  externalSurfacePressurePsi?: number;
  steps?: number;
}

export interface StressDistributionResult {
  points: StringStressPoint[];
  maxVonMisesPsi: number;
  maxVonMisesMpa: number;
  maxVonMisesDepthFt: number;
  maxHoopStressPsi: number;
  maxHoopStressMpa: number;
  minHoopStressPsi: number;
  maxRadialStressMagnitudePsi: number;
  maxRadialStressMagnitudeMpa: number;
  surfaceAxialPickupPsi: number;
  surfaceAxialSlackoffPsi: number;
  peakUtilizationPercent: number;
  safeYieldLimitPsi: number;
  safeYieldLimitMpa: number;
  yieldStrengthPsi: number;
  yieldStrengthMpa: number;
}

export function calculateStressDistribution(
  ct: CoiledTubingString,
  forcesInput: WellboreForcesInput,
  options?: StressDistributionInput
): StressDistributionResult {
  const geom = calculateGeometry(ct);
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const id = geom.innerDiameterIn;
  const area = geom.metalAreaSqIn;
  const ysPsi = ct.yieldStrengthPsi;
  const ysMpa = psiToMpa(ysPsi);
  const safeLimitPsi = ysPsi * 0.80;
  const safeLimitMpa = ysMpa * 0.80;

  const depth = Math.max(100, forcesInput.measuredDepthFt);
  const steps = options?.steps ?? 25;
  const pIntSurf = options?.internalSurfacePressurePsi ?? 2500;
  const rhoInt = options?.internalFluidDensityPpg ?? 8.4;
  const pExtSurf = options?.externalSurfacePressurePsi ?? 0;
  const rhoExt = forcesInput.wellboreFluidDensityPpg;

  const hasCustomSurvey = forcesInput.geometryMode === 'custom_survey' && !!forcesInput.surveyStations && forcesInput.surveyStations.length >= 2;
  const surveyStations = hasCustomSurvey && forcesInput.surveyStations ? calculateMinimumCurvature(forcesInput.surveyStations) : [];

  const incRad = (forcesInput.wellboreInclinationDeg * Math.PI) / 180;
  const sinInc = Math.max(0.001, Math.sin(incRad));
  const cosInc = Math.cos(incRad);

  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.6, 1 - rhoExt / steelPpg);
  const buoyedWeightLbFt = geom.weightInAirLbFt * buoyancyFactor;
  const mu = forcesInput.frictionCoefficientCasing;

  const points: StringStressPoint[] = [];
  let maxVonMisesPsi = 0;
  let maxVonMisesDepthFt = 0;
  let maxHoopStressPsi = -Infinity;
  let minHoopStressPsi = Infinity;
  let maxRadialStressMagPsi = 0;
  let peakUtilizationPercent = 0;

  for (let s = 0; s <= steps; s++) {
    const z = (s / steps) * depth;
    let tvdFt = z * cosInc;
    let localCosInc = cosInc;
    let localSinInc = sinInc;

    if (hasCustomSurvey && surveyStations.length >= 2) {
      const interp = interpolateSurveyAtDepth(surveyStations, z);
      tvdFt = interp.trueVerticalDepthFt;
      const localIncRad = (interp.inclinationDeg * Math.PI) / 180;
      localCosInc = Math.cos(localIncRad);
      localSinInc = Math.max(0.001, Math.sin(localIncRad));
    }

    const tvdM = ftToM(tvdFt);
    const depthM = ftToM(z);

    // Hydrostatic + surface pressures
    const pInt = pIntSurf + 0.052 * rhoInt * tvdFt;
    const pExt = pExtSurf + 0.052 * rhoExt * tvdFt;
    const deltaP = pInt - pExt;

    // Remaining length suspended below depth z
    const remLength = Math.max(0, depth - z);
    const suspendedBuoyedWeight = buoyedWeightLbFt * remLength * localCosInc;
    const drag = mu * buoyedWeightLbFt * localSinInc * remLength;

    // Axial forces at depth z
    const fPickup = suspendedBuoyedWeight + drag;
    const fSlackoff = suspendedBuoyedWeight - drag;
    const fNeutral = suspendedBuoyedWeight;

    // Axial stresses: sigma_a = F / A
    const sigmaAPickup = fPickup / area;
    const sigmaASlackoff = fSlackoff / area;
    const sigmaANeutral = fNeutral / area;

    // Average Hoop Stress across wall: (Pi * ID - Po * OD) / (2 * t)
    const sigmaHoop = (pInt * id - pExt * od) / (2 * wt);

    // Average Radial Stress across wall: -(Pi + Po) / 2
    const sigmaRadial = -(pInt + pExt) / 2;

    // 3D Triaxial von Mises Stress:
    // sqrt( 0.5 * [ (sigma_a - sigma_h)^2 + (sigma_h - sigma_r)^2 + (sigma_r - sigma_a)^2 ] )
    const calcVm = (sigmaA: number) => {
      const term1 = Math.pow(sigmaA - sigmaHoop, 2);
      const term2 = Math.pow(sigmaHoop - sigmaRadial, 2);
      const term3 = Math.pow(sigmaRadial - sigmaA, 2);
      return Math.sqrt(0.5 * (term1 + term2 + term3));
    };

    const vmPickup = calcVm(sigmaAPickup);
    const vmSlackoff = calcVm(sigmaASlackoff);
    const vmNeutral = calcVm(sigmaANeutral);

    const utilPickup = (vmPickup / ysPsi) * 100;
    const utilSlackoff = (vmSlackoff / ysPsi) * 100;
    const utilNeutral = (vmNeutral / ysPsi) * 100;

    let statusPickup: 'safe' | 'caution' | 'critical' | 'violation' = 'safe';
    if (utilPickup > 100) statusPickup = 'violation';
    else if (utilPickup > 80) statusPickup = 'critical';
    else if (utilPickup > 65) statusPickup = 'caution';

    if (vmPickup > maxVonMisesPsi) {
      maxVonMisesPsi = vmPickup;
      maxVonMisesDepthFt = z;
    }
    if (sigmaHoop > maxHoopStressPsi) maxHoopStressPsi = sigmaHoop;
    if (sigmaHoop < minHoopStressPsi) minHoopStressPsi = sigmaHoop;
    if (Math.abs(sigmaRadial) > maxRadialStressMagPsi) maxRadialStressMagPsi = Math.abs(sigmaRadial);
    if (utilPickup > peakUtilizationPercent) peakUtilizationPercent = utilPickup;

    points.push({
      depthFt: Math.round(z),
      depthM: Math.round(depthM),
      tvdFt: Math.round(tvdFt),
      tvdM: Math.round(tvdM),
      internalPressurePsi: Math.round(pInt),
      internalPressureBar: Math.round(psiToBar(pInt)),
      externalPressurePsi: Math.round(pExt),
      externalPressureBar: Math.round(psiToBar(pExt)),
      differentialPressurePsi: Math.round(deltaP),
      differentialPressureBar: Math.round(psiToBar(deltaP)),
      axialForcePickupLbf: Math.round(fPickup),
      axialForceSlackoffLbf: Math.round(fSlackoff),
      axialForceNeutralLbf: Math.round(fNeutral),
      axialStressPickupPsi: Math.round(sigmaAPickup),
      axialStressSlackoffPsi: Math.round(sigmaASlackoff),
      axialStressNeutralPsi: Math.round(sigmaANeutral),
      hoopStressPsi: Math.round(sigmaHoop),
      radialStressPsi: Math.round(sigmaRadial),
      vonMisesPickupPsi: Math.round(vmPickup),
      vonMisesSlackoffPsi: Math.round(vmSlackoff),
      vonMisesNeutralPsi: Math.round(vmNeutral),
      axialStressPickupMpa: Number(psiToMpa(sigmaAPickup).toFixed(1)),
      axialStressSlackoffMpa: Number(psiToMpa(sigmaASlackoff).toFixed(1)),
      axialStressNeutralMpa: Number(psiToMpa(sigmaANeutral).toFixed(1)),
      hoopStressMpa: Number(psiToMpa(sigmaHoop).toFixed(1)),
      radialStressMpa: Number(psiToMpa(sigmaRadial).toFixed(1)),
      vonMisesPickupMpa: Number(psiToMpa(vmPickup).toFixed(1)),
      vonMisesSlackoffMpa: Number(psiToMpa(vmSlackoff).toFixed(1)),
      vonMisesNeutralMpa: Number(psiToMpa(vmNeutral).toFixed(1)),
      utilizationPickupPercent: Number(utilPickup.toFixed(1)),
      utilizationSlackoffPercent: Number(utilSlackoff.toFixed(1)),
      utilizationNeutralPercent: Number(utilNeutral.toFixed(1)),
      statusPickup,
    });
  }

  const surfacePoint = points[0] || {} as StringStressPoint;

  return {
    points,
    maxVonMisesPsi: Math.round(maxVonMisesPsi),
    maxVonMisesMpa: Number(psiToMpa(maxVonMisesPsi).toFixed(1)),
    maxVonMisesDepthFt,
    maxHoopStressPsi: Math.round(maxHoopStressPsi),
    maxHoopStressMpa: Number(psiToMpa(maxHoopStressPsi).toFixed(1)),
    minHoopStressPsi: Math.round(minHoopStressPsi),
    maxRadialStressMagnitudePsi: Math.round(maxRadialStressMagPsi),
    maxRadialStressMagnitudeMpa: Number(psiToMpa(maxRadialStressMagPsi).toFixed(1)),
    surfaceAxialPickupPsi: surfacePoint.axialStressPickupPsi || 0,
    surfaceAxialSlackoffPsi: surfacePoint.axialStressSlackoffPsi || 0,
    peakUtilizationPercent: Number(peakUtilizationPercent.toFixed(1)),
    safeYieldLimitPsi: Math.round(safeLimitPsi),
    safeYieldLimitMpa: Number(safeLimitMpa.toFixed(1)),
    yieldStrengthPsi: ysPsi,
    yieldStrengthMpa: Number(ysMpa.toFixed(1)),
  };
}

// --- FATIGUE OPERATIONS LOGGING & CUMULATIVE FATIGUE UNITS (FU) ---
export interface OperationFatigueCalcResult {
  deltaFatigueUnits: number; // ΔFU (% of fatigue life consumed by this operation)
  bendingCycles: number; // Total bending reversals
  damagePerTripPercent: number; // % damage per full trip at this pressure
  damagePerRecipPercent: number; // % damage per reciprocation cycle across arch
  hoopStressPsi: number;
  hoopStressRatio: number;
}

export function calculateOperationFatigue(
  ct: CoiledTubingString,
  circulatingPressurePsi: number,
  trips: number,
  reciprocations: number,
  overrideGrade?: AchillesMaterialGrade,
  failureCriterion: 'initiation' | 'fracture' = 'fracture'
): OperationFatigueCalcResult {
  const safeTrips = Math.max(0, trips);
  const safeRecip = Math.max(0, reciprocations);
  const safePressure = Math.max(0, circulatingPressurePsi);

  // Compute base single trip response under the operation's specific circulating pressure
  const achilles = calculateAchillesFatigue(
    ct,
    safePressure,
    1,
    overrideGrade,
    failureCriterion
  );

  const damagePerTrip = achilles.tripDamagePercent;

  // Reciprocations involve guide arch events (Events 2, 3, 4, 5)
  // Each reciprocation passes through the injector and guide arch
  const archEvents = achilles.events.filter(
    (e) => e.name.includes('Gooseneck') || e.name.includes('Injector')
  );
  const damagePerRecip = archEvents.reduce((acc, ev) => acc + ev.eventDamagePercent, 0);

  const deltaFatigueUnits = (safeTrips * damagePerTrip) + (safeRecip * damagePerRecip);
  const bendingCycles = (6 * safeTrips) + (4 * safeRecip);

  return {
    deltaFatigueUnits: Number(deltaFatigueUnits.toFixed(4)),
    bendingCycles,
    damagePerTripPercent: Number(damagePerTrip.toFixed(4)),
    damagePerRecipPercent: Number(damagePerRecip.toFixed(4)),
    hoopStressPsi: Math.round(achilles.hoopStressPsi),
    hoopStressRatio: Number(achilles.hoopStressRatio.toFixed(3)),
  };
}

// --- CALCULATION HISTORY & METRICS SNAPSHOT HELPERS ---
export function generateMetricsSummary(
  ct: CoiledTubingString,
  operatingPressurePsi: number = 3500,
  operatingTensionLbf: number = 0
): CalculationMetricsSummary {
  const geom = calculateGeometry(ct);
  const limits = calculateTubingLimits(ct, operatingTensionLbf);
  
  // Fatigue estimate at 3500 psi
  let fatigueLifeTrips: number | undefined;
  let tripDamagePercent: number | undefined;
  try {
    const fatigue = calculateAchillesFatigue(ct, operatingPressurePsi, 1);
    fatigueLifeTrips = fatigue.estimatedTotalTripCycles;
    tripDamagePercent = Number(fatigue.tripDamagePercent.toFixed(3));
  } catch {
    // Graceful fallback if fatigue parameters cannot be computed
  }

  return {
    outerDiameterIn: ct.outerDiameterIn,
    wallThicknessIn: ct.wallThicknessIn,
    innerDiameterIn: geom.innerDiameterIn,
    yieldStrengthPsi: ct.yieldStrengthPsi,
    totalLengthFt: ct.totalLengthFt,
    weightInAirLbFt: geom.weightInAirLbFt,
    totalWeightLbs: geom.totalWeightInAirLbs,
    totalCapacityBbl: geom.totalCapacityBbl,
    dtRatio: geom.dtRatio,
    apiBurstPressurePsi: limits.apiBurstPressurePsi,
    collapsePressurePsi: limits.ovalityDeratedCollapsePsi,
    tensileYieldLbf: limits.tensileYieldLbf,
    safeOverpullLbf: limits.safeOverpullLbf,
    estimatedFatigueLifeTrips: fatigueLifeTrips,
    tripDamagePercent,
    operatingPressurePsi,
    operatingTensionLbf,
  };
}

export function createCalculationHistoryEntry(
  ct: CoiledTubingString,
  sourceTab: CalculationTabSource = 'manual',
  customTitle?: string,
  notes?: string
): CalculationHistoryEntry {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const metrics = generateMetricsSummary(ct);
  const defaultTitle = customTitle || `${ct.name} (${ct.outerDiameterIn}" × ${ct.wallThicknessIn}")`;

  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now.toISOString(),
    displayTime: `${dateStr} ${timeStr}`,
    title: defaultTitle,
    sourceTab,
    stringSnapshot: JSON.parse(JSON.stringify(ct)),
    metrics,
    notes,
    isBookmarked: false,
  };
}

