import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Bug,
  Check,
  Crown,
  Eye,
  Gift,
  Lock,
  ShoppingBag,
  Sparkles,
  Target,
  X,
  Zap
} from 'lucide-react';
import {
  canBuyShopItem,
  evaluateMasteryQuests,
  SHOP_CATALOG,
  type AccessoryId,
  type DroneId,
  type PlayerLoadout,
  type QuestProgressCounters,
  type ShopCategory,
  type ShopItemDef,
  type TrailId
} from '../game/shopAndQuests';
import { SFX } from '../game/audio';
import { QuestGoalArt, ShopItemArt } from './KidVisualArt';

interface BoltShopModalProps {
  visible: boolean;
  totalBolts: number;
  loadout: PlayerLoadout;
  onBuyItem: (itemId: string) => void;
  onToggleEquip: (itemId: string) => void;
  onPreviewLoadout: (preview: PlayerLoadout | null) => void;
  onOpenQuests: () => void;
  onClose: () => void;
}

const SHOP_TABS: Array<{ id: ShopCategory; label: string; icon: React.ReactNode }> = [
  { id: 'drone', label: 'Drones', icon: <Bot className="h-5 w-5" aria-hidden="true" /> },
  { id: 'accessory', label: 'Gear', icon: <Crown className="h-5 w-5" aria-hidden="true" /> },
  { id: 'trail', label: 'Trails', icon: <Sparkles className="h-5 w-5" aria-hidden="true" /> }
];

export const BoltShopModal: React.FC<BoltShopModalProps> = ({
  visible,
  totalBolts,
  loadout,
  onBuyItem,
  onToggleEquip,
  onPreviewLoadout,
  onOpenQuests,
  onClose
}) => {
  const [category, setCategory] = useState<ShopCategory>('drone');
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPreviewItemId(null);
      onPreviewLoadout(null);
    }
  }, [visible, onPreviewLoadout]);

  const items = useMemo(
    () => SHOP_CATALOG.filter((item) => item.category === category),
    [category]
  );

  if (!visible) return null;

  const handleSelectPreview = (item: ShopItemDef) => {
    SFX.uiTick();
    setPreviewItemId(item.id);
    const previewLoadout: PlayerLoadout = {
      ownedIds: Array.from(new Set([...loadout.ownedIds, item.id])),
      equippedDroneId:
        item.category === 'drone' ? (item.id as DroneId) : loadout.equippedDroneId,
      equippedAccessoryId:
        item.category === 'accessory' ? (item.id as AccessoryId) : loadout.equippedAccessoryId,
      equippedTrailId:
        item.category === 'trail' ? (item.id as TrailId) : loadout.equippedTrailId
    };
    onPreviewLoadout(previewLoadout);
  };

  const handleClose = () => {
    setPreviewItemId(null);
    onPreviewLoadout(null);
    onClose();
  };

  return (
    <div
      id="boltShopModal"
      role="dialog"
      aria-modal="true"
      aria-label="Bolt Upgrade Shop"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-end p-2.5 sm:flex-row sm:items-center sm:justify-end sm:p-4"
    >
      {/* Keep top/left 3D Workshop Robot & Drone unobstructed for live 3D try-on */}
      <div className="pointer-events-auto anim-pop flex max-h-[58dvh] w-full flex-col overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-slate-950/95 text-slate-100 shadow-2xl sm:max-h-[86dvh] sm:max-w-md">
        {/* Clean Commercial Icon-First Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300/80 bg-amber-400/20 text-amber-300">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-black tracking-tight text-white">Shop</h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              data-testid="shop-bolt-balance"
              aria-label={`${totalBolts} Bolts`}
              className="tabular flex h-10 items-center gap-1 rounded-xl border-2 border-amber-400/70 bg-amber-500/15 px-3 text-sm font-black text-amber-200"
            >
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
              <span>{totalBolts}</span>
            </div>
            <button
              id="closeBoltShopBtn"
              type="button"
              onClick={handleClose}
              aria-label="Close Shop"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-300 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Big Tactile Icon Category Tabs */}
        <div
          role="tablist"
          aria-label="Shop Categories"
          className="grid grid-cols-3 gap-1.5 border-b border-slate-800 bg-slate-900/95 px-3 py-2"
        >
          {SHOP_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-shop-tab={tab.id}
                onClick={() => {
                  SFX.uiTick();
                  setCategory(tab.id);
                }}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 ${
                  active
                    ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-[0_3px_0_#b45309]'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Visual Toy-Box Showcase Grid (Zero Sentences!) */}
        <div className="touch-pan-y grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto p-3.5">
          {items.map((item) => {
            const owned = loadout.ownedIds.includes(item.id);
            const equipped =
              (item.category === 'drone' && loadout.equippedDroneId === item.id) ||
              (item.category === 'accessory' && loadout.equippedAccessoryId === item.id) ||
              (item.category === 'trail' && loadout.equippedTrailId === item.id);
            const buyCheck = canBuyShopItem(loadout, totalBolts, item.id);
            const isPreviewing = previewItemId === item.id;

            return (
              <div
                key={item.id}
                data-shop-item={item.id}
                onClick={() => handleSelectPreview(item)}
                className={`relative flex cursor-pointer flex-col items-center justify-between gap-2 rounded-2xl border-2 p-2.5 text-center transition-all ${
                  equipped
                    ? 'border-emerald-400 bg-emerald-950/35 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                    : isPreviewing
                      ? 'border-sky-400 bg-slate-900 shadow-[0_0_16px_rgba(56,189,248,0.2)]'
                      : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
                }`}
              >
                {/* Live 3D Try-On / Equipped Corner Marker */}
                {equipped ? (
                  <span
                    aria-label="Equipped"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                ) : isPreviewing ? (
                  <span
                    aria-label="Previewing in 3D"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-400 text-slate-950 shadow"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </span>
                ) : null}

                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-950/80"
                  style={{ boxShadow: `0 0 20px ${item.primaryHex}26` }}
                >
                  <ShopItemArt item={item} className="h-14 w-14" />
                </div>

                <span className="max-w-full truncate text-xs font-black text-white sm:text-sm">
                  {item.name}
                </span>

                {/* Chunky 3D Action Button */}
                <div className="w-full" onClick={(e) => e.stopPropagation()}>
                  {owned ? (
                    <button
                      type="button"
                      data-shop-equip={item.id}
                      onClick={() => {
                        setPreviewItemId(null);
                        onPreviewLoadout(null);
                        onToggleEquip(item.id);
                      }}
                      className={`flex h-11 w-full items-center justify-center gap-1 rounded-xl border-2 text-xs font-black transition-transform active:translate-y-0.5 ${
                        equipped
                          ? 'border-emerald-200 bg-emerald-400 text-slate-950 shadow-[0_3px_0_#047857]'
                          : 'border-sky-400/80 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
                      }`}
                    >
                      {equipped ? (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>ON</span>
                        </>
                      ) : (
                        <span>USE</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-shop-buy={item.id}
                      disabled={!buyCheck.ok}
                      onClick={() => {
                        setPreviewItemId(null);
                        onPreviewLoadout(null);
                        onBuyItem(item.id);
                      }}
                      className={`tabular flex h-11 w-full items-center justify-center gap-1 rounded-xl border-2 text-xs font-black transition-transform active:translate-y-0.5 ${
                        buyCheck.ok
                          ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 shadow-[0_3px_0_#b45309]'
                          : 'border-slate-700 bg-slate-800/90 text-slate-400 opacity-75'
                      }`}
                    >
                      {buyCheck.ok ? (
                        <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      <span>{item.cost}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Visual Footer Shortcut to Quests */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900/95 px-3.5 py-2.5">
          <button
            id="shopOpenQuestsBtn"
            type="button"
            onClick={() => {
              handleClose();
              onOpenQuests();
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-400/75 bg-emerald-500/20 px-4 text-xs font-black text-emerald-200 hover:bg-emerald-500/30 active:scale-[0.98]"
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>Quests</span>
            <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuestBoardModalProps {
  visible: boolean;
  totalBolts: number;
  counters: QuestProgressCounters;
  claimedQuestIds: readonly string[];
  onClaimQuest: (questId: string) => void;
  onOpenShop: () => void;
  onOpenDebugMissions: () => void;
  onClose: () => void;
}

export const QuestBoardModal: React.FC<QuestBoardModalProps> = ({
  visible,
  totalBolts,
  counters,
  claimedQuestIds,
  onClaimQuest,
  onOpenShop,
  onOpenDebugMissions,
  onClose
}) => {
  const quests = useMemo(() => {
    const list = evaluateMasteryQuests(counters, claimedQuestIds);
    return [...list].sort((a, b) => {
      const rank = (q: typeof a) => (q.claimable ? 0 : !q.claimed ? 1 : 2);
      return rank(a) - rank(b);
    });
  }, [counters, claimedQuestIds]);

  if (!visible) return null;

  const claimedCount = quests.filter((q) => q.claimed).length;

  return (
    <div
      id="questBoardModal"
      role="dialog"
      aria-modal="true"
      aria-label="Mastery Skill Quests"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border-2 border-emerald-400/80 bg-slate-950 text-slate-100 shadow-2xl"
      >
        {/* Clean Commercial Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-300/75 bg-emerald-500/20 text-emerald-300">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-black text-white sm:text-lg">Quests</h2>
              <span className="tabular text-xs font-black text-emerald-300">
                {claimedCount}/{quests.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="tabular flex h-10 items-center gap-1 rounded-xl border-2 border-amber-400/70 bg-amber-500/15 px-3 text-sm font-black text-amber-200">
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
              <span>{totalBolts}</span>
            </div>
            <button
              id="closeQuestBoardBtn"
              type="button"
              onClick={onClose}
              aria-label="Close Quests"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-300 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Visual Icon-First Quest Rows (Zero Paragraphs!) */}
        <div className="touch-pan-y flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5 sm:p-4">
          {quests.map((q) => (
            <div
              key={q.id}
              data-quest-id={q.id}
              aria-label={`${q.title}: ${q.current} of ${q.target}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-2.5 sm:p-3 ${
                q.claimable
                  ? 'border-amber-300 bg-amber-500/14 shadow-[0_0_18px_rgba(251,191,36,0.18)]'
                  : q.claimed
                    ? 'border-emerald-500/40 bg-slate-900/55 opacity-75'
                    : 'border-slate-800 bg-slate-900/90'
              }`}
            >
              {/* Visual Goal Pictogram */}
              <QuestGoalArt counterKey={q.counterKey} className="h-12 w-12 shrink-0" />

              {/* Short Title + Chunky Progress Bar */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-black text-white">{q.title}</span>
                  <span className="tabular shrink-0 text-xs font-black text-sky-300">
                    {q.current}/{q.target}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-slate-700/80 bg-slate-950">
                  <div
                    className={`h-full rounded-full transition-all ${
                      q.claimed || q.claimable
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                        : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                    }`}
                    style={{ width: `${Math.round(q.ratio * 100)}%` }}
                  />
                </div>
              </div>

              {/* 1-Tap Tactile Reward Claim Button */}
              <div className="shrink-0">
                {q.claimed ? (
                  <span className="flex h-11 w-16 items-center justify-center rounded-xl border-2 border-emerald-500/60 bg-emerald-500/15 text-emerald-300">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </span>
                ) : q.claimable ? (
                  <button
                    type="button"
                    data-claim-quest={q.id}
                    onClick={() => onClaimQuest(q.id)}
                    className="tabular flex h-11 items-center gap-1 rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 px-3.5 text-xs font-black text-slate-950 shadow-[0_3px_0_#b45309] transition-transform active:translate-y-0.5"
                  >
                    <Gift className="h-4 w-4" aria-hidden="true" />
                    <span>+{q.boltReward}</span>
                  </button>
                ) : (
                  <span className="tabular flex h-11 min-w-[64px] items-center justify-center gap-0.5 rounded-xl border-2 border-slate-700 bg-slate-950 px-2.5 text-xs font-black text-amber-300">
                    <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                    <span>+{q.boltReward}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Clean 2-Button Tactile Footer */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-slate-800 bg-slate-900/95 px-3.5 py-3">
          <button
            id="questsOpenDebugBtn"
            type="button"
            onClick={() => {
              onClose();
              onOpenDebugMissions();
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-violet-400/80 bg-violet-500/20 px-3 text-xs font-black text-violet-100 hover:bg-violet-500/30 active:scale-95 sm:text-sm"
          >
            <Bug className="h-5 w-5 text-violet-300" aria-hidden="true" />
            <span>Bug Buster</span>
          </button>

          <button
            id="questsOpenShopBtn"
            type="button"
            onClick={() => {
              onClose();
              onOpenShop();
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 px-3 text-xs font-black text-slate-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 sm:text-sm"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span>Shop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
