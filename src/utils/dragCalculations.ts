import {
  BhaConfiguration,
  BhaSegment,
  BhaSegmentDragDetail,
  BhaToolType,
  CoiledTubingString,
  DragCalculationOptions,
  DragForceCalculationResult,
  TrajectoryDragPoint,
  WellboreForcesInput,
  WellboreSurveyStation
} from '../types/coiledTubing';
import {
  calculateGeometry,
  calculateMinimumCurvature,
  interpolateSurveyAtDepth,
  ftToM,
  mToFt,
  lbfToKn,
  knToLbf,
  psiToMpa,
  YOUNGS_MODULUS_PSI
} from './engineeringCalculations';
import {
  calculateSegmentLinearWeight,
  calculateSegmentMomentOfInertia,
  STEEL_DENSITY_LB_CU_IN
} from '../data/bhaPresets';

/**
 * Calculates comprehensive axial drag forces acting along the wellbore trajectory,
 * explicitly capturing the mechanical impact of the Bottom Hole Assembly (BHA)
 * geometry, stiffness, diameter variations, and active tool mechanisms.
 */
export function calculateAxialDragForce(
  ct: CoiledTubingString,
  forcesInput: WellboreForcesInput,
  options?: DragCalculationOptions
): DragForceCalculationResult {
  const geom = calculateGeometry(ct);
  const totalDepthFt = Math.max(100, forcesInput.measuredDepthFt);
  const csgId = Math.max(ct.outerDiameterIn + 0.25, forcesInput.casingInnerDiameterIn);
  const ctRadialClearanceIn = Math.max(0.05, (csgId - ct.outerDiameterIn) / 2);

  const e = ct.youngsModulusPsi || YOUNGS_MODULUS_PSI;
  const iCt = geom.momentOfInertiaIn4;
  const ctEi = e * iCt;

  // Fluid density and buoyancy factor
  const fluidDensityPpg = options?.wellboreFluidDensityPpg ?? forcesInput.wellboreFluidDensityPpg;
  const steelPpg = 65.45;
  const buoyancyFactor = Math.max(0.5, 1 - fluidDensityPpg / steelPpg);

  // Coiled tubing linear weight
  const ctAirWeightLbFt = geom.weightInAirLbFt;
  const ctBuoyedWeightLbFt = ctAirWeightLbFt * buoyancyFactor;
  const ctWbLbIn = ctBuoyedWeightLbFt / 12;

  // Base friction coefficient
  const baseMu = options?.frictionCoefficient ?? forcesInput.frictionCoefficientCasing;
  const muCasing = Math.max(0.05, Math.min(0.85, baseMu));

  // Trajectory stations setup
  const isCustomSurvey = forcesInput.geometryMode === 'custom_survey' && !!forcesInput.surveyStations && forcesInput.surveyStations.length >= 2;
  const surveyStations: WellboreSurveyStation[] = isCustomSurvey && forcesInput.surveyStations
    ? calculateMinimumCurvature(forcesInput.surveyStations)
    : [];

  // Trajectory summary stats
  const constIncRad = (forcesInput.wellboreInclinationDeg * Math.PI) / 180;
  const maxInc = isCustomSurvey && surveyStations.length > 0
    ? Math.max(...surveyStations.map((s) => s.inclinationDeg))
    : forcesInput.wellboreInclinationDeg;
  const maxDls = isCustomSurvey && surveyStations.length > 0
    ? Math.max(...surveyStations.map((s) => s.doglegSeverityDegPer100ft ?? 0))
    : 0;
  const totalTvd = isCustomSurvey && surveyStations.length > 0
    ? surveyStations[surveyStations.length - 1].trueVerticalDepthFt
    : totalDepthFt * Math.cos(constIncRad);
  const horizReach = isCustomSurvey && surveyStations.length > 0
    ? (surveyStations[surveyStations.length - 1].horizontalDisplacementFt ?? 0)
    : totalDepthFt * Math.sin(constIncRad);

  // Helper function to query trajectory at any depth
  const getTrajectoryAt = (depth: number) => {
    if (isCustomSurvey && surveyStations.length >= 2) {
      return interpolateSurveyAtDepth(surveyStations, depth);
    }
    const incDeg = forcesInput.wellboreInclinationDeg;
    const rad = (incDeg * Math.PI) / 180;
    return {
      inclinationDeg: incDeg,
      trueVerticalDepthFt: depth * Math.cos(rad),
      horizontalDisplacementFt: depth * Math.sin(rad),
      doglegSeverityDegPer100ft: 0,
    };
  };

  // BHA geometry & tool properties
  const hasBha = !!forcesInput.bhaConfig?.enabled && !!forcesInput.bhaConfig.segments && forcesInput.bhaConfig.segments.length > 0;
  const rawSegments = hasBha ? forcesInput.bhaConfig!.segments : [];

  let totalBhaLengthFt = 0;
  rawSegments.forEach((s) => {
    totalBhaLengthFt += Math.max(0.1, s.lengthFt);
  });

  const clampedBhaLengthFt = Math.min(totalDepthFt * 0.9, totalBhaLengthFt);
  const ctLengthFt = Math.max(0, totalDepthFt - clampedBhaLengthFt);
  const bhaStartDepthFt = ctLengthFt;

  // Check for active specialized tools in BHA
  const hasAgitatorInBha = rawSegments.some((s) => s.type === 'agitator');
  const hasTractorInBha = rawSegments.some((s) => s.type === 'tractor');
  const hasNozzleInBha = rawSegments.some((s) => s.type === 'nozzle_bit');

  const agitatorActive = options?.agitatorActive !== undefined ? options.agitatorActive : hasAgitatorInBha;
  const agitatorReductionPct = agitatorActive ? (options?.agitatorDragReductionPct ?? 35) : 0;
  const agitatorFrictionMultiplier = Math.max(0.3, 1 - agitatorReductionPct / 100);

  const tractorActive = options?.tractorActive !== undefined ? options.tractorActive : hasTractorInBha;
  const tractorPullLbf = tractorActive ? (options?.tractorTractivePullLbf ?? 3000) : 0;

  const jettingActive = options?.jettingThrustActive !== undefined ? options.jettingThrustActive : hasNozzleInBha;
  const flowRateGpm = options?.flowRateGpm ?? 45;
  // Jet reaction thrust: F_thrust ≈ 0.052 * (Q / 10)^2 * rho_f / (d_nozzle^2)
  const jettingThrustLbf = jettingActive
    ? Math.round(0.045 * Math.pow(flowRateGpm, 1.85) * (fluidDensityPpg / 8.4))
    : 0;

  const appliedWobLbf = Math.max(0, options?.appliedWobLbf ?? 0);

  // Effective friction coefficient for BHA
  const effectiveBhaMu = muCasing * agitatorFrictionMultiplier;

  // Calculate detailed drag per BHA segment
  const bhaSegmentsDetail: BhaSegmentDragDetail[] = [];
  let currentSegStartFt = bhaStartDepthFt;
  let totalBhaDragRihLbf = 0;
  let totalBhaDragPoohLbf = 0;
  let totalBhaBuoyedWeightLbs = 0;
  let totalBhaAirWeightLbs = 0;

  rawSegments.forEach((seg, idx) => {
    const segLen = Math.max(0.1, seg.lengthFt);
    const segEndFt = currentSegStartFt + segLen;
    const segMidFt = (currentSegStartFt + segEndFt) / 2;

    const trajMid = getTrajectoryAt(segMidFt);
    const segIncRad = (trajMid.inclinationDeg * Math.PI) / 180;
    const sinInc = Math.sin(segIncRad);
    const cosInc = Math.cos(segIncRad);
    const dls = trajMid.doglegSeverityDegPer100ft ?? 0;

    const od = Math.max(0.5, seg.outerDiameterIn);
    const id = Math.min(od - 0.05, Math.max(0, seg.innerDiameterIn));
    const clearance = Math.max(0.05, (csgId - od) / 2);

    const linWeight = seg.linearWeightLbFt && seg.linearWeightLbFt > 0
      ? seg.linearWeightLbFt
      : calculateSegmentLinearWeight(od, id);

    const airWeightLbs = linWeight * segLen;
    const buoyedWeightLbs = airWeightLbs * buoyancyFactor;
    totalBhaAirWeightLbs += airWeightLbs;
    totalBhaBuoyedWeightLbs += buoyedWeightLbs;

    // Normal force components:
    // 1. Gravity contact normal force:
    const nGrav = buoyedWeightLbs * sinInc;

    // 2. Curvature / dogleg contact (tension through bend):
    const dlsRad = (dls * (Math.PI / 180) / 100) * segLen;
    // Approximated tension at BHA position during tripping (hanging weight below this segment)
    const hangingWeightBelow = (totalDepthFt - segMidFt) * 15 * cosInc;
    const nCurv = Math.abs(hangingWeightBelow) * dlsRad;

    // 3. Stiff tool bending contact force through dogleg:
    const segInertia = calculateSegmentMomentOfInertia(od, id);
    const segEi = e * segInertia;
    const stiffnessRatio = segEi / Math.max(1, ctEi);
    // Bending contact occurs when tool passes through curvature
    const nBend = dls > 0.1 && stiffnessRatio > 1.2
      ? Math.min(buoyedWeightLbs * 1.5, ((stiffnessRatio - 1) * 25 * dls * (segLen / 10)))
      : 0;

    const nTotal = Math.sqrt(Math.pow(nGrav, 2) + Math.pow(nCurv + nBend, 2));

    // Friction drag for this segment:
    const dragRih = effectiveBhaMu * nTotal;
    const dragPooh = effectiveBhaMu * nTotal;

    totalBhaDragRihLbf += dragRih;
    totalBhaDragPoohLbf += dragPooh;

    // Active tool assist
    let activeAssist = 0;
    if (seg.type === 'tractor' && tractorActive) {
      activeAssist += tractorPullLbf;
    }
    if (seg.type === 'nozzle_bit' && jettingActive) {
      activeAssist += jettingThrustLbf;
    }

    const netAxialContribution = buoyedWeightLbs * cosInc - dragRih + activeAssist;

    bhaSegmentsDetail.push({
      segmentId: seg.id || `seg-${idx}`,
      name: seg.name,
      type: seg.type,
      color: seg.color,
      startDepthFt: Math.round(currentSegStartFt),
      endDepthFt: Math.round(segEndFt),
      lengthFt: Number(segLen.toFixed(1)),
      outerDiameterIn: Number(od.toFixed(3)),
      innerDiameterIn: Number(id.toFixed(3)),
      radialClearanceIn: Number(clearance.toFixed(3)),
      airWeightLbs: Math.round(airWeightLbs),
      buoyedWeightLbs: Math.round(buoyedWeightLbs),
      linearWeightLbFt: Number(linWeight.toFixed(2)),
      avgInclinationDeg: Number(trajMid.inclinationDeg.toFixed(1)),
      avgDoglegSeverityDegPer100ft: Number(dls.toFixed(2)),
      gravityNormalForceLbf: Math.round(nGrav),
      curvatureNormalForceLbf: Math.round(nCurv),
      bendingNormalForceLbf: Math.round(nBend),
      totalNormalForceLbf: Math.round(nTotal),
      axialDragRihLbf: Math.round(dragRih),
      axialDragPoohLbf: Math.round(dragPooh),
      dragPerFootLbf: Number((dragRih / segLen).toFixed(1)),
      percentOfBhaDrag: 0, // Will normalize after loop
      percentOfTotalDrag: 0,
      activeAssistLbf: Math.round(activeAssist),
      netAxialContributionLbf: Math.round(netAxialContribution),
    });

    currentSegStartFt = segEndFt;
  });

  // Calculate CT section drag by piecewise numerical integration
  const ctSteps = 40;
  const ctDz = ctLengthFt / ctSteps;
  let totalCtDragRihLbf = 0;
  let totalCtDragPoohLbf = 0;
  let totalCtBuoyedWeightLbs = 0;

  for (let k = 0; k < ctSteps; k++) {
    const zMid = (k + 0.5) * ctDz;
    const trajK = getTrajectoryAt(zMid);
    const incRadK = (trajK.inclinationDeg * Math.PI) / 180;
    const sinK = Math.sin(incRadK);
    const cosK = Math.cos(incRadK);
    const dlsK = trajK.doglegSeverityDegPer100ft ?? 0;

    const segWeight = ctBuoyedWeightLbFt * ctDz;
    totalCtBuoyedWeightLbs += segWeight;

    // Normal force on CT element
    const nGravK = segWeight * sinK;
    const dlsRadK = (dlsK * (Math.PI / 180) / 100) * ctDz;
    // Suspended load below this point
    const suspendedBelow = (totalDepthFt - zMid) * ctBuoyedWeightLbFt * cosK + totalBhaBuoyedWeightLbs * cosK;
    const nCurvK = Math.abs(suspendedBelow) * dlsRadK;
    const nTotalK = Math.sqrt(Math.pow(nGravK, 2) + Math.pow(nCurvK, 2));

    // Drag on CT element (CT receives standard casing friction; agitator vibration dampens with distance)
    const distanceToAgitator = Math.max(0, totalDepthFt - zMid);
    // Agitator effect extends ~1,500 ft uphole into the CT string
    const agitatorDecay = agitatorActive ? Math.max(0, 1 - distanceToAgitator / 1500) * (agitatorReductionPct / 100) : 0;
    const localCtMu = muCasing * (1 - agitatorDecay);

    totalCtDragRihLbf += localCtMu * nTotalK;
    totalCtDragPoohLbf += localCtMu * nTotalK;
  }

  const totalDragRihLbf = totalCtDragRihLbf + totalBhaDragRihLbf;
  const totalDragPoohLbf = totalCtDragPoohLbf + totalBhaDragPoohLbf;

  // Normalize BHA segment drag percentages
  bhaSegmentsDetail.forEach((s) => {
    s.percentOfBhaDrag = totalBhaDragRihLbf > 0 ? Number(((s.axialDragRihLbf / totalBhaDragRihLbf) * 100).toFixed(1)) : 0;
    s.percentOfTotalDrag = totalDragRihLbf > 0 ? Number(((s.axialDragRihLbf / totalDragRihLbf) * 100).toFixed(1)) : 0;
  });

  // Calculate baseline: Bare CT string without any BHA
  let bareCtTotalDragLbf = 0;
  const bareSteps = 50;
  const bareDz = totalDepthFt / bareSteps;
  for (let k = 0; k < bareSteps; k++) {
    const zMid = (k + 0.5) * bareDz;
    const trajK = getTrajectoryAt(zMid);
    const incRadK = (trajK.inclinationDeg * Math.PI) / 180;
    const sinK = Math.sin(incRadK);
    const cosK = Math.cos(incRadK);
    const dlsK = trajK.doglegSeverityDegPer100ft ?? 0;

    const segWeight = ctBuoyedWeightLbFt * bareDz;
    const nGravK = segWeight * sinK;
    const dlsRadK = (dlsK * (Math.PI / 180) / 100) * bareDz;
    const suspendedBelow = (totalDepthFt - zMid) * ctBuoyedWeightLbFt * cosK;
    const nCurvK = Math.abs(suspendedBelow) * dlsRadK;
    const nTotalK = Math.sqrt(Math.pow(nGravK, 2) + Math.pow(nCurvK, 2));

    bareCtTotalDragLbf += muCasing * nTotalK;
  }

  const dragIncreaseDueToBhaLbf = Math.max(0, totalDragRihLbf - bareCtTotalDragLbf);
  const dragIncreasePercent = bareCtTotalDragLbf > 0
    ? Number(((dragIncreaseDueToBhaLbf / bareCtTotalDragLbf) * 100).toFixed(1))
    : 0;

  // Surface Hookload calculations
  const totalStaticHangingWeightLbf = totalCtBuoyedWeightLbs + totalBhaBuoyedWeightLbs;
  const surfaceStaticHangingWeightLbf = Math.round(totalStaticHangingWeightLbf);

  // Surface Slackoff (RIH) = Hanging Weight - Drag + Tractor Pull + Jet Thrust - WOB
  const surfaceSlackoffHookloadLbf = Math.round(
    surfaceStaticHangingWeightLbf - totalDragRihLbf + tractorPullLbf + jettingThrustLbf - appliedWobLbf
  );

  // Surface Pickup (POOH) = Hanging Weight + Drag
  const surfacePickupHookloadLbf = Math.round(surfaceStaticHangingWeightLbf + totalDragPoohLbf);

  // Ratios and intensities
  const ctAvgDragPerFoot = ctLengthFt > 0 ? totalCtDragRihLbf / ctLengthFt : 0;
  const bhaAvgDragPerFoot = clampedBhaLengthFt > 0 ? totalBhaDragRihLbf / clampedBhaLengthFt : 0;
  const bhaDragIntensityRatio = ctAvgDragPerFoot > 0
    ? Number((bhaAvgDragPerFoot / ctAvgDragPerFoot).toFixed(1))
    : 1.0;

  const bhaDragSharePercent = totalDragRihLbf > 0
    ? Number(((totalBhaDragRihLbf / totalDragRihLbf) * 100).toFixed(1))
    : 0;
  const ctDragSharePercent = totalDragRihLbf > 0
    ? Number(((totalCtDragRihLbf / totalDragRihLbf) * 100).toFixed(1))
    : 100;

  // Generate dense Trajectory Drag Profile along wellbore (from surface to TD)
  const trajectoryProfile: TrajectoryDragPoint[] = [];
  const profileSteps = 45;
  const sampleDepths: number[] = [0];

  for (let i = 1; i <= profileSteps; i++) {
    sampleDepths.push((i / profileSteps) * totalDepthFt);
  }
  // Add BHA start depth
  if (clampedBhaLengthFt > 0 && ctLengthFt > 0) {
    sampleDepths.push(ctLengthFt);
  }
  // Add individual BHA segment transition depths
  bhaSegmentsDetail.forEach((seg) => {
    sampleDepths.push(seg.startDepthFt);
    sampleDepths.push(seg.endDepthFt);
  });
  // Add survey station depths
  surveyStations.forEach((st) => {
    if (st.measuredDepthFt > 0 && st.measuredDepthFt < totalDepthFt) {
      sampleDepths.push(st.measuredDepthFt);
    }
  });

  sampleDepths.sort((a, b) => a - b);
  const uniqueDepths: number[] = [];
  sampleDepths.forEach((d) => {
    if (uniqueDepths.length === 0 || Math.abs(d - uniqueDepths[uniqueDepths.length - 1]) > 10) {
      uniqueDepths.push(d);
    }
  });

  // Calculate Lubinski vertical buckling load
  const verticalCtBuckling = 2.05 * Math.pow(ctEi * Math.pow(ctWbLbIn, 2), 1 / 3);

  let effectiveLockupDepthFt = 99999;
  let isLockedUp = false;

  uniqueDepths.forEach((d) => {
    const trajD = getTrajectoryAt(d);
    const incRadD = (trajD.inclinationDeg * Math.PI) / 180;
    const sinD = Math.sin(incRadD);
    const cosD = Math.cos(incRadD);
    const dlsD = trajD.doglegSeverityDegPer100ft ?? 0;

    const isBha = hasBha && d >= bhaStartDepthFt;
    let segName = 'Coiled Tubing';
    let segType = 'coiled_tubing';

    if (isBha) {
      const activeSeg = bhaSegmentsDetail.find((s) => d >= s.startDepthFt && d <= s.endDepthFt);
      if (activeSeg) {
        segName = activeSeg.name;
        segType = activeSeg.type;
      }
    }

    // Cumulative drag from surface (0) to depth d
    let cumDragRih = 0;
    let cumDragPooh = 0;
    let cumNeutral = 0;

    // Sub-segment integration from 0 to d
    const subSteps = Math.max(6, Math.ceil(d / 200));
    const subDz = d / subSteps;

    for (let m = 0; m < subSteps; m++) {
      const zMid = (m + 0.5) * subDz;
      const trajM = getTrajectoryAt(zMid);
      const incRadM = (trajM.inclinationDeg * Math.PI) / 180;
      const sinM = Math.sin(incRadM);
      const cosM = Math.cos(incRadM);
      const dlsM = trajM.doglegSeverityDegPer100ft ?? 0;

      const inBhaZone = hasBha && zMid >= bhaStartDepthFt;
      let localWeight = ctBuoyedWeightLbFt;
      let localMu = muCasing;

      if (inBhaZone) {
        const segMatch = bhaSegmentsDetail.find((s) => zMid >= s.startDepthFt && zMid <= s.endDepthFt);
        localWeight = segMatch ? segMatch.linearWeightLbFt * buoyancyFactor : ctBuoyedWeightLbFt * 1.5;
        localMu = effectiveBhaMu;
      }

      const dGrav = localWeight * sinM * subDz;
      const dCurv = Math.abs((totalDepthFt - zMid) * localWeight * cosM) * ((dlsM * (Math.PI / 180) / 100) * subDz);
      const dNorm = Math.sqrt(Math.pow(dGrav, 2) + Math.pow(dCurv, 2));

      cumDragRih += localMu * dNorm;
      cumDragPooh += localMu * dNorm;
      cumNeutral += localWeight * cosM * subDz;
    }

    // Critical buckling capacity at local inclination
    const localCritBuckling = trajD.inclinationDeg < 5
      ? verticalCtBuckling
      : Math.max(verticalCtBuckling, 2 * Math.sqrt((ctEi * ctWbLbIn * Math.max(0.01, sinD)) / ctRadialClearanceIn));
    const localHelicalBuckling = 2.828 * localCritBuckling;

    // Axial force during RIH (compressive when pushing through drag)
    const axialRih = cumNeutral - cumDragRih;
    const axialPooh = cumNeutral + cumDragPooh;
    const axialNeut = cumNeutral;

    // Check lockup condition (compression exceeds helical buckling capacity)
    if (axialRih < -localHelicalBuckling && !isLockedUp && d > 500) {
      isLockedUp = true;
      effectiveLockupDepthFt = Math.round(d);
    }

    trajectoryProfile.push({
      depthFt: Math.round(d),
      depthM: Math.round(ftToM(d)),
      tvdFt: Math.round(trajD.trueVerticalDepthFt),
      tvdM: Math.round(ftToM(trajD.trueVerticalDepthFt)),
      inclinationDeg: Number(trajD.inclinationDeg.toFixed(1)),
      doglegSeverity: Number(dlsD.toFixed(2)),
      isBha,
      segmentName: segName,
      segmentType: segType,
      normalForceLbf: Math.round(cumDragRih / Math.max(0.01, muCasing)),
      cumulativeDragRihLbf: Math.round(cumDragRih),
      cumulativeDragPoohLbf: Math.round(cumDragPooh),
      axialForceRihLbf: Math.round(axialRih),
      axialForcePoohLbf: Math.round(axialPooh),
      axialForceNeutralLbf: Math.round(axialNeut),
      criticalBucklingLbf: Math.round(localCritBuckling),
      helicalBucklingLbf: Math.round(localHelicalBuckling),
    });
  });

  // Calculate maximum allowable WOB before lockup at TD
  const lastProfilePoint = trajectoryProfile[trajectoryProfile.length - 1];
  const maxAllowableWob = lastProfilePoint
    ? Math.max(0, Math.round(lastProfilePoint.helicalBucklingLbf + lastProfilePoint.axialForceRihLbf + tractorPullLbf + jettingThrustLbf))
    : 2000;

  const lockupSafetyMarginFt = isLockedUp
    ? Math.round(effectiveLockupDepthFt - totalDepthFt)
    : 99999;

  return {
    totalDepthFt,
    bhaLengthFt: Number(clampedBhaLengthFt.toFixed(1)),
    ctLengthFt: Number(ctLengthFt.toFixed(1)),
    buoyancyFactor: Number(buoyancyFactor.toFixed(3)),

    totalDragRihLbf: Math.round(totalDragRihLbf),
    totalDragPoohLbf: Math.round(totalDragPoohLbf),
    totalDragRihKn: Number(lbfToKn(totalDragRihLbf).toFixed(1)),
    totalDragPoohKn: Number(lbfToKn(totalDragPoohLbf).toFixed(1)),

    ctDragRihLbf: Math.round(totalCtDragRihLbf),
    ctDragPoohLbf: Math.round(totalCtDragPoohLbf),
    bhaDragRihLbf: Math.round(totalBhaDragRihLbf),
    bhaDragPoohLbf: Math.round(totalBhaDragPoohLbf),
    bhaDragSharePercent,
    ctDragSharePercent,

    ctAvgDragPerFootLbf: Number(ctAvgDragPerFoot.toFixed(2)),
    bhaAvgDragPerFootLbf: Number(bhaAvgDragPerFoot.toFixed(2)),
    bhaDragIntensityRatio,

    bareCtTotalDragLbf: Math.round(bareCtTotalDragLbf),
    dragIncreaseDueToBhaLbf: Math.round(dragIncreaseDueToBhaLbf),
    dragIncreasePercent,

    surfaceStaticHangingWeightLbf,
    surfaceSlackoffHookloadLbf,
    surfacePickupHookloadLbf,
    surfaceSlackoffHookloadKn: Number(lbfToKn(surfaceSlackoffHookloadLbf).toFixed(1)),
    surfacePickupHookloadKn: Number(lbfToKn(surfacePickupHookloadLbf).toFixed(1)),

    effectiveLockupDepthFt: isLockedUp ? effectiveLockupDepthFt : totalDepthFt + 5000,
    isLockedUp,
    lockupSafetyMarginFt,
    maxAllowableWobBeforeLockupLbf: maxAllowableWob,

    totalTractorPullLbf: Math.round(tractorPullLbf),
    totalJettingThrustLbf: Math.round(jettingThrustLbf),
    totalAgitatorReductionLbf: Math.round(totalDragRihLbf * (agitatorReductionPct / 100)),

    bhaSegmentsDetail,
    trajectoryProfile,

    trajectoryType: isCustomSurvey ? 'custom_survey' : 'constant',
    maxInclinationDeg: Number(maxInc.toFixed(1)),
    maxDoglegSeverity: Number(maxDls.toFixed(2)),
    totalTvdFt: Math.round(totalTvd),
    horizontalReachFt: Math.round(horizReach),
  };
}
