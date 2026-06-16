// util.js — shared formatting, the canonical tier metadata, and tiny DOM helpers.
// The tier definitions live HERE once and are reused everywhere a tier appears,
// so the rubric can never drift between views.

export const TIER_META = {
  A1: { name: "VERIFIED",     axis: "A", desc: "Government/legal record (WARN, SEC 8-K/10-Q) or official company statement with a headcount figure." },
  A2: { name: "REPORTED",     axis: "A", desc: "Credible secondary reporting (Reuters, Bloomberg) or an established aggregator (Layoffs.fyi); not yet in a filing." },
  A3: { name: "UNCONFIRMED",  axis: "A", desc: "Rumor, anonymous internal memo, single-source social post, or no count available." },
  B1: { name: "STATED-BY-FIRM",       axis: "B", desc: "The company explicitly attributes the cut to AI/automation. The strongest attribution signal — but a claim, not proof of causation." },
  B2: { name: "STRUCTURAL-INFERENCE", axis: "B", desc: "No firm attribution, but role composition + AI capex + sector pattern make displacement a plausible analyst inference. Labeled as inference." },
  B3: { name: "NARRATIVE-ONLY",       axis: "B", desc: "“AI” appears only in third-party framing, or is contradicted by other stated firm reasons. A contested narrative artifact." },
  B0: { name: "NOT-ATTRIBUTED",       axis: "B", desc: "No actor claims AI involvement; an ordinary macro/structural layoff. Most layoffs are B0 — the denominator." },
};

// Hex mirrors of the CSS confidence encoding (for canvas/SVG charts).
export const TIER_COLORS = {
  A1: "#4cc4a8", A2: "#6aa3d8", A3: "#8a93a3",
  B1: "#d9a441", B2: "#b08bd0", B3: "#8a93a3", B0: "#5b6472",
  alert: "#d96a6a", ember: "#c9a227", ink: "#e8eaed", muted: "#9aa4b2", hairline: "#232b39",
};

export const CLASS_LABEL = {
  GOV_LEGAL: "GOV / LEGAL",
  PRIMARY_FIRM: "PRIMARY FIRM",
  OUTPLACEMENT_ANALYTICS: "OUTPLACEMENT / ANALYTICS",
  WIRE_PRESS: "WIRE / PRESS",
  SOCIAL_RUMOR: "SOCIAL / RUMOR",
};

// ---- formatting ----
export const fmtInt = (n) =>
  (n === null || n === undefined || Number.isNaN(n)) ? "—" : Math.round(n).toLocaleString("en-US");

export function fmtCompact(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

export const fmtPct = (x, d = 0) =>
  (x === null || x === undefined || Number.isNaN(x)) ? "—" : (x * 100).toFixed(d) + "%";

// "thousands"-unit JOLTS values are stored in thousands → show as people.
export const joltsToPeople = (vThousands) => (vThousands == null ? null : vThousands * 1000);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtMonth(iso) {            // "2026-04" -> "Apr 2026"
  if (!iso) return "—";
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1] || m} ${y}`;
}
export function fmtDate(iso) {             // "2026-05-12" -> "12 May 2026"
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] || m} ${y}`;
}

// ---- DOM ----
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

// A tier badge — used in tables, cards, anywhere a tier is shown.
export function tierBadge(tier) {
  const meta = TIER_META[tier];
  const b = el("span", { class: `badge tier-${tier}`, title: meta ? `${tier} ${meta.name} — ${meta.desc}` : tier }, tier);
  return b;
}

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
