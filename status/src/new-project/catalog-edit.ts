// Spec 011 research §5: add the new project and its secret entries to projects.yaml as text, so
// that no other line changes. The result must parse with the catalog parsers.
import { parseCatalog, parseSecrets } from "../catalog";
import type { SecretEntry } from "../types";
import { host } from "./hosts";
import type { NewProject } from "./template";

const PLAIN = /^[A-Za-z0-9][A-Za-z0-9 ,.()/'+-]*$/;
const scalar = (v: string) => (v === "" ? "" : PLAIN.test(v) ? ` ${v}` : ` ${JSON.stringify(v)}`);

export function expiresFor(name: string, entries: SecretEntry[]) {
  return entries.find((e) => e.name === name)?.expires ?? "never";
}

export function addToCatalog(text: string, input: NewProject, secretNames: string[]) {
  const lines = text.replace(/\n*$/, "\n").split("\n");
  lines.pop();
  const start = lines.indexOf("projects:");
  if (start < 0) throw new Error("projects.yaml has no `projects:` list.");
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || lines[end].startsWith(" "))) end++;
  while (lines[end - 1] === "") end--;

  const repo = `ImreBoersma/${input.repo}`;
  const block = [
    `  - id: ${input.id}`,
    `    name:${scalar(input.name)}`,
    `    repo: ${repo}`,
    "    status: active",
    `    stack:${scalar(input.stack)}`,
    `    host:${scalar(host(input.host).catalog)}`,
    "    domain:",
    "    stakeholder:",
    "    renewal:",
  ];
  const entries = parseSecrets(text, parseCatalog(text));
  const secrets = secretNames.flatMap((name) => [
    `  - name: ${name}`,
    "    kind: actions-secret",
    `    where: ${repo}`,
    `    expires: ${expiresFor(name, entries)}`,
    `    project: ${input.id}`,
  ]);
  const out = [...lines.slice(0, end), ...block, ...lines.slice(end), ...secrets].join("\n");
  const result = `${out}\n`;

  const projects = parseCatalog(result);
  if (!projects.some((p) => p.id === input.id))
    throw new Error("The new project is not in the catalog.");
  parseSecrets(result, projects);
  return result;
}
