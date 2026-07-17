/**
 * Premium Collapsible SaaS Sidebar Navigation Component — Burn-Ex AI
 * 
 * Inspired by Linear, Vercel, and Arc Browser.
 * Features:
 *  - Collapsible modes: 72px (Icons only) vs 260px (Expanded content)
 *  - Logo-triggered toggle (scales and rotates on click)
 *  - Animated active link capsule overlays
 *  - Floating glassmorphic tooltips in collapsed mode
 *  - Keyboard triggers: Ctrl + B to toggle, Esc to collapse
 *  - User profile dropdown footer widget
 */
import { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  LogOut,
  User,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  dot?: boolean;
}

const coreItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/workout', label: 'Workout', icon: <Dumbbell size={18} />, badge: 'LIVE' },
  { path: '/nutrition', label: 'Nutrition', icon: <Apple size={18} />, dot: true },
];

const intelligenceItems: NavItem[] = [
  { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { path: '/coach', label: 'AI Coach', icon: <Bot size={18} /> },
  { path: '/achievements', label: 'Achievements', icon: <Trophy size={18} /> },
  { path: '/history', label: 'History', icon: <History size={18} /> },
];

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Active tooltip tracking state
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Profile metadata
  const displayName = user?.displayName || 'Demo Athlete';
  const role = 'Level 4 Athlete';

  // ── Keyboard Listeners (Ctrl + B & Esc) ────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + B -> Toggle collapse
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggle();
      }
      // Esc -> Close profile/collapse
      if (e.key === 'Escape') {
        setProfileOpen(false);
        if (isExpanded) {
          onToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onToggle]);

  // Click outside profile dropdown to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const renderLink = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path} style={{ position: 'relative' }}>
        <NavLink
          to={item.path}
          className={`${styles.navLink} ${isActive ? styles.active : ''}`}
          onMouseEnter={() => !isExpanded && setHoveredItem(item.label)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* Active indicator capsule */}
          {isActive && (
            <motion.div
              className={isExpanded ? styles.activeIndicator : styles.activeIndicatorRail}
              layoutId="sidebar-active-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Icon wrapped in container */}
          <div className={styles.navIconWrapper}>
            <span className={styles.navIcon}>{item.icon}</span>
            {item.dot && (
              <span className={styles.navDot} />
            )}
          </div>

          {/* Expanded layout structures */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.span
                className={styles.navLabel}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badges */}
          {isExpanded && item.badge && (
            <span className={styles.badge}>{item.badge}</span>
          )}
        </NavLink>

        {/* Collapsed layout Tooltip overlays */}
        <AnimatePresence>
          {!isExpanded && hoveredItem === item.label && (
            <motion.div
              className={styles.tooltip}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 20 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {item.label}
            </motion.div>
          )}
        </AnimatePresence>
      </li>
    );
  };

  return (
    <aside 
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}
      style={{ width: isExpanded ? '260px' : '72px' }}
    >
      {/* Brand Logo Header & Toggle Trigger */}
      <div 
        className={styles.brand} 
        onClick={onToggle}
        title={isExpanded ? 'Collapse Workspace (Ctrl+B)' : 'Expand Workspace (Ctrl+B)'}
      >
        <motion.div 
          className={styles.brandIconWrapper}
          whileTap={{ scale: 0.9, rotate: -15 }}
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <Flame size={24} className={styles.brandIcon} />
        </motion.div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              className={styles.brandText}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              Burn-Ex
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation list */}
      <nav className={styles.nav}>
        {/* Hub Group */}
        <div className={styles.navGroup}>
          {isExpanded && <span className={styles.groupLabel}>Hub</span>}
          <ul className={styles.navList}>
            {coreItems.map(renderLink)}
          </ul>
        </div>

        {/* Intelligence Group */}
        <div className={styles.navGroup}>
          {isExpanded && <span className={styles.groupLabel}>Intelligence</span>}
          <ul className={styles.navList}>
            {intelligenceItems.map(renderLink)}
          </ul>
        </div>
      </nav>

      {/* Bottom Profile and Settings tab */}
      <div className={styles.bottomSection}>
        <ul className={styles.navList} style={{ marginBottom: '12px' }}>
          {renderLink({ path: '/settings', label: 'Settings', icon: <Settings size={18} /> })}
        </ul>

        {/* Profile Dropdown Widget */}
        <div className={styles.profileContainer} ref={profileRef}>
          <button 
            className={styles.profileTrigger}
            onClick={() => isExpanded && setProfileOpen(!profileOpen)}
            title={!isExpanded ? `${displayName} - ${role}` : undefined}
          >
            <div className={styles.avatar}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            
            {isExpanded && (
              <>
                <div className={styles.profileInfo}>
                  <span className={styles.profileName}>{displayName}</span>
                  <span className={styles.profileRole}>{role}</span>
                </div>
                <ChevronDown size={14} className={styles.dropdownChevron} data-open={profileOpen} />
              </>
            )}
          </button>

          {/* Profile Expanded Menu dropdown modal */}
          {profileOpen && isExpanded && (
            <div className={styles.profileDropdownMenu}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownName}>{displayName}</span>
                <span className={styles.dropdownRole}>Level 4 Athlete</span>
              </div>
              
              <button 
                className={styles.dropdownItem}
                onClick={() => { setProfileOpen(false); navigate('/settings'); }}
              >
                <User size={14} />
                <span>Account Profile</span>
              </button>

              <button 
                className={styles.dropdownItem}
                onClick={() => { setProfileOpen(false); navigate('/workout'); }}
              >
                <Compass size={14} />
                <span>Session Control</span>
              </button>

              <div className={styles.dropdownDivider} />

              <button 
                className={`${styles.dropdownItem} ${styles.signOutBtn}`}
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
