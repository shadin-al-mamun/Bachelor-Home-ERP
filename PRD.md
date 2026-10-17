# Bachelor Home ERP
## Product Requirements Document (PRD)
**Version:** 3.0  
**Status:** Consolidated requirements baseline  
**Prepared:** 15 October 2026  
**Product owner:** Bachelor Home  
**Primary deployment:** Web application + installable mobile PWA  
**Technology baseline:** PostgreSQL + Supabase

---

## 1. Executive Summary

Bachelor Home ERP is a private hostel-management system for managing buildings, flats, rooms, seats, boarders, allocations, rent, receipts, income, expenses, manager cash custody, optional meals, user access, and operational reporting. It will be usable on desktop/laptop browsers and mobile devices as a responsive web application and installable Progressive Web App (PWA).

The system is intended initially for one hostel business, with 15+ users and internet connectivity. All operational data will be stored in PostgreSQL through Supabase. Google Sheets is not the primary database; it may be used for optional import/export or reporting workflows.

The interface must support Bangla and English, with a language selector. The architecture should allow future expansion without hard-coded limits on buildings, flats, rooms, or seats.

## 2. Goals and Success Criteria

### 2.1 Goals
- Centralize hostel operations and financial records.
- Maintain accurate, traceable manager-wise cash balances.
- Let boarders self-manage meal selections within defined cut-off rules.
- Give administrators and authorized managers timely operational visibility.
- Produce reliable daily, weekly, monthly, and date-range reports.
- Protect sensitive records using role-based access control and audit trails.
- Support desktop web and mobile PWA usage from a shared codebase.

### 2.2 Success criteria
- No duplicate receipt numbers or overlapping active seat allocations.
- Every financial transaction is attributable to a user and timestamp.
- Daily manager cash reconciliation shows expected cash, counted cash, and variance.
- Meal changes appear promptly on authorized dashboards and correctly affect date-wise/flat-wise meal totals.
- Reports reconcile to underlying transactions and do not double-count internal transfers.
- Users cannot access records outside their permissions.
- Backup and restore procedures are documented and tested.

## 3. Scope

### 3.1 In scope
1. Authentication and user administration.
2. Role and permission management.
3. Buildings, flats, rooms, seats, and configurable capacities.
4. Boarder registration and profile management.
5. Seat allocation, cancellation, transfer, and history.
6. Rent, bills, receipts, dues, discounts, penalties, and security deposits.
7. Income, expenses, categories, flat-wise expenses, and money transfers.
8. Manager-wise cash custody, deposits to owner, handovers, and reconciliation.
9. Optional meal management with boarder self-service ON/OFF.
10. Flat-wise and date-wise meal planning/counts.
11. Dashboards, reports, exports, audit logs, and backup monitoring.
12. Bangla/English UI.
13. Responsive desktop/mobile PWA.

### 3.2 Out of scope for the initial release
- Public multi-tenant SaaS onboarding for unrelated hostels.
- Offline-first operation when there is no internet connection.
- Automated bank integrations unless separately approved.
- Payroll, tax filing, or statutory accounting beyond agreed hostel reporting.
- Native Android/iOS store apps as a first requirement; the PWA should meet initial mobile needs.

## 4. Users and Roles

The system must support configurable roles and granular permissions. Suggested baseline roles:

- **Owner / Super Admin:** Full system access, settings, all reports, approvals, user/role management.
- **Administrator:** Operational and financial access as granted by the owner.
- **Manager:** Only assigned buildings/flats and modules; can be granted meal reports, collections, expenses, cash custody, or other specific permissions.
- **Accountant / Finance User:** Receipts, bills, expenses, ledgers, cash/bank reports as permitted.
- **Meal Operator / Kitchen User:** View meal counts and assigned meal operations; no unrelated financial or personal data.
- **Boarder:** Own registration portal, own profile/status, own meal ON/OFF, and permitted own account information.
- **Read-only Auditor:** View authorized reports and audit history without editing.

Permissions must be configurable per role and, where needed, per individual user and building/flat. A manager must not automatically see all flats unless authorized.

## 5. Boarder Access and Registration Portal

Before application approval, a prospective boarder may:
- Complete the registration/application form.
- Submit the application.
- View their own application status.

Before approval, they must not access the main dashboard, other boarders' information, financial modules, meal controls, or other ERP features.

After approval and account activation, the boarder may access only their permitted self-service features. A boarder must never be able to read or modify another boarder's records by changing a URL or request parameter.

## 6. Functional Requirements

### 6.1 Authentication and account security
- Secure login, logout, password reset, and account activation/deactivation.
- Supabase Auth for authentication.
- Role-based access control enforced in the backend/database, not only hidden in the UI.
- Session expiry and secure password handling.
- Record login and sensitive administrative actions where appropriate.
- Prevent deactivated users from continuing to access protected records.

### 6.2 Building, flat, room, and seat management
- Admin can create any number of buildings.
- Each building can contain any number of flats.
- Each flat can contain any number of rooms.
- Each room can contain any number of seats.
- Do not implement arbitrary fixed maximums in the application.
- Support active/inactive status and descriptions.
- Store seat-specific rent because rent may differ between seats.
- Prevent allocation to inactive or unavailable seats.
- Show occupancy, vacancy, and allocation history.

Suggested core fields:
- Building: BuildingID, BuildingCode, BuildingName, Address, Status, Description, CreatedAt, UpdatedAt.
- Flat: FlatID, BuildingID, FlatCode, FlatName, Address/Description, Status, CreatedAt, UpdatedAt.
- Room: RoomID, FlatID, RoomCode, RoomName, RoomType, Capacity, Status, Description, CreatedAt, UpdatedAt.
- Seat: SeatID, RoomID, SeatCode, SeatName, SeatType, RentAmount, Status, Description, CreatedAt, UpdatedAt.

### 6.3 Boarder management
- Register, view, update, approve/reject, deactivate, and mark boarders as leaving.
- Support photo URL/storage, student ID, institution, department, session, contact information, guardian details, addresses, admission/leaving dates, status, remarks, and audit fields.
- Preserve historical financial and allocation records after a boarder leaves.
- Avoid hard deletion of records that have financial or allocation history.

Suggested fields include:
BorderID, BorderCode, FullName, PhotoURL, StudentID, Institution, Department, Session, Mobile, Email, GuardianName, GuardianMobile, PresentAddress, PermanentAddress, AdmissionDate, LeavingDate, Status, Remarks, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy.

### 6.4 Seat allocation and history
- Allocate an available seat to an approved boarder.
- Record allocation date, start/end dates, monthly rent, security deposit, status, remarks, creator, and timestamps.
- Cancel or end an allocation with a reason and effective date.
- Support seat transfer and maintain history.
- Enforce a database-level rule preventing conflicting active allocations for the same seat.
- Preserve historical rent and allocation terms even if current seat rent changes.
- Reports: allocation history, seat history, room occupancy, vacancy, upcoming departures, and current occupants.

Suggested allocation fields:
AllocationID, BorderID, SeatID, AllocationDate, StartDate, EndDate, MonthlyRent, SecurityDeposit, Status, Remarks, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy.

### 6.5 Rent, billing, receipts, and dues
- Generate recurring monthly rent charges and other configured charges.
- Allow seat-specific rent, approved adjustments, discounts, and penalties.
- Generate unique receipt numbers.
- Record receipt date/time, payer, boarder, charge allocation, amount, payment method, collector/manager, and reference.
- Support partial payments and payment allocation to outstanding charges.
- Show each boarder's opening balance, charges, payments, adjustments, and closing balance.
- Void or reverse receipts through an authorized correction workflow; do not silently delete financial transactions.
- Avoid counting a receipt as income more than once.
- Report paid, partially paid, unpaid, overdue, and advance balances.

### 6.6 Income, expenses, and transfers
- Maintain configurable income and expense categories.
- Record income and expenses with date, amount, category, payment account, flat/building where applicable, description, receipt/reference, attachment, creator, and approval status.
- Support flat-wise expenses and miscellaneous expenses.
- Support transfers between cash, bank, mobile financial service, owner, and manager custody accounts as applicable.
- Transfers must be recorded as movements between accounts, not as new income or expense.
- Provide approval limits and workflows configurable by the owner.
- Preserve audit history for edits, reversals, and approvals.

### 6.7 Manager cash custody and daily reconciliation
This is a mandatory control feature.

For every manager/cash custodian and business date, calculate:

**Expected closing cash = opening cash + cash receipts + other cash inflows − cash expenses − cash deposited to owner − cash handed over to another custodian.**

- Opening cash must carry forward from the prior finalized day's closing cash.
- Distinguish cash from bank/mobile-financial-service balances.
- Record each deposit to the owner: amount, date/time, recipient, payment method, reference/proof, recorder, and confirmation.
- Record cash handover between managers/custodians with sender, receiver, amount, timestamp, reason, and acceptance/confirmation by both sides.
- Prevent a handover from being treated as income or expense.
- Require manager to enter actual counted cash at day-end.
- Calculate variance = actual counted cash − expected closing cash.
- If variance is non-zero, require an explanation and flag it for review.
- Support draft, submitted, reviewed, approved, and reopened-with-reason states.
- Lock finalized records from direct editing; corrections must use an authorized adjustment/reversal process with audit history.
- Allow owner/admin to compare expected cash with actual cash by manager and date.
- Store opening, receipts, expenses, owner deposits, transfers/handovers, expected closing, actual counted cash, variance, explanation, and approval details.

### 6.8 Meal management (optional hostel service)
Meals are optional. The module must be configurable as enabled/disabled.

#### 6.8.1 Boarder self-service meal ON/OFF
- An activated boarder can use their own account to set meal participation ON/OFF for an allowed future date and meal session.
- Support separate breakfast, lunch, and dinner toggles if enabled by the administrator.
- Show the date and meal session clearly before saving.
- Boarders may only change their own meal selections.
- Every change must record boarder ID, date, meal session, previous value, new value, timestamp, and actor.
- The change must be reflected promptly in the admin dashboard and dashboards of managers explicitly granted access. Use realtime subscriptions or a reliable automatic refresh mechanism.
- Display clear save status and handle connection failures without falsely claiming the change was saved.
- Apply the cutoff using the server's configured Bangladesh time zone (Asia/Dhaka): after 10:00 PM, next-day meal entries/changes are locked.
- Enforce cutoff on the server/database, not just in the browser.
- If the owner allows exceptions, only specifically authorized users may override the cutoff; require a reason and audit record.
- Admin-configured rules must define whether meal selections can be changed for today, tomorrow, or a specified future period.

#### 6.8.2 Flat-wise date-wise meal summary
- Admin can select a date or date range and view meals by building/flat.
- Admin may grant selected managers access to all flats or only assigned flats.
- Summary must show each flat's breakfast, lunch, dinner, and total meal counts for each date.
- Include all-flat totals and per-flat detail.
- Detail view should list the relevant boarders and their meal status, subject to permissions.
- Counts must derive from saved meal records, not manually duplicated summary numbers.
- Changes within the allowed period must update the summary promptly.
- Provide daily kitchen/preparation lists, date-range reports, PDF/Excel export, and print.
- Show whether figures are live/provisional or locked/final after the cutoff.
- Prevent duplicate meal records for the same boarder, date, and meal session.

#### 6.8.3 Meal pricing and billing
- Admin can configure per-meal rate and effective dates.
- Calculate meal totals from the saved meal participation records and applicable rate.
- Preserve historical rates for prior periods.
- Provide boarder-wise and flat-wise meal counts, meal cost/revenue reports, and reconciliation.
- Do not assume all boarders participate in meals.

### 6.9 Money movement and owner deposits
- Provide a dedicated record for money deposited to the owner and money handed between authorized custodians.
- Keep deposit and handover records searchable by date, manager, recipient, amount, method, and reference.
- Show pending confirmation and completed status.
- Link each movement to the relevant account ledger.
- Ensure these movements reduce the sender's cash custody balance but do not create duplicate income/expense entries.

## 7. Reports and Analytics Module

All reports must use the same source-of-truth database, support date filters, and respect access permissions. Where relevant, support building, flat, room, seat, boarder, manager, category, payment method, status, and date-range filters. Provide PDF, Excel/CSV where suitable, and print-friendly views.

### 7.1 Owner master dashboard
- Total collections, income, expenses, operating result, and outstanding dues.
- Cash, bank, and mobile financial service balances.
- Cash held by each manager/custodian.
- Deposits to owner and pending handovers.
- Total seats, occupied seats, vacant seats, and occupancy rate.
- Boarder counts, admissions, departures, and pending applications.
- Meal totals where the meal module is enabled.
- Alerts for cash variance, overdue dues, unusual expenses, unapproved transactions, and backup failures.

### 7.2 Mandatory financial reports
1. Daily income and expense report.
2. Weekly income and expense report.
3. Monthly income and expense / operating result report.
4. Receipt-wise collection report, including collector/manager.
5. Boarder-wise ledger and outstanding dues/aging report.
6. Cash ledger and bank/mobile account ledger.
7. Manager-wise daily cash report.
8. Daily cash closing and reconciliation report.
9. Manager-wise expected vs actual cash and variance report.
10. Owner deposit report with proof/reference and confirmation.
11. Cash handover/transfer report with both parties' confirmations.
12. Flat-wise expense report.
13. Expense category analysis and month-to-month comparison.
14. Security deposit received, held, adjusted, and refunded report.
15. Receipt void/reversal and adjustment report.
16. Manager performance report, based on collections, expenses, reconciliations, overdue items, and compliance—not collection totals alone.

### 7.3 Accommodation reports
- Building/flat/room/seat inventory.
- Current occupancy and vacancy.
- Seat-wise rent and active allocation.
- Allocation history and seat history.
- Room occupancy report.
- New admission and departure report.
- Vacant-seat duration and potential lost rent, if data supports calculation.
- Boarder directory and status report.

### 7.4 Meal reports
- Daily meal count by flat and meal session.
- Date-range meal count by flat.
- All-flat meal totals by date.
- Boarder-wise meal history.
- Meal ON/OFF changes and late-change/override audit.
- Meal rate, total meals, and meal billing/reconciliation reports.
- Kitchen preparation list for each date/session.

### 7.5 Governance and system reports
- User activity and audit log.
- Pending approvals and rejected transactions.
- Role/permission assignment report.
- Backup status, last successful backup, and failure alerts.
- Data-quality exceptions (missing references, invalid allocations, inconsistent balances).
- Registration applications and application status.

### 7.6 Reporting rules
- Internal transfers, manager handovers, and owner deposits are not new income or expense.
- A receipt contributes to collection totals only once.
- Meal counts must be based on unique saved meal selections.
- Occupancy and balances must be calculated from effective-dated records.
- Reports must disclose their date range and relevant filters.
- Finalized reports should be reproducible from saved transactions and audit history.
- Exported reports must not expose data the requesting user is not authorized to see.

## 8. Dashboard and User Experience

- Responsive design for desktop, tablet, and mobile.
- Installable PWA with app icon and mobile-friendly navigation.
- Bangla and English language selector; persist the user's language preference.
- Clear status labels, confirmations, validation errors, and loading states.
- Search, sorting, pagination, and useful filters for large lists.
- Quick actions for receipt collection, expense entry, seat allocation, meal ON/OFF, and daily cash closing according to role.
- Accessible color contrast and readable typography.
- Date/time display in Asia/Dhaka and currency in Bangladeshi Taka (BDT).
- Do not rely on color alone to communicate status.

## 9. Technical Architecture

### 9.1 Recommended stack
- **Database:** PostgreSQL managed through Supabase.
- **Backend services:** Supabase Auth, Postgres, Row Level Security (RLS), database functions/triggers where justified, Realtime, and Storage.
- **Frontend:** React + TypeScript.
- **UI:** Tailwind CSS or a consistent accessible component system.
- **Mobile access:** Responsive web app and installable PWA.
- **Development environment:** Antigravity IDE.
- **Version control:** GitHub.
- **File storage:** Supabase Storage with private buckets and controlled access.

### 9.2 Architecture rules
- PostgreSQL/Supabase is the single source of truth.
- Never put service-role secrets in frontend code.
- Enforce authorization in RLS and trusted server/database logic.
- Use transactions for financial posting, allocation, handover, and other multi-step changes.
- Use database constraints for uniqueness and data integrity.
- Use indexes for frequently filtered columns and report queries.
- Use Realtime where suitable for meal updates; provide reliable refresh fallback.
- Separate development, testing, and production environments.
- Keep schema migrations and configuration in version control.
- Google Sheets may be used for optional import/export only, not as the primary transactional database.

## 10. Data Model: Core Entities

The final schema must be designed and reviewed before production. Expected entities include:

- profiles/users and role assignments
- roles, permissions, and user/flat access grants
- buildings, flats, rooms, seats
- boarders and registration applications
- allocations and allocation history
- charge types, boarder charges, receipts, receipt allocations
- income categories, expense categories, income/expense transactions
- financial accounts and account transfers
- manager cash sessions / daily cash closings
- cash handovers and owner deposits
- meal settings, meal selections, meal change audit, meal rates
- approvals, attachments, audit events
- notification/event records if needed
- backup/health monitoring metadata where supported

Use UUID primary keys where suitable, foreign keys, check constraints, unique constraints, created/updated timestamps, and actor IDs. Use NUMERIC/DECIMAL for money, never floating-point types. Store timestamps consistently and present them in Asia/Dhaka. Consider effective dates for rent and meal rates. Avoid deleting financial history.

### 10.1 Key integrity constraints
- Unique receipt number within the defined scope.
- One active allocation per seat at a time.
- No duplicate meal selection for a boarder/date/session.
- Positive or otherwise explicitly validated amounts.
- Transfer source and destination must be valid and must not be treated as income/expense.
- A boarder can access only their own records.
- A manager can access only authorized flats and modules.
- Financial posting and related ledger updates must be atomic.
- Changes to finalized records must use controlled correction workflows.

## 11. Security, Privacy, and Audit

- Enforce least-privilege access.
- Use Supabase RLS for user-level data access.
- Verify authorization on every sensitive operation.
- Keep private boarder documents in protected storage.
- Log actor, timestamp, action, entity, and relevant before/after values for sensitive changes.
- Do not store passwords in application tables.
- Never expose secret keys to the client.
- Protect against direct-object-reference attacks and unauthorized ID manipulation.
- Define retention and access rules for personal data and financial records.
- Provide secure export permissions and audit exports where appropriate.
- Audit log entries should not be editable by ordinary users.

## 12. Non-Functional Requirements

- **Reliability:** Database transactions and constraints protect critical financial records.
- **Performance:** Common lists and dashboards should respond quickly under expected usage; optimize queries and indexes based on real data.
- **Scalability:** No arbitrary hard-coded limits on the number of buildings/flats/rooms/seats.
- **Availability:** Internet is required for normal use; offline-first operation is not an initial requirement.
- **Usability:** Simple workflows for non-technical managers and boarders.
- **Localization:** Bangla and English, BDT, Asia/Dhaka time zone.
- **Maintainability:** Modular code, documented schema, migrations, automated tests.
- **Recoverability:** Documented backup and restoration process, with periodic restore tests.
- **Compatibility:** Current mainstream desktop and mobile browsers.
- **Data consistency:** Reports must reconcile to source transactions and avoid double counting.

## 13. Notifications and Operational Alerts

- Notify authorized users about pending applications, pending approvals, overdue dues, cash variances, unconfirmed handovers, and important system failures.
- Meal ON/OFF changes should update dashboards promptly; optional in-app notifications may be added.
- Notifications must not expose sensitive details to unauthorized users.
- Notification channels such as email/SMS/push should be treated as optional integrations requiring separate configuration and cost review.

## 14. Backup, Recovery, and Operations

- Configure database and storage backup according to the selected Supabase plan and business requirements.
- Define recovery objectives before production.
- Document who can initiate a restore and how restored data is verified.
- Test restoration periodically in a non-production environment.
- Monitor backup completion and surface failures to the owner/admin.
- Export critical reports when needed, but do not treat exports as a replacement for database backups.
- Keep production credentials and environment variables secure.

## 15. Testing and Acceptance Criteria

### 15.1 Finance and cash
- A receipt is included exactly once in collection and cash reports.
- Manager opening cash carries forward from the prior finalized closing.
- Owner deposit reduces manager cash and increases the appropriate owner/account balance without creating duplicate income.
- Cash handover is confirmed by sender and receiver and does not create income/expense.
- Actual cash variance is calculated correctly and non-zero variance requires an explanation.
- Finalized closing cannot be silently edited.
- Partial payments and outstanding dues reconcile correctly.

### 15.2 Accommodation
- Buildings, flats, rooms, and seats can be added without application-imposed arbitrary caps.
- A seat cannot have two conflicting active allocations.
- Rent changes do not rewrite historical allocation terms.
- Seat history and room occupancy reports match allocation records.

### 15.3 Meals
- A boarder can change only their own allowed meal selections.
- Meal changes before cutoff appear promptly on authorized admin/manager dashboards.
- After 10:00 PM Bangladesh time, next-day changes are blocked by trusted backend logic unless an authorized override is recorded.
- Date-wise flat summaries correctly total breakfast/lunch/dinner and all-flat totals.
- Duplicate selections are rejected.
- Meal totals and billing reconcile to saved meal selections and effective rates.
- Managers see only the flats and details they are authorized to access.

### 15.4 Access and security
- Unapproved applicants can only fill/submit applications and view their own application status.
- Boarders cannot access other boarders' records.
- Managers cannot access unauthorized flats or modules.
- Sensitive actions create audit entries.
- Secrets are not present in frontend bundles or source control.

### 15.5 Reports and operations
- Weekly/monthly reports match underlying date-filtered transactions.
- Internal transfers are excluded from income/expense totals.
- PDF/Excel/print outputs respect permissions and selected filters.
- Backup status and restore instructions are documented and tested.

## 16. Delivery Phases

### Phase 1 — Foundation
- Confirm requirements and user flows.
- Design schema, ERD, RLS matrix, and migration plan.
- Set up repository, environments, Supabase project, and UI shell.
- Implement authentication, roles, bilingual UI, audit foundation.

### Phase 2 — Accommodation and boarders
- Buildings/flats/rooms/seats.
- Boarder applications, approval, profiles.
- Seat allocation, transfer, cancellation, and history.

### Phase 3 — Finance
- Charges, rent, receipts, dues, deposits.
- Income/expense categories and entries.
- Account ledger and internal transfers.
- Manager cash custody, owner deposits, handovers, daily closing and reconciliation.

### Phase 4 — Meals
- Meal settings and rates.
- Boarder self-service ON/OFF.
- Server-enforced 10 PM cutoff and audited override.
- Realtime/near-realtime dashboard updates.
- Date-wise, flat-wise, and meal-session reports.

### Phase 5 — Reports and dashboard
- Owner dashboard.
- Daily/weekly/monthly finance reports.
- Manager cash reports.
- Boarder, seat, occupancy, and meal reports.
- PDF/Excel/print and access-filter testing.

### Phase 6 — Hardening and launch
- Security review and RLS tests.
- Data migration/import if required.
- Backup/restore test.
- User acceptance testing and manager training.
- Production release and monitoring.

## 17. Open Decisions to Confirm During Design

These are configuration/design choices, not blockers to accepting the requirements:
- Whether breakfast/lunch/dinner are all enabled or only selected meal sessions.
- Exact receipt numbering format.
- Which roles may approve expenses and cash variances, and approval thresholds.
- Whether manager access is granted per flat, building, or all hostel operations.
- Whether cutoff exceptions are allowed and which roles may approve them.
- Required backup retention and recovery targets.
- Whether SMS, email, or push notifications are required at launch.

## 18. Final Product Baseline

The following are mandatory requirements for the first complete production-ready release:
1. PostgreSQL + Supabase architecture.
2. Responsive desktop web and installable mobile PWA.
3. Bangla/English language selection.
4. Configurable building → flat → room → seat hierarchy without arbitrary fixed limits.
5. Boarder registration portal with strict pre-approval restrictions.
6. Boarder management, allocation history, seat-specific rent, billing, receipts, and dues.
7. Income/expense, flat-wise expenses, account transfers, and financial ledgers.
8. Manager-wise cash custody, prior-day opening cash, owner deposits, manager-to-manager handovers, expected vs actual cash, variance explanation, and approvals.
9. Optional meal service with boarder self-service ON/OFF, per-session selection, server-enforced 10 PM next-day cutoff, audit history, and prompt authorized dashboard updates.
10. Admin/authorized-manager date-wise and flat-wise meal counts.
11. Comprehensive Reports & Analytics Module.
12. Role-based access, database security, audit trails, and secure storage.
13. PDF/Excel/printable reports and useful filters.
14. Backup, restore, monitoring, and tested acceptance criteria.

**End of PRD**
