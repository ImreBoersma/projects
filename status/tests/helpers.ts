import type { ProjectStatus } from "../src/types";

export function status(overrides: Partial<ProjectStatus> = {}): ProjectStatus {
  return {
    project: { id: "one", name: "One", repo: "ImreBoersma/one", status: "active" },
    availability: "ok",
    lastCommitAt: new Date("2026-10-27T00:00:00Z"),
    openPrCount: 0,
    renovatePrCount: 0,
    oldestRenovatePrAt: null,
    ci: "passed",
    deploy: "unknown",
    problems: [],
    uptime: { state: "no-domain", at: null },
    commitOid: null,
    renovateApp: null,
    conformanceNotAvailable: [],
    expiry: { certificate: null, renewals: [], registryNotKnown: false },
    history: { since: {}, sinceIsHistoryStart: [], uptime: null },
    secrets: [],
    secretGaps: [],
    secretsNoExpiry: [],
    ...overrides,
  };
}

// The worst case of spec 019 SC-005 and spec 011 research §8: 20 sites with a problem, an uptime
// bar and dates.
export function worstCaseRows(): ProjectStatus[] {
  return Array.from({ length: 20 }, (_, i) =>
    status({
      project: {
        id: `p${i}`,
        name: `Project ${i}`,
        repo: `ImreBoersma/p${i}`,
        status: "active",
        domain: `p${i}.example`,
      },
      problems: [{ projectId: `p${i}`, reason: "ci-failed", key: `p${i}/ci-failed` }],
      uptime: { state: "up", at: new Date("2026-10-28T05:03:00Z") },
      expiry: {
        certificate: { date: "2026-12-19", days: 52 },
        renewals: [{ name: "Domain", date: "2027-03-01", days: 124, source: "registry" }],
        registryNotKnown: false,
      },
      history: {
        since: { [`p${i}/ci-failed`]: "2026-10-26T04:00:00Z" },
        sinceIsHistoryStart: [],
        uptime: { percent: 99.5, days: Array(30).fill("up") },
        uptimeEnd: "2026-10-28",
      },
    }),
  );
}
