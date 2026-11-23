import React, { useState } from 'react';
import {
  Check,
  Download,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';
import type {
  AccessSmartContract,
  AuditLogEntry,
  ContractScope,
} from '../types/vault';
import {
  formatShortHash,
  validateSmartContractInput,
} from '../utils/healthIntelligence';

interface SmartContractsViewProps {
  vaultId: string;
  publicKeyFingerprint: string;
  contracts: AccessSmartContract[];
  auditLog: AuditLogEntry[];
  deployModalOpen: boolean;
  onOpenDeployModal: () => void;
  onCloseDeployModal: () => void;
  onDeployContract: (payload: {
    granteeName: string;
    granteeRole: string;
    scopes: ContractScope[];
    zkProofOnly: boolean;
    durationDays: number;
    passphrase: string;
  }) => void;
  onRevokeContract: (contractId: string) => void;
  onVerifyVault: () => void;
  onExportEncryptedVault: () => void;
}

const ALL_SCOPES: ContractScope[] = [
  'Lab Biomarkers',
  'HRV & Recovery',
  'Sleep Architecture',
  'Glucose Telemetry',
  'Anomaly Forecasts',
];

export const SmartContractsView: React.FC<SmartContractsViewProps> = ({
  vaultId,
  publicKeyFingerprint,
  contracts,
  auditLog,
  deployModalOpen,
  onOpenDeployModal,
  onCloseDeployModal,
  onDeployContract,
  onRevokeContract,
  onVerifyVault,
  onExportEncryptedVault,
}) => {
  const [granteeName, setGranteeName] = useState('');
  const [granteeRole, setGranteeRole] = useState('');
  const [scopes, setScopes] = useState<ContractScope[]>(['Lab Biomarkers', 'HRV & Recovery']);
  const [zkProofOnly, setZkProofOnly] = useState(true);
  const [durationDays, setDurationDays] = useState(14);
  const [passphrase, setPassphrase] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeContracts = contracts.filter((c) => c.status === 'Active');
  const revokedContracts = contracts.filter((c) => c.status === 'Revoked');

  const toggleScope = (scope: ContractScope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleDeploySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSmartContractInput({
      granteeName,
      granteeRole,
      scopes,
      durationDays,
      passphrase,
    });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    onDeployContract({
      granteeName: granteeName.trim(),
      granteeRole: granteeRole.trim(),
      scopes,
      zkProofOnly,
      durationDays,
      passphrase,
    });

    setGranteeName('');
    setGranteeRole('');
    setScopes(['Lab Biomarkers', 'HRV & Recovery']);
    setZkProofOnly(true);
    setDurationDays(14);
    setPassphrase('');
    setErrors({});
    onCloseDeployModal();
  };

  return (
    <div className="space-y-6">
      {/* Cryptographic Ownership Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Smart contract ownership summary">
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Active Access Grants</div>
          <div
            className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums"
            data-testid="active-contracts-count"
          >
            {activeContracts.length}
          </div>
          <div className="mt-1 text-xs text-[#006C49]">Time-bounded &amp; revocable</div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="text-xs text-slate-500">Revoked Contracts</div>
          <div className="mt-2 font-mono text-2xl font-medium text-[#0F172A] tabular-nums">
            {revokedContracts.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Keys permanently invalidated</div>
        </div>
        <div className="vault-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Vault Sovereign Key</div>
            <div className="mt-2 font-mono text-sm font-medium text-[#0F172A] truncate">
              {publicKeyFingerprint}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onVerifyVault}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Verify Hashes
            </button>
            <button
              type="button"
              onClick={onExportEncryptedVault}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#06B6D4]" />
              Export JSON
            </button>
          </div>
        </div>
      </section>

      {/* Smart Contract Consent Table */}
      <section className="vault-card rounded-2xl overflow-hidden" aria-label="Smart contract access grants">
        <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Smart Contract Access Grants
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforce granular, revocable access to clinicians and research cohorts via AegisZK L2 smart contracts
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDeployModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Grant
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#F8FAFC] text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-6">Grantee &amp; Contract</th>
                <th className="py-3 px-4">Authorized Scopes</th>
                <th className="py-3 px-4">Proof Mode</th>
                <th className="py-3 px-4">Expiration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {contracts.map((contract) => {
                const isActive = contract.status === 'Active';
                return (
                  <tr key={contract.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-[#0F172A]">{contract.granteeName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {contract.granteeRole}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-slate-400">
                        {contract.contractAddress} · {contract.network}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs text-slate-600 max-w-xs leading-relaxed">
                        {contract.scopes.join(' · ')}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-[#0090A9]">
                        {contract.zkProofOnly ? 'ZK-Proof Only' : 'Scoped Decrypt'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {contract.expiresAt}
                      <div className="text-[11px] text-slate-400">
                        {contract.durationDays}d term
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium ${
                          isActive ? 'text-[#006C49]' : 'text-[#BA1A1A]'
                        }`}
                      >
                        {contract.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => onRevokeContract(contract.id)}
                          aria-label={`Revoke access for ${contract.granteeName}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#BA1A1A] border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          Revoke Access
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">
                          Key Burned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Immutable Cryptographic Audit Trail */}
      <section className="vault-card rounded-2xl p-6" aria-label="Immutable cryptographic audit log">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A]">
              Immutable Enclave Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only SHA-256 ledger for vault {vaultId}
            </p>
          </div>
          <Lock className="w-4 h-4 text-[#10B981] shrink-0" />
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {auditLog.map((entry) => (
            <div
              key={entry.id}
              className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                <span className="font-mono font-medium text-[#0F172A]">
                  {entry.action}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-700">{entry.subject}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-400">{entry.actor}</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                <span>{formatShortHash(entry.hash, 8, 6)}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>{entry.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Deploy New Smart Contract Modal */}
      {deployModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deploy-contract-title"
        >
          <div className="vault-modal rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2
                  id="deploy-contract-title"
                  className="font-display font-semibold text-lg text-[#0F172A]"
                >
                  Deploy Access Smart Contract
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mint a revocable cryptographic consent contract signed with your local enclave key.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseDeployModal}
                aria-label="Close deploy contract modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeploySubmit} className="mt-5 space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sc-grantee" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Recipient Name
                  </label>
                  <input
                    id="sc-grantee"
                    type="text"
                    value={granteeName}
                    onChange={(e) => setGranteeName(e.target.value)}
                    placeholder="e.g. Dr. Marcus Lin, MD"
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  />
                  {errors.granteeName && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.granteeName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="sc-role" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Clinical / Research Role
                  </label>
                  <input
                    id="sc-role"
                    type="text"
                    value={granteeRole}
                    onChange={(e) => setGranteeRole(e.target.value)}
                    placeholder="e.g. Endocrinology · Stanford Health"
                    className="vault-input w-full px-3 py-2 text-sm rounded-lg"
                  />
                  {errors.granteeRole && (
                    <p className="mt-1 text-xs text-[#BA1A1A]">{errors.granteeRole}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="block text-xs font-medium text-[#0F172A] mb-2">
                  Authorized Encrypted Scopes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_SCOPES.map((scope) => {
                    const checked = scopes.includes(scope);
                    return (
                      <button
                        key={scope}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleScope(scope)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#EFF4FF] border-[#06B6D4] text-[#0F172A]'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-[#0F172A] border-[#0F172A] text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </span>
                        <span>{scope}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.scopes && (
                  <p className="mt-1 text-xs text-[#BA1A1A]">{errors.scopes}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label htmlFor="sc-duration" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Contract Duration
                  </label>
                  <select
                    id="sc-duration"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="vault-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>

                <div className="pt-4 sm:pt-5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={zkProofOnly}
                    onClick={() => setZkProofOnly(!zkProofOnly)}
                    className="flex items-center gap-2.5 text-xs font-medium text-[#0F172A] cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        zkProofOnly
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {zkProofOnly && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                    <span>Zero-Knowledge Proof Mode (hide raw values)</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="sc-passphrase" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Vault Owner Signing Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="sc-passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter local vault passphrase (min 6 chars)"
                    className="vault-input w-full pl-9 pr-3 py-2 text-sm font-mono tracking-wider rounded-lg"
                  />
                </div>
                {errors.passphrase && (
                  <p className="mt-1 text-xs text-[#BA1A1A]">{errors.passphrase}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseDeployModal}
                  className="px-4 py-2 text-xs font-medium text-[#0F172A] border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#10B981] hover:bg-[#006C49] rounded-lg transition-colors cursor-pointer"
                >
                  Sign &amp; Deploy Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
