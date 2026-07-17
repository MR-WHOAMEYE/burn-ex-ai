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
  BarChart,
  Bar,
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
      
      {/* ─── ROW 1: PREMIUM HERO SECTION & AI COACH (Split 2fr / 1fr) ─── */}
      <div className={styles.heroRow}>
        {/* Apple Fitness & Whoop Style Hero */}
        <div className={styles.premiumHero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroMeta}>
              <span className={styles.heroLabel}>TODAY'S COMMAND</span>
              <span className={styles.heroBadge}>
                <Sparkles size={12} />
                Peak Condition
              </span>
            </div>
            
            <h1 className={styles.heroTitle}>
              Hello, <span className={styles.accentName}>Demo Athlete</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Ready to balance your legs today? Let's aim for a 15 min upper-body workout to maintain your active streak.
            </p>

            <div className={styles.heroProgressBlock}>
              <div className={styles.heroProgressInfo}>
                <span>Daily Burn Target ({dailyCalories.current} / {dailyCalories.target} kcal)</span>
                <span className={styles.heroProgressVal}>{caloriePercent}%</span>
              </div>
              <div className={styles.heroProgressBar}>
                <motion.div 
                  className={styles.heroProgressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${caloriePercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className={styles.heroActions}>
              <button className="btn btn-primary" onClick={() => setWorkoutActive(true)}>
                <Play size={15} />
                Start Workout
              </button>
              <button className="btn btn-outline" onClick={() => setShowQR(!showQR)}>
                <Smartphone size={15} />
                {phonePaired ? 'Recalibrate Phone' : 'Connect Phone'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Coach Suggestion Card */}
        <div className={`card ${styles.coachCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Sparkles size={16} className={styles.purpleIcon} />
              <span className={styles.cardTitle}>AI Coach Insight</span>
            </div>
            <span className={styles.badgeSuccess}>ONLINE</span>
          </div>

          <div className={styles.coachContent}>
            <p className={styles.coachBubble}>
              "Your heart-rate variability shows excellent recovery. We recommend a high-intensity squat session today to push leg volume. Keep phone in front pocket for posture tracking."
            </p>
            <div className={styles.coachMeta}>
              <div className={styles.coachStat}>
                <span className={styles.coachLabel}>Recovery</span>
                <span className={styles.coachVal} style={{ color: 'var(--color-accent)' }}>89%</span>
              </div>
              <div className={styles.coachStat}>
                <span className={styles.coachLabel}>Sleep Score</span>
                <span className={styles.coachVal} style={{ color: '#3B82F6' }}>92%</span>
              </div>
            </div>
            <div className={styles.coachActions}>
              <button className={`btn btn-outline ${styles.coachBtn}`}>Ask AI Coach</button>
              <button className={`btn btn-outline ${styles.coachBtn}`}>Generate Plan</button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: PRIMARY METRICS GRID (5 Columns) ─── */}
      <div className={styles.metricsGrid}>
        {/* Card 1: Calories */}
        <div className={`card ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Calorie Burn</span>
            <div className={styles.trendUp}>
              <ArrowUpRight size={14} />
              <span>12%</span>
            </div>
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNumber}>320</span>
            <span className={styles.metricUnit}>kcal</span>
          </div>
          <svg className={styles.sparkline} viewBox="0 0 100 30">
            <path d="M0,25 Q15,5 30,22 T60,5 T90,12" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
          </svg>
          <span className={styles.metricStatus}>Active target burn</span>
        </div>

        {/* Card 2: Workout Time */}
        <div className={`card ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Active Time</span>
            <div className={styles.trendUp}>
              <ArrowUpRight size={14} />
              <span>8%</span>
            </div>
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNumber}>4.2</span>
            <span className={styles.metricUnit}>hrs</span>
          </div>
          <svg className={styles.sparkline} viewBox="0 0 100 30">
            <path d="M0,20 Q20,10 40,25 T80,8 T100,12" fill="none" stroke="#3B82F6" strokeWidth="2" />
          </svg>
          <span className={styles.metricStatus}>72m avg per workout</span>
        </div>

        {/* Card 3: Weekly Goal */}
        <div className={`card ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Weekly Goal</span>
            <span className={styles.metricTag}>Target</span>
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNumber}>5 / 6</span>
            <span className={styles.metricUnit}>done</span>
          </div>
          <svg className={styles.sparkline} viewBox="0 0 100 30">
            <path d="M0,15 Q25,25 50,5 T100,20" fill="none" stroke="#A855F7" strokeWidth="2" />
          </svg>
          <span className={styles.metricStatus}>1 workout remaining</span>
        </div>

        {/* Card 4: Streak */}
        <div className={`card ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Streak</span>
            <div className={styles.trendUp} style={{ color: 'var(--color-warning)' }}>
              <Zap size={12} />
              <span>Top 5%</span>
            </div>
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNumber}>7</span>
            <span className={styles.metricUnit}>days</span>
          </div>
          <svg className={styles.sparkline} viewBox="0 0 100 30">
            <path d="M0,25 Q20,12 40,20 T80,5 T100,5" fill="none" stroke="var(--color-warning)" strokeWidth="2" />
          </svg>
          <span className={styles.metricStatus}>Personal record matched</span>
        </div>

        {/* Card 5: Recovery */}
        <div className={`card ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Recovery Score</span>
            <div className={styles.trendDown}>
              <ArrowDownRight size={14} />
              <span>2%</span>
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

      {/* ─── ROW 3: WORKOUT CARD & CONNECTED PHONE CARD (Split 1.5fr / 1.5fr) ─── */}
      <div className={styles.liveGrid}>
        
        {/* Workout Controller Card */}
        <div className={`card ${styles.liveCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Activity size={16} className={styles.accentIcon} />
              <span className={styles.cardTitle}>Live Workout Activity</span>
            </div>
            {workoutActive && <span className={styles.pulsingBadge}>LIVE RECORDING</span>}
          </div>

          {workoutActive ? (
            <div className={styles.activeWorkoutPanel}>
              <div className={styles.activeMetricsGroup}>
                <div className={styles.activeStatItem}>
                  <span className={styles.activeLabel}>EXERCISE</span>
                  <span className={styles.activeVal}>Squats</span>
                </div>
                <div className={styles.activeStatItem}>
                  <span className={styles.activeLabel}>REPS</span>
                  <span className={styles.activeVal} style={{ color: 'var(--color-accent)' }}>12</span>
                </div>
                <div className={styles.activeStatItem}>
                  <span className={styles.activeLabel}>DURATION</span>
                  <span className={styles.activeVal}>04:12</span>
                </div>
              </div>

              <div className={styles.formScoreBlock}>
                <div className={styles.formMeta}>
                  <span>Current Form Accuracy</span>
                  <span className={styles.formScoreNum} style={{ color: 'var(--color-accent)' }}>94%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '94%' }} />
                </div>
              </div>

              <div className={styles.workoutControls}>
                <button className="btn btn-outline" onClick={() => setWorkoutActive(false)}>
                  <Pause size={14} />
                  Pause
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
              <p className={styles.idleText}>No workout currently in progress. Tap start to activate camera and overlay joint tracking skeletons.</p>
              <button className="btn btn-primary" onClick={() => setWorkoutActive(true)}>
                Start Workout
              </button>
            </div>
          )}
        </div>

        {/* Connected Phone Card */}
        <div className={`card ${styles.liveCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Smartphone size={16} className={styles.phoneIcon} />
              <span className={styles.cardTitle}>Phone Sensor Hub</span>
            </div>
            <span className={`badge ${phonePaired ? 'badge-success' : 'badge-warning'}`}>
              {phonePaired ? 'PAIRED' : 'DISCONNECTED'}
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
                  <span className={styles.telemetryVal}>84%</span>
                </div>
                <div className={styles.telemetryStat}>
                  <span className={styles.telemetryLabel}>LATENCY</span>
                  <span className={styles.telemetryVal}>8ms</span>
                </div>
                <div className={styles.telemetryStat}>
                  <span className={styles.telemetryLabel}>SAMPLING</span>
                  <span className={styles.telemetryVal}>52 Hz</span>
                </div>
              </div>

              {/* Sine Wave Telemetry display */}
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
              <p className={styles.idleText}>Connect your smartphone as an IMU hub for time-aligned skeleton integration.</p>
              <button className="btn btn-outline" onClick={() => setShowQR(true)}>Pair Phone</button>
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
                    bgColor="#0F172A"
                    fgColor="#F8FAFC"
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

      {/* ─── ROW 4: ANALYTICS & NUTRITION (Split 2fr / 1fr) ─── */}
      <div className={styles.mainContentGrid}>
        
        {/* Recharts Analytics Card */}
        <div className={`card ${styles.analyticsCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.titleWithIcon}>
              <Activity size={16} />
              <span className={styles.cardTitle}>Calorie & Duration Trends</span>
            </div>
            <span className={styles.metricTag}>Weekly</span>
          </div>

          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ANALYTICS_DATA}>
                <defs>
                  <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.2)" />
                <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#090E1A',
                    border: '1px solid rgba(51, 65, 85, 0.6)',
                    borderRadius: '8px',
                    color: '#F8FAFC',
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
              <Flame size={16} style={{ color: 'var(--color-warning)' }} />
              <span className={styles.cardTitle}>Nutrition Dashboard</span>
            </div>
          </div>

          <div className={styles.nutritionContent}>
            {/* Meal Scan zone */}
            <div className={styles.dropZone}>
              <UploadCloud size={20} className={styles.uploadIcon} />
              <span className={styles.dropMain}>AI Meal Scanner</span>
              <span className={styles.dropSub}>Drag and drop meal photo</span>
            </div>

            {/* Macros summary values */}
            <div className={styles.macrosList}>
              <div className={styles.macroProgressItem}>
                <div className={styles.macroText}>
                  <span>Protein</span>
                  <span>85g / 150g</span>
                </div>
                <div className={styles.macroMiniBar}>
                  <div className={styles.macroFill} style={{ width: '56%', background: '#EF4444' }} />
                </div>
              </div>

              <div className={styles.macroProgressItem}>
                <div className={styles.macroText}>
                  <span>Carbs</span>
                  <span>180g / 250g</span>
                </div>
                <div className={styles.macroMiniBar}>
                  <div className={styles.macroFill} style={{ width: '72%', background: '#F59E0B' }} />
                </div>
              </div>
            </div>

            {/* Water Tracker */}
            <div className={styles.waterTracker}>
              <div className={styles.waterHeader}>
                <div className={styles.titleWithIcon}>
                  <Droplets size={14} style={{ color: '#3B82F6' }} />
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

      {/* ─── ROW 5: RECENT WORKOUTS & DAILY QUESTS (Split 2fr / 1fr) ─── */}
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
                    <span className={styles.workoutMetaSub}>
                      {workout.duration} · {workout.cal} kcal · {workout.date}
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
              <Award size={16} style={{ color: 'var(--color-warning)' }} />
              <span className={styles.cardTitle}>Daily Challenges</span>
            </div>
            <span className={styles.questXP}>Level 4</span>
          </div>

          <div className={styles.questWidgetBody}>
            {/* XP progress */}
            <div className={styles.xpBlock}>
              <div className={styles.xpMeta}>
                <span>Level Progress</span>
                <span>{questCompletionPercent}% Completed</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${questCompletionPercent}%`, background: 'var(--color-warning)' }} />
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

    </div>
  );
}
