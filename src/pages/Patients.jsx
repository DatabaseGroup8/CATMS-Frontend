import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, UserRound } from 'lucide-react';
import { GET, POST, endpoints } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  PageHeading,
  Panel,
  Input,
  Button,
  Notice,
  DataTable,
  Modal,
  Field,
  Select,
  Textarea,
  AsyncBlock,
  useRemote,
} from '../components/UI';
import { PatientQuickForm } from './Scheduling';
import { shortDate, str } from '../lib/utils';
export default function Patients() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get('patient_id') || null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');

  // Fetch even when the search is empty: this shows all accessible patients
  // alphabetically as soon as the page opens. Debounce typed searches.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const patients = useRemote(endpoints.patients, { q: search, page });
  const ready = q.trim() === search;
  const rows = patients.data?.data || [];
  const pages = patients.data?.total_pages ?? 1;

  return <>
    <PageHeading
      eyebrow="PATIENT MANAGEMENT"
      title="Patient records"
      description="Browse registered patients alphabetically or find someone instantly by name, contact number or NIC."
      actions={user.role === 'Receptionist' && <Button
        icon={Plus}
        onClick={() => setAdding(true)}
      >Register patient</Button>}
    />
    <Notice message={note} type="success" onClose={() => setNote('')} />
    <section className="panel">
      <div className="panel-body">
      <div className="search-form">
        <div className="search-large">
          <Search size={19} />
          <input
            type="search"
            aria-label="Filter patients by name, phone number or NIC"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by patient name, phone number or NIC (optional)..."
            autoComplete="off"
          />
        </div>
      </div>

      {!ready
        ? <div className="hint-block" role="status">Updating patient list...</div>
        : <AsyncBlock
            loading={patients.loading}
            error={patients.error}
            retry={patients.refresh}
          >
            <DataTable
              rows={rows}
              empty={q.trim() ? 'No matching patients. Try another name or phone number.' : 'No registered patients found.'}
              columns={[
                { key: 'patient_id', label: 'ID' },
                { key: 'full_name', label: 'Patient name' },
                { key: 'contact_no', label: 'Contact' },
                { key: 'age', label: 'Age' },
                {
                  key: 'action',
                  label: '',
                  render: patient => <Button
                    variant="outline"
                    onClick={() => {
                      setId(patient.patient_id);
                      setParams({ patient_id: patient.patient_id });
                    }}
                  >View record</Button>
                }
              ]}
            />
            {pages > 1 && <div className="form-footer" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >Previous results</Button>
              <span>Results batch {page} of {pages}</span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage(p => Math.min(pages, p + 1))}
              >Next results</Button>
            </div>}
          </AsyncBlock>
      }
      </div>
    </section>

    {id && <PatientDetail id={id} onClose={() => {
      setId(null);
      setParams({});
    }} />}
    {adding && <PatientQuickForm
      onClose={() => setAdding(false)}
      onDone={patient => {
        setAdding(false);
        setId(patient.patient_id);
        setNote('Patient registered successfully');
        patients.refresh();
      }}
    />}
  </>;
}

function PatientDetail({
  id,
  onClose
}) {
  const {
    user
  } = useAuth();
  const profile = useRemote(endpoints.patient(id));
  const appointments = useRemote(endpoints.patientAppointments, {
    patient_id: id
  });
  const history = useRemote(endpoints.history(id), {}, user.role === 'Doctor');
  const record = profile.data?.data || {};
  const [conditionOpen, setConditionOpen] = useState(false);
  return <Modal
    wide
    title={`Patient record #${id}`}
    onClose={onClose}
  >
    <AsyncBlock loading={profile.loading} error={profile.error}>
      <div className="details-grid">
        {[
          ['Full name', record.full_name],
          ['Contact', record.contact_no],
          ['NIC', record.NIC],
          ['Gender', record.gender],
          ['Date of birth', record.DOB],
          ['Age', record.age],
          ['Registered branch', record.registered_branch_id]
        ].map(([k, v]) => <div className="detail" key={k}>
          <small>
            {k}
          </small>
          <strong>
            {str(v)}
          </strong>
        </div>)}
      </div>
    </AsyncBlock>
    <div className="section-title with-space">Appointment history</div>
    <AsyncBlock loading={appointments.loading} error={appointments.error}>
      <pre
        className="json-fallback"
        style={{
          display: 'none'
        }}
      >
        {JSON.stringify(appointments.data)}
      </pre>
      <DataTable rows={appointments.data?.data || appointments.data?.appointments || []} columns={[
        {
          key: 'appointment_id',
          label: 'Appointment'
        },
        {
          key: 'date',
          label: 'Date',
          render: r => str(r.available_date || r.date || r.appointment_date)
        },
        {
          key: 'status',
          label: 'Status'
        },
        {
          key: 'type',
          label: 'Type'
        }
      ]} />
    </AsyncBlock>
    {user.role === 'Doctor' && <>
      <div className="section-title with-space">Clinical history</div>
      <AsyncBlock loading={history.loading} error={history.error}>
        <DataTable rows={history.data?.data || []} columns={[
          {
            key: 'date',
            label: 'Date'
          },
          {
            key: 'chief_complaint',
            label: 'Complaint'
          },
          {
            key: 'symptoms',
            label: 'Symptoms'
          },
          {
            key: 'diagnoses',
            label: 'Diagnosis'
          }
        ]} />
      </AsyncBlock>
      <Button
        variant="outline"
        onClick={() => setConditionOpen(true)}
      >Record patient condition</Button>
      {conditionOpen && <AddPatientCondition
        patientId={id}
        onClose={() => setConditionOpen(false)}
      />}
    </>}
  </Modal>;
}
function AddPatientCondition({ patientId, onClose, onSaved }) {
  const categories = useRemote(endpoints.conditions);
  const nextId = useRef(1);
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);

  const newCondition = (uiId) => ({
    uiId,
    condition_id: '',
    diagnosed_date: today,
    is_chronic: false,
    current_status: 'Active',
    saved: false
  });

  const [conditions, setConditions] = useState(() => [newCondition(0)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const conditionOptions = (categories.data?.data || []).map(item => ({
    value: item.condition_id,
    label: item.condition_name
  }));

  function updateCondition(uiId, field, value) {
    setConditions(previous => previous.map(item =>
      item.uiId === uiId && !item.saved
        ? { ...item, [field]: value }
        : item
    ));
  }

  function addAnother() {
    setConditions(previous => [...previous, newCondition(nextId.current++)]);
    setError('');
  }

  function removeCondition(uiId) {
    setConditions(previous => previous.filter(item => item.uiId !== uiId));
  }

  async function submitAll(event) {
    event.preventDefault();
    if (busy) return;
    setError('');

    // A patient can have many different diagnoses, but the same diagnosis
    // should not be submitted twice for the same date.
    const submittedKeys = new Set();
    for (const item of conditions) {
      if (!item.condition_id || !item.diagnosed_date) {
        setError('Select a condition and diagnosis date for every row.');
        return;
      }
      const key = `${item.condition_id}|${item.diagnosed_date}`;
      if (submittedKeys.has(key)) {
        setError('The same condition and diagnosis date are entered more than once.');
        return;
      }
      submittedKeys.add(key);
    }

    const pending = conditions.filter(item => !item.saved);
    if (pending.length === 0) {
      onClose();
      return;
    }

    setBusy(true);
    let completed = 0;
    try {
      // The current endpoint accepts ONE condition per request.
      // Send requests in sequence; each one calls AddPatientCondition in MySQL.
      for (const item of pending) {
        await POST(endpoints.addPatientCondition, {
          patient_id: Number(patientId),
          condition_id: Number(item.condition_id),
          diagnosed_date: item.diagnosed_date,
          is_chronic: item.is_chronic,
          current_status: item.current_status
        });
        completed += 1;
        setSavedCount(previous => previous + 1);
        setConditions(previous => previous.map(row =>
          row.uiId === item.uiId ? { ...row, saved: true } : row
        ));
      }
      onSaved?.(savedCount + completed);
      onClose();
    } catch (err) {
      setError(
        `Unable to save all conditions: ${err.message}. ` +
        (completed ? `${completed} condition(s) saved in this attempt. ` : '') +
        'Rows marked Saved have already been committed; retry only the remaining rows.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Record diagnoses / conditions" onClose={onClose} wide>
      <form onSubmit={submitAll} className="stack">
        <p style={{ margin: 0, color: 'var(--muted, #64748b)' }}>
          Record several conditions for this patient in one form. Each row is
          saved as its own patient-condition record.
        </p>
        <Notice message={error} type="error" onClose={() => setError('')} />
        {conditions.map((item, index) => (
          <div
            key={item.uiId}
            style={{ border: '1px solid #dce6ed', borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
              <strong>Condition {index + 1}</strong>
              {item.saved ? (
                <span style={{ color: '#0d947d', fontWeight: 700 }}>Saved</span>
              ) : conditions.length > 1 ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => removeCondition(item.uiId)}>
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="stack">
              <Select
                label="Condition"
                required
                disabled={busy || item.saved}
                value={item.condition_id}
                onChange={e => updateCondition(item.uiId, 'condition_id', e.target.value)}
                options={conditionOptions}
              />
              <Input
                label="Diagnosis date"
                required
                type="date"
                disabled={busy || item.saved}
                value={item.diagnosed_date}
                onChange={e => updateCondition(item.uiId, 'diagnosed_date', e.target.value)}
              />
              <label className="check-row">
                <input
                  type="checkbox"
                  disabled={busy || item.saved}
                  checked={item.is_chronic}
                  onChange={e => updateCondition(item.uiId, 'is_chronic', e.target.checked)}
                />
                Chronic condition
              </label>
              <Select
                label="Current status"
                disabled={busy || item.saved}
                value={item.current_status}
                onChange={e => updateCondition(item.uiId, 'current_status', e.target.value)}
                options={['Active', 'Resolved', 'Under Treatment']}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" disabled={busy} onClick={addAnother}>
          + Add another condition
        </Button>
        <div className="form-footer">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={busy} disabled={!conditions.some(item => !item.saved)}>
            Save all conditions
          </Button>
        </div>
      </form>
    </Modal>
  );
}
