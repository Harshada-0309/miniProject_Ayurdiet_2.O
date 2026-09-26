/**
 * Input Validation Middleware for Phase 2: Dietitian Patient Assessment
 */

const VALID_SEX = ['male', 'female', 'other'];

const VALID_DIET_GOALS = [
  'weight_loss',
  'weight_maintenance',
  'weight_gain',
  'general_healthy_diet',
  'condition_specific_nutrition',
];

const VALID_DIET_CATEGORIES = [
  'vegetarian',
  'vegan',
  'eggetarian',
  'non_vegetarian',
  'other',
];

const VALID_PRAKRITI = [
  'Vata',
  'Pitta',
  'Kapha',
  'Vata-Pitta',
  'Pitta-Kapha',
  'Vata-Kapha',
  'Tridosha',
  'Unknown / Not assessed',
];

const VALID_ACTIVITY_LEVELS = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extremely_active',
];

const VALID_SLEEP_QUALITY = ['poor', 'fair', 'good', 'excellent'];

const VALID_REPORTED_FLAGS = ['normal', 'abnormal', 'critical'];

function validatePatientInput(req, res, next) {
  const { name, age, sex } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters long' });
  }

  if (age === undefined || age === null || isNaN(parseInt(age, 10)) || parseInt(age, 10) < 0 || parseInt(age, 10) > 130) {
    errors.push({ field: 'age', message: 'Age is required and must be an integer between 0 and 130' });
  }

  if (!sex || !VALID_SEX.includes(String(sex).toLowerCase())) {
    errors.push({ field: 'sex', message: `Sex is required and must be one of: ${VALID_SEX.join(', ')}` });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

function validateAssessmentInput(req, res, next) {
  const { diet_goal, diet_category, prakriti, height, weight, activity_level, sleep_quality } = req.body;
  const errors = [];

  // Diet goal
  if (!diet_goal || !VALID_DIET_GOALS.includes(diet_goal)) {
    errors.push({
      field: 'diet_goal',
      message: `diet_goal is required and must be one of: ${VALID_DIET_GOALS.join(', ')}`,
    });
  }

  // Diet category
  if (!diet_category || !VALID_DIET_CATEGORIES.includes(diet_category)) {
    errors.push({
      field: 'diet_category',
      message: `diet_category is required and must be one of: ${VALID_DIET_CATEGORIES.join(', ')}`,
    });
  }

  // Prakriti
  if (!prakriti || !VALID_PRAKRITI.includes(prakriti)) {
    errors.push({
      field: 'prakriti',
      message: `prakriti is required and must be one of: ${VALID_PRAKRITI.join(', ')}`,
    });
  }

  // Numeric checks if provided
  if (height !== undefined && height !== null && height !== '') {
    const h = parseFloat(height);
    if (isNaN(h) || h <= 0 || h > 300) {
      errors.push({ field: 'height', message: 'Height must be a positive number in cm (e.g. 50-300)' });
    }
  }

  if (weight !== undefined && weight !== null && weight !== '') {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 500) {
      errors.push({ field: 'weight', message: 'Weight must be a positive number in kg (e.g. 10-500)' });
    }
  }

  if (activity_level && !VALID_ACTIVITY_LEVELS.includes(activity_level)) {
    errors.push({
      field: 'activity_level',
      message: `activity_level must be one of: ${VALID_ACTIVITY_LEVELS.join(', ')}`,
    });
  }

  if (sleep_quality && !VALID_SLEEP_QUALITY.includes(sleep_quality)) {
    errors.push({
      field: 'sleep_quality',
      message: `sleep_quality must be one of: ${VALID_SLEEP_QUALITY.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Assessment validation failed',
      errors,
    });
  }

  next();
}

function validateLabDataInput(req, res, next) {
  const { test_name, value, reported_flag } = req.body;
  const errors = [];

  if (!test_name || typeof test_name !== 'string' || test_name.trim().length === 0) {
    errors.push({ field: 'test_name', message: 'test_name is required' });
  }

  if (value === undefined || value === null || String(value).trim().length === 0) {
    errors.push({ field: 'value', message: 'value is required' });
  }

  if (reported_flag && !VALID_REPORTED_FLAGS.includes(reported_flag)) {
    errors.push({
      field: 'reported_flag',
      message: `reported_flag must be one of: ${VALID_REPORTED_FLAGS.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Lab data validation failed',
      errors,
    });
  }

  next();
}

module.exports = {
  validatePatientInput,
  validateAssessmentInput,
  validateLabDataInput,
  VALID_SEX,
  VALID_DIET_GOALS,
  VALID_DIET_CATEGORIES,
  VALID_PRAKRITI,
  VALID_ACTIVITY_LEVELS,
  VALID_SLEEP_QUALITY,
  VALID_REPORTED_FLAGS,
};
