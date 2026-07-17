import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Save, AlertCircle } from 'lucide-react';
import type { BiologicalSex, ActivityLevel } from '../types';
import styles from './ProfileSetup.module.css';

export function ProfileSetupPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    heightCm: 175,
    weightKg: 70,
    age: 25,
    biologicalSex: 'male' as BiologicalSex,
    activityLevel: 'moderately active' as ActivityLevel,
    bodyFatPercent: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setError('You must be logged in to save profile data.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile');
      }

      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.setupContainer}>
      <div className={`card ${styles.setupCard}`}>
        <div className={styles.header}>
          <Dumbbell size={36} className={styles.headerIcon} />
          <h1>Profile Setup</h1>
          <p className={styles.desc}>Let's calibrate your daily metabolic burn rate</p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Biological Sex</label>
              <select
                className={styles.select}
                value={formData.biologicalSex}
                onChange={(e) => setFormData({ ...formData, biologicalSex: e.target.value as BiologicalSex })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Age (years)</label>
              <input
                type="number"
                min="5"
                max="120"
                className={styles.input}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Height (cm)</label>
              <input
                type="number"
                min="50"
                max="300"
                className={styles.input}
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Weight (kg)</label>
              <input
                type="number"
                min="20"
                max="400"
                className={styles.input}
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Activity Level</label>
              <select
                className={styles.select}
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
              >
                <option value="sedentary">Sedentary (BMR x 1.2)</option>
                <option value="lightly active">Lightly active (BMR x 1.375)</option>
                <option value="moderately active">Moderately active (BMR x 1.55)</option>
                <option value="very active">Very active (BMR x 1.725)</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Body Fat % (optional)</label>
              <input
                type="number"
                min="1"
                max="70"
                className={styles.input}
                value={formData.bodyFatPercent || ''}
                placeholder="Scale measurement"
                onChange={(e) => setFormData({ ...formData, bodyFatPercent: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Profile & Calculate TDEE'}
          </button>
        </form>
      </div>
    </div>
  );
}
