import type {
  BiomarkerRecord,
  BiomarkerStatus,
  ContractScope,
  DailyTelemetryPoint,
  HabitNudge,
  HabitSimulationParams,
  PredictedAnomaly,
} from '../types/vault';

/**
 * Pure TypeScript FIPS 180-4 SHA-256 implementation.
 * Deterministic across Node (unit tests) and browser runtimes.
 */
export function sha256Hex(input: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((word) => word.toString(16).padStart(8, '0')).join('');
}

export function formatShortHash(hash: string, prefixLen = 8, suffixLen = 6): string {
  if (hash.length <= prefixLen + suffixLen + 2) return hash;
  return `${hash.slice(0, prefixLen)}…${hash.slice(-suffixLen)}`;
}

export function computeBiomarkerStatus(
  value: number,
  refMin: number,
  refMax: number,
): BiomarkerStatus {
  const span = Math.max(refMax - refMin, 0.001);
  const margin = span * 0.12;
  if (value > refMax) return 'elevated';
  if (value < refMin) return 'low';
  if (value >= refMax - margin || value <= refMin + margin) return 'borderline';
  return 'optimal';
}

export function computeBiomarkerRangePosition(
  value: number,
  refMin: number,
  refMax: number,
): number {
  const span = Math.max(refMax - refMin, 0.001);
  const lowBound = refMin - span * 0.35;
  const highBound = refMax + span * 0.35;
  const pct = ((value - lowBound) / (highBound - lowBound)) * 100;
  return Math.max(4, Math.min(96, Math.round(pct)));
}

export function filterBiomarkers(
  biomarkers: BiomarkerRecord[],
  query: string,
  statusFilter: 'all' | 'flagged' | 'optimal',
  categoryFilter: string = 'All',
): BiomarkerRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  return biomarkers.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.code.toLowerCase().includes(normalizedQuery) ||
      item.sourceLab.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'optimal' && item.status === 'optimal') ||
      (statusFilter === 'flagged' && item.status !== 'optimal');

    const matchesCategory =
      categoryFilter === 'All' || item.category === categoryFilter;

    return matchesQuery && matchesStatus && matchesCategory;
  });
}

export function calculateHabitAdherence(nudges: HabitNudge[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const activeNudges = nudges.filter((n) => n.active);
  const total = activeNudges.length;
  if (total === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  const completed = activeNudges.filter((n) => n.completed).length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

export function computePearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return Number((num / denom).toFixed(2));
}

export interface AnomalySimulationResult {
  baselineRiskPct: number;
  projectedRiskPct: number;
  riskDeltaPct: number;
  projectedRecoveryIndex: number;
  projectedHrvMs: number;
  anomalies: PredictedAnomaly[];
}

export function evaluateCrossSourceIntelligence(
  telemetry: DailyTelemetryPoint[],
  biomarkers: BiomarkerRecord[],
  params: HabitSimulationParams,
): AnomalySimulationResult {
  const recent7 = telemetry.slice(-7);
  const prior7 = telemetry.slice(-14, -7);

  const avgRecentHrv =
    recent7.reduce((acc, p) => acc + p.hrvMs, 0) / Math.max(recent7.length, 1);
  const avgPriorHrv =
    prior7.length > 0
      ? prior7.reduce((acc, p) => acc + p.hrvMs, 0) / prior7.length
      : avgRecentHrv;
  const avgDeepSleep =
    recent7.reduce((acc, p) => acc + p.deepSleepHrs, 0) / Math.max(recent7.length, 1);
  const avgGlucose =
    recent7.reduce((acc, p) => acc + p.glucoseMgDl, 0) / Math.max(recent7.length, 1);
  const avgRecovery =
    recent7.reduce((acc, p) => acc + p.recoveryIndex, 0) / Math.max(recent7.length, 1);

  const hrvDropPct =
    avgPriorHrv > 0 ? ((avgPriorHrv - avgRecentHrv) / avgPriorHrv) * 100 : 0;

  const flaggedLabs = biomarkers.filter(
    (b) => b.status === 'elevated' || b.status === 'low',
  );
  const crp = biomarkers.find((b) => b.code.toLowerCase() === 'hs-crp');
  const cortisol = biomarkers.find((b) => b.name.toLowerCase().includes('cortisol'));
  const ferritin = biomarkers.find((b) => b.name.toLowerCase().includes('ferritin'));

  // Compute baseline risk from cross-source signals
  let baselineRisk = 18;
  if (hrvDropPct > 4) baselineRisk += Math.min(24, hrvDropPct * 1.8);
  if (avgDeepSleep < 1.65) baselineRisk += (1.65 - avgDeepSleep) * 18;
  if (avgGlucose > 98) baselineRisk += (avgGlucose - 98) * 0.9;
  baselineRisk += flaggedLabs.length * 6.5;
  if (crp && crp.value > crp.refMax) baselineRisk += 10;

  const baselineRiskPct = Math.round(Math.max(8, Math.min(92, baselineRisk)));

  // Habit simulator adjustments relative to baseline habits (7.1h sleep, 110m Z2, 20m screen cutoff, 2.0L water)
  const sleepEffect = (params.sleepHoursTarget - 7.1) * -8.5;
  const zone2Effect = ((params.zone2MinutesPerWeek - 110) / 30) * -2.8;
  const screenEffect = ((params.eveningScreenCutoffMins - 20) / 15) * -2.1;
  const hydrationEffect = (params.hydrationLiters - 2.0) * -4.2;

  const totalAdjustment = sleepEffect + zone2Effect + screenEffect + hydrationEffect;
  const projectedRiskPct = Math.round(
    Math.max(5, Math.min(94, baselineRiskPct + totalAdjustment)),
  );
  const riskDeltaPct = projectedRiskPct - baselineRiskPct;

  const projectedRecoveryIndex = Math.round(
    Math.max(
      45,
      Math.min(98, avgRecovery - totalAdjustment * 0.65),
    ),
  );
  const projectedHrvMs = Math.round(
    Math.max(32, Math.min(110, avgRecentHrv - totalAdjustment * 0.48)),
  );

  const anomalies: PredictedAnomaly[] = [];

  if (crp && (crp.status === 'elevated' || crp.status === 'borderline')) {
    anomalies.push({
      id: 'anom-inflammatory-drift',
      title: 'Subclinical Inflammatory Recovery Drift',
      severity: crp.status === 'elevated' ? 'High' : 'Moderate',
      horizonDays: 5,
      confidencePct: crp.status === 'elevated' ? 89 : 78,
      summary:
        'Elevated hs-CRP from your latest analog blood panel coincides with a downward 7-day nocturnal HRV trajectory, predicting autonomic strain if training load remains unchanged.',
      wearableSignal: `7-day HRV ${Math.round(avgRecentHrv)} ms (${hrvDropPct >= 0 ? '-' : '+'}${Math.abs(hrvDropPct).toFixed(1)}% vs prior week)`,
      labCorrelate: `${crp.name} ${crp.value} ${crp.unit} (ref ${crp.refMin}–${crp.refMax})`,
      recommendedAction:
        'Substitute high-intensity intervals with 35 min Zone-2 aerobic work and extend sleep opportunity by 45 minutes.',
    });
  }

  if (cortisol && cortisol.status !== 'optimal') {
    anomalies.push({
      id: 'anom-cortisol-circadian',
      title: 'Evening Cortisol & Deep-Sleep Compression',
      severity: 'Moderate',
      horizonDays: 7,
      confidencePct: 84,
      summary:
        'Morning serum cortisol near upper threshold correlates with shortened slow-wave sleep architecture across the last four Oura Ring nights.',
      wearableSignal: `Deep sleep avg ${avgDeepSleep.toFixed(2)} hrs/night`,
      labCorrelate: `${cortisol.name} ${cortisol.value} ${cortisol.unit} (ref ${cortisol.refMin}–${cortisol.refMax})`,
      recommendedAction:
        'Initiate 60-minute pre-sleep blue-light cutoff and 10-minute physiological sigh protocol at 21:30.',
    });
  }

  if (ferritin && ferritin.status === 'low') {
    anomalies.push({
      id: 'anom-ferritin-fatigue',
      title: 'Aerobic Fatigue & Low Iron Reserve Signal',
      severity: 'High',
      horizonDays: 10,
      confidencePct: 86,
      summary:
        'Low serum ferritin from printed hematology labs combined with elevated resting heart rate indicates early oxygen-transport fatigue.',
      wearableSignal: `Resting HR trending +3 bpm above 30-day floor`,
      labCorrelate: `${ferritin.name} ${ferritin.value} ${ferritin.unit} (ref ${ferritin.refMin}–${ferritin.refMax})`,
      recommendedAction:
        'Share read-only hematology contract with your primary clinician and track resting HR recovery over 14 days.',
    });
  }

  // Always surface metabolic glucose stability watch if average glucose is elevated or as a monitoring anchor
  anomalies.push({
    id: 'anom-metabolic-variability',
    title: 'Post-Prandial Glucose Variability Watch',
    severity: avgGlucose > 100 ? 'Moderate' : 'Watch',
    horizonDays: 14,
    confidencePct: 74,
    summary:
      'Continuous glucose sensor excursions after 20:00 meals align with mild overnight heart-rate elevation and delayed sleep onset.',
    wearableSignal: `7-day mean glucose ${Math.round(avgGlucose)} mg/dL`,
    labCorrelate: 'HbA1c 5.2% · Fasting Insulin 4.8 uIU/mL',
    recommendedAction:
      'Take a 15-minute brisk walk within 20 minutes after dinner and finish calories 3 hours before bedtime.',
  });

  return {
    baselineRiskPct,
    projectedRiskPct,
    riskDeltaPct,
    projectedRecoveryIndex,
    projectedHrvMs,
    anomalies,
  };
}

export interface LabReportFormInput {
  title: string;
  provider: string;
  collectedDate: string;
  biomarkerName: string;
  biomarkerCode: string;
  category: BiomarkerRecord['category'];
  value: string;
  unit: string;
  refMin: string;
  refMax: string;
}

export function validateLabReportInput(
  input: LabReportFormInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length < 3) {
    errors.title = 'Enter a descriptive report title (at least 3 characters).';
  }
  if (!input.provider.trim()) {
    errors.provider = 'Enter the lab or clinic name.';
  }
  if (!input.collectedDate.trim()) {
    errors.collectedDate = 'Select the lab collection date.';
  }
  if (!input.biomarkerName.trim()) {
    errors.biomarkerName = 'Enter the primary biomarker name.';
  }
  const numVal = Number(input.value);
  const numMin = Number(input.refMin);
  const numMax = Number(input.refMax);
  if (input.value.trim() === '' || Number.isNaN(numVal) || numVal < 0) {
    errors.value = 'Enter a valid non-negative numeric reading.';
  }
  if (input.refMin.trim() === '' || Number.isNaN(numMin)) {
    errors.refMin = 'Enter a valid lower reference bound.';
  }
  if (
    input.refMax.trim() === '' ||
    Number.isNaN(numMax) ||
    (!Number.isNaN(numMin) && numMax <= numMin)
  ) {
    errors.refMax = 'Upper reference bound must exceed lower bound.';
  }
  if (!input.unit.trim()) {
    errors.unit = 'Specify measurement unit (e.g. mg/L, ng/mL).';
  }
  return errors;
}

export interface SmartContractFormInput {
  granteeName: string;
  granteeRole: string;
  scopes: ContractScope[];
  durationDays: number;
  passphrase: string;
}

export function validateSmartContractInput(
  input: SmartContractFormInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.granteeName.trim() || input.granteeName.trim().length < 3) {
    errors.granteeName = 'Enter the recipient physician, clinic, or study name.';
  }
  if (!input.granteeRole.trim()) {
    errors.granteeRole = 'Specify the recipient clinical or research role.';
  }
  if (input.scopes.length === 0) {
    errors.scopes = 'Select at least one encrypted data scope to authorize.';
  }
  if (input.durationDays < 1 || input.durationDays > 365) {
    errors.durationDays = 'Grant duration must be between 1 and 365 days.';
  }
  if (input.passphrase.trim().length < 6) {
    errors.passphrase = 'Sign with your vault passphrase (minimum 6 characters).';
  }
  return errors;
}
