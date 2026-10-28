import { describe, expect, test } from "bun:test";
import { mapRepo } from "../src/github";
import { renderPage } from "../src/render";
import type { ProjectStatus } from "../src/types";
import fixture from "./fixtures/graphql-response.json";
import { status } from "./helpers";

const generatedAt = new Date("2026-10-28T05:03:00Z");
const render = (rows: ProjectStatus[]) => renderPage({ generatedAt, rows });

describe("renderPage", () => {
  test("has the title and all columns", () => {
    const html = render([status()]);
    expect(html).toContain("<h1>Project status</h1>");
    for (const column of [
      "Project",
      "Problems",
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
    const html = render([
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
    expect(html).toContain("<td>2026-10-27 Succeeded</td>");
  });

  test("no-repo and unavailable rows", () => {
    expect(render([status({ availability: "no-repo" })])).toContain("<td>No repo</td>");
    expect(render([status({ availability: "unavailable" })])).toContain(
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
    expect(html).toContain(
      '<p id="stale" hidden>Warning: this data is more than 48 hours old.</p>',
    );
    expect(html).toContain(String(48 * 60 * 60 * 1000));
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
});
