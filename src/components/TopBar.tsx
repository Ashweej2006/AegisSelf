import React from 'react';
import { Menu } from 'lucide-react';
import type { VaultScreen } from '../types/vault';

interface TopBarProps {
  activeScreen: VaultScreen;
  onOpenMobileMenu: () => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}

const SCREEN_TITLES: Record<VaultScreen, string> = {
  overview: 'Intelligence Overview',
  labs: 'Lab & Analog Records Vault',
  wearables: 'Wearable Telemetry Streams',
  anomalies: 'Anomaly Intelligence & Habit Nudges',
  contracts: 'Smart Contracts & Data Sovereignty',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeScreen,
  onOpenMobileMenu,
  primaryActionLabel,
  onPrimaryAction,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/88 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
            AegisSelf Vault
          </span>
          <span
            aria-hidden="true"
            className="text-slate-300 hidden sm:inline"
          >
            /
          </span>
          <h2 className="font-display font-semibold text-[#0F172A] text-base sm:text-lg tracking-tight truncate">
            {SCREEN_TITLES[activeScreen]}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
};
