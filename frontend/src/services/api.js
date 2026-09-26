/**
 * Frontend API Service for Phase 2: Dietitian Patient Assessment
 */

const API_BASE = '/api';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.errors
      ? data.errors.map((e) => `${e.field}: ${e.message}`).join(', ')
      : data.message || 'API request failed';
    const error = new Error(errorMsg);
    error.status = res.status;
    error.details = data;
    throw error;
  }
  return data;
}

export const api = {
  // Patients
  async getPatients(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/patients${query}`);
    return handleResponse(res);
  },

  async getPatientById(id) {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    return handleResponse(res);
  },

  async createPatient(payload) {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updatePatient(id, payload) {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Assessments
  async getPatientAssessments(patientId) {
    const res = await fetch(`${API_BASE}/patients/${patientId}/assessments`);
    return handleResponse(res);
  },

  async getAssessmentById(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}`);
    return handleResponse(res);
  },

  async createAssessment(patientId, payload) {
    const res = await fetch(`${API_BASE}/patients/${patientId}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateAssessment(id, payload) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Clinical & Laboratory Data
  async getLabData(assessmentId) {
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}/lab-data`);
    return handleResponse(res);
  },

  async addLabData(assessmentId, payload) {
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}/lab-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateLabData(id, payload) {
    const res = await fetch(`${API_BASE}/lab-data/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteLabData(id) {
    const res = await fetch(`${API_BASE}/lab-data/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Phase 3: Deterministic Nutrition Calculation Engine
  async calculateNutrition(payload) {
    const res = await fetch(`${API_BASE}/nutrition/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async calculateNutritionForAssessment(assessmentId) {
    const res = await fetch(`${API_BASE}/nutrition/assessments/${assessmentId}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // Phase 4: Hybrid RAG Knowledge Retrieval Layer
  async retrieveRagEvidence(payload) {
    const res = await fetch(`${API_BASE}/rag/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getRagStatus() {
    const res = await fetch(`${API_BASE}/rag/status`);
    return handleResponse(res);
  },

  // Phase 5: Food & Meal Planning Engine
  async generateMealPlan(payload) {
    const res = await fetch(`${API_BASE}/meal-plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getSubstitutions(payload) {
    const res = await fetch(`${API_BASE}/meal-plan/substitutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getFoods(category = '', search = '') {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/meal-plan/foods${qs}`);
    return handleResponse(res);
  },

  async getFoodDetail(foodId) {
    const res = await fetch(`${API_BASE}/meal-plan/foods/${encodeURIComponent(foodId)}`);
    return handleResponse(res);
  },

  async saveMealPlan(payload) {
    const res = await fetch(`${API_BASE}/meal-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getMealPlanById(id) {
    const res = await fetch(`${API_BASE}/meal-plan/${id}`);
    return handleResponse(res);
  },

  async getPatientMealPlans(patientId) {
    const res = await fetch(`${API_BASE}/meal-plan/patient/${patientId}`);
    return handleResponse(res);
  },

  // Phase 6: Gemini-Powered 7-Day Diet Plan APIs
  async generate7DayDietPlan(payload) {
    const res = await fetch(`${API_BASE}/diet-plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async validateDietPlan(payload) {
    const res = await fetch(`${API_BASE}/diet-plan/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async saveDietPlan(payload) {
    const res = await fetch(`${API_BASE}/diet-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getDietPlanById(id) {
    const res = await fetch(`${API_BASE}/diet-plan/${id}`);
    return handleResponse(res);
  },

  async getPatientDietPlans(patientId) {
    const res = await fetch(`${API_BASE}/diet-plan/patient/${patientId}`);
    return handleResponse(res);
  },

  async updateDietPlan(id, payload) {
    const res = await fetch(`${API_BASE}/diet-plan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async approveDietPlan(id, payload = { approved_by: 'dietitian-primary' }) {
    const res = await fetch(`${API_BASE}/diet-plan/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};


