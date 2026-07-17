/**
 * Premium SaaS Top Navigation Bar
 * 
 * Displays:
 *  - Active telemetry indicators (Streak, Phone Sync, Timer)
 *  - Global search and quick action button
 *  - Notification bell with dynamic badge
 *  - Interactive user avatar dropdown with Sign Out capability
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Moon,
  Sun,
  Search,
  Bell,
  Flame,
  Smartphone,
  Timer,
  ChevronDown,
  LogOut,
  User,
  Plus,
  Compass,
} from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  displayName: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function TopBar({ displayName, theme, onToggleTheme }: TopBarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
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

  return (
    <header className={styles.topbar}>
      {/* Search, Quick Action, Theme, Notifications & Profile */}
      <div className={styles.actions}>
        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search telemetry, nutrition..."
            className={styles.searchInput}
          />
        </div>

        {/* Quick Action Button */}
        <button 
          className={`btn btn-primary ${styles.quickActionBtn}`}
          onClick={() => navigate('/workout')}
        >
          <Plus size={15} />
          <span>Workout</span>
        </button>

        {/* Theme Toggle */}
        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Bell with Badge */}
        <button className={`${styles.iconBtn} ${styles.notificationBtn}`} aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.notificationBadge} />
        </button>

        {/* Profile Dropdown Container */}
        <div className={styles.profileContainer} ref={dropdownRef}>
          <button 
            className={styles.profileTrigger}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="User Profile Options"
          >
            <div className={styles.avatar}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={14} className={styles.dropdownChevron} data-open={dropdownOpen} />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownName}>{displayName}</span>
                <span className={styles.dropdownRole}>Level 4 Athlete</span>
              </div>
              
              <button 
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              >
                <User size={14} />
                <span>Account Profile</span>
              </button>

              <button 
                className={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); navigate('/workout'); }}
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
    </header>
  );
}
