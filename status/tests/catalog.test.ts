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
      stakeholder: null,
      domain: null,
    });
  });

  test("accepts a host name as domain", () => {
    for (const domain of [
      "imreboersma.nl",
      "scales-imreboersma.web.app",
      "harmonieorkestbrummen.nl",
    ]) {
      expect(
        parseCatalog(entry(`id: a\nname: A\nstatus: active\ndomain: ${domain}`))[0].domain,
      ).toBe(domain);
    }
    expect(parseCatalog(entry("id: a\nname: A\nstatus: active\ndomain:"))[0].domain).toBeNull();
  });

  test("rejects a domain that is not a host name", () => {
    for (const domain of [
      "https://pretband.nl",
      "pretband.nl/",
      "pretband.nl:443",
      "Pretband.nl",
      "localhost",
    ]) {
      expect(() =>
        parseCatalog(entry(`id: a\nname: A\nstatus: active\ndomain: "${domain}"`)),
      ).toThrow(
        "Catalog error in entry 0, field `domain`: must be a host name, for example example.org, or empty.",
      );
    }
  });

  test("reads exceptions (spec 008)", () => {
    const e = (text: string) => parseCatalog(entry(`id: a\nname: A\nstatus: active\n${text}`));
    expect(e("exceptions:\n  R2: The repo is private.")[0].exceptions).toEqual({
      R2: "The repo is private.",
    });
    expect(e("")[0].exceptions).toBeUndefined();
    expect(() => e("exceptions:\n  R10: Reason.")).toThrow(
      "Catalog error in entry 0, field `exceptions`: R10 is not a rule. Use R1 to R9.",
    );
    expect(() => e("exceptions:\n  x: Reason.")).toThrow("x is not a rule. Use R1 to R9.");
    expect(() => e('exceptions:\n  R2: ""')).toThrow(
      "Catalog error in entry 0, field `exceptions`: give a reason for R2.",
    );
    expect(() => e("exceptions: R2")).toThrow("field `exceptions`");
  });

  test("reads the stakeholder name", () => {
    const projects = parseCatalog(
      entry("id: a\nname: A\nstatus: active\nstakeholder: Harmonieorkest Brummen"),
    );
    expect(projects[0].stakeholder).toBe("Harmonieorkest Brummen");
    expect(
      parseCatalog(entry("id: a\nname: A\nstatus: active\nstakeholder:"))[0].stakeholder,
    ).toBeNull();
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
