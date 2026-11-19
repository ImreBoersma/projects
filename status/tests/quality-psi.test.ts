import { describe, expect, test } from "bun:test";
import { checkPsi } from "../src/quality/psi";

const fixture = (name: string) =>
  Bun.file(new URL(`fixtures/${name}.json`, import.meta.url)).text();
const domain = "harmonieorkestbrummen.nl";
const report = `https://pagespeed.web.dev/analysis?url=https://${domain}/&form_factor=mobile`;

// A fake fetch: one response for each call, in order.
function fake(responses: (() => Response | Promise<Response>)[]) {
  const urls: string[] = [];
  const delays: number[] = [];
  const fetch = (async (url: string) => {
    urls.push(url);
    const next = responses.shift();
    if (!next) throw new Error("no fake response");
    return next();
  }) as unknown as typeof globalThis.fetch;
  return { fetch, delay: async (ms: number) => void delays.push(ms), urls, delays };
}
const ok = (text: string) => () => new Response(text, { status: 200 });

describe("checkPsi", () => {
  test("lab data only", async () => {
    const f = fake([ok(await fixture("psi-lab-only"))]);
    const r = await checkPsi(domain, "KEY", f);
    expect(r.speed).toEqual({ level: "warn", score: 71, field: null, report });
    expect(r.accessibility).toEqual({ level: "good", score: 96, failed: 1, report });
    const url = new URL(f.urls[0]);
    expect(url.origin + url.pathname).toBe(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    expect(url.searchParams.get("url")).toBe(`https://${domain}/`);
    expect(url.searchParams.get("strategy")).toBe("mobile");
    expect(url.searchParams.getAll("category")).toEqual(["performance", "accessibility"]);
    expect(url.searchParams.get("key")).toBe("KEY");
  });

  test("a slow field metric makes the speed poor", async () => {
    const r = await checkPsi(domain, "KEY", fake([ok(await fixture("psi-field-slow"))]));
    expect(r.speed.score).toBe(92);
    expect(r.speed.level).toBe("poor");
    expect(r.speed.field).toEqual({
      source: "url",
      lcpMs: 4300,
      inpMs: 180,
      cls: 0.05,
      slow: ["LARGEST_CONTENTFUL_PAINT_MS"],
    });
  });

  test("origin data when the page has none", async () => {
    const r = await checkPsi(domain, "KEY", fake([ok(await fixture("psi-origin-only"))]));
    expect(r.speed.field?.source).toBe("origin");
    expect(r.speed.level).toBe("good");
  });

  test("no key: not checked, no request", async () => {
    const f = fake([]);
    const r = await checkPsi(domain, undefined, f);
    expect(r.speed).toMatchObject({ level: "not-checked", score: null, note: "no key" });
    expect(r.accessibility).toMatchObject({ level: "not-checked", failed: null, note: "no key" });
    expect(f.urls).toHaveLength(0);
  });

  test("429: not checked, no retry", async () => {
    const f = fake([() => new Response("MARKER-ERROR-BODY", { status: 429 })]);
    const r = await checkPsi(domain, "KEY", f);
    expect(r.speed).toMatchObject({ level: "not-checked", note: "service error" });
    expect(f.urls).toHaveLength(1);
    expect(JSON.stringify(r)).not.toContain("MARKER");
  });

  test("500 twice: one retry after 5 s, then not checked", async () => {
    const err = () => new Response("MARKER-ERROR-BODY", { status: 500 });
    const f = fake([err, err]);
    const r = await checkPsi(domain, "KEY", f);
    expect(r.accessibility).toMatchObject({ level: "not-checked", note: "service error" });
    expect(f.delays).toEqual([5000]);
    expect(f.urls).toHaveLength(2);
  });

  test("500 then 200: the retry gives the result", async () => {
    const f = fake([() => new Response("", { status: 500 }), ok(await fixture("psi-lab-only"))]);
    expect((await checkPsi(domain, "KEY", f)).speed.score).toBe(71);
  });

  test("terms (research.md §2): no text of the response in the result", async () => {
    for (const name of ["psi-lab-only", "psi-field-slow", "psi-origin-only"]) {
      const r = await checkPsi(domain, "KEY", fake([ok(await fixture(name))]));
      expect(JSON.stringify(r)).not.toContain("MARKER");
    }
  });

  test("a network error is not checked", async () => {
    const boom = () => {
      throw new Error("MARKER-NETWORK");
    };
    const r = await checkPsi(domain, "KEY", fake([boom, boom]));
    expect(r.speed).toMatchObject({ level: "not-checked", note: "service error" });
    expect(JSON.stringify(r)).not.toContain("MARKER");
  });
});
