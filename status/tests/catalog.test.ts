import { describe, expect, test } from "bun:test";
import { parseCatalog, parseSecrets, visibleProjects } from "../src/catalog";

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

  test("reads renewals (spec 009)", () => {
    const e = (text: string) => parseCatalog(entry(`id: a\nname: A\nstatus: active\n${text}`));
    expect(
      e(
        "renewal:\n  - name: Domain\n    date: 2027-03-01\n  - name: Hosting\n    date: 2027-01-15",
      )[0].renewals,
    ).toEqual([
      { name: "Domain", date: "2027-03-01" },
      { name: "Hosting", date: "2027-01-15" },
    ]);
    expect(e("renewal:")[0].renewals).toBeUndefined();
    const err = "Catalog error in entry 0, field `renewal`: ";
    expect(() => e("renewal: Domain")).toThrow(`${err}must be a list of items with name and date.`);
    expect(() => e("renewal:\n  - date: 2027-03-01")).toThrow(`${err}item 0 needs a name`);
    expect(() => e(`renewal:\n  - name: ${"x".repeat(41)}\n    date: 2027-03-01`)).toThrow(
      "at most 40",
    );
    for (const date of ["2027-13-01", "2027-02-30", "1-3-2027"]) {
      expect(() => e(`renewal:\n  - name: Domain\n    date: "${date}"`)).toThrow(
        `${err}item 0 needs a date as YYYY-MM-DD.`,
      );
    }
    expect(() =>
      e("renewal:\n  - name: Domain\n    date: 2027-03-01\n  - name: domain\n    date: 2027-04-01"),
    ).toThrow(`${err}the name domain is used two times.`);
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

describe("parseSecrets (spec 013)", () => {
  const projects = parseCatalog(valid);
  const list = (items: string) => `${valid}secrets:\n${items}`;
  const one = (fields: string) => list(`  - ${fields.trim().split("\n").join("\n    ")}\n`);
  const base =
    "name: TOKEN_A\nkind: actions-secret\nwhere: ImreBoersma/projects\nexpires: 2027-11-06";
  const parse = (text: string) => parseSecrets(text, projects);

  test("reads a valid list", () => {
    expect(
      parse(
        list(`  - name: TOKEN_A
    kind: actions-secret
    where: ImreBoersma/projects
    expires: 2027-11-06
  - name: DEPLOY_KEY
    kind: environment-secret
    where: ImreBoersma/one
    expires: never
    project: two
`),
      ),
    ).toEqual([
      {
        name: "TOKEN_A",
        kind: "actions-secret",
        where: "ImreBoersma/projects",
        expires: "2027-11-06",
        project: null,
      },
      {
        name: "DEPLOY_KEY",
        kind: "environment-secret",
        where: "ImreBoersma/one",
        expires: "never",
        project: "two",
      },
    ]);
  });

  test("a missing or empty list is valid", () => {
    expect(parse(valid)).toEqual([]);
    expect(parse(`${valid}secrets:\n`)).toEqual([]);
  });

  test("an archived project id is valid", () => {
    expect(parse(one(`${base}\nproject: three`))[0].project).toBe("three");
  });

  test("rejects each wrong field", () => {
    const cases: [string, RegExp][] = [
      [`${base.replace("TOKEN_A", "a.b")}`, /item 0, field `name`/],
      [`${base.replace("TOKEN_A", "A".repeat(61))}`, /field `name`/],
      [`${base.replace("actions-secret", "account")}`, /field `kind`.*password manager/],
      ["name: A\nkind: password\nwhere: GoDaddy\nexpires: never", /field `kind`/],
      [
        "name: A\nkind: actions-secret\nwhere: GoDaddy\nexpires: never",
        /field `where`.*owner\/repo/,
      ],
      [`${base.replace("2027-11-06", "2027-02-30")}`, /field `expires`/],
      [`${base.replace("2027-11-06", "soon")}`, /field `expires`/],
      [`${base}\nproject: nope`, /field `project`.*not a catalog id/],
      [`${base}\nnote: hi`, /field `note`.*not a field/],
    ];
    for (const [fields, error] of cases) expect(() => parse(one(fields))).toThrow(error);
  });

  test("refuses a field for a value", () => {
    for (const field of ["value", "secret", "password", "token", "Password"]) {
      expect(() => parse(one(`${base}\n${field}: x`))).toThrow(
        "Do not put secret values in the catalog.",
      );
    }
  });

  test("a name is unique in its place", () => {
    const twice = list(
      `  - ${base.split("\n").join("\n    ")}\n  - ${base.replace("TOKEN_A", "token_a").split("\n").join("\n    ")}\n`,
    );
    expect(() => parse(twice)).toThrow(/item 1, field `name`.*two times/);
    const otherPlace = list(
      `  - ${base.split("\n").join("\n    ")}\n  - ${base.replace("ImreBoersma/projects", "ImreBoersma/one").split("\n").join("\n    ")}\n`,
    );
    expect(parse(otherPlace)).toHaveLength(2);
  });
});
