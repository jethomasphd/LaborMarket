// util.js — shared formatting, the canonical tier metadata, and tiny DOM helpers.
// The tier definitions live HERE once and are reused everywhere a tier appears,
// so the rubric can never drift between views. Each tier carries a PLAIN-LANGUAGE
// label (for laypeople) alongside its formal code + definition.

export const AXIS = {
  A: { label: "Did the layoff really happen?", short: "Did it happen?" },
  B: { label: "Is AI actually the cause?", short: "Is it AI?" },
};

export const TIER_META = {
  A1: { name: "VERIFIED",    plain: "Confirmed",          axis: "A", desc: "Backed by a government/legal record (a WARN notice or SEC filing) or an official company statement with a headcount." },
  A2: { name: "REPORTED",    plain: "Reported",           axis: "A", desc: "Reported by credible news (Reuters, Bloomberg) or an established tracker — but not yet in an official filing." },
  A3: { name: "UNCONFIRMED", plain: "Unconfirmed",        axis: "A", desc: "A rumor, an anonymous memo, or a single social post. No solid count." },
  B1: { name: "STATED-BY-FIRM",       plain: "Company blames AI",     axis: "B", desc: "The company itself said AI/automation was the reason. The strongest signal we accept — but still a claim, not proof." },
  B2: { name: "STRUCTURAL-INFERENCE", plain: "Likely AI-related",     axis: "B", desc: "The company didn't say AI, but the roles cut + heavy AI spending make it a reasonable inference. Labeled as our inference, not their claim." },
  B3: { name: "NARRATIVE-ONLY",       plain: "Only headlines say AI", axis: "B", desc: "'AI' shows up only in headlines or trackers — or the company gave other reasons. An unproven narrative." },
  B0: { name: "NOT-ATTRIBUTED",       plain: "Not about AI",          axis: "B", desc: "Nobody claims AI was involved. An ordinary layoff. Most layoffs are this — the baseline." },
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

export const plainTier = (tier) => TIER_META[tier]?.plain || tier;

// A compact tier badge (the code) — used in dense tables. Tooltip carries the plain meaning.
export function tierBadge(tier) {
  const meta = TIER_META[tier];
  return el("span", { class: `badge tier-${tier}`, title: meta ? `${tier} (${meta.plain}) — ${meta.desc}` : tier }, tier);
}

// A plain-language chip: the everyday phrase up front, the formal code small alongside.
export function tierChip(tier) {
  const meta = TIER_META[tier];
  return el("span", { class: `tchip tier-${tier}`, title: meta ? meta.desc : tier },
    el("span", { class: "tchip-dot" }), plainTier(tier), el("span", { class: "tchip-code" }, tier));
}

export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
