import { describe, expect, test } from "bun:test";
import { parseCaller } from "../src/conformance/workflows";
import { HOSTS, host, secretsFor } from "../src/new-project/hosts";

const TEMPLATE = new URL("../../template/", import.meta.url);
const read = (path: string) => Bun.file(new URL(path, TEMPLATE)).text();
const SHARED = "ImreBoersma/projects/.github/workflows/";
// A shared workflow reads the vars of the caller repo too (deploy-vercel.yml: VERCEL_ORG_ID).
const sharedVars = async (uses: string[]) => {
  const out: string[] = [];
  for (const u of uses.filter((x) => x.startsWith(SHARED))) {
    const file = new URL(
      `../../.github/workflows/${u.slice(SHARED.length).replace(/@.*/, "")}`,
      import.meta.url,
    );
    out.push(...parseCaller(await Bun.file(file).text()).vars);
  }
  return out;
};

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
      const vars = [...new Set([...c.vars, ...(await sharedVars(c.uses))])];
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
