import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  CoiledTubingString,
  UnitSystem,
  AchillesMaterialGrade,
  FatigueOperationRecord,
  OperationCategory,
} from '../types/coiledTubing';
import {
  calculateOperationFatigue,
  psiToBar,
  barToPsi,
  psiToMpa,
  ftToM,
  mToFt,
} from '../utils/engineeringCalculations';
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Flame,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Compass,
  Gauge,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface FatigueOperationsLogProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
  selectedGrade: AchillesMaterialGrade;
  failureCriterion: 'initiation' | 'fracture';
  onSyncTripsToMain?: (totalTrips: number, totalFU: number) => void;
}

// Initial realistic field operational history for CT string
const SEED_OPERATIONS_TEMPLATE: Omit<
  FatigueOperationRecord,
  'id' | 'fatigueUnitsConsumed' | 'cumulativeFatigueUnits' | 'cumulativeBendingCycles'
>[] = [
  {
    date: '2025-05-26',
    wellName: 'PEP Zone 14- OCD',
    category: 'cleanout',
    description: 'COSL Reel-Trak Cerberus™ 14.5.16 Job (Pertamina Z-14): 15,659 running ft',
    maxDepthFt: 11275,
    maxDepthM: 3437,
    circulatingPressurePsi: 0,
    circulatingPressureBar: 0,
    trips: 1,
    reciprocations: 3,
    bendingCycles: 24,
    notes: 'Cerberus™ 14.5.16 locked job: 1.05% max fatigue, 15,659 running ft. 24 bending events @ 6,585 ft from free end. Operator: COSL PO on 5/26/2025.',
  },
  {
    date: '2026-01-14',
    wellName: 'Permian Alpha-1',
    category: 'cleanout',
    description: 'Post-frac sand cleanout with slickwater to PBTD',
    maxDepthFt: 11500,
    maxDepthM: 3505,
    circulatingPressurePsi: 2600,
    circulatingPressureBar: 179,
    trips: 1,
    reciprocations: 2,
    bendingCycles: 14,
    notes: 'Cleanout to 11,500 ft; returned 18 bbls frac sand. Normal drag.',
  },
  {
    date: '2026-02-03',
    wellName: 'Permian Alpha-1',
    category: 'acid_stimulation',
    description: '15% HCl matrix acid wash across perforated interval',
    maxDepthFt: 11500,
    maxDepthM: 3505,
    circulatingPressurePsi: 4900,
    circulatingPressureBar: 338,
    trips: 1,
    reciprocations: 4,
    bendingCycles: 22,
    notes: 'High pump pressure; corrosion inhibitor mixed at 4 gal/1000.',
  },
  {
    date: '2026-03-11',
    wellName: 'Permian Bravo-4',
    category: 'nitrogen_kickoff',
    description: 'Nitrogen gas lift unloading to restore artificial lift flow',
    maxDepthFt: 8400,
    maxDepthM: 2560,
    circulatingPressurePsi: 1900,
    circulatingPressureBar: 131,
    trips: 1,
    reciprocations: 0,
    bendingCycles: 6,
    notes: 'Low pressure N2 lift run. Well unloaded in 4 hours.',
  },
  {
    date: '2026-04-18',
    wellName: 'Delaware Deep-2',
    category: 'milling',
    description: 'Motor & mill run to remove composite bridge plugs (4 plugs)',
    maxDepthFt: 13800,
    maxDepthM: 4206,
    circulatingPressurePsi: 4200,
    circulatingPressureBar: 290,
    trips: 2,
    reciprocations: 8,
    bendingCycles: 44,
    notes: '4 composite plugs milled. Reciprocated 8 times over tight spots.',
  },
  {
    date: '2026-05-27',
    wellName: 'Delaware Deep-2',
    category: 'cleanout',
    description: 'Final conditioning cleanout and drift run before completion',
    maxDepthFt: 13800,
    maxDepthM: 4206,
    circulatingPressurePsi: 3100,
    circulatingPressureBar: 214,
    trips: 1,
    reciprocations: 2,
    bendingCycles: 14,
    notes: 'Gel pill sweeps circulated. Verified clean returns.',
  },
  {
    date: '2026-07-09',
    wellName: 'Gulf Coast J-9',
    category: 'velocity_string',
    description: 'Chemical water shutoff treatment and wash over intervals',
    maxDepthFt: 9600,
    maxDepthM: 2926,
    circulatingPressurePsi: 3500,
    circulatingPressureBar: 241,
    trips: 1,
    reciprocations: 4,
    bendingCycles: 22,
    notes: 'Successful chemical placement. Polymer wash completed.',
  },
];

export const FatigueOperationsLog: React.FC<FatigueOperationsLogProps> = ({
  ct,
  unitSystem,
  selectedGrade,
  failureCriterion,
  onSyncTripsToMain,
}) => {
  const isMetric = unitSystem === 'metric';
  const storageKey = useMemo(() => `ct_fatigue_ops_log_${ct.name.replace(/\s+/g, '_')}`, [ct.name]);

  // Compute seed records dynamically using current string specs
  const seedRecords = useMemo((): FatigueOperationRecord[] => {
    let cumFU = 0;
    let cumCycles = 0;

    return SEED_OPERATIONS_TEMPLATE.map((item, idx) => {
      const calc = calculateOperationFatigue(
        ct,
        item.circulatingPressurePsi,
        item.trips,
        item.reciprocations,
        selectedGrade,
        failureCriterion
      );
      cumFU += calc.deltaFatigueUnits;
      cumCycles += calc.bendingCycles;

      return {
        ...item,
        id: `seed-op-${idx + 1}`,
        fatigueUnitsConsumed: calc.deltaFatigueUnits,
        cumulativeFatigueUnits: Number(cumFU.toFixed(2)),
        cumulativeBendingCycles: cumCycles,
      };
    });
  }, [ct, selectedGrade, failureCriterion]);

  // Initialize operations from localStorage or seed
  const [operations, setOperations] = useState<FatigueOperationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved operations log, loading defaults:', err);
    }
    return seedRecords;
  });

  // Re-calculate running cumulative stats whenever operations, string, or grade changes
  const recalculatedOperations = useMemo(() => {
    let cumFU = 0;
    let cumCycles = 0;

    return operations.map((op) => {
      const calc = calculateOperationFatigue(
        ct,
        op.circulatingPressurePsi,
        op.trips,
        op.reciprocations,
        selectedGrade,
        failureCriterion
      );
      cumFU += calc.deltaFatigueUnits;
      cumCycles += calc.bendingCycles;

      return {
        ...op,
        fatigueUnitsConsumed: calc.deltaFatigueUnits,
        cumulativeFatigueUnits: Number(cumFU.toFixed(2)),
        cumulativeBendingCycles: cumCycles,
      };
    });
  }, [operations, ct, selectedGrade, failureCriterion]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recalculatedOperations));
    } catch (err) {
      console.error('Failed to save operations log to localStorage:', err);
    }
  }, [recalculatedOperations, storageKey]);

  // Modal / Form state for adding new operation
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWellName, setNewWellName] = useState('Offshore Well B-17');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState<OperationCategory>('cleanout');
  const [newDepth, setNewDepth] = useState<number>(isMetric ? 3000 : 10000);
  const [newPressure, setNewPressure] = useState<number>(isMetric ? 200 : 3000);
  const [newTrips, setNewTrips] = useState<number>(1);
  const [newRecip, setNewRecip] = useState<number>(2);
  const [newNotes, setNewNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Live preview calculation for the modal form
  const modalLiveCalc = useMemo(() => {
    const pressurePsi = isMetric ? barToPsi(newPressure) : newPressure;
    return calculateOperationFatigue(
      ct,
      pressurePsi,
      newTrips,
      newRecip,
      selectedGrade,
      failureCriterion
    );
  }, [ct, isMetric, newPressure, newTrips, newRecip, selectedGrade, failureCriterion]);

  // Cumulative metrics
  const totalCumulativeFU = useMemo(() => {
    if (recalculatedOperations.length === 0) return 0;
    return recalculatedOperations[recalculatedOperations.length - 1].cumulativeFatigueUnits;
  }, [recalculatedOperations]);

  const totalCumulativeTrips = useMemo(() => {
    return recalculatedOperations.reduce((acc, op) => acc + op.trips, 0);
  }, [recalculatedOperations]);

  const totalCumulativeCycles = useMemo(() => {
    return recalculatedOperations.reduce((acc, op) => acc + op.bendingCycles, 0);
  }, [recalculatedOperations]);

  const remainingFUToRetirement = Math.max(0, Number((80 - totalCumulativeFU).toFixed(2)));
  const remainingFUToFailure = Math.max(0, Number((100 - totalCumulativeFU).toFixed(2)));

  // Average FU per operation
  const avgFuPerOp = useMemo(() => {
    if (recalculatedOperations.length === 0) return 3.5;
    return Number((totalCumulativeFU / recalculatedOperations.length).toFixed(2));
  }, [totalCumulativeFU, recalculatedOperations.length]);

  const estimatedOpsRemainingToRetirement =
    avgFuPerOp > 0 ? Math.max(0, Math.floor(remainingFUToRetirement / avgFuPerOp)) : 0;

  // Retirement Status tier
  const retirementStatus = useMemo(() => {
    if (totalCumulativeFU >= 100) {
      return {
        level: 'condemned',
        label: 'STRING CONDEMNED (≥ 100 FU)',
        badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-600',
        textClass: 'text-rose-400',
        bannerClass: 'bg-rose-950/40 border-rose-500/60',
        icon: AlertOctagon,
        description: 'FATAL DAMAGE LIMIT REACHED. String through-wall fracture or burst is imminent. String must be decommissioned immediately.',
      };
    }
    if (totalCumulativeFU >= 80) {
      return {
        level: 'retired',
        label: 'MANDATORY RETIREMENT LIMIT EXCEEDED (≥ 80 FU)',
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
        textClass: 'text-rose-400',
        bannerClass: 'bg-rose-950/30 border-rose-500/50',
        icon: AlertOctagon,
        description: 'MANDATORY RETIREMENT CRITERIA REACHED per API RP 5C7. Tubing is condemned from live-well high-pressure operations. Relegate to low-pressure velocity strings or scrap.',
      };
    }
    if (totalCumulativeFU >= 60) {
      return {
        level: 'warning',
        label: 'INSPECTION ADVISED / DERATING WATCH (60–80 FU)',
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        textClass: 'text-amber-400',
        bannerClass: 'bg-amber-950/30 border-amber-500/50',
        icon: AlertTriangle,
        description: 'HIGH FATIGUE EXPOSURE. Perform 100% full-length electromagnetic inspection (EMI) & wall thickness ultrasonic verification before subsequent operations.',
      };
    }
    return {
      level: 'safe',
      label: 'FIT FOR ACTIVE FIELD OPERATIONS (< 60 FU)',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      textClass: 'text-emerald-400',
      bannerClass: 'bg-emerald-950/20 border-emerald-500/30',
      icon: ShieldCheck,
      description: 'HEALTHY STRING INTEGRITY. Cumulative bending fatigue consumption is within safe operating envelope.',
    };
  }, [totalCumulativeFU]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return [
      {
        step: 0,
        name: 'Initial String',
        date: 'Day 0',
        cumulativeFU: 0,
        deltaFU: 0,
        cycles: 0,
        well: 'New String',
      },
      ...recalculatedOperations.map((op, idx) => ({
        step: idx + 1,
        name: `Job #${idx + 1} (${op.wellName})`,
        date: op.date,
        cumulativeFU: op.cumulativeFU,
        deltaFU: op.fatigueUnitsConsumed,
        cycles: op.cumulativeBendingCycles,
        well: op.wellName,
        category: op.category,
        pressure: isMetric ? `${op.circulatingPressureBar ?? 0} bar` : `${(op.circulatingPressurePsi ?? 0).toLocaleString()} psi`,
        depth: isMetric ? `${(op.maxDepthM ?? 0).toLocaleString()} m` : `${(op.maxDepthFt ?? 0).toLocaleString()} ft`,
      })),
    ];
  }, [recalculatedOperations, isMetric]);

  // Filtered operations for display
  const filteredOperations = useMemo(() => {
    return recalculatedOperations.filter((op) => {
      const matchesCategory = filterCategory === 'all' || op.category === filterCategory;
      const matchesSearch =
        op.wellName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op.description && op.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (op.notes && op.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [recalculatedOperations, filterCategory, searchTerm]);

  // Handlers
  const handleAddOperation = (e: React.FormEvent) => {
    e.preventDefault();

    const pressurePsi = isMetric ? barToPsi(newPressure) : newPressure;
    const pressureBar = isMetric ? newPressure : psiToBar(newPressure);
    const depthFt = isMetric ? mToFt(newDepth) : newDepth;
    const depthM = isMetric ? newDepth : ftToM(newDepth);

    const calc = calculateOperationFatigue(
      ct,
      pressurePsi,
      newTrips,
      newRecip,
      selectedGrade,
      failureCriterion
    );

    const newOp: FatigueOperationRecord = {
      id: `op-${Date.now()}`,
      date: newDate,
      wellName: newWellName.trim() || 'Unnamed Well',
      category: newCategory,
      description: `${newCategory.replace('_', ' ').toUpperCase()} at ${isMetric ? `${depthM} m` : `${depthFt} ft`}`,
      maxDepthFt: Math.round(depthFt),
      maxDepthM: Math.round(depthM),
      circulatingPressurePsi: Math.round(pressurePsi),
      circulatingPressureBar: Math.round(pressureBar),
      trips: newTrips,
      reciprocations: newRecip,
      bendingCycles: calc.bendingCycles,
      fatigueUnitsConsumed: calc.deltaFatigueUnits,
      cumulativeFatigueUnits: Number((totalCumulativeFU + calc.deltaFatigueUnits).toFixed(2)),
      cumulativeBendingCycles: totalCumulativeCycles + calc.bendingCycles,
      notes: newNotes.trim() || undefined,
    };

    setOperations((prev) => [...prev, newOp]);
    setIsAddModalOpen(false);
    setNewNotes('');
  };

  const handleDeleteOperation = (id: string) => {
    if (window.confirm('Are you sure you want to remove this operational log entry?')) {
      setOperations((prev) => prev.filter((op) => op.id !== id));
    }
  };

  const handleResetToDemo = () => {
    if (window.confirm('Reset operational log to standard certified string demo history?')) {
      setOperations(seedRecords);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all logged operations for this string? This will reset cumulative fatigue to 0 FU.')) {
      setOperations([]);
    }
  };

  const handleExportCsv = () => {
    if (recalculatedOperations.length === 0) return;

    const headers = [
      'Job #',
      'Date',
      'Well Name',
      'Category',
      'Max Depth (ft)',
      'Max Depth (m)',
      'Circulating Pressure (psi)',
      'Circulating Pressure (bar)',
      'In/Out Trips',
      'Reciprocations',
      'Bending Cycles (2N)',
      'Delta Fatigue Units (FU)',
      'Cumulative Fatigue Units (FU)',
      'Cumulative Bending Cycles',
      'Field Notes',
    ];

    const rows = recalculatedOperations.map((op, idx) => [
      idx + 1,
      `"${op.date}"`,
      `"${op.wellName}"`,
      `"${op.category}"`,
      op.maxDepthFt,
      op.maxDepthM,
      op.circulatingPressurePsi,
      op.circulatingPressureBar,
      op.trips,
      op.reciprocations,
      op.bendingCycles,
      op.fatigueUnitsConsumed,
      op.cumulativeFatigueUnits,
      op.cumulativeBendingCycles,
      `"${(op.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${ct.name.replace(/\s+/g, '_')}_Fatigue_Operations_Log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyPreset = (preset: {
    category: OperationCategory;
    wellName: string;
    depthFt: number;
    depthM: number;
    pressurePsi: number;
    pressureBar: number;
    trips: number;
    recip: number;
    notes: string;
  }) => {
    const calc = calculateOperationFatigue(
      ct,
      preset.pressurePsi,
      preset.trips,
      preset.recip,
      selectedGrade,
      failureCriterion
    );

    const newOp: FatigueOperationRecord = {
      id: `preset-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      wellName: preset.wellName,
      category: preset.category,
      description: `Field ${preset.category.replace('_', ' ')} job`,
      maxDepthFt: preset.depthFt,
      maxDepthM: preset.depthM,
      circulatingPressurePsi: preset.pressurePsi,
      circulatingPressureBar: preset.pressureBar,
      trips: preset.trips,
      reciprocations: preset.recip,
      bendingCycles: calc.bendingCycles,
      fatigueUnitsConsumed: calc.deltaFatigueUnits,
      cumulativeFatigueUnits: Number((totalCumulativeFU + calc.deltaFatigueUnits).toFixed(2)),
      cumulativeBendingCycles: totalCumulativeCycles + calc.bendingCycles,
      notes: preset.notes,
    };

    setOperations((prev) => [...prev, newOp]);
  };

  const StatusIcon = retirementStatus.icon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: String Retirement Management Header & Status */}
      <div className={`p-4 rounded-xl border ${retirementStatus.bannerClass} backdrop-blur-md shadow-sm transition-all`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg border ${retirementStatus.badgeClass} shrink-0`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  String Retirement Management
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${retirementStatus.badgeClass}`}>
                  {retirementStatus.label}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  API RP 5C7 80 FU Limit
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {retirementStatus.description}
              </p>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Log Operation</span>
            </button>

            {onSyncTripsToMain && (
              <button
                type="button"
                onClick={() => onSyncTripsToMain(totalCumulativeTrips, totalCumulativeFU)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition-all"
                title="Sync total trips from operational history to the main fatigue calculator"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sync Trips ({totalCumulativeTrips})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={recalculatedOperations.length === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Export operational history as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDemo}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Reset to certified string demo operations"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Retirement Progress Bar with Threshold Markers */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Cumulative Fatigue Life Consumed:</span>
              <strong className={`text-sm ${retirementStatus.textClass}`}>
                {totalCumulativeFU.toFixed(1)} FU ({totalCumulativeFU.toFixed(1)}%)
              </strong>
            </span>
            <span className="text-slate-400">
              Remaining to 80 FU Retirement: <strong className="text-emerald-400">{remainingFUToRetirement.toFixed(1)} FU</strong>
            </span>
          </div>

          <div className="relative w-full bg-slate-950 h-5 rounded-full overflow-hidden border border-slate-800 p-0.5">
            {/* 60% Marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 opacity-70"
              style={{ left: '60%' }}
              title="60% Action Threshold"
            />
            {/* 80% Retirement line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 opacity-90 shadow-sm shadow-rose-500"
              style={{ left: '80%' }}
              title="80% Mandatory Retirement Threshold"
            />

            {/* Filled bar */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalCumulativeFU >= 80
                  ? 'bg-rose-500 shadow-lg shadow-rose-500/50'
                  : totalCumulativeFU >= 60
                  ? 'bg-gradient-to-r from-cyan-500 via-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, totalCumulativeFU)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0 FU (Brand New)</span>
            <span className="text-slate-400">40 FU Mid-Life</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span>▲</span> 60 FU (Inspection Action)
            </span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span>▲</span> 80 FU (Retirement Threshold)
            </span>
            <span className="text-slate-500">100 FU (Fracture)</span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Cumulative String Fatigue Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cumulative FU Consumed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cumulative Fatigue</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${retirementStatus.textClass}`}>
            {totalCumulativeFU.toFixed(2)} FU
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{totalCumulativeTrips} full trips</span>
            <span>{totalCumulativeFU.toFixed(1)}% of 100 FU</span>
          </div>
        </div>

        {/* Remaining to 80 FU Retirement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Retirement Margin (80 FU)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {remainingFUToRetirement.toFixed(1)} FU
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalCumulativeFU >= 80 ? (
              <span className="text-rose-400 font-bold">Retirement limit reached</span>
            ) : (
              <span>~{estimatedOpsRemainingToRetirement} average jobs left</span>
            )}
          </div>
        </div>

        {/* Total Bending Cycles (2N) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Bending Cycles</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {(totalCumulativeCycles ?? 0).toLocaleString()} rev
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across reel & guide arch reversals
          </div>
        </div>

        {/* Operations Logged */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Operations Logged</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {recalculatedOperations.length} Jobs
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Avg: {avgFuPerOp} FU / operation
          </div>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold">Quick Job Presets:</span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Quick-log standard field operations with pre-calculated cycles
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                category: 'cleanout',
                wellName: 'Field Well Cleanout',
                depthFt: 10500,
                depthM: 3200,
                pressurePsi: 2800,
                pressureBar: 193,
                trips: 1,
                recip: 2,
                notes: 'Standard wellbore sand cleanout with fluid sweeps',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors font-mono text-[11px]"
          >
            + Cleanout (2.8k psi)
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                category: 'milling',
                wellName: 'Milling Job Pass',
                depthFt: 12400,
                depthM: 3780,
                pressurePsi: 4200,
                pressureBar: 290,
                trips: 1,
                recip: 6,
                notes: 'Scale / bridge plug milling with 6 reciprocations at depth',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors font-mono text-[11px]"
          >
            + Milling (4.2k psi, 6 recips)
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                category: 'acid_stimulation',
                wellName: 'Acid Frac Run',
                depthFt: 11000,
                depthM: 3350,
                pressurePsi: 5200,
                pressureBar: 358,
                trips: 1,
                recip: 4,
                notes: 'High-pressure acid stimulation across interval',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors font-mono text-[11px]"
          >
            + Acid Frac (5.2k psi)
          </button>

          <button
            type="button"
            onClick={() =>
              handleApplyPreset({
                category: 'nitrogen_kickoff',
                wellName: 'N2 Kickoff Pass',
                depthFt: 8500,
                depthM: 2590,
                pressurePsi: 1800,
                pressureBar: 124,
                trips: 1,
                recip: 0,
                notes: 'Nitrogen unloading displacement run',
              })
            }
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors font-mono text-[11px]"
          >
            + N2 Kickoff (1.8k psi)
          </button>
        </div>
      </div>

      {/* Cumulative Fatigue Units Progression Chart (Recharts) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Cumulative Fatigue Units (FU) Trajectory vs Operations
            </h4>
            <p className="text-[11px] text-slate-400">
              Progression towards 80 FU Retirement Limit & 100 FU Fracture Life under multiaxial Manson-Coffin cycling
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Cumulative FU
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" /> 80 FU Limit
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-500 inline-block" /> 60 FU Action
            </span>
          </div>
        </div>

        <div className="w-full h-[280px] bg-slate-950/80 rounded-lg p-2 select-none border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="fuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="step"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{
                  value: 'Operation Sequence (Job #)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <YAxis
                stroke="#64748b"
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${v} FU`}
                label={{
                  value: 'Fatigue Units (FU)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />

              {/* 80 FU Mandatory Retirement Limit */}
              <ReferenceLine
                y={80}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: '80 FU Mandatory Retirement Threshold',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* 60 FU Inspection Watch */}
              <ReferenceLine
                y={60}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: '60 FU Inspection Watch',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
                      <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>{d.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
                      </div>
                      {d.well && (
                        <div className="text-slate-300 font-mono text-[11px]">
                          Well: <strong className="text-cyan-300">{d.well}</strong>
                        </div>
                      )}
                      {d.depth && (
                        <div className="text-slate-400 font-mono text-[11px]">
                          Depth: {d.depth} | Press: {d.pressure}
                        </div>
                      )}
                      <div className="text-amber-400 font-mono text-[11px]">
                        Job Consumed: +{d.deltaFU?.toFixed(2)} FU
                      </div>
                      <div className="text-cyan-300 font-bold font-mono text-sm pt-1 border-t border-slate-800 flex justify-between">
                        <span>Cumulative:</span>
                        <span>{d.cumulativeFU?.toFixed(2)} FU</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cumulative Cycles: {d.cycles?.toLocaleString()} rev
                      </div>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="cumulativeFU"
                name="Cumulative FU"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#fuGradient)"
                dot={{ r: 3, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operations Log History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Operational Job History Log ({filteredOperations.length} of {recalculatedOperations.length} records)
            </h4>
            <p className="text-[11px] text-slate-400">
              Audit log of all bending events, pumping pressures, and resulting Fatigue Units consumed
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Search well or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none placeholder:text-slate-600 w-36 sm:w-44"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Operations</option>
              <option value="cleanout">Cleanouts</option>
              <option value="milling">Milling & Drilling</option>
              <option value="acid_stimulation">Acid Stimulation</option>
              <option value="nitrogen_kickoff">Nitrogen Kickoff</option>
              <option value="velocity_string">Velocity String</option>
              <option value="fishing">Fishing</option>
              <option value="logging">Logging Runs</option>
              <option value="pressure_pumping">Pressure Pumping</option>
            </select>

            {recalculatedOperations.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition-colors"
                title="Clear all log records"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* The Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-y border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Well & Type</th>
                <th className="py-2.5 px-3">Max Depth</th>
                <th className="py-2.5 px-3">Pressure</th>
                <th className="py-2.5 px-3">Trips / Recip</th>
                <th className="py-2.5 px-3">Cycles</th>
                <th className="py-2.5 px-3 text-right">&Delta; Fatigue Units</th>
                <th className="py-2.5 px-3 text-right">Cumulative FU</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No matching operations logged. Click &quot;Log Operation&quot; or use Quick Presets to add field operations.
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op, idx) => {
                  const isExceeding80 = op.cumulativeFatigueUnits >= 80;
                  const isWarning60 = op.cumulativeFatigueUnits >= 60;

                  return (
                    <tr key={op.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{op.date}</td>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{op.wellName}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                            {op.category.replace('_', ' ')}
                          </span>
                        </div>
                        {op.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs" title={op.notes}>
                            {op.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {isMetric ? `${(op.maxDepthM ?? 0).toLocaleString()} m` : `${(op.maxDepthFt ?? 0).toLocaleString()} ft`}
                      </td>
                      <td className="py-2 px-3 text-amber-400 whitespace-nowrap">
                        {isMetric ? `${op.circulatingPressureBar ?? 0} bar` : `${(op.circulatingPressurePsi ?? 0).toLocaleString()} psi`}
                      </td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        <span className="text-white font-bold">{op.trips}</span> trip{op.trips !== 1 ? 's' : ''}
                        {op.reciprocations > 0 && (
                          <span className="text-slate-400 text-[10px] block">
                            +{op.reciprocations} arch recips
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {op.bendingCycles} rev
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-400 whitespace-nowrap">
                        +{op.fatigueUnitsConsumed.toFixed(2)} FU
                      </td>
                      <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                        <span
                          className={`${
                            isExceeding80
                              ? 'text-rose-400 font-bold'
                              : isWarning60
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {op.cumulativeFatigueUnits.toFixed(2)} FU
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                            isExceeding80
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : isWarning60
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {isExceeding80 ? 'Retired' : isWarning60 ? 'Derated' : 'Safe'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteOperation(op.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition-colors"
                          title="Delete operation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOperations.length > 0 && (
              <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-mono text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 font-sans font-bold text-white text-right">
                    Total Cumulative Totals:
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                    {totalCumulativeTrips} Trips
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                    {(totalCumulativeCycles ?? 0).toLocaleString()} rev
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-400">
                    &mdash;
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-cyan-400 text-sm whitespace-nowrap">
                    {totalCumulativeFU.toFixed(2)} FU
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-center font-sans text-[11px] text-slate-400">
                    {totalCumulativeFU >= 80 ? 'String Retired' : `${remainingFUToRetirement.toFixed(1)} FU Left to 80 FU`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Engineering Guidelines Callout */}
      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>API RP 5C7 & Achilles 4.0 Coiled Tubing Fatigue Management Protocol</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          &bull; <strong>1 Fatigue Unit (FU)</strong> represents 1% of total string low-cycle fatigue (LCF) life consumed under multiaxial cyclic plastic bending over the reel and guide arch.
          <br />
          &bull; <strong>80 Fatigue Units (80%) Mandatory Retirement Limit:</strong> Under API Recommended Practice 5C7 and CTES industry standards, coiled tubing strings must be retired from live-well high-pressure service upon reaching 80 FU to prevent sudden through-wall rupture or parting downhole.
          <br />
          &bull; <strong>Reciprocations & Pressure Multiplier:</strong> Short strokes across the guide arch at depth contribute 4 bending reversals per reciprocation cycle. Elevated pumping pressures significantly accelerate plastic hoop strain, resulting in steep increases in &Delta;FU per operation.
        </p>
      </div>

      {/* Log Operation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Log Coiled Tubing Operation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddOperation} className="space-y-4 text-xs">
              {/* Row 1: Well Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Well Name / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={newWellName}
                    onChange={(e) => setNewWellName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. Well A-14 Deep"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Operation Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category & Max Depth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Operation Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as OperationCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="cleanout">Wellbore Cleanout</option>
                    <option value="milling">Scale / Plug Milling</option>
                    <option value="acid_stimulation">Acid Stimulation</option>
                    <option value="nitrogen_kickoff">Nitrogen Lift / Kickoff</option>
                    <option value="velocity_string">Velocity String / Wash</option>
                    <option value="fishing">Fishing Operation</option>
                    <option value="logging">Logging Pass</option>
                    <option value="pressure_pumping">Pressure Pumping</option>
                    <option value="other">Other Field Operation</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Max Operating Depth ({isMetric ? 'm' : 'ft'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={isMetric ? 10 : 50}
                    value={newDepth}
                    onChange={(e) => setNewDepth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Operating Pressure, Full Trips & Arch Reciprocations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Pump Pressure ({isMetric ? 'bar' : 'psi'}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={isMetric ? 700 : 10000}
                    step={isMetric ? 10 : 100}
                    value={newPressure}
                    onChange={(e) => setNewPressure(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Avg pressure during cycling
                  </span>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Full In/Out Trips</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value={newTrips}
                    onChange={(e) => setNewTrips(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    6 reversals per trip
                  </span>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Arch Reciprocations</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={newRecip}
                    onChange={(e) => setNewRecip(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    4 reversals per stroke
                  </span>
                </div>
              </div>

              {/* Field Notes */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Field Observations / Operational Remarks</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Returned sand, high friction over curve, inhibitor pumped..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none text-xs"
                />
              </div>

              {/* Live Calculation Preview Card */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300 font-sans font-semibold border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Achilles 4.0 Pre-Job Impact Assessment
                  </span>
                  <span className="text-amber-400">
                    +{modalLiveCalc.deltaFatigueUnits.toFixed(2)} Fatigue Units (FU)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Bending Cycles:</span>
                    <span className="text-white font-bold">{modalLiveCalc.bendingCycles} rev</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Damage / Trip:</span>
                    <span className="text-slate-300">{modalLiveCalc.damagePerTripPercent.toFixed(3)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">New Cum. FU:</span>
                    <span className="text-cyan-300 font-bold">
                      {(totalCumulativeFU + modalLiveCalc.deltaFatigueUnits).toFixed(1)} FU
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Retirement Margin:</span>
                    <span
                      className={`font-bold ${
                        80 - (totalCumulativeFU + modalLiveCalc.deltaFatigueUnits) <= 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {Math.max(0, 80 - (totalCumulativeFU + modalLiveCalc.deltaFatigueUnits)).toFixed(1)} FU
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-95 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Operation to Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
