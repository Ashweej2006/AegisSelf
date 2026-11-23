import type {
  AccessSmartContract,
  AuditLogEntry,
  BiomarkerRecord,
  DailyTelemetryPoint,
  HabitNudge,
  LabReport,
  VaultState,
  WearableDevice,
} from '../types/vault';
import { computeBiomarkerStatus, sha256Hex } from '../utils/healthIntelligence';

const buildTelemetrySeries = (): DailyTelemetryPoint[] => {
  // Deterministic 30-day realistic wearable + lab draw timeline ending Nov 23, 2026
  const baseHrv = [
    68, 70, 69, 72, 74, 71, 69, 73, 75, 72,
    70, 68, 71, 69, 67, 68, 66, 69, 67, 65,
    64, 63, 62, 59, 57, 58, 56, 55, 57, 56,
  ];
  const baseRhr = [
    51, 50, 51, 49, 49, 50, 51, 50, 49, 50,
    51, 52, 50, 51, 52, 51, 52, 51, 52, 53,
    53, 54, 54, 55, 56, 55, 56, 57, 55, 56,
  ];
  const baseDeepSleep = [
    1.85, 1.92, 1.78, 2.01, 1.95, 1.88, 1.72, 1.94, 2.05, 1.89,
    1.81, 1.74, 1.9, 1.82, 1.69, 1.76, 1.65, 1.78, 1.64, 1.58,
    1.62, 1.54, 1.49, 1.42, 1.38, 1.45, 1.36, 1.32, 1.44, 1.41,
  ];
  const baseGlucose = [
    91, 90, 92, 89, 88, 91, 93, 90, 89, 92,
    93, 94, 91, 92, 95, 93, 94, 92, 96, 97,
    95, 98, 99, 101, 102, 100, 103, 101, 99, 101,
  ];

  const months = ['Oct', 'Nov'];
  const points: DailyTelemetryPoint[] = [];

  for (let i = 0; i < 30; i++) {
    // Oct 25 to Nov 23, 2026
    const dayOffset = 25 + i;
    const isOct = dayOffset <= 31;
    const monthNum = isOct ? 10 : 11;
    const dayNum = isOct ? dayOffset : dayOffset - 31;
    const date = `2026-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const label = `${isOct ? months[0] : months[1]} ${String(dayNum).padStart(2, '0')}`;

    const hrvMs = baseHrv[i];
    const rhrBpm = baseRhr[i];
    const deepSleepHrs = baseDeepSleep[i];
    const glucoseMgDl = baseGlucose[i];

    const recoveryIndex = Math.round(
      Math.max(
        52,
        Math.min(
          96,
          44 + (hrvMs - 45) * 0.95 + (deepSleepHrs - 1.2) * 14 - (rhrBpm - 49) * 1.4,
        ),
      ),
    );
    const anomalyScore = Math.round(
      Math.max(8, Math.min(82, 100 - recoveryIndex + (glucoseMgDl - 90) * 0.7)),
    );

    let labDrawEvent: string | undefined;
    if (date === '2026-11-04') labDrawEvent = 'Comprehensive Metabolic Panel (PDF OCR)';
    if (date === '2026-11-18') labDrawEvent = 'Inflammation & Iron Panel (Printed Sheet)';

    points.push({
      date,
      label,
      hrvMs,
      rhrBpm,
      deepSleepHrs,
      glucoseMgDl,
      recoveryIndex,
      anomalyScore,
      labDrawEvent,
    });
  }
  return points;
};

const makeBiomarker = (
  id: string,
  name: string,
  code: string,
  category: BiomarkerRecord['category'],
  value: number,
  unit: string,
  refMin: number,
  refMax: number,
  previousValue: number,
  measuredDate: string,
  sourceReportId: string,
  sourceLab: string,
  ocrConfidence: number,
): BiomarkerRecord => ({
  id,
  name,
  code,
  category,
  value,
  unit,
  refMin,
  refMax,
  previousValue,
  measuredDate,
  sourceReportId,
  sourceLab,
  ocrConfidence,
  status: computeBiomarkerStatus(value, refMin, refMax),
  hash: sha256Hex(`${id}:${code}:${value}:${measuredDate}:${sourceLab}`),
});

export function createSeedVault(): VaultState {
  const labReports: LabReport[] = [
    {
      id: 'rep-2026-11-18',
      title: 'Cardio-Inflammatory & Iron Reserve Panel',
      provider: 'Quest Diagnostics — San Francisco',
      collectedDate: '2026-11-18',
      ingestedAt: '2026-11-19 08:14 UTC',
      sourceFormat: 'Paper Lab Sheet OCR',
      biomarkerCount: 4,
      flaggedCount: 2,
      ocrConfidence: 99.2,
      encryptionCipher: 'AES-256-GCM',
      sha256: sha256Hex('rep-2026-11-18:Quest:hs-CRP:2.1:Ferritin:26'),
      notes: 'Digitized via local client-side OCR from 2-page printed clinic slip. Zero cloud upload.',
    },
    {
      id: 'rep-2026-11-04',
      title: 'Comprehensive Metabolic & Endocrine Baseline',
      provider: 'UCSF Clinical Laboratories',
      collectedDate: '2026-11-04',
      ingestedAt: '2026-11-05 14:32 UTC',
      sourceFormat: 'Printed PDF Scan',
      biomarkerCount: 5,
      flaggedCount: 1,
      ocrConfidence: 99.6,
      encryptionCipher: 'AES-256-GCM',
      sha256: sha256Hex('rep-2026-11-04:UCSF:Cortisol:18.9:HbA1c:5.2'),
      notes: 'Fasting 11h morning venous draw. Verified against clinician cryptographic signature.',
    },
    {
      id: 'rep-2026-09-14',
      title: 'Advanced Lipid & ApoB Longevity Assay',
      provider: 'LabCorp Beacon Health',
      collectedDate: '2026-09-14',
      ingestedAt: '2026-09-15 10:05 UTC',
      sourceFormat: 'HL7 FHIR Bundle',
      biomarkerCount: 3,
      flaggedCount: 0,
      ocrConfidence: 100.0,
      encryptionCipher: 'AES-256-GCM',
      sha256: sha256Hex('rep-2026-09-14:LabCorp:ApoB:72:Lp(a):18'),
      notes: 'Direct encrypted FHIR import sealed with owner Ed25519 enclave key.',
    },
  ];

  const biomarkers: BiomarkerRecord[] = [
    makeBiomarker(
      'bm-crp',
      'High-Sensitivity CRP',
      'hs-CRP',
      'Inflammation',
      2.1,
      'mg/L',
      0.1,
      1.0,
      0.7,
      '2026-11-18',
      'rep-2026-11-18',
      'Quest Diagnostics',
      99.1,
    ),
    makeBiomarker(
      'bm-ferritin',
      'Serum Ferritin',
      'FERR',
      'Hematology',
      26,
      'ng/mL',
      35,
      220,
      44,
      '2026-11-18',
      'rep-2026-11-18',
      'Quest Diagnostics',
      98.9,
    ),
    makeBiomarker(
      'bm-homocysteine',
      'Homocysteine',
      'HCY',
      'Cardiovascular',
      8.4,
      'umol/L',
      5.0,
      11.0,
      8.9,
      '2026-11-18',
      'rep-2026-11-18',
      'Quest Diagnostics',
      99.4,
    ),
    makeBiomarker(
      'bm-vitd',
      '25-Hydroxy Vitamin D',
      '25-OH-D',
      'Endocrine',
      48,
      'ng/mL',
      35,
      80,
      42,
      '2026-11-18',
      'rep-2026-11-18',
      'Quest Diagnostics',
      99.3,
    ),
    makeBiomarker(
      'bm-cortisol',
      'Morning Serum Cortisol',
      'CORT-AM',
      'Endocrine',
      18.9,
      'ug/dL',
      6.2,
      19.4,
      14.2,
      '2026-11-04',
      'rep-2026-11-04',
      'UCSF Clinical Labs',
      99.5,
    ),
    makeBiomarker(
      'bm-hba1c',
      'Hemoglobin A1c',
      'HbA1c',
      'Metabolic',
      5.2,
      '%',
      4.5,
      5.6,
      5.3,
      '2026-11-04',
      'rep-2026-11-04',
      'UCSF Clinical Labs',
      99.8,
    ),
    makeBiomarker(
      'bm-insulin',
      'Fasting Insulin',
      'INS-F',
      'Metabolic',
      4.8,
      'uIU/mL',
      2.0,
      8.0,
      5.4,
      '2026-11-04',
      'rep-2026-11-04',
      'UCSF Clinical Labs',
      99.6,
    ),
    makeBiomarker(
      'bm-tsh',
      'Thyroid Stimulating Hormone',
      'TSH',
      'Endocrine',
      1.62,
      'mIU/L',
      0.5,
      3.5,
      1.75,
      '2026-11-04',
      'rep-2026-11-04',
      'UCSF Clinical Labs',
      99.7,
    ),
    makeBiomarker(
      'bm-alt',
      'Alanine Transaminase',
      'ALT',
      'Metabolic',
      19,
      'U/L',
      10,
      35,
      21,
      '2026-11-04',
      'rep-2026-11-04',
      'UCSF Clinical Labs',
      99.4,
    ),
    makeBiomarker(
      'bm-apob',
      'Apolipoprotein B',
      'ApoB',
      'Cardiovascular',
      72,
      'mg/dL',
      40,
      90,
      78,
      '2026-09-14',
      'rep-2026-09-14',
      'LabCorp Beacon',
      100.0,
    ),
    makeBiomarker(
      'bm-lpa',
      'Lipoprotein(a)',
      'Lp(a)',
      'Cardiovascular',
      18,
      'nmol/L',
      0,
      75,
      18,
      '2026-09-14',
      'rep-2026-09-14',
      'LabCorp Beacon',
      100.0,
    ),
    makeBiomarker(
      'bm-hdl',
      'HDL Cholesterol',
      'HDL-C',
      'Cardiovascular',
      66,
      'mg/dL',
      45,
      95,
      62,
      '2026-09-14',
      'rep-2026-09-14',
      'LabCorp Beacon',
      100.0,
    ),
  ];

  const wearables: WearableDevice[] = [
    {
      id: 'dev-oura-4',
      name: 'Oura Ring Gen 4',
      vendor: 'Oura Health',
      category: 'Ring',
      status: 'streaming',
      samplingInterval: '5 min',
      lastSyncAt: '2026-11-23 09:52',
      batteryPct: 84,
      signals: ['Nocturnal HRV', 'Deep & REM Sleep', 'Skin Temp Delta'],
      encryptionKeyFingerprint: 'ed25519:7a9f…e41b',
      readingsToday: 288,
    },
    {
      id: 'dev-watch-ultra',
      name: 'Apple Watch Ultra 2',
      vendor: 'Apple',
      category: 'Watch',
      status: 'streaming',
      samplingInterval: '1 min',
      lastSyncAt: '2026-11-23 09:55',
      batteryPct: 71,
      signals: ['Resting Heart Rate', 'VO2 Max', 'ECG Rhythm'],
      encryptionKeyFingerprint: 'ed25519:3c12…90ab',
      readingsToday: 1142,
    },
    {
      id: 'dev-dexcom-cgm',
      name: 'Dexcom Stelo CGM',
      vendor: 'Dexcom',
      category: 'CGM Patch',
      status: 'streaming',
      samplingInterval: '5 min',
      lastSyncAt: '2026-11-23 09:50',
      batteryPct: 62,
      signals: ['Interstitial Glucose', 'Post-Prandial Slope'],
      encryptionKeyFingerprint: 'ed25519:91de…44f0',
      readingsToday: 240,
    },
    {
      id: 'dev-polar-h10',
      name: 'Polar H10 Strap',
      vendor: 'Polar',
      category: 'Chest Strap',
      status: 'paused',
      samplingInterval: '1 min',
      lastSyncAt: '2026-11-21 07:40',
      batteryPct: 95,
      signals: ['RR Interval Precision', 'Zone-2 Cardiac Drift'],
      encryptionKeyFingerprint: 'ed25519:5f08…12c9',
      readingsToday: 0,
    },
  ];

  const nudges: HabitNudge[] = [
    {
      id: 'nudge-wind-down',
      title: 'Start 45-min Circadian Wind-Down Protocol',
      rationale:
        'Morning cortisol (18.9 ug/dL) paired with 1.41h deep sleep predicts parasympathetic lag tonight.',
      category: 'Circadian',
      triggerSource: 'UCSF Lab + Oura Ring',
      scheduledWindow: 'Today · 21:30',
      impactDeltaPct: 8,
      completed: false,
      active: true,
    },
    {
      id: 'nudge-zone2',
      title: 'Swap HIIT for 35-min Zone-2 Recovery Ride',
      rationale:
        'Elevated hs-CRP (2.1 mg/L) and -12% weekly HRV trend favor low-cortisol aerobic clearance.',
      category: 'Recovery',
      triggerSource: 'Quest Lab + Watch Ultra',
      scheduledWindow: 'Today · 17:00',
      impactDeltaPct: 11,
      completed: false,
      active: true,
    },
    {
      id: 'nudge-post-dinner-walk',
      title: '15-min Post-Dinner Glucose Clearance Walk',
      rationale:
        'Blunts evening glucose spike above 118 mg/dL that delayed sleep latency on 3 recent nights.',
      category: 'Metabolic',
      triggerSource: 'Dexcom CGM',
      scheduledWindow: 'Today · 19:45',
      impactDeltaPct: 6,
      completed: true,
      active: true,
    },
    {
      id: 'nudge-iron-pairing',
      title: 'Take Vitamin C + Iron-Rich Lunch Pairing',
      rationale:
        'Supports low serum ferritin (26 ng/mL) away from morning coffee polyphenols.',
      category: 'Metabolic',
      triggerSource: 'Quest Hematology Lab',
      scheduledWindow: 'Today · 12:30',
      impactDeltaPct: 5,
      completed: true,
      active: true,
    },
  ];

  const contracts: AccessSmartContract[] = [
    {
      id: 'sc-cardiology-vance',
      contractAddress: '0x71C4…9E2A',
      granteeName: 'Dr. Elena Vance, MD',
      granteeRole: 'Preventive Cardiology · UCSF Health',
      network: 'AegisZK L2',
      scopes: ['Lab Biomarkers', 'HRV & Recovery', 'Anomaly Forecasts'],
      zkProofOnly: false,
      status: 'Active',
      createdAt: '2026-11-12',
      expiresAt: '2026-12-12',
      durationDays: 30,
      signatureHash: sha256Hex('sc-cardiology-vance:2026-11-12:active'),
    },
    {
      id: 'sc-stanford-zk',
      contractAddress: '0x38B9…4F10',
      granteeName: 'Stanford Longevity Biomarker Cohort',
      granteeRole: 'Zero-Knowledge Clinical Research',
      network: 'AegisZK L2',
      scopes: ['HRV & Recovery', 'Sleep Architecture'],
      zkProofOnly: true,
      status: 'Active',
      createdAt: '2026-11-01',
      expiresAt: '2027-01-30',
      durationDays: 90,
      signatureHash: sha256Hex('sc-stanford-zk:2026-11-01:zk'),
    },
    {
      id: 'sc-sports-physio',
      contractAddress: '0xA92D…11C4',
      granteeName: 'Bay Performance Physiology',
      granteeRole: 'Endurance Coaching Lab',
      network: 'AegisZK L2',
      scopes: ['HRV & Recovery', 'Glucose Telemetry'],
      zkProofOnly: false,
      status: 'Revoked',
      createdAt: '2026-09-18',
      expiresAt: '2026-10-18',
      durationDays: 30,
      signatureHash: sha256Hex('sc-sports-physio:2026-09-18:revoked'),
    },
  ];

  const auditLog: AuditLogEntry[] = [
    {
      id: 'aud-1',
      timestamp: '2026-11-23 09:55:12 UTC',
      action: 'STREAM_SYNCED',
      actor: 'Apple Watch Ultra 2',
      subject: 'Encrypted batch · 144 telemetry frames sealed',
      hash: sha256Hex('aud-1:watch-sync:2026-11-23'),
    },
    {
      id: 'aud-2',
      timestamp: '2026-11-19 08:14:40 UTC',
      action: 'LAB_INGESTED',
      actor: 'Local OCR Enclave',
      subject: 'Cardio-Inflammatory & Iron Reserve Panel (4 biomarkers)',
      hash: labReports[0].sha256,
    },
    {
      id: 'aud-3',
      timestamp: '2026-11-12 16:04:19 UTC',
      action: 'CONTRACT_DEPLOYED',
      actor: 'Vault Owner Key',
      subject: 'Granted 30-day scoped access to Dr. Elena Vance, MD',
      hash: contracts[0].signatureHash,
    },
    {
      id: 'aud-4',
      timestamp: '2026-10-10 11:22:08 UTC',
      action: 'CONTRACT_REVOKED',
      actor: 'Vault Owner Key',
      subject: 'Revoked telemetry grant 0xA92D…11C4 (Bay Performance Physiology)',
      hash: contracts[2].signatureHash,
    },
  ];

  return {
    vaultId: 'AEGIS-VT-8841-9F2C',
    publicKeyFingerprint: '0x4E8A91C0B73D22F4E19A',
    telemetry: buildTelemetrySeries(),
    labReports,
    biomarkers,
    wearables,
    nudges,
    contracts,
    auditLog,
  };
}
