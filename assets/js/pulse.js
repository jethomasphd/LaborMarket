// pulse.js — the story-first landing. A layperson should grasp the whole point in seconds:
// layoffs are a real human cost, companies increasingly blame AI, but most of that blame is
// unverified. The hero is the gap between CLAIMED and CONFIRMED. Everything is read from data.

import { el, fmtCompact, fmtInt, fmtMonth, joltsToPeople, plainTier, TIER_META, TIER_COLORS } from "./util.js";
import { sparkline } from "./charts/charts.js";

const JOLTS_TILES = [
  ["job_openings", "Job openings"],
  ["hires", "People hired"],
  ["quits", "People who quit"],
  ["layoffs_discharges", "People laid off"],
];

function tierTotals(events) {
  const t = { B1: { c: 0, h: 0 }, B2: { c: 0, h: 0 }, B3: { c: 0, h: 0 }, B0: { c: 0, h: 0 } };
  for (const e of events) {
    const b = e.ai_attribution;
    if (!t[b]) continue;
    t[b].c++;
    if (!(b === "B1" && e.event_confidence === "A3")) t[b].h += e.headcount || 0;
  }
  return t;
}

function cta(href, title, sub) {
  return el("a", { class: "cta", href },
    el("span", { class: "cta-title" }, title),
    el("span", { class: "cta-sub" }, sub),
    el("span", { class: "cta-arrow" }, "→"));
}

export function renderPulse(state, mount) {
  const { jolts, events, discrepancy } = state.data;
  const evs = events?.events || [];
  const tt = tierTotals(evs);
  const rows = (discrepancy?.months || []).filter((m) => m.challenger_ai_cited != null);
  const latest = rows[rows.length - 1];

  // ---------- HERO: the question, then claimed vs confirmed ----------
  const hero = el("section", { class: "hero reveal" },
    el("p", { class: "kicker" }, "The human cost of the AI layoff story"),
    el("h2", { class: "hero-q" }, "Are companies really cutting jobs because of AI?"),
    el("p", { class: "hero-a" },
      "Layoffs are real and rising — a genuine human cost. But the “AI did it” explanation is mostly ",
      el("em", {}, "unverified"), ". This is the distance between what's ",
      el("strong", { class: "claimed-word" }, "claimed"), " and what we can independently ",
      el("strong", { class: "verified-word" }, "confirm"),
      latest ? `, for ${fmtMonth(latest.month)} — the latest month on record.` : "."));

  if (latest) {
    hero.append(el("div", { class: "claim-verify" },
      el("div", { class: "cv-side claimed" },
        el("div", { class: "cv-num" }, fmtInt(latest.challenger_ai_cited)),
        el("div", { class: "cv-label" }, "jobs blamed on AI"),
        el("div", { class: "cv-sub" }, "by companies, trackers and headlines")),
      el("div", { class: "cv-gap" },
        el("div", { class: "cv-gap-num" }, fmtInt(latest.gap)),
        el("div", { class: "cv-gap-label" }, "the gap — blame the evidence doesn't back")),
      el("div", { class: "cv-side verified" },
        el("div", { class: "cv-num" }, fmtInt(latest.lm_b1_verified)),
        el("div", { class: "cv-label" }, "confirmed by the company itself"),
        el("div", { class: "cv-sub" }, "the employer explicitly said AI — our strictest test"))),
      el("p", { class: "hero-foot" }, "That gap is the whole point. ",
        el("a", { href: "#/attribution" }, "See how we verify, month by month →")));
  }
  mount.append(hero);

  // ---------- HOW TO READ THIS ----------
  mount.append(el("section", { class: "explainer" },
    el("div", { class: "ex-card" },
      el("h4", {}, "We separate claim from proof"),
      el("p", {}, "Anyone can say “AI did it.” We only count it as AI when the company itself says so — and we keep everything we can't confirm clearly marked.")),
    el("div", { class: "ex-card" },
      el("h4", {}, "Two questions, never mixed"),
      el("p", {}, "① Did the layoff really happen? ② Is AI actually the cause? We score these separately, so a rumor can never masquerade as a fact.")),
    el("div", { class: "ex-card" },
      el("h4", {}, "Most layoffs aren't about AI"),
      el("p", {}, "Cost-cutting, over-hiring and weak demand still drive the vast majority. AI is a small — but very loud — slice."))));

  // ---------- ZOOM OUT: scale of all job loss (JOLTS, in plain words) ----------
  const layObs = (jolts?.series?.layoffs_discharges?.observations || []).filter((o) => o.value != null);
  const lastLay = layObs[layObs.length - 1];
  const scale = el("section", {},
    el("h3", { class: "section-title" }, "Zoom out — the scale of all job loss"),
    el("div", { class: "panel" },
      el("p", { class: "scale-line" },
        "In a typical month, U.S. employers lay off about ",
        el("b", { class: "big-ember" }, lastLay ? fmtCompact(joltsToPeople(lastLay.value)) : "—"),
        " people", lastLay ? ` (the government's official JOLTS count, ${fmtMonth(lastLay.period)})` : "", ". ",
        latest ? el("span", {}, "The number anyone blamed on AI — ", el("b", {}, fmtInt(latest.challenger_ai_cited)),
          " — is a sliver of that. The part we could actually verify (", el("b", {}, fmtInt(latest.lm_b1_verified)), ") is smaller still.") : ""),
      el("p", { class: "inline-disclaimer" }, "JOLTS measures how many jobs actually end — it can't say why. Challenger counts announced cuts. Different yardsticks, shown together for scale, never added together.")));
  // compact tiles with plain labels
  const tiles = el("div", { class: "grid tiles" });
  for (const [key, label] of JOLTS_TILES) {
    const obs = (jolts?.series?.[key]?.observations || []).filter((o) => o.value != null);
    const last = obs[obs.length - 1];
    const tile = el("div", { class: "tile" },
      el("div", { class: "label" }, label),
      el("div", { class: "value" }, last ? fmtCompact(joltsToPeople(last.value)) : "—"),
      el("div", { class: "sub" }, last ? `per month · ${fmtMonth(last.period)}` : "—"),
      el("div", { class: "spark" }, el("canvas")));
    const cv = tile.querySelector("canvas");
    queueMicrotask(() => sparkline(cv, obs.slice(-24).map((o) => o.value), TIER_COLORS.A2));
    tiles.append(tile);
  }
  scale.append(tiles);
  mount.append(scale);

  // ---------- THE BREAKDOWN: how the AI claim holds up, in plain language ----------
  const total = tt.B1.h + tt.B2.h + tt.B3.h + tt.B0.h || 1;
  const seg = (k) => el("span", { class: `seg-${k}`, style: `width:${(tt[k].h / total) * 100}%`,
    title: `${plainTier(k)} (${k}): ${fmtInt(tt[k].h)} people across ${tt[k].c} event(s)` });
  const legendRow = (k, tagText) => el("div", { class: "item" },
    el("span", { class: "swatch", style: `background:${TIER_COLORS[k]}` }),
    el("span", { class: k === "B3" ? "excluded" : "" },
      el("b", {}, plainTier(k)), ` — ${fmtInt(tt[k].h)} people · ${tt[k].c} event(s)`,
      tagText ? el("span", { class: "ltag" }, ` ${tagText}`) : ""));

  const counter = el("div", { class: "counter reveal" },
    el("div", { class: "eyebrow" }, "Layoffs in our ledger, by what we can prove about AI"),
    el("div", { class: "headline" },
      el("span", { class: "num" }, fmtInt(tt.B1.h)),
      el("span", { class: "unit" }, "people"),
      el("span", { class: "tag" }, "the company itself blamed AI — confirmed")),
    el("p", { class: "epistemic" },
      "This headline counts ", el("b", {}, "only"), " layoffs the employer openly blamed on AI. ",
      "Cases we merely suspect are kept separate; cases where only headlines say “AI” are shown but ",
      el("b", {}, "never added to this number"), "; ordinary non-AI layoffs are the baseline underneath it all."),
    el("div", { class: "tierbar", role: "img", "aria-label": "Layoffs by how strongly AI is established as the cause" },
      seg("B1"), seg("B2"), seg("B3"), seg("B0")),
    el("div", { class: "tier-legend" },
      legendRow("B1", "← the headline"),
      legendRow("B2", "our inference"),
      legendRow("B3", "excluded — unproven"),
      legendRow("B0", "the baseline")));
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "How the “AI” claim holds up" ),
    counter));

  // ---------- EXPLORE ----------
  mount.append(el("section", { class: "explore" },
    cta("#/ledger", "Browse every layoff", "Company by company — open the sources yourself."),
    cta("#/attribution", "The claimed-vs-verified gap", "Our method, and the gap charted over time."),
    cta("#/jolts", "The official jobs data", "JOLTS: openings, hires, quits, layoffs.")));
}
