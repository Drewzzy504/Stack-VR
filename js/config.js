/**
 * Game Configuration and Constants
 */

export const BRAND = {
  title: 'STACK VOID',
  cta: 'ENTER VOID',
  gameOver: 'VOIDED'
};

export const THEMES = [
  { id: 'neon', name: 'NEON', colors: ['#00ffff', '#7000ff', '#ff0070'], unlock: 0 },
  { id: 'cyber', name: 'CYBER', colors: ['#ffcf00', '#ff0070', '#00ff70'], unlock: 15 },
  { id: 'emerald', name: 'EMERALD', colors: ['#00ff70', '#00ffaa', '#008855'], unlock: 30 },
  { id: 'ocean', name: 'OCEAN', colors: ['#0080ff', '#00ccff', '#0040aa'], unlock: 50 },
  { id: 'sunset', name: 'SUNSET', colors: ['#ff6600', '#ff0080', '#ffaa00'], unlock: 75 },
  { id: 'ruby', name: 'RUBY', colors: ['#ff0000', '#aa0000', '#550000'], unlock: 100 },
  { id: 'purple', name: 'PURPLE', colors: ['#aa00ff', '#ff00ff', '#5500aa'], unlock: 125 },
  { id: 'ghost', name: 'GHOST', colors: ['#ffffff', '#cccccc', '#999999'], unlock: 150 },
  { id: 'matrix', name: 'MATRIX', colors: ['#00ff00', '#00aa00', '#005500'], unlock: 200 },
  { id: 'fire', name: 'FIRE', colors: ['#ff4400', '#ff0000', '#aa0000'], unlock: 250 }
];

export const DIFFICULTIES = {
  easy: { name: 'EASY', initial: 0.12, inc: 0.003, max: 0.35, mercy: 8, threshold: 0.45 },
  medium: { name: 'NORMAL', initial: 0.18, inc: 0.006, max: 0.50, mercy: 5, threshold: 0.35 },
  hard: { name: 'HARD', initial: 0.25, inc: 0.012, max: 0.70, mercy: 2, threshold: 0.20 }
};

export const CONFIG = {
  BLOCK_HEIGHT: 1,
  INITIAL_SIZE: 4,
  CAMERA_LERP: 0.1,
  MAX_RUBBLE: 80,
  INPUT_COOLDOWN: 150,

  // Performance
  PIXEL_RATIO_CAP: 1.5,
  PIXEL_RATIO_LOW: 1.0,
  BLOOM_RES_DIV: 3,
  BLOOM_RES_DIV_LOW: 5,
  STARCOUNT_BACK: 9000,
  STARCOUNT_MID: 4500,

  // Adaptive tuning
  ADAPT_INTERVAL: 0.75,
  FPS_LOW: 45,
  FPS_HIGH: 56,

  // Juice
  SHAKE_GAMEOVER_DURATION: 0.35,
  SHAKE_GAMEOVER_AMP: 0.9,
  SHAKE_PERFECT_DURATION: 0.08,
  SHAKE_PERFECT_AMP: 0.18
};

export const STORAGE_KEYS = {
  best: 'stack_best',
  bestStreak: 'stack_best_streak',
  muted: 'stack_muted',
  theme: 'stack_theme',
  difficulty: 'stack_difficulty'
};
