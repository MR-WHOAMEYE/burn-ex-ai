/**
 * Nutrition Planner Page
 * 
 * Features:
 *  - Daily macro tracking (protein, carbs, fats, calories)
 *  - Meal photo upload with YOLO food detection
 *  - Hydration tracker
 *  - Meal plan suggestions
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Apple,
  Camera,
  Droplets,
  Plus,
  Upload,
  Beef,
  Wheat,
  Droplet,
  Target,
  Loader2,
} from 'lucide-react';
import styles from './Nutrition.module.css';

interface MacroProgress {
  current: number;
  target: number;
  label: string;
  color: string;
}

export function NutritionPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(4);

  const macros: MacroProgress[] = [
    { current: 85, target: 150, label: 'Protein', color: '#EF4444' },
    { current: 180, target: 250, label: 'Carbs', color: '#F59E0B' },
    { current: 45, target: 70, label: 'Fats', color: '#3B82F6' },
  ];

  const dailyCalories = { current: 1420, target: 2200 };

  const meals = [
    { time: '8:30 AM', name: 'Oatmeal with Berries', cal: 320, protein: 12, carbs: 55, fats: 8 },
    { time: '12:30 PM', name: 'Grilled Chicken Salad', cal: 480, protein: 42, carbs: 25, fats: 18 },
    { time: '3:00 PM', name: 'Protein Shake', cal: 220, protein: 30, carbs: 10, fats: 5 },
  ];

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // TODO: Upload to /api/meals/upload and trigger YOLO pipeline
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
    setIsUploading(false);
  };

  return (
    <div className={styles.nutritionPage}>
      <div className={styles.header}>
        <div>
          <h1>Nutrition</h1>
          <p className={styles.subtitle}>Track meals, macros, and hydration</p>
        </div>
        <button className="btn btn-primary" onClick={handlePhotoUpload}>
          <Camera size={16} />
          Scan Meal
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload Status */}
      {isUploading && (
        <motion.div
          className={styles.uploadBanner}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <Loader2 size={16} className={styles.spinner} />
          Analyzing your meal with AI...
        </motion.div>
      )}

      <div className={styles.mainGrid}>
        {/* Left Column: Calorie Overview + Macros */}
        <div className={styles.leftCol}>
          {/* Daily Calorie Ring */}
          <motion.div
            className={`card ${styles.calorieCard}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.calorieRing}>
              <svg viewBox="0 0 120 120" className={styles.ringSvg}>
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="var(--color-surface-elevated)"
                  strokeWidth="8"
                />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(dailyCalories.current / dailyCalories.target) * 327} 327`}
                  transform="rotate(-90 60 60)"
                  className={styles.ringProgress}
                />
              </svg>
              <div className={styles.ringCenter}>
                <span className={styles.ringValue}>{dailyCalories.current}</span>
                <span className={styles.ringLabel}>/ {dailyCalories.target} kcal</span>
              </div>
            </div>
            <span className="metric-label" style={{ textAlign: 'center' }}>Daily Intake</span>
          </motion.div>

          {/* Macronutrient Bars */}
          <motion.div
            className={`card ${styles.macroCard}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className={styles.cardTitle}>
              <Target size={16} /> Macros
            </h3>
            {macros.map(macro => (
              <div key={macro.label} className={styles.macroItem}>
                <div className={styles.macroHeader}>
                  <span className={styles.macroName}>{macro.label}</span>
                  <span className={styles.macroValues}>
                    {macro.current}g / {macro.target}g
                  </span>
                </div>
                <div className={styles.macroBar}>
                  <motion.div
                    className={styles.macroFill}
                    style={{ background: macro.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((macro.current / macro.target) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </motion.div>

          {/* Hydration Tracker */}
          <motion.div
            className={`card ${styles.hydrationCard}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className={styles.cardTitle}>
              <Droplets size={16} style={{ color: 'var(--color-info)' }} /> Hydration
            </h3>
            <div className={styles.waterGrid}>
              {Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  className={`${styles.waterGlass} ${i < waterGlasses ? styles.waterFilled : ''}`}
                  onClick={() => setWaterGlasses(i + 1)}
                  aria-label={`Glass ${i + 1}`}
                >
                  <Droplet size={20} />
                </button>
              ))}
            </div>
            <span className="metric-label" style={{ textAlign: 'center' }}>
              {waterGlasses} / 8 glasses
            </span>
          </motion.div>
        </div>

        {/* Right Column: Meal Log */}
        <motion.div
          className={`card ${styles.mealLogCard}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className={styles.cardTitle}>
            <Apple size={16} /> Today's Meals
          </h3>

          <div className={styles.mealList}>
            {meals.map((meal, i) => (
              <div key={i} className={styles.mealItem}>
                <div className={styles.mealTime}>{meal.time}</div>
                <div className={styles.mealInfo}>
                  <span className={styles.mealName}>{meal.name}</span>
                  <div className={styles.mealMacros}>
                    <span><Beef size={12} /> {meal.protein}g</span>
                    <span><Wheat size={12} /> {meal.carbs}g</span>
                    <span><Droplet size={12} /> {meal.fats}g</span>
                  </div>
                </div>
                <div className={styles.mealCal}>{meal.cal} kcal</div>
              </div>
            ))}
          </div>

          <button className={`btn btn-outline ${styles.addMealBtn}`}>
            <Plus size={16} />
            Add Meal Manually
          </button>
        </motion.div>
      </div>
    </div>
  );
}
