const { getPool, checkDatabaseConnection } = require('../config/database');

// In-memory fallback store for offline development / hermetic test execution
let memoryPatients = [];
let nextPatientId = 1;

/**
 * Generate a standard sequential patient code (e.g., PAT-2026-0001)
 */
function generatePatientCode(id) {
  const year = new Date().getFullYear();
  const paddedId = String(id).padStart(4, '0');
  return `PAT-${year}-${paddedId}`;
}

async function isDbConnected() {
  const health = await checkDatabaseConnection();
  return health.connected;
}

const patientRepository = {
  /**
   * Reset in-memory store (useful for tests)
   */
  _resetMemoryStore() {
    memoryPatients = [];
    nextPatientId = 1;
  },

  /**
   * List / search patients
   */
  async findAll({ search, limit = 50, offset = 0 } = {}) {
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      let query = `
        SELECT p.*,
          (SELECT COUNT(*) FROM patient_assessments pa WHERE pa.patient_id = p.id) as assessment_count,
          (SELECT json_build_object(
              'id', pa.id,
              'assessment_date', pa.assessment_date,
              'prakriti', pa.prakriti,
              'diet_goal', pa.diet_goal
            )
           FROM patient_assessments pa
           WHERE pa.patient_id = p.id
           ORDER BY pa.assessment_date DESC, pa.id DESC
           LIMIT 1
          ) as latest_assessment
        FROM patients p
      `;
      const params = [];

      if (search) {
        query += ` WHERE p.name ILIKE $1 OR p.patient_code ILIKE $1 OR p.phone ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pool.query(query, params);
      return res.rows;
    }

    // In-memory fallback
    let list = [...memoryPatients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patient_code.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q))
      );
    }
    return list.slice(offset, offset + limit);
  },

  /**
   * Find patient by ID
   */
  async findById(id) {
    const numericId = parseInt(id, 10);
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT p.*,
          (SELECT json_build_object(
              'id', pa.id,
              'assessment_date', pa.assessment_date,
              'prakriti', pa.prakriti,
              'diet_goal', pa.diet_goal
            )
           FROM patient_assessments pa
           WHERE pa.patient_id = p.id
           ORDER BY pa.assessment_date DESC, pa.id DESC
           LIMIT 1
          ) as latest_assessment
         FROM patients p WHERE p.id = $1`,
        [numericId]
      );
      return res.rows[0] || null;
    }

    return memoryPatients.find((p) => p.id === numericId) || null;
  },

  /**
   * Find patient by patient code
   */
  async findByCode(patientCode) {
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(`SELECT * FROM patients WHERE patient_code = $1`, [patientCode]);
      return res.rows[0] || null;
    }

    return memoryPatients.find((p) => p.patient_code.toUpperCase() === patientCode.toUpperCase()) || null;
  },

  /**
   * Create new patient
   */
  async create(data) {
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      let code = data.patient_code;
      if (!code) {
        const countRes = await pool.query('SELECT nextval(pg_get_serial_sequence(\'patients\', \'id\')) as next_id');
        const nextId = countRes.rows[0].next_id;
        code = generatePatientCode(nextId);
        const insertRes = await pool.query(
          `INSERT INTO patients (id, patient_code, name, age, sex, occupation, phone, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [nextId, code, data.name, data.age, data.sex, data.occupation || null, data.phone || null, data.email || null]
        );
        return insertRes.rows[0];
      }

      const res = await pool.query(
        `INSERT INTO patients (patient_code, name, age, sex, occupation, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [code, data.name, data.age, data.sex, data.occupation || null, data.phone || null, data.email || null]
      );
      return res.rows[0];
    }

    const id = nextPatientId++;
    const code = data.patient_code || generatePatientCode(id);
    const now = new Date().toISOString();

    const newPatient = {
      id,
      patient_code: code,
      name: data.name,
      age: parseInt(data.age, 10),
      sex: data.sex,
      occupation: data.occupation || '',
      phone: data.phone || '',
      email: data.email || '',
      created_at: now,
      updated_at: now,
      assessment_count: 0,
      latest_assessment: null,
    };

    memoryPatients.unshift(newPatient);
    return newPatient;
  },

  /**
   * Update existing patient
   */
  async update(id, data) {
    const numericId = parseInt(id, 10);
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(
        `UPDATE patients
         SET name = COALESCE($1, name),
             age = COALESCE($2, age),
             sex = COALESCE($3, sex),
             occupation = COALESCE($4, occupation),
             phone = COALESCE($5, phone),
             email = COALESCE($6, email),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [data.name, data.age, data.sex, data.occupation, data.phone, data.email, numericId]
      );
      return res.rows[0] || null;
    }

    const patient = memoryPatients.find((p) => p.id === numericId);
    if (!patient) return null;

    if (data.name !== undefined) patient.name = data.name;
    if (data.age !== undefined) patient.age = parseInt(data.age, 10);
    if (data.sex !== undefined) patient.sex = data.sex;
    if (data.occupation !== undefined) patient.occupation = data.occupation;
    if (data.phone !== undefined) patient.phone = data.phone;
    if (data.email !== undefined) patient.email = data.email;
    patient.updated_at = new Date().toISOString();

    return patient;
  },

  /**
   * Delete patient (for test cleanups)
   */
  async delete(id) {
    const numericId = parseInt(id, 10);
    const connected = await isDbConnected();

    if (connected) {
      const pool = getPool();
      const res = await pool.query(`DELETE FROM patients WHERE id = $1 RETURNING id`, [numericId]);
      return res.rowCount > 0;
    }

    const index = memoryPatients.findIndex((p) => p.id === numericId);
    if (index !== -1) {
      memoryPatients.splice(index, 1);
      return true;
    }
    return false;
  },
};

module.exports = patientRepository;
