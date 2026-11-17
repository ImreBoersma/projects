// Spec 022 contracts/badge.md: one small SVG for each project, with no external service.
import type { ProjectStatus } from "../types";
import { projectState } from "./view";

const COLOUR = { green: "#1a7f37", red: "#cf222e", grey: "#6e7781", name: "#24292f" };
const xml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

function stateOf(s: ProjectStatus): [string, string] {
  if (s.project.domain) {
    if (s.uptime.state === "up") return ["online", COLOUR.green];
    if (s.uptime.state === "down") return ["offline", COLOUR.red];
    return ["not checked", COLOUR.grey];
  }
  const state = projectState(s);
  if (state === "works") return ["works", COLOUR.green];
  if (state === "problem") return ["problem", COLOUR.red];
  return ["not checked", COLOUR.grey];
}

export function badge(s: ProjectStatus): { id: string; svg: string } {
  const name = s.project.name;
  const [state, colour] = stateOf(s);
  const right = `● ${state}`;
  // 6.5 px for each character and 5 px padding on each side; textLength makes the text fit.
  const t1 = Math.round(name.length * 6.5);
  const t2 = Math.round(right.length * 6.5);
  const w1 = t1 + 10;
  const w2 = t2 + 10;
  const label = xml(`${name}: ${state}`);
  const text = (x: number, length: number, value: string) =>
    `<text x="${x}" y="14" textLength="${length}">${xml(value)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w1 + w2}" height="20" role="img" aria-label="${label}"><title>${label}</title><rect width="${w1}" height="20" fill="${COLOUR.name}"/><rect x="${w1}" width="${w2}" height="20" fill="${colour}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">${text(5, t1, name)}${text(w1 + 5, t2, right)}</g></svg>`;
  return { id: s.project.id, svg };
}
