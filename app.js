/**
 * Flora Studio Application Controller
 * Handles UI interactions, canvas view transformations, particle effects,
 * and connects with PlantGrowthEngine & Lindenmayer.js.
 */

(function () {
  'use strict';

  // Elements
  const treeCanvas = document.getElementById('tree-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  const treeCtx = treeCanvas.getContext('2d');
  const particleCtx = particleCanvas.getContext('2d');
  const viewport = document.getElementById('canvas-viewport');

  // Engines
  const engine = new PlantGrowthEngine();

  // Active State
  let currentPresetKey = 'cherryBlossom';
  let activeConfig = JSON.parse(JSON.stringify(PLANT_PRESETS[currentPresetKey]));

  // View Transform (Pan & Zoom)
  const view = {
    x: 0,
    y: 0,
    scale: 1.0,
    isPanning: false,
    startX: 0,
    startY: 0
  };

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
          ? (Math.random() > 0.5 ? '#ffb7c5' : '#ffccd5')
          : (isAlien ? (Math.random() > 0.5 ? '#06b6d4' : '#ec4899') : '#a7f3d0'),
        glow: isAlien,
        opacity: 0.4 + Math.random() * 0.5
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

        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Petal shape
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
   * Automatically centers the tree within the viewport
   */
  function autoFrameTree() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const b = engine.bounds;

    const availableW = width * 0.65;
    const availableH = height * 0.72;
    const scaleX = availableW / b.width;
    const scaleY = availableH / b.height;
    view.scale = Math.min(1.8, Math.max(0.4, Math.min(scaleX, scaleY)));

    // Position trunk root in lower center of viewport
    view.x = width * 0.5;
    view.y = height * 0.82;
  }

  /**
   * Generates tree and resets animation
   */
  function rebuildSimulation(keepProgress = false) {
    const oldProgress = engine.growthProgress;
    const stats = engine.generate(activeConfig, engine.currentSeed);

    if (!keepProgress) {
      engine.growthProgress = 0.0;
      engine.isGrowing = true;
    } else {
      engine.growthProgress = oldProgress;
    }

    updateStatsHUD(stats);
    updateControlsUI();
  }

  /**
   * Updates HUD statistics display
   */
  function updateStatsHUD(stats) {
    if (!stats) return;
    document.getElementById('stat-iterations').textContent = activeConfig.iterations;
    document.getElementById('stat-branches').textContent = stats.totalBranches.toLocaleString();
    document.getElementById('stat-depth').textContent = stats.maxDepth;
    document.getElementById('stat-leaves').textContent = (stats.leafCount + stats.flowerCount).toLocaleString();
    document.getElementById('stat-axiom-len').textContent = stats.axiomResult.length.toLocaleString();
  }

  /**
   * Populates the Preset Selection List
   */
  function initPresetUI() {
    const container = document.getElementById('preset-list');
    container.innerHTML = '';

    for (const [key, preset] of Object.entries(PLANT_PRESETS)) {
      const card = document.createElement('div');
      card.className = `preset-card ${key === currentPresetKey ? 'active' : ''}`;
      card.innerHTML = `
        <div class="preset-card-header">
          <span class="preset-card-name">${preset.name}</span>
          <span class="preset-card-tag">${preset.category}</span>
        </div>
        <p class="preset-card-desc">${preset.description}</p>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentPresetKey = key;
        activeConfig = JSON.parse(JSON.stringify(PLANT_PRESETS[key]));
        engine.currentSeed = Math.random();
        rebuildSimulation(false);
        autoFrameTree();
      });

      container.appendChild(card);
    }
  }

  /**
   * Syncs UI slider values with activeConfig
   */
  function updateControlsUI() {
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

    document.getElementById('val-growth-speed').textContent = `${(engine.growthSpeed * 1000).toFixed(0)}`;
    document.getElementById('slider-growth-speed').value = engine.growthSpeed;

    document.getElementById('val-wind').textContent = `${(engine.windStrength * 100).toFixed(0)}%`;
    document.getElementById('slider-wind').value = engine.windStrength;

    document.getElementById('toggle-wind').checked = engine.windEnabled;
    document.getElementById('toggle-leaves').checked = activeConfig.decorations.terminalLeaf !== false;
    document.getElementById('toggle-flowers').checked = !!activeConfig.decorations.terminalFlower;

    // Rules JSON
    document.getElementById('input-axiom').value = activeConfig.axiom;
    document.getElementById('input-rules').value = JSON.stringify(activeConfig.productions, null, 2);
  }

  /**
   * Sets up all event listeners for interactive buttons and sliders
   */
  function setupEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => {
      handleResize();
      autoFrameTree();
    });

    // Dock Buttons
    const btnPlayPause = document.getElementById('btn-play-pause');
    btnPlayPause.addEventListener('click', () => {
      engine.isGrowing = !engine.isGrowing;
      btnPlayPause.innerHTML = engine.isGrowing ? '⏸ 일시정지' : '▶ 재생';
    });

    document.getElementById('btn-resprout').addEventListener('click', () => {
      engine.growthProgress = 0.0;
      engine.isGrowing = true;
      btnPlayPause.innerHTML = '⏸ 일시정지';
    });

    document.getElementById('btn-mutate').addEventListener('click', () => {
      engine.currentSeed = Math.random();
      rebuildSimulation(false);
      btnPlayPause.innerHTML = '⏸ 일시정지';
    });

    // Growth Scrubber Slider
    const growthScrubber = document.getElementById('slider-growth-progress');
    growthScrubber.addEventListener('input', (e) => {
      engine.growthProgress = parseFloat(e.target.value);
    });

    // Parameter Sliders
    document.getElementById('slider-angle').addEventListener('input', (e) => {
      activeConfig.angle = parseFloat(e.target.value);
      document.getElementById('val-angle').textContent = `${activeConfig.angle}°`;
      rebuildSimulation(true);
    });

    document.getElementById('slider-angle-var').addEventListener('input', (e) => {
      activeConfig.angleVariance = parseFloat(e.target.value);
      document.getElementById('val-angle-var').textContent = `±${activeConfig.angleVariance}°`;
      rebuildSimulation(true);
    });

    document.getElementById('slider-length').addEventListener('input', (e) => {
      activeConfig.branchLength = parseFloat(e.target.value);
      document.getElementById('val-length').textContent = `${activeConfig.branchLength}px`;
      rebuildSimulation(true);
    });

    document.getElementById('slider-decay').addEventListener('input', (e) => {
      activeConfig.lengthDecay = parseFloat(e.target.value);
      document.getElementById('val-decay').textContent = activeConfig.lengthDecay.toFixed(2);
      rebuildSimulation(true);
    });

    document.getElementById('slider-iterations').addEventListener('input', (e) => {
      activeConfig.iterations = parseInt(e.target.value, 10);
      document.getElementById('val-iterations').textContent = activeConfig.iterations;
      rebuildSimulation(false);
      autoFrameTree();
    });

    document.getElementById('slider-growth-speed').addEventListener('input', (e) => {
      engine.growthSpeed = parseFloat(e.target.value);
      document.getElementById('val-growth-speed').textContent = `${(engine.growthSpeed * 1000).toFixed(0)}`;
    });

    document.getElementById('slider-wind').addEventListener('input', (e) => {
      engine.windStrength = parseFloat(e.target.value);
      document.getElementById('val-wind').textContent = `${(engine.windStrength * 100).toFixed(0)}%`;
    });

    document.getElementById('toggle-wind').addEventListener('change', (e) => {
      engine.windEnabled = e.target.checked;
    });

    document.getElementById('toggle-leaves').addEventListener('change', (e) => {
      activeConfig.decorations.terminalLeaf = e.target.checked;
      rebuildSimulation(true);
    });

    document.getElementById('toggle-flowers').addEventListener('change', (e) => {
      activeConfig.decorations.terminalFlower = e.target.checked;
      rebuildSimulation(true);
    });

    // Custom Rules Apply Button
    document.getElementById('btn-apply-rules').addEventListener('click', () => {
      try {
        const axiom = document.getElementById('input-axiom').value.trim();
        const rules = JSON.parse(document.getElementById('input-rules').value);
        activeConfig.axiom = axiom;
        activeConfig.productions = rules;
        rebuildSimulation(false);
        autoFrameTree();
      } catch (err) {
        alert('L-System 규칙 JSON 형식에 오류가 있습니다:\n' + err.message);
      }
    });

    // Theme Selector
    document.getElementById('select-theme').addEventListener('change', (e) => {
      const theme = e.target.value;
      document.body.className = '';
      if (theme !== 'midnight') {
        document.body.classList.add(`theme-${theme}`);
      }
    });

    // Canvas Pan & Zoom Mouse Events
    viewport.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        view.isPanning = true;
        view.startX = e.clientX - view.x;
        view.startY = e.clientY - view.y;
        viewport.classList.add('panning');
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (view.isPanning) {
        view.x = e.clientX - view.startX;
        view.y = e.clientY - view.startY;
      }
    });

    window.addEventListener('mouseup', () => {
      view.isPanning = false;
      viewport.classList.remove('panning');
    });

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Zoom toward cursor
      view.x = mouseX - (mouseX - view.x) * zoomFactor;
      view.y = mouseY - (mouseY - view.y) * zoomFactor;
      view.scale *= zoomFactor;
      view.scale = Math.max(0.2, Math.min(5.0, view.scale));
    }, { passive: false });

    // View Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      view.scale = Math.min(5.0, view.scale * 1.25);
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      view.scale = Math.max(0.2, view.scale * 0.8);
    });

    document.getElementById('btn-reset-view').addEventListener('click', () => {
      autoFrameTree();
    });

    // Export PNG
    document.getElementById('btn-capture').addEventListener('click', () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = treeCanvas.width;
      tempCanvas.height = treeCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw background
      tempCtx.fillStyle = '#0a0d14';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(treeCanvas, 0, 0);

      const link = document.createElement('a');
      link.download = `lindenmayer-plant-${currentPresetKey}-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    });

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

    // Update Growth and Wind
    engine.update(dt);

    // Sync Scrubber Slider with growth progress
    growthScrubber.value = engine.growthProgress;
    document.getElementById('val-growth-progress').textContent = `${(engine.growthProgress * 100).toFixed(0)}%`;

    // Render tree
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    treeCtx.clearRect(0, 0, width, height);
    engine.render(treeCtx, activeConfig, view);

    // Update and render particle system (petals & spores)
    particles.update(width, height, engine.windEnabled ? engine.windStrength : 0);
    particles.render(particleCtx);

    requestAnimationFrame(loop);
  }

  const growthScrubber = document.getElementById('slider-growth-progress');

  // Initialization
  function init() {
    handleResize();
    initPresetUI();
    setupEventListeners();
    rebuildSimulation(false);
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
