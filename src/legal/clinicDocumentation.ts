/**
 * Legal & user documentation for DentAssist Pro (Arabic + English).
 * Not a substitute for jurisdiction-specific legal review.
 */

export type DocId = 'privacy' | 'terms' | 'guide'

export type DocSection = {
  title: { ar: string; en: string }
  paragraphs: { ar: string[]; en: string[] }
}

const privacySections: DocSection[] = [
  {
    title: { ar: '١. المقدمة', en: '1. Introduction' },
    paragraphs: {
      ar: [
        'يشرح هذا المستند كيفية تعامل تطبيق DentAssist Pro («التطبيق») مع المعلومات عند استخدامه في إدارة عيادة أسنان.',
        'باستخدام التطبيق فإنك تقر بأنك قرأت هذه السياسة وفهمتها.',
      ],
      en: [
        'This document explains how DentAssist Pro (the “App”) handles information when you use it to operate a dental clinic.',
        'By using the App, you acknowledge that you have read and understood this policy.',
      ],
    },
  },
  {
    title: { ar: '٢. البيانات التي يتم التعامل معها', en: '2. Data the App handles' },
    paragraphs: {
      ar: [
        'يُخزَّن محلياً على جهاز الكمبيوتر الذي يثبت عليه التطبيق: بيانات المرضى، المواعيد، الفواتير، الصندوق، المخططات العلاجية، الصور المرفقة، إعدادات العيادة، وأسماء المستخدمين (بصيغة مُشتقة آمنة لكلمات المرور).',
        'لا يُرسل التطبيق هذه البيانات الطبية تلقائياً إلى خوادم المطوّر لغرض التخزين السحابي للسجلات؛ العمل اليومي للعيادة يتم على قاعدة بيانات محلية (SQLite) ضمن جهازك.',
      ],
      en: [
        'Stored locally on the computer where the App is installed: patient data, appointments, invoices, cashbox entries, treatment plans, attached images, clinic settings, and usernames (passwords stored using secure one-way hashing).',
        'The App does not automatically upload this clinical data to the developer’s servers for cloud record storage; day‑to‑day clinic work uses a local SQLite database on your machine.',
      ],
    },
  },
  {
    title: { ar: '٣. الاتصال بالإنترنت والترخيص', en: '3. Internet use & licensing' },
    paragraphs: {
      ar: [
        'عند تفعيل خاصية التحقق من الترخيص أو التجربة عبر Supabase، قد يُرسل التطبيق معرّف الجهاز وأوقاتاً مشتقة للتحقق من صلاحية الاشتراك أو التجربة. لا يُستخدم ذلك لبيع بيانات المرضى.',
        'يُنصح بتشغيل التطبيق من النسخة المثبتة الرسمية (Electron) وليس من نسخة متصفح غير مدعومة، لضمان تطبيق سياسة الأمان نفسها.',
      ],
      en: [
        'When license or trial verification via Supabase is enabled, the App may send a device identifier and derived timing data to confirm subscription or trial status. This is not used to sell patient data.',
        'Run the official installed (Electron) build rather than unsupported browser-only copies so the same security model applies.',
      ],
    },
  },
  {
    title: { ar: '٤. الأمن والمسؤولية', en: '4. Security & your responsibilities' },
    paragraphs: {
      ar: [
        'يتحمّل مُشغّل العيادة مسؤولية حماية الجهاز (كلمة دخول ويندوز، مضاد فيروسات، عدم مشاركة حسابات المستخدمين) ومسؤولية أخذ نسخ احتياطية دورية من البيانات.',
        'في حال فقدان الجهاز أو تلف القرص دون نسخة احتياطية، قد تفقد البيانات نهائياً.',
      ],
      en: [
        'The clinic operator is responsible for protecting the workstation (Windows password, antivirus, not sharing user accounts) and for taking regular encrypted backups.',
        'If hardware is lost or disks fail without backups, data may be permanently lost.',
      ],
    },
  },
  {
    title: { ar: '٥. التحديثات على هذه السياسة', en: '5. Changes to this policy' },
    paragraphs: {
      ar: [
        'قد يُحدَّث نص هذه السياسة مع إصدارات جديدة من التطبيق. تاريخ آخر تحديث يظهر أسفل الصفحة.',
      ],
      en: [
        'This policy may be updated with new App releases. The “last updated” date appears at the bottom of this page.',
      ],
    },
  },
]

const termsSections: DocSection[] = [
  {
    title: { ar: '١. قبول الشروط', en: '1. Acceptance' },
    paragraphs: {
      ar: [
        'باستخدام DentAssist Pro فإنك توافق على هذه الشروط. إذا لم توافق، يجب التوقف عن استخدام التطبيق.',
      ],
      en: [
        'By using DentAssist Pro you agree to these terms. If you do not agree, you must stop using the App.',
      ],
    },
  },
  {
    title: { ar: '٢. منح الترخيص', en: '2. License grant' },
    paragraphs: {
      ar: [
        'يُمنح ترخيص استخدام محدود وفق اشتراكك أو اتفاقك مع المطوّر. يُحظر إعادة التوزيع أو الهندسة العكسية أو إزالة حماية الترخيص دون إذن خطي.',
        'سعر التفعيل السنوي المعروض في شاشة التفعيل هو جزء من الاتفاق التجاري بينك وبين المطوّر عند الدفع.',
      ],
      en: [
        'A limited license is granted according to your subscription or agreement with the developer. Redistribution, reverse engineering, or bypassing license protections without written permission is prohibited.',
        'The annual activation fee shown in the activation screen is part of the commercial agreement when you pay.',
      ],
    },
  },
  {
    title: { ar: '٣. طبيعة البرنامج', en: '3. Nature of the software' },
    paragraphs: {
      ar: [
        'التطبيق أداة إدارية وتنظيمية لمساعدة العيادة؛ لا يقدّم استشارة طبية أو تشخيصاً.',
        'يقع على الطبيب المعالج وحده تقييم الحالات سريرياً والتصرف وفق المعايير المهنية والقانونية المعمول بها.',
      ],
      en: [
        'The App is an administrative and organizational tool; it does not provide medical advice or diagnosis.',
        'Clinical judgment and compliance with professional and applicable laws remain solely the treating clinician’s responsibility.',
      ],
    },
  },
  {
    title: { ar: '٤. إخلاء المسؤولية والحدود', en: '4. Disclaimer & limitation' },
    paragraphs: {
      ar: [
        'يُقدَّم التطبيق «كما هو» ضمن نطاق ما يوفّره من وظائف. لا يضمن المطوّر خلواً كاملاً من الأعطال البرمجية أو توافقاً مع كل بيئة تشغيل.',
        'إلى أقصى حد يسمح به القانون المعمول به، لا تتحمل الجهة المالكة للبرنامج المسؤولية عن أي أضرار غير مباشرة أو فقدان أرباح أو انقطاع أعمال ناتج عن استخدام أو عدم القدرة على استخدام التطبيق.',
        'هذه الصياغة عامة؛ للاستفسارات القانونية الملزمة يُرجى مراجعة مستشار قانوني في بلدك.',
      ],
      en: [
        'The App is provided “as is” within the scope of its features. The developer does not warrant completely error‑free operation or compatibility with every environment.',
        'To the fullest extent permitted by applicable law, the software owner is not liable for indirect damages, lost profits, or business interruption arising from use or inability to use the App.',
        'This wording is general; seek qualified legal counsel in your jurisdiction for binding advice.',
      ],
    },
  },
]

const guideSections: DocSection[] = [
  {
    title: { ar: '١. البدء', en: '1. Getting started' },
    paragraphs: {
      ar: [
        'ثبّت التطبيق من ملف الإعداد الرسمي (Setup) على ويندوز. بعد التثبيت، شغّل الاختصار من قائمة ابدأ — لا تعتمد على فتح ملف HTML من المجلد يدوياً.',
        'النسخة التجريبية تمنحك فترة محدودة؛ بعدها يظهر طلب التفعيل. يتطلب التفعيل عادةً الاتصال بالإنترنت للتحقق من الوقت والترخيص عندما يكون ذلك مفعّلاً.',
      ],
      en: [
        'Install from the official Windows Setup file. Launch via the Start Menu shortcut — do not rely on opening HTML files from folders manually.',
        'A trial period applies; activation is then required. Activation may require internet connectivity for time and license checks when enabled.',
      ],
    },
  },
  {
    title: { ar: '٢. تسجيل الدخول والأدوار', en: '2. Sign-in & roles' },
    paragraphs: {
      ar: [
        'يُدار الدخول عبر مستخدمين محليين (طبيب / استقبال). يحدّد الطبيب صلاحيات أوسع مثل الصندوق والتقارير حسب تصميم التطبيق.',
        'يُنصح بتغيير كلمات المرور الافتراضية فوراً من الإعدادات.',
      ],
      en: [
        'Sign-in uses local users (doctor / reception). The doctor role typically has broader access such as cashbox and reports.',
        'Change default passwords immediately in Settings.',
      ],
    },
  },
  {
    title: { ar: '٣. المرضى والسجل السريري', en: '3. Patients & clinical record' },
    paragraphs: {
      ar: [
        'من قائمة المرضى يمكن إضافة ملف مريض، ثم فتح التفاصيل للوصول إلى المخطط السني، الخطط العلاجية، الوصفات، والصور.',
        'البيانات تُحفظ على هذا الجهاز؛ احمِ الجهاز physically ومنطقياً.',
      ],
      en: [
        'From Patients you can create records and open details for the dental chart, treatment plans, prescriptions, and images.',
        'Data stays on this machine; protect it physically and logically.',
      ],
    },
  },
  {
    title: { ar: '٤. المواعيد وتذكير واتساب', en: '4. Appointments & WhatsApp' },
    paragraphs: {
      ar: [
        'في «العمليات اليومية» تُعرض المواعيد ضمن الأسبوع. يظهر شريط تذكيرات واتساب عندما يقترب موعد مجدول ضمن النوافذ الزمنية المعرّفة (تقريباً قبل 22–26 ساعة لنوع 24h، وقبل 1–3 ساعات لنوع 2h).',
        'يمكن أيضاً فتح واتساب يدوياً من زر الرسالة بجانب كل موعد «مجدول» يملك رقم هاتف — يُفضَّل التحقق من الرقم بصيغة دولية صحيحة.',
        'التذكير يفتح تطبيق أو متصفح واتساب برسالة جاهزة؛ الإرسال النهائي يتم من قبل موظف العيادة.',
      ],
      en: [
        'Under Daily Operations, appointments are shown by week. A WhatsApp reminder strip appears when a scheduled visit falls into the defined time bands (roughly 22–26 hours ahead for the “24h” type, and 1–3 hours ahead for the “2h” type).',
        'You can also open WhatsApp manually from the message button next to each scheduled row that has a phone number — use a correct international format when possible.',
        'Reminders open WhatsApp with a prefilled message; your staff sends the final message.',
      ],
    },
  },
  {
    title: { ar: '٥. الفواتير والصندوق والتقارير', en: '5. Invoices, cashbox & reports' },
    paragraphs: {
      ar: [
        'تُسجَّل الفواتير والحركات المالية محلياً. راجع التقارير دورياً لمتابعة الإيرادات والديون حسب إعدادات العيادة.',
      ],
      en: [
        'Invoices and cash movements are recorded locally. Review reports periodically for revenue and balances.',
      ],
    },
  },
  {
    title: { ar: '٦. النسخ الاحتياطي والاستعادة', en: '6. Backup & restore' },
    paragraphs: {
      ar: [
        'من الإعدادات (صلاحية الطبيب) استخدم «تصدير نسخة مشفّرة» بعبارة مرور قوية (8 أحرف على الأقل) واحفظ الملف في مكان آمن خارج الجهاز (قرص USB، خادم داخلي، إلخ).',
        'الاستعادة تستبدل قاعدة البيانات بالكامل — استخدمها بحذر وبعد التأكد من صحة الملف.',
        'بعد استيراد نسخة احتياطية يُنصح بإعادة تشغيل التطبيق.',
      ],
      en: [
        'In Settings (doctor), use “Export encrypted backup” with a strong passphrase (at least 8 characters) and store the file off‑machine (USB, internal server, etc.).',
        'Restore replaces the entire database — use only when you trust the backup file.',
        'Restart the App after a successful restore.',
      ],
    },
  },
  {
    title: { ar: '٧. التفعيل والتجديد', en: '7. Activation & renewal' },
    paragraphs: {
      ar: [
        'من شاشة التفعيل أدخل رقم العملية (مرجع الحوالة) بعد الدفع عبر القناة المعلنة (مثل شام كاش). يُعرض سعر التفعيل السنوي على الشاشة.',
        'عند الموافقة على الطلب يصبح الترخيص سارياً حسب تاريخ الانتهاء المخزّن على الخادم.',
      ],
      en: [
        'On the activation screen, enter the transaction reference after paying through the announced channel (e.g. Sham Cash). The annual activation fee is shown on screen.',
        'Once approved, the license is active according to the expiry stored on the server.',
      ],
    },
  },
]

export function getDocumentationSections(id: DocId): DocSection[] {
  switch (id) {
    case 'privacy':
      return privacySections
    case 'terms':
      return termsSections
    case 'guide':
      return guideSections
    default:
      return []
  }
}

export const DOC_LAST_UPDATED = '2026-04-24'
