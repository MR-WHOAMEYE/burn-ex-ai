/**
 * Analytics Page
 * 
 * Displays workout performance trends across daily, weekly, monthly, and yearly views.
 * Uses Recharts for chart rendering and Framer Motion for page transitions.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
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
  TrendingUp,
  Flame,
  Activity,
  Timer,
  Calendar,
} from 'lucide-react';
import styles from './Analytics.module.css';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Mock data — will be replaced with TanStack Query API calls
const WEEKLY_DATA = [
  { day: 'Mon', calories: 320, reps: 45, duration: 25 },
  { day: 'Tue', calories: 0, reps: 0, duration: 0 },
  { day: 'Wed', calories: 450, reps: 60, duration: 35 },
  { day: 'Thu', calories: 280, reps: 38, duration: 20 },
  { day: 'Fri', calories: 510, reps: 72, duration: 40 },
  { day: 'Sat', calories: 380, reps: 50, duration: 30 },
  { day: 'Sun', calories: 200, reps: 25, duration: 15 },
];

const MONTHLY_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  calories: Math.round(Math.random() * 500 + 100),
  reps: Math.round(Math.random() * 80 + 10),
}));

// Heatmap data for activity visualization
const HEATMAP_DATA = Array.from({ length: 52 * 7 }, () =>
  Math.floor(Math.random() * 5)
);

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');

  const currentData = timeRange === 'monthly' ? MONTHLY_DATA : WEEKLY_DATA;

  const totalCalories = currentData.reduce((s, d) => s + d.calories, 0);
  const totalReps = currentData.reduce((s, d) => s + d.reps, 0);
  const totalDuration = WEEKLY_DATA.reduce((s, d) => s + d.duration, 0);
  const activeDays = currentData.filter(d => d.calories > 0).length;

  return (
    <div className={styles.analyticsPage}>
      <div className={styles.header}>
        <div>
          <h1>Analytics</h1>
          <p className={styles.subtitle}>Your performance at a glance</p>
        </div>

        {/* Time Range Selector */}
        <div className={styles.timeSelector}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map(range => (
            <button
              key={range}
              className={`${styles.timeBtn} ${timeRange === range ? styles.timeBtnActive : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <motion.div className={styles.summaryGrid} initial="hidden" animate="visible">
        <motion.div className={`card ${styles.summaryCard}`} custom={0} variants={cardVariants}>
          <Flame size={18} style={{ color: 'var(--color-warning)' }} />
          <span className="metric-value">{totalCalories.toLocaleString()}</span>
          <span className="metric-label">Calories Burned</span>
        </motion.div>

        <motion.div className={`card ${styles.summaryCard}`} custom={1} variants={cardVariants}>
          <Activity size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="metric-value">{totalReps}</span>
          <span className="metric-label">Total Reps</span>
        </motion.div>

        <motion.div className={`card ${styles.summaryCard}`} custom={2} variants={cardVariants}>
          <Timer size={18} style={{ color: 'var(--color-info)' }} />
          <span className="metric-value">{totalDuration}m</span>
          <span className="metric-label">Time Trained</span>
        </motion.div>

        <motion.div className={`card ${styles.summaryCard}`} custom={3} variants={cardVariants}>
          <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="metric-value">{activeDays}</span>
          <span className="metric-label">Active Days</span>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        {/* Calorie Trend */}
        <motion.div
          className={`card ${styles.chartCard}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={styles.chartHeader}>
            <TrendingUp size={16} />
            <h3>Calorie Burn Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="day"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#calorieGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Rep Distribution */}
        <motion.div
          className={`card ${styles.chartCard}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className={styles.chartHeader}>
            <Activity size={16} />
            <h3>Rep Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                }}
              />
              <Bar dataKey="reps" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <motion.div
        className={`card ${styles.heatmapCard}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className={styles.chartHeader}>
          <Calendar size={16} />
          <h3>Activity Heatmap</h3>
        </div>
        <div className={styles.heatmapGrid}>
          {HEATMAP_DATA.map((level, i) => (
            <div
              key={i}
              className={styles.heatmapCell}
              data-level={level}
              title={`Activity level: ${level}`}
            />
          ))}
        </div>
        <div className={styles.heatmapLegend}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(l => (
            <div key={l} className={styles.heatmapCell} data-level={l} />
          ))}
          <span>More</span>
        </div>
      </motion.div>
    </div>
  );
}
