# Bachelor Home ERP — Step-by-Step Implementation Prompt Roadmap
**ফাইল নাম:** `prompt.md`  
**প্রজেক্ট:** Bachelor Home ERP  
**ভার্সন:** 1.0 (Production-Ready Codebase Generator)  
**প্রস্তুতকরণের ভিত্তি:** `PRD.md` (v3.0), `architecture.md`, `database_schema.md`, `api_contracts.md`, `security.md`, `test_plan.md`, `deployment.md`  
**টার্গেট প্ল্যাটফর্ম:** Web Application & Installable Mobile PWA (React 18 + TypeScript + Vite + Tailwind CSS + Supabase PostgreSQL)  
**টাইমজোন ও কারেন্সি:** `Asia/Dhaka` (UTC+6) | Bangladeshi Taka (BDT - ৳)  

---

## ১. ভূমিকা ও নির্দেশিকা (How to Use This Prompt Guide)

এই ডকুমেন্টটিতে **Bachelor Home ERP** সফটওয়্যারটি স্ক্র্যাচ থেকে একটি সম্পূর্ণ, সুরক্ষিত এবং প্রোডাকশন-রেডি সিস্টেমে রূপান্তর করার জন্য ক্রমানুসারে সাজানো **৩১টি ধাপে ধাপে এক্সিকিউটেবল প্রম্পট (Step-by-Step Actionable Prompts)** দেওয়া হয়েছে।

### ব্যবহার করার নিয়মাবলী:
1. **ধারাবাহিকতা বজায় রাখুন:** প্রম্পটগুলো ১ থেকে ৩১ পর্যন্ত ক্রমানুসারে একটির পর একটি Antigravity AI-কে ইনপুট দিন। কোনো ধাপ স্কিপ করবেন না, কারণ প্রতিটি ধাপ পূর্ববর্তী ধাপের ফাইলের ওপর নির্ভরশীল।
2. **প্রতিটি প্রম্পট হুবহু কপি করুন:** প্রতিটি ধাপের **"📋 কপি করার জন্য প্রম্পট (Copyable Prompt Box)"**-এর ভেতরের টেক্সট কপি করে চ্যাটে পাঠিয়ে দিন।
3. **যাচাইকরণ (Verification):** প্রতিটি প্রম্পট এক্সিকিউট হওয়ার পর দেওয়া **"চেকলিস্ট / ভেরিফিকেশন পয়েন্ট"** মিলিয়ে দেখুন। সফলভাবে কাজ শেষ হলে পরবর্তী প্রম্পটে যান।
4. **প্রয়োজনীয় এনভায়রনমেন্ট ভেরিয়েবল:** Supabase প্রজেক্টের `URL` এবং `Anon Key` প্রম্পট শুরু করার আগেই সংগ্রহে রাখুন।

---

## ২. প্রজেক্ট টেকনোলজি ও আর্কিটেকচার সামারি (Architecture Baseline)

- **Frontend:** React 18+, TypeScript, Vite 5+, Tailwind CSS, Radix UI Primitives, Lucide Icons.
- **Typography:** Google Fonts (`Inter` ইংরেজি এবং `Hind Siliguri` বাংলার জন্য)।
- **State & Data Fetching:** TanStack Query v5 (React Query) + Zustand (Client Global State).
- **Internationalization:** i18next + react-i18next (Bangla `bn` & English `en` bilingual toggle).
- **Backend & Database:** PostgreSQL 15+ managed through Supabase (GoTrue Auth, PostgREST, Supabase Realtime, Storage).
- **Security:** Zero-Trust RLS (Row Level Security), `SECURITY DEFINER` atomic database functions, immutable financial ledgers.
- **Mobile/PWA:** Vite PWA Plugin, Workbox service worker caching, installable offline app shell.
- **Export Engines:** `jspdf`, `jspdf-autotable` (PDF ইনভয়েস/রিপোর্ট), `exceljs` (Excel রিপোর্ট)।

---

## ৩. পর্যায়ক্রমিক প্রম্পট সূচিপত্র (Prompt Index)

| ফেজ | প্রম্পট আইডি | শিরোনাম ও উদ্দেশ্য |
| :--- | :--- | :--- |
| **Phase 0** | **Prompt 01** | Frontend Scaffolding, PWA, Tailwind CSS, i18n & Core UI Foundation |
| **Phase 1** | **Prompt 02** | Supabase Migration: Database Extensions, Enums & Accommodation Hierarchy DDL |
| | **Prompt 03** | Supabase Migration: Profiles, Boarders, Allocations & Partial Unique Index |
| | **Prompt 04** | Supabase Migration: Financial Accounts, Charges, Receipts, Incomes & Expenses |
| | **Prompt 05** | Supabase Migration: Manager Cash Sessions, Reconciliation & Handovers |
| | **Prompt 06** | Supabase Migration: Meal Engine, Settings, Rates & 10 PM Cutoff Procedure |
| | **Prompt 07** | Supabase Migration: Row Level Security (RLS) Policies, Triggers & Views |
| | **Prompt 08** | Supabase Seed Data & TypeScript Database Interfaces |
| **Phase 2** | **Prompt 09** | Supabase Client Singleton, Auth Store (Zustand) & Protected Route Guards |
| | **Prompt 10** | App Shell Layout, Responsive Sidebar, Header, Mobile Nav & Language Switcher |
| | **Prompt 11** | Authentication Views: Login, Password Reset & Boarder Registration Portal |
| **Phase 3** | **Prompt 12** | Accommodation Management: Buildings, Flats, Rooms & Interactive Seat Grid |
| | **Prompt 13** | Boarder Management: Applicant Verification, Profile & Document Storage |
| | **Prompt 14** | Seat Allocation Management, Transfer, Cancellation & Occupancy History |
| **Phase 4** | **Prompt 15** | Billing & Dues Engine: Monthly Rent Generation, Invoicing & Due Aging |
| | **Prompt 16** | Atomic Receipt Collection, Partial Payment Settlement & Void/Reversal Modal |
| **Phase 5** | **Prompt 17** | Expense Management: Voucher Upload, Flat-wise Expenses & Approvals |
| | **Prompt 18** | Non-Rent Incomes & Internal Account Transfers (Cash/Bank/MFS) |
| **Phase 6** | **Prompt 19** | Manager Cash Custody: Real-Time Cash Flow Tracker & Prior-Day Carryover |
| | **Prompt 20** | Day-End Cash Closing, Variance Workflow, Handovers & Owner Deposits |
| **Phase 7** | **Prompt 21** | Boarder Self-Service Meal Toggle Grid & 10:00 PM Asia/Dhaka Countdown Timer |
| | **Prompt 22** | Kitchen Meal Monitor with Realtime WebSocket Sync & Preparation Lists |
| | **Prompt 23** | Meal Rates Management, Monthly Meal Billing & Audit Logs |
| **Phase 8** | **Prompt 24** | Owner / Executive Master KPI Dashboard |
| | **Prompt 25** | Complete 16 Financial & Operational Reports Suite |
| | **Prompt 26** | PDF & Excel Export Engines (`jspdf` + `exceljs`) & Print Stylesheets |
| **Phase 9** | **Prompt 27** | Governance: System Immutable Audit Log Viewer & Role Management |
| | **Prompt 28** | Real-Time Notification Center & Operational Alerts |
| **Phase 10**| **Prompt 29** | Unit & Integration Test Suite (Vitest & Component Testing) |
| | **Prompt 30** | Database & RLS Testing Harness (`pgTAP`) & Playwright E2E Tests |
| | **Prompt 31** | Production Build Optimization, PWA Verification, CI/CD Pipeline & Deployment |

---

## ৪. বিস্তারিত ধাপে ধাপে প্রম্পটসমূহ (Detailed Step-by-Step Prompts)

---

### Phase 0: Frontend Foundation & Architecture Setup

#### 🔹 PROMPT 01: Frontend Scaffolding, PWA, Tailwind CSS, i18n & Core UI Foundation
* **উদ্দেশ্য:** আধুনিক ও প্রিমিয়াম ডিজাইনে Vite + React + TypeScript প্রজেক্ট সেটআপ করা, Tailwind CSS, ফন্ট, আইকন, PWA কনফিগ এবং বাংলা-ইংরেজি বাইলিঙ্গুয়াল ফ্রেমওয়ার্ক তৈরি করা।
* **ডিপেনডেন্সি:** Node.js 18+

```markdown
### TASK: Step 01 - Frontend Scaffolding, PWA, Tailwind CSS, i18n & UI Foundation

Please initialize the frontend application for the Bachelor Home ERP following our PRD and technical architecture documents.

1. **Project Stack & Configuration:**
   - Framework: React 18+ with TypeScript using Vite 5+.
   - Styling: Tailwind CSS configured with custom color tokens (slate/indigo/emerald/rose/amber palettes), CSS variables for dark/light themes, and glassmorphic utility classes.
   - Typography: Configure Google Fonts in `index.html` importing 'Inter' for English and 'Hind Siliguri' for Bengali.
   - Icons: Install and configure `lucide-react`.
   - Utility Helpers: Install `clsx`, `tailwind-merge`, and date utilities (`dayjs` with timezone support for `Asia/Dhaka`).
   - PWA Configuration: Install `vite-plugin-pwa` with a full web app manifest (`name: "Bachelor Home ERP"`, `short_name: "HostelERP"`, standalone display, theme color `#0f172a`, and icons for 192x192 and 512x512).

2. **Internationalization (i18n):**
   - Install `i18next`, `react-i18next`, and `i18next-browser-languagedetector`.
   - Setup `src/i18n/index.ts` with bilingual dictionary files: `src/i18n/locales/en.json` and `src/i18n/locales/bn.json`.
   - Include initial dictionaries for common UI strings: navigation, buttons (Save, Cancel, Edit, Delete, Submit, Filter, Export, Print), status badges, and currency symbol (৳ / BDT).
   - Ensure the selected language persists in `localStorage` and defaults to Bengali (`bn`).

3. **Core Design System Components (`src/components/common/`):**
   - `Button.tsx`: Accessible button supporting variants (`primary`, `secondary`, `danger`, `outline`, `ghost`), loading spinner, and icon support.
   - `Badge.tsx`: Status indicator pill badge supporting colors for ACTIVE, INACTIVE, AVAILABLE, OCCUPIED, PENDING, APPROVED, REJECTED, VOID.
   - `Card.tsx`: Glassmorphism and solid elevated cards with header, body, footer slots.
   - `Modal.tsx`: Accessible dialog using Radix UI dialog primitive.
   - `Input.tsx`, `Select.tsx`: Polished input fields with label, helper text, and error states.

4. **Verify:**
   - Run Vite dev server, verify Tailwind classes compile, Bengali fonts render crisply, and language switching toggles text instantly without page reload.
```

---

### Phase 1: Database Architecture & Supabase Migrations

#### 🔹 PROMPT 02: Supabase Migration — Extensions, Enums & Accommodation Hierarchy DDL
* **উদ্দেশ্য:** ডাটাবেস এক্সটেনশন, কাস্টম এনাম এবং বিল্ডিং, ফ্ল্যাট, রুম ও সিট টেবিলের DDL স্ক্রিপ্ট তৈরি করা।
* **রেফারেন্স ফাইল:** `database_schema.md` (Sections 1, 2, 3.2)

```markdown
### TASK: Step 02 - Supabase Migration: Extensions, Enums & Accommodation DDL

Please create the first Supabase SQL migration file `supabase/migrations/20261015000001_initial_extensions_and_accommodation.sql` implementing the PostgreSQL baseline:

1. **Extensions:**
   - Enable `uuid-ossp`, `pgcrypto`, `btree_gist`, and `pg_trgm`.

2. **Custom Enums:**
   - Create `user_role` ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'BOARDER', 'APPLICANT', 'AUDITOR').
   - Create `building_status` ('ACTIVE', 'INACTIVE').
   - Create `flat_status` ('ACTIVE', 'INACTIVE').
   - Create `room_status` ('ACTIVE', 'MAINTENANCE', 'INACTIVE').
   - Create `seat_status` ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE').
   - Create `boarder_status` ('PENDING', 'ACTIVE', 'LEFT', 'REJECTED').
   - Create `allocation_status` ('ACTIVE', 'ENDED', 'TRANSFERRED', 'CANCELLED').
   - Create `financial_account_type` ('CASH_MANAGER', 'CASH_OWNER', 'BANK', 'MFS').
   - Create `charge_type` ('RENT', 'UTILITY', 'MEAL', 'PENALTY', 'ADMISSION_FEE', 'OTHER').
   - Create `charge_status` ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID').
   - Create `payment_method` ('CASH', 'BANK_TRANSFER', 'MFS').
   - Create `cash_session_status` ('OPEN', 'SUBMITTED', 'APPROVED', 'REOPENED').
   - Create `handover_status` ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED').
   - Create `deposit_status` ('PENDING', 'CONFIRMED', 'REJECTED').
   - Create `meal_session` ('BREAKFAST', 'LUNCH', 'DINNER').
   - Create `audit_action` ('INSERT', 'UPDATE', 'DELETE', 'VOID', 'OVERRIDE').

3. **Accommodation Relational Tables:**
   - `public.buildings`: UUID primary key, `building_code` UNIQUE, `name`, `address`, `status`, timestamps in `Asia/Dhaka`.
   - `public.flats`: UUID primary key, `building_id` FK references buildings(id) RESTRICT, `flat_code`, `name`, `floor_number`, `status`, UNIQUE(building_id, flat_code).
   - `public.rooms`: UUID primary key, `flat_id` FK references flats(id) RESTRICT, `room_code`, `name`, `room_type`, `capacity` (CHECK capacity >= 1), `status`, UNIQUE(flat_id, room_code).
   - `public.seats`: UUID primary key, `room_id` FK references rooms(id) RESTRICT, `seat_code`, `seat_name`, `seat_type`, `default_rent NUMERIC(12,2)` (CHECK default_rent >= 0), `status`, UNIQUE(room_id, seat_code).

4. **Indexes:**
   - Add performance indexes on foreign keys and status columns (`idx_seats_status`, `idx_flats_building`, `idx_rooms_flat`).
```

---

#### 🔹 PROMPT 03: Supabase Migration — Profiles, Boarders, Allocations & Partial Unique Index
* **উদ্দেশ্য:** প্রোফাইল, ফ্ল্যাট অ্যাসাইনমেন্ট, বর্ডার বায়োডাটা এবং সিট অ্যালটমেন্ট টেবিল তৈরি করা, যেখানে একই সিটে একাধিক অ্যাক্টিভ বরাদ্দ রোধে পার্শিয়াল ইউনিক ইনডেক্স থাকবে।
* **রেফারেন্স ফাইল:** `database_schema.md` (Sections 3.1, 3.3)

```markdown
### TASK: Step 03 - Supabase Migration: Profiles, Boarders, Allocations & Constraints

Create migration `supabase/migrations/20261015000002_profiles_boarders_allocations.sql`:

1. **User Profiles & Flat Scoping:**
   - `public.profiles`: `id` references `auth.users(id)` ON DELETE CASCADE, `email` UNIQUE, `full_name`, `phone_number`, `role user_role` DEFAULT 'APPLICANT', `is_active` boolean DEFAULT true, `preferred_language` DEFAULT 'bn', `avatar_url`, timestamps.
   - `public.user_flat_assignments`: `id`, `user_id` FK profiles(id), `flat_id` FK flats(id), `assigned_at`, `assigned_by`, UNIQUE(user_id, flat_id).

2. **Boarders & Registrations:**
   - `public.boarders`: `id` UUID, `user_id` FK profiles(id) UNIQUE NULLABLE, `boarder_code` UNIQUE, `full_name`, `phone_number`, `email`, `photo_url`, `nid_passport_number`, `nid_document_url`, `student_id`, `institution`, `department`, `session`, `guardian_name`, `guardian_phone`, `guardian_relation`, `present_address`, `permanent_address`, `emergency_contact`, `admission_date DATE`, `leaving_date DATE`, `status boarder_status` DEFAULT 'PENDING', `remarks`, `created_by`, timestamps.

3. **Seat Allocations & Allocation History:**
   - `public.allocations`: `id` UUID, `boarder_id` FK boarders(id) RESTRICT, `seat_id` FK seats(id) RESTRICT, `monthly_rent NUMERIC(12,2)` CHECK >= 0, `security_deposit NUMERIC(12,2)` DEFAULT 0.00, `start_date DATE`, `end_date DATE`, `status allocation_status` DEFAULT 'ACTIVE', `cancellation_reason`, `remarks`, `created_by`, timestamps.
   - **Crucial Integrity Constraint:**
     ```sql
     CREATE UNIQUE INDEX idx_unique_active_seat_allocation 
     ON public.allocations (seat_id) 
     WHERE status = 'ACTIVE';
     ```
   - `public.allocation_history`: `id`, `allocation_id` FK allocations(id) CASCADE, `previous_seat_id`, `new_seat_id`, `change_type`, `effective_date`, `reason`, `recorded_by`, `created_at`.

4. **Triggers:**
   - Implement `fn_sync_seat_status_on_allocation()` trigger: When allocation status becomes 'ACTIVE', seat flips to 'OCCUPIED'. When 'ENDED', 'CANCELLED', or 'TRANSFERRED', seat reverts to 'AVAILABLE'.
```

---

#### 🔹 PROMPT 04: Supabase Migration — Financial Accounts, Charges, Receipts, Incomes & Expenses
* **উদ্দেশ্য:** ফাইন্যান্সিয়াল অ্যাকাউন্ট, ভাড়া/বিল চার্জ, মানি রিসিপ্ট, রিসিপ্ট অ্যালটমেন্ট, ইনকাম ও এক্সপেন্স টেবিল তৈরি করা।
* **রেফারেন্স ফাইল:** `database_schema.md` (Sections 3.4, 3.5)

```markdown
### TASK: Step 04 - Supabase Migration: Financial Accounts, Charges, Receipts & Ledgers

Create migration `supabase/migrations/20261015000003_financial_tables.sql`:

1. **Financial Accounts & Internal Transfers:**
   - `public.financial_accounts`: `id` UUID, `account_name`, `account_type financial_account_type`, `account_number`, `bank_name`, `current_balance NUMERIC(14,2)` DEFAULT 0.00, `assigned_manager_id` FK profiles(id), `is_active` DEFAULT true, timestamps.
   - `public.account_transfers`: `id`, `transfer_number` UNIQUE, `from_account_id` FK, `to_account_id` FK, `amount NUMERIC(12,2)` CHECK > 0, `transfer_date`, `reference`, `remarks`, `created_by`, CHECK (from_account_id <> to_account_id).

2. **Boarder Charges & Billing:**
   - `public.boarder_charges`: `id` UUID, `boarder_id` FK boarders(id) RESTRICT, `allocation_id` FK allocations(id), `charge_type charge_type`, `billing_month DATE` (e.g. 2026-10-01), `amount NUMERIC(12,2)` CHECK > 0, `paid_amount NUMERIC(12,2)` DEFAULT 0.00, `due_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount - paid_amount) STORED`, `status charge_status` DEFAULT 'UNPAID', `due_date DATE`, `description`, `created_by`, timestamps.

3. **Receipts & Receipt Allocations:**
   - Create sequence `receipt_seq START WITH 1001`.
   - `public.receipts`: `id` UUID, `receipt_number` UNIQUE, `boarder_id` FK boarders(id), `received_by` FK profiles(id), `destination_account_id` FK financial_accounts(id), `amount NUMERIC(12,2)` CHECK > 0, `payment_method`, `transaction_reference`, `receipt_date`, `is_void` boolean DEFAULT false, `void_reason`, `void_by`, `void_at`, `remarks`, timestamps.
   - `public.receipt_allocations`: `id`, `receipt_id` FK receipts(id) CASCADE, `charge_id` FK boarder_charges(id) RESTRICT, `allocated_amount NUMERIC(12,2)` CHECK > 0, timestamps.

4. **Incomes & Expenses:**
   - `public.expense_categories`: `id`, `name` UNIQUE, `description`, `is_active` DEFAULT true.
   - Create sequence `expense_seq START WITH 5001`.
   - `public.expenses`: `id`, `expense_voucher_no` UNIQUE, `category_id` FK expense_categories(id), `amount NUMERIC(12,2)` CHECK > 0, `source_account_id` FK financial_accounts(id), `building_id` FK, `flat_id` FK, `expense_date DATE`, `description`, `voucher_attachment_url`, `paid_by` FK profiles(id), `approval_status` DEFAULT 'PENDING', `approved_by`, `approved_at`, `rejection_reason`, timestamps.
   - `public.income_categories` and `public.incomes` (similar structure for non-rent revenues).
```

---

#### 🔹 PROMPT 05: Supabase Migration — Manager Cash Custody, Reconciliation & Handovers
* **উদ্দেশ্য:** ম্যানেজারদের ক্যাশ কাস্টডি সেশন, পূর্ববর্তী দিনের ক্লোজিং ব্যালেন্স স্বয়ংক্রিয় ক্যারিওভার, ভ্যারিয়েন্স হিসাব এবং হ্যান্ডওভার/ওনার ডিপোজিট ইঞ্জিন তৈরি করা।
* **রেফারেন্স ফাইল:** `database_schema.md` (Sections 3.6, 4.2, 4.3) & `architecture.md` (Section 7.2, 7.3)

```markdown
### TASK: Step 05 - Supabase Migration: Cash Custody, Daily Closing & Handovers

Create migration `supabase/migrations/20261015000004_cash_custody_and_reconciliation.sql`:

1. **Tables:**
   - `public.manager_cash_sessions`: `id` UUID, `manager_id` FK profiles(id), `account_id` FK financial_accounts(id), `session_date DATE`, `opening_cash NUMERIC(12,2)` CHECK >= 0, `cash_receipts NUMERIC(12,2)` DEFAULT 0.00, `cash_expenses NUMERIC(12,2)` DEFAULT 0.00, `cash_deposited_to_owner NUMERIC(12,2)` DEFAULT 0.00, `cash_handed_over_out NUMERIC(12,2)` DEFAULT 0.00, `cash_handed_over_in NUMERIC(12,2)` DEFAULT 0.00,
     `expected_closing_cash NUMERIC(12,2) GENERATED ALWAYS AS (opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out) STORED`,
     `actual_counted_cash NUMERIC(12,2)`,
     `cash_variance NUMERIC(12,2) GENERATED ALWAYS AS (actual_counted_cash - (opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out)) STORED`,
     `variance_explanation TEXT`, `status cash_session_status` DEFAULT 'OPEN', `submitted_at`, `reviewed_by`, `reviewed_at`, `reopen_reason`, UNIQUE(manager_id, session_date).
   - `public.owner_deposits`: `id`, `deposit_number` UNIQUE, `manager_id` FK, `from_account_id` FK, `to_account_id` FK, `amount NUMERIC(12,2)` CHECK > 0, `payment_method`, `transaction_reference`, `proof_attachment_url`, `status deposit_status` DEFAULT 'PENDING', `confirmed_by`, `confirmed_at`.
   - `public.cash_handovers`: `id`, `handover_number` UNIQUE, `sender_manager_id` FK, `receiver_manager_id` FK, `amount NUMERIC(12,2)` CHECK > 0, `handover_reason`, `status handover_status` DEFAULT 'PENDING', `accepted_at`, CHECK(sender_manager_id <> receiver_manager_id).

2. **Stored Procedures & Business Functions:**
   - `fn_initialize_daily_cash_session(p_manager_id UUID, p_session_date DATE)`:
     Fetches previous finalized session closing cash (or actual counted cash) and seeds `opening_cash` for the current date. Returns session UUID.
   - `fn_record_receipt(p_boarder_id, p_amount, p_payment_method, p_destination_account_id, p_reference, p_allocations)`:
     Atomic function to insert receipt, allocate to charges, update account balance, and increment manager cash receipts.
   - `fn_submit_daily_cash_close(p_session_id, p_actual_counted_cash, p_variance_explanation)`:
     Validates session, calculates variance, enforces non-empty explanation if variance != 0, and updates status to 'SUBMITTED'.
   - `fn_confirm_cash_handover(p_handover_id)`:
     Two-party commit: Verifies receiver manager is `auth.uid()`, marks status 'ACCEPTED', deducts sender session, and increments receiver session.
```

---

#### 🔹 PROMPT 06: Supabase Migration — Meal Engine, Settings, Rates & 10 PM Cutoff Procedure
* **উদ্দেশ্য:** মিল মডিউল সক্রিয়করণ, মিল রেট চার্ট, বর্ডারদের মিল অন/অফ সিলেকশন, মিল পরিবর্তন অডিট এবং সার্ভার-সাইড রাত ১০:০০ টা কাটঅফ প্রসিডিউর তৈরি করা।
* **রেফারেন্স ফাইল:** `database_schema.md` (Section 3.7) & `architecture.md` (Section 7.1)

```markdown
### TASK: Step 06 - Supabase Migration: Meal Module & 10 PM Asia/Dhaka Cutoff Engine

Create migration `supabase/migrations/20261015000005_meal_engine_and_cutoff.sql`:

1. **Meal Configuration & Selection Tables:**
   - `public.meal_settings`: `id` UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001', `is_meal_module_enabled` boolean DEFAULT true, `breakfast_enabled` boolean DEFAULT true, `lunch_enabled` boolean DEFAULT true, `dinner_enabled` boolean DEFAULT true, `cutoff_time TIME` DEFAULT '22:00:00' (10:00 PM Asia/Dhaka), `updated_by`, timestamps.
   - `public.meal_rates`: `id`, `effective_from DATE`, `effective_to DATE`, `breakfast_rate NUMERIC(8,2)` DEFAULT 0.00, `lunch_rate NUMERIC(8,2)` DEFAULT 0.00, `dinner_rate NUMERIC(8,2)` DEFAULT 0.00, `created_by`, timestamps.
   - `public.meal_selections`: `id`, `boarder_id` FK boarders(id) CASCADE, `flat_id` FK flats(id) RESTRICT, `meal_date DATE`, `breakfast` boolean DEFAULT false, `lunch` boolean DEFAULT false, `dinner` boolean DEFAULT false, `is_locked` boolean DEFAULT false, `is_override` boolean DEFAULT false, `override_reason TEXT`, `override_by` FK profiles(id), timestamps, UNIQUE(boarder_id, meal_date).
   - `public.meal_change_audit`: `id`, `selection_id` FK meal_selections(id) CASCADE, `boarder_id` FK boarders(id), `meal_date DATE`, `session_changed meal_session`, `old_value` boolean, `new_value` boolean, `changed_by` FK profiles(id), `changed_at`.

2. **Atomic Cutoff Enforcing Function (`fn_toggle_meal_selection`):**
   - Inputs: `p_meal_date DATE`, `p_session VARCHAR(20)`, `p_new_state BOOLEAN`, `p_override_reason TEXT DEFAULT NULL`.
   - Security: `SECURITY DEFINER SET search_path = public, pg_temp`.
   - Timezone Logic: Evaluate `current_dhaka_time` and `current_dhaka_date` using `timezone('Asia/Dhaka', now())`.
   - Cutoff Validation:
     * If `p_meal_date = tomorrow` AND `current_dhaka_time >= '22:00:00'`: Only users with role 'SUPER_ADMIN' or 'ADMIN' can proceed with `is_override = true` and mandatory reason. Normal boarders are rejected with SQL exception: `"10:00 PM cutoff reached. Next-day meal changes are locked."`
     * If `p_meal_date <= today`: Blocked for normal users; admin override only.
   - Upsert into `meal_selections` on conflict `(boarder_id, meal_date)` and insert row into `meal_change_audit`.
```

---

#### 🔹 PROMPT 07: Supabase Migration — Row Level Security (RLS) Policies, Triggers & Views
* **উদ্দেশ্য:** ডাটাবেসের প্রতিটি টেবিলে RLS সক্রিয় করা, জিরো-ট্রাস্ট সিকিউরিটি পলিসি, অডিট ট্রিগার এবং রিপোর্টের জন্য SQL Views তৈরি করা।
* **রেফারেন্স ফাইল:** `security.md` (Sections 4, 7) & `database_schema.md` (Section 5)

```markdown
### TASK: Step 07 - Supabase Migration: RLS Policies, Audit Triggers & Reporting Views

Create migration `supabase/migrations/20261015000006_rls_audit_and_views.sql`:

1. **RLS Helper Functions:**
   - `auth.current_user_role()`: Returns authenticated user's role from `profiles`.
   - `auth.is_admin_or_owner()`: Returns true if user is SUPER_ADMIN or ADMIN.
   - `auth.has_flat_access(p_flat_id UUID)`: Returns true if admin OR flat assigned in `user_flat_assignments`.

2. **Row Level Security (RLS) Policies:**
   - Enable RLS on all public tables: `profiles`, `user_flat_assignments`, `buildings`, `flats`, `rooms`, `seats`, `boarders`, `allocations`, `financial_accounts`, `boarder_charges`, `receipts`, `expenses`, `manager_cash_sessions`, `meal_selections`, `audit_logs`.
   - Implement policies from `security.md`:
     * `boarders`: Applicant can only insert and view their own PENDING record. Boarders can view only self. Managers see only boarders in assigned flats.
     * `flats` & `rooms`: Filtered by `user_flat_assignments` for managers; global for admins.
     * `receipts` & `expenses`: Immutable. No direct client DELETE or UPDATE. Inserts validated by collector role.
     * `manager_cash_sessions`: Manager can view and edit only their own OPEN session; Admins view all.
     * `meal_selections`: Boarder can select only self. Direct INSERT/UPDATE barred—must use RPC `fn_toggle_meal_selection`.
     * `audit_logs`: Read-only for SUPER_ADMIN and AUDITOR. Nobody can insert/update/delete directly.

3. **Automated Audit Logging Trigger:**
   - Create `public.audit_logs` table (id, table_name, record_id, action, old_data, new_data, actor_id, created_at).
   - Create generic trigger function `fn_audit_trigger()` that serializes `OLD` and `NEW` records to JSONB.
   - Attach triggers to `allocations`, `receipts`, `expenses`, `manager_cash_sessions`, `boarder_charges`.

4. **Optimized Reporting Views:**
   - `vw_manager_daily_reconciliation`: Aggregates opening, receipts, expenses, handovers, counted cash, variance by manager and session date.
   - `vw_flat_daily_meal_summary`: Aggregates breakfast, lunch, dinner, and total counts grouped by meal date and flat.
   - `vw_boarder_dues_summary`: Joins boarders, active allocations, seats, flats, and unpaid charges to present total billed, total paid, and overdue aging balances.
```

---

#### 🔹 PROMPT 08: Supabase Seed Data & TypeScript Database Interfaces
* **উদ্দেশ্য:** সিস্টেমে ডিফল্ট ডাটা (ক্যাটাগরি, টেস্ট হোস্টেল বিল্ডিং, অ্যাডমিন একাউন্ট) ইনসার্ট করা এবং ফ্রন্টএন্ডের জন্য TypeScript Database Interfaces তৈরি করা।
* **রেফারেন্স ফাইল:** `deployment.md` (Section 3.3) & `api_contracts.md` (Section 5)

```markdown
### TASK: Step 08 - Database Seed Script & TypeScript Type Definitions

1. **Seed Data Migration (`supabase/migrations/20261015000007_seed_initial_data.sql`):**
   - Seed Expense Categories: 'Electric Bill', 'Water & Gas', 'Internet & WiFi', 'Maintenance & Repairs', 'Cook & Cleaner Salary', 'Cleaning Supplies', 'Miscellaneous'.
   - Seed Income Categories: 'Boarder Rent', 'Security Deposit', 'Guest Stay Fee', 'Scrap Sale'.
   - Seed Initial Property: Building "Sunflower Hostel (BLD-01)", Flat "Flat 2A (FLAT-2A)", Room "Room 101", 3 Seats ("Seat S-101-A", "Seat S-101-B", "Seat S-101-C" with default rent 4,500.00 BDT).
   - Seed Default Meal Settings: module enabled, all 3 sessions enabled, cutoff time 22:00:00.
   - Seed Initial Meal Rate: Breakfast 25 BDT, Lunch 60 BDT, Dinner 60 BDT (Effective from 2026-10-01).

2. **TypeScript Domain Interfaces (`src/types/database.ts`):**
   - Create complete TypeScript type definitions mirroring PostgreSQL schema: `UserRole`, `Building`, `Flat`, `Room`, `Seat`, `Boarder`, `Allocation`, `FinancialAccount`, `BoarderCharge`, `Receipt`, `Expense`, `ManagerCashSession`, `MealSelection`, `MealRate`, `AuditLog`.
   - Create API Request/Response DTO types (`MealSelectionToggleRequest`, `RecordReceiptRequest`, `DailyCashCloseRequest`, `ApiResponse<T>`).
```

---

### Phase 2: Core Frontend Infrastructure & Authentication

#### 🔹 PROMPT 09: Supabase Client Singleton, Auth Store (Zustand) & Protected Route Guards
* **উদ্দেশ্য:** `@supabase/supabase-js` ক্লায়েন্ট কনফিগার করা, Zustand-এ অথেনটিকেশন ও পারমিশন স্টেট সংরক্ষণ এবং React Router v6-এ RBAC গার্ড তৈরি করা।
* **রেফারেন্স ফাইল:** `architecture.md` (Section 8.1) & `security.md` (Section 3)

```markdown
### TASK: Step 09 - Supabase Client Singleton, Auth Store & Route Guards

1. **Supabase Client (`src/lib/supabaseClient.ts`):**
   - Initialize Supabase client using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.
   - Setup token refresh listener and automatic session synchronization.

2. **Global Auth State (`src/app/store/useAuthStore.ts`):**
   - State: `user: User | null`, `profile: Profile | null`, `assignedFlats: string[]`, `isLoading: boolean`, `isAuthenticated: boolean`.
   - Actions: `setSession(session)`, `fetchProfile()`, `signOut()`, `hasRole(roles: UserRole[])`, `hasFlatAccess(flatId: string)`.

3. **Routing & Role-Based Navigation Guards (`src/app/router.tsx`):**
   - Implement React Router v6 with code-splitting via `React.lazy`.
   - Create `<ProtectedRoute allowedRoles={[...]} />` wrapper:
     * If unauthenticated, redirect to `/login`.
     * If user role is `APPLICANT`, strictly confine them to `/portal/my-application`. Block access to ERP navigation.
     * If user lacks role, redirect to `/unauthorized` (with user-friendly Bengali error explanation).
   - Define core route hierarchy:
     * Public: `/login`, `/register` (Boarder applicant form), `/forgot-password`.
     * Boarder Portal: `/portal/dashboard`, `/portal/my-meals`, `/portal/my-dues`, `/portal/my-application`.
     * Staff/Admin ERP: `/dashboard`, `/accommodation/*`, `/boarders/*`, `/billing/*`, `/cash-custody/*`, `/meals/*`, `/reports/*`, `/settings/*`.
```

---

#### 🔹 PROMPT 10: App Shell Layout, Responsive Sidebar, Header, Mobile Nav & Language Switcher
* **উদ্দেশ্য:** রেসপন্সিভ ডেস্কটপ সাইডবার, মোবাইল বটম নেভিগেশন বার, হেডারে রিয়েল-টাইম নোটিফিকেশন বেল, ইউজার ড্রপডাউন এবং ইনস্ট্যান্ট বাংলা/ইংরেজি ল্যাঙ্গুয়েজ সুইচার তৈরি করা।
* **রেফারেন্স ফাইল:** `architecture.md` (Section 8.1) & PRD (Section 8)

```markdown
### TASK: Step 10 - App Shell Layout, Navigation & Bilingual Language Toggle

1. **Header Component (`src/components/layout/Header.tsx`):**
   - Display hostel title, current date & time in `Asia/Dhaka` format.
   - Language selector toggle button (`বাং / ENG`) with active flag indicator.
   - User profile dropdown with avatar, user full name, role badge, and Sign Out action.
   - Network connectivity indicator (PWA online/offline badge).

2. **Desktop Sidebar (`src/components/layout/Sidebar.tsx`):**
   - Modern dark/glass styling (`#0f172a` slate theme with indigo accents).
   - Dynamic navigation items rendered based on the user's role:
     * Super Admin/Admin: Full menu (Dashboard, Accommodation, Boarders, Billing, Cash Custody, Meals, 16 Reports, Audit Logs, Settings).
     * Manager: Assigned Accommodation, Boarder Check-in, Collect Receipt, Daily Cash Session, Flat Meals, Flat Reports.
     * Meal Operator: Kitchen Meal List, Flat Daily Counts.
     * Boarder: My Room, My Dues & Receipts, Meal Selection (ON/OFF).
   - Collapsible toggle for compact view on smaller laptop screens.

3. **Mobile Bottom Navigation (`src/components/layout/MobileNav.tsx`):**
   - Ergonomic 4-5 bottom touch icons for mobile PWA view (Home, Meals, Receipts/Cash, Profile, Menu).

4. **Layout Wrapper (`src/components/layout/AppLayout.tsx`):**
   - Integrates Header, Sidebar, MobileNav, and dynamic Content Outlet.
   - Fully responsive, smooth transitions, high-contrast readable typography.
```

---

#### 🔹 PROMPT 11: Authentication Views — Login, Password Reset & Boarder Registration Portal
* **উদ্দেশ্য:** সাইন-ইন পেজ, পাসওয়ার্ড রিসেট এবং হবু বর্ডারদের সেলফ-রেজিস্ট্রেশন পোর্টাল তৈরি করা (যেখানে আবেদনকারী শুধুমাত্র নিজের স্ট্যাটাস দেখতে পাবে)।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 5) & `security.md` (Section 4.2)

```markdown
### TASK: Step 11 - Authentication Pages & Boarder Registration Portal

1. **Login Page (`src/features/auth/LoginPage.tsx`):**
   - Email/Phone and Password authentication against Supabase Auth.
   - Remember Me option, Show/Hide password toggle.
   - Clean, professional hostel branded UI with bilingual strings.
   - Redirect to role-appropriate home screen after login (Boarder -> `/portal/my-meals`, Admin -> `/dashboard`).

2. **Applicant Public Registration (`src/features/auth/RegisterPortal.tsx`):**
   - Public multistep form for prospective boarders:
     * Step 1: Personal info (Full Name, Phone, Email, Guardian details, Address).
     * Step 2: Student/Job info (Institution, Department, Student ID).
     * Step 3: NID/Passport number & file upload (image/PDF) to Supabase Storage `boarder-documents`.
     * Step 4: Account password creation.
   - Upon submission, create Supabase auth user with role `APPLICANT`, insert into `public.boarders` with status `PENDING`.

3. **Applicant Status Screen (`src/features/auth/ApplicationStatusPage.tsx`):**
   - Shows applicant's current status: "PENDING REVIEW" (হলুদ), "APPROVED" (সবুজ), or "REJECTED" (লাল).
   - Displays clear bilingual message: *"আপনার আবেদনটি ম্যানেজার বা অ্যাডমিনের পর্যালোচনায় আছে। অনুমোদনের পর আপনি মূল ড্যাশবোর্ডে প্রবেশ করতে পারবেন।"*
   - Strictly verifies that applicant cannot navigate to any other ERP screen.
```

---

### Phase 3: Accommodation & Boarder Lifecycle Management

#### 🔹 PROMPT 12: Accommodation Hierarchy Management — Buildings, Flats, Rooms & Seat Grid
* **উদ্দেশ্য:** বিল্ডিং, ফ্ল্যাট, রুম এবং সিটের কমপ্লিট CRUD ইন্টারফেস তৈরি করা, যেখানে সিটের লাইভ অকুপেন্সি গ্রিড (Available, Occupied, Maintenance) রঙসহ ভিজ্যুয়ালি প্রদর্শিত হবে।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.2) & `architecture.md` (Section 5.2)

```markdown
### TASK: Step 12 - Accommodation Hierarchy & Interactive Seat Grid

1. **Data Hooks (`src/features/accommodation/api/useAccommodation.ts`):**
   - TanStack Query hooks to fetch buildings, flats, rooms, and seats with search, status filters, and flat-scoping for managers.
   - Mutations for creating/updating buildings, flats, rooms, and seats.

2. **Views & Components (`src/features/accommodation/`):**
   - `BuildingList.tsx`: List and add/edit buildings (code, address, status).
   - `FlatList.tsx`: Flats grouped by building with floor numbers.
   - `RoomList.tsx`: Room list with room type and capacity indicators.
   - `SeatMatrixView.tsx`: High-impact visual seat grid:
     * Filterable by Building and Flat.
     * Color-coded seat cards: Available (Emerald Green), Occupied (Indigo Blue), Maintenance (Amber), Inactive (Slate).
     * Displays Seat Code, Room Name, Default Rent in BDT (৳), and current occupant name if occupied.
     * Quick action button on Available seats: "Allocate Seat" (সিট বরাদ্দ করুন).

3. **Seat Modal (`src/features/accommodation/components/SeatModal.tsx`):**
   - Modal to add/edit seat code, seat type, and specific default monthly rent.
```

---

#### 🔹 PROMPT 13: Boarder Management — Applicant Verification, Profile & Document Storage
* **উদ্দেশ্য:** অ্যাডমিন ও ম্যানেজারদের জন্য বর্ডার ডিরেক্টরি, নতুন আবেদন অনুমোদন/বাতিল ওয়ার্কফ্লো এবং আপলোডকৃত NID ডকুমেন্ট দেখার সুরক্ষিত ভিউয়ার তৈরি করা।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.3) & `security.md` (Section 5)

```markdown
### TASK: Step 13 - Boarder Directory, Approval Workflow & Profile Management

1. **Boarder Directory (`src/features/boarders/BoarderListPage.tsx`):**
   - Searchable, paginated table of boarders with status filter (`PENDING`, `ACTIVE`, `LEFT`, `REJECTED`).
   - Columns: Boarder Code, Photo, Full Name, Mobile, Institution/Job, Assigned Flat & Seat, Admission Date, Status Badge, Actions.
   - Quick filters: "Pending Applications" badge tab showing count of unapproved applicants.

2. **Applicant Verification Modal (`src/features/boarders/components/ApplicantReviewModal.tsx`):**
   - Displays applicant's full bio, guardian contact, permanent address, and admission date.
   - Secure document viewer: Generates 15-minute signed URL from private Supabase Storage bucket `boarder-documents` to preview NID/Student ID image/PDF.
   - Action buttons: "Approve Applicant" (আপগ্রেড করে BOARDER রোল প্রদান ও স্ট্যাটাস ACTIVE করা) এবং "Reject Applicant" (কারণসহ রিজেক্ট করা)।

3. **Boarder Detail Profile (`src/features/boarders/BoarderDetailPage.tsx`):**
   - Comprehensive tabbed view: Personal Info, Seat Allocation History, Rent Charges & Dues Ledger, Meal Participation History.
```

---

#### 🔹 PROMPT 14: Seat Allocation Management, Transfer, Cancellation & Occupancy History
* **উদ্দেশ্য:** অনুমোদিত বর্ডারদের সিট বরাদ্দ, সিট পরিবর্তন (ট্রান্সফার), বরাদ্দ বাতিল এবং ডাটাবেস-লেভেল ডাবল বুকিং চেক নিশ্চিত করা।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.4) & `architecture.md` (Section 5.3)

```markdown
### TASK: Step 14 - Seat Allocation, Transfer & Occupancy History

1. **Seat Allocation Workflow (`src/features/accommodation/components/AllocateSeatModal.tsx`):**
   - Select approved boarder (without active allocation).
   - Select available seat from dropdown (filtered by building and flat).
   - Input monthly agreed rent (auto-populated with seat default rent, editable), security deposit amount, start date, and remarks.
   - On submit, call `fn_allocate_seat` RPC function.
   - Handle unique constraint error gracefully: Show clear toast if seat was just occupied by another manager.

2. **Seat Transfer Workflow (`src/features/accommodation/components/TransferSeatModal.tsx`):**
   - Select active allocation, select new target available seat, effective transfer date, and reason.
   - Atomically ends old allocation, sets previous seat to AVAILABLE, creates new allocation, sets new seat to OCCUPIED, and records row in `public.allocation_history`.

3. **Seat Cancellation / Departure Workflow:**
   - Mark allocation as ENDED or CANCELLED, record departure date and leaving reason.
   - Triggers automatic seat status release back to AVAILABLE.
```

---

### Phase 4: Billing, Invoicing & Receipts

#### 🔹 PROMPT 15: Billing & Dues Engine — Monthly Rent Generation, Invoicing & Due Aging
* **উদ্দেশ্য:** প্রতি মাসের ভাড়া ও ইউটিলিটি বিল চার্জ জেনারেট করা, বর্ডার-ভিত্তিক মোট বিল, পেইড অ্যামাউন্ট এবং ওভারডিউ ডিউ ব্যালেন্স ট্র্যাকিং স্ক্রিন তৈরি করা।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.5) & `database_schema.md` (Section 3.4, 5.3)

```markdown
### TASK: Step 15 - Recurring Billing Engine & Boarder Dues Ledger

1. **Monthly Rent Batch Generation (`src/features/billing/GenerateMonthlyChargesModal.tsx`):**
   - Admin tool: Select billing month (e.g. November 2026), due date (e.g. 10th of the month).
   - Queries all ACTIVE seat allocations and batch-creates `RENT` charges in `public.boarder_charges` with their specific agreed monthly rent.
   - Prevents duplicate rent generation for the same boarder and month.

2. **Boarder Dues Ledger (`src/features/billing/BoarderDuesPage.tsx`):**
   - Connects to SQL view `vw_boarder_dues_summary`.
   - Data Table: Boarder Code, Name, Flat & Seat, Total Billed, Total Paid, Outstanding Due (লাল রঙে হাইলাইট), Overdue Amount, Actions.
   - Search by boarder name or mobile; filter by flat and overdue status.
   - Action: "Collect Payment" (টাকা গ্রহণ করুন) button opening Receipt modal.

3. **Manual Charge Invoicing Modal:**
   - Add ad-hoc charge (Utility, Penalty, Wifi, Admission Fee, Other) to any specific boarder.
```

---

#### 🔹 PROMPT 16: Atomic Receipt Collection, Partial Payment Settlement & Void/Reversal Modal
* **উদ্দেশ্য:** ক্যাশ/ব্যাংক/বিকাশ পেমেন্টের মানি রিসিপ্ট কাটা, বকেয়া চার্জের সাথে টাকা সমন্বয় করা, প্রিন্টযোগ্য ইনভয়েস তৈরি এবং ভুল রিসিপ্ট বাতিলের জন্য Void Modal তৈরি করা।
* **রেফারেন্স ফাইল:** `architecture.md` (Section 7.2) & `api_contracts.md` (Section 3.2, 3.6)

```markdown
### TASK: Step 16 - Atomic Receipt Collection, Invoice Printing & Void Workflow

1. **Collect Receipt Modal (`src/features/billing/components/CollectReceiptModal.tsx`):**
   - Select Boarder -> fetches their pending UNPAID and PARTIALLY_PAID charges.
   - Enter Total Amount Received, Payment Method (CASH, BANK_TRANSFER, MFS), Destination Account (Manager Cash / Hostel Bank / bKash), Transaction Reference.
   - Payment Allocation Matrix: Allows full or partial allocation of payment across outstanding charges with "Auto-distribute to oldest dues" button.
   - On submit, call `fn_record_receipt` RPC. Returns sequential receipt number (e.g. `REC-202610-1001`).

2. **Printable Official Receipt / Invoice (`src/features/billing/components/ReceiptPrintView.tsx`):**
   - Clean, professional 80mm POS receipt or A4 voucher format:
     * Hostel Name & Logo, Official Receipt Number, Date & Time in `Asia/Dhaka`.
     * Boarder Details (Name, Phone, Flat, Seat).
     * Itemized charges settled, Total Paid, Remaining Due Balance.
     * Collector Name (Manager) signature line and digital validation mark.
     * Browser native print button + instant PDF download button.

3. **Receipt List & Void Reversal Modal (`src/features/billing/ReceiptListPage.tsx`):**
   - Searchable receipt list with collector name and status (`VALID` or `VOID`).
   - For Super Admin / Accountant: "Void Receipt" (রিসিপ্ট বাতিল করুন) button.
   - Opens modal requiring mandatory cancellation reason; calls `fn_void_receipt` RPC which reverses balances and creates audit trail.
```

---

### Phase 5: Expenses, Non-Rent Incomes & Account Transfers

#### 🔹 PROMPT 17: Expense Management — Voucher Upload, Flat-wise Expenses & Approvals
* **উদ্দেশ্য:** হোস্টেলের দৈনন্দিন খরচ এন্ট্রি, ফ্ল্যাট-ভিত্তিক খরচ ট্র্যাকিং, ক্যাশ মেমো/ভাউচারের ছবি আপলোড এবং ওনার অনুমোদনের ওয়ার্কফ্লো তৈরি করা।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.6) & `database_schema.md` (Section 3.5)

```markdown
### TASK: Step 17 - Hostel Expense Entry, Voucher Upload & Approvals

1. **Expense Data Hooks & Components (`src/features/expenses/`):**
   - Create hooks for fetching, filtering, and submitting expenses.
   - `ExpenseListPage.tsx`: Displays voucher number, date, expense category, flat name (if flat-specific), amount in BDT, paid by (manager), voucher attachment preview, approval badge (`PENDING`, `APPROVED`, `REJECTED`).

2. **Record Expense Modal (`src/features/expenses/components/AddExpenseModal.tsx`):**
   - Fields: Expense Date, Category (Electric, Water, Wifi, Maintenance, Supplies, Cleaner, Misc), Source Account (Manager Cash / Bank), Amount, Building/Flat (Optional for flat-wise expenses), Description.
   - Voucher File Upload: Native mobile camera or file picker uploading image/PDF to Supabase private storage `expense-receipts`.
   - On submit, inserts row with unique `expense_voucher_no` and deducts account balance. If paid from manager cash, updates manager's current cash session expenses.

3. **Expense Approval Workflow:**
   - Admin view: Quick "Approve" or "Reject with Reason" buttons for pending expense entries.
```

---

#### 🔹 PROMPT 18: Non-Rent Incomes & Internal Account Transfers (Cash/Bank/MFS)
* **উদ্দেশ্য:** ভাড়া ছাড়া অন্যান্য আয় এন্ট্রি এবং বিভিন্ন অ্যাকাউন্টের মধ্যে টাকা স্থানান্তর (টাকা কোনোভাবেই ডাবল কাউন্ট বা নতুন আয়-ব্যয় হিসেবে গণ্য হবে না)।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.9) & `database_schema.md` (Section 3.4, 3.5)

```markdown
### TASK: Step 18 - Non-Rent Incomes & Inter-Account Transfers

1. **Non-Rent Income Entry (`src/features/finance/IncomeListPage.tsx`):**
   - Form to record guest stay fees, scrap sales, or other miscellaneous revenues.
   - Fields: Date, Income Category, Destination Financial Account, Amount, Description, Received By.
   - Reflects in destination account balance and manager cash session (if received in cash).

2. **Internal Account Transfers (`src/features/finance/AccountTransfersPage.tsx`):**
   - Form to record money movement between physical accounts (e.g. Manager Cash -> Hostel Bank, or bKash -> Bank).
   - Source Account, Destination Account, Amount, Transfer Date, Reference/Transaction ID, Remarks.
   - Validates that source account has sufficient balance and source != destination.
   - Explicitly excluded from operating income and operating expense totals in financial reports.
```

---

### Phase 6: Manager Cash Custody & Daily Reconciliation

#### 🔹 PROMPT 19: Manager Cash Custody — Real-Time Cash Flow Tracker & Prior-Day Carryover
* **উদ্দেশ্য:** ম্যানেজারদের জন্য লাইভ ক্যাশ ট্র্যাকিং ড্যাশবোর্ড তৈরি করা, যেখানে প্রারম্ভিক ক্যাশ আগের দিনের ব্যালেন্স থেকে আসবে এবং ক্যাশ রিসিট, খরচ ও ট্রান্সফার রিয়েল-টাইমে আপডেট হবে।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.7) & `architecture.md` (Section 5.5)

```markdown
### TASK: Step 19 - Manager Cash Custody Dashboard & Real-Time Balance Tracker

1. **Manager Cash Session Hook (`src/features/cash-custody/api/useCashSession.ts`):**
   - Automatically calls `fn_initialize_daily_cash_session` on page load to ensure today's session is created.
   - Fetches live session data: `opening_cash`, `cash_receipts`, `cash_expenses`, `cash_deposited_to_owner`, `cash_handed_over_out`, `cash_handed_over_in`, `expected_closing_cash`.

2. **Cash Custody Cockpit (`src/features/cash-custody/ManagerCashDashboard.tsx`):**
   - High-visibility KPI Cards:
     * 🟢 **Opening Cash (প্রারম্ভিক ক্যাশ):** Seeded from prior finalized day.
     * ➕ **Cash Collections (ক্যাশ কালেকশন):** Total cash receipts collected today.
     * ➖ **Cash Expenses (ক্যাশ খরচ):** Authorized cash disbursements today.
     * 🔄 **Transfers & Deposits (হ্যান্ডওভার ও ওনার ডিপোজিট):** Net cash sent/received.
     * 💼 **Expected Closing Cash (হাতে থাকা প্রত্যাশিত ক্যাশ):** Calculated dynamically via formula.
   - Action Buttons: "Handover Cash to Manager", "Deposit to Owner", "Day-End Cash Closing".
```

---

#### 🔹 PROMPT 20: Day-End Cash Closing, Variance Workflow, Handovers & Owner Deposits
* **উদ্দেশ্য:** দিনশেষে ম্যানেজারের গণনা করা ক্যাশ এন্ট্রি, ভ্যারিয়েন্সের হিসাব, গরমিল থাকলে বাধ্যতামূলক কৈফিয়ত গ্রহণ এবং দুই ম্যানেজারের মধ্যে ক্যাশ হ্যান্ডওভার নিশ্চিতকরণ।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.7) & `api_contracts.md` (Section 3.3, 3.4)

```markdown
### TASK: Step 20 - Day-End Cash Closing, Variance Workflow & Two-Party Handovers

1. **Day-End Cash Closing Modal (`src/features/cash-custody/components/DailyClosingModal.tsx`):**
   - Displays current `expected_closing_cash` in BDT.
   - Manager enters `actual_counted_cash` (ফিজিক্যাল গণনা করা টাকা).
   - Live variance calculator: `Variance = Counted Cash - Expected Cash`.
   - If Variance != 0: Displays warning alert and enforces mandatory text area for `variance_explanation` (কম বা বেশির সুনির্দিষ্ট কারণ).
   - On submit, calls `fn_submit_daily_cash_close` RPC and locks form to SUBMITTED state.

2. **Two-Party Cash Handover Modal & Confirmation:**
   - Initiating Manager: Selects Receiving Manager, amount, and reason -> status PENDING.
   - Receiving Manager Dashboard: Shows prominent alert banner: *"Manager [Name] has sent you [Amount] BDT. Please confirm receipt."*
   - Receiver clicks "Confirm & Accept" -> calls `fn_confirm_cash_handover` RPC. Atomically transfers cash between manager sessions.

3. **Deposit Cash to Owner Modal:**
   - Manager records money handed/banked directly to the hostel owner with voucher attachment.
   - Reduces manager expected cash custody without affecting hostel operating profit.
```

---

### Phase 7: Meal Management & Realtime Synchronization

#### 🔹 PROMPT 21: Boarder Self-Service Meal Toggle Grid & 10:00 PM Asia/Dhaka Countdown Timer
* **উদ্দেশ্য:** বর্ডারদের জন্য আগামীকালের ও ভবিষ্যতের মিল (ব্রেকফাস্ট, লাঞ্চ, ডিনার) অন/অফ করার ইন্টারঅ্যাক্টিভ গ্রিড তৈরি করা, যেখানে রাত ১০:০০ টা কাটঅফ টাইমার লাইভ কাউন্টডাউন করবে।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.8.1) & `architecture.md` (Section 5.6)

```markdown
### TASK: Step 21 - Boarder Self-Service Meal Toggle & 10 PM Cutoff UI

1. **Boarder Meal Portal (`src/features/meals/BoarderMealPortal.tsx`):**
   - Calendar / Week Strip selector for future dates.
   - Prominently displays **Asia/Dhaka Real-time Clock** and **10:00 PM Next-Day Cutoff Countdown Timer** (e.g. *"আর মাত্র ১ ঘণ্টা ১৫ মিনিট বাকি মিল পরিবর্তনের জন্য"*).
   - When viewing tomorrow's date after 22:00:00 Dhaka time: Toggles disable automatically with lock icon and warning: *"আজকের রাত ১০:০০ টার কাটঅফ সময় পার হয়ে গেছে। আগামীকালের মিল পরিবর্তন লক করা আছে।"*

2. **Meal Session Toggle Cards:**
   - 🍳 **Breakfast (সকালের নাস্তা):** Toggle Switch (ON/OFF).
   - 🍛 **Lunch (দুপুরের খাবার):** Toggle Switch (ON/OFF).
   - 🍲 **Dinner (রাতের খাবার):** Toggle Switch (ON/OFF).
   - When toggled, invokes `fn_toggle_meal_selection` RPC. Shows instant optimistic feedback and success toast.
   - If backend rejects due to server-side cutoff (e.g. client clock was manipulated), reverts toggle immediately and displays server error message.
```

---

#### 🔹 PROMPT 22: Kitchen Meal Monitor with Realtime WebSocket Sync & Preparation Lists
* **উদ্দেশ্য:** কিচেন ও ম্যানেজারদের জন্য রিয়েল-টাইম মিল মনিটর তৈরি করা, যেখানে বর্ডার মিল অন/অফ করলেই স্ক্রিন স্বয়ংক্রিয়ভাবে সেকেন্ডের মধ্যে রিফ্রেশ হবে (Supabase Realtime CDC)।
* **রেফারেন্স ফাইল:** `architecture.md` (Section 8.2) & `api_contracts.md` (Section 4.1)

```markdown
### TASK: Step 22 - Realtime Kitchen Meal Monitor & Flat-wise Preparation Sheet

1. **Supabase Realtime Hook (`src/features/meals/hooks/useRealtimeMeals.ts`):**
   - Subscribes to Supabase WebSocket channel `public:meal_selections`.
   - Listens for PostgreSQL `INSERT` and `UPDATE` events on today and tomorrow's dates.
   - Triggers TanStack Query cache invalidation to update meal counts instantly without manual browser refresh.

2. **Kitchen Daily Preparation View (`src/features/meals/KitchenMealSummaryPage.tsx`):**
   - Date picker (defaults to Today / Tomorrow).
   - Flat-wise breakdown table:
     * Building & Flat Name.
     * Breakfast Count, Lunch Count, Dinner Count, Total Flat Meals.
   - Grand Total summary bar for the chef (e.g. Total Lunch: 65, Total Dinner: 72).
   - "Boarder Breakdown" modal: Clicking on any flat displays list of all boarders in that flat with their respective meal ticks.
   - "Print Kitchen Slip" button: Formats preparation list into clean printable sheet for cook dispatch.
```

---

#### 🔹 PROMPT 23: Meal Rates Management, Monthly Meal Billing & Audit Logs
* **উদ্দেশ্য:** মিলের রেট নির্ধারণ, পূর্ববর্তী হিস্টোরিক্যাল রেট সংরক্ষণ, মাসের শেষে বর্ডারদের খাওয়ার হিসাব অনুযায়ী মিল বিল জেনারেশন এবং মিল পরিবর্তনের সম্পূর্ণ অডিট লগ।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 6.8.3) & `database_schema.md` (Section 3.7)

```markdown
### TASK: Step 23 - Meal Rates Configuration, Billing & Cutoff Override Audit

1. **Meal Settings & Rates Page (`src/features/meals/MealSettingsPage.tsx`):**
   - Toggle module enabled/disabled, enable/disable individual sessions (Breakfast/Lunch/Dinner).
   - Set cutoff time (default `22:00:00 Asia/Dhaka`).
   - Rate Configuration: Effective From date, Breakfast Rate (৳), Lunch Rate (৳), Dinner Rate (৳).

2. **Monthly Meal Billing Calculation:**
   - Aggregates actual meal counts consumed by each boarder multiplied by effective rate for the period.
   - Button: "Generate Monthly Meal Charges" -> Creates `MEAL` type charges in `public.boarder_charges`.

3. **Meal Change & Cutoff Override Audit Table:**
   - Displays complete log from `public.meal_change_audit`.
   - Columns: Date, Boarder Name, Session, Previous State, New State, Changed By, Timestamp.
   - Flags Admin Overrides with distinct badge and shows documented override reason.
```

---

### Phase 8: Reports, Analytics & Master Dashboards

#### 🔹 PROMPT 24: Owner / Executive Master KPI Dashboard
* **উদ্দেশ্য:** হোস্টেল মালিক ও সুপার অ্যাডমিনের জন্য এক নজরে সব কার্যক্রম দেখার এক্সিকিউটিভ ড্যাশবোর্ড তৈরি করা।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 7.1) & `architecture.md` (Section 9.1)

```markdown
### TASK: Step 24 - Owner / Executive Master KPI Dashboard

1. **Executive KPI Cards (`src/features/dashboard/OwnerDashboardPage.tsx`):**
   - 🏢 **Occupancy Rate:** Total Seats, Occupied Seats, Vacant Seats, Occupancy %.
   - 💰 **Total Collections This Month:** Rent and other revenues collected.
   - 📉 **Total Operating Expenses This Month & Net Operating Profit.**
   - ⚠️ **Total Outstanding Boarder Dues:** Highlighted in red with aging overview.
   - 💼 **Cash in Custody:** Sum of physical cash held across all managers right now.
   - 🍽️ **Today's Active Meals:** Total Breakfast, Lunch, Dinner served today.

2. **Visual Charts & Urgent Alerts Section:**
   - 7-Day Income vs Expense trend bar chart.
   - Cash Variance Alert card: Highlights any unapproved or non-zero manager cash closings.
   - Pending Approvals card: Unapproved boarder applications and pending expense vouchers.
```

---

#### 🔹 PROMPT 25: Complete 16 Financial & Operational Reports Suite
* **উদ্দেশ্য:** PRD-তে উল্লেখিত ১৬টি সুনির্দিষ্ট ফাইন্যান্সিয়াল ও অপারেশনাল রিপোর্ট ইন্টারফেস তৈরি করা, যেখানে তারিখ ও ফ্ল্যাট ফিল্টার থাকবে।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 7.2, 7.3, 7.4) & `architecture.md` (Section 9.1)

```markdown
### TASK: Step 25 - Comprehensive 16 Financial & Operational Reports Suite

Create the report center (`src/features/reports/`) implementing the PRD mandatory suite:

1. **Daily Income & Expense Report:** Day-wise categorized receipts, expenses, and net balance.
2. **Weekly Income & Expense Report:** Week-by-week aggregated revenue and operating costs.
3. **Monthly Operating Statement:** Comprehensive monthly P&L statement.
4. **Receipt-wise Collection Report:** Filterable by date, collector manager, and payment method.
5. **Boarder Ledger & Dues Aging Report:** Billed, paid, outstanding, and overdue days.
6. **Cash Ledger & Bank/MFS Account Ledger:** Chronological debits, credits, and running balance.
7. **Manager-wise Daily Cash Report:** Opening, collections, disbursements, closing by manager.
8. **Daily Cash Closing & Reconciliation Report:** Comprehensive view of submitted sessions.
9. **Manager Expected vs Actual Cash & Variance Report:** Detailed audit of variances and reasons.
10. **Owner Deposit Report:** All deposits submitted to owner with proof references and confirmations.
11. **Cash Handover Report:** Complete log of custodian-to-custodian handovers and confirmations.
12. **Flat-wise Expense Report:** Breakdown of maintenance and utility expenses allocated per flat.
13. **Expense Category Analysis:** Category distribution and month-over-month comparison.
14. **Security Deposit Report:** Deposits received, held, adjusted, and refunded.
15. **Receipt Void & Reversal Audit Report:** Log of all cancelled receipts with reasons and authorizers.
16. **Manager Performance & Compliance Report:** Collections, timely daily closings, variance frequency.

*Note: Ensure all reports support Date-Range picker, Building/Flat selector, and Manager filter.*
```

---

#### 🔹 PROMPT 26: PDF & Excel Export Engines (`jspdf` + `exceljs`) & Print Stylesheets
* **উদ্দেশ্য:** ক্লায়েন্ট-সাইড থেকে প্রতিটি রিপোর্ট এবং ইনভয়েস হাই-কোয়ালিটি PDF, Excel স্প্রেডশিট এবং সরাসরি প্রিন্ট করার ইউটিলিটি তৈরি করা।
* **রেফারেন্স ফাইল:** `architecture.md` (Section 3, 9)

```markdown
### TASK: Step 26 - Client-Side PDF, Excel Export Engines & Print Optimization

1. **Export Utilities (`src/lib/exportUtils.ts`):**
   - **Excel Exporter (`exceljs`):**
     * Formats data tables into professional Excel workbooks with styled header rows (navy blue background, white text).
     * Formats currency columns as Bangladeshi Taka (`৳ #,##0.00`).
     * Includes metadata header: Report Title, Generated Date (Asia/Dhaka), Filters Applied.
   - **PDF Exporter (`jspdf` + `jspdf-autotable`):**
     * Generates clean PDF documents with hostel header, date range, table borders, and page numbering (Page X of Y).
     * Formats numbers and currency aligned to the right.
     * Adds summary total rows at the bottom of data tables.

2. **Print Stylesheet (`src/styles/print.css`):**
   - Hides navigation sidebar, header buttons, and pagination controls during `@media print`.
   - Forces pure white background, high-contrast black text, and page-break controls (`break-inside: avoid`).

3. **Integrate Export Buttons:**
   - Add unified `<ExportActions onPrint={...} onExportPDF={...} onExportExcel={...} />` component across all 16 reports and ledger views.
```

---

### Phase 9: Governance, System Audit & Notifications

#### 🔹 PROMPT 27: Governance — System Immutable Audit Log Viewer & Role Management
* **উদ্দেশ্য:** অডিট ট্রেইল ব্রাউজার (কে, কখন, কোন আইপি থেকে কী ডাটা পরিবর্তন করেছে) এবং ওনারের জন্য ইউজার রোল ও ফ্ল্যাট পারমিশন অ্যাসাইনমেন্ট ইন্টারফেস তৈরি করা।
* **রেফারেন্স ফাইল:** `security.md` (Section 3, 7) & `PRD.md` (Section 11)

```markdown
### TASK: Step 27 - Immutable Audit Log Browser & Role Permission Administration

1. **Audit Log Viewer (`src/features/governance/AuditLogPage.tsx`):**
   - Accessible only by `SUPER_ADMIN` and `AUDITOR`.
   - Table: Timestamp (Asia/Dhaka), Actor Name & Role, Target Table, Action (`INSERT`, `UPDATE`, `DELETE`, `VOID`, `OVERRIDE`), Record ID.
   - "Inspect Diff" Modal: Side-by-side JSON diff comparison between `old_data` and `new_data`.
   - Filterable by Actor, Date Range, Table Name, and Action Type.

2. **User Administration & Flat Assignment (`src/features/governance/UserManagementPage.tsx`):**
   - List system users with their active status, role, and assigned flats.
   - Super Admin can change user roles (e.g. upgrade APPLICANT to MANAGER or ACCOUNTANT).
   - Flat Assignment Modal: Select a Manager or Meal Operator and check/uncheck the specific flats they are authorized to manage.
```

---

#### 🔹 PROMPT 28: Real-Time Notification Center & Operational Alerts
* **উদ্দেশ্য:** সিস্টেমে রিয়েল-টাইম নোটিফিকেশন সেন্টার তৈরি করা (হ্যান্ডওভার পেন্ডিং নোটিফিকেশন, ক্যাশ ভ্যারিয়েন্স অ্যালার্ট, ওভারডিউ বিলের তাগাদা)।
* **রেফারেন্স ফাইল:** `PRD.md` (Section 13) & `database_schema.md` (Section 3.8)

```markdown
### TASK: Step 28 - In-App Notification Center & Operational Alert Banners

1. **Notification Bell Dropdown (`src/components/layout/NotificationDropdown.tsx`):**
   - Displays unread notifications badge count in top header.
   - Shows chronological list: Icon, Title, Message, Time elapsed, Action link (e.g. "Review Handover").
   - Mark as read / Mark all as read actions.

2. **System Alert Rules:**
   - **Handover Inflow Alert:** Appears immediately for receiving manager when cash is sent.
   - **Cash Variance Alert:** Triggers notification to Super Admin when a manager submits closing with variance != 0.
   - **Overdue Dues Alert:** Informs boarder on login if their monthly rent is past the due date.
   - **Backup Health Status:** Displays last successful database backup status on Admin dashboard.
```

---

### Phase 10: Quality Assurance, Testing & Production Deployment

#### 🔹 PROMPT 29: Unit & Integration Test Suite (Vitest & Component Testing)
* **উদ্দেশ্য:** কারেন্সি ও ডেট ফরম্যাটার, ব্যালেন্স ক্যালকুলেশন লজিক এবং রিঅ্যাক্ট কম্পোনেন্টগুলোর জন্য স্বয়ংক্রিয় Vitest ইউনিট টেস্ট তৈরি করা।
* **রেফারেন্স ফাইল:** `test_plan.md` (Sections 1, 2)

```markdown
### TASK: Step 29 - Vitest Unit & Integration Test Suite

1. **Setup Vitest & React Testing Library:**
   - Configure `vitest.config.ts` with jsdom environment and test setup file.

2. **Unit Tests (`src/__tests__/unit/`):**
   - `formatters.test.ts`: Test BDT currency formatting (৳ 4,500.00), Dhaka date/time timezone conversions.
   - `cashReconciliation.test.ts`: Test expected cash formula: `Opening + Receipts + HandoverIn - Expenses - Deposits - HandoverOut`. Verify exact variance calculations with zero rounding errors.
   - `mealCutoffTimer.test.ts`: Test cutoff validator function before and after 22:00:00 Asia/Dhaka.

3. **Component Tests (`src/__tests__/components/`):**
   - Test `CollectReceiptModal`: Test auto-distribution of partial payment to oldest dues.
   - Test `DailyClosingModal`: Verify submit button is disabled if variance != 0 and explanation is empty.
   - Test `LanguageSwitcher`: Verify switching toggles translation keys between English and Bengali.
```

---

#### 🔹 PROMPT 30: Database & RLS Testing Harness (`pgTAP`) & Playwright E2E Tests
* **উদ্দেশ্য:** ডাটাবেস লেভেলে pgTAP টেস্ট দিয়ে RLS পলিসি ও কনস্ট্রেইন্ট যাচাই করা এবং Playwright দিয়ে এন্ড-টু-এন্ড ব্রাউজার টেস্ট রান করা।
* **রেফারেন্স ফাইল:** `test_plan.md` (Sections 3, 4)

```markdown
### TASK: Step 30 - Database pgTAP RLS Tests & Playwright E2E Test Suite

1. **pgTAP Database Test Script (`supabase/tests/rls_and_integrity_test.sql`):**
   - Test that `idx_unique_active_seat_allocation` rejects two active allocations on the same seat.
   - Test that an APPLICANT user cannot query `public.seats` or `public.expenses`.
   - Test that a Boarder cannot view or modify another Boarder's receipts or meal selections.
   - Test that `fn_toggle_meal_selection` rejects changes for tomorrow after 10:00 PM Asia/Dhaka.

2. **Playwright E2E Test Suite (`e2e/`):**
   - `auth.spec.ts`: Test login, role redirection, and logout.
   - `mealCutoff.spec.ts`: Mock system time past 22:00:00 Dhaka time -> verify boarder toggle is disabled with lock message.
   - `realtimeMealSync.spec.ts`: Open Kitchen monitor in Context 1; toggle meal in Context 2 -> verify count updates in real-time without page refresh.
   - `receiptFlow.spec.ts`: Collect receipt -> verify dues decrease and manager cash session increments.
```

---

#### 🔹 PROMPT 31: Production Build Optimization, PWA Verification, CI/CD Pipeline & Deployment
* **উদ্দেশ্য:** প্রোডাকশন বান্ডেল অপ্টিমাইজেশন, PWA স্কোর ১০০% নিশ্চিতকরণ, GitHub Actions CI/CD ওয়ার্কফ্লো এবং Cloudflare Pages/Vercel ডিপ্লয়মেন্ট রানবুক সম্পন্ন করা।
* **রেফারেন্স ফাইল:** `deployment.md` (Sections 1, 4, 5)

```markdown
### TASK: Step 31 - Production Build, PWA Audit & Automated CI/CD Pipeline

1. **Production Build & Security Headers:**
   - Verify `npm run build` runs clean with strict TypeScript checking (`tsc --noEmit`).
   - Create `public/_headers` file containing strict Content-Security-Policy (CSP), HSTS, X-Frame-Options: DENY, and Permissions-Policy.
   - Audit frontend bundle to ensure `SUPABASE_SERVICE_ROLE_KEY` is not leaked or bundled anywhere.

2. **PWA Lighthouse Verification:**
   - Audit `manifest.json`, verify 192x192 & 512x512 icons, theme color, and offline app shell caching via Workbox.
   - Verify offline warning toast when user is disconnected from internet.

3. **GitHub Actions CI/CD Pipeline (`.github/workflows/deploy.yml`):**
   - Lint & Typecheck job -> Run Vitest unit tests -> Run Supabase DB migrations push -> Build and deploy to Cloudflare Pages / Vercel.

4. **Production Go-Live Checklist:**
   - Verify Supabase Daily Backups & PITR (Point-In-Time-Recovery) enabled.
   - Verify Asia/Dhaka timezone synchronization across all database triggers.
   - Present final release handover report to Product Owner.
```

---

## ৫. সমস্যা সমাধান ও ট্রাবলশুটিং গাইড (Troubleshooting & Tips)

| সমস্যা | সম্ভাব্য কারণ | তাৎক্ষণিক সমাধান |
| :--- | :--- | :--- |
| **RLS Error: `Permission denied for table ...`** | ইউজারের সঠিক রোল বা ফ্ল্যাট অ্যাসাইনমেন্ট নেই। | `public.profiles`-এ ইউজারের `role` চেক করুন অথবা `user_flat_assignments`-এ ফ্ল্যাট যুক্ত করুন। |
| **Meal Cutoff Exception: `10:00 PM cutoff reached`** | ঢাকা সময় অনুযায়ী রাত ১০টার পর পরিবর্তন করার চেষ্টা করা হয়েছে। | অ্যাডমিন একাউন্ট দিয়ে `is_override = true` এবং কারণ দিয়ে রিকোয়েস্ট পাঠান। |
| **Receipt Collection Error: `Account not found`** | ম্যানেজারের নামে কোনো সক্রিয় `CASH_MANAGER` একাউন্ট নেই। | `public.financial_accounts`-এ ম্যানেজারের `id` দিয়ে একটি ক্যাশ একাউন্ট যুক্ত করুন। |
| **PWA Service Worker রিফ্রেশ হচ্ছে না** | ব্রাউজারে পুরাতন ক্যাশ রয়ে গেছে। | DevTools ➔ Application ➔ Service Workers ➔ "Update on reload" টিক দিন। |

---
**প্রজেক্ট প্রস্তুতকারক:** Bachelor Home ERP Team  
**ডকুমেন্ট স্ট্যাটাস:** ফাইনাল ব্লুপ্রিন্ট ও কমপ্লিট প্রম্পট রোডম্যাপ সম্পন্ন। আপনি এখন **Prompt 01** থেকে কোড তৈরি শুরু করতে পারেন!
