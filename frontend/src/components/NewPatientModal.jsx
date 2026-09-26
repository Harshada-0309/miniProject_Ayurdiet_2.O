import React, { useState } from 'react';

export default function NewPatientModal({ isOpen, onClose, onPatientCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'male',
    occupation: '',
    phone: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Patient name must be at least 2 characters long.');
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      setError('Please enter a valid age between 0 and 130.');
      return;
    }

    try {
      setSubmitting(true);
      await onPatientCreated({
        name: formData.name.trim(),
        age: ageNum,
        sex: formData.sex,
        occupation: formData.occupation.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create patient record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Register New Patient</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="toast-banner toast-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Aarav Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Age <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  max="130"
                  className="form-input"
                  placeholder="e.g. 34"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Sex <span className="required">*</span>
                </label>
                <select
                  name="sex"
                  className="form-select"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Occupation</label>
              <input
                type="text"
                name="occupation"
                className="form-input"
                placeholder="e.g. Software Engineer / Teacher"
                value={formData.occupation}
                onChange={handleChange}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="patient@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
