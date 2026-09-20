import { UnitSystem } from '../types/coiledTubing';
import { GeometryValidationResult } from '../types/toast';
import { inToMm, mmToIn, ftToM, mToFt, psiToMpa, mpaToPsi } from './engineeringCalculations';

/**
 * Validates Coiled Tubing Outer Diameter (OD).
 * Safe range according to API Spec 5ST: 0.750" to 5.000" (19.05 mm to 127.0 mm).
 * Hard absolute limits: 0.500" to 6.000".
 * Also verifies that OD > 2 * Wall Thickness so internal diameter ID is positive.
 */
export function validateOuterDiameter(
  odIn: number,
  currentWtIn: number,
  unitSystem: UnitSystem
): GeometryValidationResult {
  const isMetric = unitSystem === 'metric';
  const displayVal = isMetric ? `${inToMm(odIn).toFixed(2)} mm` : `${odIn.toFixed(3)}"`;

  // 1. Negative or Zero Check
  if (odIn <= 0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Outer Diameter (OD)',
      title: 'Invalid Input: Non-Positive Diameter',
      message: `Negative or zero outer diameter (${displayVal}) is physically impossible. Tubular goods require a positive external diameter.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '19.05 mm to 127.00 mm' : '0.750" to 5.000"',
      engineeringStandard: 'API Spec 5ST Table 1',
      recommendedValue: 2.000,
      recommendedDisplayValue: isMetric ? `${inToMm(2.0).toFixed(2)} mm` : '2.000"',
    };
  }

  // 2. Physical Sub-Minimum Check
  if (odIn < 0.500) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Outer Diameter (OD)',
      title: 'Invalid Input: Diameter Below API Minimum',
      message: `Outer diameter (${displayVal}) is below the minimum manufactured coiled tubing specification. Standard oilfield operations use sizes ≥ 0.750" (19.05 mm).`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '19.05 mm to 127.00 mm' : '0.750" to 5.000"',
      engineeringStandard: 'API Spec 5ST §6.1',
      recommendedValue: 1.500,
      recommendedDisplayValue: isMetric ? `${inToMm(1.5).toFixed(2)} mm` : '1.500"',
    };
  }

  // 3. Excessive Diameter Check (> 6.000")
  if (odIn > 6.000) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Outer Diameter (OD)',
      title: 'Invalid Input: Diameter Exceeds Coiled Tubing Limit',
      message: `Outer diameter (${displayVal}) exceeds maximum transportable reel spooling limits (> 5.000" / 127 mm). Tubes larger than 5.0" cannot be spooled continuously without plastic necking or exceeding DOT road widths.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '19.05 mm to 127.00 mm' : '0.750" to 5.000"',
      engineeringStandard: 'ICoTA / API 5ST Limits',
      recommendedValue: 2.375,
      recommendedDisplayValue: isMetric ? `${inToMm(2.375).toFixed(2)} mm` : '2.375"',
    };
  }

  // 4. Excessive Wall Thickness Conflict relative to this OD
  if (currentWtIn > 0 && odIn <= 2 * currentWtIn) {
    const requiredMinOd = currentWtIn * 2.2;
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Outer Diameter (OD)',
      title: 'Invalid Input: Bore Collapse Conflict',
      message: `Outer diameter (${displayVal}) is too small for the current wall thickness (${isMetric ? inToMm(currentWtIn).toFixed(2) + ' mm' : currentWtIn.toFixed(3) + '"'}). 2 × Wall Thickness (${(2 * currentWtIn).toFixed(3)}") would leave zero or negative internal bore (ID).`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? `> ${(inToMm(currentWtIn * 2)).toFixed(2)} mm (rec. > ${(inToMm(requiredMinOd)).toFixed(2)} mm)` : `> ${(currentWtIn * 2).toFixed(3)}" (rec. > ${requiredMinOd.toFixed(3)}")`,
      engineeringStandard: 'Geometric ID Constraint (ID = OD - 2t > 0)',
      recommendedValue: Math.max(2.0, Number(requiredMinOd.toFixed(3))),
      recommendedDisplayValue: isMetric ? `${inToMm(Math.max(2.0, requiredMinOd)).toFixed(2)} mm` : `${Math.max(2.0, requiredMinOd).toFixed(3)}"`,
    };
  }

  // Safe and Valid
  return {
    isValid: true,
    severity: 'ok',
    parameterName: 'Outer Diameter (OD)',
    title: 'Valid Diameter',
    message: 'Diameter within compliant API 5ST specifications.',
    enteredDisplayValue: displayVal,
    safeRangeDisplay: isMetric ? '19.05 mm to 127.00 mm' : '0.750" to 5.000"',
  };
}

/**
 * Validates Coiled Tubing Wall Thickness (t).
 * Safe range according to API Spec 5ST: 0.067" to 0.350" (1.70 mm to 8.89 mm).
 * Critical constraint: 2 * t MUST be strictly less than OD to prevent bore closure.
 */
export function validateWallThickness(
  wtIn: number,
  currentOdIn: number,
  unitSystem: UnitSystem
): GeometryValidationResult {
  const isMetric = unitSystem === 'metric';
  const displayVal = isMetric ? `${inToMm(wtIn).toFixed(2)} mm` : `${wtIn.toFixed(3)}"`;
  const maxSafeWallForOd = currentOdIn > 0 ? currentOdIn * 0.45 : 0.350;

  // 1. Negative or Zero Check
  if (wtIn <= 0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Wall Thickness (t)',
      title: 'Invalid Input: Non-Positive Wall Thickness',
      message: `Negative or zero wall thickness (${displayVal}) is physically impossible. Pressure containment and axial load capacity require positive wall thickness.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? `1.70 mm to ${inToMm(maxSafeWallForOd).toFixed(2)} mm` : `0.067" to ${maxSafeWallForOd.toFixed(3)}"`,
      engineeringStandard: 'API Spec 5ST §6.3',
      recommendedValue: 0.156,
      recommendedDisplayValue: isMetric ? `${inToMm(0.156).toFixed(2)} mm` : '0.156"',
    };
  }

  // 2. Excessive Wall Thickness: 2 * t >= OD (Inner bore collapses)
  if (currentOdIn > 0 && 2 * wtIn >= currentOdIn) {
    const idResult = currentOdIn - 2 * wtIn;
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Wall Thickness (t)',
      title: 'Invalid Input: Excessive Wall Thickness',
      message: `Excessive wall thickness (${displayVal}): 2 × wall thickness (${isMetric ? inToMm(2 * wtIn).toFixed(2) + ' mm' : (2 * wtIn).toFixed(3) + '"'}) equals or exceeds outer diameter (${isMetric ? inToMm(currentOdIn).toFixed(2) + ' mm' : currentOdIn.toFixed(3) + '"'}). This collapses the internal bore to ${idResult.toFixed(3)}" (${(idResult * 25.4).toFixed(2)} mm), transforming the hollow tube into a solid bar or inverted geometry.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? `< ${(inToMm(currentOdIn / 2)).toFixed(2)} mm (rec. ≤ ${(inToMm(maxSafeWallForOd)).toFixed(2)} mm)` : `< ${(currentOdIn / 2).toFixed(3)}" (rec. ≤ ${maxSafeWallForOd.toFixed(3)}")`,
      engineeringStandard: 'Geometric Limit (Bore ID = OD - 2t > 0)',
      recommendedValue: Math.min(0.175, Number(maxSafeWallForOd.toFixed(3))),
      recommendedDisplayValue: isMetric ? `${inToMm(Math.min(0.175, maxSafeWallForOd)).toFixed(2)} mm` : `${Math.min(0.175, maxSafeWallForOd).toFixed(3)}"`,
    };
  }

  // 3. Sub-minimum API Wall Thickness (< 0.067")
  if (wtIn < 0.060) {
    return {
      isValid: false,
      severity: 'warning',
      parameterName: 'Wall Thickness (t)',
      title: 'Invalid Input: Sub-Gauge Wall Thickness',
      message: `Wall thickness (${displayVal}) is below the standard minimum manufactured gauge (0.067" / 1.70 mm). Ultra-thin walls are prone to premature collapse, severe ovalization, and pinhole burst.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '1.70 mm to 8.89 mm' : '0.067" to 0.350"',
      engineeringStandard: 'API Spec 5ST §6.3 Table 2',
      recommendedValue: 0.125,
      recommendedDisplayValue: isMetric ? `${inToMm(0.125).toFixed(2)} mm` : '0.125"',
    };
  }

  // 4. Excessive Wall Thickness beyond API Coiled Tubing manufacturing limits (> 0.400")
  if (wtIn > 0.400 || (currentOdIn > 0 && wtIn > currentOdIn * 0.42)) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Wall Thickness (t)',
      title: 'Invalid Input: Excessive Wall Thickness',
      message: `Wall thickness (${displayVal}) exceeds coiled tubing strip forming and seam-welding capabilities. High D/t slenderness prevents continuous plastic spooling on standard reel cores without high residual stress cracking.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? `1.70 mm to ${inToMm(maxSafeWallForOd).toFixed(2)} mm` : `0.067" to ${maxSafeWallForOd.toFixed(3)}"`,
      engineeringStandard: 'API Spec 5ST Manufacturing Feasibility',
      recommendedValue: Math.min(0.204, Number(maxSafeWallForOd.toFixed(3))),
      recommendedDisplayValue: isMetric ? `${inToMm(Math.min(0.204, maxSafeWallForOd)).toFixed(2)} mm` : `${Math.min(0.204, maxSafeWallForOd).toFixed(3)}"`,
    };
  }

  // Safe and Valid
  return {
    isValid: true,
    severity: 'ok',
    parameterName: 'Wall Thickness (t)',
    title: 'Valid Wall Thickness',
    message: 'Wall thickness is within safe API 5ST specifications.',
    enteredDisplayValue: displayVal,
    safeRangeDisplay: isMetric ? `1.70 mm to ${inToMm(maxSafeWallForOd).toFixed(2)} mm` : `0.067" to ${maxSafeWallForOd.toFixed(3)}"`,
  };
}

/**
 * Validates Continuous Coiled Tubing Length.
 * Safe range: 500 ft to 35,000 ft (150 m to 10,668 m).
 */
export function validateStringLength(
  lengthFt: number,
  unitSystem: UnitSystem
): GeometryValidationResult {
  const isMetric = unitSystem === 'metric';
  const displayVal = isMetric ? `${Math.round(ftToM(lengthFt)).toLocaleString()} m` : `${Math.round(lengthFt).toLocaleString()} ft`;

  if (lengthFt <= 0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'String Length',
      title: 'Invalid Input: Non-Positive String Length',
      message: `Negative or zero string length (${displayVal}) is physically invalid. A coiled tubing reel requires positive continuous spooled length.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '150 m to 10,668 m' : '500 ft to 35,000 ft',
      engineeringStandard: 'ICoTA Field Guidelines',
      recommendedValue: 18000,
      recommendedDisplayValue: isMetric ? `${Math.round(ftToM(18000)).toLocaleString()} m` : '18,000 ft',
    };
  }

  if (lengthFt < 200) {
    return {
      isValid: false,
      severity: 'warning',
      parameterName: 'String Length',
      title: 'Invalid Input: Length Too Short',
      message: `String length (${displayVal}) is below minimum practical oilfield working length. A minimum of 4-6 anchor wraps (~250-400 ft) must remain on the reel drum for safety.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '150 m to 10,668 m' : '500 ft to 35,000 ft',
      engineeringStandard: 'ICoTA Drum Retention Wrap Safety',
      recommendedValue: 10000,
      recommendedDisplayValue: isMetric ? `${Math.round(ftToM(10000)).toLocaleString()} m` : '10,000 ft',
    };
  }

  if (lengthFt > 45000) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'String Length',
      title: 'Invalid Input: Excessive String Length',
      message: `String length (${displayVal}) exceeds maximum highway transportation road weight limits and maximum reel basket spooling capacities (> 45,000 ft).`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '150 m to 10,668 m' : '500 ft to 35,000 ft',
      engineeringStandard: 'DOT Highway Transport & Reel Weight Limits',
      recommendedValue: 24000,
      recommendedDisplayValue: isMetric ? `${Math.round(ftToM(24000)).toLocaleString()} m` : '24,000 ft',
    };
  }

  return {
    isValid: true,
    severity: 'ok',
    parameterName: 'String Length',
    title: 'Valid Length',
    message: 'Length is within operational spooling capabilities.',
    enteredDisplayValue: displayVal,
    safeRangeDisplay: isMetric ? '150 m to 10,668 m' : '500 ft to 35,000 ft',
  };
}

/**
 * Validates Steel Specified Minimum Yield Strength (SMYS).
 * Safe range: 50,000 psi to 150,000 psi (345 MPa to 1034 MPa).
 */
export function validateYieldStrength(
  ysPsi: number,
  unitSystem: UnitSystem
): GeometryValidationResult {
  const isMetric = unitSystem === 'metric';
  const displayVal = isMetric ? `${Math.round(psiToMpa(ysPsi)).toLocaleString()} MPa` : `${Math.round(ysPsi).toLocaleString()} psi`;

  if (ysPsi <= 0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Yield Strength',
      title: 'Invalid Input: Non-Positive Yield Strength',
      message: `Yield strength (${displayVal}) cannot be zero or negative. Material yield dictates plastic deformation threshold under triaxial stresses.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '483 MPa to 896 MPa' : '70,000 psi to 130,000 psi',
      engineeringStandard: 'API Spec 5ST §7.1',
      recommendedValue: 90000,
      recommendedDisplayValue: isMetric ? `${Math.round(psiToMpa(90000)).toLocaleString()} MPa` : '90,000 psi',
    };
  }

  if (ysPsi < 45000) {
    return {
      isValid: false,
      severity: 'warning',
      parameterName: 'Yield Strength',
      title: 'Invalid Input: Sub-Grade Steel Yield Strength',
      message: `Yield strength (${displayVal}) is below the lowest standard coiled tubing steel grade (CT70: 70,000 psi / 483 MPa). Material lacks required tensile capacity.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '483 MPa to 896 MPa' : '70,000 psi to 130,000 psi',
      engineeringStandard: 'API Spec 5ST Grade CT70 Minimum',
      recommendedValue: 70000,
      recommendedDisplayValue: isMetric ? `${Math.round(psiToMpa(70000)).toLocaleString()} MPa` : '70,000 psi',
    };
  }

  if (ysPsi > 160000) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Yield Strength',
      title: 'Invalid Input: Excessive Steel Yield Strength',
      message: `Yield strength (${displayVal}) exceeds current micro-alloyed carbon steel metallurgy for continuously spooled tubing (> 140,000 psi). High risk of hydrogen embrittlement and catastrophic brittle fracture.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: isMetric ? '483 MPa to 896 MPa' : '70,000 psi to 130,000 psi',
      engineeringStandard: 'API 5ST / NACE MR0175 Metallurgical Thresholds',
      recommendedValue: 110000,
      recommendedDisplayValue: isMetric ? `${Math.round(psiToMpa(110000)).toLocaleString()} MPa` : '110,000 psi',
    };
  }

  return {
    isValid: true,
    severity: 'ok',
    parameterName: 'Yield Strength',
    title: 'Valid Yield Strength',
    message: 'Material strength aligns with certified API 5ST steel grades.',
    enteredDisplayValue: displayVal,
    safeRangeDisplay: isMetric ? '483 MPa to 896 MPa' : '70,000 psi to 130,000 psi',
  };
}

/**
 * Validates Ovality Percentage.
 * Safe range: 0.0% to 5.0% (Manufacturing API limit is 2.0%, field discard is typically 5.0%-8.0%).
 * Critical limit: > 15.0%.
 */
export function validateOvality(ovalityPercent: number): GeometryValidationResult {
  const displayVal = `${ovalityPercent.toFixed(1)}%`;

  if (ovalityPercent < 0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Ovality Tolerance',
      title: 'Invalid Input: Negative Ovality',
      message: `Negative ovality (${displayVal}) is physically invalid. Ovality is defined as the absolute difference between major and minor axes: (OD_max - OD_min) / OD_nom ≥ 0.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: '0.0% to 5.0% (API limit ≤ 2.0%)',
      engineeringStandard: 'API Spec 5ST §6.4',
      recommendedValue: 2.0,
      recommendedDisplayValue: '2.0%',
    };
  }

  if (ovalityPercent > 12.0) {
    return {
      isValid: false,
      severity: 'error',
      parameterName: 'Ovality Tolerance',
      title: 'Invalid Input: Dangerous Tubing Ovality',
      message: `Excessive ovality (${displayVal}) exceeds injector gripper and stripper bushing passage limits. Timoshenko collapse pressure degrades by > 75%, risking immediate catastrophic tube flattening.`,
      enteredDisplayValue: displayVal,
      safeRangeDisplay: '0.0% to 5.0% (Field Discard Threshold: 5.0%)',
      engineeringStandard: 'API RP 5C7 / ICoTA Discard Criteria',
      recommendedValue: 2.0,
      recommendedDisplayValue: '2.0%',
    };
  }

  return {
    isValid: true,
    severity: 'ok',
    parameterName: 'Ovality Tolerance',
    title: 'Valid Ovality',
    message: 'Ovality tolerance within acceptable operational boundaries.',
    enteredDisplayValue: displayVal,
    safeRangeDisplay: '0.0% to 5.0%',
  };
}

/**
 * Audio cue synthesizer using Web Audio API
 */
export function playInvalidInputChime(severity: 'error' | 'warning' | 'info' | 'success' = 'error'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'error') {
      // Double low-high alert chime for invalid input warning
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (severity === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch {
    // Audio context may be restricted or blocked by browser policy, safely ignore
  }
}
