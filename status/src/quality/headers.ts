// Spec 023 research.md §5: the 4 security headers of the home page.
import type { HeaderResult } from "../types";
import { headerLevel } from "./level";

const NAMES = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
] as const;

export const observatoryReport = (domain: string) =>
  `https://developer.mozilla.org/en-US/observatory/analyze?host=${domain}`;

export function checkHeaders(headers: Headers, domain: string): HeaderResult {
  // `Headers.get` ignores case. Only `nosniff` protects; the report-only CSP does not count.
  const sent = (name: (typeof NAMES)[number]) => {
    const value = headers.get(name);
    if (value === null) return false;
    return name === "x-content-type-options" ? value.trim().toLowerCase() === "nosniff" : true;
  };
  const present = NAMES.filter(sent);
  return {
    level: headerLevel(present.length),
    present,
    missing: NAMES.filter((n) => !present.includes(n)),
    report: observatoryReport(domain),
  };
}
