import { describe, expect, test } from "bun:test";
import { parseCatalog, visibleProjects } from "../src/catalog";

const valid = `
projects:
  - id: one
    name: One
    repo: ImreBoersma/one
    status: active
    host: Vercel
  - id: two
    name: Two
    repo:
    status: maintenance
  - id: three
    name: Three
    repo: ImreBoersma/three
    status: archived
`;

function entry(fields: string): string {
  return `projects:\n  - ${fields.trim().split("\n").join("\n    ")}\n`;
}

describe("parseCatalog", () => {
  test("parses a valid file and accepts unknown fields", () => {
    const projects = parseCatalog(valid);
    expect(projects).toHaveLength(3);
    expect(projects[0]).toEqual({
      id: "one",
      name: "One",
      repo: "ImreBoersma/one",
      status: "active",
    });
  });

  test("accepts an empty repo", () => {
    expect(parseCatalog(valid)[1].repo).toBeNull();
    expect(parseCatalog(entry('id: a\nname: A\nrepo: ""\nstatus: active'))[0].repo).toBeNull();
  });

  test("rejects a missing top-level projects key", () => {
    expect(() => parseCatalog("other: []")).toThrow("projects");
  });

  test("rejects a missing id", () => {
    expect(() => parseCatalog(entry("name: A\nstatus: active"))).toThrow(/entry 0.*id/);
  });

  test("rejects a duplicate id", () => {
    const text = `projects:
  - { id: a, name: A, status: active }
  - { id: a, name: B, status: active }`;
    expect(() => parseCatalog(text)).toThrow(/entry 1.*id/);
  });

  test("rejects an id with characters outside a-z0-9-", () => {
    expect(() => parseCatalog(entry("id: Not_Valid\nname: A\nstatus: active"))).toThrow(
      /entry 0.*id/,
    );
  });

  test("rejects a missing name", () => {
    expect(() => parseCatalog(entry("id: a\nstatus: active"))).toThrow(/entry 0.*name/);
  });

  test("rejects an unknown status", () => {
    expect(() => parseCatalog(entry("id: a\nname: A\nstatus: paused"))).toThrow(/entry 0.*status/);
  });

  test("rejects a repo that is not owner/name", () => {
    expect(() => parseCatalog(entry("id: a\nname: A\nrepo: notvalid\nstatus: active"))).toThrow(
      /entry 0.*repo/,
    );
  });
});

describe("visibleProjects", () => {
  test("drops archived projects", () => {
    expect(visibleProjects(parseCatalog(valid)).map((p) => p.id)).toEqual(["one", "two"]);
  });
});
