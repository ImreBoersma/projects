import { describe, expect, test } from "bun:test";
import { checkRepo, RULES } from "../src/conformance/rules";
import type { RepoFacts } from "../src/types";

const caller = (extra = "", permissions = "permissions: { contents: read }") => `name: CI
on: push
${permissions}
jobs:
  ci:
    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main
    secrets: { build-env: "\${{ secrets.BUILD_ENV }}" }
${extra}`;
const board = `name: Board
on: issues
permissions: { contents: read }
jobs:
  board:
    uses: ImreBoersma/projects/.github/workflows/add-to-board.yml@main
    secrets:
      board-token: \${{ secrets.BOARD_TOKEN }}
`;

function facts(overrides: Partial<RepoFacts> = {}): RepoFacts {
  return {
    private: false,
    hasIssues: true,
    defaultBranch: "main",
    hasPackageJson: true,
    workflows: [
      { path: ".github/workflows/ci.yml", text: caller() },
      { path: ".github/workflows/board.yml", text: board },
    ],
    renovate: { extends: ["github>ImreBoersma/projects//renovate/default"] },
    dependabot: false,
    vulnerabilityAlerts: true,
    securityFixes: false,
    secretNames: ["BUILD_ENV", "BOARD_TOKEN"],
    variableNames: [],
    ...overrides,
  };
}

const failed = (f: RepoFacts, exceptions?: Record<string, string>) =>
  checkRepo(f, exceptions)
    .filter((r) => r.state === "fail")
    .map((r) => r.rule);
const stateOf = (f: RepoFacts, rule: string) => checkRepo(f).find((r) => r.rule === rule)?.state;

describe("checkRepo", () => {
  test("a repo that follows the setup passes all rules", () => {
    expect(failed(facts())).toEqual([]);
    expect(checkRepo(facts()).map((r) => r.rule)).toEqual(RULES.map((r) => r.id));
  });

  test("R1: a Node repo needs the CI caller on @main", () => {
    expect(failed(facts({ workflows: [{ path: "b.yml", text: board }] }))).toEqual(["R1"]);
    const branch = caller().replace("ci-node.yml@main", "ci-node.yml@004-project-board");
    expect(
      failed(
        facts({
          workflows: [
            { path: "c.yml", text: branch },
            { path: "b.yml", text: board },
          ],
        }),
      ),
    ).toEqual(["R1"]);
    expect(stateOf(facts({ hasPackageJson: false }), "R1")).toBe("not-applicable");
    // Spec 008 T025: without package.json, R1 does not apply, also when the workflows are unknown.
    expect(stateOf(facts({ hasPackageJson: false, workflows: "not-available" }), "R1")).toBe(
      "not-applicable",
    );
  });

  test("R2: a public repo needs the board caller; a private repo does not", () => {
    expect(failed(facts({ workflows: [{ path: "c.yml", text: caller() }] }))).toEqual(["R2"]);
    expect(
      stateOf(facts({ private: true, workflows: [{ path: "c.yml", text: caller() }] }), "R2"),
    ).toBe("not-applicable");
  });

  test("R3 and R9 only look at callers of shared workflows", () => {
    const own = {
      path: "deploy.yml",
      text: `permissions: {}\njobs:\n  d:\n    steps: [{ run: "echo \${{ secrets.OWN }}" }]`,
    };
    expect(failed(facts({ workflows: [...(facts().workflows as []), own] }))).toEqual([]);
  });

  test("R4: the preset must be in extends, without a branch ref", () => {
    expect(failed(facts({ renovate: null }))).toEqual(["R4"]);
    expect(
      failed(
        facts({
          renovate: {
            extends: ["github>ImreBoersma/projects//renovate/default#004-project-board"],
          },
        }),
      ),
    ).toEqual(["R4"]);
  });

  test("R7: alerts on and security updates off", () => {
    expect(failed(facts({ vulnerabilityAlerts: false }))).toEqual(["R7"]);
    expect(failed(facts({ securityFixes: true }))).toEqual(["R7"]);
  });

  test("an exception makes a rule not applicable", () => {
    expect(failed(facts({ hasIssues: false }), { R6: "Reason." })).toEqual([]);
    expect(checkRepo(facts(), { R6: "Reason." })[5].state).toBe("not-applicable");
  });

  test("a fact that could not be read gives not-available for its rules only", () => {
    const results = checkRepo(facts({ secretNames: "not-available", hasIssues: false }));
    expect(results.find((r) => r.rule === "R9")?.state).toBe("not-available");
    expect(results.find((r) => r.rule === "R6")?.state).toBe("fail");
    expect(stateOf(facts({ workflows: "not-available" }), "R1")).toBe("not-available");
  });
});

// SC-003: the 5 deviations that the Maintainer repaired by hand in the first week of November 2026.
describe("deviations of the first week (research.md §8)", () => {
  test("issues off: R6", () => {
    expect(failed(facts({ hasIssues: false }))).toEqual(["R6"]);
  });
  test("a Dependabot config: R5", () => {
    expect(failed(facts({ dependabot: true }))).toEqual(["R5"]);
  });
  test("a default branch that is not main: R8", () => {
    expect(failed(facts({ defaultBranch: "master" }))).toEqual(["R8"]);
  });
  test("Vercel ids as secrets and not as variables: R9", () => {
    const vercel = caller(`  deploy:
    uses: ImreBoersma/projects/.github/workflows/deploy-vercel.yml@main
    with: { org-id: "\${{ vars.VERCEL_ORG_ID }}" }
`);
    const f = facts({
      workflows: [
        { path: "ci.yml", text: vercel },
        { path: "board.yml", text: board },
      ],
      secretNames: ["BUILD_ENV", "BOARD_TOKEN", "VERCEL_ORG_ID"],
    });
    expect(failed(f)).toEqual(["R9"]);
  });
  test("vars that the called shared workflow reads, not the caller: R9", () => {
    // deploy-vercel.yml reads vars.VERCEL_ORG_ID and vars.VERCEL_PROJECT_ID of the caller repo.
    const vercel = caller(`  deploy:
    uses: ImreBoersma/projects/.github/workflows/deploy-vercel.yml@main
    secrets: { vercel-token: "\${{ secrets.VERCEL_TOKEN }}" }
`);
    const shared = { "deploy-vercel.yml": ["VERCEL_ORG_ID", "VERCEL_PROJECT_ID"] };
    const f = (variableNames: string[]) =>
      facts({
        workflows: [
          { path: "ci.yml", text: vercel },
          { path: "board.yml", text: board },
        ],
        secretNames: ["BUILD_ENV", "BOARD_TOKEN", "VERCEL_TOKEN"],
        variableNames,
      });
    expect(checkRepo(f([]), {}, shared).find((r) => r.rule === "R9")?.state).toBe("fail");
    expect(checkRepo(f(["VERCEL_ORG_ID"]), {}, shared).find((r) => r.rule === "R9")?.state).toBe(
      "fail",
    );
    expect(
      checkRepo(f(["VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]), {}, shared).find((r) => r.rule === "R9")
        ?.state,
    ).toBe("pass");
  });
  test("a caller with permissions: {}: R3", () => {
    const f = facts({
      workflows: [
        { path: "ci.yml", text: caller("", "permissions: {}") },
        { path: "board.yml", text: board },
      ],
    });
    expect(failed(f)).toEqual(["R3"]);
  });
});

describe("docs/conformance.md (US3)", () => {
  test("has a section for each rule, with the anchor that the page and the issue use", async () => {
    const doc = await Bun.file(new URL("../../docs/conformance.md", import.meta.url)).text();
    const anchors = [...doc.matchAll(/^## (.+)$/gm)].map((m) =>
      m[1]
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/ /g, "-"),
    );
    for (const rule of RULES) expect(anchors).toContain(rule.anchor);
  });
});
