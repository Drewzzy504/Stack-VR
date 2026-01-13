/**
 * Utility Functions
 */

import { THEMES } from './config.js';
import { persistTheme } from './storage.js';

/**
 * Reconcile theme unlock based on best score
 * @param {object} state - Game state object
 */
export function reconcileThemeUnlock(state) {
  const currentTheme = state.currentTheme;
  
  // If current theme is locked based on score, revert to first unlocked theme
  if (state.bestScore < currentTheme.unlock) {
    const firstUnlocked = THEMES.find(t => state.bestScore >= t.unlock) || THEMES[0];
    state.currentTheme = firstUnlocked;
    persistTheme(firstUnlocked.id);
  }
}

/**
 * Create a touch ripple effect at position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
export function createTouchRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'tap-ripple';
  ripple.style.left = (x - 25) + 'px';
  ripple.style.top = (y - 25) + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Close tutorial overlay
 */
export function closeTutorial(state) {
  const tutorialEl = document.getElementById('tutorial-overlay');
  if (tutorialEl) {
    tutorialEl.style.display = 'none';
  }
  state.hasSeenTutorial = true;
  try {
    localStorage.setItem('hasSeenTutorial', 'true');
  } catch (e) {
    console.warn('Failed to persist tutorial state:', e);
  }
}

/**
 * Share score functionality
 * @param {number} score - Score to share
 */
export function shareScore(score) {
  const text = `I scored ${score} in Stack Void! Can you beat it?`;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({ title: 'Stack Void', text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text} ${url}`).then(() => {
      alert('Score copied to clipboard!');
    }).catch(() => {});
  }
}

/**
 * Get combo title based on combo count
 * @param {number} combo - Current combo count
 * @returns {string} - Combo title
 */
export function getComboTitle(combo) {
  if (combo < 2) return 'PERFECT';
  if (combo < 4) return 'COOL!';
  if (combo < 7) return 'SICK!!';
  if (combo < 10) return 'INSANE!!!';
  if (combo < 15) return 'GODLIKE!!!!';
  return 'UNSTOPPABLE!!!!!';
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
