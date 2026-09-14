import React from 'react';
import { X, ShieldCheck, AlertTriangle, Check, BookOpen, Thermometer, Layers, Wrench, ShieldAlert } from 'lucide-react';
import { BHA_ELASTOMERS_LIST, BhaElastomerType, BhaElastomerSpec } from '../data/elastomerCompatibility';
import { FLUIDS_LIBRARY } from '../data/fluidsLibrary';
import { getFluidElastomerCompatibility } from '../data/elastomerCompatibility';

interface BhaElastomerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElastomer?: BhaElastomerType | 'all';
  onSelectElastomer?: (elastomer: BhaElastomerType | 'all') => void;
}

export const BhaElastomerGuideModal: React.FC<BhaElastomerGuideModalProps> = ({
  isOpen,
  onClose,
  selectedElastomer = 'all',
  onSelectElastomer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Coiled Tubing BHA Elastomer Compatibility Guide
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
                  Engineering Standard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Downhole tool seal material limits, chemical vulnerabilities, and fluid compatibility matrix for CT operations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Engineering Overview Box */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Why Elastomer Compatibility is Critical in Coiled Tubing BHA Tools</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Coiled Tubing Bottom Hole Assembly (BHA) tools—such as positive displacement motors (PDMs), dual flapper check valves, hydraulic disconnects, bi-directional jars, and packer elements—rely on elastomer O-rings, dynamic chevron packings, and rubber power sections. Pumping incompatible fluids causes rapid chemical attack: volumetric swelling (inducing motor stall and friction lock), embrittlement and micro-cracking from strong acids, or dehydrofluorination from high-pH brines, resulting in downhole seal blowout and expensive fishing jobs.
            </p>
          </div>

          {/* Elastomer Cards Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Common Coiled Tubing BHA Elastomers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {BHA_ELASTOMERS_LIST.map((spec) => {
                const isSelected = selectedElastomer === spec.id;

                return (
                  <div
                    key={spec.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{spec.name}</h4>
                          <span className="text-[11px] font-mono text-cyan-400 font-medium">
                            {spec.tradeNames}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-amber-400" />
                          {spec.maxTempF}°F
                        </span>
                      </div>

                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                        <div className="text-slate-400">
                          <strong className="text-slate-300">Temp Rating:</strong> {spec.tempRangeF}
                        </div>
                        <div className="text-slate-400">
                          <strong className="text-slate-300">Primary BHA Uses:</strong> {spec.primaryBhaTools}
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 text-[11px]">
                        <div className="text-emerald-300/90 leading-tight">
                          <span className="font-semibold text-emerald-400">✓ Strengths: </span>
                          {spec.strengths}
                        </div>
                        <div className="text-rose-300/90 leading-tight pt-1">
                          <span className="font-semibold text-rose-400">✕ Vulnerabilities: </span>
                          {spec.vulnerabilities}
                        </div>
                      </div>
                    </div>

                    {onSelectElastomer && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectElastomer(spec.id);
                          onClose();
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors mt-2 ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Currently Selected Filter' : `Filter Library by ${spec.shortName}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Cross-Reference Matrix Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Fluid vs. Elastomer Compatibility Matrix</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Standard CT Fluid System</th>
                    <th className="py-2.5 px-2.5">Category</th>
                    <th className="py-2.5 px-2.5 text-center">NBR</th>
                    <th className="py-2.5 px-2.5 text-center">HNBR</th>
                    <th className="py-2.5 px-2.5 text-center">FKM (Viton)</th>
                    <th className="py-2.5 px-2.5 text-center">FFKM (Kalrez)</th>
                    <th className="py-2.5 px-2.5 text-center">Aflas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {FLUIDS_LIBRARY.map((fluid) => {
                    const compat = getFluidElastomerCompatibility(fluid);

                    const renderCell = (detail: any) => {
                      if (detail.rating === 'compatible') {
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold"
                            title={detail.reason}
                          >
                            <Check className="w-3 h-3" /> Safe
                          </span>
                        );
                      }
                      if (detail.rating === 'caution') {
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold"
                            title={detail.reason}
                          >
                            <AlertTriangle className="w-3 h-3" /> Caution
                          </span>
                        );
                      }
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold"
                          title={detail.reason}
                        >
                          <X className="w-3 h-3" /> No
                        </span>
                      );
                    };

                    return (
                      <tr key={fluid.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-sans font-bold text-white text-[11px]">{fluid.shortName}</div>
                          <div className="text-[10px] text-slate-400">{fluid.chemicalBase}</div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 font-sans text-[11px]">
                          {fluid.category}
                        </td>
                        <td className="py-2 px-2.5 text-center">{renderCell(compat.nbr)}</td>
                        <td className="py-2 px-2.5 text-center">{renderCell(compat.hnbr)}</td>
                        <td className="py-2 px-2.5 text-center">{renderCell(compat.fkm)}</td>
                        <td className="py-2 px-2.5 text-center">{renderCell(compat.ffkm)}</td>
                        <td className="py-2 px-2.5 text-center">{renderCell(compat.aflas)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Always verify downhole temperature and chemical inhibitor batch with tool manufacturer specs before pumping.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
