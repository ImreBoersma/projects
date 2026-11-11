import { describe, expect, test } from "bun:test";
import { FAVICON, THEME, THEME_DARK } from "../src/style";

// oklch() to linear sRGB (CSS Color 4), then WCAG 2.1 relative luminance and contrast.
function linear(value: string): number[] {
  const m = value.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/);
  if (!m) throw new Error(`not oklch: ${value}`);
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map((x) => Math.min(Math.max(x, 0), 1));
}
const luminance = (v: string) => {
  const [r, g, b] = linear(v);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The text pairs that the page draws (solid badges and alerts: content on the colour).
const PAIRS: [string, string][] = [
  ["--color-base-content", "--color-base-100"],
  ["--color-base-content", "--color-base-200"],
  ["--color-error-content", "--color-error"],
  ["--color-error-text", "--color-base-100"],
  ["--color-error-text", "--color-base-200"],
  ["--color-warning-content", "--color-warning"],
  ["--color-success-content", "--color-success"],
  ["--color-neutral-content", "--color-neutral"],
  // Spec 020: the "New" badge.
  ["--color-info-content", "--color-info"],
];

describe("theme (spec 019 FR-010)", () => {
  test.each([
    ["light", THEME],
    ["dark", THEME_DARK],
  ])("contrast is 4.5 or more for each text pair (%s)", (_, theme) => {
    const fails = PAIRS.filter(([fg, bg]) => contrast(theme[fg], theme[bg]) < 4.5).map(
      ([fg, bg]) => `${fg}/${bg} ${contrast(theme[fg], theme[bg]).toFixed(2)}`,
    );
    expect(fails).toEqual([]);
  });

  // Spec 016: the drift mark, color-mix(in oklab, warning 35%, base-100), under the base text.
  test.each([
    ["light", THEME],
    ["dark", THEME_DARK],
  ])("base text on the drift mark has 4.5 or more (%s)", (_, theme) => {
    const lab = (v: string) => {
      const m = v.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/) as RegExpMatchArray;
      const h = (Number(m[3]) * Math.PI) / 180;
      return [Number(m[1]), Number(m[2]) * Math.cos(h), Number(m[2]) * Math.sin(h)];
    };
    const [w, b] = [lab(theme["--color-warning"]), lab(theme["--color-base-100"])];
    const [L, A, B] = w.map((x, i) => x * 0.35 + b[i] * 0.65);
    const hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    const mix = `oklch(${L}% ${Math.hypot(A, B)} ${hue})`;
    expect(contrast(theme["--color-base-content"], mix)).toBeGreaterThanOrEqual(4.5);
  });

  test("three favicons in the page itself", () => {
    expect(Object.keys(FAVICON)).toEqual(["correct", "problems", "not-available"]);
    for (const url of Object.values(FAVICON)) expect(url).toStartWith("data:image/svg+xml,");
    expect(new Set(Object.values(FAVICON)).size).toBe(3);
  });
});
