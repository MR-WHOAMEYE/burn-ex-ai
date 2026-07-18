/**
 * Landing.tsx — Burn-Ex AI Creative Landing Page
 *
 * Dark cyberpunk aesthetic (#191919 + #FAB162)
 * GSAP ScrollTrigger for scroll-driven animations
 * Three.js particle wireframe human in the hero
 * Barlow Condensed + Barlow typography
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Landing.module.css';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   THREE.JS — Particle Human Wireframe
   ═══════════════════════════════════════════════════════════════ */

// Human body joint positions (normalized -1 to 1)
const BODY_JOINTS: [number, number, number][] = [
  [0, 1.7, 0],       // 0  head top
  [0, 1.5, 0],       // 1  head
  [0, 1.3, 0],       // 2  neck
  [-0.25, 1.2, 0],   // 3  left shoulder
  [0.25, 1.2, 0],    // 4  right shoulder
  [-0.45, 0.9, 0.05],// 5  left elbow
  [0.45, 0.9, 0.05], // 6  right elbow
  [-0.55, 0.6, 0],   // 7  left wrist
  [0.55, 0.6, 0],    // 8  right wrist
  [0, 0.85, 0],      // 9  mid spine
  [0, 0.5, 0],       // 10 lower spine
  [-0.15, 0.4, 0],   // 11 left hip
  [0.15, 0.4, 0],    // 12 right hip
  [-0.2, -0.05, 0.05],// 13 left knee
  [0.2, -0.05, 0.05],// 14 right knee
  [-0.22, -0.55, 0], // 15 left ankle
  [0.22, -0.55, 0],  // 16 right ankle
];

const BODY_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [2, 4],  // head-neck-shoulders
  [3, 5], [5, 7],                    // left arm
  [4, 6], [6, 8],                    // right arm
  [2, 9], [9, 10],                   // spine
  [10, 11], [10, 12],                // hips
  [11, 13], [13, 15],                // left leg
  [12, 14], [14, 16],                // right leg
  [3, 9], [4, 9],                    // shoulder to mid spine
  [11, 12],                          // hip connector
];

function ParticleHuman() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const floatingRef = useRef<THREE.Points>(null);

  // Create scattered particles around the body
  const { bodyPositions, bodyColors, bodySizes, linePositions, floatPositions, floatColors, floatSizes } = useMemo(() => {
    const bodyPos: number[] = [];
    const bodyCol: number[] = [];
    const bodySz: number[] = [];
    const linePos: number[] = [];
    const floatPos: number[] = [];
    const floatCol: number[] = [];
    const floatSz: number[] = [];

    const accentColor = new THREE.Color('#FAB162');
    const whiteColor = new THREE.Color('#FFFFFF');
    const dimColor = new THREE.Color('#A3A3A3');

    // Body joint particles — cluster around each joint
    BODY_JOINTS.forEach((joint, idx) => {
      const count = idx === 0 || idx === 1 ? 15 : 8; // more particles at head
      for (let i = 0; i < count; i++) {
        const spread = 0.06;
        bodyPos.push(
          joint[0] + (Math.random() - 0.5) * spread,
          joint[1] + (Math.random() - 0.5) * spread,
          joint[2] + (Math.random() - 0.5) * spread
        );
        const color = i === 0 ? accentColor : (Math.random() > 0.4 ? whiteColor : accentColor);
        bodyCol.push(color.r, color.g, color.b);
        bodySz.push(i === 0 ? 4.0 : 1.5 + Math.random() * 2);
      }
    });

    // Connection lines
    BODY_CONNECTIONS.forEach(([a, b]) => {
      linePos.push(
        BODY_JOINTS[a][0], BODY_JOINTS[a][1], BODY_JOINTS[a][2],
        BODY_JOINTS[b][0], BODY_JOINTS[b][1], BODY_JOINTS[b][2]
      );
    });

    // Floating ambient particles
    for (let i = 0; i < 200; i++) {
      floatPos.push(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4 + 0.6,
        (Math.random() - 0.5) * 3
      );
      const color = Math.random() > 0.7 ? accentColor : dimColor;
      floatCol.push(color.r, color.g, color.b);
      floatSz.push(0.5 + Math.random() * 1.5);
    }

    return {
      bodyPositions: new Float32Array(bodyPos),
      bodyColors: new Float32Array(bodyCol),
      bodySizes: new Float32Array(bodySz),
      linePositions: new Float32Array(linePos),
      floatPositions: new Float32Array(floatPos),
      floatColors: new Float32Array(floatCol),
      floatSizes: new Float32Array(floatSz),
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.15;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.03;
    }

    // Animate floating particles
    if (floatingRef.current) {
      const positions = floatingRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(t + i) * 0.0003;
        positions[i] += Math.cos(t * 0.5 + i) * 0.0002;
      }
      floatingRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Subtle body particle oscillation
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(t * 2 + i * 0.1) * 0.0004;
        positions[i + 1] += Math.cos(t * 1.5 + i * 0.15) * 0.0003;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={groupRef} position={[0, -0.3, 0]}>
        {/* Body particles */}
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={bodyPositions.length / 3}
              array={bodyPositions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={bodyColors.length / 3}
              array={bodyColors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={bodySizes.length}
              array={bodySizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.04}
            vertexColors
            transparent
            opacity={0.9}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Connection lines */}
        <lineSegments ref={linesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linePositions.length / 3}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#FAB162"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>

      {/* Floating ambient particles */}
      <points ref={floatingRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={floatPositions.length / 3}
            array={floatPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={floatColors.length / 3}
            array={floatColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          vertexColors
          transparent
          opacity={0.5}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

function HeroVisualClean() {
  return null;
}


/* ═══════════════════════════════════════════════════════════════
   ANIMATED WAVEFORM (Sensor Fusion section)
   ═══════════════════════════════════════════════════════════════ */
function WaveformVisual() {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const animate = () => {
      setOffset(prev => (prev + 0.4) % 360);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const points1: string[] = [];
  const points2: string[] = [];
  for (let x = 0; x <= 480; x += 3) {
    const y1 = 60 + Math.sin((x + offset * 2) * 0.025) * 25 + Math.sin((x + offset) * 0.045) * 10;
    const y2 = 60 + Math.sin((x + offset * 2 + 40) * 0.028) * 20 + Math.cos((x + offset) * 0.04) * 12;
    points1.push(`${x},${y1.toFixed(1)}`);
    points2.push(`${x},${y2.toFixed(1)}`);
  }

  return (
    <svg className={styles.waveformSvg} viewBox="0 0 480 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[20, 40, 60, 80, 100].map(y => (
        <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(250,177,98,0.06)" strokeWidth="1" />
      ))}
      <text x="4" y="14" fill="rgba(250,177,98,0.4)" fontFamily="Barlow, monospace" fontSize="8" letterSpacing="0.05em">POSE_DATA</text>
      <text x="4" y="114" fill="rgba(250,177,98,0.6)" fontFamily="Barlow, monospace" fontSize="8" letterSpacing="0.05em">IMU_FUSION</text>
      <polyline points={points1.join(' ')} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
      <polyline points={points2.join(' ')} stroke="#FAB162" strokeWidth="2" fill="none" opacity="0.8" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS (Capability cards)
   ═══════════════════════════════════════════════════════════════ */
function PoseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="10" r="4" stroke="#FAB162" strokeWidth="1.5" />
      <line x1="24" y1="14" x2="24" y2="28" stroke="#FAB162" strokeWidth="1.5" />
      <line x1="24" y1="18" x2="14" y2="24" stroke="#FAB162" strokeWidth="1.5" />
      <line x1="24" y1="18" x2="34" y2="24" stroke="#FAB162" strokeWidth="1.5" />
      <line x1="24" y1="28" x2="16" y2="40" stroke="#FAB162" strokeWidth="1.5" />
      <line x1="24" y1="28" x2="32" y2="40" stroke="#FAB162" strokeWidth="1.5" />
    </svg>
  );
}

function SensorIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <rect x="14" y="6" width="20" height="36" rx="4" stroke="#FAB162" strokeWidth="1.5" />
      <circle cx="24" cy="36" r="2" stroke="#FAB162" strokeWidth="1.5" />
      <path d="M20 18 L24 14 L28 18" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 24 L24 28 L28 24" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <path d="M12 36 C12 36 16 28 24 28 C32 28 36 36 36 36" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="16" r="8" stroke="#FAB162" strokeWidth="1.5" />
      <path d="M20 16 L22 18 L28 14" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="28" r="12" stroke="#FAB162" strokeWidth="1.5" />
      <path d="M24 8 L24 16" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 10 L24 16 L28 10" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 25 L22 29 L30 23" stroke="#FAB162" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED COUNTER COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          gsap.fromTo(
            { val: 0 },
            { val: value },
            {
              duration: 2,
              ease: 'power2.out',
              onUpdate: function () {
                const current = Math.round(this.targets()[0].val);
                if (el) el.textContent = current + suffix;
              },
            }
          );
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, suffix]);

  return <span ref={ref} className={styles.metricValue}>0{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const capSectionRef = useRef<HTMLDivElement>(null);
  const capCardsRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Nav scroll handler
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── GSAP ANIMATIONS ───────────────────────────────────────
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Make everything visible immediately
      document.querySelectorAll(`.${styles.eyebrow}, .${styles.heroTitle}, .${styles.heroSub}, .${styles.heroCtas}, .${styles.heroStats}`).forEach(el => {
        (el as HTMLElement).style.opacity = '1';
      });
      return;
    }

    const ctx = gsap.context(() => {
      // ── HERO ENTRANCE ──
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      heroTl
        .to(`.${styles.hero} .${styles.eyebrow}`, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.3,
        })
        .to(`.${styles.heroTitle}`, {
          opacity: 1,
          y: 0,
          duration: 0.8,
        }, '-=0.3')
        .to(`.${styles.heroSub}`, {
          opacity: 1,
          y: 0,
          duration: 0.7,
        }, '-=0.4')
        .to(`.${styles.heroCtas}`, {
          opacity: 1,
          y: 0,
          duration: 0.6,
        }, '-=0.3')
        .to(`.${styles.heroStats}`, {
          opacity: 1,
          y: 0,
          duration: 0.6,
        }, '-=0.3');

      // ── CAPABILITIES SECTION TITLE ──
      if (capSectionRef.current) {
        gsap.from(capSectionRef.current.querySelector(`.${styles.sectionHead}`), {
          scrollTrigger: {
            trigger: capSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: 'power3.out',
        });
      }

      // ── CAPABILITY CARDS STAGGER ──
      if (capCardsRef.current) {
        const cards = capCardsRef.current.querySelectorAll(`.${styles.capCard}`);
        gsap.to(cards, {
          scrollTrigger: {
            trigger: capCardsRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
        });
      }

      // ── HOW IT WORKS — HORIZONTAL SCROLL (desktop only) ──
      if (howRef.current && window.innerWidth > 1024) {
        const wrapper = howRef.current.querySelector(`.${styles.horizontalWrapper}`) as HTMLElement;
        if (wrapper) {
          const totalScroll = wrapper.scrollWidth - window.innerWidth;
          gsap.to(wrapper, {
            x: -totalScroll,
            ease: 'none',
            scrollTrigger: {
              trigger: howRef.current,
              start: 'top top',
              end: `+=${totalScroll}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
            },
          });
        }
      }

      // ── DEEP SECTION ──
      if (deepRef.current) {
        gsap.from(deepRef.current.querySelector(`.${styles.deepCopy}`), {
          scrollTrigger: {
            trigger: deepRef.current,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          x: -60,
          duration: 0.9,
          ease: 'power3.out',
        });

        gsap.from(deepRef.current.querySelector(`.${styles.deepVisual}`), {
          scrollTrigger: {
            trigger: deepRef.current,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          x: 60,
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.2,
        });
      }

      // ── QUOTE — TYPEWRITER ──
      if (quoteRef.current) {
        const text = quoteRef.current.textContent || '';
        quoteRef.current.textContent = '';
        quoteRef.current.style.opacity = '1';

        const chars = text.split('');
        chars.forEach(char => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.opacity = '0';
          quoteRef.current!.appendChild(span);
        });

        gsap.to(quoteRef.current.querySelectorAll('span'), {
          scrollTrigger: {
            trigger: quoteRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
          opacity: 1,
          duration: 0.03,
          stagger: 0.02,
          ease: 'none',
        });
      }

      // ── FINAL CTA ──
      if (ctaRef.current) {
        gsap.from(ctaRef.current, {
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.8,
          ease: 'power3.out',
        });
      }
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // ─── MAGNETIC BUTTON EFFECT ─────────────────────────────────
  const handleMagnetic = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, {
      x: x * 0.2,
      y: y * 0.2,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, []);

  const handleMagneticLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.4)',
    });
  }, []);

  return (
    <div className={styles.page} ref={pageRef}>
      {/* ═══ NAV ═══ */}
      <nav className={`${styles.nav} ${navScrolled ? styles.navScrolled : ''}`}>
        <a href="/landing" className={styles.navLogo}>
          <span className={styles.navLogoDot} />
          BURN-EX
        </a>

        <ul className={styles.navLinks}>
          <li><a href="#capabilities" className={styles.navLink}>Product</a></li>
          <li><a href="#how-it-works" className={styles.navLink}>How it works</a></li>
          <li><a href="#metrics" className={styles.navLink}>Stats</a></li>
        </ul>

        <a href="/login" className={styles.navCta}>Get Started</a>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              {'// LIVE_POSE_TRACKING'}
            </div>

            <h1 className={styles.heroTitle}>
              Your webcam<br />
              just became<br />
              <span className={styles.heroTitleAccent}>your coach.</span>
            </h1>

            <p className={styles.heroSub}>
              Burn-Ex tracks 33 body joints through your laptop camera and fuses them with your phone's motion sensors — real-time form correction, rep counting, and calorie tracking. No wearable required.
            </p>

            <div className={styles.heroCtas}>
              <a href="/login" className={styles.ctaPrimary}>Start Free</a>
              <a href="#how-it-works" className={styles.ctaSecondary}>Watch It Track</a>
            </div>

            <div className={styles.heroStats}>
              <span className={styles.statChip}>33 JOINTS TRACKED</span>
              <span className={styles.statChip}>52HZ SENSOR SYNC</span>
              <span className={styles.statChip}>0 WEARABLES</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <HeroVisualClean />
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══ */}
      <section id="capabilities" className={styles.capabilities} ref={capSectionRef}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionEyebrow}>
            <span className={styles.eyebrowDot} />
            {'// CORE_MODULES'}
          </div>
          <h2 className={styles.sectionTitle}>
            Four systems.<br />
            <span className={styles.sectionTitleAccent}>One workout.</span>
          </h2>
        </div>

        <div className={styles.capGrid} ref={capCardsRef}>
          <div className={styles.capCard}>
            <div className={styles.capIcon}><PoseIcon /></div>
            <div className={styles.capNumber}>{'// 01 — POSE_ESTIMATION'}</div>
            <h3 className={styles.capTitle}>Pose Tracking</h3>
            <p className={styles.capDesc}>
              MoveNet Lightning detects 33 body landmarks at 30fps through your webcam. No markers, no suit, no setup.
            </p>
          </div>

          <div className={styles.capCard}>
            <div className={styles.capIcon}><SensorIcon /></div>
            <div className={styles.capNumber}>{'// 02 — SENSOR_FUSION'}</div>
            <h3 className={styles.capTitle}>Sensor Fusion</h3>
            <p className={styles.capDesc}>
              Your phone's accelerometer and gyroscope stream 52Hz motion data via WebSocket, fused with pose coordinates for depth-aware tracking.
            </p>
          </div>

          <div className={styles.capCard}>
            <div className={styles.capIcon}><CoachIcon /></div>
            <div className={styles.capNumber}>{'// 03 — AI_COACHING'}</div>
            <h3 className={styles.capTitle}>AI Coach</h3>
            <p className={styles.capDesc}>
              Gemini Live analyzes your biomechanics frame-by-frame and speaks corrections in real time. Like a personal trainer watching every rep.
            </p>
          </div>

          <div className={styles.capCard}>
            <div className={styles.capIcon}><NutritionIcon /></div>
            <div className={styles.capNumber}>{'// 04 — MEAL_SCAN'}</div>
            <h3 className={styles.capTitle}>Nutrition</h3>
            <p className={styles.capDesc}>
              Photograph your plate and the AI identifies foods, estimates macros, and logs calories against your daily target — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — HORIZONTAL SCROLL ═══ */}
      <section id="how-it-works" className={styles.howItWorks} ref={howRef}>
        <div className={styles.howItWorksInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>
              <span className={styles.eyebrowDot} />
              {'// SETUP_SEQUENCE'}
            </div>
            <h2 className={styles.sectionTitle}>
              Three steps.<br />
              <span className={styles.sectionTitleAccent}>No hardware.</span>
            </h2>
          </div>
        </div>

        <div className={styles.horizontalWrapper}>
          <div className={styles.stepPanel}>
            <div className={styles.stepNumber}>STEP 01</div>
            <h3 className={styles.stepTitle}>Scan the QR Code</h3>
            <p className={styles.stepDesc}>
              Open Burn-Ex on your laptop. Point your phone camera at the pairing QR code — it connects in under two seconds.
            </p>
          </div>

          <div className={styles.stepPanel}>
            <div className={styles.stepNumber}>STEP 02</div>
            <h3 className={styles.stepTitle}>Move</h3>
            <p className={styles.stepDesc}>
              Your webcam tracks pose. Your phone tracks acceleration. Both streams sync automatically at 52Hz via WebSocket.
            </p>
          </div>

          <div className={styles.stepPanel}>
            <div className={styles.stepNumber}>STEP 03</div>
            <h3 className={styles.stepTitle}>Get Coached</h3>
            <p className={styles.stepDesc}>
              The AI watches your form, counts your reps, measures your range of motion, and speaks corrections through your speaker.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section id="metrics" className={styles.metricsSection}>
        <div className={styles.metricsInner}>
          <div className={styles.metricCard}>
            <AnimatedCounter value={33} />
            <span className={styles.metricLabel}>Body Joints Tracked</span>
          </div>
          <div className={styles.metricCard}>
            <AnimatedCounter value={52} suffix="Hz" />
            <span className={styles.metricLabel}>Sensor Sync Rate</span>
          </div>
          <div className={styles.metricCard}>
            <AnimatedCounter value={30} suffix="fps" />
            <span className={styles.metricLabel}>Pose Detection</span>
          </div>
          <div className={styles.metricCard}>
            <AnimatedCounter value={0} />
            <span className={styles.metricLabel}>Wearables Required</span>
          </div>
        </div>
      </section>

      {/* ═══ DEEP FEATURE / SENSOR FUSION ═══ */}
      <section className={styles.deepSection} ref={deepRef}>
        <div className={styles.deepInner}>
          <div className={styles.deepCopy}>
            <div className={styles.deepEyebrow}>
              <span className={styles.eyebrowDot} />
              {'// SENSOR_FUSION'}
            </div>
            <h2 className={styles.deepTitle}>
              Two sensors.<br />Zero guesswork.
            </h2>
            <p className={styles.deepSub}>
              Webcam pose estimation gives you position. Phone IMU gives you acceleration. Fused together, they give you something neither can alone — real depth, real force, real biomechanics.
            </p>
          </div>

          <div className={styles.deepVisual}>
            <WaveformVisual />
          </div>
        </div>
      </section>

      {/* ═══ QUOTE ═══ */}
      <section className={styles.quoteSection}>
        <div className={styles.quoteMark}>"</div>
        <p className={styles.quoteText} ref={quoteRef}>
          We built Burn-Ex because personal training shouldn't require a personal trainer's budget. Your laptop camera and your phone are already the sensors you need — we wrote the intelligence to use them.
        </p>
        <p className={styles.quoteAttribution}>— Burn-Ex AI Engineering Team</p>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className={styles.finalCta} ref={ctaRef}>
        <h2 className={styles.finalTitle}>
          Ready to let your webcam<br />
          <span className={styles.finalTitleAccent}>coach you?</span>
        </h2>
        <div
          className={styles.magneticBtn}
          onMouseMove={handleMagnetic}
          onMouseLeave={handleMagneticLeave}
        >
          <a href="/login" className={styles.ctaPrimary}>Start Free Now</a>
          <div className={styles.ctaGlowRing} />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span className={styles.navLogoDot} />
            BURN-EX
          </div>

          <ul className={styles.footerLinks}>
            <li><a href="#capabilities" className={styles.footerLink}>Product</a></li>
            <li><a href="#how-it-works" className={styles.footerLink}>How it works</a></li>
            <li><a href="/login" className={styles.footerLink}>Get started</a></li>
          </ul>
        </div>

        <p className={styles.footerCopyright}>
          © {new Date().getFullYear()} Burn-Ex AI — All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
