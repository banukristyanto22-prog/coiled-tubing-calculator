// ============================================================================
// API SPEC 5ST MATERIAL GRADE SWEEP SUGGESTIONS & SPECIFICATIONS
// Provides standard yield strength ranges, mill tolerance scatter bands,
// and adjacent grade comparison sweeps for Coiled Tubing sensitivity analysis.
// ============================================================================

export interface ApiGradeSpecification {
  canonicalGrade: 'CT70' | 'CT80' | 'CT90' | 'CT100' | 'CT110' | 'CT120';
  displayName: string;
  smysPsi: number; // Specified Minimum Yield Strength (psi)
  smysKsi: number; // Specified Minimum Yield Strength (ksi)
  smysMpa: number; // Specified Minimum Yield Strength (MPa)
  maxYieldPsi: number; // API 5ST Maximum Allowable Yield (psi)
  maxYieldKsi: number; // (ksi)
  minTensilePsi: number; // API 5ST Minimum Tensile Strength (psi)
  minTensileKsi: number; // (ksi)
  color: string;
  description: string;
  recommendedSweep: {
    startPsi: number;
    endPsi: number;
    stepPsi: number;
    startKsi: number;
    endKsi: number;
    stepKsi: number;
    label: string;
    rationale: string;
  };
  sweepPresets: Array<{
    id: string;
    label: string;
    shortLabel: string;
    startPsi: number;
    endPsi: number;
    stepPsi: number;
    startKsi: number;
    endKsi: number;
    stepKsi: number;
    description: string;
    isPrimary?: boolean;
  }>;
}

export const API_GRADE_SPECIFICATIONS: Record<string, ApiGradeSpecification> = {
  CT70: {
    canonicalGrade: 'CT70',
    displayName: 'API CT70 (QT-700)',
    smysPsi: 70000,
    smysKsi: 70,
    smysMpa: 483,
    maxYieldPsi: 80000,
    maxYieldKsi: 80,
    minTensilePsi: 80000,
    minTensileKsi: 80,
    color: '#38bdf8',
    description: 'Light workover and shallow cleanout standard grade with high ductility and H2S sulfide stress cracking resistance.',
    recommendedSweep: {
      startPsi: 60000,
      endPsi: 110000,
      stepPsi: 10000,
      startKsi: 60,
      endKsi: 110,
      stepKsi: 10,
      label: '60 – 110 ksi',
      rationale: 'Captures CT70 performance with adjacent upgrades (CT80/CT90/CT100) and degraded/derated working margins.',
    },
    sweepPresets: [
      {
        id: 'ct70-recommended',
        label: 'API Suggested (60–110 ksi)',
        shortLabel: '60–110 ksi',
        startPsi: 60000,
        endPsi: 110000,
        stepPsi: 10000,
        startKsi: 60,
        endKsi: 110,
        stepKsi: 10,
        description: 'Standard multi-grade comparison: Derated CT60 through CT110.',
        isPrimary: true,
      },
      {
        id: 'ct70-adjacent',
        label: 'Adjacent Grades (60–100 ksi)',
        shortLabel: '60–100 ksi',
        startPsi: 60000,
        endPsi: 100000,
        stepPsi: 10000,
        startKsi: 60,
        endKsi: 100,
        stepKsi: 10,
        description: 'Shallow workover envelope: CT70 base vs CT80/CT90/CT100.',
      },
      {
        id: 'ct70-heat-scatter',
        label: 'API 5ST Heat Scatter (65–85 ksi)',
        shortLabel: '65–85 ksi',
        startPsi: 65000,
        endPsi: 85000,
        stepPsi: 5000,
        startKsi: 65,
        endKsi: 85,
        stepKsi: 5,
        description: 'Mill certificate scatter band: SMYS 70 ksi to Max Yield 80 ksi.',
      },
      {
        id: 'ct70-full-spectrum',
        label: 'Full API 5ST (60–140 ksi)',
        shortLabel: '60–140 ksi',
        startPsi: 60000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 60,
        endKsi: 140,
        stepKsi: 10,
        description: 'Comprehensive industry envelope from light CT70 to ultra-high CT140.',
      },
    ],
  },

  CT80: {
    canonicalGrade: 'CT80',
    displayName: 'API CT80 (QT-800)',
    smysPsi: 80000,
    smysKsi: 80,
    smysMpa: 552,
    maxYieldPsi: 90000,
    maxYieldKsi: 90,
    minTensilePsi: 88000,
    minTensileKsi: 88,
    color: '#06b6d4',
    description: 'Workhorse workover grade balanced between tensile strength, fatigue cycle life, and sour service compatibility.',
    recommendedSweep: {
      startPsi: 70000,
      endPsi: 120000,
      stepPsi: 10000,
      startKsi: 70,
      endKsi: 120,
      stepKsi: 10,
      label: '70 – 120 ksi',
      rationale: 'Evaluates downgrade to CT70 through upgrade to CT120 with balanced 10 ksi steps.',
    },
    sweepPresets: [
      {
        id: 'ct80-recommended',
        label: 'API Suggested (70–120 ksi)',
        shortLabel: '70–120 ksi',
        startPsi: 70000,
        endPsi: 120000,
        stepPsi: 10000,
        startKsi: 70,
        endKsi: 120,
        stepKsi: 10,
        description: 'Standard CT80 evaluation span covering CT70 to CT120.',
        isPrimary: true,
      },
      {
        id: 'ct80-adjacent',
        label: 'Adjacent Grades (70–110 ksi)',
        shortLabel: '70–110 ksi',
        startPsi: 70000,
        endPsi: 110000,
        stepPsi: 10000,
        startKsi: 70,
        endKsi: 110,
        stepKsi: 10,
        description: 'Focus on conventional workover grades CT70, CT80, CT90, and CT100.',
      },
      {
        id: 'ct80-heat-scatter',
        label: 'API 5ST Heat Scatter (75–95 ksi)',
        shortLabel: '75–95 ksi',
        startPsi: 75000,
        endPsi: 95000,
        stepPsi: 5000,
        startKsi: 75,
        endKsi: 95,
        stepKsi: 5,
        description: 'Mill heat variance between 80 ksi SMYS and 90 ksi API max.',
      },
      {
        id: 'ct80-full-spectrum',
        label: 'Full API 5ST (60–140 ksi)',
        shortLabel: '60–140 ksi',
        startPsi: 60000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 60,
        endKsi: 140,
        stepKsi: 10,
        description: 'Broadest industry span covering all commercial grades.',
      },
    ],
  },

  CT90: {
    canonicalGrade: 'CT90',
    displayName: 'API CT90 (HS-90 / QT-900)',
    smysPsi: 90000,
    smysKsi: 90,
    smysMpa: 621,
    maxYieldPsi: 100000,
    maxYieldKsi: 100,
    minTensilePsi: 97000,
    minTensileKsi: 97,
    color: '#10b981',
    description: 'Premier cleanout and milling grade offering optimal high-pressure burst resistance and deep well overpull capacity.',
    recommendedSweep: {
      startPsi: 70000,
      endPsi: 120000,
      stepPsi: 10000,
      startKsi: 70,
      endKsi: 120,
      stepKsi: 10,
      label: '70 – 120 ksi',
      rationale: 'Standard API Spec 5ST sweep centered around CT90 (90 ksi SMYS), capturing 2 downgrade steps (CT70/80) and 3 upgrade steps (CT100/110/120).',
    },
    sweepPresets: [
      {
        id: 'ct90-recommended',
        label: 'API Suggested (70–120 ksi)',
        shortLabel: '70–120 ksi',
        startPsi: 70000,
        endPsi: 120000,
        stepPsi: 10000,
        startKsi: 70,
        endKsi: 120,
        stepKsi: 10,
        description: 'Recommended standard sweep: 70 to 120 ksi in 10 ksi steps.',
        isPrimary: true,
      },
      {
        id: 'ct90-adjacent',
        label: 'Adjacent Grades (80–130 ksi)',
        shortLabel: '80–130 ksi',
        startPsi: 80000,
        endPsi: 130000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 130,
        stepKsi: 10,
        description: 'Focus on medium-to-high strength strings CT80 through CT130.',
      },
      {
        id: 'ct90-heat-scatter',
        label: 'API 5ST Heat Scatter (85–105 ksi)',
        shortLabel: '85–105 ksi',
        startPsi: 85000,
        endPsi: 105000,
        stepPsi: 5000,
        startKsi: 85,
        endKsi: 105,
        stepKsi: 5,
        description: 'Precision mill scatter: 90 ksi SMYS to 100 ksi API 5ST max limit.',
      },
      {
        id: 'ct90-full-spectrum',
        label: 'Full API 5ST (60–140 ksi)',
        shortLabel: '60–140 ksi',
        startPsi: 60000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 60,
        endKsi: 140,
        stepKsi: 10,
        description: 'Comprehensive industry envelope from light CT60 to ultra-high CT140.',
      },
    ],
  },

  CT100: {
    canonicalGrade: 'CT100',
    displayName: 'API CT100 (QT-1000)',
    smysPsi: 100000,
    smysKsi: 100,
    smysMpa: 689,
    maxYieldPsi: 115000,
    maxYieldKsi: 115,
    minTensilePsi: 108000,
    minTensileKsi: 108,
    color: '#f59e0b',
    description: 'High-strength alloy tailored for deep extended-reach laterals and high differential pressure milling applications.',
    recommendedSweep: {
      startPsi: 80000,
      endPsi: 130000,
      stepPsi: 10000,
      startKsi: 80,
      endKsi: 130,
      stepKsi: 10,
      label: '80 – 130 ksi',
      rationale: 'Centered around CT100 (100 ksi SMYS), capturing CT80/CT90 baselines through CT120/CT130 high-spec alternatives.',
    },
    sweepPresets: [
      {
        id: 'ct100-recommended',
        label: 'API Suggested (80–130 ksi)',
        shortLabel: '80–130 ksi',
        startPsi: 80000,
        endPsi: 130000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 130,
        stepKsi: 10,
        description: 'Standard CT100 evaluation: 80 to 130 ksi with 10 ksi steps.',
        isPrimary: true,
      },
      {
        id: 'ct100-extended',
        label: 'Deep Lateral Span (80–140 ksi)',
        shortLabel: '80–140 ksi',
        startPsi: 80000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 140,
        stepKsi: 10,
        description: 'Extended horizontal reach comparison through CT140.',
      },
      {
        id: 'ct100-heat-scatter',
        label: 'API 5ST Heat Scatter (95–120 ksi)',
        shortLabel: '95–120 ksi',
        startPsi: 95000,
        endPsi: 120000,
        stepPsi: 5000,
        startKsi: 95,
        endKsi: 120,
        stepKsi: 5,
        description: 'Mill variance between 100 ksi SMYS and 115 ksi API 5ST ceiling.',
      },
      {
        id: 'ct100-full-spectrum',
        label: 'Full API 5ST (70–140 ksi)',
        shortLabel: '70–140 ksi',
        startPsi: 70000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 70,
        endKsi: 140,
        stepKsi: 10,
        description: 'Complete comparison across conventional and ultra-high grades.',
      },
    ],
  },

  CT110: {
    canonicalGrade: 'CT110',
    displayName: 'API CT110 (HS-110)',
    smysPsi: 110000,
    smysKsi: 110,
    smysMpa: 758,
    maxYieldPsi: 125000,
    maxYieldKsi: 125,
    minTensilePsi: 118000,
    minTensileKsi: 118,
    color: '#ec4899',
    description: 'Ultra-high strength string engineered for deep shale fracturing, severe overpull margins, and extended multi-lateral sweeps.',
    recommendedSweep: {
      startPsi: 90000,
      endPsi: 140000,
      stepPsi: 10000,
      startKsi: 90,
      endKsi: 140,
      stepKsi: 10,
      label: '90 – 140 ksi',
      rationale: 'Covers CT90 benchmark through CT140 advanced grades for ultra-deep wellbore environments.',
    },
    sweepPresets: [
      {
        id: 'ct110-recommended',
        label: 'API Suggested (90–140 ksi)',
        shortLabel: '90–140 ksi',
        startPsi: 90000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 90,
        endKsi: 140,
        stepKsi: 10,
        description: 'Standard CT110 evaluation: 90 to 140 ksi with 10 ksi steps.',
        isPrimary: true,
      },
      {
        id: 'ct110-deep-reach',
        label: 'Deep Reach Span (80–140 ksi)',
        shortLabel: '80–140 ksi',
        startPsi: 80000,
        endPsi: 140000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 140,
        stepKsi: 10,
        description: 'Benchmarked against conventional CT80/CT90 up to CT140.',
      },
      {
        id: 'ct110-heat-scatter',
        label: 'API 5ST Heat Scatter (105–130 ksi)',
        shortLabel: '105–130 ksi',
        startPsi: 105000,
        endPsi: 130000,
        stepPsi: 5000,
        startKsi: 105,
        endKsi: 130,
        stepKsi: 5,
        description: 'Mill tolerance between 110 ksi SMYS and 125 ksi API 5ST ceiling.',
      },
      {
        id: 'ct110-extended',
        label: 'Extended High Strength (80–150 ksi)',
        shortLabel: '80–150 ksi',
        startPsi: 80000,
        endPsi: 150000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 150,
        stepKsi: 10,
        description: 'Ultra-deep reach envelope spanning up to 150 ksi.',
      },
    ],
  },

  CT120: {
    canonicalGrade: 'CT120',
    displayName: 'API CT120 (QT-1200 / HS-120)',
    smysPsi: 120000,
    smysKsi: 120,
    smysMpa: 827,
    maxYieldPsi: 135000,
    maxYieldKsi: 135,
    minTensilePsi: 128000,
    minTensileKsi: 128,
    color: '#a855f7',
    description: 'Extreme deep horizontal and high-pressure/high-temperature (HPHT) string with maximum burst and tensile limits.',
    recommendedSweep: {
      startPsi: 90000,
      endPsi: 150000,
      stepPsi: 10000,
      startKsi: 90,
      endKsi: 150,
      stepKsi: 10,
      label: '90 – 150 ksi',
      rationale: 'Comprehensive sweep spanning CT90 standard through 150 ksi ultra-high strength alloys.',
    },
    sweepPresets: [
      {
        id: 'ct120-recommended',
        label: 'API Suggested (90–150 ksi)',
        shortLabel: '90–150 ksi',
        startPsi: 90000,
        endPsi: 150000,
        stepPsi: 10000,
        startKsi: 90,
        endKsi: 150,
        stepKsi: 10,
        description: 'Standard CT120 HPHT envelope from 90 to 150 ksi.',
        isPrimary: true,
      },
      {
        id: 'ct120-adjacent',
        label: 'Adjacent Grades (100–150 ksi)',
        shortLabel: '100–150 ksi',
        startPsi: 100000,
        endPsi: 150000,
        stepPsi: 10000,
        startKsi: 100,
        endKsi: 150,
        stepKsi: 10,
        description: 'Comparison with high-strength CT100, CT110, CT120, and CT130.',
      },
      {
        id: 'ct120-heat-scatter',
        label: 'Heat Scatter Band (115–140 ksi)',
        shortLabel: '115–140 ksi',
        startPsi: 115000,
        endPsi: 140000,
        stepPsi: 5000,
        startKsi: 115,
        endKsi: 140,
        stepKsi: 5,
        description: 'Mill tolerance between 120 ksi SMYS and 135 ksi API ceiling.',
      },
      {
        id: 'ct120-extended',
        label: 'Full HPHT Spectrum (80–160 ksi)',
        shortLabel: '80–160 ksi',
        startPsi: 80000,
        endPsi: 160000,
        stepPsi: 10000,
        startKsi: 80,
        endKsi: 160,
        stepKsi: 10,
        description: 'Broadest high-strength evaluation spanning up to 160 ksi.',
      },
    ],
  },
};

/**
 * Normalizes any grade string or nominal yield value to an API canonical grade.
 */
export function normalizeGradeKey(grade?: string, nominalYieldPsi?: number): 'CT70' | 'CT80' | 'CT90' | 'CT100' | 'CT110' | 'CT120' {
  if (grade) {
    const clean = grade.trim().toUpperCase();
    if (clean.includes('70') || clean.includes('700')) return 'CT70';
    if (clean.includes('80') || clean.includes('800')) return 'CT80';
    if (clean.includes('90') || clean.includes('900')) return 'CT90';
    if (clean.includes('100') || clean.includes('1000')) return 'CT100';
    if (clean.includes('110') || clean.includes('1100')) return 'CT110';
    if (clean.includes('120') || clean.includes('1200')) return 'CT120';
  }

  // Fallback to nominal yield strength
  if (nominalYieldPsi && nominalYieldPsi > 0) {
    const ksi = Math.round(nominalYieldPsi / 1000);
    if (ksi <= 75) return 'CT70';
    if (ksi <= 85) return 'CT80';
    if (ksi <= 95) return 'CT90';
    if (ksi <= 105) return 'CT100';
    if (ksi <= 115) return 'CT110';
    return 'CT120';
  }

  return 'CT90'; // Industry standard default
}

/**
 * Retrieves the standard API yield sweep suggestion based on the active tubing grade.
 */
export function getApiGradeSuggestion(grade?: string, nominalYieldPsi?: number): ApiGradeSpecification {
  const canonical = normalizeGradeKey(grade, nominalYieldPsi);
  return API_GRADE_SPECIFICATIONS[canonical] || API_GRADE_SPECIFICATIONS.CT90;
}
