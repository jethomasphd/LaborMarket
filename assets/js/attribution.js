// attribution.js — "How we verify." The two-question rubric in plain language, how the AI
// claim breaks down over time, and the centerpiece: what's BLAMED on AI vs. what's CONFIRMED.

import { el, fmtInt, fmtMonth, plainTier, TIER_META, TIER_COLORS, AXIS } from "./util.js";
import { stackedArea, discrepancyDivergence } from "./charts/charts.js";

function rubricCards(tiers) {
  return el("div", { class: "rubric" }, ...tiers.map((t) =>
    el("div", { class: `card ${t}` },
      el("h4", {}, plainTier(t), el("span", { class: `badge tier-${t}` }, t)),
      el("p", {}, TIER_META[t].desc))));
}

export function renderAttribution(state, mount) {
  const attribution = state.data.attribution;
  const discrepancy = state.data.discrepancy;

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "How we verify — claimed vs. confirmed"),
    el("p", {}, "“X jobs lost to AI” is one of the shakiest numbers going around. It quietly blends four different things: AI literally doing the work, budgets shifting from people to AI, ordinary cuts dressed up as “AI”, and plain guesswork. So we never report it as one confident figure — we report a claim, and we say exactly how solid it is.")));

  // The two questions
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, `Question 1 — ${AXIS.A.label}`),
    rubricCards(["A1", "A2", "A3"])));
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, `Question 2 — ${AXIS.B.label}`),
    rubricCards(["B1", "B2", "B3", "B0"])));

  // Why "because of AI" is slippery
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Why “because of AI” is slippery"),
    el("div", { class: "panel" },
      el("p", {}, "Often the AI isn't doing the job — the ", el("em", {}, "budget"),
        " for the job is just being moved to AI. Losing your role because the company bought software is real, but it isn't the same as a robot doing your tasks. That's why we keep two labels: ",
        el("b", {}, plainTier("B1")), " (the company said it) versus ", el("b", {}, plainTier("B2")),
        " (we think it's likely, but they didn't say so). We never pass our guess off as their statement."))));

  // Composition over time
  const months = (attribution?.months || []);
  if (months.length) {
    const c = el("canvas");
    mount.append(el("section", {},
      el("h3", { class: "section-title" }, "The AI claim over time, by how solid it is"),
      el("div", { class: "panel" }, el("div", { class: "chart-box tall" }, c),
        el("p", { class: "inline-disclaimer" }, "Stacked by strength of evidence. “Company blames AI” and “Likely AI-related” are kept separate from “Only headlines say AI” and “Not about AI.” They are never merged into a single number."))));
    const labels = months.map((m) => m.month);
    const ds = (t) => ({ label: plainTier(t), data: months.map((m) => m.headcount[t]),
      borderColor: TIER_COLORS[t], backgroundColor: TIER_COLORS[t] + "55" });
    queueMicrotask(() => stackedArea(c, labels, [ds("B1"), ds("B2"), ds("B3"), ds("B0")]));
  }

  // The discrepancy centerpiece
  const box = el("div", { class: "discrepancy panel" });
  box.append(
    el("div", { class: "legend" },
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.muted}` }), "Blamed on AI (claimed)"),
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.B1}` }), "Confirmed by the company"),
      el("span", { class: "k" }, el("span", { class: "line", style: `background:${TIER_COLORS.alert}` }), "The gap")),
    (() => { const d = el("div", { class: "chart-box" }); queueMicrotask(() => discrepancyDivergence(d, discrepancy?.months || [])); return d; })());

  const rows = (discrepancy?.months || []).filter((m) => m.challenger_ai_cited != null);
  const latest = rows[rows.length - 1];
  if (latest) {
    box.append(el("div", { class: "gap-callout" },
      `${fmtMonth(latest.month)}: `, el("b", {}, fmtInt(latest.challenger_ai_cited)), " jobs were blamed on AI; we could confirm the company itself said so for ",
      el("b", {}, fmtInt(latest.lm_b1_verified)), ". The gap of ",
      el("b", {}, fmtInt(latest.gap), " people"), " is the measurement — the distance between the story and the evidence, not an error to fix."));
  }

  const trs = (discrepancy?.months || []).map((m) => el("tr", {},
    el("td", { class: "mono" }, fmtMonth(m.month)),
    el("td", { class: "num" }, m.challenger_ai_cited == null ? "—" : fmtInt(m.challenger_ai_cited)),
    el("td", { class: "num" }, fmtInt(m.lm_b1_verified)),
    el("td", { class: "num" }, `${m.lm_b1_event_count}`),
    el("td", { class: "num", style: `color:${TIER_COLORS.alert}` }, m.gap == null ? "—" : fmtInt(m.gap))));

  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Blamed on AI vs. confirmed by the company"),
    box,
    el("div", { class: "table-wrap", style: "margin-top:1rem" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Month"), el("th", {}, "Blamed on AI"), el("th", {}, "Confirmed"), el("th", {}, "Confirmed cases"), el("th", {}, "Gap"))),
      el("tbody", {}, ...trs)))));
}
