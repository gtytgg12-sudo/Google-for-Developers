# 🍳 Cooking To-Do List Assistant

An AI-powered micro-app that generates personalized daily meal plans, grocery lists, budget analysis, and step-by-step cooking checklists — all in 30 seconds.

> **Live demo:** [https://gtytgg12-sudo.github.io/Google-for-Developers/](https://gtytgg12-sudo.github.io/Google-for-Developers/)

## ✨ Features

- 🎯 **Personalized meal plans** — 30+ curated recipes across 8 cuisines
- 🥗 **Dietary filters** — Vegetarian, Vegan, Pescatarian, Non-Veg, Gluten-free
- ⚠️ **Allergy safe** — 8 common allergens automatically excluded
- 💰 **Budget engine** — Smart cost analysis with savings suggestions
- 🔄 **Ingredient substitutions** — Budget, healthy & common household swaps
- 🛒 **Grocery list** — Categorized, checkable, shareable
- ✅ **Cooking checklists** — Per-meal task tracking with time estimates
- 📊 **Nutrition tracking** — Calorie ring + macro breakdown
- 💾 **Offline-first** — All state cached in `localStorage`
- 📱 **Mobile-first PWA** — Works on any device, installable

## 🏗️ Architecture

```
/
├── index.html                  # App shell with all 5 screens
├── assets/
│   ├── css/styles.css          # Design system (warm palette, dark mode)
│   └── js/
│       ├── data.js             # Recipe & ingredient knowledge base
│       ├── engine.js           # AI scoring, budget, grocery engines
│       └── app.js              # UI state machine & event wiring
└── .github/workflows/deploy.yml # Auto-deploy to GitHub Pages
```

## 🤖 The "AI" Engine

Pure client-side scoring algorithm. No LLM API needed.

```js
score = 100
  + 30 if cuisine matches preference
  - 15% × |calorie_diff|        // balance to target
  + 10 if high protein (>18g)
  + 15 if well under per-meal budget
  - 25 if over per-meal budget
  - 50 if recently picked        // variety
  + 5 × pantry overlap          // use what you have
```

Hard filters: dietary, allergens, skill level, available time.

## 🚀 Local Development

```bash
git clone https://github.com/gtytgg12-sudo/Google-for-Developers.git
cd Google-for-Developers
python -m http.server 8000
# open http://localhost:8000
```

## 📦 Deployment

Auto-deployed to GitHub Pages on every push to `main` via the included workflow.

## 📄 License

MIT
