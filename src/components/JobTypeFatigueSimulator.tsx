import React, { useState } from 'react';
import { CoiledTubingString, UnitSystem, AchillesFatigueResult } from '../types/coiledTubing';
import { CoiledTubingJobType, CoiledTubingJobTypeId } from '../types/jobTypes';
import { COILED_TUBING_JOB_TYPES, getJobTypeById } from '../data/jobTypePresets';
import { 
  psiToMpa, 
  lbfToKn, 
  ftToM, 
  mToFt, 
  inToMm 
} from '../utils/engineeringCalculations';
import { useToast } from '../context/ToastContext';
import { 
  Flame, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  RotateCcw, 
  Layers, 
  Scissors, 
  Clock, 
  Gauge, 
  Droplet,
  ArrowRight
} from 'lucide-react';

interface JobTypeFatigueSimulatorProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  achilles: AchillesFatigueResult;
  onUpdateString?: (updated: CoiledTubingString) => void;
  onSelectJobPressure?: (pressurePsi: number) => void;
}

export const JobTypeFatigueSimulator: React.FC<JobTypeFatigueSimulatorProps> = ({
  ct,
  unitSystem,
  achilles,
  onUpdateString,
  onSelectJobPressure,
}) => {
  const isMetric = unitSystem === 'metric';
  const { addToast } = useToast();

  const [selectedJobId, setSelectedJobId] = useState<CoiledTubingJobTypeId>('acidizing_stimulation');
  const selectedJob = getJobTypeById(selectedJobId);

  // Job Run Parameters
  const [jobDepthFt, setJobDepthFt] = useState<number>(Math.min(ct.totalLengthFt, 12500));
  const [pumpPressurePsi, setPumpPressurePsi] = useState<number>(selectedJob.typicalPumpPressurePsi);
  const [reciprocationCycles, setReciprocationCycles] = useState<number>(12);
  const [tripsPerJob, setTripsPerJob] = useState<number>(2);

  // Switch job type handler
  const handleSelectJobType = (jobId: CoiledTubingJobTypeId) => {
    setSelectedJobId(jobId);
    const job = getJobTypeById(jobId);
    setPumpPressurePsi(job.typicalPumpPressurePsi);
    if (onSelectJobPressure) {
      onSelectJobPressure(job.typicalPumpPressurePsi);
    }
  };

  // Calculate Fatigue consumed by this specific job run
  // Baseline trip damage is achilles.tripDamagePercent
  // Reciprocations over interval add local bending through reel/gooseneck or wellbore doglegs
  const baseTripDamage = achilles.tripDamagePercent * tripsPerJob;
  const reciprocationDamage = (achilles.tripDamagePercent * 0.45) * (reciprocationCycles / 10);
  const totalJobDeltaFatigue = (baseTripDamage + reciprocationDamage) * selectedJob.fatigueAccelerationMultiplier;

  // Current string fatigue
  const currentFatiguePercent = ct.usedCondition?.enabled 
    ? ct.usedCondition.fatigueLifeUsedPercent 
    : achilles.accumulatedUsedLifePercent;

  const postJobFatiguePercent = Math.min(100, currentFatiguePercent + totalJobDeltaFatigue);

  // Remaining safe jobs before 80% retirement threshold
  const remainingFatigueMargin = Math.max(0, 80 - currentFatiguePercent);
  const remainingJobsOfThisType = totalJobDeltaFatigue > 0 
    ? Math.floor(remainingFatigueMargin / totalJobDeltaFatigue) 
    : 99;

  // Commit job run to string condition
  const handleCommitJobRun = () => {
    if (!onUpdateString) {
      addToast({
        title: 'String Update Handler Missing',
        message: 'Unable to commit job to active string.',
        severity: 'warning',
      });
      return;
    }

    const currentUsed = ct.usedCondition || {
      enabled: true,
      wallLossPercent: 0,
      diametralGrowthPercent: 0,
      actualOvalityPercent: 1.0,
      fatigueLifeUsedPercent: 0,
      corrosionPittingGrade: 'none',
      hasWeldInSection: false,
      weldType: 'none',
      weldEfficiencyFactor: 1.0,
      h2sExposure: false,
    };

    const newWallLoss = Math.min(25, currentUsed.wallLossPercent + selectedJob.abrasionWearRatePercentPerJob);
    const newBallooningPercent = Math.min(4.0, currentUsed.diametralGrowthPercent + (selectedJob.ballooningGrowthThouPerJob / 1000 / ct.outerDiameterIn) * 100);

    const updated: CoiledTubingString = {
      ...ct,
      usedCondition: {
        ...currentUsed,
        enabled: true,
        fatigueLifeUsedPercent: Math.round(postJobFatiguePercent * 10) / 10,
        wallLossPercent: Math.round(newWallLoss * 100) / 100,
        diametralGrowthPercent: Math.round(newBallooningPercent * 100) / 100,
        corrosionPittingGrade: selectedJob.corrosionRisk === 'severe' ? 'moderate' : currentUsed.corrosionPittingGrade,
        notes: `Logged Job: ${selectedJob.name} (${tripsPerJob} trips, ${reciprocationCycles} cycles @ ${pumpPressurePsi} psi).`,
      },
    };

    onUpdateString(updated);

    addToast({
      title: 'Job Committed to String History',
      message: `Logged ${selectedJob.name}. Added +${totalJobDeltaFatigue.toFixed(1)}% fatigue. String is now at ${postJobFatiguePercent.toFixed(1)}% total fatigue.`,
      severity: postJobFatiguePercent >= 80 ? 'error' : 'success',
      autoDismissMs: 5000,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Job Type Selection Carousel / Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            Select Coiled Tubing Job Type:
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {COILED_TUBING_JOB_TYPES.length} Industry Standard Job Presets
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {COILED_TUBING_JOB_TYPES.map((job) => {
            const isSelected = selectedJobId === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => handleSelectJobType(job.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-900/20 ring-1 ring-cyan-500'
                    : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                      job.category === 'stimulation'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : job.category === 'milling'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : job.category === 'nitrogen'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {job.category}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                      {job.fatigueAccelerationMultiplier}&times; LCF
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-snug mt-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {job.name}
                  </h4>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Typ. {job.typicalPumpPressurePsi} psi</span>
                  <span className={job.corrosionRisk === 'severe' ? 'text-rose-400' : 'text-slate-400'}>
                    {job.corrosionRisk} risk
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Job Operational Specs & Simulation Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Job Parameters & Engineering Risks */}
        <div className="lg:col-span-2 space-y-4">
          {/* Job Overview Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{selectedJob.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedJob.description}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-xs border border-slate-700">
                Factor: {selectedJob.fatigueAccelerationMultiplier}&times;
              </span>
            </div>

            {/* Parameter sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 font-mono text-xs">
              <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400 font-medium">Max Pump Pressure:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {pumpPressurePsi.toLocaleString()} psi
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="8000"
                  step="250"
                  value={pumpPressurePsi}
                  onChange={(e) => setPumpPressurePsi(parseInt(e.target.value) || 0)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 font-sans block">
                  Hoop stress ratio &sigma;<sub>h</sub>/S<sub>y</sub>: {((pumpPressurePsi * ct.outerDiameterIn) / (2 * ct.wallThicknessIn * ct.minimumYieldStrengthPsi) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400 font-medium">Interval Reciprocations:</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {reciprocationCycles} passes
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="2"
                  value={reciprocationCycles}
                  onChange={(e) => setReciprocationCycles(parseInt(e.target.value) || 0)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 font-sans block">
                  Short-stroke cyclic passes across tight work interval
                </span>
              </div>
            </div>

            {/* Best Practices & Key Operational Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg space-y-1.5">
                <span className="font-bold text-rose-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Key Fatigue &amp; Failure Risks
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {selectedJob.keyRisks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400">&bull;</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-lg space-y-1.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wide">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  Recommended Best Practices
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {selectedJob.bestPractices.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">&bull;</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Real-Time Job Impact & Commit Card */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-sans font-bold text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Job Fatigue Impact
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800">
                1 Run Analysis
              </span>
            </div>

            {/* Big Delta Stat */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">
                Fatigue Consumed By This Job (&Delta;LCF)
              </span>
              <div className="text-2xl font-bold text-amber-400">
                +{totalJobDeltaFatigue.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                Baseline trip: {baseTripDamage.toFixed(2)}% &bull; Reciprocations: {reciprocationDamage.toFixed(2)}%
              </div>
            </div>

            {/* Post Job Fatigue Gauge */}
            <div className="space-y-1.5 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Post-Job Cumulative Fatigue:</span>
                <span className={`font-mono font-bold ${
                  postJobFatiguePercent >= 80 ? 'text-rose-400' : 'text-cyan-300'
                }`}>
                  {postJobFatiguePercent.toFixed(1)}% / 80%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    postJobFatiguePercent >= 80 
                      ? 'bg-rose-500' 
                      : postJobFatiguePercent >= 60 
                      ? 'bg-amber-500' 
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, postJobFatiguePercent)}%` }}
                />
              </div>
            </div>

            {/* Remaining Jobs Forecast */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Remaining Jobs of This Type:</span>
                <span className={`text-base font-bold font-mono px-2 py-0.5 rounded ${
                  remainingJobsOfThisType <= 2
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : remainingJobsOfThisType <= 8
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}>
                  ~{remainingJobsOfThisType} Jobs
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                Based on 80% API RP 5C7 retirement threshold.
              </div>
            </div>

            {/* Commit Job Button */}
            <button
              type="button"
              onClick={handleCommitJobRun}
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Commit Job Run &amp; Update CT String</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
