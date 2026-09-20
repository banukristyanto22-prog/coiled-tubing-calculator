import { BhaSegment, BhaToolType, CoiledTubingString, WellboreSurveyStation } from '../types/coiledTubing';
import { calculateSegmentMomentOfInertia } from '../data/bhaPresets';

export interface BhaSegmentFatigueDetail {
  segmentId: string;
  segmentName: string;
  toolType: BhaToolType;
  color?: string;
  outerDiameterIn: number;
  innerDiameterIn: number;
  lengthFt: number;
  depthTopFt: number;
  depthBottomFt: number;
  depthMidFt: number;
  materialYieldPsi: number;
  enduranceLimitPsi: number; // S_e: Material Fatigue Endurance Limit (API RP 5C7 / ASME S-N criteria)
  geometricBendingStressPsi: number; // Pure wellbore curvature bending stress
  contactBendingStressPsi: number; // Stiff tool 3-point contact bending stress
  totalBendingStressPsi: number; // Combined peak bending stress (sigma_b)
  fatigueRatioPercent: number; // (sigma_b / S_e) * 100
  exceedsEnduranceLimit: boolean; // True when sigma_b > S_e
  fatigueSeverity: 'safe' | 'elevated' | 'critical';
  axialLoadLbf: number;
  dlsDegPer100ft: number;
}

export interface BhaFatigueMonitoringResult {
  currentDepthFt: number;
  localDlsDegPer100ft: number;
  maxBendingStressPsi: number;
  overallEnduranceLimitPsi: number;
  overallFatigueRatioPercent: number; // Peak stress / endurance limit * 100
  anyExceedsEnduranceLimit: boolean;
  criticalSegment: BhaSegmentFatigueDetail | null;
  segments: BhaSegmentFatigueDetail[];
  status: 'SAFE' | 'ELEVATED' | 'CRITICAL_FATIGUE';
  statusMessage: string;
  accumulatedFatigueRisk: 'Negligible' | 'Moderate' | 'Severe Low-Cycle Fatigue';
}

/**
 * Standard yield strength for downhole BHA tools (AISI 4140/4145H Mod alloy steel)
 * Typical minimum yield strength is 110,000 psi (110 ksi).
 */
export const DEFAULT_BHA_TOOL_YIELD_PSI = 110000;

/**
 * Material Fatigue Endurance Limit Ratio (S_e / S_y)
 * In accordance with API RP 5C7, ASME Section VIII Div 2, and Marin's fatigue criteria
 * for quenched and tempered low-alloy downhole steel under cyclic bending:
 * Base endurance limit S_e' ≈ 0.50·S_u ≈ 0.45·S_y.
 * Accounting for surface finish (k_a ≈ 0.92), size (k_b ≈ 0.95), and reliability (k_c ≈ 0.91):
 * S_e ≈ 0.40 · S_y (e.g. 44.0 ksi for 110 ksi tool steel, 36.0 ksi for 90 ksi CT steel).
 */
export const FATIGUE_ENDURANCE_RATIO = 0.40;

/**
 * Interpolates local Dogleg Severity (DLS) in deg/100ft at a given measured depth.
 */
export function getLocalDlsAtDepth(
  depthFt: number,
  stations?: WellboreSurveyStation[],
  defaultInclinationDeg: number = 65
): number {
  if (!stations || stations.length < 2) {
    // If no stations, estimate DLS based on wellbore geometry profile
    if (depthFt >= 3500 && depthFt <= 8500) {
      // Curve / build section
      return 2.5;
    }
    return 0.2;
  }

  // Find surrounding survey stations
  const sorted = [...stations].sort((a, b) => a.measuredDepthFt - b.measuredDepthFt);
  
  if (depthFt <= sorted[0].measuredDepthFt) {
    return sorted[0].doglegSeverityDegPer100ft ?? 0;
  }
  
  const last = sorted[sorted.length - 1];
  if (depthFt >= last.measuredDepthFt) {
    return last.doglegSeverityDegPer100ft ?? 0;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const s0 = sorted[i];
    const s1 = sorted[i + 1];
    if (depthFt >= s0.measuredDepthFt && depthFt <= s1.measuredDepthFt) {
      const segLen = s1.measuredDepthFt - s0.measuredDepthFt;
      if (segLen <= 0) return s0.doglegSeverityDegPer100ft ?? 0;
      
      const t = (depthFt - s0.measuredDepthFt) / segLen;
      const dls0 = s0.doglegSeverityDegPer100ft ?? 0;
      const dls1 = s1.doglegSeverityDegPer100ft ?? 0;
      
      // If stations define DLS directly, linearly interpolate
      if (dls0 > 0 || dls1 > 0) {
        return dls0 + t * (dls1 - dls0);
      }
      
      // If DLS is 0 on stations, calculate from inclination change
      const dInc = Math.abs(s1.inclinationDeg - s0.inclinationDeg);
      const computedDls = (dInc / segLen) * 100;
      return computedDls;
    }
  }

  return 0.5;
}

/**
 * Calculates real-time simulated bending stresses and evaluates fatigue endurance limits
 * for all BHA segments at current depth during the simulation animation.
 */
export function calculateBhaFatigueStress({
  bhaSegments,
  currentDepthFt,
  ct,
  stations,
  slackoffLbf = 0,
  dlsMultiplier = 1.0,
  simulatedDlsOverride,
}: {
  bhaSegments: BhaSegment[];
  currentDepthFt: number;
  ct: CoiledTubingString;
  stations?: WellboreSurveyStation[];
  slackoffLbf?: number;
  dlsMultiplier?: number;
  simulatedDlsOverride?: number;
}): BhaFatigueMonitoringResult {
  const e = ct.youngsModulusPsi || 30000000;
  const ctOd = ct.outerDiameterIn || 2.0;
  const ctWall = ct.wallThicknessIn || 0.134;
  const ctId = Math.max(0.1, ctOd - 2 * ctWall);
  const ctInertia = calculateSegmentMomentOfInertia(ctOd, ctId);
  const ctEi = e * ctInertia;
  const ctYieldPsi = ct.yieldStrengthPsi || 90000;

  // Total BHA length
  const totalBhaLengthFt = bhaSegments.reduce((acc, s) => acc + (s.lengthFt || 5), 0);
  const bhaTopDepthFt = Math.max(0, currentDepthFt - totalBhaLengthFt);

  // Determine local DLS
  let baseDls = simulatedDlsOverride !== undefined 
    ? simulatedDlsOverride 
    : getLocalDlsAtDepth(currentDepthFt, stations);
  
  const effectiveDls = Math.max(0.1, baseDls * dlsMultiplier);

  // Curvature kappa in 1/inch: DLS (deg/100ft) * (pi / 180) / (100 * 12)
  const kappaRadPerIn = (effectiveDls * (Math.PI / 180)) / 1200;

  // Beam-column axial load magnification factor under compression
  // Compressive slackoff load amplifies lateral bending deflection
  const compLoad = Math.max(0, -slackoffLbf);
  const eulerBucklingEst = 25000; // Estimated critical load
  const axialAmpFactor = 1.0 + Math.min(0.6, (compLoad / eulerBucklingEst) * 0.5);

  let runningDepthFt = bhaTopDepthFt;
  const segmentDetails: BhaSegmentFatigueDetail[] = [];

  for (let i = 0; i < bhaSegments.length; i++) {
    const seg = bhaSegments[i];
    const segLen = seg.lengthFt || 5;
    const segStartFt = runningDepthFt;
    const segEndFt = runningDepthFt + segLen;
    const segMidFt = (segStartFt + segEndFt) / 2;
    runningDepthFt = segEndFt;

    const od = seg.outerDiameterIn || ctOd;
    const id = seg.innerDiameterIn || ctId;

    // Moment of inertia
    const segInertia = calculateSegmentMomentOfInertia(od, id);
    const segEi = e * segInertia;
    const stiffnessRatio = segEi / Math.max(1, ctEi);

    // Yield strength & fatigue endurance limit
    // CT connectors and subs use string or tool grade
    const materialYieldPsi = seg.type === 'connector' 
      ? ctYieldPsi 
      : DEFAULT_BHA_TOOL_YIELD_PSI;

    const enduranceLimitPsi = materialYieldPsi * FATIGUE_ENDURANCE_RATIO;

    // 1. Geometric curvature bending stress: sigma_b,geom = E * (OD / 2) * kappa
    const geomBendingStressPsi = e * (od / 2) * kappaRadPerIn;

    // 2. Stiff BHA tool 3-point contact bending stress:
    // Stiffer tools cannot conform cleanly to wellbore curvature, creating 3-point contact
    // bending against the casing/hole wall
    const contactStiffnessFactor = Math.max(0, stiffnessRatio - 1.0);
    const contactBendingStressPsi = contactStiffnessFactor > 0.1 && effectiveDls > 0.3
      ? geomBendingStressPsi * Math.min(1.6, contactStiffnessFactor * 0.45)
      : 0;

    // 3. Total peak bending stress
    const totalBendingStressPsi = (geomBendingStressPsi + contactBendingStressPsi) * axialAmpFactor;

    // Fatigue ratio and status
    const fatigueRatioPercent = (totalBendingStressPsi / enduranceLimitPsi) * 100;
    const exceedsEnduranceLimit = totalBendingStressPsi > enduranceLimitPsi;

    let fatigueSeverity: 'safe' | 'elevated' | 'critical' = 'safe';
    if (exceedsEnduranceLimit) {
      fatigueSeverity = 'critical';
    } else if (fatigueRatioPercent >= 75) {
      fatigueSeverity = 'elevated';
    }

    segmentDetails.push({
      segmentId: seg.id || `seg-${i}`,
      segmentName: seg.name,
      toolType: seg.type,
      color: seg.color,
      outerDiameterIn: od,
      innerDiameterIn: id,
      lengthFt: segLen,
      depthTopFt: Math.round(segStartFt),
      depthBottomFt: Math.round(segEndFt),
      depthMidFt: Math.round(segMidFt),
      materialYieldPsi,
      enduranceLimitPsi,
      geometricBendingStressPsi: Math.round(geomBendingStressPsi),
      contactBendingStressPsi: Math.round(contactBendingStressPsi),
      totalBendingStressPsi: Math.round(totalBendingStressPsi),
      fatigueRatioPercent: Number(fatigueRatioPercent.toFixed(1)),
      exceedsEnduranceLimit,
      fatigueSeverity,
      axialLoadLbf: Math.round(slackoffLbf),
      dlsDegPer100ft: Number(effectiveDls.toFixed(2)),
    });
  }

  // Find highest stressed segment
  const sortedByStress = [...segmentDetails].sort((a, b) => b.totalBendingStressPsi - a.totalBendingStressPsi);
  const criticalSeg = sortedByStress[0] || null;

  const maxBendingStressPsi = criticalSeg ? criticalSeg.totalBendingStressPsi : 0;
  const overallEnduranceLimitPsi = criticalSeg ? criticalSeg.enduranceLimitPsi : DEFAULT_BHA_TOOL_YIELD_PSI * FATIGUE_ENDURANCE_RATIO;
  const overallFatigueRatioPercent = overallEnduranceLimitPsi > 0 
    ? Number(((maxBendingStressPsi / overallEnduranceLimitPsi) * 100).toFixed(1)) 
    : 0;

  const anyExceedsEnduranceLimit = segmentDetails.some((s) => s.exceedsEnduranceLimit);

  let status: 'SAFE' | 'ELEVATED' | 'CRITICAL_FATIGUE' = 'SAFE';
  let statusMessage = 'Operating in safe elastic regime. Simulated bending stresses are below material endurance limit.';
  let accumulatedFatigueRisk: 'Negligible' | 'Moderate' | 'Severe Low-Cycle Fatigue' = 'Negligible';

  if (anyExceedsEnduranceLimit) {
    status = 'CRITICAL_FATIGUE';
    statusMessage = `ALERT: Bending stress (${(maxBendingStressPsi / 1000).toFixed(1)} ksi) exceeds material fatigue endurance limit (${(overallEnduranceLimitPsi / 1000).toFixed(1)} ksi) on ${criticalSeg?.segmentName}. High risk of cyclic microcrack initiation!`;
    accumulatedFatigueRisk = 'Severe Low-Cycle Fatigue';
  } else if (overallFatigueRatioPercent >= 75) {
    status = 'ELEVATED';
    statusMessage = `CAUTION: Bending stress approaching material endurance limit (${overallFatigueRatioPercent}% of S_e). Monitor dogleg severity and tool clearance.`;
    accumulatedFatigueRisk = 'Moderate';
  }

  return {
    currentDepthFt: Math.round(currentDepthFt),
    localDlsDegPer100ft: Number(effectiveDls.toFixed(2)),
    maxBendingStressPsi,
    overallEnduranceLimitPsi,
    overallFatigueRatioPercent,
    anyExceedsEnduranceLimit,
    criticalSegment: criticalSeg,
    segments: segmentDetails,
    status,
    statusMessage,
    accumulatedFatigueRisk,
  };
}
