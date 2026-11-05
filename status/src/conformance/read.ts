// Read the facts of one repo for the conformance rules (spec 008, research.md §1 and §5).
// Only GET requests: the check never changes a repo (FR-010).
import type { NA, RepoFacts } from "../types";

const NA_: NA = "not-available";

export async function readFacts(
  repo: string,
  token: string,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<RepoFacts | NA> {
  const get = (path: string, raw = false) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }).catch(() => null);

  // A 404 means "no file" for files; other errors mean that the fact is not available.
  const file = async (path: string): Promise<string | null | NA> => {
    const res = await get(`/contents/${path}`, true);
    if (res?.status === 404) return null;
    return res?.ok ? res.text() : NA_;
  };
  const exists = async (path: string) => {
    const text = await file(path);
    return text === NA_ ? NA_ : text !== null;
  };
  const names = async (path: string, key: string): Promise<string[] | NA> => {
    const res = await get(`${path}?per_page=100`);
    if (!res?.ok) return NA_;
    return ((await res.json())[key] as { name: string }[]).map((s) => s.name);
  };

  const meta = await get("");
  if (!meta?.ok) return NA_;
  const repoData = await meta.json();

  const workflows = async () => {
    const res = await get("/contents/.github/workflows");
    if (res?.status === 404) return [];
    if (!res?.ok) return NA_;
    const list = (await res.json()) as { name: string; path: string }[];
    const files = list.filter((f) => /\.ya?ml$/.test(f.name));
    const texts = await Promise.all(files.map((f) => file(f.path)));
    if (texts.some((t) => t === NA_)) return NA_;
    return files.map((f, i) => ({ path: f.path, text: (texts[i] as string) ?? "" }));
  };
  const renovate = async () => {
    for (const path of ["renovate.json", ".github/renovate.json"]) {
      const text = await file(path);
      if (text === NA_) return NA_;
      if (text !== null) {
        try {
          return JSON.parse(text) as { extends?: unknown };
        } catch {
          return {};
        }
      }
    }
    return null;
  };
  const alerts = async () => {
    const res = await get("/vulnerability-alerts");
    if (res?.status === 204) return true;
    return res?.status === 404 ? false : NA_;
  };
  const fixes = async () => {
    const res = await get("/automated-security-fixes");
    return res?.ok ? Boolean((await res.json()).enabled) : NA_;
  };
  const dependabot = async () => {
    const [yml, yaml] = await Promise.all([
      exists(".github/dependabot.yml"),
      exists(".github/dependabot.yaml"),
    ]);
    return yml === NA_ || yaml === NA_ ? NA_ : yml || yaml;
  };

  const [hasPackageJson, wf, ren, dep, va, sf, secretNames, variableNames] = await Promise.all([
    exists("package.json"),
    workflows(),
    renovate(),
    dependabot(),
    alerts(),
    fixes(),
    names("/actions/secrets", "secrets"),
    names("/actions/variables", "variables"),
  ]);
  return {
    private: Boolean(repoData.private),
    hasIssues: Boolean(repoData.has_issues),
    defaultBranch: String(repoData.default_branch),
    hasPackageJson,
    workflows: wf,
    renovate: ren,
    dependabot: dep,
    vulnerabilityAlerts: va,
    securityFixes: sf,
    secretNames,
    variableNames,
  };
}
