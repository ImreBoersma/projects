import { describe, expect, test } from "bun:test";
import { SHARED, secretProblems, secretStatuses } from "../src/secrets/expiry";
import type { Project, SecretEntry } from "../src/types";

const now = new Date("2026-11-06T12:00:00Z");
const projects: Project[] = [
  { id: "hob-nl", name: "hob.nl", repo: null, status: "active" },
  { id: "old", name: "Old", repo: null, status: "archived" },
];
const entry = (o: Partial<SecretEntry> = {}): SecretEntry => ({
  name: "TOKEN_A",
  kind: "actions-secret",
  where: "ImreBoersma/projects",
  expires: "2026-11-26",
  project: null,
  ...o,
});
const statuses = (entries: SecretEntry[], read = new Map<string, string>()) =>
  secretStatuses(entries, read, projects, now);

describe("secretStatuses and secretProblems (US1)", () => {
  test("never without a read date has no date and no problem", () => {
    const s = statuses([entry({ expires: "never" })]);
    expect(s[0]).toMatchObject({ date: null, days: null });
    expect(secretProblems(s)).toEqual([]);
  });

  test("a problem at 30 days or less, not at 31", () => {
    expect(secretProblems(statuses([entry({ expires: "2026-12-06" })]))).toHaveLength(1);
    expect(secretProblems(statuses([entry({ expires: "2026-12-07" })]))).toEqual([]);
  });

  test("the text, the key and the owner", () => {
    const [p] = secretProblems(statuses([entry()]));
    expect(p).toMatchObject({
      projectId: SHARED,
      reason: "secret-expiring",
      key: "shared/secret-expiring/token-a",
      text: "The secret TOKEN_A expires in 20 days.",
      secret: {
        kind: "actions-secret",
        where: "ImreBoersma/projects",
        date: "2026-11-26",
        source: "catalog",
      },
    });
    const [q] = secretProblems(
      statuses([
        entry({
          name: "SSH password",
          expires: "2026-11-04",
          project: "hob-nl",
          where: "harmonieorkest-brummen/hob-nl",
        }),
      ]),
    );
    expect(q.key).toBe("hob-nl/secret-expiring/ssh-password");
    expect(q.text).toBe("The secret SSH password expired 2 days ago.");
  });

  test("two secrets give two problems", () => {
    expect(secretProblems(statuses([entry(), entry({ name: "TOKEN_B" })]))).toHaveLength(2);
  });

  test("a secret of an archived project has no status", () => {
    expect(statuses([entry({ project: "old" })])).toEqual([]);
  });
});

describe("privacy (SC-003, FR-002)", () => {
  test("no token value reaches the page, the issue or the history line", async () => {
    const { renderPage } = await import("../src/render");
    const { issueContent } = await import("../src/issues");
    const { resultLine } = await import("../src/history/store");
    const { status } = await import("./helpers");
    const values = ["ghp_FIXTUREVALUE1", "github_pat_FIXTUREVALUE2", "FIXTUREVALUE3"];
    const names = ["STATUS_READ_TOKEN", "STATUS_READ_TOKEN_HOB", "CONFORMANCE_READ_TOKEN"];
    const saved = names.map((n) => process.env[n]);
    names.forEach((n, i) => {
      process.env[n] = values[i];
    });
    const s = statuses(
      [entry(), entry({ name: "STATUS_READ_TOKEN", expires: "never" })],
      new Map([["STATUS_READ_TOKEN", "2026-11-20"]]),
    );
    const problems = secretProblems(s);
    const page = renderPage({
      generatedAt: now,
      rows: [status()],
      issues: new Map(),
      shared: { secrets: s, problems, gaps: [] },
    });
    const issue = issueContent(
      problems[0],
      { id: "shared", name: "Shared setup", repo: null, status: "active" },
      "2026-11-06",
    );
    const line = resultLine({
      time: now.toISOString(),
      projects: { shared: { site: "no-domain", problems: problems.map((p) => p.key) } },
    });
    for (const text of [page, issue.body, issue.title, line]) {
      for (const v of values) expect(text).not.toContain(v);
    }
    names.forEach((n, i) => {
      if (saved[i] === undefined) delete process.env[n];
      else process.env[n] = saved[i];
    });
  });
});
