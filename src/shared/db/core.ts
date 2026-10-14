import { SCHEMA_SQL } from '@/shared/db/schema'
import type { CredentialCrypto } from '@/shared/db/cryptoApi'
import type { SqlDatabase } from '@/shared/db/sqlTypes'

export { SCHEMA_SQL }

export type UserRole = 'doctor' | 'receptionist'

export type DbUser = {
  id: number
  username: string
  role: UserRole
  mustChangePin?: boolean
}

let db: SqlDatabase | null = null
let credentialCrypto: CredentialCrypto | null = null
let machineIdProvider: (() => string) | null = null
let patientImageDeletedHandler: ((relativePath: string) => void) | null = null

export function setPatientImageDeletedHandler(handler: ((relativePath: string) => void) | null): void {
  patientImageDeletedHandler = handler
}

export function setCredentialCrypto(crypto: CredentialCrypto): void {
  credentialCrypto = crypto
}

export function setMachineIdProvider(fn: () => string): void {
  machineIdProvider = fn
}

export function attachDatabase(instance: SqlDatabase): void {
  db = instance
  instance.exec('PRAGMA foreign_keys = ON')
  bootstrapSchema(instance)
  ensureBootstrapConfig()
}

export function detachDatabase(): void {
  db = null
}


function hashCredential(secret: string): string {
  if (!credentialCrypto) throw new Error('Credential crypto not initialized')
  return credentialCrypto.hashCredential(secret)
}

function verifyCredential(secret: string, stored: string): boolean {
  if (!credentialCrypto) throw new Error('Credential crypto not initialized')
  return credentialCrypto.verifyCredential(secret, stored)
}

function computeMachineIdInternal(): string {
  if (!machineIdProvider) throw new Error('Machine id provider not initialized')
  return machineIdProvider()
}

export function bootstrapSchema(instance: SqlDatabase): void {
  instance.exec(SCHEMA_SQL)
  migrateTeethStatusSchema(instance)
  migrateOrthoSchema(instance)
  migrateImplantsSchema(instance)
  migrateInventorySchema(instance)
  migrateTreatmentCatalogSchema(instance)
}

function migrateTeethStatusSchema(instance: SqlDatabase): void {
  const cols = instance.prepare(`PRAGMA table_info(teeth_status)`).all() as { name: string }[]
  if (!cols.some((c) => c.name === 'preparation_depth_mm')) {
    instance.exec(`ALTER TABLE teeth_status ADD COLUMN preparation_depth_mm REAL`)
  }
}

function migrateOrthoSchema(instance: SqlDatabase): void {
  instance.exec(`
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
  `)
}

function migrateImplantsSchema(instance: SqlDatabase): void {
  instance.exec(`
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
  `)
}

function migrateInventorySchema(instance: SqlDatabase): void {
  instance.exec(`
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
  `)
  try {
    const countRow = instance.prepare('SELECT COUNT(*) as c FROM inventory_items').get() as { c: number }
    if (countRow && countRow.c === 0) {
      const seed = [
        ['بنج أرتيكائين 4% مع أدرينالين 1:100,000 (Articaine)', 'anesthesia', 'علبة 50 كاربولة - Septodont', 6, 'علبة', 3, 145000, '2027-02-28', 'LOT-98211', 'ثلاجة التخدير'],
        ['بنج ليدوكائين 2% (Lidocaine 2%)', 'anesthesia', 'علبة 50 كاربولة مع أدرينالين', 4, 'علبة', 2, 95000, '2026-11-15', 'LOT-44120', 'خزانة التخدير'],
        ['إبر بنج قصيرة (Dental Needles 30G Short)', 'anesthesia', 'علبة 100 إبرة - غيج 30', 5, 'علبة', 2, 45000, '2027-05-20', 'LOT-88123', 'درج التخدير'],
        ['كمبوزيت نانو هيبريد لون A1 (3M Filtek Z250)', 'composite', 'سيرنج 4غ لون A1', 3, 'سيرنج', 2, 120000, '2026-12-31', 'LOT-Z250-A1', 'درج الحشوات'],
        ['كمبوزيت نانو هيبريد لون A2 (3M Filtek Z350 XT)', 'composite', 'سيرنج 4غ لون A2 الأكثر طلباً', 8, 'سيرنج', 4, 160000, '2027-03-31', 'LOT-Z350-A2', 'درج الحشوات'],
        ['كمبوزيت نانو هيبريد لون A3 (3M Filtek Z350 XT)', 'composite', 'سيرنج 4غ لون A3', 5, 'سيرنج', 3, 160000, '2027-04-30', 'LOT-Z350-A3', 'درج الحشوات'],
        ['كمبوزيت سائل فلو لون A2 (Flowable Composite)', 'composite', 'سيرنج 2غ عالي اللزوجة', 4, 'سيرنج', 2, 85000, '2026-09-30', 'LOT-FLW-88', 'درج الحشوات'],
        ['حمض التخريش + بوندينغ الجيل الخامس (Bond & Etch)', 'composite', 'علبة زجاجة 5مل + سرنجة حمض', 4, 'علبة', 2, 130000, '2026-10-31', 'LOT-BOND-5', 'درج الحشوات'],
        ['مبارد روتاري علاج عصب (ProTaper Gold Starter Kit)', 'endodontics', 'باكت 6 مبارد روتاري SX-F3 25mm', 6, 'باكت', 3, 190000, '2028-01-01', 'LOT-PTG-99', 'قسم علاج الجذور'],
        ['مبارد يدوية K-Files قياس 15-40 (25mm)', 'endodontics', 'علبة مبارد ستانلس ستيل معقمة', 5, 'علبة', 2, 35000, '2028-01-01', 'LOT-KF-1540', 'قسم علاج الجذور'],
        ['أقماع جوتابركا متدرجة F1, F2, F3 (Gutta Percha)', 'endodontics', 'علبة 60 قمع معقم', 7, 'علبة', 3, 40000, '2027-07-30', 'LOT-GP-60', 'قسم علاج الجذور'],
        ['سيلر حشو قنوات راتنجي (AH Plus Sealer)', 'endodontics', 'أنبوبتين معجون A + B', 3, 'علبة', 1, 210000, '2026-07-30', 'LOT-AH-102', 'قسم علاج الجذور'],
        ['قفازات فحص طبية نيتريل مقاس M (Nitrile Gloves M)', 'sterilization', 'كرتونة 100 قفاز خالي من البودرة', 12, 'علبة', 5, 55000, '2027-10-31', 'LOT-GLV-M', 'مستودع التعقيم'],
        ['قفازات فحص طبية نيتريل مقاس L (Nitrile Gloves L)', 'sterilization', 'كرتونة 100 قفاز خالي من البودرة', 8, 'علبة', 4, 55000, '2027-10-31', 'LOT-GLV-L', 'مستودع التعقيم'],
        ['أكياس تعقيم أوتوكلاف مقاس 90×260 مم (Pouches)', 'sterilization', 'علبة 200 كيس مع مؤشر حراري', 5, 'علبة', 2, 70000, '2028-06-30', 'LOT-PCH-90', 'غرفة التعقيم'],
        ['مادة طبعة سيليكون مطاطي ثقيل وخفيف (A-Silicone)', 'impression', 'طقم معجون Putty 400ml + Light Body', 4, 'طقم', 2, 280000, '2026-11-15', 'LOT-SIL-33', 'خزانة الطبعات'],
        ['ألجينات سريعة التصلب لطبعات الدراسة (Alginate)', 'impression', 'كيس 453غ نكهة نعناع', 6, 'كيس', 3, 45000, '2026-08-31', 'LOT-ALG-5', 'خزانة الطبعات'],
        ['زرعات سنية Straumann BLX قطر 4.0 طول 10 مم', 'surgery_implants', 'زرعة تيتانيوم معقمة مع ناقل Loxim', 3, 'قطعة', 2, 1100000, '2028-12-31', 'LOT-STR-940', 'خزانة الجراحة'],
        ['زرعات سنية Osstem TSIII قطر 4.5 طول 11.5 مم', 'surgery_implants', 'زرعة كورية معقمة مع غطاء غلق', 4, 'قطعة', 2, 650000, '2028-09-30', 'LOT-OSS-4511', 'خزانة الجراحة'],
        ['طعم عظمي بودرة 0.5cc (Bio-Oss Bovine Bone Graft)', 'surgery_implants', 'فيال 0.5 جرام جزيئات صغيرة', 4, 'فيال', 2, 450000, '2027-04-30', 'LOT-BONE-05', 'خزانة الجراحة'],
      ]
      const stmt = instance.prepare(`
        INSERT INTO inventory_items (name, category, specification, quantity, unit, min_threshold, cost_per_unit, expiry_date, batch_number, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const item of seed) {
        stmt.run(...item)
      }
    }
  } catch (err) {
    console.error('Error seeding inventory items:', err)
  }
}

function migrateTreatmentCatalogSchema(instance: SqlDatabase): void {
  instance.exec(`
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
  `)
  try {
    const countRow = instance.prepare('SELECT COUNT(*) as c FROM treatment_catalog').get() as { c: number }
    if (countRow && countRow.c === 0) {
      const defaultCatalog = [
        ['restorative', 'REST-01', 'حشوة ضوئية كمبوزيت سطح واحد', 'Composite Restoration - 1 Surface', 120000, 'تنظيف النخر وترميم تجميلي كمبوزيت نانو هيبريد مع تخريش وبوندينغ وتلميع نهائي', 30],
        ['restorative', 'REST-02', 'حشوة ضوئية كمبوزيت سطحين (MO/DO)', 'Composite Restoration - 2 Surfaces', 160000, 'ترميم تجويف بين سني مع وضع مسندة مصفوفية وتشكيل نقطة التماس وتلميع', 45],
        ['restorative', 'REST-03', 'حشوة ضوئية كمبوزيت 3 أسطح فما فوق (MOD)', 'Composite Restoration - 3+ Surfaces', 220000, 'ترميم تجويف واسع وبناء حدبات مع حماية لبية وتشكيل تشريحي دقيق', 60],
        ['restorative', 'REST-04', 'بناء قلب ودعامة فايبر بوست (Fiber Post & Core)', 'Fiber Post & Core Build-up', 250000, 'تفريغ وتجهيز القناة وتثبيت وتد فايبر مقوى بالراتنج وبناء التاج للتهيئة للغلاف', 45],
        ['endodontics', 'ENDO-01', 'علاج عصب سن أمامي جلسة واحدة (قناة واحدة)', 'Anterior Root Canal Treatment - Single Visit', 300000, 'استئصال اللب، تحضير روتاري آلي، تعقيم بالأمواج، وحشو القناة بالجوتابركا ثلاثي الأبعاد', 45],
        ['endodontics', 'ENDO-02', 'علاج عصب ضاحك (قناتين)', 'Premolar Root Canal Treatment', 400000, 'تحضير آلي روتاري لقناتين وتطهير كيميائي ميكانيكي وحشو قنوات', 60],
        ['endodontics', 'ENDO-03', 'علاج عصب ضرس خلفي (3 - 4 أقنية)', 'Molar Root Canal Treatment', 550000, 'معالجة لبية كاملة لرحى سفلية أو علوية مع كشف الأقنية الإضافية وحشو حراري', 75],
        ['endodontics', 'ENDO-04', 'إعادة معالجة لبية لضرس (Endo Retreatment)', 'Molar Endodontic Retreatment', 650000, 'إزالة حشوة القنوات القديمة وتجاوز الحصوات وتطهير وحشو قنوات جديد', 90],
        ['prosthetics', 'PROST-01', 'تاج زيركون كامل تشريحي (Full Zirconia Crown)', 'Monolithic Zirconia Crown', 750000, 'تحضير السن مع خط إنهاء واضح وطبعة دقيقة وتركيب تاج زيركون عالي المتانة والجمالية', 45],
        ['prosthetics', 'PROST-02', 'تاج إيماكس تجميلي فائق الشفافية (IPS e.max)', 'IPS e.max Ceramic Crown', 900000, 'خزف زجاجي فائق الشفافية والجمالية للأسنان الأمامية مع لصق راتنجي محكم', 45],
        ['prosthetics', 'PROST-03', 'عدسة أسنان تجميلية فينير (Porcelain Veneer)', 'Dental Ceramic Veneer', 950000, 'تحضير سطحي خفيف للوجه الدهليزي وتركيب قشرة خزفية إيماكس لابتسامة هوليوود', 45],
        ['prosthetics', 'PROST-04', 'جسر زيركون للسن المفقود (لكل وحدة سنية)', 'Zirconia Bridge Unit', 750000, 'تعويض الأسنان المفقودة بجسر متين من الزيركونيا (سعر الوحدة الواحدة)', 45],
        ['implants', 'IMP-01', 'زراعة سن جراحية مرحلة أولى (Surgical Placement)', 'Dental Implant Placement (Stage 1)', 2500000, 'غرس زرعة تيتانيوم معقمة في العظم وفق بروتوكول جراحي دقيق مع خياطة', 60],
        ['implants', 'IMP-02', 'كشف زرعة وتركيب دعامة شفاء (Healing Abutment)', 'Implant Uncovery & Healing Abutment', 200000, 'كشف الزرعة بعد الاندماج العظمي وتركيب مشكّل اللثة لتجهيز الطبعة', 30],
        ['implants', 'IMP-03', 'دعامة وتاج زيركون نهائي فوق الزرعة (Implant Crown)', 'Implant Custom Abutment & Zirconia Crown', 1200000, 'أخذ طبعة الزرعة بالترانسفير وتركيب الدعامة وتثبيت تاج الزيركون النهائي', 45],
        ['implants', 'IMP-04', 'تطعيم عظمي جراحي مع غشاء كولاجين (Bone Graft)', 'Guided Bone Regeneration (GBR)', 800000, 'وضع طعم عظمي حول الزرعة أو السن وتغطيته بغشاء ممتص لحفظ الحافة العظمية', 45],
        ['surgery', 'SURG-01', 'قلع سن بسيط مع تخدير موضعي', 'Simple Tooth Extraction', 100000, 'خلع سن مهدم غير قابل للترميم بلطف مع العناية بالحويصل السني', 20],
        ['surgery', 'SURG-02', 'قلع جراحي لضرس عقل منطمر عظمياً', 'Surgical Extraction of Impacted Wisdom Tooth', 450000, 'شق جراحي وتفريغ عظمي وفصل الجذور وخياطة جراحية لضرس العقل المدفون', 60],
        ['periodontics', 'PERIO-01', 'تنظيف لثة وتكلسات وتلميع كامل (Scaling & Polishing)', 'Full Mouth Scaling & Polishing', 150000, 'إزالة التكلسات فوق وتحت اللثوية بالأمواج الصوتية وتلميع الأسنان بمعجون وقائي', 30],
        ['periodontics', 'PERIO-02', 'تجريف لثة عميق وتخطيط جذور (Root Planing per quadrant)', 'Deep Scaling & Root Planing (Quadrant)', 200000, 'علاج التهابات النسج الداعمة وتجريف الجيوب اللثوية لربع فك', 45],
        ['cosmetic', 'COSM-01', 'تبييض أسنان عيادي بالضوء/الليزر (In-Office Whitening)', 'In-Office Power Teeth Whitening', 1200000, 'تطبيق جل التبييض المركز مع حماية اللثة والتنشيط الضوئي لتفتيح 6-8 درجات', 60],
        ['preventive', 'PREV-01', 'تطبيق فلورايد وقائي وسادات ميازيب للأطفال (Sealants)', 'Fluoride Varnish & Pit-Fissure Sealants', 80000, 'حماية أسنان الأطفال من التسوس بوضع سادات الميازيب والورنيش الفلورايدي', 20],
      ]
      const stmt = instance.prepare(`
        INSERT INTO treatment_catalog (category, code, name_ar, name_en, default_cost, description, duration_minutes, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `)
      for (const item of defaultCatalog) {
        stmt.run(...item)
      }
    }
  } catch (err) {
    console.error('Error seeding treatment catalog:', err)
  }
}

function getDb(): SqlDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}

function ensureBootstrapConfig(): void {
  const d = getDb()
  const get = d.prepare('SELECT value FROM app_config WHERE key = ?')
  const set = d.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)')

  if (!get.get('machine_id')) {
    set.run('machine_id', computeMachineIdInternal())
  }
  if (!get.get('first_launch_date')) {
    set.run('first_launch_date', new Date().toISOString())
  }
  if (!get.get('license_status')) {
    set.run('license_status', 'trial')
  }
  if (!get.get('language')) {
    set.run('language', 'ar')
  }
  if (!get.get('clinic_name')) {
    set.run('clinic_name', 'DentAssist Pro')
  }
  if (!get.get('clinic_phone')) {
    set.run('clinic_phone', '')
  }
  if (!get.get('clinic_address')) {
    set.run('clinic_address', '')
  }
  migrateLegacyDefaultUsersForSecurity()
}

function getForcedPinResetUsers(): string[] {
  const raw = getConfig('force_pin_reset_users')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

function setForcedPinResetUsers(usernames: string[]): void {
  const unique = Array.from(new Set(usernames.map((u) => u.trim()).filter(Boolean)))
  setConfig('force_pin_reset_users', JSON.stringify(unique))
}

function migrateLegacyDefaultUsersForSecurity(): void {
  const defaults: Array<{ username: string; pin: string }> = [
    { username: 'doctor', pin: '1234' },
    { username: 'reception', pin: '5678' },
  ]
  const rows = getDb()
    .prepare('SELECT username, pin_hash FROM users WHERE username IN (?, ?)')
    .all('doctor', 'reception') as { username: string; pin_hash: string }[]
  const force = getForcedPinResetUsers()
  let changed = false
  for (const row of rows) {
    const matchingDefault = defaults.find((d) => d.username === row.username)
    if (!matchingDefault) continue
    if (verifyCredential(matchingDefault.pin, row.pin_hash) && !force.includes(row.username)) {
      force.push(row.username)
      changed = true
    }
  }
  if (changed) setForcedPinResetUsers(force)
}

export function getConfig(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM app_config WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setConfig(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run(key, value)
}

export function verifyCredentials(username: string, password: string): DbUser | null {
  const user = username.trim()
  const secret = password.trim()
  if (!user || !secret) return null
  const row = getDb()
    .prepare('SELECT id, username, role, pin_hash FROM users WHERE username = ? COLLATE NOCASE')
    .get(user) as Record<string, unknown> | undefined
  if (!row) return null
  const pinHash = row.pin_hash ?? row.PIN_HASH
  if (typeof pinHash !== 'string' || !verifyCredential(secret, pinHash)) return null
  const forcedUsers = getForcedPinResetUsers()
  return {
    id: Number(row.id),
    username: String(row.username),
    role: row.role as UserRole,
    mustChangePin: forcedUsers.includes(String(row.username)),
  }
}

export function listUsers(): DbUser[] {
  return getDb()
    .prepare('SELECT id, username, role FROM users ORDER BY id')
    .all() as DbUser[]
}

export type PatientRow = {
  id: number
  first_name: string
  last_name: string
  dob: string | null
  gender: string | null
  phone: string | null
  medical_history: string | null
  created_at: string
}

export type TeethStatusRow = {
  id: number
  patient_id: number
  tooth_number: number
  status: string
  notes: string | null
  preparation_depth_mm: number | null
  updated_at: string
}

export type AppointmentRow = {
  id: number
  patient_id: number
  start_time: string
  end_time: string
  status: string
  notes: string | null
  patient_first_name: string
  patient_last_name: string
  patient_phone: string | null
}

export type DueReminderRow = {
  appointment_id: number
  patient_id: number
  patient_name: string
  patient_phone: string | null
  start_time: string
  reminder_type: '24h' | '2h'
}

export type TreatmentPlanRow = {
  id: number
  patient_id: number
  title: string
  diagnosis: string | null
  notes: string | null
  status: 'draft' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  accepted_by_name: string | null
  signature_text: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type TreatmentPlanStageRow = {
  id: number
  plan_id: number
  stage_order: number
  title: string
  description: string | null
  estimated_cost: number
  paid_amount: number
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  appointment_id: number | null
  appointment_start_time: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type InvoiceListRow = {
  id: number
  patient_id: number
  date: string
  total_amount: number
  status: string
  patient_first_name: string
  patient_last_name: string
}

export type InvoiceItemRow = {
  id: number
  invoice_id: number
  description: string
  tooth_number: number | null
  price: number
}

function deleteUserImpl(id: number): void {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
}

function createUserImpl(username: string, role: UserRole, pin: string): number {
  const d = getDb()
  const user = username.trim()
  const secret = pin.trim()
  if (!user) throw new Error('Username is required')
  if (secret.length < 4) throw new Error('PIN must be at least 4 characters')
  const exists = d.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(user)
  if (exists) throw new Error('Username already exists')
  const info = d
    .prepare('INSERT INTO users (username, role, pin_hash) VALUES (?, ?, ?)')
    .run(user, role, hashCredential(secret))
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(user)) {
    setForcedPinResetUsers(forcedUsers.filter((u) => u !== user))
  }
  return info.lastInsertRowid as number
}

function updateUserPinImpl(id: number, pin: string): void {
  const d = getDb()
  d.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashCredential(pin), id)
  const row = d.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined
  if (!row) return
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(row.username)) {
    setForcedPinResetUsers(forcedUsers.filter((u) => u !== row.username))
  }
}

function updateUsernameImpl(id: number, username: string): void {
  const d = getDb()
  const before = d.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined
  const exists = d.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
  if (exists) throw new Error('Username already exists')
  d.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id)
  if (!before) return
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(before.username)) {
    setForcedPinResetUsers(forcedUsers.map((u) => (u === before.username ? username : u)))
  }
}

function listPatientsImpl(query: string): PatientRow[] {
  const q = (query ?? '').trim()
  const d = getDb()
  if (!q) {
    return d
      .prepare(
        `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at
         FROM patients ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
      )
      .all() as PatientRow[]
  }
  const like = `%${q}%`
  return d
    .prepare(
      `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at
       FROM patients
       WHERE first_name LIKE ? OR last_name LIKE ? OR IFNULL(phone,'') LIKE ?
       ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
    )
    .all(like, like, like) as PatientRow[]
}

function getPatientImpl(id: number): PatientRow | null {
  const row = getDb()
    .prepare(
      `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at FROM patients WHERE id = ?`,
    )
    .get(id) as PatientRow | undefined
  return row ?? null
}

function createPatientImpl(input: {
  firstName: string
  lastName: string
  dob: string | null
  gender: string | null
  phone: string | null
  medicalHistory: string | null
}): number {
  const r = getDb()
    .prepare(
      `INSERT INTO patients (first_name, last_name, dob, gender, phone, medical_history)
       VALUES (@first_name, @last_name, @dob, @gender, @phone, @medical_history)`,
    )
    .run({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      dob: input.dob,
      gender: input.gender,
      phone: input.phone?.trim() || null,
      medical_history: input.medicalHistory,
    })
  return Number(r.lastInsertRowid)
}

function updatePatientImpl(
  id: number,
  input: {
    firstName: string
    lastName: string
    dob: string | null
    gender: string | null
    phone: string | null
    medicalHistory: string | null
  },
): void {
  getDb()
    .prepare(
      `UPDATE patients SET first_name=@first_name, last_name=@last_name, dob=@dob, gender=@gender,
       phone=@phone, medical_history=@medical_history WHERE id=@id`,
    )
    .run({
      id,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      dob: input.dob,
      gender: input.gender,
      phone: input.phone?.trim() || null,
      medical_history: input.medicalHistory,
    })
}

function deletePatientImpl(id: number): void {
  getDb().prepare('DELETE FROM patients WHERE id = ?').run(id)
}

function listTeethStatusesImpl(patientId: number): TeethStatusRow[] {
  return getDb()
    .prepare(
      `SELECT id, patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at
       FROM teeth_status WHERE patient_id = ?`,
    )
    .all(patientId) as TeethStatusRow[]
}

function upsertTeethStatusImpl(
  patientId: number,
  toothNumber: number,
  status: string,
  notes: string | null,
  preparationDepthMm: number | null,
): TeethStatusRow {
  getDb()
    .prepare(
      `INSERT INTO teeth_status (patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at)
       VALUES (@patient_id, @tooth_number, @status, @notes, @preparation_depth_mm, datetime('now'))
       ON CONFLICT(patient_id, tooth_number) DO UPDATE SET
         status = excluded.status,
         notes = excluded.notes,
         preparation_depth_mm = excluded.preparation_depth_mm,
         updated_at = datetime('now')`,
    )
    .run({
      patient_id: patientId,
      tooth_number: toothNumber,
      status,
      notes,
      preparation_depth_mm: preparationDepthMm,
    })
  const row = getDb()
    .prepare(
      `SELECT id, patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at FROM teeth_status
       WHERE patient_id = ? AND tooth_number = ?`,
    )
    .get(patientId, toothNumber) as TeethStatusRow
  return row
}

function listAppointmentsImpl(fromIso: string | null, toIso: string | null): AppointmentRow[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.patient_id, a.start_time, a.end_time, a.status, a.notes,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE (? IS NULL OR a.start_time >= ?) AND (? IS NULL OR a.start_time <= ?)
       ORDER BY a.start_time ASC`,
    )
    .all(fromIso, fromIso, toIso, toIso) as AppointmentRow[]
}

function createAppointmentImpl(
  patientId: number,
  startTime: string,
  endTime: string,
  status: string,
  notes: string | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO appointments (patient_id, start_time, end_time, status, notes)
       VALUES (@patient_id, @start_time, @end_time, @status, @notes)`,
    )
    .run({ patient_id: patientId, start_time: startTime, end_time: endTime, status, notes })
  return Number(r.lastInsertRowid)
}

function updateAppointmentImpl(
  id: number,
  patientId: number,
  startTime: string,
  endTime: string,
  status: string,
  notes: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE appointments SET patient_id=@patient_id, start_time=@start_time, end_time=@end_time,
       status=@status, notes=@notes WHERE id=@id`,
    )
    .run({ id, patient_id: patientId, start_time: startTime, end_time: endTime, status, notes })
}

function deleteAppointmentImpl(id: number): void {
  getDb().prepare('DELETE FROM appointments WHERE id = ?').run(id)
}

function listTreatmentPlansImpl(patientId: number): TreatmentPlanRow[] {
  return getDb()
    .prepare(
      `SELECT
         id, patient_id, title, diagnosis, notes, status,
         accepted_by_name, signature_text, accepted_at, created_at, updated_at
       FROM treatment_plans
       WHERE patient_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .all(patientId) as TreatmentPlanRow[]
}

function createTreatmentPlanImpl(
  patientId: number,
  title: string,
  diagnosis: string | null,
  notes: string | null,
): number {
  const info = getDb()
    .prepare(
      `INSERT INTO treatment_plans (patient_id, title, diagnosis, notes, status, updated_at)
       VALUES (?, ?, ?, ?, 'draft', datetime('now'))`,
    )
    .run(patientId, title.trim(), diagnosis, notes)
  return Number(info.lastInsertRowid)
}

function updateTreatmentPlanImpl(
  id: number,
  title: string,
  diagnosis: string | null,
  notes: string | null,
  status: TreatmentPlanRow['status'],
): void {
  getDb()
    .prepare(
      `UPDATE treatment_plans
       SET title = ?, diagnosis = ?, notes = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(title.trim(), diagnosis, notes, status, id)
}

function acceptTreatmentPlanImpl(id: number, acceptedByName: string, signatureText: string): void {
  getDb()
    .prepare(
      `UPDATE treatment_plans
       SET status = 'accepted',
           accepted_by_name = ?,
           signature_text = ?,
           accepted_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(acceptedByName.trim(), signatureText.trim(), id)
}

function deleteTreatmentPlanImpl(id: number): void {
  getDb().prepare('DELETE FROM treatment_plans WHERE id = ?').run(id)
}

function listTreatmentPlanStagesImpl(planId: number): TreatmentPlanStageRow[] {
  return getDb()
    .prepare(
      `SELECT
         s.id, s.plan_id, s.stage_order, s.title, s.description,
         s.estimated_cost, s.paid_amount, s.status, s.appointment_id, s.due_date,
         s.created_at, s.updated_at,
         a.start_time AS appointment_start_time
       FROM treatment_plan_stages s
       LEFT JOIN appointments a ON a.id = s.appointment_id
       WHERE s.plan_id = ?
       ORDER BY s.stage_order ASC, s.id ASC`,
    )
    .all(planId) as TreatmentPlanStageRow[]
}

function createTreatmentPlanStageImpl(input: {
  planId: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStageRow['status']
  appointmentId: number | null
  dueDate: string | null
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO treatment_plan_stages
       (plan_id, stage_order, title, description, estimated_cost, paid_amount, status, appointment_id, due_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(
      input.planId,
      input.stageOrder,
      input.title.trim(),
      input.description,
      input.estimatedCost,
      input.paidAmount,
      input.status,
      input.appointmentId,
      input.dueDate,
    )
  return Number(info.lastInsertRowid)
}

function updateTreatmentPlanStageImpl(input: {
  id: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStageRow['status']
  appointmentId: number | null
  dueDate: string | null
}): void {
  getDb()
    .prepare(
      `UPDATE treatment_plan_stages
       SET stage_order = ?, title = ?, description = ?, estimated_cost = ?, paid_amount = ?,
           status = ?, appointment_id = ?, due_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.stageOrder,
      input.title.trim(),
      input.description,
      input.estimatedCost,
      input.paidAmount,
      input.status,
      input.appointmentId,
      input.dueDate,
      input.id,
    )
}

function deleteTreatmentPlanStageImpl(id: number): void {
  getDb().prepare('DELETE FROM treatment_plan_stages WHERE id = ?').run(id)
}

function listDueWhatsAppRemindersImpl(nowIso: string): DueReminderRow[] {
  const d = getDb()
  const nowMs = Date.parse(nowIso)
  if (!Number.isFinite(nowMs)) return []

  const MIN = 60_000
  /** Appointments stored as ISO strings from the UI; compare windows in JS to avoid SQLite vs ISO text mismatches. */
  const minStartMs = nowMs + 50 * MIN // just under 1h — lower bound for the 2h-style window
  const maxStartMs = nowMs + 26 * 60 * MIN + 10 * MIN // upper bound for the 24h-style window (~26h10m)
  const minIso = new Date(minStartMs).toISOString()
  const maxIso = new Date(maxStartMs).toISOString()

  const rows = d
    .prepare(
      `SELECT
         a.id AS appointment_id,
         a.patient_id AS patient_id,
         (p.first_name || ' ' || p.last_name) AS patient_name,
         p.phone AS patient_phone,
         a.start_time AS start_time
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.status = 'scheduled'
         AND p.phone IS NOT NULL
         AND TRIM(p.phone) != ''
         AND a.start_time >= ?
         AND a.start_time <= ?
       ORDER BY a.start_time ASC`,
    )
    .all(minIso, maxIso) as Array<{
      appointment_id: number
      patient_id: number
      patient_name: string
      patient_phone: string
      start_time: string
    }>

  function reminderTypeFor(startMs: number): '24h' | '2h' | null {
    if (!Number.isFinite(startMs) || startMs <= nowMs) return null
    // Wide bands so manual WhatsApp strip is usable without opening the app in a 10-minute slot only.
    const t24Lo = nowMs + 22 * 60 * MIN
    const t24Hi = nowMs + 26 * 60 * MIN
    if (startMs >= t24Lo && startMs <= t24Hi) return '24h'
    const t2Lo = nowMs + 1 * 60 * MIN
    const t2Hi = nowMs + 3 * 60 * MIN
    if (startMs >= t2Lo && startMs <= t2Hi) return '2h'
    return null
  }

  return rows
    .map((r) => ({
      ...r,
      reminder_type: reminderTypeFor(Date.parse(r.start_time)),
    }))
    .filter((r): r is typeof r & { reminder_type: '24h' | '2h' } => r.reminder_type === '24h' || r.reminder_type === '2h')
    .filter((r) => {
      const exists = d
        .prepare(
          `SELECT 1 FROM appointment_reminders
           WHERE appointment_id = ? AND reminder_type = ?
           LIMIT 1`,
        )
        .get(r.appointment_id, r.reminder_type)
      return !exists
    })
    .map((r) => ({
      appointment_id: r.appointment_id,
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      patient_phone: r.patient_phone,
      start_time: r.start_time,
      reminder_type: r.reminder_type,
    }))
}

function markAppointmentReminderSentImpl(appointmentId: number, reminderType: '24h' | '2h'): void {
  getDb()
    .prepare(
      `INSERT INTO appointment_reminders (appointment_id, reminder_type, sent_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(appointment_id, reminder_type) DO NOTHING`,
    )
    .run(appointmentId, reminderType)
}

function listInvoicesImpl(limit: number, patientId?: number | null): InvoiceListRow[] {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100_000) : 100
  const d = getDb()
  if (patientId != null && Number.isFinite(patientId)) {
    return d
      .prepare(
        `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
         FROM invoices i
         JOIN patients p ON p.id = i.patient_id
         WHERE i.patient_id = ?
         ORDER BY i.date DESC, i.id DESC
         LIMIT ?`,
      )
      .all(patientId, lim) as InvoiceListRow[]
  }
  return d
    .prepare(
      `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       ORDER BY i.date DESC, i.id DESC
       LIMIT ?`,
    )
    .all(lim) as InvoiceListRow[]
}

type InvoiceLineExportRowDb = {
  invoice_id: number
  invoice_date: string
  invoice_status: string
  invoice_total: number
  patient_id: number
  patient_first_name: string
  patient_last_name: string
  line_id: number
  description: string
  tooth_number: number | null
  line_price: number
}

function listInvoiceLinesExportImpl(): InvoiceLineExportRowDb[] {
  return getDb()
    .prepare(
      `SELECT
         i.id AS invoice_id,
         i.date AS invoice_date,
         i.status AS invoice_status,
         i.total_amount AS invoice_total,
         i.patient_id AS patient_id,
         p.first_name AS patient_first_name,
         p.last_name AS patient_last_name,
         ii.id AS line_id,
         ii.description AS description,
         ii.tooth_number AS tooth_number,
         ii.price AS line_price
       FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id
       INNER JOIN patients p ON p.id = i.patient_id
       ORDER BY i.date DESC, i.id ASC, ii.id ASC`,
    )
    .all() as InvoiceLineExportRowDb[]
}

function getInvoiceImpl(id: number): { invoice: InvoiceListRow; items: InvoiceItemRow[] } | null {
  const inv = getDb()
    .prepare(
      `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.id = ?`,
    )
    .get(id) as InvoiceListRow | undefined
  if (!inv) return null
  const items = getDb()
    .prepare(
      `SELECT id, invoice_id, description, tooth_number, price FROM invoice_items WHERE invoice_id = ? ORDER BY id`,
    )
    .all(id) as InvoiceItemRow[]
  return { invoice: inv, items }
}

function createInvoiceImpl(
  patientId: number,
  date: string,
  status: 'paid' | 'pending',
  items: { description: string; toothNumber: number | null; price: number }[],
): number {
  const d = getDb()
  const total = items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
  return d.transaction(() => {
    const r = d
      .prepare(
        `INSERT INTO invoices (patient_id, date, total_amount, status) VALUES (@patient_id, @date, @total, @status)`,
      )
      .run({ patient_id: patientId, date, total, status })
    const invId = Number(r.lastInsertRowid)
    const ins = d.prepare(
      `INSERT INTO invoice_items (invoice_id, description, tooth_number, price) VALUES (?, ?, ?, ?)`,
    )
    for (const it of items) {
      ins.run(invId, it.description.trim(), it.toothNumber ?? null, it.price)
    }
    return invId
  })()
}

function updateInvoiceStatusImpl(id: number, status: 'paid' | 'pending'): void {
  getDb().prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id)
}

function updateInvoiceWithItemsImpl(
  id: number,
  date: string,
  status: 'paid' | 'pending',
  items: { description: string; toothNumber: number | null; price: number }[],
): void {
  const d = getDb()
  const total = items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
  d.transaction(() => {
    d.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
    d.prepare('UPDATE invoices SET date = ?, total_amount = ?, status = ? WHERE id = ?').run(
      date,
      total,
      status,
      id,
    )
    const ins = d.prepare(
      `INSERT INTO invoice_items (invoice_id, description, tooth_number, price) VALUES (?, ?, ?, ?)`,
    )
    for (const it of items) {
      ins.run(id, it.description.trim(), it.toothNumber ?? null, it.price)
    }
  })()
}

function deleteInvoiceImpl(id: number): void {
  getDb().prepare('DELETE FROM invoices WHERE id = ?').run(id)
}

export type PrescriptionRow = {
  id: number
  patient_id: number
  doctor_id: number
  date: string
  medications_json: string
  notes: string | null
  doctor_username: string
}

function listPrescriptionsImpl(patientId: number): PrescriptionRow[] {
  return getDb()
    .prepare(
      `SELECT pr.id, pr.patient_id, pr.doctor_id, pr.date, pr.medications_json, pr.notes,
              u.username AS doctor_username
       FROM prescriptions pr
       JOIN users u ON u.id = pr.doctor_id
       WHERE pr.patient_id = ?
       ORDER BY pr.date DESC, pr.id DESC`,
    )
    .all(patientId) as PrescriptionRow[]
}

function createPrescriptionImpl(
  patientId: number,
  doctorId: number,
  date: string,
  medicationsJson: string,
  notes: string | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO prescriptions (patient_id, doctor_id, date, medications_json, notes)
       VALUES (@patient_id, @doctor_id, @date, @medications_json, @notes)`,
    )
    .run({
      patient_id: patientId,
      doctor_id: doctorId,
      date,
      medications_json: medicationsJson,
      notes,
    })
  return Number(r.lastInsertRowid)
}

function updatePrescriptionImpl(
  id: number,
  patientId: number,
  doctorId: number,
  date: string,
  medicationsJson: string,
  notes: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE prescriptions SET patient_id=@patient_id, doctor_id=@doctor_id, date=@date,
       medications_json=@medications_json, notes=@notes WHERE id=@id`,
    )
    .run({
      id,
      patient_id: patientId,
      doctor_id: doctorId,
      date,
      medications_json: medicationsJson,
      notes,
    })
}

function deletePrescriptionImpl(id: number): void {
  getDb().prepare('DELETE FROM prescriptions WHERE id = ?').run(id)
}

export type PatientImageRow = {
  id: number
  patient_id: number
  image_path: string
  type: 'before' | 'after'
  date: string
  notes: string | null
  tooth_number: number | null
}

function listPatientImagesImpl(patientId: number): PatientImageRow[] {
  return getDb()
    .prepare(
      `SELECT id, patient_id, image_path, type, date, notes, tooth_number
       FROM patient_images WHERE patient_id = ? ORDER BY date DESC, id DESC`,
    )
    .all(patientId) as PatientImageRow[]
}

function createPatientImageImpl(
  patientId: number,
  imagePath: string,
  type: 'before' | 'after',
  date: string,
  notes: string | null,
  toothNumber: number | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO patient_images (patient_id, image_path, type, date, notes, tooth_number)
       VALUES (@patient_id, @image_path, @type, @date, @notes, @tooth_number)`,
    )
    .run({
      patient_id: patientId,
      image_path: imagePath,
      type,
      date,
      notes,
      tooth_number: toothNumber,
    })
  return Number(r.lastInsertRowid)
}

function deletePatientImageImpl(id: number): void {
  const row = getDb().prepare('SELECT image_path FROM patient_images WHERE id = ?').get(id) as
    | { image_path: string }
    | undefined
  if (row?.image_path) patientImageDeletedHandler?.(row.image_path)
  getDb().prepare('DELETE FROM patient_images WHERE id = ?').run(id)
}

export type DashboardStats = {
  revenueToday: number
  revenueMonth: number
  appointmentsCompleted: number
  appointmentsCancelled: number
  appointmentsScheduled: number
  pendingDebt: number
  topProcedures: { description: string; count: number }[]
}

export type ReportRow = {
  id: string
  date: string
  patientsCount: number
  income: number
  expense: number
  profit: number
}

function getDailyReportsImpl(): ReportRow[] {
  const d = getDb()
  const rows = d.prepare(`
    SELECT 
      substr(date, 1, 10) as date_val,
      COUNT(DISTINCT patient_id) as patients_count,
      SUM(total_amount) as income
    FROM invoices 
    WHERE status = 'paid'
    GROUP BY substr(date, 1, 10)
    ORDER BY date_val DESC
    LIMIT 100
  `).all() as { date_val: string; patients_count: number; income: number }[]

  return rows.map((r, i) => {
    const inc = r.income || 0
    const exp = 0 // Add expense table if needed later
    return {
      id: `REP-${(i + 1).toString().padStart(3, '0')}`,
      date: r.date_val,
      patientsCount: r.patients_count,
      income: inc,
      expense: exp,
      profit: inc - exp
    }
  })
}

function getDashboardStatsImpl(): DashboardStats {
  const d = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const monthKey = new Date().toISOString().slice(0, 7)

  const revenueToday = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE substr(date,1,10) = ?`).get(today) as {
      s: number
    }
  ).s

  const revenueMonth = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE substr(date,1,7) = ?`).get(monthKey) as {
      s: number
    }
  ).s

  const pendingDebt = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE status = 'pending'`).get() as { s: number }
  ).s

  const aptRows = d
    .prepare(
      `SELECT status, COUNT(*) AS c FROM appointments
       WHERE start_time >= datetime('now', '-90 days') GROUP BY status`,
    )
    .all() as { status: string; c: number }[]

  let appointmentsCompleted = 0
  let appointmentsCancelled = 0
  let appointmentsScheduled = 0
  for (const r of aptRows) {
    if (r.status === 'completed') appointmentsCompleted += r.c
    else if (r.status === 'cancelled') appointmentsCancelled += r.c
    else if (r.status === 'scheduled') appointmentsScheduled += r.c
  }

  const topProcedures = d
    .prepare(
      `SELECT ii.description AS description, COUNT(*) AS count
       FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id
       GROUP BY ii.description
       ORDER BY count DESC
       LIMIT 8`,
    )
    .all() as { description: string; count: number }[]

  return {
    revenueToday,
    revenueMonth,
    appointmentsCompleted,
    appointmentsCancelled,
    appointmentsScheduled,
    pendingDebt,
    topProcedures,
  }
}

export type DistributorRow = {
  id: number
  name: string
  company: string
  phone: string
  address: string
  items: string
  payment_amount: number
  remaining_amount: number
  created_at: string
}

export type TransactionRow = {
  id: number
  trx_id: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  created_at: string
}

export type LabOrderRow = {
  id: number
  order_id: string
  patient_name: string
  lab_name: string
  work_type: string
  sent_date: string
  status: 'progress' | 'received' | 'delayed'
  created_at: string
}

function listDistributorsImpl(query: string = ''): DistributorRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM distributors ORDER BY id DESC').all() as DistributorRow[]
  return d
    .prepare('SELECT * FROM distributors WHERE name LIKE ? OR company LIKE ? OR items LIKE ? ORDER BY id DESC')
    .all(`%${query}%`, `%${query}%`, `%${query}%`) as DistributorRow[]
}

function createDistributorImpl(req: {
  name: string
  company: string
  phone: string
  address: string
  items: string
  paymentAmount: number
  remainingAmount: number
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO distributors (name, company, phone, address, items, payment_amount, remaining_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.name, req.company, req.phone, req.address, req.items, req.paymentAmount, req.remainingAmount)
  return info.lastInsertRowid as number
}

function updateDistributorImpl(
  id: number,
  req: {
    name: string
    company: string
    phone: string
    address: string
    items: string
    paymentAmount: number
    remainingAmount: number
  }
): void {
  getDb()
    .prepare(
      `UPDATE distributors 
       SET name = ?, company = ?, phone = ?, address = ?, items = ?, payment_amount = ?, remaining_amount = ? 
       WHERE id = ?`
    )
    .run(req.name, req.company, req.phone, req.address, req.items, req.paymentAmount, req.remainingAmount, id)
}

function deleteDistributorImpl(id: number): void {
  getDb().prepare('DELETE FROM distributors WHERE id = ?').run(id)
}

function listTransactionsImpl(query: string = ''): TransactionRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC').all() as TransactionRow[]
  return d
    .prepare('SELECT * FROM transactions WHERE description LIKE ? OR trx_id LIKE ? ORDER BY date DESC, id DESC')
    .all(`%${query}%`, `%${query}%`) as TransactionRow[]
}

function createTransactionImpl(req: {
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
}): number {
  const d = getDb()
  return d.transaction(() => {
    // Generate a simple ID like TRX-0001
    const countRow = d.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }
    const nextNum = countRow.c + 1
    const trxId = `TRX-${String(nextNum).padStart(4, '0')}`
    
    const info = d.prepare(
      `INSERT INTO transactions (trx_id, date, description, type, amount, currency)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(trxId, req.date, req.description, req.type, req.amount, req.currency)
    return info.lastInsertRowid as number
  })()
}

function deleteTransactionImpl(id: number): void {
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

function listLabOrdersImpl(query: string = ''): LabOrderRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM lab_orders ORDER BY sent_date DESC, id DESC').all() as LabOrderRow[]
  return d
    .prepare('SELECT * FROM lab_orders WHERE patient_name LIKE ? OR lab_name LIKE ? OR order_id LIKE ? ORDER BY sent_date DESC, id DESC')
    .all(`%${query}%`, `%${query}%`, `%${query}%`) as LabOrderRow[]
}

function createLabOrderImpl(req: {
  patientName: string
  labName: string
  workType: string
  sentDate: string
  status: 'progress' | 'received' | 'delayed'
}): number {
  const d = getDb()
  return d.transaction(() => {
    const countRow = d.prepare('SELECT COUNT(*) as c FROM lab_orders').get() as { c: number }
    const nextNum = countRow.c + 1
    const orderId = `LAB-${String(nextNum).padStart(4, '0')}`
    
    const info = d.prepare(
      `INSERT INTO lab_orders (order_id, patient_name, lab_name, work_type, sent_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(orderId, req.patientName, req.labName, req.workType, req.sentDate, req.status)
    return info.lastInsertRowid as number
  })()
}

function updateLabOrderStatusImpl(id: number, status: 'progress' | 'received' | 'delayed'): void {
  getDb().prepare('UPDATE lab_orders SET status = ? WHERE id = ?').run(status, id)
}

function deleteLabOrderImpl(id: number): void {
  getDb().prepare('DELETE FROM lab_orders WHERE id = ?').run(id)
}

function listOrthodonticCasesImpl(patientId?: number, status?: string, query?: string): unknown[] {
  const d = getDb()
  let sql = `
    SELECT 
      c.*,
      p.first_name as patient_first_name,
      p.last_name as patient_last_name,
      p.phone as patient_phone,
      (SELECT COUNT(*) FROM orthodontic_visits v WHERE v.case_id = c.id) as visits_count,
      (SELECT MAX(v.visit_date) FROM orthodontic_visits v WHERE v.case_id = c.id) as last_visit_date,
      (SELECT COALESCE(SUM(v.amount_paid), 0) FROM orthodontic_visits v WHERE v.case_id = c.id) + c.down_payment as total_paid
    FROM orthodontic_cases c
    JOIN patients p ON p.id = c.patient_id
    WHERE 1=1
  `
  const params: unknown[] = []
  if (patientId) {
    sql += ' AND c.patient_id = ?'
    params.push(patientId)
  }
  if (status && status !== 'all') {
    sql += ' AND c.status = ?'
    params.push(status)
  }
  if (query && query.trim()) {
    const q = `%${query.trim()}%`
    sql += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR c.case_number LIKE ? OR p.phone LIKE ?)'
    params.push(q, q, q, q)
  }
  sql += ' ORDER BY c.id DESC'
  const rows = d.prepare(sql).all(...params) as Array<Record<string, unknown>>
  return rows.map((r) => {
    const totalCost = Number(r.total_cost || 0)
    const totalPaid = Number(r.total_paid || 0)
    return {
      ...r,
      total_paid: totalPaid,
      remaining_balance: Math.max(0, totalCost - totalPaid),
    }
  })
}

function getOrthodonticCaseImpl(id: number): unknown | null {
  const d = getDb()
  const sql = `
    SELECT 
      c.*,
      p.first_name as patient_first_name,
      p.last_name as patient_last_name,
      p.phone as patient_phone,
      (SELECT COUNT(*) FROM orthodontic_visits v WHERE v.case_id = c.id) as visits_count,
      (SELECT MAX(v.visit_date) FROM orthodontic_visits v WHERE v.case_id = c.id) as last_visit_date,
      (SELECT COALESCE(SUM(v.amount_paid), 0) FROM orthodontic_visits v WHERE v.case_id = c.id) + c.down_payment as total_paid
    FROM orthodontic_cases c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.id = ?
  `
  const r = d.prepare(sql).get(id) as Record<string, unknown> | undefined
  if (!r) return null
  const totalCost = Number(r.total_cost || 0)
  const totalPaid = Number(r.total_paid || 0)
  return {
    ...r,
    total_paid: totalPaid,
    remaining_balance: Math.max(0, totalCost - totalPaid),
  }
}

function createOrthodonticCaseImpl(req: {
  patientId: number
  startDate: string
  estimatedDurationMonths?: number
  status?: string
  classification?: string
  applianceType?: string
  archType?: string
  extractionPlan?: string | null
  chiefComplaint?: string | null
  diagnosisNotes?: string | null
  totalCost?: number
  downPayment?: number
  monthlyInstallment?: number
  retainerType?: string | null
}): number {
  const d = getDb()
  return d.transaction(() => {
    const countRow = d.prepare('SELECT COUNT(*) as c FROM orthodontic_cases').get() as { c: number }
    const nextNum = (countRow?.c || 0) + 1
    const caseNumber = `ORT-${String(nextNum).padStart(4, '0')}`

    const info = d.prepare(`
      INSERT INTO orthodontic_cases (
        patient_id, case_number, start_date, estimated_duration_months,
        status, classification, appliance_type, arch_type,
        extraction_plan, chief_complaint, diagnosis_notes,
        total_cost, down_payment, monthly_installment, retainer_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.patientId,
      caseNumber,
      req.startDate,
      req.estimatedDurationMonths ?? 18,
      req.status ?? 'active',
      req.classification ?? 'class_1',
      req.applianceType ?? 'metal',
      req.archType ?? 'both',
      req.extractionPlan ?? null,
      req.chiefComplaint ?? null,
      req.diagnosisNotes ?? null,
      req.totalCost ?? 0,
      req.downPayment ?? 0,
      req.monthlyInstallment ?? 0,
      req.retainerType ?? null,
    )
    return info.lastInsertRowid as number
  })()
}

function updateOrthodonticCaseImpl(id: number, req: {
  startDate?: string
  estimatedDurationMonths?: number
  status?: string
  classification?: string
  applianceType?: string
  archType?: string
  extractionPlan?: string | null
  chiefComplaint?: string | null
  diagnosisNotes?: string | null
  totalCost?: number
  downPayment?: number
  monthlyInstallment?: number
  retainerType?: string | null
}): void {
  const d = getDb()
  const existing = d.prepare('SELECT * FROM orthodontic_cases WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) throw new Error('Orthodontic case not found')

  d.prepare(`
    UPDATE orthodontic_cases SET
      start_date = ?,
      estimated_duration_months = ?,
      status = ?,
      classification = ?,
      appliance_type = ?,
      arch_type = ?,
      extraction_plan = ?,
      chief_complaint = ?,
      diagnosis_notes = ?,
      total_cost = ?,
      down_payment = ?,
      monthly_installment = ?,
      retainer_type = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    req.startDate ?? existing.start_date,
    req.estimatedDurationMonths ?? existing.estimated_duration_months,
    req.status ?? existing.status,
    req.classification ?? existing.classification,
    req.applianceType ?? existing.appliance_type,
    req.archType ?? existing.arch_type,
    req.extractionPlan !== undefined ? req.extractionPlan : existing.extraction_plan,
    req.chiefComplaint !== undefined ? req.chiefComplaint : existing.chief_complaint,
    req.diagnosisNotes !== undefined ? req.diagnosisNotes : existing.diagnosis_notes,
    req.totalCost ?? existing.total_cost,
    req.downPayment ?? existing.down_payment,
    req.monthlyInstallment ?? existing.monthly_installment,
    req.retainerType !== undefined ? req.retainerType : existing.retainer_type,
    id
  )
}

function deleteOrthodonticCaseImpl(id: number): void {
  getDb().prepare('DELETE FROM orthodontic_cases WHERE id = ?').run(id)
}

function listOrthodonticVisitsImpl(caseId: number): unknown[] {
  return getDb().prepare(
    'SELECT * FROM orthodontic_visits WHERE case_id = ? ORDER BY visit_number DESC, visit_date DESC'
  ).all(caseId)
}

function createOrthodonticVisitImpl(req: {
  caseId: number
  visitDate: string
  upperWire?: string | null
  lowerWire?: string | null
  elasticPrescription?: string | null
  actionsJson?: string | null
  brokenBracketsCount?: number
  oralHygieneRating?: number
  painLevel?: number
  amountPaid?: number
  notes?: string | null
  nextAppointmentDate?: string | null
}): number {
  const d = getDb()
  return d.transaction(() => {
    const maxRow = d.prepare('SELECT MAX(visit_number) as max_v FROM orthodontic_visits WHERE case_id = ?').get(req.caseId) as { max_v: number | null }
    const nextVisitNumber = (maxRow?.max_v ?? 0) + 1

    const info = d.prepare(`
      INSERT INTO orthodontic_visits (
        case_id, visit_number, visit_date, upper_wire, lower_wire,
        elastic_prescription, actions_json, broken_brackets_count,
        oral_hygiene_rating, pain_level, amount_paid, notes, next_appointment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.caseId,
      nextVisitNumber,
      req.visitDate,
      req.upperWire ?? null,
      req.lowerWire ?? null,
      req.elasticPrescription ?? null,
      req.actionsJson ?? null,
      req.brokenBracketsCount ?? 0,
      req.oralHygieneRating ?? 4,
      req.painLevel ?? 1,
      req.amountPaid ?? 0,
      req.notes ?? null,
      req.nextAppointmentDate ?? null
    )
    return info.lastInsertRowid as number
  })()
}

function updateOrthodonticVisitImpl(id: number, req: {
  upperWire?: string | null
  lowerWire?: string | null
  elasticPrescription?: string | null
  actionsJson?: string | null
  brokenBracketsCount?: number
  oralHygieneRating?: number
  painLevel?: number
  amountPaid?: number
  notes?: string | null
  nextAppointmentDate?: string | null
}): void {
  const d = getDb()
  const existing = d.prepare('SELECT * FROM orthodontic_visits WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) throw new Error('Orthodontic visit not found')

  d.prepare(`
    UPDATE orthodontic_visits SET
      upper_wire = ?,
      lower_wire = ?,
      elastic_prescription = ?,
      actions_json = ?,
      broken_brackets_count = ?,
      oral_hygiene_rating = ?,
      pain_level = ?,
      amount_paid = ?,
      notes = ?,
      next_appointment_date = ?
    WHERE id = ?
  `).run(
    req.upperWire !== undefined ? req.upperWire : existing.upper_wire,
    req.lowerWire !== undefined ? req.lowerWire : existing.lower_wire,
    req.elasticPrescription !== undefined ? req.elasticPrescription : existing.elastic_prescription,
    req.actionsJson !== undefined ? req.actionsJson : existing.actions_json,
    req.brokenBracketsCount !== undefined ? req.brokenBracketsCount : existing.broken_brackets_count,
    req.oralHygieneRating !== undefined ? req.oralHygieneRating : existing.oral_hygiene_rating,
    req.painLevel !== undefined ? req.painLevel : existing.pain_level,
    req.amountPaid !== undefined ? req.amountPaid : existing.amount_paid,
    req.notes !== undefined ? req.notes : existing.notes,
    req.nextAppointmentDate !== undefined ? req.nextAppointmentDate : existing.next_appointment_date,
    id
  )
}

function deleteOrthodonticVisitImpl(id: number): void {
  getDb().prepare('DELETE FROM orthodontic_visits WHERE id = ?').run(id)
}

function getOrthodonticStatsImpl(): unknown {
  const d = getDb()
  const activeCases = (d.prepare("SELECT COUNT(*) as c FROM orthodontic_cases WHERE status = 'active'").get() as { c: number })?.c ?? 0
  const retentionCases = (d.prepare("SELECT COUNT(*) as c FROM orthodontic_cases WHERE status = 'retention'").get() as { c: number })?.c ?? 0
  const completedCases = (d.prepare("SELECT COUNT(*) as c FROM orthodontic_cases WHERE status = 'completed'").get() as { c: number })?.c ?? 0
  const suspendedCases = (d.prepare("SELECT COUNT(*) as c FROM orthodontic_cases WHERE status = 'suspended'").get() as { c: number })?.c ?? 0

  const totalCostRow = d.prepare("SELECT COALESCE(SUM(total_cost), 0) as s, COALESCE(SUM(down_payment), 0) as dp FROM orthodontic_cases WHERE status != 'suspended'").get() as { s: number; dp: number }
  const visitsPaidRow = d.prepare("SELECT COALESCE(SUM(amount_paid), 0) as s FROM orthodontic_visits").get() as { s: number }

  const totalRevenue = (totalCostRow?.dp ?? 0) + (visitsPaidRow?.s ?? 0)
  const totalDebt = Math.max(0, (totalCostRow?.s ?? 0) - totalRevenue)

  const upcomingVisitsCount = (d.prepare("SELECT COUNT(*) as c FROM orthodontic_visits WHERE next_appointment_date IS NOT NULL AND next_appointment_date >= date('now')").get() as { c: number })?.c ?? 0

  return {
    activeCases,
    retentionCases,
    completedCases,
    suspendedCases,
    upcomingVisitsCount,
    totalRevenue,
    totalDebt,
  }
}

// ----------------------------------------------------
// Dental Implants (Implantology Tracker)
// ----------------------------------------------------
function listDentalImplantsImpl(patientId?: number, status?: string, query?: string): unknown[] {
  const d = getDb()
  let sql = `
    SELECT 
      i.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone as patient_phone
    FROM dental_implants i
    JOIN patients p ON p.id = i.patient_id
    WHERE 1=1
  `
  const params: unknown[] = []
  if (patientId) {
    sql += ' AND i.patient_id = ?'
    params.push(patientId)
  }
  if (status && status !== 'all') {
    sql += ' AND i.status = ?'
    params.push(status)
  }
  if (query && query.trim()) {
    const q = `%${query.trim()}%`
    sql += ' AND (i.brand LIKE ? OR i.model LIKE ? OR i.lot_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)'
    params.push(q, q, q, q, q)
  }
  sql += ' ORDER BY i.id DESC'
  return d.prepare(sql).all(...params)
}

function getDentalImplantImpl(id: number): unknown | null {
  const d = getDb()
  const sql = `
    SELECT 
      i.*,
      p.first_name || ' ' || p.last_name as patient_name,
      p.phone as patient_phone
    FROM dental_implants i
    JOIN patients p ON p.id = i.patient_id
    WHERE i.id = ?
  `
  return d.prepare(sql).get(id) ?? null
}

function createDentalImplantImpl(data: {
  patientId: number
  toothNumber: number
  brand: string
  model?: string | null
  diameterMm: number
  lengthMm: number
  lotNumber?: string | null
  serialNumber?: string | null
  insertionTorqueNcm?: number | null
  isqValue?: number | null
  boneGraftType?: string | null
  membraneUsed?: number
  sinusLift?: string | null
  placementDate: string
  healingPeriodMonths?: number
  targetLoadingDate?: string | null
  healingAbutmentDate?: string | null
  healingAbutmentSize?: string | null
  finalLoadingDate?: string | null
  prostheticType?: string | null
  status?: string
  notes?: string | null
}): number {
  const d = getDb()
  const info = d.prepare(`
    INSERT INTO dental_implants (
      patient_id, tooth_number, brand, model, diameter_mm, length_mm,
      lot_number, serial_number, insertion_torque_ncm, isq_value,
      bone_graft_type, membrane_used, sinus_lift, placement_date,
      healing_period_months, target_loading_date, healing_abutment_date,
      healing_abutment_size, final_loading_date, prosthetic_type,
      status, notes
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `).run(
    data.patientId,
    data.toothNumber,
    data.brand,
    data.model ?? null,
    data.diameterMm,
    data.lengthMm,
    data.lotNumber ?? null,
    data.serialNumber ?? null,
    data.insertionTorqueNcm ?? null,
    data.isqValue ?? null,
    data.boneGraftType ?? null,
    data.membraneUsed ? 1 : 0,
    data.sinusLift ?? null,
    data.placementDate,
    data.healingPeriodMonths ?? 3,
    data.targetLoadingDate ?? null,
    data.healingAbutmentDate ?? null,
    data.healingAbutmentSize ?? null,
    data.finalLoadingDate ?? null,
    data.prostheticType ?? null,
    data.status ?? 'healing',
    data.notes ?? null,
  )
  return Number(info.lastInsertRowid)
}

function updateDentalImplantImpl(id: number, data: {
  toothNumber?: number
  brand?: string
  model?: string | null
  diameterMm?: number
  lengthMm?: number
  lotNumber?: string | null
  serialNumber?: string | null
  insertionTorqueNcm?: number | null
  isqValue?: number | null
  boneGraftType?: string | null
  membraneUsed?: number
  sinusLift?: string | null
  placementDate?: string
  healingPeriodMonths?: number
  targetLoadingDate?: string | null
  healingAbutmentDate?: string | null
  healingAbutmentSize?: string | null
  finalLoadingDate?: string | null
  prostheticType?: string | null
  status?: string
  notes?: string | null
}): void {
  const d = getDb()
  const existing = d.prepare('SELECT * FROM dental_implants WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) throw new Error('Dental implant not found')

  d.prepare(`
    UPDATE dental_implants SET
      tooth_number = ?,
      brand = ?,
      model = ?,
      diameter_mm = ?,
      length_mm = ?,
      lot_number = ?,
      serial_number = ?,
      insertion_torque_ncm = ?,
      isq_value = ?,
      bone_graft_type = ?,
      membrane_used = ?,
      sinus_lift = ?,
      placement_date = ?,
      healing_period_months = ?,
      target_loading_date = ?,
      healing_abutment_date = ?,
      healing_abutment_size = ?,
      final_loading_date = ?,
      prosthetic_type = ?,
      status = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.toothNumber !== undefined ? data.toothNumber : existing.tooth_number,
    data.brand !== undefined ? data.brand : existing.brand,
    data.model !== undefined ? data.model : existing.model,
    data.diameterMm !== undefined ? data.diameterMm : existing.diameter_mm,
    data.lengthMm !== undefined ? data.lengthMm : existing.length_mm,
    data.lotNumber !== undefined ? data.lotNumber : existing.lot_number,
    data.serialNumber !== undefined ? data.serialNumber : existing.serial_number,
    data.insertionTorqueNcm !== undefined ? data.insertionTorqueNcm : existing.insertion_torque_ncm,
    data.isqValue !== undefined ? data.isqValue : existing.isq_value,
    data.boneGraftType !== undefined ? data.boneGraftType : existing.bone_graft_type,
    data.membraneUsed !== undefined ? (data.membraneUsed ? 1 : 0) : existing.membrane_used,
    data.sinusLift !== undefined ? data.sinusLift : existing.sinus_lift,
    data.placementDate !== undefined ? data.placementDate : existing.placement_date,
    data.healingPeriodMonths !== undefined ? data.healingPeriodMonths : existing.healing_period_months,
    data.targetLoadingDate !== undefined ? data.targetLoadingDate : existing.target_loading_date,
    data.healingAbutmentDate !== undefined ? data.healingAbutmentDate : existing.healing_abutment_date,
    data.healingAbutmentSize !== undefined ? data.healingAbutmentSize : existing.healing_abutment_size,
    data.finalLoadingDate !== undefined ? data.finalLoadingDate : existing.final_loading_date,
    data.prostheticType !== undefined ? data.prostheticType : existing.prosthetic_type,
    data.status !== undefined ? data.status : existing.status,
    data.notes !== undefined ? data.notes : existing.notes,
    id,
  )
}

function deleteDentalImplantImpl(id: number): void {
  getDb().prepare('DELETE FROM dental_implants WHERE id = ?').run(id)
}

// ----------------------------------------------------
// Dental Stock & Inventory
// ----------------------------------------------------
function listInventoryItemsImpl(category?: string, query?: string, lowStockOnly?: boolean, expiringSoon?: boolean): unknown[] {
  const d = getDb()
  let sql = `
    SELECT 
      inv.*,
      dist.name as distributor_name,
      dist.company as distributor_company,
      dist.phone as distributor_phone,
      (inv.quantity <= inv.min_threshold) as is_low_stock,
      (inv.expiry_date IS NOT NULL AND inv.expiry_date < date('now')) as is_expired,
      (inv.expiry_date IS NOT NULL AND inv.expiry_date >= date('now') AND inv.expiry_date <= date('now', '+60 days')) as is_near_expiry
    FROM inventory_items inv
    LEFT JOIN distributors dist ON dist.id = inv.distributor_id
    WHERE 1=1
  `
  const params: unknown[] = []
  if (category && category !== 'all') {
    sql += ' AND inv.category = ?'
    params.push(category)
  }
  if (query && query.trim()) {
    const q = `%${query.trim()}%`
    sql += ' AND (inv.name LIKE ? OR inv.specification LIKE ? OR inv.batch_number LIKE ? OR dist.name LIKE ? OR dist.company LIKE ?)'
    params.push(q, q, q, q, q)
  }
  if (lowStockOnly) {
    sql += ' AND inv.quantity <= inv.min_threshold'
  }
  if (expiringSoon) {
    sql += " AND (inv.expiry_date IS NOT NULL AND inv.expiry_date <= date('now', '+60 days'))"
  }
  sql += ' ORDER BY inv.id DESC'
  return d.prepare(sql).all(...params)
}

function getInventoryItemImpl(id: number): unknown | null {
  const d = getDb()
  const sql = `
    SELECT 
      inv.*,
      dist.name as distributor_name,
      dist.company as distributor_company,
      dist.phone as distributor_phone,
      (inv.quantity <= inv.min_threshold) as is_low_stock,
      (inv.expiry_date IS NOT NULL AND inv.expiry_date < date('now')) as is_expired,
      (inv.expiry_date IS NOT NULL AND inv.expiry_date >= date('now') AND inv.expiry_date <= date('now', '+60 days')) as is_near_expiry
    FROM inventory_items inv
    LEFT JOIN distributors dist ON dist.id = inv.distributor_id
    WHERE inv.id = ?
  `
  return d.prepare(sql).get(id) ?? null
}

function createInventoryItemImpl(data: {
  name: string
  category: string
  specification?: string | null
  quantity: number
  unit: string
  minThreshold: number
  costPerUnit: number
  distributorId?: number | null
  expiryDate?: string | null
  batchNumber?: string | null
  location?: string | null
  notes?: string | null
}): number {
  const d = getDb()
  const info = d.prepare(`
    INSERT INTO inventory_items (
      name, category, specification, quantity, unit,
      min_threshold, cost_per_unit, distributor_id,
      expiry_date, batch_number, location, notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    data.name,
    data.category,
    data.specification ?? null,
    data.quantity,
    data.unit,
    data.minThreshold,
    data.costPerUnit,
    data.distributorId ?? null,
    data.expiryDate ?? null,
    data.batchNumber ?? null,
    data.location ?? null,
    data.notes ?? null,
  )
  return Number(info.lastInsertRowid)
}

function updateInventoryItemImpl(id: number, data: {
  name?: string
  category?: string
  specification?: string | null
  quantity?: number
  unit?: string
  minThreshold?: number
  costPerUnit?: number
  distributorId?: number | null
  expiryDate?: string | null
  batchNumber?: string | null
  location?: string | null
  notes?: string | null
}): void {
  const d = getDb()
  const existing = d.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) throw new Error('Inventory item not found')

  d.prepare(`
    UPDATE inventory_items SET
      name = ?,
      category = ?,
      specification = ?,
      quantity = ?,
      unit = ?,
      min_threshold = ?,
      cost_per_unit = ?,
      distributor_id = ?,
      expiry_date = ?,
      batch_number = ?,
      location = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name !== undefined ? data.name : existing.name,
    data.category !== undefined ? data.category : existing.category,
    data.specification !== undefined ? data.specification : existing.specification,
    data.quantity !== undefined ? data.quantity : existing.quantity,
    data.unit !== undefined ? data.unit : existing.unit,
    data.minThreshold !== undefined ? data.minThreshold : existing.min_threshold,
    data.costPerUnit !== undefined ? data.costPerUnit : existing.cost_per_unit,
    data.distributorId !== undefined ? data.distributorId : existing.distributor_id,
    data.expiryDate !== undefined ? data.expiryDate : existing.expiry_date,
    data.batchNumber !== undefined ? data.batchNumber : existing.batch_number,
    data.location !== undefined ? data.location : existing.location,
    data.notes !== undefined ? data.notes : existing.notes,
    id,
  )
}

function adjustInventoryQuantityImpl(id: number, delta: number): unknown {
  const d = getDb()
  d.prepare(`
    UPDATE inventory_items 
    SET quantity = MAX(0, quantity + ?), updated_at = datetime('now') 
    WHERE id = ?
  `).run(delta, id)
  return getInventoryItemImpl(id)
}

function deleteInventoryItemImpl(id: number): void {
  getDb().prepare('DELETE FROM inventory_items WHERE id = ?').run(id)
}

function getInventoryStatsImpl(): unknown {
  const d = getDb()
  const totalRow = d.prepare('SELECT COUNT(*) as c, COALESCE(SUM(quantity * cost_per_unit), 0) as val FROM inventory_items').get() as { c: number; val: number }
  const lowRow = d.prepare('SELECT COUNT(*) as c FROM inventory_items WHERE quantity <= min_threshold').get() as { c: number }
  const expRow = d.prepare("SELECT COUNT(*) as c FROM inventory_items WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+60 days')").get() as { c: number }

  return {
    totalItems: totalRow?.c ?? 0,
    lowStockCount: lowRow?.c ?? 0,
    expiringCount: expRow?.c ?? 0,
    totalEstimatedValue: totalRow?.val ?? 0,
  }
}

// ----------------------------------------------------
// Treatment Catalog / Fee Schedule
// ----------------------------------------------------
function listTreatmentCatalogImpl(category?: string, query?: string, activeOnly = true): unknown[] {
  const d = getDb()
  let sql = 'SELECT * FROM treatment_catalog WHERE 1=1'
  const params: unknown[] = []
  if (activeOnly) {
    sql += ' AND is_active = 1'
  }
  if (category && category !== 'all') {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (query && query.trim()) {
    const q = `%${query.trim()}%`
    sql += ' AND (name_ar LIKE ? OR name_en LIKE ? OR code LIKE ? OR description LIKE ?)'
    params.push(q, q, q, q)
  }
  sql += ' ORDER BY category ASC, id ASC'
  return d.prepare(sql).all(...params)
}

function createTreatmentCatalogItemImpl(data: {
  category: string
  code?: string | null
  nameAr: string
  nameEn: string
  defaultCost: number
  description?: string | null
  durationMinutes?: number
  isActive?: number
}): number {
  const d = getDb()
  const info = d.prepare(`
    INSERT INTO treatment_catalog (
      category, code, name_ar, name_en, default_cost, description, duration_minutes, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.category,
    data.code ?? null,
    data.nameAr,
    data.nameEn,
    data.defaultCost,
    data.description ?? null,
    data.durationMinutes ?? 30,
    data.isActive !== undefined ? data.isActive : 1,
  )
  return Number(info.lastInsertRowid)
}

function updateTreatmentCatalogItemImpl(id: number, data: {
  category?: string
  code?: string | null
  nameAr?: string
  nameEn?: string
  defaultCost?: number
  description?: string | null
  durationMinutes?: number
  isActive?: number
}): void {
  const d = getDb()
  const existing = d.prepare('SELECT * FROM treatment_catalog WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) throw new Error('Treatment catalog item not found')

  d.prepare(`
    UPDATE treatment_catalog SET
      category = ?,
      code = ?,
      name_ar = ?,
      name_en = ?,
      default_cost = ?,
      description = ?,
      duration_minutes = ?,
      is_active = ?
    WHERE id = ?
  `).run(
    data.category !== undefined ? data.category : existing.category,
    data.code !== undefined ? data.code : existing.code,
    data.nameAr !== undefined ? data.nameAr : existing.name_ar,
    data.nameEn !== undefined ? data.nameEn : existing.name_en,
    data.defaultCost !== undefined ? data.defaultCost : existing.default_cost,
    data.description !== undefined ? data.description : existing.description,
    data.durationMinutes !== undefined ? data.durationMinutes : existing.duration_minutes,
    data.isActive !== undefined ? data.isActive : existing.is_active,
    id,
  )
}

function deleteTreatmentCatalogItemImpl(id: number): void {
  getDb().prepare('DELETE FROM treatment_catalog WHERE id = ?').run(id)
}

export type DbRequest =
  | { op: 'getConfig'; key: string }
  | { op: 'setConfig'; key: string; value: string }
  | { op: 'getConfigs'; keys: string[] }
  | { op: 'verifyCredentials'; username: string; password: string }
  | { op: 'listUsers' }
  | { op: 'createUser'; username: string; role: UserRole; pin: string }
  | { op: 'updateUserPin'; id: number; pin: string }
  | { op: 'updateUsername'; id: number; username: string }
  | { op: 'deleteUser'; id: number }
  | { op: 'setLicenseActive' }
  | { op: 'listPatients'; query?: string }
  | { op: 'getPatient'; id: number }
  | {
      op: 'createPatient'
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | {
      op: 'updatePatient'
      id: number
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | { op: 'deletePatient'; id: number }
  | { op: 'listTeethStatuses'; patientId: number }
  | {
      op: 'upsertTeethStatus'
      patientId: number
      toothNumber: number
      status: string
      notes: string | null
      preparationDepthMm: number | null
    }
  | { op: 'listAppointments'; fromIso: string | null; toIso: string | null }
  | {
      op: 'createAppointment'
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | {
      op: 'updateAppointment'
      id: number
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | { op: 'deleteAppointment'; id: number }
  | { op: 'listDueWhatsAppReminders'; nowIso: string }
  | { op: 'markAppointmentReminderSent'; appointmentId: number; reminderType: '24h' | '2h' }
  | { op: 'listTreatmentPlans'; patientId: number }
  | { op: 'createTreatmentPlan'; patientId: number; title: string; diagnosis: string | null; notes: string | null }
  | { op: 'updateTreatmentPlan'; id: number; title: string; diagnosis: string | null; notes: string | null; status: TreatmentPlanRow['status'] }
  | { op: 'acceptTreatmentPlan'; id: number; acceptedByName: string; signatureText: string }
  | { op: 'deleteTreatmentPlan'; id: number }
  | { op: 'listTreatmentPlanStages'; planId: number }
  | {
      op: 'createTreatmentPlanStage'
      planId: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: TreatmentPlanStageRow['status']
      appointmentId: number | null
      dueDate: string | null
    }
  | {
      op: 'updateTreatmentPlanStage'
      id: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: TreatmentPlanStageRow['status']
      appointmentId: number | null
      dueDate: string | null
    }
  | { op: 'deleteTreatmentPlanStage'; id: number }
  | { op: 'listInvoices'; limit?: number; patientId?: number | null }
  | { op: 'listInvoiceLinesExport' }
  | { op: 'getInvoice'; id: number }
  | {
      op: 'createInvoice'
      patientId: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'updateInvoiceStatus'; id: number; status: 'paid' | 'pending' }
  | {
      op: 'updateInvoiceWithItems'
      id: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'deleteInvoice'; id: number }
  | { op: 'listPrescriptions'; patientId: number }
  | {
      op: 'createPrescription'
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | {
      op: 'updatePrescription'
      id: number
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | { op: 'deletePrescription'; id: number }
  | { op: 'listPatientImages'; patientId: number }
  | {
      op: 'createPatientImage'
      patientId: number
      imagePath: string
      type: 'before' | 'after'
      date: string
      notes: string | null
      toothNumber: number | null
    }
  | { op: 'deletePatientImage'; id: number }
  | { op: 'getDashboardStats' }
  | { op: 'getDailyReports' }
  | { op: 'listDistributors'; query?: string }
  | {
      op: 'createDistributor'
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | {
      op: 'updateDistributor'
      id: number
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | { op: 'deleteDistributor'; id: number }

  | { op: 'listTransactions'; query?: string }
  | {
      op: 'createTransaction'
      date: string
      description: string
      type: 'income' | 'expense'
      amount: number
      currency: string
    }
  | { op: 'deleteTransaction'; id: number }
  | { op: 'listLabOrders'; query?: string }
  | {
      op: 'createLabOrder'
      patientName: string
      labName: string
      workType: string
      sentDate: string
      status: 'progress' | 'received' | 'delayed'
    }
  | { op: 'updateLabOrderStatus'; id: number; status: 'progress' | 'received' | 'delayed' }
  | { op: 'deleteLabOrder'; id: number }
  | { op: 'listOrthodonticCases'; patientId?: number; status?: string; query?: string }
  | { op: 'getOrthodonticCase'; id: number }
  | {
      op: 'createOrthodonticCase'
      patientId: number
      startDate: string
      estimatedDurationMonths?: number
      status?: 'active' | 'retention' | 'completed' | 'suspended'
      classification?: string
      applianceType?: string
      archType?: 'upper' | 'lower' | 'both'
      extractionPlan?: string | null
      chiefComplaint?: string | null
      diagnosisNotes?: string | null
      totalCost?: number
      downPayment?: number
      monthlyInstallment?: number
      retainerType?: string | null
    }
  | {
      op: 'updateOrthodonticCase'
      id: number
      startDate?: string
      estimatedDurationMonths?: number
      status?: 'active' | 'retention' | 'completed' | 'suspended'
      classification?: string
      applianceType?: string
      archType?: 'upper' | 'lower' | 'both'
      extractionPlan?: string | null
      chiefComplaint?: string | null
      diagnosisNotes?: string | null
      totalCost?: number
      downPayment?: number
      monthlyInstallment?: number
      retainerType?: string | null
    }
  | { op: 'deleteOrthodonticCase'; id: number }
  | { op: 'listOrthodonticVisits'; caseId: number }
  | {
      op: 'createOrthodonticVisit'
      caseId: number
      visitDate: string
      upperWire?: string | null
      lowerWire?: string | null
      elasticPrescription?: string | null
      actionsJson?: string | null
      brokenBracketsCount?: number
      oralHygieneRating?: number
      painLevel?: number
      amountPaid?: number
      notes?: string | null
      nextAppointmentDate?: string | null
    }
  | {
      op: 'updateOrthodonticVisit'
      id: number
      upperWire?: string | null
      lowerWire?: string | null
      elasticPrescription?: string | null
      actionsJson?: string | null
      brokenBracketsCount?: number
      oralHygieneRating?: number
      painLevel?: number
      amountPaid?: number
      notes?: string | null
      nextAppointmentDate?: string | null
    }
  | { op: 'deleteOrthodonticVisit'; id: number }
  | { op: 'getOrthodonticStats' }

  // Dental Implants
  | { op: 'listDentalImplants'; patientId?: number; status?: string; query?: string }
  | { op: 'getDentalImplant'; id: number }
  | {
      op: 'createDentalImplant'
      patientId: number
      toothNumber: number
      brand: string
      model?: string | null
      diameterMm: number
      lengthMm: number
      lotNumber?: string | null
      serialNumber?: string | null
      insertionTorqueNcm?: number | null
      isqValue?: number | null
      boneGraftType?: string | null
      membraneUsed?: number
      sinusLift?: string | null
      placementDate: string
      healingPeriodMonths?: number
      targetLoadingDate?: string | null
      healingAbutmentDate?: string | null
      healingAbutmentSize?: string | null
      finalLoadingDate?: string | null
      prostheticType?: string | null
      status?: string
      notes?: string | null
    }
  | {
      op: 'updateDentalImplant'
      id: number
      toothNumber?: number
      brand?: string
      model?: string | null
      diameterMm?: number
      lengthMm?: number
      lotNumber?: string | null
      serialNumber?: string | null
      insertionTorqueNcm?: number | null
      isqValue?: number | null
      boneGraftType?: string | null
      membraneUsed?: number
      sinusLift?: string | null
      placementDate?: string
      healingPeriodMonths?: number
      targetLoadingDate?: string | null
      healingAbutmentDate?: string | null
      healingAbutmentSize?: string | null
      finalLoadingDate?: string | null
      prostheticType?: string | null
      status?: string
      notes?: string | null
    }
  | { op: 'deleteDentalImplant'; id: number }

  // Dental Stock & Inventory
  | { op: 'listInventoryItems'; category?: string; query?: string; lowStockOnly?: boolean; expiringSoon?: boolean }
  | { op: 'getInventoryItem'; id: number }
  | {
      op: 'createInventoryItem'
      name: string
      category: string
      specification?: string | null
      quantity: number
      unit: string
      minThreshold: number
      costPerUnit: number
      distributorId?: number | null
      expiryDate?: string | null
      batchNumber?: string | null
      location?: string | null
      notes?: string | null
    }
  | {
      op: 'updateInventoryItem'
      id: number
      name?: string
      category?: string
      specification?: string | null
      quantity?: number
      unit?: string
      minThreshold?: number
      costPerUnit?: number
      distributorId?: number | null
      expiryDate?: string | null
      batchNumber?: string | null
      location?: string | null
      notes?: string | null
    }
  | { op: 'adjustInventoryQuantity'; id: number; delta: number }
  | { op: 'deleteInventoryItem'; id: number }
  | { op: 'getInventoryStats' }

  // Treatment Catalog
  | { op: 'listTreatmentCatalog'; category?: string; query?: string; activeOnly?: boolean }
  | {
      op: 'createTreatmentCatalogItem'
      category: string
      code?: string | null
      nameAr: string
      nameEn: string
      defaultCost: number
      description?: string | null
      durationMinutes?: number
      isActive?: number
    }
  | {
      op: 'updateTreatmentCatalogItem'
      id: number
      category?: string
      code?: string | null
      nameAr?: string
      nameEn?: string
      defaultCost?: number
      description?: string | null
      durationMinutes?: number
      isActive?: number
    }
  | { op: 'deleteTreatmentCatalogItem'; id: number }

export function handleDbRequest(req: DbRequest): unknown {
  switch (req.op) {
    case 'getConfig':
      return getConfig(req.key)
    case 'setConfig':
      setConfig(req.key, req.value)
      return true
    case 'getConfigs': {
      if (req.keys.length === 0) return {}
      const stmt = getDb().prepare(
        'SELECT key, value FROM app_config WHERE key IN (' + req.keys.map(() => '?').join(',') + ')',
      )
      const rows = stmt.all(...req.keys) as { key: string; value: string }[]
      const map: Record<string, string> = {}
      for (const r of rows) map[r.key] = r.value
      return map
    }
    case 'verifyCredentials':
      return verifyCredentials(req.username, req.password)
    case 'listUsers':
      return listUsers()
    case 'createUser':
      return createUserImpl(req.username, req.role, req.pin)
    case 'updateUserPin':
      updateUserPinImpl(req.id, req.pin)
      return true
    case 'updateUsername':
      updateUsernameImpl(req.id, req.username)
      return true
    case 'deleteUser':
      deleteUserImpl(req.id)
      return true
    case 'setLicenseActive':
      setConfig('license_status', 'active')
      return true
    case 'listPatients':
      return listPatientsImpl(req.query ?? '')
    case 'getPatient':
      return getPatientImpl(req.id)
    case 'createPatient':
      return createPatientImpl({
        firstName: req.firstName,
        lastName: req.lastName,
        dob: req.dob,
        gender: req.gender,
        phone: req.phone,
        medicalHistory: req.medicalHistory,
      })
    case 'updatePatient':
      updatePatientImpl(req.id, {
        firstName: req.firstName,
        lastName: req.lastName,
        dob: req.dob,
        gender: req.gender,
        phone: req.phone,
        medicalHistory: req.medicalHistory,
      })
      return true
    case 'deletePatient':
      deletePatientImpl(req.id)
      return true
    case 'listTeethStatuses':
      return listTeethStatusesImpl(req.patientId)
    case 'upsertTeethStatus':
      return upsertTeethStatusImpl(
        req.patientId,
        req.toothNumber,
        req.status,
        req.notes,
        req.preparationDepthMm,
      )
    case 'listAppointments':
      return listAppointmentsImpl(req.fromIso, req.toIso)
    case 'createAppointment':
      return createAppointmentImpl(req.patientId, req.startTime, req.endTime, req.status, req.notes)
    case 'updateAppointment':
      updateAppointmentImpl(req.id, req.patientId, req.startTime, req.endTime, req.status, req.notes)
      return true
    case 'deleteAppointment':
      deleteAppointmentImpl(req.id)
      return true
    case 'listDueWhatsAppReminders':
      return listDueWhatsAppRemindersImpl(req.nowIso)
    case 'markAppointmentReminderSent':
      markAppointmentReminderSentImpl(req.appointmentId, req.reminderType)
      return true
    case 'listTreatmentPlans':
      return listTreatmentPlansImpl(req.patientId)
    case 'createTreatmentPlan':
      return createTreatmentPlanImpl(req.patientId, req.title, req.diagnosis, req.notes)
    case 'updateTreatmentPlan':
      updateTreatmentPlanImpl(req.id, req.title, req.diagnosis, req.notes, req.status)
      return true
    case 'acceptTreatmentPlan':
      acceptTreatmentPlanImpl(req.id, req.acceptedByName, req.signatureText)
      return true
    case 'deleteTreatmentPlan':
      deleteTreatmentPlanImpl(req.id)
      return true
    case 'listTreatmentPlanStages':
      return listTreatmentPlanStagesImpl(req.planId)
    case 'createTreatmentPlanStage':
      return createTreatmentPlanStageImpl({
        planId: req.planId,
        stageOrder: req.stageOrder,
        title: req.title,
        description: req.description,
        estimatedCost: req.estimatedCost,
        paidAmount: req.paidAmount,
        status: req.status,
        appointmentId: req.appointmentId,
        dueDate: req.dueDate,
      })
    case 'updateTreatmentPlanStage':
      updateTreatmentPlanStageImpl({
        id: req.id,
        stageOrder: req.stageOrder,
        title: req.title,
        description: req.description,
        estimatedCost: req.estimatedCost,
        paidAmount: req.paidAmount,
        status: req.status,
        appointmentId: req.appointmentId,
        dueDate: req.dueDate,
      })
      return true
    case 'deleteTreatmentPlanStage':
      deleteTreatmentPlanStageImpl(req.id)
      return true
    case 'listInvoices':
      return listInvoicesImpl(req.limit ?? 100, req.patientId)
    case 'listInvoiceLinesExport':
      return listInvoiceLinesExportImpl()
    case 'getInvoice':
      return getInvoiceImpl(req.id)
    case 'createInvoice':
      return createInvoiceImpl(req.patientId, req.date, req.status, req.items)
    case 'updateInvoiceStatus':
      updateInvoiceStatusImpl(req.id, req.status)
      return true
    case 'updateInvoiceWithItems':
      updateInvoiceWithItemsImpl(req.id, req.date, req.status, req.items)
      return true
    case 'deleteInvoice':
      deleteInvoiceImpl(req.id)
      return true
    case 'listPrescriptions':
      return listPrescriptionsImpl(req.patientId)
    case 'createPrescription':
      return createPrescriptionImpl(
        req.patientId,
        req.doctorId,
        req.date,
        req.medicationsJson,
        req.notes,
      )
    case 'updatePrescription':
      updatePrescriptionImpl(
        req.id,
        req.patientId,
        req.doctorId,
        req.date,
        req.medicationsJson,
        req.notes,
      )
      return true
    case 'deletePrescription':
      deletePrescriptionImpl(req.id)
      return true
    case 'listPatientImages':
      return listPatientImagesImpl(req.patientId)
    case 'createPatientImage':
      return createPatientImageImpl(
        req.patientId,
        req.imagePath,
        req.type,
        req.date,
        req.notes,
        req.toothNumber,
      )
    case 'deletePatientImage':
      deletePatientImageImpl(req.id)
      return true
    case 'getDashboardStats':
      return getDashboardStatsImpl()
    case 'getDailyReports':
      return getDailyReportsImpl()
    case 'listDistributors':
      return listDistributorsImpl(req.query ?? '')
    case 'createDistributor':
      return createDistributorImpl({
        name: req.name,
        company: req.company,
        phone: req.phone,
        address: req.address,
        items: req.items,
        paymentAmount: req.paymentAmount,
        remainingAmount: req.remainingAmount,
      })
    case 'updateDistributor':
      updateDistributorImpl(req.id, {
        name: req.name,
        company: req.company,
        phone: req.phone,
        address: req.address,
        items: req.items,
        paymentAmount: req.paymentAmount,
        remainingAmount: req.remainingAmount,
      })
      return true
    case 'deleteDistributor':
      deleteDistributorImpl(req.id)
      return true
    case 'listTransactions':
      return listTransactionsImpl(req.query ?? '')
    case 'createTransaction':
      return createTransactionImpl({
        date: req.date,
        description: req.description,
        type: req.type,
        amount: req.amount,
        currency: req.currency
      })
    case 'deleteTransaction':
      deleteTransactionImpl(req.id)
      return true
    case 'listLabOrders':
      return listLabOrdersImpl(req.query ?? '')
    case 'createLabOrder':
      return createLabOrderImpl({
        patientName: req.patientName,
        labName: req.labName,
        workType: req.workType,
        sentDate: req.sentDate,
        status: req.status,
      })
    case 'updateLabOrderStatus':
      updateLabOrderStatusImpl(req.id, req.status)
      return true
    case 'deleteLabOrder':
      deleteLabOrderImpl(req.id)
      return true
    case 'listOrthodonticCases':
      return listOrthodonticCasesImpl(req.patientId, req.status, req.query)
    case 'getOrthodonticCase':
      return getOrthodonticCaseImpl(req.id)
    case 'createOrthodonticCase':
      return createOrthodonticCaseImpl({
        patientId: req.patientId,
        startDate: req.startDate,
        estimatedDurationMonths: req.estimatedDurationMonths,
        status: req.status,
        classification: req.classification,
        applianceType: req.applianceType,
        archType: req.archType,
        extractionPlan: req.extractionPlan,
        chiefComplaint: req.chiefComplaint,
        diagnosisNotes: req.diagnosisNotes,
        totalCost: req.totalCost,
        downPayment: req.downPayment,
        monthlyInstallment: req.monthlyInstallment,
        retainerType: req.retainerType,
      })
    case 'updateOrthodonticCase':
      updateOrthodonticCaseImpl(req.id, {
        startDate: req.startDate,
        estimatedDurationMonths: req.estimatedDurationMonths,
        status: req.status,
        classification: req.classification,
        applianceType: req.applianceType,
        archType: req.archType,
        extractionPlan: req.extractionPlan,
        chiefComplaint: req.chiefComplaint,
        diagnosisNotes: req.diagnosisNotes,
        totalCost: req.totalCost,
        downPayment: req.downPayment,
        monthlyInstallment: req.monthlyInstallment,
        retainerType: req.retainerType,
      })
      return true
    case 'deleteOrthodonticCase':
      deleteOrthodonticCaseImpl(req.id)
      return true
    case 'listOrthodonticVisits':
      return listOrthodonticVisitsImpl(req.caseId)
    case 'createOrthodonticVisit':
      return createOrthodonticVisitImpl({
        caseId: req.caseId,
        visitDate: req.visitDate,
        upperWire: req.upperWire,
        lowerWire: req.lowerWire,
        elasticPrescription: req.elasticPrescription,
        actionsJson: req.actionsJson,
        brokenBracketsCount: req.brokenBracketsCount,
        oralHygieneRating: req.oralHygieneRating,
        painLevel: req.painLevel,
        amountPaid: req.amountPaid,
        notes: req.notes,
        nextAppointmentDate: req.nextAppointmentDate,
      })
    case 'updateOrthodonticVisit':
      updateOrthodonticVisitImpl(req.id, {
        upperWire: req.upperWire,
        lowerWire: req.lowerWire,
        elasticPrescription: req.elasticPrescription,
        actionsJson: req.actionsJson,
        brokenBracketsCount: req.brokenBracketsCount,
        oralHygieneRating: req.oralHygieneRating,
        painLevel: req.painLevel,
        amountPaid: req.amountPaid,
        notes: req.notes,
        nextAppointmentDate: req.nextAppointmentDate,
      })
      return true
    case 'deleteOrthodonticVisit':
      deleteOrthodonticVisitImpl(req.id)
      return true
    case 'getOrthodonticStats':
      return getOrthodonticStatsImpl()

    // Dental Implants
    case 'listDentalImplants':
      return listDentalImplantsImpl(req.patientId, req.status, req.query)
    case 'getDentalImplant':
      return getDentalImplantImpl(req.id)
    case 'createDentalImplant':
      return createDentalImplantImpl(req)
    case 'updateDentalImplant':
      updateDentalImplantImpl(req.id, req)
      return true
    case 'deleteDentalImplant':
      deleteDentalImplantImpl(req.id)
      return true

    // Dental Stock & Inventory
    case 'listInventoryItems':
      return listInventoryItemsImpl(req.category, req.query, req.lowStockOnly, req.expiringSoon)
    case 'getInventoryItem':
      return getInventoryItemImpl(req.id)
    case 'createInventoryItem':
      return createInventoryItemImpl(req)
    case 'updateInventoryItem':
      updateInventoryItemImpl(req.id, req)
      return true
    case 'adjustInventoryQuantity':
      return adjustInventoryQuantityImpl(req.id, req.delta)
    case 'deleteInventoryItem':
      deleteInventoryItemImpl(req.id)
      return true
    case 'getInventoryStats':
      return getInventoryStatsImpl()

    // Treatment Catalog
    case 'listTreatmentCatalog':
      return listTreatmentCatalogImpl(req.category, req.query, req.activeOnly)
    case 'createTreatmentCatalogItem':
      return createTreatmentCatalogItemImpl(req)
    case 'updateTreatmentCatalogItem':
      updateTreatmentCatalogItemImpl(req.id, req)
      return true
    case 'deleteTreatmentCatalogItem':
      deleteTreatmentCatalogItemImpl(req.id)
      return true

    default:
      throw new Error('Unknown db operation')
  }
}
