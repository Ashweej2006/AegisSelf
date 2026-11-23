import React from 'react';
import { Menu, ScanFace, Lock, Unlock, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import type { VaultScreen } from '../types/vault';

interface TopBarProps {
  activeScreen: VaultScreen;
  onOpenMobileMenu: () => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  isBiometricUnlocked?: boolean;
  onOpenBiometricScan?: () => void;
  onOpenVoiceBriefing?: () => void;
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
  isBiometricUnlocked = false,
  onOpenBiometricScan,
  onOpenVoiceBriefing,
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
          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
            /
          </span>
          <h2 className="font-display font-semibold text-[#0F172A] text-base sm:text-lg tracking-tight truncate">
            {SCREEN_TITLES[activeScreen]}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* ElevenLabs Voice AI Button */}
        {onOpenVoiceBriefing && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onOpenVoiceBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50/80 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80 text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-600 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Voice Briefing</span>
          </motion.button>
        )}

        {/* Biometric Scan Trigger Button */}
        {onOpenBiometricScan && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onOpenBiometricScan}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              isBiometricUnlocked
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
          >
            {isBiometricUnlocked ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <ScanFace className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">Vault Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden md:inline">Biometric Scan</span>
              </>
            )}
          </motion.button>
        )}

        {/* Screen Primary Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onPrimaryAction}
          className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          {primaryActionLabel}
        </motion.button>
      </div>
    </header>
  );
};
