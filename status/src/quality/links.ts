// Spec 023 FR-005, research.md §4: walk up to 50 pages of the site and check each link on them.
// Only addresses and status codes are kept, never a text of a page (FR-014).
import type { BrokenLink, LinkResult } from "../types";
import { linkLevel } from "./level";

const MAX_PAGES = 50;
const SITE_GAP_MS = 1000;
const RETRY_MS = 5000;
const TIMEOUT_MS = 15_000;
const EXTERNAL_AT_ONCE = 4;
const AGENT = "ImreBoersma-projects-quality-check";

export interface LinkOptions {
  fetch: typeof globalThis.fetch;
  delay: (ms: number) => Promise<void>;
  clock: () => number;
}

// The `Disallow` prefixes of the group `User-agent: *`. An empty `Disallow:` permits all.
export function parseRobots(text: string): string[] {
  const rules: string[] = [];
  let inStar = false;
  let lastWasAgent = false;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const [field, ...rest] = line.split(":");
    const name = field?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (name === "user-agent") {
      // Consecutive agent lines form one group.
      inStar = (lastWasAgent && inStar) || value === "*";
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (inStar && name === "disallow" && value) rules.push(value);
  }
  return rules;
}

export const allowed = (path: string, rules: string[]) => !rules.some((r) => path.startsWith(r));

type Outcome = number | "error";

// A link is broken on status 400 or more, or a network error. 403, 429 and 999 of another host
// are "blocked" (many sites block automated requests; LinkedIn answers 999); on the checked site
// they are broken.
const isBad = (o: Outcome) => o === "error" || o >= 400;
const isBlocked = (o: Outcome, external: boolean) =>
  external && (o === 403 || o === 429 || o === 999);

async function hrefs(html: string): Promise<string[]> {
  const found: string[] = [];
  await new HTMLRewriter()
    .on("a[href]", {
      element(el) {
        const href = el.getAttribute("href");
        if (href) found.push(href);
      },
    })
    .transform(new Response(html))
    .text();
  return found;
}

function resolve(href: string, base: string): URL | null {
  const h = href.trim();
  if (h === "" || h.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(h)) return null;
  try {
    const url = new URL(h, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export async function checkLinks(
  domain: string,
  options: LinkOptions,
): Promise<{ links: LinkResult; homeHeaders: Headers | null }> {
  const { fetch, delay, clock } = options;
  let lastSite = Number.NEGATIVE_INFINITY;
  const init = (method: string): RequestInit => ({
    method,
    redirect: "follow",
    headers: { "User-Agent": AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Requests to the site: at least 1 second apart.
  const siteFetch = async (url: string, method = "GET") => {
    const wait = lastSite + SITE_GAP_MS - clock();
    if (wait > 0) await delay(wait);
    lastSite = clock();
    return fetch(url, init(method));
  };
  const attempt = async (get: () => Promise<Response>): Promise<Response | "error"> => {
    try {
      return await get();
    } catch {
      return "error";
    }
  };
  const outcome = (r: Response | "error"): Outcome => (r === "error" ? "error" : r.status);
  // One retry 5 s later for a bad result.
  const withRetry = async (get: () => Promise<Response>) => {
    let r = await attempt(get);
    if (isBad(outcome(r))) {
      await delay(RETRY_MS);
      r = await attempt(get);
    }
    return r;
  };

  const home = `https://${domain}/`;
  const homeResponse = await withRetry(() => siteFetch(home));
  if (homeResponse === "error" || !homeResponse.ok) {
    return {
      links: { level: "not-checked", pages: 0, broken: [], blocked: 0, note: "site down" },
      homeHeaders: null,
    };
  }
  const homeHeaders = homeResponse.headers;

  let rules: string[] = [];
  const robots = await attempt(() => siteFetch(`https://${domain}/robots.txt`));
  if (robots !== "error" && robots.ok) rules = parseRobots(await robots.text());

  // The site is the domain and the host that its home page redirects to (for example www.).
  const hosts = new Set([new URL(home).host]);
  if (homeResponse.url) hosts.add(new URL(homeResponse.url).host);
  const own = (u: string | URL) => hosts.has(new URL(u).host);
  const source = new Map<string, string>(); // link address → first page with it
  const results = new Map<string, Outcome>();
  const queue: string[] = [];
  const queued = new Set<string>([home]);
  const external: string[] = [];
  const sameNotRead: string[] = [];
  let pages = 0;

  const read = async (pageUrl: string, response: Response) => {
    pages++;
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) return;
    // A redirect to another host is not a page of the site.
    if (response.url && !own(response.url)) return;
    for (const href of await hrefs(await response.text())) {
      const url = resolve(href, response.url || pageUrl);
      if (!url) continue;
      const key = url.href;
      if (!source.has(key)) source.set(key, pageUrl);
      if (!own(url)) {
        if (!external.includes(key)) external.push(key);
      } else if (!queued.has(key)) {
        queued.add(key);
        if (allowed(url.pathname, rules)) queue.push(key);
        else sameNotRead.push(key);
      }
    }
  };

  await read(home, homeResponse);
  results.set(home, homeResponse.status);
  while (queue.length && pages < MAX_PAGES) {
    const url = queue.shift() as string;
    const r = await withRetry(() => siteFetch(url));
    results.set(url, outcome(r));
    if (r !== "error" && r.ok) await read(url, r);
  }

  // A page that robots.txt disallows is not read; its link is still checked with HEAD.
  const head = async (url: string, get: (url: string, method: string) => Promise<Response>) => {
    const r = await withRetry(async () => {
      const first = await get(url, "HEAD");
      return first.status === 405 || first.status === 501 ? get(url, "GET") : first;
    });
    results.set(url, outcome(r));
  };
  for (const url of sameNotRead) await head(url, siteFetch);

  // Other hosts: at most 4 at the same time, each address once.
  let next = 0;
  const worker = async () => {
    while (next < external.length) {
      const url = external[next++];
      await head(url, (u, method) => fetch(u, init(method)));
    }
  };
  await Promise.all(Array.from({ length: EXTERNAL_AT_ONCE }, worker));

  const broken: BrokenLink[] = [];
  let blocked = 0;
  for (const [url, page] of source) {
    const o = results.get(url);
    if (o === undefined || !isBad(o)) continue;
    if (isBlocked(o, !own(url))) blocked++;
    else broken.push({ url, page, status: o });
  }
  return { links: { level: linkLevel({ broken, blocked }), pages, broken, blocked }, homeHeaders };
}
