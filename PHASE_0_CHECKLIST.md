# Phase 0: Project Setup — Checklist

**Arooth Platform** | Tech Stack: React + shadcn/ui + Tailwind | Laravel | MySQL/Postgres

---

## ✅ Done

| Item | Status | Notes |
|------|--------|-------|
| **Frontend: Vite + React** | ✅ | Already in place |
| **Frontend: Tailwind CSS v4** | ✅ | Configured |
| **Frontend: Path alias @/** | ✅ | vite.config.js + jsconfig.json |
| **Frontend: shadcn/ui** | ✅ | Button, utils, RTL enabled in components.json |
| **Frontend: Localization (i18next)** | ✅ | Arabic (RTL, Tajawal) + English (LTR, Inter) |
| **Frontend: Fonts** | ✅ | Tajawal (Arabic), Inter (English) |
| **Frontend: Language switcher** | ✅ | Dynamic RTL/LTR toggle |
| **Backend: Laravel structure** | 📋 | .env.example, README, .gitignore — run `composer create-project` when PHP installed |

---

## 📋 Pending (run when PHP/Composer available)

| Item | Command / Action |
|------|------------------|
| Laravel project | `cd backend && composer create-project laravel/laravel . --prefer-dist` |
| Database setup | Configure .env, run `php artisan migrate` |
| CORS for frontend | Ensure `config/cors.php` allows `http://localhost:5173` |

---

## 📁 Project Structure

```
orood/
├── frontend/                 # React + Vite + shadcn/ui + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components
│   │   │   └── LanguageSwitcher.jsx
│   │   ├── lib/
│   │   │   ├── utils.js
│   │   │   └── i18n.js
│   │   ├── locales/
│   │   │   ├── ar.json
│   │   │   └── en.json
│   │   └── App.jsx
│   ├── components.json       # shadcn config (RTL: true)
│   └── vite.config.js
├── backend/                  # Laravel (init via composer)
│   ├── .env.example
│   └── README.md
├── PHASE_0_CHECKLIST.md
└── README.md
```

---

## 🧪 Verify Frontend

```bash
cd frontend
npm install
npm run dev
```

- Open http://localhost:5173  
- Confirm Arabic RTL layout and Tajawal font  
- Click language switcher → English LTR, Inter font  
- Confirm shadcn Button renders correctly  

---

## Next Phase: Phase 1 — Auth

- User registration (phone, Absher, documents)
- Laravel Sanctum / JWT
- Protected routes

---

*Generated: Phase 0 — Arooth Project Setup*
