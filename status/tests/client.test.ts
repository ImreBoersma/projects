import { describe, expect, test } from "bun:test";
import { compare, matches, type RowData, readView, writeView } from "../src/client";

const known = { stakeholders: ["Harmonieorkest Brummen"], projects: ["hob-nl", "one"] };

describe("readView and writeView (contracts/address.md)", () => {
  test("defaults", () => {
    expect(readView("", "", known)).toEqual({
      q: "",
      state: "",
      stakeholder: "",
      site: "",
      sort: "state",
      tab: "projects",
      project: "",
      unknown: false,
    });
    expect(writeView(readView("", "", known))).toBe("");
  });

  test("each key, and back", () => {
    const search =
      "?q=bus&state=problems&stakeholder=Harmonieorkest+Brummen&site=yes&sort=expiry&tab=tokens";
    const view = readView(search, "#p-hob-nl", known);
    expect(view).toMatchObject({
      q: "bus",
      state: "problems",
      stakeholder: "Harmonieorkest Brummen",
      site: "yes",
      sort: "expiry",
      tab: "tokens",
      project: "hob-nl",
      unknown: false,
    });
    expect(writeView(view)).toBe(`${search}#p-hob-nl`);
  });

  test("unknown values are ignored and marked; an unknown project gives no pop-up", () => {
    const view = readView("?state=bad&stakeholder=HOB&sort=age", "#p-nope", known);
    expect(view).toMatchObject({
      state: "",
      stakeholder: "",
      sort: "state",
      project: "",
      unknown: true,
    });
    expect(readView("", "#other", known).project).toBe("");
  });
});

const row = (o: Partial<RowData>): RowData => ({
  name: "one",
  state: "good",
  stakeholder: "",
  site: "no",
  commit: "",
  expiry: "",
  order: "0",
  ...o,
});
const view = (o: Partial<ReturnType<typeof readView>>) => ({ ...readView("", "", known), ...o });

describe("matches", () => {
  test("search, state, stakeholder, site", () => {
    expect(matches(row({ name: "boek de bus" }), view({ q: "BUS" }))).toBe(true);
    expect(matches(row({ name: "hob.nl" }), view({ q: "bus" }))).toBe(false);
    expect(matches(row({ state: "bad" }), view({ state: "problems" }))).toBe(true);
    expect(matches(row({ state: "warn" }), view({ state: "warnings" }))).toBe(true);
    expect(matches(row({ state: "unknown" }), view({ state: "not-available" }))).toBe(true);
    expect(matches(row({ state: "good" }), view({ state: "problems" }))).toBe(false);
    expect(
      matches(
        row({ stakeholder: "Harmonieorkest Brummen" }),
        view({ stakeholder: "Harmonieorkest Brummen" }),
      ),
    ).toBe(true);
    expect(matches(row({}), view({ stakeholder: "Harmonieorkest Brummen" }))).toBe(false);
    expect(matches(row({ site: "yes" }), view({ site: "yes" }))).toBe(true);
    expect(matches(row({ site: "no" }), view({ site: "yes" }))).toBe(false);
  });
});

describe("compare (data-model.md sort keys)", () => {
  const rows = [
    row({ name: "e", state: "good", order: "0", commit: "2026-11-01T00:00:00Z", expiry: "" }),
    row({ name: "a", state: "warn", order: "1", commit: "", expiry: "2026-12-01" }),
    row({
      name: "d",
      state: "bad",
      order: "2",
      commit: "2026-10-01T00:00:00Z",
      expiry: "2027-01-01",
    }),
    row({ name: "b", state: "unknown", order: "3", commit: "2026-09-01T00:00:00Z", expiry: "" }),
    row({ name: "c", state: "good", order: "4", commit: "", expiry: "2026-11-20" }),
  ];
  const names = (sort: string) => [...rows].sort((x, y) => compare(x, y, sort)).map((r) => r.name);

  test("each sort", () => {
    expect(names("state")).toEqual(["d", "a", "b", "e", "c"]);
    expect(names("name")).toEqual(["a", "b", "c", "d", "e"]);
    expect(names("commit")).toEqual(["b", "d", "e", "a", "c"]);
    expect(names("expiry")).toEqual(["c", "a", "d", "e", "b"]);
  });
});

describe("compareVisit and fixedText (spec 020)", () => {
  const { compareVisit, fixedText } = require("../src/client") as typeof import("../src/client");
  const changes = {
    since: "2026-11-06T12:00:00Z",
    started: [{ key: "two/site-down" }],
    stopped: [{ key: "one/ci-failed" }],
  };
  const ids = ["one", "two"];
  const at = (h: number) =>
    new Date(Date.parse("2026-11-07T12:00:00Z") + h * 3600_000).toISOString();

  test("no stored visit: the last 24 hours", () => {
    const r = compareVisit(null, ["two/site-down"], at(0), changes, ids);
    expect(r).toMatchObject({
      base: "24h",
      since: changes.since,
      newKeys: ["two/site-down"],
      fixedKeys: ["one/ci-failed"],
    });
    expect(r.next).toEqual({ last: undefined, current: { time: at(0), keys: ["two/site-down"] } });
  });

  test("a visit 2 hours ago becomes the base", () => {
    const stored = { current: { time: at(-2), keys: ["one/ci-failed", "gone/x"] } };
    const r = compareVisit(stored, ["two/site-down"], at(0), changes, ids);
    expect(r).toMatchObject({
      base: "visit",
      since: at(-2),
      newKeys: ["two/site-down"],
      fixedKeys: ["one/ci-failed"],
    });
    expect(r.next.last).toEqual(stored.current);
  });

  test("a reload within 10 minutes keeps the old base", () => {
    const stored = {
      last: { time: at(-5), keys: [] },
      current: { time: at(-0.05), keys: ["two/site-down"] },
    };
    const r = compareVisit(stored, ["two/site-down"], at(0), changes, ids);
    expect(r).toMatchObject({ base: "visit", since: at(-5), newKeys: ["two/site-down"] });
  });

  test("at most 20 fixed keys in the list, the full count in the line (T028)", () => {
    const keys = Array.from({ length: 30 }, (_, i) => `one/r${i}`);
    const r = compareVisit({ current: { time: at(-1), keys } }, [], at(0), changes, ids);
    expect(r.fixedKeys).toHaveLength(20);
    expect(r.fixedCount).toBe(30);
  });

  test("the changes line; a visit more than 30 days ago shows its date (T029)", () => {
    const { changesText } = require("../src/client") as typeof import("../src/client");
    // In the page, relTime of view.ts is in the same script (render.ts).
    (globalThis as { relTime?: unknown }).relTime = (
      require("../src/view") as typeof import("../src/view")
    ).relTime;
    const now = Date.parse("2026-11-11T12:00:00Z");
    expect(changesText("24h", 1, 2, "2026-11-10T12:00:00Z", now)).toBe(
      "In the last 24 hours: 1 new, 2 fixed",
    );
    expect(changesText("visit", 1, 0, "2026-11-11T10:00:00Z", now)).toBe(
      "Since your visit 2 hours ago: 1 new, 0 fixed",
    );
    expect(changesText("visit", 0, 0, "2026-11-11T10:00:00Z", now)).toBe(
      "No change since your visit 2 hours ago",
    );
    expect(changesText("visit", 3, 1, "2026-09-01T08:00:00Z", now)).toBe(
      "Since 2026-09-01: 3 new, 1 fixed",
    );
    expect(changesText("visit", 0, 0, "2026-09-01T08:00:00Z", now)).toBe(
      "No change since 2026-09-01",
    );
  });

  test("fixedText", () => {
    const texts = { "ci-failed": "The last CI run failed.", warning: "A warning." };
    expect(fixedText("hob-nl/ci-failed", { "hob-nl": "hob.nl" }, texts)).toBe(
      "hob.nl: The last CI run failed.",
    );
    expect(fixedText("hob-nl/warning", { "hob-nl": "hob.nl" }, texts)).toBe("hob.nl: A warning.");
  });
});

describe("searchCommands (spec 020 US5)", () => {
  const { searchCommands } = require("../src/client") as typeof import("../src/client");
  const items = [
    ...["hob.nl", "Boek de bus", "Personal website"].map((label, i) => ({
      label,
      kind: "project",
      target: `p${i}`,
    })),
    { label: "Tab: Campaigns", kind: "tab", target: "campaigns" },
    { label: "Filter: Problems", kind: "filter", target: "problems" },
  ];
  test("projects first, then tabs and filters, at most 8", () => {
    expect(searchCommands(items, "hob")[0].label).toBe("hob.nl");
    expect(searchCommands(items, "camp")[0].target).toBe("campaigns");
    expect(searchCommands(items, "PROB")[0].target).toBe("problems");
    expect(searchCommands(items, "")[0].kind).toBe("project");
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `x${i}`,
      kind: "project",
      target: `x${i}`,
    }));
    expect(searchCommands(many, "x")).toHaveLength(8);
  });
});

describe("the New project dialog (spec 011 US4, contracts/dialog.md)", () => {
  const { nameTaken, newProjectCommand, searchCommands } =
    require("../src/client") as typeof import("../src/client");
  const f = {
    id: "orkest-site",
    name: "Orkest's site",
    repo: "orkest-site",
    visibility: "private",
    stack: "Vite, React",
    host: "vercel",
  };

  test("the command, with POSIX quotes", () => {
    expect(newProjectCommand(f)).toBe(
      "cd status && bun run new-project --id orkest-site --name 'Orkest'\\''s site' --repo orkest-site --visibility private --stack 'Vite, React' --host vercel",
    );
  });

  test("no command until the id, the name and the repo are valid", () => {
    expect(newProjectCommand({ ...f, id: "" })).toBeNull();
    expect(newProjectCommand({ ...f, id: "Orkest" })).toBeNull();
    expect(newProjectCommand({ ...f, name: " " })).toBeNull();
    expect(newProjectCommand({ ...f, repo: "ImreBoersma/x" })).toBeNull();
    expect(newProjectCommand({ ...f, stack: " " })).toBeNull();
    expect(newProjectCommand({ ...f, name: "x".repeat(61) })).toBeNull();
  });

  test("the messages for an empty stack and a long name (T035)", () => {
    const names = { ids: [], names: [], repos: [] };
    expect(nameTaken({ ...f, stack: "" }, names)).toEqual({ stack: "Write a stack." });
    expect(nameTaken({ id: "", name: "", repo: "", stack: "" }, names)).toEqual({});
    expect(nameTaken({ ...f, name: "x".repeat(61) }, names)).toEqual({
      name: "Use 1 to 60 characters.",
    });
  });

  test("the messages for values in the catalog", () => {
    const names = { ids: ["hob-nl"], names: ["hob.nl"], repos: ["imreboersma/boek-de-bus"] };
    expect(
      nameTaken({ id: "hob-nl", name: "HOB.nl", repo: "Boek-de-bus", stack: "x" }, names),
    ).toEqual({
      id: "This id is in the catalog.",
      name: "This name is in the catalog.",
      repo: "ImreBoersma/Boek-de-bus is in the catalog.",
    });
    expect(nameTaken({ id: "A b", repo: "a/b" }, names)).toEqual({
      id: "Use a-z, 0-9 and -.",
      repo: "Use A-Z, a-z, 0-9, ., _ and -.",
    });
    expect(nameTaken(f, names)).toEqual({});
  });

  test('"new" finds the item after the projects, tabs and filters', () => {
    const items = [
      { label: "Tab: Projects", kind: "tab", target: "projects" },
      { label: "New project", kind: "action", target: "new-project" },
      { label: "New site", kind: "project", target: "new-site" },
    ];
    expect(searchCommands(items, "new").map((i) => i.label)).toEqual(["New site", "New project"]);
  });

  test("the page sends no request (spec 020 FR-010)", async () => {
    const text = await Bun.file(new URL("../src/client.ts", import.meta.url)).text();
    expect(text).not.toContain("fetch(");
    expect(text).not.toContain("XMLHttpRequest");
  });
});

describe("the tab Versions (spec 016)", () => {
  test("?tab=versions opens it, and the command box has Tab: Versions", () => {
    const { start } = require("../src/client") as typeof import("../src/client");
    expect(readView("?tab=versions", "", known).tab).toBe("versions");
    expect(writeView(readView("?tab=versions", "", known))).toBe("?tab=versions");
    expect(start.toString()).toMatch(/\["Versions",\s*"versions"\]/);
  });
});

describe("tabs and pop-ups (spec 019 T030, T031)", () => {
  const { start } = require("../src/client") as typeof import("../src/client");
  test("Left and Right move between tabs; a pushed pop-up closes with Back", () => {
    const code = start.toString();
    expect(code).toContain('"ArrowLeft"');
    expect(code).toContain('"ArrowRight"');
    expect(code).toContain("history.back()");
  });
});
