/**
 * Flora Studio Application Controller
 * Supports multi-plant interactive planting on click, organic growth,
 * wind dynamics, and viewport panning & zooming.
 */

(function () {
  'use strict';

  // Elements
  const treeCanvas = document.getElementById('tree-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  const treeCtx = treeCanvas.getContext('2d');
  const particleCtx = particleCanvas.getContext('2d');
  const viewport = document.getElementById('canvas-viewport');

  // Active Preset & Configuration
  let currentPresetKey = 'cherryBlossom';
  let activeConfig = JSON.parse(JSON.stringify(PLANT_PRESETS[currentPresetKey]));
  // Default: leaves off on initial load
  activeConfig.decorations.terminalLeaf = false;

  // Global Simulation Parameters
  let globalWindEnabled = true;
  let globalWindStrength = 0.04;
  let globalGrowthSpeed = 0.008;
  let globalIsGrowing = true;

  // View Transform (Pan & Zoom)
  const view = {
    x: 0,
    y: 0,
    scale: 1.0,
    isPanning: false,
    startX: 0,
    startY: 0
  };

  // Sprout Click Waves / Ripples for interactive feedback
  const ripples = [];

  /**
   * Individual Plant Instance
   */
  class PlantInstance {
    constructor(x, y, config, seed = Math.random()) {
      this.id = Date.now() + Math.random();
      this.x = x;
      this.y = y;
      this.seed = seed;
      this.config = JSON.parse(JSON.stringify(config));
      this.engine = new PlantGrowthEngine();
      this.engine.windEnabled = globalWindEnabled;
      this.engine.windStrength = globalWindStrength;
      this.engine.growthSpeed = globalGrowthSpeed;
      this.engine.isGrowing = globalIsGrowing;
      this.engine.windTime = Math.random() * 20; // Natural phase variance
      this.engine.generate(this.config, this.seed);
      this.engine.growthProgress = 0.0;
    }

    update(dt) {
      this.engine.windEnabled = globalWindEnabled;
      this.engine.windStrength = globalWindStrength;
      this.engine.growthSpeed = globalGrowthSpeed;
      this.engine.update(dt);
    }

    render(ctx) {
      this.engine.renderTreeOnly(ctx, this.config, this.x, this.y);
    }

    mutate() {
      this.seed = Math.random();
      this.engine.generate(this.config, this.seed);
      this.engine.growthProgress = 0.0;
      this.engine.isGrowing = true;
    }
  }

  // Multi-Plant Collection
  let plants = [];

  // Falling Petals / Spores Particle System
  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.maxParticles = 60;
    }

    reset(width, height) {
      this.particles = [];
      for (let i = 0; i < this.maxParticles; i++) {
        this.particles.push(this.createParticle(width, height, true));
      }
    }

    createParticle(width, height, randomY = false) {
      const isCherry = currentPresetKey === 'cherryBlossom';
      const isAlien = currentPresetKey === 'bioluminescentAlien';

      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -10,
        size: 3 + Math.random() * 5,
        speedX: (Math.random() - 0.2) * 1.5,
        speedY: 0.8 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        color: isCherry
          ? (Math.random() > 0.5 ? '#f497a9' : '#fbc4cb')
          : (isAlien ? (Math.random() > 0.5 ? '#088395' : '#0a9396') : '#7bb369'),
        opacity: 0.45 + Math.random() * 0.4
      };
    }

    update(width, height, windStrength) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.speedX + windStrength * 12;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;

        if (p.y > height + 20 || p.x > width + 40 || p.x < -40) {
          this.particles[i] = this.createParticle(width, height, false);
        }
      }
    }

    render(ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (const p of this.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  const particles = new ParticleSystem();

  /**
   * Resizes canvases to match device resolution
   */
  function handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    treeCanvas.width = width * dpr;
    treeCanvas.height = height * dpr;
    treeCtx.resetTransform();
    treeCtx.scale(dpr, dpr);

    particleCanvas.width = width;
    particleCanvas.height = height;

    particles.reset(width, height);
  }

  /**
   * Automatically centers the first plant in the viewport
   */
  function autoFrameTree() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    view.scale = 1.0;
    view.x = width * 0.5;
    view.y = height * 0.82;
  }

  /**
   * Spawns an interactive ripple effect at the planted location
   */
  function addSproutRipple(worldX, worldY) {
    ripples.push({
      x: worldX,
      y: worldY,
      radius: 3,
      maxRadius: 28,
      alpha: 0.7
    });
  }

  /**
   * Spawns a new plant branch at world coordinates
   */
  function plantAtWorldCoord(worldX, worldY) {
    const newPlant = new PlantInstance(worldX, worldY, activeConfig, Math.random());
    plants.push(newPlant);
    addSproutRipple(worldX, worldY);
  }

  /**
   * Resets simulation and creates initial center plant
   */
  function initFirstPlant() {
    plants = [];
    plantAtWorldCoord(0, 0);
  }

  /**
   * Populates the Preset Selection Dropdown
   */
  function initPresetUI() {
    const select = document.getElementById('select-preset');
    if (!select) return;
    select.innerHTML = '';

    for (const [key, preset] of Object.entries(PLANT_PRESETS)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.name;
      if (key === currentPresetKey) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      const key = e.target.value;
      currentPresetKey = key;
      activeConfig = JSON.parse(JSON.stringify(PLANT_PRESETS[key]));
      updateControlsUI();
    });
  }

  /**
   * Syncs UI slider values with activeConfig
   */
  function updateControlsUI() {
    const presetSel = document.getElementById('select-preset');
    if (presetSel && presetSel.value !== currentPresetKey) {
      presetSel.value = currentPresetKey;
    }

    // Sliders
    document.getElementById('val-angle').textContent = `${activeConfig.angle}°`;
    document.getElementById('slider-angle').value = activeConfig.angle;

    document.getElementById('val-angle-var').textContent = `±${activeConfig.angleVariance}°`;
    document.getElementById('slider-angle-var').value = activeConfig.angleVariance;

    document.getElementById('val-length').textContent = `${activeConfig.branchLength}px`;
    document.getElementById('slider-length').value = activeConfig.branchLength;

    document.getElementById('val-decay').textContent = activeConfig.lengthDecay.toFixed(2);
    document.getElementById('slider-decay').value = activeConfig.lengthDecay;

    document.getElementById('val-iterations').textContent = activeConfig.iterations;
    document.getElementById('slider-iterations').value = activeConfig.iterations;

    document.getElementById('val-growth-speed').textContent = `${(globalGrowthSpeed * 1000).toFixed(0)}`;
    document.getElementById('slider-growth-speed').value = globalGrowthSpeed;

    document.getElementById('val-wind').textContent = `${(globalWindStrength * 100).toFixed(0)}%`;
    document.getElementById('slider-wind').value = globalWindStrength;

    document.getElementById('toggle-wind').checked = globalWindEnabled;
    document.getElementById('toggle-leaves').checked = activeConfig.decorations.terminalLeaf !== false;
    document.getElementById('toggle-flowers').checked = !!activeConfig.decorations.terminalFlower;

    // Rules JSON (if editor is present)
    const axiomInput = document.getElementById('input-axiom');
    if (axiomInput) axiomInput.value = activeConfig.axiom;
    const rulesInput = document.getElementById('input-rules');
    if (rulesInput) rulesInput.value = JSON.stringify(activeConfig.productions, null, 2);
  }

  /**
   * Sets up all event listeners for interactive buttons, sliders, and canvas clicking
   */
  function setupEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => {
      handleResize();
    });

    // Dock Buttons
    const btnPlayPause = document.getElementById('btn-play-pause');
    btnPlayPause.addEventListener('click', () => {
      globalIsGrowing = !globalIsGrowing;
      plants.forEach(p => p.engine.isGrowing = globalIsGrowing);
      btnPlayPause.innerHTML = globalIsGrowing ? '⏸ 일시정지' : '▶ 재생';
    });

    document.getElementById('btn-resprout').addEventListener('click', () => {
      globalIsGrowing = true;
      plants.forEach(p => {
        p.engine.growthProgress = 0.0;
        p.engine.isGrowing = true;
      });
      btnPlayPause.innerHTML = '⏸ 일시정지';
    });

    document.getElementById('btn-mutate').addEventListener('click', () => {
      if (plants.length > 0) {
        // Mutate the most recent plant or all
        const target = plants[plants.length - 1];
        target.mutate();
      } else {
        plantAtWorldCoord(0, 0);
      }
      globalIsGrowing = true;
      btnPlayPause.innerHTML = '⏸ 일시정지';
    });

    // Clear all plants button
    document.getElementById('btn-clear-plants')?.addEventListener('click', () => {
      plants = [];
    });

    // Growth Scrubber Slider
    const growthScrubber = document.getElementById('slider-growth-progress');
    growthScrubber.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      plants.forEach(p => {
        p.engine.growthProgress = val;
      });
      document.getElementById('val-growth-progress').textContent = `${(val * 100).toFixed(0)}%`;
    });

    // Parameter Sliders
    document.getElementById('slider-angle').addEventListener('input', (e) => {
      activeConfig.angle = parseFloat(e.target.value);
      document.getElementById('val-angle').textContent = `${activeConfig.angle}°`;
    });

    document.getElementById('slider-angle-var').addEventListener('input', (e) => {
      activeConfig.angleVariance = parseFloat(e.target.value);
      document.getElementById('val-angle-var').textContent = `±${activeConfig.angleVariance}°`;
    });

    document.getElementById('slider-length').addEventListener('input', (e) => {
      activeConfig.branchLength = parseFloat(e.target.value);
      document.getElementById('val-length').textContent = `${activeConfig.branchLength}px`;
    });

    document.getElementById('slider-decay').addEventListener('input', (e) => {
      activeConfig.lengthDecay = parseFloat(e.target.value);
      document.getElementById('val-decay').textContent = activeConfig.lengthDecay.toFixed(2);
    });

    document.getElementById('slider-iterations').addEventListener('input', (e) => {
      activeConfig.iterations = parseInt(e.target.value, 10);
      document.getElementById('val-iterations').textContent = activeConfig.iterations;
    });

    document.getElementById('slider-growth-speed').addEventListener('input', (e) => {
      globalGrowthSpeed = parseFloat(e.target.value);
      plants.forEach(p => p.engine.growthSpeed = globalGrowthSpeed);
      document.getElementById('val-growth-speed').textContent = `${(globalGrowthSpeed * 1000).toFixed(0)}`;
    });

    document.getElementById('slider-wind').addEventListener('input', (e) => {
      globalWindStrength = parseFloat(e.target.value);
      plants.forEach(p => p.engine.windStrength = globalWindStrength);
      document.getElementById('val-wind').textContent = `${(globalWindStrength * 100).toFixed(0)}%`;
    });

    document.getElementById('toggle-wind').addEventListener('change', (e) => {
      globalWindEnabled = e.target.checked;
      plants.forEach(p => p.engine.windEnabled = globalWindEnabled);
    });

    document.getElementById('toggle-leaves').addEventListener('change', (e) => {
      activeConfig.decorations.terminalLeaf = e.target.checked;
      plants.forEach(p => {
        p.config.decorations.terminalLeaf = e.target.checked;
      });
    });

    document.getElementById('toggle-flowers').addEventListener('change', (e) => {
      activeConfig.decorations.terminalFlower = e.target.checked;
      plants.forEach(p => {
        p.config.decorations.terminalFlower = e.target.checked;
      });
    });

    // Custom Rules Apply Button
    document.getElementById('btn-apply-rules')?.addEventListener('click', () => {
      try {
        const axiom = document.getElementById('input-axiom').value.trim();
        const rules = JSON.parse(document.getElementById('input-rules').value);
        activeConfig.axiom = axiom;
        activeConfig.productions = rules;
      } catch (err) {
        alert('L-System 규칙 JSON 형식에 오류가 있습니다:\n' + err.message);
      }
    });

    // Background Color Customizer
    const bgPicker = document.getElementById('picker-bg-color');
    const bgPresetSelect = document.getElementById('select-bg-preset');
    const bgBadge = document.getElementById('val-bg-color');

    function applyBackgroundColor(hexColor) {
      if (!hexColor || hexColor === 'custom') return;
      document.body.style.background = hexColor;
      if (bgPicker) bgPicker.value = hexColor;
      if (bgBadge) bgBadge.textContent = hexColor.toUpperCase();

      // Calculate relative luminance to automatically adjust UI contrast
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      document.body.className = '';
      if (luminance < 0.45) {
        document.body.classList.add('theme-midnight');
      } else {
        document.body.classList.add('theme-parchment');
      }
    }

    if (bgPicker) {
      bgPicker.addEventListener('input', (e) => {
        if (bgPresetSelect) bgPresetSelect.value = 'custom';
        applyBackgroundColor(e.target.value);
      });
    }

    // Apply default background on initial load
    applyBackgroundColor('#1c241f');

    if (bgPresetSelect) {
      bgPresetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val !== 'custom') {
          applyBackgroundColor(val);
        }
      });
    }

    // Canvas Interaction: Click to Sprout New Plant vs Pan/Drag Viewport
    let pointerDownInfo = null;
    let isDragging = false;

    viewport.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        pointerDownInfo = {
          clientX: e.clientX,
          clientY: e.clientY,
          time: performance.now(),
          startX: e.clientX - view.x,
          startY: e.clientY - view.y
        };
        isDragging = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!pointerDownInfo) return;

      const dist = Math.hypot(e.clientX - pointerDownInfo.clientX, e.clientY - pointerDownInfo.clientY);
      if (dist > 5) {
        isDragging = true;
        view.isPanning = true;
        viewport.classList.add('panning');
        view.x = e.clientX - pointerDownInfo.startX;
        view.y = e.clientY - pointerDownInfo.startY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (pointerDownInfo) {
        const dist = Math.hypot(e.clientX - pointerDownInfo.clientX, e.clientY - pointerDownInfo.clientY);
        const elapsed = performance.now() - pointerDownInfo.time;

        // If it was a clean stationary click without significant dragging:
        if (!isDragging && dist < 6 && elapsed < 400) {
          // Check if click was inside viewport and not on floating panels
          const rect = viewport.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;

          // Convert screen coordinates into world coordinates
          const worldX = (screenX - view.x) / view.scale;
          const worldY = (screenY - view.y) / view.scale;

          // Plant a new branch/tree at click location!
          plantAtWorldCoord(worldX, worldY);
        }

        pointerDownInfo = null;
        isDragging = false;
        view.isPanning = false;
        viewport.classList.remove('panning');
      }
    });

    // Zoom toward cursor
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      view.x = mouseX - (mouseX - view.x) * zoomFactor;
      view.y = mouseY - (mouseY - view.y) * zoomFactor;
      view.scale *= zoomFactor;
      view.scale = Math.max(0.15, Math.min(5.0, view.scale));
    }, { passive: false });

    // Collapsible panels
    document.querySelectorAll('.accordion-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const content = hdr.nextElementSibling;
        const icon = hdr.querySelector('.toggle-icon');
        if (content.style.display === 'none') {
          content.style.display = 'flex';
          if (icon) icon.textContent = '▾';
        } else {
          content.style.display = 'none';
          if (icon) icon.textContent = '▸';
        }
      });
    });
  }

  /**
   * Main Simulation & Animation Loop
   */
  let lastTime = performance.now();
  function loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    treeCtx.clearRect(0, 0, width, height);

    treeCtx.save();
    treeCtx.translate(view.x, view.y);
    treeCtx.scale(view.scale, view.scale);

    // Update and render all planted plants
    for (const plant of plants) {
      plant.update(dt);
      plant.render(treeCtx);
    }

    // Render ripple waves for newly sprouted branches
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.radius += dt * 38;
      rip.alpha -= dt * 1.2;

      if (rip.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }

      treeCtx.save();
      treeCtx.beginPath();
      treeCtx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      treeCtx.strokeStyle = `rgba(45, 106, 79, ${Math.max(0, rip.alpha)})`;
      treeCtx.lineWidth = 1.8 / view.scale;
      treeCtx.stroke();
      treeCtx.restore();
    }

    treeCtx.restore();

    // Update scrubber UI with average or latest progress
    if (plants.length > 0) {
      const latest = plants[plants.length - 1];
      const prog = latest.engine.growthProgress;
      growthScrubber.value = prog;
      document.getElementById('val-growth-progress').textContent = `${(prog * 100).toFixed(0)}%`;
    }

    // Update and render particle system (petals & spores)
    particles.update(width, height, globalWindEnabled ? globalWindStrength : 0);
    particles.render(particleCtx);

    requestAnimationFrame(loop);
  }

  const growthScrubber = document.getElementById('slider-growth-progress');

  // Initialization
  function init() {
    handleResize();
    initPresetUI();
    updateControlsUI();
    setupEventListeners();
    initFirstPlant();
    autoFrameTree();
    requestAnimationFrame(loop);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
