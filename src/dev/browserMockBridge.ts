import CryptoJS from 'crypto-js'
import type { DentAssistApi, DbInvokePayload } from '@/vite-env'
import type {
  Appointment,
  DashboardStats,
  InvoiceItemRow,
  InvoiceLineExportRow,
  InvoiceListRow,
  Patient,
  PatientImageRow,
  PrescriptionRow,
  TeethStatusRow,
  TreatmentPlan,
  TreatmentPlanStage,
  OrthodonticCase,
  OrthodonticVisit,
  DentalImplant,
  ImplantStatus,
  InventoryItem,
  InventoryCategory,
  InventoryStats,
  TreatmentCatalogItem,
} from '@/types/clinical'
import type { DistributorRow, TransactionRow, LabOrderRow } from '@/services/dbService'

const STORAGE_KEY = 'dentassist-pro-browser-mock-config'
const CLINICAL_KEY = 'dentassist-pro-browser-mock-clinical'
const USERS_KEY = 'dentassist-pro-browser-mock-users'

function readUsers(): { id: number; username: string; role: 'doctor' | 'receptionist'; password: string }[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const defaults: { id: number; username: string; role: 'doctor' | 'receptionist'; password: string }[] = [
    { id: 1, username: 'doctor', role: 'doctor', password: '1234' },
    { id: 2, username: 'reception', role: 'receptionist', password: '5678' },
  ]
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults))
  return defaults
}

function writeUsers(users: unknown[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const DEFAULT_TREATMENT_CATALOG: TreatmentCatalogItem[] = [
  { id: 1, category: 'restorative', code: 'REST-01', name_ar: 'حشوة ضوئية كمبوزيت سطح واحد', name_en: 'Composite Restoration - 1 Surface', default_cost: 120000, description: 'تنظيف النخر وترميم تجميلي كمبوزيت نانو هيبريد مع تخريش وبوندينغ وتلميع نهائي', duration_minutes: 30, is_active: 1, created_at: new Date().toISOString() },
  { id: 2, category: 'restorative', code: 'REST-02', name_ar: 'حشوة ضوئية كمبوزيت سطحين (MO/DO)', name_en: 'Composite Restoration - 2 Surfaces', default_cost: 160000, description: 'ترميم تجويف بين سني مع وضع مسندة مصفوفية وتشكيل نقطة التماس وتلميع', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 3, category: 'restorative', code: 'REST-03', name_ar: 'حشوة ضوئية كمبوزيت 3 أسطح فما فوق (MOD)', name_en: 'Composite Restoration - 3+ Surfaces', default_cost: 220000, description: 'ترميم تجويف واسع وبناء حدبات مع حماية لبية وتشكيل تشريحي دقيق', duration_minutes: 60, is_active: 1, created_at: new Date().toISOString() },
  { id: 4, category: 'restorative', code: 'REST-04', name_ar: 'بناء قلب ودعامة فايبر بوست (Fiber Post & Core)', name_en: 'Fiber Post & Core Build-up', default_cost: 250000, description: 'تفريغ وتجهيز القناة وتثبيت وتد فايبر مقوى بالراتنج وبناء التاج للتهيئة للغلاف', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 5, category: 'endodontics', code: 'ENDO-01', name_ar: 'علاج عصب سن أمامي جلسة واحدة (قناة واحدة)', name_en: 'Anterior Root Canal Treatment - Single Visit', default_cost: 300000, description: 'استئصال اللب، تحضير روتاري آلي، تعقيم بالأمواج، وحشو القناة بالجوتابركا ثلاثي الأبعاد', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 6, category: 'endodontics', code: 'ENDO-02', name_ar: 'علاج عصب ضاحك (قناتين)', name_en: 'Premolar Root Canal Treatment', default_cost: 400000, description: 'تحضير آلي روتاري لقناتين وتطهير كيميائي ميكانيكي وحشو قنوات', duration_minutes: 60, is_active: 1, created_at: new Date().toISOString() },
  { id: 7, category: 'endodontics', code: 'ENDO-03', name_ar: 'علاج عصب ضرس خلفي (3 - 4 أقنية)', name_en: 'Molar Root Canal Treatment', default_cost: 550000, description: 'معالجة لبية كاملة لرحى سفلية أو علوية مع كشف الأقنية الإضافية وحشو حراري', duration_minutes: 75, is_active: 1, created_at: new Date().toISOString() },
  { id: 8, category: 'endodontics', code: 'ENDO-04', name_ar: 'إعادة معالجة لبية لضرس (Endo Retreatment)', name_en: 'Molar Endodontic Retreatment', default_cost: 650000, description: 'إزالة حشوة القنوات القديمة وتجاوز الحصوات وتطهير وحشو قنوات جديد', duration_minutes: 90, is_active: 1, created_at: new Date().toISOString() },
  { id: 9, category: 'prosthetics', code: 'PROST-01', name_ar: 'تاج زيركون كامل تشريحي (Full Zirconia Crown)', name_en: 'Monolithic Zirconia Crown', default_cost: 750000, description: 'تحضير السن مع خط إنهاء واضح وطبعة دقيقة وتركيب تاج زيركون عالي المتانة والجمالية', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 10, category: 'prosthetics', code: 'PROST-02', name_ar: 'تاج إيماكس تجميلي فائق الشفافية (IPS e.max)', name_en: 'IPS e.max Ceramic Crown', default_cost: 900000, description: 'خزف زجاجي فائق الشفافية والجمالية للأسنان الأمامية مع لصق راتنجي محكم', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 11, category: 'prosthetics', code: 'PROST-03', name_ar: 'عدسة أسنان تجميلية فينير (Porcelain Veneer)', name_en: 'Dental Ceramic Veneer', default_cost: 950000, description: 'تحضير سطحي خفيف للوجه الدهليزي وتركيب قشرة خزفية إيماكس لابتسامة هوليوود', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 12, category: 'prosthetics', code: 'PROST-04', name_ar: 'جسر زيركون للسن المفقود (لكل وحدة سنية)', name_en: 'Zirconia Bridge Unit', default_cost: 750000, description: 'تعويض الأسنان المفقودة بجسر متين من الزيركونيا (سعر الوحدة الواحدة)', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 13, category: 'implants', code: 'IMP-01', name_ar: 'زراعة سن جراحية مرحلة أولى (Surgical Placement)', name_en: 'Dental Implant Placement (Stage 1)', default_cost: 2500000, description: 'غرس زرعة تيتانيوم معقمة في العظم وفق بروتوكول جراحي دقيق مع خياطة', duration_minutes: 60, is_active: 1, created_at: new Date().toISOString() },
  { id: 14, category: 'implants', code: 'IMP-02', name_ar: 'كشف زرعة وتركيب دعامة شفاء (Healing Abutment)', name_en: 'Implant Uncovery & Healing Abutment', default_cost: 200000, description: 'كشف الزرعة بعد الاندماج العظمي وتركيب مشكّل اللثة لتجهيز الطبعة', duration_minutes: 30, is_active: 1, created_at: new Date().toISOString() },
  { id: 15, category: 'implants', code: 'IMP-03', name_ar: 'دعامة وتاج زيركون نهائي فوق الزرعة (Implant Crown)', name_en: 'Implant Custom Abutment & Zirconia Crown', default_cost: 1200000, description: 'أخذ طبعة الزرعة بالترانسفير وتركيب الدعامة وتثبيت تاج الزيركون النهائي', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 16, category: 'implants', code: 'IMP-04', name_ar: 'تطعيم عظمي جراحي مع غشاء كولاجين (Bone Graft)', name_en: 'Guided Bone Regeneration (GBR)', default_cost: 800000, description: 'وضع طعم عظمي حول الزرعة أو السن وتغطيته بغشاء ممتص لحفظ الحافة العظمية', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 17, category: 'surgery', code: 'SURG-01', name_ar: 'قلع سن بسيط مع تخدير موضعي', name_en: 'Simple Tooth Extraction', default_cost: 100000, description: 'خلع سن مهدم غير قابل للترميم بلطف مع العناية بالحويصل السني', duration_minutes: 20, is_active: 1, created_at: new Date().toISOString() },
  { id: 18, category: 'surgery', code: 'SURG-02', name_ar: 'قلع جراحي لضرس عقل منطمر عظمياً', name_en: 'Surgical Extraction of Impacted Wisdom Tooth', default_cost: 450000, description: 'شق جراحي وتفريغ عظمي وفصل الجذور وخياطة جراحية لضرس العقل المدفون', duration_minutes: 60, is_active: 1, created_at: new Date().toISOString() },
  { id: 19, category: 'periodontics', code: 'PERIO-01', name_ar: 'تنظيف لثة وتكلسات وتلميع كامل (Scaling & Polishing)', name_en: 'Full Mouth Scaling & Polishing', default_cost: 150000, description: 'إزالة التكلسات فوق وتحت اللثوية بالأمواج الصوتية وتلميع الأسنان بمعجون وقائي', duration_minutes: 30, is_active: 1, created_at: new Date().toISOString() },
  { id: 20, category: 'periodontics', code: 'PERIO-02', name_ar: 'تجريف لثة عميق وتخطيط جذور (Root Planing per quadrant)', name_en: 'Deep Scaling & Root Planing (Quadrant)', default_cost: 200000, description: 'علاج التهابات النسج الداعمة وتجريف الجيوب اللثوية لربع فك', duration_minutes: 45, is_active: 1, created_at: new Date().toISOString() },
  { id: 21, category: 'cosmetic', code: 'COSM-01', name_ar: 'تبييض أسنان عيادي بالضوء/الليزر (In-Office Whitening)', name_en: 'In-Office Power Teeth Whitening', default_cost: 1200000, description: 'تطبيق جل التبييض المركز مع حماية اللثة والتنشيط الضوئي لتفتيح 6-8 درجات', duration_minutes: 60, is_active: 1, created_at: new Date().toISOString() },
  { id: 22, category: 'preventive', code: 'PREV-01', name_ar: 'تطبيق فلورايد وقائي وسادات ميازيب للأطفال (Sealants)', name_en: 'Fluoride Varnish & Pit-Fissure Sealants', default_cost: 80000, description: 'حماية أسنان الأطفال من التسوس بوضع سادات الميازيب والورنيش الفلورايدي', duration_minutes: 20, is_active: 1, created_at: new Date().toISOString() },
]

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 1, name: 'بنج أرتيكائين 4% مع أدرينالين 1:100,000 (Articaine)', category: 'anesthesia', specification: 'علبة 50 كاربولة - Septodont', quantity: 6, unit: 'علبة', min_threshold: 3, cost_per_unit: 145000, distributor_id: 1, expiry_date: '2027-02-28', batch_number: 'LOT-98211', location: 'ثلاجة التخدير', notes: 'مخدر أساسي للعمليات الجراحية والقلع', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'بنج ليدوكائين 2% (Lidocaine 2%)', category: 'anesthesia', specification: 'علبة 50 كاربولة مع أدرينالين', quantity: 4, unit: 'علبة', min_threshold: 2, cost_per_unit: 95000, distributor_id: 1, expiry_date: '2026-11-15', batch_number: 'LOT-44120', location: 'خزانة التخدير', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'إبر بنج قصيرة (Dental Needles 30G Short)', category: 'anesthesia', specification: 'علبة 100 إبرة - غيج 30', quantity: 5, unit: 'علبة', min_threshold: 2, cost_per_unit: 45000, distributor_id: 1, expiry_date: '2027-05-20', batch_number: 'LOT-88123', location: 'درج التخدير', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, name: 'كمبوزيت نانو هيبريد لون A1 (3M Filtek Z250)', category: 'composite', specification: 'سيرنج 4غ لون A1', quantity: 3, unit: 'سيرنج', min_threshold: 2, cost_per_unit: 120000, distributor_id: 1, expiry_date: '2026-12-31', batch_number: 'LOT-Z250-A1', location: 'درج الحشوات', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 5, name: 'كمبوزيت نانو هيبريد لون A2 (3M Filtek Z350 XT)', category: 'composite', specification: 'سيرنج 4غ لون A2 الأكثر طلباً', quantity: 8, unit: 'سيرنج', min_threshold: 4, cost_per_unit: 160000, distributor_id: 1, expiry_date: '2027-03-31', batch_number: 'LOT-Z350-A2', location: 'درج الحشوات', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 6, name: 'كمبوزيت نانو هيبريد لون A3 (3M Filtek Z350 XT)', category: 'composite', specification: 'سيرنج 4غ لون A3', quantity: 5, unit: 'سيرنج', min_threshold: 3, cost_per_unit: 160000, distributor_id: 1, expiry_date: '2027-04-30', batch_number: 'LOT-Z350-A3', location: 'درج الحشوات', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 7, name: 'مبارد روتاري علاج عصب (ProTaper Gold Starter Kit)', category: 'endodontics', specification: 'باكت 6 مبارد روتاري SX-F3 25mm', quantity: 6, unit: 'باكت', min_threshold: 3, cost_per_unit: 190000, distributor_id: 1, expiry_date: '2028-01-01', batch_number: 'LOT-PTG-99', location: 'قسم علاج الجذور', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 8, name: 'قفازات فحص طبية نيتريل مقاس M (Nitrile Gloves M)', category: 'sterilization', specification: 'كرتونة 100 قفاز خالي من البودرة', quantity: 12, unit: 'علبة', min_threshold: 5, cost_per_unit: 55000, distributor_id: 1, expiry_date: '2027-10-31', batch_number: 'LOT-GLV-M', location: 'مستودع التعقيم', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 9, name: 'زرعات سنية Straumann BLX قطر 4.0 طول 10 مم', category: 'surgery_implants', specification: 'زرعة تيتانيوم معقمة مع ناقل Loxim', quantity: 3, unit: 'قطعة', min_threshold: 2, cost_per_unit: 1100000, distributor_id: 2, expiry_date: '2028-12-31', batch_number: 'LOT-STR-940', location: 'خزانة الجراحة', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 10, name: 'زرعات سنية Osstem TSIII قطر 4.5 طول 11.5 مم', category: 'surgery_implants', specification: 'زرعة كورية معقمة مع غطاء غلق', quantity: 4, unit: 'قطعة', min_threshold: 2, cost_per_unit: 650000, distributor_id: 2, expiry_date: '2028-09-30', batch_number: 'LOT-OSS-4511', location: 'خزانة الجراحة', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 11, name: 'طعم عظمي بودرة 0.5cc (Bio-Oss Bovine Bone Graft)', category: 'surgery_implants', specification: 'فيال 0.5 جرام جزيئات صغيرة', quantity: 4, unit: 'فيال', min_threshold: 2, cost_per_unit: 450000, distributor_id: 2, expiry_date: '2027-04-30', batch_number: 'LOT-BONE-05', location: 'خزانة الجراحة', notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

type MockClinical = {
  patients: Patient[]
  nextPatientId: number
  teeth: TeethStatusRow[]
  nextToothId: number
  appointments: Appointment[]
  nextApptId: number
  invoices: InvoiceListRow[]
  invoiceItems: InvoiceItemRow[]
  nextInvId: number
  nextItemId: number
  prescriptions: PrescriptionRow[]
  nextRxId: number
  patientImages: PatientImageRow[]
  nextImgId: number
  distributors: DistributorRow[]
  nextDistributorId: number
  transactions: TransactionRow[]
  nextTrxId: number
  labOrders: LabOrderRow[]
  nextLabOrderId: number
  treatmentPlans: TreatmentPlan[]
  nextTreatmentPlanId: number
  treatmentPlanStages: TreatmentPlanStage[]
  nextTreatmentPlanStageId: number
  dentalImplants: DentalImplant[]
  nextDentalImplantId: number
  inventoryItems: InventoryItem[]
  nextInventoryItemId: number
  treatmentCatalog: TreatmentCatalogItem[]
  nextTreatmentCatalogId: number
  orthodonticCases: OrthodonticCase[]
  nextOrthodonticCaseId: number
  orthodonticVisits: OrthodonticVisit[]
  nextOrthodonticVisitId: number
}

function emptyClinical(): MockClinical {
  return {
    patients: [],
    nextPatientId: 1,
    teeth: [],
    nextToothId: 1,
    appointments: [],
    nextApptId: 1,
    invoices: [],
    invoiceItems: [],
    nextInvId: 1,
    nextItemId: 1,
    prescriptions: [],
    nextRxId: 1,
    patientImages: [],
    nextImgId: 1,
    distributors: [
      {
        id: 1,
        name: 'مستودع الأمل للمواد الطبية',
        company: 'Al-Amal Dental Supplies',
        phone: '0944123456',
        address: 'دمشق - شارع بغداد',
        items: 'بنج أرتيكائين، كمبوزيت 3M، مبارد إندو، قفازات، ومواد طبعة',
        payment_amount: 1500000,
        remaining_amount: 350000,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'مؤسسة الشام لطب الأسنان',
        company: 'Al-Sham Dental Equipment',
        phone: '0933987654',
        address: 'دمشق - المزة',
        items: 'زرعات سنية كورية، قطع تعويضية، عظام وغشاء بيولوجي',
        payment_amount: 3200000,
        remaining_amount: 800000,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'تجهيزات الشرق للأسنان',
        company: 'Orient Dental Tech',
        phone: '0955112233',
        address: 'حلب - العزيزية',
        items: 'قبضات توربين، أدوات جراحية، إبر تخدير، وتجهيزات تعقيم',
        payment_amount: 900000,
        remaining_amount: 150000,
        created_at: new Date().toISOString(),
      },
    ],
    nextDistributorId: 4,
    transactions: [],
    nextTrxId: 1,
    labOrders: [],
    nextLabOrderId: 1,
    treatmentPlans: [],
    nextTreatmentPlanId: 1,
    treatmentPlanStages: [],
    nextTreatmentPlanStageId: 1,
    dentalImplants: [],
    nextDentalImplantId: 1,
    inventoryItems: [...DEFAULT_INVENTORY_ITEMS],
    nextInventoryItemId: DEFAULT_INVENTORY_ITEMS.length + 1,
    treatmentCatalog: [...DEFAULT_TREATMENT_CATALOG],
    nextTreatmentCatalogId: DEFAULT_TREATMENT_CATALOG.length + 1,
    orthodonticCases: [],
    nextOrthodonticCaseId: 1,
    orthodonticVisits: [],
    nextOrthodonticVisitId: 1,
  }
}

function readClinical(): MockClinical {
  try {
    const raw = localStorage.getItem(CLINICAL_KEY)
    if (raw) {
      const p = JSON.parse(raw) as MockClinical
      if (!Array.isArray(p.prescriptions)) p.prescriptions = []
      if (typeof p.nextRxId !== 'number') {
        p.nextRxId =
          (p.prescriptions.length ? Math.max(...p.prescriptions.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.patientImages)) p.patientImages = []
      if (typeof p.nextImgId !== 'number') {
        p.nextImgId =
          (p.patientImages.length ? Math.max(...p.patientImages.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.distributors) || p.distributors.length === 0) {
        p.distributors = [
          {
            id: 1,
            name: 'مستودع الأمل للمواد الطبية',
            company: 'Al-Amal Dental Supplies',
            phone: '0944123456',
            address: 'دمشق - شارع بغداد',
            items: 'بنج أرتيكائين، كمبوزيت 3M، مبارد إندو، قفازات، ومواد طبعة',
            payment_amount: 1500000,
            remaining_amount: 350000,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: 'مؤسسة الشام لطب الأسنان',
            company: 'Al-Sham Dental Equipment',
            phone: '0933987654',
            address: 'دمشق - المزة',
            items: 'زرعات سنية كورية، قطع تعويضية، عظام وغشاء بيولوجي',
            payment_amount: 3200000,
            remaining_amount: 800000,
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            name: 'تجهيزات الشرق للأسنان',
            company: 'Orient Dental Tech',
            phone: '0955112233',
            address: 'حلب - العزيزية',
            items: 'قبضات توربين، أدوات جراحية، إبر تخدير، وتجهيزات تعقيم',
            payment_amount: 900000,
            remaining_amount: 150000,
            created_at: new Date().toISOString(),
          },
        ]
      }
      if (typeof p.nextDistributorId !== 'number') {
        p.nextDistributorId = Math.max(...p.distributors.map((x) => x.id), 0) + 1
      }
      if (!Array.isArray(p.transactions)) p.transactions = []
      if (typeof p.nextTrxId !== 'number') {
        p.nextTrxId = (p.transactions.length ? Math.max(...p.transactions.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.labOrders)) p.labOrders = []
      if (typeof p.nextLabOrderId !== 'number') {
        p.nextLabOrderId = (p.labOrders.length ? Math.max(...p.labOrders.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.treatmentPlans)) p.treatmentPlans = []
      if (typeof p.nextTreatmentPlanId !== 'number') {
        p.nextTreatmentPlanId = (p.treatmentPlans.length ? Math.max(...p.treatmentPlans.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.treatmentPlanStages)) p.treatmentPlanStages = []
      if (typeof p.nextTreatmentPlanStageId !== 'number') {
        p.nextTreatmentPlanStageId = (p.treatmentPlanStages.length ? Math.max(...p.treatmentPlanStages.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.dentalImplants)) p.dentalImplants = []
      if (typeof p.nextDentalImplantId !== 'number') {
        p.nextDentalImplantId = (p.dentalImplants.length ? Math.max(...p.dentalImplants.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.inventoryItems) || p.inventoryItems.length === 0) {
        p.inventoryItems = [...DEFAULT_INVENTORY_ITEMS]
      }
      if (typeof p.nextInventoryItemId !== 'number') {
        p.nextInventoryItemId = (p.inventoryItems.length ? Math.max(...p.inventoryItems.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.treatmentCatalog) || p.treatmentCatalog.length === 0) {
        p.treatmentCatalog = [...DEFAULT_TREATMENT_CATALOG]
      }
      if (typeof p.nextTreatmentCatalogId !== 'number') {
        p.nextTreatmentCatalogId = (p.treatmentCatalog.length ? Math.max(...p.treatmentCatalog.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.orthodonticCases)) p.orthodonticCases = []
      if (typeof p.nextOrthodonticCaseId !== 'number') {
        p.nextOrthodonticCaseId = (p.orthodonticCases.length ? Math.max(...p.orthodonticCases.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.orthodonticVisits)) p.orthodonticVisits = []
      if (typeof p.nextOrthodonticVisitId !== 'number') {
        p.nextOrthodonticVisitId = (p.orthodonticVisits.length ? Math.max(...p.orthodonticVisits.map((x) => x.id), 0) : 0) + 1
      }
      for (const a of p.appointments) {
        const row = a as Appointment & { patient_phone?: string | null }
        if (row.patient_phone === undefined) {
          const pt = p.patients.find((x) => x.id === row.patient_id)
          row.patient_phone = pt?.phone ?? null
        }
      }
      for (const t of p.teeth) {
        if ((t as TeethStatusRow).preparation_depth_mm === undefined) {
          ;(t as TeethStatusRow).preparation_depth_mm = null
        }
      }
      return p
    }
  } catch {
    /* ignore */
  }
  const db = emptyClinical()
  const now = new Date().toISOString()
  db.patients.push({
    id: db.nextPatientId++,
    first_name: 'أحمد',
    last_name: 'تجريبي',
    dob: '1990-01-15',
    gender: 'male',
    phone: '0500000000',
    medical_history: '',
    created_at: now,
  })
  localStorage.setItem(CLINICAL_KEY, JSON.stringify(db))
  return db
}

function writeClinical(c: MockClinical): void {
  localStorage.setItem(CLINICAL_KEY, JSON.stringify(c))
}

function patientName(pt: Patient): { first: string; last: string } {
  return { first: pt.first_name, last: pt.last_name }
}

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, string>
  } catch {
    /* ignore */
  }
  const machineId = `browser-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())}`
  const initial: Record<string, string> = {
    machine_id: machineId,
    first_launch_date: new Date().toISOString(),
    license_status: 'active',
    language: 'ar',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

function writeStore(store: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function handleClinical(payload: DbInvokePayload, c: MockClinical): unknown {
  switch (payload.op) {
    case 'listPatients': {
      const q = (payload.query ?? '').trim().toLowerCase()
      let rows = [...c.patients]
      if (q) {
        rows = rows.filter(
          (p) =>
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            (p.phone ?? '').toLowerCase().includes(q),
        )
      }
      rows.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
      return rows
    }
    case 'getPatient':
      return c.patients.find((p) => p.id === payload.id) ?? null
    case 'createPatient': {
      const now = new Date().toISOString()
      const id = c.nextPatientId++
      c.patients.push({
        id,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        dob: payload.dob,
        gender: payload.gender,
        phone: payload.phone?.trim() || null,
        medical_history: payload.medicalHistory,
        created_at: now,
      })
      writeClinical(c)
      return id
    }
    case 'updatePatient': {
      const p = c.patients.find((x) => x.id === payload.id)
      if (!p) throw new Error('Patient not found')
      p.first_name = payload.firstName.trim()
      p.last_name = payload.lastName.trim()
      p.dob = payload.dob
      p.gender = payload.gender
      p.phone = payload.phone?.trim() || null
      p.medical_history = payload.medicalHistory
      writeClinical(c)
      return true
    }
    case 'deletePatient': {
      c.patients = c.patients.filter((p) => p.id !== payload.id)
      c.teeth = c.teeth.filter((t) => t.patient_id !== payload.id)
      c.appointments = c.appointments.filter((a) => a.patient_id !== payload.id)
      const invIds = c.invoices.filter((i) => i.patient_id === payload.id).map((i) => i.id)
      c.invoices = c.invoices.filter((i) => i.patient_id !== payload.id)
      c.invoiceItems = c.invoiceItems.filter((it) => !invIds.includes(it.invoice_id))
      c.prescriptions = c.prescriptions.filter((pr) => pr.patient_id !== payload.id)
      c.patientImages = c.patientImages.filter((im) => im.patient_id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listTeethStatuses':
      return c.teeth.filter((t) => t.patient_id === payload.patientId)
    case 'upsertTeethStatus': {
      const now = new Date().toISOString()
      const depth = payload.preparationDepthMm
      const idx = c.teeth.findIndex(
        (t) => t.patient_id === payload.patientId && t.tooth_number === payload.toothNumber,
      )
      if (idx >= 0) {
        c.teeth[idx] = {
          ...c.teeth[idx],
          status: payload.status,
          notes: payload.notes,
          preparation_depth_mm: depth,
          updated_at: now,
        }
      } else {
        c.teeth.push({
          id: c.nextToothId++,
          patient_id: payload.patientId,
          tooth_number: payload.toothNumber,
          status: payload.status,
          notes: payload.notes,
          preparation_depth_mm: depth,
          updated_at: now,
        })
      }
      writeClinical(c)
      return c.teeth.find((t) => t.patient_id === payload.patientId && t.tooth_number === payload.toothNumber)!
    }
    case 'listAppointments': {
      let rows = c.appointments.slice()
      if (payload.fromIso) rows = rows.filter((a) => a.start_time >= payload.fromIso!)
      if (payload.toIso) rows = rows.filter((a) => a.start_time <= payload.toIso!)
      rows.sort((a, b) => a.start_time.localeCompare(b.start_time))
      return rows
    }
    case 'createAppointment': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      const id = c.nextApptId++
      c.appointments.push({
        id,
        patient_id: payload.patientId,
        start_time: payload.startTime,
        end_time: payload.endTime,
        status: payload.status,
        notes: payload.notes,
        patient_first_name: first,
        patient_last_name: last,
        patient_phone: pt.phone ?? null,
      })
      writeClinical(c)
      return id
    }
    case 'updateAppointment': {
      const a = c.appointments.find((x) => x.id === payload.id)
      if (!a) throw new Error('Appointment not found')
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      a.patient_id = payload.patientId
      a.start_time = payload.startTime
      a.end_time = payload.endTime
      a.status = payload.status
      a.notes = payload.notes
      a.patient_first_name = first
      a.patient_last_name = last
      a.patient_phone = pt.phone ?? null
      writeClinical(c)
      return true
    }
    case 'deleteAppointment': {
      c.appointments = c.appointments.filter((a) => a.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listInvoices': {
      const lim = Math.min(payload.limit ?? 100, 100_000)
      let list = [...c.invoices]
      if (payload.patientId != null && Number.isFinite(payload.patientId)) {
        list = list.filter((i) => i.patient_id === payload.patientId)
      }
      return list.sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id).slice(0, lim)
    }
    case 'listInvoiceLinesExport': {
      const list = [...c.invoices].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      const out: InvoiceLineExportRow[] = []
      for (const inv of list) {
        const items = c.invoiceItems.filter((it) => it.invoice_id === inv.id).sort((a, b) => a.id - b.id)
        for (const ii of items) {
          out.push({
            invoice_id: inv.id,
            invoice_date: inv.date,
            invoice_status: inv.status,
            invoice_total: inv.total_amount,
            patient_id: inv.patient_id,
            patient_first_name: inv.patient_first_name,
            patient_last_name: inv.patient_last_name,
            line_id: ii.id,
            description: ii.description,
            tooth_number: ii.tooth_number,
            line_price: ii.price,
          })
        }
      }
      return out
    }
    case 'getInvoice': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) return null
      const items = c.invoiceItems.filter((it) => it.invoice_id === inv.id).sort((a, b) => a.id - b.id)
      return { invoice: inv, items }
    }
    case 'createInvoice': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      const total = payload.items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
      const id = c.nextInvId++
      c.invoices.push({
        id,
        patient_id: payload.patientId,
        date: payload.date,
        total_amount: total,
        status: payload.status,
        patient_first_name: first,
        patient_last_name: last,
      })
      for (const it of payload.items) {
        c.invoiceItems.push({
          id: c.nextItemId++,
          invoice_id: id,
          description: it.description.trim(),
          tooth_number: it.toothNumber ?? null,
          price: it.price,
        })
      }
      writeClinical(c)
      return id
    }
    case 'updateInvoiceStatus': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) throw new Error('Invoice not found')
      inv.status = payload.status
      writeClinical(c)
      return true
    }
    case 'updateInvoiceWithItems': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) throw new Error('Invoice not found')
      c.invoiceItems = c.invoiceItems.filter((it) => it.invoice_id !== payload.id)
      const total = payload.items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
      inv.date = payload.date
      inv.status = payload.status
      inv.total_amount = total
      for (const it of payload.items) {
        c.invoiceItems.push({
          id: c.nextItemId++,
          invoice_id: payload.id,
          description: it.description.trim(),
          tooth_number: it.toothNumber ?? null,
          price: it.price,
        })
      }
      writeClinical(c)
      return true
    }
    case 'deleteInvoice': {
      c.invoices = c.invoices.filter((i) => i.id !== payload.id)
      c.invoiceItems = c.invoiceItems.filter((it) => it.invoice_id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listPrescriptions': {
      return [...c.prescriptions]
        .filter((pr) => pr.patient_id === payload.patientId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    }
    case 'createPrescription': {
      const u = readUsers().find((x) => x.id === payload.doctorId)
      if (!u) throw new Error('User not found')
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const id = c.nextRxId++
      c.prescriptions.push({
        id,
        patient_id: payload.patientId,
        doctor_id: payload.doctorId,
        date: payload.date,
        medications_json: payload.medicationsJson,
        notes: payload.notes,
        doctor_username: u.username,
      })
      writeClinical(c)
      return id
    }
    case 'updatePrescription': {
      const pr = c.prescriptions.find((x) => x.id === payload.id)
      if (!pr) throw new Error('Prescription not found')
      const u = readUsers().find((x) => x.id === payload.doctorId)
      if (!u) throw new Error('User not found')
      pr.patient_id = payload.patientId
      pr.doctor_id = payload.doctorId
      pr.date = payload.date
      pr.medications_json = payload.medicationsJson
      pr.notes = payload.notes
      pr.doctor_username = u.username
      writeClinical(c)
      return true
    }
    case 'deletePrescription': {
      c.prescriptions = c.prescriptions.filter((p) => p.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listPatientImages': {
      return [...c.patientImages]
        .filter((im) => im.patient_id === payload.patientId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    }
    case 'createPatientImage': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const id = c.nextImgId++
      c.patientImages.push({
        id,
        patient_id: payload.patientId,
        image_path: payload.imagePath,
        type: payload.type,
        date: payload.date,
        notes: payload.notes,
        tooth_number: payload.toothNumber,
      })
      writeClinical(c)
      return id
    }
    case 'deletePatientImage': {
      c.patientImages = c.patientImages.filter((im) => im.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'getDailyReports': {
      const byDay = new Map<string, { patients: Set<number>; income: number }>()
      for (const inv of c.invoices.filter((i) => i.status === 'paid')) {
        const day = inv.date.slice(0, 10)
        const cur = byDay.get(day) ?? { patients: new Set<number>(), income: 0 }
        cur.patients.add(inv.patient_id)
        cur.income += inv.total_amount
        byDay.set(day, cur)
      }
      const rows = [...byDay.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 100)
        .map(([date, v], i) => ({
          id: `REP-${String(i + 1).padStart(3, '0')}`,
          date,
          patientsCount: v.patients.size,
          income: v.income,
          expense: 0,
          profit: v.income,
        }))
      return rows
    }
    case 'getDashboardStats': {
      const today = new Date().toISOString().slice(0, 10)
      const month = new Date().toISOString().slice(0, 7)
      let revenueToday = 0
      let revenueMonth = 0
      let pendingDebt = 0
      for (const inv of c.invoices) {
        if (inv.date.slice(0, 10) === today) revenueToday += inv.total_amount
        if (inv.date.slice(0, 7) === month) revenueMonth += inv.total_amount
        if (inv.status === 'pending') pendingDebt += inv.total_amount
      }
      const apt = { completed: 0, cancelled: 0, scheduled: 0 }
      for (const a of c.appointments) {
        if (a.status === 'completed') apt.completed++
        else if (a.status === 'cancelled') apt.cancelled++
        else if (a.status === 'scheduled') apt.scheduled++
      }
      const counts = new Map<string, number>()
      for (const it of c.invoiceItems) {
        const d = it.description.trim() || '—'
        counts.set(d, (counts.get(d) ?? 0) + 1)
      }
      const topProcedures = [...counts.entries()]
        .map(([description, count]) => ({ description, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 8)
      const out: DashboardStats = {
        revenueToday,
        revenueMonth,
        appointmentsCompleted: apt.completed,
        appointmentsCancelled: apt.cancelled,
        appointmentsScheduled: apt.scheduled,
        pendingDebt,
        topProcedures,
      }
      return out
    }

    // Distributors
    case 'listDistributors': {
      const q = (payload.query ?? '').trim().toLowerCase()
      let rows = [...c.distributors]
      if (q) {
        rows = rows.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.company.toLowerCase().includes(q) ||
            (d.items ?? '').toLowerCase().includes(q) ||
            (d.phone ?? '').toLowerCase().includes(q),
        )
      }
      return rows
    }
    case 'createDistributor': {
      const id = c.nextDistributorId++
      const newD: DistributorRow = {
        id,
        name: payload.name.trim(),
        company: payload.company.trim(),
        phone: payload.phone?.trim() ?? '',
        address: payload.address?.trim() ?? '',
        items: payload.items?.trim() ?? '',
        payment_amount: payload.paymentAmount ?? 0,
        remaining_amount: payload.remainingAmount ?? 0,
        created_at: new Date().toISOString(),
      }
      c.distributors.unshift(newD)
      writeClinical(c)
      return id
    }
    case 'updateDistributor': {
      const d = c.distributors.find((x) => x.id === payload.id)
      if (d) {
        d.name = payload.name.trim()
        d.company = payload.company.trim()
        d.phone = payload.phone?.trim() ?? ''
        d.address = payload.address?.trim() ?? ''
        d.items = payload.items?.trim() ?? ''
        d.payment_amount = payload.paymentAmount ?? 0
        d.remaining_amount = payload.remainingAmount ?? 0
        writeClinical(c)
      }
      return true
    }
    case 'deleteDistributor': {
      c.distributors = c.distributors.filter((x) => x.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Transactions (Cashbox)
    case 'listTransactions': {
      const q = (payload.query ?? '').trim().toLowerCase()
      let rows = [...c.transactions]
      if (q) {
        rows = rows.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.trx_id.toLowerCase().includes(q),
        )
      }
      return rows
    }
    case 'createTransaction': {
      const id = c.nextTrxId++
      const trxId = `TRX-${String(id).padStart(4, '0')}`
      const newTrx: TransactionRow = {
        id,
        trx_id: trxId,
        date: payload.date,
        description: payload.description.trim(),
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency || 'SYP',
        created_at: new Date().toISOString(),
      }
      c.transactions.unshift(newTrx)
      writeClinical(c)
      return id
    }
    case 'deleteTransaction': {
      c.transactions = c.transactions.filter((t) => t.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Lab Orders
    case 'listLabOrders': {
      const q = (payload.query ?? '').trim().toLowerCase()
      let rows = [...c.labOrders]
      if (q) {
        rows = rows.filter(
          (l) =>
            l.patient_name.toLowerCase().includes(q) ||
            l.lab_name.toLowerCase().includes(q) ||
            l.work_type.toLowerCase().includes(q) ||
            l.order_id.toLowerCase().includes(q),
        )
      }
      return rows
    }
    case 'createLabOrder': {
      const id = c.nextLabOrderId++
      const orderId = `LAB-${String(id).padStart(4, '0')}`
      const newOrder: LabOrderRow = {
        id,
        order_id: orderId,
        patient_name: payload.patientName.trim(),
        lab_name: payload.labName.trim(),
        work_type: payload.workType.trim(),
        sent_date: payload.sentDate,
        status: payload.status,
        created_at: new Date().toISOString(),
      }
      c.labOrders.unshift(newOrder)
      writeClinical(c)
      return id
    }
    case 'updateLabOrderStatus': {
      const order = c.labOrders.find((l) => l.id === payload.id)
      if (order) {
        order.status = payload.status
        writeClinical(c)
      }
      return true
    }
    case 'deleteLabOrder': {
      c.labOrders = c.labOrders.filter((l) => l.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Treatment Plans
    case 'listTreatmentPlans': {
      return [...c.treatmentPlans]
        .filter((tp) => tp.patient_id === payload.patientId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    }
    case 'createTreatmentPlan': {
      const now = new Date().toISOString()
      const id = c.nextTreatmentPlanId++
      const newPlan: TreatmentPlan = {
        id,
        patient_id: payload.patientId,
        title: payload.title.trim(),
        diagnosis: payload.diagnosis?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: 'draft',
        accepted_by_name: null,
        signature_text: null,
        accepted_at: null,
        created_at: now,
        updated_at: now,
      }
      c.treatmentPlans.unshift(newPlan)
      writeClinical(c)
      return id
    }
    case 'updateTreatmentPlan': {
      const tp = c.treatmentPlans.find((x) => x.id === payload.id)
      if (tp) {
        tp.title = payload.title.trim()
        tp.diagnosis = payload.diagnosis?.trim() || null
        tp.notes = payload.notes?.trim() || null
        tp.status = payload.status
        tp.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'acceptTreatmentPlan': {
      const tp = c.treatmentPlans.find((x) => x.id === payload.id)
      if (tp) {
        tp.status = 'accepted'
        tp.accepted_by_name = payload.acceptedByName.trim()
        tp.signature_text = payload.signatureText.trim()
        tp.accepted_at = new Date().toISOString()
        tp.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'deleteTreatmentPlan': {
      c.treatmentPlans = c.treatmentPlans.filter((x) => x.id !== payload.id)
      c.treatmentPlanStages = c.treatmentPlanStages.filter((s) => s.plan_id !== payload.id)
      writeClinical(c)
      return true
    }

    // Treatment Plan Stages
    case 'listTreatmentPlanStages': {
      let rows = c.treatmentPlanStages.filter((s) => s.plan_id === payload.planId)
      rows.sort((a, b) => a.stage_order - b.stage_order || a.id - b.id)
      return rows.map((s) => {
        let apptStart: string | null = null
        if (s.appointment_id) {
          const appt = c.appointments.find((a) => a.id === s.appointment_id)
          if (appt) apptStart = appt.start_time
        }
        return { ...s, appointment_start_time: apptStart }
      })
    }
    case 'createTreatmentPlanStage': {
      const now = new Date().toISOString()
      const id = c.nextTreatmentPlanStageId++
      const newStage: TreatmentPlanStage = {
        id,
        plan_id: payload.planId,
        stage_order: payload.stageOrder,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        estimated_cost: payload.estimatedCost,
        paid_amount: payload.paidAmount,
        status: payload.status,
        appointment_id: payload.appointmentId,
        appointment_start_time: null,
        due_date: payload.dueDate,
        created_at: now,
        updated_at: now,
      }
      c.treatmentPlanStages.push(newStage)
      writeClinical(c)
      return id
    }
    case 'updateTreatmentPlanStage': {
      const s = c.treatmentPlanStages.find((x) => x.id === payload.id)
      if (s) {
        s.stage_order = payload.stageOrder
        s.title = payload.title.trim()
        s.description = payload.description?.trim() || null
        s.estimated_cost = payload.estimatedCost
        s.paid_amount = payload.paidAmount
        s.status = payload.status
        s.appointment_id = payload.appointmentId
        s.due_date = payload.dueDate
        s.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'deleteTreatmentPlanStage': {
      c.treatmentPlanStages = c.treatmentPlanStages.filter((x) => x.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Dental Implants
    case 'listDentalImplants': {
      let list = [...c.dentalImplants]
      if (payload.patientId != null && Number.isFinite(payload.patientId)) {
        list = list.filter((i) => i.patient_id === payload.patientId)
      }
      if (payload.status) {
        list = list.filter((i) => i.status === payload.status)
      }
      if (payload.query) {
        const q = payload.query.toLowerCase().trim()
        list = list.filter(
          (i) =>
            i.brand.toLowerCase().includes(q) ||
            (i.model && i.model.toLowerCase().includes(q)) ||
            String(i.tooth_number).includes(q) ||
            (i.lot_number && i.lot_number.toLowerCase().includes(q)),
        )
      }
      list.sort((a, b) => b.placement_date.localeCompare(a.placement_date) || b.id - a.id)
      return list.map((imp) => {
        const pt = c.patients.find((p) => p.id === imp.patient_id)
        return {
          ...imp,
          patient_name: pt ? `${pt.first_name} ${pt.last_name}` : '—',
          patient_phone: pt?.phone ?? null,
        }
      })
    }
    case 'getDentalImplant': {
      const imp = c.dentalImplants.find((i) => i.id === payload.id)
      if (!imp) return null
      const pt = c.patients.find((p) => p.id === imp.patient_id)
      return {
        ...imp,
        patient_name: pt ? `${pt.first_name} ${pt.last_name}` : '—',
        patient_phone: pt?.phone ?? null,
      }
    }
    case 'createDentalImplant': {
      const now = new Date().toISOString()
      const id = c.nextDentalImplantId++
      const newImp: DentalImplant = {
        id,
        patient_id: payload.patientId,
        tooth_number: payload.toothNumber,
        brand: payload.brand.trim(),
        model: payload.model?.trim() || null,
        diameter_mm: payload.diameterMm,
        length_mm: payload.lengthMm,
        lot_number: payload.lotNumber?.trim() || null,
        serial_number: payload.serialNumber?.trim() || null,
        insertion_torque_ncm: payload.insertionTorqueNcm ?? null,
        isq_value: payload.isqValue ?? null,
        bone_graft_type: payload.boneGraftType?.trim() || null,
        membrane_used: payload.membraneUsed ?? 0,
        sinus_lift: payload.sinusLift?.trim() || null,
        placement_date: payload.placementDate,
        healing_period_months: payload.healingPeriodMonths ?? 3,
        target_loading_date: payload.targetLoadingDate || null,
        healing_abutment_date: payload.healingAbutmentDate || null,
        healing_abutment_size: payload.healingAbutmentSize?.trim() || null,
        final_loading_date: payload.finalLoadingDate || null,
        prosthetic_type: payload.prostheticType?.trim() || null,
        status: (payload.status as ImplantStatus) || 'placed',
        notes: payload.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      }
      c.dentalImplants.unshift(newImp)
      writeClinical(c)
      return id
    }
    case 'updateDentalImplant': {
      const imp = c.dentalImplants.find((i) => i.id === payload.id)
      if (imp) {
        if (payload.toothNumber != null) imp.tooth_number = payload.toothNumber
        if (payload.brand != null) imp.brand = payload.brand.trim()
        if (payload.model !== undefined) imp.model = payload.model?.trim() || null
        if (payload.diameterMm != null) imp.diameter_mm = payload.diameterMm
        if (payload.lengthMm != null) imp.length_mm = payload.lengthMm
        if (payload.lotNumber !== undefined) imp.lot_number = payload.lotNumber?.trim() || null
        if (payload.serialNumber !== undefined) imp.serial_number = payload.serialNumber?.trim() || null
        if (payload.insertionTorqueNcm !== undefined) imp.insertion_torque_ncm = payload.insertionTorqueNcm
        if (payload.isqValue !== undefined) imp.isq_value = payload.isqValue
        if (payload.boneGraftType !== undefined) imp.bone_graft_type = payload.boneGraftType?.trim() || null
        if (payload.membraneUsed !== undefined) imp.membrane_used = payload.membraneUsed
        if (payload.sinusLift !== undefined) imp.sinus_lift = payload.sinusLift?.trim() || null
        if (payload.placementDate != null) imp.placement_date = payload.placementDate
        if (payload.healingPeriodMonths != null) imp.healing_period_months = payload.healingPeriodMonths
        if (payload.targetLoadingDate !== undefined) imp.target_loading_date = payload.targetLoadingDate
        if (payload.healingAbutmentDate !== undefined) imp.healing_abutment_date = payload.healingAbutmentDate
        if (payload.healingAbutmentSize !== undefined) imp.healing_abutment_size = payload.healingAbutmentSize
        if (payload.finalLoadingDate !== undefined) imp.final_loading_date = payload.finalLoadingDate
        if (payload.prostheticType !== undefined) imp.prosthetic_type = payload.prostheticType
        if (payload.status != null) imp.status = payload.status as ImplantStatus
        if (payload.notes !== undefined) imp.notes = payload.notes?.trim() || null
        imp.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'deleteDentalImplant': {
      c.dentalImplants = c.dentalImplants.filter((i) => i.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Dental Stock & Inventory
    case 'listInventoryItems': {
      let list = [...c.inventoryItems]
      if (payload.category) {
        list = list.filter((i) => i.category === payload.category)
      }
      if (payload.query) {
        const q = payload.query.toLowerCase().trim()
        list = list.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.specification && i.specification.toLowerCase().includes(q)) ||
            (i.batch_number && i.batch_number.toLowerCase().includes(q)) ||
            (i.location && i.location.toLowerCase().includes(q)),
        )
      }
      const now = new Date()
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const mapped = list.map((item) => {
        const isLow = item.quantity <= item.min_threshold
        let isExp = false
        let isNear = false
        if (item.expiry_date) {
          const d = new Date(item.expiry_date)
          if (d < now) isExp = true
          else if (d <= in30Days) isNear = true
        }
        const dist = item.distributor_id ? c.distributors.find((d) => d.id === item.distributor_id) : null
        return {
          ...item,
          is_low_stock: isLow,
          is_expired: isExp,
          is_near_expiry: isNear,
          distributor_name: dist?.name,
          distributor_company: dist?.company,
          distributor_phone: dist?.phone,
        }
      })
      let out = mapped
      if (payload.lowStockOnly) out = out.filter((i) => i.is_low_stock)
      if (payload.expiringSoon) out = out.filter((i) => i.is_expired || i.is_near_expiry)
      return out.sort((a, b) => a.name.localeCompare(b.name))
    }
    case 'getInventoryItem': {
      const item = c.inventoryItems.find((i) => i.id === payload.id)
      if (!item) return null
      const dist = item.distributor_id ? c.distributors.find((d) => d.id === item.distributor_id) : null
      return {
        ...item,
        distributor_name: dist?.name,
        distributor_company: dist?.company,
        distributor_phone: dist?.phone,
      }
    }
    case 'createInventoryItem': {
      const now = new Date().toISOString()
      const id = c.nextInventoryItemId++
      const newItem: InventoryItem = {
        id,
        name: payload.name.trim(),
        category: payload.category as InventoryCategory,
        specification: payload.specification?.trim() || null,
        quantity: payload.quantity,
        unit: payload.unit || 'قطعة',
        min_threshold: payload.minThreshold ?? 5,
        cost_per_unit: payload.costPerUnit ?? 0,
        distributor_id: payload.distributorId ?? null,
        expiry_date: payload.expiryDate || null,
        batch_number: payload.batchNumber?.trim() || null,
        location: payload.location?.trim() || null,
        notes: payload.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      }
      c.inventoryItems.unshift(newItem)
      writeClinical(c)
      return id
    }
    case 'updateInventoryItem': {
      const it = c.inventoryItems.find((i) => i.id === payload.id)
      if (it) {
        if (payload.name != null) it.name = payload.name.trim()
        if (payload.category != null) it.category = payload.category as InventoryCategory
        if (payload.specification !== undefined) it.specification = payload.specification?.trim() || null
        if (payload.quantity != null) it.quantity = payload.quantity
        if (payload.unit != null) it.unit = payload.unit
        if (payload.minThreshold != null) it.min_threshold = payload.minThreshold
        if (payload.costPerUnit != null) it.cost_per_unit = payload.costPerUnit
        if (payload.distributorId !== undefined) it.distributor_id = payload.distributorId
        if (payload.expiryDate !== undefined) it.expiry_date = payload.expiryDate
        if (payload.batchNumber !== undefined) it.batch_number = payload.batchNumber?.trim() || null
        if (payload.location !== undefined) it.location = payload.location?.trim() || null
        if (payload.notes !== undefined) it.notes = payload.notes?.trim() || null
        it.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'adjustInventoryQuantity': {
      const it = c.inventoryItems.find((i) => i.id === payload.id)
      if (!it) throw new Error('Item not found')
      it.quantity = Math.max(0, it.quantity + payload.delta)
      it.updated_at = new Date().toISOString()
      writeClinical(c)
      const isLow = it.quantity <= it.min_threshold
      return { ...it, is_low_stock: isLow }
    }
    case 'deleteInventoryItem': {
      c.inventoryItems = c.inventoryItems.filter((i) => i.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'getInventoryStats': {
      const now = new Date()
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      let lowStockCount = 0
      let expiringCount = 0
      let totalEstimatedValue = 0
      for (const item of c.inventoryItems) {
        totalEstimatedValue += item.quantity * item.cost_per_unit
        if (item.quantity <= item.min_threshold) lowStockCount++
        if (item.expiry_date) {
          const d = new Date(item.expiry_date)
          if (d <= in30Days) expiringCount++
        }
      }
      const out: InventoryStats = {
        totalItems: c.inventoryItems.length,
        lowStockCount,
        expiringCount,
        totalEstimatedValue,
      }
      return out
    }

    // Treatment Catalog
    case 'listTreatmentCatalog': {
      let list = [...c.treatmentCatalog]
      if (payload.category) {
        list = list.filter((i) => i.category === payload.category)
      }
      if (payload.activeOnly) {
        list = list.filter((i) => i.is_active === 1)
      }
      if (payload.query) {
        const q = payload.query.toLowerCase().trim()
        list = list.filter(
          (i) =>
            i.name_ar.toLowerCase().includes(q) ||
            i.name_en.toLowerCase().includes(q) ||
            (i.code && i.code.toLowerCase().includes(q)),
        )
      }
      return list.sort((a, b) => a.id - b.id)
    }
    case 'createTreatmentCatalogItem': {
      const now = new Date().toISOString()
      const id = c.nextTreatmentCatalogId++
      const newItem: TreatmentCatalogItem = {
        id,
        category: payload.category,
        code: payload.code?.trim() || null,
        name_ar: payload.nameAr.trim(),
        name_en: payload.nameEn.trim(),
        default_cost: payload.defaultCost,
        description: payload.description?.trim() || null,
        duration_minutes: payload.durationMinutes ?? 30,
        is_active: payload.isActive ?? 1,
        created_at: now,
      }
      c.treatmentCatalog.push(newItem)
      writeClinical(c)
      return id
    }
    case 'updateTreatmentCatalogItem': {
      const it = c.treatmentCatalog.find((i) => i.id === payload.id)
      if (it) {
        if (payload.category != null) it.category = payload.category
        if (payload.code !== undefined) it.code = payload.code?.trim() || null
        if (payload.nameAr != null) it.name_ar = payload.nameAr.trim()
        if (payload.nameEn != null) it.name_en = payload.nameEn.trim()
        if (payload.defaultCost != null) it.default_cost = payload.defaultCost
        if (payload.description !== undefined) it.description = payload.description?.trim() || null
        if (payload.durationMinutes != null) it.duration_minutes = payload.durationMinutes
        if (payload.isActive != null) it.is_active = payload.isActive
        writeClinical(c)
      }
      return true
    }
    case 'deleteTreatmentCatalogItem': {
      c.treatmentCatalog = c.treatmentCatalog.filter((i) => i.id !== payload.id)
      writeClinical(c)
      return true
    }

    // Orthodontic Cases & Visits
    case 'listOrthodonticCases': {
      let list = [...c.orthodonticCases]
      if (payload.patientId != null && Number.isFinite(payload.patientId)) {
        list = list.filter((cs) => cs.patient_id === payload.patientId)
      }
      if (payload.status) {
        list = list.filter((cs) => cs.status === payload.status)
      }
      if (payload.query) {
        const q = payload.query.toLowerCase().trim()
        list = list.filter((cs) => cs.case_number.toLowerCase().includes(q))
      }
      list.sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id)
      return list.map((cs) => {
        const pt = c.patients.find((p) => p.id === cs.patient_id)
        const visits = c.orthodonticVisits.filter((v) => v.case_id === cs.id)
        const totalPaid = visits.reduce((sum, v) => sum + (v.amount_paid || 0), cs.down_payment || 0)
        return {
          ...cs,
          patient_first_name: pt?.first_name,
          patient_last_name: pt?.last_name,
          patient_phone: pt?.phone,
          visits_count: visits.length,
          last_visit_date: visits.length ? visits[visits.length - 1].visit_date : null,
          total_paid: totalPaid,
          remaining_balance: Math.max(0, cs.total_cost - totalPaid),
        }
      })
    }
    case 'getOrthodonticCase': {
      const cs = c.orthodonticCases.find((x) => x.id === payload.id)
      if (!cs) return null
      const pt = c.patients.find((p) => p.id === cs.patient_id)
      const visits = c.orthodonticVisits.filter((v) => v.case_id === cs.id)
      const totalPaid = visits.reduce((sum, v) => sum + (v.amount_paid || 0), cs.down_payment || 0)
      return {
        ...cs,
        patient_first_name: pt?.first_name,
        patient_last_name: pt?.last_name,
        patient_phone: pt?.phone,
        visits_count: visits.length,
        last_visit_date: visits.length ? visits[visits.length - 1].visit_date : null,
        total_paid: totalPaid,
        remaining_balance: Math.max(0, cs.total_cost - totalPaid),
      }
    }
    case 'createOrthodonticCase': {
      const now = new Date().toISOString()
      const id = c.nextOrthodonticCaseId++
      const caseNumber = `ORTHO-${String(id).padStart(4, '0')}`
      const newCase: OrthodonticCase = {
        id,
        patient_id: payload.patientId,
        case_number: caseNumber,
        start_date: payload.startDate,
        estimated_duration_months: payload.estimatedDurationMonths ?? 18,
        status: payload.status ?? 'active',
        classification: (payload.classification as any) || 'class_1',
        appliance_type: (payload.applianceType as any) || 'metal',
        arch_type: payload.archType ?? 'both',
        extraction_plan: payload.extractionPlan?.trim() || null,
        chief_complaint: payload.chiefComplaint?.trim() || null,
        diagnosis_notes: payload.diagnosisNotes?.trim() || null,
        total_cost: payload.totalCost ?? 0,
        down_payment: payload.downPayment ?? 0,
        monthly_installment: payload.monthlyInstallment ?? 0,
        retainer_type: payload.retainerType?.trim() || null,
        created_at: now,
        updated_at: now,
      }
      c.orthodonticCases.unshift(newCase)
      writeClinical(c)
      return id
    }
    case 'updateOrthodonticCase': {
      const cs = c.orthodonticCases.find((x) => x.id === payload.id)
      if (cs) {
        if (payload.startDate != null) cs.start_date = payload.startDate
        if (payload.estimatedDurationMonths != null) cs.estimated_duration_months = payload.estimatedDurationMonths
        if (payload.status != null) cs.status = payload.status
        if (payload.classification != null) cs.classification = payload.classification as any
        if (payload.applianceType != null) cs.appliance_type = payload.applianceType as any
        if (payload.archType != null) cs.arch_type = payload.archType
        if (payload.extractionPlan !== undefined) cs.extraction_plan = payload.extractionPlan
        if (payload.chiefComplaint !== undefined) cs.chief_complaint = payload.chiefComplaint
        if (payload.diagnosisNotes !== undefined) cs.diagnosis_notes = payload.diagnosisNotes
        if (payload.totalCost != null) cs.total_cost = payload.totalCost
        if (payload.downPayment != null) cs.down_payment = payload.downPayment
        if (payload.monthlyInstallment != null) cs.monthly_installment = payload.monthlyInstallment
        if (payload.retainerType !== undefined) cs.retainer_type = payload.retainerType
        cs.updated_at = new Date().toISOString()
        writeClinical(c)
      }
      return true
    }
    case 'deleteOrthodonticCase': {
      c.orthodonticCases = c.orthodonticCases.filter((x) => x.id !== payload.id)
      c.orthodonticVisits = c.orthodonticVisits.filter((v) => v.case_id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listOrthodonticVisits': {
      const rows = c.orthodonticVisits.filter((v) => v.case_id === payload.caseId)
      return rows.sort((a, b) => a.visit_number - b.visit_number)
    }
    case 'createOrthodonticVisit': {
      const now = new Date().toISOString()
      const id = c.nextOrthodonticVisitId++
      const existingVisits = c.orthodonticVisits.filter((v) => v.case_id === payload.caseId)
      const nextNum = existingVisits.length + 1
      const newVisit: OrthodonticVisit = {
        id,
        case_id: payload.caseId,
        visit_number: nextNum,
        visit_date: payload.visitDate,
        upper_wire: payload.upperWire?.trim() || null,
        lower_wire: payload.lowerWire?.trim() || null,
        elastic_prescription: payload.elasticPrescription?.trim() || null,
        actions_json: payload.actionsJson?.trim() || null,
        broken_brackets_count: payload.brokenBracketsCount ?? 0,
        oral_hygiene_rating: payload.oralHygieneRating ?? 4,
        pain_level: payload.painLevel ?? 0,
        amount_paid: payload.amountPaid ?? 0,
        notes: payload.notes?.trim() || null,
        next_appointment_date: payload.nextAppointmentDate || null,
        created_at: now,
      }
      c.orthodonticVisits.push(newVisit)
      writeClinical(c)
      return id
    }
    case 'updateOrthodonticVisit': {
      const v = c.orthodonticVisits.find((x) => x.id === payload.id)
      if (v) {
        if (payload.upperWire !== undefined) v.upper_wire = payload.upperWire
        if (payload.lowerWire !== undefined) v.lower_wire = payload.lowerWire
        if (payload.elasticPrescription !== undefined) v.elastic_prescription = payload.elasticPrescription
        if (payload.actionsJson !== undefined) v.actions_json = payload.actionsJson
        if (payload.brokenBracketsCount != null) v.broken_brackets_count = payload.brokenBracketsCount
        if (payload.oralHygieneRating != null) v.oral_hygiene_rating = payload.oralHygieneRating
        if (payload.painLevel != null) v.pain_level = payload.painLevel
        if (payload.amountPaid != null) v.amount_paid = payload.amountPaid
        if (payload.notes !== undefined) v.notes = payload.notes
        if (payload.nextAppointmentDate !== undefined) v.next_appointment_date = payload.nextAppointmentDate
        writeClinical(c)
      }
      return true
    }
    case 'deleteOrthodonticVisit': {
      c.orthodonticVisits = c.orthodonticVisits.filter((x) => x.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'getOrthodonticStats': {
      let activeCases = 0
      let retentionCases = 0
      let completedCases = 0
      let suspendedCases = 0
      let totalRevenue = 0
      let totalDebt = 0
      for (const cs of c.orthodonticCases) {
        if (cs.status === 'active') activeCases++
        else if (cs.status === 'retention') retentionCases++
        else if (cs.status === 'completed') completedCases++
        else if (cs.status === 'suspended') suspendedCases++
        const visits = c.orthodonticVisits.filter((v) => v.case_id === cs.id)
        const paid = visits.reduce((sum, v) => sum + (v.amount_paid || 0), cs.down_payment || 0)
        totalRevenue += paid
        totalDebt += Math.max(0, cs.total_cost - paid)
      }
      return {
        activeCases,
        retentionCases,
        completedCases,
        suspendedCases,
        upcomingVisitsCount: 0,
        totalRevenue,
        totalDebt,
      }
    }
    default:
      return undefined
  }
}

function handleDb(payload: DbInvokePayload): unknown {
  switch (payload.op) {
    case 'getConfig':
      return readStore()[payload.key] ?? null
    case 'setConfig': {
      const store = readStore()
      store[payload.key] = payload.value
      writeStore(store)
      return true
    }
    case 'getConfigs': {
      const store = readStore()
      const out: Record<string, string> = {}
      for (const key of payload.keys) {
        const v = store[key]
        if (v !== undefined) out[key] = v
      }
      return out
    }
    case 'listUsers':
      return readUsers().map(({ id, username, role }) => ({ id, username, role }))
    case 'verifyCredentials': {
      const u = readUsers().find(
        (x) => x.username === payload.username.trim() && x.password === payload.password,
      )
      return u ? { id: u.id, username: u.username, role: u.role } : null
    }
    case 'createUser': {
      const users = readUsers()
      const id = Date.now()
      users.push({ id, username: payload.username.trim(), role: payload.role, password: payload.pin })
      writeUsers(users)
      return id
    }
    case 'updateUserPin': {
      const users = readUsers()
      const u = users.find((x) => x.id === payload.id)
      if (u) {
        u.password = payload.pin
        writeUsers(users)
      }
      return true
    }
    case 'updateUsername': {
      const users = readUsers()
      const u = users.find((x) => x.id === payload.id)
      if (u) {
        u.username = payload.username.trim()
        writeUsers(users)
      }
      return true
    }
    case 'deleteUser': {
      let users = readUsers()
      users = users.filter((x) => x.id !== payload.id)
      writeUsers(users)
      return true
    }
    case 'setLicenseActive': {
      const store = readStore()
      store.license_status = 'active'
      writeStore(store)
      return true
    }
    case 'listDueWhatsAppReminders':
      return []
    case 'markAppointmentReminderSent':
      return true
    default: {
      const c = readClinical()
      const r = handleClinical(payload, c)
      if (r !== undefined) return r
      throw new Error(`Unknown db op: ${(payload as { op: string }).op}`)
    }
  }
}

const mockApi: DentAssistApi = {
  isElectronShell: false,
  getMachineId: async () => readStore().machine_id ?? 'browser-dev',
  getPaths: async () => ({
    userData: '/mock/userData',
    imagesDir: '/mock/images',
    logosDir: '/mock/logos',
    dbPath: '/mock/dentassist.sqlite',
  }),
  db: async (payload) => handleDb(payload),
  openExternal: async (url: string) => {
    if (!url.startsWith('https://') && !url.startsWith('http://')) return false
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  },
  saveClinicLogo: async () => '/mock/clinic-logo.png',
  resolveAssetPath: async (relativePath) => relativePath,
  readUserDataFileBase64: async () =>
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  savePatientImage: async (patientId: number, _buf: ArrayBuffer, ext: string) => {
    const e = (ext || 'jpg').replace(/^\./, '')
    return `app_data/images/mock-${patientId}-${Date.now()}.${e}`
  },
  exportEncryptedBackup: async (passphrase: string) => {
    if (passphrase.length < 8) throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف')
    const clinical = readClinical()
    const store = readStore()
    const users = readUsers()
    const payload = {
      v: 2,
      exportedAt: new Date().toISOString(),
      browserMock: true,
      clinical,
      store,
      users,
    }
    const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), passphrase).toString()
    const stamp = new Date().toISOString().slice(0, 10)
    const defaultName = `dentassist-backup-${stamp}.dentassist`
    const blob = new Blob([enc], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { ok: true as const, filePath: defaultName }
  },
  importEncryptedBackup: async (passphrase: string) => {
    return new Promise<{ ok: true } | { ok: false }>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.dentassist,application/octet-stream,*/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve({ ok: false })
          return
        }
        try {
          const enc = await file.text()
          const bytes = CryptoJS.AES.decrypt(enc, passphrase)
          const decrypted = bytes.toString(CryptoJS.enc.Utf8)
          if (!decrypted) throw new Error('كلمة المرور خاطئة أو الملف تالف')
          const payload = JSON.parse(decrypted)
          if (payload.clinical) localStorage.setItem(CLINICAL_KEY, JSON.stringify(payload.clinical))
          if (payload.store) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.store))
          if (payload.users) localStorage.setItem(USERS_KEY, JSON.stringify(payload.users))
          resolve({ ok: true })
        } catch (e) {
          reject(e)
        }
      }
      input.click()
    })
  },
  importEncryptedBackupFromFile: async (file: File, passphrase: string) => {
    if (passphrase.length < 8) throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف')
    const enc = await file.text()
    const bytes = CryptoJS.AES.decrypt(enc, passphrase)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) throw new Error('كلمة المرور خاطئة أو الملف تالف')
    const payload = JSON.parse(decrypted)
    if (payload.clinical) localStorage.setItem(CLINICAL_KEY, JSON.stringify(payload.clinical))
    if (payload.store) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.store))
    if (payload.users) localStorage.setItem(USERS_KEY, JSON.stringify(payload.users))
    return { ok: true as const }
  },
  getEncryptedBackupString: async (passphrase: string) => {
    if (passphrase.length < 8) throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف')
    const clinical = readClinical()
    const store = readStore()
    const users = readUsers()
    const payload = {
      v: 2,
      exportedAt: new Date().toISOString(),
      browserMock: true,
      clinical,
      store,
      users,
    }
    return CryptoJS.AES.encrypt(JSON.stringify(payload), passphrase).toString()
  },
  applyEncryptedBackupString: async (enc: string, passphrase: string) => {
    const bytes = CryptoJS.AES.decrypt(enc, passphrase)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (!decrypted) throw new Error('كلمة المرور خاطئة أو الملف تالف')
    const payload = JSON.parse(decrypted)
    if (payload.clinical) localStorage.setItem(CLINICAL_KEY, JSON.stringify(payload.clinical))
    if (payload.store) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.store))
    if (payload.users) localStorage.setItem(USERS_KEY, JSON.stringify(payload.users))
    return { ok: true as const }
  },
  selectFolderDialog: async () => 'G:\\My Drive',
  detectGoogleDriveFolder: async () => 'G:\\My Drive',
  saveBackupToFolder: async (_folderPath: string, passphrase?: string) => {
    const stamp = new Date().toISOString().slice(0, 10)
    const fileName = `dentassist-backup-${stamp}.dentassist`
    if (passphrase && passphrase.length >= 8) {
      const clinical = readClinical()
      const store = readStore()
      const users = readUsers()
      const payload = {
        v: 2,
        exportedAt: new Date().toISOString(),
        browserMock: true,
        clinical,
        store,
        users,
      }
      const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), passphrase).toString()
      const blob = new Blob([enc], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
    return {
      ok: true as const,
      fileName,
      filePath: `G:\\My Drive\\${fileName}`,
      size: 1048576,
      createdTime: new Date().toISOString(),
    }
  },
  listBackupsInFolder: async () => [
    {
      name: `dentassist-backup-${new Date().toISOString().slice(0, 10)}.dentassist`,
      path: `G:\\My Drive\\dentassist-backup-${new Date().toISOString().slice(0, 10)}.dentassist`,
      size: 142050,
      createdTime: new Date().toISOString(),
    },
  ],
  restoreBackupFromFilePath: async () => ({ ok: true as const }),
  openFolderInExplorer: async () => true,
  saveTextFile: async (defaultFileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultFileName.endsWith('.csv') ? defaultFileName : `${defaultFileName}.csv`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { ok: true as const, filePath: a.download }
  },
  windowMinimize: async () => {},
  windowToggleMaximize: async () => ({ maximized: false }),
  windowClose: async () => {},
}

export function installBrowserMockBridge(): void {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  if (window.dentassist) return
  window.dentassist = mockApi
  console.info('[DentAssist] Browser dev mock: SQLite is simulated in localStorage. Use Electron for real data.')
}

installBrowserMockBridge()
