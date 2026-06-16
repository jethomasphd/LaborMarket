// sources.js — the registry, the source-class ceilings, the manifest provenance log, methodology.

import { el, fmtInt, fmtDate, CLASS_LABEL } from "./util.js";

const REPO = "https://github.com/jethomasphd/LaborMarket";

const CEILINGS = [
  ["GOV_LEGAL", "BLS, FRED, SEC EDGAR, state WARN portals", "A1 / B1"],
  ["PRIMARY_FIRM", "Company press release, earnings call, official blog", "A1 / B1"],
  ["OUTPLACEMENT_ANALYTICS", "Challenger Gray, Layoffs.fyi", "A2 · B ≤ B2 unless quoting the firm"],
  ["WIRE_PRESS", "Reuters, Bloomberg, AP, NYT", "A2 · B ≤ B3 unless quoting a primary attribution"],
  ["SOCIAL_RUMOR", "Anonymous posts, unverified memos", "A3 · B3 only"],
];

export function renderSources(state, mount) {
  const sources = state.data.sources?.sources || [];
  const log = state.data.manifestLog?.manifests || [];

  mount.append(el("div", { class: "view-head" },
    el("h2", {}, "Sources & methodology"),
    el("p", {}, "Every datum names its source; no orphan numbers. Each source carries a reliability class that caps the tiers it can justify — a source cannot push an event above the confidence its class warrants.")));

  // Ceilings
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Source-class ceilings"),
    el("div", { class: "table-wrap" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Class"), el("th", {}, "Examples"), el("th", {}, "Tier ceiling"))),
      el("tbody", {}, ...CEILINGS.map(([cls, ex, ceil]) => el("tr", {},
        el("td", {}, el("span", { class: "class-pill" }, CLASS_LABEL[cls])),
        el("td", {}, ex), el("td", { class: "mono" }, ceil))))))));

  // Registry
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, `Source registry (${sources.length})`),
    el("div", { class: "table-wrap" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "ID"), el("th", {}, "Name"), el("th", {}, "Class"), el("th", {}, "Access"))),
      el("tbody", {}, ...sources.map((s) => el("tr", {},
        el("td", { class: "mono" }, s.source_id),
        el("td", {}, s.home_url ? el("a", { href: s.home_url, target: "_blank", rel: "noopener" }, s.name) : s.name),
        el("td", {}, el("span", { class: "class-pill" }, CLASS_LABEL[s.class] || s.class)),
        el("td", { class: "mono" }, s.access))))))));

  // Manifest provenance log
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, `Manifest log — provenance trail (${log.length})`),
    el("div", { class: "grid two" }, ...log.slice().reverse().map((m) => el("div", { class: "panel" },
      el("h4", { class: "mono" }, m.manifest_id),
      el("dl", { class: "kv" },
        el("dt", {}, "Applied"), el("dd", { class: "mono" }, m.applied_at ? fmtDate((m.applied_at || "").slice(0, 10)) : "—"),
        el("dt", {}, "Ops"), el("dd", { class: "mono" }, `+${m.ops?.add ?? 0} add · ${m.ops?.update ?? 0} update`),
        el("dt", {}, "Touched"), el("dd", { class: "mono" }, (m.events_touched || []).join(", ") || "—"),
        el("dt", {}, "Analyst"), el("dd", {}, m.analyst || "—")),
      el("p", { class: "note" }, m.summary || ""),
      el("p", { class: "loghash" }, "sha256: ", m.sha256))))));

  // Methodology + ethics
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Honest limitations"),
    el("div", { class: "panel" },
      el("ul", {},
        el("li", {}, el("strong", {}, "JOLTS cannot attribute causation."), " It is the rigorous denominator, not an AI-impact measure."),
        el("li", {}, el("strong", {}, "“AI-attributed” is a claim layer."), " We surface claims with tiers; we do not certify that AI caused any specific job loss."),
        el("li", {}, el("strong", {}, "Coverage is skewed."), " Tech and large firms are over-represented (WARN thresholds, aggregator focus). Small-business and gig displacement is under-captured."),
        el("li", {}, el("strong", {}, "WARN ≠ all layoffs."), " Threshold-limited, state-uneven, timing-variable."),
        el("li", {}, el("strong", {}, "Propagate uncertainty downstream."), " Anyone citing a figure should carry its tier and source. Stripping the tier is the exact information loss this project exists to resist.")))));

  // Contribute
  mount.append(el("section", {},
    el("h3", { class: "section-title" }, "Contribute / correct"),
    el("div", { class: "panel" },
      el("p", {}, "Found an error, a missing event, or a mis-tiered attribution? The data and methodology are open."),
      el("p", {}, "Fork the repo → add an event to ", el("span", { class: "mono" }, "data/ai-layoff-events.json"),
        " or a dated manifest to ", el("span", { class: "mono" }, "manifests/"), " → run ",
        el("span", { class: "mono" }, "python scripts/validate.py"), " → open a PR. ",
        el("a", { href: REPO, target: "_blank", rel: "noopener" }, "Repository ↗")),
      el("p", { class: "note" }, "The validator enforces the two-axis rubric and the source-class ceilings; a B1 backed only by a headline, or an averaged discrepancy, will be refused."))));
}
