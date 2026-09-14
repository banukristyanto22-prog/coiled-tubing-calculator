import React from 'react';
import { CoiledTubingString, UnitSystem, TubingGrade } from '../types/coiledTubing';
import { 
  calculateGeometry, 
  calculateCapacities,
  inToMm, 
  mmToIn, 
  ftToM, 
  mToFt,
  psiToMpa,
  mpaToPsi,
  lbfToKn
} from '../utils/engineeringCalculations';
import { EngineeringTooltip } from './EngineeringTooltip';
import { UsedConditionPanel } from './UsedConditionPanel';
import { 
  Ruler, 
  Scale, 
  Droplet, 
  Layers, 
  ShieldAlert, 
  CheckCircle,
  FileSpreadsheet,
  Edit3
} from 'lucide-react';

interface StringSpecsTabProps {
  ct: CoiledTubingString;
  onChangeString: (updated: CoiledTubingString) => void;
  unitSystem: UnitSystem;
}

export const StringSpecsTab: React.FC<StringSpecsTabProps> = ({
  ct,
  onChangeString,
  unitSystem,
}) => {
  const geom = calculateGeometry(ct);
  const capacities = calculateCapacities(ct);

  const handleUpdate = (field: keyof CoiledTubingString, value: any) => {
    onChangeString({
      ...ct,
      [field]: value,
    });
  };

  const isMetric = unitSystem === 'metric';

  return (
    <div className="space-y-6">
      {/* Top Banner with Geometry & Quick Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Dimension Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Tubing String Specifications
              </h2>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Grade {ct.grade} &bull; {ct.outerDiameterIn.toFixed(3)}" OD &times; {ct.wallThicknessIn.toFixed(3)}" WT
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            {/* Outer Diameter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">
                  Outer Diameter (OD) {isMetric ? '(mm)' : '(in)'}
                </label>
                <EngineeringTooltip
                  parameter="Outer Diameter"
                  symbol="OD"
                  physicsFormula="I = (π / 64) · (OD⁴ - ID⁴)"
                  physicsExplanation="Governs the section modulus, area moment of inertia, and bending stiffness (EI). Bending rigidity scales with the 4th power of OD, controlling helical buckling initiation and extended-reach push limits."
                  operationalImpact="Larger OD increases axial stiffness and internal flow area, but reduces reel bend-cycle fatigue life and tightens wellbore annular clearance."
                  liveContext={`Current OD: ${ct.outerDiameterIn.toFixed(3)}" (${inToMm(ct.outerDiameterIn).toFixed(2)} mm) • D/t Ratio: ${geom.dtRatio.toFixed(2)} (${geom.dtRatio < 15 ? 'Heavy Wall / High Collapse' : geom.dtRatio <= 22 ? 'Standard CT Range' : 'Thin Wall / Susceptible to Buckling'})`}
                  industryStandard="API Spec 5ST Table 1"
                />
              </div>
              <input
                type="number"
                step="0.001"
                value={isMetric ? Number(inToMm(ct.outerDiameterIn).toFixed(2)) : ct.outerDiameterIn}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleUpdate('outerDiameterIn', isMetric ? mmToIn(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Wall Thickness */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">
                  Wall Thickness (t) {isMetric ? '(mm)' : '(in)'}
                </label>
                <EngineeringTooltip
                  parameter="Wall Thickness"
                  symbol="t"
                  physicsFormula="P_burst = 0.875 · (2 · Y · t / OD)"
                  physicsExplanation="Governs internal burst capacity and external collapse resistance under Barlow / Timoshenko equations. Wall metal area directly dictates tension load capacity and dry hanging weight."
                  operationalImpact="Thicker wall raises internal operating pressure limits and collapse resistance in deep hydrostatic fluid columns, but adds hook load and string hanging weight on the reel."
                  liveContext={`t = ${ct.wallThicknessIn.toFixed(3)}" (${inToMm(ct.wallThicknessIn).toFixed(2)} mm) • Metal Area: ${geom.metalAreaSqIn.toFixed(3)} in² (${geom.metalAreaSqMm.toFixed(1)} mm²) • ${( (ct.wallThicknessIn / ct.outerDiameterIn) * 100 ).toFixed(1)}% of OD`}
                  industryStandard="API Spec 5ST §6.3"
                />
              </div>
              <input
                type="number"
                step="0.001"
                value={isMetric ? Number(inToMm(ct.wallThicknessIn).toFixed(2)) : ct.wallThicknessIn}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleUpdate('wallThicknessIn', isMetric ? mmToIn(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Grade Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Steel Grade</label>
                <EngineeringTooltip
                  parameter="API Steel Grade"
                  symbol="API 5ST"
                  physicsFormula="σ_y = SMYS (70,000 – 110,000 psi)"
                  physicsExplanation="Designates the Specified Minimum Yield Strength (SMYS) of the continuously seam-welded micro-alloyed carbon steel (HSLA) under API Spec 5ST."
                  operationalImpact="Higher grades (CT90/CT100/CT110) expand tension and pressure envelopes for deep/high-pressure wells, but exhibit increased susceptibility to sulfide stress cracking (SSC) in sour H₂S environments."
                  liveContext={`Current: ${ct.grade} (${ct.yieldStrengthPsi.toLocaleString()} psi yield) • ${['CT70', 'CT80'].includes(ct.grade) ? 'Favorable for moderate sour service (NACE MR0175)' : 'High strength: monitor H₂S partial pressure strictly (threshold: 0.05 psia)'}`}
                  industryStandard="API Spec 5ST / NACE MR0175"
                />
              </div>
              <select
                value={ct.grade}
                onChange={(e) => {
                  const newGrade = e.target.value as TubingGrade;
                  let defYield = 90000;
                  if (newGrade === 'CT70') defYield = 70000;
                  if (newGrade === 'CT80') defYield = 80000;
                  if (newGrade === 'CT90') defYield = 97500;
                  if (newGrade === 'CT100') defYield = 100000;
                  if (newGrade === 'CT110') defYield = 110000;
                  onChangeString({
                    ...ct,
                    grade: newGrade,
                    yieldStrengthPsi: defYield,
                    specifiedMinYieldPsi: defYield,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="CT70">CT70 (70,000 psi)</option>
                <option value="CT80">CT80 (80,000 psi)</option>
                <option value="CT90">CT90 (90,000 / 97,500 psi)</option>
                <option value="CT100">CT100 (100,000 psi)</option>
                <option value="CT110">CT110 (110,000 psi)</option>
              </select>
            </div>

            {/* Total String Length */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">
                  Total String Length {isMetric ? '(m)' : '(ft)'}
                </label>
                <EngineeringTooltip
                  parameter="Continuous String Length"
                  symbol="L"
                  physicsFormula="W_dry = w · L,  ΔL = (F · L) / (A · E)"
                  physicsExplanation="The total continuous spooled length of tubing on the reel. Governs cumulative string dry hanging weight, axial elastic elongation under Hooke's Law, and internal fluid friction path."
                  operationalImpact="String length must exceed maximum target measured depth (MD) plus surface lubricator stack height, plus minimum 4 to 6 anchor wraps retained on the drum core for safety."
                  liveContext={`Total Length: ${ct.totalLengthFt.toLocaleString()} ft (${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m) • Empty Weight: ${Math.round(geom.totalWeightInAirLbs).toLocaleString()} lbs (${Math.round(geom.totalWeightInAirKg).toLocaleString()} kg)`}
                  industryStandard="ICoTA Recommended Practices"
                />
              </div>
              <input
                type="number"
                step="10"
                value={isMetric ? Math.round(ftToM(ct.totalLengthFt)) : ct.totalLengthFt}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleUpdate('totalLengthFt', isMetric ? mToFt(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Yield Strength */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">
                  Yield Strength (Rp0.2) {isMetric ? '(MPa)' : '(psi)'}
                </label>
                <EngineeringTooltip
                  parameter="Yield Strength (Rp0.2 / SMYS)"
                  symbol="σ_y"
                  physicsFormula="σ_vm = √[σ_a² - σ_a·σ_h + σ_h² + 3·τ²] ≤ σ_y"
                  physicsExplanation="The stress level corresponding to a 0.2% permanent plastic strain offset in uniaxial tensile test. Defines the elastic boundary of von Mises and Tresca triaxial yield envelopes."
                  operationalImpact="Governs maximum allowable combined axial tension, internal burst, and external collapse pressures before permanent plastic deformation occurs."
                  liveContext={`Yield: ${ct.yieldStrengthPsi.toLocaleString()} psi (${Math.round(psiToMpa(ct.yieldStrengthPsi))} MPa) • Full Tensile Yield: ${Math.round(ct.yieldStrengthPsi * geom.metalAreaSqIn).toLocaleString()} lbs (${Math.round(ct.yieldStrengthPsi * geom.metalAreaSqIn * 0.453592).toLocaleString()} kg)`}
                  industryStandard="ASTM A370 / API Spec 5ST §7.1"
                />
              </div>
              <input
                type="number"
                step="100"
                value={isMetric ? Math.round(psiToMpa(ct.yieldStrengthPsi)) : ct.yieldStrengthPsi}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  handleUpdate('yieldStrengthPsi', isMetric ? mpaToPsi(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Ovality % */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Ovality Tolerance (%)</label>
                <EngineeringTooltip
                  parameter="Cross-Sectional Ovality"
                  symbol="Ovality %"
                  physicsFormula="Ovality = (OD_max - OD_min) / OD_nom · 100%"
                  physicsExplanation="Quantifies out-of-round diametrical distortion caused by plastic bending cycles over reel/guide arch and injector gripper block clamping forces."
                  operationalImpact="Asymmetric cross section drastically degrades external collapse resistance under Timoshenko instability formulas (2% ovality can cause ~25% loss in collapse pressure). Also causes premature stripper rubber wear."
                  liveContext={`Current Ovality: ${ct.ovalityPercent.toFixed(1)}% • ${ct.ovalityPercent <= 2.0 ? 'Compliant with API 5ST manufacturing tolerance (≤ 2.0%)' : 'Caution: Exceeds 2.0% API tolerance; derate collapse rating'}`}
                  industryStandard="API Spec 5ST §6.4 & API RP 5C7"
                />
              </div>
              <input
                type="number"
                step="0.1"
                value={ct.ovalityPercent}
                onChange={(e) => handleUpdate('ovalityPercent', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-slate-400">Inner Diameter (ID)</span>
                <EngineeringTooltip
                  parameter="Internal Bore Diameter"
                  symbol="ID"
                  physicsFormula="ID = OD - 2 · t,  A_flow = (π / 4) · ID²"
                  physicsExplanation="Clear internal flow conduit dimension after subtracting wall thickness on both sides. Dictates fluid flow cross-sectional area and internal velocity."
                  operationalImpact="Constrains internal tool passage (balls, darts, memory gauges, cleanout check valves) and drives tubing frictional pressure drop (ΔP ∝ 1/ID^5)."
                  liveContext={`ID: ${geom.innerDiameterIn.toFixed(3)}" (${geom.innerDiameterMm.toFixed(2)} mm) • Internal Flow Area: ${((Math.PI / 4) * Math.pow(geom.innerDiameterIn, 2)).toFixed(3)} in²`}
                  industryStandard="API Spec 5ST §6"
                />
              </div>
              <span className="text-base font-mono font-bold text-cyan-300">
                {isMetric ? `${geom.innerDiameterMm.toFixed(2)} mm` : `${geom.innerDiameterIn.toFixed(3)} in`}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-slate-400">D/t Ratio</span>
                <EngineeringTooltip
                  parameter="Diameter-to-Thickness Ratio"
                  symbol="D / t"
                  physicsFormula="D/t = OD / t"
                  physicsExplanation="Structural slenderness ratio of the tubular cross section. D/t < 15 is categorized as thick-walled pipe; D/t > 20 approaches thin-walled shell behavior prone to elastic collapse."
                  operationalImpact="D/t governs collapse resistance. Higher D/t lowers collapse ratings and exacerbates ovalization during spooling; lower D/t resists collapse but adds string weight."
                  liveContext={`Current D/t: ${geom.dtRatio.toFixed(2)} • ${geom.dtRatio < 14 ? 'Heavy Wall / High Collapse Resistance' : geom.dtRatio < 18 ? 'Standard Wall Ratio' : 'Thin Wall / Collapse Sensitive'}`}
                  industryStandard="API Spec 5C3 / Timoshenko Shell Theory"
                />
              </div>
              <span className="text-base font-mono font-bold text-slate-200">
                {geom.dtRatio.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-slate-400">Metal Area</span>
                <EngineeringTooltip
                  parameter="Cross-Sectional Metal Area"
                  symbol="A_metal"
                  physicsFormula="A_metal = (π / 4) · (OD² - ID²),  F_yield = A_metal · σ_yield"
                  physicsExplanation="Effective net steel area carrying axial tensile loads, string hanging weight, and injector overpull."
                  operationalImpact="Directly scales the tensile yield capacity. Higher metal area increases pulling power but increases suspended string weight and hydraulic drag in deviated wells."
                  liveContext={`Area: ${geom.metalAreaSqIn.toFixed(3)} in² (${geom.metalAreaSqMm.toFixed(1)} mm²) • Nominal Tensile: ${(capacities.tensileYieldLbf / 1000).toFixed(1)} klbf (${lbfToKn(capacities.tensileYieldLbf).toFixed(0)} kN)`}
                  industryStandard="API Spec 5ST §7"
                />
              </div>
              <span className="text-base font-mono font-bold text-slate-200">
                {isMetric ? `${geom.metalAreaSqMm.toFixed(1)} mm²` : `${geom.metalAreaSqIn.toFixed(3)} in²`}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-slate-400">Moment of Inertia (I)</span>
                <EngineeringTooltip
                  parameter="Area Moment of Inertia"
                  symbol="I"
                  physicsFormula="I = (π / 64) · (OD⁴ - ID⁴),  F_crit = 2 · √(E · I · w_sub · sinθ / r_well)"
                  physicsExplanation="Second moment of area about the bending neutral axis. Multiplied by Young's Modulus (E = 30×10⁶ psi) to obtain bending stiffness (EI)."
                  operationalImpact="Fundamental property resisting buckling. Directly controls critical sinusoidal and helical buckling initiation loads (Dawson-Paslay / Wu-Juvkam-Wold) during reach in horizontal wells."
                  liveContext={`Bending Stiffness EI: ${(30e6 * geom.momentOfInertiaIn4 / 1e6).toFixed(1)} × 10⁶ lbf·in² • Inertia: ${geom.momentOfInertiaIn4.toFixed(4)} in⁴`}
                  industryStandard="Timoshenko Beam Mechanics / SPE 11985"
                />
              </div>
              <span className="text-base font-mono font-bold text-purple-300">
                {geom.momentOfInertiaIn4.toFixed(4)} in⁴
              </span>
            </div>
          </div>
        </div>

        {/* Right: Tube Cross-Section Graphic */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center relative">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 self-start">
            Cross-Sectional Geometry
          </span>

          <div className="relative w-48 h-48 flex items-center justify-center my-2">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Outer circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="#1e293b"
                stroke="#06b6d4"
                strokeWidth="2.5"
                className="transition-all"
              />
              {/* Wall Thickness ring */}
              <circle
                cx="100"
                cy="100"
                r="64"
                fill="#090d16"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Dimension indicators */}
              <line x1="15" y1="100" x2="185" y2="100" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="100" y1="15" x2="100" y2="185" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
              
              {/* Text annotations */}
              <text x="100" y="95" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                ID {geom.innerDiameterIn.toFixed(3)}"
              </text>
              <text x="100" y="112" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                t = {ct.wallThicknessIn.toFixed(3)}"
              </text>
            </svg>
          </div>

          <div className="w-full flex items-center justify-between text-xs px-2 pt-2 border-t border-slate-800 text-slate-400">
            <span>Steel: ~{ct.steelDensityLbfCuIn.toFixed(4)} lb/in³</span>
            <span className="text-emerald-400 font-mono font-medium">API 5ST</span>
          </div>
        </div>
      </div>

      {/* Used / Real Situation Field Condition Degradation Panel */}
      <UsedConditionPanel
        ct={ct}
        onChangeCondition={(updatedCondition) => {
          onChangeString({
            ...ct,
            usedCondition: updatedCondition,
          });
        }}
        unitSystem={unitSystem}
      />

      {/* Weights and Capacities Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tubing Weights */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
            <Scale className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Weight & Load Metrics
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Weight in Air (Unit Length)</span>
              <span className="font-mono font-bold text-amber-300">
                {isMetric
                  ? `${geom.weightInAirKgM.toFixed(2)} kg/m`
                  : `${geom.weightInAirLbFt.toFixed(2)} lb/ft`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Total String Weight (Empty / Dry)</span>
              <span className="font-mono font-bold text-white">
                {isMetric
                  ? `${Math.round(geom.totalWeightInAirKg).toLocaleString()} kg`
                  : `${Math.round(geom.totalWeightInAirLbs).toLocaleString()} lbs`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Weight Filled with Fresh Water (8.34 ppg)</span>
              <span className="font-mono font-bold text-cyan-300">
                {isMetric
                  ? `${Math.round(geom.totalWeightInAirKg + geom.totalCapacityM3 * 1000).toLocaleString()} kg`
                  : `${Math.round(geom.totalWeightInAirLbs + geom.totalCapacityBbl * 42 * 8.34).toLocaleString()} lbs`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Weight Filled with 10 ppg Brine</span>
              <span className="font-mono font-bold text-purple-300">
                {isMetric
                  ? `${Math.round(geom.totalWeightInAirKg + geom.totalCapacityM3 * 1200).toLocaleString()} kg`
                  : `${Math.round(geom.totalWeightInAirLbs + geom.totalCapacityBbl * 42 * 10.0).toLocaleString()} lbs`}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity & Displacement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
            <Droplet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Internal Capacity & Displacement
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Internal Capacity (Unit Length)</span>
              <span className="font-mono font-bold text-cyan-300">
                {isMetric
                  ? `${geom.capacityLpm.toFixed(2)} L/m`
                  : `${geom.capacityBbl1000Ft.toFixed(3)} bbl/1000ft (${geom.capacityGalFt.toFixed(3)} gal/ft)`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Total String Internal Volume</span>
              <span className="font-mono font-bold text-emerald-300">
                {isMetric
                  ? `${geom.totalCapacityM3.toFixed(2)} m³ (${Math.round(geom.totalCapacityM3 * 1000)} Liters)`
                  : `${geom.totalCapacityBbl.toFixed(2)} bbl (${Math.round(geom.totalCapacityBbl * 42)} gal)`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Displacement (Unit Length)</span>
              <span className="font-mono font-bold text-slate-200">
                {isMetric
                  ? `${(geom.displacementBbl1000Ft * 0.158987 / 304.8 * 1000).toFixed(2)} L/m`
                  : `${geom.displacementBbl1000Ft.toFixed(3)} bbl/1000ft`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Total String Displacement Volume</span>
              <span className="font-mono font-bold text-amber-300">
                {isMetric
                  ? `${(geom.totalDisplacementBbl * 0.158987).toFixed(2)} m³`
                  : `${geom.totalDisplacementBbl.toFixed(2)} bbl`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strip Segments & Bias Weld Log (Page 9 from MTR Report) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tapered String & Bias Weld Segment Log
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {ct.certificateRef?.segments?.length || 1} Strip Segments Registered
          </span>
        </div>

        {ct.certificateRef?.segments ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-mono">
                <tr>
                  <th className="px-3 py-2.5">Strip No.</th>
                  <th className="px-3 py-2.5">Wall (in)</th>
                  <th className="px-3 py-2.5">Segment Length</th>
                  <th className="px-3 py-2.5">Bias Weld Position</th>
                  <th className="px-3 py-2.5">Heat #</th>
                  <th className="px-3 py-2.5">Actual Yield (Rp0.2)</th>
                  <th className="px-3 py-2.5">Actual Tensile (Rm)</th>
                  <th className="px-3 py-2.5">NDT Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {ct.certificateRef.segments.map((seg, idx) => (
                  <tr key={seg.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 text-cyan-400 font-semibold">{seg.stripNo}</td>
                    <td className="px-3 py-2">{seg.wallThicknessIn.toFixed(3)}"</td>
                    <td className="px-3 py-2">
                      {isMetric ? `${seg.lengthM} m` : `${seg.lengthFt.toLocaleString()} ft`}
                    </td>
                    <td className="px-3 py-2 text-amber-300 font-semibold">
                      {isMetric ? `@ ${seg.biasWeldLocationM} m` : `@ ${seg.biasWeldLocationFt.toLocaleString()} ft`}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{seg.heatNumber}</td>
                    <td className="px-3 py-2 text-emerald-400">
                      {isMetric ? `${seg.yieldStrengthMpa} MPa` : `${Math.round(seg.yieldStrengthMpa * 145.038).toLocaleString()} psi`}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {isMetric ? `${seg.tensileStrengthMpa} MPa` : `${Math.round(seg.tensileStrengthMpa * 145.038).toLocaleString()} psi`}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" />
                        RT Pass
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/40 rounded-lg text-xs text-slate-400 border border-slate-800">
            This string is configured as a single continuous uniform strip without recorded bias welds.
            Select the certified Shinda CT90 string in the header preset menu to inspect multi-segment bias weld tracking.
          </div>
        )}
      </div>
    </div>
  );
};
