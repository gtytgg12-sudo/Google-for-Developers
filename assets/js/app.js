// ============================================================================
// Cooking To-Do List Assistant — App state machine & UI controller
// ============================================================================

(() => {
  const { INGREDIENTS, DIET_LABELS, SKILL_LABELS, ALLERGY_LABELS, CUISINE_OPTIONS } = window.COOKING_DATA;

  // ---------------------- STATE ----------------------
  const state = {
    step: 1,
    prefs: {
      peopleCount: 2,
      pantry: [],
      dietary: ["vegetarian"],
      allergies: [],
      budget: 25,
      skill: "beginner",
      availableTime: 45,
      cuisines: ["Indian"],
      calorieTarget: 2000
    },
    plan: null,
    activeScreen: "onboarding",
    activeTaskSlot: "breakfast",
    groceryChecked: {}
  };

  // ---------------------- DOM HELPERS ----------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, props = {}, children = []) => {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  };

  // ---------------------- TOAST ----------------------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------------------- SCREEN SWITCHING ----------------------
  function showScreen(name) {
    state.activeScreen = name;
    $$(".screen").forEach(s => s.classList.remove("active"));
    const map = { onboarding: "screen-onboarding", loading: "screen-loading",
                  home: "screen-dashboard", grocery: "screen-grocery",
                  budget: "screen-budget", tasks: "screen-tasks" };
    const id = map[name];
    if (id) $("#" + id).classList.add("active");
    window.scrollTo(0, 0);
  }

  // ====================================================
  // ============== ONBOARDING SCREEN ===================
  // ====================================================
  function setStep(n) {
    state.step = n;
    $$(".onb-step").forEach(s => s.classList.toggle("active", +s.dataset.step === n));
    $$("#step-dots .dot").forEach((d, i) => d.classList.toggle("active", i < n));
    $("#onb-back").disabled = n === 1;
    $("#onb-next").textContent = n === 7 ? "🍳 Generate Plan" : "Next →";
    window.scrollTo(0, 0);
  }

  function buildDietChips() {
    const wrap = $("#diet-chips");
    wrap.innerHTML = "";
    Object.entries(DIET_LABELS).forEach(([k, v]) => {
      const c = el("button", { class: "big-chip", "data-key": k }, [
        el("span", { class: "icon" }, v.icon), v.label
      ]);
      c.addEventListener("click", () => {
        if (state.prefs.dietary.includes(k)) state.prefs.dietary = state.prefs.dietary.filter(x => x !== k);
        else state.prefs.dietary = [...state.prefs.dietary, k];
        c.classList.toggle("selected");
      });
      if (state.prefs.dietary.includes(k)) c.classList.add("selected");
      wrap.appendChild(c);
    });
  }

  function buildAllergyChips() {
    const wrap = $("#allergy-chips");
    wrap.innerHTML = "";
    Object.entries(ALLERGY_LABELS).forEach(([k, v]) => {
      const c = el("button", { class: "big-chip", "data-key": k }, [
        el("span", { class: "icon" }, "⚠️"), v
      ]);
      c.addEventListener("click", () => {
        if (state.prefs.allergies.includes(k)) state.prefs.allergies = state.prefs.allergies.filter(x => x !== k);
        else state.prefs.allergies = [...state.prefs.allergies, k];
        c.classList.toggle("selected");
      });
      wrap.appendChild(c);
    });
  }

  function buildCuisineChips() {
    const wrap = $("#cuisine-chips");
    wrap.innerHTML = "";
    CUISINE_OPTIONS.forEach(cui => {
      const c = el("button", { class: "big-chip", "data-key": cui }, [
        el("span", { class: "icon" }, "🌍"), cui
      ]);
      c.addEventListener("click", () => {
        if (state.prefs.cuisines.includes(cui)) state.prefs.cuisines = state.prefs.cuisines.filter(x => x !== cui);
        else state.prefs.cuisines = [...state.prefs.cuisines, cui];
        c.classList.toggle("selected");
      });
      if (state.prefs.cuisines.includes(cui)) c.classList.add("selected");
      wrap.appendChild(c);
    });
  }

  function buildSkillCards() {
    const wrap = $("#skill-cards");
    wrap.innerHTML = "";
    const skills = [
      { k: "beginner", icon: "👶", l: "Easy" },
      { k: "intermediate", icon: "👨‍🍳", l: "Medium" },
      { k: "advanced", icon: "🧑‍🍳", l: "Hard" }
    ];
    skills.forEach(s => {
      const c = el("button", { class: "skill-card" }, [
        el("span", { class: "sk-icon" }, s.icon), s.l
      ]);
      c.addEventListener("click", () => {
        state.prefs.skill = s.k;
        $$(".skill-card").forEach(x => x.classList.remove("selected"));
        c.classList.add("selected");
      });
      if (state.prefs.skill === s.k) c.classList.add("selected");
      wrap.appendChild(c);
    });
  }

  function buildPantryChips(filter = "") {
    const wrap = $("#pantry-chips");
    wrap.innerHTML = "";
    const keys = Object.keys(INGREDIENTS)
      .filter(k => k.toLowerCase().includes(filter.toLowerCase()) ||
                   INGREDIENTS[k].name.toLowerCase().includes(filter.toLowerCase()));
    keys.slice(0, 30).forEach(k => {
      const ing = INGREDIENTS[k];
      const c = el("button", { class: "chip" }, ing.name);
      if (state.prefs.pantry.includes(k)) c.classList.add("selected");
      c.addEventListener("click", () => {
        if (state.prefs.pantry.includes(k)) state.prefs.pantry = state.prefs.pantry.filter(x => x !== k);
        else state.prefs.pantry = [...state.prefs.pantry, k];
        c.classList.toggle("selected");
        updatePantrySelected();
      });
      wrap.appendChild(c);
    });
  }

  function updatePantrySelected() {
    $("#pantry-selected").textContent = state.prefs.pantry.length
      ? `${state.prefs.pantry.length} item${state.prefs.pantry.length > 1 ? "s" : ""} in pantry`
      : "";
  }

  function wireOnboarding() {
    // People counter
    $$(".counter-btn").forEach(b => {
      b.addEventListener("click", () => {
        const target = b.dataset.target;
        const delta = +b.dataset.delta;
        state.prefs[target] = Math.max(1, Math.min(20, state.prefs[target] + delta));
        $("#" + target + "-val").textContent = state.prefs[target];
      });
    });

    // Sliders
    ["budget", "time", "calories"].forEach(id => {
      const map = { budget: "budget", time: "availableTime", calories: "calorieTarget" };
      const sl = $("#" + id);
      const out = $("#" + id + "-val");
      sl.value = state.prefs[map[id]];
      out.textContent = state.prefs[map[id]];
      sl.addEventListener("input", () => {
        state.prefs[map[id]] = +sl.value;
        out.textContent = sl.value;
      });
    });

    // Pantry search
    $("#pantry-search").addEventListener("input", e => buildPantryChips(e.target.value));

    // Build chip groups
    buildDietChips();
    buildAllergyChips();
    buildCuisineChips();
    buildSkillCards();
    buildPantryChips();

    // Nav buttons
    $("#onb-back").addEventListener("click", () => setStep(Math.max(1, state.step - 1)));
    $("#onb-next").addEventListener("click", () => {
      if (state.step < 7) setStep(state.step + 1);
      else generateAndShowPlan();
    });
  }

  // ====================================================
  // ============== PLAN GENERATION =====================
  // ====================================================
  function generateAndShowPlan() {
    showScreen("loading");
    const bar = $("#loading-bar");
    const sub = $("#loading-sub");
    bar.style.width = "10%"; sub.textContent = "Analyzing 30+ recipes...";
    setTimeout(() => { bar.style.width = "40%"; sub.textContent = "Filtering by diet & allergies..."; }, 200);
    setTimeout(() => { bar.style.width = "70%"; sub.textContent = "Scoring best matches for you..."; }, 500);
    setTimeout(() => {
      bar.style.width = "100%";
      sub.textContent = "Building grocery list & budget...";
      state.plan = window.Engine.generatePlan(state.prefs);
      localStorage.setItem("cooking_prefs", JSON.stringify(state.prefs));
      localStorage.setItem("cooking_plan", JSON.stringify(state.plan));
      setTimeout(() => renderDashboard(), 300);
    }, 800);
  }

  // ====================================================
  // ============== DASHBOARD ===========================
  // ====================================================
  function renderDashboard() {
    showScreen("home");
    const p = state.plan;
    if (!p) return;

    // Date
    $("#hdr-date").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    // Totals
    const totalKcal = (p.meal_plan.breakfast?.nutrition.calories || 0)
                    + (p.meal_plan.lunch?.nutrition.calories || 0)
                    + (p.meal_plan.dinner?.nutrition.calories || 0);
    const totalCost = p.grocery_list.total;
    const totalTime = (p.meal_plan.breakfast?.cookTime || 0)
                    + (p.meal_plan.lunch?.cookTime || 0)
                    + (p.meal_plan.dinner?.cookTime || 0);

    $("#kcal-num").textContent = totalKcal;
    $("#cost-num").textContent = "$" + totalCost.toFixed(2);
    $("#budget-display").textContent = "$" + state.prefs.budget;
    $("#time-display").textContent = totalTime + " min";
    $("#serves-display").textContent = state.prefs.peopleCount;

    // Calorie ring
    const pct = Math.min(1, totalKcal / state.prefs.calorieTarget);
    const circ = 2 * Math.PI * 42;
    $("#kcal-ring").style.strokeDashoffset = circ * (1 - pct);

    // Budget banner
    const ba = p.budget_analysis;
    const banner = $("#budget-banner");
    banner.className = "banner " + (ba.within_budget ? "ok" : "danger");
    banner.innerHTML = ba.within_budget
      ? `✅ Within budget — $${ba.remaining.toFixed(2)} remaining`
      : `⚠️ Over budget by $${ba.overage.toFixed(2)} — see ${ba.suggestions.length} savings tips`;

    // Render meal cards
    ["breakfast", "lunch", "dinner"].forEach(slot => {
      const meal = p.meal_plan[slot];
      const card = $("#card-" + slot);
      card.innerHTML = "";
      if (meal) card.appendChild(renderMealCard(meal, slot));
      else card.innerHTML = `<div class="empty"><div class="e-icon">🍽️</div><div class="e-text">No ${slot} matches your filters</div></div>`;
    });

    // Snacks
    const snackRow = $("#card-snacks");
    snackRow.innerHTML = "";
    if (p.meal_plan.snacks && p.meal_plan.snacks.length) {
      p.meal_plan.snacks.forEach(s => {
        snackRow.appendChild(el("div", { class: "snack-card" }, [
          el("div", { class: "snack-emoji" }, "🍎"),
          el("div", { class: "snack-name" }, s.name),
          el("div", { class: "snack-meta" }, `${s.nutrition.calories} kcal · $${s.costPerServing.toFixed(2)}`)
        ]));
      });
    } else {
      snackRow.innerHTML = `<div class="empty"><div class="e-text">No snacks needed today</div></div>`;
    }
  }

  function renderMealCard(meal, slot) {
    const EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
    const card = el("div", { class: "meal-card-inner" });
    card.innerHTML = `
      <div class="meal-img">
        <span>${EMOJI[slot] || "🍽️"}</span>
        <span class="meal-tag">${meal.skill.toUpperCase()}</span>
        <span class="meal-time">⏱ ${meal.cookTime}m</span>
      </div>
      <div class="meal-body">
        <div class="meal-name">${meal.name}</div>
        <div class="meal-cuisine">${meal.cuisine} cuisine · ${meal.servings} servings</div>
        <div class="meal-macros">
          <span class="macro-pill kcal">🔥 ${meal.nutrition.calories} kcal</span>
          <span class="macro-pill prot">💪 ${meal.nutrition.protein}g P</span>
          <span class="macro-pill">🌾 ${meal.nutrition.carbs}g C</span>
          <span class="macro-pill">🥑 ${meal.nutrition.fat}g F</span>
        </div>
        <div class="meal-foot">
          <span class="meal-cost">$${meal.totalCost.toFixed(2)}</span>
          <span class="meal-action">View recipe →</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openMealModal(meal, slot));
    return card;
  }

  // ====================================================
  // ============== MEAL MODAL ==========================
  // ====================================================
  function openMealModal(meal, slot) {
    const m = $("#meal-modal-content");
    const EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
    m.innerHTML = `
      <div class="modal-hero">${EMOJI[slot] || "🍽️"}</div>
      <h2>${meal.name}</h2>
      <div class="modal-sub">${meal.cuisine} · ${meal.servings} servings · ${meal.cookTime} min · ${SKILL_LABELS[meal.skill]}</div>

      <div class="macro-grid">
        <div class="macro-cell"><div class="mc-num">${meal.nutrition.calories}</div><div class="mc-lbl">kcal</div></div>
        <div class="macro-cell"><div class="mc-num">${meal.nutrition.protein}g</div><div class="mc-lbl">protein</div></div>
        <div class="macro-cell"><div class="mc-num">${meal.nutrition.carbs}g</div><div class="mc-lbl">carbs</div></div>
        <div class="macro-cell"><div class="mc-num">${meal.nutrition.fat}g</div><div class="mc-lbl">fat</div></div>
      </div>

      <div class="modal-section">
        <h3>🛒 Ingredients (for ${meal.servings})</h3>
        <ul class="ing-list">
          ${Object.entries(meal.ingredients).map(([k, qty]) => {
            const ing = INGREDIENTS[k];
            return `<li><span>${ing.name}</span><strong>${formatQty(qty, ing.unit)}</strong></li>`;
          }).join("")}
        </ul>
      </div>

      <div class="modal-section">
        <h3>👨‍🍳 Steps</h3>
        <ol class="step-list">
          ${meal.steps.map(s => `<li>${s}</li>`).join("")}
        </ol>
      </div>

      <div class="modal-section">
        <button class="btn btn-primary" id="modal-cook">Start cooking ▶</button>
      </div>
    `;
    $("#meal-modal").classList.add("active");
    $("#modal-cook").addEventListener("click", () => {
      $("#meal-modal").classList.remove("active");
      state.activeTaskSlot = slot;
      renderTasks();
      showScreen("tasks");
    });
  }

  function formatQty(qty, unit) {
    if (unit === "pc") return `${Math.ceil(qty)} pc${qty > 1 ? "s" : ""}`;
    if (unit === "ml") return `${Math.ceil(qty)} ml`;
    if (unit === "g")  return qty >= 1000 ? `${(qty/1000).toFixed(2)} kg` : `${Math.ceil(qty)} g`;
    return `${qty} ${unit}`;
  }

  // ====================================================
  // ============== GROCERY =============================
  // ====================================================
  function renderGrocery() {
    const g = state.plan.grocery_list;
    const wrap = $("#grocery-cats");
    wrap.innerHTML = "";
    const CAT_ICONS = { vegetable: "🥬", fruit: "🍎", dairy: "🥛", protein: "🍗", pantry: "🌾", spice: "🌶️" };
    let total = 0, checked = 0, items = 0;
    Object.entries(g.categories).forEach(([cat, list]) => {
      const catTotal = list.reduce((s, x) => s + x.estimated_cost, 0);
      total += catTotal;
      const block = el("div", { class: "cat-block" });
      block.innerHTML = `
        <div class="cat-head">
          <span><span class="cat-icon">${CAT_ICONS[cat] || "📦"}</span>${cat}</span>
          <span class="cat-total">$${catTotal.toFixed(2)}</span>
        </div>
        <div class="cat-items">
          ${list.map(item => {
            const isChecked = !!state.groceryChecked[item.key];
            if (isChecked) checked++;
            items++;
            return `
              <div class="cat-item ${isChecked ? 'checked' : ''}" data-key="${item.key}">
                <input type="checkbox" ${isChecked ? 'checked' : ''} />
                <span class="ci-name">${item.name}</span>
                <span class="ci-qty">${formatQty(item.quantity, item.unit)}</span>
                <span class="ci-cost">$${item.estimated_cost.toFixed(2)}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;
      wrap.appendChild(block);
    });

    // Wire checkboxes
    $$(".cat-item").forEach(row => {
      row.addEventListener("click", e => {
        const key = row.dataset.key;
        state.groceryChecked[key] = !state.groceryChecked[key];
        renderGrocery();
      });
    });

    $("#grocery-total").textContent = `$${total.toFixed(2)} · ${checked}/${items} bought`;
  }

  // ====================================================
  // ============== BUDGET ==============================
  // ====================================================
  function renderBudget() {
    const b = state.plan.budget_analysis;
    const g = state.plan.grocery_list;
    const pct = Math.min(120, (b.grocery_cost / b.user_budget) * 100);
    $("#meter-fill").style.width = Math.min(100, pct) + "%";
    $("#meter-fill").style.background = pct > 100 ? "#fff" : "#fff";
    $("#meter-spent").textContent = `$${b.grocery_cost.toFixed(2)} spent`;
    $("#meter-budget").textContent = `$${b.user_budget.toFixed(2)} budget`;

    const msg = $("#budget-msg");
    msg.className = "banner " + (b.within_budget ? "ok" : "danger");
    msg.innerHTML = b.within_budget
      ? `🎉 You saved $${b.remaining.toFixed(2)} today! Plenty of room for snacks.`
      : `⚠️ You're $${b.overage.toFixed(2)} over. Try the suggestions below to save.`;

    const sugWrap = $("#budget-suggestions");
    sugWrap.innerHTML = "";
    if (!b.suggestions.length) {
      sugWrap.innerHTML = `<div class="empty"><div class="e-icon">💰</div><div class="e-text">No swaps needed — plan is already optimized!</div></div>`;
    } else {
      b.suggestions.forEach(s => {
        sugWrap.appendChild(el("div", { class: "suggestion" }, [
          el("span", { class: "s-icon" }, "💡"),
          el("span", { class: "s-text" }, s),
          el("span", { class: "s-save" }, "Tap to apply")
        ]));
      });
    }

    // Breakdown by category
    const bdWrap = $("#budget-breakdown");
    bdWrap.innerHTML = "";
    const total = g.total || 1;
    const CAT_ICONS = { vegetable: "🥬", fruit: "🍎", dairy: "🥛", protein: "🍗", pantry: "🌾", spice: "🌶️" };
    Object.entries(g.categories).forEach(([cat, list]) => {
      const catTotal = list.reduce((s, x) => s + x.estimated_cost, 0);
      const row = el("div", { class: "bd-row" });
      row.innerHTML = `
        <span class="bd-icon">${CAT_ICONS[cat] || "📦"}</span>
        <span class="bd-name">${cat}</span>
        <span class="bd-amount">$${catTotal.toFixed(2)}</span>
        <div class="bd-bar"><div style="width:${(catTotal/total)*100}%"></div></div>
      `;
      bdWrap.appendChild(row);
    });
  }

  // ====================================================
  // ============== TASKS ===============================
  // ====================================================
  function renderTasks() {
    const tasks = state.plan.cooking_tasks[state.activeTaskSlot] || [];
    const wrap = $("#task-list");
    wrap.innerHTML = "";
    let done = 0;
    tasks.forEach((t, i) => {
      if (t.done) done++;
      const item = el("div", { class: "task-item" + (t.done ? " done" : "") });
      item.innerHTML = `
        <div class="task-check">${t.done ? "✓" : ""}</div>
        <div class="t-text">${t.text}</div>
        <div class="t-time">${t.est_min}m</div>
      `;
      item.addEventListener("click", () => {
        t.done = !t.done;
        renderTasks();
      });
      wrap.appendChild(item);
    });
    $("#tasks-progress").textContent = `${done} / ${tasks.length} done`;
  }

  // ====================================================
  // ============== WIRING ==============================
  // ====================================================
  function wireGlobal() {
    // Modal close
    $("#meal-modal").addEventListener("click", e => {
      if (e.target.id === "meal-modal") $("#meal-modal").classList.remove("active");
    });

    // Bottom nav
    $$(".bnav").forEach(b => {
      b.addEventListener("click", () => {
        const tab = b.dataset.tab;
        if (tab === "home") renderDashboard();
        else if (tab === "grocery") { renderGrocery(); showScreen("grocery"); }
        else if (tab === "budget")  { renderBudget();  showScreen("budget"); }
        else if (tab === "tasks")   { renderTasks();   showScreen("tasks"); }
      });
    });

    // Back buttons
    $$("[data-back]").forEach(b => b.addEventListener("click", () => renderDashboard()));

    // Quick actions on dashboard
    $("#qa-grocery").addEventListener("click", () => { renderGrocery(); showScreen("grocery"); });
    $("#qa-budget").addEventListener("click",  () => { renderBudget();  showScreen("budget"); });
    $("#qa-subs").addEventListener("click",    () => { showScreen("budget"); toast("💡 See budget tab for swap suggestions"); });

    // Regenerate
    $("#btn-regenerate").addEventListener("click", () => generateAndShowPlan());

    // Task tabs
    $$(".ttab").forEach(t => {
      t.addEventListener("click", () => {
        state.activeTaskSlot = t.dataset.slot;
        $$(".ttab").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        renderTasks();
      });
    });

    // Reset tasks
    $("#tasks-reset").addEventListener("click", () => {
      state.plan.cooking_tasks[state.activeTaskSlot].forEach(t => t.done = false);
      renderTasks();
      toast("Tasks reset");
    });

    // Clear checks
    $("#grocery-clear").addEventListener("click", () => {
      state.groceryChecked = {};
      renderGrocery();
      toast("All items unchecked");
    });

    // Edit budget
    $("#budget-edit").addEventListener("click", () => {
      const v = prompt("Daily budget ($):", state.prefs.budget);
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) {
        state.prefs.budget = n;
        state.plan = window.Engine.generatePlan(state.prefs);
        localStorage.setItem("cooking_prefs", JSON.stringify(state.prefs));
        localStorage.setItem("cooking_plan", JSON.stringify(state.plan));
        renderBudget();
        toast(`Budget set to $${n}`);
      }
    });

    // Share grocery
    $("#grocery-share").addEventListener("click", () => {
      const g = state.plan.grocery_list;
      const lines = ["🛒 *My Grocery List*", ""];
      Object.entries(g.categories).forEach(([cat, list]) => {
        lines.push(`*${cat.toUpperCase()}*`);
        list.forEach(i => lines.push(`• ${i.name} — ${formatQty(i.quantity, i.unit)} ($${i.estimated_cost.toFixed(2)})`));
        lines.push("");
      });
      lines.push(`*Total: $${g.total.toFixed(2)}*`);
      const text = lines.join("\n");
      if (navigator.share) {
        navigator.share({ title: "Grocery List", text }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text).then(() => toast("📋 Copied to clipboard"));
      }
    });
  }

  // ====================================================
  // ============== INIT ================================
  // ====================================================
  function init() {
    wireOnboarding();
    wireGlobal();
    setStep(1);

    // Try restoring previous plan
    const savedPlan = localStorage.getItem("cooking_plan");
    const savedPrefs = localStorage.getItem("cooking_prefs");
    if (savedPlan && savedPrefs) {
      try {
        state.prefs = JSON.parse(savedPrefs);
        state.plan = JSON.parse(savedPlan);
        // Update slider values
        $("#budget").value = state.prefs.budget;
        $("#budget-val").textContent = state.prefs.budget;
        $("#time").value = state.prefs.availableTime;
        $("#time-val").textContent = state.prefs.availableTime;
        $("#calories").value = state.prefs.calorieTarget;
        $("#calories-val").textContent = state.prefs.calorieTarget;
        $("#peopleCount-val").textContent = state.prefs.peopleCount;
        // Rebuild chip groups with restored values
        buildDietChips(); buildAllergyChips(); buildCuisineChips(); buildSkillCards(); buildPantryChips();
        updatePantrySelected();
        // Add a "Continue" hint
        setTimeout(() => toast("👋 Welcome back! Continue or generate a new plan"), 600);
      } catch (e) {
        console.error("Restore failed", e);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
