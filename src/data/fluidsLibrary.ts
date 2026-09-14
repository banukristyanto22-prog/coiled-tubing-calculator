import { isFluidCompatibleWithElastomer, BhaElastomerType } from './elastomerCompatibility';

export type FluidCategory =
  | 'Brines & Clear Fluids'
  | 'Slickwater & FR'
  | 'Gels & Cleanout Fluids'
  | 'Acids & Stimulation'
  | 'Muds & Kill Fluids'
  | 'Energized & Solvents';

export type CorrosivityLevel = 'Non-corrosive' | 'Mild' | 'Moderate' | 'Severe / Acidic';
export type SolidsClassification = 'None (Clear)' | 'Low-Solids' | 'Weighted Solids';

export interface FluidSpecification {
  id: string;
  name: string;
  shortName: string;
  category: FluidCategory;
  densityPpg: number;
  densitySg: number;
  viscosityCp: number;
  chemicalBase: string;
  phRange: string;
  corrosivity: CorrosivityLevel;
  h2sCompatible: boolean;
  frictionReductionPercent: number; // 0-75%
  solidsType: SolidsClassification;
  maxTemperatureF: number;
  badgeColor: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | 'indigo';
  description: string;
  commonApplications: string[];
}

export const FLUIDS_LIBRARY: FluidSpecification[] = [
  // 1. Brines & Clear Fluids
  {
    id: 'fresh_water',
    name: 'Fresh Water (Potable / Base)',
    shortName: 'Fresh Water',
    category: 'Brines & Clear Fluids',
    densityPpg: 8.34,
    densitySg: 1.00,
    viscosityCp: 1.0,
    chemicalBase: 'H2O Aqueous',
    phRange: '6.8 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 350,
    badgeColor: 'cyan',
    description: 'Standard fresh water base fluid for general coiled tubing circulation, hydrotesting, and chemical displacement.',
    commonApplications: ['General Circulation', 'Hydrotesting', 'Displacement', 'Wellbore Flushing'],
  },
  {
    id: 'kcl_2pct',
    name: '2% KCl Clay Stabilizing Brine',
    shortName: '2% KCl Brine',
    category: 'Brines & Clear Fluids',
    densityPpg: 8.45,
    densitySg: 1.013,
    viscosityCp: 1.1,
    chemicalBase: 'Potassium Chloride (KCl)',
    phRange: '6.5 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 400,
    badgeColor: 'cyan',
    description: 'Clay-stabilizing light brine preventing formation shale swelling and dispersion during sensitive reservoir workovers.',
    commonApplications: ['Clay Stabilization', 'Water-Sensitive Sandstones', 'Workover Sweeps'],
  },
  {
    id: 'brine_8_6',
    name: '8.6 ppg Light Brine (NaCl Salt)',
    shortName: '8.6 ppg NaCl Brine',
    category: 'Brines & Clear Fluids',
    densityPpg: 8.60,
    densitySg: 1.031,
    viscosityCp: 1.2,
    chemicalBase: 'Sodium Chloride (NaCl)',
    phRange: '6.5 - 7.8',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 400,
    badgeColor: 'cyan',
    description: 'General purpose workover brine providing slight overbalance control without damaging pay zones.',
    commonApplications: ['Well Control', 'Workover Fluid', 'Casing Scraping', 'Displacement'],
  },
  {
    id: 'sea_water',
    name: 'Filtered Seawater (Offshore)',
    shortName: 'Offshore Seawater',
    category: 'Brines & Clear Fluids',
    densityPpg: 8.55,
    densitySg: 1.025,
    viscosityCp: 1.15,
    chemicalBase: 'Mixed Salts Marine Brine',
    phRange: '7.8 - 8.3',
    corrosivity: 'Mild',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 350,
    badgeColor: 'cyan',
    description: 'Filtered offshore marine brine for platform coiled tubing operations requiring high-volume circulation.',
    commonApplications: ['Offshore Operations', 'Subsea Cleanout', 'Bulk Circulation'],
  },
  {
    id: 'brine_10_0',
    name: '10.0 ppg Heavy CaCl₂ Brine',
    shortName: '10.0 ppg CaCl2 Brine',
    category: 'Brines & Clear Fluids',
    densityPpg: 10.0,
    densitySg: 1.199,
    viscosityCp: 1.6,
    chemicalBase: 'Calcium Chloride (CaCl2)',
    phRange: '6.2 - 7.2',
    corrosivity: 'Mild',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 420,
    badgeColor: 'blue',
    description: 'Solids-free intermediate completion brine for pressure control, well kill, and tubing perforation.',
    commonApplications: ['Pressure Control', 'Perforating Carrier', 'Well Kill', 'Completion'],
  },
  {
    id: 'cabr2_11_6',
    name: '11.6 ppg Heavy CaBr₂ Completion Brine',
    shortName: '11.6 ppg CaBr2 Brine',
    category: 'Brines & Clear Fluids',
    densityPpg: 11.6,
    densitySg: 1.391,
    viscosityCp: 2.4,
    chemicalBase: 'Calcium Bromide (CaBr2)',
    phRange: '6.0 - 7.0',
    corrosivity: 'Mild',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 450,
    badgeColor: 'blue',
    description: 'High-density solids-free clear brine for deep high-pressure completion and sand control operations.',
    commonApplications: ['High Pressure Completion', 'Sand Screen Placement', 'Non-Damaging Kill'],
  },
  {
    id: 'znbr2_14_2',
    name: '14.2 ppg Ultra-Heavy CaBr₂ / ZnBr₂ Brine',
    shortName: '14.2 ppg ZnBr2 Brine',
    category: 'Brines & Clear Fluids',
    densityPpg: 14.2,
    densitySg: 1.703,
    viscosityCp: 4.8,
    chemicalBase: 'Zinc/Calcium Bromide',
    phRange: '3.5 - 5.0',
    corrosivity: 'Moderate',
    h2sCompatible: false,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 400,
    badgeColor: 'purple',
    description: 'Extreme density clear kill brine for HPHT deep formations where mud solids would plug screens.',
    commonApplications: ['HPHT Well Kill', 'Deep Gas Well Control', 'Screen Saver Fluid'],
  },
  {
    id: 'potassium_formate_11_0',
    name: '11.0 ppg Potassium Formate (K-Formate)',
    shortName: '11.0 ppg K-Formate',
    category: 'Brines & Clear Fluids',
    densityPpg: 11.0,
    densitySg: 1.319,
    viscosityCp: 3.2,
    chemicalBase: 'Potassium Formate (HCOOK)',
    phRange: '9.0 - 10.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 12,
    solidsType: 'None (Clear)',
    maxTemperatureF: 450,
    badgeColor: 'emerald',
    description: 'Eco-friendly, non-toxic high density organic brine with outstanding thermal stability and low corrosion rates.',
    commonApplications: ['HPHT Deep Cleanout', 'Sour Gas Reservoir', 'Low Corrosion Operations'],
  },

  // 2. Slickwater & Friction Reduced Systems
  {
    id: 'slickwater',
    name: 'Slickwater (Standard Anionic FR)',
    shortName: 'Slickwater (Std FR)',
    category: 'Slickwater & FR',
    densityPpg: 8.36,
    densitySg: 1.002,
    viscosityCp: 1.8,
    chemicalBase: 'Polyacrylamide (PAM) Polymer',
    phRange: '6.5 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 68,
    solidsType: 'None (Clear)',
    maxTemperatureF: 300,
    badgeColor: 'emerald',
    description: 'High-performance friction-reduced water yielding 65-70% drag reduction for high pump rates in long CT strings.',
    commonApplications: ['Extended Reach Milling', 'High-Rate Cleanout', 'Frac Plug Drillout', 'Long Laterals'],
  },
  {
    id: 'slickwater_high_tds',
    name: 'High-TDS / Produced Water Slickwater',
    shortName: 'High-TDS Slickwater',
    category: 'Slickwater & FR',
    densityPpg: 8.70,
    densitySg: 1.043,
    viscosityCp: 2.2,
    chemicalBase: 'Cationic / Salt-Tolerant Polyacrylamide',
    phRange: '6.0 - 7.5',
    corrosivity: 'Mild',
    h2sCompatible: true,
    frictionReductionPercent: 62,
    solidsType: 'None (Clear)',
    maxTemperatureF: 320,
    badgeColor: 'emerald',
    description: 'Specially synthesized friction reducer compatible with recycled produced water and high salinity brines.',
    commonApplications: ['Produced Water Cleanout', 'High Salinity Wells', 'Extended Reach CT'],
  },
  {
    id: 'slickwater_heavy_drag_red',
    name: 'Severe Drag Reducer (72% FR Polymer)',
    shortName: 'Max FR Polymer (72%)',
    category: 'Slickwater & FR',
    densityPpg: 8.38,
    densitySg: 1.005,
    viscosityCp: 2.5,
    chemicalBase: 'Ultra-High Molecular Weight PAM',
    phRange: '6.8 - 7.4',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 72,
    solidsType: 'None (Clear)',
    maxTemperatureF: 280,
    badgeColor: 'emerald',
    description: 'Ultra-high molecular weight friction reducer providing up to 72% friction reduction in small diameter CT strings.',
    commonApplications: ['Small ID CT (1.25"-1.50")', 'Ultra-Deep Horizontal ERD', 'Maximum Velocity Circulation'],
  },

  // 3. Gels & Cleanout Fluids
  {
    id: 'linear_gel',
    name: 'Linear Gel 25# Guar Cleanout Fluid',
    shortName: 'Linear Gel 25# Guar',
    category: 'Gels & Cleanout Fluids',
    densityPpg: 8.45,
    densitySg: 1.013,
    viscosityCp: 28.0,
    chemicalBase: 'Guar Gum Biopolymer (25 lb/Mgal)',
    phRange: '6.5 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 45,
    solidsType: 'None (Clear)',
    maxTemperatureF: 250,
    badgeColor: 'amber',
    description: 'Viscous polymer sweep for sand washing, debris suspension, and cuttings transport in inclined wellbores.',
    commonApplications: ['Sand Cleanout', 'Plug Milling Debris Sweep', 'Hole Cleaning Sweeps'],
  },
  {
    id: 'linear_gel_35_hpg',
    name: 'Linear Gel 35# HPG (High Purity Polymer)',
    shortName: 'Linear Gel 35# HPG',
    category: 'Gels & Cleanout Fluids',
    densityPpg: 8.50,
    densitySg: 1.019,
    viscosityCp: 42.0,
    chemicalBase: 'Hydroxypropyl Guar (35 lb/Mgal)',
    phRange: '6.8 - 7.8',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 40,
    solidsType: 'None (Clear)',
    maxTemperatureF: 300,
    badgeColor: 'amber',
    description: 'Residue-free cleanout gel offering elevated thermal stability and superior particle carrying capacity.',
    commonApplications: ['Deep Hot Well Sweeps', 'Heavy Debris Washing', 'Proppant Cleanout'],
  },
  {
    id: 'xanthan_biopolymer',
    name: 'Xanthan Biopolymer Cleanout Gel (Shear Thinning)',
    shortName: 'Xanthan Cleanout Gel',
    category: 'Gels & Cleanout Fluids',
    densityPpg: 8.44,
    densitySg: 1.012,
    viscosityCp: 38.0,
    chemicalBase: 'Xanthan Gum (XC Polymer)',
    phRange: '6.5 - 8.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 50,
    solidsType: 'None (Clear)',
    maxTemperatureF: 275,
    badgeColor: 'amber',
    description: 'Extreme shear-thinning rheology: low viscosity inside CT under shear, highly viscous in annulus for optimum cleaning.',
    commonApplications: ['Horizontal ERD Cleanouts', 'Low Pump Rate Sweeps', 'Heavy Iron Shavings Transport'],
  },
  {
    id: 'hec_viscous_pill',
    name: 'HEC Non-Damaging Viscous Sweep (40#)',
    shortName: 'HEC Viscous Pill',
    category: 'Gels & Cleanout Fluids',
    densityPpg: 8.46,
    densitySg: 1.014,
    viscosityCp: 55.0,
    chemicalBase: 'Hydroxyethyl Cellulose (HEC)',
    phRange: '6.5 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 30,
    solidsType: 'None (Clear)',
    maxTemperatureF: 220,
    badgeColor: 'amber',
    description: 'Solids-free non-damaging completion sweep designed to clean gravel pack screens without impairment.',
    commonApplications: ['Gravel Pack Cleanout', 'Openhole Sweeps', 'Formation Protective Pill'],
  },
  {
    id: 'crosslinked_borate_gel',
    name: 'Borate Crosslinked Gel (Extreme Suspension)',
    shortName: 'Borate Crosslinked Gel',
    category: 'Gels & Cleanout Fluids',
    densityPpg: 8.55,
    densitySg: 1.025,
    viscosityCp: 140.0,
    chemicalBase: 'Guar + Borate Crosslinker',
    phRange: '9.0 - 10.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 15,
    solidsType: 'None (Clear)',
    maxTemperatureF: 280,
    badgeColor: 'purple',
    description: 'Crosslinked gel structure providing maximum static particle suspension for large milling fragments.',
    commonApplications: ['Heavy Mill Scrap Transport', 'Loss Circulation Pill', 'Suspension Sweeps'],
  },

  // 4. Acids & Chemical Stimulation
  {
    id: 'acid_15_hcl',
    name: '15% Inhibited HCl Matrix Acid',
    shortName: '15% HCl Inhibited',
    category: 'Acids & Stimulation',
    densityPpg: 8.95,
    densitySg: 1.073,
    viscosityCp: 1.4,
    chemicalBase: '15% Hydrochloric Acid (HCl)',
    phRange: '< 0.5 (Strong Acid)',
    corrosivity: 'Severe / Acidic',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 250,
    badgeColor: 'rose',
    description: 'Industry-standard matrix acidizing fluid with corrosion inhibitors and iron control agents for carbonate stimulation.',
    commonApplications: ['Carbonate Matrix Acidizing', 'Scale Dissolution', 'Perforation Wash', 'Wellbore Cleanup'],
  },
  {
    id: 'acid_28_hcl',
    name: '28% Concentrated HCl Stimulation Acid',
    shortName: '28% HCl High-Strength',
    category: 'Acids & Stimulation',
    densityPpg: 9.50,
    densitySg: 1.139,
    viscosityCp: 1.9,
    chemicalBase: '28% Hydrochloric Acid (HCl)',
    phRange: '< 0.1 (Severe Acid)',
    corrosivity: 'Severe / Acidic',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 220,
    badgeColor: 'rose',
    description: 'High-strength concentrated acid for intensive wormholing, deep carbonate breakdown, and calcium carbonate descaling.',
    commonApplications: ['Deep Carbonate Stimulation', 'Heavy Calcite Descaling', 'Breakdown Treatments'],
  },
  {
    id: 'organic_retarded_acid',
    name: '10% Formic / 5% Acetic Retarded Acid',
    shortName: 'Formic-Acetic Retarded Acid',
    category: 'Acids & Stimulation',
    densityPpg: 8.75,
    densitySg: 1.049,
    viscosityCp: 1.6,
    chemicalBase: 'Organic Formic / Acetic Blend',
    phRange: '2.0 - 2.8',
    corrosivity: 'Moderate',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 380,
    badgeColor: 'rose',
    description: 'Slow-reacting organic acid blend engineered for deep penetration in hot HPHT carbonate and sour gas wells.',
    commonApplications: ['Deep High-Temp Carbonates', 'Sour H2S Formations', 'Chrome Tubing Wells'],
  },
  {
    id: 'emulsified_acid',
    name: '15% Emulsified Retarded Acid (Acid-in-Oil)',
    shortName: 'Emulsified Acid (Acid-in-Oil)',
    category: 'Acids & Stimulation',
    densityPpg: 8.65,
    densitySg: 1.037,
    viscosityCp: 38.0,
    chemicalBase: '70:30 Acid/Diesel Emulsion',
    phRange: '1.0 - 1.8',
    corrosivity: 'Moderate',
    h2sCompatible: true,
    frictionReductionPercent: 10,
    solidsType: 'None (Clear)',
    maxTemperatureF: 300,
    badgeColor: 'rose',
    description: 'Viscous emulsion protecting coiled tubing walls while retarding acid reaction to stimulate deep reservoir intervals.',
    commonApplications: ['Deep Penetration Acidizing', 'Thief Zone Diversion', 'Fissured Carbonates'],
  },
  {
    id: 'mutual_solvent_wash',
    name: 'EGMBE Mutual Solvent / Surfactant Wash',
    shortName: 'EGMBE Mutual Solvent',
    category: 'Acids & Stimulation',
    densityPpg: 8.20,
    densitySg: 0.983,
    viscosityCp: 1.5,
    chemicalBase: 'Ethylene Glycol Monobutyl Ether',
    phRange: '6.5 - 7.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'None (Clear)',
    maxTemperatureF: 350,
    badgeColor: 'emerald',
    description: 'Solvent wash breaking water blocks, removing hydrocarbon sludge, and leaving formations water-wet prior to acidizing.',
    commonApplications: ['Pre-Acid Wash', 'Asphaltene Removal', 'Water Block Remediation', 'Wettability Alteration'],
  },

  // 5. Muds & Kill Fluids
  {
    id: 'drilling_mud',
    name: 'Workover / Milling Polymer Mud (10.5 ppg)',
    shortName: '10.5 ppg Polymer Mud',
    category: 'Muds & Kill Fluids',
    densityPpg: 10.5,
    densitySg: 1.259,
    viscosityCp: 35.0,
    chemicalBase: 'Bentonite / PAC Polymer Mud',
    phRange: '8.8 - 9.8',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'Low-Solids',
    maxTemperatureF: 320,
    badgeColor: 'amber',
    description: 'Low-solids polymer workover mud for CT positive displacement motor (PDM) drilling, milling, and cuttings lifting.',
    commonApplications: ['PDM Motor Milling', 'Composite Plug Milling', 'Casing Scraping', 'Cuttings Lifting'],
  },
  {
    id: 'mud_lsnd',
    name: 'Low-Solids Non-Dispersed (LSND) Mud (9.2 ppg)',
    shortName: '9.2 ppg LSND Mud',
    category: 'Muds & Kill Fluids',
    densityPpg: 9.20,
    densitySg: 1.103,
    viscosityCp: 24.0,
    chemicalBase: 'PAC / PHPA Polymer Fluid',
    phRange: '8.5 - 9.5',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 20,
    solidsType: 'Low-Solids',
    maxTemperatureF: 300,
    badgeColor: 'amber',
    description: 'Low-solids water-based mud with polymer encapsulation to minimize formation damage during thru-tubing milling.',
    commonApplications: ['Thru-Tubing Milling', 'Window Cutting', 'Under-Reaming'],
  },
  {
    id: 'mud_barite_12_5',
    name: '12.5 ppg Barite Weighted Kill Mud',
    shortName: '12.5 ppg Barite Kill Mud',
    category: 'Muds & Kill Fluids',
    densityPpg: 12.5,
    densitySg: 1.499,
    viscosityCp: 45.0,
    chemicalBase: 'Barite (BaSO4) Weighted Water Mud',
    phRange: '9.0 - 10.0',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 0,
    solidsType: 'Weighted Solids',
    maxTemperatureF: 350,
    badgeColor: 'purple',
    description: 'Heavy weighted drilling/kill mud designed for emergency well control and high pore pressure containment.',
    commonApplications: ['Well Control & Kill', 'Overpressure Mitigation', 'Heavy Washover'],
  },
  {
    id: 'synthetic_oil_mud',
    name: 'Synthetic Oil-Based Mud (Invert Emulsion)',
    shortName: 'Synthetic Oil Mud (OBM)',
    category: 'Muds & Kill Fluids',
    densityPpg: 10.2,
    densitySg: 1.223,
    viscosityCp: 36.0,
    chemicalBase: 'Synthetic Paraffin / Invert Emulsion',
    phRange: '8.0 - 9.0',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 18,
    solidsType: 'Low-Solids',
    maxTemperatureF: 380,
    badgeColor: 'indigo',
    description: 'Highly lubricious synthetic oil mud preventing differential sticking, torque reduction, and active shale stabilization.',
    commonApplications: ['Reactive Shale Milling', 'Extended Reach Underbalanced', 'Anti-Sticking Operations'],
  },

  // 6. Energized & Solvents
  {
    id: 'nitrogen_foam_70',
    name: 'Nitrogen Foam 70-Quality (Low Hydrostatic)',
    shortName: 'N2 Foam (70-Quality)',
    category: 'Energized & Solvents',
    densityPpg: 4.20,
    densitySg: 0.504,
    viscosityCp: 8.5,
    chemicalBase: 'Gaseous N2 + Water + Foamer',
    phRange: '7.0 - 8.0',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 25,
    solidsType: 'None (Clear)',
    maxTemperatureF: 350,
    badgeColor: 'blue',
    description: 'Energized low-density two-phase nitrogen foam for lifting debris from depleted, low-bottomhole-pressure reservoirs.',
    commonApplications: ['Depleted Well Cleanout', 'Gas Lift Kickoff', 'Underbalanced Washing'],
  },
  {
    id: 'nitrogen_gel_foam_65',
    name: 'Nitrogen Gelled Foam 65-Quality (Viscous Foam)',
    shortName: 'N2 Gelled Foam 65Q',
    category: 'Energized & Solvents',
    densityPpg: 4.80,
    densitySg: 0.576,
    viscosityCp: 22.0,
    chemicalBase: 'N2 + Polymer Gel + Foaming Agent',
    phRange: '7.2 - 8.2',
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    frictionReductionPercent: 30,
    solidsType: 'None (Clear)',
    maxTemperatureF: 320,
    badgeColor: 'blue',
    description: 'High-carrying-capacity foam sweep combining low hydrostatic head with viscous gel bubble network.',
    commonApplications: ['Heavy Sand Cleanout in Depleted Reservoirs', 'Horizontal Gas Wells'],
  },
];

export interface FluidFilterCriteria {
  searchQuery: string;
  category: string; // 'All' or FluidCategory
  densityFilter: 'all' | 'light' | 'medium' | 'heavy' | 'custom';
  densityMinPpg?: number;
  densityMaxPpg?: number;
  viscosityFilter: 'all' | 'low' | 'medium' | 'high' | 'custom';
  viscosityMinCp?: number;
  viscosityMaxCp?: number;
  corrosivity: 'all' | 'non_corrosive' | 'mild_moderate' | 'acidic';
  h2sCompatibleOnly: boolean;
  frictionReducedOnly: boolean;
  solidsType: 'all' | 'clear_only' | 'solids_only';
  elastomerFilter: 'all' | BhaElastomerType;
  elastomerSafeOnly: boolean;
  sortBy: 'name' | 'density_asc' | 'density_desc' | 'viscosity_asc' | 'viscosity_desc' | 'fr_desc';
}

export const DEFAULT_FLUID_FILTERS: FluidFilterCriteria = {
  searchQuery: '',
  category: 'All',
  densityFilter: 'all',
  viscosityFilter: 'all',
  corrosivity: 'all',
  h2sCompatibleOnly: false,
  frictionReducedOnly: false,
  solidsType: 'all',
  elastomerFilter: 'all',
  elastomerSafeOnly: false,
  sortBy: 'density_asc',
};

export function filterFluids(
  fluids: FluidSpecification[],
  filters: FluidFilterCriteria,
  isMetric: boolean = false
): FluidSpecification[] {
  return fluids.filter((fluid) => {
    // 1. Search query (matches name, shortName, chemicalBase, applications, description, category)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = fluid.name.toLowerCase().includes(q);
      const matchShort = fluid.shortName.toLowerCase().includes(q);
      const matchBase = fluid.chemicalBase.toLowerCase().includes(q);
      const matchCat = fluid.category.toLowerCase().includes(q);
      const matchDesc = fluid.description.toLowerCase().includes(q);
      const matchApps = fluid.commonApplications.some((app) => app.toLowerCase().includes(q));
      if (!matchName && !matchShort && !matchBase && !matchCat && !matchDesc && !matchApps) {
        return false;
      }
    }

    // 2. Category
    if (filters.category !== 'All' && fluid.category !== filters.category) {
      return false;
    }

    // 3. Density filter
    if (filters.densityFilter === 'light') {
      // Light: < 8.6 ppg (< 1.03 SG)
      if (fluid.densityPpg >= 8.6) return false;
    } else if (filters.densityFilter === 'medium') {
      // Medium: 8.6 - 10.5 ppg (1.03 - 1.26 SG)
      if (fluid.densityPpg < 8.6 || fluid.densityPpg > 10.5) return false;
    } else if (filters.densityFilter === 'heavy') {
      // Heavy: > 10.5 ppg (> 1.26 SG)
      if (fluid.densityPpg <= 10.5) return false;
    } else if (filters.densityFilter === 'custom') {
      if (filters.densityMinPpg !== undefined && fluid.densityPpg < filters.densityMinPpg) return false;
      if (filters.densityMaxPpg !== undefined && fluid.densityPpg > filters.densityMaxPpg) return false;
    }

    // 4. Viscosity filter
    if (filters.viscosityFilter === 'low') {
      // Low: < 5 cp (Clear / Brines / Slickwater)
      if (fluid.viscosityCp >= 5.0) return false;
    } else if (filters.viscosityFilter === 'medium') {
      // Medium: 5 - 30 cp (Gels / Sweeps)
      if (fluid.viscosityCp < 5.0 || fluid.viscosityCp > 30.0) return false;
    } else if (filters.viscosityFilter === 'high') {
      // High: > 30 cp (Heavy Gels / Muds)
      if (fluid.viscosityCp <= 30.0) return false;
    } else if (filters.viscosityFilter === 'custom') {
      if (filters.viscosityMinCp !== undefined && fluid.viscosityCp < filters.viscosityMinCp) return false;
      if (filters.viscosityMaxCp !== undefined && fluid.viscosityCp > filters.viscosityMaxCp) return false;
    }

    // 5. Corrosivity
    if (filters.corrosivity === 'non_corrosive' && fluid.corrosivity !== 'Non-corrosive') {
      return false;
    } else if (filters.corrosivity === 'mild_moderate' && (fluid.corrosivity !== 'Mild' && fluid.corrosivity !== 'Moderate')) {
      return false;
    } else if (filters.corrosivity === 'acidic' && fluid.corrosivity !== 'Severe / Acidic') {
      return false;
    }

    // 6. H2S Compatible only
    if (filters.h2sCompatibleOnly && !fluid.h2sCompatible) {
      return false;
    }

    // 7. Friction reduced only
    if (filters.frictionReducedOnly && fluid.frictionReductionPercent <= 0) {
      return false;
    }

    // 8. Solids type
    if (filters.solidsType === 'clear_only' && fluid.solidsType !== 'None (Clear)') {
      return false;
    } else if (filters.solidsType === 'solids_only' && fluid.solidsType === 'None (Clear)') {
      return false;
    }

    // 9. Chemical Compatibility with BHA Elastomer
    if (filters.elastomerFilter && filters.elastomerFilter !== 'all' && filters.elastomerSafeOnly) {
      if (!isFluidCompatibleWithElastomer(fluid, filters.elastomerFilter, true)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'density_asc':
        return a.densityPpg - b.densityPpg;
      case 'density_desc':
        return b.densityPpg - a.densityPpg;
      case 'viscosity_asc':
        return a.viscosityCp - b.viscosityCp;
      case 'viscosity_desc':
        return b.viscosityCp - a.viscosityCp;
      case 'fr_desc':
        return b.frictionReductionPercent - a.frictionReductionPercent;
      default:
        return 0;
    }
  });
}
