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

## النشر على Netlify

1. [Netlify](https://www.netlify.com/) → **Add new site** → **Import an existing project**
2. اربط المستودع: [DentAssist-Pro](https://github.com/mohammedshaaban9400-jpg/DentAssist-Pro)
3. Netlify يقرأ `netlify.toml` تلقائياً:
   - **Build:** `npm run build:web`
   - **Publish:** `dist-web`
4. في **Site configuration → Environment variables** أضف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy site**

التوجيه يستخدم `HashRouter` (`#/patients`) — لا حاجة لإعادة كتابة مسارات على Netlify.

## النشر على GitHub Pages

1. في إعدادات المستودع: **Settings → Pages → Source: GitHub Actions**
2. (اختياري) أضف أسراراً في **Settings → Secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. عند كل دفع إلى `main` يُنشر الموقع تلقائياً.

الرابط المتوقع: `https://mohammedshaaban9400-jpg.github.io/DentAssist-Pro/`

## ملاحظة

هذا المستودع مخصّص لنسخة **الويب** فقط. تطبيق Windows (exe) يُبنى من المشروع الكامل محلياً عبر `npm run dist`.
