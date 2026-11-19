// Spec 020 US2, contracts/status-json.md: the data file next to the page. The same view functions
// as the rows, so the page and the file agree. Content rules of spec 001 apply.
import { rowLinks } from "./links";
import { PROBLEM_TEXT } from "./problems";
import type { QualityCheck, StatusPage } from "./types";
import { nextExpiry, rowKind, summaryFact, totalState } from "./view";

const PAGE = "https://imreboersma.github.io/projects/";

export function statusJson(page: StatusPage): string {
  const shared = page.shared?.problems.length ?? 0;
  const total = totalState(page.rows, shared);
  return JSON.stringify({
    version: 1,
    generatedAt: page.generatedAt.toISOString(),
    total: { kind: total.kind, problems: total.problems, text: total.text },
    changes: page.changes ?? null,
    projects: page.rows.map((s) => {
      const links = rowLinks(s, page.issues);
      const { state, at } = s.uptime;
      return {
        id: s.project.id,
        name: s.project.name,
        status: s.project.status,
        stakeholder: s.project.stakeholder ?? null,
        state: rowKind(s),
        summary: summaryFact(s),
        problems: s.problems.map((p) => ({
          key: p.key,
          text: p.text ?? PROBLEM_TEXT[p.reason],
          issue: links.problems.get(p.key) ?? null,
          since: s.history.since[p.key] ?? null,
        })),
        site: s.project.domain
          ? {
              domain: s.project.domain,
              state,
              checkedAt: at ? at.toISOString() : null,
              uptime30:
                s.history.uptime?.percent == null
                  ? null
                  : Number(s.history.uptime.percent.toFixed(1)),
              // Spec 023 contracts/page.md: own derived facts; the list of broken links is a count.
              quality: s.quality ? qualityJson(s.quality) : null,
            }
          : null,
        nextExpiry: nextExpiry(s),
        // Spec 018: only for a project with a suggestion or a keep date.
        ...(s.archive ? { archive: s.archive } : {}),
        link: `${PAGE}#p-${s.project.id}`,
      };
    }),
  });
}

// `note` and `from` are page details; they are not in the data file.
function qualityJson(q: QualityCheck) {
  const { speed: s, accessibility: a, links: l, headers: h } = q;
  return {
    checkedAt: q.checkedAt,
    speed: { level: s.level, score: s.score, field: s.field, report: s.report },
    accessibility: { level: a.level, score: a.score, failed: a.failed, report: a.report },
    links: { level: l.level, pages: l.pages, broken: l.broken.length, blocked: l.blocked },
    headers: { level: h.level, missing: h.missing, report: h.report },
  };
}
