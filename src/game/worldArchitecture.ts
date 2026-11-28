import type {BiomeId} from './biomes';
export const WORLD_ARCHITECTURE={
 skyport_canyon:{landmark:'Salvage gantries',deck:0x334155,rail:0x38bdf8,support:0x475569,destination:0x64748b,silhouette:'salvage'},
 solar_dunes:{landmark:'Amber sandstone arches',deck:0x936b47,rail:0xfbbf24,support:0x79553c,destination:0xc89b60,silhouette:'dune'},
 aurora_glade:{landmark:'Crystal groves',deck:0x305b64,rail:0x34d399,support:0x31594f,destination:0x61bca5,silhouette:'crystal'},
 reactor_citadel:{landmark:'Reactor towers',deck:0x473452,rail:0xf472b6,support:0x3b254a,destination:0x735889,silhouette:'reactor'},
 energy_valley:{landmark:'Solar research arrays',deck:0x496755,rail:0xfbbf24,support:0x40675e,destination:0x80a59a,silhouette:'solar'},
 ocean_discovery:{landmark:'Floating research platforms',deck:0x387a92,rail:0xb9f4e9,support:0xe5a75c,destination:0xe6e7dc,silhouette:'reef'}
} satisfies Record<BiomeId,{landmark:string;deck:number;rail:number;support:number;destination:number;silhouette:string}>;
export function getWorldArchitecture(id:BiomeId){return WORLD_ARCHITECTURE[id];}
