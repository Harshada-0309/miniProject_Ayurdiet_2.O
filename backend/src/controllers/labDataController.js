const labDataRepository = require('../repositories/labDataRepository');
const assessmentRepository = require('../repositories/assessmentRepository');

/**
 * Controller for Section 9: Clinical & Laboratory Data (Optional)
 */

const getLabDataByAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await assessmentRepository.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        status: 'fail',
        message: `Assessment with ID ${assessmentId} not found`,
      });
    }

    const labData = await labDataRepository.findByAssessmentId(assessmentId);

    return res.status(200).json({
      status: 'success',
      results: labData.length,
      data: { labData },
    });
  } catch (error) {
    next(error);
  }
};

const createLabData = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await assessmentRepository.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        status: 'fail',
        message: `Assessment with ID ${assessmentId} not found`,
      });
    }

    const labRecord = await labDataRepository.create(
      assessmentId,
      assessment.patient_id,
      req.body
    );

    return res.status(201).json({
      status: 'success',
      message: 'Clinical/laboratory data record added successfully',
      data: { labData: labRecord },
    });
  } catch (error) {
    next(error);
  }
};

const updateLabData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await labDataRepository.findById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: `Clinical/laboratory record with ID ${id} not found`,
      });
    }

    const updated = await labDataRepository.update(id, req.body);

    return res.status(200).json({
      status: 'success',
      message: 'Clinical/laboratory record updated successfully',
      data: { labData: updated },
    });
  } catch (error) {
    next(error);
  }
};

const deleteLabData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await labDataRepository.findById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: `Clinical/laboratory record with ID ${id} not found`,
      });
    }

    await labDataRepository.delete(id);

    return res.status(200).json({
      status: 'success',
      message: 'Clinical/laboratory record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabDataByAssessment,
  createLabData,
  updateLabData,
  deleteLabData,
};
