import {
  createDefaultPaintConfig,
  defaultSaveProfile,
  getDailyDateKey,
  normalizeBotCharacter,
  SAVE_KEY,
  syncMagbotPerks,
  type BotCharacterId,
  type SaveProfile
} from './engine';
import { getActiveDailyStreak } from './engine';
import {
  computeTotalStarsEarned,
  loadSaveProfile,
  normalizeProfileName,
  normalizeSaveProfileData,
  validateProfileName
} from './profileStorage';

export const ROSTER_KEY = 'sparkbot_roster_v1';
export const SLOT_STORAGE_PREFIX = 'sparkbot_slot_v1_';
export const MAX_PROFILE_SLOTS = 6;

export interface RosterSlotSummary {
  id: string;
  profileName: string;
  botCharacter: BotCharacterId;
  unlockedLevel: number;
  totalStars: number;
  totalBolts: number;
  streak: number;
  updatedAt: number;
}

export interface ProfileRosterState {
  version: 1;
  activeSlotId: string;
  slots: RosterSlotSummary[];
}

export type RosterStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): RosterStorageLike | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function buildRosterSlotSummary(
  id: string,
  save: SaveProfile,
  updatedAt = Date.now()
): RosterSlotSummary {
  return {
    id,
    profileName: normalizeProfileName(save.profileName),
    botCharacter: normalizeBotCharacter(save.botCharacter),
    unlockedLevel: Math.max(1, save.unlockedLevel || 1),
    totalStars: computeTotalStarsEarned(save),
    totalBolts: Math.max(0, save.totalBolts || 0),
    streak: getActiveDailyStreak(save.daily, getDailyDateKey()),
    updatedAt
  };
}

function readSlotSave(slotId: string, storage: RosterStorageLike): SaveProfile | null {
  try {
    const raw = storage.getItem(`${SLOT_STORAGE_PREFIX}${slotId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveProfile>;
    return normalizeSaveProfileData(parsed);
  } catch {
    return null;
  }
}

function writeSlotSave(slotId: string, save: SaveProfile, storage: RosterStorageLike): void {
  try {
    storage.setItem(`${SLOT_STORAGE_PREFIX}${slotId}`, JSON.stringify(save));
  } catch {
    // ignore storage quota errors
  }
}

function mirrorToPrimarySaveKey(save: SaveProfile, storage: RosterStorageLike): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    syncMagbotPerks(storage, save, getDailyDateKey());
  } catch {
    // ignore storage quota errors
  }
}

function writeRoster(roster: ProfileRosterState, storage: RosterStorageLike): void {
  try {
    storage.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {
    // ignore storage quota errors
  }
}

export function loadProfileRoster(
  storage: RosterStorageLike | null = defaultStorage()
): { roster: ProfileRosterState; activeSave: SaveProfile } {
  const fallbackSave = loadSaveProfile(storage);
  if (!storage) {
    return {
      roster: {
        version: 1,
        activeSlotId: 'slot_1',
        slots: [buildRosterSlotSummary('slot_1', fallbackSave)]
      },
      activeSave: fallbackSave
    };
  }

  try {
    const raw = storage.getItem(ROSTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProfileRosterState>;
      if (parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
        const cleanSlots: RosterSlotSummary[] = [];
        for (const s of parsed.slots.slice(0, MAX_PROFILE_SLOTS)) {
          if (!s || typeof s.id !== 'string' || !s.id.trim()) continue;
          const slotSave = readSlotSave(s.id, storage);
          if (slotSave) {
            cleanSlots.push(buildRosterSlotSummary(s.id, slotSave, s.updatedAt));
          } else {
            cleanSlots.push({
              id: s.id,
              profileName: normalizeProfileName(s.profileName),
              botCharacter: normalizeBotCharacter(s.botCharacter),
              unlockedLevel: Math.max(1, Number(s.unlockedLevel) || 1),
              totalStars: Math.max(0, Number(s.totalStars) || 0),
              totalBolts: Math.max(0, Number(s.totalBolts) || 0),
              streak: Math.max(0, Number(s.streak) || 0),
              updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now()
            });
          }
        }
        if (cleanSlots.length > 0) {
          const activeExists = cleanSlots.some((s) => s.id === parsed.activeSlotId);
          const activeSlotId = activeExists ? (parsed.activeSlotId as string) : cleanSlots[0].id;
          let activeSave = readSlotSave(activeSlotId, storage);
          if (!activeSave) {
            activeSave = fallbackSave;
            writeSlotSave(activeSlotId, activeSave, storage);
          }
          const roster: ProfileRosterState = {
            version: 1,
            activeSlotId,
            slots: cleanSlots.map((s) =>
              s.id === activeSlotId ? buildRosterSlotSummary(activeSlotId, activeSave!) : s
            )
          };
          mirrorToPrimarySaveKey(activeSave, storage);
          writeRoster(roster, storage);
          return { roster, activeSave };
        }
      }
    }
  } catch {
    // Fall through to legacy migration
  }

  // First launch or migration from legacy single-slot SAVE_KEY -> slot_1
  const initialSummary = buildRosterSlotSummary('slot_1', fallbackSave);
  const migrated: ProfileRosterState = {
    version: 1,
    activeSlotId: 'slot_1',
    slots: [initialSummary]
  };
  writeSlotSave('slot_1', fallbackSave, storage);
  mirrorToPrimarySaveKey(fallbackSave, storage);
  writeRoster(migrated, storage);
  return { roster: migrated, activeSave: fallbackSave };
}

export function saveActiveRosterProfile(
  save: SaveProfile,
  storage: RosterStorageLike | null = defaultStorage()
): ProfileRosterState {
  if (!storage) {
    return {
      version: 1,
      activeSlotId: 'slot_1',
      slots: [buildRosterSlotSummary('slot_1', save)]
    };
  }
  const { roster } = loadProfileRoster(storage);
  const activeId = roster.activeSlotId || roster.slots[0]?.id || 'slot_1';
  writeSlotSave(activeId, save, storage);
  mirrorToPrimarySaveKey(save, storage);
  const updatedSummary = buildRosterSlotSummary(activeId, save);
  const nextSlots = roster.slots.some((s) => s.id === activeId)
    ? roster.slots.map((s) => (s.id === activeId ? updatedSummary : s))
    : [...roster.slots, updatedSummary];
  const nextRoster: ProfileRosterState = {
    version: 1,
    activeSlotId: activeId,
    slots: nextSlots
  };
  writeRoster(nextRoster, storage);
  return nextRoster;
}

export function switchRosterSlot(
  slotId: string,
  storage: RosterStorageLike | null = defaultStorage()
): { ok: boolean; roster: ProfileRosterState; save: SaveProfile; error: string | null } {
  if (!storage) {
    const fallback = defaultSaveProfile();
    return {
      ok: false,
      roster: {
        version: 1,
        activeSlotId: 'slot_1',
        slots: [buildRosterSlotSummary('slot_1', fallback)]
      },
      save: fallback,
      error: 'Storage unavailable.'
    };
  }
  const loaded = loadProfileRoster(storage);
  const target = loaded.roster.slots.find((s) => s.id === slotId);
  if (!target) {
    return { ok: false, roster: loaded.roster, save: loaded.activeSave, error: 'Profile slot not found.' };
  }
  const targetSave = readSlotSave(slotId, storage) || defaultSaveProfile();
  mirrorToPrimarySaveKey(targetSave, storage);
  const nextRoster: ProfileRosterState = {
    version: 1,
    activeSlotId: slotId,
    slots: loaded.roster.slots.map((s) =>
      s.id === slotId ? buildRosterSlotSummary(slotId, targetSave) : s
    )
  };
  writeRoster(nextRoster, storage);
  return { ok: true, roster: nextRoster, save: targetSave, error: null };
}

export function createRosterSlot(
  profileName: string,
  botCharacter: BotCharacterId = 'sparkbot',
  storage: RosterStorageLike | null = defaultStorage()
): { ok: boolean; roster: ProfileRosterState; save: SaveProfile; error: string | null } {
  const check = validateProfileName(profileName);
  if (!storage) {
    const base = defaultSaveProfile();
    return {
      ok: false,
      roster: { version: 1, activeSlotId: 'slot_1', slots: [buildRosterSlotSummary('slot_1', base)] },
      save: base,
      error: 'Storage unavailable.'
    };
  }
  const loaded = loadProfileRoster(storage);
  if (!check.valid) {
    return { ok: false, roster: loaded.roster, save: loaded.activeSave, error: check.error };
  }
  if (loaded.roster.slots.length >= MAX_PROFILE_SLOTS) {
    return {
      ok: false,
      roster: loaded.roster,
      save: loaded.activeSave,
      error: `Up to ${MAX_PROFILE_SLOTS} cadet slots can be stored on this device.`
    };
  }

  let suffix = loaded.roster.slots.length + 1;
  while (loaded.roster.slots.some((s) => s.id === `slot_${suffix}`)) {
    suffix++;
  }
  const newId = `slot_${suffix}_${Date.now().toString(36).slice(-4)}`;
  const charId = normalizeBotCharacter(botCharacter);
  const freshSave: SaveProfile = {
    ...defaultSaveProfile(),
    profileName: check.normalized,
    botCharacter: charId,
    paintBooth: createDefaultPaintConfig('amber', charId)
  };

  writeSlotSave(newId, freshSave, storage);
  mirrorToPrimarySaveKey(freshSave, storage);
  const nextRoster: ProfileRosterState = {
    version: 1,
    activeSlotId: newId,
    slots: [...loaded.roster.slots, buildRosterSlotSummary(newId, freshSave)]
  };
  writeRoster(nextRoster, storage);
  return { ok: true, roster: nextRoster, save: freshSave, error: null };
}

export function deleteRosterSlot(
  slotId: string,
  storage: RosterStorageLike | null = defaultStorage()
): { ok: boolean; roster: ProfileRosterState; save: SaveProfile; error: string | null } {
  if (!storage) {
    const base = defaultSaveProfile();
    return {
      ok: false,
      roster: { version: 1, activeSlotId: 'slot_1', slots: [buildRosterSlotSummary('slot_1', base)] },
      save: base,
      error: 'Storage unavailable.'
    };
  }
  const loaded = loadProfileRoster(storage);
  if (loaded.roster.slots.length <= 1) {
    return {
      ok: false,
      roster: loaded.roster,
      save: loaded.activeSave,
      error: 'Keep at least 1 cadet profile slot.'
    };
  }
  const remaining = loaded.roster.slots.filter((s) => s.id !== slotId);
  if (remaining.length === loaded.roster.slots.length) {
    return {
      ok: false,
      roster: loaded.roster,
      save: loaded.activeSave,
      error: 'Profile slot not found.'
    };
  }

  try {
    storage.removeItem(`${SLOT_STORAGE_PREFIX}${slotId}`);
  } catch {
    // ignore remove errors
  }

  const nextActiveId =
    loaded.roster.activeSlotId === slotId ? remaining[0].id : loaded.roster.activeSlotId;
  const nextSave =
    nextActiveId === loaded.roster.activeSlotId
      ? loaded.activeSave
      : readSlotSave(nextActiveId, storage) || defaultSaveProfile();

  mirrorToPrimarySaveKey(nextSave, storage);
  const nextRoster: ProfileRosterState = {
    version: 1,
    activeSlotId: nextActiveId,
    slots: remaining
  };
  writeRoster(nextRoster, storage);
  return { ok: true, roster: nextRoster, save: nextSave, error: null };
}
