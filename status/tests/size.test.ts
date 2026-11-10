import { beforeAll, expect, test } from "bun:test";
import { renderPage } from "../src/render";
import { markDrift } from "../src/versions/drift";
import { versionsWorstCase, worstCaseRows } from "./helpers";

// Spec 011 research §8 (replaces the raw budgets of spec 019 SC-005): GitHub Pages sends the page
// with gzip, so the budget is on the gzip size. 2026-11-09: 147.7 KB raw, 18.7 KB gzip.
// Spec 016: with the versions table of 20 repos.
let css = "";
beforeAll(async () => {
  await Bun.$`bun run css`.cwd(new URL("..", import.meta.url).pathname).quiet();
  css = await Bun.file(new URL("../build/page.css", import.meta.url)).text();
});

test("the 20-site worst case with its CSS is less than 30 KB gzip", () => {
  const html = renderPage({
    generatedAt: new Date("2026-10-28T05:03:00Z"),
    rows: worstCaseRows(),
    issues: new Map(),
    css,
    versions: markDrift(versionsWorstCase()),
  });
  expect(html).toContain(css.slice(0, 200));
  const gzip = Bun.gzipSync(html).length;
  console.log(`Page size: ${Buffer.byteLength(html)} B raw, ${gzip} B gzip.`);
  expect(gzip).toBeLessThan(30_000);
});
