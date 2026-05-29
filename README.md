# DentAssist Pro — Web

نسخة الويب (PWA) من نظام إدارة عيادة الأسنان — تعمل على الهاتف والتابلت والمتصفح.

## التشغيل محلياً

```bash
npm install
npm run dev:web
```

## البناء

```bash
npm run build:web
```

الناتج في مجلد `dist-web`.

## النشر على GitHub Pages

1. في إعدادات المستودع: **Settings → Pages → Source: GitHub Actions**
2. (اختياري) أضف أسراراً في **Settings → Secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. عند كل دفع إلى `main` يُنشر الموقع تلقائياً.

الرابط المتوقع: `https://mohammed940.github.io/cental/`

## ملاحظة

هذا المستودع مخصّص لنسخة **الويب** فقط. تطبيق Windows (exe) يُبنى من المشروع الكامل محلياً عبر `npm run dist`.
