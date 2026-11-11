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
  view.tab = pick("tab", ["projects", "campaigns", "tokens", "versions", "history"]) ?? "projects";
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

// Spec 020 research.md §3: compare with the last visit on this device, else with the last 24 hours.
// A load less than 10 minutes after the one before keeps the old base (a reload).
export function compareVisit(
  stored: {
    last?: { time: string; keys: string[] };
    current?: { time: string; keys: string[] };
  } | null,
  nowKeys: string[],
  nowTime: string,
  changes: { since: string; started: { key: string }[]; stopped: { key: string }[] },
  projectIds: string[],
) {
  let last = stored?.last;
  const current = stored?.current;
  if (current && Date.parse(nowTime) - Date.parse(current.time) > 10 * 60 * 1000) last = current;
  const next = { last, current: { time: nowTime, keys: nowKeys } };
  const project = (key: string) => key.split("/")[0];
  if (last) {
    const before = new Set(last.keys);
    const now = new Set(nowKeys);
    const fixed = last.keys.filter((k) => !now.has(k) && projectIds.includes(project(k)));
    // Spec 020 T028: the count is the full count; only the list has at most 20 items.
    return {
      base: "visit",
      since: last.time,
      newKeys: nowKeys.filter((k) => !before.has(k)),
      fixedCount: fixed.length,
      fixedKeys: fixed.slice(0, 20),
      next,
    };
  }
  return {
    base: "24h",
    since: changes.since,
    newKeys: changes.started.map((c) => c.key),
    fixedCount: changes.stopped.length,
    fixedKeys: changes.stopped.map((c) => c.key).slice(0, 20),
    next,
  };
}

// Spec 020 FR-002: the changes line. A visit more than 30 days ago shows its date (T029).
export function changesText(base: string, n: number, m: number, since: string, now: number) {
  if (base === "24h") return `In the last 24 hours: ${n} new, ${m} fixed`;
  const old = now - Date.parse(since) > 30 * 24 * 60 * 60 * 1000;
  const when = old ? since.slice(0, 10) : `your visit ${relTime(since, now)}`;
  return n + m === 0 ? `No change since ${when}` : `Since ${when}: ${n} new, ${m} fixed`;
}

// Spec 020 analysis U1: the text of a fixed key, from the project name and the reason.
export function fixedText(
  key: string,
  names: Record<string, string>,
  texts: Record<string, string>,
): string {
  const [id, reason] = key.split("/");
  return `${names[id] ?? id}: ${texts[reason] ?? reason}`;
}

// Spec 020 US5, research.md §7: the results of the command box. Projects first, at most 8.
export function searchCommands(
  items: { label: string; kind: string; target: string }[],
  text: string,
): { label: string; kind: string; target: string }[] {
  const q = text.trim().toLowerCase();
  const hits = items.filter((i) => i.label.toLowerCase().includes(q));
  const rank = (i: { kind: string }) => (i.kind === "project" ? 0 : 1);
  return hits.sort((a, b) => rank(a) - rank(b)).slice(0, 8);
}

// Spec 011 US4, contracts/dialog.md: the command of the "New project" dialog. Null until the id,
// the name and the repo are valid. Values go in POSIX single quotes.
export function newProjectCommand(f: Record<string, string>): string | null {
  const id = (f.id ?? "").trim();
  const name = (f.name ?? "").trim();
  const repo = (f.repo ?? "").trim();
  if (!/^[a-z0-9-]+$/.test(id) || !/^[A-Za-z0-9._-]+$/.test(repo)) return null;
  if (name === "" || name.length > 60) return null;
  const q = (v: string) => `'${v.replace(/'/g, "'\\''")}'`;
  const stack = (f.stack ?? "").trim() || "-";
  return `cd status && bun run new-project --id ${id} --name ${q(name)} --repo ${repo} --visibility ${f.visibility || "public"} --stack ${q(stack)} --host ${f.host || "none"}`;
}

// The messages of the dialog for a value that is in the catalog or not valid.
export function nameTaken(
  f: Record<string, string>,
  names: { ids: string[]; names: string[]; repos: string[] },
): Record<string, string> {
  const out: Record<string, string> = {};
  const id = (f.id ?? "").trim();
  const name = (f.name ?? "").trim().toLowerCase();
  const repo = (f.repo ?? "").trim();
  if (id && !/^[a-z0-9-]+$/.test(id)) out.id = "Use a-z, 0-9 and -.";
  else if (names.ids.includes(id)) out.id = "This id is in the catalog.";
  if (name && names.names.includes(name)) out.name = "This name is in the catalog.";
  if (repo && !/^[A-Za-z0-9._-]+$/.test(repo)) out.repo = "Use A-Z, a-z, 0-9, ., _ and -.";
  else if (repo && names.repos.includes(`imreboersma/${repo.toLowerCase()}`))
    out.repo = `ImreBoersma/${repo} is in the catalog.`;
  return out;
}

// relTime of view.ts is in the same page script (render.ts puts both in it).
declare function relTime(iso: string, nowMs: number): string;

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
  const tabs = [...doc.querySelectorAll("[role=tab]")] as HTMLElement[];
  for (const tab of tabs) {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      view.tab = tab.getAttribute("data-tab") ?? "projects";
      apply();
      save();
    });
    // Spec 019 T031: Left and Right move to the tab before or after (WAI-ARIA tabs pattern).
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
      const next = tabs[(i + tabs.length) % tabs.length];
      next.focus();
      next.click();
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
    // Spec 019 T030: a pop-up that added a history entry closes with Back, so the next Back
    // leaves the page as the user expects; else only the address changes.
    if ((history.state as { modal?: string } | null)?.modal === id) history.back();
    else save();
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

  // Spec 020 US1: what changed since the last visit on this device, else in the last 24 hours.
  const inline = JSON.parse(doc.getElementById("changes")?.textContent ?? "null") as {
    changes: {
      since: string;
      started: { key: string }[];
      stopped: { key: string; project: string; text: string }[];
    };
    texts: Record<string, string>;
    problems: number;
    catalog?: { ids: string[]; names: string[]; repos: string[] };
  } | null;
  if (inline) {
    const keysOf = (li: HTMLElement) => (li.dataset.keys ?? "").split(" ").filter(Boolean);
    const nowKeys = rows.flatMap(keysOf);
    const names: Record<string, string> = {};
    for (const li of rows) {
      const id = (li.querySelector("a")?.getAttribute("href") ?? "").slice(3);
      names[id] = li.dataset.title ?? id;
    }
    const storeKey = "project-status:visits";
    let stored = null;
    let canStore = true;
    try {
      stored = JSON.parse(localStorage.getItem(storeKey) ?? "null");
    } catch {
      canStore = false;
    }
    const result = compareVisit(
      stored,
      nowKeys,
      new Date().toISOString(),
      inline.changes,
      known.projects,
    );
    if (canStore) {
      try {
        localStorage.setItem(storeKey, JSON.stringify(result.next));
      } catch {
        // Storage full or blocked: the next visit compares with the last 24 hours.
      }
    }
    const n = result.newKeys.length;
    const m = result.fixedCount;
    const line = doc.querySelector("[data-changes]") as HTMLElement | null;
    if (line) {
      line.textContent = changesText(result.base, n, m, result.since, Date.now());
      line.title = result.since;
      line.hidden = false;
    }
    const isNew = new Set(result.newKeys);
    for (const li of rows) {
      if (keysOf(li).some((k) => isNew.has(k)))
        li.querySelector("[data-new]")?.removeAttribute("hidden");
    }
    const fixed = doc.querySelector("[data-fixed]") as HTMLDetailsElement | null;
    if (fixed && m > 0) {
      const stopped: Record<string, string> = {};
      for (const c of inline.changes.stopped) stopped[c.key] = `${c.project}: ${c.text}`;
      const summary = fixed.querySelector("summary");
      if (summary) summary.textContent = `Fixed: ${m}`;
      const list = fixed.querySelector("ul");
      for (const key of result.fixedKeys) {
        const item = doc.createElement("li");
        item.textContent = stopped[key] ?? fixedText(key, names, inline.texts);
        list?.appendChild(item);
      }
      fixed.hidden = false;
    }
  }

  // Spec 020 US5: the command box (⌘K / Ctrl+K).
  const box = doc.getElementById("command");
  const input = box?.querySelector("input") as HTMLInputElement | null;
  const results = box?.querySelector("[role=listbox]") as HTMLElement | null;
  if (box && input && results) {
    const items = [
      ...rows.map((li) => ({
        label: li.dataset.title ?? "",
        kind: "project",
        target: (li.querySelector("a")?.getAttribute("href") ?? "").slice(3),
      })),
      ...[
        ["Projects", "projects"],
        ["Campaigns", "campaigns"],
        ["Shared tokens", "tokens"],
        ["Versions", "versions"],
        ["History", "history"],
      ].map(([label, target]) => ({ label: `Tab: ${label}`, kind: "tab", target })),
      ...[
        ["Problems", "problems"],
        ["Warnings", "warnings"],
        ["Check not available", "not-available"],
        ["All correct", "correct"],
      ].map(([label, target]) => ({ label: `Filter: ${label}`, kind: "filter", target })),
      { label: "New project", kind: "action", target: "new-project" },
    ];
    let found: typeof items = [];
    let active = 0;
    let back: HTMLElement | null = null;
    const draw = () => {
      found = searchCommands(items, input.value);
      active = Math.min(active, Math.max(found.length - 1, 0));
      results.replaceChildren(
        ...found.map((item, i) => {
          const option = doc.createElement("li");
          option.id = `cmd-${i}`;
          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(i === active));
          option.className = `cursor-pointer rounded px-2 py-1${i === active ? " bg-base-200" : ""}`;
          option.textContent = item.label;
          option.addEventListener("click", () => run(item));
          return option;
        }),
      );
      input.setAttribute("aria-activedescendant", found.length ? `cmd-${active}` : "");
    };
    const hide = () => {
      box.classList.remove("modal-open");
      back?.focus();
    };
    const run = (item: { kind: string; target: string }) => {
      hide();
      if (item.kind === "project") open(item.target, true);
      else if (item.kind === "action") openNewProject();
      else if (item.kind === "tab") {
        view.tab = item.target;
        apply();
        save();
      } else {
        view.tab = "projects";
        view.state = item.target;
        const state = field("state");
        if (state) state.value = item.target;
        apply();
        save();
      }
    };
    // Spec 011 US4: the "New project" dialog.
    const np = doc.getElementById("new-project");
    const npNames = inline?.catalog ?? { ids: [], names: [], repos: [] };
    const npValues = () => {
      const f: Record<string, string> = {};
      for (const el of np?.querySelectorAll("[name]") ?? [])
        f[(el as HTMLInputElement).name] = (el as HTMLInputElement).value;
      return f;
    };
    const npDraw = () => {
      if (!np) return;
      const f = npValues();
      const msg = nameTaken(f, npNames);
      for (const key of ["id", "name", "repo"]) {
        const out = np.querySelector(`[data-msg=${key}]`);
        if (out) out.textContent = msg[key] ?? "";
      }
      const code = np.querySelector("code");
      if (code) code.textContent = Object.keys(msg).length ? "" : (newProjectCommand(f) ?? "");
    };
    const openNewProject = () => {
      if (!np) return;
      np.classList.add("modal-open");
      npDraw();
      (np.querySelector("[name=id]") as HTMLInputElement | null)?.focus();
    };
    if (np) {
      np.addEventListener("input", npDraw);
      np.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          np.classList.remove("modal-open");
          back?.focus();
        }
      });
      np.querySelector("[data-close-new-project]")?.addEventListener("click", (e) => {
        e.preventDefault();
        np.classList.remove("modal-open");
        back?.focus();
      });
      const copy = np.querySelector("[data-copy]") as HTMLButtonElement | null;
      copy?.addEventListener("click", () => {
        const code = np.querySelector("code");
        const text = code?.textContent ?? "";
        if (!text || !code) return;
        const done = () => {
          copy.textContent = "Copied";
          setTimeout(() => {
            copy.textContent = "Copy command";
          }, 2000);
        };
        const select = () => {
          const range = doc.createRange();
          range.selectNodeContents(code);
          getSelection()?.removeAllRanges();
          getSelection()?.addRange(range);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, select);
        else select();
      });
    }
    doc.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        back = doc.activeElement as HTMLElement | null;
        input.value = "";
        active = 0;
        draw();
        box.classList.add("modal-open");
        input.focus();
      }
    });
    input.addEventListener("input", () => {
      active = 0;
      draw();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") active = Math.min(active + 1, found.length - 1);
      else if (e.key === "ArrowUp") active = Math.max(active - 1, 0);
      else if (e.key === "Enter" && found[active]) return run(found[active]);
      else if (e.key === "Escape") return hide();
      else return;
      e.preventDefault();
      draw();
    });
    box.querySelector("[data-close-command]")?.addEventListener("click", (e) => {
      e.preventDefault();
      hide();
    });
  }

  // Spec 020 US3: the app works offline and shows the problem count on its icon where supported.
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  const nav = navigator as Navigator & {
    setAppBadge?: (n: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  const problems = inline?.problems ?? 0;
  if (problems > 0) nav.setAppBadge?.(problems).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});

  apply();
  if (view.project) open(view.project, false);
}
