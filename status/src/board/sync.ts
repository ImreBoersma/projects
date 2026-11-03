// Sync of the board with the catalog (spec 004, research.md §4, §5, §7).
import { parseArgs } from "node:util";
import { parseCatalog } from "../catalog";
import { LABEL } from "../issues";
import { field, optionId, required } from "./env";
import { addItem, readBoard, readItems, readOpenIssues, setOption, setOptions } from "./graphql";
import { PROJECTS_REPO, planItems, planOptions, planRoadmap } from "./project";

const { values: args } = parseArgs({
  options: {
    catalog: { type: "string", default: "../projects.yaml" },
    "dry-run": { type: "boolean", default: false },
  },
});

try {
  const url = required("BOARD_URL");
  const token = required("BOARD_SYNC_TOKEN");
  const projects = parseCatalog(await Bun.file(args.catalog).text());
  const active = projects.filter((p) => p.status !== "archived");

  let board = await readBoard(url, token);
  const items = await readItems(board.id, token);
  const issues = [];
  for (const p of active) if (p.repo) issues.push(...(await readOpenIssues(p.repo, token)));
  issues.push(...(await readOpenIssues(PROJECTS_REPO, token, { withBody: true, label: LABEL })));

  const open = items.filter((i) => i.open);
  const wanted = {
    Project: active.map((p) => p.name),
    Stakeholder: [...new Set(active.flatMap((p) => (p.stakeholder ? [p.stakeholder] : [])))],
  };
  const used = {
    Project: new Set(open.flatMap((i) => (i.project ? [i.project] : []))),
    Stakeholder: new Set(open.flatMap((i) => (i.stakeholder ? [i.stakeholder] : []))),
  };
  const optionPlans = (["Project", "Stakeholder"] as const).flatMap((name) => {
    const f = field(board, name);
    const next = planOptions(f.options, wanted[name], used[name]);
    return next ? [{ name, field: f, next }] : [];
  });
  const plan = planItems(projects, items, issues);
  const offRoadmap = planRoadmap(items);

  for (const { name, field: f, next } of optionPlans) {
    for (const o of next.filter((o) => !o.id)) console.log(`Add option: ${name} "${o.name}"`);
    for (const o of f.options.filter((o) => !next.some((n) => n.id === o.id))) {
      console.log(`Remove option: ${name} "${o.name}"`);
    }
  }
  for (const a of plan.add) {
    console.log(`Add item: ${a.issue.repo}#${a.issue.number}, Project "${a.project}"`);
  }
  for (const s of plan.setProject) {
    console.log(`Set Project: ${s.item.repo}#${s.item.number}, "${s.project}"`);
  }
  for (const i of plan.setRoadmapNo) console.log(`Set Roadmap No: ${i.repo}#${i.number}`);
  for (const i of offRoadmap) console.log(`Remove from the roadmap: ${i.repo}#${i.number}`);
  const count =
    optionPlans.length +
    plan.add.length +
    plan.setProject.length +
    plan.setRoadmapNo.length +
    offRoadmap.length;
  if (count === 0) console.log("No changes.");

  if (!args["dry-run"] && count > 0) {
    for (const { field: f, next } of optionPlans) await setOptions(f.id, next, token);
    if (optionPlans.length > 0) board = await readBoard(url, token);

    const projectField = field(board, "Project").id;
    const roadmapField = field(board, "Roadmap").id;
    const roadmapNo = optionId(board, "Roadmap", "No");
    for (const a of plan.add) {
      const itemId = await addItem(board.id, a.issue.id, token);
      await setOption(board.id, itemId, projectField, optionId(board, "Project", a.project), token);
      await setOption(board.id, itemId, roadmapField, roadmapNo, token);
    }
    for (const s of plan.setProject) {
      const id = optionId(board, "Project", s.project);
      await setOption(board.id, s.item.id, projectField, id, token);
    }
    for (const i of [...plan.setRoadmapNo, ...offRoadmap]) {
      await setOption(board.id, i.id, roadmapField, roadmapNo, token);
    }
    console.log(`Done: ${count} changes.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
