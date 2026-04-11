# iFix Academy - Complete Homepage Build Prompt
### For use in VSCode with GitHub Copilot, Cursor, or any AI coding assistant

---

## CONTEXT & BRAND BRIEF

You are a **senior UI/UX engineer and creative director** building the homepage for **iFix Academy** - a premium technical training school that teaches students how to professionally repair smartphones, laptops, Apple devices (iPhone, iPad, iWatch, iMac), and consumer electronics. iFix already runs a repair service business; this Academy is their education wing. The homepage is a **demo/showcase** to impress prospective students and investors.

**Target audience:** Aspiring technicians aged 18–30, career-switchers, electronics enthusiasts, and parents looking for trade-skill education for their children in India.

**Brand personality:** Technical, premium, hands-on, confident, trustworthy. Think: "Apple Store meets a world-class trade school."

---

## DESIGN REFERENCES - IMPLEMENT THESE SPECIFIC IDEAS

### Reference 1: ssscript.app - Cursor-Reactive 3D Background
- The hero section background must have **floating 3D objects that react to mouse cursor movement** in real time using Three.js.
- Implement a scene with **5–8 floating geometric objects** (mix of: torus, icosahedron, box with rounded edges, custom ring shapes representing circuit boards/repair tools).
- Objects must **slowly drift and rotate** by default, and **tilt/pull gently toward the cursor** when the mouse moves (parallax depth effect - closer objects move more, far objects move less).
- Objects use **dark metallic materials** (MeshStandardMaterial, metalness: 0.85, roughness: 0.2) with a subtle **electric blue or warm amber accent point light** that creates specular highlights as the cursor moves.
- Background canvas: deep near-black (#0A0B0F). Objects are dark charcoal/slate with selective lit edges.

### Reference 2: mcshannock.design - Theme, Font & Typography System
- **Dark editorial aesthetic** - deep dark background, off-white primary text, strong typographic hierarchy.
- **Font pairing:** Display headlines in `Bebas Neue` or `Cabinet Grotesk ExtraBold` (massive, tight tracking) + body in `DM Sans` or `Outfit` (clean, modern, readable).
- **Color palette:**
  - Background: `#080A0F` (deep navy-black)
  - Surface elevated: `#0E1117`
  - Border: `rgba(255,255,255,0.07)`
  - Text primary: `#F2F2F0`
  - Text secondary: `#8A8F9C`
  - Accent: `#E8A44A` (warm amber/gold - represents precision, craftsmanship)
  - Accent cool: `#3B82F6` (electric blue - represents technology)
- **Layout:** Asymmetric, left-heavy hero. Large whitespace usage. Type as visual element, not just content carrier.
- **Buttons:** Flat, no outer glow. On hover: amber underline sweep from left. On active: `scale(0.97)`.

---

## TECHNICAL STACK

```
Single self-contained HTML file (no build step)
├── Vanilla HTML5 + CSS3 (CSS custom properties)
├── Three.js r128 (via CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
├── GSAP 3.12 + ScrollTrigger (via CDN)
├── Google Fonts: Cabinet Grotesk + DM Sans
└── Zero external dependencies beyond CDNs listed above
```

**Do NOT use:** React, Vue, npm, Webpack, Tailwind, any other framework.

---

## DESIGN SYSTEM - DEFINE THESE CSS VARIABLES FIRST

```css
:root {
  /* === COLORS === */
  --color-bg: #080A0F;
  --color-bg-2: #0E1117;
  --color-bg-3: #141820;
  --color-surface: rgba(255, 255, 255, 0.03);
  --color-border: rgba(255, 255, 255, 0.07);
  --color-border-hover: rgba(255, 255, 255, 0.15);
  --color-text-primary: #F2F2F0;
  --color-text-secondary: #8A8F9C;
  --color-text-muted: #4A5060;
  --color-accent-warm: #E8A44A;
  --color-accent-warm-dim: rgba(232, 164, 74, 0.12);
  --color-accent-cool: #3B82F6;
  --color-accent-cool-dim: rgba(59, 130, 246, 0.10);

  /* === TYPOGRAPHY === */
  --font-display: 'Cabinet Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;

  /* === SPACING === */
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2.5rem;
  --space-xl: 4rem;
  --space-2xl: 6rem;
  --space-3xl: 10rem;

  /* === BORDERS === */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;

  /* === MOTION === */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 200ms;
  --duration-base: 400ms;
  --duration-slow: 700ms;
  --duration-slower: 1200ms;
}
```

---

## PAGE ARCHITECTURE - BUILD IN THIS EXACT ORDER

### 1. `<head>` Setup
- Viewport meta, charset
- Google Fonts preconnect: `Cabinet Grotesk` (weights: 400, 500, 600, 700, 800) + `DM Sans` (weights: 300, 400, 500, 600)
- Three.js CDN script (defer)
- GSAP + ScrollTrigger CDN scripts (defer)
- All CSS in `<style>` tag (no external CSS file)

---

### 2. NAVBAR
**Specs:**
- `position: fixed; top: 0; width: 100%; z-index: 100`
- Background: `transparent` on load → transitions to `rgba(8, 10, 15, 0.85)` with `backdrop-filter: blur(20px)` on scroll (add `.scrolled` class via JS after 50px scroll)
- Logo left: "iFix" in accent amber + " Academy" in white. Font: Cabinet Grotesk ExtraBold, size: 22px
- Nav links right: `Courses  |  About  |  Instructors  |  Contact` - color: text-secondary, hover: text-primary + amber underline slides in from left
- CTA button far right: `"Enroll Now"` - border: 1px solid var(--color-accent-warm), color: amber, background: transparent, hover: background fills amber, text goes dark. Padding: 10px 20px, radius: 6px
- Mobile: hamburger icon (pure CSS/JS), slides in full-screen menu from right with staggered link reveals

**Navbar JS:**
```javascript
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 50);
});
```

---

### 3. HERO SECTION - CURSOR-REACTIVE THREE.JS BACKGROUND

**HTML Structure:**
```html
<section class="hero" id="hero">
  <canvas id="hero-canvas"></canvas>   <!-- Three.js renders here, position: absolute, full width/height -->
  
  <div class="hero__content">
    <div class="hero__label">EST. 2020 · BANGALORE, INDIA</div>
    
    <h1 class="hero__headline">
      <span class="hero__headline-line">Learn to</span>
      <span class="hero__headline-line hero__headline-line--accent">Fix Anything.</span>
      <span class="hero__headline-line">Build Everything.</span>
    </h1>
    
    <p class="hero__subtext">
      India's most hands-on repair training academy. Master iPhone, MacBook, 
      Android, and laptop repair - from circuit boards to software. 
      Get certified. Get hired. Or start your own shop.
    </p>
    
    <div class="hero__cta-group">
      <a href="#courses" class="btn btn--primary">Explore Courses</a>
      <a href="#about" class="btn btn--ghost">
        <span class="btn__play-icon">▶</span>
        Watch how it works
      </a>
    </div>
    
    <div class="hero__stats">
      <div class="hero__stat">
        <span class="hero__stat-number">2,400+</span>
        <span class="hero__stat-label">Students trained</span>
      </div>
      <div class="hero__divider"></div>
      <div class="hero__stat">
        <span class="hero__stat-number">94%</span>
        <span class="hero__stat-label">Placement rate</span>
      </div>
      <div class="hero__divider"></div>
      <div class="hero__stat">
        <span class="hero__stat-number">14</span>
        <span class="hero__stat-label">Courses offered</span>
      </div>
    </div>
  </div>
  
  <!-- Scroll indicator -->
  <div class="hero__scroll-cue">
    <span>Scroll</span>
    <div class="hero__scroll-line"></div>
  </div>
</section>
```

**Hero CSS:**
```css
.hero {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--color-bg);
}

#hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.hero__content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  padding-top: 100px;
  padding-left: clamp(2rem, 8vw, 8rem); /* Left-aligned, asymmetric */
  max-width: 700px;
  margin-left: 0;
}

.hero__label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-accent-warm);
  margin-bottom: 1.5rem;
  opacity: 0; /* Will be animated in by GSAP */
}

.hero__headline {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(3.5rem, 8vw, 7.5rem);
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
}

.hero__headline-line {
  display: block;
  overflow: hidden;
}

.hero__headline-line--accent {
  color: var(--color-accent-warm);
}

.hero__subtext {
  font-family: var(--font-body);
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 480px;
  margin-bottom: 2.5rem;
}

/* Stats bar */
.hero__stats {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.hero__stat-number {
  display: block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.75rem;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.hero__stat-label {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero__divider {
  width: 1px;
  height: 40px;
  background: var(--color-border);
}

/* Scroll cue */
.hero__scroll-cue {
  position: absolute;
  bottom: 2.5rem;
  left: clamp(2rem, 8vw, 8rem);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 2;
  font-family: var(--font-body);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hero__scroll-line {
  width: 40px;
  height: 1px;
  background: var(--color-text-muted);
  transform-origin: left;
  animation: scrollPulse 2s ease-in-out infinite;
}

@keyframes scrollPulse {
  0%, 100% { transform: scaleX(1); opacity: 0.4; }
  50% { transform: scaleX(0.5); opacity: 1; }
}
```

**Three.js Hero Scene - IMPLEMENT EXACTLY:**
```javascript
// === THREE.JS CURSOR-REACTIVE SCENE ===
(function initHeroScene() {
  const canvas = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    alpha: true, 
    antialias: true 
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // === MATERIALS ===
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x1A1E2C,
    metalness: 0.85,
    roughness: 0.18,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: 0x2A3050,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0D1025,
    emissiveIntensity: 0.3,
  });
  const matWire = new THREE.MeshBasicMaterial({
    color: 0x1E2840,
    wireframe: true,
  });

  // === GEOMETRY OBJECTS ===
  const objects = [];

  // Object 1: Large torus (represents a circuit board ring)
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 16, 60), matDark);
  torus.position.set(4.5, 1, -2);
  torus.userData = { speed: 0.003, depth: 0.6, floatAmp: 0.15, floatSpeed: 0.8 };
  scene.add(torus);
  objects.push(torus);

  // Object 2: Icosahedron (precision tool / gem)
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), matAccent);
  ico.position.set(-4, -1.5, -1.5);
  ico.userData = { speed: 0.005, depth: 0.8, floatAmp: 0.2, floatSpeed: 1.1 };
  scene.add(ico);
  objects.push(ico);

  // Object 3: Octahedron (sharp, geometric)
  const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), matDark);
  octa.position.set(2, -2.8, 0);
  octa.userData = { speed: 0.007, depth: 1.0, floatAmp: 0.12, floatSpeed: 1.4 };
  scene.add(octa);
  objects.push(octa);

  // Object 4: Torus knot (complex, dynamic)
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.2, 80, 16, 2, 3), matAccent);
  knot.position.set(-2.5, 2.5, -3);
  knot.userData = { speed: 0.004, depth: 0.4, floatAmp: 0.25, floatSpeed: 0.7 };
  scene.add(knot);
  objects.push(knot);

  // Object 5: Box / cube (represents devices)
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matDark);
  box.position.set(5.5, -0.5, -1);
  box.userData = { speed: 0.004, depth: 0.5, floatAmp: 0.18, floatSpeed: 0.9 };
  scene.add(box);
  objects.push(box);

  // Object 6: Wireframe sphere (tech, data)
  const wireSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), matWire);
  wireSphere.position.set(-5, 0.5, -4);
  wireSphere.userData = { speed: 0.002, depth: 0.2, floatAmp: 0.1, floatSpeed: 0.6 };
  scene.add(wireSphere);
  objects.push(wireSphere);

  // Object 7: Small torus (scattered)
  const smallTorus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 12, 40), matAccent);
  smallTorus.position.set(0.5, 3.5, -1);
  smallTorus.userData = { speed: 0.008, depth: 0.9, floatAmp: 0.22, floatSpeed: 1.2 };
  scene.add(smallTorus);
  objects.push(smallTorus);

  // === LIGHTING ===
  const ambientLight = new THREE.AmbientLight(0x1A1F35, 1.5);
  scene.add(ambientLight);

  // Warm key light (amber - represents iFix Academy warm accent)
  const warmLight = new THREE.PointLight(0xE8A44A, 4, 20);
  warmLight.position.set(-3, 4, 5);
  scene.add(warmLight);

  // Cool rim light (blue - represents tech/precision)
  const coolLight = new THREE.PointLight(0x3B82F6, 3, 18);
  coolLight.position.set(5, -2, 3);
  scene.add(coolLight);

  // Subtle fill
  const fillLight = new THREE.DirectionalLight(0x0D1830, 1);
  fillLight.position.set(0, -5, -5);
  scene.add(fillLight);

  // === CURSOR TRACKING ===
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = -(e.clientY / window.innerHeight - 0.5) * 2;

    // Move lights with cursor for dynamic specular highlights
    warmLight.position.x = targetMouseX * 6;
    warmLight.position.y = targetMouseY * 4;
    coolLight.position.x = -targetMouseX * 5;
    coolLight.position.y = -targetMouseY * 3;
  });

  // === ANIMATION LOOP ===
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.06;
    mouseY += (targetMouseY - mouseY) * 0.06;

    // Animate each object
    objects.forEach((obj, i) => {
      const d = obj.userData;
      
      // Continuous rotation
      obj.rotation.x += d.speed;
      obj.rotation.y += d.speed * 1.3;
      obj.rotation.z += d.speed * 0.7;

      // Floating motion (sine wave, each object offset)
      const baseY = obj.position.y;
      obj.position.y = baseY + Math.sin(t * d.floatSpeed + i) * d.floatAmp * 0.01;

      // Cursor parallax - closer objects (higher depth) move more
      const parallaxX = mouseX * d.depth * 0.4;
      const parallaxY = mouseY * d.depth * 0.25;
      obj.position.x += (obj.userData.baseX !== undefined 
        ? obj.userData.baseX + parallaxX 
        : obj.position.x + parallaxX - obj.position.x) * 0.02;
    });

    // Store base positions on first run
    if (!objects[0].userData.baseX) {
      objects.forEach(obj => {
        obj.userData.baseX = obj.position.x;
        obj.userData.baseY = obj.position.y;
      });
    }

    // Gentle camera tilt with cursor
    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03;
    camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
```

**Hero GSAP entrance animation:**
```javascript
gsap.registerPlugin(ScrollTrigger);

// Hero entrance - stagger text reveal
const heroTL = gsap.timeline({ delay: 0.3 });
heroTL
  .to('.hero__label', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
  .from('.hero__headline-line', { 
    y: '100%', 
    duration: 0.9, 
    stagger: 0.15, 
    ease: 'power3.out' 
  }, '-=0.2')
  .from('.hero__subtext', { opacity: 0, y: 20, duration: 0.7, ease: 'power2.out' }, '-=0.4')
  .from('.hero__cta-group', { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.4')
  .from('.hero__stats', { opacity: 0, y: 16, duration: 0.6, ease: 'power2.out' }, '-=0.3')
  .from('.hero__scroll-cue', { opacity: 0, duration: 0.5 }, '-=0.2');
```

---

### 4. WHAT THEY TEACH - 3D SCROLL ANIMATION SECTION

This is the hero feature of the page. When the user scrolls, **each course card flies in from a 3D perspective**, one at a time, in a **sticky scroll-pinned sequence**. Think: a card stack where each course dramatically reveals itself.

**Layout concept:**
- Section is **pinned** (sticky) for the entire scroll duration of all cards.
- Left side: fixed **course counter** + **section title** + **small description** that cross-fades with each card.
- Right side: **3D card** that rotates in from Y-axis (rotateY: -80deg → 0deg) + translateX (off-screen right → center) as you scroll into each card's trigger zone.

**Course Data (hardcode these 6 courses):**
```javascript
const courses = [
  {
    id: "01",
    title: "iPhone & iOS Device Repair",
    category: "Apple Ecosystem",
    duration: "8 Weeks",
    level: "Beginner → Advanced",
    skills: ["Screen Replacement", "Battery Swap", "Water Damage Recovery", "Face ID Module Repair", "Motherboard Soldering"],
    outcome: "Certified iPhone Repair Technician",
    gradient: "from #0F1420 to #1A2340",
    accentColor: "#3B82F6",
    icon: "📱" // replace with SVG in actual code
  },
  {
    id: "02",
    title: "MacBook & iMac Repair",
    category: "Apple Computers",
    duration: "10 Weeks",
    level: "Intermediate → Expert",
    skills: ["Logic Board Diagnosis", "SSD & RAM Upgrades", "Keyboard Replacement", "Display Repair", "T2 Chip Issues"],
    outcome: "Certified Apple Computer Technician",
    gradient: "from #0F1820 to #1A2830",
    accentColor: "#E8A44A",
    icon: "💻"
  },
  {
    id: "03",
    title: "Android & Samsung Repair",
    category: "Android Ecosystem",
    duration: "6 Weeks",
    level: "Beginner → Intermediate",
    skills: ["AMOLED Screen Repair", "Charging Port Fix", "Camera Module", "Software Flashing", "Micro-soldering"],
    outcome: "Android Device Specialist",
    gradient: "from #101510 to #1A2518",
    accentColor: "#22C55E",
    icon: "🔧"
  },
  {
    id: "04",
    title: "Laptop Repair (Windows)",
    category: "PC Repair",
    duration: "7 Weeks",
    level: "Beginner → Advanced",
    skills: ["Motherboard Repair", "GPU Re-balling", "Hinge Replacement", "Thermal Paste & Cooling", "BIOS Recovery"],
    outcome: "Certified Laptop Technician",
    gradient: "from #151015 to #251820",
    accentColor: "#A855F7",
    icon: "🖥️"
  },
  {
    id: "05",
    title: "iPad & iWatch Repair",
    category: "Apple Wearables & Tablets",
    duration: "5 Weeks",
    level: "Intermediate",
    skills: ["Digitizer Replacement", "Home Button Calibration", "Crown Repair", "Battery Replacement", "iCloud Bypass"],
    outcome: "Apple Accessories Specialist",
    gradient: "from #101518 to #182025",
    accentColor: "#06B6D4",
    icon: "⌚"
  },
  {
    id: "06",
    title: "Advanced Micro-Soldering",
    category: "Master Level",
    duration: "12 Weeks",
    level: "Expert",
    skills: ["BGA Re-balling", "Chip-level Board Repair", "Schematic Reading", "Hot Air Rework", "PMIC & Audio IC Repair"],
    outcome: "Micro-Soldering Master Technician",
    gradient: "from #181210 to #281C15",
    accentColor: "#EF4444",
    icon: "🔬"
  }
];
```

**HTML Structure for Courses Section:**
```html
<section class="courses" id="courses">
  <div class="courses__sticky-wrapper">
    <div class="courses__left">
      <div class="courses__label">What We Teach</div>
      <h2 class="courses__heading">
        <span class="courses__heading-line">Courses built</span>
        <span class="courses__heading-line">for the real world</span>
      </h2>
      <div class="courses__meta-panel">
        <!-- This updates dynamically via JS as cards scroll in -->
        <div class="courses__current-id">01 / 06</div>
        <p class="courses__current-desc">
          Learn iPhone repair from screen replacement to deep motherboard diagnostics - 
          the most in-demand skill in India's repair market.
        </p>
        <div class="courses__progress-bar">
          <div class="courses__progress-fill" style="width: 16.6%"></div>
        </div>
      </div>
    </div>
    
    <div class="courses__right">
      <div class="courses__cards-viewport">
        <!-- Cards generated by JS -->
      </div>
    </div>
  </div>
  
  <!-- Scroll spacer - JS sets height based on number of courses -->
  <div class="courses__spacer"></div>
</section>
```

**GSAP Sticky + 3D Scroll Implementation:**
```javascript
// === COURSES - STICKY 3D SCROLL SEQUENCE ===

const CARD_COUNT = courses.length;
const SECTION_HEIGHT = window.innerHeight * (CARD_COUNT + 1);

// Set spacer height
document.querySelector('.courses__spacer').style.height = SECTION_HEIGHT + 'px';

// Generate cards
const viewport = document.querySelector('.courses__cards-viewport');
courses.forEach((course, i) => {
  const card = document.createElement('div');
  card.className = 'course-card';
  card.dataset.index = i;
  card.style.setProperty('--card-accent', course.accentColor);
  card.innerHTML = `
    <div class="course-card__header">
      <span class="course-card__id">${course.id}</span>
      <span class="course-card__category">${course.category}</span>
    </div>
    <h3 class="course-card__title">${course.title}</h3>
    <div class="course-card__meta">
      <span class="course-card__chip">${course.duration}</span>
      <span class="course-card__chip">${course.level}</span>
    </div>
    <ul class="course-card__skills">
      ${course.skills.map(s => `<li class="course-card__skill"><span class="skill-dot"></span>${s}</li>`).join('')}
    </ul>
    <div class="course-card__footer">
      <span class="course-card__outcome-label">You'll earn:</span>
      <span class="course-card__outcome">${course.outcome}</span>
      <a href="#enroll" class="course-card__cta">Apply for this course →</a>
    </div>
  `;
  viewport.appendChild(card);
});

// GSAP ScrollTrigger - pin section, reveal cards 3D one by one
gsap.registerPlugin(ScrollTrigger);

const stickyWrapper = document.querySelector('.courses__sticky-wrapper');

// Pin the sticky wrapper
ScrollTrigger.create({
  trigger: '.courses',
  start: 'top top',
  end: `+=${SECTION_HEIGHT}`,
  pin: stickyWrapper,
  pinSpacing: false,
});

// Animate each card in sequence
courses.forEach((course, i) => {
  const card = document.querySelectorAll('.course-card')[i];
  const progress = document.querySelector('.courses__progress-fill');
  const currentId = document.querySelector('.courses__current-id');
  const currentDesc = document.querySelector('.courses__current-desc');

  const descMap = {
    0: "Learn iPhone repair from screen replacement to motherboard diagnostics - the most in-demand skill in India.",
    1: "Master MacBook logic boards and iMac displays. Premium repair skills with premium earning potential.",
    2: "Android is 85% of India's market. Become the go-to Samsung and Android expert in your city.",
    3: "Windows laptops are everywhere. GPU re-balling alone can earn you ₹2,000+ per device.",
    4: "iPads and Watches are growing categories. Learn to fix what others send back to Apple.",
    5: "The rarest skill in repair. Micro-soldering masters earn ₹50,000+/month. This is the top.",
  };

  // Set initial state - off screen, 3D rotated
  gsap.set(card, { 
    rotateY: -70, 
    rotateX: 10,
    x: '60vw', 
    opacity: 0,
    transformPerspective: 1200,
    transformOrigin: 'left center',
  });

  const triggerStart = (i / CARD_COUNT);
  const triggerEnd = ((i + 1) / CARD_COUNT);

  ScrollTrigger.create({
    trigger: '.courses',
    start: `top+=${window.innerHeight * i} top`,
    end: `top+=${window.innerHeight * (i + 1)} top`,
    scrub: 1,
    onEnter: () => {
      // Update left panel
      gsap.to(currentId, { opacity: 0, y: -10, duration: 0.2, onComplete: () => {
        currentId.textContent = `0${i+1} / 06`;
        gsap.to(currentId, { opacity: 1, y: 0, duration: 0.3 });
      }});
      gsap.to(currentDesc, { opacity: 0, y: -8, duration: 0.2, onComplete: () => {
        currentDesc.textContent = descMap[i];
        gsap.to(currentDesc, { opacity: 1, y: 0, duration: 0.3 });
      }});
      // Update progress bar
      gsap.to(progress, { width: `${((i + 1) / CARD_COUNT) * 100}%`, duration: 0.4 });
    },
    onEnterBack: () => {
      // Reverse - previous card
      const prevI = Math.max(i - 1, 0);
      currentId.textContent = `0${prevI+1} / 06`;
      currentDesc.textContent = descMap[prevI];
      gsap.to(progress, { width: `${((prevI + 1) / CARD_COUNT) * 100}%`, duration: 0.4 });
    }
  });

  // Card reveal animation
  gsap.to(card, {
    rotateY: 0,
    rotateX: 0,
    x: 0,
    opacity: 1,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.courses',
      start: `top+=${window.innerHeight * i} top`,
      end: `top+=${window.innerHeight * (i + 0.5)} top`,
      scrub: 1.5,
    }
  });

  // Card exit - fly out upward when next card triggers
  if (i < CARD_COUNT - 1) {
    gsap.to(card, {
      y: '-15vh',
      opacity: 0,
      scale: 0.92,
      duration: 0.8,
      ease: 'power2.in',
      scrollTrigger: {
        trigger: '.courses',
        start: `top+=${window.innerHeight * (i + 0.7)} top`,
        end: `top+=${window.innerHeight * (i + 1)} top`,
        scrub: 1,
      }
    });
  }
});
```

**Course Card CSS:**
```css
.courses {
  position: relative;
  background: var(--color-bg);
}

.courses__sticky-wrapper {
  position: relative; /* GSAP will pin this */
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  min-height: 100dvh;
  align-items: center;
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 4rem;
}

.courses__left {
  padding-right: 2rem;
}

.courses__label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-accent-warm);
  margin-bottom: 1.5rem;
}

.courses__heading {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--color-text-primary);
  margin-bottom: 3rem;
}

.courses__current-id {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent-warm);
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.courses__current-desc {
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 340px;
  margin-bottom: 2rem;
}

.courses__progress-bar {
  width: 100%;
  height: 2px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.courses__progress-fill {
  height: 100%;
  background: var(--color-accent-warm);
  border-radius: 999px;
  transition: width 0.4s var(--ease-out-expo);
}

/* === COURSE CARD === */
.courses__cards-viewport {
  position: relative;
  height: 520px;
  perspective: 1200px;
}

.course-card {
  position: absolute;
  inset: 0;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow: hidden;
  will-change: transform, opacity;
}

/* Accent glow in top-left corner of card */
.course-card::before {
  content: '';
  position: absolute;
  top: -60px;
  left: -60px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--card-accent) 0%, transparent 70%);
  opacity: 0.12;
  border-radius: 50%;
  pointer-events: none;
}

.course-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.course-card__id {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-border);
  letter-spacing: -0.02em;
  line-height: 1;
}

.course-card__category {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--card-accent);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  border-radius: 999px;
}

.course-card__title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.course-card__meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.course-card__chip {
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
}

.course-card__skills {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.course-card__skill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.skill-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--card-accent);
  flex-shrink: 0;
}

.course-card__footer {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.course-card__outcome-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.course-card__outcome {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--card-accent);
}

.course-card__cta {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: color var(--duration-fast) ease;
}
.course-card__cta:hover { color: var(--card-accent); }
```

---

### 5. TESTIMONIALS SECTION

**Design concept:** Dark background, clean horizontal card layout with avatar, quote, and name. Cards have a **subtle hover tilt effect** (3D rotation on mousemove). A **slow auto-scrolling marquee** displays the testimonials - two rows, opposite directions.

**Testimonials data (8 testimonials):**
```javascript
const testimonials = [
  {
    name: "Arjun Mehta",
    location: "Mumbai",
    course: "iPhone Repair",
    jobAfter: "Opened his own repair shop",
    revenue: "₹85,000/month",
    quote: "Before iFix Academy I was working a dead-end call center job. Six months later I own a repair shop with three employees. The hands-on training was nothing like I expected - real devices, real problems, real solutions.",
    rating: 5,
    avatar: "AM"
  },
  {
    name: "Priya Nair",
    location: "Bangalore",
    course: "MacBook Repair",
    jobAfter: "Apple-authorized technician",
    revenue: null,
    quote: "The instructors actually worked at Apple. When they explain why a logic board fails, they're talking from real experience. I passed my Apple certification on the first attempt.",
    rating: 5,
    avatar: "PN"
  },
  {
    name: "Ravi Shankar",
    location: "Chennai",
    course: "Micro-Soldering",
    jobAfter: "Freelance chip-level technician",
    revenue: "₹1.2L/month",
    quote: "Micro-soldering felt impossible before this course. They break it down so logically. I can now repair boards that other shops throw away. My waiting list is always full.",
    rating: 5,
    avatar: "RS"
  },
  {
    name: "Kavitha Reddy",
    location: "Hyderabad",
    course: "Android Repair",
    jobAfter: "Senior technician at iRepair Hub",
    revenue: null,
    quote: "I was skeptical about an online + offline hybrid course. But the lab sessions every weekend made everything click. Best investment I've made in myself.",
    rating: 5,
    avatar: "KR"
  },
  {
    name: "Dinesh Kumar",
    location: "Pune",
    course: "Laptop Repair (Windows)",
    jobAfter: "IT technician, MNC Bangalore",
    revenue: null,
    quote: "Got placed at an IT company two weeks after completing the course. The resume support and interview prep they provide is genuinely good. Not just the technical training.",
    rating: 5,
    avatar: "DK"
  },
  {
    name: "Sneha Patel",
    location: "Ahmedabad",
    course: "iPhone & iPad Repair",
    jobAfter: "Running YouTube channel + repair shop",
    revenue: "₹60,000+/month combined",
    quote: "I document my repairs on YouTube now. iFix Academy gave me the confidence to work on devices confidently on camera. 47,000 subscribers and counting.",
    rating: 5,
    avatar: "SP"
  },
  {
    name: "Mohammed Farhan",
    location: "Delhi",
    course: "iPhone Repair",
    jobAfter: "iPhone specialist, Croma service partner",
    revenue: null,
    quote: "I failed my 12th boards. My family didn't think I'd amount to much. I enrolled here because a friend insisted. Today I'm the only certified iPhone technician in my area.",
    rating: 5,
    avatar: "MF"
  },
  {
    name: "Lakshmi Subramaniam",
    location: "Coimbatore",
    course: "iWatch & iPad Repair",
    jobAfter: "Started iFix franchise in Coimbatore",
    revenue: "₹1.5L/month",
    quote: "The franchise opportunity they offer to top performers is real. I graduated, interned at their service center, then opened my own outlet with their support. Life-changing.",
    rating: 5,
    avatar: "LS"
  }
];
```

**HTML Structure:**
```html
<section class="testimonials" id="testimonials">
  <div class="testimonials__header">
    <div class="testimonials__label">Student Stories</div>
    <h2 class="testimonials__heading">
      Real careers.<br>Real results.
    </h2>
    <p class="testimonials__subtext">
      Over 2,400 students have completed our programs. Here's what 
      they're doing now - in their own words.
    </p>
  </div>
  
  <!-- Marquee Row 1 (left to right) -->
  <div class="testimonials__track-wrapper" data-direction="left">
    <div class="testimonials__track" id="track-1">
      <!-- Cards duplicated for seamless loop: JS fills these -->
    </div>
  </div>
  
  <!-- Marquee Row 2 (right to left) -->
  <div class="testimonials__track-wrapper" data-direction="right">
    <div class="testimonials__track" id="track-2">
      <!-- JS fills these (reversed order) -->
    </div>
  </div>
</section>
```

**Testimonials CSS:**
```css
.testimonials {
  background: var(--color-bg);
  padding: var(--space-3xl) 0;
  overflow: hidden;
}

.testimonials__header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 4rem;
  margin-bottom: 4rem;
}

.testimonials__label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-accent-warm);
  margin-bottom: 1rem;
}

.testimonials__heading {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  font-weight: 800;
  line-height: 1.0;
  letter-spacing: -0.03em;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

.testimonials__subtext {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 420px;
}

/* === MARQUEE === */
.testimonials__track-wrapper {
  display: flex;
  overflow: hidden;
  margin-bottom: 1.5rem;
  /* Fade edges */
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.testimonials__track {
  display: flex;
  gap: 1.5rem;
  animation: marqueeLeft 35s linear infinite;
  will-change: transform;
}

[data-direction="right"] .testimonials__track {
  animation: marqueeRight 35s linear infinite;
}

@keyframes marqueeLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); } /* 50% because cards are doubled */
}

@keyframes marqueeRight {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

/* Pause on hover */
.testimonials__track-wrapper:hover .testimonials__track {
  animation-play-state: paused;
}

/* === TESTIMONIAL CARD === */
.testimonial-card {
  flex-shrink: 0;
  width: 360px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color var(--duration-base) ease, transform var(--duration-base) var(--ease-out-expo);
  transform-style: preserve-3d;
  will-change: transform;
}

.testimonial-card:hover {
  border-color: var(--color-border-hover);
}

.testimonial-card__stars {
  display: flex;
  gap: 3px;
  color: var(--color-accent-warm);
  font-size: 0.85rem;
  letter-spacing: 2px;
}

.testimonial-card__quote {
  font-family: var(--font-body);
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  font-style: italic;
  flex: 1;
}

.testimonial-card__footer {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.testimonial-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--color-accent-warm);
  flex-shrink: 0;
}

.testimonial-card__name {
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.testimonial-card__meta {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-top: 1px;
}

/* Revenue badge - if testimonial has revenue */
.testimonial-card__revenue {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 600;
  color: #22C55E;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
```

**Testimonial JS - build marquee cards + tilt effect:**
```javascript
// Build testimonial cards
function buildTestimonialCard(t) {
  return `
    <div class="testimonial-card" 
         onmousemove="tiltCard(event, this)" 
         onmouseleave="resetTilt(this)">
      <div class="testimonial-card__stars">${'★'.repeat(t.rating)}</div>
      <p class="testimonial-card__quote">"${t.quote}"</p>
      <div class="testimonial-card__footer">
        <div class="testimonial-card__avatar">${t.avatar}</div>
        <div>
          <div class="testimonial-card__name">${t.name}</div>
          <div class="testimonial-card__meta">${t.location} · ${t.course}</div>
        </div>
        ${t.revenue ? `<div class="testimonial-card__revenue">${t.revenue}</div>` : ''}
      </div>
    </div>
  `;
}

// Fill track 1 (first 4 testimonials, doubled for loop)
const track1 = document.getElementById('track-1');
const half1 = testimonials.slice(0, 4);
track1.innerHTML = [...half1, ...half1].map(buildTestimonialCard).join('');

// Fill track 2 (last 4 testimonials, reversed, doubled for loop)
const track2 = document.getElementById('track-2');
const half2 = [...testimonials.slice(4)].reverse();
track2.innerHTML = [...half2, ...half2].map(buildTestimonialCard).join('');

// Tilt effect on hover
function tiltCard(e, card) {
  const rect = card.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
  const y = -((e.clientY - rect.top) / rect.height - 0.5) * 10;
  card.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg) scale(1.02)`;
}

function resetTilt(card) {
  card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
}

// Scroll reveal for testimonials header
gsap.from('.testimonials__heading, .testimonials__subtext', {
  opacity: 0,
  y: 30,
  duration: 0.8,
  stagger: 0.15,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: '.testimonials',
    start: 'top 75%',
  }
});
```

---

### 6. FOOTER

```html
<footer class="footer">
  <div class="footer__inner">
    <div class="footer__top">
      <div class="footer__brand">
        <div class="footer__logo">iFix <span>Academy</span></div>
        <p class="footer__tagline">India's most hands-on repair training school.</p>
        <div class="footer__social">
          <!-- Add Instagram, YouTube, LinkedIn SVG icon links -->
        </div>
      </div>
      
      <div class="footer__links">
        <div class="footer__col">
          <span class="footer__col-title">Courses</span>
          <a href="#">iPhone Repair</a>
          <a href="#">MacBook Repair</a>
          <a href="#">Android Repair</a>
          <a href="#">Laptop Repair</a>
          <a href="#">Micro-Soldering</a>
        </div>
        <div class="footer__col">
          <span class="footer__col-title">Academy</span>
          <a href="#">About Us</a>
          <a href="#">Our Instructors</a>
          <a href="#">Student Stories</a>
          <a href="#">Placement Program</a>
          <a href="#">Franchise Opportunity</a>
        </div>
        <div class="footer__col">
          <span class="footer__col-title">Contact</span>
          <a href="#">Bangalore Campus</a>
          <a href="#">Admissions Helpline</a>
          <a href="#">WhatsApp Support</a>
        </div>
      </div>
    </div>
    
    <div class="footer__bottom">
      <span>© 2025 iFix Academy. All rights reserved.</span>
      <span>Built for craftspeople.</span>
    </div>
  </div>
</footer>
```

**Footer CSS:**
```css
.footer {
  background: var(--color-bg-2);
  border-top: 1px solid var(--color-border);
  padding: 4rem 0 2rem;
}

.footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 4rem;
}

.footer__top {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 4rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 2rem;
}

.footer__logo {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 0.75rem;
}

.footer__logo span { color: var(--color-accent-warm); }

.footer__tagline {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  max-width: 260px;
  margin-bottom: 1.5rem;
}

.footer__links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.footer__col {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.footer__col-title {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.footer__col a {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color var(--duration-fast) ease;
}
.footer__col a:hover { color: var(--color-text-secondary); }

.footer__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
```

---

## GLOBAL BUTTON STYLES

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 14px 28px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--duration-base) var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.btn--primary {
  background: var(--color-accent-warm);
  color: #0A0B0F;
  border: none;
  font-weight: 600;
}

.btn--primary:hover {
  background: #F0B561;
  transform: translateY(-2px);
}

.btn--primary:active {
  transform: scale(0.97);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn--ghost:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.hero__cta-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn__play-icon {
  font-size: 0.6rem;
  opacity: 0.7;
}
```

---

## GLOBAL BASE STYLES

```css
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-text-primary);
  overflow-x: hidden;
  line-height: 1.5;
}

::selection {
  background: rgba(232, 164, 74, 0.25);
  color: var(--color-text-primary);
}

img { max-width: 100%; display: block; }
a { text-decoration: none; }
ul { list-style: none; }
```

---

## PERFORMANCE REQUIREMENTS

```html
<!-- Add these in <head> EXACTLY in this order -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">

<!-- CDN Scripts - load in this order, ALL deferred -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" defer></script>
```

**Since scripts are deferred, wrap ALL JS in:**
```javascript
window.addEventListener('DOMContentLoaded', () => {
  // all your JavaScript goes here
});
```

---

## RESPONSIVE - MOBILE BREAKPOINTS

```css
@media (max-width: 768px) {
  /* Navbar */
  .nav__links { display: none; } /* Show hamburger instead */
  
  /* Hero */
  .hero__content {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    max-width: 100%;
  }
  .hero__stats { 
    gap: 1.25rem;
    flex-wrap: wrap;
  }
  
  /* Courses */
  .courses__sticky-wrapper {
    grid-template-columns: 1fr;
    padding: 0 1.5rem;
    gap: 2rem;
  }
  .courses__cards-viewport { height: 420px; }
  
  /* Testimonials */
  .testimonial-card { width: 290px; }
  
  /* Footer */
  .footer__top { grid-template-columns: 1fr; gap: 2.5rem; }
  .footer__links { grid-template-columns: 1fr 1fr; }
  .footer__bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
}
```

---

## GRAIN TEXTURE OVERLAY (Add Depth)

```css
/* Add this ONCE in CSS - fixed, doesn't affect scroll performance */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}
```

---

## FINAL OUTPUT REQUIREMENTS

1. **Single `index.html` file** - everything (HTML, CSS in `<style>`, JS in `<script>`) in one file.
2. **No npm, no build step** - open in browser directly.
3. **Works in Chrome, Firefox, Safari** - test especially in Chrome.
4. **Mobile responsive** - no horizontal scroll on any screen width.
5. **GSAP ScrollTrigger** works correctly - all scroll animations fire at the right scroll position.
6. **Three.js canvas** fills the hero section without affecting page scroll.
7. **Marquee testimonials** loop seamlessly - no jump when they reset.
8. **Sticky courses section** pins for the full 6-card duration, then releases.
9. **Performance:** `will-change: transform` only on elements with active animation. Grain texture on `fixed` pseudo-element.
10. **Typography** uses Cabinet Grotesk for all headings and DM Sans for body - not system fallbacks.

---

## QUALITY CHECK BEFORE FINISHING

Run through this checklist before calling it done:

- [ ] Canvas background renders - you can see floating 3D objects in the hero
- [ ] Objects gently move when you move the mouse
- [ ] Hero text animates in on load (GSAP stagger)
- [ ] Navbar becomes blurred/opaque on scroll
- [ ] Courses section pins and each card reveals in 3D as you scroll
- [ ] Left panel counter updates (01/06 → 06/06) as you scroll through courses
- [ ] Testimonial marquees scroll automatically in opposite directions
- [ ] Testimonial cards tilt on hover
- [ ] All text is readable (sufficient contrast) - no pure white on pure white
- [ ] Mobile: no horizontal overflow, all sections stack cleanly
- [ ] Footer links all have hover states

---

*End of iFix Academy Homepage Prompt - Build in VSCode as a single `index.html`.*

