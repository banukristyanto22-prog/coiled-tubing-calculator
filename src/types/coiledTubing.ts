export type UnitSystem = 'imperial' | 'metric';

export type TubingGrade = 'CT70' | 'CT80' | 'CT90' | 'CT100' | 'CT110';

export type AchillesMaterialGrade = 'QT-700' | 'QT-800' | 'QT-900' | 'QT-1000' | 'QT-1200' | 'HS-90' | 'HS-110';

export interface LcfMaterialParameters {
  grade: AchillesMaterialGrade;
  syNomKsi: number;
  eKsi: number;
  kPrimeKsi: number;
  nPrime: number;
  initiation: {
    sigmaFPrimeKsi: number;
    b: number;
    epsilonFPrime: number;
    c: number;
  };
  fracture: {
    sigmaFPrimeKsi: number;
    b: number;
    epsilonFPrime: number;
    c: number;
  };
  tf: number; // Tubing Factor
  pefBases: {
    pts: number;
    deltaEpsXMax: number;
    sigmaHSyMin: number;
    deltaEpsXMin: number;
    sigmaHSyMax: number;
  };
}

export interface AchillesBendingEvent {
  id: number;
  name: string;
  stage: 'RIH' | 'POOH';
  description: string;
  bendingRadiusIn: number;
  deltaEpsilonXPercent: number; // (D - t)/(2R) * 100
  effectiveStrainAmpPercent: number;
  cyclesToFailure2N: number; // 2N cycles to failure for this event
  eventDamagePercent: number; // 1 / (2N) * 100
}

export interface AchillesFatigueResult {
  selectedGrade: AchillesMaterialGrade;
  materialParams: LcfMaterialParameters;
  failureCriterion: 'initiation' | 'fracture';
  internalPressurePsi: number;
  tripsRun: number;
  reelRadiusIn: number;
  gooseneckRadiusIn: number;
  // Bending strain
  deltaEpsXReelPercent: number;
  deltaEpsXGooseneckPercent: number;
  hoopStressPsi: number;
  hoopStressRatio: number; // sigma_h / Sy
  // 6 Events Breakdown
  events: AchillesBendingEvent[];
  tripDamagePercent: number;
  estimatedTotalTripCycles: number;
  accumulatedUsedLifePercent: number;
  remainingTrips: number;
  // Extrapolation Factors (Table 2)
  pefrPercent: number; // Radius Extrapolation Factor
  pefpPercent: number; // Pressure Extrapolation Factor
  isExtrapolated: boolean;
  // Tipton Eq 8, 10, 11 Ballooning & Wall Thinning
  hoopStrainRatePerTrip: number;
  accumulatedHoopStrainPercent: number;
  grownDiameterIn: number;
  ballooningGrowthEstimatedIn: number;
  thinnedWallIn: number;
  wallThinningPercent: number;
  // Welds derating comparison
  biasWeldLifeTrips: number;
  orbitalButtWeldLifeTrips: number;
  manualButtWeldLifeTrips: number;
}

export interface StripSegment {
  id: string;
  stripNo: string;
  wallThicknessIn: number;
  lengthM: number;
  lengthFt: number;
  biasWeldLocationM: number;
  biasWeldLocationFt: number;
  heatNumber: string;
  yieldStrengthMpa: number;
  tensileStrengthMpa: number;
}

export type CorrosionPittingGrade = 'none' | 'light' | 'moderate' | 'severe';
export type WorkingWeldType = 'none' | 'bias' | 'orbital' | 'manual';

export interface UsedCondition {
  enabled: boolean; // false = Nominal / Factory New, true = Used / Real Situation Active
  wallLossPercent: number; // 0% to 20% (API RP 5C7 retirement threshold is 20% wall loss, i.e., 80% remaining wall)
  diametralGrowthPercent: number; // % ballooning OD growth (e.g. 0.0% to 3.5%)
  actualOvalityPercent: number; // field cross-sectional ovality % (e.g. 0.8% to 5.0%)
  fatigueLifeUsedPercent: number; // accumulated cycle life consumed % (e.g. 0% to 80%)
  corrosionPittingGrade: CorrosionPittingGrade; // 'none' | 'light' | 'moderate' | 'severe'
  hasWeldInSection: boolean; // whether a weld joint is present in the working active section
  weldType: WorkingWeldType; // 'none' | 'bias' | 'orbital' | 'manual'
  weldEfficiencyFactor: number; // e.g. 1.0 (seamless/base), 0.90 (bias weld), 0.80 (orbital weld)
  h2sExposure: boolean; // Sour service H2S exposure derating
  notes?: string;
}

export interface CoiledTubingString {
  name: string;
  grade: TubingGrade;
  outerDiameterIn: number; // inches
  wallThicknessIn: number; // inches
  totalLengthFt: number; // ft
  yieldStrengthPsi: number; // psi
  tensileStrengthPsi: number; // psi
  specifiedMinYieldPsi: number; // psi
  youngsModulusPsi: number; // psi
  steelDensityLbfCuIn: number; // lb/in³
  ovalityPercent: number; // %
  wallVariationPercent: number; // %
  reelCoreDiameterIn: number;
  reelFlangeDiameterIn: number;
  reelWidthIn: number;
  gooseneckRadiusIn: number;
  usedCondition?: UsedCondition; // Real-world field used condition state
  // Test certificate / MTR reference if applicable
  certificateRef?: {
    manufacturer: string;
    product: string;
    stringNo: string;
    shaftNo: string;
    reportNo: string;
    specStandard: string;
    hydrotestMpa: number;
    hydrotestPsi: number;
    hydrotestDurationMin: number;
    hardnessHrc: number;
    grainSize: number;
    segments: StripSegment[];
  };
}

export interface HydraulicsInput {
  flowRateGpm: number;
  fluidType: string;
  fluidDensityPpg: number;
  fluidViscosityCp: number;
  frictionReductionPercent?: number;
  nozzleDiameterIn: number;
  nozzleCount: number;
  nozzleCd: number;
  casingInnerDiameterIn: number;
  wellboreDepthFt: number;
  pumpSurfacePressurePsi: number;
}

export interface WellboreSurveyStation {
  id: string;
  measuredDepthFt: number;
  trueVerticalDepthFt: number;
  inclinationDeg: number;
  azimuthDeg?: number;
  doglegSeverityDegPer100ft?: number;
  horizontalDisplacementFt?: number;
  description?: string;
}

export type GeometryProfileType = 'constant' | 'custom_survey';

export type BhaToolType =
  | 'motor'
  | 'collar'
  | 'jar'
  | 'agitator'
  | 'tractor'
  | 'logging'
  | 'valve'
  | 'nozzle_bit'
  | 'connector'
  | 'custom';

export interface BhaSegment {
  id: string;
  name: string;
  type: BhaToolType;
  lengthFt: number;
  outerDiameterIn: number;
  innerDiameterIn: number;
  linearWeightLbFt?: number; // Optional manual override, otherwise computed from OD/ID and steel density
  color?: string; // Optional aesthetic color tag for schematic
  description?: string;
}

export interface BhaConfiguration {
  enabled: boolean;
  name?: string;
  segments: BhaSegment[];
}

export interface BhaSummaryMetrics {
  totalLengthFt: number;
  totalLengthM: number;
  totalAirWeightLbs: number;
  totalAirWeightKg: number;
  totalBuoyedWeightLbs: number;
  totalBuoyedWeightKg: number;
  avgOuterDiameterIn: number;
  maxOuterDiameterIn: number;
  effectiveStiffnessEi: number; // psi * in^4 (Bending stiffness E * I)
  stiffnessRatioVsCt: number; // Factor relative to CT string stiffness
  bhaSinusoidalBucklingLbf: number; // Dawson-Paslay sinusoidal buckling capacity of BHA
  bhaHelicalBucklingLbf: number; // Helical buckling limit of BHA
  addedSurfaceWeightLbf: number; // Buoyant weight added at bit/end of string
  addedSurfaceDragLbf: number; // Extra normal friction drag caused by BHA
  radialClearanceIn: number; // Radial clearance inside casing for the largest BHA OD
}

export interface WellboreForcesInput {
  measuredDepthFt: number;
  trueVerticalDepthFt: number;
  wellboreInclinationDeg: number;
  casingInnerDiameterIn: number;
  wellboreFluidDensityPpg: number;
  frictionCoefficientCasing: number;
  frictionCoefficientOpenHole: number;
  surfaceOverpullLimitLbf: number;
  appliedInjectorSnubbingLbf: number;
  appliedInjectorTensionLbf: number;
  geometryMode?: GeometryProfileType;
  surveyStations?: WellboreSurveyStation[];
  bhaConfig?: BhaConfiguration;
}

export interface WorkingPoint {
  differentialPressurePsi: number; // Pi - Po
  axialTensionLbf: number; // Positive = tension, negative = compression
}

export type OperationCategory =
  | 'cleanout'
  | 'nitrogen_kickoff'
  | 'acid_stimulation'
  | 'milling'
  | 'fishing'
  | 'velocity_string'
  | 'logging'
  | 'pressure_pumping'
  | 'other';

export interface FatigueOperationRecord {
  id: string;
  date: string;
  wellName: string;
  category: OperationCategory;
  description?: string;
  maxDepthFt: number;
  maxDepthM: number;
  circulatingPressurePsi: number;
  circulatingPressureBar: number;
  trips: number;
  reciprocations: number;
  bendingCycles: number; // 6 * trips + 4 * reciprocations
  fatigueUnitsConsumed: number; // Delta FU (% of string life)
  cumulativeFatigueUnits: number; // Cumulative FU after this operation
  cumulativeBendingCycles: number;
  notes?: string;
}

export type CalculationTabSource =
  | 'specs'
  | 'envelope'
  | 'hydraulics'
  | 'forces'
  | 'reel'
  | 'fatigue'
  | 'sensitivity'
  | 'manual';

export interface CalculationMetricsSummary {
  outerDiameterIn: number;
  wallThicknessIn: number;
  innerDiameterIn: number;
  yieldStrengthPsi: number;
  totalLengthFt: number;
  weightInAirLbFt: number;
  totalWeightLbs: number;
  totalCapacityBbl: number;
  dtRatio: number;
  
  // Mechanical limits
  apiBurstPressurePsi: number;
  collapsePressurePsi: number;
  tensileYieldLbf: number;
  safeOverpullLbf: number;
  
  // Fatigue estimates (Achilles 4.0 at standard pressure)
  estimatedFatigueLifeTrips?: number;
  tripDamagePercent?: number;

  // Additional context
  operatingPressurePsi?: number;
  operatingTensionLbf?: number;
}

export interface FieldFatigueStep {
  id: string;
  startFt: number;
  endFt: number;
  bendingPct: number;
  h2sPct: number;
  estFatiguePct: number;
  zoneName?: string;
  notes?: string;

  // Real-world field operation parameters
  fluidType?: string;              // e.g. "Water", "15% HCl Acid", "N2 Foam", "Brine"
  circulatingPressurePsi?: number; // Circulating / Pumping pressure (psi)
  wellheadPressurePsi?: number;    // Wellhead pressure WHP (psi)
  hookloadWeightLbs?: number;      // Hookload / Tubing weight (lbs)
  pumpRateBpm?: number;            // Liquid pump rate (bpm)
  n2RateScfm?: number;             // Nitrogen gas rate (scfm)
}

export interface FieldJointData {
  id: string;
  locationFt: number;
  stripNo: string;
  wallThicknessIn: number;
  heatNumber: string;
  jointFactor: number;
  overrideJointFatiguePct?: number;
}

export interface FieldFatigueDataset {
  stringNo: string;
  source: 'model' | 'field';
  updatedAt: string;
  fileName?: string;
  steps: FieldFatigueStep[];
  joints: FieldJointData[];
  notes?: string;
}

export interface CalculationHistoryEntry {
  id: string;
  timestamp: string; // ISO string
  displayTime: string; // Formatted time
  title: string;
  sourceTab: CalculationTabSource;
  stringSnapshot: CoiledTubingString;
  metrics: CalculationMetricsSummary;
  notes?: string;
  isBookmarked?: boolean;
}

export interface TfaDataPoint {
  depthM: number;
  depthFt: number;
  expectedPohLbf: number;
  expectedRihLbf: number;
  oplimPohLbf?: number;
  oplimRihLbf?: number;
  frictionLockRihLbf?: number;
  eWeightLbf?: number; // Actual measured weight
  operation?: 'RIH' | 'POH' | 'WIPER' | 'TAG_BOTTOM' | 'STATIC';
  speedMPerMin?: number;
}

export interface TfaChartConfig {
  wellName: string;
  weightOffsetLbf: number;
  reelDepthOffsetM: number;
  injDepthOffsetFt: number;
  frictionCasing: number;
  frictionOpenHole: number;
  whpPsi: number;
  fluidDensityPpg: number;
}

