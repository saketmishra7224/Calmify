const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Session Matching Algorithm
 * Intelligently matches patients to available helpers based on various criteria
 */

/**
 * Helper scoring factors
 */
const SCORING_FACTORS = {
  // Experience and qualifications
  ROLE_PRIORITY: {
    'counselor': 100,
    'peer': 50,
    'admin': 120
  },
  
  // Availability and workload
  AVAILABILITY_WEIGHT: 30,
  WORKLOAD_PENALTY: 20,
  
  // Specialization matching
  SPECIALIZATION_BONUS: 40,
  
  // Response time and rating
  RESPONSE_TIME_WEIGHT: 25,
  RATING_WEIGHT: 35,
  
  // Session history
  PREVIOUS_HELPER_BONUS: 60,
  
  // Current status
  ONLINE_BONUS: 50,
  RECENTLY_ACTIVE_BONUS: 20,
  
  // Crisis handling capability
  CRISIS_EXPERIENCE_WEIGHT: 80
};

/**
 * Specialization categories for helper matching
 */
const SPECIALIZATIONS = {
  'depression': ['depression', 'mood-disorders', 'general'],
  'anxiety': ['anxiety', 'panic-disorders', 'general'],
  'trauma': ['trauma', 'ptsd', 'abuse', 'general'],
  'addiction': ['addiction', 'substance-abuse', 'general'],
  'relationships': ['relationships', 'family', 'general'],
  'grief': ['grief', 'loss', 'general'],
  'eating-disorders': ['eating-disorders', 'body-image', 'general'],
  'bipolar': ['bipolar', 'mood-disorders', 'general'],
  'self-harm': ['self-harm', 'crisis', 'general'],
  'suicidal': ['crisis', 'suicide-prevention', 'general'],
  'general': ['general']
};

/**
 * Finds the best available helper for a patient
 * @param {object} patient - Patient user object
 * @param {object} sessionRequirements - Session requirements and preferences
 * @returns {object} Best matched helper and matching details
 */
async function findBestHelper(patient, sessionRequirements = {}) {
  try {
    const {
      helperType = 'peer', // 'peer', 'counselor', 'any'
      severity = 'moderate', // 'mild', 'moderate', 'severe', 'critical'
      specialization = 'general',
      previousHelperId = null,
      urgency = 'normal', // 'low', 'normal', 'high', 'critical'
      maxWaitTime = 30 // minutes
    } = sessionRequirements;

    // Define helper criteria based on requirements
    const helperCriteria = buildHelperCriteria(helperType, severity, urgency);
    
    // Get available helpers
    const availableHelpers = await getAvailableHelpers(helperCriteria);
    
    if (availableHelpers.length === 0) {
      return {
        helper: null,
        reason: 'no-helpers-available',
        waitingQueuePosition: await getQueuePosition(severity, helperType),
        estimatedWaitTime: await estimateWaitTime(severity, helperType)
      };
    }

    // Score each helper
    const scoredHelpers = await Promise.all(
      availableHelpers.map(helper => scoreHelper(helper, patient, sessionRequirements))
    );

    // Sort by score (highest first)
    scoredHelpers.sort((a, b) => b.score - a.score);

    // Get the best match
    const bestMatch = scoredHelpers[0];

    // Validate match quality
    if (bestMatch.score < getMinimumScore(severity, urgency)) {
      return {
        helper: null,
        reason: 'insufficient-match-quality',
        bestAvailable: bestMatch,
        waitingQueuePosition: await getQueuePosition(severity, helperType),
        estimatedWaitTime: await estimateWaitTime(severity, helperType)
      };
    }

    return {
      helper: bestMatch.helper,
      matchScore: bestMatch.score,
      matchReasons: bestMatch.reasons,
      alternativeHelpers: scoredHelpers.slice(1, 4), // Top 3 alternatives
      matchingDetails: bestMatch.details
    };

  } catch (error) {
    console.error('Error finding best helper:', error);
    throw new Error('Helper matching failed');
  }
}

/**
 * Builds helper search criteria based on requirements
 */
function buildHelperCriteria(helperType, severity, urgency) {
  const criteria = {
    isActive: true,
    role: { $in: [] }
  };

  // Role-based criteria
  if (helperType === 'counselor' || severity === 'critical' || urgency === 'critical') {
    criteria.role.$in.push('counselor', 'admin');
  } else if (helperType === 'peer') {
    criteria.role.$in.push('peer');
  } else {
    criteria.role.$in.push('peer', 'counselor', 'admin');
  }

  // For critical cases, prefer online helpers
  if (severity === 'critical' || urgency === 'critical') {
    criteria.isOnline = true;
  }

  return criteria;
}

/**
 * Gets available helpers based on criteria
 */
async function getAvailableHelpers(criteria) {
  try {
    const helpers = await User.find(criteria)
      .select('username email role profile preferences lastActive isOnline createdAt')
      .lean();

    // Filter out helpers who are at capacity
    const helpersWithCapacity = [];
    
    for (const helper of helpers) {
      const currentSessions = await Session.countDocuments({
        helperId: helper._id,
        status: { $in: ['active', 'waiting'] }
      });

      const maxSessions = getMaxSessionsForHelper(helper);
      
      if (currentSessions < maxSessions) {
        helpersWithCapacity.push({
          ...helper,
          currentSessions,
          maxSessions,
          availableSlots: maxSessions - currentSessions
        });
      }
    }

    return helpersWithCapacity;
  } catch (error) {
    console.error('Error getting available helpers:', error);
    return [];
  }
}

/**
 * Determines maximum concurrent sessions for a helper
 */
function getMaxSessionsForHelper(helper) {
  const baseLimits = {
    'peer': 3,
    'counselor': 5,
    'admin': 8
  };

  let maxSessions = baseLimits[helper.role] || 3;

  // Adjust based on experience
  const accountAge = Date.now() - new Date(helper.createdAt).getTime();
  const monthsActive = accountAge / (1000 * 60 * 60 * 24 * 30);

  if (monthsActive > 12) {
    maxSessions += 2; // Experienced helpers can handle more
  } else if (monthsActive < 3) {
    maxSessions -= 1; // New helpers start with fewer sessions
  }

  // Consider helper preferences
  if (helper.preferences?.maxConcurrentSessions) {
    maxSessions = Math.min(maxSessions, helper.preferences.maxConcurrentSessions);
  }

  return Math.max(1, maxSessions);
}

/**
 * Scores a helper for patient matching
 */
async function scoreHelper(helper, patient, requirements) {
  let score = 0;
  const reasons = [];
  const details = {};

  // Base role priority
  const roleScore = SCORING_FACTORS.ROLE_PRIORITY[helper.role] || 0;
  score += roleScore;
  reasons.push(`Role (${helper.role}): +${roleScore}`);

  // Availability and workload
  const workloadPenalty = helper.currentSessions * SCORING_FACTORS.WORKLOAD_PENALTY;
  score -= workloadPenalty;
  if (workloadPenalty > 0) {
    reasons.push(`Current workload (${helper.currentSessions} sessions): -${workloadPenalty}`);
  }

  const availabilityBonus = helper.availableSlots * SCORING_FACTORS.AVAILABILITY_WEIGHT;
  score += availabilityBonus;
  reasons.push(`Available slots (${helper.availableSlots}): +${availabilityBonus}`);

  // Online status
  if (helper.isOnline) {
    score += SCORING_FACTORS.ONLINE_BONUS;
    reasons.push(`Currently online: +${SCORING_FACTORS.ONLINE_BONUS}`);
  } else {
    // Check recent activity
    const lastActiveMinutes = (Date.now() - new Date(helper.lastActive).getTime()) / (1000 * 60);
    if (lastActiveMinutes < 60) {
      score += SCORING_FACTORS.RECENTLY_ACTIVE_BONUS;
      reasons.push(`Recently active: +${SCORING_FACTORS.RECENTLY_ACTIVE_BONUS}`);
    }
  }

  // Specialization matching
  const specializationScore = await calculateSpecializationScore(helper, requirements.specialization);
  score += specializationScore;
  if (specializationScore > 0) {
    reasons.push(`Specialization match: +${specializationScore}`);
  }

  // Previous helper bonus
  if (requirements.previousHelperId && helper._id.toString() === requirements.previousHelperId) {
    score += SCORING_FACTORS.PREVIOUS_HELPER_BONUS;
    reasons.push(`Previous helper: +${SCORING_FACTORS.PREVIOUS_HELPER_BONUS}`);
  }

  // Helper rating and experience
  const ratingScore = await calculateRatingScore(helper);
  score += ratingScore;
  if (ratingScore > 0) {
    reasons.push(`Helper rating: +${ratingScore}`);
  }

  // Response time
  const responseTimeScore = await calculateResponseTimeScore(helper);
  score += responseTimeScore;
  if (responseTimeScore > 0) {
    reasons.push(`Response time: +${responseTimeScore}`);
  }

  // Crisis handling experience
  const crisisScore = await calculateCrisisExperience(helper, requirements.severity);
  score += crisisScore;
  if (crisisScore > 0) {
    reasons.push(`Crisis experience: +${crisisScore}`);
  }

  // Timezone compatibility (if patient has timezone preference)
  if (patient.preferences?.timezone && helper.preferences?.timezone) {
    const timezoneScore = calculateTimezoneCompatibility(
      patient.preferences.timezone,
      helper.preferences.timezone
    );
    score += timezoneScore;
    if (timezoneScore > 0) {
      reasons.push(`Timezone compatibility: +${timezoneScore}`);
    }
  }

  details.totalScore = Math.round(score);
  details.breakdown = {
    role: roleScore,
    availability: availabilityBonus - workloadPenalty,
    specialization: specializationScore,
    rating: ratingScore,
    responseTime: responseTimeScore,
    crisis: crisisScore
  };

  return {
    helper,
    score: Math.round(score),
    reasons,
    details
  };
}

/**
 * Calculates specialization matching score
 */
async function calculateSpecializationScore(helper, requestedSpecialization) {
  if (!requestedSpecialization || requestedSpecialization === 'general') {
    return 0;
  }

  const helperSpecializations = helper.profile?.specializations || ['general'];
  const relevantSpecs = SPECIALIZATIONS[requestedSpecialization] || ['general'];

  let bestMatch = 0;
  for (const spec of helperSpecializations) {
    if (relevantSpecs.includes(spec)) {
      if (spec === requestedSpecialization) {
        bestMatch = Math.max(bestMatch, SCORING_FACTORS.SPECIALIZATION_BONUS);
      } else if (spec !== 'general') {
        bestMatch = Math.max(bestMatch, SCORING_FACTORS.SPECIALIZATION_BONUS * 0.7);
      } else {
        bestMatch = Math.max(bestMatch, SCORING_FACTORS.SPECIALIZATION_BONUS * 0.3);
      }
    }
  }

  return Math.round(bestMatch);
}

/**
 * Calculates helper rating score
 */
async function calculateRatingScore(helper) {
  try {
    const ratingStats = await Session.aggregate([
      {
        $match: {
          helperId: helper._id,
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    if (ratingStats.length === 0) {
      return 0; // No ratings yet
    }

    const { averageRating, totalRatings } = ratingStats[0];
    
    // Base score from rating (0-5 scale converted to points)
    let ratingScore = (averageRating / 5) * SCORING_FACTORS.RATING_WEIGHT;
    
    // Confidence bonus for more ratings
    const confidenceMultiplier = Math.min(1, totalRatings / 10);
    ratingScore *= confidenceMultiplier;

    return Math.round(ratingScore);
  } catch (error) {
    console.error('Error calculating rating score:', error);
    return 0;
  }
}

/**
 * Calculates response time score
 */
async function calculateResponseTimeScore(helper) {
  try {
    // Calculate average response time from last 10 sessions
    const recentSessions = await Session.find({
      helperId: helper._id,
      startedAt: { $exists: true },
      createdAt: { $exists: true }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('createdAt startedAt');

    if (recentSessions.length === 0) {
      return 0;
    }

    const avgResponseTime = recentSessions.reduce((sum, session) => {
      const responseTime = new Date(session.startedAt) - new Date(session.createdAt);
      return sum + responseTime;
    }, 0) / recentSessions.length;

    // Convert to minutes
    const avgMinutes = avgResponseTime / (1000 * 60);

    // Score inversely related to response time
    // Better response time = higher score
    let responseScore = 0;
    if (avgMinutes <= 5) {
      responseScore = SCORING_FACTORS.RESPONSE_TIME_WEIGHT;
    } else if (avgMinutes <= 15) {
      responseScore = SCORING_FACTORS.RESPONSE_TIME_WEIGHT * 0.8;
    } else if (avgMinutes <= 30) {
      responseScore = SCORING_FACTORS.RESPONSE_TIME_WEIGHT * 0.5;
    } else if (avgMinutes <= 60) {
      responseScore = SCORING_FACTORS.RESPONSE_TIME_WEIGHT * 0.2;
    }

    return Math.round(responseScore);
  } catch (error) {
    console.error('Error calculating response time score:', error);
    return 0;
  }
}

/**
 * Calculates crisis handling experience score
 */
async function calculateCrisisExperience(helper, sessionSeverity) {
  try {
    const crisisSessionsCount = await Session.countDocuments({
      helperId: helper._id,
      severity: { $in: ['severe', 'critical'] },
      status: 'closed'
    });

    let crisisScore = 0;
    
    if (sessionSeverity === 'critical' || sessionSeverity === 'severe') {
      // High priority for crisis experience in severe cases
      crisisScore = Math.min(crisisSessionsCount * 10, SCORING_FACTORS.CRISIS_EXPERIENCE_WEIGHT);
    } else {
      // Moderate bonus for general experience
      crisisScore = Math.min(crisisSessionsCount * 5, SCORING_FACTORS.CRISIS_EXPERIENCE_WEIGHT * 0.5);
    }

    return Math.round(crisisScore);
  } catch (error) {
    console.error('Error calculating crisis experience:', error);
    return 0;
  }
}

/**
 * Calculates timezone compatibility score
 */
function calculateTimezoneCompatibility(patientTz, helperTz) {
  // Simple implementation - can be enhanced with actual timezone logic
  if (patientTz === helperTz) {
    return 15; // Same timezone bonus
  }
  
  // Could add logic for compatible time zones
  return 0;
}

/**
 * Gets minimum acceptable score based on severity and urgency
 */
function getMinimumScore(severity, urgency) {
  const baseMinimums = {
    'critical': 150,
    'severe': 100,
    'moderate': 50,
    'mild': 25
  };

  let minimum = baseMinimums[severity] || 50;

  if (urgency === 'critical') {
    minimum += 50;
  } else if (urgency === 'high') {
    minimum += 25;
  }

  return minimum;
}

/**
 * Gets queue position for waiting patients
 */
async function getQueuePosition(severity, helperType) {
  try {
    const waitingSessions = await Session.countDocuments({
      status: 'waiting',
      helperType: helperType === 'any' ? { $exists: true } : helperType,
      severity: severity,
      createdAt: { $lt: new Date() }
    });

    return waitingSessions + 1;
  } catch (error) {
    console.error('Error getting queue position:', error);
    return 1;
  }
}

/**
 * Estimates wait time based on current queue and helper availability
 */
async function estimateWaitTime(severity, helperType) {
  try {
    const queueLength = await getQueuePosition(severity, helperType) - 1;
    const availableHelperCount = await User.countDocuments({
      role: helperType === 'any' ? { $in: ['peer', 'counselor', 'admin'] } : helperType,
      isActive: true,
      isOnline: true
    });

    if (availableHelperCount === 0) {
      return { estimated: '60+ minutes', confidence: 'low' };
    }

    // Rough estimation based on average session length and queue
    const avgSessionLength = 45; // minutes
    const estimatedMinutes = (queueLength / availableHelperCount) * avgSessionLength;

    if (estimatedMinutes <= 5) {
      return { estimated: '< 5 minutes', confidence: 'high' };
    } else if (estimatedMinutes <= 15) {
      return { estimated: '5-15 minutes', confidence: 'high' };
    } else if (estimatedMinutes <= 30) {
      return { estimated: '15-30 minutes', confidence: 'medium' };
    } else if (estimatedMinutes <= 60) {
      return { estimated: '30-60 minutes', confidence: 'medium' };
    } else {
      return { estimated: '60+ minutes', confidence: 'low' };
    }
  } catch (error) {
    console.error('Error estimating wait time:', error);
    return { estimated: 'unknown', confidence: 'low' };
  }
}

/**
 * Re-matches session if current helper becomes unavailable
 */
async function rematchSession(sessionId, reason = 'helper-unavailable') {
  try {
    const session = await Session.findById(sessionId)
      .populate('patientId', 'username profile preferences');

    if (!session || session.status !== 'waiting') {
      throw new Error('Session not eligible for rematching');
    }

    // Clear current helper
    session.helperId = null;
    session.metadata = session.metadata || {};
    session.metadata.rematchReason = reason;
    session.metadata.rematchAttempts = (session.metadata.rematchAttempts || 0) + 1;

    // Find new helper
    const matchResult = await findBestHelper(session.patientId, {
      helperType: session.helperType,
      severity: session.severity,
      specialization: session.metadata?.requestedSpecialization,
      urgency: session.severity === 'critical' ? 'critical' : 'normal'
    });

    if (matchResult.helper) {
      session.helperId = matchResult.helper._id;
      session.metadata.matchScore = matchResult.matchScore;
      session.metadata.matchReasons = matchResult.matchReasons;
    }

    await session.save();
    return matchResult;
  } catch (error) {
    console.error('Error rematching session:', error);
    throw error;
  }
}

module.exports = {
  findBestHelper,
  rematchSession,
  getQueuePosition,
  estimateWaitTime,
  SPECIALIZATIONS,
  SCORING_FACTORS
};