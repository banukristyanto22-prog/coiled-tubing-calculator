import { BhaConfiguration, BhaSegment, BhaSummaryMetrics, BhaToolType, CoiledTubingString } from '../types/coiledTubing';

// Standard steel density: 0.2833 lb/in³ = 489.5 lb/ft³
export const STEEL_DENSITY_LB_CU_IN = 0.2833;

export const TOOL_TYPE_DEFAULTS: Record<BhaToolType, { name: string; defaultOd: number; defaultId: number; defaultLen: number; color: string }> = {
  connector: { name: 'CT External Connector', defaultOd: 2.875, defaultId: 1.750, defaultLen: 1.5, color: '#06b6d4' },
  valve: { name: 'Dual Flapper Check Valve', defaultOd: 2.875, defaultId: 1.250, defaultLen: 2.5, color: '#3b82f6' },
  jar: { name: 'Bi-Directional Hydraulic Jar', defaultOd: 2.875, defaultId: 1.000, defaultLen: 7.0, color: '#f59e0b' },
  motor: { name: 'PDM Mud Motor (5:6 Lobe)', defaultOd: 2.875, defaultId: 1.100, defaultLen: 18.0, color: '#ef4444' },
  collar: { name: 'Heavy Weight Drill Collars', defaultOd: 3.125, defaultId: 1.000, defaultLen: 30.0, color: '#6366f1' },
  agitator: { name: 'Axial Fluid Oscillator (Agitator)', defaultOd: 3.125, defaultId: 1.125, defaultLen: 8.0, color: '#d946ef' },
  tractor: { name: 'Robotic Downhole Well Tractor', defaultOd: 3.125, defaultId: 1.000, defaultLen: 22.0, color: '#8b5cf6' },
  logging: { name: 'CCL & Gamma Ray Sensor Sub', defaultOd: 2.875, defaultId: 1.250, defaultLen: 8.0, color: '#0ea5e9' },
  nozzle_bit: { name: 'Concave Junk Mill / PDC Bit', defaultOd: 3.750, defaultId: 0.750, defaultLen: 1.5, color: '#10b981' },
  custom: { name: 'Specialty Tool Sub', defaultOd: 2.875, defaultId: 1.250, defaultLen: 3.0, color: '#14b8a6' },
};

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
  },
  matrix_acidizing: {
    name: 'Matrix Acidizing & Spotting Wash BHA (2-7/8")',
    description: 'Dual flapper check valve, hydraulic disconnect, mechanical selective straddle cup wash sub, and multi-port acid spotting nozzle for targeted reservoir stimulation.',
    badge: 'Stimulation • 2.875" Straddle',
    config: {
      enabled: true,
      name: 'Matrix Acidizing & Spotting Wash BHA',
      segments: [
        {
          id: 'ma-1',
          name: 'CT External Dimple Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'High pressure acid-resistant external connector'
        },
        {
          id: 'ma-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'API RP 5C7 compliant non-return barrier with Hastelloy trim'
        },
        {
          id: 'ma-3',
          name: 'Hydraulic Disconnect Sub',
          type: 'valve',
          lengthFt: 2.0,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#8b5cf6',
          description: 'Emergency release mechanism for high H2S / acid environment'
        },
        {
          id: 'ma-4',
          name: 'Selective Straddle Cup Wash Tool',
          type: 'custom',
          lengthFt: 6.5,
          outerDiameterIn: 3.250,
          innerDiameterIn: 1.250,
          color: '#ec4899',
          description: 'High-temperature elastomer opposing cups for targeted interval acid injection'
        },
        {
          id: 'ma-5',
          name: 'Dual-Acting Circulation Sub',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#f59e0b',
          description: 'Enables high-rate displacement and reverse flush'
        },
        {
          id: 'ma-6',
          name: 'Multi-Orifice Radial Acid Jetting Nozzle',
          type: 'nozzle_bit',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 0.500,
          color: '#10b981',
          description: 'Tungsten carbide radial ports delivering 360-degree perforation coverage'
        }
      ]
    }
  },
  packer_plug_setting: {
    name: 'Bridge Plug & Inflatable Packer Setting BHA',
    description: 'Hydraulic setting tool assembly with mechanical anti-preset sleeve, ball-drop inflation module, and shear-pin release for reliable zonal isolation.',
    badge: 'Zonal Isolation • Setting Tool',
    config: {
      enabled: true,
      name: 'Bridge Plug & Inflatable Packer Setting BHA',
      segments: [
        {
          id: 'ps-1',
          name: 'CT External Slip Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'Tensile-rated CT connector'
        },
        {
          id: 'ps-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Dual check valve barrier'
        },
        {
          id: 'ps-3',
          name: 'Hydraulic Disconnect & Equalizing Sub',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#8b5cf6',
          description: 'Emergency hydraulic release with pressure equalization ports'
        },
        {
          id: 'ps-4',
          name: 'Hydraulic Setting Tool Actuator (Size 10 / 20)',
          type: 'custom',
          lengthFt: 8.5,
          outerDiameterIn: 3.250,
          innerDiameterIn: 1.000,
          color: '#d946ef',
          description: 'Multi-stage piston generating up to 35,000 lbf setting stroke force'
        },
        {
          id: 'ps-5',
          name: 'Mechanical Shear Release Sub',
          type: 'valve',
          lengthFt: 2.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.000,
          color: '#ea580c',
          description: 'Calibrated brass shear screws release toolstring after plug setting'
        },
        {
          id: 'ps-6',
          name: 'Bridge Plug Setting Adapter & Guide Sub',
          type: 'nozzle_bit',
          lengthFt: 2.0,
          outerDiameterIn: 3.500,
          innerDiameterIn: 0.875,
          color: '#10b981',
          description: 'Direct engagement mandrel for retrievable bridge plugs and packers'
        }
      ]
    }
  },
  venturi_sand_cleanout: {
    name: 'Venturi Jet Vacuum & Debris Bailer BHA',
    description: 'Reverse-circulation venturi jet pump with dual debris screen baskets, magnetic junk sub, and high-velocity suction nozzle to recover heavy cuttings without fluid loss.',
    badge: 'Debris Recovery • Venturi Jet',
    config: {
      enabled: true,
      name: 'Venturi Jet Vacuum & Debris Bailer BHA',
      segments: [
        {
          id: 'vj-1',
          name: 'CT External Slip Connector',
          type: 'connector',
          lengthFt: 1.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.750,
          color: '#06b6d4',
          description: 'High-torque connector'
        },
        {
          id: 'vj-2',
          name: 'Dual Flapper Check Valve',
          type: 'valve',
          lengthFt: 2.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.250,
          color: '#3b82f6',
          description: 'Standard safety barrier'
        },
        {
          id: 'vj-3',
          name: 'Venturi Jet Cavitation Pump Sub',
          type: 'custom',
          lengthFt: 4.5,
          outerDiameterIn: 2.875,
          innerDiameterIn: 1.000,
          color: '#0ea5e9',
          description: 'Converts forward pumped fluid into localized downhole reverse vacuum'
        },
        {
          id: 'vj-4',
          name: 'Debris Screen & Filter Basket (Dual Section)',
          type: 'collar',
          lengthFt: 12.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.750,
          color: '#6366f1',
          description: 'Traps sand, iron scale, and perforation debris internally'
        },
        {
          id: 'vj-5',
          name: 'Magnetic Junk Catcher Sub',
          type: 'custom',
          lengthFt: 2.0,
          outerDiameterIn: 3.125,
          innerDiameterIn: 1.250,
          color: '#f59e0b',
          description: 'Rare-earth neodymium magnets to capture ferrous milling swarf'
        },
        {
          id: 'vj-6',
          name: 'High-Velocity Vacuum Suction Nozzle',
          type: 'nozzle_bit',
          lengthFt: 1.5,
          outerDiameterIn: 3.250,
          innerDiameterIn: 1.500,
          color: '#10b981',
          description: 'High-intake suction mouth with tapered guide chamfer'
        }
      ]
    }
  }
};

// Aliases for convenient and resilient key lookup across modules
BHA_PRESETS.milling = BHA_PRESETS.motor_milling;
BHA_PRESETS.heavyDuty = BHA_PRESETS.heavy_weight;
BHA_PRESETS.heavy_duty = BHA_PRESETS.heavy_weight;
BHA_PRESETS.tractor = BHA_PRESETS.logging_tractor;
BHA_PRESETS.acid = BHA_PRESETS.matrix_acidizing;
BHA_PRESETS.packer = BHA_PRESETS.packer_plug_setting;
BHA_PRESETS.venturi = BHA_PRESETS.venturi_sand_cleanout;

export interface BhaLibraryItemMetadata {
  id: string;
  presetKey: string;
  name: string;
  shortName: string;
  category: 'cleanout' | 'milling' | 'extended_reach' | 'intervention' | 'logging' | 'contingency';
  badge: string;
  description: string;
  operationalApplication: string;
  forcesImpactSummary: string;
  typicalToolCount: number;
  config: BhaConfiguration;
  colorTheme: {
    border: string;
    bg: string;
    accent: string;
    text: string;
    ring: string;
  };
}

export const BHA_LIBRARY_ITEMS: BhaLibraryItemMetadata[] = [
  {
    id: 'cleanout',
    presetKey: 'cleanout',
    name: 'Cleanout & Jetting BHA (2-7/8")',
    shortName: 'Cleanout & Wash',
    category: 'cleanout',
    badge: 'Cleanout • 2.875" OD',
    description: 'Standard sand wash and wellbore cleanout assembly with dual flapper valves, hydraulic disconnect, circulation sub, and multi-port wash nozzle.',
    operationalApplication: 'Sand washing, bridge plug wash-down, fluid displacement, and wellbore cleanout prior to completions.',
    forcesImpactSummary: 'Compact length (9.0 ft) and light buoyed weight (~160 lbs). Low axial drag, minimal stiffness increase over bare CT.',
    typicalToolCount: 5,
    config: BHA_PRESETS.cleanout.config,
    colorTheme: {
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-950/30',
      accent: '#06b6d4',
      text: 'text-cyan-300',
      ring: 'ring-cyan-500',
    }
  },
  {
    id: 'motor_milling',
    presetKey: 'motor_milling',
    name: 'Motor & Scale Milling BHA (2-7/8" PDM)',
    shortName: 'PDM Milling',
    category: 'milling',
    badge: 'Milling • 2.875" Motor',
    description: 'Positive displacement mud motor (5:6 lobe) with bi-directional hydraulic jar and concave junk mill for hard scale, cement, or composite plug milling.',
    operationalApplication: 'Composite frac plug milling, barium scale removal, cement drill-out, and under-reaming.',
    forcesImpactSummary: 'Long assembly (33.0 ft) with 2.4× bending stiffness. Requires monitored WOB and overpull margin for motor reactive torque.',
    typicalToolCount: 6,
    config: BHA_PRESETS.motor_milling.config,
    colorTheme: {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/30',
      accent: '#ef4444',
      text: 'text-rose-300',
      ring: 'ring-rose-500',
    }
  },
  {
    id: 'heavy_weight',
    presetKey: 'heavy_weight',
    name: 'Heavy Weight & Stiff Extended Reach BHA',
    shortName: 'Heavy Collars',
    category: 'extended_reach',
    badge: 'Heavy Weight • 3.125" Collars',
    description: 'Thick-walled heavy spiral drill collars (35 ft) and axial fluid oscillator (agitator) engineered to maximize bit weight, mitigate helical lockup, and extend reach.',
    operationalApplication: 'Deep horizontal wells, high friction laterals, tight formations requiring high WOB without coiled tubing buckling.',
    forcesImpactSummary: 'Massive buoyed weight (+1,120 lbs at TD) and high bending rigidity (3.2× CT). Elevates helical buckling threshold by up to 45%.',
    typicalToolCount: 6,
    config: BHA_PRESETS.heavy_weight.config,
    colorTheme: {
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-950/30',
      accent: '#6366f1',
      text: 'text-indigo-300',
      ring: 'ring-indigo-500',
    }
  },
  {
    id: 'venturi_sand_cleanout',
    presetKey: 'venturi_sand_cleanout',
    name: 'Venturi Jet Vacuum & Debris Bailer BHA',
    shortName: 'Venturi Vacuum',
    category: 'cleanout',
    badge: 'Debris Recovery • Venturi Jet',
    description: 'Reverse-circulation venturi jet pump with dual debris screen baskets, magnetic swarf catcher, and suction nozzle to recover heavy cuttings without formation fluid loss.',
    operationalApplication: 'Low bottomhole pressure reservoirs, depleted zones, heavy proppant sand cleanout where conventional circulation causes severe losses.',
    forcesImpactSummary: 'Moderate length (24.0 ft) and balanced weight (~480 lbs). Internal debris accumulation gradually increases buoyed weight during run.',
    typicalToolCount: 6,
    config: BHA_PRESETS.venturi_sand_cleanout.config,
    colorTheme: {
      border: 'border-teal-500/40',
      bg: 'bg-teal-950/30',
      accent: '#14b8a6',
      text: 'text-teal-300',
      ring: 'ring-teal-500',
    }
  },
  {
    id: 'matrix_acidizing',
    presetKey: 'matrix_acidizing',
    name: 'Matrix Acidizing & Spotting Wash BHA (2-7/8")',
    shortName: 'Acid Wash',
    category: 'intervention',
    badge: 'Stimulation • 2.875" Straddle',
    description: 'Dual flapper check valve, hydraulic disconnect, mechanical selective straddle cup wash sub, and multi-port acid spotting nozzle for targeted reservoir treatment.',
    operationalApplication: 'Perforation breakdown, carbonate matrix acid wash, selective zone isolation, scale dissolve treatments.',
    forcesImpactSummary: 'Cup drag adds 400-800 lbf of axial drag during RIH and POOH. Tight casing clearance requires steady running speeds.',
    typicalToolCount: 6,
    config: BHA_PRESETS.matrix_acidizing.config,
    colorTheme: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/30',
      accent: '#f59e0b',
      text: 'text-amber-300',
      ring: 'ring-amber-500',
    }
  },
  {
    id: 'packer_plug_setting',
    presetKey: 'packer_plug_setting',
    name: 'Bridge Plug & Inflatable Packer Setting BHA',
    shortName: 'Plug Setting',
    category: 'intervention',
    badge: 'Zonal Isolation • Setting Tool',
    description: 'Hydraulic setting tool assembly with mechanical anti-preset sleeve, ball-drop inflation module, and shear-pin release for reliable zonal isolation.',
    operationalApplication: 'Setting cast iron bridge plugs, composite plugs, cement retainers, and inflatable testing/straddle packers.',
    forcesImpactSummary: 'Requires high surface pump pressure (2,500-4,000 psi) and verified overpull test (5,000-10,000 lbf) to confirm setting before shear release.',
    typicalToolCount: 6,
    config: BHA_PRESETS.packer_plug_setting.config,
    colorTheme: {
      border: 'border-purple-500/40',
      bg: 'bg-purple-950/30',
      accent: '#a855f7',
      text: 'text-purple-300',
      ring: 'ring-purple-500',
    }
  },
  {
    id: 'logging_tractor',
    presetKey: 'logging_tractor',
    name: 'Logging & Downhole Well Tractor BHA',
    shortName: 'E-Line Tractor',
    category: 'logging',
    badge: 'Tractor • E-Line Logging',
    description: 'Electric-line wet connect cablehead, casing collar locator (CCL), gamma ray sensor sub, and robotic well tractor for extreme horizontal reach.',
    operationalApplication: 'Production logging, cement bond evaluation, perforating in ultra-long horizontal laterals beyond CT helical lockup depth.',
    forcesImpactSummary: 'Generates up to 2,500 lbf of motorized pull traction, converting CT compressive lockup back into favorable axial tension.',
    typicalToolCount: 4,
    config: BHA_PRESETS.logging_tractor.config,
    colorTheme: {
      border: 'border-sky-500/40',
      bg: 'bg-sky-950/30',
      accent: '#0ea5e9',
      text: 'text-sky-300',
      ring: 'ring-sky-500',
    }
  },
  {
    id: 'fishing',
    presetKey: 'fishing',
    name: 'Fishing & Heavy Recovery BHA',
    shortName: 'Fishing & Jars',
    category: 'contingency',
    badge: 'Fishing • Jar & Accelerator',
    description: 'Hydraulic jar, fluid intensifier accelerator, safety disconnect joint, and releasing spiral overshot toolstring for retrieving stuck downhole tubulars.',
    operationalApplication: 'Fishing parted wireline, coiled tubing fish, dropped tools, and stuck downhole flow control valves.',
    forcesImpactSummary: 'High surface overpull limit needed (+30,000-50,000 lbf) to energize hydraulic jar trip cycle. Dynamic impact peak must not exceed CT tensile yield.',
    typicalToolCount: 6,
    config: BHA_PRESETS.fishing.config,
    colorTheme: {
      border: 'border-orange-500/40',
      bg: 'bg-orange-950/30',
      accent: '#f97316',
      text: 'text-orange-300',
      ring: 'ring-orange-500',
    }
  }
];

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
