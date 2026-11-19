import { describe, expect, test } from "bun:test";
import { STALE_MS } from "../src/render";
import { notFoundPage, renderStakeholderPage } from "../src/stakeholder/render";
import { stakeholderViews } from "../src/stakeholder/view";
import type { ProjectStatus } from "../src/types";
import { hobRows, notChecked, qualityCheck, status } from "./helpers";

const NOW = new Date("2026-11-17T11:00:00Z");
const page = (rows: ProjectStatus[], now = NOW, historyStart = "2026-11-05") =>
  renderStakeholderPage(
    stakeholderViews({ generatedAt: now, rows, issues: new Map(), historyStart })[0],
    ".fake{}",
  );
// The text without tags (a site address is a link inside a sentence); the markup tests use page().
const render = (rows: ProjectStatus[], now = NOW, historyStart = "2026-11-05") =>
  page(rows, now, historyStart).replace(/<(?!\/?(html|title|style)\b)[^>]+>/g, "");
const withPretband = (change: (s: ProjectStatus) => ProjectStatus) =>
  hobRows(NOW).map((s) => (s.project.id === "pretband" ? change(s) : s));
const outsideStyle = (page: string) => page.replace(/<style>[\s\S]*?<\/style>/, "");

describe("spec 022 stakeholder page (T007)", () => {
  test("the HOB page on 2026-11-17 (SC-003)", () => {
    const text0 = render(hobRows(NOW));
    for (const text of [
      '<html lang="nl">',
      "<title>Harmonieorkest Brummen: status van de projecten</title>",
      "Projecten van Harmonieorkest Brummen",
      "Stand van 17 november 2026 om 12:00.",
      "Er is niets waar het bestuur iets mee moet.",
      "De website harmonieorkestbrummen.nl is online.",
      "Sinds 5 november 2026 was de website 100 % van de tijd online.",
      "De beheerder verlengt de domeinnaam vóór 1 februari 2027 (over 2 maanden).",
      "De beheerder verlengt de domeinnaam vóór 1 mei 2027 (over 5 maanden).",
      "Dit onderdeel werkt.",
    ]) {
      expect(text0).toContain(text);
    }
    const markup = page(hobRows(NOW));
    expect(markup).toContain('href="https://imreboersma.github.io/projects/"');
    expect(markup).toContain('data-time="2026-11-17T11:00:00.000Z"');
    expect(markup).toContain('<a class="link" href="https://pretband.nl">pretband.nl</a>');
    expect(text0).not.toContain("Hier moet het bestuur iets mee:");
  });

  test("seven days before the renewal, nothing needs the board (SC-004)", () => {
    const now = new Date("2027-01-25T11:00:00Z");
    const text = render(hobRows(now), now, "2026-11-05");
    expect(text).toContain("Er is niets waar het bestuur iets mee moet.");
    expect(text).toContain(
      "De beheerder verlengt de domeinnaam vóór 1 februari 2027 (over 7 dagen).",
    );
    expect(text).toContain("De afgelopen 30 dagen was de website 100 % van de tijd online.");
    expect(text).not.toMatch(/betaal|kosten|€/i);
  });

  test("an offline site: in the top line after 2 hours, else in the block only", () => {
    const down = (since: string) =>
      render(
        withPretband((s) => ({
          ...s,
          uptime: { state: "down", at: NOW },
          history: { ...s.history, since: { "pretband/site-down": since } },
        })),
      );
    const line =
      "De website pretband.nl is offline sinds 17 november 2026 om 09:00. De beheerder weet het.";
    const long = down("2026-11-17T08:00:00Z");
    expect(long).toContain("Hier moet het bestuur iets mee:");
    expect(long.split(line).length - 1).toBe(2);
    const short = down("2026-11-17T10:30:00Z");
    expect(short).toContain("Er is niets waar het bestuur iets mee moet.");
    expect(short).toContain(
      "De website pretband.nl is offline sinds 17 november 2026 om 11:30. De beheerder weet het.",
    );
    expect(short).not.toContain("Hier moet het bestuur iets mee:");
  });

  test("a site that is not checked", () => {
    const text = render(
      withPretband((s) => ({ ...s, uptime: { state: "not-available", at: NOW } })),
    );
    expect(text).toContain(
      "De controle van de website pretband.nl is om 17 november 2026 om 12:00 niet gelukt.",
    );
  });

  test("a part without a site: only a fault is a problem", () => {
    const backend = (reason: string) =>
      render(
        hobRows(NOW).map((s) =>
          s.project.id === "pretband-backend"
            ? { ...s, problems: [{ projectId: s.project.id, reason: reason as never, key: "k" }] }
            : s,
        ),
      );
    expect(backend("ci-failed")).toContain("Er is een probleem. De beheerder weet het.");
    expect(backend("renovate-stale")).toContain("Dit onderdeel werkt.");
    expect(backend("renovate-stale")).not.toContain("Er is een probleem");
  });

  test("no developer facts (FR-004) and escaped catalog text", () => {
    const busy = status({
      project: {
        id: "busy",
        name: "<b>Busy</b>",
        repo: "ImreBoersma/busy",
        status: "active",
        stakeholder: "Harmonieorkest Brummen",
        domain: "busy.example",
      },
      ci: "failed",
      deploy: { at: NOW, result: "failed" },
      openPrCount: 4,
      renovatePrCount: 3,
      oldestRenovatePrAt: NOW,
      commitOid: "abc123",
      renovateApps: ["renovate"],
      conformanceNotAvailable: ["R1"],
      uptime: { state: "up", at: NOW },
      problems: [
        { projectId: "busy", reason: "ci-failed", key: "busy/ci-failed" },
        { projectId: "busy", reason: "not-conformant", key: "busy/not-conformant", detail: ["R4"] },
        { projectId: "busy", reason: "renovate-stale", key: "busy/renovate-stale" },
      ],
      secretsNoExpiry: ["BOARD_TOKEN"],
      // Spec 023 T034: quality facts must not show.
      quality: qualityCheck({
        accessibility: { ...qualityCheck().accessibility, level: "poor", score: 31, failed: 4 },
        headers: { ...qualityCheck().headers, level: "poor", present: [] },
      }),
    });
    const markup = outsideStyle(page([...hobRows(NOW), busy]));
    for (const word of [
      /\bCI\b/,
      /Renovate/i,
      /commit/i,
      /\bPR\b/,
      /deploy/i,
      /conform/i,
      /token/i,
      /github\.com/,
      /accessibility/i,
      /toegankelijkheid/i,
      /Content-Security-Policy/i,
      /Strict-Transport-Security/i,
      /pagespeed/i,
      /observatory/i,
      /\b\d{1,3}\/100\b/,
    ]) {
      expect(markup).not.toMatch(word);
    }
    expect(markup).not.toMatch(/<nav|<dialog|data-filter/);
    expect(markup).toContain("&lt;b&gt;Busy&lt;/b&gt;");
    expect(markup).not.toContain("<b>Busy</b>");
  });

  test("the not-found page (T019)", () => {
    const markup = notFoundPage();
    expect(markup).toContain('lang="nl"');
    expect(markup).toContain("Deze pagina bestaat niet.");
    expect(markup).toContain("This page does not exist.");
    expect(markup).toContain('href="https://imreboersma.github.io/projects/"');
  });
});

describe("spec 022 print (T013)", () => {
  test("the page gives its own address for the print", () => {
    expect(page(hobRows(NOW))).toContain(
      '<p class="print-only">Deze pagina: https://imreboersma.github.io/projects/s/harmonieorkest-brummen.html</p>',
    );
  });

  test("page.css has the print block", async () => {
    const css = await Bun.file(new URL("../src/page.css", import.meta.url)).text();
    const print = css.slice(css.indexOf("@media print"));
    for (const part of ["@page", "size: A4", ".print-only", "break-inside: avoid"]) {
      expect(print).toContain(part);
    }
  });
});

test("the old-data script uses the 3 hours of the status page (T029)", () => {
  expect(page(hobRows(NOW))).toContain(`>${STALE_MS})s.hidden=false`);
});

// Spec 023 T034, contracts/page.md "Stakeholder page".
describe("the speed sentence (spec 023)", () => {
  const speed = (level: "good" | "warn" | "poor") =>
    qualityCheck({ speed: { ...qualityCheck().speed, level, score: level === "good" ? 94 : 30 } });
  const withSpeed = (quality: ReturnType<typeof qualityCheck> | undefined) =>
    withPretband((s) => ({ ...s, quality }));

  test("good: fast, after the uptime sentence", () => {
    const text = render(withSpeed(speed("good")));
    expect(text).toContain("De website laadt snel op een telefoon.");
    expect(text.indexOf("van de tijd online.")).toBeLessThan(text.indexOf("laadt snel"));
  });

  test("poor: slow, and the top line does not change", () => {
    const text = render(withSpeed(speed("poor")));
    expect(text).toContain("De website laadt langzaam op een telefoon. De beheerder weet het.");
    expect(text).toContain("Er is niets waar het bestuur iets mee moet.");
    const [view] = stakeholderViews({
      generatedAt: NOW,
      rows: withSpeed(speed("poor")),
      issues: new Map(),
      historyStart: "2026-11-05",
    });
    expect(view.attention).toEqual([]);
    expect(view.projects.find((b) => b.name === "Pretband")?.speed).toBe("slow");
  });

  test("a warning, not checked or no result: no sentence", () => {
    for (const q of [speed("warn"), notChecked("site down"), undefined]) {
      expect(render(withSpeed(q))).not.toContain("laadt");
    }
  });

  test("no sentence for a project without a site", () => {
    const rows = hobRows(NOW).map((s) =>
      s.project.id === "pretband-backend" ? { ...s, quality: speed("good") } : s,
    );
    const [view] = stakeholderViews({
      generatedAt: NOW,
      rows,
      issues: new Map(),
      historyStart: "2026-11-05",
    });
    expect(view.projects.find((b) => b.name === "Pretband backend")?.speed).toBeNull();
  });
});
