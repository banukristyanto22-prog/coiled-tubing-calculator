import React, { useState } from 'react';
import { CoiledTubingString, UnitSystem } from '../types/coiledTubing';
import { 
  calculateReelCapacity, 
  inToMm, 
  mmToIn, 
  ftToM, 
  mToFt 
} from '../utils/engineeringCalculations';
import { 
  Disc, 
  Truck, 
  Layers, 
  Scale, 
  Info, 
  Maximize2 
} from 'lucide-react';

interface ReelCapacityTabProps {
  ct: CoiledTubingString;
  onChangeString: (updated: CoiledTubingString) => void;
  unitSystem: UnitSystem;
}

export interface ReelModelPreset {
  id: string;
  name: string;
  manufacturer: string;
  flangeDiaIn: number;
  coreDiaIn: number;
  widthIn: number;
  tareWeightLbs: number;
  badge: string;
  description: string;
}

export const REEL_PRESETS: ReelModelPreset[] = [
  {
    id: 'shinda-ct-ocd',
    name: 'Shinda CT-OCD (Pertamina PEP Zone 14)',
    manufacturer: 'Shinda (Commissioned 9/27/2022)',
    flangeDiaIn: 148.0,
    coreDiaIn: 92.0,
    widthIn: 71.0,
    tareWeightLbs: 6173,
    badge: '148" × 92" × 71" • 6,173 lbf Tare',
    description: 'COSL Cerberus™ 14.5.16 Reel-Trak report: 148" Flange OD, 92" Drum Core, 71" Width between flanges, 6,173 lbf empty tare weight.',
  },
  {
    id: 'shinda-std-128',
    name: 'Shinda Standard 128" x 72" (MTR Reference)',
    manufacturer: 'Shinda Creative Oil & Gas',
    flangeDiaIn: 128.0,
    coreDiaIn: 72.0,
    widthIn: 71.6,
    tareWeightLbs: 7500,
    badge: '128" × 72" × 71.6" • 7,500 lbf Tare',
    description: 'Factory shipping reel: 3,251 mm (128") Flange OD, 1,828 mm (72") Drum Core, 1,818 mm (71.6") Width.',
  },
  {
    id: 'qt-std-144',
    name: 'Quality Tubing Standard 144" Field Reel',
    manufacturer: 'Quality Tubing (NOV)',
    flangeDiaIn: 144.0,
    coreDiaIn: 76.0,
    widthIn: 80.0,
    tareWeightLbs: 8500,
    badge: '144" × 76" × 80" • 8,500 lbf Tare',
    description: 'Standard workover reel for 1.750" and 2.000" strings up to 22,000 ft.',
  },
  {
    id: 'offshore-erd-168',
    name: 'Offshore High-Capacity 168" ERD Reel',
    manufacturer: 'Stewart & Stevenson / Hydra Rig',
    flangeDiaIn: 168.0,
    coreDiaIn: 102.0,
    widthIn: 92.0,
    tareWeightLbs: 14500,
    badge: '168" × 102" × 92" • 14,500 lbf Tare',
    description: 'Deep horizontal offshore spool with large 102" drum core to minimize extreme bending fatigue.',
  },
  {
    id: 'thru-tubing-110',
    name: 'Compact Thru-Tubing 110" Reel',
    manufacturer: 'Texas Cold Drawn / Custom',
    flangeDiaIn: 110.0,
    coreDiaIn: 60.0,
    widthIn: 58.0,
    tareWeightLbs: 4500,
    badge: '110" × 60" × 58" • 4,500 lbf Tare',
    description: 'Compact trailer or skid mount for 1.250" thru-tubing cleanout strings.',
  },
];

export const ReelCapacityTab: React.FC<ReelCapacityTabProps> = ({
  ct,
  onChangeString,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';
  const isOcdReel = ct.reelCoreDiameterIn === 92 && ct.reelFlangeDiameterIn === 148;
  const [tareWeightLbs, setTareWeightLbs] = useState<number>(() => (isOcdReel ? 6173 : 8500));

  // Sync tare weight when string changes to/from OCD reel
  React.useEffect(() => {
    if (ct.reelCoreDiameterIn === 92 && ct.reelFlangeDiameterIn === 148) {
      setTareWeightLbs(6173);
    }
  }, [ct.reelCoreDiameterIn, ct.reelFlangeDiameterIn]);

  const spooling = calculateReelCapacity(ct, tareWeightLbs);

  const handleUpdate = (field: keyof CoiledTubingString, val: number) => {
    onChangeString({
      ...ct,
      [field]: val,
    });
  };

  const handleSelectReelPreset = (presetId: string) => {
    const p = REEL_PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setTareWeightLbs(p.tareWeightLbs);
    onChangeString({
      ...ct,
      reelCoreDiameterIn: p.coreDiaIn,
      reelFlangeDiameterIn: p.flangeDiaIn,
      reelWidthIn: p.widthIn,
    });
  };

  const activeReelPresetId = REEL_PRESETS.find(
    (p) =>
      Math.abs(p.coreDiaIn - ct.reelCoreDiameterIn) < 0.5 &&
      Math.abs(p.flangeDiaIn - ct.reelFlangeDiameterIn) < 0.5
  )?.id || 'custom';

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maximum Spooling Capacity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Total Reel Capacity</span>
            <Disc className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {isMetric
              ? `${Math.round(spooling.maxCapacityM).toLocaleString()} m`
              : `${Math.round(spooling.maxCapacityFt).toLocaleString()} ft`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {spooling.totalLayers} Layers &bull; {spooling.wrapsPerLayer} Wraps/Layer
          </div>
        </div>

        {/* Current String Spool Fill % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Reel Spool Utilization</span>
            <Maximize2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {spooling.spoolFillPercentage.toFixed(1)}% Fill
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            String: {isMetric ? Math.round(ftToM(ct.totalLengthFt)).toLocaleString() + ' m' : ct.totalLengthFt.toLocaleString() + ' ft'}
          </div>
        </div>

        {/* Tubing Net Weight on Reel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Tubing Weight on Reel</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {isMetric
              ? `${Math.round(spooling.currentSpoolWeightKg).toLocaleString()} kg`
              : `${Math.round(spooling.currentSpoolWeightLbs).toLocaleString()} lbs`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dry steel tubing payload
          </div>
        </div>

        {/* Gross Shipping Weight */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Gross Reel Shipping Weight</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {isMetric
              ? `${Math.round(spooling.totalReelWeightGrossLbs * 0.453592).toLocaleString()} kg`
              : `${Math.round(spooling.totalReelWeightGrossLbs).toLocaleString()} lbs`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Includes reel tare + fluid fill
          </div>
        </div>
      </div>

      {/* Main Layout: Reel Inputs & Visual Cross Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Spool Geometry Inputs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Disc className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Reel Spool Dimensions
              </h3>
            </div>
            {isOcdReel && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800 font-mono">
                COSL CT-OCD
              </span>
            )}
          </div>

          {/* Quick Reel Model Preset Selector */}
          <div>
            <label className="text-slate-400 block mb-1 text-xs">
              Industry Reel Preset
            </label>
            <select
              value={activeReelPresetId}
              onChange={(e) => handleSelectReelPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            >
              {REEL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.badge})
                </option>
              ))}
              <option value="custom">Custom Dimensions...</option>
            </select>
            {activeReelPresetId !== 'custom' && (
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                {REEL_PRESETS.find((p) => p.id === activeReelPresetId)?.description}
              </p>
            )}
          </div>

          <div className="space-y-3.5 text-xs pt-1 border-t border-slate-800/60">
            {/* Core / Drum Diameter */}
            <div>
              <label className="text-slate-400 block mb-1">
                Core (Drum) Diameter {isMetric ? '(mm)' : '(in)'}
              </label>
              <input
                type="number"
                step="1"
                value={isMetric ? Math.round(inToMm(ct.reelCoreDiameterIn)) : ct.reelCoreDiameterIn}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 72;
                  handleUpdate('reelCoreDiameterIn', isMetric ? mmToIn(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Flange Diameter */}
            <div>
              <label className="text-slate-400 block mb-1">
                Flange Outside Diameter {isMetric ? '(mm)' : '(in)'}
              </label>
              <input
                type="number"
                step="1"
                value={isMetric ? Math.round(inToMm(ct.reelFlangeDiameterIn)) : ct.reelFlangeDiameterIn}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 128;
                  handleUpdate('reelFlangeDiameterIn', isMetric ? mmToIn(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                MTR Reference: 3251 mm OD
              </span>
            </div>

            {/* Width Between Flanges */}
            <div>
              <label className="text-slate-400 block mb-1">
                Width Between Flanges {isMetric ? '(mm)' : '(in)'}
              </label>
              <input
                type="number"
                step="1"
                value={isMetric ? Math.round(inToMm(ct.reelWidthIn)) : ct.reelWidthIn}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 71.6;
                  handleUpdate('reelWidthIn', isMetric ? mmToIn(val) : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                MTR Reference: 1818 mm Width
              </span>
            </div>

            {/* Reel Empty Tare Weight */}
            <div>
              <label className="text-slate-400 block mb-1">
                Reel Empty Tare Weight {isMetric ? '(kg)' : '(lbs)'}
              </label>
              <input
                type="number"
                step="100"
                value={isMetric ? Math.round(tareWeightLbs * 0.453592) : tareWeightLbs}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 8500;
                  setTareWeightLbs(isMetric ? val / 0.453592 : val);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Visual Cross Section & Layer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* SVG Reel Cross Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Reel Spool Cross-Section (Hexagonal Nested Packing)
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                Level-Wind Packing: 0.866 &times; OD
              </span>
            </div>

            <div className="relative w-full aspect-[2/1] bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-center p-3 select-none overflow-hidden">
              <svg viewBox="0 0 500 240" className="w-full h-full">
                {/* Flanges */}
                {/* Left Flange */}
                <rect x="70" y="20" width="16" height="200" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                {/* Right Flange */}
                <rect x="414" y="20" width="16" height="200" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                {/* Core Drum */}
                <rect x="86" y="100" width="328" height="40" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="250" y="125" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
                  DRUM CORE &Oslash; {isMetric ? Math.round(inToMm(ct.reelCoreDiameterIn)) + ' mm' : ct.reelCoreDiameterIn + '"'}
                </text>

                {/* Spooled Tubing Layers Graphic */}
                {spooling.layerDetails.slice(0, 7).map((layer, idx) => {
                  const yTop = 95 - idx * 10;
                  const yBottom = 145 + idx * 10;
                  const fillOpacity = idx < Math.ceil((spooling.spoolFillPercentage / 100) * spooling.totalLayers) ? 0.9 : 0.2;
                  return (
                    <g key={layer.layerNumber}>
                      {/* Top layer band */}
                      <rect
                        x="90"
                        y={yTop}
                        width="320"
                        height="8"
                        rx="4"
                        fill="#06b6d4"
                        fillOpacity={fillOpacity}
                        stroke="#0891b2"
                        strokeWidth="1"
                      />
                      {/* Bottom layer band */}
                      <rect
                        x="90"
                        y={yBottom}
                        width="320"
                        height="8"
                        rx="4"
                        fill="#06b6d4"
                        fillOpacity={fillOpacity}
                        stroke="#0891b2"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* Dimension Arrows */}
                <line x1="86" y1="230" x2="414" y2="230" stroke="#64748b" strokeWidth="1" />
                <text x="250" y="238" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                  Reel Width: {isMetric ? Math.round(inToMm(ct.reelWidthIn)) + ' mm' : ct.reelWidthIn + '"'}
                </text>
              </svg>
            </div>
          </div>

          {/* Layer Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Spooling Layer Breakdown
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {spooling.wrapsPerLayer} wraps per layer
              </span>
            </div>

            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Layer</th>
                    <th className="px-3 py-2">Diameter</th>
                    <th className="px-3 py-2">Layer Length</th>
                    <th className="px-3 py-2">Cumulative Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {spooling.layerDetails.map((layer) => (
                    <tr key={layer.layerNumber} className="hover:bg-slate-800/30">
                      <td className="px-3 py-1.5 font-bold text-cyan-400">Layer {layer.layerNumber}</td>
                      <td className="px-3 py-1.5">
                        {isMetric ? `${Math.round(inToMm(layer.layerDiameterIn))} mm` : `${layer.layerDiameterIn.toFixed(1)}"`}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">
                        {isMetric ? `${Math.round(ftToM(layer.lengthThisLayerFt))} m` : `${Math.round(layer.lengthThisLayerFt)} ft`}
                      </td>
                      <td className="px-3 py-1.5 text-emerald-300 font-semibold">
                        {isMetric ? `${Math.round(ftToM(layer.cumulativeLengthFt)).toLocaleString()} m` : `${Math.round(layer.cumulativeLengthFt).toLocaleString()} ft`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
