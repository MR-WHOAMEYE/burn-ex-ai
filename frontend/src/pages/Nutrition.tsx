/**
 * Premium AI Nutrition Intelligence Hub Page — Burn-Ex AI
 * 
 * Refactored into a spacious 2-column layout to provide maximum breathing room, 
 * matching Apple Health, Lifesum, and Vercel design principles.
 * Built strictly on Slate-Charcoal (#37353E background, #44444E surface, #715A5A borders, #D3DAD9 accents) theme.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Search,
  CheckSquare,
  Square,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Compass,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import styles from './Nutrition.module.css';

interface MacroProgress {
  current: number;
  target: number;
  label: string;
  color: string;
}

interface MealItem {
  time: string;
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fats: number;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
}

interface ScanResult {
  detectedFoods: string[];
  cal: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  healthScore: number;
  suggestions: string;
}

export function NutritionPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(5);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grocery list state
  const [groceries, setGroceries] = useState([
    { id: 1, text: 'Organic Chicken Breast', checked: false },
    { id: 2, text: 'Fresh Spinach', checked: true },
    { id: 3, text: 'Avocados', checked: false },
    { id: 4, text: 'Greek Yogurt (0% Fat)', checked: false },
    { id: 5, text: 'Quinoa', checked: true },
  ]);

  // Recipe generator state
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<{
    title: string;
    prepTime: string;
    kcal: number;
    ingredients: string[];
    steps: string[];
  } | null>(null);

  // Scan states
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Mock static values
  const nutritionScore = 84;
  const dailyCalories = { current: 1420, target: 2200 };
  
  const macros: MacroProgress[] = [
    { current: 95, target: 150, label: 'Protein', color: '#D3DAD9' }, // Accent Sage
    { current: 172, target: 250, label: 'Carbs', color: '#A0A6A5' },  // Muted Sage
    { current: 52, target: 70, label: 'Fats', color: '#715A5A' },     // Border Rose-Brown
  ];

  const [meals, setMeals] = useState<MealItem[]>([
    { time: '08:30 AM', name: 'Oatmeal with Blueberries & Almonds', cal: 380, protein: 14, carbs: 58, fats: 10, category: 'Breakfast' },
    { time: '12:45 PM', name: 'Lemon Herb Grilled Chicken Bowl', cal: 520, protein: 46, carbs: 42, fats: 16, category: 'Lunch' },
    { time: '04:15 PM', name: 'Whey Isolate Protein Shake', cal: 210, protein: 30, carbs: 8, fats: 3, category: 'Snacks' },
  ]);

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setScanResult(null);
    
    // Simulate AI image label translation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setScanResult({
      detectedFoods: ['Sourdough Avocado Toast', 'Poached Free-Range Egg', 'Cherry Tomatoes'],
      cal: 410,
      protein: 18,
      carbs: 34,
      fats: 22,
      fiber: 7,
      sugar: 2.8,
      sodium: 320,
      confidence: 96,
      healthScore: 92,
      suggestions: 'Excellent macronutrient balance. Healthy monounsaturated fats from avocado. Add spinach or arugula to boost Vitamin K levels.',
    });
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const addScannedMeal = () => {
    if (!scanResult) return;
    const newMeal: MealItem = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      name: scanResult.detectedFoods.join(', '),
      cal: scanResult.cal,
      protein: scanResult.protein,
      carbs: scanResult.carbs,
      fats: scanResult.fats,
      category: 'Dinner',
    };
    setMeals([...meals, newMeal]);
    setScanResult(null);
  };

  const toggleGrocery = (id: number) => {
    setGroceries(
      groceries.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const triggerRecipeGenerator = async () => {
    if (!recipeIngredients.trim()) return;
    setIsGeneratingRecipe(true);
    setGeneratedRecipe(null);
    
    // Simulate LLM Synthesizer
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    setGeneratedRecipe({
      title: 'Skillet Garlic Herb Chicken with Quinoa',
      prepTime: '20 mins',
      kcal: 480,
      ingredients: [recipeIngredients, '1 tsp Olive Oil', 'Mixed Salad Greens', 'Lemon Dressing'],
      steps: [
        'Sear chicken breast in skillet with olive oil for 6 minutes per side.',
        'Steam quinoa in a saucepan with chicken broth.',
        'Toss mixed greens in fresh lemon dressing.',
        'Slice chicken breast and serve atop quinoa bed with side salad.',
      ],
    });
    setIsGeneratingRecipe(false);
  };

  return (
    <div className={styles.nutritionPage}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <h1 className={styles.title}>AI Nutrition Intelligence</h1>
        <p className={styles.subtitle}>Immersive real-time metabolic diagnostics & macronutrient engine</p>
      </div>

      {/* HERO BANNER - TALLER & 2-COLUMN STRUCTURE */}
      <div className={styles.heroSection}>
        <div className={styles.heroGrid}>
          {/* Left Block: Combined Health Score, Calories & Macro Indicators */}
          <div className={styles.heroMainCard}>
            <div className={styles.heroScoreHeader}>
              <div>
                <h2 className={styles.cardHeaderTitle}>Today's Nutrition Diagnostics</h2>
                <p className={styles.cardHeaderSubtitle}>Real-time telemetry and metabolic tracking</p>
              </div>
              <span className={styles.pillBadge}>Live Syncing</span>
            </div>
            
            <div className={styles.heroBodyRow}>
              {/* Progress Ring block */}
              <div className={styles.scoreRingContainer}>
                <svg viewBox="0 0 120 120" className={styles.ringSvg}>
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${(nutritionScore / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className={styles.ringCenterText}>
                  <span className={styles.scoreValue}>{nutritionScore}</span>
                  <span className={styles.scoreLabel}>Health Score</span>
                </div>
              </div>

              {/* Calories diagnostics */}
              <div className={styles.caloriesIntakeDetails}>
                <div className={styles.calorieItemRow}>
                  <div className={styles.intakeItem}>
                    <span className={styles.intakeLabel}>Calories Registered</span>
                    <span className={styles.intakeVal}>{dailyCalories.current} kcal</span>
                  </div>
                  <div className={styles.intakeItem}>
                    <span className={styles.intakeLabel}>Target Intake Goal</span>
                    <span className={styles.intakeVal}>{dailyCalories.target} kcal</span>
                  </div>
                </div>
                
                {/* Macro progress meters */}
                <div className={styles.macroPillsList}>
                  {macros.map(m => (
                    <div key={m.label} className={styles.macroPill}>
                      <div className={styles.pillLabels}>
                        <span className={styles.pillName}>{m.label}</span>
                        <span className={styles.pillVals}>{m.current}g / {m.target}g</span>
                      </div>
                      <div className={styles.pillTrack}>
                        <div 
                          className={styles.pillBarFill} 
                          style={{ 
                            background: m.color,
                            width: `${Math.min((m.current / m.target) * 100, 100)}%` 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Spacious AI Meal Scanner Card */}
          <div 
            className={`${styles.heroScannerCard} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className={styles.scannerTitleHeader}>
              <div className={styles.scannerHeader}>
                <Camera size={18} className={styles.cameraIcon} />
                <h2 className={styles.cardHeaderTitle}>AI Meal Scanner</h2>
              </div>
              <span className={styles.scannerBadge}>Instant Upload</span>
            </div>
            
            <div className={styles.dropZoneArea} onClick={handlePhotoUpload}>
              <Upload size={32} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                <strong>Drag & Drop</strong> food photo here, or <span>browse local files</span>
              </p>
              <span className={styles.captureHint}>Supports JPEG, PNG & mobile camera triggers</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className={styles.mainGrid}>
        
        {/* LEFT COLUMN: Trackers, Timeline & Heatmaps */}
        <div className={styles.leftCol}>
          
          {/* Real-time image analyzer dialog */}
          <AnimatePresence mode="wait">
            {isUploading && (
              <motion.div
                className={styles.analyzingCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <Loader2 className={styles.spinnerIcon} size={28} />
                <h3>Analyzing Meal Nutrition Data...</h3>
                <p>Decoding nutrient layers and portion sizes using computer vision...</p>
              </motion.div>
            )}

            {scanResult && !isUploading && (
              <motion.div
                className={styles.scanResultsCard}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className={styles.resultHeader}>
                  <div>
                    <h3 className={styles.resultMainTitle}>Meal Diagnostics Scan Report</h3>
                    <span className={styles.confidenceScore}>
                      YOLOv8 Detection Confidence: <strong>{scanResult.confidence}%</strong>
                    </span>
                  </div>
                  <div className={styles.healthScoreBadge}>
                    <span>Health Rating</span>
                    <strong>{scanResult.healthScore}</strong>
                  </div>
                </div>

                <div className={styles.detectedFoodsList}>
                  {scanResult.detectedFoods.map((f, i) => (
                    <span key={i} className={styles.foodTag}>{f}</span>
                  ))}
                </div>

                {/* Macro summary details */}
                <div className={styles.scannedBreakdown}>
                  <div className={styles.scannedMacroItem}>
                    <span>Energy</span>
                    <strong>{scanResult.cal} kcal</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Protein</span>
                    <strong>{scanResult.protein}g</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Carbohydrates</span>
                    <strong>{scanResult.carbs}g</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Fats</span>
                    <strong>{scanResult.fats}g</strong>
                  </div>
                </div>

                <div className={styles.scannedMicrosGrid}>
                  <div className={styles.microTag}>Dietary Fiber: {scanResult.fiber}g</div>
                  <div className={styles.microTag}>Total Sugar: {scanResult.sugar}g</div>
                  <div className={styles.microTag}>Sodium Count: {scanResult.sodium}mg</div>
                </div>

                <div className={styles.suggestionAlertBox}>
                  <Sparkles size={16} className={styles.suggestionSparkle} />
                  <p>{scanResult.suggestions}</p>
                </div>

                <div className={styles.resultButtons}>
                  <button className="btn btn-primary" onClick={addScannedMeal}>
                    Add to Meal Timeline
                  </button>
                  <button className="btn btn-outline" onClick={() => setScanResult(null)}>
                    Discard Scan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meal Timeline */}
          <div className={`card ${styles.timelineCard}`}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h3 className={styles.cardSectionTitle}>
                  <Clock size={16} /> Meal Timeline
                </h3>
                <p className={styles.cardSectionSubtitle}>Logged meals and nutrient intakes logged today</p>
              </div>
              
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search logged foods..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.timelineList}>
              {meals
                .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((m, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <div className={styles.itemCategoryTime}>
                      <span className={styles.timeTag}>{m.time}</span>
                      <span className={styles.categoryBadge}>{m.category}</span>
                    </div>
                    <div className={styles.timelineItemContent}>
                      <span className={styles.foodTitle}>{m.name}</span>
                      <div className={styles.timelineMacros}>
                        <span>Protein: <strong>{m.protein}g</strong></span>
                        <span>Carbs: <strong>{m.carbs}g</strong></span>
                        <span>Fats: <strong>{m.fats}g</strong></span>
                      </div>
                    </div>
                    <span className={styles.timelineKcal}>{m.cal} kcal</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Compliance Heatmap */}
          <div className={`card ${styles.heatmapCard}`}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h3 className={styles.cardSectionTitle}>Weekly Nutrition Compliance Heatmap</h3>
                <p className={styles.cardSectionSubtitle}>Visual compliance scores mapping caloric goals</p>
              </div>
              <span className={styles.complianceRate}>Avg 94% Compliance Rate</span>
            </div>

            {/* SVG Grid */}
            <div className={styles.heatmapWrapper}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => (
                <div key={day} className={styles.heatmapRow}>
                  <span className={styles.dayLabel}>{day}</span>
                  {Array.from({ length: 4 }).map((_, weekIdx) => {
                    const idx = dayIdx + weekIdx * 7;
                    const scores = [92, 95, 88, 74, 98, 91, 85, 96, 94, 90, 82, 99, 93, 86, 91, 95, 78, 89, 94, 97, 88, 92, 96, 75, 84, 91, 98, 93];
                    const currentScore = scores[idx % scores.length];
                    
                    let fill = 'rgba(211, 218, 217, 0.05)';
                    if (currentScore >= 95) fill = '#D3DAD9';
                    else if (currentScore >= 90) fill = 'rgba(211, 218, 217, 0.7)';
                    else if (currentScore >= 80) fill = 'rgba(211, 218, 217, 0.4)';
                    else fill = 'rgba(113, 90, 90, 0.5)';

                    return (
                      <div 
                        key={weekIdx} 
                        className={styles.heatmapDay} 
                        style={{ background: fill }}
                        title={`${day} Week ${weekIdx + 1}: ${currentScore}% Compliance`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div className={styles.heatmapLegend}>
              <span>Low Compliance</span>
              <div className={styles.legendBars}>
                <div style={{ background: 'rgba(113, 90, 90, 0.5)', width: 14, height: 14, borderRadius: 3 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.4)', width: 14, height: 14, borderRadius: 3 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.7)', width: 14, height: 14, borderRadius: 3 }} />
                <div style={{ background: '#D3DAD9', width: 14, height: 14, borderRadius: 3 }} />
              </div>
              <span>Optimal Target Met</span>
            </div>
          </div>

          {/* Sub-grid: Micronutrients & Weekly Averages side-by-side */}
          <div className={styles.subGridRow}>
            {/* Micronutrient card */}
            <div className={`card ${styles.microCard}`}>
              <h3 className={styles.cardSectionTitle}>
                <Target size={16} /> Daily Micronutrients
              </h3>
              
              <div className={styles.micronutrientsList}>
                <div className={styles.microItem}>
                  <div className={styles.microHeader}>
                    <span>Sodium</span>
                    <span>780mg / 1500mg</span>
                  </div>
                  <div className={styles.microBar}>
                    <div className={styles.microFill} style={{ width: '52%', background: 'var(--color-border)' }} />
                  </div>
                </div>

                <div className={styles.microItem}>
                  <div className={styles.microHeader}>
                    <span>Dietary Fiber</span>
                    <span>22g / 30g</span>
                  </div>
                  <div className={styles.microBar}>
                    <div className={styles.microFill} style={{ width: '73%', background: 'var(--color-accent)' }} />
                  </div>
                </div>

                <div className={styles.microItem}>
                  <div className={styles.microHeader}>
                    <span>Sugar Intake</span>
                    <span>18g / 50g</span>
                  </div>
                  <div className={styles.microBar}>
                    <div className={styles.microFill} style={{ width: '36%', background: 'var(--color-accent)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly averages card */}
            <div className={`card ${styles.weeklyTrendCard}`}>
              <div className={styles.trendHeader}>
                <TrendingUp size={16} />
                <h3 className={styles.cardSectionTitle}>Weekly Kcal Averages</h3>
              </div>
              
              <div className={styles.trendChart}>
                <svg viewBox="0 0 100 35" className={styles.trendSvg}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,28 Q15,10 30,22 T60,8 T90,14" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                  <path d="M0,28 Q15,10 30,22 T60,8 T90,14 L100,35 L0,35 Z" fill="url(#trendGrad)" />
                </svg>
              </div>
              <span className={styles.trendAverageLabel}>Average weekly burn: 1,980 kcal</span>
            </div>
          </div>

          {/* Achievements list */}
          <div className={`card ${styles.achievementsCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Award size={16} /> Achievements & Milestones
            </h3>
            
            <div className={styles.achievementsGridRow}>
              <div className={styles.achievementBadge}>
                <div className={styles.badgeIconWrapper}>
                  <Droplets size={16} />
                </div>
                <div>
                  <h4>Hydration Hero</h4>
                  <p>Met water intake targets 5 days in a row</p>
                </div>
              </div>
              
              <div className={styles.achievementBadge}>
                <div className={styles.badgeIconWrapper}>
                  <Apple size={16} />
                </div>
                <div>
                  <h4>Clean Eating Streak</h4>
                  <p>Over 90% health scores tracked this week</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: AI Advisory & Actions */}
        <div className={styles.rightCol}>
          
          {/* AI Coach Alerts */}
          <div className={`card ${styles.coachPanelCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Sparkles size={16} /> AI Coach Advisory
            </h3>

            <div className={styles.advisoryAlertsList}>
              <div className={styles.advisoryAlert}>
                <AlertTriangle size={16} className={styles.alertIconYellow} />
                <div>
                  <h4>Protein Deficit Flagged</h4>
                  <p>Require <strong>55g</strong> additional protein to meet skeletal tissue target.</p>
                </div>
              </div>

              <div className={styles.advisoryAlert}>
                <CheckCircle size={16} className={styles.alertIconGreen} />
                <div>
                  <h4>Recovery Recommendation</h4>
                  <p>Post-workout Window open: Recommend Salmon + Sweet Potato Bowl.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hydration tracker */}
          <div className={`card ${styles.hydrationCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Droplets size={16} /> Hydration Diagnostics
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
            
            <div className={styles.hydrationFooter}>
              <span>Daily Target Met: <strong>{((waterGlasses / 8) * 100).toFixed(0)}%</strong></span>
              <span>{waterGlasses} / 8 Glasses</span>
            </div>
          </div>

          {/* AI Recipe Generator Form - Spacious vertically stacked inputs */}
          <div className={`card ${styles.recipeGeneratorCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <BookOpen size={16} /> AI Recipe Generator
            </h3>
            <p className={styles.recipeSubtitle}>Input ingredients on hand, synthesize customized plans</p>
            
            <div className={styles.recipeFormStacked}>
              <input
                type="text"
                placeholder="Ingredients (e.g. Salmon, Broccoli, Quinoa)"
                value={recipeIngredients}
                onChange={e => setRecipeIngredients(e.target.value)}
                className={styles.recipeInput}
              />
              <button 
                className="btn btn-primary"
                onClick={triggerRecipeGenerator}
                disabled={isGeneratingRecipe || !recipeIngredients.trim()}
                style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isGeneratingRecipe ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} style={{ marginRight: '8px' }} />
                    Synthesizing Recipe...
                  </>
                ) : (
                  'Generate Recipe Plan'
                )}
              </button>
            </div>

            {generatedRecipe && (
              <div className={styles.recipeOutput}>
                <h4>{generatedRecipe.title}</h4>
                <div className={styles.recipeMetaDetails}>
                  <span>Prep: {generatedRecipe.prepTime}</span>
                  <span>Kcal: {generatedRecipe.kcal} kcal</span>
                </div>
                
                <div className={styles.recipeSectionHeader}>Ingredients Needed:</div>
                <ul className={styles.recipeList}>
                  {generatedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx}>{ing}</li>
                  ))}
                </ul>

                <div className={styles.recipeSectionHeader}>Preparation Instructions:</div>
                <ol className={styles.recipeList}>
                  {generatedRecipe.steps.map((st, idx) => (
                    <li key={idx}>{st}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Smart Grocery List */}
          <div className={`card ${styles.groceryCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <CheckSquare size={16} /> Smart Grocery List
            </h3>

            <div className={styles.groceryList}>
              {groceries.map(item => (
                <div 
                  key={item.id} 
                  className={`${styles.groceryItem} ${item.checked ? styles.groceryChecked : ''}`}
                  onClick={() => toggleGrocery(item.id)}
                >
                  {item.checked ? (
                    <CheckSquare size={16} className={styles.checkboxIconActive} />
                  ) : (
                    <Square size={16} className={styles.checkboxIcon} />
                  )}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <div className={styles.addGroceryItemInputWrapper}>
              <input
                type="text"
                placeholder="Add shopping item..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      setGroceries([...groceries, { id: Date.now(), text: val, checked: false }]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Healthy Restaurant Guide */}
          <div className={`card ${styles.restaurantsCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Compass size={16} /> AI Restaurant Guide
            </h3>
            
            <div className={styles.restaurantsList}>
              <div className={styles.restaurantItem}>
                <div className={styles.restaurantMain}>
                  <h4>Sweetgreen</h4>
                  <p>Guacamole Greens Bowl (530 kcal, 24g Protein)</p>
                </div>
                <ChevronRight size={14} className={styles.arrowIcon} />
              </div>
              
              <div className={styles.restaurantItem}>
                <div className={styles.restaurantMain}>
                  <h4>The Salad Project</h4>
                  <p>Sesame Crunch Bowl (480 kcal, 28g Protein)</p>
                </div>
                <ChevronRight size={14} className={styles.arrowIcon} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
