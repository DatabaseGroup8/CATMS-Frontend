import React, { useEffect, useState } from 'react';
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
  const {
    user
  } = useAuth();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get('patient_id') || null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');

  // Wait until the receptionist pauses typing before contacting Django.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // useRemote cancels the previous request when the search term changes.
  const patients = useRemote(endpoints.patients, {
    q: search
  }, search.length >= 2);
  const term = q.trim();
  const ready = term.length >= 2 && term === search;
  return <>
    <PageHeading
      eyebrow="PATIENT MANAGEMENT"
      title="Patient records"
      description="Search registered patients and view their records directly from MySQL."
      actions={user.role === 'Receptionist' && <Button
        icon={Plus}
        onClick={() => setAdding(true)}
      >Register patient</Button>}
    />
    <Notice
      message={note}
      type="success"
      onClose={() => setNote('')}
    />
    <Panel title="Find a patient" subtitle="Patients appear automatically as you type a name or contact number">
      <div className="search-form">
        <div className="search-large">
          <Search size={19} />
          <input
            type="search"
            aria-label="Search patients by name or contact number"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Start typing patient's name or phone number..."
            autoComplete="off"
          />
        </div>
      </div>
      {term.length < 2
        ? <div className="hint-block">Type at least 2 characters to search patients.</div>
        : !ready
          ? <div className="hint-block" role="status">Searching patients...</div>
          : <AsyncBlock loading={patients.loading} error={patients.error}>
            <DataTable rows={patients.data?.data || []} columns={[
              {
                key: 'patient_id',
                label: 'ID'
              },
              {
                key: 'full_name',
                label: 'Patient name'
              },
              {
                key: 'contact_no',
                label: 'Contact'
              },
              {
                key: 'age',
                label: 'Age'
              },
              {
                key: 'action',
                label: '',
                render: r => <Button
                  variant="outline"
                  onClick={() => {
                    setId(r.patient_id);
                    setParams({
                      patient_id: r.patient_id
                    });
                  }}
                >View record</Button>
              }
            ]} />
          </AsyncBlock>}
    </Panel>
    {id && <PatientDetail
      id={id}
      onClose={() => {
        setId(null);
        setParams({});
      }}
    />}
    {adding && <PatientQuickForm
      onClose={() => setAdding(false)}
      onDone={p => {
        setAdding(false);
        setId(p.patient_id);
        setNote('Patient registered successfully');
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
function AddPatientCondition({
  patientId,
  onClose
}) {
  const categories = useRemote(endpoints.conditions),
    [form, setForm] = useState({
      condition_id: '',
      diagnosed_date: new Date().toISOString().slice(0, 10),
      is_chronic: false,
      current_status: 'Active'
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await POST(endpoints.addPatientCondition, {
        ...form,
        patient_id: patientId,
        condition_id: Number(form.condition_id)
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Record diagnosis / condition" onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <Notice message={error} type="error" />
      <Select
        label="Condition"
        required
        value={form.condition_id}
        onChange={e => setForm(s => ({
          ...s,
          condition_id: e.target.value
        }))}
        options={(categories.data?.data || []).map(x => ({
          value: x.condition_id,
          label: x.condition_name
        }))}
      />
      <Input
        label="Diagnosis date"
        required
        type="date"
        value={form.diagnosed_date}
        onChange={e => setForm(s => ({
          ...s,
          diagnosed_date: e.target.value
        }))}
      />
      <label className="check-row"><input
        type="checkbox"
        checked={form.is_chronic}
        onChange={e => setForm(s => ({
          ...s,
          is_chronic: e.target.checked
        }))}
      /> Chronic condition</label>
      <Select
        label="Current status"
        value={form.current_status}
        onChange={e => setForm(s => ({
          ...s,
          current_status: e.target.value
        }))}
        options={['Active', 'Resolved', 'Under Treatment']}
      />
      <div className="form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >Cancel</Button>
        <Button type="submit" loading={busy}>Save condition</Button>
      </div>
    </form>
  </Modal>;
}
