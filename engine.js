/**
 * Organic L-System Simulation Engine
 * Integrates nylki/lindenmayer library to generate trees, parse branch hierarchies,
 * and calculate organic growth progress and realistic wind dynamics.
 */

class PlantGrowthEngine {
  constructor() {
    this.lSystem = null;
    this.treeRoot = null;
    this.allNodes = [];
    this.totalBranches = 0;
    this.maxDepth = 1;
    this.currentSeed = Math.random();

    // Simulation & Animation parameters
    this.growthProgress = 0.0; // 0.0 to 1.0
    this.targetGrowth = 1.0;
    this.isGrowing = true;
    this.growthSpeed = 0.008; // Per frame increment

    this.windEnabled = true;
    this.windStrength = 0.04;
    this.windSpeed = 2.0;
    this.windTime = 0;

    // View & Transform
    this.bounds = { minX: -100, maxX: 100, minY: -200, maxY: 0, width: 200, height: 200 };
    this.currentAxiomResult = '';
  }

  /**
   * Builds an LSystem using nylki/lindenmayer and generates the tree structure
   */
  generate(config, seed = Math.random()) {
    this.currentSeed = seed;
    // Seeded pseudo-random generator
    let s = Math.floor(seed * 1000000) + 1;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // Prepare options for nylki/lindenmayer
    const axiom = config.axiom || 'X';
    const productions = {};

    // Deep copy / transform productions so they can utilize random weights or functions
    for (const [key, val] of Object.entries(config.productions)) {
      if (typeof val === 'string') {
        productions[key] = val;
      } else if (val && val.successors) {
        // Stochastic production compatible with lindenmayer.js
        productions[key] = {
          successors: val.successors.map(sc => ({
            weight: sc.weight,
            successor: sc.successor
          }))
        };
      } else {
        productions[key] = val;
      }
    }

    // Initialize nylki/lindenmayer instance
    if (typeof LSystem === 'undefined') {
      console.error('LSystem library is not loaded!');
      return null;
    }

    this.lSystem = new LSystem({
      axiom: axiom,
      productions: productions
    });

    // Iterate
    const iterations = Math.max(1, Math.min(7, config.iterations || 4));
    this.currentAxiomResult = this.lSystem.iterate(iterations);

    // Build hierarchical tree graph from string
    this.buildTreeGraph(this.currentAxiomResult, config, rng);

    // Measure bounding box
    this.calculateBounds();

    return {
      axiomResult: this.currentAxiomResult,
      totalBranches: this.totalBranches,
      maxDepth: this.maxDepth,
      leafCount: this.allNodes.filter(n => n.leaf).length,
      flowerCount: this.allNodes.filter(n => n.flower).length
    };
  }

  /**
   * Parses the L-System string into a hierarchical Node graph
   */
  buildTreeGraph(str, config, rng) {
    this.allNodes = [];
    this.maxDepth = 1;

    const baseAngleRad = ((config.angle || 25) * Math.PI) / 180;
    const angleVarRad = (((config.angleVariance || 6) * Math.PI) / 180);
    const baseLength = config.branchLength || 25;
    const lengthDecay = config.lengthDecay || 0.75;
    const baseThickness = config.baseThickness || 8;
    const decayThickness = config.decayThickness || 0.7;

    const rootNode = {
      id: 0,
      depth: 0,
      order: 0,
      parent: null,
      children: [],
      relAngle: 0,
      length: baseLength,
      thickness: baseThickness,
      naturalCurvature: (rng() - 0.5) * 0.1,
      leaf: null,
      flower: null
    };

    this.treeRoot = rootNode;
    this.allNodes.push(rootNode);

    let currentNode = rootNode;
    const stateStack = [];
    let currentLength = baseLength;
    let currentThickness = baseThickness;
    let currentDepth = 0;
    let nodeCounter = 1;

    // First pass: build tree structure
    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === 'F' || char === 'G') {
        // Forward branch segment
        const angleJitter = (rng() - 0.5) * 2 * angleVarRad;
        const lengthJitter = 1 + (rng() - 0.5) * 0.2;

        const newNode = {
          id: nodeCounter++,
          depth: currentDepth,
          order: 0, // will be assigned in BFS/DFS topological order
          parent: currentNode,
          children: [],
          relAngle: angleJitter,
          length: currentLength * lengthJitter,
          thickness: currentThickness,
          naturalCurvature: (rng() - 0.5) * 0.15,
          leaf: null,
          flower: null
        };

        currentNode.children.push(newNode);
        this.allNodes.push(newNode);
        currentNode = newNode;

        if (currentDepth > this.maxDepth) {
          this.maxDepth = currentDepth;
        }
      } else if (char === '+') {
        // Turn right
        const jitter = (rng() - 0.5) * 2 * angleVarRad;
        if (currentNode) {
          currentNode.relAngle += (baseAngleRad + jitter);
        }
      } else if (char === '-') {
        // Turn left
        const jitter = (rng() - 0.5) * 2 * angleVarRad;
        if (currentNode) {
          currentNode.relAngle -= (baseAngleRad + jitter);
        }
      } else if (char === '[') {
        // Push state
        stateStack.push({
          node: currentNode,
          length: currentLength,
          thickness: currentThickness,
          depth: currentDepth
        });
        currentDepth++;
        currentLength *= lengthDecay;
        currentThickness *= decayThickness;
      } else if (char === ']') {
        // Pop state
        if (stateStack.length > 0) {
          const popped = stateStack.pop();
          currentNode = popped.node;
          currentLength = popped.length;
          currentThickness = popped.thickness;
          currentDepth = popped.depth;
        }
      }
    }

    // Topological sorting for natural growth animation (trunk first, then secondary, then tips)
    this.assignGrowthOrder();

    // Add leaves and flowers to terminal branches or high-depth nodes
    this.populateDecorations(config, rng);

    this.totalBranches = this.allNodes.length;
  }

  /**
   * Assigns growth order so branches grow organically from bottom to top
   */
  assignGrowthOrder() {
    let orderCounter = 0;
    // Breadth-First-Search ensures trunk grows before side branches, which grow before twigs
    const queue = [this.treeRoot];
    while (queue.length > 0) {
      const node = queue.shift();
      node.order = orderCounter++;
      for (const child of node.children) {
        queue.push(child);
      }
    }
  }

  /**
   * Adds leaves, blossoms, and fruits according to preset decoration rules
   */
  populateDecorations(config, rng) {
    const leafProb = config.leafProbability !== undefined ? config.leafProbability : 0.8;
    const flowerProb = config.flowerProbability !== undefined ? config.flowerProbability : 0.4;
    const dec = config.decorations || {};

    for (const node of this.allNodes) {
      const isTerminal = node.children.length === 0;
      const isNearTip = node.depth >= Math.max(1, this.maxDepth - 2);

      if (isTerminal || isNearTip) {
        // Leaf decoration
        if (dec.terminalLeaf !== false && rng() < leafProb) {
          node.leaf = {
            shape: dec.leafShape || 'oval',
            scale: 0.8 + rng() * 0.5,
            angle: (rng() - 0.5) * 1.2,
            tintShift: (rng() - 0.5) * 0.2
          };
        }

        // Flower decoration
        if (dec.terminalFlower && isTerminal && rng() < flowerProb) {
          node.flower = {
            shape: dec.flowerShape || 'cherry',
            scale: 0.9 + rng() * 0.6,
            angle: rng() * Math.PI * 2,
            petals: 5 + (rng() > 0.8 ? 1 : 0),
            colorVariant: rng()
          };
        }
      }
    }
  }

  /**
   * Calculates overall tree bounding box for automatic framing
   */
  calculateBounds() {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    const traverse = (node, x, y, heading) => {
      const currentAngle = heading + node.relAngle;
      const nx = x + Math.sin(currentAngle) * node.length;
      const ny = y - Math.cos(currentAngle) * node.length;

      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;

      for (const child of node.children) {
        traverse(child, nx, ny, currentAngle);
      }
    };

    if (this.treeRoot) {
      traverse(this.treeRoot, 0, 0, 0);
    }

    const pad = 40;
    this.bounds = {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
      width: Math.max(100, maxX - minX + pad * 2),
      height: Math.max(100, maxY - minY + pad * 2)
    };
  }

  /**
   * Updates growth simulation and wind physics
   */
  update(dt = 0.016) {
    if (this.isGrowing && this.growthProgress < this.targetGrowth) {
      this.growthProgress = Math.min(this.targetGrowth, this.growthProgress + this.growthSpeed);
    }

    if (this.windEnabled) {
      this.windTime += dt * this.windSpeed;
    }
  }

  /**
   * Render the tree onto the HTML5 2D Canvas
   */
  render(ctx, config, viewTransform) {
    if (!this.treeRoot || this.allNodes.length === 0) return;

    const total = this.totalBranches;
    const progress = this.growthProgress;
    const theme = config.theme || {};
    const trunkColor = theme.trunk || '#4a2c1d';
    const trunkTipColor = theme.trunkTip || '#734c38';
    const leafColor = theme.leaf || '#7bb369';
    const flowerColor = theme.flower || '#ffb7c5';
    const flowerAccent = theme.flowerAccent || '#ff6584';

    ctx.save();

    // Apply viewport zoom & pan
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    // Recursive drawing function
    const drawBranch = (node, startX, startY, parentAngle, parentGrowthRatio) => {
      // Calculate growth threshold for this specific node
      const nodeGrowthIndex = node.order / Math.max(1, total - 1);
      // Window of growth for smooth stretching:
      // Node begins growing when progress reaches (nodeGrowthIndex * 0.85)
      const startAt = nodeGrowthIndex * 0.82;
      const endAt = startAt + 0.18;

      let nodeGrowth = 0;
      if (progress >= endAt) {
        nodeGrowth = 1;
      } else if (progress > startAt) {
        nodeGrowth = (progress - startAt) / (endAt - startAt);
        // Smooth easing
        nodeGrowth = nodeGrowth * nodeGrowth * (3 - 2 * nodeGrowth);
      }

      if (nodeGrowth <= 0) return; // Not yet sprouted!

      // Compute wind sway angle
      let windSway = 0;
      if (this.windEnabled) {
        const depthFactor = (node.depth + 1) / (this.maxDepth + 1);
        const sensitivity = config.windSensitivity || 1.0;
        // Harmonic wind: low frequency gust + high frequency flutter
        const gust = Math.sin(this.windTime * 0.8 + node.depth * 0.4);
        const flutter = Math.sin(this.windTime * 2.5 + node.id * 0.7) * 0.35;
        windSway = (gust + flutter) * this.windStrength * sensitivity * depthFactor;
      }

      const branchAngle = parentAngle + node.relAngle + node.naturalCurvature + windSway;
      const currentLength = node.length * nodeGrowth;
      const endX = startX + Math.sin(branchAngle) * currentLength;
      const endY = startY - Math.cos(branchAngle) * currentLength;

      // Draw the branch segment
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);

      // Color interpolation from trunk to young branches
      const depthRatio = Math.min(1, node.depth / Math.max(1, this.maxDepth));
      ctx.strokeStyle = depthRatio < 0.5 ? trunkColor : trunkTipColor;
      ctx.lineWidth = Math.max(1, node.thickness * (0.3 + 0.7 * nodeGrowth));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw children
      for (const child of node.children) {
        drawBranch(child, endX, endY, branchAngle, nodeGrowth);
      }

      // Draw leaves & flowers if branch is sufficiently grown (> 70%)
      if (nodeGrowth > 0.7) {
        const decorGrowth = Math.min(1, (nodeGrowth - 0.7) / 0.3);

        if (node.leaf) {
          this.renderLeaf(ctx, endX, endY, branchAngle, node.leaf, leafColor, decorGrowth);
        }

        if (node.flower) {
          this.renderFlower(ctx, endX, endY, branchAngle, node.flower, flowerColor, flowerAccent, decorGrowth);
        }
      }
    };

    // Draw from trunk root (0, 0)
    drawBranch(this.treeRoot, 0, 0, 0, 1.0);

    ctx.restore();
  }

  /**
   * Renders individual organic leaves with curves
   */
  renderLeaf(ctx, x, y, branchAngle, leaf, baseColor, scaleRatio) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(branchAngle + leaf.angle);
    const s = leaf.scale * scaleRatio;
    ctx.scale(s, s);

    ctx.fillStyle = baseColor;
    ctx.beginPath();

    if (leaf.shape === 'bamboo') {
      // Long slender bamboo leaf
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, -15, 2, -35);
      ctx.quadraticCurveTo(-4, -15, 0, 0);
    } else if (leaf.shape === 'fern') {
      // Small pinnate leaflet
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(6, -8, 0, -18);
      ctx.quadraticCurveTo(-6, -8, 0, 0);
    } else if (leaf.shape === 'crystal') {
      // Sci-fi polygonal crystal leaf
      ctx.moveTo(0, 0);
      ctx.lineTo(6, -10);
      ctx.lineTo(0, -22);
      ctx.lineTo(-6, -10);
      ctx.closePath();
    } else {
      // Classic smooth oval leaf
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(9, -8, 12, -20, 0, -26);
      ctx.bezierCurveTo(-12, -20, -9, -8, 0, 0);
    }

    ctx.fill();

    // Leaf center vein
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -20);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders blossoms, berries, or spores
   */
  renderFlower(ctx, x, y, branchAngle, flower, color, accentColor, scaleRatio) {
    ctx.save();
    ctx.translate(x, y);
    const s = flower.scale * scaleRatio;
    ctx.scale(s, s);

    if (flower.shape === 'cherry') {
      // 5-petaled cherry blossom
      const numPetals = flower.petals || 5;
      for (let p = 0; p < numPetals; p++) {
        const pAngle = (p * 2 * Math.PI) / numPetals + flower.angle;
        ctx.save();
        ctx.rotate(pAngle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, -9, 4.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle petal cleft
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(0, -14, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Blossom center pistil
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (flower.shape === 'berry') {
      // Wild juicy berries
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (flower.shape === 'star') {
      // Neon cosmic flower
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const r = i % 2 === 0 ? 8 : 3.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

window.PlantGrowthEngine = PlantGrowthEngine;
