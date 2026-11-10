import { describe, expect, test } from "bun:test";
import { readVersions } from "../src/versions/read";

const API = "https://api.github.com/repos/ImreBoersma/one/contents/";
type Answer = number | string | "throw";

// A fake fetch: a file path gives an answer (text = 200). Other paths give 404.
function fake(answers: Record<string, Answer>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const a = answers[url.replace(API, "")] ?? 404;
    if (a === "throw") throw new Error("network");
    if (typeof a === "number") return new Response(null, { status: a });
    return new Response(a, { status: 200 });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}
const read = (answers: Record<string, Answer>, ci: string[] = []) =>
  readVersions("one", "ImreBoersma/one", "secret-token", ci, "24", fake(answers).fetch);
const pkg = (v: unknown) => JSON.stringify(v);

describe("readVersions (spec 016)", () => {
  test("no package.json: no row", async () => {
    expect(await read({})).toBeNull();
  });

  test("the packages: dependencies before devDependencies", async () => {
    const row = await read({
      "package.json": pkg({
        dependencies: { next: "16.4.1", react: "^19.3.1", typescript: "^6.0.3" },
        devDependencies: { typescript: "^5", "@biomejs/biome": "2.2.0", "@types/node": "^20" },
      }),
    });
    expect(row?.state).toBe("ok");
    expect(row?.tools.next).toEqual({ text: "16.4.1", source: "dependencies", major: 16 });
    expect(row?.tools.typescript).toEqual({ text: "^6.0.3", source: "dependencies", major: 6 });
    expect(row?.tools.biome).toEqual({ text: "2.2.0", source: "devDependencies", major: 2 });
    expect(row?.tools["types-node"]?.major).toBe(20);
    expect(row?.tools.react?.major).toBe(19);
  });

  test("Node: ci.yml, then .nvmrc, .node-version, engines, then the shared default", async () => {
    const ci = `jobs:\n  ci:\n    uses: ImreBoersma/projects/.github/workflows/ci-node.yml@main\n    with: { node-version: "22" }`;
    const all = {
      "package.json": pkg({ engines: { node: ">=18" } }),
      ".nvmrc": "v20\n",
      ".node-version": "21",
    };
    expect((await read(all, ["on: push", ci]))?.tools.node).toEqual({
      text: "22",
      source: "ci.yml",
      major: 22,
    });
    expect((await read(all))?.tools.node).toEqual({ text: "v20", source: ".nvmrc", major: 20 });
    const { ".nvmrc": _, ...noNvmrc } = all;
    expect((await read(noNvmrc))?.tools.node?.source).toBe(".node-version");
    expect((await read({ "package.json": all["package.json"] }))?.tools.node?.source).toBe(
      "engines",
    );
    expect((await read({ "package.json": "{}" }))?.tools.node).toEqual({
      text: "24 (default)",
      source: "default",
      major: 24,
    });
  });

  test("Bun: packageManager, engines, a lock file, or no Bun", async () => {
    const bun = async (a: Record<string, Answer>) => (await read(a))?.tools.bun;
    expect(await bun({ "package.json": pkg({ packageManager: "bun@1.3.0" }) })).toEqual({
      text: "1.3.0",
      source: "packageManager",
      major: 1,
    });
    expect((await bun({ "package.json": pkg({ engines: { bun: ">=1.2" } }) }))?.source).toBe(
      "engines",
    );
    expect(await bun({ "package.json": "{}", "bun.lock": "{}" })).toEqual({
      text: "newest (CI)",
      source: "bun.lock",
      major: null,
    });
    expect((await bun({ "package.json": "{}", "bun.lockb": "x" }))?.text).toBe("newest (CI)");
    expect(await bun({ "package.json": pkg({ packageManager: "yarn@4.18.1" }) })).toBeUndefined();
  });

  test("not available: a failed request or invalid JSON", async () => {
    const cases: Record<string, Answer>[] = [
      { "package.json": 500 },
      { "package.json": "throw" as const },
      { "package.json": "{x" },
      { "package.json": "{}", ".nvmrc": 403 },
    ];
    for (const a of cases) {
      expect(await read(a)).toEqual({
        projectId: "one",
        repo: "ImreBoersma/one",
        state: "not-available",
        tools: {},
      });
    }
  });

  test("the safe text rule: a git URL shows as Other and is not compared", async () => {
    const row = await read({
      "package.json": pkg({ dependencies: { react: "github:org/react#main", next: "latest" } }),
    });
    expect(row?.tools.react).toEqual({ text: "Other", source: "dependencies", major: null });
    expect(row?.tools.next).toEqual({ text: "latest", source: "dependencies", major: null });
  });

  test("only GET, and the token only in the Authorization header", async () => {
    const { fetch, calls } = fake({ "package.json": "{}" });
    await readVersions("one", "ImreBoersma/one", "secret-token", [], "24", fetch);
    for (const c of calls) {
      expect(c.init?.method ?? "GET").toBe("GET");
      expect(c.url).not.toContain("secret-token");
      expect((c.init?.headers as Record<string, string> | undefined)?.Authorization).toBe(
        "Bearer secret-token",
      );
    }
  });
});
