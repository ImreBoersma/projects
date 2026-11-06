import { describe, expect, test } from "bun:test";
import { reposFor, setAll } from "../src/secret-set";
import type { SecretEntry } from "../src/types";

const entry = (
  name: string,
  where: string,
  kind: SecretEntry["kind"] = "actions-secret",
): SecretEntry => ({
  name,
  kind,
  where,
  expires: "2027-11-05",
  project: null,
});
const entries = [
  entry("BOARD_TOKEN", "ImreBoersma/projects"),
  entry("BOARD_TOKEN", "ImreBoersma/boek-de-bus"),
  entry("OTHER", "ImreBoersma/projects"),
  entry("DEPLOY", "ImreBoersma/one", "environment-secret"),
];

describe("reposFor (US3)", () => {
  test("the repos of the name", () => {
    expect(reposFor("BOARD_TOKEN", entries)).toEqual([
      "ImreBoersma/projects",
      "ImreBoersma/boek-de-bus",
    ]);
  });
  test("not in the catalog, or an environment secret: stop", () => {
    expect(() => reposFor("NOT_A_SECRET", entries)).toThrow(
      "NOT_A_SECRET is not in the catalog as an actions-secret.",
    );
    expect(() => reposFor("DEPLOY", entries)).toThrow("environment secrets are not supported");
  });
});

describe("setAll (FR-009)", () => {
  test("the value goes only to stdin, never in the arguments or the result", async () => {
    const seen: { args: string[]; stdin: string }[] = [];
    const run = async (args: string[], stdin: string) => {
      seen.push({ args, stdin });
      return args.includes("ImreBoersma/fail") ? 1 : 0;
    };
    const value = "ghp_FIXTUREVALUE";
    const results = await setAll("BOARD_TOKEN", ["ImreBoersma/a", "ImreBoersma/fail"], value, run);
    expect(seen.map((s) => s.args)).toEqual([
      ["gh", "secret", "set", "BOARD_TOKEN", "-R", "ImreBoersma/a"],
      ["gh", "secret", "set", "BOARD_TOKEN", "-R", "ImreBoersma/fail"],
    ]);
    expect(seen.every((s) => s.stdin === value)).toBe(true);
    expect(seen.some((s) => s.args.join(" ").includes(value))).toBe(false);
    expect(results).toEqual([
      { repo: "ImreBoersma/a", ok: true },
      { repo: "ImreBoersma/fail", ok: false },
    ]);
    expect(JSON.stringify(results)).not.toContain(value);
  });
});
