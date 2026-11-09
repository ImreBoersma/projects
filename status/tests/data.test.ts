import { describe, expect, test } from "bun:test";
import { statusJson } from "../src/data";
import { mapRepo } from "../src/github";
import type { ProjectStatus } from "../src/types";
import { rowKind, summaryFact } from "../src/view";
import fixture from "./fixtures/graphql-response.json";
import { status } from "./helpers";

const generatedAt = new Date("2026-10-28T05:03:00Z");
const ci = (id: string) => ({
  projectId: id,
  reason: "ci-failed" as const,
  key: `${id}/ci-failed`,
});

describe("statusJson (spec 020 US2)", () => {
  const rows: ProjectStatus[] = [
    status({
      project: {
        id: "one",
        name: "One",
        repo: "ImreBoersma/one",
        status: "active",
        domain: "one.example",
        stakeholder: "Harmonieorkest Brummen",
      },
      problems: [ci("one")],
      uptime: { state: "up", at: generatedAt },
      history: {
        since: { "one/ci-failed": "2026-10-27T05:00:00Z" },
        sinceIsHistoryStart: [],
        uptime: { percent: 99.47, days: Array(30).fill("up") },
      },
    }),
    status({ project: { id: "two", name: "Two", repo: null, status: "maintenance" } }),
  ];
  const data = JSON.parse(
    statusJson({ generatedAt, rows, issues: new Map([["one/ci-failed", 12]]) }),
  );

  test("the fields of the contract", () => {
    expect(data.version).toBe(1);
    expect(data.generatedAt).toBe("2026-10-28T05:03:00.000Z");
    expect(data.total).toEqual({ kind: "problems", problems: 1, text: "1 problem" });
    expect(data.projects[0]).toEqual({
      id: "one",
      name: "One",
      status: "active",
      stakeholder: "Harmonieorkest Brummen",
      state: "bad",
      summary: { text: "The last CI run failed.", kind: "bad" },
      problems: [
        {
          key: "one/ci-failed",
          text: "The last CI run failed.",
          issue: "https://github.com/ImreBoersma/projects/issues/12",
          since: "2026-10-27T05:00:00Z",
        },
      ],
      site: {
        domain: "one.example",
        state: "up",
        checkedAt: "2026-10-28T05:03:00.000Z",
        uptime30: 99.5,
      },
      nextExpiry: null,
      link: "https://imreboersma.github.io/projects/#p-one",
    });
    expect(data.projects[1]).toMatchObject({ stakeholder: null, site: null, problems: [] });
  });

  test("the same state and summary as the rows", () => {
    rows.forEach((s, i) => {
      expect(data.projects[i].state).toBe(rowKind(s));
      expect(data.projects[i].summary).toEqual(summaryFact(s));
    });
  });

  test("privacy: no text from private repos (spec 001)", () => {
    const fromFixture = Object.entries(fixture.data).map(([alias, node]) =>
      mapRepo(node as never, {
        id: alias,
        name: alias,
        repo: `ImreBoersma/${alias}`,
        status: "active",
      }),
    );
    const text = statusJson({ generatedAt, rows: fromFixture, issues: new Map() });
    for (const secret of [
      "SECRET-COMMIT-MSG",
      "SECRET-PR-TITLE",
      "secret-branch",
      "some-person",
      "renovate[bot]",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  test("less than 50 KB for 20 projects (SC-005)", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
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
      }),
    );
    expect(
      Buffer.byteLength(statusJson({ generatedAt, rows: many, issues: new Map() })),
    ).toBeLessThan(50_000);
  });
});
