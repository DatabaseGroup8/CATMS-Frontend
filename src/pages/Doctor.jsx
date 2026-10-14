import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, RefreshCw, Stethoscope } from 'lucide-react';
import { GET, POST, endpoints } from '../lib/api';
import { localDate } from '../lib/utils';
import { PageHeading, Panel, Input, Button, Notice, DataTable, Badge, AsyncBlock, useRemote } from '../components/UI';
import { useNavigate } from 'react-router-dom';
export default function Doctor() {
  const [date, setDate] = useState(localDate()),
    [nameQuery, setNameQuery] = useState(''),
    [consultationChoices, setConsultationChoices] = useState([]),
    [searchBusy, setSearchBusy] = useState(false),
    [searchError, setSearchError] = useState(''),
    [selectedConsultation, setSelectedConsultation] = useState(null),
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
  // Load the authenticated doctor's finalized consultations as the name changes.
  // Abort superseded searches so delayed responses cannot replace newer results.
  useEffect(() => {
    const query = nameQuery.trim();
    setConsultation(null);
    setSelectedConsultation(null);
    setSearchError('');
    if (query.length < 2) {
      setConsultationChoices([]);
      setSearchBusy(false);
      return;
    }
    const controller = new AbortController();
    setConsultationChoices([]);
    setSearchBusy(true);
    const timer = window.setTimeout(() => {
      GET(endpoints.consultationSearch, { q: query }, { signal: controller.signal })
        .then(response => setConsultationChoices(response.consultations || []))
        .catch(e => {
          if (e.name !== 'AbortError') setSearchError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchBusy(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [nameQuery]);

  async function lookup(record) {
    setLookupBusy(true);
    setError('');
    setConsultation(null);
    setSelectedConsultation(record);
    try {
      const response = await GET(endpoints.consultationSummary, {
        consultation_rec_id: record.consultation_rec_id
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
      <Panel
        title="Find a consultation"
        subtitle="Search by patient name and select the visit you want to review. Only your finalized consultations are shown."
      >
        <Input
          label="Patient name"
          placeholder="Start typing a patient's name..."
          value={nameQuery}
          onChange={e => setNameQuery(e.target.value)}
          autoComplete="off"
        />
        {nameQuery.trim().length < 2 && (
          <p className="muted">Type at least 2 characters to search.</p>
        )}
        {searchBusy && <p className="muted">Searching consultations...</p>}
        <Notice type="error" message={searchError} />
        {nameQuery.trim().length >= 2 && !searchBusy && !searchError && (
          consultationChoices.length === 0
            ? <p className="muted">No finalized consultations found for this name under your account.</p>
            : <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Visit date</th>
                      <th>Visit type</th>
                      <th>Diagnosis</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultationChoices.map(record => (
                      <tr key={record.consultation_rec_id}>
                        <td>
                          <strong>{record.patient_name}</strong>
                          <div className="muted">Patient #{record.patient_id}</div>
                        </td>
                        <td>{record.visit_date || '—'} {record.start_time || ''}</td>
                        <td>{record.visit_type || '—'}</td>
                        <td>{record.diagnosis_preview || '—'}</td>
                        <td>
                          <Button
                            variant="outline"
                            disabled={lookupBusy}
                            loading={lookupBusy && selectedConsultation?.consultation_rec_id === record.consultation_rec_id}
                            onClick={() => lookup(record)}
                          >View summary</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {consultationChoices.length === 50 && (
                <p className="muted">Showing the latest 50 matching visits. Refine the name to narrow the results.</p>
              )}
            </>
        )}
        {consultation && (
          <div className="with-space">
            <h3>Consultation summary — {selectedConsultation?.patient_name} ({selectedConsultation?.visit_date})</h3>
            <div className="details-grid">
              {Object.entries(consultation).map(([k, v]) => (
                <div className="detail" key={k}>
                  <small>{k.replaceAll('_', ' ')}</small>
                  <strong>{String(v ?? '—')}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  </>;
}
