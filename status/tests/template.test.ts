import { describe, expect, test } from "bun:test";
import { checkRepo, RULES } from "../src/conformance/rules";
import { HOSTS, type Visibility } from "../src/new-project/hosts";
import { templateFiles } from "../src/new-project/template";
import type { RepoFacts } from "../src/types";

// Spec 011 FR-011: CI checks the template with the file rules R1 to R5 of spec 008.
const facts = async (
  hostKey: (typeof HOSTS)[number]["key"],
  visibility: Visibility,
): Promise<RepoFacts> => {
  const files = await templateFiles({
    id: "t",
    name: "T",
    repo: "t",
    visibility,
    stack: "Vite",
    host: hostKey,
  });
  return {
    private: visibility === "private",
    hasIssues: true,
    defaultBranch: "main",
    hasPackageJson: files.has("package.json"),
    workflows: [...files]
      .filter(([p]) => p.startsWith(".github/workflows/"))
      .map(([path, text]) => ({ path, text })),
    renovate: JSON.parse(files.get("renovate.json") ?? "null"),
    dependabot: files.has(".github/dependabot.yml"),
    vulnerabilityAlerts: true,
    securityFixes: false,
    secretNames: "not-available",
    variableNames: "not-available",
  };
};
const name = (id: string) => `${id} ${RULES.find((r) => r.id === id)?.name}`;

describe("template/ (spec 011 contracts/template.md)", () => {
  for (const h of HOSTS) {
    for (const id of ["R1", "R2", "R3", "R4", "R5"]) {
      test(`${h.key}: ${name(id)}`, async () => {
        const result = checkRepo(await facts(h.key, "public")).find((r) => r.rule === id);
        expect(result?.state).toBe("pass");
      });
    }
    test(`${h.key}: each workflow has at most 15 lines`, async () => {
      for (const w of (await facts(h.key, "public")).workflows as { path: string; text: string }[])
        expect(w.text.trimEnd().split("\n").length).toBeLessThanOrEqual(15);
    });
  }

  test("private: R2 does not apply", async () => {
    const r = checkRepo(await facts("vercel", "private"));
    expect(r.find((x) => x.rule === "R2")?.state).toBe("not-applicable");
    expect(r.find((x) => x.rule === "R1")?.state).toBe("pass");
  });
});
