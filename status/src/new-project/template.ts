// Spec 011 contracts/template.md: the files of a new repo, from template/ in this repo.
import { readdir } from "node:fs/promises";
import { type HostKey, host, type Visibility } from "./hosts";

export const TEMPLATE_DIR = new URL("../../../template/", import.meta.url).pathname;

export interface NewProject {
  id: string;
  name: string;
  repo: string; // the name only; the owner is always ImreBoersma
  visibility: Visibility;
  stack: string;
  host: HostKey;
}

async function list(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir + prefix, { withFileTypes: true })) {
    const path = prefix + e.name;
    if (e.isDirectory()) out.push(...(await list(dir, `${path}/`)));
    else out.push(path);
  }
  return out;
}

// `${{ … }}` of GitHub Actions is not a placeholder.
export const PLACEHOLDER = /(?<!\$)\{\{/;

// Path in the new repo → content.
export async function templateFiles(input: NewProject, dir = TEMPLATE_DIR) {
  const ci = host(input.host).ci;
  const files = new Map<string, string>();
  for (const path of (await list(dir)).sort()) {
    if (path.startsWith("ci/") && path !== ci) continue;
    if (path === ".github/workflows/board.yml" && input.visibility === "private") continue;
    const target = path === ci ? ".github/workflows/ci.yml" : path;
    const text = (await Bun.file(dir + path).text())
      .replaceAll("{{id}}", input.id)
      .replaceAll("{{name}}", input.name);
    if (PLACEHOLDER.test(text))
      throw new Error(`template/${path} has a placeholder that is not known.`);
    files.set(target, text);
  }
  return files;
}
