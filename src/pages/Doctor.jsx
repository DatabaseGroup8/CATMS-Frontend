import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, RefreshCw, Stethoscope } from 'lucide-react';
import { GET, POST, endpoints } from '../lib/api';
import { localDate } from '../lib/utils';
import { PageHeading, Panel, Input, Button, Notice, DataTable, Badge, AsyncBlock, useRemote } from '../components/UI';
import { useNavigate } from 'react-router-dom';
export default function Doctor() {
  const [date, setDate] = useState(localDate()),
    [consultationId, setConsultationId] = useState(''),
    [consultation, setConsultation] = useState(null),
    [lookupBusy, setLookupBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(null);
  const nav = useNavigate();
  const appointments = useRemote(endpoints.doctorAppointments, {
    date
  });
  useEffect(() => {
    const timer = window.setInterval(() => appointments.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [date]);
  const rows = appointments.data?.appointments || [];
  async function lookup(e) {
    e.preventDefault();
    setLookupBusy(true);
    setError('');
    setConsultation(null);
    try {
      const response = await GET(endpoints.consultationSummary, {
        consultation_rec_id: Number(consultationId)
      });
      setConsultation(response.consultation);
    } catch (e) {
      setError(e.message);
    } finally {
      setLookupBusy(false);
    }
  }
  async function complete(r) {
    if (!window.confirm(`Mark appointment #${r.appointment_id} for ${r.patient_name} as completed?`)) return;
    setBusy(r.appointment_id);
    setError('');
    try {
      await POST(endpoints.complete(r.appointment_id), {});
      setMessage('Appointment marked completed. Reception can now finalize the consultation and invoice.');
      appointments.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  return <>
    <PageHeading
      eyebrow="DOCTOR WORKSPACE"
      title="My appointments"
      description="View your patient queue, inspect clinical history and complete consultations."
      actions={<>
        <input
          className="input inline-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <Button
          icon={RefreshCw}
          variant="outline"
          onClick={appointments.refresh}
        >Refresh</Button>
      </>}
    />
    <Notice
      type="success"
      message={message}
      onClose={() => setMessage('')}
    />
    <Notice
      type="error"
      message={error}
      onClose={() => setError('')}
    />
    <div className="mini-overview">
      <div><Stethoscope size={19} /> My appointments <strong>
        {rows.length}
      </strong></div>
      <div><CheckCircle2 size={19} /> Completed <strong>
        {rows.filter(r => r.status === 'Completed').length}
      </strong></div>
      <div><CalendarDays size={19} /> Scheduled <strong>
        {rows.filter(r => r.status === 'Scheduled').length}
      </strong></div>
      <div className="emergency-stat"><AlertTriangle size={19} /> Emergency <strong>
        {rows.filter(r => r.type === 'EmergencyWalkIn' && r.status === 'Scheduled').length}
      </strong></div>
    </div>
    <Panel title="Patient queue" subtitle="Only appointments assigned to your account are shown">
      <AsyncBlock loading={appointments.loading} error={appointments.error}>
        <DataTable
          rows={rows}
          rowClassName={r => r.type === 'EmergencyWalkIn' ? 'emergency-row' : ''}
          columns={[
            {
              key: 'appointment_number',
              label: 'Token'
            },
            {
              key: 'patient_name',
              label: 'Patient',
              render: r => <strong>
                {r.patient_name}
              </strong>
            },
            {
              key: 'type',
              label: 'Visit type',
              render: r => r.type === 'EmergencyWalkIn'
                ? <span className="emergency-badge"><AlertTriangle size={14} /> EMERGENCY WALK-IN</span>
                : r.type
            },
            {
              key: 'start_time',
              label: 'Session'
            },
            {
              key: 'status',
              label: 'Status',
              render: r => <Badge value={r.status} />
            },
            {
              key: 'actions',
              label: 'Actions',
              render: r => <div className="actions">
                <Button
                  variant="outline"
                  onClick={() => nav('/app/patients?patient_id=' + r.patient_id)}
                >Patient records</Button>
                {r.status === 'Scheduled' && <Button
                  disabled={busy !== null}
                  loading={busy === r.appointment_id}
                  onClick={() => complete(r)}
                >Complete</Button>}
              </div>
            }
          ]}
        />
      </AsyncBlock>
    </Panel>
    <div className="with-space">
      <Panel title="Consultation summary lookup" subtitle="Retrieve a consultation assigned to you using its record ID">
        <form className="filter-bar" onSubmit={lookup}>
          <Input
            label="Consultation record ID"
            type="number"
            min="1"
            required
            value={consultationId}
            onChange={e => setConsultationId(e.target.value)}
          />
          <Button type="submit" loading={lookupBusy}>Find consultation</Button>
        </form>
        {consultation && <div className="details-grid">
          {Object.entries(consultation).map(([k, v]) => <div className="detail" key={k}>
            <small>
              {k.replaceAll('_', ' ')}
            </small>
            <strong>
              {String(v ?? '—')}
            </strong>
          </div>)}
        </div>}
      </Panel>
    </div>
  </>;
}
