import { CoiledTubingString, TfaDataPoint, TfaChartConfig, UnitSystem } from '../types/coiledTubing';
import { ftToM, mToFt, lbfToKn, knToLbf, calculateGeometry } from './engineeringCalculations';

export interface TfaPredictedPoint {
  depthM: number;
  depthFt: number;
  expectedPohLbf: number;
  expectedRihLbf: number;
  oplimPohLbf: number;
  oplimRihLbf: number;
  frictionLockRihLbf: number;
  neutralWeightLbf: number;
  normalForceLbf: number;
}

export interface TfaFitStatistics {
  count: number;
  maeLbf: number;
  rmseLbf: number;
  rSquared: number;
  calibratedFriction: number;
  maxDeltaLbf: number;
  maxDeltaDepthM: number;
  rihCount: number;
  pohCount: number;
  avgApparentFriction: number;
  dragDiscrepancyStatus: 'EXCELLENT_MATCH' | 'MODERATE_OFFSET' | 'HIGH_FRICTION_ANOMALY' | 'BUCKLING_WARNING';
  diagnosticSummary: string;
}

/**
 * Helper to auto-increment a well identifier for the "Next Well" operation
 * E.g., 'MRJN-764' -> 'MRJN-765', 'WELL-01' -> 'WELL-02', 'PAD-B' -> 'PAD-B-02'
 */
export function getNextWellId(currentWellName: string): string {
  const trimmed = (currentWellName || 'WELL-01').trim();
  // Regex to match trailing number: e.g. "MRJN-764" -> prefix="MRJN-", num="764"
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    // Preserve leading zeros: e.g. "01" -> "02"
    const paddedNum = nextNum.toString().padStart(numStr.length, '0');
    return `${prefix}${paddedNum}`;
  }
  return `${trimmed}-02`;
}

/**
 * Generate initial data points for a new or next well
 */
export function generateNewWellRunLog(
  targetDepthM: number,
  mode: 'blank' | 'sample' | 'offset' = 'sample'
): TfaDataPoint[] {
  if (mode === 'blank') {
    return [
      {
        id: `init-${Date.now()}`,
        depthM: 0,
        depthFt: 0,
        expectedPohLbf: 800,
        expectedRihLbf: -140,
        eWeightLbf: -140,
        operation: 'RIH',
        speedMPerMin: 15,
        notes: 'Surface tare zero (initial datum)',
      },
    ];
  }

  const count = 10;
  const step = targetDepthM / count;
  const points: TfaDataPoint[] = [];

  for (let i = 0; i <= count; i++) {
    const dM = Math.round(i * step);
    const dFt = mToFt(dM);
    const fraction = dM / (targetDepthM || 1);
    const approxWeight = Math.round(-140 + fraction * 22000 + (mode === 'offset' ? 1200 : 0));
    const op: TfaDataPoint['operation'] = i === count ? 'TAG_BOTTOM' : i % 3 === 0 ? 'WIPER' : 'RIH';

    points.push({
      id: `new-${i}-${Date.now()}`,
      depthM: dM,
      depthFt: dFt,
      expectedPohLbf: approxWeight + 3500,
      expectedRihLbf: approxWeight - 1500,
      eWeightLbf: approxWeight,
      operation: op,
      speedMPerMin: op === 'TAG_BOTTOM' ? 5 : 18,
      notes: op === 'TAG_BOTTOM' ? 'TD Tag' : op === 'WIPER' ? `Pick-up check at ${dM}m` : `Steady RIH at ${dM}m`,
    });
  }

  return points;
}

/**
 * Generate full predicted curves for POH, RIH, OPLIM, and Friction Lock
 */
export function calculateTfaPredictedCurve(
  ct: CoiledTubingString,
  config: TfaChartConfig,
  maxDepthM: number,
  pointsCount: number = 120,
  wellPreset: 'MRJN-764' | 'DEEP-GAS' | 'EXTENDED-REACH' | 'CUSTOM' = 'MRJN-764'
): TfaPredictedPoint[] {
  const geom = calculateGeometry(ct);
  const wAirLbFt = geom.weightInAirLbFt;
  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.55, 1 - config.fluidDensityPpg / steelPpg);
  const wBuoyedLbFt = wAirLbFt * buoyancyFactor;
  const wBuoyedLbM = wBuoyedLbFt * 3.28084; // buoyed weight per meter

  // Piston force from wellhead pressure across CT outer diameter: F_up = WHP * pi/4 * OD^2
  const odIn = ct.outerDiameterIn;
  const areaOdSqIn = (Math.PI / 4) * odIn * odIn;
  const pistonUpthrustLbf = config.whpPsi * areaOdSqIn;
  // Stripper friction (typically 600 - 1500 lbf depending on WHP and packoff)
  const stripperFrictionLbf = 800 + config.whpPsi * 0.15;

  // Tensile yield of string
  const tensileYieldLbf = ct.yieldStrengthPsi * geom.metalAreaSqIn;
  const safeOverpullCapLbf = tensileYieldLbf * 0.8;

  const effectiveMaxDepth = config.targetDepthM && config.targetDepthM > 0 ? config.targetDepthM : maxDepthM;
  const stepM = effectiveMaxDepth / pointsCount;
  const curve: TfaPredictedPoint[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const dM = i * stepM;
    const dFt = mToFt(dM);

    // Wellbore deviation profile based on preset or custom well configuration
    let avgIncDeg = 15;
    if (config.wellTrajectory === 'vertical') {
      avgIncDeg = Math.min(3, 0.5 + (dM / effectiveMaxDepth) * 2);
    } else if (config.wellTrajectory === 'horizontal' || wellPreset === 'EXTENDED-REACH') {
      const kop = config.kickoffDepthM ?? 800;
      const targetInc = config.maxInclinationDeg ?? 88;
      avgIncDeg = dM < kop ? 3 : Math.min(targetInc, 3 + ((dM - kop) / Math.max(200, effectiveMaxDepth - kop)) * (targetInc - 3));
    } else if (config.wellTrajectory === 'deep_gas' || wellPreset === 'DEEP-GAS') {
      const kop = config.kickoffDepthM ?? 1200;
      const targetInc = config.maxInclinationDeg ?? 35;
      avgIncDeg = dM < kop ? 4 : Math.min(targetInc, 4 + ((dM - kop) / 2000) * (targetInc - 4));
    } else if (config.maxInclinationDeg !== undefined && config.maxInclinationDeg > 0) {
      const kop = config.kickoffDepthM ?? 500;
      avgIncDeg = dM < kop ? 2 : Math.min(config.maxInclinationDeg, 2 + ((dM - kop) / Math.max(200, effectiveMaxDepth - kop)) * config.maxInclinationDeg);
    } else if (wellPreset === 'MRJN-764') {
      avgIncDeg = dM < 500 ? 2 : Math.min(52, 2 + ((dM - 500) / 1300) * 48);
    }

    const incRad = (avgIncDeg * Math.PI) / 180;
    const cosInc = Math.cos(incRad);
    const sinInc = Math.sin(incRad);

    // True Vertical Depth component and Normal contact force (weight * sin(inc) + small residual dogleg contact)
    const normalContactForceLbf = (wBuoyedLbM * sinInc * dM) + (dM > 1000 ? 800 : 200);
    const cumulativeDragLbf = config.frictionCasing * normalContactForceLbf;

    // Axial string buoyed weight in wellbore
    const axialWeightLbf = wBuoyedLbM * cosInc * dM;
    const neutralWeightLbf = axialWeightLbf - pistonUpthrustLbf + config.weightOffsetLbf;

    // Surface POH = Axial Weight + Drag + Stripper Friction - Piston Upthrust + Weight Offset
    const rawPoh = axialWeightLbf + cumulativeDragLbf + stripperFrictionLbf - pistonUpthrustLbf + config.weightOffsetLbf;
    // Surface RIH = Axial Weight - Drag - Stripper Friction - Piston Upthrust + Weight Offset
    const rawRih = axialWeightLbf - cumulativeDragLbf - stripperFrictionLbf - pistonUpthrustLbf + config.weightOffsetLbf;

    // OPLIM POH = Safe yield limit minus residual tension
    const oplimPoh = Math.min(38000, safeOverpullCapLbf * 0.75 + (dM / effectiveMaxDepth) * 6000);
    // Friction lock threshold (when compression exceeds helical buckling limit)
    const frictionLock = Math.max(0, 18000 - (dM / effectiveMaxDepth) * 16000);

    curve.push({
      depthM: dM,
      depthFt: dFt,
      expectedPohLbf: Math.max(0, rawPoh),
      expectedRihLbf: rawRih,
      oplimPohLbf: oplimPoh,
      oplimRihLbf: 32000,
      frictionLockRihLbf: frictionLock,
      neutralWeightLbf,
      normalForceLbf: Math.max(1, normalContactForceLbf),
    });
  }

  return curve;
}

/**
 * Interpolate predicted curve values at a specific depth
 */
export function interpolatePredictedAtDepth(
  depthM: number,
  curve: TfaPredictedPoint[]
): TfaPredictedPoint {
  if (curve.length === 0) {
    return {
      depthM,
      depthFt: mToFt(depthM),
      expectedPohLbf: 0,
      expectedRihLbf: 0,
      oplimPohLbf: 35000,
      oplimRihLbf: 32000,
      frictionLockRihLbf: 10000,
      neutralWeightLbf: 0,
      normalForceLbf: 1000,
    };
  }

  if (depthM <= curve[0].depthM) return curve[0];
  if (depthM >= curve[curve.length - 1].depthM) return curve[curve.length - 1];

  let low = 0;
  let high = curve.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (curve[mid].depthM === depthM) return curve[mid];
    if (curve[mid].depthM < depthM) low = mid + 1;
    else high = mid - 1;
  }

  const idx = Math.max(0, high);
  const nextIdx = Math.min(curve.length - 1, idx + 1);
  const p1 = curve[idx];
  const p2 = curve[nextIdx];

  const span = p2.depthM - p1.depthM;
  const factor = span > 0 ? (depthM - p1.depthM) / span : 0;

  return {
    depthM,
    depthFt: mToFt(depthM),
    expectedPohLbf: p1.expectedPohLbf + factor * (p2.expectedPohLbf - p1.expectedPohLbf),
    expectedRihLbf: p1.expectedRihLbf + factor * (p2.expectedRihLbf - p1.expectedRihLbf),
    oplimPohLbf: p1.oplimPohLbf + factor * (p2.oplimPohLbf - p1.oplimPohLbf),
    oplimRihLbf: 32000,
    frictionLockRihLbf: p1.frictionLockRihLbf + factor * (p2.frictionLockRihLbf - p1.frictionLockRihLbf),
    neutralWeightLbf: p1.neutralWeightLbf + factor * (p2.neutralWeightLbf - p1.neutralWeightLbf),
    normalForceLbf: p1.normalForceLbf + factor * (p2.normalForceLbf - p1.normalForceLbf),
  };
}

/**
 * Calculate enriched metrics for an actual data point
 */
export function enrichActualPoint(
  point: TfaDataPoint,
  curve: TfaPredictedPoint[]
): TfaDataPoint {
  const pred = interpolatePredictedAtDepth(point.depthM, curve);
  const actualW = point.eWeightLbf ?? 0;
  const op = point.operation || 'RIH';

  // Determine target reference weight
  let targetExpectedW = pred.expectedRihLbf;
  if (op === 'POH') {
    targetExpectedW = pred.expectedPohLbf;
  } else if (op === 'WIPER') {
    targetExpectedW = (pred.expectedPohLbf + pred.expectedRihLbf) / 2;
  } else if (op === 'STATIC') {
    targetExpectedW = pred.neutralWeightLbf;
  } else if (op === 'TAG_BOTTOM') {
    targetExpectedW = pred.expectedRihLbf;
  }

  const deltaLbf = actualW - targetExpectedW;

  // Back-calculated apparent friction factor
  // Since deltaW ≈ ± mu * NormalForce
  const normalF = Math.max(100, pred.normalForceLbf);
  const dragObserved = Math.abs(actualW - pred.neutralWeightLbf);
  const apparentFriction = Math.min(0.85, Math.max(0.04, dragObserved / normalF));

  // Overpull / yield margin
  const safetyMarginLbf = (pred.oplimPohLbf || 35000) - actualW;

  return {
    ...point,
    depthFt: mToFt(point.depthM),
    expectedPohLbf: pred.expectedPohLbf,
    expectedRihLbf: pred.expectedRihLbf,
    oplimPohLbf: pred.oplimPohLbf,
    frictionLockRihLbf: pred.frictionLockRihLbf,
    deltaLbf,
    backCalculatedFriction: apparentFriction,
    safetyMarginLbf,
  };
}

/**
 * Calculate statistics & calibrated friction factor from actual input data
 */
export function calculateTfaFitStatistics(
  actualPoints: TfaDataPoint[],
  curve: TfaPredictedPoint[],
  currentCasingMu: number
): TfaFitStatistics {
  const validPoints = actualPoints.filter((p) => p.eWeightLbf !== undefined && !isNaN(p.eWeightLbf));

  if (validPoints.length === 0) {
    return {
      count: 0,
      maeLbf: 0,
      rmseLbf: 0,
      rSquared: 1,
      calibratedFriction: currentCasingMu,
      maxDeltaLbf: 0,
      maxDeltaDepthM: 0,
      rihCount: 0,
      pohCount: 0,
      avgApparentFriction: currentCasingMu,
      dragDiscrepancyStatus: 'EXCELLENT_MATCH',
      diagnosticSummary: 'No actual field data points entered yet. Ready for data input or preset import.',
    };
  }

  let sumAbsDelta = 0;
  let sumSqDelta = 0;
  let maxDelta = 0;
  let maxDeltaDepth = 0;
  let rihCount = 0;
  let pohCount = 0;
  let sumApparentMu = 0;

  // For least-squares calibration of friction factor:
  // We model: (Actual_W - Neutral_W) = sign * mu_cal * Normal_F
  // Minimizing sum( ( (Actual_W - Neutral_W) - sign * mu * Normal_F )^2 )
  let numerator = 0;
  let denominator = 0;

  validPoints.forEach((p) => {
    const enriched = enrichActualPoint(p, curve);
    const pred = interpolatePredictedAtDepth(p.depthM, curve);
    const actualW = p.eWeightLbf!;
    const op = p.operation || 'RIH';

    const delta = Math.abs(enriched.deltaLbf || 0);
    sumAbsDelta += delta;
    sumSqDelta += delta * delta;

    if (delta > maxDelta) {
      maxDelta = delta;
      maxDeltaDepth = p.depthM;
    }

    if (op === 'RIH') rihCount++;
    else if (op === 'POH') pohCount++;

    sumApparentMu += enriched.backCalculatedFriction || currentCasingMu;

    // Direction sign: RIH has negative drag (slack-off), POH has positive drag (pull)
    const sign = op === 'POH' ? 1 : op === 'RIH' ? -1 : 0;
    const normalF = pred.normalForceLbf;
    const dragObserved = actualW - pred.neutralWeightLbf;

    if (sign !== 0 && normalF > 50) {
      numerator += dragObserved * (sign * normalF);
      denominator += (normalF * normalF);
    }
  });

  const count = validPoints.length;
  const maeLbf = sumAbsDelta / count;
  const rmseLbf = Math.sqrt(sumSqDelta / count);
  const avgApparentFriction = sumApparentMu / count;

  let calibratedFriction = currentCasingMu;
  if (denominator > 0) {
    const rawMu = numerator / denominator;
    // Constrain to physically realistic casing friction range (0.12 - 0.48)
    calibratedFriction = Math.min(0.48, Math.max(0.12, parseFloat(rawMu.toFixed(3))));
  } else {
    calibratedFriction = parseFloat(avgApparentFriction.toFixed(3));
  }

  // Calculate R-squared correlation
  const actualMean = validPoints.reduce((acc, p) => acc + (p.eWeightLbf || 0), 0) / count;
  const ssTotal = validPoints.reduce((acc, p) => acc + Math.pow((p.eWeightLbf || 0) - actualMean, 2), 0);
  const rSquared = ssTotal > 0 ? Math.max(0, Math.min(0.999, 1 - (sumSqDelta / ssTotal))) : 0.95;

  let dragDiscrepancyStatus: TfaFitStatistics['dragDiscrepancyStatus'] = 'EXCELLENT_MATCH';
  let diagnosticSummary = '';

  if (maeLbf <= 600) {
    dragDiscrepancyStatus = 'EXCELLENT_MATCH';
    diagnosticSummary = `Excellent agreement (MAE ${Math.round(maeLbf).toLocaleString()} lbf). Wellbore friction is calibrated with μ = ${currentCasingMu.toFixed(2)}.`;
  } else if (maeLbf <= 1500) {
    dragDiscrepancyStatus = 'MODERATE_OFFSET';
    diagnosticSummary = `Moderate variance (MAE ${Math.round(maeLbf).toLocaleString()} lbf). Calibrating casing friction to μ = ${calibratedFriction.toFixed(2)} will optimize curve match.`;
  } else if (calibratedFriction > currentCasingMu * 1.25) {
    dragDiscrepancyStatus = 'HIGH_FRICTION_ANOMALY';
    diagnosticSummary = `High drag anomaly detected (MAE ${Math.round(maeLbf).toLocaleString()} lbf). Back-calculated μ = ${calibratedFriction.toFixed(2)}. Possible solids bed, scale deposition, or dogleg drag.`;
  } else {
    dragDiscrepancyStatus = 'BUCKLING_WARNING';
    diagnosticSummary = `Significant deviation at ${Math.round(maxDeltaDepth).toLocaleString()}m (Δ ${Math.round(maxDelta).toLocaleString()} lbf). Inspect for helical buckling, set-down, or differential sticking.`;
  }

  return {
    count,
    maeLbf,
    rmseLbf,
    rSquared,
    calibratedFriction,
    maxDeltaLbf: maxDelta,
    maxDeltaDepthM: maxDeltaDepth,
    rihCount,
    pohCount,
    avgApparentFriction,
    dragDiscrepancyStatus,
    diagnosticSummary,
  };
}

/**
 * Realistic Presets for Field Data
 */
export function getTfaFieldRunPresets(wellPreset: 'MRJN-764' | 'DEEP-GAS' | 'EXTENDED-REACH'): {
  id: string;
  name: string;
  description: string;
  points: TfaDataPoint[];
}[] {
  const maxDepth = wellPreset === 'DEEP-GAS' ? 4500 : wellPreset === 'EXTENDED-REACH' ? 3500 : 2400;

  // Preset 1: Standard MRJN-764 Field Run with intermediate pick-up checks
  const standardRun: TfaDataPoint[] = [
    { id: '1', depthM: 0, depthFt: 0, expectedPohLbf: 800, expectedRihLbf: -140, eWeightLbf: -140, operation: 'RIH', speedMPerMin: 18, notes: 'Tare zero at injector head' },
    { id: '2', depthM: 250, depthFt: 820, expectedPohLbf: 3200, expectedRihLbf: 1950, eWeightLbf: 2050, operation: 'RIH', speedMPerMin: 22, notes: 'Smooth RIH in vertical casing' },
    { id: '3', depthM: 420, depthFt: 1378, expectedPohLbf: 5400, expectedRihLbf: 3400, eWeightLbf: 5550, operation: 'WIPER', speedMPerMin: 12, notes: 'Check 1: Pick-up check verified' },
    { id: '4', depthM: 600, depthFt: 1968, expectedPohLbf: 7800, expectedRihLbf: 4900, eWeightLbf: 5050, operation: 'RIH', speedMPerMin: 20, notes: 'Past kickoff point (KOP)' },
    { id: '5', depthM: 710, depthFt: 2329, expectedPohLbf: 9400, expectedRihLbf: 5900, eWeightLbf: 9600, operation: 'WIPER', speedMPerMin: 10, notes: 'Check 2: Pick-up check at 710m' },
    { id: '6', depthM: 850, depthFt: 2788, expectedPohLbf: 11400, expectedRihLbf: 7100, eWeightLbf: 7250, operation: 'RIH', speedMPerMin: 20, notes: 'Normal RIH drag' },
    { id: '7', depthM: 1020, depthFt: 3346, expectedPohLbf: 14000, expectedRihLbf: 8600, eWeightLbf: 14200, operation: 'WIPER', speedMPerMin: 10, notes: 'Check 3: Crosshair match zone' },
    { id: '8', depthM: 1200, depthFt: 3937, expectedPohLbf: 16800, expectedRihLbf: 10200, eWeightLbf: 10400, operation: 'RIH', speedMPerMin: 18, notes: 'Entering tangent section (38 deg)' },
    { id: '9', depthM: 1380, depthFt: 4527, expectedPohLbf: 19500, expectedRihLbf: 11800, eWeightLbf: 19800, operation: 'WIPER', speedMPerMin: 12, notes: 'Check 4: Wiper trip verified' },
    { id: '10', depthM: 1550, depthFt: 5085, expectedPohLbf: 22200, expectedRihLbf: 13200, eWeightLbf: 13500, operation: 'RIH', speedMPerMin: 16, notes: 'Stable pumping 1.2 bpm' },
    { id: '11', depthM: 1650, depthFt: 5413, expectedPohLbf: 23800, expectedRihLbf: 14100, eWeightLbf: 24100, operation: 'WIPER', speedMPerMin: 10, notes: 'Check 5: Wiper check' },
    { id: '12', depthM: 1820, depthFt: 5971, expectedPohLbf: 26500, expectedRihLbf: 15500, eWeightLbf: 26800, operation: 'WIPER', speedMPerMin: 10, notes: 'Check 6: Prior to sand cleanout' },
    { id: '13', depthM: 1980, depthFt: 6496, expectedPohLbf: 29100, expectedRihLbf: 16900, eWeightLbf: 17200, operation: 'RIH', speedMPerMin: 14, notes: 'Approaching perforation interval' },
    { id: '14', depthM: 2100, depthFt: 6889, expectedPohLbf: 31000, expectedRihLbf: 17800, eWeightLbf: 31800, operation: 'POH', speedMPerMin: 15, notes: 'Milling pass 1 - reciprocation POH' },
    { id: '15', depthM: 2150, depthFt: 7053, expectedPohLbf: 31800, expectedRihLbf: 18200, eWeightLbf: 17900, operation: 'RIH', speedMPerMin: 12, notes: 'Washing down over sand bridge' },
    { id: '16', depthM: 2250, depthFt: 7381, expectedPohLbf: 33400, expectedRihLbf: 18900, eWeightLbf: 34200, operation: 'POH', speedMPerMin: 15, notes: 'Milling pass 2 - reciprocation POH' },
    { id: '17', depthM: 2340, depthFt: 7677, expectedPohLbf: 34900, expectedRihLbf: 19600, eWeightLbf: 16200, operation: 'TAG_BOTTOM', speedMPerMin: 5, notes: 'Tag TD / sand fill (3,400 lbf set-down)' },
  ];

  // Preset 2: High Drag & Solids Bedding Run (Elevated friction)
  const highDragRun: TfaDataPoint[] = [
    { id: 'hd-1', depthM: 0, depthFt: 0, expectedPohLbf: 800, expectedRihLbf: -140, eWeightLbf: -140, operation: 'RIH', speedMPerMin: 18, notes: 'Surface zero' },
    { id: 'hd-2', depthM: 500, depthFt: 1640, expectedPohLbf: 6800, expectedRihLbf: 4100, eWeightLbf: 3700, operation: 'RIH', speedMPerMin: 18, notes: 'Noticeable slack-off retardation' },
    { id: 'hd-3', depthM: 1000, depthFt: 3280, expectedPohLbf: 15200, expectedRihLbf: 7900, eWeightLbf: 6800, operation: 'RIH', speedMPerMin: 15, notes: 'Slack-off below expected RIH (cuttings bed)' },
    { id: 'hd-4', depthM: 1050, depthFt: 3445, expectedPohLbf: 16200, expectedRihLbf: 8300, eWeightLbf: 18900, operation: 'POH', speedMPerMin: 10, notes: 'High overpull on pull-up (+2,700 lbf)' },
    { id: 'hd-5', depthM: 1500, depthFt: 4921, expectedPohLbf: 23400, expectedRihLbf: 11900, eWeightLbf: 9800, operation: 'RIH', speedMPerMin: 12, notes: 'High sliding friction μ ~ 0.35' },
    { id: 'hd-6', depthM: 1800, depthFt: 5905, expectedPohLbf: 28500, expectedRihLbf: 14100, eWeightLbf: 11400, operation: 'RIH', speedMPerMin: 10, notes: 'Approaching sinusoidal buckling limit' },
    { id: 'hd-7', depthM: 2000, depthFt: 6561, expectedPohLbf: 32100, expectedRihLbf: 15200, eWeightLbf: 36500, operation: 'POH', speedMPerMin: 10, notes: 'Severe overpull near OPLIM limit' },
  ];

  // Preset 3: Cleanout & Milling Multi-Pass Run
  const cleanoutRun: TfaDataPoint[] = [
    { id: 'cl-1', depthM: 500, depthFt: 1640, expectedPohLbf: 6500, expectedRihLbf: 4200, eWeightLbf: 4250, operation: 'RIH', speedMPerMin: 20, notes: 'Circulating 1.5 bpm' },
    { id: 'cl-2', depthM: 1000, depthFt: 3280, expectedPohLbf: 13800, expectedRihLbf: 8800, eWeightLbf: 8900, operation: 'RIH', speedMPerMin: 18, notes: 'Smooth passage' },
    { id: 'cl-3', depthM: 1500, depthFt: 4921, expectedPohLbf: 21500, expectedRihLbf: 13400, eWeightLbf: 13500, operation: 'RIH', speedMPerMin: 16, notes: 'Entering scale zone' },
    { id: 'cl-4', depthM: 1950, depthFt: 6397, expectedPohLbf: 28600, expectedRihLbf: 16800, eWeightLbf: 14100, operation: 'TAG_BOTTOM', speedMPerMin: 4, notes: 'Hard tag on Barium scale bridge' },
    { id: 'cl-5', depthM: 1945, depthFt: 6381, expectedPohLbf: 28500, expectedRihLbf: 16700, eWeightLbf: 30200, operation: 'POH', speedMPerMin: 8, notes: 'Pick up off bridge to establish rate' },
    { id: 'cl-6', depthM: 1960, depthFt: 6430, expectedPohLbf: 28800, expectedRihLbf: 16900, eWeightLbf: 29500, operation: 'WIPER', speedMPerMin: 6, notes: 'Milling scale pass 1' },
    { id: 'cl-7', depthM: 1980, depthFt: 6496, expectedPohLbf: 29200, expectedRihLbf: 17100, eWeightLbf: 29900, operation: 'WIPER', speedMPerMin: 6, notes: 'Milling scale pass 2' },
  ];

  return [
    {
      id: 'standard',
      name: 'MRJN-764 Actual Run (Wiper Checks & Milling)',
      description: 'Standard deviated well run with periodic pick-up checks and cleanout reciprocation.',
      points: standardRun,
    },
    {
      id: 'high-drag',
      name: 'ER-09 High Drag / Solids Bedding Run',
      description: 'Run exhibiting cuttings accumulation and high friction factor (μ ~ 0.34).',
      points: highDragRun,
    },
    {
      id: 'cleanout',
      name: 'Scale Milling & Obstruction Tag Run',
      description: 'Scale cleanout run with obstruction tag, set-down force, and milling passes.',
      points: cleanoutRun,
    },
  ];
}
