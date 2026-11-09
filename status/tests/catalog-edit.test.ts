import { describe, expect, test } from "bun:test";
import { parseCatalog, parseSecrets } from "../src/catalog";
import { addToCatalog } from "../src/new-project/catalog-edit";
import type { NewProject } from "../src/new-project/template";

const catalog = await Bun.file(new URL("../../projects.yaml", import.meta.url)).text();
const input: NewProject = {
  id: "orkest-site",
  name: "Orkest site",
  repo: "orkest-site",
  visibility: "public",
  stack: "Vite, React",
  host: "vercel",
};

describe("addToCatalog (spec 011 research §5)", () => {
  const out = addToCatalog(catalog, input, ["BOARD_TOKEN", "VERCEL_TOKEN", "NEW_KEY"]);
  const projects = parseCatalog(out);
  const secrets = parseSecrets(out, projects);

  test("the project block after the last project", () => {
    const p = projects.at(-1);
    expect(p).toMatchObject({
      id: "orkest-site",
      name: "Orkest site",
      repo: "ImreBoersma/orkest-site",
      status: "active",
    });
    expect(out).toContain(
      "    stack: Vite, React\n    host: Vercel\n    domain:\n    stakeholder:\n    renewal:\n",
    );
    expect(out.indexOf("  - id: orkest-site")).toBeLessThan(out.indexOf("secrets:"));
  });

  test("no other line changes", () => {
    const added = out.split("\n").length - catalog.split("\n").length;
    expect(added).toBe(9 + 3 * 5);
    const without = out
      .replace(/ {2}- id: orkest-site\n(?: {4}.*\n){8}/, "")
      .replace(
        /(?: {2}- name: [A-Z_]+\n {4}kind: actions-secret\n {4}where: ImreBoersma\/orkest-site\n(?: {4}.*\n){2})+$/,
        "",
      );
    expect(without).toBe(catalog.endsWith("\n") ? catalog : `${catalog}\n`);
  });

  test("expires: the date of the same name, else never", () => {
    const of = (n: string) =>
      secrets.find((s) => s.name === n && s.where === "ImreBoersma/orkest-site");
    const other = (n: string) =>
      secrets.find((s) => s.name === n && s.where !== "ImreBoersma/orkest-site");
    expect(of("BOARD_TOKEN")?.expires).toBe(other("BOARD_TOKEN")?.expires as string);
    expect(of("VERCEL_TOKEN")?.expires).toBe(other("VERCEL_TOKEN")?.expires as string);
    expect(of("NEW_KEY")?.expires).toBe("never");
    expect(of("NEW_KEY")?.project).toBe("orkest-site");
  });

  test("a name with : or # is quoted", () => {
    const text = addToCatalog(catalog, { ...input, name: "HOB: #1 site" }, []);
    expect(text).toContain('    name: "HOB: #1 site"');
    expect(parseCatalog(text).at(-1)?.name).toBe("HOB: #1 site");
  });

  test("the host none gives an empty host", () => {
    expect(addToCatalog(catalog, { ...input, host: "none" }, [])).toContain(
      "    host:\n    domain:",
    );
  });
});
