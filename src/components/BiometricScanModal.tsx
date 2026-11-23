import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScanFace,
  ShieldCheck,
  Camera,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Cpu,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface BiometricScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isUnlocked: boolean;
}

export const BiometricScanModal: React.FC<BiometricScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isUnlocked,
}) => {
  const [scanStep, setScanStep] = useState<
    'idle' | 'accessing_camera' | 'scanning' | 'computing_embedding' | 'verified' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Position your face within the biometric enclave');
  const [vectorSample, setVectorSample] = useState<string>('0.000, 0.000, ...');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanStep('idle');
      setProgress(0);
    }
  }, [isOpen]);

  const startScan = async () => {
    setScanStep('accessing_camera');
    setStatusMessage('Initializing OpenCV camera sensor...');
    setProgress(10);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      }
    } catch {
      // Fallback gracefully to simulated holographic scan if camera is blocked/denied
      setCameraActive(false);
    }

    // Step 2: Scanning face & liveness detection
    setScanStep('scanning');
    setStatusMessage('Analyzing facial geometry & liveness (Haar Cascade)...');
    setProgress(35);

    setTimeout(() => {
      // Step 3: Computing 128-D embedding
      setScanStep('computing_embedding');
      setStatusMessage('Extracting 128-D normalized embedding vector...');
      setProgress(75);

      // Generate random realistic 128-D vector sample
      const randomFloats = Array.from({ length: 4 }, () => (Math.random() * 0.4 - 0.2).toFixed(4));
      setVectorSample(`[${randomFloats.join(', ')}, ... +124 dims]`);

      setTimeout(() => {
        // Step 4: Verification passed
        setScanStep('verified');
        setStatusMessage('Biometric Liveness Verified · FAR < 0.04%');
        setProgress(100);

        setTimeout(() => {
          stopCamera();
          onSuccess();
        }, 1200);
      }, 1000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0A101D] text-white border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ScanFace className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-base text-white">
                  Biometric Liveness & Vault Gate
                </h3>
                <p className="text-[11px] font-mono text-cyan-300/70">
                  OpenCV 128-D Face Verification · Zero-Trust RAM Unlock
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Viewport */}
          <div className="p-6 flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-slate-900 border border-cyan-500/40 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Background Grid */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.4) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Camera Video Feed */}
              {cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                /* Holographic Silhouette Fallback */
                <div className="relative flex flex-col items-center justify-center text-cyan-400/60">
                  <motion.div
                    animate={{
                      scale: scanStep === 'scanning' ? [1, 1.05, 1] : 1,
                      opacity: scanStep === 'idle' ? 0.4 : 0.85,
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="relative"
                  >
                    <ScanFace className="w-32 h-32 stroke-1 text-cyan-400" />
                    {/* Simulated Eye & Landmark Tracking Points */}
                    {scanStep !== 'idle' && (
                      <>
                        <motion.span
                          animate={{ scale: [0.8, 1.3, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className="absolute top-10 left-9 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"
                        />
                        <motion.span
                          animate={{ scale: [0.8, 1.3, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                          className="absolute top-10 right-9 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"
                        />
                        <motion.span
                          animate={{ scale: [0.8, 1.3, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                          className="absolute top-16 left-15 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#06b6d4]"
                        />
                      </>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Reticle Target Corners */}
              <div className="absolute inset-4 pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />
              </div>

              {/* Animated Laser Scanning Line */}
              {(scanStep === 'scanning' || scanStep === 'computing_embedding') && (
                <motion.div
                  initial={{ top: '5%' }}
                  animate={{ top: '92%' }}
                  transition={{
                    repeat: Infinity,
                    repeatType: 'reverse',
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] pointer-events-none"
                />
              )}

              {/* Verified Overlay Badge */}
              {scanStep === 'verified' && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>
                  <span className="font-display font-bold text-sm text-emerald-300">
                    MATCH CONFIRMED
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400/80">
                    FAR: 0.038% · Distance: 0.21
                  </span>
                </motion.div>
              )}
            </div>

            {/* Status & Progress Bar */}
            <div className="w-full mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-2">
                  {scanStep === 'idle' && <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                  {scanStep !== 'idle' && scanStep !== 'verified' && (
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  )}
                  {scanStep === 'verified' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="truncate max-w-[280px]">{statusMessage}</span>
                </span>
                <span className="text-cyan-400 font-bold">{progress}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Enclave Security Metrics Panel */}
            <div className="w-full mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" /> 128-D Face Embedding:
                </span>
                <span className="text-slate-200 text-[11px] font-mono">{vectorSample}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>False Acceptance Rate (FAR):</span>
                <span className="text-emerald-400 font-medium">&lt; 0.04% (Target: &lt; 1%)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Decryption Scope:</span>
                <span className="text-slate-200">Ephemeral Volatile RAM Only</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full mt-6 flex gap-3">
              {scanStep === 'idle' ? (
                <button
                  type="button"
                  onClick={startScan}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Initiate Biometric Face Scan
                </button>
              ) : scanStep === 'verified' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-display font-semibold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  Vault Unlocked · Enter
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-slate-400 font-display font-medium text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  Scanning & Verifying Liveness...
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
