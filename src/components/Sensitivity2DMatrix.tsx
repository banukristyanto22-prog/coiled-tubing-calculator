import React, { useState, useMemo } from 'react';
import { 
  CoiledTubingString, 
  UnitSystem, 
  WellboreForcesInput, 
  HydraulicsInput 
} from '../types/coiledTubing';
import {
  calculateWellboreForces,
  calculateHydraulics,
  calculateTubingLimits,
  evaluateOperatingPoint,
  ftToM,
  mToFt,
  psiToBar,
  barToPsi,
  lbfToKn,
  knToLbf,
  gpmToLpm,
  lpmToGpm,
  ppgToSg,
  sgToPpg,
  inToMm
} from '../utils/engineeringCalculations';
import { 
  Grid3X3, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Layers, 
  Info, 
  Maximize2,
  Filter,
  Eye,
  Crosshair,
  TrendingUp,
  Compass,
  ArrowDownRight
} from 'lucide-react';

interface Sensitivity2DMatrixProps {
  ct: CoiledTubingString;
  unitSystem: UnitSystem;
}

export type MatrixScenarioId = 
  | 'depth_vs_inclination'
  | 'depth_vs_friction'
  | 'flow_vs_depth'
  | 'flow_vs_nozzle'
  | 'pressure_vs_tension'
  | 'depth_vs_density';

export interface MatrixCellData {
  rowVal: number;
  colVal: number;
  rowLabel: string;
  colLabel: string;
  metricValue: number;
  metricFormatted: string;
  metricUnit: string;
  status: 'safe' | 'caution' | 'critical';
  details: { label: string; value: string; isWarning?: boolean }[];
  statusText: string;
}

export const Sensitivity2DMatrix: React.FC<Sensitivity2DMatrixProps> = ({
  ct,
  unitSystem,
}) => {
  const isMetric = unitSystem === 'metric';

  // Active Scenario
  const [scenario, setScenario] = useState<MatrixScenarioId>('depth_vs_inclination');

  // Baseline Fixed Constants (for factors not being swept)
  const [fixedFriction, setFixedFriction] = useState<number>(0.25);
  const [fixedInclination, setFixedInclination] = useState<number>(45);
  const [fixedCasingId, setFixedCasingId] = useState<number>(6.0);
  const [fixedFluidDensity, setFixedFluidDensity] = useState<number>(8.6); // ppg
  const [fixedViscosity, setFixedViscosity] = useState<number>(1.2); // cp
  const [fixedNozzleDia, setFixedNozzleDia] = useState<number>(0.1875);
  const [fixedNozzleCount, setFixedNozzleCount] = useState<number>(4);
  const [fixedDepth, setFixedDepth] = useState<number>(10000); // ft

  // Axis ranges definition
  // 1. Depth range (ft) - Starting from 0 (surface level)
  const [depthStart, setDepthStart] = useState<number>(0);
  const [depthEnd, setDepthEnd] = useState<number>(16000);
  const [depthSteps, setDepthSteps] = useState<number>(7);

  // 2. Inclination range (deg)
  const [incStart, setIncStart] = useState<number>(0);
  const [incEnd, setIncEnd] = useState<number>(75);
  const [incSteps, setIncSteps] = useState<number>(6);

  // 3. Friction range
  const [fricStart, setFricStart] = useState<number>(0.15);
  const [fricEnd, setFricEnd] = useState<number>(0.45);
  const [fricSteps, setFricSteps] = useState<number>(7);

  // 4. Flow rate range (GPM)
  const [flowStart, setFlowStart] = useState<number>(25);
  const [flowEnd, setFlowEnd] = useState<number>(125);
  const [flowSteps, setFlowSteps] = useState<number>(6);

  // 5. Nozzle diameter range (in)
  const [nozzleStart, setNozzleStart] = useState<number>(0.125);
  const [nozzleEnd, setNozzleEnd] = useState<number>(0.250);
  const [nozzleSteps, setNozzleSteps] = useState<number>(6);

  // 6. Pressure range (psi)
  const [pressStart, setPressStart] = useState<number>(0);
  const [pressEnd, setPressEnd] = useState<number>(7500);
  const [pressSteps, setPressSteps] = useState<number>(6);

  // 7. Tension range (% of yield)
  const [tensionRatioStart, setTensionRatioStart] = useState<number>(0);
  const [tensionRatioEnd, setTensionRatioEnd] = useState<number>(70);
  const [tensionRatioSteps, setTensionRatioSteps] = useState<number>(6);

  // 8. Density range (ppg)
  const [densityStart, setDensityStart] = useState<number>(8.33);
  const [densityEnd, setDensityEnd] = useState<number>(13.5);
  const [densitySteps, setDensitySteps] = useState<number>(6);

  // Selected cell for detailed inspector modal / card
  const [selectedCell, setSelectedCell] = useState<MatrixCellData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<MatrixCellData | null>(null);

  // Metric selector per scenario
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('slackoff');

  // Tubing structural limits
  const baseLimits = useMemo(() => calculateTubingLimits(ct), [ct]);

  // Helper to generate linearly spaced array
  const generateSteps = (start: number, end: number, count: number): number[] => {
    const n = Math.max(2, Math.min(15, Math.round(count)));
    const step = (end - start) / (n - 1);
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      const val = start + i * step;
      arr.push(Math.round(val * 1000) / 1000);
    }
    return arr;
  };

  // Scenario Metric Definitions
  const scenarioConfig = useMemo(() => {
    switch (scenario) {
      case 'depth_vs_inclination':
        return {
          title: 'Well Depth (MD) × Wellbore Inclination (θ)',
          rowName: 'Measured Depth',
          rowUnit: isMetric ? 'm' : 'ft',
          colName: 'Wellbore Inclination',
          colUnit: '°',
          description: 'Evaluate slack-off RIH load, POOH tension, and critical buckling boundary as well deviates from vertical to high-angle.',
          metrics: [
            { key: 'slackoff', label: 'Slack-Off Load (RIH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'pickup', label: 'Pick-Up Tension (POOH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'drag', label: 'Total Wellbore Drag', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'overpull', label: 'Safe Overpull Margin', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'buckling_margin', label: 'Sinusoidal Buckling Safety Factor', unit: 'SF' },
          ],
          defaultMetric: 'slackoff',
        };
      case 'depth_vs_friction':
        return {
          title: 'Well Depth (MD) × Casing Friction Coefficient (μ)',
          rowName: 'Measured Depth',
          rowUnit: isMetric ? 'm' : 'ft',
          colName: 'Friction Factor (μ)',
          colUnit: '',
          description: 'Assess how friction factor variations (e.g. brine vs polymer lubricants vs sand/rough casing) impact reach limits and surface hookloads.',
          metrics: [
            { key: 'slackoff', label: 'Slack-Off Load (RIH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'pickup', label: 'Pick-Up Tension (POOH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'drag', label: 'Total Wellbore Drag', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'overpull', label: 'Available Overpull', unit: isMetric ? 'kN' : 'lbf' },
          ],
          defaultMetric: 'slackoff',
        };
      case 'flow_vs_depth':
        return {
          title: 'Pump Flow Rate (Q) × Well Depth (MD)',
          rowName: 'Flow Rate',
          rowUnit: isMetric ? 'L/min' : 'GPM',
          colName: 'Well Depth',
          colUnit: isMetric ? 'm' : 'ft',
          description: 'Simulate pump standpipe pressure, tubing internal friction loss, and hydraulic horsepower demand across varying pump rates and string lengths.',
          metrics: [
            { key: 'standpipe', label: 'Standpipe Surface Pressure', unit: isMetric ? 'bar' : 'psi' },
            { key: 'tubing_dp', label: 'Tubing Friction Loss (ΔP)', unit: isMetric ? 'bar' : 'psi' },
            { key: 'hhp', label: 'Hydraulic Horsepower', unit: 'HHP' },
            { key: 'velocity', label: 'Internal Fluid Velocity', unit: isMetric ? 'm/s' : 'ft/s' },
          ],
          defaultMetric: 'standpipe',
        };
      case 'flow_vs_nozzle':
        return {
          title: 'Pump Flow Rate (Q) × Jet Nozzle Diameter (d_n)',
          rowName: 'Flow Rate',
          rowUnit: isMetric ? 'L/min' : 'GPM',
          colName: 'Nozzle Diameter',
          colUnit: isMetric ? 'mm' : 'in',
          description: 'Optimize BHA jetting hydraulics, nozzle pressure drop, and total circulating pressure across pump rates and orifice sizes.',
          metrics: [
            { key: 'standpipe', label: 'Total Standpipe Pressure', unit: isMetric ? 'bar' : 'psi' },
            { key: 'nozzle_dp', label: 'Nozzle Jet Orifice ΔP', unit: isMetric ? 'bar' : 'psi' },
            { key: 'jet_velocity', label: 'Nozzle Jet Velocity', unit: isMetric ? 'm/s' : 'ft/s' },
            { key: 'hhp', label: 'Hydraulic Horsepower', unit: 'HHP' },
          ],
          defaultMetric: 'standpipe',
        };
      case 'pressure_vs_tension':
        return {
          title: 'Internal Pressure (P_i) × Axial Tension Load (F_a)',
          rowName: 'Internal Pressure',
          rowUnit: isMetric ? 'bar' : 'psi',
          colName: 'Axial Tension (% Yield)',
          colUnit: '%',
          description: 'Map the biaxial von Mises stress envelope (API Spec 5ST) showing safe operating window and reduced tensile capacity under differential pressure.',
          metrics: [
            { key: 'stress_ratio', label: 'von Mises Stress Ratio', unit: '%' },
            { key: 'derated_tensile', label: 'Derated Tensile Yield Limit', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'safe_overpull', label: 'Safe Overpull Margin', unit: isMetric ? 'kN' : 'lbf' },
          ],
          defaultMetric: 'stress_ratio',
        };
      case 'depth_vs_density':
        return {
          title: 'Well Depth (MD) × Fluid Density (ρ)',
          rowName: 'Measured Depth',
          rowUnit: isMetric ? 'm' : 'ft',
          colName: 'Fluid Density',
          colUnit: isMetric ? 'SG' : 'ppg',
          description: 'Examine buoyancy effect on string weight, bottomhole hydrostatic pressure, and hookloads as fluid density changes from water to heavy muds.',
          metrics: [
            { key: 'bhp', label: 'Bottomhole Hydrostatic BHP', unit: isMetric ? 'bar' : 'psi' },
            { key: 'slackoff', label: 'Slack-Off Hookload (RIH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'pickup', label: 'Pick-Up Hookload (POOH)', unit: isMetric ? 'kN' : 'lbf' },
            { key: 'buoyancy_factor', label: 'Buoyancy Factor (BF)', unit: '' },
          ],
          defaultMetric: 'bhp',
        };
    }
  }, [scenario, isMetric]);

  // Adjust metric if switching scenario
  const effectiveMetric = useMemo(() => {
    const valid = scenarioConfig.metrics.some((m) => m.key === selectedMetricKey);
    return valid ? selectedMetricKey : scenarioConfig.defaultMetric;
  }, [scenarioConfig, selectedMetricKey]);

  // --- 2D MATRIX COMPUTATION ---
  const matrixResult = useMemo(() => {
    let rows: number[] = [];
    let cols: number[] = [];

    // Helper functions
    const safeTensile = baseLimits.safeTensileYieldLbf;
    const safeBurst = baseLimits.safeBurstPressurePsi;

    if (scenario === 'depth_vs_inclination') {
      rows = generateSteps(depthStart, depthEnd, depthSteps);
      cols = generateSteps(incStart, incEnd, incSteps);

      const grid: MatrixCellData[][] = rows.map((depth) => {
        return cols.map((inc) => {
          const forcesInput: WellboreForcesInput = {
            measuredDepthFt: depth,
            trueVerticalDepthFt: depth * Math.cos((inc * Math.PI) / 180),
            wellboreInclinationDeg: inc,
            casingInnerDiameterIn: fixedCasingId,
            wellboreFluidDensityPpg: fixedFluidDensity,
            frictionCoefficientCasing: fixedFriction,
            frictionCoefficientOpenHole: fixedFriction * 1.2,
            surfaceOverpullLimitLbf: safeTensile * 0.8,
            appliedInjectorSnubbingLbf: 0,
            appliedInjectorTensionLbf: 0,
          };
          const f = calculateWellboreForces(ct, forcesInput);
          const slack = f.surfaceSlackoffWeightLbf;
          const pick = f.surfacePickupWeightLbf;
          const drag = f.totalWellboreDragLbf;
          const overpull = Math.max(0, safeTensile - pick);
          const compForce = -slack;
          const fCrit = f.criticalSinusoidalBucklingLbf;
          const fHel = f.helicalBucklingThresholdLbf;
          const bucklingRatio = fCrit > 0 ? (compForce > 0 ? compForce / fCrit : 0) : 0;
          const bucklingSF = bucklingRatio > 0 ? Math.round((1 / bucklingRatio) * 100) / 100 : 9.99;

          const isHelical = f.isLockedUp || (compForce > fHel);
          const isSinusoidal = compForce > fCrit;
          const status: 'safe' | 'caution' | 'critical' = isHelical ? 'critical' : isSinusoidal ? 'caution' : 'safe';

          let metricVal = 0;
          let metricFormatted = '';
          let metricUnit = '';

          if (effectiveMetric === 'slackoff') {
            metricVal = isMetric ? lbfToKn(slack) : slack;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else if (effectiveMetric === 'pickup') {
            metricVal = isMetric ? lbfToKn(pick) : pick;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else if (effectiveMetric === 'drag') {
            metricVal = isMetric ? lbfToKn(drag) : drag;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else if (effectiveMetric === 'overpull') {
            metricVal = isMetric ? lbfToKn(overpull) : overpull;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else {
            // buckling_margin (Safety factor against sinusoidal buckling)
            metricVal = bucklingSF;
            metricFormatted = bucklingSF >= 9.9 ? '>9.9' : bucklingSF.toFixed(2);
            metricUnit = 'SF';
          }

          const rowLbl = isMetric ? `${Math.round(ftToM(depth)).toLocaleString()} m` : `${depth.toLocaleString()} ft`;
          const colLbl = `${inc}°`;

          return {
            rowVal: depth,
            colVal: inc,
            rowLabel: rowLbl,
            colLabel: colLbl,
            metricValue: metricVal,
            metricFormatted,
            metricUnit,
            status,
            statusText: isHelical ? 'Helical Lockup' : isSinusoidal ? 'Sinusoidal Buckling' : 'Safe Operating Envelope',
            details: [
              { label: 'Slack-Off Load (RIH)', value: isMetric ? `${lbfToKn(slack).toFixed(1)} kN` : `${Math.round(slack).toLocaleString()} lbf`, isWarning: slack < 0 },
              { label: 'Pick-Up Tension (POOH)', value: isMetric ? `${lbfToKn(pick).toFixed(1)} kN` : `${Math.round(pick).toLocaleString()} lbf` },
              { label: 'Wellbore Friction Drag', value: isMetric ? `${lbfToKn(drag).toFixed(1)} kN` : `${Math.round(drag).toLocaleString()} lbf` },
              { label: 'Critical Buckling (F_crit)', value: isMetric ? `${lbfToKn(fCrit).toFixed(1)} kN` : `${Math.round(fCrit).toLocaleString()} lbf` },
              { label: 'Safe Overpull Margin', value: isMetric ? `${lbfToKn(overpull).toFixed(1)} kN` : `${Math.round(overpull).toLocaleString()} lbf` },
              { label: 'True Vertical Depth', value: isMetric ? `${Math.round(ftToM(forcesInput.trueVerticalDepthFt)).toLocaleString()} m` : `${Math.round(forcesInput.trueVerticalDepthFt).toLocaleString()} ft` },
            ],
          };
        });
      });

      return { rows, cols, grid };
    } 

    if (scenario === 'depth_vs_friction') {
      rows = generateSteps(depthStart, depthEnd, depthSteps);
      cols = generateSteps(fricStart, fricEnd, fricSteps);

      const grid: MatrixCellData[][] = rows.map((depth) => {
        return cols.map((mu) => {
          const forcesInput: WellboreForcesInput = {
            measuredDepthFt: depth,
            trueVerticalDepthFt: depth * Math.cos((fixedInclination * Math.PI) / 180),
            wellboreInclinationDeg: fixedInclination,
            casingInnerDiameterIn: fixedCasingId,
            wellboreFluidDensityPpg: fixedFluidDensity,
            frictionCoefficientCasing: mu,
            frictionCoefficientOpenHole: mu * 1.2,
            surfaceOverpullLimitLbf: safeTensile * 0.8,
            appliedInjectorSnubbingLbf: 0,
            appliedInjectorTensionLbf: 0,
          };
          const f = calculateWellboreForces(ct, forcesInput);
          const slack = f.surfaceSlackoffWeightLbf;
          const pick = f.surfacePickupWeightLbf;
          const drag = f.totalWellboreDragLbf;
          const overpull = Math.max(0, safeTensile - pick);
          const isHelical = f.isLockedUp || (-slack > f.helicalBucklingThresholdLbf);
          const isSinusoidal = -slack > f.criticalSinusoidalBucklingLbf;
          const status: 'safe' | 'caution' | 'critical' = isHelical ? 'critical' : isSinusoidal ? 'caution' : 'safe';

          let metricVal = 0;
          let metricFormatted = '';
          let metricUnit = '';

          if (effectiveMetric === 'slackoff') {
            metricVal = isMetric ? lbfToKn(slack) : slack;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else if (effectiveMetric === 'pickup') {
            metricVal = isMetric ? lbfToKn(pick) : pick;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else if (effectiveMetric === 'drag') {
            metricVal = isMetric ? lbfToKn(drag) : drag;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else {
            metricVal = isMetric ? lbfToKn(overpull) : overpull;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          }

          const rowLbl = isMetric ? `${Math.round(ftToM(depth)).toLocaleString()} m` : `${depth.toLocaleString()} ft`;
          const colLbl = `μ ${mu.toFixed(2)}`;

          return {
            rowVal: depth,
            colVal: mu,
            rowLabel: rowLbl,
            colLabel: colLbl,
            metricValue: metricVal,
            metricFormatted,
            metricUnit,
            status,
            statusText: isHelical ? 'Helical Lockup' : isSinusoidal ? 'Sinusoidal Buckling' : 'Safe Operating Envelope',
            details: [
              { label: 'Casing Friction Factor (μ)', value: mu.toFixed(3) },
              { label: 'Slack-Off Load (RIH)', value: isMetric ? `${lbfToKn(slack).toFixed(1)} kN` : `${Math.round(slack).toLocaleString()} lbf`, isWarning: slack < 0 },
              { label: 'Pick-Up Tension (POOH)', value: isMetric ? `${lbfToKn(pick).toFixed(1)} kN` : `${Math.round(pick).toLocaleString()} lbf` },
              { label: 'Total Friction Drag', value: isMetric ? `${lbfToKn(drag).toFixed(1)} kN` : `${Math.round(drag).toLocaleString()} lbf` },
              { label: 'Safe Overpull Margin', value: isMetric ? `${lbfToKn(overpull).toFixed(1)} kN` : `${Math.round(overpull).toLocaleString()} lbf` },
            ],
          };
        });
      });

      return { rows, cols, grid };
    }

    if (scenario === 'flow_vs_depth') {
      rows = generateSteps(flowStart, flowEnd, flowSteps);
      cols = generateSteps(depthStart, depthEnd, depthSteps);

      const grid: MatrixCellData[][] = rows.map((q) => {
        return cols.map((d) => {
          const hydInput: HydraulicsInput = {
            flowRateGpm: q,
            fluidType: 'fresh_water',
            fluidDensityPpg: fixedFluidDensity,
            fluidViscosityCp: fixedViscosity,
            nozzleDiameterIn: fixedNozzleDia,
            nozzleCount: fixedNozzleCount,
            nozzleCd: 0.95,
            casingInnerDiameterIn: fixedCasingId,
            wellboreDepthFt: d,
            pumpSurfacePressurePsi: 0,
          };
          const res = calculateHydraulics(ct, hydInput);
          const pTotal = res.totalCirculatingPressurePsi;
          const pTubing = res.pressureDropTubingPsi;
          const hhp = res.hydraulicHorsepowerHhp;
          const vel = res.velocityFtSec;

          const isCritical = pTotal > safeBurst;
          const isCaution = pTotal > safeBurst * 0.85;
          const status: 'safe' | 'caution' | 'critical' = isCritical ? 'critical' : isCaution ? 'caution' : 'safe';

          let metricVal = 0;
          let metricFormatted = '';
          let metricUnit = '';

          if (effectiveMetric === 'standpipe') {
            metricVal = isMetric ? psiToBar(pTotal) : pTotal;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'bar' : 'psi';
          } else if (effectiveMetric === 'tubing_dp') {
            metricVal = isMetric ? psiToBar(pTubing) : pTubing;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'bar' : 'psi';
          } else if (effectiveMetric === 'hhp') {
            metricVal = hhp;
            metricFormatted = metricVal.toFixed(1);
            metricUnit = 'HHP';
          } else {
            metricVal = isMetric ? vel * 0.3048 : vel;
            metricFormatted = metricVal.toFixed(1);
            metricUnit = isMetric ? 'm/s' : 'ft/s';
          }

          const rowLbl = isMetric ? `${Math.round(gpmToLpm(q))} L/m` : `${q} GPM`;
          const colLbl = isMetric ? `${Math.round(ftToM(d)).toLocaleString()} m` : `${d.toLocaleString()} ft`;

          return {
            rowVal: q,
            colVal: d,
            rowLabel: rowLbl,
            colLabel: colLbl,
            metricValue: metricVal,
            metricFormatted,
            metricUnit,
            status,
            statusText: isCritical ? 'Exceeds Working Burst Pressure' : isCaution ? 'Elevated Standpipe Pressure (>85%)' : 'Normal Circulation',
            details: [
              { label: 'Circulating Standpipe Pressure', value: isMetric ? `${psiToBar(pTotal).toFixed(1)} bar` : `${Math.round(pTotal).toLocaleString()} psi`, isWarning: isCritical },
              { label: 'Tubing Internal Friction Loss', value: isMetric ? `${psiToBar(pTubing).toFixed(1)} bar` : `${Math.round(pTubing).toLocaleString()} psi` },
              { label: 'Hydraulic Horsepower', value: `${hhp.toFixed(1)} HHP` },
              { label: 'Fluid Velocity in CT', value: isMetric ? `${(vel * 0.3048).toFixed(1)} m/s` : `${vel.toFixed(1)} ft/s` },
              { label: 'Reynolds Number', value: Math.round(res.reynoldsNumber).toLocaleString() },
              { label: 'Cuttings Transport Efficiency', value: `${res.cuttingsTransportEfficiencyPercent.toFixed(1)}%` },
            ],
          };
        });
      });

      return { rows, cols, grid };
    }

    if (scenario === 'flow_vs_nozzle') {
      rows = generateSteps(flowStart, flowEnd, flowSteps);
      cols = generateSteps(nozzleStart, nozzleEnd, nozzleSteps);

      const grid: MatrixCellData[][] = rows.map((q) => {
        return cols.map((dn) => {
          const hydInput: HydraulicsInput = {
            flowRateGpm: q,
            fluidType: 'fresh_water',
            fluidDensityPpg: fixedFluidDensity,
            fluidViscosityCp: fixedViscosity,
            nozzleDiameterIn: dn,
            nozzleCount: fixedNozzleCount,
            nozzleCd: 0.95,
            casingInnerDiameterIn: fixedCasingId,
            wellboreDepthFt: fixedDepth,
            pumpSurfacePressurePsi: 0,
          };
          const res = calculateHydraulics(ct, hydInput);
          const pTotal = res.totalCirculatingPressurePsi;
          const pNozzle = res.nozzlePressureDropPsi;
          const hhp = res.hydraulicHorsepowerHhp;
          // Jet exit velocity (v = Q / (2.448 * Total Nozzle Area))
          const tfa = fixedNozzleCount * (Math.PI / 4) * dn * dn;
          const jetVelFtSec = tfa > 0 ? (q / (3.117 * tfa)) : 0;

          const isCritical = pTotal > safeBurst;
          const isCaution = pTotal > safeBurst * 0.85;
          const status: 'safe' | 'caution' | 'critical' = isCritical ? 'critical' : isCaution ? 'caution' : 'safe';

          let metricVal = 0;
          let metricFormatted = '';
          let metricUnit = '';

          if (effectiveMetric === 'standpipe') {
            metricVal = isMetric ? psiToBar(pTotal) : pTotal;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'bar' : 'psi';
          } else if (effectiveMetric === 'nozzle_dp') {
            metricVal = isMetric ? psiToBar(pNozzle) : pNozzle;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'bar' : 'psi';
          } else if (effectiveMetric === 'jet_velocity') {
            metricVal = isMetric ? jetVelFtSec * 0.3048 : jetVelFtSec;
            metricFormatted = metricVal.toFixed(1);
            metricUnit = isMetric ? 'm/s' : 'ft/s';
          } else {
            metricVal = hhp;
            metricFormatted = metricVal.toFixed(1);
            metricUnit = 'HHP';
          }

          const rowLbl = isMetric ? `${Math.round(gpmToLpm(q))} L/m` : `${q} GPM`;
          const colLbl = isMetric ? `${(dn * 25.4).toFixed(1)} mm` : `${dn.toFixed(3)}"`;

          return {
            rowVal: q,
            colVal: dn,
            rowLabel: rowLbl,
            colLabel: colLbl,
            metricValue: metricVal,
            metricFormatted,
            metricUnit,
            status,
            statusText: isCritical ? 'Pressure Exceeds 80% Envelope' : isCaution ? 'High Jet Differential (>85%)' : 'Optimal Jetting Hydraulics',
            details: [
              { label: 'Total Standpipe Pressure', value: isMetric ? `${psiToBar(pTotal).toFixed(1)} bar` : `${Math.round(pTotal).toLocaleString()} psi`, isWarning: isCritical },
              { label: 'Nozzle Jet Orifice ΔP', value: isMetric ? `${psiToBar(pNozzle).toFixed(1)} bar` : `${Math.round(pNozzle).toLocaleString()} psi` },
              { label: 'Total Flow Area (TFA)', value: `${tfa.toFixed(3)} in² (${(tfa * 645.16).toFixed(1)} mm²)` },
              { label: 'Nozzle Jet Velocity', value: isMetric ? `${(jetVelFtSec * 0.3048).toFixed(1)} m/s` : `${jetVelFtSec.toFixed(1)} ft/s` },
              { label: 'Hydraulic Horsepower', value: `${hhp.toFixed(1)} HHP` },
            ],
          };
        });
      });

      return { rows, cols, grid };
    }

    if (scenario === 'pressure_vs_tension') {
      rows = generateSteps(pressStart, pressEnd, pressSteps);
      cols = generateSteps(tensionRatioStart, tensionRatioEnd, tensionRatioSteps);

      const grid: MatrixCellData[][] = rows.map((p) => {
        return cols.map((ratio) => {
          const axialTension = (ratio / 100) * baseLimits.tensileYieldLbf;
          const vm = evaluateOperatingPoint(ct, p, axialTension);
          const hoopStress = (p * (ct.outerDiameterIn - 2 * ct.wallThicknessIn)) / (2 * ct.wallThicknessIn);
          const yieldStress = ct.yieldStrengthPsi;
          const deratedAxialStress = Math.sqrt(Math.max(0, Math.pow(yieldStress, 2) - 0.75 * Math.pow(hoopStress, 2)));
          const deratedTensileLbf = deratedAxialStress * (baseLimits.tensileYieldLbf / ct.yieldStrengthPsi);
          const safeOverpullLbf = Math.max(0, deratedTensileLbf * 0.8 - axialTension);

          const isCritical = vm.status === 'violation' || vm.status === 'critical' || vm.stressRatioPercent > 80;
          const isCaution = vm.status === 'caution' || vm.stressRatioPercent > 65;
          const status: 'safe' | 'caution' | 'critical' = isCritical ? 'critical' : isCaution ? 'caution' : 'safe';

          let metricVal = 0;
          let metricFormatted = '';
          let metricUnit = '';

          if (effectiveMetric === 'stress_ratio') {
            metricVal = vm.stressRatioPercent;
            metricFormatted = `${metricVal.toFixed(1)}%`;
            metricUnit = '%';
          } else if (effectiveMetric === 'derated_tensile') {
            metricVal = isMetric ? lbfToKn(deratedTensileLbf) : deratedTensileLbf;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          } else {
            metricVal = isMetric ? lbfToKn(safeOverpullLbf) : safeOverpullLbf;
            metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
            metricUnit = isMetric ? 'kN' : 'lbf';
          }

          const rowLbl = isMetric ? `${Math.round(psiToBar(p))} bar` : `${p.toLocaleString()} psi`;
          const colLbl = `${ratio}% Yield`;

          return {
            rowVal: p,
            colVal: ratio,
            rowLabel: rowLbl,
            colLabel: colLbl,
            metricValue: metricVal,
            metricFormatted,
            metricUnit,
            status,
            statusText: isCritical ? 'Exceeds API Spec 5ST 80% Safe Limit' : isCaution ? 'Elevated Biaxial Stress (>65%)' : 'Within Safe Working Envelope',
            details: [
              { label: 'von Mises Stress Ratio', value: `${vm.stressRatioPercent.toFixed(1)}%`, isWarning: isCritical },
              { label: 'Equivalent Stress', value: isMetric ? `${(psiToBar(vm.vonMisesStressPsi) / 10).toFixed(1)} MPa` : `${Math.round(vm.vonMisesStressPsi).toLocaleString()} psi` },
              { label: 'Applied Axial Tension', value: isMetric ? `${lbfToKn(axialTension).toFixed(1)} kN` : `${Math.round(axialTension).toLocaleString()} lbf` },
              { label: 'Derated Tensile Yield', value: isMetric ? `${lbfToKn(deratedTensileLbf).toFixed(1)} kN` : `${Math.round(deratedTensileLbf).toLocaleString()} lbf` },
              { label: 'Safe Overpull Margin', value: isMetric ? `${lbfToKn(safeOverpullLbf).toFixed(1)} kN` : `${Math.round(safeOverpullLbf).toLocaleString()} lbf` },
            ],
          };
        });
      });

      return { rows, cols, grid };
    }

    // Default: depth_vs_density
    rows = generateSteps(depthStart, depthEnd, depthSteps);
    cols = generateSteps(densityStart, densityEnd, densitySteps);

    const grid: MatrixCellData[][] = rows.map((depth) => {
      return cols.map((rho) => {
        const forcesInput: WellboreForcesInput = {
          measuredDepthFt: depth,
          trueVerticalDepthFt: depth * Math.cos((fixedInclination * Math.PI) / 180),
          wellboreInclinationDeg: fixedInclination,
          casingInnerDiameterIn: fixedCasingId,
          wellboreFluidDensityPpg: rho,
          frictionCoefficientCasing: fixedFriction,
          frictionCoefficientOpenHole: fixedFriction * 1.2,
          surfaceOverpullLimitLbf: safeTensile * 0.8,
          appliedInjectorSnubbingLbf: 0,
          appliedInjectorTensionLbf: 0,
        };
        const f = calculateWellboreForces(ct, forcesInput);
        const bhpPsi = rho * 0.052 * forcesInput.trueVerticalDepthFt;
        const slack = f.surfaceSlackoffWeightLbf;
        const pick = f.surfacePickupWeightLbf;
        const bf = f.buoyancyFactor;

        const isCritical = f.isLockedUp || (-slack > f.helicalBucklingThresholdLbf);
        const isCaution = -slack > f.criticalSinusoidalBucklingLbf || slack < 0;
        const status: 'safe' | 'caution' | 'critical' = isCritical ? 'critical' : isCaution ? 'caution' : 'safe';

        let metricVal = 0;
        let metricFormatted = '';
        let metricUnit = '';

        if (effectiveMetric === 'bhp') {
          metricVal = isMetric ? psiToBar(bhpPsi) : bhpPsi;
          metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
          metricUnit = isMetric ? 'bar' : 'psi';
        } else if (effectiveMetric === 'slackoff') {
          metricVal = isMetric ? lbfToKn(slack) : slack;
          metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
          metricUnit = isMetric ? 'kN' : 'lbf';
        } else if (effectiveMetric === 'pickup') {
          metricVal = isMetric ? lbfToKn(pick) : pick;
          metricFormatted = isMetric ? metricVal.toFixed(1) : Math.round(metricVal).toLocaleString();
          metricUnit = isMetric ? 'kN' : 'lbf';
        } else {
          metricVal = bf;
          metricFormatted = bf.toFixed(3);
          metricUnit = '';
        }

        const rowLbl = isMetric ? `${Math.round(ftToM(depth)).toLocaleString()} m` : `${depth.toLocaleString()} ft`;
        const colLbl = isMetric ? `${ppgToSg(rho).toFixed(2)} SG` : `${rho.toFixed(1)} ppg`;

        return {
          rowVal: depth,
          colVal: rho,
          rowLabel: rowLbl,
          colLabel: colLbl,
          metricValue: metricVal,
          metricFormatted,
          metricUnit,
          status,
          statusText: isCritical ? 'Helical Lockup / Severe Drag' : isCaution ? 'Sinusoidal Buckling or High Buoyancy' : 'Normal Buoyed Operations',
          details: [
            { label: 'Bottomhole Hydrostatic BHP', value: isMetric ? `${psiToBar(bhpPsi).toFixed(1)} bar` : `${Math.round(bhpPsi).toLocaleString()} psi` },
            { label: 'Buoyancy Factor (BF)', value: bf.toFixed(3) },
            { label: 'Buoyed Linear Weight', value: isMetric ? `${(f.buoyedWeightLbFt * 1.48816).toFixed(2)} kg/m` : `${f.buoyedWeightLbFt.toFixed(2)} lb/ft` },
            { label: 'Slack-Off Load (RIH)', value: isMetric ? `${lbfToKn(slack).toFixed(1)} kN` : `${Math.round(slack).toLocaleString()} lbf`, isWarning: slack < 0 },
            { label: 'Pick-Up Tension (POOH)', value: isMetric ? `${lbfToKn(pick).toFixed(1)} kN` : `${Math.round(pick).toLocaleString()} lbf` },
          ],
        };
      });
    });

    return { rows, cols, grid };
  }, [
    scenario,
    depthStart, depthEnd, depthSteps,
    incStart, incEnd, incSteps,
    fricStart, fricEnd, fricSteps,
    flowStart, flowEnd, flowSteps,
    nozzleStart, nozzleEnd, nozzleSteps,
    pressStart, pressEnd, pressSteps,
    tensionRatioStart, tensionRatioEnd, tensionRatioSteps,
    densityStart, densityEnd, densitySteps,
    fixedFriction, fixedInclination, fixedCasingId, fixedFluidDensity, fixedViscosity, fixedNozzleDia, fixedNozzleCount, fixedDepth,
    effectiveMetric,
    ct,
    baseLimits,
    isMetric,
  ]);

  // Summary Metrics of the Matrix
  const matrixSummary = useMemo(() => {
    const allCells = matrixResult.grid.flat();
    const total = allCells.length;
    if (total === 0) return { min: 0, max: 0, safeCount: 0, safePercent: 100, criticalCount: 0 };

    const values = allCells.map((c) => c.metricValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const safeCount = allCells.filter((c) => c.status === 'safe').length;
    const cautionCount = allCells.filter((c) => c.status === 'caution').length;
    const criticalCount = allCells.filter((c) => c.status === 'critical').length;
    const safePercent = Math.round((safeCount / total) * 100);

    return { min, max, safeCount, cautionCount, criticalCount, safePercent, total };
  }, [matrixResult]);

  // Export 2D Matrix to CSV
  const handleExport2DCSV = () => {
    const { grid, cols } = matrixResult;
    if (!grid.length) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    const timestamp = new Date().toISOString().slice(0, 10);
    const activeMetricObj = scenarioConfig.metrics.find((m) => m.key === effectiveMetric);
    const metricTitle = activeMetricObj ? activeMetricObj.label : effectiveMetric;
    const metricUnitStr = activeMetricObj?.unit ? ` (${activeMetricObj.unit})` : '';

    csvContent += `COILED MATRIX - 2D DUAL-VARIABLE SENSITIVITY MATRIX\r\n`;
    csvContent += `Scenario: ${scenarioConfig.title}\r\n`;
    csvContent += `Tubing String: ${ct.name} (${ct.outerDiameterIn}" x ${ct.wallThicknessIn}" ${ct.grade})\r\n`;
    csvContent += `Evaluated Metric: ${metricTitle}${metricUnitStr}\r\n`;
    csvContent += `Date: ${timestamp}\r\n\r\n`;

    // Column Header Row: First cell is Row Variable Name, followed by Column Variable values
    const colHeaders = [
      `${scenarioConfig.rowName} \\ ${scenarioConfig.colName}`,
      ...grid[0].map((c) => `"${c.colLabel}"`),
    ];
    csvContent += colHeaders.join(',') + '\r\n';

    // Rows
    grid.forEach((row) => {
      const rowLabel = `"${row[0].rowLabel}"`;
      const cellValues = row.map((cell) => {
        // Clean numeric formatting for Excel
        return typeof cell.metricValue === 'number' && !isNaN(cell.metricValue)
          ? cell.metricValue.toFixed(2)
          : `"${cell.metricFormatted}"`;
      });
      csvContent += [rowLabel, ...cellValues].join(',') + '\r\n';
    });

    // Secondary table: Operational Status Matrix
    csvContent += `\r\nOPERATIONAL SAFETY STATUS MATRIX (SAFE / CAUTION / CRITICAL)\r\n`;
    csvContent += colHeaders.join(',') + '\r\n';
    grid.forEach((row) => {
      const rowLabel = `"${row[0].rowLabel}"`;
      const statusValues = row.map((cell) => cell.status.toUpperCase());
      csvContent += [rowLabel, ...statusValues].join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matrix_2D_${scenario}_${ct.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inspect cell priority: hovered cell or selected cell or default center cell
  const inspectedCell = hoveredCell || selectedCell || matrixResult.grid[Math.floor(matrixResult.grid.length / 2)]?.[Math.floor((matrixResult.grid[0]?.length || 1) / 2)];

  return (
    <div className="space-y-6">
      {/* Scenario Selector & Matrix Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  2D Dual-Variable Sensitivity Matrix
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                  Simultaneous 2-Factor Sweep
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simultaneously vary two operational parameters to generate a 2D engineering envelope and interactive heatmap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExport2DCSV}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 transition-all shadow-sm"
              title="Export complete 2D matrix table and status grid to CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export 2D Matrix CSV</span>
            </button>
          </div>
        </div>

        {/* 2D Scenario Presets Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'depth_vs_inclination', label: 'Depth × Inclination', sub: 'Buckling & Reach' },
            { id: 'depth_vs_friction', label: 'Depth × Friction (μ)', sub: 'Drag & Hookloads' },
            { id: 'flow_vs_depth', label: 'Flow × Depth', sub: 'Standpipe & Tubing ΔP' },
            { id: 'flow_vs_nozzle', label: 'Flow × Nozzle Dia', sub: 'Jetting & Surface P' },
            { id: 'pressure_vs_tension', label: 'Pressure × Tension', sub: 'von Mises Envelope' },
            { id: 'depth_vs_density', label: 'Depth × Mud Weight', sub: 'Hydrostatic & Buoyancy' },
          ].map((item) => {
            const isActive = scenario === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setScenario(item.id as MatrixScenarioId);
                  setSelectedCell(null);
                  setHoveredCell(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-950/50 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <span className={`text-xs font-bold leading-snug ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Axis Ranges & Metric Selector Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              {scenarioConfig.title}
            </span>
            <span className="text-[11px] text-slate-400">
              {scenarioConfig.description}
            </span>
          </div>

          {/* Metric Selector Dropdown / Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Display Metric:</span>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {scenarioConfig.metrics.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetricKey(m.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    effectiveMetric === m.key
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sweep Bounds Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row Axis Controller (Y) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                Row Axis (Y): {scenarioConfig.rowName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {matrixResult.rows.length} steps
              </span>
            </div>

            {/* Depth controls if row is depth */}
            {(scenario === 'depth_vs_inclination' || scenario === 'depth_vs_friction' || scenario === 'depth_vs_density') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Start ({isMetric ? 'm' : 'ft'})</label>
                    {depthStart > 0 && (
                      <button
                        type="button"
                        onClick={() => setDepthStart(0)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                        title="Set start depth to 0 (Surface)"
                      >
                        0 (Surf)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={isMetric ? Math.round(ftToM(depthStart)) : depthStart}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setDepthStart(0);
                        return;
                      }
                      const v = parseFloat(raw);
                      const parsed = isNaN(v) ? 0 : Math.max(0, v);
                      setDepthStart(isMetric ? Math.round(mToFt(parsed)) : parsed);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'm' : 'ft'})</label>
                  <input
                    type="number"
                    min="100"
                    step="1000"
                    value={isMetric ? Math.round(ftToM(depthEnd)) : depthEnd}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = parseFloat(raw);
                      const parsed = isNaN(v) ? 16000 : Math.max(100, v);
                      setDepthEnd(isMetric ? Math.round(mToFt(parsed)) : parsed);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={depthSteps}
                    onChange={(e) => setDepthSteps(parseInt(e.target.value) || 7)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 rows</option>
                    <option value="7">7 rows</option>
                    <option value="9">9 rows</option>
                    <option value="11">11 rows</option>
                  </select>
                </div>
              </div>
            )}

            {/* Flow controls if row is flow */}
            {(scenario === 'flow_vs_depth' || scenario === 'flow_vs_nozzle') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start ({isMetric ? 'L/min' : 'GPM'})</label>
                  <input
                    type="number"
                    step="10"
                    value={isMetric ? Math.round(gpmToLpm(flowStart)) : flowStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 15;
                      setFlowStart(isMetric ? Math.round(lpmToGpm(v)) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'L/min' : 'GPM'})</label>
                  <input
                    type="number"
                    step="10"
                    value={isMetric ? Math.round(gpmToLpm(flowEnd)) : flowEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 120;
                      setFlowEnd(isMetric ? Math.round(lpmToGpm(v)) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={flowSteps}
                    onChange={(e) => setFlowSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 rows</option>
                    <option value="6">6 rows</option>
                    <option value="8">8 rows</option>
                    <option value="10">10 rows</option>
                  </select>
                </div>
              </div>
            )}

            {/* Pressure controls if row is pressure */}
            {scenario === 'pressure_vs_tension' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start ({isMetric ? 'bar' : 'psi'})</label>
                  <input
                    type="number"
                    step="500"
                    value={isMetric ? Math.round(psiToBar(pressStart)) : pressStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setPressStart(isMetric ? Math.round(barToPsi(v)) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'bar' : 'psi'})</label>
                  <input
                    type="number"
                    step="1000"
                    value={isMetric ? Math.round(psiToBar(pressEnd)) : pressEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 7500;
                      setPressEnd(isMetric ? Math.round(barToPsi(v)) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={pressSteps}
                    onChange={(e) => setPressSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 rows</option>
                    <option value="6">6 rows</option>
                    <option value="8">8 rows</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Column Axis Controller (X) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Column Axis (X): {scenarioConfig.colName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {matrixResult.cols.length} steps
              </span>
            </div>

            {/* Inclination controls */}
            {scenario === 'depth_vs_inclination' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start (&theta; deg)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={incStart}
                    onChange={(e) => setIncStart(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End (&theta; deg)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={incEnd}
                    onChange={(e) => setIncEnd(parseFloat(e.target.value) || 75)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={incSteps}
                    onChange={(e) => setIncSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="4">4 cols</option>
                    <option value="6">6 cols</option>
                    <option value="8">8 cols</option>
                  </select>
                </div>
              </div>
            )}

            {/* Friction controls */}
            {scenario === 'depth_vs_friction' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start (&mu;)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={fricStart}
                    onChange={(e) => setFricStart(parseFloat(e.target.value) || 0.15)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End (&mu;)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={fricEnd}
                    onChange={(e) => setFricEnd(parseFloat(e.target.value) || 0.45)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={fricSteps}
                    onChange={(e) => setFricSteps(parseInt(e.target.value) || 7)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 cols</option>
                    <option value="7">7 cols</option>
                    <option value="9">9 cols</option>
                  </select>
                </div>
              </div>
            )}

            {/* Depth controls if column is depth */}
            {scenario === 'flow_vs_depth' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Start ({isMetric ? 'm' : 'ft'})</label>
                    {depthStart > 0 && (
                      <button
                        type="button"
                        onClick={() => setDepthStart(0)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                        title="Set start depth to 0 (Surface)"
                      >
                        0 (Surf)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={isMetric ? Math.round(ftToM(depthStart)) : depthStart}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setDepthStart(0);
                        return;
                      }
                      const v = parseFloat(raw);
                      const parsed = isNaN(v) ? 0 : Math.max(0, v);
                      setDepthStart(isMetric ? Math.round(mToFt(parsed)) : parsed);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'm' : 'ft'})</label>
                  <input
                    type="number"
                    min="100"
                    step="1000"
                    value={isMetric ? Math.round(ftToM(depthEnd)) : depthEnd}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = parseFloat(raw);
                      const parsed = isNaN(v) ? 16000 : Math.max(100, v);
                      setDepthEnd(isMetric ? Math.round(mToFt(parsed)) : parsed);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={depthSteps}
                    onChange={(e) => setDepthSteps(parseInt(e.target.value) || 7)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 cols</option>
                    <option value="7">7 cols</option>
                    <option value="9">9 cols</option>
                  </select>
                </div>
              </div>
            )}

            {/* Nozzle controls */}
            {scenario === 'flow_vs_nozzle' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start ({isMetric ? 'mm' : 'in'})</label>
                  <input
                    type="number"
                    step="0.015"
                    value={isMetric ? (nozzleStart * 25.4).toFixed(1) : nozzleStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0.125;
                      setNozzleStart(isMetric ? v / 25.4 : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'mm' : 'in'})</label>
                  <input
                    type="number"
                    step="0.015"
                    value={isMetric ? (nozzleEnd * 25.4).toFixed(1) : nozzleEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0.25;
                      setNozzleEnd(isMetric ? v / 25.4 : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={nozzleSteps}
                    onChange={(e) => setNozzleSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="4">4 cols</option>
                    <option value="6">6 cols</option>
                    <option value="8">8 cols</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tension ratio controls */}
            {scenario === 'pressure_vs_tension' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start (% Yield)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tensionRatioStart}
                    onChange={(e) => setTensionRatioStart(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End (% Yield)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tensionRatioEnd}
                    onChange={(e) => setTensionRatioEnd(parseFloat(e.target.value) || 70)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={tensionRatioSteps}
                    onChange={(e) => setTensionRatioSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="5">5 cols</option>
                    <option value="6">6 cols</option>
                    <option value="8">8 cols</option>
                  </select>
                </div>
              </div>
            )}

            {/* Density controls */}
            {scenario === 'depth_vs_density' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start ({isMetric ? 'SG' : 'ppg'})</label>
                  <input
                    type="number"
                    step="0.2"
                    value={isMetric ? parseFloat(ppgToSg(densityStart).toFixed(2)) : densityStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 8.33;
                      setDensityStart(isMetric ? sgToPpg(v) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End ({isMetric ? 'SG' : 'ppg'})</label>
                  <input
                    type="number"
                    step="0.2"
                    value={isMetric ? parseFloat(ppgToSg(densityEnd).toFixed(2)) : densityEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 13.5;
                      setDensityEnd(isMetric ? sgToPpg(v) : v);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Grid Points</label>
                  <select
                    value={densitySteps}
                    onChange={(e) => setDensitySteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="4">4 cols</option>
                    <option value="6">6 cols</option>
                    <option value="8">8 cols</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2D Matrix Summary Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Safe Operating Window</span>
            <span className={`text-base font-bold font-mono mt-1 block ${matrixSummary.safePercent > 80 ? 'text-emerald-400' : matrixSummary.safePercent > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {matrixSummary.safePercent}% Safe
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {matrixSummary.safeCount} of {matrixSummary.total} matrix states green
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Matrix Minimum</span>
            <span className="text-base font-bold font-mono text-cyan-300 mt-1 block">
              {typeof matrixSummary.min === 'number' && !isNaN(matrixSummary.min)
                ? (matrixSummary.min < 10 && matrixSummary.min > -10 ? matrixSummary.min.toFixed(2) : Math.round(matrixSummary.min).toLocaleString())
                : '--'} {matrixResult.grid[0]?.[0]?.metricUnit}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Lowest evaluated cell value
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Matrix Maximum</span>
            <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
              {typeof matrixSummary.max === 'number' && !isNaN(matrixSummary.max)
                ? (matrixSummary.max < 10 && matrixSummary.max > -10 ? matrixSummary.max.toFixed(2) : Math.round(matrixSummary.max).toLocaleString())
                : '--'} {matrixResult.grid[0]?.[0]?.metricUnit}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Peak evaluated operational value
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Critical Threshold Cells</span>
            <span className={`text-base font-bold font-mono mt-1 block ${matrixSummary.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {matrixSummary.criticalCount} Exceeded
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {matrixSummary.cautionCount} in cautionary buffer zone
            </span>
          </div>
          <div className={`p-2.5 rounded-lg ${matrixSummary.criticalCount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2D MATRIX HEATMAP GRID TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Header Bar with Legend */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              2D Operating Envelope Matrix
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({matrixResult.rows.length} rows &times; {matrixResult.cols.length} cols = {matrixSummary.total} points)
            </span>
          </div>

          {/* Color Heatmap Status Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/50 inline-block" />
              <span className="text-emerald-300 font-sans text-[11px]">Safe Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/50 inline-block" />
              <span className="text-amber-300 font-sans text-[11px]">Caution / Buckling</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500/50 inline-block" />
              <span className="text-rose-300 font-sans text-[11px]">Critical / Limit Exceeded</span>
            </div>
          </div>
        </div>

        {/* The Matrix Grid Table */}
        <div className="overflow-x-auto p-4 bg-slate-950/40">
          <table className="w-full border-collapse text-xs select-none">
            <thead>
              <tr>
                {/* Top-Left Corner Intersection Cell */}
                <th className="p-2.5 bg-slate-950 border border-slate-800 text-slate-400 font-mono text-left align-bottom min-w-[130px]">
                  <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center justify-end gap-1">
                    {scenarioConfig.colName} &rarr;
                  </div>
                  <div className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1 mt-1">
                    &darr; {scenarioConfig.rowName}
                  </div>
                </th>

                {/* Column Headers (Axis X) */}
                {matrixResult.grid[0]?.map((colCell, cIdx) => (
                  <th
                    key={cIdx}
                    className="p-2.5 bg-slate-950/90 border border-slate-800 text-center font-mono font-bold text-amber-300 min-w-[95px]"
                  >
                    <div className="text-xs">{colCell.colLabel}</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      Col {cIdx + 1}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixResult.grid.map((row, rIdx) => (
                <tr key={rIdx}>
                  {/* Row Header (Axis Y) */}
                  <th className="p-2.5 bg-slate-950/90 border border-slate-800 text-left font-mono font-bold text-cyan-300 whitespace-nowrap">
                    <div className="text-xs">{row[0].rowLabel}</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      Row {rIdx + 1}
                    </div>
                  </th>

                  {/* Matrix Cells */}
                  {row.map((cell, cIdx) => {
                    const isSelected = selectedCell?.rowVal === cell.rowVal && selectedCell?.colVal === cell.colVal;
                    const isHovered = hoveredCell?.rowVal === cell.rowVal && hoveredCell?.colVal === cell.colVal;

                    // Dynamic heatmap cell styling
                    let cellBg = 'bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/40 border-emerald-900/40';
                    let badgeClass = 'text-emerald-400';

                    if (cell.status === 'critical') {
                      cellBg = 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border-rose-900/50 font-bold';
                      badgeClass = 'text-rose-400';
                    } else if (cell.status === 'caution') {
                      cellBg = 'bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 border-amber-900/40 font-semibold';
                      badgeClass = 'text-amber-400';
                    }

                    return (
                      <td
                        key={cIdx}
                        onClick={() => setSelectedCell(cell)}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`p-2.5 text-center font-mono border transition-all cursor-pointer relative ${cellBg} ${
                          isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 z-10' : ''
                        }`}
                      >
                        <div className="text-xs tracking-tight">
                          {cell.metricFormatted}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 font-sans font-medium flex items-center justify-center gap-0.5">
                          <span>{cell.metricUnit}</span>
                          {cell.status === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block ml-0.5" />}
                          {cell.status === 'caution' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block ml-0.5" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Cell Inspector Card */}
      {inspectedCell && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Matrix Point Inspector
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    inspectedCell.status === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : inspectedCell.status === 'caution'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {inspectedCell.statusText}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Evaluating: {scenarioConfig.rowName} = <strong className="text-cyan-300">{inspectedCell.rowLabel}</strong> &times; {scenarioConfig.colName} = <strong className="text-amber-300">{inspectedCell.colLabel}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                Primary Metric: <strong className="text-white">{inspectedCell.metricFormatted} {inspectedCell.metricUnit}</strong>
              </span>
            </div>
          </div>

          {/* Deep Details Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {inspectedCell.details.map((d, i) => (
              <div key={i} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block truncate">{d.label}</span>
                <span className={`text-xs font-mono font-bold mt-1 block truncate ${d.isWarning ? 'text-rose-400' : 'text-slate-200'}`}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
