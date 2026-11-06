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
