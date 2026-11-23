export type VaultScreen =
  | 'overview'
  | 'labs'
  | 'wearables'
  | 'anomalies'
  | 'contracts';

export type BiomarkerStatus = 'optimal' | 'borderline' | 'elevated' | 'low';

export interface DailyTelemetryPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g., "Nov 01"
  hrvMs: number;
  rhrBpm: number;
  deepSleepHrs: number;
  glucoseMgDl: number;
  recoveryIndex: number; // 0-100
  anomalyScore: number; // 0-100
  labDrawEvent?: string;
}

export interface BiomarkerRecord {
  id: string;
  name: string;
  code: string;
  category: 'Metabolic' | 'Inflammation' | 'Cardiovascular' | 'Endocrine' | 'Hematology';
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
  previousValue: number;
  measuredDate: string;
  sourceReportId: string;
  sourceLab: string;
  ocrConfidence: number; // 0-100
  status: BiomarkerStatus;
  hash: string;
}

export interface LabReport {
  id: string;
  title: string;
  provider: string;
  collectedDate: string;
  ingestedAt: string;
  sourceFormat: 'Printed PDF Scan' | 'Paper Lab Sheet OCR' | 'HL7 FHIR Bundle';
  biomarkerCount: number;
  flaggedCount: number;
  ocrConfidence: number;
  encryptionCipher: 'AES-256-GCM';
  sha256: string;
  notes: string;
}

export interface WearableDevice {
  id: string;
  name: string;
  vendor: string;
  category: 'Ring' | 'Watch' | 'CGM Patch' | 'Chest Strap';
  status: 'streaming' | 'paused';
  samplingInterval: '1 min' | '5 min' | '15 min';
  lastSyncAt: string;
  batteryPct: number;
  signals: string[];
  encryptionKeyFingerprint: string;
  readingsToday: number;
}

export interface HabitNudge {
  id: string;
  title: string;
  rationale: string;
  category: 'Recovery' | 'Circadian' | 'Metabolic' | 'Cardio';
  triggerSource: string;
  scheduledWindow: string;
  impactDeltaPct: number; // estimated anomaly risk reduction
  completed: boolean;
  active: boolean;
}

export interface PredictedAnomaly {
  id: string;
  title: string;
  severity: 'High' | 'Moderate' | 'Watch';
  horizonDays: number;
  confidencePct: number;
  summary: string;
  wearableSignal: string;
  labCorrelate: string;
  recommendedAction: string;
}

export type ContractScope =
  | 'Lab Biomarkers'
  | 'HRV & Recovery'
  | 'Sleep Architecture'
  | 'Glucose Telemetry'
  | 'Anomaly Forecasts';

export interface AccessSmartContract {
  id: string;
  contractAddress: string;
  granteeName: string;
  granteeRole: string;
  network: 'AegisZK L2';
  scopes: ContractScope[];
  zkProofOnly: boolean;
  status: 'Active' | 'Revoked' | 'Expired';
  createdAt: string;
  expiresAt: string;
  durationDays: number;
  signatureHash: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | 'LAB_INGESTED'
    | 'STREAM_SYNCED'
    | 'CONTRACT_DEPLOYED'
    | 'CONTRACT_REVOKED'
    | 'VAULT_VERIFIED'
    | 'NUDGE_COMPLETED';
  actor: string;
  subject: string;
  hash: string;
}

export interface HabitSimulationParams {
  sleepHoursTarget: number; // 6.0 - 9.5
  zone2MinutesPerWeek: number; // 0 - 300
  eveningScreenCutoffMins: number; // 0 - 120
  hydrationLiters: number; // 1.0 - 4.0
}

export interface VaultState {
  vaultId: string;
  publicKeyFingerprint: string;
  telemetry: DailyTelemetryPoint[];
  labReports: LabReport[];
  biomarkers: BiomarkerRecord[];
  wearables: WearableDevice[];
  nudges: HabitNudge[];
  contracts: AccessSmartContract[];
  auditLog: AuditLogEntry[];
}
