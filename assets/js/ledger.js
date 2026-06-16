// ledger.js — event-level table over ai-layoff-events.json.
// Sortable/filterable; rows expand to sources + rationale; CSV export (free, attributed).

import { el, tierBadge, fmtInt, fmtDate, fmtPct, plainTier, CLASS_LABEL, AXIS } from "./util.js";

const COLUMNS = [
  { key: "date_announced", label: "Announced", num: false },
  { key: "company", label: "Company", num: false },
  { key: "sector", label: "Sector", num: false },
  { key: "headcount", label: "People", num: true },
  { key: "event_confidence", label: "Did it happen?", num: false },
  { key: "ai_attribution", label: "Is it AI?", num: false },
];

const B_ORDER = { B1: 0, B2: 1, B3: 2, B0: 3 };
const A_ORDER = { A1: 0, A2: 1, A3: 2 };

function bestClass(ev, srcIndex) {
  const rank = { GOV_LEGAL: 4, PRIMARY_FIRM: 4, OUTPLACEMENT_ANALYTICS: 3, WIRE_PRESS: 2, SOCIAL_RUMOR: 1 };
  let best = null, bestRank = -1;
  for (const s of ev.sources || []) {
    const cls = srcIndex[s.source_id]?.class;
    if (cls && rank[cls] > bestRank) { bestRank = rank[cls]; best = cls; }
  }
  return best;
}

function toCSV(events) {
  const head = ["event_id", "date_announced", "company", "sector", "headcount", "pct_workforce",
    "event_confidence", "ai_attribution", "stated_reasons", "ai_attribution_rationale", "source_urls"];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(",")];
  for (const e of events) {
    lines.push([
      e.event_id, e.date_announced, e.company, e.sector, e.headcount ?? "", e.pct_workforce ?? "",
      e.event_confidence, e.ai_attribution, (e.stated_reasons || []).join("; "),
      e.ai_attribution_rationale ?? "", (e.sources || []).map((s) => s.url).filter(Boolean).join(" | "),
    ].map(esc).join(","));
  }
  return lines.join("\n");
}

function detailRow(ev, srcIndex, colspan) {
  const sources = (ev.sources || []).map((s) => {
    const reg = srcIndex[s.source_id];
    return el("div", { class: "source-item" },
      el("div", {}, el("span", { class: "cls" }, `${s.source_id} · ${s.type}${reg ? " · " + CLASS_LABEL[reg.class] : ""}`)),
      el("div", {}, s.claim || ""),
      el("div", {}, s.carries_ai_attribution ? el("span", { class: "cls" }, "↳ asserts AI cause") : "",
        s.url ? el("a", { href: s.url, target: "_blank", rel: "noopener" }, " open source ↗") : el("span", { class: "cls" }, " (no url — see note)")));
  });

  const facts = el("div", {},
    el("h4", {}, "Attribution rationale"),
    el("p", {}, ev.ai_attribution_rationale || el("span", { class: "note" }, "— (B0: not AI-attributed)")),
    ev.discrepancy_note ? el("div", {}, el("h4", {}, "Discrepancy (both figures kept)"), el("p", { class: "note" }, ev.discrepancy_note)) : "",
    el("h4", {}, "Stated reasons"),
    el("p", { class: "mono" }, (ev.stated_reasons || []).join(", ") || "—"));

  const meta = el("div", {},
    el("h4", {}, "Detail"),
    el("dl", { class: "kv" },
      el("dt", {}, "Geography"), el("dd", {}, ev.geography ? [ev.geography.country, ...(ev.geography.locations || [])].filter(Boolean).join(" · ") : "—"),
      el("dt", {}, "% workforce"), el("dd", {}, ev.pct_workforce != null ? fmtPct(ev.pct_workforce, 1) : "—"),
      el("dt", {}, "Headcount basis"), el("dd", { class: "mono" }, ev.headcount_basis || "—"),
      el("dt", {}, "Manifest"), el("dd", { class: "mono" }, ev.manifest_id || "—"),
      el("dt", {}, "Event ID"), el("dd", { class: "mono" }, ev.event_id)));

  return el("tr", { class: "detail-row", "data-detail-for": ev.event_id },
    el("td", { colspan: String(colspan) },
      el("div", { class: "detail-grid" }, facts, meta,
        el("div", {}, el("h4", {}, `Sources (${sources.length})`), ...sources))));
}

export function renderLedger(state, mount) {
  const evAll = state.data.events?.events || [];
  const srcIndex = Object.fromEntries((state.data.sources?.sources || []).map((s) => [s.source_id, s]));
  const sectors = [...new Set(evAll.map((e) => e.sector).filter(Boolean))].sort();

  const vs = { q: "", a: "", b: "", sector: "", cls: "", sortKey: "date_announced", sortDir: "desc" };

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "Every layoff, on the record"),
    el("p", {}, "One row per layoff, each with the sources behind it — open them yourself. Two columns score it: did it really happen, and is AI actually the cause. Click any row for the full reasoning.")));

  // A plain-language key so the A1/B1 codes are never a mystery.
  const keyStrip = (axis, tiers) => el("div", { class: "key-axis" },
    el("span", { class: "key-q" }, axis), " ",
    ...tiers.map((t) => el("span", { class: "key-item" }, el("span", { class: `badge tier-${t}` }, t), " ", plainTier(t))));
  mount.append(el("div", { class: "ledger-key" },
    keyStrip(AXIS.A.short, ["A1", "A2", "A3"]),
    keyStrip(AXIS.B.short, ["B1", "B2", "B3", "B0"])));

  const search = el("input", { type: "search", placeholder: "Search company or sector…", "aria-label": "Search", oninput: (e) => { vs.q = e.target.value.toLowerCase(); paint(); } });
  const tierOpt = (t) => `${plainTier(t)} (${t})`;
  const selA = mkSelect("Did it happen?", ["A1", "A2", "A3"], (v) => { vs.a = v; paint(); }, tierOpt);
  const selB = mkSelect("Is it AI?", ["B1", "B2", "B3", "B0"], (v) => { vs.b = v; paint(); }, tierOpt);
  const selSector = mkSelect("Sector", sectors, (v) => { vs.sector = v; paint(); });
  const selCls = mkSelect("Source class", Object.keys(CLASS_LABEL), (v) => { vs.cls = v; paint(); }, (k) => CLASS_LABEL[k]);
  const count = el("span", { class: "count" });
  const csvBtn = el("button", { class: "btn", onclick: () => downloadCSV() }, "Export CSV");

  mount.append(el("div", { class: "toolbar" }, search, selA, selB, selSector, selCls, csvBtn, count));

  const thead = el("tr", {},
    ...COLUMNS.map((c) => el("th", { "data-key": c.key, onclick: () => sortBy(c.key), title: "Sort" }, c.label)),
    el("th", {}, "Sources"));
  const tbody = el("tbody", {});
  mount.append(el("div", { class: "table-wrap" }, el("table", {}, el("thead", {}, thead), tbody)));

  let filtered = [];

  function currentFiltered() {
    return evAll.filter((e) => {
      if (vs.q && !(`${e.company} ${e.sector}`.toLowerCase().includes(vs.q))) return false;
      if (vs.a && e.event_confidence !== vs.a) return false;
      if (vs.b && e.ai_attribution !== vs.b) return false;
      if (vs.sector && e.sector !== vs.sector) return false;
      if (vs.cls && bestClass(e, srcIndex) !== vs.cls) return false;
      return true;
    });
  }

  function sortBy(key) {
    if (vs.sortKey === key) vs.sortDir = vs.sortDir === "asc" ? "desc" : "asc";
    else { vs.sortKey = key; vs.sortDir = key === "headcount" ? "desc" : "asc"; }
    paint();
  }

  function sortFn(a, b) {
    const k = vs.sortKey, dir = vs.sortDir === "asc" ? 1 : -1;
    let av, bv;
    if (k === "ai_attribution") { av = B_ORDER[a[k]]; bv = B_ORDER[b[k]]; }
    else if (k === "event_confidence") { av = A_ORDER[a[k]]; bv = A_ORDER[b[k]]; }
    else if (k === "headcount") { av = a[k] ?? -1; bv = b[k] ?? -1; }
    else { av = a[k] ?? ""; bv = b[k] ?? ""; }
    return av < bv ? -dir : av > bv ? dir : 0;
  }

  function paint() {
    filtered = currentFiltered().slice().sort(sortFn);
    count.textContent = `${filtered.length} of ${evAll.length} events`;
    thead.querySelectorAll("th[data-key]").forEach((th) =>
      th.setAttribute("aria-sort", th.dataset.key === vs.sortKey ? (vs.sortDir === "asc" ? "ascending" : "descending") : "none"));
    tbody.replaceChildren();
    if (!filtered.length) {
      tbody.append(el("tr", {}, el("td", { colspan: String(COLUMNS.length + 1), class: "empty" }, "No events match these filters.")));
      return;
    }
    for (const e of filtered) {
      const row = el("tr", { class: "expander", onclick: () => toggle(e.event_id) },
        el("td", { class: "mono" }, fmtDate(e.date_announced)),
        el("td", { class: "company" }, e.company),
        el("td", {}, e.sector || "—"),
        el("td", { class: "num" }, fmtInt(e.headcount)),
        el("td", {}, tierBadge(e.event_confidence)),
        el("td", {}, tierBadge(e.ai_attribution)),
        el("td", { class: "num" }, String((e.sources || []).length)));
      row.dataset.row = e.event_id;
      tbody.append(row);
    }
  }

  function toggle(id) {
    const existing = tbody.querySelector(`tr[data-detail-for="${id}"]`);
    if (existing) { existing.remove(); return; }
    const ev = evAll.find((e) => e.event_id === id);
    const anchor = tbody.querySelector(`tr[data-row="${id}"]`);
    anchor.after(detailRow(ev, srcIndex, COLUMNS.length + 1));
  }

  function downloadCSV() {
    const blob = new Blob([toCSV(filtered.length ? filtered : evAll)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: "labormarket-ledger.csv" });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  paint();
}

function mkSelect(label, options, onchange, fmt = (x) => x) {
  const sel = el("select", { "aria-label": label, onchange: (e) => onchange(e.target.value) },
    el("option", { value: "" }, label),
    ...options.map((o) => el("option", { value: o }, fmt(o))));
  return sel;
}
