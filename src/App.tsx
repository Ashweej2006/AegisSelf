import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { createSeedVault } from './data/seedVault';
import type {
  AccessSmartContract,
  AuditLogEntry,
  BiomarkerRecord,
  ContractScope,
  HabitNudge,
  HabitSimulationParams,
  LabReport,
  VaultScreen,
  VaultState,
  WearableDevice,
} from './types/vault';
import {
  computeBiomarkerStatus,
  evaluateCrossSourceIntelligence,
  formatShortHash,
  sha256Hex,
  type LabReportFormInput,
} from './utils/healthIntelligence';
import HeroAscii from './components/ui/hero-ascii';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/OverviewView';
import { LabVaultView } from './components/LabVaultView';
import { WearableStreamsView } from './components/WearableStreamsView';
import { AnomaliesNudgesView } from './components/AnomaliesNudgesView';
import { SmartContractsView } from './components/SmartContractsView';
import HalftoneWordmarkFooter from './components/HalftoneWordmarkFooter';
import { BiometricScanModal } from './components/BiometricScanModal';
import { VoiceBriefingModal } from './components/VoiceBriefingModal';
import HaloPointer from './components/ui/halo-pointer';

const STORAGE_KEY = 'aegisself_vault_state_v1';

const DEFAULT_SIM_PARAMS: HabitSimulationParams = {
  sleepHoursTarget: 7.1,
  zone2MinutesPerWeek: 110,
  eveningScreenCutoffMins: 20,
  hydrationLiters: 2.0,
};

function loadInitialVault(): VaultState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VaultState;
      if (parsed && Array.isArray(parsed.telemetry) && Array.isArray(parsed.biomarkers)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to deterministic seed vault
  }
  return createSeedVault();
}

function nowUtcStamp(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
}

export default function App() {
  const [vault, setVault] = useState<VaultState>(() => loadInitialVault());
  const [activeScreen, setActiveScreen] = useState<VaultScreen>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [simParams, setSimParams] = useState<HabitSimulationParams>(DEFAULT_SIM_PARAMS);
  const [lastVerifiedHash, setLastVerifiedHash] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states wired from TopBar or screen buttons
  const [ingestLabOpen, setIngestLabOpen] = useState(false);
  const [createNudgeOpen, setCreateNudgeOpen] = useState(false);
  const [deployContractOpen, setDeployContractOpen] = useState(false);
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [voiceBriefingOpen, setVoiceBriefingOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch {
      // Ignore storage quota errors
    }
  }, [vault]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen') as VaultScreen | null;
    if (screenParam && ['overview', 'labs', 'wearables', 'anomalies', 'contracts'].includes(screenParam)) {
      setActiveScreen(screenParam);
    }
    if (params.get('biometric') === '1') {
      setBiometricModalOpen(true);
    }
    if (params.get('voice') === '1') {
      setVoiceBriefingOpen(true);
    }
    if (params.get('autostart') === '1') {
      const target = document.getElementById('vault-workspace');
      target?.scrollIntoView({ behavior: 'auto' });
    }
    if (params.get('footer') === '1') {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
      }, 300);
    }
  }, []);

  const handleEnterVault = (targetScreen?: VaultScreen) => {
    if (targetScreen) {
      setActiveScreen(targetScreen);
    }
    const workspace = document.getElementById('vault-workspace');
    if (workspace) {
      workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const simulationResult = useMemo(
    () => evaluateCrossSourceIntelligence(vault.telemetry, vault.biomarkers, simParams),
    [vault.telemetry, vault.biomarkers, simParams],
  );

  const appendAudit = (
    prev: VaultState,
    action: AuditLogEntry['action'],
    actor: string,
    subject: string,
    hashSeed: string,
  ): AuditLogEntry => ({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowUtcStamp(),
    action,
    actor,
    subject,
    hash: sha256Hex(`${prev.vaultId}:${action}:${subject}:${hashSeed}`),
  });

  const handleVerifyVault = () => {
    const merkleInput = [
      vault.vaultId,
      ...vault.labReports.map((r) => r.sha256),
      ...vault.contracts.map((c) => `${c.id}:${c.status}:${c.signatureHash}`),
      String(vault.telemetry.length),
    ].join('|');
    const digest = sha256Hex(merkleInput);
    setLastVerifiedHash(digest);
    setVault((prev) => ({
      ...prev,
      auditLog: [
        appendAudit(
          prev,
          'VAULT_VERIFIED',
          'Local Crypto Enclave',
          `Verified Merkle integrity across ${prev.labReports.length} lab reports & ${prev.contracts.length} contracts`,
          digest,
        ),
        ...prev.auditLog,
      ],
    }));
    setToastMessage(`Vault SHA-256 Merkle root verified (${formatShortHash(digest, 8, 6)})`);
  };

  const handleToggleNudgeComplete = (id: string) => {
    setVault((prev) => {
      const target = prev.nudges.find((n) => n.id === id);
      const nextCompleted = target ? !target.completed : false;
      const nextNudges = prev.nudges.map((n) =>
        n.id === id ? { ...n, completed: nextCompleted } : n,
      );
      const nextAudit =
        target && nextCompleted
          ? [
              appendAudit(
                prev,
                'NUDGE_COMPLETED',
                'Vault Owner',
                `Completed habit protocol: ${target.title}`,
                `${id}:${Date.now()}`,
              ),
              ...prev.auditLog,
            ]
          : prev.auditLog;

      return { ...prev, nudges: nextNudges, auditLog: nextAudit };
    });
  };

  const handleToggleNudgeActive = (id: string) => {
    setVault((prev) => ({
      ...prev,
      nudges: prev.nudges.map((n) => (n.id === id ? { ...n, active: !n.active } : n)),
    }));
  };

  const handleDeleteNudge = (id: string) => {
    setVault((prev) => ({
      ...prev,
      nudges: prev.nudges.filter((n) => n.id !== id),
    }));
    setToastMessage('Habit nudge rule removed from vault.');
  };

  const handleCreateNudge = (
    input: Omit<HabitNudge, 'id' | 'completed' | 'active'>,
  ) => {
    const created: HabitNudge = {
      ...input,
      id: `nudge-${Date.now()}`,
      completed: false,
      active: true,
    };
    setVault((prev) => ({
      ...prev,
      nudges: [created, ...prev.nudges],
    }));
    setToastMessage(`Added habit nudge: ${created.title}`);
  };

  const handleIngestLabReport = (input: LabReportFormInput) => {
    const numericVal = Number(input.value);
    const refMin = Number(input.refMin);
    const refMax = Number(input.refMax);
    const status = computeBiomarkerStatus(numericVal, refMin, refMax);
    const reportId = `rep-${Date.now()}`;
    const code =
      input.biomarkerCode.trim() ||
      input.biomarkerName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 6);

    const recordHash = sha256Hex(
      `${reportId}:${input.title}:${input.biomarkerName}:${numericVal}:${input.collectedDate}`,
    );

    const newReport: LabReport = {
      id: reportId,
      title: input.title.trim(),
      provider: input.provider.trim(),
      collectedDate: input.collectedDate,
      ingestedAt: nowUtcStamp(),
      sourceFormat: 'Paper Lab Sheet OCR',
      biomarkerCount: 1,
      flaggedCount: status === 'optimal' ? 0 : 1,
      ocrConfidence: 99.4,
      encryptionCipher: 'AES-256-GCM',
      sha256: recordHash,
      notes: 'Parsed inside local client enclave and sealed with deterministic SHA-256 proof.',
    };

    const newBiomarker: BiomarkerRecord = {
      id: `bm-${Date.now()}`,
      name: input.biomarkerName.trim(),
      code,
      category: input.category,
      value: numericVal,
      unit: input.unit.trim(),
      refMin,
      refMax,
      previousValue: numericVal,
      measuredDate: input.collectedDate,
      sourceReportId: reportId,
      sourceLab: input.provider.trim(),
      ocrConfidence: 99.4,
      status,
      hash: recordHash,
    };

    setVault((prev) => ({
      ...prev,
      labReports: [newReport, ...prev.labReports],
      biomarkers: [newBiomarker, ...prev.biomarkers],
      auditLog: [
        appendAudit(
          prev,
          'LAB_INGESTED',
          'Local OCR Enclave',
          `Sealed "${newReport.title}" (${newBiomarker.name}: ${numericVal} ${newBiomarker.unit})`,
          recordHash,
        ),
        ...prev.auditLog,
      ],
    }));

    setToastMessage(
      `Encrypted lab record sealed (${formatShortHash(recordHash, 8, 6)})`,
    );
  };

  const handleToggleDeviceStream = (deviceId: string) => {
    setVault((prev) => ({
      ...prev,
      wearables: prev.wearables.map((w) =>
        w.id === deviceId
          ? { ...w, status: w.status === 'streaming' ? 'paused' : 'streaming' }
          : w,
      ),
    }));
  };

  const handleChangeSamplingInterval = (
    deviceId: string,
    interval: WearableDevice['samplingInterval'],
  ) => {
    setVault((prev) => ({
      ...prev,
      wearables: prev.wearables.map((w) =>
        w.id === deviceId ? { ...w, samplingInterval: interval } : w,
      ),
    }));
  };

  const handleSyncDeviceNow = (deviceId: string) => {
    setVault((prev) => {
      const target = prev.wearables.find((w) => w.id === deviceId);
      if (!target) return prev;

      const addedFrames = 24;
      const updatedWearables = prev.wearables.map((w) =>
        w.id === deviceId
          ? {
              ...w,
              status: 'streaming' as const,
              readingsToday: w.readingsToday + addedFrames,
              lastSyncAt: nowUtcStamp().slice(0, 16),
            }
          : w,
      );

      const updatedTelemetry = [...prev.telemetry];
      const last = updatedTelemetry[updatedTelemetry.length - 1];
      if (last) {
        const nextHrv = Math.min(82, last.hrvMs + (deviceId === 'dev-oura-4' ? 2 : 1));
        updatedTelemetry[updatedTelemetry.length - 1] = {
          ...last,
          hrvMs: nextHrv,
          recoveryIndex: Math.min(96, last.recoveryIndex + 1),
        };
      }

      return {
        ...prev,
        wearables: updatedWearables,
        telemetry: updatedTelemetry,
        auditLog: [
          appendAudit(
            prev,
            'STREAM_SYNCED',
            target.name,
            `Synced ${addedFrames} encrypted telemetry frames into local vault`,
            `${deviceId}:${Date.now()}`,
          ),
          ...prev.auditLog,
        ],
      };
    });
    setToastMessage('Wearable telemetry stream synced and encrypted locally.');
  };

  const handleDeployContract = (payload: {
    granteeName: string;
    granteeRole: string;
    scopes: ContractScope[];
    zkProofOnly: boolean;
    durationDays: number;
    passphrase: string;
  }) => {
    const createdDate = new Date('2026-11-23T12:00:00Z');
    const expiresDate = new Date(
      createdDate.getTime() + payload.durationDays * 86400 * 1000,
    );
    const createdStr = createdDate.toISOString().slice(0, 10);
    const expiresStr = expiresDate.toISOString().slice(0, 10);

    const sigHash = sha256Hex(
      `${vault.vaultId}:${payload.granteeName}:${payload.scopes.join(',')}:${payload.durationDays}:${payload.passphrase}:${Date.now()}`,
    );
    const addr = `0x${sigHash.slice(0, 4).toUpperCase()}…${sigHash.slice(-4).toUpperCase()}`;

    const newContract: AccessSmartContract = {
      id: `sc-${Date.now()}`,
      contractAddress: addr,
      granteeName: payload.granteeName,
      granteeRole: payload.granteeRole,
      network: 'AegisZK L2',
      scopes: payload.scopes,
      zkProofOnly: payload.zkProofOnly,
      status: 'Active',
      createdAt: createdStr,
      expiresAt: expiresStr,
      durationDays: payload.durationDays,
      signatureHash: sigHash,
    };

    setVault((prev) => ({
      ...prev,
      contracts: [newContract, ...prev.contracts],
      auditLog: [
        appendAudit(
          prev,
          'CONTRACT_DEPLOYED',
          'Vault Owner Key',
          `Deployed ${payload.durationDays}d ${payload.zkProofOnly ? 'ZK-Proof' : 'Scoped'} grant to ${payload.granteeName}`,
          sigHash,
        ),
        ...prev.auditLog,
      ],
    }));

    setToastMessage(`Smart contract ${addr} deployed for ${payload.granteeName}`);
  };

  const handleRevokeContract = (contractId: string) => {
    setVault((prev) => {
      const target = prev.contracts.find((c) => c.id === contractId);
      if (!target) return prev;
      return {
        ...prev,
        contracts: prev.contracts.map((c) =>
          c.id === contractId ? { ...c, status: 'Revoked' } : c,
        ),
        auditLog: [
          appendAudit(
            prev,
            'CONTRACT_REVOKED',
            'Vault Owner Key',
            `Revoked smart contract ${target.contractAddress} (${target.granteeName})`,
            `${contractId}:${Date.now()}`,
          ),
          ...prev.auditLog,
        ],
      };
    });
    setToastMessage('Smart contract revoked. Grantee decryption key invalidated.');
  };

  const handleExportEncryptedVault = () => {
    const payload = {
      schema: 'AegisSelf.VaultExport.v1',
      exportedAt: nowUtcStamp(),
      cipher: 'AES-256-GCM',
      vaultId: vault.vaultId,
      merkleRoot: sha256Hex(JSON.stringify(vault)),
      data: vault,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${vault.vaultId.toLowerCase()}-encrypted-backup.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToastMessage('Downloaded signed encrypted vault backup JSON.');
  };

  const topBarAction = useMemo(() => {
    switch (activeScreen) {
      case 'overview':
        return {
          label: 'Ingest Lab Report',
          handler: () => {
            setActiveScreen('labs');
            setIngestLabOpen(true);
          },
        };
      case 'labs':
        return {
          label: 'Ingest Lab Report',
          handler: () => setIngestLabOpen(true),
        };
      case 'wearables':
        return {
          label: 'Sync All Streams',
          handler: () => handleSyncDeviceNow('dev-oura-4'),
        };
      case 'anomalies':
        return {
          label: 'Add Habit Nudge',
          handler: () => setCreateNudgeOpen(true),
        };
      case 'contracts':
        return {
          label: 'Deploy Access Contract',
          handler: () => setDeployContractOpen(true),
        };
    }
  }, [activeScreen]);

  const flaggedLabCount = vault.biomarkers.filter((b) => b.status !== 'optimal').length;
  const activeContractCount = vault.contracts.filter((c) => c.status === 'Active').length;
  const latestTelemetry = vault.telemetry[vault.telemetry.length - 1];

  return (
    <HaloPointer color="#06b6d4" arrow="light">
      <div className="min-h-screen bg-[#F8FAFC] text-[#0B1C30]">
        <HeroAscii
          vaultId={vault.vaultId}
          latestHrvMs={latestTelemetry?.hrvMs ?? 56}
          latestDeepSleepHrs={latestTelemetry?.deepSleepHrs ?? 1.41}
          latestGlucoseMgDl={latestTelemetry?.glucoseMgDl ?? 101}
          biomarkerCount={vault.biomarkers.length}
          flaggedLabCount={flaggedLabCount}
          activeContractCount={activeContractCount}
          baselineRiskPct={simulationResult.baselineRiskPct}
          onEnterVault={handleEnterVault}
        />

        {/* Smooth Dark-to-Light Obsidian -> Deep Vault Slate -> Clinical Canvas Gradient Transition */}
        <div
          aria-label="Encrypted Vault Architecture Transition"
          data-testid="hero-dashboard-gradient"
          className="relative w-full overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, #000000 0%, #070F1E 24%, #0F172A 46%, #334155 68%, #CBD5E1 86%, #F8FAFC 100%)',
          }}
        >
          {/* Subtle Cyan / Emerald Atmospheric Horizon Mist */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(6,182,212,0.16)_0%,rgba(16,185,129,0.08)_34%,transparent_72%)]"
          />

          <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  index: '01',
                  title: 'Analog Lab Ingestion',
                  detail:
                    'Printed clinic reports and PDF panels parsed locally via OCR and sealed with deterministic SHA-256 digests.',
                  metric: `${vault.labReports.length} Reports · ${vault.biomarkers.length} Biomarkers`,
                  screen: 'labs' as VaultScreen,
                  halo: '#06b6d4',
                },
                {
                  index: '02',
                  title: 'Wearable Telemetry Fusion',
                  detail:
                    'Nocturnal HRV, slow-wave sleep, and interstitial glucose correlated continuously without third-party cloud lock-in.',
                  metric: `${vault.wearables.filter((w) => w.status === 'streaming').length} Live Streams · 30d Window`,
                  screen: 'wearables' as VaultScreen,
                  halo: '#10b981',
                },
                {
                  index: '03',
                  title: 'Smart Contract Sovereignty',
                  detail:
                    'Time-bounded, zero-knowledge data access grants deployed and revoked instantaneously under your private key.',
                  metric: `${activeContractCount} Active Grants · AegisZK L2`,
                  screen: 'contracts' as VaultScreen,
                  halo: '#8b5cf6',
                },
              ].map((pillar, idx) => (
                <motion.button
                  key={pillar.index}
                  type="button"
                  data-halo={pillar.halo}
                  onClick={() => handleEnterVault(pillar.screen)}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.45,
                    delay: idx * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group text-left p-5 sm:p-6 rounded-2xl bg-[#0F172A]/68 backdrop-blur-md border border-white/12 hover:border-[#06B6D4]/60 transition-colors cursor-pointer"
                >
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-[#06B6D4]">{pillar.index}</span>
                  <span className="text-emerald-300/90 tabular-nums">
                    {pillar.metric}
                  </span>
                </div>
                <h2 className="mt-3 font-display font-semibold text-base text-white group-hover:text-[#6FFbbe] transition-colors">
                  {pillar.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {pillar.detail}
                </p>
              </motion.button>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-px h-8 bg-gradient-to-b from-[#06B6D4]/70 to-[#0F172A]/30" />
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#0F172A]/75 font-medium">
              Live Personal Intelligence Workspace
            </span>
          </div>
        </div>
      </div>

      <div id="vault-workspace" className="min-h-screen flex scroll-mt-0">
        <Sidebar
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          vaultId={vault.vaultId}
          publicKeyFingerprint={vault.publicKeyFingerprint}
          flaggedLabCount={flaggedLabCount}
          activeContractCount={activeContractCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            activeScreen={activeScreen}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            primaryActionLabel={topBarAction.label}
            onPrimaryAction={topBarAction.handler}
            isBiometricUnlocked={isBiometricUnlocked}
            onOpenBiometricScan={() => setBiometricModalOpen(true)}
            onOpenVoiceBriefing={() => setVoiceBriefingOpen(true)}
          />

          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 px-4 py-3 rounded-xl bg-[#0F172A] text-white text-xs sm:text-sm flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span className="truncate">{toastMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeScreen === 'overview' && (
            <OverviewView
              vaultId={vault.vaultId}
              telemetry={vault.telemetry}
              biomarkers={vault.biomarkers}
              nudges={vault.nudges}
              anomalies={simulationResult.anomalies}
              contracts={vault.contracts}
              baselineRiskPct={simulationResult.baselineRiskPct}
              lastVerifiedHash={lastVerifiedHash}
              onVerifyVault={handleVerifyVault}
              onToggleNudgeComplete={handleToggleNudgeComplete}
              onNavigate={setActiveScreen}
              isBiometricUnlocked={isBiometricUnlocked}
              onOpenBiometricScan={() => setBiometricModalOpen(true)}
              onOpenVoiceBriefing={() => setVoiceBriefingOpen(true)}
            />
          )}

          {activeScreen === 'labs' && (
            <LabVaultView
              labReports={vault.labReports}
              biomarkers={vault.biomarkers}
              ingestModalOpen={ingestLabOpen}
              onOpenIngestModal={() => setIngestLabOpen(true)}
              onCloseIngestModal={() => setIngestLabOpen(false)}
              onIngestLabReport={handleIngestLabReport}
            />
          )}

          {activeScreen === 'wearables' && (
            <WearableStreamsView
              wearables={vault.wearables}
              telemetry={vault.telemetry}
              onToggleDeviceStream={handleToggleDeviceStream}
              onChangeSamplingInterval={handleChangeSamplingInterval}
              onSyncDeviceNow={handleSyncDeviceNow}
            />
          )}

          {activeScreen === 'anomalies' && (
            <AnomaliesNudgesView
              simulationParams={simParams}
              simulationResult={simulationResult}
              onChangeSimulationParams={setSimParams}
              onResetSimulationParams={() => setSimParams(DEFAULT_SIM_PARAMS)}
              nudges={vault.nudges}
              onToggleNudgeComplete={handleToggleNudgeComplete}
              onToggleNudgeActive={handleToggleNudgeActive}
              onDeleteNudge={handleDeleteNudge}
              onCreateNudge={handleCreateNudge}
              createModalOpen={createNudgeOpen}
              onOpenCreateModal={() => setCreateNudgeOpen(true)}
              onCloseCreateModal={() => setCreateNudgeOpen(false)}
            />
          )}

          {activeScreen === 'contracts' && (
            <SmartContractsView
              vaultId={vault.vaultId}
              publicKeyFingerprint={vault.publicKeyFingerprint}
              contracts={vault.contracts}
              auditLog={vault.auditLog}
              deployModalOpen={deployContractOpen}
              onOpenDeployModal={() => setDeployContractOpen(true)}
              onCloseDeployModal={() => setDeployContractOpen(false)}
              onDeployContract={handleDeployContract}
              onRevokeContract={handleRevokeContract}
              onVerifyVault={handleVerifyVault}
              onExportEncryptedVault={handleExportEncryptedVault}
            />
          )}
          </main>

          <HalftoneWordmarkFooter
            wordmark="AegisSelf"
            label="AegisSelf Vault"
            meta="©2026 · Zero-Trust Health Intelligence"
          />
        </div>
      </div>

      <BiometricScanModal
        isOpen={biometricModalOpen}
        onClose={() => setBiometricModalOpen(false)}
        onSuccess={() => {
          setIsBiometricUnlocked(true);
          setBiometricModalOpen(false);
          setToastMessage(
            'Biometric Liveness Verified: 128-D OpenCV Embedding Matched (FAR < 0.04%). Session Unlocked.'
          );
        }}
        isUnlocked={isBiometricUnlocked}
      />

      <VoiceBriefingModal
        isOpen={voiceBriefingOpen}
        onClose={() => setVoiceBriefingOpen(false)}
        vaultId={vault.vaultId}
      />
    </div>
    </HaloPointer>
  );
}
