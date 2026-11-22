import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Lock,
  Music2,
  Paintbrush,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react';
import {
  BOT_CHARACTER_ORDER,
  BOT_CHARACTERS,
  type BotCharacterId,
  type SavedPaintTheme
} from '../game/engine';
import { MAX_PROFILE_NAME_LENGTH } from '../game/profileStorage';
import { MAX_PROFILE_SLOTS, type RosterSlotSummary } from '../game/profileRoster';
import { SparkBotEmblem } from './Icons';

interface BotProfileModalProps {
  visible: boolean;
  profileName: string;
  activeCharacter: BotCharacterId;
  totalStars: number;
  totalBolts: number;
  savedThemes: SavedPaintTheme[];
  canOpenPaintBooth: boolean;
  rosterSlots?: RosterSlotSummary[];
  activeSlotId?: string;
  onRenameProfile: (nextName: string) => { ok: boolean; error: string | null };
  onSelectCharacter: (charId: BotCharacterId) => void;
  onSwitchSlot?: (slotId: string) => void;
  onCreateSlot?: (name: string, botCharacter: BotCharacterId) => { ok: boolean; error: string | null };
  onDeleteSlot?: (slotId: string) => { ok: boolean; error: string | null };
  onOpenPaintBooth?: () => void;
  onOpenParentView?: () => void;
  onClose: () => void;
}

export const BotProfileModal: React.FC<BotProfileModalProps> = ({
  visible,
  profileName,
  activeCharacter,
  totalStars,
  totalBolts,
  savedThemes,
  canOpenPaintBooth,
  rosterSlots = [],
  activeSlotId = 'slot_1',
  onRenameProfile,
  onSelectCharacter,
  onSwitchSlot,
  onCreateSlot,
  onDeleteSlot,
  onOpenPaintBooth,
  onOpenParentView,
  onClose
}) => {
  const [tab, setTab] = useState<'bot' | 'slots'>('bot');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profileName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [justRenamed, setJustRenamed] = useState(false);

  const [newCadetName, setNewCadetName] = useState('');
  const [newCadetBot, setNewCadetBot] = useState<BotCharacterId>('sparkbot');
  const [slotError, setSlotError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!visible) {
      setTab('bot');
      setEditingName(false);
      setRenameError(null);
      setJustRenamed(false);
      setNewCadetName('');
      setSlotError(null);
      return;
    }
    setDraftName(profileName);
  }, [visible, profileName]);

  useEffect(() => {
    if (!editingName) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingName]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingName) {
        setEditingName(false);
        setDraftName(profileName);
        setRenameError(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, editingName, profileName, onClose]);

  if (!visible) return null;

  const activeDef = BOT_CHARACTERS[activeCharacter];

  function startRename() {
    setDraftName(profileName);
    setRenameError(null);
    setJustRenamed(false);
    setEditingName(true);
  }

  function cancelRename() {
    setEditingName(false);
    setDraftName(profileName);
    setRenameError(null);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = onRenameProfile(draftName);
    if (!res.ok) {
      setRenameError(res.error || 'Please enter a valid profile name.');
      inputRef.current?.focus();
      return;
    }
    setEditingName(false);
    setRenameError(null);
    setJustRenamed(true);
    window.setTimeout(() => setJustRenamed(false), 1800);
  }

  function handleCreateCadet(e: React.FormEvent) {
    e.preventDefault();
    if (!onCreateSlot) return;
    const res = onCreateSlot(newCadetName, newCadetBot);
    if (!res.ok) {
      setSlotError(res.error || 'Could not create cadet slot.');
      return;
    }
    setNewCadetName('');
    setSlotError(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Bot Character Profile"
      onClick={onClose}
    >
      <div
        id="botProfileDialog"
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 shadow-2xl"
      >
        {/* Header with editable Academy Save Profile Name & active character summary */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-slate-800 shadow-lg sm:h-16 sm:w-16"
              style={{ borderColor: activeDef.accentCss }}
            >
              {activeDef.portraitUrl ? (
                <img
                  src={activeDef.portraitUrl}
                  alt={activeDef.name}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: activeDef.portraitPosition,
                    transform: `scale(${activeDef.portraitScale})`,
                    transformOrigin: activeDef.portraitOrigin
                  }}
                />
              ) : (
                <SparkBotEmblem className="h-11 w-11 sm:h-12 sm:w-12" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <form onSubmit={handleRenameSubmit} className="flex flex-col gap-1.5">
                  <label htmlFor="profileNameInput" className="sr-only">
                    Save Profile Name
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
                    <input
                      ref={inputRef}
                      id="profileNameInput"
                      type="text"
                      value={draftName}
                      maxLength={MAX_PROFILE_NAME_LENGTH}
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        if (renameError) setRenameError(null);
                      }}
                      placeholder="Enter your engineer name"
                      aria-invalid={renameError ? 'true' : 'false'}
                      aria-describedby={renameError ? 'profileNameError' : 'profileNameHint'}
                      className={`h-10 w-full min-w-0 rounded-xl border-2 bg-slate-900 px-3 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none sm:flex-1 ${
                        renameError
                          ? 'border-rose-400 focus:border-rose-300'
                          : 'border-sky-400/80 focus:border-sky-300'
                      }`}
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        id="saveProfileNameBtn"
                        type="submit"
                        className="flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-500 px-3 text-xs font-black text-slate-950 transition-transform hover:bg-emerald-400 active:scale-95"
                      >
                        <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                        <span>Save</span>
                      </button>
                      <button
                        id="cancelProfileNameBtn"
                        type="button"
                        onClick={cancelRename}
                        className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 transition-transform hover:border-slate-500 active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    {renameError ? (
                      <span id="profileNameError" role="alert" className="font-bold text-rose-300">
                        {renameError}
                      </span>
                    ) : (
                      <span id="profileNameHint" className="font-medium text-slate-400">
                        Personalize your Engineering Academy save profile
                      </span>
                    )}
                    <span className="tabular shrink-0 font-mono text-slate-400">
                      {draftName.trim().length}/{MAX_PROFILE_NAME_LENGTH}
                    </span>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2
                      id="profileDisplayName"
                      className="max-w-full truncate text-lg font-black text-white sm:text-xl"
                    >
                      {profileName}
                    </h2>
                    <button
                      id="renameProfileBtn"
                      type="button"
                      onClick={startRename}
                      aria-label={`Rename save profile ${profileName}`}
                      className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 text-xs font-bold text-sky-200 transition-colors hover:border-sky-400 hover:text-white active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Rename</span>
                    </button>
                    {justRenamed && (
                      <span
                        role="status"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                        <span>Saved</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-slate-300 sm:text-sm">
                    <span className="text-sky-200">{activeDef.name}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="truncate text-slate-400">{activeDef.title}</span>
                  </div>
                </>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                <span className="inline-flex items-center gap-1 text-amber-300 tabular">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {totalStars} Stars
                </span>
                <span className="inline-flex items-center gap-1 text-sky-300 tabular">
                  <Zap className="h-3.5 w-3.5 fill-sky-400 text-sky-400" />
                  {totalBolts} Bolts
                </span>
                <span className="inline-flex items-center gap-1 text-fuchsia-300 tabular">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                  {savedThemes.length} Saved {savedThemes.length === 1 ? 'Theme' : 'Themes'}
                </span>
              </div>
            </div>
          </div>

          <button
            id="closeProfileModalBtn"
            type="button"
            onClick={onClose}
            aria-label="Close Bot Profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:border-sky-400 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar + Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              id="profileTabBotBtn"
              type="button"
              onClick={() => setTab('bot')}
              className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-black transition-colors ${
                tab === 'bot' ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Companion Bot</span>
            </button>
            <button
              id="profileTabSlotsBtn"
              type="button"
              onClick={() => setTab('slots')}
              className={`flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-black transition-colors tabular-nums ${
                tab === 'slots' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Learner Slots ({Math.max(1, rosterSlots.length)}/{MAX_PROFILE_SLOTS})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenParentView && (
              <button
                id="profileOpenParentBtn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenParentView();
                }}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-600 bg-slate-800 px-3 text-xs font-black text-sky-200 hover:border-sky-400 active:scale-95"
              >
                <Lock className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                <span>Grown-Ups View</span>
              </button>
            )}
            {canOpenPaintBooth && onOpenPaintBooth && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaintBooth();
                }}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-fuchsia-400/70 bg-fuchsia-500/20 px-3 text-xs font-black text-fuchsia-200 hover:bg-fuchsia-500/30 active:scale-95"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span>Open Paint Booth</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="touch-pan-y overflow-y-auto p-4 sm:p-6">
          {tab === 'bot' ? (
            <>
              <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                Choose Your Profile Bot Character
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BOT_CHARACTER_ORDER.map((charId) => {
                  const def = BOT_CHARACTERS[charId];
                  const isSelected = activeCharacter === charId;
                  return (
                    <button
                      key={charId}
                      type="button"
                      data-character={charId}
                      aria-pressed={isSelected}
                      onClick={() => onSelectCharacter(charId)}
                      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-500/12 shadow-[0_0_22px_rgba(52,211,153,0.3)]'
                          : 'border-slate-700/90 bg-slate-800/80 hover:border-sky-400'
                      }`}
                    >
                      <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                        {def.portraitUrl ? (
                          <img
                            src={def.portraitUrl}
                            alt={`${def.name} character portrait`}
                            className="h-full w-full object-cover transition-transform duration-300"
                            style={{
                              objectPosition: def.portraitPosition,
                              transform: `scale(${def.portraitScale})`,
                              transformOrigin: def.portraitOrigin
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-amber-950/60">
                            <SparkBotEmblem className="h-24 w-24 transition-transform duration-300 group-hover:scale-110" />
                          </div>
                        )}

                        {isSelected && (
                          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-slate-950 shadow-lg">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                        )}

                        <div className="absolute bottom-2 left-2.5 flex items-center gap-1 rounded-lg bg-slate-950/80 px-1.5 py-1">
                          <span
                            className="h-3 w-3 rounded-full border border-white/40"
                            style={{ backgroundColor: def.defaultBodyHex }}
                          />
                          <span
                            className="h-3 w-3 rounded-full border border-white/40"
                            style={{ backgroundColor: def.defaultHeadHex }}
                          />
                          <span
                            className="h-3 w-3 rounded-full border border-white/40"
                            style={{ backgroundColor: def.defaultAccentHex }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-black text-white">{def.name}</span>
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: def.accentCss }}
                            />
                          </div>
                          <p className="mt-0.5 text-xs font-bold text-sky-300">{def.title}</p>
                        </div>
                        <div
                          className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/75 px-2.5 py-1.5"
                          aria-hidden="true"
                        >
                          <Music2 className="h-3.5 w-3.5 shrink-0" style={{ color: def.accentCss }} />
                          <div className="flex h-3.5 items-end gap-1">
                            {[0.45, 0.85, 0.65, 1, 0.55].map((bar, i) => (
                              <span
                                key={i}
                                className="w-1 rounded-full"
                                style={{
                                  height: `${Math.round(
                                    bar * (9 + Math.max(0, (def.voicePitch - 0.95) * 14))
                                  )}px`,
                                  backgroundColor: def.accentCss
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Offline Cadet Roster (Saved Locally)
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-400">
                  Switch learners on shared tablets or classroom Chromebooks without overwriting stars or badges.
                </p>
              </div>

              {/* Roster Grid */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {rosterSlots.map((slot) => {
                  const isCurrent = slot.id === activeSlotId;
                  const charDef = BOT_CHARACTERS[slot.botCharacter];
                  return (
                    <div
                      key={slot.id}
                      data-roster-slot={slot.id}
                      className={`flex items-center justify-between gap-2.5 rounded-2xl border-2 p-3 ${
                        isCurrent
                          ? 'border-emerald-300 bg-emerald-500/12'
                          : 'border-slate-700 bg-slate-800/75'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-900"
                          style={{ borderColor: charDef.accentCss }}
                        >
                          {charDef.portraitUrl ? (
                            <img
                              src={charDef.portraitUrl}
                              alt={charDef.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <SparkBotEmblem className="h-8 w-8" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-black text-white">
                              {slot.profileName}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase text-emerald-300">
                                <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                                Active
                              </span>
                            )}
                          </div>
                          <div className="tabular flex items-center gap-2 text-[11px] font-bold text-slate-300">
                            <span>Lvl {slot.unlockedLevel}</span>
                            <span className="text-amber-300">★ {slot.totalStars}</span>
                            <span className="text-sky-300">⚡ {slot.totalBolts}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {!isCurrent && onSwitchSlot && (
                          <button
                            type="button"
                            onClick={() => onSwitchSlot(slot.id)}
                            className="flex h-10 items-center whitespace-nowrap rounded-xl border border-sky-300 bg-sky-500 px-3 text-xs font-black text-slate-950 transition-transform hover:bg-sky-400 active:scale-95"
                          >
                            Switch
                          </button>
                        )}
                        {rosterSlots.length > 1 && onDeleteSlot && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = onDeleteSlot(slot.id);
                              if (!res.ok) setSlotError(res.error);
                              else setSlotError(null);
                            }}
                            aria-label={`Delete slot ${slot.profileName}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-400 hover:text-rose-300 active:scale-95"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* New Cadet Creator */}
              {onCreateSlot && rosterSlots.length < MAX_PROFILE_SLOTS && (
                <form
                  onSubmit={handleCreateCadet}
                  className="flex flex-col gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3.5"
                >
                  <div className="text-xs font-black uppercase tracking-wider text-sky-300">
                    Add New Learner Slot
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="newCadetNameInput"
                      type="text"
                      value={newCadetName}
                      maxLength={MAX_PROFILE_NAME_LENGTH}
                      onChange={(e) => {
                        setNewCadetName(e.target.value);
                        if (slotError) setSlotError(null);
                      }}
                      placeholder="Student or sibling name"
                      className="h-11 flex-1 rounded-xl border-2 border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                    <select
                      aria-label="Starter Bot Character"
                      value={newCadetBot}
                      onChange={(e) => setNewCadetBot(e.target.value as BotCharacterId)}
                      className="h-11 rounded-xl border-2 border-slate-700 bg-slate-900 px-3 text-xs font-black text-white focus:border-sky-400 focus:outline-none"
                    >
                      {BOT_CHARACTER_ORDER.map((cid) => (
                        <option key={cid} value={cid}>
                          {BOT_CHARACTERS[cid].name}
                        </option>
                      ))}
                    </select>
                    <button
                      id="createCadetSlotBtn"
                      type="submit"
                      className="flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-emerald-300 bg-emerald-500 px-4 text-xs font-black text-slate-950 transition-transform hover:bg-emerald-400 active:scale-95"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                      <span>New Cadet</span>
                    </button>
                  </div>
                  {slotError && (
                    <p role="alert" className="text-xs font-bold text-rose-300">
                      {slotError}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
