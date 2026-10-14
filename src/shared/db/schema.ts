/** Full SQLite schema for DentAssist Pro (offline-first). Keep in sync with desktop. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('doctor','receptionist')),
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  phone TEXT,
  medical_history TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teeth_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  tooth_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  preparation_depth_mm REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  UNIQUE(patient_id, tooth_number)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('24h','2h')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(appointment_id, reminder_type),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','accepted','in_progress','completed','cancelled')),
  accepted_by_name TEXT,
  signature_text TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS treatment_plan_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','scheduled','in_progress','completed','cancelled')),
  appointment_id INTEGER,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('paid','pending')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  tooth_number INTEGER,
  price REAL NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  medications_json TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS patient_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('before','after')),
  date TEXT NOT NULL,
  notes TEXT,
  tooth_number INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS distributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  items TEXT,
  payment_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trx_id TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SYP',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  lab_name TEXT NOT NULL,
  work_type TEXT NOT NULL,
  sent_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'progress' CHECK(status IN ('progress','received','delayed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orthodontic_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  case_number TEXT UNIQUE,
  start_date TEXT NOT NULL,
  estimated_duration_months INTEGER NOT NULL DEFAULT 18,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','retention','completed','suspended')),
  classification TEXT NOT NULL DEFAULT 'class_1',
  appliance_type TEXT NOT NULL DEFAULT 'metal',
  arch_type TEXT NOT NULL DEFAULT 'both' CHECK(arch_type IN ('upper','lower','both')),
  extraction_plan TEXT,
  chief_complaint TEXT,
  diagnosis_notes TEXT,
  total_cost REAL NOT NULL DEFAULT 0,
  down_payment REAL NOT NULL DEFAULT 0,
  monthly_installment REAL NOT NULL DEFAULT 0,
  retainer_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orthodontic_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  visit_number INTEGER NOT NULL DEFAULT 1,
  visit_date TEXT NOT NULL,
  upper_wire TEXT,
  lower_wire TEXT,
  elastic_prescription TEXT,
  actions_json TEXT,
  broken_brackets_count INTEGER NOT NULL DEFAULT 0,
  oral_hygiene_rating INTEGER NOT NULL DEFAULT 4,
  pain_level INTEGER NOT NULL DEFAULT 1,
  amount_paid REAL NOT NULL DEFAULT 0,
  notes TEXT,
  next_appointment_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES orthodontic_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dental_implants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  tooth_number INTEGER NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  diameter_mm REAL NOT NULL,
  length_mm REAL NOT NULL,
  lot_number TEXT,
  serial_number TEXT,
  insertion_torque_ncm REAL,
  isq_value REAL,
  bone_graft_type TEXT,
  membrane_used INTEGER NOT NULL DEFAULT 0,
  sinus_lift TEXT,
  placement_date TEXT NOT NULL,
  healing_period_months INTEGER NOT NULL DEFAULT 3,
  target_loading_date TEXT,
  healing_abutment_date TEXT,
  healing_abutment_size TEXT,
  final_loading_date TEXT,
  prosthetic_type TEXT,
  status TEXT NOT NULL DEFAULT 'healing' CHECK(status IN ('planned','placed','healing','uncovered','restored','failed')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('anesthesia','composite','endodontics','surgery_implants','impression','sterilization','disposables','other')),
  specification TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'قطعة',
  min_threshold REAL NOT NULL DEFAULT 5,
  cost_per_unit REAL NOT NULL DEFAULT 0,
  distributor_id INTEGER,
  expiry_date TEXT,
  batch_number TEXT,
  location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS treatment_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  default_cost REAL NOT NULL DEFAULT 0,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

