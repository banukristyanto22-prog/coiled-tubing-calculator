import { CorrosivityLevel, SolidsClassification } from '../data/fluidsLibrary';
import { ppgToSg, sgToPpg } from '../utils/engineeringCalculations';

export type BaseFluidCategory = 'water_base' | 'oil_base' | 'polymer_gel' | 'hybrid_emulsion';

export type WaterBaseType = 
  | 'fresh_water'      // 8.34 ppg
  | 'kcl_2_pct'        // 8.45 ppg
  | 'kcl_4_pct'        // 8.55 ppg
  | 'sea_water'        // 8.55 ppg
  | 'nacl_brine'       // 9.50 ppg
  | 'cacl2_brine'      // 11.2 ppg
  | 'heavy_cabr2';     // 14.2 ppg

export type OilBaseType = 
  | 'none'
  | 'mineral_oil'      // 6.95 ppg, 4.2 cp
  | 'diesel_no2'       // 7.10 ppg, 3.0 cp
  | 'synthetic_ester'  // 6.75 ppg, 5.0 cp
  | 'condensate';      // 6.30 ppg, 1.2 cp

export type PolymerType = 
  | 'none'
  | 'friction_reducer_paa'   // Liquid Polyacrylamide FR (0.5 - 3 gpt)
  | 'guar_gum'               // Natural galactomannan (20 - 50 lb/1000gal)
  | 'hec_cellulose'          // Clean workover polymer (15 - 45 lb/1000gal)
  | 'xanthan_gum'            // Shear-thinning biopolymer (10 - 30 lb/1000gal)
  | 'pac_polymer'            // Polyanionic Cellulose (1 - 4 lb/bbl)
  | 'crosslinked_borate';    // Crosslinked Guar / Gel (30 - 60 lb/1000gal)

export type WeightingAgentType = 
  | 'none'
  | 'calcium_carbonate'     // Acid-soluble bridging solids
  | 'barite'                // High-density barium sulfate
  | 'dissolved_salts';      // Formate / Bromide high-density clear brine

export interface CustomFluidComposition {
  id: string;
  name: string;
  shortName: string;
  category: BaseFluidCategory;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;

  // Base Blend Formulation (% must equal 100)
  waterFractionPct: number; // 0 - 100%
  waterBaseType: WaterBaseType;
  oilFractionPct: number;   // 0 - 100%
  oilBaseType: OilBaseType;

  // Polymer Rheology System
  polymerType: PolymerType;
  polymerConcentration: number; // e.g. 20 (lb/1000gal or gpt)
  polymerUnit: 'lb/1000gal' | 'gpt' | 'lb/bbl';

  // Weighting & Solid Additives
  weightingAgent: WeightingAgentType;
  weightingConcentrationPpgAdd: number; // 0 - 6 ppg addition

  // Chemical Modifiers
  corrosionInhibitor: boolean;
  h2sScavenger: boolean;
  surfactantPct: number; // 0 - 2%

  // Laboratory / Rheological Properties (Calculated or Manually Calibrated)
  densityPpg: number;
  densitySg: number;
  viscosityCp: number;
  frictionReductionPercent: number; // 0 - 75%
  corrosivity: CorrosivityLevel;
  h2sCompatible: boolean;
  solidsType: SolidsClassification;
  maxTemperatureF: number;
  phRange: string;
  chemicalBase: string;
  commonApplications: string[];
}

// Density database for base liquids (ppg)
export const WATER_BASE_PROPERTIES: Record<WaterBaseType, { name: string; densityPpg: number; viscosityCp: number; ph: string }> = {
  fresh_water: { name: 'Fresh Water (Potable)', densityPpg: 8.34, viscosityCp: 1.0, ph: '7.0' },
  kcl_2_pct: { name: '2% KCl Clay Stabilizer', densityPpg: 8.45, viscosityCp: 1.05, ph: '7.2' },
  kcl_4_pct: { name: '4% KCl Inhibitive Brine', densityPpg: 8.55, viscosityCp: 1.10, ph: '7.3' },
  sea_water: { name: 'Filtered Seawater', densityPpg: 8.55, viscosityCp: 1.15, ph: '8.0' },
  nacl_brine: { name: '9.5 ppg NaCl Saturated Brine', densityPpg: 9.50, viscosityCp: 1.35, ph: '7.5' },
  cacl2_brine: { name: '11.2 ppg Calcium Chloride Brine', densityPpg: 11.20, viscosityCp: 2.10, ph: '6.8' },
  heavy_cabr2: { name: '14.2 ppg CaBr2 Completion Brine', densityPpg: 14.20, viscosityCp: 4.80, ph: '6.5' },
};

export const OIL_BASE_PROPERTIES: Record<OilBaseType, { name: string; densityPpg: number; viscosityCp: number }> = {
  none: { name: 'None (100% Water)', densityPpg: 0, viscosityCp: 0 },
  mineral_oil: { name: 'Low-Tox Mineral Base Oil (Paraffinic)', densityPpg: 6.95, viscosityCp: 4.2 },
  diesel_no2: { name: 'Diesel #2 (Refined Base)', densityPpg: 7.10, viscosityCp: 3.0 },
  synthetic_ester: { name: 'Synthetic Ester / Poly-Alpha-Olefin', densityPpg: 6.75, viscosityCp: 5.2 },
  condensate: { name: 'Light Condensate / Hydrocarbon Solvent', densityPpg: 6.30, viscosityCp: 1.2 },
};

/**
 * Automatically computes physical and rheological properties based on base fluid fractions,
 * polymer loading, and weighting additives.
 */
export function calculateFluidCompositionProperties(
  composition: Omit<CustomFluidComposition, 'densityPpg' | 'densitySg' | 'viscosityCp' | 'frictionReductionPercent' | 'corrosivity' | 'h2sCompatible' | 'solidsType' | 'maxTemperatureF' | 'phRange' | 'chemicalBase' | 'commonApplications'>
): {
  densityPpg: number;
  densitySg: number;
  viscosityCp: number;
  frictionReductionPercent: number;
  corrosivity: CorrosivityLevel;
  h2sCompatible: boolean;
  solidsType: SolidsClassification;
  maxTemperatureF: number;
  phRange: string;
  chemicalBase: string;
  commonApplications: string[];
} {
  const wFrac = Math.max(0, Math.min(100, composition.waterFractionPct)) / 100;
  const oFrac = Math.max(0, Math.min(100, composition.oilFractionPct)) / 100;
  const totalVol = (wFrac + oFrac) > 0 ? (wFrac + oFrac) : 1;

  const wNorm = wFrac / totalVol;
  const oNorm = oFrac / totalVol;

  const wProps = WATER_BASE_PROPERTIES[composition.waterBaseType] || WATER_BASE_PROPERTIES.fresh_water;
  const oProps = OIL_BASE_PROPERTIES[composition.oilBaseType] || OIL_BASE_PROPERTIES.none;

  // 1. Calculate Base Density (ppg)
  let baseDensityPpg = wNorm * wProps.densityPpg;
  if (composition.oilBaseType !== 'none') {
    baseDensityPpg += oNorm * oProps.densityPpg;
  }
  
  // Add weighting solids
  const weightingAdd = Math.max(0, composition.weightingConcentrationPpgAdd || 0);
  const finalDensityPpg = Number((baseDensityPpg + weightingAdd).toFixed(2));
  const finalDensitySg = Number(ppgToSg(finalDensityPpg).toFixed(3));

  // 2. Calculate Base Viscosity (cp)
  let baseViscosity = wNorm * wProps.viscosityCp;
  if (composition.oilBaseType !== 'none') {
    baseViscosity += oNorm * oProps.viscosityCp;
    // Emulsion viscosity rise if both water and oil are present
    if (wNorm > 0.1 && oNorm > 0.1) {
      baseViscosity *= 1.45; // internal droplet shear resistance
    }
  }

  // 3. Polymer Rheology Contribution
  let polymerViscAdd = 0;
  let frictionReduction = 0;
  const conc = Math.max(0, composition.polymerConcentration || 0);

  switch (composition.polymerType) {
    case 'friction_reducer_paa': {
      // Liquid PAA Friction Reducer (0.5 - 3 gpt)
      polymerViscAdd = conc * 0.4;
      frictionReduction = Math.min(74, Math.round(38 + conc * 14));
      break;
    }
    case 'guar_gum': {
      // Linear Guar (20 - 50 lb/1000gal)
      polymerViscAdd = Math.pow(conc / 10, 1.45) * 3.2;
      frictionReduction = Math.min(55, Math.round(15 + conc * 0.8));
      break;
    }
    case 'hec_cellulose': {
      // Clean non-damaging HEC (15 - 45 lb/1000gal)
      polymerViscAdd = Math.pow(conc / 10, 1.38) * 3.6;
      frictionReduction = Math.min(48, Math.round(12 + conc * 0.7));
      break;
    }
    case 'xanthan_gum': {
      // Shear-thinning Biopolymer (10 - 35 lb/1000gal)
      polymerViscAdd = Math.pow(conc / 10, 1.55) * 4.8;
      frictionReduction = Math.min(45, Math.round(10 + conc * 0.9));
      break;
    }
    case 'pac_polymer': {
      // Polyanionic Cellulose (1 - 5 lb/bbl)
      polymerViscAdd = Math.pow(conc, 1.4) * 4.5;
      frictionReduction = Math.min(40, Math.round(15 + conc * 5));
      break;
    }
    case 'crosslinked_borate': {
      // Borate crosslinked gel
      polymerViscAdd = Math.pow(conc / 10, 1.85) * 8.5;
      frictionReduction = Math.min(30, Math.round(5 + conc * 0.4));
      break;
    }
    case 'none':
    default: {
      polymerViscAdd = 0;
      // Mineral oil or diesel provides 10-18% inherent boundary lubricity
      if (composition.oilBaseType !== 'none') {
        frictionReduction = Math.round(oNorm * 18);
      } else {
        frictionReduction = 0;
      }
      break;
    }
  }

  const finalViscosityCp = Number((baseViscosity + polymerViscAdd).toFixed(1));

  // 4. Chemical Properties & Applications
  let corrosivity: CorrosivityLevel = 'Non-corrosive';
  if (composition.corrosionInhibitor) {
    corrosivity = 'Non-corrosive';
  } else if (composition.waterBaseType === 'cacl2_brine' || composition.waterBaseType === 'heavy_cabr2') {
    corrosivity = 'Mild';
  }

  const h2sCompatible = composition.h2sScavenger || composition.oilBaseType !== 'none';

  let solidsType: SolidsClassification = 'None (Clear)';
  if (composition.weightingAgent === 'barite') {
    solidsType = 'Weighted Solids';
  } else if (composition.weightingAgent === 'calcium_carbonate') {
    solidsType = 'Low-Solids';
  }

  let chemicalBase = '';
  if (composition.oilBaseType !== 'none' && composition.waterFractionPct > 0) {
    chemicalBase = `${Math.round(oNorm * 100)}/${Math.round(wNorm * 100)} Emulsion (${oProps.name.split(' ')[0]} / ${wProps.name.split(' ')[0]})`;
  } else if (composition.oilBaseType !== 'none') {
    chemicalBase = `${oProps.name} Non-Aqueous`;
  } else {
    chemicalBase = `${wProps.name} + ${composition.polymerType === 'none' ? 'Neat' : composition.polymerType.replace(/_/g, ' ').toUpperCase()}`;
  }

  const applications: string[] = [];
  if (composition.oilBaseType !== 'none') {
    applications.push('Shale-Inhibitive Cleanout', 'Friction Mitigation', 'Wax / Asphaltene Dissolution');
  } else if (composition.polymerType === 'friction_reducer_paa') {
    applications.push('High-Rate CT Milling', 'Long-Reach Lateral Sweeping', 'Low Pump-Pressure Circulation');
  } else if (composition.polymerType === 'xanthan_gum' || composition.polymerType === 'guar_gum') {
    applications.push('High-Viscosity Sand Washing', 'Cuttings Debris Transport', 'Horizontal Well Pack-Off Prevention');
  } else {
    applications.push('Wellbore Flushing', 'Pressure Testing', 'Displacement Operations');
  }

  return {
    densityPpg: finalDensityPpg,
    densitySg: finalDensitySg,
    viscosityCp: Math.max(0.8, finalViscosityCp),
    frictionReductionPercent: frictionReduction,
    corrosivity,
    h2sCompatible,
    solidsType,
    maxTemperatureF: composition.polymerType === 'xanthan_gum' ? 275 : 350,
    phRange: wProps.ph,
    chemicalBase,
    commonApplications: applications,
  };
}

/**
 * Factory seed presets for Custom Fluid Compositions
 */
export const DEFAULT_CUSTOM_COMPOSITIONS: CustomFluidComposition[] = [
  {
    id: 'custom_obm_mineral_80_20',
    name: '80/20 Mineral Base Oil Emulsion',
    shortName: '80/20 Mineral OBM',
    category: 'oil_base',
    description: 'Low-toxicity paraffinic mineral base oil with 20% internal brine phase for reactive shale drilling and heavy scale milling.',
    author: 'Field Engineering',
    createdAt: '2026-01-15',
    updatedAt: '2026-03-10',
    isPreset: true,
    waterFractionPct: 20,
    waterBaseType: 'kcl_2_pct',
    oilFractionPct: 80,
    oilBaseType: 'mineral_oil',
    polymerType: 'none',
    polymerConcentration: 0,
    polymerUnit: 'lb/1000gal',
    weightingAgent: 'none',
    weightingConcentrationPpgAdd: 0,
    corrosionInhibitor: true,
    h2sScavenger: true,
    surfactantPct: 1.5,
    densityPpg: 7.25,
    densitySg: 0.869,
    viscosityCp: 4.8,
    frictionReductionPercent: 18,
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    solidsType: 'None (Clear)',
    maxTemperatureF: 350,
    phRange: '7.2 - 8.0',
    chemicalBase: '80/20 Mineral Oil / KCl Emulsion',
    commonApplications: ['Water-Sensitive Shale Cleanout', 'Wax Solubilization', 'Extended Reach Lateral CT'],
  },
  {
    id: 'custom_linear_guar_35lb',
    name: '35 lb/1000gal Linear Guar Cleanout Gel',
    shortName: '35 lb Guar Gel',
    category: 'polymer_gel',
    description: 'High-viscosity polymer sweep fluid optimized for carrying large proppant plugs and sand beds out of horizontal laterals.',
    author: 'Field Engineering',
    createdAt: '2026-02-01',
    updatedAt: '2026-03-10',
    isPreset: true,
    waterFractionPct: 100,
    waterBaseType: 'fresh_water',
    oilFractionPct: 0,
    oilBaseType: 'none',
    polymerType: 'guar_gum',
    polymerConcentration: 35,
    polymerUnit: 'lb/1000gal',
    weightingAgent: 'none',
    weightingConcentrationPpgAdd: 0,
    corrosionInhibitor: false,
    h2sScavenger: false,
    surfactantPct: 0.2,
    densityPpg: 8.38,
    densitySg: 1.004,
    viscosityCp: 32.5,
    frictionReductionPercent: 38,
    corrosivity: 'Non-corrosive',
    h2sCompatible: false,
    solidsType: 'None (Clear)',
    maxTemperatureF: 250,
    phRange: '6.5 - 7.5',
    chemicalBase: 'Fresh Water + Linear Hydroxypropyl Guar',
    commonApplications: ['Proppant Washing', 'High-Viscosity Viscous Pill Sweeps', 'Cuttings Bed Mobilization'],
  },
  {
    id: 'custom_high_fr_slickwater',
    name: 'Ultra-FR Slickwater (2.0 gpt Anionic PAA)',
    shortName: 'Ultra-FR Slickwater',
    category: 'water_base',
    description: 'High-performance viscoelastic friction-reduced brine achieving >65% pressure reduction for high-rate milling & cleanouts.',
    author: 'CT Operations',
    createdAt: '2026-02-12',
    updatedAt: '2026-03-10',
    isPreset: true,
    waterFractionPct: 100,
    waterBaseType: 'kcl_2_pct',
    oilFractionPct: 0,
    oilBaseType: 'none',
    polymerType: 'friction_reducer_paa',
    polymerConcentration: 2.0,
    polymerUnit: 'gpt',
    weightingAgent: 'none',
    weightingConcentrationPpgAdd: 0,
    corrosionInhibitor: true,
    h2sScavenger: true,
    surfactantPct: 0.5,
    densityPpg: 8.46,
    densitySg: 1.014,
    viscosityCp: 2.2,
    frictionReductionPercent: 68,
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    solidsType: 'None (Clear)',
    maxTemperatureF: 325,
    phRange: '7.0 - 7.8',
    chemicalBase: '2% KCl Brine + High-MW Polyacrylamide',
    commonApplications: ['Frac Plug Composite Milling', 'High-Rate Annular Velocity Flushing', 'Deep Well Circulation'],
  },
  {
    id: 'custom_xanthan_biopolymer_cleanout',
    name: 'Shear-Thinning Xanthan Sweeping Slurry (20 lb)',
    shortName: 'Xanthan Biopolymer Sweep',
    category: 'polymer_gel',
    description: 'Pseudoplastic biopolymer offering zero-shear gel strength for cuttings suspension when pumps stop, with low pipe friction.',
    author: 'Reservoir Services',
    createdAt: '2026-02-18',
    updatedAt: '2026-03-10',
    isPreset: true,
    waterFractionPct: 100,
    waterBaseType: 'fresh_water',
    oilFractionPct: 0,
    oilBaseType: 'none',
    polymerType: 'xanthan_gum',
    polymerConcentration: 20,
    polymerUnit: 'lb/1000gal',
    weightingAgent: 'calcium_carbonate',
    weightingConcentrationPpgAdd: 0.5,
    corrosionInhibitor: true,
    h2sScavenger: false,
    surfactantPct: 0.0,
    densityPpg: 8.84,
    densitySg: 1.060,
    viscosityCp: 18.5,
    frictionReductionPercent: 28,
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    solidsType: 'Low-Solids',
    maxTemperatureF: 275,
    phRange: '7.5 - 8.5',
    chemicalBase: 'Xanthan Biopolymer + CaCO3 Bridging Particles',
    commonApplications: ['Underbalanced Hole Cleaning', 'Debris Suspension in Deviated Wells', 'Loss Zone Bridging'],
  },
  {
    id: 'custom_diesel_asphaltene_wash',
    name: 'Refined Diesel #2 Asphaltene Soak',
    shortName: 'Diesel Asphaltene Soak',
    category: 'oil_base',
    description: '100% aromatic-rich diesel solvent designed for soaking and dissolving organic paraffin/asphaltene deposits in CT strings and BHA.',
    author: 'Chemical Stimulation',
    createdAt: '2026-02-22',
    updatedAt: '2026-03-10',
    isPreset: true,
    waterFractionPct: 0,
    waterBaseType: 'fresh_water',
    oilFractionPct: 100,
    oilBaseType: 'diesel_no2',
    polymerType: 'none',
    polymerConcentration: 0,
    polymerUnit: 'lb/1000gal',
    weightingAgent: 'none',
    weightingConcentrationPpgAdd: 0,
    corrosionInhibitor: true,
    h2sScavenger: true,
    surfactantPct: 2.0,
    densityPpg: 7.10,
    densitySg: 0.851,
    viscosityCp: 3.0,
    frictionReductionPercent: 14,
    corrosivity: 'Non-corrosive',
    h2sCompatible: true,
    solidsType: 'None (Clear)',
    maxTemperatureF: 300,
    phRange: 'Neutral',
    chemicalBase: 'Refined Hydrocarbon Diesel #2 + Mutual Solvents',
    commonApplications: ['Paraffin Wax Dissolution', 'Asphaltene Removal', 'Tubing Unplugging'],
  }
];

const STORAGE_KEY = 'coiled_matrix_custom_fluid_compositions';

/**
 * Loads custom fluid compositions from localStorage with fallback to built-in presets
 */
export function loadCustomFluidsFromStorage(): CustomFluidComposition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveCustomFluidsToStorage(DEFAULT_CUSTOM_COMPOSITIONS);
      return DEFAULT_CUSTOM_COMPOSITIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse custom fluid compositions from localStorage', err);
  }
  return DEFAULT_CUSTOM_COMPOSITIONS;
}

/**
 * Saves custom fluid compositions to localStorage
 */
export function saveCustomFluidsToStorage(fluids: CustomFluidComposition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fluids));
  } catch (err) {
    console.error('Failed to save custom fluids to localStorage', err);
  }
}
