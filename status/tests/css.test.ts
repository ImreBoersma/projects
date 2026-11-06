import { beforeAll, describe, expect, test } from "bun:test";
import { THEME } from "../src/style";

// Spec 019 SC-005 and spec 007 FR-011: the built CSS goes inline and loads nothing.
let css = "";
beforeAll(async () => {
  await Bun.$`bun run css`.cwd(new URL("..", import.meta.url).pathname).quiet();
  css = await Bun.file(new URL("../build/page.css", import.meta.url)).text();
});

describe("build/page.css (spec 019)", () => {
  test("small, and loads no file", () => {
    expect(css.length).toBeGreaterThan(1000);
    // Spec 019 SC-005: 60 KB for the CSS + 90 KB for the HTML (render.test.ts) < 150 KB.
    expect(css.length).toBeLessThan(60_000);
    expect(css).not.toContain("@import");
    expect(css).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
  });

  test("the bumblebee theme, light, with the darker error text", () => {
    expect(css).toContain("bumblebee");
    expect(css).toMatch(/color-scheme:\s*light/);
    // The minifier writes 0.141 as .141.
    expect(css).toMatch(/--color-error-content:\s*oklch\(28%\s+0?\.141\s+25\.723\)/);
    expect(THEME["--color-error-content"]).toBe("oklch(28% 0.141 25.723)");
  });

  test("without the script: no controls, all panels (FR-008)", () => {
    expect(css).toContain("html:not(.js) .controls");
    expect(css).toMatch(/html\.js \[role=["']?tabpanel["']?\]:not\(\.active\)/);
  });
});
