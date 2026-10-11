import React, { useState } from 'react';
import { Plus, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { POST, endpoints } from '../lib/api';
import {
  PageHeading,
  Panel,
  Button,
  DataTable,
  Input,
  Select,
  Modal,
  Notice,
  Badge,
  AsyncBlock,
  useRemote,
} from '../components/UI';
import { money, localDate } from '../lib/utils';
export default function Insurance() {
  const [tab, setTab] = useState('claims'),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState('');
  const claims = useRemote(endpoints.claims),
    packages = useRemote(endpoints.packages);
  return <>
    <PageHeading
      eyebrow="MANAGER · FINANCIAL ADMINISTRATION"
      title="Insurance management"
      description="Manage patient coverage, evaluate insurer claims, and record actual insurer settlements."
      actions={<>
        <Button
          variant="outline"
          icon={Plus}
          onClick={() => setModal('assign')}
        >Assign patient policy</Button>
        <Button
          icon={Plus}
          onClick={() => setModal('package')}
        >New package</Button>
      </>}
    />
    <Notice
      type="success"
      message={notice}
      onClose={() => setNotice('')}
    />
    <div className="tab-strip">
      <button
        className={tab === 'claims' ? 'selected' : ''}
        onClick={() => setTab('claims')}
      >Insurance claims</button>
      <button
        className={tab === 'packages' ? 'selected' : ''}
        onClick={() => setTab('packages')}
      >Insurance packages</button>
    </div>
    {tab === 'claims'
      ? <Panel
        title="Claims worklist"
        subtitle="Review claim amounts and received insurer payments separately"
        actions={<Button
          icon={RefreshCw}
          variant="quiet"
          onClick={claims.refresh}
        >Refresh</Button>}
      >
        <AsyncBlock loading={claims.loading} error={claims.error}>
          <DataTable
            rows={claims.data?.data || []}
            searchable
            exportName="catms_claims"
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
                key: 'package_name',
                label: 'Package'
              },
              {
                key: 'claim_amount',
                label: 'Claimed',
                render: r => money(r.claim_amount)
              },
              {
                key: 'approved_amount',
                label: 'Approved',
                render: r => money(r.approved_amount)
              },
              {
                key: 'insurance_paid_amount',
                label: 'Received',
                render: r => money(r.insurance_paid_amount)
              },
              {
                key: 'claim_status',
                label: 'Status',
                render: r => <Badge value={r.claim_status} />
              },
              {
                key: 'actions',
                label: '',
                render: r => <Button
                  variant="outline"
                  onClick={() => setModal({
                    claim: r
                  })}
                >Manage</Button>
              }
            ]}
          />
        </AsyncBlock>
      </Panel>
      : <Panel title="Insurance packages" subtitle="Packages shared across clinic branches">
        <AsyncBlock loading={packages.loading} error={packages.error}>
          <DataTable rows={packages.data?.data || []} columns={[
            {
              key: 'insurance_package_id',
              label: 'ID'
            },
            {
              key: 'package_name',
              label: 'Package'
            },
            {
              key: 'annual_name',
              label: 'Annual plan'
            },
            {
              key: 'copayment_percentage',
              label: 'Copayment %'
            },
            {
              key: 'started_date',
              label: 'Started'
            }
          ]} />
        </AsyncBlock>
      </Panel>}
    {modal === 'package'
      ? <PackageForm
        onClose={() => setModal(null)}
        onDone={() => {
          setModal(null);
          packages.refresh();
          setNotice('Package created successfully');
        }}
      />
      : modal === 'assign'
        ? <AssignPatientPolicy
          packages={packages.data?.data || []}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            setNotice('Patient insurance policy assigned');
          }}
        />
        : modal?.claim
          ? <ClaimForm
            claim={modal.claim}
            onClose={() => setModal(null)}
            onDone={() => {
              setModal(null);
              claims.refresh();
              setNotice('Insurance claim updated successfully');
            }}
          />
          : null}
  </>;
}
function PackageForm({
  onClose,
  onDone
}) {
  const [f, setF] = useState({
      package_name: '',
      annual_name: '',
      copayment_percentage: '20',
      started_date: localDate()
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const ch = (k, v) => setF(s => ({
    ...s,
    [k]: v
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await POST(endpoints.addPackage, {
        ...f,
        copayment_percentage: f.copayment_percentage
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Create insurance package" onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <Notice type="error" message={error} />
      <Input
        required
        label="Package name"
        value={f.package_name}
        onChange={e => ch('package_name', e.target.value)}
      />
      <Input
        label="Annual plan name"
        value={f.annual_name}
        onChange={e => ch('annual_name', e.target.value)}
      />
      <Input
        required
        type="number"
        min="0"
        max="100"
        step="0.01"
        label="Copayment percentage"
        value={f.copayment_percentage}
        onChange={e => ch('copayment_percentage', e.target.value)}
      />
      <Input
        required
        type="date"
        label="Plan start date"
        value={f.started_date}
        onChange={e => ch('started_date', e.target.value)}
      />
      <div className="form-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
        >Cancel</Button>
        <Button type="submit" loading={busy}>Create package</Button>
      </div>
    </form>
  </Modal>;
}
function AssignPatientPolicy({
  packages,
  onClose,
  onDone
}) {
  const [search, setSearch] = useState(''),
    [selected, setSelected] = useState(null),
    [form, setForm] = useState({
      insurance_package_id: '',
      started_date: localDate(),
      end_date: ''
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const patients = useRemote(endpoints.patients, {
    q: search
  }, search.trim().length >= 2);
  const change = (k, v) => setForm(s => ({
    ...s,
    [k]: v
  }));
  async function submit(e) {
    e.preventDefault();
    if (!selected) {
      setError('Select a patient');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.assignPolicy, {
        ...form,
        patient_id: selected.patient_id,
        insurance_package_id: Number(form.insurance_package_id)
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Assign coverage to patient" onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <Notice type="error" message={error} />
      {selected
        ? <div className="selected-record">
          <strong>{selected.full_name} · #{selected.patient_id}</strong>
          <Button
            type="button"
            variant="quiet"
            onClick={() => setSelected(null)}
          >Change</Button>
        </div>
        : <>
          <Input
            label="Find patient"
            placeholder="Search name or contact number"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
              <span>
                {p.contact_no}
              </span>
            </button>)}
          </div>
        </>}
      <Select
        label="Insurance package"
        required
        value={form.insurance_package_id}
        onChange={e => change('insurance_package_id', e.target.value)}
        options={packages.map(p => ({
          value: p.insurance_package_id,
          label: p.package_name
        }))}
      />
      <div className="form-grid">
        <Input
          required
          type="date"
          label="Coverage starts"
          value={form.started_date}
          onChange={e => change('started_date', e.target.value)}
        />
        <Input
          required
          type="date"
          label="Coverage ends"
          min={form.started_date}
          value={form.end_date}
          onChange={e => change('end_date', e.target.value)}
        />
      </div>
      <div className="form-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
        >Cancel</Button>
        <Button type="submit" loading={busy}>Assign insurance</Button>
      </div>
    </form>
  </Modal>;
}
function ClaimForm({
  claim,
  onClose,
  onDone
}) {
  const [approved, setApproved] = useState(claim.approved_amount ?? claim.claim_amount ?? '0'),
    [received, setReceived] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function resolve() {
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.resolve(claim.invoice_id), {
        approved_amount: approved
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function settle() {
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.settlement(claim.invoice_id), {
        amount: received
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={`Manage claim — invoice #${claim.invoice_id}`} onClose={onClose}>
    <div className="stack">
      <div className="context-strip">
        <ShieldCheck size={19} />
        <strong>
          {claim.patient_name}
        </strong>
        <Badge value={claim.claim_status} />
      </div>
      <Notice type="error" message={error} />
      <div className="details-grid">
        <div className="detail">
          <small>Claimed</small>
          <strong>
            {money(claim.claim_amount)}
          </strong>
        </div>
        <div className="detail">
          <small>Approved</small>
          <strong>
            {money(claim.approved_amount)}
          </strong>
        </div>
        <div className="detail">
          <small>Insurer received</small>
          <strong>
            {money(claim.insurance_paid_amount)}
          </strong>
        </div>
      </div>
      <div className="section-title">Adjudicate claim</div>
      <Input
        label="Approved amount (Rs.; 0 to reject)"
        type="number"
        min="0"
        max={claim.claim_amount}
        step="0.01"
        value={approved}
        onChange={e => setApproved(e.target.value)}
      />
      <Button
        variant="outline"
        disabled={busy || !['Submitted'].includes(claim.claim_status)}
        onClick={resolve}
      >Approve / reject claim</Button>
      <div className="section-title">Record insurer settlement</div>
      <Input
        label="Received from insurance provider (Rs.)"
        type="number"
        min="0.01"
        step="0.01"
        value={received}
        onChange={e => setReceived(e.target.value)}
      />
      <Button
        disabled={busy || !received || Number(approved || claim.approved_amount) <= 0 || !['Approved', 'PartiallyApproved', 'PartiallyPaid'].includes(claim.claim_status)}
        onClick={settle}
        icon={Wallet}
      >Record insurer receipt</Button>
      <p className="muted">Insurer receipts are separate from patient payments and will not appear in the patient payment ledger.</p>
      <div className="form-footer">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  </Modal>;
}
