const patientRepository = require('../repositories/patientRepository');

/**
 * Controller for Dietitian Patient Management
 */

const getPatients = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const patients = await patientRepository.findAll({
      search,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      status: 'success',
      results: patients.length,
      data: { patients },
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await patientRepository.findById(id);

    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: `Patient with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
};

const createPatient = async (req, res, next) => {
  try {
    const { name, age, sex, occupation, phone, email, patient_code } = req.body;

    // Check if custom patient code already exists
    if (patient_code) {
      const existing = await patientRepository.findByCode(patient_code);
      if (existing) {
        return res.status(409).json({
          status: 'fail',
          message: `Patient code '${patient_code}' already exists`,
        });
      }
    }

    const patient = await patientRepository.create({
      name: name.trim(),
      age: parseInt(age, 10),
      sex: sex.toLowerCase(),
      occupation: occupation ? occupation.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      patient_code: patient_code ? patient_code.trim() : undefined,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Patient created successfully',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await patientRepository.findById(id);

    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: `Patient with ID ${id} not found`,
      });
    }

    const { name, age, sex, occupation, phone, email } = req.body;
    const updated = await patientRepository.update(id, {
      name: name ? name.trim() : undefined,
      age: age !== undefined ? parseInt(age, 10) : undefined,
      sex: sex ? sex.toLowerCase() : undefined,
      occupation: occupation !== undefined ? occupation.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
      email: email !== undefined ? email.trim() : undefined,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Patient updated successfully',
      data: { patient: updated },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
};
