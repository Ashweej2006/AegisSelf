import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Lock,
  Plus,
  ScanLine,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { BiomarkerRecord, LabReport } from '../types/vault';
import {
  computeBiomarkerRangePosition,
  filterBiomarkers,
  formatShortHash,
  validateLabReportInput,
  type LabReportFormInput,
} from '../utils/healthIntelligence';

interface LabVaultViewProps {
  labReports: LabReport[];
  biomarkers: BiomarkerRecord[];
  ingestModalOpen: boolean;
  onOpenIngestModal: () => void;
  onCloseIngestModal: () => void;
  onIngestLabReport: (input: LabReportFormInput) => void;
}

const EMPTY_FORM: LabReportFormInput = {
  title: '',
  provider: '',
  collectedDate: '2026-11-23',
  biomarkerName: '',
  biomarkerCode: '',
  category: 'Inflammation',
  value: '',
  unit: '',
  refMin: '',
  refMax: '',
};

const SAMPLE_OCR_PRESETS: { label: string; data: LabReportFormInput }[] = [
  {
    label: 'Load Sample Paper Scan: hs-CRP Follow-Up',
    data: {
      title: 'Printed Inflammatory Follow-Up Slip',
      provider: 'Quest Diagnostics — Bay Area',
      collectedDate: '2026-11-23',
      biomarkerName: 'High-Sensitivity CRP (Retest)',
      biomarkerCode: 'hs-CRP',
      category: 'Inflammation',
      value: '2.8',
      unit: 'mg/L',
      refMin: '0.1',
      refMax: '1.0',
    },
  },
  {
    label: 'Load Sample PDF: Omega-3 Index Assay',
    data: {
      title: 'Cardiovascular Fatty Acid Panel PDF',
      provider: 'UCSF Preventive Cardiology Lab',
      collectedDate: '2026-11-22',
      biomarkerName: 'Omega-3 Index',
      biomarkerCode: 'OMG3',
      category: 'Cardiovascular',
      value: '8.4',
      unit: '%',
      refMin: '6.0',
      refMax: '12.0',
    },
  },
];

export const LabVaultView: React.FC<LabVaultViewProps> = ({
  labReports,
  biomarkers,
  ingestModalOpen,
  onOpenIngestModal,
  onCloseIngestModal,
  onIngestLabReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'optimal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedBiomarker, setSelectedBiomarker] = useState<BiomarkerRecord | null>(
    biomarkers[0] ?? null,
  );
  const prevCountRef = useRef(biomarkers.length);
  const [form, setForm] = useState<LabReportFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (biomarkers.length > prevCountRef.current && biomarkers[0]) {
      setSelectedBiomarker(biomarkers[0]);
    }
    prevCountRef.current = biomarkers.length;
  }, [biomarkers]);

  const filteredBiomarkers = useMemo(
    () => filterBiomarkers(biomarkers, searchQuery, statusFilter, categoryFilter),
    [biomarkers, searchQuery, statusFilter, categoryFilter],
  );

  const flaggedCount = biomarkers.filter((b) => b.status !== 'optimal').length;
  const avgOcrConfidence =
    labReports.reduce((acc, r) => acc + r.ocrConfidence, 0) /
    Math.max(labReports.length, 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateLabReportInput(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onIngestLabReport(form);
    setForm(EMPTY_FORM);
    setErrors({});
    onCloseIngestModal();
  };

  const statusMeta = (status: BiomarkerRecord['status']) => {
    switch (status) {
      case 'optimal':
        return { label: 'Optimal', cls: 'text-[#006C49]' };
      case 'borderline':
        return { label: 'Borderline', cls: 'text-[#D97706]' };
      case 'elevated':
        return { label: 'Elevated', cls: 'text-[#BA1A1A]' };
      case 'low':
        return { label: 'Below Range', cls: 'text-[#BA1A1A]' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Clinical Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Lab vault metrics">
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Encrypted Lab Reports</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
            {labReports.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">AES-256-GCM sealed</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Tracked Biomarkers</div>
          <div
            className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums"
            data-testid="biomarker-total-count"
          >
            {biomarkers.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Normalized clinical units</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Out-of-Range Flags</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#BA1A1A] tabular-nums">
            {flaggedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Correlated with wearables</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Local OCR Precision</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#006C49] tabular-nums">
            {avgOcrConfidence.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">Zero cloud document upload</div>
        </div>
      </section>

      {/* Biomarker Matrix + Provenance Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-8 vault-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 space-y-4">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0F172A]">
                Unified Biomarker Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Extracted from printed medical slips, PDF scans, and encrypted FHIR bundles
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter biomarker or lab..."
                  aria-label="Filter biomarker or lab"
                  className="vault-input pl-8 pr-3 py-1.5 text-xs rounded-lg w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by biomarker category"
                  className="vault-input px-2.5 py-1.5 text-xs rounded-lg text-[#0F172A] cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Inflammation">Inflammation</option>
                  <option value="Metabolic">Metabolic</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Endocrine">Endocrine</option>
                  <option value="Hematology">Hematology</option>
                </select>

                <div
                  className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80"
                  role="tablist"
                  aria-label="Biomarker status filter"
                >
                  {(
                    [
                      ['all', 'All'],
                      ['flagged', 'Flagged'],
                      ['optimal', 'Optimal'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        statusFilter === key
                          ? 'bg-white text-[#0F172A] shadow-xs'
                          : 'text-slate-600 hover:text-[#0F172A]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {filteredBiomarkers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">
                No biomarkers match the current filter criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('All');
                }}
                className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#0F172A] border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-[#F8FAFC] text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-5">Biomarker</th>
                    <th className="py-3 px-4 text-right">Reading</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Measured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBiomarkers.map((bm) => {
                    const meta = statusMeta(bm.status);
                    const rangePos = computeBiomarkerRangePosition(
                      bm.value,
                      bm.refMin,
                      bm.refMax,
                    );
                    const isSelected = selectedBiomarker?.id === bm.id;

                    return (
                      <tr
                        key={bm.id}
                        onClick={() => setSelectedBiomarker(bm)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#EFF4FF]/80' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-[#0F172A]">{bm.name}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {bm.code} · {bm.category}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-medium text-[#0F172A] tabular-nums">
                            {bm.value}
                          </span>{' '}
                          <span className="font-mono text-xs text-slate-500">{bm.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums mb-1">
                            <span>{bm.refMin}</span>
                            <span>{bm.refMax}</span>
                          </div>
                          <div className="relative h-1.5 bg-slate-200 rounded-full">
                            <div
                              className="absolute inset-y-0 bg-[#10B981]/30 rounded-full"
                              style={{ left: '20%', right: '20%' }}
                            />
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                bm.status === 'optimal'
                                  ? 'bg-[#10B981]'
                                  : bm.status === 'borderline'
                                    ? 'bg-[#D97706]'
                                    : 'bg-[#BA1A1A]'
                              }`}
                              style={{ left: `${rangePos}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-xs font-medium ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {bm.measuredDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Cryptographic Provenance Drawer */}
        <aside
          className="xl:col-span-4 vault-card rounded-2xl p-6 space-y-5"
          aria-label="Biomarker cryptographic provenance"
        >
          {selectedBiomarker ? (
            <>
              <div className="pb-4 border-b border-slate-200/80">
                <div className="text-xs font-mono text-slate-500">
                  Selected Biomarker Provenance
                </div>
                <h3 className="font-display font-semibold text-lg text-[#0F172A] mt-1">
                  {selectedBiomarker.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
                    {selectedBiomarker.value} {selectedBiomarker.unit}
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    prev: {selectedBiomarker.previousValue} {selectedBiomarker.unit}
                  </span>
                </div>
              </div>

              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Clinical Reference</dt>
                  <dd className="font-mono text-[#0F172A] tabular-nums">
                    {selectedBiomarker.refMin} – {selectedBiomarker.refMax} {selectedBiomarker.unit}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Issuing Laboratory</dt>
                  <dd className="font-medium text-[#0F172A] text-right">
                    {selectedBiomarker.sourceLab}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Local OCR Confidence</dt>
                  <dd className="font-mono text-[#006C49] tabular-nums">
                    {selectedBiomarker.ocrConfidence.toFixed(1)}%
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Cipher Suite</dt>
                  <dd className="font-mono text-[#0F172A]">AES-256-GCM</dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  Record SHA-256 Digest
                </div>
                <div className="mt-2 p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 break-all leading-relaxed">
                  {selectedBiomarker.hash}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Select a biomarker row to inspect its cryptographic proof and OCR source.
            </p>
          )}
        </aside>
      </div>

      {/* Encrypted Lab Reports Vault Shelf */}
      <section className="vault-card rounded-2xl p-6" aria-label="Encrypted lab reports">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Encrypted Analog &amp; Digital Lab Reports
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Printed clinic slips and PDF assays parsed locally and hashed into your enclave
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIngestModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Paper Scan
          </button>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {labReports.map((report) => (
            <div
              key={report.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#EFF4FF] text-[#0F172A] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-[#0090A9]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                    {report.title}
                  </h3>
                  <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{report.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span>{report.sourceFormat}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{report.collectedDate}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{report.notes}</p>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 shrink-0">
                <div className="text-xs font-mono tabular-nums text-[#0F172A]">
                  {report.biomarkerCount} biomarkers ·{' '}
                  <span className={report.flaggedCount > 0 ? 'text-[#BA1A1A]' : 'text-[#006C49]'}>
                    {report.flaggedCount} flagged
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <Lock className="w-3 h-3 text-[#10B981]" />
                  <span>{formatShortHash(report.sha256, 10, 6)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ingest Analog Lab Report Modal */}
      {ingestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ingest-lab-modal-title"
        >
          <div className="vault-modal rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2
                  id="ingest-lab-modal-title"
                  className="font-display font-semibold text-lg text-[#0F172A]"
                >
                  Ingest Analog Medical Lab Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extract biomarker readings locally and seal with a deterministic SHA-256 enclave proof.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseIngestModal}
                aria-label="Close ingest lab modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sample OCR Presets */}
            <div className="mt-4 p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
                <ScanLine className="w-3.5 h-3.5 text-[#06B6D4]" />
                Simulate Local Paper OCR Extraction
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SAMPLE_OCR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setForm(preset.data);
                      setErrors({});
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-white border border-slate-200 hover:border-[#06B6D4] rounded-lg transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lab-title" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Lab Report Title
                  </label>
                  <input
                    id="lab-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Quarterly Metabolic Panel"
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-provider" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Clinic / Issuing Lab
                  </label>
                  <input
                    id="lab-provider"
                    type="text"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    placeholder="e.g. Quest Diagnostics"
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  />
                  {errors.provider && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.provider}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="lab-date" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Collection Date
                  </label>
                  <input
                    id="lab-date"
                    type="date"
                    value={form.collectedDate}
                    onChange={(e) => setForm({ ...form, collectedDate: e.target.value })}
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  />
                  {errors.collectedDate && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.collectedDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-biomarker" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Biomarker Name
                  </label>
                  <input
                    id="lab-biomarker"
                    type="text"
                    value={form.biomarkerName}
                    onChange={(e) => setForm({ ...form, biomarkerName: e.target.value })}
                    placeholder="e.g. High-Sensitivity CRP"
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  />
                  {errors.biomarkerName && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.biomarkerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-category" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Clinical Category
                  </label>
                  <select
                    id="lab-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as BiomarkerRecord['category'],
                      })
                    }
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  >
                    <option value="Inflammation">Inflammation</option>
                    <option value="Metabolic">Metabolic</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Endocrine">Endocrine</option>
                    <option value="Hematology">Hematology</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="lab-value" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Measured Value
                  </label>
                  <input
                    id="lab-value"
                    type="number"
                    step="any"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="2.8"
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  />
                  {errors.value && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.value}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-unit" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Unit
                  </label>
                  <input
                    id="lab-unit"
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="mg/L"
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  />
                  {errors.unit && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.unit}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-refmin" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Ref Min
                  </label>
                  <input
                    id="lab-refmin"
                    type="number"
                    step="any"
                    value={form.refMin}
                    onChange={(e) => setForm({ ...form, refMin: e.target.value })}
                    placeholder="0.1"
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  />
                  {errors.refMin && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.refMin}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lab-refmax" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Ref Max
                  </label>
                  <input
                    id="lab-refmax"
                    type="number"
                    step="any"
                    value={form.refMax}
                    onChange={(e) => setForm({ ...form, refMax: e.target.value })}
                    placeholder="1.0"
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  />
                  {errors.refMax && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.refMax}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseIngestModal}
                  className="px-4 py-2 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg cursor-pointer"
                >
                  Encrypt &amp; Seal to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
