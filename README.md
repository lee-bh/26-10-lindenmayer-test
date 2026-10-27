# 🌿 Flora Studio (L-System Stochastic Plant Growth Simulator)

[nylki/lindenmayer](https://github.com/nylki/lindenmayer) 라이브러리를 활용하여 구현한 **무작위 유전적 식물 성장 및 바람 물리 시뮬레이션 인터페이스**입니다. 순수 HTML5 + Vanilla JavaScript + Canvas2D로 개발되었습니다.

---

## ✨ 주요 기능 및 특징

1. **유기적 성장 애니메이션 (Organic Growth Engine)**
   - 줄기 밑둥부터 잔가지, 잎사귀, 꽃잎이 피어나는 점진적 성장 애니메이션 ($t: 0 \to 1$)
   - 재생 / 일시정지, 처음부터 다시 자라기(Re-sprout), 탐색 스크러버 지원

2. **확률적 L-시스템 및 무작위 돌연변이 (Stochastic & Mutation)**
   - `nylki/lindenmayer`의 확률적(Stochastic) 생성 규칙을 적용하여 매번 자연스럽게 달라지는 생장 형태
   - **`🎲 새로운 돌연변이`** 클릭 시 새로운 무작위 시드(Seed)와 각도/길이 편차로 예측할 수 없는 독특한 변종 탄생

3. **살아있는 바람 물리 및 꽃잎 파티클 (Dynamic Wind & Particles)**
   - 계층적 관절(Joint) 물리 기반의 바람 흔들림(Sway) 시뮬레이션
   - 식물 종에 반응하여 바람을 타고 흩날리는 벚꽃 꽃잎 및 발광 포자 파티클

4. **다양한 식물 프리셋 (6 Species)**
   - 🌸 **봄날의 벚꽃나무 (Blooming Cherry Tree)**: 화려한 분홍 꽃잎과 흩날리는 꽃잎 파티클
   - 🌳 **신비한 고목나무 (Mystic Ancient Oak)**: 깊은 숲속의 굵고 웅장한 신목
   - 🌿 **양치식물 고사리 (Barnsley Fern)**: 수학적 자기유사성을 띤 정교한 고사리
   - 🌌 **네온 생체발광 외계식물 (Bioluminescent Flora)**: 어두운 배경에서 빛을 발하는 네온 유기체
   - 🎋 **푸른 대나무 숲 (Windy Bamboo)**: 탄력 있게 휘어지는 대나무 마디와 잎
   - 🌾 **야생 담쟁이 덩굴 (Twisted Creeper Vine)**: 불규칙하게 굽이치며 뻗어나가는 덩굴과 열매

5. **인터랙티브 컨트롤 & 에디터**
   - **형태 조절**: 분기 각도, 각도 편차(Jitter), 줄기 길이, 길이 감쇠비, 세대 수(Iterations)
   - **환경 및 조명 테마**: 심야 생체발광, 노을빛 정원, 식물도감 화폭 모드
   - **L-System 규칙 편집기**: 브라우저 상에서 직접 Axiom 및 Productions JSON을 실시간 수정/적용
   - **캔버스 뷰포트**: 마우스 드래그로 이동(Pan), 휠로 확대/축소(Zoom), 고화질 PNG 캡처 다운로드

---

## 🚀 실행 방법

별도의 빌드 도구나 Node.js 서버 없이 **`index.html` 파일을 브라우저로 더블 클릭하여 바로 열어 사용할 수 있습니다.**

```bash
# 또는 간단한 웹 서버로 실행
npx serve .
# 또는 브라우저에서 바로 열기
open index.html
```

---

## 📁 파일 구조

- `index.html`: 메인 인터페이스 및 캔버스 레이아웃
- `style.css`: 글래스모피즘(Glassmorphism) 및 반응형 UI 스타일
- `presets.js`: 6종 식물 프리셋 및 L-System 규칙 정의
- `engine.js`: L-System 파싱, 계층 트리 구축, 성장 진행도 및 바람 동역학 계산 엔진
- `app.js`: 캔버스 렌더러, 파티클 시스템, 마우스 줌/팬 및 UI 이벤트 연결
- `lindenmayer.browser.js`: `nylki/lindenmayer` 오프라인 번들 스크립트
