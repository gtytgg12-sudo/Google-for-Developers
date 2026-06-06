// ============================================================================
// Cooking To-Do List Assistant — AI Planner Engine
// Scoring-based selection algorithm. No LLM needed — pure client-side.
// ============================================================================

const Engine = (() => {
  const { INGREDIENTS, SUBSTITUTIONS, RECIPES, SKILL_LABELS, ALLERGY_LABELS } = window.COOKING_DATA;

  // ------------------------------------------------------------------
  // 1. FILTER — hard constraints
  // ------------------------------------------------------------------
  function filterRecipes(prefs) {
    return RECIPES.filter(r => {
      // Dietary filter (if user picked vegetarian, only vegetarian recipes match)
      if (prefs.dietary && prefs.dietary.length > 0) {
        if (prefs.dietary.includes("vegetarian") && !r.diets.includes("vegetarian")) return false;
        if (prefs.dietary.includes("vegan")      && !r.diets.includes("vegan"))      return false;
        if (prefs.dietary.includes("pescatarian") && !r.diets.includes("pescatarian") && !r.diets.includes("vegetarian")) return false;
        if (prefs.dietary.includes("non_vegetarian") && r.diets.includes("vegetarian") && !prefs.dietary.includes("vegetarian")) {
          // allow only if non-veg is the strict choice
        }
        if (prefs.dietary.includes("gluten_free") && !r.diets.includes("gluten_free")) return false;
      }

      // Allergen filter — recipe ingredients must not contain allergens
      for (const ingKey of Object.keys(r.ingredients)) {
        const ing = INGREDIENTS[ingKey];
        if (!ing) continue;
        for (const a of (ing.allergens || [])) {
          if (prefs.allergies.includes(a)) return false;
        }
      }

      // Skill filter — recipe must not exceed user skill
      const skillRank = { beginner: 1, intermediate: 2, advanced: 3 };
      if (skillRank[r.skill] > skillRank[prefs.skill]) return false;

      // Time filter — recipe must fit in available time
      if (r.cookTime > prefs.availableTime) return false;

      return true;
    });
  }

  // ------------------------------------------------------------------
  // 2. SCORE — soft preferences
  // ------------------------------------------------------------------
  function scoreRecipe(r, prefs) {
    let score = 100;

    // Cuisine match
    if (prefs.cuisines && prefs.cuisines.length > 0 && prefs.cuisines.includes(r.cuisine)) {
      score += 30;
    }

    // Calorie target — prefer closer to target
    if (prefs.calorieTarget) {
      const diff = Math.abs(r.nutrition.calories - prefs.calorieTarget / 3); // 3 meals/day
      score -= diff * 0.15;
    }

    // Macro balance — favor protein
    if (r.nutrition.protein > 18) score += 10;

    // Budget fit (per-meal allowance)
    const perMealBudget = prefs.budget / 3;
    if (r.costPerServing <= perMealBudget * 0.6) score += 15;
    else if (r.costPerServing > perMealBudget)     score -= 25;

    // Variety — penalize recent picks
    if (prefs.recentIds && prefs.recentIds.includes(r.id)) score -= 50;

    // Pantry bonus — already-own ingredients
    if (prefs.pantry && prefs.pantry.length > 0) {
      const overlap = Object.keys(r.ingredients).filter(k => prefs.pantry.includes(k)).length;
      score += overlap * 5;
    }

    return score;
  }

  // ------------------------------------------------------------------
  // 3. PICK — best per slot, ensuring variety
  // ------------------------------------------------------------------
  function pickBest(candidates, prefs, slot) {
    const scored = candidates
      .filter(r => r.slot === slot)
      .map(r => ({ r, s: scoreRecipe(r, prefs) }))
      .sort((a, b) => b.s - a.s);
    return scored.length ? scored[0].r : null;
  }

  // ------------------------------------------------------------------
  // 4. GENERATE PLAN
  // ------------------------------------------------------------------
  function generatePlan(prefs) {
    const t0 = performance.now();
    const filtered = filterRecipes(prefs);
    const breakfast = pickBest(filtered, prefs, "breakfast");
    const lunch     = pickBest(filtered, { ...prefs, recentIds: breakfast ? [breakfast.id] : [] }, "lunch");
    const dinner    = pickBest(filtered, { ...prefs, recentIds: [breakfast?.id, lunch?.id].filter(Boolean) }, "dinner");
    const snacks    = filtered.filter(r => r.slot === "snack").slice(0, 2);

    const result = {
      meal_plan: { breakfast, lunch, dinner, snacks },
      budget_analysis: null,
      grocery_list: null,
      substitutions: null,
      cooking_tasks: null,
      _meta: { generation_time_ms: Math.round(performance.now() - t0), total_recipes: filtered.length }
    };

    if (prefs.peopleCount) {
      result.meal_plan.breakfast && scaleMeal(result.meal_plan.breakfast, prefs.peopleCount);
      result.meal_plan.lunch     && scaleMeal(result.meal_plan.lunch,     prefs.peopleCount);
      result.meal_plan.dinner    && scaleMeal(result.meal_plan.dinner,    prefs.peopleCount);
    }

    result.grocery_list   = buildGroceryList(result.meal_plan, prefs.pantry || []);
    result.substitutions  = buildSubstitutions(result.grocery_list);
    result.budget_analysis = analyzeBudget(result, prefs);
    result.cooking_tasks  = buildCookingTasks(result.meal_plan);

    return result;
  }

  // ------------------------------------------------------------------
  // 5. SCALE — multiply ingredients by people count
  // ------------------------------------------------------------------
  function scaleMeal(meal, people) {
    const factor = people / meal.servings;
    for (const k of Object.keys(meal.ingredients)) {
      meal.ingredients[k] = +(meal.ingredients[k] * factor).toFixed(2);
    }
    meal.costPerServing = +(meal.costPerServing * factor * meal.servings / people).toFixed(2);
    meal.totalCost = +(meal.costPerServing * people).toFixed(2);
    meal.servings = people;
  }

  // ------------------------------------------------------------------
  // 6. GROCERY LIST — diff plan ∖ pantry, group by category, sum
  // ------------------------------------------------------------------
  function buildGroceryList(plan, pantry) {
    const items = {}; // key -> { qty, unit, cost, category }
    const slots = ["breakfast", "lunch", "dinner"];
    for (const slot of slots) {
      const meal = plan[slot];
      if (!meal) continue;
      for (const [key, qty] of Object.entries(meal.ingredients)) {
        const ing = INGREDIENTS[key];
        if (!ing) continue;
        if (pantry.includes(key)) continue;
        if (!items[key]) items[key] = { qty: 0, unit: ing.unit, cost: 0, category: ing.category };
        items[key].qty  += qty;
        items[key].cost += qty * (ing.costPerG || ing.costPerPc || ing.costPerMl || 0);
      }
    }
    const grouped = {};
    for (const [k, v] of Object.entries(items)) {
      const ing = INGREDIENTS[k];
      if (!grouped[v.category]) grouped[v.category] = [];
      grouped[v.category].push({
        key: k,
        name: ing.name,
        quantity: Math.ceil(v.qty * 10) / 10,
        unit: v.unit,
        estimated_cost: +v.cost.toFixed(2)
      });
    }
    const total = Object.values(grouped).flat().reduce((s, x) => s + x.estimated_cost, 0);
    return { categories: grouped, total: +total.toFixed(2) };
  }

  // ------------------------------------------------------------------
  // 7. SUBSTITUTIONS — for each grocery item that has a known sub
  // ------------------------------------------------------------------
  function buildSubstitutions(grocery) {
    const subs = {};
    for (const cat of Object.values(grocery.categories)) {
      for (const item of cat) {
        const s = SUBSTITUTIONS[item.key];
        if (!s) continue;
        const cur = INGREDIENTS[item.key];
        const get = key => {
          if (!key || !INGREDIENTS[key]) return null;
          const sub = INGREDIENTS[key];
          return {
            name: sub.name,
            cost_diff: +((item.estimated_cost - (item.quantity * (sub.costPerG || sub.costPerPc || sub.costPerMl || 0)))).toFixed(2)
          };
        };
        subs[item.key] = {
          name: cur.name,
          budget:  get(s.budget),
          healthy: get(s.healthy),
          common:  get(s.common)
        };
      }
    }
    return subs;
  }

  // ------------------------------------------------------------------
  // 8. BUDGET — compare grocery cost vs user budget
  // ------------------------------------------------------------------
  function analyzeBudget(result, prefs) {
    const groceryCost = result.grocery_list.total;
    const withinBudget = groceryCost <= prefs.budget;
    const overage = +(groceryCost - prefs.budget).toFixed(2);
    const remaining = +(prefs.budget - groceryCost).toFixed(2);

    const suggestions = [];
    if (!withinBudget) {
      // suggest top 3 cheapest substitutions
      const swaps = Object.entries(result.substitutions || {})
        .map(([k, v]) => ({ k, v, save: v.budget?.cost_diff }))
        .filter(x => x.save < 0)
        .sort((a, b) => a.save - b.save)
        .slice(0, 4);
      for (const s of swaps) {
        suggestions.push(`Swap ${INGREDIENTS[s.k].name} → ${s.v.budget.name} (save $${Math.abs(s.save).toFixed(2)})`);
      }
    }

    return {
      user_budget: prefs.budget,
      grocery_cost: groceryCost,
      within_budget: withinBudget,
      overage,
      remaining,
      suggestions
    };
  }

  // ------------------------------------------------------------------
  // 9. COOKING TASKS — generate checklist per meal
  // ------------------------------------------------------------------
  function buildCookingTasks(plan) {
    const tasks = {};
    const build = (slot) => {
      const meal = plan[slot];
      if (!meal) return [];
      const t = [
        { task: "Gather ingredients", est_min: Math.min(5, Math.ceil(meal.ingredients.length * 0.5)) },
        { task: "Wash & prep vegetables", est_min: 5 },
        { task: "Measure spices & aromatics", est_min: 3 },
        ...meal.steps.map(s => ({ task: s, est_min: Math.ceil(meal.cookTime / meal.steps.length) })),
        { task: "Plate & serve", est_min: 3 },
        { task: "Store leftovers", est_min: 2 }
      ];
      return t.map((x, i) => ({ id: `${slot[0]}${i+1}`, text: x.task, est_min: x.est_min, done: false }));
    };
    tasks.breakfast = build("breakfast");
    tasks.lunch     = build("lunch");
    tasks.dinner    = build("dinner");
    return tasks;
  }

  // ------------------------------------------------------------------
  // 10. OPTIMIZE — apply a single substitution
  // ------------------------------------------------------------------
  function applySubstitution(plan, subs, key, type) {
    const subInfo = subs[key];
    if (!subInfo || !subInfo[type]) return { plan, subs, grocery_list: null, budget_analysis: null };
    const target = subInfo[type].name.toLowerCase().replace(/\s+/g, "_");
    const newGrocery = JSON.parse(JSON.stringify(plan.grocery_list || {}));
    // Recompute after manual swap — re-derive from current state
    // For simplicity, just adjust cost for this one item
    for (const cat of Object.values(newGrocery.categories || {})) {
      for (const item of cat) {
        if (item.key === key) {
          const newIng = INGREDIENTS[target];
          if (newIng) {
            item.name = newIng.name;
            item.key = target;
            item.estimated_cost = +(item.quantity * (newIng.costPerG || newIng.costPerPc || newIng.costPerMl || 0)).toFixed(2);
          }
        }
      }
    }
    newGrocery.total = Object.values(newGrocery.categories).flat().reduce((s, x) => s + x.estimated_cost, 0);
    newGrocery.total = +newGrocery.total.toFixed(2);
    return { plan, grocery_list: newGrocery };
  }

  return { generatePlan, applySubstitution };
})();

window.Engine = Engine;
