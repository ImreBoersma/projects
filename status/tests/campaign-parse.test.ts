import { describe, expect, test } from "bun:test";
import { parseCampaign, targetRepos } from "../src/campaign/parse";
import type { Project } from "../src/types";

const projects: Project[] = [
  { id: "one", name: "One", repo: "ImreBoersma/one", status: "active" },
  { id: "two", name: "Two", repo: null, status: "active" },
  { id: "old", name: "Old", repo: "ImreBoersma/old", status: "archived" },
  { id: "hob", name: "Hob", repo: "org/hob", status: "maintenance" },
];
const valid = `id: node-24
title: "chore: use Node 24"
reason: |
  Node 22 leaves active support.
started: 2026-11-10
repos: all
changes:
  - write:
      path: .nvmrc
      content: "24\\n"
  - replace:
      path: .github/workflows/ci.yml
      old: "node-version: 22"
      new: "node-version: 24"
`;
const parse = (text: string, file = "node-24.yaml") => parseCampaign(text, file, projects);
const swap = (a: string, b: string) => valid.replace(a, b);

describe("parseCampaign", () => {
  test("reads the example of the contract", () => {
    const c = parse(valid);
    expect(c).toMatchObject({
      id: "node-24",
      title: "chore: use Node 24",
      started: "2026-11-10",
      repos: "all",
    });
    expect(c.changes).toEqual([
      { kind: "write", path: ".nvmrc", content: "24\n" },
      {
        kind: "replace",
        path: ".github/workflows/ci.yml",
        old: "node-version: 22",
        new: "node-version: 24",
      },
    ]);
  });

  test("rejects each wrong field", () => {
    const cases: [string, string, RegExp][] = [
      [swap("id: node-24", "id: No"), "node-24.yaml", /field `id`/],
      [valid, "other.yaml", /field `id`.*file name/],
      [
        swap('title: "chore: use Node 24"', `title: ${"x".repeat(81)}`),
        "node-24.yaml",
        /field `title`/,
      ],
      [
        swap("reason: |\n  Node 22 leaves active support.", 'reason: ""'),
        "node-24.yaml",
        /field `reason`/,
      ],
      [swap("started: 2026-11-10", "started: 2026-02-30"), "node-24.yaml", /field `started`/],
      [swap("repos: all", "repos: [two]"), "node-24.yaml", /field `repos`.*two/],
      [swap("repos: all", "repos: [old]"), "node-24.yaml", /field `repos`.*old/],
      [swap("repos: all", "repos: [nope]"), "node-24.yaml", /field `repos`/],
      [swap("path: .nvmrc", "path: /etc/x"), "node-24.yaml", /changes 0/],
      [swap("path: .nvmrc", "path: a/../../x"), "node-24.yaml", /changes 0/],
      [swap('old: "node-version: 22"', 'old: ""'), "node-24.yaml", /changes 1.*old/],
      [
        swap('new: "node-version: 24"', 'new: "node-version: 22"'),
        "node-24.yaml",
        /changes 1.*differ/,
      ],
      [swap("  - write:", "  - remove:"), "node-24.yaml", /changes 0.*write or replace/],
    ];
    for (const [text, file, error] of cases) expect(() => parse(text, file)).toThrow(error);
    expect(() => parse(`${valid.slice(0, valid.indexOf("changes:"))}changes: []\n`)).toThrow(
      /field `changes`/,
    );
  });
});

describe("targetRepos", () => {
  test("all: projects with a repo that are not archived, in catalog order", () => {
    expect(targetRepos(parse(valid), projects)).toEqual([
      { id: "one", repo: "ImreBoersma/one" },
      { id: "hob", repo: "org/hob" },
    ]);
    expect(targetRepos(parse(swap("repos: all", "repos: [hob]")), projects)).toEqual([
      { id: "hob", repo: "org/hob" },
    ]);
  });
});
