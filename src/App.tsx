import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CoiledTubingString, UnitSystem, CalculationHistoryEntry } from './types/coiledTubing';
import { PRESET_STRINGS } from './data/presets';
import { createCalculationHistoryEntry } from './utils/engineeringCalculations';
import { Header } from './components/Header';
import { StringSpecsTab } from './components/StringSpecsTab';
import { WorkingEnvelopeTab } from './components/WorkingEnvelopeTab';
import { HydraulicsTab } from './components/HydraulicsTab';
import { WellboreForcesTab } from './components/WellboreForcesTab';
import { ReelCapacityTab } from './components/ReelCapacityTab';
import { FatigueLifeTab } from './components/FatigueLifeTab';
import { MtrCertificateModal } from './components/MtrCertificateModal';
import { PrintJobSheet } from './components/PrintJobSheet';
import { UnitConverterModal } from './components/UnitConverterModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { SensitivityAnalysisTab } from './components/SensitivityAnalysisTab';
import { CalculationHistorySidebar } from './components/CalculationHistorySidebar';
import { CoilMatrixLogo } from './components/CoilMatrixLogo';
import { 
  Ruler, 
  ShieldCheck, 
  Droplets, 
  Anchor, 
  Disc, 
  Flame, 
  Sliders,
  Award,
  Sparkles,
  ChevronRight,
  Calculator,
  History
} from 'lucide-react';

export default function App() {
  // Default to the user's uploaded Shinda CT90 test certificate string
  const [currentString, setCurrentString] = useState<CoiledTubingString>(PRESET_STRINGS[0]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [activeTab, setActiveTab] = useState<'specs' | 'envelope' | 'hydraulics' | 'forces' | 'reel' | 'fatigue' | 'sensitivity'>('specs');

  // Global Safety Factor multiplier for working envelope limit calculations (e.g., 0.80, 0.90)
  const [safetyFactor, setSafetyFactor] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('coiled_matrix_safety_factor');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.4 && parsed <= 1.0) return parsed;
      }
    } catch {
      // Fallback
    }
    return 0.80;
  });

  const [showNominalOverlay, setShowNominalOverlay] = useState<boolean>(true);

  const handleSafetyFactorChange = (newSf: number) => {
    const clamped = Math.max(0.4, Math.min(1.0, Math.round(newSf * 100) / 100));
    setSafetyFactor(clamped);
    try {
      localStorage.setItem('coiled_matrix_safety_factor', clamped.toString());
    } catch {
      // Ignore
    }
  };

  const [isMtrModalOpen, setIsMtrModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Calculation & Simulation History with localStorage persistence
  const [history, setHistory] = useState<CalculationHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('coiled_matrix_calc_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    // Seed initial baseline and benchmarks
    const baseline = createCalculationHistoryEntry(
      PRESET_STRINGS[0],
      'specs',
      'Certified Shinda CT90 Baseline (2.000" × 0.156")',
      'Mill Test Report #B21035 hydrotested at 75.9 MPa'
    );
    baseline.isBookmarked = true;

    const heavyWall: CoiledTubingString = {
      ...JSON.parse(JSON.stringify(PRESET_STRINGS[0])),
      name: 'High-Pressure Heavy Wall 2.000" CT100',
      wallThicknessIn: 0.175,
      yieldStrengthPsi: 100000,
      materialGrade: 'CT100',
    };
    const entryB = createCalculationHistoryEntry(
      heavyWall,
      'envelope',
      'Benchmark: Heavy Wall 2.000" CT100 × 0.175"',
      '100 ksi grade engineered for high circulating pressure stimulation'
    );

    return [baseline, entryB];
  });

  const handleUpdateHistory = (updated: CalculationHistoryEntry[]) => {
    setHistory(updated);
    try {
      localStorage.setItem('coiled_matrix_calc_history', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleSelectPresetString = (ct: CoiledTubingString) => {
    setCurrentString(ct);
    // Auto-record snapshot in calculation history
    const newEntry = createCalculationHistoryEntry(
      ct,
      activeTab,
      `Preset: ${ct.name}`
    );
    const updated = [newEntry, ...history.filter(h => h.title !== newEntry.title).slice(0, 49)];
    handleUpdateHistory(updated);
  };

  const handleLoadStringFromHistory = (ct: CoiledTubingString, targetTab?: string) => {
    setCurrentString(ct);
    if (targetTab && ['specs', 'envelope', 'hydraulics', 'forces', 'reel', 'fatigue', 'sensitivity'].includes(targetTab)) {
      setActiveTab(targetTab as any);
    }
  };

  const handleResetDefaults = () => {
    // Deep clone the factory default specification (SHINDA CT90 certified string)
    const factoryDefault: CoiledTubingString = JSON.parse(JSON.stringify(PRESET_STRINGS[0]));
    setCurrentString(factoryDefault);
    setResetKey((prev) => prev + 1);
  };

  const tabs = [
    { id: 'specs', label: 'String Geometry', icon: Ruler, subtitle: 'Dimensions, Weights, Capacity' },
    { id: 'envelope', label: 'Working Envelope', icon: ShieldCheck, subtitle: 'von Mises & Limits' },
    { id: 'hydraulics', label: 'Hydraulics (Hydra)', icon: Droplets, subtitle: 'Circulation & Ito Reel Effect' },
    { id: 'forces', label: 'Wellbore Forces', icon: Anchor, subtitle: '3D Simulation & Buckling' },
    { id: 'reel', label: 'Reel Spooling', icon: Disc, subtitle: 'Layers, Capacity & Weight' },
    { id: 'fatigue', label: 'Fatigue & Life', icon: Flame, subtitle: 'Achilles Bending Cycles' },
    { id: 'sensitivity', label: 'Sensitivity Analysis', icon: Sliders, subtitle: 'Batch Sweeps & Limits' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header with quick presets & unit controls */}
      <Header
        currentString={currentString}
        onSelectString={handleSelectPresetString}
        unitSystem={unitSystem}
        onToggleUnitSystem={() => setUnitSystem((prev) => (prev === 'imperial' ? 'metric' : 'imperial'))}
        onOpenMtrModal={() => setIsMtrModalOpen(true)}
        onOpenConverter={() => setIsConverterOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onResetDefaults={() => setIsResetModalOpen(true)}
        onPrint={() => setIsPrintModalOpen(true)}
        safetyFactor={safetyFactor}
        onSafetyFactorChange={handleSafetyFactorChange}
        showNominalOverlay={showNominalOverlay}
        onToggleNominalOverlay={() => setShowNominalOverlay((prev) => !prev)}
      />

      {/* Floating Quick-Access History Drawer Tab on Right Edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 no-print">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="bg-slate-900/90 hover:bg-cyan-950/90 text-cyan-400 hover:text-cyan-300 border-l border-y border-cyan-500/40 rounded-l-xl p-2.5 shadow-xl backdrop-blur transition-all flex flex-col items-center gap-1 group hover:pr-3.5 hover:shadow-cyan-950/50"
          title="Open Simulation & Calculation History Panel"
        >
          <History className="w-4 h-4 group-hover:rotate-[-20deg] transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 py-1 text-slate-300 group-hover:text-white">
            History
          </span>
          {history.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[9px] flex items-center justify-center">
              {history.length > 9 ? '9+' : history.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Certificate Alert Banner if Shinda CT90 is active */}
        {currentString.certificateRef && (
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Certified String Loaded
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    SHINDA MTR PASS
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Shaft #{currentString.certificateRef.shaftNo} &bull; String {currentString.certificateRef.stringNo} &bull; 75.9 MPa Hydrotest Verified &bull; 8 Strip Sections
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMtrModalOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg flex items-center gap-1.5 transition-colors self-end sm:self-auto shrink-0"
            >
              <span>View Certified Test Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-print">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center sm:justify-start ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50 border border-cyan-400/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="text-left hidden sm:block">
                  <div className="leading-tight">{tab.label}</div>
                  <div className={`text-[10px] font-normal ${isActive ? 'text-cyan-100' : 'text-slate-500'}`}>
                    {tab.subtitle}
                  </div>
                </div>
                <span className="sm:hidden">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body with smooth fade-in and slide-up animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${resetKey}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'specs' && (
              <StringSpecsTab
                ct={currentString}
                onChangeString={setCurrentString}
                unitSystem={unitSystem}
              />
            )}

            {activeTab === 'envelope' && (
              <WorkingEnvelopeTab
                ct={currentString}
                onChangeString={setCurrentString}
                unitSystem={unitSystem}
                safetyFactor={safetyFactor}
                showNominalOverlay={showNominalOverlay}
                onChangeSafetyFactor={handleSafetyFactorChange}
                onToggleNominalOverlay={() => setShowNominalOverlay((prev) => !prev)}
              />
            )}

            {activeTab === 'hydraulics' && (
              <HydraulicsTab
                ct={currentString}
                unitSystem={unitSystem}
              />
            )}

            {activeTab === 'forces' && (
              <WellboreForcesTab
                ct={currentString}
                unitSystem={unitSystem}
              />
            )}

            {activeTab === 'reel' && (
              <ReelCapacityTab
                ct={currentString}
                onChangeString={setCurrentString}
                unitSystem={unitSystem}
              />
            )}

            {activeTab === 'fatigue' && (
              <FatigueLifeTab
                ct={currentString}
                unitSystem={unitSystem}
                onSelectString={setCurrentString}
              />
            )}

            {activeTab === 'sensitivity' && (
              <SensitivityAnalysisTab
                ct={currentString}
                unitSystem={unitSystem}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 text-slate-500 text-xs py-4 px-6 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CoilMatrixLogo size="sm" showSubtitle={false} />
            <span className="hidden md:inline-block text-slate-600">|</span>
            <span className="hidden md:inline-block text-[11px] text-slate-400 font-sans">
              Advanced Data Acquisition System &bull; Coiled Tubing Engineering Suite
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsConverterOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40"
              title="Open Oilfield Unit Converter"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Unit Converter</span>
            </button>
            <span className="font-mono text-[11px] text-slate-400">
              API Spec 5ST &bull; ASTM A370 &bull; Barlow & von Mises Formulations
            </span>
          </div>
        </div>
      </footer>

      {/* Certified Mill Test Report Inspection Modal */}
      <MtrCertificateModal
        ct={currentString}
        isOpen={isMtrModalOpen}
        onClose={() => setIsMtrModalOpen(false)}
        unitSystem={unitSystem}
      />

      {/* Printable Engineering Job Sheet Modal */}
      <PrintJobSheet
        ct={currentString}
        unitSystem={unitSystem}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Standalone Oilfield Unit Converter Utility Sidebar */}
      <UnitConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />

      {/* Reset to Factory Defaults Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetDefaults}
        defaultStringName={PRESET_STRINGS[0].name}
      />

      {/* Calculation & Simulation History Sidebar */}
      <CalculationHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentString={currentString}
        unitSystem={unitSystem}
        activeTab={activeTab}
        onLoadString={handleLoadStringFromHistory}
        history={history}
        onUpdateHistory={handleUpdateHistory}
      />
    </div>
  );
}
