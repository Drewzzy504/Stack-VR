/**
 * Local Storage Persistence Module
 */

import { STORAGE_KEYS, THEMES, DIFFICULTIES } from './config.js';

export function loadDifficulty() {
  try {
    const d = localStorage.getItem(STORAGE_KEYS.difficulty);
    return (d && DIFFICULTIES[d]) ? d : 'medium';
  } catch (e) {
    return 'medium';
  }
}

export function loadThemeId() {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.theme);
    return id || THEMES[0].id;
  } catch (e) {
    return THEMES[0].id;
  }
}

export function pickThemeById(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

export function persistDifficulty(difficulty) {
  try {
    localStorage.setItem(STORAGE_KEYS.difficulty, difficulty);
  } catch (e) {
    console.warn('Failed to persist difficulty:', e);
  }
}

export function persistTheme(themeId) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, themeId);
  } catch (e) {
    console.warn('Failed to persist theme:', e);
  }
}

export function persistMuted(isMuted) {
  try {
    localStorage.setItem(STORAGE_KEYS.muted, isMuted ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to persist muted state:', e);
  }
}

export function loadMuted() {
  try {
    return localStorage.getItem(STORAGE_KEYS.muted) === 'true';
  } catch (e) {
    return false;
  }
}

export async function persistBestScores(bestScore, bestStreak) {
  try {
    localStorage.setItem(STORAGE_KEYS.best, String(bestScore));
    localStorage.setItem(STORAGE_KEYS.bestStreak, String(bestStreak));
  } catch (e) {
    console.warn('Failed to persist best scores:', e);
  }
}

export function loadBestScores() {
  try {
    const best = parseInt(localStorage.getItem(STORAGE_KEYS.best) || '0', 10);
    const streak = parseInt(localStorage.getItem(STORAGE_KEYS.bestStreak) || '0', 10);
    return { bestScore: best, bestStreak: streak };
  } catch (e) {
    return { bestScore: 0, bestStreak: 0 };
  }
}

export function loadTutorialSeen() {
  try {
    return localStorage.getItem('hasSeenTutorial') === 'true';
  } catch (e) {
    return false;
  }
}

export function persistTutorialSeen() {
  try {
    localStorage.setItem('hasSeenTutorial', 'true');
  } catch (e) {
    console.warn('Failed to persist tutorial state:', e);
  }
}
