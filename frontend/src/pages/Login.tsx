import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import styles from './Login.module.css';

export function LoginPage() {
  const { loginWithGoogle, loginAsDemo, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemo();
      navigate('/');
    } catch (err: any) {
      setError('Failed to log in with demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`card ${styles.loginCard}`}>
        <div className={styles.brand}>
          <Flame size={48} className={styles.brandIcon} />
          <h1>Burn-Ex AI</h1>
          <p className={styles.tagline}>AI-Powered Fitness & Wellness</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <button
          className={`btn btn-primary ${styles.googleBtn}`}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <Chrome size={18} />
          Sign in with Google
        </button>

        <button
          className={`btn btn-primary ${styles.demoBtn}`}
          onClick={handleDemoLogin}
          disabled={loading}
        >
          <LogIn size={18} />
          Use Demo Account (Instant Access)
        </button>

        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
          <div className={styles.inputGroup}>
            <Mail size={16} className={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email address"
              className={styles.inputField}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={16} className={styles.inputIcon} />
            <input
              type="password"
              placeholder="Password"
              className={styles.inputField}
              required
            />
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            <LogIn size={16} />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
