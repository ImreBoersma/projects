import { describe, expect, test } from "bun:test";
import { mapRepo } from "../src/github";
import { renderPage, repairText, summary } from "../src/render";
import { FAVICON } from "../src/style";
import type { ProjectStatus } from "../src/types";
import fixture from "./fixtures/graphql-response.json";
import { status } from "./helpers";

const generatedAt = new Date("2026-10-28T05:03:00Z");
const render = (rows: ProjectStatus[], issues = new Map<string, number>()) =>
  renderPage({ generatedAt, rows, issues });
// The cell values without the data-label attribute of the card layout (spec 007).
const plain = (rows: ProjectStatus[]) => render(rows).replace(/ data-label="[^"]*"/g, "");
// Spec 012: each link opens a new tab.
const A = (url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
const NT =
  '<span class="nt" aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>';

describe("renderPage", () => {
  test("has the title and all columns", () => {
    const html = render([status()]);
    expect(html).toContain("<h1>Project status</h1>");
    for (const column of [
      "Project",
      "Problems",
      "Site",
      "Last commit",
      "Open PRs",
      "Renovate PRs",
      "CI",
      "Last deploy",
    ]) {
      expect(html).toContain(`<th>${column}</th>`);
    }
  });

  test("shows the values of a row", () => {
    const html = plain([
      status({
        openPrCount: 3,
        renovatePrCount: 2,
        oldestRenovatePrAt: new Date("2026-10-08T00:00:00Z"),
        deploy: { at: new Date("2026-10-27T11:00:00Z"), result: "succeeded" },
      }),
    ]);
    expect(html).toContain(
      '<td><time datetime="2026-10-27T00:00:00.000Z" data-rel title="2026-10-27 00:00 UTC">2026-10-27</time> <small class="rel">(29 hours ago)</small></td><td>3</td>',
    );
    expect(html).toContain(
      '2, oldest <time datetime="2026-10-08T00:00:00.000Z" data-rel title="2026-10-08 00:00 UTC">2026-10-08</time> <small class="rel">(20 days ago)</small></td><td><span class="badge good">Passed</span></td>',
    );
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/one/deployments")}<span class="badge good">Succeeded</span>${NT} <time datetime="2026-10-27T11:00:00.000Z"`,
    );
  });

  test("puts the column Site after Problems", () => {
    expect(render([status()])).toContain(
      "<th>Problems</th><th>Site</th><th>Expiry</th><th>Last commit</th>",
    );
  });

  test("shows the site state and the time of the check (spec 005)", () => {
    const at = new Date("2026-11-04T10:17:42Z");
    const cell = (uptime: ProjectStatus["uptime"]) => plain([status({ uptime })]);
    const time =
      '<time datetime="2026-11-04T10:17:42.000Z" data-rel title="2026-11-04 10:17 UTC">10:17</time>';
    expect(cell({ state: "up", at })).toContain(`<td><span class="badge good">Up</span> ${time}`);
    expect(cell({ state: "down", at })).toContain(
      `<td><span class="badge bad">Down</span> ${time}`,
    );
    expect(cell({ state: "no-domain", at: null })).toContain("<td>No domain</td>");
    expect(cell({ state: "not-available", at })).toContain(
      '<td><span class="badge unknown">Check not available</span></td>',
    );
    expect(plain([status({ availability: "no-repo", uptime: { state: "up", at } })])).toContain(
      '</small></td><td></td><td><span class="badge unknown">No repo</span></td>',
    );
  });

  test("no-repo and unavailable rows", () => {
    expect(plain([status({ availability: "no-repo" })])).toContain(
      '<td><span class="badge unknown">No repo</span></td>',
    );
    expect(plain([status({ availability: "unavailable" })])).toContain(
      '<td><span class="badge unknown">Data not available</span></td>',
    );
  });

  test("escapes the project name", () => {
    const s = status();
    s.project = { ...s.project, name: "<b>A & B</b>" };
    expect(render([s])).toContain("&lt;b&gt;A &amp; B&lt;/b&gt;");
  });

  test("shows problem texts and marks the row", () => {
    const html = render([
      status({
        ci: "failed",
        problems: [
          { projectId: "one", reason: "ci-failed", key: "one/ci-failed" },
          { projectId: "one", reason: "inactive", key: "one/inactive" },
        ],
      }),
    ]);
    expect(html).toContain('<tr class="problem">');
    expect(html).toContain("The last CI run failed.<br>No commit for more than 90 days.");
  });

  test("shows the update time and a hidden old-data warning", () => {
    const html = render([]);
    expect(html).toContain(
      'Last update: <time datetime="2026-10-28T05:03:00.000Z" data-rel title="2026-10-28 05:03 UTC">2026-10-28 05:03 UTC</time> <small class="rel">(now)</small>',
    );
    expect(html).toContain('<p id="stale" hidden>Warning: this data is more than 3 hours old.</p>');
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

  test("links each cell to its source (spec 007)", () => {
    const oid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const html = render(
      [
        status({
          project: {
            id: "one",
            name: "One",
            repo: "ImreBoersma/one",
            status: "active",
            domain: "one.example",
          },
          commitOid: oid,
          ci: "failed",
          renovatePrCount: 1,
          renovateApp: "renovate",
          deploy: { at: generatedAt, result: "succeeded" },
          uptime: { state: "up", at: generatedAt },
          problems: [{ projectId: "one", reason: "ci-failed", key: "one/ci-failed" }],
        }),
      ],
      new Map([["one/ci-failed", 12]]),
    );
    expect(html).toContain(`${A("https://github.com/ImreBoersma/one")}One${NT}`);
    expect(html).toContain(
      `${A(`https://github.com/ImreBoersma/one/commit/${oid}/checks`)}<span class="badge bad">Failed</span>${NT}`,
    );
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/one/deployments")}<span class="badge good">Succeeded</span>${NT}`,
    );
    expect(html).toContain(
      A("https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate"),
    );
    expect(html).toContain(
      `${A("https://github.com/ImreBoersma/projects/issues/12")}The last CI run failed.${NT}`,
    );
    expect(html).toContain(`${A("https://one.example/")}<span class="badge good">Up</span>${NT}`);
  });

  test("cells without a source have no link", () => {
    const noRepo = status({
      availability: "no-repo",
      project: { id: "p", name: "P", repo: null, status: "active" },
    });
    for (const s of [noRepo, status({ availability: "unavailable" }), status()]) {
      const body = render([s]).split("<tbody>")[1];
      expect(body.match(/<a /g) ?? []).toHaveLength(s.availability === "no-repo" ? 0 : 1);
    }
  });

  test("links are underlined and show a focus outline (FR-012)", () => {
    const html = render([]);
    expect(html).toContain("a { color: var(--link); text-decoration: underline; }");
    expect(html).toContain("a:focus-visible { outline: 2px solid var(--link);");
    expect(html.match(/--link: #/g)).toHaveLength(2);
  });

  test("each cell has a data-label for the card layout", () => {
    const html = render([status()]);
    for (const column of ["Project", "Problems", "Site", "Last commit", "CI", "Last deploy"]) {
      expect(html).toContain(`<td data-label="${column}">`);
    }
    expect(html).toContain("@media (max-width: 600px)");
    expect(html).toContain("td::before { content: attr(data-label);");
    expect(html).toContain("thead { display: none; }");
  });

  test("the header links to the roadmap and the board", () => {
    const html = render([]);
    expect(html).toContain(
      `${A("https://github.com/users/ImreBoersma/projects/4/views/3")}Roadmap${NT}`,
    );
    expect(html).toContain(
      `${A("https://github.com/users/ImreBoersma/projects/4")}Project board${NT}`,
    );
  });

  test("the page loads no file from another site (FR-011)", () => {
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
    expect(html).toContain("The repo does not follow the shared setup.<br><small>");
    const docs = "https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md";
    expect(html).toContain(
      `${A(`${docs}#r4-renovate-preset`)}R4 Renovate preset${NT}, ${A(`${docs}#r6-issues-on`)}R6 Issues on${NT}`,
    );
  });

  test("shows a note, not a problem, when rules could not be read", () => {
    const html = render([status({ conformanceNotAvailable: ["R7", "R9"] })]);
    expect(html).toContain("<small>Setup check not available: R7, R9</small>");
    expect(html).not.toContain('class="problem"');
  });
});

describe("expiry on the page (spec 009)", () => {
  const cell = (expiry: ProjectStatus["expiry"]) =>
    render([status({ expiry })]).match(/<td data-label="Expiry">(.*?)<\/td>/)?.[1];

  test("has the column Expiry after Site", () => {
    expect(render([status()])).toContain("<th>Site</th><th>Expiry</th><th>Last commit</th>");
  });

  test("shows the certificate and the renewal with the fewest days, as badges", () => {
    const renewals = [
      { name: "Hosting", date: "2027-01-01", days: 57, source: "catalog" as const },
      { name: "Domain", date: "2027-03-01", days: 120, source: "registry" as const },
    ];
    const both = cell({
      certificate: { date: "2026-12-19", days: 44 },
      renewals,
      registryNotKnown: false,
    });
    expect(both).toContain(
      'Certificate: <span class="badge good"><time datetime="2026-12-19" data-rel title="2026-12-19">2026-12-19</time> <small class="rel">(in 52 days)</small></span>',
    );
    expect(both).toContain('<br>Hosting: <span class="badge warn"><time datetime="2027-01-01"');
    expect(both).not.toContain("Domain");
    expect(cell({ certificate: "not-known", renewals: [], registryNotKnown: true })).toBe(
      'Certificate: <span class="badge unknown">not known</span><br>Domain: <span class="badge unknown">not known</span>',
    );
    expect(cell({ certificate: null, renewals: [], registryNotKnown: false })).toBe("");
  });

  test("a date at or below the limit is bad, and the past says ago", () => {
    const past = { name: "Hosting", date: "2026-10-27", days: -1, source: "catalog" as const };
    const html = cell({
      certificate: { date: "2026-11-17", days: 20 },
      renewals: [past],
      registryNotKnown: false,
    });
    expect(html).toContain('Certificate: <span class="badge warn">');
    expect(html).toContain("(in 20 days)");
    expect(html).toContain('Hosting: <span class="badge bad">');
    expect(html).toContain("(1 day ago)");
  });

  test("a problem with a text shows that text", () => {
    const html = render([
      status({
        problems: [
          {
            projectId: "one",
            reason: "cert-expiring",
            key: "one/cert-expiring",
            text: "The TLS certificate expires in 10 days.",
          },
        ],
      }),
    ]);
    expect(html).toContain("The TLS certificate expires in 10 days.");
  });
});

describe("history on the page (spec 010)", () => {
  const ci = { projectId: "one", reason: "ci-failed" as const, key: "one/ci-failed" };
  const withSince = (time: string, atStart = false) =>
    render([
      status({
        problems: [ci],
        history: {
          since: { "one/ci-failed": time },
          sinceIsHistoryStart: atStart ? ["one/ci-failed"] : [],
          uptime: null,
        },
      }),
    ]);

  test("shows since when a problem is open, with a relative time", () => {
    expect(withSince("2026-10-28T04:00:00Z")).toContain(
      '<small>since <time datetime="2026-10-28T04:00:00Z" data-rel title="2026-10-28 04:00 UTC">04:00</time> <small class="rel">(1 hour ago)</small></small>',
    );
    expect(withSince("2026-10-26T04:00:00Z")).toContain(
      '>2026-10-26</time> <small class="rel">(2 days ago)</small></small>',
    );
    expect(withSince("2026-10-27T04:00:00Z")).toContain("(25 hours ago)");
    expect(withSince("2026-10-28T04:00:00Z", true)).toContain(
      "(1 hour ago)</small> or before</small>",
    );
    expect(render([status({ problems: [ci] })])).not.toContain("since <time");
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
    expect(html).toContain("<small>95.8% (30 days)</small>");
    expect(html.match(/<i class="mark /g)).toHaveLength(30);
    expect(html).toContain('<i class="mark down" title="2026-10-27 down"></i>');
    expect(html).toContain('<i class="mark no-data" title="2026-10-28 no data"></i>');
    expect(html).toContain(
      'aria-label="Uptime of the last 30 days: 1 day down, 1 day without data"',
    );
    expect(html.match(/--mark-down: #/g)).toHaveLength(2);
  });

  test("shows no data, and nothing for a project without a domain", () => {
    const noData = render([
      status({
        history: {
          since: {},
          sinceIsHistoryStart: [],
          uptime: { percent: null, days: Array(30).fill("no-data") },
        },
      }),
    ]);
    expect(noData).toContain("No data (30 days)");
    expect(render([status()])).not.toContain('class="bar"');
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
      'History from <time datetime="2026-11-05" data-rel title="2026-11-05">2026-11-05</time> <small class="rel">(in 8 days)</small>.',
    );
  });
});

describe("spec 012: total state, badges, sections, times, new tabs", () => {
  const ci = (id: string) => ({
    projectId: id,
    reason: "ci-failed" as const,
    key: `${id}/ci-failed`,
  });
  const named = (id: string, o: Partial<ProjectStatus> = {}) =>
    status({ ...o, project: { id, name: `Name ${id}`, repo: null, status: "active" } });

  test("US1: the title, the favicon and the badge show the total state", () => {
    const two = render([status({ problems: [ci("one")] }), status({ problems: [ci("two")] })]);
    expect(two).toContain("<title>(2) Project status</title>");
    expect(two).toContain(`<link rel="icon" href="${FAVICON.problems}">`);
    expect(two).toContain('<p class="total problems">');
    expect(two).toMatch(/<\/svg><\/span>2 problems<\/p>\n<p class="summary">/);
    const none = render([status()]);
    expect(none).toContain("<title>Project status</title>");
    expect(none).toContain(`href="${FAVICON.correct}"`);
    expect(none).toContain("</span>All correct</p>");
    const notAvailable = render([status({ availability: "unavailable" })]);
    expect(notAvailable).toContain("</span>Check not available</p>");
    expect(notAvailable).toContain(`href="${FAVICON["not-available"]}"`);
  });

  test("US2: states are badges with their text", () => {
    const html = render([
      status({
        uptime: { state: "down", at: generatedAt },
        ci: "passed",
        deploy: { at: generatedAt, result: "failed" },
      }),
    ]);
    expect(html).toContain('<span class="badge bad">Down</span>');
    expect(html).toContain('<span class="badge good">Passed</span>');
    expect(html).toContain('<span class="badge bad">Failed</span>');
    expect(html).toContain(".badge.warn { color: var(--warn-fg);");
  });

  test("US3: projects with problems first, then check not available, then the others", () => {
    const html = render([
      named("a"),
      named("b", { conformanceNotAvailable: ["R7"] }),
      named("z", { problems: [ci("z")] }),
    ]);
    const at = (text: string) => html.indexOf(text);
    expect(at("<h2>Projects with problems</h2>")).toBeLessThan(at("Name z"));
    expect(at("Name z")).toBeLessThan(at("<h2>Check not available</h2>"));
    expect(at("<h2>Check not available</h2>")).toBeLessThan(at("Name b"));
    expect(at("Name b")).toBeLessThan(at("<h2>Other projects</h2>"));
    expect(at("<h2>Other projects</h2>")).toBeLessThan(at("Name a"));
    expect(render([named("a")])).not.toContain("<h2>Projects with problems</h2>");
  });

  test("US4: relative times, and one inline script that updates them", () => {
    const html = render([status({ lastCommitAt: new Date("2026-10-25T05:03:00Z") })]);
    expect(html).toContain(
      'title="2026-10-25 05:03 UTC">2026-10-25</time> <small class="rel">(3 days ago)</small>',
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
          project: {
            id: "one",
            name: "One",
            repo: "ImreBoersma/one",
            status: "active",
            domain: "one.example",
          },
          commitOid: "abc",
          renovatePrCount: 1,
          renovateApp: "renovate",
          deploy: { at: generatedAt, result: "succeeded" },
          uptime: { state: "up", at: generatedAt },
          problems: [
            { projectId: "one", reason: "ci-failed", key: "one/ci-failed" },
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
    const links = html.match(/<a [\s\S]*?<\/a>/g) ?? [];
    expect(links.length).toBeGreaterThanOrEqual(9);
    for (const a of links) {
      expect(a).toContain('target="_blank" rel="noopener noreferrer"');
      expect(a).toEndWith(NT);
    }
  });

  test("a page with 20 rows is less than 100 KB (SC-006)", () => {
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
    expect(Buffer.byteLength(render(rows))).toBeLessThan(100_000);
  });
});
