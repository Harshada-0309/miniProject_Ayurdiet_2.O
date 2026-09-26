import React, { useState, useEffect } from 'react';

export default function ClinicalLabModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    test_name: '',
    value: '',
    unit: '',
    reference_range: '',
    test_date: new Date().toISOString().split('T')[0],
    source_laboratory: '',
    reported_flag: 'normal',
    report_file_metadata: null,
  });
  const [simulatedFile, setSimulatedFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        test_name: initialData.test_name || '',
        value: initialData.value || '',
        unit: initialData.unit || '',
        reference_range: initialData.reference_range || '',
        test_date: initialData.test_date ? initialData.test_date.split('T')[0] : new Date().toISOString().split('T')[0],
        source_laboratory: initialData.source_laboratory || '',
        reported_flag: initialData.reported_flag || 'normal',
        report_file_metadata: initialData.report_file_metadata || null,
      });
      if (initialData.report_file_metadata) {
        setSimulatedFile(initialData.report_file_metadata.fileName);
      }
    } else {
      setFormData({
        test_name: '',
        value: '',
        unit: '',
        reference_range: '',
        test_date: new Date().toISOString().split('T')[0],
        source_laboratory: '',
        reported_flag: 'normal',
        report_file_metadata: null,
      });
      setSimulatedFile(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSimulateFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSimulatedFile(file.name);
      setFormData((prev) => ({
        ...prev,
        report_file_metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          uploadDate: new Date().toISOString(),
        },
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.test_name.trim()) {
      setError('Test name is required.');
      return;
    }
    if (!formData.value.trim()) {
      setError('Test value is required.');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>{initialData ? 'Edit Clinical / Lab Test' : 'Add Clinical / Lab Test (Optional)'}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="toast-banner toast-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">
                Test Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="test_name"
                className="form-input"
                placeholder="e.g. Fasting Blood Glucose, HbA1c, Serum Lipid"
                value={formData.test_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">
                  Observed Value <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="value"
                  className="form-input"
                  placeholder="e.g. 115"
                  value={formData.value}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  name="unit"
                  className="form-input"
                  placeholder="e.g. mg/dL, %"
                  value={formData.unit}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reference Range</label>
                <input
                  type="text"
                  name="reference_range"
                  className="form-input"
                  placeholder="e.g. 70 - 99"
                  value={formData.reference_range}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Test Date</label>
                <input
                  type="date"
                  name="test_date"
                  className="form-input"
                  value={formData.test_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Source Laboratory</label>
                <input
                  type="text"
                  name="source_laboratory"
                  className="form-input"
                  placeholder="e.g. Metropolis Lab"
                  value={formData.source_laboratory}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reported Status</label>
                <select
                  name="reported_flag"
                  className="form-select"
                  value={formData.reported_flag}
                  onChange={handleChange}
                >
                  <option value="normal">Normal</option>
                  <option value="abnormal">Abnormal / Borderline</option>
                  <option value="critical">Critical High / Low</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Upload Report File Metadata (PDF / JPG / PNG)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="form-input"
                onChange={handleSimulateFileUpload}
                style={{ padding: '0.45rem' }}
              />
              {simulatedFile && (
                <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.2rem' }}>
                  ✓ Attached file: <strong>{simulatedFile}</strong>
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#788d84' }}>
                Note: In Phase 2, this securely stores structured report metadata. OCR & automated interpretation will be added in future phases.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Update Test' : 'Add Test Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
