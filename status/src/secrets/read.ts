// Spec 013, research.md §1: the expiry date that a GitHub token gives in each API response.
// The token goes only in the Authorization header; it is never logged or returned.

export async function tokenExpiry(
  token: string,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<string | null | "not-known"> {
  try {
    const res = await fetch("https://api.github.com/rate_limit", {
      headers: { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!res.ok) return "not-known";
    const header = res.headers.get("github-authentication-token-expiration");
    const date = header?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    return date ?? null;
  } catch {
    return "not-known";
  }
}

// Research.md §4: the workflow files of a repo that the conformance check does not read.
// Returns null when they cannot be read.
export async function readWorkflowTexts(
  repo: string,
  token: string,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<string[] | null> {
  const get = (path: string, raw = false) =>
    fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }).catch(() => null);
  const list = await get(".github/workflows");
  if (list?.status === 404) return [];
  if (!list?.ok) return null;
  const files = ((await list.json()) as { name: string; path: string }[]).filter((f) =>
    /\.ya?ml$/.test(f.name),
  );
  const texts = await Promise.all(
    files.map(async (f) => {
      const res = await get(f.path, true);
      return res?.ok ? res.text() : null;
    }),
  );
  return texts.some((t) => t === null) ? null : (texts as string[]);
}
