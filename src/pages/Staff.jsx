import React, { useState } from 'react';
import { Plus, RefreshCw, Stethoscope, UserPlus } from 'lucide-react';
import { POST, endpoints } from '../lib/api';
import { localDate, money } from '../lib/utils';
import {
  PageHeading,
  Panel,
  Button,
  DataTable,
  Modal,
  Input,
  Select,
  Notice,
  AsyncBlock,
  useRemote,
  Badge,
} from '../components/UI';
const base = {
  full_name: '',
  NIC: '',
  gender: '',
  DOB: '',
  email: '',
  contact_no: '',
  password: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  province: '',
  postal_code: '',
  salary: '',
  joined_date: localDate(),
  role: 'Receptionist',
  room_no: '',
  medical_licence_number: ''
};
export default function Staff() {
  const [modal, setModal] = useState(null),
    [message, setMessage] = useState('');
  const staff = useRemote(endpoints.staff),
    doctors = useRemote(endpoints.doctors);
  return <>
    <PageHeading
      eyebrow="MANAGER · TEAM"
      title="Staff & doctors"
      description="Manage staff registrations and clinical specializations for your authenticated branch."
      actions={<>
        <Button
          variant="outline"
          icon={Stethoscope}
          onClick={() => setModal('doctor')}
        >Register doctor</Button>
        <Button
          icon={UserPlus}
          onClick={() => setModal('staff')}
        >Register staff</Button>
      </>}
    />
    <Notice
      type="success"
      message={message}
      onClose={() => setMessage('')}
    />
    <Panel
      title="Branch staff"
      subtitle="All current employee accounts"
      actions={<Button
        variant="quiet"
        icon={RefreshCw}
        onClick={staff.refresh}
      >Refresh</Button>}
    >
      <AsyncBlock loading={staff.loading} error={staff.error}>
        <DataTable
          rows={staff.data?.data || []}
          searchable
          exportName="catms_staff"
          columns={[
            {
              key: 'employee_id',
              label: 'Employee ID'
            },
            {
              key: 'full_name',
              label: 'Name'
            },
            {
              key: 'email',
              label: 'Email'
            },
            {
              key: 'role',
              label: 'Role'
            },
            {
              key: 'status',
              label: 'Status',
              render: r => <Badge value={r.status} />
            },
            {
              key: 'joined_date',
              label: 'Joined'
            },
            {
              key: 'salary',
              label: 'Salary',
              render: r => money(r.salary)
            }
          ]}
        />
      </AsyncBlock>
    </Panel>
    <div className="with-space">
      <Panel title="Doctors & specializations" subtitle="Assign existing specialization catalogues to registered doctors">
        <AsyncBlock loading={doctors.loading} error={doctors.error}>
          <DataTable rows={doctors.data?.data || []} columns={[
            {
              key: 'doctor_id',
              label: 'Doctor ID'
            },
            {
              key: 'full_name',
              label: 'Doctor'
            },
            {
              key: 'specializations',
              label: 'Specializations'
            },
            {
              key: 'room_no',
              label: 'Room'
            },
            {
              key: 'assign',
              label: '',
              render: r => <Button
                variant="outline"
                onClick={() => setModal({
                  doctor: r
                })}
              >Assign specialization</Button>
            }
          ]} />
        </AsyncBlock>
      </Panel>
    </div>
    {modal === 'staff' || modal === 'doctor'
      ? <RegistrationForm
        type={modal}
        onClose={() => setModal(null)}
        onDone={() => {
          setModal(null);
          staff.refresh();
          doctors.refresh();
          setMessage('Account created successfully.');
        }}
      />
      : modal?.doctor
        ? <AssignForm
          doctor={modal.doctor}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            doctors.refresh();
            setMessage('Specialization assigned.');
          }}
        />
        : null}
  </>;
}
function RegistrationForm({
  type,
  onClose,
  onDone
}) {
  const [form, setForm] = useState({
      ...base
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const ch = (k, v) => setForm(s => ({
    ...s,
    [k]: v
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = {
      ...form
    };
    if (type === 'staff') {
      delete data.room_no;
      delete data.medical_licence_number;
    } else {
      delete data.role;
    }
    try {
      await POST(type === 'doctor' ? endpoints.registerDoctor : endpoints.registerStaff, data);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    title={type === 'doctor' ? 'Register new doctor' : 'Register new employee'}
    wide
    onClose={onClose}
  >
    <form onSubmit={submit} className="stack">
      <Notice type="error" message={error} />
      <div className="section-title">Personal details</div>
      <div className="form-grid">
        <Input
          label="Full name"
          required
          value={form.full_name}
          onChange={e => ch('full_name', e.target.value)}
        />
        <Input
          label="NIC"
          required
          value={form.NIC}
          onChange={e => ch('NIC', e.target.value)}
        />
        <Select
          label="Gender"
          required
          value={form.gender}
          onChange={e => ch('gender', e.target.value)}
          options={['Male', 'Female', 'Other']}
        />
        <Input
          label="Date of birth"
          type="date"
          required
          value={form.DOB}
          onChange={e => ch('DOB', e.target.value)}
        />
        <Input
          label="Email address"
          type="email"
          required
          value={form.email}
          onChange={e => ch('email', e.target.value)}
        />
        <Input
          label="Contact number"
          required
          value={form.contact_no}
          onChange={e => ch('contact_no', e.target.value)}
        />
      </div>
      <div className="section-title">Address</div>
      <div className="form-grid">
        {[
          ['address_line_1', 'Address line 1'],
          ['address_line_2', 'Address line 2'],
          ['city', 'City'],
          ['province', 'Province'],
          ['postal_code', 'Postal code']
        ].map(([k, label]) => <Input
          key={k}
          label={label}
          value={form[k]}
          onChange={e => ch(k, e.target.value)}
        />)}
      </div>
      <div className="section-title">Employment & account</div>
      <div className="form-grid">
        {type === 'staff'
          ? <Select
            label="Role"
            value={form.role}
            onChange={e => ch('role', e.target.value)}
            options={['Receptionist', 'Manager']}
          />
          : <>
            <Input
              label="Room number"
              required
              value={form.room_no}
              onChange={e => ch('room_no', e.target.value)}
            />
            <Input
              label="Medical licence number"
              required
              value={form.medical_licence_number}
              onChange={e => ch('medical_licence_number', e.target.value)}
            />
          </>}
        <Input
          label="Salary"
          required
          type="number"
          min="0"
          value={form.salary}
          onChange={e => ch('salary', e.target.value)}
        />
        <Input
          label="Joined date"
          type="date"
          value={form.joined_date}
          onChange={e => ch('joined_date', e.target.value)}
        />
        <Input
          label="Initial password"
          required
          type="password"
          minLength={8}
          value={form.password}
          onChange={e => ch('password', e.target.value)}
        />
      </div>
      <div className="form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >Cancel</Button>
        <Button loading={busy} type="submit">Create account</Button>
      </div>
    </form>
  </Modal>;
}
function AssignForm({
  doctor,
  onClose,
  onDone
}) {
  const specials = useRemote(endpoints.specializations);
  const [value, setValue] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await POST(endpoints.assignSpecialization(doctor.doctor_id), {
        specialization_id: Number(value)
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={`Specializations — ${doctor.full_name}`} onClose={onClose}>
    <form onSubmit={submit} className="stack">
      <Notice type="error" message={error} />
      <Select
        label="Specialization"
        required
        value={value}
        onChange={e => setValue(e.target.value)}
        options={(specials.data?.data || []).map(s => ({
          value: s.specialization_id,
          label: s.specialization_name
        }))}
      />
      <div className="form-footer">
        <Button
          variant="outline"
          type="button"
          onClick={onClose}
        >Cancel</Button>
        <Button loading={busy} type="submit">Assign specialization</Button>
      </div>
    </form>
  </Modal>;
}
