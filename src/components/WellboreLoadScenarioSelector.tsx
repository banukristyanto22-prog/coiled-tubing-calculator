import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Wrench,
  Gauge,
  Compass,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Flame,
  Activity
} from 'lucide-react';
import {
  LoadScenarioId,
  WellboreLoadScenario,
  WELLBORE_LOAD_SCENARIOS,
} from '../data/wellboreLoadScenarios';
import { UnitSystem } from '../types/coiledTubing';

interface WellboreLoadScenarioSelectorProps {
  activeScenarioId: LoadScenarioId | 'custom';
  onSelectScenario: (scenario: WellboreLoadScenario) => void;
  onResetToBaseline: () => void;
  unitSystem: UnitSystem;
}

export const WellboreLoadScenarioSelector: React.FC<WellboreLoadScenarioSelectorProps> = ({
  activeScenarioId,
  onSelectScenario,
  onResetToBaseline,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const scenarioList = Object.values(WELLBORE_LOAD_SCENARIOS);
  const activeScenario =
    activeScenarioId !== 'custom' ? WELLBORE_LOAD_SCENARIOS[activeScenarioId] : null;

  const getScenarioIcon = (id: LoadScenarioId) => {
    switch (id) {
      case 'normal_run':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'stuck_pipe':
        return <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'high_drag':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'hp_snubbing':
        return <Gauge className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'heavy_milling':
        return <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'extended_reach':
        return <Compass className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return <Sliders className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getRiskChip = (risk: 'Low' | 'Moderate' | 'Elevated' | 'Critical') => {
    switch (risk) {
      case 'Low':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            LOW RISK
          </span>
        );
      case 'Moderate':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
            MODERATE
          </span>
        );
      case 'Elevated':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            ELEVATED
          </span>
        );
      case 'Critical':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
            CRITICAL LIMIT
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Wellbore Load Scenarios
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                PRESET SELECTOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly populate forces, friction factors, depths, and stress variables for simulation testing
            </p>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {activeScenario ? (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${activeScenario.badgeColor.bg} ${activeScenario.badgeColor.border} ${activeScenario.badgeColor.text}`}
            >
              {getScenarioIcon(activeScenario.id)}
              <span className="font-semibold">{activeScenario.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Custom Variables</span>
            </div>
          )}

          <button
            type="button"
            onClick={onResetToBaseline}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Reset to Normal Run baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Reset Baseline</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>{isDetailsOpen ? 'Hide Details' : 'Details'}</span>
            {isDetailsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenarioList.map((scenario) => {
          const isSelected = activeScenarioId === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSelectScenario(scenario)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? `${scenario.badgeColor.bg} ${scenario.badgeColor.border} ring-2 ${scenario.badgeColor.ring} shadow-md`
                  : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getScenarioIcon(scenario.id)}
                    <span
                      className={`text-xs font-bold leading-snug ${
                        isSelected ? scenario.badgeColor.text : 'text-white'
                      }`}
                    >
                      {scenario.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {scenario.tagline}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">
                  &mu; = {scenario.forcesInput.frictionCoefficientCasing.toFixed(2)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold ${
                    scenario.category === 'critical_limit'
                      ? 'bg-rose-500/20 text-rose-300'
                      : scenario.category === 'contingency'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {scenario.category === 'critical_limit'
                    ? 'CRITICAL'
                    : scenario.category === 'contingency'
                    ? 'WARN'
                    : 'NORMAL'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Scenario Details & Engineering Rationale */}
      {activeScenario && isDetailsOpen && (
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3.5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Scenario Configuration Matrix:
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border ${activeScenario.badgeColor.bg} ${activeScenario.badgeColor.text} ${activeScenario.badgeColor.border}`}
              >
                {activeScenario.badge}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Lockup & Stress Risk:</span>
              {getRiskChip(activeScenario.expectedOutcomes.operationalRisk)}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {activeScenario.description}
          </p>

          {/* Quick Parameters Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {activeScenario.keyVariablesList.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border font-mono ${
                  item.danger
                    ? 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                    : item.highlight
                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <span className="text-[10px] font-sans text-slate-400 block mb-0.5">
                  {item.label}
                </span>
                <span className="font-bold">
                  {isMetric ? item.valueMetric : item.valueImperial}
                </span>
              </div>
            ))}
          </div>

          {/* Expected Engineering Outcomes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Surface Hookload Dynamics</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeScenario.expectedOutcomes.hookloadSummary}
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Stress & Elasticity Envelope</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeScenario.expectedOutcomes.stressProfile}
              </p>
            </div>
          </div>

          {/* Engineering Standards Note */}
          <div className="flex items-start gap-2 p-2.5 bg-slate-900/90 rounded-lg border border-cyan-500/20 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-cyan-300">Engineering Standard Note: </strong>
              {activeScenario.engineeringNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
