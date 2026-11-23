import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import type { VaultScreen } from '../../types/vault';

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init?: () => void;
    };
  }
}

export interface HeroAsciiProps {
  vaultId: string;
  latestHrvMs: number;
  latestDeepSleepHrs: number;
  latestGlucoseMgDl: number;
  biomarkerCount: number;
  flaggedLabCount: number;
  activeContractCount: number;
  baselineRiskPct: number;
  onEnterVault: (targetScreen?: VaultScreen) => void;
}

type TelemetryNodeId = 'hrv' | 'sleep' | 'labs' | 'contract';

interface TelemetryNode {
  id: TelemetryNodeId;
  label: string;
  shortLabel: string;
  value: string;
  detail: string;
  accent: string;
  xPct: number;
  yPct: number;
  targetScreen: VaultScreen;
}

const WAVEFORM_BARS = [0.45, 0.82, 0.6, 1.0, 0.52, 0.9, 0.68, 0.4];

export default function HeroAscii({
  vaultId,
  latestHrvMs,
  latestDeepSleepHrs,
  latestGlucoseMgDl,
  biomarkerCount,
  flaggedLabCount,
  activeContractCount,
  baselineRiskPct,
  onEnterVault,
}: HeroAsciiProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeNodeId, setActiveNodeId] = useState<TelemetryNodeId>('hrv');
  const [imgFailed, setImgFailed] = useState(false);

  const telemetryNodes: TelemetryNode[] = useMemo(
    () => [
      {
        id: 'hrv',
        label: 'Nocturnal HRV & Autonomic Tone',
        shortLabel: 'HRV',
        value: `${latestHrvMs} ms`,
        detail: `Oura Ring Gen 4 · 7d anomaly risk ${baselineRiskPct}%`,
        accent: '#06B6D4',
        xPct: 50,
        yPct: 43,
        targetScreen: 'wearables',
      },
      {
        id: 'sleep',
        label: 'Circadian Deep Sleep Floor',
        shortLabel: 'Sleep',
        value: `${latestDeepSleepHrs.toFixed(2)} hrs`,
        detail: 'Slow-wave architecture correlated with morning cortisol',
        accent: '#06B6D4',
        xPct: 50,
        yPct: 19,
        targetScreen: 'anomalies',
      },
      {
        id: 'labs',
        label: 'Analog Medical Lab Matrix',
        shortLabel: 'Labs',
        value: `${biomarkerCount} markers`,
        detail: `${flaggedLabCount} flagged · Local OCR + AES-256-GCM`,
        accent: '#10B981',
        xPct: 74,
        yPct: 55,
        targetScreen: 'labs',
      },
      {
        id: 'contract',
        label: 'Smart Contract Sovereignty',
        shortLabel: 'ZK Key',
        value: `${activeContractCount} active`,
        detail: `AegisZK L2 · Mean glucose ${latestGlucoseMgDl} mg/dL`,
        accent: '#10B981',
        xPct: 26,
        yPct: 68,
        targetScreen: 'contracts',
      },
    ],
    [
      latestHrvMs,
      latestDeepSleepHrs,
      latestGlucoseMgDl,
      biomarkerCount,
      flaggedLabCount,
      activeContractCount,
      baselineRiskPct,
    ],
  );

  const activeNode =
    telemetryNodes.find((n) => n.id === activeNodeId) ?? telemetryNodes[0];

  useEffect(() => {
    // Initialize UnicornStudio ambient Vitruvian motion layer when network & WebGL are available
    const style = document.createElement('style');
    style.setAttribute('data-aegis-us-style', 'true');
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    const isSoftwareWebGL = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl =
          probe.getContext('webgl2') ||
          probe.getContext('webgl') ||
          (probe.getContext('experimental-webgl') as WebGLRenderingContext | null);
        if (!gl) return true;
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = dbg
          ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
          : String(gl.getParameter(gl.RENDERER) || '');
        return /swiftshader|llvmpipe|software|angle.*swiftshader|microsoft basic/i.test(
          renderer,
        );
      } catch {
        return true;
      }
    })();

    let scriptEl: HTMLScriptElement | null = null;
    if (!prefersReducedMotion && !isSoftwareWebGL) {
      if (!window.UnicornStudio) {
        window.UnicornStudio = { isInitialized: false };
        scriptEl = document.createElement('script');
        scriptEl.src =
          'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js';
        scriptEl.async = true;
        scriptEl.onload = () => {
          try {
            if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
              window.UnicornStudio.init?.();
              window.UnicornStudio.isInitialized = true;
            }
          } catch {
            // Software WebGL / sandbox fallback handled cleanly by Vitruvian SVG+motion layer
          }
        };
        scriptEl.onerror = () => {
          // Graceful fallback without noisy errors
        };
        document.head.appendChild(scriptEl);
      } else if (window.UnicornStudio.init) {
        try {
          window.UnicornStudio.init();
        } catch {
          // Ignore re-init failure
        }
      }
    }

    const hideBranding = () => {
      const projectDiv = document.querySelector('[data-us-project]');
      if (!projectDiv) return;
      projectDiv.querySelectorAll('*').forEach((el) => {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes('made with') || text.includes('unicorn')) {
          el.remove();
        }
      });
    };

    hideBranding();
    const interval = window.setInterval(hideBranding, 400);
    const timeout1 = window.setTimeout(hideBranding, 1500);
    const timeout2 = window.setTimeout(hideBranding, 4000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout1);
      window.clearTimeout(timeout2);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, [prefersReducedMotion]);

  const navLinks: { label: string; screen: VaultScreen }[] = [
    { label: 'Overview', screen: 'overview' },
    { label: 'Lab Records', screen: 'labs' },
    { label: 'Wearables', screen: 'wearables' },
    { label: 'Anomalies', screen: 'anomalies' },
    { label: 'Smart Contracts', screen: 'contracts' },
  ];

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section
      id="hero"
      aria-label="AegisSelf Sovereign Biometrics Hero"
      className="relative min-h-[760px] lg:min-h-[880px] overflow-hidden bg-black text-white flex flex-col justify-between"
    >
      {/* UnicornStudio ASCII Vitruvian Motion Layer (Desktop, gracefully layered) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 w-full h-full hidden lg:block opacity-75 pointer-events-none"
      >
        <div
          data-us-project="whwOGlfJ5Rz2rHaEUgHl"
          style={{ width: '100%', height: '100%', minHeight: '100%' }}
        />
      </div>

      {/* Subtle Star / Dot-Matrix Backdrop across all viewports */}
      <div
        aria-hidden="true"
        className="absolute inset-0 w-full h-full stars-bg pointer-events-none"
      />

      {/* Ambient Telemetry Cyan / Emerald Atmospheric Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_72%_48%,rgba(6,182,212,0.11)_0%,rgba(16,185,129,0.04)_28%,rgba(0,0,0,0)_62%)]"
      />

      {/* Corner Frame Accents (signature geometric framing from hero-ascii) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/25 z-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/25 z-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 left-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 border-white/25 z-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 border-white/25 z-20"
      />

      {/* Top 3-Zone Architectural Header */}
      <header className="relative z-20 w-full border-b border-white/15 bg-black/45 backdrop-blur-sm">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#hero"
            className="inline-flex items-center gap-2.5 font-display font-bold text-lg lg:text-xl tracking-[0.06em] text-white whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span>AegisSelf</span>
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-xs font-mono tracking-wide text-slate-300"
            aria-label="Hero vault sections"
          >
            {navLinks.map((link) => (
              <button
                key={link.screen}
                type="button"
                onClick={() => onEnterVault(link.screen)}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b border-transparent hover:border-[#06B6D4]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onEnterVault('overview')}
              className="px-4 py-2 text-xs font-mono font-semibold text-black bg-white hover:bg-[#10B981] hover:text-white rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Vault
            </button>
          </div>
        </div>
      </header>

      {/* Centerpiece Asymmetric Hero Split */}
      <div className="relative z-10 flex-1 flex items-center py-12 lg:py-16">
        <div className="w-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Architectural Drafting Typography & Animated Controls */}
          <div className="lg:col-span-6 max-w-xl relative">
            {/* Top drafting index line */}
            <motion.div
              {...fadeUp(0.05)}
              className="flex items-center gap-3 mb-5 opacity-75"
            >
              <div className="w-8 h-px bg-white" />
              <span className="text-white text-[11px] font-mono tracking-[0.16em] tabular-nums">
                001
              </span>
              <div className="flex-1 h-px bg-white/40" />
              <span className="text-[11px] font-mono text-[#06B6D4] tracking-wider whitespace-nowrap">
                ZERO-TRUST ENCLAVE
              </span>
            </motion.div>

            {/* Title with signature dither-pattern vertical rail */}
            <motion.div {...fadeUp(0.12)} className="relative pl-4 sm:pl-5">
              <div
                aria-hidden="true"
                className="absolute left-0 top-1 bottom-1 w-1.5 dither-pattern opacity-60"
              />
              <h1 className="font-display font-bold text-white text-[clamp(2.35rem,4.6vw,4rem)] leading-[1.06] tracking-[-0.02em] text-balance">
                Sovereign
                <span className="block text-white/95 mt-1">Biometrics</span>
              </h1>
            </motion.div>

            {/* Animated 40-dot clinical divider */}
            <motion.div
              {...fadeUp(0.2)}
              aria-hidden="true"
              className="hidden sm:flex gap-1.5 mt-6 mb-5 opacity-45"
            >
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 h-0.5 rounded-full ${
                    i % 9 === 0 ? 'bg-[#06B6D4]' : 'bg-white'
                  }`}
                />
              ))}
            </motion.div>

            {/* Narrative Proposition with technical reticle accent */}
            <motion.div {...fadeUp(0.26)} className="relative mt-5 sm:mt-0">
              <p className="text-sm lg:text-[15px] text-slate-300 mb-7 leading-[1.7] font-mono">
                Where analog medical lab reports meet continuous wearable
                telemetry — unified inside an encrypted personal intelligence
                vault enforced by revocable smart contracts.
              </p>

              <div
                aria-hidden="true"
                className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-[#06B6D4]/50"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#06B6D4]" />
              </div>
            </motion.div>

            {/* Primary + Secondary Corner-Bracket CTA Pair */}
            <motion.div
              {...fadeUp(0.34)}
              className="flex flex-col sm:flex-row gap-3.5"
            >
              <button
                type="button"
                onClick={() => onEnterVault('overview')}
                className="relative inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-white text-black font-mono text-xs font-semibold tracking-[0.08em] uppercase border border-white hover:bg-[#10B981] hover:border-[#10B981] hover:text-white transition-all duration-200 group whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="hidden lg:block absolute -top-1.5 -left-1.5 w-2.5 h-2.5 border-t border-l border-[#06B6D4] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="hidden lg:block absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 border-b border-r border-[#06B6D4] opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>Enter Intelligence Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onEnterVault('contracts')}
                className="relative inline-flex items-center justify-center px-6 py-3 bg-transparent border border-white/55 text-white font-mono text-xs font-medium tracking-[0.08em] uppercase hover:bg-white hover:text-black hover:border-white transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inspect Smart Contracts
              </button>
            </motion.div>

            {/* Bottom technical notation */}
            <motion.div
              {...fadeUp(0.42)}
              className="flex items-center gap-3 mt-8 text-[10px] font-mono text-white/50"
            >
              <span aria-hidden="true" className="text-sm text-white/70">
                ∞
              </span>
              <div className="flex-1 h-px bg-white/20" />
              <span className="tracking-[0.12em] whitespace-nowrap">
                VITRUVIAN · {vaultId}
              </span>
            </motion.div>
          </div>

          {/* Right Column: Motion-Graphic Vitruvian Biometric Telemetry Blueprint */}
          <motion.div
            {...fadeUp(0.2)}
            className="lg:col-span-6 flex flex-col items-center lg:items-end justify-center"
          >
            <div className="relative w-full max-w-[420px] sm:max-w-[470px]">
              <div className="relative aspect-square w-full overflow-hidden">
                {/* Animated Rotating Orbital Telemetry Rings */}
                <motion.svg
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                  transition={{
                    duration: 90,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <circle
                    cx="200"
                    cy="200"
                    r="184"
                    fill="none"
                    stroke="rgba(6,182,212,0.22)"
                    strokeWidth="1"
                    strokeDasharray="2 8"
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="164"
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1"
                    strokeDasharray="16 10"
                  />
                </motion.svg>

                {/* Static Proportion Frame + Vertical Scanning Line */}
                <svg
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <rect
                    x="56"
                    y="78"
                    width="288"
                    height="288"
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="1"
                  />
                  <line
                    x1="200"
                    y1="14"
                    x2="200"
                    y2="386"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                  />
                  <line
                    x1="16"
                    y1="200"
                    x2="384"
                    y2="200"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                  />
                </svg>

                {/* Subtle Horizontal Biometric Scan Beam (compositor-only translateY) */}
                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#06B6D4]/70 to-transparent pointer-events-none z-10"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{
                      y: [40, 390, 40],
                      opacity: [0.15, 0.75, 0.15],
                    }}
                    transition={{
                      duration: 7.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Vitruvian Halftone Study blended cleanly into Obsidian Canvas */}
                {!imgFailed && (
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none select-none"
                    style={{
                      WebkitMaskImage:
                        'radial-gradient(circle at 50% 50%, black 56%, transparent 94%)',
                      maskImage:
                        'radial-gradient(circle at 50% 50%, black 56%, transparent 94%)',
                    }}
                  >
                    <img
                      src="/assets/aistudio/image_387a63ee.png"
                      alt="Vitruvian biometric geometry blueprint mapping human proportions to encrypted telemetry"
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="absolute max-w-none mix-blend-screen opacity-95 brightness-110 contrast-115"
                      style={{
                        width: '322%',
                        height: 'auto',
                        left: '-191%',
                        top: '-57%',
                      }}
                    />
                  </div>
                )}

                {/* Interactive Biometric Node Hotspots */}
                {telemetryNodes.map((node) => {
                  const isSelected = node.id === activeNode.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setActiveNodeId(node.id)}
                      onMouseEnter={() => setActiveNodeId(node.id)}
                      aria-label={`Inspect ${node.label}: ${node.value}`}
                      aria-pressed={isSelected}
                      style={{
                        left: `${node.xPct}%`,
                        top: `${node.yPct}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#06B6D4] rounded-full p-2 z-20"
                    >
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full border transition-transform ${
                          isSelected
                            ? 'scale-115 bg-black/90 border-[#06B6D4]'
                            : 'bg-black/70 border-white/40 group-hover:border-white'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: node.accent }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Focused Biometric Node Readout Card */}
              <div
                className="mt-3 border border-white/15 bg-white/[0.04] backdrop-blur-md px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                data-testid="hero-active-node-readout"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#06B6D4] uppercase tracking-wider">
                      {activeNode.shortLabel}
                    </span>
                    <span aria-hidden="true" className="text-white/25">
                      ·
                    </span>
                    <span className="text-white font-semibold tabular-nums">
                      {activeNode.value}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-300 leading-snug">
                    {activeNode.label} — {activeNode.detail}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEnterVault(activeNode.targetScreen)}
                  className="text-xs font-mono text-[#10B981] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left sm:text-right"
                >
                  Open Module →
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Telemetry Bar (echoes hero-ascii footer using real vault metrics + motion waveform) */}
      <div className="relative z-20 w-full border-t border-white/15 bg-black/50 backdrop-blur-sm">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-3 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-white/60">
          <div className="flex items-center gap-3 sm:gap-4 tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-white/80">
              <Lock className="w-3.5 h-3.5 text-[#10B981]" />
              <span>AES-256-GCM</span>
            </span>

            {/* Animated deterministic biometric waveform bars */}
            <div
              aria-hidden="true"
              className="hidden sm:flex items-end gap-1 h-3.5"
            >
              {WAVEFORM_BARS.map((heightRatio, idx) => (
                <motion.span
                  key={idx}
                  className="w-1 h-3.5 bg-[#06B6D4]/60 origin-bottom block"
                  initial={{ scaleY: heightRatio }}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scaleY: [
                            heightRatio,
                            Math.min(1, heightRatio + 0.35),
                            Math.max(0.25, heightRatio - 0.25),
                            heightRatio,
                          ],
                        }
                  }
                  transition={{
                    duration: 1.8 + idx * 0.15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            <span className="hidden md:inline">
              {biomarkerCount} Biomarkers Sealed
            </span>
          </div>

          <button
            type="button"
            onClick={() => onEnterVault('overview')}
            className="inline-flex items-center gap-1.5 text-white/85 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Enter Live Dashboard</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#06B6D4]" />
          </button>

          <div className="hidden sm:flex items-center gap-3 tabular-nums">
            <span>{activeContractCount} Active Contracts</span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span className="text-[#06B6D4]">HRV {latestHrvMs} ms</span>
          </div>
        </div>
      </div>
    </section>
  );
}
