# 🍳 Cooking To-Do List Assistant

An AI-powered micro-app that generates personalized daily meal plans, grocery lists, budget analysis, and step-by-step cooking checklists — all in 30 seconds.

## 🚀 One-time setup (10 seconds)

The code is fully deployed to the `gh-pages` branch. To activate the live site:

1. Go to **https://github.com/gtytgg12-sudo/Google-for-Developers/settings/pages**
2. Under **Source**, select **"Deploy from a branch"**
3. Choose branch **`gh-pages`**, folder **`/` (root)**
4. Click **Save**

Within ~30 seconds, your site will be live at:

### 👉 **https://gtytgg12-sudo.github.io/Google-for-Developers/**

---

## ✨ Features

- 🎯 **Personalized meal plans** — 30+ curated recipes across 8 cuisines
- 🥗 **Dietary filters** — Vegetarian, Vegan, Pescatarian, Non-Veg, Gluten-free
- ⚠️ **Allergy safe** — 8 common allergens automatically excluded
- 💰 **Budget engine** — Smart cost analysis with savings suggestions
- 🔄 **Ingredient substitutions** — Budget, healthy & common household swaps
- 🛒 **Grocery list** — Categorized, checkable, shareable via WhatsApp
- ✅ **Cooking checklists** — Per-meal task tracking with time estimates
- 📊 **Nutrition tracking** — Calorie ring + macro breakdown (P/C/F)
- 💾 **Offline-first** — All state cached in `localStorage`
- 📱 **Mobile-first PWA** — Installable, dark mode, safe-area aware
- 🔁 **One-tap regenerate** — Different plan every time

## 🏗️ Architecture

```
/
├── index.html                  # App shell with all 5 screens
├── assets/
│   ├── css/styles.css          # Design system (warm palette, dark mode)
│   └── js/
│       ├── data.js             # 30+ recipes, 60+ ingredients, subs
│       ├── engine.js           # Filter → Score → Pick (with variety)
│       └── app.js              # UI state machine & event wiring
└── .github/workflows/deploy.yml # Auto-deploy to gh-pages on push
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
  - 50 if recently picked        // variety across meals
  + 5 × pantry overlap          // use what you have
```

**Hard filters:** dietary, allergens, skill level, available time.

## 🧪 Local Development

```bash
git clone https://github.com/gtytgg12-sudo/Google-for-Developers.git
cd Google-for-Developers
python -m http.server 8000
# open http://localhost:8000
```

## 📦 Deployment

Every push to `main` auto-rebuilds the `gh-pages` branch via the included workflow.

## 📄 License

MIT
