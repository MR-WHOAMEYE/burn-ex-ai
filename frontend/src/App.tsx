/**
 * Burn-Ex AI — Root Application Component
 * 
 * Sets up:
 *   1. AuthProvider for Firebase session state
 *   2. React Router mappings for both desktop and mobile sensor pages
 *   3. ProtectedRoute wrapper to gate dashboards
 *   4. Lazy-loaded code-splitting views
 */
import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import type { Theme } from './types';

// ─── Lazy-loaded Pages (Code Splitting) ─────────────────────
const DashboardPage = lazy(() =>
  import('./pages/Dashboard').then(m => ({ default: m.DashboardPage }))
);
const MobileSensorPage = lazy(() =>
  import('./pages/MobileSensor').then(m => ({ default: m.MobileSensorPage }))
);
const WorkoutPage = lazy(() =>
  import('./pages/Workout').then(m => ({ default: m.WorkoutPage }))
);
const NutritionPage = lazy(() =>
  import('./pages/Nutrition').then(m => ({ default: m.NutritionPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/Analytics').then(m => ({ default: m.AnalyticsPage }))
);
const AchievementsPage = lazy(() =>
  import('./pages/Achievements').then(m => ({ default: m.AchievementsPage }))
);
const LoginPage = lazy(() =>
  import('./pages/Login').then(m => ({ default: m.LoginPage }))
);
const ProfileSetupPage = lazy(() =>
  import('./pages/ProfileSetup').then(m => ({ default: m.ProfileSetupPage }))
);
const HistoryPage = lazy(() =>
  import('./pages/History').then(m => ({ default: m.HistoryPage }))
);

// Placeholder pages
const PlaceholderPage = ({ name }: { name: string }) => (
  <div style={{ paddingTop: 'var(--space-xl)' }}>
    <h1>{name}</h1>
    <p style={{ color: 'var(--color-muted)', marginTop: 'var(--space-sm)' }}>
      Coming in the next sprint.
    </p>
  </div>
);

// ─── Loading Fallback ────────────────────────────────────────
function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--color-muted)',
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      Loading...
    </div>
  );
}

// ─── Protected Route Wrapper ─────────────────────────────────
function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

// ─── Layout Wrapper ──────────────────────────────────────────
function AppLayout({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const location = useLocation();
  const { user } = useAuth();

  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const isMobilePage = location.pathname.startsWith('/mobile');
  const isLoginPage = location.pathname.startsWith('/login');
  const isSetupPage = location.pathname.startsWith('/setup');

  // Mobile sensor page, Login, and Profile Setup pages run standalone (no dashboard sidebar/topbar)
  if (isMobilePage || isLoginPage || isSetupPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/mobile" element={<MobileSensorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<ProfileSetupPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div 
      className="app-layout" 
      style={{ '--sidebar-width': sidebarExpanded ? '260px' : '84px' } as React.CSSProperties}
    >
      <Sidebar isExpanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
      <div className="main-content">
        <TopBar
          displayName={user?.displayName || 'Athletic User'}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout"
              element={
                <ProtectedRoute>
                  <WorkoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nutrition"
              element={
                <ProtectedRoute>
                  <NutritionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/coach" element={<PlaceholderPage name="AI Coach" />} />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<PlaceholderPage name="Settings" />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout theme={theme} onToggleTheme={toggleTheme} />
      </BrowserRouter>
    </AuthProvider>
  );
}
