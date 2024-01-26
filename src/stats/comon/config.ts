import { ALL_CLASSES } from '@firestone-hs/reference-data';

export const ARENA_STATS_BUCKET = 'static.zerotoheroes.com';
export const ARENA_STATS_KEY_PREFIX = `api/arena/stats/draft`;
export const MIN_WINS = [0, 4, 6, 8];
export const CONTEXTS = ['global', ...ALL_CLASSES.map((c) => c.toUpperCase())];
