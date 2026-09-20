import { CoiledTubingString, WorkingPoint } from '../types/coiledTubing';
import { calculateGeometry } from './engineeringCalculations';

export type SafetyAlertSeverity = 'safe' | 'caution' | 'envelope_exceeded' | 'yield_violation';

export type DominantStressDriver = 
  | 'tension_dominated'
  | 'compression_dominated'
  | 'burst_dominated'
  | 'collapse_dominated'
  | 'biaxial_tension_burst'
  | 'biaxial_tension_collapse'
  | 'biaxial_compression_burst'
  | 'biaxial_compression_collapse';

export interface StressBreakdown {
  axialStressPsi: number;
  hoopStressPsi: number;
  vonMisesStressPsi: number;
  yieldStrengthPsi: number;
  safeLimitPsi: number;
  warningLimitPsi: number;
  metalAreaSqIn: number;
  
  // Ratios & margins
  yieldRatioPercent: number;        // vonMises / yield * 100
  safeRatioPercent: number;         // vonMises / safeLimit * 100
  excessOverYieldPsi: number;       // > 0 means plastic yield violation
  excessOverSafePsi: number;        // > 0 means exceeds derated envelope
  marginToYieldPsi: number;         // > 0 means reserve capacity
  marginToSafePsi: number;          // > 0 means safe reserve
  effectiveSafetyFactor: number;    // yield / vonMises
}

export interface MitigationPlan {
  // Pressure adjustment holding tension constant
  canMitigateViaPressure: boolean;
  safeDifferentialPressurePsi: number | null;
  deltaPressureToSafePsi: number | null;

  // Tension adjustment holding pressure constant
  canMitigateViaTension: boolean;
  safeAxialTensionLbf: number | null;
  deltaTensionToSafeLbf: number | null;

  // Proportional radial scaling
  radialSafePoint: WorkingPoint;
}

export interface DetailedOperatingPointEvaluation {
  severity: SafetyAlertSeverity;
  isYieldViolated: boolean;
  isEnvelopeExceeded: boolean;
  isApproachingLimit: boolean;
  
  // Stresses
  nominalStress: StressBreakdown;
  usedStress: StressBreakdown | null;
  activeStress: StressBreakdown; // Either used (if enabled) or nominal

  // Driver diagnosis
  dominantDriver: DominantStressDriver;
  driverDescription: string;
  driverRecommendation: string;

  // Real-time mitigation solutions
  mitigation: MitigationPlan;

  // Diagnostic headline & detail message
  headline: string;
  detailedMessage: string;
}

/**
 * Calculates complete triaxial stress breakdown for a coiled tubing string at an operating point.
 */
export function calculateStressBreakdown(
  ct: CoiledTubingString,
  diffPressurePsi: number,
  axialTensionLbf: number,
  safetyFactor: number = 0.80
): StressBreakdown {
  const geom = calculateGeometry(ct);
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const ys = ct.yieldStrengthPsi;

  const axialStressPsi = axialTensionLbf / geom.metalAreaSqIn;
  const hoopStressPsi = (diffPressurePsi * (od - wt)) / (2 * wt);

  // von Mises equivalent stress: sqrt(sigma_a^2 - sigma_a * sigma_theta + sigma_theta^2)
  const vonMisesStressPsi = Math.sqrt(
    Math.pow(axialStressPsi, 2) - axialStressPsi * hoopStressPsi + Math.pow(hoopStressPsi, 2)
  );

  const safeLimitPsi = ys * safetyFactor;
  const warningLimitPsi = safeLimitPsi * 0.85;

  const yieldRatioPercent = (vonMisesStressPsi / ys) * 100;
  const safeRatioPercent = (vonMisesStressPsi / safeLimitPsi) * 100;

  const excessOverYieldPsi = Math.max(0, vonMisesStressPsi - ys);
  const excessOverSafePsi = Math.max(0, vonMisesStressPsi - safeLimitPsi);
  const marginToYieldPsi = ys - vonMisesStressPsi;
  const marginToSafePsi = safeLimitPsi - vonMisesStressPsi;
  const effectiveSafetyFactor = vonMisesStressPsi > 0 ? ys / vonMisesStressPsi : 99.9;

  return {
    axialStressPsi,
    hoopStressPsi,
    vonMisesStressPsi,
    yieldStrengthPsi: ys,
    safeLimitPsi,
    warningLimitPsi,
    metalAreaSqIn: geom.metalAreaSqIn,
    yieldRatioPercent,
    safeRatioPercent,
    excessOverYieldPsi,
    excessOverSafePsi,
    marginToYieldPsi,
    marginToSafePsi,
    effectiveSafetyFactor,
  };
}

/**
 * Determines the dominant stress mechanism causing von Mises loading.
 */
export function diagnoseStressDriver(
  axialStressPsi: number,
  hoopStressPsi: number,
  yieldRatioPercent: number
): { driver: DominantStressDriver; description: string; recommendation: string } {
  const absAxial = Math.abs(axialStressPsi);
  const absHoop = Math.abs(hoopStressPsi);

  if (absAxial > 2.0 * absHoop) {
    if (axialStressPsi > 0) {
      return {
        driver: 'tension_dominated',
        description: 'High Axial Tension Dominant (Hookload / Overpull)',
        recommendation: 'Slacken injector chains or lower hookload overpull. Reduce friction or BHA pull drag.',
      };
    } else {
      return {
        driver: 'compression_dominated',
        description: 'High Axial Compression Dominant (Snubbing / Helical Buckling Risk)',
        recommendation: 'Reduce downward snubbing force or pull out of hole slightly to relieve axial compressive load.',
      };
    }
  }

  if (absHoop > 2.0 * absAxial) {
    if (hoopStressPsi > 0) {
      return {
        driver: 'burst_dominated',
        description: 'High Internal Differential Pressure Dominant (Burst Stress)',
        recommendation: 'Bleed circulating pressure or slow pumping rate to reduce internal differential pressure.',
      };
    } else {
      return {
        driver: 'collapse_dominated',
        description: 'High External Hydrostatic Pressure Dominant (Collapse / Underbalance)',
        recommendation: 'Pressurize tubing string internally or reduce annulus hydrostatic head (circulate lighter fluid).',
      };
    }
  }

  // Combined biaxial states
  if (axialStressPsi >= 0 && hoopStressPsi >= 0) {
    return {
      driver: 'biaxial_tension_burst',
      description: 'Combined Tension & Burst (Quadrant 1 Biaxial Loading)',
      recommendation: 'Biaxial tension-burst condition. Simultaneously reduce pump pressure and overpull.',
    };
  } else if (axialStressPsi >= 0 && hoopStressPsi < 0) {
    return {
      driver: 'biaxial_tension_collapse',
      description: 'Combined Tension & Collapse (High Shear / Dangerous Escalation)',
      recommendation: 'Severe loading condition: tension accelerates collapse yield. Relieve overpull and repressurize bore.',
    };
  } else if (axialStressPsi < 0 && hoopStressPsi >= 0) {
    return {
      driver: 'biaxial_compression_burst',
      description: 'Combined Compression & Burst (Quadrant 4 Stress Interaction)',
      recommendation: 'Reduce both snubbing load and pump circulating pressure.',
    };
  } else {
    return {
      driver: 'biaxial_compression_collapse',
      description: 'Combined Compression & Collapse (Quadrant 3 Compressive Yield)',
      recommendation: 'High collapse and snubbing: pull up to relieve compression and circulate fluid.',
    };
  }
}

/**
 * Mathematically solves for exact safe boundary operating points to clear yield violations.
 */
export function calculateMitigationPlan(
  ct: CoiledTubingString,
  operatingPoint: WorkingPoint,
  safetyFactor: number = 0.80
): MitigationPlan {
  const geom = calculateGeometry(ct);
  const od = ct.outerDiameterIn;
  const wt = ct.wallThicknessIn;
  const ys = ct.yieldStrengthPsi;
  const targetStress = ys * safetyFactor;

  const currentAxialStress = operatingPoint.axialTensionLbf / geom.metalAreaSqIn;
  const currentHoopStress = (operatingPoint.differentialPressurePsi * (od - wt)) / (2 * wt);
  const currentVonMises = Math.sqrt(
    Math.pow(currentAxialStress, 2) - currentAxialStress * currentHoopStress + Math.pow(currentHoopStress, 2)
  );

  // 1. Safe Pressure holding axial tension constant
  // Equation: sigma_theta^2 - sigma_a * sigma_theta + (sigma_a^2 - targetStress^2) = 0
  // D = 4 * targetStress^2 - 3 * sigma_a^2
  const discTheta = 4 * Math.pow(targetStress, 2) - 3 * Math.pow(currentAxialStress, 2);
  let canMitigateViaPressure = false;
  let safeDifferentialPressurePsi: number | null = null;
  let deltaPressureToSafePsi: number | null = null;

  if (discTheta >= 0) {
    canMitigateViaPressure = true;
    const sqrtDisc = Math.sqrt(discTheta);
    const thetaMax = (currentAxialStress + sqrtDisc) / 2;
    const thetaMin = (currentAxialStress - sqrtDisc) / 2;

    const pBurstSafe = (thetaMax * (2 * wt)) / (od - wt);
    const pCollapseSafe = (thetaMin * (2 * wt)) / (od - wt);

    if (operatingPoint.differentialPressurePsi >= 0) {
      safeDifferentialPressurePsi = Math.min(operatingPoint.differentialPressurePsi, pBurstSafe);
    } else {
      safeDifferentialPressurePsi = Math.max(operatingPoint.differentialPressurePsi, pCollapseSafe);
    }
    deltaPressureToSafePsi = safeDifferentialPressurePsi - operatingPoint.differentialPressurePsi;
  }

  // 2. Safe Tension holding differential pressure constant
  // Equation: sigma_a^2 - sigma_theta * sigma_a + (sigma_theta^2 - targetStress^2) = 0
  // D = 4 * targetStress^2 - 3 * sigma_theta^2
  const discAxial = 4 * Math.pow(targetStress, 2) - 3 * Math.pow(currentHoopStress, 2);
  let canMitigateViaTension = false;
  let safeAxialTensionLbf: number | null = null;
  let deltaTensionToSafeLbf: number | null = null;

  if (discAxial >= 0) {
    canMitigateViaTension = true;
    const sqrtDisc = Math.sqrt(discAxial);
    const aMax = (currentHoopStress + sqrtDisc) / 2;
    const aMin = (currentHoopStress - sqrtDisc) / 2;

    const fTensionSafe = aMax * geom.metalAreaSqIn;
    const fCompressionSafe = aMin * geom.metalAreaSqIn;

    if (operatingPoint.axialTensionLbf >= 0) {
      safeAxialTensionLbf = Math.min(operatingPoint.axialTensionLbf, fTensionSafe);
    } else {
      safeAxialTensionLbf = Math.max(operatingPoint.axialTensionLbf, fCompressionSafe);
    }
    deltaTensionToSafeLbf = safeAxialTensionLbf - operatingPoint.axialTensionLbf;
  }

  // 3. Radial scaling to target safe ellipse
  const scale = currentVonMises > 0 ? targetStress / currentVonMises : 1.0;
  const radialSafePoint: WorkingPoint = {
    differentialPressurePsi: Math.round(operatingPoint.differentialPressurePsi * Math.min(1.0, scale)),
    axialTensionLbf: Math.round(operatingPoint.axialTensionLbf * Math.min(1.0, scale)),
  };

  return {
    canMitigateViaPressure,
    safeDifferentialPressurePsi,
    deltaPressureToSafePsi,
    canMitigateViaTension,
    safeAxialTensionLbf,
    deltaTensionToSafeLbf,
    radialSafePoint,
  };
}

/**
 * Master Real-Time Operating Point Evaluation for WorkingEnvelopeTab.
 */
export function evaluateRealTimeSafetyAlert(
  nominalCt: CoiledTubingString,
  effectiveUsedCt: CoiledTubingString | null,
  operatingPoint: WorkingPoint,
  safetyFactor: number = 0.80
): DetailedOperatingPointEvaluation {
  const nominalStress = calculateStressBreakdown(
    nominalCt,
    operatingPoint.differentialPressurePsi,
    operatingPoint.axialTensionLbf,
    safetyFactor
  );

  const usedStress = effectiveUsedCt
    ? calculateStressBreakdown(
        effectiveUsedCt,
        operatingPoint.differentialPressurePsi,
        operatingPoint.axialTensionLbf,
        safetyFactor
      )
    : null;

  // Active stress is based on the configured condition (used string if active, otherwise nominal)
  const activeStress = usedStress || nominalStress;

  // Severity classification
  let severity: SafetyAlertSeverity = 'safe';
  if (activeStress.yieldRatioPercent > 100) {
    severity = 'yield_violation';
  } else if (activeStress.safeRatioPercent > 100) {
    severity = 'envelope_exceeded';
  } else if (activeStress.safeRatioPercent > 85) {
    severity = 'caution';
  }

  const isYieldViolated = activeStress.yieldRatioPercent > 100;
  const isEnvelopeExceeded = activeStress.safeRatioPercent > 100;
  const isApproachingLimit = activeStress.safeRatioPercent > 85 && !isEnvelopeExceeded;

  const targetCtForMitigation = effectiveUsedCt || nominalCt;
  const mitigation = calculateMitigationPlan(targetCtForMitigation, operatingPoint, safetyFactor);

  const driverDiagnosis = diagnoseStressDriver(
    activeStress.axialStressPsi,
    activeStress.hoopStressPsi,
    activeStress.yieldRatioPercent
  );

  // Headlines and detailed messages
  let headline = 'NORMAL SAFE OPERATING CONDITION';
  let detailedMessage = `Triaxial von Mises stress is at ${activeStress.safeRatioPercent.toFixed(1)}% of the ${Math.round(safetyFactor * 100)}% Safe Operating Envelope.`;

  if (isYieldViolated) {
    headline = 'CRITICAL ALERT: VON MISES YIELD LIMIT CROSSED (PLASTIC DEFORMATION)';
    detailedMessage = `Operating point exceeds 100% SMYS (${activeStress.yieldRatioPercent.toFixed(1)}% of yield strength, +${Math.round(activeStress.excessOverYieldPsi).toLocaleString()} psi excess). High probability of irreversible plastic necking, ballooning, or catastrophic rupture!`;
  } else if (isEnvelopeExceeded) {
    headline = `SAFETY ENVELOPE EXCEEDED: ${Math.round(safetyFactor * 100)}% WORKING LIMIT BREACH`;
    detailedMessage = `Triaxial stress is at ${activeStress.safeRatioPercent.toFixed(1)}% of the derated safe limit (SF = ${safetyFactor.toFixed(2)}). Operation is in the uncertified reserve zone between the safe working envelope and nominal material yield.`;
  } else if (isApproachingLimit) {
    headline = 'CAUTION: APPROACHING SAFE WORKING ENVELOPE BOUNDARY';
    detailedMessage = `Triaxial stress is at ${activeStress.safeRatioPercent.toFixed(1)}% of the safe limit. Reserve margin is shrinking; monitor hookload overpull and differential pressure carefully.`;
  }

  // If nominal is safe but used condition triggers an alert, highlight in-service degradation
  if (usedStress && nominalStress.safeRatioPercent <= 100 && usedStress.safeRatioPercent > 100) {
    headline = `USED STRING OVERLOAD: IN-SERVICE CAPACITY LOSS DETECTED`;
    detailedMessage = `While pristine factory-new pipe would remain safe (${nominalStress.safeRatioPercent.toFixed(1)}% of safe limit), this degraded used string exceeds its safe working boundary (${usedStress.safeRatioPercent.toFixed(1)}%) due to wall loss and ovality derating!`;
  }

  return {
    severity,
    isYieldViolated,
    isEnvelopeExceeded,
    isApproachingLimit,
    nominalStress,
    usedStress,
    activeStress,
    dominantDriver: driverDiagnosis.driver,
    driverDescription: driverDiagnosis.description,
    driverRecommendation: driverDiagnosis.recommendation,
    mitigation,
    headline,
    detailedMessage,
  };
}

/**
 * Web Audio API synthesizer for optional real-time audible warning.
 */
export function playSafetyAlertSound(severity: 'yield_violation' | 'envelope_exceeded'): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (severity === 'yield_violation') {
      // Urgent dual-tone siren chime for plastic yield violation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12); // A4
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.start();
      osc.stop(ctx.currentTime + 0.40);
    } else {
      // Subtler advisory chime for safe envelope exceedance
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.start();
      osc.stop(ctx.currentTime + 0.30);
    }
  } catch {
    // AudioContext blocked by browser autoplay policy - fail silently
  }
}
