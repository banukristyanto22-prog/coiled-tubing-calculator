import { WellboreProfile } from '../types/wellbore';

export const WELLBORE_PRESETS: WellboreProfile[] = [
  {
    id: 'deep_gas_vertical',
    wellName: 'MRJN-764 Deep Gas Producer',
    field: 'Marjan Offshore Field',
    operator: 'Aramco / Joint Operations',
    apiWellNumber: '42-301-88902',
    wellheadPressurePsi: 1450,
    bottomholePressurePsi: 6850,
    surfaceTemperatureF: 85,
    bottomholeTemperatureF: 245,
    fluidLevelFromSurfaceFt: 0,
    wellboreFluidDensityPpg: 8.8,
    wellboreFluidType: 'Treated 2% KCl Brine with Corrosion Inhibitor',
    totalDepthMdFt: 14500,
    totalDepthTvdFt: 14200,
    packerDepthFt: 12200,
    sssvDepthFt: 850,
    casingSections: [
      {
        id: 'csg-1',
        name: 'Conductor Casing 20"',
        type: 'conductor',
        topDepthFt: 0,
        bottomDepthFt: 350,
        outerDiameterIn: 20.0,
        innerDiameterIn: 19.124,
        driftDiameterIn: 18.936,
        weightLbFt: 94.0,
        grade: 'K-55',
        frictionCoefficient: 0.28,
        isCemented: true
      },
      {
        id: 'csg-2',
        name: 'Surface Casing 13-3/8"',
        type: 'surface',
        topDepthFt: 0,
        bottomDepthFt: 3200,
        outerDiameterIn: 13.375,
        innerDiameterIn: 12.415,
        driftDiameterIn: 12.259,
        weightLbFt: 68.0,
        grade: 'L-80',
        frictionCoefficient: 0.25,
        isCemented: true
      },
      {
        id: 'csg-3',
        name: 'Intermediate Casing 9-5/8"',
        type: 'intermediate',
        topDepthFt: 0,
        bottomDepthFt: 9400,
        outerDiameterIn: 9.625,
        innerDiameterIn: 8.681,
        driftDiameterIn: 8.525,
        weightLbFt: 47.0,
        grade: 'P-110',
        frictionCoefficient: 0.24,
        isCemented: true
      },
      {
        id: 'csg-4',
        name: 'Production Casing 7"',
        type: 'production_casing',
        topDepthFt: 0,
        bottomDepthFt: 12600,
        outerDiameterIn: 7.0,
        innerDiameterIn: 6.094,
        driftDiameterIn: 5.969,
        weightLbFt: 29.0,
        grade: 'P-110 IC',
        frictionCoefficient: 0.23,
        isCemented: true
      },
      {
        id: 'csg-5',
        name: 'Drilled Production Liner 4-1/2"',
        type: 'liner',
        topDepthFt: 12100,
        bottomDepthFt: 14100,
        outerDiameterIn: 4.5,
        innerDiameterIn: 3.826,
        driftDiameterIn: 3.701,
        weightLbFt: 15.1,
        grade: 'Q-125',
        frictionCoefficient: 0.25,
        isCemented: true
      },
      {
        id: 'csg-6',
        name: 'Open Hole Payzone 3-7/8"',
        type: 'open_hole',
        topDepthFt: 14100,
        bottomDepthFt: 14500,
        outerDiameterIn: 3.875,
        innerDiameterIn: 3.875,
        driftDiameterIn: 3.875,
        weightLbFt: 0,
        grade: 'Open Hole Carbonate',
        frictionCoefficient: 0.35,
        isCemented: false
      }
    ],
    tubingSections: [
      {
        id: 'tb-1',
        name: 'Production Tubing 3-1/2"',
        topDepthFt: 0,
        bottomDepthFt: 12200,
        outerDiameterIn: 3.5,
        innerDiameterIn: 2.992,
        weightLbFt: 9.3,
        grade: '13Cr-L80',
        frictionCoefficient: 0.22
      }
    ],
    perforations: [
      {
        id: 'perf-1',
        formationName: 'Arab-D Upper Reservoir',
        topDepthFt: 12850,
        bottomDepthFt: 13120,
        shotsPerFoot: 6,
        phaseDeg: 60,
        reservoirPressurePsi: 6400,
        inflowFluidType: 'gas'
      },
      {
        id: 'perf-2',
        formationName: 'Arab-D Main Gas Pay',
        topDepthFt: 13350,
        bottomDepthFt: 13780,
        shotsPerFoot: 6,
        phaseDeg: 60,
        reservoirPressurePsi: 6750,
        inflowFluidType: 'gas'
      }
    ],
    restrictions: [
      {
        id: 'rest-1',
        name: 'Subsurface Safety Valve (SSSV)',
        depthFt: 850,
        minInnerDiameterIn: 2.813,
        type: 'valve',
        description: 'Tubing Retrievable SSSV flapper profile'
      },
      {
        id: 'rest-2',
        name: 'Production Packer Bore',
        depthFt: 12200,
        minInnerDiameterIn: 2.750,
        type: 'packer',
        description: 'Permanent Sealbore Production Packer'
      },
      {
        id: 'rest-3',
        name: 'Landing Nipple (XN)',
        depthFt: 12250,
        minInnerDiameterIn: 2.313,
        type: 'nipple',
        description: 'Type XN selective landing nipple'
      }
    ]
  },
  {
    id: 'horizontal_shale_lateral',
    wellName: 'WOLF-HORIZON 104H',
    field: 'Permian Midland Basin',
    operator: 'Pioneer / ExxonMobil',
    apiWellNumber: '42-383-42109',
    wellheadPressurePsi: 650,
    bottomholePressurePsi: 5200,
    surfaceTemperatureF: 75,
    bottomholeTemperatureF: 195,
    fluidLevelFromSurfaceFt: 0,
    wellboreFluidDensityPpg: 9.3,
    wellboreFluidType: 'Fresh Water with Friction Reducer Pill',
    totalDepthMdFt: 21500,
    totalDepthTvdFt: 9800,
    packerDepthFt: 9600,
    sssvDepthFt: 600,
    casingSections: [
      {
        id: 'csg-1',
        name: 'Surface Casing 9-5/8"',
        type: 'surface',
        topDepthFt: 0,
        bottomDepthFt: 2400,
        outerDiameterIn: 9.625,
        innerDiameterIn: 8.921,
        weightLbFt: 36.0,
        grade: 'J-55',
        frictionCoefficient: 0.25,
        isCemented: true
      },
      {
        id: 'csg-2',
        name: 'Production Casing 5-1/2" Long String',
        type: 'production_casing',
        topDepthFt: 0,
        bottomDepthFt: 21500,
        outerDiameterIn: 5.5,
        innerDiameterIn: 4.778,
        driftDiameterIn: 4.653,
        weightLbFt: 20.0,
        grade: 'P-110 HC',
        frictionCoefficient: 0.28,
        isCemented: true
      }
    ],
    tubingSections: [
      {
        id: 'tb-1',
        name: 'Production Tubing 2-7/8"',
        topDepthFt: 0,
        bottomDepthFt: 9500,
        outerDiameterIn: 2.875,
        innerDiameterIn: 2.441,
        weightLbFt: 6.5,
        grade: 'L-80',
        frictionCoefficient: 0.24
      }
    ],
    perforations: [
      {
        id: 'perf-1',
        formationName: 'Wolfcamp A Lateral Stages (1-45)',
        topDepthFt: 10500,
        bottomDepthFt: 21200,
        shotsPerFoot: 5,
        phaseDeg: 60,
        reservoirPressurePsi: 5100,
        inflowFluidType: 'oil'
      }
    ],
    restrictions: [
      {
        id: 'rest-1',
        name: 'Tubing End / Mule Shoe',
        depthFt: 9500,
        minInnerDiameterIn: 2.441,
        type: 'nipple',
        description: 'Entry guide into casing lateral'
      },
      {
        id: 'rest-2',
        name: 'Proppant Bedding Interval',
        depthFt: 16800,
        minInnerDiameterIn: 4.0,
        type: 'scale_bridge',
        description: 'Settled 100-mesh sand dune requiring high circulation wash'
      }
    ]
  },
  {
    id: 'hpht_acid_well',
    wellName: 'KHUFF-DEEP 09 HPHT',
    field: 'Ghawar Khuff Formation',
    operator: 'National Gas Exploration',
    apiWellNumber: '42-109-77211',
    wellheadPressurePsi: 3800,
    bottomholePressurePsi: 11400,
    surfaceTemperatureF: 95,
    bottomholeTemperatureF: 310,
    fluidLevelFromSurfaceFt: 0,
    wellboreFluidDensityPpg: 10.4,
    wellboreFluidType: 'High-Density Calcium Nitrate Brine (Corrosive HPHT)',
    totalDepthMdFt: 16800,
    totalDepthTvdFt: 16800,
    packerDepthFt: 14800,
    sssvDepthFt: 1200,
    casingSections: [
      {
        id: 'csg-1',
        name: 'Conductor 24"',
        type: 'conductor',
        topDepthFt: 0,
        bottomDepthFt: 450,
        outerDiameterIn: 24.0,
        innerDiameterIn: 23.0,
        weightLbFt: 125.0,
        grade: 'K-55',
        frictionCoefficient: 0.28,
        isCemented: true
      },
      {
        id: 'csg-2',
        name: 'Surface Casing 16"',
        type: 'surface',
        topDepthFt: 0,
        bottomDepthFt: 4200,
        outerDiameterIn: 16.0,
        innerDiameterIn: 15.010,
        weightLbFt: 84.0,
        grade: 'L-80',
        frictionCoefficient: 0.25,
        isCemented: true
      },
      {
        id: 'csg-3',
        name: 'Intermediate Casing 10-3/4"',
        type: 'intermediate',
        topDepthFt: 0,
        bottomDepthFt: 11500,
        outerDiameterIn: 10.75,
        innerDiameterIn: 9.560,
        weightLbFt: 65.7,
        grade: 'P-110 EC',
        frictionCoefficient: 0.24,
        isCemented: true
      },
      {
        id: 'csg-4',
        name: 'Production Casing 7-5/8"',
        type: 'production_casing',
        topDepthFt: 0,
        bottomDepthFt: 15200,
        outerDiameterIn: 7.625,
        innerDiameterIn: 6.625,
        weightLbFt: 39.0,
        grade: 'Q-125 Sour Resistant',
        frictionCoefficient: 0.23,
        isCemented: true
      },
      {
        id: 'csg-5',
        name: 'Slotted Liner 5" Inconel',
        type: 'liner',
        topDepthFt: 14900,
        bottomDepthFt: 16800,
        outerDiameterIn: 5.0,
        innerDiameterIn: 4.276,
        weightLbFt: 18.0,
        grade: 'Inconel 718 / 25Cr',
        frictionCoefficient: 0.26,
        isCemented: false
      }
    ],
    tubingSections: [
      {
        id: 'tb-1',
        name: 'Heavy Wall Production Tubing 4-1/2"',
        topDepthFt: 0,
        bottomDepthFt: 14800,
        outerDiameterIn: 4.5,
        innerDiameterIn: 3.826,
        weightLbFt: 15.1,
        grade: '25Cr Duplex Stainless',
        frictionCoefficient: 0.22
      }
    ],
    perforations: [
      {
        id: 'perf-1',
        formationName: 'Khuff-B Dolomite',
        topDepthFt: 15400,
        bottomDepthFt: 15950,
        shotsPerFoot: 6,
        phaseDeg: 60,
        reservoirPressurePsi: 10800,
        inflowFluidType: 'gas'
      },
      {
        id: 'perf-2',
        formationName: 'Khuff-C High-Pressure Gas',
        topDepthFt: 16100,
        bottomDepthFt: 16750,
        shotsPerFoot: 6,
        phaseDeg: 60,
        reservoirPressurePsi: 11200,
        inflowFluidType: 'gas'
      }
    ],
    restrictions: [
      {
        id: 'rest-1',
        name: 'HPHT Subsurface Safety Valve',
        depthFt: 1200,
        minInnerDiameterIn: 3.688,
        type: 'valve',
        description: '15,000 psi working pressure SSSV'
      },
      {
        id: 'rest-2',
        name: 'HPHT Permanent Production Packer',
        depthFt: 14800,
        minInnerDiameterIn: 3.500,
        type: 'packer',
        description: 'Expansion packer with 15k psi differential rating'
      }
    ]
  }
];

export const getWellborePresetById = (id: string): WellboreProfile => {
  return WELLBORE_PRESETS.find((w) => w.id === id) || WELLBORE_PRESETS[0];
};
