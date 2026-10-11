import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileHeart, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react';
import { GET, POST, endpoints } from '../lib/api';
import { money, shortDate } from '../lib/utils';
import {
  PageHeading,
  Panel,
  Button,
  Input,
  Select,
  Textarea,
  Notice,
  Badge,
  DataTable,
  AsyncBlock,
  useRemote,
} from '../components/UI';
const emptyMed = {
  medication_id: '',
  quantity: '1',
  dosage: '',
  frequency: '',
  duration_days: '1',
  instructions: ''
};
export default function Consultations() {
  const [selected, setSelected] = useState(null),
    [invoiceId, setInvoiceId] = useState(null),
    [report, setReport] = useState({
      chief_complaint: '',
      symptoms: '',
      diagnosis: ''
    }),
    [meds, setMeds] = useState([]),
    [treatments, setTreatments] = useState([]),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  const completed = useRemote(endpoints.completed);
  const medsRef = useRemote(endpoints.meds, {
    q: ''
  });
  const treatmentRef = useRemote(endpoints.treatments, {
    q: ''
  });
  const medicineOptions = medsRef.data?.data || [],
    treatmentOptions = treatmentRef.data?.data || [];
  const appointmentRows = (completed.data?.appointments || []).filter(x => !x.invoice_id);
  const subTotal = meds.reduce((sum, m) => sum + Number(m.quantity || 0) * Number(medicineOptions.find(o => o.medication_id === Number(m.medication_id))?.price || 0), 0) + treatments.reduce((sum, t) => sum + Number(treatmentOptions.find(o => o.treatment_service_code === Number(t.treatment_service_code))?.base_price || 0), 0);
  function reset() {
    setSelected(null);
    setInvoiceId(null);
    setReport({
      chief_complaint: '',
      symptoms: '',
      diagnosis: ''
    });
    setMeds([]);
    setTreatments([]);
    completed.refresh();
    setError('');
  }
  ;
  function select(r) {
    setSelected(r);
    setInvoiceId(null);
    setError('');
    setSuccess('');
  }
  ;
  const updateMed = (i, k, v) => setMeds(a => a.map((m, n) => n === i ? {
    ...m,
    [k]: v
  } : m));
  async function finalize(e) {
    e.preventDefault();
    if (!window.confirm('Finalize the clinical record and invoice? This cannot be edited using the existing API. Ensure the doctor has authorized all clinical details.')) return;
    setBusy(true);
    setError('');
    try {
      const result = await POST(endpoints.finalize, {
        appointment_id: selected.appointment_id,
        medical_report: report,
        medications: meds.map(m => ({
          ...m,
          medication_id: Number(m.medication_id),
          quantity: Number(m.quantity),
          duration_days: Number(m.duration_days)
        })),
        treatments: treatments.map(t => ({
          treatment_service_code: Number(t.treatment_service_code)
        }))
      });
      setInvoiceId(result.invoice_id);
      setSuccess('Consultation finalized and invoice created successfully.');
      completed.refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return <>
    <PageHeading
      eyebrow="RECEPTION · CONSULTATIONS"
      title="Consultation & billing"
      description="Select a completed visit, transcribe doctor-authorized clinical details, finalize the invoice and collect payments."
    />
    <Notice
      message={error}
      type="error"
      onClose={() => setError('')}
    />
    <Notice
      message={success}
      type="success"
      onClose={() => setSuccess('')}
    />
    {!selected
      ? <Panel title="Completed appointments awaiting billing" subtitle="Only visits completed by a doctor and not yet invoiced can be finalized">
        <AsyncBlock loading={completed.loading} error={completed.error}>
          <DataTable
            rows={appointmentRows}
            searchable
            columns={[
              {
                key: 'appointment_id',
                label: 'Appointment'
              },
              {
                key: 'patient_name',
                label: 'Patient'
              },
              {
                key: 'doctor_name',
                label: 'Doctor'
              },
              {
                key: 'date',
                label: 'Visit date',
                render: r => shortDate(r.date)
              },
              {
                key: 'billing_status',
                label: 'Billing',
                render: r => <Badge value={r.billing_status} />
              },
              {
                key: 'action',
                label: '',
                render: r => <Button
                  onClick={() => select(r)}
                >Start billing</Button>
              }
            ]}
          />
        </AsyncBlock>
      </Panel>
      : <>
        <div className="workflow-header">
          <Button
            variant="quiet"
            icon={ArrowLeft}
            onClick={reset}
          >Back to completed visits</Button>
          <div>
            <strong>
              {selected.patient_name}
            </strong>
            <span>Appointment #{selected.appointment_id} · {selected.doctor_name} · {shortDate(selected.date)}</span>
          </div>
          <Badge
            value={invoiceId ? 'Finalized' : 'Draft in browser'}
          />
        </div>
        {!invoiceId
          ? <div className="workflow-grid">
            <div className="stack">
              <Panel title="1. Medical report" subtitle="Enter only instructions approved by the treating doctor">
                <form
                  id="finalize-form"
                  className="stack"
                  onSubmit={finalize}
                >
                  <Textarea
                    required
                    rows={3}
                    label="Chief complaint"
                    value={report.chief_complaint}
                    onChange={e => setReport(s => ({
                      ...s,
                      chief_complaint: e.target.value
                    }))}
                  />
                  <Textarea
                    label="Symptoms"
                    rows={3}
                    value={report.symptoms}
                    onChange={e => setReport(s => ({
                      ...s,
                      symptoms: e.target.value
                    }))}
                  />
                  <Textarea
                    required
                    label="Diagnosis"
                    rows={3}
                    value={report.diagnosis}
                    onChange={e => setReport(s => ({
                      ...s,
                      diagnosis: e.target.value
                    }))}
                  />
                </form>
              </Panel>
              <Panel
                title="2. Prescribed medications"
                subtitle="Quantity determines the invoice price. Instructions must come from the doctor."
                actions={<Button
                  variant="outline"
                  icon={Plus}
                  onClick={() => setMeds(a => [
                    ...a,
                    {
                      ...emptyMed
                    }
                  ])}
                >Add medication</Button>}
              >
                {meds.length
                  ? meds.map((m, i) => <div className="repeat-row" key={i}>
                    <div className="repeat-row-head">
                      <strong>Medication {i + 1}</strong>
                      <Button
                        variant="quiet"
                        icon={Trash2}
                        onClick={() => setMeds(a => a.filter((_, n) => n !== i))}
                      >Remove</Button>
                    </div>
                    <Select
                      label="Medication"
                      required
                      value={m.medication_id}
                      onChange={e => updateMed(i, 'medication_id', e.target.value)}
                      options={medicineOptions.map(x => ({
                        value: x.medication_id,
                        label: `${x.generic_name} · ${money(x.price)} / unit`
                      }))}
                    />
                    <div className="form-grid">
                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        required
                        value={m.quantity}
                        onChange={e => updateMed(i, 'quantity', e.target.value)}
                      />
                      <Input
                        label="Duration (days)"
                        type="number"
                        min="1"
                        required
                        value={m.duration_days}
                        onChange={e => updateMed(i, 'duration_days', e.target.value)}
                      />
                      <Input
                        label="Dosage"
                        required
                        value={m.dosage}
                        onChange={e => updateMed(i, 'dosage', e.target.value)}
                        placeholder="1 tablet"
                      />
                      <Input
                        label="Frequency"
                        required
                        value={m.frequency}
                        onChange={e => updateMed(i, 'frequency', e.target.value)}
                        placeholder="Twice daily"
                      />
                    </div>
                    <Input
                      label="Instructions"
                      value={m.instructions}
                      onChange={e => updateMed(i, 'instructions', e.target.value)}
                      placeholder="After meals"
                    />
                  </div>)
                  : <div className="hint-block">No medications added. You may add treatments only.</div>}
              </Panel>
              <Panel
                title="3. Treatments"
                subtitle="Select authorized treatments from your clinic catalogue"
                actions={<Button
                  variant="outline"
                  icon={Plus}
                  onClick={() => setTreatments(a => [
                    ...a,
                    {
                      treatment_service_code: ''
                    }
                  ])}
                >Add treatment</Button>}
              >
                {treatments.length
                  ? treatments.map((t, i) => <div className="treatment-row" key={i}>
                    <Select
                      label={'Treatment ' + (i + 1)}
                      value={t.treatment_service_code}
                      required
                      onChange={e => setTreatments(a => a.map((v, n) => i === n ? {
                        treatment_service_code: e.target.value
                      } : v))}
                      options={treatmentOptions.map(x => ({
                        value: x.treatment_service_code,
                        label: `${x.treatment_name} · ${money(x.base_price)}`
                      }))}
                    />
                    <Button
                      variant="quiet"
                      icon={Trash2}
                      onClick={() => setTreatments(a => a.filter((_, n) => n !== i))}
                    >Remove</Button>
                  </div>)
                  : <div className="hint-block">No treatments added. At least one medication or treatment is required.</div>}
              </Panel>
            </div>
            <div>
              <div className="sticky-summary">
                <div className="summary-title"><ReceiptText size={20} /> Invoice preview</div>
                <div className="summary-line">
                  <span>Medications</span>
                  <b>
                    {meds.length}
                  </b>
                </div>
                <div className="summary-line">
                  <span>Treatments</span>
                  <b>
                    {treatments.length}
                  </b>
                </div>
                <div className="summary-total">
                  <span>Estimated subtotal</span>
                  <strong>
                    {money(subTotal)}
                  </strong>
                </div>
                <p>Final prices are calculated by MySQL using current catalogue prices.</p>
                <Button
                  className="fullwidth"
                  type="submit"
                  form="finalize-form"
                  disabled={!(meds.length + treatments.length) || busy || meds.some(m => !m.medication_id || !m.dosage || !m.frequency || !m.quantity || !m.duration_days) || treatments.some(t => !t.treatment_service_code)}
                  loading={busy}
                  icon={CheckCircle2}
                >Finalize consultation</Button>
              </div>
            </div>
          </div>
          : <InvoiceCheckout invoiceId={invoiceId} onReturn={reset} />}
      </>}
  </>;
}
export function InvoiceCheckout({
  invoiceId,
  onReturn
}) {
  const summary = useRemote(endpoints.invoice(invoiceId)),
    policies = useRemote(endpoints.policies(invoiceId));
  const [insuranceId, setInsuranceId] = useState(''),
    [amount, setAmount] = useState(''),
    [method, setMethod] = useState('Cash'),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const record = summary.data?.data || {};
  const reload = () => {
    summary.refresh();
    policies.refresh();
  };
  async function apply() {
    if (!insuranceId) return;
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.applyInsurance(invoiceId), {
        insurance_id: Number(insuranceId)
      });
      setMessage('Insurance claim submitted. Insurer allocation updated.');
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await POST(endpoints.pay, {
        invoice_id: Number(invoiceId),
        payment_amount: amount,
        payment_method: method,
        request_key: key.current
      });
      key.current = crypto.randomUUID();
      setAmount('');
      setMessage('Patient payment recorded successfully.');
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="workflow-grid">
    <div className="stack">
      <Notice type="error" message={error} />
      <Notice type="success" message={message} />
      <Panel title="Insurance coverage" subtitle="Apply a policy before the first patient payment">
        <AsyncBlock loading={policies.loading} error={policies.error}>
          {record.claim_status
            ? <Notice message={`Claim status: ${record.claim_status}. Insurance allocation: ${money(record.insurance_claimed_amount)}`} />
            : <div className="stack">
              <Select
                label="Eligible patient policy"
                placeholder="Select insurance (optional)"
                value={insuranceId}
                onChange={e => setInsuranceId(e.target.value)}
                options={(policies.data?.policies || []).map(p => ({
                  value: p.insurance_id,
                  label: p.package_name + ' · ' + p.copayment_percentage + '% copay'
                }))}
              />
              {(policies.data?.policies || []).length === 0 && <div className="hint-block">No applicable insurance policies. Continue to patient payment.</div>}
              <Button
                type="button"
                variant="outline"
                disabled={!insuranceId || busy || Number(record.total_patient_paid) > 0}
                onClick={apply}
              >Apply insurance</Button>
            </div>}
        </AsyncBlock>
      </Panel>
      <Panel title="Record patient payment" subtitle="Supports full or partial payments against this existing invoice">
        <form onSubmit={pay} className="stack">
          <Input
            type="number"
            min="0.01"
            max={record.patient_outstanding || undefined}
            step="0.01"
            required
            label="Payment received (Rs.)"
            value={amount}
            onChange={e => {
              setAmount(e.target.value);
              key.current = crypto.randomUUID();
            }}
            placeholder="0.00"
          />
          <Select
            label="Payment method"
            value={method}
            onChange={e => {
              setMethod(e.target.value);
              key.current = crypto.randomUUID();
            }}
            options={['Cash', 'Card', 'Online', 'Bank Transfer']}
          />
          <Button
            type="submit"
            disabled={busy || Number(record.patient_outstanding) <= 0}
            loading={busy}
            icon={Wallet}
          >Record payment</Button>
        </form>
      </Panel>
      <Button variant="outline" onClick={onReturn}>Return to completed appointments</Button>
    </div>
    <div className="sticky-summary">
      <div className="summary-title"><ReceiptText size={20} /> Invoice #{invoiceId}</div>
      <AsyncBlock loading={summary.loading} error={summary.error}>
        <strong>
          {record.patient_name}
        </strong>
        <div className="summary-line">
          <span>Subtotal</span>
          <b>
            {money(record.sub_total)}
          </b>
        </div>
        <div className="summary-line">
          <span>Insurance allocation</span>
          <b>
            {money(record.insurance_claimed_amount)}
          </b>
        </div>
        <div className="summary-line">
          <span>Patient paid</span>
          <b>
            {money(record.total_patient_paid)}
          </b>
        </div>
        <div className="summary-total">
          <span>Patient outstanding</span>
          <strong>
            {money(record.patient_outstanding)}
          </strong>
        </div>
        <Badge
          value={Number(record.patient_outstanding) <= 0 ? 'Paid' : 'Outstanding'}
        />
        {record.claim_status && <div className="summary-line">
          <span>Claim status</span>
          <Badge value={record.claim_status} />
        </div>}
      </AsyncBlock>
    </div>
  </div>;
}
