const request = require('supertest');
const app = require('../src/app');
const patientRepository = require('../src/repositories/patientRepository');

describe('Dietitian Patient Management APIs (Phase 2)', () => {
  beforeEach(() => {
    patientRepository._resetMemoryStore();
  });

  describe('POST /api/patients', () => {
    it('should create a patient with valid data and auto-generated patient code', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Aarav Sharma',
          age: 34,
          sex: 'male',
          occupation: 'Software Engineer',
          phone: '+91 98765 43210',
          email: 'aarav@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.patient).toBeDefined();
      expect(res.body.data.patient.id).toBeDefined();
      expect(res.body.data.patient.name).toBe('Aarav Sharma');
      expect(res.body.data.patient.patient_code).toMatch(/^PAT-\d{4}-\d{4}$/);
    });

    it('should fail with 400 when name is missing or too short', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'A',
          age: 30,
          sex: 'male',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should fail with 400 when age is invalid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Priya Patel',
          age: -5,
          sex: 'female',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'age')).toBe(true);
    });

    it('should fail with 400 when sex is invalid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Priya Patel',
          age: 28,
          sex: 'unknown-sex',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'sex')).toBe(true);
    });
  });

  describe('GET /api/patients', () => {
    it('should list patients and support search query', async () => {
      await request(app).post('/api/patients').send({ name: 'Sunita Rao', age: 45, sex: 'female' });
      await request(app).post('/api/patients').send({ name: 'Vikram Singh', age: 52, sex: 'male' });

      // List all
      const listRes = await request(app).get('/api/patients');
      expect(listRes.status).toBe(200);
      expect(listRes.body.results).toBe(2);

      // Search by name
      const searchRes = await request(app).get('/api/patients?search=Vikram');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.results).toBe(1);
      expect(searchRes.body.data.patients[0].name).toBe('Vikram Singh');
    });
  });

  describe('GET & PUT /api/patients/:id', () => {
    it('should get patient by id and update details', async () => {
      const createRes = await request(app)
        .post('/api/patients')
        .send({ name: 'Kavita Joshi', age: 39, sex: 'female', occupation: 'Teacher' });
      const patientId = createRes.body.data.patient.id;

      // Get
      const getRes = await request(app).get(`/api/patients/${patientId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.patient.name).toBe('Kavita Joshi');

      // Update
      const updateRes = await request(app)
        .put(`/api/patients/${patientId}`)
        .send({ occupation: 'Senior Professor', phone: '+91 99999 88888' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.patient.occupation).toBe('Senior Professor');
      expect(updateRes.body.data.patient.phone).toBe('+91 99999 88888');
    });

    it('should return 404 for non-existent patient id', async () => {
      const res = await request(app).get('/api/patients/99999');
      expect(res.status).toBe(404);
    });
  });
});
