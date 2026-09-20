export type CasingSectionType = 
  | 'conductor'
  | 'surface'
  | 'intermediate'
  | 'production_casing'
  | 'liner'
  | 'tubing'
  | 'open_hole';

export interface CasingSection {
  id: string;
  name: string;
  type: CasingSectionType;
  topDepthFt: number;
  bottomDepthFt: number;
  outerDiameterIn: number;
  innerDiameterIn: number;
  driftDiameterIn?: number;
  weightLbFt: number;
  grade: string;
  frictionCoefficient: number;
  burstPressurePsi?: number;
  collapsePressurePsi?: number;
  isCemented?: boolean;
}

export interface CompletionTubingSection {
  id: string;
  name: string;
  topDepthFt: number;
  bottomDepthFt: number;
  outerDiameterIn: number;
  innerDiameterIn: number;
  weightLbFt: number;
  grade: string;
  frictionCoefficient: number;
}

export interface WellboreRestriction {
  id: string;
  name: string;
  depthFt: number;
  minInnerDiameterIn: number;
  type: 'nipple' | 'packer' | 'valve' | 'scale_bridge' | 'fish';
  description?: string;
}

export interface PerforatedInterval {
  id: string;
  formationName: string;
  topDepthFt: number;
  bottomDepthFt: number;
  shotsPerFoot: number;
  phaseDeg: number;
  reservoirPressurePsi: number;
  inflowFluidType: 'gas' | 'oil' | 'water' | 'multiphase';
}

export interface WellboreProfile {
  id: string;
  wellName: string;
  field: string;
  operator: string;
  apiWellNumber?: string;
  wellheadPressurePsi: number;
  bottomholePressurePsi: number;
  surfaceTemperatureF: number;
  bottomholeTemperatureF: number;
  fluidLevelFromSurfaceFt: number;
  wellboreFluidDensityPpg: number;
  wellboreFluidType: string;
  totalDepthMdFt: number;
  totalDepthTvdFt: number;
  packerDepthFt: number;
  sssvDepthFt?: number;
  casingSections: CasingSection[];
  tubingSections?: CompletionTubingSection[];
  perforations: PerforatedInterval[];
  restrictions?: WellboreRestriction[];
}
