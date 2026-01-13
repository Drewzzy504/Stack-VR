/**
 * Game Logic Module - Core gameplay functions
 */

import * as THREE from 'three';
import { CONFIG, DIFFICULTIES } from './config.js';
import { persistBestScores } from './storage.js';
import { reconcileThemeUnlock } from './utils.js';
import { audioService } from './audio.js';
import { adMobService } from './admob.js';
import {
  updatePowerUpUI,
  awardPowerUp,
  getSpeedMultiplier
} from './powerups.js';
import {
  triggerPerfectFeedback,
  triggerCrashFeedback
} from './effects.js';
import {
  scene,
  camera,
  rubbleInstances,
  createGlassMaterial,
  createFoundation,
  updateThemeVisuals
} from './graphics.js';

// Temporary matrix for rubble transforms
const _m4 = new THREE.Matrix4();

/**
 * Spawn a new block on the stack
 * @param {object} state - Game state
 */
export function spawnNewBlock(state) {
  const prev = state.stack[state.stack.length - 1];
  state.axis = state.axis === 'x' ? 'z' : 'x';
  const color = new THREE.Color(state.currentTheme.colors[state.stack.length % state.currentTheme.colors.length]);

  // Get base size from previous block
  const baseWidth = prev.userData?.baseWidth || prev.geometry.parameters.width;
  const baseDepth = prev.userData?.baseDepth || prev.geometry.parameters.depth;

  // Apply Super Size power-up if active
  let actualWidth = baseWidth;
  let actualDepth = baseDepth;
  if (state.activePowerUps.superSize.active && state.activePowerUps.superSize.count > 0) {
    actualWidth = baseWidth * 1.3;
    actualDepth = baseDepth * 1.3;
  }

  const geom = new THREE.BoxGeometry(
    actualWidth,
    CONFIG.BLOCK_HEIGHT,
    actualDepth
  );
  const mesh = new THREE.Mesh(geom, createGlassMaterial(color));

  // Store base size for next block
  mesh.userData = {
    baseWidth: baseWidth,
    baseDepth: baseDepth
  };

  mesh.position.y = state.stack.length * CONFIG.BLOCK_HEIGHT + CONFIG.BLOCK_HEIGHT / 2;
  const offset = Math.random() > 0.5 ? 12 : -12;
  state.direction = offset > 0 ? -1 : 1;
  mesh.position[state.axis] = offset;
  mesh.position[state.axis === 'x' ? 'z' : 'x'] = prev.position[state.axis === 'x' ? 'z' : 'x'];
  scene.add(mesh);
  state.activeBlock = mesh;
  state.lastSpawnTime = performance.now();
}

/**
 * Spawn rubble (falling debris from cut block)
 * @param {object} state - Game state
 * @param {THREE.Mesh} active - Active block mesh
 * @param {THREE.Mesh} prev - Previous block mesh
 * @param {string} axis - Movement axis ('x' or 'z')
 * @param {number} delta - Position delta
 * @param {number} overlap - Overlap amount
 */
export function spawnRubble(state, active, prev, axis, delta, overlap) {
  const params = active.geometry.parameters;
  const size = axis === 'x' ? params.width : params.depth;
  const other = axis === 'x' ? params.depth : params.width;
  const rSize = size - overlap;

  const idx = state.rubbleFree.length ? state.rubbleFree.pop() : -1;
  if (idx === -1) return;

  const rPos = active.position.clone();
  rPos[axis] = prev.position[axis] + (size / 2 + rSize / 2) * Math.sign(delta);

  const rScale = axis === 'x'
    ? new THREE.Vector3(rSize, CONFIG.BLOCK_HEIGHT, other)
    : new THREE.Vector3(other, CONFIG.BLOCK_HEIGHT, rSize);

  state.rubbleData[idx].isActive = true;
  state.rubbleActive.push(idx);
  state.rubbleData[idx].position.copy(rPos);
  state.rubbleData[idx].scale.copy(rScale);
  state.rubbleData[idx].rotation.set(0, 0, 0);
  state.rubbleData[idx].velocity.set(0, -10, 0);
  state.rubbleData[idx].angularVelocity.set(
    Math.random() * 8 - 4,
    Math.random() * 4 - 2,
    Math.random() * 8 - 4
  );

  rubbleInstances.setColorAt(idx, active.material.color);
  if (rubbleInstances.instanceColor) {
    rubbleInstances.instanceColor.needsUpdate = true;
  }
}

/**
 * Place the active block
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function placeBlock(state, uiManager) {
  if (!state.activeBlock) return;

  // Grace Period: Don't allow placing block immediately after spawn
  if (state.lastSpawnTime && performance.now() - state.lastSpawnTime < 2000) return;

  const active = state.activeBlock;
  const prev = state.stack[state.stack.length - 1];
  const diffConfig = DIFFICULTIES[state.difficulty];
  const axis = state.axis;
  const params = active.geometry.parameters;
  const size = axis === 'x' ? params.width : params.depth;
  const other = axis === 'x' ? params.depth : params.width;
  let delta = active.position[axis] - prev.position[axis];

  // Mercy threshold for early blocks
  const threshold = state.stack.length <= diffConfig.mercy ? diffConfig.threshold : 0.15;
  if (Math.abs(delta) < threshold) delta = 0;

  const absDelta = Math.abs(delta);
  const overlap = size - absDelta;

  // Check for complete miss
  if (overlap <= 0.05) {
    // Check for Safety Net power-up
    if (state.activePowerUps.safetyNet.active && state.activePowerUps.safetyNet.uses > 0) {
      // Use safety net instead of game over
      state.activePowerUps.safetyNet.uses--;
      if (state.activePowerUps.safetyNet.uses === 0) {
        state.activePowerUps.safetyNet.active = false;
      }
      state.combo = 0; // Break combo but don't end game
      updatePowerUpUI(state);

      // Visual feedback
      audioService.playTone(523, state.isMuted);
      state.flash = 0.3;

      // Clean up the block
      if (state.activeBlock) {
        scene.remove(state.activeBlock);
        state.activeBlock.geometry.dispose();
        state.activeBlock.material.dispose();
        state.activeBlock = null;
      }

      // Spawn new block on top of previous one
      spawnNewBlock(state);
      return;
    }

    gameOver(state, uiManager);
    return;
  }

  // Perfect placement
  if (delta === 0) {
    active.position[axis] = prev.position[axis];
    state.combo++;
    if (state.combo > state.maxSessionCombo) {
      state.maxSessionCombo = state.combo;
    }
    state.flash = 0.5;

    triggerPerfectFeedback(state);
    audioService.playNote(state.stack.length, true, state.isMuted);

    // Award power-up at combo milestones (5, 10, 15, etc.)
    if (state.combo >= 5 && state.combo % 5 === 0 && state.combo > state.lastComboMilestone) {
      state.lastComboMilestone = state.combo;
      awardPowerUp(state);
    }

    // Decrement Super Size counter on perfect placement
    if (state.activePowerUps.superSize.active && state.activePowerUps.superSize.count > 0) {
      state.activePowerUps.superSize.count--;
      if (state.activePowerUps.superSize.count === 0) {
        state.activePowerUps.superSize.active = false;
      }
      updatePowerUpUI(state);
    }
  } else {
    // Imperfect placement - cut block
    state.combo = 0;
    spawnRubble(state, active, prev, axis, delta, overlap);

    // Replace geometry with trimmed size
    active.geometry.dispose();
    active.geometry = axis === 'x'
      ? new THREE.BoxGeometry(overlap, CONFIG.BLOCK_HEIGHT, other)
      : new THREE.BoxGeometry(other, CONFIG.BLOCK_HEIGHT, overlap);
    active.position[axis] = prev.position[axis] + delta / 2;

    // Update base size after trimming - store the ACTUAL trimmed size as new base
    // (Don't apply Super Size multiplier to the stored base - that happens at spawn time)
    if (!active.userData) active.userData = {};
    active.userData.baseWidth = axis === 'x' ? overlap : other;
    active.userData.baseDepth = axis === 'x' ? other : overlap;

    // Decrement Super Size counter on imperfect placement too
    if (state.activePowerUps.superSize.active && state.activePowerUps.superSize.count > 0) {
      state.activePowerUps.superSize.count--;
      if (state.activePowerUps.superSize.count === 0) {
        state.activePowerUps.superSize.active = false;
      }
      updatePowerUpUI(state);
    }

    audioService.playNote(state.stack.length, false, state.isMuted);
  }

  state.stack.push(active);
  state.activeBlock = null;
  state.score++;
  state.speed = Math.min(diffConfig.max, state.speed + diffConfig.inc);
  uiManager.render(state);
  spawnNewBlock(state);
}

/**
 * Continue game after watching rewarded ad
 * @param {object} state - Game state
 * @param {object} uiManager - UI manager
 */
export function continueGame(state, uiManager) {
  // Mark continue as used
  state.continuesUsed++;

  // Resume playing
  state.status = 'PLAYING';

  // Give grace rewards to make player feel good!
  // 1. Add Safety Net (saves from next crash)
  state.activePowerUps.safetyNet.active = true;
  state.activePowerUps.safetyNet.uses = 1;

  // 2. Activate Slow-Mo for 5 seconds (breathing room)
  state.activePowerUps.slowMo.active = true;
  state.activePowerUps.slowMo.duration = 5.0;

  // Update UI to show the grace rewards
  updatePowerUpUI(state);

  // Show notification about the rewards
  const notification = document.createElement('div');
  notification.className = 'powerup-notification';
  notification.innerHTML = `
    <div style="font-size: 1.5rem; font-weight: 900; margin-bottom: 10px;">🎁 GRACE REWARDS!</div>
    <div style="font-size: 1rem;">🛡️ Safety Net + ⏱️ 5s Slow-Mo</div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(0, 255, 170, 0.2), rgba(138, 43, 226, 0.2));
    border: 2px solid var(--neon-cyan);
    padding: 30px;
    border-radius: 20px;
    z-index: 10000;
    text-align: center;
    animation: slideDown 0.5s ease-out;
    box-shadow: 0 0 30px rgba(0, 255, 170, 0.5);
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.5s ease-in';
    setTimeout(() => notification.remove(), 500);
  }, 2500);

  // Refresh UI
  uiManager.render(state);
}

/**
 * End the game
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function gameOver(state, uiManager) {
  state.status = 'GAMEOVER';
  state.continuePending = false;

  if (state.score > state.bestScore) state.bestScore = state.score;
  if (state.maxSessionCombo > state.bestStreak) state.bestStreak = state.maxSessionCombo;

  triggerCrashFeedback(state);
  audioService.playGameOver(state.isMuted);
  persistBestScores(state.bestScore, state.bestStreak);
  reconcileThemeUnlock(state);

  // Show interstitial ad every 3 games
  if (adMobService.shouldShowInterstitial()) {
    adMobService.showInterstitial();
  }

  uiManager.render(state);
}

/**
 * Start a new game
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function startGame(state, uiManager) {
  state.continueUsed = false;
  state.continuePending = false;

  cleanup(state);

  try {
    audioService.init();
  } catch (e) {
    console.warn("Audio init failed:", e);
  }

  const d = DIFFICULTIES[state.difficulty];

  state.status = 'PLAYING';

  state.score = 0;
  state.combo = 0;
  state.maxSessionCombo = 0;
  state.speed = d.initial;
  state.axis = 'x';

  // DEBUG: Visual confirmation that game has started
  if (scene) {
    const originalBg = scene.background.clone();
    scene.background = new THREE.Color(0x00FF00); // FLASH GREEN
    setTimeout(() => { if (scene) scene.background = originalBg; }, 500);
  }

  // Safety check for theme
  if (!state.currentTheme || !state.currentTheme.colors) {
    console.warn("Theme missing, using fallback");
    state.currentTheme = { id: 'default', colors: [0x00ffff, 0xff00ff, 0x0000ff, 0xffffff] };
  }

  // Reset power-ups for new game
  state.powerUps = [null, null, null];
  state.activePowerUps = {
    slowMo: { active: false, duration: 0 },
    safetyNet: { active: false, uses: 0 },
    superSize: { active: false, count: 0 }
  };
  state.lastComboMilestone = 0;
  updatePowerUpUI(state);

  state.camPos.set(14, 8, 14);
  state.camTarget.set(14, 8, 14);
  state.lookTarget.set(0, 0.5, 0);

  // REMOVED manual camera reset to avoid fighting VR rig
  // camera.position.set(12, 4, 12);
  // camera.lookAt(0, 0.5, 0);

  createFoundation(state);
  updateThemeVisuals(state);

  uiManager.render(state);

  try {
    spawnNewBlock(state);
  } catch (e) {
    console.error("Spawn Block Failed:", e);
    if (typeof updateVRText === 'function' && window.scoreText) {
      updateVRText("ERR: SPAWN", window.scoreText, "#ff0000");
    }
  }
}

/**
 * Return to main menu
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function backToMenu(state, uiManager) {
  // If coming from game over, clear the game so user can't resume
  if (state.status === 'GAMEOVER') {
    cleanup(state);
    state.stack = [];
    state.activeBlock = null;
  }

  state.status = 'START';
  updateThemeVisuals(state);
  uiManager.render(state);
}

/**
 * Resume game from pause
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function resumeGame(state, uiManager) {
  // Don't allow resume if game is over
  if (state.status === 'GAMEOVER') return;

  state.status = 'PLAYING';
  state.lastTime = performance.now();
  uiManager.render(state);
}

/**
 * Pause the game
 * @param {object} state - Game state
 * @param {UIManager} uiManager - UI manager instance
 */
export function pauseGame(state, uiManager) {
  if (state.status !== 'PLAYING') return;
  state.status = 'PAUSED';
  uiManager.render(state);
}

/**
 * Clean up scene objects
 * @param {object} state - Game state
 */
export function cleanup(state) {
  if (!scene) {
    state.stack = [];
    state.activeBlock = null;
    return;
  }

  const disposeMaterial = (mat) => {
    if (!mat) return;
    const texProps = [
      'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap',
      'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap'
    ];
    for (const k of texProps) {
      const t = mat[k];
      if (t && typeof t.dispose === 'function') t.dispose();
    }
    if (typeof mat.dispose === 'function') mat.dispose();
  };

  const disposeMesh = (m) => {
    if (!m) return;
    scene.remove(m);
    if (m.geometry && typeof m.geometry.dispose === 'function') {
      m.geometry.dispose();
    }
    if (Array.isArray(m.material)) {
      m.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(m.material);
    }
  };

  state.stack.forEach(disposeMesh);
  if (state.activeBlock) disposeMesh(state.activeBlock);

  state.stack = [];
  state.activeBlock = null;

  // Reset rubble pool
  if (rubbleInstances && state.rubbleData.length) {
    state.rubbleFree.length = 0;
    state.rubbleActive.length = 0;
    for (let i = 0; i < CONFIG.MAX_RUBBLE; i++) {
      state.rubbleData[i].isActive = false;
      state.rubbleFree.push(i);
      _m4.makeTranslation(0, -500, 0);
      rubbleInstances.setMatrixAt(i, _m4);
    }
    rubbleInstances.instanceMatrix.needsUpdate = true;
  }
}
