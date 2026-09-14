import React from 'react';
import { CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { psiToMpa, inToMm, ftToM } from '../utils/engineeringCalculations';
import { X, Award, CheckCircle2, ShieldCheck, FileText, Activity, AlertTriangle } from 'lucide-react';

interface MtrModalProps {
  ct: CoiledTubingString;
  isOpen: boolean;
  onClose: () => void;
  unitSystem: UnitSystem;
}

export const MtrCertificateModal: React.FC<MtrModalProps> = ({
  ct,
  isOpen,
  onClose,
  unitSystem,
}) => {
  if (!isOpen) return null;

  const cert = ct.certificateRef;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Mill Test Report (MTR) & Quality Certificate
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                  API SPEC 5ST CERTIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspection & Verification data from attached official manufacturer report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Certificate Identification Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Manufacturer</span>
              <span className="font-semibold text-slate-200">
                {cert ? 'SHINDA CREATIVE OIL & GAS' : 'Standard Manufacturer'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Report / Cert No.</span>
              <span className="font-mono text-cyan-400 font-medium">
                {cert?.reportNo || 'XDKC/QR-ZJ-14 / CT20220930001'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Shaft / String No.</span>
              <span className="font-mono text-amber-400 font-medium">
                {cert?.shaftNo ? `Shaft #${cert.shaftNo} / ${cert.stringNo}` : 'Standard CT String'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Spec Standard</span>
              <span className="font-semibold text-slate-200">
                {cert?.specStandard || 'API Spec 5ST-2010 (R2020)'}
              </span>
            </div>
          </div>

          {/* Key Certified Test Verification Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hydrotest Result */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Hydrostatic Test
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {unitSystem === 'metric' ? '75.9 MPa' : '11,008 psi'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Holding time: <span className="text-slate-200 font-medium">15 min</span> | Drop: &le; 0.3 MPa (Pass)
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Measured at 78.8 MPa starting &rarr; 78.5 MPa final. API Spec 5ST compliance verified.
              </div>
            </div>

            {/* Yield & Tensile Test */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Tensile Properties (Rp0.2 / Rm)
                </span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {unitSystem === 'metric' ? '672 - 675 MPa' : '97,500 psi'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Tensile Rm: <span className="text-slate-200 font-medium">{unitSystem === 'metric' ? '719 - 747 MPa' : '104 - 108 ksi'}</span> | Elong: 27%
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                ASTM A370/E4-2020 full section specimen testing. Exceeds min 620 MPa API limit.
              </div>
            </div>

            {/* Hardness & Metallography */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Hardness & Grain Size
                </span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                22 HRC / 98 HRB
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Weld Line: 22 HRC | HAZ: 20 HRC | Tube: 20.5 HRC
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                ASTM E384-2017 Vickers. Metallographic grain size: 10.5 (&ge; 8 standard).
              </div>
            </div>
          </div>

          {/* Chemical Analysis Table from Report (Page 3) */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
            <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                Chemical Composition (Wt %) - Labspark1000 Direct-Reading Spectrometer
              </span>
              <span className="text-xs text-slate-400">ASTM A751-2020</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono">
                  <tr>
                    <th className="px-3 py-2">Element</th>
                    <th className="px-3 py-2">C</th>
                    <th className="px-3 py-2">Si</th>
                    <th className="px-3 py-2">Mn</th>
                    <th className="px-3 py-2">P</th>
                    <th className="px-3 py-2">S</th>
                    <th className="px-3 py-2">Cu</th>
                    <th className="px-3 py-2">Ni</th>
                    <th className="px-3 py-2">Cr</th>
                    <th className="px-3 py-2">Mo</th>
                    <th className="px-3 py-2">Nb</th>
                    <th className="px-3 py-2">Ti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-3 py-2 font-sans font-medium text-slate-200">Slab Actual</td>
                    <td className="px-3 py-2 text-cyan-300">0.1453</td>
                    <td className="px-3 py-2">0.363</td>
                    <td className="px-3 py-2 text-cyan-300">0.85</td>
                    <td className="px-3 py-2">0.008</td>
                    <td className="px-3 py-2 text-emerald-300">0.0005</td>
                    <td className="px-3 py-2">0.2598</td>
                    <td className="px-3 py-2">0.1315</td>
                    <td className="px-3 py-2 text-cyan-300">0.5957</td>
                    <td className="px-3 py-2">0.16</td>
                    <td className="px-3 py-2">0.0201</td>
                    <td className="px-3 py-2">0.0183</td>
                  </tr>
                  <tr className="text-slate-500 bg-slate-950/60">
                    <td className="px-3 py-2 font-sans">API Spec Limit</td>
                    <td className="px-3 py-2">&le; 0.16</td>
                    <td className="px-3 py-2">&le; 0.5</td>
                    <td className="px-3 py-2">&le; 1.2</td>
                    <td className="px-3 py-2">&le; 0.02</td>
                    <td className="px-3 py-2">&le; 0.005</td>
                    <td className="px-3 py-2">/</td>
                    <td className="px-3 py-2">/</td>
                    <td className="px-3 py-2">/</td>
                    <td className="px-3 py-2">/</td>
                    <td className="px-3 py-2">/</td>
                    <td className="px-3 py-2">/</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Strip Segments & Bias Weld Locations (Page 9) */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
            <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
                  String Assembly & Bias Weld Locations (Total: 5,500 m / 18,045 ft)
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Shipping Reel: 3251mm OD &times; 1818mm Width
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono">
                  <tr>
                    <th className="px-3 py-2">Strip No.</th>
                    <th className="px-3 py-2">Wall Thk</th>
                    <th className="px-3 py-2">Length</th>
                    <th className="px-3 py-2">Cumulative (Bias Weld)</th>
                    <th className="px-3 py-2">Heat No.</th>
                    <th className="px-3 py-2">Yield (Rp0.2)</th>
                    <th className="px-3 py-2">Tensile (Rm)</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {cert?.segments?.map((seg, idx) => (
                    <tr key={seg.id || idx} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-cyan-300 font-semibold">{seg.stripNo}</td>
                      <td className="px-3 py-2">{seg.wallThicknessIn.toFixed(3)}" (2.79mm)</td>
                      <td className="px-3 py-2">
                        {unitSystem === 'metric' ? `${seg.lengthM} m` : `${seg.lengthFt.toLocaleString()} ft`}
                      </td>
                      <td className="px-3 py-2 text-amber-300 font-semibold">
                        {unitSystem === 'metric'
                          ? `@ ${seg.biasWeldLocationM} m`
                          : `@ ${seg.biasWeldLocationFt.toLocaleString()} ft`}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{seg.heatNumber}</td>
                      <td className="px-3 py-2 text-emerald-400">
                        {unitSystem === 'metric'
                          ? `${seg.yieldStrengthMpa} MPa`
                          : `${Math.round(seg.yieldStrengthMpa * 145.038).toLocaleString()} psi`}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {unitSystem === 'metric'
                          ? `${seg.tensileStrengthMpa} MPa`
                          : `${Math.round(seg.tensileStrengthMpa * 145.038).toLocaleString()} psi`}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          RT Pass
                        </span>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-slate-500">
                        Standard continuous string without strip weld breakdown.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quality Non-Destructive Tests (NDT) Summary (Page 8) */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Non-Destructive Testing (NDT) Inspections & Standards (Page 8 of MTR)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[11px]">Bias Weld RT</span>
                <span className="text-emerald-400 font-mono font-medium">PASS</span>
                <span className="text-slate-500 block text-[10px]">ISO1027 Fe10/16</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[11px]">Ultrasonic UT</span>
                <span className="text-emerald-400 font-mono font-medium">PASS</span>
                <span className="text-slate-500 block text-[10px]">10% wall notch</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[11px]">Eddy Current ET</span>
                <span className="text-emerald-400 font-mono font-medium">PASS</span>
                <span className="text-slate-500 block text-[10px]">Through-hole test</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[11px]">Full Drift Test</span>
                <span className="text-emerald-400 font-mono font-medium">PASS</span>
                <span className="text-slate-500 block text-[10px]">Cylindrical mandrel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Certified authentic test report pursuant to API Specification 5ST / ASTM A370.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
