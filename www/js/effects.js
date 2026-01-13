/**
 * Effects and Feedback Utilities
 */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { audioService } from './audio.js';

/**
 * Trigger haptic feedback
 * @param {number|number[]} pattern - Vibration pattern in milliseconds
 */
export function triggerHaptics(pattern) {
  try {
    if (navigator && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Silently fail if vibration not supported
  }
}

/**
 * Trigger screen shake effect
 * @param {object} state - Game state
 * @param {number} amp - Shake amplitude
 * @param {number} duration - Shake duration
 */
export function triggerShake(state, amp, duration) {
  state.shakeAmp = Math.max(state.shakeAmp, amp);
  state.shakeDuration = Math.max(state.shakeDuration, duration);
  state.shakeTime = Math.max(state.shakeTime, duration);
}

/**
 * Create particle effect at position
 * @param {object} state - Game state
 * @param {THREE.Vector3} position - World position
 * @param {string} color - Hex color
 * @param {number} count - Number of particles
 */
export function createParticles(state, position, color, count = 10) {
  // Ensure THREE is available
  if (typeof THREE === 'undefined') return;
  
  for (let i = 0; i < count; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.15 + 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      life: 1.0,
      color: color,
      size: Math.random() * 0.15 + 0.1
    };
    state.particles.push(particle);
  }
}

/**
 * Update all particles (physics)
 * @param {object} state - Game state
 * @param {number} delta - Time delta
 */
export function updateParticles(state, delta) {
  const gravity = -0.3;
  
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= delta * 2;
    
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    
    p.velocity.y += gravity * delta;
    p.position.add(p.velocity.clone().multiplyScalar(delta * 5));
  }
}

/**
 * Render all active particles to scene
 * @param {object} state - Game state
 * @param {THREE.Scene} scene - Three.js scene
 */
export function renderParticles(state, scene) {
  if (!scene || state.particles.length === 0) return;
  
  state.particles.forEach(p => {
    const geom = new THREE.SphereGeometry(p.size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: p.color,
      transparent: true,
      opacity: p.life
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(p.position);
    scene.add(mesh);
    
    // Clean up immediately after render
    requestAnimationFrame(() => {
      scene.remove(mesh);
      geom.dispose();
      mat.dispose();
    });
  });
}

/**
 * Trigger crash feedback (screen shake, haptics, flash, sound, particles)
 * @param {object} state - Game state
 */
export function triggerCrashFeedback(state) {
  triggerShake(state, CONFIG.SHAKE_GAMEOVER_AMP, CONFIG.SHAKE_GAMEOVER_DURATION);
  triggerHaptics([35, 25, 110]);
  state.flash = Math.max(state.flash, 0.65);
  audioService.playCrash(state.isMuted);
  
  const position = state.activeBlock 
    ? state.activeBlock.position 
    : new THREE.Vector3(0, state.stack.length, 0);
  
  createParticles(state, position, '#ff0070', 15);
}

/**
 * Trigger perfect placement feedback (shake, haptics, sound, particles)
 * @param {object} state - Game state
 */
export function triggerPerfectFeedback(state) {
  triggerShake(state, CONFIG.SHAKE_PERFECT_AMP * 0.5, CONFIG.SHAKE_PERFECT_DURATION);
  triggerHaptics(10);
  audioService.playPlace(state.isMuted);
  
  if (state.combo >= 2) {
    const pos = state.activeBlock 
      ? state.activeBlock.position 
      : state.stack[state.stack.length - 1].position;
    
    createParticles(state, pos, state.currentTheme.colors[0], 8);
  }
}
