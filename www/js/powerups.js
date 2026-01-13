/**
 * Power-Up System
 */

import * as THREE from 'three';
import { audioService } from './audio.js';
import { createGlassMaterial } from './graphics.js';
import { CONFIG } from './config.js';

const POWERUP_INFO = {
  slowMo: { icon: '⏱️', name: 'Slow-Mo' },
  safetyNet: { icon: '🛡️', name: 'Safety' },
  superSize: { icon: '📏', name: 'Wide' },
  resetSize: { icon: '🔄', name: 'Reset Size' }
};

/**
 * Activate a power-up from inventory
 * @param {object} state - Game state object
 * @param {number} slotIndex - Inventory slot index (0-2)
 */
export function activatePowerUp(state, slotIndex) {
  if (state.status !== 'PLAYING') return;
  
  const powerUpType = state.powerUps[slotIndex];
  if (!powerUpType) return; // Empty slot

  // Activate the power-up
  switch (powerUpType) {
    case 'slowMo':
      state.activePowerUps.slowMo = { active: true, duration: 10 };
      audioService.playTone(880, state.isMuted);
      break;
    case 'safetyNet':
      state.activePowerUps.safetyNet = { active: true, uses: 1 };
      audioService.playTone(1046, state.isMuted);
      break;
    case 'superSize':
      state.activePowerUps.superSize = { active: true, count: 2 };
      audioService.playTone(1318, state.isMuted);
      break;
    case 'resetSize':
      // Reset the last placed block to original base size immediately
      if (state.stack.length > 0) {
        const lastBlock = state.stack[state.stack.length - 1];
        
        // Dispose old geometry and material
        lastBlock.geometry.dispose();
        lastBlock.material.dispose();
        
        // Create new full-size geometry and fresh material with same color
        const blockColor = new THREE.Color(state.currentTheme.colors[(state.stack.length - 1) % state.currentTheme.colors.length]);
        lastBlock.geometry = new THREE.BoxGeometry(
          CONFIG.INITIAL_SIZE,
          CONFIG.BLOCK_HEIGHT,
          CONFIG.INITIAL_SIZE
        );
        lastBlock.material = createGlassMaterial(blockColor);
        
        // Recenter the block to the foundation center (0, 0)
        // This ensures perfect placement zone is restored
        lastBlock.position.x = 0;
        lastBlock.position.z = 0;
        // Y position stays the same - it's already correct from when block was placed
        
        // Update stored base size for next spawn
        lastBlock.userData.baseWidth = CONFIG.INITIAL_SIZE;
        lastBlock.userData.baseDepth = CONFIG.INITIAL_SIZE;
        
        // Also reset the active (currently moving) block if it exists
        if (state.activeBlock) {
          state.activeBlock.geometry.dispose();
          state.activeBlock.geometry = new THREE.BoxGeometry(
            CONFIG.INITIAL_SIZE,
            CONFIG.BLOCK_HEIGHT,
            CONFIG.INITIAL_SIZE
          );
          state.activeBlock.userData = {
            baseWidth: CONFIG.INITIAL_SIZE,
            baseDepth: CONFIG.INITIAL_SIZE
          };
          
          // Align active block with the reset block's new center position
          // Keep the active block on its axis (x or z) but align the other axis to 0
          if (state.axis === 'x') {
            state.activeBlock.position.z = 0; // Align Z to center
            // X stays as is (it's moving on X axis)
          } else {
            state.activeBlock.position.x = 0; // Align X to center
            // Z stays as is (it's moving on Z axis)
          }
        }
        
        audioService.playTone(523, state.isMuted); // C note for reset
      }
      break;
  }

  // Remove from inventory
  state.powerUps[slotIndex] = null;
  updatePowerUpUI(state);
}

/**
 * Update power-up UI display
 * @param {object} state - Game state object
 */
export function updatePowerUpUI(state) {
  if (!state) return;
  
  // Show/hide inventory based on game state
  const inventory = document.querySelector('.powerup-inventory');
  if (inventory) {
    // Only show during PLAYING, hide for START, PAUSED, GAMEOVER
    inventory.style.display = (state.status === 'PLAYING') ? 'flex' : 'none';
  }

  // Update each slot
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`powerup-slot-${i}`);
    const iconEl = document.getElementById(`powerup-icon-${i}`);
    if (!slot || !iconEl) continue;

    const powerUpType = state.powerUps[i];

    if (powerUpType) {
      slot.classList.remove('empty');
      slot.classList.add('filled');
      
      // Update icon from POWERUP_INFO
      if (POWERUP_INFO[powerUpType]) {
        iconEl.textContent = POWERUP_INFO[powerUpType].icon;
        iconEl.title = POWERUP_INFO[powerUpType].name;
      }
      
      // Check if this type is currently active
      const isActive = state.activePowerUps[powerUpType]?.active;
      if (isActive) {
        slot.classList.add('active');
        
        // Show active indicator
        let indicator = slot.querySelector('.powerup-active-indicator');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'powerup-active-indicator';
          slot.appendChild(indicator);
        }
        
        // Update counter based on type
        const activeData = state.activePowerUps[powerUpType];
        if (powerUpType === 'slowMo') {
          indicator.textContent = Math.ceil(activeData.duration);
        } else if (powerUpType === 'safetyNet') {
          indicator.textContent = activeData.uses;
        } else if (powerUpType === 'superSize') {
          indicator.textContent = activeData.count;
        }
      } else {
        slot.classList.remove('active');
        const indicator = slot.querySelector('.powerup-active-indicator');
        if (indicator) indicator.remove();
      }
    } else {
      slot.classList.add('empty');
      slot.classList.remove('filled', 'active');
      iconEl.textContent = '';
      iconEl.title = 'Empty';
      const indicator = slot.querySelector('.powerup-active-indicator');
      if (indicator) indicator.remove();
    }
  }
}

/**
 * Show power-up notification
 * @param {string} powerUpType - Type of power-up awarded
 */
function showPowerUpNotification(powerUpType) {
  const info = POWERUP_INFO[powerUpType];
  if (!info) return;

  // Remove any existing notification
  const existing = document.querySelector('.powerup-notification');
  if (existing) existing.remove();

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'powerup-notification';
  notification.innerHTML = `
    <div class="powerup-notification-icon">${info.icon}</div>
    <p class="powerup-notification-text">Power-Up!</p>
    <p class="powerup-notification-subtext">${info.name}</p>
  `;

  document.body.appendChild(notification);

  // Remove after animation
  setTimeout(() => {
    notification.style.animation = 'powerup-appear 0.3s ease-in reverse';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Award a random power-up to first empty slot
 * @param {object} state - Game state object
 */
export function awardPowerUp(state) {
  // Find first empty slot
  const emptySlot = state.powerUps.findIndex(slot => slot === null);
  if (emptySlot === -1) return; // No empty slots

  // Award a random power-up
  const powerUpTypes = ['slowMo', 'safetyNet', 'superSize', 'resetSize'];
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  state.powerUps[emptySlot] = randomType;
  
  // Show notification
  showPowerUpNotification(randomType);
  
  updatePowerUpUI(state);

  // Visual feedback
  audioService.playTone(1567, state.isMuted);
}

/**
 * Update active power-up durations/counters
 * @param {object} state - Game state object
 * @param {number} dt - Delta time in seconds
 */
export function updatePowerUpTimers(state, dt) {
  // Update Slow-Mo timer
  if (state.activePowerUps.slowMo.active && state.activePowerUps.slowMo.duration > 0) {
    state.activePowerUps.slowMo.duration -= dt;
    if (state.activePowerUps.slowMo.duration <= 0) {
      state.activePowerUps.slowMo.active = false;
      state.activePowerUps.slowMo.duration = 0;
    }
  }
}

/**
 * Decrement Super Size counter on block placement
 * @param {object} state - Game state object
 */
export function decrementSuperSize(state) {
  if (state.activePowerUps.superSize.active && state.activePowerUps.superSize.count > 0) {
    state.activePowerUps.superSize.count--;
    if (state.activePowerUps.superSize.count === 0) {
      state.activePowerUps.superSize.active = false;
    }
  }
}

/**
 * Use safety net power-up
 * @param {object} state - Game state object
 * @returns {boolean} - Whether safety net was available and used
 */
export function useSafetyNet(state) {
  if (state.activePowerUps.safetyNet.active && state.activePowerUps.safetyNet.uses > 0) {
    state.activePowerUps.safetyNet.uses--;
    if (state.activePowerUps.safetyNet.uses === 0) {
      state.activePowerUps.safetyNet.active = false;
    }
    return true;
  }
  return false;
}

/**
 * Get speed multiplier from active power-ups
 * @param {object} state - Game state object
 * @returns {number} - Speed multiplier (0.5 for slow-mo, 1.0 otherwise)
 */
export function getSpeedMultiplier(state) {
  if (state.activePowerUps.slowMo.active && state.activePowerUps.slowMo.duration > 0) {
    return 0.5; // 50% slower
  }
  return 1.0;
}

/**
 * Get size multiplier from active power-ups
 * @param {object} state - Game state object
 * @returns {number} - Size multiplier (1.3 for super size, 1.0 otherwise)
 */
export function getSizeMultiplier(state) {
  if (state.activePowerUps.superSize.active && state.activePowerUps.superSize.count > 0) {
    return 1.3; // 30% larger
  }
  return 1.0;
}
