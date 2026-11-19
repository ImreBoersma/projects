import { beforeAll, expect, test } from "bun:test";
import { renderPage } from "../src/render";
import { renderStakeholderPage } from "../src/stakeholder/render";
import { stakeholderViews } from "../src/stakeholder/view";
import { markDrift } from "../src/versions/drift";
import { deliveryWorstCase, qualityCheck, versionsWorstCase, worstCaseRows } from "./helpers";

// Spec 011 research §8 (replaces the raw budgets of spec 019 SC-005): GitHub Pages sends the page
// with gzip, so the budget is on the gzip size. 2026-11-09: 147.7 KB raw, 18.7 KB gzip.
// Spec 016 and 017: with the versions table and the delivery table of 20 repos.
let css = "";
beforeAll(async () => {
  await Bun.$`bun run css`.cwd(new URL("..", import.meta.url).pathname).quiet();
  css = await Bun.file(new URL("../build/page.css", import.meta.url)).text();
});

// Spec 023 T025: each site with the largest quality cells (10 broken links shown, field data,
// missing headers), in the tab and in the pop-up.
const withQuality = () =>
  worstCaseRows().map((s, i) => {
    const domain = s.project.domain as string;
    const base = qualityCheck({ projectId: s.project.id, domain });
    return {
      ...s,
      quality: qualityCheck({
        projectId: s.project.id,
        domain,
        speed: {
          ...base.speed,
          level: "poor" as const,
          score: 42,
          field: {
            source: "url" as const,
            lcpMs: 4300,
            inpMs: 520,
            cls: 0.31,
            slow: ["LARGEST_CONTENTFUL_PAINT_MS"],
          },
        },
        accessibility: { ...base.accessibility, level: "warn", score: 78, failed: 6 },
        links: {
          level: "poor",
          pages: 50,
          blocked: 3,
          broken: Array.from({ length: 12 }, (_, j) => ({
            url: `https://${domain}/a-long-page-address-that-is-gone-${i}-${j}/`,
            page: `https://${domain}/news/2026/11/some-article-${j}/`,
            status: 404,
          })),
        },
        headers: {
          ...base.headers,
          level: "warn",
          present: ["strict-transport-security"],
          missing: ["content-security-policy", "x-content-type-options", "referrer-policy"],
        },
      }),
    };
  });

test("the 20-site worst case with its CSS is less than 30 KB gzip", () => {
  const html = renderPage({
    generatedAt: new Date("2026-10-28T05:03:00Z"),
    rows: withQuality(),
    qualityDate: "2026-10-28",
    issues: new Map(),
    css,
    versions: markDrift(versionsWorstCase()),
    delivery: deliveryWorstCase(),
  });
  expect(html).toContain(css.slice(0, 200));
  const gzip = Bun.gzipSync(html).length;
  console.log(`Page size: ${Buffer.byteLength(html)} B raw, ${gzip} B gzip.`);
  expect(gzip).toBeLessThan(30_000);
});

// Spec 022 SC-005 (T020): the stakeholder page is a separate file with its own budget.
test("the stakeholder page with 20 projects and its CSS is less than 15 KB gzip", () => {
  const rows = worstCaseRows().map((s) => ({
    ...s,
    project: { ...s.project, stakeholder: "Harmonieorkest Brummen" },
  }));
  const [view] = stakeholderViews({
    generatedAt: new Date("2026-10-28T05:03:00Z"),
    rows,
    issues: new Map(),
    historyStart: "2026-09-01",
  });
  const html = renderStakeholderPage(view, css);
  const gzip = Bun.gzipSync(html).length;
  console.log(`Stakeholder page size: ${Buffer.byteLength(html)} B raw, ${gzip} B gzip.`);
  expect(view.projects.length).toBe(20);
  expect(gzip).toBeLessThan(15_000);
});
