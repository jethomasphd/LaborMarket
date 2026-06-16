// jolts.js — the measured baseline. Six series, churn view, explicit causation-blind framing.

import { el, fmtCompact, fmtInt, fmtMonth, joltsToPeople, TIER_COLORS } from "./util.js";
import { lineSeries, scatterChart } from "./charts/charts.js";

const SERIES_ORDER = [
  ["job_openings", "Openings", TIER_COLORS.ember],
  ["hires", "Hires", TIER_COLORS.A1],
  ["quits", "Quits", TIER_COLORS.A2],
  ["layoffs_discharges", "Layoffs & Discharges", TIER_COLORS.alert],
  ["total_separations", "Total Separations", TIER_COLORS.B2],
  ["other_separations", "Other Separations", TIER_COLORS.muted],
];

function commonMonths(series) {
  const first = series.job_openings?.observations || [];
  return first.map((o) => o.period);
}

export function renderJolts(state, mount) {
  const jolts = state.data.jolts;
  const series = jolts?.series || {};
  const months = commonMonths(series);

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "JOLTS — the measured baseline"),
    el("p", {}, `${jolts?.meta?.source || "BLS JOLTS"}. Released ~2 months in arrears. This is what is `,
      el("em", {}, "measured"), "; it cannot attribute causation. Treat it as the rigorous denominator, not an AI-impact measure.")));

  // Latest readings
  const rows = SERIES_ORDER.map(([key, label]) => {
    const obs = (series[key]?.observations || []).filter((o) => o.value != null);
    const last = obs[obs.length - 1];
    return el("tr", {},
      el("td", { class: "company" }, label),
      el("td", { class: "num" }, last ? fmtCompact(joltsToPeople(last.value)) : "—"),
      el("td", { class: "num mono" }, last ? fmtInt(last.value) : "—"),
      el("td", { class: "mono" }, last ? fmtMonth(last.period) : "—"));
  });
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Latest readings (seasonally adjusted, level)"),
    el("div", { class: "table-wrap" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Series"), el("th", {}, "People"), el("th", {}, "Thousands"), el("th", {}, "Period"))),
      el("tbody", {}, ...rows)))));

  // Six-series time chart (people)
  const c1 = el("canvas");
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Six series over time (people)"),
    el("div", { class: "panel" }, el("div", { class: "chart-box tall" }, c1),
      el("p", { class: "inline-disclaimer" }, "Use the legend to isolate a series. Values shown in people (stored in thousands)."))));
  const datasets = SERIES_ORDER.map(([key, label, color]) => ({
    label, borderColor: color, backgroundColor: color,
    data: (series[key]?.observations || []).map((o) => joltsToPeople(o.value)),
    hidden: ["total_separations", "other_separations"].includes(key),
  }));
  queueMicrotask(() => lineSeries(c1, months, datasets));

  // Churn scatter — quits vs layoffs
  const c2 = el("canvas");
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Churn — quits vs. layoffs & discharges"),
    el("div", { class: "panel" }, el("div", { class: "chart-box mid" }, c2),
      el("p", { class: "inline-disclaimer" }, "Each point is one month. Up-and-right = a hotter, more voluntary market; down-and-right shifts toward involuntary separations."))));
  const q = series.quits?.observations || [];
  const l = series.layoffs_discharges?.observations || [];
  const pts = q.map((o, i) => l[i] && o.value != null && l[i].value != null
    ? { x: joltsToPeople(o.value), y: joltsToPeople(l[i].value) } : null).filter(Boolean);
  queueMicrotask(() => scatterChart(c2, [{ label: "month", data: pts, backgroundColor: TIER_COLORS.ember, pointRadius: 3 }]));

  mount.append(el("p", { class: "note" }, "Roadmap: recession shading and state-level series (BLS publication change lands 2026-07-22) via FRED."));
}
