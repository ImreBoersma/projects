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
    ...overrides,
  };
}
