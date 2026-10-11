import React, { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { PageHeading, Panel, Input, Button, DataTable, Notice, Badge, AsyncBlock, useRemote } from '../components/UI';
import { endpoints } from '../lib/api';
import { money, shortDate } from '../lib/utils';
import { InvoiceCheckout } from './Consultations';
export default function Invoices() {
  const [filter, setFilter] = useState(''),
    [q, setQ] = useState(''),
    [only, setOnly] = useState(false),
    [selected, setSelected] = useState(null);
  const invoices = useRemote(endpoints.invoices, {
    q: filter,
    outstanding_only: only
  });
  const rows = invoices.data?.data || [];
  return <>
    <PageHeading
      eyebrow="BILLING · PAYMENTS"
      title="Invoices & payments"
      description="Find finalized invoices, track outstanding balances and record follow-up patient payments."
      actions={<Button
        variant="outline"
        icon={RefreshCw}
        onClick={invoices.refresh}
      >Refresh</Button>}
    />
    {selected
      ? <>
        <Button
          variant="quiet"
          onClick={() => {
            setSelected(null);
            invoices.refresh();
          }}
        >← Back to invoices</Button>
        <div className="with-space">
          <InvoiceCheckout
            invoiceId={selected}
            onReturn={() => {
              setSelected(null);
              invoices.refresh();
            }}
          />
        </div>
      </>
      : <Panel title="Invoice register" subtitle="All amounts come from completed records in MySQL">
        <form
          className="filter-bar"
          onSubmit={e => {
            e.preventDefault();
            setFilter(q);
          }}
        >
          <div className="search-large">
            <Search size={17} />
            <input
              placeholder="Patient name or phone"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <Button type="submit">Search</Button>
          <label className="check-row"><input
            type="checkbox"
            checked={only}
            onChange={e => setOnly(e.target.checked)}
          /> Outstanding only</label>
        </form>
        <AsyncBlock loading={invoices.loading} error={invoices.error}>
          <DataTable
            rows={rows}
            exportName="catms_invoices"
            columns={[
              {
                key: 'invoice_id',
                label: 'Invoice'
              },
              {
                key: 'patient_name',
                label: 'Patient'
              },
              {
                key: 'created_at',
                label: 'Created',
                render: r => shortDate(r.created_at)
              },
              {
                key: 'sub_total',
                label: 'Subtotal',
                render: r => money(r.sub_total)
              },
              {
                key: 'total_paid',
                label: 'Paid',
                render: r => money(r.total_paid)
              },
              {
                key: 'outstanding_balance',
                label: 'Remaining',
                render: r => <strong>
                  {money(r.outstanding_balance)}
                </strong>
              },
              {
                key: 'status',
                label: 'Status',
                render: r => <Badge
                  value={Number(r.outstanding_balance) > 0 ? 'Outstanding' : 'Paid'}
                />
              },
              {
                key: 'actions',
                label: '',
                render: r => <Button
                  variant="outline"
                  onClick={() => setSelected(r.invoice_id)}
                >Open invoice</Button>
              }
            ]}
          />
        </AsyncBlock>
      </Panel>}
  </>;
}
