import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpenText,
  Bot,
  HelpCircle,
  Lightbulb,
  MessageCircleQuestion,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  ListPageHeader,
  ListPageLayout,
} from '@/components/layout/ListPageLayout'

type QaItem = {
  id: string
  category: 'general' | 'patients' | 'clinical' | 'appointments' | 'finance' | 'system'
  tags: string[]
  q: { ar: string; en: string }
  a: { ar: string; en: string }
}

const QA_BANK: QaItem[] = [
  {
    id: 'app-purpose',
    category: 'general',
    tags: ['وظيفة', 'وظيفته', 'ما هو البرنامج', 'purpose', 'what is', 'about app', 'عن البرنامج'],
    q: {
      ar: 'ما وظيفة برنامج DentAssist Pro؟',
      en: 'What is DentAssist Pro used for?',
    },
    a: {
      ar: 'DentAssist Pro هو نظام سحابي وأوفلاين متكامل لإدارة عيادة الأسنان: تنظيم ملفات المرضى، المواعيد السريرية، المخطط السني التفاعلي (Odontogram)، الخطط العلاجية، الفواتير والذمم المالية، الصندوق، وتقارير الأرباح.',
      en: 'DentAssist Pro is an offline-capable dental clinic operating system: managing patients, appointments, interactive dental chart, treatment plans, invoicing, cash box, and financial reports.',
    },
  },
  {
    id: 'developer',
    category: 'general',
    tags: ['مبرمج', 'المطور', 'المهندس', 'developer', 'programmer', 'who made', 'who built'],
    q: {
      ar: 'من مبرمج ومطور البرنامج؟',
      en: 'Who is the software developer?',
    },
    a: {
      ar: 'مبرمج ومطور البرنامج هو المهندس محمد شعبان ريمه. الهاتف: 00963981061026.',
      en: 'The software developer is Eng. Muhammad Sha\'ban Rima. Phone: 00963981061026.',
    },
  },
  {
    id: 'login',
    category: 'system',
    tags: ['تسجيل الدخول', 'دخول', 'login', 'sign in', 'pin', 'password', 'كلمة المرور', 'رمز'],
    q: {
      ar: 'كيف أسجل الدخول وأحمي العيادة؟',
      en: 'How do I sign in and secure the app?',
    },
    a: {
      ar: 'من شاشة الدخول اختر اسم المستخدم وأدخل رمز PIN المكون من 4 إلى 6 أرقام. تبقى جلستك نشطة ومحفوظة حتى لو قمت بتحديث الصفحة (F5). يمكنك تغيير الرمز من الإعدادات > الأمان.',
      en: 'Select your account from login, enter your 4-6 digit PIN. Your session is now persisted across browser reloads. You can change your PIN in Settings > Security.',
    },
  },
  {
    id: 'patients-create',
    category: 'patients',
    tags: ['patient', 'patients', 'مريض', 'المرضى', 'إضافة', 'add'],
    q: {
      ar: 'كيف أضيف مريضًا جديدًا؟',
      en: 'How do I add a new patient?',
    },
    a: {
      ar: 'من القائمة الجانبية ادخل إلى "المرضى" ثم اضغط "مريض جديد". أدخل الاسم والهاتف وتاريخ الميلاد، واحفظ. فور الحفظ يفتح لك الملف السريري الكامل والمخطط السني.',
      en: 'Open "Patients" from the sidebar, click "New Patient", fill basic contact details and save. The clinical odontogram will be automatically unlocked.',
    },
  },
  {
    id: 'dental-chart',
    category: 'clinical',
    tags: ['مخطط سني', 'odontogram', 'chart', 'سن', 'tooth', 'fdi', 'حالة السن'],
    q: {
      ar: 'كيف أستخدم المخطط السني التفاعلي؟',
      en: 'How do I use the interactive dental chart?',
    },
    a: {
      ar: 'افتح ملف المريض ثم قسم المخطط السني. انقر على أي سن لفتح لوحة الحالة (سليم، تسوس، حشوة، تاج، سحب عصب، زراعة، قلع). يمكنك أيضاً إضافة بند فاتورة مباشر للسن من نفس اللوحة.',
      en: 'Open a patient file, scroll to the dental chart, click any tooth to update its clinical status (sound, caries, filled, crown, root canal, implant). You can also attach an invoice line directly.',
    },
  },
  {
    id: 'appointments-flow',
    category: 'appointments',
    tags: ['appointment', 'appointments', 'موعد', 'مواعيد', 'العمليات اليومية', 'حجز'],
    q: {
      ar: 'كيف أنشئ موعدًا وأرسل تذكير واتساب؟',
      en: 'How do I schedule an appointment and send WhatsApp reminders?',
    },
    a: {
      ar: 'اذهب إلى "العمليات اليومية"، اضغط "حجز موعد جديد"، اختر المريض والوقت. عند اقتراب الموعد (قبل 24 ساعة أو ساعتين)، يظهر زر التذكير السريع لإرسال رسالة واتساب بنقرة واحدة.',
      en: 'Go to "Daily Operations", click "New Appointment", pick a patient and time. Automated WhatsApp reminder buttons will appear in the reminders banner 24h and 2h before the visit.',
    },
  },
  {
    id: 'invoices',
    category: 'finance',
    tags: ['فاتورة', 'فواتير', 'دفع', 'سداد', 'invoice', 'payment', 'debt'],
    q: {
      ar: 'كيف أنشئ فاتورة وأتابع الذمم والديون؟',
      en: 'How do I manage invoices and patient debts?',
    },
    a: {
      ar: 'من صفحة "الفواتير"، اضغط "فاتورة جديدة"، اختر المريض وأضف بنود المعالجة والأسعار. يمكنك تبديل حالة الفاتورة بين "مدفوعة" و"معلقة" بنقرة واحدة على شارة الحالة.',
      en: 'From "Invoices", click "New Invoice", select a patient, add treatment lines and amounts. Toggle payment status between Paid and Pending with a single click on the status pill.',
    },
  },
  {
    id: 'cashbox',
    category: 'finance',
    tags: ['صندوق', 'كاش', 'مصروف', 'إيراد', 'cash', 'cashbox', 'expense'],
    q: {
      ar: 'كيف أستخدم الصندوق لتسجيل الإيرادات والمصروفات؟',
      en: 'How do I track daily clinic expenses and collections in the Cashbox?',
    },
    a: {
      ar: 'في صفحة "الصندوق"، اضغط "حركة نقدية جديدة"، اختر إما "سند قبض" للمداخيل أو "سند صرف" لفواتير العيادة والمستهلكات. يوضح شريط المؤشرات الرصيد الصافي الفعلي فوراً.',
      en: 'In "Cashbox", click "New Transaction", select either Income or Expense, enter description and amount. Net cash position updates automatically.',
    },
  },
  {
    id: 'backup',
    category: 'system',
    tags: ['نسخ احتياطي', 'تصدير', 'حفظ', 'قاعدة بيانات', 'backup', 'restore', 'export'],
    q: {
      ar: 'كيف أعمل نسخة احتياطية للبيانات؟',
      en: 'How do I backup clinic data?',
    },
    a: {
      ar: 'ادخل إلى "الإعدادات" ثم قسم "النسخ الاحتياطي والأمان". اضغط "تصدير نسخة احتياطية" لتحميل ملف مشفر يحتوي على كافة المرضى والفواتير والمواعيد. احفظ الملف على قرص خارجي دورياً.',
      en: 'Go to Settings > Backup & Security, click "Export Backup" to download an encrypted backup file containing all clinical records, invoices, and charts.',
    },
  },
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

function getAnswer(rawQuery: string): QaItem | null {
  const q = normalize(rawQuery)
  if (!q) return null
  let best: { item: QaItem; score: number } | null = null
  for (const item of QA_BANK) {
    let score = 0
    for (const tag of item.tags) {
      if (q.includes(normalize(tag))) score += 3
    }
    if (q.includes('كيف') || q.includes('how')) score += 1
    if (q.includes(normalize(item.q.ar)) || q.includes(normalize(item.q.en))) score += 2
    if (score > 0 && (!best || score > best.score)) best = { item, score }
  }
  return best?.item ?? null
}

export function AskMePage() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'ar' ? 'ar' : 'en'
  const isAr = lang === 'ar'
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const result = useMemo(() => getAnswer(submitted), [submitted])

  const filteredBank = useMemo(() => {
    if (activeCategory === 'all') return QA_BANK
    return QA_BANK.filter((item) => item.category === activeCategory)
  }, [activeCategory])

  const categories = [
    { id: 'all', label: isAr ? 'جميع المواضيع' : 'All Topics' },
    { id: 'patients', label: isAr ? 'إدارة المرضى' : 'Patients' },
    { id: 'clinical', label: isAr ? 'المخطط السني' : 'Dental Chart' },
    { id: 'appointments', label: isAr ? 'المواعيد وواتساب' : 'Appointments' },
    { id: 'finance', label: isAr ? 'الفواتير والصندوق' : 'Billing & Cash' },
    { id: 'system', label: isAr ? 'النظام والأمان' : 'Security' },
  ]

  return (
    <ListPageLayout>
      {/* ─── Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #6366f1)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            <Bot className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{isAr ? 'المساعد الذكي للعيادة' : 'Ask Me Assistant'}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/80 px-2 py-0.2 text-[10px] font-bold text-indigo-700">
                <Sparkles className="size-3" />
                <span>Offline AI</span>
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'مرجع فوري ذكي يشرح كافة وظائف البرنامج وإجراءاته السريرية والإدارية بدون إنترنت'
                : 'Instant offline guide for clinical workflows, billing, charts, and system settings'}
            </p>
          </div>
        </div>
      </ListPageHeader>

      {/* ─── Search Prompt Bar ─── */}
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (query.trim()) setSubmitted(query.trim())
          }}
          className="mx-auto max-w-2xl"
        >
          <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white p-2 shadow-2xs transition-all focus-within:border-teal-500 focus-within:ring-3 focus-within:ring-teal-500/20">
            <MessageCircleQuestion className="pointer-events-none size-5 text-teal-600 start-3 ms-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب سؤالك هنا... مثال: كيف أستخدم المخطط السني؟ أو كيف أنشئ فاتورة؟'
                  : 'Ask anything... e.g. How do I use the dental chart? or How to schedule?'
              }
              className="w-full bg-transparent px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98] shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #6366f1)',
              }}
            >
              <Search className="size-3.5" />
              <span>{isAr ? 'اسأل' : 'Ask'}</span>
            </button>
          </div>
        </form>

        {/* Category Pills */}
        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-bold transition-all duration-150 ${
                activeCategory === c.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content Split: Suggested Questions + Answers ─── */}
      <div className="grid flex-1 items-start gap-4 p-4 sm:p-6 lg:grid-cols-3">
        {/* Suggested Questions List */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 lg:col-span-1">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Lightbulb className="size-4 text-amber-500" />
            <span>{isAr ? 'أسئلة سريعة شائعة' : 'Common Questions'}</span>
          </p>
          <div className="space-y-2">
            {filteredBank.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setQuery(s.q[lang])
                  setSubmitted(s.q[lang])
                }}
                className="w-full cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3 text-start text-xs font-bold text-slate-800 shadow-2xs transition-all hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-900 active:scale-98"
              >
                {s.q[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Answer Viewer Panel */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6 lg:col-span-2 min-h-[320px] flex flex-col justify-center">
          {!submitted ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-400 py-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                <HelpCircle className="size-7" />
              </div>
              <p className="max-w-sm text-sm font-bold text-slate-700">
                {isAr
                  ? 'اختر سؤالاً من القائمة أو اكتب سؤالك في شريط البحث أعلاه'
                  : 'Pick a question from the list or type in the search bar above'}
              </p>
              <p className="max-w-md text-xs text-slate-400">
                {isAr
                  ? 'يقوم المساعد بتحليل كلماتك والإجابة بدقة عن أي ميزة في العيادة دون الحاجة للاتصال بالإنترنت.'
                  : 'Instant offline guidance for dental clinic workflows and shortcuts.'}
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-teal-200/80 bg-teal-50/70 p-4 shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  {isAr ? 'السؤال المطابق' : 'Closest Match'}
                </p>
                <p className="mt-1 text-sm font-extrabold text-teal-950">{result.q[lang]}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpenText className="size-4 text-teal-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isAr ? 'الشرح والخطوات السريرية' : 'Detailed Instructions'}
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-medium leading-7 text-slate-800">
                  {result.a[lang]}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <Zap className="size-6" />
              </div>
              <p className="text-sm font-bold text-amber-900">
                {isAr
                  ? 'لم أجد إجابة مطابقة بالكامل لهذا النص'
                  : 'No exact answer found for your query'}
              </p>
              <p className="mx-auto max-w-sm text-xs text-slate-500">
                {isAr
                  ? 'جرّب صياغة أوضح (مثال: "المخطط السني" أو "كيف أنشئ فاتورة") أو انقر على أحد الأسئلة المقترحة.'
                  : 'Try rephrasing with simpler keywords or pick one of the questions on the left.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ListPageLayout>
  )
}
