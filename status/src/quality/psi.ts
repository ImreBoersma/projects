// Spec 023 research.md §1 to §3: one PageSpeed Insights call gives the speed, the accessibility
// and the field data of real users. Terms (research.md §2): keep only own derived numbers, never
// a text of the response.
import type { AccessibilityResult, QualityNote, SpeedResult } from "../types";
import { scoreLevel, speedLevel } from "./level";

const API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const METRICS = {
  lcpMs: "LARGEST_CONTENTFUL_PAINT_MS",
  inpMs: "INTERACTION_TO_NEXT_PAINT",
  cls: "CUMULATIVE_LAYOUT_SHIFT_SCORE",
} as const;

export interface PsiOptions {
  fetch: typeof globalThis.fetch;
  delay: (ms: number) => Promise<void>;
}

type Metric = { percentile?: number; category?: string };
interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<
      string,
      { score?: number | null; auditRefs?: { id: string; weight?: number }[] }
    >;
    audits?: Record<string, { score?: number | null }>;
  };
  loadingExperience?: { metrics?: Record<string, Metric> };
  originLoadingExperience?: { metrics?: Record<string, Metric> };
}

export const psiReport = (domain: string) =>
  `https://pagespeed.web.dev/analysis?url=https://${domain}/&form_factor=mobile`;

const score = (value: number | null | undefined) =>
  typeof value === "number" ? Math.round(value * 100) : null;

function field(data: PsiResponse): SpeedResult["field"] {
  const has = (m?: Record<string, Metric>) =>
    !!m && Object.values(METRICS).some((name) => m[name]?.percentile !== undefined);
  const url = data.loadingExperience?.metrics;
  const origin = data.originLoadingExperience?.metrics;
  const [source, metrics] = has(url)
    ? ["url" as const, url]
    : has(origin)
      ? ["origin" as const, origin]
      : [];
  if (!source || !metrics) return null;
  const result: NonNullable<SpeedResult["field"]> = { source, slow: [] };
  for (const [key, name] of Object.entries(METRICS) as [keyof typeof METRICS, string][]) {
    const m = metrics[name];
    if (m?.percentile === undefined) continue;
    // The API gives CLS × 100.
    result[key] = key === "cls" ? m.percentile / 100 : m.percentile;
    if (m.category === "SLOW") result.slow.push(name);
  }
  return result;
}

function notChecked(domain: string, note: QualityNote) {
  const report = psiReport(domain);
  return {
    speed: { level: "not-checked", score: null, field: null, report, note } as SpeedResult,
    accessibility: {
      level: "not-checked",
      score: null,
      failed: null,
      report,
      note,
    } as AccessibilityResult,
  };
}

async function request(url: string, options: PsiOptions): Promise<PsiResponse | number> {
  try {
    const res = await options.fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return res.status;
    return (await res.json()) as PsiResponse;
  } catch {
    return 0;
  }
}

export async function checkPsi(
  domain: string,
  key: string | undefined,
  options: PsiOptions,
): Promise<{ speed: SpeedResult; accessibility: AccessibilityResult }> {
  if (!key) return notChecked(domain, "no key");
  const params = new URLSearchParams({ url: `https://${domain}/`, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("key", key);
  const url = `${API}?${params}`;
  let data = await request(url, options);
  // One retry on a server or network error; a 4xx (for example 429) does not change in 5 s.
  if (typeof data === "number" && (data === 0 || data >= 500)) {
    await options.delay(5000);
    data = await request(url, options);
  }
  if (typeof data === "number") return notChecked(domain, "service error");
  const categories = data.lighthouseResult?.categories ?? {};
  const audits = data.lighthouseResult?.audits ?? {};
  const report = psiReport(domain);
  const speedScore = score(categories.performance?.score);
  const accessScore = score(categories.accessibility?.score);
  const f = speedScore === null ? null : field(data);
  const failed =
    accessScore === null
      ? null
      : (categories.accessibility?.auditRefs ?? []).filter(
          (a) => (a.weight ?? 0) > 0 && audits[a.id]?.score === 0,
        ).length;
  return {
    speed: { level: speedLevel(speedScore, f), score: speedScore, field: f, report },
    accessibility: { level: scoreLevel(accessScore), score: accessScore, failed, report },
  };
}
