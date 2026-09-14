import React, { useState, useMemo } from 'react';
import { CoiledTubingString, UnitSystem, AchillesMaterialGrade } from '../types/coiledTubing';
import { 
  calculateAchillesFatigue, 
  mapGradeToAchilles,
  psiToMpa,
  psiToBar,
  inToMm,
  solveMansonCoffinCycles
} from '../utils/engineeringCalculations';
import { ACHILLES_LCF_MATERIALS, PRESET_STRINGS } from '../data/presets';
import { 
  Flame, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  GitCommit,
  Gauge,
  HelpCircle,
  FileSpreadsheet,
  LineChart
} from 'lucide-react';
import { FatigueOperationsLog } from './FatigueOperationsLog';
import { FatigueDetailChart } from './FatigueDetailChart';

interface FatigueLifeTabProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  onSelectString?: (ct: CoiledTubingString) => void;
}

export const FatigueLifeTab: React.FC<FatigueLifeTabProps> = ({
  ct,
  unitSystem,
  onSelectString,
}) => {
  const isMetric = unitSystem === 'metric';

  // State
  const defaultGrade = useMemo(() => mapGradeToAchilles(ct.grade), [ct.grade]);
  const [selectedGrade, setSelectedGrade] = useState<AchillesMaterialGrade>(defaultGrade);
  const [failureCriterion, setFailureCriterion] = useState<'fracture' | 'initiation'>('fracture');
  const [internalPressurePsi, setInternalPressurePsi] = useState<number>(3500);
  const [tripsRun, setTripsRun] = useState<number>(28);
  const [showTable1Details, setShowTable1Details] = useState<boolean>(false);
  const [activeTabSubView, setActiveTabSubView] = useState<'detail' | 'events' | 'curve' | 'welds' | 'operationsLog'>('detail');

  // Calculate Achilles 4.0 Fatigue
  const achilles = useMemo(() => {
    return calculateAchillesFatigue(
      ct,
      internalPressurePsi,
      tripsRun,
      selectedGrade,
      failureCriterion
    );
  }, [ct, internalPressurePsi, tripsRun, selectedGrade, failureCriterion]);

  // Handler to select preset string
  const handleSelectPresetByName = (presetName: string) => {
    const found = PRESET_STRINGS.find((p) => p.name === presetName);
    if (found && onSelectString) {
      onSelectString(found);
    }
  };

  const matParams = achilles.materialParams;
  const activeLcf = failureCriterion === 'fracture' ? matParams.fracture : matParams.initiation;

  // Generate Manson-Coffin Curve points for SVG plot
  const curvePoints = useMemo(() => {
    const points: { cycles2N: number; strainAmpPercent: number }[] = [];
    // log space from 2N = 10^1 to 10^7
    for (let logN = 1.0; logN <= 6.5; logN += 0.15) {
      const cycles2N = Math.pow(10, logN);
      const elasticStrain = (activeLcf.sigmaFPrimeKsi / matParams.eKsi) * Math.pow(cycles2N, activeLcf.b);
      const plasticStrain = activeLcf.epsilonFPrime * Math.pow(cycles2N, activeLcf.c);
      const totalStrain = elasticStrain + plasticStrain;
      points.push({
        cycles2N,
        strainAmpPercent: totalStrain * 100,
      });
    }
    return points;
  }, [matParams, activeLcf]);

  // SVG dimensions & scales for strain-life curve (log-log)
  const svgWidth = 540;
  const svgHeight = 240;
  const margin = { top: 20, right: 30, bottom: 40, left: 55 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const minLogX = 1; // 10^1
  const maxLogX = 6.5; // 10^6.5
  const minLogY = -1; // 0.1% strain
  const maxLogY = 1.5; // ~31.6% strain

  const scaleX = (val2N: number) => {
    const logVal = Math.log10(Math.max(10, val2N));
    return margin.left + ((logVal - minLogX) / (maxLogX - minLogX)) * innerWidth;
  };

  const scaleY = (strainPercent: number) => {
    const logVal = Math.log10(Math.max(0.1, strainPercent));
    return margin.top + innerHeight - ((logVal - minLogY) / (maxLogY - minLogY)) * innerHeight;
  };

  const pathD = curvePoints
    .map((pt, i) => {
      const x = scaleX(pt.cycles2N);
      const y = scaleY(pt.strainAmpPercent);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Reel & Gooseneck operating points for plot
  const reelEvent = achilles.events.find((e) => e.name.includes('Reel'));
  const gooseEvent = achilles.events.find((e) => e.name.includes('Gooseneck'));

  return (
    <div className="space-y-6">
      {/* Header Citation & Algorithmic Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Achilles 4.0 CT Fatigue Life Algorithm
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  TFATIGUE Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Steven M. Tipton, Ph.D., P.E. (The University of Tulsa / CTES, L.P.) • Multiaxial Manson-Coffin Formulation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Failure Criterion Toggle */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setFailureCriterion('fracture')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  failureCriterion === 'fracture'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Through-Wall Fracture
              </button>
              <button
                type="button"
                onClick={() => setFailureCriterion('initiation')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  failureCriterion === 'initiation'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crack Initiation
              </button>
            </div>

            {/* Material Grade Selection (Table 1) */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">LCF Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as AchillesMaterialGrade)}
                className="bg-transparent text-amber-400 font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value="QT-700" className="bg-slate-900 text-white">QT-700 (Sy: 70 ksi)</option>
                <option value="QT-800" className="bg-slate-900 text-white">QT-800 (Sy: 80 ksi)</option>
                <option value="QT-900" className="bg-slate-900 text-white">QT-900 (Sy: 90 ksi)</option>
                <option value="QT-1000" className="bg-slate-900 text-white">QT-1000 (Sy: 100 ksi)</option>
                <option value="QT-1200" className="bg-slate-900 text-white">QT-1200 (Sy: 120 ksi)</option>
                <option value="HS-90" className="bg-slate-900 text-white">HS-90 (Sy: 90 ksi)</option>
                <option value="HS-110" className="bg-slate-900 text-white">HS-110 (Sy: 110 ksi)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fatigue Life Consumed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Fatigue Consumed</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${
            achilles.accumulatedUsedLifePercent >= 80
              ? 'text-rose-400'
              : achilles.accumulatedUsedLifePercent >= 60
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}>
            {achilles.accumulatedUsedLifePercent.toFixed(1)}% Used
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{tripsRun} trips run so far</span>
            <button
              type="button"
              onClick={() => setActiveTabSubView('operationsLog')}
              className="text-cyan-400 hover:text-cyan-300 font-sans hover:underline flex items-center gap-1"
              title="Open Operations Fatigue Log"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Ops Log (80 FU)</span>
            </button>
          </div>
        </div>

        {/* Total Trip Capacity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Total Trip Life (100%)</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {achilles.estimatedTotalTripCycles} Trips
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            {achilles.remainingTrips} trips remaining
          </div>
        </div>

        {/* Peak Bending Strain Range Delta eps_x */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Bending Strain (&Delta;&epsilon;<sub>x</sub>)</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {Math.max(achilles.deltaEpsXReelPercent, achilles.deltaEpsXGooseneckPercent).toFixed(3)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Reel: {achilles.deltaEpsXReelPercent.toFixed(3)}% | Arch: {achilles.deltaEpsXGooseneckPercent.toFixed(3)}%
          </div>
        </div>

        {/* Diametral Ballooning & Wall Thinning (Tipton Eq 8 / 10 / 11) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Tipton Diametral Growth</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            +{isMetric 
              ? `${(achilles.ballooningGrowthEstimatedIn * 25.4).toFixed(3)} mm` 
              : `${achilles.ballooningGrowthEstimatedIn.toFixed(4)}" `}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Wall Thinning: -{achilles.wallThinningPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls & Parameters Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Working History & Pumping Pressure
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Trips Run Counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Accumulated In/Out Well Trips</label>
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {tripsRun} Trips
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(120, Math.round(achilles.estimatedTotalTripCycles * 1.2))}
                step="1"
                value={tripsRun}
                onChange={(e) => setTripsRun(parseInt(e.target.value) || 0)}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0</span>
                <span>Trip Damage: {achilles.tripDamagePercent.toFixed(3)}%/trip</span>
                <span>{Math.round(achilles.estimatedTotalTripCycles * 1.2)}</span>
              </div>
            </div>

            {/* Average Circulating Pressure */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Internal Pressure During Cycling (P)</label>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {isMetric 
                    ? `${Math.round(psiToMpa(internalPressurePsi))} MPa (${Math.round(psiToBar(internalPressurePsi))} bar)` 
                    : `${internalPressurePsi.toLocaleString()} psi`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="250"
                value={internalPressurePsi}
                onChange={(e) => setInternalPressurePsi(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Hoop stress &sigma;<sub>h</sub> = {Math.round(achilles.hoopStressPsi).toLocaleString()} psi ({Math.round(achilles.hoopStressRatio * 100)}% of S<sub>y</sub>)
              </span>
            </div>

            {/* Extrapolation Envelope Check (Table 2 PEFR & PEFP) */}
            <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
              achilles.isExtrapolated 
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' 
                : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  CTES Extrapolation Envelope (Table 2)
                </span>
                {achilles.isExtrapolated ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                    EXTRAPOLATED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> IN ENVELOPE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Radius Factor (PEFR)</span>
                  <span className={achilles.pefrPercent > 0 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                    {achilles.pefrPercent}% {achilles.pefrPercent > 0 ? 'exceeded' : 'valid'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Pressure Factor (PEFP)</span>
                  <span className={achilles.pefpPercent > 0 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                    {achilles.pefpPercent}% {achilles.pefpPercent > 0 ? 'exceeded' : 'valid'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 block pt-1">
                {achilles.materialParams.pefBases.pts} empirical test fixture calibration points for {selectedGrade}.
              </span>
            </div>

            {/* Tubing Factor (TF) Callout */}
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Empirical Tubing Factor (TF):</span>
                <span className="font-mono font-bold text-cyan-300">{matParams.tf.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cyclic Hardening Exponent (n'):</span>
                <span className="font-mono text-slate-300">{matParams.nPrime.toFixed(5)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cyclic Strength Coeff (K'):</span>
                <span className="font-mono text-slate-300">{matParams.kPrimeKsi} ksi</span>
              </div>
            </div>

            {/* Toggle Table 1 Material LCF Inspector */}
            <button
              type="button"
              onClick={() => setShowTable1Details(!showTable1Details)}
              className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-between transition-colors text-xs"
            >
              <span className="font-medium">View Table 1 LCF Properties</span>
              {showTable1Details ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTable1Details && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px] font-mono animate-fadeIn">
                <div className="text-slate-400 border-b border-slate-800 pb-1 font-sans font-semibold">
                  Manson-Coffin Constants ({failureCriterion.toUpperCase()})
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fatigue Strength Coeff (&sigma;'<sub>f</sub>):</span>
                  <span className="text-white">{activeLcf.sigmaFPrimeKsi} ksi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fatigue Strength Exponent (b):</span>
                  <span className="text-white">{activeLcf.b}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fatigue Ductility Coeff (&epsilon;'<sub>f</sub>):</span>
                  <span className="text-white">{activeLcf.epsilonFPrime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fatigue Ductility Exponent (c):</span>
                  <span className="text-white">{activeLcf.c}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Elastic Modulus (E):</span>
                  <span className="text-white">{matParams.eKsi.toLocaleString()} ksi</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Life Progression & Interactive Visualizer Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          {/* Progress Bar & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                String Fatigue Life Progression
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated on {ct.name} ({ct.grade}, {ct.outerDiameterIn}" OD &times; {ct.wallThicknessIn}" WT)
              </p>
            </div>
            <span className={`px-3 py-1 rounded text-xs font-mono font-semibold border ${
              achilles.accumulatedUsedLifePercent >= 80
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : achilles.accumulatedUsedLifePercent >= 60
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {achilles.accumulatedUsedLifePercent >= 80 
                ? 'RETIREMENT IMMINENT (>=80%)' 
                : achilles.accumulatedUsedLifePercent >= 60 
                ? 'INSPECTION ADVISED (60-80%)' 
                : 'FIT FOR FIELD SERVICE'}
            </span>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Cumulative Damage Progress:</span>
              <span className="text-white font-bold text-sm">{achilles.accumulatedUsedLifePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  achilles.accumulatedUsedLifePercent >= 80
                    ? 'bg-rose-500'
                    : achilles.accumulatedUsedLifePercent >= 60
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, achilles.accumulatedUsedLifePercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0% New String</span>
              <span>50% Mid-Life</span>
              <span className="text-amber-400 font-semibold">80% Action Limit</span>
              <span className="text-rose-400 font-semibold">100% Failure</span>
            </div>
          </div>

          {/* Sub-view Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTabSubView('detail')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTabSubView === 'detail'
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Fatigue Detail Chart</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Length Profile
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('events')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTabSubView === 'events'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              6 Bending Events Breakdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('curve')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTabSubView === 'curve'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Manson-Coffin Strain-Life Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('welds')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTabSubView === 'welds'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              Bias Welds JIP Tracker
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('operationsLog')}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTabSubView === 'operationsLog'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Operations & Retirement Log</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                80 FU Limit
              </span>
            </button>
          </div>

          {/* Sub-view 0: Fatigue Detail Chart (Length Profile) */}
          {activeTabSubView === 'detail' && (
            <FatigueDetailChart
              ct={ct}
              unitSystem={unitSystem}
              achilles={achilles}
              tripsRun={tripsRun}
              internalPressurePsi={internalPressurePsi}
              onUpdateTrips={setTripsRun}
              onUpdatePressure={setInternalPressurePsi}
              onSelectPreset={handleSelectPresetByName}
            />
          )}

          {/* Sub-view 1: 6 Bending Events Breakdown */}
          {activeTabSubView === 'events' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-semibold">Tipton 6-Event Trip Cycle: </strong>
                  Every complete in/out well trip subjects each CT element to 6 discrete plastic bending events (3 RIH and 3 POOH). 
                  Each event contributes damage $F_i = 1 / 2N$ to the cumulative fatigue sum.
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-y border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Stage & Event</th>
                      <th className="py-2.5 px-3">Geometry</th>
                      <th className="py-2.5 px-3">Radius (R)</th>
                      <th className="py-2.5 px-3">&Delta;&epsilon;<sub>x</sub></th>
                      <th className="py-2.5 px-3">2N Life</th>
                      <th className="py-2.5 px-3 text-right">Event Damage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {achilles.events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-500">{ev.id}</td>
                        <td className="py-2 px-3 font-sans">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono mr-1.5 ${
                            ev.stage === 'RIH' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {ev.stage}
                          </span>
                          <span className="text-slate-200 font-medium">{ev.name}</span>
                          <span className="block text-[10px] text-slate-500 font-sans">{ev.description}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans">
                          {ev.name.includes('Reel') ? 'Reel Drum' : 'Guide Arch'}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {isMetric ? `${Math.round(inToMm(ev.bendingRadiusIn))} mm` : `${ev.bendingRadiusIn.toFixed(1)}"`}
                        </td>
                        <td className="py-2 px-3 text-amber-400 font-semibold">
                          {ev.deltaEpsilonXPercent.toFixed(3)}%
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {ev.cyclesToFailure2N.toLocaleString()} rev
                        </td>
                        <td className="py-2 px-3 text-right text-cyan-300 font-bold">
                          {ev.eventDamagePercent.toFixed(4)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-mono text-xs">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 font-sans font-bold text-white text-right">
                        Total Fatigue Damage Per In/Out Trip:
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-cyan-400">
                        {achilles.tripDamagePercent.toFixed(3)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Sub-view 2: Manson-Coffin Curve Visualizer */}
          {activeTabSubView === 'curve' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Manson-Coffin Strain-Life Curve for <strong className="text-white">{selectedGrade}</strong> ({failureCriterion})
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  &epsilon;<sub>a,eff</sub> = (&sigma;'<sub>f</sub>/E')(2N)<sup>b</sup> + &epsilon;'<sub>f</sub>(2N)<sup>c</sup>
                </span>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full bg-slate-950 rounded-xl p-3 border border-slate-800 relative">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto font-mono text-[9px]">
                  {/* Grid Lines */}
                  {[10, 100, 1000, 10000, 100000, 1000000].map((val) => {
                    const x = scaleX(val);
                    return (
                      <g key={val}>
                        <line x1={x} y1={margin.top} x2={x} y2={margin.top + innerHeight} stroke="#1e293b" strokeDasharray="2,2" />
                        <text x={x} y={margin.top + innerHeight + 14} fill="#64748b" textAnchor="middle">
                          10^{Math.log10(val)}
                        </text>
                      </g>
                    );
                  })}

                  {[0.1, 0.5, 1.0, 2.0, 5.0, 10.0].map((val) => {
                    const y = scaleY(val);
                    return (
                      <g key={val}>
                        <line x1={margin.left} y1={y} x2={margin.left + innerWidth} y2={y} stroke="#1e293b" strokeDasharray="2,2" />
                        <text x={margin.left - 6} y={y + 3} fill="#64748b" textAnchor="end">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Manson-Coffin Curve Path */}
                  <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

                  {/* Reel Bending Operating Point */}
                  {reelEvent && (
                    <g>
                      <circle
                        cx={scaleX(reelEvent.cyclesToFailure2N)}
                        cy={scaleY(reelEvent.effectiveStrainAmpPercent)}
                        r="6"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={scaleX(reelEvent.cyclesToFailure2N) + 8}
                        y={scaleY(reelEvent.effectiveStrainAmpPercent) - 8}
                        fill="#f59e0b"
                        fontWeight="bold"
                      >
                        Reel Bend (2N: {reelEvent.cyclesToFailure2N})
                      </text>
                    </g>
                  )}

                  {/* Gooseneck Bending Operating Point */}
                  {gooseEvent && (
                    <g>
                      <circle
                        cx={scaleX(gooseEvent.cyclesToFailure2N)}
                        cy={scaleY(gooseEvent.effectiveStrainAmpPercent)}
                        r="6"
                        fill="#a855f7"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={scaleX(gooseEvent.cyclesToFailure2N) + 8}
                        y={scaleY(gooseEvent.effectiveStrainAmpPercent) + 14}
                        fill="#a855f7"
                        fontWeight="bold"
                      >
                        Arch Bend (2N: {gooseEvent.cyclesToFailure2N})
                      </text>
                    </g>
                  )}

                  {/* Axis Titles */}
                  <text
                    x={margin.left + innerWidth / 2}
                    y={svgHeight - 6}
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    Reversals to Failure (2N) [Log Scale]
                  </text>
                  <text
                    transform={`rotate(-90) translate(-${margin.top + innerHeight / 2}, 16)`}
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    Strain Amplitude &epsilon;_{'{a,eff}'} (%)
                  </text>
                </svg>

                <div className="flex items-center justify-center gap-6 mt-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    <span>Manson-Coffin Curve</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span>Reel Drum Operating Point</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                    <span>Guide Arch Operating Point</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 3: Bias Welds JIP Tracker */}
          {activeTabSubView === 'welds' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-semibold">1995 Weld JIP Derating Factors (Achilles Model Page 13): </strong>
                  Factory bias strip welds have an empirical derating factor of ~0.92 (8% life reduction relative to base pipe). 
                  Orbital butt welds have a 0.77 factor, and manual butt welds have a 0.58 factor.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-sans text-slate-400 block mb-1">Base Tubing Body</span>
                  <span className="text-base font-bold text-white block">{achilles.estimatedTotalTripCycles} Trips</span>
                  <span className="text-[10px] text-emerald-400 font-sans">1.00 &times; Nominal Life</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-sans text-slate-400 block mb-1">Factory Bias Welds</span>
                  <span className="text-base font-bold text-amber-400 block">{achilles.biasWeldLifeTrips} Trips</span>
                  <span className="text-[10px] text-amber-400 font-sans">0.92 &times; (Derated 8%)</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-sans text-slate-400 block mb-1">Orbital Butt Welds</span>
                  <span className="text-base font-bold text-rose-400 block">{achilles.orbitalButtWeldLifeTrips} Trips</span>
                  <span className="text-[10px] text-rose-400 font-sans">0.77 &times; (Derated 23%)</span>
                </div>
              </div>

              {/* Certified String Bias Weld Breakdown if MTR exists */}
              {ct.certificateRef?.segments && ct.certificateRef.segments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    MTR Certified Bias Weld Locations ({ct.certificateRef.segments.length - 1} Strip Welds)
                  </span>
                  <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden text-xs">
                    {ct.certificateRef.segments.slice(0, -1).map((seg, idx) => {
                      const biasWeldUsedLife = Math.min(100, Number((tripsRun / achilles.biasWeldLifeTrips * 100).toFixed(1)));
                      return (
                        <div key={seg.id} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50">
                          <div>
                            <span className="font-semibold text-slate-200">
                              Bias Weld #{idx + 1} ({seg.stripNo} &rarr; {ct.certificateRef?.segments[idx + 1]?.stripNo})
                            </span>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              Position: {isMetric ? `${seg.biasWeldLocationM} m` : `${seg.biasWeldLocationFt.toLocaleString()} ft`} from core
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className={`font-bold ${
                              biasWeldUsedLife >= 80 ? 'text-rose-400' : biasWeldUsedLife >= 60 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {biasWeldUsedLife}% Used
                            </span>
                            <span className="block text-[10px] text-slate-500 font-sans">
                              {Math.max(0, achilles.biasWeldLifeTrips - tripsRun)} trips left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-view 4: Operations Fatigue Log & String Retirement */}
          {activeTabSubView === 'operationsLog' && (
            <FatigueOperationsLog
              ct={ct}
              unitSystem={unitSystem}
              selectedGrade={selectedGrade}
              failureCriterion={failureCriterion}
              onSyncTripsToMain={(trips) => setTripsRun(trips)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
