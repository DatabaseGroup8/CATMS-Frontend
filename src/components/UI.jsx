import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import { downloadCSV, str, titleCase } from '../lib/utils';
import { GET } from '../lib/api';
export function Button({
  children,
  variant = 'primary',
  loading = false,
  icon: Icon,
  ...props
}) {
  return <button
    {...props}
    disabled={props.disabled || loading}
    className={`btn btn-${variant} ${props.className || ''}`}
  >
    {loading
      ? <LoaderCircle className="spin" size={16} />
      : Icon
        ? <Icon size={16} />
        : null}
    {children}
  </button>;
}
export function IconButton({
  icon: Icon,
  label,
  ...props
}) {
  return <button
    className="icon-btn"
    title={label}
    aria-label={label}
    {...props}
  >
    <Icon size={17} />
  </button>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions
}) {
  return <div className="page-heading">
    <div>
      <div className="eyebrow">
        {eyebrow}
      </div>
      <h1>
        {title}
      </h1>
      {description && <p>
        {description}
      </p>}
    </div>
    {actions && <div className="actions">
      {actions}
    </div>}
  </div>;
}
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = ''
}) {
  return <section className={`panel ${className}`}>
    <div className="panel-head">
      <div>
        <h2>
          {title}
        </h2>
        {subtitle && <p>
          {subtitle}
        </p>}
      </div>
      {actions && <div className="actions">
        {actions}
      </div>}
    </div>
    <div className="panel-body">
      {children}
    </div>
  </section>;
}
export function Field({
  label,
  children,
  hint,
  required
}) {
  return <label className="field">
    <span className="field-label">
      {label}
      {required && <span className="required"> *</span>}
    </span>
    {children}
    {hint && <small>
      {hint}
    </small>}
  </label>;
}
export function Input({
  label,
  hint,
  required,
  ...props
}) {
  return <Field
    label={label}
    hint={hint}
    required={required}
  >
    <input
      className="input"
      required={required}
      {...props}
    />
  </Field>;
}
export function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  required = false,
  ...props
}) {
  return <Field label={label} required={required}>
    <select
      className="input"
      value={value ?? ''}
      onChange={onChange}
      required={required}
      {...props}
    >
      <option value="">
        {placeholder}
      </option>
      {options.map(o => {
        const x = typeof o === 'object' ? o : {
          value: o,
          label: o
        };
        return <option key={x.value} value={x.value}>
          {x.label}
        </option>;
      })}
    </select>
  </Field>;
}
export function Textarea({
  label,
  required,
  ...props
}) {
  return <Field label={label} required={required}>
    <textarea
      className="input textarea"
      required={required}
      {...props}
    />
  </Field>;
}
export function Notice({
  message,
  type = 'info',
  onClose
}) {
  if (!message) return null;
  return <div className={`notice notice-${type}`}>
    {type === 'success'
      ? <CheckCircle2 size={18} />
      : type === 'error'
        ? <AlertCircle size={18} />
        : <Info size={18} />}
    <span>
      {message}
    </span>
    {onClose && <button aria-label="Dismiss" onClick={onClose}>
      <X size={16} />
    </button>}
  </div>;
}
export function Badge({
  value
}) {
  const v = String(value ?? '').toLowerCase();
  const status = ['completed', 'approved', 'active', 'open', 'finalized', 'paid', 'success'].some(s => v === s) || v === 'true' ? 'green' : ['cancelled', 'rejected', 'inactive', 'closed', 'unavailable'].some(s => v === s) || v === 'false' ? 'red' : ['scheduled', 'submitted', 'pending', 'not started'].some(s => v === s) ? 'amber' : 'neutral';
  return <span className={`badge badge-${status}`}>
    {String(value ?? '—')}
  </span>;
}
export function Empty({
  title = 'No records found',
  message = 'There is no matching data in your connected database.'
}) {
  return <div className="empty-state">
    <div className="empty-icon">
      <Search size={23} />
    </div>
    <strong>
      {title}
    </strong>
    <p>
      {message}
    </p>
  </div>;
}
export function Modal({
  title,
  onClose,
  children,
  wide = false
}) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return <div
    className="modal-overlay"
    onMouseDown={e => e.target === e.currentTarget && onClose()}
  >
    <div
      className={'modal ' + (wide ? 'modal-wide' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-header">
        <h2>
          {title}
        </h2>
        <IconButton
          icon={X}
          label="Close"
          onClick={onClose}
        />
      </div>
      <div className="modal-content">
        {children}
      </div>
    </div>
  </div>;
}
export function DataTable({
  rows = [],
  columns = [],
  empty = 'No records found',
  exportName,
  searchable = false,
  rowClassName
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows, q]);
  const matched = q ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) : rows;
  const pageSize = 12;
  const count = Math.ceil(matched.length / pageSize);
  return <div className="table-wrap"><div className="table-tools">
    {searchable && <div className="search-input">
      <Search size={16} />
      <input
        placeholder="Search records..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />
    </div>}
    <span className="table-total">{matched.length} records</span>
    {exportName && <Button
      icon={Download}
      variant="quiet"
      onClick={() => downloadCSV(matched, exportName)}
      disabled={!matched.length}
    >Export CSV</Button>}
  </div>{matched.length
    ? <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>
              {c.label}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {matched.slice(page * pageSize, (page + 1) * pageSize).map((r, i) => <tr
            key={r.id ?? r.invoice_id ?? r.appointment_id ?? r.employee_id ?? i}
            className={rowClassName ? rowClassName(r) : ''}
          >
            {columns.map(c => <td key={c.key}>
              {c.render ? c.render(r) : str(r[c.key])}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    : <Empty message={empty} />} {count > 1 && <div className="pager">
    <span>Page {page + 1} of {count}</span>
    <IconButton
      icon={ChevronLeft}
      label="Previous"
      disabled={page === 0}
      onClick={() => setPage(p => p - 1)}
    />
    <IconButton
      icon={ChevronRight}
      label="Next"
      disabled={page >= count - 1}
      onClick={() => setPage(p => p + 1)}
    />
  </div>}</div>;
}
export function useRemote(path, query = {}, enabled = true) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: ''
  });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(query);
  useEffect(() => {
    if (!enabled || !path) {
      setState({
        data: null,
        loading: false,
        error: ''
      });
      return;
    }
    const controller = new AbortController();
    setState(s => ({
      ...s,
      loading: true,
      error: ''
    }));
    GET(path, query, {
      signal: controller.signal
    }).then(data => setState({
      data,
      loading: false,
      error: ''
    })).catch(e => {
      if (e.name !== 'AbortError') setState(s => ({
        ...s,
        loading: false,
        error: e.message
      }));
    });
    return () => controller.abort();
  }, [path, key, version, enabled]);
  return {
    ...state,
    refresh: () => setVersion(x => x + 1)
  };
}
export function AsyncBlock({
  loading,
  error,
  children,
  retry
}) {
  if (loading) return <div className="loading"><LoaderCircle size={22} className="spin" /> Loading live records...</div>;
  if (error) return <Notice
    type="error"
    message={error}
    onClose={retry}
  />;
  return children;
}
export function Stat({
  label,
  value,
  icon: Icon,
  accent = 'teal',
  sub
}) {
  return <div className="stat-card">
    <div className="stat-top">
      <span>
        {label}
      </span>
      <span className={'stat-icon ' + accent}>
        <Icon size={20} />
      </span>
    </div>
    <div className="stat-value">
      {value}
    </div>
    {sub && <div className="stat-sub">
      {sub}
    </div>}
  </div>;
}
