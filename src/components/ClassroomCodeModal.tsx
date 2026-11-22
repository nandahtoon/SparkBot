import React, { useEffect, useMemo, useState } from 'react';
import { Check, Cpu, Gem, KeyRound, Play, Save, ShieldAlert, X, Zap } from 'lucide-react';
import type { SandboxMissionDraft } from '../game/engine';
import {
  decodeChallengeCode,
  encodeChallengeCode,
  SANDBOX_PRESETS,
  validateSandboxDraft
} from '../game/sandboxCodec';

interface ClassroomCodeModalProps {
  visible: boolean;
  onPlayDraft: (draft: SandboxMissionDraft) => void;
  onSaveToSandbox: (draft: SandboxMissionDraft) => void;
  onClose: () => void;
}

export const ClassroomCodeModal: React.FC<ClassroomCodeModalProps> = ({
  visible,
  onPlayDraft,
  onSaveToSandbox,
  onClose
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCodeInput('');
      setSavedNotice(false);
    }
  }, [visible]);

  const decoded = useMemo(() => {
    if (!codeInput.trim()) return null;
    return decodeChallengeCode(codeInput);
  }, [codeInput]);

  const validation = useMemo(() => {
    if (!decoded || !decoded.ok) return null;
    return validateSandboxDraft(decoded.draft);
  }, [decoded]);

  if (!visible) return null;

  const sampleCode = encodeChallengeCode(SANDBOX_PRESETS[0].draft);

  return (
    <div
      id="classroomCodeModal"
      role="dialog"
      aria-modal="true"
      aria-label="Classroom Challenge Code"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop touch-pan-y flex max-h-[92dvh] w-full max-w-lg flex-col gap-3.5 overflow-y-auto rounded-3xl border-2 border-cyan-400/75 bg-slate-900 p-4 text-slate-100 shadow-2xl sm:p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/70 bg-cyan-500/20 text-cyan-300">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Classroom Challenge Code</h2>
              <p className="text-xs font-medium text-slate-400">
                Load any teacher or classmate SB1 puzzle offline
              </p>
            </div>
          </div>

          <button
            id="closeClassCodeModalBtn"
            type="button"
            onClick={onClose}
            aria-label="Close Classroom Code Modal"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-slate-200 hover:border-cyan-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="classCodeInput" className="text-xs font-black uppercase tracking-wider text-slate-300">
              Paste Challenge Code
            </label>
            <button
              id="loadSampleClassCodeBtn"
              type="button"
              onClick={() => {
                setCodeInput(sampleCode);
                setSavedNotice(false);
              }}
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
            >
              Try Sample Code
            </button>
          </div>

          <textarea
            id="classCodeInput"
            rows={3}
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              setSavedNotice(false);
            }}
            placeholder="SB1-..."
            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-950 p-3 font-mono text-xs font-bold text-amber-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Live Decode & Verification Result */}
        {decoded && !decoded.ok && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-400/70 bg-rose-500/15 px-3.5 py-2.5 text-xs font-bold text-rose-200"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
            <span>{decoded.error}</span>
          </div>
        )}

        {decoded && decoded.ok && validation && (
          <div
            data-testid="class-code-preview"
            className="flex flex-col gap-2.5 rounded-2xl border-2 border-emerald-400/70 bg-slate-950/80 p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-white">{decoded.draft.name}</h3>
                <div className="tabular flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span>{decoded.draft.track.length} Tiles</span>
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Zap className="h-3.5 w-3.5" />
                    {decoded.draft.budget} pts
                  </span>
                  <span className="inline-flex items-center gap-1 text-cyan-300">
                    <Gem className="h-3.5 w-3.5" />
                    {decoded.draft.track.filter((t) => t.crystal).length} Crystals
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Cpu className="h-3.5 w-3.5" />
                    {validation.circuitTotalCores} Cores
                  </span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-emerald-300">
                <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                Verified
              </span>
            </div>

            {!validation.ok && (
              <div className="text-[11px] font-medium text-amber-200">
                Note: {validation.issues[0]}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                id="saveClassCodeToSandboxBtn"
                type="button"
                onClick={() => {
                  onSaveToSandbox(decoded.draft);
                  setSavedNotice(true);
                }}
                className="flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-slate-700 bg-slate-800 px-3.5 text-xs font-black text-sky-200 hover:border-sky-400 active:scale-95"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{savedNotice ? 'Saved!' : 'Save Copy'}</span>
              </button>
              <button
                id="playClassCodeBtn"
                type="button"
                onClick={() => onPlayDraft(decoded.draft)}
                className="flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 text-sm font-black text-slate-950 shadow-[0_4px_0_#047857] active:translate-y-0.5"
              >
                <Play className="h-5 w-5 fill-slate-950" aria-hidden="true" />
                <span>Play Challenge</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
