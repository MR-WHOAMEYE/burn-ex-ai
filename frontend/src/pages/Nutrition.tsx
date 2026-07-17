/**
 * Premium AI Nutrition Intelligence Hub Page — Burn-Ex AI
 * 
 * Redesigned according to Apple Health, Lifesum, and WHOOP principles.
 * Built strictly on Slate-Charcoal, Rose-Brown, and Sage-Grey palette rules.
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
    
    // Simulate complex AI analysis pipeline (YOLOv8 + GPT-4o Vision API translation)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
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
    
    // Simulate AI LLM recipe synthesizer
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Nutrition Intelligence</h1>
          <p className={styles.subtitle}>Immersive real-time metabolic diagnostics & macronutrient engine</p>
        </div>
      </div>

      {/* HERO SECTION CONTAINER */}
      <div className={styles.heroSection}>
        <div className={styles.heroGrid}>
          {/* Card 1: Today's Health Score & Intake */}
          <div className={styles.heroScoreCard}>
            <div className={styles.scoreTitleHeader}>
              <h2 className={styles.cardHeaderTitle}>Today's Status</h2>
              <span className={styles.pillBadge}>Live Telemetry</span>
            </div>
            
            <div className={styles.scoreRow}>
              {/* Progress Ring */}
              <div className={styles.scoreRingContainer}>
                <svg viewBox="0 0 120 120" className={styles.ringSvg}>
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(nutritionScore / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className={styles.ringCenterText}>
                  <span className={styles.scoreValue}>{nutritionScore}</span>
                  <span className={styles.scoreLabel}>Health score</span>
                </div>
              </div>

              {/* Calories Overview */}
              <div className={styles.caloriesIntakeDetails}>
                <div className={styles.intakeItem}>
                  <span className={styles.intakeLabel}>Calories Registered</span>
                  <span className={styles.intakeVal}>{dailyCalories.current} kcal</span>
                </div>
                <div className={styles.intakeDivider} />
                <div className={styles.intakeItem}>
                  <span className={styles.intakeLabel}>Target Intake Goal</span>
                  <span className={styles.intakeVal}>{dailyCalories.target} kcal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI Daily Recommendation and Insights */}
          <div className={styles.heroInsightCard}>
            <div className={styles.insightHeader}>
              <Sparkles size={16} className={styles.sparkleIcon} />
              <h2 className={styles.cardHeaderTitle}>AI Nutrition Coach Insights</h2>
            </div>
            <p className={styles.coachText}>
              "Your protein absorption is currently optimal at <strong>95g</strong>. However, hydration levels are running low for your workout load. Recommend drinking <strong>3 more glasses</strong> of water prior to your evening training. Include potassium-rich foods to prevent lactic cramps."
            </p>
            
            {/* Macro preview meters */}
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

          {/* Card 3: AI Meal Scanner Drag & Drop Area */}
          <div 
            className={`${styles.heroScannerCard} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className={styles.scannerHeader}>
              <Camera size={18} className={styles.cameraIcon} />
              <h2 className={styles.cardHeaderTitle}>AI Meal Scanner</h2>
            </div>
            
            <div className={styles.dropZoneArea} onClick={handlePhotoUpload}>
              <Upload size={28} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                <strong>Drag & Drop</strong> food image here, or <span>browse local files</span>
              </p>
              <span className={styles.captureHint}>Supports instant mobile camera scans</span>
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

      {/* main grid layouts */}
      <div className={styles.mainGrid}>
        
        {/* LEFT COLUMN: MEAL SCANNER RESULTS & TIMELINE */}
        <div className={styles.leftCol}>
          
          {/* Analyze Upload State */}
          <AnimatePresence mode="wait">
            {isUploading && (
              <motion.div
                className={styles.analyzingCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Loader2 className={styles.spinnerIcon} size={24} />
                <h3>Analyzing Meal Texture & Composition...</h3>
                <p>Synthesizing nutritional labels using YOLOv8 vision diagnostics</p>
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
                    <h3 className={styles.resultMainTitle}>Scan Results</h3>
                    <span className={styles.confidenceScore}>
                      Confidence: <strong>{scanResult.confidence}%</strong>
                    </span>
                  </div>
                  <div className={styles.healthScoreBadge}>
                    <span>Health Score</span>
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
                    <span>Calories</span>
                    <strong>{scanResult.cal} kcal</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Protein</span>
                    <strong>{scanResult.protein}g</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Carbs</span>
                    <strong>{scanResult.carbs}g</strong>
                  </div>
                  <div className={styles.scannedMacroItem}>
                    <span>Fat</span>
                    <strong>{scanResult.fats}g</strong>
                  </div>
                </div>

                <div className={styles.scannedMicrosGrid}>
                  <div className={styles.microTag}>Fiber: {scanResult.fiber}g</div>
                  <div className={styles.microTag}>Sugar: {scanResult.sugar}g</div>
                  <div className={styles.microTag}>Sodium: {scanResult.sodium}mg</div>
                </div>

                <div className={styles.suggestionAlertBox}>
                  <Sparkles size={14} className={styles.suggestionSparkle} />
                  <p>{scanResult.suggestions}</p>
                </div>

                <div className={styles.resultButtons}>
                  <button className="btn btn-primary" onClick={addScannedMeal}>
                    Log Meal to Timeline
                  </button>
                  <button className="btn btn-outline" onClick={() => setScanResult(null)}>
                    Discard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meal Timeline */}
          <div className={`card ${styles.timelineCard}`}>
            <div className={styles.cardHeaderRow}>
              <h3 className={styles.cardSectionTitle}>
                <Clock size={16} /> Meal Timeline
              </h3>
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
                        <span>Protein: {m.protein}g</span>
                        <span>Carbs: {m.carbs}g</span>
                        <span>Fats: {m.fats}g</span>
                      </div>
                    </div>
                    <span className={styles.timelineKcal}>{m.cal} kcal</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Nutrition Achievements */}
          <div className={`card ${styles.achievementsCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Award size={16} /> Achievements & Milestones
            </h3>
            <div className={styles.achievementsGrid}>
              <div className={styles.achievementBadge}>
                <div className={styles.badgeIconWrapper}>
                  <Droplets size={16} />
                </div>
                <div>
                  <h4>Hydration Streak</h4>
                  <p>Met water goals 5 days in a row</p>
                </div>
              </div>
              <div className={styles.achievementBadge}>
                <div className={styles.badgeIconWrapper}>
                  <Apple size={16} />
                </div>
                <div>
                  <h4>Clean Plate Club</h4>
                  <p>Over 90% health scores this week</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: INTEL SUMMARY & HEATMAPS */}
        <div className={styles.middleCol}>
          
          {/* Heatmap Section */}
          <div className={`card ${styles.heatmapCard}`}>
            <div className={styles.cardHeaderRow}>
              <div>
                <h3 className={styles.cardSectionTitle}>Weekly Nutrition Heatmap</h3>
                <p className={styles.cardSectionSubtitle}>Visual compliance scores mapping</p>
              </div>
              <span className={styles.complianceRate}>Avg 94% compliance</span>
            </div>

            {/* SVG Grid */}
            <div className={styles.heatmapWrapper}>
              <div className={styles.heatmapHeaderLabel}>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
              <div className={styles.heatmapGrid}>
                {/* Visual grid arrays */}
                {Array.from({ length: 28 }, (_, idx) => {
                  const scores = [92, 95, 88, 74, 98, 91, 85, 96, 94, 90, 82, 99, 93, 86, 91, 95, 78, 89, 94, 97, 88, 92, 96, 75, 84, 91, 98, 93];
                  const currentScore = scores[idx % scores.length];
                  
                  // Color codes strictly mapping our Sage-Grey accents
                  let fill = 'rgba(211, 218, 217, 0.05)';
                  if (currentScore >= 95) fill = '#D3DAD9';
                  else if (currentScore >= 90) fill = 'rgba(211, 218, 217, 0.7)';
                  else if (currentScore >= 80) fill = 'rgba(211, 218, 217, 0.4)';
                  else fill = 'rgba(113, 90, 90, 0.5)'; // Muted rose alerts

                  return (
                    <div 
                      key={idx} 
                      className={styles.heatmapDay} 
                      style={{ background: fill }}
                      title={`Compliance: ${currentScore}%`}
                    />
                  );
                })}
              </div>
            </div>
            <div className={styles.heatmapLegend}>
              <span>Low Compliance</span>
              <div className={styles.legendBars}>
                <div style={{ background: 'rgba(113, 90, 90, 0.5)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.4)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: 'rgba(211, 218, 217, 0.7)', width: 12, height: 12, borderRadius: 2 }} />
                <div style={{ background: '#D3DAD9', width: 12, height: 12, borderRadius: 2 }} />
              </div>
              <span>Optimal</span>
            </div>
          </div>

          {/* Hydration Tracker */}
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
                  <Droplet size={22} />
                </button>
              ))}
            </div>
            <div className={styles.hydrationFooter}>
              <span>Daily Target Met: <strong>{((waterGlasses / 8) * 100).toFixed(0)}%</strong></span>
              <span>{waterGlasses} / 8 Glasses</span>
            </div>
          </div>

          {/* Micronutrient Summary */}
          <div className={`card ${styles.microCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <Target size={16} /> Daily Micronutrient Balance
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
                  <span>Fiber</span>
                  <span>22g / 30g</span>
                </div>
                <div className={styles.microBar}>
                  <div className={styles.microFill} style={{ width: '73%', background: 'var(--color-accent)' }} />
                </div>
              </div>

              <div className={styles.microItem}>
                <div className={styles.microHeader}>
                  <span>Sugar</span>
                  <span>18g / 50g</span>
                </div>
                <div className={styles.microBar}>
                  <div className={styles.microFill} style={{ width: '36%', background: 'var(--color-accent)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className={`card ${styles.weeklyTrendCard}`}>
            <div className={styles.trendHeader}>
              <TrendingUp size={16} />
              <h3 className={styles.cardSectionTitle}>Weekly Kcal Averages</h3>
            </div>
            <div className={styles.trendChart}>
              {/* Dynamic SVG Mini-graph */}
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

        {/* RIGHT COLUMN: AI COACH, GROCERY & RECIPES */}
        <div className={styles.rightCol}>
          
          {/* AI Nutrition Coach Alerts */}
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

          {/* AI Recipe Generator Form */}
          <div className={`card ${styles.recipeGeneratorCard}`}>
            <h3 className={styles.cardSectionTitle}>
              <BookOpen size={16} /> AI Recipe Generator
            </h3>
            <p className={styles.recipeSubtitle}>Input ingredients on hand, synthesize customized plans</p>
            
            <div className={styles.recipeForm}>
              <input
                type="text"
                placeholder="Ingredients (e.g. Chicken, Broccoli, Brown Rice)"
                value={recipeIngredients}
                onChange={e => setRecipeIngredients(e.target.value)}
              />
              <button 
                className="btn btn-primary"
                onClick={triggerRecipeGenerator}
                disabled={isGeneratingRecipe || !recipeIngredients.trim()}
              >
                {isGeneratingRecipe ? (
                  <>
                    <Loader2 size={14} className={styles.spinner} />
                    Synthesizing...
                  </>
                ) : (
                  'Generate Plan'
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

          {/* Healthy Restaurant Recommendations */}
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
