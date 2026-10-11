import React, { useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCw, XCircle } from 'lucide-react';
import { POST, endpoints } from '../lib/api';
import { localDate, shortDate } from '../lib/utils';
import {
  AsyncBlock,
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
  Notice,
  Panel,
  Select,
  Textarea,
  useRemote,
} from '../components/UI';

/**
 * Receptionists manage existing appointments in their JWT-authorized branch.
 * A move preserves the appointment ID and issues a fresh queue number.
 * A cancellation changes the status; neither operation deletes appointments.
 */
export default function AppointmentManagement({ day, onMutation }) {
  const [rescheduling, setRescheduling] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const appointments = useRemote(endpoints.manageAppointments, { date: day });
  const rows = appointments.data?.data || [];

  function successful(messageText) {
    setMessage(messageText);
    setError('');
    setRescheduling(null);
    setCancelling(null);
    appointments.refresh();
    onMutation?.();
  }

  return <div className="with-space">
    <Panel
      title="Manage appointments"
      subtitle="Select a visit date to reschedule or cancel Scheduled appointments. Completed and Cancelled visits remain visible for reference."
      actions={<Button icon={RefreshCw} variant="quiet" onClick={appointments.refresh}>Refresh</Button>}
    >
      <Notice type="success" message={message} onClose={() => setMessage('')} />
      <Notice type="error" message={error} onClose={() => setError('')} />
      <AsyncBlock loading={appointments.loading} error={appointments.error} retry={appointments.refresh}>
        <DataTable
          searchable
          rows={rows}
          empty="No appointments recorded for this date in your branch."
          rowClassName={row => row.type === 'EmergencyWalkIn' ? 'emergency-row' : ''}
          columns={[
            { key: 'appointment_id', label: 'ID' },
            { key: 'appointment_number', label: 'Token' },
            { key: 'patient_name', label: 'Patient', render: row => <strong>{row.full_name}</strong> },
            { key: 'doctor_name', label: 'Doctor' },
            { key: 'start_time', label: 'Session', render: row => `${row.start_time}–${row.end_time}` },
            {
              key: 'type', label: 'Type',
              render: row => row.type === 'EmergencyWalkIn'
                ? <span className="emergency-badge"><AlertTriangle size={14} /> Emergency Walk-In</span>
                : row.type || 'General',
            },
            { key: 'status', label: 'Status', render: row => <Badge value={row.status} /> },
            {
              key: 'actions', label: 'Actions',
              render: row => row.status === 'Scheduled'
                ? <div className="actions">
                  <Button variant="outline" icon={CalendarClock} onClick={() => setRescheduling(row)}>
                    Reschedule
                  </Button>
                  <Button variant="outline" className="appointment-action-danger" icon={XCircle} onClick={() => setCancelling(row)}>
                    Cancel
                  </Button>
                </div>
                : <span className="muted-text">No changes available</span>,
            },
          ]}
        />
      </AsyncBlock>
    </Panel>

    {rescheduling && <RescheduleAppointment
      appointment={rescheduling}
      onClose={() => setRescheduling(null)}
      onDone={result => successful(`Appointment #${rescheduling.appointment_id} rescheduled. New queue token #${result.token_number}.`)}
    />}
    {cancelling && <CancelAppointment
      appointment={cancelling}
      onClose={() => setCancelling(null)}
      onDone={() => successful(`Appointment #${cancelling.appointment_id} cancelled. It remains in the database for reporting.`)}
    />}
  </div>;
}

function AppointmentSummary({ appointment }) {
  return <div className="appointment-change-summary">
    <div>
      <strong>{appointment.full_name}</strong>
      <small>Appointment #{appointment.appointment_id} · Token #{appointment.appointment_number}</small>
    </div>
    <div>
      <strong>{appointment.doctor_name}</strong>
      <small>{shortDate(appointment.available_date)} · {appointment.start_time}–{appointment.end_time}</small>
    </div>
    {appointment.type === 'EmergencyWalkIn' && <span className="emergency-badge">
      <AlertTriangle size={14} /> Emergency Walk-In
    </span>}
  </div>;
}

function RescheduleAppointment({ appointment, onClose, onDone }) {
  const [date, setDate] = useState(
    appointment.available_date >= localDate() ? appointment.available_date : localDate()
  );
  const [slotId, setSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sessions = useRemote(endpoints.schedule, { date }, Boolean(date));
  const options = (sessions.data?.data || [])
    .filter(slot => slot.available && Number(slot.time_slot_id) !== Number(appointment.time_slot_id))
    .map(slot => ({
      value: slot.time_slot_id,
      label: `${slot.doctor_name} · ${slot.start_time}–${slot.end_time} · ${slot.booked_count} scheduled`,
    }));

  async function submit(event) {
    event.preventDefault();
    if (!slotId) {
      setError('Select an available, different time slot.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await POST(endpoints.rescheduleAppointment(appointment.appointment_id), {
        new_time_slot_id: Number(slotId),
        reason: reason.trim(),
      });
      onDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Reschedule appointment" onClose={onClose} wide>
    <AppointmentSummary appointment={appointment} />
    <Notice type="error" message={error} />
    <form className="stack" onSubmit={submit}>
      <Input
        label="New appointment date"
        type="date"
        min={localDate()}
        value={date}
        required
        onChange={event => {
          setDate(event.target.value);
          setSlotId('');
        }}
      />
      <AsyncBlock loading={sessions.loading} error={sessions.error} retry={sessions.refresh}>
        {options.length > 0
          ? <Select
            label="Available doctor / time slot"
            required
            value={slotId}
            onChange={event => setSlotId(event.target.value)}
            placeholder="Choose a new doctor session"
            options={options}
          />
          : <div className="appointment-change-hint">
            No other open sessions on {shortDate(date)}. Choose another date or create an available time slot first.
          </div>}
      </AsyncBlock>
      <Textarea
        label="Reason (optional)"
        rows={2}
        maxLength={500}
        placeholder="Patient requested a different date..."
        value={reason}
        onChange={event => setReason(event.target.value)}
      />
      <p className="appointment-change-hint">
        The appointment ID, patient, and visit type will be preserved. A new queue token will be assigned in the selected session.
      </p>
      <div className="form-footer">
        <Button type="button" variant="outline" onClick={onClose}>Back</Button>
        <Button type="submit" loading={busy} disabled={!slotId || sessions.loading || Boolean(sessions.error)}>
          Confirm reschedule
        </Button>
      </div>
    </form>
  </Modal>;
}

function CancelAppointment({ appointment, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.cancelAppointment(appointment.appointment_id), {
        reason: reason.trim(),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Cancel appointment" onClose={onClose}>
    <AppointmentSummary appointment={appointment} />
    <div className="appointment-cancel-warning">
      <AlertTriangle size={18} /> This will mark the visit as Cancelled. It cannot be completed or billed afterward.
    </div>
    <Notice type="error" message={error} />
    <form onSubmit={submit} className="stack">
      <Textarea
        label="Cancellation reason"
        required
        minLength={3}
        maxLength={500}
        placeholder="Patient unavailable, requested cancellation..."
        rows={3}
        value={reason}
        onChange={event => setReason(event.target.value)}
      />
      <div className="form-footer">
        <Button type="button" variant="outline" onClick={onClose}>Keep appointment</Button>
        <Button type="submit" className="appointment-danger-confirm" icon={XCircle} loading={busy}
          disabled={reason.trim().length < 3}>
          Confirm cancellation
        </Button>
      </div>
    </form>
  </Modal>;
}
