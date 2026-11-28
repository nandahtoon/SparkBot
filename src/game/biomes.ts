import type { LevelDef } from './types';

export type BiomeId =
  | 'skyport_canyon'
  | 'solar_dunes'
  | 'aurora_glade'
  | 'reactor_citadel'
  | 'energy_valley'
  | 'ocean_discovery';

export interface BiomeThemeDef {
  id: BiomeId;
  name: string;
  chapterLabel: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  keyLightHex: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  rimLightHex: number;
  skyFloorHex: number;
  solarRingHex: number;
  solarRingEmissiveHex: number;
  mesaHex: number;
  mesaBandHex: number;
  accentCss: string;
}

export const BIOME_THEMES: Record<BiomeId, BiomeThemeDef> = {
  skyport_canyon: {
    id: 'skyport_canyon',
    name: 'Skyport Canyon',
    chapterLabel: 'Ch. 1',
    skyHex: 0x13203d,
    fogHex: 0x13203d,
    fogDensity: 0.0115,
    keyLightHex: 0xfff5e6,
    hemiSkyHex: 0xcbe5ff,
    hemiGroundHex: 0x24324d,
    rimLightHex: 0x93e5ff,
    skyFloorHex: 0x0e192f,
    solarRingHex: 0x38bdf8,
    solarRingEmissiveHex: 0x0284c7,
    mesaHex: 0x1e2c4a,
    mesaBandHex: 0x38bdf8,
    accentCss: '#38bdf8'
  },
  solar_dunes: {
    id: 'solar_dunes',
    name: 'Solar Amber Dunes',
    chapterLabel: 'Ch. 2',
    skyHex: 0x271923,
    fogHex: 0x2a1b24,
    fogDensity: 0.0112,
    keyLightHex: 0xffe4bd,
    hemiSkyHex: 0xffd7a8,
    hemiGroundHex: 0x3d2320,
    rimLightHex: 0xfbbf24,
    skyFloorHex: 0x1f131b,
    solarRingHex: 0xf59e0b,
    solarRingEmissiveHex: 0xd97706,
    mesaHex: 0x3b242c,
    mesaBandHex: 0xfbbf24,
    accentCss: '#fbbf24'
  },
  aurora_glade: {
    id: 'aurora_glade',
    name: 'Aurora Crystal Glade',
    chapterLabel: 'Ch. 3',
    skyHex: 0x0d2530,
    fogHex: 0x0d2630,
    fogDensity: 0.0112,
    keyLightHex: 0xe6fffa,
    hemiSkyHex: 0x99f6e4,
    hemiGroundHex: 0x15353d,
    rimLightHex: 0x34d399,
    skyFloorHex: 0x091c24,
    solarRingHex: 0x34d399,
    solarRingEmissiveHex: 0x059669,
    mesaHex: 0x163845,
    mesaBandHex: 0x2dd4bf,
    accentCss: '#34d399'
  },
  reactor_citadel: {
    id: 'reactor_citadel',
    name: 'Reactor Citadel',
    chapterLabel: 'Ch. 4',
    skyHex: 0x1a1230,
    fogHex: 0x1b1232,
    fogDensity: 0.0118,
    keyLightHex: 0xf5e8ff,
    hemiSkyHex: 0xd8b4fe,
    hemiGroundHex: 0x2e1a3d,
    rimLightHex: 0xfb7185,
    skyFloorHex: 0x130d24,
    solarRingHex: 0xf43f5e,
    solarRingEmissiveHex: 0xe11d48,
    mesaHex: 0x271b45,
    mesaBandHex: 0xf472b6,
    accentCss: '#f472b6'
  },
  energy_valley: {
    id: 'energy_valley', name: 'Sunrise Energy Valley', chapterLabel: 'Ch. 5',
    skyHex: 0x23495b, fogHex: 0x315b65, fogDensity: 0.009,
    keyLightHex: 0xffe4ae, hemiSkyHex: 0xd7faff, hemiGroundHex: 0x284d42,
    rimLightHex: 0xfde68a, skyFloorHex: 0x173b38,
    solarRingHex: 0xfbbf24, solarRingEmissiveHex: 0xb45309,
    mesaHex: 0x315f53, mesaBandHex: 0x2dd4bf, accentCss: '#2dd4bf'
  },
  ocean_discovery: {
    id:'ocean_discovery',name:'Ocean Discovery',chapterLabel:'Ocean Preview',
    skyHex:0x78c9e9,fogHex:0x90d5e4,fogDensity:0.009,keyLightHex:0xfff0cc,
    hemiSkyHex:0xdff9ff,hemiGroundHex:0x155a72,rimLightHex:0x99f6e4,
    skyFloorHex:0x187b9f,solarRingHex:0x67e8f9,solarRingEmissiveHex:0x0891b2,
    mesaHex:0x4e898b,mesaBandHex:0x7dd3fc,accentCss:'#67e8f9'
  }
};

export function getBiomeForLevel(level: LevelDef | null | undefined): BiomeThemeDef {
  if (!level) return BIOME_THEMES.skyport_canyon;
  if (level.isDebug) {
    const order = (level.id - 2000) || 1;
    if (order >= 5) return BIOME_THEMES.reactor_citadel;
    if (order >= 3) return BIOME_THEMES.aurora_glade;
    return BIOME_THEMES.solar_dunes;
  }
  if (level.isDaily) {
    const seed = (level.dailyDateKey || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const list: BiomeId[] = ['skyport_canyon', 'solar_dunes', 'aurora_glade', 'reactor_citadel'];
    return BIOME_THEMES[list[seed % list.length]];
  }
  if ((level.isPrototype && level.id === 6103) || (!level.isSandbox && !level.isClassCode && level.isBonus && level.id >= 21 && level.id <= 24)) return BIOME_THEMES.ocean_discovery;
  if (!level.isSandbox && !level.isClassCode && level.id >= 17 && level.id <= 20) return BIOME_THEMES.energy_valley;
  if (level.isBoss || level.id >= 13) return BIOME_THEMES.reactor_citadel;
  if (level.isBonus || level.id >= 9) return BIOME_THEMES.aurora_glade;
  if (level.id >= 5) return BIOME_THEMES.solar_dunes;
  return BIOME_THEMES.skyport_canyon;
}
