// Spec 015, contracts/commands.md: `bun run campaign <id> [--dry-run] [--reopen <catalog id>]`.
// Runs on the Maintainer's machine with the `gh` login; never in CI (FR-006).
import { parseArgs } from "node:util";
import { parseCatalog } from "../catalog";
import type { Campaign, RepoResult } from "../types";
import { applyChanges } from "./apply";
import { client, NoAccess } from "./github";
import { parseCampaign, targetRepos } from "./parse";
import { planRepo } from "./plan";

const OWN = "ImreBoersma/";
export const searchUrl = (id: string) =>
  `https://github.com/pulls?q=is%3Apr+head%3Acampaign%2F${id}+user%3AImreBoersma+user%3Aharmonieorkest-brummen`;

export const prBody = (c: Campaign) => `${c.reason.trim()}

This PR is part of the campaign ${c.id}: https://github.com/ImreBoersma/projects/blob/main/campaigns/${c.id}.yaml
Other PRs of this campaign: ${searchUrl(c.id)}
`;

// A small line diff for the dry run (no dependency).
export function diff(path: string, before: string | null, after: string): string {
  const a = before === null ? [] : before.split("\n");
  const b = after.split("\n");
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = [`    --- ${path}${before === null ? " (new file)" : ""}`];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i++;
      j++;
    } else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push(`    - ${a[i++]}`);
    } else {
      out.push(`    + ${b[j++]}`);
    }
  }
  return out.join("\n");
}

type Gh = ReturnType<typeof client>;

export async function runCampaign(
  campaign: Campaign,
  targets: { id: string; repo: string }[],
  gh: Gh,
  opts: { dryRun: boolean; reopen: string | null; overwrite?: string | null },
  log: (line: string) => void,
): Promise<Map<string, RepoResult>> {
  const branch = `campaign/${campaign.id}`;
  const paths = [...new Set(campaign.changes.map((c) => c.path))];
  const results = new Map<string, RepoResult>();
  const width = Math.max(...targets.map((t) => t.id.length)) + 3;
  for (const t of targets) {
    const line = (text: string) => log(`${t.id.padEnd(width)}${text}`);
    try {
      const head = await gh.defaultHead(t.repo);
      const files = await gh.readFiles(t.repo, head.sha, paths);
      const apply = applyChanges(files, campaign.changes);
      const pr = await gh.findPr(t.repo, branch);
      const action = planRepo(apply, pr, opts.reopen === t.id);
      if (action === "failed" && apply.kind === "failed") {
        results.set(t.repo, { kind: "failed", reason: apply.reason });
        line(`failed   ${apply.reason}`);
        continue;
      }
      if (action === "not-needed") {
        results.set(t.repo, { kind: "not-needed" });
        line("not needed");
        continue;
      }
      if (action === "merged" || action === "closed") {
        results.set(t.repo, { kind: action, pr: pr?.number as number });
        line(`${action.padEnd(8)} #${pr?.number}${action === "closed" ? " (use --reopen)" : ""}`);
        continue;
      }
      if (apply.kind !== "needed") continue;
      // Do not force-update a branch with commits that the command did not make (a hand fix).
      if (
        (action === "update" || action === "reopen") &&
        opts.overwrite !== t.id &&
        !(await gh.branchIsOurs(t.repo, head.branch, branch, campaign.title))
      ) {
        results.set(t.repo, { kind: "changed-by-hand", pr: pr?.number as number });
        line(`changed by hand #${pr?.number} (merge the PR, or use --overwrite ${t.id})`);
        continue;
      }
      if (opts.dryRun) {
        line(action === "open" ? "would open" : `would update #${pr?.number}`);
        for (const [path, text] of apply.files) log(diff(path, files.get(path) ?? null, text));
        continue;
      }
      const sha = await gh.writeCommit(t.repo, head.sha, apply.files, campaign.title);
      await gh.setBranch(t.repo, branch, sha);
      let number = pr?.number as number;
      if (action === "open") {
        number = await gh.openPr(t.repo, branch, head.branch, campaign.title, prBody(campaign));
        await gh.addLabel(t.repo, number, t.repo.startsWith(OWN));
      } else if (action === "reopen") {
        await gh.reopenPr(t.repo, number);
      }
      const kind = action === "open" ? "opened" : "updated";
      results.set(t.repo, { kind, pr: number });
      line(`${kind.padEnd(8)} #${number}`);
    } catch (error) {
      if (error instanceof NoAccess) {
        results.set(t.repo, { kind: "no-access" });
        line("no access");
      } else {
        const reason = error instanceof Error ? error.message : String(error);
        results.set(t.repo, { kind: "failed", reason });
        line(`failed   ${reason}`);
      }
    }
  }
  return results;
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      reopen: { type: "string" },
      overwrite: { type: "string" },
    },
  });
  const id = positionals[0];
  if (!id) {
    console.error(
      "Use: bun run campaign <id> [--dry-run] [--reopen <catalog id>] [--overwrite <catalog id>]",
    );
    process.exit(1);
  }
  try {
    const projects = parseCatalog(await Bun.file("../projects.yaml").text());
    const file = `../campaigns/${id}.yaml`;
    const campaign = parseCampaign(await Bun.file(file).text(), file, projects);
    const token = (await Bun.$`gh auth token`.text()).trim();
    const results = await runCampaign(
      campaign,
      targetRepos(campaign, projects),
      client(token),
      {
        dryRun: values["dry-run"] ?? false,
        reopen: values.reopen ?? null,
        overwrite: values.overwrite ?? null,
      },
      (l) => console.log(l),
    );
    const failed = [...results.values()].some((r) => r.kind === "failed");
    process.exit(failed ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
