import React, { useState, useRef } from 'react';
import { FieldFatigueStep, FieldJointData, UnitSystem, CoiledTubingString } from '../../types/coiledTubing';
import { parseFatigueData, downloadTemplate, ParseResult } from '../../utils/fatigueFileHandler';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Check,
  Info,
  Sliders,
  Sparkles,
  Calculator,
  GitCommit
} from 'lucide-react';

interface FatigueImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (steps: FieldFatigueStep[], joints: FieldJointData[], fileName: string) => void;
  unitSystem: UnitSystem;
  stringNo: string;
  ct?: CoiledTubingString;
}

export const FatigueImportModal: React.FC<FatigueImportModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  unitSystem,
  stringNo,
  ct,
}) => {
  const isMetric = unitSystem === 'metric';
  const [importTab, setImportTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [autoCalcMissing, setAutoCalcMissing] = useState<boolean>(true);
  const [autoCalcBiasWelds, setAutoCalcBiasWelds] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFileRef = useRef<{ data: string | ArrayBuffer; isBinary: boolean } | null>(null);

  if (!isOpen) return null;

  const runParse = (data: string | ArrayBuffer, isBinary: boolean) => {
    lastFileRef.current = { data, isBinary };
    const result = parseFatigueData(data, isBinary, ct, {
      autoCalculateMissingFatigue: autoCalcMissing,
      autoGenerateBiasWelds: autoCalcBiasWelds,
    });
    setParsedPreview(result);
  };

  const reparseWithNewOptions = (newAutoCalc: boolean, newAutoWelds: boolean) => {
    if (lastFileRef.current) {
      const result = parseFatigueData(
        lastFileRef.current.data,
        lastFileRef.current.isBinary,
        ct,
        {
          autoCalculateMissingFatigue: newAutoCalc,
          autoGenerateBiasWelds: newAutoWelds,
        }
      );
      setParsedPreview(result);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    const isBinary = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (buffer) {
        runParse(buffer as any, isBinary);
      }
    };

    if (isBinary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleProcessPaste = () => {
    if (!pasteContent.trim()) return;
    setFileName('Pasted Clipboard Data');
    runParse(pasteContent, false);
  };

  const handleApply = () => {
    if (parsedPreview && parsedPreview.success && parsedPreview.steps.length > 0) {
      onApplyData(parsedPreview.steps, parsedPreview.joints, fileName || 'Imported Field Log');
      onClose();
    }
  };

  const standardFieldHeaders = [
    { label: 'Start Depth', desc: 'From / In Depth [ft or m]', key: 'Start Depth' },
    { label: 'End Depth', desc: 'To / Out Depth [ft or m]', key: 'End Depth' },
    { label: 'Type Fluid', desc: 'Fluid medium (e.g. Water, 15% HCl, N2 Foam)', key: 'Type Fluid' },
    { label: 'Circulating Pressure', desc: 'Pump / Circ pressure [psi or bar]', key: 'Circulating Pressure' },
    { label: 'Well Head Pressure', desc: 'WHP / Surface pressure [psi or bar]', key: 'Well Head Pressure' },
    { label: 'Weight', desc: 'Hookload / Tubing weight [lbs, klbs, kg]', key: 'Weight' },
    { label: 'Pump Rate', desc: 'Liquid rate [bpm or gpm]', key: 'Pump Rate' },
    { label: 'N2 Rate', desc: 'Nitrogen gas rate [scfm]', key: 'N2 Rate' },
    { label: '% Bending Fatigue', desc: 'Cyclic plastic LCF damage (auto-calculated if blank)', key: 'Bending' },
    { label: '% H2S Fatigue', desc: 'Sour/acid accelerated damage (auto-calculated if blank)', key: 'H2S' },
    { label: 'Est. Fatigue (%)', desc: 'Total damage = Bending + H2S (auto-calculated if blank)', key: 'Est' },
    { label: 'Bias Weld Coordinates', desc: 'Strip weld locations (auto-calculated from string taper)', key: 'Joint' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Update Fatigue with Actual Field Data</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Flexible Header Matching
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Import coiled tubing run logs, pumping records, or NDT fatigue surveys for string{' '}
                <span className="text-cyan-300 font-mono font-semibold">{stringNo}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Flexible Header Matching Capabilities Banner */}
        <div className="px-5 py-3 bg-cyan-950/30 border-b border-cyan-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Standard Field Column Headers Automatically Recognized:</span>
            </span>
            <span className="text-[11px] text-slate-400">Excel (.xlsx, .xls) &bull; CSV / TSV</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {standardFieldHeaders.map((hdr) => {
              const isDetected = parsedPreview?.detectedHeaders?.some((dh) =>
                dh.toLowerCase().includes(hdr.key.toLowerCase())
              );
              return (
                <span
                  key={hdr.label}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 border transition-colors ${
                    isDetected
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700 font-bold'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800'
                  }`}
                  title={hdr.desc}
                >
                  {isDetected ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />}
                  <span>{hdr.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Automated Input by Calculation Settings Bar */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Calculator className="w-4 h-4 text-fuchsia-400" />
            <span className="font-semibold text-white">Automate Input by Calculation:</span>
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={autoCalcMissing}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoCalcMissing(val);
                  reparseWithNewOptions(val, autoCalcBiasWelds);
                }}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-mono">
                Auto-calculate <strong className="text-cyan-300">% Bending</strong>, <strong className="text-emerald-300">% H2S</strong>, and <strong className="text-rose-300">Est. Fatigue (%)</strong>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={autoCalcBiasWelds}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoCalcBiasWelds(val);
                  reparseWithNewOptions(autoCalcMissing, val);
                }}
                className="rounded bg-slate-900 border-slate-700 text-fuchsia-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-mono">
                Auto-calculate <strong className="text-fuchsia-400">Bias Weld Coordinates</strong>
              </span>
            </label>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 pt-3 bg-slate-900/50 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setImportTab('upload')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              importTab === 'upload'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload File (.xlsx / .csv)</span>
          </button>
          <button
            type="button"
            onClick={() => setImportTab('paste')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              importTab === 'paste'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Paste from Excel / Clipboard</span>
          </button>
          <button
            type="button"
            onClick={() => setImportTab('templates')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              importTab === 'templates'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Field Templates & Presets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {importTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="p-3 bg-cyan-950 text-cyan-400 rounded-full mb-3 border border-cyan-800">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Drag & Drop your Field File here, or click to browse
                </h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV files. Standard headers like{' '}
                  <span className="text-cyan-300 font-mono">Start Depth</span>,{' '}
                  <span className="text-cyan-300 font-mono">End Depth</span>,{' '}
                  <span className="text-cyan-300 font-mono">Type Fluid</span>,{' '}
                  <span className="text-cyan-300 font-mono">Circulating Pressure</span>,{' '}
                  <span className="text-cyan-300 font-mono">Well Head Pressure</span>,{' '}
                  <span className="text-cyan-300 font-mono">Weight</span>,{' '}
                  <span className="text-cyan-300 font-mono">Pump Rate</span>, and{' '}
                  <span className="text-cyan-300 font-mono">N2 Rate</span> are automatically mapped.
                </p>
                {fileName && (
                  <div className="mt-4 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Loaded: {fileName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {importTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Copy cells from your spreadsheet (including headers) and paste here:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPasteContent(
                      `Start Depth\tEnd Depth\tType Fluid\tCirculating Pressure\tWell Head Pressure\tWeight\tPump Rate\tN2 Rate\tEst Fatigue (%)\tZone\n0\t5800\tWater\t2400\t350\t18500\t1.8\t0\t1.3\tSurface Reel Core\n5800\t8000\t15% HCl Acid\t4800\t1850\t26400\t2.4\t800\t9.1\tPeak Working Zone\n8000\t12000\tN2 Foam\t3900\t1400\t29800\t1.2\t1500\t5.5\tMid-Well Cleanout\n12000\t13500\tViscous Gel\t4200\t1650\t33500\t2.0\t0\t6.8\tPerforation Wash\n13500\t17000\tBrine 9.2 ppg\t3600\t1200\t38200\t1.5\t600\t5.1\tDeep Circulation\n17000\t25327\tWellbore Fluid\t2800\t900\t43500\t1.0\t0\t1.2\tDistal BHA Section`
                    );
                  }}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Insert Sample Field Data</span>
                </button>
              </div>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste tab-separated or comma-separated columns here...&#10;Start Depth	End Depth	Type Fluid	Circulating Pressure	Well Head Pressure	Weight	Pump Rate	N2 Rate	Est Fatigue (%)"
                rows={7}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="button"
                onClick={handleProcessPaste}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Parse Pasted Content</span>
              </button>
            </div>
          )}

          {importTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Pre-Formatted Excel & CSV Templates</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Pre-built templates featuring all standard column headers:{' '}
                  <span className="text-cyan-300 font-mono">Start Depth</span>,{' '}
                  <span className="text-cyan-300 font-mono">End Depth</span>,{' '}
                  <span className="text-cyan-300 font-mono">Type Fluid</span>,{' '}
                  <span className="text-cyan-300 font-mono">Circulating Pressure</span>,{' '}
                  <span className="text-cyan-300 font-mono">Well Head Pressure</span>,{' '}
                  <span className="text-cyan-300 font-mono">Weight</span>,{' '}
                  <span className="text-cyan-300 font-mono">Pump Rate</span>, and{' '}
                  <span className="text-cyan-300 font-mono">N2 Rate</span>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('xlsx', isMetric ? 'm' : 'ft')}
                    className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('csv', isMetric ? 'm' : 'ft')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download CSV Template (.csv)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Parse Result Summary & Preview Table */}
          {parsedPreview && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  parsedPreview.success
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {parsedPreview.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div className="text-xs">
                    <div className="font-semibold">{parsedPreview.message}</div>
                    {parsedPreview.success && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Detected Unit: <span className="text-cyan-300 uppercase font-bold">{parsedPreview.detectedUnit}</span> &bull; {parsedPreview.steps.length} intervals &bull; {parsedPreview.joints.length} bias welds
                      </div>
                    )}
                  </div>
                </div>
                {parsedPreview.success && (
                  <span className="px-2.5 py-1 rounded bg-emerald-900/80 text-white text-[11px] font-bold">
                    Ready to Apply
                  </span>
                )}
              </div>

              {/* Preview Table */}
              {parsedPreview.success && parsedPreview.steps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Extracted Field Data Preview ({parsedPreview.steps.length} intervals)
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Top 8 intervals shown
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-56 rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Start ({parsedPreview.detectedUnit})</th>
                          <th className="py-2 px-2.5">End ({parsedPreview.detectedUnit})</th>
                          <th className="py-2 px-2.5">Type Fluid</th>
                          <th className="py-2 px-2.5">Circ Press</th>
                          <th className="py-2 px-2.5">WHP</th>
                          <th className="py-2 px-2.5">Weight</th>
                          <th className="py-2 px-2.5 text-right">% Bending</th>
                          <th className="py-2 px-2.5 text-right">% H2S</th>
                          <th className="py-2 px-2.5 text-right">Est. Fatigue (%)</th>
                          <th className="py-2 px-2.5">Zone / Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {parsedPreview.steps.slice(0, 8).map((step, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-1.5 px-2.5 text-slate-300">{Math.round(step.startFt).toLocaleString()}</td>
                            <td className="py-1.5 px-2.5 text-slate-300">{Math.round(step.endFt).toLocaleString()}</td>
                            <td className="py-1.5 px-2.5 text-cyan-300 font-sans font-medium">{step.fluidType || '-'}</td>
                            <td className="py-1.5 px-2.5 text-amber-300">{step.circulatingPressurePsi ? `${step.circulatingPressurePsi.toLocaleString()} psi` : '-'}</td>
                            <td className="py-1.5 px-2.5 text-orange-300">{step.wellheadPressurePsi ? `${step.wellheadPressurePsi.toLocaleString()} psi` : '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-400">{step.hookloadWeightLbs ? `${Math.round(step.hookloadWeightLbs / 1000)}k lbs` : '-'}</td>
                            <td className="py-1.5 px-2.5 text-right text-blue-400 font-semibold">{step.bendingPct?.toFixed(2) ?? '-'}%</td>
                            <td className="py-1.5 px-2.5 text-right text-emerald-400 font-semibold">{step.h2sPct?.toFixed(2) ?? '-'}%</td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-white">
                              <span className={step.estFatiguePct > 20 ? 'text-amber-400' : 'text-rose-400'}>
                                {step.estFatiguePct.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-400 font-sans truncate max-w-[130px]">{step.zoneName || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bias Welds Coordinates Summary Chip Bar */}
                  {parsedPreview.joints.length > 0 && (
                    <div className="p-2.5 bg-fuchsia-950/20 border border-fuchsia-900/50 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-fuchsia-300 flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span>Bias Weld Coordinates ({parsedPreview.joints.length} Welds Configured / Calculated):</span>
                        </span>
                        <span className="text-[10px] text-fuchsia-400/80 font-mono">
                          {autoCalcBiasWelds ? 'Calculated from String Specification' : 'Imported from File'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedPreview.joints.slice(0, 12).map((j, jidx) => (
                          <span
                            key={j.id || jidx}
                            className="px-2 py-0.5 rounded bg-fuchsia-950 border border-fuchsia-800/80 text-[10px] font-mono text-fuchsia-200"
                          >
                            <span className="text-fuchsia-400 font-bold">{j.id}:</span>{' '}
                            {Math.round(j.locationFt * (isMetric ? 0.3048 : 1)).toLocaleString()}{' '}
                            {isMetric ? 'm' : 'ft'} (wt: {j.wallThicknessIn}")
                          </span>
                        ))}
                        {parsedPreview.joints.length > 12 && (
                          <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                            +{parsedPreview.joints.length - 12} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/90">
          <div className="text-xs text-slate-500 font-mono">
            {parsedPreview?.success
              ? `Ready to update string ${stringNo} with ${parsedPreview.steps.length} field intervals.`
              : 'Select a file or paste spreadsheet rows to preview.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedPreview || !parsedPreview.success}
              onClick={handleApply}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Fatigue Chart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
