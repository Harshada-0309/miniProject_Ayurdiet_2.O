const express = require('express');
const router = express.Router();
const dietPlanController = require('../controllers/dietPlanController');

// Generate 7-day plan
router.post('/generate', dietPlanController.generateDietPlan);

// Deterministically revalidate edited plan
router.post('/validate', dietPlanController.validateDietPlan);

// Save diet plan
router.post('/', dietPlanController.saveDietPlan);

// Get diet plans for a patient
router.get('/patient/:patientId', dietPlanController.getDietPlansByPatient);

// Get diet plan by ID
router.get('/:id', dietPlanController.getDietPlanById);

// Update diet plan (e.g. food/portion adjustments)
router.put('/:id', dietPlanController.updateDietPlan);

// Approve diet plan
router.post('/:id/approve', dietPlanController.approveDietPlan);

module.exports = router;
