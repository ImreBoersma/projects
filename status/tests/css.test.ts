import { beforeAll, describe, expect, test } from "bun:test";
import { TOKENS } from "../src/style";

// Spec 019 SC-005 and spec 007 FR-011: the built CSS goes inline and loads nothing.
let css = "";
beforeAll(async () => {
  await Bun.$`bun run css`.cwd(new URL("..", import.meta.url).pathname).quiet();
  css = await Bun.file(new URL("../build/page.css", import.meta.url)).text();
});

describe("build/page.css (spec 019)", () => {
  test("small, and loads no file", () => {
    expect(css.length).toBeGreaterThan(1000);
    expect(css.length).toBeLessThan(80_000);
    expect(css).not.toContain("@import");
    expect(css).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
  });

  test("the themes have the colours of TOKENS; the strong colour is --color-error (analysis C1)", () => {
    expect(css).toContain("calm");
    expect(css).toContain(TOKENS.light.bg);
    expect(css).toMatch(new RegExp(`--color-error:\\s*${TOKENS.light.badFg}`));
    expect(css).toMatch(new RegExp(`--color-error:\\s*${TOKENS.dark.badFg}`));
  });

  test("without the script: no controls, all panels (FR-008)", () => {
    expect(css).toContain("html:not(.js) .controls");
    expect(css).toMatch(/html\.js \[role=["']?tabpanel["']?\]:not\(\.active\)/);
  });
});
