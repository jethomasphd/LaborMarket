// app.js — view router + data loader. The dashboard reads the JSON layer at runtime.
// NO figures are hardcoded here or in any view; every number is derived from STATE.

import { el, fmtInt, fmtDate, fmtMonth } from "./util.js";
import { renderPulse } from "./pulse.js";
import { renderLedger } from "./ledger.js";
import { renderJolts } from "./jolts.js";
import { renderAttribution } from "./attribution.js";
import { renderSources } from "./sources.js";

const DATA_FILES = {
  jolts:        "data/jolts-series.json",
  events:       "data/ai-layoff-events.json",
  challenger:   "data/challenger-monthly.json",
  warn:         "data/warn-notices.json",
  sources:      "data/sources.json",
  manifestLog:  "data/manifest-log.json",
  attribution:  "data/derived/ai-attribution-timeseries.json",
  discrepancy:  "data/derived/discrepancy-series.json",
  sectorRollup: "data/derived/sector-rollup.json",
};

export const STATE = { data: {}, loaded: false };

const VIEWS = {
  pulse:       { label: "Pulse",       render: renderPulse },
  ledger:      { label: "The Ledger",  render: renderLedger },
  jolts:       { label: "JOLTS",       render: renderJolts },
  attribution: { label: "Attribution", render: renderAttribution },
  sources:     { label: "Sources",     render: renderSources },
};
const DEFAULT_VIEW = "pulse";

async function loadData() {
  const loader = document.getElementById("loader");
  loader.hidden = false;
  try {
    const entries = await Promise.all(
      Object.entries(DATA_FILES).map(async ([key, path]) => {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
        return [key, await res.json()];
      })
    );
    STATE.data = Object.fromEntries(entries);
    STATE.loaded = true;
  } finally {
    loader.hidden = true;
  }
}

function renderMasthead() {
  const { jolts, events, manifestLog } = STATE.data;
  const last = manifestLog?.manifests?.[manifestLog.manifests.length - 1];
  const mount = document.getElementById("masthead-meta");
  mount.replaceChildren(
    el("div", {}, "JOLTS pulled ", el("b", {}, jolts?.meta?.last_pull || "—")),
    el("div", {}, el("b", {}, fmtInt(events?.events?.length || 0)), " events in the ledger"),
    el("div", {}, "last update ", el("b", {}, last ? fmtDate((last.applied_at || "").slice(0, 10)) : "—")),
  );
}

// Radical transparency: if any data layer is still an illustrative seed, say so plainly.
function renderStatusBanner() {
  const evP = STATE.data.events?.meta?.provenance;
  const chP = STATE.data.challenger?.meta?.provenance;
  const illustrative = (evP && evP !== "researched") || (chP && chP !== "researched");
  document.getElementById("status-banner")?.remove();
  if (!illustrative) return;
  const obs = STATE.data.jolts?.series?.job_openings?.observations || [];
  const latest = obs.length ? obs[obs.length - 1].period : null;
  const banner = el("div", { id: "status-banner", role: "note" },
    el("span", { class: "sb-tag" }, "Data status"),
    el("span", {}, " JOLTS is live (BLS, through ", el("b", {}, latest ? fmtMonth(latest) : "—"),
      "). The layoff ledger and AI-cited figures are an ", el("b", {}, "illustrative seed"),
      " pending the first research pass — shown to demonstrate the instrument, not yet independently verified. ",
      el("a", { href: "#/sources" }, "Method →")));
  document.querySelector(".masthead").after(banner);
}

function setActiveTab(name) {
  document.querySelectorAll("#tabs a").forEach((a) =>
    a.classList.toggle("active", a.dataset.view === name));
}

function currentView() {
  const name = (location.hash.replace(/^#\/?/, "") || DEFAULT_VIEW).split("?")[0];
  return VIEWS[name] ? name : DEFAULT_VIEW;
}

function route() {
  if (!STATE.loaded) return;
  const name = currentView();
  setActiveTab(name);
  const mount = document.getElementById("view");
  mount.replaceChildren();
  try {
    VIEWS[name].render(STATE, mount);
  } catch (err) {
    console.error(err);
    mount.replaceChildren(el("div", { class: "panel" },
      el("p", { class: "note" }, `This view hit an error: ${err.message}`)));
  }
  mount.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function showError(message) {
  const e = document.getElementById("error");
  e.hidden = false;
  e.replaceChildren(el("div", { class: "box" },
    el("h2", {}, "The data layer could not be loaded"),
    el("p", {}, message),
    el("p", { class: "note" }, "This static site reads JSON from /data at runtime. If you opened the file directly (file://), serve it over HTTP instead — e.g. `python -m http.server`.")));
}

async function boot() {
  try {
    await loadData();
    renderMasthead();
    renderStatusBanner();
    window.addEventListener("hashchange", route);
    route();
  } catch (err) {
    console.error(err);
    showError(err.message);
  }
}

boot();
