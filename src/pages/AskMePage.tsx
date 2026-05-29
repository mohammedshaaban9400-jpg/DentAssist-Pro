import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpenText, HelpCircle, Lightbulb, MessageCircleQuestion, Search } from 'lucide-react'

type QaItem = {
  id: string
  tags: string[]
  q: { ar: string; en: string }
  a: { ar: string; en: string }
}

const QA_BANK: QaItem[] = [
  {
    id: 'app-purpose',
    tags: ['وظيفة', 'وظيفته', 'ما هو البرنامج', 'purpose', 'what is', 'about app', 'عن البرنامج'],
    q: {
      ar: 'ما وظيفة برنامج DentAssist Pro؟',
      en: 'What is DentAssist Pro used for?',
    },
    a: {
      ar: 'DentAssist Pro هو نظام لإدارة عيادة الأسنان: تنظيم المرضى، المواعيد، المخطط السني، الخطط العلاجية، الفواتير، الصندوق، والتقارير. الهدف هو تسهيل العمل اليومي وتقليل الأخطاء الإدارية.',
      en: 'DentAssist Pro is a dental clinic management system: patients, appointments, dental chart, treatment plans, invoices, cash box, and reports. Its goal is to streamline daily workflow and reduce administrative errors.',
    },
  },
  {
    id: 'developer',
    tags: ['مبرمج', 'المطور', 'المهندس', 'developer', 'programmer', 'who made', 'who built'],
    q: {
      ar: 'من مبرمج البرنامج؟',
      en: 'Who is the software developer?',
    },
    a: {
      ar: 'مبرمج ومطور البرنامج هو المهندس محمد شعبان ريمه.',
      en: 'The software developer is Eng. Muhammad Sha\'ban Rima.',
    },
  },
  {
    id: 'login',
    tags: ['تسجيل الدخول', 'دخول', 'login', 'sign in', 'pin', 'password', 'كلمة المرور', 'رمز'],
    q: {
      ar: 'كيف أسجل الدخول؟',
      en: 'How do I sign in?',
    },
    a: {
      ar: 'من شاشة الدخول اختر اسم المستخدم ثم أدخل الرمز/كلمة المرور واضغط دخول. في أول تشغيل أنشئ حساب الطبيب الرئيسي أولاً. إذا طُلب تغيير الرمز لأسباب أمنية، أدخل رمزًا جديدًا وتابع.',
      en: 'From the login screen, select a username, enter PIN/password, then sign in. On first launch, create the primary doctor account first. If forced PIN reset appears, set a new PIN and continue.',
    },
  },
  {
    id: 'patients-create',
    tags: ['patient', 'patients', 'مريض', 'المرضى', 'إضافة', 'add'],
    q: {
      ar: 'كيف أضيف مريضًا جديدًا؟',
      en: 'How do I add a new patient?',
    },
    a: {
      ar: 'من القائمة الجانبية ادخل إلى "المرضى" ثم اضغط "مريض جديد". أدخل البيانات الأساسية واحفظ. بعد الحفظ يفتح لك الملف السريري والمخطط السني.',
      en: 'Open "Patients" from the sidebar, click "New patient", fill the basic details, then save. After saving, the clinical record and dental chart become available.',
    },
  },
  {
    id: 'patients-edit-delete',
    tags: ['تعديل مريض', 'حذف مريض', 'edit patient', 'delete patient', 'ملف المريض'],
    q: {
      ar: 'كيف أعدل أو أحذف ملف المريض؟',
      en: 'How do I edit or delete a patient file?',
    },
    a: {
      ar: 'من صفحة المرضى افتح الملف، عدّل الحقول المطلوبة ثم احفظ. للحذف استخدم إجراء الحذف من قائمة المرضى أو من الملف بعد التأكيد. الحذف يزيل البيانات المرتبطة بالمريض.',
      en: 'Open the patient file from Patients, edit required fields, then save. For deletion, use delete action from list/detail and confirm. Deleting removes related patient data.',
    },
  },
  {
    id: 'dental-chart',
    tags: ['مخطط سني', 'odontogram', 'chart', 'سن', 'tooth', 'fdi', 'حالة السن'],
    q: {
      ar: 'كيف أستخدم المخطط السني؟',
      en: 'How do I use the dental chart?',
    },
    a: {
      ar: 'افتح ملف المريض ثم قسم المخطط السني. انقر على السن لتحديد الحالة (تسوس، حشوة، تاج...) وأضف ملاحظة عند الحاجة ثم احفظ. يمكنك إضافة بند فاتورة مرتبط بالسن مباشرة من نافذة السن.',
      en: 'Open a patient file then dental chart section. Click a tooth to set status (caries, filling, crown, etc.), add notes if needed, then save. You can also create an invoice line tied to that tooth directly.',
    },
  },
  {
    id: 'appointments-flow',
    tags: ['appointment', 'appointments', 'موعد', 'مواعيد', 'العمليات اليومية'],
    q: {
      ar: 'كيف أنشئ موعدًا؟',
      en: 'How do I create an appointment?',
    },
    a: {
      ar: 'اذهب إلى "العمليات اليومية" ثم اضغط "موعد جديد". اختر المريض، وقت البداية والنهاية، الحالة، ثم احفظ.',
      en: 'Go to "Daily Operations", click "New appointment", select patient, start/end time, status, then save.',
    },
  },
  {
    id: 'appointments-status',
    tags: ['حالة الموعد', 'scheduled', 'completed', 'cancelled', 'تحديث الموعد', 'appointment status'],
    q: {
      ar: 'كيف أعدل حالة الموعد؟',
      en: 'How do I update appointment status?',
    },
    a: {
      ar: 'ادخل إلى العمليات اليومية، افتح الموعد ثم غيّر الحالة (مجدول/مكتمل/ملغى) واحفظ. هذا ينعكس مباشرة في الإحصائيات والتتبع.',
      en: 'Go to Daily Operations, open the appointment, change status (scheduled/completed/cancelled), and save. It updates tracking and stats immediately.',
    },
  },
  {
    id: 'whatsapp-reminders',
    tags: ['واتساب', 'whatsapp', 'تذكير', 'reminder', 'رسالة', 'message'],
    q: {
      ar: 'كيف يعمل تذكير واتساب؟',
      en: 'How do WhatsApp reminders work?',
    },
    a: {
      ar: 'يعرض النظام المواعيد القريبة ويجهّز رسالة واتساب جاهزة للمريض. الإرسال النهائي يتم من واتساب بواسطة المستخدم. تأكد من رقم الهاتف بصيغة صحيحة.',
      en: 'The system detects near appointments and prepares a prefilled WhatsApp message. Final send is done by the user in WhatsApp. Ensure patient phone format is valid.',
    },
  },
  {
    id: 'backup',
    tags: ['backup', 'restore', 'نسخ', 'احتياطي', 'استيراد', 'تصدير'],
    q: {
      ar: 'كيف أعمل نسخة احتياطية وأسترجعها؟',
      en: 'How do I create and restore backups?',
    },
    a: {
      ar: 'من "الإعدادات" (صلاحية طبيب): أدخل كلمة مرور قوية ثم اضغط "تصدير النسخة الاحتياطية". للاسترجاع استخدم "استيراد" بنفس كلمة المرور. الاسترجاع يستبدل البيانات الحالية بالكامل.',
      en: 'From "Settings" (doctor role): enter a strong passphrase and click "Export backup". For restore, click "Import" and use the same passphrase. Restore replaces current data completely.',
    },
  },
  {
    id: 'csv-export',
    tags: ['csv', 'excel', 'تصدير', 'اكسل', 'تقارير csv'],
    q: {
      ar: 'كيف أصدّر البيانات إلى Excel؟',
      en: 'How do I export data to Excel?',
    },
    a: {
      ar: 'من الإعدادات افتح قسم CSV Export، ثم اختر النوع المطلوب (مرضى/فواتير/بنود/تقارير). تُحفظ الملفات بترميز مناسب لعرض العربية في Excel.',
      en: 'In Settings open CSV Export section, choose dataset type (patients/invoices/lines/reports). Files are saved with encoding suitable for Arabic display in Excel.',
    },
  },
  {
    id: 'invoices',
    tags: ['invoice', 'invoices', 'فاتورة', 'فواتير', 'دفع'],
    q: {
      ar: 'كيف أنشئ فاتورة؟',
      en: 'How do I create an invoice?',
    },
    a: {
      ar: 'افتح "الفواتير" واضغط "فاتورة جديدة"، اختر المريض، أضف البنود (الوصف والسعر)، وحدد حالة الدفع ثم احفظ.',
      en: 'Open "Invoices", click "New invoice", choose the patient, add line items (description and price), set payment status, then save.',
    },
  },
  {
    id: 'cashbox',
    tags: ['الصندوق', 'cashbox', 'cash box', 'حركة مالية', 'transaction'],
    q: {
      ar: 'كيف أستخدم قسم الصندوق؟',
      en: 'How do I use the cash box section?',
    },
    a: {
      ar: 'قسم الصندوق مخصص لتسجيل الحركات المالية (دخل/مصروف) ومتابعة الرصيد التشغيلي. يفضل توثيق الوصف والمبلغ والتاريخ بدقة لتقارير صحيحة.',
      en: 'Cash box is used to record financial transactions (income/expense) and track operational balance. Keep description, amount, and date accurate for reliable reporting.',
    },
  },
  {
    id: 'reports',
    tags: ['تقارير', 'reports', 'dashboard', 'إحصائيات', 'ارباح', 'إيراد'],
    q: {
      ar: 'كيف أقرأ التقارير ولوحة الإحصائيات؟',
      en: 'How do I read reports and dashboard?',
    },
    a: {
      ar: 'لوحة الإحصائيات تعرض الإيراد اليومي/الشهري، حالات المواعيد، والديون المعلقة. قسم التقارير يعطي تحليلًا أدق حسب البيانات المدخلة. دقة النتائج تعتمد على اكتمال إدخال الفواتير والحركات.',
      en: 'Dashboard shows daily/monthly revenue, appointment status mix, and pending debt. Reports provide deeper analysis based on recorded data. Accuracy depends on complete invoice/transaction entries.',
    },
  },
  {
    id: 'lab',
    tags: ['مخبر', 'مختبر', 'dental lab', 'lab order', 'إرسال إلى المخبر'],
    q: {
      ar: 'كيف أستخدم قسم إرسال إلى المخبر؟',
      en: 'How do I use Send to Dental Lab?',
    },
    a: {
      ar: 'افتح قسم إرسال إلى المخبر، أنشئ طلب جديد (اسم المريض، اسم المخبر، نوع العمل)، ثم تابع الحالة (قيد العمل/تم الاستلام/متأخر) حتى إغلاق الطلب.',
      en: 'Open Send to Dental Lab, create a new order (patient, lab, work type), then keep status updated (progress/received/delayed) until completion.',
    },
  },
  {
    id: 'distributors',
    tags: ['موزعين', 'distributors', 'موردين', 'suppliers'],
    q: {
      ar: 'ما فائدة قسم الموزعين؟',
      en: 'What is the distributors section for?',
    },
    a: {
      ar: 'قسم الموزعين لتنظيم بيانات الموردين، المبالغ المدفوعة والمتبقية، ومتابعة التعاملات المالية معهم بطريقة واضحة.',
      en: 'Distributors section helps manage supplier data, paid and remaining balances, and related financial follow-up.',
    },
  },
  {
    id: 'settings',
    tags: ['إعدادات', 'settings', 'language', 'logo', 'clinic', 'اللغة', 'الشعار'],
    q: {
      ar: 'ماذا يمكنني تعديل من الإعدادات؟',
      en: 'What can I configure in Settings?',
    },
    a: {
      ar: 'يمكن تعديل اللغة، بيانات العيادة (الاسم/الهاتف/العنوان/الشعار)، إعدادات العملة، النسخ الاحتياطي، التصدير CSV، وإدارة المستخدمين (بحسب الصلاحية).',
      en: 'Settings allow changing language, clinic profile (name/phone/address/logo), currency setup, backup, CSV export, and user management (role-based).',
    },
  },
  {
    id: 'users-management',
    tags: ['مستخدم', 'users', 'add user', 'صلاحيات', 'accounts'],
    q: {
      ar: 'كيف أدير حسابات المستخدمين؟',
      en: 'How do I manage user accounts?',
    },
    a: {
      ar: 'من الإعدادات > إدارة المستخدمين يمكن إضافة مستخدم جديد، تعديل الاسم أو الرمز، وحذف الحساب. يفضّل أن تبقى دائمًا حسابات بديلة للطوارئ.',
      en: 'In Settings > User Management you can add users, update username/PIN, and delete accounts. Keep at least one backup account for emergency access.',
    },
  },
  {
    id: 'license-activation',
    tags: ['تفعيل', 'license', 'activation', 'trial', 'اشتراك'],
    q: {
      ar: 'كيف يتم التفعيل بعد انتهاء التجربة؟',
      en: 'How does activation work after trial?',
    },
    a: {
      ar: 'عند انتهاء التجربة تظهر شاشة التفعيل. أدخل رقم العملية بعد الدفع وارسل الطلب للتحقق. عند قبول الطلب يصبح الترخيص فعالًا على الجهاز المرتبط.',
      en: 'After trial expiry, activation screen appears. Enter payment reference and submit for verification. Once approved, license becomes active for the linked machine.',
    },
  },
  {
    id: 'offline-mode',
    tags: ['اوفلاين', 'بدون انترنت', 'offline', 'internet', 'شبكة'],
    q: {
      ar: 'هل يعمل البرنامج بدون إنترنت؟',
      en: 'Does the app work without internet?',
    },
    a: {
      ar: 'نعم، العمل اليومي داخل البرنامج محلي (Offline) على الجهاز. الإنترنت يُستخدم فقط للميزات التي تتطلب تحقق خارجي مثل الترخيص عند الحاجة.',
      en: 'Yes, daily operations are local/offline on your machine. Internet is only required for external-verification features like licensing when needed.',
    },
  },
  {
    id: 'data-location',
    tags: ['بيانات', 'قاعدة البيانات', 'sqlite', 'where data', 'storage'],
    q: {
      ar: 'أين تُحفظ بيانات العيادة؟',
      en: 'Where is clinic data stored?',
    },
    a: {
      ar: 'البيانات تُحفظ محليًا على نفس جهاز التشغيل ضمن قاعدة SQLite وملفات الأصول (الصور/الشعار). لذلك النسخ الاحتياطي الدوري ضروري جدًا.',
      en: 'Data is stored locally on the same machine using SQLite plus local asset files (images/logo). Regular backups are essential.',
    },
  },
  {
    id: 'security-best-practice',
    tags: ['أمان', 'security', 'password', 'pin', 'نسخ احتياطي', 'backup safety'],
    q: {
      ar: 'ما أفضل ممارسات الأمان داخل البرنامج؟',
      en: 'What are security best practices?',
    },
    a: {
      ar: 'استخدم رموز قوية للحسابات، لا تشارك حساب الطبيب، فعّل نسخة احتياطية مشفرة بشكل دوري، واحفظ النسخ خارج الجهاز الرئيسي.',
      en: 'Use strong account PINs/passwords, avoid sharing doctor account, run encrypted backups regularly, and store backup files off the main machine.',
    },
  },
  {
    id: 'about-docs',
    tags: ['سياسة الخصوصية', 'شروط الاستخدام', 'guide', 'about', 'وثائق'],
    q: {
      ar: 'أين أجد سياسة الخصوصية ودليل الاستخدام؟',
      en: 'Where can I find privacy policy and user guide?',
    },
    a: {
      ar: 'من القائمة الجانبية افتح "حول البرنامج"، وستجد تبويبات: نظرة عامة، سياسة الخصوصية، شروط الاستخدام، ودليل الاستخدام.',
      en: 'Open "About" from the sidebar; you will find tabs for Overview, Privacy Policy, Terms of Use, and User Guide.',
    },
  },
  {
    id: 'roles',
    tags: ['role', 'doctor', 'reception', 'صلاحيات', 'طبيب', 'استقبال'],
    q: {
      ar: 'ما الفرق بين صلاحية الطبيب والاستقبال؟',
      en: 'What is the difference between doctor and reception roles?',
    },
    a: {
      ar: 'حساب الطبيب يملك صلاحيات أوسع مثل النسخ الاحتياطي، الصندوق، والتقارير. الاستقبال يركز على العمليات اليومية والمواعيد والبيانات التشغيلية.',
      en: 'Doctor accounts have broader access like backup, cash box, and reports. Reception accounts focus on daily operations and routine data management.',
    },
  },
]

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

function getAnswer(query: string): QaItem | null {
  const q = normalize(query)
  if (!q) return null
  // Force exact developer identity response for direct developer/programmer questions.
  if (
    q.includes('من مبرمج البرنامج') ||
    q.includes('من المطور') ||
    q.includes('من المبرمج') ||
    q.includes('who is the software developer') ||
    q.includes('who is the developer') ||
    q.includes('who programmed')
  ) {
    return QA_BANK.find((x) => x.id === 'developer') ?? null
  }
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
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  const result = useMemo(() => getAnswer(submitted), [submitted])

  const suggestions = QA_BANK.slice(0, 8)

  return (
    <div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          {lang === 'ar' ? 'اسألني' : 'Ask Me'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {lang === 'ar'
            ? 'مساعد تعليمي أوفلاين: يشرح فقط طريقة عمل البرنامج ووظائفه بدون إنترنت.'
            : 'Offline educational assistant: explains only app workflows and features (no internet required).'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitted(query)
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <MessageCircleQuestion className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: ما وظيفة البرنامج؟ أو من مبرمج البرنامج؟'
                      : 'Example: What is this app used for? or Who is the developer?'
                  }
                  className="da-input ps-10"
                />
              </div>
              <button type="submit" className="da-btn-primary gap-2">
                <Search className="size-4" />
                {lang === 'ar' ? 'اسأل' : 'Ask'}
              </button>
            </form>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 lg:col-span-1">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Lightbulb className="size-4 text-amber-500" />
                {lang === 'ar' ? 'أسئلة مقترحة' : 'Suggested questions'}
              </p>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setQuery(s.q[lang])
                      setSubmitted(s.q[lang])
                    }}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-start text-sm text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    {s.q[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
              {!submitted ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-slate-500">
                  <HelpCircle className="size-10 text-slate-300" />
                  <p className="max-w-md text-sm">
                    {lang === 'ar'
                      ? 'اكتب سؤالك عن وظائف البرنامج وطريقة استخدامه، مثل: ما وظيفة البرنامج؟ أو كيف أضيف مريض؟'
                      : 'Ask about app features and workflows, e.g. What is the app used for? or How do I add a patient?'}
                  </p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      {lang === 'ar' ? 'السؤال الأقرب' : 'Closest match'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-teal-900">{result.q[lang]}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <BookOpenText className="size-4 text-teal-600" />
                      {lang === 'ar' ? 'الشرح' : 'Explanation'}
                    </p>
                    <p className="text-sm leading-7 text-slate-700">{result.a[lang]}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {lang === 'ar'
                      ? 'لم أجد إجابة مطابقة بالكامل. جرّب صياغة أوضح (مثال: كيف أنشئ فاتورة؟).'
                      : 'No close answer found. Try a clearer query (e.g. How do I create an invoice?).'}
                  </div>
                  <p className="text-sm text-slate-600">
                    {lang === 'ar'
                      ? 'يمكنك أيضًا اختيار سؤال من "الأسئلة المقترحة".'
                      : 'You can also pick one of the suggested questions.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
