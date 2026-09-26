import React from 'react';

export default function Header({ activePatient }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="top-header">
      <div className="brand-section">
        <div className="brand-logo-mark">A</div>
        <div>
          <div className="brand-title">
            AyurDiet
            <span className="brand-subtitle">Dietitian Portal</span>
          </div>
        </div>
      </div>

      <div className="header-meta">
        {activePatient && (
          <div style={{ fontSize: '0.85rem', color: '#ecd0a2', fontWeight: 500 }}>
            Active: <strong>{activePatient.name}</strong> ({activePatient.patient_code})
          </div>
        )}
        <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{today}</div>
        <div className="dietitian-badge">
          <span className="dietitian-dot" />
          <span>Dietitian Workspace</span>
        </div>
      </div>
    </header>
  );
}
