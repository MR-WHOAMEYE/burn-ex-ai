import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Flame, Mail, Lock, LogIn, Chrome, 
  User, Phone, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../context/AuthContext';
import styles from './Login.module.css';

export function LoginPage() {
  const { loginWithGoogle, loginAsDemo, user } = useAuth();
  const navigate = useNavigate();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Password show/hide toggle
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [age, setAge] = useState('24');
  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('70');
  const [activity, setActivity] = useState('moderate');

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

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, {
        displayName: name,
      });

      const token = await firebaseUser.getIdToken();
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heightCm: Number(height),
          weightKg: Number(weight),
          age: Number(age),
          biologicalSex: gender,
          activityLevel: activity,
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ Profile sync with backend database failed, using local model');
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      
      {/* ─── LEFT PANEL: PLATFORM INTEL (50% Split) ─── */}
      <div className={styles.leftShowcase}>
        <div className={styles.showcaseGlow} />
        
        <div className={styles.showcaseHeader}>
          <div className={styles.brandGroup}>
            <div className={styles.logoBox}>
              <Flame size={20} className={styles.logoIcon} />
            </div>
            <div className={styles.brandTextGroup}>
              <span className={styles.brandTitle}>BURN-EX AI</span>
              <span className={styles.brandSubtitle}>Biomechanical Intelligence Platform</span>
            </div>
          </div>
        </div>

        <div className={styles.showcaseBody}>
          <h1 className={styles.showcaseTitle}>
            Biomechanical <br />
            Intelligence, <br />
            <span className={styles.peachAccent}>Reimagined.</span>
          </h1>
          <p className={styles.showcaseDesc}>
            Real-time pose estimation, joint angle calibration, and AI-powered metabolic analysis for elite physical performance.
          </p>
        </div>

        {/* Horizontal numeric stats at bottom left */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statVal}>14K+</span>
            <span className={styles.statLabel}>Workouts Tracked</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>98.6%</span>
            <span className={styles.statLabel}>Pose Accuracy</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statVal}>12+</span>
            <span className={styles.statLabel}>Muscle Groups</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: CLEAN COMMAND AUTHENTICATION (50% Split) ─── */}
      <div className={styles.authPanel}>
        <div className={styles.authCard}>
          
          <div className={styles.authHeader}>
            <h2>{isSignUp ? 'Create your profile' : 'Welcome back'}</h2>
            <p className={styles.authSubtitle}>
              {isSignUp 
                ? 'Register your body telemetry to initialize metabolic targets' 
                : 'Sign in to access the athlete command center'}
            </p>
          </div>

          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* Dynamic Switch Forms */}
          {!isSignUp ? (
            /* ── SIGN IN MODE ── */
            <form onSubmit={handleSignInSubmit} className={styles.authForm}>
              <div className={styles.inputBlock}>
                <label className={styles.label}>EMAIL</label>
                <input
                  type="email"
                  placeholder="admin@burnex.ai"
                  className={styles.inputField}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputBlock}>
                <label className={styles.label}>PASSWORD</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={styles.inputField}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className={styles.submitBtnPill} 
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
                <ArrowRight size={16} />
              </button>

              {/* Demo Credentials Container (Matches Medix reference layout) */}
              <div className={styles.demoCredentialsBox}>
                <div className={styles.demoTitle}>
                  <ShieldCheck size={14} className={styles.demoShieldIcon} />
                  <span>Demo Credentials</span>
                </div>
                <div className={styles.demoList}>
                  <div className={styles.demoItem}>
                    <span className={`${styles.dot} ${styles.dotRed}`} />
                    <span>Athlete: <strong>demo@burnex.ai</strong> / password: <strong>demo123</strong></span>
                  </div>
                </div>
              </div>

              <div className={styles.divider}>
                <span>or authenticate with</span>
              </div>

              <div className={styles.socialAuthRow}>
                <button
                  type="button"
                  className={`btn btn-outline ${styles.socialBtn}`}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <Chrome size={16} />
                  Google
                </button>
                <button
                  type="button"
                  className={`btn btn-outline ${styles.socialBtn}`}
                  onClick={handleDemoLogin}
                  disabled={loading}
                >
                  <LogIn size={16} />
                  Quick Demo
                </button>
              </div>

              <div className={styles.modeToggleLink}>
                New to Burn-Ex AI?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsSignUp(true); setSignUpStep(1); setError(null); }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          ) : (
            /* ── SIGN UP MODE (MULTIPHASE Telemetry Forms) ── */
            <form onSubmit={handleSignUpSubmit} className={styles.authForm}>
              
              {signUpStep === 1 ? (
                /* Step 1: Account Setup */
                <div className={styles.stepContainer}>
                  <div className={styles.stepHeader}>
                    <span>STEP 1 OF 2: CREDENTIALS</span>
                    <span>Account Info</span>
                  </div>

                  <div className={styles.inputBlock}>
                    <label className={styles.label}>FULL NAME</label>
                    <div className={styles.inputGroup}>
                      <User size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        placeholder="John Doe"
                        className={styles.inputFieldWithIcon}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputBlock}>
                    <label className={styles.label}>PHONE NUMBER</label>
                    <div className={styles.inputGroup}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className={styles.inputFieldWithIcon}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputBlock}>
                    <label className={styles.label}>EMAIL ADDRESS</label>
                    <div className={styles.inputGroup}>
                      <Mail size={16} className={styles.inputIcon} />
                      <input
                        type="email"
                        placeholder="athlete@burnex.ai"
                        className={styles.inputFieldWithIcon}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputBlock}>
                    <label className={styles.label}>PASSWORD</label>
                    <div className={styles.inputGroup}>
                      <Lock size={16} className={styles.inputIcon} />
                      <input
                        type="password"
                        placeholder="Choose a strong security token"
                        className={styles.inputFieldWithIcon}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className={styles.submitBtnPill}
                    onClick={() => {
                      if (name && phone && email && password) {
                        setSignUpStep(2);
                      } else {
                        setError('Please fill in all account fields');
                      }
                    }}
                  >
                    Continue to Body Bio-metrics
                    <ArrowRight size={16} />
                  </button>

                  <div className={styles.modeToggleLink}>
                    Already have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => { setIsSignUp(false); setError(null); }}
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Body Biometrics Setup */
                <div className={styles.stepContainer}>
                  <div className={styles.stepHeader}>
                    <span>STEP 2 OF 2: BIOMETRICS</span>
                    <span>Body Metrics</span>
                  </div>

                  <div className={styles.grid2Col}>
                    <div className={styles.inputBlock}>
                      <label className={styles.label}>GENDER / SEX</label>
                      <select 
                        className={styles.selectField}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className={styles.inputBlock}>
                      <label className={styles.label}>AGE</label>
                      <input
                        type="number"
                        placeholder="24"
                        className={styles.inputFieldRaw}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="1"
                        max="120"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.grid2Col}>
                    <div className={styles.inputBlock}>
                      <label className={styles.label}>HEIGHT (CM)</label>
                      <input
                        type="number"
                        placeholder="175"
                        className={styles.inputFieldRaw}
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        min="50"
                        max="250"
                        required
                      />
                    </div>

                    <div className={styles.inputBlock}>
                      <label className={styles.label}>WEIGHT (KG)</label>
                      <input
                        type="number"
                        placeholder="70"
                        className={styles.inputFieldRaw}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        min="20"
                        max="300"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.inputBlock}>
                    <label className={styles.label}>DAILY ACTIVITY LEVEL</label>
                    <select 
                      className={styles.selectField}
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      required
                    >
                      <option value="sedentary">Sedentary (No exercise)</option>
                      <option value="light">Lightly Active (1-3 days/week)</option>
                      <option value="moderate">Moderately Active (3-5 days/week)</option>
                      <option value="active">Highly Active (6-7 days/week)</option>
                    </select>
                  </div>

                  <div className={styles.navRow}>
                    <button 
                      type="button" 
                      className="btn btn-outline"
                      onClick={() => setSignUpStep(1)}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving telemetry...' : 'Complete Registration'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Copyright centered footer */}
          <div className={styles.authCopyright}>
            © {new Date().getFullYear()} BURN-EX AI - Biomechanical Intelligence Platform
          </div>

        </div>
      </div>

    </div>
  );
}
