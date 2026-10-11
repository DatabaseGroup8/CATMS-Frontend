import React, { useMemo, useState } from 'react';
import { Download, RefreshCw, BarChart3, CalendarDays, Wallet, Stethoscope, Users, HeartPulse } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeading, Panel, Button, Input, DataTable, Stat, AsyncBlock, useRemote } from '../components/UI';
import { endpoints } from '../lib/api';
import { localDate, monthStart, money, downloadCSV } from '../lib/utils';
const reports = [
  ['appointments', 'Daily appointments'],
  ['revenue', 'Doctor revenue'],
  ['outstanding', 'Outstanding patients'],
  ['treatments', 'Treatment categories'],
  ['insurance', 'Insurance vs. out-of-pocket'],
  ['medication', 'Medication usage']
];
export default function Reports() {
  const [tab, setTab] = useState('appointments'),
    [day, setDay] = useState(localDate()),
    [start, setStart] = useState(monthStart()),
    [end, setEnd] = useState(localDate());
  const path = {
    appointments: endpoints.reportDaily,
    revenue: endpoints.reportDoctors,
    outstanding: endpoints.reportOutstanding,
    treatments: endpoints.reportTreatments,
    insurance: endpoints.reportInsurance,
    medication: endpoints.reportMedication
  }[tab];
  const query = tab === 'appointments' ? {
    date: day
  } : tab === 'outstanding' ? {} : {
    start_date: start,
    end_date: end
  };
  const report = useRemote(path, query);
  const data = report.data?.data;
  const rows = Array.isArray(data) ? data : tab === 'medication' ? report.data?.results || [] : data ? [data] : [];
  const download = () => downloadCSV(rows, `catms_${tab}_${day}`);
  return <>
    <PageHeading
      eyebrow="MANAGER · REPORTING"
      title="Management reports"
      description="Branch-scoped reporting directly from CATMS financial and clinical records."
      actions={<Button
        variant="outline"
        icon={Download}
        disabled={!rows.length}
        onClick={download}
      >Export CSV</Button>}
    />
    <div className="report-tabs">
      {reports.map(([id, label]) => <button
        key={id}
        className={tab === id ? 'active' : ''}
        onClick={() => setTab(id)}
      >
        {label}
      </button>)}
    </div>
    <Panel
      title={reports.find(x => x[0] === tab)?.[1]}
      subtitle="Results update when you change the reporting period"
      actions={<Button
        variant="quiet"
        icon={RefreshCw}
        onClick={report.refresh}
      >Refresh</Button>}
    >
      <div className="filter-bar report-filters">
        {tab === 'appointments'
          ? <Input
            label="Appointment date"
            type="date"
            value={day}
            onChange={e => setDay(e.target.value)}
          />
          : tab !== 'outstanding'
            ? <>
              <Input
                label="From date"
                type="date"
                value={start}
                max={end}
                onChange={e => setStart(e.target.value)}
              />
              <Input
                label="To date"
                type="date"
                value={end}
                min={start}
                onChange={e => setEnd(e.target.value)}
              />
            </>
            : <p className="muted">Current outstanding patient balances across your branch.</p>}
      </div>
      <AsyncBlock loading={report.loading} error={report.error}>
        {tab === 'appointments' && <>
          <div className="stat-grid stat-grid-three">
            <Stat
              label="Scheduled"
              value={data?.scheduled ?? 0}
              icon={CalendarDays}
            />
            <Stat
              label="Completed"
              value={data?.completed ?? 0}
              icon={HeartPulse}
              accent="blue"
            />
            <Stat
              label="Cancelled"
              value={data?.cancelled ?? 0}
              icon={Users}
              accent="orange"
            />
          </div>
          <SimpleBars rows={['scheduled', 'completed', 'cancelled'].map(k => ({
            label: k[0].toUpperCase() + k.slice(1),
            value: data?.[k] || 0
          }))} />
          <DataTable rows={rows} columns={[
            {
              key: 'branch_name',
              label: 'Branch'
            },
            {
              key: 'total_appointments',
              label: 'Total'
            },
            {
              key: 'scheduled',
              label: 'Scheduled'
            },
            {
              key: 'completed',
              label: 'Completed'
            },
            {
              key: 'cancelled',
              label: 'Cancelled'
            }
          ]} />
        </>}
        {tab === 'revenue' && <>
          <SimpleBars rows={rows.map(x => ({
            label: x.doctor_name,
            value: Number(x.invoiced_revenue)
          }))} />
          <DataTable
            rows={rows}
            searchable
            columns={[
              {
                key: 'doctor_name',
                label: 'Doctor'
              },
              {
                key: 'invoice_count',
                label: 'Invoices'
              },
              {
                key: 'invoiced_revenue',
                label: 'Billed',
                render: x => money(x.invoiced_revenue)
              },
              {
                key: 'patient_payments_received',
                label: 'Patient cash',
                render: x => money(x.patient_payments_received)
              },
              {
                key: 'insurance_payments_received',
                label: 'Insurer cash',
                render: x => money(x.insurance_payments_received)
              },
              {
                key: 'patient_outstanding',
                label: 'Outstanding',
                render: x => money(x.patient_outstanding)
              }
            ]}
          />
        </>}
        {tab === 'outstanding' && <>
          <div className="report-note">{report.data?.patient_count ?? rows.length} patients currently have unpaid balances.</div>
          <SimpleBars rows={rows.slice(0, 12).map(x => ({
            label: x.patient_name,
            value: Number(x.outstanding_balance)
          }))} />
          <DataTable
            rows={rows}
            searchable
            columns={[
              {
                key: 'patient_name',
                label: 'Patient'
              },
              {
                key: 'contact_no',
                label: 'Phone'
              },
              {
                key: 'unpaid_invoice_count',
                label: 'Unpaid invoices'
              },
              {
                key: 'outstanding_balance',
                label: 'Outstanding',
                render: x => money(x.outstanding_balance)
              }
            ]}
          />
        </>}
        {tab === 'treatments' && <>
          <SimpleBars rows={rows.map(x => ({
            label: x.category_name,
            value: x.treatment_count
          }))} />
          <DataTable rows={rows} columns={[
            {
              key: 'category_name',
              label: 'Treatment category'
            },
            {
              key: 'treatment_count',
              label: 'Treatments recorded'
            }
          ]} />
        </>}
        {tab === 'insurance' && <>
          <div className="stat-grid stat-grid-three">
            <Stat
              label="Invoiced"
              value={money(data?.invoiced_total)}
              icon={Wallet}
            />
            <Stat
              label="Insurance allocated"
              value={money(data?.insurance_allocated)}
              icon={HeartPulse}
              accent="blue"
            />
            <Stat
              label="Patient paid"
              value={money(data?.patient_paid)}
              icon={Users}
              accent="purple"
            />
          </div>
          <SimpleBars rows={['patient_paid', 'insurance_received', 'patient_outstanding', 'insurance_allocated_but_not_received'].map(k => ({
            label: k.replaceAll('_', ' '),
            value: Number(data?.[k] || 0)
          }))} />
          <DataTable rows={rows} columns={[
            {
              key: 'invoice_count',
              label: 'Invoices'
            },
            {
              key: 'invoiced_total',
              label: 'Total billed',
              render: r => money(r.invoiced_total)
            },
            {
              key: 'insurance_allocated',
              label: 'Insurer allocated',
              render: r => money(r.insurance_allocated)
            },
            {
              key: 'insurance_received',
              label: 'Insurer received',
              render: r => money(r.insurance_received)
            },
            {
              key: 'patient_paid',
              label: 'Patient received',
              render: r => money(r.patient_paid)
            },
            {
              key: 'patient_outstanding',
              label: 'Patient outstanding',
              render: r => money(r.patient_outstanding)
            }
          ]} />
          <p className="muted">Insurance allocated is an expected claim, not received cash. This report uses invoices created in the chosen period and payments collected to date.</p>
        </>}
        {tab === 'medication' && <>
          <SimpleBars rows={rows.map(x => ({
            label: x.generic_name,
            value: x.prescription_count
          }))} />
          <DataTable rows={rows} columns={[
            {
              key: 'generic_name',
              label: 'Medication'
            },
            {
              key: 'form',
              label: 'Form'
            },
            {
              key: 'manufacturer',
              label: 'Manufacturer'
            },
            {
              key: 'prescription_count',
              label: 'Prescriptions'
            },
            {
              key: 'patient_count',
              label: 'Patients'
            }
          ]} />
        </>}
      </AsyncBlock>
    </Panel>
  </>;
}
function SimpleBars({
  rows
}) {
  if (!rows.length) return null;
  const chart = rows.map(x => ({
    name: String(x.label).slice(0, 19),
    value: Number(x.value) || 0
  }));
  return <div className="report-chart">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chart}
        margin={{
          top: 12,
          right: 10,
          left: 6,
          bottom: 35
        }}
      >
        <CartesianGrid stroke="#edf1f4" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 11,
            fill: '#64748b'
          }}
          angle={chart.length > 4 ? -28 : 0}
          textAnchor={chart.length > 4 ? 'end' : 'middle'}
          height={65}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 11,
            fill: '#64748b'
          }}
        />
        <Tooltip
          formatter={value => Number(value).toLocaleString('en-LK')}
        />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          maxBarSize={60}
          fill="#098e8d"
        />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
