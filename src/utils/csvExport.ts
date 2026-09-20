import { CoiledTubingString, UnitSystem, HydraulicsInput, WellboreForcesInput, CalculationHistoryEntry } from '../types/coiledTubing';
import { DEFAULT_HYDRAULICS, DEFAULT_FORCES } from '../data/presets';
import { evaluateCalculationSafety } from './safetyEvaluator';
import {
  calculateGeometry,
  calculateTubingLimits,
  calculateHydraulics,
  calculateWellboreForces,
  calculateReelCapacity,
  calculateAchillesFatigue,
  inToMm,
  ftToM,
  psiToMpa,
  lbfToKn,
  bblToM3,
} from './engineeringCalculations';

function escapeCsvCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function generateCoiledTubingCSV(
  ct: CoiledTubingString,
  unitSystem: UnitSystem = 'imperial',
  hydInput: HydraulicsInput = DEFAULT_HYDRAULICS,
  forcesInput: WellboreForcesInput = DEFAULT_FORCES
): string {
  const isMetric = unitSystem === 'metric';

  // Engineering calculations with domain engines
  const geom = calculateGeometry(ct);
  const limits = calculateTubingLimits(ct);
  const hyd = calculateHydraulics(ct, hydInput);
  const forces = calculateWellboreForces(ct, forcesInput);
  const reel = calculateReelCapacity(ct);
  const fatigue = calculateAchillesFatigue(ct, 3500, 25);

  const lines: string[] = [];

  // Header Banner
  lines.push(row('COILED MATRIX ENGINEERING CALCULATION REPORT'));
  lines.push(row('Software Suite', 'Coiled Matrix Engineering Suite v4.8 ENG'));
  lines.push(row('Governing Standard', 'API Spec 5ST / API 5C3 / ASTM A370'));
  lines.push(row('Export Timestamp', new Date().toISOString()));
  lines.push(row('Unit System Selected', isMetric ? 'Metric (SI)' : 'US Oilfield (Field Units)'));
  lines.push(row('Report / Job Reference', ct.certificateRef?.reportNo || 'JOB-CT-2026-ENG'));
  lines.push('');

  // 1. String Identification & Geometry
  lines.push(row('=== 1. COILED TUBING STRING GEOMETRY & PROPERTIES ==='));
  lines.push(row('Parameter', 'Value', 'Unit', 'Notes / Standard'));
  lines.push(row('String Name', ct.name, '', 'Coiled Matrix String Profile'));
  lines.push(row('Steel Grade', ct.grade, '', 'API Spec 5ST'));
  lines.push(row('Specified Min Yield Strength (SMYS)', isMetric ? Math.round(psiToMpa(ct.specifiedMinYieldPsi)) : ct.specifiedMinYieldPsi, isMetric ? 'MPa' : 'psi', '0.2% Offset Yield'));
  lines.push(row('Actual Yield Strength', isMetric ? Math.round(psiToMpa(ct.yieldStrengthPsi)) : ct.yieldStrengthPsi, isMetric ? 'MPa' : 'psi', 'Tensile Test Value'));
  lines.push(row('Specified Min Tensile Strength (SMTS)', isMetric ? Math.round(psiToMpa(ct.tensileStrengthPsi)) : ct.tensileStrengthPsi, isMetric ? 'MPa' : 'psi', 'Ultimate Tensile'));
  lines.push(row('Outside Diameter (OD)', isMetric ? inToMm(ct.outerDiameterIn).toFixed(2) : ct.outerDiameterIn.toFixed(3), isMetric ? 'mm' : 'in', 'Nominal Outside Diameter'));
  lines.push(row('Wall Thickness (t)', isMetric ? inToMm(ct.wallThicknessIn).toFixed(3) : ct.wallThicknessIn.toFixed(4), isMetric ? 'mm' : 'in', 'Nominal Wall'));
  lines.push(row('Inside Diameter (ID)', isMetric ? inToMm(geom.innerDiameterIn).toFixed(2) : geom.innerDiameterIn.toFixed(3), isMetric ? 'mm' : 'in', 'ID = OD - 2t'));
  lines.push(row('D/t Ratio', geom.dtRatio.toFixed(2), '', 'Slenderness parameter'));
  lines.push(row('Total Continuous Length', isMetric ? Math.round(ftToM(ct.totalLengthFt)) : ct.totalLengthFt, isMetric ? 'm' : 'ft', 'Total String Length'));
  lines.push(row('Linear Weight in Air', isMetric ? geom.weightInAirKgM.toFixed(2) : geom.weightInAirLbFt.toFixed(3), isMetric ? 'kg/m' : 'lbs/ft', 'API 5ST 10.69*(OD-t)*t'));
  lines.push(row('Total String Weight in Air', isMetric ? Math.round(geom.totalWeightInAirKg) : Math.round(geom.totalWeightInAirLbs), isMetric ? 'kg' : 'lbs', 'Length * Unit Weight'));
  lines.push(row('Internal Fluid Capacity', isMetric ? (geom.capacityBblFt * 0.52161).toFixed(3) : geom.capacityBblFt.toFixed(5), isMetric ? 'm³/m' : 'bbl/ft', 'ID² / 1029.4'));
  lines.push(row('Total String Internal Volume', isMetric ? geom.totalCapacityM3.toFixed(2) : geom.totalCapacityBbl.toFixed(2), isMetric ? 'm³' : 'bbl', 'Complete Bore Fluid Fill'));
  lines.push(row('External Displacement', isMetric ? (geom.displacementBbl1000Ft * 0.001 * 0.52161).toFixed(3) : (geom.displacementBbl1000Ft * 0.001).toFixed(5), isMetric ? 'm³/m' : 'bbl/ft', 'OD² / 1029.4'));
  lines.push(row('Total Displacement', isMetric ? bblToM3(geom.totalDisplacementBbl).toFixed(2) : geom.totalDisplacementBbl.toFixed(2), isMetric ? 'm³' : 'bbl', 'Displaced Fluid'));
  lines.push(row('Moment of Inertia (I)', geom.momentOfInertiaIn4.toFixed(4), 'in⁴', 'π/64 * (OD⁴ - ID⁴)'));
  lines.push(row('Polar Moment of Inertia (J)', geom.polarMomentOfInertiaIn4.toFixed(4), 'in⁴', '2 * I'));
  lines.push(row('Ovality', `${ct.ovalityPercent}%`, '%', 'Diametral Out-of-Roundness'));
  lines.push(row('Wall Variation', `${ct.wallVariationPercent}%`, '%', 'API Mill Tolerance'));
  lines.push('');

  // 2. Certified Mill Test Report (MTR) & Bias Welds (If available)
  if (ct.certificateRef) {
    const cert = ct.certificateRef;
    lines.push(row('=== 2. CERTIFIED MILL TEST REPORT (MTR) & TRACEABILITY ==='));
    lines.push(row('Item', 'Certified Data', 'Standard / Specification'));
    lines.push(row('MTR Inspection Certificate No', cert.reportNo, 'EN 10204 3.1 / API Spec 5ST'));
    lines.push(row('Manufacturer Mill', cert.manufacturer, 'API Licensed Manufacturer'));
    lines.push(row('Product Designation', cert.product, 'Coiled Tubing Continuous String'));
    lines.push(row('String Identification No', cert.stringNo, 'Individual Tracking Serial'));
    lines.push(row('Reel Shaft No', cert.shaftNo, 'Drum Spool Tag'));
    lines.push(row('Hydrostatic Mill Test Pressure', isMetric ? cert.hydrotestMpa : cert.hydrotestPsi, isMetric ? 'MPa' : 'psi', `Tested for ${cert.hydrotestDurationMin} min continuously`));
    lines.push(row('Hardness Rating', `${cert.hardnessHrc} HRC`, 'NACE MR0175 / ISO 15156 Sour Service Limit (<= 22 HRC)'));
    lines.push(row('ASTM Grain Size', cert.grainSize, 'ASTM E112 Microstructure'));
    lines.push('');

    if (cert.segments && cert.segments.length > 0) {
      lines.push(row('--- Certified Factory Strip Segments & Bias Welds ---'));
      lines.push(row('Strip #', 'Heat Number', 'Wall (in)', 'Length (ft)', 'Bias Weld Location (ft)', 'Yield (MPa)', 'Tensile (MPa)'));
      cert.segments.forEach((seg) => {
        lines.push(row(
          seg.stripNo,
          seg.heatNumber,
          seg.wallThicknessIn.toFixed(4),
          isMetric ? Math.round(seg.lengthM) : Math.round(seg.lengthFt),
          isMetric ? Math.round(seg.biasWeldLocationM) : Math.round(seg.biasWeldLocationFt),
          seg.yieldStrengthMpa,
          seg.tensileStrengthMpa
        ));
      });
      lines.push('');
    }
  }

  // 3. Working Limits & Structural Envelopes (API Spec 5ST)
  lines.push(row('=== 3. WORKING LIMITS & STRUCTURAL ENVELOPES (API SPEC 5ST) ==='));
  lines.push(row('Limit Parameter', 'Value', 'Unit', 'Calculation Basis'));
  lines.push(row('API 5ST 100% Burst Pressure', isMetric ? Math.round(limits.yieldBurstMpa) : Math.round(limits.yieldBurstPressurePsi), isMetric ? 'MPa' : 'psi', 'Barlow Thin-Wall Equation'));
  lines.push(row('API 5ST Derated Burst (87.5% Wall)', isMetric ? Math.round(limits.apiBurstMpa) : Math.round(limits.apiBurstPressurePsi), isMetric ? 'MPa' : 'psi', 'Standard API 5ST Nominal Wall Margin'));
  lines.push(row('80% Safe Working Burst Pressure', isMetric ? Math.round(limits.safeBurstPressurePsi * 0.00689476) : Math.round(limits.safeBurstPressurePsi), isMetric ? 'MPa' : 'psi', 'Recommended Surface Maximum Pump Limit'));
  lines.push(row('Nominal Collapse Pressure', isMetric ? Math.round(psiToMpa(limits.nominalCollapsePressurePsi)) : Math.round(limits.nominalCollapsePressurePsi), isMetric ? 'MPa' : 'psi', 'API 5C3 D/t Transition Formula'));
  lines.push(row('Ovality Derated Collapse Resistance', isMetric ? Math.round(limits.collapseMpa) : Math.round(limits.ovalityDeratedCollapsePsi), isMetric ? 'MPa' : 'psi', 'Haller-Lubinski Ovality Factor'));
  lines.push(row('100% Tensile Yield Limit (Zero Pressure)', isMetric ? Math.round(limits.tensileYieldKn) : Math.round(limits.tensileYieldLbf), isMetric ? 'kN' : 'lbf', 'Cross Section Area * Yield Strength'));
  lines.push(row('80% Safe Tensile Pull Limit', isMetric ? Math.round(limits.safeOverpullKn) : Math.round(limits.safeOverpullLbf), isMetric ? 'kN' : 'lbf', 'Operational Overpull Threshold'));
  lines.push('');

  // 4. Circulation Hydraulics Simulation
  lines.push(row('=== 4. CIRCULATION HYDRAULICS SIMULATION ==='));
  lines.push(row('Parameter', 'Value', 'Unit', 'Notes'));
  lines.push(row('Pump Flow Rate', isMetric ? (hydInput.flowRateGpm * 3.78541).toFixed(1) : hydInput.flowRateGpm.toFixed(1), isMetric ? 'L/min' : 'GPM', `${(hydInput.flowRateGpm / 42).toFixed(2)} bpm equivalent`));
  lines.push(row('Fluid Type', hydInput.fluidType, '', 'Fluid Rheology Selection'));
  lines.push(row('Fluid Density', hydInput.fluidDensityPpg.toFixed(2), 'ppg', `${(hydInput.fluidDensityPpg * 119.826).toFixed(1)} kg/m³`));
  lines.push(row('Fluid Viscosity', hydInput.fluidViscosityCp.toFixed(1), 'cP', 'Dynamic Viscosity'));
  lines.push(row('BHA Jet Nozzles', `${hydInput.nozzleCount} x ${hydInput.nozzleDiameterIn}"`, 'in', 'Bottom Hole Assembly Jetting Ports'));
  lines.push(row('Total Standpipe Surface Pressure', isMetric ? Math.round(psiToMpa(hyd.totalCirculatingPressurePsi)) : Math.round(hyd.totalCirculatingPressurePsi), isMetric ? 'MPa' : 'psi', 'Predicted Total Circulating Pressure'));
  lines.push(row('Coiled Tubing Pipe Friction Drop', isMetric ? Math.round(psiToMpa(hyd.pressureDropTubingPsi)) : Math.round(hyd.pressureDropTubingPsi), isMetric ? 'MPa' : 'psi', 'Internal CT Bore Head Loss'));
  lines.push(row('Jet Nozzle Pressure Drop', isMetric ? Math.round(psiToMpa(hyd.nozzlePressureDropPsi)) : Math.round(hyd.nozzlePressureDropPsi), isMetric ? 'MPa' : 'psi', 'BHA Orifice Drop'));
  lines.push(row('Annular Return Pressure Drop', isMetric ? Math.round(psiToMpa(hyd.annularPressureDropPsi)) : Math.round(hyd.annularPressureDropPsi), isMetric ? 'MPa' : 'psi', 'CT-Casing Annulus Drop'));
  lines.push(row('Fluid Velocity in Tubing', isMetric ? hyd.velocityMSec.toFixed(2) : hyd.velocityFtSec.toFixed(2), isMetric ? 'm/s' : 'ft/s', 'Internal Bore Velocity'));
  lines.push(row('Annular Return Velocity', isMetric ? hyd.annularVelocityMMin.toFixed(1) : hyd.annularVelocityFtMin.toFixed(1), isMetric ? 'm/min' : 'ft/min', 'Fluid Ascent Speed'));
  lines.push(row('Reynolds Number', Math.round(hyd.reynoldsNumber).toLocaleString(), '', `Flow Regime: ${hyd.flowRegime}`));
  lines.push(row('Churchill Straight Friction Factor (f)', hyd.frictionFactorStraight.toFixed(5), '', 'Darcy-Weisbach Straight'));
  lines.push(row('Ito Curvature Dean Multiplier', `${hyd.itoReelCurvatureMultiplier.toFixed(3)}x`, '', `+${Math.round((hyd.itoReelCurvatureMultiplier - 1) * 100)}% reel drum curvature friction penalty`));
  lines.push(row('Curved Reel Friction Factor (f_curv)', hyd.frictionFactorCurvedReel.toFixed(5), '', 'Includes Secondary Dean Vortices'));
  lines.push(row('Hydraulic Horsepower (HHP)', hyd.hydraulicHorsepowerHhp.toFixed(1), 'HHP', '(P_circ * Q) / 1714'));
  lines.push(row('Cuttings Transport Efficiency', `${hyd.cuttingsTransportEfficiencyPercent.toFixed(1)}%`, '%', 'Estimated Annular Hole Cleaning Factor'));
  lines.push('');

  // 5. Wellbore Forces, Mechanical Drag & Buckling
  lines.push(row('=== 5. WELLBORE FORCES, MECHANICAL DRAG & BUCKLING ==='));
  lines.push(row('Parameter', 'Value', 'Unit', 'Analysis / Limit'));
  lines.push(row('Wellbore Measured Depth (MD)', isMetric ? Math.round(ftToM(forcesInput.measuredDepthFt)) : forcesInput.measuredDepthFt, isMetric ? 'm' : 'ft', 'Target Well Depth'));
  lines.push(row('Wellbore True Vertical Depth (TVD)', isMetric ? Math.round(ftToM(forcesInput.trueVerticalDepthFt)) : forcesInput.trueVerticalDepthFt, isMetric ? 'm' : 'ft', 'Vertical Depth'));
  lines.push(row('Wellbore Inclination Angle', `${forcesInput.wellboreInclinationDeg}°`, 'degrees', 'Maximum Well Deviation'));
  lines.push(row('Casing Friction Coefficient', forcesInput.frictionCoefficientCasing.toFixed(2), '', 'Coulomb Friction Factor'));
  lines.push(row('Buoyancy Factor', forces.buoyancyFactor.toFixed(3), '', '1 - (rho_fluid / rho_steel)'));
  lines.push(row('Buoyed Unit Weight', isMetric ? (forces.buoyedWeightLbFt * 1.48816).toFixed(2) : forces.buoyedWeightLbFt.toFixed(3), isMetric ? 'kg/m' : 'lbs/ft', 'Weight in Wellbore Fluid'));
  lines.push(row('Surface Slack-off Weight (RIH)', isMetric ? Math.round(lbfToKn(forces.surfaceSlackoffWeightLbf)) : Math.round(forces.surfaceSlackoffWeightLbf), isMetric ? 'kN' : 'lbf', 'Weight Indicator Running In Hole'));
  lines.push(row('Surface Pick-up Weight (POOH)', isMetric ? Math.round(lbfToKn(forces.surfacePickupWeightLbf)) : Math.round(forces.surfacePickupWeightLbf), isMetric ? 'kN' : 'lbf', 'Weight Indicator Pulling Out Of Hole'));
  lines.push(row('Surface Neutral Weight', isMetric ? Math.round(lbfToKn(forces.surfaceNeutralWeightLbf)) : Math.round(forces.surfaceNeutralWeightLbf), isMetric ? 'kN' : 'lbf', 'Static Buoyant Hookload'));
  lines.push(row('Total Wellbore Cumulative Drag', isMetric ? Math.round(lbfToKn(forces.totalWellboreDragLbf)) : Math.round(forces.totalWellboreDragLbf), isMetric ? 'kN' : 'lbf', 'Total Frictional Resistance'));
  lines.push(row('Dawson-Paslay Sinusoidal Buckling (F_crit)', isMetric ? Math.round(lbfToKn(forces.criticalSinusoidalBucklingLbf)) : Math.round(forces.criticalSinusoidalBucklingLbf), isMetric ? 'kN' : 'lbf', 'Onset of Pipe Sinusoidal Waviness'));
  lines.push(row('Wu & Juvkam-Wold Helical Buckling (F_hel)', isMetric ? Math.round(lbfToKn(forces.helicalBucklingThresholdLbf)) : Math.round(forces.helicalBucklingThresholdLbf), isMetric ? 'kN' : 'lbf', 'Helical Lockup Limit (2.828 * F_crit)'));
  lines.push(row('Predicted Helical Lockup Depth', isMetric ? Math.round(ftToM(forces.helicalLockupDepthFt)) : Math.round(forces.helicalLockupDepthFt), isMetric ? 'm' : 'ft', 'Depth where compressive load reaches helical buckling'));
  lines.push(row('Mechanical Lockup Status', forces.isLockedUp ? 'WARNING: MECHANICAL LOCKUP DETECTED' : 'SAFE: No Lockup Detected', '', 'Ability to reach Bottom Hole'));
  lines.push('');

  // 6. Reel Spooling & Dimensions
  lines.push(row('=== 6. REEL SPOOLING & CAPACITY ANALYSIS ==='));
  lines.push(row('Parameter', 'Value', 'Unit', 'Specification'));
  lines.push(row('Reel Core Diameter', isMetric ? inToMm(ct.reelCoreDiameterIn).toFixed(1) : ct.reelCoreDiameterIn.toFixed(1), isMetric ? 'mm' : 'in', 'Reel Drum'));
  lines.push(row('Reel Flange Diameter', isMetric ? inToMm(ct.reelFlangeDiameterIn).toFixed(1) : ct.reelFlangeDiameterIn.toFixed(1), isMetric ? 'mm' : 'in', 'Reel Outer Flange'));
  lines.push(row('Reel Traverse Width', isMetric ? inToMm(ct.reelWidthIn).toFixed(1) : ct.reelWidthIn.toFixed(1), isMetric ? 'mm' : 'in', 'Inside Between Flanges'));
  lines.push(row('Wraps Per Layer', reel.wrapsPerLayer, 'wraps', 'Across Reel Width'));
  lines.push(row('Total Spooled Layers', reel.totalLayers, 'layers', 'Calculated Capacity Layers'));
  lines.push(row('Reel Maximum Capacity', isMetric ? Math.round(reel.maxCapacityM) : Math.round(reel.maxCapacityFt), isMetric ? 'm' : 'ft', 'Full Drum Capacity'));
  lines.push(row('Spool Fill Percentage', `${reel.spoolFillPercentage.toFixed(1)}%`, '%', 'Current String vs Full Reel'));
  lines.push(row('Current Spooled Tubing Weight (Air)', isMetric ? Math.round(reel.currentSpoolWeightKg) : Math.round(reel.currentSpoolWeightLbs), isMetric ? 'kg' : 'lbs', 'Steel Tubing Dry Weight'));
  lines.push(row('Gross Reel Rigging Weight (Filled)', isMetric ? Math.round(reel.totalReelWeightGrossLbs * 0.453592) : Math.round(reel.totalReelWeightGrossLbs), isMetric ? 'kg' : 'lbs', 'Tare + Tubing + Water Fill (Transport)'));
  lines.push('');

  // 7. Achilles 4.0 Fatigue Life & Deformation (Steven M. Tipton Model)
  lines.push(row('=== 7. ACHILLES 4.0 FATIGUE LIFE & DEFORMATION PREDICTION ==='));
  lines.push(row('Parameter', 'Value', 'Unit', 'Theoretical Basis'));
  lines.push(row('Material LCF Grade Database', fatigue.selectedGrade, '', 'CTES Table 1 Manson-Coffin Empirical Dataset'));
  lines.push(row('Internal Simulated Working Pressure', fatigue.internalPressurePsi, 'psi', 'Simulated Cyclic Pressure'));
  lines.push(row('Trips Executed to Date', fatigue.tripsRun, 'trips', 'Trip History'));
  lines.push(row('Total Trip Capacity to Failure', fatigue.estimatedTotalTripCycles, 'trips', 'Full 6-Event Plastic Cycle Limit'));
  lines.push(row('Damage Consumption Per Trip', `${fatigue.tripDamagePercent.toFixed(4)}%`, '% / trip', 'Manson-Coffin Multi-axial Summation'));
  lines.push(row('Accumulated Life Consumed', `${fatigue.accumulatedUsedLifePercent.toFixed(2)}%`, '%', 'Palmgren-Miner Linear Rule'));
  lines.push(row('Remaining Trips to Retirement (80% Limit)', fatigue.remainingTrips, 'trips', 'Operational Margin Before Pipe Retirement'));
  lines.push(row('Certified Factory Bias Weld Life', fatigue.biasWeldLifeTrips, 'trips', '0.92 Weld JIP Empirical Derating'));
  lines.push(row('Orbital Butt Weld Life', fatigue.orbitalButtWeldLifeTrips, 'trips', 'Field Butt Weld Derating'));
  lines.push(row('Max Bending Strain at Reel Drum', `${fatigue.deltaEpsXReelPercent.toFixed(3)}%`, '% strain', 'eps_x = (D - t) / 2R_reel'));
  lines.push(row('Max Bending Strain at Guide Arch (Gooseneck)', `${fatigue.deltaEpsXGooseneckPercent.toFixed(3)}%`, '% strain', 'eps_x = (D - t) / 2R_arch'));
  lines.push(row('Tipton Hoop Ballooning Growth (+Delta D)', isMetric ? `${(fatigue.ballooningGrowthEstimatedIn * 25.4).toFixed(3)} mm` : `${fatigue.ballooningGrowthEstimatedIn.toFixed(4)} in`, isMetric ? 'mm' : 'in', 'Diametral Growth (Tipton Equation 8)'));
  lines.push(row('Associated Wall Thinning (-Delta t)', `${fatigue.wallThinningPercent.toFixed(2)}%`, '%', 'Constant Volume Plasticity (Equation 11)'));
  lines.push('');

  // 8. Wellbore Trajectory Hookload Profile Table
  lines.push(row('=== 8. HOOKLOAD VS MEASURED DEPTH TRAJECTORY PROFILE ==='));
  lines.push(row(
    `Measured Depth (${isMetric ? 'm' : 'ft'})`,
    `Slack-off Load / RIH (${isMetric ? 'kN' : 'lbf'})`,
    `Neutral Load (${isMetric ? 'kN' : 'lbf'})`,
    `Pick-up Load / POOH (${isMetric ? 'kN' : 'lbf'})`,
    `Sinusoidal Limit (${isMetric ? 'kN' : 'lbf'})`,
    `Helical Limit (${isMetric ? 'kN' : 'lbf'})`
  ));

  forces.weightProfile.forEach((p) => {
    lines.push(row(
      isMetric ? Math.round(ftToM(p.depthFt)) : p.depthFt,
      isMetric ? Math.round(lbfToKn(p.slackoffLbf)) : Math.round(p.slackoffLbf),
      isMetric ? Math.round(lbfToKn(p.neutralLbf)) : Math.round(p.neutralLbf),
      isMetric ? Math.round(lbfToKn(p.pickupLbf)) : Math.round(p.pickupLbf),
      isMetric ? Math.round(lbfToKn(p.sinusoidalLimitLbf)) : Math.round(p.sinusoidalLimitLbf),
      isMetric ? Math.round(lbfToKn(p.helicalLimitLbf)) : Math.round(p.helicalLimitLbf)
    ));
  });

  // Prepend UTF-8 BOM for seamless Microsoft Excel compatibility
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadCoiledTubingCSV(
  ct: CoiledTubingString,
  unitSystem: UnitSystem = 'imperial',
  hydInput: HydraulicsInput = DEFAULT_HYDRAULICS,
  forcesInput: WellboreForcesInput = DEFAULT_FORCES
): void {
  const csvContent = generateCoiledTubingCSV(ct, unitSystem, hydInput, forcesInput);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanName = ct.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `coiled_matrix_${cleanName}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCalculationHistoryCSV(
  history: CalculationHistoryEntry[],
  unitSystem: UnitSystem = 'imperial'
): string {
  const isMetric = unitSystem === 'metric';
  const lines: string[] = [];

  lines.push(row('COILED MATRIX - CALCULATION SNAPSHOTS & AUDIT LOG'));
  lines.push(row('Export Date', new Date().toISOString()));
  lines.push(row('Total Snapshots', history.length));
  lines.push(row('Unit System', isMetric ? 'Metric (SI)' : 'US Oilfield Units'));
  lines.push('');

  // Column Headers
  lines.push(
    row(
      'Snapshot ID',
      'Timestamp (ISO)',
      'Display Time',
      'Title / Tag',
      'Source Module',
      'Safety Status (Pass/Fail)',
      'Max Safe Utilization (%)',
      'Governing Check',
      'Violations Count',
      'Primary Violation Details',
      'String Profile Name',
      'Steel Grade',
      isMetric ? 'OD (mm)' : 'OD (in)',
      isMetric ? 'Wall Thickness (mm)' : 'Wall Thickness (in)',
      isMetric ? 'Inner Diameter (mm)' : 'Inner Diameter (in)',
      isMetric ? 'Total Length (m)' : 'Total Length (ft)',
      isMetric ? 'Weight in Air (kg/m)' : 'Weight in Air (lb/ft)',
      isMetric ? 'Total Weight (kg)' : 'Total Weight (lbs)',
      'D/t Ratio',
      isMetric ? 'API Burst Pressure (MPa)' : 'API Burst Pressure (psi)',
      isMetric ? 'Collapse Pressure (MPa)' : 'Collapse Pressure (psi)',
      isMetric ? 'Tensile Yield (kN)' : 'Tensile Yield (lbf)',
      isMetric ? 'Safe Overpull (kN)' : 'Safe Overpull (lbf)',
      'Estimated Fatigue Trips',
      'Notes'
    )
  );

  history.forEach((item) => {
    const { metrics, stringSnapshot } = item;
    const safety = evaluateCalculationSafety(item);

    const od = isMetric ? inToMm(stringSnapshot.outerDiameterIn).toFixed(2) : stringSnapshot.outerDiameterIn.toFixed(3);
    const wt = isMetric ? inToMm(stringSnapshot.wallThicknessIn).toFixed(2) : stringSnapshot.wallThicknessIn.toFixed(3);
    const id = isMetric ? inToMm(metrics.innerDiameterIn).toFixed(2) : metrics.innerDiameterIn.toFixed(3);
    const len = isMetric ? Math.round(ftToM(stringSnapshot.totalLengthFt)) : Math.round(stringSnapshot.totalLengthFt);
    const wtInAir = isMetric ? (metrics.weightInAirLbFt * 1.48816).toFixed(2) : metrics.weightInAirLbFt.toFixed(2);
    const totWt = isMetric ? Math.round(metrics.totalWeightLbs * 0.453592) : Math.round(metrics.totalWeightLbs);
    const burst = isMetric ? psiToMpa(metrics.apiBurstPressurePsi).toFixed(1) : Math.round(metrics.apiBurstPressurePsi);
    const collapse = isMetric ? psiToMpa(metrics.collapsePressurePsi).toFixed(1) : Math.round(metrics.collapsePressurePsi);
    const tensile = isMetric ? lbfToKn(metrics.tensileYieldLbf).toFixed(1) : Math.round(metrics.tensileYieldLbf);
    const overpull = isMetric ? lbfToKn(metrics.safeOverpullLbf).toFixed(1) : Math.round(metrics.safeOverpullLbf);

    lines.push(
      row(
        item.id,
        item.timestamp,
        item.displayTime,
        item.title,
        item.sourceTab,
        safety.label,
        safety.maxUtilizationPercent.toFixed(1),
        safety.governingCheck,
        safety.violations.length,
        safety.violations.join('; ') || 'None (All safety checks passed)',
        stringSnapshot.name,
        stringSnapshot.grade,
        od,
        wt,
        id,
        len,
        wtInAir,
        totWt,
        metrics.dtRatio.toFixed(1),
        burst,
        collapse,
        tensile,
        overpull,
        metrics.estimatedFatigueLifeTrips || 120,
        item.notes || ''
      )
    );
  });

  return '\uFEFF' + lines.join('\r\n');
}

export function downloadCalculationHistoryCSV(
  history: CalculationHistoryEntry[],
  unitSystem: UnitSystem = 'imperial'
): void {
  const csvContent = generateCalculationHistoryCSV(history, unitSystem);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `coiled_matrix_calculation_history_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

