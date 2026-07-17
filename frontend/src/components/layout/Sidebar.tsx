/**
 * Sidebar Navigation Component
 * 
 * Vertical navigation bar with grouped menu categories (Core Workspace, Analytics/Coaching),
 * active glowing indicators flush left, and a settings area pinned to the bottom.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  BarChart3,
  Bot,
  Trophy,
  History,
  Settings,
  Flame,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const coreItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/workout', label: 'Workout', icon: <Dumbbell size={18} /> },
  { path: '/nutrition', label: 'Nutrition', icon: <Apple size={18} /> },
];

const intelligenceItems: NavItem[] = [
  { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { path: '/coach', label: 'AI Coach', icon: <Bot size={18} /> },
  { path: '/achievements', label: 'Achievements', icon: <Trophy size={18} /> },
  { path: '/history', label: 'History', icon: <History size={18} /> },
];

const bottomItems: NavItem[] = [
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brand}>
        <Flame size={24} className={styles.brandIcon} />
        <span className={styles.brandText}>Burn-Ex</span>
      </div>

      {/* Navigation Groups */}
      <nav className={styles.nav}>
        {/* Core Workspace Group */}
        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>Hub</span>
          <ul className={styles.navList}>
            {coreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        className={styles.activeIndicator}
                        layoutId="sidebar-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Intelligence Group */}
        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>Intelligence</span>
          <ul className={styles.navList}>
            {intelligenceItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        className={styles.activeIndicator}
                        layoutId="sidebar-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom Settings Link */}
      <div className={styles.bottomSection}>
        <ul className={styles.navList}>
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                >
                  {isActive && (
                    <div className={styles.activeIndicator} />
                  )}
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
