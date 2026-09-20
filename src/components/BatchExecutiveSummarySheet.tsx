import React from 'react';
import { CalculationHistoryEntry, UnitSystem } from '../types/coiledTubing';
import {
  calculateTubingLimits,
  inToMm,
  ftToM,
} from '../utils/engineeringCalculations';
import { evaluateCalculationSafety } from '../utils/safetyEvaluator';
import { CoilMatrixLogo } from './CoilMatrixLogo';
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface BatchExecutiveSummarySheetProps {
  entries: CalculationHistoryEntry[];
  unitSystem: UnitSystem;
  dateStr?: string;
  totalSheets: number;
}

export const BatchExecutiveSummarySheet: React.FC<BatchExecutiveSummarySheetProps> = ({
  entries,
  unitSystem,
  dateStr,
  totalSheets,
}) => {
  const isMetric = unitSystem === 'metric';
  const displayDate = dateStr || new Date().toISOString().split('T')[0];

  let passCount = 0;
  let failCount = 0;

  entries.forEach((e) => {
    const evalRes = evaluateCalculationSafety(e);
    if (evalRes.status === 'pass') passCount++;
    else failCount++;
  });

  return (
    <div className="p-8 space-y-6 text-xs text-slate-800 bg-white print:p-6 print:space-y-4 print-avoid-break">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <CoilMatrixLogo size="lg" theme="light" showSubtitle={false} />
          <div className="border-l border-slate-300 pl-4">
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950 print:text-lg">
              Coiled Tubing Batch Audit Report
            </h1>
            <p className="text-slate-600 text-xs print:text-[11px]">
              Executive Summary & Comprehensive Engineering Batch Index &bull; API Spec 5ST
            </p>
          </div>
        </div>
        <div className="text-right text-[11px] font-mono text-slate-600">
          <div>Date: {displayDate}</div>
          <div className="font-bold text-slate-900">BATCH-CT-EXPORT</div>
          <div>Units: {isMetric ? 'Metric (SI)' : 'US Oilfield'}</div>
          <div className="text-slate-500 font-semibold mt-0.5">
            Sheet 1 of {totalSheets}
          </div>
        </div>
      </div>

      {/* Portfolio Overview KPI Card */}
      <div className="p-4 bg-slate-50 border border-slate-300 rounded flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-600" />
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
              Batch Portfolio Overview
            </h2>
          </div>
          <p className="text-slate-600 text-[11px]">
            Consolidated calculation audit of {entries.length} bookmarked coiled tubing configurations.
          </p>
          <div className="text-[10px] text-slate-500 font-mono">
            Governing Standards: API Spec 5ST &bull; API RP 5C7 &bull; ASTM A370
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Safe Count Pill */}
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-emerald-700 uppercase">Compliant</div>
              <div className="text-sm font-bold font-mono leading-none">{passCount} Jobs</div>
            </div>
          </div>

          {/* Violations Count Pill */}
          <div
            className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${
              failCount > 0
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${failCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
            />
            <div>
              <div className={`text-[9px] font-bold uppercase ${failCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                Violations
              </div>
              <div className="text-sm font-bold font-mono leading-none">{failCount} Jobs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Comparison Matrix Table */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          Coiled Tubing Batch Index & Specifications Matrix
        </h2>
        <div className="overflow-x-auto border border-slate-300 rounded">
          <table className="w-full text-left border-collapse text-[11px] font-sans">
            <thead>
              <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-3">String / Job Designation</th>
                <th className="py-2 px-2.5">OD &times; Wall</th>
                <th className="py-2 px-2.5">Grade</th>
                <th className="py-2 px-2.5">Length</th>
                <th className="py-2 px-2.5">API 87.5% Burst</th>
                <th className="py-2 px-2.5">Tensile YS</th>
                <th className="py-2 px-3 text-center">Safety Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry, idx) => {
                const ct = entry.stringSnapshot;
                const limits = calculateTubingLimits(ct);
                const evalRes = evaluateCalculationSafety(entry);
                const isPass = evalRes.status === 'pass';
                const gradeStr = ct.grade || (ct as any).materialGrade || 'CT90';
                const sheetTarget = idx + 2;

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    <td className="py-2 px-2.5 font-mono text-slate-500 font-bold">
                      Sheet {sheetTarget}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      <div className="truncate max-w-xs" title={entry.title}>
                        {entry.title}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">{entry.displayTime}</div>
                    </td>
                    <td className="py-2 px-2.5 font-mono">
                      {isMetric
                        ? `${inToMm(ct.outerDiameterIn).toFixed(1)}mm \u00d7 ${inToMm(ct.wallThicknessIn).toFixed(2)}mm`
                        : `${ct.outerDiameterIn.toFixed(3)}" \u00d7 ${ct.wallThicknessIn.toFixed(3)}"`}
                    </td>
                    <td className="py-2 px-2.5 font-bold text-cyan-700 font-mono">
                      {gradeStr}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-700">
                      {isMetric
                        ? `${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m`
                        : `${ct.totalLengthFt.toLocaleString()} ft`}
                    </td>
                    <td className="py-2 px-2.5 font-mono">
                      {isMetric
                        ? `${Math.round(limits.apiBurstMpa)} MPa`
                        : `${Math.round(limits.apiBurstPressurePsi).toLocaleString()} psi`}
                    </td>
                    <td className="py-2 px-2.5 font-mono">
                      {isMetric
                        ? `${Math.round(limits.tensileYieldKn)} kN`
                        : `${Math.round(limits.tensileYieldLbf).toLocaleString()} lbf`}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isPass
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPass ? 'PASS' : 'VIOLATION'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Sign-off & Audit Box */}
      <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
          Batch Engineering Audit Verification
        </h3>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          The engineering calculations compiled across this document have been evaluated against API Specification 5ST,
          API Recommended Practice 5C7, and standard oilfield stress and pressure guidelines. Individual calculation
          sheets following this executive summary provide thorough structural, hydraulic, force, and fatigue profiles.
        </p>
        <div className="pt-3 border-t border-slate-300 grid grid-cols-3 gap-6 text-[11px]">
          <div>
            <span className="text-slate-500 block text-[10px]">Prepared By (Lead Engineer):</span>
            <div className="mt-4 border-b border-slate-400 w-44" />
            <span className="text-slate-700 font-semibold">Coiled Tubing Engineer</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Reviewed & Approved By:</span>
            <div className="mt-4 border-b border-slate-400 w-44" />
            <span className="text-slate-700 font-semibold">Operations Superintendent</span>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              API 5ST Validated
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Consolidated Batch Authorization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
