const aiService = require('../services/aiService');
const dietPlanRepository = require('../repositories/dietPlanRepository');

const dietPlanController = {
  /**
   * Generate Gemini-formatted, deterministically validated 7-day diet plan
   * POST /api/diet-plan/generate
   */
  async generateDietPlan(req, res, next) {
    try {
      const {
        patient_assessment,
        nutrition_targets,
        meal_structure,
        custom_meal_distribution,
        dietitian_notes,
        save = true,
      } = req.body;

      if (!patient_assessment) {
        return res.status(400).json({
          status: 'error',
          message: 'patient_assessment object is required for 7-day diet plan generation',
        });
      }

      const generatedPlan = await aiService.generate7DayDietPlan({
        patient_assessment,
        nutrition_targets,
        meal_structure,
        custom_meal_distribution,
        dietitian_notes,
      });

      // Persist by default if patient_id is present
      const patientId = generatedPlan.patient_id || patient_assessment.patient_id;
      if (save && patientId) {
        const savedRecord = await dietPlanRepository.create({
          plan_id: generatedPlan.plan_id,
          patient_id: patientId,
          assessment_id: generatedPlan.assessment_id || patient_assessment.assessment_id || null,
          title: generatedPlan.title || '7-Day Personalized Ayurvedic Diet Plan',
          status: generatedPlan.status || 'draft',
          patient_summary: generatedPlan.patient_summary,
          clinical_rationale: generatedPlan.clinical_rationale,
          ayurvedic_dietary_principles: generatedPlan.ayurvedic_dietary_principles,
          dosha_guidelines: generatedPlan.dosha_guidelines,
          days: generatedPlan.days,
          weekly_overview: generatedPlan.weekly_overview,
          general_instructions: generatedPlan.general_instructions,
          evidence_citations: generatedPlan.evidence_citations,
          validation_results: generatedPlan.validation_results,
          dietitian_notes: dietitian_notes || generatedPlan.dietitian_notes,
          is_approved: false,
        });

        return res.status(200).json({
          status: 'success',
          data: {
            ...generatedPlan,
            id: savedRecord.id,
          },
        });
      }

      return res.status(200).json({
        status: 'success',
        data: generatedPlan,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Save a diet plan record
   * POST /api/diet-plan
   */
  async saveDietPlan(req, res, next) {
    try {
      const planData = req.body;

      if (!planData.patient_id) {
        return res.status(400).json({
          status: 'error',
          message: 'patient_id is required to save a diet plan',
        });
      }

      const saved = await dietPlanRepository.create(planData);
      return res.status(201).json({
        status: 'success',
        data: saved,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get diet plan by numeric ID or string plan_id
   * GET /api/diet-plan/:id
   */
  async getDietPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await dietPlanRepository.findById(id);

      if (!plan) {
        return res.status(404).json({
          status: 'error',
          message: `Diet plan with ID '${id}' not found`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all diet plans for a patient
   * GET /api/diet-plan/patient/:patientId
   */
  async getDietPlansByPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const plans = await dietPlanRepository.findByPatientId(patientId);

      return res.status(200).json({
        status: 'success',
        count: plans.length,
        data: plans,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Deterministically revalidate an edited diet plan
   * POST /api/diet-plan/validate
   */
  async validateDietPlan(req, res, next) {
    try {
      const { diet_plan, patient_assessment, nutrition_targets } = req.body;

      if (!diet_plan || !patient_assessment) {
        return res.status(400).json({
          status: 'error',
          message: 'diet_plan and patient_assessment objects are required for validation',
        });
      }

      const validationResult = await aiService.validateDietPlan({
        diet_plan,
        patient_assessment,
        nutrition_targets,
      });

      return res.status(200).json({
        status: 'success',
        data: validationResult,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update diet plan contents (e.g. food edits, notes)
   * PUT /api/diet-plan/:id
   */
  async updateDietPlan(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const current = await dietPlanRepository.findById(id);
      if (!current) {
        return res.status(404).json({
          status: 'error',
          message: `Diet plan with ID '${id}' not found`,
        });
      }

      // Editing an approved plan resets approval state
      if (updateData.is_approved === undefined) {
        updateData.is_approved = false;
        if (current.status === 'approved' && !updateData.status) {
          updateData.status = 'needs_review';
        }
      }

      const updated = await dietPlanRepository.update(id, updateData);

      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Formally approve a diet plan
   * POST /api/diet-plan/:id/approve
   */
  async approveDietPlan(req, res, next) {
    try {
      const { id } = req.params;
      const { approved_by = 'dietitian-primary' } = req.body;

      const plan = await dietPlanRepository.findById(id);
      if (!plan) {
        return res.status(404).json({
          status: 'error',
          message: `Diet plan with ID '${id}' not found`,
        });
      }

      const approved = await dietPlanRepository.approve(id, { approved_by });

      return res.status(200).json({
        status: 'success',
        message: 'Diet plan approved successfully',
        data: approved,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dietPlanController;
