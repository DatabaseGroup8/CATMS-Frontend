import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import { PageHeading, Panel, Stat, DataTable, Badge, Button, AsyncBlock, useRemote } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { endpoints } from '../lib/api';
import { localDate, money } from '../lib/utils';
export default function Dashboard() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const role = user.role;
  const today = localDate();
  const appointment = useRemote(role === 'Doctor' ? endpoints.doctorAppointments : role === 'Receptionist' ? endpoints.schedule : endpoints.reportDaily, {
    date: today
  });
  const second = useRemote(role === 'Receptionist' ? endpoints.completed : role === 'Manager' ? endpoints.reportInsurance : endpoints.history(0), role === 'Manager' ? {
    start_date: today,
    end_date: today
  } : role === 'Receptionist' ? {} : {}, role !== 'Doctor');
  const third = useRemote(role === 'Manager' ? endpoints.staff : role === 'Receptionist' ? endpoints.invoices : null, {}, role !== 'Doctor');
  const slots = appointment.data?.data || [];
  const apps = appointment.data?.appointments || [];
  const completed = second.data?.appointments || [];
  const invoices = third.data?.data || [];
  const report = role === 'Manager' ? appointment.data?.data || {} : null;
  const reportFin = role === 'Manager' ? second.data?.data || {} : null;
  return <>
    <PageHeading
      eyebrow={`Good day, ${user.full_name?.split(' ')[0] || 'there'}`}
      title={role === 'Doctor' ? 'Doctor overview' : role === 'Manager' ? 'Branch overview' : 'Front desk overview'}
      description={`Here is the latest information from your connected clinic database · ${new Date().toLocaleDateString('en-LK', {
        dateStyle: 'full'
      })}`}
    />
    {role === 'Receptionist'
      ? <>
        <div className="stat-grid">
          <Stat
            label="Today's sessions"
            value={slots.length}
            icon={CalendarDays}
            accent="teal"
            sub="Doctor time slots"
          />
          <Stat
            label="Available sessions"
            value={slots.filter(x => x.available).length}
            icon={CheckCircle2}
            accent="blue"
            sub="Open for bookings"
          />
          <Stat
            label="Awaiting billing"
            value={completed.filter(x => !x.invoice_id).length}
            icon={FileText}
            accent="orange"
            sub="Completed consultations"
          />
          <Stat
            label="Outstanding invoices"
            value={invoices.filter(x => Number(x.outstanding_balance) > 0).length}
            icon={Wallet}
            accent="purple"
            sub="Last 100 invoices"
          />
        </div>
        <div className="dash-grid">
          <Panel
            title="Today's doctor sessions"
            subtitle="Live schedule from your branch"
            actions={<Button
              variant="quiet"
              icon={ArrowRight}
              onClick={() => navigate('/app/schedules')}
            >Manage</Button>}
          >
            <AsyncBlock loading={appointment.loading} error={appointment.error}>
              <DataTable rows={slots.slice(0, 7)} columns={[
                {
                  key: 'doctor_name',
                  label: 'Doctor'
                },
                {
                  key: 'start_time',
                  label: 'Start'
                },
                {
                  key: 'booked_count',
                  label: 'Patients'
                },
                {
                  key: 'status',
                  label: 'Availability',
                  render: r => <Badge value={r.status} />
                }
              ]} />
            </AsyncBlock>
          </Panel>
          <Panel title="Quick actions" subtitle="Common receptionist tasks">
            <div className="quick-actions">
              {[
                ['Book an appointment', 'Find doctors and sessions', CalendarDays, '/app/schedules'],
                ['Finalize consultation', 'Process completed visits', FileText, '/app/consultations'],
                ['Collect a payment', 'View outstanding balances', Wallet, '/app/invoices'],
                ['Find a patient', 'Search patient records', Users, '/app/patients']
              ].map(([label, sub, Icon, url]) => <button
                className="quick-action"
                key={url}
                onClick={() => navigate(url)}
              >
                <span>
                  <Icon size={20} />
                </span>
                <div>
                  <strong>
                    {label}
                  </strong>
                  <small>
                    {sub}
                  </small>
                </div>
                <ArrowRight size={16} />
              </button>)}
            </div>
          </Panel>
        </div>
      </>
      : role === 'Doctor'
        ? <>
          <div className="stat-grid">
            <Stat
              label="My appointments"
              value={apps.length}
              icon={CalendarDays}
            />
            <Stat
              label="Scheduled"
              value={apps.filter(a => a.status === 'Scheduled').length}
              icon={Clock3}
              accent="orange"
            />
            <Stat
              label="Completed"
              value={apps.filter(a => a.status === 'Completed').length}
              icon={CheckCircle2}
              accent="blue"
            />
            <Stat
              label="Unique patients"
              value={new Set(apps.map(a => a.patient_id)).size}
              icon={Users}
              accent="purple"
            />
          </div>
          <Panel
            title="My patient queue"
            subtitle="Today's appointments, loaded from Django"
            actions={<Button
              variant="quiet"
              icon={ArrowRight}
              onClick={() => navigate('/app/doctor')}
            >Open schedule</Button>}
          >
            <AsyncBlock loading={appointment.loading} error={appointment.error}>
              <DataTable rows={apps.slice(0, 10)} columns={[
                {
                  key: 'appointment_number',
                  label: 'Queue'
                },
                {
                  key: 'patient_name',
                  label: 'Patient'
                },
                {
                  key: 'type',
                  label: 'Type'
                },
                {
                  key: 'start_time',
                  label: 'Session'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: r => <Badge value={r.status} />
                }
              ]} />
            </AsyncBlock>
          </Panel>
        </>
        : <>
          <div className="stat-grid">
            <Stat
              label="Appointments today"
              value={report?.total_appointments ?? '—'}
              icon={CalendarCheck2}
            />
            <Stat
              label="Completed today"
              value={report?.completed ?? '—'}
              icon={CheckCircle2}
              accent="blue"
            />
            <Stat
              label="Branch staff"
              value={third.data?.data?.length ?? '—'}
              icon={Users}
              accent="purple"
            />
            <Stat
              label="Cash collected on today's invoices"
              value={reportFin ? money(reportFin.total_cash_received) : '—'}
              icon={Wallet}
              accent="orange"
            />
          </div>
          <div className="dash-grid">
            <Panel title="Today's appointment overview" subtitle="Scheduled, completed and cancelled">
              <AsyncBlock loading={appointment.loading} error={appointment.error}>
                <div className="metric-rows">
                  {['scheduled', 'completed', 'cancelled'].map(s => <div key={s}>
                    <div className="metric-title">
                      <span>
                        {s[0].toUpperCase() + s.slice(1)}
                      </span>
                      <strong>
                        {report?.[s] ?? 0}
                      </strong>
                    </div>
                    <div className="metric-bar">
                      <div
                        style={{
                          width: `${Number(report?.[s] || 0) / Math.max(1, Number(report?.total_appointments || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>)}
                </div>
              </AsyncBlock>
            </Panel>
            <Panel title="Management tools" subtitle="Access branch management and reports">
              <div className="quick-actions">
                {[
                  ['Management reports', 'Five live operational reports', Activity, '/app/reports'],
                  ['Insurance administration', 'Packages and claims', ShieldCheck, '/app/insurance'],
                  ['Staff and doctors', 'Register and manage staff', Users, '/app/staff']
                ].map(([label, sub, Icon, url]) => <button
                  className="quick-action"
                  key={url}
                  onClick={() => navigate(url)}
                >
                  <span>
                    <Icon size={19} />
                  </span>
                  <div>
                    <strong>
                      {label}
                    </strong>
                    <small>
                      {sub}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </button>)}
              </div>
            </Panel>
          </div>
        </>}
  </>;
}
