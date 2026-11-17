import { describe, expect, test } from "bun:test";
import { archiveState, type CommitNode, isPersonCommit } from "../src/archive/rule";
import type { ArchiveRaw } from "../src/types";

const now = new Date("2026-11-16T12:00:00Z");
const commit = (pr: CommitNode["associatedPullRequests"], login: string | null = "someone") => ({
  committedDate: "2026-11-01T00:00:00Z",
  author: { user: login === null ? null : { login } },
  associatedPullRequests: pr,
});
const pr = (type: string, labels: string[] = []) => ({
  nodes: [{ author: { __typename: type }, labels: { nodes: labels.map((name) => ({ name })) } }],
});
const raw = (over: Partial<ArchiveRaw> = {}): ArchiveRaw => ({
  createdAt: "2024-01-01T00:00:00Z",
  lastPersonCommit: "2025-10-01T10:00:00Z",
  oldestCommitRead: "2024-01-02T00:00:00Z",
  historyComplete: true,
  lastPersonPr: null,
  lastPersonIssue: null,
  openPersonWork: false,
  listsComplete: true,
  notSureReason: null,
  ...over,
});

describe("isPersonCommit (research §3)", () => {
  test("a commit with a PR follows the PR author and the campaign label", () => {
    expect(isPersonCommit(commit(pr("User")))).toBe(true);
    // The Dependabot squash merge of pretband-backend: the commit author is a User.
    expect(isPersonCommit(commit(pr("Bot")))).toBe(false);
    expect(isPersonCommit(commit(pr("User", ["dependencies", "campaign"])))).toBe(false);
  });

  test("a direct push counts for a linked user that is not a bot", () => {
    expect(isPersonCommit(commit({ nodes: [] }))).toBe(true);
    expect(isPersonCommit(commit(null))).toBe(true);
    expect(isPersonCommit(commit({ nodes: [] }, "renovate[bot]"))).toBe(false);
    expect(isPersonCommit(commit({ nodes: [] }, null))).toBe(false);
  });
});

describe("archiveState (research §4, FR-003, FR-008)", () => {
  test("the 12-month rule", () => {
    expect(archiveState(raw({ lastPersonCommit: "2025-12-01T00:00:00Z" }), undefined, now)).toBe(
      undefined,
    );
    expect(archiveState(raw(), undefined, now)).toEqual({
      state: "suggest",
      since: "2025-10-01",
      orEarlier: false,
    });
    // Strictly before now minus 12 calendar months (UTC).
    expect(
      archiveState(raw({ lastPersonCommit: "2025-11-16T11:59:00Z" }), undefined, now)?.state,
    ).toBe("suggest");
    expect(archiveState(raw({ lastPersonCommit: "2025-11-16T12:01:00Z" }), undefined, now)).toBe(
      undefined,
    );
  });

  test("the last work is the latest of commit, PR and issue", () => {
    expect(
      archiveState(raw({ lastPersonPr: "2025-12-24T00:00:00Z" }), undefined, now),
    ).toBeUndefined();
    expect(archiveState(raw({ lastPersonIssue: "2025-11-01T00:00:00Z" }), undefined, now)).toEqual({
      state: "suggest",
      since: "2025-11-01",
      orEarlier: false,
    });
  });

  test("no person commit: the repo creation, or the oldest commit read with orEarlier", () => {
    expect(archiveState(raw({ lastPersonCommit: null }), undefined, now)).toEqual({
      state: "suggest",
      since: "2024-01-01",
      orEarlier: false,
    });
    expect(
      archiveState(raw({ lastPersonCommit: null, historyComplete: false }), undefined, now),
    ).toEqual({ state: "suggest", since: "2024-01-02", orEarlier: true });
    // A person PR after the oldest commit read gives an exact date.
    expect(
      archiveState(
        raw({
          lastPersonCommit: null,
          historyComplete: false,
          lastPersonPr: "2025-03-01T00:00:00Z",
        }),
        undefined,
        now,
      ),
    ).toEqual({ state: "suggest", since: "2025-03-01", orEarlier: false });
    // A new repo with only bot commits gets no suggestion in its first 12 months.
    expect(
      archiveState(
        raw({ lastPersonCommit: null, createdAt: "2026-05-01T00:00:00Z" }),
        undefined,
        now,
      ),
    ).toBeUndefined();
  });

  test("open work, lists not complete and missing data give no suggestion", () => {
    expect(archiveState(raw({ openPersonWork: true }), undefined, now)).toBeUndefined();
    expect(
      archiveState(raw({ listsComplete: false, notSureReason: "lists" }), undefined, now),
    ).toBeUndefined();
    expect(archiveState("not-available", undefined, now)).toBeUndefined();
    expect(archiveState(undefined, undefined, now)).toBeUndefined();
  });

  test("keep until a date (inclusive), then the rule again", () => {
    const keep = { until: "2026-11-16", reason: "Event site" };
    expect(archiveState(raw(), keep, now)).toEqual({
      state: "kept",
      until: "2026-11-16",
      reason: "Event site",
    });
    expect(archiveState(raw({ openPersonWork: true }), keep, now)?.state).toBe("kept");
    expect(archiveState(raw(), { ...keep, until: "2026-11-15" }, now)?.state).toBe("suggest");
  });
});
