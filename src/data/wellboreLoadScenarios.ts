import { WellboreForcesInput, WellboreSurveyStation } from '../types/coiledTubing';
import { WellboreProfile } from '../types/wellbore';
import { BHA_PRESETS } from './bhaPresets';
import { SURVEY_PRESET_COLLECTION, DEFAULT_SURVEY_STATIONS, DEFAULT_FORCES } from './presets';

export type LoadScenarioId =
  | 'normal_run'
  | 'stuck_pipe'
  | 'high_drag'
  | 'hp_snubbing'
  | 'heavy_milling'
  | 'extended_reach';

export interface WellboreLoadScenario {
  id: LoadScenarioId;
  name: string;
  tagline: string;
  category: 'operational' | 'contingency' | 'critical_limit';
  badge: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    ring: string;
  };
  description: string;
  forcesInput: WellboreForcesInput;
  wellboreProfileOverrides?: Partial<WellboreProfile>;
  surfaceEquipment?: {
    stripperFrictionLbf: number;
    wellheadPressurePsi: number;
    includeWellheadPressure: boolean;
  };
  expectedOutcomes: {
    hookloadSummary: string;
    stressProfile: string;
    lockupState: 'none' | 'moderate' | 'high' | 'imminent_lockup';
    operationalRisk: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
  };
  keyVariablesList: {
    label: string;
    valueImperial: string;
    valueMetric: string;
    highlight?: boolean;
    danger?: boolean;
  }[];
  engineeringNotes: string;
}

export const WELLBORE_LOAD_SCENARIOS: Record<LoadScenarioId, WellboreLoadScenario> = {
  normal_run: {
    id: 'normal_run',
    name: 'Normal Run',
    tagline: 'Standard cleanout and ingress run with baseline friction',
    category: 'operational',
    badge: 'Operational Baseline',
    badgeColor: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      ring: 'ring-emerald-500/40',
    },
    description:
      'Standard coiled tubing cleanout run in casing with clean fluid (8.6 ppg) and standard friction factor (μ = 0.24). Stresses remain well within the 60% von Mises elastic envelope with ample margins before buckling.',
    forcesInput: {
      measuredDepthFt: 13500,
      trueVerticalDepthFt: 9500,
      wellboreInclinationDeg: 45,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 8.6,
      frictionCoefficientCasing: 0.24,
      frictionCoefficientOpenHole: 0.35,
      surfaceOverpullLimitLbf: 22000,
      appliedInjectorSnubbingLbf: 2500,
      appliedInjectorTensionLbf: 16000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.j_build_and_hold?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 1400,
      wellheadPressurePsi: 250,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Balanced hookloads: Slack-off ~14-18 klbf, Pick-up ~28-34 klbf with ~4 klbf drag',
      stressProfile: 'Triaxial von Mises stress < 45% SMYS; safe elastic region along full string',
      lockupState: 'none',
      operationalRisk: 'Low',
    },
    keyVariablesList: [
      { label: 'Friction Coeff. (μ)', valueImperial: '0.24', valueMetric: '0.24' },
      { label: 'Fluid Density', valueImperial: '8.6 ppg', valueMetric: '1.03 SG' },
      { label: 'Target Depth', valueImperial: '13,500 ft MD', valueMetric: '4,115 m MD' },
      { label: 'Overpull Limit', valueImperial: '22,000 lbf', valueMetric: '98 kN' },
      { label: 'Applied Tension', valueImperial: '16,000 lbf', valueMetric: '71 kN' },
      { label: 'Snubbing Force', valueImperial: '2,500 lbf', valueMetric: '11 kN' },
    ],
    engineeringNotes:
      'API RP 5C7 standard cleanout baseline. Used to verify normal operations, check circulation pressure, and calibrate hydraulic models before aggressive operations.',
  },

  stuck_pipe: {
    id: 'stuck_pipe',
    name: 'Stuck Pipe',
    tagline: 'Mechanical/differential sticking with maximum tensile overpull testing yield limits',
    category: 'critical_limit',
    badge: 'Critical Contingency',
    badgeColor: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      ring: 'ring-rose-500/40',
    },
    description:
      'Simulates BHA mechanically jammed or differentially stuck near TD (14,800 ft). Applied surface tension is increased to 44,000 lbf with an elevated 48,000 lbf overpull limit to stress-test string tensile limits and calculate remaining yield margin.',
    forcesInput: {
      measuredDepthFt: 14800,
      trueVerticalDepthFt: 9975,
      wellboreInclinationDeg: 65,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 10.2,
      frictionCoefficientCasing: 0.38,
      frictionCoefficientOpenHole: 0.50,
      surfaceOverpullLimitLbf: 48000,
      appliedInjectorSnubbingLbf: 1500,
      appliedInjectorTensionLbf: 44000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.deep_slanted?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.motor_milling?.config || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 1800,
      wellheadPressurePsi: 500,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Extreme pick-up hookload (> 55-65 klbf); total wellbore drag exceeds 18 klbf; zero RIH progress',
      stressProfile: 'Peak tensile axial stress approaching 85-92% SMYS near surface; elevated triaxial von Mises envelope',
      lockupState: 'none',
      operationalRisk: 'Critical',
    },
    keyVariablesList: [
      { label: 'Friction Coeff. (μ)', valueImperial: '0.38', valueMetric: '0.38', highlight: true },
      { label: 'Fluid Density', valueImperial: '10.2 ppg', valueMetric: '1.22 SG' },
      { label: 'Target Depth', valueImperial: '14,800 ft MD', valueMetric: '4,511 m MD' },
      { label: 'Overpull Limit', valueImperial: '48,000 lbf', valueMetric: '214 kN', danger: true },
      { label: 'Applied Tension', valueImperial: '44,000 lbf', valueMetric: '196 kN', danger: true },
      { label: 'Snubbing Force', valueImperial: '1,500 lbf', valueMetric: '6.7 kN' },
    ],
    engineeringNotes:
      'Exceeding 80% of CT string tensile yield during overpull can induce localized plastic elongation and permanent ballooning. Verify safe overpull limits on Injector Summary Card before jarring.',
  },

  high_drag: {
    id: 'high_drag',
    name: 'High Drag',
    tagline: 'Severe tortuosity and friction triggering helical buckling lockup in horizontal lateral',
    category: 'critical_limit',
    badge: 'Lockup Risk Warning',
    badgeColor: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      ring: 'ring-amber-500/40',
    },
    description:
      'Models high friction (μ = 0.48) in an extended reach lateral well filled with heavy cuttings-laden mud (11.8 ppg). Compressive forces during RIH exceed Dawson-Paslay and Wu helical buckling thresholds, causing complete helical lockup.',
    forcesInput: {
      measuredDepthFt: 16500,
      trueVerticalDepthFt: 8440,
      wellboreInclinationDeg: 90,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 11.8,
      frictionCoefficientCasing: 0.48,
      frictionCoefficientOpenHole: 0.55,
      surfaceOverpullLimitLbf: 32000,
      appliedInjectorSnubbingLbf: 8500,
      appliedInjectorTensionLbf: 24000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.horizontal_erd?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.heavy_weight?.config || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 1600,
      wellheadPressurePsi: 350,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Slack-off weight drops to zero; injector must apply 8,500 lbf snubbing thrust to advance string',
      stressProfile: 'High compressive stress & severe contact normal forces against casing wall in heel curve',
      lockupState: 'imminent_lockup',
      operationalRisk: 'Elevated',
    },
    keyVariablesList: [
      { label: 'Friction Coeff. (μ)', valueImperial: '0.48', valueMetric: '0.48', danger: true },
      { label: 'Fluid Density', valueImperial: '11.8 ppg', valueMetric: '1.41 SG', highlight: true },
      { label: 'Target Depth', valueImperial: '16,500 ft MD', valueMetric: '5,029 m MD' },
      { label: 'Overpull Limit', valueImperial: '32,000 lbf', valueMetric: '142 kN' },
      { label: 'Applied Tension', valueImperial: '24,000 lbf', valueMetric: '107 kN' },
      { label: 'Snubbing Force', valueImperial: '8,500 lbf', valueMetric: '37.8 kN', highlight: true },
    ],
    engineeringNotes:
      'Helical lockup occurs when additional downward force from the injector generates normal contact force and friction equal to or greater than the push force. Fluid friction reducer or downhole tractor is required to advance.',
  },

  hp_snubbing: {
    id: 'hp_snubbing',
    name: 'HP Snubbing',
    tagline: 'Live well intervention with 3,500 psi wellhead pressure requiring active hydraulic snubbing',
    category: 'contingency',
    badge: 'Underbalanced Snubbing',
    badgeColor: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      ring: 'ring-purple-500/40',
    },
    description:
      'Simulates live gas well intervention with 3,500 psi surface wellhead pressure and light fluid (7.2 ppg). Pressure upthrust force pushes the tubing upward out of the wellhead, requiring 13,500 lbf downward snubbing thrust from the injector chains.',
    forcesInput: {
      measuredDepthFt: 11000,
      trueVerticalDepthFt: 7800,
      wellboreInclinationDeg: 35,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 7.2,
      frictionCoefficientCasing: 0.20,
      frictionCoefficientOpenHole: 0.30,
      surfaceOverpullLimitLbf: 25000,
      appliedInjectorSnubbingLbf: 13500,
      appliedInjectorTensionLbf: 15000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.j_build_and_hold?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 2200,
      wellheadPressurePsi: 3500,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Pipe-light condition at surface: net downward injector force required until balance depth (~4,200 ft)',
      stressProfile: 'High compressive axial stress in upper vertical section; significant hoop stress from pressure differential',
      lockupState: 'moderate',
      operationalRisk: 'Elevated',
    },
    keyVariablesList: [
      { label: 'Wellhead Press.', valueImperial: '3,500 psi', valueMetric: '241 bar', highlight: true },
      { label: 'Fluid Density', valueImperial: '7.2 ppg', valueMetric: '0.86 SG' },
      { label: 'Snubbing Force', valueImperial: '13,500 lbf', valueMetric: '60 kN', danger: true },
      { label: 'Stripper Drag', valueImperial: '2,200 lbf', valueMetric: '9.8 kN' },
      { label: 'Target Depth', valueImperial: '11,000 ft MD', valueMetric: '3,353 m MD' },
      { label: 'Overpull Limit', valueImperial: '25,000 lbf', valueMetric: '111 kN' },
    ],
    engineeringNotes:
      'Tubing is in compression above the neutral point. Ensure injector skate chain pressure and guide arch tensioners are locked down to prevent buckling between injector chains and stripper bushing.',
  },

  heavy_milling: {
    id: 'heavy_milling',
    name: 'Heavy Milling',
    tagline: 'High weight-on-bit (WOB) milling with positive displacement motor reactive torque',
    category: 'operational',
    badge: 'Hard Scale Milling',
    badgeColor: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      ring: 'ring-cyan-500/40',
    },
    description:
      'Simulates hard scale or composite bridge plug milling using a 2-7/8" PDM mud motor. High weight-on-bit (3,800 lbf WOB) creates compressive loading in the bottom 300 ft of the CT string directly above the motor.',
    forcesInput: {
      measuredDepthFt: 13800,
      trueVerticalDepthFt: 9200,
      wellboreInclinationDeg: 60,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 9.4,
      frictionCoefficientCasing: 0.28,
      frictionCoefficientOpenHole: 0.38,
      surfaceOverpullLimitLbf: 28000,
      appliedInjectorSnubbingLbf: 4500,
      appliedInjectorTensionLbf: 20000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.deep_slanted?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.motor_milling?.config || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 1500,
      wellheadPressurePsi: 600,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Slack-off weight noticeably reduced at TD due to 3,800 lbf WOB transfer to the bit face',
      stressProfile: 'Combined axial compression, torsional shear, and cyclic bending above motor assembly',
      lockupState: 'none',
      operationalRisk: 'Moderate',
    },
    keyVariablesList: [
      { label: 'Friction Coeff. (μ)', valueImperial: '0.28', valueMetric: '0.28' },
      { label: 'Fluid Density', valueImperial: '9.4 ppg', valueMetric: '1.13 SG' },
      { label: 'Target Depth', valueImperial: '13,800 ft MD', valueMetric: '4,206 m MD' },
      { label: 'Overpull Limit', valueImperial: '28,000 lbf', valueMetric: '125 kN' },
      { label: 'Applied Tension', valueImperial: '20,000 lbf', valueMetric: '89 kN' },
      { label: 'Snubbing Force', valueImperial: '4,500 lbf', valueMetric: '20 kN' },
    ],
    engineeringNotes:
      'Motor stall induces instantaneous reactive torque and axial shock. Keep WOB below critical helical buckling load in the lower BHA section to avoid motor housing stall-out.',
  },

  extended_reach: {
    id: 'extended_reach',
    name: 'Extended Reach',
    tagline: 'Deep 6,500 ft horizontal lateral testing friction limits and downhole tractor assist',
    category: 'contingency',
    badge: 'Extended Reach Lateral',
    badgeColor: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      ring: 'ring-blue-500/40',
    },
    description:
      'Long-displacement horizontal well reaching 18,000 ft MD with 6,500 ft lateral at 90° inclination. Tests cumulative normal force friction accumulation and evaluates tractor pull requirement to reach toe.',
    forcesInput: {
      measuredDepthFt: 18000,
      trueVerticalDepthFt: 8440,
      wellboreInclinationDeg: 90,
      casingInnerDiameterIn: 4.892,
      wellboreFluidDensityPpg: 9.6,
      frictionCoefficientCasing: 0.32,
      frictionCoefficientOpenHole: 0.42,
      surfaceOverpullLimitLbf: 34000,
      appliedInjectorSnubbingLbf: 6000,
      appliedInjectorTensionLbf: 22000,
      geometryMode: 'custom_survey',
      surveyStations: SURVEY_PRESET_COLLECTION.horizontal_erd?.stations || DEFAULT_SURVEY_STATIONS,
      bhaConfig: BHA_PRESETS.logging_tractor?.config || BHA_PRESETS.cleanout?.config || DEFAULT_FORCES.bhaConfig,
    },
    surfaceEquipment: {
      stripperFrictionLbf: 1500,
      wellheadPressurePsi: 400,
      includeWellheadPressure: true,
    },
    expectedOutcomes: {
      hookloadSummary: 'Significant drag accumulation: Pick-up > 48 klbf; Slack-off approaches zero near 16,500 ft',
      stressProfile: 'Moderate-high axial tension on POOH; compression build-up on RIH in heel curve',
      lockupState: 'high',
      operationalRisk: 'Elevated',
    },
    keyVariablesList: [
      { label: 'Friction Coeff. (μ)', valueImperial: '0.32', valueMetric: '0.32' },
      { label: 'Fluid Density', valueImperial: '9.6 ppg', valueMetric: '1.15 SG' },
      { label: 'Target Depth', valueImperial: '18,000 ft MD', valueMetric: '5,486 m MD', highlight: true },
      { label: 'Overpull Limit', valueImperial: '34,000 lbf', valueMetric: '151 kN' },
      { label: 'Applied Tension', valueImperial: '22,000 lbf', valueMetric: '98 kN' },
      { label: 'Snubbing Force', valueImperial: '6,000 lbf', valueMetric: '26.7 kN' },
    ],
    engineeringNotes:
      'Cumulative lateral normal forces cause sinusoidal buckling at ~15,200 ft. Downhole robotic tractor provides up to 3,500 lbf axial pulling force to exceed natural CT reach limit.',
  },
};
