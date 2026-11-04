// Adds one new issue to the board (spec 004, contracts/add-to-board.md).
import { parseArgs } from "node:util";
import { parseCatalog } from "../catalog";
import { field, optionId, required } from "./env";
import { addItem, readBoard, readItemValues, setOption } from "./graphql";
import { findEntry, type IssueEvent, isRenovate, planAdd, readEvent } from "./project";

const { values: args } = parseArgs({
  options: { catalog: { type: "string", default: "../projects.yaml" } },
});

try {
  const url = required("BOARD_URL");
  const token = required("BOARD_TOKEN");
  const event = (await Bun.file(required("GITHUB_EVENT_PATH")).json()) as IssueEvent;
  const issue = readEvent(event, required("GITHUB_REPOSITORY"));
  const repo = issue.repo;

  if (isRenovate(issue.author)) {
    console.log(`Opened by Renovate: ${repo}. Not added.`);
    process.exit(0);
  }

  const projects = parseCatalog(await Bun.file(args.catalog).text());
  const entry = findEntry(projects, repo, issue.body);
  if (!entry) {
    console.log(`Not in the catalog: ${repo}. Not added.`);
    process.exit(0);
  }

  const board = await readBoard(url, token);
  const projectOption = optionId(board, "Project", entry.name);
  const itemId = await addItem(board.id, issue.nodeId, token);
  const plan = planAdd(await readItemValues(itemId, token));
  if (plan.setProject) {
    await setOption(board.id, itemId, field(board, "Project").id, projectOption, token);
  }
  if (plan.setRoadmap) {
    const no = optionId(board, "Roadmap", "No");
    await setOption(board.id, itemId, field(board, "Roadmap").id, no, token);
  }
  console.log(`Added: ${repo}, Project "${entry.name}".`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
