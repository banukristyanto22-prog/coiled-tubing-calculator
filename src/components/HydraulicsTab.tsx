import React, { useState, useMemo } from 'react';
import { CoiledTubingString, UnitSystem, HydraulicsInput } from '../types/coiledTubing';
import { DEFAULT_HYDRAULICS } from '../data/presets';
import { FLUIDS_LIBRARY, FluidSpecification, FluidCategory } from '../data/fluidsLibrary';
import { FluidLibraryModal } from './FluidLibraryModal';
import { ExpandableFluidLibrary } from './ExpandableFluidLibrary';
import { CustomFluidComposition, loadCustomFluidsFromStorage } from '../types/customFluid';
import { EngineeringTooltip } from './EngineeringTooltip';
import { 
  calculateHydraulics, 
  gpmToLpm, 
  lpmToGpm, 
  ppgToSg, 
  sgToPpg, 
  psiToBar, 
  barToPsi,
  inToMm, 
  mmToIn,
  ftToM,
  mToFt
} from '../utils/engineeringCalculations';
import { 
  Droplets, 
  Activity, 
  Compass, 
  Zap, 
  Gauge, 
  Info, 
  ArrowRight,
  Flame,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Beaker
} from 'lucide-react';

interface HydraulicsTabProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
}

const CATEGORIES_ORDER: FluidCategory[] = [
  'Brines & Clear Fluids',
  'Slickwater & FR',
  'Gels & Cleanout Fluids',
  'Acids & Stimulation',
  'Muds & Kill Fluids',
  'Energized & Solvents',
];

export const HydraulicsTab: React.FC<HydraulicsTabProps> = ({
  ct,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const [hydraulics, setHydraulics] = useState<HydraulicsInput>(DEFAULT_HYDRAULICS);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);

  const results = calculateHydraulics(ct, hydraulics);

  // Identify active fluid specification or create fallback for custom
  const activeFluid = useMemo<FluidSpecification>(() => {
    // 1. Check built-in reference library
    const foundStatic = FLUIDS_LIBRARY.find((f) => f.id === hydraulics.fluidType);
    if (foundStatic) return foundStatic;

    // 2. Check saved custom fluid compositions
    const customFluids = loadCustomFluidsFromStorage();
    const foundCustom = customFluids.find((f) => f.id === hydraulics.fluidType);
    if (foundCustom) {
      return {
        id: foundCustom.id,
        name: foundCustom.name,
        shortName: foundCustom.shortName,
        category: foundCustom.category === 'oil_base' 
          ? 'Energized & Solvents' 
          : foundCustom.category === 'polymer_gel' 
            ? 'Gels & Cleanout Fluids' 
            : 'Brines & Clear Fluids',
        densityPpg: foundCustom.densityPpg,
        densitySg: foundCustom.densitySg,
        viscosityCp: foundCustom.viscosityCp,
        chemicalBase: foundCustom.chemicalBase,
        phRange: foundCustom.phRange,
        corrosivity: foundCustom.corrosivity,
        h2sCompatible: foundCustom.h2sCompatible,
        frictionReductionPercent: foundCustom.frictionReductionPercent,
        solidsType: foundCustom.solidsType,
        maxTemperatureF: foundCustom.maxTemperatureF,
        badgeColor: foundCustom.category === 'oil_base' ? 'amber' : foundCustom.category === 'polymer_gel' ? 'emerald' : 'cyan',
        description: foundCustom.description,
        commonApplications: foundCustom.commonApplications,
      };
    }

    return {
      id: hydraulics.fluidType,
      name: hydraulics.fluidType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      shortName: hydraulics.fluidType,
      category: 'Brines & Clear Fluids',
      densityPpg: hydraulics.fluidDensityPpg,
      densitySg: Number(ppgToSg(hydraulics.fluidDensityPpg).toFixed(3)),
      viscosityCp: hydraulics.fluidViscosityCp,
      chemicalBase: 'Custom Fluid Specification',
      phRange: 'Neutral',
      corrosivity: 'Non-corrosive',
      h2sCompatible: true,
      frictionReductionPercent: hydraulics.frictionReductionPercent || 0,
      solidsType: 'None (Clear)',
      maxTemperatureF: 350,
      badgeColor: 'cyan',
      description: 'Custom specified coiled tubing fluid system.',
      commonApplications: ['General CT Operations'],
    };
  }, [hydraulics.fluidType, hydraulics.fluidDensityPpg, hydraulics.fluidViscosityCp, hydraulics.frictionReductionPercent]);

  // Check if density or viscosity was manually fine-tuned
  const isCustomDensity = Math.abs(hydraulics.fluidDensityPpg - activeFluid.densityPpg) > 0.05;
  const isCustomViscosity = Math.abs(hydraulics.fluidViscosityCp - activeFluid.viscosityCp) > 0.1;
  const isCustomModified = isCustomDensity || isCustomViscosity;

  const handleSelectFluidFromLibrary = (fluid: FluidSpecification) => {
    setHydraulics({
      ...hydraulics,
      fluidType: fluid.id,
      fluidDensityPpg: fluid.densityPpg,
      fluidViscosityCp: fluid.viscosityCp,
      frictionReductionPercent: fluid.frictionReductionPercent,
    });
  };

  const handleLoadCustomFluid = (fluid: CustomFluidComposition) => {
    setHydraulics({
      ...hydraulics,
      fluidType: fluid.id,
      fluidDensityPpg: fluid.densityPpg,
      fluidViscosityCp: fluid.viscosityCp,
      frictionReductionPercent: fluid.frictionReductionPercent,
    });
  };

  const handleFluidPresetSelect = (fluidId: string) => {
    const foundStatic = FLUIDS_LIBRARY.find((f) => f.id === fluidId);
    if (foundStatic) {
      handleSelectFluidFromLibrary(foundStatic);
      return;
    }
    const customFluids = loadCustomFluidsFromStorage();
    const foundCustom = customFluids.find((f) => f.id === fluidId);
    if (foundCustom) {
      handleLoadCustomFluid(foundCustom);
      return;
    }
    setHydraulics({
      ...hydraulics,
      fluidType: fluidId,
    });
  };

  const handleResetToPresetDefaults = () => {
    setHydraulics({
      ...hydraulics,
      fluidDensityPpg: activeFluid.densityPpg,
      fluidViscosityCp: activeFluid.viscosityCp,
      frictionReductionPercent: activeFluid.frictionReductionPercent,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Circulating Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Circulating Pressure</span>
              <EngineeringTooltip
                parameter="Total Circulating Pressure"
                symbol="P_circ / P_pump"
                physicsFormula="P_pump = ΔP_CT + ΔP_nozzle + ΔP_annulus + P_surface"
                physicsExplanation="Total pump discharge pressure needed to overcome cumulative flow resistance along the coiled tubing string (including Dean vortex reel curvature friction), bottom-hole jetting nozzle restriction, and annular upward return backpressure."
                operationalImpact="Must remain within surface triplex pump rating and allowable tubing working pressure under von Mises combined tension-burst envelope."
                liveContext={`Total: ${Math.round(results.totalCirculatingPressurePsi).toLocaleString()} psi (${Math.round(results.totalCirculatingPressureBar)} bar) • CT Loss: ${((results.pressureDropTubingPsi / results.totalCirculatingPressurePsi) * 100).toFixed(0)}% • Nozzle: ${((results.nozzlePressureDropPsi / results.totalCirculatingPressurePsi) * 100).toFixed(0)}%`}
                industryStandard="API RP 13D / ICoTA Hydraulics"
              />
            </div>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {isMetric
              ? `${Math.round(results.totalCirculatingPressureBar)} bar`
              : `${Math.round(results.totalCirculatingPressurePsi).toLocaleString()} psi`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            At {isMetric ? Math.round(gpmToLpm(hydraulics.flowRateGpm)) + ' L/min' : hydraulics.flowRateGpm.toFixed(1) + ' gpm'} ({(hydraulics.flowRateGpm / 42).toFixed(2)} bpm)
          </div>
        </div>

        {/* Tubing Fluid Velocity & Reynolds */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Inside Velocity (Re)</span>
              <EngineeringTooltip
                parameter="Tubing Internal Fluid Velocity"
                symbol="v_CT & Re"
                physicsFormula="v = (0.408 · Q) / ID²,  Re = (928 · ρ · v · ID) / μ"
                physicsExplanation="Mean fluid velocity within the coiled tubing internal conduit and the resulting Reynolds number determining flow regime (laminar, transitional, or turbulent)."
                operationalImpact="High fluid velocity (> 30–40 ft/s) in the presence of sand, acid, or slurries dramatically accelerates erosional wall wear, especially around tight spool radius turns."
                liveContext={`Velocity: ${results.velocityFtSec.toFixed(1)} ft/s (${results.velocityMSec.toFixed(1)} m/s) • Re: ${Math.round(results.reynoldsNumber).toLocaleString()} (${results.flowRegime}) • ${results.velocityFtSec > 35 ? 'HIGH VELOCITY: Check erosional limits' : 'Velocity within safe limits'}`}
                industryStandard="API RP 14E §2.4 (Erosion Limit)"
              />
            </div>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {isMetric ? `${results.velocityMSec.toFixed(1)} m/s` : `${results.velocityFtSec.toFixed(1)} ft/s`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Re: {Math.round(results.reynoldsNumber).toLocaleString()}</span>
            <span className="text-emerald-400 font-semibold">{results.flowRegime}</span>
          </div>
        </div>

        {/* Annular Velocity & Hole Cleaning */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Annular Velocity (AV)</span>
              <EngineeringTooltip
                parameter="Annular Return Velocity"
                symbol="AV"
                physicsFormula="AV = (24.51 · Q) / (ID_csg² - OD_ct²)"
                physicsExplanation="Upward fluid velocity in the annular gap between casing inner diameter and coiled tubing outer diameter."
                operationalImpact="Crucial for sand washing and cuttings transport. AV must exceed terminal particle slip velocity (typically 120–150 ft/min) to prevent debris bed deposition, pack-off, and stuck-pipe hazards."
                liveContext={`AV: ${Math.round(results.annularVelocityFtMin)} ft/min (${Math.round(results.annularVelocityMMin)} m/min) • Hole Cleaning Efficiency: ${results.cuttingsTransportEfficiencyPercent.toFixed(0)}% • ${results.annularVelocityFtMin >= 150 ? 'Optimal Hole Cleaning' : results.annularVelocityFtMin >= 100 ? 'Adequate Cleaning' : 'Sub-critical: Risk of particle settling'}`}
                industryStandard="SPE 68440 (Coiled Tubing Cleanout)"
              />
            </div>
            <Droplets className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {isMetric
              ? `${Math.round(results.annularVelocityMMin)} m/min`
              : `${Math.round(results.annularVelocityFtMin)} ft/min`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Hole Cleaning Index: <span className="text-cyan-300 font-semibold">{results.cuttingsTransportEfficiencyPercent.toFixed(0)}%</span>
          </div>
        </div>

        {/* Hydraulic Horsepower */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Hydraulic Power (HHP)</span>
              <EngineeringTooltip
                parameter="Hydraulic Horsepower"
                symbol="HHP"
                physicsFormula="HHP = (P_pump · Q) / 1714,  kW = HHP · 0.7457"
                physicsExplanation="Rate of hydraulic energy expended to circulate fluid through the continuous system."
                operationalImpact="Directly governs the required surface pumping unit capability (triplex/quintuplex fluid ends) and fuel consumption rate. High HHP also induces fluid heating."
                liveContext={`Duty: ${Math.round(results.hydraulicHorsepowerHhp)} HHP (${(results.hydraulicHorsepowerHhp * 0.7457).toFixed(1)} kW) • Flow: ${hydraulics.flowRateGpm.toFixed(1)} gpm @ ${Math.round(results.totalCirculatingPressurePsi).toLocaleString()} psi`}
                industryStandard="Crane Technical Paper No. 410"
              />
            </div>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {Math.round(results.hydraulicHorsepowerHhp)} HHP
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {(results.hydraulicHorsepowerHhp * 0.7457).toFixed(1)} kW pump duty
          </div>
        </div>
      </div>

      {/* Expandable Fluid Properties Library & Custom Composition Formulation */}
      <ExpandableFluidLibrary
        ct={ct}
        unitSystem={unitSystem}
        currentHydraulics={hydraulics}
        onLoadFluidIntoCalculations={handleLoadCustomFluid}
        activeFluidId={hydraulics.fluidType}
        defaultExpanded={true}
      />

      {/* Main Layout: Inputs on Left, Waterfall Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Droplets className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Circulation Parameters
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Flow Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-slate-400">Flow Rate</label>
                  <EngineeringTooltip
                    parameter="Circulation Flow Rate"
                    symbol="Q"
                    physicsFormula="v = Q / A_inner,  ΔP_friction ∝ Q^(1.75 to 2.0)"
                    physicsExplanation="Volumetric rate delivered through the continuous coiled tubing string. In turbulent flow regimes, frictional pressure drop scales nearly with the square of flow rate, demanding substantial hydraulic horsepower (HHP)."
                    operationalImpact="Higher flow rates enhance cuttings transport slip velocity and bottomhole motor RPM, but accelerate wall erosion and rapidly consume surface pump pressure limits."
                    liveContext={`CT Internal Velocity: ${results.velocityFtSec.toFixed(1)} ft/s (${results.velocityMSec.toFixed(1)} m/s) • Re: ${Math.round(results.reynoldsNumber).toLocaleString()} (${results.flowRegime}) • HHP: ${Math.round(results.hydraulicHorsepowerHhp)} hp`}
                    industryStandard="API RP 13D / SPE 106982"
                  />
                </div>
                <span className="font-mono text-cyan-400 font-bold">
                  {isMetric
                    ? `${Math.round(gpmToLpm(hydraulics.flowRateGpm))} L/min`
                    : `${hydraulics.flowRateGpm.toFixed(1)} gpm (${(hydraulics.flowRateGpm / 42).toFixed(2)} bpm)`}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="210"
                step="5"
                value={hydraulics.flowRateGpm}
                onChange={(e) =>
                  setHydraulics({ ...hydraulics, flowRateGpm: parseFloat(e.target.value) || 10 })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Fluid Selection & Rheology Library Section */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Beaker className="w-4 h-4 text-cyan-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Fluid System & Rheology
                  </span>
                  <EngineeringTooltip
                    parameter="Fluid System & Rheology"
                    symbol="Rheology Model"
                    physicsFormula="τ = τ_0 + K · γ̇^n (Herschel-Bulkley)"
                    physicsExplanation="Fluid rheological behavior dictates wall shear stress and turbulent boundary layer suppression. Polymers and slickwaters exhibit viscoelastic drag reduction (Toms effect), dampening micro-turbulent dissipation."
                    operationalImpact="Directly controls straight and curved pipe friction loss, cuttings transport suspension when pumps stop, and chemical compatibility with H₂S or acid-sensitive formations."
                    liveContext={`Active: ${activeFluid.name} (${activeFluid.chemicalBase}) • ${activeFluid.frictionReductionPercent > 0 ? `${activeFluid.frictionReductionPercent}% Drag Reduction Active` : 'Base Viscous Fluid'} • ${activeFluid.corrosivity}`}
                    industryStandard="API RP 13B-1 / ICoTA Fluid Selection Standards"
                  />
                </div>
                {/* Search & Filter Library Action Button */}
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Search & Filter Fluids by Density, Viscosity, or Chemistry"
                >
                  <Search className="w-3 h-3" />
                  <span>Fluid Library</span>
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">
                    {FLUIDS_LIBRARY.length}
                  </span>
                </button>
              </div>

              {/* Active Fluid Spec Highlight Card */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {activeFluid.name}
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {activeFluid.chemicalBase}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                    title="Change Fluid via Library"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chemical Attributes Badges */}
                <div className="flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-slate-950 text-slate-300 border border-slate-800">
                    {activeFluid.category}
                  </span>

                  {activeFluid.corrosivity === 'Severe / Acidic' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Acidic
                    </span>
                  ) : activeFluid.corrosivity === 'Non-corrosive' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Non-corrosive
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                      {activeFluid.corrosivity}
                    </span>
                  )}

                  {activeFluid.h2sCompatible && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-blue-400" /> H₂S Safe
                    </span>
                  )}

                  {activeFluid.frictionReductionPercent > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-emerald-400" />
                      {activeFluid.frictionReductionPercent}% FR
                    </span>
                  )}
                </div>
              </div>

              {/* Categorized Quick Preset Dropdown */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  Select Fluid System ({FLUIDS_LIBRARY.length + loadCustomFluidsFromStorage().length} available)
                </label>
                <select
                  value={hydraulics.fluidType}
                  onChange={(e) => handleFluidPresetSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                >
                  {loadCustomFluidsFromStorage().length > 0 && (
                    <optgroup label="── Custom Formulations (Saved) ──" className="bg-slate-950 text-cyan-400 font-sans font-semibold">
                      {loadCustomFluidsFromStorage().map((cf) => (
                        <option key={cf.id} value={cf.id} className="bg-slate-900 text-white font-mono text-xs">
                          {cf.shortName} ({isMetric ? `${cf.densitySg.toFixed(2)} SG` : `${cf.densityPpg.toFixed(1)} ppg`}, {cf.viscosityCp} cp{cf.frictionReductionPercent > 0 ? `, ${cf.frictionReductionPercent}% FR` : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {CATEGORIES_ORDER.map((cat) => (
                    <optgroup key={cat} label={`── ${cat} ──`} className="bg-slate-950 text-slate-400 font-sans font-semibold">
                      {FLUIDS_LIBRARY.filter((f) => f.category === cat).map((f) => (
                        <option key={f.id} value={f.id} className="bg-slate-900 text-white font-mono text-xs">
                          {f.shortName} ({isMetric ? `${f.densitySg.toFixed(2)} SG` : `${f.densityPpg.toFixed(1)} ppg`}, {f.viscosityCp} cp)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Density & Viscosity Fine-Tuning Inputs */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Fluid Density */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <label className="text-slate-400 text-[11px]">
                        Density {isMetric ? '(SG)' : '(ppg)'}
                      </label>
                      <EngineeringTooltip
                        parameter="Fluid Density"
                        symbol="ρ (rho)"
                        physicsFormula="P_hydro = 0.052 · ρ · TVD,  BF = 1 - ρ / 65.5"
                        physicsExplanation="Specific fluid mass per volume. Establishes the hydrostatic bottom-hole pressure gradient (0.052 × ppg) balancing downhole pore pressure, and governs the Archimedean buoyancy factor reducing string weight."
                        operationalImpact="Ensures primary well control against reservoir kicks. However, higher fluid density raises pipe circulating friction and bottom-hole equivalent circulating density (ECD)."
                        liveContext={`Gradient: ${(0.052 * hydraulics.fluidDensityPpg).toFixed(3)} psi/ft • Buoyancy Factor: ${(1 - hydraulics.fluidDensityPpg / 65.5).toFixed(3)} • Hydrostatic @ ${hydraulics.wellboreDepthFt.toLocaleString()} ft: ${Math.round(0.052 * hydraulics.fluidDensityPpg * hydraulics.wellboreDepthFt).toLocaleString()} psi`}
                        industryStandard="API RP 13B-1 §4"
                      />
                    </div>
                    {isCustomDensity && (
                      <span className="text-[9px] text-amber-400 font-mono">Custom</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={isMetric ? Number(ppgToSg(hydraulics.fluidDensityPpg).toFixed(3)) : hydraulics.fluidDensityPpg}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 8.34;
                      setHydraulics({
                        ...hydraulics,
                        fluidDensityPpg: isMetric ? sgToPpg(val) : val,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Viscosity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <label className="text-slate-400 text-[11px]">Viscosity (cp)</label>
                      <EngineeringTooltip
                        parameter="Dynamic Viscosity"
                        symbol="μ (mu)"
                        physicsFormula="Re = (928 · ρ · v · d) / μ,  ΔP_laminar ∝ μ"
                        physicsExplanation="Measure of fluid resistance to shear deformation. Higher dynamic viscosity lowers the Reynolds number and dampens turbulence, but steepens laminar shear friction against the coiled tubing inner wall."
                        operationalImpact="High viscosity gels enhance cutting transport and debris suspension during circulation pauses, while low viscosity fluids minimize surface pumping pressure."
                        liveContext={`Viscosity: ${hydraulics.fluidViscosityCp} cp • ${(hydraulics.fluidViscosityCp / 1.0).toFixed(1)}× water baseline • Regime: ${results.flowRegime}`}
                        industryStandard="API RP 13D / Fann 35 Model"
                      />
                    </div>
                    {isCustomViscosity && (
                      <span className="text-[9px] text-amber-400 font-mono">Custom</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={hydraulics.fluidViscosityCp}
                    onChange={(e) =>
                      setHydraulics({
                        ...hydraulics,
                        fluidViscosityCp: parseFloat(e.target.value) || 1.0,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reset to Preset Defaults if user modified */}
              {isCustomModified && (
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-amber-400/90 flex items-center gap-1">
                    Preset baseline: {isMetric ? `${activeFluid.densitySg.toFixed(2)} SG` : `${activeFluid.densityPpg} ppg`}, {activeFluid.viscosityCp} cp
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToPresetDefaults}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Jetting / Nozzle Specs */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                BHA Nozzle Configuration
              </span>
              <div className="grid grid-cols-3 gap-2">
                {/* Nozzle ID */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-slate-400">Nozzle ID (in)</label>
                    <EngineeringTooltip
                      parameter="Nozzle Jet Orifice ID"
                      symbol="d_nozzle"
                      physicsFormula="TFA = N · (π / 4) · d_nozzle²,  v_jet = Q / TFA"
                      physicsExplanation="Internal diameter of the jetting ports in the bottom-hole assembly (BHA). Constricts flow area to accelerate fluid into high-velocity kinetic energy wash jets."
                      operationalImpact="Smaller orifices produce high-impact velocity for scale cutting and sand washing, but create high backpressure differential across the tool face."
                      liveContext={`Single Port: ${((Math.PI / 4) * Math.pow(hydraulics.nozzleDiameterIn, 2)).toFixed(4)} in² • Total TFA: ${(hydraulics.nozzleCount * (Math.PI / 4) * Math.pow(hydraulics.nozzleDiameterIn, 2)).toFixed(4)} in² • ΔP: ${Math.round(results.nozzlePressureDropPsi).toLocaleString()} psi`}
                      industryStandard="ICoTA BHA Jetting Guidelines"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.015"
                    value={hydraulics.nozzleDiameterIn}
                    onChange={(e) =>
                      setHydraulics({
                        ...hydraulics,
                        nozzleDiameterIn: parseFloat(e.target.value) || 0.1875,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>

                {/* Port Count */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-slate-400">Port Count</label>
                    <EngineeringTooltip
                      parameter="Nozzle Discharge Ports"
                      symbol="N_ports"
                      physicsFormula="TFA_total = N · TFA_single"
                      physicsExplanation="Total number of discharge ports arranged around the jetting head or wash tool."
                      operationalImpact="Splits volumetric flow evenly. Adding ports reduces tool pressure drop and broadens coverage; rearward-angled ports provide hydraulic self-propulsion thrust in horizontal wells."
                      liveContext={`Current: ${hydraulics.nozzleCount} ports • Jet ΔP: ${Math.round(results.nozzlePressureDropPsi).toLocaleString()} psi (${Math.round(results.nozzlePressureDropBar)} bar)`}
                      industryStandard="SPE 54469"
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={hydraulics.nozzleCount}
                    onChange={(e) =>
                      setHydraulics({
                        ...hydraulics,
                        nozzleCount: parseInt(e.target.value) || 4,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>

                {/* Discharge Coeff (Cd) */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-slate-400">Discharge (Cd)</label>
                    <EngineeringTooltip
                      parameter="Discharge Coefficient"
                      symbol="C_d"
                      physicsFormula="ΔP_nozzle = (8.311e-5 · ρ · Q²) / (C_d² · TFA²)"
                      physicsExplanation="Dimensionless ratio of actual flow rate to ideal frictionless flow through an orifice. Accounts for vena contracta flow stream convergence and turbulent entry losses."
                      operationalImpact="Sharp-edged ports have Cd ~ 0.80–0.85; chamfered or rounded entries reach 0.90–0.95; streamlined venturis reach 0.98. Lower Cd produces higher pressure drop."
                      liveContext={`Current Cd: ${hydraulics.nozzleCd.toFixed(2)} • ${hydraulics.nozzleCd >= 0.95 ? 'Streamlined / Chamfered Entry' : 'Standard Orifice'}`}
                      industryStandard="Crane Technical Paper No. 410"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="1.0"
                    value={hydraulics.nozzleCd}
                    onChange={(e) =>
                      setHydraulics({
                        ...hydraulics,
                        nozzleCd: parseFloat(e.target.value) || 0.95,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Casing ID & Wellbore Boundary Conditions */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Casing ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-[11px]">
                    Casing ID {isMetric ? '(mm)' : '(in)'}
                  </label>
                  <EngineeringTooltip
                    parameter="Casing / Liner ID"
                    symbol="ID_casing"
                    physicsFormula="A_ann = (π / 4) · (ID_csg² - OD_ct²),  AV = (24.51 · Q) / (ID_csg² - OD_ct²)"
                    physicsExplanation="Defines the annular return channel between the wellbore casing/liner and the outer wall of the coiled tubing."
                    operationalImpact="Controls Annular Return Velocity (AV). If AV falls below terminal particle slip velocity (~120–150 ft/min), debris settles into stationary beds, posing stuck-pipe hazards."
                    liveContext={`Annular Clearance: ${((hydraulics.casingInnerDiameterIn - ct.outerDiameterIn) / 2).toFixed(3)}" radial gap • Return Velocity: ${Math.round(results.annularVelocityFtMin)} ft/min (${Math.round(results.annularVelocityMMin)} m/min) • Hole Cleaning Index: ${results.cuttingsTransportEfficiencyPercent.toFixed(0)}%`}
                    industryStandard="API Spec 5CT / SPE 68440"
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={isMetric ? Number(inToMm(hydraulics.casingInnerDiameterIn).toFixed(1)) : hydraulics.casingInnerDiameterIn}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 4.892;
                    setHydraulics({
                      ...hydraulics,
                      casingInnerDiameterIn: isMetric ? mmToIn(val) : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none text-xs"
                />
              </div>

              {/* Well Depth */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-[11px]">
                    Well Depth {isMetric ? '(m)' : '(ft)'}
                  </label>
                  <EngineeringTooltip
                    parameter="Wellbore Measured Depth"
                    symbol="MD"
                    physicsFormula="ΔP_annulus = (dP/dL)_ann · MD,  P_hydro = 0.052 · ρ · MD"
                    physicsExplanation="Total along-hole length of the wellbore from surface to the bottom-hole assembly. Dictates cumulative annular return friction backpressure."
                    operationalImpact="Deeper wells generate higher annular backpressure and equivalent circulating density (ECD), narrowing the operational safety window against formation breakdown."
                    liveContext={`Depth: ${hydraulics.wellboreDepthFt.toLocaleString()} ft (${Math.round(ftToM(hydraulics.wellboreDepthFt)).toLocaleString()} m) • Annular Friction: ${Math.round(results.annularPressureDropPsi)} psi (${Math.round(psiToBar(results.annularPressureDropPsi))} bar)`}
                    industryStandard="ICoTA Well Planning Manual"
                  />
                </div>
                <input
                  type="number"
                  step="100"
                  value={isMetric ? Math.round(ftToM(hydraulics.wellboreDepthFt)) : hydraulics.wellboreDepthFt}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 10000;
                    setHydraulics({
                      ...hydraulics,
                      wellboreDepthFt: isMetric ? mToFt(val) : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none text-xs"
                />
              </div>

              {/* Surface Pump Backpressure */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 text-[11px]">
                    Backpressure {isMetric ? '(bar)' : '(psi)'}
                  </label>
                  <EngineeringTooltip
                    parameter="Surface Wellhead Backpressure"
                    symbol="P_choke / P_surface"
                    physicsFormula="P_pump = ΔP_CT + ΔP_nozzle + ΔP_annulus + P_surface"
                    physicsExplanation="Pressure maintained at the wellhead surface choke manifold or separator. Accounts for surface choke restriction, wellhead shut-in tubing pressure (SITP), or underbalanced manifold backpressure."
                    operationalImpact="Adds psi-for-psi directly to the required pump discharge pressure and raises the internal-to-external differential burst loading across the tubing wall."
                    liveContext={`Surface Backpressure: ${hydraulics.pumpSurfacePressurePsi.toLocaleString()} psi (${Math.round(psiToBar(hydraulics.pumpSurfacePressurePsi))} bar) • Total Circulating: ${Math.round(results.totalCirculatingPressurePsi).toLocaleString()} psi`}
                    industryStandard="API RP 16ST §5"
                  />
                </div>
                <input
                  type="number"
                  step="50"
                  value={isMetric ? Math.round(psiToBar(hydraulics.pumpSurfacePressurePsi)) : hydraulics.pumpSurfacePressurePsi}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setHydraulics({
                      ...hydraulics,
                      pumpSurfacePressurePsi: isMetric ? barToPsi(val) : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Hydraulics Waterfall & Reel Curvature Ito Physics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pressure Drop Waterfall Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Circulating Pressure Distribution
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                Total: {isMetric ? Math.round(results.totalCirculatingPressureBar) + ' bar' : Math.round(results.totalCirculatingPressurePsi).toLocaleString() + ' psi'}
              </span>
            </div>

            {/* Visual Step-by-Step Flowpath */}
            <div className="space-y-3 text-xs">
              {/* 1. Coiled Tubing Internal Friction */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold font-mono text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Tubing Internal Friction Loss (&Delta;P<sub>CT</sub>)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Inside {ct.outerDiameterIn.toFixed(3)}" CT ({ct.totalLengthFt.toLocaleString()} ft continuous string)
                    </span>
                    {activeFluid.frictionReductionPercent > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono mt-0.5 font-medium">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Polymer Drag Reduction active: -{activeFluid.frictionReductionPercent}% friction loss
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {isMetric
                      ? `${Math.round(results.pressureDropTubingBar)} bar`
                      : `${Math.round(results.pressureDropTubingPsi).toLocaleString()} psi`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {((results.pressureDropTubingPsi / results.totalCirculatingPressurePsi) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>

              {/* 2. Nozzle / BHA Differential */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold font-mono text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Nozzle Jet / BHA Pressure Drop (&Delta;P<sub>nozzle</sub>)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {hydraulics.nozzleCount} &times; {hydraulics.nozzleDiameterIn}" jet orifices (Cd = {hydraulics.nozzleCd})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {isMetric
                      ? `${Math.round(results.nozzlePressureDropBar)} bar`
                      : `${Math.round(results.nozzlePressureDropPsi).toLocaleString()} psi`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {((results.nozzlePressureDropPsi / results.totalCirculatingPressurePsi) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>

              {/* 3. Annular Friction Return */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Annulus Return Friction Loss (&Delta;P<sub>ann</sub>)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Between CT OD ({ct.outerDiameterIn.toFixed(3)}") and Casing ID ({hydraulics.casingInnerDiameterIn.toFixed(3)}")
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-purple-400 text-sm">
                    {isMetric
                      ? `${Math.round(psiToBar(results.annularPressureDropPsi))} bar`
                      : `${Math.round(results.annularPressureDropPsi).toLocaleString()} psi`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {((results.annularPressureDropPsi / results.totalCirculatingPressurePsi) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ito Reel Curvature Multiplier Callout */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800">
              <Compass className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Reel Curvature Dean Effect (Ito Multiplier)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Straight Pipe Friction</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  f = {results.frictionFactorStraight.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Churchill equation</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Reel Curvature Multiplier</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  &times; {results.itoReelCurvatureMultiplier.toFixed(2)} (+{Math.round((results.itoReelCurvatureMultiplier - 1) * 100)}%)
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Secondary swirl on drum</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Curved Pipe Friction</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  f = {results.frictionFactorCurvedReel.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Applied to spooled portion</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-[11px] text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Coiled tubing on the reel experiences centrifugal fluid swirling (Dean vortices), resulting in higher friction losses than straight jointed pipe. Coiled Matrix accounts for this curvature penalty when predicting standpipe pressure.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fluid Selection Library Search & Filter Modal */}
      <FluidLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        selectedFluidId={hydraulics.fluidType}
        onSelectFluid={handleSelectFluidFromLibrary}
        unitSystem={unitSystem}
      />
    </div>
  );
};
