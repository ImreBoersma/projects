import { describe, expect, test } from "bun:test";
import { datum, percent, renewalName, tijd, untilText } from "../src/stakeholder/text";
import { slug, stakeholderViews } from "../src/stakeholder/view";
import type { ProjectStatus, StatusPage } from "../src/types";
import { hobRows, status } from "./helpers";

const NOW = new Date("2026-11-17T11:00:00Z");
const page = (rows: ProjectStatus[], now = NOW, historyStart = "2026-11-05"): StatusPage => ({
  generatedAt: now,
  rows,
  issues: new Map(),
  historyStart,
});
const hob = (now = NOW) => stakeholderViews(page(hobRows(now), now))[0];
const block = (now: Date, id: string, change: (s: ProjectStatus) => ProjectStatus) =>
  stakeholderViews(
    page(
      hobRows(now).map((s) => (s.project.id === id ? change(s) : s)),
      now,
    ),
  )[0];

describe("spec 022 view model (T003)", () => {
  test("slug", () => {
    expect(slug("Harmonieorkest Brummen")).toBe("harmonieorkest-brummen");
    expect(slug("Café  Ünïon!")).toBe("cafe-union");
    expect(slug("-A-")).toBe("a");
  });

  test("one view for each stakeholder, projects in name order, no view without a stakeholder", () => {
    const other = status({
      project: { id: "x", name: "X", repo: null, status: "active", stakeholder: "A Orkest" },
    });
    const alone = status({ project: { id: "y", name: "Y", repo: null, status: "active" } });
    const views = stakeholderViews(page([...hobRows(NOW), other, alone]));
    expect(views.map((v) => v.name)).toEqual(["A Orkest", "Harmonieorkest Brummen"]);
    expect(views[1].projects.map((p) => p.name)).toEqual([
      "hob.nl",
      "Pretband",
      "Pretband backend",
    ]);
    expect(views[1].slug).toBe("harmonieorkest-brummen");
  });

  test("two names with the same slug stop the run", () => {
    const row = (id: string, stakeholder: string) =>
      status({ project: { id, name: id, repo: null, status: "active", stakeholder } });
    expect(() => stakeholderViews(page([row("a", "Orkest A"), row("b", "orkest-a")]))).toThrow(
      /Orkest A.*orkest-a|orkest-a.*Orkest A/,
    );
  });

  test("site facts", () => {
    const v = hob();
    expect(v.projects[0].site).toEqual({
      address: "harmonieorkestbrummen.nl",
      state: "online",
      since: null,
    });
    expect(v.projects[2].site).toBeNull();
    const down = block(NOW, "pretband", (s) => ({
      ...s,
      uptime: { state: "down", at: NOW },
      history: { ...s.history, since: { "pretband/site-down": "2026-11-17T08:00:00Z" } },
    }));
    expect(down.projects[1].site).toEqual({
      address: "pretband.nl",
      state: "offline",
      since: "2026-11-17T08:00:00Z",
    });
    const noHistory = block(NOW, "pretband", (s) => ({ ...s, uptime: { state: "down", at: NOW } }));
    expect(noHistory.projects[1].site?.since).toBe(NOW.toISOString());
    const notChecked = block(NOW, "pretband", (s) => ({
      ...s,
      uptime: { state: "not-available", at: NOW },
    }));
    expect(notChecked.projects[1].site?.state).toBe("not-checked");
  });

  test("uptime period", () => {
    expect(hob().projects[0].uptime).toEqual({ percent: 100, since: "2026-11-05" });
    const long = stakeholderViews(page(hobRows(NOW), NOW, "2026-10-18"))[0];
    expect(long.projects[0].uptime).toEqual({ percent: 100, since: null });
    const short = stakeholderViews(page(hobRows(NOW), NOW, "2026-10-19"))[0];
    expect(short.projects[0].uptime?.since).toBe("2026-10-19");
    const none = block(NOW, "hob-nl", (s) => ({ ...s, history: { ...s.history, uptime: null } }));
    expect(none.projects[0].uptime).toBeNull();
  });

  test("renewal: the first by date that is today or later", () => {
    expect(hob().projects[1].renewal).toEqual({ name: "Domain", date: "2027-02-01", days: 76 });
    const two = block(NOW, "hob-nl", (s) => ({
      ...s,
      expiry: {
        ...s.expiry,
        renewals: [
          { name: "Domain", date: "2027-05-01", days: 165, source: "catalog" },
          { name: "Hosting", date: "2026-11-10", days: -7, source: "catalog" },
          { name: "Hosting", date: "2027-03-01", days: 104, source: "catalog" },
        ],
      },
    }));
    expect(two.projects[0].renewal).toEqual({ name: "Hosting", date: "2027-03-01", days: 104 });
    expect(hob().projects[2].renewal).toBeNull();
  });

  test("state without a site: only faults are a problem", () => {
    const withProblem = (reason: string) =>
      block(NOW, "pretband-backend", (s) => ({
        ...s,
        problems: [
          { projectId: s.project.id, reason: reason as never, key: `${s.project.id}/${reason}` },
        ],
      })).projects[2].state;
    expect(hob().projects[2].state).toBe("works");
    expect(withProblem("ci-failed")).toBe("problem");
    expect(withProblem("deploy-failed")).toBe("problem");
    for (const r of [
      "renovate-stale",
      "inactive",
      "not-conformant",
      "secret-expiring",
      "cert-expiring",
      "renewal-due",
    ]) {
      expect(withProblem(r)).toBe("works");
    }
    const unread = block(NOW, "pretband-backend", (s) => ({ ...s, availability: "unavailable" }));
    expect(unread.projects[2].state).toBe("not-checked");
  });

  test("attention: only a site offline since 2 hours or longer; never a renewal", () => {
    expect(hob().attention).toEqual([]);
    expect(hob(new Date("2027-01-25T11:00:00Z")).attention).toEqual([]);
    const offline = (since: string) =>
      block(NOW, "pretband", (s) => ({
        ...s,
        uptime: { state: "down", at: NOW },
        history: { ...s.history, since: { "pretband/site-down": since } },
      }));
    expect(offline("2026-11-17T09:00:00Z").attention).toEqual([
      {
        kind: "offline",
        project: "Pretband",
        address: "pretband.nl",
        since: "2026-11-17T09:00:00Z",
      },
    ]);
    const short = offline("2026-11-17T09:01:00Z");
    expect(short.attention).toEqual([]);
    expect(short.projects[1].site?.state).toBe("offline");
  });
});

describe("spec 022 Dutch texts (T005)", () => {
  test("untilText", () => {
    const cases: [number, string][] = [
      [0, "vandaag"],
      [1, "over 1 dag"],
      [44, "over 44 dagen"],
      [45, "over 1 maand"],
      [59, "over 1 maand"],
      [60, "over 2 maanden"],
      [76, "over 2 maanden"],
      [165, "over 5 maanden"],
    ];
    for (const [days, text] of cases) expect(untilText(days)).toBe(text);
  });

  test("dates, percent and renewal names", () => {
    expect(datum("2027-02-01")).toBe("1 februari 2027");
    expect(tijd(new Date("2026-11-17T11:00:00Z"))).toBe("17 november 2026 om 12:00");
    expect(percent(100)).toBe("100 %");
    expect(percent(99.7)).toBe("99,7 %");
    expect(renewalName("Domain")).toBe("de domeinnaam");
    expect(renewalName("Hosting")).toBe("'Hosting'");
  });
});
