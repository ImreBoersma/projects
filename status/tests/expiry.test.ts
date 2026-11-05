import { describe, expect, test } from "bun:test";
import {
  certificateProblem,
  daysUntil,
  mergeRenewals,
  renewalProblems,
  slug,
} from "../src/expiry/expiry";
import type { Renewal } from "../src/types";

const now = new Date("2026-11-05T23:30:00Z");
const r = (
  name: string,
  days: number,
  source: Renewal["source"] = "catalog",
  date = "2027-01-01",
): Renewal => ({
  name,
  date,
  days,
  source,
});

describe("daysUntil and slug", () => {
  test("counts whole days from the start of today", () => {
    expect(daysUntil("2026-11-05", now)).toBe(0);
    expect(daysUntil("2026-11-06", now)).toBe(1);
    expect(daysUntil("2026-11-04", now)).toBe(-1);
    expect(daysUntil("2026-11-06", new Date("2026-11-05T00:00:01Z"))).toBe(1);
  });

  test("makes a key part from a name", () => {
    expect(slug("Hosting (yearly)")).toBe("hosting-yearly");
    expect(slug("Domain")).toBe("domain");
  });
});

describe("certificateProblem (US1)", () => {
  const cert = (days: number) => ({ date: "2026-12-01", days });
  test("is a problem at 14 days or less", () => {
    expect(certificateProblem("one", cert(15))).toBeNull();
    expect(certificateProblem("one", cert(14))).toEqual({
      projectId: "one",
      reason: "cert-expiring",
      key: "one/cert-expiring",
      text: "The TLS certificate expires in 14 days.",
    });
    expect(certificateProblem("one", cert(1))?.text).toBe("The TLS certificate expires in 1 day.");
    expect(certificateProblem("one", cert(-3))?.text).toBe(
      "The TLS certificate expired 3 days ago.",
    );
  });
  test("is no problem when not known", () => {
    expect(certificateProblem("one", "not-known")).toBeNull();
    expect(certificateProblem("one", null)).toBeNull();
  });
});

describe("renewalProblems (US2)", () => {
  test("is a problem at 30 days or less, one for each renewal", () => {
    expect(renewalProblems("one", [r("Hosting", 31)])).toEqual([]);
    expect(renewalProblems("one", [r("Hosting", 30)])).toEqual([
      {
        projectId: "one",
        reason: "renewal-due",
        key: "one/renewal-due/hosting",
        text: "Renewal of Hosting is due in 30 days.",
        source: "catalog",
      },
    ]);
    expect(renewalProblems("one", [r("Hosting", -2)])[0].text).toBe(
      "Renewal of Hosting was due 2 days ago.",
    );
    expect(renewalProblems("one", [r("Hosting", 5), r("Domain", 3)]).map((p) => p.key)).toEqual([
      "one/renewal-due/hosting",
      "one/renewal-due/domain",
    ]);
  });
});

describe("mergeRenewals (US3)", () => {
  test("adds the registry date as Domain, and keeps the earlier date", () => {
    const registry = r("Domain", 100, "registry", "2027-02-01");
    expect(mergeRenewals([r("Hosting", 50)], registry).map((x) => x.name)).toEqual([
      "Hosting",
      "Domain",
    ]);
    expect(mergeRenewals([r("domain", 200, "catalog", "2027-06-01")], registry)).toEqual([
      registry,
    ]);
    const early = r("Domain", 10, "catalog", "2026-11-15");
    expect(mergeRenewals([early], registry)).toEqual([early]);
    expect(mergeRenewals([r("Hosting", 50)], null)).toEqual([r("Hosting", 50)]);
  });
});
