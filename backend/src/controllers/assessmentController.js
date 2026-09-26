const assessmentRepository = require('../repositories/assessmentRepository');
const patientRepository = require('../repositories/patientRepository');

/**
 * Controller for Dietitian Patient Assessment Workflow
 */

const getPatientAssessments = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await patientRepository.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: `Patient with ID ${patientId} not found`,
      });
    }

    const assessments = await assessmentRepository.findByPatientId(patientId);

    return res.status(200).json({
      status: 'success',
      results: assessments.length,
      data: { assessments },
    });
  } catch (error) {
    next(error);
  }
};

const getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await assessmentRepository.findById(id);

    if (!assessment) {
      return res.status(404).json({
        status: 'fail',
        message: `Assessment with ID ${id} not found`,
      });
    }

    // Attach patient summary
    const patient = await patientRepository.findById(assessment.patient_id);

    return res.status(200).json({
      status: 'success',
      data: {
        assessment: {
          ...assessment,
          patient,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const createAssessment = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await patientRepository.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: `Patient with ID ${patientId} not found`,
      });
    }

    const assessment = await assessmentRepository.create(patientId, req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Patient assessment created successfully',
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
};

const updateAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await assessmentRepository.findById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: `Assessment with ID ${id} not found`,
      });
    }

    const updated = await assessmentRepository.update(id, req.body);

    return res.status(200).json({
      status: 'success',
      message: 'Assessment updated successfully',
      data: { assessment: updated },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatientAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
};
