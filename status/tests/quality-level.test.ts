import { expect, test } from "bun:test";
import { headerLevel, linkLevel, scoreLevel, speedLevel } from "../src/quality/level";

const link = { url: "https://a.example/x", page: "https://a.example/", status: 404 as const };

test("score bands (FR-003)", () => {
  expect(scoreLevel(100)).toBe("good");
  expect(scoreLevel(90)).toBe("good");
  expect(scoreLevel(89)).toBe("warn");
  expect(scoreLevel(50)).toBe("warn");
  expect(scoreLevel(49)).toBe("poor");
  expect(scoreLevel(null)).toBe("not-checked");
});

test("a slow field metric makes the speed poor (research.md §3)", () => {
  expect(speedLevel(92, { slow: ["LARGEST_CONTENTFUL_PAINT_MS"] })).toBe("poor");
  expect(speedLevel(92, { slow: [] })).toBe("good");
  expect(speedLevel(71, null)).toBe("warn");
  expect(speedLevel(null, null)).toBe("not-checked");
});

test("link levels", () => {
  expect(linkLevel({ broken: [], blocked: 2 })).toBe("warn");
  expect(linkLevel({ broken: [link], blocked: 0 })).toBe("poor");
  expect(linkLevel({ broken: [link], blocked: 3 })).toBe("poor");
  expect(linkLevel({ broken: [], blocked: 0 })).toBe("good");
});

test("header levels", () => {
  expect(headerLevel(4)).toBe("good");
  expect(headerLevel(3)).toBe("warn");
  expect(headerLevel(1)).toBe("warn");
  expect(headerLevel(0)).toBe("poor");
});
