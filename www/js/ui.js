/**
 * UI Manager - Handles all UI rendering
 */

import { BRAND, THEMES, DIFFICULTIES } from './config.js';
import { persistTheme, persistMuted } from './storage.js';
import { getComboTitle } from './utils.js';
import { adMobService } from './admob.js';

/**
 * UI Manager class
 */
export class UIManager {
  constructor() {
    this.root = null;
  }

  /**
   * Initialize UI root
   */
  init() {
    this.root = document.getElementById('ui-root');
  }

  /**
   * Toggle mute state
   * @param {object} state - Game state
   * @param {Event} e - Event object
   */
  toggleMute(state, e) {
    if (e) e.stopPropagation();
    state.isMuted = !state.isMuted;
    persistMuted(state.isMuted);
    this.render(state);
  }

  /**
   * Main render function - dispatches to appropriate screen
   * @param {object} state - Game state
   */
  render(state) {
    if (!this.root) this.root = document.getElementById('ui-root');
    this.root.innerHTML = '';
    
    // Hide power-up inventory when not playing
    const inventory = document.querySelector('.powerup-inventory');
    if (inventory) {
      inventory.style.display = (state.status === 'PLAYING') ? 'flex' : 'none';
    }
    
    if (state.status === 'START') this.renderStart(state);
    else if (state.status === 'PLAYING') this.renderHUD(state);
    else if (state.status === 'GAMEOVER') this.renderGameOver(state);
    else if (state.status === 'PAUSED') this.renderPaused(state);
    
    // Show/hide banner ads based on game state
    if (state.status === 'START' || state.status === 'GAMEOVER') {
      adMobService.showBanner();
    } else {
      adMobService.hideBanner();
    }
  }

  /**
   * Render mute button
   * @param {object} state - Game state
   * @returns {string} - HTML string
   */
  renderMuteBtn(state) {
    return `
      <div class="floating-controls">
        <div class="round-btn ${state.isMuted ? 'active' : ''}" onclick="window.gameToggleMute(event)">
          ${state.isMuted ? '🔇' : '🔊'}
        </div>
      </div>
    `;
  }

  /**
   * Render start screen
   * @param {object} state - Game state
   */
  renderStart(state) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      ${this.renderMuteBtn(state)}
      <div class="glass-panel">
        <h1 style="font-weight: 900; letter-spacing: -1px; margin: 0; font-size: 2.2rem; text-shadow: 0 0 20px var(--neon-cyan)">${BRAND.title}</h1>

        <div style="display:flex; justify-content:center; gap:30px; margin:15px 0 5px;">
          <div style="text-align:center">
            <span style="font-size:0.6rem; opacity:0.5; font-weight:800; text-transform:uppercase;">Best</span><br>
            <span style="font-size:1.2rem; font-weight:900;">${state.bestScore}</span>
          </div>
          <div style="text-align:center">
            <span style="font-size:0.6rem; opacity:0.5; font-weight:800; text-transform:uppercase;">Streak</span><br>
            <span style="font-size:1.2rem; font-weight:900; color: var(--neon-pink);">${state.bestStreak}</span>
          </div>
        </div>

        <span class="selector-label">Difficulty</span>
        <div class="difficulty-grid">
          <div class="diff-item ${state.difficulty === 'easy' ? 'selected' : ''}" onclick="window.gameSetDiff('easy', event)">EASY</div>
          <div class="diff-item ${state.difficulty === 'medium' ? 'selected' : ''}" onclick="window.gameSetDiff('medium', event)">NORMAL</div>
          <div class="diff-item ${state.difficulty === 'hard' ? 'selected' : ''}" onclick="window.gameSetDiff('hard', event)">HARD</div>
        </div>

        <span class="selector-label">Theme</span>
        <div class="theme-grid" id="theme-grid"></div>

        ${state.stack.length > 1 ? `
          <button id="resume-btn" class="btn btn-cta" style="margin-top: 20px">RESUME GAME</button>
          <button id="new-game-btn" class="btn btn-glass" onclick="window.gameStartNew(event)">NEW GAME</button>
        ` : `
          <button id="start-btn" class="btn btn-cta" style="margin-top: 20px" ${state.selectedThemeLocked ? 'disabled' : ''} onclick="window.gameStartNew(event)">
            ${state.selectedThemeLocked ? `LOCKED • UNLOCK AT ${state.selectedThemeUnlockAt}` : BRAND.cta}
          </button>
        `}
      </div>
    `;
    this.root.appendChild(overlay);
    this.populateThemes(state);
    
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = (e) => {
        e.stopPropagation();
        window.gameResume(e);
      };
    }
  }

  /**
   * Populate theme grid
   * @param {object} state - Game state
   */
  populateThemes(state) {
    const grid = document.getElementById('theme-grid');
    const isUnlocked = (t) => state.bestScore >= t.unlock;

    THEMES.forEach((t) => {
      const locked = !isUnlocked(t);
      const el = document.createElement('div');
      el.className = `theme-item ${locked ? 'locked' : ''} ${state.currentTheme.id === t.id ? 'selected' : ''}`;
      el.style.background = `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[2]})`;

      if (locked) {
        el.innerHTML = `
          <span class="lock-icon">🔒</span>
          <span class="unlock-badge">${t.unlock}</span>
        `;
      }

      el.onclick = (e) => {
        e.stopPropagation();
        state.currentTheme = t;
        state.selectedThemeLocked = locked;
        state.selectedThemeUnlockAt = t.unlock;

        if (!locked) {
          persistTheme(state.currentTheme.id);
        }

        this.render(state);
        // Update theme visuals in 3D scene
        window.updateThemeVisuals();
      };

      grid.appendChild(el);
    });
  }

  /**
   * Render HUD (in-game UI)
   * @param {object} state - Game state
   */
  renderHUD(state) {
    const hud = document.createElement('div');
    hud.className = 'hud';
    const comboColor = state.currentTheme.colors[0];
    const diffName = DIFFICULTIES[state.difficulty].name;
    
    hud.innerHTML = `
      <div class="difficulty-badge">${diffName}</div>
      <div class="hud-top-center">
        <div class="score-huge" style="transform: scale(${1 + Math.min(state.combo * 0.05, 0.5)})">${state.score}</div>
        ${state.combo > 0 ? `
          <div class="combo-popup combo-burst" style="color: ${comboColor}">${getComboTitle(state.combo)}</div>
          <div class="streak-counter" style="color: ${comboColor}">${state.combo}X STREAK</div>
        ` : ''}
      </div>
      <div class="round-btn" style="position:absolute; top:20px; left:20px; pointer-events:auto" onclick="window.gamePause(event)">⏸</div>
      <div class="round-btn" style="position:absolute; top:20px; right:74px; pointer-events:auto" onclick="window.gameBackToMenu(event)" title="Menu">
        <div class="hamburger-icon">
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
          <div class="hamburger-line"></div>
        </div>
      </div>
      ${this.renderMuteBtn(state)}
    `;
    this.root.appendChild(hud);
  }

  /**
   * Render game over screen
   * @param {object} state - Game state
   */
  renderGameOver(state) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    // Check if player can still continue (limit 1 per game)
    const canContinue = state.continuesUsed < 1;
    
    overlay.innerHTML = `
      <div class="glass-panel">
        <h2 style="font-size: 2rem; color: var(--neon-fail); font-weight: 900;">${BRAND.gameOver}</h2>
        <div style="display:flex; justify-content:space-around; margin:25px 0;">
          <div>
            <p style="font-size:0.6rem; opacity:0.5; font-weight:800; text-transform:uppercase;">Score</p>
            <p style="font-size:2rem; font-weight:900;">${state.score}</p>
          </div>
          <div>
            <p style="font-size:0.6rem; opacity:0.5; font-weight:800; text-transform:uppercase;">Best</p>
            <p style="font-size:2rem; font-weight:900; color: var(--neon-cyan);">${state.bestScore}</p>
          </div>
        </div>
        ${canContinue ? `
          <button class="btn btn-cta" onclick="window.gameContinueWithAd(event)" style="pointer-events:auto; background: linear-gradient(135deg, #00ffaa, #8a2be2); border: 2px solid #00ffaa;">
            📺 CONTINUE + REWARDS
          </button>
          <p style="font-size: 0.7rem; opacity: 0.6; margin: -5px 0 10px 0;">Watch ad • Get Safety Net + Slow-Mo</p>
        ` : ''}
        <button class="btn share-btn" onclick="window.gameShare(event)" style="pointer-events:auto;">📤 SHARE SCORE</button>
        <button class="btn ${canContinue ? 'btn-glass' : 'btn-cta'}" onclick="window.gameRestart(event)">RE-TRY</button>
        <button class="btn btn-glass" onclick="window.gameBackToMenu(event)">MENU</button>
      </div>
    `;
    this.root.appendChild(overlay);
  }

  /**
   * Render paused screen
   * @param {object} state - Game state
   */
  renderPaused(state) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="glass-panel">
        <h2 style="font-weight: 900; font-size: 2.2rem;">PAUSED</h2>
        <button class="btn btn-cta" onclick="window.gameResume(event)">CONTINUE</button>
        <button class="btn btn-glass" onclick="window.gameBackToMenu(event)">QUIT</button>
      </div>
    `;
    this.root.appendChild(overlay);
  }
}

// Export singleton
export const uiManager = new UIManager();
