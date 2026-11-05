import { describe, expect, test } from "bun:test";
import type { Project } from "../src/types";
import { checkAll } from "../src/uptime";

const now = new Date("2026-11-04T10:17:00Z");

const project = (
  id: string,
  domain: string | null,
  status: Project["status"] = "active",
): Project => ({
  id,
  name: id,
  repo: null,
  status,
  domain,
});

// A fake fetch: each URL gives a list of results, one for each attempt.
function fakeFetch(results: Record<string, (number | Error)[]>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = results[url]?.shift() ?? new Error("no fake result");
    if (next instanceof Error) throw next;
    return new Response(null, { status: next });
  };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

function options(results: Record<string, (number | Error)[]>) {
  const fake = fakeFetch(results);
  const delays: number[] = [];
  return {
    fake,
    delays,
    opts: {
      fetch: fake.fetch,
      delay: async (ms: number) => {
        delays.push(ms);
      },
      timeoutMs: 10_000,
    },
  };
}

describe("checkAll", () => {
  test("gives up, down and no-domain", async () => {
    const { opts } = options({
      "https://up.example/": [200],
      "https://down.example/": [503, 503],
      "https://tls.example/": [
        new Error("certificate has expired"),
        new Error("certificate has expired"),
      ],
    });
    const result = await checkAll(
      [
        project("a", "up.example"),
        project("b", "down.example"),
        project("c", "tls.example"),
        project("d", null),
      ],
      now,
      opts,
    );
    expect(result.get("a")).toEqual({ state: "up", at: now });
    expect(result.get("b")).toEqual({ state: "down", at: now });
    expect(result.get("c")).toEqual({ state: "down", at: now });
    expect(result.get("d")).toEqual({ state: "no-domain", at: null });
  });

  test("gives no error text in the result (FR-011)", async () => {
    const { opts } = options({
      "https://up.example/": [200],
      "https://tls.example/": [
        new Error("certificate has expired"),
        new Error("certificate has expired"),
      ],
    });
    const result = await checkAll(
      [project("a", "up.example"), project("c", "tls.example")],
      now,
      opts,
    );
    expect(Object.keys(result.get("c") ?? {}).sort()).toEqual(["at", "state"]);
    expect(JSON.stringify([...result])).not.toContain("certificate");
  });

  test("does not check an archived project (FR-002)", async () => {
    const { opts, fake } = options({ "https://old.example/": [200] });
    const result = await checkAll([project("old", "old.example", "archived")], now, opts);
    expect(result.has("old")).toBe(false);
    expect(fake.calls).toHaveLength(0);
  });

  test("sends a GET to https://<domain>/ that follows redirects", async () => {
    const { opts, fake } = options({ "https://up.example/": [200] });
    await checkAll([project("a", "up.example")], now, opts);
    expect(fake.calls[0].url).toBe("https://up.example/");
    expect(fake.calls[0].init.redirect).toBe("follow");
    expect(new Headers(fake.calls[0].init.headers).get("User-Agent")).toBe(
      "ImreBoersma-projects-status-check",
    );
    expect(fake.calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  test("gives not-available when 2 or more domains are all down (FR-008)", async () => {
    const { opts } = options({
      "https://one.example/": [new Error("network"), new Error("network")],
      "https://two.example/": [new Error("network"), new Error("network")],
    });
    const result = await checkAll(
      [project("a", "one.example"), project("b", "two.example"), project("c", null)],
      now,
      opts,
    );
    expect(result.get("a")).toEqual({ state: "not-available", at: now });
    expect(result.get("b")).toEqual({ state: "not-available", at: now });
    expect(result.get("c")).toEqual({ state: "no-domain", at: null });
  });

  test("gives down when the only domain is down (research.md §5)", async () => {
    const { opts } = options({ "https://one.example/": [503, 503] });
    const result = await checkAll([project("a", "one.example")], now, opts);
    expect(result.get("a")?.state).toBe("down");
  });
});

describe("second attempt (US3)", () => {
  test("a site that fails one time and then responds is up", async () => {
    const { opts, fake, delays } = options({ "https://flaky.example/": [new Error("reset"), 200] });
    const result = await checkAll([project("a", "flaky.example")], now, opts);
    expect(result.get("a")?.state).toBe("up");
    expect(fake.calls).toHaveLength(2);
    expect(delays).toEqual([5000]);
  });

  test("a site that fails two times is down", async () => {
    const { opts, fake } = options({ "https://down.example/": [503, 503] });
    const result = await checkAll([project("a", "down.example")], now, opts);
    expect(result.get("a")?.state).toBe("down");
    expect(fake.calls).toHaveLength(2);
  });

  test("a site that is up at once makes one request and does not wait", async () => {
    const { opts, fake, delays } = options({ "https://up.example/": [200] });
    await checkAll([project("a", "up.example")], now, opts);
    expect(fake.calls).toHaveLength(1);
    expect(delays).toEqual([]);
  });
});
