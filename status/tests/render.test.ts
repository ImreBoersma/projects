import { describe, expect, test } from "bun:test";
import { mapRepo } from "../src/github";
import { renderPage, repairText, summary } from "../src/render";
import type { ProjectStatus } from "../src/types";
import fixture from "./fixtures/graphql-response.json";
import { status } from "./helpers";

const generatedAt = new Date("2026-10-28T05:03:00Z");
const render = (rows: ProjectStatus[], issues = new Map<string, number>()) =>
  renderPage({ generatedAt, rows, issues });
// The cell values without the data-label attribute of the card layout (spec 007).
const plain = (rows: ProjectStatus[]) => render(rows).replace(/ data-label="[^"]*"/g, "");

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
      "<td>2026-10-27</td><td>3</td><td>2 (oldest 20 days)</td><td>Passed</td>",
    );
    expect(html).toContain(
      '<td><a href="https://github.com/ImreBoersma/one/deployments">2026-10-27 Succeeded</a></td>',
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
    expect(cell({ state: "up", at })).toContain("<td>Up 10:17</td>");
    expect(cell({ state: "down", at })).toContain("<td>Down 10:17</td>");
    expect(cell({ state: "no-domain", at: null })).toContain("<td>No domain</td>");
    expect(cell({ state: "not-available", at })).toContain("<td>Check not available</td>");
    expect(plain([status({ availability: "no-repo", uptime: { state: "up", at } })])).toContain(
      "<td>Up 10:17</td><td></td><td>No repo</td>",
    );
  });

  test("no-repo and unavailable rows", () => {
    expect(plain([status({ availability: "no-repo" })])).toContain("<td>No repo</td>");
    expect(plain([status({ availability: "unavailable" })])).toContain(
      "<td>Data not available</td>",
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
    expect(html).toContain('<time datetime="2026-10-28T05:03:00.000Z">2026-10-28 05:03</time> UTC');
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
    expect(html).toContain('<a href="https://github.com/ImreBoersma/one">One</a>');
    expect(html).toContain(
      `<a href="https://github.com/ImreBoersma/one/commit/${oid}/checks">Failed</a>`,
    );
    expect(html).toContain(
      '<a href="https://github.com/ImreBoersma/one/deployments">2026-10-28 Succeeded</a>',
    );
    expect(html).toContain(
      '<a href="https://github.com/ImreBoersma/one/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Frenovate">',
    );
    expect(html).toContain(
      '<a href="https://github.com/ImreBoersma/projects/issues/12">The last CI run failed.</a>',
    );
    expect(html).toContain('<a href="https://one.example/">Up 05:03</a>');
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
      '<a href="https://github.com/users/ImreBoersma/projects/4/views/3">Roadmap</a>',
    );
    expect(html).toContain(
      '<a href="https://github.com/users/ImreBoersma/projects/4">Project board</a>',
    );
  });

  test("the page loads no file from another site (FR-011)", () => {
    expect(render([status()])).not.toMatch(/<(script|link|img)[^>]+(src|href)=/);
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
    expect(html).toContain(
      '<a href="https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#r4-renovate-preset">R4 Renovate preset</a>, <a href="https://github.com/ImreBoersma/projects/blob/main/docs/conformance.md#r6-issues-on">R6 Issues on</a>',
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

  test("shows the certificate and the renewal with the fewest days", () => {
    const renewals = [
      { name: "Hosting", date: "2027-01-01", days: 57, source: "catalog" as const },
      { name: "Domain", date: "2027-03-01", days: 120, source: "registry" as const },
    ];
    expect(
      cell({ certificate: { date: "2026-12-19", days: 44 }, renewals, registryNotKnown: false }),
    ).toBe("Certificate: 44 days<br>Hosting: 57 days");
    expect(cell({ certificate: "not-known", renewals: [], registryNotKnown: true })).toBe(
      "Certificate: not known<br>Domain: not known",
    );
    expect(cell({ certificate: null, renewals: [], registryNotKnown: false })).toBe("");
  });

  test("uses day for 1 and ago for the past", () => {
    const one = { name: "Hosting", date: "2026-11-06", days: 1, source: "catalog" as const };
    const past = { ...one, days: -1 };
    expect(
      cell({ certificate: { date: "x", days: 1 }, renewals: [one], registryNotKnown: false }),
    ).toBe("Certificate: 1 day<br>Hosting: 1 day");
    expect(cell({ certificate: null, renewals: [past], registryNotKnown: false })).toBe(
      "Hosting: 1 day ago",
    );
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

  test("shows since when a problem is open", () => {
    expect(withSince("2026-10-28T04:00:00Z")).toContain("<small>(since 04:00)</small>");
    expect(withSince("2026-10-26T04:00:00Z")).toContain(
      "<small>(since 2026-10-26, 2 days)</small>",
    );
    expect(withSince("2026-10-27T04:00:00Z")).toContain("(since 2026-10-27, 1 day)");
    expect(withSince("2026-10-28T04:00:00Z", true)).toContain("(since 2026-10-28 or before)");
    expect(render([status({ problems: [ci] })])).not.toContain("(since");
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
    expect(html).toContain("History from 2026-11-05.");
  });
});
