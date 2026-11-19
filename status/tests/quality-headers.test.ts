import { expect, test } from "bun:test";
import { checkHeaders } from "../src/quality/headers";

const domain = "pretband.nl";
const ALL = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
];

test("all 4 headers: good, in the fixed order", () => {
  const r = checkHeaders(
    new Headers({
      "Referrer-Policy": "strict-origin",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'",
      "Strict-Transport-Security": "max-age=31536000",
    }),
    domain,
  );
  expect(r).toEqual({
    level: "good",
    present: ALL,
    missing: [],
    report: "https://developer.mozilla.org/en-US/observatory/analyze?host=pretband.nl",
  });
});

test("report-only CSP and a wrong nosniff value do not count", () => {
  const r = checkHeaders(
    new Headers({
      "content-security-policy-report-only": "default-src 'self'",
      "x-content-type-options": "sniff",
      "strict-transport-security": "max-age=1",
    }),
    domain,
  );
  expect(r.level).toBe("warn");
  expect(r.present).toEqual(["strict-transport-security"]);
  expect(r.missing).toEqual(ALL.slice(1));
});

test("nosniff without case counts", () => {
  expect(
    checkHeaders(new Headers({ "x-content-type-options": "NoSniff" }), domain).present,
  ).toEqual(["x-content-type-options"]);
});

test("no headers: poor", () => {
  const r = checkHeaders(new Headers(), domain);
  expect(r.level).toBe("poor");
  expect(r.missing).toEqual(ALL);
});
