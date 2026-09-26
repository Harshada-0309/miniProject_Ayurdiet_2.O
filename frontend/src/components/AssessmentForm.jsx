import React, { useState, useEffect } from 'react';
import NutritionTargetsView from './NutritionTargetsView';
import MealPlanView from './MealPlanView';
import DietPlanView from './DietPlanView';
import { api } from '../services/api';

const SECTIONS = [
  { id: 'sec-basic', label: '1. Basic Details', num: '1' },
  { id: 'sec-body', label: '2. Body Measurements', num: '2' },
  { id: 'sec-goal', label: '3. Diet Goal', num: '3' },
  { id: 'sec-lifestyle', label: '4. Lifestyle', num: '4' },
  { id: 'sec-diet', label: '5. Dietary Profile', num: '5' },
  { id: 'sec-safety', label: '6. Safety Restrictions', num: '6' },
  { id: 'sec-medical', label: '7. Medical Info', num: '7' },
  { id: 'sec-ayurveda', label: '8. Ayurvedic Info', num: '8' },
  { id: 'sec-lab', label: '9. Clinical / Lab (Optional)', num: '9' },
  { id: 'sec-nutrition', label: '10. Nutrition Targets (Engine)', num: '10' },
  { id: 'sec-mealplan', label: '11. Food & Meal Plan', num: '11' },
  { id: 'sec-dietplan', label: '12. 7-Day Diet Plan (Gemini)', num: '12' },
];

const PRAKRITI_OPTIONS = [
  { value: 'Vata', label: 'Vata', type: 'vata' },
  { value: 'Pitta', label: 'Pitta', type: 'pitta' },
  { value: 'Kapha', label: 'Kapha', type: 'kapha' },
  { value: 'Vata-Pitta', label: 'Vata-Pitta', type: 'dual' },
  { value: 'Pitta-Kapha', label: 'Pitta-Kapha', type: 'dual' },
  { value: 'Vata-Kapha', label: 'Vata-Kapha', type: 'dual' },
  { value: 'Tridosha', label: 'Tridosha (Sama)', type: 'tri' },
  { value: 'Unknown / Not assessed', label: 'Unknown / Not Assessed', type: 'neutral' },
];

const DIET_GOALS = [
  { id: 'weight_loss', title: 'Weight Loss', desc: 'Caloric moderation & metabolic stimulation' },
  { id: 'weight_maintenance', title: 'Weight Maintenance', desc: 'Sustained energy and doshic equilibrium' },
  { id: 'weight_gain', title: 'Weight Gain', desc: 'Brimhana nourishing therapies & tissue build' },
  { id: 'general_healthy_diet', title: 'General Healthy Diet', desc: 'Holistic wellness & seasonal alignment' },
  { id: 'condition_specific_nutrition', title: 'Condition-Specific Nutrition', desc: 'Targeted clinical dietary therapy' },
];

const DIET_CATEGORIES = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'non_vegetarian', label: 'Non-Vegetarian' },
  { id: 'other', label: 'Other' },
];

const APPETITE_OPTIONS = [
  { id: 'Samagni (Balanced)', title: 'Samagni (Balanced)', desc: 'Even, predictable hunger & effortless digestion' },
  { id: 'Tikshnagni (Sharp/High)', title: 'Tikshnagni (Sharp / High)', desc: 'Intense frequent hunger, prone to acid/heat' },
  { id: 'Mandagni (Low)', title: 'Mandagni (Low / Sluggish)', desc: 'Poor hunger, heavy feeling after food' },
  { id: 'Vishamagni (Irregular)', title: 'Vishamagni (Irregular)', desc: 'Fluctuating hunger, erratic digestion' },
];

const SEASONS = [
  'Shishira (Late Winter)',
  'Vasanta (Spring)',
  'Grishma (Summer)',
  'Varsha (Monsoon)',
  'Sharad (Autumn)',
  'Hemanta (Early Winter)',
];

export default function AssessmentForm({
  patient,
  existingAssessment,
  onSaveAssessment,
  onOpenLabModal,
  onEditLabRecord,
  onDeleteLabRecord,
  labRecords = [],
}) {
  const [activeTab, setActiveTab] = useState('sec-basic');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetError, setTargetError] = useState(null);

  // Phase 5 Meal Plan State
  const [mealPlan, setMealPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Phase 6 Gemini 7-Day Diet Plan State
  const [dietPlan, setDietPlan] = useState(null);
  const [loadingDietPlan, setLoadingDietPlan] = useState(false);
  const [dietPlanError, setDietPlanError] = useState(null);


  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Basic
    assessment_date: new Date().toISOString().split('T')[0],
    dietitian_id: 'dietitian-primary',

    // Section 2: Measurements
    height: '',
    weight: '',
    waist_circumference: '',
    weight_trend: 'stable',

    // Section 3: Goal
    diet_goal: 'general_healthy_diet',
    target_weight: '',
    goal_notes: '',

    // Section 4: Lifestyle
    activity_level: 'sedentary',
    exercise_type: '',
    exercise_frequency: '',
    exercise_duration: '',
    sleep_duration: '7',
    sleep_quality: 'good',
    water_intake: '2.5',

    // Section 5: Dietary Profile
    diet_category: 'vegetarian',
    meal_frequency: 3,
    meal_timings: '',
    food_preferences: '',
    foods_disliked: '',

    // Section 6: Safety Restrictions
    food_allergies: '',
    food_intolerances: '',
    dietary_restrictions: '',

    // Section 7: Medical Info
    existing_conditions: '',
    medical_history: '',
    symptoms: '',
    supplements: '',
    medications: [],

    // Section 8: Ayurvedic Info
    prakriti: 'Unknown / Not assessed',
    vikriti: '',
    appetite: 'Samagni (Balanced)',
    digestion: 'Normal',
    bowel_habits: 'Regular',
    meal_regularity: 'regular',
    season_ritu: 'Vasanta (Spring)',
    dietitian_observations: '',
  });

  // Populate when patient or existingAssessment changes
  useEffect(() => {
    if (existingAssessment) {
      setFormData({
        assessment_date: existingAssessment.assessment_date
          ? existingAssessment.assessment_date.split('T')[0]
          : new Date().toISOString().split('T')[0],
        dietitian_id: existingAssessment.dietitian_id || 'dietitian-primary',
        height: existingAssessment.height ?? '',
        weight: existingAssessment.weight ?? '',
        waist_circumference: existingAssessment.waist_circumference ?? '',
        weight_trend: existingAssessment.weight_trend || 'stable',
        diet_goal: existingAssessment.diet_goal || 'general_healthy_diet',
        target_weight: existingAssessment.target_weight ?? '',
        goal_notes: existingAssessment.goal_notes || '',
        activity_level: existingAssessment.activity_level || 'sedentary',
        exercise_type: existingAssessment.exercise_type || '',
        exercise_frequency: existingAssessment.exercise_frequency || '',
        exercise_duration: existingAssessment.exercise_duration || '',
        sleep_duration: existingAssessment.sleep_duration ?? '7',
        sleep_quality: existingAssessment.sleep_quality || 'good',
        water_intake: existingAssessment.water_intake ?? '2.5',
        diet_category: existingAssessment.diet_category || 'vegetarian',
        meal_frequency: existingAssessment.meal_frequency || 3,
        meal_timings: Array.isArray(existingAssessment.meal_timings)
          ? existingAssessment.meal_timings.join(', ')
          : existingAssessment.meal_timings || '',
        food_preferences: existingAssessment.food_preferences || '',
        foods_disliked: existingAssessment.foods_disliked || '',
        food_allergies: Array.isArray(existingAssessment.food_allergies)
          ? existingAssessment.food_allergies.join(', ')
          : existingAssessment.food_allergies || '',
        food_intolerances: Array.isArray(existingAssessment.food_intolerances)
          ? existingAssessment.food_intolerances.join(', ')
          : existingAssessment.food_intolerances || '',
        dietary_restrictions: Array.isArray(existingAssessment.dietary_restrictions)
          ? existingAssessment.dietary_restrictions.join(', ')
          : existingAssessment.dietary_restrictions || '',
        existing_conditions: Array.isArray(existingAssessment.existing_conditions)
          ? existingAssessment.existing_conditions.join(', ')
          : existingAssessment.existing_conditions || '',
        medical_history: existingAssessment.medical_history || '',
        symptoms: Array.isArray(existingAssessment.symptoms)
          ? existingAssessment.symptoms.map((s) => (typeof s === 'object' ? `${s.symptom} (${s.severity || ''})` : s)).join(', ')
          : existingAssessment.symptoms || '',
        supplements: existingAssessment.supplements || '',
        medications: existingAssessment.medications || [],
        prakriti: existingAssessment.prakriti || 'Unknown / Not assessed',
        vikriti: existingAssessment.vikriti || '',
        appetite: existingAssessment.appetite || 'Samagni (Balanced)',
        digestion: existingAssessment.digestion || 'Normal',
        bowel_habits: existingAssessment.bowel_habits || 'Regular',
        meal_regularity: existingAssessment.meal_regularity || 'regular',
        season_ritu: existingAssessment.season_ritu || 'Vasanta (Spring)',
        dietitian_observations: existingAssessment.dietitian_observations || '',
      });
    } else {
      // Reset to defaults for a new assessment
      setFormData({
        assessment_date: new Date().toISOString().split('T')[0],
        dietitian_id: 'dietitian-primary',
        height: '',
        weight: '',
        waist_circumference: '',
        weight_trend: 'stable',
        diet_goal: 'general_healthy_diet',
        target_weight: '',
        goal_notes: '',
        activity_level: 'sedentary',
        exercise_type: '',
        exercise_frequency: '',
        exercise_duration: '',
        sleep_duration: '7',
        sleep_quality: 'good',
        water_intake: '2.5',
        diet_category: 'vegetarian',
        meal_frequency: 3,
        meal_timings: '',
        food_preferences: '',
        foods_disliked: '',
        food_allergies: '',
        food_intolerances: '',
        dietary_restrictions: '',
        existing_conditions: '',
        medical_history: '',
        symptoms: '',
        supplements: '',
        medications: [],
        prakriti: 'Unknown / Not assessed',
        vikriti: '',
        appetite: 'Samagni (Balanced)',
        digestion: 'Normal',
        bowel_habits: 'Regular',
        meal_regularity: 'regular',
        season_ritu: 'Vasanta (Spring)',
        dietitian_observations: '',
      });
    }
  }, [patient, existingAssessment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Medication Rows Handlers
  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [
        ...prev.medications,
        { medication_name: '', dosage: '', frequency: '', purpose: '' },
      ],
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.medications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, medications: updated };
    });
  };

  const handleRemoveMedication = (index) => {
    setFormData((prev) => {
      const updated = prev.medications.filter((_, i) => i !== index);
      return { ...prev, medications: updated };
    });
  };

  const handleComputeTargets = async () => {
    setTargetError(null);
    if (!formData.height || !formData.weight) {
      setTargetError({
        message: 'Please provide both Height (cm) and Weight (kg) in Section 2 to compute deterministic targets.',
      });
      setActiveTab('sec-nutrition');
      return;
    }

    try {
      setLoadingTargets(true);
      setActiveTab('sec-nutrition');

      const toArray = (val) => {
        if (Array.isArray(val)) return val;
        if (!val || typeof val !== 'string') return [];
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      };

      const payload = {
        patient_id: patient?.patient_code || String(patient?.id || 'TEMP'),
        assessment_id: existingAssessment?.id || null,
        age: Number(patient?.age) || 30,
        sex: patient?.sex || 'other',
        height: Number(formData.height),
        weight: Number(formData.weight),
        waist_circumference: formData.waist_circumference ? Number(formData.waist_circumference) : null,
        weight_trend: formData.weight_trend || 'stable',
        diet_goal: formData.diet_goal || 'general_healthy_diet',
        target_weight: formData.target_weight ? Number(formData.target_weight) : null,
        goal_notes: formData.goal_notes || '',
        activity_level: formData.activity_level || 'sedentary',
        exercise_type: formData.exercise_type || '',
        exercise_frequency: formData.exercise_frequency || '',
        exercise_duration: formData.exercise_duration || '',
        sleep_duration: formData.sleep_duration ? Number(formData.sleep_duration) : null,
        sleep_quality: formData.sleep_quality || 'good',
        water_intake: formData.water_intake ? Number(formData.water_intake) : null,
        diet_category: formData.diet_category || 'vegetarian',
        meal_frequency: Number(formData.meal_frequency) || 3,
        meal_timings: toArray(formData.meal_timings),
        food_preferences: formData.food_preferences || '',
        foods_disliked: formData.foods_disliked || '',
        food_allergies: toArray(formData.food_allergies),
        food_intolerances: toArray(formData.food_intolerances),
        dietary_restrictions: toArray(formData.dietary_restrictions),
        existing_conditions: toArray(formData.existing_conditions),
        medical_history: formData.medical_history || '',
        symptoms: toArray(formData.symptoms),
        medications: formData.medications || [],
        supplements: formData.supplements || '',
        prakriti: formData.prakriti || 'Unknown / Not assessed',
        vikriti: formData.vikriti || '',
        appetite: formData.appetite || 'Samagni (Balanced)',
        digestion: formData.digestion || 'Normal',
        bowel_habits: formData.bowel_habits || 'Regular',
        meal_regularity: formData.meal_regularity || 'regular',
        season_ritu: formData.season_ritu || 'Vasanta (Spring)',
        dietitian_observations: formData.dietitian_observations || '',
      };

      const res = await api.calculateNutrition(payload);
      setNutritionTargets(res.data);
    } catch (err) {
      console.error('Error computing nutrition targets:', err);
      setTargetError(err);
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const toArray = (val) =>
        val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

      const payload = {
        patient_id: patient?.id,
        assessment_id: existingAssessment?.id,
        age: patient?.age,
        sex: patient?.sex,
        height: Number(formData.height) || 165,
        weight: Number(formData.weight) || 65,
        diet_goal: formData.diet_goal,
        activity_level: formData.activity_level || 'sedentary',
        diet_category: formData.diet_category || 'vegetarian',
        meal_frequency: Number(formData.meal_frequency) || 3,
        food_preferences: formData.food_preferences || '',
        foods_disliked: formData.foods_disliked || '',
        food_allergies: toArray(formData.food_allergies),
        food_intolerances: toArray(formData.food_intolerances),
        dietary_restrictions: toArray(formData.dietary_restrictions),
        existing_conditions: toArray(formData.existing_conditions),
        medications: formData.medications || [],
        prakriti: formData.prakriti || 'Unknown / Not assessed',
        vikriti: formData.vikriti || '',
        appetite: formData.appetite || 'Samagni (Balanced)',
        season_ritu: formData.season_ritu || 'Vasanta (Spring)',
      };

      const res = await api.generateMealPlan({
        patient_assessment: payload,
        nutrition_targets: nutritionTargets,
      });

      setMealPlan(res.data);
      setActiveTab('sec-mealplan');
    } catch (err) {
      console.error('Error generating meal plan:', err);
      setPlanError(err.message || 'Failed to generate meal plan');
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSaveMealPlan = async (planToSave) => {
    setSavingPlan(true);
    try {
      await api.saveMealPlan({
        ...planToSave,
        patient_id: patient?.id || 1,
        assessment_id: existingAssessment?.id || null,
      });
      alert('Meal plan saved successfully!');
    } catch (err) {
      console.error('Error saving meal plan:', err);
      alert(`Failed to save meal plan: ${err.message}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleGenerateDietPlan = async (dietitianNotes = '') => {
    setLoadingDietPlan(true);
    setDietPlanError(null);
    try {
      const toArray = (val) =>
        val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

      const payload = {
        patient_id: patient?.id || 1,
        assessment_id: existingAssessment?.id || null,
        name: patient?.name,
        age: patient?.age,
        sex: patient?.sex,
        gender: patient?.sex,
        height: Number(formData.height) || 165,
        weight: Number(formData.weight) || 65,
        activity_level: formData.activity_level || 'sedentary',
        diet_goal: formData.diet_goal || 'general_healthy_diet',
        diet_category: formData.diet_category || 'vegetarian',
        prakriti: formData.prakriti || 'Vata-Pitta',
        vikriti: formData.vikriti || '',
        digestive_fire: formData.appetite || 'Samagni (Balanced)',
        allergies: toArray(formData.food_allergies),
        medical_conditions: toArray(formData.existing_conditions),
        risk_category: 'low',
      };

      const res = await api.generate7DayDietPlan({
        patient_assessment: payload,
        nutrition_targets: nutritionTargets,
        dietitian_notes: dietitianNotes,
        save: true,
      });

      setDietPlan(res.data);
      setActiveTab('sec-dietplan');
    } catch (err) {
      console.error('Error generating 7-day diet plan:', err);
      setDietPlanError(err.message || 'Failed to generate 7-day diet plan');
    } finally {
      setLoadingDietPlan(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation checks
    if (!formData.diet_goal) {
      setFormError('Please select a Diet Goal in Section 3.');
      setActiveTab('sec-goal');
      return;
    }
    if (!formData.diet_category) {
      setFormError('Please select a Dietary Profile category in Section 5.');
      setActiveTab('sec-diet');
      return;
    }
    if (!formData.prakriti) {
      setFormError('Please select an Ayurvedic Prakriti in Section 8.');
      setActiveTab('sec-ayurveda');
      return;
    }

    // Parse array string fields
    const toArray = (val) =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const payload = {
      ...formData,
      meal_timings: toArray(formData.meal_timings),
      food_allergies: toArray(formData.food_allergies),
      food_intolerances: toArray(formData.food_intolerances),
      dietary_restrictions: toArray(formData.dietary_restrictions),
      existing_conditions: toArray(formData.existing_conditions),
      symptoms: toArray(formData.symptoms).map((s) => ({ symptom: s })),
      medications: formData.medications.filter((m) => m.medication_name && m.medication_name.trim().length > 0),
    };

    try {
      setSaving(true);
      await onSaveAssessment(payload);
    } catch (err) {
      setFormError(err.message || 'Failed to save patient assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
      {/* Patient Header Card */}
      <div className="patient-profile-card">
        <div className="profile-identity">
          <div className="profile-avatar">{patient.name.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <h2>{patient.name}</h2>
            <div className="profile-tags">
              <span className="profile-tag">ID: <strong>{patient.patient_code}</strong></span>
              <span className="profile-tag">{patient.age} yrs</span>
              <span className="profile-tag" style={{ textTransform: 'capitalize' }}>{patient.sex}</span>
              {patient.occupation && <span className="profile-tag">{patient.occupation}</span>}
              {patient.phone && <span className="profile-tag">📞 {patient.phone}</span>}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <span style={{ fontSize: '0.82rem', color: '#788d84' }}>
            {existingAssessment ? `Editing Assessment #${existingAssessment.id}` : 'Creating New Assessment'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs for 9 Sections */}
      <div className="assessment-nav">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            className={`nav-tab-btn ${activeTab === sec.id ? 'active' : ''}`}
            onClick={() => setActiveTab(sec.id)}
          >
            <span className="tab-num">{sec.num}</span>
            {sec.label.replace(/^\d+\.\s*/, '')}
          </button>
        ))}
      </div>

      {formError && (
        <div className="toast-banner toast-error">
          <span>{formError}</span>
        </div>
      )}

      {/* SECTION 1: BASIC DETAILS */}
      {activeTab === 'sec-basic' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">1</span> Basic Patient Details
              </h3>
              <p className="section-subtitle">Core demographic and clinical consultation record</p>
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Patient ID</label>
              <input type="text" className="form-input" value={patient.patient_code} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Patient Name</label>
              <input type="text" className="form-input" value={patient.name} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">
                Date of Assessment <span className="required">*</span>
              </label>
              <input
                type="date"
                name="assessment_date"
                className="form-input"
                value={formData.assessment_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input type="text" className="form-input" value={`${patient.age} years`} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Sex</label>
              <input type="text" className="form-input" value={patient.sex} style={{ textTransform: 'capitalize' }} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Occupation</label>
              <input type="text" className="form-input" value={patient.occupation || 'Not specified'} disabled />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BODY MEASUREMENTS */}
      {activeTab === 'sec-body' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">2</span> Body Measurements & Anthropometrics
              </h3>
              <p className="section-subtitle">
                Enter physiological measurements. Deterministic BMI, Mifflin-St Jeor BMR, and TDEE are computed in Section 10.
              </p>
            </div>
            {formData.height && formData.weight && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', borderColor: '#2d6a4f', color: '#1b4332' }}
                onClick={handleComputeTargets}
              >
                ⚡ Compute Nutrition Targets →
              </button>
            )}
          </div>

          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                name="height"
                className="form-input"
                placeholder="e.g. 175"
                value={formData.height}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="500"
                name="weight"
                className="form-input"
                placeholder="e.g. 74.5"
                value={formData.weight}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Waist Circumference (cm)</label>
              <input
                type="number"
                step="0.5"
                min="30"
                max="250"
                name="waist_circumference"
                className="form-input"
                placeholder="e.g. 86"
                value={formData.waist_circumference}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weight Trend</label>
              <select
                name="weight_trend"
                className="form-select"
                value={formData.weight_trend}
                onChange={handleChange}
              >
                <option value="stable">Stable</option>
                <option value="losing">Losing Weight</option>
                <option value="gaining">Gaining Weight</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: DIET GOAL */}
      {activeTab === 'sec-goal' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">3</span> Primary Dietary Goal
              </h3>
              <p className="section-subtitle">Specify the patient's primary therapeutic diet direction</p>
            </div>
          </div>

          <div className="option-cards-group" style={{ marginBottom: '1.25rem' }}>
            {DIET_GOALS.map((goal) => (
              <div
                key={goal.id}
                className={`option-card ${formData.diet_goal === goal.id ? 'selected' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, diet_goal: goal.id }))}
              >
                <div className="option-card-title">{goal.title}</div>
                <div className="option-card-desc">{goal.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Optional Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                name="target_weight"
                className="form-input"
                placeholder="e.g. 68.0"
                value={formData.target_weight}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Goal Notes & Practitioner Objectives</label>
              <input
                type="text"
                name="goal_notes"
                className="form-input"
                placeholder="e.g. Gradual weight reduction prioritizing Ama clearance and Agni stabilization"
                value={formData.goal_notes}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: LIFESTYLE */}
      {activeTab === 'sec-lifestyle' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">4</span> Lifestyle & Physical Activity
              </h3>
              <p className="section-subtitle">Daily movement habits, sleep pattern, and hydration</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <label className="form-label">Daily Physical Activity Level</label>
            <div className="option-cards-group">
              {[
                { id: 'sedentary', title: 'Sedentary', desc: 'Desk job, little to no exercise' },
                { id: 'lightly_active', title: 'Lightly Active', desc: 'Light exercise 1-3 days/wk' },
                { id: 'moderately_active', title: 'Moderately Active', desc: 'Moderate workout 3-5 days/wk' },
                { id: 'very_active', title: 'Very Active', desc: 'Hard exercise 6-7 days/wk' },
                { id: 'extremely_active', title: 'Extremely Active', desc: 'Heavy physical labor or athlete' },
              ].map((lvl) => (
                <div
                  key={lvl.id}
                  className={`option-card ${formData.activity_level === lvl.id ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, activity_level: lvl.id }))}
                >
                  <div className="option-card-title">{lvl.title}</div>
                  <div className="option-card-desc">{lvl.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Exercise Type</label>
              <input
                type="text"
                name="exercise_type"
                className="form-input"
                placeholder="e.g. Yoga, Brisk walking, Cycling"
                value={formData.exercise_type}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Exercise Frequency</label>
              <input
                type="text"
                name="exercise_frequency"
                className="form-input"
                placeholder="e.g. 4 times per week"
                value={formData.exercise_frequency}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Exercise Duration</label>
              <input
                type="text"
                name="exercise_duration"
                className="form-input"
                placeholder="e.g. 45 minutes / session"
                value={formData.exercise_duration}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Sleep Duration (hours/night)</label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="16"
                name="sleep_duration"
                className="form-input"
                placeholder="e.g. 7"
                value={formData.sleep_duration}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sleep Quality</label>
              <select
                name="sleep_quality"
                className="form-select"
                value={formData.sleep_quality}
                onChange={handleChange}
              >
                <option value="poor">Poor (Disturbed / Insomnia)</option>
                <option value="fair">Fair (Intermittent wakefulness)</option>
                <option value="good">Good (Restful)</option>
                <option value="excellent">Excellent (Deep & refreshing)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Water Intake (litres/day)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                name="water_intake"
                className="form-input"
                placeholder="e.g. 2.5"
                value={formData.water_intake}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: DIETARY PROFILE */}
      {activeTab === 'sec-diet' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">5</span> Dietary Profile & Food Habits
              </h3>
              <p className="section-subtitle">Dietary classification, meal scheduling, and taste inclinations</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">
              Dietary Category <span className="required">*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {DIET_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`btn-secondary ${formData.diet_category === cat.id ? 'btn-primary' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, diet_category: cat.id }))}
                  style={{ minWidth: '120px' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Meal Frequency (meals/day)</label>
              <input
                type="number"
                min="1"
                max="8"
                name="meal_frequency"
                className="form-input"
                placeholder="e.g. 3"
                value={formData.meal_frequency}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Meal Timings</label>
              <input
                type="text"
                name="meal_timings"
                className="form-input"
                placeholder="e.g. Breakfast 8:30 AM, Lunch 1:30 PM, Dinner 8:30 PM"
                value={formData.meal_timings}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Food Preferences</label>
              <textarea
                name="food_preferences"
                className="form-textarea"
                placeholder="e.g. Warm cooked meals, kheer, moong dal khichdi, seasonal fruits, ghee"
                value={formData.food_preferences}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Foods Disliked or Avoided</label>
              <textarea
                name="foods_disliked"
                className="form-textarea"
                placeholder="e.g. Bitter gourd, raw onion salads, chilled beverages, excessive tamarind"
                value={formData.foods_disliked}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: SAFETY RESTRICTIONS */}
      {activeTab === 'sec-safety' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">6</span> Safety Restrictions & Sensitivities
              </h3>
              <p className="section-subtitle">Crucial food safety constraints, allergies, and clinical cautions</p>
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Food Allergies</label>
              <textarea
                name="food_allergies"
                className="form-textarea"
                placeholder="Comma-separated: e.g. Peanuts, Shellfish, Tree nuts"
                value={formData.food_allergies}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Food Intolerances</label>
              <textarea
                name="food_intolerances"
                className="form-textarea"
                placeholder="Comma-separated: e.g. Lactose, Gluten sensitivity, Fructose"
                value={formData.food_intolerances}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dietary Restrictions</label>
              <textarea
                name="dietary_restrictions"
                className="form-textarea"
                placeholder="Comma-separated: e.g. Low sodium, Diabetic carbohydrate limit, Renal potassium restriction"
                value={formData.dietary_restrictions}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: MEDICAL INFORMATION */}
      {activeTab === 'sec-medical' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">7</span> Medical Information, Symptoms & Medications
              </h3>
              <p className="section-subtitle">Clinical history, active pharmacology, and symptoms</p>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Existing Conditions</label>
              <input
                type="text"
                name="existing_conditions"
                className="form-input"
                placeholder="Comma-separated: e.g. Hypertension, Type 2 Diabetes, Hypothyroidism"
                value={formData.existing_conditions}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active Symptoms (with frequency / severity)</label>
              <input
                type="text"
                name="symptoms"
                className="form-input"
                placeholder="Comma-separated: e.g. Heartburn (moderate post dinner), Bloating (mild), Fatigue"
                value={formData.symptoms}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Medical History</label>
              <textarea
                name="medical_history"
                className="form-textarea"
                placeholder="e.g. Gallbladder stone history, appendectomy in 2018, family history of CAD"
                value={formData.medical_history}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplements & Herbal Formulations</label>
              <textarea
                name="supplements"
                className="form-textarea"
                placeholder="e.g. Triphala churna 3g at bedtime, Vitamin D3 60,000 IU weekly, Ashwagandha"
                value={formData.supplements}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Dynamic Medication Rows */}
          <div style={{ marginTop: '1.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.95rem' }}>
              Current Prescription Medications ({formData.medications.length})
            </label>
            <p style={{ fontSize: '0.76rem', color: '#788d84', marginBottom: '0.5rem' }}>
              Add all active medications for potential diet-drug interaction checking in future phases.
            </p>

            {formData.medications.length > 0 && (
              <table className="dynamic-table">
                <thead>
                  <tr>
                    <th>Medication Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Purpose</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.medications.map((med, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Metformin"
                          value={med.medication_name}
                          onChange={(e) => handleMedicationChange(idx, 'medication_name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 500mg"
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Twice daily with meals"
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Glycemic control"
                          value={med.purpose}
                          onChange={(e) => handleMedicationChange(idx, 'purpose', e.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => handleRemoveMedication(idx)}
                          title="Remove medication"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button type="button" className="btn-add-row" onClick={handleAddMedication}>
              <span>+</span> Add Medication Row
            </button>
          </div>
        </div>
      )}

      {/* SECTION 8: AYURVEDIC INFORMATION */}
      {activeTab === 'sec-ayurveda' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">8</span> Ayurvedic Assessment & Doshic State
              </h3>
              <p className="section-subtitle">
                Prakriti constitution, Vikriti imbalances, Agni digestive fire, and seasonal rhythms
              </p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">
              Patient Prakriti (Constitution) <span className="required">*</span>
            </label>
            <div className="prakriti-grid">
              {PRAKRITI_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`prakriti-btn ${item.type} ${formData.prakriti === item.value ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, prakriti: item.value }))}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Vikriti (Current Doshic Imbalance)</label>
            <input
              type="text"
              name="vikriti"
              className="form-input"
              placeholder="e.g. Aggravated Pitta with secondary Vata dryness, mild Ama signs"
              value={formData.vikriti}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Agni / Appetite State</label>
            <div className="option-cards-group">
              {APPETITE_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className={`option-card ${formData.appetite === opt.id ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, appetite: opt.id }))}
                >
                  <div className="option-card-title">{opt.title}</div>
                  <div className="option-card-desc">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Digestion Pattern</label>
              <select
                name="digestion"
                className="form-select"
                value={formData.digestion}
                onChange={handleChange}
              >
                <option value="Normal">Normal & comfortable</option>
                <option value="Bloating">Bloating & fullness</option>
                <option value="Gas">Gas & flatulence</option>
                <option value="Acidity">Hyperacidity / Heartburn</option>
                <option value="Sluggish/Heavy">Sluggish / Post-meal heaviness</option>
                <option value="Irregular">Irregular & unpredictable</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Bowel Habits (Koshtha)</label>
              <select
                name="bowel_habits"
                className="form-select"
                value={formData.bowel_habits}
                onChange={handleChange}
              >
                <option value="Regular">Regular (Madhyama Koshtha)</option>
                <option value="Constipated">Constipated / Hard stools (Krura Koshtha)</option>
                <option value="Loose">Loose / Rapid transit (Mridu Koshtha)</option>
                <option value="Irregular">Irregular / Variable</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Meal Regularity</label>
              <select
                name="meal_regularity"
                className="form-select"
                value={formData.meal_regularity}
                onChange={handleChange}
              >
                <option value="regular">Regular daily meal timings</option>
                <option value="irregular">Irregular / Skipped meals</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Season / Current Ritu</label>
              <select
                name="season_ritu"
                className="form-select"
                value={formData.season_ritu}
                onChange={handleChange}
              >
                {SEASONS.map((ritu) => (
                  <option key={ritu} value={ritu}>{ritu}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Dietitian Observations & Classical Notes</label>
              <textarea
                name="dietitian_observations"
                className="form-textarea"
                placeholder="Clinical observations regarding tongue coating (Jihva), pulse notes (Nadi), complexion, or specific dietary recommendations."
                value={formData.dietitian_observations}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: CLINICAL & LABORATORY DATA (OPTIONAL) */}
      {activeTab === 'sec-lab' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">9</span> Clinical & Laboratory Data (Optional)
              </h3>
              <p className="section-subtitle">
                Record diagnostic biomarkers and report upload metadata. Dietitians can verify, edit, or remove entries.
              </p>
            </div>

            {existingAssessment ? (
              <button
                type="button"
                className="btn-new-patient"
                onClick={onOpenLabModal}
              >
                <span>+</span> Add Lab Test
              </button>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#c98a3e', background: '#fef7ed', padding: '0.3rem 0.75rem', borderRadius: '6px' }}>
                Save the assessment first to link laboratory biomarker records.
              </div>
            )}
          </div>

          {labRecords.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#788d84' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🧪</div>
              <p style={{ fontWeight: 500 }}>No clinical or laboratory records entered yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                This section is optional. You can record blood panels (Glucose, Lipids, LFT, KFT, Thyroid) and store report metadata.
              </p>
              {existingAssessment && (
                <button
                  type="button"
                  className="btn-add-row"
                  onClick={onOpenLabModal}
                  style={{ marginTop: '1rem' }}
                >
                  <span>+</span> Add First Lab Record
                </button>
              )}
            </div>
          ) : (
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Observed Value</th>
                  <th>Unit</th>
                  <th>Reference Range</th>
                  <th>Test Date</th>
                  <th>Laboratory</th>
                  <th>Status</th>
                  <th>Attached File</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labRecords.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.test_name}</strong></td>
                    <td style={{ fontWeight: 600 }}>{item.value}</td>
                    <td>{item.unit || '—'}</td>
                    <td>{item.reference_range || '—'}</td>
                    <td>{item.test_date ? item.test_date.split('T')[0] : '—'}</td>
                    <td>{item.source_laboratory || '—'}</td>
                    <td>
                      <span className={`badge-flag badge-${item.reported_flag || 'normal'}`}>
                        {item.reported_flag || 'normal'}
                      </span>
                    </td>
                    <td>
                      {item.report_file_metadata ? (
                        <span style={{ fontSize: '0.76rem', color: '#15803d' }}>
                          📄 {item.report_file_metadata.fileName}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: '1px solid #e2ece7',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                          }}
                          onClick={() => onEditLabRecord(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => onDeleteLabRecord(item.id)}
                          title="Delete lab record"
                        >
                          &times;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SECTION 10: NUTRITION TARGETS (DETERMINISTIC ENGINE) */}
      {activeTab === 'sec-nutrition' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">10</span> Deterministic Nutrition Targets & Personalization
              </h3>
              <p className="section-subtitle">
                Deterministic clinical targets computed using validated Mifflin-St Jeor BMR, PAL activity multipliers, and classical Ayurvedic dosha guidelines.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleComputeTargets}
              disabled={loadingTargets}
            >
              {loadingTargets ? 'Computing...' : '⚡ Recompute Targets'}
            </button>
          </div>

          <NutritionTargetsView
            targets={nutritionTargets}
            loading={loadingTargets}
            onRecalculate={handleComputeTargets}
            error={targetError}
          />
        </div>
      )}

      {/* SECTION 11: FOOD & MEAL PLAN (DETERMINISTIC ENGINE) */}
      {activeTab === 'sec-mealplan' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">11</span> Deterministic Food & Meal Planning
              </h3>
              <p className="section-subtitle">
                Constructs grounded, Ayurvedic-aligned, macro-balanced daily meal plans with portion sizing, transparent scoring explanations, and clinical substitutions.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleGenerateMealPlan}
              disabled={loadingPlan}
            >
              {loadingPlan ? 'Generating Plan...' : '⚡ Generate Meal Plan'}
            </button>
          </div>

          <MealPlanView
            mealPlan={mealPlan}
            loading={loadingPlan}
            onGeneratePlan={handleGenerateMealPlan}
            onSavePlan={handleSaveMealPlan}
            error={planError}
            savingPlan={savingPlan}
          />
        </div>
      )}

      {/* SECTION 12: 7-DAY DIET PLAN (GEMINI POWERED) */}
      {activeTab === 'sec-dietplan' && (
        <div className="form-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <span className="section-number-pill">12</span> Gemini-Powered 7-Day Diet Plan
              </h3>
              <p className="section-subtitle">
                Comprehensive 7-day clinical meal schedule for registered dietitians. Formatted by Gemini with daily staple rotations, authentic Ayurvedic culinary instructions, and strict post-generation deterministic guardrails.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleGenerateDietPlan()}
              disabled={loadingDietPlan}
            >
              {loadingDietPlan ? 'Generating 7-Day Plan...' : '⚡ Generate 7-Day Plan'}
            </button>
          </div>

          <DietPlanView
            patient={patient}
            existingAssessment={existingAssessment}
            nutritionTargets={nutritionTargets}
            dietPlan={dietPlan}
            onGeneratePlan={handleGenerateDietPlan}
            loading={loadingDietPlan}
            error={dietPlanError}
          />
        </div>
      )}

      {/* Floating Action Footer */}
      <div className="action-footer">
        <div>
          <span style={{ fontSize: '0.85rem', color: '#4a5d55' }}>
            Section {SECTIONS.findIndex((s) => s.id === activeTab) + 1} of {SECTIONS.length}:{' '}
            <strong>{SECTIONS.find((s) => s.id === activeTab)?.label}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.85rem' }}>
          {/* Step navigation buttons */}
          {activeTab !== 'sec-basic' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const idx = SECTIONS.findIndex((s) => s.id === activeTab);
                if (idx > 0) setActiveTab(SECTIONS[idx - 1].id);
              }}
            >
              ← Previous Section
            </button>
          )}

          {activeTab !== 'sec-mealplan' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const idx = SECTIONS.findIndex((s) => s.id === activeTab);
                if (idx < SECTIONS.length - 1) setActiveTab(SECTIONS[idx + 1].id);
              }}
            >
              Next Section →
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            style={{ borderColor: '#2d6a4f', color: '#1b4332', fontWeight: 600 }}
            onClick={handleComputeTargets}
            disabled={loadingTargets}
          >
            ⚡ Targets
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ borderColor: '#0f766e', color: '#0f766e', fontWeight: 600 }}
            onClick={handleGenerateMealPlan}
            disabled={loadingPlan}
          >
            🥗 {activeTab === 'sec-mealplan' ? 'Regenerate Day' : '1-Day Plan'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ borderColor: '#1b4332', color: '#1b4332', fontWeight: 700, backgroundColor: activeTab === 'sec-dietplan' ? '#e8f5e9' : 'transparent' }}
            onClick={() => {
              if (!dietPlan) {
                handleGenerateDietPlan();
              } else {
                setActiveTab('sec-dietplan');
              }
            }}
            disabled={loadingDietPlan}
          >
            📅 {loadingDietPlan ? 'Generating...' : activeTab === 'sec-dietplan' ? '7-Day Plan' : '7-Day Diet Plan'}
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : existingAssessment ? '✓ Update Assessment' : '✓ Save Assessment'}
          </button>
        </div>
      </div>

    </form>
  );
}
