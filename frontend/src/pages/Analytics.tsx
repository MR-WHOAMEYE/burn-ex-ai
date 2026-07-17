/**
 * Immersive AI-powered Performance Intelligence Center — Burn-Ex AI
 * 
 * Designed under senior product guidelines from WHOOP, Oura Ring, Garmin, and Tesla.
 * Strict color theme compliance: `#37353E` (background), `#44444E` (surface), `#715A5A` (border), `#D3DAD9` (accent).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  Flame,
  Activity,
  Timer,
  Calendar,
  Sparkles,
  Zap,
  Target,
  Award,
  Download,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Compass,
  ArrowRight,
  TrendingDown,
  Info,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import styles from './Analytics.module.css';

type TimeRange = 'weekly' | 'monthly' | 'yearly';
type MetricFilter = 'all' | 'cardio' | 'strength' | 'recovery';

interface KpiData {
  title: string;
  value: string;
  comparison: string;
  isUp: boolean;
  prediction: string;
  icon: any;
  status: 'optimal' | 'moderate' | 'action-required';
  sparkline: number[];
  progress: number;
}

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(4); // For the Performance Journey
  
  // AI Live thinking states
  const [aiStatus, setAiStatus] = useState('Correlating telemetry metrics...');
  const [aiPulse, setAiPulse] = useState(true);
  const [liveConfidence, setLiveConfidence] = useState(98);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Auto update simulation loop for AI Personality
  useEffect(() => {
    const statuses = [
      'Analyzing joint trajectory vectors...',
      'Calculating muscle readiness index...',
      'Synthesizing biometric weekly correlation...',
      'Syncing cardiovascular recovery offsets...',
      'Computing neuromuscular fatigue limits...',
    ];
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      setAiStatus(statuses[counter % statuses.length]);
      setLiveConfidence(Math.floor(Math.random() * 3) + 96);
      setLastUpdated(0);
    }, 6000);

    const timer = setInterval(() => {
      setLastUpdated(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  // Performance overview data mapping
  const chartData = [
    { day: 'Mon', calories: 340, accuracy: 92, intensity: 85, duration: 25 },
    { day: 'Tue', calories: 420, accuracy: 89, intensity: 90, duration: 35 },
    { day: 'Wed', calories: 480, accuracy: 95, intensity: 88, duration: 30 },
    { day: 'Thu', calories: 150, accuracy: 91, intensity: 75, duration: 20 },
    { day: 'Fri', calories: 530, accuracy: 96, intensity: 94, duration: 40 },
    { day: 'Sat', centerline: 420, calories: 380, accuracy: 94, intensity: 86, duration: 30 },
    { day: 'Sun', calories: 240, accuracy: 90, intensity: 78, duration: 15 },
  ];

  const radarData = [
    { subject: 'Strength', A: 92, fullMark: 100 },
    { subject: 'Mobility', A: 85, fullMark: 100 },
    { subject: 'Balance', A: 88, fullMark: 100 },
    { subject: 'Control', A: 94, fullMark: 100 },
    { subject: 'Accuracy', A: 96, fullMark: 100 },
    { subject: 'Recovery', A: 89, fullMark: 100 },
    { subject: 'Consistency', A: 95, fullMark: 100 },
    { subject: 'Speed', A: 84, fullMark: 100 },
    { subject: 'Intensity', A: 90, fullMark: 100 },
  ];

  const HEATMAP_DATA = Array.from({ length: 28 }, (_, i) => ({
    day: i + 1,
    calories: Math.round(Math.random() * 500 + 100),
    duration: Math.round(Math.random() * 40 + 15),
    consistency: Math.round(Math.random() * 20 + 80),
  }));

  const kpis: KpiData[] = [
    {
      title: 'Calories Burned',
      value: '2,540 kcal',
      comparison: '↗ 18% vs last week',
      isUp: true,
      prediction: 'Projected 2,820 kcal next week',
      icon: Flame,
      status: 'optimal',
      sparkline: [30, 45, 38, 60, 50, 72, 55],
      progress: 88,
    },
    {
      title: 'Workout Time',
      value: '195 mins',
      comparison: '↗ 12% vs last week',
      isUp: true,
      prediction: 'Target 220 mins on track',
      icon: Timer,
      status: 'optimal',
      sparkline: [20, 35, 30, 45, 40, 50, 48],
      progress: 92,
    },
    {
      title: 'Recovery Score',
      value: '82%',
      comparison: '↘ 4% vs last week',
      isUp: false,
      prediction: 'Estimated 89% by Tuesday',
      icon: Activity,
      status: 'moderate',
      sparkline: [88, 85, 80, 78, 84, 82, 83],
      progress: 82,
    },
    {
      title: 'Consistency Index',
      value: '95%',
      comparison: '↗ 2% vs last week',
      isUp: true,
      prediction: 'Streak threshold optimal',
      icon: Calendar,
      status: 'optimal',
      sparkline: [90, 92, 91, 94, 93, 95, 95],
      progress: 95,
    },
    {
      title: 'Workout Quality',
      value: '94%',
      comparison: '↗ 5% vs last week',
      isUp: true,
      prediction: 'Neuromuscular firing rate peak',
      icon: Target,
      status: 'optimal',
      sparkline: [88, 90, 92, 91, 93, 94, 94],
      progress: 94,
    },
    {
      title: 'Motion Quality',
      value: '91%',
      comparison: '↗ 3% vs last week',
      isUp: true,
      prediction: 'Minor tilt detected on pushups',
      icon: Zap,
      status: 'optimal',
      sparkline: [85, 87, 89, 90, 88, 91, 91],
      progress: 91,
    },
    {
      title: 'Workout Readiness',
      value: '78%',
      comparison: '↘ 8% vs last week',
      isUp: false,
      prediction: 'Ready for heavy concentric training',
      icon: Compass,
      status: 'moderate',
      sparkline: [86, 82, 78, 75, 80, 78, 78],
      progress: 78,
    },
    {
      title: 'Muscle Fatigue',
      value: '22%',
      comparison: '↗ 14% vs last week',
      isUp: true,
      prediction: 'Hamstrings overloading risk',
      icon: AlertTriangle,
      status: 'action-required',
      sparkline: [10, 15, 18, 25, 22, 20, 22],
      progress: 22,
    },
  ];

  const handleDownloadPDF = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      alert('PDF performance report created.');
    }, 2000);
  };

  return (
    <div className={styles.analyticsPage}>
      
      {/* ─── FILTERS & HEADER ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Performance Intelligence OS</h1>
          <p className={styles.subtitle}>Unified metabolic modeling, joint trajectories, and cognitive recovery splits</p>
        </div>

        <div className={styles.filtersGroupRow}>
          <div className={styles.timeSelector}>
            {(['weekly', 'monthly', 'yearly'] as TimeRange[]).map(range => (
              <button
                key={range}
                className={`${styles.timeBtn} ${timeRange === range ? styles.timeBtnActive : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>

          <div className={styles.typeFilterSelector}>
            {(['all', 'cardio', 'strength', 'recovery'] as MetricFilter[]).map(type => (
              <button
                key={type}
                className={`${styles.typeBtn} ${metricFilter === type ? styles.typeBtnActive : ''}`}
                onClick={() => setMetricFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: AI PERFORMANCE HERO (VIBRANT & ALIVE) ─── */}
      <div className={styles.heroSection}>
        <div className={styles.heroGrid}>
          {/* Main Visual Score Ring */}
          <div className={styles.heroScoreCard}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h2 className={styles.heroCardTitle}>Performance Index</h2>
                <span className={styles.heroCardSubtitle}>Biometric integration</span>
              </div>
              <div className={styles.liveIndicatorRow}>
                <div className={`${styles.pulseDot} ${aiPulse ? styles.pulseActive : ''}`} />
                <span className={styles.liveText}>AI Core Live</span>
              </div>
            </div>

            <div className={styles.scoreRowContainer}>
              <div className={styles.scoreRingContainer}>
                <svg viewBox="0 0 120 120" className={styles.ringSvg}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray="270 314"
                    transform="rotate(-90 60 60)"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(211, 218, 217, 0.4))' }}
                  />
                </svg>
                <div className={styles.ringCenterText}>
                  <span className={styles.scoreValue}>86</span>
                  <span className={styles.scoreLabel}>Readiness Score</span>
                </div>
              </div>

              <div className={styles.biometricsList}>
                <div className={styles.bioItem}>
                  <span>Workout Readiness</span>
                  <strong>92% (Optimal)</strong>
                </div>
                <div className={styles.bioItem}>
                  <span>Recovery State</span>
                  <strong>84% (Excellent)</strong>
                </div>
                <div className={styles.bioItem}>
                  <span>Current Weekly Streak</span>
                  <strong>7 Days Active</strong>
                </div>
              </div>
            </div>
          </div>

          {/* AI coach advisory block */}
          <div className={styles.heroCoachCard}>
            <div className={styles.coachHeaderRow}>
              <Sparkles size={18} className={styles.sparkleIcon} />
              <h2 className={styles.heroCardTitle}>Live AI Advisory</h2>
            </div>
            
            <p className={styles.coachSpeechText}>
              "Your mechanical consistency is performing at <strong>95%</strong>. Daily energy output increased by <strong>18%</strong> with minor recovery depreciation. Recommendation: Execute low-intensity cardio tomorrow to clear lactic accumulation."
            </p>

            <div className={styles.liveStatusRow}>
              <div className={styles.statusLabelColumn}>
                <span>AI Confidence:</span>
                <strong>{liveConfidence}% Confidence</strong>
              </div>
              <div className={styles.statusLabelColumn}>
                <span>Last Scan:</span>
                <strong>{lastUpdated}s ago</strong>
              </div>
            </div>
          </div>

          {/* Next Level Progression */}
          <div className={styles.heroMilestoneCard}>
            <h2 className={styles.heroCardTitle}>Next Athlete Milestone</h2>
            <div className={styles.milestoneBody}>
              <div className={styles.levelProgressRow}>
                <span>Level 4 Elite</span>
                <span>4,200 / 5,000 XP</span>
              </div>
              <div className={styles.levelBar}>
                <div className={styles.levelFill} style={{ width: '84%' }} />
              </div>
            </div>
            <div className={styles.milestoneFooter}>
              <span>Upcoming Mission:</span>
              <strong>Complete 250 mins of Zone 3 Cardio</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: FITNESS STORY ─── */}
      <div className={`card ${styles.fitnessStoryCard}`}>
        <div className={styles.storyHeader}>
          <Sparkles size={18} className={styles.storySparkle} />
          <h3>Weekly Performance Story Report</h3>
        </div>
        <div className={styles.storyContent}>
          <p>
            <strong>This week:</strong> Calorie output expanded by <strong>18%</strong>. Joint trajectory accuracy values improved by <strong>6%</strong>. Muscle recovery indicators decreased slightly due to increased load stress. Hydration counts met target limits on 5 separate days. AI suggests tapering intensity downward by 15% tomorrow to prevent joint inflammation.
          </p>
        </div>
      </div>

      {/* ─── TWO COLUMN MAIN LAYOUT ─── */}
      <div className={styles.mainGrid}>
        
        {/* LEFT COLUMN: KPI Cards, Charts & Heatmaps */}
        <div className={styles.leftCol}>
          
          {/* SECTION 3: SMART KPI CARDS */}
          <div className={styles.kpiGrid}>
            {kpis.map(kpi => {
              const IconComponent = kpi.icon;
              return (
                <div key={kpi.title} className={`card ${styles.kpiCard}`}>
                  <div className={styles.kpiHeaderRow}>
                    <span className={styles.kpiLabel}>{kpi.title}</span>
                    <IconComponent size={16} className={styles.kpiIcon} />
                  </div>
                  
                  <div className={styles.kpiValueRow}>
                    <span className={styles.kpiVal}>{kpi.value}</span>
                    <span className={kpi.isUp ? styles.trendUpText : styles.trendDownText}>
                      {kpi.comparison}
                    </span>
                  </div>

                  {/* Sparkline visualization */}
                  <div className={styles.kpiSparklineWrapper}>
                    <svg viewBox="0 0 100 25" className={styles.sparklineSvg}>
                      <path
                        d={`M0,${25 - kpi.sparkline[0] * 0.25} 
                           Q15,${25 - kpi.sparkline[1] * 0.25} 30,${25 - kpi.sparkline[2] * 0.25} 
                           T60,${25 - kpi.sparkline[4] * 0.25} 
                           T90,${25 - kpi.sparkline[6] * 0.25}`}
                        fill="none"
                        stroke={kpi.isUp ? 'var(--color-accent)' : 'var(--color-border)'}
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>

                  <div className={styles.kpiFooter}>
                    <span>{kpi.prediction}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 5: INTERACTIVE CHARTS */}
          <div className={`card ${styles.chartCard}`}>
            <div className={styles.chartTitleHeader}>
              <div>
                <h3 className={styles.cardSectionTitle}>Workout Telemetry & Intensity Trends</h3>
                <p className={styles.cardSectionSubtitle}>Real-time biometric calories burned and target accuracies</p>
              </div>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="day" stroke="#A0A6A5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A0A6A5" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                    }}
                  />
                  {/* Reference Average Lines */}
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#calGrad)"
                    name="Kcal Burned"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SECTION 6: PERFORMANCE DNA */}
          <div className={styles.subGridRow}>
            {/* Radar chart profiles */}
            <div className={`card ${styles.radarCard}`}>
              <h3 className={styles.cardSectionTitle}>Performance Biometric Radar</h3>
              <p className={styles.cardSectionSubtitle}>Accuracies, control, speed, and consistency metrics</p>
              
              <div className={styles.radarContainer}>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
                    <PolarAngleAxis dataKey="subject" stroke="#A0A6A5" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#A0A6A5" fontSize={8} />
                    <Radar
                      name="Athlete"
                      dataKey="A"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent)"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECTION 7: BODY RECOVERY MAP */}
            <div className={`card ${styles.muscleCard}`}>
              <h3 className={styles.cardSectionTitle}>Muscle Group Recovery Splits</h3>
              <p className={styles.cardSectionSubtitle}>Targeted muscle load factors logged this week</p>
              
              <div className={styles.muscleList}>
                <div className={styles.muscleItem}>
                  <div className={styles.muscleHeader}>
                    <span>Quadriceps (Lower Body Focus)</span>
                    <span className={styles.colorPillRecovered}>94% Recovered</span>
                  </div>
                  <div className={styles.muscleTrack}>
                    <div className={styles.muscleFill} style={{ width: '94%', background: 'var(--color-accent)' }} />
                  </div>
                </div>

                <div className={styles.muscleItem}>
                  <div className={styles.muscleHeader}>
                    <span>Chest (Upper Body Push)</span>
                    <span className={styles.colorPillRecovering}>60% Recovering</span>
                  </div>
                  <div className={styles.muscleTrack}>
                    <div className={styles.muscleFill} style={{ width: '60%', background: 'var(--color-border)' }} />
                  </div>
                </div>

                <div className={styles.muscleItem}>
                  <div className={styles.muscleHeader}>
                    <span>Core & Stability</span>
                    <span className={styles.colorPillOverloaded}>32% Overloaded</span>
                  </div>
                  <div className={styles.muscleTrack}>
                    <div className={styles.muscleFill} style={{ width: '32%', background: 'var(--color-border)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workout calendar Heatmap */}
          <div className={`card ${styles.calendarCard}`}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h3 className={styles.cardSectionTitle}>Interactive Workout Heatmap Calendar</h3>
                <p className={styles.cardSectionSubtitle}>Hover days to display logged telemetry compliance metrics</p>
              </div>
              <span className={styles.legendLabel}>Target Met: 92%</span>
            </div>

            <div className={styles.calendarWrapper}>
              <div className={styles.calendarGrid}>
                {HEATMAP_DATA.map(day => {
                  let cellFill = 'rgba(255, 255, 255, 0.02)';
                  if (day.calories >= 450) cellFill = 'var(--color-accent)';
                  else if (day.calories >= 300) cellFill = 'rgba(211, 218, 217, 0.6)';
                  else if (day.calories >= 100) cellFill = 'rgba(211, 218, 217, 0.25)';
                  
                  return (
                    <div 
                      key={day.day} 
                      className={styles.calendarDay}
                      style={{ background: cellFill }}
                      title={`Day ${day.day}: ${day.calories} kcal, ${day.duration} mins`}
                    />
                  );
                })}
              </div>
            </div>
            <div className={styles.calendarLegend}>
              <span>Inactive Day</span>
              <div className={styles.legendIndicators}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.25)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.6)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: 'var(--color-accent)', width: 12, height: 12, borderRadius: 2 }} />
              </div>
              <span>Optimal Load Met</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: AI COCH, GOAL PREDICTIONS, WORKOUT TIMELINE, RECORDS */}
        <div className={styles.rightCol}>
          
          {/* SECTION 4: LIVE AI COACH */}
          <div className={`card ${styles.aiIntelCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Sparkles size={16} /> Live AI Coach Advisory
            </h3>

            <div className={styles.intelList}>
              <div className={styles.intelItem}>
                <div className={styles.intelHeader}>
                  <CheckCircle size={16} className={styles.successIcon} />
                  <h4>Workout Readiness: Optimal</h4>
                </div>
                <p>Neuromuscular fatigue indexes are minimal. Heart rate variability (HRV) is in the high green zone.</p>
              </div>

              <div className={styles.intelItem}>
                <div className={styles.intelHeader}>
                  <AlertTriangle size={16} className={styles.warningIcon} />
                  <h4>Hamstring Overload Risk</h4>
                </div>
                <p>Trajectory analytics indicate concentric acceleration lag on low-depth squats. Rest Hamstrings.</p>
              </div>
            </div>
          </div>

          {/* SECTION 8: GOAL PREDICTOR */}
          <div className={`card ${styles.predictionCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Sparkles size={16} /> Goal Predictor Diagnostics
            </h3>
            
            <div className={styles.predictionRowList}>
              <div className={styles.predictItem}>
                <span>Estimated Target Met</span>
                <strong>August 14 (3 weeks ahead)</strong>
              </div>
              <div className={styles.predictItem}>
                <span>Projected Weekly Progress</span>
                <strong>2,450 kcal (+15%)</strong>
              </div>
              <div className={styles.predictItem}>
                <span>Required Effort Increment</span>
                <strong>Medium (8.4%)</strong>
              </div>
              <div className={styles.predictItem}>
                <span>Expected Success Rate</span>
                <strong>92% (High Confidence)</strong>
              </div>
            </div>
          </div>

          {/* SECTION 9: WORKOUT TIMELINE */}
          <div className={`card ${styles.insightsTimelineCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Calendar size={16} /> Weekly Progress Timeline
            </h3>
            
            <div className={styles.timelineRowsList}>
              <div className={styles.timelineRow}>
                <span className={styles.dayTag}>Mon</span>
                <p>New personal record set on squat form accuracy (96%).</p>
              </div>
              <div className={styles.timelineRow}>
                <span className={styles.dayTag}>Wed</span>
                <p>Protein target met. Muscle recovery indices improved.</p>
              </div>
              <div className={styles.timelineRow}>
                <span className={styles.dayTag}>Fri</span>
                <p>Hydration deficit alert. Session speed decreased by 6%.</p>
              </div>
            </div>
          </div>

          {/* SECTION 10: PERSONAL RECORDS */}
          <div className={`card ${styles.exerciseAnalyticsCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Award size={16} /> Personal Records
            </h3>
            
            <div className={styles.exerciseRankList}>
              <div className={styles.rankItem}>
                <div className={styles.rankMain}>
                  <h4>Best Squat Form Accuracy</h4>
                  <p>96% accuracy on 4 sets of squat reps</p>
                </div>
                <span className={styles.rankValueBadge}>96% Acc</span>
              </div>

              <div className={styles.rankItem}>
                <div className={styles.rankMain}>
                  <h4>Highest Daily Calorie Burn</h4>
                  <p>530 kcal burned on Friday session</p>
                </div>
                <span className={styles.rankValueBadge}>530 Kcal</span>
              </div>
            </div>
          </div>

          {/* SECTION 13: WORKOUT CORRELATION */}
          <div className={`card ${styles.correlationCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Info size={16} /> AI Biometric Correlation Map
            </h3>
            
            <div className={styles.correlationFlow}>
              <div className={styles.flowNode}>Workout Intensity ↗</div>
              <div className={styles.flowArrow}>↓</div>
              <div className={styles.flowNode}>Nutrition Balance ↗</div>
              <div className={styles.flowArrow}>↓</div>
              <div className={styles.flowNode}>Hydration Level ↘</div>
              <div className={styles.flowArrow}>↓</div>
              <div className={styles.flowNode}>Recovery Index ↘</div>
              <div className={styles.flowArrow}>↓</div>
              <div className={styles.flowNode}>Final Performance ↘</div>
            </div>

            <p className={styles.correlationText}>
              "A minor deficit in hydration status on Wednesday (↘ 14%) directly correlated with a 4-degree joint tilt during squats on Friday."
            </p>
          </div>

          {/* SECTION 16: PERFORMANCE JOURNEY */}
          <div className={`card ${styles.journeyCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Activity size={16} /> Performance Journey splits
            </h3>
            
            <div className={styles.journeySelector}>
              {[1, 2, 3, 4].map(w => (
                <button
                  key={w}
                  className={`${styles.journeyBtn} ${selectedWeek === w ? styles.journeyBtnActive : ''}`}
                  onClick={() => setSelectedWeek(w)}
                >
                  Week {w}
                </button>
              ))}
            </div>

            <div className={styles.journeyContent}>
              {selectedWeek === 1 && <p>"Week 1: Learning fundamentals and structural adaptation parameters."</p>}
              {selectedWeek === 2 && <p>"Week 2: Squat acceleration consistency improved by 14%."</p>}
              {selectedWeek === 3 && <p>"Week 3: Heart rate variability limits stabilized at 72ms."</p>}
              {selectedWeek === 4 && <p>"Week 4: New Personal Best achieved: Squat accuracy set at 96%."</p>}
            </div>
          </div>

          {/* Download weekly reports */}
          <div className={`card ${styles.weeklyReportCard}`}>
            <h3 className={styles.cardSectionTitle}>Download Performance Report</h3>
            <p className={styles.cardSectionSubtitle}>Share a comprehensive overview of your biometric analytics</p>
            <button 
              className="btn btn-primary" 
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}
            >
              {pdfGenerating ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF Report
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
