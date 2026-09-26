import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function DietPlanView({
  patient,
  existingAssessment,
  nutritionTargets,
  dietPlan: initialDietPlan,
  onGeneratePlan,
  loading = false,
  error = null,
}) {
  const [dietPlan, setDietPlan] = useState(initialDietPlan || null);
  const [selectedDayNum, setSelectedDayNum] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState(null);
  const [dietitianNotesInput, setDietitianNotesInput] = useState('');
  const [validationReport, setValidationReport] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approverName, setApproverName] = useState('dietitian-primary');
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    if (initialDietPlan) {
      setDietPlan(initialDietPlan);
      setDietitianNotesInput(initialDietPlan.dietitian_notes || '');
      setValidationReport(initialDietPlan.validation_results || null);
    }
  }, [initialDietPlan]);

  const activePlan = isEditing && editBuffer ? editBuffer : dietPlan;
  const days = activePlan?.days || [];
  const currentDay = days.find((d) => d.day_number === selectedDayNum) || days[0];

  // Start editing mode with a clone of current plan
  const handleStartEditing = () => {
    setEditBuffer(JSON.parse(JSON.stringify(dietPlan)));
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditBuffer(null);
    setIsEditing(false);
  };

  // Modify portion quantity in edit buffer
  const handleItemQuantityChange = (mealIndex, foodIndex, newQty) => {
    if (!editBuffer) return;
    const updated = JSON.parse(JSON.stringify(editBuffer));
    const day = updated.days.find((d) => d.day_number === selectedDayNum);
    if (!day || !day.meals[mealIndex] || !day.meals[mealIndex].foods[foodIndex]) return;

    const food = day.meals[mealIndex].foods[foodIndex];
    const prevQty = Number(food.quantity) || 1;
    const nextQty = Math.max(5, Number(newQty) || 5);
    const ratio = nextQty / prevQty;

    food.quantity = nextQty;
    // Scale macro counts proportionally with portion adjustment
    food.calories = Math.round(food.calories * ratio * 10) / 10;
    food.protein_g = Math.round(food.protein_g * ratio * 10) / 10;
    food.carbohydrate_g = Math.round(food.carbohydrate_g * ratio * 10) / 10;
    food.fat_g = Math.round(food.fat_g * ratio * 10) / 10;
    food.fiber_g = Math.round(food.fiber_g * ratio * 10) / 10;

    // Recalculate meal totals
    const meal = day.meals[mealIndex];
    meal.totals = {
      calories: Math.round(meal.foods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0) * 10) / 10,
      protein_g: Math.round(meal.foods.reduce((sum, f) => sum + (Number(f.protein_g) || 0), 0) * 10) / 10,
      carbohydrate_g: Math.round(meal.foods.reduce((sum, f) => sum + (Number(f.carbohydrate_g) || 0), 0) * 10) / 10,
      fat_g: Math.round(meal.foods.reduce((sum, f) => sum + (Number(f.fat_g) || 0), 0) * 10) / 10,
      fiber_g: Math.round(meal.foods.reduce((sum, f) => sum + (Number(f.fiber_g) || 0), 0) * 10) / 10,
    };

    // Recalculate day totals
    day.daily_totals = {
      calories: Math.round(day.meals.reduce((sum, m) => sum + (Number(m.totals.calories) || 0), 0) * 10) / 10,
      protein_g: Math.round(day.meals.reduce((sum, m) => sum + (Number(m.totals.protein_g) || 0), 0) * 10) / 10,
      carbohydrate_g: Math.round(day.meals.reduce((sum, m) => sum + (Number(m.totals.carbohydrate_g) || 0), 0) * 10) / 10,
      fat_g: Math.round(day.meals.reduce((sum, m) => sum + (Number(m.totals.fat_g) || 0), 0) * 10) / 10,
      fiber_g: Math.round(day.meals.reduce((sum, m) => sum + (Number(m.totals.fiber_g) || 0), 0) * 10) / 10,
    };

    setEditBuffer(updated);
  };

  // Modify preparation instructions
  const handleItemPrepChange = (mealIndex, foodIndex, text) => {
    if (!editBuffer) return;
    const updated = JSON.parse(JSON.stringify(editBuffer));
    const day = updated.days.find((d) => d.day_number === selectedDayNum);
    if (!day || !day.meals[mealIndex] || !day.meals[mealIndex].foods[foodIndex]) return;

    day.meals[mealIndex].foods[foodIndex].preparation_notes = text;
    setEditBuffer(updated);
  };

  // Deterministic Revalidation call
  const handleRevalidate = async () => {
    const targetPlan = isEditing ? editBuffer : dietPlan;
    if (!targetPlan) return;

    setRevalidating(true);
    try {
      const res = await api.validateDietPlan({
        diet_plan: targetPlan,
        patient_assessment: existingAssessment || {
          patient_id: patient?.id,
          allergies: [],
          risk_category: 'low',
        },
        nutrition_targets: nutritionTargets,
      });

      setValidationReport(res.data);
      if (isEditing) {
        const updated = {
          ...editBuffer,
          validation_results: res.data,
          status: res.data.passed ? 'validated' : 'needs_review',
        };
        setEditBuffer(updated);
      } else {
        const updated = {
          ...dietPlan,
          validation_results: res.data,
          status: res.data.passed ? 'validated' : 'needs_review',
        };
        setDietPlan(updated);
        if (dietPlan.id) {
          await api.updateDietPlan(dietPlan.id, {
            validation_results: res.data,
            status: updated.status,
          });
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
      alert(`Validation error: ${err.message}`);
    } finally {
      setRevalidating(false);
    }
  };

  // Save changes back to DB
  const handleSaveEdits = async () => {
    if (!editBuffer) return;
    setSaving(true);
    try {
      // Re-run validation on save to guarantee zero drift
      const valRes = await api.validateDietPlan({
        diet_plan: editBuffer,
        patient_assessment: existingAssessment || { patient_id: patient?.id, allergies: [] },
        nutrition_targets: nutritionTargets,
      });

      const updatedPayload = {
        ...editBuffer,
        dietitian_notes: dietitianNotesInput,
        validation_results: valRes.data,
        status: valRes.data.passed ? 'validated' : 'needs_review',
        is_approved: false, // Editing resets approval
      };

      if (dietPlan?.id) {
        const res = await api.updateDietPlan(dietPlan.id, updatedPayload);
        setDietPlan(res.data);
      } else {
        const res = await api.saveDietPlan({
          ...updatedPayload,
          patient_id: patient?.id || 1,
          assessment_id: existingAssessment?.id || null,
        });
        setDietPlan(res.data);
      }

      setValidationReport(valRes.data);
      setIsEditing(false);
      setEditBuffer(null);
      alert('Diet plan updated and deterministically revalidated.');
    } catch (err) {
      console.error('Failed to save edits:', err);
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Formal Dietitian Approval
  const handleConfirmApproval = async () => {
    if (!dietPlan?.id) {
      alert('Please save the diet plan before approving.');
      return;
    }

    setApproving(true);
    try {
      const res = await api.approveDietPlan(dietPlan.id, { approved_by: approverName });
      setDietPlan(res.data);
      setApprovalModalOpen(false);
      alert('✓ Diet plan officially approved and locked by registered dietitian.');
    } catch (err) {
      console.error('Approval failed:', err);
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state-container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1.25rem' }}></div>
        <h4 style={{ color: '#1b4332', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Generating 7-Day Diet Plan...
        </h4>
        <p style={{ color: '#52796f', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto' }}>
          Assembling 7 days of balanced meals, formatting with Gemini clinical presentation layer, and executing deterministic safety guardrails.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="toast-banner toast-error" style={{ margin: '1.5rem 0' }}>
        <div>
          <strong>Error generating 7-day diet plan:</strong> {error}
        </div>
      </div>
    );
  }

  if (!dietPlan) {
    return (
      <div className="empty-state-container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
        <h4 style={{ color: '#1b4332', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          7-Day Personalized Ayurvedic Diet Plan
        </h4>
        <p style={{ color: '#52796f', fontSize: '0.9rem', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
          Generates a complete, cohesive 7-day clinical schedule with daily grain and pulse rotations, authentic Ayurvedic cooking instructions, and strict post-generation deterministic guardrails.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
          onClick={() => onGeneratePlan && onGeneratePlan(dietitianNotesInput)}
        >
          ⚡ Generate 7-Day Diet Plan
        </button>
      </div>
    );
  }

  const isApproved = Boolean(activePlan?.is_approved);
  const status = activePlan?.status || 'draft';

  return (
    <div className="diet-plan-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Banner & Status Bar */}
      <div
        className="diet-plan-header-card"
        style={{
          background: isApproved
            ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)'
            : 'linear-gradient(135deg, #0f4c3a 0%, #1e3a2f 100%)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
                {activePlan.title || '7-Day Personalized Ayurvedic Diet Plan'}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  backgroundColor:
                    status === 'approved'
                      ? '#52b788'
                      : status === 'validated'
                      ? '#74c69d'
                      : '#e9c46a',
                  color: status === 'approved' ? '#081c15' : '#1b4332',
                }}
              >
                {status.replace('_', ' ')}
              </span>
              {isApproved && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '20px',
                    backgroundColor: '#d8f3dc',
                    color: '#1b4332',
                  }}
                >
                  ✓ Signed Off by {activePlan.approved_by || 'Dietitian'}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#b7e4c7', maxWidth: '680px' }}>
              Patient #{activePlan.patient_id} • 7 Full Days • ICMR-NIN & Ayurvedic Grounded • Guardrail Verified
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                fontSize: '0.82rem',
                padding: '0.45rem 0.85rem',
              }}
              onClick={() => onGeneratePlan && onGeneratePlan(dietitianNotesInput)}
              disabled={isEditing}
            >
              🔄 Regenerate
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                fontSize: '0.82rem',
                padding: '0.45rem 0.85rem',
              }}
              onClick={handleRevalidate}
              disabled={revalidating}
            >
              {revalidating ? 'Checking...' : '🛡️ Re-validate Guardrails'}
            </button>

            {!isEditing ? (
              <button
                type="button"
                className="btn-secondary"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1b4332',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.95rem',
                }}
                onClick={handleStartEditing}
              >
                ✏️ Edit Portions & Notes
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.75rem',
                  }}
                  onClick={handleCancelEditing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    backgroundColor: '#52b788',
                    color: '#081c15',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.95rem',
                  }}
                  onClick={handleSaveEdits}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save & Verify'}
                </button>
              </>
            )}

            {!isApproved && !isEditing && (
              <button
                type="button"
                className="btn-primary"
                style={{
                  backgroundColor: '#74c69d',
                  color: '#081c15',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.95rem',
                }}
                onClick={() => setApprovalModalOpen(true)}
              >
                🔏 Sign & Approve Plan
              </button>
            )}
          </div>
        </div>

        {/* Approval Timestamp Ribbon */}
        {isApproved && activePlan.approved_at && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.8rem',
              color: '#d8f3dc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>📜</span>
            <span>
              Officially signed off on {new Date(activePlan.approved_at).toLocaleString()} by{' '}
              <strong>{activePlan.approved_by || 'Registered Dietitian'}</strong>.
            </span>
          </div>
        )}
      </div>

      {/* 2. Executive Clinical & Ayurvedic Strategy Cards */}
      <div className="grid-2" style={{ gap: '1rem' }}>
        {/* Patient & Clinical Rationale Card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#1b4332', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📋</span> Clinical Patient Assessment & Rationale
          </h4>
          <p style={{ fontSize: '0.86rem', color: '#2d3748', lineHeight: '1.5', marginBottom: '0.75rem' }}>
            {activePlan.patient_summary}
          </p>
          <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #2d6a4f' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#2d6a4f', fontWeight: 700 }}>
              Clinical Strategy:
            </span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#1b4332', lineHeight: '1.45' }}>
              {activePlan.clinical_rationale}
            </p>
          </div>
        </div>

        {/* Ayurvedic Ahara Principles Card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#1b4332', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🌿</span> Ayurvedic Dietary Principles (Ahara Vidhi)
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem', color: '#2d3748', lineHeight: '1.5' }}>
            {(activePlan.ayurvedic_dietary_principles || []).map((p, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>{p}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Guardrail Status Banner */}
      {validationReport && (
        <div
          style={{
            backgroundColor: validationReport.passed ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${validationReport.passed ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{validationReport.passed ? '🛡️' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: validationReport.passed ? '#166534' : '#991b1b' }}>
                {validationReport.passed
                  ? 'All Post-Generation Deterministic Guardrails Passed'
                  : 'Guardrail Review Required'}
              </div>
              <div style={{ fontSize: '0.78rem', color: validationReport.passed ? '#15803d' : '#b91c1c' }}>
                {validationReport.item_check_count > 0 && `${validationReport.item_check_count} items validated • `}
                Macro Tolerances: {validationReport.macro_tolerance_passed ? '✓ Passed' : '⚠️ Flagged'} • Allergens: {validationReport.allergen_safety_passed ? '✓ Safe' : '❌ Conflict'} • Curative Claims: {validationReport.forbidden_claims_found?.length ? '❌ Detected' : '✓ 0 Detected'}
              </div>
            </div>
          </div>

          {validationReport.warnings?.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#854d0e', backgroundColor: '#fef9c3', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              {validationReport.warnings.length} warning(s) noted
            </span>
          )}
        </div>
      )}

      {/* 4. 7-Day Interactive Day Switcher */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', color: '#1b4332', fontWeight: 600 }}>
            7-Day Meal Schedule
          </h4>
          <span style={{ fontSize: '0.8rem', color: '#52796f' }}>
            Select day to review meals, timings & culinary instructions
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {days.map((day) => {
            const isSelected = day.day_number === selectedDayNum;
            const cals = day.daily_totals?.calories || 0;
            const prot = day.daily_totals?.protein_g || 0;

            return (
              <button
                key={day.day_number}
                type="button"
                onClick={() => setSelectedDayNum(day.day_number)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #2d6a4f' : '1px solid #d8f3dc',
                  backgroundColor: isSelected ? '#e8f5e9' : '#ffffff',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(45, 106, 79, 0.15)' : 'none',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#1b4332' : '#495057' }}>
                  {day.day_name.split(' ')[0]} {day.day_name.split(' ')[1] || ''}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#2d6a4f', marginTop: '0.15rem', fontWeight: 600 }}>
                  {cals} kcal
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6c757d' }}>
                  {prot}g protein
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Selected Day Detail View */}
      {currentDay && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          {/* Day Header Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '0.75rem',
              borderBottom: '1px solid #edf2f7',
              paddingBottom: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                  }}
                >
                  Day {currentDay.day_number}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1b4332' }}>
                  {currentDay.day_name}
                </h3>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#0f766e', fontWeight: 600, marginTop: '0.3rem' }}>
                Theme: {currentDay.theme}
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#4a5568' }}>
                {currentDay.daily_summary}
              </p>
            </div>

            {/* Daily Macro Summary Box */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                backgroundColor: '#f7fafc',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase' }}>Energy</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1b4332' }}>
                  {currentDay.daily_totals?.calories} <span style={{ fontSize: '0.68rem', fontWeight: 400 }}>kcal</span>
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase' }}>Protein</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2b6cb0' }}>
                  {currentDay.daily_totals?.protein_g}g
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase' }}>Carbs</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d69e2e' }}>
                  {currentDay.daily_totals?.carbohydrate_g}g
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase' }}>Fat</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dd6b20' }}>
                  {currentDay.daily_totals?.fat_g}g
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase' }}>Fiber</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38a169' }}>
                  {currentDay.daily_totals?.fiber_g}g
                </div>
              </div>
            </div>
          </div>

          {/* Meals for Current Day */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(currentDay.meals || []).map((meal, mealIdx) => (
              <div
                key={meal.meal_id || mealIdx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Meal Header */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #edf2f7',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        color: '#1b4332',
                      }}
                    >
                      {meal.meal_type.replace('_', ' ')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                      }}
                    >
                      🕒 {meal.timing}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#4a5568' }}>
                    <strong>{meal.totals?.calories || 0} kcal</strong> • P: {meal.totals?.protein_g || 0}g • C: {meal.totals?.carbohydrate_g || 0}g • F: {meal.totals?.fat_g || 0}g
                  </div>
                </div>

                {/* Foods list */}
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '0.6rem', fontStyle: 'italic' }}>
                    {meal.meal_summary}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {(meal.foods || []).map((food, foodIdx) => (
                      <div
                        key={food.food_id || foodIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '0.6rem',
                          backgroundColor: '#fcfdfd',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ flex: '1 1 280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1b4332' }}>
                              {food.food_name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ({food.quantity} {food.unit})
                            </span>
                          </div>

                          {/* Preparation Instructions */}
                          {!isEditing ? (
                            <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.25rem', lineHeight: '1.4' }}>
                              🍳 <em>{food.preparation_notes}</em>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.35rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                                value={food.preparation_notes}
                                onChange={(e) => handleItemPrepChange(mealIdx, foodIdx, e.target.value)}
                              />
                            </div>
                          )}

                          {food.ayurvedic_properties && (
                            <div style={{ fontSize: '0.74rem', color: '#0f766e', marginTop: '0.2rem' }}>
                              🌿 {food.ayurvedic_properties}
                            </div>
                          )}
                        </div>

                        {/* Nutrition & Portion Adjustment */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isEditing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <label style={{ fontSize: '0.75rem', color: '#475569' }}>Qty:</label>
                              <input
                                type="number"
                                step="5"
                                min="5"
                                max="800"
                                style={{ width: '60px', padding: '0.25rem', fontSize: '0.78rem', textAlign: 'center' }}
                                value={food.quantity}
                                onChange={(e) => handleItemQuantityChange(mealIdx, foodIdx, e.target.value)}
                              />
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{food.unit}</span>
                            </div>
                          )}

                          <div style={{ textAlign: 'right', minWidth: '80px' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1b4332' }}>
                              {food.calories} kcal
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              P: {food.protein_g}g | C: {food.carbohydrate_g}g
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinical Rationale & Dravyaguna for this day */}
          <div
            style={{
              marginTop: '1.5rem',
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              borderLeft: '4px solid #0f766e',
              fontSize: '0.84rem',
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: 600, color: '#0f766e', marginBottom: '0.25rem' }}>
              Day {currentDay.day_number} Clinical & Dravyaguna Rationale:
            </div>
            <p style={{ margin: 0, color: '#334155' }}>
              {currentDay.clinical_rationale} {currentDay.ayurvedic_notes}
            </p>
          </div>
        </div>
      )}

      {/* 6. Weekly Overview & General Instructions */}
      <div className="grid-2" style={{ gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#1b4332', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🔄</span> Weekly Grain & Pulse Rotation Strategy
          </h4>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: '1.5' }}>
            {activePlan.weekly_overview}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#1b4332', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>💧</span> Dietitian General Instructions & Lifestyle Ahara
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem', color: '#334155', lineHeight: '1.5' }}>
            {(activePlan.general_instructions || []).map((ins, idx) => (
              <li key={idx} style={{ marginBottom: '0.3rem' }}>{ins}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7. Dietitian Clinical Notes & Evidence Citations Toggle */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1b4332' }}>
            Dietitian Clinical Notes
          </h4>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.25rem 0.55rem' }}
            onClick={() => setShowEvidence(!showEvidence)}
          >
            {showEvidence ? 'Hide Evidence Provenance' : '📚 View Evidence Provenance'}
          </button>
        </div>

        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Add clinical observations, consultation follow-up targets, or specific patient adaptations..."
          value={dietitianNotesInput}
          onChange={(e) => setDietitianNotesInput(e.target.value)}
          disabled={isApproved}
        />

        {showEvidence && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #edf2f7', paddingTop: '0.75rem' }}>
            <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#2d6a4f' }}>
              ICMR & Classical Text Citations Traceability:
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(activePlan.evidence_citations || []).map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#e8f5e9',
                    border: '1px solid #c8e6c9',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    color: '#1b4332',
                  }}
                >
                  📄 <strong>{ev.document}</strong> {ev.page ? `(p. ${ev.page})` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 8. Dietitian Sign-off Modal */}
      {approvalModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🔏</div>
            <h3 style={{ textAlign: 'center', color: '#1b4332', margin: '0 0 0.5rem' }}>
              Sign & Approve 7-Day Diet Plan
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#4a5568', textAlign: 'center', marginBottom: '1.25rem' }}>
              This certifies that the diet plan has been clinically reviewed, respects patient allergies and contraindications, and satisfies nutritional requirements.
            </p>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Signing Dietitian Identifier</label>
              <input
                type="text"
                className="form-input"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. Dr. Sharma (Chief Dietitian)"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setApprovalModalOpen(false)}
                disabled={approving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ backgroundColor: '#2d6a4f' }}
                onClick={handleConfirmApproval}
                disabled={approving || !approverName.trim()}
              >
                {approving ? 'Signing...' : '✓ Confirm & Lock Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
