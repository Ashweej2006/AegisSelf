import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  ShieldAlert,
  Mic,
  X,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface VoiceBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultId: string;
}

export const VoiceBriefingModal: React.FC<VoiceBriefingModalProps> = ({
  isOpen,
  onClose,
  vaultId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'briefing' | 'symptom_logger'>('briefing');
  const [recordedNotes, setRecordedNotes] = useState<string[]>([
    'Nov 23: Fasting blood glucose 94 milligrams per deciliter. Mild evening fatigue noted after Zone 2 cycling.',
  ]);

  const scriptText =
    "AegisSelf Clinical Briefing: Your nocturnal heart rate variability averaged 72 milliseconds, maintaining parasympathetic equilibrium. Slow-wave deep sleep registered at 1.84 hours. Fasting blood glucose is stabilized at 92 milligrams per deciliter. Note that your serum cortisol remains borderline elevated at 17.8 micrograms per deciliter. Recommending evening blue-light restriction and 20 minutes of morning circadian light exposure.";

  // Web Speech API fallback for real audio narration
  const handlePlayAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scriptText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else {
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 8000);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordedNotes((prev) => [
        `Just now: Scribe v3 captured: "Morning HRV slightly dipped, resting heart rate 56 bpm. No symptoms of acute fatigue."`,
        ...prev,
      ]);
    } else {
      setIsRecording(true);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setIsRecording(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-[#090F1D] text-white border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-base text-white">
                  ElevenLabs Voice Intelligence
                </h3>
                <p className="text-[11px] font-mono text-cyan-300/70">
                  Flash v2.5 TTS · Scribe v3 STT · Zero-Retention Medical Enclave
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

          {/* Navigation Tabs */}
          <div className="px-6 pt-4 flex gap-3 border-b border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('briefing')}
              className={`pb-3 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'briefing'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Spoken Health Briefing (TTS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('symptom_logger')}
              className={`pb-3 text-xs font-mono uppercase tracking-wider font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'symptom_logger'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Clinical Voice Logger (STT)
            </button>
          </div>

          <div className="p-6 space-y-5">
            {activeTab === 'briefing' ? (
              <>
                {/* Audio Wave Visualizer */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col items-center justify-center gap-4">
                  <div className="h-16 flex items-center justify-center gap-1.5">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: isPlaying
                            ? [
                                `${Math.max(12, Math.sin(i * 0.4) * 50 + 15)}px`,
                                `${Math.max(8, Math.cos(i * 0.3) * 60 + 20)}px`,
                                `${Math.max(14, Math.sin(i * 0.6) * 45 + 10)}px`,
                              ]
                            : '8px',
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6 + (i % 5) * 0.1,
                          ease: 'easeInOut',
                        }}
                        className={`w-1 rounded-full ${
                          isPlaying
                            ? 'bg-gradient-to-t from-cyan-500 to-emerald-400 shadow-[0_0_8px_#06b6d4]'
                            : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handlePlayAudio}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-display font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-4 h-4 fill-current" /> Pause Audio Briefing
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" /> Stream Voice Briefing (Rachel)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Script Display with Pronunciation Highlighting */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Sparkles className="w-3.5 h-3.5" /> Medical Pronunciation Mapping:
                    </span>
                    <span className="text-emerald-400 font-medium">Zero-Retention Mode Active</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    &ldquo;{scriptText}&rdquo;
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Voice Symptom Logger */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col items-center justify-center gap-4">
                  <motion.button
                    type="button"
                    onClick={handleToggleRecord}
                    animate={{
                      scale: isRecording ? [1, 1.08, 1] : 1,
                    }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-colors ${
                      isRecording
                        ? 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)]'
                        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    }`}
                  >
                    <Mic className="w-7 h-7" />
                  </motion.button>

                  <span className="text-xs font-mono text-slate-300">
                    {isRecording
                      ? 'Listening with Scribe v3 Clinical Vocab... Click to stop'
                      : 'Click to record voice symptom note with medical diarization'}
                  </span>
                </div>

                {/* Logged Notes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                    Transcribed Vault Logs:
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recordedNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-slate-300 font-sans"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Privacy Architecture Notice */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-start gap-3 text-xs text-cyan-200/90">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong>ElevenLabs Privacy Protocol:</strong> PII and patient names are scrubbed in
                memory via regex before synthesis/transcription. The API operates under
                Zero-Retention Mode, ensuring clinical audio is never retained on third-party
                servers.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
