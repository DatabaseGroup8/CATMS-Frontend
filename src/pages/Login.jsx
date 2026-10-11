import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope, Users, CalendarCheck2 } from 'lucide-react';
import { GET, endpoints } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, Notice } from '../components/UI';
export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    authenticated
  } = useAuth();
  const [branches, setBranches] = useState([]);
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    branch_id: ''
  });
  useEffect(() => {
    if (authenticated) navigate('/app', {
      replace: true
    });
  }, [authenticated, navigate]);
  useEffect(() => {
    GET(endpoints.branches).then(r => setBranches(r.data || [])).catch(e => setErr(e.message));
  }, []);
  const change = e => setForm(s => ({
    ...s,
    [e.target.name]: e.target.value
  }));
  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoad(true);
    try {
      await login({
        ...form,
        branch_id: Number(form.branch_id)
      });
      navigate('/app', {
        replace: true
      });
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoad(false);
    }
  }
  return <div className="login-page">
    <div className="login-story">
      <div className="login-brand">
        <span className="login-brand-logo">
          <HeartPulse size={27} />
        </span>
        <div>
          <b>MedSync</b>
          <small>CLINIC MANAGEMENT SYSTEM</small>
        </div>
      </div>
      <div className="story-content">
        <div className="story-pill"><span className="live-dot" /> Your clinic, connected</div>
        <h1>Better care begins with a <em>better workflow.</em></h1>
        <p>One secure workspace for appointments, consultations, billing, insurance, and smarter decisions across your clinic.</p>
        <div className="story-benefits">
          <div>
            <span>
              <CalendarCheck2 size={20} />
            </span>
            <div>
              <b>Streamlined scheduling</b>
              <small>Coordinate doctors, patients and appointments</small>
            </div>
          </div>
          <div>
            <span>
              <Stethoscope size={20} />
            </span>
            <div>
              <b>Connected clinical care</b>
              <small>Keep your team's workflows in sync</small>
            </div>
          </div>
          <div>
            <span>
              <ShieldCheck size={20} />
            </span>
            <div>
              <b>Role-based access</b>
              <small>Relevant tools for each team member</small>
            </div>
          </div>
        </div>
      </div>
      <div className="story-bottom">CATMS • Clinic Appointment & Treatment Management</div>
      <div className="story-ornament story-ornament-1" />
      <div className="story-ornament story-ornament-2" />
    </div>
    <div className="login-panel">
      <div className="login-content">
        <div className="login-mobile-logo"><HeartPulse size={24} /> MedSync</div>
        <div className="login-kicker">WELCOME BACK</div>
        <h2>Sign in to your account</h2>
        <p className="login-description">Enter your staff credentials to access your clinic workspace.</p>
        <Notice
          message={err}
          type="error"
          onClose={() => setErr('')}
        />
        <form onSubmit={submit} className="stack-lg">
          <Select
            label="Clinic branch"
            required
            value={form.branch_id}
            onChange={e => setForm(s => ({
              ...s,
              branch_id: e.target.value
            }))}
            options={branches.map(b => ({
              value: b.branch_id,
              label: `${b.branch_name}${b.district ? ' · ' + b.district : ''}`
            }))}
            placeholder={branches.length ? 'Choose your branch' : 'No branches loaded'}
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            required
            placeholder="name@clinic.com"
            autoComplete="username"
            value={form.email}
            onChange={change}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={change}
          />
          <Button
            type="submit"
            loading={load}
            className="fullwidth"
            icon={ArrowRight}
          >Sign in to MedSync</Button>
        </form>
        <div className="login-security">
          <LockKeyhole size={16} />
          <span>Access is controlled by your branch and staff role.</span>
        </div>
      </div>
      <div className="login-footer">MedSync CATMS · Powered by Django & MySQL</div>
    </div>
  </div>;
}
