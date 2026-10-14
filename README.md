# CATMS-Frontend — MedSync

**MedSync / CATMS** is a Clinic Appointment and Treatment Management System developed for **CS3043** by **DatabaseGroup8**. This repository contains the **React web client** for staff workflows. It connects to a separate Django REST-style backend; the browser does **not** connect directly to MySQL.

**Repositories:** [Frontend](https://github.com/DatabaseGroup8/CATMS-Frontend) · [Backend](https://github.com/DatabaseGroup8/CATMS-Backend)

> **Deployment status:** The verified project setup uses React and Django running locally, with the Django application connected to a shared **Aiven MySQL** database. A publicly hosted website, Docker deployment, automated CI/CD, or public API URL is **not claimed here**.

## Team Contributions

Development was collaborative. The table below identifies contributions **supported by the Git commits available in the submitted project snapshot**; a commit identifies submitted changes, not exclusive authorship of the entire feature. Members should check their names and add any later commits before submission.

| Contributor / Git author | Documented frontend contributions | Git evidence |
| --- | --- | --- |
| **Shanuka Rathnayake** (`ShanukaRathnayake`) | Frontend project setup and configuration; API endpoint catalogue and request integration; appointment-management interface; consultation/billing and clinical catalogue pages. | [`90d2145`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/90d2145), [`0cacad5`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/0cacad5) |
| **Mus'ab Arafath** (`Mus'ab Arafath`) | Authentication context and shared login state; staff registration interface; appointment scheduling page; management report page. | [`fcca83b`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/fcca83b), [`b499392`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/b499392), [`43aa72a`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/43aa72a), [`8e22766`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/8e22766) |
| **Lasanthan-Km** (full name to confirm) | Application routes and role-based route guards; React entry point; responsive styling; shared formatting and CSV-export utilities. | [`24b8c96`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/24b8c96), [`74bbab3`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/74bbab3), [`96b4751`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/96b4751) |
| **Devindi Wickramarathna** (`Devindi Wickramarathna`) | Main app layout/navigation; dashboard; doctor workflow screens; insurance management interface. | [`5c625bf`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/5c625bf) |
| **Pabodha Gamaethige** (`pabodhagamaethige-jpg`; full name to confirm) | Reusable UI components; login page; patient-record interface; invoices and payment interface. | [`e8a8f2e`](https://github.com/DatabaseGroup8/CATMS-Frontend/commit/e8a8f2e) |

The backend's database procedures, security validation and transactional operations are implemented in the [backend repository](https://github.com/DatabaseGroup8/CATMS-Backend), not in React. Frontend authorship and backend/database authorship should be evaluated separately.

## Functional Overview

This frontend provides **three staff workspaces**:

| Role | Main frontend functionality |
| --- | --- |
| **Receptionist** | Search/register patients; browse and create doctor time slots; book general and emergency walk-in visits; manage appointment rescheduling and cancellation; finalize consultation billing; apply eligible insurance; collect partial or full patient payments; find existing invoices. |
| **Doctor** | View assigned appointments; identify emergency visits; mark visits completed; view patient history; record conditions; retrieve consultation summaries. |
| **Manager** | Register employees and doctors; view staff; assign doctor specializations; manage insurance packages and patient policies; resolve claims and record insurer settlements; view management reports. |

Clinical catalogues include medications, conditions, treatment categories and treatment services, subject to backend role rules. Receptionist booking and doctor visits are organized by **doctor sessions (`Time_Slot`)**; sessions can contain multiple queue-numbered appointments.

### Main frontend workflow

1. On `/login`, React loads available branches with `GET /api/auth/branches/`.
2. The employee selects a branch and submits email/password to `POST /api/auth/login/`.
3. Django verifies credentials and sends a signed JWT together with the employee's role and branch.
4. React stores the session in `sessionStorage` and displays the relevant role-specific workspace.
5. Subsequent requests send the JWT in the `Authorization: Bearer <token>` header.
6. Django validates permissions and executes SQL queries/stored procedures against MySQL; JSON responses update React tables, forms and charts.

**Security boundary:** React's menus and route guards improve usability, but **Django is authoritative** for role, branch and record-access checks. Authentication tokens are not database credentials.

### Appointment lifecycle

- **Create/list slots:** receptionists work with doctor sessions and can enable/disable slot availability.
- **Book:** register or select a patient, choose a slot and create a queue-numbered appointment.
- **Emergency walk-in:** records an appointment with type `EmergencyWalkIn`, displayed distinctly in the doctor's queue. In the inspected implementation, this still uses an existing session.
- **Reschedule/cancel:** the appointment-management interface calls the backend's reschedule/cancel endpoints. Cancelled visits remain in the database for reporting and audit.
- **Complete:** doctors mark an attended visit as completed; consultation finalization and invoice creation happen through a separate authorized workflow.

### Consultation, insurance and payments

A Receptionist finalizes a completed visit by entering the medical report and selecting catalogue items. Django/MySQL creates related consultation, prescription/treatment and invoice records. Insurance **policy assignment** (Manager) is distinct from **applying an eligible policy to an invoice** (Receptionist); policy dates and insurance-eligible charges matter. Patient payments may be partial and carry a request key to prevent unintended duplicate processing. Claim approval and insurer settlement are separate operations from cash received from the patient.

### Reporting

The Manager reports page presents:

1. Daily appointments by branch/status.
2. Doctor revenue.
3. Patients with outstanding balances.
4. Treatments by category.
5. Insurance versus out-of-pocket payments.
6. Additional medication-usage reporting.

Report tables/charts are based on backend responses, with CSV export utilities where available. They are **not generated from fabricated client-side records**.

## Technical Stack

| Layer | Used in this repository |
| --- | --- |
| UI | **React 19**, JavaScript and JSX (not TypeScript) |
| Bundler/dev server | **Vite 7** with `@vitejs/plugin-react` |
| Navigation | **React Router 7** |
| Icons | **lucide-react** |
| Visual reports | **Recharts** |
| Styles | Custom responsive CSS (`src/styles.css`) |
| HTTP | Native browser **`fetch`**, via helpers in `src/lib/api.js` |
| Authentication state | React context; JWT and user data in browser `sessionStorage` |
| Backend | Separate Django/Python application and external MySQL service |

This codebase does **not** use Axios, Pydantic, FastAPI, PostgreSQL, Docker or a TypeScript build pipeline.

## Repository Structure

```text
CATMS-Frontend/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js              # /api proxy -> local Django :8000
├── .env.example                # optional Vite API origin
├── .gitignore
├── README.md
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # routes, protected workspaces
    ├── styles.css              # responsive styling
    ├── context/
    │   └── AuthContext.jsx     # user/JWT login state
    ├── lib/
    │   ├── api.js              # HTTP helpers and endpoint map
    │   └── utils.js            # date, currency and CSV utilities
    ├── components/
    │   ├── Layout.jsx          # role-aware sidebar/header
    │   └── UI.jsx              # shared tables, inputs, modals
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Scheduling.jsx
        ├── AppointmentManagement.jsx
        ├── Patients.jsx
        ├── Doctor.jsx
        ├── Catalogues.jsx
        ├── Consultations.jsx
        ├── Invoices.jsx
        ├── Staff.jsx
        ├── Insurance.jsx
        └── Reports.jsx
```

`AppointmentManagement.jsx` is used by the scheduling workflow; it is not necessarily a separate top-level React route.

## Getting Started — Local Development

### Prerequisites

- A recent **Node.js LTS** version with npm (Node.js 22+ recommended for the inspected Vite setup).
- **Git** and an editor such as VS Code.
- A working [CATMS backend](https://github.com/DatabaseGroup8/CATMS-Backend) at `http://127.0.0.1:8000`.
- Backend access to the already initialized MySQL database. **The React client does not need local MySQL.**

### Clone and install

```powershell
# Use a project folder of your choice
 git clone https://github.com/DatabaseGroup8/CATMS-Frontend.git
 cd CATMS-Frontend
 npm ci
```

If `npm ci` fails because the lockfile does not match `package.json`, fix the lockfile in the repository or use `npm install` to regenerate it and commit the intentional change.

### Configure the API connection

The default, simplest approach uses the **Vite development proxy** from `vite.config.js`:

```text
Browser http://127.0.0.1:5173
  └── /api/*  -> http://127.0.0.1:8000/api/* (Django)
                      └── MySQL on Aiven
```

The `.env.example` includes an optional `VITE_API_BASE_URL=`. Leave it **empty** for local proxying; no frontend `.env` is required. If you set a separate server origin, use the **origin without an extra `/api` suffix**, because `src/lib/api.js` already calls paths starting with `/api/`:

```dotenv
# Only if you need direct requests to a separately hosted API origin:
VITE_API_BASE_URL=https://your-api-host.example
```

Cross-origin deployment requires appropriate CORS and HTTPS settings on Django. Never put database credentials, JWT signing secrets or private keys in a `VITE_` variable: Vite exposes such values to the browser bundle.

### Start the frontend

```powershell
npm run dev
```

Open **http://127.0.0.1:5173/login**. Select the correct branch and use an existing staff account from the shared demo database. The Django server must run separately; opening `index.html` directly will not start the application.

### Build and preview

```powershell
npm run build
npm run preview
```

The output is in `dist/`. `npm run preview` is a local build preview, **not** a production hosting service. There is no `tsc --noEmit` step because this repository uses JavaScript/JSX, not TypeScript.

## API Integration Reference

React endpoints are centralized in `src/lib/api.js`. Representative operations:

| Frontend action | HTTP endpoint | Backend domain |
| --- | --- | --- |
| Choose branch | `GET /api/auth/branches/` | Accounts |
| Sign in | `POST /api/auth/login/` | Accounts |
| Find patients | `GET /api/registration/search/?q=...` | Registration |
| Register patient | `POST /api/registration/patients/quick-register/` | Registration |
| View/create doctor sessions | `GET /api/registration/schedules/daily/`, `POST /api/registration/time-slots/create/` | Registration |
| Book appointment | `POST /api/registration/appointments/book/` | Registration |
| Reschedule/cancel | `POST /api/registration/appointments/{id}/reschedule/`, `POST /api/registration/appointments/{id}/cancel/` | Registration |
| Complete visit | `POST /api/clinical/appointments/{id}/complete/` | Clinical |
| Finalize consultation and invoice | `POST /api/billing/consultations/finalize/` | Billing |
| View/apply invoice insurance | `GET /api/billing/invoices/{id}/insurances/`, `POST /api/billing/invoices/{id}/insurance/` | Billing |
| Record patient payment | `POST /api/billing/payment/process/` | Billing |
| Management reports | `GET /api/reporting/...` | Reporting |

For the full current route definitions, consult `src/lib/api.js` and the backend app `urls.py` files.

## Testing Checklist

- [ ] Sign in as Manager, Receptionist and Doctor using the correct branch; verify access restrictions.
- [ ] View a patient, search by partial name/NIC/phone where enabled, and register a dummy patient.
- [ ] Book two patients into the same session and verify distinct queue numbers.
- [ ] Record an emergency walk-in and verify its distinctive doctor-side label.
- [ ] Reschedule and cancel a Scheduled appointment; refresh and verify status/history.
- [ ] Complete an appointment and finalize the consultation into an itemized invoice.
- [ ] Apply eligible insurance **before** patient payment; test a partial payment and the balance.
- [ ] Verify Manager policy assignment, claims, insurer settlement and reports.
- [ ] Disconnect Django temporarily and verify API errors are shown rather than invented records.
- [ ] Run `npm run build` on the team's current checkout and resolve any real build issues.

## Known Constraints and Security Notes

- The React frontend is **not** an independent backend or patient portal. There are three staff roles in the inspected app.
- Emergency recording uses existing doctor sessions; it is **not** an emergency triage system.
- Data updates made by other users appear when relevant queries refresh; not all screens use real-time push updates.
- Insurance selection requires eligible policies/visit dates and eligible charges; it is not automatic after policy assignment.
- Some more recent UI improvements and fixes may exist only in teammates' local working trees and are **not guaranteed to be in the examined ZIP**. Check the actual merged repository before claiming them as implemented.
- JWTs are stored in `sessionStorage`. This is a development implementation; sensitive production deployments need a thorough security review, HTTPS, authorization checks and secure session handling.
- Never commit `.env`, passwords, tokens, `node_modules/` or `dist/`.
- Use **synthetic** patient and billing records for coursework/demo purposes.


**Related repository:** [CATMS-Backend README](https://github.com/DatabaseGroup8/CATMS-Backend#readme).
