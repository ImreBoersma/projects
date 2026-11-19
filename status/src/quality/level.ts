// Spec 023 FR-003: the levels of the 4 quality results.
import type { BrokenLink, QualityLevel } from "../types";

// The colour bands of the lab test: 90 or more good, 50 to 89 warning, below 50 poor.
export function scoreLevel(score: number | null): QualityLevel {
  if (score === null) return "not-checked";
  return score >= 90 ? "good" : score >= 50 ? "warn" : "poor";
}

// Research.md §3: a field metric with the category SLOW makes the speed poor.
export function speedLevel(score: number | null, field: { slow: string[] } | null): QualityLevel {
  if (score === null) return "not-checked";
  return field?.slow.length ? "poor" : scoreLevel(score);
}

export function linkLevel(r: { broken: BrokenLink[]; blocked: number }): QualityLevel {
  return r.broken.length ? "poor" : r.blocked ? "warn" : "good";
}

export function headerLevel(present: number): QualityLevel {
  return present === 4 ? "good" : present > 0 ? "warn" : "poor";
}
