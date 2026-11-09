import { describe, expect, test } from "bun:test";
import { parseCaller, sharedWorkflowVars } from "../src/conformance/workflows";
import { HOSTS, host, secretsFor } from "../src/new-project/hosts";

const TEMPLATE = new URL("../../template/", import.meta.url);
const read = (path: string) => Bun.file(new URL(path, TEMPLATE)).text();
const shared = await sharedWorkflowVars(
  new URL("../../.github/workflows", import.meta.url).pathname,
);
const sharedVars = (uses: string[]) =>
  uses.flatMap(
    (u) =>
      shared[u.replace(/^ImreBoersma\/projects\/\.github\/workflows\//, "").replace(/@.*/, "")] ??
      [],
  );

describe("host map (spec 011 data-model.md)", () => {
  test("the 5 hosts", () => {
    expect(HOSTS.map((h) => [h.key, h.catalog])).toEqual([
      ["pages", "GitHub Pages"],
      ["vercel", "Vercel"],
      ["firebase", "Firebase"],
      ["ssh", "Shared hosting"],
      ["none", ""],
    ]);
  });

  for (const h of HOSTS) {
    test(`${h.key}: the names equal the names of ${h.ci}`, async () => {
      const c = parseCaller(await read(h.ci));
      expect(c.secrets.sort()).toEqual([...h.secrets].sort());
      const vars = [...new Set([...c.vars, ...sharedVars(c.uses)])];
      expect(vars.sort()).toEqual([...h.vars].sort());
    });
  }

  test("the board caller uses BOARD_TOKEN; only public repos get it", async () => {
    expect(parseCaller(await read(".github/workflows/board.yml")).secrets).toEqual(["BOARD_TOKEN"]);
    expect(secretsFor("vercel", "public").secrets).toEqual(["BOARD_TOKEN", "VERCEL_TOKEN"]);
    expect(secretsFor("vercel", "private").secrets).toEqual(["VERCEL_TOKEN"]);
  });

  test("an unknown host stops", () => {
    expect(() => host("netlify")).toThrow("--host must be pages, vercel, firebase, ssh, none.");
  });
});
