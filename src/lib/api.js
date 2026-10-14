/** Single backend transport: never substitutes demo data for failed requests. */
const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const getToken = () => sessionStorage.getItem('catms_token');
export const setToken = token => token ? sessionStorage.setItem('catms_token', token) : sessionStorage.removeItem('catms_token');
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
export function buildQuery(query = {}) {
  const q = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? '?' + s : '';
}
export async function api(path, {
  method = 'GET',
  data,
  signal,
  auth = true
} = {}) {
  const headers = {
    Accept: 'application/json'
  };
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach Django. Check that python manage.py runserver is running on port 8000.', 0, null);
  }
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json().catch(() => null) : null;
  if (!response.ok || body?.status === 'error' || body?.status === 'critical_error' || body?.success === false) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent('catms-unauthorized'));
    throw new ApiError(body?.message || body?.error || `Request failed (${response.status})`, response.status, body);
  }
  return body;
}
export const GET = (path, query, options = {}) => api(path + buildQuery(query), options);
export const POST = (path, data) => api(path, {
  method: 'POST',
  data
});
export const PATCH = (path, data) => api(path, {
  method: 'PATCH',
  data
});
export const endpoints = {
  branches: '/api/auth/branches/',
  login: '/api/auth/login/',
  staff: '/api/auth/staff/',
  registerStaff: '/api/auth/register/staff/',
  registerDoctor: '/api/auth/register/doctor/',
  doctors: '/api/registration/doctors/',
  patients: '/api/registration/search/',
  patient: id => `/api/registration/patients/${id}/`,
  patientAppointments: '/api/registration/patient-appointments/',
  registerPatient: '/api/registration/patients/quick-register/',
  schedule: '/api/registration/schedules/daily/',
  createSlot: '/api/registration/time-slots/create/',
  availability: id => `/api/registration/time-slots/${id}/availability/`,
  book: '/api/registration/appointments/book/',
  manageAppointments: '/api/registration/appointments/manage/',
  rescheduleAppointment: id => `/api/registration/appointments/${id}/reschedule/`,
  cancelAppointment: id => `/api/registration/appointments/${id}/cancel/`,
  doctorAppointments: '/api/clinical/doctors/me/appointments/',
  complete: id => `/api/clinical/appointments/${id}/complete/`,
  history: id => `/api/clinical/patient-history/${id}/`,
  consultationSummary: '/api/clinical/get-consultation-summary',
  consultationSearch: '/api/clinical/consultations/search/',
  addPatientCondition: '/api/clinical/patient-condition/add/',
  meds: '/api/clinical/medications/search/',
  addMed: '/api/clinical/medications/add/',
  treatments: '/api/clinical/treatments/search/',
  addTreatment: '/api/clinical/treatments/catalogue/add/',
  conditionCategories: '/api/clinical/conditions/categories/',
  addConditionCategory: '/api/clinical/conditions/category/add/',
  conditions: '/api/clinical/conditions/',
  addCondition: '/api/clinical/conditions/add/',
  treatmentCategories: '/api/clinical/treatments/categories/',
  addTreatmentCategory: '/api/clinical/treatments/category/add/',
  specializations: '/api/clinical/specializations/',
  addSpecialization: '/api/clinical/specializations/add/',
  assignSpecialization: id => `/api/clinical/doctors/${id}/specializations/`,
  completed: '/api/billing/completed-appointments/',
  finalize: '/api/billing/consultations/finalize/',
  invoices: '/api/billing/invoices/',
  invoice: id => `/api/billing/invoices/${id}/summary/`,
  policies: id => `/api/billing/invoices/${id}/insurances/`,
  applyInsurance: id => `/api/billing/invoices/${id}/insurance/`,
  pay: '/api/billing/payment/process/',
  packages: '/api/billing/insurance/packages/list/',
  addPackage: '/api/billing/insurance/packages/',
  assignPolicy: '/api/billing/insurance/patients/assign/',
  claims: '/api/billing/insurance/claims/',
  resolve: id => `/api/billing/invoices/${id}/insurance/resolve/`,
  settlement: id => `/api/billing/invoices/${id}/insurance/settlement/`,
  reportDaily: '/api/reporting/appointments/branch-daily/',
  reportDoctors: '/api/reporting/revenue/doctors/',
  reportOutstanding: '/api/reporting/outstanding/patients/',
  reportTreatments: '/api/reporting/treatments/categories/',
  reportInsurance: '/api/reporting/insurance-vs-out-of-pocket/',
  reportMedication: '/api/reporting/medication-usage/'
};
