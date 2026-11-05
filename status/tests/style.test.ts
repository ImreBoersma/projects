import { describe, expect, test } from "bun:test";
import { css, FAVICON, TOKENS, type Tokens } from "../src/style";

// WCAG 2.1 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [keyof Tokens, keyof Tokens][] = [
  ["fg", "bg"],
  ["muted", "bg"],
  ["link", "bg"],
  ["stale", "bg"],
  ["badFg", "bg"],
  ["goodFg", "goodBg"],
  ["warnFg", "warnBg"],
  ["badFg", "badBg"],
  ["unknownFg", "unknownBg"],
  ["fg", "goodBg"],
  ["fg", "badBg"],
  ["fg", "unknownBg"],
  ["muted", "goodBg"],
  ["muted", "badBg"],
  ["muted", "unknownBg"],
  ["stale", "goodBg"],
  ["stale", "badBg"],
  ["stale", "unknownBg"],
];

describe("tokens (FR-009, SC-004)", () => {
  test("contrast is 4.5 or more for each pair in both schemes", () => {
    const fails: string[] = [];
    for (const scheme of ["light", "dark"] as const) {
      const t = TOKENS[scheme];
      for (const [fg, bg] of PAIRS) {
        const ratio = contrast(t[fg], t[bg]);
        if (ratio < 4.5) fails.push(`${scheme} ${fg}/${bg} ${ratio.toFixed(2)}`);
      }
    }
    expect(fails).toEqual([]);
  });

  test("the CSS has each token in both schemes", () => {
    const text = css();
    expect(text.match(/--good-bg: #/g)).toHaveLength(2);
    expect(text).toContain("@media (prefers-color-scheme: dark)");
  });

  test("three favicons in the page itself", () => {
    expect(Object.keys(FAVICON)).toEqual(["correct", "problems", "not-available"]);
    for (const url of Object.values(FAVICON)) expect(url).toStartWith("data:image/svg+xml,");
    expect(new Set(Object.values(FAVICON)).size).toBe(3);
  });
});
