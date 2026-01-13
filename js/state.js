/**
 * Game State Management
 */

import { pickThemeById, loadThemeId, loadDifficulty } from './storage.js';
import { loadTutorialSeen } from './storage.js';
import * as THREE from 'three';

// Game state object
export const state = {
  // Game status
  status: 'LOADING', // 'LOADING', 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'

  // Scores
  score: 0,
  bestScore: 0,
  bestStreak: 0,
  combo: 0,
  maxSessionCombo: 0,

  // Settings
  currentTheme: null, // Will be initialized
  difficulty: 'medium',
  isMuted: false,

  // Theme selection
  selectedThemeLocked: false,
  selectedThemeUnlockAt: 0,

  // Tutorial
  hasSeenTutorial: false,

  // Power-Ups
  powerUps: [null, null, null], // Inventory slots
  activePowerUps: {
    slowMo: { active: false, duration: 0 },
    safetyNet: { active: false, uses: 0 },
    superSize: { active: false, count: 0 }
  },
  lastComboMilestone: 0,

  // Continue feature
  continuesUsed: 0,

  // Gameplay
  axis: 'x',
  direction: 1,
  speed: 0.18,
  stack: [],
  activeBlock: null,

  // Timing
  lastTime: 0,
  lastInputTime: 0,
  lastSpawnTime: 0,

  // Camera
  cameraOrbit: 0,
  camPos: new THREE.Vector3(14, 8, 14),
  camTarget: new THREE.Vector3(14, 8, 14),
  lookTarget: new THREE.Vector3(0, 0.5, 0),

  // Visual effects
  flash: 0,
  shakeTime: 0,
  shakeDuration: 0,
  shakeAmp: 0,
  shakeOffset: new THREE.Vector3(0, 0, 0),

  // Particles
  particles: [],

  // Rubble/debris
  rubbleData: [],
  rubbleFree: [],
  rubbleActive: [],

  // Performance monitoring
  fpsAvg: 60,
  _fpsAcc: 0,
  _fpsFrames: 0,
  _fpsLast: 0,
  qualityLow: false
};

/**
 * Initialize state from storage
 */
export function initializeState(bestScore, bestStreak, isMuted) {
  state.bestScore = bestScore;
  state.bestStreak = bestStreak;
  state.difficulty = loadDifficulty();
  state.currentTheme = pickThemeById(loadThemeId());
  if (!state.currentTheme) {
    state.currentTheme = { id: 'default', colors: [0x00ffff, 0xff00ff, 0x0000ff, 0xffffff], unlock: 0 };
  }
  state.isMuted = isMuted;
  state.hasSeenTutorial = loadTutorialSeen();
  return state;
}

/**
 * Reset game state for new game
 */
export function resetGameState() {
  state.score = 0;
  state.combo = 0;
  state.maxSessionCombo = 0;
  state.stack = [];
  state.activeBlock = null;
  state.particles = [];
  state.rubbleActive = [];
  state.powerUps = [null, null, null];
  state.activePowerUps = {
    slowMo: { active: false, duration: 0 },
    safetyNet: { active: false, uses: 0 },
    superSize: { active: false, count: 0 }
  };
  state.lastComboMilestone = 0;
  state.continuesUsed = 0;
  state.flash = 0;
  state.shakeTime = 0;
}
