import { describe, expect, test } from "bun:test";
import { parseCatalog, parseSecrets } from "../src/catalog";
import {
  checkState,
  type Deps,
  FILES,
  ghToken,
  runNewProject,
  type Settings,
  secretsTable,
  TEMPLATE_COMMIT,
  validate,
} from "../src/new-project/steps";
import { type NewProject, PLACEHOLDER, templateFiles } from "../src/new-project/template";

const catalog = await Bun.file(new URL("../../projects.yaml", import.meta.url)).text();
const entries = parseSecrets(catalog, parseCatalog(catalog));
const input: NewProject = {
  id: "orkest-site",
  name: "Orkest site",
  repo: "orkest-site",
  visibility: "public",
  stack: "Vite",
  host: "vercel",
};
const OK: Settings = {
  hasIssues: true,
  vulnerabilityAlerts: true,
  securityFixes: false,
  pages: true,
};
const FRESH: Settings = {
  hasIssues: true,
  vulnerabilityAlerts: false,
  securityFixes: true,
  pages: false,
};

// A fake GitHub: records each write; `repo` holds the state of the new repo.
function fake(
  over: Partial<{
    commits: string[] | null;
    settings: Settings;
    pr: number | null;
    user: string;
    admin: boolean;
    scopes: string[] | null;
    fail: string;
  }> = {},
) {
  const writes: string[] = [];
  let commits = over.commits ?? null;
  let settings = over.settings ?? FRESH;
  let pr = over.pr ?? null;
  const step = async (name: string) => {
    writes.push(name);
    if (over.fail === name) throw new Error(`${name}: HTTP 502`);
  };
  const deps: Deps = {
    login: async () => ({
      user: over.user ?? "ImreBoersma",
      projectsAdmin: over.admin ?? true,
      scopes: over.scopes === undefined ? null : over.scopes,
    }),
    catalog: async () => ({ text: catalog, sha: "abc" }),
    repoCommits: async () => commits,
    settings: async () => settings,
    openCatalogPr: async () => pr,
    makeRepo: async () => {
      await step("makeRepo");
      commits = [TEMPLATE_COMMIT];
    },
    setSettings: async () => {
      await step("setSettings");
      settings = OK;
    },
    openPr: async (_b, _s, text, title, body) => {
      await step("openPr");
      expect(text).toContain("  - id: orkest-site");
      expect(title).toBe("feat: add Orkest site to the catalog (spec 011)");
      expect(body).not.toContain("Claude");
      pr = 42;
      return 42;
    },
  };
  return { deps, writes };
}
const run = async (d: Deps, dryRun = false, i = input) => {
  const out: string[] = [];
  const code = await runNewProject(i, d, { dryRun }, (l) => out.push(l));
  return { code, out: out.join("\n") };
};

describe("templateFiles (spec 011 contracts/template.md)", () => {
  test("the files of a public Vercel repo", async () => {
    const files = await templateFiles(input);
    expect([...files.keys()].sort()).toEqual(
      FILES(input)
        .filter((f) => f !== "bun.lock")
        .sort(),
    );
    expect(files.get(".github/workflows/ci.yml")).toContain("deploy-vercel.yml@main");
    expect(files.get("package.json")).toContain('"name": "orkest-site"');
    expect(files.get("index.html")).toContain("Orkest site: work in progress.");
    for (const text of files.values()) expect(PLACEHOLDER.test(text)).toBe(false);
  });

  test("a private repo has no board caller", async () => {
    const files = await templateFiles({ ...input, visibility: "private" });
    expect(files.has(".github/workflows/board.yml")).toBe(false);
  });
});

describe("validate (spec 011 data-model.md)", () => {
  const ok = {
    id: "a-1",
    name: "A",
    repo: "A.b_c-1",
    visibility: "public",
    stack: "Vite",
    host: "pages",
  };
  test("the rules of each field", () => {
    expect(validate(ok).repo).toBe("A.b_c-1");
    expect(() => validate({ ...ok, id: "A" })).toThrow("--id");
    expect(() => validate({ ...ok, name: "x".repeat(61) })).toThrow("1 to 60");
    expect(() => validate({ ...ok, repo: "ImreBoersma/a" })).toThrow(
      "the owner is always ImreBoersma",
    );
    expect(() => validate({ ...ok, visibility: "internal" })).toThrow("public or private");
    expect(() => validate({ ...ok, host: "netlify" })).toThrow("--host");
    expect(() => validate({ ...ok, stack: undefined })).toThrow("--stack is required.");
  });
});

describe("secretsTable (spec 011 research §6)", () => {
  test("Vercel: rows, the run line, the shared-token path and the host side", () => {
    const t = secretsTable(input, entries).join("\n");
    expect(t).toContain(
      "| BOARD_TOKEN | secret | ImreBoersma/orkest-site | gh secret set BOARD_TOKEN -R ImreBoersma/orkest-site |",
    );
    expect(t).toContain(
      "| VERCEL_ORG_ID | variable | ImreBoersma/orkest-site | gh variable set VERCEL_ORG_ID -R ImreBoersma/orkest-site |",
    );
    expect(t).toContain("Then: gh workflow run ci.yml -R ImreBoersma/orkest-site");
    expect(t).toContain("BOARD_TOKEN and VERCEL_TOKEN are the same tokens");
    expect(t).toContain("bun run secret-set <NAME>");
    expect(t).toContain("Make the host side by hand (the Vercel project).");
  });

  test("a private Pages repo: nothing to set; no shared-token line", () => {
    const t = secretsTable({ ...input, visibility: "private", host: "pages" }, entries).join("\n");
    expect(t).toContain("No secrets or variables to set.");
    expect(t).not.toContain("secret-set");
  });

  test("a new name has no shared-token line", () => {
    const t = secretsTable({ ...input, visibility: "private", host: "firebase" }, entries).join(
      "\n",
    );
    expect(t).toContain("FIREBASE_SERVICE_ACCOUNT");
    expect(t).not.toContain("same token");
    expect(t).toContain(
      "Write the expiry date of FIREBASE_SERVICE_ACCOUNT in the catalog PR (now: never).",
    );
    expect(secretsTable(input, entries).join("\n")).not.toContain("expiry date");
  });
});

describe("runNewProject (spec 011 US1, US2)", () => {
  test("a full run: the steps in order, then the table", async () => {
    const f = fake();
    const r = await run(f.deps);
    expect(r.code).toBe(0);
    expect(f.writes).toEqual(["makeRepo", "setSettings", "openPr"]);
    expect(r.out).toContain('Opened the PR #42 "feat: add Orkest site to the catalog (spec 011)"');
    expect(r.out).toContain("| VERCEL_TOKEN | secret |");
  });

  test("a second run: all steps done, no write", async () => {
    const f = fake({ commits: [TEMPLATE_COMMIT], settings: OK, pr: 42 });
    const r = await run(f.deps);
    expect(r.code).toBe(0);
    expect(f.writes).toEqual([]);
    expect(r.out.match(/\[done\]/g)?.length).toBe(4);
  });

  test("a failed step: the message, the hint, exit code 1; the next run continues", async () => {
    const f = fake({ fail: "setSettings" });
    const r = await run(f.deps);
    expect(r.code).toBe(1);
    expect(r.out).toContain("[failed] settings setSettings: HTTP 502");
    expect(r.out).toContain("Run the same command again to continue.");
    const again = fake({ commits: [TEMPLATE_COMMIT] });
    expect((await run(again.deps)).code).toBe(0);
    expect(again.writes).toEqual(["setSettings", "openPr"]);
  });

  test("dry run: the same steps, files and table; no write (SC-004)", async () => {
    const dry = fake();
    const d = await run(dry.deps, true);
    expect(dry.writes).toEqual([]);
    expect(d.out.startsWith("Dry run: no change.")).toBe(true);
    expect(d.out.endsWith("Dry run: no change.")).toBe(true);
    expect(d.out).toContain(`Files: ${FILES(input).join(", ")}`);
    const real = await run(fake().deps);
    const rows = (s: string) => s.split("\n").filter((l) => l.startsWith("|"));
    expect(rows(d.out)).toEqual(rows(real.out));
    const steps = (s: string) =>
      s
        .split("\n")
        .filter((l) => /^\[/.test(l))
        .map((l) => l.slice(8, 17));
    expect(steps(d.out)).toEqual(steps(real.out));
  });

  test("the command never reads stdin (FR-006)", async () => {
    for (const f of ["run.ts", "steps.ts", "template.ts", "catalog-edit.ts", "hosts.ts"]) {
      const text = await Bun.file(new URL(`../src/new-project/${f}`, import.meta.url)).text();
      expect(text).not.toContain("process.stdin");
      expect(text).not.toContain("console.read");
    }
  });
});

describe("checkState (spec 011 research §4)", () => {
  const stop = async (over: Parameters<typeof fake>[0], i = input) =>
    (await checkState(i, fake(over).deps)).stop;

  test("in the catalog: id, name, repo", async () => {
    expect(await stop({}, { ...input, id: "beter-dan-de-midi" })).toBe(
      'id "beter-dan-de-midi" is in the catalog.',
    );
    expect(await stop({}, { ...input, name: "boek de BUS" })).toBe(
      'name "boek de BUS" is in the catalog.',
    );
    expect(await stop({}, { ...input, repo: "boek-de-bus" })).toBe(
      'repo "ImreBoersma/boek-de-bus" is in the catalog.',
    );
  });

  test("a repo that this command did not make", async () => {
    expect(await stop({ commits: ["first commit"] })).toContain(
      "use the conformance check (spec 008) and a campaign (spec 015)",
    );
  });

  test("an empty repo (a run stopped between create and push): push into it", async () => {
    const f = fake({ commits: [] });
    const pushed: boolean[] = [];
    const make = f.deps.makeRepo;
    f.deps.makeRepo = async (i, empty) => {
      pushed.push(empty);
      await make(i, empty);
    };
    const s = await checkState(input, f.deps);
    expect(s.stop).toBeNull();
    expect(s.emptyRepo).toBe(true);
    expect((await run(f.deps)).code).toBe(0);
    expect(pushed).toEqual([true]);
    expect(f.writes).toEqual(["makeRepo", "setSettings", "openPr"]);
  });

  test("a repo from an earlier run; settings and the PR", async () => {
    const s = await checkState(input, fake({ commits: [TEMPLATE_COMMIT], settings: OK }).deps);
    expect(s.done).toEqual({ repo: true, settings: true, "catalog-pr": false });
    const pagesOff = await checkState(
      { ...input, host: "pages" },
      fake({ commits: [TEMPLATE_COMMIT], settings: { ...OK, pages: false } }).deps,
    );
    expect(pagesOff.done.settings).toBe(false);
    expect((await checkState(input, fake({ pr: 7 }).deps)).done["catalog-pr"]).toBe(true);
  });

  test("the login: owner and admin right", async () => {
    expect(await stop({ user: "someone" })).toContain("not ImreBoersma");
    expect(await stop({ admin: false })).toContain("no admin right");
  });

  // Spec 011 T034: a classic token gives its scopes; it must have `repo`. A fine-grained token
  // gives no scopes header (null): the check is skipped (research §4).
  test("the login: the scopes of a classic token", async () => {
    expect(await stop({ scopes: ["gist", "read:org"] })).toBe(
      "The gh login cannot make repos or change settings: the token has no scope repo.",
    );
    expect(await stop({ scopes: ["repo", "read:org"] })).toBeNull();
    expect(await stop({ scopes: null })).toBeNull();
  });

  // Spec 011 T033: a dry run that stops at the check still ends with the dry-run line.
  test("a dry run that stops at the check ends with the dry-run line", async () => {
    const d = await run(fake({ user: "someone" }).deps, true);
    expect(d.code).toBe(1);
    expect(d.out.startsWith("Dry run: no change.")).toBe(true);
    expect(d.out.endsWith("Dry run: no change.")).toBe(true);
  });

  // Spec 011 T032: a failed `gh auth token` gives the message of contracts/command.md.
  test("ghToken: a failed gh auth token", async () => {
    expect(await ghToken(async () => "  tok\n")).toBe("tok");
    await expect(
      ghToken(async () => {
        throw new Error("You are not logged into any GitHub hosts.");
      }),
    ).rejects.toThrow(
      "The gh login cannot make repos or change settings: You are not logged into any GitHub hosts.",
    );
    await expect(ghToken(async () => "")).rejects.toThrow(
      "The gh login cannot make repos or change settings: no token.",
    );
  });

  test("private and pages: a warning, no stop", async () => {
    const s = await checkState({ ...input, visibility: "private", host: "pages" }, fake().deps);
    expect(s.stop).toBeNull();
    expect(s.warnings).toEqual(["Pages for a private repo needs a paid GitHub plan."]);
  });
});
