// pulse.js — the honest at-a-glance. JOLTS headline tiles + the tier-honest AI counter.
// The headline shows B1 (stated-by-firm) ONLY. B2 is a distinct band; B3 is shown but
// explicitly EXCLUDED from the headline; B0 is the visible denominator.

import { el, fmtCompact, fmtInt, fmtPct, fmtMonth, joltsToPeople, TIER_META, TIER_COLORS } from "./util.js";
import { sparkline } from "./charts/charts.js";

const JOLTS_TILES = [
  ["job_openings", "Openings"],
  ["hires", "Hires"],
  ["quits", "Quits"],
  ["layoffs_discharges", "Layoffs & Discharges"],
];

function tierTotals(events) {
  const t = { B1: { c: 0, h: 0 }, B2: { c: 0, h: 0 }, B3: { c: 0, h: 0 }, B0: { c: 0, h: 0 } };
  for (const e of events) {
    const b = e.ai_attribution;
    if (!t[b]) continue;
    t[b].c++;
    // headline integrity: B1 only counts toward the verified headline when A1/A2.
    const counts = !(b === "B1" && e.event_confidence === "A3");
    if (counts) t[b].h += e.headcount || 0;
  }
  return t;
}

function joltsTile(series, label) {
  const obs = (series?.observations || []).filter((o) => o.value != null);
  const last = obs[obs.length - 1];
  const prev = obs[obs.length - 2];
  const people = last ? joltsToPeople(last.value) : null;
  const delta = last && prev ? (last.value - prev.value) / prev.value : null;
  const tile = el("div", { class: "tile reveal" },
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, fmtCompact(people)),
    el("div", { class: "sub" },
      last ? fmtMonth(last.period) : "—",
      delta != null ? el("span", {}, `  ${delta >= 0 ? "▲" : "▼"} ${fmtPct(Math.abs(delta), 1)} m/m`) : ""),
    el("div", { class: "spark" }, el("canvas")));
  const canvas = tile.querySelector("canvas");
  queueMicrotask(() => sparkline(canvas, obs.slice(-24).map((o) => o.value), TIER_COLORS.reported || "#6aa3d8"));
  return tile;
}

function tierBar(tt) {
  const total = tt.B1.h + tt.B2.h + tt.B3.h + tt.B0.h || 1;
  const seg = (k) => el("span", { class: `seg-${k}`, style: `width:${(tt[k].h / total) * 100}%`,
    title: `${k} ${TIER_META[k].name}: ${fmtInt(tt[k].h)} people across ${tt[k].c} event(s)` });
  return el("div", { class: "tierbar", role: "img", "aria-label": "Headcount by AI-attribution tier" },
    seg("B1"), seg("B2"), seg("B3"), seg("B0"));
}

function legendItem(k, tt, { excluded = false, denom = false } = {}) {
  const meta = TIER_META[k];
  return el("div", { class: "item" },
    el("span", { class: "swatch", style: `background:${TIER_COLORS[k]}` }),
    el("span", { class: excluded ? "excluded" : "" },
      el("b", {}, k), ` ${meta.name} · `, fmtInt(tt[k].h), " ppl / ", String(tt[k].c), " ev",
      excluded ? " — excluded from headline" : "", denom ? " — denominator" : ""));
}

export function renderPulse(state, mount) {
  const { jolts, events, discrepancy } = state.data;
  const evs = events?.events || [];
  const tt = tierTotals(evs);

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "Pulse"),
    el("p", {}, "The honest at-a-glance: the measured baseline, and the AI-attribution claim broken into its tiers so the strongest signal can never be confused with the narrative.")));

  // JOLTS tiles
  const tiles = el("div", { class: "grid tiles" });
  for (const [key, label] of JOLTS_TILES) tiles.append(joltsTile(jolts?.series?.[key], label));
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Measured baseline — JOLTS (SA, level)"),
    tiles,
    el("p", { class: "inline-disclaimer" }, "JOLTS measures churn with rigor but cannot attribute causation. It is the honest denominator the narrative layer lacks.")));

  // The tier-honest AI counter
  const counter = el("div", { class: "counter reveal" },
    el("div", { class: "eyebrow" }, "AI-attributed job cuts — in the ledger"),
    el("div", { class: "headline" },
      el("span", { class: "num" }, fmtInt(tt.B1.h)),
      el("span", { class: "unit" }, "people"),
      el("span", { class: "tag" }, "B1 · stated-by-firm · A1/A2-verified only")),
    el("p", { class: "epistemic" },
      "This headline counts ", el("b", {}, "only"), " cuts the firm itself attributed to AI (tier B1), corroborated at A1/A2. ",
      "Inferred cases (B2) are a separate band. Narrative-only claims (B3) are shown below but ",
      el("b", {}, "never added to this number"), ". Most layoffs are B0 — not AI-attributed — and form the denominator."),
    tierBar(tt),
    el("div", { class: "tier-legend" },
      legendItem("B1", tt),
      legendItem("B2", tt),
      legendItem("B3", tt, { excluded: true }),
      legendItem("B0", tt, { denom: true })));
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "The number, handled correctly"),
    counter));

  // Discrepancy teaser (latest overlapping month)
  const rows = (discrepancy?.months || []).filter((m) => m.challenger_ai_cited != null);
  const latest = rows[rows.length - 1];
  if (latest) {
    mount.append(el("section", {},
      el("h3", { class: "section-title" }, "Claimed vs. corroborated — latest month"),
      el("div", { class: "panel" },
        el("p", {}, `In ${fmtMonth(latest.month)}, Challenger reported `,
          el("b", { class: "mono" }, fmtInt(latest.challenger_ai_cited)), " AI-cited cuts. Our B1-verified total was ",
          el("b", { class: "mono" }, fmtInt(latest.lm_b1_verified)), "."),
        el("div", { class: "gap-callout" }, "The gap — ", el("b", {}, fmtInt(latest.gap), " people"),
          " — is not an error to reconcile. It is the measurement of the strategic layer. ",
          el("a", { href: "#/attribution" }, "See the divergence over time →")))));
  }
}
