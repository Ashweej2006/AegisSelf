import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHabitAdherence,
  computeBiomarkerRangePosition,
  computeBiomarkerStatus,
  computePearsonCorrelation,
  evaluateCrossSourceIntelligence,
  filterBiomarkers,
  formatShortHash,
  sha256Hex,
  validateLabReportInput,
  validateSmartContractInput,
} from './healthIntelligence';
import type { BiomarkerRecord, DailyTelemetryPoint, HabitNudge } from '../types/vault';

test('sha256Hex matches standard FIPS 180-4 test vectors', () => {
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assert.equal(
    sha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  assert.equal(formatShortHash(sha256Hex('abc'), 8, 6), 'ba7816bf…0015ad');
});

test('computeBiomarkerStatus classifies optimal, borderline, elevated, and low accurately', () => {
  assert.equal(computeBiomarkerStatus(50, 20, 100), 'optimal');
  assert.equal(computeBiomarkerStatus(95, 20, 100), 'borderline');
  assert.equal(computeBiomarkerStatus(112, 20, 100), 'elevated');
  assert.equal(computeBiomarkerStatus(14, 20, 100), 'low');
  const pos = computeBiomarkerRangePosition(60, 20, 100);
  assert.ok(pos > 40 && pos < 60);
});

test('calculateHabitAdherence counts only active nudges', () => {
  const nudges: HabitNudge[] = [
    {
      id: '1',
      title: 'Sleep wind-down',
      rationale: 'Improves HRV',
      category: 'Circadian',
      triggerSource: 'Oura',
      scheduledWindow: '21:30',
      impactDeltaPct: 6,
      completed: true,
      active: true,
    },
    {
      id: '2',
      title: 'Zone 2 walk',
      rationale: 'Lowers glucose',
      category: 'Metabolic',
      triggerSource: 'CGM',
      scheduledWindow: '19:30',
      impactDeltaPct: 4,
      completed: false,
      active: true,
    },
    {
      id: '3',
      title: 'Paused protocol',
      rationale: 'Inactive',
      category: 'Recovery',
      triggerSource: 'Watch',
      scheduledWindow: '08:00',
      impactDeltaPct: 3,
      completed: false,
      active: false,
    },
  ];
  assert.deepEqual(calculateHabitAdherence(nudges), {
    completed: 1,
    total: 2,
    percentage: 50,
  });
});

test('computePearsonCorrelation returns +1 for perfectly linear and -1 for inverse series', () => {
  assert.equal(computePearsonCorrelation([10, 20, 30, 40], [2, 4, 6, 8]), 1);
  assert.equal(computePearsonCorrelation([10, 20, 30, 40], [8, 6, 4, 2]), -1);
});

test('evaluateCrossSourceIntelligence reduces projected anomaly risk when restorative habits increase', () => {
  const telemetry: DailyTelemetryPoint[] = Array.from({ length: 14 }, (_, idx) => ({
    date: `2026-11-${String(idx + 1).padStart(2, '0')}`,
    label: `Nov ${idx + 1}`,
    hrvMs: idx < 7 ? 68 : 56,
    rhrBpm: idx < 7 ? 52 : 56,
    deepSleepHrs: idx < 7 ? 1.8 : 1.35,
    glucoseMgDl: 102,
    recoveryIndex: idx < 7 ? 84 : 71,
    anomalyScore: idx < 7 ? 18 : 42,
  }));

  const biomarkers: BiomarkerRecord[] = [
    {
      id: 'b1',
      name: 'High-Sensitivity CRP',
      code: 'hs-CRP',
      category: 'Inflammation',
      value: 2.6,
      unit: 'mg/L',
      refMin: 0.1,
      refMax: 1.0,
      previousValue: 0.9,
      measuredDate: '2026-11-12',
      sourceReportId: 'rep-1',
      sourceLab: 'Quest Diagnostics',
      ocrConfidence: 99.1,
      status: 'elevated',
      hash: sha256Hex('b1'),
    },
  ];

  const baselineSim = evaluateCrossSourceIntelligence(telemetry, biomarkers, {
    sleepHoursTarget: 7.1,
    zone2MinutesPerWeek: 110,
    eveningScreenCutoffMins: 20,
    hydrationLiters: 2.0,
  });

  const optimizedSim = evaluateCrossSourceIntelligence(telemetry, biomarkers, {
    sleepHoursTarget: 8.5,
    zone2MinutesPerWeek: 210,
    eveningScreenCutoffMins: 90,
    hydrationLiters: 3.2,
  });

  assert.ok(
    optimizedSim.projectedRiskPct < baselineSim.projectedRiskPct,
    'Optimized habits should reduce projected risk',
  );
  assert.ok(
    optimizedSim.projectedRecoveryIndex > baselineSim.projectedRecoveryIndex,
    'Optimized habits should increase projected recovery index',
  );
  assert.ok(
    baselineSim.anomalies.some((a) => a.id === 'anom-inflammatory-drift'),
    'Elevated hs-CRP + HRV drop should surface inflammatory drift anomaly',
  );
});

test('filterBiomarkers filters by text query and flagged status', () => {
  const sample: BiomarkerRecord[] = [
    {
      id: '1',
      name: 'Ferritin',
      code: 'FERR',
      category: 'Hematology',
      value: 22,
      unit: 'ng/mL',
      refMin: 30,
      refMax: 250,
      previousValue: 41,
      measuredDate: '2026-11-10',
      sourceReportId: 'r1',
      sourceLab: 'LabCorp',
      ocrConfidence: 98.4,
      status: 'low',
      hash: 'abc',
    },
    {
      id: '2',
      name: 'Hemoglobin A1c',
      code: 'HbA1c',
      category: 'Metabolic',
      value: 5.1,
      unit: '%',
      refMin: 4.5,
      refMax: 5.6,
      previousValue: 5.2,
      measuredDate: '2026-11-10',
      sourceReportId: 'r1',
      sourceLab: 'LabCorp',
      ocrConfidence: 99.5,
      status: 'optimal',
      hash: 'def',
    },
  ];

  assert.equal(filterBiomarkers(sample, '', 'flagged').length, 1);
  assert.equal(filterBiomarkers(sample, 'hba1c', 'all').length, 1);
  assert.equal(filterBiomarkers(sample, 'ferritin', 'optimal').length, 0);
});

test('form validators reject invalid lab reports and smart contracts with clear errors', () => {
  const labErrors = validateLabReportInput({
    title: '',
    provider: '',
    collectedDate: '',
    biomarkerName: '',
    biomarkerCode: '',
    category: 'Metabolic',
    value: '-2',
    unit: '',
    refMin: '10',
    refMax: '5',
  });
  assert.ok(labErrors.title);
  assert.ok(labErrors.value);
  assert.ok(labErrors.refMax);

  const contractErrors = validateSmartContractInput({
    granteeName: 'Dr',
    granteeRole: '',
    scopes: [],
    durationDays: 0,
    passphrase: '123',
  });
  assert.ok(contractErrors.granteeName);
  assert.ok(contractErrors.scopes);
  assert.ok(contractErrors.passphrase);
});
