// Spec 016, research.md §1 to §3: the versions of one repo. Only GET requests; the token goes
// only in the Authorization header, and no file text goes in the log.
import type { Tool, ToolVersion, VersionRow } from "../types";
import { lowestMajor, nodeFromCi, safeText } from "./parse";

const PACKAGES: [Tool, string][] = [
  ["next", "next"],
  ["react", "react"],
  ["typescript", "typescript"],
  ["biome", "@biomejs/biome"],
  ["types-node", "@types/node"],
];

const version = (text: string, source: string, compare = true): ToolVersion => {
  const shown = safeText(text);
  return { text: shown, source, major: compare && shown !== "Other" ? lowestMajor(text) : null };
};

type Package = {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  engines?: Record<string, unknown>;
  packageManager?: unknown;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function readVersions(
  projectId: string,
  repo: string,
  token: string,
  workflowTexts: string[],
  nodeDefault: string | null,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<VersionRow | null> {
  const na: VersionRow = { projectId, repo, state: "not-available", tools: {} };
  // A 404 means "no file"; another answer or a network error means "not available".
  const file = async (path: string): Promise<string | null | undefined> => {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }).catch(() => null);
    if (res?.status === 404) return null;
    return res?.ok ? res.text() : undefined;
  };
  const [pkgText, nvmrc, nodeVersion, bunLock] = await Promise.all(
    ["package.json", ".nvmrc", ".node-version", "bun.lock"].map(file),
  );
  if (pkgText === null) return null;
  if ([pkgText, nvmrc, nodeVersion, bunLock].includes(undefined)) return na;
  let pkg: Package;
  try {
    pkg = JSON.parse(pkgText as string);
    if (!pkg || typeof pkg !== "object") return na;
  } catch {
    return na;
  }

  const tools: VersionRow["tools"] = {};
  for (const [tool, name] of PACKAGES) {
    const dep = str(pkg.dependencies?.[name]);
    const dev = str(pkg.devDependencies?.[name]);
    if (dep) tools[tool] = version(dep, "dependencies");
    else if (dev) tools[tool] = version(dev, "devDependencies");
  }

  const nodeSources: [string | null, string][] = [
    [workflowTexts.map(nodeFromCi).find((v) => v) ?? null, "ci.yml"],
    [str(nvmrc), ".nvmrc"],
    [str(nodeVersion), ".node-version"],
    [str(pkg.engines?.node), "engines"],
  ];
  const node = nodeSources.find(([v]) => v);
  if (node) tools.node = version(node[0] as string, node[1]);
  else if (nodeDefault)
    tools.node = { ...version(nodeDefault, "default"), text: `${nodeDefault} (default)` };

  const pm = str(pkg.packageManager)?.match(/^bun@(.+)$/)?.[1];
  const engineBun = str(pkg.engines?.bun);
  if (pm) tools.bun = version(pm, "packageManager");
  else if (engineBun) tools.bun = version(engineBun, "engines");
  else {
    // The old binary lock file only when there is no bun.lock (research.md §2).
    const lock = bunLock ?? (await file("bun.lockb"));
    if (lock === undefined) return na;
    if (lock !== null) tools.bun = { text: "newest (CI)", source: "bun.lock", major: null };
  }
  return { projectId, repo, state: "ok", tools };
}
