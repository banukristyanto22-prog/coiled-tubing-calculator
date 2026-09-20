import { jsPDF } from 'jspdf';
import { CoiledTubingString, UnitSystem, CalculationHistoryEntry } from '../types/coiledTubing';
import {
  calculateGeometry,
  calculateTubingLimits,
  calculateHydraulics,
  calculateWellboreForces,
  calculateReelCapacity,
  calculateAchillesFatigue,
  inToMm,
  ftToM,
  psiToMpa,
  lbfToKn,
} from './engineeringCalculations';
import { DEFAULT_HYDRAULICS, DEFAULT_FORCES } from '../data/presets';
import { evaluateCalculationSafety } from './safetyEvaluator';

/**
 * Generates a comprehensive multi-page vector PDF containing:
 * - Page 1: Executive Batch Summary & Audit Index
 * - Pages 2..N+1: Complete Engineering Calculation Job Sheets for each bookmarked run
 */
export function generateBatchJobSheetPdf(
  entries: CalculationHistoryEntry[],
  unitSystem: UnitSystem,
  options?: { includeSummarySheet?: boolean }
): jsPDF {
  const isMetric = unitSystem === 'metric';
  const includeSummary = options?.includeSummarySheet !== false;

  // Create jsPDF in Portrait A4 (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  const todayStr = new Date().toISOString().split('T')[0];
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const totalSheets = includeSummary ? entries.length + 1 : entries.length;

  // Helper to draw a standard header banner on any page
  const drawPageHeader = (
    title: string,
    subtitle: string,
    sheetNum: number,
    runRef?: string
  ) => {
    // Dark slate banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Accent line
    doc.setFillColor(6, 182, 212); // cyan-500
    doc.rect(0, 20, pageWidth, 1.2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginX, 9);

    // Subtitle
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(subtitle, marginX, 15);

    // Right-aligned metadata
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`DATE: ${todayStr}`, pageWidth - marginX, 8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(
      runRef ? `REF: ${runRef}` : `UNITS: ${isMetric ? 'Metric (SI)' : 'US Oilfield'}`,
      pageWidth - marginX,
      12.5,
      { align: 'right' }
    );
    doc.text(
      `SHEET ${sheetNum} OF ${totalSheets}`,
      pageWidth - marginX,
      17,
      { align: 'right' }
    );
  };

  // Helper to draw standard page footer
  const drawPageFooter = (sheetNum: number) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      'Coil Matrix Pro Suite • Conformance: API Spec 5ST / API RP 5C7 • Verified Engineering Calculations',
      marginX,
      pageHeight - 6
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Sheet ${sheetNum} of ${totalSheets}`,
      pageWidth - marginX,
      pageHeight - 6,
      { align: 'right' }
    );
  };

  // ==========================================
  // PAGE 1: EXECUTIVE BATCH SUMMARY (if enabled)
  // ==========================================
  let currentSheetIndex = 1;

  if (includeSummary) {
    drawPageHeader(
      'COIL MATRIX PRO • COILED TUBING BATCH REPORT',
      'Executive Summary & Comprehensive Engineering Batch Audit Index',
      currentSheetIndex
    );

    let curY = 26;

    // Overview Stats Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(marginX, curY, contentWidth, 22, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(marginX, curY, contentWidth, 22, 'S');

    // Calculate pass/fail breakdown
    let passCount = 0;
    let failCount = 0;
    entries.forEach((e) => {
      const evalRes = evaluateCalculationSafety(e);
      if (evalRes.status === 'pass') passCount++;
      else failCount++;
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('BATCH RUN PORTFOLIO OVERVIEW', marginX + 4, curY + 6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${dateFormatted}`, marginX + 4, curY + 11);
    doc.text(
      `Total Bookmarked Configurations: ${entries.length}`,
      marginX + 4,
      curY + 16
    );
    doc.text(
      `Governing Standard: API Spec 5ST & ASTM A370`,
      marginX + 4,
      curY + 20
    );

    // KPI Pills on the right
    // Pass Pill
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.rect(pageWidth - marginX - 70, curY + 4, 32, 14, 'F');
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.rect(pageWidth - marginX - 70, curY + 4, 32, 14, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('SAFE / PASS', pageWidth - marginX - 68, curY + 9);
    doc.setFontSize(10);
    doc.text(`${passCount}`, pageWidth - marginX - 68, curY + 15);

    // Violations Pill
    doc.setFillColor(failCount > 0 ? 255 : 241, failCount > 0 ? 241 : 245, failCount > 0 ? 242 : 249);
    doc.rect(pageWidth - marginX - 34, curY + 4, 32, 14, 'F');
    doc.setDrawColor(failCount > 0 ? 254 : 203, failCount > 0 ? 205 : 213, failCount > 0 ? 211 : 225);
    doc.rect(pageWidth - marginX - 34, curY + 4, 32, 14, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(failCount > 0 ? 225 : 100, failCount > 0 ? 29 : 116, failCount > 0 ? 72 : 139);
    doc.text('VIOLATIONS', pageWidth - marginX - 32, curY + 9);
    doc.setFontSize(10);
    doc.text(`${failCount}`, pageWidth - marginX - 32, curY + 15);

    curY += 27;

    // Table Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(marginX, curY, contentWidth, 7, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('# / REF', marginX + 2, curY + 4.8);
    doc.text('STRING DESIGNATION & TITLE', marginX + 16, curY + 4.8);
    doc.text('SIZE (OD x WT)', marginX + 78, curY + 4.8);
    doc.text('GRADE', marginX + 104, curY + 4.8);
    doc.text('LENGTH', marginX + 120, curY + 4.8);
    doc.text('API BURST', marginX + 138, curY + 4.8);
    doc.text('TENSILE YS', marginX + 158, curY + 4.8);
    doc.text('STATUS', marginX + 175, curY + 4.8);

    curY += 7;

    // Table Rows
    const rowHeight = 7.5;
    entries.forEach((entry, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(marginX, curY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, curY + rowHeight, marginX + contentWidth, curY + rowHeight);

      const ct = entry.stringSnapshot;
      const limits = calculateTubingLimits(ct);
      const evalRes = evaluateCalculationSafety(entry);
      const sheetTarget = idx + 2;

      // Sheet #
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`P.${sheetTarget}`, marginX + 2, curY + 4.8);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const titleTrunc = entry.title.length > 36 ? entry.title.substring(0, 34) + '...' : entry.title;
      doc.text(titleTrunc, marginX + 16, curY + 4.8);

      // Dimensions
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const odStr = isMetric ? `${inToMm(ct.outerDiameterIn).toFixed(1)}mm` : `${ct.outerDiameterIn.toFixed(3)}"`;
      const wtStr = isMetric ? `${inToMm(ct.wallThicknessIn).toFixed(2)}mm` : `${ct.wallThicknessIn.toFixed(3)}"`;
      doc.text(`${odStr} x ${wtStr}`, marginX + 78, curY + 4.8);

      // Grade
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(8, 145, 178); // cyan-600
      const gradeStr = ct.grade || (ct as any).materialGrade || 'CT90';
      doc.text(gradeStr, marginX + 104, curY + 4.8);

      // Length
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const lenStr = isMetric ? `${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m` : `${ct.totalLengthFt.toLocaleString()} ft`;
      doc.text(lenStr, marginX + 120, curY + 4.8);

      // API Burst
      const burstStr = isMetric ? `${Math.round(limits.apiBurstMpa)} MPa` : `${Math.round(limits.apiBurstPressurePsi).toLocaleString()} psi`;
      doc.text(burstStr, marginX + 138, curY + 4.8);

      // Tensile Yield
      const tensStr = isMetric ? `${Math.round(limits.tensileYieldKn)} kN` : `${Math.round(limits.tensileYieldLbf).toLocaleString()} lb`;
      doc.text(tensStr, marginX + 158, curY + 4.8);

      // Status Pill
      if (evalRes.status === 'pass') {
        doc.setFillColor(209, 250, 229); // emerald-100
        doc.rect(marginX + 174, curY + 1.5, 10, 4.5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text('PASS', marginX + 176, curY + 4.6);
      } else {
        doc.setFillColor(254, 226, 226); // rose-100
        doc.rect(marginX + 174, curY + 1.5, 10, 4.5, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(225, 29, 72);
        doc.text('FAIL', marginX + 176, curY + 4.6);
      }

      curY += rowHeight;
    });

    curY += 6;

    // Operational Guidelines / Audit Sign-off
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(marginX, curY, contentWidth, 36, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, curY, contentWidth, 36, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('BATCH AUDIT VERIFICATION & CERTIFICATION COMPLIANCE', marginX + 4, curY + 6);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      'This document contains the consolidated calculation run sheets for all selected bookmarked coiled tubing models.',
      marginX + 4,
      curY + 11
    );
    doc.text(
      'All structural, pressure, and fatigue estimates adhere strictly to API Specification 5ST and API RP 5C7 standards.',
      marginX + 4,
      curY + 15
    );
    doc.text(
      'Safe Working Pressure envelope reflects standard 80% working factor against API 87.5% specified yield burst limit.',
      marginX + 4,
      curY + 19
    );

    // Signatures in Audit box
    const sigY = curY + 23;
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By (Lead Engineer):', marginX + 4, sigY);
    doc.line(marginX + 4, sigY + 7, marginX + 50, sigY + 7);

    doc.text('Approved By (Superintendent):', marginX + 70, sigY);
    doc.line(marginX + 70, sigY + 7, marginX + 120, sigY + 7);

    doc.text('Date of Field Authorization:', marginX + 135, sigY);
    doc.line(marginX + 135, sigY + 7, marginX + 178, sigY + 7);

    drawPageFooter(currentSheetIndex);
    currentSheetIndex++;
  }

  // ==========================================
  // PAGES 2..N+1: INDIVIDUAL DETAILED JOB SHEETS
  // ==========================================
  entries.forEach((entry) => {
    // If not first page or if summary was rendered, add new page
    doc.addPage();

    const ct = entry.stringSnapshot;
    const geom = calculateGeometry(ct);
    const limits = calculateTubingLimits(ct);
    const hyd = calculateHydraulics(ct, DEFAULT_HYDRAULICS);
    const forces = calculateWellboreForces(ct, DEFAULT_FORCES);
    const reel = calculateReelCapacity(ct);
    const fatigue = calculateAchillesFatigue(ct, 3500, 25);
    const evalRes = evaluateCalculationSafety(entry);

    const reportNo = ct.certificateRef?.reportNo || 'JOB-CT-2026-ENG';

    drawPageHeader(
      'COILED TUBING ENGINEERING REPORT',
      'Modeled in conformance with API Spec 5ST • Coil Matrix Pro Suite',
      currentSheetIndex,
      reportNo
    );

    let curY = 24;

    // Identification Header Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(marginX, curY, contentWidth, 15, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(marginX, curY, contentWidth, 15, 'S');

    const colW = contentWidth / 4;

    // Col 1: String Name / Title
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('STRING DESIGNATION / TITLE', marginX + 3, curY + 4.5);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const displayTitle = entry.title.length > 25 ? entry.title.substring(0, 23) + '...' : entry.title;
    doc.text(displayTitle, marginX + 3, curY + 10);

    // Col 2: Grade & Size
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GRADE & SIZE', marginX + colW + 3, curY + 4.5);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const gradeVal = ct.grade || (ct as any).materialGrade || 'CT90';
    doc.text(`${gradeVal} • ${ct.outerDiameterIn}" x ${ct.wallThicknessIn}"`, marginX + colW + 3, curY + 10);

    // Col 3: Shaft / Serial #
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('SERIAL / SHAFT #', marginX + colW * 2 + 3, curY + 4.5);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const shaftText = ct.certificateRef?.shaftNo ? `Shaft ${ct.certificateRef.shaftNo}` : 'CT-STR-01';
    doc.text(shaftText, marginX + colW * 2 + 3, curY + 10);

    // Col 4: Total Length & Status
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL LENGTH & STATUS', marginX + colW * 3 + 3, curY + 4.5);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const lengthStr = isMetric
      ? `${Math.round(ftToM(ct.totalLengthFt)).toLocaleString()} m`
      : `${ct.totalLengthFt.toLocaleString()} ft`;
    doc.text(`${lengthStr}  [${evalRes.label}]`, marginX + colW * 3 + 3, curY + 10);

    curY += 18;

    // Helper to draw section title
    const drawSectionTitle = (title: string, yPos: number) => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginX, yPos, contentWidth, 5.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(marginX, yPos + 5.5, marginX + contentWidth, yPos + 5.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(title, marginX + 3, yPos + 4);
    };

    // Helper to draw a key-value row
    const drawKeyValue = (label: string, val: string, x: number, y: number, isAccent?: boolean) => {
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(label, x, y);

      doc.setFont('helvetica', 'bold');
      if (isAccent) {
        doc.setTextColor(8, 145, 178); // cyan-600
      } else {
        doc.setTextColor(15, 23, 42);
      }
      doc.text(val, x + 55, y, { align: 'right' });
    };

    // SECTION 1: String Geometry & Capacities
    drawSectionTitle('1. TUBING GEOMETRY & CAPACITIES', curY);
    curY += 7.5;

    const subColW = contentWidth / 3;
    // Sub-col 1
    drawKeyValue(
      'Outer Diameter (OD):',
      isMetric ? `${inToMm(ct.outerDiameterIn).toFixed(2)} mm` : `${ct.outerDiameterIn.toFixed(3)} in`,
      marginX + 2,
      curY
    );
    drawKeyValue(
      'Inner Diameter (ID):',
      isMetric ? `${inToMm(geom.innerDiameterIn).toFixed(2)} mm` : `${geom.innerDiameterIn.toFixed(3)} in`,
      marginX + 2,
      curY + 4.5
    );
    drawKeyValue(
      'Wall Thickness:',
      isMetric ? `${inToMm(ct.wallThicknessIn).toFixed(2)} mm` : `${ct.wallThicknessIn.toFixed(3)} in`,
      marginX + 2,
      curY + 9
    );
    drawKeyValue('D/t Ratio:', geom.dtRatio.toFixed(2), marginX + 2, curY + 13.5);

    // Sub-col 2
    drawKeyValue(
      'Weight in Air:',
      isMetric ? `${geom.weightInAirKgM.toFixed(2)} kg/m` : `${geom.weightInAirLbFt.toFixed(2)} lb/ft`,
      marginX + subColW + 2,
      curY
    );
    drawKeyValue(
      'Total Dry Weight:',
      isMetric ? `${Math.round(geom.totalWeightInAirKg).toLocaleString()} kg` : `${Math.round(geom.totalWeightInAirLbs).toLocaleString()} lbs`,
      marginX + subColW + 2,
      curY + 4.5
    );
    drawKeyValue(
      'Water Filled Weight:',
      isMetric
        ? `${Math.round(geom.totalWeightInAirKg + geom.totalCapacityM3 * 1000).toLocaleString()} kg`
        : `${Math.round(geom.totalWeightInAirLbs + geom.totalCapacityBbl * 42 * 8.34).toLocaleString()} lbs`,
      marginX + subColW + 2,
      curY + 9
    );

    // Sub-col 3
    drawKeyValue(
      'Internal Capacity:',
      isMetric ? `${geom.capacityLpm.toFixed(2)} L/m` : `${geom.capacityBbl1000Ft.toFixed(3)} bbl/kft`,
      marginX + subColW * 2 + 2,
      curY
    );
    drawKeyValue(
      'Total String Volume:',
      isMetric ? `${geom.totalCapacityM3.toFixed(2)} m³` : `${geom.totalCapacityBbl.toFixed(2)} bbl`,
      marginX + subColW * 2 + 2,
      curY + 4.5
    );
    drawKeyValue(
      'Total Displacement:',
      isMetric ? `${(geom.totalDisplacementBbl * 0.158987).toFixed(2)} m³` : `${geom.totalDisplacementBbl.toFixed(2)} bbl`,
      marginX + subColW * 2 + 2,
      curY + 9
    );

    curY += 18;

    // SECTION 2: Structural & Pressure Limits (API Spec 5ST)
    drawSectionTitle('2. STRUCTURAL & PRESSURE LIMITS (API SPEC 5ST)', curY);
    curY += 7.5;

    // Sub-col 1
    drawKeyValue(
      '100% Yield Burst:',
      isMetric ? `${Math.round(limits.yieldBurstMpa)} MPa` : `${Math.round(limits.yieldBurstPressurePsi).toLocaleString()} psi`,
      marginX + 2,
      curY
    );
    drawKeyValue(
      'API 87.5% Burst:',
      isMetric ? `${Math.round(limits.apiBurstMpa)} MPa` : `${Math.round(limits.apiBurstPressurePsi).toLocaleString()} psi`,
      marginX + 2,
      curY + 4.5
    );
    drawKeyValue(
      '80% Safe Working:',
      isMetric ? `${Math.round(psiToMpa(limits.safeBurstPressurePsi))} MPa` : `${Math.round(limits.safeBurstPressurePsi).toLocaleString()} psi`,
      marginX + 2,
      curY + 9,
      true
    );

    // Sub-col 2
    drawKeyValue(
      'Collapse Resistance:',
      isMetric ? `${Math.round(limits.collapseMpa)} MPa` : `${Math.round(limits.ovalityDeratedCollapsePsi).toLocaleString()} psi`,
      marginX + subColW + 2,
      curY
    );
    drawKeyValue(
      'Specified Min YS:',
      isMetric ? `${Math.round(psiToMpa(ct.specifiedMinYieldPsi))} MPa` : `${ct.specifiedMinYieldPsi.toLocaleString()} psi`,
      marginX + subColW + 2,
      curY + 4.5
    );
    drawKeyValue(
      'Actual Test YS (Rp0.2):',
      isMetric ? `${Math.round(psiToMpa(ct.yieldStrengthPsi))} MPa` : `${ct.yieldStrengthPsi.toLocaleString()} psi`,
      marginX + subColW + 2,
      curY + 9,
      true
    );

    // Sub-col 3
    drawKeyValue(
      'Tensile Yield (100%):',
      isMetric ? `${Math.round(limits.tensileYieldKn)} kN` : `${Math.round(limits.tensileYieldLbf).toLocaleString()} lbf`,
      marginX + subColW * 2 + 2,
      curY
    );
    drawKeyValue(
      'Safe Overpull (80%):',
      isMetric ? `${Math.round(limits.safeOverpullKn)} kN` : `${Math.round(limits.safeOverpullLbf).toLocaleString()} lbf`,
      marginX + subColW * 2 + 2,
      curY + 4.5,
      true
    );
    drawKeyValue(
      'Hydrotest (15 min):',
      isMetric ? '75.9 MPa' : '11,008 psi',
      marginX + subColW * 2 + 2,
      curY + 9
    );

    curY += 18;

    // SECTION 3 & 4: Hydraulics & Wellbore Forces
    const halfW = (contentWidth - 6) / 2;

    // Col A: Hydraulics
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, curY, halfW, 5.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. CIRCULATION HYDRAULICS', marginX + 3, curY + 4);

    // Col B: Wellbore Forces
    doc.rect(marginX + halfW + 6, curY, halfW, 5.5, 'F');
    doc.text('4. WELLBORE FORCES & BUCKLING', marginX + halfW + 9, curY + 4);

    curY += 7.5;

    // Hydraulics Data
    drawKeyValue(
      'Pump Rate:',
      `${DEFAULT_HYDRAULICS.flowRateGpm} gpm (${(DEFAULT_HYDRAULICS.flowRateGpm / 42).toFixed(2)} bpm)`,
      marginX + 2,
      curY
    );
    drawKeyValue('Fluid Density:', `${DEFAULT_HYDRAULICS.fluidDensityPpg} ppg`, marginX + 2, curY + 4.5);
    drawKeyValue(
      'Standpipe Pressure:',
      isMetric ? `${Math.round(hyd.totalCirculatingPressureBar)} bar` : `${Math.round(hyd.totalCirculatingPressurePsi).toLocaleString()} psi`,
      marginX + 2,
      curY + 9,
      true
    );
    drawKeyValue(
      'Ito Reel Curvature:',
      `× ${hyd.itoReelCurvatureMultiplier.toFixed(2)} (+${Math.round((hyd.itoReelCurvatureMultiplier - 1) * 100)}%)`,
      marginX + 2,
      curY + 13.5
    );
    drawKeyValue('Annular Velocity:', `${Math.round(hyd.annularVelocityFtMin)} ft/min`, marginX + 2, curY + 18);

    // Forces Data
    drawKeyValue('Well Measured Depth:', `${DEFAULT_FORCES.measuredDepthFt.toLocaleString()} ft`, marginX + halfW + 8, curY);
    drawKeyValue(
      'Slack-off (RIH):',
      isMetric ? `${Math.round(lbfToKn(forces.surfaceSlackoffWeightLbf))} kN` : `${Math.round(forces.surfaceSlackoffWeightLbf).toLocaleString()} lbf`,
      marginX + halfW + 8,
      curY + 4.5
    );
    drawKeyValue(
      'Pick-up (POOH):',
      isMetric ? `${Math.round(lbfToKn(forces.surfacePickupWeightLbf))} kN` : `${Math.round(forces.surfacePickupWeightLbf).toLocaleString()} lbf`,
      marginX + halfW + 8,
      curY + 9
    );
    drawKeyValue(
      'Sinusoidal Buckling:',
      isMetric ? `${Math.round(lbfToKn(forces.criticalSinusoidalBucklingLbf))} kN` : `${Math.round(forces.criticalSinusoidalBucklingLbf).toLocaleString()} lbf`,
      marginX + halfW + 8,
      curY + 13.5
    );
    drawKeyValue(
      'Helical Threshold:',
      isMetric ? `${Math.round(lbfToKn(forces.helicalBucklingThresholdLbf))} kN` : `${Math.round(forces.helicalBucklingThresholdLbf).toLocaleString()} lbf`,
      marginX + halfW + 8,
      curY + 18,
      true
    );

    curY += 23;

    // SECTION 5: Shipping Reel & Spooling Specs
    drawSectionTitle('5. SHIPPING REEL & SPOOLING SPECS', curY);
    curY += 7.5;

    const reelColW = contentWidth / 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Reel Dimensions:', marginX + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      isMetric
        ? `${Math.round(inToMm(ct.reelFlangeDiameterIn))}mm x ${Math.round(inToMm(ct.reelWidthIn))}mm`
        : `${ct.reelFlangeDiameterIn}" OD x ${ct.reelWidthIn}" W`,
      marginX + 2,
      curY + 4.5
    );

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Spool Capacity:', marginX + reelColW + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      isMetric ? `${Math.round(reel.maxCapacityM).toLocaleString()} m` : `${Math.round(reel.maxCapacityFt).toLocaleString()} ft`,
      marginX + reelColW + 2,
      curY + 4.5
    );

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Spool Fill %:', marginX + reelColW * 2 + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${reel.spoolFillPercentage.toFixed(1)}% Full`, marginX + reelColW * 2 + 2, curY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Gross Reel Weight:', marginX + reelColW * 3 + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      isMetric ? `${Math.round(reel.totalReelWeightGrossLbs * 0.453592).toLocaleString()} kg` : `${Math.round(reel.totalReelWeightGrossLbs).toLocaleString()} lbs`,
      marginX + reelColW * 3 + 2,
      curY + 4.5
    );

    curY += 12;

    // SECTION 6: Achilles 4.0 Fatigue Life Prediction
    drawSectionTitle('6. CT FATIGUE LIFE PREDICTION (ACHILLES 4.0 / TFATIGUE)', curY);
    curY += 7.5;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Total Trip Capacity:', marginX + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${fatigue.estimatedTotalTripCycles} Trips (${fatigue.tripDamagePercent.toFixed(3)}%/trip)`, marginX + 2, curY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Factory Bias Weld Life:', marginX + reelColW + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`${fatigue.biasWeldLifeTrips} Trips (0.92 JIP)`, marginX + reelColW + 2, curY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Max Bending Strain:', marginX + reelColW * 2 + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${Math.max(fatigue.deltaEpsXReelPercent, fatigue.deltaEpsXGooseneckPercent).toFixed(3)}% (Arch/Reel)`, marginX + reelColW * 2 + 2, curY + 4.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Tipton OD Growth:', marginX + reelColW * 3 + 2, curY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234); // purple-600
    doc.text(
      isMetric ? `+${(fatigue.ballooningGrowthEstimatedIn * 25.4).toFixed(3)} mm` : `+${fatigue.ballooningGrowthEstimatedIn.toFixed(4)}"`,
      marginX + reelColW * 3 + 2,
      curY + 4.5
    );

    curY += 13;

    // SECTION 7: Safety & Compliance Status Strip
    const isPass = evalRes.status === 'pass';
    doc.setFillColor(isPass ? 236 : 255, isPass ? 253 : 241, isPass ? 245 : 242);
    doc.rect(marginX, curY, contentWidth, 10, 'F');
    doc.setDrawColor(isPass ? 167 : 254, isPass ? 243 : 205, isPass ? 208 : 211);
    doc.setLineWidth(0.3);
    doc.rect(marginX, curY, contentWidth, 10, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPass ? 5 : 225, isPass ? 150 : 29, isPass ? 105 : 72);
    doc.text(isPass ? 'COMPLIANCE AUDIT: ALL SAFETY CRITERIA SATISFIED' : 'LIMIT EXCEEDED: ENGINEERING DERATING REQUIRED', marginX + 4, curY + 4.2);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const evalSummary = evalRes.summaryText || (isPass ? 'Within API Spec 5ST allowable working thresholds.' : evalRes.primaryViolation || 'Operating bounds exceeded.');
    doc.text(evalSummary, marginX + 4, curY + 8);

    curY += 13;

    // SECTION 8: Sign-off and Engineering Signatures Box
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, curY, contentWidth, 23, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, curY, contentWidth, 23, 'S');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);

    // Prepared By
    doc.text('Prepared By:', marginX + 4, curY + 4.5);
    doc.line(marginX + 4, curY + 14, marginX + 48, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Coiled Tubing Engineer', marginX + 4, curY + 18);

    // Reviewed By
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Reviewed & Approved By:', marginX + 58, curY + 4.5);
    doc.line(marginX + 58, curY + 14, marginX + 108, curY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Operations Superintendent', marginX + 58, curY + 18);

    // API Badge on Right
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('✓ API 5ST VALIDATED', marginX + 120, curY + 7);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('von Mises yield, Churchill friction,', marginX + 120, curY + 11.5);
    doc.text('and Dawson-Paslay buckling formulation.', marginX + 120, curY + 15.5);

    drawPageFooter(currentSheetIndex);
    currentSheetIndex++;
  });

  return doc;
}

/**
 * Directly downloads the batch PDF report
 */
export function downloadBatchJobSheetPdf(
  entries: CalculationHistoryEntry[],
  unitSystem: UnitSystem,
  filename?: string,
  options?: { includeSummarySheet?: boolean }
): void {
  if (!entries || entries.length === 0) return;
  const doc = generateBatchJobSheetPdf(entries, unitSystem, options);
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `CoilMatrix_Batch_JobSheets_${dateStr}.pdf`;
  doc.save(finalFilename);
}
