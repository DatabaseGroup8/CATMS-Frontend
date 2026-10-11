import React, { useState } from 'react';
import { AlertTriangle, CalendarDays, Plus, RefreshCw, Ticket, UserPlus, ToggleRight } from 'lucide-react';
import { GET, POST, PATCH, endpoints } from '../lib/api';
import { localDate, shortDate } from '../lib/utils';
import AppointmentManagement from './AppointmentManagement';
import {
  PageHeading,
  Panel,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  DataTable,
  Badge,
  Modal,
  Notice,
  AsyncBlock,
  useRemote,
} from '../components/UI';
export default function Scheduling() {
  const [day, setDay] = useState(localDate());
  const [slotModal, setSlotModal] = useState(false);
  const [booking, setBooking] = useState(null);
  const [emergencySlot, setEmergencySlot] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [managementVersion, setManagementVersion] = useState(0);
  const schedule = useRemote(endpoints.schedule, {
    date: day
  });
  const doctors = useRemote(endpoints.doctors);
  const sessions = schedule.data?.data || [];
  async function toggle(slot) {
    setBusy(true);
    setError('');
    try {
      await PATCH(endpoints.availability(slot.time_slot_id), {
        available: !slot.available
      });
      setNotice(`Session ${!slot.available ? 'opened' : 'closed'} successfully.`);
      schedule.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <>
    <PageHeading
      eyebrow="RECEPTION · SCHEDULING"
      title="Appointments & time slots"
      description="Book patients into available sessions and manage each doctor's daily availability."
      actions={<Button
        icon={Plus}
        onClick={() => setSlotModal(true)}
      >Create time slot</Button>}
    />
    <Notice
      message={notice}
      type="success"
      onClose={() => setNotice('')}
    />
    <Notice
      message={error}
      type="error"
      onClose={() => setError('')}
    />
    <Panel
      title="Daily sessions"
      subtitle="There is no patient limit per available session; booking uses queue numbers."
      actions={<>
        <input
          aria-label="Schedule date"
          className="input inline-date"
          type="date"
          value={day}
          onChange={e => setDay(e.target.value)}
        />
        <Button
          icon={RefreshCw}
          variant="quiet"
          onClick={schedule.refresh}
        >Refresh</Button>
      </>}
    >
      <AsyncBlock
        loading={schedule.loading}
        error={schedule.error}
        retry={schedule.refresh}
      >
        <DataTable rows={sessions} columns={[
          {
            key: 'doctor_name',
            label: 'Doctor'
          },
          {
            key: 'specialty',
            label: 'Specialty'
          },
          {
            key: 'time',
            label: 'Session',
            render: r => <span>{r.start_time} – {r.end_time}</span>
          },
          {
            key: 'booked_count',
            label: 'Queue count'
          },
          {
            key: 'available',
            label: 'Availability',
            render: r => <Badge
              value={r.available ? 'Open' : 'Closed'}
            />
          },
          {
            key: 'actions',
            label: 'Actions',
            render: r => <div className="actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => toggle(r)}
              >
                {r.available ? 'Close' : 'Reopen'}
              </Button>
              <Button
                variant="primary"
                disabled={!r.available}
                onClick={() => setBooking(r)}
              >Book patient</Button>
              <Button
                variant="outline"
                className="btn-emergency"
                icon={AlertTriangle}
                disabled={!r.available || r.date !== localDate()}
                onClick={() => setEmergencySlot(r)}
              >Emergency Walk-In</Button>
            </div>
          }
        ]} />
      </AsyncBlock>
    </Panel>
    <AppointmentManagement
      key={`${day}-${managementVersion}`}
      day={day}
      onMutation={() => schedule.refresh()}
    />
    {slotModal && <SlotForm
      doctors={doctors.data?.data || []}
      onClose={() => setSlotModal(false)}
      onDone={() => {
        setSlotModal(false);
        schedule.refresh();
        setNotice('Time slot created.');
      }}
    />}
    {booking && <BookingForm
      slot={booking}
      onClose={() => setBooking(null)}
      onDone={token => {
        setBooking(null);
        schedule.refresh();
        setManagementVersion(version => version + 1);
        setNotice(`Appointment booked successfully. Queue token #${token}.`);
      }}
    />}
    {emergencySlot && <BookingForm
      emergency
      slot={emergencySlot}
      onClose={() => setEmergencySlot(null)}
      onDone={token => {
        setEmergencySlot(null);
        schedule.refresh();
        setManagementVersion(version => version + 1);
        setNotice(`Emergency Walk-In recorded successfully. Queue token #${token}. The doctor will see it on refresh.`);
      }}
    />}
  </>;
}
function SlotForm({
  doctors,
  onClose,
  onDone
}) {
  const [form, setForm] = useState({
    doctor_id: '',
    available_date: localDate(),
    start_time: '09:00',
    end_time: '12:00',
    available: true
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ch = (name, value) => setForm(s => ({
    ...s,
    [name]: value
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.createSlot, {
        ...form,
        doctor_id: Number(form.doctor_id)
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Create doctor time slot" onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <Notice message={error} type="error" />
      <Select
        label="Doctor"
        required
        value={form.doctor_id}
        onChange={e => ch('doctor_id', e.target.value)}
        options={doctors.map(d => ({
          value: d.doctor_id,
          label: d.full_name + ' · ' + d.specializations
        }))}
      />
      <Input
        label="Session date"
        type="date"
        min={localDate()}
        required
        value={form.available_date}
        onChange={e => ch('available_date', e.target.value)}
      />
      <div className="form-grid">
        <Input
          label="Start time"
          type="time"
          required
          value={form.start_time}
          onChange={e => ch('start_time', e.target.value)}
        />
        <Input
          label="End time"
          type="time"
          required
          value={form.end_time}
          onChange={e => ch('end_time', e.target.value)}
        />
      </div>
      <label className="check-row"><input
        type="checkbox"
        checked={form.available}
        onChange={e => ch('available', e.target.checked)}
      /> Available for patient bookings</label>
      <div className="form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >Cancel</Button>
        <Button loading={busy} type="submit">Create slot</Button>
      </div>
    </form>
  </Modal>;
}
function BookingForm({
  slot,
  onClose,
  onDone,
  emergency = false
}) {
  const [query, setQuery] = useState('');
  const patients = useRemote(endpoints.patients, {
    q: query
  }, query.trim().length >= 2);
  const [selected, setSelected] = useState(null);
  const [register, setRegister] = useState(false);
  const [type, setType] = useState('General');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!selected) {
      setError('Select or register a patient first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await POST(endpoints.book, {
        patient_id: selected.patient_id,
        time_slot_id: slot.time_slot_id,
        type: emergency ? 'EmergencyWalkIn' : type,
        notes
      });
      onDone(result.token_number);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    title={emergency ? 'Record Emergency Walk-In' : 'Book an appointment'}
    onClose={onClose}
    wide
  >
    {emergency && <div className="emergency-notice">
      <AlertTriangle size={19} />
      <span>Patient care comes first. Use this form after the patient has been directed to the doctor. Record today's attending-doctor session and patient details without delaying treatment.</span>
    </div>}
    <div className={'context-strip ' + (emergency ? 'emergency-context' : '')}>
      <CalendarDays size={18} />
      <span><strong>
        {slot.doctor_name}
      </strong> · {shortDate(slot.date)} · {slot.start_time}–{slot.end_time}</span>
      <Badge value="Open" />
    </div>
    <Notice message={error} type="error" />
    <form onSubmit={submit} className="stack">
      <div className="section-title">1. Select patient</div>
      {selected
        ? <div className="selected-record">
          <div>
            <strong>
              {selected.full_name}
            </strong>
            <small>{selected.contact_no || 'No phone'} · Patient #{selected.patient_id}</small>
          </div>
          <Button
            variant="quiet"
            type="button"
            onClick={() => setSelected(null)}
          >Change</Button>
        </div>
        : <>
          <Input
            label="Search by name, contact number or NIC"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter at least 2 characters"
          />
          <div className="patient-results">
            {(patients.data?.data || []).map(p => <button
              type="button"
              key={p.patient_id}
              onClick={() => setSelected(p)}
            >
              <strong>
                {p.full_name}
              </strong>
              <span>{p.contact_no || 'No phone'}{p.NIC ? ' · NIC ' + p.NIC : ''} · #{p.patient_id}</span>
            </button>)}
          </div>
          <Button
            variant="quiet"
            icon={UserPlus}
            type="button"
            onClick={() => setRegister(true)}
          >Register a new patient</Button>
        </>}
      <div className="section-title">2. Appointment details</div>
      {emergency
        ? <div className="emergency-type"><AlertTriangle size={16} /> Appointment type: <strong>EmergencyWalkIn</strong> (assigned automatically)</div>
        : <Select
          label="Appointment type"
          value={type}
          onChange={e => setType(e.target.value)}
          options={['General', 'FollowUp', 'Consultation'].map(v => ({
            value: v,
            label: v
          }))}
        />}
      <Textarea
        label="Notes (optional)"
        rows={3}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >Cancel</Button>
        <Button
          className={emergency ? 'btn-emergency-primary' : ''}
          type="submit"
          loading={busy}
        >
          {emergency ? 'Record Emergency Walk-In' : 'Confirm appointment'}
        </Button>
      </div>
    </form>
    {register && <PatientQuickForm
      onClose={() => setRegister(false)}
      onDone={p => {
        setSelected(p);
        setRegister(false);
      }}
    />}
  </Modal>;
}
export function PatientQuickForm({
  onClose,
  onDone
}) {
  const [form, setForm] = useState({
    full_name: '',
    contact_no: '',
    NIC: '',
    gender: '',
    DOB: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (n, v) => setForm(s => ({
    ...s,
    [n]: v
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await POST(endpoints.registerPatient, form);
      onDone(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Quick patient registration" onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <Notice type="error" message={error} />
      <Input
        label="Full name"
        required
        value={form.full_name}
        onChange={e => change('full_name', e.target.value)}
      />
      <div className="form-grid">
        <Input
          label="Contact number"
          value={form.contact_no}
          onChange={e => change('contact_no', e.target.value)}
        />
        <Input
          label="NIC"
          value={form.NIC}
          onChange={e => change('NIC', e.target.value)}
        />
      </div>
      <div className="form-grid">
        <Select
          label="Gender"
          value={form.gender}
          onChange={e => change('gender', e.target.value)}
          options={['Male', 'Female', 'Other']}
        />
        <Input
          label="Date of birth"
          required
          type="date"
          max={localDate()}
          value={form.DOB}
          onChange={e => change('DOB', e.target.value)}
        />
      </div>
      <div className="form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >Cancel</Button>
        <Button loading={busy} type="submit">Register patient</Button>
      </div>
    </form>
  </Modal>;
}
