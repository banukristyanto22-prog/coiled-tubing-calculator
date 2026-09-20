import { CoiledTubingJobType } from '../types/jobTypes';

export const COILED_TUBING_JOB_TYPES: CoiledTubingJobType[] = [
  {
    id: 'acidizing_stimulation',
    name: 'Matrix Acidizing & Stimulation',
    category: 'stimulation',
    description: 'High-pressure injection of hydrochloric (HCl) and hydrofluoric (HF) acid systems to remove formation damage and dissolve carbonate/sandstone scales.',
    typicalPumpPressurePsi: 4800,
    typicalFluidDensityPpg: 9.1,
    typicalFluidType: '15% HCl / Retarded Acid with Corrosion Inhibitor',
    typicalWhpPsi: 1200,
    recommendedFrictionFactor: 0.22,
    fatigueAccelerationMultiplier: 1.40, // High circulating pressure + corrosive acid derating accelerates LCF
    abrasionWearRatePercentPerJob: 0.35,
    ballooningGrowthThouPerJob: 4.5,
    corrosionRisk: 'severe',
    recommendedElastomers: 'Viton GLT, Aflas 90, FFKM (Kalrez)',
    typicalTripSpeedFtPerMin: 45,
    keyRisks: [
      'Severe hydrogen embrittlement and acid pitting corrosion if inhibitor fails',
      'High internal pressure causes accelerated diametral ballooning growth and wall thinning',
      'Rapid elastomer degradation in BHA check valves and stripper packing'
    ],
    bestPractices: [
      'Maintain inhibitor loading based on maximum expected Bottom Hole Temperature (BHT)',
      'Perform thorough fresh water + soda ash neutralization flush immediately upon POOH',
      'Derate burst and tensile limits by 15% when pumping live acid above 200°F (93°C)'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Acid Jetting Wash Nozzle', 'Circulating Sub']
  },
  {
    id: 'scale_cleanout',
    name: 'Scale Milling & Cement Cleanout',
    category: 'milling',
    description: 'Positive Displacement Motor (PDM) with carbide/diamond mill bit for removing barium sulfate, calcite scales, bridge plugs, or cement sheaths.',
    typicalPumpPressurePsi: 3800,
    typicalFluidDensityPpg: 8.6,
    typicalFluidType: 'Brine with Friction Reducer & Viscous Sweep Pills',
    typicalWhpPsi: 800,
    recommendedFrictionFactor: 0.26,
    fatigueAccelerationMultiplier: 1.35, // High cyclic reciprocation over tight interval + motor reactive torque
    abrasionWearRatePercentPerJob: 0.50,
    ballooningGrowthThouPerJob: 3.0,
    corrosionRisk: 'moderate',
    recommendedElastomers: 'HNBR, Viton',
    typicalTripSpeedFtPerMin: 30,
    keyRisks: [
      'String sticking and differential sticking when milling hard scale bridges',
      'Severe local fatigue concentration due to stationary reciprocation over 50-100 ft interval',
      'Motor stall causing sudden pressure spikes and torque transmission to CT string'
    ],
    bestPractices: [
      'Pump high-viscosity sweeps regularly to prevent cutting beds from accumulating around BHA',
      'Limit weight-on-bit (WOB) to 1,500 - 3,000 lbf to avoid stalling the PDM motor',
      'Record exact depth of reciprocation interval to monitor localized fatigue hotspots'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Downhole Filter Screen', 'PDM Mud Motor', 'Milling Bit / Tri-cone']
  },
  {
    id: 'nitrogen_lift',
    name: 'Nitrogen (N2) Kickoff & Gas Lift',
    category: 'nitrogen',
    description: 'High-rate gaseous nitrogen pumping to displace heavy kill brine or completion fluid, lower bottomhole hydrostatic pressure, and initiate well production.',
    typicalPumpPressurePsi: 2800,
    typicalFluidDensityPpg: 2.5,
    typicalFluidType: 'Cryogenic Gaseous Nitrogen (99.9% N2)',
    typicalWhpPsi: 450,
    recommendedFrictionFactor: 0.28,
    fatigueAccelerationMultiplier: 0.90, // Low density fluid, minimal corrosion, moderate pressure
    abrasionWearRatePercentPerJob: 0.10,
    ballooningGrowthThouPerJob: 1.5,
    corrosionRisk: 'low',
    recommendedElastomers: 'Low-Temp Nitrile, HNBR',
    typicalTripSpeedFtPerMin: 60,
    keyRisks: [
      'Extreme Joule-Thomson cooling causing cold embrittlement at wellhead chokes',
      'Gas compressibility causing surging hookloads and rapid fluid level transitions',
      'High annular gas velocities causing stripper element wear'
    ],
    bestPractices: [
      'Monitor wellhead fluid temperature continuously to keep above steel ductile-to-brittle transition',
      'Control N2 injection rates gradually (500 - 1500 scf/min) to avoid severe annular velocity erosion',
      'Maintain surface backpressure to prevent CT string upward buoyancy floating'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Multi-Orifice Jetting Nozzle']
  },
  {
    id: 'sand_jetting',
    name: 'Sand Jetting & Abrasive Perforating',
    category: 'stimulation',
    description: 'Pumping abrasive sand or garnet slurry at high velocity through tungsten carbide nozzles to cut casing slots, tubing perforations, or blast scale.',
    typicalPumpPressurePsi: 4500,
    typicalFluidDensityPpg: 9.6,
    typicalFluidType: 'Water/Gel Slurry with 20/40 or 100-mesh Sand Slurry (1-2 ppa)',
    typicalWhpPsi: 600,
    recommendedFrictionFactor: 0.29,
    fatigueAccelerationMultiplier: 1.30,
    abrasionWearRatePercentPerJob: 0.85, // Significant internal and external abrasive wear
    ballooningGrowthThouPerJob: 3.5,
    corrosionRisk: 'moderate',
    recommendedElastomers: 'Polyurethane, Abrasion-resistant HNBR',
    typicalTripSpeedFtPerMin: 25,
    keyRisks: [
      'Internal abrasive washout of CT pipe body and BHA connections',
      'Nozzle plugging leading to immediate overpressure spike',
      'Sand settlement around BHA during pump stops'
    ],
    bestPractices: [
      'Never stop pumping slurry while moving pipe; flush with minimum 1.5 string volumes of clean fluid before stopping',
      'Inspect wet-end internal surface with borescope after abrasive perforating jobs',
      'Use hardened tungsten-carbide orifice inserts only'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Abrasive Perforating Sub with Carbide Nozzles']
  },
  {
    id: 'fill_cleanout',
    name: 'Sand & Fill Cleanout (Venturi / Foam)',
    category: 'cleanout',
    description: 'Removing proppant, formation sand, or coal fines from vertical or horizontal wellbores using high-viscosity biopolymers, nitrified foam, or reverse circulation.',
    typicalPumpPressurePsi: 3200,
    typicalFluidDensityPpg: 8.8,
    typicalFluidType: 'Xanthan Biopolymer / Gel Foam Sweep',
    typicalWhpPsi: 500,
    recommendedFrictionFactor: 0.25,
    fatigueAccelerationMultiplier: 1.15,
    abrasionWearRatePercentPerJob: 0.30,
    ballooningGrowthThouPerJob: 2.0,
    corrosionRisk: 'low',
    recommendedElastomers: 'Standard Nitrile, HNBR',
    typicalTripSpeedFtPerMin: 50,
    keyRisks: [
      'Solid bed formation in lateral sections causing mechanical CT lockup or packing off',
      'Loss of circulation into depleted formation while circulating sand',
      'Excessive drag forces during POOH when pulling through settled solids'
    ],
    bestPractices: [
      'Maintain annular return fluid velocity above minimum particle slip velocity (typically > 120 ft/min)',
      'Perform regular wiper trips (re-trace 300 - 500 ft) to clear trailing solids beds',
      'Monitor return returns shaker screens continuously for cuttings volume vs pumped volume balance'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Rotary Jetting Nozzle / Venturi Junk Basket']
  },
  {
    id: 'fishing_operation',
    name: 'Heavy Fishing & Jarring Recovery',
    category: 'mechanical',
    description: 'Running overshots, spears, or grappling tools with hydraulic jars and accelerator to latch, jar, and recover stuck downhole tools or wireline strings.',
    typicalPumpPressurePsi: 2500,
    typicalFluidDensityPpg: 8.4,
    typicalFluidType: 'Clean Brine with Lubricant & Friction Reducer',
    typicalWhpPsi: 300,
    recommendedFrictionFactor: 0.20,
    fatigueAccelerationMultiplier: 1.25, // High tension cycles and shock loads from jarring impact
    abrasionWearRatePercentPerJob: 0.20,
    ballooningGrowthThouPerJob: 1.5,
    corrosionRisk: 'low',
    recommendedElastomers: 'High-Durometer Viton / FFKM',
    typicalTripSpeedFtPerMin: 35,
    keyRisks: [
      'Exceeding 80% tensile yield limit during heavy overpull / jarring impacts',
      'Fish parting or dropping downhole causing rapid tension release / rebound',
      'Injector chain slippage under maximum allowable pull'
    ],
    bestPractices: [
      'Set hydraulic overpull alarms strictly at safe operational limit (OPLIM POH)',
      'Inspect CT string for necking, elongation, or diameter reduction after jarring sessions',
      'Ensure accelerator sub is placed above hydraulic jar to maximize kinetic impact and isolate CT string from shockwave'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Heavy Duty Hydraulic Jar', 'Accelerator Sub', 'Hydraulic Disconnect', 'Catch Tool / Overshot']
  },
  {
    id: 'well_kill_pumping',
    name: 'Well Kill & Heavy Fluid Displacement',
    category: 'cleanout',
    description: 'Pumping high-density kill brines (calcium chloride, calcium bromide, zinc bromide) to establish hydrostatic overbalance on live wells.',
    typicalPumpPressurePsi: 3500,
    typicalFluidDensityPpg: 12.8,
    typicalFluidType: 'Heavy Calcium Chloride / Calcium Bromide Kill Brine',
    typicalWhpPsi: 1500,
    recommendedFrictionFactor: 0.23,
    fatigueAccelerationMultiplier: 1.10,
    abrasionWearRatePercentPerJob: 0.15,
    ballooningGrowthThouPerJob: 2.0,
    corrosionRisk: 'moderate',
    recommendedElastomers: 'EPDM, Viton, HNBR',
    typicalTripSpeedFtPerMin: 40,
    keyRisks: [
      'High external hydrostatic collapse pressure on CT string if string is evacuated or displaced to gas',
      'Severe buoyancy reduction increases surface hanging hookload significantly',
      'Heavy brine crystallization at low surface temperatures'
    ],
    bestPractices: [
      'Verify collapse resistance safety margin with maximum external hydrostatic column and zero internal pressure',
      'Ensure surface weight indicator tare is calibrated for heavy buoyed string weight',
      'Flush kill brine with treated fresh water prior to pulling out of hole'
    ],
    recommendedBhaTools: ['Dual Flapper Check Valve', 'Hydraulic Disconnect', 'Circulating Port Sub']
  },
  {
    id: 'velocity_string',
    name: 'Velocity / Siphon String Deployment',
    category: 'velocity_string',
    description: 'Hanging a small-diameter CT string inside production tubing to reduce cross-sectional flow area, increase gas velocity, and prevent liquid loading.',
    typicalPumpPressurePsi: 1500,
    typicalFluidDensityPpg: 8.4,
    typicalFluidType: 'Treated Fresh Water / Packer Fluid with Biocide',
    typicalWhpPsi: 800,
    recommendedFrictionFactor: 0.24,
    fatigueAccelerationMultiplier: 0.70, // Semi-permanent or static hanging installation; very low cyclic bending
    abrasionWearRatePercentPerJob: 0.05,
    ballooningGrowthThouPerJob: 0.5,
    corrosionRisk: 'moderate',
    recommendedElastomers: 'Aflas 90, Viton 90',
    typicalTripSpeedFtPerMin: 40,
    keyRisks: [
      'Long-term tensile creep and hanging fatigue at wellhead hanger slips',
      'Corrosive attack from produced CO2 and H2S in the annulus over months/years',
      'Buckling within oversized casing sections during setting'
    ],
    bestPractices: [
      'Select high-corrosion-resistant material grade (e.g., CT90/CT100 or CRA alloy)',
      'Install specialized CT hanger spool with positive annular packoff seal and hold-down slips',
      'Apply corrosion inhibitor batch treatment to annulus above setting depth'
    ],
    recommendedBhaTools: ['Check Valve', 'Landing Nipple Profile', 'Re-entry Guide / Mule Shoe', 'CT Wellhead Hanger Assembly']
  }
];

export const getJobTypeById = (id: string): CoiledTubingJobType => {
  return COILED_TUBING_JOB_TYPES.find((j) => j.id === id) || COILED_TUBING_JOB_TYPES[0];
};
