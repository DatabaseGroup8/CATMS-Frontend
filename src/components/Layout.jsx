import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
  Settings2,
  X,
  Building2,
  UserRound,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GET, endpoints } from '../lib/api';
const menus = {
  Receptionist: [
    ['/app', 'Overview', LayoutDashboard],
    ['/app/schedules', 'Appointments & slots', CalendarDays],
    ['/app/patients', 'Patients', Users],
    ['/app/consultations', 'Consultation & billing', FileHeart],
    ['/app/invoices', 'Invoices & payments', Wallet],
    ['/app/catalogue', 'Clinical catalogues', Pill]
  ],
  Doctor: [
    ['/app', 'Overview', LayoutDashboard],
    ['/app/doctor', 'My appointments', Stethoscope],
    ['/app/patients', 'Patient records', FileHeart],
    ['/app/catalogue', 'Clinical catalogues', ClipboardList]
  ],
  Manager: [
    ['/app', 'Overview', LayoutDashboard],
    ['/app/staff', 'Staff & doctors', Users],
    ['/app/insurance', 'Insurance management', ShieldCheck],
    ['/app/reports', 'Management reports', ChartNoAxesCombined],
    ['/app/catalogue', 'Specializations', Pill]
  ]
};
export function Layout() {
  const {
      user,
      logout
    } = useAuth(),
    nav = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [compact, setCompact] = useState(false);
  const [branchName, setBranchName] = useState('');
  const items = menus[user?.role] || [];
  useEffect(() => {
    let active = true;
    setBranchName('');
    if (!user?.branch_id) return;
    GET(endpoints.branches).then(response => {
      const branch = (response?.data || []).find(item => String(item.branch_id) === String(user.branch_id));
      if (active) setBranchName(branch?.branch_name || '');
    }).catch(() => {
      if (active) setBranchName('');
    });
    return () => {
      active = false;
    };
  }, [user?.branch_id]);
  return <div className={'shell ' + (compact ? 'shell-compact' : '')}>
    <aside className={'sidebar ' + (mobile ? 'sidebar-open' : '')}>
      <div className="brand">
        <div className="brand-mark">
          <HeartPulse size={25} />
        </div>
        {!compact && <div>
          <strong>MedSync</strong>
          <span>CLINIC MANAGEMENT</span>
        </div>}
        <button
          className="mobile-close"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
      </div>
      <div className="nav-group-title">
        {!compact ? 'WORKSPACE' : ''}
      </div>
      <nav className="sidebar-links">
        {items.map(([url, label, Icon]) => <NavLink
          key={url}
          to={url}
          end={url === '/app'}
          onClick={() => setMobile(false)}
          title={label}
          className={({
            isActive
          }) => 'nav-link ' + (isActive ? 'active' : '')}
        >
          <Icon size={19} />
          {!compact && <span>
            {label}
          </span>}
        </NavLink>)}
      </nav>
      <div className="sidebar-foot">
        {!compact && <div className="help-card">
          <div className="help-icon">
            <HeartHandshake size={18} />
          </div>
          <strong>Clinic workspace</strong>
          <p>Connected securely to your CATMS backend.</p>
        </div>}
        <button
          className="nav-link logout"
          onClick={() => {
            logout();
            nav('/login');
          }}
        >
          <LogOut size={19} />
          {!compact && <span>Sign out</span>}
        </button>
      </div>
    </aside>
    {mobile && <div
      className="mobile-scrim"
      onClick={() => setMobile(false)}
    />}
    <div className="main-container">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="top-icon desktop-collapse"
            onClick={() => setCompact(c => !c)}
          >
            <PanelLeftClose size={19} />
          </button>
          <button
            className="top-icon mobile-toggle"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>CATMS</span>
            <ChevronDown size={14} />
            <strong>{user?.role} workspace</strong>
          </div>
        </div>
        <div className="topbar-right">
          <div className="branch-chip">
            <Building2 size={16} />
            {branchName || 'Clinic branch'}
          </div>
          <div className="user-avatar">
            {(user?.full_name || 'U').slice(0, 1)}
          </div>
          <div className="user-identity">
            <strong>
              {user?.full_name}
            </strong>
            <small>
              {user?.role}
            </small>
          </div>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">MedSync CATMS <span>•</span> Connected application <span>•</span> {new Date().getFullYear()}</footer>
    </div>
  </div>;
}
