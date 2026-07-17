/**
 * Premium SaaS Dashboard Page — Burn-Ex AI
 * 
 * Inspired by Linear, Whoop, Apple Fitness, Stripe, and Vercel.
 * Designed with strict attention to typography, margins, card grouping,
 * micro-animations, and visual balance.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Flame,
  Smartphone,
  Zap,
  Target,
  Timer,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Play,
  Pause,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Heart,
  Droplets,
  Activity,
  Cpu,
  Send,
  X,
  Bot,
  Battery,
  Wifi,
  WifiOff,
  ShieldCheck,
  Dumbbell,
  Calendar,
  Utensils,
} from 'lucide-react';
import styles from './Dashboard.module.css';

// Chart Mock Data
const ANALYTICS_DATA = [
  { day: 'Mon', calories: 320, duration: 25 },
  { day: 'Tue', calories: 150, duration: 12 },
  { day: 'Wed', calories: 450, duration: 35 },
  { day: 'Thu', calories: 280, duration: 20 },
  { day: 'Fri', calories: 510, duration: 40 },
  { day: 'Sat', calories: 380, duration: 30 },
  { day: 'Sun', calories: 240, duration: 18 },
];

export function DashboardPage() {
  const [showQR, setShowQR] = useState(false);
  const [phonePaired, setPhonePaired] = useState(true);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(5);
  
  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'coach'; text: string }>>([
    { sender: 'coach', text: 'Hello! I am your Burn-Ex AI Coach. Ask me anything about your postures, workout plans, or nutrition goals.' }
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // AI Coach smart response logic matching physical settings
    setTimeout(() => {
      let responseText = "I'm monitoring your posture inputs. Let's aim for stable movements during your workout page session!";
      const lower = userMsg.toLowerCase();
      if (lower.includes('squat') || lower.includes('squats')) {
        responseText = "When performing squats, keep your back straight and descend until your hips are level with your knees. Ensure your phone remains in your right front pocket to capture alignment angles accurately.";
      } else if (lower.includes('push') || lower.includes('pushups') || lower.includes('push_ups')) {
        responseText = "For pushups, keep your body in a straight line from head to heels. The chest should go low to activate maximum shoulder and elbow angles.";
      } else if (lower.includes('posture') || lower.includes('form')) {
        responseText = "Your current form is looking solid. Ensure that you have active alignment when executing movements in front of the camera feed.";
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        responseText = "Hi there! I am ready to guide you. Try asking about 'squats' form, 'pushups' posture, or metabolic setups.";
      }
      setChatMessages(prev => [...prev, { sender: 'coach', text: responseText }]);
    }, 800);
  };

  const [quests, setQuests] = useState([
    { id: 1, text: 'Complete a 15-minute workout', completed: true },
    { id: 2, text: 'Achieve >90% form score on Squats', completed: true },
    { id: 3, text: 'Log breakfast upload via AI Scan', completed: true },
    { id: 4, text: 'Hydrate: Drink 8 glasses of water', completed: false },
    { id: 5, text: 'Perform 30 continuous push-ups', completed: false },
  ]);

  const dailyCalories = { current: 320, target: 500 };
  const caloriePercent = Math.min(Math.round((dailyCalories.current / dailyCalories.target) * 100), 100);

  const toggleQuest = (id: number) => {
    setQuests(
      quests.map((q) => (q.id === id ? { ...q, completed: !q.completed } : q))
    );
  };

  const completedQuestsCount = quests.filter(q => q.completed).length;
  const questCompletionPercent = Math.round((completedQuestsCount / quests.length) * 100);

  return (
    <div className={styles.dashboard}>
      
      {/* ─── 1. HERO COMMAND CENTER ─── */}
      <div className={styles.premiumHero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGrid}>
          {/* Main welcome info */}
          <div className={styles.heroMainInfo}>
            <div className={styles.heroMeta}>
              <span className={styles.heroLabel}>COMMAND CENTER</span>
              <span className={styles.heroBadge}>
                <Sparkles size={11} />
                Peak Condition
              </span>
            </div>
            
            <h1 className={styles.heroTitle}>
              YOUR <span className={styles.accentName}>AI FITNESS</span> COMMAND CENTER
            </h1>
            
            <p className={styles.heroMissionText}>
              Burn-Ex AI's glassmodern 3D fitness command card for real-time posture optimization, pose detection and mobile motion analysis.
            </p>

            <div className={styles.heroActions}>
              <button 
                className="btn btn-primary" 
                onClick={() => setWorkoutActive(true)}
                style={{ 
                  display: 'flex', 
                  fill: 'var(--color-background)', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '14px 28px', 
                  fontWeight: 700, 
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-border) 100%)',
                  color: 'var(--color-background)',
                  boxShadow: '0 8px 24px var(--color-accent-glow)',
                  border: 'none',
                  transition: 'transform 0.2s ease'
                }}
              >
                <Play size={16} fill="var(--color-background)" />
                {workoutActive ? 'Resume Workout' : 'Start Workout'}
              </button>
              
              <button 
                className="btn btn-outline" 
                onClick={() => setShowQR(!showQR)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '14px 28px', 
                  borderRadius: '14px',
                  border: '1.5px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--color-foreground)',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                <Smartphone size={16} />
                {phonePaired ? 'Recalibrate' : 'Recalibrate'}
              </button>
            </div>
          </div>

          {/* Futuristic 3D Wireframe HUD model on the Right */}
          <div className={styles.heroImageContainer}>
            <div className={styles.neonHudFrame}>
              <img 
                src="/neon_hud.png" 
                alt="AI Pose Mesh" 
                className={styles.hudImage} 
              />
              {/* Floating glassmorphic HUD status cards */}
              <div className={`${styles.hudGlassCard} ${styles.hudHeartCard}`}>
                <span className={styles.hudCardLabel}>Heart Rate Zone</span>
                <div className={styles.hudMiniBar}>
                  <div className={styles.hudBarFill} />
                </div>
              </div>

              <div className={`${styles.hudGlassCard} ${styles.hudFormCardLeft}`}>
                <span className={styles.hudCardLabel}>Form Score</span>
                <span className={styles.hudCardVal}>98%</span>
              </div>

              <div className={`${styles.hudGlassCard} ${styles.hudFormCardRight}`}>
                <span className={styles.hudCardLabel}>Form Score</span>
                <span className={styles.hudCardVal}>98%</span>
              </div>

              <div className={`${styles.hudGlassCard} ${styles.hudIMUCard}`}>
                <span className={styles.hudCardLabel}>IMU Synced</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. TODAY'S FITNESS OVERVIEW (Section Title & Grid) ─── */}
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Today's Fitness Status</h2>
          <p className={styles.sectionSubtitle}>Real-time telemetry and metabolic tracking</p>
        </div>

        <div className={styles.metricsGrid}>
          {/* Card 1: Calories */}
          <div className={`card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Calorie Burn</span>
              <div className={styles.trendWrapper}>
                <span className={styles.trendText}>12%</span>
                <div className={styles.trendIconBox}>
                  <ArrowUpRight size={12} />
                </div>
              </div>
            </div>
            <div className={styles.metricValRow}>
              <span className={styles.metricNumber}>320</span>
              <span className={styles.metricUnit}>kcal</span>
            </div>
            <svg className={styles.sparkline} viewBox="0 0 100 30">
              <path d="M0,25 Q15,5 30,22 T60,5 T90,12" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
            <span className={styles.metricStatus}>Target: 500 kcal</span>
          </div>

          {/* Card 2: Workout Time */}
          <div className={`card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Active Time</span>
              <div className={styles.trendWrapper}>
                <span className={styles.trendText}>8%</span>
                <div className={styles.trendIconBox}>
                  <ArrowUpRight size={12} />
                </div>
              </div>
            </div>
            <div className={styles.metricValRow}>
              <span className={styles.metricNumber}>4.2</span>
              <span className={styles.metricUnit}>hrs</span>
            </div>
            <svg className={styles.sparkline} viewBox="0 0 100 30">
              <path d="M0,20 Q20,10 40,25 T80,8 T100,12" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
            <span className={styles.metricStatus}>72m avg per workout</span>
          </div>

          {/* Card 3: Weekly Goal */}
          <div className={`card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Weekly Goal</span>
              <div className={styles.trendWrapper}>
                <span className={styles.trendText}>Target</span>
                <div className={styles.trendIconBox}>
                  <ArrowUpRight size={12} />
                </div>
              </div>
            </div>
            <div className={styles.metricValRow}>
              <span className={styles.metricNumber}>5 / 6</span>
              <span className={styles.metricUnit}>done</span>
            </div>
            <svg className={styles.sparkline} viewBox="0 0 100 30">
              <path d="M0,15 Q25,25 50,5 T100,20" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
            <span className={styles.metricStatus}>1 workout remaining</span>
          </div>

          {/* Card 4: Streak */}
          <div className={`card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Streak</span>
              <div className={styles.trendWrapper}>
                <span className={styles.trendText}>Top 5%</span>
                <div className={styles.trendIconBox}>
                  <Zap size={11} fill="currentColor" />
                </div>
              </div>
            </div>
            <div className={styles.metricValRow}>
              <span className={styles.metricNumber}>7</span>
              <span className={styles.metricUnit}>days</span>
            </div>
            <svg className={styles.sparkline} viewBox="0 0 100 30">
              <path d="M0,25 Q20,12 40,20 T80,5 T100,5" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
            <span className={styles.metricStatus}>Record matched</span>
          </div>

          {/* Card 5: Recovery */}
          <div className={`card ${styles.metricCard}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Recovery Score</span>
              <div className={styles.trendWrapper}>
                <span className={styles.trendTextDown}>2%</span>
                <div className={styles.trendIconBoxDown}>
                  <ArrowDownRight size={12} />
                </div>
              </div>
            </div>
            <div className={styles.metricValRow}>
              <span className={styles.metricNumber}>89</span>
              <span className={styles.metricUnit}>%</span>
            </div>
            <svg className={styles.sparkline} viewBox="0 0 100 30">
              <path d="M0,10 Q25,5 50,22 T100,10" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            </svg>
            <span className={styles.metricStatus}>Optimal for training</span>
          </div>
        </div>
      </div>

      {/* ─── 3. LIVE WORKOUT SECTION (Primary Layout Focus) ─── */}
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Live Form Tracker</h2>
          <p className={styles.sectionSubtitle}>Joint angle verification and biomechanical alignment</p>
        </div>

        <div className={styles.liveGrid}>
          {/* Active / Idle Workout Panel */}
          <div className={`card ${styles.liveCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.titleWithIcon}>
                <Activity size={16} className={styles.accentIcon} />
                <span className={styles.cardTitle}>Real-time Joint Analysis</span>
              </div>
              {workoutActive && <span className={styles.pulsingBadge}>LIVE FEED</span>}
            </div>

            {workoutActive ? (
              <div className={styles.activeWorkoutPanel}>
                <div className={styles.activeMetricsGroup}>
                  <div className={styles.activeStatItem}>
                    <span className={styles.activeLabel}>CURRENT EXERCISE</span>
                    <span className={styles.activeVal}>Squats</span>
                  </div>
                  <div className={styles.activeStatItem}>
                    <span className={styles.activeLabel}>REPS DETECTED</span>
                    <span className={styles.activeVal} style={{ color: 'var(--color-accent)' }}>12</span>
                  </div>
                  <div className={styles.activeStatItem}>
                    <span className={styles.activeLabel}>DURATION</span>
                    <span className={styles.activeVal}>04:12</span>
                  </div>
                </div>

                <div className={styles.formScoreBlock}>
                  <div className={styles.formMeta}>
                    <span>Biomechanical Accuracy</span>
                    <span className={styles.formScoreNum} style={{ color: 'var(--color-accent)' }}>94%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: '94%', backgroundColor: 'var(--color-accent)' }} />
                  </div>
                </div>

                <div className={styles.workoutControls}>
                  <button className="btn btn-outline" onClick={() => setWorkoutActive(false)}>
                    <Pause size={14} />
                    Pause Session
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setWorkoutActive(false)}
                    style={{ borderColor: 'var(--color-destructive)', color: 'var(--color-destructive)' }}
                  >
                    End Workout
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.idleWorkoutPanel}>
                <Dumbbell size={40} className={styles.idleIcon} />
                <h3>No Workout Active</h3>
                <p className={styles.idleText}>
                  Activate the classification loop to initialize camera joints estimation and start count triggers.
                </p>
                <button className="btn btn-primary" onClick={() => setWorkoutActive(true)}>
                  Start Tracking Loop
                </button>
              </div>
            )}
          </div>

          {/* Sensor Hub panel */}
          <div className={`card ${styles.liveCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.titleWithIcon}>
                <Smartphone size={16} className={styles.phoneIcon} />
                <span className={styles.cardTitle}>Mobile Telemetry Hub</span>
              </div>
              <span className={`badge ${phonePaired ? 'badge-success' : 'badge-warning'}`}>
                {phonePaired ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {phonePaired ? (
              <div className={styles.phoneWidget}>
                <div className={styles.deviceTelemetryGrid}>
                  <div className={styles.telemetryStat}>
                    <span className={styles.telemetryLabel}>DEVICE</span>
                    <span className={styles.telemetryVal}>iPhone 15 Pro</span>
                  </div>
                  <div className={styles.telemetryStat}>
                    <span className={styles.telemetryLabel}>BATTERY</span>
                    <span className={styles.telemetryVal} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Battery size={14} /> 84%
                    </span>
                  </div>
                  <div className={styles.telemetryStat}>
                    <span className={styles.telemetryLabel}>SYNC LATENCY</span>
                    <span className={styles.telemetryVal}>8ms</span>
                  </div>
                  <div className={styles.telemetryStat}>
                    <span className={styles.telemetryLabel}>SAMPLING</span>
                    <span className={styles.telemetryVal}>52 Hz</span>
                  </div>
                </div>

                {/* IMU Waveform simulation */}
                <div className={styles.waveformWrapper}>
                  <svg className={styles.imuWaveform} viewBox="0 0 400 50">
                    <path
                      className={styles.primaryWave}
                      d="M0 25 Q 25 5, 50 25 T 100 25 T 150 25 T 200 25 T 250 25 T 300 25 T 350 25 T 400 25"
                    />
                    <path
                      className={styles.secondaryWave}
                      d="M0 25 Q 20 40, 45 25 T 90 25 T 135 25 T 180 25 T 225 25 T 270 25 T 315 25 T 360 25 T 400 25"
                    />
                  </svg>
                </div>

                <div className={styles.waveformMeta}>
                  <span>Signal Strength: Excellent</span>
                  <button className={styles.disconnectBtn} onClick={() => setPhonePaired(false)}>Disconnect</button>
                </div>
              </div>
            ) : (
              <div className={styles.pairWidget}>
                <WifiOff size={40} className={styles.idleIcon} />
                <h3>Sensor Not Connected</h3>
                <p className={styles.idleText}>
                  Pair your mobile device to overlay pocket-based gyroscope sensors to form estimation matrices.
                </p>
                <button className="btn btn-outline" onClick={() => setShowQR(true)}>Pair Telemetry</button>
              </div>
            )}

            {/* QR Drawer */}
            <AnimatePresence>
              {showQR && (
                <motion.div 
                  className={styles.qrDrawer}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className={styles.qrContent}>
                    <QRCodeSVG
                      value="http://localhost:5173/mobile?session=demo123"
                      size={100}
                      bgColor="var(--color-surface)"
                      fgColor="var(--color-foreground)"
                    />
                    <div className={styles.qrInstructions}>
                      <span>Scan with phone camera</span>
                      <button className={styles.qrCloseBtn} onClick={() => { setShowQR(false); setPhonePaired(true); }}>Simulate Connection</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── 4. ANALYTICS & NUTRITION SECTION ─── */}
      <div className={styles.mainContentGrid}>
        
        {/* Recharts Analytics Card */}
        <div className={`card ${styles.analyticsCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Activity size={16} />
              <span className={styles.cardTitle}>Calorie & Duration Trends</span>
            </div>
            <span className={styles.metricTag}>Weekly Trends</span>
          </div>

          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={ANALYTICS_DATA}>
                <defs>
                  <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(147, 177, 166, 0.1)" />
                <XAxis dataKey="day" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-foreground)',
                    fontSize: '0.8rem',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#glowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className={`card ${styles.nutritionCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Utensils size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>AI Nutrition Summary</span>
            </div>
          </div>

          <div className={styles.nutritionContent}>
            {/* Meal Scan zone */}
            <div className={styles.dropZone}>
              <UploadCloud size={20} className={styles.uploadIcon} />
              <span className={styles.dropMain}>AI Meal Scanner</span>
              <span className={styles.dropSub}>Drag & drop food photo</span>
            </div>

            {/* Macros summary values */}
            <div className={styles.macrosList}>
              <div className={styles.macroProgressItem}>
                <div className={styles.macroText}>
                  <span>Protein</span>
                  <span>85g / 150g</span>
                </div>
                <div className={styles.macroMiniBar}>
                  <div className={styles.macroFill} style={{ width: '56%', background: 'var(--color-border)' }} />
                </div>
              </div>

              <div className={styles.macroProgressItem}>
                <div className={styles.macroText}>
                  <span>Carbs</span>
                  <span>180g / 250g</span>
                </div>
                <div className={styles.macroMiniBar}>
                  <div className={styles.macroFill} style={{ width: '72%', background: 'var(--color-accent)' }} />
                </div>
              </div>
            </div>

            {/* Water Tracker */}
            <div className={styles.waterTracker}>
              <div className={styles.waterHeader}>
                <div className={styles.titleWithIcon}>
                  <Droplets size={14} style={{ color: 'var(--color-accent)' }} />
                  <span>Water Intake</span>
                </div>
                <span>{waterGlasses} / 8 glasses</span>
              </div>
              <div className={styles.waterGlassesGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.glassBtn} ${i < waterGlasses ? styles.glassFilled : ''}`}
                    onClick={() => setWaterGlasses(i + 1)}
                    aria-label={`Log glass ${i + 1}`}
                  >
                    <Droplets size={12} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. RECENT SESSIONS & DAILY CHALLENGES ─── */}
      <div className={styles.bottomRowGrid}>
        
        {/* Recent Workouts List */}
        <div className={`card ${styles.recentWorkoutsCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Recent Evaluations</span>
            <ChevronRight size={14} className={styles.cardChevron} />
          </div>

          <div className={styles.recentList}>
            {[
              { name: 'Squat Challenge', duration: '18 min', cal: 180, score: 94, date: 'Today' },
              { name: 'Push-up Series', duration: '12 min', cal: 120, score: 93, date: 'Yesterday' },
              { name: 'HIIT Mix', duration: '25 min', cal: 310, score: 81, date: '3 days ago' },
            ].map((workout, idx) => (
              <div key={idx} className={styles.recentListItem}>
                <div className={styles.workoutCore}>
                  <div className={styles.workoutThumbnail}>
                    <Activity size={18} />
                  </div>
                  <div className={styles.workoutMeta}>
                    <span className={styles.workoutName}>{workout.name}</span>
                    <span className={styles.workoutTimeMeta}>
                      <Clock size={10} /> {workout.duration} • {workout.cal} kcal
                    </span>
                  </div>
                </div>
                
                <div className={styles.workoutEvaluations}>
                  <span className={styles.scoreBadge} style={{ color: workout.score >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {workout.score}% Form
                  </span>
                  <ChevronRight size={14} className={styles.cardChevron} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamified Quests Card */}
        <div className={`card ${styles.questsCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Award size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Gamified Challenges</span>
            </div>
            <span className={styles.questXP}>Level 4</span>
          </div>

          <div className={styles.questWidgetBody}>
            {/* XP progress */}
            <div className={styles.xpBlock}>
              <div className={styles.xpMeta}>
                <span>Current Level XP</span>
                <span>{questCompletionPercent}% Completed</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${questCompletionPercent}%`, background: 'var(--color-accent)' }} />
              </div>
            </div>

            {/* Checklist */}
            <div className={styles.questList}>
              {quests.map((quest) => (
                <label 
                  key={quest.id} 
                  className={styles.questLabel}
                  data-completed={quest.completed}
                >
                  <input
                    type="checkbox"
                    checked={quest.completed}
                    onChange={() => toggleQuest(quest.id)}
                    className={styles.hiddenCheckbox}
                  />
                  <div className={styles.checkboxBox}>
                    {quest.completed && <CheckCircle2 size={12} className={styles.checkIcon} />}
                  </div>
                  <span className={styles.questText}>{quest.text}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Floating Chatbot Symbol / Launcher ─── */}
      <div
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(4, 13, 18, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          zIndex: 999,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.borderColor = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      >
        <Bot size={24} style={{ color: 'var(--color-accent)' }} />
        <span
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '10px',
            height: '10px',
            backgroundColor: 'var(--color-accent)',
            borderRadius: '50%',
            border: '2px solid var(--color-background)',
          }}
        />
      </div>

      {/* ─── AI Coach Slider Chat Panel ─── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: '96px',
              right: '24px',
              width: '380px',
              height: '500px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(4, 13, 18, 0.5)',
              zIndex: 998,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(4, 13, 18, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-foreground)' }}>AI Coach Chat</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }} /> Active Guidance
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages body */}
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(4, 13, 18, 0.1)',
              }}
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    backgroundColor: msg.sender === 'user' ? 'var(--color-surface-elevated)' : 'rgba(92, 131, 116, 0.25)',
                    border: msg.sender === 'user' ? '1px solid var(--color-border)' : '1px solid rgba(147, 177, 166, 0.2)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    color: 'var(--color-foreground)',
                    lineHeight: '1.4',
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input form */}
            <div
              style={{
                padding: '12px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                gap: '8px',
                background: 'rgba(4, 13, 18, 0.2)',
              }}
            >
              <input
                type="text"
                placeholder="Ask about squats form, pushups, streaks..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--color-foreground)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--color-background)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
