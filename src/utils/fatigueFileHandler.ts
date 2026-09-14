import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { FieldFatigueStep, FieldJointData, CoiledTubingString } from '../types/coiledTubing';

export interface ParseResult {
  success: boolean;
  message: string;
  steps: FieldFatigueStep[];
  joints: FieldJointData[];
  detectedUnit: 'ft' | 'm';
  rowCount: number;
  detectedHeaders: string[]; // List of identified recognized headers
  hasOperationalData: boolean; // Flag if fluid, circ press, whp, weight, pump rate, N2 rate were detected
}

// Helper to clean column keys for loose matching
export const cleanKey = (k: string): string => {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Flexible header recognition helper
 * Automatically identifies standard field column headers:
 * Start Depth, End Depth, Type Fluid, Circulating Pressure, Well Head Pressure, Weight, Pump Rate, N2 Rate
 */
export const identifyHeaderType = (header: string): string | null => {
  const clean = cleanKey(header);
  const lower = header.toLowerCase();

  // 1. Start Depth
  if (
    clean.includes('startdepth') ||
    clean.includes('depthfrom') ||
    clean === 'start' ||
    clean === 'from' ||
    clean === 'startft' ||
    clean === 'startm' ||
    clean === 'topmd' ||
    clean === 'topdepth' ||
    clean === 'indepth' ||
    clean === 'kedalamanawal' ||
    /start\s*depth|depth\s*from|from\s*depth|top\s*md/i.test(lower)
  ) {
    return 'startDepth';
  }

  // 2. End Depth
  if (
    clean.includes('enddepth') ||
    clean.includes('depthto') ||
    clean === 'end' ||
    clean === 'to' ||
    clean === 'endft' ||
    clean === 'endm' ||
    clean === 'bottommd' ||
    clean === 'bottomdepth' ||
    clean === 'outdepth' ||
    clean === 'kedalamanakhir' ||
    /end\s*depth|depth\s*to|to\s*depth|bottom\s*md/i.test(lower)
  ) {
    return 'endDepth';
  }

  // Single Depth / Station
  if (
    clean === 'depth' ||
    clean === 'station' ||
    clean === 'md' ||
    clean === 'measuredepth' ||
    clean === 'length'
  ) {
    return 'singleDepth';
  }

  // 3. Type Fluid
  if (
    clean.includes('typefluid') ||
    clean.includes('fluidtype') ||
    clean === 'fluid' ||
    clean === 'fluiddescription' ||
    clean === 'fluidsystem' ||
    clean === 'circulatingfluid' ||
    clean === 'medium' ||
    clean === 'jenisfluida' ||
    clean === 'pumpfluid' ||
    clean === 'fluidname' ||
    clean === 'fluida' ||
    /type\s*fluid|fluid\s*type|circulating\s*fluid|fluid\s*system/i.test(lower)
  ) {
    return 'fluidType';
  }

  // 4. Circulating Pressure
  if (
    clean.includes('circulatingpressure') ||
    clean.includes('circpressure') ||
    clean.includes('pumppressure') ||
    clean.includes('pumpingpressure') ||
    clean === 'circpsi' ||
    clean === 'circpress' ||
    clean === 'pcirc' ||
    clean === 'ppump' ||
    clean === 'circulatingpsi' ||
    clean === 'tekanansirkulasi' ||
    /circulating\s*pressure|circ\s*pressure|pump\s*pressure|pumping\s*pressure|circ\s*psi/i.test(lower)
  ) {
    return 'circulatingPressure';
  }

  // 5. Well Head Pressure
  if (
    clean.includes('wellheadpressure') ||
    clean === 'whp' ||
    clean === 'whppsi' ||
    clean === 'whpbar' ||
    clean === 'thp' ||
    clean.includes('tubingheadpressure') ||
    clean.includes('casingpressure') ||
    clean.includes('surfacepressure') ||
    clean === 'tekanankepalasumur' ||
    /well\s*head\s*pressure|wellhead\s*pressure|whp|tubing\s*head\s*pressure|thp/i.test(lower)
  ) {
    return 'wellheadPressure';
  }

  // 6. Weight / Hookload
  if (
    clean === 'weight' ||
    clean.includes('hookload') ||
    clean.includes('tubingweight') ||
    clean.includes('stringweight') ||
    clean.includes('pipeweight') ||
    clean.includes('pickupload') ||
    clean.includes('slackoffweight') ||
    clean === 'tension' ||
    clean === 'load' ||
    clean === 'berat' ||
    clean === 'beratpipa' ||
    /hook\s*load|tubing\s*weight|string\s*weight|pipe\s*weight/i.test(lower)
  ) {
    return 'weight';
  }

  // 7. Pump Rate
  if (
    clean.includes('pumprate') ||
    clean.includes('liquidrate') ||
    clean.includes('slurryrate') ||
    clean.includes('fluidrate') ||
    clean.includes('pumpingrate') ||
    clean === 'bpm' ||
    clean === 'gpm' ||
    clean === 'flowrate' ||
    clean === 'lajupompa' ||
    clean === 'debitpompa' ||
    /pump\s*rate|liquid\s*rate|slurry\s*rate|fluid\s*rate|pumping\s*rate/i.test(lower)
  ) {
    return 'pumpRate';
  }

  // 8. N2 Rate
  if (
    clean.includes('n2rate') ||
    clean.includes('nitrogenrate') ||
    clean.includes('gasrate') ||
    clean.includes('n2scfm') ||
    clean.includes('n2flowrate') ||
    clean.includes('n2flow') ||
    clean.includes('n2scfmin') ||
    clean === 'scfm' ||
    clean === 'lajun2' ||
    clean === 'debitgas' ||
    /n2\s*rate|nitrogen\s*rate|gas\s*rate|n2\s*scfm|n2\s*flow/i.test(lower)
  ) {
    return 'n2Rate';
  }

  // Fatigue percentages
  if (clean.includes('bending') || clean === 'bendingfatigue' || clean === 'bendingpct') {
    return 'bendingPct';
  }
  if (clean.includes('h2s') || clean.includes('sour') || clean === 'h2sfatigue' || clean === 'h2spct') {
    return 'h2sPct';
  }
  if (
    clean.includes('est') ||
    clean.includes('total') ||
    clean === 'fatigue' ||
    clean === 'fatiguepct' ||
    clean === 'damage' ||
    clean === 'estfatigue' ||
    clean === 'cumulative'
  ) {
    return 'estFatiguePct';
  }

  // Joint details
  if (clean.includes('jointloc') || clean.includes('weldloc') || clean.includes('jointdist')) {
    return 'jointLocation';
  }
  if (clean.includes('jointfatigue') || clean.includes('weldfatigue')) {
    return 'jointFatigue';
  }
  if (clean.includes('strip') || clean.includes('heat')) {
    return 'stripNo';
  }
  if (clean.includes('zone') || clean.includes('section') || clean.includes('label')) {
    return 'zoneName';
  }
  if (clean.includes('note') || clean.includes('comment') || clean.includes('desc')) {
    return 'notes';
  }

  return null;
};

/**
 * Parses raw text (CSV/TSV) or Excel workbook array buffer
 */
export const parseFatigueData = (
  data: string | ArrayBuffer,
  isBinary: boolean = false,
  ct?: CoiledTubingString,
  options?: {
    autoCalculateMissingFatigue?: boolean;
    autoGenerateBiasWelds?: boolean;
  }
): ParseResult => {
  const autoCalc = options?.autoCalculateMissingFatigue !== false;
  const autoWelds = options?.autoGenerateBiasWelds !== false;
  try {
    let workbook: XLSX.WorkBook;
    if (isBinary && typeof data !== 'string') {
      workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    } else if (typeof data === 'string') {
      workbook = XLSX.read(data, { type: 'string' });
    } else {
      return {
        success: false,
        message: 'Invalid data format provided.',
        steps: [],
        joints: [],
        detectedUnit: 'ft',
        rowCount: 0,
        detectedHeaders: [],
        hasOperationalData: false,
      };
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        message: 'No readable sheets found in file.',
        steps: [],
        joints: [],
        detectedUnit: 'ft',
        rowCount: 0,
        detectedHeaders: [],
        hasOperationalData: false,
      };
    }

    // Determine target sheets:
    const sheetNames = workbook.SheetNames;
    const intervalsSheetName =
      sheetNames.find((s) => /interval|fatigue|profile|steps|operational|passes|survey/i.test(s)) ||
      sheetNames[0];
    const jointsSheetName = sheetNames.find((s) => /joint|weld|bias/i.test(s));

    const intervalsSheet = workbook.Sheets[intervalsSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(intervalsSheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        message: `Sheet "${intervalsSheetName}" is empty or has no recognizable data rows.`,
        steps: [],
        joints: [],
        detectedUnit: 'ft',
        rowCount: 0,
        detectedHeaders: [],
        hasOperationalData: false,
      };
    }

    // Detect unit based on column headers or values
    let detectedUnit: 'ft' | 'm' = 'ft';
    const firstRowKeys = Object.keys(rawRows[0]).join(' ').toLowerCase();
    if (firstRowKeys.includes('[m]') || firstRowKeys.includes('_m') || firstRowKeys.includes('meter')) {
      detectedUnit = 'm';
    }

    // Map column headers using flexible matching
    const recognizedHeadersSet = new Set<string>();
    const columnMap: Record<string, string> = {};

    Object.keys(rawRows[0]).forEach((origKey) => {
      const identified = identifyHeaderType(origKey);
      if (identified) {
        columnMap[origKey] = identified;
        recognizedHeadersSet.add(identified);
      }
    });

    const hasOperationalData =
      recognizedHeadersSet.has('fluidType') ||
      recognizedHeadersSet.has('circulatingPressure') ||
      recognizedHeadersSet.has('wellheadPressure') ||
      recognizedHeadersSet.has('weight') ||
      recognizedHeadersSet.has('pumpRate') ||
      recognizedHeadersSet.has('n2Rate');

    const steps: FieldFatigueStep[] = [];
    const extractedJoints: FieldJointData[] = [];

    // Process intervals rows
    rawRows.forEach((row, idx) => {
      let startVal: number | null = null;
      let endVal: number | null = null;
      let singleDepthVal: number | null = null;
      let bendingVal: number | null = null;
      let h2sVal: number | null = null;
      let estVal: number | null = null;
      let zoneName: string = '';
      let notes: string = '';

      // Operational parameters
      let fluidTypeVal: string | undefined = undefined;
      let circPressureVal: number | undefined = undefined;
      let wellheadPressureVal: number | undefined = undefined;
      let hookloadWeightVal: number | undefined = undefined;
      let pumpRateVal: number | undefined = undefined;
      let n2RateVal: number | undefined = undefined;

      // Joint related keys in same row
      let jointLocVal: number | null = null;
      let jointFatigueVal: number | null = null;
      let stripNoVal: string = '';

      for (const [origKey, val] of Object.entries(row)) {
        const headerType = columnMap[origKey] || identifyHeaderType(origKey);
        const lowerKey = origKey.toLowerCase();
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));

        switch (headerType) {
          case 'startDepth':
            if (!isNaN(num)) startVal = num;
            break;
          case 'endDepth':
            if (!isNaN(num)) endVal = num;
            break;
          case 'singleDepth':
            if (!isNaN(num)) singleDepthVal = num;
            break;
          case 'fluidType':
            fluidTypeVal = String(val).trim();
            break;
          case 'circulatingPressure':
            if (!isNaN(num)) {
              // Convert bar to psi if indicated in header
              if (lowerKey.includes('bar')) {
                circPressureVal = parseFloat((num * 14.5038).toFixed(1));
              } else if (lowerKey.includes('mpa')) {
                circPressureVal = parseFloat((num * 145.038).toFixed(1));
              } else {
                circPressureVal = num;
              }
            }
            break;
          case 'wellheadPressure':
            if (!isNaN(num)) {
              if (lowerKey.includes('bar')) {
                wellheadPressureVal = parseFloat((num * 14.5038).toFixed(1));
              } else if (lowerKey.includes('mpa')) {
                wellheadPressureVal = parseFloat((num * 145.038).toFixed(1));
              } else {
                wellheadPressureVal = num;
              }
            }
            break;
          case 'weight':
            if (!isNaN(num)) {
              // Check if klbs or tonnes
              if (lowerKey.includes('klbs') || lowerKey.includes('k-lbs') || (num < 150 && num > 1.5 && !lowerKey.includes('ton'))) {
                hookloadWeightVal = Math.round(num * 1000);
              } else if (lowerKey.includes('ton') || lowerKey.includes('tonne')) {
                hookloadWeightVal = Math.round(num * 2204.62);
              } else {
                hookloadWeightVal = Math.round(num);
              }
            }
            break;
          case 'pumpRate':
            if (!isNaN(num)) {
              if (lowerKey.includes('gpm')) {
                pumpRateVal = parseFloat((num / 42).toFixed(2));
              } else {
                pumpRateVal = parseFloat(num.toFixed(2));
              }
            }
            break;
          case 'n2Rate':
            if (!isNaN(num)) {
              n2RateVal = parseFloat(num.toFixed(1));
            }
            break;
          case 'bendingPct':
            if (!isNaN(num)) bendingVal = num;
            break;
          case 'h2sPct':
            if (!isNaN(num)) h2sVal = num;
            break;
          case 'estFatiguePct':
            if (!isNaN(num)) estVal = num;
            break;
          case 'jointLocation':
            if (!isNaN(num)) jointLocVal = num;
            break;
          case 'jointFatigue':
            if (!isNaN(num)) jointFatigueVal = num;
            break;
          case 'stripNo':
            stripNoVal = String(val);
            break;
          case 'zoneName':
            zoneName = String(val);
            break;
          case 'notes':
            notes = String(val);
            break;
        }
      }

      // Convert from meters to feet if detected as meters
      const unitMultiplier = detectedUnit === 'm' ? 3.28084 : 1.0;

      // If fatigue % was NOT in the file or requested to be auto-calculated from operational parameters:
      if (autoCalc && (estVal === null || bendingVal === null)) {
        const calculated = calculateIntervalFatigue(
          {
            startFt: startVal !== null ? startVal * unitMultiplier : 0,
            endFt: endVal !== null ? endVal * unitMultiplier : (singleDepthVal !== null ? singleDepthVal * unitMultiplier : 1000),
            fluidType: fluidTypeVal,
            circulatingPressurePsi: circPressureVal,
            wellheadPressurePsi: wellheadPressureVal,
            hookloadWeightLbs: hookloadWeightVal,
            pumpRateBpm: pumpRateVal,
            n2RateScfm: n2RateVal,
          },
          ct
        );

        if (bendingVal === null) bendingVal = calculated.bendingPct;
        if (h2sVal === null) h2sVal = calculated.h2sPct;
        if (estVal === null) estVal = calculated.estFatiguePct;
      } else if (estVal === null && bendingVal !== null) {
        estVal = parseFloat((bendingVal + (h2sVal || 0)).toFixed(2));
      }

      // Check if this row is an interval
      if (startVal !== null && endVal !== null) {
        const sFt = Math.max(0, startVal * unitMultiplier);
        const eFt = Math.max(sFt, endVal * unitMultiplier);
        const bPct = bendingVal !== null ? Math.max(0, bendingVal) : 0;
        const hPct = h2sVal !== null ? Math.max(0, h2sVal) : 0;
        const ePct = estVal !== null ? Math.max(0, estVal) : Math.max(bPct, bPct + hPct);

        steps.push({
          id: `step-${idx + 1}`,
          startFt: sFt,
          endFt: eFt,
          bendingPct: bPct,
          h2sPct: hPct,
          estFatiguePct: ePct,
          zoneName: zoneName || (fluidTypeVal ? `${fluidTypeVal} Section` : `Section ${idx + 1}`),
          notes: notes || undefined,
          fluidType: fluidTypeVal,
          circulatingPressurePsi: circPressureVal,
          wellheadPressurePsi: wellheadPressureVal,
          hookloadWeightLbs: hookloadWeightVal,
          pumpRateBpm: pumpRateVal,
          n2RateScfm: n2RateVal,
        });
      } else if (singleDepthVal !== null && (estVal !== null || bendingVal !== null || circPressureVal !== undefined)) {
        // Point survey row: e.g. depth station
        const dFt = Math.max(0, singleDepthVal * unitMultiplier);
        const bPct = bendingVal !== null ? Math.max(0, bendingVal) : 0;
        const hPct = h2sVal !== null ? Math.max(0, h2sVal) : 0;
        const ePct = estVal !== null ? Math.max(0, estVal) : Math.max(bPct, bPct + hPct);

        steps.push({
          id: `station-${idx + 1}`,
          startFt: dFt,
          endFt: dFt, // temporary
          bendingPct: bPct,
          h2sPct: hPct,
          estFatiguePct: ePct,
          zoneName: zoneName || `Station @ ${Math.round(dFt)} ft`,
          notes,
          fluidType: fluidTypeVal,
          circulatingPressurePsi: circPressureVal,
          wellheadPressurePsi: wellheadPressureVal,
          hookloadWeightLbs: hookloadWeightVal,
          pumpRateBpm: pumpRateVal,
          n2RateScfm: n2RateVal,
        });
      }

      // Extract joint if present in row
      if (jointLocVal !== null) {
        const jFt = jointLocVal * unitMultiplier;
        extractedJoints.push({
          id: `Joint #${extractedJoints.length + 1}`,
          locationFt: jFt,
          stripNo: stripNoVal || `S-${extractedJoints.length + 1}`,
          wallThicknessIn: 0.125,
          heatNumber: `HT-${91800 + extractedJoints.length + 1}`,
          jointFactor: 1.25,
          overrideJointFatiguePct: jointFatigueVal !== null ? jointFatigueVal : undefined,
        });
      }
    });

    // Check separate joints sheet if available
    if (jointsSheetName && extractedJoints.length === 0) {
      const jointsSheet = workbook.Sheets[jointsSheetName];
      const rawJointRows: any[] = XLSX.utils.sheet_to_json(jointsSheet, { defval: '' });
      rawJointRows.forEach((jrow, jidx) => {
        let locVal: number | null = null;
        let fatVal: number | null = null;
        let strVal = '';
        let heatVal = '';
        let wtVal = 0.125;

        for (const [k, v] of Object.entries(jrow)) {
          const ck = cleanKey(k);
          const num = typeof v === 'number' ? v : parseFloat(String(v));
          if (ck.includes('loc') || ck.includes('depth') || ck.includes('dist')) {
            if (!isNaN(num)) locVal = num;
          } else if (ck.includes('fatigue') || ck.includes('pct') || ck.includes('damage')) {
            if (!isNaN(num)) fatVal = num;
          } else if (ck.includes('strip')) {
            strVal = String(v);
          } else if (ck.includes('heat')) {
            heatVal = String(v);
          } else if (ck.includes('wall') || ck === 'wt') {
            if (!isNaN(num)) wtVal = num;
          }
        }

        if (locVal !== null) {
          const unitMultiplier = detectedUnit === 'm' ? 3.28084 : 1.0;
          extractedJoints.push({
            id: `Joint #${jidx + 1}`,
            locationFt: locVal * unitMultiplier,
            stripNo: strVal || `S-${jidx + 1}`,
            wallThicknessIn: wtVal,
            heatNumber: heatVal || `HT-${91820 + jidx + 1}`,
            jointFactor: 1.25,
            overrideJointFatiguePct: fatVal !== null ? fatVal : undefined,
          });
        }
      });
    }

    // If no bias welds were specified in file, automate bias weld input by calculation from string
    if (extractedJoints.length === 0 && autoWelds && ct) {
      const calculatedJoints = generateBiasWeldsFromCalculation(ct);
      extractedJoints.push(...calculatedJoints);
    }

    // If data was points (stations with startFt === endFt), convert to contiguous stepped intervals
    let finalSteps: FieldFatigueStep[] = [];
    if (steps.length > 0 && steps.every((s) => s.startFt === s.endFt)) {
      const sorted = [...steps].sort((a, b) => a.startFt - b.startFt);
      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        const sFt = cur.startFt;
        const eFt = next ? next.startFt : cur.startFt + 1000;
        finalSteps.push({
          id: `step-${i + 1}`,
          startFt: sFt,
          endFt: eFt,
          bendingPct: cur.bendingPct,
          h2sPct: cur.h2sPct,
          estFatiguePct: cur.estFatiguePct,
          zoneName: cur.zoneName || `Station ${Math.round(sFt)} - ${Math.round(eFt)} ft`,
          fluidType: cur.fluidType,
          circulatingPressurePsi: cur.circulatingPressurePsi,
          wellheadPressurePsi: cur.wellheadPressurePsi,
          hookloadWeightLbs: cur.hookloadWeightLbs,
          pumpRateBpm: cur.pumpRateBpm,
          n2RateScfm: cur.n2RateScfm,
        });
      }
    } else {
      finalSteps = steps.sort((a, b) => a.startFt - b.startFt);
    }

    if (finalSteps.length === 0) {
      return {
        success: false,
        message: 'Could not extract valid fatigue intervals or depth stations. Please verify headers.',
        steps: [],
        joints: [],
        detectedUnit,
        rowCount: 0,
        detectedHeaders: Array.from(recognizedHeadersSet),
        hasOperationalData: false,
      };
    }

    // Build recognized headers readable list
    const headerDisplayMap: Record<string, string> = {
      startDepth: 'Start Depth',
      endDepth: 'End Depth',
      singleDepth: 'Depth Station',
      fluidType: 'Type Fluid',
      circulatingPressure: 'Circulating Pressure',
      wellheadPressure: 'Well Head Pressure',
      weight: 'Weight / Hookload',
      pumpRate: 'Pump Rate',
      n2Rate: 'N2 Rate',
      bendingPct: '% Bending Fatigue',
      h2sPct: '% H2S Fatigue',
      estFatiguePct: 'Est. Fatigue (%)',
      jointLocation: 'Joint Location',
      jointFatigue: 'Joint Fatigue (%)',
    };

    const recognizedLabels = Array.from(recognizedHeadersSet)
      .map((h) => headerDisplayMap[h] || h)
      .filter(Boolean);

    return {
      success: true,
      message: `Parsed ${finalSteps.length} intervals (${recognizedLabels.join(', ')}) with ${extractedJoints.length} bias welds.`,
      steps: finalSteps,
      joints: extractedJoints,
      detectedUnit,
      rowCount: finalSteps.length,
      detectedHeaders: recognizedLabels,
      hasOperationalData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `File parsing error: ${err?.message || 'Unknown error'}`,
      steps: [],
      joints: [],
      detectedUnit: 'ft',
      rowCount: 0,
      detectedHeaders: [],
      hasOperationalData: false,
    };
  }
};

/**
 * Generates an Excel workbook (.xlsx) with standard field headers
 */
export const exportFatigueToExcel = (
  steps: FieldFatigueStep[],
  joints: FieldJointData[],
  stringNo: string,
  unitSystem: 'imperial' | 'metric'
) => {
  const isMetric = unitSystem === 'metric';
  const unitLabel = isMetric ? 'm' : 'ft';
  const pressUnit = isMetric ? 'bar' : 'psi';
  const wtUnit = isMetric ? 'kg' : 'lbs';
  const mult = isMetric ? 0.3048 : 1.0;
  const pressMult = isMetric ? 0.0689476 : 1.0;
  const wtMult = isMetric ? 0.453592 : 1.0;

  // Sheet 1: Intervals with full field operational columns
  const intervalData = [
    [
      `Start Depth [${unitLabel}]`,
      `End Depth [${unitLabel}]`,
      'Type Fluid',
      `Circulating Pressure [${pressUnit}]`,
      `Well Head Pressure [${pressUnit}]`,
      `Weight [${wtUnit}]`,
      'Pump Rate [bpm]',
      'N2 Rate [scfm]',
      '% Bending Fatigue',
      '% H2S Fatigue',
      'Est. Fatigue (%)',
      'Zone / Section',
      'Notes',
    ],
    ...steps.map((s) => [
      parseFloat((s.startFt * mult).toFixed(2)),
      parseFloat((s.endFt * mult).toFixed(2)),
      s.fluidType || '',
      s.circulatingPressurePsi !== undefined
        ? parseFloat((s.circulatingPressurePsi * pressMult).toFixed(1))
        : '',
      s.wellheadPressurePsi !== undefined
        ? parseFloat((s.wellheadPressurePsi * pressMult).toFixed(1))
        : '',
      s.hookloadWeightLbs !== undefined
        ? Math.round(s.hookloadWeightLbs * wtMult)
        : '',
      s.pumpRateBpm !== undefined ? s.pumpRateBpm : '',
      s.n2RateScfm !== undefined ? s.n2RateScfm : '',
      parseFloat(s.bendingPct.toFixed(2)),
      parseFloat(s.h2sPct.toFixed(2)),
      parseFloat(s.estFatiguePct.toFixed(2)),
      s.zoneName || '',
      s.notes || '',
    ]),
  ];

  // Sheet 2: Joints
  const jointData = [
    [
      'Joint #',
      `Location [${unitLabel}]`,
      'Strip #',
      'Heat #',
      isMetric ? 'Wall Thickness [mm]' : 'Wall Thickness [in]',
      'Joint Factor',
      'Joint Fatigue (%)',
    ],
    ...joints.map((j) => [
      j.id,
      parseFloat((j.locationFt * mult).toFixed(2)),
      j.stripNo,
      j.heatNumber,
      isMetric ? parseFloat((j.wallThicknessIn * 25.4).toFixed(2)) : j.wallThicknessIn,
      j.jointFactor,
      j.overrideJointFatiguePct !== undefined
        ? parseFloat(j.overrideJointFatiguePct.toFixed(2))
        : '',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const wsIntervals = XLSX.utils.aoa_to_sheet(intervalData);
  const wsJoints = XLSX.utils.aoa_to_sheet(jointData);

  XLSX.utils.book_append_sheet(wb, wsIntervals, 'Fatigue Intervals');
  XLSX.utils.book_append_sheet(wb, wsJoints, 'Bias Welds');

  const fileName = `CT_Fatigue_Field_Log_${stringNo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Generates a clean CSV file with standard operational headers
 */
export const exportFatigueToCsv = (
  steps: FieldFatigueStep[],
  stringNo: string,
  unitSystem: 'imperial' | 'metric'
) => {
  const isMetric = unitSystem === 'metric';
  const unitLabel = isMetric ? 'm' : 'ft';
  const pressUnit = isMetric ? 'bar' : 'psi';
  const wtUnit = isMetric ? 'kg' : 'lbs';
  const mult = isMetric ? 0.3048 : 1.0;
  const pressMult = isMetric ? 0.0689476 : 1.0;
  const wtMult = isMetric ? 0.453592 : 1.0;

  const header = `Start_Depth_${unitLabel},End_Depth_${unitLabel},Type_Fluid,Circulating_Pressure_${pressUnit},Well_Head_Pressure_${pressUnit},Weight_${wtUnit},Pump_Rate_bpm,N2_Rate_scfm,Bending_Fatigue_pct,H2S_Fatigue_pct,Est_Fatigue_pct,Zone_Name,Notes\n`;
  const rows = steps
    .map((s) => {
      const pCirc = s.circulatingPressurePsi !== undefined ? (s.circulatingPressurePsi * pressMult).toFixed(1) : '';
      const pWhp = s.wellheadPressurePsi !== undefined ? (s.wellheadPressurePsi * pressMult).toFixed(1) : '';
      const wt = s.hookloadWeightLbs !== undefined ? Math.round(s.hookloadWeightLbs * wtMult) : '';
      const pr = s.pumpRateBpm !== undefined ? s.pumpRateBpm : '';
      const n2 = s.n2RateScfm !== undefined ? s.n2RateScfm : '';

      return `${(s.startFt * mult).toFixed(2)},${(s.endFt * mult).toFixed(2)},"${s.fluidType || ''}",${pCirc},${pWhp},${wt},${pr},${n2},${s.bendingPct.toFixed(2)},${s.h2sPct.toFixed(2)},${s.estFatiguePct.toFixed(2)},"${(s.zoneName || '').replace(/"/g, '""')}","${(s.notes || '').replace(/"/g, '""')}"`;
    })
    .join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `CT_Fatigue_Field_Log_${stringNo}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates an executive-grade PDF report with Fatigue Life vs Length graph,
 * String Specifications, Operational KPIs, Interval Log table, and Bias Welds.
 */
export const exportFatigueToPdf = (
  steps: FieldFatigueStep[],
  joints: FieldJointData[],
  ct: CoiledTubingString,
  stringNo: string,
  unitSystem: 'imperial' | 'metric',
  tripsRun: number = 24,
  internalPressurePsi: number = 3500,
  h2sPpm: number = 0
) => {
  const isMetric = unitSystem === 'metric';
  const unitLabel = isMetric ? 'm' : 'ft';
  const pressUnit = isMetric ? 'bar' : 'psi';
  const mult = isMetric ? 0.3048 : 1.0;
  const pressMult = isMetric ? 0.0689476 : 1.0;

  // Create jsPDF in Landscape A4 (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // --- PAGE 1: Executive Dashboard & Fatigue Graph ---
  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COILED MATRIX - COILED TUBING FATIGUE LIFE PROFILE REPORT', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Report Date: ${todayStr}  |  Unit System: ${isMetric ? 'Metric (SI)' : 'Imperial (Field)'}  |  Standard: API RP 5C7 / ASME Section VIII`, 14, 18);

  // String & Operational Specs Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 27, 269, 17, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(14, 27, 269, 17, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('STRING SPECIFICATIONS & RUN PARAMETERS:', 18, 32);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const odStr = isMetric ? `${(ct.outerDiameterIn * 25.4).toFixed(1)} mm` : `${ct.outerDiameterIn}"`;
  const wtStr = isMetric ? `${(ct.wallThicknessIn * 25.4).toFixed(2)} mm` : `${ct.wallThicknessIn}"`;
  const lenStr = isMetric ? `${Math.round(ct.totalLengthFt * mult).toLocaleString()} m` : `${Math.round(ct.totalLengthFt).toLocaleString()} ft`;
  const pressStr = isMetric ? `${Math.round(internalPressurePsi * pressMult)} bar` : `${Math.round(internalPressurePsi)} psi`;
  const gradeStr = `${ct.grade} (${ct.yieldStrengthPsi ? Math.round(ct.yieldStrengthPsi / 1000) : 80} ksi)`;

  doc.text(`String ID: ${stringNo}`, 18, 38);
  doc.text(`Grade: ${gradeStr}`, 68, 38);
  doc.text(`OD x WT: ${odStr} x ${wtStr}`, 128, 38);
  doc.text(`Total Length: ${lenStr}`, 188, 38);
  doc.text(`Operating Press: ${pressStr} | Trips: ${tripsRun}`, 232, 38);

  // KPI Summary Cards
  const maxFatigue = steps.length > 0 ? Math.max(...steps.map((s) => s.estFatiguePct)) : 0;
  const isOverLimit = maxFatigue >= 80;
  const isCritical = maxFatigue >= 100;

  // Card 1: Peak Fatigue
  doc.setFillColor(isOverLimit ? 254 : 240, isOverLimit ? 242 : 253, isOverLimit ? 242 : 244);
  doc.rect(14, 47, 62, 18, 'F');
  doc.setDrawColor(isOverLimit ? 248 : 167, isOverLimit ? 113 : 243, isOverLimit ? 113 : 208);
  doc.rect(14, 47, 62, 18, 'S');
  doc.setFontSize(7.5);
  doc.setTextColor(isOverLimit ? 185 : 5, isOverLimit ? 28 : 150, isOverLimit ? 28 : 105);
  doc.setFont('helvetica', 'bold');
  doc.text('PEAK FATIGUE USED', 18, 52);
  doc.setFontSize(13);
  doc.text(`${maxFatigue.toFixed(1)}% FU`, 18, 60);

  // Card 2: Regulatory Action Limit
  doc.setFillColor(248, 250, 252);
  doc.rect(83, 47, 62, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(83, 47, 62, 18, 'S');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('80% ACTION STATUS', 87, 52);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (isCritical) {
    doc.setTextColor(220, 38, 38);
    doc.text('CRITICAL: RETIRE / CUT', 87, 60);
  } else if (isOverLimit) {
    doc.setTextColor(217, 119, 6);
    doc.text('EXCEEDED (DERATE)', 87, 60);
  } else {
    doc.setTextColor(16, 185, 129);
    doc.text('COMPLIANT (<80%)', 87, 60);
  }

  // Card 3: Est. Remaining Trips
  const remainingTrips = maxFatigue > 0 ? Math.max(0, Math.round(((80 - maxFatigue) / (maxFatigue / tripsRun)))) : 99;
  doc.setFillColor(248, 250, 252);
  doc.rect(152, 47, 62, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(152, 47, 62, 18, 'S');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('EST. REMAINING TRIPS (TO 80%)', 156, 52);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${remainingTrips} trips`, 156, 60);

  // Card 4: Environmental Derate
  doc.setFillColor(248, 250, 252);
  doc.rect(221, 47, 62, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(221, 47, 62, 18, 'S');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('ENVIRONMENT / SOUR RISK', 225, 52);
  doc.setFontSize(10);
  doc.setTextColor(h2sPpm > 0 ? 217 : 15, h2sPpm > 0 ? 119 : 23, h2sPpm > 0 ? 6 : 42);
  doc.text(h2sPpm > 0 ? `${h2sPpm} ppm H2S (Sour Derated)` : 'Sweet Service (0 ppm H2S)', 225, 60);

  // --- VECTOR CHART: FATIGUE LIFE PROFILE PLOT ---
  const chartX = 24;
  const chartY = 74;
  const chartW = 250;
  const chartH = 92;

  // Chart Background
  doc.setFillColor(255, 255, 255);
  doc.rect(chartX, chartY, chartW, chartH, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.rect(chartX, chartY, chartW, chartH, 'S');

  // Chart Title
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(`CUMULATIVE FATIGUE USED (%) VS. STRING LENGTH [${unitLabel.toUpperCase()}]`, chartX + 4, chartY - 2);

  // Y-Axis Gridlines & Labels (0%, 20%, 40%, 60%, 80%, 100%)
  const yTicks = [0, 20, 40, 60, 80, 100];
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');

  yTicks.forEach((tickVal) => {
    const yPos = chartY + chartH - (tickVal / 100) * chartH;
    
    // Grid line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(chartX, yPos, chartX + chartW, yPos);

    // Label
    doc.setTextColor(100, 116, 139);
    doc.text(`${tickVal}%`, chartX - 7, yPos + 1.5, { align: 'right' });
  });

  // Reference Line: 100% Critical Failure
  const y100 = chartY + chartH - (100 / 100) * chartH;
  doc.setDrawColor(239, 68, 68); // red
  doc.setLineWidth(0.5);
  doc.line(chartX, y100, chartX + chartW, y100);
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('100% FAILURE LIMIT', chartX + chartW - 2, y100 - 1, { align: 'right' });

  // Reference Line: 80% Action Limit
  const y80 = chartY + chartH - (80 / 100) * chartH;
  doc.setDrawColor(245, 158, 11); // amber
  doc.setLineWidth(0.5);
  doc.line(chartX, y80, chartX + chartW, y80);
  doc.setTextColor(217, 119, 6);
  doc.text('80% ACTION / RETIREMENT THRESHOLD', chartX + chartW - 2, y80 - 1, { align: 'right' });

  // X-Axis Ticks (5 divisions along totalLength)
  const totalLenConverted = ct.totalLengthFt * mult;
  for (let i = 0; i <= 5; i++) {
    const fraction = i / 5;
    const xPos = chartX + fraction * chartW;
    const lenVal = Math.round(fraction * totalLenConverted);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(xPos, chartY, xPos, chartY + chartH);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${lenVal.toLocaleString()} ${unitLabel}`, xPos, chartY + chartH + 4, { align: 'center' });
  }

  // Draw Bias Welds / Joints Markers
  if (joints && joints.length > 0) {
    doc.setDrawColor(168, 85, 247); // purple
    doc.setLineWidth(0.3);
    joints.forEach((j) => {
      const xPos = chartX + (j.locationFt / (ct.totalLengthFt || 1)) * chartW;
      if (xPos >= chartX && xPos <= chartX + chartW) {
        doc.line(xPos, chartY + chartH - 4, xPos, chartY + chartH);
      }
    });
  }

  // Draw Fatigue Curve from steps
  if (steps && steps.length > 0) {
    const sorted = [...steps].sort((a, b) => a.startFt - b.startFt);
    doc.setDrawColor(14, 165, 233); // cyan-600
    doc.setLineWidth(0.7);

    // Plot segments
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const x1 = chartX + (s.startFt / (ct.totalLengthFt || 1)) * chartW;
      const x2 = chartX + (s.endFt / (ct.totalLengthFt || 1)) * chartW;
      const yVal = chartY + chartH - (Math.min(120, s.estFatiguePct) / 100) * chartH;

      // Draw horizontal step line
      doc.line(Math.max(chartX, x1), yVal, Math.min(chartX + chartW, x2), yVal);

      // Connect to next step if exists
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        const nextY = chartY + chartH - (Math.min(120, next.estFatiguePct) / 100) * chartH;
        doc.line(Math.min(chartX + chartW, x2), yVal, Math.min(chartX + chartW, x2), nextY);
      }
    }
  }

  // Chart Legend & Notes Box
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('LEGEND:  ', 18, 178);
  doc.setTextColor(14, 165, 233);
  doc.text('--- Cumulative Fatigue Profile', 32, 178);
  doc.setTextColor(245, 158, 11);
  doc.text('--- 80% Action Limit', 76, 178);
  doc.setTextColor(239, 68, 68);
  doc.text('--- 100% Critical Failure', 114, 178);
  doc.setTextColor(168, 85, 247);
  doc.text('| Bias Welds', 155, 178);

  // Page 1 Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page 1 of 2  |  Generated by Coiled Matrix CT Engineering Suite  |  ID: ${stringNo}`, 14, 204);
  doc.text('CONFIDENTIAL - WELLSITE OPERATIONAL REPORT', pageWidth - 14, 204, { align: 'right' });

  // --- PAGE 2: Operational Data Log & Field Intervals ---
  doc.addPage('a4', 'landscape');

  // Page 2 Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`STRING ${stringNo} - FIELD INTERVALS & WELD LOGS`, 14, 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Trip cycles: ${tripsRun}  |  Circulating Pressure: ${pressStr}`, pageWidth - 14, 12, { align: 'right' });

  // Table 1: Field Fatigue Steps / Intervals
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('OPERATIONAL DEPTH INTERVALS & CALCULATED FATIGUE', 14, 25);

  const startY = 28;
  const colWidths = [12, 38, 38, 48, 32, 28, 28, 25];
  const headers = ['#', `Start Depth [${unitLabel}]`, `End Depth [${unitLabel}]`, 'Fluid / Operation', `Circ Press [${pressUnit}]`, 'Bending %', 'H2S %', 'Total FU %'];

  // Draw Header Row
  let currentX = 14;
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(14, startY, 269, 6.5, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(14, startY, 269, 6.5, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  headers.forEach((h, idx) => {
    doc.text(h, currentX + 1.5, startY + 4.5);
    currentX += colWidths[idx];
  });

  // Table Data Rows
  let rowY = startY + 6.5;
  const maxRows = Math.min(steps.length, 16);

  for (let r = 0; r < maxRows; r++) {
    const s = steps[r];
    const isAlt = r % 2 === 1;
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(14, rowY, 269, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, rowY + 5.5, 283, rowY + 5.5);

    currentX = 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);

    const startConv = (s.startFt * mult).toFixed(1);
    const endConv = (s.endFt * mult).toFixed(1);
    const circConv = s.circulatingPressurePsi !== undefined ? (s.circulatingPressurePsi * pressMult).toFixed(0) : '-';
    const bendVal = `${s.bendingPct.toFixed(1)}%`;
    const h2sVal = `${s.h2sPct.toFixed(1)}%`;
    const totalVal = `${s.estFatiguePct.toFixed(1)}%`;

    const rowData = [
      `${r + 1}`,
      `${startConv} ${unitLabel}`,
      `${endConv} ${unitLabel}`,
      s.fluidType ? s.fluidType.slice(0, 30) : 'Standard Brine',
      circConv,
      bendVal,
      h2sVal,
      totalVal,
    ];

    rowData.forEach((val, idx) => {
      if (idx === 7) {
        // Highlight total fatigue
        const numVal = s.estFatiguePct;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(numVal >= 80 ? 220 : numVal >= 50 ? 217 : 5, numVal >= 80 ? 38 : numVal >= 50 ? 119 : 150, numVal >= 80 ? 38 : numVal >= 50 ? 6 : 105);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }
      doc.text(val, currentX + 1.5, rowY + 3.8);
      currentX += colWidths[idx];
    });

    rowY += 5.5;
  }

  // Bias Welds / Joints Table on bottom half
  const weldStartY = rowY + 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`BIAS WELDS & JOINTS REGISTER (${joints.length} Welds Recorded)`, 14, weldStartY - 2);

  const weldWidths = [18, 45, 45, 45, 45, 45];
  const weldHeaders = ['Joint #', `Distance From Reel End [${unitLabel}]`, 'Strip No', 'Heat Number', 'Joint Factor', 'Local Fatigue'];

  let wX = 14;
  doc.setFillColor(226, 232, 240);
  doc.rect(14, weldStartY, 243, 6, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(14, weldStartY, 243, 6, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  weldHeaders.forEach((wh, idx) => {
    doc.text(wh, wX + 1.5, weldStartY + 4.2);
    wX += weldWidths[idx];
  });

  let wRowY = weldStartY + 6;
  const maxWelds = Math.min(joints.length, 6);

  if (joints.length === 0) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No factory bias welds specified for this continuous milled string.', 18, wRowY + 4);
    wRowY += 8;
  } else {
    for (let j = 0; j < maxWelds; j++) {
      const jnt = joints[j];
      const isAlt = j % 2 === 1;
      doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
      doc.rect(14, wRowY, 243, 5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, wRowY + 5, 257, wRowY + 5);

      wX = 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);

      const jntDist = (jnt.locationFt * mult).toFixed(1);
      const jntFatigue = jnt.overrideJointFatiguePct !== undefined ? `${jnt.overrideJointFatiguePct.toFixed(1)}%` : 'Base Material';

      const wRowData = [
        `${jnt.id}`,
        `${jntDist} ${unitLabel}`,
        `${jnt.stripNo || 'STR-0' + (j + 1)}`,
        `${jnt.heatNumber || 'H-84729'}`,
        `${jnt.jointFactor?.toFixed(2) || '1.00'}`,
        jntFatigue,
      ];

      wRowData.forEach((wv, idx) => {
        doc.text(wv, wX + 1.5, wRowY + 3.5);
        wX += weldWidths[idx];
      });

      wRowY += 5;
    }
  }

  // Field Sign-off & Disposition Box
  const boxY = Math.max(wRowY + 6, 160);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, boxY, 269, 28, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, boxY, 269, 28, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ENGINEERING SIGN-OFF & STRING DISPOSITION:', 18, boxY + 6);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('1. Strings reaching 80% cumulative fatigue MUST be de-rated or inspected via full-body NDT / UT wall-thickness verification.', 18, boxY + 12);
  doc.text('2. If highest fatigue is concentrated in the first 2,000 ft, a string cut-off is recommended to recover string working life.', 18, boxY + 17);

  doc.text('Field Engineer: __________________________    Signature: __________________________    Date: _______________', 18, boxY + 23);

  // Page 2 Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page 2 of 2  |  Generated by Coiled Matrix CT Engineering Suite  |  ID: ${stringNo}`, 14, 204);
  doc.text('CONFIDENTIAL - WELLSITE OPERATIONAL REPORT', pageWidth - 14, 204, { align: 'right' });

  // Save PDF
  const filename = `CT_Fatigue_Profile_Report_${stringNo}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

/**
 * Generates a ready-to-use template for field engineers with standard field column headers:
 * Start Depth, End Depth, Type Fluid, Circulating Pressure, Well Head Pressure, Weight, Pump Rate, N2 Rate
 */
export const downloadTemplate = (format: 'xlsx' | 'csv', unit: 'ft' | 'm') => {
  const isMetric = unit === 'm';

  const sampleSteps: FieldFatigueStep[] = [
    {
      id: 'step-1',
      startFt: 0,
      endFt: 5800,
      fluidType: 'Water with Friction Reducer',
      circulatingPressurePsi: 2400,
      wellheadPressurePsi: 350,
      hookloadWeightLbs: 18500,
      pumpRateBpm: 1.8,
      n2RateScfm: 0,
      bendingPct: 1.2,
      h2sPct: 0.1,
      estFatiguePct: 1.3,
      zoneName: 'Surface Wraps (Reel Core)',
      notes: 'RIH deployment with water',
    },
    {
      id: 'step-2',
      startFt: 5800,
      endFt: 8000,
      fluidType: '15% HCl Acid System',
      circulatingPressurePsi: 4800,
      wellheadPressurePsi: 1850,
      hookloadWeightLbs: 26400,
      pumpRateBpm: 2.4,
      n2RateScfm: 800,
      bendingPct: 8.5,
      h2sPct: 0.6,
      estFatiguePct: 9.1,
      zoneName: 'Primary Working Reciprocation Zone',
      notes: 'Acid stimulation across perfs at high differential pressure',
    },
    {
      id: 'step-3',
      startFt: 8000,
      endFt: 12000,
      fluidType: 'Nitrogen Foam (70 Quality)',
      circulatingPressurePsi: 3900,
      wellheadPressurePsi: 1400,
      hookloadWeightLbs: 29800,
      pumpRateBpm: 1.2,
      n2RateScfm: 1500,
      bendingPct: 5.2,
      h2sPct: 0.3,
      estFatiguePct: 5.5,
      zoneName: 'Mid-Well Section',
      notes: 'N2 foam cleanout and gas lift',
    },
    {
      id: 'step-4',
      startFt: 12000,
      endFt: 13500,
      fluidType: 'Viscous Gel Sweep',
      circulatingPressurePsi: 4200,
      wellheadPressurePsi: 1650,
      hookloadWeightLbs: 33500,
      pumpRateBpm: 2.0,
      n2RateScfm: 0,
      bendingPct: 6.4,
      h2sPct: 0.4,
      estFatiguePct: 6.8,
      zoneName: 'Perforation Depth Wash',
      notes: 'Debris washing over bridge plug',
    },
    {
      id: 'step-5',
      startFt: 13500,
      endFt: 17000,
      fluidType: 'Brine 9.2 ppg',
      circulatingPressurePsi: 3600,
      wellheadPressurePsi: 1200,
      hookloadWeightLbs: 38200,
      pumpRateBpm: 1.5,
      n2RateScfm: 600,
      bendingPct: 4.8,
      h2sPct: 0.3,
      estFatiguePct: 5.1,
      zoneName: 'Lower Section Circulation',
      notes: 'Circulation passes before POOH',
    },
    {
      id: 'step-6',
      startFt: 17000,
      endFt: 25327,
      fluidType: 'Wellbore Fluid / Brine',
      circulatingPressurePsi: 2800,
      wellheadPressurePsi: 900,
      hookloadWeightLbs: 43500,
      pumpRateBpm: 1.0,
      n2RateScfm: 0,
      bendingPct: 1.1,
      h2sPct: 0.1,
      estFatiguePct: 1.2,
      zoneName: 'Distal / BHA Section',
      notes: 'Deepest depth reached, lowest reel cycling',
    },
  ];

  const sampleJoints: FieldJointData[] = [
    {
      id: 'Joint #1',
      locationFt: 3600,
      stripNo: 'QT11918-S1',
      wallThicknessIn: 0.109,
      heatNumber: 'H-91821',
      jointFactor: 1.25,
      overrideJointFatiguePct: 1.6,
    },
    {
      id: 'Joint #2',
      locationFt: 5900,
      stripNo: 'QT11918-S2',
      wallThicknessIn: 0.109,
      heatNumber: 'H-91822',
      jointFactor: 1.25,
      overrideJointFatiguePct: 11.4,
    },
    {
      id: 'Joint #3',
      locationFt: 9000,
      stripNo: 'QT11918-S3',
      wallThicknessIn: 0.125,
      heatNumber: 'H-91823',
      jointFactor: 1.25,
      overrideJointFatiguePct: 6.9,
    },
    {
      id: 'Joint #4',
      locationFt: 14700,
      stripNo: 'QT11918-S4',
      wallThicknessIn: 0.125,
      heatNumber: 'H-91824',
      jointFactor: 1.25,
      overrideJointFatiguePct: 6.2,
    },
  ];

  if (format === 'xlsx') {
    exportFatigueToExcel(sampleSteps, sampleJoints, 'STANDARD_FIELD_TEMPLATE', isMetric ? 'metric' : 'imperial');
  } else {
    exportFatigueToCsv(sampleSteps, 'STANDARD_FIELD_TEMPLATE', isMetric ? 'metric' : 'imperial');
  }
};

/**
 * Automate calculation of % Bending Fatigue, % H2S Fatigue, and Est. Fatigue (%)
 * using industry-standard coiled tubing cyclic plastic strain and hoop/axial derating
 */
export const calculateIntervalFatigue = (
  step: {
    startFt: number;
    endFt: number;
    fluidType?: string;
    circulatingPressurePsi?: number;
    wellheadPressurePsi?: number;
    hookloadWeightLbs?: number;
    pumpRateBpm?: number;
    n2RateScfm?: number;
    bendingPct?: number;
    h2sPct?: number;
    estFatiguePct?: number;
  },
  ct?: CoiledTubingString
): { bendingPct: number; h2sPct: number; estFatiguePct: number } => {
  const pCirc = step.circulatingPressurePsi ?? 3500;
  const pWhp = step.wellheadPressurePsi ?? 500;
  const deltaP = Math.max(0, pCirc - pWhp);

  const od = ct?.outerDiameterIn ?? 1.75;
  const wt = ct?.wallThicknessIn ?? 0.125;
  const sy = ct?.yieldStrengthPsi ?? 80000;
  const reelR = ct?.reelCoreDiameterIn ? ct.reelCoreDiameterIn / 2 : 38;
  const gooseR = ct?.gooseneckRadiusIn ?? 72;

  // 1. Cyclic Plastic Bending Strain Amplitude over reel and guide arch (Achilles LCF)
  const epsBending = (od / (2 * reelR)) + (od / (2 * gooseR));

  // 2. Hoop stress from differential pressure
  const hoopStress = (deltaP * (od - 2 * wt)) / (2 * wt);
  const hoopRatio = Math.min(1.2, hoopStress / sy);
  const pressureMultiplier = 1.0 + 1.8 * Math.pow(hoopRatio, 1.4);

  // 3. Hookload axial load factor
  const hookload = step.hookloadWeightLbs ?? 22000;
  const tensileArea = Math.PI * (od - wt) * wt;
  const axialStress = hookload / Math.max(0.1, tensileArea);
  const axialRatio = Math.min(1.0, axialStress / sy);
  const tensionMultiplier = 1.0 + 0.45 * axialRatio;

  // Baseline LCF damage per trip/interval pass (~2.5% to 5.0% depending on bending strain)
  const baseDamagePercent = 3.2 * (epsBending / 0.025);
  const calculatedBendingPct = parseFloat((baseDamagePercent * pressureMultiplier * tensionMultiplier).toFixed(2));

  // 4. % H2S Fatigue calculation (sour / acid embrittlement derating)
  const fluid = (step.fluidType || '').toLowerCase();
  const isSour = fluid.includes('h2s') || fluid.includes('sour');
  const isAcid = fluid.includes('acid') || fluid.includes('hcl');
  const isGasN2 = fluid.includes('n2') || fluid.includes('nitrogen') || ((step.n2RateScfm ?? 0) > 100);

  let h2sSeverity = 0.05; // sweet benign baseline
  if (isSour) {
    h2sSeverity = 0.85 + (deltaP / 4000) * 0.4;
  } else if (isAcid) {
    h2sSeverity = 0.50 + (deltaP / 5000) * 0.3;
  } else if (isGasN2) {
    h2sSeverity = 0.15;
  }
  const calculatedH2sPct = parseFloat((calculatedBendingPct * (h2sSeverity / 10)).toFixed(2));

  // 5. Est. Fatigue (%) = Bending % + H2S %
  const calculatedEstFatiguePct = parseFloat((calculatedBendingPct + calculatedH2sPct).toFixed(2));

  return {
    bendingPct: calculatedBendingPct,
    h2sPct: calculatedH2sPct,
    estFatiguePct: calculatedEstFatiguePct,
  };
};

/**
 * Automate calculation and generation of Bias Weld coordinates
 * from Coiled Tubing string specifications or mill strip length
 */
export const generateBiasWeldsFromCalculation = (
  ct: CoiledTubingString,
  customStripLengthFt?: number
): FieldJointData[] => {
  // If string has manufacturer MTR segments, use exact factory bias weld coordinates
  if (ct.certificateRef?.segments && ct.certificateRef.segments.length > 1) {
    return ct.certificateRef.segments.map((seg, idx) => ({
      id: `Weld #${idx + 1}`,
      locationFt: seg.biasWeldLocationFt,
      stripNo: seg.stripNo || `Strip-${idx + 1}`,
      wallThicknessIn: seg.wallThicknessIn,
      heatNumber: seg.heatNumber || `HT-${92810 + idx}`,
      jointFactor: 1.25, // Standard API 5ST / Achilles bias weld stress concentration factor
      overrideJointFatiguePct: undefined,
    }));
  }

  // Otherwise, calculate equidistant bias weld coordinates along string length based on mill strip length
  const totalLength = ct.totalLengthFt || 20000;
  const stripLength = customStripLengthFt && customStripLengthFt > 200 ? customStripLengthFt : 2200; // default ~2200 ft per mill strip
  const numWelds = Math.max(1, Math.floor(totalLength / stripLength));
  const joints: FieldJointData[] = [];

  for (let i = 1; i <= numWelds; i++) {
    const loc = Math.round(i * stripLength);
    if (loc >= totalLength) break;
    joints.push({
      id: `Bias Weld #${i}`,
      locationFt: loc,
      stripNo: `S-${String(i).padStart(2, '0')}/${String(i + 1).padStart(2, '0')}`,
      wallThicknessIn: ct.wallThicknessIn || 0.125,
      heatNumber: `HT-${94000 + i * 17}`,
      jointFactor: 1.25,
      overrideJointFatiguePct: undefined,
    });
  }

  return joints;
};
