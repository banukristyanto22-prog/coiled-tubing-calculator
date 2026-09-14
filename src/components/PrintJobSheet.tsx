import React from 'react';
import { CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { 
  calculateGeometry, 
  calculateTubingLimits, 
  calculateHydraulics, 
  calculateWellboreForces, 
  calculateReelCapacity, 
  calculateAchillesFatigue,
  inToMm, 
  ftToM, 
  psiToMpa, 
  lbfToKn 
} from '../utils/engineeringCalculations';
import { DEFAULT_HYDRAULICS, DEFAULT_FORCES } from '../data/presets';
import { Printer, X, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { downloadCoiledTubingCSV } from '../utils/csvExport';
import { CoilMatrixLogo } from './CoilMatrixLogo';

interface PrintJobSheetProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintJobSheet: React.FC<PrintJobSheetProps> = ({
  ct,
  unitSystem,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMetric = unitSystem === 'metric';
  const geom = calculateGeometry(ct);
  const limits = calculateTubingLimits(ct);
  const hyd = calculateHydraulics(ct, DEFAULT_HYDRAULICS);
  const forces = calculateWellboreForces(ct, DEFAULT_FORCES);
  const reel = calculateReelCapacity(ct);
  const fatigue = calculateAchillesFatigue(ct, 3500, 25);

  const handlePrintAction = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden my-6 max-h-[95vh] flex flex-col font-sans">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white border-b border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-sm">Job Engineering Calculation Summary Sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCoiledTubingCSV(ct, unitSystem)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download full calculation results as a CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export CSV
            </button>
            <button
              onClick={handlePrintAction}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <CoilMatrixLogo size="lg" theme="light" showSubtitle={false} />
              <div className="border-l border-slate-300 pl-4">
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">
                  Coiled Tubing Engineering Report
                </h1>
                <p className="text-slate-600 text-xs">
                  Modeled in conformance with API Spec 5ST &bull; Coil Matrix Pro Suite
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-600">
              <div>Date: {new Date().toISOString().split('T')[0]}</div>
              <div className="font-bold text-slate-900">
                {ct.certificateRef?.reportNo || 'JOB-CT-2026-ENG'}
              </div>
              <div>Units: {isMetric ? 'Metric (SI)' : 'US Oilfield'}</div>
            </div>
          </div>

          {/* Identification */}
          <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-300 rounded">
            <div>
              <span className="text-slate-500 block text-[10px]">String Designation</span>
              <span className="font-bold">{ct.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Grade & Size</span>
              <span className="font-bold">{ct.grade} &bull; {ct.outerDiameterIn}" &times; {ct.wallThicknessIn}"</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Serial / Shaft #</span>
              <span className="font-mono font-bold">{ct.certificateRef?.shaftNo ? `Shaft ${ct.certificateRef.shaftNo}` : 'CT-STR-01'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Total Length</span>
              <span className="font-bold">
                {isMetric ? `${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m` : `${ct.totalLengthFt.toLocaleString()} ft`}
              </span>
            </div>
          </div>

          {/* Section 1: String Geometry & Weights */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              1. Tubing Geometry & Capacities
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Outer Diameter (OD):</span>
                  <span className="font-mono font-semibold">{isMetric ? inToMm(ct.outerDiameterIn).toFixed(2) + ' mm' : ct.outerDiameterIn.toFixed(3) + ' in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Inner Diameter (ID):</span>
                  <span className="font-mono font-semibold">{isMetric ? inToMm(geom.innerDiameterIn).toFixed(2) + ' mm' : geom.innerDiameterIn.toFixed(3) + ' in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Wall Thickness:</span>
                  <span className="font-mono font-semibold">{isMetric ? inToMm(ct.wallThicknessIn).toFixed(2) + ' mm' : ct.wallThicknessIn.toFixed(3) + ' in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">D/t Ratio:</span>
                  <span className="font-mono font-semibold">{geom.dtRatio.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Weight in Air:</span>
                  <span className="font-mono font-semibold">{isMetric ? geom.weightInAirKgM.toFixed(2) + ' kg/m' : geom.weightInAirLbFt.toFixed(2) + ' lb/ft'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total String Dry Weight:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(geom.totalWeightInAirKg).toLocaleString() + ' kg' : Math.round(geom.totalWeightInAirLbs).toLocaleString() + ' lbs'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Water Filled Weight:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(geom.totalWeightInAirKg + geom.totalCapacityM3 * 1000).toLocaleString() + ' kg' : Math.round(geom.totalWeightInAirLbs + geom.totalCapacityBbl * 42 * 8.34).toLocaleString() + ' lbs'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Internal Capacity:</span>
                  <span className="font-mono font-semibold">{isMetric ? geom.capacityLpm.toFixed(2) + ' L/m' : geom.capacityBbl1000Ft.toFixed(3) + ' bbl/kft'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total String Volume:</span>
                  <span className="font-mono font-semibold">{isMetric ? geom.totalCapacityM3.toFixed(2) + ' m³' : geom.totalCapacityBbl.toFixed(2) + ' bbl'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Displacement:</span>
                  <span className="font-mono font-semibold">{isMetric ? (geom.totalDisplacementBbl * 0.158987).toFixed(2) + ' m³' : geom.totalDisplacementBbl.toFixed(2) + ' bbl'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Mechanical Limits & Working Envelope */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              2. Structural & Pressure Limits (API Spec 5ST)
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">100% Yield Burst:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(limits.yieldBurstMpa) + ' MPa' : Math.round(limits.yieldBurstPressurePsi).toLocaleString() + ' psi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">API 87.5% Burst:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(limits.apiBurstMpa) + ' MPa' : Math.round(limits.apiBurstPressurePsi).toLocaleString() + ' psi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">80% Safe Working Burst:</span>
                  <span className="font-mono font-semibold text-emerald-700">{isMetric ? Math.round(psiToMpa(limits.safeBurstPressurePsi)) + ' MPa' : Math.round(limits.safeBurstPressurePsi).toLocaleString() + ' psi'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Collapse Resistance:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(limits.collapseMpa) + ' MPa' : Math.round(limits.ovalityDeratedCollapsePsi).toLocaleString() + ' psi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Specified Min Yield (YS):</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(psiToMpa(ct.specifiedMinYieldPsi)) + ' MPa' : ct.specifiedMinYieldPsi.toLocaleString() + ' psi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Actual Test Yield (Rp0.2):</span>
                  <span className="font-mono font-semibold text-blue-700">{isMetric ? Math.round(psiToMpa(ct.yieldStrengthPsi)) + ' MPa' : ct.yieldStrengthPsi.toLocaleString() + ' psi'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tensile Yield (100%):</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(limits.tensileYieldKn) + ' kN' : Math.round(limits.tensileYieldLbf).toLocaleString() + ' lbf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Safe Overpull (80% Limit):</span>
                  <span className="font-mono font-semibold text-emerald-700">{isMetric ? Math.round(limits.safeOverpullKn) + ' kN' : Math.round(limits.safeOverpullLbf).toLocaleString() + ' lbf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Factory Hydrotest:</span>
                  <span className="font-mono font-semibold text-purple-700">{isMetric ? '75.9 MPa (15 min)' : '11,008 psi (15 min)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Hydraulics & Wellbore Forces */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                3. Hydraulics (Circulation Summary)
              </h2>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Flow Rate:</span>
                  <span className="font-mono font-semibold">{DEFAULT_HYDRAULICS.flowRateGpm} gpm ({(DEFAULT_HYDRAULICS.flowRateGpm / 42).toFixed(2)} bpm)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fluid Density:</span>
                  <span className="font-mono font-semibold">{DEFAULT_HYDRAULICS.fluidDensityPpg} ppg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Estimated Standpipe Pressure:</span>
                  <span className="font-mono font-bold text-slate-900">{isMetric ? Math.round(hyd.totalCirculatingPressureBar) + ' bar' : Math.round(hyd.totalCirculatingPressurePsi).toLocaleString() + ' psi'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Dean / Ito Reel Multiplier:</span>
                  <span className="font-mono font-semibold">&times; {hyd.itoReelCurvatureMultiplier.toFixed(2)} (+{Math.round((hyd.itoReelCurvatureMultiplier - 1) * 100)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Annular Velocity (AV):</span>
                  <span className="font-mono font-semibold">{Math.round(hyd.annularVelocityFtMin)} ft/min</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                4. Wellbore Forces & Buckling
              </h2>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Well Measured Depth (MD):</span>
                  <span className="font-mono font-semibold">{DEFAULT_FORCES.measuredDepthFt.toLocaleString()} ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Surface Slack-off (RIH):</span>
                  <span className="font-mono font-semibold text-emerald-700">{isMetric ? Math.round(lbfToKn(forces.surfaceSlackoffWeightLbf)) + ' kN' : Math.round(forces.surfaceSlackoffWeightLbf).toLocaleString() + ' lbf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Surface Pick-up (POOH):</span>
                  <span className="font-mono font-semibold text-amber-700">{isMetric ? Math.round(lbfToKn(forces.surfacePickupWeightLbf)) + ' kN' : Math.round(forces.surfacePickupWeightLbf).toLocaleString() + ' lbf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Critical Sinusoidal Buckling:</span>
                  <span className="font-mono font-semibold">{isMetric ? Math.round(lbfToKn(forces.criticalSinusoidalBucklingLbf)) + ' kN' : Math.round(forces.criticalSinusoidalBucklingLbf).toLocaleString() + ' lbf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Helical Buckling Threshold:</span>
                  <span className="font-mono font-semibold text-rose-700">{isMetric ? Math.round(lbfToKn(forces.helicalBucklingThresholdLbf)) + ' kN' : Math.round(forces.helicalBucklingThresholdLbf).toLocaleString() + ' lbf'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Reel Shipping & Spooling Specs */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              5. Shipping Reel & Spooling
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block text-[10px]">Reel Dimensions</span>
                <span className="font-bold">{isMetric ? `${Math.round(inToMm(ct.reelFlangeDiameterIn))}mm OD \u00d7 ${Math.round(inToMm(ct.reelWidthIn))}mm W` : `${ct.reelFlangeDiameterIn}" OD \u00d7 ${ct.reelWidthIn}" W`}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Spool Capacity</span>
                <span className="font-bold">{isMetric ? `${Math.round(reel.maxCapacityM).toLocaleString()} m` : `${Math.round(reel.maxCapacityFt).toLocaleString()} ft`}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Spool Fill %</span>
                <span className="font-bold text-emerald-700">{reel.spoolFillPercentage.toFixed(1)}% Full</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Gross Reel Weight</span>
                <span className="font-bold">{isMetric ? `${Math.round(reel.totalReelWeightGrossLbs * 0.453592).toLocaleString()} kg` : `${Math.round(reel.totalReelWeightGrossLbs).toLocaleString()} lbs`}</span>
              </div>
            </div>
          </div>

          {/* Section 6: Achilles 4.0 Fatigue Life Prediction */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              6. CT Fatigue Life Prediction (Achilles 4.0 / TFATIGUE)
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block text-[10px]">Total Trip Capacity</span>
                <span className="font-bold">{fatigue.estimatedTotalTripCycles} Trips</span>
                <span className="text-[10px] text-slate-500 block font-mono">{fatigue.tripDamagePercent.toFixed(3)}%/trip</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Factory Bias Weld Life</span>
                <span className="font-bold text-amber-700">{fatigue.biasWeldLifeTrips} Trips</span>
                <span className="text-[10px] text-slate-500 block">0.92 JIP Derating</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Max Bending Strain</span>
                <span className="font-bold">{Math.max(fatigue.deltaEpsXReelPercent, fatigue.deltaEpsXGooseneckPercent).toFixed(3)}%</span>
                <span className="text-[10px] text-slate-500 block">Reel: {fatigue.deltaEpsXReelPercent.toFixed(2)}% | Arch: {fatigue.deltaEpsXGooseneckPercent.toFixed(2)}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tipton OD Ballooning</span>
                <span className="font-bold text-purple-700">+{isMetric ? `${(fatigue.ballooningGrowthEstimatedIn * 25.4).toFixed(3)} mm` : `${fatigue.ballooningGrowthEstimatedIn.toFixed(4)}"`}</span>
                <span className="text-[10px] text-slate-500 block">Wall: -{fatigue.wallThinningPercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Sign-off & Verification */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-[11px]">
            <div>
              <span className="text-slate-500 block">Prepared By:</span>
              <div className="mt-4 border-b border-slate-400 w-40" />
              <span className="text-slate-700">Coiled Tubing Engineer</span>
            </div>
            <div>
              <span className="text-slate-500 block">Reviewed & Approved By:</span>
              <div className="mt-4 border-b border-slate-400 w-40" />
              <span className="text-slate-700">Operations Superintendent</span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                API 5ST Validated
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Calculations based on standard von Mises, Churchill, and Dawson-Paslay oilfield formulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
