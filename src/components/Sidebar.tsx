import React from 'react';
import {
  Activity,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { VaultScreen } from '../types/vault';

interface SidebarProps {
  activeScreen: VaultScreen;
  onSelectScreen: (screen: VaultScreen) => void;
  vaultId: string;
  publicKeyFingerprint: string;
  flaggedLabCount: number;
  activeContractCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: VaultScreen;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Vault Overview', icon: LayoutDashboard },
  { id: 'labs', label: 'Lab Records', icon: FileText },
  { id: 'wearables', label: 'Wearable Streams', icon: Activity },
  { id: 'anomalies', label: 'Anomalies & Nudges', icon: Sparkles },
  { id: 'contracts', label: 'Smart Contracts', icon: KeyRound },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onSelectScreen,
  vaultId,
  publicKeyFingerprint,
  flaggedLabCount,
  activeContractCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Wordmark */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectScreen('overview');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-[#0F172A] whitespace-nowrap">
            AegisSelf
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav
        className="flex-1 px-3 py-5 space-y-1 overflow-y-auto"
        aria-label="Vault navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          const countHint =
            item.id === 'labs' && flaggedLabCount > 0
              ? `${flaggedLabCount}`
              : item.id === 'contracts'
                ? `${activeContractCount}`
                : null;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onSelectScreen(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#0F172A] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#06B6D4]' : 'text-slate-400'
                  }`}
                />
                <span className="whitespace-nowrap truncate">{item.label}</span>
              </span>
              {countHint !== null && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {countHint}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Enclave Key Ownership Anchor */}
      <div className="p-4 border-t border-slate-200/80 bg-[#F8FAFC]">
        <div className="text-xs font-medium text-[#0F172A]">
          Local Cryptographic Enclave
        </div>
        <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums truncate">
          {vaultId}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Owner Key</span>
          <span className="font-mono text-[#006C49] font-medium">
            {publicKeyFingerprint.slice(0, 10)}…
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Vault mobile navigation"
        >
          <div
            className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
