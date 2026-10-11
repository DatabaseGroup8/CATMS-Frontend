# MedSync — CATMS React frontend

A real, role-based React frontend for the **exact endpoints in the uploaded `CATMS(1).zip` Django backend**. There is no local fake API, no hardcoded patient/doctor data and no mock-data fallback if Django is down. Every table, chart, select option and financial operation that displays clinical data uses the backend APIs.

## Run locally on Windows

**Prerequisites:** MySQL `catms_local` populated with your test data; Django 5.2 backend running; Node.js 22 LTS recommended; npm.

1. Keep MySQL Server running.
2. In one PowerShell terminal start the backend:
   ```powershell
   cd D:\CATMS
   .\.venv\Scripts\Activate.ps1
   python manage.py runserver 127.0.0.1:8000
   ```
3. Extract this frontend folder, e.g. to `D:\CATMS_frontend` (separate from the Django folder).
4. In a **second** PowerShell terminal:
   ```powershell
   cd D:\CATMS_frontend
   npm install
   npm run dev
   ```
5. Open **http://127.0.0.1:5173/login** in Chrome or Edge.
6. Select a branch, then sign in with the actual test account created by your seed script. Your chosen seed password is *not included in this project*.

The Vite development server proxies `/api/**` requests to `http://127.0.0.1:8000`. **Do not open the frontend by double-clicking `index.html`** and do not browse port 8000 expecting the React login page. The frontend lives at port **5173**; Django lives at **8000**.

You don't need an `.env` file for local use. `VITE_API_BASE_URL` may be set in a frontend `.env` when deploying to a separate API origin; if left blank, the Vite proxy is used. Restart Vite after changing environment variables. CORS must be configured on Django if React and Django have different origins in deployed environments.

## File structure

```
src/
  App.jsx                      Role-restricted React Router routes
  main.jsx                     React entry point
  styles.css                   Responsive MedSync design
  context/AuthContext.jsx      Manager/Doctor/Receptionist JWT session
  lib/api.js                   Backend endpoints and GET/POST/PATCH transport
  lib/utils.js                 Date/money display, CSV export
  components/Layout.jsx        Sidebar/top navigation by role
  components/UI.jsx            Forms, badges, tables, modals, errors, data hook
  pages/
    Login.jsx                  Real branch selection and JWT login
    Dashboard.jsx              Live role-based overview
    Scheduling.jsx             Single slot, availability toggle, booking, quick register
    Patients.jsx               Search, details, prior appointments and clinical history
    Doctor.jsx                 Doctor queue, completion and consultation lookup
    Catalogues.jsx             Medication/treatment/condition/specialization CRUD additions
    Consultations.jsx          Medical report + items -> finalized invoice -> insurance -> payment
    Invoices.jsx               Search old invoices and receive additional patient payments
    Staff.jsx                  Manager staff/doctor registration and specialty assignment
    Insurance.jsx              Packages, patient policy, claims, adjudication, insurer receipts
    Reports.jsx                Five management reports + medication-usage report
```

## Access by role

- **Receptionist:** Appointments & slots, Patients, Consultation & billing, Invoices & payments, Clinical catalogues. Unlimited queue-based bookings are supported; a slot's `available` flag alone controls bookability.
- **Doctor:** My appointments and completion, patient records/history, adding patient conditions, reading clinical catalogues and viewing authorized consultations.
- **Manager:** Register staff/doctors, assign specializations, configure insurance packages and patient policies, approve/reject claims, record insurer receipts, and view/export six reports.

Each write request is sent to Django; MySQL stored procedures own transactions for booking, clinical finalization, insurance, and payments. Frontend invoice totals are only estimates until the database confirms the final amount. Financial display distinguishes **insurer allocation** from **money actually received**. A fresh UUID is generated for each intended patient payment and reused on transport retries only.

## Backend constraints not solvable from the frontend

This ZIP contains **frontend only** and does not modify your Django backend. In the supplied Django URL configuration:

- There is **no appointment cancellation or rescheduling endpoint**. The frontend does not invent either operation or pretend to perform it. If the lecturer requires them, the backend team must add and test these APIs, then link the buttons.
- There is **no time-slot bulk-generation API**; this was deliberately deferred. The provided interface creates individual slots and toggles their availability.
- There is **no invoice edit, clinical-record edit, prescription-signature/doctor-approval or generic object deletion endpoint**. Once a consultation is finalized, the UI uses the existing supported workflow.
- The doctor schedule payload lacks the `doctor_id` field, so appointment cards show the doctor's name while slot creation uses the separate doctor-list endpoint. This is handled without inventing the ID.
- Some legacy clinical endpoints have authorization concerns identified during backend review; frontend route guards are **not** a substitute for server-side authorization.
- Insurer settlements are recorded in the current database claim totals but not in a dedicated payment ledger; your backend design governs financial auditing.

If an API request fails, the UI shows an error rather than fake records.

## Testing checklist

1. `GET /api/auth/branches/` from Django returns your sample branches.
2. Test each of **Manager, Doctor, Receptionist** logins at `/login`.
3. Receptionist: find doctor sessions for an existing date, create a session, close/reopen it, search/create patient, and book at least two patients in one session. Verify distinct queue tokens.
4. Doctor: log in separately; navigate to that date and complete one assigned appointment.
5. Receptionist: finalize that appointment with authorized medical report and at least one medication or treatment. Confirm the resulting invoice ID and subtotal.
6. Manager: assign a policy to a patient before invoice insurance application, when relevant.
7. Receptionist: apply insurance to an eligible treatment, record a **partial** patient payment and later collect the remainder from **Invoices & payments**. Confirm remaining balance.
8. Manager: approve/reject a submitted claim, record insurer settlement, check outstanding balances and all five required reports.
9. Check branch isolation and role blocking by signing in using another branch's staff account.
10. Stop Django and verify the frontend displays a connection failure—not fictitious data.

### Dependencies / build verification

Project is configured for React 19, React Router 7, Recharts 2, Lucide icons and Vite 7. It requires `npm install` in an internet-connected environment. JSX files were checked with the TypeScript JSX parser; **this environment could not complete npm dependency installation and therefore could not execute a Vite production build or real browser/end-to-end API tests.** On your machine run:

```powershell
npm install
npm run build
npm run dev
```

If `npm run build` reports an error, please send the terminal output. Your real MySQL server and Django are not accessible from this container, so the actual API functions must be verified on your machine.

### Production security note

JWT lives in **sessionStorage** until the tab session ends or the user signs out. This is a practical development-session approach, not an HttpOnly refresh-cookie system. Your production version should add secure refresh/session handling, server-side authorization checks, HTTPS, audit logging, and medication/diagnosis approval controls. Never upload your backend `.env`, login passwords, or tokens to the frontend repository. Use only synthetic patient data in your development database.


## Appointment rescheduling and cancellation (Oct 2026)

The Receptionist **Appointments & time slots** page now contains **Manage appointments** with searchable appointments for the selected date and Reschedule/Cancel actions on Scheduled visits.

**Backend setup required:** copy the updated `registration/views.py` and `registration/urls.py`, then apply the additive `database/appointment_changes.sql` to your existing MySQL database. Full setup and API contract: `CATMS_Reschedule_Cancel_Implementation.md` provided with the update.

The three new APIs are `GET /api/registration/appointments/manage/`, `POST /api/registration/appointments/<id>/reschedule/`, and `POST /api/registration/appointments/<id>/cancel/`.

Completed and Cancelled appointments are read-only. The new SQL audit table preserves a history of receptionist changes, and the original visit type (including emergency walk-in) is retained when moving a booking.
