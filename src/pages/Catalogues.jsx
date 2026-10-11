import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { POST, endpoints } from '../lib/api';
import {
  PageHeading,
  Panel,
  Button,
  Input,
  Select,
  Textarea,
  Notice,
  DataTable,
  Modal,
  Badge,
  useRemote,
  AsyncBlock,
} from '../components/UI';
import { money } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
const definitions = {
  medicines: {
    title: 'Medications',
    path: endpoints.meds,
    add: endpoints.addMed,
    roles: ['Receptionist'],
    columns: [
      ['medication_id', 'ID'],
      ['generic_name', 'Generic name'],
      ['manufacturer', 'Manufacturer'],
      ['form', 'Form'],
      ['price', 'Price']
    ],
    fields: [
      ['generic_name', 'Generic name', 'text', true],
      ['manufacturer', 'Manufacturer'],
      ['form', 'Form'],
      ['price', 'Price (Rs.)', 'number', true],
      ['contraindications', 'Contraindications'],
      ['side_effects', 'Side effects']
    ]
  },
  treatments: {
    title: 'Treatments',
    path: endpoints.treatments,
    add: endpoints.addTreatment,
    roles: ['Receptionist'],
    columns: [
      ['treatment_service_code', 'Code'],
      ['treatment_name', 'Treatment'],
      ['category_name', 'Category'],
      ['base_price', 'Base price'],
      ['insurance_eligible', 'Eligible for insurance']
    ],
    fields: [
      ['treatment_category_id', 'Treatment category', 'category', true],
      ['treatment_name', 'Treatment name', 'text', true],
      ['base_price', 'Price (Rs.)', 'number', true],
      ['duration', 'Duration'],
      ['insurance_eligible', 'Insurance eligible', 'bool']
    ]
  },
  treatmentCategories: {
    title: 'Treatment categories',
    path: endpoints.treatmentCategories,
    add: endpoints.addTreatmentCategory,
    roles: ['Receptionist'],
    columns: [
      ['treatment_category_id', 'ID'],
      ['category_name', 'Category'],
      ['description', 'Description']
    ],
    fields: [
      ['category_name', 'Category name', 'text', true],
      ['description', 'Description']
    ]
  },
  conditionCategories: {
    title: 'Condition categories',
    path: endpoints.conditionCategories,
    add: endpoints.addConditionCategory,
    roles: ['Receptionist'],
    columns: [
      ['condition_category_id', 'ID'],
      ['category_name', 'Category']
    ],
    fields: [
      ['category_name', 'Category name', 'text', true]
    ]
  },
  conditions: {
    title: 'Conditions',
    path: endpoints.conditions,
    add: endpoints.addCondition,
    roles: ['Receptionist'],
    columns: [
      ['condition_id', 'ID'],
      ['condition_name', 'Condition'],
      ['category_name', 'Category'],
      ['description', 'Description']
    ],
    fields: [
      ['condition_category_id', 'Condition category', 'conditionCategory', true],
      ['condition_name', 'Condition name', 'text', true],
      ['description', 'Description']
    ]
  },
  specializations: {
    title: 'Specializations',
    path: endpoints.specializations,
    add: endpoints.addSpecialization,
    roles: ['Manager'],
    columns: [
      ['specialization_id', 'ID'],
      ['specialization_name', 'Specialization'],
      ['description', 'Description']
    ],
    fields: [
      ['specialization_name', 'Specialization name', 'text', true],
      ['description', 'Description']
    ]
  }
};
export default function Catalogues() {
  const {
    user
  } = useAuth();
  const choices = user.role === 'Manager' ? ['specializations'] : user.role === 'Doctor' ? ['conditions', 'conditionCategories', 'specializations'] : Object.keys(definitions).filter(x => x !== 'specializations');
  const [tab, setTab] = useState(choices[0]),
    [search, setSearch] = useState(''),
    [adding, setAdding] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const config = definitions[tab];
  const list = useRemote(config.path, ['medicines', 'treatments', 'conditions'].includes(tab) ? {
    q: search
  } : {}, true);
  const rows = list.data?.data || [];
  const canAdd = config.roles.includes(user.role);
  return <>
    <PageHeading
      eyebrow="REFERENCE DATA"
      title="Clinical catalogues"
      description="Search and maintain the clinical information stored in MySQL."
      actions={canAdd && <Button
        icon={Plus}
        onClick={() => setAdding(true)}
      >Add {config.title.toLowerCase().replace(/s$/, '')}</Button>}
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
    <div className="tab-strip">
      {choices.map(x => <button
        key={x}
        className={tab === x ? 'selected' : ''}
        onClick={() => {
          setTab(x);
          setSearch('');
        }}
      >
        {definitions[x].title}
      </button>)}
    </div>
    <Panel
      title={config.title}
      subtitle="Records are retrieved live from the database"
      actions={<Button
        variant="quiet"
        icon={RefreshCw}
        onClick={list.refresh}
      >Refresh</Button>}
    >
      {['medicines', 'treatments', 'conditions'].includes(tab) && <div className="catalogue-search">
        <Input
          label="Search"
          placeholder={`Search ${config.title.toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>}
      <AsyncBlock loading={list.loading} error={list.error}>
        <DataTable
          rows={rows}
          searchable
          exportName={'catms_' + tab}
          columns={config.columns.map(([key, label]) => ({
            key,
            label,
            render: key === 'insurance_eligible' ? r => <Badge
              value={r[key] ? 'Yes' : 'No'}
            /> : ['price', 'base_price'].includes(key) ? r => money(r[key]) : null
          }))}
        />
      </AsyncBlock>
    </Panel>
    {adding && <AddCatalogue
      config={config}
      onDone={() => {
        setAdding(false);
        list.refresh();
        setMessage(config.title + ' saved successfully');
      }}
      onClose={() => setAdding(false)}
    />}
  </>;
}
function AddCatalogue({
  config,
  onDone,
  onClose
}) {
  const [form, setForm] = useState({}),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  const categories = useRemote(endpoints.treatmentCategories, {}, config.fields.some(f => f[2] === 'category'));
  const conditionCats = useRemote(endpoints.conditionCategories, {}, config.fields.some(f => f[2] === 'conditionCategory'));
  const change = (k, v) => setForm(s => ({
    ...s,
    [k]: v
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const data = {
      ...form
    };
    config.fields.forEach(([k,, type]) => {
      if (type === 'number') data[k] = String(data[k]);
      if (['category', 'conditionCategory'].includes(type)) data[k] = Number(data[k]);
      if (type === 'bool') data[k] = !!data[k];
    });
    try {
      await POST(config.add, data);
      onDone();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={`Add ${config.title.toLowerCase()}`} onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <Notice type="error" message={err} />
      {config.fields.map(([key, label, type, required]) => type === 'category'
        ? <Select
          key={key}
          label={label}
          required
          value={form[key]}
          onChange={e => change(key, e.target.value)}
          options={(categories.data?.data || []).map(x => ({
            value: x.treatment_category_id,
            label: x.category_name
          }))}
        />
        : type === 'conditionCategory'
          ? <Select
            key={key}
            label={label}
            required
            value={form[key]}
            onChange={e => change(key, e.target.value)}
            options={(conditionCats.data?.data || []).map(x => ({
              value: x.condition_category_id,
              label: x.category_name
            }))}
          />
          : type === 'bool'
            ? <label className="check-row" key={key}>
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={e => change(key, e.target.checked)}
              />
              {label}
            </label>
            : <Input
              key={key}
              label={label}
              required={!!required}
              type={type === 'number' ? 'number' : 'text'}
              step={type === 'number' ? '0.01' : undefined}
              min={type === 'number' ? '0' : undefined}
              value={form[key] || ''}
              onChange={e => change(key, e.target.value)}
            />)}
      <div className="form-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
        >Cancel</Button>
        <Button type="submit" loading={busy}>Save record</Button>
      </div>
    </form>
  </Modal>;
}
