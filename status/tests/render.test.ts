import { describe, expect, test } from "bun:test";
import { mapRepo } from "../src/github";
import { renderPage, repairText, summary } from "../src/render";
import { FAVICON } from "../src/style";
import type { CampaignSummary, Problem, ProjectStatus, SecretStatus } from "../src/types";
import fixture from "./fixtures/graphql-response.json";
import { status } from "./helpers";

const generatedAt = new Date("2026-10-28T05:03:00Z");
const render = (rows: ProjectStatus[], issues = new Map<string, number>()) =>
  renderPage({ generatedAt, rows, issues });
// Spec 012: each link opens a new tab.
const A = (url: string) =>
  `<a class="link" href="${url}" target="_blank" rel="noopener noreferrer">`;
const NT =
  '<span class="nt" aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>';
// The facts line of the first project.
const facts = (s: ProjectStatus) =>
  render([s]).match(/<dl class="facts[^"]*">(.*?)<\/dl>/)?.[1] ?? "";
// The items of one labelled group (Site, Code, Expiry) of the first project.
const SEP = '<span class="sep" aria-hidden="true"> · </span>';
const group = (s: ProjectStatus, label: string) =>
  (facts(s).match(new RegExp(`<dt>${label}</dt><dd>(.*?)</dd>`))?.[1] ?? "").split(SEP);
const ci = (id = "one") => ({
  projectId: id,
  reason: "ci-failed" as const,
  key: `${id}/ci-failed`,
});
const site = {
  id: "one",
  name: "One",
  repo: "ImreBoersma/one",
  status: "active" as const,
  domain: "one.example",
};

describe("renderPage", () => {
  test("has the title, the header links and the total state", () => {
    const html = render([status()]);
    expect(html).toContain(">Project status</h1>");
    expect(html).toContain(
      `${A("https://github.com/users/ImreBoersma/projects/4/views/3")}Roadmap${NT}`,
    );
    expect(html).toContain(
      `${A("https://github.com/users/ImreBoersma/projects/4")}Project board${NT}`,
    );
    expect(html).toContain('<section class="total correct');
  });

  test("shows the facts in groups, and leaves out facts with no value", () => {
    const code = group(
      status({
        openPrCount: 3,
        renovatePrCount: 2,
        oldestRenovatePrAt: new Date("2026-10-08T00:00:00Z"),
        deploy: { at: new Date("2026-10-27T11:00:00Z"), result: "succeeded" },
      }),
      "Code",
    );
    expect(code[0]).toBe("CI passed");
    expect(code[1]).toStartWith(
      `${A("https://github.com/ImreBoersma/one/deployments")}Deployed${NT} <time datetime="2026-10-27T11:00:00.000Z" data-rel title="2026-10-27 11:00 UTC">18 hours ago</time>`,
    );
    expect(code[2]).toStartWith(
      'Last commit <time datetime="2026-10-27T00:00:00.000Z" data-rel title="2026-10-27 00:00 UTC">29 hours ago</time>',
    );
    expect(code[3]).toBe("3 open PRs");
    expect(code[4]).toStartWith("2 Renovate PRs, oldest <time");
    expect(code[4]).toContain(">20 days ago</time>");
    const quiet = facts(status({ ci: "unknown" }));
    expect(quiet).toStartWith("<div><dt>Code</dt><dd>Last commit");
    expect(quiet).not.toContain("<dt>Site</dt>");
    expect(quiet).not.toContain("<dt>Expiry</dt>");
    expect(quiet).not.toContain("open PR");
  });

  test("shows the site state; colour only when it is not good", () => {
    const at = new Date("2026-11-04T10:17:42Z");
    expect(group(status({ uptime: { state: "up", at } }), "Site")).toEqual([
      'Up<span class="sr"> (checked 10:17 UTC)</span>',
    ]);
    expect(group(status({ uptime: { state: "down", at } }), "Site")[0]).toStartWith(
      '<span class="badge badge-soft badge-sm badge-error bad">Down</span>',
    );
    expect(group(status({ uptime: { state: "not-available", at } }), "Site")).toEqual([
      '<span class="badge badge-soft badge-sm badge-neutral unknown">Check not available</span>',
    ]);
  });

  test("no-repo and unavailable rows show one fact", () => {
    expect(facts(status({ availability: "no-repo" }))).toBe(
      "<div><dt>Code</dt><dd>No repo</dd></div>",
    );
    expect(group(status({ availability: "unavailable" }), "Code")).toEqual([
      '<span class="badge badge-soft badge-sm badge-neutral unknown">Data not available</span>',
    ]);
  });

  test("escapes the project name", () => {
    const s = status();
    s.project = { ...s.project, name: "<b>A & B</b>" };
    expect(render([s])).toContain("&lt;b&gt;A &amp; B&lt;/b&gt;");
  });

  test("shows problem texts and marks the project", () => {
    const html = render([
      status({
        ci: "failed",
        problems: [ci(), { projectId: "one", reason: "inactive", key: "one/inactive" }],
      }),
    ]);
    expect(html).toContain('<li class="project bad"');
    expect(html).toContain('<span class="dot bad" role="img" aria-label="Problem"></span>');
    expect(html).toContain(
      "<li>The last CI run failed.</li><li>No commit for more than 90 days.</li>",
    );
  });

  test("shows the update time and a hidden old-data warning", () => {
    const html = render([]);
    expect(html).toContain(
      'Updated <time datetime="2026-10-28T05:03:00.000Z" data-rel title="2026-10-28 05:03 UTC">now</time><span class="sr"> (2026-10-28 05:03 UTC)</span>',
    );
    expect(html).toMatch(
      /<p id="stale" hidden[^>]*>Warning: this data is more than 3 hours old.<\/p>/,
    );
    expect(html).toContain(String(3 * 60 * 60 * 1000));
  });

  test("privacy: no text from private repos reaches the page", () => {
    const rows = Object.entries(fixture.data).map(([alias, node]) =>
      mapRepo(node as never, {
        id: alias,
        name: alias,
        repo: `ImreBoersma/${alias}`,
        status: "active",
      }),
    );
    const html = render(rows);
    for (const secret of [
      "SECRET-COMMIT-MSG",
      "SECRET-PR-TITLE",
      "secret-branch",
      "some-person",
      "renovate[bot]",
    ]) {
      expect(html).not.toContain(secret);
    }
  });

  test("links each fact to its source (spec 007)", () => {
    const oid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const html = render(
      [
        status({
          project: site,
          commitOid: oid,
          ci: "failed",
          renovatePrCount: 1,
          renovateApp: "renovate",
          deploy: { at: generatedAt, result: "succeeded" },
          uptime: { state: "up", at: generatedAt },
          problems: [ci()],
        }),
      ],
      new Map([["one/ci-failed", 12]]),
    );
    expect(html).toContain(`${A("https://github.com/ImreBoersma/one")}One${NT}`);
    expect(html).toContain(
      `${A(`https://github.com/ImreBoersma/one/commit/${oid}/checks`)}<span class="badge badge-soft badge-sm badge-error bad">CI failed</span>${NT}`,
    );
    expect(html).toContain(`${A("https://github.com/ImreBoersma/one/deployments")}Deployed${NT}`);
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate")}1 Renovate PR${NT}`,
    );
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/projects/issues/12")}The last CI run failed.${NT}`,
    );
    expect(html).toContain(`${A("https://one.example/")}Up${NT}`);
  });

  test("facts without a source have no link", () => {
    const noRepo = status({
      availability: "no-repo",
      project: { id: "p", name: "P", repo: null, status: "active" },
    });
    for (const s of [noRepo, status({ availability: "unavailable" }), status()]) {
      const html = render([s]);
      const box = html.slice(html.indexOf('<div class="modal-box'), html.indexOf("modal-backdrop"));
      expect(box.match(/target="_blank"/g) ?? []).toHaveLength(
        s.availability === "no-repo" ? 0 : 1,
      );
    }
  });

  test("links are underlined (spec 007 FR-012): the DaisyUI class link", () => {
    const html = render([status({ problems: [ci()] })], new Map([["one/ci-failed", 3]]));
    const external = html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? [];
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) expect(a).toContain('class="link"');
  });

  test("a project status other than active shows as a tag", () => {
    const s = status();
    s.project = { ...s.project, status: "maintenance" };
    expect(render([s])).toContain('<span class="badge badge-ghost badge-sm">maintenance</span>');
    expect(render([status()])).not.toContain("badge-ghost");
  });

  test("the page loads no file from another site (spec 007 FR-011)", () => {
    expect(render([status()])).not.toMatch(/<(script|link|img)[^>]+(src|href)="(?!data:)/);
  });
});

describe("summary", () => {
  const problem = (id: string) => ({
    projectId: id,
    reason: "ci-failed" as const,
    key: `${id}/ci-failed`,
  });
  const up = { state: "up" as const, at: generatedAt };
  const down = { state: "down" as const, at: generatedAt };

  test("counts problems, projects and sites", () => {
    const rows = [
      status({ problems: [problem("one")] }),
      status({ problems: [problem("two")] }),
      ...Array.from({ length: 10 }, () => status()),
    ];
    expect(summary(rows)).toBe("2 problems in 2 projects. 10 projects without a problem.");
    rows[0].uptime = up;
    rows[1].uptime = down;
    expect(summary(rows)).toContain("1 of 2 sites is up.");
  });

  test("uses the singular for 1", () => {
    expect(summary([status({ problems: [problem("one")], uptime: up }), status()])).toBe(
      "1 problem in 1 project. 1 project without a problem. 1 of 1 site is up.",
    );
  });

  test("says no problems, and does not count sites that were not checked", () => {
    const rows = [
      status({ uptime: up }),
      status({ uptime: { state: "not-available", at: generatedAt } }),
    ];
    expect(summary(rows)).toBe("No problems. 2 projects. 1 of 1 site is up.");
    expect(summary([status()])).toBe("No problems. 1 project.");
  });
});

describe("conformance on the page (spec 008)", () => {
  test("shows the failed rules under the problem text, with links to the repair steps", () => {
    const html = render([
      status({
        problems: [
          {
            projectId: "one",
            reason: "not-conformant",
            key: "one/not-conformant",
            detail: ["R4 Renovate preset", "R6 Issues on"],
          },
        ],
      }),
    ]);
    const docs = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";
    expect(html).toContain('The repo does not follow the shared setup.<br><span class="rules">');
    expect(html).toContain(
      `${A(`${docs}#r4-renovate-preset`)}R4 Renovate preset${NT}, ${A(`${docs}#r6-issues-on`)}R6 Issues on${NT}`,
    );
  });

  test("shows a fact, not a problem, when rules could not be read", () => {
    const html = render([status({ conformanceNotAvailable: ["R7", "R9"] })]);
    expect(html).toContain("Setup check not available: R7, R9</dd>");
    expect(html).toContain('<li class="project unknown"');
  });
});

describe("expiry on the page (spec 009)", () => {
  test("shows the certificate and the renewal with the fewest days", () => {
    const renewals = [
      { name: "Hosting", date: "2027-01-01", days: 57, source: "catalog" as const },
      { name: "Domain", date: "2027-03-01", days: 120, source: "registry" as const },
    ];
    const expiry = (e: ProjectStatus["expiry"]) => group(status({ expiry: e }), "Expiry");
    const both = expiry({
      certificate: { date: "2026-12-19", days: 44 },
      renewals,
      registryNotKnown: false,
    });
    expect(both[0]).toStartWith(
      'Certificate <time datetime="2026-12-19" data-rel title="2026-12-19">in 52 days</time>',
    );
    expect(both[1]).toStartWith(
      '<span class="badge badge-soft badge-sm badge-warning warn">Hosting renewal <time datetime="2027-01-01"',
    );
    expect(both).toHaveLength(2);
    expect(expiry({ certificate: "not-known", renewals: [], registryNotKnown: true })).toEqual([
      "Certificate date not known",
      "Domain date not known",
    ]);
    expect(facts(status())).not.toContain("<dt>Expiry</dt>");
  });

  test("a date at or below the limit is bad, and the past says so", () => {
    const past = { name: "Hosting", date: "2026-10-27", days: -1, source: "catalog" as const };
    const expiry = {
      certificate: { date: "2026-11-17", days: 20 },
      renewals: [past],
      registryNotKnown: false,
    };
    const items = group(status({ expiry }), "Expiry");
    expect(items[0]).toStartWith(
      '<span class="badge badge-soft badge-sm badge-warning warn">Certificate <time',
    );
    expect(items[0]).toContain(">in 20 days</time>");
    expect(items[1]).toStartWith(
      '<span class="badge badge-soft badge-sm badge-error bad">Hosting renewal was due <time',
    );
    expect(items[1]).toContain(">1 day ago</time>");
    expect(render([status({ expiry: { ...expiry, renewals: [] } })])).toContain(
      '<li class="project warn"',
    );
  });
});

describe("history on the page (spec 010)", () => {
  const withSince = (time: string, atStart = false) =>
    render([
      status({
        problems: [ci()],
        history: {
          since: { "one/ci-failed": time },
          sinceIsHistoryStart: atStart ? ["one/ci-failed"] : [],
          uptime: null,
        },
      }),
    ]);

  test("shows since when a problem is open", () => {
    expect(withSince("2026-10-28T04:00:00Z")).toContain(
      '<span class="since">Started <time datetime="2026-10-28T04:00:00Z" data-rel title="2026-10-28 04:00 UTC">1 hour ago</time>',
    );
    expect(withSince("2026-10-26T04:00:00Z")).toContain(">2 days ago</time>");
    expect(withSince("2026-10-28T04:00:00Z", true)).toContain(
      "(2026-10-28 04:00 UTC)</span> or before</span>",
    );
    expect(render([status({ problems: [ci()] })])).not.toContain("Started");
  });

  test("shows the uptime and a bar of 30 marks for a site", () => {
    const days = [...Array(28).fill("up"), "down", "no-data"];
    const html = render([
      status({
        project: { id: "one", name: "One", repo: null, status: "active", domain: "one.example" },
        availability: "no-repo",
        uptime: { state: "up", at: generatedAt },
        history: {
          since: {},
          sinceIsHistoryStart: [],
          uptime: { percent: 95.8, days },
          uptimeEnd: "2026-10-28",
        },
      }),
    ]);
    // Spec 019: the modal has the percentage; the bar is in the History tab.
    expect(html).toContain(`${SEP}95.8% in 30 days</dd>`);
    expect(html.slice(html.indexOf('id="tab-history"'))).toContain(
      '95.8% in 30 days <span class="bar"',
    );
    expect(html.match(/<i class="mark /g)).toHaveLength(30);
    expect(html).toContain('<i class="mark down" title="2026-10-27 down"></i>');
    expect(html).toContain('<i class="mark no-data" title="2026-10-28 no data"></i>');
    expect(html).toContain(
      'aria-label="Uptime of the last 30 days: 1 day down, 1 day without data"',
    );
  });

  test("no data, and nothing for a project without a domain", () => {
    const noData = render([
      status({
        uptime: { state: "up", at: generatedAt },
        history: {
          since: {},
          sinceIsHistoryStart: [],
          uptime: { percent: null, days: Array(30).fill("no-data") },
        },
      }),
    ]);
    expect(noData).toContain("No data in 30 days");
    expect(render([status()])).not.toContain('class="bar"');
  });

  test("the page shows the repair time and the start of the history", () => {
    const html = renderPage({
      generatedAt,
      rows: [],
      issues: new Map(),
      repair: null,
      historyStart: "2026-11-05",
    });
    expect(html).toContain("No repaired faults in the last 90 days.");
    expect(html).toContain(
      'History from <time datetime="2026-11-05" data-rel title="2026-11-05">in 8 days</time>',
    );
  });
});

describe("spec 012: total state, sections, times, new tabs", () => {
  const named = (id: string, o: Partial<ProjectStatus> = {}) =>
    status({ ...o, project: { id, name: `Name ${id}`, repo: null, status: "active" } });

  test("US1: the title, the favicon and the total state", () => {
    const two = render([status({ problems: [ci("one")] }), status({ problems: [ci("two")] })]);
    expect(two).toContain("<title>(2) Project status</title>");
    expect(two).toContain(`<link rel="icon" href="${FAVICON.problems}">`);
    expect(two).toContain('<section class="total problems');
    expect(two).toMatch(/<\/svg><\/span>2 problems<\/p>\n<p class="summary">/);
    const none = render([status()]);
    expect(none).toContain("<title>Project status</title>");
    expect(none).toContain(`href="${FAVICON.correct}"`);
    expect(none).toContain("</span>All correct</p>");
    const notAvailable = render([status({ availability: "unavailable" })]);
    expect(notAvailable).toContain("</span>Check not available</p>");
    expect(notAvailable).toContain(`href="${FAVICON["not-available"]}"`);
  });

  test("US2: good states are plain text; other states are badges with their text", () => {
    const html = render([
      status({
        uptime: { state: "down", at: generatedAt },
        ci: "passed",
        deploy: { at: generatedAt, result: "failed" },
      }),
    ]);
    expect(html).toContain('<span class="badge badge-soft badge-sm badge-error bad">Down</span>');
    expect(html).toContain(`<dd>CI passed${SEP}`);
    expect(html).not.toContain("badge good");
    expect(html).toContain(
      '<span class="badge badge-soft badge-sm badge-error bad">Deploy failed</span>',
    );
  });

  test("US3 (spec 019 default sort): problems, then check not available, then the others", () => {
    const html = render([
      named("a"),
      named("b", { conformanceNotAvailable: ["R7"] }),
      named("z", { problems: [ci("z")] }),
    ]);
    const list = html.slice(html.indexOf("data-rows"), html.indexOf("data-empty"));
    const at = (id: string) => list.indexOf(`href="#p-${id}"`);
    expect(at("z")).toBeLessThan(at("b"));
    expect(at("b")).toBeLessThan(at("a"));
  });

  test("US4: relative times with the exact time in the tooltip, and one inline script", () => {
    const html = render([status({ lastCommitAt: new Date("2026-10-25T05:03:00Z") })]);
    expect(html).toContain(
      'title="2026-10-25 05:03 UTC">3 days ago</time><span class="sr"> (2026-10-25 05:03 UTC)</span>',
    );
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script[^>]*src=/);
    expect(html).toContain("function relTime(");
    expect(html).toContain("setInterval(updateTimes, 60000)");
  });

  test("US5: each link opens a new tab and says so (SC-003)", () => {
    const html = render(
      [
        status({
          project: site,
          commitOid: "abc",
          renovatePrCount: 1,
          renovateApp: "renovate",
          deploy: { at: generatedAt, result: "succeeded" },
          uptime: { state: "up", at: generatedAt },
          problems: [
            ci(),
            {
              projectId: "one",
              reason: "not-conformant",
              key: "one/not-conformant",
              detail: ["R4 Renovate preset"],
            },
          ],
        }),
      ],
      new Map([["one/ci-failed", 12]]),
    );
    const links = (html.match(/<a [\s\S]*?<\/a>/g) ?? []).filter((a) => a.includes('href="http'));
    expect(links.length).toBeGreaterThanOrEqual(9);
    for (const a of links) {
      expect(a).toContain('target="_blank" rel="noopener noreferrer"');
      expect(a).toEndWith(NT);
    }
  });

  test("a page with 20 projects and the CSS is less than 150 KB (spec 019 SC-005)", async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      status({
        project: {
          id: `p${i}`,
          name: `Project ${i}`,
          repo: `ImreBoersma/p${i}`,
          status: "active",
          domain: `p${i}.example`,
        },
        problems: [ci(`p${i}`)],
        uptime: { state: "up", at: generatedAt },
        expiry: {
          certificate: { date: "2026-12-19", days: 52 },
          renewals: [{ name: "Domain", date: "2027-03-01", days: 124, source: "registry" }],
          registryNotKnown: false,
        },
        history: {
          since: { [`p${i}/ci-failed`]: "2026-10-26T04:00:00Z" },
          sinceIsHistoryStart: [],
          uptime: { percent: 99.5, days: Array(30).fill("up") },
          uptimeEnd: "2026-10-28",
        },
      }),
    );
    // Spec 019 SC-005: the page with the built CSS stays less than 150 KB.
    const css = Bun.file(new URL("../build/page.css", import.meta.url));
    const cssSize = (await css.exists()) ? css.size : 60_000;
    expect(Buffer.byteLength(render(rows)) + cssSize).toBeLessThan(150_000);
  });
});

describe("repairText (spec 010)", () => {
  test("uses hours, minutes or days", () => {
    expect(repairText({ averageMs: 4 * 3600_000, count: 2 })).toBe(
      "Average time to repair: 4 hours (2 faults, 90 days).",
    );
    expect(repairText({ averageMs: 30 * 60_000, count: 1 })).toBe(
      "Average time to repair: 30 minutes (1 fault, 90 days).",
    );
    expect(repairText({ averageMs: 72 * 3600_000, count: 3 })).toBe(
      "Average time to repair: 3 days (3 faults, 90 days).",
    );
    expect(repairText({ averageMs: 1.5 * 3600_000, count: 2 })).toBe(
      "Average time to repair: 1.5 hours (2 faults, 90 days).",
    );
    expect(repairText({ averageMs: 3600_000, count: 1 })).toBe(
      "Average time to repair: 1 hour (1 fault, 90 days).",
    );
    expect(repairText(null)).toBe("No repaired faults in the last 90 days.");
  });
});

describe("secrets on the page (spec 013)", () => {
  const secret = (name: string, date: string, days: number, owner = "one"): SecretStatus => ({
    entry: {
      name,
      kind: "actions-secret",
      where: "ImreBoersma/one",
      expires: date,
      project: owner,
    },
    owner,
    date,
    days,
    source: "catalog",
  });

  test("a project secret in 45 days is amber in the Expiry line, with a warn dot", () => {
    const html = render([status({ secrets: [secret("VERCEL_TOKEN", "2026-12-12", 45)] })]);
    expect(
      group(status({ secrets: [secret("VERCEL_TOKEN", "2026-12-12", 45)] }), "Expiry")[0],
    ).toStartWith(
      '<span class="badge badge-soft badge-sm badge-warning warn">Secret VERCEL_TOKEN <time datetime="2026-12-12"',
    );
    expect(html).toContain('<li class="project warn"');
  });

  test("two secrets show the first one and a count", () => {
    const s = status({
      secrets: [secret("B", "2027-06-01", 216), secret("A", "2027-01-01", 65)],
    });
    expect(group(s, "Expiry")[0]).toStartWith("Secret A <time");
    expect(group(s, "Expiry")[0]).toEndWith("(+1 more)");
  });

  test("no expiry: an amber warning in the Expiry line; the dot stays green", () => {
    const s = status({ secretsNoExpiry: ["BOARD_TOKEN", "VERCEL_TOKEN"] });
    expect(group(s, "Expiry")).toEqual([
      '<span class="badge badge-soft badge-sm badge-warning warn" title="This secret can expire, but it has no expiry date. Set one at the provider, then in projects.yaml.">No expiry: BOARD_TOKEN, VERCEL_TOKEN</span>',
    ]);
    expect(render([s])).toContain('<li class="project good"');
    expect(render([s])).toContain("<title>Project status</title>");
  });

  test("the shared group shows the secrets without expiry", () => {
    const html = renderPage({
      generatedAt,
      rows: [],
      issues: new Map(),
      shared: { secrets: [], problems: [], gaps: [], noExpiry: ["BOARD_SYNC_TOKEN"] },
    });
    expect(html).toContain("<h2>Shared tokens</h2>");
    expect(html).toContain("No expiry: BOARD_SYNC_TOKEN</span>");
  });

  test("a gap shows in the Code line", () => {
    expect(group(status({ secretGaps: ["X", "Y"] }), "Code")).toContain(
      "Secret not in the catalog: X, Y",
    );
  });

  test("the shared group, and the total counts its problems", () => {
    const problem: Problem = {
      projectId: "shared",
      reason: "secret-expiring",
      key: "shared/secret-expiring/token-a",
      text: "The secret TOKEN_A expires in 20 days.",
    };
    const html = renderPage({
      generatedAt,
      rows: [status()],
      issues: new Map([["shared/secret-expiring/token-a", 31]]),
      shared: {
        secrets: [secret("TOKEN_A", "2026-11-17", 20, "shared")],
        problems: [problem],
        gaps: ["NEW_SECRET"],
      },
    });
    expect(html).toContain("<title>(1) Project status</title>");
    expect(html).toContain("<h2>Shared tokens</h2>");
    expect(html).toContain('<li class="project bad"');
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/projects/issues/31")}The secret TOKEN_A expires in 20 days.${NT}`,
    );
    expect(html).toContain(
      '<span class="badge badge-soft badge-sm badge-error bad">Secret TOKEN_A <time datetime="2026-11-17"',
    );
    expect(html).toContain("Secret not in the catalog: NEW_SECRET");
    expect(html).toContain("1 shared problem.");
  });

  test("no secrets and no gaps: no shared group", () => {
    expect(render([status()])).not.toContain("<h2>Shared tokens</h2>");
    expect(
      renderPage({
        generatedAt,
        rows: [],
        issues: new Map(),
        shared: { secrets: [], problems: [], gaps: [] },
      }),
    ).not.toContain("<h2>Shared tokens</h2>");
  });
});

describe("campaigns on the page (spec 015)", () => {
  const counts = (o: Partial<Record<string, number>>) => ({
    merged: 0,
    open: 0,
    "failed-ci": 0,
    closed: 0,
    "to-do": 0,
    "not-needed": 0,
    ...o,
  });
  const campaign = (o: Partial<CampaignSummary> = {}): CampaignSummary => ({
    id: "node-24",
    title: "Use Node 24",
    started: "2026-10-24",
    counts: counts({ merged: 2, open: 2 }),
    done: false,
    doneAt: null,
    url: "https://github.com/pulls?q=is%3Apr+head%3Acampaign%2Fnode-24",
    ...o,
  });
  const page = (campaigns: CampaignSummary[]) =>
    renderPage({ generatedAt, rows: [status()], issues: new Map(), campaigns });

  test("the counts and the search link", () => {
    const html = page([campaign()]);
    expect(html).toContain('<h2>Campaigns <span class="count">1</span></h2>');
    expect(html).toContain(
      `<dd>2 merged${SEP}2 open${SEP}${A("https://github.com/pulls?q=is%3Apr+head%3Acampaign%2Fnode-24")}PRs${NT}</dd>`,
    );
    expect(html).toContain('<li class="project unknown"');
    expect(html).toContain(">4 days ago</time>");
  });

  test("failed CI: an amber badge and dot; the total state does not change", () => {
    const html = page([campaign({ counts: counts({ open: 1, "failed-ci": 1 }) })]);
    expect(html).toContain(
      '<span class="badge badge-soft badge-sm badge-warning warn">1 failed CI</span>',
    );
    expect(html).toContain('<li class="project warn"');
    expect(html).toContain("<title>Project status</title>");
    expect(html).toContain('<section class="total correct');
  });

  test("done: Done with the time", () => {
    const html = page([
      campaign({ done: true, doneAt: "2026-10-27T05:03:00Z", counts: counts({ merged: 4 }) }),
    ]);
    expect(html).toContain('<li class="project good"');
    expect(html).toContain('<dd>Done <time datetime="2026-10-27T05:03:00Z"');
  });

  test("no campaigns: no section", () => {
    expect(page([])).not.toContain("<h2>Campaigns <span");
    expect(page([])).toContain("No open campaign.");
  });
});
