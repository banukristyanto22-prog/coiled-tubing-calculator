import { BhaConfiguration, BhaSegment, BhaSummaryMetrics, CoiledTubingString } from '../types/coiledTubing';

// Standard steel density: 0.2833 lb/in³ = 489.5 lb/ft³
export const STEEL_DENSITY_LB_CU_IN = 0.2833;

/**
 * Calculates theoretical linear weight (lb/ft) of a tubular segment based on OD and ID.
 * w = (pi / 4) * (OD² - ID²) * 12 in/ft * 0.2833 lb/in³
 * w ≈ 2.6698 * (OD² - ID²) lb/ft
 */
export function calculateSegmentLinearWeight(odIn: number, idIn: number): number {
  const safeOd = Math.max(0.5, odIn);
  const safeId = Math.min(safeOd - 0.05, Math.max(0, idIn));
  const areaSqIn = (Math.PI / 4) * (safeOd * safeOd - safeId * safeId);
  return Number((areaSqIn * 12 * STEEL_DENSITY_LB_CU_IN).toFixed(2));
}

/**
 * Calculates moment of inertia I (in⁴) of an annular tubular.
 * I = (pi / 64) * (OD⁴ - ID⁴)
 */
export function calculateSegmentMomentOfInertia(odIn: number, idIn: number): number {
  const safeOd = Math.max(0.5, odIn);
  const safeId = Math.min(safeOd - 0.05, Math.max(0, idIn));
  return (Math.PI / 64) * (Math.pow(safeOd, 4) - Math.pow(safeId, 4));
}

/**
 * Predefined standard BHA configurations for coiled tubing operations.
 */
export const BHA_PRESETS: Record<string, { name: string; description: string; badge: string; config: BhaConfiguration }> = {
  cleanout: {
    name: 'Cleanout & Jetting BHA (2-7/8")',
    description: 'Standard sand wash and wellbore cleanout assembly with dual flapper valves, hydraulic disconnect, dual-acting circulation sub, and high-velocity jetting nozzle.',
    badge: 'Cleanout • 2.875" OD',
    config: {
      enabled: true,
      name: 'Cleanout & Jetting BHA',
      segments: [
        {
          id: 'co-1',
          name: 'CT External Slip Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'High-tensile dimple or slip coiled tubing connector'
        },
        {
          id: 'co-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Primary well control barrier preventing reverse flow'
        },
        {
          id: 'co-3',
          name: 'Hydraulic Disconnect Sub',
          type: 'valve',
          lengthFt: 2.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#8b5cf6',
          description: 'Ball-activated release mechanism for emergency disconnect'
        },
        {
          id: 'co-4',
          name: 'Dual-Acting Circulation Sub',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#ec4899',
          description: 'Burst-disc or ball-drop high rate circulating valve'
        },
        {
          id: 'co-5',
          name: 'High-Velocity Hydro-Jetting Nozzle',
          type: 'nozzle_bit',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 0.500,
          color: '#10b981',
          description: 'Multi-port forward & back-pulsing sand jetting head'
        }
      ]
    }
  },
  motor_milling: {
    name: 'Motor & Scale Milling BHA (2-7/8" PDM)',
    description: 'Positive displacement mud motor with bi-directional hydraulic jar and concave junk mill for hard scale, cement, or bridge plug milling.',
    badge: 'Milling • 2.875" Motor',
    config: {
      enabled: true,
      name: 'Motor & Scale Milling BHA',
      segments: [
        {
          id: 'mm-1',
          name: 'CT External Slip Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'External slip connector with dual O-ring seals'
        },
        {
          id: 'mm-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 3.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'API RP 5C7 mandatory dual flapper check valve'
        },
        {
          id: 'mm-3',
          name: 'Hydraulic Disconnect',
          type: 'valve',
          lengthFt: 2.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#8b5cf6',
          description: 'Emergency hydraulic release sub with standard fishing neck'
        },
        {
          id: 'mm-4',
          name: 'Bi-Directional Hydraulic Jar',
          type: 'jar',
          lengthFt: 7.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.000,
          color: '#f59e0b',
          description: 'Delivers high upward/downward impact to free stuck BHA'
        },
        {
          id: 'mm-5',
          name: '2-7/8" PDM Mud Motor (5:6 Lobe)',
          type: 'motor',
          lengthFt: 18.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.100,
          color: '#ef4444',
          description: 'High-torque positive displacement downhole drilling motor'
        },
        {
          id: 'mm-6',
          name: '3-3/4" Concave Junk Mill / PDC Bit',
          type: 'nozzle_bit',
          lengthFt: 1.5,
          outerDiameterIn: 3.750,
          innerDiameterIn: 0.750,
          color: '#10b981',
          description: 'Tungsten carbide crushed scale / plug milling bit'
        }
      ]
    }
  },
  heavy_weight: {
    name: 'Heavy Weight & Stiff Extended Reach BHA',
    description: 'Thick-walled heavy drill collars and fluid oscillator (agitator) engineered to maximize bit weight, prevent coiled tubing buckling, and extend horizontal reach.',
    badge: 'Heavy Weight • 3.125" Collars',
    config: {
      enabled: true,
      name: 'Heavy Weight & Stiff Extended Reach BHA',
      segments: [
        {
          id: 'hw-1',
          name: 'Heavy Duty CT Connector',
          type: 'connector',
          lengthFt: 2.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.500,
          color: '#06b6d4',
          description: 'High-strength connector engineered for heavy loads'
        },
        {
          id: 'hw-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 3.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Pressure rated dual check valve'
        },
        {
          id: 'hw-3',
          name: 'Hydraulic Jar & Intensifier',
          type: 'jar',
          lengthFt: 9.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.000,
          color: '#f59e0b',
          description: 'Heavy jarring system with energy intensifier'
        },
        {
          id: 'hw-4',
          name: 'Heavy Weight Spiral Drill Collars',
          type: 'collar',
          lengthFt: 35.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.000,
          color: '#6366f1',
          description: 'High mass sinker bars adding critical downward weight to keep CT in tension'
        },
        {
          id: 'hw-5',
          name: 'Axial Fluid Oscillator (Agitator)',
          type: 'agitator',
          lengthFt: 8.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.125,
          color: '#d946ef',
          description: 'Creates pressure pulses to break wellbore friction and eliminate stick-slip'
        },
        {
          id: 'hw-6',
          name: '3-7/8" Roller Cone / Hybrid Bit',
          type: 'nozzle_bit',
          lengthFt: 2.0,
          outerDiameterIn: 3.875,
          innerDiameterIn: 0.750,
          color: '#10b981',
          description: 'Hard formation drilling bit with high-durability cutting structure'
        }
      ]
    }
  },
  fishing: {
    name: 'Fishing & Heavy Recovery BHA',
    description: 'Hydraulic jar, accelerator, and heavy-duty overshot toolstring for retrieving stuck downhole tubulars and wireline tools.',
    badge: 'Fishing • Jar & Accelerator',
    config: {
      enabled: true,
      name: 'Fishing & Heavy Recovery BHA',
      segments: [
        {
          id: 'fi-1',
          name: 'CT External Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'Rigid connection to CT string'
        },
        {
          id: 'fi-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Wellbore barrier sub'
        },
        {
          id: 'fi-3',
          name: 'Jar Accelerator (Intensifier)',
          type: 'jar',
          lengthFt: 10.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.100,
          color: '#f59e0b',
          description: 'Compressible fluid spring magnifying jarring energy'
        },
        {
          id: 'fi-4',
          name: 'Bi-Directional Hydraulic Fishing Jar',
          type: 'jar',
          lengthFt: 8.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.000,
          color: '#ea580c',
          description: 'High impact impact tool delivering upwards of 50,000 lbf shock'
        },
        {
          id: 'fi-5',
          name: 'Safety Joint / Disconnect',
          type: 'valve',
          lengthFt: 2.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#8b5cf6',
          description: 'Secondary release point if fish cannot be recovered'
        },
        {
          id: 'fi-6',
          name: 'Series 70 Releasing Overshot / Grapple',
          type: 'custom',
          lengthFt: 4.5,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.500,
          color: '#10b981',
          description: 'External catch overshot with spiral grapple and packoff'
        }
      ]
    }
  },
  logging_tractor: {
    name: 'Logging & Downhole Well Tractor BHA',
    description: 'Electric-line wet connect cablehead, casing collar locator (CCL), gamma ray sensor sub, and robotic well tractor for extreme horizontal reach.',
    badge: 'Tractor • E-Line Logging',
    config: {
      enabled: true,
      name: 'Logging & Downhole Well Tractor BHA',
      segments: [
        {
          id: 'lt-1',
          name: 'E-Line Cablehead Wet Connect',
          type: 'connector',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#06b6d4',
          description: 'Provides electrical connection for real-time telemetry'
        },
        {
          id: 'lt-2',
          name: 'Telemetry & CCL / Gamma Ray Sub',
          type: 'logging',
          lengthFt: 8.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Depth correlation and natural gamma ray measurement'
        },
        {
          id: 'lt-3',
          name: 'Electromechanical Downhole Tractor Drive',
          type: 'tractor',
          lengthFt: 22.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.000,
          color: '#8b5cf6',
          description: 'Robotic drive wheels pulling CT string deep into horizontal laterals'
        },
        {
          id: 'lt-4',
          name: 'Tapered Bullnose Guide Sub',
          type: 'nozzle_bit',
          lengthFt: 1.5,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.000,
          color: '#10b981',
          description: 'Smooth nose guiding tool through casing collars and liner tops'
        }
      ]
    }
  }
};

/**
 * Computes complete engineering summary metrics for a given BHA configuration.
 */
export function computeBhaSummaryMetrics(
  segments: BhaSegment[],
  ct: CoiledTubingString,
  fluidDensityPpg: number,
  casingInnerDiameterIn: number,
  wellboreInclinationDeg: number = 0,
  casingFrictionCoeff: number = 0.25
): BhaSummaryMetrics {
  if (!segments || segments.length === 0) {
    return {
      totalLengthFt: 0,
      totalLengthM: 0,
      totalAirWeightLbs: 0,
      totalAirWeightKg: 0,
      totalBuoyedWeightLbs: 0,
      totalBuoyedWeightKg: 0,
      avgOuterDiameterIn: ct.outerDiameterIn,
      maxOuterDiameterIn: ct.outerDiameterIn,
      effectiveStiffnessEi: (ct.youngsModulusPsi || 29.5e6) * (Math.PI / 64) * (Math.pow(ct.outerDiameterIn, 4) - Math.pow(ct.outerDiameterIn - 2 * ct.wallThicknessIn, 4)),
      stiffnessRatioVsCt: 1.0,
      bhaSinusoidalBucklingLbf: 0,
      bhaHelicalBucklingLbf: 0,
      addedSurfaceWeightLbf: 0,
      addedSurfaceDragLbf: 0,
      radialClearanceIn: (casingInnerDiameterIn - ct.outerDiameterIn) / 2
    };
  }

  const e = ct.youngsModulusPsi || 29.5e6;
  const ctId = Math.max(0.5, ct.outerDiameterIn - 2 * ct.wallThicknessIn);
  const ctInertia = (Math.PI / 64) * (Math.pow(ct.outerDiameterIn, 4) - Math.pow(ctId, 4));
  const ctEi = e * ctInertia;

  // Buoyancy factor
  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.6, 1 - fluidDensityPpg / steelPpg);

  let totalLenFt = 0;
  let totalAirWeightLbs = 0;
  let weightedEiSum = 0;
  let weightedOdSum = 0;
  let maxOd = 0;

  for (const s of segments) {
    const len = Math.max(0.1, s.lengthFt);
    const od = Math.max(0.5, s.outerDiameterIn);
    const id = Math.min(od - 0.05, Math.max(0, s.innerDiameterIn));

    // Linear weight
    const linWeight = s.linearWeightLbFt && s.linearWeightLbFt > 0
      ? s.linearWeightLbFt
      : calculateSegmentLinearWeight(od, id);

    const segAirWeight = linWeight * len;
    const segInertia = calculateSegmentMomentOfInertia(od, id);
    const segEi = e * segInertia;

    totalLenFt += len;
    totalAirWeightLbs += segAirWeight;
    weightedEiSum += segEi * len;
    weightedOdSum += od * len;
    if (od > maxOd) maxOd = od;
  }

  const avgOd = totalLenFt > 0 ? weightedOdSum / totalLenFt : ct.outerDiameterIn;
  const effectiveEi = totalLenFt > 0 ? weightedEiSum / totalLenFt : ctEi;
  const totalBuoyedWeightLbs = totalAirWeightLbs * buoyancyFactor;
  const avgBuoyedLbFt = totalLenFt > 0 ? totalBuoyedWeightLbs / totalLenFt : 0;
  const avgWbLbIn = avgBuoyedLbFt / 12;

  // Radial clearance
  const csgId = Math.max(maxOd + 0.1, casingInnerDiameterIn);
  const radialClearanceIn = Math.max(0.05, (csgId - maxOd) / 2);

  // Dawson-Paslay sinusoidal buckling capacity for the BHA
  const incRad = (wellboreInclinationDeg * Math.PI) / 180;
  const sinInc = Math.max(0.01, Math.sin(incRad));
  const cosInc = Math.cos(incRad);

  const verticalBhaBuckling = 2.05 * Math.pow(effectiveEi * Math.pow(avgWbLbIn, 2), 1 / 3);
  const bhaSinusoidalBucklingLbf = wellboreInclinationDeg < 5
    ? verticalBhaBuckling
    : Math.max(verticalBhaBuckling, 2 * Math.sqrt((effectiveEi * avgWbLbIn * sinInc) / radialClearanceIn));
  const bhaHelicalBucklingLbf = 2.828 * bhaSinusoidalBucklingLbf;

  // Added weight & normal contact drag at the end of the string
  const addedSurfaceWeightLbf = totalBuoyedWeightLbs * cosInc;
  const addedSurfaceDragLbf = casingFrictionCoeff * totalBuoyedWeightLbs * sinInc;

  return {
    totalLengthFt: Number(totalLenFt.toFixed(1)),
    totalLengthM: Number((totalLenFt * 0.3048).toFixed(1)),
    totalAirWeightLbs: Math.round(totalAirWeightLbs),
    totalAirWeightKg: Math.round(totalAirWeightLbs * 0.453592),
    totalBuoyedWeightLbs: Math.round(totalBuoyedWeightLbs),
    totalBuoyedWeightKg: Math.round(totalBuoyedWeightLbs * 0.453592),
    avgOuterDiameterIn: Number(avgOd.toFixed(3)),
    maxOuterDiameterIn: Number(maxOd.toFixed(3)),
    effectiveStiffnessEi: Number(effectiveEi.toFixed(0)),
    stiffnessRatioVsCt: Number((effectiveEi / Math.max(1, ctEi)).toFixed(1)),
    bhaSinusoidalBucklingLbf: Math.round(bhaSinusoidalBucklingLbf),
    bhaHelicalBucklingLbf: Math.round(bhaHelicalBucklingLbf),
    addedSurfaceWeightLbf: Math.round(addedSurfaceWeightLbf),
    addedSurfaceDragLbf: Math.round(addedSurfaceDragLbf),
    radialClearanceIn: Number(radialClearanceIn.toFixed(3))
  };
}
