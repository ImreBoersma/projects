import { describe, expect, test } from "bun:test";
import {
  type BoardItem,
  findEntry,
  isRenovate,
  type OpenIssue,
  planAdd,
  planItems,
  planOptions,
  planRoadmap,
} from "../src/board/project";
import type { Project } from "../src/types";

const projects: Project[] = [
  { id: "scales", name: "Scales", repo: "ImreBoersma/scales-exercises", status: "active" },
  { id: "boek-de-bus", name: "Boek de bus", repo: "ImreBoersma/boek-de-bus", status: "active" },
  { id: "old", name: "Old", repo: "ImreBoersma/old", status: "archived" },
  {
    id: "pretband-backend",
    name: "Pretband backend",
    repo: "harmonieorkest-brummen/pretband-backend",
    status: "maintenance",
  },
];

const marker =
  "<!-- status-problem: boek-de-bus/ci-failed -->\nThe status update found this problem.";

function item(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: "item",
    contentId: "issue",
    repo: "ImreBoersma/scales-exercises",
    number: 1,
    isPrivate: false,
    open: true,
    labels: [],
    project: "Scales",
    stakeholder: null,
    roadmap: "No",
    ...overrides,
  };
}

const issue = (
  id: string,
  repo: string,
  body: string | null = null,
  author: string | null = "ImreBoersma",
): OpenIssue => ({ id, repo, number: 1, body, author });

describe("findEntry", () => {
  test("finds the entry of a catalog repo, without case", () => {
    expect(findEntry(projects, "ImreBoersma/scales-exercises", null)?.id).toBe("scales");
    expect(findEntry(projects, "imreboersma/SCALES-EXERCISES", null)?.id).toBe("scales");
  });

  test("gives null for an archived entry or an unknown repo", () => {
    expect(findEntry(projects, "ImreBoersma/old", null)).toBeNull();
    expect(findEntry(projects, "ImreBoersma/unknown", null)).toBeNull();
  });

  test("reads the marker of a problem issue in projects", () => {
    expect(findEntry(projects, "ImreBoersma/projects", marker)?.id).toBe("boek-de-bus");
    expect(findEntry(projects, "ImreBoersma/projects", "No marker.")).toBeNull();
    expect(findEntry(projects, "ImreBoersma/projects", null)).toBeNull();
    expect(
      findEntry(projects, "ImreBoersma/projects", "<!-- status-problem: old/inactive -->"),
    ).toBeNull();
  });
});

describe("planOptions", () => {
  const current = [
    { id: "a", name: "Scales", color: "BLUE", description: "x" },
    { id: "p", name: "Placeholder", color: "GRAY", description: "" },
  ];

  test("adds missing names, keeps ids and removes unused options", () => {
    expect(planOptions(current, ["Scales", "Boek de bus"], new Set())).toEqual([
      { id: "a", name: "Scales", color: "BLUE", description: "x" },
      { name: "Boek de bus", color: "GRAY", description: "" },
    ]);
  });

  test("keeps an option that an open item uses", () => {
    expect(planOptions(current, ["Scales"], new Set(["Placeholder"]))).toBeNull();
  });

  test("gives null when nothing changes", () => {
    expect(planOptions(current.slice(0, 1), ["Scales"], new Set())).toBeNull();
  });
});

describe("planItems", () => {
  test("adds open issues of catalog repos that are not on the board", () => {
    const plan = planItems(
      projects,
      [item({ contentId: "on-board" })],
      [
        issue("on-board", "ImreBoersma/scales-exercises"),
        issue("new", "ImreBoersma/boek-de-bus"),
        issue("archived", "ImreBoersma/old"),
        issue("other", "someone/else"),
        issue("problem", "ImreBoersma/projects", marker),
        issue("own", "ImreBoersma/projects", "An issue of projects."),
        issue("dashboard", "ImreBoersma/boek-de-bus", null, "renovate"),
        issue(
          "homelab-dashboard",
          "ImreBoersma/scales-exercises",
          null,
          "imreboersma-homelab-renovate",
        ),
      ],
    );
    expect(plan.add.map((a) => [a.issue.id, a.project])).toEqual([
      ["new", "Boek de bus"],
      ["problem", "Boek de bus"],
    ]);
  });

  test("sets Project on items without a value", () => {
    const pretband = item({
      id: "p",
      repo: "harmonieorkest-brummen/pretband-backend",
      project: null,
    });
    const outside = item({ id: "o", repo: "someone/else", project: null });
    const plan = planItems(projects, [pretband, outside, item()], []);
    expect(plan.setProject.map((s) => [s.item.id, s.project])).toEqual([["p", "Pretband backend"]]);
  });

  test("sets Roadmap No on items without a value", () => {
    const plan = planItems(projects, [item({ id: "empty", roadmap: null }), item()], []);
    expect(plan.setRoadmapNo.map((i) => i.id)).toEqual(["empty"]);
  });
});

describe("isRenovate", () => {
  test("finds the Renovate apps", () => {
    expect(isRenovate("renovate")).toBe(true);
    expect(isRenovate("renovate[bot]")).toBe(true);
    expect(isRenovate("imreboersma-homelab-renovate[bot]")).toBe(true);
    expect(isRenovate("ImreBoersma")).toBe(false);
    expect(isRenovate(null)).toBe(false);
  });
});

describe("planRoadmap", () => {
  test("removes private and problem items from the roadmap", () => {
    const items = [
      item({ id: "private", roadmap: "Yes", isPrivate: true }),
      item({ id: "problem", roadmap: "Yes", labels: ["status-problem"] }),
      item({ id: "public", roadmap: "Yes" }),
      item({ id: "empty", roadmap: null, isPrivate: true }),
    ];
    expect(planRoadmap(items).map((i) => i.id)).toEqual(["private", "problem"]);
  });
});

describe("planAdd", () => {
  test("changes only empty values", () => {
    expect(planAdd({ project: null, roadmap: null })).toEqual({
      setProject: true,
      setRoadmap: true,
    });
    expect(planAdd({ project: "Scales", roadmap: "Yes" })).toEqual({
      setProject: false,
      setRoadmap: false,
    });
  });
});
