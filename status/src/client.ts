// Spec 019: the browser code of the status page. render.ts copies these functions into the page
// with toString(), so each function is self-contained: no imports, no values from outside, and
// the functions call each other only by name (research.md §3).

export interface View {
  q: string;
  state: string;
  stakeholder: string;
  site: string;
  sort: string;
  tab: string;
  project: string;
  unknown: boolean;
}

export interface RowData {
  name: string;
  state: string;
  stakeholder: string;
  site: string;
  commit: string;
  expiry: string;
  order: string;
}

// contracts/address.md. Unknown values are ignored, and `unknown` is true.
export function readView(
  search: string,
  hash: string,
  known: { stakeholders: string[]; projects: string[] },
): View {
  const p = new URLSearchParams(search);
  const view = {
    q: "",
    state: "",
    stakeholder: "",
    site: "",
    sort: "state",
    tab: "projects",
    project: "",
    unknown: false,
  };
  const pick = (key: string, allowed: string[]) => {
    const value = p.get(key);
    if (value === null || value === "") return null;
    if (allowed.includes(value)) return value;
    view.unknown = true;
    return null;
  };
  view.q = p.get("q") ?? "";
  view.state = pick("state", ["problems", "warnings", "not-available", "correct"]) ?? "";
  view.stakeholder = pick("stakeholder", known.stakeholders) ?? "";
  view.site = pick("site", ["yes", "no"]) ?? "";
  view.sort = pick("sort", ["state", "name", "commit", "expiry"]) ?? "state";
  view.tab = pick("tab", ["projects", "campaigns", "tokens", "history"]) ?? "projects";
  const id = hash.startsWith("#p-") ? hash.slice(3) : "";
  view.project = known.projects.includes(id) ? id : "";
  return view;
}

// Only the keys that differ from the default (contracts/address.md).
export function writeView(view: View): string {
  const p = new URLSearchParams();
  if (view.q) p.set("q", view.q);
  if (view.state) p.set("state", view.state);
  if (view.stakeholder) p.set("stakeholder", view.stakeholder);
  if (view.site) p.set("site", view.site);
  if (view.sort && view.sort !== "state") p.set("sort", view.sort);
  if (view.tab && view.tab !== "projects") p.set("tab", view.tab);
  const query = p.toString();
  return `${query ? `?${query}` : ""}${view.project ? `#p-${view.project}` : ""}`;
}

export function matches(row: RowData, view: View): boolean {
  const states: Record<string, string> = {
    problems: "bad",
    warnings: "warn",
    "not-available": "unknown",
    correct: "good",
  };
  if (view.q && !row.name.includes(view.q.toLowerCase())) return false;
  if (view.state && row.state !== states[view.state]) return false;
  if (view.stakeholder && row.stakeholder !== view.stakeholder) return false;
  if (view.site && row.site !== view.site) return false;
  return true;
}

// data-model.md "Sort keys". Empty values sort last.
export function compare(a: RowData, b: RowData, sort: string): number {
  const rank: Record<string, number> = { bad: 0, warn: 1, unknown: 2, good: 3 };
  const order = Number(a.order) - Number(b.order);
  const emptyLast = (x: string, y: string) => (x === "" ? 1 : 0) - (y === "" ? 1 : 0);
  if (sort === "name") return a.name.localeCompare(b.name) || order;
  if (sort === "commit") {
    return emptyLast(a.commit, b.commit) || a.commit.localeCompare(b.commit) || order;
  }
  if (sort === "expiry") {
    return emptyLast(a.expiry, b.expiry) || a.expiry.localeCompare(b.expiry) || order;
  }
  return (rank[a.state] ?? 9) - (rank[b.state] ?? 9) || order;
}

// Binds the functions above to the page. Runs only in the browser.
export function start(known: { stakeholders: string[]; projects: string[] }) {
  const doc = document;
  doc.documentElement.classList.add("js");
  let view = readView(location.search, location.hash, known);
  const list = doc.querySelector("[data-rows]") as HTMLElement;
  const rows = [...doc.querySelectorAll("[data-rows] > li")] as HTMLElement[];
  const field = (name: string) =>
    doc.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
  const save = () =>
    history.replaceState(history.state, "", `${location.pathname}${writeView(view)}`);

  const apply = () => {
    const data = (li: HTMLElement) => li.dataset as unknown as RowData;
    rows.sort((a, b) => compare(data(a), data(b), view.sort));
    let shown = 0;
    for (const li of rows) {
      const ok = matches(data(li), view);
      li.hidden = !ok;
      if (ok) shown++;
      list.appendChild(li);
    }
    const countEl = doc.querySelector("[data-count]");
    if (countEl) countEl.textContent = `${shown} of ${rows.length}`;
    const empty = doc.querySelector("[data-empty]") as HTMLElement | null;
    if (empty) empty.hidden = shown > 0;
    for (const panel of doc.querySelectorAll("[role=tabpanel]")) {
      panel.classList.toggle("active", panel.id === `tab-${view.tab}`);
    }
    for (const tab of doc.querySelectorAll("[role=tab]")) {
      const on = tab.getAttribute("data-tab") === view.tab;
      tab.classList.toggle("tab-active", on);
      tab.setAttribute("aria-selected", String(on));
    }
  };

  for (const name of ["q", "state", "stakeholder", "site", "sort"]) {
    const el = field(name);
    if (!el) continue;
    el.value = (view as unknown as Record<string, string>)[name];
    el.addEventListener(name === "q" ? "input" : "change", () => {
      (view as unknown as Record<string, string>)[name] = el.value;
      apply();
      save();
    });
  }
  doc.querySelector("[data-clear]")?.addEventListener("click", () => {
    view = { ...view, q: "", state: "", stakeholder: "", site: "" };
    for (const name of ["q", "state", "stakeholder", "site"]) {
      const el = field(name);
      if (el) el.value = "";
    }
    apply();
    save();
  });
  for (const tab of doc.querySelectorAll("[role=tab]")) {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      view.tab = tab.getAttribute("data-tab") ?? "projects";
      apply();
      save();
    });
  }
  const note = doc.querySelector("[data-note]") as HTMLElement | null;
  if (note) note.hidden = !view.unknown;
  const filters = doc.querySelector("details.filters") as HTMLDetailsElement | null;
  if (filters && matchMedia("(min-width: 640px)").matches) filters.open = true;

  // Pop-ups (FR-009): open by class, keep the hash as the link, focus in and back out.
  let last: HTMLElement | null = null;
  const open = (id: string, push: boolean) => {
    const modal = doc.getElementById(`p-${id}`);
    if (!modal) return;
    modal.classList.add("modal-open");
    view.project = id;
    if (push) history.pushState({ modal: id }, "", `${location.pathname}${writeView(view)}`);
    (doc.getElementById(`t-${id}`) as HTMLElement | null)?.focus();
  };
  const close = () => {
    const id = view.project;
    const modal = id ? doc.getElementById(`p-${id}`) : null;
    if (!modal) return;
    modal.classList.remove("modal-open");
    view.project = "";
    save();
    (last ?? (doc.querySelector(`a[href="#p-${id}"]`) as HTMLElement | null))?.focus();
  };
  for (const a of doc.querySelectorAll('a[href^="#p-"]')) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      last = a as HTMLElement;
      open((a.getAttribute("href") ?? "").slice(3), true);
    });
  }
  for (const a of doc.querySelectorAll("[data-close]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      close();
    });
  }
  doc.addEventListener("keydown", (e) => {
    if (!view.project) return;
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const box = doc.querySelector(`#p-${view.project} .modal-box`);
    const items = [...(box?.querySelectorAll("a, button, [tabindex]") ?? [])] as HTMLElement[];
    if (!items.length) return;
    const first = items[0];
    const lastItem = items[items.length - 1];
    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && doc.activeElement === lastItem) {
      e.preventDefault();
      first.focus();
    }
  });
  addEventListener("popstate", () => {
    const next = readView(location.search, location.hash, known);
    if (view.project && !next.project) close();
    else if (next.project && next.project !== view.project) open(next.project, false);
  });

  apply();
  if (view.project) open(view.project, false);
}
