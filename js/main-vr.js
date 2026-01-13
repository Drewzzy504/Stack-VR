/**
 * Main Entry Point (VR) - WebXR animation loop and VR controller input
 */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadBestScores, loadTutorialSeen, persistDifficulty, persistTheme } from './storage.js';
import { state, initializeState } from './state.js';
import { uiManager } from './ui.js';
import { updatePowerUpUI, updatePowerUpTimers, activatePowerUp } from './powerups.js';
import { updateParticles, renderParticles } from './effects.js';
import { createTouchRipple, reconcileThemeUnlock, shareScore, closeTutorial } from './utils.js';
import { adMobService } from './admob.js';
import {
    initEngine,
    handleResize,
    adaptQuality,
    scene,
    camera,
    cameraGroup,
    renderer,
    composer,
    nebula,
    starLayerBack,
    starLayerMid,
    pointLight,
    rubbleInstances,
    planets,
    controllers,
    scoreText,
    comboText,
    uiGroup,
    updateVRText
} from './graphics-vr.js';
import {
    startGame,
    resumeGame,
    pauseGame,
    backToMenu,
    placeBlock,
    continueGame
} from './game.js';

// Temporary Three.js objects for calculations
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m4 = new THREE.Matrix4();

// Controller input state
let controllerInputCooldown = [0, 0];

/**
 * Handle VR controller input
 * @param {number} controllerIndex - Index of controller (0 or 1)
 */
function handleVRInput(controllerIndex) {
    if (state.status !== 'PLAYING') return;

    const now = performance.now();
    if (now - controllerInputCooldown[controllerIndex] < CONFIG.INPUT_COOLDOWN) return;
    if (now - state.lastSpawnTime < 200) return;
    controllerInputCooldown[controllerIndex] = now;

    placeBlock(state, uiManager);
}

/**
 * Setup controller event listeners
 */
function setupControllers() {
    controllers.forEach((controller, index) => {
        controller.addEventListener('selectstart', () => {
            handleVRInput(index);
        });
    });
}

/**
 * Update VR UI displays
 */
function updateVRUIDisplay() {
    // Update score text
    if (scoreText) {
        updateVRText(`SCORE: ${state.score}`, scoreText, '#00ffff');
    }

    // Update combo text
    if (comboText) {
        if (state.comboStreak > 2) {
            comboText.visible = true;
            updateVRText(`COMBO x${state.comboStreak}!`, comboText, '#ff0070');
        } else {
            comboText.visible = false;
        }
    }

    // Position UI to follow camera height (but reachable/readable)
    if (uiGroup && state.stack.length > 0) {
        const h = state.stack.length * CONFIG.BLOCK_HEIGHT;
        // Position UI slightly above the current stack top
        uiGroup.position.y = h + 4;
    }
}

/**
 * Main animation loop (VR-compatible)
 * @param {number} time - Current timestamp
 * @param {XRFrame} frame - XR frame (only in VR mode)
 */
function animate(time, frame) {
    // Remove last frame's shake offset
    const shakeTarget = (cameraGroup && renderer.xr.isPresenting) ? cameraGroup : camera;
    if (shakeTarget && state.shakeOffset) {
        shakeTarget.position.sub(state.shakeOffset);
    }
    state.shakeOffset.set(0, 0, 0);

    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min((time - state.lastTime) / 1000, 0.04);
    state.lastTime = time;

    // Rotate background elements
    if (nebula) nebula.rotation.y += 0.005 * dt;
    if (starLayerBack) starLayerBack.rotation.y += 0.001 * dt;
    if (starLayerMid) starLayerMid.rotation.y += 0.0025 * dt;

    // Update planet orbits and rotations
    planets.forEach(planet => {
        planet.userData.angle += planet.userData.speed * dt;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += planet.userData.rotSpeed * dt;
    });

    // Update particles
    if (state.particles.length > 0) {
        updateParticles(state, dt);
        renderParticles(state, scene);
    }

    // Camera behavior (modified for VR)
    const isInVR = renderer.xr.isPresenting;

    if (!isInVR) {
        // Desktop preview mode - use orbiting camera
        if (state.status === 'START') {
            state.cameraOrbit += 0.12 * dt;
            state.camTarget.set(
                16 * Math.cos(state.cameraOrbit),
                8,
                16 * Math.sin(state.cameraOrbit)
            );
            camera.position.lerp(state.camTarget, 0.035);
            camera.lookAt(state.lookTarget);
        } else {
            // Follow stack during gameplay
            const h = state.stack.length * CONFIG.BLOCK_HEIGHT;
            state.camTarget.set(13, h + 7.5, 13);
            state.lookTarget.lerp(_v3.set(0, h, 0), CONFIG.CAMERA_LERP);
            camera.position.lerp(state.camTarget, CONFIG.CAMERA_LERP);
            camera.lookAt(state.lookTarget.x, Math.max(0, state.lookTarget.y - 2.8), state.lookTarget.z);
        }
    } else {
        // VR mode - move the camera RIG (dolly), not the camera itself
        const h = state.stack.length * CONFIG.BLOCK_HEIGHT;
        // Position rig so user (at 0,0,0 local) is viewing the stack comfortably
        // We offset Y by -1.0 to account for typical standing height, aligning eye level with action
        state.camTarget.set(0, h + 2, 6);
        if (cameraGroup) {
            cameraGroup.position.lerp(state.camTarget, CONFIG.CAMERA_LERP * 0.5);
            // Ensure camera rig looks at the tower
            cameraGroup.lookAt(0, h + 2, 0);
        }
    }

    // Apply screen shake
    if (state.shakeTime > 0) {
        state.shakeTime = Math.max(0, state.shakeTime - dt);
        const t = state.shakeDuration > 0 ? (state.shakeTime / state.shakeDuration) : 0;
        const falloff = t * t;
        const amp = state.shakeAmp * falloff;
        state.shakeOffset.set(
            (Math.random() - 0.5) * amp,
            (Math.random() - 0.5) * amp * 0.6,
            (Math.random() - 0.5) * amp
        );
        if (shakeTarget) shakeTarget.position.add(state.shakeOffset);

        if (state.shakeTime === 0) {
            state.shakeAmp = 0;
            state.shakeDuration = 0;
        }
    }

    // Apply flash effect
    if (state.flash > 0) {
        renderer.toneMappingExposure = 1.0 + state.flash * 0.6;
        state.flash -= 2.0 * dt;
    } else {
        renderer.toneMappingExposure = 1.0;
    }

    // Update active block movement
    if (state.status === 'PLAYING' && state.activeBlock) {
        // Update Slow-Mo power-up timer
        updatePowerUpTimers(state, dt);

        // Get speed multiplier (0.5 if Slow-Mo active, 1.0 otherwise)
        let speedMultiplier = 1;
        if (state.activePowerUps.slowMo.active && state.activePowerUps.slowMo.duration > 0) {
            speedMultiplier = 0.5;
        }

        state.activeBlock.position[state.axis] +=
            state.direction * state.speed * speedMultiplier * (dt * 60);

        if (Math.abs(state.activeBlock.position[state.axis]) > 13) {
            state.direction *= -1;
            state.activeBlock.position[state.axis] =
                13 * Math.sign(state.activeBlock.position[state.axis]);
        }

        pointLight.position.copy(state.activeBlock.position).y += 2.5;
        pointLight.color.copy(state.activeBlock.material.color);
    }

    // Update rubble physics
    let rubUpdate = false;
    for (let a = state.rubbleActive.length - 1; a >= 0; a--) {
        const i = state.rubbleActive[a];
        const r = state.rubbleData[i];

        if (!r.isActive) {
            const last = state.rubbleActive.pop();
            if (a < state.rubbleActive.length) state.rubbleActive[a] = last;
            continue;
        }

        r.position.y += r.velocity.y * (dt * 5);
        r.velocity.y -= 25 * dt;
        r.rotation.x += r.angularVelocity.x * dt;
        r.rotation.y += r.angularVelocity.y * dt;
        r.rotation.z += r.angularVelocity.z * dt;

        if (r.position.y < -120) {
            r.isActive = false;
            _m4.makeTranslation(0, -500, 0);
            rubbleInstances.setMatrixAt(i, _m4);
            rubUpdate = true;

            state.rubbleFree.push(i);
            const last = state.rubbleActive.pop();
            if (a < state.rubbleActive.length) state.rubbleActive[a] = last;
            continue;
        }

        _m4.compose(r.position, _q.setFromEuler(r.rotation), r.scale);
        rubbleInstances.setMatrixAt(i, _m4);
        rubUpdate = true;
    }
    if (rubUpdate) rubbleInstances.instanceMatrix.needsUpdate = true;

    // Performance monitoring
    state._fpsAcc += dt;
    state._fpsFrames++;
    if (state._fpsAcc >= 0.5) {
        state.fpsAvg = state._fpsFrames / state._fpsAcc;
        state._fpsAcc = 0;
        state._fpsFrames = 0;
    }

    // Adaptive quality adjustment
    state._adaptAcc += dt;
    if (state._adaptAcc >= CONFIG.ADAPT_INTERVAL) {
        state._adaptAcc = 0;
        adaptQuality(state);
    }

    // Update VR UI
    updateVRUIDisplay();

    // Render
    if (renderer.xr.isPresenting) {
        // Direct render for VR to ensure compatibility and performance
        renderer.render(scene, camera);
    } else {
        // Use composer for post-processing in desktop preview
        composer.render();
    }
}

/**
 * Handle user input (mouse/touch for desktop preview mode)
 * @param {Event} e - Input event
 */
function handleInput(e) {
    if (state.status !== 'PLAYING') return;
    if (e.target.tagName === 'BUTTON' ||
        e.target.closest('.glass-panel') ||
        e.target.closest('.round-btn') ||
        e.target.closest('.powerup-slot') ||
        e.target.closest('.powerup-inventory') ||
        e.target.closest('.tutorial-overlay')) {
        return;
    }

    const now = performance.now();
    if (now - state.lastInputTime < CONFIG.INPUT_COOLDOWN) return;
    if (now - state.lastSpawnTime < 200) return;
    state.lastInputTime = now;

    // Touch ripple effect
    const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
    const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);
    createTouchRipple(x, y);

    placeBlock(state, uiManager);
}

/**
 * Initialize game data and show start screen
 */
async function initGameData() {
    try {
        const { bestScore, bestStreak } = loadBestScores();
        state.bestScore = bestScore;
        state.bestStreak = bestStreak;
    } catch (e) {
        state.bestScore = 0;
        state.bestStreak = 0;
    }

    reconcileThemeUnlock(state);

    const loader = document.getElementById('loader-fill');
    if (loader) loader.style.width = '100%';
    await new Promise(r => setTimeout(r, 600));

    document.getElementById('loading-screen').style.display = 'none';

    state.selectedThemeLocked = state.bestScore < state.currentTheme.unlock;
    state.selectedThemeUnlockAt = state.currentTheme.unlock;

    state.status = 'START';
    uiManager.render(state);
}

/**
 * Set difficulty
 * @param {string} diff - Difficulty level ('easy', 'medium', 'hard')
 * @param {Event} e - Event object
 */
function setDifficulty(diff, e) {
    if (e) e.stopPropagation();
    state.difficulty = diff;
    persistDifficulty(diff);
    uiManager.render(state);
}

/**
 * Main initialization
 */
async function init() {
    const progressEl = document.getElementById('loading-progress');

    // Load initial state
    const { bestScore, bestStreak } = loadBestScores();
    const isMuted = localStorage.getItem('isMuted') === 'true';
    initializeState(bestScore, bestStreak, isMuted);

    if (progressEl) progressEl.style.width = '20%';

    // Initialize UI
    uiManager.init();
    if (progressEl) progressEl.style.width = '50%';

    // Initialize Three.js engine with VR support
    initEngine(state);
    if (progressEl) progressEl.style.width = '75%';

    // Setup VR controllers
    setupControllers();

    // Load game data and show start screen
    await initGameData();
    if (progressEl) progressEl.style.width = '100%';

    // Initialize AdMob
    await adMobService.init();

    // Setup event listeners
    window.addEventListener('resize', () => handleResize(state));

    // Desktop preview mode input (when not in VR)
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0 && !renderer.xr.isPresenting) handleInput(e);
    });

    window.addEventListener('touchstart', (e) => {
        if (!renderer.xr.isPresenting &&
            !e.target.closest('.glass-panel') &&
            !e.target.closest('.round-btn') &&
            !e.target.closest('.powerup-slot') &&
            !e.target.closest('.powerup-inventory') &&
            !e.target.closest('.tutorial-overlay')) {
            e.preventDefault();
            handleInput(e);
        }
    }, { passive: false });

    // Expose global functions for onclick handlers
    window.gameStartNew = (e) => {
        if (e) e.stopPropagation();
        startGame(state, uiManager);
    };

    window.gameResume = (e) => {
        if (e) e.stopPropagation();
        resumeGame(state, uiManager);
    };

    window.gamePause = (e) => {
        if (e) e.stopPropagation();
        pauseGame(state, uiManager);
    };

    window.gameBackToMenu = (e) => {
        if (e) e.stopPropagation();
        backToMenu(state, uiManager);
    };

    window.gameRestart = (e) => {
        if (e) e.stopPropagation();
        startGame(state, uiManager);
    };

    window.gameContinueWithAd = async (e) => {
        if (e) e.stopPropagation();

        // Show rewarded ad and continue if user watches it
        const watched = await adMobService.showRewarded(() => {
            continueGame(state, uiManager);
        });

        // If user didn't watch the ad (closed early), don't continue
        if (!watched) {
            console.log('User closed rewarded ad without watching');
        }
    };

    window.gameSetDiff = (diff, e) => {
        setDifficulty(diff, e);
    };

    window.gameShare = (e) => {
        if (e) e.stopPropagation();
        shareScore(state.score);
    };

    window.gameToggleMute = (e) => {
        uiManager.toggleMute(state, e);
    };

    window.closeTutorial = () => {
        closeTutorial(state);
    };

    window.activatePowerUpSlot = (slotIndex) => {
        activatePowerUp(state, slotIndex);
    };

    // Show tutorial for first-time players
    setTimeout(() => {
        if (!state.hasSeenTutorial && state.status === 'START') {
            const tutorialEl = document.getElementById('tutorial-overlay');
            if (tutorialEl) tutorialEl.style.display = 'flex';
        }
    }, 500);

    // Start animation loop (WebXR-compatible)
    renderer.setAnimationLoop(animate);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
