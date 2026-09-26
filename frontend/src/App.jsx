import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PatientSidebar from './components/PatientSidebar';
import NewPatientModal from './components/NewPatientModal';
import AssessmentForm from './components/AssessmentForm';
import ClinicalLabModal from './components/ClinicalLabModal';
import { api } from './services/api';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [activePatient, setActivePatient] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [labRecords, setLabRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  // Modals state
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [editingLabRecord, setEditingLabRecord] = useState(null);

  // Notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load patients
  const loadPatients = async (search = '') => {
    try {
      setLoadingPatients(true);
      const res = await api.getPatients(search);
      const list = res.data?.patients || [];
      setPatients(list);

      // If active patient is still in list, refresh it
      if (activePatient) {
        const refreshed = list.find((p) => p.id === activePatient.id);
        if (refreshed) setActivePatient(refreshed);
      } else if (list.length > 0 && !search) {
        // Auto select first patient
        handleSelectPatient(list[0]);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      showToast('Could not load patient list from backend.', 'error');
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients(searchQuery);
  }, [searchQuery]);

  // Select patient and load latest assessment
  const handleSelectPatient = async (patient) => {
    setActivePatient(patient);
    setActiveAssessment(null);
    setLabRecords([]);

    try {
      setLoadingAssessment(true);
      const res = await api.getPatientAssessments(patient.id);
      const assessments = res.data?.assessments || [];
      if (assessments.length > 0) {
        const latest = assessments[0];
        setActiveAssessment(latest);

        // Fetch lab records for latest assessment
        const labRes = await api.getLabData(latest.id);
        setLabRecords(labRes.data?.labData || []);
      }
    } catch (err) {
      console.error('Error loading patient assessment:', err);
      showToast('Failed to load assessment for selected patient.', 'error');
    } finally {
      setLoadingAssessment(false);
    }
  };

  // Register new patient
  const handlePatientCreated = async (payload) => {
    const res = await api.createPatient(payload);
    const newPat = res.data?.patient;
    showToast(`Patient ${newPat.name} registered (${newPat.patient_code}).`, 'success');
    await loadPatients();
    if (newPat) {
      handleSelectPatient(newPat);
    }
  };

  // Save or Update Assessment
  const handleSaveAssessment = async (payload) => {
    if (!activePatient) return;

    if (activeAssessment && activeAssessment.id) {
      // Update
      const res = await api.updateAssessment(activeAssessment.id, payload);
      const updated = res.data?.assessment;
      setActiveAssessment(updated);
      showToast('Patient assessment successfully updated.', 'success');
      await loadPatients(searchQuery);
    } else {
      // Create
      const res = await api.createAssessment(activePatient.id, payload);
      const created = res.data?.assessment;
      setActiveAssessment(created);
      showToast('New patient assessment successfully created and saved.', 'success');
      await loadPatients(searchQuery);
    }
  };

  // Save Lab Record (Add or Update)
  const handleSaveLabRecord = async (labData) => {
    if (!activeAssessment || !activeAssessment.id) {
      showToast('Please save the patient assessment first.', 'error');
      return;
    }

    try {
      if (editingLabRecord) {
        await api.updateLabData(editingLabRecord.id, labData);
        showToast('Clinical lab test updated.', 'success');
      } else {
        await api.addLabData(activeAssessment.id, labData);
        showToast('Clinical lab test added.', 'success');
      }

      // Refresh lab records
      const labRes = await api.getLabData(activeAssessment.id);
      setLabRecords(labRes.data?.labData || []);
      setEditingLabRecord(null);
    } catch (err) {
      console.error('Error saving lab record:', err);
      showToast(err.message || 'Failed to save lab data record', 'error');
    }
  };

  // Delete Lab Record
  const handleDeleteLabRecord = async (labId) => {
    if (!window.confirm('Are you sure you want to remove this lab test record?')) return;

    try {
      await api.deleteLabData(labId);
      showToast('Clinical record deleted.', 'success');
      setLabRecords((prev) => prev.filter((item) => item.id !== labId));
    } catch (err) {
      console.error('Error deleting lab record:', err);
      showToast(err.message || 'Failed to delete lab record', 'error');
    }
  };

  return (
    <div className="app-container">
      <Header activePatient={activePatient} />

      <div className="workspace-layout">
        {/* Patient Selection Sidebar */}
        <PatientSidebar
          patients={patients}
          activePatient={activePatient}
          onSelectPatient={handleSelectPatient}
          onOpenNewPatientModal={() => setIsNewPatientOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loadingPatients}
        />

        {/* Main Dietitian Assessment Workspace */}
        <main className="main-workspace">
          {toast && (
            <div className={`toast-banner toast-${toast.type}`}>
              <span>{toast.message}</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => setToast(null)}
              >
                &times;
              </button>
            </div>
          )}

          {activePatient ? (
            loadingAssessment ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#788d84' }}>
                Loading clinical and Ayurvedic assessment...
              </div>
            ) : (
              <AssessmentForm
                patient={activePatient}
                existingAssessment={activeAssessment}
                onSaveAssessment={handleSaveAssessment}
                onOpenLabModal={() => {
                  setEditingLabRecord(null);
                  setIsLabModalOpen(true);
                }}
                onEditLabRecord={(item) => {
                  setEditingLabRecord(item);
                  setIsLabModalOpen(true);
                }}
                onDeleteLabRecord={handleDeleteLabRecord}
                labRecords={labRecords}
              />
            )
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: '#0f2d23' }}>
                No Patient Selected
              </h3>
              <p style={{ maxWidth: '420px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                Select an existing patient from the left directory to conduct or review their clinical & Ayurvedic assessment, or register a new patient.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsNewPatientOpen(true)}
              >
                + Register New Patient
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onPatientCreated={handlePatientCreated}
      />

      {/* Clinical Lab Test Modal (Optional Section 9) */}
      <ClinicalLabModal
        isOpen={isLabModalOpen}
        onClose={() => {
          setIsLabModalOpen(false);
          setEditingLabRecord(null);
        }}
        onSave={handleSaveLabRecord}
        initialData={editingLabRecord}
      />
    </div>
  );
}
