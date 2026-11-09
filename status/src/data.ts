// Spec 020 US2, contracts/status-json.md: the data file next to the page. The same view functions
// as the rows, so the page and the file agree. Content rules of spec 001 apply.
import { rowLinks } from "./links";
import { PROBLEM_TEXT } from "./problems";
import type { StatusPage } from "./types";
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
            }
          : null,
        nextExpiry: nextExpiry(s),
        link: `${PAGE}#p-${s.project.id}`,
      };
    }),
  });
}
