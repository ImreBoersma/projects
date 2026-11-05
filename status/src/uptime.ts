// Uptime check of the catalog domains (spec 005, research.md §3–§5).
import type { Project, Uptime } from "./types";

export interface CheckOptions {
  fetch: typeof globalThis.fetch;
  delay: (ms: number) => Promise<void>;
  timeoutMs: number;
}

const DEFAULTS: CheckOptions = {
  fetch: globalThis.fetch,
  delay: (ms) => Bun.sleep(ms),
  timeoutMs: 10_000,
};

// One attempt. Only the status counts; the body is not read and no error text is kept (FR-011).
async function attempt(domain: string, options: CheckOptions): Promise<boolean> {
  try {
    const response = await options.fetch(`https://${domain}/`, {
      redirect: "follow",
      headers: { "User-Agent": "ImreBoersma-projects-status-check" },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// FR-004: a site is down only when two attempts fail, 5 seconds apart.
export async function checkSite(domain: string, options: CheckOptions): Promise<boolean> {
  if (await attempt(domain, options)) return true;
  await options.delay(5000);
  return attempt(domain, options);
}

// Results keyed by project id. Archived projects are not checked (FR-002).
export async function checkAll(
  projects: Project[],
  now: Date,
  options: CheckOptions = DEFAULTS,
): Promise<Map<string, Uptime>> {
  const active = projects.filter((p) => p.status !== "archived");
  const checked = await Promise.all(
    active
      .filter((p) => p.domain)
      .map(async (p) => [p.id, await checkSite(p.domain as string, options)] as const),
  );
  // FR-008: when 2 or more sites are all down, the network of the runner is the probable cause.
  const notAvailable = checked.length >= 2 && checked.every(([, up]) => !up);
  const up = new Map(checked);
  const result = new Map<string, Uptime>();
  for (const p of active) {
    if (!up.has(p.id)) result.set(p.id, { state: "no-domain", at: null });
    else if (notAvailable) result.set(p.id, { state: "not-available", at: now });
    else result.set(p.id, { state: up.get(p.id) ? "up" : "down", at: now });
  }
  return result;
}
