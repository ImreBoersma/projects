import { describe, expect, test } from "bun:test";
import { mapRepo } from "../src/github";
import { renderPage, summary } from "../src/render";
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
    expect(render([status()])).toContain("<th>Problems</th><th>Site</th><th>Last commit</th>");
  });

  test("shows the site state and the time of the check (spec 005)", () => {
    const at = new Date("2026-11-04T10:17:42Z");
    const cell = (uptime: ProjectStatus["uptime"]) => plain([status({ uptime })]);
    expect(cell({ state: "up", at })).toContain("<td>Up 10:17</td>");
    expect(cell({ state: "down", at })).toContain("<td>Down 10:17</td>");
    expect(cell({ state: "no-domain", at: null })).toContain("<td>No domain</td>");
    expect(cell({ state: "not-available", at })).toContain("<td>Check not available</td>");
    expect(plain([status({ availability: "no-repo", uptime: { state: "up", at } })])).toContain(
      "<td>Up 10:17</td><td>No repo</td>",
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
