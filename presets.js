/**
 * L-System Plant Presets for Lindenmayer Simulation
 * Supporting stochastic rules, branching, flowers, and leaves
 */

const PLANT_PRESETS = {
  cherryBlossom: {
    id: 'cherryBlossom',
    name: '봄날의 벚꽃나무 (Cherry Blossom)',
    category: 'Tree',
    description: '분홍빛 꽃잎과 바람에 흩날리는 가지를 가진 아름다운 벚꽃나무입니다.',
    iterations: 4,
    angle: 25,
    angleVariance: 8,
    branchLength: 28,
    lengthDecay: 0.72,
    baseThickness: 8,
    decayThickness: 0.68,
    windSensitivity: 1.4,
    leafProbability: 0.85,
    flowerProbability: 0.9,
    theme: {
      trunk: '#4a2c1d',
      trunkTip: '#734c38',
      leaf: '#7bb369',
      flower: '#ffb7c5',
      flowerAccent: '#ff6584',
      glow: 'rgba(255, 183, 197, 0.4)'
    },
    axiom: 'X',
    // Stochastic rules using nylki/lindenmayer function or probability
    productions: {
      'X': {
        successors: [
          { weight: 45, successor: 'F[+X][-X]F[+X]FX' },
          { weight: 35, successor: 'F[-X][+X]F[-X]FX' },
          { weight: 20, successor: 'F[+X][-X][+FX]FX' }
        ]
      },
      'F': {
        successors: [
          { weight: 70, successor: 'FF' },
          { weight: 30, successor: 'F' }
        ]
      }
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: true,
      leafShape: 'oval',
      flowerShape: 'cherry'
    }
  },

  ancientTree: {
    id: 'ancientTree',
    name: '신비한 고목나무 (Mystic Ancient Oak)',
    category: 'Tree',
    description: '깊은 숲속의 웅장하고 뒤틀린 가지를 가진 거대한 신목입니다.',
    iterations: 4,
    angle: 22.5,
    angleVariance: 12,
    branchLength: 32,
    lengthDecay: 0.75,
    baseThickness: 12,
    decayThickness: 0.65,
    windSensitivity: 0.7,
    leafProbability: 0.9,
    flowerProbability: 0.1,
    theme: {
      trunk: '#2c221e',
      trunkTip: '#4b3c32',
      leaf: '#2d6a4f',
      flower: '#d8f3dc',
      flowerAccent: '#95d5b2',
      glow: 'rgba(45, 106, 79, 0.3)'
    },
    axiom: 'X',
    productions: {
      'X': {
        successors: [
          { weight: 40, successor: 'F[+X][-X]F[-X][+X]X' },
          { weight: 40, successor: 'FF[+X]F[-X]+X' },
          { weight: 20, successor: 'F[-X]FF[+X]-X' }
        ]
      },
      'F': {
        successors: [
          { weight: 65, successor: 'FF' },
          { weight: 35, successor: 'F' }
        ]
      }
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: false,
      leafShape: 'oak',
      flowerShape: 'spore'
    }
  },

  fractalFern: {
    id: 'fractalFern',
    name: '양치식물 고사리 (Barnsley Fern)',
    category: 'Fern',
    description: '수학적 자기유사성을 가진 정교하고 우아한 양치류 고사리입니다.',
    iterations: 5,
    angle: 26,
    angleVariance: 4,
    branchLength: 18,
    lengthDecay: 0.76,
    baseThickness: 5,
    decayThickness: 0.75,
    windSensitivity: 1.8,
    leafProbability: 0.95,
    flowerProbability: 0,
    theme: {
      trunk: '#1b4332',
      trunkTip: '#40916c',
      leaf: '#52b788',
      flower: '#74c69d',
      flowerAccent: '#95d5b2',
      glow: 'rgba(82, 183, 136, 0.3)'
    },
    axiom: 'X',
    productions: {
      'X': 'F[+X]F[-X]+X',
      'F': 'FF'
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: false,
      leafShape: 'fern',
      flowerShape: 'none'
    }
  },

  bioluminescentAlien: {
    id: 'bioluminescentAlien',
    name: '네온 생체발광 외계식물 (Bioluminescent Flora)',
    category: 'Sci-Fi',
    description: '어두운 심해나 외계 행성에서 빛을 내뿜으며 자라는 발광 유기체입니다.',
    iterations: 4,
    angle: 28,
    angleVariance: 10,
    branchLength: 26,
    lengthDecay: 0.74,
    baseThickness: 7,
    decayThickness: 0.7,
    windSensitivity: 1.6,
    leafProbability: 0.75,
    flowerProbability: 0.85,
    theme: {
      trunk: '#0f172a',
      trunkTip: '#06b6d4',
      leaf: '#3b82f6',
      flower: '#ec4899',
      flowerAccent: '#a855f7',
      glow: 'rgba(6, 182, 212, 0.8)'
    },
    axiom: 'X',
    productions: {
      'X': {
        successors: [
          { weight: 50, successor: 'F[+X][-X]FX' },
          { weight: 30, successor: 'F[+FX][-FX]X' },
          { weight: 20, successor: 'F[-X][+X]F[+X]FX' }
        ]
      },
      'F': {
        successors: [
          { weight: 70, successor: 'FF' },
          { weight: 30, successor: 'F' }
        ]
      }
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: true,
      leafShape: 'crystal',
      flowerShape: 'star'
    }
  },

  swayingBamboo: {
    id: 'swayingBamboo',
    name: '푸른 대나무 숲 (Windy Bamboo)',
    category: 'Gramineae',
    description: '곧게 뻗은 마디와 바람에 탄력 있게 휘어지는 푸른 대나무입니다.',
    iterations: 5,
    angle: 18,
    angleVariance: 6,
    branchLength: 24,
    lengthDecay: 0.82,
    baseThickness: 7,
    decayThickness: 0.8,
    windSensitivity: 2.0,
    leafProbability: 0.9,
    flowerProbability: 0,
    theme: {
      trunk: '#2d6a4f',
      trunkTip: '#74c69d',
      leaf: '#95d5b2',
      flower: '#d8f3dc',
      flowerAccent: '#b7e4c7',
      glow: 'rgba(116, 198, 157, 0.35)'
    },
    axiom: 'F',
    productions: {
      'F': {
        successors: [
          { weight: 60, successor: 'F[+F]F[-F]F' },
          { weight: 30, successor: 'F[+F][-F]F' },
          { weight: 10, successor: 'FF[+F]F' }
        ]
      }
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: false,
      leafShape: 'bamboo',
      flowerShape: 'none'
    }
  },

  wildVine: {
    id: 'wildVine',
    name: '야생 담쟁이 덩굴 (Twisted Creeper Vine)',
    category: 'Vine',
    description: '제멋대로 굽이치며 벽을 타고 올라가듯 불규칙하게 자라나는 덩굴입니다.',
    iterations: 4,
    angle: 32,
    angleVariance: 16,
    branchLength: 22,
    lengthDecay: 0.76,
    baseThickness: 6,
    decayThickness: 0.72,
    windSensitivity: 1.2,
    leafProbability: 0.9,
    flowerProbability: 0.6,
    theme: {
      trunk: '#3d261d',
      trunkTip: '#588157',
      leaf: '#3a5a40',
      flower: '#ffb703',
      flowerAccent: '#fb8500',
      glow: 'rgba(255, 183, 3, 0.4)'
    },
    axiom: 'X',
    productions: {
      'X': {
        successors: [
          { weight: 35, successor: 'F[+X]F[-X]+X' },
          { weight: 35, successor: 'F[-X]F[+X]-X' },
          { weight: 30, successor: 'F[+X][-X]FX' }
        ]
      },
      'F': {
        successors: [
          { weight: 50, successor: 'FF' },
          { weight: 50, successor: 'F+F-' }
        ]
      }
    },
    decorations: {
      terminalLeaf: true,
      terminalFlower: true,
      leafShape: 'ivy',
      flowerShape: 'berry'
    }
  }
};

window.PLANT_PRESETS = PLANT_PRESETS;
