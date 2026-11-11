import type { DeliveryRow, ProjectStatus, VersionRow } from "../src/types";

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

// Spec 016: the versions of the 20-site worst case: all 7 tools, a mix of marks.
export function versionsWorstCase(): VersionRow[] {
  const v = (text: string, major: number, source = "devDependencies") => ({ text, source, major });
  return Array.from({ length: 20 }, (_, i) => ({
    projectId: `p${i}`,
    repo: `ImreBoersma/p${i}`,
    state: "ok" as const,
    tools: {
      node: { text: "24 (default)", source: "default", major: 24 },
      bun: { text: "newest (CI)", source: "bun.lock", major: null },
      next: v(`^${15 + (i % 2)}.4.2`, 15 + (i % 2), "dependencies"),
      react: v("^19.3.1", 19, "dependencies"),
      typescript: v(`^${5 + (i % 3)}.0.3`, 5 + (i % 3)),
      biome: v("^2.6.3", 2),
      "types-node": v(`^${20 + (i % 7)}.6.5`, 20 + (i % 7)),
    },
  }));
}

// Spec 017: the delivery numbers of the 20-site worst case: 4 months, a mix of counts and times.
export function deliveryWorstCase(): { rows: DeliveryRow[]; months: string[] } {
  const months = ["2026-08", "2026-09", "2026-10", "2026-11"];
  return {
    months,
    rows: Array.from({ length: 20 }, (_, i) => ({
      projectId: `p${i}`,
      name: `Project ${i}`,
      state: "ok" as const,
      merged: 40 + i,
      updates: 30 + i,
      updateHours: Array.from({ length: 30 + i }, (_, j) => j * 3.5),
      otherHours: [0.2, 1.5, 30],
      deploys: 10 + i,
      months: months.map((m, j): [string, number] => [m, j + i]),
    })),
  };
}
