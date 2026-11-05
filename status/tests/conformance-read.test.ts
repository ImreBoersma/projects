import { describe, expect, test } from "bun:test";
import { readFacts } from "../src/conformance/read";

const API = "https://api.github.com/repos/ImreBoersma/one";
type Answer = number | { status?: number; json?: unknown; text?: string };

// A fake fetch: a path (after the repo URL, without query) gives an answer. Other paths give 404.
function fake(answers: Record<string, Answer>) {
  const methods: string[] = [];
  const fetch = async (url: string, init?: RequestInit) => {
    methods.push(init?.method ?? "GET");
    const path = url.replace(API, "").replace(/\?.*$/, "");
    const a = answers[path] ?? 404;
    if (typeof a === "number") return new Response(null, { status: a });
    const body = a.text ?? (a.json !== undefined ? JSON.stringify(a.json) : null);
    return new Response(body, { status: a.status ?? 200 });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, methods };
}

const full: Record<string, Answer> = {
  "": { json: { private: false, has_issues: true, default_branch: "main" } },
  "/contents/package.json": { text: "{}" },
  "/contents/.github/workflows": {
    json: [
      { name: "ci.yml", path: ".github/workflows/ci.yml" },
      { name: "README.md", path: ".github/workflows/README.md" },
    ],
  },
  "/contents/.github/workflows/ci.yml": { text: "jobs: {}" },
  "/contents/renovate.json": { text: '{"extends":["x"]}' },
  "/vulnerability-alerts": 204,
  "/automated-security-fixes": { json: { enabled: false } },
  "/actions/secrets": { json: { secrets: [{ name: "BUILD_ENV" }] } },
  "/actions/variables": { json: { variables: [{ name: "VERCEL_ORG_ID" }] } },
};

describe("readFacts", () => {
  test("reads all facts of a repo with GET requests only", async () => {
    const { fetch, methods } = fake(full);
    expect(await readFacts("ImreBoersma/one", "t", fetch)).toEqual({
      private: false,
      hasIssues: true,
      defaultBranch: "main",
      hasPackageJson: true,
      workflows: [{ path: ".github/workflows/ci.yml", text: "jobs: {}" }],
      renovate: { extends: ["x"] },
      dependabot: false,
      vulnerabilityAlerts: true,
      securityFixes: false,
      secretNames: ["BUILD_ENV"],
      variableNames: ["VERCEL_ORG_ID"],
    });
    expect(new Set(methods)).toEqual(new Set(["GET"]));
  });

  test("reads .github/renovate.json when there is no renovate.json", async () => {
    const answers = {
      ...full,
      "/contents/renovate.json": 404,
      "/contents/.github/renovate.json": { text: '{"extends":["y"]}' },
    };
    const facts = await readFacts("ImreBoersma/one", "t", fake(answers).fetch);
    expect(facts !== "not-available" && facts.renovate).toEqual({ extends: ["y"] });
  });

  test("404 of the alerts means off; 403 of the secrets means not available", async () => {
    const answers = { ...full, "/vulnerability-alerts": 404, "/actions/secrets": 403 };
    const facts = await readFacts("ImreBoersma/one", "t", fake(answers).fetch);
    expect(facts !== "not-available" && facts.vulnerabilityAlerts).toBe(false);
    expect(facts !== "not-available" && facts.secretNames).toBe("not-available");
  });

  test("a failed repo read makes the full repo not available", async () => {
    expect(await readFacts("ImreBoersma/one", "t", fake({ "": 403 }).fetch)).toBe("not-available");
  });
});
