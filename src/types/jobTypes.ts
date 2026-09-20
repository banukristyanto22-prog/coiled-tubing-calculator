export type CoiledTubingJobCategory = 
  | 'cleanout'
  | 'stimulation'
  | 'nitrogen'
  | 'milling'
  | 'mechanical'
  | 'drilling'
  | 'velocity_string';

export type CoiledTubingJobTypeId = 
  | 'nitrogen_lift'
  | 'acidizing_stimulation'
  | 'scale_cleanout'
  | 'sand_jetting'
  | 'fill_cleanout'
  | 'fishing_operation'
  | 'velocity_string'
  | 'well_kill_pumping'
  | 'cement_squeeze'
  | 'logging_conveyance';

export interface CoiledTubingJobType {
  id: CoiledTubingJobTypeId;
  name: string;
  category: CoiledTubingJobCategory;
  description: string;
  typicalPumpPressurePsi: number;
  typicalFluidDensityPpg: number;
  typicalFluidType: string;
  typicalWhpPsi: number;
  recommendedFrictionFactor: number;
  fatigueAccelerationMultiplier: number; // Multiplier vs baseline pure bending (e.g. 1.35x for acidizing under 4,500 psi)
  abrasionWearRatePercentPerJob: number; // Typical wall loss % per job run
  ballooningGrowthThouPerJob: number; // Typical OD growth in thousandths of an inch per job
  corrosionRisk: 'low' | 'moderate' | 'high' | 'severe';
  recommendedElastomers: string;
  typicalTripSpeedFtPerMin: number;
  keyRisks: string[];
  bestPractices: string[];
  recommendedBhaTools: string[];
}

export interface CtJobRunRecord {
  id: string;
  jobNumber: string;
  jobDate: string;
  jobTypeId: CoiledTubingJobTypeId;
  wellName: string;
  maxDepthFt: number;
  maxPressurePsi: number;
  fluidDensityPpg: number;
  tripsCount: number;
  reciprocationCycles: number;
  spooledFootageFt: number;
  accumulatedDeltaFatiguePercent: number;
  measuredWallLossPercent: number;
  measuredBallooningThou: number;
  operatorNotes?: string;
}
