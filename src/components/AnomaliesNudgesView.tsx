import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type {
  HabitNudge,
  HabitSimulationParams,
} from '../types/vault';
import type { AnomalySimulationResult } from '../utils/healthIntelligence';

interface AnomaliesNudgesViewProps {
  simulationParams: HabitSimulationParams;
  simulationResult: AnomalySimulationResult;
  onChangeSimulationParams: (next: HabitSimulationParams) => void;
  onResetSimulationParams: () => void;
  nudges: HabitNudge[];
  onToggleNudgeComplete: (id: string) => void;
  onToggleNudgeActive: (id: string) => void;
  onDeleteNudge: (id: string) => void;
  onCreateNudge: (nudge: Omit<HabitNudge, 'id' | 'completed' | 'active'>) => void;
  createModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
}

export const AnomaliesNudgesView: React.FC<AnomaliesNudgesViewProps> = ({
  simulationParams,
  simulationResult,
  onChangeSimulationParams,
  onResetSimulationParams,
  nudges,
  onToggleNudgeComplete,
  onToggleNudgeActive,
  onDeleteNudge,
  onCreateNudge,
  createModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
}) => {
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [category, setCategory] = useState<HabitNudge['category']>('Recovery');
  const [triggerSource, setTriggerSource] = useState('Cross-Source Enclave');
  const [scheduledWindow, setScheduledWindow] = useState('Daily · 21:00');
  const [impactDeltaPct, setImpactDeltaPct] = useState('6');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || rationale.trim().length < 5) {
      setFormError('Provide a clear habit title and physiological rationale.');
      return;
    }
    const impact = Math.max(1, Math.min(25, Number(impactDeltaPct) || 5));
    onCreateNudge({
      title: title.trim(),
      rationale: rationale.trim(),
      category,
      triggerSource: triggerSource.trim() || 'Cross-Source Enclave',
      scheduledWindow: scheduledWindow.trim() || 'Daily',
      impactDeltaPct: impact,
    });
    setTitle('');
    setRationale('');
    setFormError(null);
    onCloseCreateModal();
  };

  return (
    <div className="space-y-6">
      {/* Interactive What-If Habit Impact Simulator */}
      <section
        className="vault-card rounded-2xl p-6"
        aria-label="What-if habit intervention simulator"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EFF4FF] text-[#0F172A] flex items-center justify-center shrink-0 mt-0.5">
              <SlidersHorizontal className="w-4 h-4 text-[#0090A9]" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base text-[#0F172A]">
                Predictive Habit Impact Simulator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust daily recovery protocols to model 7-day anomaly risk and autonomic equilibrium
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetSimulationParams}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-sleep" className="font-medium text-[#0F172A]">
                  Sleep Opportunity Target
                </label>
                <span className="font-mono font-medium text-[#0090A9] tabular-nums">
                  {simulationParams.sleepHoursTarget.toFixed(1)} hrs/night
                </span>
              </div>
              <input
                id="sim-sleep"
                type="range"
                min="6.0"
                max="9.5"
                step="0.1"
                value={simulationParams.sleepHoursTarget}
                onChange={(e) =>
                  onChangeSimulationParams({
                    ...simulationParams,
                    sleepHoursTarget: Number(e.target.value),
                  })
                }
                className="w-full accent-[#0F172A] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-zone2" className="font-medium text-[#0F172A]">
                  Weekly Zone-2 Aerobic Volume
                </label>
                <span className="font-mono font-medium text-[#0090A9] tabular-nums">
                  {simulationParams.zone2MinutesPerWeek} min/week
                </span>
              </div>
              <input
                id="sim-zone2"
                type="range"
                min="30"
                max="300"
                step="15"
                value={simulationParams.zone2MinutesPerWeek}
                onChange={(e) =>
                  onChangeSimulationParams({
                    ...simulationParams,
                    zone2MinutesPerWeek: Number(e.target.value),
                  })
                }
                className="w-full accent-[#0F172A] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-screen" className="font-medium text-[#0F172A]">
                  Pre-Sleep Blue Light Cutoff
                </label>
                <span className="font-mono font-medium text-[#0090A9] tabular-nums">
                  {simulationParams.eveningScreenCutoffMins} min before bed
                </span>
              </div>
              <input
                id="sim-screen"
                type="range"
                min="0"
                max="120"
                step="15"
                value={simulationParams.eveningScreenCutoffMins}
                onChange={(e) =>
                  onChangeSimulationParams({
                    ...simulationParams,
                    eveningScreenCutoffMins: Number(e.target.value),
                  })
                }
                className="w-full accent-[#0F172A] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-hydration" className="font-medium text-[#0F172A]">
                  Daily Electrolyte Hydration
                </label>
                <span className="font-mono font-medium text-[#0090A9] tabular-nums">
                  {simulationParams.hydrationLiters.toFixed(1)} L/day
                </span>
              </div>
              <input
                id="sim-hydration"
                type="range"
                min="1.0"
                max="4.0"
                step="0.2"
                value={simulationParams.hydrationLiters}
                onChange={(e) =>
                  onChangeSimulationParams({
                    ...simulationParams,
                    hydrationLiters: Number(e.target.value),
                  })
                }
                className="w-full accent-[#0F172A] cursor-pointer"
              />
            </div>
          </div>

          {/* Projected Clinical Outputs */}
          <div className="lg:col-span-5 bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-5 space-y-4">
            <div className="text-xs font-medium text-slate-500">
              Projected 7-Day Enclave Forecast
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Anomaly Risk</div>
                <div
                  className="mt-1 font-mono text-3xl font-medium text-[#0F172A] tabular-nums"
                  data-testid="projected-anomaly-risk"
                >
                  {simulationResult.projectedRiskPct}%
                </div>
                <div
                  className={`mt-1 font-mono text-xs tabular-nums ${
                    simulationResult.riskDeltaPct <= 0
                      ? 'text-[#006C49]'
                      : 'text-[#BA1A1A]'
                  }`}
                >
                  {simulationResult.riskDeltaPct > 0 ? '+' : ''}
                  {simulationResult.riskDeltaPct}% vs baseline ({simulationResult.baselineRiskPct}%)
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Recovery Equilibrium</div>
                <div
                  className="mt-1 font-mono text-3xl font-medium text-[#006C49] tabular-nums"
                  data-testid="projected-recovery-index"
                >
                  {simulationResult.projectedRecoveryIndex}
                  <span className="text-sm text-slate-400">/100</span>
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                  Est. HRV {simulationResult.projectedHrvMs} ms
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-slate-500 tabular-nums">
                <span>Low Strain (0%)</span>
                <span>Risk Index: {simulationResult.projectedRiskPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    simulationResult.projectedRiskPct <= 30
                      ? 'bg-[#10B981]'
                      : simulationResult.projectedRiskPct <= 55
                        ? 'bg-[#D97706]'
                        : 'bg-[#BA1A1A]'
                  }`}
                  style={{ width: `${simulationResult.projectedRiskPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Cross-Source Anomaly Diagnostics */}
      <section className="vault-card rounded-2xl p-6" aria-label="Detected anomaly signatures">
        <div className="pb-4 border-b border-slate-200/80">
          <h2 className="font-display font-semibold text-base text-[#0F172A]">
            Detected Cross-Source Anomaly Signatures
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthesized across printed lab biomarkers and multi-week wearable telemetry
          </p>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {simulationResult.anomalies.map((anomaly) => {
            const tone =
              anomaly.severity === 'High'
                ? 'text-[#BA1A1A]'
                : anomaly.severity === 'Moderate'
                  ? 'text-[#D97706]'
                  : 'text-[#006C49]';

            return (
              <article key={anomaly.id} className="py-5 first:pt-4 last:pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${tone}`} />
                    <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                      {anomaly.title}
                    </h3>
                  </div>
                  <div className={`font-mono text-xs font-medium tabular-nums ${tone}`}>
                    {anomaly.severity} Priority · {anomaly.horizonDays}-day window · {anomaly.confidencePct}% confidence
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {anomaly.summary}
                </p>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <div className="text-slate-400">Wearable Signal</div>
                    <div className="mt-0.5 font-mono text-[#0F172A]">
                      {anomaly.wearableSignal}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Analog Lab Correlate</div>
                    <div className="mt-0.5 font-mono text-[#0F172A]">
                      {anomaly.labCorrelate}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Recommended Intervention</div>
                    <div className="mt-0.5 text-[#006C49] font-medium">
                      {anomaly.recommendedAction}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Habit Nudge Rules Management */}
      <section className="vault-card rounded-2xl p-6" aria-label="Habit nudge rules">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Personalized Habit Nudge Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Actionable daily micro-interventions synced with your overview dashboard
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {nudges.map((nudge) => (
            <div
              key={nudge.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={nudge.completed}
                  aria-label={`Toggle completion for ${nudge.title}`}
                  onClick={() => onToggleNudgeComplete(nudge.id)}
                  className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                    nudge.completed
                      ? 'bg-[#10B981] border-[#10B981] text-white'
                      : 'bg-white border-slate-300 hover:border-[#0F172A]'
                  }`}
                >
                  {nudge.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`text-sm font-medium ${
                        nudge.completed ? 'line-through text-slate-400' : 'text-[#0F172A]'
                      }`}
                    >
                      {nudge.title}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono text-xs text-[#006C49] tabular-nums">
                      -{nudge.impactDeltaPct}% risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{nudge.rationale}</p>
                  <div className="mt-1 font-mono text-[11px] text-slate-400">
                    {nudge.category} · {nudge.scheduledWindow} · {nudge.triggerSource}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleNudgeActive(nudge.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    nudge.active
                      ? 'text-[#006C49] border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                      : 'text-slate-500 border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {nudge.active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  aria-label={`Delete habit nudge "${nudge.title}"`}
                  onClick={() => onDeleteNudge(nudge.id)}
                  className="p-2 text-slate-400 hover:text-[#BA1A1A] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Create Habit Nudge Modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-nudge-title"
        >
          <div className="vault-modal rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2
                  id="create-nudge-title"
                  className="font-display font-semibold text-lg text-[#0F172A]"
                >
                  Create Habit Nudge Rule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tie a personal recovery protocol to your telemetry and lab thresholds.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseCreateModal}
                aria-label="Close create nudge modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="nudge-title" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Protocol Title
                </label>
                <input
                  id="nudge-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10-min Morning Sunlight Exposure"
                  className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="nudge-rationale" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Clinical Rationale
                </label>
                <textarea
                  id="nudge-rationale"
                  rows={2}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="e.g. Anchors cortisol awakening response and advances melatonin onset."
                  className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="nudge-category" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Category
                  </label>
                  <select
                    id="nudge-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as HabitNudge['category'])
                    }
                    className="vault-input w-full px-2.5 py-2 text-sm rounded-lg"
                  >
                    <option value="Recovery">Recovery</option>
                    <option value="Circadian">Circadian</option>
                    <option value="Metabolic">Metabolic</option>
                    <option value="Cardio">Cardio</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="nudge-window" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Schedule
                  </label>
                  <input
                    id="nudge-window"
                    type="text"
                    value={scheduledWindow}
                    onChange={(e) => setScheduledWindow(e.target.value)}
                    className="vault-input w-full px-2.5 py-2 text-sm font-mono rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="nudge-impact" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Est. Risk Impact (%)
                  </label>
                  <input
                    id="nudge-impact"
                    type="number"
                    min="1"
                    max="25"
                    value={impactDeltaPct}
                    onChange={(e) => setImpactDeltaPct(e.target.value)}
                    className="vault-input w-full px-2.5 py-2 text-sm font-mono rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="nudge-trigger" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Trigger Data Source
                </label>
                <input
                  id="nudge-trigger"
                  type="text"
                  value={triggerSource}
                  onChange={(e) => setTriggerSource(e.target.value)}
                  className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                />
              </div>

              {formError && <p className="text-xs text-[#BA1A1A]">{formError}</p>}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-4 py-2 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg cursor-pointer"
                >
                  Save Habit Nudge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
