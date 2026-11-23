import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import type {
  AccessSmartContract,
  BiomarkerRecord,
  DailyTelemetryPoint,
  HabitNudge,
  PredictedAnomaly,
  VaultScreen,
} from '../types/vault';
import {
  calculateHabitAdherence,
  formatShortHash,
} from '../utils/healthIntelligence';
import { SparklineRail } from './SparklineRail';
import { UnifiedTelemetryChart } from './UnifiedTelemetryChart';

interface OverviewViewProps {
  vaultId: string;
  telemetry: DailyTelemetryPoint[];
  biomarkers: BiomarkerRecord[];
  nudges: HabitNudge[];
  anomalies: PredictedAnomaly[];
  contracts: AccessSmartContract[];
  baselineRiskPct: number;
  lastVerifiedHash: string | null;
  onVerifyVault: () => void;
  onToggleNudgeComplete: (id: string) => void;
  onNavigate: (screen: VaultScreen) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  vaultId,
  telemetry,
  biomarkers,
  nudges,
  anomalies,
  contracts,
  baselineRiskPct,
  lastVerifiedHash,
  onVerifyVault,
  onToggleNudgeComplete,
  onNavigate,
}) => {
  const recent14 = telemetry.slice(-14);
  const latest = telemetry[telemetry.length - 1];
  const prev7 = telemetry[telemetry.length - 8] ?? telemetry[0];

  const hrvDelta = latest.hrvMs - prev7.hrvMs;
  const rhrDelta = latest.rhrBpm - prev7.rhrBpm;
  const sleepDelta = Number((latest.deepSleepHrs - prev7.deepSleepHrs).toFixed(2));
  const glucoseDelta = latest.glucoseMgDl - prev7.glucoseMgDl;

  const adherence = calculateHabitAdherence(nudges);
  const activeNudges = nudges.filter((n) => n.active);
  const activeContracts = contracts.filter((c) => c.status === 'Active');
  const flaggedLabs = biomarkers.filter((b) => b.status !== 'optimal');

  const enclaveCards = [
    {
      id: 'hrv',
      title: 'Nocturnal HRV',
      source: 'Oura Ring Gen 4',
      value: `${latest.hrvMs}`,
      unit: 'ms',
      deltaLabel: `${hrvDelta >= 0 ? '+' : ''}${hrvDelta} ms vs 7d ago`,
      statusText: latest.hrvMs >= 62 ? 'Baseline Equilibrium' : 'Parasympathetic Dip',
      statusTone: latest.hrvMs >= 62 ? 'text-[#006C49]' : 'text-[#D97706]',
      strokeColor: '#06B6D4',
      baselineMin: 64,
      baselineMax: 76,
      points: recent14.map((p) => ({ label: p.label, value: p.hrvMs })),
    },
    {
      id: 'rhr',
      title: 'Resting Heart Rate',
      source: 'Apple Watch Ultra 2',
      value: `${latest.rhrBpm}`,
      unit: 'bpm',
      deltaLabel: `${rhrDelta >= 0 ? '+' : ''}${rhrDelta} bpm vs 7d ago`,
      statusText: latest.rhrBpm <= 54 ? 'Optimal Floor' : 'Mild Strain',
      statusTone: latest.rhrBpm <= 54 ? 'text-[#006C49]' : 'text-[#D97706]',
      strokeColor: '#0F172A',
      baselineMin: 49,
      baselineMax: 53,
      points: recent14.map((p) => ({ label: p.label, value: p.rhrBpm })),
    },
    {
      id: 'sleep',
      title: 'Deep Sleep Architecture',
      source: 'Oura Ring Gen 4',
      value: latest.deepSleepHrs.toFixed(2),
      unit: 'hrs',
      deltaLabel: `${sleepDelta >= 0 ? '+' : ''}${sleepDelta} hrs vs 7d ago`,
      statusText: latest.deepSleepHrs >= 1.65 ? 'Restorative' : 'Compressed SWS',
      statusTone: latest.deepSleepHrs >= 1.65 ? 'text-[#006C49]' : 'text-[#D97706]',
      strokeColor: '#06B6D4',
      baselineMin: 1.65,
      baselineMax: 2.05,
      points: recent14.map((p) => ({ label: p.label, value: p.deepSleepHrs })),
    },
    {
      id: 'glucose',
      title: 'Mean Glucose',
      source: 'Dexcom Stelo CGM',
      value: `${latest.glucoseMgDl}`,
      unit: 'mg/dL',
      deltaLabel: `${glucoseDelta >= 0 ? '+' : ''}${glucoseDelta} mg/dL vs 7d ago`,
      statusText: latest.glucoseMgDl <= 98 ? 'Stable Metabolic' : 'Evening Excursion',
      statusTone: latest.glucoseMgDl <= 98 ? 'text-[#006C49]' : 'text-[#D97706]',
      strokeColor: '#10B981',
      baselineMin: 85,
      baselineMax: 96,
      points: recent14.map((p) => ({ label: p.label, value: p.glucoseMgDl })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Zero-Trust Seal Banner */}
      <section
        className="vault-frosted rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        aria-label="Zero-trust encryption seal"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2.5">
              <span className="font-display font-semibold text-sm text-[#0F172A]">
                Zero-Trust Personal Enclave Active
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                ·
              </span>
              <span className="font-mono text-xs text-[#006C49] font-medium">
                AES-256-GCM Local-First
              </span>
            </div>
            <div className="mt-1 sm:mt-0.5 text-xs text-slate-600 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-0.5 sm:gap-x-2">
              <span className="font-mono tabular-nums">{vaultId}</span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                ·
              </span>
              <span className="tabular-nums">
                {activeContracts.length} active smart contracts
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                ·
              </span>
              <span className="tabular-nums">
                {flaggedLabs.length} lab biomarkers flagged
              </span>
              {lastVerifiedHash && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline text-slate-300">
                    ·
                  </span>
                  <span className="font-mono text-[#006C49]">
                    Merkle SHA-256 verified ({formatShortHash(lastVerifiedHash, 6, 4)})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onVerifyVault}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          Verify Vault Integrity
        </button>
      </section>

      {/* 4-Column Biometric Telemetry Enclave Cards */}
      <section aria-label="Core biometric telemetry">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {enclaveCards.map((card) => (
            <article
              key={card.id}
              className="vault-card rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className="font-display font-semibold text-sm text-[#0F172A] truncate">
                  {card.title}
                </h2>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 truncate">{card.source}</span>
                  <span className={`font-medium whitespace-nowrap shrink-0 ${card.statusTone}`}>
                    {card.statusText}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-medium text-[#0F172A] tracking-tight tabular-nums">
                    {card.value}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {card.unit}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                  {card.deltaLabel}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <SparklineRail
                  points={card.points}
                  unit={card.unit}
                  strokeColor={card.strokeColor}
                  baselineMin={card.baselineMin}
                  baselineMax={card.baselineMax}
                  ariaLabel={`${card.title} 14-day sparkline`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Main Cross-Source Unified Telemetry Chart */}
      <UnifiedTelemetryChart telemetry={telemetry} />

      {/* Lower Split: Anomaly Forecasts + Today's Habit Nudge Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Predictive Anomaly Forecasts */}
        <section
          className="lg:col-span-7 vault-card rounded-2xl p-6 flex flex-col justify-between"
          aria-label="Active anomaly forecasts"
        >
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="font-display font-semibold text-base text-[#0F172A]">
                  Cross-Source Anomaly Forecasts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Unified 7-day risk index: {baselineRiskPct}% · Synthesized from analog labs &amp; wearables
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('anomalies')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0090A9] hover:text-[#0F172A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Simulator
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {anomalies.slice(0, 3).map((anomaly) => {
                const severityColor =
                  anomaly.severity === 'High'
                    ? 'text-[#BA1A1A]'
                    : anomaly.severity === 'Moderate'
                      ? 'text-[#D97706]'
                      : 'text-[#006C49]';

                return (
                  <div key={anomaly.id} className="py-4 first:pt-4 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className={`w-4 h-4 shrink-0 ${severityColor}`} />
                        <h3 className="font-display font-semibold text-sm text-[#0F172A] truncate">
                          {anomaly.title}
                        </h3>
                      </div>
                      <span
                        className={`font-mono text-xs font-medium whitespace-nowrap shrink-0 tabular-nums ${severityColor}`}
                      >
                        {anomaly.severity} · {anomaly.confidencePct}% conf
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      {anomaly.summary}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-500">
                      <span>Wearable: {anomaly.wearableSignal}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span>Lab: {anomaly.labCorrelate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              All anomaly inference executes locally inside your encrypted browser enclave.
            </span>
            <button
              type="button"
              onClick={() => onNavigate('labs')}
              className="text-xs font-medium text-[#0F172A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inspect Lab Records
            </button>
          </div>
        </section>

        {/* Today's Habit Nudge Queue */}
        <section
          className="lg:col-span-5 vault-card rounded-2xl p-6 flex flex-col justify-between"
          aria-label="Today's habit nudge queue"
        >
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="font-display font-semibold text-base text-[#0F172A]">
                  Today&apos;s Habit Nudges
                </h2>
                <p
                  className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums"
                  data-testid="nudge-adherence-summary"
                >
                  {adherence.completed} of {adherence.total} completed · {adherence.percentage}% adherence
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('anomalies')}
                className="text-xs font-medium text-[#0090A9] hover:text-[#0F172A] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Manage Rules
              </button>
            </div>

            {/* Adherence Bar */}
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] rounded-full transition-all duration-300"
                style={{ width: `${adherence.percentage}%` }}
              />
            </div>

            {activeNudges.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">
                  No active habit nudges scheduled today.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('anomalies')}
                  className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#0F172A] rounded-lg cursor-pointer"
                >
                  Create Habit Nudge
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 mt-3">
                {activeNudges.map((nudge) => (
                  <li key={nudge.id} className="py-3.5 first:pt-2 last:pb-1">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={nudge.completed}
                        aria-label={`Mark "${nudge.title}" as ${nudge.completed ? 'incomplete' : 'complete'}`}
                        onClick={() => onToggleNudgeComplete(nudge.id)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          nudge.completed
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'bg-white border-slate-300 hover:border-[#0F172A]'
                        }`}
                      >
                        {nudge.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`text-sm font-medium leading-snug ${
                              nudge.completed
                                ? 'line-through text-slate-400'
                                : 'text-[#0F172A]'
                            }`}
                          >
                            {nudge.title}
                          </span>
                          <span className="font-mono text-[11px] text-[#006C49] whitespace-nowrap shrink-0 tabular-nums">
                            -{nudge.impactDeltaPct}% risk
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {nudge.rationale}
                        </p>
                        <div className="mt-1.5 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{nudge.scheduledWindow}</span>
                          <span aria-hidden="true">·</span>
                          <span>{nudge.triggerSource}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
