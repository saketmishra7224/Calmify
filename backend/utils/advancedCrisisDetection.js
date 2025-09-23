/**
 * Advanced Crisis Detection System
 * Comprehensive crisis detection with enhanced keyword analysis and severity scoring
 */

const mongoose = require('mongoose');

/**
 * Enhanced crisis keywords categorized by type and severity
 */
const CRISIS_KEYWORDS = {
  suicide: {
    critical: [
      'kill myself', 'end my life', 'suicide plan', 'ready to die', 'going to kill myself',
      'have the pills', 'have the rope', 'have the gun', 'final goodbye',
      'taking my life tonight', 'this is the end', 'can\'t live anymore',
      'planning my death', 'writing suicide note', 'saying goodbye forever',
      'tonight is the night', 'ready to go', 'time has come', 'doing it now'
    ],
    high: [
      'want to die', 'suicide', 'suicidal thoughts', 'take my own life',
      'better off dead', 'end it all', 'not worth living', 'thinking about dying',
      'want to disappear forever', 'life has no meaning', 'tired of living',
      'wish I was dead', 'everyone would be better without me', 'planning to die',
      'considering suicide', 'contemplating death', 'researching methods'
    ],
    medium: [
      'sometimes think about death', 'wonder what dying feels like',
      'life is hard', 'feeling hopeless', 'don\'t want to be here',
      'questioning my existence', 'feeling worthless', 'death thoughts',
      'passive suicidal ideation', 'wish I could just disappear'
    ]
  },
  selfHarm: {
    critical: [
      'cutting right now', 'about to cut', 'have the blade ready',
      'burning myself tonight', 'going to hurt myself', 'need to cut deep',
      'punching myself hard', 'hitting my head against wall', 'deserve to bleed',
      'cutting feels good', 'pain makes me feel alive', 'carved into my skin',
      'bleeding everywhere', 'can\'t stop cutting', 'doing it again'
    ],
    high: [
      'cut myself', 'hurt myself', 'self harm', 'self-harm', 'cutting',
      'burning myself', 'hitting myself', 'punching walls', 'deserve pain',
      'need to feel pain', 'self-injury', 'scratching until I bleed',
      'biting myself', 'pulling my hair out', 'razor blade', 'fresh cuts'
    ],
    medium: [
      'urge to hurt myself', 'thinking about cutting', 'want to feel pain',
      'scratching my arms', 'picking at my skin', 'tempted to self-harm',
      'self-destructive', 'hurting myself emotionally'
    ]
  },
  violence: {
    critical: [
      'going to kill', 'murder someone', 'shoot everyone', 'bomb the place',
      'make them pay', 'revenge time', 'they all deserve to die',
      'planning an attack', 'have the weapons', 'tonight is the night',
      'going to hurt them', 'make them suffer', 'eliminate them all',
      'loading the gun', 'making a bomb', 'target acquired'
    ],
    high: [
      'want to hurt someone', 'kill them', 'make them pay', 'get revenge',
      'violent thoughts', 'angry enough to kill', 'they deserve pain',
      'fantasizing about violence', 'want to fight', 'lose control',
      'homicidal thoughts', 'planning violence', 'want to attack'
    ],
    medium: [
      'really angry', 'want to punch something', 'mad at everyone',
      'feeling aggressive', 'violent urges', 'anger issues',
      'rage building up', 'losing my temper'
    ]
  },
  immediacy: {
    critical: [
      'right now', 'in the next hour', 'tonight before bed', 'today is the day',
      'can\'t wait anymore', 'doing it now', 'this is it', 'final moment',
      'ready to go', 'time has come', 'no more waiting', 'it\'s happening',
      'in 10 minutes', 'as soon as', 'immediately', 'before sunrise'
    ],
    high: [
      'today', 'tonight', 'this morning', 'later today', 'before midnight',
      'this week', 'very soon', 'in a few hours', 'after work',
      'when everyone sleeps', 'before dawn', 'this evening'
    ],
    medium: [
      'soon', 'sometime', 'eventually', 'when I\'m ready', 'maybe tomorrow',
      'next week', 'in the future', 'one day'
    ]
  },
  hopelessness: {
    critical: [
      'no hope left', 'completely hopeless', 'no point in living', 'beyond saving',
      'no future possible', 'lost all hope', 'nothing will ever change',
      'permanently broken', 'no way out ever', 'doomed forever',
      'past the point of no return', 'irreversibly damaged'
    ],
    high: [
      'no hope', 'hopeless', 'pointless', 'nothing matters', 'give up',
      'can\'t go on', 'no future', 'no point', 'meaningless', 'empty',
      'lost cause', 'beyond help', 'no way out', 'trapped forever'
    ],
    medium: [
      'feeling down', 'sad', 'discouraged', 'losing hope', 'struggling',
      'difficult times', 'hard to cope', 'feeling stuck'
    ]
  },
  substance: {
    critical: [
      'overdose on purpose', 'taking all the pills', 'mixing drugs to die',
      'drinking to death', 'lethal dose', 'poisoning myself',
      'drug overdose plan', 'alcohol poisoning intentional',
      'swallowing everything', 'final high', 'deadly combination'
    ],
    high: [
      'overdose', 'too many pills', 'drinking heavily', 'using to numb pain',
      'self-medicating', 'substance abuse', 'addicted and desperate',
      'can\'t stop using', 'need more drugs', 'dangerous amounts'
    ],
    medium: [
      'drinking more', 'using substances', 'numbing the pain',
      'relying on alcohol', 'medication misuse', 'substance problems'
    ]
  },
  isolation: {
    critical: [
      'completely alone', 'no one cares', 'abandoned by everyone',
      'pushing everyone away', 'isolated forever', 'no friends left',
      'family gave up on me', 'totally disconnected', 'nobody would notice',
      'disappearing without trace', 'cutting all ties'
    ],
    high: [
      'feeling alone', 'isolated', 'no support', 'no one understands',
      'lonely', 'disconnected', 'withdrawn', 'social isolation',
      'avoiding everyone', 'shutting people out'
    ],
    medium: [
      'feeling lonely sometimes', 'need connection', 'missing friends',
      'socially anxious', 'having trouble connecting'
    ]
  },
  methods: {
    critical: [
      'have the gun', 'loaded weapon', 'sharp knife', 'rope ready',
      'pills counted', 'bridge location', 'tall building', 'train tracks',
      'poison prepared', 'gas turned on', 'car in garage', 'method chosen',
      'means available', 'tools ready', 'location scouted'
    ],
    high: [
      'researching methods', 'looking up ways', 'planning how',
      'considering options', 'exploring methods', 'studying techniques',
      'gathering materials', 'preparing tools'
    ],
    medium: [
      'wondering how', 'curious about methods', 'thinking about ways'
    ]
  }
};

/**
 * Severity weights for different categories
 */
const SEVERITY_WEIGHTS = {
  suicide: { critical: 1.0, high: 0.8, medium: 0.5 },
  selfHarm: { critical: 0.9, high: 0.7, medium: 0.4 },
  violence: { critical: 1.0, high: 0.8, medium: 0.5 },
  immediacy: { critical: 1.2, high: 0.9, medium: 0.3 },
  hopelessness: { critical: 0.8, high: 0.6, medium: 0.3 },
  substance: { critical: 0.9, high: 0.7, medium: 0.4 },
  isolation: { critical: 0.6, high: 0.4, medium: 0.2 },
  methods: { critical: 1.1, high: 0.8, medium: 0.3 }
};

/**
 * Context modifiers that increase or decrease crisis score
 */
const CONTEXT_MODIFIERS = {
  negation: ['not', 'never', 'don\'t', 'won\'t', 'can\'t', 'wouldn\'t'],
  intensifiers: ['really', 'very', 'extremely', 'totally', 'completely', 'absolutely'],
  timeframes: ['now', 'today', 'tonight', 'soon', 'later', 'eventually'],
  certainty: ['will', 'going to', 'planning', 'ready', 'decided', 'determined']
};

/**
 * Advanced crisis analysis function
 */
const analyzeAdvancedCrisis = (messageText, userHistory = {}) => {
  const text = messageText.toLowerCase();
  const words = text.split(/\s+/);
  
  let totalScore = 0;
  let matchedKeywords = [];
  let categoryScores = {};
  let contextFactors = {};
  
  // Initialize category scores
  Object.keys(CRISIS_KEYWORDS).forEach(category => {
    categoryScores[category] = { score: 0, matches: [] };
  });
  
  // Analyze each category
  Object.keys(CRISIS_KEYWORDS).forEach(category => {
    Object.keys(CRISIS_KEYWORDS[category]).forEach(severity => {
      CRISIS_KEYWORDS[category][severity].forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          const weight = SEVERITY_WEIGHTS[category][severity];
          const keywordScore = weight * 10; // Base score of 10 per keyword
          
          // Check for context modifiers
          const keywordIndex = text.indexOf(keyword.toLowerCase());
          const surroundingText = text.substring(
            Math.max(0, keywordIndex - 50),
            Math.min(text.length, keywordIndex + keyword.length + 50)
          );
          
          let contextMultiplier = 1;
          
          // Check for negation (reduces score)
          if (CONTEXT_MODIFIERS.negation.some(neg => 
            surroundingText.includes(neg + ' ' + keyword.toLowerCase()) ||
            surroundingText.includes(neg + ' ' + keyword.toLowerCase().split(' ')[0])
          )) {
            contextMultiplier *= 0.3;
            contextFactors.negation = true;
          }
          
          // Check for intensifiers (increases score)
          if (CONTEXT_MODIFIERS.intensifiers.some(int => 
            surroundingText.includes(int + ' ' + keyword.toLowerCase()) ||
            surroundingText.includes(int)
          )) {
            contextMultiplier *= 1.5;
            contextFactors.intensified = true;
          }
          
          // Check for certainty indicators (increases score)
          if (CONTEXT_MODIFIERS.certainty.some(cert => 
            surroundingText.includes(cert)
          )) {
            contextMultiplier *= 1.3;
            contextFactors.certainty = true;
          }
          
          const finalScore = keywordScore * contextMultiplier;
          
          categoryScores[category].score += finalScore;
          categoryScores[category].matches.push({
            keyword,
            severity,
            score: finalScore,
            context: surroundingText
          });
          
          matchedKeywords.push({
            keyword,
            category,
            severity,
            score: finalScore,
            contextMultiplier
          });
          
          totalScore += finalScore;
        }
      });
    });
  });
  
  // Calculate combined risk factors
  const riskFactors = calculateRiskFactors(categoryScores, userHistory);
  
  // Determine overall risk level
  const riskLevel = determineRiskLevel(totalScore, categoryScores, riskFactors);
  
  // Generate crisis response recommendations
  const recommendations = generateCrisisRecommendations(riskLevel, categoryScores);
  
  return {
    totalScore: Math.round(totalScore * 100) / 100,
    riskLevel,
    categoryScores,
    matchedKeywords,
    riskFactors,
    contextFactors,
    recommendations,
    requiresImmediate: riskLevel === 'critical' || riskLevel === 'high',
    confidence: Math.min(totalScore / 50, 1) // Normalize confidence to 0-1
  };
};

/**
 * Calculate additional risk factors
 */
const calculateRiskFactors = (categoryScores, userHistory) => {
  const factors = {};
  
  // Multiple category involvement
  const activeCategories = Object.values(categoryScores).filter(cat => cat.score > 0).length;
  factors.multipleConcerns = activeCategories >= 3;
  
  // Specific high-risk combinations
  factors.suicideWithMethod = categoryScores.suicide.score > 0 && categoryScores.methods.score > 0;
  factors.suicideWithImmediacy = categoryScores.suicide.score > 0 && categoryScores.immediacy.score > 0;
  factors.violenceWithImmediacy = categoryScores.violence.score > 0 && categoryScores.immediacy.score > 0;
  factors.substanceWithSuicide = categoryScores.substance.score > 0 && categoryScores.suicide.score > 0;
  
  // Historical factors
  factors.previousCrisis = userHistory.previousCrisisEvents > 0;
  factors.recentAssessment = userHistory.lastAssessmentScore > 15; // High PHQ-9/GAD-7
  factors.escalatingPattern = userHistory.crisisFrequency === 'increasing';
  
  return factors;
};

/**
 * Determine overall risk level
 */
const determineRiskLevel = (totalScore, categoryScores, riskFactors) => {
  // Critical level indicators
  if (totalScore >= 30 || 
      categoryScores.suicide.score >= 15 ||
      categoryScores.violence.score >= 15 ||
      (categoryScores.suicide.score >= 10 && categoryScores.immediacy.score >= 10) ||
      riskFactors.suicideWithMethod) {
    return 'critical';
  }
  
  // High level indicators
  if (totalScore >= 20 ||
      categoryScores.suicide.score >= 10 ||
      categoryScores.violence.score >= 10 ||
      categoryScores.selfHarm.score >= 12 ||
      riskFactors.suicideWithImmediacy ||
      riskFactors.violenceWithImmediacy) {
    return 'high';
  }
  
  // Medium level indicators
  if (totalScore >= 10 ||
      categoryScores.suicide.score >= 5 ||
      categoryScores.selfHarm.score >= 8 ||
      riskFactors.multipleConcerns ||
      riskFactors.substanceWithSuicide) {
    return 'medium';
  }
  
  // Low level
  if (totalScore >= 3) {
    return 'low';
  }
  
  return 'minimal';
};

/**
 * Generate crisis response recommendations
 */
const generateCrisisRecommendations = (riskLevel, categoryScores) => {
  const recommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: [],
    resources: []
  };
  
  switch (riskLevel) {
    case 'critical':
      recommendations.immediate = [
        'Contact emergency services immediately',
        'Notify crisis response team',
        'Initiate safety protocol',
        'Connect with on-call counselor',
        'Begin continuous monitoring'
      ];
      recommendations.resources = [
        { name: 'National Suicide Prevention Lifeline', contact: '988' },
        { name: 'Crisis Text Line', contact: '741741' },
        { name: 'Emergency Services', contact: '911' }
      ];
      break;
      
    case 'high':
      recommendations.immediate = [
        'Priority counselor assignment',
        'Safety planning session',
        'Family/support notification (if consented)',
        'Increase check-in frequency'
      ];
      recommendations.shortTerm = [
        'Schedule urgent therapy session',
        'Medication review if applicable',
        'Crisis coping skills training'
      ];
      break;
      
    case 'medium':
      recommendations.immediate = [
        'Assign available counselor',
        'Provide crisis resources',
        'Schedule follow-up within 24 hours'
      ];
      recommendations.shortTerm = [
        'Regular therapy sessions',
        'Support group referral',
        'Stress management techniques'
      ];
      break;
      
    case 'low':
      recommendations.shortTerm = [
        'Routine counselor check-in',
        'Self-care activity suggestions',
        'Monitoring for escalation'
      ];
      break;
  }
  
  // Category-specific recommendations
  if (categoryScores.substance.score > 0) {
    recommendations.longTerm.push('Substance abuse counseling referral');
  }
  
  if (categoryScores.isolation.score > 0) {
    recommendations.shortTerm.push('Social connection building activities');
  }
  
  if (categoryScores.violence.score > 0) {
    recommendations.immediate.push('Anger management resources');
    recommendations.shortTerm.push('Conflict resolution training');
  }
  
  return recommendations;
};

/**
 * Session priority escalation based on crisis level
 */
const calculateSessionPriority = (crisisAnalysis, userProfile) => {
  const baseScore = {
    critical: 100,
    high: 80,
    medium: 60,
    low: 40,
    minimal: 20
  }[crisisAnalysis.riskLevel];
  
  let priorityScore = baseScore;
  
  // Modifiers based on user profile
  if (userProfile.isMinor) priorityScore += 20;
  if (userProfile.hasHistory) priorityScore += 10;
  if (userProfile.previousAttempts) priorityScore += 25;
  if (userProfile.isIsolated) priorityScore += 15;
  
  // Risk factor modifiers
  if (crisisAnalysis.riskFactors.suicideWithMethod) priorityScore += 30;
  if (crisisAnalysis.riskFactors.suicideWithImmediacy) priorityScore += 25;
  if (crisisAnalysis.riskFactors.violenceWithImmediacy) priorityScore += 30;
  
  return {
    score: Math.min(priorityScore, 100),
    level: priorityScore >= 90 ? 'emergency' :
           priorityScore >= 70 ? 'urgent' :
           priorityScore >= 50 ? 'high' :
           priorityScore >= 30 ? 'normal' : 'low',
    estimatedWaitTime: priorityScore >= 90 ? '0 minutes' :
                      priorityScore >= 70 ? '0-5 minutes' :
                      priorityScore >= 50 ? '5-15 minutes' :
                      priorityScore >= 30 ? '15-30 minutes' : '30+ minutes'
  };
};

module.exports = {
  analyzeAdvancedCrisis,
  calculateRiskFactors,
  determineRiskLevel,
  generateCrisisRecommendations,
  calculateSessionPriority,
  CRISIS_KEYWORDS,
  SEVERITY_WEIGHTS
};