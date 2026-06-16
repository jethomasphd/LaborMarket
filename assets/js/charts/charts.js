// charts.js — Chart.js (time series + stacked composition) and D3 (discrepancy divergence).
// Every chart is fed values from the JSON layer at call time; nothing is hardcoded.

import { TIER_COLORS, fmtCompact, fmtMonth } from "../util.js";

const C = () => window.Chart || null;

function darkBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: TIER_COLORS.muted, font: { family: "IBM Plex Mono", size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: "#0a0e14", borderColor: TIER_COLORS.hairline, borderWidth: 1,
        titleColor: TIER_COLORS.ink, bodyColor: TIER_COLORS.ink, titleFont: { family: "IBM Plex Mono" }, bodyFont: { family: "IBM Plex Mono" },
      },
    },
    scales: {
      x: { grid: { color: TIER_COLORS.hairline }, ticks: { color: TIER_COLORS.muted, font: { family: "IBM Plex Mono", size: 10 }, maxRotation: 0, autoSkipPadding: 16 } },
      y: { grid: { color: TIER_COLORS.hairline }, ticks: { color: TIER_COLORS.muted, font: { family: "IBM Plex Mono", size: 10 }, callback: (v) => fmtCompact(v) }, beginAtZero: true },
    },
  };
}

function noLib(container, what) {
  container.innerHTML = `<p class="note">${what} chart unavailable (chart library not loaded).</p>`;
}

export function sparkline(canvas, values, color) {
  if (!C()) return;
  new (C())(canvas, {
    type: "line",
    data: { labels: values.map((_, i) => i), datasets: [{ data: values, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: .3, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  });
}

export function lineSeries(canvas, labels, datasets, { peopleAxis = false } = {}) {
  if (!C()) { noLib(canvas.parentElement, "Line"); return; }
  const opts = darkBase();
  new (C())(canvas, {
    type: "line",
    data: {
      labels: labels.map(fmtMonth),
      datasets: datasets.map((d) => ({ tension: .25, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: false, ...d })),
    },
    options: opts,
  });
}

export function stackedArea(canvas, labels, datasets) {
  if (!C()) { noLib(canvas.parentElement, "Composition"); return; }
  const opts = darkBase();
  opts.scales.y.stacked = true;
  opts.scales.x.stacked = true;
  new (C())(canvas, {
    type: "line",
    data: { labels: labels.map(fmtMonth), datasets: datasets.map((d) => ({ fill: true, tension: .2, borderWidth: 1.5, pointRadius: 0, ...d })) },
    options: opts,
  });
}

export function scatterChart(canvas, series) {
  if (!C()) { noLib(canvas.parentElement, "Scatter"); return; }
  const opts = darkBase();
  opts.scales.x.type = "linear";
  opts.scales.x.title = { display: true, text: "Quits (people)", color: TIER_COLORS.muted, font: { family: "IBM Plex Mono", size: 10 } };
  opts.scales.y.title = { display: true, text: "Layoffs & discharges (people)", color: TIER_COLORS.muted, font: { family: "IBM Plex Mono", size: 10 } };
  new (C())(canvas, { type: "scatter", data: { datasets: series }, options: opts });
}

// ---- The discrepancy divergence, in D3: Challenger AI-cited vs our B1-verified,
//      with the GAP shaded AND drawn as its own line. The gap is the measurement. ----
export function discrepancyDivergence(container, months) {
  const d3 = window.d3;
  container.innerHTML = "";
  if (!d3) { noLib(container, "Discrepancy"); return; }
  const rows = months.filter((m) => m.challenger_ai_cited != null);
  if (!rows.length) { container.innerHTML = `<p class="empty">No overlapping months yet.</p>`; return; }

  const W = container.clientWidth || 680, H = 320;
  const margin = { top: 16, right: 16, bottom: 28, left: 48 };
  const iw = W - margin.left - margin.right, ih = H - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("height", H).attr("role", "img");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(rows.map((r) => r.month)).range([0, iw]).padding(0.5);
  const maxY = d3.max(rows, (r) => Math.max(r.challenger_ai_cited, r.lm_b1_verified)) || 1;
  const y = d3.scaleLinear().domain([0, maxY * 1.08]).range([ih, 0]).nice();

  g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickFormat((m) => fmtMonth(m)))
    .call((s) => s.selectAll("text").attr("fill", TIER_COLORS.muted).style("font-family", "IBM Plex Mono").style("font-size", "10px"))
    .call((s) => s.selectAll("path,line").attr("stroke", TIER_COLORS.hairline));
  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((v) => fmtCompact(v)))
    .call((s) => s.selectAll("text").attr("fill", TIER_COLORS.muted).style("font-family", "IBM Plex Mono").style("font-size", "10px"))
    .call((s) => s.selectAll("path,line").attr("stroke", TIER_COLORS.hairline));

  // Shaded gap between the two series.
  g.append("path").datum(rows).attr("fill", TIER_COLORS.alert).attr("fill-opacity", 0.14)
    .attr("d", d3.area().x((r) => x(r.month)).y0((r) => y(r.lm_b1_verified)).y1((r) => y(r.challenger_ai_cited)));

  const mkLine = (accessor, color, dash) => g.append("path").datum(rows)
    .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("stroke-dasharray", dash || null)
    .attr("d", d3.line().x((r) => x(r.month)).y((r) => y(accessor(r))));

  mkLine((r) => r.challenger_ai_cited, TIER_COLORS.muted);            // Challenger AI-cited
  mkLine((r) => r.lm_b1_verified, TIER_COLORS.B1);                    // our B1-verified
  mkLine((r) => r.gap, TIER_COLORS.alert, "4 3");                     // the GAP as its own series

  for (const r of rows) {
    g.append("circle").attr("cx", x(r.month)).attr("cy", y(r.challenger_ai_cited)).attr("r", 3).attr("fill", TIER_COLORS.muted);
    g.append("circle").attr("cx", x(r.month)).attr("cy", y(r.lm_b1_verified)).attr("r", 3).attr("fill", TIER_COLORS.B1);
  }
}
