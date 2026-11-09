// Spec 011 contracts/command.md and research §3 to §6: the steps of `bun run new-project`. All
// GitHub and shell calls go through `Deps`, so the tests use fakes and a dry run makes no write.
import { parseCatalog, parseSecrets } from "../catalog";
import type { SecretEntry } from "../types";
import { addToCatalog } from "./catalog-edit";
import { HOSTS, host, secretsFor } from "./hosts";
import type { NewProject } from "./template";

export const OWNER = "ImreBoersma";
export const TEMPLATE_COMMIT = "chore: start from the project template (spec 011)";
export const STEPS = ["repo", "settings", "catalog-pr"] as const;
export type Step = (typeof STEPS)[number];

export interface Settings {
  hasIssues: boolean;
  vulnerabilityAlerts: boolean;
  securityFixes: boolean;
  pages: boolean;
}

// The calls of the command. Reads first, then writes; a dry run calls only the reads.
export interface Deps {
  login(): Promise<{ user: string; projectsAdmin: boolean }>;
  catalog(): Promise<{ text: string; sha: string }>; // projects.yaml on main of projects
  repoCommits(repo: string): Promise<string[] | null>; // commit messages; null: no repo
  settings(repo: string): Promise<Settings>;
  openCatalogPr(branch: string): Promise<number | null>;
  makeRepo(input: NewProject): Promise<void>;
  setSettings(repo: string, input: NewProject, now: Settings): Promise<void>;
  openPr(
    branch: string,
    baseSha: string,
    text: string,
    title: string,
    body: string,
  ): Promise<number>;
}

const ID = /^[a-z0-9-]+$/;
const REPO = /^[A-Za-z0-9._-]+$/;

export function validate(o: Record<string, string | boolean | undefined>): NewProject {
  const need = (k: string) => {
    const v = o[k];
    if (typeof v !== "string" || v.trim() === "") throw new Error(`--${k} is required.`);
    return v.trim();
  };
  const id = need("id");
  const name = need("name");
  const repo = need("repo");
  const visibility = need("visibility");
  const stack = need("stack");
  const key = need("host");
  if (!ID.test(id)) throw new Error("--id: use a-z, 0-9 and -.");
  if (name.length > 60) throw new Error("--name: use 1 to 60 characters.");
  if (repo.includes("/"))
    throw new Error(`--repo: give the name only; the owner is always ${OWNER}.`);
  if (!REPO.test(repo)) throw new Error("--repo: use A-Z, a-z, 0-9, ., _ and -.");
  if (visibility !== "public" && visibility !== "private")
    throw new Error("--visibility must be public or private.");
  return { id, name, repo, visibility, stack, host: host(key).key };
}

export const branchOf = (input: NewProject) => `new-project/${input.id}`;
export const prTitle = (input: NewProject) => `feat: add ${input.name} to the catalog (spec 011)`;
const full = (input: NewProject) => `${OWNER}/${input.repo}`;

export function secretsTable(input: NewProject, entries: SecretEntry[]): string[] {
  const repo = full(input);
  const { secrets, vars } = secretsFor(input.host, input.visibility);
  const rows = [
    ...secrets.map((n) => `| ${n} | secret | ${repo} | gh secret set ${n} -R ${repo} |`),
    ...vars.map((n) => `| ${n} | variable | ${repo} | gh variable set ${n} -R ${repo} |`),
  ];
  const out = rows.length
    ? [
        "Set these secrets and variables:",
        "| Name | Kind | Repo | Command |",
        "|---|---|---|---|",
        ...rows,
      ]
    : ["No secrets or variables to set."];
  out.push(`Then: gh workflow run ci.yml -R ${repo}`);
  const shared = secrets.filter((n) => entries.some((e) => e.name === n && e.where !== repo));
  if (shared.length) {
    out.push(
      `${shared.join(" and ")} ${shared.length > 1 ? "are the same tokens" : "is the same token"} as in the other repos. Without the value: make a`,
      "new token, merge the catalog PR, then run `bun run secret-set <NAME>` (sets all repos).",
    );
  }
  const side = host(input.host).hostSide;
  if (side) out.push(`Make the host side by hand (${side}).`);
  if (input.host === "none") out.push("No deploy caller: add the deploy by hand.");
  const fresh = secrets.filter((n) => !entries.some((e) => e.name === n));
  if (fresh.length)
    out.push(`Write the expiry date of ${fresh.join(", ")} in the catalog PR (now: never).`);
  return out;
}

export const prBody = (input: NewProject, table: string[]) =>
  `Adds ${input.name} (${full(input)}) to the catalog. Made with \`bun run new-project\` (spec 011).

${table.join("\n")}
`;

export interface State {
  stop: string | null;
  warnings: string[];
  done: Record<Step, boolean>;
  settings: Settings | null;
  catalog: { text: string; sha: string };
  entries: SecretEntry[];
}

const SETTINGS_OK = (s: Settings, input: NewProject) =>
  s.hasIssues && s.vulnerabilityAlerts && !s.securityFixes && (input.host !== "pages" || s.pages);

// Research §4: read only. A stop reason means: no change at all.
export async function checkState(input: NewProject, deps: Deps): Promise<State> {
  const catalog = await deps.catalog();
  const projects = parseCatalog(catalog.text);
  const entries = parseSecrets(catalog.text, projects);
  const done: Record<Step, boolean> = { repo: false, settings: false, "catalog-pr": false };
  const state: State = { stop: null, warnings: [], done, settings: null, catalog, entries };
  const stop = (reason: string) => {
    state.stop = reason;
    return state;
  };

  const login = await deps.login();
  if (login.user !== OWNER)
    return stop(
      `The gh login cannot make repos or change settings: the login is ${login.user}, not ${OWNER}.`,
    );
  if (!login.projectsAdmin)
    return stop(
      "The gh login cannot make repos or change settings: no admin right on ImreBoersma/projects.",
    );

  const prNumber = await deps.openCatalogPr(branchOf(input));
  done["catalog-pr"] = prNumber !== null;
  if (!done["catalog-pr"]) {
    const lower = (s: string) => s.toLowerCase();
    if (projects.some((p) => p.id === input.id)) return stop(`id "${input.id}" is in the catalog.`);
    if (projects.some((p) => lower(p.name) === lower(input.name)))
      return stop(`name "${input.name}" is in the catalog.`);
    if (projects.some((p) => p.repo && lower(p.repo) === lower(full(input))))
      return stop(`repo "${full(input)}" is in the catalog.`);
  }

  const commits = await deps.repoCommits(full(input));
  if (commits) {
    if (!commits.includes(TEMPLATE_COMMIT))
      return stop(
        `${full(input)} exists. To bring an existing repo in line, use the conformance check (spec 008) and a campaign (spec 015).`,
      );
    done.repo = true;
    state.settings = await deps.settings(full(input));
    done.settings = SETTINGS_OK(state.settings, input);
  }
  if (input.visibility === "private" && input.host === "pages")
    state.warnings.push("Pages for a private repo needs a paid GitHub plan.");
  return state;
}

const DESCRIBE: Record<Step, (input: NewProject) => string[]> = {
  repo: (i) => [
    `Make ${full(i)} from the template (ci: ${i.host}).`,
    `Files: ${FILES(i).join(", ")}`,
  ],
  settings: (i) => [
    "Issues on, vulnerability alerts on, Dependabot security updates off.",
    ...(i.host === "pages" ? ["(host pages: also Pages on, source GitHub Actions)"] : []),
  ],
  "catalog-pr": (i) => [`Open the PR "${prTitle(i)}" in ${OWNER}/projects.`],
};

export const FILES = (i: NewProject) => [
  ".github/workflows/ci.yml",
  ...(i.visibility === "public" ? [".github/workflows/board.yml"] : []),
  "renovate.json",
  "biome.json",
  "package.json",
  "bun.lock",
  "index.html",
  ".gitignore",
  "README.md",
];

const LABEL: Record<Step, string> = {
  repo: "repo     ",
  settings: "settings ",
  "catalog-pr": "catalog  ",
};
const line = (mark: string, step: string, text: string[]) => [
  `${`[${mark}]`.padEnd(8)}${step} ${text[0]}`,
  ...text.slice(1).map((t) => `${" ".repeat(18)}${t}`),
];

export async function runNewProject(
  input: NewProject,
  deps: Deps,
  opts: { dryRun: boolean },
  log: (line: string) => void,
): Promise<number> {
  const visibility = input.visibility;
  const catalogHost = HOSTS.find((h) => h.key === input.host)?.label ?? input.host;
  if (opts.dryRun) log("Dry run: no change.");
  log(`New project: ${input.name} (${full(input)}, ${visibility}, ${catalogHost})`);
  const state = await checkState(input, deps);
  if (state.stop) {
    log(`[failed] check     ${state.stop}`);
    return 1;
  }
  log("[done]  check     The id, the name and the repo are free.");
  for (const w of state.warnings) log(`Warning: ${w}`);

  const table = secretsTable(input, state.entries);
  for (const step of STEPS) {
    if (state.done[step] || opts.dryRun) {
      for (const l of line(state.done[step] ? "done" : "to do", LABEL[step], DESCRIBE[step](input)))
        log(l);
      continue;
    }
    try {
      if (step === "repo") await deps.makeRepo(input);
      if (step === "settings") {
        const now = state.settings ?? (await deps.settings(full(input)));
        await deps.setSettings(full(input), input, now);
      }
      if (step === "catalog-pr") {
        const text = addToCatalog(
          state.catalog.text,
          input,
          secretsFor(input.host, visibility).secrets,
        );
        const n = await deps.openPr(
          branchOf(input),
          state.catalog.sha,
          text,
          prTitle(input),
          prBody(input, table),
        );
        log(`[done]  ${LABEL[step]}Opened the PR #${n} "${prTitle(input)}" in ${OWNER}/projects.`);
        continue;
      }
      for (const l of line("done", LABEL[step], DESCRIBE[step](input))) log(l);
    } catch (e) {
      log(`[failed] ${LABEL[step]}${(e as Error).message}`);
      log("Run the same command again to continue.");
      return 1;
    }
  }
  log("");
  for (const l of table) log(l);
  if (opts.dryRun) log("Dry run: no change.");
  return 0;
}
