import { describe, expect, test } from "bun:test";
import { allowed, checkLinks, parseRobots } from "../src/quality/links";

type Fake = number | Error | { status?: number; html?: string; headers?: Record<string, string> };

// A fake site: each URL (and "HEAD <url>") gives a list of results, one for each attempt; the
// last one repeats. A fake clock: `delay` moves it forward.
function site(map: Record<string, Fake | Fake[]>) {
  let now = 0;
  let inFlight = 0;
  const log: { method: string; url: string; at: number }[] = [];
  const stats = { maxExternalAtOnce: 0 };
  const fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    log.push({ method, url, at: now });
    const external = !url.startsWith("https://a.example/");
    if (external) {
      inFlight++;
      stats.maxExternalAtOnce = Math.max(stats.maxExternalAtOnce, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
    }
    const entry = map[`${method} ${url}`] ?? map[url];
    const list = Array.isArray(entry) ? entry : [entry ?? 404];
    const used = log.filter((l) => l.url === url && l.method === method).length - 1;
    const next = list[Math.min(used, list.length - 1)];
    if (next instanceof Error) throw next;
    if (typeof next === "number") {
      // `Response` permits only 200 to 599; a real fetch can give other codes (LinkedIn: 999).
      if (next >= 200 && next <= 599) return new Response("MARKER-BODY", { status: next });
      const r = new Response("MARKER-BODY");
      Object.defineProperty(r, "status", { value: next });
      Object.defineProperty(r, "ok", { value: false });
      return r;
    }
    const status = next.status ?? 200;
    const headers = { "content-type": "text/html; charset=utf-8", ...next.headers };
    return new Response(next.html ?? "", { status, headers });
  }) as unknown as typeof globalThis.fetch;
  const delays: number[] = [];
  const options = {
    fetch,
    delay: async (ms: number) => {
      delays.push(ms);
      now += ms;
    },
    clock: () => now,
  };
  return { options, log, delays, stats };
}

const page = (...links: string[]) => ({
  html: `<html><body>${links.map((l) => `<a href="${l}">x</a>`).join("")}</body></html>`,
});
const HOME = "https://a.example/";

describe("parseRobots", () => {
  test("only the group User-agent: *", () => {
    const rules = parseRobots(
      "User-agent: Googlebot\nDisallow: /g\n\nUser-agent: *\nDisallow: /admin\nDisallow:\n# x\n",
    );
    expect(rules).toEqual(["/admin"]);
    expect(allowed("/admin/x", rules)).toBe(false);
    expect(allowed("/g", rules)).toBe(true);
    expect(parseRobots("User-agent: *\nDisallow:\n")).toEqual([]);
  });
});

describe("checkLinks", () => {
  test("walks same-host pages, skips other schemes, checks each link once", async () => {
    const s = site({
      [HOME]: page(
        "/a",
        "/a#top",
        "mailto:x@y.z",
        "tel:1",
        "javascript:void(0)",
        "#top",
        "https://b.example/x",
      ),
      "https://a.example/a": page("/", "https://b.example/x", "/missing"),
      "https://a.example/missing": 404,
      "HEAD https://b.example/x": 200,
      "https://a.example/robots.txt": 404,
    });
    const r = await checkLinks("a.example", s.options);
    expect(r.links.pages).toBe(2);
    expect(r.links.broken).toEqual([
      { url: "https://a.example/missing", page: "https://a.example/a", status: 404 },
    ]);
    expect(r.links.level).toBe("poor");
    expect(s.log.filter((l) => l.url === "https://b.example/x")).toHaveLength(1);
    expect(s.log.some((l) => /mailto|tel:|javascript/.test(l.url))).toBe(false);
    // The home page is read once: its headers are returned for the header check.
    expect(s.log.filter((l) => l.url === HOME)).toHaveLength(1);
    expect(r.homeHeaders?.get("content-type")).toContain("text/html");
  });

  test("a home page that redirects to www: the www host is the same site", async () => {
    const s = site({
      "https://a.example/robots.txt": 404,
      "https://www.a.example/b": page(),
      "HEAD https://c.example/": 200,
    });
    // The fake Response has no url; this one says that the home page redirected to www.
    const fetch = s.options.fetch;
    s.options.fetch = (async (url: string, init?: RequestInit) => {
      if (url !== HOME) return fetch(url, init);
      const r = new Response(page("/b", "https://www.a.example/b", "https://c.example/").html, {
        headers: { "content-type": "text/html" },
      });
      Object.defineProperty(r, "url", { value: "https://www.a.example/" });
      return r;
    }) as unknown as typeof globalThis.fetch;
    const r = await checkLinks("a.example", s.options);
    expect(r.links.pages).toBe(2);
    expect(r.links.level).toBe("good");
    expect(s.log.some((l) => l.url === "https://c.example/")).toBe(true);
  });

  test("stops at 50 pages", async () => {
    const map: Record<string, Fake> = { [HOME]: page("/p0"), "https://a.example/robots.txt": 404 };
    for (let i = 0; i < 60; i++) map[`https://a.example/p${i}`] = page(`/p${i + 1}`);
    const r = await checkLinks("a.example", site(map).options);
    expect(r.links.pages).toBe(50);
  });

  test("requests to the site are at least 1 second apart", async () => {
    const s = site({
      [HOME]: page("/a", "/b"),
      "https://a.example/a": page(),
      "https://a.example/b": page(),
      "https://a.example/robots.txt": 404,
    });
    await checkLinks("a.example", s.options);
    const times = s.log.filter((l) => l.url.startsWith(HOME)).map((l) => l.at);
    for (let i = 1; i < times.length; i++)
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(1000);
  });

  test("HEAD, then GET on 405; blocked and broken on other hosts", async () => {
    const s = site({
      [HOME]: page(
        "https://b.example/head-not-allowed",
        "https://b.example/forbidden",
        "https://b.example/limited",
        "https://b.example/linkedin",
        "https://b.example/gone",
        "https://b.example/down",
      ),
      "https://a.example/robots.txt": 404,
      "HEAD https://b.example/head-not-allowed": 405,
      "GET https://b.example/head-not-allowed": 200,
      "HEAD https://b.example/forbidden": 403,
      "HEAD https://b.example/limited": 429,
      "HEAD https://b.example/linkedin": 999,
      "HEAD https://b.example/gone": 500,
      "HEAD https://b.example/down": new Error("MARKER-NETWORK"),
    });
    const r = await checkLinks("a.example", s.options);
    expect(r.links.blocked).toBe(3);
    expect(r.links.broken.map((b) => [b.url, b.status])).toEqual([
      ["https://b.example/gone", 500],
      ["https://b.example/down", "error"],
    ]);
    // One retry 5 s later for each bad result, not for 405.
    expect(s.log.filter((l) => l.url === "https://b.example/gone")).toHaveLength(2);
    expect(s.delays.filter((d) => d === 5000).length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(r.links)).not.toContain("MARKER");
  });

  test("403 and 429 on the checked site are broken", async () => {
    const r = await checkLinks(
      "a.example",
      site({
        [HOME]: page("/private", "/busy"),
        "https://a.example/private": 403,
        "https://a.example/busy": 429,
        "https://a.example/robots.txt": 404,
      }).options,
    );
    expect(r.links.broken.map((b) => b.status)).toEqual([403, 429]);
    expect(r.links.blocked).toBe(0);
  });

  test("a retry that passes is not broken; a redirect to 200 is not broken", async () => {
    const r = await checkLinks(
      "a.example",
      site({
        [HOME]: page("https://b.example/flaky", "https://b.example/moved"),
        "https://a.example/robots.txt": 404,
        "HEAD https://b.example/flaky": [500, 200],
        // fetch follows redirects; the last status counts.
        "HEAD https://b.example/moved": 200,
      }).options,
    );
    expect(r.links.level).toBe("good");
  });

  test("at most 4 requests to other hosts at the same time", async () => {
    const links = Array.from({ length: 12 }, (_, i) => `https://b${i}.example/`);
    const map: Record<string, Fake> = {
      [HOME]: page(...links),
      "https://a.example/robots.txt": 404,
    };
    for (const l of links) map[`HEAD ${l}`] = 200;
    const s = site(map);
    await checkLinks("a.example", s.options);
    expect(s.stats.maxExternalAtOnce).toBeLessThanOrEqual(4);
    expect(s.stats.maxExternalAtOnce).toBeGreaterThan(1);
  });

  test("robots.txt: a disallowed page is not read, its link is checked with HEAD", async () => {
    const s = site({
      [HOME]: page("/admin/x", "/ok"),
      "https://a.example/robots.txt": {
        html: "User-agent: *\nDisallow: /admin\n",
        headers: { "content-type": "text/plain" },
      },
      "HEAD https://a.example/admin/x": 200,
      "https://a.example/ok": page(),
    });
    const r = await checkLinks("a.example", s.options);
    expect(s.log.some((l) => l.method === "GET" && l.url === "https://a.example/admin/x")).toBe(
      false,
    );
    expect(s.log.some((l) => l.method === "HEAD" && l.url === "https://a.example/admin/x")).toBe(
      true,
    );
    expect(r.links.pages).toBe(2);
  });

  test("only HTML is read", async () => {
    const r = await checkLinks(
      "a.example",
      site({
        [HOME]: page("/file.pdf"),
        "https://a.example/robots.txt": 404,
        "https://a.example/file.pdf": {
          html: '<a href="/hidden">x</a>',
          headers: { "content-type": "application/pdf" },
        },
      }).options,
    );
    expect(r.links.broken).toEqual([]);
  });

  test("site down: the home page fails twice", async () => {
    const r = await checkLinks("a.example", site({ [HOME]: [500, 500] }).options);
    expect(r.links).toEqual({
      level: "not-checked",
      pages: 0,
      broken: [],
      blocked: 0,
      note: "site down",
    });
    expect(r.homeHeaders).toBeNull();
  });

  test("FR-014: no text of a page in the result", async () => {
    const r = await checkLinks(
      "a.example",
      site({
        [HOME]: page("/missing"),
        "https://a.example/missing": 404,
        "https://a.example/robots.txt": 404,
      }).options,
    );
    expect(r.links.broken).toHaveLength(1);
    expect(JSON.stringify(r.links)).not.toContain("MARKER");
  });
});
