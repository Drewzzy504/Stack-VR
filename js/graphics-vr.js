/**
 * Graphics Module (VR) - Three.js scene setup with WebXR support
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';

// Three.js globals (will be initialized by initEngine)
export let scene = null;
export let camera = null;
export let cameraGroup = null;
export let renderer = null;
export let composer = null;
export let bloomPass = null;
export let pointLight = null;
export let nebula = null;
export let starLayerBack = null;
export let starLayerMid = null;
export let rubbleInstances = null;
export let planets = [];

// VR-specific globals
export let vrButton = null;
export let controllers = [];
export let controllerGrips = [];

// 3D UI Text elements for VR
export let scoreText = null;
export let comboText = null;
export let uiGroup = null;

/**
 * Create starfield effect
 * @param {number} count - Number of stars
 * @param {number} size - Star size
 * @param {number} dist - Distance from origin
 * @param {number} opacity - Star opacity
 * @param {boolean} isDistant - Whether stars are in distant layer
 * @returns {THREE.Points} - Star field points
 */
export function createStarfield(count, size, dist, opacity, isDistant) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const r = dist + (isDistant ? Math.random() * 120 : Math.random() * 60);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        const hue = Math.random() > 0.8 ? Math.random() * 0.2 + 0.5 : 0;
        const sat = hue > 0 ? 0.4 : 0;
        const brightness = 0.6 + Math.random() * 0.4;
        const color = new THREE.Color().setHSL(hue, sat, brightness);

        cols[i * 3] = color.r;
        cols[i * 3 + 1] = color.g;
        cols[i * 3 + 2] = color.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(cols, 3));

    return new THREE.Points(
        geom,
        new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity,
            sizeAttenuation: true,
            fog: false
        })
    );
}

/**
 * Create orbiting planets
 */
export function createPlanets() {
    // Only create planets once - they persist throughout the game
    if (planets.length > 0) return;

    const planetDefinitions = [
        {
            name: 'Saturn',
            size: 28,
            color: 0xf4d03f,
            angle: Math.PI + 0.6,
            distance: 250,
            speed: 0.0004,
            rotSpeed: 0.0015,
            ring: true,
            yOffset: -15
        }
    ];

    planetDefinitions.forEach((def) => {
        const geom = new THREE.SphereGeometry(def.size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: def.color,
            metalness: 0.2,
            roughness: 0.6,
            emissive: new THREE.Color(def.color).multiplyScalar(0.6)
        });
        const planet = new THREE.Mesh(geom, mat);
        planet.scale.set(1, 0.98, 1);

        // Set initial position based on angle and distance
        planet.position.x = Math.cos(def.angle) * def.distance;
        planet.position.z = Math.sin(def.angle) * def.distance;
        planet.position.y = def.yOffset;

        // Add Saturn rings
        if (def.ring) {
            const ringGeom = new THREE.TorusGeometry(def.size * 1.9, def.size * 0.2, 32, 100);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xe8c89a,
                metalness: 0.2,
                roughness: 0.5,
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(0xe8c89a).multiplyScalar(0.5)
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2 + 0.5;
            planet.add(ring);
        }

        planet.userData = {
            distance: def.distance,
            speed: def.speed,
            rotSpeed: def.rotSpeed,
            angle: def.angle
        };

        planet.castShadow = true;
        planet.receiveShadow = true;

        scene.add(planet);
        planets.push(planet);
    });
}

/**
 * Create glass material for blocks
 * @param {THREE.Color|number} color - Material color
 * @returns {THREE.MeshStandardMaterial} - Glass material
 */
export function createGlassMaterial(color) {
    return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.9,
        metalness: 0.25,
        roughness: 0.18,
        transparent: true,
        opacity: 0.92
    });
}

/**
 * Update theme visuals on all blocks
 * @param {object} state - Game state
 */
export function updateThemeVisuals(state) {
    state.stack.forEach((m, i) => {
        const c = new THREE.Color(state.currentTheme.colors[i % state.currentTheme.colors.length]);
        m.material.color.copy(c);
        if (m.material.emissive) m.material.emissive.copy(c);
    });
}

/**
 * Create foundation block
 * @param {object} state - Game state
 */
export function createFoundation(state) {
    const geom = new THREE.BoxGeometry(CONFIG.INITIAL_SIZE, CONFIG.BLOCK_HEIGHT, CONFIG.INITIAL_SIZE);
    const baseColor = new THREE.Color(state.currentTheme.colors[0]);
    const mat = createGlassMaterial(baseColor);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, CONFIG.BLOCK_HEIGHT / 2, 0);

    mesh.userData = {
        baseWidth: CONFIG.INITIAL_SIZE,
        baseDepth: CONFIG.INITIAL_SIZE
    };

    scene.add(mesh);
    state.stack.push(mesh);
    updateThemeVisuals(state);
}

/**
 * Create 3D UI elements for VR
 */
function createVRUI() {
    uiGroup = new THREE.Group();

    // Position UI in front of and above the player's typical viewing area
    uiGroup.position.set(0, 12, -2);

    // Create score display using sprites for simplicity
    const createTextSprite = (text, color = '#00ffff') => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        context.fillStyle = color;
        context.font = 'bold 72px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 1, 1);

        sprite.userData.canvas = canvas;
        sprite.userData.context = context;
        sprite.userData.texture = texture;
        sprite.userData.color = color;

        return sprite;
    };

    scoreText = createTextSprite('SCORE: 0', '#00ffff');
    scoreText.position.set(0, 0.5, 0);
    uiGroup.add(scoreText);

    comboText = createTextSprite('', '#ff0070');
    comboText.position.set(0, -0.5, 0);
    comboText.visible = false;
    uiGroup.add(comboText);

    scene.add(uiGroup);
}

/**
 * Update VR UI text
 * @param {string} text - Text to display
 * @param {THREE.Sprite} sprite - Sprite to update
 * @param {string} color - Text color
 */
export function updateVRText(text, sprite, color) {
    if (!sprite || !sprite.userData.canvas) return;

    const canvas = sprite.userData.canvas;
    const context = sprite.userData.context;
    const texture = sprite.userData.texture;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw new text
    context.fillStyle = color || sprite.userData.color;
    context.font = 'bold 72px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);

    // Update texture
    texture.needsUpdate = true;
}

/**
 * Create VR controller visualization
 * @param {number} index - Controller index (0 or 1)
 * @returns {THREE.Group} - Controller group
 */
function createControllerVisual(index) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 1], 3));

    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    line.name = 'line';
    line.scale.z = 5;

    const group = new THREE.Group();
    group.add(line);

    return group;
}

/**
 * Initialize Three.js engine and scene with VR support
 * @param {object} state - Game state
 */
export function initEngine(state) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000005);
    scene.fog = new THREE.FogExp2(0x000005, 0.008);

    // Create camera group (Dolly) for VR movement
    cameraGroup = new THREE.Group();
    scene.add(cameraGroup);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraGroup.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.PIXEL_RATIO_CAP));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Enable WebXR
    renderer.xr.enabled = true;

    const rootEl = document.getElementById('root');
    rootEl.appendChild(renderer.domElement);

    // Add VR button
    vrButton = VRButton.createButton(renderer);
    document.body.appendChild(vrButton);

    // Setup controllers
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.userData.index = i;
        cameraGroup.add(controller);
        controllers.push(controller);

        const controllerGrip = renderer.xr.getControllerGrip(i);
        cameraGroup.add(controllerGrip);
        controllerGrips.push(controllerGrip);

        // Add visual line for pointing
        const visual = createControllerVisual(i);
        controller.add(visual);
    }

    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth / CONFIG.BLOOM_RES_DIV, window.innerHeight / CONFIG.BLOOM_RES_DIV),
        0.5,
        0.25,
        0.90
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    scene.add(new THREE.HemisphereLight(0x00ffff, 0xff00ff, 0.5));
    pointLight = new THREE.PointLight(0x00ffff, 6, 60);
    scene.add(pointLight);

    // Create nebula background
    const nebulaGeom = new THREE.SphereGeometry(400, 32, 32);
    const nebulaMat = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        vertexColors: true,
        transparent: true,
        opacity: 0.25
    });
    const count = nebulaGeom.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const c = new THREE.Color().setHSL(Math.random() * 0.15 + 0.55, 0.6, 0.25);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    nebulaGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    nebula = new THREE.Mesh(nebulaGeom, nebulaMat);
    scene.add(nebula);

    // Create starfield layers
    starLayerBack = createStarfield(CONFIG.STARCOUNT_BACK, 0.55, 250, 0.55, true);
    scene.add(starLayerBack);
    starLayerMid = createStarfield(CONFIG.STARCOUNT_MID, 0.9, 180, 0.8, true);
    scene.add(starLayerMid);

    // Create orbiting planets
    createPlanets();

    // Initialize rubble system (instanced mesh for performance)
    const rubbleGeom = new THREE.BoxGeometry(1, 1, 1);
    const rubbleMat = new THREE.MeshStandardMaterial({
        metalness: 0.5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8
    });
    rubbleInstances = new THREE.InstancedMesh(rubbleGeom, rubbleMat, CONFIG.MAX_RUBBLE);
    rubbleInstances.frustumCulled = false;

    state.rubbleFree.length = 0;
    state.rubbleActive.length = 0;

    for (let i = 0; i < CONFIG.MAX_RUBBLE; i++) {
        rubbleInstances.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, -500, 0));
        rubbleInstances.setColorAt(i, new THREE.Color(0xffffff));
        state.rubbleFree.push(i);
        state.rubbleData[i] = {
            isActive: false,
            position: new THREE.Vector3(0, -500, 0),
            rotation: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3()
        };
    }
    scene.add(rubbleInstances);

    createFoundation(state);

    // Create VR UI elements
    createVRUI();

    // Set initial camera position for VR (positioned to view the tower)
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 2, 0);
}

/**
 * Handle window resize
 * @param {object} state - Game state
 */
export function handleResize(state) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    const div = state.qualityLow ? CONFIG.BLOOM_RES_DIV_LOW : CONFIG.BLOOM_RES_DIV;
    if (bloomPass) bloomPass.setSize(window.innerWidth / div, window.innerHeight / div);

    const prCap = state.qualityLow ? CONFIG.PIXEL_RATIO_LOW : CONFIG.PIXEL_RATIO_CAP;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap));
}

/**
 * Adapt quality based on performance
 * @param {object} state - Game state
 */
export function adaptQuality(state) {
    if (!renderer) return;

    if (!state.qualityLow && state.fpsAvg < CONFIG.FPS_LOW) {
        state.qualityLow = true;
        const pr = Math.min(window.devicePixelRatio || 1, CONFIG.PIXEL_RATIO_LOW);
        renderer.setPixelRatio(pr);

        if (bloomPass) {
            bloomPass.enabled = false;
            bloomPass.setSize(
                window.innerWidth / CONFIG.BLOOM_RES_DIV_LOW,
                window.innerHeight / CONFIG.BLOOM_RES_DIV_LOW
            );
        }
    } else if (state.qualityLow && state.fpsAvg > CONFIG.FPS_HIGH) {
        state.qualityLow = false;
        const pr = Math.min(window.devicePixelRatio || 1, CONFIG.PIXEL_RATIO_CAP);
        renderer.setPixelRatio(pr);

        if (bloomPass) {
            bloomPass.enabled = true;
            bloomPass.setSize(
                window.innerWidth / CONFIG.BLOOM_RES_DIV,
                window.innerHeight / CONFIG.BLOOM_RES_DIV
            );
        }
    }
}
