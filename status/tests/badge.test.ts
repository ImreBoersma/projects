import { expect, test } from "bun:test";
import { badge } from "../src/stakeholder/badge";
import type { Problem, ProjectStatus } from "../src/types";
import { status } from "./helpers";

const NOW = new Date("2026-11-17T11:00:00Z");
const withSite = (state: ProjectStatus["uptime"]["state"]) =>
  status({
    project: { id: "hob-nl", name: "hob.nl", repo: null, status: "active", domain: "hob.example" },
    uptime: { state, at: NOW },
  });
const noSite = (overrides: Partial<ProjectStatus> = {}) =>
  status({ project: { id: "api", name: "API", repo: "o/api", status: "active" }, ...overrides });
const problem = (reason: string): Problem[] => [
  { projectId: "api", reason: reason as Problem["reason"], key: `api/${reason}` },
];

// The text and the colour of the state part.
const state = (s: ProjectStatus) => {
  const { svg } = badge(s);
  return [
    svg.match(/>● ([^<]+)</)?.[1],
    svg.match(/<rect x="\d+" [^>]*fill="(#[0-9a-f]{6})"/)?.[1],
  ];
};

test("the states of contracts/badge.md", () => {
  expect(state(withSite("up"))).toEqual(["online", "#1a7f37"]);
  expect(state(withSite("down"))).toEqual(["offline", "#cf222e"]);
  expect(state(withSite("not-available"))).toEqual(["not checked", "#6e7781"]);
  expect(state(noSite())).toEqual(["works", "#1a7f37"]);
  expect(state(noSite({ problems: problem("ci-failed") }))).toEqual(["problem", "#cf222e"]);
  expect(state(noSite({ problems: problem("deploy-failed") }))).toEqual(["problem", "#cf222e"]);
  expect(state(noSite({ problems: problem("renovate-stale") }))).toEqual(["works", "#1a7f37"]);
  expect(state(noSite({ availability: "unavailable" }))).toEqual(["not checked", "#6e7781"]);
});

test("the shape: accessible, self-contained, small", () => {
  const { id, svg } = badge(withSite("up"));
  expect(id).toBe("hob-nl");
  expect(svg).toStartWith('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('role="img"');
  expect(svg).toContain('aria-label="hob.nl: online"');
  expect(svg).toContain("<title>hob.nl: online</title>");
  expect(svg).toContain('fill="#24292f"');
  expect(svg.match(/textLength="\d+"/g)?.length).toBe(2);
  expect(svg).not.toMatch(/<script|href|https?:\/\/(?!www\.w3\.org)/);
  const long = badge(
    status({ project: { id: "x", name: "A & <B>".padEnd(30, "x"), repo: null, status: "active" } }),
  ).svg;
  expect(long).toContain("A &amp; &lt;B&gt;");
  expect(Buffer.byteLength(long)).toBeLessThan(1000);
});

// WCAG 2 relative luminance and contrast with white.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("white text has 4.5:1 or more on each colour", () => {
  for (const colour of ["#1a7f37", "#cf222e", "#6e7781", "#24292f"]) {
    expect(1.05 / (luminance(colour) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
