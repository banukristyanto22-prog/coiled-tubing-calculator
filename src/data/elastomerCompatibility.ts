import { FluidSpecification, CorrosivityLevel } from './fluidsLibrary';
import { CustomFluidComposition } from '../types/customFluid';

export type BhaElastomerType = 'nbr' | 'hnbr' | 'fkm' | 'ffkm' | 'aflas';

export type ElastomerRating = 'compatible' | 'caution' | 'incompatible';

export interface ElastomerCompatibilityDetail {
  rating: ElastomerRating;
  label: string;
  reason: string;
  maxTempF: number;
  exposureGuideline: string;
}

export interface BhaElastomerSpec {
  id: BhaElastomerType;
  name: string;
  shortName: string;
  tradeNames: string;
  tempRangeF: string;
  maxTempF: number;
  primaryBhaTools: string;
  description: string;
  strengths: string;
  vulnerabilities: string;
  color: string;
}

export const BHA_ELASTOMER_SPECS: Record<BhaElastomerType, BhaElastomerSpec> = {
  nbr: {
    id: 'nbr',
    name: 'Nitrile / Buna-N (NBR)',
    shortName: 'NBR',
    tradeNames: 'Buna-N, Nitrile 70/90, Hycar®',
    tempRangeF: '-20°F to 250°F (-29°C to 121°C)',
    maxTempF: 250,
    primaryBhaTools: 'Standard low-temp check valves, mechanical disconnects, wiper darts, tubing centralizers',
    description: 'General-purpose copolymer of butadiene and acrylonitrile. Standard oilfield elastomer for clear brines, fresh water, and water-based slickwaters at moderate temperatures.',
    strengths: 'Excellent abrasion and tear resistance with water, slickwaters, and low-salinity brines. Low cost.',
    vulnerabilities: 'Rapid volume swelling in diesel/aromatics; severely degraded and embrittled by hydrochloric acids (HCl), mutual solvents (EGMBE), and hydrogen sulfide (H₂S).',
    color: 'slate',
  },
  hnbr: {
    id: 'hnbr',
    name: 'Hydrogenated Nitrile (HNBR)',
    shortName: 'HNBR',
    tradeNames: 'Therban®, Zetpol®, HSN',
    tempRangeF: '-20°F to 325°F (-29°C to 163°C)',
    maxTempF: 325,
    primaryBhaTools: 'CT PDM drilling & milling motors (stator elastomer), hydraulic jars, high-stress dynamic BHA seals',
    description: 'Hydrogenated nitrile rubber offering significantly higher tensile strength, thermal resistance, and dynamic tear endurance. The industry standard for coiled tubing drilling motor power sections.',
    strengths: 'Resistant to drilling muds, low-toxicity mineral base oils, fresh/salt water, and sour gas (H₂S). High dynamic abrasion resistance.',
    vulnerabilities: 'Vulnerable to strong mineral acids (28% HCl causes rapid cracking), polar organic solvents (EGMBE mutual solvents cause excessive swelling), and temperatures above 325°F.',
    color: 'cyan',
  },
  fkm: {
    id: 'fkm',
    name: 'Fluoroelastomer (FKM / Viton®)',
    shortName: 'FKM (Viton®)',
    tradeNames: 'Viton® A/B/GF, Fluorel®, Dai-El®',
    tempRangeF: '-10°F to 400°F (-23°C to 204°C)',
    maxTempF: 400,
    primaryBhaTools: 'Acid stimulation BHAs, chemical injection subs, flow-release valves, high-temp hydraulic jars',
    description: 'Fluorocarbon elastomer engineered for high temperature and harsh chemical exposure. Standard choice for coiled tubing matrix acidizing (15% & 28% HCl) and hydrocarbon soaks.',
    strengths: 'Outstanding resistance to concentrated HCl acids, formic/acetic organic acids, diesel #2, mineral oils, and synthetic aromatics up to 400°F.',
    vulnerabilities: 'Susceptible to base attack / dehydrofluorination by high pH alkaline brines (pH > 10, potassium formate, borate crosslinkers), steam, and amine corrosion inhibitors.',
    color: 'amber',
  },
  ffkm: {
    id: 'ffkm',
    name: 'Perfluoroelastomer (FFKM / Kalrez®)',
    shortName: 'FFKM (Kalrez®)',
    tradeNames: 'Kalrez® 4079/3065, Chemraz® 505, Perlast®',
    tempRangeF: '0°F to 550°F (-18°C to 288°C)',
    maxTempF: 550,
    primaryBhaTools: 'HPHT critical BHA tools, deep sour well isolation tools, severe acid frac strings, hostile well testing subs',
    description: 'Fully fluorinated polymer network delivering near-universal chemical inertness and extreme temperature tolerance. The gold standard for critical, zero-failure intervention operations.',
    strengths: 'Virtually inert to all oilfield chemicals: 28% HCl, concentrated organic acids, high-temperature steam, amine scavengers, aromatic solvents, and high H₂S concentrations.',
    vulnerabilities: 'High cost and limited low-temperature sealing flexibility below 0°F (-18°C). Avoid fluorinated solvents.',
    color: 'emerald',
  },
  aflas: {
    id: 'aflas',
    name: 'FEPM / Aflas® (Fluoroelastomer)',
    shortName: 'Aflas®',
    tradeNames: 'Aflas® 100/150, FEPM (TFE/P)',
    tempRangeF: '+25°F to 450°F (-4°C to 232°C)',
    maxTempF: 450,
    primaryBhaTools: 'Sour gas (H₂S) BHA strings, amine-inhibited system subs, high-pH completion brine tools, steam injection BHAs',
    description: 'Copolymer of tetrafluoroethylene and propylene. Specifically formulated for resistance to strong bases, amines, sour gas, and high-temperature steam where FKM fails.',
    strengths: 'Immune to amine corrosion inhibitors, strong caustic washes, high-pH completion brines (potassium formate, borate gels), high H₂S, and hot water/steam.',
    vulnerabilities: 'Prone to significant swelling and loss of modulus when soaked in light diesel #2, condensate, or pure aromatic hydrocarbon solvents.',
    color: 'purple',
  },
};

export const BHA_ELASTOMERS_LIST: BhaElastomerSpec[] = Object.values(BHA_ELASTOMER_SPECS);

// Detailed Chemical Compatibility Matrix for Standard Fluids Library
const STATIC_FLUID_COMPATIBILITY: Record<string, Record<BhaElastomerType, ElastomerCompatibilityDetail>> = {
  // Fresh Water
  fresh_water: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe for continuous water circulation below 250°F', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Excellent water resistance up to 325°F', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Safe for water circulation; monitor prolonged hot water (>250°F)', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert to fresh water', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Excellent hot water & steam resistance', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 2% KCl Brine
  kcl_2pct: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with neutral potassium chloride brines', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with light clay-stabilizing brines', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to dissolved KCl salts', maxTempF: 400, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Ideal for KCl brine service', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 8.6 ppg NaCl Brine
  brine_8_6: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with standard sodium chloride brine', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Excellent resistance to NaCl brine up to 325°F', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to clear inorganic salt solutions', maxTempF: 400, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Seawater
  sea_water: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with filtered marine brine', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with marine brines', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to offshore saline water', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Excellent resistance', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 10.0 ppg CaCl2 Brine
  brine_10_0: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with neutral calcium chloride below 220°F', maxTempF: 220, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Excellent CaCl2 brine tolerance', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to neutral clear CaCl2 brine', maxTempF: 400, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Outstanding resistance to heavy divalent brines', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 11.6 ppg CaBr2 Brine
  cabr2_11_6: {
    nbr: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Divalent bromide salts can accelerate hardening above 200°F', maxTempF: 200, exposureGuideline: '< 48 hours' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Good resistance to heavy calcium bromide brine', maxTempF: 300, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to CaBr2 up to 350°F', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Recommended seal material for heavy bromide brines', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 14.2 ppg ZnBr2 Brine (Acidic pH 3.5 - 5.0)
  znbr2_14_2: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Hazard)', reason: 'Acidic zinc bromide causes severe polymer embrittlement and degradation', maxTempF: 150, exposureGuideline: 'Not recommended' },
    hnbr: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Moderately acidic clear brine; limited exposure recommended below 250°F', maxTempF: 250, exposureGuideline: '< 24 hours' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to acidic halide brines up to 350°F', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert to zinc bromide', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to heavy ZnBr2 brine systems', maxTempF: 400, exposureGuideline: 'Continuous' },
  },

  // 11.0 ppg Potassium Formate (High pH 9.0 - 10.5)
  potassium_formate_11_0: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to organic formate salts up to 230°F', maxTempF: 230, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Recommended elastomer for potassium formate drill-in fluids', maxTempF: 320, exposureGuideline: 'Continuous' },
    fkm: { rating: 'incompatible', label: 'Incompatible (Alkaline Attack)', reason: 'High pH alkaline formate causes dehydrofluorination and embrittlement of standard FKM', maxTempF: 200, exposureGuideline: 'Avoid high pH' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to alkaline formate solutions', maxTempF: 450, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Prime choice for potassium and cesium formate brines', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Slickwater Standard
  slickwater: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with standard anionic polyacrylamide friction reducers', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible; excellent motor stator life', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to aqueous polyacrylamide solutions', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with slickwater systems', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Slickwater High TDS
  slickwater_high_tds: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with produced water and cationic FR polymers', maxTempF: 240, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Recommended for high-salinity milling operations', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Excellent chemical resistance to produced water brines', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Slickwater Max FR
  slickwater_heavy_drag_red: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with high-molecular weight PAM friction reducers', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Ideal for extended-reach milling with downhole motors', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to high-molecular weight friction reducers', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Linear Gel 25# Guar
  linear_gel: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with natural guar polysaccharides', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Excellent compatibility for sand washing sweeps', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to guar gel sweeps', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Linear Gel 35# HPG
  linear_gel_35_hpg: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with hydroxypropyl guar biopolymers', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Recommended for hot cleanout sweeps with BHA motors', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Xanthan Biopolymer
  xanthan_biopolymer: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with xanthan polysaccharide shear-thinning sweeps', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with low-shear annular sweep fluids', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to xanthan polymer networks', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // HEC Viscous Pill
  hec_viscous_pill: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with hydroxyethyl cellulose completion sweeps', maxTempF: 220, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Non-damaging to BHA seals and PDM motors', maxTempF: 300, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Inert to non-ionic HEC cellulose', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Borate Crosslinked Gel (pH 9.0 - 10.5)
  crosslinked_borate_gel: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to borate crosslinked gel systems below 250°F', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to high-viscosity borate fracturing pills', maxTempF: 300, exposureGuideline: 'Continuous' },
    fkm: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Moderately high pH (9.5-10.5) can cause surface hardening of standard Viton®', maxTempF: 220, exposureGuideline: '< 48 hours' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Superior resistance to alkaline borate crosslinked systems', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // 15% Inhibited HCl Matrix Acid
  acid_15_hcl: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Hazard)', reason: 'Severe polymer degradation, hardening, and loss of seal elasticity', maxTempF: 150, exposureGuideline: 'Not recommended' },
    hnbr: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Safe only for short acid washes (<4 hrs) with active corrosion inhibitor; avoid PDM motor circulation', maxTempF: 200, exposureGuideline: '< 4 hours inhibited' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Industry-standard elastomer for 15% HCl matrix acidizing', maxTempF: 300, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Highest chemical resistance to hot hydrochloric acid', maxTempF: 450, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to inhibited 15% HCl acid solutions', maxTempF: 320, exposureGuideline: 'Continuous' },
  },

  // 28% Concentrated HCl Stimulation Acid
  acid_28_hcl: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Hazard)', reason: 'Instant severe embrittlement and catastrophic seal blowout hazard', maxTempF: 120, exposureGuideline: 'Severe blowout risk' },
    hnbr: { rating: 'incompatible', label: 'Incompatible (Severe Attack)', reason: 'Concentrated 28% HCl causes rapid cracking and blistering of HNBR', maxTempF: 150, exposureGuideline: 'Incompatible' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to concentrated 28% HCl when properly inhibited', maxTempF: 250, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Universal choice for high-strength acid stimulation', maxTempF: 450, exposureGuideline: 'Continuous' },
    aflas: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Limited exposure recommended; monitor inhibitor package', maxTempF: 220, exposureGuideline: '< 12 hours' },
  },

  // Organic Retarded Acid (Formic / Acetic)
  organic_retarded_acid: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Hazard)', reason: 'Organic acids cause extensive swelling and softening of nitrile', maxTempF: 160, exposureGuideline: 'Not recommended' },
    hnbr: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Moderate resistance; acceptable for short high-temperature acid sweeps', maxTempF: 220, exposureGuideline: '< 8 hours' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to formic and acetic organic acid blends up to 380°F', maxTempF: 380, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert to organic acids', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Good resistance to organic acidizing packages', maxTempF: 350, exposureGuideline: 'Continuous' },
  },

  // 15% Emulsified Retarded Acid (Acid-in-Oil / Diesel)
  emulsified_acid: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Double Hazard)', reason: 'Simultaneous acid degradation and diesel hydrocarbon swelling destroy NBR', maxTempF: 140, exposureGuideline: 'Extreme danger' },
    hnbr: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Protected by outer diesel phase, but internal acid can attack dynamic seals', maxTempF: 220, exposureGuideline: '< 6 hours' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Excellent resistance to both diesel external phase and hydrochloric acid internal phase', maxTempF: 300, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 450, exposureGuideline: 'Continuous' },
    aflas: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Diesel oil phase can cause volume swelling of Aflas®', maxTempF: 240, exposureGuideline: '< 12 hours' },
  },

  // EGMBE Mutual Solvent Wash
  mutual_solvent_wash: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Extreme Swell)', reason: 'Ethylene glycol monobutyl ether causes >50% volumetric swell and seal extrusion', maxTempF: 150, exposureGuideline: 'Extreme swelling risk' },
    hnbr: { rating: 'incompatible', label: 'Incompatible (Severe Swell)', reason: 'Polar glycol ethers induce severe swelling and loss of tensile strength', maxTempF: 180, exposureGuideline: 'Not recommended' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Good resistance to glycol ethers and mutual solvent surfactants', maxTempF: 320, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Universal resistance to polar solvent washes', maxTempF: 450, exposureGuideline: 'Continuous' },
    aflas: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Moderate swelling in concentrated glycol ethers; acceptable for short flushes', maxTempF: 250, exposureGuideline: '< 8 hours' },
  },

  // 10.5 ppg Polymer Drilling Mud
  drilling_mud: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with water-based bentonite/PAC drilling muds below 220°F', maxTempF: 220, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Industry benchmark seal for PDM mud motor milling operations', maxTempF: 320, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to water-based polymer muds', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with water-based muds', maxTempF: 400, exposureGuideline: 'Continuous' },
  },

  // 9.2 ppg LSND Mud
  mud_lsnd: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Compatible with low-solids non-dispersed polymer muds', maxTempF: 220, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Ideal for thru-tubing milling and window cutting BHA tools', maxTempF: 320, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 400, exposureGuideline: 'Continuous' },
  },

  // 12.5 ppg Barite Kill Mud
  mud_barite_12_5: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe for emergency well kill circulation below 220°F', maxTempF: 220, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'High tear resistance prevents seal erosion by barite particulates', maxTempF: 320, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to weighted water-based kill muds', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with weighted barite muds', maxTempF: 400, exposureGuideline: 'Continuous' },
  },

  // Synthetic Oil-Based Mud (OBM)
  synthetic_oil_mud: {
    nbr: { rating: 'incompatible', label: 'Incompatible (Oil Swelling)', reason: 'Synthetic paraffin base oil causes excessive swelling and seal softening', maxTempF: 160, exposureGuideline: 'Not recommended' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Engineered for synthetic paraffin and internal olefin invert muds', maxTempF: 300, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to synthetic hydrocarbon base oils and invert emulsifiers', maxTempF: 380, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert to synthetic oil muds', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'caution', label: 'Caution (Conditional)', reason: 'Synthetic hydrocarbons may induce minor swelling; check dynamic seal clearances', maxTempF: 280, exposureGuideline: '< 48 hours' },
  },

  // Nitrogen Foam 70Q
  nitrogen_foam_70: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with aqueous nitrogen foam and foaming surfactants', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'High resistance to explosive decompression (AED) during gas cleanout', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Resistant to aqueous foam and high-pressure nitrogen gas', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Outstanding resistance to rapid gas decompression', maxTempF: 450, exposureGuideline: 'Continuous' },
  },

  // Nitrogen Gelled Foam 65Q
  nitrogen_gel_foam_65: {
    nbr: { rating: 'compatible', label: 'Compatible', reason: 'Safe with polymer gelled nitrogen foam', maxTempF: 250, exposureGuideline: 'Continuous' },
    hnbr: { rating: 'compatible', label: 'Compatible', reason: 'Recommended for two-phase sand cleanout in depleted reservoirs', maxTempF: 325, exposureGuideline: 'Continuous' },
    fkm: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible', maxTempF: 350, exposureGuideline: 'Continuous' },
    ffkm: { rating: 'compatible', label: 'Compatible', reason: 'Completely inert', maxTempF: 500, exposureGuideline: 'Continuous' },
    aflas: { rating: 'compatible', label: 'Compatible', reason: 'Fully compatible with energized gel systems', maxTempF: 450, exposureGuideline: 'Continuous' },
  },
};

/**
 * Flexible input type accommodating built-in FluidSpecification and CustomFluidComposition.
 */
export type CompatibleFluidInput = {
  id: string;
  name?: string;
  chemicalBase?: string;
  corrosivity?: CorrosivityLevel | string;
  category?: string;
  oilFractionPct?: number;
  oilBaseType?: string;
  baseOilType?: string;
  description?: string;
  [key: string]: any;
};

/**
 * Evaluates elastomer compatibility for any fluid (built-in or custom formulated).
 */
export function getFluidElastomerCompatibility(
  fluid: CompatibleFluidInput
): Record<BhaElastomerType, ElastomerCompatibilityDetail> {
  // 1. Direct match in static library
  if (STATIC_FLUID_COMPATIBILITY[fluid.id]) {
    return STATIC_FLUID_COMPATIBILITY[fluid.id];
  }

  // 2. Dynamic evaluation for custom fluid compositions
  const oilFraction = fluid.oilFractionPct || (fluid.category === 'oil_base' || fluid.category === 'Oil-Based Muds (OBM)' ? 80 : 0);
  const baseOilType = fluid.oilBaseType || fluid.baseOilType || 'mineral';
  const corrosivity = fluid.corrosivity || 'Non-corrosive';
  const chemicalBase = (fluid.chemicalBase || '').toLowerCase();
  const description = (fluid.description || '').toLowerCase();
  const name = (fluid.name || '').toLowerCase();
  const isAcidic = corrosivity === 'Severe / Acidic' || chemicalBase.includes('acid') || chemicalBase.includes('hcl') || name.includes('acid');
  const isHighPh = chemicalBase.includes('formate') || chemicalBase.includes('borate') || chemicalBase.includes('caustic');
  const isSolvent = chemicalBase.includes('solvent') || chemicalBase.includes('ether') || chemicalBase.includes('egmbe') || chemicalBase.includes('xylene');

  // NBR evaluation
  let nbr: ElastomerCompatibilityDetail;
  if (isAcidic) {
    nbr = { rating: 'incompatible', label: 'Incompatible (Acid Attack)', reason: 'Severe acid embrittlement and degradation; blowout hazard', maxTempF: 140, exposureGuideline: 'Not recommended' };
  } else if (isSolvent) {
    nbr = { rating: 'incompatible', label: 'Incompatible (Solvent Swell)', reason: 'Extreme volumetric swelling and seal extrusion risk', maxTempF: 150, exposureGuideline: 'Not recommended' };
  } else if (oilFraction > 10) {
    nbr = { rating: 'incompatible', label: 'Incompatible (Oil Swelling)', reason: `${oilFraction}% base oil causes rapid swelling and loss of sealing modulus`, maxTempF: 160, exposureGuideline: 'Avoid oil exposure' };
  } else if (corrosivity === 'Moderate') {
    nbr = { rating: 'caution', label: 'Caution (Conditional)', reason: 'Moderate chemical reactivity; monitor continuous pumping hours', maxTempF: 200, exposureGuideline: '< 24 hours' };
  } else {
    nbr = { rating: 'compatible', label: 'Compatible', reason: 'Safe for water & brine circulation below 250°F', maxTempF: 250, exposureGuideline: 'Continuous' };
  }

  // HNBR evaluation
  let hnbr: ElastomerCompatibilityDetail;
  if (isAcidic && (chemicalBase.includes('28%') || name.includes('28%'))) {
    hnbr = { rating: 'incompatible', label: 'Incompatible (High Acid)', reason: 'Concentrated acid attacks dynamic motor stator and seals', maxTempF: 150, exposureGuideline: 'Not recommended' };
  } else if (isAcidic) {
    hnbr = { rating: 'caution', label: 'Caution (Conditional)', reason: 'Acidic fluid requires continuous corrosion inhibitor; limit exposure', maxTempF: 200, exposureGuideline: '< 6 hours' };
  } else if (isSolvent) {
    hnbr = { rating: 'incompatible', label: 'Incompatible (Solvent Swell)', reason: 'Aggressive polar solvents cause excessive volume swell', maxTempF: 180, exposureGuideline: 'Avoid polar solvents' };
  } else if (oilFraction > 0 && baseOilType === 'diesel') {
    hnbr = { rating: 'compatible', label: 'Compatible', reason: 'Resistant to diesel fuel at moderate temperatures (<275°F)', maxTempF: 275, exposureGuideline: 'Continuous' };
  } else {
    hnbr = { rating: 'compatible', label: 'Compatible', reason: 'Industry-standard compatibility for PDM motors and BHA seals', maxTempF: 325, exposureGuideline: 'Continuous' };
  }

  // FKM evaluation
  let fkm: ElastomerCompatibilityDetail;
  if (isHighPh) {
    fkm = { rating: 'incompatible', label: 'Incompatible (Alkaline Attack)', reason: 'Alkaline base causes dehydrofluorination cracking of Viton®', maxTempF: 200, exposureGuideline: 'Avoid high pH' };
  } else if (isAcidic) {
    fkm = { rating: 'compatible', label: 'Compatible', reason: 'Superior chemical resistance to matrix and stimulation acids', maxTempF: 380, exposureGuideline: 'Continuous' };
  } else if (oilFraction > 0) {
    fkm = { rating: 'compatible', label: 'Compatible', reason: 'Excellent resistance to mineral and synthetic base oils', maxTempF: 400, exposureGuideline: 'Continuous' };
  } else {
    fkm = { rating: 'compatible', label: 'Compatible', reason: 'Broad chemical and thermal resistance up to 400°F', maxTempF: 400, exposureGuideline: 'Continuous' };
  }

  // FFKM evaluation
  const ffkm: ElastomerCompatibilityDetail = {
    rating: 'compatible',
    label: 'Compatible',
    reason: 'Universally inert to virtually all oilfield chemical blends',
    maxTempF: 550,
    exposureGuideline: 'Continuous',
  };

  // Aflas evaluation
  let aflas: ElastomerCompatibilityDetail;
  if (oilFraction > 25 && baseOilType === 'diesel') {
    aflas = { rating: 'incompatible', label: 'Incompatible (Diesel Swell)', reason: 'Light diesel fuel causes swelling and softening of Aflas®', maxTempF: 220, exposureGuideline: 'Not recommended' };
  } else if (oilFraction > 25) {
    aflas = { rating: 'caution', label: 'Caution (Conditional)', reason: 'Base oil hydrocarbons may cause slight volume swell', maxTempF: 250, exposureGuideline: '< 48 hours' };
  } else if (isHighPh) {
    aflas = { rating: 'compatible', label: 'Compatible', reason: 'Prime seal material for high-pH and amine systems', maxTempF: 450, exposureGuideline: 'Continuous' };
  } else {
    aflas = { rating: 'compatible', label: 'Compatible', reason: 'Excellent resistance to brines, steam, and sour gas', maxTempF: 450, exposureGuideline: 'Continuous' };
  }

  return { nbr, hnbr, fkm, ffkm, aflas };
}

/**
 * Checks if a fluid meets a specific elastomer compatibility threshold.
 */
export function isFluidCompatibleWithElastomer(
  fluid: CompatibleFluidInput,
  elastomer: BhaElastomerType,
  strictMode: boolean = false
): boolean {
  const compat = getFluidElastomerCompatibility(fluid);
  const detail = compat[elastomer];
  if (!detail) return true;

  if (strictMode) {
    return detail.rating === 'compatible';
  }
  return detail.rating === 'compatible' || detail.rating === 'caution';
}
