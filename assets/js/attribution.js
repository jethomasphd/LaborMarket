// attribution.js — the epistemics tab. The rubric in plain language, B-tier composition
// over time, and the discrepancy panel: Challenger AI-cited vs our B1-verified, gap as its own series.

import { el, fmtInt, fmtMonth, TIER_META, TIER_COLORS } from "./util.js";
import { stackedArea, discrepancyDivergence } from "./charts/charts.js";

function rubricCards(tiers, axisClass) {
  return el("div", { class: "rubric" }, ...tiers.map((t) =>
    el("div", { class: `card ${axisClass ? t : ""}` },
      el("h4", {}, el("span", { class: `badge tier-${t}` }, t), "  ", TIER_META[t].name),
      el("p", {}, TIER_META[t].desc))));
}

export function renderAttribution(state, mount) {
  const attribution = state.data.attribution;
  const discrepancy = state.data.discrepancy;

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "Attribution — the epistemics"),
    el("p", {}, "“X jobs lost to AI” is a contested casualty count. It silently fuses task substitution, budget reallocation, narrative laundering, and genuine uncertainty. We never report it as one confident number — we report a claim, attributed and tiered.")));

  // The rubric
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Axis A — did the layoff happen?"),
    rubricCards(["A1", "A2", "A3"], false)));
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Axis B — is AI actually the cause?"),
    rubricCards(["B1", "B2", "B3", "B0"], true)));

  // Money vs the job
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "The money vs. the job"),
    el("div", { class: "panel" },
      el("p", {}, "Even where AI is not literally performing the role, the ", el("em", {}, "budget"),
        " for the role is often redirected to AI capex. Direct task substitution (the job) and headcount-to-AI reallocation (the money) are different mechanisms. This is exactly why attribution must be tiered, not asserted: B1 is what the firm states; B2 is our labeled inference where the money moved but the firm did not say AI."))));

  // B-tier composition over time
  const months = (attribution?.months || []);
  if (months.length) {
    const c = el("canvas");
    mount.append(el("section", {},
      el("h3", { class: "section-title" }, "AI-attribution composition over time (headcount)"),
      el("div", { class: "panel" }, el("div", { class: "chart-box tall" }, c),
        el("p", { class: "inline-disclaimer" }, "Stacked by tier. B1 (stated-by-firm) and B2 (inferred) are kept visually distinct from B3 (narrative-only) and B0 (not attributed). They are never summed into a single headline."))));
    const labels = months.map((m) => m.month);
    const ds = (tier) => ({ label: `${tier} ${TIER_META[tier].name}`, data: months.map((m) => m.headcount[tier]),
      borderColor: TIER_COLORS[tier], backgroundColor: TIER_COLORS[tier] + "55" });
    queueMicrotask(() => stackedArea(c, labels, [ds("B1"), ds("B2"), ds("B3"), ds("B0")]));
  }

  // Discrepancy panel (required)
  const box = el("div", { class: "discrepancy panel" });
  box.append(
    el("div", { class: "legend" },
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.muted}` }), "Challenger AI-cited (claim)"),
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.B1}` }), "LaborMarket.ai B1-verified"),
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.alert}` }), "The gap (own series)")),
    (() => { const d = el("div", { class: "chart-box" }); queueMicrotask(() => discrepancyDivergence(d, discrepancy?.months || [])); return d; })());

  const rows = (discrepancy?.months || []).filter((m) => m.challenger_ai_cited != null);
  const latest = rows[rows.length - 1];
  if (latest) {
    box.append(el("div", { class: "gap-callout" },
      `${fmtMonth(latest.month)}: Challenger `, el("b", {}, fmtInt(latest.challenger_ai_cited)),
      " AI-cited vs. our ", el("b", {}, fmtInt(latest.lm_b1_verified)), " B1-verified → gap ",
      el("b", {}, fmtInt(latest.gap), " people"), ". The gap is the measurement, not an error to reconcile."));
  }

  // Monthly table
  const trs = (discrepancy?.months || []).map((m) => el("tr", {},
    el("td", { class: "mono" }, fmtMonth(m.month)),
    el("td", { class: "num" }, m.challenger_ai_cited == null ? "—" : fmtInt(m.challenger_ai_cited)),
    el("td", { class: "num" }, fmtInt(m.lm_b1_verified)),
    el("td", { class: "num" }, `${m.lm_b1_event_count}`),
    el("td", { class: "num", style: `color:${TIER_COLORS.alert}` }, m.gap == null ? "—" : fmtInt(m.gap))));

  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Discrepancy panel — claimed vs. corroborated"),
    box,
    el("div", { class: "table-wrap", style: "margin-top:1rem" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Month"), el("th", {}, "Challenger AI-cited"), el("th", {}, "B1-verified"), el("th", {}, "B1 events"), el("th", {}, "Gap"))),
      el("tbody", {}, ...trs)))));
}
