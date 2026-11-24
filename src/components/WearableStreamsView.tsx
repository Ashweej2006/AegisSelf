import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BatteryCharging,
  KeyRound,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import type { DailyTelemetryPoint, WearableDevice } from '../types/vault';
import { computePearsonCorrelation } from '../utils/healthIntelligence';

interface WearableStreamsViewProps {
  wearables: WearableDevice[];
  telemetry: DailyTelemetryPoint[];
  onToggleDeviceStream: (deviceId: string) => void;
  onChangeSamplingInterval: (
    deviceId: string,
    interval: WearableDevice['samplingInterval'],
  ) => void;
  onSyncDeviceNow: (deviceId: string) => void;
}

export const WearableStreamsView: React.FC<WearableStreamsViewProps> = ({
  wearables,
  telemetry,
  onToggleDeviceStream,
  onChangeSamplingInterval,
  onSyncDeviceNow,
}) => {
  const streamingCount = wearables.filter((w) => w.status === 'streaming').length;
  const totalFramesToday = wearables.reduce((acc, w) => acc + w.readingsToday, 0);

  const hrvSeries = telemetry.map((p) => p.hrvMs);
  const sleepSeries = telemetry.map((p) => p.deepSleepHrs);
  const rhrSeries = telemetry.map((p) => p.rhrBpm);
  const glucoseSeries = telemetry.map((p) => p.glucoseMgDl);
  const anomalySeries = telemetry.map((p) => p.anomalyScore);

  const correlations = [
    {
      pair: 'Nocturnal HRV ↔ Deep Sleep Architecture',
      r: computePearsonCorrelation(hrvSeries, sleepSeries),
      insight:
        'Strong positive coupling: nights exceeding 1.75 hrs slow-wave sleep consistently lift next-morning HRV.',
    },
    {
      pair: 'Nocturnal HRV ↔ Resting Heart Rate',
      r: computePearsonCorrelation(hrvSeries, rhrSeries),
      insight:
        'Inverse autonomic balance: every +2 bpm RHR elevation corresponds to parasympathetic suppression.',
    },
    {
      pair: 'Interstitial Glucose ↔ Anomaly Risk Index',
      r: computePearsonCorrelation(glucoseSeries, anomalySeries),
      insight:
        'Elevated evening glucose tracks directly with next-day recovery strain and hs-CRP risk drift.',
    },
    {
      pair: 'Deep Sleep ↔ Interstitial Glucose',
      r: computePearsonCorrelation(sleepSeries, glucoseSeries),
      insight:
        'Compressed deep sleep correlates with higher morning glycemic baseline across your 30-day window.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline Overview Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Wearable pipeline summary">
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Active Biometric Streams</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
            {streamingCount} / {wearables.length}
          </div>
          <div className="mt-1 text-xs text-[#006C49]">Direct peer-to-enclave ingestion</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Encrypted Frames Today</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
            {totalFramesToday.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Zero third-party cloud relay</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Fusion Horizon</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
            {telemetry.length} days
          </div>
          <div className="mt-1 text-xs text-slate-500">Aligned with analog lab draws</div>
        </div>
      </section>

      {/* Connected Biometric Sensors */}
      <section aria-label="Connected wearable sensors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {wearables.map((device, idx) => {
            const isStreaming = device.status === 'streaming';
            return (
              <motion.article
                key={device.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="vault-card rounded-2xl p-6 flex flex-col justify-between gap-5 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display font-semibold text-base text-[#0F172A]">
                        {device.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {device.vendor} · {device.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-medium shrink-0">
                      {isStreaming ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                      <span className={isStreaming ? 'text-[#0090A9]' : 'text-slate-500'}>
                        {isStreaming ? 'Live Stream' : 'Paused'}
                      </span>
                    </div>
                  </div>

                  {/* Signals List */}
                  <div className="mt-4 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {device.signals.map((sig, idx) => (
                      <React.Fragment key={sig}>
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                        )}
                        <span>{sig}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Telemetry Specs */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-slate-400">Frames Today</div>
                      <div className="mt-1 font-mono font-medium text-[#0F172A] tabular-nums">
                        {device.readingsToday.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Battery</div>
                      <div className="mt-1 font-mono font-medium text-[#0F172A] tabular-nums flex items-center gap-1">
                        <BatteryCharging className="w-3.5 h-3.5 text-[#10B981]" />
                        {device.batteryPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Last Sync</div>
                      <div className="mt-1 font-mono text-[#0F172A] tabular-nums">
                        {device.lastSyncAt.split(' ')[1] ?? device.lastSyncAt}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>{device.encryptionKeyFingerprint}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Sampling interval"
                      value={device.samplingInterval}
                      onChange={(e) =>
                        onChangeSamplingInterval(
                          device.id,
                          e.target.value as WearableDevice['samplingInterval'],
                        )
                      }
                      className="vault-input px-2 py-1.5 text-xs font-mono rounded-lg cursor-pointer"
                    >
                      <option value="1 min">1 min</option>
                      <option value="5 min">5 min</option>
                      <option value="15 min">15 min</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onSyncDeviceNow(device.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#06B6D4]" />
                      Sync Now
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleDeviceStream(device.id)}
                      className={
                        isStreaming
                          ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer text-[#0F172A] bg-slate-100 hover:bg-slate-200"
                          : "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer text-white bg-[#0F172A] hover:bg-[#1E293B]"
                      }
                    >
                      {isStreaming ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Resume
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Live Cross-Source Sensor Fusion Correlation Matrix */}
      <section
        className="vault-card rounded-2xl p-6"
        aria-label="Cross-source sensor correlations"
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Cross-Source Sensor Fusion Correlations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Pearson r coefficients computed locally over your 30-day multi-device window
            </p>
          </div>
          <Activity className="w-4 h-4 text-[#06B6D4] shrink-0" />
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {correlations.map((row) => {
            const absR = Math.abs(row.r);
            const isPositive = row.r >= 0;
            return (
              <div
                key={row.pair}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="max-w-2xl">
                  <div className="font-medium text-sm text-[#0F172A]">{row.pair}</div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {row.insight}
                  </p>
                </div>

                <div className="w-full md:w-52 shrink-0">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5 tabular-nums">
                    <span className="text-slate-500">
                      {isPositive ? 'Direct' : 'Inverse'}
                    </span>
                    <span
                      className={
                        isPositive ? "font-semibold text-[#006C49]" : "font-semibold text-[#0090A9]"
                      }
                    >
                      {row.r > 0 ? `r = +${row.r.toFixed(2)}` : `r = ${row.r.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={
                        isPositive ? "h-full rounded-full bg-[#10B981]" : "h-full rounded-full bg-[#06B6D4]"
                      }
                      style={{ width: `${Math.max(8, Math.round(absR * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
