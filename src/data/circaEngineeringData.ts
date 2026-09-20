import {
  CircaFrictionPreset,
  CircaInjectorSpec,
  CircaScaleMillingSpec,
  CircaProppantMeshSpec,
} from '../types/coiledTubing';

/**
 * Wellbore Contact Friction Coefficients Catalog
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 11, Page 155)
 * and SPE 81715 / SPE 189935 (Craig 2003, Aitken & Livescu 2019).
 * 
 * Note: Craig (2003) confirmed 0.24 as the North Sea 33-monobore validated default
 * for clean dry pipe, which replaced the older 0.20 default in commercial simulators.
 */
export const CIRCA_FRICTION_COEFFICIENTS: CircaFrictionPreset[] = [
  {
    id: 'fr_clean_pipe',
    name: 'Friction-Reduced Clean Pipe',
    typical: 0.16,
    min: 0.14,
    max: 0.24,
    category: 'pipe',
    description: 'Cased hole with continuous friction reducer (e.g. FRW-16, EasyReach) or polymeric lubricant in circulation.',
  },
  {
    id: 'oil_water_wet_pipe',
    name: 'Clean Pipe Oil/Water Wet',
    typical: 0.20,
    min: 0.18,
    max: 0.30,
    category: 'pipe',
    description: 'Standard cased hole with light base oil, diesel, or fresh water circulation without dedicated friction reducer.',
  },
  {
    id: 'clean_dry_pipe',
    name: 'Clean Dry Pipe (CIRCA™ Benchmark Default)',
    typical: 0.24,
    min: 0.20,
    max: 0.40,
    category: 'pipe',
    description: 'Industry benchmark default (Craig 2003, 33-monobore North Sea study). Valid for standard CT sliding in cased completions.',
  },
  {
    id: 'predrilled_liner',
    name: 'Pre-Drilled Liner',
    typical: 0.23,
    min: 0.18,
    max: 0.30,
    category: 'liner',
    description: 'Casing sections with pre-drilled round holes for drainage or sand control.',
  },
  {
    id: 'slotted_liner',
    name: 'Slotted Liner',
    typical: 0.30,
    min: 0.23,
    max: 0.35,
    category: 'liner',
    description: 'Machine-slotted completion liner sections; generates localized drag on CT string.',
  },
  {
    id: 'rough_pipe',
    name: 'Rough / Corroded Pipe',
    typical: 0.30,
    min: 0.23,
    max: 0.35,
    category: 'pipe',
    description: 'Old, pitted, or acid-washed production tubing with elevated absolute roughness (0.0028" - 0.0050").',
  },
  {
    id: 'gravel_pack_screen',
    name: 'Gravel Pack Screen',
    typical: 0.35,
    min: 0.23,
    max: 0.50,
    category: 'screen',
    description: 'Wirewrap, prepack, or premium sand control screens. High mechanical contact friction.',
  },
  {
    id: 'open_hole',
    name: 'Open Hole Formation',
    typical: 0.40,
    min: 0.23,
    max: 0.50,
    category: 'open_hole',
    description: 'Uncased borehole in hard rock / carbonates. Roughness between 0.02" and 0.05".',
  },
  {
    id: 'badly_scaled_fill',
    name: 'Badly Scaled Wellbore / Large Fill',
    typical: 0.50,
    min: 0.40,
    max: 1.00,
    category: 'scale',
    description: 'Severe mineral scale deposition, proppant beds, or particulate debris causing extreme drag.',
  },
];

/**
 * Surface Injector Head Rig-Up Specifications
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 6, Pages 108–109)
 */
export const CIRCA_INJECTOR_SPECS: CircaInjectorSpec[] = [
  {
    model: 'Hydra Rig HR-240',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 40000,
    snubCapacityLbf: 15000,
    distanceInjectorStripperIn: 14.6,
    description: 'Lightweight service injector for 1.0" - 1.5" CT strings.',
  },
  {
    model: 'Hydra Rig HR-260',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 60000,
    snubCapacityLbf: 15000,
    distanceInjectorStripperIn: 14.6,
    description: 'Intermediate workover injector for 1.25" - 1.75" CT strings.',
  },
  {
    model: 'Hydra Rig HR-440',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 40000,
    snubCapacityLbf: 20000,
    distanceInjectorStripperIn: 14.4,
    description: 'Compact high-speed injector for shallow to medium depth operations.',
  },
  {
    model: 'Hydra Rig HR-480',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 100000,
    snubCapacityLbf: 40000,
    distanceInjectorStripperIn: 14.0,
    description: 'Heavy duty coiled tubing injector with 100,000 lbf pull capacity for deep land wells.',
  },
  {
    model: 'Hydra Rig HR-560',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 60000,
    snubCapacityLbf: 26000,
    distanceInjectorStripperIn: 9.7,
    description: 'Close-coupled low-clearance injector reducing unsupported buckling length (9.7").',
  },
  {
    model: 'Hydra Rig HR-580',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 80000,
    snubCapacityLbf: 40000,
    distanceInjectorStripperIn: 9.7,
    description: 'Heavy duty 80,000 lbf pull injector with 9.7" close-coupled stripper distance.',
  },
  {
    model: 'Hydra Rig HR-5100',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 100000,
    snubCapacityLbf: 50000,
    distanceInjectorStripperIn: 13.9,
    description: '100,000 lbf pull / 50,000 lbf snub high-pressure injector head.',
  },
  {
    model: 'Hydra Rig HR-6100',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 100000,
    snubCapacityLbf: 50000,
    distanceInjectorStripperIn: 7.87,
    description: 'Ultra-short 7.87" chain-to-stripper distance for extreme HPHT snubbing buckling mitigation.',
  },
  {
    model: 'Hydra Rig HR-635',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 35000,
    snubCapacityLbf: 15000,
    distanceInjectorStripperIn: 9.4,
    description: 'Compact velocity string & capillary injection unit.',
  },
  {
    model: 'Hydra Rig HR-660',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 60000,
    snubCapacityLbf: 30000,
    distanceInjectorStripperIn: 9.7,
    description: 'Medium-duty versatile injector head.',
  },
  {
    model: 'Hydra Rig HR-680',
    manufacturer: 'NOV Hydra Rig',
    pullCapacityLbf: 80000,
    snubCapacityLbf: 40000,
    distanceInjectorStripperIn: 9.7,
    description: 'High-pull 80,000 lbf injector for extended reach horizontals.',
  },
  {
    model: 'Stewart & Stevenson SS800S',
    manufacturer: 'Stewart & Stevenson',
    pullCapacityLbf: 80000,
    snubCapacityLbf: 40000,
    distanceInjectorStripperIn: 19.3,
    description: '80,000 lbf pull capacity injector with 19.3" spacing.',
  },
  {
    model: 'Stewart & Stevenson M100',
    manufacturer: 'Stewart & Stevenson',
    pullCapacityLbf: 100000,
    snubCapacityLbf: 40000,
    distanceInjectorStripperIn: 19.4,
    description: '100,000 lbf ultra-heavy duty CT injector with 19.4" spacing.',
  },
];

/**
 * Standard Spooler Back-Tension Forces by Coiled Tubing Outer Diameter
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 6, Page 110)
 * 
 * Note: Projected through 45° gooseneck gives factors of 0.354 (RIH) and 0.707 (POH).
 */
export const CIRCA_SPOOLER_TENSION_TABLE: { ctOdIn: number; spoolerTensionLbf: number; rihComponentLbf: number; pohComponentLbf: number }[] = [
  { ctOdIn: 1.000, spoolerTensionLbf: 100, rihComponentLbf: 35, pohComponentLbf: 71 },
  { ctOdIn: 1.250, spoolerTensionLbf: 180, rihComponentLbf: 64, pohComponentLbf: 127 },
  { ctOdIn: 1.500, spoolerTensionLbf: 300, rihComponentLbf: 106, pohComponentLbf: 212 },
  { ctOdIn: 1.750, spoolerTensionLbf: 500, rihComponentLbf: 177, pohComponentLbf: 354 },
  { ctOdIn: 2.000, spoolerTensionLbf: 900, rihComponentLbf: 319, pohComponentLbf: 636 },
  { ctOdIn: 2.375, spoolerTensionLbf: 1500, rihComponentLbf: 531, pohComponentLbf: 1061 },
  { ctOdIn: 2.875, spoolerTensionLbf: 2000, rihComponentLbf: 708, pohComponentLbf: 1414 },
];

/**
 * Returns the recommended spooler back-tension for a given CT diameter.
 */
export function getCircaSpoolerTension(ctOdIn: number): { spoolerTensionLbf: number; rihComponentLbf: number; pohComponentLbf: number } {
  for (let i = CIRCA_SPOOLER_TENSION_TABLE.length - 1; i >= 0; i--) {
    if (ctOdIn >= CIRCA_SPOOLER_TENSION_TABLE[i].ctOdIn - 0.05) {
      return CIRCA_SPOOLER_TENSION_TABLE[i];
    }
  }
  return CIRCA_SPOOLER_TENSION_TABLE[0];
}

/**
 * Scale Material & Recommended Milling Impact Pressures
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 2, Page 64)
 */
export const CIRCA_SCALE_MILLING_SPECS: CircaScaleMillingSpec[] = [
  {
    material: 'Calcium Carbonate (Calcite / CaCO3)',
    formula: 'CaCO3',
    recommendedImpactPressurePsi: 2638,
    hardnessMohs: '3.0',
    recommendedSolvent: '15% HCl or Formic Acid with corrosion inhibitors',
    description: 'Common hard mineral scale. Requires high impact pressure (2,638 psi) with Roto-Jet or high-torque PDM junk mill.',
  },
  {
    material: 'Elemental Sulphur (S)',
    formula: 'S',
    recommendedImpactPressurePsi: 862,
    hardnessMohs: '1.5 - 2.5',
    recommendedSolvent: 'Organic polysulphide solvents or high-temp aromatic solvents',
    description: 'Yellow crystalline scale found in sour gas wells. Moderate milling resistance.',
  },
  {
    material: 'Gypsum (Hydrated Calcium Sulphate)',
    formula: 'CaSO4 · 2H2O',
    recommendedImpactPressurePsi: 862,
    hardnessMohs: '2.0',
    recommendedSolvent: 'EDTA / DTPA chelating agents or mechanical underreaming',
    description: 'Insoluble in standard HCl. Successfully removed with mechanical milling or jetting at 862 psi.',
  },
  {
    material: 'Iron Sulphide (FeS / Pyrrhotite)',
    formula: 'FeS',
    recommendedImpactPressurePsi: 485,
    hardnessMohs: '3.5 - 4.5',
    recommendedSolvent: 'Acrolein, THPS, or inhibited HCl with H2S scavengers',
    description: 'Sour corrosion product forming dark, dense scales. Readily milled with 485 psi impact jetting.',
  },
  {
    material: 'Coke / Asphaltene / Pyrolytic Tar',
    formula: 'Carbonaceous Heavy Hydrocarbons',
    recommendedImpactPressurePsi: 485,
    hardnessMohs: '1.0 - 2.0',
    recommendedSolvent: 'Xylene, Toluene, or diesel mutual solvent aromatic wash',
    description: 'Pyrolytic residue from thermal EOR or high-temp wells. Moderately tough, easily fluidized by aromatic solvents.',
  },
  {
    material: 'Paraffin Waxes / Organic Complexes',
    formula: 'CnH2n+2 Hydrocarbon Wax',
    recommendedImpactPressurePsi: 337,
    hardnessMohs: '< 1.0',
    recommendedSolvent: 'Hot water (>160°F), condensate wash, or kerosene solvent',
    description: 'Low-melting-point organic deposits. Requires 337 psi impact pressure with warm solvent or jetting nozzle.',
  },
];

/**
 * Standard Proppant API Mesh Sieve Sizes & Particle Dimensions
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 2, Page 64-65) & API RP 13C / ISO 13501
 */
export const CIRCA_PROPPANT_MESH_SPECS: CircaProppantMeshSpec[] = [
  { apiMesh: 100, sizeThou: 6.5, sizeMicron: 165, bulkDensityLbfGal: 14.5, specificGravity: 2.65, description: '100 Mesh Frac Sand / Formation Fines' },
  { apiMesh: 80, sizeThou: 7.7, sizeMicron: 196, bulkDensityLbfGal: 14.8, specificGravity: 2.65, description: '80 Mesh Fine Sieve Sand' },
  { apiMesh: 60, sizeThou: 10.8, sizeMicron: 274, bulkDensityLbfGal: 15.0, specificGravity: 2.65, description: '60 Mesh Interstitial Sand' },
  { apiMesh: 50, sizeThou: 12.9, sizeMicron: 328, bulkDensityLbfGal: 15.2, specificGravity: 2.65, description: '50 Mesh Sand' },
  { apiMesh: 40, sizeThou: 18.2, sizeMicron: 462, bulkDensityLbfGal: 15.6, specificGravity: 2.65, description: '40 Mesh (Upper cut of 20/40)' },
  { apiMesh: 30, sizeThou: 25.8, sizeMicron: 655, bulkDensityLbfGal: 16.0, specificGravity: 2.65, description: '30 Mesh Intermediate Proppant' },
  { apiMesh: 25, sizeThou: 30.7, sizeMicron: 780, bulkDensityLbfGal: 16.2, specificGravity: 2.65, description: '25 Mesh Proppant' },
  { apiMesh: 20, sizeThou: 36.4, sizeMicron: 925, bulkDensityLbfGal: 16.5, specificGravity: 2.65, description: '20 Mesh (Lower cut of 20/40)' },
  { apiMesh: 18, sizeThou: 42.7, sizeMicron: 1085, bulkDensityLbfGal: 16.8, specificGravity: 2.65, description: '18 Mesh Coarse Proppant' },
  { apiMesh: 16, sizeThou: 50.4, sizeMicron: 1280, bulkDensityLbfGal: 17.0, specificGravity: 2.65, description: '16/30 Mesh Gravel Pack Proppant' },
  { apiMesh: 12, sizeThou: 72.6, sizeMicron: 1844, bulkDensityLbfGal: 17.5, specificGravity: 2.65, description: '12/20 Mesh Gravel Pack Sand' },
  { apiMesh: 10, sizeThou: 85.4, sizeMicron: 2169, bulkDensityLbfGal: 18.0, specificGravity: 2.65, description: '10/20 Coarse Gravel' },
  { apiMesh: 6, sizeThou: 143.1, sizeMicron: 3635, bulkDensityLbfGal: 18.5, specificGravity: 2.65, description: '6 Mesh Large Pea Gravel & Shaly Cuttings' },
];

/**
 * CTran Solids Transport Classification Defaults
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1 (Appendix 2, Page 61-63)
 */
export const CIRCA_CLEANOUT_SOLIDS_MODELS = [
  {
    id: 'fines',
    name: 'Mud Residue / Formation Fines',
    particleSizeDescription: '< 150 micron (typically mud residue and dislodged clay)',
    meanSizeMicron: 100,
    bulkDensityLbfGal: 14.0,
    specificGravity: 2.65,
    transportDifficulty: 'Low - high suspension capability in water',
  },
  {
    id: 'carbolite_20_40',
    name: '20/40 Carbolite Proppant / PDC Cuttings',
    particleSizeDescription: '150 to 1,000 micron (mean tested at CTRE: 760 micron)',
    meanSizeMicron: 760,
    bulkDensityLbfGal: 16.0,
    specificGravity: 2.65,
    transportDifficulty: 'Moderate - requires wiper trip optimization and minimum AV',
  },
  {
    id: 'bauxite_20_40',
    name: '20/40 Sintered Bauxite Proppant',
    particleSizeDescription: 'High density sintered ceramic proppant (pure SG 3.4 - 3.6)',
    meanSizeMicron: 760,
    bulkDensityLbfGal: 18.0,
    specificGravity: 3.50,
    transportDifficulty: 'High - rapid settling rate, requires viscous gel pills or N2 boost',
  },
  {
    id: 'scale_particles',
    name: 'Carbonate / Silica Scales & Roller Cone Cuttings',
    particleSizeDescription: 'Large jagged particles up to 10,000 micron, mill junk & shales',
    meanSizeMicron: 3500,
    bulkDensityLbfGal: 16.5,
    specificGravity: 2.70,
    transportDifficulty: 'Very High - easily beds in horizontal sections; reverse circulation recommended',
  },
  {
    id: 'mixed_solids',
    name: 'Mixed Solids (Conservative Worst-Case)',
    particleSizeDescription: 'Blended fines, fractured proppant, and milling debris',
    meanSizeMicron: 1200,
    bulkDensityLbfGal: 17.0,
    specificGravity: 2.90,
    transportDifficulty: 'Worst-case envelope evaluated across all three particle regimes',
  },
];

/**
 * Surface Choke & Rig-Up Rules of Thumb
 * Source: Baker Hughes CIRCA™ Manual v.16.5.1
 */
export const CIRCA_RIGUP_GUIDELINES = {
  unsupportedBucklingDistanceIn: 15.0, // Default distance between lower chain sprockets and stripper bushing
  stripperBaseFrictionLbf: 500, // At atmospheric pressure (1.5" CT)
  stripperPressureGradientLbfPerPsi: 0.35, // 0.25 to 0.50 lbf per additional psi WHP
  defaultGooseneckRadiusRatio: 48, // Gooseneck radius should be at least 48x CT OD
  maxWiperTripSpeedCapFpm: 100, // Maximum machine capability limit for most CT units
  optimumWiperTripSafetyMargin: 0.90, // Limit speeds to 90% of optimum for 100% clean hole
  recommendedWiperRampMPerMinPer50m: 0.75, // Increase rate by 0.5 to 1.0 m/min every 50 meters
  startWiperTripPercent: 0.25, // Start at 25% of recommended rate
  solidsWarningThresholdVolPercent: 5.0, // CIRCA flags warning if solids in returns exceed 5% by volume
};

/**
 * JPSE Experimental Benchmark Data (Liu Shaohu et al. 2021)
 * Orthogonal test table L16(4^4) on CT110 steel (OD 50.8 mm, WT 4.4 mm, R' 1219 mm, P2 35 MPa)
 */
export const JPSE_ORTHOGONAL_TEST_DATA = [
  { level: 1, cMm: 0.5, alphaDeg: 0, aMm: 10, bMm: 4, nCycles: 140, sample: 'B1' },
  { level: 2, cMm: 0.5, alphaDeg: 30, aMm: 12, bMm: 8, nCycles: 176, sample: 'B2' },
  { level: 3, cMm: 0.5, alphaDeg: 60, aMm: 13, bMm: 5, nCycles: 148, sample: 'B3' },
  { level: 4, cMm: 0.5, alphaDeg: 90, aMm: 11, bMm: 6, nCycles: 60, sample: 'B4' },
  { level: 5, cMm: 1.0, alphaDeg: 30, aMm: 11, bMm: 5, nCycles: 101, sample: 'B5' },
  { level: 6, cMm: 1.0, alphaDeg: 0, aMm: 13, bMm: 6, nCycles: 122, sample: 'B6' },
  { level: 7, cMm: 1.0, alphaDeg: 90, aMm: 12, bMm: 6, nCycles: 71, sample: 'B7' },
  { level: 8, cMm: 2.0, alphaDeg: 60, aMm: 10, bMm: 8, nCycles: 152, sample: 'B8' },
  { level: 9, cMm: 2.0, alphaDeg: 60, aMm: 12, bMm: 6, nCycles: 8, sample: 'B9' },
  { level: 10, cMm: 2.0, alphaDeg: 90, aMm: 10, bMm: 5, nCycles: 10, sample: 'B10' },
  { level: 11, cMm: 2.0, alphaDeg: 0, aMm: 11, bMm: 8, nCycles: 30, sample: 'B11' },
  { level: 12, cMm: 2.0, alphaDeg: 30, aMm: 13, bMm: 4, nCycles: 15, sample: 'B12' },
  { level: 13, cMm: 3.0, alphaDeg: 90, aMm: 13, bMm: 8, nCycles: 4, sample: 'B13' },
  { level: 14, cMm: 3.0, alphaDeg: 60, aMm: 11, bMm: 4, nCycles: 3, sample: 'B14' },
  { level: 15, cMm: 3.0, alphaDeg: 30, aMm: 10, bMm: 4, nCycles: 6, sample: 'B15' },
  { level: 16, cMm: 3.0, alphaDeg: 0, aMm: 12, bMm: 5, nCycles: 30, sample: 'B16' },
];

/**
 * Defect Parameter Sensitivity Ranking (Table 2 & Table 5)
 * Primary and secondary relationship: Pit Depth > Pit Width > Pit Angle > Pit Length
 */
export const JPSE_DEFECT_SENSITIVITY_RANKING = [
  { factor: 'Pit Defect Depth (c)', rank: 1, rangeR: 120.25, maxDropPercent: 92, significant: true, description: 'Dominant control parameter governing stress concentration and crack nucleation' },
  { factor: 'Pit Defect Width (b)', rank: 2, rangeR: 49.50, maxDropPercent: 78, significant: true, description: 'Circumferential stress alteration across curved surface' },
  { factor: 'Pit Defect Angle (alpha)', rank: 3, rangeR: 44.25, maxDropPercent: 67, significant: true, description: 'Orientation relative to pipe axis (90 deg transverse is most damaging)' },
  { factor: 'Pit Defect Length (a)', rank: 4, rangeR: 28.50, maxDropPercent: 36, significant: true, description: 'Axial extent of defect along length' },
  { factor: 'Circumferential Distribution', rank: 5, rangeR: 26.00, maxDropPercent: 29, significant: false, description: 'Number of pits distributed around circumference' },
  { factor: 'Axial Distribution Position', rank: 6, rangeR: 3.00, maxDropPercent: 3, significant: false, description: 'Distance along pipe length (tension side vs compression side)' },
];
